"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Loader2, MailWarning } from "lucide-react";
import BookingSuccessMark from "@/modules/hotel/components/BookingSuccessMark";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api/v1";

/**
 * Presentation rebuild only. The verification request, its single-run guard and
 * the error handling are all unchanged.
 */
export default function VerifyEmailPage() {
  const params = useParams();
  const token = params.token as string;
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  // Guards against React StrictMode (next.config.js has reactStrictMode: true)
  // double-invoking this effect in development, which would otherwise send the
  // verification request twice. The token is single-use on the backend (cleared
  // immediately after a successful verify), so the second call always fails with
  // "invalid or expired" even though the first one succeeded — without this
  // guard, that failing second response overwrites the successful first one and
  // the user sees a false error.
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    async function verify() {
      try {
        const res = await fetch(`${API_BASE_URL}/auth/user/verify-email/${token}`);
        const json = await res.json();
        if (json.success) {
          setStatus("success");
        } else {
          setStatus("error");
          setMessage(json.message || "This verification link is invalid or has expired.");
        }
      } catch {
        setStatus("error");
        setMessage("Something went wrong. Please try again.");
      }
    }
    verify();
  }, [token]);

  return (
    <main className="container-luxe flex min-h-[60vh] max-w-lg items-center justify-center pb-24 pt-16">
      <div className="card-luxe w-full px-8 py-14 text-center sm:px-12">
        {status === "loading" && (
          <>
            <Loader2 size={30} strokeWidth={1.5} className="mx-auto animate-spin text-gold" />
            <h1 className="card-title mt-7">Verifying your email</h1>
            <p className="body-muted mt-3">This will only take a moment.</p>
          </>
        )}

        {status === "success" && (
          <>
            <BookingSuccessMark />
            <p className="section-eyebrow mt-7 flex justify-center">Verified</p>
            <h1 className="font-display text-display-sm font-normal text-ink">You&apos;re all set</h1>
            <p className="body-muted mx-auto mt-4 max-w-sm">
              Your account is verified. Sign in to manage your bookings and receive private offers.
            </p>
            <Link href="/login" className="btn-primary group mt-9">
              Sign In <ArrowRight size={14} className="btn-arrow" />
            </Link>
          </>
        )}

        {status === "error" && (
          <>
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-red-200 bg-red-50">
              <MailWarning size={24} strokeWidth={1.5} className="text-red-600" />
            </span>
            <h1 className="card-title mt-7">Verification failed</h1>
            <p className="body-muted mt-3">{message}</p>
            {/* The link is single-use, so "already verified" is the most common
                cause of landing here — point at sign-in rather than a dead end. */}
            <p className="body-muted mt-4">
              If you&apos;ve already verified this address, you can simply sign in.
            </p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <Link href="/login" className="btn-primary group">
                Sign In <ArrowRight size={14} className="btn-arrow" />
              </Link>
              <Link href="/hotel/contact" className="btn-outline group">
                Contact Us
              </Link>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
