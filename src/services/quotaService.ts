/**
 * 配额管理服务
 * 管理每日使用配额、访问密码与自定义 LLM 配置
 */

import { v4 as uuidv4 } from 'uuid'
import type { LLMConfig, LLMConfigStore } from '@/types'

export type { LLMConfig, LLMConfigStore }

const QUOTA_STORAGE_KEY = 'ai-draw-quota'
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

interface QuotaData {
  date: string // 格式: "2025-12-25"
  used: number // 已使用次数
}

/**
 * 获取今天的日期字符串
 */
function getTodayString(): string {
  return new Date().toISOString().split('T')[0]
}

/**
 * 获取配额数据
 */
function getQuotaData(): QuotaData {
  const stored = localStorage.getItem(QUOTA_STORAGE_KEY)
  if (!stored) {
    return { date: getTodayString(), used: 0 }
  }

  try {
    const data: QuotaData = JSON.parse(stored)
    // 如果不是今天的数据，重置
    if (data.date !== getTodayString()) {
      return { date: getTodayString(), used: 0 }
    }
    return data
  } catch {
    return { date: getTodayString(), used: 0 }
  }
}

/**
 * 保存配额数据
 */
function saveQuotaData(data: QuotaData): void {
  localStorage.setItem(QUOTA_STORAGE_KEY, JSON.stringify(data))
}

export const quotaService = {
  /**
   * 获取每日配额上限
   */
  getDailyQuota(): number {
    const quota = import.meta.env.VITE_DAILY_QUOTA
    return quota ? parseInt(quota, 10) : 10 // 默认 10 次
  },

  /**
   * 获取今日已使用次数
   */
  getUsedCount(): number {
    return getQuotaData().used
  },

  /**
   * 获取剩余次数
   */
  getRemainingCount(): number {
    const quota = this.getDailyQuota()
    const used = this.getUsedCount()
    return Math.max(0, quota - used)
  },

  /**
   * 是否还有配额
   */
  hasQuotaRemaining(): boolean {
    return this.getRemainingCount() > 0
  },

  /**
   * 消耗一次配额
   */
  consumeQuota(): void {
    const data = getQuotaData()
    data.used += 1
    saveQuotaData(data)
  },

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
