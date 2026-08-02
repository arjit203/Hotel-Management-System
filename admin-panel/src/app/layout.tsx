import type { Metadata, Viewport } from "next";
import Providers from "@/components/Providers";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "7 Vachan — Admin Console",
    template: "%s · 7 Vachan Admin",
  },
  description: "Back-office admin console for 7 Vachan",
  // The admin panel is behind auth and must never be indexed — unlike the
  // public site, where unique indexable metadata is a hard requirement.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
