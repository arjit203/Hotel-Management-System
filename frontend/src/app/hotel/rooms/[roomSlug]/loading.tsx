import { Skeleton, SkeletonText } from "@/components/Skeleton";

/**
 * Room detail placeholder. The main frame reserves the same 4:3 aspect ratio the
 * real gallery uses, so the two-column layout settles without a jump.
 */
export default function RoomDetailLoading() {
  return (
    <main>
      <div className="container-luxe pb-24 pt-20 sm:pt-24">
        <Skeleton className="mb-10 h-3 w-24 rounded-full" />

        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-14">
          <div className="lg:col-span-7">
            <Skeleton className="aspect-[4/3] w-full rounded-airy" />
            <div className="mt-3 grid grid-cols-4 gap-3 sm:grid-cols-5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-xl sm:h-20" />
              ))}
            </div>
          </div>

          <div className="space-y-5 lg:col-span-5">
            <Skeleton className="h-3 w-20 rounded-full" />
            <Skeleton className="h-10 w-3/4 rounded-full" />
            <Skeleton className="h-3 w-32 rounded-full" />
            <SkeletonText lines={4} className="pt-3" />
            <div className="grid grid-cols-2 gap-3 pt-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-3 rounded-full" />
              ))}
            </div>
            <Skeleton className="h-44 rounded-luxe" />
          </div>
        </div>
      </div>
    </main>
  );
}
