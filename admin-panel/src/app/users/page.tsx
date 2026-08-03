"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BedDouble,
  Info,
  KeyRound,
  PartyPopper,
  Pencil,
  Plus,
  Power,
  ShieldCheck,
  Trash2,
  TriangleAlert,
  UserRound,
  UsersRound,
  UtensilsCrossed,
} from "lucide-react";
import RequireAdmin from "@/components/RequireAdmin";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import StatCard from "@/components/ui/StatCard";
import DataTable, { Column } from "@/components/ui/DataTable";
import { Select, TextInput } from "@/components/ui/Field";
import { EmptyState } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { adminApi, formatApiError } from "@/lib/api";
import { useAdminSession } from "@/lib/adminSession";
import { useBusiness } from "@/lib/businessContext";
import { dateTime, humanise, initials, relativeTime } from "@/lib/format";

/**
 * Admin account management. Super Admin only.
 *
 * The API enforces that on the router itself, so a manager who reaches this URL
 * gets 403s from every call rather than a working screen — but showing them a
 * table of accounts they cannot touch would be a lie, so the page renders an
 * explanation instead.
 *
 * Everything here is a real write to `/api/v1/admin/users`. Because
 * `authenticate("admin")` re-reads the account on every request, a role change
 * or deactivation lands on the target's next call — they do not have to sign
 * out and back in.
 */

type BusinessScope = "hotel" | "restaurant" | "hall";

interface AdminUser {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  branchId?: string | null;
  businessScope: BusinessScope[];
  effectiveScope: BusinessScope[];
  isActive: boolean;
  lastLoginAt?: string;
  createdAt?: string;
  /**
   * True when this account sits on a role that no longer exists
   * (`branch_admin`, `staff`). Route guards refuse it everywhere, so it needs
   * reassigning or deleting.
   */
  isLegacyRole?: boolean;
}

/**
 * Mirrors ROLE_IMPLIED_SCOPE in admin.model.ts — kept in step by hand.
 *
 * `branch_admin` and `staff` were removed at the owner's request: 7 Vachan runs
 * a single branch, so a branch-scoped admin was a second Super Admin under
 * another name, and a read-only tier had nobody to fill it. Every remaining
 * role's business scope is fixed by the role, so there is nothing to assign.
 */
const ROLES: {
  key: string;
  label: string;
  scope: string;
  can: string;
  needsBranch: boolean;
}[] = [
  {
    key: "super_admin",
    label: "Super Admin",
    scope: "Everything",
    can: "All three businesses, plus managing these accounts. The only role that can reach this page.",
    needsBranch: false,
  },
  {
    key: "hotel_manager",
    label: "Hotel Manager",
    scope: "Hotel only",
    can: "Rooms, availability, gallery, offers, FAQs and bookings. No access to Restaurant or Marriage Hall.",
    needsBranch: true,
  },
  {
    key: "restaurant_manager",
    label: "Restaurant Manager",
    scope: "Restaurant only",
    can: "Menu, dining areas, reservations, gallery, offers and reviews. No access to Hotel or Marriage Hall.",
    needsBranch: true,
  },
  {
    key: "hall_manager",
    label: "Marriage Hall Manager",
    scope: "Marriage Hall only",
    can: "Packages, decoration, catering, gallery, availability calendar and enquiries. No access to Hotel or Restaurant.",
    needsBranch: true,
  },
];

const ROLE_BY_KEY = Object.fromEntries(ROLES.map((r) => [r.key, r]));

const SCOPE_META: Record<BusinessScope, { label: string; icon: typeof BedDouble }> = {
  hotel: { label: "Hotel", icon: BedDouble },
  restaurant: { label: "Restaurant", icon: UtensilsCrossed },
  hall: { label: "Marriage Hall", icon: PartyPopper },
};

const EMPTY_FORM = {
  name: "",
  email: "",
  phone: "",
  password: "",
  role: "hotel_manager",
  branchId: "",
};

