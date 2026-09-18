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

function communityUrls() {
  return [...apiCandidates('api/community-recipes'), ...apiCandidates('community-recipes.php')]
}

async function readJson(response) {
  const type = response.headers.get('content-type') || ''
  if (!type.includes('json')) return null
  return response.json()
}

export async function fetchCommunityRecipes() {
  let last = new Error('community')
  for (const url of communityUrls()) {
    try {
      const response = await fetch(url, { cache: 'no-store' })
      const data = await readJson(response)
      if (!response.ok || !Array.isArray(data?.recipes)) {
        last = new Error(data?.error || `http-${response.status}`)
        continue
      }
      writeLocal(data.recipes)
      return data.recipes
    } catch (error) {
      last = error
    }
  }
  throw last
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
  let last = new Error('publish')
  for (const url of communityUrls()) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ready),
      })
      const data = await readJson(response)
      if (data?.ok && data?.recipe?.id) {
        const next = [data.recipe, ...readLocal().filter((item) => item.id !== data.recipe.id)]
        writeLocal(next)
        return data.recipe
      }
      last = new Error(data?.error || `http-${response.status}`)
    } catch (error) {
      last = error
    }
  }
  throw last
}

export async function deleteCommunityRecipe(id, author) {
  let last = new Error('delete')
  for (const url of communityUrls()) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id, author }),
      })
      const data = await readJson(response)
      if (data?.ok) {
        writeLocal(readLocal().filter((item) => item.id !== id))
        return true
      }
      last = new Error(data?.error || `http-${response.status}`)
    } catch (error) {
      last = error
    }
  }
  throw last
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
