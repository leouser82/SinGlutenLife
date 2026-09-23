import assert from 'node:assert/strict'
import test from 'node:test'
import { fetchArgentinaLocalities, namesFromGeoref } from './localities.js'

test('el padrón de localidades deduplica nombres', () => {
  assert.deepEqual(
    namesFromGeoref({
      localidades: [{ nombre: 'Berazategui' }, { nombre: ' Berazategui ' }, { nombre: '' }, { nombre: 'Quilmes' }],
    }),
    ['Berazategui', 'Quilmes'],
  )
})

test('las localidades de una provincia se piden completas y sin repetir', async () => {
  const calls = []
  const fetchImpl = async (url) => {
    calls.push(url)
    const inicio = Number(new URL(url).searchParams.get('inicio'))
    if (inicio === 0) {
      return {
        ok: true,
        json: async () => ({
          total: 3,
          localidades: [{ nombre: 'Avellaneda' }, { nombre: 'Berazategui' }],
        }),
      }
    }
    return {
      ok: true,
      json: async () => ({
        total: 3,
        localidades: [{ nombre: 'Berazategui' }, { nombre: 'Quilmes' }],
      }),
    }
  }
  const names = await fetchArgentinaLocalities('Buenos Aires', fetchImpl)
  assert.deepEqual(names, ['Avellaneda', 'Berazategui', 'Quilmes'])
  assert.equal(calls.length, 2)
  assert.match(calls[0], /provincia=Buenos%20Aires/)
  assert.match(calls[0], /max=5000/)
})
