"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { useI18n } from "@/components/I18nProvider";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/Toaster";

/** Runs a bound server action on click. Optional inline confirmation. */
export default function ActionButton({ action, children, className, confirm, title }) {
  const { t } = useI18n();
  const [pending, startTransition] = useTransition();
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState(null);

  function run() {
    setAsking(false);
    startTransition(async () => {
      const res = await action();
      if (res?.ok === false) {
        setError(res.error);
        toast(t(res.error), "error");
      }
    });
  }

  if (asking) {
    return (
      <span className="inline-flex items-center gap-1.5">
        <span className="text-xs text-muted">{t("common.areYouSure")}</span>
        <button type="button" onClick={run} className="btn btn-danger btn-sm">{t("common.yes")}</button>
        <button type="button" onClick={() => setAsking(false)} className="btn btn-outline btn-sm">{t("common.no")}</button>
      </span>
    );
  }

  return (
    <span className="inline-flex flex-col items-start">
      <button
        type="button"
        title={title}
        disabled={pending}
        onClick={() => (confirm ? setAsking(true) : run())}
        className={cn("btn btn-sm", className || "btn-outline")}
      >
        {pending ? <Loader2 className="size-3.5 animate-spin" /> : children}
      </button>
      {error && <span className="mt-1 text-xs text-red-600">{t(error)}</span>}
    </span>
  );
}
