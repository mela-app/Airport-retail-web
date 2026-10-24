/** Pieces shared by the retailer, airline and media-manager views. */
import { useI18n } from '../../i18n';
import type { CampaignRow } from '../../lib/analytics-types';
import { Status, type Tone } from '../../ui/display';

const STATUS_TONE = new Map<string, Tone>([
  ['active', 'good'],
  ['approved', 'good'],
  ['paused', 'warning'],
  ['pending_review', 'accent'],
  ['draft', 'neutral'],
  ['rejected', 'critical'],
  ['completed', 'neutral'],
]);

export function CampaignStatus({ status }: { status: string }) {
  const { tx } = useI18n();
  return (
    <Status tone={STATUS_TONE.get(status) ?? 'neutral'}>{tx(`campaign.status.${status}`, status)}</Status>
  );
}

/** Daily budget used so far, against the daily cap. */
export function Pacing({ campaign }: { campaign: Pick<CampaignRow, 'pacing' | 'spend' | 'budget'> }) {
  const { fmt } = useI18n();
  const share = campaign.pacing.daily ?? 0;
  const tone = share >= 0.95 ? 'progress--critical' : share >= 0.8 ? 'progress--warning' : '';
  return (
    <span
      className="pacing"
      title={`${fmt.money(campaign.spend.today)} / ${fmt.money(campaign.budget.dailyCap)}`}
    >
      <span className={`progress ${tone}`}>
        <span style={{ width: `${Math.min(100, share * 100)}%` }} />
      </span>
      <span className="num xsmall muted">{fmt.percent(share)}</span>
    </span>
  );
}
