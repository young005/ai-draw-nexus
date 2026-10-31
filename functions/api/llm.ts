import type { Env } from './_shared/types'
import { corsHeaders } from './_shared/cors'

interface PagesContext {
  request: Request
  env: Env
}

interface LLMConfigPayload {
  provider?: 'openai' | 'anthropic'
  baseUrl?: string
  apiKey?: string
  modelId?: string
}

/**
 * 判断主机是否为公网地址。
 * 这个端点等价于一个可被任意调用者驱动的转发器，必须挡住回环/内网地址，
 * 否则会被用来探测内网服务或云厂商的元数据接口。
 */
function isPublicHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '')

  if (host === 'localhost' || host.endsWith('.localhost')) return false
  if (host.endsWith('.local') || host.endsWith('.internal')) return false
  if (host === '0.0.0.0' || host === '::' || host === '::1') return false

  // IPv6 私有段
  if (host.startsWith('fc') || host.startsWith('fd') || host.startsWith('fe80')) return false

  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
  if (ipv4) {
    const a = Number(ipv4[1])
    const b = Number(ipv4[2])
    if (a === 0 || a === 10 || a === 127) return false
    if (a === 172 && b >= 16 && b <= 31) return false
    if (a === 192 && b === 168) return false
    if (a === 169 && b === 254) return false
    if (a === 100 && b >= 64 && b <= 127) return false
    if (a >= 224) return false
  }

  return true
}

function buildAuthHeaders(config: LLMConfigPayload): Record<string, string> {
  if (config.provider === 'anthropic') {
    return {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey || '',
      'anthropic-version': '2023-06-01',
    }
  }
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${config.apiKey || ''}`,
  }
}

function errorResponse(status: number, code: string, detail?: string): Response {
  return new Response(JSON.stringify({ ok: false, status, code, detail }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

export const onRequestOptions: PagesFunction<Env> = async () => {
  return new Response(null, { headers: corsHeaders })
}

export const onRequestPost: PagesFunction<Env> = async (context: PagesContext) => {
  const { request } = context

  try {
    const body = (await request.json()) as {
      action?: string
      llmConfig?: LLMConfigPayload
    }
    const { action, llmConfig } = body

    if (action !== 'models' && action !== 'test') {
      return errorResponse(400, 'badRequest', 'unknown action')
    }

    if (!llmConfig?.baseUrl || !llmConfig?.apiKey) {
      return errorResponse(400, 'badRequest', 'baseUrl and apiKey are required')
    }

    let target: URL
    try {
      target = new URL(llmConfig.baseUrl.trim())
    } catch {
      return errorResponse(400, 'badRequest', 'invalid baseUrl')
    }

    if (target.protocol !== 'http:' && target.protocol !== 'https:') {
      return errorResponse(400, 'badRequest', 'unsupported protocol')
    }

    if (!isPublicHost(target.hostname)) {
      return errorResponse(400, 'badRequest', 'private address is not allowed')
    }

    const base = llmConfig.baseUrl.trim().replace(/\/+$/, '')
    const isAnthropic = llmConfig.provider === 'anthropic'

    if (action === 'models') {
      const upstream = await fetch(`${base}/models`, { headers: buildAuthHeaders(llmConfig) })
      const text = await upstream.text()
      if (!upstream.ok) {
        return errorResponse(upstream.status, '', text)
      }
      let models: string[] = []
      try {
        const data = JSON.parse(text) as { data?: unknown }
        if (Array.isArray(data.data)) {
          models = data.data
            .map((item) => (item as { id?: unknown })?.id)
            .filter((id): id is string => typeof id === 'string' && id.length > 0)
        }
      } catch {
        return errorResponse(200, 'badRequest', 'unexpected response body')
      }
      return new Response(JSON.stringify({ ok: true, models }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // action === 'test'
    const url = isAnthropic ? `${base}/messages` : `${base}/chat/completions`
    const payload = isAnthropic
      ? {
          model: llmConfig.modelId,
          max_tokens: 1,
          messages: [{ role: 'user', content: 'ping' }],
        }
      : {
          model: llmConfig.modelId,
          max_tokens: 1,
          messages: [{ role: 'user', content: 'ping' }],
          stream: false,
        }

    const upstream = await fetch(url, {
      method: 'POST',
      headers: buildAuthHeaders(llmConfig),
      body: JSON.stringify(payload),
    })
    const text = await upstream.text()
    if (!upstream.ok) {
      return errorResponse(upstream.status, '', text)
    }

    return new Response(JSON.stringify({ ok: true, message: 'ok' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('LLM probe error:', error instanceof Error ? error.message : 'Unknown error')
    return errorResponse(500, 'network', 'unexpected error')
  }
}
