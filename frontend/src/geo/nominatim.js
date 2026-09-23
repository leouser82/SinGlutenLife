import { nominatimToComponents } from './placeAddress.js'

const SEARCH = 'https://nominatim.openstreetmap.org/search'
const REVERSE = 'https://nominatim.openstreetmap.org/reverse'

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function placeQueries({ street, streetNumber, neighborhood, province, country }) {
  const tail = [neighborhood, province, country].map((item) => String(item || '').trim()).filter(Boolean).join(', ')
  const road = String(street || '').trim()
  const number = String(streetNumber || '').trim()
  const queries = []
  if (road && number && tail) queries.push(`${road} ${number}, ${tail}`)
  if (road && tail) queries.push(`${road}, ${tail}`)
  if (tail) queries.push(tail)
  return [...new Set(queries)]
}

export function pointFromNominatim(hits) {
  const hit = (Array.isArray(hits) ? hits : []).find(
    (item) => Number.isFinite(Number(item?.lat)) && Number.isFinite(Number(item?.lon)),
  )
  if (!hit) return null
  return { lat: Number(hit.lat), lon: Number(hit.lon) }
}

async function getJson(url, fetchImpl) {
  const response = await fetchImpl(url, { headers: { 'Accept-Language': 'es' } })
  if (!response.ok) throw new Error('nominatim')
  return response.json()
}

export async function geocodePlaceAddress(parts, fetchImpl = globalThis.fetch, wait = delay) {
  const queries = placeQueries(parts)
  for (let index = 0; index < queries.length; index += 1) {
    if (index > 0) await wait(1100)
    try {
      const hits = await getJson(`${SEARCH}?format=jsonv2&limit=1&q=${encodeURIComponent(queries[index])}`, fetchImpl)
      const point = pointFromNominatim(hits)
      if (point) return point
    } catch (error) {
      if (index === queries.length - 1) throw error
    }
  }
  return null
}

export async function reversePlace(lat, lon, fetchImpl = globalThis.fetch) {
  const data = await getJson(
    `${REVERSE}?format=jsonv2&addressdetails=1&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`,
    fetchImpl,
  )
  return nominatimToComponents(data?.address)
}
