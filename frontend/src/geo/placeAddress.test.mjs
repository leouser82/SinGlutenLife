import assert from 'node:assert/strict'
import test from 'node:test'
import { applyMapToAddress, canSavePlace, formatAddress } from './placeAddress.js'

test('la dirección concatenada lleva calle, altura, barrio, provincia y país', () => {
  assert.equal(
    formatAddress({
      street: 'Diagonal Lisandro de la Torre',
      streetNumber: '1440',
      neighborhood: 'Berazategui centro',
      province: 'Buenos Aires',
      country: 'Argentina',
    }),
    'Diagonal Lisandro de la Torre 1440, Berazategui centro, Buenos Aires, Argentina',
  )
})

test('se puede guardar sin menú y no sin marcador', () => {
  const ready = {
    name: 'Vitalcer',
    image: 'data:image/jpeg,x',
    description: 'Local',
    hours: 'Lunes: 9 a 20',
    menu: '',
    country: 'Argentina',
    province: 'Buenos Aires',
    neighborhood: 'Berazategui',
    street: 'Diagonal Lisandro de la Torre',
    streetNumber: '1440',
    lat: -34.76,
    lon: -58.21,
  }
  assert.equal(canSavePlace(ready), true)
  assert.equal(canSavePlace({ ...ready, menu: '' }), true)
  assert.equal(canSavePlace({ ...ready, lat: null }), false)
  assert.equal(canSavePlace({ ...ready, streetNumber: '' }), false)
})

test('mover el marcador completa los controles y agrega el barrio que falta', () => {
  const applied = applyMapToAddress({
    components: [
      { long_name: '1440', short_name: '1440', types: ['street_number'] },
      { long_name: 'Diagonal Lisandro de la Torre', short_name: 'Diag. Lisandro de la Torre', types: ['route'] },
      { long_name: 'Berazategui centro', short_name: 'Berazategui centro', types: ['neighborhood', 'political'] },
      { long_name: 'Buenos Aires', short_name: 'B', types: ['administrative_area_level_1', 'political'] },
      { long_name: 'Argentina', short_name: 'AR', types: ['country', 'political'] },
    ],
    countries: [{ code: 'AR', name: 'Argentina' }],
    provinces: [{ code: 'B', name: 'Buenos Aires' }],
    neighborhoods: ['Quilmes', 'Ranelagh'],
  })
  assert.equal(applied.countryCode, 'AR')
  assert.equal(applied.provinceCode, 'B')
  assert.equal(applied.neighborhood, 'Berazategui centro')
  assert.equal(applied.street, 'Diagonal Lisandro de la Torre')
  assert.equal(applied.streetNumber, '1440')
  assert.equal(applied.neighborhoods.includes('Berazategui centro'), true)
})
