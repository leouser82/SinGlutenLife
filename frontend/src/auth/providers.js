const KEY = 'sgl-cook-v1'
const GOOGLE_SRC = 'https://accounts.google.com/gsi/client'

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`)
    if (existing) {
      resolve()
      return
    }
    const script = document.createElement('script')
    script.src = src
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('script'))
    document.head.appendChild(script)
  })
}

export function readCook() {
  try {
    const data = JSON.parse(localStorage.getItem(KEY) || '')
    if (!data?.id || !data?.name) return null
    return data
  } catch {
    return null
  }
}

export function saveCook(user) {
  localStorage.setItem(KEY, JSON.stringify(user))
  return user
}

export function clearCook() {
  localStorage.removeItem(KEY)
}

function cookFrom(profile, provider) {
  return {
    id: `${provider}:${profile.id}`,
    name: profile.name,
    picture: profile.picture || '',
    provider,
  }
}

export async function loginWithGoogle() {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
  if (!clientId) return null
  await loadScript(GOOGLE_SRC)
  const token = await new Promise((resolve, reject) => {
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 'openid email profile',
      callback: (response) => {
        if (response?.access_token) resolve(response.access_token)
        else reject(new Error('google'))
      },
      error_callback: () => reject(new Error('google')),
    })
    client.requestAccessToken({ prompt: 'consent' })
  })
  const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${token}` },
  })
  const data = await response.json()
  if (!data?.sub || !data?.name) throw new Error('google')
  const picture = String(data.picture || '').replace(/=s\d+-c\b/, '=s128-c')
  return cookFrom({ id: data.sub, name: data.name, picture }, 'google')
}

export function localCook(name, provider) {
  const label = String(name || '').trim()
  if (!label) return null
  return saveCook({
    id: `${provider}:local:${label.toLowerCase().replace(/\s+/g, '-')}`,
    name: label.slice(0, 60),
    picture: '',
    provider,
    local: true,
  })
}
