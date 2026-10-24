/**
 * Airline "Gate screens": what plays on the screens at the airline's gates right now and why, and the
 * airline's own gate-area messages, which get priority in its boarding windows.
 */
import { useState } from 'react';

import { useI18n } from '../../i18n';
import { useNavigate } from '../../lib/router';
import { Button } from '../../ui/controls';
import { Async, Badge, Card, Empty } from '../../ui/display';
import { Icon } from '../../ui/icon';
import { Table } from '../../ui/table';
import type { PageProps } from '../registry';
import { CampaignBuilder } from '../retailer/campaign-builder';
import { CampaignStatus } from '../retailer/shared';
import { useAirline } from './flights';

export function AirlineGates({ persona }: PageProps) {
  const { t, tx, fmt } = useI18n();
  const navigate = useNavigate();
  const overview = useAirline(persona);
  const [creating, setCreating] = useState(false);

  if (creating && persona) {
    return (
      <CampaignBuilder
        advertiserId={persona.id}
        initial={null}
        campaignId={null}
        onClose={() => setCreating(false)}
      />
    );
  }

  return (
    <Async state={overview}>
      {(o) => (
        <div className="stack">
          <Card title={t('airline.gates.title')} subtitle={t('airline.gates.subtitle')}>
            {o.gatePlays.length === 0 ? (
              <Empty icon="gate" title={t('airline.gates.none')} />
            ) : (
              <div className="gate-plays">
                {o.gatePlays.map((g) => (
                  <section key={g.flightId} className="gate-play">
                    <header className="gate-play__head">
                      <strong className="ltr">{g.flight}</strong>
                      <span className="muted small ltr">{g.gateId}</span>
                      {g.inBoardingWindow ? (
                        <Badge tone="accent" icon="gate">
                          {t('airline.gates.boarding')}
                        </Badge>
                      ) : null}
                    </header>
                    <ul className="feed">
                      {g.screens.map((s) => (
                        <li key={s.screenId}>
                          <Icon name="monitor" size={16} />
                          <span className="feed__main">
                            <strong>{s.campaignName ?? tx('decision.mode.house')}</strong>
                            <span className="muted xsmall" title={s.reason ?? undefined}>
                              {[s.name, s.advertiser, s.mode ? tx(`decision.mode.${s.mode}`, s.mode) : null]
                                .filter(Boolean)
                                .join(' · ')}
                            </span>
                          </span>
                          {s.own ? <Badge tone="good">{t('airline.gates.yours')}</Badge> : null}
                          {s.score !== null ? <span className="num small">{s.score.toFixed(2)}</span> : null}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => navigate(`/passenger/${s.screenId}`)}
                          >
                            {t('airline.gates.why')}
                          </Button>
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            )}
          </Card>

          <Card
            title={t('airline.messages.title')}
            subtitle={t('airline.messages.subtitle')}
            actions={
              <Button variant="primary" size="sm" icon="plus" onClick={() => setCreating(true)}>
                {t('airline.messages.new')}
              </Button>
            }
            flush
          >
            <Table
              rowKey={(c) => c.id}
              rows={o.campaigns.filter((c) => c.airlinePriority)}
              empty={t('airline.messages.none')}
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
                  key: 'trigger',
                  header: t('airline.messages.when'),
                  cell: (c) =>
                    c.triggers.length === 0
                      ? t('airline.messages.always')
                      : c.triggers.map((tr) => tx(`builder.trigger.${tr.type}`, tr.type)).join(', '),
                },
                {
                  key: 'plays',
                  header: t('kpi.plays.label'),
                  align: 'end',
                  cell: (c) => fmt.number(c.today.plays),
                },
                {
                  key: 'viewers',
                  header: t('kpi.impressions.label'),
                  align: 'end',
                  cell: (c) => fmt.compact(c.today.viewers),
                },
                {
                  key: 'scans',
                  header: t('kpi.scans.label'),
                  align: 'end',
                  cell: (c) => fmt.number(c.today.scans),
                },
              ]}
            />
          </Card>
        </div>
      )}
    </Async>
  );
}
