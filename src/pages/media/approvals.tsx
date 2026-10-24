/**
 * Approval queue: campaigns and creatives waiting for review. Creatives pass a brand-safety checklist
 * (no real brand marks, claims verified, age appropriate, legible at a distance) before they can be approved;
 * a campaign is approved once its creatives are.
 */
import { useState } from 'react';

import { Creative } from '../../creative/creative';
import { useI18n } from '../../i18n';
import { api } from '../../lib/api';
import type { Campaign, CreativeView } from '../../lib/types';
import { useApi } from '../../lib/use-api';
import { Button } from '../../ui/controls';
import { Async, Badge, Card, Empty } from '../../ui/display';
import { useToast } from '../../ui/overlay';
import type { CreativeFull } from '../retailer/creatives';

const CHECKS = ['noRealBrandMarks', 'claimsVerified', 'ageAppropriate', 'legibleAtDistance'] as const;
type Check = (typeof CHECKS)[number];

export function MediaApprovals() {
  const { t } = useI18n();
  const campaigns = useApi<Campaign[]>('/api/campaigns?status=pending_review', { topics: ['catalog'] });
  const creatives = useApi<CreativeFull[]>('/api/creatives?status=pending_review', { topics: ['catalog'] });
  const advertisers = useApi<{ id: string; name: string }[]>('/api/advertisers');
  const names = new Map((advertisers.data ?? []).map((a) => [a.id, a.name]));
  const reload = () => {
    campaigns.reload();
    creatives.reload();
  };

  return (
    <div className="stack">
      <div className="page-intro">
        <div>
          <h1>{t('page.media.approvals')}</h1>
          <p className="muted small">{t('media.approvals.intro')}</p>
        </div>
      </div>
      <Async state={creatives}>
        {(items) =>
          items.length === 0 ? null : (
            <div className="stack">
              <h2 className="section-title">{t('media.approvals.creatives')}</h2>
              <div className="review-grid">
                {items.map((c) => (
                  <CreativeReview
                    key={c.id}
                    creative={c}
                    advertiser={names.get(c.advertiserId) ?? c.advertiserId}
                    onDone={reload}
                  />
                ))}
              </div>
            </div>
          )
        }
      </Async>
      <Async state={campaigns}>
        {(items) =>
          items.length === 0 && (creatives.data?.length ?? 0) === 0 ? (
            <Card>
              <Empty icon="check" title={t('media.approvals.empty')} />
            </Card>
          ) : items.length === 0 ? null : (
            <div className="stack">
              <h2 className="section-title">{t('media.approvals.campaigns')}</h2>
              {items.map((c) => (
                <CampaignReview
                  key={c.id}
                  campaign={c}
                  advertiser={names.get(c.advertiserId) ?? c.advertiserId}
                  onDone={reload}
                />
              ))}
            </div>
          )
        }
      </Async>
    </div>
  );
}

