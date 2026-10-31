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

/** 解析实际生效的模型配置：请求级配置优先，其次是服务端环境变量 */
export function resolveLlmSettings(env: Env, llmConfig?: LLMConfig) {
  const useCustom = !!(
    llmConfig &&
    llmConfig.enabled !== false &&
    llmConfig.baseUrl?.trim() &&
    llmConfig.apiKey?.trim() &&
    llmConfig.modelId?.trim()
  )

  return {
    provider: (useCustom ? llmConfig!.provider : undefined) || env.AI_PROVIDER || 'openai',
    baseUrl: (useCustom ? llmConfig!.baseUrl : env.AI_BASE_URL)?.trim(),
    apiKey: (useCustom ? llmConfig!.apiKey : env.AI_API_KEY)?.trim(),
    modelId: (useCustom ? llmConfig!.modelId : env.AI_MODEL_ID)?.trim(),
  }
}
