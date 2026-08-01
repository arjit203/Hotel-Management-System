/**
 * Shimmering loading placeholders. Server-safe (no client JS) — the shimmer is
 * a pure CSS animation from the `.skeleton` class in globals.css.
 *
 * Used by route-level loading.tsx files so a slow API call shows the shape of
 * the page instead of a blank screen or a spinner.
 */

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton rounded-xl ${className}`} aria-hidden="true" />;
}

export function SkeletonText({ lines = 3, className = "" }: { lines?: number; className?: string }) {
  return (
    <div className={`space-y-2.5 ${className}`} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          // Last line is short, like real ragged-right text.
          className={`h-3 rounded-full ${i === lines - 1 ? "w-2/3" : "w-full"}`}
        />
      ))}
    </div>
  );
}

/** Matches the real RoomCard's proportions so the layout doesn't jump on load. */
export function SkeletonRoomCard() {
  return (
    <div className="card-luxe overflow-hidden">
      <Skeleton className="h-64 rounded-none sm:h-72" />
      <div className="space-y-4 p-7">
        <Skeleton className="h-3 w-24 rounded-full" />
        <Skeleton className="h-6 w-3/4 rounded-full" />
        <SkeletonText lines={2} />
        <div className="flex items-center justify-between border-t border-ink/5 pt-5">
          <Skeleton className="h-7 w-28 rounded-full" />
          <Skeleton className="h-7 w-24 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonGrid({
  count = 6,
  className = "grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3",
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div className={className}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonRoomCard key={i} />
      ))}
    </div>
  );
}

/** Centred eyebrow + title + lead block, matching PageHeader's proportions. */
export function SkeletonPageHeader() {
  return (
    <div className="mx-auto mb-14 max-w-prose text-center">
      <Skeleton className="mx-auto h-3 w-32 rounded-full" />
      <Skeleton className="mx-auto mt-6 h-12 w-3/4 rounded-full" />
      <Skeleton className="mx-auto mt-5 h-3 w-2/3 rounded-full" />
    </div>
  );
}
