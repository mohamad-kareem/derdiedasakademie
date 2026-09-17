"use client";

import { useState } from "react";
import { Plus, Trash2, Presentation, Loader2 } from "lucide-react";
import GermanKeyboard from "./GermanKeyboard";
import { ARTICLE_COLORS } from "./boardDraw";
import { useI18n } from "@/components/I18nProvider";
import { cn } from "@/lib/utils";

export default function WordsPanel({ isTeacher, vocab, onAdd, onDelete, onSpotlight }) {
  const { t } = useI18n();
  const [form, setForm] = useState({ article: "der", word: "", plural: "", meaning: "", example: "" });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    const ok = await onAdd(form);
    setBusy(false);
    if (ok) setForm({ ...form, word: "", plural: "", meaning: "", example: "" });
  }

  return (
    <div className="flex h-full min-h-0 flex-col text-white">
      {isTeacher && (
        <form onSubmit={submit} className="space-y-2 border-b border-white/10 p-3">
          <div className="flex gap-1">
            {["der", "die", "das", "none"].map((a) => (
              <button key={a} type="button" onClick={() => setForm({ ...form, article: a })} className={cn("h-8 flex-1 rounded-md text-xs font-bold transition", form.article === a ? "text-white" : "bg-white/5 text-white/60 hover:bg-white/10")} style={form.article === a ? { background: ARTICLE_COLORS[a] } : undefined}>
                {a === "none" ? "—" : a}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <input value={form.word} onChange={set("word")} required placeholder={t("classroom.words.word")} className="h-9 rounded-lg border border-white/10 bg-white/5 px-3 text-sm placeholder:text-white/35 focus:border-gold-400 focus:outline-none" dir="ltr" />
            <input value={form.plural} onChange={set("plural")} placeholder={t("classroom.words.plural")} className="h-9 rounded-lg border border-white/10 bg-white/5 px-3 text-sm placeholder:text-white/35 focus:border-gold-400 focus:outline-none" dir="ltr" />
          </div>
          <input value={form.meaning} onChange={set("meaning")} placeholder={t("classroom.words.meaning")} className="h-9 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-sm placeholder:text-white/35 focus:border-gold-400 focus:outline-none" dir="auto" />
          <input value={form.example} onChange={set("example")} placeholder={t("classroom.words.example")} className="h-9 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-sm placeholder:text-white/35 focus:border-gold-400 focus:outline-none" dir="ltr" />
          <div className="flex items-center justify-between gap-2">
            <GermanKeyboard />
            <button type="submit" disabled={busy} className="btn btn-gold btn-sm shrink-0">{busy ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />} {t("classroom.words.add")}</button>
          </div>
        </form>
      )}
      <ul className="flex-1 space-y-1.5 overflow-y-auto p-3">
        {vocab.length === 0 && <p className="py-10 text-center text-sm text-white/40">{t("classroom.words.empty")}</p>}
        {vocab.map((v) => (
          <li key={v._id} className="group rounded-lg border border-white/10 bg-white/5 p-2.5">
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1" dir="ltr">
                <p className="text-sm font-semibold">
                  {v.article !== "none" && <span style={{ color: ARTICLE_COLORS[v.article] }} className="me-1">{v.article}</span>}
                  {v.word}
                  {v.plural && <span className="ms-1.5 text-xs font-normal text-white/50">· {v.plural}</span>}
                </p>
                {v.meaning && <p className="text-xs text-white/70" dir="auto">{v.meaning}</p>}
                {v.example && <p className="mt-0.5 text-xs italic text-white/45">„{v.example}“</p>}
              </div>
              {isTeacher && (
                <div className="flex gap-0.5 opacity-60 group-hover:opacity-100">
                  <button type="button" onClick={() => onSpotlight(v)} className="rounded p-1 hover:bg-white/10" title={t("classroom.words.spotlight")}><Presentation className="size-3.5" /></button>
                  <button type="button" onClick={() => onDelete(v._id)} className="rounded p-1 hover:bg-red-600" title={t("common.delete")}><Trash2 className="size-3.5" /></button>
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
      {!isTeacher && vocab.length > 0 && <p className="border-t border-white/10 px-3 py-2 text-[11px] text-white/40">{t("classroom.words.savedHint")}</p>}
    </div>
  );
}
