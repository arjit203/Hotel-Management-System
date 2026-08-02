"use client";

import { useState } from "react";
import { Copy, Crown, Layers, Pencil, Plus, Trash2 } from "lucide-react";
import { adminApi, formatApiError, uploadHallImage } from "@/lib/api";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import DataTable, { Column } from "@/components/ui/DataTable";
import ImageUploader from "@/components/ui/ImageUploader";
import { TextArea, TextInput, Toggle } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { slugify } from "@/lib/format";

export interface HallPackage {
  _id: string;
  name: string;
  slug: string;
  tagline?: string;
  description: string;
  inclusions: string[];
  highlights: string[];
  priceLabel: string;
  suitableForMinGuests?: number;
  suitableForMaxGuests?: number;
  imageUrl?: string;
  images: string[];
  isFeatured: boolean;
  displayOrder: number;
}

const EMPTY = {
  name: "",
  slug: "",
  tagline: "",
  description: "",
  inclusions: "",
  highlights: "",
  priceLabel: "On request",
  suitableForMinGuests: "",
  suitableForMaxGuests: "",
  isFeatured: false,
  displayOrder: "0",
};

/**
 * Hall package tiers.
 *
 * ── Pricing is a free-text label, not a number ──
 * `priceLabel` is a plain string because the owner has not set pricing and may
 * never want a single figure on the site ("Starting from ₹X per plate", "On
 * request", "Quoted per event" are all valid). A numeric field would push a
 * placeholder onto the public page and force a schema change the day the
 * pricing model turns out to be per-plate rather than per-event.
 *
 * The form says as much, so nobody later "fixes" it by typing a bare number and
 * assuming the site will format it.
 */
