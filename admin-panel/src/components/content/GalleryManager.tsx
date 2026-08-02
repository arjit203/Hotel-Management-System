"use client";

import { useMemo, useState } from "react";
import { Image as ImageIcon, Loader2, Plus, Trash2, ZoomIn } from "lucide-react";
import { cn } from "@/lib/cn";
import { adminApi, formatApiError } from "@/lib/api";
import type { UploadFn } from "@/components/ui/ImageUploader";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import ImageUploader from "@/components/ui/ImageUploader";
import Lightbox from "@/components/ui/Lightbox";
import { Checkbox, Select, TextInput } from "@/components/ui/Field";
import { EmptyState, GridSkeleton } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";

export interface GalleryItem {
  _id: string;
  imageUrl: string;
  category: string;
  title?: string;
}

interface Props {
  /** "/admin/hotels" or "/admin/restaurants" — the content routes mirror each other. */
  basePath: string;
  ownerId: string;
  items: GalleryItem[];
  loading?: boolean;
  onChanged: () => void;
  upload: UploadFn;
  /** Category suggestions for this vertical. Free text is always allowed. */
  categoryOptions: string[];
  readOnly?: boolean;
}

/**
 * Gallery manager shared by Hotel and Restaurant.
 *
 * The backend's gallery model is polymorphic (`ownerType` + `ownerId`) and both
 * verticals expose the same two routes, so one component serves both — only the
 * base path, the Cloudinary upload function and the category suggestions differ.
 *
 * Bulk upload posts one gallery row per image, because
 * `POST {base}/:ownerId/gallery` accepts a single `{ imageUrl, category }`.
 */
