import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: false },
};

/** Root 404 — the site's own voice rather than Next's default page. */
export default function NotFound() {
  return (
    <main className="section bg-cream">
      <div className="container-luxe">
        <div className="mx-auto max-w-2xl pt-10 text-center sm:pt-16">
          <p className="section-eyebrow flex justify-center">Page not found</p>
          <h1 className="page-title">This door leads nowhere</h1>
          <p className="lead mx-auto mt-6 max-w-prose">
            The page you were looking for has moved or never existed. Everything else is exactly
            where you left it.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link href="/" className="btn-primary group">
              Back to home <ArrowRight size={14} className="btn-arrow" />
            </Link>
            <Link href="/hotel/rooms" className="btn-outline group">
              Explore rooms <ArrowRight size={14} className="btn-arrow" />
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
