import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AppSidebar, AppHeader } from '@/components/layout'
import { Button, Input } from '@/components/ui'
import { quotaService } from '@/services/quotaService'
import { LLMSettings } from '@/features/profile/LLMSettings'
import { useToast } from '@/hooks/useToast'
import { Settings, Eye, EyeOff } from 'lucide-react'

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
  const hasCustomLLM = quotaService.hasLLMConfig()

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
                  hasCustomLLM={hasCustomLLM}
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
                <LLMSettings />
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
  hasCustomLLM: boolean
}

function QuotaSection({
  quotaUsed,
  quotaTotal,
  quotaPercentage,
  hasPassword,
  hasCustomLLM,
}: QuotaSectionProps) {
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
          {!hasPassword && hasCustomLLM && (
            <span className="rounded-full bg-success-soft px-2 py-0.5 text-xs text-success">
              {t('profile.quotaCustomLLM')}
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
