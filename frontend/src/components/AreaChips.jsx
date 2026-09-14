import { GUIDE_AREAS } from '../geo/areas.js'
import { useLocationData } from '../geo/LocationContext.jsx'

export default function AreaChips() {
  const { browseArea, label, source } = useLocationData()

  return (
    <div className="filters">
      {GUIDE_AREAS.map((area) => (
        <button
          key={area.id}
          type="button"
          className={source === 'manual' && label === area.label ? 'filter active' : 'filter'}
          onClick={() => browseArea(area)}
        >
          {area.label}
        </button>
      ))}
    </div>
  )
}
