import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "7 Vachan",
  description: "Hotel, Marriage Hall & Restaurant — 7 Vachan",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
