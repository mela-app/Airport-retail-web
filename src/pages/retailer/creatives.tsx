/**
 * Creative library: every creative of the company with its review state, duplicate in one click, and an
 * editor (template, artwork, colours, copy in English and Arabic) with a live preview in both formats.
 * Edited creatives go back to review before they play.
 */
import { useState } from 'react';

import { Creative } from '../../creative/creative';
import { useI18n } from '../../i18n';
import { api, qs } from '../../lib/api';
import type { Lang } from '../../lib/format';
import type { CreativeView } from '../../lib/types';
import { useApi } from '../../lib/use-api';
import { Button, Field, IconButton, Segmented, Select } from '../../ui/controls';
import { Async, Card, Empty } from '../../ui/display';
import { useToast } from '../../ui/overlay';
import type { PageProps } from '../registry';
import { CreativeAssistant } from './creative-assistant';
import { CampaignStatus } from './shared';

export const TEMPLATES = ['offer_split', 'hero_full', 'gate_message', 'voucher', 'destination'] as const;
export const ARTWORKS = [
  'perfume',
  'oud',
  'coffee',
  'toys',
  'sweets',
  'headphones',
  'books',
  'fashion',
  'grill',
  'burger',
  'pharmacy',
  'lounge',
  'currency',
  'car',
  'card',
  'esim',
  'seat',
  'flatbed',
  'city',
  'voucher',
] as const;

export interface CreativeFull extends CreativeView {
  advertiserId: string;
  name: string;
  formats: ('16:9' | '9:16')[];
  status: string;
  brandSafety: {
    noRealBrandMarks: boolean;
    claimsVerified: boolean;
    ageAppropriate: boolean;
    legibleAtDistance: boolean;
  };
  content: Record<'en' | 'ar', { headline: string; body: string; cta: string; badge: string | null }>;
}

export function RetailerCreatives({ persona }: PageProps) {
  const { t, fmt } = useI18n();
  const toast = useToast();
  const advertiserId = persona?.id ?? 'adv-aurelia';
  const list = useApi<CreativeFull[]>(`/api/creatives${qs({ advertiserId })}`, { topics: ['catalog'] });
  const [editing, setEditing] = useState<CreativeFull | 'new' | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const duplicate = async (c: CreativeFull) => {
    setBusy(c.id);
    try {
      await api.post(`/api/creatives/${c.id}/duplicate`);
      toast(t('creatives.page.duplicated', { name: c.name }), 'good');
      list.reload();
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e), 'error');
    } finally {
      setBusy(null);
    }
  };

  if (editing) {
    return (
      <CreativeEditor
        advertiserId={advertiserId}
        creative={editing === 'new' ? null : editing}
        onClose={(saved) => {
          setEditing(null);
          if (saved) list.reload();
        }}
      />
    );
  }

  return (
    <div className="stack">
      <div className="page-intro">
        <div>
          <h1>{t('page.retailer.creatives')}</h1>
          <p className="muted small">{t('creatives.page.intro')}</p>
        </div>
        <Button variant="primary" icon="plus" onClick={() => setEditing('new')}>
          {t('creatives.page.new')}
        </Button>
      </div>
      <Async state={list}>
        {(items) =>
          items.length === 0 ? (
            <Card>
              <Empty icon="layers" title={t('creatives.page.none')} />
            </Card>
          ) : (
            <div className="creative-grid">
              {items.map((c) => (
                <article key={c.id} className="creative-card">
                  <div className="creative-card__thumb">
                    <Creative creative={c} lang="en" format="16:9" />
                  </div>
                  <div className="creative-card__body">
                    <div className="cell-title">
                      <strong>{c.name}</strong>
                      <span className="row">
                        <CampaignStatus status={c.status} />
                        <span className="muted xsmall">{c.formats.join(' · ')}</span>
                      </span>
                    </div>
                    <span className="row row--end">
                      <IconButton
                        size="sm"
                        icon="copy"
                        label={t('creatives.page.duplicate')}
                        busy={busy === c.id}
                        onClick={() => void duplicate(c)}
                      />
                      <IconButton
                        size="sm"
                        icon="edit"
                        label={t('creatives.page.edit')}
                        onClick={() => setEditing(c)}
                      />
                    </span>
                  </div>
                </article>
              ))}
            </div>
          )
        }
      </Async>
      <p className="muted xsmall">{t('creatives.page.count', { n: fmt.number(list.data?.length ?? 0) })}</p>
    </div>
  );
}

