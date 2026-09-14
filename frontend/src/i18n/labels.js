export function labelOf(t, prefix, value, fallback = '') {
  if (value == null || value === '') return fallback
  const key = `${prefix}.${value}`
  const out = t(key)
  return out === key ? fallback || String(value) : out
}

export function displayTodayLine(line, t) {
  const text = String(line || '')
  if (!text) return ''
  if (/hoy cerrado/i.test(text)) return t('hours.closedToday')
  return text.replace(/^Hoy\s+/i, `${t('hours.todayPrefix')} `)
}
