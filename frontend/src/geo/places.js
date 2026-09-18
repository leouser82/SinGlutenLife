import { distanceKm } from './geo.js'
import { loadGuidePlaces, mergeGuidePlaces, osmGlutenQuery, osmToGuidePlace, osmWorldGlutenQuery } from './guides.js'

/**
 * The list only carries places that a gluten-free guide publishes as such.
 * Ordinary bakeries and restaurants are not listed: for a celiac, a place with
 * no published information is not a result.
 */

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
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

async function overpass(query, timeoutMs = 15000) {
  for (const endpoint of OVERPASS_ENDPOINTS) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
        body: new URLSearchParams({ data: query }),
        signal: controller.signal,
      })
      if (!response.ok) continue
      const data = await response.json()
      if (data?.elements) return data.elements
    } catch {
      // se prueba el espejo siguiente
    } finally {
      clearTimeout(timer)
    }
  }
  return []
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

/** Cualquier punto del mundo: OpenStreetMap, sin las guías de Argentina. */
export async function fetchRemotePlaces(lat, lon, onPartial) {
  const elements = await overpass(osmWorldGlutenQuery(lat, lon, GF_KM), 22000)
  const places = mergeGuidePlaces(elements.map(osmToGuidePlace).filter(Boolean))
    .map((item) => guideToPlace(item, { lat, lon }))
    .filter((place) => place.distanceKm <= GF_KM)
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, MAX_PLACES)
  onPartial?.({ all: places, places, pharmacies: [] })
  return { all: places, places, pharmacies: [] }
}
