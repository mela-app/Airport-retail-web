/**
 * Admin control room: network KPIs, the live network map, incidents (raised automatically: screen offline for
 * 5 minutes, feed lag, failed creative), feed health and engine performance.
 */
import { useState } from 'react';

import { useI18n } from '../../i18n';
import { api } from '../../lib/api';
import { useApi } from '../../lib/use-api';
import { Button, Segmented } from '../../ui/controls';
import { Async, Card, Kpi, Status, type Tone } from '../../ui/display';
import { useToast } from '../../ui/overlay';
import { Table } from '../../ui/table';
import { NetworkMap } from './network-map';

interface NetworkKpis {
  screens: { total: number; online: number; degraded: number; onlinePct: number };
  playsToday: number;
  impressionsToday: number;
  mediaRevenueToday: number;
  scansToday: number;
  redemptionsToday: number;
  attributedSalesToday: number;
  activeCampaigns: number;
  averageScreenLatencyMs: number | null;
  modelVersion: string;
  playlistBuild: {
    slots: number;
    lastMs: number | null;
    p50Ms: number | null;
    p95Ms: number | null;
    skippedSlots: number;
  };
}

interface Incident {
  id: string;
  kind: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  subject: string;
  owner: string | null;
  status: 'open' | 'acknowledged' | 'resolved';
  raisedAt: string;
  resolvedAt: string | null;
}

interface Feeds {
  adapters: Record<string, string>;
  feeds: {
    feed: string;
    adapter: string;
    status: string;
    messagesTotal: number;
    rejectedTotal: number;
    messagesPerMinute: number;
    lastMessageAt: string | null;
    lastError: string | null;
  }[];
}

const SEVERITY = new Map<string, Tone>([
  ['critical', 'critical'],
  ['high', 'serious'],
  ['medium', 'warning'],
  ['low', 'neutral'],
]);
const OWNERS = ['Screen Operations', 'Integration Support', 'Content Team'];

export function AdminControlRoom() {
  const { t, fmt } = useI18n();
  const kpis = useApi<NetworkKpis>('/api/kpis/network', { topics: ['delivery', 'screen'], debounceMs: 900 });

  return (
    <div className="stack">
      <Async state={kpis}>
        {(k) => (
          <section className="grid grid--kpis" aria-label={t('page.admin.overview')}>
            <Kpi
              live
              icon="monitor"
              label={t('admin.kpi.online')}
              value={fmt.percent(k.screens.onlinePct / 100, 1)}
              hint={t('admin.kpi.onlineHint', { online: k.screens.online, total: k.screens.total })}
            />
            <Kpi live icon="chart" label={t('kpi.plays.label')} value={fmt.number(k.playsToday)} />
            <Kpi
              live
              icon="users"
              label={t('kpi.impressions.label')}
              value={fmt.compact(k.impressionsToday)}
            />
            <Kpi live icon="tag" label={t('admin.kpi.revenue')} value={fmt.money(k.mediaRevenueToday)} />
            <Kpi icon="megaphone" label={t('media.kpi.active')} value={fmt.number(k.activeCampaigns)} />
            <Kpi
              icon="clock"
              label={t('admin.kpi.latency')}
              value={k.averageScreenLatencyMs === null ? '–' : `${fmt.number(k.averageScreenLatencyMs)} ms`}
            />
          </section>
        )}
      </Async>

      <Card title={t('admin.map.title')} subtitle={t('admin.map.subtitle')}>
        <NetworkMap />
      </Card>

      <div className="grid grid--2-1">
        <Incidents />
        <div className="stack">
          <FeedHealth />
          <Async state={kpis}>
            {(k) => (
              <Card title={t('admin.perf.title')} subtitle={t('admin.perf.subtitle')}>
                <dl className="facts facts--2">
                  <div>
                    <dt>{t('admin.perf.p95')}</dt>
                    <dd className="num">
                      {k.playlistBuild.p95Ms === null ? '–' : `${fmt.number(k.playlistBuild.p95Ms)} ms`}
                    </dd>
                  </div>
                  <div>
                    <dt>{t('admin.perf.p50')}</dt>
                    <dd className="num">
                      {k.playlistBuild.p50Ms === null ? '–' : `${fmt.number(k.playlistBuild.p50Ms)} ms`}
                    </dd>
                  </div>
                  <div>
                    <dt>{t('admin.perf.slots')}</dt>
                    <dd className="num">{fmt.number(k.playlistBuild.slots)}</dd>
                  </div>
                  <div>
                    <dt>{t('admin.perf.skipped')}</dt>
                    <dd className="num">{fmt.number(k.playlistBuild.skippedSlots)}</dd>
                  </div>
                  <div>
                    <dt>{t('admin.perf.model')}</dt>
                    <dd>{k.modelVersion}</dd>
                  </div>
                  <div>
                    <dt>{t('admin.perf.budget')}</dt>
                    <dd>{t('admin.perf.budgetValue')}</dd>
                  </div>
                </dl>
              </Card>
            )}
          </Async>
        </div>
      </div>
    </div>
  );
}

