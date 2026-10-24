/** A QR code drawn as one SVG path (dark modules), with the standard 4-module quiet zone. */
import { useMemo } from 'react';
import { encode } from 'uqr';

const QUIET = 4;

export function qrPath(value: string): { path: string; size: number } {
  const { data, size } = encode(value, { ecc: 'M', border: 0 });
  const parts: string[] = [];
  for (const [y, row] of data.entries())
    for (const [x, dark] of row.entries()) if (dark) parts.push(`M${x + QUIET} ${y + QUIET}h1v1h-1z`);
  return { path: parts.join(''), size: size + QUIET * 2 };
}

export function QrCode({ value, size = 160, label }: { value: string; size?: number; label: string }) {
  const { path, size: modules } = useMemo(() => qrPath(value), [value]);
  return (
    <svg
      className="qr"
      width={size}
      height={size}
      viewBox={`0 0 ${modules} ${modules}`}
      role="img"
      aria-label={label}
      shapeRendering="crispEdges"
    >
      <rect width={modules} height={modules} fill="#ffffff" />
      <path d={path} fill="#0b0b0b" />
    </svg>
  );
}
