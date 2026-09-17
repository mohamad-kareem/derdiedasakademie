"use client";

import { createContext, useContext, useRef, useState, useTransition } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { useI18n } from "@/components/I18nProvider";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/Toaster";

const PendingContext = createContext(false);

/**
 * Calls a server action that returns { ok, error?, message? }.
 * Does not reset inputs on error. Optional reset / callback on success.
 */
export default function ActionForm({ action, children, className, onSuccess, resetOnSuccess = false, showSuccess = true }) {
  const { t } = useI18n();
  const formRef = useRef(null);
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState(null);

  function handleSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      let result;
      try {
        result = await action(formData);
      } catch (err) {
        if (err?.digest?.startsWith?.("NEXT_REDIRECT")) throw err;
        result = { ok: false, error: "errors.generic" };
      }
      setState(result || { ok: true });
      if (result?.ok !== false) {
        if (showSuccess && result?.message) toast(t(result.message));
        if (resetOnSuccess) formRef.current?.reset();
        onSuccess?.(result);
      }
    });
  }

  return (
    <PendingContext.Provider value={pending}>
      <form ref={formRef} onSubmit={handleSubmit} className={className} noValidate={false}>
        {state?.ok === false && (
          <div role="alert" className="mb-4 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span>{t(state.error || "errors.generic")}</span>
          </div>
        )}
        {children}
      </form>
    </PendingContext.Provider>
  );
}

export function SubmitButton({ children, className, pendingText }) {
  const pending = useContext(PendingContext);
  return (
    <button type="submit" disabled={pending} className={cn("btn btn-primary", className)}>
      {pending && <Loader2 className="size-4 animate-spin" />}
      {pending && pendingText ? pendingText : children}
    </button>
  );
}
