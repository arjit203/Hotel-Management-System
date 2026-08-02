"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink, Eye, Plus, PowerOff, UtensilsCrossed } from "lucide-react";
import RequireAdmin from "@/components/RequireAdmin";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import Accordion from "@/components/ui/Accordion";
import DataTable, { Column } from "@/components/ui/DataTable";
import { TextArea, TextInput } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { adminApi, formatApiError, publicGet } from "@/lib/api";
import { useBusiness } from "@/lib/businessContext";
import { currency, slugify } from "@/lib/format";

const PUBLIC_SITE_URL = process.env.NEXT_PUBLIC_FRONTEND_URL || "http://localhost:3000";

interface Restaurant {
  _id: string;
  name: string;
  slug: string;
  address: string;
  cuisineTypes?: string[];
  averageCostForTwo?: number;
  maxPartySize?: number;
  isActive: boolean;
}

const EMPTY_FORM = {
  branchId: "",
  name: "",
  slug: "",
  description: "",
  address: "",
  contactPhone: "",
  contactEmail: "",
  cuisineTypes: "",
  reservationSlots: "",
  maxPartySize: "",
  averageCostForTwo: "",
};

export default function AdminRestaurantsPage() {
  const router = useRouter();
  const { toastSuccess, toastError } = useToast();
  const confirm = useConfirm();
  const { reload: reloadBusinesses } = useBusiness();

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);

  const loadList = useCallback(async () => {
    setLoading(true);
    setError(null);
    // Public listing endpoint — the admin router exposes no list route, same
    // arrangement the Hotel module uses.
    const res = await publicGet<Restaurant[]>("/restaurants");
    if (!res.success) setError(res.message || "Could not load restaurants.");
    setRestaurants(res.success ? res.data || [] : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  function toList(value: string): string[] {
    return value
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const slots = toList(form.reservationSlots);
    const badSlot = slots.find((s) => !/^([01]\d|2[0-3]):[0-5]\d$/.test(s));
    if (badSlot) {
      setFormError(`“${badSlot}” isn't a valid time. Use 24-hour HH:MM, e.g. 19:30.`);
      return;
    }

    setSaving(true);
    const res = await adminApi.post("/admin/restaurants", {
      branchId: form.branchId,
      name: form.name,
      slug: form.slug,
      description: form.description,
      address: form.address,
      contactPhone: form.contactPhone,
      contactEmail: form.contactEmail,
      cuisineTypes: toList(form.cuisineTypes),
      reservationSlots: slots.length > 0 ? slots : undefined,
      maxPartySize: form.maxPartySize ? Number(form.maxPartySize) : undefined,
      averageCostForTwo: form.averageCostForTwo ? Number(form.averageCostForTwo) : undefined,
    });
    setSaving(false);

    if (!res.success) {
      setFormError(formatApiError(res));
      return;
    }

    toastSuccess(`${form.name} created.`);
    setShowForm(false);
    setForm(EMPTY_FORM);
    setSlugTouched(false);
    void loadList();
    reloadBusinesses();
  }

  async function handleDeactivate(restaurant: Restaurant) {
    const ok = await confirm({
      title: `Deactivate ${restaurant.name}?`,
      description:
        "The restaurant is hidden from the public site but nothing is deleted. Deactivation is blocked while dependent records still exist.",
      confirmLabel: "Deactivate",
      danger: true,
    });
    if (!ok) return;

    const res = await adminApi.delete(`/admin/restaurants/${restaurant._id}`);
    if (!res.success) {
      toastError(formatApiError(res));
      return;
    }
    toastSuccess(`${restaurant.name} deactivated.`);
    void loadList();
    reloadBusinesses();
  }

  const columns: Column<Restaurant>[] = [
    {
      key: "name",
      header: "Restaurant",
      sortable: true,
      accessor: (r) => r.name,
      render: (r) => (
        <div className="min-w-0">
          <Link
            href={`/restaurants/${r._id}`}
            className="block truncate font-medium text-ink-800 hover:text-brand-700 hover:underline"
          >
            {r.name}
          </Link>
          <span className="block truncate font-mono text-xs text-ink-500">/{r.slug}</span>
        </div>
      ),
    },
    {
      key: "cuisine",
      header: "Cuisine",
      accessor: (r) => (r.cuisineTypes || []).join(", "),
      hideBelow: "md",
      render: (r) =>
        r.cuisineTypes && r.cuisineTypes.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {r.cuisineTypes.slice(0, 3).map((c) => (
              <Badge key={c} tone="neutral">
                {c}
              </Badge>
            ))}
            {r.cuisineTypes.length > 3 && (
              <span className="text-xs text-ink-500">+{r.cuisineTypes.length - 3}</span>
            )}
          </div>
        ) : (
          <span className="text-ink-400">—</span>
        ),
    },
    {
      key: "cost",
      header: "Cost for two",
      sortable: true,
      accessor: (r) => r.averageCostForTwo ?? 0,
      align: "right",
      hideBelow: "lg",
      render: (r) =>
        r.averageCostForTwo ? (
          <span className="tabular-nums">{currency(r.averageCostForTwo)}</span>
        ) : (
          <span className="text-ink-400">—</span>
        ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      accessor: (r) => (r.isActive ? "active" : "inactive"),
      render: (r) => <Badge status={r.isActive ? "active" : "inactive"} />,
    },
  ];

  return (
    <RequireAdmin>
      <PageHeader
        title="Restaurant properties"
        description="Each restaurant carries its own menu, dining areas, reservations and content."
        breadcrumbs={[{ label: "Restaurant" }]}
        actions={
          <Button variant="primary" icon={<Plus size={15} />} onClick={() => setShowForm(true)}>
            New restaurant
          </Button>
        }
      />

      <DataTable
        columns={columns}
        rows={restaurants}
        rowKey={(r) => r._id}
        loading={loading}
        error={error}
        onRetry={loadList}
        searchable={(r) => `${r.name} ${r.slug} ${r.address} ${(r.cuisineTypes || []).join(" ")}`}
        searchPlaceholder="Search restaurants…"
        initialSort={{ key: "name", direction: "asc" }}
        onRowClick={(r) => router.push(`/restaurants/${r._id}`)}
        emptyIcon={<UtensilsCrossed size={19} />}
        emptyTitle="No restaurants yet"
        emptyDescription="Create a restaurant to start building its menu and taking table reservations."
        emptyAction={
          <Button variant="primary" icon={<Plus size={15} />} onClick={() => setShowForm(true)}>
            New restaurant
          </Button>
        }
        actions={(r) => [
          {
            label: "Manage",
            icon: <Eye size={14} />,
            onClick: () => router.push(`/restaurants/${r._id}`),
          },
          {
            label: "View public page",
            icon: <ExternalLink size={14} />,
            onClick: () => window.open(`${PUBLIC_SITE_URL}/restaurant`, "_blank", "noreferrer"),
          },
          {
            label: "Deactivate",
            icon: <PowerOff size={14} />,
            danger: true,
            separated: true,
            disabled: !r.isActive,
            onClick: () => void handleDeactivate(r),
          },
        ]}
      />

      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title="New restaurant"
        description="Menu, dining areas and media are added after the property exists."
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" form="new-restaurant-form" loading={saving}>
              Create restaurant
            </Button>
          </>
        }
      >
        <form id="new-restaurant-form" onSubmit={handleCreate} className="space-y-4">
          {formError && (
            <p className="rounded-md border border-danger-100 bg-danger-50 px-3 py-2 text-sm text-danger-700">
              {formError}
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <TextInput
              label="Restaurant name"
              required
              value={form.name}
              onChange={(e) => {
                const name = e.target.value;
                setForm((prev) => ({
                  ...prev,
                  name,
                  slug: slugTouched ? prev.slug : slugify(name),
                }));
              }}
              placeholder="Saffron by 7 Vachan"
            />
            <TextInput
              label="URL slug"
              required
              value={form.slug}
              onChange={(e) => {
                setSlugTouched(true);
                setForm({ ...form, slug: e.target.value });
              }}
              hint="Lowercase, numbers and hyphens."
            />
          </div>

          <TextInput
            label="Branch ID"
            required
            value={form.branchId}
            onChange={(e) => setForm({ ...form, branchId: e.target.value })}
            hint="Every property belongs to a branch — the platform stays multi-tenant with one property."
          />

          <TextArea
            label="Description"
            required
            rows={3}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            hint="At least 10 characters. Shown on the public restaurant page."
          />

          <TextInput
            label="Address"
            required
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <TextInput
              label="Contact phone"
              required
              value={form.contactPhone}
              onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
            />
            <TextInput
              label="Contact email"
              type="email"
              required
              value={form.contactEmail}
              onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
            />
          </div>

          <Accordion
            title="Dining and reservation setup"
            description="Optional now — all of it can be changed later"
          >
            <div className="space-y-4">
              <TextInput
                label="Cuisine types"
                value={form.cuisineTypes}
                onChange={(e) => setForm({ ...form, cuisineTypes: e.target.value })}
                placeholder="North Indian, Mughlai, Continental"
                hint="Comma-separated."
              />
              <TextInput
                label="Reservation time slots"
                value={form.reservationSlots}
                onChange={(e) => setForm({ ...form, reservationSlots: e.target.value })}
                placeholder="12:30, 13:30, 19:30, 20:30"
                hint="Comma-separated, 24-hour HH:MM. Guests can only book these times."
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <TextInput
                  label="Max party size"
                  type="number"
                  min={1}
                  value={form.maxPartySize}
                  onChange={(e) => setForm({ ...form, maxPartySize: e.target.value })}
                  hint="Defaults to 12 if left blank."
                />
                <TextInput
                  label="Average cost for two"
                  type="number"
                  min={0}
                  value={form.averageCostForTwo}
                  onChange={(e) => setForm({ ...form, averageCostForTwo: e.target.value })}
                  hint="₹, shown on listings."
                />
              </div>
            </div>
          </Accordion>

          <p className="rounded-md border border-line bg-surface-hover px-3 py-2 text-sm text-ink-600">
            Table reservations take no payment — online food ordering is a later phase, so there is
            no cart or checkout here.
          </p>
        </form>
      </Modal>
    </RequireAdmin>
  );
}
