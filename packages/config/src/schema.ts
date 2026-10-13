import { homedir } from 'node:os'

export type ThemeNames =
  // Light themes
  | 'light'
  | 'light-daltonized'
  | 'solarized-light'
  | 'github-light'
  // Dark themes
  | 'dark'
  | 'dark-daltonized'
  | 'dracula'
  | 'nord'
  | 'monokai'
  | 'tokyo-night'
  | 'catppuccin'
  | 'gruvbox'
  | 'one-dark'
  | 'solarized-dark'

export type McpStdioServerConfig = {
  type?: 'stdio'
  command: string
  args: string[]
  env?: Record<string, string>
}

export type McpSSEServerConfig = {
  type: 'sse'
  url: string
  headers?: Record<string, string>
  headersHelper?: string
}

export type McpHttpServerConfig = {
  type: 'http'
  url: string
  headers?: Record<string, string>
  headersHelper?: string
}

export type McpSSEIdeServerConfig = {
  type: 'sse-ide'
  url: string
  ideName: string
  ideRunningInWindows?: boolean
  headers?: Record<string, string>
  headersHelper?: string
}

export type McpWsServerConfig = {
  type: 'ws'
  url: string
}

export type McpWsIdeServerConfig = {
  type: 'ws-ide'
  url: string
  ideName: string
  authToken?: string
  ideRunningInWindows?: boolean
}

export type McpServerConfig =
  | McpStdioServerConfig
  | McpSSEServerConfig
  | McpHttpServerConfig
  | McpSSEIdeServerConfig
  | McpWsServerConfig
  | McpWsIdeServerConfig

export type ProjectConfig = {
  allowedTools: string[]
  deniedTools?: string[]
  askedTools?: string[]
  context: Record<string, string>
  contextFiles?: string[]
  history: string[]
  promptDrafts?: Record<
    string,
    {
      text: string
      mode: 'prompt' | 'bash' | 'background' | 'koding'
      cursorOffset: number
      updatedAt: number
    }
  >
  dontCrawlDirectory?: boolean
  enableArchitectTool?: boolean
  mcpContextUris: string[]
  mcpServers?: Record<string, McpServerConfig>
  disabledMcpServers?: string[]
  approvedMcprcServers?: string[]
  rejectedMcprcServers?: string[]
  lastAPIDuration?: number
  lastCost?: number
  lastDuration?: number
  lastSessionId?: string
  exampleFiles?: string[]
  exampleFilesGeneratedAt?: number
  hasTrustDialogAccepted?: boolean
  hasCompletedProjectOnboarding?: boolean
}

export const DEFAULT_PROJECT_CONFIG: ProjectConfig = {
  allowedTools: [],
  deniedTools: [],
  askedTools: [],
  context: {},
  history: [],
  promptDrafts: {},
  dontCrawlDirectory: false,
  enableArchitectTool: false,
  mcpContextUris: [],
  mcpServers: {},
  disabledMcpServers: [],
  approvedMcprcServers: [],
  rejectedMcprcServers: [],
  hasTrustDialogAccepted: false,
}

export function defaultConfigForProject(projectPath: string): ProjectConfig {
  const config = { ...DEFAULT_PROJECT_CONFIG }
  if (projectPath === homedir()) {
    config.dontCrawlDirectory = true
  }
  return config
}

export type AutoUpdaterStatus =
  'disabled' | 'enabled' | 'no_permissions' | 'not_configured'

export function isAutoUpdaterStatus(value: string): value is AutoUpdaterStatus {
  return ['disabled', 'enabled', 'no_permissions', 'not_configured'].includes(
    value as AutoUpdaterStatus,
  )
}

export type NotificationChannel =
  'iterm2' | 'terminal_bell' | 'iterm2_with_bell' | 'notifications_disabled'

export type ProviderType =
  | 'anthropic'
  | 'openai'
  | 'mistral'
  | 'deepseek'
  | 'kimi'
  | 'qwen'
  | 'glm'
  | 'minimax'
  | 'baidu-qianfan'
  | 'siliconflow'
  | 'bigdream'
  | 'opendev'
  | 'xai'
  | 'groq'
  | 'gemini'
  | 'ollama'
  | 'azure'
  | 'custom'
  | 'custom-openai'
  | (string & {})

export type RequestStrategy =
  | 'auto'
  | 'kode'
  | 'compat_headers'
  | 'compat_headers_system'
  | 'compat_full'
  | 'claude_code_headers'
  | 'claude_code_headers_system'
  | 'claude_code_full'

/**
 * 模型配置档案：让模型管理、请求发送、上下文切换、配置导入导出等所有环节都用同一个结构
 */
