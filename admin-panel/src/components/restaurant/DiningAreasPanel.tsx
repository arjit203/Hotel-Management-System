"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Armchair, CalendarOff, Pencil, Plus, Trash2 } from "lucide-react";
import { adminApi, formatApiError, uploadRestaurantImage } from "@/lib/api";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import DataTable, { Column } from "@/components/ui/DataTable";
import ImageUploader from "@/components/ui/ImageUploader";
import { Select, TextArea, TextInput } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { currency, humanise, slugify } from "@/lib/format";

export interface DiningArea {
  _id: string;
  name: string;
  slug: string;
  areaType: "main" | "private" | "family" | "outdoor";
  description: string;
  images?: string[];
  totalTables: number;
  maxPartySize: number;
  minPartySize?: number;
  minimumSpend?: number;
  features?: string[];
}

interface Props {
  restaurantId: string;
  areas: DiningArea[];
  loading?: boolean;
  onChanged: () => void;
}

const AREA_TYPES: DiningArea["areaType"][] = ["main", "private", "family", "outdoor"];

const EMPTY = {
  name: "",
  slug: "",
  areaType: "main" as DiningArea["areaType"],
  description: "",
  totalTables: "1",
  maxPartySize: "4",
  minPartySize: "1",
  minimumSpend: "",
  features: "",
};

/**
 * Dining areas — the unit table reservations are made against.
 *
 * `totalTables` here is what the availability calculation counts down from, so
 * the form spells out the relationship rather than presenting it as a bare
 * number field.
 */
