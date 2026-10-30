import i18n from '@/i18n'
import { ProjectRepository } from './projectRepository'
import { VersionRepository } from './versionRepository'
import { validateContent } from '@/lib/validators'
import type { EngineType, Project } from '@/types'

export interface ImportResult {
  project?: Project
  error?: string
}

/**
 * 把一段图表源码导入为新项目（含首版版本记录）
 */
export async function importDiagramAsProject({
  title,
  engineType,
  content,
}: {
  title: string
  engineType: EngineType
  content: string
}): Promise<ImportResult> {
  const validation = await validateContent(content, engineType)
  if (!validation.valid) {
    return { error: validation.error || i18n.t('errors.unknownError') }
  }

  try {
    const project = await ProjectRepository.create({ title, engineType })
    await VersionRepository.create({
      projectId: project.id,
      content,
      changeSummary: i18n.t('ai.changeSummaryImport'),
    })
    return { project }
  } catch (error) {
    console.error('Failed to import diagram:', error)
    return { error: error instanceof Error ? error.message : i18n.t('errors.unknownError') }
  }
}
