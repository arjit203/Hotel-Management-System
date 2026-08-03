import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  CalendarCheck,
  CalendarHeart,
  CheckCircle2,
  Clock,
  Phone,
  Sparkles,
  XCircle,
} from "lucide-react";
import PageHeader from "@/components/PageHeader";
import Reveal from "@/components/motion/Reveal";
import PropertyUnavailable from "@/components/PropertyUnavailable";
import { getTheHall } from "@/lib/hall";
import CancelEnquiryButton from "@/modules/hall/components/CancelEnquiryButton";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api/v1";

interface Enquiry {
  _id: string;
  enquiryReference: string;
  guestName: string;
  guestEmail: string;
  guestPhone?: string;
  eventDate: string;
  alternateDate?: string | null;
  eventType: string;
  guestCount: number;
  packageName?: string;
  decorationThemeName?: string;
  cateringPreference?: string;
  specialRequirements?: string;
  status: string;
  createdAt?: string;
}

export const metadata: Metadata = {
  title: "Your enquiry",
  // A personal record behind a reference — never index it.
  robots: { index: false, follow: false },
};

/**
 * Enquiry status lookup.
 *
 * ── Why this page exists ──
 * The backend already emails the family when an admin approves, confirms or
 * declines an enquiry. But email is not a status board: it gets buried, filtered,
 * or sent to an address someone else checks. There was no way to answer "so is
 * our date booked or not?" without phoning.
 *
 * Uses the existing public lookup route, which strips `adminNotes`, so nothing
 * internal leaks. Uncached — status is exactly the thing that changes.
 *
 * Server Component; only the cancel button is a client island.
 */

/** What each status actually means to the family, in their language. */
const STATUS_COPY: Record<
  string,
  { label: string; headline: string; body: string; tone: "pending" | "good" | "done" | "bad" }
> = {
  pending: {
    label: "Received",
    headline: "We have your enquiry",
    body: "One of our event managers will call you within one working day. Your date is not held yet — we hold it only once we've spoken and agreed the arrangements.",
    tone: "pending",
  },
  reviewing: {
    label: "Being reviewed",
    headline: "We're looking into your date",
    body: "Our team is checking availability and putting together options for you. We'll call shortly. Nothing is held or charged yet.",
    tone: "pending",
  },
  approved: {
    label: "Approved",
    headline: "Good news — we can host you",
    body: "Your date is available and we'd be delighted to host your celebration. Our event manager is in touch to finalise the details. The date is held tentatively and becomes a confirmed booking once that conversation is complete.",
    tone: "good",
  },
  confirmed: {
    label: "Confirmed",
    headline: "Your date is booked",
    body: "Your celebration is confirmed and the date is held in your name. Our team will guide you through the remaining arrangements from here.",
    tone: "done",
  },
  declined: {
    label: "Not available",
    headline: "We're sorry — we can't host this date",
    body: "Unfortunately we aren't able to host your event on that date. Please do call us; we can often suggest a nearby date that works beautifully.",
    tone: "bad",
  },
  cancelled: {
    label: "Withdrawn",
    headline: "This enquiry has been withdrawn",
    body: "No date is held and nothing was charged. If this was a mistake, or you'd like to try another date, just send us a new enquiry.",
    tone: "bad",
  },
};

const TONE_STYLES = {
  pending: { ring: "border-gold/30 bg-gold/[0.06]", icon: Clock, iconTone: "text-gold" },
  good: { ring: "border-gold/40 bg-gold/[0.09]", icon: Sparkles, iconTone: "text-gold" },
  done: { ring: "border-green-600/25 bg-green-50", icon: CheckCircle2, iconTone: "text-green-700" },
  bad: { ring: "border-ink/12 bg-cream-dark", icon: XCircle, iconTone: "text-warm-500" },
} as const;

/** The four steps, so a family can see where they are in the process. */
const STEPS = ["pending", "reviewing", "approved", "confirmed"] as const;

async function getEnquiry(reference: string): Promise<Enquiry | null> {
  try {
    const res = await fetch(
      `${API_BASE_URL}/hall-enquiries/reference/${encodeURIComponent(reference)}`,
      { cache: "no-store" }
    );
    const json = await res.json();
    return json.success ? json.data : null;
  } catch {
    return null;
  }
}

