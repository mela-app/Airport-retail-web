/**
 * The five roles, their pages and their personas. Each role has one dashboard plus up to three sub-pages.
 *
 *   /admin, /admin/master-data, …       pages of a role ("overview" is the role's root path)
 *   /passenger/SCR-T2-D-01              the passenger player for one screen
 *   ?as=adv-aurelia                     the company the view acts as (retailer and airline roles)
 */
import type { MessageKey } from '../i18n';
import type { IconName } from '../ui/icon';

export type RoleId = 'admin' | 'retailer' | 'media' | 'airline' | 'passenger';
export type Theme = 'light' | 'dark';

export interface RoleDef {
  id: RoleId;
  icon: IconName;
  theme: Theme;
  /** Page ids; the first is the dashboard at the role's root path. */
  pages: readonly string[];
  /** Advertiser ids the role can act as (the company switcher). The first is the default. */
  personas?: readonly string[];
}

export const ROLES: readonly RoleDef[] = [
  { id: 'admin', icon: 'shield', theme: 'dark', pages: ['overview', 'master-data', 'decisions', 'rules'] },
  {
    id: 'retailer',
    icon: 'store',
    theme: 'light',
    pages: ['overview', 'campaigns', 'creatives', 'promos'],
    // duty-free, coffee chain, toy shop, sweets
    personas: ['adv-aurelia', 'adv-brewline', 'adv-kite', 'adv-saffron'],
  },
  { id: 'media', icon: 'layers', theme: 'light', pages: ['overview', 'inventory', 'approvals', 'insights'] },
  {
    id: 'airline',
    icon: 'plane',
    theme: 'light',
    pages: ['overview', 'gates', 'offers'],
    // full-service (the worked example's XH501), low-cost, and two more
    personas: ['adv-air-XH', 'adv-air-XD', 'adv-air-YA', 'adv-air-ZO'],
  },
  { id: 'passenger', icon: 'monitor', theme: 'light', pages: ['overview'] },
];

/** The worked example's screen, in front of Gate 42. */
export const DEFAULT_SCREEN = 'SCR-T2-D-01';

export interface Route {
  role: RoleDef;
  page: string;
  /** Path segments after the page (for the passenger player: the screen id). */
  rest: string[];
}

export function resolveRoute(path: string): Route | null {
  const [roleId, ...more] = path.split('/').filter(Boolean).map(decodeURIComponent);
  const role = ROLES.find((r) => r.id === roleId);
  if (!role) return null;
  if (role.id === 'passenger') return { role, page: 'overview', rest: more.slice(0, 1) };
  if (more.length === 0) return { role, page: 'overview', rest: [] };
  const [page = ''] = more;
  // The dashboard lives at the role's root path only; sub-pages have no further segments.
  if (more.length > 1 || page === 'overview' || !role.pages.includes(page)) return null;
  return { role, page, rest: [] };
}

export function pagePath(role: RoleId, page: string): string {
  return page === 'overview' ? `/${role}` : `/${role}/${page}`;
}

export const roleLabel = (role: RoleId) => `role.${role}.name` as MessageKey;
export const roleHint = (role: RoleId) => `role.${role}.hint` as MessageKey;
export const pageLabel = (role: RoleId, page: string) => `page.${role}.${page}` as MessageKey;
