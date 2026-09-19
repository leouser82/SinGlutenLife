import { distanceKm } from './geo.js'
import it from './worldLists/it.json'
import es from './worldLists/es.json'
import fr from './worldLists/fr.json'
import de from './worldLists/de.json'
import uk from './worldLists/uk.json'
import us from './worldLists/us.json'
import mx from './worldLists/mx.json'
import br from './worldLists/br.json'
import pt from './worldLists/pt.json'
import cl from './worldLists/cl.json'
import uy from './worldLists/uy.json'

const LISTS = { it, es, fr, de, uk, us, mx, br, pt, cl, uy }

const BOX = [
  { cc: 'it', south: 36.4, north: 47.2, west: 6.5, east: 18.6 },
  { cc: 'es', south: 35.9, north: 43.9, west: -9.5, east: 4.4 },
  { cc: 'pt', south: 36.8, north: 42.3, west: -9.6, east: -6.1 },
  { cc: 'fr', south: 42.2, north: 51.2, west: -5.2, east: 8.3 },
  { cc: 'de', south: 47.2, north: 55.2, west: 5.8, east: 15.1 },
  { cc: 'uk', south: 49.8, north: 58.8, west: -8.7, east: 1.8 },
  { cc: 'us', south: 24.4, north: 49.5, west: -125, east: -66.8 },
  { cc: 'mx', south: 14.5, north: 32.8, west: -118.5, east: -86.5 },
  { cc: 'br', south: -34, north: 5.3, west: -74.1, east: -34.6 },
  { cc: 'cl', south: -56.1, north: -17.4, west: -76, east: -66.3 },
  { cc: 'uy', south: -35.2, north: -30, west: -58.5, east: -53.1 },
]

const CITY_IN = [
  { test: /roma|rome/i, address: /roma|rome/i },
  { test: /milan|milano/i, address: /milan|milano/i },
  { test: /florenc|firenze/i, address: /florenc|firenze/i },
  { test: /napol|naples/i, address: /napol|naples/i },
  { test: /venice|venez/i, address: /venez|venice/i },
  { test: /madrid/i, address: /madrid/i },
  { test: /barcelona/i, address: /barcelona/i },
  { test: /sevilla|seville/i, address: /sevilla|seville/i },
  { test: /valencia/i, address: /valencia|valència/i },
  { test: /paris/i, address: /paris/i },
  { test: /lyon/i, address: /lyon/i },
  { test: /bordeaux/i, address: /bordeaux/i },
  { test: /berlin/i, address: /berlin/i },
  { test: /munich|münchen|munchen/i, address: /münchen|munchen|munich/i },
  { test: /hamburg/i, address: /hamburg/i },
  { test: /frankfurt/i, address: /frankfurt/i },
  { test: /london/i, address: /london/i },
  { test: /edinburgh/i, address: /edinburgh/i },
  { test: /glasgow/i, address: /glasgow/i },
  { test: /manchester/i, address: /manchester/i },
  { test: /new york|nyc/i, address: /new york|,\s*ny\b/i },
  { test: /los angeles/i, address: /los angeles|woodland hills/i },
  { test: /san francisco/i, address: /san francisco/i },
  { test: /denver/i, address: /denver/i },
  { test: /seattle/i, address: /seattle/i },
  { test: /boston|cambridge, ma/i, address: /boston|cambridge, ma/i },
  { test: /ciudad de m[eé]xico|mexico city|cdmx/i, address: /ciudad de m[eé]xico|cdmx/i },
  { test: /s[aã]o paulo|sao paulo/i, address: /s[aã]o paulo/i },
  { test: /rio de janeiro/i, address: /rio de janeiro/i },
  { test: /lisboa|lisbon/i, address: /lisboa|lisbon/i },
  { test: /porto(?! alegre)/i, address: /porto/i },
  { test: /santiago/i, address: /santiago|providencia|las condes|vitacura|ñuñoa|nunoa/i },
  { test: /montevideo/i, address: /montevideo/i },
  { test: /punta del este/i, address: /punta del este/i },
]

