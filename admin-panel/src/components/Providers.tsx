"use client";

import { AdminSessionProvider } from "@/lib/adminSession";
import { BusinessProvider } from "@/lib/businessContext";
import { ShellUiProvider } from "@/lib/shellUi";
import { SummaryProvider } from "@/lib/summary";
import { NotificationProvider } from "@/lib/notifications";
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
          {/* Sits beside Summary rather than inside it: the bell polls on its
              own schedule and must not restart whenever summary data reloads. */}
          <NotificationProvider>
            <ShellUiProvider>
              <ToastProvider>
                <ConfirmProvider>{children}</ConfirmProvider>
              </ToastProvider>
            </ShellUiProvider>
          </NotificationProvider>
        </SummaryProvider>
      </BusinessProvider>
    </AdminSessionProvider>
  );
}
