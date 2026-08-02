"use client";

import { useEffect, useState } from "react";
import { Info, KeyRound, Mail, ShieldCheck, UserRound } from "lucide-react";
import RequireAdmin from "@/components/RequireAdmin";
import PageHeader from "@/components/ui/PageHeader";
import Badge from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/States";
import { adminApi } from "@/lib/api";
import { useAdminSession } from "@/lib/adminSession";
import { humanise, initials } from "@/lib/format";

interface AdminProfile {
  _id?: string;
  name: string;
  email: string;
  role: string;
  branchId?: string | null;
  createdAt?: string;
}

/**
 * Roles as the backend defines them, with what each one can actually do.
 *
 * These descriptions mirror `requireRole(...)` usage in hotel.routes.ts and
 * restaurant.routes.ts. They are documentation, not enforcement — RBAC is
 * server-side only and this page cannot change it.
 */
const ROLES = [
  {
    key: "super_admin",
    label: "Super Admin",
    scope: "All branches",
    can: "Full access: create and edit properties, rooms, menus, dining areas, content and bookings.",
  },
  {
    key: "branch_admin",
    label: "Branch Admin",
    scope: "Their own branch",
    can: "Same management rights as Super Admin, limited to the branch they belong to.",
  },
  {
    key: "staff",
    label: "Staff",
    scope: "Read-only",
    can: "View bookings, reservations, availability and reviews. Cannot create, edit or delete.",
  },
];

/**
 * Account and roles.
 *
 * The backend deliberately has no admin signup route and no route that lists
 * admins — accounts are provisioned internally (see the seeder). So this page
 * shows the signed-in account from `GET /auth/admin/me` and documents the role
 * model, rather than pretending to offer user management that does not exist.
 */
export default function UsersPage() {
  const { admin } = useAdminSession();
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const res = await adminApi.get<AdminProfile>("/auth/admin/me");
      if (cancelled) return;
      // Fall back to the locally stored identity if /me is unavailable.
      if (res.success && res.data) setProfile(res.data);
      else if (admin) setProfile(admin);
      setLoading(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [admin]);

  return (
    <RequireAdmin>
      <PageHeader
        title="Users and roles"
        description="Your account, and what each admin role is allowed to do."
        breadcrumbs={[{ label: "Users" }]}
      />

      <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-info-100 bg-info-50 px-4 py-2.5">
        <Info size={15} className="mt-0.5 shrink-0 text-info-600" />
        <p className="text-base text-info-700">
          Admin accounts are provisioned internally — there is no signup route and no endpoint that
          lists admins, so this page cannot create, edit or remove them. New accounts are seeded
          server-side.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card lg:col-span-1">
          <div className="card-header">
            <h2 className="card-title">Your account</h2>
          </div>
          <div className="card-body">
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-14 w-14 rounded-full" />
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-3 w-48" />
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-600 text-md font-semibold text-white">
                    {initials(profile?.name)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-md font-semibold text-ink-800">
                      {profile?.name || "Admin"}
                    </p>
                    <p className="truncate text-sm text-ink-500">{profile?.email}</p>
                  </div>
                </div>

                <dl className="mt-4 divide-y divide-line-subtle rounded-lg border border-line">
                  <div className="flex items-center justify-between gap-4 px-3.5 py-2.5">
                    <dt className="flex items-center gap-1.5 text-sm text-ink-500">
                      <ShieldCheck size={13} />
                      Role
                    </dt>
                    <dd>
                      <Badge tone="brand">{profile ? humanise(profile.role) : "—"}</Badge>
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-4 px-3.5 py-2.5">
                    <dt className="flex items-center gap-1.5 text-sm text-ink-500">
                      <Mail size={13} />
                      Email
                    </dt>
                    <dd className="min-w-0 truncate text-base text-ink-800">{profile?.email}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-4 px-3.5 py-2.5">
                    <dt className="flex items-center gap-1.5 text-sm text-ink-500">
                      <UserRound size={13} />
                      Branch
                    </dt>
                    <dd className="text-base text-ink-800">
                      {profile?.role === "super_admin"
                        ? "All branches"
                        : profile?.branchId || "—"}
                    </dd>
                  </div>
                </dl>

                <div className="mt-4 flex items-start gap-2 rounded-md border border-line bg-surface-hover px-3 py-2.5">
                  <KeyRound size={14} className="mt-0.5 shrink-0 text-ink-500" />
                  <p className="text-sm text-ink-600">
                    Forgot your password? Use the reset flow at{" "}
                    <span className="font-mono text-xs">/auth/admin/forgot-password</span>, or ask a
                    Super Admin.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="card lg:col-span-2">
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
                  <tr key={role.key} data-selected={profile?.role === role.key}>
                    <td>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-ink-800">{role.label}</span>
                        {profile?.role === role.key && <Badge tone="brand">You</Badge>}
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
            <p className="text-sm text-ink-500">
              Hiding a control in this panel is a convenience only — the API re-checks the role on
              every request.
            </p>
          </div>
        </div>
      </div>
    </RequireAdmin>
  );
}
