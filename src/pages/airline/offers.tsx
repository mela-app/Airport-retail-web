/**
 * Airline "Offers & goodwill": the delay goodwill automation (a co-funded voucher sent to the gate screens
 * when a flight is delayed beyond a threshold) with its live activations and an editable threshold, and a
 * co-marketing marketplace of partner offers ranked by fit with the airline's passengers.
 */
import { useState } from 'react';

import { useI18n } from '../../i18n';
import { api } from '../../lib/api';
import type { Campaign } from '../../lib/types';
import { Button } from '../../ui/controls';
import { Async, Badge, Card, Empty, Kpi } from '../../ui/display';
import { Icon } from '../../ui/icon';
import { useToast } from '../../ui/overlay';
import { Table } from '../../ui/table';
import type { PageProps } from '../registry';
import { CampaignBuilder, type Draft, toDraft } from '../retailer/campaign-builder';
import { CampaignStatus } from '../retailer/shared';
import { useAirline } from './flights';

export function AirlineOffers({ persona }: PageProps) {
  const { t, fmt } = useI18n();
  const toast = useToast();
  const overview = useAirline(persona);
  const [proposal, setProposal] = useState<Draft | null>(null);

  const setThreshold = async (campaignId: string, minutes: number) => {
    try {
      const c = await api.get<Campaign>(`/api/campaigns/${campaignId}`);
      const triggers = c.triggers.map((tr) => (tr.type === 'delay_over' ? { ...tr, minutes } : tr));
      await api.put(`/api/campaigns/${campaignId}`, { ...toDraft(c), triggers });
      toast(t('airline.goodwill.updated', { minutes }), 'good');
      overview.reload();
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e), 'error');
    }
  };

  /** Start a co-funded delay voucher with a partner, prefilled from the partner's offer. */
  const propose = async (partnerCampaignId: string) => {
    if (!persona) return;
    try {
      const partner = await api.get<Campaign>(`/api/campaigns/${partnerCampaignId}`);
      const own = overview.data?.campaigns.find((c) => c.airlinePriority);
      const ownCampaign = own ? await api.get<Campaign>(`/api/campaigns/${own.id}`) : null;
      setProposal({
        ...toDraft(partner),
        advertiserId: persona.id,
        name: t('airline.market.proposalName', { partner: partner.name }),
        objective: 'goodwill',
        creativeIds: ownCampaign?.creativeIds ?? partner.creativeIds,
        triggers: [
          { type: 'delay_over', minutes: 45, airlineIata: persona.airlineIata, destinations: [], boost: 2 },
        ],
        airlinePriority: true,
        coFundedBy: partner.advertiserId,
        promo: partner.promo ? { ...partner.promo, shareable: false } : null,
      });
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e), 'error');
    }
  };

  if (proposal && persona) {
    return (
      <CampaignBuilder
        advertiserId={persona.id}
        initial={proposal}
        campaignId={null}
        onClose={() => setProposal(null)}
      />
    );
  }

  return (
    <Async state={overview}>
      {(o) => (
        <div className="stack">
          <div className="grid grid--kpis">
            <Kpi
              live
              icon="bolt"
              label={t('airline.goodwill.active')}
              value={fmt.number(o.goodwill.activations.length)}
            />
            <Kpi
              icon="tag"
              label={t('airline.goodwill.redemptions')}
              value={fmt.number(o.goodwill.campaigns.reduce((s, c) => s + c.today.redemptions, 0))}
            />
            <Kpi
              icon="monitor"
              label={t('airline.goodwill.plays')}
              value={fmt.number(o.goodwill.campaigns.reduce((s, c) => s + c.today.plays, 0))}
            />
          </div>

          <Card title={t('airline.goodwill.title')} subtitle={t('airline.goodwill.subtitle')}>
            {o.goodwill.campaigns.length === 0 ? (
              <Empty icon="bolt" title={t('airline.goodwill.none')} />
            ) : (
              <div className="stack stack--tight">
                {o.goodwill.campaigns.map((c) => {
                  const trigger = c.triggers.find((tr) => tr.type === 'delay_over');
                  return (
                    <div key={c.id} className="goodwill">
                      <div className="goodwill__head">
                        <span className="cell-title">
                          <strong>{c.name}</strong>
                          <span className="row">
                            <CampaignStatus status={c.status} />
                            {c.coFundedBy ? (
                              <Badge tone="accent">{t('airline.goodwill.cofunded')}</Badge>
                            ) : null}
                          </span>
                        </span>
                        <span className="row">
                          <span className="small">{t('airline.goodwill.threshold')}</span>
                          {[30, 45, 60, 90].map((m) => (
                            <Button
                              key={m}
                              size="sm"
                              variant={trigger?.minutes === m ? 'primary' : 'secondary'}
                              aria-pressed={trigger?.minutes === m}
                              onClick={() => void setThreshold(c.id, m)}
                            >
                              {t('common.ui.minutes', { n: m })}
                            </Button>
                          ))}
                        </span>
                      </div>
                      <p className="small secondary">
                        {t('airline.goodwill.rule', {
                          minutes: trigger?.minutes ?? 60,
                          boost: trigger?.boost ?? 1,
                        })}
                      </p>
                    </div>
                  );
                })}
                <h4 className="why__label">{t('airline.goodwill.activationsTitle')}</h4>
                {o.goodwill.activations.length === 0 ? (
                  <p className="muted small">{t('airline.goodwill.noActivations')}</p>
                ) : (
                  <ul className="feed">
                    {o.goodwill.activations.map((a) => (
                      <li key={`${a.campaignId}-${a.flight}`} className="feed__new">
                        <Icon name="bolt" size={16} />
                        <span className="feed__main">
                          <strong className="ltr">{`${a.flight} +${a.delayMinutes} min`}</strong>
                          <span className="muted xsmall">{`${a.campaignName} · ${a.gateId ?? ''}`}</span>
                        </span>
                        <Badge tone="warning">{t('airline.goodwill.live')}</Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </Card>

          <Card title={t('airline.market.title')} subtitle={t('airline.market.subtitle')} flush>
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
                  align: 'end',
                  cell: (p) => fmt.percent(p.match),
                },
                {
                  key: 'action',
                  header: <span className="sr-only">{t('common.table.actions')}</span>,
                  align: 'end',
                  cell: (p) => (
                    <Button size="sm" icon="users" onClick={() => void propose(p.campaignId)}>
                      {t('airline.market.propose')}
                    </Button>
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
