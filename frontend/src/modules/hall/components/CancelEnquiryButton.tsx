"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CircleAlert, X } from "lucide-react";
import { api } from "@/lib/api";
import { getUserToken } from "@/lib/userAuth";

/**
 * Withdraws an enquiry from the status page.
 *
 * The API proves ownership by matching the email the enquiry was made with, or
 * the signed-in account that made it — the reference alone is shareable, so it
 * is never treated as authorisation. The page only shows a masked address, so
 * the guest types their email here (as on the restaurant's cancel button), and
 * a signed-in guest's token is sent alongside it.
 *
 * Deliberately understated: a family who is mid-conversation should not have a
 * prominent red button inviting them to cancel.
 */
export default function CancelEnquiryButton({ reference }: { reference: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guestEmail, setGuestEmail] = useState("");

  async function handleCancel() {
    const token = getUserToken();
    const email = guestEmail.trim();
    if (!email && !token) {
      setError("Please enter the email address you used for this enquiry.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const res = await api.put(
      `/hall-enquiries/reference/${encodeURIComponent(reference)}/cancel`,
      {
        guestEmail: email || undefined,
        cancellationReason: "Withdrawn by the guest from the enquiry page.",
      },
      { headers: token ? { Authorization: `Bearer ${token}` } : {} }
    );

    setSubmitting(false);

    if (!res.success) {
      setError(res.message || "We couldn't withdraw this just now. Please call us instead.");
      return;
    }

    // Server Component page — refresh re-fetches and re-renders with the new
    // status rather than us patching local state.
    router.refresh();
  }

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="text-xs uppercase tracking-luxe text-warm-400 underline-offset-4 transition-colors hover:text-warm-600 hover:underline"
      >
        Withdraw this enquiry
      </button>
    );
  }

  return (
    <div className="mx-auto max-w-md rounded-luxe border border-ink/10 bg-white px-6 py-5">
      <p className="text-sm font-light leading-relaxed text-warm-600">
        Withdraw this enquiry? Nothing was charged, and you can always send a new one. If you just
        want to change the date, calling us is quicker.
      </p>

      <label className="field mt-4 block text-left">
        <span className="field-label">Email used for this enquiry</span>
        <input
          type="email"
          value={guestEmail}
          onChange={(e) => setGuestEmail(e.target.value)}
          autoComplete="email"
          className="field-line"
        />
      </label>

      {error && (
        <p className="mt-3 flex items-start gap-2 text-sm font-light text-red-700">
          <CircleAlert size={14} className="mt-0.5 shrink-0" />
          {error}
        </p>
      )}

      <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={() => setConfirming(false)}
          className="text-xs uppercase tracking-luxe text-warm-500 transition-colors hover:text-ink"
        >
          Keep it
        </button>
        <button
          onClick={handleCancel}
          disabled={submitting}
          className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-5 py-2.5
                     text-xs uppercase tracking-luxe text-red-700 transition-colors
                     hover:bg-red-100 disabled:opacity-50"
        >
          <X size={13} />
          {submitting ? "Withdrawing…" : "Yes, withdraw"}
        </button>
      </div>
    </div>
  );
}
