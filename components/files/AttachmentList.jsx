import { Download, ExternalLink } from "lucide-react";
import FileIcon from "@/components/files/FileIcon";
import ProtectedAudio from "@/components/files/ProtectedAudio";
import { fileKind, fileUrl, formatBytes } from "@/lib/files-client";
import { cn } from "@/lib/utils";

/**
 * Server-safe list of attachments with inline players for audio/video and
 * preview for PDF/images. A file may bring its own addresses (`url`,
 * `downloadUrl`) — the academy's material does, pointing at the classroom
 * server — and a `title` to show instead of its file name. A file marked
 * `noDownload` is played but never offered for saving.
 */
export default function AttachmentList({ files = [], t, className, dense = false }) {
  if (!files?.length) return null;
  return (
    <ul className={cn("grid gap-2", !dense && "sm:grid-cols-2", className)}>
      {files.map((f) => {
        const kind = fileKind(f);
        const previewable = kind === "pdf" || kind === "image";
        const open = f.url || fileUrl(f, { inline: true });
        const save = f.downloadUrl || fileUrl(f);
        return (
          <li key={f.key || f.url} className={cn("rounded-[3px] border border-line bg-white", (kind === "audio" || kind === "video") && "sm:col-span-2")}>
            <div className="flex items-center gap-3 px-3 py-2">
              <FileIcon file={f} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink" dir="ltr" title={f.title ? f.name : undefined}>{f.title || f.name}</p>
                {/* "16.4 KB" is written left to right in every language. */}
                <p className="text-[11px] text-muted"><span dir="ltr">{formatBytes(f.size)}</span></p>
              </div>
              {previewable && (
                <a href={open} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm px-2" title={t("files.open")}>
                  <ExternalLink className="size-3.5" />
                </a>
              )}
              {!f.noDownload && (
                <a href={save} className="btn btn-outline btn-sm px-2" title={t("files.download")}>
                  <Download className="size-3.5" />
                </a>
              )}
            </div>
            {kind === "audio" && (
              <div className="border-t border-line px-3 py-2">
                {f.noDownload ? (
                  <ProtectedAudio src={open} className="h-9 w-full" />
                ) : (
                  <audio controls preload="none" src={open} className="h-9 w-full" />
                )}
              </div>
            )}
            {kind === "video" && (
              <div className="border-t border-line p-2">
                <video controls preload="none" src={open} className="aspect-video w-full rounded-[3px] bg-black" />
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
