import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Button,
  Input,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui'
import { getEngines } from '@/constants'
import { ProjectRepository } from '@/services/projectRepository'
import type { EngineType } from '@/types'

interface CreateProjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateProjectDialog({ open, onOpenChange }: CreateProjectDialogProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [title, setTitle] = useState(t('common.untitledPrefixZh'))
  const [engine, setEngine] = useState<EngineType>('mermaid')
  const [isCreating, setIsCreating] = useState(false)

  const engines = getEngines(t)

  const handleCreate = async () => {
    if (!title.trim()) return

    setIsCreating(true)
    try {
      const project = await ProjectRepository.create({
        title: title.trim(),
        engineType: engine,
      })
      onOpenChange(false)
      setTitle(t('common.untitledPrefixZh'))
      navigate(`/editor/${project.id}`)
    } catch (error) {
      console.error('Failed to create project:', error)
    } finally {
      setIsCreating(false)
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setTitle(t('common.untitledPrefixZh'))
      setEngine('mermaid')
    }
    onOpenChange(newOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="rounded-2xl">
        <DialogHeader>
          <DialogTitle>{t('createDialog.title')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <label className="mb-2 block text-sm font-medium">{t('createDialog.nameLabel')}</label>
            <Input
              placeholder={t('createDialog.namePlaceholder')}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="rounded-xl"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">{t('createDialog.engineLabel')}</label>
            <div className="flex gap-2">
              {engines.map((e) => (
                <button
                  key={e.value}
                  onClick={() => setEngine(e.value)}
                  className={`flex-1 rounded-xl border p-3 text-sm transition-colors ${
                    engine === e.value
                      ? 'border-primary bg-primary text-surface'
                      : 'border-border bg-surface text-primary hover:border-primary'
                  }`}
                >
                  {e.label}
                </button>
              ))}
            </div>
          </div>
          {/* Tips 区域 */}
          <div className="rounded-xl bg-muted/50 p-3">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-primary">
              <span>💡</span>
              <span>{t('createDialog.tipsTitle', { engine: engines.find((e) => e.value === engine)?.label ?? engine })}</span>
            </div>
            <ul className="space-y-1 text-xs text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-primary">•</span>
                <span>{t(`engines.${engine}.feature1`)}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-primary">•</span>
                <span>{t(`engines.${engine}.feature2`)}</span>
              </li>
            </ul>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-full"
          >
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleCreate}
            disabled={isCreating}
            className="rounded-full bg-primary text-surface hover:bg-primary/90"
          >
            {isCreating ? t('common.creating') : t('common.create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
