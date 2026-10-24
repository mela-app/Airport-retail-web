/**
 * A small router. The browser router follows the address bar; a pane router keeps its location in a value
 * owned by its parent, which is how split-screen mode shows two independent role views in one page.
 *
 * Locations are plain strings (`/retailer/campaigns?as=adv-aurelia`). Navigation uses buttons, not anchors,
 * so a pane never changes the address bar by accident.
 */
import { type ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export interface Location {
  path: string;
  query: URLSearchParams;
  /** `path` plus `?query`, as passed to `navigate`. */
  href: string;
}

interface RouterValue {
  location: Location;
  navigate: (to: string, options?: { replace?: boolean }) => void;
}

const RouterContext = createContext<RouterValue | null>(null);

export function parseLocation(href: string): Location {
  const q = href.indexOf('?');
  const path = normalizePath(q < 0 ? href : href.slice(0, q));
  const query = new URLSearchParams(q < 0 ? '' : href.slice(q + 1));
  const search = query.toString();
  return { path, query, href: search ? `${path}?${search}` : path };
}

function normalizePath(path: string): string {
  const trimmed = path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path;
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

const currentHref = () => `${window.location.pathname}${window.location.search}`;

export function BrowserRouter({ children }: { children: ReactNode }) {
  const [href, setHref] = useState(currentHref);
  useEffect(() => {
    const onPop = () => setHref(currentHref());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  const navigate = useCallback((to: string, options?: { replace?: boolean }) => {
    const next = parseLocation(to).href;
    if (options?.replace) window.history.replaceState(null, '', next);
    else window.history.pushState(null, '', next);
    setHref(next);
    if (!options?.replace) window.scrollTo(0, 0);
  }, []);
  const value = useMemo(() => ({ location: parseLocation(href), navigate }), [href, navigate]);
  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
}

/** A router whose location is controlled by the parent (one pane of split-screen mode). */
export function PaneRouter({
  href,
  onNavigate,
  children,
}: {
  href: string;
  onNavigate: (to: string) => void;
  children: ReactNode;
}) {
  const value = useMemo(
    () => ({ location: parseLocation(href), navigate: (to: string) => onNavigate(parseLocation(to).href) }),
    [href, onNavigate],
  );
  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
}

function useRouter(): RouterValue {
  const value = useContext(RouterContext);
  if (!value) throw new Error('useRouter outside a router');
  return value;
}

export const useLocation = () => useRouter().location;
export const useNavigate = () => useRouter().navigate;

/**
 * Match `/passenger/:screenId` against a path. Returns the parameters, or null. A trailing `*` matches the
 * rest of the path.
 */
export function matchPath(pattern: string, path: string): Map<string, string> | null {
  const want = pattern.split('/').filter(Boolean);
  const have = path.split('/').filter(Boolean);
  const params = new Map<string, string>();
  for (const [i, part] of want.entries()) {
    if (part === '*') return params;
    const value = have.at(i);
    if (value === undefined) return part.endsWith('?') ? params : null;
    if (part.startsWith(':')) params.set(part.slice(1).replace(/\?$/, ''), decodeURIComponent(value));
    else if (part !== value) return null;
  }
  return have.length <= want.length ? params : null;
}

/** Build a location string from a path and query values (empty values are dropped). */
export function hrefOf(path: string, query: Record<string, string | null | undefined> = {}): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) if (v) params.set(k, v);
  const search = params.toString();
  return search ? `${path}?${search}` : path;
}
