/**
 * Retailer campaigns: the list with today's results and pacing, actions (pause, resume, run again, stock,
 * submit), a performance panel (30 days of ROI, conversion by segment, suggested weights that can be applied
 * in one click) and the campaign builder.
 */
import { useState } from 'react';

import { useI18n } from '../../i18n';
import { api } from '../../lib/api';
import type { AdvertiserOverview, CampaignPerformance, CampaignRow } from '../../lib/analytics-types';
import type { Campaign } from '../../lib/types';
import { useApi } from '../../lib/use-api';
import { LineChart } from '../../ui/charts';
import { Button, IconButton } from '../../ui/controls';
import { Async, Badge, Card, Empty, Kpi } from '../../ui/display';
import { useToast } from '../../ui/overlay';
import { Table } from '../../ui/table';
import type { PageProps } from '../registry';
import { CampaignBuilder, type Draft, toDraft } from './campaign-builder';
import { CampaignStatus, Pacing } from './shared';

type Editing =
  { mode: 'new' } | { mode: 'edit'; campaign: Campaign } | { mode: 'draft'; draft: Draft } | null;

export function RetailerCampaigns({ persona }: PageProps) {
  const { t, fmt } = useI18n();
  const toast = useToast();
  const advertiserId = persona?.id ?? 'adv-aurelia';
  const overview = useApi<AdvertiserOverview>(`/api/advertisers/${advertiserId}/overview`, {
    topics: ['delivery', 'catalog'],
    debounceMs: 1200,
  });
  const [selected, setSelected] = useState<string | null>(null);
  const [editing, setEditing] = useState<Editing>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const act = async (key: string, action: () => Promise<unknown>, done: string) => {
    setBusy(key);
    try {
      await action();
      toast(done, 'good');
      overview.reload();
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e), 'error');
    } finally {
      setBusy(null);
    }
  };

  const edit = async (id: string) => {
    try {
      setEditing({ mode: 'edit', campaign: await api.get<Campaign>(`/api/campaigns/${id}`) });
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e), 'error');
    }
  };

  const runAgain = (row: CampaignRow) =>
    act(
      `dup-${row.id}`,
      async () => {
        const copy = await api.post<Campaign>(`/api/campaigns/${row.id}/duplicate`);
        setEditing({ mode: 'edit', campaign: copy });
      },
      t('retailer.campaigns.duplicated', { name: row.name }),
    );

  if (editing) {
    return (
      <CampaignBuilder
        advertiserId={advertiserId}
        initial={
          editing.mode === 'edit'
            ? toDraft(editing.campaign)
            : editing.mode === 'draft'
              ? editing.draft
              : null
        }
        campaignId={editing.mode === 'edit' ? editing.campaign.id : null}
        onClose={(saved) => {
          setEditing(null);
          if (saved) {
            setSelected(saved);
            overview.reload();
          }
        }}
      />
    );
  }

  return (
    <div className="stack">
      <div className="page-intro">
        <div>
          <h1>{t('page.retailer.campaigns')}</h1>
          <p className="muted small">{t('retailer.campaigns.intro')}</p>
        </div>
        <span className="row">
          <Button
            icon="external"
            onClick={() => window.open(`/report/${encodeURIComponent(advertiserId)}`, '_blank', 'noopener')}
          >
            {t('report.page.share')}
          </Button>
          <Button variant="primary" icon="plus" onClick={() => setEditing({ mode: 'new' })}>
            {t('retailer.campaigns.new')}
          </Button>
        </span>
      </div>

      <Card flush>
        <Async state={overview}>
          {(o) => (
            <Table
              rowKey={(c) => c.id}
              rows={o.campaigns}
              selectedKey={selected}
              onRowClick={(c) => setSelected(c.id === selected ? null : c.id)}
              empty={t('retailer.campaigns.none')}
              columns={[
                {
                  key: 'name',
                  header: t('common.table.campaign'),
                  cell: (c) => (
                    <span className="cell-title">
                      <strong>{c.name}</strong>
                      <span className="row">
                        <CampaignStatus status={c.status} />
                        <span className="muted xsmall">
                          {`${fmt.day(c.schedule.start)} – ${fmt.day(c.schedule.end)}`}
                        </span>
                      </span>
                    </span>
                  ),
                },
                {
                  key: 'plays',
                  header: t('kpi.plays.label'),
                  align: 'end',
                  cell: (c) => fmt.number(c.today.plays),
                },
                {
                  key: 'red',
                  header: t('kpi.redemptions.label'),
                  align: 'end',
                  cell: (c) => fmt.number(c.today.redemptions),
                },
                {
                  key: 'sales',
                  header: t('kpi.sales.label'),
                  align: 'end',
                  cell: (c) => fmt.money(c.today.revenue),
                },
                {
                  key: 'roas',
                  header: t('kpi.roas.label'),
                  align: 'end',
                  cell: (c) => (c.today.roas === null ? '–' : `${fmt.number(c.today.roas, 1)}×`),
                },
                {
                  key: 'roi',
                  header: t('kpi.roi.label'),
                  align: 'end',
                  cell: (c) => (c.today.roi === null ? '–' : fmt.percent(c.today.roi)),
                },
                { key: 'pacing', header: t('common.table.pacing'), cell: (c) => <Pacing campaign={c} /> },
                {
                  key: 'actions',
                  header: <span className="sr-only">{t('common.table.actions')}</span>,
                  align: 'end',
                  cell: (c) => (
                    <span className="row row--end" onClick={(e) => e.stopPropagation()}>
                      {c.status === 'active' ? (
                        <IconButton
                          size="sm"
                          icon="pause"
                          label={t('retailer.campaigns.pause')}
                          busy={busy === `pause-${c.id}`}
                          onClick={() =>
                            act(
                              `pause-${c.id}`,
                              () => api.post(`/api/campaigns/${c.id}/pause`),
                              t('retailer.campaigns.paused'),
                            )
                          }
                        />
                      ) : null}
                      {c.status === 'paused' ? (
                        <IconButton
                          size="sm"
                          icon="play"
                          label={t('retailer.campaigns.resume')}
                          busy={busy === `resume-${c.id}`}
                          onClick={() =>
                            act(
                              `resume-${c.id}`,
                              () => api.post(`/api/campaigns/${c.id}/resume`),
                              t('retailer.campaigns.resumed'),
                            )
                          }
                        />
                      ) : null}
                      {c.status === 'draft' ? (
                        <Button
                          size="sm"
                          busy={busy === `submit-${c.id}`}
                          onClick={() =>
                            act(
                              `submit-${c.id}`,
                              () => api.post(`/api/campaigns/${c.id}/submit`),
                              t('retailer.campaigns.submitted'),
                            )
                          }
                        >
                          {t('retailer.campaigns.submit')}
                        </Button>
                      ) : null}
                      {c.promo ? (
                        <Button
                          size="sm"
                          variant={c.promo.inStock ? 'ghost' : 'secondary'}
                          busy={busy === `stock-${c.id}`}
                          onClick={() =>
                            act(
                              `stock-${c.id}`,
                              () => api.put(`/api/campaigns/${c.id}/stock`, { inStock: !c.promo?.inStock }),
                              c.promo?.inStock ? t('retailer.stock.markedOut') : t('retailer.stock.markedIn'),
                            )
                          }
                        >
                          {c.promo.inStock ? t('retailer.stock.setOut') : t('retailer.stock.setIn')}
                        </Button>
                      ) : null}
                      <IconButton
                        size="sm"
                        icon="edit"
                        label={t('retailer.campaigns.edit')}
                        onClick={() => void edit(c.id)}
                      />
                      <IconButton
                        size="sm"
                        icon="copy"
                        label={t('retailer.campaigns.runAgain')}
                        busy={busy === `dup-${c.id}`}
                        onClick={() => void runAgain(c)}
                      />
                    </span>
                  ),
                },
              ]}
            />
          )}
        </Async>
      </Card>

      {selected ? (
        <CampaignDetail
          campaignId={selected}
          onApplied={() => overview.reload()}
          onBook={(draft) => setEditing({ mode: 'draft', draft })}
        />
      ) : null}
    </div>
  );
}

