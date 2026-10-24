/**
 * Rules and model: the rule-engine settings (score weights, exploration, frequency, relevance floor, competitor
 * separation, airline priority) and the learning model in use (version, retraining, performance per campaign).
 */
import { useEffect, useState } from 'react';

import { useI18n } from '../../i18n';
import { api } from '../../lib/api';
import { useApi } from '../../lib/use-api';
import { Button, Field } from '../../ui/controls';
import { Async, Card, Kpi } from '../../ui/display';
import { useToast } from '../../ui/overlay';
import { Table } from '../../ui/table';

interface Settings {
  audienceWeight: number;
  performanceWeight: number;
  explorationPct: number;
  defaultFrequencyCap: number;
  maxConsecutivePlays: number;
  minScoreToPlay: number;
  competitorSeparation: boolean;
  airlinePriorityInBoardingWindow: boolean;
  airlinePriorityWindowMin: number;
  segmentModelVersion: string;
}

interface Model {
  version: string;
  trainedAt: string;
  campaigns: { campaignId: string; name: string; performance: number }[];
}

export function AdminRules() {
  const { t, fmt } = useI18n();
  const toast = useToast();
  const settings = useApi<{ settings: Settings; defaults: Settings }>('/api/settings/rule-engine', {
    topics: ['sim'],
  });
  const model = useApi<Model>('/api/model', { topics: ['model'] });
  const [draft, setDraft] = useState<Settings | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (settings.data && !draft) setDraft(settings.data.settings);
  }, [settings.data, draft]);

  const save = async (next: Settings) => {
    setBusy(true);
    try {
      await api.put('/api/settings/rule-engine', next);
      toast(t('admin.rules.saved'), 'good');
      settings.reload();
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e), 'error');
    } finally {
      setBusy(false);
    }
  };

  const num = (
    key: keyof Settings,
    label: string,
    opts: { min: number; max: number; step: number; hint?: string },
  ) =>
    draft ? (
      <Field label={label} hint={opts.hint}>
        {(id) => (
          <input
            id={id}
            className="input"
            type="number"
            min={opts.min}
            max={opts.max}
            step={opts.step}
            value={Number(new Map(Object.entries(draft)).get(key))}
            onChange={(e) => setDraft({ ...draft, [key]: Number(e.target.value) })}
          />
        )}
      </Field>
    ) : null;

  return (
    <div className="grid grid--2">
      <Card
        title={t('admin.rules.title')}
        subtitle={t('admin.rules.subtitle')}
        actions={
          draft && settings.data ? (
            <span className="row">
              <Button size="sm" onClick={() => setDraft(settings.data?.defaults ?? draft)}>
                {t('admin.rules.defaults')}
              </Button>
              <Button size="sm" variant="primary" busy={busy} onClick={() => void save(draft)}>
                {t('common.ui.save')}
              </Button>
            </span>
          ) : null
        }
      >
        {draft ? (
          <div className="stack stack--tight">
            <div className="weight-split">
              <span>{t('admin.rules.audience', { w: fmt.percent(draft.audienceWeight) })}</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={draft.audienceWeight}
                aria-label={t('admin.rules.split')}
                onChange={(e) => {
                  const a = Number(e.target.value);
                  setDraft({
                    ...draft,
                    audienceWeight: a,
                    performanceWeight: Math.round((1 - a) * 100) / 100,
                  });
                }}
              />
              <span>{t('admin.rules.performance', { w: fmt.percent(draft.performanceWeight) })}</span>
            </div>
            <p className="xsmall muted">{t('admin.rules.formula')}</p>
            <div className="form-grid">
              {num('minScoreToPlay', t('admin.rules.floor'), {
                min: 0,
                max: 1,
                step: 0.05,
                hint: t('admin.rules.floorHint'),
              })}
              {num('explorationPct', t('admin.rules.exploration'), {
                min: 0,
                max: 50,
                step: 1,
                hint: t('admin.rules.explorationHint'),
              })}
              {num('defaultFrequencyCap', t('admin.rules.frequency'), { min: 1, max: 240, step: 1 })}
              {num('maxConsecutivePlays', t('admin.rules.rotation'), {
                min: 1,
                max: 20,
                step: 1,
                hint: t('admin.rules.rotationHint'),
              })}
              {num('airlinePriorityWindowMin', t('admin.rules.airlineWindow'), { min: 5, max: 180, step: 5 })}
            </div>
            <label className="toggle-row">
              <input
                type="checkbox"
                checked={draft.competitorSeparation}
                onChange={(e) => setDraft({ ...draft, competitorSeparation: e.target.checked })}
              />
              <span>{t('admin.rules.competitors')}</span>
            </label>
            <label className="toggle-row">
              <input
                type="checkbox"
                checked={draft.airlinePriorityInBoardingWindow}
                onChange={(e) => setDraft({ ...draft, airlinePriorityInBoardingWindow: e.target.checked })}
              />
              <span>{t('admin.rules.airlinePriority')}</span>
            </label>
          </div>
        ) : null}
      </Card>

      <Async state={model}>
        {(m) => (
          <div className="stack">
            <div className="grid grid--kpis">
              <Kpi
                label={t('admin.model.version')}
                value={m.version.split(' ').at(-1) ?? m.version}
                hint={m.version}
              />
              <Kpi
                label={t('admin.model.trained')}
                value={fmt.time(m.trainedAt)}
                hint={t('admin.model.trainedHint')}
              />
            </div>
            <Card title={t('admin.model.title')} subtitle={t('admin.model.subtitle')} flush>
              <Table
                dense
                rowKey={(c) => c.campaignId}
                rows={[...m.campaigns].sort((a, b) => b.performance - a.performance)}
                columns={[
                  { key: 'name', header: t('common.table.campaign'), cell: (c) => c.name },
                  {
                    key: 'perf',
                    header: t('retailer.perf.performance'),
                    cell: (c) => (
                      <span className="pacing">
                        <span className="progress">
                          <span style={{ width: `${Math.min(100, c.performance * 100)}%` }} />
                        </span>
                        <span className="num xsmall">{fmt.number(c.performance, 2)}</span>
                      </span>
                    ),
                  },
                ]}
              />
            </Card>
          </div>
        )}
      </Async>
    </div>
  );
}
