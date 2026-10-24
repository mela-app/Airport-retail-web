/**
 * Master data: vendors (advertisers), airlines, outlets, locations (terminals, zones, gates) and screens.
 * Every change goes through the API's validation and takes effect in the next decision slot.
 */
import { useState } from 'react';

import { useI18n } from '../../i18n';
import { api } from '../../lib/api';
import type { Advertiser, Locations, Outlet, ScreenView } from '../../lib/types';
import { useApi } from '../../lib/use-api';
import { Segmented } from '../../ui/controls';
import { Async, Status } from '../../ui/display';
import { EntityEditor, type FieldValue, bool, num, str } from './entity-editor';

type Tab = 'vendors' | 'airlines' | 'outlets' | 'zones' | 'gates' | 'screens';

interface Airline {
  iata: string;
  icao: string;
  name: string;
  model: 'low_cost' | 'full_service';
  market: 'domestic' | 'international' | 'mixed';
  brandColor: string;
  active?: boolean;
}

const KINDS = ['retailer', 'fnb', 'airline', 'brand', 'service'];
const OUTLET_CATEGORIES = [
  'duty_free',
  'perfume_cosmetics',
  'fashion',
  'electronics',
  'toys',
  'books',
  'fnb_coffee',
  'fnb_dining',
  'fnb_sweets',
  'pharmacy',
  'services',
];
const SCREEN_KINDS = ['gate_display', 'totem', 'video_wall', 'fids_ad_panel'];
const ZONE_KINDS = [
  'landside_hall',
  'security',
  'passport_control',
  'airside_plaza',
  'pier',
  'bus_lounge',
  'arrivals_hall',
];

export function AdminMasterData() {
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>('vendors');
  return (
    <div className="stack">
      <Segmented
        label={t('page.admin.master-data')}
        value={tab}
        onChange={setTab}
        options={[
          { value: 'vendors', label: t('admin.data.vendors') },
          { value: 'airlines', label: t('admin.data.airlines') },
          { value: 'outlets', label: t('admin.data.outlets') },
          { value: 'zones', label: t('admin.data.zones') },
          { value: 'gates', label: t('admin.data.gates') },
          { value: 'screens', label: t('admin.data.screens') },
        ]}
      />
      {tab === 'vendors' ? <Vendors /> : null}
      {tab === 'airlines' ? <Airlines /> : null}
      {tab === 'outlets' ? <Outlets /> : null}
      {tab === 'zones' ? <Zones /> : null}
      {tab === 'gates' ? <Gates /> : null}
      {tab === 'screens' ? <Screens /> : null}
    </div>
  );
}

const opts = (values: readonly string[], label: (v: string) => string = (v) => v) =>
  values.map((v) => ({ value: v, label: label(v) }));

