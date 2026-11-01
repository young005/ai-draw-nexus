export interface Env {
  AI_PROVIDER: string
  AI_BASE_URL: string
  AI_API_KEY: string
  AI_MODEL_ID: string
  ACCESS_PASSWORD?: string
}

/** 用户自定义的 LLM 配置（随请求带上，覆盖服务端环境变量） */
export interface LLMConfig {
  enabled?: boolean
  provider?: 'openai' | 'anthropic'
  baseUrl: string
  apiKey: string
  modelId: string
  directConnect?: boolean
}

export interface Message {
  role: 'system' | 'user' | 'assistant'
  content: string | ContentPart[]
}

export interface ContentPart {
  type: 'text' | 'image_url'
  text?: string
  image_url?: { url: string }
}

export interface AnthropicContentPart {
  type: 'text' | 'image'
  text?: string
  source?: {
    type: 'base64'
    media_type: string
    data: string
  }
}

export interface ChatRequest {
  messages: Message[]
  stream?: boolean
  llmConfig?: LLMConfig
}

export interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string
    }
  }>
}

export interface AnthropicResponse {
  content: Array<{
    type: string
    text: string
  }>
}

/** 上游服务商返回的错误，保留状态码以便前端判断原因 */
export class UpstreamError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'UpstreamError'
    this.status = status
  }
}

/** 请求级配置是否完整可用（用户自带密钥） */
export function isUsableLLMConfig(llmConfig?: LLMConfig): boolean {
  return !!(
    llmConfig &&
    llmConfig.enabled !== false &&
    llmConfig.baseUrl?.trim() &&
    llmConfig.apiKey?.trim() &&
    llmConfig.modelId?.trim()
  )
}

/** 解析实际生效的模型配置：请求级配置优先，其次是服务端环境变量 */
export function resolveLlmSettings(env: Env, llmConfig?: LLMConfig) {
  const useCustom = isUsableLLMConfig(llmConfig)

  return {
    provider: (useCustom ? llmConfig!.provider : undefined) || env.AI_PROVIDER || 'openai',
    baseUrl: (useCustom ? llmConfig!.baseUrl : env.AI_BASE_URL)?.trim(),
    apiKey: (useCustom ? llmConfig!.apiKey : env.AI_API_KEY)?.trim(),
    modelId: (useCustom ? llmConfig!.modelId : env.AI_MODEL_ID)?.trim(),
  }
}
