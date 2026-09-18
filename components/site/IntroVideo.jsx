"use client";

import { useState } from "react";
import Image from "next/image";
import { Play } from "lucide-react";

/**
 * The teacher's introduction.
 *
 * Nothing of the video is downloaded until the visitor asks for it: until then
 * this is a still frame and a button. That keeps the page fast and keeps the
 * academy's traffic bill at zero for the many visitors who never press play.
 */
export default function IntroVideo({ src, poster, label, className }) {
  const [playing, setPlaying] = useState(false);

  if (playing) {
    return (
      <video
        src={src}
        poster={poster}
        controls
        autoPlay
        playsInline
        preload="auto"
        className={className}
        aria-label={label}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setPlaying(true)}
      className={`group relative block w-full overflow-hidden bg-navy-950 ${className || ""}`}
      aria-label={label}
    >
      <Image
        src={poster}
        alt=""
        width={720}
        height={1280}
        sizes="(min-width: 1024px) 300px, 80vw"
        className="h-full w-full object-cover transition-opacity group-hover:opacity-90"
      />
      <span className="absolute inset-0 flex items-center justify-center">
        <span className="flex size-14 items-center justify-center rounded-[3px] border border-white/30 bg-navy-950/70 text-white transition group-hover:bg-navy-950/85">
          <Play className="size-6 translate-x-px fill-current" />
        </span>
      </span>
      <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-navy-950/85 to-transparent px-3 pb-2.5 pt-8 text-start text-[12px] font-semibold text-white">
        {label}
      </span>
    </button>
  );
}
