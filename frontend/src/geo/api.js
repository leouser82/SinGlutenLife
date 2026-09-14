/**
 * PHP of this app lives next to the front (public/*.php).
 * With base `/` that is /gf-guides.php; inside Nexo it is /singluten/gf-guides.php.
 */

function withBase(path) {
  const base = import.meta.env.BASE_URL || '/'
  const prefix = base.endsWith('/') ? base : `${base}/`
  const suffix = String(path).replace(/^\//, '')
  return `${prefix}${suffix}`
}

export function apiCandidates(path) {
  const local = withBase(path)
  const env = import.meta.env.VITE_API_ORIGIN
  if (!env || env === 'self') return [local]
  return [local, `${String(env).replace(/\/$/, '')}/${String(path).replace(/^\//, '')}`]
}

async function fetchOne(url, timeoutMs) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, { signal: controller.signal })
    if (!response.ok) throw new Error(`http-${response.status}`)
    return await response.text()
  } finally {
    clearTimeout(timer)
  }
}

export async function fetchApiText(path, timeoutMs = 12000) {
  let last = new Error('api')
  for (const url of apiCandidates(path)) {
    try {
      return await fetchOne(url, timeoutMs)
    } catch (error) {
      last = error
    }
  }
  throw last
}

export async function fetchApiJson(path, timeoutMs = 12000) {
  let last = new Error('api')
  for (const url of apiCandidates(path)) {
    try {
      const data = JSON.parse(await fetchOne(url, timeoutMs))
      if (!data || typeof data !== 'object') throw new Error('not-json')
      return data
    } catch (error) {
      last = error
    }
  }
  throw last
}
