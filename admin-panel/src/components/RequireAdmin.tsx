"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { useAdminSession } from "@/lib/adminSession";
import { useShellUi } from "@/lib/shellUi";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";

/**
 * Auth gate + application shell.
 *
 * Kept as the same default export every page already wraps itself in, so no
 * page had to change its structure during the redesign. What changed is what it
 * renders: the old inline header is now a permanent sidebar + sticky topbar.
 *
 * This is UX only. Authorization is enforced server-side on every request by
 * `authenticate("admin")` and `requireRole(...)`; hiding a page here does not
 * protect the endpoint behind it, and RBAC is never re-implemented client-side.
 */
export default function RequireAdmin({
  children,
  /** Opt out of the max-width page shell (used by full-bleed views). */
  bleed = false,
}: {
  children: React.ReactNode;
  bleed?: boolean;
}) {
  const router = useRouter();
  const { admin, ready, isAuthenticated } = useAdminSession();
  const { sidebarCollapsed, toggleSidebar, mobileNavOpen, openMobileNav, closeMobileNav } =
    useShellUi();

  useEffect(() => {
    if (ready && !isAuthenticated) router.replace("/login");
  }, [ready, isAuthenticated, router]);

  if (!ready || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-sunken">
        <div className="flex items-center gap-2.5 text-ink-500">
          <Loader2 size={17} className="animate-spin" />
          <span className="text-base">Loading your console…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-sunken">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggleCollapsed={toggleSidebar}
        mobileOpen={mobileNavOpen}
        onCloseMobile={closeMobileNav}
      />

      <div
        className={cn(
          "flex min-h-screen flex-col transition-[padding] duration-150",
          sidebarCollapsed ? "lg:pl-16" : "lg:pl-64"
        )}
      >
        <Topbar admin={admin} onOpenMobileNav={openMobileNav} />
        <main className={cn("flex-1", bleed ? "p-4 sm:p-6" : "page-shell")}>{children}</main>
      </div>
    </div>
  );
}
