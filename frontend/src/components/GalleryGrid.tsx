export interface GalleryImage {
  _id: string;
  imageUrl: string;
  title?: string;
}

export default function GalleryGrid({ images }: { images: GalleryImage[] }) {
  if (!images || images.length === 0) return null;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
        gap: 12,
      }}
    >
      {images.map((img) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={img._id}
          src={img.imageUrl}
          alt={img.title || "Gallery image"}
          style={{ width: "100%", height: 140, objectFit: "cover", borderRadius: 8 }}
          loading="lazy"
        />
      ))}
    </div>
  );
}
