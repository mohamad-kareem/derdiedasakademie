"use client";

const KEYS = ["ä", "ö", "ü", "ß", "Ä", "Ö", "Ü", "„", "“", "€"];

/** Inserts German characters into the currently focused input without stealing focus. */
export function insertIntoActive(char) {
  const el = document.activeElement;
  if (!el || !(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) return false;
  const start = el.selectionStart ?? el.value.length;
  const end = el.selectionEnd ?? el.value.length;
  const next = el.value.slice(0, start) + char + el.value.slice(end);
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, "value").set.call(el, next);
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.setSelectionRange(start + char.length, start + char.length);
  return true;
}

export default function GermanKeyboard({ className = "", dark = true }) {
  return (
    <div className={`flex flex-wrap gap-1 ${className}`} dir="ltr">
      {KEYS.map((k) => (
        <button
          key={k}
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            insertIntoActive(k);
          }}
          className={`flex h-7 min-w-7 items-center justify-center rounded px-1.5 text-sm font-semibold transition ${dark ? "bg-white/10 text-white hover:bg-gold-500" : "bg-canvas text-ink hover:bg-gold-100"}`}
        >
          {k}
        </button>
      ))}
    </div>
  );
}
