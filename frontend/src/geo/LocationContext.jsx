import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { rememberPlaces } from './placeCache.js'
import { detectLocation } from './geo.js'
import { fetchNearbyPlaces } from './places.js'

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
  const [status, setStatus] = useState('locating')
  const [coords, setCoords] = useState(null)
  const [label, setLabel] = useState('Buscando…')
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
    setStatus('locating')
    setError('')
    setLabel('Buscando…')
    try {
      const found = await detectLocation((early) => {
        applyFix(early)
        loadPlaces(early.lat, early.lon)
      })
      applyFix(found)
      await loadPlaces(found.lat, found.lon)
    } catch {
      setStatus('error')
      setLabel('Ubicación no disponible')
      setError('No pudimos leer tu ubicación. Elegí una ciudad o activá el GPS.')
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
