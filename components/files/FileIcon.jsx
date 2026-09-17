import { FileText, FileImage, FileAudio, FileVideo, File, Presentation, Sheet } from "lucide-react";
import { fileKind } from "@/lib/files-client";
import { cn } from "@/lib/utils";

const MAP = {
  pdf: { icon: FileText, cls: "bg-red-50 text-red-600", label: "PDF" },
  doc: { icon: FileText, cls: "bg-sky-50 text-sky-700", label: "DOC" },
  slides: { icon: Presentation, cls: "bg-orange-50 text-orange-600", label: "PPT" },
  sheet: { icon: Sheet, cls: "bg-emerald-50 text-emerald-700", label: "XLS" },
  image: { icon: FileImage, cls: "bg-violet-50 text-violet-600", label: "IMG" },
  audio: { icon: FileAudio, cls: "bg-gold-50 text-gold-600", label: "AUDIO" },
  video: { icon: FileVideo, cls: "bg-navy-50 text-navy-700", label: "VIDEO" },
  file: { icon: File, cls: "bg-canvas text-muted", label: "FILE" },
};

export default function FileIcon({ file, className }) {
  const { icon: I, cls } = MAP[fileKind(file)];
  return (
    <span className={cn("flex shrink-0 items-center justify-center rounded-md", cls, className || "size-9")}>
      <I className="size-4" />
    </span>
  );
}
