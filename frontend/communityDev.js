import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'public', 'data')
const file = path.join(dir, 'community-recipes.json')

function readAll() {
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'))
    return Array.isArray(data?.recipes) ? data.recipes : []
  } catch {
    return []
  }
}

function writeAll(recipes) {
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(file, JSON.stringify({ recipes }, null, 2))
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

function sanitize(input) {
  const title = cleanText(input.title, 80)
  const authorName = cleanText(input.author?.name, 60)
  if (!title || !authorName) return null
  const image = String(input.image || '')
  if (image && (!image.startsWith('data:image/jpeg') || image.length > 900000)) {
    return null
  }
  const ingredients = (input.ingredients || [])
    .map((item) => ({
      name: cleanText(item.name, 80),
      qty: cleanText(item.qty, 40),
      shop: ['dietetica', 'verduleria', 'carniceria', 'almacen'].includes(item.shop) ? item.shop : 'almacen',
    }))
    .filter((item) => item.name)
    .slice(0, 20)
  const steps = (input.steps || []).map((step) => cleanText(step, 400)).filter(Boolean).slice(0, 20)
  if (!ingredients.length || !steps.length) return null
  const tags = (input.tags || [])
    .map((tag) => cleanText(tag, 24))
    .filter((tag) => tag && tag !== 'Todas' && tag !== 'Comunidad')
    .slice(0, 4)
  const incoming = String(input.id || '')
  const id = /^c-[a-z0-9]+$/i.test(incoming)
    ? incoming
    : `c-${Date.now().toString(36)}${Math.floor(Math.random() * 999).toString(36)}`
  return {
    id,
    community: true,
    title,
    summary: cleanText(input.summary, 220),
    minutes: Math.min(240, Math.max(5, Number(input.minutes) || 30)),
    servings: Math.min(12, Math.max(1, Number(input.servings) || 2)),
    difficulty: input.difficulty === 'Media' ? 'Media' : 'Fácil',
    tags,
    ingredients,
    steps,
    image,
    sourceName: authorName,
    sourceUrl: '',
    author: {
      id: cleanText(input.author?.id, 80),
      name: authorName,
      picture: cleanPicture(input.author?.picture),
      provider: input.author?.provider === 'facebook' ? 'facebook' : 'google',
    },
    createdAt: Date.now(),
  }
}

function requestPath(url) {
  const raw = (url || '').split('?')[0]
  const stripped = raw.replace(/^\/singluten\/?/, '/')
  return stripped.startsWith('/') ? stripped : `/${stripped}`
}

export function communityMiddleware() {
  return (req, res, next) => {
    const pathName = requestPath(req.url)
    if (pathName !== '/community-recipes.php' && pathName !== '/api/community-recipes') {
      return next()
    }
    const send = (status, data) => {
      const payload = JSON.stringify(data)
      res.writeHead(status, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
      })
      res.end(payload)
    }
    if (req.method === 'GET') {
      send(200, { recipes: readAll() })
      return
    }
    if (req.method !== 'POST') {
      send(405, { ok: false })
      return
    }
    const chunks = []
    req.on('data', (chunk) => chunks.push(chunk))
    req.on('end', () => {
      try {
        const raw = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')
        const recipe = sanitize(raw)
        if (!recipe) {
          send(400, { ok: false, error: 'invalid' })
          return
        }
        const recipes = [recipe, ...readAll().filter((item) => item.id !== recipe.id)].slice(0, 80)
        writeAll(recipes)
        send(200, { ok: true, recipe })
      } catch {
        send(400, { ok: false })
      }
    })
  }
}
