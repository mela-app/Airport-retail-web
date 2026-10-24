/** Cards, KPI tiles, badges and states (loading, empty, error). */
import type { ReactNode } from 'react';

import { useI18n } from '../i18n';
import { Button } from './controls';
import { Icon, type IconName } from './icon';

export function Card({
  title,
  subtitle,
  actions,
  children,
  className,
  flush,
  id,
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  /** No inner padding (tables, maps). */
  flush?: boolean;
  id?: string;
}) {
  return (
    <section className={['card', className].filter(Boolean).join(' ')} id={id}>
      {title || actions ? (
        <header className="card__header">
          <div className="card__titles">
            {title ? <h3 className="card__title">{title}</h3> : null}
            {subtitle ? <p className="card__subtitle">{subtitle}</p> : null}
          </div>
          {actions ? <div className="card__actions">{actions}</div> : null}
        </header>
      ) : null}
      <div className={flush ? 'card__body card__body--flush' : 'card__body'}>{children}</div>
    </section>
  );
}

export type Tone = 'neutral' | 'accent' | 'good' | 'warning' | 'serious' | 'critical';

export function Badge({
  tone = 'neutral',
  children,
  icon,
}: {
  tone?: Tone;
  children: ReactNode;
  icon?: IconName;
}) {
  return (
    <span className={`badge badge--${tone}`}>
      {icon ? <Icon name={icon} size={12} /> : null}
      {children}
    </span>
  );
}

const STATUS_ICON = new Map<Tone, IconName>([
  ['good', 'check'],
  ['warning', 'alert'],
  ['serious', 'alert'],
  ['critical', 'x'],
  ['neutral', 'dot'],
  ['accent', 'dot'],
]);

/** A state shown with an icon and a label, never colour alone. */
export function Status({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <span className={`status status--${tone}`}>
      <span className="status__mark" aria-hidden="true">
        <Icon name={STATUS_ICON.get(tone) ?? 'dot'} size={11} />
      </span>
      {children}
    </span>
  );
}

export function Kpi({
  label,
  value,
  hint,
  delta,
  icon,
  live,
}: {
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  delta?: { text: string; good: boolean } | undefined;
  icon?: IconName;
  /** Flash when the value changes. */
  live?: boolean;
}) {
  return (
    <div className="kpi">
      <div className="kpi__label">
        {icon ? <Icon name={icon} size={15} /> : null}
        <span>{label}</span>
      </div>
      <div
        className={live ? 'kpi__value kpi__value--live' : 'kpi__value'}
        key={live ? String(value) : undefined}
      >
        {value}
      </div>
      {delta || hint ? (
        <div className="kpi__foot">
          {delta ? (
            <span className={delta.good ? 'delta delta--good' : 'delta delta--bad'}>{delta.text}</span>
          ) : null}
          {hint ? <span className="muted">{hint}</span> : null}
        </div>
      ) : null}
    </div>
  );
}

export function Spinner({ label }: { label?: string }) {
  const { t } = useI18n();
  return (
    <span className="spinner-wrap" role="status">
      <span className="spinner" aria-hidden="true" />
      {label ? (
        <span className="muted small">{label}</span>
      ) : (
        <span className="sr-only">{t('common.ui.loading')}</span>
      )}
    </span>
  );
}

export function Loading() {
  const { t } = useI18n();
  return (
    <div className="state">
      <Spinner label={t('common.ui.loading')} />
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const { t } = useI18n();
  return (
    <div className="state state--error" role="alert">
      <Icon name="alert" size={22} />
      <p>
        <strong>{t('common.ui.error')}</strong>
      </p>
      <p className="muted small">{message}</p>
      {onRetry ? (
        <Button size="sm" icon="refresh" onClick={onRetry}>
          {t('common.ui.retry')}
        </Button>
      ) : null}
    </div>
  );
}

export function Empty({
  icon = 'info',
  title,
  children,
}: {
  icon?: IconName;
  title: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="state">
      <Icon name={icon} size={22} />
      <p>
        <strong>{title}</strong>
      </p>
      {children ? <div className="muted small">{children}</div> : null}
    </div>
  );
}

/** Loading / error / content for one API resource. */
export function Async<T>({
  state,
  children,
}: {
  state: { data: T | undefined; error: string | undefined; reload: () => void };
  children: (data: T) => ReactNode;
}) {
  if (state.data !== undefined) return <>{children(state.data)}</>;
  if (state.error) return <ErrorState message={state.error} onRetry={state.reload} />;
  return <Loading />;
}
