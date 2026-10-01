"use client";

/**
 * A player for the academy's listening material that offers no way to save
 * the file: no download button in the controls, no "Save audio as…" on
 * right-click. Playing, pausing, skipping and changing speed all still work.
 *
 * It keeps honest people honest rather than stopping a determined one — a
 * browser has to receive the sound to play it. What makes a copied address
 * useless is that it expires within hours.
 */
export default function ProtectedAudio({ src, className }) {
  return (
    <audio
      controls
      preload="none"
      src={src}
      controlsList="nodownload"
      onContextMenu={(e) => e.preventDefault()}
      className={className}
    />
  );
}
