import type { PayloadMessage, ChatRequest } from '@/types'
import { quotaService, isValidLLMConfig } from './quotaService'
import type { LLMConfig } from '@/types'
import i18n from '@/i18n'

// API endpoint - can be configured via environment variable
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

const MAX_TOKENS = 64000

interface AuthContext {
  headers: Record<string, string>
  /** 是否把自定义 LLM 配置随请求体带给后端 */
  includeLLMConfig: boolean
  /** 是否由前端直连 AI 服务 */
  directConnect: boolean
}

/**
 * 获取请求头（含访问密码 / 自定义 LLM 标记）
 */
function buildAuthContext(): AuthContext {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  const password = quotaService.getAccessPassword()
  const config = quotaService.getActiveLLMConfig()
  const hasCustom = isValidLLMConfig(config)

  if (hasCustom) {
    // 直连模式由前端自己请求 AI 服务，不需要任何标记
    if (config?.directConnect) {
      return { headers, includeLLMConfig: false, directConnect: true }
    }
    headers['X-Custom-LLM'] = 'true'
  } else if (password) {
    headers['X-Access-Password'] = password
  }

  return { headers, includeLLMConfig: hasCustom, directConnect: false }
}

/**
 * 检查配额并在需要时消耗
 */
function checkAndConsumeQuota(response: Response): void {
  const quotaExempt = response.headers.get('X-Quota-Exempt')
  // 只有当不免除配额时才消耗
  if (quotaExempt !== 'true') {
    quotaService.consumeQuota()
  }
}

/**
 * 检查是否有足够配额（有密码时跳过检查）
 */
function ensureQuotaAvailable(): void {
  if (!quotaService.hasAccessPassword() && !quotaService.hasQuotaRemaining()) {
    throw new Error(i18n.t('errors.quotaExceeded'))
  }
}

/**
 * 构造请求体：带上自定义 LLM 配置（后端代理模式）
 */
function buildRequestBody(messages: PayloadMessage[], stream: boolean): ChatRequest & { llmConfig?: LLMConfig } {
  const body: ChatRequest & { llmConfig?: LLMConfig } = { messages, stream }
  const { includeLLMConfig } = buildAuthContext()
  const config = quotaService.getActiveLLMConfig()
  if (includeLLMConfig && config) {
    body.llmConfig = config
  }
  return body
}

/**
 * 构造直连模式下的请求参数
 */
function buildDirectRequest(
  messages: PayloadMessage[],
  config: LLMConfig,
  stream: boolean
): { url: string; headers: Record<string, string>; body: string } {
  if (config.provider === 'anthropic') {
    const systemMessage = messages.find((m) => m.role === 'system')
    const anthropicMessages = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content:
          typeof m.content === 'string'
            ? m.content
            : m.content.map((part) =>
                part.type === 'image_url' && part.image_url?.url.startsWith('data:')
                  ? {
                      type: 'image' as const,
                      source: {
                        type: 'base64' as const,
                        media_type: part.image_url.url.match(/^data:(image\/[^;]+);/)?.[1] ?? 'image/png',
                        data: part.image_url.url.split(',')[1] ?? '',
                      },
                    }
                  : { type: 'text' as const, text: part.text ?? '' }
              ),
      }))

    return {
      url: `${config.baseUrl.replace(/\/$/, '')}/messages`,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: config.modelId,
        max_tokens: MAX_TOKENS,
        system: typeof systemMessage?.content === 'string' ? systemMessage.content : '',
        messages: anthropicMessages,
        stream,
      }),
    }
  }

  return {
    url: `${config.baseUrl.replace(/\/$/, '')}/chat/completions`,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.modelId,
      messages,
      max_tokens: MAX_TOKENS,
      stream,
    }),
  }
}

interface ParseUrlResponse {
  success: boolean
  data?: {
    title: string
    content: string
    excerpt: string
    siteName: string
    url: string
  }
  error?: string
}

/**
 * Parse SSE data line and extract content
 */