export default function UsersPage() {
  const { admin } = useAdminSession();
  const { defaultBranchId } = useBusiness();
  const { toastSuccess, toastError } = useToast();
  const confirm = useConfirm();

  const isSuperAdmin = admin?.role === "super_admin";

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [passwordFor, setPasswordFor] = useState<AdminUser | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [savingPassword, setSavingPassword] = useState(false);

  const load = useCallback(async () => {
    if (!isSuperAdmin) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    const res = await adminApi.get<AdminUser[]>("/admin/users");
    if (!res.success) setError(formatApiError(res));
    setUsers(res.success ? res.data || [] : []);
    setLoading(false);
  }, [isSuperAdmin]);

  useEffect(() => {
    void load();
  }, [load]);

  const stats = useMemo(
    () => ({
      total: users.length,
      active: users.filter((u) => u.isActive).length,
      superAdmins: users.filter((u) => u.role === "super_admin" && u.isActive).length,
      neverSignedIn: users.filter((u) => !u.lastLoginAt).length,
    }),
    [users]
  );

  const selectedRole = ROLE_BY_KEY[form.role];

  function openCreate() {
    setEditingId(null);
    // Only one branch exists, so prefill it rather than making someone copy a
    // 24-character ObjectId out of the database.
    setForm({ ...EMPTY_FORM, branchId: defaultBranchId || "" });
    setFormError(null);
    setFormOpen(true);
  }

  function openEdit(user: AdminUser) {
    setEditingId(user._id);
    setForm({
      name: user.name,
      email: user.email,
      phone: user.phone || "",
      password: "",
      role: user.role,
      branchId: user.branchId || "",
    });
    setFormError(null);
    setFormOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSaving(true);

    const payload: Record<string, unknown> = {
      name: form.name,
      email: form.email,
      phone: form.phone || undefined,
      role: form.role,
      // The server derives businessScope from the role, so it is not sent.
      branchId: form.role === "super_admin" ? undefined : form.branchId,
    };

    const res = editingId
      ? await adminApi.put(`/admin/users/${editingId}`, payload)
      : await adminApi.post("/admin/users", { ...payload, password: form.password });

    setSaving(false);

    if (!res.success) {
      setFormError(formatApiError(res));
      return;
    }

    toastSuccess(editingId ? "Account updated." : `${form.name} can now sign in.`);
    setFormOpen(false);
    void load();
  }

  async function toggleStatus(user: AdminUser) {
    const next = !user.isActive;

    if (!next) {
      const ok = await confirm({
        title: `Deactivate ${user.name}?`,
        description:
          "They are signed out on their very next request — no waiting for a token to expire. The account and its history are kept, and you can reactivate it any time.",
        confirmLabel: "Deactivate",
        danger: true,
      });
      if (!ok) return;
    }

    const res = await adminApi.put(`/admin/users/${user._id}/status`, { isActive: next });
    if (!res.success) {
      toastError(formatApiError(res));
      return;
    }
    toastSuccess(res.message || "Account updated.");
    void load();
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!passwordFor) return;

    setPasswordError(null);
    setSavingPassword(true);

    const res = await adminApi.put(`/admin/users/${passwordFor._id}/password`, {
      password: newPassword,
    });
    setSavingPassword(false);

    if (!res.success) {
      setPasswordError(formatApiError(res));
      return;
    }

    toastSuccess(`Password reset for ${passwordFor.name}. Share it with them directly.`);
    setPasswordFor(null);
    setNewPassword("");
  }

  async function handleDelete(user: AdminUser) {
    const ok = await confirm({
      title: `Permanently delete ${user.name}?`,
      description:
        "This erases the account and its sign-in history. Deactivating instead keeps the record and is reversible — prefer that unless the account was created by mistake.",
      confirmLabel: "Delete permanently",
      danger: true,
    });
    if (!ok) return;

    const res = await adminApi.delete(`/admin/users/${user._id}`);
    if (!res.success) {
      toastError(formatApiError(res));
      return;
    }
    toastSuccess("Account deleted.");
    void load();
  }

  const columns: Column<AdminUser>[] = [
    {
      key: "name",
      header: "Account",
      sortable: true,
      accessor: (u) => u.name,
      render: (u) => (
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
              u.isActive ? "bg-brand-50 text-brand-700" : "bg-surface-muted text-ink-400"
            }`}
          >
            {initials(u.name)}
          </span>
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 truncate font-medium text-ink-800">
              {u.name}
              {u._id === admin?.id && <Badge tone="brand">You</Badge>}
            </p>
            <p className="truncate text-xs text-ink-500">{u.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "role",
      header: "Role",
      sortable: true,
      accessor: (u) => u.role,
      render: (u) =>
        u.isLegacyRole ? (
          <Badge tone="danger" icon={<TriangleAlert size={11} />}>
            {humanise(u.role)} — retired
          </Badge>
        ) : (
          <Badge tone={u.role === "super_admin" ? "brand" : "neutral"}>
            {ROLE_BY_KEY[u.role]?.label || humanise(u.role)}
          </Badge>
        ),
    },
    {
      key: "scope",
      header: "Business",
      accessor: (u) => (u.effectiveScope || []).join(","),
      hideBelow: "md",
      render: (u) => {
        const scope = u.effectiveScope || [];
        if (u.role === "super_admin") {
          return <span className="text-ink-600">All three</span>;
        }
        if (scope.length === 0) return <span className="text-ink-400">None assigned</span>;
        return (
          <div className="flex flex-wrap gap-1">
            {scope.map((s) => {
              const Icon = SCOPE_META[s]?.icon || UsersRound;
              return (
                <Badge key={s} tone="neutral" icon={<Icon size={11} />}>
                  {SCOPE_META[s]?.label || s}
                </Badge>
              );
            })}
          </div>
        );
      },
    },
    {
      key: "branch",
      header: "Branch",
      accessor: (u) => u.branchId ?? "",
      hideBelow: "xl",
      render: (u) =>
        u.role === "super_admin" ? (
          <span className="text-ink-500">Platform-wide</span>
        ) : u.branchId ? (
          <span className="font-mono text-xs text-ink-600">{String(u.branchId).slice(-6)}</span>
        ) : (
          <span className="text-ink-400">—</span>
        ),
    },
    {
      key: "lastLogin",
      header: "Last login",
      sortable: true,
      accessor: (u) => (u.lastLoginAt ? new Date(u.lastLoginAt).getTime() : 0),
      hideBelow: "lg",
      render: (u) =>
        u.lastLoginAt ? (
          <span className="whitespace-nowrap text-ink-600" title={dateTime(u.lastLoginAt)}>
            {relativeTime(u.lastLoginAt)}
          </span>
        ) : (
          <span className="text-ink-400">Never</span>
        ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      accessor: (u) => (u.isActive ? "active" : "inactive"),
      render: (u) => <Badge status={u.isActive ? "active" : "inactive"} />,
    },
  ];

  // ── Not a Super Admin ────────────────────────────────────────────────────
  if (!isSuperAdmin) {
    return (
      <RequireAdmin>
        <PageHeader
          title="Users and roles"
          description="Your account, and what each admin role is allowed to do."
          breadcrumbs={[{ label: "Users" }]}
        />

        <div className="card mb-4">
          <EmptyState
            icon={<ShieldCheck size={19} />}
            title="Only a Super Admin can manage accounts"
            description="Ask a Super Admin to create, edit or deactivate accounts. This is enforced by the API, not just hidden here — the endpoints return 403 for every other role."
          />
        </div>

        <RoleReference currentRole={admin?.role} />
      </RequireAdmin>
    );
  }

  // ── Super Admin ──────────────────────────────────────────────────────────
  return (
    <RequireAdmin>
      <PageHeader
        title="Users and roles"
        description="Create admin accounts, assign roles and business scope, and revoke access."
        breadcrumbs={[{ label: "Users" }]}
        actions={
          <Button variant="primary" icon={<Plus size={15} />} onClick={openCreate}>
            New account
          </Button>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Accounts"
          value={stats.total}
          icon={<UsersRound size={15} />}
          tone="brand"
          loading={loading}
        />
        <StatCard label="Active" value={stats.active} tone="success" loading={loading} />
        <StatCard
          label="Super Admins"
          value={stats.superAdmins}
          hint="The last active one can't be removed"
          icon={<ShieldCheck size={15} />}
          loading={loading}
        />
        <StatCard
          label="Never signed in"
          value={stats.neverSignedIn}
          tone={stats.neverSignedIn > 0 ? "warning" : "neutral"}
          loading={loading}
        />
      </div>

      {users.some((u) => u.isLegacyRole) && (
        <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-danger-100 bg-danger-50 px-4 py-2.5">
          <TriangleAlert size={15} className="mt-0.5 shrink-0 text-danger-600" />
          <p className="text-base text-danger-700">
            Some accounts are on a role that no longer exists (Branch Admin or Staff, both
            retired). They are refused by every module, so those people cannot do anything — give
            them a current role, or delete the account.
          </p>
        </div>
      )}

      <DataTable
        columns={columns}
        rows={users}
        rowKey={(u) => u._id}
        loading={loading}
        error={error}
        onRetry={load}
        searchable={(u) => `${u.name} ${u.email} ${u.phone || ""} ${u.role}`}
        searchPlaceholder="Search name, email, role…"
        initialSort={{ key: "name", direction: "asc" }}
        emptyIcon={<UsersRound size={19} />}
        emptyTitle="No admin accounts"
        emptyDescription="Create one so your team can sign in with their own credentials."
        emptyAction={
          <Button variant="primary" icon={<Plus size={15} />} onClick={openCreate}>
            New account
          </Button>
        }
        actions={(u) => [
          { label: "Edit", icon: <Pencil size={14} />, onClick: () => openEdit(u) },
          {
            label: "Reset password",
            icon: <KeyRound size={14} />,
            onClick: () => {
              setPasswordFor(u);
              setNewPassword("");
              setPasswordError(null);
            },
          },
          {
            label: u.isActive ? "Deactivate" : "Activate",
            icon: <Power size={14} />,
            separated: true,
            danger: u.isActive,
            onClick: () => void toggleStatus(u),
          },
          {
            label: "Delete permanently",
            icon: <Trash2 size={14} />,
            danger: true,
            separated: true,
            onClick: () => void handleDelete(u),
          },
        ]}
      />

      <div className="mt-5">
        <RoleReference currentRole={admin?.role} />
      </div>

      {/* ── Create / edit ── */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editingId ? "Edit account" : "New admin account"}
        description={
          editingId
            ? "Role and status changes take effect on their next request."
            : "They can sign in as soon as you save. Share the password with them directly — nothing is emailed."
        }
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" form="admin-user-form" loading={saving}>
              {editingId ? "Save changes" : "Create account"}
            </Button>
          </>
        }
      >
        <form id="admin-user-form" onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <p className="rounded-md border border-danger-100 bg-danger-50 px-3 py-2 text-sm text-danger-700">
              {formError}
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <TextInput
              label="Full name"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <TextInput
              label="Email"
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              hint="This is their login."
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <TextInput
              label="Phone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              hint="Optional."
            />
            {!editingId && (
              <TextInput
                label="Password"
                type="text"
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                hint="At least 8 characters. Shown in plain text so you can copy it — it is never emailed."
              />
            )}
          </div>

          <Select
            label="Role"
            required
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
          >
            {ROLES.map((r) => (
              <option key={r.key} value={r.key}>
                {r.label} — {r.scope}
              </option>
            ))}
          </Select>

          {selectedRole && (
            <p className="rounded-md border border-line bg-surface-hover px-3 py-2.5 text-sm text-ink-600">
              {selectedRole.can}
            </p>
          )}

          {selectedRole?.needsBranch && (
            <TextInput
              label="Branch ID"
              required
              value={form.branchId}
              onChange={(e) => setForm({ ...form, branchId: e.target.value })}
              hint={
                defaultBranchId
                  ? "Prefilled with your only branch. The field stays because the data model is multi-branch by design, even though one branch exists today."
                  : "The branch this account works in. Every role except Super Admin needs one."
              }
            />
          )}

          {selectedRole && (
            <p className="flex items-start gap-2 rounded-md border border-info-100 bg-info-50 px-3 py-2.5 text-sm text-info-700">
              <Info size={14} className="mt-0.5 shrink-0" />
              Business access is fixed by the role — there is nothing extra to assign. This account
              will reach {selectedRole.scope.toLowerCase()} and get a 403 anywhere else, enforced by
              the API rather than by hiding menu items.
            </p>
          )}
        </form>
      </Modal>

      {/* ── Reset password ── */}
      <Modal
        open={Boolean(passwordFor)}
        onClose={() => setPasswordFor(null)}
        title={`Reset password for ${passwordFor?.name || ""}`}
        description="Sets a new password immediately. It is not emailed — hand it over yourself."
        footer={
          <>
            <Button variant="secondary" onClick={() => setPasswordFor(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              form="reset-password-form"
              loading={savingPassword}
            >
              Reset password
            </Button>
          </>
        }
      >
        <form id="reset-password-form" onSubmit={handleResetPassword} className="space-y-4">
          {passwordError && (
            <p className="rounded-md border border-danger-100 bg-danger-50 px-3 py-2 text-sm text-danger-700">
              {passwordError}
            </p>
          )}

          <TextInput
            label="New password"
            type="text"
            required
            autoFocus
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            hint="At least 8 characters. Shown in plain text so you can copy it."
          />

          <p className="rounded-md border border-line bg-surface-hover px-3 py-2.5 text-sm text-ink-600">
            Any outstanding &ldquo;forgot password&rdquo; link they were emailed stops working, so
            an old link can&apos;t be used to set a third password.
          </p>
        </form>
      </Modal>
    </RequireAdmin>
  );
}

/** The role matrix. Shown to everyone — it documents, it does not enforce. */
function RoleReference({ currentRole }: { currentRole?: string }) {
  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h2 className="card-title">Role permissions</h2>
          <p className="card-subtitle">Enforced server-side on every request</p>
        </div>
      </div>
      <div className="table-wrap">
        <table className="dt">
          <thead>
            <tr>
              <th>Role</th>
              <th className="hidden sm:table-cell">Scope</th>
              <th>What it can do</th>
            </tr>
          </thead>
          <tbody>
            {ROLES.map((role) => (
              <tr key={role.key} data-selected={currentRole === role.key}>
                <td>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-ink-800">{role.label}</span>
                    {currentRole === role.key && <Badge tone="brand">You</Badge>}
                  </div>
                  <span className="font-mono text-xs text-ink-500">{role.key}</span>
                </td>
                <td className="hidden sm:table-cell">
                  <Badge tone="neutral">{role.scope}</Badge>
                </td>
                <td>
                  <span className="text-ink-600">{role.can}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="card-footer justify-start">
        <p className="flex items-start gap-2 text-sm text-ink-500">
          <UserRound size={14} className="mt-0.5 shrink-0" />
          Hiding a control in this panel is convenience only — the API re-checks the role, and the
          live account record, on every single request.
        </p>
      </div>
    </div>
  );
}
