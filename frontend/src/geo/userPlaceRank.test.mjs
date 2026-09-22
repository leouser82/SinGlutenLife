import assert from 'node:assert/strict'
import test from 'node:test'
import { distanceKm } from './geo.js'
import {
  composePublicList,
  coveredByAlgorithm,
  logicalDelete,
  namesSimilar,
} from './userPlaceRank.js'

const origin = { lat: -34.6, lon: -58.4 }

function point(northKm, eastKm = 0) {
  const lat = origin.lat + northKm / 111.32
  const lon = origin.lon + eastKm / (111.32 * Math.cos((origin.lat * Math.PI) / 180))
  return { lat, lon }
}

function scrape(name, northKm, eastKm = 0) {
  const coords = point(northKm, eastKm)
  return { id: `s-${name}`, name, ...coords, source: 'scrape' }
}

function user(name, northKm, eastKm = 0, extra = {}) {
  const coords = point(northKm, eastKm)
  return { id: `u-${name}`, name, ...coords, source: 'user', deletedAt: null, deleteNote: '', ...extra }
}

test('nombres parecidos ignoran acentos y sin gluten', () => {
  assert.equal(namesSimilar('Café Central', 'Cafe Central'), true)
  assert.equal(namesSimilar('Bar Norte', 'Bar Sur'), false)
})

test('un lugar propio entra según el radio del origen', () => {
  const near = user('Mesa', 10)
  const far = user('Lejos', 30)
  const local = composePublicList([near, far], origin, 25).map((place) => place.id)
  const remote = composePublicList([near, far], origin, 40).map((place) => place.id)
  assert.deepEqual(local, ['u-Mesa'])
  assert.deepEqual(remote, ['u-Mesa', 'u-Lejos'])
  assert.ok(distanceKm(origin, near) <= 25)
  assert.ok(distanceKm(origin, far) > 25)
  assert.ok(distanceKm(origin, far) <= 40)
})

test('a igual cercanía gana el scraping', () => {
  const list = composePublicList([user('Propio', 2), scrape('Guía', -2)], origin, 25)
  assert.deepEqual(
    list.map((place) => place.source),
    ['scrape', 'user'],
  )
})

test('si está a menos de 200 m, el scraping va antes aunque el usuario esté un poco más cerca', () => {
  const list = composePublicList([user('Propio', 10), scrape('Guía', 10.18)], origin, 25)
  assert.ok(distanceKm(list[0], list[1]) < 0.2)
  assert.equal(list[0].source, 'scrape')
  assert.equal(list[1].source, 'user')
  assert.ok(list[1].distanceKm < list[0].distanceKm)
})

test('si la distancia al origen difiere en 150 m o menos, gana el scraping', () => {
  const list = composePublicList([user('Propio', 1), scrape('Guía', 1.12)], origin, 25)
  assert.ok(Math.abs(list[0].distanceKm - list[1].distanceKm) <= 0.15)
  assert.equal(list[0].source, 'scrape')
})

test('lejos de cualquier guía, el más cercano va primero', () => {
  const list = composePublicList([scrape('Lejos', 8), user('Cerca', 1)], origin, 25)
  assert.equal(list[0].source, 'user')
  assert.equal(list[1].source, 'scrape')
})

test('si el algoritmo ya publicó ese lugar, el del usuario no sale', () => {
  const own = user('Café Central', 1)
  const guide = scrape('Cafe Central', 1.1)
  assert.equal(coveredByAlgorithm(own, [guide]), true)
  const list = composePublicList([own, guide], origin, 25)
  assert.deepEqual(
    list.map((place) => place.source),
    ['scrape'],
  )
})

test('el mismo nombre lejos no se oculta', () => {
  const list = composePublicList([user('Café Central', 1), scrape('Cafe Central', 1.5)], origin, 25)
  assert.equal(list.filter((place) => place.source === 'user').length, 1)
})

test('el borrado lógico guarda la observación y sale de la lista pública', () => {
  const place = user('Mesa', 1)
  const removed = logicalDelete(place, '  Cerró el local  ', 99)
  assert.equal(removed.deleteNote, 'Cerró el local')
  assert.equal(removed.deletedAt, 99)
  assert.equal(removed.name, 'Mesa')
  const list = composePublicList([removed, scrape('Otro', 2)], origin, 25)
  assert.equal(list.some((item) => item.id === removed.id), false)
  assert.throws(() => logicalDelete(place, '   ', 1), /note/)
})
