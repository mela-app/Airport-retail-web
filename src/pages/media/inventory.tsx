/**
 * Inventory and pricing: screen × hour for one zone, coloured by status (booked, available, premium, quiet),
 * with the predicted crowd, the share already sold and the suggested price per slot in each cell's tooltip;
 * hourly yield (average price, occupancy) and a package builder for the selected screens and hours.
 */
import { useMemo, useState } from 'react';

import { useI18n } from '../../i18n';
import type { Inventory } from '../../lib/analytics-types';
import type { Locations } from '../../lib/types';
import { useApi } from '../../lib/use-api';
import { HeatGrid, Legend } from '../../ui/charts';
import { Field, Segmented, Select } from '../../ui/controls';
import { Async, Card, Kpi } from '../../ui/display';

type Status = Inventory['screens'][number]['cells'][number]['status'];

const STATUS_CLASS = new Map<Status, string>([
  ['booked', 'inv--booked'],
  ['available', 'inv--available'],
  ['premium', 'inv--premium'],
  ['quiet', 'inv--quiet'],
]);

export function MediaInventory() {
  const { t, tx, fmt } = useI18n();
  const locations = useApi<Locations>('/api/locations');
  const [zoneId, setZoneId] = useState('T2-D');
  const [view, setView] = useState<'status' | 'price'>('status');
  const inventory = useApi<Inventory>(`/api/inventory?zoneId=${encodeURIComponent(zoneId)}`, {
    topics: ['catalog'],
  });
  const [fromHour, setFromHour] = useState(14);
  const [toHour, setToHour] = useState(18);

  const pack = useMemo(() => {
    const inv = inventory.data;
    if (!inv) return null;
    let slots = 0;
    let price = 0;
    let pax = 0;
    for (const s of inv.screens)
      for (const c of s.cells)
        if (c.hour >= fromHour && c.hour < toHour && c.status !== 'quiet') {
          const free = Math.round(inv.slotsPerHour * (1 - c.sold));
          slots += free;
          price += free * c.price;
          pax += c.pax;
        }
    return { slots, price, pax };
  }, [inventory.data, fromHour, toHour]);

  return (
    <div className="stack">
      <div className="filters">
        <Field label={t('media.inventory.zone')}>
          {(id) => (
            <Select id={id} value={zoneId} onChange={(e) => setZoneId(e.target.value)}>
              {(locations.data?.zones ?? [])
                .filter((z) => z.side === 'airside')
                .map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.name}
                  </option>
                ))}
            </Select>
          )}
        </Field>
        <Field label={t('media.inventory.show')}>
          {() => (
            <Segmented
              size="sm"
              label={t('media.inventory.show')}
              value={view}
              onChange={setView}
              options={[
                { value: 'status', label: t('media.inventory.byStatus') },
                { value: 'price', label: t('media.inventory.byPrice') },
              ]}
            />
          )}
        </Field>
      </div>

      <Async state={inventory}>
        {(inv) => {
          const hours = inv.hours.filter((h) => h >= 5);
          return (
            <>
              <div className="grid grid--kpis">
                <Kpi
                  label={t('media.kpi.occupancy')}
                  value={fmt.percent(inv.occupancy)}
                  hint={t('media.inventory.zoneHint')}
                />
                <Kpi label={t('media.inventory.screens')} value={fmt.number(inv.screens.length)} />
                <Kpi
                  label={t('media.inventory.premiumFrom')}
                  value={`${fmt.number(inv.premiumThresholdPax)} pax`}
                />
                <Kpi
                  label={t('media.inventory.slots')}
                  value={fmt.number(inv.slotsPerHour)}
                  hint={t('media.inventory.slotsHint')}
                />
              </div>
              <Card title={t('media.inventory.calendar')} subtitle={t('media.inventory.calendarHint')}>
                {view === 'status' ? (
                  <Legend
                    items={[
                      { label: t('media.inventory.booked'), color: 'var(--seq-6)' },
                      { label: t('media.inventory.available'), color: 'var(--seq-2)' },
                      { label: t('media.inventory.premium'), color: 'var(--series-4)' },
                      { label: t('media.inventory.quiet'), color: 'var(--surface-sunken)' },
                    ]}
                  />
                ) : null}
                <HeatGrid
                  label={t('media.inventory.calendar')}
                  columns={hours.map((h) => String(h).padStart(2, '0'))}
                  rowLabelWidth={190}
                  format={(v) => fmt.money(v)}
                  rows={inv.screens.map((s) => ({
                    key: s.screenId,
                    label: s.name,
                    cells: s.cells
                      .filter((c) => c.hour >= 5)
                      .map((c) => {
                        const text = `${tx(`media.inventory.${c.status}`, c.status)} · ${fmt.number(c.pax)} pax · ${fmt.percent(c.sold)} ${t('media.inventory.sold')} · ${fmt.money(c.price)}/${t('media.inventory.slot')}`;
                        return view === 'status'
                          ? {
                              value: c.sold,
                              text,
                              className: `${STATUS_CLASS.get(c.status) ?? ''}${c.premium ? ' inv--prem' : ''}`,
                            }
                          : { value: c.price, text };
                      }),
                  }))}
                />
              </Card>
            </>
          );
        }}
      </Async>

      <Card title={t('media.package.title')} subtitle={t('media.package.subtitle')}>
        <div className="row">
          <Field label={t('media.package.from')} inline>
            {(id) => (
              <Select id={id} value={String(fromHour)} onChange={(e) => setFromHour(Number(e.target.value))}>
                {Array.from({ length: 19 }, (_, i) => i + 5).map((h) => (
                  <option key={h} value={h}>{`${String(h).padStart(2, '0')}:00`}</option>
                ))}
              </Select>
            )}
          </Field>
          <Field label={t('media.package.to')} inline>
            {(id) => (
              <Select id={id} value={String(toHour)} onChange={(e) => setToHour(Number(e.target.value))}>
                {Array.from({ length: 19 }, (_, i) => i + 6).map((h) => (
                  <option key={h} value={h}>{`${String(h).padStart(2, '0')}:00`}</option>
                ))}
              </Select>
            )}
          </Field>
        </div>
        {pack ? (
          <div className="preview-stats preview-stats--4">
            <div>
              <span className="preview-stats__value">{fmt.number(pack.slots)}</span>
              <span className="muted xsmall">{t('media.package.freeSlots')}</span>
            </div>
            <div>
              <span className="preview-stats__value">{fmt.money(pack.price)}</span>
              <span className="muted xsmall">{t('media.package.listValue')}</span>
            </div>
            <div>
              <span className="preview-stats__value">{fmt.money(pack.price * 0.85)}</span>
              <span className="muted xsmall">{t('media.package.packagePrice')}</span>
            </div>
            <div>
              <span className="preview-stats__value">{fmt.compact(pack.pax)}</span>
              <span className="muted xsmall">{t('media.package.paxHours')}</span>
            </div>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
