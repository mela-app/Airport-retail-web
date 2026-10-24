/**
 * Media manager dashboard: network occupancy and media revenue, what waits for approval, delivery per
 * advertiser against its pacing target (under-delivery flagged), and the seven-day outlook.
 */
import { useI18n } from '../../i18n';
import type { DeliveryRow, Forecast7, Inventory } from '../../lib/analytics-types';
import type { Campaign, CreativeView } from '../../lib/types';
import { useApi } from '../../lib/use-api';
import { useNavigate } from '../../lib/router';
import { ColumnChart } from '../../ui/charts';
import { Button, IconButton } from '../../ui/controls';
import { Async, Badge, Card, Kpi, Status } from '../../ui/display';
import { Table } from '../../ui/table';

interface NetworkKpis {
  mediaRevenueToday: number;
  playsToday: number;
  impressionsToday: number;
  activeCampaigns: number;
}

export function MediaDashboard() {
  const { t, fmt } = useI18n();
  const navigate = useNavigate();
  const kpis = useApi<NetworkKpis>('/api/kpis/network', { topics: ['delivery'], debounceMs: 1000 });
  const delivery = useApi<DeliveryRow[]>('/api/delivery/advertisers', {
    topics: ['delivery', 'catalog'],
    debounceMs: 2000,
  });
  const inventory = useApi<Inventory>('/api/inventory', { topics: ['catalog'] });
  const forecast = useApi<Forecast7>('/api/inventory/forecast', { topics: ['catalog'] });
  const pendingCampaigns = useApi<Campaign[]>('/api/campaigns?status=pending_review', {
    topics: ['catalog'],
  });
  const pendingCreatives = useApi<CreativeView[]>('/api/creatives?status=pending_review', {
    topics: ['catalog'],
  });
  const pending = (pendingCampaigns.data?.length ?? 0) + (pendingCreatives.data?.length ?? 0);

  return (
    <div className="stack">
      <section className="grid grid--kpis" aria-label={t('page.media.overview')}>
        <Kpi
          icon="layers"
          label={t('media.kpi.occupancy')}
          value={inventory.data ? fmt.percent(inventory.data.occupancy) : '–'}
          hint={t('media.kpi.occupancyHint')}
        />
        <Kpi
          live
          icon="chart"
          label={t('media.kpi.revenue')}
          value={kpis.data ? fmt.money(kpis.data.mediaRevenueToday) : '–'}
        />
        <Kpi
          live
          icon="monitor"
          label={t('kpi.plays.label')}
          value={kpis.data ? fmt.number(kpis.data.playsToday) : '–'}
        />
        <Kpi
          icon="megaphone"
          label={t('media.kpi.active')}
          value={kpis.data ? fmt.number(kpis.data.activeCampaigns) : '–'}
        />
        <Kpi
          icon="alert"
          label={t('media.kpi.under')}
          value={delivery.data ? fmt.number(delivery.data.filter((d) => d.underDelivering).length) : '–'}
        />
        <Kpi icon="shield" label={t('media.kpi.pending')} value={fmt.number(pending)} />
      </section>

      <div className="grid grid--2-1">
        <Card title={t('media.delivery.title')} subtitle={t('media.delivery.subtitle')} flush>
          <Async state={delivery}>
            {(rows) => (
              <Table
                dense
                rowKey={(r) => r.advertiserId}
                rows={rows}
                columns={[
                  {
                    key: 'name',
                    header: t('media.delivery.advertiser'),
                    cell: (r) => (
                      <span className="row">
                        <span
                          className="persona__swatch"
                          style={{ background: r.brandColor }}
                          aria-hidden="true"
                        />
                        <span className="cell-title">
                          <strong>{r.name}</strong>
                          <span className="muted xsmall">
                            {t('media.delivery.campaigns', { n: r.activeCampaigns })}
                          </span>
                        </span>
                      </span>
                    ),
                  },
                  {
                    key: 'spend',
                    header: t('kpi.spend.label'),
                    align: 'end',
                    cell: (r) => fmt.money(r.today.cost),
                  },
                  {
                    key: 'target',
                    header: t('media.delivery.target'),
                    align: 'end',
                    cell: (r) => fmt.money(r.pacingTarget),
                  },
                  {
                    key: 'ratio',
                    header: t('media.delivery.ratio'),
                    cell: (r) => (
                      <span className="pacing">
                        <span className={r.underDelivering ? 'progress progress--warning' : 'progress'}>
                          <span style={{ width: `${Math.min(100, (r.deliveryRatio ?? 0) * 100)}%` }} />
                        </span>
                        <span className="num xsmall">
                          {r.deliveryRatio === null ? '–' : fmt.percent(r.deliveryRatio)}
                        </span>
                      </span>
                    ),
                  },
                  {
                    key: 'flag',
                    header: t('common.table.status'),
                    cell: (r) =>
                      r.underDelivering ? (
                        <Status tone="warning">{t('media.delivery.under')}</Status>
                      ) : (r.deliveryRatio ?? 0) > 1.3 ? (
                        <Status tone="accent">{t('media.delivery.ahead')}</Status>
                      ) : (
                        <Status tone="good">{t('media.delivery.onTrack')}</Status>
                      ),
                  },
                  {
                    key: 'report',
                    header: <span className="sr-only">{t('report.page.share')}</span>,
                    align: 'end',
                    cell: (r) => (
                      <IconButton
                        size="sm"
                        icon="external"
                        label={t('report.page.share')}
                        onClick={() =>
                          window.open(`/report/${encodeURIComponent(r.advertiserId)}`, '_blank', 'noopener')
                        }
                      />
                    ),
                  },
                ]}
              />
            )}
          </Async>
        </Card>

        <div className="stack">
          <Card
            title={t('media.approvals.title')}
            actions={
              <Button size="sm" onClick={() => navigate('/media/approvals')}>
                {t('media.approvals.open')}
              </Button>
            }
          >
            {pending === 0 ? (
              <p className="muted small">{t('media.approvals.empty')}</p>
            ) : (
              <ul className="feed">
                {(pendingCampaigns.data ?? []).map((c) => (
                  <li key={c.id}>
                    <span className="feed__main">
                      <strong>{c.name}</strong>
                      <span className="muted xsmall">{c.advertiserId}</span>
                    </span>
                    <Badge tone="accent">{t('media.approvals.campaign')}</Badge>
                  </li>
                ))}
                {(pendingCreatives.data ?? []).map((c) => (
                  <li key={c.id}>
                    <span className="feed__main">
                      <strong>{c.name}</strong>
                      <span className="muted xsmall">{c.advertiserId}</span>
                    </span>
                    <Badge>{t('media.approvals.creative')}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title={t('media.forecast.title')} subtitle={forecast.data?.model}>
            <Async state={forecast}>
              {(f) => (
                <>
                  <ColumnChart
                    label={t('media.forecast.title')}
                    valueLabel={t('media.forecast.footfall')}
                    height={160}
                    yFormat={(v) => fmt.compact(v)}
                    points={f.days.map((d) => ({
                      key: d.date,
                      label: fmt.day(`${d.date}T12:00:00Z`).split(' ')[0] ?? d.date,
                      value: d.paxHours,
                    }))}
                    highlight={f.days.at(0)?.date}
                  />
                  <Table
                    dense
                    rowKey={(d) => d.date}
                    rows={f.days}
                    columns={[
                      {
                        key: 'day',
                        header: t('media.forecast.day'),
                        cell: (d) => fmt.day(`${d.date}T12:00:00Z`),
                      },
                      {
                        key: 'index',
                        header: t('media.forecast.index'),
                        align: 'end',
                        cell: (d) => `${fmt.number(d.index, 2)}×`,
                      },
                      {
                        key: 'occ',
                        header: t('media.kpi.occupancy'),
                        align: 'end',
                        cell: (d) => fmt.percent(d.occupancy),
                      },
                      {
                        key: 'price',
                        header: t('media.forecast.price'),
                        align: 'end',
                        cell: (d) => fmt.money(d.averagePrice),
                      },
                    ]}
                  />
                </>
              )}
            </Async>
          </Card>
        </div>
      </div>
    </div>
  );
}
