/**
 * Split-screen demo mode: two role views side by side under one simulation bar, e.g. the airline injecting
 * a delay on the left and the gate screen re-planning on the right. Each pane has its own location, kept in
 * the address bar (`/split?left=…&right=…`) so the layout can be bookmarked and shared.
 */
import { useCallback } from 'react';

import { DEFAULT_SCREEN } from '../app/roles';
import { useI18n } from '../i18n';
import { PaneRouter, hrefOf, useLocation, useNavigate } from '../lib/router';
import { RoleView } from './role-view';

export const DEFAULT_LEFT = '/airline?as=adv-air-XH';
export const DEFAULT_RIGHT = `/passenger/${DEFAULT_SCREEN}`;

/** Only in-app paths are accepted as pane locations. */
const safePane = (value: string | null, fallback: string) =>
  value && value.startsWith('/') && !value.startsWith('//') && !value.startsWith('/split') ? value : fallback;

export function SplitView() {
  const { t } = useI18n();
  const { query } = useLocation();
  const navigate = useNavigate();
  const left = safePane(query.get('left'), DEFAULT_LEFT);
  const right = safePane(query.get('right'), DEFAULT_RIGHT);

  const setLeft = useCallback(
    (to: string) => navigate(hrefOf('/split', { left: to, right }), { replace: true }),
    [navigate, right],
  );
  const setRight = useCallback(
    (to: string) => navigate(hrefOf('/split', { left, right: to }), { replace: true }),
    [navigate, left],
  );

  return (
    <div className="split" id="content">
      <section className="split__pane" aria-label={t('shell.split.left')}>
        <PaneRouter href={left} onNavigate={setLeft}>
          <RoleView compact />
        </PaneRouter>
      </section>
      <section className="split__pane" aria-label={t('shell.split.right')}>
        <PaneRouter href={right} onNavigate={setRight}>
          <RoleView compact />
        </PaneRouter>
      </section>
    </div>
  );
}
