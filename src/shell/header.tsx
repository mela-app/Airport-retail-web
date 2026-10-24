/** The top bar: brand, role switcher, language, split-screen toggle, API docs and the live indicator. */
import { useAppConfig } from '../app/config';
import { ROLES, resolveRoute, roleLabel } from '../app/roles';
import { LANGUAGES, useI18n } from '../i18n';
import { useLiveStatus } from '../lib/live';
import { hrefOf, useLocation, useNavigate } from '../lib/router';
import { Button } from '../ui/controls';
import { Icon } from '../ui/icon';
import { roleHome } from './role-view';
import { DEFAULT_LEFT, DEFAULT_RIGHT } from './split-view';

export function Header({
  split,
  onDemo,
  demoOpen,
}: {
  split: boolean;
  onDemo: () => void;
  demoOpen: boolean;
}) {
  const { brand } = useAppConfig();
  const { t, lang, setLang } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();
  const current = split ? undefined : resolveRoute(location.path)?.role.id;

  const enterSplit = () => {
    const here = resolveRoute(location.path) ? location.href : DEFAULT_LEFT;
    navigate(hrefOf('/split', { left: here, right: here === DEFAULT_RIGHT ? DEFAULT_LEFT : DEFAULT_RIGHT }));
  };
  const exitSplit = () => navigate(location.query.get('left') ?? DEFAULT_LEFT);

  return (
    <header className="topbar" data-theme="dark">
      <div className="topbar__inner">
        <div className="brand" title={brand.operatorName}>
          <span className="brand__mark" aria-hidden="true">
            <svg viewBox="0 0 32 32" width="28" height="28">
              <rect width="32" height="32" rx="7" fill="var(--brand-accent)" />
              <path
                d="M8 21h16M10 21V11l6 5 6-5v10"
                fill="none"
                stroke="var(--brand-accent-ink)"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span className="brand__text">
            <span className="brand__name">{brand.productName}</span>
            <span className="brand__airport">
              {brand.airportName} · <span className="ltr">{brand.airportCode}</span>
            </span>
          </span>
        </div>

        {split ? null : (
          <nav className="roles" aria-label="Roles">
            {ROLES.map((r) => (
              <button
                key={r.id}
                type="button"
                className={r.id === current ? 'roles__item is-active' : 'roles__item'}
                aria-current={r.id === current ? 'page' : undefined}
                onClick={() => navigate(roleHome(r.id))}
              >
                <Icon name={r.icon} size={16} />
                <span>{t(roleLabel(r.id))}</span>
              </button>
            ))}
          </nav>
        )}

        <div className="topbar__end">
          <LiveIndicator />
          <Button
            variant={demoOpen ? 'primary' : 'ghost'}
            icon="sparkle"
            onClick={onDemo}
            aria-pressed={demoOpen}
          >
            {t('demo.guide.open')}
          </Button>
          <div className="lang" role="group" aria-label={t('shell.header.language')}>
            <Icon name="globe" size={16} />
            {LANGUAGES.map((l) => (
              <button
                key={l.id}
                type="button"
                lang={l.id}
                className={l.id === lang ? 'lang__item is-active' : 'lang__item'}
                aria-pressed={l.id === lang}
                onClick={() => setLang(l.id)}
              >
                {l.label}
              </button>
            ))}
          </div>
          <Button variant="ghost" icon="split" onClick={split ? exitSplit : enterSplit} aria-pressed={split}>
            {split ? t('shell.header.exitSplit') : t('shell.header.split')}
          </Button>
          <a className="btn btn--ghost btn--md" href="/api/docs/" target="_blank" rel="noopener noreferrer">
            <Icon name="external" size={16} />
            {t('shell.header.apiDocs')}
          </a>
        </div>
      </div>
    </header>
  );
}

function LiveIndicator() {
  const { t } = useI18n();
  const status = useLiveStatus();
  return (
    <span className={`live live--${status}`} role="status">
      <span className="live__dot" aria-hidden="true" />
      {status === 'live'
        ? t('shell.live.live')
        : status === 'connecting'
          ? t('shell.live.connecting')
          : t('shell.live.reconnecting')}
    </span>
  );
}
