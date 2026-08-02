"use client";

import { useEffect, useRef, useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/cn";

export interface MenuItemDef {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
  /** Renders a divider above this item. */
  separated?: boolean;
}

/**
 * Row actions / profile menu. Closes on outside click, Escape and after any
 * item is picked. Anchored right by default because it is nearly always the
 * last column of a table.
 */
export default function Dropdown({
  items,
  trigger,
  align = "right",
  label = "Open actions menu",
  widthClass = "w-48",
}: {
  items: MenuItemDef[];
  trigger?: React.ReactNode;
  align?: "left" | "right";
  label?: string;
  widthClass?: string;
}) {
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

  return (
    <div ref={rootRef} className="relative inline-block">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={trigger ? undefined : label}
        onClick={() => setOpen((v) => !v)}
        className={trigger ? "block" : "btn-icon"}
      >
        {trigger ?? <MoreHorizontal size={17} />}
      </button>

      {open && (
        <div
          role="menu"
          className={cn(
            "absolute z-drawer mt-1 animate-scale-in overflow-hidden rounded-lg border border-line bg-white py-1 shadow-lg",
            widthClass,
            align === "right" ? "right-0 origin-top-right" : "left-0 origin-top-left"
          )}
        >
          {items.map((item, i) => (
            <div key={`${item.label}-${i}`}>
              {item.separated && <div className="my-1 h-px bg-line" />}
              <button
                type="button"
                role="menuitem"
                disabled={item.disabled}
                onClick={() => {
                  setOpen(false);
                  item.onClick();
                }}
                className={cn(
                  "flex w-full items-center gap-2.5 px-3 py-2 text-left text-base transition-colors disabled:pointer-events-none disabled:opacity-50",
                  item.danger
                    ? "text-danger-600 hover:bg-danger-50"
                    : "text-ink-700 hover:bg-surface-muted hover:text-ink-800"
                )}
              >
                {item.icon && <span className="shrink-0">{item.icon}</span>}
                {item.label}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
