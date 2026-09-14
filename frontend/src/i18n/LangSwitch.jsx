import Flag from './Flags.jsx'
import { useI18n } from './LanguageContext.jsx'

export default function LangSwitch() {
  const { lang, setLang, langs } = useI18n()
  return (
    <div className="lang-switch" role="group" aria-label="Language">
      {langs.map((item) => (
        <button
          key={item.id}
          type="button"
          className={item.id === lang ? 'active' : ''}
          onClick={() => setLang(item.id)}
          title={item.label}
          aria-label={item.label}
          aria-pressed={item.id === lang}
        >
          <Flag id={item.id} />
        </button>
      ))}
    </div>
  )
}
