"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  ScrollText,
  ShieldAlert,
  X,
} from "lucide-react";
import RequireAdmin from "@/components/RequireAdmin";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { Select, TextInput } from "@/components/ui/Field";
import { Drawer } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/States";
import { adminApi } from "@/lib/api";
import { useAdminSession } from "@/lib/adminSession";
import { cn } from "@/lib/cn";
import { dateTime, humanise, relativeTime } from "@/lib/format";

/**
 * The audit trail.
 *
 * Super Admin only — the API refuses everyone else, and this page says so
 * rather than rendering an empty table, because "no rows" and "you may not see
 * the rows" are very different messages.
 *
 * Rows are read-only and there is no delete control anywhere on this page. That
 * is not an omission: an audit log an admin can edit is not an audit log, and
 * the backend exposes no write endpoint to build one against.
 */

interface AuditRow {
  _id: string;
  actorId: string | null;
  actorName: string;
  actorEmail?: string;
  actorRole: string;
  action: string;
  module: string;
  entity?: string;
  entityId?: string;
  summary: string;
  method?: string;
  path?: string;
  statusCode?: number;
  ip?: string;
  userAgent?: string;
  meta?: Record<string, unknown>;
  createdAt: string;
}

interface Filters {
  modules: string[];
  actions: string[];
  actors: { id: string | null; name: string; email?: string; role: string; count: number }[];
}

const PAGE_SIZE = 50;

/** Actions worth colouring differently in a wall of grey rows. */
const ACTION_TONE: Record<string, "success" | "danger" | "warning" | "brand" | "neutral"> = {
  create: "success",
  delete: "danger",
  login_failed: "danger",
  role_change: "warning",
  password_reset: "warning",
  settings_change: "brand",
  export: "brand",
  login: "neutral",
  logout: "neutral",
  update: "neutral",
  status_change: "neutral",
  upload: "neutral",
};

