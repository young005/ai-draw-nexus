import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { FileUp, FileText, Upload, Check } from 'lucide-react'
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Loading,
} from '@/components/ui'
import { useToast } from '@/hooks/useToast'
import { importDiagramAsProject } from '@/services/importService'
import {
  detectEngineFromFileName,
  looksLikeDiagramSource,
  IMPORTABLE_EXTENSIONS,
} from '@/lib/fileUtils'
import { getEngines } from '@/constants'
import type { EngineType } from '@/types'

interface ImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type ImportTab = 'file' | 'text'

export function ImportDialog({ open, onOpenChange }: ImportDialogProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { success, error: showError } = useToast()

  const [tab, setTab] = useState<ImportTab>('file')
  const [files, setFiles] = useState<File[]>([])
  const [textContent, setTextContent] = useState('')
  const [manualEngine, setManualEngine] = useState<EngineType | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const reset = () => {
    setTab('file')
    setFiles([])
    setTextContent('')
    setManualEngine(null)
  }

  const handleOpenChange = (next: boolean) => {
    if (!next) reset()
    onOpenChange(next)
  }

  // 文本输入时自动识别引擎，手动选择优先
  const detectedEngine = looksLikeDiagramSource(textContent)
  const textEngine = manualEngine ?? detectedEngine

  const handleFilesSelected = (fileList: FileList | null) => {
    if (!fileList) return
    setFiles(Array.from(fileList))
  }

  const handleImportFiles = async () => {
    if (files.length === 0) return

    setIsImporting(true)
    const succeeded: string[] = []
    const failed: string[] = []

    for (const file of files) {
      const engineType = detectEngineFromFileName(file.name)
      if (!engineType) {
        failed.push(file.name)
        continue
      }

      try {
        const content = await file.text()
        const result = await importDiagramAsProject({
          title: file.name.replace(/\.[^.]+$/, ''),
          engineType,
          content,
        })
        if (result.project) succeeded.push(file.name)
        else failed.push(file.name)
      } catch {
        failed.push(file.name)
      }
    }

    setIsImporting(false)
    setFiles([])

    if (succeeded.length > 0 && failed.length === 0) {
      success(t('importDialog.importSuccessToast', { successCount: succeeded.length, failureCount: 0 }))
    } else if (succeeded.length > 0) {
      success(
        t('importDialog.importPartialSuccessToast', {
          successCount: succeeded.length,
          failureCount: failed.length,
          totalCount: files.length,
          names: failed.join(', '),
        })
      )
    } else {
      showError(t('importDialog.importUnsupportedToast', { successCount: 0, failureCount: failed.length }))
    }

    if (succeeded.length > 0) {
      handleOpenChange(false)
      navigate('/projects')
    }
  }

  const handleImportText = async () => {
    const content = textContent.trim()
    if (!content) return

    setIsImporting(true)
    const engineType = textEngine
    if (!engineType) {
      setIsImporting(false)
      showError(t('importDialog.textImportFailureToast'))
      return
    }

    const result = await importDiagramAsProject({
      title: t('common.unnamed'),
      engineType,
      content,
    })

    setIsImporting(false)

    if (!result.project) {
      showError(result.error || t('importDialog.textImportFailureToast'))
      return
    }

    handleOpenChange(false)
    success(t('paste.imported'))
    navigate(`/editor/${result.project.id}`)
  }

  const selectedEngine = textEngine

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl rounded-2xl">
        <DialogHeader>
          <DialogTitle>{t('importDialog.title')}</DialogTitle>
          <DialogDescription>{t('importDialog.engineHint')}</DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {/* Tabs */}
          <div className="mb-4 flex gap-2">
            <button
              onClick={() => setTab('file')}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors ${
                tab === 'file'
                  ? 'border-primary bg-primary text-surface'
                  : 'border-border bg-surface text-muted hover:border-primary'
              }`}
            >
              <FileUp className="h-4 w-4" />
              {t('importDialog.fileUpload')}
            </button>
            <button
              onClick={() => setTab('text')}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors ${
                tab === 'text'
                  ? 'border-primary bg-primary text-surface'
                  : 'border-border bg-surface text-muted hover:border-primary'
              }`}
            >
              <FileText className="h-4 w-4" />
              {t('importDialog.textInput')}
            </button>
          </div>

          {tab === 'file' ? (
            <div className="space-y-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-background px-4 py-8 text-center transition-colors hover:border-primary"
              >
                <Upload className="h-6 w-6 text-muted" />
                <span className="text-sm text-primary">{t('importDialog.clickToSelect')}</span>
                <span className="text-xs text-muted">{t('importDialog.fileSupport')}</span>
              </button>

              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={IMPORTABLE_EXTENSIONS.join(',')}
                onChange={(e) => handleFilesSelected(e.target.files)}
                className="hidden"
              />

              {files.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs text-muted">
                    {t('importDialog.selectedCount', { count: files.length })}
                  </p>
                  {files.map((file, index) => {
                    const engine = detectEngineFromFileName(file.name)
                    return (
                      <div
                        key={`${file.name}-${index}`}
                        className="flex items-center justify-between border border-border bg-background px-3 py-2 text-sm"
                      >
                        <span className="truncate">{file.name}</span>
                        <span className="ml-2 shrink-0 text-xs text-muted">
                          {engine
                            ? engine.toUpperCase()
                            : t('importDialog.importFailureUnknown')}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}

              <p className="text-xs text-muted">{t('importDialog.fileEngineHint')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              <textarea
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                placeholder={t('importDialog.pasteCode')}
                rows={10}
                className="w-full resize-none border border-border bg-background p-3 font-mono text-xs outline-none focus:border-primary"
              />

              <div className="flex items-center gap-2 text-xs text-muted">
                {selectedEngine ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-success" />
                    <span>
                      {t('paste.detected', { engine: selectedEngine.toUpperCase() })}
                    </span>
                  </>
                ) : (
                  <span>{t('importDialog.engineHint')}</span>
                )}
              </div>

              {!selectedEngine && textContent.trim() && (
                <div className="flex gap-2">
                  {getEngines(t).map((engine) => (
                    <button
                      key={engine.value}
                      onClick={() => setManualEngine(engine.value)}
                      className="flex-1 rounded-lg border border-border bg-surface px-2 py-1.5 text-xs text-muted transition-colors hover:border-primary hover:text-primary"
                    >
                      {engine.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            className="rounded-full"
          >
            {t('common.cancel')}
          </Button>
          {tab === 'file' ? (
            <Button
              onClick={handleImportFiles}
              disabled={files.length === 0 || isImporting}
              className="rounded-full bg-primary text-surface hover:bg-primary/90"
            >
              {isImporting ? <Loading size="sm" /> : t('common.import')}
            </Button>
          ) : (
            <Button
              onClick={handleImportText}
              disabled={!textContent.trim() || isImporting}
              className="rounded-full bg-primary text-surface hover:bg-primary/90"
            >
              {isImporting ? <Loading size="sm" /> : t('common.import')}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
