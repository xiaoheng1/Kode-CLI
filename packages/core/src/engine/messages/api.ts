/**
 * 消息的出入口双向适配器
 */
import { last } from 'lodash-es'

import type {
  ContentBlockParam,
  Message as APIMessage,
} from '@anthropic-ai/sdk/resources/index.mjs'

import { NO_CONTENT_MESSAGE } from '#core/ai/constants'
import type { AssistantMessage, Message, UserMessage } from '#core/query'

/**
 * 内部消息 → Anthropic API 格式
 */
export function normalizeMessagesForAPI(
  messages: Message[],
): (UserMessage | AssistantMessage)[] {
    /**
     * 真实场景是这样的：

         1. 用户发起请求，kode 调用 API，但网络/API 报错了。模型其实一个字都没返回。
         2. 但 kode 的 UI 需要给用户展示一条"助手回复"（比如"请求失败，请重试"）。
         3. 于是 kode 用 createAssistantAPIErrorMessage 造了一条 assistant 消息，塞进消息历史里，让界面能渲染出来。
         4. Synthetic -- 合成的
     */
  function isSyntheticApiErrorMessage(message: Message): boolean {
    return (
      message.type === 'assistant' &&
      message.isApiErrorMessage === true &&
      // <synthetic> 是 kode 自己造的，不是任何 LLM 生成的。 它是 kode 用来标记"这条 assistant
      // 消息是本地伪造的、不是真实模型输出"的哨兵值（sentinel）。
      message.message.model === '<synthetic>'
    )
  }

  /**
   * ：isApiErrorMessage 是一个「有实体的失败占位」，它代替了一次本该存在但失败的模型回复，逻辑上要当作"这次对话的响
       应"来对待（用于选路、抛错）；而 isMeta 是一个「无实体的旁白」，它跟对话内容彻底无关，纯粹是 kode
       塞给用户看的提示，逻辑上要当作"不存在"来对待（用于估算、计数）
   */
  function isSyntheticMetaMessage(message: Message): boolean {
    return (
      message.type === 'assistant' &&
      message.isMeta === true &&
      message.message.model === '<synthetic>'
    )
  }

  /**
   *  它把用户消息的 content 从「string 或 ContentBlockParam[]」两种形态统一规约成
       ContentBlockParam[]，保证后续的拼接（mergeUserMessages）和 API 序列化始终面对的是块数组，而不是需要到处判断 typeof
       content === 'string'。
   */
  function normalizeUserContent(
    content: UserMessage['message']['content'],
  ): ContentBlockParam[] {
    if (typeof content === 'string') {
      return [{ type: 'text', text: content }]
    }
    return content
  }

  /**
   * toolResultsFirst 是合并 user 消息后的顺序修复器：它把内容块里的所有 tool_result 块稳定地移到最前面，以满足 Anthropic
   * API「tool_result 必须排在 text 之前」的要求，防止因消息合并导致块顺序乱掉而被 API 拒绝。
   * @see https://platform.claude.com/docs/zh-CN/agents-and-tools/tool-use/handle-tool-calls
   * assistant 里的 tool_use 和 user 里的 tool_result 靠 id 一一配对 —— 这是配对规则
   */
  function toolResultsFirst(content: ContentBlockParam[]): ContentBlockParam[] {
    const toolResults: ContentBlockParam[] = []
    const rest: ContentBlockParam[] = []
    for (const block of content) {
      if (block.type === 'tool_result') {
        toolResults.push(block)
      } else {
        rest.push(block)
      }
    }
    return [...toolResults, ...rest]
  }

  /**
   * 合并两个 user 消息
   */
  function mergeUserMessages(
    base: UserMessage,
    next: UserMessage,
  ): UserMessage {
    const baseBlocks = normalizeUserContent(base.message.content)
    const nextBlocks = normalizeUserContent(next.message.content)
    return {
      ...base,
      message: {
        ...base.message,
        content: toolResultsFirst([...baseBlocks, ...nextBlocks]),
      },
    }
  }

  /**
   * UserMessage            ← kode 内部类型（pipeline/types.ts:63）
         └─ .message          ← MessageParam（Anthropic SDK 类型）
              └─ .content     ← string | ContentBlockParam[]
   * 为什么非 array 排除掉了，因为带工具结果时是数组
   */
  function isUserToolResultMessage(message: Message): message is UserMessage {
    if (message.type !== 'user') return false
    if (!Array.isArray(message.message.content)) return false
    return message.message.content.some(block => block.type === 'tool_result')
  }

  const result: (UserMessage | AssistantMessage)[] = []
  for (const message of messages) {
    // 它的作用是表达「一个工具正在执行，这是它的中间进度」，介于「模型发起 tool_use」和「工具返回最终 tool_result」之间。
    // progress 消息永远不会发给模型。它纯粹是给 UI/用户看的，不参与对话语义
    if (message.type === 'progress') continue
    if (isSyntheticApiErrorMessage(message)) continue
    if (isSyntheticMetaMessage(message)) continue

    switch (message.type) {
      case 'user': {
        // 取数组最后一个元素
        const prev = last(result)
        if (prev?.type === 'user') {
          result[result.indexOf(prev)] = mergeUserMessages(prev, message)
        } else {
          result.push(message)
        }
        break
      }

      // assistant 合并是「拼分片」（流式输出把一条回复拆成多片，靠 message.id
      // 精确匹配拼回，且要跳过中间插入的 tool_result）
      case 'assistant': {
        let merged = false
        for (let i = result.length - 1; i >= 0; i--) {
          const prev = result[i]
          // 如果上一条不是助手回复 & 不是 toolUseResult，则退出
          if (prev.type !== 'assistant' && !isUserToolResultMessage(prev)) {
            break
          }
          // 消息合并
          if (prev.type === 'assistant') {
            if (prev.message.id === message.message.id) {
              result[i] = {
                ...prev,
                message: {
                  ...prev.message,
                  content: [
                    ...(Array.isArray(prev.message.content)
                      ? prev.message.content
                      : []),
                    ...(Array.isArray(message.message.content)
                      ? message.message.content
                      : []),
                  ],
                },
              }
              merged = true
            }
            break
          }
        }
        if (!merged) {
          result.push(message)
        }
        break
      }
    }
  }

  return result
}

/**
 * API 内容 → 内部格式 / 辅助判断
 */
export function normalizeContentFromAPI(
  content: APIMessage['content'],
): APIMessage['content'] {
  const filteredContent = content.filter(
    _ => _.type !== 'text' || _.text.trim().length > 0,
  )

  if (filteredContent.length === 0) {
    return [{ type: 'text', text: NO_CONTENT_MESSAGE, citations: [] }]
  }

  return filteredContent
}

export function isEmptyMessageText(text: string): boolean {
  return (
    stripSystemMessages(text).trim() === '' ||
    text.trim() === NO_CONTENT_MESSAGE
  )
}

const STRIPPED_TAGS = [
  'commit_analysis',
  'context',
  'function_analysis',
  'pr_analysis',
]

export function stripSystemMessages(content: string): string {
  const regex = new RegExp(
    `<(${STRIPPED_TAGS.join('|')})>.*?</\\\\1>\\n?`,
    'gs',
  )
  return content.replace(regex, '').trim()
}

export function getLastAssistantMessageId(
  messages: Message[],
): string | undefined {
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i]
    if (message && message.type === 'assistant') {
      return message.message.id
    }
  }
  return undefined
}