function formatDate(value?: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function EnquiryStatusPage({
  params,
}: {
  params: { reference: string };
}) {
  const [enquiry, hallData] = await Promise.all([getEnquiry(params.reference), getTheHall()]);

  if (!enquiry) {
    return (
      <PropertyUnavailable
        title="We can't find that enquiry"
        message="Check the reference from your confirmation email — it looks like 7VH-XXXXXXXX. If it still doesn't work, call us and we'll look it up for you."
        retryHref={`/marriage-hall/enquiry/${params.reference}`}
        contactPhone={hallData?.hall.contactPhone}
        icon={CalendarHeart}
      />
    );
  }

  const copy = STATUS_COPY[enquiry.status] || STATUS_COPY.pending;
  const tone = TONE_STYLES[copy.tone];
  const ToneIcon = tone.icon;

  const stepIndex = STEPS.indexOf(enquiry.status as (typeof STEPS)[number]);
  const isClosed = enquiry.status === "declined" || enquiry.status === "cancelled";
  const phone = hallData?.hall.contactPhone;

  return (
    <div className="section bg-cream">
      <div className="container-luxe">
        <PageHeader
          eyebrow="Your enquiry"
          title={enquiry.enquiryReference}
          lead={`For ${enquiry.guestName} · ${enquiry.eventType}`}
          crumbs={[
            { label: "Marriage Hall", href: "/marriage-hall" },
            { label: "Your enquiry" },
          ]}
        />

        <div className="mx-auto max-w-3xl">
          {/* ── Status ── */}
          <Reveal>
            <div className={`rounded-luxe border px-7 py-9 text-center sm:px-12 ${tone.ring}`}>
              <span className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-white/70">
                <ToneIcon size={24} strokeWidth={1.5} className={tone.iconTone} />
              </span>
              <p className="meta">{copy.label}</p>
              <h2 className="section-title !text-display-sm mt-2">{copy.headline}</h2>
              <p className="lead mx-auto mt-4 max-w-prose">{copy.body}</p>
            </div>
          </Reveal>

          {/* ── Progress ── */}
          {!isClosed && (
            <Reveal delay={0.1} className="mt-10">
              <ol className="grid grid-cols-4 gap-2">
                {STEPS.map((step, i) => {
                  const done = stepIndex >= i;
                  const current = stepIndex === i;
                  return (
                    <li key={step} className="text-center">
                      <span
                        className={`mx-auto flex h-9 w-9 items-center justify-center rounded-full border text-xs transition-colors ${
                          done
                            ? "border-gold bg-gold text-ink"
                            : "border-ink/15 text-warm-400"
                        }`}
                      >
                        {done ? <CheckCircle2 size={14} /> : i + 1}
                      </span>
                      <span
                        className={`mt-2 block text-[10px] uppercase tracking-luxe ${
                          current ? "text-ink" : "text-warm-400"
                        }`}
                      >
                        {STATUS_COPY[step].label}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </Reveal>
          )}

          {/* ── What they asked for ── */}
          <Reveal delay={0.15} className="mt-10">
            <div className="card-luxe overflow-hidden">
              <div className="border-b border-ink/[0.07] px-7 py-5">
                <h3 className="card-title">Your celebration</h3>
              </div>
              <dl className="divide-y divide-ink/[0.05]">
                <Row label="Occasion" value={enquiry.eventType} />
                <Row label="Preferred date" value={formatDate(enquiry.eventDate)} />
                {enquiry.alternateDate && (
                  <Row label="Alternate date" value={formatDate(enquiry.alternateDate)} />
                )}
                <Row
                  label="Expected guests"
                  value={enquiry.guestCount.toLocaleString("en-IN")}
                />
                {enquiry.packageName && <Row label="Package" value={enquiry.packageName} />}
                {enquiry.decorationThemeName && (
                  <Row label="Decoration" value={enquiry.decorationThemeName} />
                )}
                {enquiry.cateringPreference && (
                  <Row label="Catering" value={enquiry.cateringPreference} />
                )}
                {enquiry.specialRequirements && (
                  <Row label="Your notes" value={enquiry.specialRequirements} wrap />
                )}
              </dl>
            </div>
          </Reveal>

          {/* ── Money note. Only while nothing is confirmed. ── */}
          {!isClosed && enquiry.status !== "confirmed" && (
            <Reveal delay={0.2} className="mt-6">
              <p className="rounded-luxe border border-ink/10 bg-white px-6 py-5 text-center text-sm font-light leading-relaxed text-warm-600">
                No payment has been taken, and nothing is owed. Any advance is discussed in person
                once you have decided.
              </p>
            </Reveal>
          )}

          {/* ── Actions ── */}
          <Reveal delay={0.25} className="mt-10">
            <div className="flex flex-wrap items-center justify-center gap-4">
              {phone && (
                <a href={`tel:${phone.replace(/\s/g, "")}`} className="btn-primary group">
                  <Phone size={14} />
                  Call {phone}
                </a>
              )}

              {enquiry.status === "declined" || enquiry.status === "cancelled" ? (
                <Link href="/marriage-hall/availability" className="btn-outline group">
                  <CalendarCheck size={14} />
                  Try another date
                  <ArrowRight size={14} className="btn-arrow" />
                </Link>
              ) : (
                <Link href="/marriage-hall" className="btn-outline group">
                  Back to the venue
                  <ArrowRight size={14} className="btn-arrow" />
                </Link>
              )}
            </div>

            {/* Withdrawal is only offered while it is still possible. The API
                refuses it once confirmed, so showing the button then would just
                produce an error. */}
            {["pending", "reviewing", "approved"].includes(enquiry.status) && (
              <div className="mt-8 text-center">
                <CancelEnquiryButton
                  reference={enquiry.enquiryReference}
                  guestEmail={enquiry.guestEmail}
                />
              </div>
            )}
          </Reveal>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, wrap }: { label: string; value: string; wrap?: boolean }) {
  return (
    <div className="flex flex-col gap-1 px-7 py-4 sm:flex-row sm:items-start sm:gap-6">
      <dt className="meta w-40 shrink-0">{label}</dt>
      <dd
        className={`min-w-0 text-[0.9375rem] font-light text-ink ${
          wrap ? "whitespace-pre-line" : ""
        }`}
      >
        {value}
      </dd>
    </div>
  );
}