function Vendors() {
  const { t } = useI18n();
  const list = useApi<
    (Advertiser & {
      active?: boolean;
      contactName: string;
      contactEmail: string;
      competitorGroup: string | null;
    })[]
  >('/api/advertisers', { topics: ['catalog'] });
  return (
    <Async state={list}>
      {(rows) => (
        <EntityEditor
          title={t('admin.data.vendors')}
          subtitle={t('admin.data.vendorsHint')}
          rows={rows}
          rowKey={(r) => r.id}
          inactive={(r) => r.active === false}
          columns={[
            {
              key: 'name',
              header: t('admin.data.name'),
              cell: (r) => (
                <span className="row">
                  <span className="persona__swatch" style={{ background: r.brandColor }} aria-hidden="true" />
                  {r.name}
                </span>
              ),
            },
            { key: 'kind', header: t('admin.data.kind'), cell: (r) => r.kind },
            { key: 'category', header: t('admin.data.category'), cell: (r) => r.category },
            {
              key: 'contact',
              header: t('admin.data.contact'),
              cell: (r) => <span className="xsmall">{r.contactEmail}</span>,
            },
          ]}
          fields={[
            { key: 'name', label: t('admin.data.name'), type: 'text', required: true },
            { key: 'kind', label: t('admin.data.kind'), type: 'select', options: opts(KINDS) },
            { key: 'category', label: t('admin.data.category'), type: 'text', required: true },
            {
              key: 'competitorGroup',
              label: t('admin.data.competitorGroup'),
              type: 'text',
              hint: t('admin.data.competitorHint'),
            },
            {
              key: 'airlineIata',
              label: t('admin.data.airlineIata'),
              type: 'text',
              hint: t('admin.data.airlineIataHint'),
            },
            { key: 'contactName', label: t('admin.data.contactName'), type: 'text', required: true },
            { key: 'contactEmail', label: t('admin.data.contactEmail'), type: 'text', required: true },
            { key: 'brandColor', label: t('admin.data.brandColor'), type: 'color' },
          ]}
          blank={() =>
            new Map<string, FieldValue>([
              ['kind', 'retailer'],
              ['brandColor', '#2A78D6'],
            ])
          }
          toValues={(r) =>
            new Map<string, FieldValue>([
              ['name', r.name],
              ['kind', r.kind],
              ['category', r.category],
              ['competitorGroup', r.competitorGroup ?? ''],
              ['airlineIata', r.airlineIata ?? ''],
              ['contactName', r.contactName],
              ['contactEmail', r.contactEmail],
              ['brandColor', r.brandColor],
            ])
          }
          onSave={async (v, row) => {
            const body = {
              name: str(v, 'name'),
              kind: str(v, 'kind'),
              category: str(v, 'category'),
              competitorGroup: str(v, 'competitorGroup') || null,
              airlineIata: str(v, 'airlineIata').toUpperCase() || null,
              contactName: str(v, 'contactName'),
              contactEmail: str(v, 'contactEmail'),
              brandColor: str(v, 'brandColor') || '#2A78D6',
            };
            if (row) await api.put(`/api/advertisers/${row.id}`, body);
            else await api.post('/api/advertisers', body);
            list.reload();
          }}
          onDeactivate={async (row) => {
            await api.delete(`/api/advertisers/${row.id}`);
            list.reload();
          }}
        />
      )}
    </Async>
  );
}

function Airlines() {
  const { t } = useI18n();
  const list = useApi<Airline[]>('/api/airlines', { topics: ['catalog'] });
  return (
    <Async state={list}>
      {(rows) => (
        <EntityEditor
          title={t('admin.data.airlines')}
          rows={rows}
          rowKey={(r) => r.iata}
          inactive={(r) => r.active === false}
          columns={[
            { key: 'iata', header: 'IATA', cell: (r) => <strong className="ltr">{r.iata}</strong> },
            { key: 'name', header: t('admin.data.name'), cell: (r) => r.name },
            { key: 'model', header: t('admin.data.model'), cell: (r) => r.model },
            { key: 'market', header: t('admin.data.market'), cell: (r) => r.market },
          ]}
          fields={[
            { key: 'iata', label: 'IATA', type: 'text', createOnly: true, required: true },
            { key: 'icao', label: 'ICAO', type: 'text', required: true },
            { key: 'name', label: t('admin.data.name'), type: 'text', required: true },
            {
              key: 'model',
              label: t('admin.data.model'),
              type: 'select',
              options: opts(['full_service', 'low_cost']),
            },
            {
              key: 'market',
              label: t('admin.data.market'),
              type: 'select',
              options: opts(['mixed', 'international', 'domestic']),
            },
            { key: 'brandColor', label: t('admin.data.brandColor'), type: 'color' },
            { key: 'active', label: t('admin.data.active'), type: 'checkbox' },
          ]}
          blank={() =>
            new Map<string, FieldValue>([
              ['model', 'full_service'],
              ['market', 'mixed'],
              ['brandColor', '#0B6E4F'],
              ['active', true],
            ])
          }
          toValues={(r) =>
            new Map<string, FieldValue>([
              ['iata', r.iata],
              ['icao', r.icao],
              ['name', r.name],
              ['model', r.model],
              ['market', r.market],
              ['brandColor', r.brandColor],
              ['active', r.active !== false],
            ])
          }
          onSave={async (v, row) => {
            const body = {
              icao: str(v, 'icao').toUpperCase(),
              name: str(v, 'name'),
              model: str(v, 'model'),
              market: str(v, 'market'),
              brandColor: str(v, 'brandColor'),
            };
            if (row) await api.put(`/api/airlines/${row.iata}`, { ...body, active: bool(v, 'active') });
            else await api.post('/api/airlines', { ...body, iata: str(v, 'iata').toUpperCase() });
            list.reload();
          }}
        />
      )}
    </Async>
  );
}

