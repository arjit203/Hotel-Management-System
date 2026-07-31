"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { setUserToken, setStoredUser } from "@/lib/userAuth";

interface LoginResponseData {
  token: string;
  user: { id: string; name: string; email: string; role: string; isEmailVerified: boolean };
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    const res = await api.post<LoginResponseData>("/auth/user/login", { email, password });

    setSubmitting(false);
    if (!res.success || !res.data) {
      setError(res.message || "Login failed. Please check your details.");
      return;
    }

    setUserToken(res.data.token);
    setStoredUser(res.data.user);
    window.location.href = "/";
  }

  return (
    <main style={{ padding: "2rem", maxWidth: 420, margin: "0 auto" }}>
      <h1>Log In</h1>
      <form onSubmit={handleSubmit}>
        <label style={{ display: "block", marginBottom: 12 }}>
          Email
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ display: "block", width: "100%", padding: 8, marginTop: 4 }}
          />
        </label>
        <label style={{ display: "block", marginBottom: 12 }}>
          Password
          <input
            required
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ display: "block", width: "100%", padding: 8, marginTop: 4 }}
          />
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
          {submitting ? "Logging in..." : "Log In"}
        </button>
      </form>

      <p style={{ marginTop: 16, fontSize: 14 }}>
        Don&apos;t have an account? <Link href="/signup">Sign up</Link>
      </p>
    </main>
  );
}
