import Link from "next/link";
import { ArrowRight, ChefHat, Sparkles } from "lucide-react";
import MenuItemCard from "./MenuItemCard";
import Reveal from "@/components/motion/Reveal";
import TextReveal from "@/components/motion/TextReveal";
import { Stagger, StaggerItem } from "@/components/motion/Stagger";
import type { MenuItemData } from "@/lib/restaurant";

/**
 * Chef Specials / Today's Special Menu.
 *
 * One component serves both — they differ only in copy and icon, so a `variant`
 * prop is honest reuse rather than two near-identical files. Returns null when
 * the kitchen hasn't flagged anything, so an empty section never renders.
 *
 * Uses the shared section rhythm (`.section`, `.container-luxe`,
 * `.section-eyebrow`) and shared motion primitives throughout.
 */
export default function SpecialsSection({
  items,
  variant,
  tinted = false,
}: {
  items: MenuItemData[];
  variant: "chef" | "today";
  /** Renders on the alternating cream-dark background. */
  tinted?: boolean;
}) {
  if (!items || items.length === 0) return null;

  const copy =
    variant === "chef"
      ? {
          eyebrow: "From The Pass",
          title: "Chef's specials",
          lead: "The dishes our kitchen is proudest of — worth ordering even if you came for something else.",
          Icon: ChefHat,
        }
      : {
          eyebrow: "Today Only",
          title: "Today's special menu",
          lead: "Cooked around what arrived fresh this morning. It changes daily.",
          Icon: Sparkles,
        };

  return (
    <section className={`section ${tinted ? "bg-cream-dark" : ""}`}>
      <div className="container-luxe">
        <div className="mb-12 grid grid-cols-1 items-end gap-8 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <Reveal duration={0.6}>
              <p className="section-eyebrow">
                <copy.Icon size={13} strokeWidth={1.5} />
                {copy.eyebrow}
              </p>
            </Reveal>
            <TextReveal as="h2" text={copy.title} className="section-title" delay={0.05} />
          </div>
          <div className="lg:col-span-5">
            <Reveal delay={0.15} distance={18}>
              <p className="lead">{copy.lead}</p>
              <Link href="/restaurant/menu" className="link-arrow mt-6">
                Full menu <ArrowRight size={14} />
              </Link>
            </Reveal>
          </div>
        </div>

        <Stagger className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {items.slice(0, 4).map((item) => (
            <StaggerItem key={item._id} className="flex">
              <MenuItemCard item={item} />
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}
