export function formatAddress({ street, streetNumber, neighborhood, province, country }) {
  return `${String(street || '').trim()} ${String(streetNumber || '').trim()}, ${String(neighborhood || '').trim()}, ${String(province || '').trim()}, ${String(country || '').trim()}`
}

export function canSavePlace(place) {
  if (!place?.name || !place.image || !place.description || !place.hours) return false
  if (!place.country || !place.province || !place.neighborhood || !place.street || !place.streetNumber) return false
  if (place.lat == null || place.lat === '' || place.lon == null || place.lon === '') return false
  return Number.isFinite(Number(place.lat)) && Number.isFinite(Number(place.lon))
}

export function foldName(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/^(provincia|estado|state|region|comunidad autonoma|comunidad) de /, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function nominatimToComponents(address) {
  const row = address || {}
  const countryCode = String(row.country_code || '').toUpperCase()
  const provinceCode = String(row['ISO3166-2-lvl4'] || '').split('-').pop() || ''
  const provinceName = row.state || row.province || row.region || ''
  const barrio =
    row.neighbourhood ||
    row.suburb ||
    row.city_district ||
    row.quarter ||
    row.town ||
    row.city ||
    row.village ||
    row.municipality ||
    row.hamlet ||
    ''
  return [
    row.house_number ? { long_name: String(row.house_number), short_name: String(row.house_number), types: ['street_number'] } : null,
    row.road ? { long_name: row.road, short_name: row.road, types: ['route'] } : null,
    barrio ? { long_name: barrio, short_name: barrio, types: ['neighborhood'] } : null,
    provinceName ? { long_name: provinceName, short_name: provinceCode, types: ['administrative_area_level_1'] } : null,
    row.country ? { long_name: row.country, short_name: countryCode, types: ['country'] } : null,
  ].filter(Boolean)
}

export function pickComponent(components, types) {
  for (const type of types) {
    const found = (components || []).find((item) => (item.types || []).includes(type))
    if (found) return found
  }
  return null
}

export function matchOption(options, label, code) {
  if (code) {
    const byCode = (options || []).find((item) => item.code === code)
    if (byCode) return byCode
  }
  const wanted = foldName(label)
  if (!wanted) return null
  return (
    (options || []).find((item) => foldName(item.name) === wanted) ||
    (options || []).find((item) => {
      const name = foldName(item.name)
      return name && (name.includes(wanted) || wanted.includes(name))
    }) ||
    null
  )
}

/**
 * Completa país, provincia, barrio, calle y altura con lo que devuelve el mapa.
 * Si el barrio no está en la lista, lo agrega.
 */
export function applyMapToAddress({ components, countries, provinces, neighborhoods }) {
  const countryComp = pickComponent(components, ['country'])
  const provinceComp = pickComponent(components, ['administrative_area_level_1'])
  const barrioComp = pickComponent(components, ['neighborhood', 'sublocality_level_1', 'sublocality', 'locality'])
  const streetComp = pickComponent(components, ['route'])
  const numberComp = pickComponent(components, ['street_number'])

  const country = matchOption(countries, countryComp?.long_name, countryComp?.short_name)
  const countryCode = country?.code || ''
  const countryName = country?.name || countryComp?.long_name || ''

  let nextProvinces = provinces || []
  const province = matchOption(nextProvinces, provinceComp?.long_name, provinceComp?.short_name)
  let provinceCode = province?.code || ''
  let provinceName = province?.name || ''
  if (!province && provinceComp?.long_name) {
    provinceCode = provinceComp.short_name || provinceComp.long_name
    provinceName = provinceComp.long_name
    nextProvinces = [...nextProvinces, { code: provinceCode, name: provinceName }]
  }

  const barrioName = barrioComp?.long_name || ''
  let nextNeighborhoods = [...(neighborhoods || [])]
  if (barrioName && !nextNeighborhoods.some((item) => foldName(item) === foldName(barrioName))) {
    nextNeighborhoods = [...nextNeighborhoods, barrioName].sort((a, b) => a.localeCompare(b, 'es'))
  }

  return {
    countryCode,
    countryName,
    provinceCode,
    provinceName,
    provinces: nextProvinces,
    neighborhood: barrioName,
    neighborhoods: nextNeighborhoods,
    street: streetComp?.long_name || '',
    streetNumber: numberComp?.long_name || '',
  }
}
