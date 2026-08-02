import { Skeleton, SkeletonPageHeader, SkeletonText } from "@/components/Skeleton";

/** Mirrors MenuBrowser's shape — search, filter chips, then two-column dish rows. */
export default function MenuLoading() {
  return (
    <main>
      <div className="container-luxe pb-24 pt-20 sm:pt-24">
        <SkeletonPageHeader />

        <Skeleton className="mx-auto mb-8 h-10 max-w-lg rounded-full" />

        <div className="mb-10 flex flex-wrap justify-center gap-2.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-28 rounded-full" />
          ))}
        </div>

        <div className="space-y-16">
          {Array.from({ length: 2 }).map((_, section) => (
            <div key={section}>
              <Skeleton className="mb-7 h-9 w-48 rounded-full" />
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="card-luxe flex gap-5 p-6">
                    <div className="flex-1">
                      <Skeleton className="h-5 w-2/3 rounded-full" />
                      <SkeletonText lines={2} className="mt-4" />
                      <Skeleton className="mt-4 h-6 w-20 rounded-full" />
                    </div>
                    <Skeleton className="h-28 w-28 shrink-0 rounded-xl" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
