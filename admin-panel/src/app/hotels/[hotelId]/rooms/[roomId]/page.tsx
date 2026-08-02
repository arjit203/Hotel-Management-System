"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { CalendarOff, Images, Info, Plus, Save } from "lucide-react";
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
import { adminApi, formatApiError, uploadImage } from "@/lib/api";
import { currency, shortDate, todayInputValue } from "@/lib/format";

const ROOM_CATEGORIES = ["Deluxe", "Executive", "Luxury", "Suite"];

interface AvailabilityOverride {
  _id: string;
  date: string;
  blockedCount: number;
  reason?: string;
}

interface RoomDetails {
  categoryName: string;
  name: string;
  slug: string;
  description: string;
  basePrice: number;
  maxOccupancy: number;
  totalRooms: number;
  amenities: string[];
  images: string[];
}

const TAB_KEYS = ["details", "images", "availability"] as const;
type TabKey = (typeof TAB_KEYS)[number];

/**
 * Room workspace: details, photos and manual availability overrides.
 *
 * Same three endpoints as before —
 *   GET/PUT /admin/hotels/rooms/:roomId
 *   GET/PUT /admin/hotels/rooms/:roomId/availability
 * — reorganised into tabs so the availability tool isn't buried below a long
 * edit form.
 */
export default function ManageRoomPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const hotelId = params.hotelId as string;
  const roomId = params.roomId as string;

  const { toastSuccess, toastError } = useToast();

  const tabParam = searchParams.get("tab");
  const activeTab: TabKey = TAB_KEYS.includes(tabParam as TabKey) ? (tabParam as TabKey) : "details";

  function setTab(key: string) {
    router.replace(`/hotels/${hotelId}/rooms/${roomId}?tab=${key}`, { scroll: false });
  }

  // ---- room ---------------------------------------------------------------
  const [loadingRoom, setLoadingRoom] = useState(true);
  const [savingRoom, setSavingRoom] = useState(false);
  const [roomError, setRoomError] = useState<string | null>(null);
  const [roomName, setRoomName] = useState("");
  const [editForm, setEditForm] = useState({
    categoryName: "Deluxe",
    name: "",
    slug: "",
    description: "",
    basePrice: "",
    maxOccupancy: "",
    totalRooms: "",
    amenities: "",
  });
  const [images, setImages] = useState<string[]>([]);

  const loadRoom = useCallback(async () => {
    setLoadingRoom(true);
    const res = await adminApi.get<RoomDetails>(`/admin/hotels/rooms/${roomId}`);
    if (res.success && res.data) {
      const r = res.data;
      setRoomName(r.name);
      setEditForm({
        categoryName: r.categoryName,
        name: r.name,
        slug: r.slug,
        description: r.description,
        basePrice: String(r.basePrice),
        maxOccupancy: String(r.maxOccupancy),
        totalRooms: String(r.totalRooms),
        amenities: (r.amenities || []).join(", "),
      });
      setImages(r.images || []);
    } else {
      setRoomError(formatApiError(res));
    }
    setLoadingRoom(false);
  }, [roomId]);

  // ---- availability -------------------------------------------------------
  const [overrides, setOverrides] = useState<AvailabilityOverride[]>([]);
  const [loadingOverrides, setLoadingOverrides] = useState(true);
  const [blockOpen, setBlockOpen] = useState(false);
  const [blockForm, setBlockForm] = useState({ date: "", blockedCount: "1", reason: "" });
  const [savingBlock, setSavingBlock] = useState(false);
  const [blockError, setBlockError] = useState<string | null>(null);

  const loadOverrides = useCallback(async () => {
    setLoadingOverrides(true);
    const res = await adminApi.get<AvailabilityOverride[]>(
      `/admin/hotels/rooms/${roomId}/availability`
    );
    if (res.success) setOverrides(res.data || []);
    setLoadingOverrides(false);
  }, [roomId]);

  useEffect(() => {
    void loadRoom();
    void loadOverrides();
  }, [loadRoom, loadOverrides]);

  async function handleUpdateRoom(e: React.FormEvent) {
    e.preventDefault();
    setRoomError(null);
    setSavingRoom(true);

    const res = await adminApi.put(`/admin/hotels/rooms/${roomId}`, {
      categoryName: editForm.categoryName,
      name: editForm.name,
      slug: editForm.slug,
      description: editForm.description,
      basePrice: Number(editForm.basePrice),
      maxOccupancy: Number(editForm.maxOccupancy),
      totalRooms: Number(editForm.totalRooms),
      amenities: editForm.amenities
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean),
      images,
    });
    setSavingRoom(false);

    if (!res.success) {
      setRoomError(formatApiError(res));
      toastError(formatApiError(res));
      return;
    }

    toastSuccess("Room updated.");
    setRoomName(editForm.name);
  }

  /** Saving the images tab reuses the same PUT — updateRoomSchema is a partial. */
  async function handleSaveImages() {
    setSavingRoom(true);
    const res = await adminApi.put(`/admin/hotels/rooms/${roomId}`, { images });
    setSavingRoom(false);

    if (!res.success) {
      toastError(formatApiError(res));
      return;
    }
    toastSuccess(`${images.length} photo${images.length === 1 ? "" : "s"} saved.`);
  }

  function openBlockForm() {
    setBlockForm({ date: todayInputValue(), blockedCount: "1", reason: "" });
    setBlockError(null);
    setBlockOpen(true);
  }

  async function handleSetAvailability(e: React.FormEvent) {
    e.preventDefault();
    setBlockError(null);
    setSavingBlock(true);

    const res = await adminApi.put(`/admin/hotels/rooms/${roomId}/availability`, {
      date: blockForm.date,
      blockedCount: Number(blockForm.blockedCount),
      reason: blockForm.reason || undefined,
    });
    setSavingBlock(false);

    if (!res.success) {
      setBlockError(formatApiError(res));
      return;
    }

    toastSuccess(
      Number(blockForm.blockedCount) === 0
        ? "Override cleared for that date."
        : `${blockForm.blockedCount} unit(s) blocked on ${shortDate(blockForm.date)}.`
    );
    setBlockOpen(false);
    void loadOverrides();
  }

  const overrideColumns: Column<AvailabilityOverride>[] = [
    {
      key: "date",
      header: "Date",
      sortable: true,
      accessor: (o) => new Date(o.date).getTime(),
      render: (o) => <span className="whitespace-nowrap font-medium">{shortDate(o.date)}</span>,
    },
    {
      key: "blocked",
      header: "Units blocked",
      sortable: true,
      accessor: (o) => o.blockedCount,
      align: "right",
      render: (o) => (
        <Badge tone={o.blockedCount > 0 ? "warning" : "neutral"}>
          {o.blockedCount} of {editForm.totalRooms || "?"}
        </Badge>
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

  if (loadingRoom && !roomName) {
    return (
      <RequireAdmin>
        <PageHeader
          title="Loading room…"
          loading
          breadcrumbs={[{ label: "Hotel", href: "/hotels" }, { label: "Room" }]}
        />
        <CardSkeleton />
      </RequireAdmin>
    );
  }

  return (
    <RequireAdmin>
      <PageHeader
        title={roomName || "Room"}
        description={`${editForm.categoryName} · ${editForm.totalRooms} unit${editForm.totalRooms === "1" ? "" : "s"}`}
        breadcrumbs={[
          { label: "Hotel", href: "/hotels" },
          { label: "Property", href: `/hotels/${hotelId}?tab=rooms` },
          { label: roomName || "Room" },
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
            Block dates
          </Button>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Base price"
          value={currency(Number(editForm.basePrice) || 0)}
          hint="Per night"
          tone="brand"
        />
        <StatCard label="Total units" value={editForm.totalRooms || "—"} hint="Physical rooms" />
        <StatCard label="Sleeps" value={editForm.maxOccupancy || "—"} hint="Guests per room" />
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
        <form onSubmit={handleUpdateRoom} className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">Room details</h2>
              <p className="card-subtitle">Pricing, capacity and public copy</p>
            </div>
            <Button variant="primary" type="submit" icon={<Save size={14} />} loading={savingRoom}>
              Save changes
            </Button>
          </div>

          <div className="card-body space-y-4">
            {roomError && (
              <p className="rounded-md border border-danger-100 bg-danger-50 px-3 py-2 text-sm text-danger-700">
                {roomError}
              </p>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <Select
                label="Category"
                value={editForm.categoryName}
                onChange={(e) => setEditForm({ ...editForm, categoryName: e.target.value })}
              >
                {ROOM_CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
                {/* Preserve a category the backend already holds but this list doesn't. */}
                {!ROOM_CATEGORIES.includes(editForm.categoryName) && (
                  <option>{editForm.categoryName}</option>
                )}
              </Select>
              <TextInput
                label="Room name"
                required
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
            </div>

            <TextInput
              label="URL slug"
              required
              value={editForm.slug}
              onChange={(e) => setEditForm({ ...editForm, slug: e.target.value })}
              hint="Changing this changes the room's public URL — existing links and bookmarks to the old one will break. Leave as-is unless you specifically need to change it."
            />

            <TextArea
              label="Description"
              required
              rows={4}
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
            />

            <div className="grid gap-4 sm:grid-cols-3">
              <TextInput
                label="Base price"
                type="number"
                min={0}
                required
                value={editForm.basePrice}
                onChange={(e) => setEditForm({ ...editForm, basePrice: e.target.value })}
                hint="₹ per night"
              />
              <TextInput
                label="Max occupancy"
                type="number"
                min={1}
                required
                value={editForm.maxOccupancy}
                onChange={(e) => setEditForm({ ...editForm, maxOccupancy: e.target.value })}
                hint="Guests per room"
              />
              <TextInput
                label="Total units"
                type="number"
                min={1}
                required
                value={editForm.totalRooms}
                onChange={(e) => setEditForm({ ...editForm, totalRooms: e.target.value })}
                hint="Reducing this reduces availability"
              />
            </div>

            <TextInput
              label="Amenities"
              value={editForm.amenities}
              onChange={(e) => setEditForm({ ...editForm, amenities: e.target.value })}
              placeholder="AC, Free WiFi, Mini Bar"
              hint="Comma-separated."
            />
          </div>
        </form>
      )}

      {activeTab === "images" && (
        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">Room photos</h2>
              <p className="card-subtitle">
                Drag to upload several at once. The first photo is the cover.
              </p>
            </div>
            <Button
              variant="primary"
              icon={<Save size={14} />}
              loading={savingRoom}
              onClick={handleSaveImages}
            >
              Save photos
            </Button>
          </div>
          <div className="card-body">
            <ImageUploader
              value={images}
              onChange={setImages}
              folder="rooms"
              upload={uploadImage}
              hint="Uploads reach Cloudinary immediately, but the room only points at them once you press Save."
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
                Overrides hold units back for maintenance or a private hold. Real bookable
                availability is computed on every read as{" "}
                <span className="font-medium text-ink-800">
                  total units − blocked − overlapping bookings
                </span>
                , so you never need a row per room per day. Setting a date&apos;s blocked count back
                to <span className="font-medium text-ink-800">0</span> clears its override.
              </p>
            </div>
          </div>

          <DataTable
            columns={overrideColumns}
            rows={overrides}
            rowKey={(o) => o._id}
            loading={loadingOverrides}
            searchable={(o) => `${shortDate(o.date)} ${o.reason || ""}`}
            searchPlaceholder="Search overrides…"
            initialSort={{ key: "date", direction: "asc" }}
            toolbarActions={
              <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={openBlockForm}>
                Block dates
              </Button>
            }
            emptyIcon={<CalendarOff size={19} />}
            emptyTitle="No manual overrides"
            emptyDescription="Every unit of this room type is available except where guest bookings already overlap."
            emptyAction={
              <Button variant="primary" icon={<Plus size={15} />} onClick={openBlockForm}>
                Block dates
              </Button>
            }
          />
        </div>
      )}

      <Modal
        open={blockOpen}
        onClose={() => setBlockOpen(false)}
        title="Set availability override"
        description="Hold units back on a specific date."
        footer={
          <>
            <Button variant="secondary" onClick={() => setBlockOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" form="block-form" loading={savingBlock}>
              Save override
            </Button>
          </>
        }
      >
        <form id="block-form" onSubmit={handleSetAvailability} className="space-y-4">
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
            label="Units to block"
            type="number"
            min={0}
            max={Number(editForm.totalRooms) || undefined}
            required
            value={blockForm.blockedCount}
            onChange={(e) => setBlockForm({ ...blockForm, blockedCount: e.target.value })}
            hint={`This room type has ${editForm.totalRooms || "?"} unit(s). Set 0 to clear an existing override.`}
          />

          <TextInput
            label="Reason"
            value={blockForm.reason}
            onChange={(e) => setBlockForm({ ...blockForm, reason: e.target.value })}
            placeholder="Deep clean / maintenance / owner hold"
            hint="Optional, internal only."
          />
        </form>
      </Modal>
    </RequireAdmin>
  );
}
