"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Mail } from "lucide-react";
import Button from "@/components/ui/Button";
import { TextInput } from "@/components/ui/Field";
import { adminApi } from "@/lib/api";

/**
 * Admin "forgot password".
 *
 * Calls POST /auth/admin/forgot-password, which emails a time-limited link to
 * `${ADMIN_PANEL_URL}/reset-password/<token>`. The endpoint always answers with
 * the same generic message whether or not the email exists (no account
 * enumeration), so this page never claims the account was found.
 */
export default function AdminForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    const res = await adminApi.post("/auth/admin/forgot-password", { email });
    setIsSubmitting(false);
    setNotice(res.message || "If an account with that email exists, a reset link has been sent.");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface-sunken px-5 py-10">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-ink-900 text-sm font-bold text-white">
            7V
          </span>
          <div>
            <p className="text-base font-semibold text-ink-900">7 Vachan</p>
            <p className="text-xs text-ink-500">Admin Console</p>
          </div>
        </div>

        <h1 className="mt-8 text-2xl font-semibold tracking-tight text-ink-900">Reset your password</h1>

        {notice ? (
          <div className="mt-6 rounded-md border border-line bg-white p-4">
            <p className="flex items-start gap-2 text-sm text-ink-700">
              <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-brand-600" />
              {notice} The link expires in 30 minutes.
            </p>
          </div>
        ) : (
          <>
            <p className="mt-1 text-base text-ink-500">
              Enter the email your account uses and we&apos;ll send you a reset link.
            </p>
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <TextInput
                label="Email"
                type="email"
                required
                autoComplete="username"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                leading={<Mail size={15} />}
                placeholder="you@7vachan.com"
              />
              <Button type="submit" variant="primary" size="lg" fullWidth loading={isSubmitting}>
                {isSubmitting ? "Sending…" : "Send reset link"}
              </Button>
            </form>
          </>
        )}

        <Link
          href="/login"
          className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-ink-600 hover:text-ink-900"
        >
          <ArrowLeft size={14} /> Back to sign in
        </Link>
      </div>
    </main>
  );
}
