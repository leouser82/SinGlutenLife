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
  try {
    const response = await fetch(url, { ...options, signal: controller.signal })
    if (!response.ok) throw new Error(`http-${response.status}`)
    return await response.json()
  } finally {
    clearTimeout(timer)
  }
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
