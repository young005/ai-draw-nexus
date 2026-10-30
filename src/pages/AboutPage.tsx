import { useTranslation } from 'react-i18next'
import { AppSidebar, AppHeader } from '@/components/layout'
import { Github } from 'lucide-react'

export function AboutPage() {
  const { t } = useTranslation()

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      <main className="flex flex-1 flex-col">
        <AppHeader />
        <div className="flex flex-1 items-start justify-center px-8 pt-12">
          <div className="w-full max-w-3xl space-y-8">
            {/* 开源信息 */}
            <section className="rounded-xl border border-border bg-surface p-6 shadow-sm">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-medium text-primary">
                <Github className="h-5 w-5" />
                {t('about.openSourceTitle')}
              </h2>
              <p className="text-sm leading-relaxed text-muted">
                {t('about.openSourceText')}
                <a
                  href="https://github.com/liujuntao123/ai-draw-nexus"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline hover:text-primary/80"
                >
                  liujuntao123/ai-draw-nexus
                </a>
                {t('about.openSourceTail')}
              </p>
            </section>

            {/* 联系作者 */}
            <section className="rounded-xl border border-border bg-surface p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-medium text-primary">{t('about.contactTitle')}</h2>
              <p className="mb-4 text-sm leading-relaxed text-muted">
                {t('about.contactText')}
              </p>
              <div className="flex justify-center">
                <img
                  src="/contact.png"
                  alt={t('about.contactAlt')}
                  className="max-w-xs rounded-lg border border-border"
                />
              </div>
            </section>

            {/* 赞助支持 */}
            <section className="rounded-xl border border-border bg-surface p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-medium text-primary">{t('about.sponsorTitle')}</h2>
              <p className="mb-4 text-sm leading-relaxed text-muted">
                {t('about.sponsorText')}
              </p>
              <div className="flex justify-center">
                <img
                  src="/donate.png"
                  alt={t('about.sponsorAlt')}
                  className="max-w-xs rounded-lg border border-border"
                />
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  )
}
