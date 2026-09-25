"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Check, Loader2 } from "lucide-react";
import Alert from "@/components/ui/Alert";
import { api } from "@/lib/api";
import AuthField from "@/components/auth/AuthField";

/**
 * The page behind the emailed reset link (`${FRONTEND_URL}/reset-password/<token>`).
 *
 * The backend has always sent this link and exposed
 * POST /auth/user/reset-password/:token, but no page existed, so every reset
 * email led to a 404. Rules mirror `resetPasswordSchema` in auth.validation.ts
 * (the same ones SignupForm shows), so the guest isn't told what's wrong only
 * after a round-trip.
 */
export default function ResetPasswordForm({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const rules = useMemo(
    () => [
      { label: "At least 8 characters", met: password.length >= 8 },
      { label: "One uppercase letter", met: /[A-Z]/.test(password) },
      { label: "One number", met: /\d/.test(password) },
    ],
    [password]
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!rules.every((r) => r.met)) {
      setError("Your new password doesn't meet all the requirements yet.");
      return;
    }
    if (password !== confirm) {
      setError("The two passwords don't match.");
      return;
    }

    setSubmitting(true);
    const res = await api.post(`/auth/user/reset-password/${encodeURIComponent(token)}`, { password });
    setSubmitting(false);

    if (!res.success) {
      setError(res.message || "This reset link is invalid or has expired.");
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <div className="text-center">
        <span className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-gold/15">
          <Check size={22} strokeWidth={1.5} className="text-gold-light" />
        </span>
        <p className="font-display text-xl text-cream">Password updated</p>
        <p className="mt-3 text-base font-light leading-relaxed text-cream/75">
          You can now sign in with your new password.
        </p>
        <Link
          href="/login"
          className="mt-8 flex w-full items-center justify-center rounded-xl bg-gold px-6 py-4
                     text-base font-medium text-ink shadow-gold transition-all duration-400 ease-luxe
                     hover:bg-gold-light active:scale-[0.99]"
        >
          Go to Login
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <AuthField
          label="New Password"
          value={password}
          onChange={setPassword}
          placeholder="Choose a new password"
          autoComplete="new-password"
          required
          reveal
        />
        <ul className="mt-3 space-y-1.5">
          {rules.map((rule) => (
            <li
              key={rule.label}
              className={`flex items-center gap-2 text-sm font-light transition-colors duration-300 ${
                rule.met ? "text-gold-light" : "text-cream/65"
              }`}
            >
              <span
                aria-hidden="true"
                className={`h-1.5 w-1.5 rounded-full transition-colors duration-300 ${
                  rule.met ? "bg-gold" : "bg-cream/25"
                }`}
              />
              {rule.label}
            </li>
          ))}
        </ul>
      </div>

      <AuthField
        label="Confirm Password"
        value={confirm}
        onChange={setConfirm}
        placeholder="Type it again"
        autoComplete="new-password"
        required
        reveal
      />

      {error && <Alert variant="dark">{error}</Alert>}

      <button
        type="submit"
        disabled={submitting}
        className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-gold px-6 py-4
                   text-base font-medium text-ink shadow-gold
                   transition-all duration-400 ease-luxe
                   hover:bg-gold-light active:scale-[0.99] disabled:opacity-60"
      >
        {submitting ? (
          <>
            <Loader2 size={16} className="animate-spin" /> Updating Password
          </>
        ) : (
          "Set New Password"
        )}
      </button>

      <p className="text-center text-[0.9375rem] font-light text-cream/75">
        Link expired?{" "}
        <Link
          href="/login"
          className="font-normal text-gold-light underline-offset-4 transition-colors hover:text-gold hover:underline"
        >
          Request a new one
        </Link>
      </p>
    </form>
  );
}
