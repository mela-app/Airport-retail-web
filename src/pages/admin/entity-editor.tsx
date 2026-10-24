/**
 * A list-and-form editor for one kind of master data: a table of records and a form to create or edit one.
 * Fields are described declaratively; values are kept in a Map keyed by field name.
 */
import { type ReactNode, useState } from 'react';

import { useI18n } from '../../i18n';
import { Button, Field, Select } from '../../ui/controls';
import { Badge, Card } from '../../ui/display';
import { useToast } from '../../ui/overlay';
import { type Column, Table } from '../../ui/table';

export type FieldValue = string | number | boolean;

export interface FieldDef {
  key: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'color' | 'checkbox';
  options?: readonly { value: string; label: string }[];
  /** Only editable when creating (ids, codes). */
  createOnly?: boolean;
  required?: boolean;
  hint?: string;
  min?: number;
  max?: number;
  step?: number;
}

export function EntityEditor<T>({
  title,
  subtitle,
  rows,
  rowKey,
  columns,
  fields,
  blank,
  toValues,
  onSave,
  onDeactivate,
  inactive,
}: {
  title: string;
  subtitle?: string;
  rows: readonly T[];
  rowKey: (row: T) => string;
  columns: readonly Column<T>[];
  fields: readonly FieldDef[];
  blank: () => Map<string, FieldValue>;
  toValues: (row: T) => Map<string, FieldValue>;
  /** `row` is null when creating. */
  onSave: (values: Map<string, FieldValue>, row: T | null) => Promise<void>;
  onDeactivate?: (row: T) => Promise<void>;
  inactive?: (row: T) => boolean;
}) {
  const { t } = useI18n();
  const toast = useToast();
  const [editing, setEditing] = useState<{ row: T | null; values: Map<string, FieldValue> } | null>(null);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!editing) return;
    const missing = fields.filter((f) => f.required && String(editing.values.get(f.key) ?? '').trim() === '');
    if (missing.length > 0) {
      toast(t('admin.data.required', { fields: missing.map((f) => f.label).join(', ') }), 'error');
      return;
    }
    setBusy(true);
    try {
      await onSave(editing.values, editing.row);
      toast(t('admin.data.saved'), 'good');
      setEditing(null);
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e), 'error');
    } finally {
      setBusy(false);
    }
  };

  const deactivate = async (row: T) => {
    if (!onDeactivate) return;
    try {
      await onDeactivate(row);
      toast(t('admin.data.deactivated'), 'good');
      setEditing(null);
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e), 'error');
    }
  };

  const set = (key: string, value: FieldValue) => {
    if (!editing) return;
    const values = new Map(editing.values);
    values.set(key, value);
    setEditing({ ...editing, values });
  };

  const tableColumns: Column<T>[] = inactive
    ? [
        ...columns,
        {
          key: '__state',
          header: '',
          align: 'end',
          cell: (r) => (inactive(r) ? <Badge tone="warning">{t('admin.data.inactive')}</Badge> : null),
        },
      ]
    : [...columns];

  return (
    <div className="grid grid--2-1">
      <Card
        title={title}
        subtitle={subtitle}
        actions={
          <Button
            size="sm"
            variant="primary"
            icon="plus"
            onClick={() => setEditing({ row: null, values: blank() })}
          >
            {t('admin.data.add')}
          </Button>
        }
        flush
      >
        <Table
          dense
          rowKey={rowKey}
          rows={rows}
          columns={tableColumns}
          selectedKey={editing?.row ? rowKey(editing.row) : null}
          onRowClick={(r) => setEditing({ row: r, values: toValues(r) })}
        />
      </Card>
      <Card
        title={editing ? (editing.row ? t('admin.data.edit') : t('admin.data.new')) : t('admin.data.pick')}
      >
        {editing ? (
          <form
            className="stack stack--tight"
            onSubmit={(e) => {
              e.preventDefault();
              void save();
            }}
          >
            {fields.map((f) => (
              <FormField
                key={f.key}
                field={f}
                value={editing.values.get(f.key)}
                disabled={Boolean(f.createOnly && editing.row)}
                onChange={(v) => set(f.key, v)}
              />
            ))}
            <div className="row row--end">
              {editing.row && onDeactivate && !(inactive?.(editing.row) ?? false) ? (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => editing.row && void deactivate(editing.row)}
                >
                  {t('admin.data.deactivate')}
                </Button>
              ) : null}
              <Button size="sm" onClick={() => setEditing(null)}>
                {t('common.ui.cancel')}
              </Button>
              <Button size="sm" variant="primary" type="submit" busy={busy}>
                {t('common.ui.save')}
              </Button>
            </div>
          </form>
        ) : (
          <p className="muted small">{t('admin.data.pickHint')}</p>
        )}
      </Card>
    </div>
  );
}

function FormField({
  field,
  value,
  disabled,
  onChange,
}: {
  field: FieldDef;
  value: FieldValue | undefined;
  disabled: boolean;
  onChange: (v: FieldValue) => void;
}): ReactNode {
  if (field.type === 'checkbox')
    return (
      <label className="toggle-row">
        <input
          type="checkbox"
          checked={Boolean(value)}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span>{field.label}</span>
      </label>
    );
  return (
    <Field label={field.label} hint={field.hint}>
      {(id) =>
        field.type === 'select' ? (
          <Select
            id={id}
            value={String(value ?? '')}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
          >
            {(field.options ?? []).map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        ) : field.type === 'color' ? (
          <span className="row">
            <input
              type="color"
              className="swatch"
              value={String(value ?? '#000000')}
              disabled={disabled}
              onChange={(e) => onChange(e.target.value.toUpperCase())}
            />
            <span className="mono small ltr">{String(value ?? '')}</span>
          </span>
        ) : (
          <input
            id={id}
            className="input"
            type={field.type === 'number' ? 'number' : 'text'}
            min={field.min}
            max={field.max}
            step={field.step}
            value={typeof value === 'boolean' ? '' : (value ?? '')}
            disabled={disabled}
            onChange={(e) => onChange(field.type === 'number' ? Number(e.target.value) : e.target.value)}
          />
        )
      }
    </Field>
  );
}

/** Read a string / number / boolean from form values. */
export const str = (v: Map<string, FieldValue>, k: string) => String(v.get(k) ?? '').trim();
export const num = (v: Map<string, FieldValue>, k: string) => Number(v.get(k) ?? 0);
export const bool = (v: Map<string, FieldValue>, k: string) => Boolean(v.get(k));
