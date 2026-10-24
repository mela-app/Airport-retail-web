/**
 * GenAI creative assistant: write a short brief, get three ready-to-edit variants in English and Arabic,
 * each with its brand-safety checks. Works offline (mock copywriter) or with any configured LLM.
 */
import { useState } from 'react';

import { Creative } from '../../creative/creative';
import { useI18n } from '../../i18n';
import { api } from '../../lib/api';
import type { Lang } from '../../lib/format';
import type { CreativeView } from '../../lib/types';
import { Button, Segmented } from '../../ui/controls';
import { Badge, Card, Status } from '../../ui/display';
import { useToast } from '../../ui/overlay';

type Tone = 'warm' | 'premium' | 'playful' | 'urgent';

export interface AssistVariant {
  name: string;
  template: CreativeView['template'];
  artwork: string;
  palette: CreativeView['palette'];
  content: Record<'en' | 'ar', { headline: string; body: string; cta: string; badge: string | null }>;
  rationale: string;
  checks: { name: string; passed: boolean; detail: string }[];
}

interface AssistResult {
  provider: string;
  model: string;
  latencyMs: number;
  fallback: string | null;
  variants: AssistVariant[];
}

export function CreativeAssistant({
  advertiserId,
  onApply,
}: {
  advertiserId: string;
  onApply: (v: AssistVariant) => void;
}) {
  const { t, tx, fmt } = useI18n();
  const toast = useToast();
  const [brief, setBrief] = useState('');
  const [tone, setTone] = useState<Tone>('warm');
  const [lang, setLang] = useState<Lang>('en');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<AssistResult>();

  const generate = async () => {
    if (brief.trim().length < 3) {
      toast(t('assistant.error.brief'), 'error');
      return;
    }
    setBusy(true);
    try {
      setResult(await api.post<AssistResult>('/api/creatives/assist', { advertiserId, brief, tone }));
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card
      className="assistant"
      title={
        <span className="row">
          {t('assistant.page.title')}
          <Badge tone="accent" icon="sparkle">
            GenAI
          </Badge>
        </span>
      }
      subtitle={t('assistant.page.subtitle')}
    >
      <div className="stack stack--tight">
        <label className="field">
          <span className="field__label">{t('assistant.page.brief')}</span>
          <textarea
            className="input"
            maxLength={400}
            rows={2}
            placeholder={t('assistant.page.placeholder')}
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
          />
        </label>
        <div className="row">
          <Segmented
            size="sm"
            label={t('assistant.page.tone')}
            value={tone}
            onChange={setTone}
            options={(['warm', 'premium', 'playful', 'urgent'] as const).map((v) => ({
              value: v,
              label: tx(`assistant.tone.${v}`, v),
            }))}
          />
          <span className="spacer" />
          <Button variant="primary" icon="sparkle" busy={busy} onClick={() => void generate()}>
            {t('assistant.page.generate')}
          </Button>
        </div>

        {result ? (
          <>
            <div className="row">
              <span className="muted xsmall">
                {t('assistant.page.by', {
                  provider: result.provider,
                  model: result.model,
                  ms: fmt.number(result.latencyMs),
                })}
              </span>
              {result.fallback ? <Badge tone="warning">{result.fallback}</Badge> : null}
              <span className="spacer" />
              <Segmented
                size="sm"
                label={t('shell.header.language')}
                value={lang}
                onChange={setLang}
                options={[
                  { value: 'en', label: 'EN' },
                  { value: 'ar', label: 'ع' },
                ]}
              />
            </div>
            <div className="assistant__variants">
              {result.variants.map((v, i) => {
                const failed = v.checks.filter((c) => !c.passed);
                return (
                  <article key={`${v.name}-${i}`} className="assistant__variant">
                    <div className="assistant__thumb">
                      <Creative creative={v} lang={lang} format="16:9" />
                    </div>
                    <div className="assistant__checks">
                      {failed.length === 0 ? (
                        <Status tone="good">{t('assistant.page.checksPass', { n: v.checks.length })}</Status>
                      ) : (
                        failed.map((c) => (
                          <Status key={c.name} tone="warning">
                            {c.detail}
                          </Status>
                        ))
                      )}
                    </div>
                    <p className="xsmall muted">{v.rationale}</p>
                    <Button size="sm" icon="check" onClick={() => onApply(v)}>
                      {t('assistant.page.use')}
                    </Button>
                  </article>
                );
              })}
            </div>
          </>
        ) : null}
      </div>
    </Card>
  );
}
