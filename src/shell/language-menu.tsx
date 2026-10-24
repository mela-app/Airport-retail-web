/**
 * The language dropdown: a compact button showing the current language that opens a menu of the available
 * ones. Used in the top bar and on the phone claim page (`tone="dark"` for its dark header).
 */
import { LANGUAGES, useI18n } from '../i18n';
import { Icon } from '../ui/icon';
import { Popover } from '../ui/overlay';

export function LanguageMenu({ tone = 'default' }: { tone?: 'default' | 'dark' }) {
  const { t, lang, setLang } = useI18n();
  const current = LANGUAGES.find((l) => l.id === lang);
  return (
    <Popover
      label={t('shell.header.language')}
      align="end"
      panelClassName="popover__panel--menu"
      trigger={({ open, toggle }) => (
        <button
          type="button"
          className={`langmenu__trigger${tone === 'dark' ? ' langmenu__trigger--dark' : ''}${open ? ' is-open' : ''}`}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label={`${t('shell.lang.menu')}: ${current?.label ?? lang}`}
          onClick={toggle}
        >
          <Icon name="globe" size={16} />
          <span lang={lang}>{current?.label ?? lang}</span>
          <span className="langmenu__chevron" aria-hidden="true">
            <Icon name="chevron-down" size={14} />
          </span>
        </button>
      )}
    >
      {(close) => (
        <ul className="langmenu" role="menu" aria-label={t('shell.header.language')}>
          {LANGUAGES.map((l) => (
            <li key={l.id} role="none">
              <button
                type="button"
                role="menuitemradio"
                aria-checked={l.id === lang}
                className={l.id === lang ? 'langmenu__item is-active' : 'langmenu__item'}
                onClick={() => {
                  setLang(l.id);
                  close();
                }}
              >
                <span className="langmenu__code">{l.id.toUpperCase()}</span>
                <span className="langmenu__label" lang={l.id}>
                  {l.label}
                </span>
                {l.id === lang ? <Icon name="check" size={16} /> : null}
              </button>
            </li>
          ))}
        </ul>
      )}
    </Popover>
  );
}
