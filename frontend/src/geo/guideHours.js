const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

function plain(value) {
  return String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

/** Guides write hours free-form, with thin spaces and stray labels. */
export function hoursLines(hours) {
  const text = String(hours || '')
    .replace(/[\u2000-\u200f\u202f\u00a0]/g, ' ')
    .replace(/descripci[oó]n\s*:?\s*$/i, '')
  const parts = text.includes('\n') ? text.split('\n') : text.split(';')
  return parts
    .map((line) => line.replace(/\s{2,}/g, ' ').trim())
    .filter((line) => line && !/^descripci[oó]n/i.test(line))
}

/** Short label for a card: today's range, nothing when it cannot be told. */
export function todayLine(hours) {
  const today = plain(DAYS[new Date().getDay()])
  const line = hoursLines(hours).find((item) => plain(item).startsWith(today))
  if (!line) return ''
  const range = line.replace(/^[^\-:–]+[\-:–]\s*/, '').trim()
  if (!range || range.length > 34) return ''
  return /cerrado/i.test(range) ? 'Hoy cerrado' : `Hoy ${range}`
}

function argentinaMinutes() {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/Argentina/Buenos_Aires',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date())
  const hour = Number(parts.find((part) => part.type === 'hour')?.value || 0)
  const minute = Number(parts.find((part) => part.type === 'minute')?.value || 0)
  return hour * 60 + minute
}

function clockMinutes(text) {
  const mer = (String(text).match(/a\.?m\.?|p\.?m\.?/i) || [''])[0]
  const nums = String(text).match(/(\d{1,2})(?:[.:](\d{2}))?/)
  if (!nums) return null
  let hour = Number(nums[1])
  const minute = Number(nums[2] || 0)
  if (/p/i.test(mer) && hour < 12) hour += 12
  if (/a/i.test(mer) && hour === 12) hour = 0
  if (hour > 23 || minute > 59) return null
  return hour * 60 + minute
}

/** true / false when today's range can be read. null if the guide did not publish a usable hour. */
export function isOpenNow(hours) {
  const line = todayLine(hours)
  if (!line) return null
  if (/cerrado/i.test(line)) return false
  const body = line.replace(/^Hoy\s+/i, '')
  const bits = body.split(/\s+(?:a|–|—)\s+/i)
  if (bits.length < 2) return null
  const start = clockMinutes(bits[0])
  const end = clockMinutes(bits[1])
  if (start == null || end == null) return null
  const now = argentinaMinutes()
  if (end > start) return now >= start && now < end
  return now >= start || now < end
}
