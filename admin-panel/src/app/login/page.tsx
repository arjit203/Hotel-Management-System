"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { adminApi, setToken, setStoredAdmin } from "@/lib/api";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const res = await adminApi.post<{ token: string; admin: { name: string; email: string; role: string } }>(
      "/auth/admin/login",
      { email, password }
    );

    setIsSubmitting(false);

    if (!res.success) {
      setError(res.message || "Login failed.");
      return;
    }

    setToken(res.data!.token);
    setStoredAdmin(res.data!.admin);
    router.push("/");
  }

  return (
    <main
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{ width: 320, border: "1px solid #e5e5e5", padding: 24, borderRadius: 12 }}
      >
        <h2 style={{ marginTop: 0 }}>Admin Login</h2>
        {error && (
          <p style={{ color: "#c00", background: "#fee", padding: 8, borderRadius: 6, fontSize: 14 }}>
            {error}
          </p>
        )}
        <label style={{ display: "block", marginBottom: 12 }}>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ display: "block", width: "100%", padding: 8, marginTop: 4 }}
          />
        </label>
        <label style={{ display: "block", marginBottom: 16 }}>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ display: "block", width: "100%", padding: 8, marginTop: 4 }}
          />
        </label>
        <button
          type="submit"
          disabled={isSubmitting}
          style={{
            width: "100%",
            background: "#111",
            color: "#fff",
            border: "none",
            padding: 10,
            borderRadius: 6,
            cursor: "pointer",
          }}
        >
          {isSubmitting ? "Logging in..." : "Login"}
        </button>
      </form>
    </main>
  );
}
