import type {
  Message as APIAssistantMessage,
  MessageParam,
  ToolUseBlock,
} from '@anthropic-ai/sdk/resources/index.mjs'

import type { UUID } from '#core/types/common'
import type { Tool, ToolUseContext } from '#core/tooling/Tool'
import type { ToolPermissionContext } from '#core/types/toolPermissionContext'
import type { FullToolUseResult, NormalizedMessage } from '#core/utils/messages'

// Extended ToolUseContext for query functions.
export interface ExtendedToolUseContext extends ToolUseContext {
  abortController: AbortController
  /**
   * Internal counter for the number of model calls ("turns") executed in the current run.
   * Used for non-interactive `--max-turns` enforcement and SDK `num_turns` reporting.
   */
  turnCount?: number
  options: {
    commands: any[]
    forkNumber: number
    messageLogName: string
    tools: Tool[]
    mcpClients?: any[]
    verbose: boolean
    safeMode: boolean
    onStreamEvent?: (event: unknown) => void
    maxBudgetUsd?: number
    maxTurns?: number
    maxThinkingTokens: number
    thinkingMode?: 'auto' | 'enabled' | 'disabled'
    isKodingRequest?: boolean
    commandAllowedTools?: string[]
    lastUserPrompt?: string
    model?: string | import('#config').ModelPointerType
    toolPermissionContext?: ToolPermissionContext
    /**
     * When true, the current execution context cannot show interactive permission prompts.
     * Any permission decision that would normally prompt should be auto-denied.
     */
    shouldAvoidPermissionPrompts?: boolean
    /**
     * When false, suppress legacy-compatible session persistence (.jsonl under config/projects).
     */
    persistSession?: boolean
    /**
     * Optional callback to get custom system prompt additions (e.g., output style).
     * Only called for the main agent.
     */
    getCustomSystemPromptAdditions?: () => string[]
    requestToolUsePermission?: NonNullable<
      ToolUseContext['options']
    >['requestToolUsePermission']
  }
  readFileTimestamps: { [filename: string]: number }
  setToolJSX: (jsx: any) => void
  requestId?: string
}

export type Response = { costUSD: number; response: string }

export type UserMessage = {
  /**
   * 真正发给模型的载荷，例如：{role: 'user', content: 'xxx'}
   */
  message: MessageParam
  type: 'user'
  uuid: UUID
  /**
   * 工具的执行结果
   */
  toolUseResult?: FullToolUseResult
  options?: {
    /**
     * Koding 文档生成请求的身份标记，作用是让同一条消息在两个端点被特殊对待（说白了就是自动写 AGENTS.md 文档）
     */
    isKodingRequest?: boolean
    kodingContext?: string
    isCustomCommand?: boolean
    commandName?: string
    commandArgs?: string
  }
}

export type AssistantMessage = {
  /**
   * 本次调用的成本
   */
  costUSD: number
  /**
   * 耗时，毫秒
   */
  durationMs: number
  /**
   * 模型范围的原始消息
   */
  message: APIAssistantMessage
  type: 'assistant'
  uuid: UUID
  /**
   * API 错误消息标记（合成），排除出 API + 短路 binary feedback
   */
  isApiErrorMessage?: boolean
  /**
   * Synthetic/meta messages (not user/assistant conversational content).
   * These should be excluded from API payloads.
   */
  isMeta?: boolean
  requestId?: string
  responseId?: string // For GPT-5 Responses API state management
}

export type BinaryFeedbackResult =
  | { message: AssistantMessage | null; shouldSkipPermissionCheck: false }
  | { message: AssistantMessage; shouldSkipPermissionCheck: true }

export type ProgressMessage = {
  content: AssistantMessage
  normalizedMessages: NormalizedMessage[]
  siblingToolUseIDs: Set<string>
  tools: Tool[]
  toolUseID: string
  type: 'progress'
  uuid: UUID
}

// Each array item is either a single message or a message-and-response pair
export type Message = UserMessage | AssistantMessage | ProgressMessage

type ToolUseLikeBlock = ToolUseBlock & {
  type: 'tool_use' | 'server_tool_use' | 'mcp_tool_use'
}

export function isToolUseLikeBlock(block: any): block is ToolUseLikeBlock {
  return (
    block &&
    typeof block === 'object' &&
    (block.type === 'tool_use' ||
      block.type === 'server_tool_use' ||
      block.type === 'mcp_tool_use')
  )
}

export const __isToolUseLikeBlockForTests = isToolUseLikeBlock
