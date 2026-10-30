import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import zhCN from './locales/zh-CN'
import enUS from './locales/en-US'

export const SUPPORTED_LOCALES = ['zh-CN', 'en-US'] as const
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]

export const DEFAULT_LOCALE: SupportedLocale = 'zh-CN'
export const LOCALE_STORAGE_KEY = 'ai-draw-nexus.locale'

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      'zh-CN': { translation: zhCN },
      'en-US': { translation: enUS },
    },
    fallbackLng: DEFAULT_LOCALE,
    supportedLngs: [...SUPPORTED_LOCALES],
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: LOCALE_STORAGE_KEY,
    },
  })

/** 解析任意语言标签到受支持的语言 */
export function resolveLocale(language?: string | null): SupportedLocale {
  if (!language) return DEFAULT_LOCALE
  return language.toLowerCase().startsWith('en') ? 'en-US' : 'zh-CN'
}

i18n.on('languageChanged', (lng) => {
  document.documentElement.lang = resolveLocale(lng)
})
document.documentElement.lang = resolveLocale(i18n.resolvedLanguage)

export default i18n
