import { useTranslation } from 'react-i18next'
import { FileCode2, X } from 'lucide-react'
import { Button } from '@/components/ui'
import type { EngineType } from '@/types'

interface PasteSourceBannerProps {
  engineType: EngineType
  onImport: () => void
  onDismiss: () => void
  isImporting?: boolean
}

/**
 * 粘贴文本被识别为图表源码时的提示条
 */
export function PasteSourceBanner({
  engineType,
  onImport,
  onDismiss,
  isImporting = false,
}: PasteSourceBannerProps) {
  const { t } = useTranslation()

  return (
    <div className="flex items-center gap-2 border border-border bg-brand-soft px-3 py-2 text-xs">
      <FileCode2 className="h-4 w-4 shrink-0 text-brand" />
      <span className="flex-1 truncate text-primary">
        {t('paste.detected', { engine: engineType.toUpperCase() })}
      </span>
      <Button size="sm" onClick={onImport} disabled={isImporting} className="h-7 rounded-full">
        {t('paste.importAction')}
      </Button>
      <button
        type="button"
        onClick={onDismiss}
        aria-label={t('paste.dismiss')}
        className="text-muted transition-colors hover:text-primary"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
