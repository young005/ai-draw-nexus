import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Plus, Trash2, Sparkles, Pencil, Upload } from 'lucide-react'
import {
  Button,
  Input,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Loading,
} from '@/components/ui'
import { AppSidebar, AppHeader, CreateProjectDialog } from '@/components/layout'
import { ImportDialog } from '@/features/project/ImportDialog'
import { formatDate } from '@/lib/utils'
import type { Project } from '@/types'
import { ProjectRepository } from '@/services/projectRepository'

export function ProjectsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Create dialog state
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)

  // Import dialog state
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)

  // Delete dialog state
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Rename dialog state
  const [renameTarget, setRenameTarget] = useState<Project | null>(null)
  const [newTitle, setNewTitle] = useState('')
  const [isRenaming, setIsRenaming] = useState(false)

  // Load projects
  useEffect(() => {
    loadProjects()
  }, [])

  // Open create dialog if navigated with state
  useEffect(() => {
    if (location.state?.openCreateDialog) {
      setIsCreateDialogOpen(true)
      // Clear the state to prevent reopening on refresh
      navigate(location.pathname, { replace: true, state: {} })
    }
  }, [location.state])

  const loadProjects = async () => {
    setIsLoading(true)
    try {
      const data = await ProjectRepository.getAll()
      setProjects(data)
    } catch (error) {
      console.error('Failed to load projects:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return

    setIsDeleting(true)
    try {
      await ProjectRepository.delete(deleteTarget.id)
      setDeleteTarget(null)
      loadProjects()
    } catch (error) {
      console.error('Failed to delete project:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleRename = async () => {
    if (!renameTarget || !newTitle.trim()) return

    setIsRenaming(true)
    try {
      await ProjectRepository.update(renameTarget.id, { title: newTitle.trim() })
      setRenameTarget(null)
      setNewTitle('')
      loadProjects()
    } catch (error) {
      console.error('Failed to rename project:', error)
    } finally {
      setIsRenaming(false)
    }
  }

  const openRenameDialog = (project: Project) => {
    setRenameTarget(project)
    setNewTitle(project.title)
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Floating Sidebar Navigation */}
      <AppSidebar onCreateProject={() => setIsCreateDialogOpen(true)} />

      {/* Main Content */}
      <main className="flex flex-1 flex-col">
        {/* Header */}
        <AppHeader />

        {/* Page Content */}
        <div className="flex-1 px-8 py-6">
          <div className="mx-auto max-w-7xl">
            {/* Page Title & Actions */}
            <div className="mb-8 flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-primary">{t('projects.title')}</h1>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setIsImportDialogOpen(true)}
                  variant="outline"
                  className="rounded-full"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {t('projects.importProject')}
                </Button>
                <Button
                  onClick={() => setIsCreateDialogOpen(true)}
                  className="rounded-full bg-primary px-6 text-surface hover:bg-primary/90"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {t('projects.newProject')}
                </Button>
              </div>
            </div>

            {/* Projects Grid */}
            {isLoading ? (
              <div className="flex h-64 items-center justify-center">
                <Loading size="lg" />
              </div>
            ) : projects.length === 0 ? (
              <div className="flex h-64 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-surface">
                <Sparkles className="mb-4 h-12 w-12 text-muted" />
                <p className="mb-4 text-muted">{t('projects.empty')}</p>
                <Button
                  onClick={() => setIsCreateDialogOpen(true)}
                  className="rounded-full bg-primary px-6 text-surface hover:bg-primary/90"
                >
                  {t('projects.createFirst')}
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {/* New Project Card */}
                <button
                  onClick={() => setIsCreateDialogOpen(true)}
                  className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-surface transition-all hover:border-primary hover:shadow-md"
                  style={{ height: 'calc(8rem + 68px)' }}
                >
                  <Plus className="mb-2 h-6 w-6 text-muted" />
                  <span className="text-sm text-muted">{t('projects.newProject')}</span>
                </button>

                {/* Project Cards */}
                {projects.map((project) => (
                  <div
                    key={project.id}
                    className="group relative cursor-pointer overflow-hidden rounded-xl border border-border bg-surface transition-all hover:border-primary hover:shadow-md"
                    onClick={() => navigate(`/editor/${project.id}`)}
                  >
                    {/* Action Buttons - 右上角 */}
                    <div className="absolute right-2 top-2 z-10 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 bg-surface/80 backdrop-blur-sm hover:bg-surface"
                        onClick={(e) => {
                          e.stopPropagation()
                          openRenameDialog(project)
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 bg-surface/80 text-red-600 backdrop-blur-sm hover:bg-surface hover:text-red-700"
                        onClick={(e) => {
                          e.stopPropagation()
                          setDeleteTarget(project)
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    {/* Thumbnail - 固定高度 */}
                    <div className="flex h-32 items-center justify-center bg-background">
                      {project.thumbnail ? (
                        <img
                          src={project.thumbnail}
                          alt={project.title}
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <Sparkles className="h-8 w-8 text-muted" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="p-3">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate text-sm font-medium text-primary">
                          {project.title}
                        </h3>
                        <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                          project.engineType === 'excalidraw'
                            ? 'bg-blue-100 text-blue-700'
                            : project.engineType === 'drawio'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-purple-100 text-purple-700'
                        }`}>
                          {project.engineType.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-xs text-muted">
                        {t('projects.updatedAt', { date: formatDate(project.updatedAt) })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Create Dialog */}
      <CreateProjectDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />

      {/* Import Dialog */}
      <ImportDialog
        open={isImportDialogOpen}
        onOpenChange={setIsImportDialogOpen}
      />

      {/* Rename Dialog */}
      <Dialog open={!!renameTarget} onOpenChange={() => setRenameTarget(null)}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>{t('projects.renameTitle')}</DialogTitle>
          </DialogHeader>
          <Input
            className='my-4'
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder={t('common.projectName')}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRename()
            }}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRenameTarget(null)}
              className="rounded-full"
            >
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleRename}
              disabled={isRenaming || !newTitle.trim()}
              className="rounded-full bg-primary text-surface hover:bg-primary/90"
            >
              {isRenaming ? t('common.saving') : t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>{t('projects.deleteTitle')}</DialogTitle>
            <DialogDescription className='my-4'>
              {t('projects.deleteConfirm', { title: deleteTarget?.title ?? '' })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              className="rounded-full"
            >
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleDelete}
              disabled={isDeleting}
              className="rounded-full bg-red-600 text-surface hover:bg-red-700"
            >
              {isDeleting ? t('common.deleting') : t('common.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
