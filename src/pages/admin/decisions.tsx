/**
 * Decision log: every decision run (a campaign playing on a screen from one context), searchable by screen,
 * campaign, mode and text. Selecting one shows its evidence trail: each fact with its source, time and what
 * it was derived from, the candidates and the AI checks.
 */
import { useState } from 'react';

import { useI18n } from '../../i18n';
import { qs } from '../../lib/api';
import type { CandidateView, CheckResult, DecisionRunView } from '../../lib/types';
import { useApi } from '../../lib/use-api';
import { Field, Select } from '../../ui/controls';
import { Async, Badge, Card, Empty, Status } from '../../ui/display';
import { Table } from '../../ui/table';

interface Evidence {
  id: string;
  field: string;
  value: unknown;
  source: string;
  subject: string;
  sourceRef: string;
  observedAt: string;
  derivedFrom?: string[];
}

interface StoredContext {
  id: string;
  computedAt: string;
  windowStart: string;
  candidates: CandidateView[];
  order: string[];
  ai: { provider: string; model: string; status: string; checks: CheckResult[]; rationale: string | null };
  evidence: Evidence[];
}

const MODES = ['ai_verified', 'ai_rejected', 'rule_based', 'manual_pin', 'house'] as const;
const SOURCES = ['aodb', 'aidx', 'acris', 'audience', 'screen', 'redemption', 'derived'] as const;

