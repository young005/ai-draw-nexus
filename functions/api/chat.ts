import type { Env, ChatRequest } from './_shared/types'
import { resolveLlmSettings, UpstreamError } from './_shared/types'
import { corsHeaders } from './_shared/cors'
import { validateAccessPassword } from './_shared/auth'
import { callOpenAI, callAnthropic } from './_shared/ai-providers'
import { streamOpenAI } from './_shared/stream-openai'
import { streamAnthropic } from './_shared/stream-anthropic'

interface PagesContext {
  request: Request
  env: Env
}

export const onRequestOptions: PagesFunction<Env> = async () => {
  return new Response(null, { headers: corsHeaders })
}

export const onRequestPost: PagesFunction<Env> = async (context: PagesContext) => {
  const { request, env } = context

  try {
    if (!validateAccessPassword(request, env)) {
      return new Response(JSON.stringify({ error: '访问密码错误' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body: ChatRequest = await request.json()
    const { messages, stream = false, llmConfig } = body

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: 'Invalid request: messages required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 请求级自定义配置优先，其次回落到服务端环境变量
    const settings = resolveLlmSettings(env, llmConfig)
    const provider = settings.provider

    if (stream) {
      switch (provider) {
        case 'anthropic':
          // 必须 await，否则 promise 的 rejection 会逃出 try，上游错误会变成 500 堆栈
          return await streamAnthropic(messages, env, llmConfig)
        case 'openai':
        default:
          return await streamOpenAI(messages, env, llmConfig)
      }
    } else {
      let response: string

      switch (provider) {
        case 'anthropic':
          response = await callAnthropic(messages, env, llmConfig)
          break
        case 'openai':
        default:
          response = await callOpenAI(messages, env, llmConfig)
          break
      }

      return new Response(JSON.stringify({ content: response }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
  } catch (error) {
    // 注意：不要打印请求体，其中可能含有用户自己的 API Key
    console.error('Chat error:', error instanceof Error ? error.message : 'Unknown error')
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    // 上游服务商的错误保留状态码，前端据此判断具体原因
    const upstreamStatus = error instanceof UpstreamError ? error.status : undefined
    return new Response(JSON.stringify({ error: errorMessage, status: upstreamStatus }), {
      status: upstreamStatus ?? 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
}
