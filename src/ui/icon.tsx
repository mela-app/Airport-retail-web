/** Line icons on a 24-pixel grid, drawn for this app (stroke = currentColor). */
import type { ReactNode } from 'react';

const PATHS = new Map<string, ReactNode>([
  ['play', <path key="p" d="M8 5.5v13l10.5-6.5z" fill="currentColor" stroke="none" />],
  [
    'pause',
    <g key="p" fill="currentColor" stroke="none">
      <rect x="6.5" y="5" width="4" height="14" rx="1" />
      <rect x="13.5" y="5" width="4" height="14" rx="1" />
    </g>,
  ],
  [
    'clock',
    <g key="p">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </g>,
  ],
  [
    'plane',
    <path
      key="p"
      d="M3 13.5l7-2V5.5a2 2 0 0 1 4 0v6l7 2v2l-7-1.5v4l2 1.5v1.5l-4-1-4 1V19l2-1.5v-4L3 15.5z"
    />,
  ],
  [
    'store',
    <g key="p">
      <path d="M4 9.5l1.5-5h13L20 9.5" />
      <path d="M4 9.5a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0 2.7 2.7 0 0 0 5.3 0" />
      <path d="M5.5 12v7.5h13V12M10 19.5V15h4v4.5" />
    </g>,
  ],
  [
    'megaphone',
    <g key="p">
      <path d="M4 10v4h3l8 4.5v-13L7 10z" />
      <path d="M18 9.5a3.5 3.5 0 0 1 0 5M7 14l1.5 5h2.5l-1-4.5" />
    </g>,
  ],
  [
    'shield',
    <g key="p">
      <path d="M12 3.5l7 2.5v5.5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" />
      <path d="M9 12l2 2 4-4" />
    </g>,
  ],
  [
    'monitor',
    <g key="p">
      <rect x="3.5" y="4.5" width="17" height="11.5" rx="1.5" />
      <path d="M9 20h6M12 16v4" />
    </g>,
  ],
  [
    'qr',
    <g key="p">
      <rect x="4" y="4" width="6" height="6" rx="1" />
      <rect x="14" y="4" width="6" height="6" rx="1" />
      <rect x="4" y="14" width="6" height="6" rx="1" />
      <path d="M14 14h2.5v2.5H14zM17.5 17.5H20V20h-2.5zM14 19.5h1.5M19.5 14v1.5" />
    </g>,
  ],
  ['bolt', <path key="p" d="M13 3L5 13.5h6L10 21l8-10.5h-6z" />],
  [
    'alert',
    <g key="p">
      <path d="M12 4l9 15.5H3z" />
      <path d="M12 10v4M12 17v.5" />
    </g>,
  ],
  ['check', <path key="p" d="M5 12.5l4.5 4.5L19 7.5" />],
  ['x', <path key="p" d="M6 6l12 12M18 6L6 18" />],
  ['chevron-down', <path key="p" d="M6 9.5l6 6 6-6" />],
  ['chevron-right', <path key="p" d="M9.5 6l6 6-6 6" />],
  [
    'split',
    <g key="p">
      <rect x="3.5" y="4.5" width="17" height="15" rx="1.5" />
      <path d="M12 4.5v15" />
    </g>,
  ],
  [
    'globe',
    <g key="p">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17M12 3.5c2.5 2.5 3.5 5.5 3.5 8.5s-1 6-3.5 8.5c-2.5-2.5-3.5-5.5-3.5-8.5s1-6 3.5-8.5z" />
    </g>,
  ],
  [
    'refresh',
    <g key="p">
      <path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3" />
      <path d="M19.5 4.5v4h-4" />
    </g>,
  ],
  [
    'search',
    <g key="p">
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16l4 4" />
    </g>,
  ],
  ['plus', <path key="p" d="M12 5v14M5 12h14" />],
  [
    'edit',
    <g key="p">
      <path d="M4.5 19.5l1-4L16 5a2 2 0 0 1 3 3L8.5 18.5z" />
      <path d="M14 7l3 3" />
    </g>,
  ],
  [
    'trash',
    <g key="p">
      <path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 12.5h9l1-12.5" />
    </g>,
  ],
  [
    'copy',
    <g key="p">
      <rect x="8.5" y="8.5" width="11" height="11" rx="1.5" />
      <path d="M15.5 8.5v-3a1 1 0 0 0-1-1h-9a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h3" />
    </g>,
  ],
  [
    'info',
    <g key="p">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5.5M12 7.5v.5" />
    </g>,
  ],
  [
    'map',
    <g key="p">
      <path d="M3.5 6.5l5.5-2 6 2 5.5-2v13l-5.5 2-6-2-5.5 2z" />
      <path d="M9 4.5v13M15 6.5v13" />
    </g>,
  ],
  [
    'users',
    <g key="p">
      <circle cx="9" cy="8.5" r="3.5" />
      <path d="M2.5 19.5c.5-3.5 3-5.5 6.5-5.5s6 2 6.5 5.5" />
      <path d="M15.5 5.5a3.5 3.5 0 0 1 0 6.5M18 14.5c2 .8 3.2 2.5 3.5 5" />
    </g>,
  ],
  [
    'chart',
    <g key="p">
      <path d="M4 20V4M4 20h16" />
      <path d="M8 16v-4M12 16V8M16 16v-6" />
    </g>,
  ],
  [
    'settings',
    <g key="p">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3.5v2.5M12 18v2.5M3.5 12H6M18 12h2.5M6 6l1.8 1.8M16.2 16.2L18 18M6 18l1.8-1.8M16.2 7.8L18 6" />
    </g>,
  ],
  [
    'gate',
    <g key="p">
      <path d="M5 20.5V6.5L12 3.5l7 3v14" />
      <path d="M9 20.5v-8h6v8M3.5 20.5h17" />
    </g>,
  ],
  [
    'layers',
    <g key="p">
      <path d="M12 4l8.5 4.5L12 13 3.5 8.5z" />
      <path d="M3.5 12.5L12 17l8.5-4.5M3.5 16.5L12 21l8.5-4.5" />
    </g>,
  ],
  [
    'sparkle',
    <g key="p">
      <path d="M12 3.5l1.8 5.2 5.2 1.8-5.2 1.8L12 17.5l-1.8-5.2L5 10.5l5.2-1.8z" />
      <path d="M18.5 16l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z" />
    </g>,
  ],
  [
    'tag',
    <g key="p">
      <path d="M3.5 12.5V4.5h8l9 9-8 8z" />
      <circle cx="8" cy="9" r="1.3" />
    </g>,
  ],
  [
    'calendar',
    <g key="p">
      <rect x="3.5" y="5" width="17" height="15" rx="1.5" />
      <path d="M3.5 9.5h17M8 3v4M16 3v4" />
    </g>,
  ],
  [
    'external',
    <g key="p">
      <path d="M13.5 4.5h6v6M19.5 4.5l-8 8" />
      <path d="M17.5 14v5.5h-13v-13H10" />
    </g>,
  ],
  [
    'pin',
    <g key="p">
      <path d="M9 3.5h6l-1 5.5 3.5 3.5h-11L10 9z" />
      <path d="M12 12.5v8" />
    </g>,
  ],
  [
    'skip-back',
    <g key="p">
      <path d="M6 5.5v13" />
      <path d="M18.5 5.5v13L9 12z" fill="currentColor" />
    </g>,
  ],
  ['dot', <circle key="p" cx="12" cy="12" r="4" fill="currentColor" stroke="none" />],
]);

export type IconName =
  | 'play'
  | 'pause'
  | 'clock'
  | 'plane'
  | 'store'
  | 'megaphone'
  | 'shield'
  | 'monitor'
  | 'qr'
  | 'bolt'
  | 'alert'
  | 'check'
  | 'x'
  | 'chevron-down'
  | 'chevron-right'
  | 'split'
  | 'globe'
  | 'refresh'
  | 'search'
  | 'plus'
  | 'edit'
  | 'trash'
  | 'copy'
  | 'info'
  | 'map'
  | 'users'
  | 'chart'
  | 'settings'
  | 'gate'
  | 'layers'
  | 'sparkle'
  | 'tag'
  | 'calendar'
  | 'external'
  | 'pin'
  | 'skip-back'
  | 'dot';

export function Icon({ name, size = 18, label }: { name: IconName; size?: number; label?: string }) {
  return (
    <svg
      className="icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      {PATHS.get(name)}
    </svg>
  );
}
