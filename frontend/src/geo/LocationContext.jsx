import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useI18n } from '../i18n/LanguageContext.jsx'
import { rememberPlaces } from './placeCache.js'
import { detectLocation } from './geo.js'
import { fetchNearbyPlaces } from './places.js'

const LOC_KEY = 'sgl-last-loc-v1'

function readSavedLoc() {
  try {
    const data = JSON.parse(localStorage.getItem(LOC_KEY) || '')
    if (!Number.isFinite(data?.lat) || !Number.isFinite(data?.lon)) return null
    if (Date.now() - Number(data.at || 0) > 14 * 86400000) return null
    return data
  } catch {
    return null
  }
}

function saveLoc(found) {
  try {
    localStorage.setItem(
      LOC_KEY,
      JSON.stringify({
        lat: found.lat,
        lon: found.lon,
        label: found.label,
        source: found.source,
        at: Date.now(),
      }),
    )
  } catch {
    // cupo del navegador
  }
}

const LocationContext = createContext({
  status: 'locating',
  coords: null,
  label: 'Buscando…',
  source: null,
  places: [],
  pharmacies: [],
  placesStatus: 'idle',
  error: '',
  locate: () => {},
  browseArea: () => {},
})

export function LocationProvider({ children }) {
  const { t } = useI18n()
  const tRef = useRef(t)
  tRef.current = t
  const [status, setStatus] = useState('locating')
  const [coords, setCoords] = useState(null)
  const [label, setLabel] = useState(() => t('loc.searching'))
  const [source, setSource] = useState(null)
  const [places, setPlaces] = useState([])
  const [pharmacies, setPharmacies] = useState([])
  const [placesStatus, setPlacesStatus] = useState('idle')
  const [error, setError] = useState('')

  const applyFix = useCallback((found) => {
    setCoords({ lat: found.lat, lon: found.lon })
    setLabel(found.label)
    setSource(found.source)
    setStatus('ready')
    setError('')
    saveLoc(found)
  }, [])

  const loadPlaces = useCallback(async (lat, lon) => {
    setPlacesStatus('loading')
    try {
      const nearby = await fetchNearbyPlaces(lat, lon, (partial) => {
        setPlaces(partial.places)
        setPharmacies(partial.pharmacies)
        rememberPlaces(partial.places, partial.pharmacies)
        if (partial.places.length + partial.pharmacies.length > 0) {
          setPlacesStatus('ready')
        }
      })
      setPlaces(nearby.places)
      setPharmacies(nearby.pharmacies)
      rememberPlaces(nearby.places, nearby.pharmacies)
      setPlacesStatus('ready')
    } catch {
      setPlacesStatus('error')
    }
  }, [])

  const locate = useCallback(async () => {
    const saved = readSavedLoc()
    if (saved) {
      applyFix(saved)
      loadPlaces(saved.lat, saved.lon)
    } else {
      setStatus('locating')
      setLabel(tRef.current('loc.searching'))
    }
    setError('')
    try {
      const found = await detectLocation((early) => {
        if (early.source === 'gps' || !saved) {
          applyFix(early)
          loadPlaces(early.lat, early.lon)
        }
      })
      if (found.source === 'gps' || !saved) {
        applyFix(found)
        await loadPlaces(found.lat, found.lon)
      }
    } catch {
      if (saved) return
      setStatus('error')
      setLabel(tRef.current('loc.unavailable'))
      setError(tRef.current('loc.error'))
    }
  }, [applyFix, loadPlaces])

  const browseArea = useCallback(
    async (area) => {
      applyFix({ lat: area.lat, lon: area.lon, label: area.label, source: 'manual' })
      await loadPlaces(area.lat, area.lon)
    },
    [applyFix, loadPlaces],
  )

  useEffect(() => {
    locate()
  }, [locate])

  useEffect(() => {
    if (status === 'locating' && !coords) setLabel(t('loc.searching'))
    if (status === 'error') {
      setLabel(t('loc.unavailable'))
      setError(t('loc.error'))
    }
  }, [t, status, coords])

  const value = useMemo(
    () => ({
      status,
      coords,
      label,
      source,
      places,
      pharmacies,
      placesStatus,
      error,
      locate,
      browseArea,
    }),
    [status, coords, label, source, places, pharmacies, placesStatus, error, locate, browseArea],
  )

  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>
}

export function useLocationData() {
  return useContext(LocationContext)
}
