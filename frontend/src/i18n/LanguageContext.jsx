import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { detectLang, LANG_KEY, LANGS } from './langs.js'
import { ui } from './ui.js'

const LanguageContext = createContext({
  lang: 'es',
  setLang: () => {},
  t: (key) => key,
  langs: LANGS,
})

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => detectLang())

  useEffect(() => {
    document.documentElement.lang = lang
    try {
      localStorage.setItem(LANG_KEY, lang)
    } catch {
      // ignore
    }
  }, [lang])

  const t = useCallback(
    (key, vars) => {
      const table = ui[lang] || ui.es
      let text = table[key] || ui.es[key] || key
      if (vars) {
        for (const [name, value] of Object.entries(vars)) {
          text = text.replaceAll(`{${name}}`, String(value ?? ''))
        }
      }
      return text
    },
    [lang],
  )

  const value = useMemo(() => ({ lang, setLang: setLangState, t, langs: LANGS }), [lang, t])

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useI18n() {
  return useContext(LanguageContext)
}