export default function DiningAreasPanel({ restaurantId, areas, loading, onChanged }: Props) {
  const router = useRouter();
  const { toastSuccess, toastError } = useToast();
  const confirm = useConfirm();

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [images, setImages] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY);
    setImages([]);
    setSlugTouched(false);
    setFormError(null);
    setOpen(true);
  }

  function openEdit(area: DiningArea) {
    setEditingId(area._id);
    setForm({
      name: area.name,
      slug: area.slug,
      areaType: area.areaType,
      description: area.description,
      totalTables: String(area.totalTables),
      maxPartySize: String(area.maxPartySize),
      minPartySize: String(area.minPartySize ?? 1),
      minimumSpend: area.minimumSpend != null ? String(area.minimumSpend) : "",
      features: (area.features ?? []).join(", "),
    });
    setImages(area.images ?? []);
    setSlugTouched(true);
    setFormError(null);
    setOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const minParty = Number(form.minPartySize);
    const maxParty = Number(form.maxPartySize);
    if (minParty > maxParty) {
      setFormError("Minimum party size cannot exceed the maximum.");
      return;
    }

    setSaving(true);
    const payload = {
      name: form.name,
      slug: form.slug,
      areaType: form.areaType,
      description: form.description,
      images,
      totalTables: Number(form.totalTables),
      maxPartySize: maxParty,
      minPartySize: minParty,
      minimumSpend: form.minimumSpend ? Number(form.minimumSpend) : undefined,
      features: form.features
        .split(",")
        .map((f) => f.trim())
        .filter(Boolean),
    };

    const res = editingId
      ? await adminApi.put(`/admin/restaurants/dining-areas/${editingId}`, payload)
      : await adminApi.post(`/admin/restaurants/${restaurantId}/dining-areas`, payload);
    setSaving(false);

    if (!res.success) {
      setFormError(formatApiError(res));
      return;
    }

    toastSuccess(editingId ? "Dining area updated." : "Dining area created.");
    setOpen(false);
    onChanged();
  }

  async function handleDelete(area: DiningArea) {
    const ok = await confirm({
      title: `Delete “${area.name}”?`,
      description:
        "The area stops accepting reservations and disappears from the public site. Existing reservations are not deleted.",
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;

    const res = await adminApi.delete(`/admin/restaurants/dining-areas/${area._id}`);
    if (!res.success) {
      toastError(formatApiError(res));
      return;
    }
    toastSuccess("Dining area deleted.");
    onChanged();
  }

  const columns: Column<DiningArea>[] = [
    {
      key: "name",
      header: "Area",
      sortable: true,
      accessor: (a) => a.name,
      render: (a) => (
        <div className="flex min-w-0 items-center gap-2.5">
          {a.images?.[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={a.images[0]}
              alt=""
              className="h-9 w-12 shrink-0 rounded border border-line object-cover"
            />
          ) : (
            <span className="flex h-9 w-12 shrink-0 items-center justify-center rounded border border-line bg-surface-muted text-ink-400">
              <Armchair size={14} />
            </span>
          )}
          <div className="min-w-0">
            <Link
              href={`/restaurants/${restaurantId}/dining-areas/${a._id}`}
              className="block truncate font-medium text-ink-800 hover:text-brand-700 hover:underline"
            >
              {a.name}
            </Link>
            <span className="block truncate font-mono text-xs text-ink-500">/{a.slug}</span>
          </div>
        </div>
      ),
    },
    {
      key: "type",
      header: "Type",
      sortable: true,
      accessor: (a) => a.areaType,
      hideBelow: "sm",
      render: (a) => <Badge tone="neutral">{humanise(a.areaType)}</Badge>,
    },
    {
      key: "tables",
      header: "Tables",
      sortable: true,
      accessor: (a) => a.totalTables,
      align: "right",
      render: (a) => <span className="tabular-nums">{a.totalTables}</span>,
    },
    {
      key: "party",
      header: "Party size",
      sortable: true,
      accessor: (a) => a.maxPartySize,
      align: "right",
      hideBelow: "md",
      render: (a) => (
        <span className="whitespace-nowrap tabular-nums">
          {a.minPartySize ?? 1}–{a.maxPartySize}
        </span>
      ),
    },
    {
      key: "spend",
      header: "Min. spend",
      sortable: true,
      accessor: (a) => a.minimumSpend ?? 0,
      align: "right",
      hideBelow: "lg",
      render: (a) =>
        a.minimumSpend ? (
          <span className="tabular-nums">{currency(a.minimumSpend)}</span>
        ) : (
          <span className="text-ink-400">—</span>
        ),
    },
  ];

  return (
    <>
      <DataTable
        columns={columns}
        rows={areas}
        rowKey={(a) => a._id}
        loading={loading}
        searchable={(a) => `${a.name} ${a.slug} ${a.areaType} ${a.description}`}
        searchPlaceholder="Search dining areas…"
        initialSort={{ key: "name", direction: "asc" }}
        onRowClick={(a) => router.push(`/restaurants/${restaurantId}/dining-areas/${a._id}`)}
        toolbarActions={
          <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={openCreate}>
            New dining area
          </Button>
        }
        emptyIcon={<Armchair size={19} />}
        emptyTitle="No dining areas yet"
        emptyDescription="Reservations are made against a dining area, so add at least one before opening the book."
        emptyAction={
          <Button variant="primary" icon={<Plus size={15} />} onClick={openCreate}>
            New dining area
          </Button>
        }
        actions={(a) => [
          { label: "Edit", icon: <Pencil size={14} />, onClick: () => openEdit(a) },
          {
            label: "Table availability",
            icon: <CalendarOff size={14} />,
            onClick: () =>
              router.push(`/restaurants/${restaurantId}/dining-areas/${a._id}?tab=availability`),
          },
          {
            label: "Delete",
            icon: <Trash2 size={14} />,
            danger: true,
            separated: true,
            onClick: () => void handleDelete(a),
          },
        ]}
      />

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editingId ? "Edit dining area" : "New dining area"}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" form="dining-area-form" loading={saving}>
              {editingId ? "Save changes" : "Create area"}
            </Button>
          </>
        }
      >
        <form id="dining-area-form" onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <p className="rounded-md border border-danger-100 bg-danger-50 px-3 py-2 text-sm text-danger-700">
              {formError}
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <TextInput
              label="Area name"
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
              placeholder="Terrace Garden"
            />
            <Select
              label="Area type"
              required
              value={form.areaType}
              onChange={(e) =>
                setForm({ ...form, areaType: e.target.value as DiningArea["areaType"] })
              }
            >
              {AREA_TYPES.map((t) => (
                <option key={t} value={t}>
                  {humanise(t)}
                </option>
              ))}
            </Select>
          </div>

          <TextInput
            label="Slug"
            required
            value={form.slug}
            onChange={(e) => {
              setSlugTouched(true);
              setForm({ ...form, slug: e.target.value });
            }}
            hint="Lowercase, numbers and hyphens. Unique within this restaurant."
          />

          <TextArea
            label="Description"
            required
            rows={3}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            hint="At least 10 characters. Helps guests pick the right space."
          />

          <div className="grid gap-4 sm:grid-cols-3">
            <TextInput
              label="Total tables"
              type="number"
              min={0}
              required
              value={form.totalTables}
              onChange={(e) => setForm({ ...form, totalTables: e.target.value })}
              hint="Availability counts down from this."
            />
            <TextInput
              label="Min party size"
              type="number"
              min={1}
              value={form.minPartySize}
              onChange={(e) => setForm({ ...form, minPartySize: e.target.value })}
            />
            <TextInput
              label="Max party size"
              type="number"
              min={1}
              required
              value={form.maxPartySize}
              onChange={(e) => setForm({ ...form, maxPartySize: e.target.value })}
              hint="Per table."
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <TextInput
              label="Minimum spend"
              type="number"
              min={0}
              value={form.minimumSpend}
              onChange={(e) => setForm({ ...form, minimumSpend: e.target.value })}
              hint="₹, optional. Typical for private areas."
            />
            <TextInput
              label="Features"
              value={form.features}
              onChange={(e) => setForm({ ...form, features: e.target.value })}
              placeholder="Air-conditioned, Live music, Pet friendly"
              hint="Comma-separated."
            />
          </div>

          <ImageUploader
            label="Area photos"
            value={images}
            onChange={setImages}
            folder="dining-areas"
            upload={uploadRestaurantImage}
            hint="The first photo is used as the cover on the public site."
          />
        </form>
      </Modal>
    </>
  );
}
