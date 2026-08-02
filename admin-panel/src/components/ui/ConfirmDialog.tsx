"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AlertTriangle, HelpCircle } from "lucide-react";
import Button from "./Button";
import { cn } from "@/lib/cn";

interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

interface ConfirmContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

/**
 * Replaces window.confirm() everywhere in the admin panel. Returns a promise so
 * call-sites keep the same `if (!(await confirm(...))) return;` shape that the
 * old native dialogs had.
 */
export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within ConfirmProvider");
  return ctx.confirm;
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{
    options: ConfirmOptions;
    resolve: (value: boolean) => void;
  } | null>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => setState({ options, resolve }));
  }, []);

  const handleClose = useCallback(
    (result: boolean) => {
      setState((current) => {
        current?.resolve(result);
        return null;
      });
    },
    []
  );

  // Escape cancels; focus lands on the confirm button so Enter completes the
  // action without reaching for the mouse.
  useEffect(() => {
    if (!state) return;
    confirmButtonRef.current?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") handleClose(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [state, handleClose]);

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {state && (
        <div
          className="fixed inset-0 z-modal flex animate-fade-in items-center justify-center bg-ink-900/40 p-4 backdrop-blur-[2px]"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) handleClose(false);
          }}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            className="w-full max-w-md animate-scale-in rounded-xl border border-line bg-white shadow-xl"
          >
            <div className="flex gap-3.5 p-5">
              <div
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                  state.options.danger
                    ? "bg-danger-50 text-danger-600"
                    : "bg-brand-50 text-brand-600"
                )}
              >
                {state.options.danger ? <AlertTriangle size={19} /> : <HelpCircle size={19} />}
              </div>
              <div className="min-w-0 pt-0.5">
                <h2 id="confirm-title" className="text-md font-semibold text-ink-800">
                  {state.options.title}
                </h2>
                {state.options.description && (
                  <p className="mt-1 text-base text-ink-600">{state.options.description}</p>
                )}
              </div>
            </div>
            <div className="card-footer rounded-b-xl">
              <Button variant="secondary" onClick={() => handleClose(false)}>
                {state.options.cancelLabel || "Cancel"}
              </Button>
              <Button
                ref={confirmButtonRef}
                variant={state.options.danger ? "danger" : "primary"}
                onClick={() => handleClose(true)}
              >
                {state.options.confirmLabel || "Confirm"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}
