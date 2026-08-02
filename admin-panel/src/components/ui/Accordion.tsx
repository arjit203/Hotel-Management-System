"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Collapsible section. Used to break long forms (SEO fields, advanced options)
 * out of the main flow instead of stacking every input vertically.
 */
export default function Accordion({
  title,
  description,
  icon,
  defaultOpen = false,
  children,
  className,
}: {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={cn("overflow-hidden rounded-lg border border-line bg-white", className)}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-hover",
          open && "border-b border-line"
        )}
      >
        {icon && <span className="shrink-0 text-ink-500">{icon}</span>}
        <span className="min-w-0 flex-1">
          <span className="block text-base font-medium text-ink-800">{title}</span>
          {description && <span className="block text-xs text-ink-500">{description}</span>}
        </span>
        <ChevronDown
          size={16}
          className={cn("shrink-0 text-ink-500 transition-transform", open && "rotate-180")}
        />
      </button>
      {open && <div className="animate-slide-up p-4">{children}</div>}
    </div>
  );
}
