import { createContext, useContext, useState, type ReactNode } from 'react'
import lt from './locales/lt'
import en from './locales/en'

export type Locale = 'lt' | 'en'

const locales = { lt, en }

type Strings = typeof lt

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
    <I18nContext.Provider value={{ locale, setLocale, t: locales[locale] }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  return useContext(I18nContext)
}
