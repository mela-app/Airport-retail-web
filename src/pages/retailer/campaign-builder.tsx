/**
 * Campaign builder: audience (segment weights), where and when, budget, triggers and the promo, with a live
 * audience-match preview against the crowd on the campaign's screens right now and a mock screen showing the
 * chosen creative.
 */
import { useEffect, useMemo, useState } from 'react';

import { Creative } from '../../creative/creative';
import { useI18n } from '../../i18n';
import { api, qs } from '../../lib/api';
import type { CampaignPreview } from '../../lib/analytics-types';
import type { Campaign, CreativeView, Locations, Outlet } from '../../lib/types';
import { useApi } from '../../lib/use-api';
import { useSimClock } from '../../lib/clock';
import { Button, Field, Segmented, Select } from '../../ui/controls';
import { Badge, Card, Empty, Loading } from '../../ui/display';
import { Icon } from '../../ui/icon';
import { useToast } from '../../ui/overlay';

export type Draft = Omit<Campaign, 'id' | 'status' | 'performanceIndex' | 'createdAt' | 'updatedAt'>;

/** A campaign as an editable draft (server-managed fields removed). */
export function toDraft(c: Campaign): Draft {
  const { id: _id, status: _status, performanceIndex: _p, createdAt: _c, updatedAt: _u, ...draft } = c;
  return draft;
}

const DIMENSIONS: readonly { id: string; segments: readonly string[] }[] = [
  { id: 'tripPurpose', segments: ['business', 'holiday', 'vfr', 'student', 'religious'] },
  { id: 'partyType', segments: ['solo', 'couple', 'family', 'group'] },
  { id: 'ageBand', segments: ['u12', 'a12_17', 'a18_24', 'a25_34', 'a35_44', 'a45_54', 'a55p'] },
  { id: 'cabin', segments: ['economy', 'premium_economy', 'business'] },
  { id: 'market', segments: ['domestic', 'international'] },
];
const DIMENSION_KEY = new Map([
  ['tripPurpose', 'dimension.trip-purpose.label'],
  ['partyType', 'dimension.party-type.label'],
  ['ageBand', 'dimension.age-band.label'],
  ['cabin', 'dimension.cabin.label'],
  ['market', 'dimension.market.label'],
]);

const DAY = 86_400_000;

function blankDraft(
  advertiserId: string,
  nowMs: number,
  zones: string[],
  outlet: Outlet | undefined,
  creativeId: string | undefined,
): Draft {
  return {
    advertiserId,
    name: '',
    objective: 'conversion',
    creativeIds: creativeId ? [creativeId] : [],
    segmentWeights: { 'tripPurpose.holiday': 1, 'partyType.family': 0.6 },
    hardFilters: {
      market: null,
      destinationRegions: [],
      destinations: [],
      minDwellMinutes: 15,
      minCrowd: null,
    },
    placement: {
      zoneIds: zones,
      screenIds: [],
      gateIds: [],
      schedule: {
        start: new Date(nowMs - (nowMs % DAY)).toISOString(),
        end: new Date(nowMs - (nowMs % DAY) + 14 * DAY).toISOString(),
        daysOfWeek: [],
        hours: null,
      },
    },
    budget: { total: 30_000, dailyCap: 2_500, cpm: 12, frequencyCapPerScreenHour: 30 },
    triggers: [],
    promo: outlet
      ? {
          offerText: '',
          codePrefix: 'SAVE10',
          validity: { mode: 'boarding_close' },
          shareable: true,
          outletId: outlet.id,
          inStock: true,
        }
      : null,
    airlinePriority: false,
    coFundedBy: null,
    competitorGroup: null,
  };
}

