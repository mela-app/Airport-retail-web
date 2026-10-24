/**
 * Retailer dashboard: today's results ticking live, the passenger flow expected in the company's zones for
 * the next two hours, recent sales (including codes claimed from real phones), today by hour, and the
 * campaigns running now with their pacing.
 */
import { useI18n } from '../../i18n';
import type { AdvertiserOverview, PassengerFlow } from '../../lib/analytics-types';
import { useApi } from '../../lib/use-api';
import { ColumnChart, LineChart } from '../../ui/charts';
import { Async, Badge, Card, Empty, Kpi } from '../../ui/display';
import { Icon } from '../../ui/icon';
import { Table } from '../../ui/table';
import type { PageProps } from '../registry';
import { CampaignStatus, Pacing } from './shared';

export function RetailerDashboard({ persona }: PageProps) {
  const { t, tx, fmt } = useI18n();
  const id = persona?.id ?? 'adv-aurelia';
  const overview = useApi<AdvertiserOverview>(`/api/advertisers/${id}/overview`, {
    topics: ['delivery', 'claims', 'catalog'],
    debounceMs: 900,
  });
  const flow = useApi<PassengerFlow>(`/api/advertisers/${id}/flow?hours=2`, {
    topics: ['presence', 'flight', 'flights_reloaded'],
    debounceMs: 1500,
  });

  return (
    <div className="stack">
      <Async state={overview}>
        {(o) => (
          <section className="grid grid--kpis" aria-label={t('retailer.dash.today')}>
            <Kpi live icon="monitor" label={t('kpi.plays.label')} value={fmt.number(o.today.plays)} />
            <Kpi live icon="users" label={t('kpi.impressions.label')} value={fmt.compact(o.today.viewers)} />
            <Kpi live icon="qr" label={t('kpi.scans.label')} value={fmt.number(o.today.scans)} />
            <Kpi live icon="tag" label={t('kpi.redemptions.label')} value={fmt.number(o.today.redemptions)} />
            <Kpi live icon="store" label={t('kpi.sales.label')} value={fmt.money(o.today.revenue)} />
            <Kpi live icon="chart" label={t('kpi.spend.label')} value={fmt.money(o.today.cost)} />
            <Kpi
              label={t('kpi.roas.label')}
              value={o.today.roas === null ? '–' : `${fmt.number(o.today.roas, 1)}×`}
              hint={t('kpi.roas.hint')}
            />
            <Kpi
              label={t('kpi.roi.label')}
              value={o.today.roi === null ? '–' : fmt.percent(o.today.roi)}
              hint={t('kpi.roi.hint')}
            />
          </section>
        )}
      </Async>

      <div className="grid grid--2-1">
        <Card
          title={t('retailer.flow.title')}
          subtitle={flow.data ? flow.data.zones.map((z) => z.name).join(' · ') : undefined}
        >
          <Async state={flow}>
            {(f) => (
              <div className="stack stack--tight">
                <p className="headline-stat">
                  {t('retailer.flow.next60', {
                    pax: fmt.number(f.next60.averagePax),
                    intl: fmt.percent(f.next60.international),
                  })}{' '}
                  {f.next60.topDestinations.length > 0 ? (
                    <span className="secondary">
                      {t('retailer.flow.top', {
                        list: f.next60.topDestinations
                          .map((d) => `${d.label} ${fmt.percent(d.share)}`)
                          .join(', '),
                      })}
                    </span>
                  ) : null}
                </p>
                <div className="row">
                  {f.next60.partyType.slice(0, 2).map((s) => (
                    <Badge
                      key={s.segment}
                      tone="neutral"
                    >{`${tx(`segment.${s.segment}`)} ${fmt.percent(s.share)}`}</Badge>
                  ))}
                  {f.next60.tripPurpose.slice(0, 2).map((s) => (
                    <Badge
                      key={s.segment}
                      tone="neutral"
                    >{`${tx(`segment.${s.segment}`)} ${fmt.percent(s.share)}`}</Badge>
                  ))}
                </div>
                <LineChart
                  label={t('retailer.flow.title')}
                  area
                  height={200}
                  xFormat={(x) => fmt.time(x)}
                  yFormat={(y) => fmt.compact(y)}
                  series={[
                    {
                      id: 'pax',
                      label: t('retailer.flow.pax'),
                      color: 'var(--series-1)',
                      values: f.points.map((p) => ({ x: Date.parse(p.at), y: p.pax })),
                    },
                    {
                      id: 'families',
                      label: t('retailer.flow.families'),
                      color: 'var(--series-2)',
                      values: f.points.map((p) => ({
                        x: Date.parse(p.at),
                        y: Math.round(p.pax * p.families),
                      })),
                    },
                    {
                      id: 'intl',
                      label: t('retailer.flow.international'),
                      color: 'var(--series-3)',
                      values: f.points.map((p) => ({
                        x: Date.parse(p.at),
                        y: Math.round(p.pax * p.international),
                      })),
                    },
                  ]}
                />
              </div>
            )}
          </Async>
        </Card>

        <Card title={t('retailer.sales.title')} subtitle={t('retailer.sales.subtitle')}>
          <Async state={overview}>
            {(o) =>
              o.recentRedemptions.length === 0 ? (
                <Empty icon="tag" title={t('retailer.sales.none')} />
              ) : (
                <ul className="feed">
                  {o.recentRedemptions.map((r) => (
                    <li key={r.id} className={r.fromPhone ? 'feed__new' : undefined}>
                      <span className="num ltr muted">{fmt.time(r.at)}</span>
                      <span className="feed__main">
                        <strong>{r.campaignName}</strong>
                        <span className="muted xsmall">
                          {[r.outletName, r.segment ? tx(`segment.${r.segment}`) : null]
                            .filter(Boolean)
                            .join(' · ')}
                        </span>
                      </span>
                      {r.fromPhone ? (
                        <Badge tone="accent" icon="qr">
                          {t('retailer.sales.phone')}
                        </Badge>
                      ) : null}
                      <strong className="num">{fmt.money(r.revenue)}</strong>
                    </li>
                  ))}
                </ul>
              )
            }
          </Async>
        </Card>
      </div>

      <div className="grid grid--1-2">
        <Card title={t('retailer.hourly.title')} subtitle={t('retailer.hourly.subtitle')}>
          <Async state={overview}>
            {(o) => (
              <ColumnChart
                label={t('retailer.hourly.title')}
                valueLabel={t('kpi.sales.label')}
                yFormat={(v) => fmt.money(v, { compact: true })}
                color="var(--series-1)"
                highlight={String(o.hourly.at(-1)?.hour ?? '')}
                points={o.hourly.map((h) => ({
                  key: String(h.hour),
                  label: `${String(h.hour).padStart(2, '0')}`,
                  value: h.revenue,
                }))}
              />
            )}
          </Async>
        </Card>

        <Card title={t('retailer.live.title')} flush>
          <Async state={overview}>
            {(o) => (
              <Table
                rowKey={(c) => c.id}
                rows={o.campaigns.filter((c) => ['active', 'paused', 'pending_review'].includes(c.status))}
                empty={t('retailer.live.none')}
                columns={[
                  {
                    key: 'name',
                    header: t('common.table.campaign'),
                    cell: (c) => (
                      <span className="cell-title">
                        <strong>{c.name}</strong>
                        <CampaignStatus status={c.status} />
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
                    key: 'scans',
                    header: t('kpi.scans.label'),
                    align: 'end',
                    cell: (c) => fmt.number(c.today.scans),
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
                  { key: 'pacing', header: t('common.table.pacing'), cell: (c) => <Pacing campaign={c} /> },
                  {
                    key: 'stock',
                    header: t('common.table.stock'),
                    align: 'center',
                    cell: (c) =>
                      c.promo ? (
                        c.promo.inStock ? (
                          <Icon name="check" size={16} label={t('retailer.stock.in')} />
                        ) : (
                          <Badge tone="warning">{t('retailer.stock.out')}</Badge>
                        )
                      ) : (
                        '–'
                      ),
                  },
                ]}
              />
            )}
          </Async>
        </Card>
      </div>
    </div>
  );
}
