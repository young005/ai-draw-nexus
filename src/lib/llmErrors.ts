import i18n from '@/i18n'

/**
 * 自定义 LLM 探测（加载模型 / 测试连接）的统一错误结构
 */
export interface LLMProbeError {
  /** HTTP 状态码，网络错误时为空 */
  status?: number
  /** 错误分类，用于本地化与展示 */
  code: string
  /** 面向用户的说明（已本地化） */
  message: string
  /** 服务商返回的原始信息（截断后） */
  detail?: string
}

export type LLMProbeResult<T> = ({ ok: true } & T) | { ok: false; error: LLMProbeError }

const MAX_DETAIL_LENGTH = 300

/** 截断服务商返回的原文，避免把整页 HTML 塞进界面 */
export function truncateDetail(text: string): string {
  const trimmed = (text || '').trim()
  if (!trimmed) return ''
  if (trimmed.length <= MAX_DETAIL_LENGTH) return trimmed
  return `${trimmed.slice(0, MAX_DETAIL_LENGTH)}…`
}

/** 由状态码推断错误分类 */
export function codeFromStatus(status: number | null): string {
  if (status === null) return 'network'
  if (status === 400) return 'badRequest'
  if (status === 401 || status === 403) return 'unauthorized'
  if (status === 404) return 'notFound'
  if (status === 408 || status === 504) return 'timeout'
  if (status === 429) return 'rateLimited'
  if (status >= 500) return 'serverError'
  return 'unknown'
}

/**
 * 按错误分类生成面向用户的说明
 * @param mode 请求走的通道，浏览器直连时的网络错误多半是跨域限制
 */
export function localizeProbeError(
  code: string,
  status: number | undefined,
  detail: string | undefined,
  mode: 'direct' | 'proxy'
): LLMProbeError {
  const messageKey = (() => {
    switch (code) {
      case 'network':
        return mode === 'direct' ? 'llm.errors.networkDirect' : 'llm.errors.networkProxy'
      case 'badRequest':
        return 'llm.errors.badRequest'
      case 'unauthorized':
        return 'llm.errors.unauthorized'
      case 'notFound':
        return 'llm.errors.notFound'
      case 'timeout':
        return 'llm.errors.timeout'
      case 'rateLimited':
        return 'llm.errors.rateLimited'
      case 'serverError':
        return 'llm.errors.serverError'
      default:
        return 'llm.errors.unknown'
    }
  })()

  return {
    status,
    code,
    message: i18n.t(messageKey, { status: status ?? '-' }),
    detail,
  }
}

/**
 * 把 HTTP 状态码与服务商返回内容归一化成可读的错误
 */
export function describeLLMError(
  status: number | null,
  bodyText: string,
  mode: 'direct' | 'proxy'
): LLMProbeError {
  const detail = truncateDetail(bodyText)
  return localizeProbeError(codeFromStatus(status), status ?? undefined, detail, mode)
}

/**
 * 校验表单必填项，返回缺失字段的键名
 */
export function findMissingLLMField(config: {
  baseUrl: string
  apiKey: string
  modelId: string
}): 'baseUrl' | 'apiKey' | 'modelId' | null {
  if (!config.baseUrl.trim()) return 'baseUrl'
  if (!config.apiKey.trim()) return 'apiKey'
  if (!config.modelId.trim()) return 'modelId'
  return null
}
