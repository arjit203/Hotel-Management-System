"use client";

import { useMemo, useState } from "react";
import { ChefHat, Copy, EyeOff, Pencil, Plus, Sparkles, Trash2, UtensilsCrossed } from "lucide-react";
import { cn } from "@/lib/cn";
import { adminApi, formatApiError, uploadRestaurantImage } from "@/lib/api";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import DataTable, { Column } from "@/components/ui/DataTable";
import ImageUploader from "@/components/ui/ImageUploader";
import { Select, TextArea, TextInput, Toggle } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { currency } from "@/lib/format";
import type { MenuCategory } from "./MenuCategoriesPanel";

export interface MenuItem {
  _id: string;
  categoryId: string;
  name: string;
  description: string;
  price: number;
  foodType: "veg" | "non_veg" | "egg";
  spiceLevel?: "mild" | "medium" | "hot";
  imageUrl?: string;
  isChefSpecial?: boolean;
  isTodaysSpecial?: boolean;
  isAvailable?: boolean;
  tags?: string[];
  displayOrder?: number;
}

interface Props {
  restaurantId: string;
  items: MenuItem[];
  categories: MenuCategory[];
  loading?: boolean;
  onChanged: () => void;
}

const FOOD_TYPE_LABEL: Record<MenuItem["foodType"], string> = {
  veg: "Veg",
  non_veg: "Non-veg",
  egg: "Egg",
};

const EMPTY = {
  categoryId: "",
  name: "",
  description: "",
  price: "",
  foodType: "veg" as MenuItem["foodType"],
  spiceLevel: "",
  isChefSpecial: false,
  isTodaysSpecial: false,
  isAvailable: true,
  tags: "",
  displayOrder: "0",
};

/** The classic green/red veg marker Indian menus use. */
function FoodTypeMark({ type }: { type: MenuItem["foodType"] }) {
  const tone =
    type === "veg" ? "border-success-600" : type === "non_veg" ? "border-danger-600" : "border-warning-600";
  const dot =
    type === "veg" ? "bg-success-600" : type === "non_veg" ? "bg-danger-600" : "bg-warning-600";
  return (
    <span
      title={FOOD_TYPE_LABEL[type]}
      aria-label={FOOD_TYPE_LABEL[type]}
      className={cn("inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm border", tone)}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", dot)} />
    </span>
  );
}

/**
 * Dish management.
 *
 * Everything routes through the existing menu-item endpoints; "Duplicate"
 * simply pre-fills the create form from an existing dish (there is no clone
 * endpoint) so building a menu of near-identical variants isn't retyping.
 */
