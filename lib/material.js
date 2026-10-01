import crypto from "node:crypto";
import { LEVELS } from "@/lib/constants";
import { displayName, naturally, typeOf } from "@/lib/material-names";

/**
 * The academy's material, kept as plain files on the classroom server.
 *
 * This side never holds the files. It asks the server what is in the folder,
 * and hands each student addresses that the server will honour — signed with
 * the secret the two share, and good for a few hours. A link copied into a
 * group chat dies on its own; one made up never works.
 *
 *   MATERIAL_URL     https://ddd-classroom.duckdns.org
 *   MATERIAL_SECRET  printed by deploy/video-server/material-setup.sh
 */

const base = () => (process.env.MATERIAL_URL || "").trim().replace(/\/+$/, "");
const secret = () => (process.env.MATERIAL_SECRET || "").trim();

export const MATERIAL_MAX_MB = Number(process.env.MATERIAL_MAX_MB || 500);

export function isMaterialConfigured() {
  return Boolean(base()) && secret().length >= 24;
}

function sign(...parts) {
  return crypto.createHmac("sha256", secret()).update(parts.join("\n"), "utf8").digest("hex").slice(0, 32);
}

const encodePath = (rel) => rel.split("/").map(encodeURIComponent).join("/");
const nowSeconds = () => Math.floor(Date.now() / 1000);

// A link is good for 6 to 12 hours, and stays the same address for six hours
// at a time — so a student replaying the same audio gets it from their own
// browser's cache instead of downloading it again.
const WINDOW = 6 * 3600;
const readExpiry = () => Math.floor(nowSeconds() / WINDOW) * WINDOW + 2 * WINDOW;

export function readUrl(rel, { download = false } = {}) {
  const e = readExpiry();
  return `${base()}/m/${encodePath(rel)}?e=${e}&s=${sign("GET", rel, e)}${download ? "&dl=1" : ""}`;
}

export function uploadUrl(rel, size) {
  const e = nowSeconds() + 3 * 3600;
  return `${base()}/m-api/upload/${encodePath(rel)}?e=${e}&s=${sign("PUT", rel, e, size)}&n=${size}`;
}

export async function removeFile(rel) {
  const e = nowSeconds() + 300;
  try {
    const res = await fetch(`${base()}/m-api/file/${encodePath(rel)}?e=${e}&s=${sign("DELETE", rel, e)}`, {
      method: "DELETE",
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    return res.ok || res.status === 404;
  } catch {
    return false;
  }
}

/* --------------------------------------------------------------- the list */

// The folder is asked at most every half minute. Bilal's own uploads clear it
// straight away; files you copy in by hand appear within the half minute.
const TTL = 30_000;
let memo = { at: 0, data: null };

export function forgetIndex() {
  memo = { ...memo, at: 0 };
}

/**
 * { ok, files: [{ p, s, m }], bytes, disk, stale? } or { ok: false, error }.
 * If the server blinks, the last good list is served rather than an empty
 * shelf; the links on it still work the moment the server is back.
 */
export async function materialIndex() {
  if (!isMaterialConfigured()) return { ok: false, error: "off" };
  if (memo.data && Date.now() - memo.at < TTL) return memo.data;
  const e = nowSeconds() + 300;
  try {
    const res = await fetch(`${base()}/m-api/index?e=${e}&s=${sign("INDEX", "", e)}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error(`index ${res.status}`);
    const json = await res.json();
    const data = { ok: true, files: Array.isArray(json.files) ? json.files : [], bytes: json.bytes || 0, disk: json.disk || null };
    memo = { at: Date.now(), data };
    return data;
  } catch {
    if (memo.data) return { ...memo.data, stale: true };
    return { ok: false, error: "unreachable" };
  }
}

export const levelOf = (rel) => {
  const first = String(rel).split("/")[0].toUpperCase();
  return LEVELS.includes(first) ? first : "";
};

/** How many files each level holds. */
export function countByLevel(index) {
  const out = Object.fromEntries(LEVELS.map((l) => [l, 0]));
  for (const f of index?.files || []) {
    const l = levelOf(f.p);
    if (l) out[l] += 1;
  }
  return out;
}

/**
 * One level's shelf: [{ folder, title, files: [...] }], in the order the names
 * give. Files lying directly in the level folder form the first section, with
 * folder "" (shown as "General").
 *
 * links: false leaves out the signed addresses — for a summary that only counts.
 */
export function shelfFor(index, level, { links = true } = {}) {
  const groups = new Map();
  for (const f of index?.files || []) {
    if (levelOf(f.p) !== level) continue;
    const parts = f.p.split("/");
    const folder = parts.length > 2 ? parts[1] : "";
    const name = parts[parts.length - 1];
    const inner = parts.slice(folder ? 2 : 1, -1).map((d) => displayName(d, { file: false }));
    const item = {
      rel: f.p,
      key: f.p,
      name,
      title: [...inner, displayName(name)].join(" / "),
      size: f.s,
      type: typeOf(name),
      ...(links ? { url: readUrl(f.p), downloadUrl: readUrl(f.p, { download: true }) } : {}),
    };
    if (!groups.has(folder)) groups.set(folder, []);
    groups.get(folder).push(item);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => (a === "" ? -1 : b === "" ? 1 : naturally(a, b)))
    .map(([folder, files]) => ({
      folder,
      title: folder ? displayName(folder, { file: false }) : "",
      files: files.sort((a, b) => naturally(a.rel, b.rel)),
      bytes: files.reduce((n, f) => n + (f.size || 0), 0),
    }));
}
