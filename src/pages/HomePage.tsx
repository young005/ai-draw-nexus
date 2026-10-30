import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Send,
  Link,
  X,
  MoveRight,
  Plus,
  ArrowRight,
  Paperclip,
  FileText,
  ImageIcon,
} from 'lucide-react'
import { Button, Loading } from '@/components/ui'
import { AppSidebar, AppHeader, CreateProjectDialog } from '@/components/layout'
import { getEngines, getQuickActions } from '@/constants'
import { formatDate } from '@/lib/utils'
import type { EngineType, Project, UrlAttachment, Attachment } from '@/types'
import { ProjectRepository } from '@/services/projectRepository'
import { useChatStore } from '@/stores/chatStore'
import { aiService } from '@/services/aiService'
import { useToast } from '@/hooks/useToast'
import { usePasteSource } from '@/hooks/usePasteSource'
import { PasteSourceBanner } from '@/features/project/PasteSourceBanner'
import {
  extractFilesFromClipboard,
  toAttachment,
  SUPPORTED_IMAGE_TYPES,
  SUPPORTED_DOCUMENT_EXTENSIONS,
} from '@/lib/fileUtils'

/** 引擎对应的圆点颜色 */
const ENGINE_DOT_CLASS: Record<EngineType, string> = {
  mermaid: 'bg-brand',
  excalidraw: 'bg-warning',
  drawio: 'bg-success',
}

/** 引擎对应的标签样式 */
const ENGINE_BADGE_CLASS: Record<EngineType, string> = {
  mermaid: 'bg-brand-soft text-brand',
  excalidraw: 'bg-warning-soft text-warning',
  drawio: 'bg-success-soft text-success',
}