type EditableCreative = Omit<CreativeFull, 'id' | 'status' | 'createdAt'>;

function blankCreative(advertiserId: string): EditableCreative {
  return {
    advertiserId,
    name: '',
    template: 'offer_split',
    artwork: 'voucher',
    palette: { background: '#1B2A4A', foreground: '#FFFFFF', accent: '#F2B134' },
    content: {
      en: { headline: '', body: '', cta: 'Scan for the offer', badge: null },
      ar: { headline: '', body: '', cta: 'امسح للحصول على العرض', badge: null },
    },
    formats: ['16:9', '9:16'],
    brandSafety: {
      noRealBrandMarks: true,
      claimsVerified: false,
      ageAppropriate: true,
      legibleAtDistance: false,
    },
  };
}

function CreativeEditor({
  advertiserId,
  creative,
  onClose,
}: {
  advertiserId: string;
  creative: CreativeFull | null;
  onClose: (saved: boolean) => void;
}) {
  const { t, tx } = useI18n();
  const toast = useToast();
  const [draft, setDraft] = useState<EditableCreative>(() => {
    if (!creative) return blankCreative(advertiserId);
    const { id: _id, status: _s, ...rest } = creative;
    const { createdAt: _c, ...editable } = rest as typeof rest & { createdAt?: string };
    return {
      ...editable,
      content: {
        en: creative.content.en,
        ar: creative.content.ar ?? { headline: '', body: '', cta: '', badge: null },
      },
    };
  });
  const [lang, setLang] = useState<Lang>('en');
  const [format, setFormat] = useState<'16:9' | '9:16'>('16:9');
  const [busy, setBusy] = useState(false);
  const copy = lang === 'ar' ? draft.content.ar : draft.content.en;
  const setCopy = (patch: Partial<EditableCreative['content']['en']>) =>
    setDraft({ ...draft, content: { ...draft.content, [lang]: { ...copy, ...patch } } });

  const save = async () => {
    if (!draft.name.trim() || !draft.content.en.headline.trim()) {
      toast(t('creatives.error.required'), 'error');
      return;
    }
    setBusy(true);
    try {
      const body = {
        ...draft,
        content: draft.content.ar.headline ? draft.content : { en: draft.content.en },
      };
      if (creative) await api.put(`/api/creatives/${creative.id}`, body);
      else await api.post('/api/creatives', body);
      toast(t('creatives.page.saved'), 'good');
      onClose(true);
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="builder">
      <div className="page-intro">
        <div>
          <h1>{creative ? t('creatives.page.editTitle') : t('creatives.page.newTitle')}</h1>
          <p className="muted small">{t('creatives.page.reviewNote')}</p>
        </div>
        <div className="row">
          <Button onClick={() => onClose(false)}>{t('common.ui.cancel')}</Button>
          <Button variant="primary" icon="check" busy={busy} onClick={() => void save()}>
            {t('creatives.page.submit')}
          </Button>
        </div>
      </div>
      <div className="builder__layout">
        <div className="stack">
          <CreativeAssistant
            advertiserId={advertiserId}
            onApply={(result) =>
              setDraft({
                ...draft,
                name: draft.name || result.name,
                template: result.template,
                artwork: result.artwork,
                palette: result.palette,
                content: result.content,
              })
            }
          />
          <Card title={t('creatives.section.design')}>
            <div className="form-grid">
              <Field label={t('creatives.field.name')}>
                {(id) => (
                  <input
                    id={id}
                    className="input"
                    maxLength={80}
                    value={draft.name}
                    onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  />
                )}
              </Field>
              <Field label={t('creatives.field.template')}>
                {(id) => (
                  <Select
                    id={id}
                    value={draft.template}
                    onChange={(e) =>
                      setDraft({ ...draft, template: e.target.value as EditableCreative['template'] })
                    }
                  >
                    {TEMPLATES.map((tpl) => (
                      <option key={tpl} value={tpl}>
                        {tx(`creative.template.${tpl}`, tpl)}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              <Field label={t('creatives.field.artwork')}>
                {(id) => (
                  <Select
                    id={id}
                    value={draft.artwork}
                    onChange={(e) => setDraft({ ...draft, artwork: e.target.value })}
                  >
                    {ARTWORKS.map((a) => (
                      <option key={a} value={a}>
                        {tx(`creative.artwork.${a}`, a)}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              <div className="field">
                <span className="field__label">{t('creatives.field.colours')}</span>
                <span className="row">
                  {(['background', 'foreground', 'accent'] as const).map((k) => (
                    <label key={k} className="swatch-input" title={tx(`creatives.colour.${k}`, k)}>
                      <input
                        type="color"
                        value={new Map(Object.entries(draft.palette)).get(k) ?? '#000000'}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            palette: { ...draft.palette, [k]: e.target.value.toUpperCase() },
                          })
                        }
                        aria-label={tx(`creatives.colour.${k}`, k)}
                      />
                    </label>
                  ))}
                </span>
              </div>
            </div>
          </Card>
          <Card
            title={t('creatives.section.copy')}
            actions={
              <Segmented
                size="sm"
                label={t('shell.header.language')}
                value={lang}
                onChange={setLang}
                options={[
                  { value: 'en', label: 'English' },
                  { value: 'ar', label: 'العربية' },
                ]}
              />
            }
          >
            <div className="form-grid" dir={lang === 'ar' ? 'rtl' : 'ltr'} lang={lang}>
              <Field label={t('creatives.field.headline')} hint={`${copy.headline.length}/80`}>
                {(id) => (
                  <input
                    id={id}
                    className="input"
                    maxLength={80}
                    value={copy.headline}
                    onChange={(e) => setCopy({ headline: e.target.value })}
                  />
                )}
              </Field>
              <Field label={t('creatives.field.badge')}>
                {(id) => (
                  <input
                    id={id}
                    className="input"
                    maxLength={24}
                    value={copy.badge ?? ''}
                    onChange={(e) => setCopy({ badge: e.target.value || null })}
                  />
                )}
              </Field>
              <Field label={t('creatives.field.body')} hint={`${copy.body.length}/240`}>
                {(id) => (
                  <textarea
                    id={id}
                    className="input"
                    maxLength={240}
                    value={copy.body}
                    onChange={(e) => setCopy({ body: e.target.value })}
                  />
                )}
              </Field>
              <Field label={t('creatives.field.cta')}>
                {(id) => (
                  <input
                    id={id}
                    className="input"
                    maxLength={40}
                    value={copy.cta}
                    onChange={(e) => setCopy({ cta: e.target.value })}
                  />
                )}
              </Field>
            </div>
          </Card>
        </div>
        <aside className="builder__aside">
          <Card
            title={t('creatives.page.preview')}
            actions={
              <Segmented
                size="sm"
                label={t('player.screen.format')}
                value={format}
                onChange={setFormat}
                options={[
                  { value: '16:9', label: '16:9' },
                  { value: '9:16', label: '9:16' },
                ]}
              />
            }
          >
            <div className={format === '9:16' ? 'mock-screen mock-screen--portrait' : 'mock-screen'}>
              <Creative creative={draft} lang={lang} format={format} />
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}
