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

const BYTE_UNITS = ["B", "KB", "MB", "GB", "TB", "PB"];

/** 1_572_864 -> "1.5 MB". Always the largest unit that keeps the number readable. */
export function formatBytes(bytes, locale = "en", digits) {
  const value = Number(bytes) || 0;
  if (value < 1024) return `${Math.round(value)} ${BYTE_UNITS[0]}`;
  let step = 0;
  let n = value;
  while (n >= 1024 && step < BYTE_UNITS.length - 1) {
    n /= 1024;
    step += 1;
  }
  const decimals = digits ?? (n < 10 ? 1 : 0);
  return `${new Intl.NumberFormat(intlLocale(locale), { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(n)} ${BYTE_UNITS[step]}`;
}

export function formatNumber(value, locale = "en", opts = {}) {
  return new Intl.NumberFormat(intlLocale(locale), opts).format(Number(value) || 0);
}

const TIME_UNITS = {
  en: { hour: "h", minute: "min" },
  de: { hour: "Std.", minute: "Min." },
  ar: { hour: "س", minute: "د" },
};

/** 4830 -> "80 h 30 min" */
export function formatMinutes(minutes, locale = "en") {
  const unit = TIME_UNITS[locale] || TIME_UNITS.en;
  const total = Math.max(0, Math.round(Number(minutes) || 0));
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  if (!hours) return `${formatNumber(rest, locale)} ${unit.minute}`;
  return `${formatNumber(hours, locale)} ${unit.hour}${rest ? ` ${formatNumber(rest, locale)} ${unit.minute}` : ""}`;
}

export function nowMs() {
  return Date.now();
}

export function hoursAgo(h) {
  return new Date(Date.now() - h * 3600e3);
}
