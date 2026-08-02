"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Armchair,
  Building2,
  CalendarCheck,
  ChefHat,
  ExternalLink,
  Image as ImageIcon,
  LayoutList,
  MessageSquareQuote,
  Settings2,
  Star,
  Tag,
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
import { TextArea, TextInput } from "@/components/ui/Field";
import { CardSkeleton, ErrorState } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import GalleryManager, { GalleryItem } from "@/components/content/GalleryManager";
import OffersManager, { OfferItem } from "@/components/content/OffersManager";
import FaqManager, { FaqItem } from "@/components/content/FaqManager";
import ReviewsManager, { ReviewItem } from "@/components/content/ReviewsManager";
import MenuCategoriesPanel, { MenuCategory } from "@/components/restaurant/MenuCategoriesPanel";
import MenuItemsPanel, { MenuItem } from "@/components/restaurant/MenuItemsPanel";
import DiningAreasPanel, { DiningArea } from "@/components/restaurant/DiningAreasPanel";
import { adminApi, formatApiError, publicGet, uploadRestaurantImage } from "@/lib/api";
import { useBusiness } from "@/lib/businessContext";
import { currency, timeSlotLabel } from "@/lib/format";

const PUBLIC_SITE_URL = process.env.NEXT_PUBLIC_FRONTEND_URL || "http://localhost:3000";
const GALLERY_CATEGORIES = ["Interior", "Food", "Ambience", "Bar", "Events"];

interface RestaurantData {
  _id: string;
  name: string;
  slug: string;
  description: string;
  address: string;
  contactPhone: string;
  contactEmail: string;
  whatsappNumber?: string;
  cuisineTypes?: string[];
  reservationSlots?: string[];
  reservationDurationMinutes?: number;
  maxPartySize?: number;
  averageCostForTwo?: number;
  metaTitle?: string;
  metaDescription?: string;
  isActive?: boolean;
}

interface RestaurantAggregate {
  restaurant: RestaurantData;
  menuCategories: MenuCategory[];
  menuItems: MenuItem[];
  diningAreas: DiningArea[];
  gallery: GalleryItem[];
  faqs: FaqItem[];
  offers: OfferItem[];
}

const TAB_KEYS = [
  "overview",
  "categories",
  "menu",
  "areas",
  "gallery",
  "offers",
  "faqs",
  "reviews",
] as const;
type TabKey = (typeof TAB_KEYS)[number];

/**
 * Restaurant property workspace.
 *
 * The aggregate comes from the public `GET /restaurants/:slug` route — the only
 * one that returns menu, dining areas, gallery, offers and FAQs together — with
 * reviews pulled from `GET /admin/restaurants/:id/reviews` alongside it. Every
 * mutation uses the existing admin routes; nothing new was added server-side.
 */
