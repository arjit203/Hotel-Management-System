import { Skeleton, SkeletonPageHeader } from "@/components/Skeleton";

/** Mosaic-shaped placeholder — every third tile runs tall, matching GalleryGrid. */
export default function GalleryLoading() {
  return (
    <main>
      <div className="container-luxe pb-24 pt-20 sm:pt-24">
        <SkeletonPageHeader />

        <div className="mb-12 flex flex-wrap justify-center gap-2.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-24 rounded-full" />
          ))}
        </div>

        <div className="grid auto-rows-[170px] grid-cols-2 gap-3 sm:auto-rows-[200px] sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className={`rounded-luxe ${i % 3 === 0 ? "row-span-2" : ""}`} />
          ))}
        </div>
      </div>
    </main>
  );
}
