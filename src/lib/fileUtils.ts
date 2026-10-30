/**
 * File upload utilities for image and document handling
 */

import i18n from '@/i18n'
import type { Attachment, EngineType } from '@/types'

// Maximum file sizes (in bytes)
export const MAX_IMAGE_SIZE = 10 * 1024 * 1024 // 10MB
export const MAX_DOCUMENT_SIZE = 5 * 1024 * 1024 // 5MB

// Supported file types
export const SUPPORTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp']
export const SUPPORTED_DOCUMENT_TYPES = [
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'text/plain', // .txt
  'text/markdown', // .md
]
// 文件扩展名映射（用于处理某些浏览器不识别 MIME 类型的情况）
export const SUPPORTED_DOCUMENT_EXTENSIONS = ['.docx', '.txt', '.md']

/** 可导入的图表源码扩展名 → 引擎 */
export const EXT_ENGINE_MAP: Record<string, EngineType> = {
  '.mmd': 'mermaid',
  '.mermaid': 'mermaid',
  '.txt': 'mermaid',
  '.excalidraw': 'excalidraw',
  '.json': 'excalidraw',
  '.drawio': 'drawio',
  '.xml': 'drawio',
}

/** 引擎 → 导出文件扩展名 */
export const EXPORT_EXT_MAP: Record<EngineType, string> = {
  mermaid: '.mmd',
  excalidraw: '.excalidraw',
  drawio: '.drawio',
}

/** 可导入的图表源码扩展名列表 */
export const IMPORTABLE_EXTENSIONS = Object.keys(EXT_ENGINE_MAP)

/** Mermaid 图表类型关键字 */
const MERMAID_KEYWORDS =
  /^\s*(?:%%\{[\s\S]*?%%\s*)?(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|stateDiagram-v2|erDiagram|journey|gantt|pie|gitGraph|mindmap|timeline|quadrantChart|requirementDiagram|C4Context|C4Container|block-beta|architecture-beta|packet-beta|kanban|radar|treemap|sankey-beta|ZenUML)\b/m

export interface FileValidationResult {
  valid: boolean
  error?: string
}

/**
 * 验证图片文件
 */
export function validateImageFile(file: File): FileValidationResult {
  if (!SUPPORTED_IMAGE_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: i18n.t('errors.unsupportedImageType', { type: file.type }),
    }
  }

  if (file.size > MAX_IMAGE_SIZE) {
    return {
      valid: false,
      error: i18n.t('errors.imageTooLarge', { size: (file.size / 1024 / 1024).toFixed(2) }),
    }
  }

  return { valid: true }
}

/**
 * 获取文件扩展名
 */
export function getFileExtension(fileName: string): string {
  const lastDot = fileName.lastIndexOf('.')
  return lastDot >= 0 ? fileName.slice(lastDot).toLowerCase() : ''
}

/**
 * 验证文档文件
 */
export function validateDocumentFile(file: File): FileValidationResult {
  const extension = getFileExtension(file.name)
  const isValidType = SUPPORTED_DOCUMENT_TYPES.includes(file.type) ||
                      SUPPORTED_DOCUMENT_EXTENSIONS.includes(extension)

  if (!isValidType) {
    return {
      valid: false,
      error: i18n.t('errors.unsupportedDocumentType'),
    }
  }

  if (file.size > MAX_DOCUMENT_SIZE) {
    return {
      valid: false,
      error: i18n.t('errors.documentTooLarge', { size: (file.size / 1024 / 1024).toFixed(2) }),
    }
  }

  return { valid: true }
}

/**
 * Convert file to Base64 data URL
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      resolve(result)
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}

/**
 * Extract Base64 data from data URL
 * @param dataUrl - Full data URL (e.g., "data:image/png;base64,...")
 * @returns Just the base64 portion
 */
export function extractBase64FromDataUrl(dataUrl: string): string {
  const parts = dataUrl.split(',')
  return parts.length > 1 ? parts[1] : dataUrl
}

/**
 * Get MIME type from data URL
 */
export function getMimeTypeFromDataUrl(dataUrl: string): string {
  const match = dataUrl.match(/^data:([^;]+);/)
  return match ? match[1] : 'application/octet-stream'
}

