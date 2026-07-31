"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api/v1";

export default function VerifyEmailPage() {
  const params = useParams();
  const token = params.token as string;
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  // Guards against React StrictMode (next.config.js has reactStrictMode: true)
  // double-invoking this effect in development, which would otherwise send
  // the verification request twice. The token is single-use on the backend
  // (cleared immediately after a successful verify), so the second call
  // always fails with "invalid or expired" even though the first one
  // succeeded — without this guard, that failing second response overwrites
  // the successful first one and the user sees a false error.
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    async function verify() {
      try {
        const res = await fetch(`${API_BASE_URL}/auth/user/verify-email/${token}`);
        const json = await res.json();
        if (json.success) {
          setStatus("success");
        } else {
          setStatus("error");
          setMessage(json.message || "This verification link is invalid or has expired.");
        }
      } catch {
        setStatus("error");
        setMessage("Something went wrong. Please try again.");
      }
    }
    verify();
  }, [token]);

  return (
    <main style={{ padding: "2rem", maxWidth: 420, margin: "0 auto", textAlign: "center" }}>
      {status === "loading" && <p>Verifying your email...</p>}
      {status === "success" && (
        <>
          <h1>Email Verified ✅</h1>
          <p>Your account is now verified. You can log in.</p>
          <Link href="/login">Go to Login</Link>
        </>
      )}
      {status === "error" && (
        <>
          <h1>Verification Failed</h1>
          <p style={{ color: "#c00" }}>{message}</p>
        </>
      )}
    </main>
  );
}
