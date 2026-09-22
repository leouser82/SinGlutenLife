import { distanceKm, searchPublishedGf } from './geo.js'
import { fetchActiveUserPlaces } from '../places/userStore.js'
import { composePublicList, toPublicUserPlace } from './userPlaceRank.js'
import {
  loadGuidePlaces,
  mergeGuidePlaces,
  osmFastGfQuery,
  osmGlutenQuery,
  osmToGuidePlace,
} from './guides.js'

/**
 * The list only carries places that a gluten-free guide publishes as such.
 * Ordinary bakeries and restaurants are not listed: for a celiac, a place with
 * no published information is not a result.
 */

const OVERPASS_ENDPOINTS = [
  'https://overpass.kumi.systems/api/interpreter',
  'https://lz4.overpass-api.de/api/interpreter',
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
    source: 'scrape',
  }
}

async function overpassOnce(url, query, timeoutMs, signal) {
  if (signal?.aborted) throw new DOMException('aborted', 'AbortError')
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  const onAbort = () => controller.abort()
  signal?.addEventListener('abort', onAbort)
  try {
    const response = await fetch(url, {
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

async function overpass(query, timeoutMs = 7000, signal) {
  let lastError
  for (const url of OVERPASS_ENDPOINTS) {
    try {
      return await overpassOnce(url, query, timeoutMs, signal)
    } catch (error) {
      lastError = error
      if (error?.name === 'AbortError' && signal?.aborted) throw error
    }
  }
  throw lastError || new Error('overpass')
}

function inArgentina(lat, lon) {
  return lat >= -55.2 && lat <= -21.7 && lon >= -73.6 && lon <= -53.5
}

async function fetchOsmGluten(lat, lon) {
  const elements = await overpass(osmGlutenQuery(lat, lon, GF_KM))
  return elements.map(osmToGuidePlace).filter(Boolean)
}

function publish(items, userRows, origin, km) {
  const algorithm = mergeGuidePlaces(items).map((item) => guideToPlace(item, origin))
  const users = (userRows || []).map(toPublicUserPlace)
  return composePublicList([...algorithm, ...users], origin, km).slice(0, MAX_PLACES)
}

/**
 * Primero las guías, que responden enseguida. OpenStreetMap llega después
 * y no debe demorar la lista. Los lugares del usuario entran por cercanía.
 */
export async function fetchNearbyPlaces(lat, lon, onPartial) {
  const origin = { lat, lon }
  const userTask = fetchActiveUserPlaces().catch(() => [])
  const guide = await loadGuidePlaces(lat, lon, GF_KM).catch(() => [])
  const userRows = await userTask
  const places = publish(guide, userRows, origin, GF_KM)
  onPartial?.({ all: places, places, pharmacies: [] })

  const osm = await fetchOsmGluten(lat, lon).catch(() => [])
  const merged = publish([...guide, ...osm], userRows, origin, GF_KM)
  return { all: merged, places: merged, pharmacies: [] }
}

async function publishRemote(items, userRows, lat, lon, km) {
  return publish(items, userRows, { lat, lon }, km)
}

/** Guías, OSM y Photon alrededor de un lugar, para saber si el algoritmo ya lo publicó. */
export async function algorithmPlacesNear(lat, lon) {
  const km = 0.3
  const origin = { lat, lon }
  const [guide, named, elements] = await Promise.all([
    loadGuidePlaces(lat, lon, km).catch(() => []),
    searchPublishedGf(lat, lon, km, {}).catch(() => []),
    overpass(osmFastGfQuery(lat, lon, km), 7000).catch(() => []),
  ])
  const osm = elements.map(osmToGuidePlace).filter(Boolean)
  return mergeGuidePlaces([...guide, ...named, ...osm])
    .map((item) => guideToPlace(item, origin))
    .filter((place) => place.distanceKm <= km)
}

/** En Argentina las guías. Afuera, OSM/Photon de esa ciudad, no un JSON fijo. */
export async function fetchRemotePlaces(lat, lon, onPartial, options = {}) {
  const km = Number.isFinite(options.km) ? options.km : 40
  const signal = options.signal
  if (signal?.aborted) throw new DOMException('aborted', 'AbortError')

  const userTask = fetchActiveUserPlaces().catch(() => [])

  if (inArgentina(lat, lon)) {
    const guide = await loadGuidePlaces(lat, lon, km).catch(() => [])
    if (signal?.aborted) throw new DOMException('aborted', 'AbortError')
    const places = await publishRemote(guide, await userTask, lat, lon, km)
    onPartial?.({ all: places, places, pharmacies: [] })
    return { all: places, places, pharmacies: [] }
  }

  const namedTask = searchPublishedGf(lat, lon, km, {
    hint: options.hint || '',
    countryCode: options.countryCode || '',
    countryName: options.countryName || '',
    signal,
  }).catch(() => [])
  const osmTask = overpass(osmFastGfQuery(lat, lon, km), 7000, signal).catch(() => [])

  const named = await namedTask
  const userRows = await userTask
  if (signal?.aborted) throw new DOMException('aborted', 'AbortError')
  if (named.length) {
    const early = await publishRemote(named, userRows, lat, lon, km)
    onPartial?.({ all: early, places: early, pharmacies: [] })
  }

  const elements = await osmTask
  if (signal?.aborted) throw new DOMException('aborted', 'AbortError')
  const places = await publishRemote(
    [...named, ...elements.map(osmToGuidePlace).filter(Boolean)],
    userRows,
    lat,
    lon,
    km,
  )
  onPartial?.({ all: places, places, pharmacies: [] })
  return { all: places, places, pharmacies: [] }
}
