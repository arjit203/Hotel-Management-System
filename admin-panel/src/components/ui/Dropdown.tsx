"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
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
 *
 * The menu uses `position: fixed`, computed from the trigger's rect. As an
 * `absolute` child it was clipped by DataTable's `overflow-hidden` card and
 * `overflow-x-auto` scroller; a fixed element escapes both (no ancestor in the
 * shell sets transform/filter, which would make it a containing block again).
 * It isn't portalled because the workspace has no `@types/react-dom` and new
 * deps are off the table. It flips upward when there isn't room below, and
 * follows the trigger on scroll/resize.
 */

/** Gap between trigger and menu, and the minimum margin kept from the viewport edge. */
const GAP_PX = 4;
const EDGE_PX = 8;

interface MenuPosition {
  top: number;
  left?: number;
  right?: number;
  placement: "below" | "above";
}
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
  const [position, setPosition] = useState<MenuPosition | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback(() => {
    const triggerEl = triggerRef.current;
    if (!triggerEl) return;
    const rect = triggerEl.getBoundingClientRect();
    const menuHeight = menuRef.current?.offsetHeight ?? 0;
    const viewportH = window.innerHeight;
    const viewportW = document.documentElement.clientWidth;

    const spaceBelow = viewportH - rect.bottom - GAP_PX - EDGE_PX;
    const spaceAbove = rect.top - GAP_PX - EDGE_PX;
    const placement = menuHeight > spaceBelow && spaceAbove > spaceBelow ? "above" : "below";
    const top =
      placement === "above"
        ? Math.max(EDGE_PX, rect.top - GAP_PX - menuHeight)
        : rect.bottom + GAP_PX;

    setPosition(
      align === "right"
        ? { top, right: Math.max(EDGE_PX, viewportW - rect.right), placement }
        : { top, left: Math.max(EDGE_PX, rect.left), placement }
    );
  }, [align]);

  // Measure before paint so the menu never flashes in the wrong place. The
  // menu is committed (hidden) in the same render that sets `open`, so its
  // height is already known here.
  useLayoutEffect(() => {
    if (!open) {
      setPosition(null);
      return;
    }
    updatePosition();
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(e: MouseEvent) {
      const target = e.target as Node;
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    // Capture phase so scrolling any ancestor (the table scroller, the page)
    // keeps the menu attached to its trigger.
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open, updatePosition]);

  const menu = open ? (
    <div
      ref={menuRef}
      role="menu"
      style={{
        position: "fixed",
        top: position?.top ?? 0,
        left: position?.left,
        right: position?.right,
        // Hidden for the measuring pass, before a position exists.
        visibility: position ? "visible" : "hidden",
      }}
      className={cn(
        // Above modals/drawers (z-modal 80) so a menu opened inside one shows,
        // below toasts (100).
        "z-[90] animate-scale-in overflow-hidden rounded-lg border border-line bg-white py-1 shadow-lg",
        widthClass,
        position?.placement === "above"
          ? align === "right"
            ? "origin-bottom-right"
            : "origin-bottom-left"
          : align === "right"
            ? "origin-top-right"
            : "origin-top-left"
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
  ) : null;

  return (
    <div ref={rootRef} className="relative inline-block">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={trigger ? undefined : label}
        onClick={() => setOpen((v) => !v)}
        className={trigger ? "block" : "btn-icon"}
      >
        {trigger ?? <MoreHorizontal size={17} />}
      </button>

      {menu}
    </div>
  );
}