export default function GalleryManager({
  basePath,
  ownerId,
  items,
  loading,
  onChanged,
  upload,
  categoryOptions,
  readOnly,
}: Props) {
  const { toastSuccess, toastError } = useToast();
  const confirm = useConfirm();

  const [addOpen, setAddOpen] = useState(false);
  const [pendingUrls, setPendingUrls] = useState<string[]>([]);
  const [category, setCategory] = useState(categoryOptions[0] ?? "General");
  const [customCategory, setCustomCategory] = useState("");
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<string>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [preview, setPreview] = useState<string | null>(null);

  const categoriesInUse = useMemo(() => {
    const set = new Set(items.map((i) => i.category || "Other"));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [items]);

  const visible = useMemo(
    () => (filter === "all" ? items : items.filter((i) => (i.category || "Other") === filter)),
    [items, filter]
  );

  const resolvedCategory = category === "__custom" ? customCategory.trim() : category;

  async function handleAdd() {
    if (pendingUrls.length === 0) {
      toastError("Add at least one image first.");
      return;
    }
    if (!resolvedCategory) {
      toastError("Give the images a category.");
      return;
    }

    setSaving(true);
    let failures = 0;
    for (const imageUrl of pendingUrls) {
      const res = await adminApi.post(`${basePath}/${ownerId}/gallery`, {
        imageUrl,
        category: resolvedCategory,
      });
      if (!res.success) {
        failures += 1;
        toastError(formatApiError(res));
      }
    }
    setSaving(false);

    const added = pendingUrls.length - failures;
    if (added > 0) {
      toastSuccess(`${added} image${added === 1 ? "" : "s"} added to ${resolvedCategory}.`);
      setPendingUrls([]);
      setAddOpen(false);
      setCustomCategory("");
      onChanged();
    }
  }

  async function handleDelete(item: GalleryItem) {
    const ok = await confirm({
      title: "Remove this image?",
      description: "It disappears from the public gallery immediately.",
      confirmLabel: "Remove",
      danger: true,
    });
    if (!ok) return;

    const res = await adminApi.delete(`${basePath}/gallery/${item._id}`);
    if (!res.success) {
      toastError(formatApiError(res));
      return;
    }
    toastSuccess("Image removed.");
    onChanged();
  }

  async function handleBulkDelete() {
    const ids = Array.from(selected);
    const ok = await confirm({
      title: `Remove ${ids.length} image${ids.length === 1 ? "" : "s"}?`,
      description: "They disappear from the public gallery immediately.",
      confirmLabel: "Remove",
      danger: true,
    });
    if (!ok) return;

    let failures = 0;
    for (const id of ids) {
      const res = await adminApi.delete(`${basePath}/gallery/${id}`);
      if (!res.success) failures += 1;
    }
    setSelected(new Set());

    if (failures > 0) toastError(`${failures} image${failures === 1 ? "" : "s"} could not be removed.`);
    else toastSuccess(`${ids.length} image${ids.length === 1 ? "" : "s"} removed.`);
    onChanged();
  }

  function toggleSelected(id: string, next: boolean) {
    setSelected((prev) => {
      const copy = new Set(prev);
      if (next) copy.add(id);
      else copy.delete(id);
      return copy;
    });
  }

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h2 className="card-title">Gallery</h2>
          <p className="card-subtitle">
            {items.length} image{items.length === 1 ? "" : "s"}
            {categoriesInUse.length > 0 && ` across ${categoriesInUse.length} categories`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {categoriesInUse.length > 1 && (
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              aria-label="Filter by category"
              className="input w-auto py-1.5"
            >
              <option value="all">All categories</option>
              {categoriesInUse.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          )}
          {!readOnly && (
            <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={() => setAddOpen(true)}>
              Add images
            </Button>
          )}
        </div>
      </div>

      {selected.size > 0 && !readOnly && (
        <div className="flex items-center gap-3 border-b border-brand-100 bg-brand-50 px-5 py-2.5">
          <span className="text-sm font-medium text-brand-800">{selected.size} selected</span>
          <Button size="sm" variant="danger" icon={<Trash2 size={13} />} onClick={handleBulkDelete}>
            Remove
          </Button>
          <button
            onClick={() => setSelected(new Set())}
            className="ml-auto text-sm font-medium text-brand-700 hover:underline"
          >
            Clear
          </button>
        </div>
      )}

      <div className="card-body">
        {loading ? (
          <GridSkeleton />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={<ImageIcon size={19} />}
            title={items.length === 0 ? "No images yet" : "Nothing in this category"}
            description={
              items.length === 0
                ? "Upload photos to build the public gallery."
                : "Pick a different category, or add images here."
            }
            action={
              !readOnly && (
                <Button variant="primary" icon={<Plus size={15} />} onClick={() => setAddOpen(true)}>
                  Add images
                </Button>
              )
            }
          />
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {visible.map((item) => {
              const isSelected = selected.has(item._id);
              return (
                <li
                  key={item._id}
                  className={cn(
                    "group relative overflow-hidden rounded-lg border bg-surface-muted transition-shadow",
                    isSelected ? "border-brand-500 shadow-ring" : "border-line hover:shadow-md"
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.imageUrl}
                    alt={item.title || `${item.category} photo`}
                    className="aspect-[4/3] w-full object-cover"
                  />

                  {!readOnly && (
                    <span className="absolute left-1.5 top-1.5 rounded bg-white/90 p-0.5 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 data-[on=true]:opacity-100"
                      data-on={isSelected}
                    >
                      <Checkbox
                        checked={isSelected}
                        onChange={(next) => toggleSelected(item._id, next)}
                        ariaLabel={`Select ${item.category} image`}
                      />
                    </span>
                  )}

                  <span className="absolute right-1.5 top-1.5 rounded bg-ink-900/70 px-1.5 py-0.5 text-xs font-medium capitalize text-white">
                    {item.category}
                  </span>

                  <div className="absolute inset-x-0 bottom-0 flex justify-center gap-1 bg-ink-900/70 py-1 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() => setPreview(item.imageUrl)}
                      aria-label="Preview image"
                      className="rounded p-1 text-white hover:bg-white/20"
                    >
                      <ZoomIn size={14} />
                    </button>
                    {!readOnly && (
                      <button
                        type="button"
                        onClick={() => void handleDelete(item)}
                        aria-label="Remove image"
                        className="rounded p-1 text-white hover:bg-danger-600"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add gallery images"
        description="Drop several at once — they all land in the category you pick."
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleAdd}
              loading={saving}
              disabled={pendingUrls.length === 0}
              icon={saving ? <Loader2 size={14} className="animate-spin" /> : undefined}
            >
              Add {pendingUrls.length > 0 ? `${pendingUrls.length} ` : ""}
              image{pendingUrls.length === 1 ? "" : "s"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select
            label="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            hint="Grouping used by the public gallery filter."
          >
            {categoryOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
            {categoriesInUse
              .filter((c) => !categoryOptions.includes(c))
              .map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            <option value="__custom">Other (custom)…</option>
          </Select>

          {category === "__custom" && (
            <TextInput
              label="Custom category"
              required
              value={customCategory}
              onChange={(e) => setCustomCategory(e.target.value)}
              placeholder="e.g. Poolside"
            />
          )}

          <ImageUploader
            label="Images"
            value={pendingUrls}
            onChange={setPendingUrls}
            folder="gallery"
            upload={upload}
            max={24}
            hint="Uploaded to Cloudinary immediately; they only join the gallery when you press Add."
          />
        </div>
      </Modal>

      <Lightbox src={preview} onClose={() => setPreview(null)} />
    </div>
  );
}
