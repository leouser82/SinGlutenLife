export function toRad(deg) {
  return (deg * Math.PI) / 180
}

export function distanceKm(from, to) {
  const R = 6371
  const dLat = toRad(to.lat - from.lat)
  const dLon = toRad(to.lon - from.lon)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(from.lat)) * Math.cos(toRad(to.lat)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)))
}

export function formatDistance(km) {
  if (!Number.isFinite(km)) return ''
  if (km < 0.1) return `${Math.max(1, Math.round(km * 1000))} m`
  if (km < 1) return `${(km * 1000).toFixed(0)} m`
  return `${km.toFixed(1)} km`
}

export function mapsUrl(place) {
  if (place.googlePlaceId) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name || '')}&query_place_id=${place.googlePlaceId}`
  }
  if (Number.isFinite(place.lat) && Number.isFinite(place.lon)) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${place.name || ''} ${place.lat},${place.lon}`)}`
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.address || place.name)}`
}

export function mapsDirectionsUrl(place) {
  if (Number.isFinite(place.lat) && Number.isFinite(place.lon)) {
    return `https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lon}`
  }
  return mapsUrl(place)
}

function gpsPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('no-geo'))
      return
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 14000,
      maximumAge: 60_000,
    })
  })
}

async function fetchJson(url, options = {}, ms = 12000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ms)
  const onAbort = () => controller.abort()
  options.signal?.addEventListener('abort', onAbort)
  try {
    const response = await fetch(url, { ...options, signal: controller.signal })
    if (!response.ok) throw new Error(`http-${response.status}`)
    return await response.json()
  } finally {
    clearTimeout(timer)
    options.signal?.removeEventListener('abort', onAbort)
  }
}

const GF_NAME = /gluten|celiac|coeliac|celiaq|tacc|glutine|glutenfrei|glutenvrij|bez glutenu|sem gluten|sans gluten/i

function gfTerms(hint) {
  const text = String(hint || '').toLowerCase()
  if (/ital|roma|milan|napol|torino|florence|firenze|venez/.test(text)) return ['senza glutine', 'gluten free']
  if (/fran|paris|lyon|belg|brux/.test(text)) return ['sans gluten', 'gluten free']
  if (/aleman|deutsch|berlin|munich|wien|zurich|suiz|aust/.test(text)) return ['glutenfrei', 'gluten free']
  if (/espa|madrid|barcelona|valencia|sevilla/.test(text)) return ['sin gluten', 'celiaco']
  if (/portug|lisboa|brasil|rio de|s[aã]o paulo/.test(text)) return ['sem gluten', 'gluten free']
  if (/neder|amsterdam|rotterdam/.test(text)) return ['glutenvrij', 'gluten free']
  if (/polsk|warsz|krak/.test(text)) return ['bez glutenu', 'gluten free']
  if (/japan|tokyo|osaka|京都/.test(text)) return ['グルテンフリー', 'gluten free']
  if (/united states|usa|new york|london|dublin|sydney|toronto|canada|england/.test(text)) {
    return ['gluten free', 'celiac']
  }
  return ['gluten free', 'sin gluten']
}

function typeFromOsm(value) {
  const text = String(value || '').toLowerCase()
  if (/bakery|pastry|confection/.test(text)) return 'Panadería'
  if (/cafe|coffee/.test(text)) return 'Café'
  if (/restaurant|fast_food|pizza/.test(text)) return 'Restaurante'
  if (/ice_cream/.test(text)) return 'Heladería'
  if (/supermarket|convenience|health|greengrocer|deli|chemist/.test(text)) return 'Dietética'
  return 'Sin TACC'
}

function photonToGuide(feat) {
  const props = feat.properties || {}
  const coords = feat.geometry?.coordinates
  if (!Array.isArray(coords) || coords.length < 2) return null
  if (props.osm_key === 'place') return null
  const name = String(props.name || '').trim()
  if (!name || !GF_NAME.test(name)) return null
  const [lon, lat] = coords
  const osmType = props.osm_type === 'R' ? 'relation' : props.osm_type === 'W' ? 'way' : 'node'
  return {
    id: `osm-${osmType}-${props.osm_id || `${lat.toFixed(5)}-${lon.toFixed(5)}`}`,
    name,
    type: typeFromOsm(`${props.osm_value || ''} ${props.type || ''}`),
    lat: Number(lat),
    lon: Number(lon),
    address: [props.street, props.housenumber].filter(Boolean).join(' '),
    area: [props.city, props.country].filter(Boolean).join(', '),
    level: /only|100\s*%|dedicad|exclusiv/i.test(name) ? 'dedicado' : 'opciones',
    guide: 'OpenStreetMap',
    guideUrl: props.osm_id ? `https://www.openstreetmap.org/${osmType}/${props.osm_id}` : '',
  }
}

