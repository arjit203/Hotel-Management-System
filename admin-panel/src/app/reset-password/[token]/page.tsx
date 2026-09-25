"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AlertCircle, ArrowLeft, CheckCircle2, Eye, EyeOff, Lock } from "lucide-react";
import Button from "@/components/ui/Button";
import { TextInput } from "@/components/ui/Field";
import { adminApi, formatApiError } from "@/lib/api";

/**
 * Target of the emailed admin reset link: `${ADMIN_PANEL_URL}/reset-password/<token>`
 * (built in `forgotPasswordGeneric`, auth.service.ts). Until this page existed
 * the link returned a 404.
 *
 * Calls POST /auth/admin/reset-password/:token. Rules mirror
 * `resetPasswordSchema` in auth.validation.ts; the server re-validates anyway.
 */
export default function AdminResetPasswordPage() {
  const { token } = useParams<{ token: string }>();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8 || !/[A-Z]/.test(password) || !/\d/.test(password)) {
      setError("Use at least 8 characters, with one uppercase letter and one number.");
      return;
    }
    if (password !== confirm) {
      setError("The two passwords don't match.");
      return;
    }

    setIsSubmitting(true);
    const res = await adminApi.post(`/auth/admin/reset-password/${encodeURIComponent(token)}`, {
      password,
    });
    setIsSubmitting(false);

    if (!res.success) {
      setError(formatApiError(res));
      return;
    }
    setDone(true);
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

        <h1 className="mt-8 text-2xl font-semibold tracking-tight text-ink-900">Choose a new password</h1>

        {done ? (
          <div className="mt-6 space-y-4">
            <p className="flex items-start gap-2 rounded-md border border-line bg-white p-4 text-sm text-ink-700">
              <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-brand-600" />
              Your password has been reset. You can sign in with it now.
            </p>
            <Link
              href="/login"
              className="inline-flex w-full items-center justify-center rounded-md bg-ink-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-ink-800"
            >
              Go to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {error && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-md border border-danger-100 bg-danger-50 px-3 py-2.5"
              >
                <AlertCircle size={15} className="mt-0.5 shrink-0 text-danger-600" />
                <p className="whitespace-pre-line text-sm text-danger-700">{error}</p>
              </div>
            )}

            <TextInput
              label="New password"
              type={showPassword ? "text" : "password"}
              required
              autoComplete="new-password"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              leading={<Lock size={15} />}
              hint="At least 8 characters, one uppercase letter and one number."
              trailing={
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="pointer-events-auto text-ink-400 hover:text-ink-700"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              }
            />

            <TextInput
              label="Confirm new password"
              type={showPassword ? "text" : "password"}
              required
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              leading={<Lock size={15} />}
            />

            <Button type="submit" variant="primary" size="lg" fullWidth loading={isSubmitting}>
              {isSubmitting ? "Saving…" : "Reset password"}
            </Button>
          </form>
        )}

        <Link
          href="/forgot-password"
          className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-ink-600 hover:text-ink-900"
        >
          <ArrowLeft size={14} /> Link expired? Request a new one
        </Link>
      </div>
    </main>
  );
}
