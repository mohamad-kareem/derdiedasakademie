"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import FileIcon from "@/components/files/FileIcon";
import { useI18n } from "@/components/I18nProvider";
import { toast } from "@/components/ui/Toaster";
import { prepareShelfUpload, finishShelfUpload } from "@/app/actions/library";
import { formatBytes } from "@/lib/files-client";
import { UPLOAD_ACCEPT } from "@/lib/material-names";
import { cn } from "@/lib/utils";

// Contains a ":" — which no real folder name can (cleanSegment removes it).
const NEW = "::new";

// What the material server answers, in words.
const REASONS = { 403: "library.errors.expired", 409: "library.errors.exists", 413: "library.errors.tooBig", 415: "library.errors.type", 507: "library.errors.diskFull" };

/** Sends one file straight to the classroom server, reporting progress. */
function send(url, file, onProgress) {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => resolve(xhr.status === 201 ? "" : REASONS[xhr.status] || "library.errors.failed");
    xhr.onerror = () => resolve("library.errors.failed");
    xhr.send(file);
  });
}

/**
 * For the odd worksheet. A whole level is quicker copied onto the server
 * directly; this is for adding one or two files without leaving the page.
 */
export default function ShelfUploader({ level, sections = [], maxMb }) {
  const { t } = useI18n();
  const router = useRouter();
  const input = useRef(null);
  const [section, setSection] = useState(sections[0]?.folder ?? "");
  const [fresh, setFresh] = useState("");
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);

  const patch = (i, p) => setItems((list) => list.map((x, j) => (j === i ? { ...x, ...p } : x)));

  async function upload(fileList) {
    const files = Array.from(fileList || []);
    if (!files.length || busy) return;
    const target = section === NEW ? fresh.trim() : section;
    if (section === NEW && !target) {
      toast(t("library.newSectionName"), "error");
      return;
    }
    setBusy(true);
    setItems(files.map((f) => ({ name: f.name, size: f.size, type: f.type, progress: 0, state: "waiting" })));

    const plan = await prepareShelfUpload({ level, section: target, files: files.map((f) => ({ name: f.name, size: f.size })) });
    if (!plan?.ok) {
      setItems((list) => list.map((x) => ({ ...x, state: "error", error: plan?.error || "library.errors.failed" })));
      setBusy(false);
      return;
    }

    let sent = 0;
    for (let i = 0; i < files.length; i += 1) {
      const p = plan.files[i];
      if (p.error) {
        patch(i, { state: "error", error: p.error });
        continue;
      }
      patch(i, { state: "sending" });
      const error = await send(p.url, files[i], (progress) => patch(i, { progress }));
      patch(i, error ? { state: "error", error } : { state: "done", progress: 100 });
      if (!error) sent += 1;
    }

    if (sent) {
      await finishShelfUpload();
      toast(t("library.uploaded", { n: sent }));
      if (section === NEW) {
        setSection(target);
        setFresh("");
      }
      router.refresh();
    }
    setBusy(false);
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="label">{t("library.section")}</span>
          <select value={section} onChange={(e) => setSection(e.target.value)} className="input" disabled={busy}>
            {sections.map((s) => (
              <option key={s.folder} value={s.folder}>{s.folder || t("library.general")}</option>
            ))}
            {!sections.some((s) => s.folder === "") && <option value="">{t("library.general")}</option>}
            <option value={NEW}>{t("library.newSection")}</option>
          </select>
        </label>
        {section === NEW && (
          <label className="block">
            <span className="label">{t("library.newSectionName")}</span>
            <input value={fresh} onChange={(e) => setFresh(e.target.value)} className="input" placeholder={t("library.newSectionPlaceholder")} disabled={busy} maxLength={80} />
          </label>
        )}
      </div>

      <input ref={input} type="file" multiple accept={UPLOAD_ACCEPT} className="hidden" onChange={(e) => { upload(e.target.files); e.target.value = ""; }} />
      <button
        type="button"
        disabled={busy}
        onClick={() => input.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); upload(e.dataTransfer.files); }}
        className={cn(
          "flex w-full flex-col items-center justify-center gap-1 rounded-[3px] border border-dashed px-4 py-6 text-sm transition",
          drag ? "border-navy-700 bg-cream" : "border-line bg-canvas/40 hover:bg-cream",
          busy && "cursor-wait opacity-70",
        )}
      >
        {busy ? <Loader2 className="size-5 animate-spin text-muted" /> : <UploadCloud className="size-5 text-muted" />}
        <span className="font-medium text-ink">{t(busy ? "library.uploading" : "library.chooseFiles")}</span>
        <span className="text-[11.5px] text-muted">{t("library.uploadHint", { mb: maxMb })}</span>
      </button>

      {items.length > 0 && (
        <ul className="divide-y divide-line rounded-[3px] border border-line bg-white">
          {items.map((f, i) => (
            <li key={`${f.name}-${i}`} className="flex items-center gap-3 px-3 py-2">
              <FileIcon file={f} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-ink" dir="ltr">{f.name}</p>
                {f.state === "sending" && (
                  <div className="mt-1 h-1 overflow-hidden bg-canvas"><div className="h-full bg-navy-700 transition-all" style={{ width: `${f.progress}%` }} /></div>
                )}
                {f.state === "error" && <p className="text-[11px] text-red-600">{t(f.error, { mb: maxMb })}</p>}
                {(f.state === "waiting" || f.state === "done") && <p className="text-[11px] text-muted"><span dir="ltr">{formatBytes(f.size)}</span></p>}
              </div>
              {f.state === "sending" && <span className="text-[11px] tabular text-muted" dir="ltr">{f.progress}%</span>}
              {f.state === "done" && <CheckCircle2 className="size-4 text-emerald-600" />}
              {f.state === "error" && <AlertCircle className="size-4 text-red-600" />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