/**
 * 解析 Word 文档
 */
export async function parseWordDocument(file: File): Promise<string> {
  const mammoth = await import('mammoth')
  const arrayBuffer = await file.arrayBuffer()
  const result = await mammoth.extractRawText({ arrayBuffer })
  return result.value
}

/**
 * 解析文本文件（txt、md）
 */
export async function parseTextFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      resolve(reader.result as string)
    }
    reader.onerror = () => reject(new Error(i18n.t('errors.readFileFailed')))
    reader.readAsText(file, 'utf-8')
  })
}

/**
 * 根据文件类型解析文档内容
 */
export async function parseDocument(file: File): Promise<string> {
  const extension = getFileExtension(file.name)

  if (extension === '.docx') {
    return parseWordDocument(file)
  } else if (extension === '.txt' || extension === '.md') {
    return parseTextFile(file)
  }

  // 根据 MIME 类型判断
  if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    return parseWordDocument(file)
  }

  // 默认当作文本文件处理
  return parseTextFile(file)
}

/**
 * Create an input element for file selection
 */
export function createFileInput(
  accept: string,
  multiple: boolean = false
): HTMLInputElement {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = accept
  input.multiple = multiple
  return input
}

/**
 * Open file picker and return selected files
 */
export function selectFiles(
  accept: string,
  multiple: boolean = false
): Promise<FileList | null> {
  return new Promise((resolve) => {
    const input = createFileInput(accept, multiple)
    input.onchange = () => {
      resolve(input.files)
    }
    input.click()
  })
}

/**
 * 从剪贴板事件中提取文件（截图、复制的文件等）
 */
export function extractFilesFromClipboard(event: ClipboardEvent): File[] {
  const items = event.clipboardData?.items
  if (!items) return []

  const files: File[] = []
  for (const item of Array.from(items)) {
    if (item.kind !== 'file') continue
    const file = item.getAsFile()
    if (file) files.push(file)
  }
  return files
}

/**
 * 从剪贴板事件中提取纯文本
 */
export function extractTextFromClipboard(event: ClipboardEvent): string {
  return event.clipboardData?.getData('text/plain') || ''
}

/**
 * 把上传/粘贴的文件转换成可发送给模型的附件
 */
export async function toAttachment(
  file: File
): Promise<{ attachment?: Attachment; error?: string }> {
  if (SUPPORTED_IMAGE_TYPES.includes(file.type)) {
    const validation = validateImageFile(file)
    if (!validation.valid) return { error: validation.error }
    return {
      attachment: {
        type: 'image',
        dataUrl: await fileToBase64(file),
        fileName: file.name || `pasted-image-${Date.now()}.png`,
      },
    }
  }

  const extension = getFileExtension(file.name)
  if (
    SUPPORTED_DOCUMENT_TYPES.includes(file.type) ||
    SUPPORTED_DOCUMENT_EXTENSIONS.includes(extension)
  ) {
    const validation = validateDocumentFile(file)
    if (!validation.valid) return { error: validation.error }
    return {
      attachment: {
        type: 'document',
        content: await parseDocument(file),
        fileName: file.name,
      },
    }
  }

  return { error: i18n.t('errors.unsupportedFileType', { type: file.type || extension }) }
}

/**
 * 根据文件名后缀推断图表引擎
 */
export function detectEngineFromFileName(fileName: string): EngineType | null {
  return EXT_ENGINE_MAP[getFileExtension(fileName)] ?? null
}

/**
 * 判断一段文本是否像图表源码，并返回对应引擎
 */
export function looksLikeDiagramSource(text: string): EngineType | null {
  const trimmed = text.trim()
  if (!trimmed) return null

  if (trimmed.includes('<mxGraphModel') || trimmed.includes('<mxfile')) {
    return 'drawio'
  }

  if (MERMAID_KEYWORDS.test(trimmed)) {
    return 'mermaid'
  }

  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed)
      const elements = Array.isArray(parsed) ? parsed : parsed?.elements
      if (Array.isArray(elements)) return 'excalidraw'
    } catch {
      // 不是合法 JSON，继续按普通文本处理
    }
  }

  return null
}
