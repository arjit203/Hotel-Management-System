"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Armchair, CalendarOff, Images, Info, Plus, Save } from "lucide-react";
// `Save` is used by both the details and photos tab headers.
import RequireAdmin from "@/components/RequireAdmin";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import Tabs from "@/components/ui/Tabs";
import DataTable, { Column } from "@/components/ui/DataTable";
import ImageUploader from "@/components/ui/ImageUploader";
import StatCard from "@/components/ui/StatCard";
import { Select, TextArea, TextInput } from "@/components/ui/Field";
import { CardSkeleton } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { adminApi, formatApiError, uploadRestaurantImage } from "@/lib/api";
import { currency, humanise, shortDate, timeSlotLabel, todayInputValue } from "@/lib/format";
import type { DiningArea } from "@/components/restaurant/DiningAreasPanel";

const AREA_TYPES: DiningArea["areaType"][] = ["main", "private", "family", "outdoor"];

interface TableOverride {
  _id: string;
  date: string;
  timeSlot?: string;
  blockedTables: number;
  reason?: string;
}

const TAB_KEYS = ["details", "images", "availability"] as const;
type TabKey = (typeof TAB_KEYS)[number];

/**
 * Dining area workspace: details, photos and table-availability overrides.
 *
 * Mirrors the hotel room page because the underlying model is the same shape —
 * a manual block table, with real availability computed on read as
 * total tables − blocked − overlapping reservations. Omitting the time slot
 * blocks the entire day, which is what the form's "Whole day" option sends.
 */
