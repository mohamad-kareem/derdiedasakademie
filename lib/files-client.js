export function fileUrl(file, { inline = false } = {}) {
  const p = new URLSearchParams({ key: file.key, name: file.name || "" });
  if (inline) p.set("inline", "1");
  return `/api/files?${p}`;
}

export function formatBytes(bytes = 0) {
  if (!bytes) return "";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / 1024 ** i).toFixed(i ? 1 : 0)} ${units[i]}`;
}

export function fileKind(file) {
  const t = file.type || "";
  const n = (file.name || "").toLowerCase();
  if (t === "application/pdf" || n.endsWith(".pdf")) return "pdf";
  if (t.startsWith("image/")) return "image";
  if (t.startsWith("audio/")) return "audio";
  if (t.startsWith("video/")) return "video";
  if (/\.(docx?|odt|rtf|txt)$/.test(n)) return "doc";
  if (/\.(pptx?)$/.test(n)) return "slides";
  if (/\.(xlsx?|csv)$/.test(n)) return "sheet";
  return "file";
}

export const ACCEPT =
  ".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.odt,.txt,.csv,.rtf,.jpg,.jpeg,.png,.gif,.webp,.heic,.mp3,.m4a,.wav,.ogg,.oga,.weba,.mp4,.webm,.mov,.zip";
