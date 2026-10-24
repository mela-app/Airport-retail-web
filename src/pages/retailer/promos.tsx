/**
 * Promo codes: codes claimed from the screens' QR codes (each expires when its flight's boarding closes;
 * one extra code can be shared with family), today's redemptions, and each campaign's promo settings.
 */
import { useI18n } from '../../i18n';
import type { AdvertiserOverview, PromoCodes } from '../../lib/analytics-types';
import { useApi } from '../../lib/use-api';
import { Async, Badge, Card, Kpi, Status } from '../../ui/display';
import { Table } from '../../ui/table';
import type { PageProps } from '../registry';

export function RetailerPromos({ persona }: PageProps) {
  const { t, fmt } = useI18n();
  const advertiserId = persona?.id ?? 'adv-aurelia';
  const codes = useApi<PromoCodes>(`/api/advertisers/${advertiserId}/promo-codes`, {
    topics: ['claims', 'delivery'],
    debounceMs: 800,
  });
  const overview = useApi<AdvertiserOverview>(`/api/advertisers/${advertiserId}/overview`, {
    topics: ['catalog'],
  });

  return (
    <div className="stack">
      <div className="page-intro">
        <div>
          <h1>{t('page.retailer.promos')}</h1>
          <p className="muted small">{t('promos.page.intro')}</p>
        </div>
      </div>
      <Async state={codes}>
        {(c) => (
          <div className="grid grid--kpis">
            <Kpi live icon="qr" label={t('promos.page.issued')} value={fmt.number(c.codes.length)} />
            <Kpi
              icon="users"
              label={t('promos.page.shared')}
              value={fmt.number(c.codes.filter((x) => x.parentCode).length)}
            />
            <Kpi
              live
              icon="tag"
              label={t('kpi.redemptions.label')}
              value={fmt.number(c.redemptionsToday)}
              hint={t('promos.page.allChannels')}
            />
            <Kpi live icon="store" label={t('kpi.sales.label')} value={fmt.money(c.revenueToday)} />
          </div>
        )}
      </Async>

      <Card title={t('promos.page.codes')} subtitle={t('promos.page.codesHint')} flush>
        <Async state={codes}>
          {(c) => (
            <Table
              rowKey={(x) => x.code}
              rows={c.codes}
              empty={t('promos.page.none')}
              columns={[
                {
                  key: 'code',
                  header: t('promos.page.code'),
                  cell: (x) => (
                    <span className="cell-title">
                      <strong className="mono ltr">{x.code}</strong>
                      {x.parentCode ? (
                        <span className="muted xsmall ltr">
                          {t('promos.page.sharedFrom', { code: x.parentCode })}
                        </span>
                      ) : null}
                    </span>
                  ),
                },
                { key: 'campaign', header: t('common.table.campaign'), cell: (x) => x.campaignName },
                {
                  key: 'flight',
                  header: t('promos.page.flight'),
                  cell: (x) => <span className="ltr">{x.flight ?? '–'}</span>,
                },
                {
                  key: 'screen',
                  header: t('promos.page.screen'),
                  cell: (x) => <span className="ltr xsmall">{x.screenId}</span>,
                },
                {
                  key: 'issued',
                  header: t('promos.page.issuedAt'),
                  align: 'end',
                  cell: (x) => fmt.time(x.issuedAt),
                },
                {
                  key: 'expires',
                  header: t('promos.page.expires'),
                  align: 'end',
                  cell: (x) => fmt.time(x.expiresAt),
                },
                {
                  key: 'status',
                  header: t('common.table.status'),
                  cell: (x) => (
                    <Status
                      tone={x.status === 'redeemed' ? 'good' : x.status === 'active' ? 'accent' : 'neutral'}
                    >
                      {t(
                        x.status === 'redeemed'
                          ? 'promos.status.redeemed'
                          : x.status === 'active'
                            ? 'promos.status.active'
                            : 'promos.status.expired',
                      )}
                    </Status>
                  ),
                },
              ]}
            />
          )}
        </Async>
      </Card>

      <Card title={t('promos.page.settings')} flush>
        <Async state={overview}>
          {(o) => (
            <Table
              rowKey={(x) => x.id}
              rows={o.campaigns.filter((x) => x.promo)}
              empty={t('promos.page.noSettings')}
              columns={[
                { key: 'name', header: t('common.table.campaign'), cell: (x) => x.name },
                { key: 'offer', header: t('builder.promo.offer'), cell: (x) => x.promo?.offerText },
                {
                  key: 'stock',
                  header: t('common.table.stock'),
                  cell: (x) =>
                    x.promo?.inStock ? (
                      <Badge tone="good">{t('retailer.stock.in')}</Badge>
                    ) : (
                      <Badge tone="warning">{t('retailer.stock.out')}</Badge>
                    ),
                },
                {
                  key: 'red',
                  header: t('kpi.redemptions.label'),
                  align: 'end',
                  cell: (x) => fmt.number(x.today.redemptions),
                },
              ]}
            />
          )}
        </Async>
      </Card>
    </div>
  );
}
