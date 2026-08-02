import { ChefHat, Leaf, Users, CalendarCheck } from "lucide-react";
import type { ValuePoint } from "@/components/sections/ValueProps";

/**
 * The Restaurant module's copy for the shared `ValueProps` section.
 *
 * Kept beside the module that owns it — exactly as `HOTEL_VALUE_POINTS` lives
 * beside the shared component for the Hotel. The section component itself is
 * shared and content-agnostic; only this array is vertical-specific.
 */
export const RESTAURANT_VALUE_POINTS: ValuePoint[] = [
  {
    icon: ChefHat,
    title: "Cooked To Order",
    desc: "Nothing sits under a lamp. Every dish leaves the pass the moment it's ready.",
  },
  {
    icon: Leaf,
    title: "Sourced Daily",
    desc: "Produce arrives each morning, which is why the specials board changes with it.",
  },
  {
    icon: Users,
    title: "Private & Family Dining",
    desc: "Enclosed rooms for occasions that deserve their own space, and generous family seating.",
  },
  {
    icon: CalendarCheck,
    title: "Instant Reservation",
    desc: "Real-time table availability. Confirmed the moment you book — no waiting on a call back.",
  },
];
