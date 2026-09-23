import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'public', 'data')
const file = path.join(dir, 'user-places.json')

function readAll() {
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'))
    return Array.isArray(data?.places) ? data.places : []
  } catch {
    return []
  }
}

function writeAll(places) {
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(file, JSON.stringify({ places }, null, 2))
}

function cleanPicture(value) {
  const url = String(value || '').trim()
  if (!url.startsWith('https://') || url.length > 2000) return ''
  return url
}

function cleanText(value, max) {
  return String(value || '')
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max)
}

function cleanBlock(value, max) {
  return String(value || '')
    .replace(/<[^>]*>/g, '')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{2,}/g, '\n')
    .trim()
    .slice(0, max)
}

function requestPath(url) {
  const raw = (url || '').split('?')[0]
  const stripped = raw.replace(/^\/singluten\/?/, '/')
  return stripped.startsWith('/') ? stripped : `/${stripped}`
}

function authorOf(input) {
  return {
    id: cleanText(input?.author?.id, 80),
    name: cleanText(input?.author?.name, 60),
    picture: cleanPicture(input?.author?.picture),
    provider: input?.author?.provider === 'facebook' ? 'facebook' : 'google',
  }
}

export function userPlacesMiddleware() {
  return (req, res, next) => {
    const pathName = requestPath(req.url)
    if (pathName !== '/user-places.php' && pathName !== '/api/user-places') return next()

    const send = (status, data) => {
      res.writeHead(status, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
      })
      res.end(JSON.stringify(data))
    }

    if (req.method === 'GET') {
      const author = cleanText(new URL(req.url, 'http://local').searchParams.get('author'), 80)
      const places = readAll()
      const visible = author
        ? places.filter((place) => place.author?.id === author)
        : places.filter((place) => place.deletedAt == null)
      send(200, { ok: true, places: visible })
      return
    }

    if (req.method !== 'POST') {
      send(405, { ok: false, error: 'method' })
      return
    }

    const chunks = []
    req.on('data', (chunk) => chunks.push(chunk))
    req.on('end', () => {
      try {
        const raw = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')
        const author = authorOf(raw)
        if (!author.id || !author.name) {
          send(400, { ok: false, error: 'invalid' })
          return
        }
        const current = readAll()
        if (raw.action === 'delete') {
          const id = String(raw.id || '')
          const deleteNote = cleanText(raw.deleteNote, 400)
          if (!/^u-[a-z0-9]+$/i.test(id) || !deleteNote) {
            send(400, { ok: false, error: 'invalid' })
            return
          }
          const prev = current.find((place) => place.id === id)
          if (!prev) {
            send(404, { ok: false, error: 'missing' })
            return
          }
          if (prev.author?.id !== author.id) {
            send(403, { ok: false, error: 'forbidden' })
            return
          }
          const place = prev.deletedAt
            ? prev
            : { ...prev, deletedAt: Date.now(), deleteNote, updatedAt: Date.now() }
          writeAll(current.map((item) => (item.id === id ? place : item)))
          send(200, { ok: true, place })
          return
        }

        const name = cleanText(raw.name, 80)
        const description = cleanBlock(raw.description, 2000)
        const hours = cleanBlock(raw.hours, 400)
        const menu = cleanBlock(raw.menu, 2000)
        const review = cleanText(raw.review, 500)
        const country = cleanText(raw.country, 80)
        const province = cleanText(raw.province, 80)
        const neighborhood = cleanText(raw.neighborhood, 80)
        const street = cleanText(raw.street, 120)
        const streetNumber = cleanText(raw.streetNumber, 20)
        const address = cleanText(`${street} ${streetNumber}, ${neighborhood}, ${province}, ${country}`, 300)
        const image = String(raw.image || '')
        const lat = Number(raw.lat)
        const lon = Number(raw.lon)
        if (!name || !description || !hours || !country || !province || !neighborhood || !street || !streetNumber) {
          send(400, { ok: false, error: 'invalid' })
          return
        }
        if (!image.startsWith('data:image/jpeg') || image.length > 900000) {
          send(400, { ok: false, error: 'photo' })
          return
        }
        if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
          send(400, { ok: false, error: 'map' })
          return
        }
        const incoming = String(raw.id || '')
        const id = /^u-[a-z0-9]+$/i.test(incoming)
          ? incoming
          : `u-${Date.now().toString(36)}${Math.floor(Math.random() * 999).toString(36)}`
        const prev = current.find((place) => place.id === id)
        if (prev?.author?.id && prev.author.id !== author.id) {
          send(403, { ok: false, error: 'forbidden' })
          return
        }
        if (prev?.deletedAt) {
          send(400, { ok: false, error: 'deleted' })
          return
        }
        const now = Date.now()
        const place = {
          id,
          name,
          image,
          description,
          hours,
          menu,
          review,
          country,
          province,
          neighborhood,
          street,
          streetNumber,
          address,
          lat,
          lon,
          author,
          createdAt: prev?.createdAt || now,
          updatedAt: now,
          deletedAt: null,
          deleteNote: '',
        }
        const next = [place, ...current.filter((item) => item.id !== id)]
        writeAll(next)
        send(200, { ok: true, place })
      } catch {
        send(400, { ok: false, error: 'invalid' })
      }
    })
  }
}