function Outlets() {
  const { t } = useI18n();
  const list = useApi<(Outlet & { active?: boolean })[]>('/api/outlets', { topics: ['catalog'] });
  const advertisers = useApi<Advertiser[]>('/api/advertisers');
  const locations = useApi<Locations>('/api/locations');
  const names = new Map((advertisers.data ?? []).map((a) => [a.id, a.name]));
  return (
    <Async state={list}>
      {(rows) => (
        <EntityEditor
          title={t('admin.data.outlets')}
          rows={rows}
          rowKey={(r) => r.id}
          inactive={(r) => r.active === false}
          columns={[
            { key: 'name', header: t('admin.data.name'), cell: (r) => r.name },
            {
              key: 'vendor',
              header: t('admin.data.vendor'),
              cell: (r) => names.get(r.advertiserId) ?? r.advertiserId,
            },
            { key: 'zone', header: t('admin.data.zone'), cell: (r) => r.zoneId },
            { key: 'basket', header: t('admin.data.basket'), align: 'end', cell: (r) => r.averageBasket },
          ]}
          fields={[
            { key: 'name', label: t('admin.data.name'), type: 'text', required: true },
            {
              key: 'advertiserId',
              label: t('admin.data.vendor'),
              type: 'select',
              options: (advertisers.data ?? []).map((a) => ({ value: a.id, label: a.name })),
            },
            {
              key: 'category',
              label: t('admin.data.category'),
              type: 'select',
              options: opts(OUTLET_CATEGORIES),
            },
            {
              key: 'zoneId',
              label: t('admin.data.zone'),
              type: 'select',
              options: (locations.data?.zones ?? []).map((z) => ({ value: z.id, label: z.name })),
            },
            {
              key: 'averageBasket',
              label: t('admin.data.basket'),
              type: 'number',
              min: 1,
              max: 5000,
              step: 1,
            },
          ]}
          blank={() =>
            new Map<string, FieldValue>([
              ['advertiserId', advertisers.data?.at(0)?.id ?? ''],
              ['category', 'duty_free'],
              ['zoneId', 'T2-PLZ'],
              ['averageBasket', 25],
            ])
          }
          toValues={(r) =>
            new Map<string, FieldValue>([
              ['name', r.name],
              ['advertiserId', r.advertiserId],
              ['category', r.category],
              ['zoneId', r.zoneId],
              ['averageBasket', r.averageBasket],
            ])
          }
          onSave={async (v, row) => {
            const body = {
              name: str(v, 'name'),
              advertiserId: str(v, 'advertiserId'),
              category: str(v, 'category'),
              zoneId: str(v, 'zoneId'),
              averageBasket: num(v, 'averageBasket'),
            };
            if (row) await api.put(`/api/outlets/${row.id}`, body);
            else await api.post('/api/outlets', body);
            list.reload();
          }}
          onDeactivate={async (row) => {
            await api.delete(`/api/outlets/${row.id}`);
            list.reload();
          }}
        />
      )}
    </Async>
  );
}

