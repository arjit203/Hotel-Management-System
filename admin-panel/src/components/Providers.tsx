"use client";

import { AdminSessionProvider } from "@/lib/adminSession";
import { BusinessProvider } from "@/lib/businessContext";
import { ShellUiProvider } from "@/lib/shellUi";
import { SummaryProvider } from "@/lib/summary";
import { ConfirmProvider } from "@/components/ui/ConfirmDialog";
import { ToastProvider } from "@/components/ui/Toast";

/**
 * Every client-side provider, mounted once at the root layout.
 *
 * Order matters: session first (Business and Summary ask it whether to fetch),
 * then the data providers, then the UI providers that pages call into.
 *
 * Mounting here rather than inside <RequireAdmin> is deliberate — each page
 * renders its own RequireAdmin, so providers placed there would remount (and
 * refetch) on every navigation.
 */
export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AdminSessionProvider>
      <BusinessProvider>
        <SummaryProvider>
          <ShellUiProvider>
            <ToastProvider>
              <ConfirmProvider>{children}</ConfirmProvider>
            </ToastProvider>
          </ShellUiProvider>
        </SummaryProvider>
      </BusinessProvider>
    </AdminSessionProvider>
  );
}
