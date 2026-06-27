import { ReactNode } from "react";

// A column definition: how to render the header label and how to render
// the cell value for a given row. The same column config drives both the
// desktop <table> and the mobile stacked-card view, so there's exactly
// one place that knows how to format each field.
export interface ResponsiveColumn<T> {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  // Hide this column entirely in the mobile card view — useful for columns
  // that are redundant once the card's own layout already shows the info
  // (e.g. a chevron-only column).
  hideOnMobile?: boolean;
  // Marks this column's value as the card's "title" line in mobile view —
  // exactly one column should set this.
  isMobileTitle?: boolean;
  widthClassName?: string;
}

interface ResponsiveTableProps<T> {
  columns: ResponsiveColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  rowActions?: (row: T) => ReactNode;
}

export function ResponsiveTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  rowActions,
}: ResponsiveTableProps<T>) {
  const titleColumn = columns.find((c) => c.isMobileTitle) ?? columns[0];
  const detailColumns = columns.filter((c) => c !== titleColumn && !c.hideOnMobile);

  return (
    <>
      {/* Desktop table — md and above */}
      <table className="w-full text-sm hidden md:table">
        <thead>
          <tr className="border-b border-border text-left">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`px-5 py-3 font-medium text-text-secondary text-xs uppercase tracking-wide ${col.widthClassName ?? ""}`}
              >
                {col.header}
              </th>
            ))}
            {rowActions && <th className="px-5 py-3 w-8" />}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((row) => (
            <tr
              key={rowKey(row)}
              onClick={() => onRowClick?.(row)}
              className={`hover:bg-surface-sunken transition-colors ${onRowClick ? "cursor-pointer" : ""}`}
            >
              {columns.map((col) => (
                <td key={col.key} className="px-5 py-3.5">
                  {col.cell(row)}
                </td>
              ))}
              {rowActions && (
                <td className="px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
                  {rowActions(row)}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Mobile stacked cards — below md */}
      <div className="md:hidden divide-y divide-border">
        {rows.map((row) => (
          <div
            key={rowKey(row)}
            onClick={() => onRowClick?.(row)}
            className={`px-5 py-4 ${onRowClick ? "cursor-pointer active:bg-surface-sunken" : ""}`}
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="min-w-0 flex-1">{titleColumn.cell(row)}</div>
              {rowActions && (
                <div onClick={(e) => e.stopPropagation()} className="shrink-0">
                  {rowActions(row)}
                </div>
              )}
            </div>
            <dl className="space-y-1.5">
              {detailColumns.map((col) => (
                <div key={col.key} className="flex items-center justify-between gap-3 text-sm">
                  <dt className="text-text-tertiary text-xs uppercase tracking-wide shrink-0">
                    {col.header}
                  </dt>
                  <dd className="text-text-secondary text-right truncate">{col.cell(row)}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
    </>
  );
}
