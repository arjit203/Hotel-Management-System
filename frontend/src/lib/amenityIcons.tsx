import {
  Wifi,
  Waves,
  Dumbbell,
  ParkingCircle,
  UtensilsCrossed,
  Snowflake,
  Tv,
  Coffee,
  ShieldCheck,
  Bath,
  ShowerHead,
  Wind,
  Sparkles,
  LucideIcon,
} from "lucide-react";

// Amenity names come from the admin panel as free text — this matches common
// keywords to a sensible Lucide icon, falling back to a generic sparkle icon
// rather than breaking if an admin enters something unexpected.
const KEYWORD_MAP: { keywords: string[]; icon: LucideIcon }[] = [
  { keywords: ["wifi", "internet"], icon: Wifi },
  { keywords: ["pool", "swim"], icon: Waves },
  { keywords: ["gym", "fitness"], icon: Dumbbell },
  { keywords: ["parking", "valet"], icon: ParkingCircle },
  { keywords: ["restaurant", "dining", "food"], icon: UtensilsCrossed },
  { keywords: ["ac", "air condition"], icon: Snowflake },
  { keywords: ["tv", "television"], icon: Tv },
  { keywords: ["breakfast", "coffee", "tea"], icon: Coffee },
  { keywords: ["security", "safe"], icon: ShieldCheck },
  { keywords: ["bath", "tub"], icon: Bath },
  { keywords: ["shower"], icon: ShowerHead },
  { keywords: ["spa", "wellness"], icon: Wind },
];

export function getAmenityIcon(name: string): LucideIcon {
  const lower = name.toLowerCase();
  const match = KEYWORD_MAP.find((entry) => entry.keywords.some((k) => lower.includes(k)));
  return match?.icon || Sparkles;
}
