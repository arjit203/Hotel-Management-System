"use client";

import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/cn";
import { Skeleton } from "./States";

export interface Crumb {
  label: string;
  href?: string;
}

/**
 * Visible breadcrumb trail. Unlike the public site's Breadcrumbs component this
 * one emits no JSON-LD — admin pages are behind auth and must never be indexed.
 */
export function Breadcrumbs({ items, className }: { items: Crumb[]; className?: string }) {
  return (
    <nav aria-label="Breadcrumb" className={cn("min-w-0", className)}>
      <ol className="flex flex-wrap items-center gap-1 text-sm text-ink-500">
        <li className="flex items-center">
          <Link
            href="/"
            className="flex items-center gap-1 rounded px-1 py-0.5 hover:text-ink-700"
            aria-label="Dashboard"
          >
            <Home size={13} />
          </Link>
        </li>
        {items.map((crumb, i) => {
          const isLast = i === items.length - 1;
          return (
            <li key={`${crumb.label}-${i}`} className="flex min-w-0 items-center">
              <ChevronRight size={13} className="shrink-0 text-ink-300" />
              {crumb.href && !isLast ? (
                <Link
                  href={crumb.href}
                  className="truncate rounded px-1 py-0.5 hover:text-ink-700 hover:underline"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span
                  aria-current={isLast ? "page" : undefined}
                  className={cn("truncate px-1 py-0.5", isLast && "font-medium text-ink-700")}
                >
                  {crumb.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/**
 * Standard top-of-page block: breadcrumbs, title, description and actions.
 * Every admin page uses this so vertical rhythm is identical across modules.
 */
export default function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
  meta,
  loading,
  className,
}: {
  title: string;
  description?: string;
  breadcrumbs?: Crumb[];
  actions?: React.ReactNode;
  /** Badges / small facts rendered under the title. */
  meta?: React.ReactNode;
  loading?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("mb-5", className)}>
      {breadcrumbs && breadcrumbs.length > 0 && <Breadcrumbs items={breadcrumbs} className="mb-2" />}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          {loading ? (
            <Skeleton className="h-7 w-56" />
          ) : (
            <h1 className="truncate text-xl font-semibold tracking-tight text-ink-900">{title}</h1>
          )}
          {description && <p className="mt-1 max-w-2xl text-base text-ink-500">{description}</p>}
          {meta && <div className="mt-2 flex flex-wrap items-center gap-2">{meta}</div>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
