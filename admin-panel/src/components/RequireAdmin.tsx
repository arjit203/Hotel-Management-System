"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getStoredAdmin, clearToken } from "@/lib/api";

export default function RequireAdmin({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [admin, setAdmin] = useState<{ name: string; email: string; role: string } | null>(null);

  useEffect(() => {
    const stored = getStoredAdmin();
    const token = typeof window !== "undefined" ? localStorage.getItem("admin_token") : null;

    if (!stored || !token) {
      router.replace("/login");
      return;
    }
    setAdmin(stored);
    setReady(true);
  }, [router]);

  if (!ready) return <p style={{ padding: 24 }}>Loading...</p>;

  return (
    <div>
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "12px 24px",
          borderBottom: "1px solid #e5e5e5",
        }}
      >
        <strong>7 Vachan Admin</strong>
        <div>
          <span style={{ marginRight: 16, color: "#666" }}>
            {admin?.name} ({admin?.role})
          </span>
          <button
            onClick={() => {
              clearToken();
              router.push("/login");
            }}
            style={{
              background: "none",
              border: "1px solid #ccc",
              padding: "6px 12px",
              borderRadius: 6,
              cursor: "pointer",
            }}
          >
            Logout
          </button>
        </div>
      </header>
      <div style={{ padding: 24 }}>{children}</div>
    </div>
  );
}
