import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "7 Vachan — Luxury Hotel & Stays",
    template: "%s | 7 Vachan",
  },
  description: "7 Vachan Grand — a premium hotel experience with luxury rooms, fine dining, and warm hospitality in Satna.",
  openGraph: {
    siteName: "7 Vachan",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans bg-cream text-ink">
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  );
}