export type ModelProfile = {
  /**
   * 显示别名
   */
  name: string
  /**
   * 服务商
   */
  provider: ProviderType
  /**
   * 模型名,例如：deepseek-flash
   */
  modelName: string
  baseURL?: string
  apiKey: string
  /**
   * 输出 token 上限
   */
  maxTokens: number
  /**
   * 上下文窗口，取 80% 作为安全预算
   */
  contextLength: number
  /**
   * 推理力度
   */
  reasoningEffort?: 'low' | 'medium' | 'high' | 'minimal' | string
  requestStrategy?: RequestStrategy
  isActive: boolean
  createdAt: number
  lastUsed?: number
  isGPT5?: boolean
  validationStatus?: 'valid' | 'needs_repair' | 'auto_repaired'
  /**
   * 上次校验时间戳
   */
  lastValidation?: number
}

export type ModelPointerType = 'main' | 'task' | 'compact' | 'quick'

export type ModelPointers = {
  main: string
  task: string
  compact: string
  quick: string
}

export type AccountInfo = {
  accountUuid: string
  emailAddress: string
  organizationUuid?: string
}

export type GlobalConfig = {
  /**
   * 项目级配置
   */
  projects?: Record<string, ProjectConfig>
  /**
   * 预留
   */
  numStartups: number
  /**
   * 控制后台自动检查新版本这个功能是否启用
   */
  autoUpdaterStatus?: AutoUpdaterStatus
  userID?: string
  theme: ThemeNames
  editorMode?: 'normal' | 'vim' | 'emacs'
  /**
   * 思考模式
   * disabled -- 0 token
   * enabled -- 31999 token
   * auto（默认）-- 仅当消息里含 ultrathink 关键字才给 31999
   */
  thinkingMode?: 'auto' | 'enabled' | 'disabled'
  hasCompletedOnboarding?: boolean
  lastPlanModeUse?: number
  lastOnboardingVersion?: string
  lastReleaseNotesSeen?: string
  mcpServers?: Record<string, McpServerConfig>
  disabledMcpServers?: string[]
  /**
   * 选择 Kode 给用户发桌面通知时用那种通道（响铃还是弹窗、还是全关）
   */
  preferredNotifChannel: NotificationChannel
  /**
   * 详细输出开关：控制工具执行时是否展示额外的细节信息（默认不展示）
   */
  verbose: boolean
  /**
   * 是否泡在终端的备用缓冲上，默认用主缓冲
   */
  useAlternateBuffer?: boolean
  /**
   * ink 增量渲染
   */
  incrementalRendering?: boolean
  wipeScrollbackOnClear?: boolean
  customApiKeyResponses?: {
    approved?: string[]
    rejected?: string[]
  }
  primaryProvider?: ProviderType
  maxTokens?: number
  hasAcknowledgedCostThreshold?: boolean
  oauthAccount?: AccountInfo
  proxy?: string
  stream?: boolean
  modelProfiles?: ModelProfile[]
  modelPointers?: ModelPointers
  defaultModelName?: string
  lastDismissedUpdateVersion?: string
}

export const DEFAULT_GLOBAL_CONFIG: GlobalConfig = {
  numStartups: 0,
  autoUpdaterStatus: 'not_configured',
  theme: 'dark',
  editorMode: 'normal',
  thinkingMode: 'auto',
  preferredNotifChannel: 'iterm2',
  verbose: false,
  useAlternateBuffer: false,
  incrementalRendering: true,
  wipeScrollbackOnClear: false,
  primaryProvider: 'anthropic',
  disabledMcpServers: [],
  customApiKeyResponses: {
    approved: [],
    rejected: [],
  },
  stream: true,
  modelProfiles: [],
  modelPointers: {
    main: '',
    task: '',
    compact: '',
    quick: '',
  },
  lastDismissedUpdateVersion: undefined,
}

export const GLOBAL_CONFIG_KEYS = [
  'autoUpdaterStatus',
  'theme',
  'editorMode',
  'thinkingMode',
  'hasCompletedOnboarding',
  'lastOnboardingVersion',
  'lastReleaseNotesSeen',
  'verbose',
  'useAlternateBuffer',
  'incrementalRendering',
  'wipeScrollbackOnClear',
  'customApiKeyResponses',
  'primaryProvider',
  'preferredNotifChannel',
  'maxTokens',
] as const

export type GlobalConfigKey = (typeof GLOBAL_CONFIG_KEYS)[number]

export function isGlobalConfigKey(key: string): key is GlobalConfigKey {
  return GLOBAL_CONFIG_KEYS.includes(key as GlobalConfigKey)
}

export const PROJECT_CONFIG_KEYS = [
  'dontCrawlDirectory',
  'enableArchitectTool',
  'hasTrustDialogAccepted',
  'hasCompletedProjectOnboarding',
] as const

export type ProjectConfigKey = (typeof PROJECT_CONFIG_KEYS)[number]

export function isProjectConfigKey(key: string): key is ProjectConfigKey {
  return PROJECT_CONFIG_KEYS.includes(key as ProjectConfigKey)
}
