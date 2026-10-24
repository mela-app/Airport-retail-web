/**
 * Illustrations for creatives: flat, geometric, drawn on a 200×200 canvas in the creative's own palette
 * (`a` accent, `f` foreground, `b` background). All brands are fictional, so the art carries no real marks.
 */
import type { ReactNode } from 'react';

type Draw = (c: { a: string; f: string; b: string }) => ReactNode;

const ART = new Map<string, Draw>([
  [
    'perfume',
    ({ a, f }) => (
      <>
        <rect x="78" y="34" width="44" height="22" rx="4" fill={a} />
        <rect x="90" y="56" width="20" height="14" fill={f} opacity="0.85" />
        <rect x="52" y="70" width="96" height="104" rx="22" fill={a} opacity="0.92" />
        <rect x="66" y="86" width="22" height="70" rx="11" fill={f} opacity="0.35" />
        <circle cx="150" cy="58" r="5" fill={f} opacity="0.7" />
        <circle cx="164" cy="40" r="3.5" fill={f} opacity="0.55" />
        <circle cx="40" cy="62" r="4" fill={f} opacity="0.5" />
      </>
    ),
  ],
  [
    'oud',
    ({ a, f }) => (
      <>
        <path
          d="M100 30c8 14-8 18 0 34"
          stroke={f}
          strokeWidth="5"
          fill="none"
          strokeLinecap="round"
          opacity="0.6"
        />
        <path d="M60 92h80l-10 66H70z" fill={a} />
        <rect x="52" y="80" width="96" height="16" rx="6" fill={a} />
        <path d="M84 80l16-16 16 16z" fill={f} opacity="0.8" />
        <rect x="64" y="158" width="72" height="12" rx="4" fill={f} opacity="0.75" />
        <path d="M78 112h44M76 128h48" stroke={f} strokeWidth="4" opacity="0.4" />
      </>
    ),
  ],
  [
    'coffee',
    ({ a, f }) => (
      <>
        <path
          d="M84 30c-8 10 8 16 0 26M108 26c-8 10 8 16 0 26"
          stroke={f}
          strokeWidth="5"
          fill="none"
          strokeLinecap="round"
          opacity="0.55"
        />
        <path d="M52 70h92l-10 92a12 12 0 0 1-12 10H74a12 12 0 0 1-12-10z" fill={a} />
        <path d="M144 88h10a18 18 0 0 1 0 36h-14" stroke={a} strokeWidth="10" fill="none" />
        <rect x="46" y="62" width="104" height="14" rx="7" fill={f} opacity="0.9" />
        <path
          d="M80 112c10 10 26 10 36 0"
          stroke={f}
          strokeWidth="5"
          fill="none"
          strokeLinecap="round"
          opacity="0.5"
        />
      </>
    ),
  ],
  [
    'toys',
    ({ a, f }) => (
      <>
        <path d="M100 26l46 46-46 46-46-46z" fill={a} />
        <path d="M100 26v92M54 72h92" stroke={f} strokeWidth="4" opacity="0.5" />
        <path
          d="M100 118c-6 18 12 24 4 40s10 18 6 30"
          stroke={f}
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
        />
        <path d="M104 140l12-6-2 12zM108 164l12-4-4 12z" fill={a} />
        <circle cx="46" cy="160" r="18" fill={f} opacity="0.85" />
        <circle cx="46" cy="160" r="7" fill={a} />
      </>
    ),
  ],
  [
    'sweets',
    ({ a, f }) => (
      <>
        <circle cx="100" cy="104" r="44" fill={a} />
        <path d="M56 104l-30-22v44zM144 104l30-22v44z" fill={a} opacity="0.75" />
        <path
          d="M76 84c16 12 32-12 48 0M72 104c18 12 38-12 56 0M76 124c16 12 32-12 48 0"
          stroke={f}
          strokeWidth="5"
          fill="none"
          opacity="0.6"
        />
        <circle cx="48" cy="44" r="10" fill={f} opacity="0.6" />
        <circle cx="156" cy="168" r="8" fill={f} opacity="0.5" />
      </>
    ),
  ],
  [
    'headphones',
    ({ a, f }) => (
      <>
        <path
          d="M46 116V96a54 54 0 0 1 108 0v20"
          stroke={a}
          strokeWidth="14"
          fill="none"
          strokeLinecap="round"
        />
        <rect x="34" y="108" width="34" height="58" rx="14" fill={a} />
        <rect x="132" y="108" width="34" height="58" rx="14" fill={a} />
        <rect x="44" y="120" width="14" height="34" rx="7" fill={f} opacity="0.45" />
        <rect x="142" y="120" width="14" height="34" rx="7" fill={f} opacity="0.45" />
      </>
    ),
  ],
  [
    'books',
    ({ a, f }) => (
      <>
        <rect x="40" y="56" width="26" height="116" rx="3" fill={a} />
        <rect x="70" y="40" width="30" height="132" rx="3" fill={f} opacity="0.85" />
        <rect x="104" y="64" width="24" height="108" rx="3" fill={a} opacity="0.75" />
        <rect
          x="130"
          y="58"
          width="28"
          height="114"
          rx="3"
          fill={f}
          opacity="0.55"
          transform="rotate(8 144 115)"
        />
        <path
          d="M76 70h18M76 80h18M44 80h18M108 88h16"
          stroke={f === '#FFFFFF' ? '#000' : '#fff'}
          strokeWidth="3"
          opacity="0.35"
        />
        <rect x="30" y="172" width="140" height="8" rx="4" fill={f} opacity="0.6" />
      </>
    ),
  ],
  [
    'fashion',
    ({ a, f }) => (
      <>
        <path
          d="M100 30a10 10 0 1 1 10 10l-10 8"
          stroke={f}
          strokeWidth="5"
          fill="none"
          strokeLinecap="round"
        />
        <path d="M100 48L48 80h104z" stroke={f} strokeWidth="5" fill="none" strokeLinejoin="round" />
        <path d="M78 80h44l8 24-10 6 22 66H58l22-66-10-6z" fill={a} />
        <path d="M86 128h28" stroke={f} strokeWidth="4" opacity="0.5" />
      </>
    ),
  ],
  [
    'grill',
    ({ a, f }) => (
      <>
        <path
          d="M100 30c18 22 30 34 30 56a30 30 0 0 1-60 0c0-12 6-20 12-26 2 12 8 16 12 16-4-16 0-30 6-46z"
          fill={a}
        />
        <path d="M100 74c8 10 12 16 12 24a12 12 0 0 1-24 0c0-8 6-14 12-24z" fill={f} opacity="0.7" />
        <rect x="36" y="128" width="128" height="10" rx="5" fill={f} opacity="0.85" />
        <path
          d="M48 138l-8 38M152 138l8 38M100 138v38"
          stroke={f}
          strokeWidth="6"
          strokeLinecap="round"
          opacity="0.6"
        />
      </>
    ),
  ],
  [
    'burger',
    ({ a, f }) => (
      <>
        <path d="M44 98a56 44 0 0 1 112 0z" fill={a} />
        <circle cx="80" cy="76" r="3" fill={f} opacity="0.7" />
        <circle cx="104" cy="68" r="3" fill={f} opacity="0.7" />
        <circle cx="124" cy="80" r="3" fill={f} opacity="0.7" />
        <path
          d="M40 108c12 8 24 0 36 6s24-6 36 0 24 8 48-4"
          stroke={f}
          strokeWidth="8"
          fill="none"
          strokeLinecap="round"
          opacity="0.7"
        />
        <rect x="42" y="118" width="116" height="20" rx="10" fill={f} opacity="0.85" />
        <path d="M46 146h108a10 10 0 0 1-10 18H56a10 10 0 0 1-10-18z" fill={a} />
      </>
    ),
  ],
  [
    'pharmacy',
    ({ a, f }) => (
      <>
        <rect x="40" y="40" width="120" height="120" rx="28" fill={a} />
        <path d="M100 66v68M66 100h68" stroke={f} strokeWidth="20" strokeLinecap="round" />
        <rect
          x="128"
          y="138"
          width="44"
          height="22"
          rx="11"
          fill={f}
          opacity="0.85"
          transform="rotate(-30 150 149)"
        />
      </>
    ),
  ],
  [
    'lounge',
    ({ a, f }) => (
      <>
        <rect x="46" y="62" width="108" height="66" rx="20" fill={a} />
        <rect x="30" y="98" width="30" height="62" rx="12" fill={a} opacity="0.85" />
        <rect x="140" y="98" width="30" height="62" rx="12" fill={a} opacity="0.85" />
        <rect x="56" y="118" width="88" height="34" rx="10" fill={f} opacity="0.75" />
        <path d="M50 160v14M150 160v14" stroke={f} strokeWidth="6" strokeLinecap="round" />
        <circle cx="160" cy="40" r="10" fill={f} opacity="0.5" />
      </>
    ),
  ],
  [
    'currency',
    ({ a, f }) => (
      <>
        <circle cx="82" cy="96" r="46" fill={a} />
        <circle cx="128" cy="118" r="46" fill={f} opacity="0.85" />
        <path
          d="M128 92v52M116 104c0-8 24-8 24 2s-24 6-24 16 24 10 24 2"
          stroke={a}
          strokeWidth="6"
          fill="none"
          strokeLinecap="round"
        />
        <path d="M58 132l-14 14h28M152 64l14-14h-28" stroke={f} strokeWidth="5" fill="none" opacity="0.5" />
      </>
    ),
  ],
  [
    'car',
    ({ a, f }) => (
      <>
        <path d="M34 128l16-38a16 16 0 0 1 15-10h70a16 16 0 0 1 15 10l16 38v26H34z" fill={a} />
        <path d="M62 92h76l10 26H52z" fill={f} opacity="0.55" />
        <circle cx="66" cy="156" r="16" fill={f} />
        <circle cx="134" cy="156" r="16" fill={f} />
        <circle cx="66" cy="156" r="6" fill={a} />
        <circle cx="134" cy="156" r="6" fill={a} />
        <path d="M30 60h40M44 44h34" stroke={f} strokeWidth="5" strokeLinecap="round" opacity="0.45" />
      </>
    ),
  ],
  [
    'card',
    ({ a, f }) => (
      <>
        <rect
          x="40"
          y="58"
          width="128"
          height="84"
          rx="12"
          fill={f}
          opacity="0.4"
          transform="rotate(-10 104 100)"
        />
        <rect x="32" y="70" width="136" height="88" rx="12" fill={a} />
        <rect x="32" y="88" width="136" height="16" fill={f} opacity="0.7" />
        <rect x="46" y="120" width="26" height="20" rx="4" fill={f} opacity="0.9" />
        <path d="M86 134h60" stroke={f} strokeWidth="5" strokeLinecap="round" opacity="0.6" />
      </>
    ),
  ],
  [
    'esim',
    ({ a, f }) => (
      <>
        <path d="M60 30h58l26 26v108a8 8 0 0 1-8 8H60a8 8 0 0 1-8-8V38a8 8 0 0 1 8-8z" fill={a} />
        <rect x="72" y="80" width="56" height="64" rx="8" fill={f} opacity="0.85" />
        <path d="M72 102h56M72 122h56M100 80v64" stroke={a} strokeWidth="4" />
        <path
          d="M150 44a30 30 0 0 1 0 40M162 34a46 46 0 0 1 0 60"
          stroke={f}
          strokeWidth="5"
          fill="none"
          strokeLinecap="round"
          opacity="0.6"
        />
      </>
    ),
  ],
  [
    'seat',
    ({ a, f }) => (
      <>
        <path d="M66 36h30a10 10 0 0 1 10 10l6 74H74z" fill={a} />
        <path d="M70 120h76a12 12 0 0 1 12 12v10H70z" fill={a} opacity="0.85" />
        <path d="M86 142v28M138 142v28M76 170h76" stroke={f} strokeWidth="7" strokeLinecap="round" />
        <rect x="60" y="94" width="58" height="10" rx="5" fill={f} opacity="0.55" />
      </>
    ),
  ],
  [
    'flatbed',
    ({ a, f }) => (
      <>
        <rect x="26" y="104" width="148" height="26" rx="10" fill={a} />
        <rect x="34" y="86" width="40" height="18" rx="9" fill={f} opacity="0.85" />
        <path d="M30 130v28M170 130v28" stroke={f} strokeWidth="7" strokeLinecap="round" />
        <path d="M120 58l8-18 8 18 18 2-14 12 4 18-16-10-16 10 4-18-14-12z" fill={f} opacity="0.7" />
      </>
    ),
  ],
  [
    'city',
    ({ a, f }) => (
      <>
        <circle cx="148" cy="52" r="20" fill={f} opacity="0.75" />
        <path
          d="M24 176V112h22V86h20v90M66 176V70l18-14 18 14v106M102 176v-60h26v60M128 176V96h20v-16h18v96"
          fill={a}
        />
        <path
          d="M76 86h16M76 102h16M76 118h16M134 112h10M134 128h10"
          stroke={f}
          strokeWidth="4"
          opacity="0.55"
        />
        <rect x="16" y="174" width="168" height="6" rx="3" fill={f} opacity="0.6" />
      </>
    ),
  ],
  [
    'voucher',
    ({ a, f }) => (
      <>
        <path d="M30 64h140v24a12 12 0 0 0 0 24v24H30v-24a12 12 0 0 0 0-24z" fill={a} />
        <path d="M120 70v60" stroke={f} strokeWidth="4" strokeDasharray="6 6" opacity="0.7" />
        <path d="M54 92h46M54 108h32" stroke={f} strokeWidth="6" strokeLinecap="round" />
        <path d="M144 88l4 9 10 1-7 7 2 10-9-5-9 5 2-10-7-7 10-1z" fill={f} />
      </>
    ),
  ],
]);

const FALLBACK: Draw = ({ a, f }) => (
  <>
    <circle cx="100" cy="100" r="56" fill={a} />
    <path d="M100 62l10 28 28 10-28 10-10 28-10-28-28-10 28-10z" fill={f} opacity="0.8" />
  </>
);

export function Artwork({
  name,
  accent,
  foreground,
  background,
  className,
}: {
  name: string;
  accent: string;
  foreground: string;
  background: string;
  className?: string;
}) {
  const draw = ART.get(name) ?? FALLBACK;
  return (
    <svg className={className} viewBox="0 0 200 200" aria-hidden="true" focusable="false">
      {draw({ a: accent, f: foreground, b: background })}
    </svg>
  );
}