function Incidents() {
  const { t, tx, fmt } = useI18n();
  const toast = useToast();
  const [filter, setFilter] = useState<'active' | 'resolved'>('active');
  const incidents = useApi<Incident[]>(`/api/incidents?status=${filter}`, {
    topics: ['incident'],
    debounceMs: 300,
  });

  const update = async (id: string, patch: { status?: Incident['status']; owner?: string }) => {
    try {
      await api.patch(`/api/incidents/${id}`, patch);
      incidents.reload();
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e), 'error');
    }
  };

  return (
    <Card
      title={t('admin.incidents.title')}
      subtitle={t('admin.incidents.subtitle')}
      actions={
        <Segmented
          size="sm"
          label={t('admin.incidents.title')}
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'active', label: t('admin.incidents.active') },
            { value: 'resolved', label: t('admin.incidents.resolved') },
          ]}
        />
      }
      flush
    >
      <Async state={incidents}>
        {(list) => (
          <Table
            dense
            rowKey={(i) => i.id}
            rows={list}
            empty={filter === 'active' ? t('admin.incidents.none') : t('admin.incidents.noneResolved')}
            columns={[
              {
                key: 'sev',
                header: t('admin.incidents.severity'),
                cell: (i) => (
                  <Status tone={SEVERITY.get(i.severity) ?? 'neutral'}>
                    {tx(`admin.severity.${i.severity}`, i.severity)}
                  </Status>
                ),
              },
              {
                key: 'title',
                header: t('admin.incidents.incident'),
                cell: (i) => (
                  <span className="cell-title">
                    <strong>{i.title}</strong>
                    <span className="muted xsmall">{`${i.id} · ${fmt.time(i.raisedAt)}`}</span>
                  </span>
                ),
              },
              {
                key: 'owner',
                header: t('admin.incidents.owner'),
                cell: (i) => (
                  <select
                    className="input input--compact"
                    aria-label={t('admin.incidents.owner')}
                    value={i.owner ?? ''}
                    onChange={(e) => void update(i.id, { owner: e.target.value })}
                    disabled={i.status === 'resolved'}
                  >
                    <option value="" disabled>
                      {t('admin.incidents.unassigned')}
                    </option>
                    {OWNERS.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                ),
              },
              {
                key: 'status',
                header: t('common.table.status'),
                cell: (i) => tx(`admin.incident.${i.status}`, i.status),
              },
              {
                key: 'act',
                header: <span className="sr-only">{t('common.table.actions')}</span>,
                align: 'end',
                cell: (i) =>
                  i.status === 'resolved' ? (
                    <span className="muted xsmall">{i.resolvedAt ? fmt.time(i.resolvedAt) : ''}</span>
                  ) : (
                    <span className="row row--end">
                      {i.status === 'open' ? (
                        <Button size="sm" onClick={() => void update(i.id, { status: 'acknowledged' })}>
                          {t('admin.incidents.ack')}
                        </Button>
                      ) : null}
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => void update(i.id, { status: 'resolved' })}
                      >
                        {t('admin.incidents.resolve')}
                      </Button>
                    </span>
                  ),
              },
            ]}
          />
        )}
      </Async>
    </Card>
  );
}

function FeedHealth() {
  const { t, tx, fmt } = useI18n();
  const feeds = useApi<Feeds>('/api/feeds', { topics: ['feeds'], debounceMs: 1500 });
  return (
    <Card title={t('admin.feeds.title')} subtitle={t('admin.feeds.subtitle')}>
      <Async state={feeds}>
        {(f) => (
          <ul className="feed">
            {f.feeds.map((x) => (
              <li key={x.feed}>
                <Status tone={x.status === 'up' ? 'good' : x.status === 'degraded' ? 'warning' : 'critical'}>
                  {x.feed.toUpperCase()}
                </Status>
                <span className="feed__main">
                  <span className="muted xsmall">{`${x.adapter} · ${tx(`admin.feed.${x.status}`, x.status)}`}</span>
                  {x.lastError ? <span className="xsmall danger-text">{x.lastError}</span> : null}
                </span>
                <span className="num xsmall muted">
                  {t('admin.feeds.messages', { n: fmt.number(x.messagesTotal) })}
                  {x.lastMessageAt ? ` · ${fmt.time(x.lastMessageAt)}` : ''}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Async>
    </Card>
  );
}
