import { useState } from "react";
import { Check } from "./icons";

export function ToastStack({ toasts }) {
  return (
    <div className="fixed top-5 right-5 z-[100] space-y-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="bg-slate-900 text-white text-sm font-medium px-4 py-2.5 rounded-lg shadow-xl flex items-center gap-2"
        >
          <Check size={15} className="text-emerald-400" />
          {t.msg}
        </div>
      ))}
    </div>
  );
}

/** Reusable toast hook — gives every page a `toast(msg)` function. */
export function useToasts() {
  const [toasts, setToasts] = useState([]);
  const toast = (msg) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, msg }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3000);
  };
  return { toasts, toast };
}
