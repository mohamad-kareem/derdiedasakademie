import { Download, ExternalLink } from "lucide-react";
import FileIcon from "@/components/files/FileIcon";
import { fileKind, fileUrl, formatBytes } from "@/lib/files-client";
import { cn } from "@/lib/utils";

/** Server-safe list of attachments with inline players for audio/video and preview for PDF/images. */
export default function AttachmentList({ files = [], t, className, dense = false }) {
  if (!files?.length) return null;
  return (
    <ul className={cn("grid gap-2", !dense && "sm:grid-cols-2", className)}>
      {files.map((f) => {
        const kind = fileKind(f);
        const previewable = kind === "pdf" || kind === "image";
        return (
          <li key={f.key} className={cn("rounded-[3px] border border-line bg-white", (kind === "audio" || kind === "video") && "sm:col-span-2")}>
            <div className="flex items-center gap-3 px-3 py-2">
              <FileIcon file={f} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink" dir="ltr">{f.name}</p>
                <p className="text-[11px] text-muted">{formatBytes(f.size)}</p>
              </div>
              {previewable && (
                <a href={fileUrl(f, { inline: true })} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm px-2" title={t("files.open")}>
                  <ExternalLink className="size-3.5" />
                </a>
              )}
              <a href={fileUrl(f)} className="btn btn-outline btn-sm px-2" title={t("files.download")}>
                <Download className="size-3.5" />
              </a>
            </div>
            {kind === "audio" && (
              <div className="border-t border-line px-3 py-2">
                <audio controls preload="none" src={fileUrl(f, { inline: true })} className="h-9 w-full" />
              </div>
            )}
            {kind === "video" && (
              <div className="border-t border-line p-2">
                <video controls preload="none" src={fileUrl(f, { inline: true })} className="aspect-video w-full rounded-[3px] bg-black" />
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
