import { TIMEZONE } from "@/lib/constants";

export function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

export function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

function intlLocale(locale) {
  if (locale === "ar") return "ar-u-nu-latn";
  if (locale === "de") return "de-DE";
  return "en-GB";
}

export function formatDate(value, locale = "en", opts = {}) {
  if (!value) return "—";
  return new Intl.DateTimeFormat(intlLocale(locale), {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: TIMEZONE,
    ...opts,
  }).format(new Date(value));
}

export function formatDateTime(value, locale = "en") {
  if (!value) return "—";
  return new Intl.DateTimeFormat(intlLocale(locale), {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TIMEZONE,
  }).format(new Date(value));
}

export function formatTime(value, locale = "en") {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TIMEZONE,
  }).format(new Date(value));
}

export function formatMoney(amount, currency = "EUR", locale = "en") {
  return new Intl.NumberFormat(intlLocale(locale), {
    style: "currency",
    currency,
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount || 0);
}

// Offset (minutes) of the academy timezone at a given instant.
function tzOffsetMinutes(date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONE,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const get = (t) => Number(parts.find((p) => p.type === t).value);
  const asUTC = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return (asUTC - date.getTime()) / 60000;
}

// "2026-10-01T18:00" (academy local time) -> Date
export function parseLocalDateTime(str) {
  if (!str) return null;
  const [d, t = "00:00"] = String(str).split("T");
  const [y, m, day] = d.split("-").map(Number);
  const [h, min] = t.split(":").map(Number);
  if (!y || !m || !day) return null;
  const guess = new Date(Date.UTC(y, m - 1, day, h || 0, min || 0));
  const offset = tzOffsetMinutes(guess);
  const result = new Date(guess.getTime() - offset * 60000);
  const offset2 = tzOffsetMinutes(result);
  return offset2 === offset ? result : new Date(guess.getTime() - offset2 * 60000);
}

// Date -> "2026-10-01T18:00" in academy local time (for datetime-local inputs)
export function toLocalInput(value, dateOnly = false) {
  if (!value) return "";
  const date = new Date(value);
  const local = new Date(date.getTime() + tzOffsetMinutes(date) * 60000);
  const iso = local.toISOString();
  return dateOnly ? iso.slice(0, 10) : iso.slice(0, 16);
}

export function initials(name = "") {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join("");
}

export function safeUrl(url) {
  if (!url) return "";
  const trimmed = String(url).trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function nowMs() {
  return Date.now();
}

export function hoursAgo(h) {
  return new Date(Date.now() - h * 3600e3);
}
