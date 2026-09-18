"use client";

import { useRef, useState } from "react";
import { UploadCloud, X, Loader2, AlertCircle } from "lucide-react";
import FileIcon from "@/components/files/FileIcon";
import { useI18n } from "@/components/I18nProvider";
import { uploadFile } from "@/lib/upload-client";
import { ACCEPT, formatBytes } from "@/lib/files-client";
import { cn } from "@/lib/utils";

/**
 * Uploads files straight to storage and exposes them to the surrounding form
 * as a JSON hidden input: [{ key, name, size, type }].
 */
export default function FileUploader({ name = "attachments", scope, courseId, studentId, initial = [], max = 10, enabled = true, compact = false, accept = ACCEPT, onChange }) {
  const { t } = useI18n();
  const inputRef = useRef(null);
  const [files, setFiles] = useState(() => initial.map((f) => ({ ...f, status: "done" })));
  const [drag, setDrag] = useState(false);

  const done = files.filter((f) => f.status === "done").map(({ key, name: n, size, type }) => ({ key, name: n, size, type }));
  const uploading = files.some((f) => f.status === "uploading");

  function update(id, patch) {
    setFiles((list) => {
      const next = list.map((f) => (f.id === id ? { ...f, ...patch } : f));
      onChange?.(next.filter((f) => f.status === "done"));
      return next;
    });
  }

  async function add(fileList) {
    const picked = Array.from(fileList || []).slice(0, Math.max(0, max - files.length));
    for (const file of picked) {
      const id = `${file.name}-${file.size}-${Math.random()}`;
      setFiles((list) => [...list, { id, name: file.name, size: file.size, type: file.type, status: "uploading", progress: 0 }]);
      try {
        const saved = await uploadFile(file, { scope, courseId, studentId, onProgress: (progress) => update(id, { progress }) });
        update(id, { status: "done", key: saved.key, type: saved.type });
      } catch (err) {
        update(id, { status: "error", error: String(err?.message || "").includes(".") ? err.message : "files.uploadFailed" });
      }
    }
  }

  function remove(id, key) {
    setFiles((list) => {
      const next = list.filter((f) => (id ? f.id !== id : f.key !== key));
      onChange?.(next.filter((f) => f.status === "done"));
      return next;
    });
  }

  if (!enabled) {
    return <p className="rounded-[3px] border border-dashed border-line bg-canvas/50 px-3 py-2.5 text-xs text-muted">{t("files.notConfigured")}</p>;
  }

  return (
    <div data-uploading={uploading ? "true" : "false"}>
      <input type="hidden" name={name} value={JSON.stringify(done)} />
      <input ref={inputRef} type="file" multiple={max > 1} accept={accept} className="hidden" onChange={(e) => { add(e.target.files); e.target.value = ""; }} />
      {files.length < max && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); add(e.dataTransfer.files); }}
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-[3px] border border-dashed text-sm transition",
            compact ? "px-3 py-2" : "flex-col px-4 py-5",
            drag ? "border-navy-600 bg-navy-50 text-navy-900" : "border-line bg-canvas/40 text-muted hover:border-navy-600/40 hover:bg-canvas",
          )}
        >
          <UploadCloud className={compact ? "size-4" : "size-6 text-navy-600"} />
          <span className="font-medium text-ink">{t("files.dropOrClick")}</span>
          {!compact && <span className="text-xs">{t("files.allowed")}</span>}
        </button>
      )}
      {files.length > 0 && (
        <ul className="mt-2 space-y-1.5">
          {files.map((f) => (
            <li key={f.id || f.key} className="flex items-center gap-2.5 rounded-[3px] border border-line bg-white px-2.5 py-2">
              <FileIcon file={f} className="size-8" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-ink" dir="ltr">{f.name}</p>
                {f.status === "uploading" && (
                  <div className="mt-1 h-1 overflow-hidden bg-canvas"><div className="h-full bg-navy-700 transition-all" style={{ width: `${f.progress}%` }} /></div>
                )}
                {f.status === "done" && <p className="text-[11px] text-muted">{formatBytes(f.size)}</p>}
                {f.status === "error" && <p className="flex items-center gap-1 text-[11px] text-red-600"><AlertCircle className="size-3" /> {t(f.error)}</p>}
              </div>
              {f.status === "uploading" ? (
                <Loader2 className="size-4 animate-spin text-muted" />
              ) : (
                <button type="button" onClick={() => remove(f.id, f.key)} className="rounded p-1 text-muted hover:bg-canvas hover:text-red-600" aria-label="Remove">
                  <X className="size-3.5" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
