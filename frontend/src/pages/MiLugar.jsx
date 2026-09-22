import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext.jsx'
import { resizePhoto } from '../community/store.js'
import { geocodeAddress } from '../geo/geo.js'
import { rememberPlaces } from '../geo/placeCache.js'
import { algorithmPlacesNear } from '../geo/places.js'
import { coveredByAlgorithm, toPublicUserPlace } from '../geo/userPlaceRank.js'
import { useLocationData } from '../geo/LocationContext.jsx'
import { useI18n } from '../i18n/LanguageContext.jsx'
import { deleteUserPlace, fetchMyPlaces, saveUserPlace } from '../places/userStore.js'

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3.1l5.7-5.7C34.2 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7 12.9 19.6C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 8 3.1l5.7-5.7C34.2 6.1 29.4 4 24 4 16.3 4 9.6 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.3C29.2 35.3 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-1.1 3.2-3.5 5.8-6.6 7.4l.1.1 6.3 5.3C36.9 41.5 44 36 44 24c0-1.2-.1-2.3-.4-3.5z" />
    </svg>
  )
}

function blankForm() {
  return { id: '', name: '', image: '', description: '', hours: '', menu: '', review: '', address: '' }
}

export default function MiLugar() {
  const { t } = useI18n()
  const { user, loginGoogle, logout } = useAuth()
  const { reloadPlaces } = useLocationData()
  const [places, setPlaces] = useState([])
  const [view, setView] = useState('list')
  const [form, setForm] = useState(blankForm)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [dropId, setDropId] = useState('')
  const [dropNote, setDropNote] = useState('')
  const [covered, setCovered] = useState({})

  const mine = useMemo(() => {
    return places
      .filter((place) => place.author?.id && place.author.id === user?.id)
      .slice()
      .sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0))
  }, [places, user?.id])

  useEffect(() => {
    if (!user?.id) return undefined
    let alive = true
    fetchMyPlaces(user.id)
      .then((rows) => {
        if (!alive) return
        setPlaces(rows)
      })
      .catch(() => {
        if (alive) setPlaces([])
      })
    return () => {
      alive = false
    }
  }, [user?.id])

  useEffect(() => {
    const active = mine.filter((place) => place.deletedAt == null).map(toPublicUserPlace)
    if (active.length) rememberPlaces(active, [])
  }, [mine])

  useEffect(() => {
    const active = mine.filter((place) => place.deletedAt == null && Number.isFinite(Number(place.lat)))
    if (!active.length) {
      setCovered({})
      return undefined
    }
    let alive = true
    Promise.all(
      active.map(async (place) => {
        try {
          const near = await algorithmPlacesNear(Number(place.lat), Number(place.lon))
          return [place.id, coveredByAlgorithm(place, near)]
        } catch {
          return [place.id, false]
        }
      }),
    ).then((pairs) => {
      if (alive) setCovered(Object.fromEntries(pairs))
    })
    return () => {
      alive = false
    }
  }, [mine])

  function patch(partial) {
    setForm((current) => ({ ...current, ...partial }))
  }

  async function enter() {
    setError('')
    setBusy('google')
    try {
      const cook = await loginGoogle()
      if (!cook) setError(t('cook.authOrigin', { origin: window.location.origin }))
    } catch {
      setError(t('cook.authOrigin', { origin: window.location.origin }))
    } finally {
      setBusy('')
    }
  }

  async function onPhoto(file) {
    setError('')
    try {
      patch({ image: await resizePhoto(file) })
    } catch {
      setError(t('mine.photoBad'))
    }
  }

  function openNew() {
    setError('')
    setForm(blankForm())
    setView('form')
  }

  function openEdit(place) {
    setError('')
    setForm({
      id: place.id,
      name: place.name || '',
      image: place.image || '',
      description: place.description || '',
      hours: place.hours || '',
      menu: place.menu || '',
      review: place.review || '',
      address: place.address || '',
    })
    setView('form')
  }

  async function onSave(event) {
    event.preventDefault()
    const name = form.name.trim()
    const description = form.description.trim()
    const hours = form.hours.trim()
    const menu = form.menu.trim()
    const address = form.address.trim()
    if (!name || !form.image || !description || !hours || !menu || !address) {
      setError(t('mine.required'))
      return
    }
    setBusy('save')
    setError('')
    try {
      const point = await geocodeAddress(address)
      if (!point || !Number.isFinite(point.lat) || !Number.isFinite(point.lon)) {
        setError(t('mine.addressMiss'))
        return
      }
      const saved = await saveUserPlace({
        id: form.id,
        name,
        image: form.image,
        description,
        hours,
        menu,
        review: form.review.trim(),
        address,
        lat: point.lat,
        lon: point.lon,
        author: user,
      })
      setPlaces((current) => [saved, ...current.filter((place) => place.id !== saved.id)])
      setView('list')
      setForm(blankForm())
      reloadPlaces()
    } catch {
      setError(t('mine.addressMiss'))
    } finally {
      setBusy('')
    }
  }

  async function onDelete(place) {
    if (dropId !== place.id) {
      setDropId(place.id)
      setDropNote('')
      setError('')
      return
    }
    const note = dropNote.trim()
    if (!note) {
      setError(t('mine.noteNeed'))
      return
    }
    setBusy(`del-${place.id}`)
    setError('')
    try {
      const saved = await deleteUserPlace(place.id, user, note)
      setPlaces((current) => current.map((item) => (item.id === saved.id ? saved : item)))
      setDropId('')
      setDropNote('')
      reloadPlaces()
    } catch {
      setError(t('mine.noteNeed'))
    } finally {
      setBusy('')
    }
  }

  if (!user) {
    return (
      <main className="page cook-page">
        <section className="cook-gate">
          <div className="cook-glow" />
          <p className="cook-kicker">{t('mine.gateKicker')}</p>
          <h2>{t('mine.gateTitle')}</h2>
          <p>{t('mine.gateBody')}</p>
          <button type="button" className="cook-social google" onClick={enter} disabled={Boolean(busy)}>
            <GoogleMark />
            {t('cook.google')}
          </button>
          {error ? <p className="cook-error">{error}</p> : null}
          <p className="cook-foot">
            {t('cook.gateNote')}{' '}
            <a href={`${import.meta.env.BASE_URL}privacidad.html`}>{t('cook.privacy')}</a>
          </p>
        </section>
      </main>
    )
  }

  return (
    <main className="page cook-page">
      <section className="cook-studio">
        <div className="cook-studio-top">
          <p className="cook-kicker">{t('cook.signed', { name: user.name })}</p>
          <button type="button" className="text-btn" onClick={logout}>
            {t('cook.logout')}
          </button>
        </div>

        {view === 'list' ? (
          <div className="cook-pane cook-mine">
            <div className="cook-mine-head">
              <h2>{t('mine.title')}</h2>
              <button type="button" className="btn btn-light" onClick={openNew}>
                {t('mine.new')}
              </button>
            </div>
            {mine.length === 0 ? <p className="note">{t('mine.empty')}</p> : null}
            {mine.map((place) => (
              <article className="cook-mine-card" key={place.id}>
                {place.image && place.deletedAt == null ? <img src={place.image} alt="" /> : <div className="cook-mine-gap" />}
                <div>
                  <h3>{place.name}</h3>
                  <p className="note">{place.address}</p>
                  {place.deletedAt != null ? (
                    <>
                      <span className="tag">{t('mine.deletedTag')}</span>
                      <p>{place.deleteNote}</p>
                    </>
                  ) : (
                    <>
                      {covered[place.id] ? <p className="note">{t('mine.published')}</p> : null}
                      <div className="cook-mine-actions">
                        <Link className="text-btn" to={`/lugar/${encodeURIComponent(place.id)}`}>
                          {t('place.seeList')}
                        </Link>
                        <button type="button" className="text-btn" onClick={() => openEdit(place)}>
                          {t('mine.edit')}
                        </button>
                        <button
                          type="button"
                          className="text-btn cook-mine-del"
                          disabled={busy === `del-${place.id}`}
                          onClick={() => onDelete(place)}
                        >
                          {dropId === place.id ? t('mine.deleteAsk') : t('mine.delete')}
                        </button>
                      </div>
                      {dropId === place.id ? (
                        <label>
                          {t('mine.noteLabel')}
                          <textarea rows={2} value={dropNote} onChange={(event) => setDropNote(event.target.value)} maxLength={400} />
                        </label>
                      ) : null}
                    </>
                  )}
                </div>
              </article>
            ))}
            {error ? <p className="cook-error">{error}</p> : null}
          </div>
        ) : (
          <form className="cook-pane" onSubmit={onSave}>
            <h2>{form.id ? t('mine.edit') : t('mine.new')}</h2>
            <div className="cook-photo-wrap">
              <label className={`cook-polaroid ${form.image ? 'has' : ''}`}>
                {form.image ? <img src={form.image} alt="" /> : <span>{t('mine.drop')}</span>}
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(event) => {
                    onPhoto(event.target.files?.[0])
                    event.target.value = ''
                  }}
                />
              </label>
              {form.image ? (
                <button type="button" className="cook-photo-clear" onClick={() => patch({ image: '' })} aria-label={t('mine.removePhoto')}>
                  ×
                </button>
              ) : null}
            </div>
            <label>
              {t('mine.name')}
              <input value={form.name} onChange={(event) => patch({ name: event.target.value })} maxLength={80} />
            </label>
            <label>
              {t('mine.description')}
              <textarea value={form.description} onChange={(event) => patch({ description: event.target.value })} maxLength={600} rows={3} />
            </label>
            <label>
              {t('mine.hours')}
              <textarea value={form.hours} onChange={(event) => patch({ hours: event.target.value })} maxLength={400} rows={3} />
            </label>
            <p className="note">{t('mine.hoursHint')}</p>
            <label>
              {t('mine.menu')}
              <textarea value={form.menu} onChange={(event) => patch({ menu: event.target.value })} maxLength={2000} rows={4} />
            </label>
            <label>
              {t('mine.review')}
              <textarea value={form.review} onChange={(event) => patch({ review: event.target.value })} maxLength={500} rows={3} />
            </label>
            <label>
              {t('mine.address')}
              <input value={form.address} onChange={(event) => patch({ address: event.target.value })} maxLength={180} />
            </label>
            {error ? <p className="cook-error">{error}</p> : null}
            <div className="cook-mine-head-actions">
              <button type="submit" className="btn btn-light" disabled={busy === 'save'}>
                {t('mine.save')}
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setView('list')
                  setError('')
                }}
              >
                {t('mine.cancel')}
              </button>
            </div>
          </form>
        )}
      </section>
    </main>
  )
}
