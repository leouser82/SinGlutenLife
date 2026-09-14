import { distanceKm } from './geo.js'

const OVERPASS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
]

const SHOP_KM = 4
const cache = new Map()

const KIND_LABEL = {
  dietetica: 'Dietética',
  verduleria: 'Verdulería',
  carniceria: 'Carnicería',
  almacen: 'Almacén o súper',
}

function coordsOf(el) {
  if (Number.isFinite(el.lat) && Number.isFinite(el.lon)) return { lat: el.lat, lon: el.lon }
  if (el.center && Number.isFinite(el.center.lat)) return { lat: el.center.lat, lon: el.center.lon }
  return null
}

function addressOf(tags = {}) {
  const street = [tags['addr:street'], tags['addr:housenumber']].filter(Boolean).join(' ')
  return tags['addr:full'] || street || tags['addr:city'] || ''
}

function kindFromTags(tags = {}) {
  const shop = String(tags.shop || '')
  if (/health_food|nutrition_supplements|chemist/i.test(shop)) return 'dietetica'
  if (/greengrocer|farm/i.test(shop)) return 'verduleria'
  if (/butcher/i.test(shop)) return 'carniceria'
  return 'almacen'
}

async function overpass(query) {
  for (const endpoint of OVERPASS) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 12000)
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
      // siguiente espejo
    } finally {
      clearTimeout(timer)
    }
  }
  return []
}

const SEARCH_QUERY = {
  dietetica: 'dietética sin TACC',
  verduleria: 'verdulería',
  carniceria: 'carnicería',
  almacen: 'supermercado',
}

function fromGuides(places) {
  return (places || [])
    .filter((place) => /diet[eé]tica|farmac/i.test(place.type || ''))
    .map((place) => ({
      id: place.id,
      name: place.name,
      type: place.type,
      kind: 'dietetica',
      address: place.address || '',
      distanceKm: place.distanceKm,
      lat: place.lat,
      lon: place.lon,
    }))
}

export function mapsShopUrl(shop, coords) {
  if (shop?.isSearch) {
    const q = shop.searchQuery || SEARCH_QUERY[shop.kind] || shop.name
    if (coords) {
      return `https://www.google.com/maps/search/${encodeURIComponent(q)}/@${coords.lat},${coords.lon},15z`
    }
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`
  }
  if (Number.isFinite(shop?.lat) && Number.isFinite(shop?.lon)) {
    return `https://www.google.com/maps/dir/?api=1&destination=${shop.lat},${shop.lon}`
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(shop?.name || '')}`
}

function searchShop(kind) {
  const searchQuery = SEARCH_QUERY[kind] || 'supermercado'
  return {
    id: `search-${kind}`,
    name: `${KIND_LABEL[kind] || 'Comercio'} cerca`,
    type: KIND_LABEL[kind],
    kind,
    address: 'Abrir en Google Maps',
    distanceKm: null,
    searchQuery,
    isSearch: true,
  }
}

export async function loadGroceryShops(coords, places = []) {
  const key = coords ? `${coords.lat.toFixed(3)},${coords.lon.toFixed(3)}` : 'none'
  if (cache.has(key)) return cache.get(key)

  const fromList = fromGuides(places)
  if (!coords) {
    cache.set(key, fromList)
    return fromList
  }

  const radius = SHOP_KM * 1000
  const query = `
[out:json][timeout:12];
(
  node["shop"~"supermarket|convenience|greengrocer|butcher|chemist|health_food"](around:${radius},${coords.lat},${coords.lon});
  node["amenity"="marketplace"](around:${radius},${coords.lat},${coords.lon});
);
out body;
`.trim()

  const elements = await overpass(query)
  const osm = elements
    .map((el) => {
      const point = coordsOf(el)
      const tags = el.tags || {}
      if (!point || !tags.name) return null
      return {
        id: `sh-${el.type || 'n'}-${el.id}`,
        name: tags.name,
        type: KIND_LABEL[kindFromTags(tags)],
        kind: kindFromTags(tags),
        address: addressOf(tags),
        distanceKm: distanceKm(coords, point),
        lat: point.lat,
        lon: point.lon,
      }
    })
    .filter(Boolean)

  const seen = new Set()
  const merged = [...fromList, ...osm]
    .filter((shop) => {
      const stamp = `${shop.name}|${shop.address}`.toLowerCase()
      if (seen.has(stamp)) return false
      seen.add(stamp)
      return true
    })
    .sort((a, b) => a.distanceKm - b.distanceKm)

  cache.set(key, merged)
  return merged
}

export function shopForIngredient(ingredient, shops = []) {
  const want = ingredient.shop || 'almacen'
  const preferred = shops.filter((shop) => shop.kind === want)
  if (preferred[0]) return preferred[0]
  if (want === 'dietetica') {
    const diet = shops.find((shop) => shop.kind === 'dietetica')
    if (diet) return diet
  }
  return searchShop(want)
}

export function shopKindLabel(kind) {
  return KIND_LABEL[kind] || 'Comercio'
}
