"use client";

import { Printer, Mail, Copy, Check } from "lucide-react";
import { useState } from "react";

/**
 * Invoice actions on the confirmation page.
 *
 * Scope note — read before "fixing" this:
 *
 * • Print / Save as PDF uses `window.print()` against the print stylesheet in
 *   globals.css. Every desktop browser exposes "Save as PDF" as a print
 *   destination, so this covers both the print and the download ask with zero
 *   added weight. The alternative — bundling jsPDF/html2canvas — is ~200KB of
 *   client JS on a page whose whole job is to render once, which directly
 *   conflicts with the performance requirement. It is deliberately ONE button
 *   labelled for both outcomes rather than two buttons doing the same thing.
 *
 * • Email a copy is a `mailto:` addressed to the guest's own inbox, prefilled
 *   with the reference. There is NO server endpoint to re-send an invoice: the
 *   backend emails the confirmation exactly once, inside verifyPayment() in
 *   booking.service.ts, and exposes no resend/invoice route. Wiring a button to
 *   a non-existent endpoint would either fail silently or fake a success toast,
 *   so it hands off to the guest's mail client instead. A real server-side
 *   resend needs a new endpoint (out of scope this phase).
 */
export default function InvoiceActions({
  bookingReference,
  guestEmail,
  hotelName,
}: {
  bookingReference: string;
  guestEmail: string;
  hotelName: string;
}) {
  const [copied, setCopied] = useState(false);

  const mailtoHref =
    `mailto:${encodeURIComponent(guestEmail)}` +
    `?subject=${encodeURIComponent(`Booking confirmation — ${hotelName} (${bookingReference})`)}` +
    `&body=${encodeURIComponent(
      `Booking reference: ${bookingReference}\n\n` +
        `Keep this reference handy at check-in. You can view the full confirmation at:\n` +
        `${typeof window !== "undefined" ? window.location.href : ""}\n`
    )}`;

  async function copyReference() {
    try {
      await navigator.clipboard.writeText(bookingReference);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be blocked (insecure origin, permissions) — the reference
      // is displayed on screen regardless, so fail quietly.
    }
  }

  return (
    <div className="no-print flex flex-wrap items-center justify-center gap-3">
      <button onClick={() => window.print()} className="btn-primary group">
        <Printer size={15} /> Print / Save As PDF
      </button>

      <a href={mailtoHref} className="btn-outline group">
        <Mail size={15} /> Email A Copy
      </a>

      <button onClick={copyReference} className="btn-outline group">
        {copied ? <Check size={15} /> : <Copy size={15} />}
        {copied ? "Copied" : "Copy Reference"}
      </button>
    </div>
  );
}
