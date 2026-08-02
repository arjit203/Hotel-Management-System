import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/**
 * "Nothing here yet" panel.
 *
 * Three flavours of this were scattered around: a bare centred `<p>` on the
 * offers/amenities/gallery pages, and two full card variants in my-bookings. Same
 * job, three different paddings and type sizes.
 *
 * `variant="quiet"` reproduces the bare centred line (for a page that simply has
 * no records yet); `variant="card"` is the framed version with an icon and an
 * action. Defaults to quiet, which is the more common case.
 *
 * A Server Component — pass an already-built <Link> as `action`.
 */
export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  variant = "quiet",
  className = "",
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  variant?: "quiet" | "card";
  className?: string;
}) {
  if (variant === "quiet") {
    return (
      <div className={`py-16 text-center ${className}`}>
        <p className="font-light text-warm-500">{title}</p>
        {description && <p className="body-muted mx-auto mt-2 max-w-sm">{description}</p>}
        {action && <div className="mt-8">{action}</div>}
      </div>
    );
  }

  return (
    <div className={`card-luxe flex flex-col items-center px-8 py-16 text-center ${className}`}>
      {Icon && (
        <span className="mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-gold/[0.08]">
          <Icon size={20} strokeWidth={1.5} className="text-gold" />
        </span>
      )}
      <h2 className="card-title">{title}</h2>
      {description && <p className="body-muted mx-auto mt-3 max-w-sm">{description}</p>}
      {action && <div className="mt-8">{action}</div>}
    </div>
  );
}
