"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Armchair,
  Building2,
  CalendarCheck,
  CalendarDays,
  ExternalLink,
  Flower2,
  Image as ImageIcon,
  Layers,
  MessageSquareQuote,
  Palette,
  PartyPopper,
  Settings2,
  Star,
  Tag,
  UsersRound,
  UtensilsCrossed,
} from "lucide-react";
import RequireAdmin from "@/components/RequireAdmin";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import Tabs from "@/components/ui/Tabs";
import Accordion from "@/components/ui/Accordion";
import StatCard from "@/components/ui/StatCard";
import ImageUploader from "@/components/ui/ImageUploader";
import { TextArea, TextInput } from "@/components/ui/Field";
import { CardSkeleton, ErrorState } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import GalleryManager, { GalleryItem } from "@/components/content/GalleryManager";
import OffersManager, { OfferItem } from "@/components/content/OffersManager";
import FaqManager, { FaqItem } from "@/components/content/FaqManager";
import ReviewsManager, { ReviewItem } from "@/components/content/ReviewsManager";
import PackagesPanel, { HallPackage } from "@/components/hall/PackagesPanel";
import ShowcasePanel, { ShowcaseEntry } from "@/components/hall/ShowcasePanel";
import CalendarPanel from "@/components/hall/CalendarPanel";
import { adminApi, formatApiError, publicGet, uploadHallImage } from "@/lib/api";
import { useBusiness } from "@/lib/businessContext";
import { useSummary } from "@/lib/summary";

const PUBLIC_SITE_URL = process.env.NEXT_PUBLIC_FRONTEND_URL || "http://localhost:3000";
const GALLERY_CATEGORIES = [
  "Wedding",
  "Reception",
  "Engagement",
  "Haldi",
  "Mehendi",
  "Sangeet",
  "Birthday",
  "Corporate",
  "Decoration",
  "Venue",
];

interface HallData {
  _id: string;
  name: string;
  slug: string;
  tagline?: string;
  description: string;
  seatedCapacity: number;
  floatingCapacity: number;
  spaces: { label: string; seated: number; floating: number; description?: string }[];
  eventTypes: string[];
  features: { name: string; icon?: string }[];
  parkingCapacity?: number;
  guestRooms?: number;
  address: string;
  contactPhone: string;
  contactEmail: string;
  whatsappNumber?: string;
  heroImages: string[];
  minimumNoticeDays: number;
  metaTitle?: string;
  metaDescription?: string;
  isActive?: boolean;
}

interface ShowcaseSection {
  showcaseType: string;
  categories: string[];
  entries: ShowcaseEntry[];
}

interface HallAggregate {
  hall: HallData;
  packages: HallPackage[];
  decorationThemes: ShowcaseSection;
  catering: ShowcaseSection;
  dining: ShowcaseSection;
  floral: ShowcaseSection;
  gallery: GalleryItem[];
  faqs: FaqItem[];
  offers: OfferItem[];
}

const TAB_KEYS = [
  "overview",
  "packages",
  "decoration",
  "catering",
  "dining",
  "floral",
  "gallery",
  "calendar",
  "offers",
  "faqs",
  "reviews",
] as const;
type TabKey = (typeof TAB_KEYS)[number];

/**
 * Marriage Hall venue workspace.
 *
 * Same shape as the Hotel and Restaurant workspaces: the public aggregate
 * (`GET /halls/:slug`) supplies everything in one call, reviews come from the
 * admin route beside it, and every mutation goes through the existing
 * `/admin/halls/*` endpoints.
 *
 * Gallery, Offers, FAQs and Reviews reuse the same four managers the other two
 * verticals use — the content module is polymorphic server-side, so the admin UI
 * is too.
 */
