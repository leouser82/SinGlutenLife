const KEY = 'sgl-cook-v1'
const GOOGLE_SRC = 'https://accounts.google.com/gsi/client'
const FACEBOOK_SRC = 'https://connect.facebook.net/es_LA/sdk.js'

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
  return cookFrom({ id: data.sub, name: data.name, picture: data.picture || '' }, 'google')
}

export async function loginWithFacebook() {
  const appId = import.meta.env.VITE_FACEBOOK_APP_ID
  if (!appId) return null
  await loadScript(FACEBOOK_SRC)
  await new Promise((resolve) => {
    if (window.FB) {
      resolve()
      return
    }
    window.fbAsyncInit = () => {
      window.FB.init({ appId, cookie: true, xfbml: false, version: 'v21.0' })
      resolve()
    }
  })
  if (!window.FB._sglInit) {
    window.FB.init({ appId, cookie: true, xfbml: false, version: 'v21.0' })
    window.FB._sglInit = true
  }
  const auth = await new Promise((resolve, reject) => {
    window.FB.login(
      (response) => {
        if (response?.authResponse) resolve(response)
        else reject(new Error('facebook'))
      },
      { scope: 'public_profile,email' },
    )
  })
  if (!auth) throw new Error('facebook')
  const profile = await new Promise((resolve, reject) => {
    window.FB.api('/me', { fields: 'id,name,picture.type(large)' }, (data) => {
      if (data?.id && data?.name) resolve(data)
      else reject(new Error('facebook'))
    })
  })
  return cookFrom(
    { id: profile.id, name: profile.name, picture: profile.picture?.data?.url || '' },
    'facebook',
  )
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
