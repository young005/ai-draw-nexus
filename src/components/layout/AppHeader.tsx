import { Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'

export function AppHeader() {
  const { t } = useTranslation()

  return (
    <header className="flex items-center justify-between px-8 py-4">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <Sparkles className="h-4 w-4 text-surface" />
        </div>
        <span className="text-lg font-semibold text-primary">{t('app.name')}</span>
      </div>

      <div className="flex items-center gap-4">
        <LanguageSwitcher />
      </div>
    </header>
  )
}

