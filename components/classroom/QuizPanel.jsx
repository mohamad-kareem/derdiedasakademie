"use client";

import { useState } from "react";
import { Plus, X, Play, Square, CheckCircle2, Loader2 } from "lucide-react";
import GermanKeyboard from "./GermanKeyboard";
import { useI18n } from "@/components/I18nProvider";
import { cn } from "@/lib/utils";

export function PollResults({ poll, counts, myChoice, showCorrect }) {
  const total = counts.reduce((a, b) => a + b, 0);
  return (
    <ul className="space-y-1.5">
      {poll.options.map((o, i) => {
        const pct = total ? Math.round((counts[i] / total) * 100) : 0;
        const correct = showCorrect && poll.correctIndex === i;
        const wrongMine = showCorrect && poll.correctIndex >= 0 && myChoice === i && !correct;
        return (
          <li key={i} className={cn("relative overflow-hidden rounded-lg border px-3 py-2 text-sm", correct ? "border-emerald-400" : wrongMine ? "border-red-400" : "border-white/10")}>
            <div className={cn("absolute inset-y-0 start-0", correct ? "bg-emerald-500/30" : "bg-white/10")} style={{ width: `${pct}%` }} />
            <div className="relative flex items-center gap-2">
              {correct && <CheckCircle2 className="size-4 text-emerald-400" />}
              <span className="flex-1" dir="auto">{o}{myChoice === i && " ●"}</span>
              <span className="text-xs text-white/70">{counts[i]} · {pct}%</span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function PollAnswer({ poll, myChoice, onAnswer }) {
  return (
    <div className="grid gap-1.5">
      {poll.options.map((o, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onAnswer(i)}
          className={cn("rounded-lg border px-3 py-2 text-start text-sm transition", myChoice === i ? "border-gold-400 bg-gold-500 text-white" : "border-white/15 bg-white/5 text-white hover:border-gold-400")}
          dir="auto"
        >
          <span className="me-2 font-bold opacity-70">{String.fromCharCode(65 + i)}</span>
          {o}
        </button>
      ))}
    </div>
  );
}

export default function QuizPanel({ isTeacher, poll, counts, myChoice, lastClosed, participantsCount, onCreate, onClose, onAnswer }) {
  const { t } = useI18n();
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [correct, setCorrect] = useState(-1);
  const [busy, setBusy] = useState(false);

  async function start(e) {
    e.preventDefault();
    setBusy(true);
    const ok = await onCreate({ question, options, correctIndex: correct });
    setBusy(false);
    if (ok) {
      setQuestion("");
      setOptions(["", ""]);
      setCorrect(-1);
    }
  }

  const answered = counts.reduce((a, b) => a + b, 0);

  return (
    <div className="h-full space-y-4 overflow-y-auto p-3 text-white">
      {poll ? (
        <div className="rounded-xl border border-gold-500/40 bg-gold-500/10 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gold-400">{t("classroom.quiz.live")}</p>
          <p className="mt-1 font-semibold" dir="auto">{poll.question}</p>
          <div className="mt-3">
            {isTeacher ? <PollResults poll={poll} counts={counts} /> : <PollAnswer poll={poll} myChoice={myChoice} onAnswer={onAnswer} />}
          </div>
          {isTeacher ? (
            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs text-white/60">{t("classroom.quiz.answered", { n: answered, total: Math.max(0, participantsCount - 1) })}</span>
              <button type="button" onClick={onClose} className="btn btn-sm bg-white text-navy-900 hover:bg-cream"><Square className="size-3.5" /> {t("classroom.quiz.end")}</button>
            </div>
          ) : (
            <p className="mt-2 text-xs text-white/50">{myChoice >= 0 ? t("classroom.quiz.saved") : t("classroom.quiz.pick")}</p>
          )}
        </div>
      ) : lastClosed ? (
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-white/50">{t("classroom.quiz.results")}</p>
          <p className="mt-1 font-semibold" dir="auto">{lastClosed.poll.question}</p>
          <div className="mt-3"><PollResults poll={lastClosed.poll} counts={lastClosed.counts} myChoice={myChoice} showCorrect /></div>
        </div>
      ) : (
        !isTeacher && <p className="py-10 text-center text-sm text-white/40">{t("classroom.quiz.waiting")}</p>
      )}

      {isTeacher && !poll && (
        <form onSubmit={start} className="space-y-2 rounded-xl border border-white/10 p-3">
          <p className="text-sm font-semibold">{t("classroom.quiz.new")}</p>
          <textarea value={question} onChange={(e) => setQuestion(e.target.value)} rows={2} required placeholder={t("classroom.quiz.question")} className="w-full resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm placeholder:text-white/35 focus:border-gold-400 focus:outline-none" dir="auto" />
          {options.map((o, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <button type="button" onClick={() => setCorrect(correct === i ? -1 : i)} className={cn("flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold", correct === i ? "border-emerald-400 bg-emerald-500 text-white" : "border-white/20 text-white/60")} title={t("classroom.quiz.markCorrect")}>
                {String.fromCharCode(65 + i)}
              </button>
              <input value={o} onChange={(e) => setOptions(options.map((x, j) => (j === i ? e.target.value : x)))} required placeholder={t("classroom.quiz.option", { n: i + 1 })} className="h-9 min-w-0 flex-1 rounded-lg border border-white/10 bg-white/5 px-3 text-sm placeholder:text-white/35 focus:border-gold-400 focus:outline-none" dir="auto" />
              {options.length > 2 && (
                <button type="button" onClick={() => { setOptions(options.filter((_, j) => j !== i)); setCorrect(-1); }} className="rounded p-1 text-white/40 hover:text-white"><X className="size-4" /></button>
              )}
            </div>
          ))}
          <GermanKeyboard />
          <div className="flex items-center justify-between pt-1">
            <button type="button" disabled={options.length >= 6} onClick={() => setOptions([...options, ""])} className="btn btn-sm bg-white/10 text-white hover:bg-white/20"><Plus className="size-3.5" /> {t("classroom.quiz.addOption")}</button>
            <button type="submit" disabled={busy} className="btn btn-gold btn-sm">{busy ? <Loader2 className="size-3.5 animate-spin" /> : <Play className="size-3.5" />} {t("classroom.quiz.start")}</button>
          </div>
          <p className="text-[11px] text-white/40">{t("classroom.quiz.correctHint")}</p>
          <div className="flex flex-wrap gap-1.5 pt-1">
            <button type="button" onClick={() => { setOptions(["der", "die", "das"]); setCorrect(-1); }} className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] hover:bg-white/20">{t("classroom.quiz.templateArticle")}</button>
            <button type="button" onClick={() => { setOptions([t("classroom.quiz.true"), t("classroom.quiz.false")]); setCorrect(-1); }} className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] hover:bg-white/20">{t("classroom.quiz.templateTrueFalse")}</button>
          </div>
        </form>
      )}
    </div>
  );
}
