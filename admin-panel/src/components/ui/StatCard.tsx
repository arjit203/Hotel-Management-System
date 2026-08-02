"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { Skeleton } from "./States";

type Tone = "neutral" | "brand" | "success" | "warning" | "danger" | "info";

const ICON_TONE: Record<Tone, string> = {
  neutral: "bg-surface-muted text-ink-600",
  brand: "bg-brand-50 text-brand-600",
  success: "bg-success-50 text-success-600",
  warning: "bg-warning-50 text-warning-600",
  danger: "bg-danger-50 text-danger-600",
  info: "bg-info-50 text-info-600",
};

/**
 * Dashboard / page-header summary tile. `href` turns the whole card into a link
 * to the underlying list, which is the fastest path from "12 pending" to the
 * filtered table showing those 12.
 */
export default function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "neutral",
  href,
  loading,
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon?: React.ReactNode;
  tone?: Tone;
  href?: string;
  loading?: boolean;
  className?: string;
}) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-ink-600">{label}</p>
        {icon && (
          <span
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
              ICON_TONE[tone]
            )}
          >
            {icon}
          </span>
        )}
      </div>

      {loading ? (
        <Skeleton className="mt-3 h-7 w-20" />
      ) : (
        <p className="mt-2 text-2xl font-semibold tracking-tight text-ink-900">{value}</p>
      )}

      {hint && (
        <p className="mt-1.5 flex items-center gap-1 text-xs text-ink-500">
          {hint}
          {href && <ArrowUpRight size={12} className="shrink-0" />}
        </p>
      )}
    </>
  );

  const base = cn(
    "card p-4 transition-shadow",
    href && "hover:shadow-md focus-visible:shadow-md",
    className
  );

  if (href) {
    return (
      <Link href={href} className={cn(base, "block")}>
        {body}
      </Link>
    );
  }

  return <div className={base}>{body}</div>;
}
