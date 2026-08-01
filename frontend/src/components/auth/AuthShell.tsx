import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getTheHotel } from "@/lib/hotel";
import AuthBackdrop from "@/components/auth/AuthBackdrop";
import Reveal from "@/components/motion/Reveal";

/**
 * Full-screen auth layout: cinematic backdrop with a centred glass card.
 *
 * Matches the supplied design reference — full-bleed property photography with
 * motion, a dark translucent blurred card floating over it, serif heading, and a
 * gold CTA. (An earlier version of this file used a left/right split on cream;
 * the reference is a centred card on dark, so it was rebuilt.)
 *
 * The root layout's <Header> deliberately renders nothing on /login and /signup
 * so the backdrop is genuinely full-screen; the "Back to site" link below is the
 * way out.
 *
 * A Server Component — it fetches its own photography from the gallery the site
 * already loads, so neither auth page needs to know about hotel data.
 */
export default async function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const data = await getTheHotel();

  // Curated gallery photography first, rooms as backfill; a handful is plenty
  // for a slow crossfade and keeps the payload small.
  const images = [
    ...(data?.gallery?.map((g) => g.imageUrl) || []),
    ...(data?.rooms?.flatMap((r) => r.images || []) || []),
  ].slice(0, 5);

  return (
    <main className="relative flex min-h-screen items-center justify-center px-5 py-12 sm:px-8 sm:py-16">
      <AuthBackdrop images={images} />

      {/* Widened from 27rem — the card felt cramped against the full-screen
          backdrop, and the signup form's four fields needed more breathing room. */}
      <div className="w-full max-w-[32rem]">
        {/* Wordmark above the card, as in the reference */}
        <div className="mb-8 text-center">
          <Link href="/" className="inline-block">
            <span className="font-display text-3xl leading-none text-cream">
              7 <span className="text-gold-light">Vachan</span>
            </span>
            <span className="mt-1.5 block text-[11px] uppercase tracking-eyebrow text-cream/45">
              Hotel &amp; Stays
            </span>
          </Link>
        </div>

        <Reveal duration={0.8} distance={22}>
          {/* The glass card. Border + inner highlight give the panel an edge that
              reads as a physical surface rather than a flat overlay. */}
          <section
            className="rounded-airy border border-cream/15 bg-ink/55 px-7 py-10 shadow-lift
                       backdrop-blur-2xl sm:px-12 sm:py-14"
          >
            <header className="text-center">
              <h1 className="font-display text-[2.125rem] font-normal leading-tight text-cream sm:text-[2.5rem]">
                {title}
              </h1>
              {subtitle && (
                <p className="mx-auto mt-3 max-w-xs text-sm font-light leading-relaxed text-cream/60">
                  {subtitle}
                </p>
              )}
            </header>

            <div className="mt-9">{children}</div>

            {footer && <div className="mt-8">{footer}</div>}
          </section>
        </Reveal>

        <div className="mt-8 text-center">
          <Link
            href="/"
            className="group inline-flex items-center gap-2 text-xs uppercase tracking-luxe text-cream/50 transition-colors hover:text-gold-light"
          >
            <ArrowLeft
              size={13}
              className="transition-transform duration-400 ease-luxe group-hover:-translate-x-1"
            />
            Back to site
          </Link>
        </div>
      </div>
    </main>
  );
}
