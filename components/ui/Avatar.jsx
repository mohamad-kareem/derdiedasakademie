import { cn, initials } from "@/lib/utils";

/** The address of a stored portrait, served through the permission-checked file route. */
export function avatarSrc(key) {
  return key ? `/api/files?key=${encodeURIComponent(key)}&inline=1` : null;
}

/**
 * A person, shown as their portrait when they have uploaded one and as their
 * initials when they have not. Square, like every other tile in the system.
 */
export default function Avatar({ name = "", avatarKey = "", size = 32, className }) {
  const src = avatarSrc(avatarKey);
  const style = { width: size, height: size, fontSize: Math.max(9, Math.round(size * 0.36)) };

  if (src) {
    return (
      /* eslint-disable-next-line @next/next/no-img-element */
      <img
        src={src}
        alt={name}
        style={style}
        className={cn("shrink-0 rounded-[2px] border border-line object-cover", className)}
      />
    );
  }

  return (
    <span
      style={style}
      aria-hidden
      className={cn("flex shrink-0 items-center justify-center rounded-[2px] bg-navy-900 font-bold text-white", className)}
    >
      {initials(name)}
    </span>
  );
}
