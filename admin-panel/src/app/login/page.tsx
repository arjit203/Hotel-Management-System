"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Eye, EyeOff, Lock, Mail, ShieldCheck } from "lucide-react";
import Button from "@/components/ui/Button";
import { TextInput } from "@/components/ui/Field";
import { adminApi, formatApiError, setToken, setStoredAdmin } from "@/lib/api";
import { useAdminSession } from "@/lib/adminSession";

/**
 * Admin sign-in.
 *
 * Unchanged behaviour: POST /auth/admin/login, store the token + admin blob,
 * then land on the dashboard. There is deliberately no signup link — admins are
 * provisioned internally, and the backend exposes no admin signup route.
 */
export default function AdminLoginPage() {
  const router = useRouter();
  const { refresh } = useAdminSession();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const res = await adminApi.post<{
      token: string;
      admin: { id?: string; name: string; email: string; role: string };
    }>("/auth/admin/login", { email, password });

    setIsSubmitting(false);

    if (!res.success || !res.data) {
      setError(formatApiError(res));
      return;
    }

    setToken(res.data.token);
    setStoredAdmin(res.data.admin);
    // Tell the session provider immediately so the shell doesn't bounce back
    // to /login before it re-reads localStorage.
    refresh();
    router.push("/");
  }

  return (
    <main className="flex min-h-screen bg-surface-sunken">
      {/* Form column */}
      <div className="flex w-full flex-col justify-center px-5 py-10 sm:px-10 lg:w-[46%] lg:px-16">
        <div className="mx-auto w-full max-w-sm">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-ink-900 text-sm font-bold text-white">
              7V
            </span>
            <div>
              <p className="text-base font-semibold text-ink-900">7 Vachan</p>
              <p className="text-xs text-ink-500">Admin Console</p>
            </div>
          </div>

          <h1 className="mt-8 text-2xl font-semibold tracking-tight text-ink-900">Sign in</h1>
          <p className="mt-1 text-base text-ink-500">
            Use the credentials issued to you. Accounts are provisioned internally.
          </p>

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

            <TextInput
              label="Password"
              type={showPassword ? "text" : "password"}
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              leading={<Lock size={15} />}
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

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              loading={isSubmitting}
              className="mt-1"
            >
              {isSubmitting ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          <p className="mt-6 flex items-start gap-2 text-xs text-ink-500">
            <ShieldCheck size={14} className="mt-px shrink-0" />
            Repeated failed attempts are rate-limited. Ask a Super Admin if you need a password
            reset.
          </p>
        </div>
      </div>

      {/* Context column — hidden on small screens */}
      <aside className="hidden flex-1 items-center justify-center border-l border-line bg-white px-12 lg:flex">
        <div className="max-w-md">
          <h2 className="text-xl font-semibold tracking-tight text-ink-900">
            One console, every property
          </h2>
          <p className="mt-2 text-base text-ink-600">
            Rooms, menus, reservations, media and reviews for the Hotel and Restaurant verticals —
            with Marriage Hall to follow.
          </p>

          <ul className="mt-7 space-y-4">
            <Feature
              title="Bookings and reservations in one place"
              detail="Arrivals, covers and payment state, filtered the way you actually work."
            />
            <Feature
              title="Content that matches the public site"
              detail="Gallery, offers, FAQs and review moderation for each property."
            />
            <Feature
              title="Availability you can reason about"
              detail="Bookable rooms are computed live — no schedules to pre-generate."
            />
          </ul>
        </div>
      </aside>
    </main>
  );
}

function Feature({ title, detail }: { title: string; detail: string }) {
  return (
    <li className="flex gap-3">
      <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
        <ShieldCheck size={12} />
      </span>
      <span>
        <span className="block text-base font-medium text-ink-800">{title}</span>
        <span className="block text-sm text-ink-500">{detail}</span>
      </span>
    </li>
  );
}
