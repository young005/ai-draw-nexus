/**
 * 常见 AI 服务商预设
 * 选中预设会自动填好接口地址、API 类型与常用模型；
 * 常用模型仅作提示，权威列表请用「加载模型」从服务商 /models 接口获取。
 */

export interface LLMProviderPreset {
  id: string
  label: string
  provider: 'openai' | 'anthropic'
  baseUrl: string
  models: string[]
}

export const LLM_PROVIDER_PRESETS: LLMProviderPreset[] = [
  {
    id: 'openai',
    label: 'OpenAI',
    provider: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    models: ['gpt-5', 'gpt-4.1', 'gpt-4o', 'gpt-4o-mini'],
  },
  {
    id: 'anthropic',
    label: 'Anthropic',
    provider: 'anthropic',
    baseUrl: 'https://api.anthropic.com/v1',
    models: ['claude-opus-4-5', 'claude-sonnet-4-5', 'claude-haiku-4-5'],
  },
  {
    id: 'deepseek',
    label: 'DeepSeek',
    provider: 'openai',
    baseUrl: 'https://api.deepseek.com',
    models: ['deepseek-chat', 'deepseek-reasoner'],
  },
  {
    id: 'minimax-cn',
    label: 'MiniMax（国内）',
    provider: 'openai',
    baseUrl: 'https://api.minimaxi.com/v1',
    models: ['MiniMax-M2', 'MiniMax-M2.1', 'MiniMax-Text-01', 'abab6.5s-chat'],
  },
  {
    id: 'minimax-global',
    label: 'MiniMax（海外）',
    provider: 'openai',
    baseUrl: 'https://api.minimax.chat/v1',
    models: ['MiniMax-M2', 'MiniMax-M2.1', 'MiniMax-Text-01'],
  },
  {
    id: 'dashscope',
    label: '通义千问 DashScope',
    provider: 'openai',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    models: ['qwen3-max', 'qwen3-plus', 'qwen3-turbo', 'qwen-long'],
  },
  {
    id: 'zhipu',
    label: '智谱 GLM',
    provider: 'openai',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    models: ['glm-4.6', 'glm-4-plus', 'glm-4-air', 'glm-4-flash'],
  },
  {
    id: 'moonshot',
    label: 'Moonshot 月之暗面',
    provider: 'openai',
    baseUrl: 'https://api.moonshot.cn/v1',
    models: ['kimi-k2-turbo-preview', 'moonshot-v1-128k', 'moonshot-v1-32k'],
  },
  {
    id: 'siliconflow',
    label: '硅基流动 SiliconFlow',
    provider: 'openai',
    baseUrl: 'https://api.siliconflow.cn/v1',
    models: ['deepseek-ai/DeepSeek-V3', 'Qwen/Qwen3-235B-A22B'],
  },
  {
    id: 'openrouter',
    label: 'OpenRouter',
    provider: 'openai',
    baseUrl: 'https://openrouter.ai/api/v1',
    models: ['deepseek/deepseek-chat', 'anthropic/claude-sonnet-4.5', 'google/gemini-2.5-pro'],
  },
  {
    id: 'ollama',
    label: 'Ollama 本地',
    provider: 'openai',
    baseUrl: 'http://localhost:11434/v1',
    models: ['qwen3', 'gemma3', 'llama3.2'],
  },
  {
    id: 'custom',
    label: '自定义',
    provider: 'openai',
    baseUrl: '',
    models: [],
  },
]

/** 按 id 找预设 */
export function findLLMProviderPreset(id: string): LLMProviderPreset | undefined {
  return LLM_PROVIDER_PRESETS.find((p) => p.id === id)
}

/** 按接口地址推测预设（用于旧配置迁移时给备注名） */
export function guessLLMProviderPreset(baseUrl: string): LLMProviderPreset | undefined {
  const normalized = baseUrl.replace(/\/+$/, '').toLowerCase()
  return LLM_PROVIDER_PRESETS.find(
    (p) => p.baseUrl && normalized.startsWith(p.baseUrl.replace(/\/+$/, '').toLowerCase())
  )
}
