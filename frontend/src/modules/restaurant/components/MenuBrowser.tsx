"use client";

import { useMemo, useState } from "react";
import { Search, X, SlidersHorizontal } from "lucide-react";
import MenuItemCard from "./MenuItemCard";
import EmptyState from "@/components/ui/EmptyState";
import { Stagger, StaggerItem } from "@/components/motion/Stagger";
import { money } from "@/lib/format";
import type { MenuCategoryData, MenuItemData, FoodType } from "@/lib/restaurant";

/**
 * Menu browsing: search, veg/non-veg, price range, specials, category jump.
 *
 * Filtering runs CLIENT-SIDE over the already-fetched menu, which is a deliberate
 * choice rather than an oversight. The page aggregate already ships the full menu
 * (a restaurant menu is tens to a few hundred items, not an open-ended catalogue),
 * so filtering locally gives instant feedback with zero network round-trips — the
 * opposite trade-off from RoomSearch, where availability genuinely must be asked
 * of the server for each query.
 *
 * The equivalent server-side filters DO exist on `/restaurants/:slug/menu` for any
 * consumer that needs them (and they're documented); this component simply
 * doesn't need them.
 *
 * Reuses shared `EmptyState`, `Stagger`, `.field-line`, `.btn-*` — nothing here
 * re-implements shared UI.
 */
export default function MenuBrowser({
  categories,
  items,
}: {
  categories: MenuCategoryData[];
  items: MenuItemData[];
}) {
  const [search, setSearch] = useState("");
  const [foodType, setFoodType] = useState<FoodType | "all">("all");
  const [special, setSpecial] = useState<"all" | "chef" | "today">("all");
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const priceCeiling = useMemo(
    () => (items.length ? Math.ceil(Math.max(...items.map((i) => i.price)) / 100) * 100 : 0),
    [items]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      if (foodType !== "all" && item.foodType !== foodType) return false;
      if (special === "chef" && !item.isChefSpecial) return false;
      if (special === "today" && !item.isTodaysSpecial) return false;
      if (maxPrice !== null && item.price > maxPrice) return false;
      if (q) {
        const haystack = `${item.name} ${item.description} ${item.tags.join(" ")}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [items, search, foodType, special, maxPrice]);

  // Group the filtered set back under its categories so the menu keeps its
  // intended reading order instead of becoming one flat list.
  const grouped = useMemo(
    () =>
      categories
        .map((cat) => ({ category: cat, items: filtered.filter((i) => i.categoryId === cat._id) }))
        .filter((g) => g.items.length > 0),
    [categories, filtered]
  );

  const isFiltered = search !== "" || foodType !== "all" || special !== "all" || maxPrice !== null;

  function reset() {
    setSearch("");
    setFoodType("all");
    setSpecial("all");
    setMaxPrice(null);
  }

  const chip = (active: boolean) =>
    `rounded-full px-5 py-2.5 text-xs font-medium uppercase tracking-luxe transition-all duration-400 ease-luxe ${
      active
        ? "bg-ink text-cream"
        : "border border-ink/10 text-warm-500 hover:border-gold hover:text-gold"
    }`;

  return (
    <div>
      {/* ── Search ── */}
      <div className="group relative mx-auto mb-8 max-w-lg">
        <Search
          size={16}
          className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 text-warm-400 transition-colors duration-400 group-focus-within:text-gold"
        />
        <label htmlFor="menu-search" className="sr-only">
          Search the menu
        </label>
        <input
          id="menu-search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search dishes, ingredients…"
          className="field-line !pl-8 !pr-8"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            aria-label="Clear search"
            className="absolute right-0 top-1/2 -translate-y-1/2 p-1 text-warm-400 transition-colors hover:text-gold"
          >
            <X size={15} />
          </button>
        )}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 left-0 h-px w-full origin-left scale-x-0 bg-gold transition-transform duration-500 ease-luxe group-focus-within:scale-x-100"
        />
      </div>

      {/* ── Filters ── */}
      <div className="mb-4 flex justify-center sm:hidden">
        <button
          onClick={() => setShowFilters((v) => !v)}
          aria-expanded={showFilters}
          className="inline-flex items-center gap-2 rounded-full border border-ink/12 px-5 py-2.5 text-xs uppercase tracking-luxe text-ink"
        >
          <SlidersHorizontal size={13} /> {showFilters ? "Hide" : "Filters"}
        </button>
      </div>

      <div className={`${showFilters ? "block" : "hidden"} mb-10 sm:block`}>
        <div className="flex flex-wrap items-center justify-center gap-2.5">
          <button onClick={() => setFoodType("all")} className={chip(foodType === "all")}>
            All
          </button>
          <button onClick={() => setFoodType("veg")} className={chip(foodType === "veg")}>
            Vegetarian
          </button>
          <button onClick={() => setFoodType("non_veg")} className={chip(foodType === "non_veg")}>
            Non-Vegetarian
          </button>
          <span aria-hidden="true" className="mx-1 hidden h-5 w-px bg-ink/10 sm:block" />
          <button onClick={() => setSpecial(special === "chef" ? "all" : "chef")} className={chip(special === "chef")}>
            Chef&apos;s Specials
          </button>
          <button onClick={() => setSpecial(special === "today" ? "all" : "today")} className={chip(special === "today")}>
            Today&apos;s Special
          </button>
        </div>

        {priceCeiling > 0 && (
          <div className="mx-auto mt-7 max-w-sm">
            <label htmlFor="menu-price" className="field-label flex items-center justify-between">
              <span>Max price</span>
              <span className="text-ink">{maxPrice === null ? "Any" : money(maxPrice)}</span>
            </label>
            <input
              id="menu-price"
              type="range"
              min={0}
              max={priceCeiling}
              step={50}
              value={maxPrice ?? priceCeiling}
              onChange={(e) => {
                const v = Number(e.target.value);
                setMaxPrice(v >= priceCeiling ? null : v);
              }}
              className="h-1 w-full cursor-pointer appearance-none rounded-full bg-ink/10 accent-gold"
            />
          </div>
        )}
      </div>

      {/* ── Result count + reset ── */}
      <div className="mb-8 flex items-center justify-center gap-4">
        <p className="text-xs uppercase tracking-luxe text-warm-500">
          {filtered.length} {filtered.length === 1 ? "dish" : "dishes"}
        </p>
        {isFiltered && (
          <button
            onClick={reset}
            className="text-xs uppercase tracking-luxe text-gold-dark underline-offset-4 transition-colors hover:text-gold hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* ── Grouped results ── */}
      {grouped.length === 0 ? (
        <EmptyState
          title="No dishes match that"
          description="Try a different search, or clear the filters to see the full menu."
        />
      ) : (
        <div className="space-y-16">
          {grouped.map(({ category, items: catItems }) => (
            <section key={category._id} id={category.slug} className="anchor-offset">
              <div className="mb-7">
                <h2 className="section-title !text-display-sm">{category.name}</h2>
                {category.description && <p className="body-muted mt-2">{category.description}</p>}
                <span aria-hidden="true" className="mt-4 block h-px w-16 bg-gold" />
              </div>

              <Stagger className="grid grid-cols-1 gap-5 lg:grid-cols-2" stagger={0.05}>
                {catItems.map((item) => (
                  <StaggerItem key={item._id} className="flex">
                    <MenuItemCard item={item} />
                  </StaggerItem>
                ))}
              </Stagger>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
