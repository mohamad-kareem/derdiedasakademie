"use client";

import { useMemo, useState } from "react";
import { RotateCcw, ChevronLeft, ChevronRight, Shuffle, Check, X, Layers, Target, List } from "lucide-react";
import { useI18n } from "@/components/I18nProvider";
import { ARTICLE_COLORS } from "@/components/classroom/boardDraw";
import { cn } from "@/lib/utils";

function shuffle(list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function Word({ v, big }) {
  return (
    <span dir="ltr">
      {v.article !== "none" && <span style={{ color: ARTICLE_COLORS[v.article] }}>{v.article} </span>}
      <span className={big ? "font-bold" : "font-semibold"}>{v.word}</span>
    </span>
  );
}

export default function VocabPractice({ items }) {
  const { t } = useI18n();
  const [mode, setMode] = useState("cards");
  const [deck, setDeck] = useState(items);
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const withArticle = useMemo(() => items.filter((v) => v.article !== "none"), [items]);
  const [quiz, setQuiz] = useState(() => ({ order: withArticle, i: 0, score: 0, answer: null }));

  const card = deck[i];
  const q = quiz.order[quiz.i];

  function answer(article) {
    if (quiz.answer) return;
    setQuiz({ ...quiz, answer: article, score: quiz.score + (article === q.article ? 1 : 0) });
  }
  function nextQ() {
    setQuiz({ ...quiz, i: quiz.i + 1, answer: null });
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap gap-1 rounded-[3px] border border-line bg-white p-1 sm:inline-flex">
        {[
          { id: "cards", icon: Layers },
          { id: "quiz", icon: Target },
          { id: "list", icon: List },
        ].map(({ id, icon: I }) => (
          <button key={id} type="button" onClick={() => setMode(id)} className={cn("flex items-center gap-1.5 rounded-[3px] px-3 py-1.5 text-sm font-medium", mode === id ? "bg-navy-900 text-white" : "text-muted hover:bg-canvas")}>
            <I className="size-4" /> {t(`vocab.modes.${id}`)}
          </button>
        ))}
      </div>

      {mode === "cards" && card && (
        <div className="mx-auto max-w-xl">
          <button type="button" onClick={() => setFlipped((f) => !f)} className="card flex aspect-[3/2] w-full flex-col items-center justify-center p-8 text-center transition hover:shadow-sm">
            {!flipped ? (
              <>
                <p className="text-4xl text-navy-900 sm:text-5xl"><Word v={card} big /></p>
                {card.plural && <p className="mt-3 text-sm text-muted" dir="ltr">Pl. {card.plural}</p>}
                <p className="mt-6 text-xs text-muted">{t("vocab.tapToFlip")}</p>
              </>
            ) : (
              <>
                <p className="text-2xl font-semibold text-navy-900" dir="auto">{card.meaning || "—"}</p>
                {card.example && <p className="mt-4 text-base italic text-muted" dir="ltr">„{card.example}“</p>}
              </>
            )}
          </button>
          <div className="mt-4 flex items-center justify-between">
            <button type="button" disabled={i === 0} onClick={() => { setI(i - 1); setFlipped(false); }} className="btn btn-outline"><ChevronLeft className="size-4 rtl:rotate-180" /></button>
            <div className="flex items-center gap-2 text-sm text-muted">
              <span dir="ltr">{i + 1} / {deck.length}</span>
              <button type="button" onClick={() => { setDeck(shuffle(items)); setI(0); setFlipped(false); }} className="btn btn-ghost btn-sm"><Shuffle className="size-3.5" /> {t("vocab.shuffle")}</button>
            </div>
            <button type="button" disabled={i >= deck.length - 1} onClick={() => { setI(i + 1); setFlipped(false); }} className="btn btn-outline"><ChevronRight className="size-4 rtl:rotate-180" /></button>
          </div>
        </div>
      )}

      {mode === "quiz" && (
        <div className="mx-auto max-w-xl">
          {withArticle.length === 0 ? (
            <p className="card p-8 text-center text-sm text-muted">{t("vocab.noNouns")}</p>
          ) : q ? (
            <div className="card p-8 text-center">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">{t("vocab.whichArticle")} · <span dir="ltr">{quiz.i + 1}/{quiz.order.length}</span></p>
              <p className="mt-4 text-5xl font-bold text-navy-900" dir="ltr">{q.word}</p>
              {q.meaning && <p className="mt-2 text-sm text-muted" dir="auto">{q.meaning}</p>}
              <div className="mt-8 grid grid-cols-3 gap-3" dir="ltr">
                {["der", "die", "das"].map((a) => {
                  const chosen = quiz.answer === a;
                  const correct = quiz.answer && q.article === a;
                  return (
                    <button
                      key={a}
                      type="button"
                      onClick={() => answer(a)}
                      className={cn("h-14 rounded-[3px] border-2 text-xl font-bold transition", correct ? "border-emerald-500 bg-emerald-50" : chosen ? "border-red-500 bg-red-50" : "border-line hover:border-navy-600/40")}
                      style={{ color: ARTICLE_COLORS[a] }}
                    >
                      {a}
                    </button>
                  );
                })}
              </div>
              {quiz.answer && (
                <div className="mt-6 flex items-center justify-between">
                  <p className={cn("flex items-center gap-1.5 text-sm font-semibold", quiz.answer === q.article ? "text-emerald-700" : "text-red-600")}>
                    {quiz.answer === q.article ? <Check className="size-4" /> : <X className="size-4" />}
                    <Word v={q} />
                  </p>
                  <button type="button" onClick={nextQ} className="btn btn-primary">{t("vocab.next")}</button>
                </div>
              )}
            </div>
          ) : (
            <div className="card p-8 text-center">
              <p className="text-5xl font-bold text-navy-900" dir="ltr">{quiz.score} / {quiz.order.length}</p>
              <p className="mt-2 text-muted">{t("vocab.finished")}</p>
              <button type="button" onClick={() => setQuiz({ order: shuffle(withArticle), i: 0, score: 0, answer: null })} className="btn btn-primary mt-6"><RotateCcw className="size-4" /> {t("vocab.again")}</button>
            </div>
          )}
        </div>
      )}

      {mode === "list" && (
        <div className="card divide-y divide-line">
          {items.map((v) => (
            <div key={v._id} className="grid gap-1 px-4 py-3 sm:grid-cols-3">
              <p className="text-sm"><Word v={v} />{v.plural && <span className="ms-2 text-xs text-muted" dir="ltr">· {v.plural}</span>}</p>
              <p className="text-sm text-ink/80" dir="auto">{v.meaning}</p>
              <p className="text-xs italic text-muted" dir="ltr">{v.example}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
