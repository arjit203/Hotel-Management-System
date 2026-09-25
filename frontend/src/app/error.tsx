"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RefreshCw } from "lucide-react";

/**
 * Root error boundary. Catches a render failure inside any page and keeps the
 * header and footer on screen, instead of Next's bare error text.
 */
export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="section bg-cream">
      <div className="container-luxe">
        <div className="mx-auto max-w-2xl pt-10 text-center sm:pt-16">
          <p className="section-eyebrow flex justify-center">Something went wrong</p>
          <h1 className="page-title">We couldn&apos;t load this page</h1>
          <p className="lead mx-auto mt-6 max-w-prose">
            It&apos;s usually brief. Please try again in a moment, or head back to the home page.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <button type="button" onClick={() => reset()} className="btn-primary group">
              <RefreshCw size={14} />
              Try again
            </button>
            <Link href="/" className="btn-outline group">
              Back to home
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