function countryOf(lat, lon, hint) {
  const text = String(hint || '').toLowerCase()
  if (/ital|roma|milan|napol|florenc|venice|firenze/.test(text)) return 'it'
  if (/espa|spain|madrid|barcelona|valencia|sevilla/.test(text)) return 'es'
  if (/portugal|lisboa|lisbon|\bporto\b/.test(text)) return 'pt'
  if (/fran|paris|lyon|bordeaux/.test(text)) return 'fr'
  if (/aleman|berlin|munich|deutschland|germany/.test(text)) return 'de'
  if (/united kingdom|england|london|scotland|edinburgh|\buk\b/.test(text)) return 'uk'
  if (/united states|usa|new york|los angeles|san francisco/.test(text)) return 'us'
  if (/m[eé]xico|mexico|cdmx|cancun|tulum|playa del carmen/.test(text)) return 'mx'
  if (/brasil|brazil|s[aã]o paulo|rio de janeiro/.test(text)) return 'br'
  if (/chile|santiago|valpara[ií]so/.test(text)) return 'cl'
  if (/uruguay|montevideo|punta del este/.test(text)) return 'uy'
  const hit = BOX.find((box) => lat >= box.south && lat <= box.north && lon >= box.west && lon <= box.east)
  return hit?.cc || ''
}

function typeOf(value) {
  const text = String(value || '').toLowerCase()
  if (/baker|pastry|pasticc|patiss|boulang|confeit/i.test(text)) return 'Panadería'
  if (/ice cream|gelat|helad/.test(text)) return 'Heladería'
  if (/cafe|coffee|brunch/.test(text)) return 'Café'
  if (/pizza/.test(text)) return 'Pizzería'
  if (/grocery|market|store|shop|diet[eé]/.test(text)) return 'Dietética'
  if (/restaurant|food|trattoria|osteria|taco|burger/.test(text)) return 'Restaurante'
  return 'Sin TACC'
}

function pickForCity(list, hint) {
  const rule = CITY_IN.find((item) => item.test.test(hint || ''))
  if (!rule) return list
  const near = list.filter((item) => rule.address.test(item.address))
  return near.length ? near : list
}

async function geocode(address) {
  const key = `sgl-fmgf-geo:${address}`
  try {
    const saved = JSON.parse(localStorage.getItem(key) || '')
    if (Number.isFinite(saved?.lat) && Number.isFinite(saved?.lon)) return saved
  } catch {
    // nada
  }
  const response = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(address)}&limit=1`)
  if (!response.ok) return null
  const data = await response.json()
  const coords = data?.features?.[0]?.geometry?.coordinates
  if (!Array.isArray(coords) || coords.length < 2) return null
  const point = { lat: Number(coords[1]), lon: Number(coords[0]) }
  try {
    localStorage.setItem(key, JSON.stringify(point))
  } catch {
    // cupo
  }
  return point
}

/** Listas publicadas de Find Me Gluten Free (páginas de país). */
export async function loadBundledWorldPlaces(lat, lon, km, hint = '') {
  const cc = countryOf(lat, lon, hint)
  const raw = pickForCity(LISTS[cc] || [], hint).slice(0, 40)
  if (!raw.length) return []

  const located = []
  const queue = [...raw]
  async function worker() {
    while (queue.length) {
      const item = queue.shift()
      const point = await geocode(item.address).catch(() => null)
      if (!point) continue
      const distance = distanceKm({ lat, lon }, point)
      if (distance > km) continue
      located.push({
        id: `fmgf-${item.cc}-${item.url.split('/').pop() || item.name}`,
        name: item.name,
        type: typeOf(item.type),
        lat: point.lat,
        lon: point.lon,
        address: item.address,
        area: '',
        level: item.dedicated ? 'dedicado' : 'opciones',
        hours: '',
        photos: [],
        guide: 'Find Me Gluten Free',
        guideUrl: item.url,
        distanceKm: distance,
      })
    }
  }
  await Promise.all(Array.from({ length: Math.min(6, raw.length) }, () => worker()))
  return located.sort((a, b) => a.distanceKm - b.distanceKm)
}
