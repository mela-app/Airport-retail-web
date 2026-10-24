/** A plain data table: columns render their own cells; numbers align to the end with tabular figures. */
import type { ReactNode } from 'react';

export interface Column<T> {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  align?: 'start' | 'end' | 'center';
  width?: string;
}

export function Table<T>({
  columns,
  rows,
  rowKey,
  empty,
  onRowClick,
  selectedKey,
  dense,
}: {
  columns: readonly Column<T>[];
  rows: readonly T[];
  rowKey: (row: T) => string;
  empty?: ReactNode;
  onRowClick?: (row: T) => void;
  selectedKey?: string | null;
  dense?: boolean;
}) {
  return (
    <div className="table-wrap">
      <table className={dense ? 'table table--dense' : 'table'}>
        <thead>
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                className={c.align ? `align-${c.align}` : undefined}
                style={c.width ? { width: c.width } : undefined}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="table__empty">
                {empty}
              </td>
            </tr>
          ) : (
            rows.map((row) => {
              const key = rowKey(row);
              return (
                <tr
                  key={key}
                  className={
                    [onRowClick ? 'is-clickable' : '', selectedKey === key ? 'is-selected' : '']
                      .join(' ')
                      .trim() || undefined
                  }
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  tabIndex={onRowClick ? 0 : undefined}
                  onKeyDown={
                    onRowClick
                      ? (e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            onRowClick(row);
                          }
                        }
                      : undefined
                  }
                >
                  {columns.map((c) => (
                    <td key={c.key} className={c.align ? `align-${c.align}` : undefined}>
                      {c.cell(row)}
                    </td>
                  ))}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
