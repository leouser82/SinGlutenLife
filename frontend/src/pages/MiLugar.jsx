import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext.jsx'
import PlaceMap from '../components/PlaceMap.jsx'
import { resizePhoto } from '../community/store.js'
import { geocodePlaceAddress, reversePlace } from '../geo/nominatim.js'
import { rememberPlaces } from '../geo/placeCache.js'
import { algorithmPlacesNear } from '../geo/places.js'
import { loadLocalities } from '../geo/localities.js'
import { applyMapToAddress, canSavePlace, foldName, formatAddress } from '../geo/placeAddress.js'
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
  return {
    id: '',
    name: '',
    image: '',
    description: '',
    hours: '',
    menu: '',
    review: '',
    countryCode: '',
    countryName: '',
    provinceCode: '',
    provinceName: '',
    neighborhood: '',
    street: '',
    streetNumber: '',
    lat: null,
    lon: null,
  }
}

export default function MiLugar() {
  const { t } = useI18n()
  const { user, loginGoogle, logout } = useAuth()
  const { reloadPlaces, coords } = useLocationData()
  const [places, setPlaces] = useState([])
  const [view, setView] = useState('list')
  const [form, setForm] = useState(blankForm)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [dropId, setDropId] = useState('')
  const [dropNote, setDropNote] = useState('')
  const [covered, setCovered] = useState({})
  const [countries, setCountries] = useState([])
  const [provinces, setProvinces] = useState([])
  const [neighborhoods, setNeighborhoods] = useState([])
  const neighborhoodRef = useRef('')
  neighborhoodRef.current = form.neighborhood
  const pinLock = useRef(false)

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

  useEffect(() => {
    let alive = true
    import('country-state-city').then(({ Country }) => {
      if (!alive) return
      setCountries(
        Country.getAllCountries()
          .map((item) => ({ code: item.isoCode, name: item.name }))
          .sort((a, b) => a.name.localeCompare(b.name, 'es')),
      )
    })
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    if (!form.countryName || form.countryCode || !countries.length) return
    const found = countries.find((item) => foldName(item.name) === foldName(form.countryName))
    if (found) patch({ countryCode: found.code })
  }, [countries, form.countryName, form.countryCode])

  useEffect(() => {
    let alive = true
    if (!form.countryCode) {
      setProvinces([])
      return undefined
    }
    import('country-state-city').then(({ State }) => {
      if (!alive) return
      const rows = State.getStatesOfCountry(form.countryCode)
        .map((item) => ({ code: item.isoCode, name: item.name }))
        .sort((a, b) => a.name.localeCompare(b.name, 'es'))
      if (form.provinceCode && !rows.some((item) => item.code === form.provinceCode)) {
        rows.push({ code: form.provinceCode, name: form.provinceName || form.provinceCode })
        rows.sort((a, b) => a.name.localeCompare(b.name, 'es'))
      }
      setProvinces(rows)
    })
    return () => {
      alive = false
    }
  }, [form.countryCode, form.provinceCode, form.provinceName])

  useEffect(() => {
    if (!form.provinceName || form.provinceCode || !provinces.length) return
    const found = provinces.find((item) => foldName(item.name) === foldName(form.provinceName))
    if (found) patch({ provinceCode: found.code })
  }, [provinces, form.provinceName, form.provinceCode])

  useEffect(() => {
    let alive = true
    if (!form.countryCode || !form.provinceCode) {
      setNeighborhoods(form.neighborhood ? [form.neighborhood] : [])
      return undefined
    }
    loadLocalities({
      countryCode: form.countryCode,
      provinceCode: form.provinceCode,
      provinceName: form.provinceName,
    }).then((names) => {
      if (!alive) return
      const list = [...names]
      const extra = neighborhoodRef.current
      if (extra && !list.some((item) => foldName(item) === foldName(extra))) list.push(extra)
      list.sort((a, b) => a.localeCompare(b, 'es'))
      setNeighborhoods(list)
    }).catch(() => {
      if (!alive) return
      const extra = neighborhoodRef.current
      setNeighborhoods(extra ? [extra] : [])
    })
    return () => {
      alive = false
    }
  }, [form.countryCode, form.provinceCode, form.provinceName])

  useEffect(() => {
    if (view !== 'form' || pinLock.current) return undefined
    const street = form.street.trim()
    const streetNumber = form.streetNumber.trim()
    if (!street || !streetNumber || !form.countryName || !form.provinceName || !form.neighborhood) return undefined
    let alive = true
    const timer = setTimeout(async () => {
      try {
        const point = await geocodePlaceAddress({
          street,
          streetNumber,
          neighborhood: form.neighborhood,
          province: form.provinceName,
          country: form.countryName,
        })
        if (!alive) return
        if (point) {
          setError('')
          patch({ lat: point.lat, lon: point.lon })
        } else setError(t('mine.addressMiss'))
      } catch {
        if (alive) setError(t('mine.addressMiss'))
      }
    }, 450)
    return () => {
      alive = false
      clearTimeout(timer)
    }
  }, [view, form.street, form.streetNumber, form.countryName, form.provinceName, form.neighborhood, t])

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
    pinLock.current = false
    setError('')
    setForm(blankForm())
    setView('form')
  }

  function openEdit(place) {
    pinLock.current = true
    setError('')
    setForm({
      id: place.id,
      name: place.name || '',
      image: place.image || '',
      description: place.description || '',
      hours: place.hours || '',
      menu: place.menu || '',
      review: place.review || '',
      countryCode: '',
      countryName: place.country || '',
      provinceCode: '',
      provinceName: place.province || '',
      neighborhood: place.neighborhood || '',
      street: place.street || '',
      streetNumber: place.streetNumber || '',
      lat: Number(place.lat),
      lon: Number(place.lon),
    })
    setView('form')
  }

  function touchAddress(partial) {
    pinLock.current = false
    patch({ ...partial, lat: null, lon: null })
  }

  async function onMarkerMove(lat, lon) {
    pinLock.current = true
    setError('')
    let components = []
    try {
      components = await reversePlace(lat, lon)
    } catch {
      patch({ lat, lon })
      return
    }
    if (!components.length) {
      patch({ lat, lon })
      return
    }
    const country = countries.find((item) => item.code === form.countryCode) || null
    let provinceRows = provinces
    const countryHit = applyMapToAddress({ components, countries, provinces: provinceRows, neighborhoods: [] })
    if (countryHit.countryCode && countryHit.countryCode !== country?.code) {
      const { State } = await import('country-state-city')
      provinceRows = State.getStatesOfCountry(countryHit.countryCode).map((item) => ({
        code: item.isoCode,
        name: item.name,
      }))
    }
    const provinceHit = applyMapToAddress({ components, countries, provinces: provinceRows, neighborhoods: [] })
    const cityNames = await loadLocalities({
      countryCode: provinceHit.countryCode || form.countryCode,
      provinceCode: provinceHit.provinceCode || form.provinceCode,
      provinceName: provinceHit.provinceName || form.provinceName,
    })
    const placed = applyMapToAddress({
      components,
      countries,
      provinces: provinceRows,
      neighborhoods: cityNames,
    })
    setProvinces(placed.provinces)
    setNeighborhoods(placed.neighborhoods)
    patch({
      countryCode: placed.countryCode || form.countryCode,
      countryName: placed.countryName || form.countryName,
      provinceCode: placed.provinceCode || form.provinceCode,
      provinceName: placed.provinceName || form.provinceName,
      neighborhood: placed.neighborhood,
      street: placed.street,
      streetNumber: placed.streetNumber,
      lat,
      lon,
    })
  }

  async function onSave(event) {
    event.preventDefault()
    const payload = {
      name: form.name.trim(),
      image: form.image,
      description: form.description.trim(),
      hours: form.hours.trim(),
      menu: form.menu.trim(),
      country: form.countryName.trim(),
      province: form.provinceName.trim(),
      neighborhood: form.neighborhood.trim(),
      street: form.street.trim(),
      streetNumber: form.streetNumber.trim(),
      lat: Number(form.lat),
      lon: Number(form.lon),
    }
    if (!payload.name || !payload.image || !payload.description || !payload.hours || !payload.country || !payload.province || !payload.neighborhood || !payload.street || !payload.streetNumber) {
      setError(t('mine.required'))
      return
    }
    if (!canSavePlace(payload)) {
      setError(t('mine.mapNeed'))
      return
    }
    setBusy('save')
    setError('')
    try {
      const saved = await saveUserPlace({
        id: form.id,
        ...payload,
        address: formatAddress(payload),
        review: form.review.trim(),
        author: user,
      })
      setPlaces((current) => [saved, ...current.filter((place) => place.id !== saved.id)])
      setView('list')
      setForm(blankForm())
      reloadPlaces()
    } catch (error) {
      setError(error?.message === 'map' ? t('mine.mapNeed') : t('mine.addressMiss'))
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
              {t('mine.country')}
              <select
                value={form.countryCode}
                onChange={(event) => {
                  const code = event.target.value
                  const country = countries.find((item) => item.code === code)
                  touchAddress({
                    countryCode: code,
                    countryName: country?.name || '',
                    provinceCode: '',
                    provinceName: '',
                    neighborhood: '',
                  })
                }}
              >
                <option value="">{t('mine.country')}</option>
                {countries.map((item) => (
                  <option key={item.code} value={item.code}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t('mine.province')}
              <select
                value={form.provinceCode}
                disabled={!form.countryCode}
                onChange={(event) => {
                  const code = event.target.value
                  const province = provinces.find((item) => item.code === code)
                  touchAddress({
                    provinceCode: code,
                    provinceName: province?.name || '',
                    neighborhood: '',
                  })
                }}
              >
                <option value="">{t('mine.province')}</option>
                {provinces.map((item) => (
                  <option key={item.code} value={item.code}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t('mine.neighborhood')}
              <select
                value={form.neighborhood}
                disabled={!form.provinceCode}
                onChange={(event) => touchAddress({ neighborhood: event.target.value })}
              >
                <option value="">{t('mine.neighborhood')}</option>
                {neighborhoods.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t('mine.street')}
              <input value={form.street} onChange={(event) => touchAddress({ street: event.target.value })} maxLength={120} />
            </label>
            <label>
              {t('mine.streetNumber')}
              <input value={form.streetNumber} onChange={(event) => touchAddress({ streetNumber: event.target.value })} maxLength={20} />
            </label>
            <PlaceMap lat={form.lat} lon={form.lon} fallback={coords} onMove={onMarkerMove} />
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
