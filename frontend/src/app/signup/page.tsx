"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";

export default function SignupPage() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    // phone is optional on the backend (signupSchema) — omit it entirely if
    // left blank rather than sending an empty string (which would fail the
    // schema's min(10) check on that field).
    const res = await api.post("/auth/user/signup", {
      name: form.name,
      email: form.email,
      password: form.password,
      ...(form.phone.trim() ? { phone: form.phone.trim() } : {}),
    });

    setSubmitting(false);
    if (!res.success) {
      setError(res.message || (res.errors && res.errors[0]?.message) || "Signup failed. Please try again.");
      return;
    }
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <main style={{ padding: "2rem", maxWidth: 420, margin: "0 auto" }}>
        <h1>Check Your Email</h1>
        <p>
          We&apos;ve sent a verification link to <strong>{form.email}</strong>. Please verify your
          account, then <Link href="/login">log in</Link>.
        </p>
      </main>
    );
  }

  return (
    <main style={{ padding: "2rem", maxWidth: 420, margin: "0 auto" }}>
      <h1>Sign Up</h1>
      <form onSubmit={handleSubmit}>
        <label style={{ display: "block", marginBottom: 12 }}>
          Full Name
          <input
            required
            minLength={2}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            style={{ display: "block", width: "100%", padding: 8, marginTop: 4 }}
          />
        </label>
        <label style={{ display: "block", marginBottom: 12 }}>
          Email
          <input
            required
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            style={{ display: "block", width: "100%", padding: 8, marginTop: 4 }}
          />
        </label>
        <label style={{ display: "block", marginBottom: 12 }}>
          Phone (optional)
          <input
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            style={{ display: "block", width: "100%", padding: 8, marginTop: 4 }}
          />
        </label>
        <label style={{ display: "block", marginBottom: 12 }}>
          Password
          <input
            required
            type="password"
            minLength={8}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            style={{ display: "block", width: "100%", padding: 8, marginTop: 4 }}
          />
          <small style={{ color: "#888" }}>At least 8 characters, one uppercase letter, one number.</small>
        </label>

        {error && <p style={{ color: "#c00" }}>{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          style={{
            background: "#111",
            color: "#fff",
            border: "none",
            padding: "10px 20px",
            borderRadius: 6,
            cursor: "pointer",
          }}
        >
          {submitting ? "Creating account..." : "Sign Up"}
        </button>
      </form>

      <p style={{ marginTop: 16, fontSize: 14 }}>
        Already have an account? <Link href="/login">Log in</Link>
      </p>
    </main>
  );
}
