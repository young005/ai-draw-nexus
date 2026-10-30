import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { extractTextFromClipboard, looksLikeDiagramSource } from '@/lib/fileUtils'
import { importDiagramAsProject } from '@/services/importService'
import { useToast } from '@/hooks/useToast'
import type { EngineType } from '@/types'

export interface DetectedSource {
  content: string
  engineType: EngineType
}

/**
 * 粘贴文本时识别图表源码，并提供「导入为新项目」的能力
 */
export function usePasteSource() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { success, error: showError } = useToast()
  const [detected, setDetected] = useState<DetectedSource | null>(null)

  /**
   * 从剪贴板事件中检测图表源码。命中则拦截默认行为并记录，返回是否命中。
   */
  const detectFromEvent = (event: ClipboardEvent): boolean => {
    const text = extractTextFromClipboard(event)
    if (!text.trim()) return false

    const engineType = looksLikeDiagramSource(text)
    if (!engineType) return false

    event.preventDefault()
    setDetected({ content: text, engineType })
    return true
  }

  const importDetected = async () => {
    if (!detected) return

    const result = await importDiagramAsProject({
      title: t('common.unnamed'),
      engineType: detected.engineType,
      content: detected.content,
    })

    if (!result.project) {
      showError(result.error || t('paste.failed'))
      return
    }

    setDetected(null)
    success(t('paste.imported'))
    navigate(`/editor/${result.project.id}`)
  }

  const dismiss = () => setDetected(null)

  return { detected, detectFromEvent, importDetected, dismiss }
}
