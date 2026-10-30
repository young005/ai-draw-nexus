import { useTranslation } from 'react-i18next'
import { Globe } from 'lucide-react'
import { resolveLocale } from '@/i18n'

export function LanguageSwitcher() {
  const { t, i18n } = useTranslation()
  const isZh = resolveLocale(i18n.resolvedLanguage) === 'zh-CN'

  return (
    <button
      type="button"
      onClick={() => void i18n.changeLanguage(isZh ? 'en-US' : 'zh-CN')}
      title={isZh ? t('locale.switchToEn') : t('locale.switchToZh')}
      aria-label={isZh ? t('locale.switchToEn') : t('locale.switchToZh')}
      className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-sm text-muted transition-colors hover:border-primary hover:text-primary"
    >
      <Globe className="h-4 w-4" />
      <span>{isZh ? t('locale.zhCN') : t('locale.enUS')}</span>
    </button>
  )
}
