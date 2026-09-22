import { apiCandidates } from '../geo/api.js'

function urls() {
  return [...apiCandidates('api/user-places'), ...apiCandidates('user-places.php')]
}

async function readJson(response) {
  const type = response.headers.get('content-type') || ''
  if (!type.includes('json')) return null
  return response.json()
}

async function request(url, options) {
  const response = await fetch(url, { cache: 'no-store', ...options })
  const data = await readJson(response)
  if (!response.ok || data?.ok === false) {
    throw new Error(data?.error || `http-${response.status}`)
  }
  return data
}

export async function fetchActiveUserPlaces() {
  let last = new Error('user-places')
  for (const url of urls()) {
    try {
      const data = await request(url)
      if (!Array.isArray(data?.places)) throw new Error('places')
      return data.places.filter((place) => place?.deletedAt == null)
    } catch (error) {
      last = error
    }
  }
  throw last
}

export async function fetchMyPlaces(authorId) {
  const query = `?author=${encodeURIComponent(authorId)}`
  let last = new Error('user-places')
  for (const url of urls()) {
    try {
      const data = await request(`${url}${query}`)
      if (!Array.isArray(data?.places)) throw new Error('places')
      return data.places
    } catch (error) {
      last = error
    }
  }
  throw last
}

export async function saveUserPlace(place) {
  let last = new Error('save')
  for (const url of urls()) {
    try {
      const data = await request(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(place),
      })
      if (data?.place?.id) return data.place
      throw new Error('save')
    } catch (error) {
      last = error
    }
  }
  throw last
}

export async function deleteUserPlace(id, author, deleteNote) {
  let last = new Error('delete')
  for (const url of urls()) {
    try {
      const data = await request(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id, author, deleteNote }),
      })
      if (data?.place?.deletedAt && data.place.deleteNote) return data.place
      throw new Error('delete')
    } catch (error) {
      last = error
    }
  }
  throw last
}
