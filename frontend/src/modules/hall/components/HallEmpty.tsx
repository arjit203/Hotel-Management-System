import Link from "next/link";
import { PartyPopper } from "lucide-react";
import EmptyState from "@/components/ui/EmptyState";

/**
 * Shown when `getTheHall()` returns null — no hall has been created yet, or the
 * API is unreachable.
 *
 * Every hall page renders this rather than throwing, so a fresh database or a
 * momentarily-down backend produces a composed page instead of a crash. Seeding
 * the venue (`database/seeders/seed-marriage-hall.ts`) is what replaces it.
 */
export default function HallEmpty({
  title = "Our banquet venue",
  message = "Details for this venue are being prepared. Please check back shortly, or get in touch and we will tell you everything.",
}: {
  title?: string;
  message?: string;
}) {
  return (
    <div className="section">
      <div className="container-luxe">
        <EmptyState
          variant="card"
          icon={PartyPopper}
          title={title}
          description={message}
          action={
            <Link href="/" className="btn-outline">
              Back to home
            </Link>
          }
          className="mx-auto max-w-xl"
        />
      </div>
    </div>
  );
}
