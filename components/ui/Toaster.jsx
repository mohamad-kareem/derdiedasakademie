"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const EVENT = "ddd:toast";

export function toast(message, type = "success") {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(EVENT, { detail: { message, type, id: Math.random() } }));
}

export default function Toaster() {
  const [items, setItems] = useState([]);
  useEffect(() => {
    const onToast = (e) => {
      const item = e.detail;
      setItems((list) => [...list.slice(-2), item]);
      setTimeout(() => setItems((list) => list.filter((i) => i.id !== item.id)), 4000);
    };
    window.addEventListener(EVENT, onToast);
    return () => window.removeEventListener(EVENT, onToast);
  }, []);
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[200] flex flex-col items-center gap-2 px-4" aria-live="polite">
      {items.map((i) => (
        <div
          key={i.id}
          className={cn(
            "pointer-events-auto flex max-w-md items-start gap-2 rounded-lg px-4 py-3 text-sm font-medium shadow-xl",
            i.type === "error" ? "bg-red-600 text-white" : "bg-navy-900 text-white",
          )}
        >
          {i.type === "error" ? <AlertCircle className="mt-0.5 size-4 shrink-0" /> : <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-gold-400" />}
          <span>{i.message}</span>
        </div>
      ))}
    </div>
  );
}
