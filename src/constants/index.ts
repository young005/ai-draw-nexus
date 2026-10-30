import {
  Home,
  User,
  GitBranch,
  Network,
  Workflow,
  Database,
  Users,
  ShoppingCart,
  FolderOpen,
  BookOpen,
  CassetteTape
} from 'lucide-react'
import type { TFunction } from 'i18next'
import type { EngineType } from '@/types'

export interface EngineOption {
  value: EngineType
  label: string
  description: string
}

export function getEngines(t: TFunction): EngineOption[] {
  return [
    { value: 'mermaid', label: t('engines.mermaid.label'), description: t('engines.mermaid.description') },
    { value: 'excalidraw', label: t('engines.excalidraw.label'), description: t('engines.excalidraw.description') },
    { value: 'drawio', label: t('engines.drawio.label'), description: t('engines.drawio.description') },
  ]
}

export function getNavItems(t: TFunction) {
  return [
    { icon: Home, label: t('nav.home'), path: '/' },
    { icon: FolderOpen, label: t('nav.projects'), path: '/projects' },
    { icon: User, label: t('nav.profile'), path: '/profile' },
    { icon: CassetteTape, label: t('nav.about'), path: '/about' },
  ]
}

export function getQuickActions(t: TFunction) {
  return [
    {
      label: t('quickActions.action1.label'),
      icon: GitBranch,
      engine: 'mermaid' as EngineType,
      prompt: t('quickActions.action1.prompt'),
    },
    {
      label: t('quickActions.action2.label'),
      icon: ShoppingCart,
      engine: 'drawio' as EngineType,
      prompt: t('quickActions.action2.prompt'),
    },
    {
      label: t('quickActions.action3.label'),
      icon: Network,
      engine: 'mermaid' as EngineType,
      prompt: t('quickActions.action3.prompt'),
    },
    {
      label: t('quickActions.action4.label'),
      icon: Workflow,
      engine: 'excalidraw' as EngineType,
      prompt: t('quickActions.action4.prompt'),
    },
    {
      label: t('quickActions.action5.label'),
      icon: Database,
      engine: 'mermaid' as EngineType,
      prompt: t('quickActions.action5.prompt'),
    },
    {
      label: t('quickActions.action6.label'),
      icon: Users,
      engine: 'drawio' as EngineType,
      prompt: t('quickActions.action6.prompt'),
    },
    {
      label: t('quickActions.action7.label'),
      icon: BookOpen,
      engine: 'excalidraw' as EngineType,
      prompt: t('quickActions.action7.prompt'),
    },
    {
      label: t('quickActions.action8.label'),
      icon: Workflow,
      engine: 'drawio' as EngineType,
      prompt: t('quickActions.action8.prompt'),
    },
  ]
}
