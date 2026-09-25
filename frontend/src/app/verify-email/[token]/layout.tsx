import type { Metadata } from "next";

// The page is a client component, so its metadata lives here. A one-time token
// URL — never indexed.
export const metadata: Metadata = {
  title: "Verify Email",
  robots: { index: false, follow: false },
};

export default function VerifyEmailLayout({ children }: { children: React.ReactNode }) {
  return children;
}
