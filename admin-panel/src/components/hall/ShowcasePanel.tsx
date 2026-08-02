"use client";

import { useMemo, useState } from "react";
import { Copy, Image as ImageIcon, Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
import { adminApi, formatApiError, uploadHallImage } from "@/lib/api";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import Accordion from "@/components/ui/Accordion";
import DataTable, { Column } from "@/components/ui/DataTable";
import ImageUploader from "@/components/ui/ImageUploader";
import { TextArea, TextInput, Toggle } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";

export type ShowcaseType = "decoration" | "catering" | "dining" | "floral";

export interface ShowcaseEntry {
  _id: string;
  showcaseType: ShowcaseType;
  category: string;
  title: string;
  description: string;
  images: string[];
  highlights: string[];
  colorPalette: string[];
  sampleItems: string[];
  beforeImageUrl?: string;
  isFeatured: boolean;
  displayOrder: number;
}

/**
 * Per-type presentation. One backend collection serves all four showcases, so
 * one admin panel does too — this table is the only thing that differs between
 * Decoration Themes, Catering, Dining and Floral.
 */
const TYPE_CONFIG: Record<
  ShowcaseType,
  {
    label: string;
    singular: string;
    categoryLabel: string;
    categoryHint: string;
    suggestions: string[];
    /** Colour palette + before/after only make sense for decoration themes. */
    showPalette: boolean;
    showBeforeAfter: boolean;
    /** Sample dishes only make sense for catering. */
    showSampleItems: boolean;
    sampleLabel: string;
  }
> = {
  decoration: {
    label: "Decoration themes",
    singular: "theme",
    categoryLabel: "Theme family",
    categoryHint: "Classic, Royal, Traditional, Modern, Floral, Luxury, Minimal, Outdoor.",
    suggestions: ["Classic", "Royal", "Traditional", "Modern", "Floral", "Luxury", "Minimal", "Outdoor"],
    showPalette: true,
    showBeforeAfter: true,
    showSampleItems: false,
    sampleLabel: "",
  },
  catering: {
    label: "Catering",
    singular: "menu section",
    categoryLabel: "Cuisine group",
    categoryHint: "Veg, Non-Veg, Desserts, Live Counters, Beverages.",
    suggestions: ["Veg", "Non-Veg", "Desserts", "Live Counters", "Beverages"],
    showPalette: false,
    showBeforeAfter: false,
    showSampleItems: true,
    sampleLabel: "Sample dishes",
  },
  dining: {
    label: "Dining",
    singular: "arrangement",
    categoryLabel: "Arrangement",
    categoryHint: "Buffet, Round Tables, VIP Dining, Family Dining, Live Counters, Premium Serving.",
    suggestions: ["Buffet", "Round Tables", "VIP Dining", "Family Dining", "Live Counters", "Premium Serving"],
    showPalette: false,
    showBeforeAfter: false,
    showSampleItems: false,
    sampleLabel: "",
  },
  floral: {
    label: "Floral decoration",
    singular: "floral setup",
    categoryLabel: "Surface",
    categoryHint: "Entrance, Stage, Mandap, Table, Ceiling, Lighting.",
    suggestions: ["Entrance", "Stage", "Mandap", "Table", "Ceiling", "Lighting"],
    showPalette: false,
    showBeforeAfter: false,
    showSampleItems: false,
    sampleLabel: "",
  },
};

const EMPTY = {
  category: "",
  title: "",
  description: "",
  highlights: "",
  colorPalette: "",
  sampleItems: "",
  beforeImageUrl: "",
  isFeatured: false,
  displayOrder: "0",
};

/**
 * Admin panel for one showcase section of a Marriage Hall.
 *
 * Deliberately generic across the four showcase types, matching the backend's
 * single `HallShowcase` collection. Adding a fifth section later is a
 * TYPE_CONFIG entry, not a new component.
 *
 * No price field anywhere — catering pricing is unset by the owner's own
 * instruction, and this content is a showcase, not a quote.
 */
export default function ShowcasePanel({
  hallId,
  showcaseType,
  entries,
  loading,
  onChanged,
}: {
  hallId: string;
  showcaseType: ShowcaseType;
  entries: ShowcaseEntry[];
  loading?: boolean;
  onChanged: () => void;
}) {
  const config = TYPE_CONFIG[showcaseType];
  const { toastSuccess, toastError } = useToast();
  const confirm = useConfirm();

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [images, setImages] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState("");

  const categories = useMemo(
    () => Array.from(new Set(entries.map((e) => e.category))).sort((a, b) => a.localeCompare(b)),
    [entries]
  );

  const rows = useMemo(
    () => (categoryFilter ? entries.filter((e) => e.category === categoryFilter) : entries),
    [entries, categoryFilter]
  );

  function openCreate(prefill?: ShowcaseEntry) {
    setEditingId(null);
    setForm({
      category: prefill?.category ?? config.suggestions[0] ?? "",
      title: prefill ? `${prefill.title} (copy)` : "",
      description: prefill?.description ?? "",
      highlights: (prefill?.highlights ?? []).join("\n"),
      colorPalette: (prefill?.colorPalette ?? []).join(", "),
      sampleItems: (prefill?.sampleItems ?? []).join("\n"),
      beforeImageUrl: prefill?.beforeImageUrl ?? "",
      isFeatured: false,
      displayOrder: String(prefill?.displayOrder ?? entries.length),
    });
    setImages(prefill?.images ?? []);
    setFormError(null);
    setOpen(true);
  }

  function openEdit(entry: ShowcaseEntry) {
    setEditingId(entry._id);
    setForm({
      category: entry.category,
      title: entry.title,
      description: entry.description,
      highlights: entry.highlights.join("\n"),
      colorPalette: entry.colorPalette.join(", "),
      sampleItems: entry.sampleItems.join("\n"),
      beforeImageUrl: entry.beforeImageUrl ?? "",
      isFeatured: entry.isFeatured,
      displayOrder: String(entry.displayOrder ?? 0),
    });
    setImages(entry.images ?? []);
    setFormError(null);
    setOpen(true);
  }

  function toLines(value: string): string[] {
    return value
      .split("\n")
      .map((v) => v.trim())
      .filter(Boolean);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const palette = form.colorPalette
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);

    const badHex = palette.find((hex) => !/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(hex));
    if (badHex) {
      setFormError(`"${badHex}" isn't a hex colour. Use the form #b08d57.`);
      return;
    }

    setSaving(true);
    const payload = {
      showcaseType,
      category: form.category.trim(),
      title: form.title,
      description: form.description,
      images,
      highlights: toLines(form.highlights),
      colorPalette: config.showPalette ? palette : [],
      sampleItems: config.showSampleItems ? toLines(form.sampleItems) : [],
      beforeImageUrl: config.showBeforeAfter && form.beforeImageUrl ? form.beforeImageUrl : undefined,
      isFeatured: form.isFeatured,
      displayOrder: form.displayOrder ? Number(form.displayOrder) : undefined,
    };

    const res = editingId
      ? await adminApi.put(`/admin/halls/showcase/${editingId}`, payload)
      : await adminApi.post(`/admin/halls/${hallId}/showcase`, payload);
    setSaving(false);

    if (!res.success) {
      setFormError(formatApiError(res));
      return;
    }

    toastSuccess(editingId ? "Saved." : `${config.singular} added.`);
    setOpen(false);
    onChanged();
  }

  async function handleDelete(entry: ShowcaseEntry) {
    const ok = await confirm({
      title: `Remove “${entry.title}”?`,
      description: "It disappears from the public site immediately.",
      confirmLabel: "Remove",
      danger: true,
    });
    if (!ok) return;

    const res = await adminApi.delete(`/admin/halls/showcase/${entry._id}`);
    if (!res.success) {
      toastError(formatApiError(res));
      return;
    }
    toastSuccess("Removed.");
    onChanged();
  }

  const columns: Column<ShowcaseEntry>[] = [
    {
      key: "title",
      header: config.singular,
      sortable: true,
      accessor: (e) => e.title,
      render: (e) => (
        <div className="flex min-w-0 items-center gap-2.5">
          {e.images[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={e.images[0]}
              alt=""
              className="h-9 w-12 shrink-0 rounded border border-line object-cover"
            />
          ) : (
            <span className="flex h-9 w-12 shrink-0 items-center justify-center rounded border border-line bg-surface-muted text-ink-400">
              <ImageIcon size={13} />
            </span>
          )}
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 truncate font-medium text-ink-800">
              {e.title}
              {e.isFeatured && <Sparkles size={12} className="shrink-0 text-brand-600" />}
            </p>
            <p className="line-clamp-1 text-xs text-ink-500">{e.description}</p>
          </div>
        </div>
      ),
    },
    {
      key: "category",
      header: config.categoryLabel,
      sortable: true,
      accessor: (e) => e.category,
      hideBelow: "sm",
      render: (e) => <Badge tone="neutral">{e.category}</Badge>,
    },
    ...(config.showPalette
      ? [
          {
            key: "palette",
            header: "Palette",
            accessor: (e: ShowcaseEntry) => e.colorPalette.join(","),
            hideBelow: "lg" as const,
            render: (e: ShowcaseEntry) =>
              e.colorPalette.length > 0 ? (
                <span className="flex gap-1">
                  {e.colorPalette.map((hex) => (
                    <span
                      key={hex}
                      title={hex}
                      style={{ backgroundColor: hex }}
                      className="h-4 w-4 rounded-full border border-line"
                    />
                  ))}
                </span>
              ) : (
                <span className="text-ink-400">—</span>
              ),
          },
        ]
      : []),
    {
      key: "images",
      header: "Photos",
      sortable: true,
      accessor: (e) => e.images.length,
      align: "right",
      hideBelow: "md",
      render: (e) => <span className="tabular-nums">{e.images.length}</span>,
    },
    {
      key: "order",
      header: "Order",
      sortable: true,
      accessor: (e) => e.displayOrder ?? 0,
      align: "right",
      hideBelow: "lg",
      render: (e) => <span className="tabular-nums text-ink-500">{e.displayOrder ?? 0}</span>,
    },
  ];

  return (
    <>
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(e) => e._id}
        loading={loading}
        searchable={(e) => `${e.title} ${e.category} ${e.description} ${e.highlights.join(" ")}`}
        searchPlaceholder={`Search ${config.label.toLowerCase()}…`}
        initialSort={{ key: "order", direction: "asc" }}
        toolbar={
          categories.length > 1 ? (
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              aria-label={`Filter by ${config.categoryLabel.toLowerCase()}`}
              className="input w-auto py-1.5"
            >
              <option value="">All</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          ) : undefined
        }
        toolbarActions={
          <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={() => openCreate()}>
            New {config.singular}
          </Button>
        }
        emptyIcon={<ImageIcon size={19} />}
        emptyTitle={`No ${config.label.toLowerCase()} yet`}
        emptyDescription={`This section is empty, so it is hidden on the public site until you add the first ${config.singular}.`}
        emptyAction={
          <Button variant="primary" icon={<Plus size={15} />} onClick={() => openCreate()}>
            New {config.singular}
          </Button>
        }
        actions={(e) => [
          { label: "Edit", icon: <Pencil size={14} />, onClick: () => openEdit(e) },
          { label: "Duplicate", icon: <Copy size={14} />, onClick: () => openCreate(e) },
          {
            label: "Remove",
            icon: <Trash2 size={14} />,
            danger: true,
            separated: true,
            onClick: () => void handleDelete(e),
          },
        ]}
      />

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editingId ? `Edit ${config.singular}` : `New ${config.singular}`}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" form="showcase-form" loading={saving}>
              {editingId ? "Save changes" : "Add"}
            </Button>
          </>
        }
      >
        <form id="showcase-form" onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <p className="rounded-md border border-danger-100 bg-danger-50 px-3 py-2 text-sm text-danger-700">
              {formError}
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <TextInput
              label={config.categoryLabel}
              required
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              list="showcase-category-suggestions"
              hint={config.categoryHint}
            />
            <datalist id="showcase-category-suggestions">
              {config.suggestions.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>

            <TextInput
              label="Title"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder={showcaseType === "decoration" ? "Ivory & Pearl" : "Live counters"}
            />
          </div>

          <TextArea
            label="Description"
            required
            rows={4}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            hint="At least 10 characters. This is the paragraph guests read on the public page."
          />

          <TextArea
            label="Highlights"
            rows={4}
            value={form.highlights}
            onChange={(e) => setForm({ ...form, highlights: e.target.value })}
            placeholder={"Ivory drapery\nWhite and green florals\nCrystal chandeliers"}
            hint="One per line. Rendered as a tick list."
          />

          {config.showSampleItems && (
            <TextArea
              label={config.sampleLabel}
              rows={4}
              value={form.sampleItems}
              onChange={(e) => setForm({ ...form, sampleItems: e.target.value })}
              placeholder={"Paneer Lababdar\nDal Saat Vachan\nSubz Dum Biryani"}
              hint="One per line. Names only — the public page shows no prices, by design."
            />
          )}

          {config.showPalette && (
            <TextInput
              label="Colour palette"
              value={form.colorPalette}
              onChange={(e) => setForm({ ...form, colorPalette: e.target.value })}
              placeholder="#faf7f2, #efe2cb, #d9be8e, #b08d57"
              hint="Comma-separated hex colours, up to 8. Shown as swatches on the theme card."
            />
          )}

          <ImageUploader
            label="Photographs"
            value={images}
            onChange={setImages}
            folder={showcaseType}
            upload={uploadHallImage}
            hint="The first photo is the card image on the public site."
          />

          <Accordion title="Advanced" description="Ordering, featuring and before/after">
            <div className="space-y-4">
              <TextInput
                label="Display order"
                type="number"
                min={0}
                value={form.displayOrder}
                onChange={(e) => setForm({ ...form, displayOrder: e.target.value })}
                hint="Lower numbers appear first."
                wrapperClassName="sm:max-w-[10rem]"
              />

              <Toggle
                checked={form.isFeatured}
                onChange={(v) => setForm({ ...form, isFeatured: v })}
                label="Feature this one"
                description="Adds a 'Most requested' ribbon on the public card."
              />

              {config.showBeforeAfter && (
                <TextInput
                  label="Before image URL"
                  value={form.beforeImageUrl}
                  onChange={(e) => setForm({ ...form, beforeImageUrl: e.target.value })}
                  placeholder="https://…"
                  hint="A photo of the bare hall. When set, the public page renders a draggable before/after against the first photograph above — the single most persuasive thing on the decoration page."
                />
              )}
            </div>
          </Accordion>
        </form>
      </Modal>
    </>
  );
}