export default function PackagesPanel({
  hallId,
  packages,
  loading,
  onChanged,
}: {
  hallId: string;
  packages: HallPackage[];
  loading?: boolean;
  onChanged: () => void;
}) {
  const { toastSuccess, toastError } = useToast();
  const confirm = useConfirm();

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [images, setImages] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);

  function toLines(value: string): string[] {
    return value
      .split("\n")
      .map((v) => v.trim())
      .filter(Boolean);
  }

  function openCreate(prefill?: HallPackage) {
    setEditingId(null);
    setForm({
      name: prefill ? `${prefill.name} (copy)` : "",
      slug: prefill ? `${prefill.slug}-copy` : "",
      tagline: prefill?.tagline ?? "",
      description: prefill?.description ?? "",
      inclusions: (prefill?.inclusions ?? []).join("\n"),
      highlights: (prefill?.highlights ?? []).join("\n"),
      priceLabel: prefill?.priceLabel ?? "On request",
      suitableForMinGuests: prefill?.suitableForMinGuests?.toString() ?? "",
      suitableForMaxGuests: prefill?.suitableForMaxGuests?.toString() ?? "",
      isFeatured: false,
      displayOrder: String(prefill?.displayOrder ?? packages.length),
    });
    setImages(prefill?.imageUrl ? [prefill.imageUrl] : []);
    setSlugTouched(Boolean(prefill));
    setFormError(null);
    setOpen(true);
  }

  function openEdit(pkg: HallPackage) {
    setEditingId(pkg._id);
    setForm({
      name: pkg.name,
      slug: pkg.slug,
      tagline: pkg.tagline ?? "",
      description: pkg.description,
      inclusions: pkg.inclusions.join("\n"),
      highlights: pkg.highlights.join("\n"),
      priceLabel: pkg.priceLabel,
      suitableForMinGuests: pkg.suitableForMinGuests?.toString() ?? "",
      suitableForMaxGuests: pkg.suitableForMaxGuests?.toString() ?? "",
      isFeatured: pkg.isFeatured,
      displayOrder: String(pkg.displayOrder ?? 0),
    });
    setImages(pkg.imageUrl ? [pkg.imageUrl] : []);
    setSlugTouched(true);
    setFormError(null);
    setOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const min = form.suitableForMinGuests ? Number(form.suitableForMinGuests) : undefined;
    const max = form.suitableForMaxGuests ? Number(form.suitableForMaxGuests) : undefined;
    if (min !== undefined && max !== undefined && min > max) {
      setFormError("Minimum guest count cannot exceed the maximum.");
      return;
    }

    setSaving(true);
    const payload = {
      name: form.name,
      slug: form.slug,
      tagline: form.tagline || undefined,
      description: form.description,
      inclusions: toLines(form.inclusions),
      highlights: toLines(form.highlights),
      priceLabel: form.priceLabel || "On request",
      suitableForMinGuests: min,
      suitableForMaxGuests: max,
      imageUrl: images[0] || undefined,
      isFeatured: form.isFeatured,
      displayOrder: form.displayOrder ? Number(form.displayOrder) : undefined,
    };

    const res = editingId
      ? await adminApi.put(`/admin/halls/packages/${editingId}`, payload)
      : await adminApi.post(`/admin/halls/${hallId}/packages`, payload);
    setSaving(false);

    if (!res.success) {
      setFormError(formatApiError(res));
      return;
    }

    toastSuccess(editingId ? "Package updated." : "Package created.");
    setOpen(false);
    onChanged();
  }

  async function handleDelete(pkg: HallPackage) {
    const ok = await confirm({
      title: `Remove the ${pkg.name} package?`,
      description:
        "It disappears from the public site. Enquiries that already referenced it keep the package name they were submitted with.",
      confirmLabel: "Remove",
      danger: true,
    });
    if (!ok) return;

    const res = await adminApi.delete(`/admin/halls/packages/${pkg._id}`);
    if (!res.success) {
      toastError(formatApiError(res));
      return;
    }
    toastSuccess("Package removed.");
    onChanged();
  }

  const columns: Column<HallPackage>[] = [
    {
      key: "name",
      header: "Package",
      sortable: true,
      accessor: (p) => p.name,
      render: (p) => (
        <div className="flex min-w-0 items-center gap-2.5">
          {p.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={p.imageUrl}
              alt=""
              className="h-9 w-12 shrink-0 rounded border border-line object-cover"
            />
          ) : (
            <span className="flex h-9 w-12 shrink-0 items-center justify-center rounded border border-line bg-surface-muted text-ink-400">
              <Layers size={13} />
            </span>
          )}
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 truncate font-medium text-ink-800">
              {p.name}
              {p.isFeatured && <Crown size={12} className="shrink-0 text-brand-600" />}
            </p>
            <p className="truncate text-xs text-ink-500">{p.tagline || `/${p.slug}`}</p>
          </div>
        </div>
      ),
    },
    {
      key: "guests",
      header: "Guests",
      sortable: true,
      accessor: (p) => p.suitableForMaxGuests ?? 0,
      align: "right",
      hideBelow: "md",
      render: (p) =>
        p.suitableForMinGuests || p.suitableForMaxGuests ? (
          <span className="whitespace-nowrap tabular-nums">
            {p.suitableForMinGuests ?? "—"}–{p.suitableForMaxGuests ?? "—"}
          </span>
        ) : (
          <span className="text-ink-400">—</span>
        ),
    },
    {
      key: "inclusions",
      header: "Inclusions",
      sortable: true,
      accessor: (p) => p.inclusions.length,
      align: "right",
      hideBelow: "lg",
      render: (p) => <span className="tabular-nums">{p.inclusions.length}</span>,
    },
    {
      key: "price",
      header: "Price label",
      accessor: (p) => p.priceLabel,
      render: (p) => <Badge tone="neutral">{p.priceLabel}</Badge>,
    },
    {
      key: "order",
      header: "Order",
      sortable: true,
      accessor: (p) => p.displayOrder ?? 0,
      align: "right",
      hideBelow: "lg",
      render: (p) => <span className="tabular-nums text-ink-500">{p.displayOrder ?? 0}</span>,
    },
  ];

  return (
    <>
      <DataTable
        columns={columns}
        rows={packages}
        rowKey={(p) => p._id}
        loading={loading}
        searchable={(p) => `${p.name} ${p.slug} ${p.tagline || ""} ${p.description}`}
        searchPlaceholder="Search packages…"
        initialSort={{ key: "order", direction: "asc" }}
        toolbarActions={
          <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={() => openCreate()}>
            New package
          </Button>
        }
        emptyIcon={<Layers size={19} />}
        emptyTitle="No packages yet"
        emptyDescription="Silver, Gold, Premium, Royal — each is a starting point the sales team adjusts per family."
        emptyAction={
          <Button variant="primary" icon={<Plus size={15} />} onClick={() => openCreate()}>
            New package
          </Button>
        }
        actions={(p) => [
          { label: "Edit", icon: <Pencil size={14} />, onClick: () => openEdit(p) },
          { label: "Duplicate", icon: <Copy size={14} />, onClick: () => openCreate(p) },
          {
            label: "Remove",
            icon: <Trash2 size={14} />,
            danger: true,
            separated: true,
            onClick: () => void handleDelete(p),
          },
        ]}
      />

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editingId ? "Edit package" : "New package"}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" form="hall-package-form" loading={saving}>
              {editingId ? "Save changes" : "Create package"}
            </Button>
          </>
        }
      >
        <form id="hall-package-form" onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <p className="rounded-md border border-danger-100 bg-danger-50 px-3 py-2 text-sm text-danger-700">
              {formError}
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <TextInput
              label="Package name"
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
              placeholder="Gold"
            />
            <TextInput
              label="Slug"
              required
              value={form.slug}
              onChange={(e) => {
                setSlugTouched(true);
                setForm({ ...form, slug: e.target.value });
              }}
              hint="Lowercase, unique within this hall."
            />
          </div>

          <TextInput
            label="Tagline"
            value={form.tagline}
            onChange={(e) => setForm({ ...form, tagline: e.target.value })}
            placeholder="The complete celebration"
            hint="One short line under the package name."
          />

          <TextArea
            label="Description"
            required
            rows={3}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            hint="At least 10 characters."
          />

          <TextArea
            label="Inclusions"
            rows={7}
            value={form.inclusions}
            onChange={(e) => setForm({ ...form, inclusions: e.target.value })}
            placeholder={
              "Grand Banquet Hall for 8 hours\nThemed stage and mandap decoration\nExtended buffet with four live counters"
            }
            hint="One per line. Rendered as the tick list on the package card."
          />

          <TextArea
            label="Card highlights"
            rows={3}
            value={form.highlights}
            onChange={(e) => setForm({ ...form, highlights: e.target.value })}
            placeholder={"Up to 600 guests\nLawn included\nBridal suite"}
            hint="One per line. Short differentiators — three works best."
          />

          <div className="grid gap-4 sm:grid-cols-3">
            <TextInput
              label="Min guests"
              type="number"
              min={0}
              value={form.suitableForMinGuests}
              onChange={(e) => setForm({ ...form, suitableForMinGuests: e.target.value })}
            />
            <TextInput
              label="Max guests"
              type="number"
              min={0}
              value={form.suitableForMaxGuests}
              onChange={(e) => setForm({ ...form, suitableForMaxGuests: e.target.value })}
            />
            <TextInput
              label="Display order"
              type="number"
              min={0}
              value={form.displayOrder}
              onChange={(e) => setForm({ ...form, displayOrder: e.target.value })}
            />
          </div>

          <TextInput
            label="Price label"
            value={form.priceLabel}
            onChange={(e) => setForm({ ...form, priceLabel: e.target.value })}
            placeholder="On request"
            hint="Free text, shown verbatim on the public card. This is deliberately not a number — write “On request”, “Quoted per event”, or a full phrase like “Starting from ₹1,200 per plate”. Nothing is prefixed or formatted for you."
          />

          <Toggle
            checked={form.isFeatured}
            onChange={(v) => setForm({ ...form, isFeatured: v })}
            label="Mark as most chosen"
            description="Adds the ribbon and gold styling. Use it on one package only."
          />

          <ImageUploader
            label="Package image"
            single
            value={images}
            onChange={setImages}
            folder="packages"
            upload={uploadHallImage}
            hint="One photo per package — the header image on the card."
          />
        </form>
      </Modal>
    </>
  );
}
