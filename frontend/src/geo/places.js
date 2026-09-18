import { distanceKm } from './geo.js'
import {
  loadGuidePlaces,
  mergeGuidePlaces,
  osmGlutenQuery,
  osmToGuidePlace,
  osmWorldGlutenQuery,
} from './guides.js'

/**
 * The list only carries places that a gluten-free guide publishes as such.
 * Ordinary bakeries and restaurants are not listed: for a celiac, a place with
 * no published information is not a result.
 */

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
]

const GF_KM = 25
const MAX_PLACES = 150

function levelLabel(level) {
  return level === 'dedicado' ? '100% sin gluten' : 'Opciones sin TACC'
}

function guideToPlace(item, origin) {
  return {
    id: item.id,
    name: item.name,
    type: item.type || 'Sin TACC',
    category: 'comida',
    lat: item.lat,
    lon: item.lon,
    distanceKm: Number.isFinite(item.distanceKm) ? item.distanceKm : distanceKm(origin, item),
    address: item.address || '',
    city: item.area || '',
    hours: item.hours || '',
    tags: [levelLabel(item.level)],
    certified: true,
    level: item.level || 'opciones',
    image: item.photos?.[0] || '',
    photos: item.photos || [],
    phone: item.phone || '',
    website: item.website || '',
    guides: item.guides || [],
    guideUrl: item.guideUrl || '',
    googlePlaceId: item.googlePlaceId || '',
    kitchen: item.kitchen || '',
    supply: item.supply || '',
    mode: item.mode || '',
    care: item.care || '',
    cuisine: '',
    description: '',
    menuUrl: '',
    products: [],
    osmType: '',
    osmId: '',
  }
}

async function overpass(query, timeoutMs = 8000, signal) {
  if (signal?.aborted) throw new DOMException('aborted', 'AbortError')
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  const onAbort = () => controller.abort()
  signal?.addEventListener('abort', onAbort)
  try {
    const response = await fetch(OVERPASS_ENDPOINTS[0], {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
      body: new URLSearchParams({ data: query }),
      signal: controller.signal,
    })
    if (!response.ok) throw new Error(`http-${response.status}`)
    const data = await response.json()
    if (!data?.elements) throw new Error('no-elements')
    return data.elements
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', onAbort)
  }
}

function inArgentina(lat, lon) {
  return lat >= -55.2 && lat <= -21.7 && lon >= -73.6 && lon <= -53.5
}

function boundsSpanKm(bounds) {
  if (!bounds) return 0
  return distanceKm(
    { lat: bounds.south, lon: bounds.west },
    { lat: bounds.north, lon: bounds.east },
  )
}

async function fetchOsmGluten(lat, lon) {
  const elements = await overpass(osmGlutenQuery(lat, lon, GF_KM))
  return elements.map(osmToGuidePlace).filter(Boolean)
}

/**
 * Primero las guías, que responden enseguida. OpenStreetMap llega después
 * y no debe demorar la lista.
 */
export async function fetchNearbyPlaces(lat, lon, onPartial) {
  const guide = await loadGuidePlaces(lat, lon, GF_KM).catch(() => [])
  const places = guide.map((item) => guideToPlace(item, { lat, lon })).slice(0, MAX_PLACES)
  onPartial?.({ all: places, places, pharmacies: [] })

  const osm = await fetchOsmGluten(lat, lon).catch(() => [])

  const merged = mergeGuidePlaces([...guide, ...osm])
    .map((item) => guideToPlace(item, { lat, lon }))
    .filter((place) => place.distanceKm <= GF_KM)
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, MAX_PLACES)

  return { all: merged, places: merged, pharmacies: [] }
}

function toList(items, lat, lon, km) {
  return mergeGuidePlaces(items)
    .map((item) => guideToPlace(item, { lat, lon }))
    .filter((place) => place.distanceKm <= km)
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, MAX_PLACES)
}

/** En Argentina alcanza con las guías. Afuera, un solo Overpass corto. */
export async function fetchRemotePlaces(lat, lon, onPartial, options = {}) {
  const km = Number.isFinite(options.km) ? options.km : 40
  const signal = options.signal
  if (signal?.aborted) throw new DOMException('aborted', 'AbortError')

  if (inArgentina(lat, lon)) {
    const guide = await loadGuidePlaces(lat, lon, km).catch(() => [])
    const places = toList(guide, lat, lon, km)
    onPartial?.({ all: places, places, pharmacies: [] })
    return { all: places, places, pharmacies: [] }
  }

  const rawBounds = options.bounds
  const bounds = rawBounds && boundsSpanKm(rawBounds) > 2 && boundsSpanKm(rawBounds) <= 80 ? rawBounds : null
  const elements = await overpass(osmWorldGlutenQuery(lat, lon, km, 12, bounds), 8000, signal).catch(() => [])
  const places = toList(elements.map(osmToGuidePlace).filter(Boolean), lat, lon, km)
  onPartial?.({ all: places, places, pharmacies: [] })
  return { all: places, places, pharmacies: [] }
}
