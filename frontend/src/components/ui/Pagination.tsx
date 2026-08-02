"use client";

/**
 * Numbered pagination.
 *
 * Byte-identical markup was duplicated in RoomSearch and ReviewsList — same
 * 40px pills, same active/inactive states, same `Array.from({length: totalPages})`
 * loop. Extracted verbatim so both call sites render exactly as before.
 *
 * Client-only because it takes an `onChange` handler; both current callers hold
 * page state locally (their datasets are already fully in memory, so paging is a
 * slice, not a refetch).
 */
export default function Pagination({
  page,
  totalPages,
  onChange,
  label = "Pagination",
  className = "mt-14",
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
  /** Accessible name — e.g. "Rooms pagination", "Reviews pagination". */
  label?: string;
  className?: string;
}) {
  if (totalPages <= 1) return null;

  return (
    <nav aria-label={label} className={`flex items-center justify-center gap-2 ${className}`}>
      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
        <button
          key={p}
          onClick={() => onChange(p)}
          aria-current={p === page ? "page" : undefined}
          className={`h-10 w-10 rounded-full text-xs font-medium tabular-nums transition-all duration-400 ease-luxe ${
            p === page
              ? "bg-ink text-cream"
              : "border border-ink/10 text-warm-500 hover:border-gold hover:text-gold"
          }`}
        >
          {p}
        </button>
      ))}
    </nav>
  );
}
