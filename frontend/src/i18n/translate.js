const memory = new Map()
let queue = Promise.resolve()

function cacheKey(lang, text) {
  return `${lang}:${text}`
}

function readStore(key) {
  try {
    return sessionStorage.getItem(`sgl-tr:${key}`)
  } catch {
    return null
  }
}

function writeStore(key, value) {
  try {
    sessionStorage.setItem(`sgl-tr:${key}`, value)
  } catch {
    // cupo
  }
}

export async function translateText(text, lang) {
  const source = String(text || '').trim()
  if (!source || lang === 'es') return source
  const key = cacheKey(lang, source)
  if (memory.has(key)) return memory.get(key)
  const stored = readStore(key)
  if (stored) {
    memory.set(key, stored)
    return stored
  }

  const job = queue.then(async () => {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(source.slice(0, 480))}&langpair=es|${lang}`
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 8000)
    try {
      const response = await fetch(url, { signal: controller.signal })
      const data = await response.json()
      const out = String(data?.responseData?.translatedText || '').trim() || source
      memory.set(key, out)
      writeStore(key, out)
      return out
    } catch {
      memory.set(key, source)
      return source
    } finally {
      clearTimeout(timer)
    }
  })
  queue = job.then(
    () => undefined,
    () => undefined,
  )
  return job
}