function Zones() {
  const { t } = useI18n();
  const locations = useApi<Locations>('/api/locations', { topics: ['catalog'] });
  type ZoneRow = Locations['zones'][number];
  return (
    <Async state={locations}>
      {(l) => (
        <EntityEditor<ZoneRow>
          title={t('admin.data.zones')}
          subtitle={t('admin.data.zonesHint')}
          rows={l.zones}
          rowKey={(r) => r.id}
          columns={[
            { key: 'id', header: 'ID', cell: (r) => <span className="ltr">{r.id}</span> },
            { key: 'name', header: t('admin.data.name'), cell: (r) => r.name },
            { key: 'kind', header: t('admin.data.kind'), cell: (r) => r.kind },
            { key: 'side', header: t('admin.data.side'), cell: (r) => r.side },
          ]}
          fields={[
            { key: 'id', label: 'ID', type: 'text', createOnly: true, required: true, hint: 'T2-G' },
            {
              key: 'terminalId',
              label: t('admin.data.terminal'),
              type: 'select',
              createOnly: true,
              options: l.terminals.map((tm) => ({ value: tm.id, label: tm.name })),
            },
            { key: 'name', label: t('admin.data.name'), type: 'text', required: true },
            { key: 'kind', label: t('admin.data.kind'), type: 'select', options: opts(ZONE_KINDS) },
            {
              key: 'side',
              label: t('admin.data.side'),
              type: 'select',
              options: opts(['airside', 'landside']),
            },
            { key: 'x', label: 'x (m)', type: 'number', min: 0, max: 1600 },
            { key: 'y', label: 'y (m)', type: 'number', min: 0, max: 900 },
            { key: 'width', label: t('admin.data.width'), type: 'number', min: 10, max: 1600 },
            { key: 'height', label: t('admin.data.height'), type: 'number', min: 10, max: 900 },
          ]}
          blank={() =>
            new Map<string, FieldValue>([
              ['terminalId', 'T2'],
              ['kind', 'pier'],
              ['side', 'airside'],
              ['x', 1200],
              ['y', 100],
              ['width', 150],
              ['height', 300],
            ])
          }
          toValues={(r) =>
            new Map<string, FieldValue>([
              ['id', r.id],
              ['terminalId', r.terminalId],
              ['name', r.name],
              ['kind', r.kind],
              ['side', r.side],
              ['x', r.area.x],
              ['y', r.area.y],
              ['width', r.area.width],
              ['height', r.area.height],
            ])
          }
          onSave={async (v, row) => {
            const body = {
              name: str(v, 'name'),
              kind: str(v, 'kind'),
              side: str(v, 'side'),
              concourseId: null,
              area: { x: num(v, 'x'), y: num(v, 'y'), width: num(v, 'width'), height: num(v, 'height') },
            };
            if (row) await api.put(`/api/zones/${row.id}`, body);
            else
              await api.post('/api/zones', { ...body, id: str(v, 'id'), terminalId: str(v, 'terminalId') });
            locations.reload();
          }}
        />
      )}
    </Async>
  );
}

function Gates() {
  const { t } = useI18n();
  const locations = useApi<Locations>('/api/locations', { topics: ['catalog'] });
  type GateRow = Locations['gates'][number];
  return (
    <Async state={locations}>
      {(l) => (
        <EntityEditor<GateRow>
          title={t('admin.data.gates')}
          subtitle={t('admin.data.gatesHint')}
          rows={l.gates}
          rowKey={(r) => r.id}
          inactive={(r) => r.active === false}
          columns={[
            { key: 'id', header: 'ID', cell: (r) => <strong className="ltr">{r.id}</strong> },
            { key: 'zone', header: t('admin.data.zone'), cell: (r) => r.zoneId },
            {
              key: 'remote',
              header: t('admin.data.remote'),
              cell: (r) => (r.remote ? t('admin.data.yes') : '–'),
            },
            {
              key: 'state',
              header: t('common.table.status'),
              cell: (r) => (
                <Status tone={r.active === false ? 'warning' : 'good'}>
                  {r.active === false ? t('admin.data.outOfService') : t('admin.data.inService')}
                </Status>
              ),
            },
          ]}
          fields={[
            { key: 'code', label: t('admin.data.code'), type: 'text', createOnly: true, required: true },
            {
              key: 'terminalId',
              label: t('admin.data.terminal'),
              type: 'select',
              createOnly: true,
              options: l.terminals.map((tm) => ({ value: tm.id, label: tm.name })),
            },
            {
              key: 'zoneId',
              label: t('admin.data.zone'),
              type: 'select',
              options: l.zones.map((z) => ({ value: z.id, label: z.name })),
            },
            { key: 'x', label: 'x (m)', type: 'number', min: 0, max: 1600 },
            { key: 'y', label: 'y (m)', type: 'number', min: 0, max: 900 },
            { key: 'remote', label: t('admin.data.remote'), type: 'checkbox' },
            { key: 'active', label: t('admin.data.inService'), type: 'checkbox' },
          ]}
          blank={() =>
            new Map<string, FieldValue>([
              ['terminalId', 'T2'],
              ['zoneId', 'T2-D'],
              ['x', 900],
              ['y', 200],
              ['remote', false],
              ['active', true],
            ])
          }
          toValues={(r) =>
            new Map<string, FieldValue>([
              ['code', r.code],
              ['terminalId', r.terminalId],
              ['zoneId', r.zoneId],
              ['x', r.position.x],
              ['y', r.position.y],
              ['remote', r.remote],
              ['active', r.active !== false],
            ])
          }
          onSave={async (v, row) => {
            const common = {
              zoneId: str(v, 'zoneId'),
              remote: bool(v, 'remote'),
              position: { x: num(v, 'x'), y: num(v, 'y') },
              active: bool(v, 'active'),
            };
            if (row) await api.put(`/api/gates/${row.id}`, common);
            else
              await api.post('/api/gates', {
                ...common,
                code: str(v, 'code').toUpperCase(),
                terminalId: str(v, 'terminalId'),
              });
            locations.reload();
          }}
        />
      )}
    </Async>
  );
}

