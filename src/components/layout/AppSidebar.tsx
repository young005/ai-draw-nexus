import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Plus } from 'lucide-react'
import { getNavItems } from '@/constants'

interface AppSidebarProps {
  onCreateProject?: () => void
}

export function AppSidebar({ onCreateProject }: AppSidebarProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <aside className="fixed left-4 top-1/2 z-40 flex -translate-y-1/2 flex-col items-center rounded-2xl border border-border bg-surface p-2 shadow-lg">
      {/* New Project Button */}
      <button
        onClick={onCreateProject}
        className="mb-3 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface transition-all hover:border-primary hover:shadow-md"
      >
        <Plus className="h-5 w-5 text-primary" />
      </button>

      {/* Divider */}
      <div className="mb-3 h-px w-8 bg-border" />

      {/* Navigation Items */}
      <nav className="flex flex-col items-center gap-1">
        {getNavItems(t).map((item, index) => (
          <button
            key={index}
            onClick={() => navigate(item.path)}
            className={`flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${
              location.pathname === item.path
                ? 'bg-background text-primary'
                : 'text-muted hover:bg-background hover:text-primary'
            }`}
            title={item.label}
          >
            <item.icon className="h-5 w-5" />
          </button>
        ))}
      </nav>
    </aside>
  )
}
