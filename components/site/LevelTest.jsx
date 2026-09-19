"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, ArrowLeft, Check, X, Loader2, ClipboardCheck, Clock, UserX, ChevronDown } from "lucide-react";
import { useI18n } from "@/components/I18nProvider";
import { gradeLevelTest } from "@/app/actions/level-test";
import { cn } from "@/lib/utils";

/**
 * The placement test, taken in three acts: a short briefing, one question at a
 * time, then the result.
 *
 * Questions arrive without their answers; the finished set goes to a server
 * action which grades it. Nothing is stored and nothing is asked of the
 * visitor — no name, no email, no account.
 */
export default function LevelTest({ questions }) {
  const { t, locale } = useI18n();
  const [stage, setStage] = useState("intro"); // intro · test · result
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const total = questions.length;
  const question = questions[index];
  const chosen = question ? answers[question.id] : undefined;
  const answered = Object.keys(answers).length;
  const isLast = index === total - 1;

  // 1–4 pick an option, Enter moves on: a keyboard-first test feels like a test.
  useEffect(() => {
    if (stage !== "test") return undefined;
    const onKey = (e) => {
      if (["1", "2", "3", "4"].includes(e.key)) {
        const i = Number(e.key) - 1;
        if (i < question.options.length) setAnswers((a) => ({ ...a, [question.id]: i }));
      }
      if (e.key === "Enter" && answers[question.id] !== undefined) {
        e.preventDefault();
        next();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  async function finish(final) {
    setBusy(true);
    setError("");
    try {
      const res = await gradeLevelTest(final);
      if (!res?.ok) throw new Error("failed");
      setResult(res.result);
      setStage("result");
      window.scrollTo({ top: 0 });
    } catch {
      setError(t("test.error"));
    } finally {
      setBusy(false);
    }
  }

  function next() {
    if (answers[question.id] === undefined) return;
    if (isLast) finish(answers);
    else setIndex((i) => i + 1);
  }

  /* ------------------------------------------------------------------ intro */
  if (stage === "intro") {
    const facts = [
      { icon: ClipboardCheck, text: t("test.facts.questions", { n: total }) },
      { icon: Clock, text: t("test.facts.minutes") },
      { icon: UserX, text: t("test.facts.noSignup") },
    ];
    return (
      <div className="card p-5 sm:p-7">
        <p className="eyebrow">{t("test.intro.eyebrow")}</p>
        <h2 className="mt-2 font-display text-[24px] font-semibold tracking-tight text-navy-900">{t("test.intro.title")}</h2>
        <div className="mt-3 h-[3px] w-16 flag-stripe" />
        <p className="mt-4 max-w-2xl text-[14.5px] leading-relaxed text-muted">{t("test.intro.text")}</p>

        <dl className="mt-6 grid gap-px overflow-hidden border border-line bg-line sm:grid-cols-3">
          {facts.map(({ icon: I, text }) => (
            <div key={text} className="flex items-center gap-2.5 bg-white px-3.5 py-3">
              <I className="size-4 shrink-0 text-gold-600" />
              <span className="text-[13px] font-medium text-ink">{text}</span>
            </div>
          ))}
        </dl>

        <ol className="mt-6 space-y-1.5 border-t border-line pt-5 text-[13.5px] text-ink/80">
          {["a", "b", "c"].map((k, i) => (
            <li key={k} className="flex gap-2.5">
              <span className="mt-px font-display text-[13px] font-semibold text-gold-600 tabular">{i + 1}.</span>
              {t(`test.intro.rules.${k}`)}
            </li>
          ))}
        </ol>

        <button type="button" onClick={() => setStage("test")} className="btn btn-primary btn-lg mt-7">
          {t("test.intro.start")} <ArrowRight className="size-4 rtl:rotate-180" />
        </button>
      </div>
    );
  }

  /* ------------------------------------------------------------------- test */
  if (stage === "test") {
    const percent = Math.round((index / total) * 100);
    return (
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-line bg-cream px-4 py-2.5">
          <span className="text-[11px] font-semibold uppercase tracking-[0.07em] text-muted">
            {t("test.progress", { n: index + 1, total })}
          </span>
          <span className="text-[11px] text-muted tabular">{t("test.answered", { n: answered, total })}</span>
        </div>
        <div className="h-1 bg-canvas">
          <div className="h-full bg-navy-700 transition-[width] duration-200" style={{ width: `${percent}%` }} />
        </div>

        <div className="p-5 sm:p-7">
          <p className="font-display text-[20px] font-semibold leading-snug text-navy-900 sm:text-[22px]" dir="ltr" lang="de">
            {question.text}
          </p>

          <div className="mt-5 grid gap-2" role="radiogroup" aria-label={t("test.progress", { n: index + 1, total })}>
            {question.options.map((option, i) => {
              const active = chosen === i;
              return (
                <button
                  key={option}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setAnswers((a) => ({ ...a, [question.id]: i }))}
                  className={cn(
                    "flex items-center gap-3 rounded-[3px] border px-3.5 py-2.5 text-start transition-colors",
                    active ? "border-navy-700 bg-navy-50" : "border-line bg-white hover:border-navy-600 hover:bg-cream",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-6 shrink-0 items-center justify-center rounded-[2px] border text-[11px] font-bold tabular",
                      active ? "border-navy-700 bg-navy-900 text-white" : "border-line-strong bg-cream text-muted",
                    )}
                  >
                    {i + 1}
                  </span>
                  <span className="text-[14.5px] text-ink" dir="ltr" lang="de">{option}</span>
                </button>
              );
            })}
          </div>

          {error && <p className="mt-4 text-[13px] font-semibold text-red-700">{error}</p>}

          <div className="mt-6 flex items-center justify-between gap-3 border-t border-line pt-4">
            <button
              type="button"
              onClick={() => setIndex((i) => Math.max(0, i - 1))}
              disabled={index === 0 || busy}
              className="btn btn-outline btn-sm"
            >
              <ArrowLeft className="size-3.5 rtl:rotate-180" /> {t("test.back")}
            </button>
            <p className="hidden text-[11px] text-muted sm:block">{t("test.hint")}</p>
            <button type="button" onClick={next} disabled={chosen === undefined || busy} className="btn btn-primary">
              {busy && <Loader2 className="size-4 animate-spin" />}
              {isLast ? t("test.finish") : t("test.next")}
              {!busy && <ArrowRight className="size-4 rtl:rotate-180" />}
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ----------------------------------------------------------------- result */
  const levelName = t(`levels.${result.level}.name`);
  return (
    <div className="space-y-5">
      <div className="card overflow-hidden">
        <div className="border-b border-line bg-cream px-4 py-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-muted">{t("test.result.eyebrow")}</p>
        </div>

        <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <div className="flex items-end gap-4">
              <span className="font-display text-[64px] font-semibold leading-none text-navy-900" dir="ltr">{result.level}</span>
              <span className="pb-2">
                <span className="block text-[15px] font-semibold text-ink">{levelName}</span>
                <span className="block text-[12px] uppercase tracking-[0.07em] text-gold-600">{t(`levels.${result.level}.stage`)}</span>
              </span>
            </div>
            <div className="mt-4 h-[3px] w-20 flag-stripe" />
            <p className="mt-4 text-[13.5px] leading-relaxed text-muted">{t(`levels.${result.level}.desc`)}</p>
            {!result.reachedAny && <p className="mt-3 text-[13px] leading-relaxed text-ink/80">{t("test.result.beginner")}</p>}

            <p className="mt-5 border-t border-line pt-4 text-[13px] text-muted">
              <span className="font-semibold text-navy-900 tabular">
                {t("test.result.score", { correct: result.correctTotal, total: result.total, percent: result.percent })}
              </span>
            </p>
          </div>

          {/* one measure, one hue — a tick marks a level that was consolidated */}
          <div className="lg:col-span-7">
            <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-muted">{t("test.result.breakdown")}</p>
            <div className="mt-3 divide-y divide-line border-y border-line">
              {result.byLevel.map((row) => (
                <div key={row.level} className="flex items-center gap-3 py-2.5">
                  <span className="w-7 shrink-0 font-display text-[15px] font-semibold text-navy-900" dir="ltr">{row.level}</span>
                  <span className="h-1.5 flex-1 bg-canvas">
                    <span
                      className={cn("block h-full", row.passed ? "bg-navy-800" : "bg-navy-600/45")}
                      style={{ width: `${(row.correct / row.total) * 100}%` }}
                    />
                  </span>
                  <span className="w-12 shrink-0 text-end text-[12px] text-muted tabular">{row.correct}/{row.total}</span>
                  <span className="w-5 shrink-0">
                    {row.passed && <Check className="size-4 text-emerald-700" aria-label={t("test.result.passed")} />}
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-2.5 text-[11.5px] text-muted">{t("test.result.passMark")}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 border-t border-line bg-cream px-4 py-3.5 sm:px-7">
          <Link href={`/courses?level=${result.level}`} className="btn btn-primary">
            {t("test.result.seeCourses", { level: result.level })} <ArrowRight className="size-4 rtl:rotate-180" />
          </Link>
          <Link href="/#contact" className="btn btn-outline">{t("test.result.consultation")}</Link>
          <button
            type="button"
            onClick={() => {
              setAnswers({});
              setIndex(0);
              setResult(null);
              setStage("intro");
              window.scrollTo({ top: 0 });
            }}
            className="btn btn-ghost btn-sm ms-auto"
          >
            {t("test.result.retake")}
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------ review */}
      <details className="card group overflow-hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 bg-cream px-4 py-2.5">
          <span className="text-[11px] font-semibold uppercase tracking-[0.07em] text-navy-900">{t("test.result.review")}</span>
          <ChevronDown className="size-4 text-muted transition group-open:rotate-180" />
        </summary>
        <div className="divide-y divide-line">
          {result.review.map((r) => (
            <div key={r.id} className="flex gap-3 px-4 py-3">
              <span className="mt-0.5 shrink-0">
                {r.isCorrect ? <Check className="size-4 text-emerald-700" /> : <X className="size-4 text-red-700" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13.5px] font-medium text-ink" dir="ltr" lang="de">{r.text}</p>
                <p className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-[12px]">
                  <span className={r.isCorrect ? "text-muted" : "text-red-700"}>
                    {t("test.result.yourAnswer")}: <span dir="ltr" lang="de">{r.chosenText || t("test.result.noAnswer")}</span>
                  </span>
                  {!r.isCorrect && (
                    <span className="font-semibold text-emerald-800">
                      {t("test.result.correctAnswer")}: <span dir="ltr" lang="de">{r.correctText}</span>
                    </span>
                  )}
                </p>
              </div>
              <span className="shrink-0 text-[11px] font-semibold text-muted tabular" dir="ltr">{r.level}</span>
            </div>
          ))}
        </div>
      </details>

      <p className="text-[12px] leading-relaxed text-muted" lang={locale}>{t("test.result.disclaimer")}</p>
    </div>
  );
}
