"use client";

import { cn } from "@/lib/cn";

export interface TabDef {
  key: string;
  label: string;
  icon?: React.ReactNode;
  /** Small count pill on the right of the label (e.g. pending reviews). */
  count?: number;
}

/**
 * Horizontal tab bar. Controlled — pages own the active key so it can be kept
 * in the URL hash / query where useful and survive a reload.
 */
export default function Tabs({
  tabs,
  active,
  onChange,
  className,
}: {
  tabs: TabDef[];
  active: string;
  onChange: (key: string) => void;
  className?: string;
}) {
  return (
    <div className={cn("tab-bar", className)} role="tablist">
      {tabs.map((tab) => {
        const isActive = tab.key === active;
        return (
          <button
            key={tab.key}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.key)}
            className={cn("tab inline-flex items-center gap-2", isActive && "tab-active")}
          >
            {tab.icon}
            {tab.label}
            {typeof tab.count === "number" && tab.count > 0 && (
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-xs font-semibold",
                  isActive ? "bg-brand-100 text-brand-700" : "bg-surface-muted text-ink-600"
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** Segmented control — used for compact in-card view switches. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className,
}: {
  options: { value: T; label: string; icon?: React.ReactNode }[];
  value: T;
  onChange: (next: T) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-0.5 rounded-md border border-line bg-surface-muted p-0.5",
        className
      )}
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-sm font-medium transition-colors",
            value === opt.value
              ? "bg-white text-ink-800 shadow-xs"
              : "text-ink-600 hover:text-ink-800"
          )}
        >
          {opt.icon}
          {opt.label}
        </button>
      ))}
    </div>
  );
}
