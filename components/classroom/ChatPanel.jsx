"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Paperclip, Loader2, Keyboard } from "lucide-react";
import GermanKeyboard from "./GermanKeyboard";
import FileIcon from "@/components/files/FileIcon";
import { useI18n } from "@/components/I18nProvider";
import { uploadFile } from "@/lib/upload-client";
import { fileKind, fileUrl, formatBytes, ACCEPT } from "@/lib/files-client";
import { cn, formatTime } from "@/lib/utils";

export default function ChatPanel({ messages, me, courseId, storage, onSend }) {
  const { t, locale } = useI18n();
  const [text, setText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [showKeys, setShowKeys] = useState(false);
  const listRef = useRef(null);
  const fileRef = useRef(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  async function submit(e) {
    e?.preventDefault();
    const value = text.trim();
    if (!value) return;
    setText("");
    await onSend({ text: value });
  }

  async function attach(file) {
    if (!file) return;
    setUploading(true);
    try {
      const saved = await uploadFile(file, { scope: "chat", courseId });
      await onSend({ text: text.trim(), attachment: saved });
      setText("");
    } catch (err) {
      await onSend({ error: String(err.message || "files.uploadFailed") });
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
        {messages.length === 0 && <p className="py-10 text-center text-sm text-white/40">{t("classroom.chat.empty")}</p>}
        {messages.map((m) => {
          const mine = m.user === me;
          return (
            <div key={m._id} className={cn("flex flex-col", mine ? "items-end" : "items-start")}>
              <p className="mb-0.5 px-1 text-[11px] text-white/45">
                <span className={cn("font-semibold", m.role === "teacher" ? "text-gold-400" : "text-white/70")}>{mine ? t("classroom.you") : m.name}</span> · {formatTime(m.createdAt, locale)}
              </p>
              <div className={cn("max-w-[90%] rounded-2xl px-3 py-2 text-sm", mine ? "rounded-ee-sm bg-gold-500 text-white" : "rounded-es-sm bg-white/10 text-white")}>
                {m.text && <p className="whitespace-pre-wrap break-words" dir="auto">{m.text}</p>}
                {m.attachment && (
                  fileKind(m.attachment) === "image" ? (
                    <a href={fileUrl(m.attachment, { inline: true })} target="_blank" rel="noopener noreferrer" className="mt-1 block">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={fileUrl(m.attachment, { inline: true })} alt={m.attachment.name} className="max-h-48 rounded-lg" />
                    </a>
                  ) : (
                    <a href={fileUrl(m.attachment)} className="mt-1 flex items-center gap-2 rounded-lg bg-black/20 p-2 hover:bg-black/30">
                      <FileIcon file={m.attachment} className="size-8" />
                      <span className="min-w-0">
                        <span className="block truncate text-xs font-medium" dir="ltr">{m.attachment.name}</span>
                        <span className="block text-[10px] opacity-70">{formatBytes(m.attachment.size)}</span>
                      </span>
                    </a>
                  )
                )}
              </div>
            </div>
          );
        })}
      </div>
      <form onSubmit={submit} className="border-t border-white/10 p-2">
        {showKeys && <GermanKeyboard className="mb-2" />}
        <div className="flex items-end gap-1.5">
          <input ref={fileRef} type="file" accept={ACCEPT} className="hidden" onChange={(e) => { attach(e.target.files?.[0]); e.target.value = ""; }} />
          {storage && (
            <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="flex size-9 shrink-0 items-center justify-center rounded-lg text-white/60 hover:bg-white/10 hover:text-white" title={t("classroom.chat.attach")}>
              {uploading ? <Loader2 className="size-4 animate-spin" /> : <Paperclip className="size-4" />}
            </button>
          )}
          <button type="button" onClick={() => setShowKeys((v) => !v)} className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg hover:bg-white/10", showKeys ? "text-gold-400" : "text-white/60")} title={t("classroom.keyboard")}>
            <Keyboard className="size-4" />
          </button>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            rows={1}
            placeholder={t("classroom.chat.placeholder")}
            className="max-h-28 min-h-9 flex-1 resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/35 focus:border-gold-400 focus:outline-none"
            dir="auto"
            data-chat-input
          />
          <button type="submit" disabled={!text.trim()} className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-gold-500 text-white disabled:opacity-40" aria-label={t("classroom.chat.send")}>
            <Send className="size-4 rtl:-scale-x-100" />
          </button>
        </div>
      </form>
    </div>
  );
}
