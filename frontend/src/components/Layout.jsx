import { NavLink, Outlet } from 'react-router-dom'
import { BrandMark, IconBook, IconHome, IconPin, IconShop } from './Icons.jsx'
import { useLocationData } from '../geo/LocationContext.jsx'

const links = [
  { to: '/', label: 'Inicio', icon: IconHome, end: true },
  { to: '/lugares', label: 'Lugares', icon: IconShop },
  { to: '/recetas', label: 'Recetas', icon: IconBook },
]

export default function Layout() {
  const { label, status, locate, source } = useLocationData()

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
              <p>Comé rico. Comé seguro.</p>
            </div>
          </div>
          <button type="button" className="chip-location" onClick={locate} title="Actualizar ubicación">
            <IconPin />
            <span>
              {status === 'locating' ? 'Buscando…' : label}
              {source === 'ip' && status === 'ready' ? ' (aprox.)' : ''}
            </span>
          </button>
        </header>
        <Outlet />
      </div>
    </div>
  )
}