/**
 * "Why this ad?": the crowd in front of the screen, the top three candidates with their scores, the business
 * rules that applied and the AI verification checks, all from the decision's recorded context.
 */
import { type MessageKey, useI18n } from '../../i18n';
import type { CandidateView, ScreenNow } from '../../lib/types';
import { Badge, Status } from '../../ui/display';
import { Bars } from '../../ui/segment-bars';
import { Icon } from '../../ui/icon';

const DIMENSION_LABEL = new Map<string, MessageKey>([
  ['tripPurpose', 'dimension.trip-purpose.label' as MessageKey],
  ['partyType', 'dimension.party-type.label' as MessageKey],
  ['ageBand', 'dimension.age-band.label' as MessageKey],
  ['market', 'dimension.market.label' as MessageKey],
  ['cabin', 'dimension.cabin.label' as MessageKey],
  ['gender', 'dimension.gender.label' as MessageKey],
]);

export function WhyPanel({ data }: { data: ScreenNow }) {
  const { t, tx, fmt } = useI18n();
  const ctx = data.context;
  const run = data.run;
  if (!ctx || !run) return null;
  const crowd = ctx.crowd;
  const byId = new Map(ctx.candidates.map((c) => [c.campaignId, c]));
  const top = ctx.order
    .map((id) => byId.get(id))
    .filter((c): c is CandidateView => Boolean(c))
    .slice(0, 3);
  const filtered = ctx.candidates.filter((c) => !c.eligible).length;
  const checks = run.checks.length > 0 ? run.checks : ctx.ai.checks;
  const passed = checks.filter((c) => c.passed).length;
  const verified = run.mode === 'ai_verified';

  return (
    <aside className="why" aria-label={t('player.why.title')}>
      <header className="why__head">
        <h3>{t('player.why.title')}</h3>
        <span className="muted small">{t('player.why.contextAt', { time: fmt.time(ctx.windowStart) })}</span>
      </header>

      <section className="why__section">
        <div className="why__playing">
          <span className="why__label">{t('player.why.playing')}</span>
          <strong>{data.campaign?.name ?? tx('decision.mode.house')}</strong>
          <div className="row">
            <Badge
              tone={verified ? 'good' : run.mode === 'ai_rejected' ? 'warning' : 'neutral'}
              icon={verified ? 'shield' : 'info'}
            >
              {tx(`decision.mode.${run.mode}`, run.mode)}
              {checks.length > 0 ? ` · ${passed}/${checks.length}` : ''}
            </Badge>
            {run.score !== null ? (
              <Badge tone="accent">{`${t('player.why.final')} ${run.score.toFixed(2)}`}</Badge>
            ) : null}
          </div>
        </div>
      </section>

      <section className="why__section">
        <h4>{t('player.why.crowd')}</h4>
        <p className="small secondary">
          {t('player.why.crowdSummary', {
            pax: fmt.number(crowd.pax),
            dwell: fmt.number(crowd.medianDwellMin),
            intl: fmt.percent(crowd.international / 100),
          })}
        </p>
        <Bars title={tx(DIMENSION_LABEL.get('tripPurpose') ?? '')} rows={crowd.tripPurpose} />
        <Bars title={tx(DIMENSION_LABEL.get('partyType') ?? '')} rows={crowd.partyType} />
        <Bars title={tx(DIMENSION_LABEL.get('ageBand') ?? '')} rows={crowd.ageBand} limit={4} />
        {crowd.flights.length > 0 ? (
          <div className="why__flights">
            <span className="why__label">{t('player.why.flights')}</span>
            <ul>
              {crowd.flights.slice(0, 4).map((f) => (
                <li key={f.flightId}>
                  <span className="ltr mono">{f.flight}</span>
                  <span className="ltr">→ {f.destination}</span>
                  <span className="muted num">{fmt.number(f.pax)} pax</span>
                  {f.delayMin > 0 ? <Badge tone="warning" icon="clock">{`+${f.delayMin}′`}</Badge> : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      <section className="why__section">
        <h4>{t('player.why.ranking')}</h4>
        <ol className="why__ranking">
          {top.map((c, i) => (
            <li key={c.campaignId} className={c.campaignId === run.campaignId ? 'is-winner' : undefined}>
              <div className="why__cand-head">
                <span className="why__rank num">{i + 1}</span>
                <span className="why__cand-name">
                  <strong>{c.campaignName}</strong>
                  <span className="muted xsmall">{c.advertiserName}</span>
                </span>
                <span className="why__score num">{c.score?.final.toFixed(2) ?? '–'}</span>
              </div>
              {c.score ? (
                <>
                  <div className="meter" aria-hidden="true">
                    <span style={{ width: `${Math.min(100, c.score.final * 100)}%` }} />
                  </div>
                  <div className="why__parts xsmall muted num">
                    <span>{`${t('player.why.match')} ${fmt.percent(c.score.match)}`}</span>
                    <span>{`${t('player.why.boost')} ×${c.score.boost}`}</span>
                    <span>{`${t('player.why.performance')} ${c.score.performance.toFixed(2)}`}</span>
                  </div>
                  {c.score.triggers.map((tr) => (
                    <div key={tr.type} className="why__trigger xsmall">
                      <Icon name="bolt" size={12} />
                      {tr.detail}
                    </div>
                  ))}
                </>
              ) : null}
            </li>
          ))}
        </ol>
        {filtered > 0 ? <p className="xsmall muted">{t('player.why.filtered', { n: filtered })}</p> : null}
      </section>

      <section className="why__section">
        <h4>{t('player.why.decision')}</h4>
        <span className="why__label">{t('player.why.rules')}</span>
        {run.rules.length === 0 ? (
          <p className="small muted">{t('player.why.noRules')}</p>
        ) : (
          <ul className="why__rules">
            {run.rules.map((r, i) => (
              <li key={`${r.rule}-${i}`}>
                <Badge tone="accent">{tx(`decision.rule.${r.rule}`, r.rule)}</Badge>
                <span className="small">{r.detail}</span>
              </li>
            ))}
          </ul>
        )}
        {checks.length > 0 ? (
          <>
            <span className="why__label">{t('player.why.checks')}</span>
            <ul className="why__checks">
              {checks.map((c) => (
                <li key={c.name} title={c.detail}>
                  <Status tone={c.passed ? 'good' : 'critical'}>
                    {tx(`decision.check.${c.name}`, c.name)}
                  </Status>
                </li>
              ))}
            </ul>
          </>
        ) : null}
        {ctx.ai.rationale ? <p className="why__rationale small">“{ctx.ai.rationale}”</p> : null}
        <p className="xsmall muted">{t('player.why.evidence', { n: ctx.evidenceCount })}</p>
      </section>
    </aside>
  );
}
