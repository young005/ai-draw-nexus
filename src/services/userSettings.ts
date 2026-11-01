/**
 * 用户设置服务
 * 管理访问密码与自定义 LLM 配置
 */

import { v4 as uuidv4 } from 'uuid'
import type { LLMConfig, LLMConfigStore } from '@/types'

export type { LLMConfig, LLMConfigStore }

const PASSWORD_STORAGE_KEY = 'ai-draw-access-password'
const LLM_CONFIG_STORAGE_KEY = 'ai-draw-llm-configs'
/** 旧版单条配置的存储键，仅用于一次性迁移 */
const LEGACY_LLM_CONFIG_STORAGE_KEY = 'ai-draw-llm-config'

export const EMPTY_LLM_CONFIG: LLMConfig = {
  id: '',
  name: '',
  enabled: true,
  provider: 'openai',
  baseUrl: '',
  apiKey: '',
  modelId: '',
  directConnect: false,
}

/** 自定义配置是否完整可用 */
export function isValidLLMConfig(config: LLMConfig | null | undefined): boolean {
  return !!(
    config &&
    config.enabled !== false &&
    config.apiKey?.trim() &&
    config.baseUrl?.trim() &&
    config.modelId?.trim()
  )
}

/**
 * 读取自定义 LLM 配置集合；旧版单条配置会自动迁移成一条
 */
function readLLMConfigStore(): LLMConfigStore {
  const raw = localStorage.getItem(LLM_CONFIG_STORAGE_KEY)
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as LLMConfigStore
      if (parsed && Array.isArray(parsed.configs)) {
        return { configs: parsed.configs, activeId: parsed.activeId ?? null }
      }
    } catch {
      // 数据损坏时按空集合处理
    }
  }

  // 迁移旧版单条配置
  const legacy = localStorage.getItem(LEGACY_LLM_CONFIG_STORAGE_KEY)
  if (legacy) {
    localStorage.removeItem(LEGACY_LLM_CONFIG_STORAGE_KEY)
    try {
      const old = JSON.parse(legacy) as Partial<LLMConfig>
      if (old && (old.baseUrl || old.modelId)) {
        const config: LLMConfig = {
          ...EMPTY_LLM_CONFIG,
          ...old,
          id: uuidv4(),
          name: old.modelId?.trim() || old.baseUrl?.trim() || 'Custom',
        }
        const store: LLMConfigStore = { configs: [config], activeId: config.id }
        localStorage.setItem(LLM_CONFIG_STORAGE_KEY, JSON.stringify(store))
        return store
      }
    } catch {
      // 旧数据解析失败，直接丢弃
    }
  }

  return { configs: [], activeId: null }
}

function writeLLMConfigStore(store: LLMConfigStore): void {
  localStorage.setItem(LLM_CONFIG_STORAGE_KEY, JSON.stringify(store))
}

export const userSettings = {
  /**
   * 获取存储的访问密码
   */
  getAccessPassword(): string {
    return localStorage.getItem(PASSWORD_STORAGE_KEY) || ''
  },

  /**
   * 保存访问密码
   */
  setAccessPassword(password: string): void {
    localStorage.setItem(PASSWORD_STORAGE_KEY, password)
  },

  /**
   * 清除访问密码
   */
  clearAccessPassword(): void {
    localStorage.removeItem(PASSWORD_STORAGE_KEY)
  },

  /**
   * 是否已设置访问密码
   */
  hasAccessPassword(): boolean {
    return !!this.getAccessPassword()
  },

  /**
   * 读取全部自定义 LLM 配置
   */
  getLLMConfigs(): LLMConfig[] {
    return readLLMConfigStore().configs
  },

  /**
   * 读取当前启用的自定义 LLM 配置
   */
  getActiveLLMConfig(): LLMConfig | null {
    const store = readLLMConfigStore()
    if (!store.activeId) return null
    return store.configs.find((c) => c.id === store.activeId) ?? null
  },

  /**
   * 新增或更新一条自定义 LLM 配置
   */
  upsertLLMConfig(config: LLMConfig): void {
    const store = readLLMConfigStore()
    const index = store.configs.findIndex((c) => c.id === config.id)
    if (index >= 0) {
      store.configs[index] = config
    } else {
      store.configs.push(config)
    }
    if (!store.activeId) store.activeId = config.id
    writeLLMConfigStore(store)
  },

  /**
   * 删除一条自定义 LLM 配置
   */
  removeLLMConfig(id: string): void {
    const store = readLLMConfigStore()
    store.configs = store.configs.filter((c) => c.id !== id)
    if (store.activeId === id) {
      store.activeId = store.configs[0]?.id ?? null
    }
    writeLLMConfigStore(store)
  },

  /**
   * 设置当前使用的自定义 LLM 配置
   */
  setActiveLLMConfig(id: string): void {
    const store = readLLMConfigStore()
    if (!store.configs.some((c) => c.id === id)) return
    store.activeId = id
    writeLLMConfigStore(store)
  },

  /**
   * 清除全部自定义 LLM 配置
   */
  clearLLMConfigs(): void {
    localStorage.removeItem(LLM_CONFIG_STORAGE_KEY)
    localStorage.removeItem(LEGACY_LLM_CONFIG_STORAGE_KEY)
  },

  /**
   * 是否已配置可用的自定义 LLM
   */
  hasLLMConfig(): boolean {
    return isValidLLMConfig(this.getActiveLLMConfig())
  },
}
