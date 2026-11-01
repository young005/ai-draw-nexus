import type { Env } from './types'

/**
 * 验证访问密码
 *
 * 语义：后端配置了密码后，请求如果带了密码就必须正确；没带密码则放行。
 * @returns 是否放行该请求
 */
export function validateAccessPassword(request: Request, env: Env): boolean {
  const password = request.headers.get('X-Access-Password')
  const configuredPassword = env.ACCESS_PASSWORD

  // 后端未配置密码，所有请求都放行
  if (!configuredPassword) {
    return true
  }

  // 请求携带密码，必须正确
  if (password) {
    return password === configuredPassword
  }

  // 未携带密码，放行
  return true
}
