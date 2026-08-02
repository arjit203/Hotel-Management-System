import { cn } from "@/lib/cn";

type Tone = "neutral" | "success" | "warning" | "danger" | "info" | "brand";

const TONE_CLASS: Record<Tone, string> = {
  neutral: "badge-neutral",
  success: "badge-success",
  warning: "badge-warning",
  danger: "badge-danger",
  info: "badge-info",
  brand: "badge-brand",
};

/**
 * Status → tone map covering every status string the backend can return today:
 * hotel booking statuses, restaurant reservation statuses, payment statuses and
 * the generic active/inactive + approval flags. Unknown values fall back to
 * neutral rather than throwing, so a future backend status still renders.
 */
const STATUS_TONE: Record<string, Tone> = {
  // generic
  active: "success",
  inactive: "neutral",
  approved: "success",
  pending_approval: "warning",
  // hotel bookings
  pending: "warning",
  confirmed: "success",
  checked_in: "info",
  checked_out: "neutral",
  completed: "success",
  cancelled: "danger",
  refund_pending: "warning",
  refunded: "neutral",
  // payments
  unpaid: "warning",
  paid: "success",
  partially_paid: "info",
  failed: "danger",
  // restaurant reservations
  seated: "info",
  no_show: "danger",
  // menu
  available: "success",
  unavailable: "neutral",
  veg: "success",
  non_veg: "danger",
  egg: "warning",
};

export function statusTone(status: string): Tone {
  return STATUS_TONE[status] ?? "neutral";
}

export default function Badge({
  children,
  tone,
  status,
  icon,
  className,
}: {
  children?: React.ReactNode;
  tone?: Tone;
  /** When given, the tone is derived from the status and the label is humanised. */
  status?: string;
  icon?: React.ReactNode;
  className?: string;
}) {
  const resolvedTone = tone ?? (status ? statusTone(status) : "neutral");
  const label = children ?? (status ? status.replace(/_/g, " ") : null);

  return (
    <span className={cn(TONE_CLASS[resolvedTone], className)}>
      {icon}
      {label}
    </span>
  );
}

/** Small coloured dot — used in the sidebar and stat cards. */
export function Dot({ tone = "neutral" }: { tone?: Tone }) {
  const map: Record<Tone, string> = {
    neutral: "bg-ink-400",
    success: "bg-success-500",
    warning: "bg-warning-500",
    danger: "bg-danger-500",
    info: "bg-info-500",
    brand: "bg-brand-500",
  };
  return <span className={cn("inline-block h-1.5 w-1.5 shrink-0 rounded-full", map[tone])} />;
}
