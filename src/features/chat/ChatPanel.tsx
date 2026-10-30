import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Send,
  ImagePlus,
  FileText,
  User,
  Bot,
  X,
  MessageSquarePlus,
  Loader2,
  CheckCircle2,
  Link,
  MoveRight,
  Copy,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  PanelLeftClose,
} from 'lucide-react'
import { Button, Loading } from '@/components/ui'
import { useChatStore } from '@/stores/chatStore'
import { useEditorStore, selectIsEmpty } from '@/stores/editorStore'
import { useAIGenerate } from '@/hooks/useAIGenerate'
import { useToast } from '@/hooks/useToast'
import { aiService } from '@/services/aiService'
import { usePasteSource } from '@/hooks/usePasteSource'
import { PasteSourceBanner } from '@/features/project/PasteSourceBanner'
import {
  extractFilesFromClipboard,
  toAttachment,
  selectFiles,
  SUPPORTED_IMAGE_TYPES,
  SUPPORTED_DOCUMENT_EXTENSIONS,
} from '@/lib/fileUtils'
import type { Attachment, UrlAttachment } from '@/types'

interface ChatPanelProps {
  onCollapse?: () => void
}

export function ChatPanel({ onCollapse }: ChatPanelProps = {}) {
  const { t } = useTranslation()
  const [inputValue, setInputValue] = useState('')
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [isProcessingFile, setIsProcessingFile] = useState(false)
  const [showUrlInput, setShowUrlInput] = useState(false)
  const [urlInputValue, setUrlInputValue] = useState('')
  const [isParsingUrl, setIsParsingUrl] = useState(false)
  const [expandedCodes, setExpandedCodes] = useState<Record<string, boolean>>({})
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const hasHandledInitialPrompt = useRef(false)

  const { messages, isStreaming, initialPrompt, initialAttachments, clearInitialPrompt, clearMessages } = useChatStore()
  const isCanvasEmpty = useEditorStore(selectIsEmpty)
  const { generate, retry } = useAIGenerate()
  const { error: showError } = useToast()
  const { detected, detectFromEvent, importDetected, dismiss } = usePasteSource()

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Handle initial prompt from Quick Start (Path A)
  useEffect(() => {
    if (initialPrompt && !hasHandledInitialPrompt.current) {
      hasHandledInitialPrompt.current = true
      const attachmentsToSend = initialAttachments ?? undefined
      clearInitialPrompt()
      handleSend(initialPrompt, attachmentsToSend)
    }
  }, [initialPrompt, initialAttachments])

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px'
    }
  }, [inputValue])

  const handleImageUpload = async () => {
    const files = await selectFiles(SUPPORTED_IMAGE_TYPES.join(','))
    if (!files || files.length === 0) return
    await addFilesToAttachments(Array.from(files))
  }

  const handleDocumentUpload = async () => {
    const files = await selectFiles(SUPPORTED_DOCUMENT_EXTENSIONS.join(','))
    if (!files || files.length === 0) return
    await addFilesToAttachments(Array.from(files))
  }

  /**
   * 把文件转换成附件并加入附件列表
   */
  const addFilesToAttachments = async (files: File[]) => {
    setIsProcessingFile(true)
    try {
      const converted: Attachment[] = []
      for (const file of files) {
        const { attachment, error } = await toAttachment(file)
        if (error) {
          showError(error)
          continue
        }
        if (attachment) converted.push(attachment)
      }
      if (converted.length > 0) {
        setAttachments((prev) => [...prev, ...converted])
      }
    } catch (err) {
      showError(t('chat.imageProcessFailed'))
      console.error(err)
    } finally {
      setIsProcessingFile(false)
    }
  }

  /**
   * 粘贴处理：有文件则转成附件，纯文本则尝试识别为图表源码
   */
  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const files = extractFilesFromClipboard(e.nativeEvent)
    if (files.length > 0) {
      e.preventDefault()
      await addFilesToAttachments(files)
      return
    }
    detectFromEvent(e.nativeEvent)
  }

  const toggleCode = (id: string) => {
    setExpandedCodes((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const handleCopyMessage = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content)
    } catch (err) {
      showError(t('chat.copyFailed'))
      console.error(err)
    }
  }

  const lastAssistantId = [...messages].reverse().find((m) => m.role === 'assistant')?.id

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index))
  }

  const handleUrlSubmit = async () => {
    const url = urlInputValue.trim()
    if (!url) return

    setIsParsingUrl(true)
    try {
      const result = await aiService.parseUrl(url)
      if (result.data) {
        const urlAttachment: UrlAttachment = {
          type: 'url',
          content: result.data.content,
          url: result.data.url,
          title: result.data.title,
        }
        setAttachments((prev) => [...prev, urlAttachment])
        setUrlInputValue('')
        setShowUrlInput(false)
      }
    } catch (err) {
      showError(err instanceof Error ? err.message : t('chat.parseUrlFailed'))
      console.error(err)
    } finally {
      setIsParsingUrl(false)
    }
  }

  const handleSend = async (text?: string, initialAtts?: Attachment[]) => {
    const message = text || inputValue.trim()
    if ((!message && attachments.length === 0 && !initialAtts?.length) || isStreaming) return

    const currentAttachments = initialAtts ?? (attachments.length > 0 ? [...attachments] : undefined)
    setInputValue('')
    setAttachments([])
    await generate(message, isCanvasEmpty, currentAttachments)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // 获取AI消息的状态显示
  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'pending':
        return { text: t('chat.pending'), icon: <Loader2 className="h-4 w-4 animate-spin" /> }
      case 'streaming':
        return { text: t('chat.streaming'), icon: <Loader2 className="h-4 w-4 animate-spin" /> }
      case 'complete':
        return { text: t('chat.complete'), icon: <CheckCircle2 className="h-4 w-4 text-green-500" /> }
      case 'error':
        return { text: t('chat.error'), icon: <X className="h-4 w-4 text-red-500" /> }
      default:
        return { text: t('chat.fallbackStatus'), icon: <Loader2 className="h-4 w-4 animate-spin" /> }
    }
  }

  return (
    <div className="flex h-full flex-col bg-surface">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-1">
        <div>
          <h2 className="font-medium text-primary">{t('chat.title')}</h2>
          <p className="text-xs text-muted">
            {isCanvasEmpty ? t('chat.modeNew') : t('chat.modeEdit')}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {onCollapse && (
            <Button
              variant="ghost"
              size="icon"
              title={t('chat.collapsePanel')}
              onClick={onCollapse}
            >
              <PanelLeftClose className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            title={t('chat.newConversation')}
            onClick={clearMessages}
            disabled={isStreaming || messages.length === 0}
          >
            <MessageSquarePlus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center text-muted">
            <Bot className="mb-4 h-12 w-12 opacity-50" />
            <p className="text-sm">
              {t('chat.emptyHint')}
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`mb-4 flex items-start gap-1 ${
                msg.role === 'user' ? 'flex-row-reverse' : ''
              }`}
            >
              {/* Avatar */}
              <div
                className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl ${
                  msg.role === 'user'
                    ? 'bg-primary text-surface'
                    : 'border border-border bg-surface text-primary'
                }`}
              >
                {msg.role === 'user' ? (
                  <User className="h-4 w-4" />
                ) : (
                  <Bot className="h-4 w-4" />
                )}
              </div>

              <div className="flex min-w-0 flex-1 items-start gap-1">
                {/* 用户消息支持复制 */}
                {msg.role === 'user' && (
                  <Button
                    variant="ghost"
                    size="icon"
                    title={t('chat.copy')}
                    onClick={() => void handleCopyMessage(msg.content)}
                    disabled={!msg.content?.trim()}
                    className="mt-1 h-8 w-8 rounded-xl border border-border bg-surface p-0 shadow-sm"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                )}

                {/* Content */}
                <div
                  className={`min-w-0 max-w-[min(90%,42rem)] rounded-[20px] px-3 py-2 sm:px-4 ${
                    msg.role === 'user'
                      ? 'bg-primary text-surface shadow-sm'
                      : 'border border-border bg-surface text-primary shadow-sm'
                  }`}
                >
                  {/* Show attachments for user messages */}
                  {msg.role === 'user' && msg.attachments && msg.attachments.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-2">
                      {msg.attachments.map((att, idx) => (
                        <div key={idx} className="text-xs opacity-80">
                          {att.type === 'image' ? (
                            <img
                              src={att.dataUrl}
                              alt={att.fileName}
                              className="max-h-20 max-w-20 object-cover border border-surface/30"
                            />
                          ) : att.type === 'url' ? (
                            <span className="flex items-center gap-1">
                              <Link className="h-3 w-3" />
                              {att.title}
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <FileText className="h-3 w-3" />
                              {att.fileName}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {/* AI消息使用状态板显示 */}
                  {msg.role === 'assistant' ? (
                    <div className="flex flex-col gap-2">
                      <div className="flex min-w-0 items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2">
                          {getStatusDisplay(msg.status).icon}
                          <span className="truncate text-sm font-medium text-primary">
                            {getStatusDisplay(msg.status).text}
                          </span>
                        </div>
                        {msg.code && (
                          <Button
                            variant="ghost"
                            size="sm"
                            title={
                              expandedCodes[msg.id]
                                ? t('chat.collapseCode')
                                : t('chat.expandCode')
                            }
                            onClick={() => toggleCode(msg.id)}
                            className="h-8 shrink-0 rounded-xl border border-border bg-surface px-2 shadow-sm"
                          >
                            {expandedCodes[msg.id] ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                      </div>
                      {expandedCodes[msg.id] && msg.code && (
                        <div className="max-h-56 w-full overflow-auto rounded-[16px] border border-border bg-background p-3">
                          <pre className="whitespace-pre break-normal font-mono text-xs text-primary">
                            {msg.code}
                          </pre>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap text-sm leading-7">{msg.content}</p>
                  )}
                </div>

                {/* 最后一条助手消息支持重新发送 */}
                {msg.role === 'assistant' && msg.id === lastAssistantId && (
                  <Button
                    variant="ghost"
                    size="icon"
                    title={t('chat.retry')}
                    onClick={() => void retry(msg.id)}
                    disabled={isStreaming || msg.status === 'streaming' || msg.status === 'pending'}
                    className="mt-1 h-8 w-8 rounded-xl border border-border bg-surface p-0 shadow-sm"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Attachment Preview */}
      {attachments.length > 0 && (
        <div className="border-t border-border px-4 py-2">
          <div className="flex flex-wrap gap-2">
            {attachments.map((att, idx) => (
              <div
                key={idx}
                className="relative flex items-center gap-1 border border-border bg-background px-2 py-1 text-xs"
              >
                {att.type === 'image' ? (
                  <img
                    src={att.dataUrl}
                    alt={att.fileName}
                    className="h-8 w-8 object-cover"
                  />
                ) : att.type === 'url' ? (
                  <>
                    <Link className="h-3 w-3" />
                    <span className="max-w-24 truncate">{att.title}</span>
                  </>
                ) : (
                  <>
                    <FileText className="h-3 w-3" />
                    <span className="max-w-24 truncate">{att.fileName}</span>
                  </>
                )}
                <button
                  onClick={() => removeAttachment(idx)}
                  className="ml-1 text-muted hover:text-primary"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Input Area - 优化后的大输入框设计 */}
      <div className="border-t border-border p-4">
        {detected && (
          <div className="mb-2">
            <PasteSourceBanner
              engineType={detected.engineType}
              onImport={() => void importDetected()}
              onDismiss={dismiss}
            />
          </div>
        )}
        <div className="relative flex flex-col border border-border rounded-lg bg-background focus-within:border-primary transition-colors">
          {/* Textarea */}
          <textarea
            ref={textareaRef}
            placeholder={t('chat.inputPlaceholder')}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            disabled={isStreaming}
            rows={1}
            className="w-full resize-none bg-transparent px-4 pt-3 pb-12 text-sm outline-none placeholder:text-muted disabled:opacity-50"
            style={{ minHeight: '120px', maxHeight: '200px' }}
          />

          {/* URL Input - 行内输入框 */}
          {showUrlInput && (
            <div className="absolute left-0 right-0 bottom-40 flex items-center gap-2 z-10 bg-background p-2 rounded border border-border shadow-md">
              <input
                type="url"
                placeholder={t('home.urlPlaceholder')}
                value={urlInputValue}
                onChange={(e) => setUrlInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleUrlSubmit()
                  } else if (e.key === 'Escape') {
                    setShowUrlInput(false)
                    setUrlInputValue('')
                  }
                }}
                disabled={isParsingUrl}
                className="flex-1 border border-border rounded px-2 py-1 text-sm bg-surface outline-none focus:border-primary disabled:opacity-50"
                autoFocus
              />
              <Button
                size="sm"
                onClick={handleUrlSubmit}
                disabled={!urlInputValue.trim() || isParsingUrl}
                className="h-7"
              >
                <MoveRight className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowUrlInput(false)
                  setUrlInputValue('')
                }}
                disabled={isParsingUrl}
                className="h-7"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Bottom toolbar inside input */}
          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                title={t('chat.uploadImage')}
                onClick={handleImageUpload}
                disabled={isStreaming || isProcessingFile}
                className="h-8 w-8"
              >
                <ImagePlus className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                title={t('chat.uploadDocument')}
                onClick={handleDocumentUpload}
                disabled={isStreaming || isProcessingFile}
                className="h-8 w-8"
              >
                <FileText className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                title={t('chat.addUrl')}
                onClick={() => setShowUrlInput(!showUrlInput)}
                disabled={isStreaming || isProcessingFile || isParsingUrl}
                className="h-8 w-8"
              >
                <Link className="h-4 w-4" />
              </Button>
              {isProcessingFile && (
                <span className="flex items-center text-xs text-muted ml-2">
                  <Loading size="sm" className="mr-1" />
                  {t('chat.processing')}
                </span>
              )}
              {isParsingUrl && (
                <span className="flex items-center text-xs text-muted ml-2">
                  <Loading size="sm" className="mr-1" />
                  {t('chat.parsingUrl')}
                </span>
              )}
            </div>
            <Button
              onClick={() => handleSend()}
              disabled={(!inputValue.trim() && attachments.length === 0) || isStreaming}
              size="sm"
              className="h-8"
            >
              <Send className="h-4 w-4 mr-1" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
