import { NavLink, Outlet } from 'react-router-dom'
import { BrandMark, IconBook, IconHome, IconPin, IconShop } from './Icons.jsx'
import { useLocationData } from '../geo/LocationContext.jsx'
import LangSwitch from '../i18n/LangSwitch.jsx'
import { useI18n } from '../i18n/LanguageContext.jsx'

export default function Layout() {
  const { label, status, locate, source } = useLocationData()
  const { t } = useI18n()
  const links = [
    { to: '/', label: t('nav.home'), icon: IconHome, end: true },
    { to: '/lugares', label: t('nav.places'), icon: IconShop },
    { to: '/recetas', label: t('nav.recipes'), icon: IconBook },
  ]

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <nav className="bottom-nav">
          {links.map(({ to, label: text, icon: Ico, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => (isActive ? 'active' : '')}>
              <Ico />
              {text}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="content">
        <header className="topbar">
          <div className="brand">
            <BrandMark />
            <div>
              <h1>SinGluten Life</h1>
              <p>{t('brand.tag')}</p>
            </div>
          </div>
          <div className="topbar-tools">
            <LangSwitch />
            <button type="button" className="chip-location" onClick={locate} title={t('loc.update')}>
              <IconPin />
              <span>
                {status === 'locating' ? t('loc.searching') : label}
                {source === 'ip' && status === 'ready' ? t('loc.approx') : ''}
              </span>
            </button>
          </div>
        </header>
        <Outlet />
      </div>
    </div>
  )
}
