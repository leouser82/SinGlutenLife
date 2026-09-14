const CACHE_KEY = 'sgl-place-cache-v1'

export function rememberPlaces(places, pharmacies) {
  try {
    const prev = JSON.parse(sessionStorage.getItem(CACHE_KEY) || '{}')
    for (const place of [...places, ...pharmacies]) {
      prev[place.id] = place
    }
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(prev))
  } catch {
    // ignore quota
  }
}

export function getCachedPlace(id) {
  try {
    return JSON.parse(sessionStorage.getItem(CACHE_KEY) || '{}')[id] || null
  } catch {
    return null
  }
}