export function AdminDecisions() {
  const { t, tx, fmt } = useI18n();
  const [q, setQ] = useState('');
  const [mode, setMode] = useState('');
  const [screenId, setScreenId] = useState('');
  const [selected, setSelected] = useState<DecisionRunView | null>(null);
  const query = qs({
    q: q.trim() || undefined,
    mode: mode || undefined,
    screenId: screenId.trim() || undefined,
    limit: 150,
  });
  const decisions = useApi<DecisionRunView[]>('/api/decisions' + query, {
    topics: ['decisions'],
    debounceMs: 2500,
  });
  const campaigns = useApi<{ id: string; name: string }[]>('/api/campaigns', { topics: ['catalog'] });
  const campaignNames = new Map((campaigns.data ?? []).map((c) => [c.id, c.name]));

  return (
    <div className="stack">
      <div className="filters">
        <Field label={t('admin.log.search')}>
          {(id) => (
            <input
              id={id}
              className="input"
              type="search"
              placeholder={t('admin.log.searchPlaceholder')}
              value={q}
              maxLength={80}
              onChange={(e) => setQ(e.target.value)}
            />
          )}
        </Field>
        <Field label={t('player.screen.label')}>
          {(id) => (
            <input
              id={id}
              className="input ltr"
              placeholder="SCR-T2-D-01"
              value={screenId}
              maxLength={40}
              onChange={(e) => setScreenId(e.target.value)}
            />
          )}
        </Field>
        <Field label={t('admin.log.mode')}>
          {(id) => (
            <Select id={id} value={mode} onChange={(e) => setMode(e.target.value)}>
              <option value="">{t('builder.page.any')}</option>
              {MODES.map((m) => (
                <option key={m} value={m}>
                  {tx(`decision.mode.${m}`, m)}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>

      <div className="grid grid--1-1">
        <Card title={t('admin.log.title')} subtitle={t('admin.log.subtitle')} flush>
          <Async state={decisions}>
            {(rows) => (
              <Table
                dense
                rowKey={(d) => d.id}
                rows={rows}
                selectedKey={selected?.id ?? null}
                onRowClick={(d) => setSelected(d)}
                empty={t('admin.log.none')}
                columns={[
                  {
                    key: 'when',
                    header: t('admin.log.when'),
                    cell: (d) => (
                      <span className="cell-title">
                        <span className="num">{`${fmt.time(d.slotStart)}–${fmt.time(d.slotEnd)}`}</span>
                        <span className="muted xsmall">{t('admin.log.slots', { n: d.slots })}</span>
                      </span>
                    ),
                  },
                  {
                    key: 'screen',
                    header: t('player.screen.label'),
                    cell: (d) => <span className="ltr xsmall">{d.screenId}</span>,
                  },
                  {
                    key: 'campaign',
                    header: t('common.table.campaign'),
                    cell: (d) =>
                      d.campaignId
                        ? (campaignNames.get(d.campaignId) ?? d.campaignId)
                        : tx('decision.mode.house'),
                  },
                  {
                    key: 'mode',
                    header: t('admin.log.mode'),
                    cell: (d) => (
                      <Status
                        tone={
                          d.mode === 'ai_verified'
                            ? 'good'
                            : d.mode === 'ai_rejected'
                              ? 'warning'
                              : d.mode === 'manual_pin'
                                ? 'accent'
                                : 'neutral'
                        }
                      >
                        {tx(`decision.mode.${d.mode}`, d.mode)}
                      </Status>
                    ),
                  },
                  {
                    key: 'score',
                    header: t('player.why.final'),
                    align: 'end',
                    cell: (d) => (d.score === null ? '–' : d.score.toFixed(2)),
                  },
                ]}
              />
            )}
          </Async>
        </Card>
        {selected ? (
          <EvidenceTrail run={selected} />
        ) : (
          <Card>
            <Empty icon="search" title={t('admin.log.pick')}>
              {t('admin.log.pickHint')}
            </Empty>
          </Card>
        )}
      </div>
    </div>
  );
}

function EvidenceTrail({ run }: { run: DecisionRunView }) {
  const { t, tx, fmt } = useI18n();
  const ctx = useApi<StoredContext>(`/api/decision-contexts/${encodeURIComponent(run.contextId)}`);
  const [source, setSource] = useState('');
  return (
    <Card title={t('admin.trail.title')} subtitle={`${run.id}`}>
      <div className="stack stack--tight">
        <p className="small">{run.reason}</p>
        {run.rules.length > 0 ? (
          <div className="row">
            {run.rules.map((r, i) => (
              <Badge
                key={`${r.rule}-${i}`}
                tone="accent"
              >{`${tx(`decision.rule.${r.rule}`, r.rule)}: ${r.detail}`}</Badge>
            ))}
          </div>
        ) : null}
        <Async state={ctx}>
          {(c) => {
            const shown = c.evidence.filter((e) => !source || e.source === source);
            return (
              <>
                <div className="checks-grid">
                  {c.ai.checks.map((check) => (
                    <Status key={check.name} tone={check.passed ? 'good' : 'critical'}>
                      <span title={check.detail}>{tx(`decision.check.${check.name}`, check.name)}</span>
                    </Status>
                  ))}
                </div>
                <p className="xsmall muted">
                  {t('admin.trail.ai', { provider: c.ai.provider, model: c.ai.model, status: c.ai.status })}
                </p>
                <div className="row">
                  <span className="why__label">{t('admin.trail.evidence', { n: c.evidence.length })}</span>
                  <span className="spacer" />
                  <Select
                    aria-label={t('admin.trail.source')}
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                  >
                    <option value="">{t('admin.trail.allSources')}</option>
                    {SOURCES.map((s) => (
                      <option key={s} value={s}>
                        {s.toUpperCase()}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="evidence">
                  {shown.map((e) => (
                    <div key={e.id} className="evidence__row">
                      <Badge tone={e.source === 'derived' ? 'accent' : 'neutral'}>
                        {e.source.toUpperCase()}
                      </Badge>
                      <span className="evidence__main">
                        <span className="mono xsmall ltr">{e.id}</span>
                        <span className="small">
                          <strong>{e.field}</strong>
                          {' = '}
                          <span className="mono ltr">{formatValue(e.value)}</span>
                        </span>
                        {e.derivedFrom?.length ? (
                          <span className="muted xsmall">
                            {t('admin.trail.derivedFrom', { n: e.derivedFrom.length })}
                          </span>
                        ) : null}
                      </span>
                      <span className="muted xsmall num">{fmt.timeSeconds(e.observedAt)}</span>
                    </div>
                  ))}
                </div>
              </>
            );
          }}
        </Async>
      </div>
    </Card>
  );
}

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return '–';
  if (typeof v === 'object') {
    const s = JSON.stringify(v);
    return s.length > 80 ? `${s.slice(0, 77)}…` : s;
  }
  return String(v);
}
