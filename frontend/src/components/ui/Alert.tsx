import { AlertCircle, Check, Info } from "lucide-react";
import type { ReactNode } from "react";

type Tone = "error" | "success" | "info";

/**
 * Inline form/page message.
 *
 * The exact same markup was hand-written in five components (LoginForm,
 * SignupForm, BookingForm, ReviewForm, RoomAvailabilityCheck), each repeating the
 * icon, the `role="alert"`, and the red border/background classes. This is that
 * block, once.
 *
 * `variant` switches the palette for the dark auth card, where the light-surface
 * red is unreadable.
 *
 * A Server Component — no interactivity, so it costs no client JS.
 */
const TONES: Record<Tone, { icon: typeof AlertCircle; light: string; dark: string }> = {
  error: {
    icon: AlertCircle,
    light: "border-red-200 bg-red-50 text-red-700",
    dark: "border-red-400/30 bg-red-500/15 text-red-200",
  },
  success: {
    icon: Check,
    light: "border-gold/30 bg-gold/[0.07] text-gold-dark",
    dark: "border-gold/30 bg-gold/15 text-gold-light",
  },
  info: {
    icon: Info,
    light: "border-ink/10 bg-cream-dark/60 text-warm-600",
    dark: "border-cream/15 bg-cream/10 text-cream/75",
  },
};

export default function Alert({
  children,
  tone = "error",
  variant = "light",
  className = "",
}: {
  children: ReactNode;
  tone?: Tone;
  /** `dark` for use on the ink/glass auth card. */
  variant?: "light" | "dark";
  className?: string;
}) {
  const { icon: Icon, light, dark } = TONES[tone];

  return (
    <p
      role="alert"
      className={`flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm font-light ${
        variant === "dark" ? dark : light
      } ${className}`}
    >
      <Icon size={16} className="mt-0.5 shrink-0" />
      <span>{children}</span>
    </p>
  );
}