export function HomePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [prompt, setPrompt] = useState('')
  const [selectedEngine, setSelectedEngine] = useState<EngineType>('mermaid')
  const [isLoading, setIsLoading] = useState(false)
  const [recentProjects, setRecentProjects] = useState<Project[]>([])
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [showUrlInput, setShowUrlInput] = useState(false)
  const [urlInputValue, setUrlInputValue] = useState('')
  const [isParsingUrl, setIsParsingUrl] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const setInitialPrompt = useChatStore((state) => state.setInitialPrompt)
  const { error: showError } = useToast()
  const { detected, detectFromEvent, importDetected, dismiss } = usePasteSource()

  // 新建项目弹窗状态
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)

  useEffect(() => {
    loadRecentProjects()
  }, [])

  const loadRecentProjects = async () => {
    try {
      const projects = await ProjectRepository.getAll()
      setRecentProjects(projects.slice(0, 5))
    } catch (error) {
      console.error('Failed to load projects:', error)
    }
  }

  const handleQuickStart = async () => {
    if (!prompt.trim()) return

    setIsLoading(true)
    try {
      const project = await ProjectRepository.create({
        title: `${t('common.untitledPrefix')}-${Date.now()}`,
        engineType: selectedEngine,
      })

      const allAttachments = attachments.length > 0 ? [...attachments] : null
      setInitialPrompt(prompt.trim(), allAttachments)
      navigate(`/editor/${project.id}`)
    } catch (error) {
      console.error('Failed to create project:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleQuickStart()
    }
  }

  const handleQuickAction = (action: ReturnType<typeof getQuickActions>[0]) => {
    setSelectedEngine(action.engine)
    setPrompt(action.prompt)
    textareaRef.current?.focus()
  }

  const handleAttachmentClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    await addFilesToAttachments(Array.from(files))
    // 允许再次选择同一文件
    e.target.value = ''
  }

  /**
   * 把文件转换成附件并加入附件列表
   */
  const addFilesToAttachments = async (files: File[]) => {
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
      setAttachments(prev => [...prev, ...converted])
    }
  }

  /**
   * 粘贴处理：有文件则转成附件，纯文本则尝试识别为图表源码
   */
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const files = extractFilesFromClipboard(e.nativeEvent)
    if (files.length > 0) {
      e.preventDefault()
      void addFilesToAttachments(files)
      return
    }
    detectFromEvent(e.nativeEvent)
  }

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index))
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
        setAttachments(prev => [...prev, urlAttachment])
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

  const engines = getEngines(t)
  const quickActions = getQuickActions(t)

  return (
    <div className="app-shell flex min-h-screen">
      {/* Floating Sidebar Navigation */}
      <AppSidebar onCreateProject={() => setIsCreateDialogOpen(true)} />

      <main id="app-main" className="app-main flex flex-1 flex-col">
        <AppHeader />

        <div className="page-body">
          <div className="page-frame flex flex-col gap-8 sm:gap-10">
            {/* Hero */}
            <section className="px-1 pt-4">
              <div className="relative mx-auto max-w-[56rem] px-2 py-5 text-center sm:px-4 sm:py-8">
                <div className="pointer-events-none absolute left-1/2 top-0 h-28 w-[min(32rem,100vw)] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(56,189,248,0.15),transparent_70%)] blur-3xl sm:h-32" />
                <div className="relative mt-2 flex flex-col items-center gap-6">
                  <h1
                    className="max-w-[16ch] bg-gradient-to-br from-slate-900 via-slate-700 to-slate-500 bg-clip-text pb-2 text-center text-4xl font-extrabold tracking-tight text-transparent sm:text-5xl md:text-6xl"
                    // 文案来自本地静态语言包，其中包含渐变高亮标记
                    dangerouslySetInnerHTML={{ __html: t('home.heroTitle') }}
                  />
                  <div className="flex flex-wrap justify-center gap-2.5">
                    <span className="chip">
                      <FileText className="h-3.5 w-3.5 text-muted" />
                      {t('home.supportDocs')}
                    </span>
                    <span className="chip">
                      <ImageIcon className="h-3.5 w-3.5 text-muted" />
                      {t('home.supportImage')}
                    </span>
                    <span className="chip">
                      <Link className="h-3.5 w-3.5 text-muted" />
                      {t('home.supportUrl')}
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* Composer */}
            <section className="px-1">
              <div className="mx-auto flex max-w-[58rem] flex-col gap-4">
                <div className="relative overflow-hidden rounded-[28px] border border-white/60 bg-white/70 p-4 shadow-[0_20px_40px_rgba(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.02)] backdrop-blur-xl sm:rounded-[36px] sm:p-6 lg:p-8">
                  <div className="pointer-events-none absolute inset-x-8 top-0 h-24 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.05),transparent_72%)]" />

                  {/* 粘贴源码提示 */}
                  {detected && (
                    <div className="relative mb-4">
                      <PasteSourceBanner
                        engineType={detected.engineType}
                        onImport={() => void importDetected()}
                        onDismiss={dismiss}
                      />
                    </div>
                  )}

                  {/* 附件预览 */}
                  {attachments.length > 0 && (
                    <div className="relative mb-4 flex flex-wrap gap-2">
                      {attachments.map((att, index) => (
                        <div
                          key={`${att.type}-${index}`}
                          className="chip border border-slate-200/50 bg-slate-100/80 pr-2 text-slate-700 shadow-sm backdrop-blur-sm"
                        >
                          {att.type === 'image' ? (
                            <Paperclip className="h-3.5 w-3.5 text-muted" />
                          ) : att.type === 'url' ? (
                            <Link className="h-3.5 w-3.5 text-muted" />
                          ) : (
                            <Paperclip className="h-3.5 w-3.5 text-muted" />
                          )}
                          <span className="max-w-[min(180px,62vw)] truncate text-sm">
                            {att.type === 'url' ? att.title : att.fileName}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeAttachment(index)}
                            aria-label={t('common.cancel')}
                            className="rounded-full p-1 text-muted transition-colors hover:bg-[rgba(24,32,44,0.06)] hover:text-primary"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="relative">
                    <textarea
                      ref={textareaRef}
                      placeholder={t('home.placeholder')}
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      onKeyDown={handleKeyDown}
                      onPaste={handlePaste}
                      disabled={isLoading}
                      rows={6}
                      className="min-h-[11rem] w-full resize-none bg-transparent pb-24 text-[1rem] leading-7 text-primary placeholder:text-muted focus:outline-none sm:min-h-[12rem] sm:pb-[4.5rem]"
                    />
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-white/90 via-white/50 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 flex flex-col items-stretch gap-2 px-1 py-1.5 sm:flex-row sm:items-end sm:justify-between sm:px-0 sm:py-0">
                      <p className="pb-0 text-xs leading-5 text-muted sm:pb-2">
                        {t('home.shortcutHint')}
                      </p>
                      <Button
                        onClick={handleQuickStart}
                        disabled={!prompt.trim() || isLoading}
                        className="h-11 rounded-[16px] bg-slate-900 px-6 text-white shadow-[0_8px_20px_rgba(15,23,42,0.15)] transition-all hover:-translate-y-0.5 hover:bg-slate-800 sm:w-auto"
                      >
                        {isLoading ? (
                          <span>{t('home.creatingProject')}</span>
                        ) : (
                          <>
                            <Send className="h-4 w-4" />
                            <span>{t('home.send')}</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* 链接输入 */}
                  {showUrlInput && (
                    <div className="mt-4 flex flex-col gap-2 rounded-[22px] border border-slate-200/50 bg-white/80 p-3 shadow-sm backdrop-blur sm:flex-row sm:items-center">
                      <input
                        type="url"
                        placeholder={t('home.urlPlaceholder')}
                        value={urlInputValue}
                        onChange={(e) => setUrlInputValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            void handleUrlSubmit()
                          } else if (e.key === 'Escape') {
                            setShowUrlInput(false)
                            setUrlInputValue('')
                          }
                        }}
                        disabled={isParsingUrl}
                        autoFocus
                        className="h-[2.625rem] flex-1 rounded-[16px] border border-transparent bg-surface-raised px-4 text-sm text-primary outline-none transition-[border-color,box-shadow] focus:border-brand focus:ring-2 focus:ring-brand disabled:opacity-50"
                      />
                      <div className="flex gap-2 sm:flex-none">
                        <Button
                          size="sm"
                          onClick={handleUrlSubmit}
                          disabled={!urlInputValue.trim() || isParsingUrl}
                          className="h-[2.625rem] flex-1 px-3 sm:flex-none"
                        >
                          {isParsingUrl ? <Loading size="sm" /> : <MoveRight className="h-4 w-4" />}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setShowUrlInput(false)
                            setUrlInputValue('')
                          }}
                          disabled={isParsingUrl}
                          className="h-[2.625rem] flex-1 px-3 sm:flex-none"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* 引擎选择 + 工具 */}
                  <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex flex-wrap items-center gap-2">
                      {engines.map((engine) => (
                        <button
                          key={engine.value}
                          type="button"
                          aria-pressed={selectedEngine === engine.value}
                          onClick={() => setSelectedEngine(engine.value)}
                          className={`chip min-h-[2.625rem] border border-slate-200/50 bg-slate-50/50 text-slate-500 shadow-sm transition-[background-color,box-shadow,color,transform] duration-200 hover:-translate-y-0.5 hover:bg-white hover:text-slate-800 hover:shadow-md ${
                            selectedEngine === engine.value
                              ? 'border-slate-300 bg-white text-slate-900 shadow-[0_8px_16px_rgba(0,0,0,0.06)] ring-1 ring-slate-900/5'
                              : ''
                          }`}
                        >
                          <span className={`h-2.5 w-2.5 rounded-full ${ENGINE_DOT_CLASS[engine.value]}`} />
                          {engine.label}
                        </button>
                      ))}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                      <button
                        type="button"
                        onClick={handleAttachmentClick}
                        title={t('home.uploadAttachmentTip')}
                        className="chip border border-slate-200/60 bg-white/60 text-slate-600 shadow-sm backdrop-blur-md transition-all hover:bg-white hover:text-slate-900 hover:shadow"
                      >
                        <Paperclip className="h-4 w-4" />
                        <span>{t('home.uploadAttachment')}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowUrlInput(!showUrlInput)}
                        disabled={isParsingUrl}
                        title={t('home.addLinkTip')}
                        className="chip border border-slate-200/60 bg-white/60 text-slate-600 shadow-sm backdrop-blur-md transition-all hover:bg-white hover:text-slate-900 hover:shadow disabled:opacity-50"
                      >
                        <Link className="h-4 w-4" />
                        <span>{t('home.addLink')}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* 隐藏的文件输入 */}
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                  accept={[...SUPPORTED_IMAGE_TYPES, ...SUPPORTED_DOCUMENT_EXTENSIONS].join(',')}
                />
              </div>
            </section>

            {/* 快捷用例 */}
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {quickActions.map((action, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleQuickAction(action)}
                    disabled={isLoading}
                    className="group rounded-[22px] border border-white/60 bg-white/70 p-4 text-left shadow-[0_12px_24px_rgba(0,0,0,0.03)] backdrop-blur-lg transition-[transform,box-shadow,background-color] duration-200 hover:-translate-y-1 hover:bg-white/90 hover:shadow-[0_16px_32px_rgba(0,0,0,0.06)] disabled:opacity-50 sm:rounded-[24px] sm:p-5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-[14px] border border-slate-200/50 bg-slate-100/80 text-slate-700 shadow-sm">
                        <action.icon className="h-[1.125rem] w-[1.125rem]" />
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] ${ENGINE_BADGE_CLASS[action.engine]}`}
                      >
                        {engines.find((e) => e.value === action.engine)?.label ?? action.engine}
                      </span>
                    </div>
                    <p className="mt-4 line-clamp-2 text-sm font-semibold leading-6 text-primary">
                      {action.label}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* 最近项目 */}
            <section className="px-1">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <h2 className="text-[1.9rem] font-semibold tracking-[-0.04em] text-primary">
                  {t('home.recentProjects')}
                </h2>
                <div className="flex flex-wrap gap-3">
                  <Button variant="outline" onClick={() => navigate('/projects')}>
                    {t('home.openProjects')}
                  </Button>
                  <Button onClick={() => setIsCreateDialogOpen(true)}>
                    <Plus className="h-4 w-4" />
                    {t('projects.newProject')}
                  </Button>
                </div>
              </div>

              {recentProjects.length === 0 ? (
                <div className="mt-6 space-y-4">
                  <div className="grid gap-4 md:grid-cols-3">
                    {engines.map((engine, index) => (
                      <div
                        key={engine.value}
                        className={`group relative aspect-[4/3] overflow-hidden rounded-[30px] border border-slate-100 bg-white shadow-[0_16px_30px_rgba(0,0,0,0.03)] ${
                          index === 1 ? 'md:translate-y-4' : ''
                        }`}
                      >
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(94,71,54,0.08),transparent_55%),linear-gradient(180deg,rgba(255,255,255,0.18),transparent)]" />
                        <div className="absolute inset-[7%] rounded-[24px] bg-[rgba(255,255,255,0.9)] shadow-[0_14px_28px_rgba(24,32,44,0.08)]" />
                        <div className="absolute inset-[12%] flex flex-col gap-3">
                          <div className="flex items-center gap-2">
                            <span className={`h-2.5 w-2.5 rounded-full ${ENGINE_DOT_CLASS[engine.value]}`} />
                            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-secondary">
                              {engine.label}
                            </span>
                          </div>
                          <div className="h-10 rounded-[14px] bg-[rgba(24,32,44,0.06)]" />
                          <div className="grid flex-1 grid-cols-2 gap-3">
                            <div className="rounded-[16px] bg-[rgba(24,32,44,0.05)]" />
                            <div className="rounded-[16px] bg-[rgba(24,32,44,0.05)]" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm font-medium text-secondary">
                      {t('home.noRecentProjectsTitle')}
                    </p>
                    <Button onClick={() => setIsCreateDialogOpen(true)}>
                      <Plus className="h-4 w-4" />
                      {t('projects.newProject')}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {recentProjects.map((project) => (
                    <button
                      key={project.id}
                      type="button"
                      onClick={() => navigate(`/editor/${project.id}`)}
                      className="group overflow-hidden rounded-[30px] text-left shadow-[0_16px_32px_rgba(0,0,0,0.04)] ring-1 ring-slate-200/50 transition-[transform,box-shadow] duration-200 hover:-translate-y-1 hover:shadow-[0_24px_48px_rgba(0,0,0,0.08)]"
                    >
                      <div className="relative aspect-[4/3] overflow-hidden rounded-[30px] bg-slate-50">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.04),transparent_52%)]" />
                        {project.thumbnail ? (
                          <img
                            src={project.thumbnail}
                            alt={project.title}
                            className="relative z-10 h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                          />
                        ) : (
                          <div className="relative z-10 flex h-full w-full items-center justify-center">
                            <div className="absolute inset-[7%] rounded-[24px] bg-[rgba(255,255,255,0.92)] shadow-[0_14px_28px_rgba(24,32,44,0.08)]" />
                            <div className="absolute inset-[11%] flex flex-col gap-4">
                              <div className="flex items-center gap-2">
                                <span className={`h-2.5 w-2.5 rounded-full ${ENGINE_DOT_CLASS[project.engineType]}`} />
                                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-secondary">
                                  {project.engineType}
                                </span>
                              </div>
                              <div className="h-10 rounded-[14px] bg-[rgba(24,32,44,0.06)]" />
                              <div className="grid flex-1 grid-cols-2 gap-3">
                                <div className="rounded-[18px] bg-[rgba(24,32,44,0.05)]" />
                                <div className="rounded-[18px] bg-[rgba(24,32,44,0.05)]" />
                              </div>
                            </div>
                          </div>
                        )}
                        <span
                          className={`absolute right-4 top-4 z-20 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] ${ENGINE_BADGE_CLASS[project.engineType]}`}
                        >
                          {project.engineType}
                        </span>
                        <div className="absolute inset-x-0 bottom-0 z-20 bg-[linear-gradient(180deg,rgba(24,32,44,0),rgba(24,32,44,0.72))] px-5 pb-5 pt-12">
                          <div className="min-w-0">
                            <p className="text-xs font-medium uppercase tracking-[0.16em] text-[rgba(255,245,232,0.72)]">
                              {t('home.updatedAt', { date: formatDate(project.updatedAt) })}
                            </p>
                            <p className="mt-2 line-clamp-2 text-[1.05rem] font-semibold leading-7 text-[rgba(255,250,244,0.98)]">
                              {project.title.startsWith(`${t('common.untitledPrefix')}-`) ||
                              project.title.startsWith(`${t('common.untitledPrefixZh')}-`)
                                ? t('common.unnamed')
                                : project.title}
                            </p>
                          </div>
                        </div>
                        <div className="absolute bottom-5 right-5 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-slate-900 shadow-[0_8px_16px_rgba(0,0,0,0.1)] backdrop-blur-sm transition-transform duration-200 group-hover:translate-x-0.5">
                          <span className="sr-only">{project.title}</span>
                          <ArrowRight className="h-4 w-4" />
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      </main>

      {/* Create Project Dialog */}
      <CreateProjectDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />
    </div>
  )
}