/** 30 days of ROI, conversion by segment, and suggested weights for one campaign. */
function CampaignDetail({
  campaignId,
  onApplied,
  onBook,
}: {
  campaignId: string;
  onApplied: () => void;
  onBook: (draft: Draft) => void;
}) {
  const { t, tx, fmt } = useI18n();
  const toast = useToast();
  const perf = useApi<CampaignPerformance>(`/api/campaigns/${campaignId}/performance`, {
    topics: ['model', 'catalog'],
  });
  const [busy, setBusy] = useState(false);

  const apply = async (p: CampaignPerformance) => {
    setBusy(true);
    try {
      const campaign = await api.get<Campaign>(`/api/campaigns/${campaignId}`);
      const weights = new Map(Object.entries(campaign.segmentWeights));
      for (const s of p.suggestions) {
        if (s.suggested <= 0) weights.delete(s.segment);
        else weights.set(s.segment, s.suggested);
      }
      await api.put(`/api/campaigns/${campaignId}`, {
        ...toDraft(campaign),
        segmentWeights: Object.fromEntries(weights),
      });
      toast(t('retailer.perf.applied'), 'good');
      perf.reload();
      onApplied();
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Async state={perf}>
      {(p) => (
        <div className="stack">
          <div className="grid grid--kpis">
            <Kpi label={t('retailer.perf.revenue30')} value={fmt.money(p.last30.revenue)} />
            <Kpi label={t('retailer.perf.spend30')} value={fmt.money(p.last30.spend)} />
            <Kpi
              label={t('kpi.roas.label')}
              value={p.last30.roas === null ? '–' : `${fmt.number(p.last30.roas, 1)}×`}
              hint={t('retailer.perf.days30')}
            />
            <Kpi
              label={t('kpi.roi.label')}
              value={p.last30.roi === null ? '–' : fmt.percent(p.last30.roi)}
              hint={t('kpi.roi.hint')}
            />
            <Kpi
              label={t('kpi.redemptions.label')}
              value={fmt.number(p.last30.redemptions)}
              hint={t('retailer.perf.days30')}
            />
            <Kpi
              label={t('retailer.perf.performance')}
              value={fmt.number(p.performance, 2)}
              hint={p.modelVersion}
            />
          </div>
          <div className="grid grid--2">
            <Card title={t('retailer.perf.history')} subtitle={p.campaign.name}>
              {p.last30.days.length === 0 ? (
                <Empty title={t('retailer.perf.noHistory')} />
              ) : (
                <LineChart
                  label={t('retailer.perf.history')}
                  height={220}
                  xFormat={(x) => fmt.day(x)}
                  yFormat={(y) => fmt.money(y, { compact: true })}
                  series={[
                    {
                      id: 'revenue',
                      label: t('kpi.sales.label'),
                      color: 'var(--series-1)',
                      values: p.last30.days.map((d) => ({
                        x: Date.parse(`${d.date}T12:00:00Z`),
                        y: d.revenue,
                      })),
                    },
                    {
                      id: 'spend',
                      label: t('kpi.spend.label'),
                      color: 'var(--series-2)',
                      values: p.last30.days.map((d) => ({
                        x: Date.parse(`${d.date}T12:00:00Z`),
                        y: d.spend,
                      })),
                    },
                  ]}
                />
              )}
            </Card>
            <Card
              title={t('retailer.perf.segments')}
              subtitle={t('retailer.perf.segmentsHint')}
              actions={
                p.suggestions.length > 0 ? (
                  <Button
                    size="sm"
                    variant="primary"
                    icon="sparkle"
                    busy={busy}
                    onClick={() => void apply(p)}
                  >
                    {t('retailer.perf.apply')}
                  </Button>
                ) : null
              }
            >
              <div className="lift">
                {p.segments
                  .filter((s) => s.redemptions > 0)
                  .sort((a, b) => b.lift - a.lift)
                  .slice(0, 8)
                  .map((s) => (
                    <div className="lift__row" key={s.segment}>
                      <span className="lift__label">{tx(`segment.${s.segment}`, s.segment)}</span>
                      <span className="lift__track" aria-hidden="true">
                        <span
                          className="lift__fill"
                          style={{ width: `${Math.min(100, (s.lift / 3) * 100)}%` }}
                        />
                        <span className="lift__avg" />
                      </span>
                      <span className="num small">{`${fmt.number(s.lift, 1)}×`}</span>
                    </div>
                  ))}
              </div>
              {p.suggestions.length > 0 ? (
                <ul className="suggestions">
                  {p.suggestions.map((s) => (
                    <li key={s.segment}>
                      <Badge tone={s.suggested > s.current ? 'good' : 'warning'}>
                        {`${tx(`segment.${s.segment}`, s.segment)}: ${fmt.number(s.current, 1)} → ${fmt.number(s.suggested, 1)}`}
                      </Badge>
                      <span className="muted xsmall">
                        {t('retailer.perf.liftNote', {
                          share: fmt.percent(s.share),
                          base: fmt.percent(s.passengerShare),
                        })}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted small">{t('retailer.perf.noSuggestions')}</p>
              )}
            </Card>
          </div>
          {p.creatives.length > 1 ? (
            <Card title={t('retailer.ab.title')} subtitle={t('retailer.ab.subtitle')} flush>
              <Table
                dense
                rowKey={(c) => c.creativeId}
                rows={p.creatives}
                columns={[
                  { key: 'name', header: t('builder.field.creative'), cell: (c) => c.name },
                  {
                    key: 'plays',
                    header: t('kpi.plays.label'),
                    align: 'end',
                    cell: (c) => fmt.number(c.plays),
                  },
                  {
                    key: 'viewers',
                    header: t('kpi.impressions.label'),
                    align: 'end',
                    cell: (c) => fmt.compact(c.viewers),
                  },
                  {
                    key: 'scans',
                    header: t('kpi.scans.label'),
                    align: 'end',
                    cell: (c) => fmt.number(c.scans),
                  },
                  {
                    key: 'rate',
                    header: t('retailer.ab.rate'),
                    align: 'end',
                    cell: (c) => (c.scansPerThousand === null ? '–' : fmt.number(c.scansPerThousand, 1)),
                  },
                ]}
              />
            </Card>
          ) : null}
          <BestSlots campaignId={campaignId} onBook={onBook} />
        </div>
      )}
    </Async>
  );
}

interface BestSlotsView {
  campaignId: string;
  date: string;
  weekdayIndex: number;
  slots: {
    zoneId: string;
    zoneName: string;
    hour: number;
    expectedPax: number;
    match: number;
    available: number;
    pricePerSlot: number;
    expectedViewersPerHour: number;
  }[];
}

/** The three best zone-hours tomorrow, and a one-click draft that books them. */
function BestSlots({ campaignId, onBook }: { campaignId: string; onBook: (draft: Draft) => void }) {
  const { t, fmt } = useI18n();
  const toast = useToast();
  const best = useApi<BestSlotsView>(`/api/campaigns/${campaignId}/best-slots`, { topics: ['catalog'] });

  const book = async (b: BestSlotsView) => {
    try {
      const campaign = await api.get<Campaign>(`/api/campaigns/${campaignId}`);
      const hours = b.slots.map((s) => s.hour);
      onBook({
        ...toDraft(campaign),
        name: t('retailer.best.draftName', { name: campaign.name }),
        placement: {
          zoneIds: [...new Set(b.slots.map((s) => s.zoneId))],
          screenIds: [],
          gateIds: [],
          schedule: {
            start: `${b.date}T00:00:00.000Z`,
            end: `${b.date}T23:59:00.000Z`,
            daysOfWeek: [],
            hours: { from: Math.min(...hours), to: Math.max(...hours) + 1 },
          },
        },
      });
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e), 'error');
    }
  };

  return (
    <Card
      title={t('retailer.best.title')}
      subtitle={
        best.data
          ? t('retailer.best.subtitle', {
              date: fmt.day(`${best.data.date}T12:00:00Z`),
              index: fmt.number(best.data.weekdayIndex, 2),
            })
          : undefined
      }
      actions={
        best.data && best.data.slots.length > 0 ? (
          <Button
            size="sm"
            variant="primary"
            icon="calendar"
            onClick={() => best.data && void book(best.data)}
          >
            {t('retailer.best.book')}
          </Button>
        ) : null
      }
    >
      <Async state={best}>
        {(b) =>
          b.slots.length === 0 ? (
            <p className="muted small">{t('retailer.best.none')}</p>
          ) : (
            <ol className="best-slots">
              {b.slots.map((s, i) => (
                <li key={`${s.zoneId}-${s.hour}`}>
                  <span className="best-slots__rank">{i + 1}</span>
                  <span className="feed__main">
                    <strong>{`${String(s.hour).padStart(2, '0')}:00–${String(s.hour + 1).padStart(2, '0')}:00 · ${s.zoneName}`}</strong>
                    <span className="muted xsmall">
                      {t('retailer.best.detail', {
                        pax: fmt.number(s.expectedPax),
                        match: fmt.percent(s.match),
                        free: fmt.percent(s.available),
                        price: fmt.money(s.pricePerSlot),
                      })}
                    </span>
                  </span>
                  <span className="num small">
                    {t('retailer.best.viewers', { n: fmt.compact(s.expectedViewersPerHour) })}
                  </span>
                </li>
              ))}
            </ol>
          )
        }
      </Async>
    </Card>
  );
}
