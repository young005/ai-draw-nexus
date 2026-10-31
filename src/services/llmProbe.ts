import type { LLMConfig } from '@/types'
import {
  codeFromStatus,
  describeLLMError,
  localizeProbeError,
  truncateDetail,
  type LLMProbeResult,
} from '@/lib/llmErrors'
import i18n from '@/i18n'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

/** 去掉结尾多余的斜杠，便于拼接路径 */
function trimBase(baseUrl: string): string {
  return baseUrl.trim().replace(/\/+$/, '')
}

/** 按 API 类型生成鉴权头 */
function authHeaders(config: LLMConfig): Record<string, string> {
  if (config.provider === 'anthropic') {
    return {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01',
    }
  }
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${config.apiKey}`,
  }
}

/** 从各家 { data: [{ id }] } 形状里取出模型 id */
export function extractModelIds(payload: unknown): string[] {
  const data = (payload as { data?: unknown })?.data
  if (!Array.isArray(data)) return []
  return data
    .map((item) => (item as { id?: unknown })?.id)
    .filter((id): id is string => typeof id === 'string' && id.length > 0)
}

/**
 * 加载服务商支持的模型列表
 * 直连模式由浏览器直接请求，代理模式经由后台转发（后者不受跨域限制）
 */
export async function loadLLMModels(
  config: LLMConfig
): Promise<LLMProbeResult<{ models: string[] }>> {
  if (config.directConnect) {
    try {
      const response = await fetch(`${trimBase(config.baseUrl)}/models`, {
        headers: authHeaders(config),
      })
      if (!response.ok) {
        const body = await response.text()
        return { ok: false, error: describeLLMError(response.status, body, 'direct') }
      }
      const models = extractModelIds(await response.json())
      if (models.length === 0) {
        return {
          ok: false,
          error: {
            code: 'emptyModels',
            message: i18n.t('llm.errors.emptyModels'),
          },
        }
      }
      return { ok: true, models }
    } catch (err) {
      return {
        ok: false,
        error: describeLLMError(null, err instanceof Error ? err.message : String(err), 'direct'),
      }
    }
  }

  try {
    const response = await fetch(`${API_BASE_URL}/llm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'models', llmConfig: config }),
    })
    const data = await response.json()
    if (!response.ok || !data.ok) {
      return {
        ok: false,
        error: localizeProbeError(
          data.code || codeFromStatus(data.status ?? null),
          data.status,
          truncateDetail(data.detail || ''),
          'proxy'
        ),
      }
    }
    return { ok: true, models: data.models || [] }
  } catch (err) {
    return {
      ok: false,
      error: describeLLMError(null, err instanceof Error ? err.message : String(err), 'proxy'),
    }
  }
}

/**
 * 测试连接：发一条极短的请求，确认地址、密钥与模型都可用
 */
export async function testLLMConfig(
  config: LLMConfig
): Promise<LLMProbeResult<{ message: string }>> {
  const startedAt = Date.now()

  if (config.directConnect) {
    try {
      const isAnthropic = config.provider === 'anthropic'
      const url = isAnthropic
        ? `${trimBase(config.baseUrl)}/messages`
        : `${trimBase(config.baseUrl)}/chat/completions`
      const body = isAnthropic
        ? {
            model: config.modelId,
            max_tokens: 1,
            messages: [{ role: 'user', content: 'ping' }],
          }
        : {
            model: config.modelId,
            max_tokens: 1,
            messages: [{ role: 'user', content: 'ping' }],
            stream: false,
          }

      const response = await fetch(url, { method: 'POST', headers: authHeaders(config), body: JSON.stringify(body) })
      if (!response.ok) {
        const text = await response.text()
        return { ok: false, error: describeLLMError(response.status, text, 'direct') }
      }
      return {
        ok: true,
        message: i18n.t('llm.testPassed', { model: config.modelId, ms: Date.now() - startedAt }),
      }
    } catch (err) {
      return {
        ok: false,
        error: describeLLMError(null, err instanceof Error ? err.message : String(err), 'direct'),
      }
    }
  }

  try {
    const response = await fetch(`${API_BASE_URL}/llm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'test', llmConfig: config }),
    })
    const data = await response.json()
    if (!response.ok || !data.ok) {
      return {
        ok: false,
        error: localizeProbeError(
          data.code || codeFromStatus(data.status ?? null),
          data.status,
          truncateDetail(data.detail || ''),
          'proxy'
        ),
      }
    }
    return {
      ok: true,
      message: i18n.t('llm.testPassed', { model: config.modelId, ms: Date.now() - startedAt }),
    }
  } catch (err) {
    return {
      ok: false,
      error: describeLLMError(null, err instanceof Error ? err.message : String(err), 'proxy'),
    }
  }
}
