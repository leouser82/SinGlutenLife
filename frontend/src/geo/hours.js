const DAY_ORDER = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const DAY_LABEL = {
  Su: 'Domingo',
  Mo: 'Lunes',
  Tu: 'Martes',
  We: 'Miércoles',
  Th: 'Jueves',
  Fr: 'Viernes',
  Sa: 'Sábado',
}
const DAY_INDEX = Object.fromEntries(DAY_ORDER.map((key, i) => [key, i]))

function expandDays(token) {
  if (token.includes('-')) {
    const [from, to] = token.split('-')
    const start = DAY_INDEX[from]
    const end = DAY_INDEX[to]
    if (start == null || end == null) return []
    const days = []
    let i = start
    for (let n = 0; n < 7; n += 1) {
      days.push(DAY_ORDER[i])
      if (i === end) break
      i = (i + 1) % 7
    }
    return days
  }
  return DAY_INDEX[token] != null ? [token] : []
}

function parseTimes(chunk) {
  if (!chunk || chunk === 'off' || chunk === 'closed') return []
  return chunk
    .split(',')
    .map((part) => part.trim())
    .filter((part) => /^\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2}/.test(part))
    .map((part) => part.replace(/\s/g, ''))
}

export function parseOpeningHours(raw) {
  const empty = { rows: [], openLabel: '', todayRange: '' }
  if (!raw) return empty
  if (/^24\/7$/i.test(raw.trim())) {
    return {
      rows: DAY_ORDER.map((key) => ({ key, day: DAY_LABEL[key], range: '00:00 – 24:00' })),
      openLabel: 'Abierto · 24 h',
      todayRange: '00:00 – 24:00',
    }
  }

  const byDay = Object.fromEntries(DAY_ORDER.map((key) => [key, []]))
  for (const segment of String(raw).split(';')) {
    const part = segment.trim()
    if (!part || /^PH|^SH/i.test(part)) continue
    const match = part.match(/^((?:[A-Za-z]{2}(?:-[A-Za-z]{2})?(?:\s*,\s*[A-Za-z]{2}(?:-[A-Za-z]{2})?)*)\s+)?(.+)$/)
    if (!match) continue
    const dayToken = (match[1] || '').trim()
    const times = parseTimes(match[2])
    const days = dayToken
      ? dayToken.split(',').flatMap((token) => expandDays(token.trim()))
      : DAY_ORDER
    for (const day of days) {
      byDay[day].push(...times)
    }
  }

  const rows = DAY_ORDER.map((key) => ({
    key,
    day: DAY_LABEL[key],
    range: byDay[key].length ? byDay[key].join(' / ').replace(/-/g, ' – ') : 'Cerrado',
  }))

  if (rows.every((row) => row.range === 'Cerrado')) return { ...empty, rows: [] }

  const now = nowInArgentina()
  const todayKey = DAY_ORDER[now.weekday]
  const todayTimes = byDay[todayKey]
  const todayRange = todayTimes.length ? todayTimes.join(' / ').replace(/-/g, ' – ') : 'Cerrado'
  const openUntil = firstCloseAfter(todayTimes, now.minutes)
  const openLabel = openUntil
    ? `Abierto · cierra ${openUntil}`
    : nextOpenLabel(byDay, todayKey, now.minutes)

  return { rows, openLabel, todayRange }
}

function nowInArgentina() {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/Argentina/Buenos_Aires',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date())
  const weekdayName = parts.find((p) => p.type === 'weekday')?.value || 'Mon'
  const hour = Number(parts.find((p) => p.type === 'hour')?.value || 0)
  const minute = Number(parts.find((p) => p.type === 'minute')?.value || 0)
  const map = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
  return { weekday: map[weekdayName] ?? 1, minutes: hour * 60 + minute }
}

function toMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

function firstCloseAfter(ranges, nowMin) {
  for (const range of ranges) {
    const [start, end] = range.split('-')
    const a = toMinutes(start)
    const b = toMinutes(end)
    if (nowMin >= a && nowMin < b) return end
  }
  return ''
}

function nextOpenLabel(byDay, todayKey, nowMin) {
  const start = DAY_INDEX[todayKey]
  for (let n = 0; n < 7; n += 1) {
    const key = DAY_ORDER[(start + n) % 7]
    for (const range of byDay[key]) {
      const [open] = range.split('-')
      if (n === 0 && toMinutes(open) <= nowMin) continue
      if (n === 0) return `Cerrado · abre ${open}`
      return `Cerrado · abre ${DAY_LABEL[key]} ${open}`
    }
  }
  return 'Cerrado'
}

export function mapEmbedUrl(place) {
  if (!Number.isFinite(place.lat) || !Number.isFinite(place.lon)) return ''
  const { lat, lon } = place
  const pad = 0.0035
  return `https://www.openstreetmap.org/export/embed.html?bbox=${lon - pad}%2C${lat - pad}%2C${lon + pad}%2C${lat + pad}&layer=mapnik&marker=${lat}%2C${lon}`
}
