"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  BedDouble,
  Building2,
  ExternalLink,
  Image as ImageIcon,
  MessageSquareQuote,
  Plus,
  PowerOff,
  Settings2,
  Sliders,
  Star,
  Tag,
} from "lucide-react";
import RequireAdmin from "@/components/RequireAdmin";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import Tabs from "@/components/ui/Tabs";
import Accordion from "@/components/ui/Accordion";
import DataTable, { Column } from "@/components/ui/DataTable";
import ImageUploader from "@/components/ui/ImageUploader";
import StatCard from "@/components/ui/StatCard";
import { Select, TextArea, TextInput } from "@/components/ui/Field";
import { CardSkeleton, ErrorState } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import GalleryManager, { GalleryItem } from "@/components/content/GalleryManager";
import OffersManager, { OfferItem } from "@/components/content/OffersManager";
import FaqManager, { FaqItem } from "@/components/content/FaqManager";
import ReviewsManager, { ReviewItem } from "@/components/content/ReviewsManager";
import { adminApi, formatApiError, publicGet, uploadImage } from "@/lib/api";
import { useBusiness } from "@/lib/businessContext";
import { currency, slugify } from "@/lib/format";

const PUBLIC_SITE_URL = process.env.NEXT_PUBLIC_FRONTEND_URL || "http://localhost:3000";
const ROOM_CATEGORIES = ["Deluxe", "Executive", "Luxury", "Suite"];
const GALLERY_CATEGORIES = ["Exterior", "Interior", "Rooms", "Food", "Building"];

interface HotelData {
  _id: string;
  name: string;
  slug: string;
  description: string;
  address: string;
  contactPhone: string;
  contactEmail: string;
  starRating?: number;
  metaTitle?: string;
  metaDescription?: string;
  isActive?: boolean;
}

interface RoomData {
  _id: string;
  name: string;
  slug: string;
  categoryName: string;
  basePrice: number;
  maxOccupancy?: number;
  totalRooms: number;
  images?: string[];
}

interface HotelAggregate {
  hotel: HotelData;
  rooms: RoomData[];
  offers: OfferItem[];
  faqs: FaqItem[];
  gallery: GalleryItem[];
}

const TAB_KEYS = ["overview", "rooms", "gallery", "offers", "faqs", "reviews"] as const;
type TabKey = (typeof TAB_KEYS)[number];

const EMPTY_ROOM_FORM = {
  categoryName: "Deluxe",
  name: "",
  slug: "",
  description: "",
  basePrice: "",
  maxOccupancy: "2",
  totalRooms: "1",
  amenities: "",
};

/**
 * Hotel property workspace.
 *
 * Replaces the single stacked page (property form + rooms + offers + gallery +
 * FAQs + reviews all rendered at once) with tabs over the same data and the
 * same endpoints. The aggregate still comes from the public
 * `GET /hotels/:slug` route — the only one that returns rooms, gallery, offers
 * and FAQs together — with reviews pulled from the admin route beside it.
 */
