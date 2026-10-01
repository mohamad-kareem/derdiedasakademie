"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/**
 * The play buttons on a course page point at addresses that work for six
 * hours at least. A page left open longer than that — a tab from this morning
 * — quietly fetches fresh ones when the student comes back to it, or the
 * moment a player finds its address has run out. Nobody sees it happen.
 */
export default function ShelfRefresher() {
  const router = useRouter();
  const loaded = useRef(0);

  useEffect(() => {
    loaded.current = Date.now();
    const renew = () => {
      loaded.current = Date.now();
      router.refresh();
    };
    const check = () => {
      if (document.visibilityState === "visible" && Date.now() - loaded.current > 3 * 3600 * 1000) renew();
    };
    const failed = (e) => {
      const el = e.target;
      if ((el?.tagName === "AUDIO" || el?.tagName === "VIDEO") && /\/m\//.test(el.currentSrc || el.src || "") && Date.now() - loaded.current > 60_000) renew();
    };
    document.addEventListener("visibilitychange", check);
    document.addEventListener("error", failed, true);
    const timer = setInterval(check, 15 * 60 * 1000);
    return () => {
      document.removeEventListener("visibilitychange", check);
      document.removeEventListener("error", failed, true);
      clearInterval(timer);
    };
  }, [router]);

  return null;
}
