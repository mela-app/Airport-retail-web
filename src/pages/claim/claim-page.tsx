/**
 * The page a passenger's phone opens from a screen's QR code: the offer, how long it is valid (until the
 * linked flight's gate closes), a personal code, and one extra code to share with a travel companion.
 * No personal data is asked for.
 */
import { useEffect, useState } from 'react';

import { useAppConfig } from '../../app/config';
import { Creative } from '../../creative/creative';
import { useI18n } from '../../i18n';
import { ApiError, api } from '../../lib/api';
import { useSimClock } from '../../lib/clock';
import { countdown } from '../../lib/format';
import { readPref, writePref } from '../../lib/prefs';
import type { ClaimLink, ClaimOffer, ClaimedCode } from '../../lib/types';
import { LanguageMenu } from '../../shell/language-menu';
import { Button } from '../../ui/controls';
import { Spinner } from '../../ui/display';
import { Icon } from '../../ui/icon';
import { QrCode } from '../../ui/qr-code';

type State =
  | { kind: 'loading' }
  | { kind: 'error'; status: number; message: string }
  | { kind: 'offer'; offer: ClaimOffer; code?: ClaimedCode; shared?: ClaimLink };

/**
 * The code this phone already claimed from a link, kept in this browser only (keyed by the link's token), so a
 * refresh shows the same code instead of issuing a second one. Nothing identifies the phone to the server.
 */
interface Saved {
  code: ClaimedCode;
  shared?: ClaimLink;
}

const savedKey = (token: string) => 'claim.' + token;

function loadSaved(token: string): Saved | undefined {
  const raw = readPref(savedKey(token));
  if (!raw) return undefined;
  try {
    const saved = JSON.parse(raw) as Partial<Saved> | null;
    return saved && typeof saved.code?.code === 'string' ? (saved as Saved) : undefined;
  } catch {
    return undefined;
  }
}

function save(token: string, saved: Saved): void {
  writePref(savedKey(token), JSON.stringify(saved));
}

