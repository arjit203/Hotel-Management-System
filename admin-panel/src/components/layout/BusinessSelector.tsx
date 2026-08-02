"use client";

import { useEffect, useRef, useState } from "react";
import { BedDouble, Check, ChevronsUpDown, Lock, PartyPopper, UtensilsCrossed } from "lucide-react";
import { cn } from "@/lib/cn";
import { BUSINESS_LABEL, useBusiness, type BusinessKey } from "@/lib/businessContext";

const ICON: Record<BusinessKey, typeof BedDouble> = {
  hotel: BedDouble,
  restaurant: UtensilsCrossed,
  hall: PartyPopper,
};

const ORDER: BusinessKey[] = ["hotel", "restaurant", "hall"];

/**
 * Vertical + property switcher.
 *
 * Two levels, because the backend is multi-tenant by mandate even though only
 * one property exists today: pick the business (Hotel / Restaurant), then the
 * property within it. When a vertical has a single property the property list
 * is still shown — adding a second one must not require a UI change.
 *
 * Marriage Hall is rendered but locked: there is no `/api/v1/admin/halls`
 * module yet, so selecting it would have nothing to show.
 */
export default function BusinessSelector({ collapsed = false }: { collapsed?: boolean }) {
  const { business, setBusiness, hotels, restaurants, activeProperty, setActivePropertyId, loading } =
    useBusiness();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const CurrentIcon = ICON[business];
  const propertyCount = business === "restaurant" ? restaurants.length : hotels.length;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        title={collapsed ? `${BUSINESS_LABEL[business]} — switch business` : undefined}
        className={cn(
          "flex w-full items-center gap-2.5 rounded-lg border border-line bg-white px-2.5 py-2 text-left transition-colors hover:bg-surface-hover",
          collapsed && "justify-center px-0"
        )}
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-brand-600 text-white">
          <CurrentIcon size={15} />
        </span>
        {!collapsed && (
          <>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-ink-800">
                {BUSINESS_LABEL[business]}
              </span>
              <span className="block truncate text-xs text-ink-500">
                {loading ? "Loading…" : activeProperty?.name || "No property yet"}
              </span>
            </span>
            <ChevronsUpDown size={14} className="shrink-0 text-ink-400" />
          </>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className={cn(
            "absolute left-0 z-drawer mt-1 w-64 animate-scale-in overflow-hidden rounded-lg border border-line bg-white py-1 shadow-lg",
            collapsed && "left-full ml-2 mt-0 top-0"
          )}
        >
          <p className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-ink-400">
            Business
          </p>
          {ORDER.map((key) => {
            const Icon = ICON[key];
            const isCurrent = key === business;
            const isLocked = key === "hall";
            return (
              <button
                key={key}
                type="button"
                role="menuitem"
                disabled={isLocked}
                onClick={() => {
                  setBusiness(key);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-2.5 px-3 py-2 text-left text-base transition-colors",
                  isLocked
                    ? "cursor-not-allowed text-ink-400"
                    : "text-ink-700 hover:bg-surface-muted hover:text-ink-800"
                )}
              >
                <Icon size={15} className="shrink-0" />
                <span className="flex-1 truncate">{BUSINESS_LABEL[key]}</span>
                {isLocked ? (
                  <span className="flex items-center gap-1 text-xs text-ink-400">
                    <Lock size={11} />
                    Soon
                  </span>
                ) : (
                  isCurrent && <Check size={14} className="text-brand-600" />
                )}
              </button>
            );
          })}

          {propertyCount > 0 && (
            <>
              <div className="my-1 h-px bg-line" />
              <p className="px-3 pb-1 pt-1.5 text-xs font-semibold uppercase tracking-wide text-ink-400">
                Property
              </p>
              {(business === "restaurant" ? restaurants : hotels).map((property) => (
                <button
                  key={property._id}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setActivePropertyId(property._id);
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-base text-ink-700 transition-colors hover:bg-surface-muted hover:text-ink-800"
                >
                  <span className="min-w-0 flex-1 truncate">{property.name}</span>
                  {activeProperty?._id === property._id && (
                    <Check size={14} className="shrink-0 text-brand-600" />
                  )}
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
