function Icon({ d, size = 22 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d={d} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function IconPin() {
  return <Icon d="M12 21s7-5.4 7-11a7 7 0 1 0-14 0c0 5.6 7 11 7 11zm0-8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z" />
}
export function IconHome() {
  return <Icon d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z" />
}
export function IconShop() {
  return <Icon d="M4 9h16l-1.2 11H5.2L4 9zm2-4h12l1 4H5l1-4z" />
}
export function IconGlobe() {
  return <Icon d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3.6 9h16.8M3.6 15h16.8M12 3c2.6 3 4 6.4 4 9s-1.4 6-4 9c-2.6-3-4-6.4-4-9s1.4-6 4-9z" />
}
export function IconPill() {
  return <Icon d="M8.5 15.5 15.5 8.5a4 4 0 0 1 5.6 5.6l-7 7a4 4 0 0 1-5.6-5.6zM7 17l-2 2" />
}
export function IconMeal() {
  return <Icon d="M4 20h16M7 20V8m5 12V4m5 16v-7" />
}
export function IconBook() {
  return <Icon d="M5 5.5A2.5 2.5 0 0 1 7.5 3H20v16H7.5A2.5 2.5 0 0 0 5 21.5V5.5zM5 21.5h15" />
}
export function IconPlus() {
  return <Icon d="M12 5v14M5 12h14" />
}

export function BrandMark() {
  return (
    <div className="brand-mark" aria-hidden>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path
          d="M12 20.2V7.2"
          stroke="#e8f6ff"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
        <path
          d="M12 8.2c-1.7-.9-2.8-2.1-2.8-3.4M12 8.2c1.7-.9 2.8-2.1 2.8-3.4M12 11.2c-2-.7-3.3-1.8-3.3-3.1M12 11.2c2-.7 3.3-1.8 3.3-3.1M12 14.1c-2.1-.6-3.5-1.6-3.5-2.8M12 14.1c2.1-.6 3.5-1.6 3.5-2.8"
          stroke="#e8f6ff"
          strokeWidth="1.55"
          strokeLinecap="round"
        />
        <path
          d="M6.2 17.6 17.8 6.4"
          stroke="#ffc4ae"
          strokeWidth="2.3"
          strokeLinecap="round"
        />
      </svg>
    </div>
  )
}
