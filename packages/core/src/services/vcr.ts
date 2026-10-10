import { createHash, type UUID } from 'crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname } from 'path'
import type { AssistantMessage, UserMessage } from '#core/query'
import { existsSync } from 'fs'
import { env } from '#core/utils/env'
import { getCwd } from '#core/utils/state'
import * as path from 'path'
import { mapValues } from 'lodash-es'
import type { ContentBlock } from '@anthropic-ai/sdk/resources/index.mjs'

export async function withVCR(
  messages: (UserMessage | AssistantMessage)[],
  f: () => Promise<AssistantMessage>,
): Promise<AssistantMessage> {
  if (process.env.NODE_ENV !== 'test') {
    return await f()
  }

  const dehydratedInput = mapMessages(
    messages.map(_ => _.message.content),
    dehydrateValue,
  )
  const filename = `./fixtures/${dehydratedInput.map(_ => createHash('sha1').update(JSON.stringify(_)).digest('hex').slice(0, 6)).join('-')}.json`

  // Fetch cached fixture
  if (existsSync(filename)) {
    const cached = JSON.parse(readFileSync(filename, 'utf-8'))
    return mapAssistantMessage(cached.output, hydrateValue)
  }

  if (env.isCI) {
    process.stderr.write(
      `Anthropic API fixture missing. Re-run bun test locally, then commit the result. ${JSON.stringify({ input: dehydratedInput }, null, 2)}\n`,
    )
  }

  // Create & write new fixture
  const result = await f()
  if (env.isCI) {
    return result
  }

  if (!existsSync(dirname(filename))) {
    mkdirSync(dirname(filename), { recursive: true })
  }
  writeFileSync(
    filename,
    JSON.stringify(
      {
        input: dehydratedInput,
        output: mapAssistantMessage(result, dehydrateValue),
      },
      null,
      2,
    ),
  )
  return result
}

/**
 *  对每条 content：
    ├─ 是 string  → 直接 f(s)
    └─ 是数组     → 逐块按 type 分发：
        ├─ tool_result → 内容分三种：
        │     ├─ string            → f(content)
        │     ├─ 数组(内含 text/image) → 只对 text 调 f，image 原样
        │     └─ 其他              → 原样返回
        ├─ text       → { ..._, text: f(text) }         // 文本块，替换 text 字段
        ├─ tool_use   → 对 input 每个值做 mapValues(_, f) // 工具调用参数里的字符串
        └─ image      → 原样返回（不处理）

    关键设计点：
    - image 块被刻意跳过（vcr.ts:83, 97），因为图片是 base64/二进制，不是要规范化的字符串，f（dehydrate）也只会对 typeof s
    === 'string' 生效。
    - tool_use.input 用 mapValues 递归（vcr.ts:94），能把工具入参里的字符串一并处理，覆盖到嵌套一层对象的值。
    - 末尾用 as 强转类型（vcr.ts:100），因为 switch 的穷举返回类型编译器无法自动收窄。

    为什么需要它 —— 与 dehydrate/hydrate 配合

    f 实际传入的是两个函数：

    1. dehydrateValue（vcr.ts:137-151）——把运行期/机器相关的字符串「脱水」成占位符，例如：
      - num_files="3" → num_files="[NUM]"
      - duration_ms="123" / cost_usd="..." → [DURATION] / [COST]
      - / → path.sep（平台路径分隔符统一）
      - getCwd() → [CWD]
      - 含 Files modified by user: 的整段 → Files modified by user: [FILES]
    2. hydrateValue（vcr.ts:153-161）——回放时反向还原。
 */
function mapMessages(
  // UserMessage | AssistantMessage -- 联合数据类型
  // [...]['message'] -- 取出这个联合类型上 message 属性的类型。结果又是一个联合 = MessageParam | APIAssistantMessage
  // [...]['message']['content'] -- 拿到 message 的 content 字段的类型 = string | ContentBlockParam[] | ContentBlock[]
  //  末尾的 [] -- 「一个消息内容（content）的数组」——每个元素是一条 UserMessage 或 AssistantMessage 里
  //    message.content 的内容（字符串或内容块数组）。
  messages: (UserMessage | AssistantMessage)['message']['content'][],
  f: (s: unknown) => unknown,
): (UserMessage | AssistantMessage)['message']['content'][] {
  return messages.map(_ => {
    // 如果是字符串类型，则直接给函数 f
    if (typeof _ === 'string') {
      return f(_)
    }
    return _.map(_ => {
      switch (_.type) {
        case 'tool_result':
          if (typeof _.content === 'string') {
            return { ..._, content: f(_.content) }
          }
          if (Array.isArray(_.content)) {
            return {
              ..._,
              content: _.content.map(_ => {
                switch (_.type) {
                  case 'text':
                    return { ..._, text: f(_.text) }
                  case 'image':
                    return _
                }
              }),
            }
          }
          return _
        case 'text':
          return { ..._, text: f(_.text) }
        case 'tool_use':
          return {
            ..._,
            input: mapValues(_.input as Record<string, unknown>, f),
          }
        case 'image':
          return _
      }
    })
  }) as (UserMessage | AssistantMessage)['message']['content'][]
}

function mapAssistantMessage(
  message: AssistantMessage,
  f: (s: unknown) => unknown,
): AssistantMessage {
  return {
    durationMs: 'DURATION' as unknown as number,
    costUSD: 'COST' as unknown as number,
    uuid: 'UUID' as unknown as UUID,
    message: {
      ...message.message,
      content: message.message.content
        .map(_ => {
          switch (_.type) {
            case 'text':
              return {
                ..._,
                text: f(_.text) as string,
                citations: _.citations || [],
              } // Ensure citations
            case 'tool_use':
              return {
                ..._,
                input: mapValues(_.input as Record<string, unknown>, f),
              }
            default:
              return _ // Handle other block types unchanged
          }
        })
        .filter(Boolean) as ContentBlock[],
    },
    type: 'assistant',
  }
}

/**
 * 字符串替换
 */
function dehydrateValue(s: unknown): unknown {
  if (typeof s !== 'string') {
    return s
  }
  const s1 = s
    .replace(/num_files="\d+"/g, 'num_files="[NUM]"')
    .replace(/duration_ms="\d+"/g, 'duration_ms="[DURATION]"')
    .replace(/cost_usd="\d+"/g, 'cost_usd="[COST]"')
    .replace(/\//g, path.sep)
    .replaceAll(getCwd(), '[CWD]')
  if (s1.includes('Files modified by user:')) {
    return 'Files modified by user: [FILES]'
  }
  return s1
}

function hydrateValue(s: unknown): unknown {
  if (typeof s !== 'string') {
    return s
  }
  return s
    .replaceAll('[NUM]', '1')
    .replaceAll('[DURATION]', '100')
    .replaceAll('[CWD]', getCwd())
}
