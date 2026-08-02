import { Flame, Leaf } from "lucide-react";
import LuxeImage from "@/components/motion/LuxeImage";
import { money } from "@/lib/format";
import type { MenuItemData } from "@/lib/restaurant";

/**
 * A single dish.
 *
 * Restaurant-specific by necessity — a dish's anatomy (veg mark, spice level,
 * specials badges, availability) has nothing in common with RoomCard's rate/
 * occupancy/CTA shape, so this is genuinely new rather than a duplicate. It still
 * uses the shared `.card-luxe`, `.media`, `.price` classes and `LuxeImage`, so it
 * sits in the same design system.
 *
 * Deliberately has NO add-to-cart or order control: online food ordering is
 * Phase 2 (RULES.md §2). This is a menu to read, not a shop.
 */

/** The Indian veg/non-veg mark — a dot inside a square, red or green. */
function FoodTypeMark({ foodType }: { foodType: MenuItemData["foodType"] }) {
  const colour =
    foodType === "veg" ? "border-green-700" : foodType === "egg" ? "border-amber-600" : "border-red-700";
  const dot =
    foodType === "veg" ? "bg-green-700" : foodType === "egg" ? "bg-amber-600" : "bg-red-700";
  const label = foodType === "veg" ? "Vegetarian" : foodType === "egg" ? "Contains egg" : "Non-vegetarian";

  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className={`inline-flex h-4 w-4 shrink-0 items-center justify-center border ${colour}`}
    >
      <span className={`h-2 w-2 rounded-full ${dot}`} />
    </span>
  );
}

export default function MenuItemCard({ item }: { item: MenuItemData }) {
  return (
    <article
      className={`card-luxe group flex w-full gap-5 overflow-hidden p-5 sm:p-6 ${
        item.isAvailable ? "card-hover" : "opacity-70"
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2.5">
          <span className="mt-1">
            <FoodTypeMark foodType={item.foodType} />
          </span>
          <div className="min-w-0">
            <h3 className="card-title !text-lg leading-snug">{item.name}</h3>

            {/* Badges: only render what's actually true of this dish. */}
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
              {item.isChefSpecial && (
                <span className="text-xs uppercase tracking-luxe text-gold-dark">Chef&apos;s Special</span>
              )}
              {item.isTodaysSpecial && (
                <span className="text-xs uppercase tracking-luxe text-gold-dark">Today&apos;s Special</span>
              )}
              {item.spiceLevel === "hot" && (
                <span className="flex items-center gap-1 text-xs uppercase tracking-luxe text-red-700">
                  <Flame size={12} /> Hot
                </span>
              )}
              {item.tags.includes("jain") && (
                <span className="flex items-center gap-1 text-xs uppercase tracking-luxe text-green-700">
                  <Leaf size={12} /> Jain
                </span>
              )}
            </div>
          </div>
        </div>

        <p className="body-muted mt-3">{item.description}</p>

        <p className="mt-4 flex items-baseline gap-3">
          <span className="price text-xl">{money(item.price)}</span>
          {!item.isAvailable && (
            <span className="text-xs uppercase tracking-luxe text-warm-500">Unavailable today</span>
          )}
        </p>
      </div>

      {item.imageUrl && (
        <LuxeImage
          src={item.imageUrl}
          alt={item.name}
          wrapperClassName="h-24 w-24 shrink-0 rounded-xl sm:h-28 sm:w-28"
          width={240}
          sizes="112px"
          zoom
        />
      )}
    </article>
  );
}
