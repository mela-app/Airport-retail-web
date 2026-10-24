/**
 * Airline "My flights": today's departures and arrivals with boarding windows and delays, the aggregated
 * profile of the airline's departing passengers (no individual data), and partner offers ranked by fit.
 */
import { useI18n } from '../../i18n';
import type { AirlineOverview } from '../../lib/analytics-types';
import { useSimClock } from '../../lib/clock';
import { useApi } from '../../lib/use-api';
import { Async, Badge, Card, Kpi, Status } from '../../ui/display';
import { Bars } from '../../ui/segment-bars';
import { Table } from '../../ui/table';
import type { PageProps } from '../registry';
import { FlightTimeline } from './timeline';

export function useAirline(persona: PageProps['persona']) {
  const iata = persona?.airlineIata ?? 'XH';
  return useApi<AirlineOverview>(`/api/airlines/${iata}/overview`, {
    topics: ['flight', 'flights_reloaded', 'decisions', 'catalog'],
    debounceMs: 1000,
  });
}

export function AirlineFlights({ persona }: PageProps) {
  const { t, tx, fmt } = useI18n();
  const overview = useAirline(persona);
  const { nowMs } = useSimClock(30_000);

  return (
    <Async state={overview}>
      {(o) => (
        <div className="stack">
          <section className="grid grid--kpis" aria-label={t('page.airline.overview')}>
            <Kpi icon="plane" label={t('airline.kpi.departures')} value={fmt.number(o.summary.departures)} />
            <Kpi icon="plane" label={t('airline.kpi.arrivals')} value={fmt.number(o.summary.arrivals)} />
            <Kpi live icon="clock" label={t('airline.kpi.delayed')} value={fmt.number(o.summary.delayed)} />
            <Kpi
              live
              icon="gate"
              label={t('airline.kpi.boarding')}
              value={fmt.number(o.summary.inBoarding)}
            />
            <Kpi icon="users" label={t('airline.kpi.pax')} value={fmt.number(o.summary.paxToday)} />
          </section>

          <Card title={t('airline.timeline.title')} subtitle={t('airline.timeline.subtitle')}>
            <FlightTimeline flights={o.flights} nowMs={nowMs ?? Date.parse(o.at)} />
          </Card>

          <div className="grid grid--2-1">
            <Card title={t('airline.flights.title')} flush>
              <Table
                dense
                rowKey={(f) => f.id}
                rows={o.flights
                  .filter((f) => Date.parse(f.estimatedTime ?? f.scheduledTime) >= (nowMs ?? 0) - 3_600_000)
                  .slice(0, 18)}
                empty={t('airline.flights.none')}
                columns={[
                  {
                    key: 'flight',
                    header: t('player.fids.flight'),
                    cell: (f) => <strong className="ltr">{f.flight}</strong>,
                  },
                  {
                    key: 'dir',
                    header: t('airline.flights.route'),
                    cell: (f) => (
                      <span className="ltr">
                        {f.direction === 'D' ? `MQI → ${f.other}` : `${f.other} → MQI`}
                      </span>
                    ),
                  },
                  {
                    key: 'time',
                    header: t('player.fids.time'),
                    align: 'end',
                    cell: (f) => fmt.time(f.scheduledTime),
                  },
                  {
                    key: 'est',
                    header: t('airline.flights.estimated'),
                    align: 'end',
                    cell: (f) =>
                      f.delayMinutes > 0 ? (
                        <span className="warning-text">{`${fmt.time(f.estimatedTime ?? f.scheduledTime)} (+${f.delayMinutes})`}</span>
                      ) : (
                        '–'
                      ),
                  },
                  {
                    key: 'gate',
                    header: t('player.fids.gate'),
                    cell: (f) => <span className="ltr">{f.gate ?? '–'}</span>,
                  },
                  {
                    key: 'pax',
                    header: t('airline.flights.pax'),
                    align: 'end',
                    cell: (f) => fmt.number(f.pax),
                  },
                  {
                    key: 'status',
                    header: t('common.table.status'),
                    cell: (f) => (
                      <Status
                        tone={
                          f.status === 'delayed'
                            ? 'warning'
                            : f.status === 'cancelled'
                              ? 'critical'
                              : f.inBoardingWindow
                                ? 'accent'
                                : 'neutral'
                        }
                      >
                        {tx(`flight.status.${f.status}`, f.status)}
                      </Status>
                    ),
                  },
                ]}
              />
            </Card>

            <Card
              title={t('airline.profile.title')}
              subtitle={t('airline.profile.subtitle', { n: o.profile?.flights ?? 0 })}
            >
              {o.profile ? (
                <div className="stack stack--tight">
                  <p className="small secondary">
                    {t('airline.profile.international', { share: fmt.percent(o.profile.international) })}
                  </p>
                  <Bars title={tx('dimension.trip-purpose.label')} rows={o.profile.tripPurpose} />
                  <Bars title={tx('dimension.party-type.label')} rows={o.profile.partyType} />
                  <Bars title={tx('dimension.cabin.label')} rows={o.profile.cabin} />
                  <div className="row">
                    {o.profile.topNationalities.map((n) => (
                      <Badge key={n.code}>{`${n.label} ${fmt.percent(n.share)}`}</Badge>
                    ))}
                  </div>
                  <p className="xsmall muted">{t('airline.profile.privacy')}</p>
                </div>
              ) : (
                <p className="muted small">{t('airline.profile.none')}</p>
              )}
            </Card>
          </div>

          <Card title={t('airline.partners.title')} subtitle={t('airline.partners.subtitle')} flush>
            <Table
              rowKey={(p) => p.campaignId}
              rows={o.partnerOffers}
              empty={t('airline.partners.none')}
              columns={[
                {
                  key: 'offer',
                  header: t('airline.partners.offer'),
                  cell: (p) => (
                    <span className="cell-title">
                      <strong>{p.offerText ?? p.name}</strong>
                      <span className="muted xsmall">{p.advertiser}</span>
                    </span>
                  ),
                },
                {
                  key: 'fit',
                  header: t('airline.partners.fit'),
                  cell: (p) => (
                    <span className="pacing">
                      <span className="progress">
                        <span style={{ width: `${Math.min(100, p.match * 100)}%` }} />
                      </span>
                      <span className="num small">{fmt.percent(p.match)}</span>
                    </span>
                  ),
                },
              ]}
            />
          </Card>
        </div>
      )}
    </Async>
  );
}