export function CampaignBuilder({
  advertiserId,
  initial,
  campaignId,
  onClose,
}: {
  advertiserId: string;
  initial: Draft | null;
  campaignId: string | null;
  onClose: (savedId: string | null) => void;
}) {
  const { t } = useI18n();
  const { nowMs } = useSimClock(60_000);
  const locations = useApi<Locations>('/api/locations');
  const creatives = useApi<CreativeView[]>(`/api/creatives${qs({ advertiserId })}`);
  const outlets = useApi<Outlet[]>(`/api/outlets${qs({ advertiserId })}`);
  const [draft, setDraft] = useState<Draft | null>(initial);

  // A new campaign starts in the company's own zones, with its first approved creative and outlet.
  useEffect(() => {
    if (draft || !outlets.data || !creatives.data || nowMs === undefined) return;
    const zones = [...new Set(outlets.data.map((o) => o.zoneId))];
    const creative = creatives.data.find((c) => c.status === 'approved') ?? creatives.data.at(0);
    setDraft(blankDraft(advertiserId, nowMs, zones, outlets.data.at(0), creative?.id));
  }, [draft, outlets.data, creatives.data, nowMs, advertiserId]);

  if (!draft || !locations.data || !creatives.data || !outlets.data) return <Loading />;
  return (
    <BuilderForm
      draft={draft}
      setDraft={setDraft}
      campaignId={campaignId}
      locations={locations.data}
      creatives={creatives.data}
      outlets={outlets.data}
      onClose={onClose}
      title={campaignId ? t('builder.title.edit') : t('builder.title.new')}
    />
  );
}

