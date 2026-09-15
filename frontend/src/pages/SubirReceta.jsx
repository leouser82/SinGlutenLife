import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext.jsx'
import { resizePhoto } from '../community/store.js'
import { useCommunity } from '../community/CommunityContext.jsx'
import { recipeTags } from '../data/recipes.js'
import { useI18n } from '../i18n/LanguageContext.jsx'
import { labelOf } from '../i18n/labels.js'
import ChipRow from '../components/ChipRow.jsx'

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

const SHOPS = ['dietetica', 'verduleria', 'carniceria', 'almacen']
const TAGS = recipeTags.filter((item) => item !== 'Todas')

function emptyIng() {
  return { name: '', qty: '', shop: 'almacen' }
}

export default function SubirReceta() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const { user, loginGoogle, logout } = useAuth()
  const { publish } = useCommunity()
  const [step, setStep] = useState(0)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [title, setTitle] = useState('')
  const [summary, setSummary] = useState('')
  const [minutes, setMinutes] = useState(30)
  const [servings, setServings] = useState(2)
  const [difficulty, setDifficulty] = useState('Fácil')
  const [tags, setTags] = useState(['Almuerzo'])
  const [image, setImage] = useState('')
  const [ingredients, setIngredients] = useState([emptyIng()])
  const [steps, setSteps] = useState([''])
  const [seal, setSeal] = useState(false)

  const labels = useMemo(
    () => [t('cook.stepPlate'), t('cook.stepList'), t('cook.stepFire'), t('cook.stepServe')],
    [t],
  )

  async function enter() {
    setError('')
    setBusy('google')
    try {
      const cook = await loginGoogle()
      if (!cook) {
        setError(t('cook.authOrigin', { origin: window.location.origin }))
        return
      }
    } catch {
      setError(t('cook.authOrigin', { origin: window.location.origin }))
    } finally {
      setBusy('')
    }
  }

  async function onPhoto(file) {
    if (!file) return
    try {
      setImage(await resizePhoto(file))
    } catch {
      setImage('')
    }
  }

  function toggleTag(tag) {
    setTags((current) =>
      current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag].slice(0, 4),
    )
  }

  function canNext() {
    if (step === 0) return title.trim().length > 1
    if (step === 1) return ingredients.some((item) => item.name.trim())
    if (step === 2) return steps.some((item) => item.trim())
    return seal
  }

  async function submit() {
    if (!user) return
    setError('')
    if (!title.trim()) return setError(t('cook.needTitle'))
    if (!ingredients.some((item) => item.name.trim())) return setError(t('cook.needIng'))
    if (!steps.some((item) => item.trim())) return setError(t('cook.needStep'))
    if (!seal) return setError(t('cook.needSeal'))
    setBusy('publish')
    const recipe = {
      title: title.trim(),
      summary: summary.trim(),
      minutes,
      servings,
      difficulty,
      tags,
      image,
      ingredients: ingredients.filter((item) => item.name.trim()),
      steps: steps.filter((item) => item.trim()),
      author: user,
      sourceName: user.name,
    }
    try {
      const saved = await publish(recipe)
      if (!saved?.id) throw new Error('publish')
      navigate(`/recetas/${saved.id}`)
    } catch {
      setError(t('cook.authError'))
    } finally {
      setBusy('')
    }
  }

  if (!user) {
    return (
      <main className="page cook-page">
        <section className="cook-gate">
          <div className="cook-glow" />
          <p className="cook-kicker">{t('cook.gateKicker')}</p>
          <h2>{t('cook.gateTitle')}</h2>
          <p>{t('cook.gateBody')}</p>
          <button type="button" className="cook-social google" onClick={() => enter()} disabled={Boolean(busy)}>
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
        <div className="cook-progress" aria-hidden="true">
          {labels.map((label, index) => (
            <button
              key={label}
              type="button"
              className={index === step ? 'on' : index < step ? 'done' : ''}
              onClick={() => index <= step && setStep(index)}
            >
              <span />
              {label}
            </button>
          ))}
        </div>

        {step === 0 ? (
          <div className="cook-pane">
            <h2>{t('cook.stepPlate')}</h2>
            <label className={`cook-polaroid ${image ? 'has' : ''}`}>
              {image ? <img src={image} alt="" /> : <span>{t('cook.drop')}</span>}
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={(event) => onPhoto(event.target.files?.[0])}
              />
            </label>
            <p className="note">{t('cook.photoHint')}</p>
            <label>
              {t('cook.title')}
              <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={80} />
            </label>
            <label>
              {t('cook.story')}
              <textarea value={summary} onChange={(event) => setSummary(event.target.value)} maxLength={220} rows={3} />
            </label>
            <div className="cook-row">
              <label>
                {t('cook.minutes')}
                <input type="number" min="5" max="240" value={minutes} onChange={(event) => setMinutes(Number(event.target.value))} />
              </label>
              <label>
                {t('cook.servings')}
                <input type="number" min="1" max="12" value={servings} onChange={(event) => setServings(Number(event.target.value))} />
              </label>
              <label>
                {t('cook.difficulty')}
                <select value={difficulty} onChange={(event) => setDifficulty(event.target.value)}>
                  <option value="Fácil">{labelOf(t, 'diff', 'Fácil')}</option>
                  <option value="Media">{labelOf(t, 'diff', 'Media')}</option>
                </select>
              </label>
            </div>
            <ChipRow>
              {TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className={tags.includes(tag) ? 'filter active' : 'filter'}
                  onClick={() => toggleTag(tag)}
                >
                  {labelOf(t, 'tag', tag)}
                </button>
              ))}
            </ChipRow>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="cook-pane">
            <h2>{t('cook.stepList')}</h2>
            {ingredients.map((item, index) => (
              <div className="cook-ing" key={`ing-${index}`}>
                <input
                  placeholder={t('cook.ingName')}
                  value={item.name}
                  onChange={(event) => {
                    const next = [...ingredients]
                    next[index] = { ...item, name: event.target.value }
                    setIngredients(next)
                  }}
                />
                <input
                  placeholder={t('cook.ingQty')}
                  value={item.qty}
                  onChange={(event) => {
                    const next = [...ingredients]
                    next[index] = { ...item, qty: event.target.value }
                    setIngredients(next)
                  }}
                />
                <select
                  value={item.shop}
                  onChange={(event) => {
                    const next = [...ingredients]
                    next[index] = { ...item, shop: event.target.value }
                    setIngredients(next)
                  }}
                >
                  {SHOPS.map((shop) => (
                    <option key={shop} value={shop}>
                      {labelOf(t, 'shop', shop)}
                    </option>
                  ))}
                </select>
              </div>
            ))}
            <button type="button" className="text-btn" onClick={() => setIngredients((list) => [...list, emptyIng()])}>
              {t('cook.addIng')}
            </button>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="cook-pane">
            <h2>{t('cook.stepFire')}</h2>
            {steps.map((item, index) => (
              <label key={`step-${index}`}>
                {t('cook.stepN', { n: index + 1 })}
                <textarea
                  rows={2}
                  value={item}
                  onChange={(event) => {
                    const next = [...steps]
                    next[index] = event.target.value
                    setSteps(next)
                  }}
                />
              </label>
            ))}
            <button type="button" className="text-btn" onClick={() => setSteps((list) => [...list, ''])}>
              {t('cook.addStep')}
            </button>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="cook-pane">
            <h2>{t('cook.stepServe')}</h2>
            <article className="cook-preview">
              {image ? <img src={image} alt="" /> : null}
              <p className="cook-kicker">{t('cook.community')}</p>
              <h3>{title}</h3>
              <p>{summary}</p>
              <p className="meta">
                {t('cook.byCook')} {user.name}
              </p>
            </article>
            <label className="cook-seal">
              <input type="checkbox" checked={seal} onChange={(event) => setSeal(event.target.checked)} />
              {t('cook.seal')}
            </label>
            <p className="note">{t('cook.hint')}</p>
          </div>
        ) : null}

        {error ? <p className="cook-error">{error}</p> : null}
        <div className="cook-actions">
          {step > 0 ? (
            <button type="button" className="btn btn-ghost" onClick={() => setStep((value) => value - 1)}>
              {t('cook.back')}
            </button>
          ) : (
            <span />
          )}
          {step < 3 ? (
            <button type="button" className="btn btn-light" disabled={!canNext()} onClick={() => setStep((value) => value + 1)}>
              {t('cook.next')}
            </button>
          ) : (
            <button type="button" className="btn btn-light" disabled={!seal || busy === 'publish'} onClick={submit}>
              {busy === 'publish' ? t('cook.publishing') : t('cook.publish')}
            </button>
          )}
        </div>
      </section>
    </main>
  )
}
