/** The top bar: brand, role switcher, language, split-screen toggle, API docs and the live indicator. */
import { useAppConfig } from '../app/config';
import { ROLES, resolveRoute, roleLabel } from '../app/roles';
import { LANGUAGES, useI18n } from '../i18n';
import { useLiveStatus } from '../lib/live';
import { hrefOf, useLocation, useNavigate } from '../lib/router';
import { Button } from '../ui/controls';
import { Icon } from '../ui/icon';
import { Popover } from '../ui/overlay';
import { LanguageMenu } from './language-menu';
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
  const { t } = useI18n();
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
            aria-label={t('demo.guide.open')}
            title={t('demo.guide.open')}
          >
            <span className="topbar__label topbar__label--demo">{t('demo.guide.open')}</span>
          </Button>
          {/* Wide screens: these sit in the bar; narrower ones (CSS) move them into the menu below. */}
          <div className="topbar__wide">
            <LanguageMenu />
            <Button
              variant="ghost"
              icon="split"
              onClick={split ? exitSplit : enterSplit}
              aria-pressed={split}
              title={split ? t('shell.header.exitSplit') : t('shell.header.split')}
            >
              <span className="topbar__label">
                {split ? t('shell.header.exitSplit') : t('shell.header.split')}
              </span>
            </Button>
            <a
              className="btn btn--ghost btn--md"
              href="/api/docs/"
              target="_blank"
              rel="noopener noreferrer"
              title={t('shell.header.apiDocs')}
            >
              <Icon name="external" size={16} />
              <span className="topbar__label">{t('shell.header.apiDocs')}</span>
            </a>
          </div>
          <NavMenu
            split={split}
            current={current}
            onRole={(id) => navigate(roleHome(id))}
            onSplit={split ? exitSplit : enterSplit}
          />
        </div>
      </div>
    </header>
  );
}

/**
 * The menu for narrower screens (shown by CSS below 1100 px): the roles, language, split screen and API docs
 * that the bar cannot fit.
 */
function NavMenu({
  split,
  current,
  onRole,
  onSplit,
}: {
  split: boolean;
  current: string | undefined;
  onRole: (id: (typeof ROLES)[number]['id']) => void;
  onSplit: () => void;
}) {
  const { t, lang, setLang } = useI18n();
  return (
    <div className="topbar__menu">
      <Popover
        label={t('shell.header.menu')}
        align="end"
        panelClassName="popover__panel--nav"
        trigger={({ open, toggle }) => (
          <button
            type="button"
            className={open ? 'topbar__menu-btn is-open' : 'topbar__menu-btn'}
            aria-haspopup="menu"
            aria-expanded={open}
            aria-label={t('shell.header.menu')}
            onClick={toggle}
          >
            <Icon name={open ? 'x' : 'menu'} size={20} />
          </button>
        )}
      >
        {(close) => (
          <nav className="navmenu" aria-label={t('shell.header.menu')}>
            {split ? null : (
              <>
                <p className="navmenu__heading">{t('shell.header.roles')}</p>
                {ROLES.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    className={r.id === current ? 'navmenu__item is-active' : 'navmenu__item'}
                    aria-current={r.id === current ? 'page' : undefined}
                    onClick={() => {
                      onRole(r.id);
                      close();
                    }}
                  >
                    <Icon name={r.icon} size={18} />
                    <span>{t(roleLabel(r.id))}</span>
                    {r.id === current ? <Icon name="check" size={16} /> : null}
                  </button>
                ))}
                <hr className="navmenu__rule" />
              </>
            )}
            <p className="navmenu__heading">{t('shell.header.language')}</p>
            <div className="navmenu__langs">
              {LANGUAGES.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  lang={l.id}
                  className={l.id === lang ? 'navmenu__lang is-active' : 'navmenu__lang'}
                  aria-pressed={l.id === lang}
                  onClick={() => setLang(l.id)}
                >
                  {l.label}
                </button>
              ))}
            </div>
            <hr className="navmenu__rule" />
            <button
              type="button"
              className="navmenu__item"
              onClick={() => {
                onSplit();
                close();
              }}
            >
              <Icon name="split" size={18} />
              <span>{split ? t('shell.header.exitSplit') : t('shell.header.split')}</span>
            </button>
            <a className="navmenu__item" href="/api/docs/" target="_blank" rel="noopener noreferrer">
              <Icon name="external" size={18} />
              <span>{t('shell.header.apiDocs')}</span>
            </a>
          </nav>
        )}
      </Popover>
    </div>
  );
}

function LiveIndicator() {
  const { t } = useI18n();
  const status = useLiveStatus();
  return (
    <span className={`live live--${status}`} role="status">
      <span className="live__dot" aria-hidden="true" />
      <span className="live__label">
        {status === 'live'
          ? t('shell.live.live')
          : status === 'connecting'
            ? t('shell.live.connecting')
            : t('shell.live.reconnecting')}
      </span>
    </span>
  );
}