function BuilderForm({
  draft,
  setDraft,
  campaignId,
  locations,
  creatives,
  outlets,
  onClose,
  title,
}: {
  draft: Draft;
  setDraft: (d: Draft) => void;
  campaignId: string | null;
  locations: Locations;
  creatives: CreativeView[];
  outlets: Outlet[];
  onClose: (savedId: string | null) => void;
  title: string;
}) {
  const { t, tx } = useI18n();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const set = (patch: Partial<Draft>) => setDraft({ ...draft, ...patch });
  const weights = new Map(Object.entries(draft.segmentWeights));
  const setWeight = (segment: string, value: number) => {
    const next = new Map(weights);
    if (value <= 0) next.delete(segment);
    else next.set(segment, value);
    set({ segmentWeights: Object.fromEntries(next) });
  };
  const airside = locations.zones.filter((z) => z.side === 'airside');
  const zoneSet = new Set(draft.placement.zoneIds);
  const toggleZone = (id: string) => {
    const next = new Set(zoneSet);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    set({ placement: { ...draft.placement, zoneIds: [...next] } });
  };
  const delayTrigger = draft.triggers.find((tr) => tr.type === 'delay_over');
  const creative = creatives.find((c) => c.id === draft.creativeIds.at(0));

  const save = async (submit: boolean) => {
    if (!draft.name.trim()) {
      toast(t('builder.error.name'), 'error');
      return;
    }
    if (draft.creativeIds.length === 0) {
      toast(t('builder.error.creative'), 'error');
      return;
    }
    setBusy(true);
    try {
      const body = { ...draft, status: submit ? 'pending_review' : 'draft' };
      const saved = campaignId
        ? await api.put<Campaign>(`/api/campaigns/${campaignId}`, body)
        : await api.post<Campaign>('/api/campaigns', body);
      if (submit && saved.status === 'draft') await api.post(`/api/campaigns/${saved.id}/submit`);
      toast(submit ? t('builder.done.submitted') : t('builder.done.saved'), 'good');
      onClose(saved.id);
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
          <h1>{title}</h1>
          <p className="muted small">{t('builder.page.intro')}</p>
        </div>
        <div className="row">
          <Button onClick={() => onClose(null)}>{t('common.ui.cancel')}</Button>
          <Button busy={busy} onClick={() => void save(false)}>
            {t('builder.page.saveDraft')}
          </Button>
          <Button variant="primary" icon="check" busy={busy} onClick={() => void save(true)}>
            {t('builder.page.submit')}
          </Button>
        </div>
      </div>

      <div className="builder__layout">
        <div className="stack">
          <Card title={t('builder.section.basics')}>
            <div className="form-grid">
              <Field label={t('builder.field.name')}>
                {(id) => (
                  <input
                    id={id}
                    className="input"
                    value={draft.name}
                    maxLength={80}
                    onChange={(e) => set({ name: e.target.value })}
                  />
                )}
              </Field>
              <Field label={t('builder.field.objective')}>
                {(id) => (
                  <Select
                    id={id}
                    value={draft.objective}
                    onChange={(e) => set({ objective: e.target.value as Draft['objective'] })}
                  >
                    {(['conversion', 'footfall', 'awareness', 'goodwill'] as const).map((o) => (
                      <option key={o} value={o}>
                        {tx(`campaign.objective.${o}`, o)}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              <Field
                label={t('builder.field.creative')}
                hint={creatives.length === 0 ? t('builder.error.creative') : undefined}
              >
                {(id) => (
                  <Select
                    id={id}
                    value={draft.creativeIds.at(0) ?? ''}
                    onChange={(e) => set({ creativeIds: e.target.value ? [e.target.value] : [] })}
                  >
                    {creatives.map((c) => (
                      <option key={c.id} value={c.id}>
                        {`${c.name ?? c.id} · ${tx(`campaign.status.${c.status ?? 'draft'}`, c.status ?? '')}`}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
            </div>
          </Card>

          <Card title={t('builder.section.audience')} subtitle={t('builder.page.audienceHint')}>
            <div className="weights">
              {DIMENSIONS.map((d) => (
                <fieldset key={d.id} className="weights__group">
                  <legend>{tx(DIMENSION_KEY.get(d.id) ?? d.id)}</legend>
                  {d.segments.map((s) => {
                    const key = `${d.id}.${s}`;
                    const value = weights.get(key) ?? 0;
                    return (
                      <label key={key} className={value > 0 ? 'weight is-on' : 'weight'}>
                        <span className="weight__label">{tx(`segment.${key}`, s)}</span>
                        <input
                          type="range"
                          min={0}
                          max={1}
                          step={0.1}
                          value={value}
                          onChange={(e) => setWeight(key, Number(e.target.value))}
                          aria-valuetext={value.toFixed(1)}
                        />
                        <span className="weight__value num">{value > 0 ? value.toFixed(1) : '–'}</span>
                      </label>
                    );
                  })}
                </fieldset>
              ))}
            </div>
            <div className="form-grid">
              <Field label={t('builder.field.market')}>
                {(id) => (
                  <Select
                    id={id}
                    value={draft.hardFilters.market ?? ''}
                    onChange={(e) =>
                      set({
                        hardFilters: {
                          ...draft.hardFilters,
                          market: (e.target.value || null) as Draft['hardFilters']['market'],
                        },
                      })
                    }
                  >
                    <option value="">{t('builder.page.any')}</option>
                    <option value="international">{tx('segment.market.international')}</option>
                    <option value="domestic">{tx('segment.market.domestic')}</option>
                  </Select>
                )}
              </Field>
              <Field label={t('builder.field.minDwell')} hint={t('builder.page.minDwellHint')}>
                {(id) => (
                  <input
                    id={id}
                    className="input"
                    type="number"
                    min={0}
                    max={180}
                    value={draft.hardFilters.minDwellMinutes ?? ''}
                    onChange={(e) =>
                      set({
                        hardFilters: {
                          ...draft.hardFilters,
                          minDwellMinutes: e.target.value === '' ? null : Number(e.target.value),
                        },
                      })
                    }
                  />
                )}
              </Field>
            </div>
          </Card>

          <Card title={t('builder.section.where')}>
            <div className="chips" role="group" aria-label={t('builder.field.zones')}>
              {airside.map((z) => (
                <button
                  key={z.id}
                  type="button"
                  className={zoneSet.has(z.id) ? 'chip is-on' : 'chip'}
                  aria-pressed={zoneSet.has(z.id)}
                  onClick={() => toggleZone(z.id)}
                >
                  {zoneSet.has(z.id) ? <Icon name="check" size={13} /> : null}
                  {z.name}
                </button>
              ))}
            </div>
            <div className="form-grid">
              <Field label={t('builder.field.hours')}>
                {() => (
                  <Segmented
                    size="sm"
                    label={t('builder.field.hours')}
                    value={
                      draft.placement.schedule.hours
                        ? `${draft.placement.schedule.hours.from}-${draft.placement.schedule.hours.to}`
                        : 'all'
                    }
                    onChange={(v) =>
                      set({
                        placement: {
                          ...draft.placement,
                          schedule: {
                            ...draft.placement.schedule,
                            hours:
                              v === 'all'
                                ? null
                                : { from: Number(v.split('-')[0]), to: Number(v.split('-')[1]) },
                          },
                        },
                      })
                    }
                    options={[
                      { value: 'all', label: t('builder.hours.all') },
                      { value: '5-11', label: '05–11' },
                      { value: '11-17', label: '11–17' },
                      { value: '17-24', label: '17–24' },
                    ]}
                  />
                )}
              </Field>
              <Field label={t('builder.field.dates')}>
                {() => (
                  <span className="row">
                    <input
                      className="input input--date ltr"
                      type="date"
                      aria-label={t('builder.field.start')}
                      value={draft.placement.schedule.start.slice(0, 10)}
                      onChange={(e) =>
                        set({
                          placement: {
                            ...draft.placement,
                            schedule: {
                              ...draft.placement.schedule,
                              start: `${e.target.value}T00:00:00.000Z`,
                            },
                          },
                        })
                      }
                    />
                    <span className="muted">–</span>
                    <input
                      className="input input--date ltr"
                      type="date"
                      aria-label={t('builder.field.end')}
                      value={draft.placement.schedule.end.slice(0, 10)}
                      onChange={(e) =>
                        set({
                          placement: {
                            ...draft.placement,
                            schedule: { ...draft.placement.schedule, end: `${e.target.value}T23:59:00.000Z` },
                          },
                        })
                      }
                    />
                  </span>
                )}
              </Field>
            </div>
          </Card>

          <Card title={t('builder.section.budget')}>
            <div className="form-grid form-grid--4">
              {(
                [
                  ['total', t('builder.field.total')],
                  ['dailyCap', t('builder.field.dailyCap')],
                  ['cpm', t('builder.field.cpm')],
                  ['frequencyCapPerScreenHour', t('builder.field.frequency')],
                ] as const
              ).map(([key, label]) => (
                <Field key={key} label={label}>
                  {(id) => (
                    <input
                      id={id}
                      className="input"
                      type="number"
                      min={1}
                      value={new Map(Object.entries(draft.budget)).get(key) ?? 0}
                      onChange={(e) => set({ budget: { ...draft.budget, [key]: Number(e.target.value) } })}
                    />
                  )}
                </Field>
              ))}
            </div>
          </Card>

          <Card title={t('builder.section.triggers')} subtitle={t('builder.page.triggersHint')}>
            <label className="toggle-row">
              <input
                type="checkbox"
                checked={Boolean(delayTrigger)}
                onChange={(e) =>
                  set({
                    triggers: e.target.checked
                      ? [
                          ...draft.triggers,
                          {
                            type: 'delay_over',
                            minutes: 30,
                            airlineIata: null,
                            destinations: [],
                            boost: 1.5,
                          },
                        ]
                      : draft.triggers.filter((tr) => tr.type !== 'delay_over'),
                  })
                }
              />
              <span>{t('builder.trigger.delay')}</span>
              {delayTrigger && delayTrigger.type === 'delay_over' ? (
                <span className="row">
                  <input
                    className="input input--narrow"
                    type="number"
                    min={5}
                    max={300}
                    aria-label={t('builder.trigger.minutes')}
                    value={delayTrigger.minutes}
                    onChange={(e) =>
                      set({
                        triggers: draft.triggers.map((tr) =>
                          tr.type === 'delay_over' ? { ...tr, minutes: Number(e.target.value) } : tr,
                        ),
                      })
                    }
                  />
                  <span className="muted small">{t('builder.trigger.minutesSuffix')}</span>
                  <Badge tone="accent">{`×${delayTrigger.boost}`}</Badge>
                </span>
              ) : null}
            </label>
            {(['gate_change', 'boarding_starts', 'festival_day'] as const).map((type) => {
              const on = draft.triggers.some((tr) => tr.type === type);
              return (
                <label key={type} className="toggle-row">
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={(e) =>
                      set({
                        triggers: e.target.checked
                          ? [...draft.triggers, { type, boost: 1.3 }]
                          : draft.triggers.filter((tr) => tr.type !== type),
                      })
                    }
                  />
                  <span>{tx(`builder.trigger.${type}`, type)}</span>
                </label>
              );
            })}
          </Card>

          <Card title={t('builder.section.promo')}>
            <label className="toggle-row">
              <input
                type="checkbox"
                checked={draft.promo !== null}
                onChange={(e) =>
                  set({
                    promo: e.target.checked
                      ? {
                          offerText: '',
                          codePrefix: 'SAVE10',
                          validity: { mode: 'boarding_close' },
                          shareable: true,
                          outletId: outlets.at(0)?.id ?? null,
                          inStock: true,
                        }
                      : null,
                  })
                }
              />
              <span>{t('builder.promo.enable')}</span>
            </label>
            {draft.promo ? (
              <div className="form-grid">
                <Field label={t('builder.promo.offer')}>
                  {(id) => (
                    <input
                      id={id}
                      className="input"
                      maxLength={80}
                      value={draft.promo?.offerText ?? ''}
                      onChange={(e) =>
                        draft.promo && set({ promo: { ...draft.promo, offerText: e.target.value } })
                      }
                    />
                  )}
                </Field>
                <Field label={t('builder.promo.prefix')} hint={t('builder.promo.prefixHint')}>
                  {(id) => (
                    <input
                      id={id}
                      className="input ltr"
                      maxLength={8}
                      value={draft.promo?.codePrefix ?? ''}
                      onChange={(e) =>
                        draft.promo &&
                        set({
                          promo: {
                            ...draft.promo,
                            codePrefix: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''),
                          },
                        })
                      }
                    />
                  )}
                </Field>
                <Field label={t('builder.promo.outlet')}>
                  {(id) => (
                    <Select
                      id={id}
                      value={draft.promo?.outletId ?? ''}
                      onChange={(e) =>
                        draft.promo && set({ promo: { ...draft.promo, outletId: e.target.value || null } })
                      }
                    >
                      {outlets.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.name}
                        </option>
                      ))}
                    </Select>
                  )}
                </Field>
                <Field label={t('builder.promo.validity')}>
                  {(id) => (
                    <Select
                      id={id}
                      value={draft.promo?.validity.mode ?? 'boarding_close'}
                      onChange={(e) =>
                        draft.promo &&
                        set({
                          promo: {
                            ...draft.promo,
                            validity:
                              e.target.value === 'minutes'
                                ? { mode: 'minutes', minutes: 60 }
                                : { mode: 'boarding_close' },
                          },
                        })
                      }
                    >
                      <option value="boarding_close">{t('builder.promo.untilGateClose')}</option>
                      <option value="minutes">{t('builder.promo.sixtyMinutes')}</option>
                    </Select>
                  )}
                </Field>
                <label className="toggle-row">
                  <input
                    type="checkbox"
                    checked={draft.promo.shareable}
                    onChange={(e) =>
                      draft.promo && set({ promo: { ...draft.promo, shareable: e.target.checked } })
                    }
                  />
                  <span>{t('builder.promo.shareable')}</span>
                </label>
              </div>
            ) : null}
          </Card>
        </div>

        <aside className="builder__aside">
          <LivePreview draft={draft} />
          <Card title={t('builder.mock.title')} subtitle={creative?.name}>
            {creative ? (
              <div className="mock-screen">
                <Creative creative={creative} lang="en" format="16:9" />
              </div>
            ) : (
              <Empty icon="monitor" title={t('builder.error.creative')} />
            )}
          </Card>
        </aside>
      </div>
    </div>
  );
}

/** Live audience match of the draft against the crowd on its screens now (debounced). */
function LivePreview({ draft }: { draft: Draft }) {
  const { t, tx, fmt } = useI18n();
  const [preview, setPreview] = useState<CampaignPreview>();
  const [error, setError] = useState<string>();
  const [version, setVersion] = useState(0);
  const body = useMemo(() => JSON.stringify(draft), [draft]);

  useEffect(() => {
    let cancelled = false;
    const id = setTimeout(() => {
      api
        .post<CampaignPreview>('/api/campaigns/preview', JSON.parse(body) as unknown)
        .then((p) => {
          if (!cancelled) {
            setPreview(p);
            setError(undefined);
          }
        })
        .catch((e: unknown) => {
          if (!cancelled) setError(e instanceof Error ? e.message : String(e));
        });
    }, 450);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [body, version]);

  return (
    <Card
      title={t('builder.preview.title')}
      subtitle={preview ? t('builder.preview.at', { time: fmt.time(preview.at) }) : undefined}
      actions={
        <Button size="sm" variant="ghost" icon="refresh" onClick={() => setVersion((v) => v + 1)}>
          {t('common.ui.retry')}
        </Button>
      }
    >
      {error ? (
        <p className="small" role="alert">
          {error}
        </p>
      ) : !preview ? (
        <Loading />
      ) : (
        <div className="stack stack--tight">
          <div className="preview-stats">
            <div>
              <span className="preview-stats__value">
                {preview.averageMatch === null ? '–' : fmt.percent(preview.averageMatch)}
              </span>
              <span className="muted xsmall">{t('builder.preview.match')}</span>
            </div>
            <div>
              <span className="preview-stats__value">{`${preview.screensPlayable}/${preview.screensPlaced}`}</span>
              <span className="muted xsmall">{t('builder.preview.screens')}</span>
            </div>
            <div>
              <span className="preview-stats__value">{fmt.compact(preview.estimatedViewersPerHour)}</span>
              <span className="muted xsmall">{t('builder.preview.viewers')}</span>
            </div>
            <div>
              <span className="preview-stats__value">{fmt.money(preview.estimatedCostPerHour)}</span>
              <span className="muted xsmall">{t('builder.preview.cost')}</span>
            </div>
          </div>
          {preview.audience ? (
            <p className="small secondary">
              {t('builder.preview.audience', {
                list: [...preview.audience.tripPurpose.slice(0, 2), ...preview.audience.partyType.slice(0, 1)]
                  .map((s) => `${tx(`segment.${s.segment}`)} ${fmt.percent(s.share)}`)
                  .join(', '),
              })}
            </p>
          ) : null}
          {preview.filtered.length > 0 ? (
            <div className="row">
              {preview.filtered.slice(0, 4).map((f) => (
                <Badge key={f.rule} tone="warning">
                  {t('builder.preview.filtered', {
                    rule: tx(`decision.rule.${f.rule}`, f.rule),
                    n: f.screens,
                  })}
                </Badge>
              ))}
            </div>
          ) : null}
          {preview.best.length > 0 ? (
            <div>
              <span className="why__label">{t('builder.preview.best')}</span>
              <ul className="feed">
                {preview.best.map((b) => (
                  <li key={b.screenId}>
                    <span className="feed__main">
                      <strong>{b.name}</strong>
                      <span className="muted xsmall">{`${b.zoneId} · ${fmt.number(b.pax)} pax`}</span>
                    </span>
                    <span className="num">{b.score.toFixed(2)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="muted small">{t('builder.preview.none', { floor: preview.minScoreToPlay })}</p>
          )}
        </div>
      )}
    </Card>
  );
}
