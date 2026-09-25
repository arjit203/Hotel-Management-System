import type { Metadata } from "next";

// The page is a client component, so its metadata lives here. Per-guest data —
// never indexed.
export const metadata: Metadata = {
  title: "My Bookings",
  robots: { index: false, follow: false },
};

export default function MyBookingsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
