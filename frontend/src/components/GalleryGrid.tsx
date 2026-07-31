export interface GalleryImage {
  _id: string;
  imageUrl: string;
  title?: string;
  category: string;
}

// Groups images by `category` (e.g. "exterior", "room", "food") and renders a
// subheading per group — previously `category` was captured in the admin
// panel's Gallery form and saved to the database but never actually used
// anywhere on the public site; all images rendered in one flat, unlabeled grid
// regardless of category.
export default function GalleryGrid({ images }: { images: GalleryImage[] }) {
  if (!images || images.length === 0) return null;

  const groups = images.reduce<Record<string, GalleryImage[]>>((acc, img) => {
    const key = img.category || "Other";
    acc[key] = acc[key] || [];
    acc[key].push(img);
    return acc;
  }, {});

  return (
    <div>
      {Object.entries(groups).map(([category, categoryImages]) => (
        <div key={category} style={{ marginBottom: 20 }}>
          <h4 style={{ textTransform: "capitalize", margin: "0 0 8px" }}>{category}</h4>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
              gap: 12,
            }}
          >
            {categoryImages.map((img) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={img._id}
                src={img.imageUrl}
                alt={img.title || `${category} photo`}
                style={{ width: "100%", height: 140, objectFit: "cover", borderRadius: 8 }}
                loading="lazy"
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
