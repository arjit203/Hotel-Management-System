"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { CheckCircle2, XCircle, Info, AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/cn";

type ToastType = "success" | "error" | "info" | "warning";

interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  /** Optional second line — used for the multi-line field errors formatApiError returns. */
  detail?: string;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
  /** Convenience wrappers so call-sites read well. */
  toastSuccess: (message: string) => void;
  toastError: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

const ICONS: Record<ToastType, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const ICON_TONE: Record<ToastType, string> = {
  success: "text-success-600",
  error: "text-danger-600",
  warning: "text-warning-600",
  info: "text-info-600",
};

const AUTO_DISMISS_MS = 5000;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current[id];
    if (timer) {
      clearTimeout(timer);
      delete timers.current[id];
    }
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = "info") => {
      // formatApiError() joins per-field validation errors with "\n" — show the
      // first line as the title and the rest as detail rather than one blob.
      const [title, ...rest] = message.split("\n");
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      setToasts((prev) => [...prev, { id, type, title, detail: rest.join("\n") || undefined }]);
      timers.current[id] = setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
    },
    [dismiss]
  );

  const toastSuccess = useCallback((m: string) => showToast(m, "success"), [showToast]);
  const toastError = useCallback((m: string) => showToast(m, "error"), [showToast]);

  // Clear pending timers if the provider unmounts (e.g. logout → login page).
  useEffect(() => {
    const pending = timers.current;
    return () => {
      Object.values(pending).forEach(clearTimeout);
    };
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, toastSuccess, toastError }}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed bottom-4 right-4 z-toast flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-2"
      >
        {toasts.map((t) => {
          const Icon = ICONS[t.type];
          return (
            <div
              key={t.id}
              role="status"
              className="pointer-events-auto flex animate-slide-in-right items-start gap-2.5 rounded-lg border border-line bg-white p-3.5 shadow-lg"
            >
              <Icon size={17} className={cn("mt-px shrink-0", ICON_TONE[t.type])} aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="text-base font-medium text-ink-800">{t.title}</p>
                {t.detail && (
                  <p className="mt-0.5 whitespace-pre-line text-sm text-ink-600">{t.detail}</p>
                )}
              </div>
              <button
                onClick={() => dismiss(t.id)}
                aria-label="Dismiss notification"
                className="btn-icon h-6 w-6"
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
