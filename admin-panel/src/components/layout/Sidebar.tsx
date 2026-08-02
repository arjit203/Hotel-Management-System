"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { useBusiness } from "@/lib/businessContext";
import { buildNavSections, isNavItemActive } from "./navigation";
import BusinessSelector from "./BusinessSelector";

interface Props {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  /** Mobile off-canvas state — ignored on lg and up, where the rail is permanent. */
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

/**
 * Permanent left rail on large screens, off-canvas drawer below `lg`.
 *
 * Collapsed mode keeps the icons and drops the labels (64px rail) so a dense
 * table can use the full width; the state is persisted by the shell.
 */
export default function Sidebar({ collapsed, onToggleCollapsed, mobileOpen, onCloseMobile }: Props) {
  const pathname = usePathname();
  const { business } = useBusiness();
  const sections = buildNavSections(business);

  // Built per-render for both surfaces: the permanent rail honours `collapsed`,
  // the mobile drawer is always full-width (a 64px drawer would be pointless).
  const renderRail = (collapsed: boolean) => (
    <div className="flex h-full flex-col bg-white">
      {/* Brand */}
      <div
        className={cn(
          "flex h-14 shrink-0 items-center gap-2.5 border-b border-line px-3",
          collapsed && "justify-center px-0"
        )}
      >
        <Link
          href="/"
          className="flex min-w-0 items-center gap-2.5"
          aria-label="7 Vachan Admin — dashboard"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ink-900 text-sm font-bold text-white">
            7V
          </span>
          {!collapsed && (
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-ink-900">7 Vachan</span>
              <span className="block truncate text-xs text-ink-500">Admin Console</span>
            </span>
          )}
        </Link>
        <button
          onClick={onCloseMobile}
          aria-label="Close navigation"
          className="btn-icon ml-auto lg:hidden"
        >
          <X size={17} />
        </button>
      </div>

      {/* Business selector */}
      <div className={cn("shrink-0 border-b border-line p-3", collapsed && "px-2")}>
        <BusinessSelector collapsed={collapsed} />
      </div>

      {/* Navigation */}
      <nav
        aria-label="Main navigation"
        className={cn("flex-1 overflow-y-auto px-3 pb-4", collapsed && "px-2")}
      >
        {sections.map((section, index) => (
          <div key={section.title ?? `top-${index}`}>
            {section.title &&
              (collapsed ? (
                <div className="mx-auto my-3 h-px w-6 bg-line" />
              ) : (
                <p className="nav-section-label">{section.title}</p>
              ))}
            <ul className={cn("space-y-0.5", !section.title && "pt-3")}>
              {section.items.map((item) => {
                const active = isNavItemActive(item, pathname);
                const Icon = item.icon;

                const inner = (
                  <>
                    <Icon size={16} className="shrink-0" />
                    {!collapsed && <span className="min-w-0 flex-1 truncate">{item.label}</span>}
                    {!collapsed && item.badge && (
                      <span className="shrink-0 rounded bg-surface-muted px-1.5 py-0.5 text-xs font-medium text-ink-500">
                        {item.badge}
                      </span>
                    )}
                  </>
                );

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onCloseMobile}
                      aria-current={active ? "page" : undefined}
                      title={collapsed ? item.label : undefined}
                      className={cn(
                        "nav-item",
                        active && "nav-item-active",
                        collapsed && "justify-center px-0"
                      )}
                    >
                      {inner}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Collapse toggle — desktop only */}
      <div className={cn("hidden shrink-0 border-t border-line p-3 lg:block", collapsed && "px-2")}>
        <button
          onClick={onToggleCollapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cn("nav-item w-full", collapsed && "justify-center px-0")}
        >
          {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Permanent rail */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-sidebar hidden border-r border-line transition-[width] duration-150 lg:block",
          collapsed ? "w-16" : "w-64"
        )}
      >
        {renderRail(collapsed)}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-drawer lg:hidden">
          <div
            className="absolute inset-0 animate-fade-in bg-ink-900/40"
            onClick={onCloseMobile}
            aria-hidden
          />
          <aside className="absolute inset-y-0 left-0 w-64 animate-slide-in-left border-r border-line shadow-xl">
            {renderRail(false)}
          </aside>
        </div>
      )}
    </>
  );
}
