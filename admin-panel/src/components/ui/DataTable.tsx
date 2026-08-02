"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, ChevronsUpDown, Search, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { Checkbox } from "./Field";
import Dropdown, { MenuItemDef } from "./Dropdown";
import { EmptyState, ErrorState, TableSkeleton } from "./States";

export interface Column<T> {
  key: string;
  header: string;
  /** Primitive used for sorting and free-text search on this column. */
  accessor?: (row: T) => string | number | null | undefined;
  /** Cell renderer. Falls back to the accessor value. */
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
  align?: "left" | "center" | "right";
  /** Tailwind width utility, e.g. "w-40". */
  width?: string;
  className?: string;
  /** Hide below the given breakpoint to keep narrow screens readable. */
  hideBelow?: "sm" | "md" | "lg" | "xl";
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;

  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;

  /** Adds the search box. Return the haystack for a row. */
  searchable?: (row: T) => string;
  searchPlaceholder?: string;

  /** Extra filter controls rendered in the toolbar, left of the search box. */
  toolbar?: React.ReactNode;
  /** Buttons rendered at the far right of the toolbar (e.g. "New room"). */
  toolbarActions?: React.ReactNode;

  /** Per-row overflow menu. Rendered as a pinned last column. */
  actions?: (row: T) => MenuItemDef[];

  /** Enables checkbox selection; renders the given bar when rows are picked. */
  bulkActions?: (selected: T[], clear: () => void) => React.ReactNode;

  initialSort?: { key: string; direction: "asc" | "desc" };
  pageSize?: number;
  onRowClick?: (row: T) => void;

  emptyTitle?: string;
  emptyDescription?: string;
  emptyIcon?: React.ReactNode;
  emptyAction?: React.ReactNode;

  className?: string;
  /** Row count shown next to the toolbar; defaults to the filtered count. */
  countLabel?: string;
}

const HIDE_BELOW_CLASS: Record<NonNullable<Column<unknown>["hideBelow"]>, string> = {
  sm: "hidden sm:table-cell",
  md: "hidden md:table-cell",
  lg: "hidden lg:table-cell",
  xl: "hidden xl:table-cell",
};

const ALIGN_CLASS = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
} as const;

/**
 * The one table used across the admin panel.
 *
 * Search, sort and pagination are all client-side by design: every admin list
 * endpoint in this backend returns a complete array (there is no server-side
 * pagination to hook into), so paging locally is both correct and instant.
 * If an endpoint ever gains `?page=`, swap the `pageRows` memo for props.
 */
