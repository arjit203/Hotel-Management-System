"use client";

import { useMemo, useState } from "react";
import { Pencil, Plus, Tag, Trash2 } from "lucide-react";
import { adminApi, formatApiError } from "@/lib/api";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import DataTable, { Column } from "@/components/ui/DataTable";
import { TextArea, TextInput } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { shortDate } from "@/lib/format";

export interface OfferItem {
  _id: string;
  title: string;
  description?: string;
  imageUrl?: string;
  validFrom: string;
  validTo: string;
}

interface Props {
  /** "/admin/hotels" or "/admin/restaurants". */
  basePath: string;
  ownerId: string;
  items: OfferItem[];
  loading?: boolean;
  onChanged: () => void;
  readOnly?: boolean;
}

const EMPTY = { title: "", description: "", validFrom: "", validTo: "" };

/** `<input type="date">` needs YYYY-MM-DD; the API returns full ISO strings. */
function toDateInput(value?: string): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function offerWindow(offer: OfferItem): "scheduled" | "active" | "expired" {
  const now = Date.now();
  if (new Date(offer.validFrom).getTime() > now) return "scheduled";
  if (new Date(offer.validTo).getTime() < now) return "expired";
  return "active";
}

/**
 * Offers manager shared by Hotel and Restaurant — the Offer model is
 * polymorphic (`applicableTo` + `ownerId`) and both verticals expose the same
 * create/update/delete routes.
 *
 * Note the list only ever contains *currently valid* offers: the aggregate that
 * feeds it comes from `contentService.getActiveOffers`, which filters by date
 * server-side. Expired offers still exist in the database but are not returned,
 * so they cannot be listed or edited here.
 */
export default function OffersManager({
  basePath,
  ownerId,
  items,
  loading,
  onChanged,
  readOnly,
}: Props) {
  const { toastSuccess, toastError } = useToast();
  const confirm = useConfirm();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<OfferItem | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const activeCount = useMemo(
    () => items.filter((o) => offerWindow(o) === "active").length,
    [items]
  );

  function openCreate() {
    setEditing(null);
    setForm(EMPTY);
    setFormError(null);
    setOpen(true);
  }

  function openEdit(offer: OfferItem) {
    setEditing(offer);
    setForm({
      title: offer.title,
      description: offer.description || "",
      validFrom: toDateInput(offer.validFrom),
      validTo: toDateInput(offer.validTo),
    });
    setFormError(null);
    setOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (form.validTo && form.validFrom && form.validTo < form.validFrom) {
      setFormError("The end date cannot be before the start date.");
      return;
    }

    setSaving(true);
    const payload = {
      title: form.title,
      description: form.description || undefined,
      validFrom: form.validFrom,
      validTo: form.validTo,
    };

    const res = editing
      ? await adminApi.put(`${basePath}/offers/${editing._id}`, payload)
      : await adminApi.post(`${basePath}/${ownerId}/offers`, payload);
    setSaving(false);

    if (!res.success) {
      setFormError(formatApiError(res));
      return;
    }

    toastSuccess(editing ? "Offer updated." : "Offer added.");
    setOpen(false);
    onChanged();
  }

  async function handleDelete(offer: OfferItem) {
    const ok = await confirm({
      title: `Delete “${offer.title}”?`,
      description: "The offer stops showing on the public site right away.",
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;

    const res = await adminApi.delete(`${basePath}/offers/${offer._id}`);
    if (!res.success) {
      toastError(formatApiError(res));
      return;
    }
    toastSuccess("Offer deleted.");
    onChanged();
  }

  const columns: Column<OfferItem>[] = [
    {
      key: "title",
      header: "Offer",
      sortable: true,
      accessor: (o) => o.title,
      render: (o) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-ink-800">{o.title}</p>
          {o.description && (
            <p className="line-clamp-1 text-xs text-ink-500">{o.description}</p>
          )}
        </div>
      ),
    },
    {
      key: "validFrom",
      header: "Runs",
      sortable: true,
      accessor: (o) => new Date(o.validFrom).getTime(),
      hideBelow: "sm",
      render: (o) => (
        <span className="whitespace-nowrap text-ink-600">
          {shortDate(o.validFrom)} → {shortDate(o.validTo)}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      accessor: (o) => offerWindow(o),
      render: (o) => {
        const w = offerWindow(o);
        return (
          <Badge tone={w === "active" ? "success" : w === "scheduled" ? "info" : "neutral"}>
            {w}
          </Badge>
        );
      },
    },
  ];

  return (
    <>
      <DataTable
        columns={columns}
        rows={items}
        rowKey={(o) => o._id}
        loading={loading}
        searchable={(o) => `${o.title} ${o.description || ""}`}
        searchPlaceholder="Search offers…"
        initialSort={{ key: "validFrom", direction: "desc" }}
        countLabel={`${activeCount} live · ${items.length} total`}
        toolbarActions={
          !readOnly && (
            <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={openCreate}>
              New offer
            </Button>
          )
        }
        emptyIcon={<Tag size={19} />}
        emptyTitle="No offers running"
        emptyDescription="Only offers whose date range covers today are returned by the API, so past offers won't appear here."
        emptyAction={
          !readOnly && (
            <Button variant="primary" icon={<Plus size={15} />} onClick={openCreate}>
              New offer
            </Button>
          )
        }
        actions={
          readOnly
            ? undefined
            : (o) => [
                { label: "Edit", icon: <Pencil size={14} />, onClick: () => openEdit(o) },
                {
                  label: "Delete",
                  icon: <Trash2 size={14} />,
                  danger: true,
                  separated: true,
                  onClick: () => void handleDelete(o),
                },
              ]
        }
      />

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit offer" : "New offer"}
        description="Offers appear on the public site only while today falls inside the date range."
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" form="offer-form" loading={saving}>
              {editing ? "Save changes" : "Add offer"}
            </Button>
          </>
        }
      >
        <form id="offer-form" onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <p className="rounded-md border border-danger-100 bg-danger-50 px-3 py-2 text-sm text-danger-700">
              {formError}
            </p>
          )}

          <TextInput
            label="Title"
            required
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Monsoon weekend — 20% off"
          />

          <TextArea
            label="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Terms, inclusions, who it applies to."
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <TextInput
              label="Valid from"
              type="date"
              required
              value={form.validFrom}
              onChange={(e) => setForm({ ...form, validFrom: e.target.value })}
            />
            <TextInput
              label="Valid to"
              type="date"
              required
              value={form.validTo}
              onChange={(e) => setForm({ ...form, validTo: e.target.value })}
            />
          </div>
        </form>
      </Modal>
    </>
  );
}
