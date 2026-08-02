"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BedDouble, ExternalLink, Eye, Plus, PowerOff } from "lucide-react";
import RequireAdmin from "@/components/RequireAdmin";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import DataTable, { Column } from "@/components/ui/DataTable";
import { TextArea, TextInput } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { adminApi, formatApiError, publicGet } from "@/lib/api";
import { useBusiness } from "@/lib/businessContext";
import { slugify } from "@/lib/format";

const PUBLIC_SITE_URL = process.env.NEXT_PUBLIC_FRONTEND_URL || "http://localhost:3000";

interface Hotel {
  _id: string;
  name: string;
  slug: string;
  address: string;
  contactPhone?: string;
  contactEmail?: string;
  starRating?: number;
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
};

export default function AdminHotelsPage() {
  const router = useRouter();
  const { toastSuccess, toastError } = useToast();
  const confirm = useConfirm();
  const { reload: reloadBusinesses } = useBusiness();

  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);

  const loadHotelsList = useCallback(async () => {
    setLoading(true);
    setError(null);
    // Public listing endpoint returns active hotels; admin uses the same data
    // source (there is no admin-side list route) — unchanged from before.
    const res = await publicGet<Hotel[]>("/hotels");
    if (!res.success) setError(res.message || "Could not load hotels.");
    setHotels(res.success ? res.data || [] : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadHotelsList();
  }, [loadHotelsList]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSaving(true);

    const res = await adminApi.post("/admin/hotels", form);
    setSaving(false);

    if (!res.success) {
      setFormError(formatApiError(res));
      return;
    }

    setShowForm(false);
    setForm(EMPTY_FORM);
    setSlugTouched(false);
    toastSuccess(`${form.name} created.`);
    void loadHotelsList();
    reloadBusinesses();
  }

  async function handleDeactivate(hotel: Hotel) {
    const ok = await confirm({
      title: `Deactivate ${hotel.name}?`,
      description:
        "The hotel is hidden from the public site but nothing is deleted. Deactivation is blocked while active rooms or bookings still exist.",
      confirmLabel: "Deactivate",
      danger: true,
    });
    if (!ok) return;

    const res = await adminApi.delete(`/admin/hotels/${hotel._id}`);
    if (!res.success) {
      toastError(formatApiError(res));
      return;
    }
    toastSuccess(`${hotel.name} deactivated.`);
    void loadHotelsList();
    reloadBusinesses();
  }

  const columns: Column<Hotel>[] = [
    {
      key: "name",
      header: "Hotel",
      sortable: true,
      accessor: (h) => h.name,
      render: (h) => (
        <div className="min-w-0">
          <Link
            href={`/hotels/${h._id}`}
            className="block truncate font-medium text-ink-800 hover:text-brand-700 hover:underline"
          >
            {h.name}
          </Link>
          <span className="block truncate font-mono text-xs text-ink-500">/{h.slug}</span>
        </div>
      ),
    },
    {
      key: "address",
      header: "Address",
      accessor: (h) => h.address,
      hideBelow: "md",
      render: (h) => <span className="line-clamp-2 text-ink-600">{h.address}</span>,
    },
    {
      key: "rating",
      header: "Rating",
      accessor: (h) => h.starRating ?? 0,
      sortable: true,
      hideBelow: "lg",
      render: (h) =>
        h.starRating ? (
          <span className="whitespace-nowrap text-warning-600" title={`${h.starRating} star`}>
            {"★".repeat(h.starRating)}
          </span>
        ) : (
          <span className="text-ink-400">—</span>
        ),
    },
    {
      key: "status",
      header: "Status",
      accessor: (h) => (h.isActive ? "active" : "inactive"),
      sortable: true,
      render: (h) => <Badge status={h.isActive ? "active" : "inactive"} />,
    },
  ];

  return (
    <RequireAdmin>
      <PageHeader
        title="Hotel properties"
        description="Each property carries its own rooms, availability, media and content."
        breadcrumbs={[{ label: "Hotel" }]}
        actions={
          <Button variant="primary" icon={<Plus size={15} />} onClick={() => setShowForm(true)}>
            New hotel
          </Button>
        }
      />

      <DataTable
        columns={columns}
        rows={hotels}
        rowKey={(h) => h._id}
        loading={loading}
        error={error}
        onRetry={loadHotelsList}
        searchable={(h) => `${h.name} ${h.slug} ${h.address}`}
        searchPlaceholder="Search hotels…"
        initialSort={{ key: "name", direction: "asc" }}
        onRowClick={(h) => router.push(`/hotels/${h._id}`)}
        emptyIcon={<BedDouble size={19} />}
        emptyTitle="No hotels yet"
        emptyDescription="Create your first property to start adding rooms and taking bookings."
        emptyAction={
          <Button variant="primary" icon={<Plus size={15} />} onClick={() => setShowForm(true)}>
            New hotel
          </Button>
        }
        actions={(h) => [
          {
            label: "Manage",
            icon: <Eye size={14} />,
            onClick: () => router.push(`/hotels/${h._id}`),
          },
          {
            label: "View public page",
            icon: <ExternalLink size={14} />,
            onClick: () => window.open(`${PUBLIC_SITE_URL}/hotel`, "_blank", "noreferrer"),
          },
          {
            label: "Deactivate",
            icon: <PowerOff size={14} />,
            danger: true,
            separated: true,
            disabled: !h.isActive,
            onClick: () => void handleDeactivate(h),
          },
        ]}
      />

      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title="New hotel property"
        description="You can add rooms, media and content after the property exists."
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" form="new-hotel-form" loading={saving}>
              Create hotel
            </Button>
          </>
        }
      >
        <form id="new-hotel-form" onSubmit={handleCreate} className="space-y-4">
          {formError && (
            <p className="rounded-md border border-danger-100 bg-danger-50 px-3 py-2 text-sm text-danger-700">
              {formError}
            </p>
          )}

          <TextInput
            label="Hotel name"
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
            placeholder="7 Vachan Grand"
          />

          <TextInput
            label="URL slug"
            required
            value={form.slug}
            onChange={(e) => {
              setSlugTouched(true);
              setForm({ ...form, slug: e.target.value });
            }}
            hint="Lowercase letters, numbers and hyphens. Becomes part of the public URL."
            placeholder="7-vachan-grand"
          />

          <TextInput
            label="Branch ID"
            required
            value={form.branchId}
            onChange={(e) => setForm({ ...form, branchId: e.target.value })}
            hint="Every property belongs to a branch — the platform stays multi-tenant even with one property."
          />

          <TextArea
            label="Description"
            required
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Shown on the public property page."
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

          <p className="rounded-md border border-line bg-surface-hover px-3 py-2 text-sm text-ink-600">
            Star rating, SEO metadata and media are set from the property page once it exists.
          </p>
        </form>
      </Modal>
    </RequireAdmin>
  );
}
