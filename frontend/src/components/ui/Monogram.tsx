import { initial } from "@/lib/format";

/**
 * Initial-in-a-circle avatar, used beside guest names on review cards.
 *
 * Was duplicated in Testimonials and ReviewsList. Deliberately a monogram rather
 * than a stock photo or generated illustration — the API has no guest avatar
 * field, and inventing faces for real reviewers would be dishonest.
 *
 * A Server Component.
 */
export default function Monogram({
  name,
  size = "md",
  className = "",
}: {
  name?: string;
  size?: "sm" | "md";
  className?: string;
}) {
  const dimensions = size === "sm" ? "h-9 w-9 text-sm" : "h-10 w-10 text-base";

  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-full bg-gold/12 font-display text-gold ${dimensions} ${className}`}
    >
      {initial(name)}
    </span>
  );
}