export default function AuditLogsPage() {
  const { admin } = useAdminSession();
  const isSuperAdmin = admin?.role === "super_admin";

  const [rows, setRows] = useState<AuditRow[]>([]);
  const [filters, setFilters] = useState<Filters | null>(null);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<AuditRow | null>(null);

  const [module, setModule] = useState("");
  const [action, setAction] = useState("");
  const [actorId, setActorId] = useState("");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const load = useCallback(
    async (targetPage = page) => {
      setLoading(true);

      const params = new URLSearchParams({ page: String(targetPage), limit: String(PAGE_SIZE) });
      if (module) params.set("module", module);
      if (action) params.set("action", action);
      if (actorId) params.set("actorId", actorId);
      if (search.trim()) params.set("search", search.trim());
      if (from) params.set("from", from);
      if (to) params.set("to", to);

      const res = await adminApi.get<{
        rows: AuditRow[];
        total: number;
        page: number;
        pages: number;
      }>(`/admin/audit-logs?${params}`);

      setLoading(false);

      if (res.success && res.data) {
        setRows(res.data.rows);
        setTotal(res.data.total);
        setPages(res.data.pages);
        setPage(res.data.page);
        setError(null);
      } else {
        setError(res.message || "Could not load the audit log.");
      }
    },
    [module, action, actorId, search, from, to, page]
  );

  useEffect(() => {
    if (!isSuperAdmin) return;
    void adminApi.get<Filters>("/admin/audit-logs/filters").then((res) => {
      if (res.success && res.data) setFilters(res.data);
    });
  }, [isSuperAdmin]);

  // Filter changes reset to page 1 — staying on page 7 of a narrower result set
  // shows an empty table and reads as "nothing matched".
  useEffect(() => {
    if (!isSuperAdmin) return;
    const timer = setTimeout(() => void load(1), search ? 300 : 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [module, action, actorId, search, from, to, isSuperAdmin]);

  const hasFilters = Boolean(module || action || actorId || search || from || to);

  function clearFilters() {
    setModule("");
    setAction("");
    setActorId("");
    setSearch("");
    setFrom("");
    setTo("");
  }

  if (!isSuperAdmin) {
    return (
      <RequireAdmin>
        <div className="page-shell">
          <PageHeader
            breadcrumbs={[{ label: "Dashboard", href: "/" }, { label: "Audit logs" }]}
            title="Audit logs"
          />
          <EmptyState
            icon={<ShieldAlert size={20} />}
            title="Super Admin only"
            description="The audit log records changes across every business, including accounts and platform settings, so it is restricted to Super Admins. The API enforces this too — it is not just a hidden menu item."
          />
        </div>
      </RequireAdmin>
    );
  }

  return (
    <RequireAdmin>
      <div className="page-shell">
        <PageHeader
          breadcrumbs={[{ label: "Dashboard", href: "/" }, { label: "Audit logs" }]}
          title="Audit logs"
          description="Every administrative action — who did it, to what, from where, and when."
          actions={
            <Button variant="secondary" onClick={() => void load()} disabled={loading}>
              <RefreshCw size={14} className={cn(loading && "animate-spin")} />
              Refresh
            </Button>
          }
        />

        {/* Filters */}
        <div className="card mb-4 p-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
            <Select label="Module" value={module} onChange={(e) => setModule(e.target.value)}>
              <option value="">All modules</option>
              {(filters?.modules ?? []).map((m) => (
                <option key={m} value={m}>
                  {humanise(m)}
                </option>
              ))}
            </Select>

            <Select label="Action" value={action} onChange={(e) => setAction(e.target.value)}>
              <option value="">All actions</option>
              {(filters?.actions ?? []).map((a) => (
                <option key={a} value={a}>
                  {humanise(a)}
                </option>
              ))}
            </Select>

            <Select label="User" value={actorId} onChange={(e) => setActorId(e.target.value)}>
              <option value="">Everyone</option>
              {(filters?.actors ?? [])
                .filter((a) => a.id)
                .map((a) => (
                  <option key={a.id as string} value={a.id as string}>
                    {a.name} ({a.count})
                  </option>
                ))}
            </Select>
            <TextInput
              label="From"
              type="date"
              value={from}
              max={to || undefined}
              onChange={(e) => setFrom(e.target.value)}
            />
            <TextInput
              label="To"
              type="date"
              value={to}
              min={from || undefined}
              onChange={(e) => setTo(e.target.value)}
            />
            <TextInput
              label="Search"
              placeholder="Summary, name, path…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {hasFilters && (
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={clearFilters}
                className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline"
              >
                <X size={12} />
                Clear filters
              </button>
              <span className="text-xs text-ink-500">
                {total.toLocaleString("en-IN")} matching {total === 1 ? "entry" : "entries"}
              </span>
            </div>
          )}
        </div>

        {/* Table */}
        <div className="card overflow-hidden">
          {loading && rows.length === 0 ? (
            <div className="divide-y divide-line-subtle">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-4 py-3">
                  <span className="skeleton h-3.5 w-28 rounded" />
                  <span className="skeleton h-3.5 w-20 rounded" />
                  <span className="skeleton h-3.5 flex-1 rounded" />
                </div>
              ))}
            </div>
          ) : error ? (
            <EmptyState
              icon={<ScrollText size={20} />}
              title="Could not load the audit log"
              description={error}
              action={
                <Button variant="secondary" onClick={() => void load()}>
                  Try again
                </Button>
              }
            />
          ) : rows.length === 0 ? (
            <EmptyState
              icon={<ScrollText size={20} />}
              title={hasFilters ? "No entries match those filters" : "No activity recorded yet"}
              description={
                hasFilters
                  ? "Try widening the date range or clearing a filter."
                  : "Every create, update, delete, sign-in, role change and settings change is recorded here from now on."
              }
              action={
                hasFilters ? (
                  <Button variant="secondary" onClick={clearFilters}>
                    Clear filters
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="dt">
                <thead>
                  <tr>
                    <th className="w-40">When</th>
                    <th className="w-36">Action</th>
                    <th className="w-28">Module</th>
                    <th>What happened</th>
                    <th className="w-44">Who</th>
                    <th className="w-32">IP</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr
                      key={row._id}
                      onClick={() => setSelected(row)}
                      className="cursor-pointer"
                      title="Open full detail"
                    >
                      <td className="whitespace-nowrap text-ink-600" title={dateTime(row.createdAt)}>
                        {relativeTime(row.createdAt)}
                      </td>
                      <td>
                        <Badge tone={ACTION_TONE[row.action] ?? "neutral"}>
                          {humanise(row.action)}
                        </Badge>
                      </td>
                      <td className="text-ink-600">{humanise(row.module)}</td>
                      <td className="text-ink-800">{row.summary}</td>
                      <td>
                        <span className="block truncate text-ink-800">{row.actorName}</span>
                        <span className="block truncate text-xs text-ink-500">
                          {humanise(row.actorRole)}
                        </span>
                      </td>
                      <td className="font-mono text-xs text-ink-500">{row.ip || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {pages > 1 && (
            <div className="flex items-center justify-between border-t border-line px-4 py-3">
              <p className="text-xs text-ink-500">
                Page {page} of {pages} · {total.toLocaleString("en-IN")} entries
              </p>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page <= 1 || loading}
                  onClick={() => void load(page - 1)}
                >
                  <ChevronLeft size={14} />
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page >= pages || loading}
                  onClick={() => void load(page + 1)}
                >
                  Next
                  <ChevronRight size={14} />
                </Button>
              </div>
            </div>
          )}
        </div>

        <p className="mt-4 text-xs text-ink-500">
          Entries are written automatically by the server after each successful change, and cannot be
          edited or deleted from this panel. Passwords and API keys are redacted before anything is
          stored.
        </p>

        {/* Detail drawer */}
        <Drawer
          open={selected !== null}
          onClose={() => setSelected(null)}
          title="Audit entry"
          description={selected?.summary}
        >
          {selected && (
            <dl className="space-y-3.5">
              <Row label="When" value={dateTime(selected.createdAt)} />
              <Row label="Action" value={humanise(selected.action)} />
              <Row label="Module" value={humanise(selected.module)} />
              <Row label="Entity" value={selected.entity ? humanise(selected.entity) : "—"} />
              <Row label="Entity id" value={selected.entityId || "—"} mono />
              <Row label="User" value={selected.actorName} />
              <Row label="Email" value={selected.actorEmail || "—"} />
              <Row label="Role at the time" value={humanise(selected.actorRole)} />
              <Row
                label="Request"
                value={`${selected.method ?? "—"} ${selected.path ?? ""}`.trim()}
                mono
              />
              <Row label="Response" value={selected.statusCode ? String(selected.statusCode) : "—"} />
              <Row label="IP address" value={selected.ip || "—"} mono />
              <Row label="User agent" value={selected.userAgent || "—"} />

              {selected.meta && Object.keys(selected.meta).length > 0 && (
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-ink-500">
                    Submitted values
                  </dt>
                  <dd className="mt-1.5">
                    <pre className="max-h-64 overflow-auto rounded-md border border-line bg-surface-muted p-3 text-xs text-ink-700">
                      {JSON.stringify(selected.meta, null, 2)}
                    </pre>
                    <p className="mt-1.5 text-xs text-ink-500">
                      Passwords, API keys and tokens are replaced with{" "}
                      <code className="text-xs">[redacted]</code> before storage. Long text is
                      truncated and arrays are summarised by length.
                    </p>
                  </dd>
                </div>
              )}
            </dl>
          )}
        </Drawer>
      </div>
    </RequireAdmin>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-ink-500">{label}</dt>
      <dd className={cn("mt-0.5 break-words text-base text-ink-800", mono && "font-mono text-sm")}>
        {value}
      </dd>
    </div>
  );
}