function CreativeReview({
  creative,
  advertiser,
  onDone,
}: {
  creative: CreativeFull;
  advertiser: string;
  onDone: () => void;
}) {
  const { t, tx } = useI18n();
  const toast = useToast();
  const [checks, setChecks] = useState<Record<Check, boolean>>(() => ({ ...creative.brandSafety }));
  const [busy, setBusy] = useState(false);
  const values = new Map(Object.entries(checks));
  const allOk = CHECKS.every((k) => values.get(k));

  const review = async (decision: 'approve' | 'reject') => {
    setBusy(true);
    try {
      await api.post(`/api/creatives/${creative.id}/review`, {
        decision,
        brandSafety: checks,
        ...(decision === 'reject' ? { reason: t('media.approvals.rejectReason') } : {}),
      });
      toast(
        decision === 'approve'
          ? t('media.approvals.approved', { name: creative.name })
          : t('media.approvals.rejected', { name: creative.name }),
        'good',
      );
      onDone();
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card title={creative.name} subtitle={advertiser}>
      <div className="stack stack--tight">
        <div className="review-thumbs">
          <div className="mock-screen">
            <Creative creative={creative} lang="en" format="16:9" />
          </div>
          {creative.content.ar ? (
            <div className="mock-screen">
              <Creative creative={creative} lang="ar" format="16:9" />
            </div>
          ) : null}
        </div>
        <fieldset className="checklist">
          <legend>{t('media.approvals.checklist')}</legend>
          {CHECKS.map((k) => (
            <label key={k} className="toggle-row">
              <input
                type="checkbox"
                checked={values.get(k) ?? false}
                onChange={(e) => setChecks({ ...checks, [k]: e.target.checked })}
              />
              <span>{tx(`media.check.${k}`, k)}</span>
            </label>
          ))}
        </fieldset>
        <div className="row row--end">
          <Button variant="danger" size="sm" busy={busy} onClick={() => void review('reject')}>
            {t('media.approvals.reject')}
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon="check"
            busy={busy}
            disabled={!allOk}
            title={allOk ? undefined : t('media.approvals.needChecks')}
            onClick={() => void review('approve')}
          >
            {t('media.approvals.approve')}
          </Button>
        </div>
      </div>
    </Card>
  );
}

function CampaignReview({
  campaign,
  advertiser,
  onDone,
}: {
  campaign: Campaign;
  advertiser: string;
  onDone: () => void;
}) {
  const { t, tx, fmt } = useI18n();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const creatives = useApi<CreativeView[]>(
    `/api/creatives?advertiserId=${encodeURIComponent(campaign.advertiserId)}`,
    { topics: ['catalog'] },
  );
  const own = (creatives.data ?? []).filter((c) => campaign.creativeIds.includes(c.id));
  const unapproved = own.filter((c) => c.status !== 'approved');

  const review = async (decision: 'approve' | 'reject') => {
    setBusy(true);
    try {
      await api.post(`/api/campaigns/${campaign.id}/review`, {
        decision,
        ...(decision === 'reject' ? { reason: t('media.approvals.rejectReason') } : {}),
      });
      toast(
        decision === 'approve'
          ? t('media.approvals.approved', { name: campaign.name })
          : t('media.approvals.rejected', { name: campaign.name }),
        'good',
      );
      onDone();
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e), 'error');
    } finally {
      setBusy(false);
    }
  };

  const targeted = Object.entries(campaign.segmentWeights)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([s, w]) => `${tx(`segment.${s}`, s)} ${fmt.number(w, 1)}`)
    .join(' · ');

  return (
    <Card
      title={campaign.name}
      subtitle={advertiser}
      actions={
        <span className="row">
          <Button variant="danger" size="sm" busy={busy} onClick={() => void review('reject')}>
            {t('media.approvals.reject')}
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon="check"
            busy={busy}
            disabled={unapproved.length > 0}
            title={unapproved.length > 0 ? t('media.approvals.creativesFirst') : undefined}
            onClick={() => void review('approve')}
          >
            {t('media.approvals.approve')}
          </Button>
        </span>
      }
    >
      <dl className="facts">
        <div>
          <dt>{t('builder.field.objective')}</dt>
          <dd>{tx(`campaign.objective.${campaign.objective}`, campaign.objective)}</dd>
        </div>
        <div>
          <dt>{t('builder.section.audience')}</dt>
          <dd>{targeted || '–'}</dd>
        </div>
        <div>
          <dt>{t('builder.field.zones')}</dt>
          <dd>{campaign.placement.zoneIds.join(', ') || '–'}</dd>
        </div>
        <div>
          <dt>{t('builder.section.budget')}</dt>
          <dd>{`${fmt.money(campaign.budget.total)} · ${fmt.money(campaign.budget.dailyCap)}/${t('media.approvals.day')} · CPM ${fmt.money(campaign.budget.cpm)}`}</dd>
        </div>
        <div>
          <dt>{t('builder.field.dates')}</dt>
          <dd>{`${fmt.day(campaign.placement.schedule.start)} – ${fmt.day(campaign.placement.schedule.end)}`}</dd>
        </div>
        <div>
          <dt>{t('builder.field.creative')}</dt>
          <dd className="row">
            {own.map((c) => (
              <Badge key={c.id} tone={c.status === 'approved' ? 'good' : 'warning'}>
                {`${c.name ?? c.id}: ${tx(`campaign.status.${c.status ?? ''}`, c.status ?? '')}`}
              </Badge>
            ))}
          </dd>
        </div>
      </dl>
    </Card>
  );
}
