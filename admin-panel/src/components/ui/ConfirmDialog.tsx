"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { AlertTriangle } from "lucide-react";

interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  danger?: boolean;
}

interface ConfirmContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

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

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({ options, resolve });
    });
  }, []);

  function handleClose(result: boolean) {
    state?.resolve(result);
    setState(null);
  }

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {state && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-charcoal/50 px-6 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start gap-3">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                  state.options.danger ? "bg-red-100 text-red-600" : "bg-beige text-gold"
                }`}
              >
                <AlertTriangle size={18} />
              </div>
              <div>
                <h3 className="font-display text-lg text-charcoal">{state.options.title}</h3>
                {state.options.description && (
                  <p className="mt-1 font-body text-sm text-warmgray">
                    {state.options.description}
                  </p>
                )}
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => handleClose(false)}
                className="rounded-full border border-beige px-5 py-2 font-body text-sm text-warmgray hover:border-gold hover:text-gold"
              >
                Cancel
              </button>
              <button
                onClick={() => handleClose(true)}
                className={`rounded-full px-5 py-2 font-body text-sm text-white ${
                  state.options.danger ? "bg-red-600 hover:bg-red-700" : "bg-charcoal hover:bg-gold"
                }`}
              >
                {state.options.confirmLabel || "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}
