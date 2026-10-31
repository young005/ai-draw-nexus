import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Sparkles,
  ArrowRight,
  GitBranch,
  Workflow,
  LayoutGrid,
  Zap,
  ShieldCheck,
  FileText,
  MessageSquare,
  LayoutTemplate,
  History,
  Quote,
  Star,
  Globe,
} from 'lucide-react'
import { Button } from '@/components/ui'
import { resolveLocale } from '@/i18n'

function FeatureCard({ icon, title, description }: { icon: ReactNode; title: string; description: string }) {
  return (
    <div className="group rounded-[2rem] border border-slate-200/60 bg-white p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)]">
      <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 transition-transform duration-300 group-hover:scale-110">
        {icon}
      </div>
      <h3 className="mb-3 text-xl font-bold text-slate-900">{title}</h3>
      <p className="font-light leading-relaxed text-slate-500">{description}</p>
    </div>
  )
}

function TestimonialCard({
  content,
  name,
  avatar,
}: {
  content: string
  name: string
  avatar: string
}) {
  return (
    <div className="group relative rounded-[2rem] border border-slate-200/50 bg-white p-8 shadow-sm transition-all duration-300 hover:shadow-xl hover:shadow-brand/5">
      <Quote className="absolute right-6 top-6 h-10 w-10 text-slate-100 transition-colors duration-300 group-hover:text-brand/10" />
      <div className="mb-6 flex items-center gap-1">
        {Array.from({ length: 5 }).map((_, index) => (
          <Star key={index} className="h-4 w-4 fill-amber-400 text-amber-400" />
        ))}
      </div>
      <p className="relative z-10 text-[1.05rem] font-medium leading-relaxed text-slate-700">
        “{content}”
      </p>
      <div className="mt-8 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-xl shadow-inner">
          {avatar}
        </div>
        <div className="text-sm font-semibold text-slate-900">{name}</div>
      </div>
    </div>
  )
}

