import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Editor from '@monaco-editor/react'
import { Check, Copy, Play, Undo2, X } from 'lucide-react'
import { Button } from '@/components/ui'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/Tooltip'
import { cn } from '@/lib/utils'

export type SourceLanguage = 'mermaid' | 'xml' | 'json'

interface SourceCodePanelProps {
  code: string
  language: SourceLanguage
  title: string
  onApply: (code: string) => void
  onClose: () => void
  className?: string
}

/**
 * 引擎共用的源码面板：查看 / 编辑 / 复制 / 重置 / 应用
 */
export function SourceCodePanel({
  code,
  language,
  title,
  onApply,
  onClose,
  className,
}: SourceCodePanelProps) {
  const { t } = useTranslation()
  const [editedCode, setEditedCode] = useState(code)
  const [hasChanges, setHasChanges] = useState(false)
  const [copied, setCopied] = useState(false)
  const [syncedCode, setSyncedCode] = useState(code)

  // 外部代码变化时同步（例如 AI 重新生成）
  if (code !== syncedCode) {
    setSyncedCode(code)
    setEditedCode(code)
    setHasChanges(false)
  }

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(editedCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy code:', error)
    }
  }, [editedCode])

  const handleReset = useCallback(() => {
    setEditedCode(code)
    setHasChanges(false)
  }, [code])

  const handleApply = useCallback(() => {
    if (!editedCode.trim() || !hasChanges) return
    onApply(editedCode)
    setHasChanges(false)
  }, [editedCode, hasChanges, onApply])

  return (
    <div
      className={cn(
        'absolute bottom-4 right-4 z-10 flex max-h-[70%] w-96 flex-col overflow-hidden rounded-3xl border border-white/60 bg-white/80 shadow-[0_24px_48px_rgba(0,0,0,0.12)] backdrop-blur-xl',
        className
      )}
    >
      <div className="flex items-center justify-between border-b border-white/60 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-800">{title}</span>
          {hasChanges && (
            <span className="text-xs text-orange-500">{t('sourceCodePanel.unsaved')}</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                className="h-8 w-8 rounded-xl border border-slate-200/60 bg-white/60 p-0 shadow-sm backdrop-blur-sm hover:bg-white hover:shadow"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-success" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {copied ? t('sourceCodePanel.copied') : t('sourceCodePanel.copyCode')}
            </TooltipContent>
          </Tooltip>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 rounded-xl border border-slate-200/60 bg-white/60 p-0 shadow-sm backdrop-blur-sm hover:bg-white hover:shadow"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto bg-white/50 backdrop-blur-sm" style={{ height: '300px' }}>
        <Editor
          height="300px"
          defaultLanguage={language}
          value={editedCode}
          onChange={(value) => {
            setEditedCode(value ?? '')
            setHasChanges((value ?? '') !== code)
          }}
          theme="vs"
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            automaticLayout: true,
            tabSize: 2,
            padding: { top: 8, bottom: 8 },
            scrollbar: {
              verticalScrollbarSize: 8,
              horizontalScrollbarSize: 8,
            },
          }}
        />
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-white/60 px-4 py-3">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              disabled={!hasChanges}
              className="h-9 gap-1.5 rounded-xl border border-slate-200/60 bg-white/60 px-3 shadow-sm backdrop-blur-sm hover:bg-white hover:shadow"
            >
              <Undo2 className="h-3.5 w-3.5" />
              <span className="text-xs">{t('sourceCodePanel.reset')}</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('sourceCodePanel.resetTooltip')}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="default"
              size="sm"
              onClick={handleApply}
              disabled={!hasChanges || !editedCode.trim()}
              className="h-9 gap-1.5 rounded-xl px-3"
            >
              <Play className="h-3.5 w-3.5" />
              <span className="text-xs">{t('sourceCodePanel.apply')}</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('sourceCodePanel.applyTooltip')}</TooltipContent>
        </Tooltip>
      </div>
    </div>
  )
}
