import { createContext, useContext, useState, type ReactNode } from 'react'
import lt from './locales/lt'

// English is deprecated: the site currently targets a Lithuanian-only audience.
// The i18n machinery is kept intact so a locale can be re-added later — register
// it in `locales` and add its tag to `Locale`. Unregistered locales fall back to
// Lithuanian.
export type Locale = 'lt' | 'en'

type Strings = typeof lt

const locales: Partial<Record<Locale, Strings>> = { lt }

interface I18nContextValue {
  locale: Locale
  setLocale: (l: Locale) => void
  t: Strings
}

const I18nContext = createContext<I18nContextValue>({
  locale: 'lt',
  setLocale: () => {},
  t: lt,
})

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>('lt')
  return (
    <I18nContext.Provider value={{ locale, setLocale, t: locales[locale] ?? lt }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  return useContext(I18nContext)
}
