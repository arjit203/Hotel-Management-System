"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getStoredUser, clearUserToken, StoredUser } from "@/lib/userAuth";

export default function Header() {
  const [user, setUser] = useState<StoredUser | null>(null);

  // Read from localStorage only after mount — avoids server/client markup
  // mismatch, since the server has no access to the browser's localStorage.
  useEffect(() => {
    setUser(getStoredUser());
  }, []);

  function handleLogout() {
    clearUserToken();
    setUser(null);
    window.location.href = "/";
  }

  return (
    <header
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "16px 32px",
        borderBottom: "1px solid #eee",
      }}
    >
      <Link href="/" style={{ fontWeight: 700, fontSize: 18, textDecoration: "none", color: "#111" }}>
        7 Vachan
      </Link>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        {user ? (
          <>
            <span style={{ fontSize: 14, color: "#444" }}>Hi, {user.name}</span>
            <button
              onClick={handleLogout}
              style={{
                background: "none",
                border: "1px solid #ccc",
                borderRadius: 6,
                padding: "6px 12px",
                cursor: "pointer",
                fontSize: 14,
              }}
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <Link href="/login" style={{ fontSize: 14, textDecoration: "none", color: "#111" }}>
              Login
            </Link>
            <Link
              href="/signup"
              style={{
                fontSize: 14,
                textDecoration: "none",
                color: "#fff",
                background: "#111",
                padding: "6px 14px",
                borderRadius: 6,
              }}
            >
              Sign Up
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
