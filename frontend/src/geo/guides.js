import { fetchApiJson } from './api.js'
import { distanceKm } from './geo.js'

/**
 * Lugares sin TACC tomados de las guías que publican el dato. Todo corre en el
 * navegador, así funciona igual en desarrollo y en Hostinger:
 *  - CeliMap no habilita CORS, así que pasa por public/gf-guides.php (en Nexo
 *    el gemelo de desarrollo atiende el mismo path).
 *  - El mapa de SinTaccto se baja directo desde Google, que sí lo permite.
 */

const CELIMAP_PATH = '/gf-guides.php'
const CELIMAP_PAGE = 'https://www.celimap.com.ar/lugar'
const SINTACCTO_MID = '18wKMA95xo1ZX2iyGu9_-iv3Jr9gilM4'
const SINTACCTO_KML = `https://www.google.com/maps/d/kml?mid=${SINTACCTO_MID}&forcekml=1`
const SINTACCTO_POST = 'https://sintaccto.com/sintacc/2024/01/15/mapa-celiaco-de-la-ciudad-de-buenos-aires/'

const CACHE_PREFIX = 'sgl-guias-v1'
const CACHE_KM = 60
const DAY_MS = 24 * 60 * 60 * 1000

const TYPE_LABEL = {
  restaurant: 'Restaurante',
  bakery: 'Panadería',
  cafe: 'Café',
  bar: 'Bar',
  store: 'Dietética',
  icecream: 'Heladería',
  pizzeria: 'Pizzería',
  other: 'Sin TACC',
}

const DEDICATED = new Set(['dedicated_gf', '100_gf', 'dedicado'])
const OPTIONS = new Set(['gf_options', 'opciones_sin_tacc', 'limited'])
const DAY_LINE = /^(lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo)\b/i

function levelOf(value) {
  if (DEDICATED.has(value)) return 'dedicado'
  if (OPTIONS.has(value)) return 'opciones'
  return ''
}

/** Algunos registros llegan como UTF-8 leído en Latin-1 ("MiÃ©rcoles"). */
function fixText(value) {
  const text = String(value || '').trim()
  if (!/[ÃÂ][\u0080-\u00bf]/.test(text)) return text
  for (const code of text) {
    if (code.codePointAt(0) > 255) return text
  }
  try {
    const bytes = Uint8Array.from([...text].map((char) => char.charCodeAt(0)))
    return new TextDecoder('utf-8', { fatal: false }).decode(bytes)
  } catch {
    return text
  }
}

/** "Italia 136, B1870 Avellaneda, Provincia de …, Argentina" es demasiado. */
function shortAddress(value) {
  const parts = fixText(value)
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part && !/^argentina$/i.test(part) && !/^provincia de/i.test(part))
  const street = parts[0] || ''
  const town = (parts[1] || '').replace(/^[A-Z]?\d{4}[A-Z]{0,3}\s*/, '')
  return [street, town].filter(Boolean).join(', ')
}

async function fetchText(url, timeoutMs) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, { signal: controller.signal })
    if (!response.ok) throw new Error(`${url} → ${response.status}`)
    return await response.text()
  } finally {
    clearTimeout(timer)
  }
}

async function loadCelimap() {
  const data = await fetchApiJson(CELIMAP_PATH, 30000)
  return (data.places || [])
    .filter((item) => item?.status !== 'rejected' && item?.location?.lat && item?.location?.lng)
    .map((item) => {
      const level = levelOf(item.safetyLevel) || levelOf((item.tags || [])[0]) || 'opciones'
      return {
        id: `cm-${item._id}`,
        name: fixText(item.name),
        type: TYPE_LABEL[item.type] || 'Sin TACC',
        lat: item.location.lat,
        lon: item.location.lng,
        address: shortAddress(item.address),
        area: /\d/.test(item.neighborhood || '') ? '' : fixText(item.neighborhood),
        level,
        hours: fixText(item.openingHours),
        photos: (item.photos || []).filter((url) => /^https?:\/\//.test(url)).slice(0, 8),
        googlePlaceId: item.googlePlaceId || '',
        guide: 'CeliMap',
        guideUrl: item.slug ? `${CELIMAP_PAGE}/${item.slug}` : 'https://www.celimap.com.ar/mapa',
      }
    })
    .filter((place) => place.name)
}

function kmlPlainText(html) {
  return String(html || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|tr)>/gi, '\n')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
}

