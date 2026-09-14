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
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path
          d="M6 12.4 10.1 16.6 18.4 8"
          stroke="#e8f6ff"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  )
}
