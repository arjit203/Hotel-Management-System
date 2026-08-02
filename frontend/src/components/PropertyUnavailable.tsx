import Link from "next/link";
import { Phone, RefreshCw, ServerCrash } from "lucide-react";
import type { LucideIcon } from "lucide-react";

/**
 * Shown when a property's data can't be loaded.
 *
 * ── Why this is not a 404 ──
 * `/hotel` used to call `notFound()` when `getTheHotel()` returned null, but
 * that function returns null for two very different reasons: the property
 * genuinely doesn't exist, or the API is unreachable. Rendering "page not
 * found" during a thirty-second backend restart tells a guest the hotel doesn't
 * exist — and search engines a 404 for a page that is live. This says the
 * honest thing instead, and keeps the phone number on screen so a guest who
 * came to book still can.
 *
 * A Server Component. `Retry` is a plain link back to the same URL, which
 * re-runs the server render — no client JavaScript needed.
 */
export default function PropertyUnavailable({
  title = "Just a moment",
  message = "We can't load these details right now. It's usually brief — please try again in a moment.",
  retryHref,
  contactPhone,
  icon: Icon = ServerCrash,
}: {
  title?: string;
  message?: string;
  /** Where "Try again" points. Pass the current path. */
  retryHref: string;
  /** Rendered as a call link when the venue's number is known. */
  contactPhone?: string;
  icon?: LucideIcon;
}) {
  return (
    <main className="flex min-h-[70vh] items-center justify-center bg-cream px-6 py-24">
      <div className="mx-auto max-w-lg text-center">
        <span className="mx-auto mb-7 flex h-14 w-14 items-center justify-center rounded-full bg-gold/[0.09]">
          <Icon size={22} strokeWidth={1.5} className="text-gold" />
        </span>

        <p className="section-eyebrow flex justify-center">7 Vachan</p>
        <h1 className="section-title">{title}</h1>
        <p className="lead mx-auto mt-5">{message}</p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link href={retryHref} className="btn-primary group">
            <RefreshCw size={14} />
            Try again
          </Link>

          {contactPhone ? (
            <a href={`tel:${contactPhone.replace(/\s/g, "")}`} className="btn-outline group">
              <Phone size={14} />
              {contactPhone}
            </a>
          ) : (
            <Link href="/" className="btn-outline group">
              Back to home
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}
