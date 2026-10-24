/**
 * Audience and conflicts: the segment heat map (segment × hour for a zone), the conflict view (why the
 * winning campaign beat the runner-up on a screen, term by term) and manual pins with a reason.
 */
import { useState } from 'react';

import { useI18n } from '../../i18n';
import { api } from '../../lib/api';
import type { SegmentHeatmap } from '../../lib/analytics-types';
import type { Campaign, CandidateView, Locations, ScreenNow, ScreenView } from '../../lib/types';
import { useApi } from '../../lib/use-api';
import { HeatGrid } from '../../ui/charts';
import { Button, Field, IconButton, Select } from '../../ui/controls';
import { Async, Badge, Card, Empty } from '../../ui/display';
import { useToast } from '../../ui/overlay';
import { Table } from '../../ui/table';

interface Pin {
  id: string;
  screenId: string;
  campaignId: string;
  reason: string;
  createdBy: string;
  startsAt: string;
  endsAt: string;
}

export function MediaInsights() {
  return (
    <div className="stack">
      <SegmentMap />
      <div className="grid grid--2">
        <ConflictView />
        <Pins />
      </div>
    </div>
  );
}

function SegmentMap() {
  const { t, tx, fmt } = useI18n();
  const locations = useApi<Locations>('/api/locations');
  const [zoneId, setZoneId] = useState('T2-PLZ');
  const map = useApi<SegmentHeatmap>(
    `/api/insights/segments?zoneId=${encodeURIComponent(zoneId)}&from=5&to=23`,
    {
      topics: ['flights_reloaded', 'catalog'],
    },
  );
  return (
    <Card
      title={t('media.heatmap.title')}
      subtitle={t('media.heatmap.subtitle')}
      actions={
        <Select
          aria-label={t('media.inventory.zone')}
          value={zoneId}
          onChange={(e) => setZoneId(e.target.value)}
        >
          {(locations.data?.zones ?? [])
            .filter((z) => z.side === 'airside')
            .map((z) => (
              <option key={z.id} value={z.id}>
                {z.name}
              </option>
            ))}
        </Select>
      }
    >
      <Async state={map}>
        {(m) => (
          <>
            <HeatGrid
              label={t('media.heatmap.title')}
              columns={m.hours.map((h) => String(h.hour).padStart(2, '0'))}
              rowLabelWidth={150}
              max={0.7}
              format={(v) => fmt.percent(v)}
              rows={m.segments.map((s, i) => ({
                key: s,
                label: tx(`segment.${s}`, s),
                cells: m.hours.map((h) => {
                  const share = h.shares.at(i) ?? 0;
                  return {
                    value: share,
                    text: `${fmt.percent(share)} · ${fmt.number(Math.round(share * h.pax))} pax`,
                  };
                }),
              }))}
            />
            <p className="xsmall muted">{t('media.heatmap.note')}</p>
          </>
        )}
      </Async>
    </Card>
  );
}