export default function MenuItemsPanel({
  restaurantId,
  items,
  categories,
  loading,
  onChanged,
}: Props) {
  const { toastSuccess, toastError } = useToast();
  const confirm = useConfirm();

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [image, setImage] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [categoryFilter, setCategoryFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [flagFilter, setFlagFilter] = useState("");

  const categoryNames = useMemo(() => {
    const map: Record<string, string> = {};
    categories.forEach((c) => (map[c._id] = c.name));
    return map;
  }, [categories]);

  const rows = useMemo(
    () =>
      items.filter((i) => {
        if (categoryFilter && String(i.categoryId) !== categoryFilter) return false;
        if (typeFilter && i.foodType !== typeFilter) return false;
        if (flagFilter === "chef" && !i.isChefSpecial) return false;
        if (flagFilter === "today" && !i.isTodaysSpecial) return false;
        if (flagFilter === "unavailable" && i.isAvailable !== false) return false;
        return true;
      }),
    [items, categoryFilter, typeFilter, flagFilter]
  );

  function openCreate(prefill?: MenuItem) {
    setEditingId(null);
    setForm({
      categoryId: String(prefill?.categoryId ?? categories[0]?._id ?? ""),
      name: prefill ? `${prefill.name} (copy)` : "",
      description: prefill?.description ?? "",
      price: prefill ? String(prefill.price) : "",
      foodType: prefill?.foodType ?? "veg",
      spiceLevel: prefill?.spiceLevel ?? "",
      isChefSpecial: prefill?.isChefSpecial ?? false,
      isTodaysSpecial: prefill?.isTodaysSpecial ?? false,
      isAvailable: prefill?.isAvailable ?? true,
      tags: (prefill?.tags ?? []).join(", "),
      displayOrder: String(prefill?.displayOrder ?? 0),
    });
    setImage(prefill?.imageUrl ? [prefill.imageUrl] : []);
    setFormError(null);
    setOpen(true);
  }

  function openEdit(item: MenuItem) {
    setEditingId(item._id);
    setForm({
      categoryId: String(item.categoryId),
      name: item.name,
      description: item.description,
      price: String(item.price),
      foodType: item.foodType,
      spiceLevel: item.spiceLevel ?? "",
      isChefSpecial: Boolean(item.isChefSpecial),
      isTodaysSpecial: Boolean(item.isTodaysSpecial),
      isAvailable: item.isAvailable !== false,
      tags: (item.tags ?? []).join(", "),
      displayOrder: String(item.displayOrder ?? 0),
    });
    setImage(item.imageUrl ? [item.imageUrl] : []);
    setFormError(null);
    setOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!form.categoryId) {
      setFormError("Pick a category. Create one first if the list is empty.");
      return;
    }

    const tags = form.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    if (tags.length > 10) {
      setFormError("At most 10 tags are allowed.");
      return;
    }

    setSaving(true);
    const payload = {
      categoryId: form.categoryId,
      name: form.name,
      description: form.description,
      price: Number(form.price),
      foodType: form.foodType,
      spiceLevel: form.spiceLevel || undefined,
      imageUrl: image[0] || undefined,
      isChefSpecial: form.isChefSpecial,
      isTodaysSpecial: form.isTodaysSpecial,
      isAvailable: form.isAvailable,
      tags,
      displayOrder: form.displayOrder ? Number(form.displayOrder) : undefined,
    };

    const res = editingId
      ? await adminApi.put(`/admin/restaurants/menu/items/${editingId}`, payload)
      : await adminApi.post(`/admin/restaurants/${restaurantId}/menu/items`, payload);
    setSaving(false);

    if (!res.success) {
      setFormError(formatApiError(res));
      return;
    }

    toastSuccess(editingId ? "Dish updated." : "Dish added.");
    setOpen(false);
    onChanged();
  }

  /** Availability is a plain field on the item, so the toggle is a partial PUT. */
  async function toggleAvailability(item: MenuItem) {
    const next = item.isAvailable === false;
    const res = await adminApi.put(`/admin/restaurants/menu/items/${item._id}`, {
      isAvailable: next,
    });
    if (!res.success) {
      toastError(formatApiError(res));
      return;
    }
    toastSuccess(`${item.name} marked ${next ? "available" : "unavailable"}.`);
    onChanged();
  }

  async function handleDelete(item: MenuItem) {
    const ok = await confirm({
      title: `Delete “${item.name}”?`,
      description: "The dish is removed from the public menu.",
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;

    const res = await adminApi.delete(`/admin/restaurants/menu/items/${item._id}`);
    if (!res.success) {
      toastError(formatApiError(res));
      return;
    }
    toastSuccess("Dish deleted.");
    onChanged();
  }

  async function bulkSetAvailability(list: MenuItem[], isAvailable: boolean, clear: () => void) {
    let failures = 0;
    for (const item of list) {
      const res = await adminApi.put(`/admin/restaurants/menu/items/${item._id}`, { isAvailable });
      if (!res.success) failures += 1;
    }
    clear();
    if (failures > 0) toastError(`${failures} dish(es) could not be updated.`);
    else toastSuccess(`${list.length} dish(es) marked ${isAvailable ? "available" : "unavailable"}.`);
    onChanged();
  }

  async function bulkDelete(list: MenuItem[], clear: () => void) {
    const ok = await confirm({
      title: `Delete ${list.length} dish${list.length === 1 ? "" : "es"}?`,
      description: "They are removed from the public menu.",
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;

    let failures = 0;
    for (const item of list) {
      const res = await adminApi.delete(`/admin/restaurants/menu/items/${item._id}`);
      if (!res.success) failures += 1;
    }
    clear();
    if (failures > 0) toastError(`${failures} dish(es) could not be deleted.`);
    else toastSuccess(`${list.length} dish(es) deleted.`);
    onChanged();
  }

  const columns: Column<MenuItem>[] = [
    {
      key: "name",
      header: "Dish",
      sortable: true,
      accessor: (i) => i.name,
      render: (i) => (
        <div className="flex min-w-0 items-center gap-2.5">
          {i.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={i.imageUrl}
              alt=""
              className="h-9 w-9 shrink-0 rounded border border-line object-cover"
            />
          ) : (
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded border border-line bg-surface-muted text-ink-400">
              <UtensilsCrossed size={13} />
            </span>
          )}
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 truncate font-medium text-ink-800">
              <FoodTypeMark type={i.foodType} />
              {i.name}
            </p>
            <p className="line-clamp-1 text-xs text-ink-500">{i.description}</p>
          </div>
        </div>
      ),
    },
    {
      key: "category",
      header: "Category",
      sortable: true,
      accessor: (i) => categoryNames[String(i.categoryId)] ?? "",
      hideBelow: "md",
      render: (i) => (
        <Badge tone="neutral">{categoryNames[String(i.categoryId)] ?? "Uncategorised"}</Badge>
      ),
    },
    {
      key: "flags",
      header: "Flags",
      accessor: (i) =>
        `${i.isChefSpecial ? "chef " : ""}${i.isTodaysSpecial ? "today " : ""}${i.spiceLevel ?? ""}`,
      hideBelow: "lg",
      render: (i) => (
        <div className="flex flex-wrap gap-1">
          {i.isChefSpecial && (
            <Badge tone="brand" icon={<ChefHat size={11} />}>
              Chef
            </Badge>
          )}
          {i.isTodaysSpecial && (
            <Badge tone="info" icon={<Sparkles size={11} />}>
              Today
            </Badge>
          )}
          {i.spiceLevel && <Badge tone="warning">{i.spiceLevel}</Badge>}
          {!i.isChefSpecial && !i.isTodaysSpecial && !i.spiceLevel && (
            <span className="text-ink-400">—</span>
          )}
        </div>
      ),
    },
    {
      key: "price",
      header: "Price",
      sortable: true,
      accessor: (i) => i.price,
      align: "right",
      render: (i) => <span className="tabular-nums">{currency(i.price)}</span>,
    },
    {
      key: "availability",
      header: "Status",
      sortable: true,
      accessor: (i) => (i.isAvailable === false ? "unavailable" : "available"),
      render: (i) => <Badge status={i.isAvailable === false ? "unavailable" : "available"} />,
    },
  ];

  return (
    <>
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(i) => i._id}
        loading={loading}
        pageSize={15}
        searchable={(i) => `${i.name} ${i.description} ${(i.tags || []).join(" ")}`}
        searchPlaceholder="Search dishes…"
        initialSort={{ key: "name", direction: "asc" }}
        toolbar={
          <>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              aria-label="Filter by category"
              className="input w-auto py-1.5"
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              aria-label="Filter by food type"
              className="input w-auto py-1.5"
            >
              <option value="">Veg &amp; non-veg</option>
              <option value="veg">Veg only</option>
              <option value="non_veg">Non-veg only</option>
              <option value="egg">Egg</option>
            </select>
            <select
              value={flagFilter}
              onChange={(e) => setFlagFilter(e.target.value)}
              aria-label="Filter by flag"
              className="input w-auto py-1.5"
            >
              <option value="">Any status</option>
              <option value="chef">Chef specials</option>
              <option value="today">Today&apos;s specials</option>
              <option value="unavailable">Unavailable</option>
            </select>
          </>
        }
        toolbarActions={
          <Button
            variant="primary"
            size="sm"
            icon={<Plus size={14} />}
            onClick={() => openCreate()}
            disabled={categories.length === 0}
          >
            New dish
          </Button>
        }
        bulkActions={(list, clear) => (
          <>
            <Button size="sm" variant="secondary" onClick={() => void bulkSetAvailability(list, true, clear)}>
              Mark available
            </Button>
            <Button
              size="sm"
              variant="secondary"
              icon={<EyeOff size={13} />}
              onClick={() => void bulkSetAvailability(list, false, clear)}
            >
              Mark unavailable
            </Button>
            <Button
              size="sm"
              variant="dangerGhost"
              icon={<Trash2 size={13} />}
              onClick={() => void bulkDelete(list, clear)}
            >
              Delete
            </Button>
          </>
        )}
        actions={(i) => [
          { label: "Edit", icon: <Pencil size={14} />, onClick: () => openEdit(i) },
          { label: "Duplicate", icon: <Copy size={14} />, onClick: () => openCreate(i) },
          {
            label: i.isAvailable === false ? "Mark available" : "Mark unavailable",
            icon: <EyeOff size={14} />,
            onClick: () => void toggleAvailability(i),
          },
          {
            label: "Delete",
            icon: <Trash2 size={14} />,
            danger: true,
            separated: true,
            onClick: () => void handleDelete(i),
          },
        ]}
        emptyIcon={<UtensilsCrossed size={19} />}
        emptyTitle={categories.length === 0 ? "Create a category first" : "No dishes yet"}
        emptyDescription={
          categories.length === 0
            ? "Every dish belongs to a menu category, so add one before adding dishes."
            : "Add the dishes guests will see on the public menu."
        }
        emptyAction={
          categories.length > 0 && (
            <Button variant="primary" icon={<Plus size={15} />} onClick={() => openCreate()}>
              New dish
            </Button>
          )
        }
      />

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editingId ? "Edit dish" : "New dish"}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" form="menu-item-form" loading={saving}>
              {editingId ? "Save changes" : "Add dish"}
            </Button>
          </>
        }
      >
        <form id="menu-item-form" onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <p className="rounded-md border border-danger-100 bg-danger-50 px-3 py-2 text-sm text-danger-700">
              {formError}
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Category"
              required
              value={form.categoryId}
              onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
            >
              <option value="">Select a category…</option>
              {categories.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </Select>
            <TextInput
              label="Dish name"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Paneer Tikka"
            />
          </div>

          <TextArea
            label="Description"
            required
            rows={3}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            hint="At least 3 characters. Shown under the dish name."
          />

          <div className="grid gap-4 sm:grid-cols-3">
            <TextInput
              label="Price"
              type="number"
              min={0}
              step="0.01"
              required
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              hint="₹"
            />
            <Select
              label="Food type"
              required
              value={form.foodType}
              onChange={(e) =>
                setForm({ ...form, foodType: e.target.value as MenuItem["foodType"] })
              }
            >
              <option value="veg">Veg</option>
              <option value="non_veg">Non-veg</option>
              <option value="egg">Egg</option>
            </Select>
            <Select
              label="Spice level"
              value={form.spiceLevel}
              onChange={(e) => setForm({ ...form, spiceLevel: e.target.value })}
            >
              <option value="">Not specified</option>
              <option value="mild">Mild</option>
              <option value="medium">Medium</option>
              <option value="hot">Hot</option>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <TextInput
              label="Tags"
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
              placeholder="jain, gluten-free, bestseller"
              hint="Comma-separated, up to 10. Guests can search by these."
            />
            <TextInput
              label="Display order"
              type="number"
              min={0}
              value={form.displayOrder}
              onChange={(e) => setForm({ ...form, displayOrder: e.target.value })}
              hint="Lower numbers appear first within the category."
            />
          </div>

          <div className="space-y-3 rounded-lg border border-line bg-surface-hover p-4">
            <Toggle
              checked={form.isAvailable}
              onChange={(v) => setForm({ ...form, isAvailable: v })}
              label="Available to order"
              description="Unavailable dishes stay on the menu but are marked as sold out."
            />
            <Toggle
              checked={form.isChefSpecial}
              onChange={(v) => setForm({ ...form, isChefSpecial: v })}
              label="Chef's special"
              description="Surfaced in the chef specials section of the public menu."
            />
            <Toggle
              checked={form.isTodaysSpecial}
              onChange={(v) => setForm({ ...form, isTodaysSpecial: v })}
              label="Today's special"
              description="Highlighted for the day. Remember to turn it off tomorrow."
            />
          </div>

          <ImageUploader
            label="Dish photo"
            single
            value={image}
            onChange={setImage}
            folder="menu"
            upload={uploadRestaurantImage}
            hint="One photo per dish. Square or 4:3 crops look best on the menu."
          />
        </form>
      </Modal>
    </>
  );
}
