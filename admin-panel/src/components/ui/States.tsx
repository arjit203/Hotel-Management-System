"use client";

import { Inbox } from "lucide-react";
import { cn } from "@/lib/cn";

// ---------------------------------------------------------------- Skeletons

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} aria-hidden />;
}

/** Table body placeholder — matches the real row height so nothing jumps. */
export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="divide-y divide-line-subtle" aria-busy="true" aria-label="Loading rows">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4 px-4 py-3.5">
          {Array.from({ length: cols }).map((__, c) => (
            <Skeleton
              key={c}
              className={cn("h-4", c === 0 ? "w-[22%]" : c === cols - 1 ? "w-[10%]" : "flex-1")}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("card p-5", className)} aria-busy="true">
      <Skeleton className="h-3.5 w-24" />
      <Skeleton className="mt-3 h-7 w-16" />
      <Skeleton className="mt-3 h-3 w-32" />
    </div>
  );
}

export function GridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div
      className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
      aria-busy="true"
    >
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="aspect-[4/3] w-full rounded-lg" />
      ))}
    </div>
  );
}

// -------------------------------------------------------------- Empty state

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  compact,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        compact ? "px-4 py-8" : "px-6 py-14",
        className
      )}
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-surface-muted text-ink-500">
        {icon ?? <Inbox size={19} />}
      </div>
      <h3 className="mt-3.5 text-base font-semibold text-ink-800">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-base text-ink-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// -------------------------------------------------------------- Error state

export function ErrorState({
  message,
  onRetry,
  className,
}: {
  message: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-6 py-12 text-center",
        className
      )}
      role="alert"
    >
      <h3 className="text-base font-semibold text-ink-800">Couldn&apos;t load this</h3>
      <p className="mt-1 max-w-sm text-base text-ink-500">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-secondary mt-4">
          Try again
        </button>
      )}
    </div>
  );
}
