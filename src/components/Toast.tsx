"use client";

import { useState, useCallback, useEffect } from "react";

type Toast = {
  id: string;
  message: string;
  type: "success" | "error" | "info" | "warning";
};

let toastIdCounter = 0;

export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: Toast["type"] = "info", duration = 3000) => {
    const id = String(++toastIdCounter);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  return { toasts, addToast };
}

export function ToastContainer({ toasts }: { toasts: Toast[] }) {
  if (!toasts.length) return null;
  return (
    <div className="fixed bottom-6 right-6 z-[90] space-y-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`px-4 py-3 rounded-xl text-[11px] font-black tracking-wider shadow-xl animate-pop border ${
            t.type === "error"
              ? "bg-[#ff2255]/10 text-[#ff3355] border-[#ff2255]/30"
              : t.type === "success"
              ? "bg-[#00e87a]/10 text-[#00e87a] border-[#00e87a]/30"
              : t.type === "warning"
              ? "bg-[#e8c84a]/10 text-[#e8c84a] border-[#e8c84a]/30"
              : "bg-[#00d4ff]/10 text-[#00d4ff] border-[#00d4ff]/30"
          }`}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
