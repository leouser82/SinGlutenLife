import { useI18n } from '../i18n/LanguageContext.jsx'

export default function Pager({ page, pages, onPage }) {
  const { t } = useI18n()
  if (pages <= 1) return null

  return (
    <nav className="pager" aria-label={t('pager.of', { page, pages })}>
      <button type="button" className="chip-arrow" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label={t('pager.prev')}>
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
          <path d="M10 3.5 5.5 8 10 12.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <span>
        {t('pager.of', { page, pages })}
      </span>
      <button type="button" className="chip-arrow" disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label={t('pager.next')}>
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
          <path d="M6 3.5 10.5 8 6 12.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </nav>
  )
}
