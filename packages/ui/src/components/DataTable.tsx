import React from 'react';
import { colors, radius, spacing, fontSize, fontWeight } from '../tokens/tokens.js';

/* -------------------------------------------------------------------------- */
/*  Data Table — lightweight enterprise table                                 */
/* -------------------------------------------------------------------------- */

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
  width?: string;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  rowKey: (row: T) => string;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
}

export function DataTable<T>({ columns, data, rowKey, emptyMessage = 'Nenhum dado encontrado.', onRowClick }: DataTableProps<T>) {
  return (
    <div style={{ overflowX: 'auto', border: `1px solid ${colors.border}`, borderRadius: radius.lg }}>
      <style>{`
        .connekt-data-table__row:hover {
          background: ${colors.surfaceHover};
        }
      `}</style>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: colors.surfaceAlt }}>
            {columns.map((col) => (
              <th
                key={col.key}
                style={{
                  textAlign: 'left',
                  padding: `${spacing.sm + 2}px ${spacing.md}px`,
                  fontSize: fontSize.sm,
                  fontWeight: fontWeight.semibold,
                  color: colors.textSecondary,
                  borderBottom: `1px solid ${colors.border}`,
                  whiteSpace: 'nowrap',
                  width: col.width,
                }}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr
              key={rowKey(row)}
              onClick={() => onRowClick?.(row)}
              className="connekt-data-table__row"
              style={{
                borderBottom: `1px solid ${colors.borderLight}`,
                cursor: onRowClick ? 'pointer' : 'default',
                transition: 'background 0.1s',
              }}
            >
              {columns.map((col) => (
                <td key={col.key} style={{ padding: `${spacing.sm + 2}px ${spacing.md}px`, fontSize: fontSize.md, color: colors.text }}>
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {data.length === 0 && (
        <div style={{ padding: spacing.xl, textAlign: 'center', color: colors.textMuted, fontSize: fontSize.md }}>
          {emptyMessage}
        </div>
      )}
    </div>
  );
}
