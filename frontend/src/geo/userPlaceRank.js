import { distanceKm } from './geo.js'

/** Menos de 200 m entre locales: el de scraping va antes. */
const NEAR_KM = 0.2
/** Distancia al origen que difiere en 150 m o menos: el de scraping va antes. */
const DELTA_KM = 0.15
/** Menos de 250 m y nombre parecido: se oculta el lugar del usuario. */
const DUP_KM = 0.25

export function normalizePlaceName(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\b(sin\s*tacc|sintacc|sin\s*gluten|gluten\s*free|celiacos?|celiaco)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function namesSimilar(a, b) {
  const left = normalizePlaceName(a)
  const right = normalizePlaceName(b)
  if (!left || !right) return false
  if (left === right) return true
  const [short, long] = left.length <= right.length ? [left, right] : [right, left]
  if (short.length >= 6 && long.includes(short)) return true
  const words = (text) => text.split(' ').filter((word) => word.length > 2)
  const leftWords = words(left)
  const rightWords = words(right)
  if (leftWords.length < 2 || rightWords.length < 2) return false
  const known = new Set(leftWords)
  const shared = rightWords.filter((word) => known.has(word)).length
  return shared >= 2 && shared === Math.min(leftWords.length, rightWords.length)
}

export function scrapeBeforeUser(userPlace, scrapePlace) {
  if (distanceKm(userPlace, scrapePlace) < NEAR_KM) return true
  return Math.abs(Number(userPlace.distanceKm) - Number(scrapePlace.distanceKm)) <= DELTA_KM
}

export function comparePlaces(a, b) {
  const aUser = a.source === 'user'
  const bUser = b.source === 'user'
  if (aUser !== bUser) {
    const user = aUser ? a : b
    const scrape = aUser ? b : a
    if (scrapeBeforeUser(user, scrape)) return aUser ? 1 : -1
  }
  if (a.distanceKm !== b.distanceKm) return a.distanceKm - b.distanceKm
  if (aUser !== bUser) return aUser ? 1 : -1
  return String(a.id).localeCompare(String(b.id))
}

export function coveredByAlgorithm(userPlace, algorithmPlaces) {
  return (algorithmPlaces || []).some(
    (place) => place?.source !== 'user' && namesSimilar(userPlace.name, place.name) && distanceKm(userPlace, place) < DUP_KM,
  )
}

export function logicalDelete(place, note, now) {
  const deleteNote = String(note || '')
    .replace(/\s+/g, ' ')
    .trim()
  if (!deleteNote) throw new Error('note')
  return { ...place, deletedAt: now, deleteNote }
}

/**
 * Lista pública: radio del origen, sin borrados, sin duplicar al algoritmo,
 * más cercano primero y prioridad de scraping cuando corresponde.
 */
export function composePublicList(places, origin, km) {
  const ranged = []
  for (const place of places || []) {
    if (!place || place.deletedAt != null) continue
    const lat = Number(place.lat)
    const lon = Number(place.lon)
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue
    const point = { ...place, lat, lon }
    const distance = distanceKm(origin, point)
    if (distance > km) continue
    ranged.push({
      ...point,
      source: point.source === 'user' ? 'user' : 'scrape',
      distanceKm: distance,
    })
  }
  const scrapes = ranged.filter((place) => place.source === 'scrape')
  const visible = ranged.filter((place) => place.source !== 'user' || !coveredByAlgorithm(place, scrapes))
  return visible.sort(comparePlaces)
}

export function toPublicUserPlace(row) {
  const image = row.image || ''
  return {
    id: row.id,
    name: row.name,
    type: 'Sin TACC',
    category: 'comida',
    lat: Number(row.lat),
    lon: Number(row.lon),
    address: row.address || '',
    city: '',
    hours: row.hours || '',
    tags: [],
    certified: false,
    level: '',
    image,
    photos: image ? [image] : [],
    phone: '',
    website: '',
    guides: [],
    guideUrl: '',
    googlePlaceId: '',
    kitchen: '',
    supply: '',
    mode: '',
    care: '',
    cuisine: '',
    description: row.description || '',
    menu: row.menu || '',
    review: row.review || '',
    menuUrl: '',
    products: [],
    osmType: '',
    osmId: '',
    source: 'user',
    author: row.author || null,
    deletedAt: row.deletedAt ?? null,
    deleteNote: row.deleteNote || '',
  }
}
