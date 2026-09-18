"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Keeps the "in class right now" figure honest by re-asking the server every
 * few seconds while the page is open. Pauses whenever the tab is in the
 * background, so an admin page left open in another window costs nothing.
 */
export default function LiveRefresh({ seconds = 20 }) {
  const router = useRouter();

  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    const timer = setInterval(tick, seconds * 1000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [router, seconds]);

  return null;
}
