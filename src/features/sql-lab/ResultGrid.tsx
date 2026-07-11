import { useVirtualizer } from "@tanstack/react-virtual";
import type { CSSProperties } from "react";
import { useRef } from "react";

type ResultGridProps = {
  columns: string[];
  rows: Record<string, unknown>[];
  placeholderColumns?: string[];
  showRowNumbers?: boolean;
  virtualScrolling?: boolean;
  fillHeight?: boolean;
};

export function ResultGrid({
  columns,
  rows,
  placeholderColumns = [],
  showRowNumbers = true,
  virtualScrolling = true,
  fillHeight = false,
}: ResultGridProps) {
  const displayColumns = columns.length > 0 ? columns : placeholderColumns;
  const visibleColumns = showRowNumbers ? ["#", ...displayColumns] : displayColumns;
  const parentRef = useRef<HTMLDivElement | null>(null);
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 38,
    overscan: 8,
  });

  if (displayColumns.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-foreground/55">
        Run a query to see results.
      </div>
    );
  }

  return (
    <div className={`${fillHeight ? "flex h-full flex-col" : ""} overflow-hidden`}>
      <div
        className="grid border-b border-border bg-muted/70 text-xs font-semibold uppercase tracking-wide text-foreground/60"
        style={{ gridTemplateColumns: gridTemplate(visibleColumns.length, showRowNumbers) }}
      >
        {visibleColumns.map((column) => (
          <div key={column} className="truncate border-r border-border px-3 py-2 last:border-r-0">
            {column}
          </div>
        ))}
      </div>

      <div ref={parentRef} className={`${fillHeight ? "min-h-0 flex-1" : "h-[420px]"} overflow-auto bg-background`}>
        {rows.length === 0 && placeholderColumns.length > 0 ? (
          <div className="grid animate-pulse text-sm text-foreground/35" style={{ gridTemplateColumns: gridTemplate(visibleColumns.length, showRowNumbers) }}>
            {visibleColumns.map((column) => (
              <div key={column} className="border-r border-border/70 px-3 py-3 last:border-r-0">
                —
              </div>
            ))}
          </div>
        ) : null}
        {virtualScrolling ? (
          <div
            className="relative w-full"
            style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const row = rows[virtualRow.index];
              return (
                <GridRow
                  key={virtualRow.key}
                  columns={displayColumns}
                  row={row}
                  rowNumber={virtualRow.index + 1}
                  showRowNumbers={showRowNumbers}
                  style={{
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                  virtual
                />
              );
            })}
          </div>
        ) : (
          rows.map((row, index) => (
            <GridRow
              key={index}
              columns={displayColumns}
              row={row}
              rowNumber={index + 1}
              showRowNumbers={showRowNumbers}
            />
          ))
        )}
      </div>
    </div>
  );
}

type GridRowProps = {
  columns: string[];
  row: Record<string, unknown>;
  rowNumber: number;
  showRowNumbers: boolean;
  style?: CSSProperties;
  virtual?: boolean;
};

function GridRow({ columns, row, rowNumber, showRowNumbers, style, virtual = false }: GridRowProps) {
  return (
    <div
      className={`${virtual ? "absolute left-0" : ""} grid w-full border-b border-border/70 text-sm`}
      style={{
        ...style,
        gridTemplateColumns: gridTemplate(showRowNumbers ? columns.length + 1 : columns.length, showRowNumbers),
      }}
    >
      {showRowNumbers && (
        <div className="truncate border-r border-border/70 px-3 py-2 text-foreground/45">
          {rowNumber}
        </div>
      )}
      {columns.map((column) => (
        <div
          key={column}
          className="truncate border-r border-border/70 px-3 py-2 last:border-r-0"
          title={formatCell(row[column])}
        >
          {formatCell(row[column])}
        </div>
      ))}
    </div>
  );
}

function gridTemplate(columnCount: number, showRowNumbers: boolean) {
  if (!showRowNumbers) return `repeat(${columnCount}, minmax(160px, 1fr))`;
  return `72px repeat(${Math.max(0, columnCount - 1)}, minmax(160px, 1fr))`;
}

function formatCell(value: unknown) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}
