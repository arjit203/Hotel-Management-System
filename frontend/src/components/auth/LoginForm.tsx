"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Check, Loader2 } from "lucide-react";
import Alert from "@/components/ui/Alert";
import { api } from "@/lib/api";
import { setUserToken, setStoredUser } from "@/lib/userAuth";
import AuthField from "@/components/auth/AuthField";
import SocialPlaceholders from "@/components/auth/SocialPlaceholders";
import { EASE_LUXE } from "@/components/motion/variants";

interface LoginResponseData {
  token: string;
  user: { id: string; name: string; email: string; role: string; isEmailVerified: boolean };
}

/**
 * Login form, styled for the dark glass card in the design reference.
 *
 * API calls are unchanged: POST /auth/user/login, and POST
 * /auth/user/forgot-password for the reset flow.
 *
 * Forgot-password is an inline mode of this same card rather than a new route.
 * The backend endpoint has existed since the Auth module was built but no
 * frontend ever called it, so the link would otherwise dead-end. Inline keeps
 * routing frozen, as required.
 */
export default function LoginForm() {
  const [mode, setMode] = useState<"login" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    const res = await api.post<LoginResponseData>("/auth/user/login", { email, password });

    setSubmitting(false);
    if (!res.success || !res.data) {
      setError(res.message || "Login failed. Please check your details.");
      return;
    }

    // `remember` only decides localStorage vs sessionStorage — see lib/userAuth.
    setUserToken(res.data.token, remember);
    setStoredUser(res.data.user, remember);
    window.location.href = "/";
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    const res = await api.post("/auth/user/forgot-password", { email });
    setSubmitting(false);

    // The API intentionally returns a generic message either way, to prevent
    // email enumeration — so surface it verbatim rather than inventing one.
    setNotice(res.message || "If an account with that email exists, a reset link has been sent.");
  }

  if (notice) {
    return (
      <div className="text-center">
        <span className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-gold/15">
          <Check size={22} strokeWidth={1.5} className="text-gold-light" />
        </span>
        <p className="font-display text-xl text-cream">Check your inbox</p>
        <p className="mt-3 text-sm font-light leading-relaxed text-cream/60">{notice}</p>
        <button
          onClick={() => {
            setNotice("");
            setMode("login");
          }}
          className="mt-8 inline-flex items-center gap-2 text-sm font-light text-gold-light transition-colors hover:text-gold"
        >
          <ArrowLeft size={14} /> Back to sign in
        </button>
      </div>
    );
  }

  return (
    <div>
      <form onSubmit={mode === "login" ? handleLogin : handleForgot} className="space-y-5">
        <AuthField
          label="Email Address"
          type="email"
          value={email}
          onChange={setEmail}
          placeholder="Enter your email"
          required
          autoComplete="email"
        />

        {/* Password + options collapse away in forgot-password mode. */}
        <AnimatePresence initial={false}>
          {mode === "login" && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.4, ease: EASE_LUXE }}
              className="overflow-hidden"
            >
              <div className="space-y-4 pt-1">
                <AuthField
                  label="Password"
                  value={password}
                  onChange={setPassword}
                  placeholder="Enter your password"
                  required
                  reveal
                  autoComplete="current-password"
                />

                <div className="flex items-center justify-between gap-4">
                  <label className="flex cursor-pointer items-center gap-2.5 text-[0.8125rem] font-light text-cream/65">
                    <span className="relative flex h-4 w-4 shrink-0 items-center justify-center">
                      <input
                        type="checkbox"
                        checked={remember}
                        onChange={(e) => setRemember(e.target.checked)}
                        className="peer h-4 w-4 cursor-pointer appearance-none rounded-sm border border-cream/35
                                   bg-transparent transition-colors duration-300
                                   checked:border-gold checked:bg-gold
                                   focus-visible:outline focus-visible:outline-2
                                   focus-visible:outline-offset-2 focus-visible:outline-gold"
                      />
                      <Check
                        size={11}
                        strokeWidth={3}
                        className="pointer-events-none absolute text-ink opacity-0 transition-opacity peer-checked:opacity-100"
                      />
                    </span>
                    Remember me
                  </label>

                  <button
                    type="button"
                    onClick={() => {
                      setMode("forgot");
                      setError("");
                    }}
                    className="text-[0.8125rem] font-light text-cream/70 underline-offset-4 transition-colors hover:text-gold-light hover:underline"
                  >
                    Forgot Password?
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {mode === "forgot" && (
          <p className="text-sm font-light leading-relaxed text-cream/60">
            Enter your email and we&apos;ll send a link to reset your password.
          </p>
        )}

        {error && (
          <Alert variant="dark">{error}</Alert>
        )}

        {/* Gold CTA, per the reference. Ink text rather than the reference's
            white: cream on this gold measures ~2.6:1 and fails AA, ink clears it. */}
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
              <Loader2 size={16} className="animate-spin" />
              {mode === "login" ? "Signing in" : "Sending"}
            </>
          ) : mode === "login" ? (
            "Login"
          ) : (
            "Send Reset Link"
          )}
        </button>

        {mode === "forgot" && (
          <button
            type="button"
            onClick={() => setMode("login")}
            className="mx-auto flex items-center gap-2 text-sm font-light text-cream/60 transition-colors hover:text-gold-light"
          >
            <ArrowLeft size={14} /> Back to sign in
          </button>
        )}
      </form>

      {mode === "login" && (
        <>
          <div className="mt-8">
            <SocialPlaceholders />
          </div>

          <p className="mt-8 text-center text-sm font-light text-cream/60">
            Don&apos;t have an account?{" "}
            <Link
              href="/signup"
              className="font-normal text-gold-light underline-offset-4 transition-colors hover:text-gold hover:underline"
            >
              Sign up
            </Link>
          </p>
        </>
      )}
    </div>
  );
}
