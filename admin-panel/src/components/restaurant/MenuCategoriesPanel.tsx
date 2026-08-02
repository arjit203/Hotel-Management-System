"use client";

import { useState } from "react";
import { LayoutList, Pencil, Plus, Trash2 } from "lucide-react";
import { adminApi, formatApiError } from "@/lib/api";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import DataTable, { Column } from "@/components/ui/DataTable";
import { TextArea, TextInput } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { slugify } from "@/lib/format";

export interface MenuCategory {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  displayOrder?: number;
}

interface Props {
  restaurantId: string;
  categories: MenuCategory[];
  /** Item counts per categoryId, so the table can warn before a blocked delete. */
  itemCounts: Record<string, number>;
  loading?: boolean;
  onChanged: () => void;
}

const EMPTY = { name: "", slug: "", description: "", displayOrder: "0" };

/**
 * Menu categories (Starters, Mains, Desserts…).
 *
 * Deleting a category is refused by the backend while it still holds active
 * items, so the table shows the item count and the confirmation explains the
 * rule up front instead of letting the admin hit a 409.
 */
export default function MenuCategoriesPanel({
  restaurantId,
  categories,
  itemCounts,
  loading,
  onChanged,
}: Props) {
  const { toastSuccess, toastError } = useToast();
  const confirm = useConfirm();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<MenuCategory | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);

  function openCreate() {
    setEditing(null);
    setForm({ ...EMPTY, displayOrder: String(categories.length) });
    setSlugTouched(false);
    setFormError(null);
    setOpen(true);
  }

  function openEdit(category: MenuCategory) {
    setEditing(category);
    setForm({
      name: category.name,
      slug: category.slug,
      description: category.description || "",
      displayOrder: String(category.displayOrder ?? 0),
    });
    setSlugTouched(true);
    setFormError(null);
    setOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSaving(true);

    const payload = {
      name: form.name,
      slug: form.slug,
      description: form.description || undefined,
      displayOrder: form.displayOrder ? Number(form.displayOrder) : undefined,
    };

    const res = editing
      ? await adminApi.put(`/admin/restaurants/menu/categories/${editing._id}`, payload)
      : await adminApi.post(`/admin/restaurants/${restaurantId}/menu/categories`, payload);
    setSaving(false);

    if (!res.success) {
      setFormError(formatApiError(res));
      return;
    }

    toastSuccess(editing ? "Category updated." : "Category created.");
    setOpen(false);
    onChanged();
  }

  async function handleDelete(category: MenuCategory) {
    const count = itemCounts[category._id] ?? 0;
    const ok = await confirm({
      title: `Delete “${category.name}”?`,
      description:
        count > 0
          ? `This category still holds ${count} dish${count === 1 ? "" : "es"}. The API will refuse the delete until they are moved or removed.`
          : "The category is deactivated, not erased.",
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;

    const res = await adminApi.delete(`/admin/restaurants/menu/categories/${category._id}`);
    if (!res.success) {
      toastError(formatApiError(res));
      return;
    }
    toastSuccess("Category deleted.");
    onChanged();
  }

  const columns: Column<MenuCategory>[] = [
    {
      key: "order",
      header: "#",
      sortable: true,
      accessor: (c) => c.displayOrder ?? 0,
      width: "w-14",
      render: (c) => <span className="tabular-nums text-ink-500">{c.displayOrder ?? 0}</span>,
    },
    {
      key: "name",
      header: "Category",
      sortable: true,
      accessor: (c) => c.name,
      render: (c) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-ink-800">{c.name}</p>
          <p className="truncate font-mono text-xs text-ink-500">/{c.slug}</p>
        </div>
      ),
    },
    {
      key: "description",
      header: "Description",
      accessor: (c) => c.description ?? "",
      hideBelow: "md",
      render: (c) => (
        <span className="line-clamp-2 text-ink-600">{c.description || "—"}</span>
      ),
    },
    {
      key: "items",
      header: "Dishes",
      sortable: true,
      accessor: (c) => itemCounts[c._id] ?? 0,
      align: "right",
      render: (c) => <span className="tabular-nums">{itemCounts[c._id] ?? 0}</span>,
    },
  ];

  return (
    <>
      <DataTable
        columns={columns}
        rows={categories}
        rowKey={(c) => c._id}
        loading={loading}
        searchable={(c) => `${c.name} ${c.slug} ${c.description || ""}`}
        searchPlaceholder="Search categories…"
        initialSort={{ key: "order", direction: "asc" }}
        toolbarActions={
          <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={openCreate}>
            New category
          </Button>
        }
        emptyIcon={<LayoutList size={19} />}
        emptyTitle="No menu categories"
        emptyDescription="Dishes must belong to a category, so start here."
        emptyAction={
          <Button variant="primary" icon={<Plus size={15} />} onClick={openCreate}>
            New category
          </Button>
        }
        actions={(c) => [
          { label: "Edit", icon: <Pencil size={14} />, onClick: () => openEdit(c) },
          {
            label: "Delete",
            icon: <Trash2 size={14} />,
            danger: true,
            separated: true,
            onClick: () => void handleDelete(c),
          },
        ]}
      />

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit category" : "New menu category"}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" form="menu-category-form" loading={saving}>
              {editing ? "Save changes" : "Create category"}
            </Button>
          </>
        }
      >
        <form id="menu-category-form" onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <p className="rounded-md border border-danger-100 bg-danger-50 px-3 py-2 text-sm text-danger-700">
              {formError}
            </p>
          )}

          <TextInput
            label="Name"
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
            placeholder="Tandoori Starters"
          />

          <TextInput
            label="Slug"
            required
            value={form.slug}
            onChange={(e) => {
              setSlugTouched(true);
              setForm({ ...form, slug: e.target.value });
            }}
            hint="Lowercase, numbers and hyphens. Must be unique within this restaurant."
          />

          <TextArea
            label="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Optional blurb shown above the dishes."
          />

          <TextInput
            label="Display order"
            type="number"
            min={0}
            value={form.displayOrder}
            onChange={(e) => setForm({ ...form, displayOrder: e.target.value })}
            hint="Lower numbers appear first on the public menu."
            wrapperClassName="sm:max-w-[10rem]"
          />
        </form>
      </Modal>
    </>
  );
}