/** Why the winner beat the runner-up on one screen: score parts side by side. */
function ConflictView() {
  const { t, tx, fmt } = useI18n();
  const screens = useApi<ScreenView[]>('/api/screens');
  const [screenId, setScreenId] = useState('SCR-T2-D-01');
  const now = useApi<ScreenNow>(`/api/screens/${encodeURIComponent(screenId)}/now`, {
    topics: ['decisions'],
    when: (d) =>
      ((d as { changes?: { screenId: string }[] }).changes ?? []).some((c) => c.screenId === screenId),
  });
  return (
    <Card
      title={t('media.conflict.title')}
      subtitle={t('media.conflict.subtitle')}
      actions={
        <Select
          aria-label={t('player.screen.label')}
          value={screenId}
          onChange={(e) => setScreenId(e.target.value)}
        >
          {[...(screens.data ?? [])]
            .sort((a, b) => a.id.localeCompare(b.id))
            .map((s) => (
              <option key={s.id} value={s.id}>{`${s.name} · ${s.id}`}</option>
            ))}
        </Select>
      }
    >
      <Async state={now}>
        {(n) => {
          const ctx = n.context;
          if (!ctx) return <Empty title={t('media.conflict.none')} />;
          const byId = new Map(ctx.candidates.map((c) => [c.campaignId, c]));
          const [a, b] = ctx.order.map((id) => byId.get(id)).filter((c): c is CandidateView => Boolean(c));
          if (!a || !b || !a.score || !b.score) return <Empty title={t('media.conflict.none')} />;
          const parts = (c: CandidateView) => ({
            audience:
              (c.score?.audienceWeight ?? 0.8) * Math.min(1, (c.score?.match ?? 0) * (c.score?.boost ?? 1)),
            performance: (c.score?.performanceWeight ?? 0.2) * (c.score?.performance ?? 0),
          });
          const pa = parts(a);
          const pb = parts(b);
          const dims = new Map<string, { a: number; b: number }>();
          for (const d of a.score.dimensions) dims.set(d.dimension, { a: d.value, b: 0 });
          for (const d of b.score.dimensions)
            dims.set(d.dimension, { a: dims.get(d.dimension)?.a ?? 0, b: d.value });
          const rows = [
            {
              key: 'final',
              label: t('player.why.final'),
              a: a.score.final,
              b: b.score.final,
              fmtv: (v: number) => v.toFixed(2),
            },
            {
              key: 'audience',
              label: t('media.conflict.audiencePart'),
              a: pa.audience,
              b: pb.audience,
              fmtv: (v: number) => v.toFixed(3),
            },
            {
              key: 'perf',
              label: t('media.conflict.performancePart'),
              a: pa.performance,
              b: pb.performance,
              fmtv: (v: number) => v.toFixed(3),
            },
            {
              key: 'match',
              label: t('player.why.match'),
              a: a.score.match,
              b: b.score.match,
              fmtv: (v: number) => fmt.percent(v),
            },
            {
              key: 'boost',
              label: t('player.why.boost'),
              a: a.score.boost,
              b: b.score.boost,
              fmtv: (v: number) => `×${v}`,
            },
            ...[...dims.entries()].map(([d, v]) => ({
              key: d,
              label: tx(
                `dimension.${d === 'tripPurpose' ? 'trip-purpose' : d === 'partyType' ? 'party-type' : d === 'ageBand' ? 'age-band' : d}.label`,
                d,
              ),
              a: v.a,
              b: v.b,
              fmtv: (x: number) => x.toFixed(2),
            })),
          ];
          return (
            <div className="stack stack--tight">
              <Table
                dense
                rowKey={(r) => r.key}
                rows={rows}
                columns={[
                  { key: 'label', header: '', cell: (r) => r.label },
                  {
                    key: 'a',
                    header: (
                      <span className="cell-title">
                        <strong>{a.campaignName}</strong>
                        <span className="muted xsmall">{t('media.conflict.winner')}</span>
                      </span>
                    ),
                    align: 'end',
                    cell: (r) => <span className={r.a > r.b ? 'win' : undefined}>{r.fmtv(r.a)}</span>,
                  },
                  {
                    key: 'b',
                    header: (
                      <span className="cell-title">
                        <strong>{b.campaignName}</strong>
                        <span className="muted xsmall">{t('media.conflict.runnerUp')}</span>
                      </span>
                    ),
                    align: 'end',
                    cell: (r) => <span className={r.b > r.a ? 'win' : undefined}>{r.fmtv(r.b)}</span>,
                  },
                ]}
              />
              {a.score.triggers.length > 0 ? (
                <p className="small">
                  <Badge tone="warning" icon="bolt">
                    {a.score.triggers.map((x) => x.detail).join('; ')}
                  </Badge>
                </p>
              ) : null}
              {n.run?.rules.length ? (
                <div className="row">
                  {n.run.rules.map((r, i) => (
                    <Badge
                      key={`${r.rule}-${i}`}
                      tone="accent"
                    >{`${tx(`decision.rule.${r.rule}`, r.rule)}: ${r.detail}`}</Badge>
                  ))}
                </div>
              ) : null}
            </div>
          );
        }}
      </Async>
    </Card>
  );
}

