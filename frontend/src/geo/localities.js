const GEOREF = 'https://apis.datos.gob.ar/georef/api/localidades'
const cache = new Map()

export function namesFromGeoref(payload) {
  const rows = Array.isArray(payload?.localidades) ? payload.localidades : []
  return [...new Set(rows.map((row) => String(row?.nombre || '').trim()).filter(Boolean))]
}

export async function fetchArgentinaLocalities(provinceName, fetchImpl = globalThis.fetch) {
  const names = []
  let inicio = 0
  for (let page = 0; page < 20; page += 1) {
    const url = `${GEOREF}?provincia=${encodeURIComponent(provinceName)}&campos=nombre&max=5000&inicio=${inicio}`
    const response = await fetchImpl(url)
    if (!response.ok) throw new Error('georef')
    const payload = await response.json()
    const batch = namesFromGeoref(payload)
    names.push(...batch)
    const total = Number(payload?.total)
    inicio += batch.length
    if (!batch.length || !Number.isFinite(total) || inicio >= total) break
  }
  return [...new Set(names)]
}

async function packagedCities(countryCode, provinceCode) {
  if (!countryCode || !provinceCode) return []
  const { City } = await import('country-state-city')
  return City.getCitiesOfState(countryCode, provinceCode).map((item) => item.name)
}

export async function loadLocalities({ countryCode, provinceCode, provinceName }) {
  const key = `${countryCode}|${provinceCode}|${provinceName}`
  if (cache.has(key)) return cache.get(key)
  let names = []
  if (countryCode === 'AR' && provinceName) {
    try {
      names = await fetchArgentinaLocalities(provinceName)
    } catch {
      names = []
    }
  }
  if (!names.length) names = await packagedCities(countryCode, provinceCode)
  if (names.length) cache.set(key, names)
  return names
}
