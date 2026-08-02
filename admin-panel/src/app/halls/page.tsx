"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink, Eye, PartyPopper, Plus, PowerOff, Users } from "lucide-react";
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
import { slugify } from "@/lib/format";

const PUBLIC_SITE_URL = process.env.NEXT_PUBLIC_FRONTEND_URL || "http://localhost:3000";

interface Hall {
  _id: string;
  name: string;
  slug: string;
  tagline?: string;
  address: string;
  seatedCapacity: number;
  floatingCapacity: number;
  eventTypes?: string[];
  isActive: boolean;
}

const EMPTY_FORM = {
  branchId: "",
  name: "",
  slug: "",
  tagline: "",
  description: "",
  address: "",
  contactPhone: "",
  contactEmail: "",
  seatedCapacity: "",
  floatingCapacity: "",
  eventTypes: "",
  minimumNoticeDays: "7",
};

export default function AdminHallsPage() {
  const router = useRouter();
  const { toastSuccess, toastError } = useToast();
  const confirm = useConfirm();
  const { reload: reloadBusinesses } = useBusiness();

  const [halls, setHalls] = useState<Hall[]>([]);
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
    // Public listing endpoint — the admin router exposes no list route, the same
    // arrangement Hotel and Restaurant use.
    const res = await publicGet<Hall[]>("/halls");
    if (!res.success) setError(res.message || "Could not load venues.");
    setHalls(res.success ? res.data || [] : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSaving(true);

    const res = await adminApi.post("/admin/halls", {
      branchId: form.branchId,
      name: form.name,
      slug: form.slug,
      tagline: form.tagline || undefined,
      description: form.description,
      address: form.address,
      contactPhone: form.contactPhone,
      contactEmail: form.contactEmail,
      seatedCapacity: Number(form.seatedCapacity),
      floatingCapacity: Number(form.floatingCapacity),
      eventTypes: form.eventTypes
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean),
      minimumNoticeDays: form.minimumNoticeDays ? Number(form.minimumNoticeDays) : undefined,
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

  async function handleDeactivate(hall: Hall) {
    const ok = await confirm({
      title: `Deactivate ${hall.name}?`,
      description:
        "The venue is hidden from the public site but nothing is deleted. Deactivation is refused while open enquiries still exist — close or decline them first.",
      confirmLabel: "Deactivate",
      danger: true,
    });
    if (!ok) return;

    const res = await adminApi.delete(`/admin/halls/${hall._id}`);
    if (!res.success) {
      toastError(formatApiError(res));
      return;
    }
    toastSuccess(`${hall.name} deactivated.`);
    void loadList();
    reloadBusinesses();
  }

  const columns: Column<Hall>[] = [
    {
      key: "name",
      header: "Venue",
      sortable: true,
      accessor: (h) => h.name,
      render: (h) => (
        <div className="min-w-0">
          <Link
            href={`/halls/${h._id}`}
            className="block truncate font-medium text-ink-800 hover:text-brand-700 hover:underline"
          >
            {h.name}
          </Link>
          <span className="block truncate text-xs text-ink-500">
            {h.tagline || `/${h.slug}`}
          </span>
        </div>
      ),
    },
    {
      key: "capacity",
      header: "Capacity",
      sortable: true,
      accessor: (h) => h.floatingCapacity,
      align: "right",
      render: (h) => (
        <span className="whitespace-nowrap tabular-nums">
          {h.seatedCapacity.toLocaleString("en-IN")}
          <span className="text-xs text-ink-500"> seated</span>
          {" · "}
          {h.floatingCapacity.toLocaleString("en-IN")}
          <span className="text-xs text-ink-500"> floating</span>
        </span>
      ),
    },
    {
      key: "events",
      header: "Event types",
      accessor: (h) => (h.eventTypes || []).join(", "),
      hideBelow: "lg",
      render: (h) =>
        h.eventTypes && h.eventTypes.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {h.eventTypes.slice(0, 3).map((t) => (
              <Badge key={t} tone="neutral">
                {t}
              </Badge>
            ))}
            {h.eventTypes.length > 3 && (
              <span className="text-xs text-ink-500">+{h.eventTypes.length - 3}</span>
            )}
          </div>
        ) : (
          <span className="text-ink-400">—</span>
        ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      accessor: (h) => (h.isActive ? "active" : "inactive"),
      render: (h) => <Badge status={h.isActive ? "active" : "inactive"} />,
    },
  ];

  return (
    <RequireAdmin>
      <PageHeader
        title="Marriage Hall venues"
        description="Packages, decoration, catering, gallery and the enquiry calendar all hang off a venue."
        breadcrumbs={[{ label: "Marriage Hall" }]}
        actions={
          <Button variant="primary" icon={<Plus size={15} />} onClick={() => setShowForm(true)}>
            New venue
          </Button>
        }
      />

      <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-info-100 bg-info-50 px-4 py-2.5">
        <PartyPopper size={15} className="mt-0.5 shrink-0 text-info-600" />
        <p className="text-base text-info-700">
          Hall bookings are approval-first: a family submits an enquiry, nothing is reserved or
          charged, and the date is held only when you set that enquiry to{" "}
          <strong>confirmed</strong>. This is different from Hotel, where payment confirms
          instantly.
        </p>
      </div>

      <DataTable
        columns={columns}
        rows={halls}
        rowKey={(h) => h._id}
        loading={loading}
        error={error}
        onRetry={loadList}
        searchable={(h) => `${h.name} ${h.slug} ${h.address} ${(h.eventTypes || []).join(" ")}`}
        searchPlaceholder="Search venues…"
        initialSort={{ key: "name", direction: "asc" }}
        onRowClick={(h) => router.push(`/halls/${h._id}`)}
        emptyIcon={<PartyPopper size={19} />}
        emptyTitle="No venues yet"
        emptyDescription="Create the venue, then add its packages, decoration themes, catering and gallery."
        emptyAction={
          <Button variant="primary" icon={<Plus size={15} />} onClick={() => setShowForm(true)}>
            New venue
          </Button>
        }
        actions={(h) => [
          { label: "Manage", icon: <Eye size={14} />, onClick: () => router.push(`/halls/${h._id}`) },
          {
            label: "View public page",
            icon: <ExternalLink size={14} />,
            onClick: () => window.open(`${PUBLIC_SITE_URL}/marriage-hall`, "_blank", "noreferrer"),
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
        title="New marriage hall"
        description="Content, media and the calendar are added after the venue exists."
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" form="new-hall-form" loading={saving}>
              Create venue
            </Button>
          </>
        }
      >
        <form id="new-hall-form" onSubmit={handleCreate} className="space-y-4">
          {formError && (
            <p className="rounded-md border border-danger-100 bg-danger-50 px-3 py-2 text-sm text-danger-700">
              {formError}
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <TextInput
              label="Venue name"
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
              placeholder="7 Vachan Banquets"
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
            hint="The same branch the hotel and restaurant belong to, for a single-property estate."
          />

          <TextInput
            label="Tagline"
            value={form.tagline}
            onChange={(e) => setForm({ ...form, tagline: e.target.value })}
            placeholder="Where your forever begins"
            hint="One line under the venue name on the landing page."
          />

          <TextArea
            label="Description"
            required
            rows={4}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            hint="At least 10 characters. The opening paragraph on the public page."
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

          <div className="grid gap-4 sm:grid-cols-2">
            <TextInput
              label="Seated capacity"
              type="number"
              min={0}
              required
              value={form.seatedCapacity}
              onChange={(e) => setForm({ ...form, seatedCapacity: e.target.value })}
              hint="Guests seated for a meal."
            />
            <TextInput
              label="Floating capacity"
              type="number"
              min={0}
              required
              value={form.floatingCapacity}
              onChange={(e) => setForm({ ...form, floatingCapacity: e.target.value })}
              hint="Standing / mixed. This is the cap the enquiry form validates against."
            />
          </div>

          <Accordion title="Optional now" description="All of this can be set later">
            <div className="space-y-4">
              <TextInput
                label="Event types"
                value={form.eventTypes}
                onChange={(e) => setForm({ ...form, eventTypes: e.target.value })}
                placeholder="Wedding, Reception, Engagement, Haldi, Mehendi, Sangeet"
                hint="Comma-separated. These become the choices on the public enquiry form."
              />
              <TextInput
                label="Minimum notice"
                type="number"
                min={0}
                max={365}
                value={form.minimumNoticeDays}
                onChange={(e) => setForm({ ...form, minimumNoticeDays: e.target.value })}
                hint="Days of lead time the venue needs. Earlier dates aren't selectable on the public calendar."
                wrapperClassName="sm:max-w-[12rem]"
              />
            </div>
          </Accordion>

          <p className="flex items-start gap-2 rounded-md border border-line bg-surface-hover px-3 py-2.5 text-sm text-ink-600">
            <Users size={14} className="mt-0.5 shrink-0" />
            Spaces, features, hero images and SEO metadata are edited from the venue page once it
            exists.
          </p>
        </form>
      </Modal>
    </RequireAdmin>
  );
}
