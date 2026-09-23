import assert from 'node:assert/strict'
import test from 'node:test'
import { geocodePlaceAddress, placeQueries, pointFromNominatim, reversePlace } from './nominatim.js'

test('la búsqueda prueba la dirección completa y, si no hay punto, la calle y el barrio', () => {
  assert.deepEqual(
    placeQueries({
      street: 'Diagonal Lisandro de la Torre',
      streetNumber: '1440',
      neighborhood: 'Berazategui',
      province: 'Buenos Aires',
      country: 'Argentina',
    }),
    [
      'Diagonal Lisandro de la Torre 1440, Berazategui, Buenos Aires, Argentina',
      'Diagonal Lisandro de la Torre, Berazategui, Buenos Aires, Argentina',
      'Berazategui, Buenos Aires, Argentina',
    ],
  )
})

test('un resultado de Nominatim se vuelve coordenada', () => {
  assert.deepEqual(pointFromNominatim([{ lat: '-34.76', lon: '-58.21' }]), { lat: -34.76, lon: -58.21 })
  assert.equal(pointFromNominatim([]), null)
})

test('si la dirección con altura no existe, el marcador usa el punto que sí resuelve', async () => {
  const calls = []
  const fetchImpl = async (url) => {
    calls.push(url)
    const query = new URL(url).searchParams.get('q')
    if (query.includes('1440')) return { ok: true, json: async () => [] }
    return { ok: true, json: async () => [{ lat: '-34.764', lon: '-58.208' }] }
  }
  const point = await geocodePlaceAddress(
    {
      street: 'Diagonal Lisandro de la Torre',
      streetNumber: '1440',
      neighborhood: 'Berazategui',
      province: 'Buenos Aires',
      country: 'Argentina',
    },
    fetchImpl,
    async () => {},
  )
  assert.deepEqual(point, { lat: -34.764, lon: -58.208 })
  assert.equal(calls.length, 2)
})

test('el reverso de Nominatim completa calle, altura, barrio, provincia y país', async () => {
  const fetchImpl = async () => ({
    ok: true,
    json: async () => ({
      address: {
        house_number: '1440',
        road: 'Diagonal Lisandro de la Torre',
        town: 'Berazategui',
        state: 'Buenos Aires',
        country: 'Argentina',
        country_code: 'ar',
        'ISO3166-2-lvl4': 'AR-B',
      },
    }),
  })
  const components = await reversePlace(-34.76, -58.21, fetchImpl)
  assert.equal(components.find((item) => item.types.includes('street_number')).long_name, '1440')
  assert.equal(components.find((item) => item.types.includes('route')).long_name, 'Diagonal Lisandro de la Torre')
  assert.equal(components.find((item) => item.types.includes('neighborhood')).long_name, 'Berazategui')
  assert.equal(components.find((item) => item.types.includes('administrative_area_level_1')).short_name, 'B')
  assert.equal(components.find((item) => item.types.includes('country')).short_name, 'AR')
})