function Screens() {
  const { t } = useI18n();
  const list = useApi<(ScreenView & { sizeInches: number; resolution: string })[]>('/api/screens', {
    topics: ['catalog'],
  });
  const locations = useApi<Locations>('/api/locations');
  return (
    <Async state={list}>
      {(rows) => (
        <EntityEditor
          title={t('admin.data.screens')}
          subtitle={t('admin.data.screensHint')}
          rows={[...rows].sort((a, b) => a.id.localeCompare(b.id))}
          rowKey={(r) => r.id}
          columns={[
            { key: 'id', header: 'ID', cell: (r) => <span className="ltr xsmall">{r.id}</span> },
            { key: 'name', header: t('admin.data.name'), cell: (r) => r.name },
            { key: 'kind', header: t('admin.data.kind'), cell: (r) => r.kind },
            { key: 'zone', header: t('admin.data.zone'), cell: (r) => r.zoneId },
            { key: 'price', header: t('admin.data.price'), align: 'end', cell: (r) => r.basePricePerSlot },
          ]}
          fields={[
            { key: 'name', label: t('admin.data.name'), type: 'text', required: true },
            {
              key: 'zoneId',
              label: t('admin.data.zone'),
              type: 'select',
              options: (locations.data?.zones ?? []).map((z) => ({ value: z.id, label: z.name })),
            },
            { key: 'kind', label: t('admin.data.kind'), type: 'select', options: opts(SCREEN_KINDS) },
            {
              key: 'orientation',
              label: t('admin.data.orientation'),
              type: 'select',
              options: opts(['landscape', 'portrait']),
            },
            { key: 'sizeInches', label: t('admin.data.size'), type: 'number', min: 10, max: 300 },
            { key: 'resolution', label: t('admin.data.resolution'), type: 'text' },
            {
              key: 'basePricePerSlot',
              label: t('admin.data.price'),
              type: 'number',
              min: 0.1,
              max: 1000,
              step: 0.1,
            },
            {
              key: 'x',
              label: 'x (m)',
              type: 'number',
              min: 0,
              max: 1600,
              hint: t('admin.data.positionHint'),
            },
            { key: 'y', label: 'y (m)', type: 'number', min: 0, max: 900 },
          ]}
          blank={() =>
            new Map<string, FieldValue>([
              ['zoneId', 'T2-D'],
              ['kind', 'gate_display'],
              ['orientation', 'landscape'],
              ['sizeInches', 55],
              ['resolution', '1920x1080'],
              ['basePricePerSlot', 4],
              ['x', 880],
              ['y', 300],
            ])
          }
          toValues={(r) =>
            new Map<string, FieldValue>([
              ['name', r.name],
              ['zoneId', r.zoneId],
              ['kind', r.kind],
              ['orientation', r.orientation],
              ['sizeInches', r.sizeInches],
              ['resolution', r.resolution],
              ['basePricePerSlot', r.basePricePerSlot],
              ['x', r.position.x],
              ['y', r.position.y],
            ])
          }
          onSave={async (v, row) => {
            const body = {
              name: str(v, 'name'),
              zoneId: str(v, 'zoneId'),
              kind: str(v, 'kind'),
              orientation: str(v, 'orientation'),
              sizeInches: num(v, 'sizeInches'),
              resolution: str(v, 'resolution'),
              basePricePerSlot: num(v, 'basePricePerSlot'),
              position: { x: num(v, 'x'), y: num(v, 'y') },
            };
            if (row) await api.put(`/api/screens/${row.id}`, body);
            else await api.post('/api/screens', body);
            list.reload();
          }}
        />
      )}
    </Async>
  );
}