export default function ManageHotelPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const hotelId = params.hotelId as string;

  const { toastSuccess, toastError } = useToast();
  const confirm = useConfirm();
  const { reload: reloadBusinesses } = useBusiness();

  const [data, setData] = useState<HotelAggregate | null>(null);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const tabParam = searchParams.get("tab");
  const activeTab: TabKey = TAB_KEYS.includes(tabParam as TabKey) ? (tabParam as TabKey) : "overview";

  function setTab(key: string) {
    router.replace(`/hotels/${hotelId}?tab=${key}`, { scroll: false });
  }

  // ---- data ---------------------------------------------------------------
  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);

    const listRes = await publicGet<{ _id: string; slug: string }[]>("/hotels");
    if (!listRes.success) {
      setError(listRes.message || "Could not reach the API.");
      setLoading(false);
      return;
    }

    const found = (listRes.data || []).find((h) => h._id === hotelId);
    if (!found) {
      setError("This hotel could not be found, or it has been deactivated.");
      setLoading(false);
      return;
    }

    const [detailsRes, reviewsRes] = await Promise.all([
      publicGet<HotelAggregate>(`/hotels/${found.slug}`),
      adminApi.get<ReviewItem[]>(`/admin/hotels/${hotelId}/reviews`),
    ]);

    if (detailsRes.success && detailsRes.data) setData(detailsRes.data);
    else setError(detailsRes.message || "Could not load this hotel.");

    if (reviewsRes.success) setReviews(reviewsRes.data || []);

    setLoading(false);
  }, [hotelId]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const hotel = data?.hotel ?? null;
  const rooms = useMemo(() => data?.rooms ?? [], [data]);
  const pendingReviews = reviews.filter((r) => !r.isApproved).length;

  // ---- property form ------------------------------------------------------
  const [editOpen, setEditOpen] = useState(false);
  const [hotelForm, setHotelForm] = useState({
    name: "",
    description: "",
    address: "",
    contactPhone: "",
    contactEmail: "",
    starRating: "",
    metaTitle: "",
    metaDescription: "",
  });
  const [savingHotel, setSavingHotel] = useState(false);
  const [hotelFormError, setHotelFormError] = useState<string | null>(null);

  function openEditHotel() {
    if (!hotel) return;
    setHotelForm({
      name: hotel.name,
      description: hotel.description,
      address: hotel.address,
      contactPhone: hotel.contactPhone,
      contactEmail: hotel.contactEmail,
      starRating: hotel.starRating ? String(hotel.starRating) : "",
      // The public aggregate does not return SEO fields, so these start blank
      // and are only sent when filled — same as the original form.
      metaTitle: hotel.metaTitle || "",
      metaDescription: hotel.metaDescription || "",
    });
    setHotelFormError(null);
    setEditOpen(true);
  }

  async function handleUpdateHotel(e: React.FormEvent) {
    e.preventDefault();
    setHotelFormError(null);
    setSavingHotel(true);

    const res = await adminApi.put(`/admin/hotels/${hotelId}`, {
      name: hotelForm.name,
      description: hotelForm.description,
      address: hotelForm.address,
      contactPhone: hotelForm.contactPhone,
      contactEmail: hotelForm.contactEmail,
      starRating: hotelForm.starRating ? Number(hotelForm.starRating) : undefined,
      metaTitle: hotelForm.metaTitle || undefined,
      metaDescription: hotelForm.metaDescription || undefined,
    });
    setSavingHotel(false);

    if (!res.success) {
      setHotelFormError(formatApiError(res));
      return;
    }

    toastSuccess("Property details saved.");
    setEditOpen(false);
    void loadAll();
    reloadBusinesses();
  }

  // ---- room create --------------------------------------------------------
  const [roomOpen, setRoomOpen] = useState(false);
  const [roomForm, setRoomForm] = useState(EMPTY_ROOM_FORM);
  const [roomImages, setRoomImages] = useState<string[]>([]);
  const [savingRoom, setSavingRoom] = useState(false);
  const [roomFormError, setRoomFormError] = useState<string | null>(null);
  const [roomSlugTouched, setRoomSlugTouched] = useState(false);

  function openRoomForm() {
    setRoomForm(EMPTY_ROOM_FORM);
    setRoomImages([]);
    setRoomFormError(null);
    setRoomSlugTouched(false);
    setRoomOpen(true);
  }

  async function handleCreateRoom(e: React.FormEvent) {
    e.preventDefault();
    setRoomFormError(null);
    setSavingRoom(true);

    const res = await adminApi.post(`/admin/hotels/${hotelId}/rooms`, {
      ...roomForm,
      basePrice: Number(roomForm.basePrice),
      maxOccupancy: Number(roomForm.maxOccupancy),
      totalRooms: Number(roomForm.totalRooms),
      amenities: roomForm.amenities
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean),
      images: roomImages,
    });
    setSavingRoom(false);

    if (!res.success) {
      setRoomFormError(formatApiError(res));
      return;
    }

    toastSuccess(`${roomForm.name} created.`);
    setRoomOpen(false);
    void loadAll();
  }

  async function handleDeleteRoom(room: RoomData) {
    const ok = await confirm({
      title: `Deactivate ${room.name}?`,
      description:
        "The room stops being bookable and disappears from the public site. Nothing is deleted, and deactivation is blocked while active bookings exist.",
      confirmLabel: "Deactivate",
      danger: true,
    });
    if (!ok) return;

    const res = await adminApi.delete(`/admin/hotels/rooms/${room._id}`);
    if (!res.success) {
      toastError(formatApiError(res));
      return;
    }
    toastSuccess(`${room.name} deactivated.`);
    void loadAll();
  }

  // ---- render -------------------------------------------------------------
  if (loading && !data) {
    return (
      <RequireAdmin>
        <PageHeader title="Loading property…" loading breadcrumbs={[{ label: "Hotel", href: "/hotels" }]} />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </RequireAdmin>
    );
  }

  if (error || !hotel) {
    return (
      <RequireAdmin>
        <PageHeader title="Hotel" breadcrumbs={[{ label: "Hotel", href: "/hotels" }]} />
        <div className="card">
          <ErrorState message={error || "Hotel not found."} onRetry={loadAll} />
          <div className="card-footer">
            <Link href="/hotels" className="btn-secondary">
              Back to hotels
            </Link>
          </div>
        </div>
      </RequireAdmin>
    );
  }

  const roomColumns: Column<RoomData>[] = [
    {
      key: "name",
      header: "Room",
      sortable: true,
      accessor: (r) => r.name,
      render: (r) => (
        <div className="flex min-w-0 items-center gap-2.5">
          {r.images?.[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={r.images[0]}
              alt=""
              className="h-9 w-12 shrink-0 rounded border border-line object-cover"
            />
          ) : (
            <span className="flex h-9 w-12 shrink-0 items-center justify-center rounded border border-line bg-surface-muted text-ink-400">
              <BedDouble size={14} />
            </span>
          )}
          <div className="min-w-0">
            <Link
              href={`/hotels/${hotelId}/rooms/${r._id}`}
              className="block truncate font-medium text-ink-800 hover:text-brand-700 hover:underline"
            >
              {r.name}
            </Link>
            <span className="block truncate font-mono text-xs text-ink-500">/{r.slug}</span>
          </div>
        </div>
      ),
    },
    {
      key: "category",
      header: "Category",
      sortable: true,
      accessor: (r) => r.categoryName,
      hideBelow: "sm",
      render: (r) => <Badge tone="neutral">{r.categoryName}</Badge>,
    },
    {
      key: "price",
      header: "Base price",
      sortable: true,
      accessor: (r) => r.basePrice,
      align: "right",
      render: (r) => (
        <span className="whitespace-nowrap tabular-nums">
          {currency(r.basePrice)}
          <span className="text-xs text-ink-500"> /night</span>
        </span>
      ),
    },
    {
      key: "occupancy",
      header: "Sleeps",
      sortable: true,
      accessor: (r) => r.maxOccupancy ?? 0,
      align: "right",
      hideBelow: "lg",
      render: (r) => <span className="tabular-nums">{r.maxOccupancy ?? "—"}</span>,
    },
    {
      key: "inventory",
      header: "Units",
      sortable: true,
      accessor: (r) => r.totalRooms,
      align: "right",
      render: (r) => <span className="tabular-nums">{r.totalRooms}</span>,
    },
  ];

  return (
    <RequireAdmin>
      <PageHeader
        title={hotel.name}
        description={hotel.address}
        breadcrumbs={[{ label: "Hotel", href: "/hotels" }, { label: hotel.name }]}
        meta={
          <>
            <Badge status={hotel.isActive === false ? "inactive" : "active"} />
            {hotel.starRating ? (
              <span className="text-sm text-warning-600">{"★".repeat(hotel.starRating)}</span>
            ) : null}
            <span className="font-mono text-xs text-ink-500">/{hotel.slug}</span>
          </>
        }
        actions={
          <>
            <a
              href={`${PUBLIC_SITE_URL}/hotel`}
              target="_blank"
              rel="noreferrer"
              className="btn-secondary"
            >
              <ExternalLink size={14} />
              View public page
            </a>
            <Button variant="primary" icon={<Settings2 size={15} />} onClick={openEditHotel}>
              Edit property
            </Button>
          </>
        }
      />

      {/* Property counters */}
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Room types" value={rooms.length} icon={<BedDouble size={15} />} tone="brand" />
        <StatCard
          label="Total units"
          value={rooms.reduce((sum, r) => sum + (r.totalRooms || 0), 0)}
          icon={<Building2 size={15} />}
        />
        <StatCard label="Gallery images" value={data?.gallery.length ?? 0} icon={<ImageIcon size={15} />} />
        <StatCard
          label="Reviews pending"
          value={pendingReviews}
          icon={<Star size={15} />}
          tone={pendingReviews > 0 ? "warning" : "neutral"}
        />
      </div>

      <Tabs
        className="mb-5"
        active={activeTab}
        onChange={setTab}
        tabs={[
          { key: "overview", label: "Overview", icon: <Building2 size={14} /> },
          { key: "rooms", label: "Rooms", icon: <BedDouble size={14} />, count: rooms.length },
          {
            key: "gallery",
            label: "Gallery",
            icon: <ImageIcon size={14} />,
            count: data?.gallery.length,
          },
          { key: "offers", label: "Offers", icon: <Tag size={14} />, count: data?.offers.length },
          {
            key: "faqs",
            label: "FAQs",
            icon: <MessageSquareQuote size={14} />,
            count: data?.faqs.length,
          },
          { key: "reviews", label: "Reviews", icon: <Star size={14} />, count: pendingReviews },
        ]}
      />

      {activeTab === "overview" && (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="card lg:col-span-2">
            <div className="card-header">
              <div>
                <h2 className="card-title">Property details</h2>
                <p className="card-subtitle">Shown across the public hotel pages</p>
              </div>
              <Button size="sm" icon={<Settings2 size={14} />} onClick={openEditHotel}>
                Edit
              </Button>
            </div>
            <dl className="divide-y divide-line-subtle">
              <DetailRow label="Name" value={hotel.name} />
              <DetailRow label="URL slug" value={`/${hotel.slug}`} mono />
              <DetailRow label="Address" value={hotel.address} />
              <DetailRow label="Phone" value={hotel.contactPhone} />
              <DetailRow label="Email" value={hotel.contactEmail} />
              <DetailRow
                label="Star rating"
                value={hotel.starRating ? `${hotel.starRating} star` : "Not set"}
              />
              <DetailRow label="Description" value={hotel.description} wrap />
            </dl>
          </div>

          <div className="space-y-4">
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">Quick actions</h2>
              </div>
              <div className="card-body space-y-2">
                <Button fullWidth icon={<Plus size={14} />} onClick={openRoomForm}>
                  Add a room type
                </Button>
                <Button fullWidth icon={<ImageIcon size={14} />} onClick={() => setTab("gallery")}>
                  Manage gallery
                </Button>
                <Button fullWidth icon={<Tag size={14} />} onClick={() => setTab("offers")}>
                  Manage offers
                </Button>
                <Link href="/bookings" className="btn-secondary w-full">
                  <Sliders size={14} />
                  View bookings
                </Link>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <h2 className="card-title">How availability works</h2>
              </div>
              <div className="card-body">
                <p className="text-sm text-ink-600">
                  Bookable rooms are computed on every read as{" "}
                  <span className="font-medium text-ink-800">
                    total units − blocked − overlapping bookings
                  </span>
                  . There is nothing to pre-generate: to hold rooms back for maintenance, add a
                  date override on the room.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "rooms" && (
        <DataTable
          columns={roomColumns}
          rows={rooms}
          rowKey={(r) => r._id}
          loading={loading}
          searchable={(r) => `${r.name} ${r.slug} ${r.categoryName}`}
          searchPlaceholder="Search rooms…"
          initialSort={{ key: "name", direction: "asc" }}
          onRowClick={(r) => router.push(`/hotels/${hotelId}/rooms/${r._id}`)}
          toolbarActions={
            <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={openRoomForm}>
              New room
            </Button>
          }
          emptyIcon={<BedDouble size={19} />}
          emptyTitle="No room types yet"
          emptyDescription="A room type is a category (Deluxe, Suite…) with a price and a number of physical units."
          emptyAction={
            <Button variant="primary" icon={<Plus size={15} />} onClick={openRoomForm}>
              New room
            </Button>
          }
          actions={(r) => [
            {
              label: "Manage room",
              icon: <Settings2 size={14} />,
              onClick: () => router.push(`/hotels/${hotelId}/rooms/${r._id}`),
            },
            {
              label: "Availability",
              icon: <Sliders size={14} />,
              onClick: () => router.push(`/hotels/${hotelId}/rooms/${r._id}?tab=availability`),
            },
            {
              label: "Deactivate",
              icon: <PowerOff size={14} />,
              danger: true,
              separated: true,
              onClick: () => void handleDeleteRoom(r),
            },
          ]}
        />
      )}

      {activeTab === "gallery" && (
        <GalleryManager
          basePath="/admin/hotels"
          ownerId={hotelId}
          items={data?.gallery ?? []}
          loading={loading}
          onChanged={loadAll}
          upload={uploadImage}
          categoryOptions={GALLERY_CATEGORIES}
        />
      )}

      {activeTab === "offers" && (
        <OffersManager
          basePath="/admin/hotels"
          ownerId={hotelId}
          items={data?.offers ?? []}
          loading={loading}
          onChanged={loadAll}
        />
      )}

      {activeTab === "faqs" && (
        <FaqManager
          basePath="/admin/hotels"
          ownerId={hotelId}
          items={data?.faqs ?? []}
          loading={loading}
          onChanged={loadAll}
        />
      )}

      {activeTab === "reviews" && (
        <ReviewsManager
          basePath="/admin/hotels"
          items={reviews}
          loading={loading}
          onChanged={loadAll}
          canRemoveImages
        />
      )}

      {/* ---- Edit property ---- */}
      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit property"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" form="hotel-form" loading={savingHotel}>
              Save changes
            </Button>
          </>
        }
      >
        <form id="hotel-form" onSubmit={handleUpdateHotel} className="space-y-4">
          {hotelFormError && (
            <p className="rounded-md border border-danger-100 bg-danger-50 px-3 py-2 text-sm text-danger-700">
              {hotelFormError}
            </p>
          )}

          <TextInput
            label="Hotel name"
            required
            value={hotelForm.name}
            onChange={(e) => setHotelForm({ ...hotelForm, name: e.target.value })}
          />
          <TextArea
            label="Description"
            required
            rows={4}
            value={hotelForm.description}
            onChange={(e) => setHotelForm({ ...hotelForm, description: e.target.value })}
          />
          <TextInput
            label="Address"
            required
            value={hotelForm.address}
            onChange={(e) => setHotelForm({ ...hotelForm, address: e.target.value })}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextInput
              label="Contact phone"
              required
              value={hotelForm.contactPhone}
              onChange={(e) => setHotelForm({ ...hotelForm, contactPhone: e.target.value })}
            />
            <TextInput
              label="Contact email"
              type="email"
              required
              value={hotelForm.contactEmail}
              onChange={(e) => setHotelForm({ ...hotelForm, contactEmail: e.target.value })}
            />
          </div>
          <TextInput
            label="Star rating"
            type="number"
            min={1}
            max={5}
            value={hotelForm.starRating}
            onChange={(e) => setHotelForm({ ...hotelForm, starRating: e.target.value })}
            hint="1–5. Leave blank if the property is unrated."
            wrapperClassName="sm:max-w-[12rem]"
          />

          <Accordion
            title="Search engine metadata"
            description="Optional — overrides the defaults on the public page"
          >
            <div className="space-y-4">
              <TextInput
                label="Meta title"
                value={hotelForm.metaTitle}
                onChange={(e) => setHotelForm({ ...hotelForm, metaTitle: e.target.value })}
                hint="Around 60 characters reads best in search results."
              />
              <TextArea
                label="Meta description"
                value={hotelForm.metaDescription}
                onChange={(e) => setHotelForm({ ...hotelForm, metaDescription: e.target.value })}
                hint="Around 155 characters. Left blank, the page falls back to its own copy."
              />
            </div>
          </Accordion>
        </form>
      </Modal>

      {/* ---- New room ---- */}
      <Modal
        open={roomOpen}
        onClose={() => setRoomOpen(false)}
        title="New room type"
        description="A room type is a category with a price and a number of physical units."
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setRoomOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" form="room-form" loading={savingRoom}>
              Create room
            </Button>
          </>
        }
      >
        <form id="room-form" onSubmit={handleCreateRoom} className="space-y-4">
          {roomFormError && (
            <p className="rounded-md border border-danger-100 bg-danger-50 px-3 py-2 text-sm text-danger-700">
              {roomFormError}
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Category"
              value={roomForm.categoryName}
              onChange={(e) => setRoomForm({ ...roomForm, categoryName: e.target.value })}
            >
              {ROOM_CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
            <TextInput
              label="Room name"
              required
              value={roomForm.name}
              onChange={(e) => {
                const name = e.target.value;
                setRoomForm((prev) => ({
                  ...prev,
                  name,
                  slug: roomSlugTouched ? prev.slug : slugify(name),
                }));
              }}
              placeholder="Deluxe Garden View"
            />
          </div>

          <TextInput
            label="URL slug"
            required
            value={roomForm.slug}
            onChange={(e) => {
              setRoomSlugTouched(true);
              setRoomForm({ ...roomForm, slug: e.target.value });
            }}
            hint="Auto-filled from the name. Becomes part of the room's public URL."
          />

          <TextArea
            label="Description"
            required
            rows={3}
            value={roomForm.description}
            onChange={(e) => setRoomForm({ ...roomForm, description: e.target.value })}
          />

          <div className="grid gap-4 sm:grid-cols-3">
            <TextInput
              label="Base price"
              type="number"
              min={0}
              required
              value={roomForm.basePrice}
              onChange={(e) => setRoomForm({ ...roomForm, basePrice: e.target.value })}
              hint="₹ per night"
            />
            <TextInput
              label="Max occupancy"
              type="number"
              min={1}
              required
              value={roomForm.maxOccupancy}
              onChange={(e) => setRoomForm({ ...roomForm, maxOccupancy: e.target.value })}
              hint="Guests per room"
            />
            <TextInput
              label="Total units"
              type="number"
              min={1}
              required
              value={roomForm.totalRooms}
              onChange={(e) => setRoomForm({ ...roomForm, totalRooms: e.target.value })}
              hint="Physical rooms"
            />
          </div>

          <TextInput
            label="Amenities"
            value={roomForm.amenities}
            onChange={(e) => setRoomForm({ ...roomForm, amenities: e.target.value })}
            placeholder="AC, Free WiFi, Mini Bar"
            hint="Comma-separated."
          />

          <ImageUploader
            label="Room photos"
            value={roomImages}
            onChange={setRoomImages}
            folder="rooms"
            upload={uploadImage}
            hint="The first image is used as the room's cover on the public site."
          />
        </form>
      </Modal>
    </RequireAdmin>
  );
}

function DetailRow({
  label,
  value,
  mono,
  wrap,
}: {
  label: string;
  value: string;
  mono?: boolean;
  wrap?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1 px-5 py-3 sm:flex-row sm:gap-4">
      <dt className="w-40 shrink-0 text-sm font-medium text-ink-500">{label}</dt>
      <dd
        className={
          mono
            ? "min-w-0 font-mono text-base text-ink-700"
            : wrap
              ? "min-w-0 whitespace-pre-line text-base text-ink-700"
              : "min-w-0 text-base text-ink-700"
        }
      >
        {value || "—"}
      </dd>
    </div>
  );
}
