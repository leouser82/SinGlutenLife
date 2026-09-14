const SIZE = { width: 36, height: 24 }

function Frame({ children }) {
  return (
    <svg
      viewBox={`0 0 ${SIZE.width} ${SIZE.height}`}
      preserveAspectRatio="xMidYMid slice"
      className="lang-flag"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

function Argentina() {
  return (
    <Frame>
      <rect width="36" height="8" fill="#74acdf" />
      <rect y="8" width="36" height="8" fill="#fff" />
      <rect y="16" width="36" height="8" fill="#74acdf" />
      <circle cx="18" cy="12" r="3.1" fill="#f6b40e" />
      <circle cx="18" cy="12" r="1.35" fill="#85340a" />
    </Frame>
  )
}

function UnitedKingdom() {
  return (
    <Frame>
      <defs>
        <clipPath id="flag-uk">
          <rect width="36" height="24" />
        </clipPath>
      </defs>
      <g clipPath="url(#flag-uk)">
        <rect width="36" height="24" fill="#012169" />
        <path d="M0 0 L36 24 M36 0 L0 24" stroke="#fff" strokeWidth="5.5" />
        <path d="M0 0 L36 24" stroke="#c8102e" strokeWidth="2.4" />
        <path d="M36 0 L0 24" stroke="#c8102e" strokeWidth="2.4" />
        <path d="M18 0 V24 M0 12 H36" stroke="#fff" strokeWidth="9" />
        <path d="M18 0 V24 M0 12 H36" stroke="#c8102e" strokeWidth="5.2" />
      </g>
    </Frame>
  )
}

function Italy() {
  return (
    <Frame>
      <rect width="12" height="24" fill="#009246" />
      <rect x="12" width="12" height="24" fill="#fff" />
      <rect x="24" width="12" height="24" fill="#ce2b37" />
    </Frame>
  )
}

function France() {
  return (
    <Frame>
      <rect width="12" height="24" fill="#002395" />
      <rect x="12" width="12" height="24" fill="#fff" />
      <rect x="24" width="12" height="24" fill="#ed2939" />
    </Frame>
  )
}

function Galicia() {
  return (
    <Frame>
      <rect width="36" height="24" fill="#fff" />
      <path d="M0 0 L14 0 L36 24 L22 24 Z" fill="#0a7cc2" />
    </Frame>
  )
}

const FLAGS = {
  es: Argentina,
  en: UnitedKingdom,
  it: Italy,
  fr: France,
  gl: Galicia,
}

export default function Flag({ id }) {
  const Icon = FLAGS[id]
  return Icon ? <Icon /> : null
}
