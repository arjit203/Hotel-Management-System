import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, MessageCircle, Phone } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import Reveal from "@/components/motion/Reveal";
import { getTheHall } from "@/lib/hall";
import PackageCards from "@/modules/hall/components/PackageCards";
import HallEmpty from "@/modules/hall/components/HallEmpty";

export async function generateMetadata(): Promise<Metadata> {
  const data = await getTheHall();
  const name = data?.hall.name ?? "our banquet hall";

  return {
    title: `Packages — ${name}`,
    description: `Wedding and event packages at ${name}. Each tier covers the venue, decoration, catering and service — adjusted around your family and guest list.`,
  };
}

/**
 * Package tiers.
 *
 * ── Why there are no prices on this page ──
 * The venue has not published pricing (Phase 4 brief: "No fixed prices. Admin
 * should configure later"). Rather than print a placeholder number that would
 * become wrong the moment it is set, each card shows the admin-controlled
 * `priceLabel` string — "On request" until the owner decides otherwise — and the
 * page says plainly why. Inventing a figure here would be worse than omitting
 * one: a family who plans around it and then hears a different number does not
 * come back.
 */
export default async function MarriageHallPackagesPage() {
  const data = await getTheHall();
  if (!data) return <HallEmpty title="Packages" />;

  const { hall, packages } = data;

  return (
    <div className="section bg-cream">
      <div className="container-luxe">
        <PageHeader
          eyebrow="Packages"
          title="Four ways to celebrate"
          lead="Every package below is a starting point, not a fixed menu. We build the final arrangement around your rituals, your guest list and the functions you are hosting."
          crumbs={[
            { label: "Marriage Hall", href: "/marriage-hall" },
            { label: "Packages" },
          ]}
        />

        {packages.length === 0 ? (
          <Reveal>
            <p className="py-16 text-center font-light text-warm-500">
              Our packages are being finalised. Please call us and we will talk you through the
              options.
            </p>
          </Reveal>
        ) : (
          <PackageCards packages={packages} />
        )}

        {/* Honest note about pricing, rather than a fabricated number. */}
        <Reveal delay={0.15} className="mt-16">
          <div className="mx-auto max-w-3xl rounded-luxe border border-ink/10 bg-white px-8 py-9 text-center shadow-luxury">
            <p className="section-eyebrow justify-center">On pricing</p>
            <p className="lead mx-auto max-w-prose">
              We quote each celebration individually. The cost of a wedding here depends on the
              spaces you use, the guest count, the decoration you choose and how many functions you
              are hosting — so a single figure on a web page would mislead more than it helps.
            </p>
            <p className="body-muted mx-auto mt-4 max-w-prose">
              Send us an enquiry or call, and you will have a full written quotation after one
              conversation. No payment is taken until you are ready.
            </p>

            <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
              <Link href="/marriage-hall/availability" className="btn-primary group">
                Request a quotation
                <ArrowRight size={14} className="btn-arrow" />
              </Link>
              <a
                href={`tel:${hall.contactPhone.replace(/\s/g, "")}`}
                className="btn-outline group"
              >
                <Phone size={14} />
                {hall.contactPhone}
              </a>
              {hall.whatsappNumber && (
                <a
                  href={`https://wa.me/${hall.whatsappNumber.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-outline group"
                >
                  <MessageCircle size={14} />
                  WhatsApp
                </a>
              )}
            </div>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
