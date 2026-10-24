/**
 * A shareable, printable advertiser report (`/report/<advertiser id>`): today's results, each campaign's last
 * 30 days and sales by hour. "Print / PDF" uses the browser's print dialog; the page has print styles.
 */
import { useI18n } from '../../i18n';
import type { AdvertiserOverview, CampaignPerformance } from '../../lib/analytics-types';
import { useApi } from '../../lib/use-api';
import { useAppConfig } from '../../app/config';
import { ColumnChart } from '../../ui/charts';
import { Button } from '../../ui/controls';
import { Async, Kpi } from '../../ui/display';
import { Table } from '../../ui/table';

export function AdvertiserReport({ advertiserId }: { advertiserId: string }) {
  const { t, fmt } = useI18n();
  const { brand } = useAppConfig();
  const overview = useApi<AdvertiserOverview>(
    `/api/advertisers/${encodeURIComponent(advertiserId)}/overview`,
  );

  return (
    <div className="report" data-theme="light">
      <Async state={overview}>
        {(o) => (
          <>
            <header className="report__head">
              <div>
                <p className="muted small">{`${brand.productName} · ${brand.airportName}`}</p>
                <h1>{t('report.page.title', { name: o.advertiser.name })}</h1>
                <p className="muted small">
                  {t('report.page.generated', { day: fmt.day(o.at), time: fmt.time(o.at) })}
                </p>
              </div>
              <div className="row report__actions">
                <Button
                  icon="external"
                  onClick={() => void navigator.clipboard?.writeText(window.location.href)}
                >
                  {t('report.page.copy')}
                </Button>
                <Button variant="primary" icon="layers" onClick={() => window.print()}>
                  {t('report.page.print')}
                </Button>
              </div>
            </header>
            <section className="grid grid--kpis">
              <Kpi label={t('kpi.plays.label')} value={fmt.number(o.today.plays)} />
              <Kpi label={t('kpi.impressions.label')} value={fmt.compact(o.today.viewers)} />
              <Kpi label={t('kpi.scans.label')} value={fmt.number(o.today.scans)} />
              <Kpi label={t('kpi.redemptions.label')} value={fmt.number(o.today.redemptions)} />
              <Kpi label={t('kpi.sales.label')} value={fmt.money(o.today.revenue)} />
              <Kpi label={t('kpi.spend.label')} value={fmt.money(o.today.cost)} />
            </section>
            <section className="report__section">
              <h2>{t('retailer.hourly.title')}</h2>
              <ColumnChart
                label={t('retailer.hourly.title')}
                valueLabel={t('kpi.sales.label')}
                yFormat={(v) => fmt.money(v, { compact: true })}
                points={o.hourly.map((h) => ({
                  key: String(h.hour),
                  label: String(h.hour).padStart(2, '0'),
                  value: h.revenue,
                }))}
              />
            </section>
            <section className="report__section">
              <h2>{t('report.page.campaigns')}</h2>
              {o.campaigns.map((c) => (
                <CampaignBlock key={c.id} campaignId={c.id} />
              ))}
            </section>
            <p className="xsmall muted">{t('report.page.footer')}</p>
          </>
        )}
      </Async>
    </div>
  );
}

function CampaignBlock({ campaignId }: { campaignId: string }) {
  const { t, fmt } = useI18n();
  const perf = useApi<CampaignPerformance>(`/api/campaigns/${campaignId}/performance`);
  return (
    <Async state={perf}>
      {(p) => (
        <div className="report__campaign">
          <h3>{p.campaign.name}</h3>
          <Table
            dense
            rowKey={(r) => r.key}
            rows={[
              { key: 'today', label: t('report.page.today'), ...p.today, spend: p.today.cost },
              {
                key: '30',
                label: t('retailer.perf.days30'),
                plays: p.last30.days.reduce((s, d) => s + d.plays, 0),
                viewers: p.last30.impressions,
                scans: p.last30.days.reduce((s, d) => s + d.scans, 0),
                redemptions: p.last30.redemptions,
                revenue: p.last30.revenue,
                spend: p.last30.spend,
                roas: p.last30.roas,
                roi: p.last30.roi,
                cost: p.last30.spend,
              },
            ]}
            columns={[
              { key: 'label', header: '', cell: (r) => r.label },
              { key: 'plays', header: t('kpi.plays.label'), align: 'end', cell: (r) => fmt.number(r.plays) },
              {
                key: 'viewers',
                header: t('kpi.impressions.label'),
                align: 'end',
                cell: (r) => fmt.compact(r.viewers),
              },
              {
                key: 'red',
                header: t('kpi.redemptions.label'),
                align: 'end',
                cell: (r) => fmt.number(r.redemptions),
              },
              { key: 'sales', header: t('kpi.sales.label'), align: 'end', cell: (r) => fmt.money(r.revenue) },
              { key: 'spend', header: t('kpi.spend.label'), align: 'end', cell: (r) => fmt.money(r.spend) },
              {
                key: 'roas',
                header: t('kpi.roas.label'),
                align: 'end',
                cell: (r) => (r.roas === null ? '–' : `${fmt.number(r.roas, 1)}×`),
              },
              {
                key: 'roi',
                header: t('kpi.roi.label'),
                align: 'end',
                cell: (r) => (r.roi === null ? '–' : fmt.percent(r.roi)),
              },
            ]}
          />
        </div>
      )}
    </Async>
  );
}