export function LandingPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const isZh = resolveLocale(i18n.resolvedLanguage) === 'zh-CN'

  const toggleLanguage = () => {
    void i18n.changeLanguage(isZh ? 'en-US' : 'zh-CN')
  }

  const engines = [
    {
      icon: <GitBranch className="h-6 w-6" />,
      iconClass: 'h-12 w-12 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center mb-6 border border-cyan-500/30',
      title: t('landing.mermaidTitle'),
      description: t('landing.mermaidDesc'),
      offset: '',
    },
    {
      icon: <Workflow className="h-6 w-6" />,
      iconClass: 'h-12 w-12 rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center mb-6 border border-purple-500/30',
      title: t('landing.excalidrawTitle'),
      description: t('landing.excalidrawDesc'),
      offset: 'translate-y-0 md:translate-y-8',
    },
    {
      icon: <LayoutGrid className="h-6 w-6" />,
      iconClass: 'h-12 w-12 rounded-2xl bg-orange-500/20 text-orange-400 flex items-center justify-center mb-6 border border-orange-500/30',
      title: t('landing.drawioTitle'),
      description: t('landing.drawioDesc'),
      offset: '',
    },
  ]

  const features = [
    {
      icon: <Zap className="h-6 w-6 text-amber-500" />,
      title: t('landing.featFastTitle'),
      description: t('landing.featFastDesc'),
    },
    {
      icon: <ShieldCheck className="h-6 w-6 text-emerald-500" />,
      title: t('landing.featPrivacyTitle'),
      description: t('landing.featPrivacyDesc'),
    },
    {
      icon: <FileText className="h-6 w-6 text-blue-500" />,
      title: t('landing.featModalTitle'),
      description: t('landing.featModalDesc'),
    },
    {
      icon: <MessageSquare className="h-6 w-6 text-brand" />,
      title: t('landing.featChatTitle'),
      description: t('landing.featChatDesc'),
    },
    {
      icon: <LayoutTemplate className="h-6 w-6 text-purple-500" />,
      title: t('landing.featLayoutTitle'),
      description: t('landing.featLayoutDesc'),
    },
    {
      icon: <History className="h-6 w-6 text-rose-500" />,
      title: t('landing.featHistoryTitle'),
      description: t('landing.featHistoryDesc'),
    },
  ]

  const testimonials = [
    { name: t('landing.review1Name'), avatar: '👩‍🎓', content: t('landing.review1Content') },
    { name: t('landing.review2Name'), avatar: '🙏', content: t('landing.review2Content') },
    { name: t('landing.review3Name'), avatar: '💼', content: t('landing.review3Content') },
    { name: t('landing.review4Name'), avatar: '💡', content: t('landing.review4Content') },
    { name: t('landing.review5Name'), avatar: '🌟', content: t('landing.review5Content') },
    { name: t('landing.review6Name'), avatar: '🐱', content: t('landing.review6Content') },
  ]

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200/50 bg-white/50 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-white">
              <Sparkles className="h-2.5 w-2.5 text-white" />
            </span>
            <span className="text-2xl font-extrabold tracking-tighter text-slate-800">
              AI
              <span className="bg-gradient-to-r from-blue-600 to-brand bg-clip-text text-transparent">Draw</span>
              Nexus
            </span>
          </div>
          <nav className="flex items-center gap-4 text-sm font-medium">
            <a href="#features" className="hidden text-slate-600 transition-colors hover:text-slate-900 sm:block">
              {t('landing.navFeatures')}
            </a>
            <a href="#engines" className="hidden text-slate-600 transition-colors hover:text-slate-900 sm:block">
              {t('landing.navEngines')}
            </a>
            <a href="#testimonials" className="hidden text-slate-600 transition-colors hover:text-slate-900 sm:block">
              {t('landing.navReviews')}
            </a>
            <div className="mx-2 hidden h-4 w-px bg-slate-200 sm:block" />
            <button
              type="button"
              onClick={toggleLanguage}
              title={isZh ? t('locale.switchToEn') : t('locale.switchToZh')}
              className="flex h-9 items-center justify-center gap-1.5 rounded-full border border-slate-200/60 bg-slate-100 px-3 text-slate-700 transition-colors hover:bg-slate-200"
            >
              <Globe className="h-4 w-4" />
              <span>{isZh ? '中' : 'En'}</span>
            </button>
            <Button
              onClick={() => navigate('/')}
              className="hidden rounded-full shadow-md transition-all hover:shadow-lg sm:flex"
            >
              {t('landing.goToApp')}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex-1 pb-16 pt-24">
        {/* Hero */}
        <section className="relative mx-auto flex max-w-7xl flex-col items-center px-6 pb-32 pt-20 text-center">
          <div className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[400px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-[100%] bg-brand/10 blur-[100px]" />
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-600 shadow-sm">
            <Sparkles className="h-4 w-4" />
            <span>{t('landing.heroBadge')}</span>
          </div>
          <h1
            className="mb-8 max-w-4xl text-6xl font-extrabold tracking-tight text-slate-900 md:text-8xl"
            // 文案来自本地静态语言包，其中包含渐变高亮标记
            dangerouslySetInnerHTML={{ __html: t('landing.heroTitle') }}
          />
          <p className="mb-12 max-w-2xl font-light text-xl leading-relaxed text-slate-600 md:text-2xl">
            {t('landing.heroSubtitle')}
          </p>
          <div className="flex w-full flex-col gap-4 sm:w-auto sm:flex-row">
            <Button
              size="lg"
              onClick={() => navigate('/')}
              className="h-14 rounded-full px-8 text-lg shadow-xl shadow-brand/20 transition-transform duration-300 hover:scale-105"
            >
              {t('landing.startFree')}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => {
                document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })
              }}
              className="h-14 rounded-full border-slate-300 px-8 text-lg transition-colors duration-300 hover:bg-slate-100"
            >
              {t('landing.learnMore')}
            </Button>
          </div>
        </section>

        {/* Engines */}
        <section id="engines" className="relative overflow-hidden bg-slate-900 px-6 py-20 text-white">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.1),transparent_50%)]" />
          <div className="relative z-10 mx-auto max-w-7xl">
            <div className="mb-16 text-center">
              <h2 className="mb-6 text-4xl font-bold tracking-tight md:text-5xl">
                {t('landing.enginesTitle')}
              </h2>
              <p className="mx-auto max-w-2xl text-lg text-slate-400">{t('landing.enginesSubtitle')}</p>
            </div>
            <div className="grid gap-8 md:grid-cols-3">
              {engines.map((engine) => (
                <div
                  key={engine.title}
                  className={`group rounded-[2rem] border border-white/10 bg-white/5 p-8 backdrop-blur-md transition-all duration-300 hover:bg-white/10 ${engine.offset}`}
                >
                  <div className={engine.iconClass}>{engine.icon}</div>
                  <h3 className="mb-3 text-2xl font-semibold">{engine.title}</h3>
                  <p className="leading-relaxed text-slate-400">{engine.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="mx-auto max-w-7xl px-6 py-32">
          <div className="mb-20 text-center">
            <h2
              className="mb-6 text-4xl font-bold tracking-tight text-slate-900 md:text-5xl"
              // 文案来自本地静态语言包，其中包含渐变高亮标记
              dangerouslySetInnerHTML={{ __html: t('landing.featuresTitle') }}
            />
          </div>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <FeatureCard
                key={feature.title}
                icon={feature.icon}
                title={feature.title}
                description={feature.description}
              />
            ))}
          </div>
        </section>

        {/* Testimonials */}
        <section id="testimonials" className="relative bg-slate-50 px-6 py-20">
          <div className="mx-auto max-w-7xl">
            <div className="mb-16 text-center">
              <h2 className="mb-6 text-4xl font-bold tracking-tight text-slate-900 md:text-5xl">
                {t('landing.reviewsTitle')}
              </h2>
              <p className="mx-auto max-w-2xl font-light text-lg text-slate-600">
                {t('landing.reviewsSubtitle')}
              </p>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {testimonials.map((review) => (
                <TestimonialCard
                  key={review.name}
                  name={review.name}
                  avatar={review.avatar}
                  content={review.content}
                />
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-6xl px-6 py-20">
          <div className="relative overflow-hidden rounded-[3rem] bg-gradient-to-br from-brand via-blue-600 to-indigo-700 p-12 text-center shadow-2xl md:p-20">
            <div className="absolute right-0 top-0 h-[500px] w-[500px] -translate-y-1/2 translate-x-1/2 rounded-full bg-white/10 blur-[80px]" />
            <h2 className="relative z-10 mb-6 text-4xl font-bold text-white md:text-5xl">
              {t('landing.ctaTitle')}
            </h2>
            <p className="relative z-10 mx-auto mb-10 max-w-2xl font-light text-lg text-blue-100 md:text-xl">
              {t('landing.ctaSubtitle')}
            </p>
            <Button
              size="lg"
              onClick={() => navigate('/')}
              className="relative z-10 h-14 rounded-full bg-white px-10 text-lg text-blue-600 shadow-xl transition-transform duration-300 hover:scale-105 hover:bg-slate-50"
            >
              {t('landing.ctaButton')}
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white py-10 text-center">
        <p className="text-sm text-slate-500">{t('landing.footer', { year: new Date().getFullYear() })}</p>
      </footer>
    </div>
  )
}