export default function ManageHallPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const hallId = params.hallId as string;

  const { toastSuccess } = useToast();
  const { reload: reloadBusinesses } = useBusiness();
  const { hallEnquiries } = useSummary();

  const [data, setData] = useState<HallAggregate | null>(null);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const tabParam = searchParams.get("tab");
  const activeTab: TabKey = TAB_KEYS.includes(tabParam as TabKey)
    ? (tabParam as TabKey)
    : "overview";

  function setTab(key: string) {
    router.replace(`/halls/${hallId}?tab=${key}`, { scroll: false });
  }

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);

    const listRes = await publicGet<{ _id: string; slug: string }[]>("/halls");
    if (!listRes.success) {
      setError(listRes.message || "Could not reach the API.");
      setLoading(false);
      return;
    }

    const found = (listRes.data || []).find((h) => h._id === hallId);
    if (!found) {
      setError("This venue could not be found, or it has been deactivated.");
      setLoading(false);
      return;
    }

    const [detailsRes, reviewsRes] = await Promise.all([
      publicGet<HallAggregate>(`/halls/${found.slug}`),
      adminApi.get<ReviewItem[]>(`/admin/halls/${hallId}/reviews`),
    ]);

    if (detailsRes.success && detailsRes.data) setData(detailsRes.data);
    else setError(detailsRes.message || "Could not load this venue.");

    if (reviewsRes.success) setReviews(reviewsRes.data || []);

    setLoading(false);
  }, [hallId]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const hall = data?.hall ?? null;
  const pendingReviews = reviews.filter((r) => !r.isApproved).length;

  const openEnquiries = useMemo(
    () =>
      hallEnquiries.filter(
        (e) => ["pending", "reviewing", "approved"].includes(e.status)
      ).length,
    [hallEnquiries]
  );

  // ---- venue form ---------------------------------------------------------
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    tagline: "",
    description: "",
    address: "",
    contactPhone: "",
    contactEmail: "",
    whatsappNumber: "",
    seatedCapacity: "",
    floatingCapacity: "",
    parkingCapacity: "",
    guestRooms: "",
    eventTypes: "",
    features: "",
    minimumNoticeDays: "",
    metaTitle: "",
    metaDescription: "",
  });
  const [heroImages, setHeroImages] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  function openEdit() {
    if (!hall) return;
    setForm({
      name: hall.name,
      tagline: hall.tagline || "",
      description: hall.description,
      address: hall.address,
      contactPhone: hall.contactPhone,
      contactEmail: hall.contactEmail,
      whatsappNumber: hall.whatsappNumber || "",
      seatedCapacity: String(hall.seatedCapacity),
      floatingCapacity: String(hall.floatingCapacity),
      parkingCapacity: hall.parkingCapacity != null ? String(hall.parkingCapacity) : "",
      guestRooms: hall.guestRooms != null ? String(hall.guestRooms) : "",
      eventTypes: (hall.eventTypes || []).join(", "),
      features: (hall.features || []).map((f) => f.name).join(", "),
      minimumNoticeDays: String(hall.minimumNoticeDays ?? 7),
      metaTitle: hall.metaTitle || "",
      metaDescription: hall.metaDescription || "",
    });
    setHeroImages(hall.heroImages || []);
    setFormError(null);
    setEditOpen(true);
  }

  function toList(value: string): string[] {
    return value
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSaving(true);

    const res = await adminApi.put(`/admin/halls/${hallId}`, {
      name: form.name,
      tagline: form.tagline || undefined,
      description: form.description,
      address: form.address,
      contactPhone: form.contactPhone,
      contactEmail: form.contactEmail,
      whatsappNumber: form.whatsappNumber || undefined,
      seatedCapacity: Number(form.seatedCapacity),
      floatingCapacity: Number(form.floatingCapacity),
      parkingCapacity: form.parkingCapacity ? Number(form.parkingCapacity) : undefined,
      guestRooms: form.guestRooms ? Number(form.guestRooms) : undefined,
      eventTypes: toList(form.eventTypes),
      features: toList(form.features).map((name) => ({ name })),
      heroImages,
      minimumNoticeDays: form.minimumNoticeDays ? Number(form.minimumNoticeDays) : undefined,
      metaTitle: form.metaTitle || undefined,
      metaDescription: form.metaDescription || undefined,
    });
    setSaving(false);

    if (!res.success) {
      setFormError(formatApiError(res));
      return;
    }

    toastSuccess("Venue details saved.");
    setEditOpen(false);
    void loadAll();
    reloadBusinesses();
  }

  // ---- render -------------------------------------------------------------
  if (loading && !data) {
    return (
      <RequireAdmin>
        <PageHeader
          title="Loading venue…"
          loading
          breadcrumbs={[{ label: "Marriage Hall", href: "/halls" }]}
        />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </RequireAdmin>
    );
  }

  if (error || !hall) {
    return (
      <RequireAdmin>
        <PageHeader title="Marriage Hall" breadcrumbs={[{ label: "Marriage Hall", href: "/halls" }]} />
        <div className="card">
          <ErrorState message={error || "Venue not found."} onRetry={loadAll} />
          <div className="card-footer">
            <Link href="/halls" className="btn-secondary">
              Back to venues
            </Link>
          </div>
        </div>
      </RequireAdmin>
    );
  }

  return (
    <RequireAdmin>
      <PageHeader
        title={hall.name}
        description={hall.tagline || hall.address}
        breadcrumbs={[{ label: "Marriage Hall", href: "/halls" }, { label: hall.name }]}
        meta={
          <>
            <Badge status={hall.isActive === false ? "inactive" : "active"} />
            <Badge tone="neutral">
              {hall.floatingCapacity.toLocaleString("en-IN")} guests
            </Badge>
            <span className="font-mono text-xs text-ink-500">/{hall.slug}</span>
          </>
        }
        actions={
          <>
            <a
              href={`${PUBLIC_SITE_URL}/marriage-hall`}
              target="_blank"
              rel="noreferrer"
              className="btn-secondary"
            >
              <ExternalLink size={14} />
              View public page
            </a>
            <Button variant="primary" icon={<Settings2 size={15} />} onClick={openEdit}>
              Edit venue
            </Button>
          </>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Open enquiries"
          value={openEnquiries}
          hint="Pending, reviewing or approved"
          icon={<CalendarCheck size={15} />}
          tone={openEnquiries > 0 ? "warning" : "neutral"}
          href="/enquiries"
        />
        <StatCard
          label="Packages"
          value={data?.packages.length ?? 0}
          icon={<Layers size={15} />}
          tone="brand"
        />
        <StatCard
          label="Gallery images"
          value={data?.gallery.length ?? 0}
          icon={<ImageIcon size={15} />}
        />
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
          { key: "packages", label: "Packages", icon: <Layers size={14} />, count: data?.packages.length },
          {
            key: "decoration",
            label: "Decoration",
            icon: <Palette size={14} />,
            count: data?.decorationThemes.entries.length,
          },
          {
            key: "catering",
            label: "Catering",
            icon: <UtensilsCrossed size={14} />,
            count: data?.catering.entries.length,
          },
          {
            key: "dining",
            label: "Dining",
            icon: <Armchair size={14} />,
            count: data?.dining.entries.length,
          },
          {
            key: "floral",
            label: "Floral",
            icon: <Flower2 size={14} />,
            count: data?.floral.entries.length,
          },
          { key: "gallery", label: "Gallery", icon: <ImageIcon size={14} />, count: data?.gallery.length },
          { key: "calendar", label: "Calendar", icon: <CalendarDays size={14} /> },
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
                <h2 className="card-title">Venue details</h2>
                <p className="card-subtitle">Shown across the public Marriage Hall pages</p>
              </div>
              <Button size="sm" icon={<Settings2 size={14} />} onClick={openEdit}>
                Edit
              </Button>
            </div>
            <dl className="divide-y divide-line-subtle">
              <DetailRow label="Name" value={hall.name} />
              <DetailRow label="Tagline" value={hall.tagline || "Not set"} />
              <DetailRow label="URL slug" value={`/${hall.slug}`} mono />
              <DetailRow label="Address" value={hall.address} />
              <DetailRow label="Phone" value={hall.contactPhone} />
              <DetailRow label="Email" value={hall.contactEmail} />
              <DetailRow label="WhatsApp" value={hall.whatsappNumber || "Not set"} />
              <DetailRow
                label="Capacity"
                value={`${hall.seatedCapacity.toLocaleString("en-IN")} seated · ${hall.floatingCapacity.toLocaleString("en-IN")} floating`}
              />
              <DetailRow
                label="Event types"
                value={(hall.eventTypes || []).join(", ") || "Not set"}
              />
              <DetailRow
                label="Minimum notice"
                value={`${hall.minimumNoticeDays} day${hall.minimumNoticeDays === 1 ? "" : "s"}`}
              />
              <DetailRow label="Description" value={hall.description} wrap />
            </dl>
          </div>

          <div className="space-y-4">
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">Spaces</h2>
              </div>
              <div className="card-body">
                {hall.spaces.length === 0 ? (
                  <p className="text-base text-ink-500">
                    No individual spaces recorded. The public page falls back to the venue-wide
                    capacity.
                  </p>
                ) : (
                  <ul className="space-y-3">
                    {hall.spaces.map((space) => (
                      <li key={space.label} className="rounded-lg border border-line p-3.5">
                        <p className="text-base font-medium text-ink-800">{space.label}</p>
                        <p className="mt-0.5 text-sm text-ink-500">
                          {space.seated} seated · {space.floating} floating
                        </p>
                        {space.description && (
                          <p className="mt-1.5 text-sm text-ink-600">{space.description}</p>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
                <p className="mt-3 text-xs text-ink-500">
                  Spaces are edited through the API today; the venue form above covers everything
                  else.
                </p>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <h2 className="card-title">How hall bookings work</h2>
              </div>
              <div className="card-body">
                <p className="text-sm text-ink-600">
                  A family submits an <strong>enquiry</strong> — no date is held and no payment is
                  taken. You review it, speak to them, and set it to{" "}
                  <strong>confirmed</strong>, which is the moment the date is blocked on the public
                  calendar. Setting it back releases the date again.
                </p>
                <Link href="/enquiries" className="btn-secondary mt-4 w-full">
                  <UsersRound size={14} />
                  Open the enquiry book
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "packages" && (
        <PackagesPanel
          hallId={hallId}
          packages={data?.packages ?? []}
          loading={loading}
          onChanged={loadAll}
        />
      )}

      {activeTab === "decoration" && (
        <ShowcasePanel
          hallId={hallId}
          showcaseType="decoration"
          entries={data?.decorationThemes.entries ?? []}
          loading={loading}
          onChanged={loadAll}
        />
      )}

      {activeTab === "catering" && (
        <ShowcasePanel
          hallId={hallId}
          showcaseType="catering"
          entries={data?.catering.entries ?? []}
          loading={loading}
          onChanged={loadAll}
        />
      )}

      {activeTab === "dining" && (
        <ShowcasePanel
          hallId={hallId}
          showcaseType="dining"
          entries={data?.dining.entries ?? []}
          loading={loading}
          onChanged={loadAll}
        />
      )}

      {activeTab === "floral" && (
        <ShowcasePanel
          hallId={hallId}
          showcaseType="floral"
          entries={data?.floral.entries ?? []}
          loading={loading}
          onChanged={loadAll}
        />
      )}

      {activeTab === "gallery" && (
        <GalleryManager
          basePath="/admin/halls"
          ownerId={hallId}
          items={data?.gallery ?? []}
          loading={loading}
          onChanged={loadAll}
          upload={uploadHallImage}
          categoryOptions={GALLERY_CATEGORIES}
        />
      )}

      {activeTab === "calendar" && <CalendarPanel hallId={hallId} />}

      {activeTab === "offers" && (
        <OffersManager
          basePath="/admin/halls"
          ownerId={hallId}
          items={data?.offers ?? []}
          loading={loading}
          onChanged={loadAll}
        />
      )}

      {activeTab === "faqs" && (
        <FaqManager
          basePath="/admin/halls"
          ownerId={hallId}
          items={data?.faqs ?? []}
          loading={loading}
          onChanged={loadAll}
        />
      )}

      {activeTab === "reviews" && (
        <ReviewsManager
          basePath="/admin/halls"
          items={reviews}
          loading={loading}
          onChanged={loadAll}
          canRemoveImages
        />
      )}

      {/* ---- Edit venue ---- */}
      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit venue"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" form="hall-form" loading={saving}>
              Save changes
            </Button>
          </>
        }
      >
        <form id="hall-form" onSubmit={handleSave} className="space-y-4">
          {formError && (
            <p className="rounded-md border border-danger-100 bg-danger-50 px-3 py-2 text-sm text-danger-700">
              {formError}
            </p>
          )}

          <TextInput
            label="Venue name"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <TextInput
            label="Tagline"
            value={form.tagline}
            onChange={(e) => setForm({ ...form, tagline: e.target.value })}
            placeholder="Where your forever begins"
          />
          <TextArea
            label="Description"
            required
            rows={4}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <TextInput
            label="Address"
            required
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />

          <div className="grid gap-4 sm:grid-cols-3">
            <TextInput
              label="Contact phone"
              required
              value={form.contactPhone}
              onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
            />
            <TextInput
              label="Contact email"
              type="email"
              required
              value={form.contactEmail}
              onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
            />
            <TextInput
              label="WhatsApp"
              value={form.whatsappNumber}
              onChange={(e) => setForm({ ...form, whatsappNumber: e.target.value })}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-4">
            <TextInput
              label="Seated"
              type="number"
              min={0}
              required
              value={form.seatedCapacity}
              onChange={(e) => setForm({ ...form, seatedCapacity: e.target.value })}
            />
            <TextInput
              label="Floating"
              type="number"
              min={0}
              required
              value={form.floatingCapacity}
              onChange={(e) => setForm({ ...form, floatingCapacity: e.target.value })}
              hint="Enquiry cap"
            />
            <TextInput
              label="Parking"
              type="number"
              min={0}
              value={form.parkingCapacity}
              onChange={(e) => setForm({ ...form, parkingCapacity: e.target.value })}
              hint="Cars"
            />
            <TextInput
              label="Guest rooms"
              type="number"
              min={0}
              value={form.guestRooms}
              onChange={(e) => setForm({ ...form, guestRooms: e.target.value })}
            />
          </div>

          <TextInput
            label="Event types"
            value={form.eventTypes}
            onChange={(e) => setForm({ ...form, eventTypes: e.target.value })}
            placeholder="Wedding, Reception, Engagement, Haldi, Mehendi, Sangeet"
            hint="Comma-separated. These are the choices on the public enquiry form."
          />

          <TextInput
            label="Features"
            value={form.features}
            onChange={(e) => setForm({ ...form, features: e.target.value })}
            placeholder="Pillarless Hall, Valet Parking, Bridal Suite, Power Backup"
            hint="Comma-separated."
          />

          <TextInput
            label="Minimum notice"
            type="number"
            min={0}
            max={365}
            value={form.minimumNoticeDays}
            onChange={(e) => setForm({ ...form, minimumNoticeDays: e.target.value })}
            hint="Days of lead time. Dates sooner than this are not selectable on the public calendar."
            wrapperClassName="sm:max-w-[14rem]"
          />

          <ImageUploader
            label="Hero images"
            value={heroImages}
            onChange={setHeroImages}
            folder="hero"
            upload={uploadHallImage}
            max={8}
            hint="The full-screen slider on the landing page. Landscape shots of the dressed hall work best; the first is shown on load."
          />

          <Accordion
            title="Search engine metadata"
            description="Optional — overrides the defaults on the public page"
          >
            <div className="space-y-4">
              <TextInput
                label="Meta title"
                value={form.metaTitle}
                onChange={(e) => setForm({ ...form, metaTitle: e.target.value })}
                hint="Around 60 characters."
              />
              <TextArea
                label="Meta description"
                value={form.metaDescription}
                onChange={(e) => setForm({ ...form, metaDescription: e.target.value })}
                hint="Around 155 characters."
              />
            </div>
          </Accordion>
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
