/**
 * The demo guide: the cause-and-effect story in a few clicks, as a side panel that stays open while the views
 * change underneath. It loads the worked example, opens split screen, injects a delay and measures how fast
 * the Gate 42 screen re-plans, shows the claim QR for a phone, and points to the results in each role.
 */
import { useRef, useState } from 'react';

import { useI18n } from '../i18n';
import { api } from '../lib/api';
import { useLive } from '../lib/live';
import { hrefOf, useNavigate } from '../lib/router';
import type { ScreenNow } from '../lib/types';
import { Button, IconButton } from '../ui/controls';
import { Badge } from '../ui/display';
import { Icon } from '../ui/icon';
import { useToast } from '../ui/overlay';
import { QrCode } from '../ui/qr-code';

const SCREEN = 'SCR-T2-D-01';
const PLAYER = `/passenger/${SCREEN}`;

export function DemoGuide({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const toast = useToast();
  const navigate = useNavigate();
  const [busy, setBusy] = useState<string | null>(null);
  const [replan, setReplan] = useState<{ ms: number; campaign: string | null } | null>(null);
  const [claimUrl, setClaimUrl] = useState<string | null>(null);
  const injectedAt = useRef<number | null>(null);

  // The cause-and-effect timer: from the click to the decision event for the Gate 42 screen.
  useLive('decisions', (data) => {
    if (injectedAt.current === null) return;
    const change = (data as { changes?: { screenId: string; campaignId: string | null }[] }).changes?.find(
      (c) => c.screenId === SCREEN,
    );
    if (!change) return;
    setReplan({ ms: Math.round(performance.now() - injectedAt.current), campaign: change.campaignId });
    injectedAt.current = null;
  });

  const run = async (key: string, action: () => Promise<void>) => {
    setBusy(key);
    try {
      await action();
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e), 'error');
    } finally {
      setBusy(null);
    }
  };

  const split = (left: string, right: string) => navigate(hrefOf('/split', { left, right }));

  const steps = [
    {
      key: 'scene',
      title: t('demo.step.sceneTitle'),
      body: t('demo.step.sceneBody'),
      action: (
        <Button
          variant="primary"
          size="sm"
          icon="sparkle"
          busy={busy === 'scene'}
          onClick={() =>
            run('scene', async () => {
              await api.post('/api/sim/scenario/worked-example');
              setReplan(null);
              setClaimUrl(null);
              split('/airline?as=adv-air-XH', PLAYER);
            })
          }
        >
          {t('demo.step.sceneAction')}
        </Button>
      ),
    },
    {
      key: 'why',
      title: t('demo.step.whyTitle'),
      body: t('demo.step.whyBody'),
      action: null,
    },
    {
      key: 'delay',
      title: t('demo.step.delayTitle'),
      body: t('demo.step.delayBody'),
      action: (
        <div className="stack stack--tight">
          <Button
            variant="primary"
            size="sm"
            icon="bolt"
            busy={busy === 'delay'}
            onClick={() =>
              run('delay', async () => {
                setReplan(null);
                injectedAt.current = performance.now();
                await api.post('/api/sim/inject/delay', { flightId: 'XH501-D-20261016', minutes: 30 });
              })
            }
          >
            {t('demo.step.delayAction')}
          </Button>
          {replan ? (
            <p className="demo__result" role="status">
              <Icon name="check" size={16} />
              {t('demo.step.delayResult', { ms: replan.ms })}
              {replan.campaign === 'c08' ? <Badge tone="good">{t('demo.step.goodwill')}</Badge> : null}
            </p>
          ) : null}
        </div>
      ),
    },
    {
      key: 'phone',
      title: t('demo.step.phoneTitle'),
      body: t('demo.step.phoneBody'),
      action: (
        <div className="stack stack--tight">
          <Button
            size="sm"
            icon="qr"
            busy={busy === 'phone'}
            onClick={() =>
              run('phone', async () => {
                const now = await api.get<ScreenNow>(`/api/screens/${SCREEN}/now`);
                setClaimUrl(now.claim?.url ?? null);
                if (!now.claim) toast(t('demo.step.noQr'), 'error');
              })
            }
          >
            {t('demo.step.phoneAction')}
          </Button>
          {claimUrl ? (
            <div className="demo__qr">
              <QrCode value={claimUrl} size={180} label={t('player.qr.scan')} />
              <code className="claim__url ltr">{claimUrl}</code>
            </div>
          ) : null}
          <Button
            size="sm"
            variant="ghost"
            icon="store"
            onClick={() => split('/retailer?as=adv-brewline', PLAYER)}
          >
            {t('demo.step.retailerAction')}
          </Button>
        </div>
      ),
    },
    {
      key: 'ops',
      title: t('demo.step.opsTitle'),
      body: t('demo.step.opsBody'),
      action: (
        <span className="row">
          <Button
            size="sm"
            icon="monitor"
            busy={busy === 'offline'}
            onClick={() =>
              run('offline', async () => {
                await api.post('/api/sim/inject/screen-offline', { screenId: SCREEN });
                navigate('/admin');
              })
            }
          >
            {t('demo.step.offlineAction')}
          </Button>
          <Button size="sm" variant="ghost" icon="layers" onClick={() => navigate('/media/insights')}>
            {t('demo.step.mediaAction')}
          </Button>
        </span>
      ),
    },
  ];

  return (
    <aside className="demo" aria-label={t('demo.guide.title')} data-theme="dark">
      <header className="demo__head">
        <span className="row">
          <Icon name="sparkle" size={18} />
          <strong>{t('demo.guide.title')}</strong>
        </span>
        <IconButton icon="x" size="sm" label={t('common.ui.close')} onClick={onClose} />
      </header>
      <ol className="demo__steps">
        {steps.map((s, i) => (
          <li key={s.key} className="demo__step">
            <span className="demo__num">{i + 1}</span>
            <div className="demo__content">
              <strong>{s.title}</strong>
              <p className="small secondary">{s.body}</p>
              {s.action}
            </div>
          </li>
        ))}
      </ol>
    </aside>
  );
}
