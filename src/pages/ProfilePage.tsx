import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AppSidebar, AppHeader } from '@/components/layout'
import { Button, Input } from '@/components/ui'
import { quotaService, EMPTY_LLM_CONFIG, isValidLLMConfig } from '@/services/quotaService'
import type { LLMConfig } from '@/types'
import { useToast } from '@/hooks/useToast'
import { Settings, Eye, EyeOff, KeyRound, Trash2 } from 'lucide-react'

export function ProfilePage() {
  const { t } = useTranslation()
  const [activeTab] = useState('settings')
  const [password, setPassword] = useState(() => quotaService.getAccessPassword())
  const [showPassword, setShowPassword] = useState(false)
  const [quotaUsed] = useState(() => quotaService.getUsedCount())
  const [quotaTotal] = useState(() => quotaService.getDailyQuota())
  const { success, error: showError } = useToast()

  const handleSavePassword = () => {
    if (!password.trim()) {
      showError(t('profile.passwordRequired'))
      return
    }
    quotaService.setAccessPassword(password.trim())
    success(t('profile.passwordSaved'))
  }

  const handleResetPassword = () => {
    quotaService.clearAccessPassword()
    setPassword('')
    success(t('profile.passwordCleared'))
  }

  const quotaPercentage = Math.min(100, (quotaUsed / quotaTotal) * 100)
  const hasPassword = quotaService.hasAccessPassword()

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      <main className="flex flex-1 flex-col">
        <AppHeader />
        <div className="flex flex-1 items-start justify-center px-8 pt-12">
          <div className="w-full max-w-3xl rounded-xl border border-border bg-surface shadow-sm">
            <div className="flex min-h-[500px]">
              {/* 左侧 Tab */}
              <div className="w-48 border-r border-border p-4">
                <nav className="space-y-1">
                  <button
                    className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                      activeTab === 'settings'
                        ? 'bg-primary text-surface'
                        : 'text-muted hover:bg-background hover:text-primary'
                    }`}
                  >
                    <Settings className="h-4 w-4" />
                    <span>{t('profile.settings')}</span>
                  </button>
                </nav>
              </div>

              {/* 右侧内容区 */}
              <div className="flex-1 p-6">
                <h2 className="mb-6 text-lg font-medium text-primary">{t('profile.settings')}</h2>

                {/* 每日配额 */}
                <QuotaSection
                  quotaUsed={quotaUsed}
                  quotaTotal={quotaTotal}
                  quotaPercentage={quotaPercentage}
                  hasPassword={hasPassword}
                />

                {/* 分隔线 */}
                <div className="my-6 border-t border-border" />

                {/* 访问密码 */}
                <PasswordSection
                  password={password}
                  setPassword={setPassword}
                  showPassword={showPassword}
                  setShowPassword={setShowPassword}
                  onSave={handleSavePassword}
                  onReset={handleResetPassword}
                />

                {/* 分隔线 */}
                <div className="my-6 border-t border-border" />

                {/* 自定义 LLM */}
                <LLMConfigSection />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

interface QuotaSectionProps {
  quotaUsed: number
  quotaTotal: number
  quotaPercentage: number
  hasPassword: boolean
}

function QuotaSection({ quotaUsed, quotaTotal, quotaPercentage, hasPassword }: QuotaSectionProps) {
  const { t } = useTranslation()

  return (
    <div>
      <h3 className="mb-3 text-sm font-medium text-primary">{t('profile.dailyQuota')}</h3>
      <div className="space-y-3">
        {/* 进度条 */}
        <div className="h-2 w-full overflow-hidden rounded-full bg-background">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${quotaPercentage}%` }}
          />
        </div>
        {/* 配额信息 */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted">
            {t('profile.quotaUsed', { used: quotaUsed, total: quotaTotal })}
          </span>
          {hasPassword && (
            <span className="rounded-full bg-success-soft px-2 py-0.5 text-xs text-success">
              {t('profile.quotaUnlimited')}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

interface PasswordSectionProps {
  password: string
  setPassword: (value: string) => void
  showPassword: boolean
  setShowPassword: (value: boolean) => void
  onSave: () => void
  onReset: () => void
}

function PasswordSection({
  password,
  setPassword,
  showPassword,
  setShowPassword,
  onSave,
  onReset,
}: PasswordSectionProps) {
  const { t } = useTranslation()

  return (
    <div>
      <h3 className="mb-3 text-sm font-medium text-primary">{t('profile.accessPassword')}</h3>
      <div className="space-y-3">
        <div className="relative">
          <Input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t('profile.passwordPlaceholder')}
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-primary"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <p className="text-xs text-muted">{t('profile.passwordHint')}</p>
        <div className="flex gap-2">
          <Button size="sm" onClick={onSave}>
            {t('common.save')}
          </Button>
          <Button size="sm" variant="outline" onClick={onReset}>
            {t('common.reset')}
          </Button>
        </div>
      </div>
    </div>
  )
}

/**
 * 自定义 LLM 配置：可走后台代理，也可前端直连
 */
function LLMConfigSection() {
  const { t } = useTranslation()
  const { success, error: showError } = useToast()
  const [config, setConfig] = useState<LLMConfig>(() => {
    const stored = quotaService.getLLMConfig()
    return stored ? { ...EMPTY_LLM_CONFIG, ...stored } : EMPTY_LLM_CONFIG
  })
  const [showApiKey, setShowApiKey] = useState(false)
  const [hasSaved, setHasSaved] = useState(() => !!quotaService.getLLMConfig())

  const update = (patch: Partial<LLMConfig>) => {
    setConfig((prev) => ({ ...prev, ...patch }))
  }

  const handleSave = () => {
    if (!config.apiKey.trim()) {
      showError(t('profile.apiKeyRequired'))
      return
    }
    if (!config.baseUrl.trim()) {
      showError(t('profile.baseUrlRequired'))
      return
    }
    if (!config.modelId.trim()) {
      showError(t('profile.modelIdRequired'))
      return
    }

    const next: LLMConfig = {
      ...config,
      baseUrl: config.baseUrl.trim(),
      apiKey: config.apiKey.trim(),
      modelId: config.modelId.trim(),
    }
    quotaService.setLLMConfig(next)
    setConfig(next)
    setHasSaved(true)
    success(t('profile.llmSaved'))
  }

  const handleClear = () => {
    quotaService.clearLLMConfig()
    setConfig(EMPTY_LLM_CONFIG)
    setHasSaved(false)
    success(t('profile.llmCleared'))
  }

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <KeyRound className="h-4 w-4 text-muted" />
        <h3 className="text-sm font-medium text-primary">{t('profile.customLLM')}</h3>
        {hasSaved && isValidLLMConfig(config) && (
          <span className="rounded-full bg-success-soft px-2 py-0.5 text-xs text-success">
            {t('profile.customLLMConfigured')}
          </span>
        )}
      </div>

      <div className="space-y-3">
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={config.enabled}
            onChange={(e) => update({ enabled: e.target.checked })}
            className="mt-0.5 h-4 w-4 accent-[var(--color-brand)]"
          />
          <span>
            <span className="text-primary">{t('profile.customLLMEnabled')}</span>
            <span className="block text-xs text-muted">{t('profile.customLLMEnabledHint')}</span>
          </span>
        </label>

        <div>
          <label className="mb-1 block text-xs text-muted">{t('profile.apiType')}</label>
          <div className="flex gap-2">
            {(['openai', 'anthropic'] as const).map((provider) => (
              <button
                key={provider}
                type="button"
                onClick={() => update({ provider })}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm capitalize transition-colors ${
                  config.provider === provider
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
          <label className="mb-1 block text-xs text-muted">{t('profile.apiAddress')}</label>
          <Input
            value={config.baseUrl}
            onChange={(e) => update({ baseUrl: e.target.value })}
            placeholder={t('profile.apiAddressPlaceholder')}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-muted">{t('profile.apiKey')}</label>
          <div className="relative">
            <Input
              type={showApiKey ? 'text' : 'password'}
              value={config.apiKey}
              onChange={(e) => update({ apiKey: e.target.value })}
              placeholder={t('profile.apiKeyPlaceholder')}
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
          <label className="mb-1 block text-xs text-muted">{t('profile.modelId')}</label>
          <Input
            value={config.modelId}
            onChange={(e) => update({ modelId: e.target.value })}
            placeholder="gpt-4o-mini"
          />
        </div>

        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={config.directConnect}
            onChange={(e) => update({ directConnect: e.target.checked })}
            className="mt-0.5 h-4 w-4 accent-[var(--color-brand)]"
          />
          <span>
            <span className="text-primary">{t('profile.directConnect')}</span>
            <span className="block text-xs text-muted">{t('profile.directConnectHint')}</span>
          </span>
        </label>

        <p className="text-xs leading-5 text-muted">{t('profile.llmHintLine1')}</p>
        <p className="text-xs leading-5 text-muted">{t('profile.llmHintLine2')}</p>

        <div className="flex gap-2">
          <Button size="sm" onClick={handleSave}>
            {t('common.save')}
          </Button>
          <Button size="sm" variant="outline" onClick={handleClear}>
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            {t('common.reset')}
          </Button>
        </div>
      </div>
    </div>
  )
}
