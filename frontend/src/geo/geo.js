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

function cityOf(hint) {
  const text = String(hint || '').replace(/^punto elegido\s*·\s*/i, '').trim()
  if (!text || /^-?\d+[.,]\d+/.test(text)) return ''
  return text.split(',')[0].trim()
}

function gfTerms(hint) {
  const text = String(hint || '').toLowerCase()
  const local = []
  if (/ital|roma|milan|napol|torino|florence|firenze|venez/.test(text)) local.push('senza glutine')
  if (/fran|paris|lyon|belg|brux|genev|suisse/.test(text)) local.push('sans gluten')
  if (/aleman|deutsch|berlin|munich|wien|zurich|suiz|aust/.test(text)) local.push('glutenfrei')
  if (/espa|madrid|barcelona|mexico|m[eé]xico|chile|uruguay|peru|lima|colombia|bogot|ecuador/.test(text)) {
    local.push('sin gluten')
  }
  if (/portug|lisboa|brasil|rio de|s[aã]o paulo/.test(text)) local.push('sem gluten')
  if (/neder|amsterdam|rotterdam/.test(text)) local.push('glutenvrij')
  if (/polsk|warsz|krak/.test(text)) local.push('bez glutenu')
  if (/japan|tokyo|osaka|kyoto|日本/.test(text)) local.push('グルテンフリー')
  if (/korea|seoul|서울/.test(text)) local.push('글루텐프리')
  if (/china|beijing|shanghai|北京|上海/.test(text)) local.push('无麸质')
  if (/thai|bangkok/.test(text)) local.push('gluten free')
  if (/turk|istanbul/.test(text)) local.push('glutensiz')
  if (/sweden|stockholm|norway|oslo|denmark/.test(text)) local.push('glutenfri')
  if (/czech|prague|praha/.test(text)) local.push('bez lepku')
  return [...new Set([...local, 'gluten free', 'celiac'])]
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

function photonUrl(query, lat, lon) {
  const near = Number.isFinite(lat) && Number.isFinite(lon) ? `&lat=${lat}&lon=${lon}` : ''
  return `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}${near}&limit=25`
}

/** Locales publicados en OSM/Photon cerca de un punto, en cualquier ciudad. */
export async function searchPublishedGf(lat, lon, km, options = {}) {
  const origin = { lat, lon }
  const hint = `${options.hint || ''} ${options.countryName || ''} ${options.countryCode || ''}`
  const terms = gfTerms(hint)
  const city = cityOf(options.hint)
  const signal = options.signal
  const queries = []
  for (const term of terms.slice(0, 3)) {
    queries.push({ q: term, near: true })
    if (city) queries.push({ q: `${term} ${city}`, near: false })
  }

  const found = []
  await Promise.all(
    queries.slice(0, 6).map(async (item) => {
      const data = await fetchJson(
        photonUrl(item.q, item.near ? lat : undefined, item.near ? lon : undefined),
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

  const look = city ? `${terms[0]} ${city}` : terms[0]
  const dLat = km / 111
  const dLon = km / (111 * Math.max(0.2, Math.cos(toRad(lat))))
  const viewbox = `${lon - dLon},${lat + dLat},${lon + dLon},${lat - dLat}`
  const hits = await fetchJson(
    `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=25&bounded=${city ? 0 : 1}&viewbox=${viewbox}&q=${encodeURIComponent(look)}`,
    { signal, headers: { Accept: 'application/json' } },
    8000,
  ).catch(() => [])
  for (const hit of Array.isArray(hits) ? hits : []) {
    const place = nominatimToGuide(hit)
    if (place && distanceKm(origin, place) <= km) found.push(place)
  }
  return found
}

const KNOWN_CITY = [
  { test: /par[ií]s/i, lat: 48.8566, lon: 2.3522, label: 'París, Francia' },
  { test: /roma|rome/i, lat: 41.9028, lon: 12.4964, label: 'Roma, Italia' },
  { test: /madrid/i, lat: 40.4168, lon: -3.7038, label: 'Madrid, España' },
  { test: /barcelona/i, lat: 41.3874, lon: 2.1686, label: 'Barcelona, España' },
  { test: /london|londres/i, lat: 51.5074, lon: -0.1278, label: 'Londres, Reino Unido' },
  { test: /berlin/i, lat: 52.52, lon: 13.405, label: 'Berlín, Alemania' },
  { test: /munich|m[uü]nchen/i, lat: 48.1351, lon: 11.582, label: 'Múnich, Alemania' },
  { test: /new york|nueva york|\bnyc\b/i, lat: 40.7128, lon: -74.006, label: 'Nueva York, Estados Unidos' },
  { test: /lisboa|lisbon/i, lat: 38.7223, lon: -9.1393, label: 'Lisboa, Portugal' },
  { test: /montevideo/i, lat: -34.9011, lon: -56.1645, label: 'Montevideo, Uruguay' },
  { test: /santiago.*chile|chile.*santiago/i, lat: -33.4489, lon: -70.6693, label: 'Santiago, Chile' },
  { test: /s[aã]o paulo|sao paulo/i, lat: -23.5505, lon: -46.6333, label: 'São Paulo, Brasil' },
  { test: /ciudad de m[eé]xico|mexico city|\bcdmx\b/i, lat: 19.4326, lon: -99.1332, label: 'Ciudad de México, México' },
  { test: /tokio|tokyo/i, lat: 35.6762, lon: 139.6503, label: 'Tokio, Japón' },
  { test: /\blima\b/i, lat: -12.0464, lon: -77.0428, label: 'Lima, Perú' },
  { test: /bangkok/i, lat: 13.7563, lon: 100.5018, label: 'Bangkok, Tailandia' },
]

function featureLabel(props) {
  return [props.name, props.city, props.state, props.country].filter(Boolean).join(', ')
}

function pickCityFeature(features, query) {
  const text = String(query || '').toLowerCase()
  let best = null
  let bestScore = -99
  for (const feat of features || []) {
    const props = feat.properties || {}
    const kind = `${props.osm_key || ''} ${props.osm_value || ''} ${props.type || ''}`.toLowerCase()
    const label = featureLabel(props).toLowerCase()
    let score = 0
    if (props.osm_key === 'place' && /city|town|municipality|country/.test(kind)) score += 8
    else if (props.osm_key === 'place') score += 4
    if (/hotel|restaurant|shop|street|highway/.test(kind)) score -= 6
    if (/fran/.test(text) && /france|francia/.test(label)) score += 5
    if (/ital/.test(text) && /italy|italia/.test(label)) score += 5
    if (/espa|spain/.test(text) && /spain|espa/.test(label)) score += 5
    if (/aleman|germany|deutsch/.test(text) && /germany|deutschland/.test(label)) score += 5
    if (/reino|united kingdom|england/.test(text) && /united kingdom|england/.test(label)) score += 5
    if (score > bestScore) {
      best = feat
      bestScore = score
    }
  }
  return best
}

export async function searchPlace(query) {
  const q = String(query || '').trim()
  if (!q) return null
  const known = KNOWN_CITY.find((item) => item.test.test(q))
  if (known) return { lat: known.lat, lon: known.lon, label: known.label }
  try {
    const data = await fetchJson(`https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=8`)
    const feat = pickCityFeature(data?.features, q) || data?.features?.[0]
    const coords = feat?.geometry?.coordinates
    if (Array.isArray(coords) && coords.length >= 2) {
      const [lon, lat] = coords
      const props = feat.properties || {}
      return { lat: Number(lat), lon: Number(lon), label: featureLabel(props) || q }
    }
  } catch {
    // Nominatim
  }
  const hits = await fetchJson(
    `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&q=${encodeURIComponent(q)}`,
  )
  const city = (Array.isArray(hits) ? hits : []).find((item) => /city|town|administrative/.test(item.addresstype || item.type || ''))
  const hit = city || (Array.isArray(hits) ? hits[0] : null)
  if (!hit) return null
  return { lat: Number(hit.lat), lon: Number(hit.lon), label: hit.display_name || q }
}

/** Punto de una dirección, para ordenar el lugar del usuario por cercanía. */
export async function geocodeAddress(query) {
  const q = String(query || '').trim()
  if (!q) return null
  try {
    const data = await fetchJson(`https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=1`)
    const feat = data?.features?.[0]
    const coords = feat?.geometry?.coordinates
    if (Array.isArray(coords) && coords.length >= 2) {
      const [lon, lat] = coords
      return { lat: Number(lat), lon: Number(lon), label: featureLabel(feat.properties || {}) || q }
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
