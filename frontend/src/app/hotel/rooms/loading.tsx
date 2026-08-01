import { Skeleton, SkeletonGrid, SkeletonPageHeader } from "@/components/Skeleton";

/**
 * Shown while the Rooms page awaits the hotel/rooms fetch.
 *
 * Mirrors the real page's structure (header, filter bar, 3-card grid) so the
 * layout doesn't jump when content arrives. Pure CSS shimmer — no client JS.
 */
export default function RoomsLoading() {
  return (
    <main>
      <div className="container-luxe pb-24 pt-20 sm:pt-24">
        <SkeletonPageHeader />
        <Skeleton className="mb-12 h-32 rounded-luxe sm:h-28" />
        <SkeletonGrid count={3} />
      </div>
    </main>
  );
}