function nominatimToGuide(hit) {
  const name = String(hit.name || hit.display_name || '').split(',')[0].trim()
  if (!name || !GF_NAME.test(name)) return null
  if (/^(city|town|village|state|country|administrative)$/i.test(hit.addresstype || hit.type || '')) return null
  return {
    id: `osm-${hit.osm_type || 'node'}-${hit.osm_id || `${hit.lat}-${hit.lon}`}`,
    name,
    type: typeFromOsm(`${hit.type || ''} ${hit.class || ''}`),
    lat: Number(hit.lat),
    lon: Number(hit.lon),
    address: String(hit.display_name || '').split(',').slice(1, 3).join(',').trim(),
    area: '',
    level: /only|100\s*%|dedicad|exclusiv/i.test(name) ? 'dedicado' : 'opciones',
    guide: 'OpenStreetMap',
    guideUrl: hit.osm_id ? `https://www.openstreetmap.org/${hit.osm_type || 'node'}/${hit.osm_id}` : '',
  }
}

/** Locales publicados en OSM/Photon cerca de un punto, sin inventar nombres. */
export async function searchPublishedGf(lat, lon, km, options = {}) {
  const origin = { lat, lon }
  const terms = gfTerms(`${options.hint || ''} ${options.countryName || ''} ${options.countryCode || ''}`)
  const signal = options.signal
  const found = []

  await Promise.all(
    terms.slice(0, 2).map(async (term) => {
      const data = await fetchJson(
        `https://photon.komoot.io/api/?q=${encodeURIComponent(term)}&lat=${lat}&lon=${lon}&limit=25`,
        { signal },
        8000,
      ).catch(() => null)
      for (const feat of data?.features || []) {
        const place = photonToGuide(feat)
        if (place && distanceKm(origin, place) <= km) found.push(place)
      }
    }),
  )

  if (found.length >= 8) return found

  const dLat = km / 111
  const dLon = km / (111 * Math.max(0.2, Math.cos(toRad(lat))))
  const viewbox = `${lon - dLon},${lat + dLat},${lon + dLon},${lat - dLat}`
  const hits = await fetchJson(
    `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=20&bounded=1&viewbox=${viewbox}&q=${encodeURIComponent(terms[0])}`,
    { signal, headers: { Accept: 'application/json' } },
    8000,
  ).catch(() => [])
  for (const hit of Array.isArray(hits) ? hits : []) {
    const place = nominatimToGuide(hit)
    if (place && distanceKm(origin, place) <= km) found.push(place)
  }
  return found
}

export async function searchPlace(query) {
  const q = String(query || '').trim()
  if (!q) return null
  try {
    const data = await fetchJson(`https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=1`)
    const feat = data?.features?.[0]
    const coords = feat?.geometry?.coordinates
    if (Array.isArray(coords) && coords.length >= 2) {
      const [lon, lat] = coords
      const props = feat.properties || {}
      const label = [props.name, props.city, props.state, props.country].filter(Boolean).join(', ')
      return { lat: Number(lat), lon: Number(lon), label: label || q }
    }
  } catch {
    // Nominatim
  }
  const hits = await fetchJson(
    `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(q)}`,
  )
  const hit = Array.isArray(hits) ? hits[0] : null
  if (!hit) return null
  return { lat: Number(hit.lat), lon: Number(hit.lon), label: hit.display_name || q }
}

export async function reverseLabel(lat, lon) {
  const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=es`
  const data = await fetchJson(url)
  return (
    data.locality ||
    data.city ||
    data.principalSubdivision ||
    data.countryName ||
    `${lat.toFixed(3)}, ${lon.toFixed(3)}`
  )
}

async function ipLocation() {
  const data = await fetchJson('https://ipapi.co/json/')
  if (!data.latitude || !data.longitude) throw new Error('no-ip')
  return {
    lat: Number(data.latitude),
    lon: Number(data.longitude),
    label: data.city || data.region || 'Tu zona',
    source: 'ip',
  }
}

export async function detectLocation(onEarly) {
  let ip = null
  const ipTask = ipLocation()
    .then((data) => {
      ip = data
      return data
    })
    .catch(() => null)

  const gpsTask = gpsPosition().then(async (pos) => {
    const lat = pos.coords.latitude
    const lon = pos.coords.longitude
    let label = 'Tu ubicación'
    try {
      label = await reverseLabel(lat, lon)
    } catch {
      label = 'Tu ubicación'
    }
    return { lat, lon, label, source: 'gps', accuracy: pos.coords.accuracy }
  })

  const early = await Promise.race([
    gpsTask,
    ipTask.then(
      (data) =>
        new Promise((resolve) => {
          setTimeout(() => resolve(data), 800)
        }),
    ),
  ])
  if (early) onEarly?.(early)

  try {
    return await gpsTask
  } catch {
    const fallback = ip || (await ipTask)
    if (!fallback) throw new Error('no-loc')
    return fallback
  }
}