export default function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading,
  error,
  onRetry,
  searchable,
  searchPlaceholder = "Search…",
  toolbar,
  toolbarActions,
  actions,
  bulkActions,
  initialSort,
  pageSize = 10,
  onRowClick,
  emptyTitle = "Nothing here yet",
  emptyDescription,
  emptyIcon,
  emptyAction,
  className,
  countLabel,
}: DataTableProps<T>) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState(initialSort ?? null);
  const [page, setPage] = useState(1);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

  // ---- filter -------------------------------------------------------------
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || !searchable) return rows;
    return rows.filter((row) => searchable(row).toLowerCase().includes(q));
  }, [rows, query, searchable]);

  // ---- sort ---------------------------------------------------------------
  const sorted = useMemo(() => {
    if (!sort) return filtered;
    const column = columns.find((c) => c.key === sort.key);
    if (!column?.accessor) return filtered;

    const factor = sort.direction === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const av = column.accessor!(a);
      const bv = column.accessor!(b);
      if (av == null && bv == null) return 0;
      if (av == null) return 1; // blanks always sink
      if (bv == null) return -1;
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * factor;
      return String(av).localeCompare(String(bv), undefined, { numeric: true }) * factor;
    });
  }, [filtered, sort, columns]);

  // ---- paginate -----------------------------------------------------------
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = useMemo(
    () => sorted.slice((safePage - 1) * pageSize, safePage * pageSize),
    [sorted, safePage, pageSize]
  );

  // Searching/filtering can shrink the list under the current page — go back to
  // page 1 rather than showing an empty page.
  useEffect(() => {
    setPage(1);
  }, [query, rows.length]);

  // ---- selection ----------------------------------------------------------
  const selectedRows = useMemo(
    () => rows.filter((r) => selectedKeys.has(rowKey(r))),
    [rows, selectedKeys, rowKey]
  );
  const clearSelection = () => setSelectedKeys(new Set());

  // Drop selections for rows that no longer exist (after a delete/reload).
  useEffect(() => {
    setSelectedKeys((prev) => {
      if (prev.size === 0) return prev;
      const live = new Set(rows.map(rowKey));
      const next = new Set(Array.from(prev).filter((k) => live.has(k)));
      return next.size === prev.size ? prev : next;
    });
  }, [rows, rowKey]);

  const pageKeys = pageRows.map(rowKey);
  const allOnPageSelected = pageKeys.length > 0 && pageKeys.every((k) => selectedKeys.has(k));
  const someOnPageSelected = pageKeys.some((k) => selectedKeys.has(k));

  function toggleAllOnPage(next: boolean) {
    setSelectedKeys((prev) => {
      const copy = new Set(prev);
      pageKeys.forEach((k) => (next ? copy.add(k) : copy.delete(k)));
      return copy;
    });
  }

  function toggleRow(key: string, next: boolean) {
    setSelectedKeys((prev) => {
      const copy = new Set(prev);
      if (next) copy.add(key);
      else copy.delete(key);
      return copy;
    });
  }

  function toggleSort(key: string) {
    setSort((prev) => {
      if (prev?.key !== key) return { key, direction: "asc" };
      if (prev.direction === "asc") return { key, direction: "desc" };
      return null; // third click clears sorting
    });
  }

  const showToolbar = Boolean(searchable || toolbar || toolbarActions);
  const selectable = Boolean(bulkActions);

  return (
    <div className={cn("card overflow-hidden", className)}>
      {showToolbar && (
        <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
          {searchable && (
            <div className="relative min-w-[180px] flex-1 sm:max-w-xs">
              <Search
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400"
              />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
                className="input py-1.5 pl-9 pr-8"
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  aria-label="Clear search"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-ink-400 hover:text-ink-700"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          )}
          {toolbar}
          <div className="ml-auto flex items-center gap-2">
            {countLabel !== undefined ? (
              <span className="hidden text-sm text-ink-500 sm:inline">{countLabel}</span>
            ) : (
              !loading && (
                <span className="hidden text-sm text-ink-500 sm:inline">
                  {sorted.length} {sorted.length === 1 ? "result" : "results"}
                </span>
              )
            )}
            {toolbarActions}
          </div>
        </div>
      )}

      {selectable && selectedRows.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 border-b border-brand-100 bg-brand-50 px-4 py-2.5">
          <span className="text-sm font-medium text-brand-800">
            {selectedRows.length} selected
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {bulkActions!(selectedRows, clearSelection)}
          </div>
          <button
            onClick={clearSelection}
            className="ml-auto text-sm font-medium text-brand-700 hover:underline"
          >
            Clear
          </button>
        </div>
      )}

      {loading ? (
        <TableSkeleton rows={Math.min(pageSize, 6)} cols={Math.min(columns.length + 1, 6)} />
      ) : error ? (
        <ErrorState message={error} onRetry={onRetry} />
      ) : sorted.length === 0 ? (
        <EmptyState
          icon={emptyIcon}
          title={query ? "No matches" : emptyTitle}
          description={
            query ? `Nothing matches “${query}”. Try a different search.` : emptyDescription
          }
          action={query ? undefined : emptyAction}
        />
      ) : (
        <>
          <div className="table-wrap">
            <table className="dt">
              <thead>
                <tr>
                  {selectable && (
                    <th className="w-10 pr-0">
                      <Checkbox
                        checked={allOnPageSelected}
                        indeterminate={someOnPageSelected}
                        onChange={toggleAllOnPage}
                        ariaLabel="Select all rows on this page"
                      />
                    </th>
                  )}
                  {columns.map((col) => {
                    const isSorted = sort?.key === col.key;
                    return (
                      <th
                        key={col.key}
                        scope="col"
                        className={cn(
                          col.width,
                          col.align && ALIGN_CLASS[col.align],
                          col.hideBelow && HIDE_BELOW_CLASS[col.hideBelow]
                        )}
                      >
                        {col.sortable && col.accessor ? (
                          <button
                            onClick={() => toggleSort(col.key)}
                            className="inline-flex items-center gap-1 uppercase tracking-wide hover:text-ink-800"
                            aria-label={`Sort by ${col.header}`}
                          >
                            {col.header}
                            {isSorted ? (
                              sort!.direction === "asc" ? (
                                <ArrowUp size={12} className="text-brand-600" />
                              ) : (
                                <ArrowDown size={12} className="text-brand-600" />
                              )
                            ) : (
                              <ChevronsUpDown size={12} className="text-ink-400" />
                            )}
                          </button>
                        ) : (
                          col.header
                        )}
                      </th>
                    );
                  })}
                  {actions && (
                    <th className="w-12 text-right">
                      <span className="sr-only">Actions</span>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row) => {
                  const key = rowKey(row);
                  const isSelected = selectedKeys.has(key);
                  return (
                    <tr
                      key={key}
                      data-selected={isSelected}
                      onClick={onRowClick ? () => onRowClick(row) : undefined}
                      className={onRowClick ? "cursor-pointer" : undefined}
                    >
                      {selectable && (
                        <td className="pr-0" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={isSelected}
                            onChange={(next) => toggleRow(key, next)}
                            ariaLabel="Select row"
                          />
                        </td>
                      )}
                      {columns.map((col) => (
                        <td
                          key={col.key}
                          className={cn(
                            col.align && ALIGN_CLASS[col.align],
                            col.hideBelow && HIDE_BELOW_CLASS[col.hideBelow],
                            col.className
                          )}
                        >
                          {col.render ? col.render(row) : (col.accessor?.(row) ?? "—")}
                        </td>
                      ))}
                      {actions && (
                        <td className="text-right" onClick={(e) => e.stopPropagation()}>
                          <Dropdown items={actions(row)} />
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {sorted.length > pageSize && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3">
              <p className="text-sm text-ink-500">
                Showing <span className="font-medium text-ink-700">
                  {(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, sorted.length)}
                </span>{" "}
                of <span className="font-medium text-ink-700">{sorted.length}</span>
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                  className="btn-secondary btn-sm"
                >
                  <ChevronLeft size={14} />
                  Previous
                </button>
                <span className="px-2 text-sm text-ink-600">
                  Page {safePage} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage === totalPages}
                  className="btn-secondary btn-sm"
                >
                  Next
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
