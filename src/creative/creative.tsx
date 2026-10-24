/**
 * Renders a creative from its template, palette, artwork and copy, at any size: the player, the claim page
 * and thumbnails use the same component (sizes are container-relative). `overlay` is drawn on top (the
 * player's QR code).
 */
import type { CSSProperties, ReactNode } from 'react';

import type { Lang } from '../lib/format';
import type { CreativeView } from '../lib/types';
import { Artwork } from './artwork';

export type Format = '16:9' | '9:16';

export function Creative({
  creative,
  lang,
  format = '16:9',
  overlay,
  className,
}: {
  creative: Pick<CreativeView, 'template' | 'artwork' | 'palette' | 'content'> & {
    template?: CreativeView['template'];
  };
  lang: Lang;
  format?: Format;
  overlay?: ReactNode;
  className?: string;
}) {
  const copy = lang === 'ar' ? creative.content.ar : creative.content.en;
  const { accent, background, foreground } = creative.palette;
  const style = { '--cr-accent': accent, '--cr-bg': background, '--cr-fg': foreground } as CSSProperties;
  const template = creative.template ?? 'offer_split';
  const art = (
    <Artwork
      className="creative__art"
      name={creative.artwork}
      accent={accent}
      foreground={foreground}
      background={background}
    />
  );
  return (
    <div
      className={[
        'creative',
        `creative--${template}`,
        format === '9:16' ? 'creative--portrait' : 'creative--landscape',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={style}
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
      lang={lang}
    >
      <div className="creative__media">{art}</div>
      <div className="creative__copy">
        {copy.badge ? <span className="creative__badge">{copy.badge}</span> : null}
        <h2 className="creative__headline">{copy.headline}</h2>
        <p className="creative__body">{copy.body}</p>
        {copy.cta ? <span className="creative__cta">{copy.cta}</span> : null}
      </div>
      {overlay ? <div className="creative__overlay">{overlay}</div> : null}
    </div>
  );
}
