"use client";

import { useEffect, useState } from "react";
import { useConnectionState } from "@livekit/components-react";
import { ConnectionState } from "livekit-client";
import { Loader2, WifiOff, RotateCw } from "lucide-react";

/**
 * What the class is told about the connection.
 *
 * A brief wobble says nothing at all for the first few seconds — most recover
 * before anyone would have finished reading a warning. After that it says it is
 * reconnecting, and only when the browser has stopped trying does it become a
 * red notice with a button, because at that point there is something to do.
 */
export default function ConnectionNotice({ status, onRejoin, onSettled, t }) {
  const state = useConnectionState();
  const [slow, setSlow] = useState(false);

  const unsettled = state === ConnectionState.Reconnecting || state === ConnectionState.SignalReconnecting;
  const lost = status === "lost" && state !== ConnectionState.Connected;

  // A connection that comes back on its own leaves no trace: the moment the
  // room reports itself connected again, whatever we were worried about is over.
  useEffect(() => {
    if (state === ConnectionState.Connected) onSettled?.();
  }, [state, onSettled]);

  useEffect(() => {
    if (!unsettled) {
      setSlow(false);
      return undefined;
    }
    const id = setTimeout(() => setSlow(true), 3000);
    return () => clearTimeout(id);
  }, [unsettled]);

  if (lost) {
    return (
      <div className="fixed inset-x-0 top-14 z-50 mx-auto flex w-fit max-w-[92vw] items-center gap-3 rounded-lg bg-red-600 px-4 py-2.5 text-sm text-white shadow-xl">
        <WifiOff className="size-4 shrink-0" />
        <span>{t("classroom.connectionLost")}</span>
        <button
          type="button"
          onClick={onRejoin}
          className="inline-flex shrink-0 items-center gap-1.5 rounded bg-white/15 px-2.5 py-1 text-[13px] font-semibold hover:bg-white/25"
        >
          <RotateCw className="size-3.5" /> {t("classroom.rejoin")}
        </button>
      </div>
    );
  }

  if (unsettled && slow) {
    return (
      <div className="fixed inset-x-0 top-14 z-50 mx-auto flex w-fit items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-amber-950 shadow-xl">
        <Loader2 className="size-4 animate-spin" />
        {t("classroom.connection.reconnecting")}
      </div>
    );
  }

  return null;
}
