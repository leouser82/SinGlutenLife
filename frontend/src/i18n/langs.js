export const LANGS = [
  { id: 'es', label: 'Español', short: 'ES' },
  { id: 'en', label: 'English', short: 'EN' },
  { id: 'it', label: 'Italiano', short: 'IT' },
  { id: 'fr', label: 'Français', short: 'FR' },
  { id: 'gl', label: 'Galego', short: 'GL' },
]

export const LANG_KEY = 'nexo-sgl-lang'

export function detectLang() {
  try {
    const saved = localStorage.getItem(LANG_KEY)
    if (LANGS.some((item) => item.id === saved)) return saved
  } catch {
    // ignore
  }
  const list = typeof navigator === 'undefined' ? [] : navigator.languages || [navigator.language]
  for (const loc of list) {
    const code = String(loc || '').toLowerCase()
    if (code.startsWith('gl')) return 'gl'
    if (code.startsWith('it')) return 'it'
    if (code.startsWith('fr')) return 'fr'
    if (code.startsWith('en')) return 'en'
    if (code.startsWith('es')) return 'es'
  }
  return 'es'
}