export default function ManageDiningAreaPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const restaurantId = params.restaurantId as string;
  const areaId = params.areaId as string;

  const { toastSuccess, toastError } = useToast();

  const tabParam = searchParams.get("tab");
  const activeTab: TabKey = TAB_KEYS.includes(tabParam as TabKey) ? (tabParam as TabKey) : "details";

  function setTab(key: string) {
    router.replace(`/restaurants/${restaurantId}/dining-areas/${areaId}?tab=${key}`, {
      scroll: false,
    });
  }

  // ---- area ---------------------------------------------------------------
  const [areaName, setAreaName] = useState("");
  const [loadingArea, setLoadingArea] = useState(true);
  const [saving, setSaving] = useState(false);
  const [areaError, setAreaError] = useState<string | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    areaType: "main" as DiningArea["areaType"],
    description: "",
    totalTables: "",
    maxPartySize: "",
    minPartySize: "",
    minimumSpend: "",
    features: "",
  });

  const loadArea = useCallback(async () => {
    setLoadingArea(true);
    const res = await adminApi.get<DiningArea>(`/admin/restaurants/dining-areas/${areaId}`);
    if (res.success && res.data) {
      const a = res.data;
      setAreaName(a.name);
      setForm({
        name: a.name,
        slug: a.slug,
        areaType: a.areaType,
        description: a.description,
        totalTables: String(a.totalTables),
        maxPartySize: String(a.maxPartySize),
        minPartySize: String(a.minPartySize ?? 1),
        minimumSpend: a.minimumSpend != null ? String(a.minimumSpend) : "",
        features: (a.features ?? []).join(", "),
      });
      setImages(a.images ?? []);
    } else {
      setAreaError(formatApiError(res));
    }
    setLoadingArea(false);
  }, [areaId]);

  // ---- availability -------------------------------------------------------
  const [overrides, setOverrides] = useState<TableOverride[]>([]);
  const [loadingOverrides, setLoadingOverrides] = useState(true);
  const [blockOpen, setBlockOpen] = useState(false);
  const [blockForm, setBlockForm] = useState({
    date: "",
    timeSlot: "",
    blockedTables: "1",
    reason: "",
  });
  const [savingBlock, setSavingBlock] = useState(false);
  const [blockError, setBlockError] = useState<string | null>(null);

  const loadOverrides = useCallback(async () => {
    setLoadingOverrides(true);
    const res = await adminApi.get<TableOverride[]>(
      `/admin/restaurants/dining-areas/${areaId}/availability`
    );
    if (res.success) setOverrides(res.data || []);
    setLoadingOverrides(false);
  }, [areaId]);

  useEffect(() => {
    void loadArea();
    void loadOverrides();
  }, [loadArea, loadOverrides]);

  async function handleSaveDetails(e: React.FormEvent) {
    e.preventDefault();
    setAreaError(null);

    const minParty = Number(form.minPartySize);
    const maxParty = Number(form.maxPartySize);
    if (minParty > maxParty) {
      setAreaError("Minimum party size cannot exceed the maximum.");
      return;
    }

    setSaving(true);
    const res = await adminApi.put(`/admin/restaurants/dining-areas/${areaId}`, {
      name: form.name,
      slug: form.slug,
      areaType: form.areaType,
      description: form.description,
      totalTables: Number(form.totalTables),
      maxPartySize: maxParty,
      minPartySize: minParty,
      minimumSpend: form.minimumSpend ? Number(form.minimumSpend) : undefined,
      features: form.features
        .split(",")
        .map((f) => f.trim())
        .filter(Boolean),
      images,
    });
    setSaving(false);

    if (!res.success) {
      setAreaError(formatApiError(res));
      toastError(formatApiError(res));
      return;
    }

    toastSuccess("Dining area updated.");
    setAreaName(form.name);
  }

  async function handleSaveImages() {
    setSaving(true);
    const res = await adminApi.put(`/admin/restaurants/dining-areas/${areaId}`, { images });
    setSaving(false);

    if (!res.success) {
      toastError(formatApiError(res));
      return;
    }
    toastSuccess(`${images.length} photo${images.length === 1 ? "" : "s"} saved.`);
  }

  function openBlockForm() {
    setBlockForm({ date: todayInputValue(), timeSlot: "", blockedTables: "1", reason: "" });
    setBlockError(null);
    setBlockOpen(true);
  }

  async function handleSetAvailability(e: React.FormEvent) {
    e.preventDefault();
    setBlockError(null);

    if (blockForm.timeSlot && !/^([01]\d|2[0-3]):[0-5]\d$/.test(blockForm.timeSlot)) {
      setBlockError("Time slot must be 24-hour HH:MM, e.g. 19:30.");
      return;
    }

    setSavingBlock(true);
    const res = await adminApi.put(`/admin/restaurants/dining-areas/${areaId}/availability`, {
      date: blockForm.date,
      // Omitting timeSlot blocks the whole day — that's the API's contract.
      timeSlot: blockForm.timeSlot || undefined,
      blockedTables: Number(blockForm.blockedTables),
      reason: blockForm.reason || undefined,
    });
    setSavingBlock(false);

    if (!res.success) {
      setBlockError(formatApiError(res));
      return;
    }

    toastSuccess(
      Number(blockForm.blockedTables) === 0
        ? "Override cleared."
        : `${blockForm.blockedTables} table(s) blocked on ${shortDate(blockForm.date)}.`
    );
    setBlockOpen(false);
    void loadOverrides();
  }

  const columns: Column<TableOverride>[] = [
    {
      key: "date",
      header: "Date",
      sortable: true,
      accessor: (o) => new Date(o.date).getTime(),
      render: (o) => <span className="whitespace-nowrap font-medium">{shortDate(o.date)}</span>,
    },
    {
      key: "slot",
      header: "Slot",
      sortable: true,
      accessor: (o) => o.timeSlot ?? "",
      render: (o) =>
        o.timeSlot ? (
          <Badge tone="info">{timeSlotLabel(o.timeSlot)}</Badge>
        ) : (
          <Badge tone="warning">Whole day</Badge>
        ),
    },
    {
      key: "blocked",
      header: "Tables blocked",
      sortable: true,
      accessor: (o) => o.blockedTables,
      align: "right",
      render: (o) => (
        <span className="tabular-nums">
          {o.blockedTables} of {form.totalTables || "?"}
        </span>
      ),
    },
    {
      key: "reason",
      header: "Reason",
      accessor: (o) => o.reason ?? "",
      hideBelow: "sm",
      render: (o) => <span className="text-ink-600">{o.reason || "—"}</span>,
    },
  ];

  if (loadingArea && !areaName) {
    return (
      <RequireAdmin>
        <PageHeader
          title="Loading dining area…"
          loading
          breadcrumbs={[{ label: "Restaurant", href: "/restaurants" }, { label: "Dining area" }]}
        />
        <CardSkeleton />
      </RequireAdmin>
    );
  }

  return (
    <RequireAdmin>
      <PageHeader
        title={areaName || "Dining area"}
        description={`${humanise(form.areaType)} · ${form.totalTables} table${form.totalTables === "1" ? "" : "s"}`}
        breadcrumbs={[
          { label: "Restaurant", href: "/restaurants" },
          { label: "Property", href: `/restaurants/${restaurantId}?tab=areas` },
          { label: areaName || "Dining area" },
        ]}
        actions={
          <Button
            variant="primary"
            icon={<CalendarOff size={15} />}
            onClick={() => {
              setTab("availability");
              openBlockForm();
            }}
          >
            Block tables
          </Button>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Tables" value={form.totalTables || "—"} tone="brand" icon={<Armchair size={15} />} />
        <StatCard
          label="Party size"
          value={`${form.minPartySize || 1}–${form.maxPartySize || "?"}`}
          hint="Per table"
        />
        <StatCard
          label="Minimum spend"
          value={form.minimumSpend ? currency(Number(form.minimumSpend)) : "None"}
        />
        <StatCard
          label="Date overrides"
          value={overrides.length}
          hint="Manual blocks"
          tone={overrides.length > 0 ? "warning" : "neutral"}
        />
      </div>

      <Tabs
        className="mb-5"
        active={activeTab}
        onChange={setTab}
        tabs={[
          { key: "details", label: "Details", icon: <Info size={14} /> },
          { key: "images", label: "Photos", icon: <Images size={14} />, count: images.length },
          {
            key: "availability",
            label: "Availability",
            icon: <CalendarOff size={14} />,
            count: overrides.length,
          },
        ]}
      />

      {activeTab === "details" && (
        <form onSubmit={handleSaveDetails} className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">Area details</h2>
              <p className="card-subtitle">Capacity and public copy</p>
            </div>
            <Button variant="primary" type="submit" icon={<Save size={14} />} loading={saving}>
              Save changes
            </Button>
          </div>

          <div className="card-body space-y-4">
            {areaError && (
              <p className="rounded-md border border-danger-100 bg-danger-50 px-3 py-2 text-sm text-danger-700">
                {areaError}
              </p>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <TextInput
                label="Area name"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
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
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              hint="Changing this changes the area's public URL — existing links will break."
            />

            <TextArea
              label="Description"
              required
              rows={4}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
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
                hint="₹, optional."
              />
              <TextInput
                label="Features"
                value={form.features}
                onChange={(e) => setForm({ ...form, features: e.target.value })}
                placeholder="Air-conditioned, Live music"
                hint="Comma-separated."
              />
            </div>
          </div>
        </form>
      )}

      {activeTab === "images" && (
        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">Area photos</h2>
              <p className="card-subtitle">The first photo is the cover on the public site.</p>
            </div>
            <Button
              variant="primary"
              icon={<Save size={14} />}
              loading={saving}
              onClick={handleSaveImages}
            >
              Save photos
            </Button>
          </div>
          <div className="card-body">
            <ImageUploader
              value={images}
              onChange={setImages}
              folder="dining-areas"
              upload={uploadRestaurantImage}
              hint="Uploads reach Cloudinary immediately, but the area only points at them once you press Save."
            />
          </div>
        </div>
      )}

      {activeTab === "availability" && (
        <div className="space-y-4">
          <div className="card">
            <div className="card-body flex flex-wrap items-start gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-info-50 text-info-600">
                <Info size={15} />
              </span>
              <p className="min-w-0 flex-1 text-base text-ink-600">
                Overrides hold tables back for a private event or a closure. Bookable tables are
                computed on read as{" "}
                <span className="font-medium text-ink-800">
                  total tables − blocked − overlapping reservations
                </span>
                . Leave the slot blank to block the whole day; set blocked tables to{" "}
                <span className="font-medium text-ink-800">0</span> to clear an override.
              </p>
            </div>
          </div>

          <DataTable
            columns={columns}
            rows={overrides}
            rowKey={(o) => o._id}
            loading={loadingOverrides}
            searchable={(o) => `${shortDate(o.date)} ${o.timeSlot || "whole day"} ${o.reason || ""}`}
            searchPlaceholder="Search overrides…"
            initialSort={{ key: "date", direction: "asc" }}
            toolbarActions={
              <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={openBlockForm}>
                Block tables
              </Button>
            }
            emptyIcon={<CalendarOff size={19} />}
            emptyTitle="No manual overrides"
            emptyDescription="Every table is available except where guest reservations already overlap."
            emptyAction={
              <Button variant="primary" icon={<Plus size={15} />} onClick={openBlockForm}>
                Block tables
              </Button>
            }
          />
        </div>
      )}

      <Modal
        open={blockOpen}
        onClose={() => setBlockOpen(false)}
        title="Set table availability override"
        description="Hold tables back on a date, optionally for one sitting."
        footer={
          <>
            <Button variant="secondary" onClick={() => setBlockOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" form="table-block-form" loading={savingBlock}>
              Save override
            </Button>
          </>
        }
      >
        <form id="table-block-form" onSubmit={handleSetAvailability} className="space-y-4">
          {blockError && (
            <p className="rounded-md border border-danger-100 bg-danger-50 px-3 py-2 text-sm text-danger-700">
              {blockError}
            </p>
          )}

          <TextInput
            label="Date"
            type="date"
            required
            value={blockForm.date}
            onChange={(e) => setBlockForm({ ...blockForm, date: e.target.value })}
          />

          <TextInput
            label="Time slot"
            value={blockForm.timeSlot}
            onChange={(e) => setBlockForm({ ...blockForm, timeSlot: e.target.value })}
            placeholder="19:30"
            hint="24-hour HH:MM. Leave blank to block the whole day."
          />

          <TextInput
            label="Tables to block"
            type="number"
            min={0}
            max={Number(form.totalTables) || undefined}
            required
            value={blockForm.blockedTables}
            onChange={(e) => setBlockForm({ ...blockForm, blockedTables: e.target.value })}
            hint={`This area has ${form.totalTables || "?"} table(s). Set 0 to clear an existing override.`}
          />

          <TextInput
            label="Reason"
            value={blockForm.reason}
            onChange={(e) => setBlockForm({ ...blockForm, reason: e.target.value })}
            placeholder="Private event / maintenance"
            hint="Optional, internal only."
          />
        </form>
      </Modal>
    </RequireAdmin>
  );
}