function Pins() {
  const { t, fmt } = useI18n();
  const toast = useToast();
  const pins = useApi<Pin[]>('/api/pins', { topics: ['catalog', 'sim'] });
  const screens = useApi<ScreenView[]>('/api/screens');
  const campaigns = useApi<Campaign[]>('/api/campaigns?status=active', { topics: ['catalog'] });
  const [screenId, setScreenId] = useState('SCR-T2-D-01');
  const [campaignId, setCampaignId] = useState('');
  const [minutes, setMinutes] = useState(60);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const names = new Map((campaigns.data ?? []).map((c) => [c.id, c.name]));

  const create = async () => {
    const campaign = campaignId || campaigns.data?.at(0)?.id;
    if (!campaign || reason.trim().length < 3) {
      toast(t('media.pins.needReason'), 'error');
      return;
    }
    setBusy(true);
    try {
      await api.post('/api/pins', { screenId, campaignId: campaign, minutes, reason: reason.trim() });
      toast(t('media.pins.created'), 'good');
      setReason('');
      pins.reload();
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e), 'error');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await api.delete(`/api/pins/${id}`);
      pins.reload();
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e), 'error');
    }
  };

  return (
    <Card title={t('media.pins.title')} subtitle={t('media.pins.subtitle')}>
      <div className="stack stack--tight">
        <div className="form-grid">
          <Field label={t('player.screen.label')}>
            {(id) => (
              <Select id={id} value={screenId} onChange={(e) => setScreenId(e.target.value)}>
                {[...(screens.data ?? [])]
                  .sort((a, b) => a.id.localeCompare(b.id))
                  .map((s) => (
                    <option key={s.id} value={s.id}>{`${s.name} · ${s.id}`}</option>
                  ))}
              </Select>
            )}
          </Field>
          <Field label={t('common.table.campaign')}>
            {(id) => (
              <Select id={id} value={campaignId} onChange={(e) => setCampaignId(e.target.value)}>
                {(campaigns.data ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label={t('media.pins.duration')}>
            {(id) => (
              <Select id={id} value={String(minutes)} onChange={(e) => setMinutes(Number(e.target.value))}>
                {[15, 30, 60, 120, 240].map((m) => (
                  <option key={m} value={m}>
                    {t('common.ui.minutes', { n: m })}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label={t('media.pins.reason')}>
            {(id) => (
              <input
                id={id}
                className="input"
                maxLength={200}
                value={reason}
                placeholder={t('media.pins.reasonPlaceholder')}
                onChange={(e) => setReason(e.target.value)}
              />
            )}
          </Field>
        </div>
        <div className="row row--end">
          <Button variant="primary" icon="pin" busy={busy} onClick={() => void create()}>
            {t('media.pins.create')}
          </Button>
        </div>
        <Async state={pins}>
          {(list) =>
            list.length === 0 ? (
              <p className="muted small">{t('media.pins.none')}</p>
            ) : (
              <ul className="feed">
                {list.map((p) => (
                  <li key={p.id}>
                    <span className="feed__main">
                      <strong>{names.get(p.campaignId) ?? p.campaignId}</strong>
                      <span className="muted xsmall">{`${p.screenId} · ${fmt.time(p.startsAt)}–${fmt.time(p.endsAt)} · ${p.reason}`}</span>
                    </span>
                    <IconButton
                      size="sm"
                      icon="trash"
                      label={t('media.pins.remove')}
                      onClick={() => void remove(p.id)}
                    />
                  </li>
                ))}
              </ul>
            )
          }
        </Async>
      </div>
    </Card>
  );
}
