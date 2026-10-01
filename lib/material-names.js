/**
 * How a folder on the classroom server turns into something a student reads.
 *
 *   A1/Hören/01 - Lektion 3 - Im Supermarkt.mp3
 *   └┬┘ └─┬─┘ └──────────────┬──────────────┘
 *  level section      title "Lektion 3 - Im Supermarkt"
 *
 * The number in front sets the order and is not shown. Underscores read as
 * spaces. Nothing here touches the disk; these are plain string rules shared
 * by the server pages and the upload box.
 */

const collator = new Intl.Collator("de", { numeric: true, sensitivity: "base" });
export const naturally = (a, b) => collator.compare(a, b);

// "01 - ", "1. ", "03_", "2) " — or a zero-padded number and a space ("01 Track").
const ORDER_PREFIX = /^(?:\d{1,3}\s*[-–._)]\s*|0\d{0,2}\s+)/;

export function displayName(name, { file = true } = {}) {
  const base = file ? String(name || "").replace(/\.[a-z0-9]{1,5}$/i, "") : String(name || "");
  // A Mac writes "ö" as "o" plus a dot-pair; shown the same, but it would not
  // match or sort with the "ö" everyone else types. The title is normalised;
  // the address keeps the name exactly as it is on the disk.
  const plain = base.normalize("NFC").replace(ORDER_PREFIX, "").replace(/_/g, " ").replace(/\s+/g, " ").trim();
  return plain || base.normalize("NFC");
}

const TYPES = {
  pdf: "application/pdf",
  mp3: "audio/mpeg", m4a: "audio/mp4", aac: "audio/aac", wav: "audio/wav",
  ogg: "audio/ogg", oga: "audio/ogg", opus: "audio/ogg", weba: "audio/webm",
  mp4: "video/mp4", webm: "video/webm", mov: "video/quicktime",
  jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", gif: "image/gif", webp: "image/webp",
};

export function extension(name) {
  const m = /\.([a-z0-9]{1,5})$/i.exec(String(name || ""));
  return m ? m[1].toLowerCase() : "";
}

export const typeOf = (name) => TYPES[extension(name)] || "";

// Must match UPLOADABLE in deploy/video-server/ddd-material.py.
export const UPLOADABLE = [
  "pdf", "doc", "docx", "ppt", "pptx", "xls", "xlsx", "odt", "txt", "rtf", "csv",
  "jpg", "jpeg", "png", "gif", "webp",
  "mp3", "m4a", "wav", "ogg", "oga", "opus", "aac", "weba",
  "mp4", "webm", "mov", "zip",
];
export const UPLOAD_ACCEPT = UPLOADABLE.map((e) => `.${e}`).join(",");

/**
 * One path segment as it may be written to the server: no slashes, nothing a
 * Windows machine would choke on if the folder is ever copied back, not hidden.
 */
export function cleanSegment(value, max = 120) {
  return String(value || "")
    .normalize("NFC")
    .replace(/[\u0000-\u001f<>:"/\\|?*]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\.+/, "")
    .slice(0, max)
    .trim();
}