/** La ficha del mapa viene como "-Etiqueta: valor" y los horarios por día. */
function kmlFields(description) {
  const lines = kmlPlainText(description)
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .filter(Boolean)

  const fields = {}
  let current = ''
  for (const line of lines) {
    const head = line.match(/^-?\s*([^:]{3,48}?)\s*:\s*(.*)$/)
    if (head && !DAY_LINE.test(line)) {
      current = head[1]
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
      fields[current] = head[2] ? [head[2]] : []
      continue
    }
    if (current) fields[current].push(line)
  }
  return Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, value.join('\n').trim()]))
}

function sintacctoType(value) {
  const text = String(value || '').toLowerCase()
  if (/panader|pasteler/.test(text)) return 'Panadería'
  if (/helader/.test(text)) return 'Heladería'
  if (/caf[eé]|cafeter|casa de t[eé]/.test(text)) return 'Café'
  if (/bar\b|cervecer|bodeg[oó]n/.test(text)) return 'Bar'
  if (/pizzer/.test(text)) return 'Pizzería'
  if (/almac[eé]n|diet[eé]tica|tienda|mercado/.test(text)) return 'Dietética'
  if (/restaurante|parrilla|resto|sushi|bistr/.test(text)) return 'Restaurante'
  return 'Sin TACC'
}

async function loadSintaccto() {
  const xml = await fetchText(SINTACCTO_KML, 30000)
  const doc = new DOMParser().parseFromString(xml, 'text/xml')
  const places = []

  for (const mark of doc.getElementsByTagName('Placemark')) {
    const name = (mark.getElementsByTagName('name')[0]?.textContent || '').trim()
    const point = mark.getElementsByTagName('coordinates')[0]?.textContent || ''
    const [lon, lat] = point.trim().split(',').map(Number)
    if (!name || !Number.isFinite(lat) || !Number.isFinite(lon)) continue

    const fields = kmlFields(mark.getElementsByTagName('description')[0]?.textContent)
    const kitchen = fields.cocina || fields['nivel de cuidados'] || ''
    const dedicated = /100\s*%|libre de gluten|sin gluten|sin tacc/i.test(kitchen) && !/mixta/i.test(kitchen)

    places.push({
      id: `st-${lat.toFixed(5)}-${lon.toFixed(5)}`,
      name,
      type: sintacctoType(fields['tipo de comercio']),
      lat,
      lon,
      address: fields.direccion || '',
      area: '',
      level: dedicated ? 'dedicado' : 'opciones',
      hours: (fields['horarios de atencion'] || '')
        .split('\n')
        .filter((line) => DAY_LINE.test(line))
        .join('\n'),
      photos: [],
      kitchen,
      supply: fields['materia prima'] || '',
      mode: fields.modalidad || '',
      care: fields['cuidados para evitar la contaminacion cruzada'] || '',
      guide: 'SinTaccto',
      guideUrl: SINTACCTO_POST,
    })
  }
  return places
}

function normalizeName(value) {
  return String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/** El mismo local en dos guías: se queda el registro más completo. */
export function mergeGuidePlaces(list) {
  const byKey = new Map()
  for (const place of list) {
    const key = `${normalizeName(place.name)}|${place.lat.toFixed(3)}|${place.lon.toFixed(3)}`
    const previous = byKey.get(key)
    if (!previous) {
      byKey.set(key, { ...place, guides: [...new Set([...(place.guides || []), place.guide].filter(Boolean))] })
      continue
    }
    previous.guides = [...new Set([...previous.guides, ...(place.guides || []), place.guide].filter(Boolean))]
    if (!previous.photos?.length && place.photos?.length) previous.photos = place.photos
    for (const field of ['hours', 'address', 'area', 'phone', 'website', 'kitchen', 'supply', 'mode', 'care']) {
      if (!previous[field] && place[field]) previous[field] = place[field]
    }
    if (previous.level !== 'dedicado' && place.level === 'dedicado') previous.level = 'dedicado'
  }
  return [...byKey.values()]
}

function readCache(key) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const data = JSON.parse(raw)
    if (!data?.at || Date.now() - data.at > DAY_MS) return null
    return data.places || null
  } catch {
    return null
  }
}

