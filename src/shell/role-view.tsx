/**
 * One role view: the page header (role, company switcher, sub-page tabs) and the page itself, in the role's
 * theme. Used full-width, and twice side by side in split-screen mode (`compact`).
 */
import { useAppConfig } from '../app/config';
import {
  DEFAULT_SCREEN,
  ROLES,
  type RoleDef,
  type RoleId,
  pageLabel,
  pagePath,
  resolveRoute,
  roleHint,
  roleLabel,
} from '../app/roles';
import { useI18n } from '../i18n';
import { readPref, writePref } from '../lib/prefs';
import { hrefOf, useLocation, useNavigate } from '../lib/router';
import type { Advertiser } from '../lib/types';
import { pageComponent } from '../pages/registry';
import { Button, Select } from '../ui/controls';
import { Icon } from '../ui/icon';

/** The company a role acts as: `?as=`, else the last one used, else the role's default. */
export function usePersona(role: RoleDef): Advertiser | undefined {
  const { query } = useLocation();
  const { advertisers } = useAppConfig();
  if (!role.personas) return undefined;
  const wanted = query.get('as') ?? readPref(`persona.${role.id}`) ?? role.personas[0];
  return advertisers.find((a) => a.id === wanted) ?? advertisers.find((a) => a.id === role.personas?.[0]);
}

/** Default location of a role, keeping the remembered persona. */
export function roleHome(role: RoleId): string {
  if (role === 'passenger') return `/passenger/${DEFAULT_SCREEN}`;
  return pagePath(role, 'overview');
}

export function RoleView({ compact = false }: { compact?: boolean }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useI18n();
  const route = resolveRoute(location.path);
  const persona = usePersona(route?.role ?? ROLES[0]!);

  if (!route) {
    return (
      <div className="role-view" data-theme="light">
        <div className="page">
          <div className="card state">
            <Icon name="map" size={22} />
            <p>
              <strong>{t('common.ui.notFound')}</strong>
            </p>
            <Button variant="primary" onClick={() => navigate('/admin')}>
              {t('common.ui.backHome')}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const { role, page } = route;
  const Page = pageComponent(role.id, page);
  const as = role.personas ? persona?.id : undefined;
  const go = (nextPage: string) => navigate(hrefOf(pagePath(role.id, nextPage), { as }));
  const switchPersona = (id: string) => {
    writePref(`persona.${role.id}`, id);
    navigate(hrefOf(location.path, { as: id }), { replace: true });
  };

  return (
    <div className={compact ? 'role-view role-view--compact' : 'role-view'} data-theme={role.theme}>
      <div className="page-head">
        <div className="page-head__inner">
          <div className="page-head__identity">
            {compact ? (
              <Select
                aria-label={t('shell.split.role')}
                value={role.id}
                onChange={(e) => navigate(roleHome(e.target.value as RoleId))}
              >
                {ROLES.map((r) => (
                  <option key={r.id} value={r.id}>
                    {t(roleLabel(r.id))}
                  </option>
                ))}
              </Select>
            ) : (
              <span className="page-head__role">
                <Icon name={role.icon} size={20} />
                <span>
                  <span className="page-head__title">{t(roleLabel(role.id))}</span>
                  <span className="page-head__hint">{t(roleHint(role.id))}</span>
                </span>
              </span>
            )}
            {role.personas ? (
              <PersonaSelect role={role} value={persona?.id} onChange={switchPersona} />
            ) : null}
          </div>
          {role.pages.length > 1 ? (
            <nav className="tabs" aria-label={t(roleLabel(role.id))}>
              {role.pages.map((p) => (
                <button
                  key={p}
                  type="button"
                  className={p === page ? 'tabs__item is-active' : 'tabs__item'}
                  aria-current={p === page ? 'page' : undefined}
                  onClick={() => go(p)}
                >
                  {t(pageLabel(role.id, p))}
                </button>
              ))}
            </nav>
          ) : null}
        </div>
      </div>
      <main className="page" id={compact ? undefined : 'content'}>
        <Page persona={persona} rest={route.rest} />
      </main>
    </div>
  );
}

function PersonaSelect({
  role,
  value,
  onChange,
}: {
  role: RoleDef;
  value: string | undefined;
  onChange: (id: string) => void;
}) {
  const { t } = useI18n();
  const { advertisers } = useAppConfig();
  const options = (role.personas ?? [])
    .map((id) => advertisers.find((a) => a.id === id))
    .filter((a): a is Advertiser => Boolean(a));
  const current = options.find((a) => a.id === value);
  return (
    <span className="persona">
      <span className="persona__swatch" style={{ background: current?.brandColor }} aria-hidden="true" />
      <Select aria-label={t('shell.header.company')} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name} · {a.category}
          </option>
        ))}
      </Select>
    </span>
  );
}
