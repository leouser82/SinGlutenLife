import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext.jsx'
import { CommunityProvider } from './community/CommunityContext.jsx'
import Analytics from './components/Analytics.jsx'
import Layout from './components/Layout.jsx'
import { LocationProvider } from './geo/LocationContext.jsx'
import { LanguageProvider } from './i18n/LanguageContext.jsx'
import Home from './pages/Home.jsx'
import Lugares from './pages/Lugares.jsx'
import LugaresRemotos from './pages/LugaresRemotos.jsx'
import PlaceDetalle from './pages/PlaceDetalle.jsx'
import RecetaDetalle from './pages/RecetaDetalle.jsx'
import Recetas from './pages/Recetas.jsx'
import SubirReceta from './pages/SubirReceta.jsx'

const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || undefined

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <LocationProvider>
          <CommunityProvider>
            <BrowserRouter basename={basename}>
              <Analytics />
              <Routes>
                <Route element={<Layout />}>
                  <Route index element={<Home />} />
                  <Route path="lugares" element={<Lugares />} />
                  <Route path="lugares-remotos" element={<LugaresRemotos />} />
                  <Route path="farmacias" element={<Navigate to="/" replace />} />
                  <Route path="lugar/:id" element={<PlaceDetalle />} />
                  <Route path="menu" element={<Navigate to="/recetas" replace />} />
                  <Route path="recetas" element={<Recetas />} />
                  <Route path="recetas/nueva" element={<SubirReceta />} />
                  <Route path="recetas/:id" element={<RecetaDetalle />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Route>
              </Routes>
            </BrowserRouter>
          </CommunityProvider>
        </LocationProvider>
      </AuthProvider>
    </LanguageProvider>
  )
}
