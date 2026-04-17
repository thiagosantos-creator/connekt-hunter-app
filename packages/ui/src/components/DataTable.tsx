import React, { useEffect, useState, useMemo } from 'react';
import { colors, radius, spacing, fontSize, fontWeight } from '../tokens/tokens.js';
import { useInjectStyle } from './useInjectStyle.js';

/* -------------------------------------------------------------------------- */
/*  Data Table — enterprise table with search, sort, pagination               */
/* -------------------------------------------------------------------------- */

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
  width?: string;
  /** Optional text extractor for search — returns searchable text from row */
  searchValue?: (row: T) => string;
  /** Optional sort comparator */
  sortValue?: (row: T) => string | number;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  rowKey: (row: T) => string;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
  selectedRowKey?: string | null;
  /** Enable search bar */
  searchable?: boolean;
  searchPlaceholder?: string;
  /** Items per page — set to enable pagination */
  pageSize?: number;
}

export function DataTable<T>({
  columns,
  data,
  rowKey,
  emptyMessage = 'Nenhum dado encontrado.',
  onRowClick,
  selectedRowKey,
  searchable = false,
  searchPlaceholder = 'Buscar…',
  pageSize,
}: DataTableProps<T>) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState(true);
  const [page, setPage] = useState(0);
  useInjectStyle('data-table-focus-styles', `
    .connekt-data-table__row:hover {
      background: ${colors.surfaceHover};
      transform: scale(0.998);
    }
    .connekt-data-table__row:active {
      background: ${colors.borderLight};
      transform: scale(0.995);
    }
    .connekt-data-table__row:focus-visible,
    .connekt-data-table__control:focus-visible {
      outline: 2px solid ${colors.accent};
      outline-offset: -2px;
    }
  `);

  const filtered = useMemo(() => {
    if (!search.trim()) return data;
    const term = search.toLowerCase();
    return data.filter((row) =>
      columns.some((col) => {
        const text = col.searchValue ? col.searchValue(row) : '';
        return text.toLowerCase().includes(term);
      }),
    );
  }, [data, search, columns]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    const col = columns.find((c) => c.key === sortKey);
    if (!col?.sortValue) return filtered;
    const fn = col.sortValue;
    return [...filtered].sort((a, b) => {
      const aVal = fn(a);
      const bVal = fn(b);
      if (typeof aVal === 'number' && typeof bVal === 'number') return sortAsc ? aVal - bVal : bVal - aVal;
      return sortAsc ? String(aVal).localeCompare(String(bVal)) : String(bVal).localeCompare(String(aVal));
    });
  }, [filtered, sortKey, sortAsc, columns]);

  const totalPages = pageSize ? Math.max(1, Math.ceil(sorted.length / pageSize)) : 1;
  const currentPage = Math.max(0, Math.min(page, totalPages - 1));
  const paginated = pageSize ? sorted.slice(currentPage * pageSize, (currentPage + 1) * pageSize) : sorted;
  const hasActiveSearch = search.trim().length > 0;

  useEffect(() => {
    setPage((current) => (current === currentPage ? current : currentPage));
  }, [currentPage]);

  const handleSort = (key: string) => {
    const col = columns.find((c) => c.key === key);
    if (!col?.sortValue) return;
    if (sortKey === key) { setSortAsc(!sortAsc); } else { setSortKey(key); setSortAsc(true); }
  };

  return (
    <div style={{ border: `1px solid ${colors.border}`, borderRadius: radius.lg, overflow: 'hidden' }}>
      {searchable && (
        <div style={{ padding: `${spacing.sm}px ${spacing.md}px`, borderBottom: `1px solid ${colors.borderLight}`, background: colors.surface }}>
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            placeholder={searchPlaceholder}
            className="connekt-data-table__control"
            style={{
              width: '100%',
              padding: `${spacing.xs + 2}px ${spacing.sm + 4}px`,
              fontSize: fontSize.sm,
              border: `1px solid ${colors.border}`,
              borderRadius: radius.md,
              color: colors.text,
              background: colors.surfaceAlt,
            }}
          />
        </div>
      )}

      {(searchable || pageSize) && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: spacing.sm,
            flexWrap: 'wrap',
            padding: `${spacing.sm}px ${spacing.md}px`,
            borderBottom: `1px solid ${colors.borderLight}`,
            background: colors.surfaceAlt,
            fontSize: fontSize.sm,
            color: colors.textSecondary,
          }}
        >
          <span>
            {sorted.length} resultado(s)
            {hasActiveSearch ? ` para “${search.trim()}”` : ''}
          </span>
          {hasActiveSearch && (
            <button
              type="button"
              onClick={() => { setSearch(''); setPage(0); }}
              className="connekt-data-table__control"
              style={{
                padding: `2px ${spacing.sm}px`,
                border: `1px solid ${colors.border}`,
                borderRadius: radius.sm,
                background: colors.surface,
                cursor: 'pointer',
                color: colors.text,
                fontSize: fontSize.sm,
              }}
            >
              Limpar busca
            </button>
          )}
        </div>
      )}

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: colors.surfaceAlt }}>
              {columns.map((col) => (
                <th
                  key={col.key}
                  aria-sort={sortKey === col.key ? (sortAsc ? 'ascending' : 'descending') : 'none'}
                  style={{
                    textAlign: 'left',
                    padding: `${spacing.sm + 2}px ${spacing.md}px`,
                    fontSize: fontSize.xs,
                    fontWeight: fontWeight.bold,
                    color: colors.textSecondary,
                    borderBottom: `2px solid ${colors.borderLight}`,
                    whiteSpace: 'nowrap',
                    width: col.width,
                    userSelect: 'none',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  {col.sortValue ? (
                    <button
                      type="button"
                      onClick={() => handleSort(col.key)}
                      className="connekt-data-table__control"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: 0,
                        border: 'none',
                        background: 'transparent',
                        color: 'inherit',
                        cursor: 'pointer',
                        font: 'inherit',
                      }}
                    >
                      <span>{col.header}</span>
                      {sortKey === col.key && (
                        <span style={{ fontSize: fontSize.xs }}>
                          {sortAsc ? '▲' : '▼'}
                        </span>
                      )}
                    </button>
                  ) : col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginated.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={() => onRowClick?.(row)}
                onKeyDown={(event) => {
                  if (!onRowClick) return;
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onRowClick(row);
                  }
                }}
                className="connekt-data-table__row"
                tabIndex={onRowClick ? 0 : undefined}
                role={onRowClick ? 'button' : undefined}
                aria-selected={selectedRowKey ? selectedRowKey === rowKey(row) : undefined}
                style={{
                  borderBottom: `1px solid ${colors.borderLight}`,
                  cursor: onRowClick ? 'pointer' : 'default',
                  transition: 'background 0.1s, box-shadow 0.1s',
                  background: selectedRowKey === rowKey(row) ? colors.infoLight : undefined,
                  boxShadow: selectedRowKey === rowKey(row) ? `inset 3px 0 0 ${colors.info}` : undefined,
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
      </div>

      {paginated.length === 0 && (
        <div style={{ padding: spacing.xl, textAlign: 'center', color: colors.textMuted, fontSize: fontSize.md }}>
          {hasActiveSearch ? `Nenhum resultado encontrado para “${search.trim()}”.` : emptyMessage}
        </div>
      )}

      {pageSize && totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: `${spacing.sm}px ${spacing.md}px`, borderTop: `1px solid ${colors.borderLight}`, background: colors.surface, fontSize: fontSize.sm, color: colors.textSecondary }}>
          <span>{sorted.length} resultado(s)</span>
          <div style={{ display: 'flex', gap: spacing.xs }}>
            <button
              onClick={() => setPage(Math.max(0, currentPage - 1))}
              disabled={currentPage === 0}
              className="connekt-data-table__control"
              aria-label="Página anterior"
              style={{ padding: `2px ${spacing.sm}px`, border: `1px solid ${colors.border}`, borderRadius: radius.sm, background: colors.surface, cursor: currentPage === 0 ? 'not-allowed' : 'pointer', color: currentPage === 0 ? colors.textMuted : colors.text, fontSize: fontSize.sm }}
            >
              ←
            </button>
            <span style={{ padding: `2px ${spacing.sm}px` }}>{currentPage + 1} / {totalPages}</span>
            <button
              onClick={() => setPage(Math.min(totalPages - 1, currentPage + 1))}
              disabled={currentPage >= totalPages - 1}
              className="connekt-data-table__control"
              aria-label="Próxima página"
              style={{ padding: `2px ${spacing.sm}px`, border: `1px solid ${colors.border}`, borderRadius: radius.sm, background: colors.surface, cursor: currentPage >= totalPages - 1 ? 'not-allowed' : 'pointer', color: currentPage >= totalPages - 1 ? colors.textMuted : colors.text, fontSize: fontSize.sm }}
            >
              →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
