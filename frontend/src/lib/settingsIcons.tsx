import {
  Award,
  BedDouble,
  Car,
  ChefHat,
  Clock,
  Gem,
  HeartHandshake,
  Leaf,
  MapPin,
  PartyPopper,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
  Utensils,
  Wifi,
  type LucideIcon,
} from "lucide-react";

/**
 * Icon names → components, for content that comes out of the database.
 *
 * A settings document has to survive JSON, so the Homepage CMS stores an icon
 * as the string `"ChefHat"` rather than a component. This registry resolves it
 * back, and an unknown name falls back to `Sparkles` instead of rendering
 * `undefined` — which in a server component is not a blank space, it is a
 * crash, and one bad character typed into the admin panel would take the home
 * page down.
 *
 * The admin panel offers exactly these names (`VALUE_POINT_ICONS` in
 * `components/settings/schema.ts`). Keep the two in step; the fallback is a
 * safety net, not the plan.
 */
const REGISTRY: Record<string, LucideIcon> = {
  Award,
  BedDouble,
  Car,
  ChefHat,
  Clock,
  Gem,
  HeartHandshake,
  Leaf,
  MapPin,
  PartyPopper,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
  Utensils,
  Wifi,
};

export function resolveIcon(name: string | undefined): LucideIcon {
  if (!name) return Sparkles;
  return REGISTRY[name] ?? Sparkles;
}
