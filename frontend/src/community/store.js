import { apiCandidates } from '../geo/api.js'

const LOCAL_KEY = 'sgl-community-recipes-v1'

function readLocal() {
  try {
    const data = JSON.parse(localStorage.getItem(LOCAL_KEY) || '')
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

function writeLocal(recipes) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(recipes.slice(0, 40)))
  } catch {
    // cupo
  }
}

function merge(server, local) {
  const map = new Map()
  for (const recipe of [...local, ...server]) {
    if (recipe?.id) map.set(recipe.id, recipe)
  }
  return [...map.values()].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
}

function communityUrls() {
  return [...apiCandidates('api/community-recipes'), ...apiCandidates('community-recipes.php')]
}

async function readJson(response) {
  const type = response.headers.get('content-type') || ''
  if (!type.includes('json')) return null
  return response.json()
}

export async function fetchCommunityRecipes() {
  const local = readLocal()
  for (const url of communityUrls()) {
    try {
      const response = await fetch(url, { cache: 'no-store' })
      if (!response.ok) continue
      const data = await readJson(response)
      if (!Array.isArray(data?.recipes)) continue
      const recipes = merge(data.recipes, local)
      writeLocal(recipes)
      return recipes
    } catch {
      // next
    }
  }
  return local
}

export async function publishCommunityRecipe(recipe) {
  const ready = {
    ...recipe,
    id: recipe.id || `c-${Date.now().toString(36)}${Math.floor(Math.random() * 999).toString(36)}`,
    community: true,
    createdAt: recipe.createdAt || Date.now(),
    sourceName: recipe.sourceName || recipe.author?.name || '',
    author: recipe.author
      ? {
          ...recipe.author,
          picture: String(recipe.author.picture || '').startsWith('https://') ? recipe.author.picture : '',
        }
      : recipe.author,
  }
  const local = [ready, ...readLocal().filter((item) => item.id !== ready.id)]
  writeLocal(local)
  for (const url of communityUrls()) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ready),
      })
      if (!response.ok) continue
      const data = await readJson(response)
      if (data?.ok && data?.recipe?.id) {
        const next = merge([data.recipe], local)
        writeLocal(next)
        return data.recipe
      }
    } catch {
      // next
    }
  }
  return ready
}

export async function deleteCommunityRecipe(id, author) {
  const local = readLocal().filter((item) => item.id !== id)
  writeLocal(local)
  for (const url of communityUrls()) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id, author }),
      })
      if (!response.ok) continue
      const data = await readJson(response)
      if (data?.ok) return true
    } catch {
      // next
    }
  }
  return true
}

export function resizePhoto(file) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      reject(new Error('photo'))
      return
    }
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const max = 1100
      const scale = Math.min(1, max / Math.max(img.width, img.height))
      canvas.width = Math.max(1, Math.round(img.width * scale))
      canvas.height = Math.max(1, Math.round(img.height * scale))
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      let quality = 0.82
      let out = canvas.toDataURL('image/jpeg', quality)
      while (out.length > 720000 && quality > 0.5) {
        quality -= 0.08
        out = canvas.toDataURL('image/jpeg', quality)
      }
      resolve(out)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('photo'))
    }
    img.src = url
  })
}
