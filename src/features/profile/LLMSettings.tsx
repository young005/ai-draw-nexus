import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { v4 as uuidv4 } from 'uuid'
import {
  KeyRound,
  Trash2,
  Pencil,
  Plus,
  Check,
  Eye,
  EyeOff,
  RefreshCw,
  Plug,
  Loader2,
} from 'lucide-react'
import { Button, Input, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui'
import { useToast } from '@/hooks/useToast'
import { quotaService, EMPTY_LLM_CONFIG, isValidLLMConfig } from '@/services/quotaService'
import { loadLLMModels, testLLMConfig } from '@/services/llmProbe'
import { findMissingLLMField } from '@/lib/llmErrors'
import { LLM_PROVIDER_PRESETS, findLLMProviderPreset } from '@/constants/llmProviders'
import type { LLMConfig } from '@/types'

/** 空白配置（新增时用） */
function createEmptyConfig(): LLMConfig {
  return { ...EMPTY_LLM_CONFIG, id: uuidv4() }
}

export function LLMSettings() {
  const { t } = useTranslation()
  const { success, error: showError } = useToast()

  const [configs, setConfigs] = useState<LLMConfig[]>(() => quotaService.getLLMConfigs())
  const [activeId, setActiveId] = useState<string | null>(
    () => quotaService.getActiveLLMConfig()?.id ?? null
  )

  // 表单状态：null 表示不在编辑
  const [draft, setDraft] = useState<LLMConfig | null>(null)
  const [presetId, setPresetId] = useState<string>('custom')
  const [modelOptions, setModelOptions] = useState<string[]>([])
  const [showApiKey, setShowApiKey] = useState(false)
  const [isLoadingModels, setIsLoadingModels] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string; detail?: string } | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<LLMConfig | null>(null)

  const refresh = () => {
    setConfigs(quotaService.getLLMConfigs())
    setActiveId(quotaService.getActiveLLMConfig()?.id ?? null)
  }

  const startCreate = () => {
    const preset = LLM_PROVIDER_PRESETS[0]
    setPresetId(preset.id)
    setDraft({
      ...createEmptyConfig(),
      provider: preset.provider,
      baseUrl: preset.baseUrl,
      name: preset.label,
    })
    setModelOptions(preset.models)
    setShowApiKey(false)
    setTestResult(null)
  }

  const startEdit = (config: LLMConfig) => {
    const matched = LLM_PROVIDER_PRESETS.find(
      (p) => p.baseUrl && config.baseUrl.replace(/\/+$/, '') === p.baseUrl.replace(/\/+$/, '')
    )
    setPresetId(matched?.id ?? 'custom')
    setDraft({ ...config })
    setModelOptions(matched?.models ?? [])
    setShowApiKey(false)
    setTestResult(null)
  }

  const cancelEdit = () => {
    setDraft(null)
    setTestResult(null)
  }

  const applyPreset = (id: string) => {
    setPresetId(id)
    const preset = findLLMProviderPreset(id)
    if (!preset) return
    setDraft((prev) =>
      prev
        ? {
            ...prev,
            provider: preset.provider,
            baseUrl: preset.baseUrl,
            name: prev.name || preset.label,
          }
        : prev
    )
    setModelOptions(preset.models)
  }

  const update = (patch: Partial<LLMConfig>) => {
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev))
  }

  const handleLoadModels = async () => {
    if (!draft) return
    if (!draft.baseUrl.trim() || !draft.apiKey.trim()) {
      showError(
        t('llm.missingField', {
          field: !draft.baseUrl.trim() ? t('llm.apiAddress') : t('llm.apiKey'),
        })
      )
      return
    }

    setIsLoadingModels(true)
    setTestResult(null)
    const result = await loadLLMModels(draft)
    setIsLoadingModels(false)

    if (result.ok) {
      setModelOptions(result.models)
      success(t('llm.modelsLoaded', { count: result.models.length }))
    } else {
      setModelOptions([])
      showError(result.error.message)
      if (result.error.detail) console.info('[LLM] 服务商返回:', result.error.detail)
    }
  }

  const handleTest = async () => {
    if (!draft) return
    const missing = findMissingLLMField(draft)
    if (missing) {
      const labelKey = missing === 'baseUrl' ? 'llm.apiAddress' : missing === 'apiKey' ? 'llm.apiKey' : 'llm.modelId'
      showError(t('llm.missingField', { field: t(labelKey) }))
      return
    }

    setIsTesting(true)
    setTestResult(null)
    const result = await testLLMConfig(draft)
    setIsTesting(false)

    if (result.ok) {
      setTestResult({ ok: true, message: result.message })
    } else {
      setTestResult({ ok: false, message: result.error.message, detail: result.error.detail })
    }
  }

  const handleSave = () => {
    if (!draft) return
    const missing = findMissingLLMField(draft)
    if (missing) {
      const labelKey = missing === 'baseUrl' ? 'llm.apiAddress' : missing === 'apiKey' ? 'llm.apiKey' : 'llm.modelId'
      showError(t('llm.missingField', { field: t(labelKey) }))
      return
    }

    const next: LLMConfig = {
      ...draft,
      name: draft.name.trim() || draft.modelId.trim(),
      baseUrl: draft.baseUrl.trim(),
      apiKey: draft.apiKey.trim(),
      modelId: draft.modelId.trim(),
    }
    quotaService.upsertLLMConfig(next)
    refresh()
    setDraft(null)
    success(t('llm.saved'))
  }

  const handleSetActive = (config: LLMConfig) => {
    quotaService.setActiveLLMConfig(config.id)
    refresh()
  }

  const handleDelete = () => {
    if (!deleteTarget) return
    quotaService.removeLLMConfig(deleteTarget.id)
    setDeleteTarget(null)
    refresh()
    success(t('llm.removed'))
  }

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <KeyRound className="h-4 w-4 text-muted" />
        <h3 className="text-sm font-medium text-primary">{t('llm.title')}</h3>
      </div>

      {/* 配置列表 */}
      {configs.length === 0 && !draft && (
        <div className="rounded-xl border border-dashed border-border bg-background px-4 py-6 text-center">
          <p className="text-sm text-primary">{t('llm.empty')}</p>
          <p className="mt-1 text-xs text-muted">{t('llm.emptyHint')}</p>
        </div>
      )}

      {configs.length > 0 && (
        <div className="space-y-2">
          {configs.map((config) => {
            const isActive = config.id === activeId
            return (
              <div
                key={config.id}
                className={`flex items-center gap-3 border px-3 py-2 text-sm ${
                  isActive ? 'border-primary bg-brand-soft' : 'border-border bg-background'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium text-primary">{config.name}</span>
                    {isActive && (
                      <span className="shrink-0 rounded-full bg-success-soft px-2 py-0.5 text-[10px] font-semibold text-success">
                        {t('llm.active')}
                      </span>
                    )}
                    {!isValidLLMConfig(config) && (
                      <span className="shrink-0 rounded-full bg-warning-soft px-2 py-0.5 text-[10px] font-semibold text-warning">
                        {config.provider.toUpperCase()}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted">
                    {config.modelId} · {config.baseUrl}
                  </p>
                </div>

                {!isActive && (
                  <Button size="sm" variant="outline" onClick={() => handleSetActive(config)}>
                    <Check className="mr-1.5 h-3.5 w-3.5" />
                    {t('llm.setActive')}
                  </Button>
                )}
                <Button
                  size="icon"
                  variant="ghost"
                  title={t('llm.editConfig')}
                  onClick={() => startEdit(config)}
                  className="h-8 w-8"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  title={t('llm.delete')}
                  onClick={() => setDeleteTarget(config)}
                  className="h-8 w-8 text-danger hover:text-danger"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            )
          })}
        </div>
      )}

      {!draft && (
        <Button size="sm" variant="outline" onClick={startCreate} className="mt-3">
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          {t('llm.addConfig')}
        </Button>
      )}

      {/* 配置表单 */}
      {draft && (
        <div className="mt-4 space-y-3 rounded-xl border border-border bg-background p-4">
          <div>
            <label className="mb-1 block text-xs text-muted">{t('llm.configName')}</label>
            <Input
              value={draft.name}
              onChange={(e) => update({ name: e.target.value })}
              placeholder={t('llm.configNamePlaceholder')}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-muted">{t('llm.preset')}</label>
            <select
              value={presetId}
              onChange={(e) => applyPreset(e.target.value)}
              className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-primary outline-none focus:border-primary"
            >
              {LLM_PROVIDER_PRESETS.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs text-muted">{t('llm.apiType')}</label>
            <div className="flex gap-2">
              {(['openai', 'anthropic'] as const).map((provider) => (
                <button
                  key={provider}
                  type="button"
                  onClick={() => update({ provider })}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm capitalize transition-colors ${
                    draft.provider === provider
                      ? 'border-primary bg-primary text-surface'
                      : 'border-border bg-surface text-muted hover:border-primary'
                  }`}
                >
                  {provider}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs text-muted">{t('llm.apiAddress')}</label>
            <Input
              value={draft.baseUrl}
              onChange={(e) => update({ baseUrl: e.target.value })}
              placeholder={t('llm.apiAddressPlaceholder')}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-muted">{t('llm.apiKey')}</label>
            <div className="relative">
              <Input
                type={showApiKey ? 'text' : 'password'}
                value={draft.apiKey}
                onChange={(e) => update({ apiKey: e.target.value })}
                placeholder={t('llm.apiKeyPlaceholder')}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-primary"
              >
                {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs text-muted">{t('llm.modelId')}</label>
            <div className="flex gap-2">
              <Input
                value={draft.modelId}
                list="llm-model-options"
                onChange={(e) => update({ modelId: e.target.value })}
                placeholder={t('llm.modelIdPlaceholder')}
              />
              <datalist id="llm-model-options">
                {modelOptions.map((model) => (
                  <option key={model} value={model} />
                ))}
              </datalist>
              <Button
                size="sm"
                variant="outline"
                onClick={handleLoadModels}
                disabled={isLoadingModels}
                className="shrink-0"
              >
                {isLoadingModels ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                )}
                {isLoadingModels ? t('llm.loadingModels') : t('llm.loadModels')}
              </Button>
            </div>
            {modelOptions.length > 0 && (
              <p className="mt-1 text-xs text-muted">
                {t('llm.modelsLoaded', { count: modelOptions.length })}
              </p>
            )}
          </div>

          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={draft.directConnect}
              onChange={(e) => update({ directConnect: e.target.checked })}
              className="mt-0.5 h-4 w-4 accent-[var(--color-brand)]"
            />
            <span>
              <span className="text-primary">{t('profile.directConnect')}</span>
              <span className="block text-xs text-muted">{t('profile.directConnectHint')}</span>
            </span>
          </label>

          {/* 测试结果 */}
          {testResult && (
            <div
              className={`rounded-lg border px-3 py-2 text-xs ${
                testResult.ok
                  ? 'border-success/30 bg-success-soft text-success'
                  : 'border-danger/30 bg-danger-soft text-danger'
              }`}
            >
              <p className="font-medium">{testResult.message}</p>
              {testResult.detail && (
                <pre className="mt-1 max-h-24 overflow-auto whitespace-pre-wrap break-all font-mono text-[10px] leading-4 opacity-80">
                  {testResult.detail}
                </pre>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-1">
            <Button size="sm" onClick={handleTest} disabled={isTesting}>
              {isTesting ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plug className="mr-1.5 h-3.5 w-3.5" />
              )}
              {isTesting ? t('llm.testing') : t('llm.testConnection')}
            </Button>
            <Button size="sm" variant="default" onClick={handleSave}>
              {t('llm.save')}
            </Button>
            <Button size="sm" variant="ghost" onClick={cancelEdit}>
              {t('llm.cancel')}
            </Button>
          </div>
        </div>
      )}

      {/* 删除确认 */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>{t('llm.delete')}</DialogTitle>
            <DialogDescription>
              {t('llm.deleteConfirm', { name: deleteTarget?.name ?? '' })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} className="rounded-full">
              {t('llm.cancel')}
            </Button>
            <Button
              onClick={handleDelete}
              className="rounded-full bg-danger text-surface hover:bg-danger/90"
            >
              {t('llm.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
