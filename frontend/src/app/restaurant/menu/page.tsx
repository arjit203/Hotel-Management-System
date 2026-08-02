import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowRight, ShoppingBag, UtensilsCrossed } from "lucide-react";
import { getTheRestaurant } from "@/lib/restaurant";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import Reveal from "@/components/motion/Reveal";
import PropertyUnavailable from "@/components/PropertyUnavailable";
import MenuBrowser from "@/modules/restaurant/components/MenuBrowser";

export const metadata: Metadata = {
  title: "Menu",
  description:
    "Browse the full menu at 7 Vachan — starters, mains, breads and desserts, with vegetarian and chef's special selections.",
  alternates: { canonical: "/restaurant/menu" },
};

export default async function RestaurantMenuPage() {
  const data = await getTheRestaurant();
  // Not `notFound()`. The loader returns null both when the property does
  // not exist and when the API is simply unreachable, and a 404 during a
  // backend restart tells guests — and search engines — the page is gone.
  if (!data) {
    return (
      <PropertyUnavailable
        retryHref="/restaurant/menu"
        icon={UtensilsCrossed}
      />
    );
  }

  const { menuCategories, menuItems } = data;

  return (
    <main>
      <div className="container-luxe pb-24 pt-16 sm:pt-20">
        <PageHeader
          eyebrow="The Menu"
          title="What we're cooking"
          lead="Search it, filter it, or just read from the top. Prices are inclusive of taxes."
          crumbs={[
            { label: "Home", href: "/" },
            { label: "Restaurant", href: "/restaurant" },
            { label: "Menu" },
          ]}
        />

        {menuItems.length === 0 ? (
          <EmptyState
            title="The menu is being updated."
            description="Give us a moment — or call and we'll happily talk you through it."
          />
        ) : (
          <MenuBrowser categories={menuCategories} items={menuItems} />
        )}

        {/* ── Order Online: placeholder only ──
            RULES.md §2 puts online food ordering in Phase 2 — "UI/feature
            placeholder must exist now, but do not build the transactional
            ordering backend yet". This is that entry point, and it is honest
            about not being live rather than opening a dead checkout. */}
        <Reveal delay={0.1}>
          <div className="mt-20 flex flex-col items-center gap-5 rounded-luxe border border-dashed border-ink/15 bg-cream-dark/40 px-8 py-12 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gold/10">
              <ShoppingBag size={18} strokeWidth={1.5} className="text-gold" />
            </span>
            <div>
              <h2 className="card-title">Order Online</h2>
              <p className="body-muted mx-auto mt-2 max-w-sm">
                Home delivery and takeaway ordering are coming soon. For now, reserve a table or
                call us to arrange a takeaway.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link href="/restaurant/reserve" className="btn-primary group">
                Reserve A Table <ArrowRight size={14} className="btn-arrow" />
              </Link>
              <Link href="/restaurant/contact" className="btn-outline group">
                Call For Takeaway
              </Link>
            </div>
          </div>
        </Reveal>
      </div>
    </main>
  );
}