export function ClaimPage({ token }: { token: string }) {
  const { t } = useI18n();
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string>();

  useEffect(() => {
    const ctl = new AbortController();
    api
      .get<ClaimOffer>(`/api/claims/${encodeURIComponent(token)}`, ctl.signal)
      .then((offer) => setState({ kind: 'offer', offer, ...loadSaved(token) }))
      .catch((e: unknown) => {
        if (ctl.signal.aborted) return;
        const status = e instanceof ApiError ? e.status : 0;
        setState({ kind: 'error', status, message: e instanceof Error ? e.message : String(e) });
      });
    return () => ctl.abort();
  }, [token]);

  const claim = async () => {
    if (state.kind !== 'offer') return;
    setBusy(true);
    setActionError(undefined);
    try {
      const code = await api.post<ClaimedCode>(`/api/claims/${encodeURIComponent(token)}`);
      save(token, { code });
      setState({ ...state, code });
    } catch (e) {
      setActionError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const share = async () => {
    if (state.kind !== 'offer' || !state.code) return;
    setBusy(true);
    setActionError(undefined);
    try {
      const link = await api.post<ClaimLink>(`/api/promo-codes/${encodeURIComponent(state.code.code)}/share`);
      save(token, { code: state.code, shared: link });
      setState({ ...state, shared: link });
    } catch (e) {
      setActionError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="claim" data-theme="light">
      <ClaimHeader />
      <main className="claim__main" id="content">
        {state.kind === 'loading' ? (
          <div className="claim__center">
            <Spinner />
          </div>
        ) : state.kind === 'error' ? (
          <div className="claim__center claim__notice" role="alert">
            <Icon name={state.status === 410 ? 'clock' : 'alert'} size={32} />
            <h1>
              {state.status === 410
                ? t('claim.page.expired')
                : state.status === 404
                  ? t('claim.page.notFound')
                  : t('common.ui.error')}
            </h1>
            <p className="muted">
              {state.status === 410 || state.status === 404 ? t('claim.page.expiredHint') : state.message}
            </p>
          </div>
        ) : (
          <OfferView
            offer={state.offer}
            code={state.code}
            shared={state.shared}
            busy={busy}
            error={actionError}
            onClaim={claim}
            onShare={share}
          />
        )}
      </main>
      <footer className="claim__foot">
        <p>{t('claim.page.privacy')}</p>
        <p>{t('claim.page.demo')}</p>
      </footer>
    </div>
  );
}

function ClaimHeader() {
  const { brand } = useAppConfig();
  return (
    <header className="claim__head">
      <span className="claim__brand">
        <span className="claim__mark" aria-hidden="true">
          <Icon name="plane" size={16} />
        </span>
        <span>
          <strong>{brand.airportName}</strong>
        </span>
      </span>
      <LanguageMenu tone="dark" />
    </header>
  );
}

function OfferView({
  offer,
  code,
  shared,
  busy,
  error,
  onClaim,
  onShare,
}: {
  offer: ClaimOffer;
  code: ClaimedCode | undefined;
  shared: ClaimLink | undefined;
  busy: boolean;
  error: string | undefined;
  onClaim: () => void;
  onShare: () => void;
}) {
  const { t, fmt, lang } = useI18n();
  const { nowMs } = useSimClock(1000);
  const left = Math.max(0, Date.parse(offer.expiresAt) - (nowMs ?? Date.now()));
  const expired = offer.status === 'expired' || (nowMs !== undefined && left === 0);
  const validity =
    offer.flight?.gateCloseAt && offer.flight.label
      ? t('claim.page.gateClose', {
          flight: offer.flight.label.split(' ')[0] ?? '',
          time: fmt.time(offer.flight.gateCloseAt),
        })
      : t('claim.page.validUntil', { time: fmt.time(offer.expiresAt) });

  return (
    <div className="claim__offer">
      {offer.creative ? (
        <div className="claim__creative">
          <Creative creative={{ ...offer.creative, template: 'offer_split' }} lang={lang} format="16:9" />
        </div>
      ) : null}

      <div className="claim__card">
        <p className="claim__advertiser">{offer.campaign.advertiser}</p>
        <h1 className="claim__title">{offer.campaign.offerText}</h1>
        {offer.screen ? (
          <p className="muted small">{t('claim.page.from', { where: offer.screen.name })}</p>
        ) : null}

        <div className={expired ? 'claim__validity is-expired' : 'claim__validity'}>
          <Icon name="clock" size={18} />
          <span>
            <strong>{expired ? t('claim.page.expired') : validity}</strong>
            {!expired ? (
              <span className="num ltr claim__countdown">
                {t('claim.page.timeLeft', { time: countdown(left) })}
              </span>
            ) : null}
          </span>
        </div>

        {offer.outlet ? (
          <div className="claim__where">
            <Icon name="store" size={18} />
            <span>
              <span className="muted small">{t('claim.page.where')}</span>
              <strong>{offer.outlet.name}</strong>
              <span className="muted small">{offer.outlet.zoneName ?? offer.outlet.terminalId}</span>
            </span>
          </div>
        ) : null}
      </div>

      {code ? (
        <div className="claim__card claim__code-card">
          <p className="muted small">{t('claim.page.yourCode')}</p>
          <p className="claim__code mono ltr">{code.code}</p>
          <p className="small">{t('claim.page.showAtTill')}</p>
          {code.parentCode ? <p className="xsmall muted">{t('claim.page.shared')}</p> : null}

          {code.shareable && !shared ? (
            <div className="claim__share">
              <p className="small muted">{t('claim.page.shareHint')}</p>
              <Button icon="users" onClick={onShare} busy={busy}>
                {t('claim.page.share')}
              </Button>
            </div>
          ) : null}
          {shared ? <SharedLink link={shared} /> : null}
        </div>
      ) : expired ? null : (
        <Button variant="primary" className="claim__cta" icon="tag" busy={busy} onClick={onClaim}>
          {t('claim.page.claim')}
        </Button>
      )}
      {error ? (
        <p className="claim__error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function SharedLink({ link }: { link: ClaimLink }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const copy = () => {
    void navigator.clipboard
      ?.writeText(link.url)
      .then(() => setCopied(true))
      .catch(() => undefined);
  };
  return (
    <div className="claim__shared">
      <p className="small">{t('claim.page.shareReady')}</p>
      <QrCode value={link.url} size={168} label={t('claim.page.share')} />
      <code className="claim__url ltr">{link.url}</code>
      <Button icon={copied ? 'check' : 'copy'} onClick={copy}>
        {copied ? t('claim.page.copied') : t('claim.page.copy')}
      </Button>
    </div>
  );
}