function parseSSELine(line: string): string | null {
  let data = line

  // Handle SSE format (data: prefix)
  if (line.startsWith('data: ')) {
    data = line.slice(6)
  }

  if (data === '[DONE]') return null

  try {
    const parsed = JSON.parse(data)
    // Handle OpenAI format
    if (parsed.choices?.[0]?.delta?.content) {
      return parsed.choices[0].delta.content
    }
    // Handle Anthropic format
    if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
      return parsed.delta.text
    }
    // Handle simple format
    if (parsed.content) {
      return parsed.content
    }
    // Handle text field
    if (parsed.text) {
      return parsed.text
    }
  } catch {
    // Not JSON, return raw data if it has content
    if (data.trim()) {
      return data
    }
  }
  return null
}

/**
 * 读取 SSE 响应流并累积内容
 */
async function readSSE(
  response: Response,
  onChunk: (chunk: string, accumulated: string) => void
): Promise<string> {
  const reader = response.body?.getReader()
  if (!reader) {
    throw new Error('Failed to get response reader')
  }

  const decoder = new TextDecoder()
  let fullContent = ''
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })

      // Process complete lines
      const lines = buffer.split('\n')
      buffer = lines.pop() || '' // Keep incomplete line in buffer

      for (const line of lines) {
        const trimmedLine = line.trim()
        if (!trimmedLine) continue

        const content = parseSSELine(trimmedLine)
        if (content) {
          fullContent += content
          onChunk(content, fullContent)
        }
      }
    }

    // Process remaining buffer
    if (buffer.trim()) {
      const content = parseSSELine(buffer.trim())
      if (content) {
        fullContent += content
        onChunk(content, fullContent)
      }
    }
  } finally {
    reader.releaseLock()
  }

  return fullContent
}

/**
 * AI Service for communicating with the backend
 */
export const aiService = {
  /**
   * Send chat messages to AI and get response (non-streaming)
   */
  async chat(messages: PayloadMessage[]): Promise<string> {
    ensureQuotaAvailable()

    const { directConnect } = buildAuthContext()
    const config = quotaService.getActiveLLMConfig()

    if (directConnect && config) {
      const request = buildDirectRequest(messages, config, false)
      const response = await fetch(request.url, {
        method: 'POST',
        headers: request.headers,
        body: request.body,
      })
      if (!response.ok) {
        const error = await response.text()
        throw new Error(`AI request failed: ${error}`)
      }
      const data = await response.json()
      return data.content?.[0]?.text || data.choices?.[0]?.message?.content || ''
    }

    const request = buildRequestBody(messages, false)

    const response = await fetch(`${API_BASE_URL}/chat`, {
      method: 'POST',
      headers: buildAuthContext().headers,
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`AI request failed: ${error}`)
    }

    checkAndConsumeQuota(response)

    const data = await response.json()
    return data.content || data.message || ''
  },

  /**
   * Stream chat response with SSE support
   * @param messages - The messages to send
   * @param onChunk - Callback for each content chunk
   * @param onComplete - Optional callback when streaming completes
   * @returns The full accumulated content
   */
  async streamChat(
    messages: PayloadMessage[],
    onChunk: (chunk: string, accumulated: string) => void,
    onComplete?: (content: string) => void
  ): Promise<string> {
    ensureQuotaAvailable()

    const { directConnect } = buildAuthContext()
    const config = quotaService.getActiveLLMConfig()

    if (directConnect && config) {
      const request = buildDirectRequest(messages, config, true)
      const response = await fetch(request.url, {
        method: 'POST',
        headers: request.headers,
        body: request.body,
      })
      if (!response.ok) {
        const error = await response.text()
        throw new Error(`AI request failed: ${error}`)
      }
      const fullContent = await readSSE(response, onChunk)
      onComplete?.(fullContent)
      return fullContent
    }

    const request = buildRequestBody(messages, true)

    const response = await fetch(`${API_BASE_URL}/chat`, {
      method: 'POST',
      headers: buildAuthContext().headers,
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`AI request failed: ${error}`)
    }

    // 流式请求成功后检查并消耗配额
    checkAndConsumeQuota(response)

    const fullContent = await readSSE(response, onChunk)

    onComplete?.(fullContent)
    return fullContent
  },

  /**
   * Parse URL content and convert to markdown
   */
  async parseUrl(url: string): Promise<ParseUrlResponse> {
    const response = await fetch(`${API_BASE_URL}/parse-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    })

    const data: ParseUrlResponse = await response.json()

    if (!response.ok || !data.success) {
      throw new Error(data.error || i18n.t('errors.parseUrlFailed'))
    }

    return data
  },
}
