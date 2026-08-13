"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

type Toast = { id: number; message: string; tone: "ok" | "error" };

const ToastContext = createContext<{
  toast: (message: string, tone?: "ok" | "error") => void;
}>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext).toast;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, tone: "ok" | "error" = "ok") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, tone }]);
    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, 3200);
  }, []);

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[100] flex flex-col items-center gap-2 px-4 md:bottom-6">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`animate-fade-up pointer-events-auto max-w-sm rounded-xl border px-4 py-2.5 text-sm shadow-2xl backdrop-blur ${
              t.tone === "error"
                ? "border-red-800/70 bg-red-950/90 text-red-200"
                : "border-ink-600 bg-ink-800/95 text-white"
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
