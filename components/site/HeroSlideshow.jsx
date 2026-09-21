"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

const SLIDES = [1, 2, 3, 4, 5, 6, 7];
const DWELL_MS = 4500;

/**
 * The hero picture, as a slow carousel of the academy's own cards.
 *
 * Slides cross-fade rather than slide, so nothing in the layout moves; the
 * first is given priority and the rest load lazily, and the rotation stops
 * while the visitor is pointing at it or has asked for reduced motion.
 */
export default function HeroSlideshow({ alt = "" }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const timer = useRef(null);

  useEffect(() => {
    const still = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (paused || still) return undefined;
    timer.current = setInterval(() => setIndex((n) => (n + 1) % SLIDES.length), DWELL_MS);
    return () => clearInterval(timer.current);
  }, [paused]);

  return (
    <div
      className="relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-cream">
        {SLIDES.map((n, i) => (
          <Image
            key={n}
            src={`/intro/${n}.jpg`}
            alt={i === 0 ? alt : ""}
            aria-hidden={i !== index}
            width={1080}
            height={1350}
            priority={i === 0}
            loading={i === 0 ? undefined : "lazy"}
            sizes="(min-width: 1024px) 460px, 100vw"
            className={cn(
              "absolute inset-0 size-full object-cover transition-opacity duration-700 ease-out",
              i === index ? "opacity-100" : "opacity-0",
            )}
          />
        ))}
      </div>

      {/* A plain row of marks, so the visitor can see how many there are. */}
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1.5 bg-gradient-to-t from-navy-950/55 to-transparent px-3 pb-2.5 pt-8">
        {SLIDES.map((n, i) => (
          <button
            key={n}
            type="button"
            onClick={() => setIndex(i)}
            aria-label={`${i + 1} / ${SLIDES.length}`}
            aria-current={i === index}
            className={cn(
              "h-[3px] rounded-[1px] transition-all",
              i === index ? "w-6 bg-white" : "w-3 bg-white/45 hover:bg-white/70",
            )}
          />
        ))}
      </div>
    </div>
  );
}
