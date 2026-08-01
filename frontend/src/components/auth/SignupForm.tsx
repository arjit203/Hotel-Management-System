"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertCircle, MailCheck, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import AuthField from "@/components/auth/AuthField";
import SocialPlaceholders from "@/components/auth/SocialPlaceholders";

/**
 * Signup form, styled for the dark glass card in the design reference.
 *
 * The API call is unchanged: POST /auth/user/signup, still omitting `phone`
 * entirely when blank (sending "" would fail the backend schema's min(10) rule).
 *
 * Added on the presentation side: a live password-requirement checklist
 * mirroring the backend's own rule (≥8 chars, one uppercase, one number, per
 * auth.validation.ts), so the guest isn't told what's wrong only after a failed
 * round-trip.
 */
export default function SignupForm() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const rules = useMemo(
    () => [
      { label: "At least 8 characters", met: form.password.length >= 8 },
      { label: "One uppercase letter", met: /[A-Z]/.test(form.password) },
      { label: "One number", met: /\d/.test(form.password) },
    ],
    [form.password]
  );
  const metCount = rules.filter((r) => r.met).length;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    // phone is optional on the backend (signupSchema) — omit it entirely if left
    // blank rather than sending an empty string (which would fail the schema's
    // min(10) check on that field).
    const res = await api.post("/auth/user/signup", {
      name: form.name,
      email: form.email,
      password: form.password,
      ...(form.phone.trim() ? { phone: form.phone.trim() } : {}),
    });

    setSubmitting(false);
    if (!res.success) {
      setError(
        res.message || (res.errors && res.errors[0]?.message) || "Signup failed. Please try again."
      );
      return;
    }
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="text-center">
        <span className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-gold/15">
          <MailCheck size={22} strokeWidth={1.5} className="text-gold-light" />
        </span>
        <p className="font-display text-xl text-cream">Check your email</p>
        <p className="mt-3 text-sm font-light leading-relaxed text-cream/60">
          We&apos;ve sent a verification link to <span className="text-cream">{form.email}</span>.
          Verify your account, then sign in.
        </p>
        <Link
          href="/login"
          className="mt-8 flex w-full items-center justify-center rounded-xl bg-gold px-6 py-3.5
                     text-[0.9375rem] font-medium text-ink shadow-gold transition-all
                     duration-400 ease-luxe hover:bg-gold-light"
        >
          Go To Login
        </Link>
      </div>
    );
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="space-y-5">
        <AuthField
          label="Full Name"
          value={form.name}
          onChange={(v) => setForm({ ...form, name: v })}
          placeholder="Enter your full name"
          required
          minLength={2}
          autoComplete="name"
        />
        <AuthField
          label="Email Address"
          type="email"
          value={form.email}
          onChange={(v) => setForm({ ...form, email: v })}
          placeholder="Enter your email"
          required
          autoComplete="email"
        />
        <AuthField
          label="Phone (optional)"
          type="tel"
          value={form.phone}
          onChange={(v) => setForm({ ...form, phone: v })}
          placeholder="Enter your phone number"
          autoComplete="tel"
        />
        <AuthField
          label="Password"
          value={form.password}
          onChange={(v) => setForm({ ...form, password: v })}
          placeholder="Create a password"
          required
          minLength={8}
          reveal
          autoComplete="new-password"
        />

        {/* Strength meter + checklist, shown once the guest starts typing. */}
        {form.password.length > 0 && (
          <div>
            <div className="flex gap-1.5" aria-hidden="true">
              {rules.map((_, i) => (
                <span
                  key={i}
                  className={`h-[3px] flex-1 rounded-full transition-colors duration-400 ${
                    i < metCount ? "bg-gold" : "bg-cream/15"
                  }`}
                />
              ))}
            </div>
            <ul className="mt-3 space-y-1.5">
              {rules.map((rule) => (
                <li
                  key={rule.label}
                  className={`flex items-center gap-2 text-xs font-light transition-colors duration-300 ${
                    rule.met ? "text-gold-light" : "text-cream/45"
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
        )}

        {error && (
          <p
            role="alert"
            className="flex items-start gap-2.5 rounded-xl border border-red-400/30 bg-red-500/15 px-4 py-3 text-sm font-light text-red-200"
          >
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-gold px-6 py-3.5
                     text-[0.9375rem] font-medium text-ink shadow-gold
                     transition-all duration-400 ease-luxe
                     hover:bg-gold-light active:scale-[0.99] disabled:opacity-60"
        >
          {submitting ? (
            <>
              <Loader2 size={16} className="animate-spin" /> Creating Account
            </>
          ) : (
            "Sign Up"
          )}
        </button>
      </form>

      <div className="mt-8">
        <SocialPlaceholders />
      </div>

      <p className="mt-8 text-center text-sm font-light text-cream/60">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-normal text-gold-light underline-offset-4 transition-colors hover:text-gold hover:underline"
        >
          Login
        </Link>
      </p>
    </div>
  );
}