export default function ManageRestaurantPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const restaurantId = params.restaurantId as string;

  const { toastSuccess } = useToast();
  const { reload: reloadBusinesses } = useBusiness();

  const [data, setData] = useState<RestaurantAggregate | null>(null);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const tabParam = searchParams.get("tab");
  const activeTab: TabKey = TAB_KEYS.includes(tabParam as TabKey)
    ? (tabParam as TabKey)
    : "overview";

  function setTab(key: string) {
    router.replace(`/restaurants/${restaurantId}?tab=${key}`, { scroll: false });
  }

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);

    const listRes = await publicGet<{ _id: string; slug: string }[]>("/restaurants");
    if (!listRes.success) {
      setError(listRes.message || "Could not reach the API.");
      setLoading(false);
      return;
    }

    const found = (listRes.data || []).find((r) => r._id === restaurantId);
    if (!found) {
      setError("This restaurant could not be found, or it has been deactivated.");
      setLoading(false);
      return;
    }

    const [detailsRes, reviewsRes] = await Promise.all([
      publicGet<RestaurantAggregate>(`/restaurants/${found.slug}`),
      adminApi.get<ReviewItem[]>(`/admin/restaurants/${restaurantId}/reviews`),
    ]);

    if (detailsRes.success && detailsRes.data) setData(detailsRes.data);
    else setError(detailsRes.message || "Could not load this restaurant.");

    if (reviewsRes.success) setReviews(reviewsRes.data || []);

    setLoading(false);
  }, [restaurantId]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const restaurant = data?.restaurant ?? null;
  const categories = useMemo(() => data?.menuCategories ?? [], [data]);
  const menuItems = useMemo(() => data?.menuItems ?? [], [data]);
  const diningAreas = useMemo(() => data?.diningAreas ?? [], [data]);
  const pendingReviews = reviews.filter((r) => !r.isApproved).length;

  const itemCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    menuItems.forEach((i) => {
      const key = String(i.categoryId);
      counts[key] = (counts[key] ?? 0) + 1;
    });
    return counts;
  }, [menuItems]);

  const totalTables = useMemo(
    () => diningAreas.reduce((sum, a) => sum + (a.totalTables || 0), 0),
    [diningAreas]
  );

  // ---- property form ------------------------------------------------------
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    address: "",
    contactPhone: "",
    contactEmail: "",
    whatsappNumber: "",
    cuisineTypes: "",
    reservationSlots: "",
    reservationDurationMinutes: "",
    maxPartySize: "",
    averageCostForTwo: "",
    metaTitle: "",
    metaDescription: "",
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  function openEdit() {
    if (!restaurant) return;
    setForm({
      name: restaurant.name,
      description: restaurant.description,
      address: restaurant.address,
      contactPhone: restaurant.contactPhone,
      contactEmail: restaurant.contactEmail,
      whatsappNumber: restaurant.whatsappNumber || "",
      cuisineTypes: (restaurant.cuisineTypes || []).join(", "),
      reservationSlots: (restaurant.reservationSlots || []).join(", "),
      reservationDurationMinutes: restaurant.reservationDurationMinutes
        ? String(restaurant.reservationDurationMinutes)
        : "",
      maxPartySize: restaurant.maxPartySize ? String(restaurant.maxPartySize) : "",
      averageCostForTwo: restaurant.averageCostForTwo
        ? String(restaurant.averageCostForTwo)
        : "",
      metaTitle: restaurant.metaTitle || "",
      metaDescription: restaurant.metaDescription || "",
    });
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

    const slots = toList(form.reservationSlots);
    const badSlot = slots.find((s) => !/^([01]\d|2[0-3]):[0-5]\d$/.test(s));
    if (badSlot) {
      setFormError(`“${badSlot}” isn't a valid time. Use 24-hour HH:MM, e.g. 19:30.`);
      return;
    }

    setSaving(true);
    const res = await adminApi.put(`/admin/restaurants/${restaurantId}`, {
      name: form.name,
      description: form.description,
      address: form.address,
      contactPhone: form.contactPhone,
      contactEmail: form.contactEmail,
      whatsappNumber: form.whatsappNumber || undefined,
      cuisineTypes: toList(form.cuisineTypes),
      reservationSlots: slots,
      reservationDurationMinutes: form.reservationDurationMinutes
        ? Number(form.reservationDurationMinutes)
        : undefined,
      maxPartySize: form.maxPartySize ? Number(form.maxPartySize) : undefined,
      averageCostForTwo: form.averageCostForTwo ? Number(form.averageCostForTwo) : undefined,
      metaTitle: form.metaTitle || undefined,
      metaDescription: form.metaDescription || undefined,
    });
    setSaving(false);

    if (!res.success) {
      setFormError(formatApiError(res));
      return;
    }

    toastSuccess("Restaurant details saved.");
    setEditOpen(false);
    void loadAll();
    reloadBusinesses();
  }

  // ---- render -------------------------------------------------------------
  if (loading && !data) {
    return (
      <RequireAdmin>
        <PageHeader
          title="Loading restaurant…"
          loading
          breadcrumbs={[{ label: "Restaurant", href: "/restaurants" }]}
        />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </RequireAdmin>
    );
  }

  if (error || !restaurant) {
    return (
      <RequireAdmin>
        <PageHeader title="Restaurant" breadcrumbs={[{ label: "Restaurant", href: "/restaurants" }]} />
        <div className="card">
          <ErrorState message={error || "Restaurant not found."} onRetry={loadAll} />
          <div className="card-footer">
            <Link href="/restaurants" className="btn-secondary">
              Back to restaurants
            </Link>
          </div>
        </div>
      </RequireAdmin>
    );
  }

  return (
    <RequireAdmin>
      <PageHeader
        title={restaurant.name}
        description={restaurant.address}
        breadcrumbs={[
          { label: "Restaurant", href: "/restaurants" },
          { label: restaurant.name },
        ]}
        meta={
          <>
            <Badge status={restaurant.isActive === false ? "inactive" : "active"} />
            {(restaurant.cuisineTypes || []).slice(0, 3).map((c) => (
              <Badge key={c} tone="neutral">
                {c}
              </Badge>
            ))}
            <span className="font-mono text-xs text-ink-500">/{restaurant.slug}</span>
          </>
        }
        actions={
          <>
            <a
              href={`${PUBLIC_SITE_URL}/restaurant`}
              target="_blank"
              rel="noreferrer"
              className="btn-secondary"
            >
              <ExternalLink size={14} />
              View public page
            </a>
            <Button variant="primary" icon={<Settings2 size={15} />} onClick={openEdit}>
              Edit restaurant
            </Button>
          </>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Dishes on the menu"
          value={menuItems.length}
          hint={`${categories.length} categories`}
          icon={<UtensilsCrossed size={15} />}
          tone="brand"
        />
        <StatCard
          label="Dining areas"
          value={diningAreas.length}
          hint={`${totalTables} tables in total`}
          icon={<Armchair size={15} />}
        />
        <StatCard
          label="Reservation slots"
          value={restaurant.reservationSlots?.length ?? 0}
          hint={
            restaurant.reservationDurationMinutes
              ? `${restaurant.reservationDurationMinutes} min sittings`
              : "90 min sittings"
          }
          icon={<CalendarCheck size={15} />}
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
          {
            key: "categories",
            label: "Categories",
            icon: <LayoutList size={14} />,
            count: categories.length,
          },
          {
            key: "menu",
            label: "Menu",
            icon: <UtensilsCrossed size={14} />,
            count: menuItems.length,
          },
          {
            key: "areas",
            label: "Dining areas",
            icon: <Armchair size={14} />,
            count: diningAreas.length,
          },
          { key: "gallery", label: "Gallery", icon: <ImageIcon size={14} />, count: data?.gallery.length },
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
                <h2 className="card-title">Restaurant details</h2>
                <p className="card-subtitle">Shown across the public restaurant pages</p>
              </div>
              <Button size="sm" icon={<Settings2 size={14} />} onClick={openEdit}>
                Edit
              </Button>
            </div>
            <dl className="divide-y divide-line-subtle">
              <DetailRow label="Name" value={restaurant.name} />
              <DetailRow label="URL slug" value={`/${restaurant.slug}`} mono />
              <DetailRow label="Address" value={restaurant.address} />
              <DetailRow label="Phone" value={restaurant.contactPhone} />
              <DetailRow label="Email" value={restaurant.contactEmail} />
              <DetailRow label="WhatsApp" value={restaurant.whatsappNumber || "Not set"} />
              <DetailRow
                label="Cuisine"
                value={(restaurant.cuisineTypes || []).join(", ") || "Not set"}
              />
              <DetailRow
                label="Cost for two"
                value={
                  restaurant.averageCostForTwo ? currency(restaurant.averageCostForTwo) : "Not set"
                }
              />
              <DetailRow label="Description" value={restaurant.description} wrap />
            </dl>
          </div>

          <div className="space-y-4">
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">Reservation setup</h2>
              </div>
              <div className="card-body space-y-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                    Bookable slots
                  </p>
                  {restaurant.reservationSlots && restaurant.reservationSlots.length > 0 ? (
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {restaurant.reservationSlots.map((slot) => (
                        <span key={slot} className="badge-neutral">
                          {timeSlotLabel(slot)}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-1 text-base text-warning-700">
                      No slots configured — guests cannot book a table yet.
                    </p>
                  )}
                </div>
                <div className="divider" />
                <div className="grid grid-cols-2 gap-3 text-base">
                  <div>
                    <p className="text-xs text-ink-500">Sitting length</p>
                    <p className="font-medium text-ink-800">
                      {restaurant.reservationDurationMinutes ?? 90} min
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-ink-500">Max party</p>
                    <p className="font-medium text-ink-800">{restaurant.maxPartySize ?? 12}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <h2 className="card-title">Quick actions</h2>
              </div>
              <div className="card-body space-y-2">
                <Button fullWidth icon={<LayoutList size={14} />} onClick={() => setTab("categories")}>
                  Manage categories
                </Button>
                <Button fullWidth icon={<ChefHat size={14} />} onClick={() => setTab("menu")}>
                  Manage dishes
                </Button>
                <Button fullWidth icon={<Armchair size={14} />} onClick={() => setTab("areas")}>
                  Manage dining areas
                </Button>
                <Link href="/reservations" className="btn-secondary w-full">
                  <CalendarCheck size={14} />
                  View reservations
                </Link>
              </div>
            </div>

            <div className="card">
              <div className="card-body">
                <p className="text-sm text-ink-600">
                  Table reservations take no payment, and there is no cart or checkout here —
                  online food ordering is a later phase.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "categories" && (
        <MenuCategoriesPanel
          restaurantId={restaurantId}
          categories={categories}
          itemCounts={itemCounts}
          loading={loading}
          onChanged={loadAll}
        />
      )}

      {activeTab === "menu" && (
        <MenuItemsPanel
          restaurantId={restaurantId}
          items={menuItems}
          categories={categories}
          loading={loading}
          onChanged={loadAll}
        />
      )}

      {activeTab === "areas" && (
        <DiningAreasPanel
          restaurantId={restaurantId}
          areas={diningAreas}
          loading={loading}
          onChanged={loadAll}
        />
      )}

      {activeTab === "gallery" && (
        <GalleryManager
          basePath="/admin/restaurants"
          ownerId={restaurantId}
          items={data?.gallery ?? []}
          loading={loading}
          onChanged={loadAll}
          upload={uploadRestaurantImage}
          categoryOptions={GALLERY_CATEGORIES}
        />
      )}

      {activeTab === "offers" && (
        <OffersManager
          basePath="/admin/restaurants"
          ownerId={restaurantId}
          items={data?.offers ?? []}
          loading={loading}
          onChanged={loadAll}
        />
      )}

      {activeTab === "faqs" && (
        <FaqManager
          basePath="/admin/restaurants"
          ownerId={restaurantId}
          items={data?.faqs ?? []}
          loading={loading}
          onChanged={loadAll}
        />
      )}

      {activeTab === "reviews" && (
        <ReviewsManager
          basePath="/admin/restaurants"
          items={reviews}
          loading={loading}
          onChanged={loadAll}
        />
      )}

      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit restaurant"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" form="restaurant-form" loading={saving}>
              Save changes
            </Button>
          </>
        }
      >
        <form id="restaurant-form" onSubmit={handleSave} className="space-y-4">
          {formError && (
            <p className="rounded-md border border-danger-100 bg-danger-50 px-3 py-2 text-sm text-danger-700">
              {formError}
            </p>
          )}

          <TextInput
            label="Restaurant name"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
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
              hint="Optional."
            />
          </div>

          <TextInput
            label="Cuisine types"
            value={form.cuisineTypes}
            onChange={(e) => setForm({ ...form, cuisineTypes: e.target.value })}
            placeholder="North Indian, Mughlai, Continental"
            hint="Comma-separated."
          />

          <Accordion
            title="Reservation rules"
            description="Slots, sitting length and party limits"
            defaultOpen
          >
            <div className="space-y-4">
              <TextInput
                label="Bookable time slots"
                value={form.reservationSlots}
                onChange={(e) => setForm({ ...form, reservationSlots: e.target.value })}
                placeholder="12:30, 13:30, 19:30, 20:30"
                hint="Comma-separated, 24-hour HH:MM. Guests can only book these times — clearing them stops table bookings."
              />
              <div className="grid gap-4 sm:grid-cols-3">
                <TextInput
                  label="Sitting length"
                  type="number"
                  min={15}
                  max={480}
                  value={form.reservationDurationMinutes}
                  onChange={(e) =>
                    setForm({ ...form, reservationDurationMinutes: e.target.value })
                  }
                  hint="Minutes. Defaults to 90."
                />
                <TextInput
                  label="Max party size"
                  type="number"
                  min={1}
                  value={form.maxPartySize}
                  onChange={(e) => setForm({ ...form, maxPartySize: e.target.value })}
                  hint="Defaults to 12."
                />
                <TextInput
                  label="Cost for two"
                  type="number"
                  min={0}
                  value={form.averageCostForTwo}
                  onChange={(e) => setForm({ ...form, averageCostForTwo: e.target.value })}
                  hint="₹, shown on listings."
                />
              </div>
            </div>
          </Accordion>

          <Accordion
            title="Search engine metadata"
            description="Optional — overrides the defaults on the public page"
          >
            <div className="space-y-4">
              <TextInput
                label="Meta title"
                value={form.metaTitle}
                onChange={(e) => setForm({ ...form, metaTitle: e.target.value })}
                hint="Around 60 characters reads best in search results."
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