function writeCache(key, places) {
  try {
    localStorage.setItem(key, JSON.stringify({ at: Date.now(), places }))
  } catch {
    // el cupo del navegador es un extra, no un requisito
  }
}

/**
 * Lugares de las guías a menos de `km`, el más cercano primero. El listado del
 * país se guarda un día en el navegador, así la segunda visita es inmediata.
 */
export async function loadGuidePlaces(lat, lon, km) {
  const origin = { lat, lon }
  const key = `${CACHE_PREFIX}:${lat.toFixed(1)}:${lon.toFixed(1)}`

  let near = readCache(key)
  if (!near) {
    const [celimap, sintaccto] = await Promise.all([
      loadCelimap().catch(() => []),
      loadSintaccto().catch(() => []),
    ])
    if (!celimap.length && !sintaccto.length) return []

    near = mergeGuidePlaces([...celimap, ...sintaccto]).filter(
      (place) => distanceKm(origin, place) <= CACHE_KM,
    )
    // Si una guía falló, la lista queda incompleta: se usa, pero no se guarda.
    if (celimap.length && sintaccto.length) writeCache(key, near)
  }

  return near
    .map((place) => ({ ...place, distanceKm: distanceKm(origin, place) }))
    .filter((place) => place.distanceKm <= km)
    .sort((a, b) => a.distanceKm - b.distanceKm)
}

/** OpenStreetMap suma locales que las guías todavía no cargaron. */
export function osmGlutenQuery(lat, lon, km) {
  const radius = Math.round(km * 1000)
  return `[out:json][timeout:20];
(
  node["diet:gluten_free"~"yes|only|limited"](around:${radius},${lat},${lon});
  way["diet:gluten_free"~"yes|only|limited"](around:${radius},${lat},${lon});
  node["name"~"sin *tacc|celia|gluten",i](around:${radius},${lat},${lon});
);
out tags center;`
}

export function osmToGuidePlace(element) {
  const tags = element.tags || {}
  const name = tags.name || tags.brand || ''
  const point = Number.isFinite(element.lat)
    ? { lat: element.lat, lon: element.lon }
    : element.center
      ? { lat: element.center.lat, lon: element.center.lon }
      : null
  if (!name || !point) return null

  const diet = String(tags['diet:gluten_free'] || '').toLowerCase()
  const named = /sin\s*tacc|sintacc|celia|gluten/i.test(name)
  const level = diet === 'only' ? 'dedicado' : diet || named ? 'opciones' : ''
  if (!level) return null

  const type =
    tags.shop === 'bakery'
      ? 'Panadería'
      : tags.shop === 'health_food'
        ? 'Dietética'
        : tags.amenity === 'cafe'
          ? 'Café'
          : tags.amenity === 'restaurant'
            ? 'Restaurante'
            : tags.shop
              ? 'Dietética'
              : 'Sin TACC'

  return {
    id: `osm-${element.type || 'n'}-${element.id}`,
    name,
    type,
    lat: point.lat,
    lon: point.lon,
    address: [tags['addr:street'], tags['addr:housenumber']].filter(Boolean).join(' '),
    area: [tags['addr:suburb'], tags['addr:city']].filter(Boolean).join(', '),
    level,
    hours: tags.opening_hours || '',
    photos: tags.image && /^https?:\/\//.test(tags.image) ? [tags.image] : [],
    phone: tags.phone || tags['contact:phone'] || '',
    website: tags.website || tags['contact:website'] || '',
    guide: 'OpenStreetMap',
    guideUrl: `https://www.openstreetmap.org/${element.type || 'node'}/${element.id}`,
  }
}
