import { LEVELS } from "@/lib/constants";

/**
 * The placement test.
 *
 * Thirty questions, six per CEFR level, ordered A1 → C1. Each one targets a
 * structure that genuinely belongs to its level — articles and present tense at
 * A1, Perfekt and dative at A2, Konjunktiv II and relative clauses at B1,
 * passive with modals and indirect speech at B2, extended participles and
 * formal connectors at C1.
 *
 * Correct answers live here, on the server, and never reach the browser before
 * the test is submitted: the page sends only the question text and options to
 * the client, and grading happens in a server action.
 */

const QUESTIONS = [
  /* ------------------------------------------------------------------- A1 */
  { id: "a1_1", level: "A1", text: "___ Buch liegt auf dem Tisch.", options: ["Das", "Der", "Die", "Den"], answer: 0 },
  { id: "a1_2", level: "A1", text: "Ich ___ aus Ägypten.", options: ["komme", "kommst", "kommt", "kommen"], answer: 0 },
  { id: "a1_3", level: "A1", text: "___ ist dein Name?", options: ["Wie", "Was", "Wer", "Wo"], answer: 0 },
  { id: "a1_4", level: "A1", text: "Er ___ einen Bruder und eine Schwester.", options: ["hat", "habe", "haben", "hast"], answer: 0 },
  { id: "a1_5", level: "A1", text: "Nächste Woche fahren wir ___ Berlin.", options: ["nach", "zu", "an", "auf"], answer: 0 },
  { id: "a1_6", level: "A1", text: "Es ist 7:30 Uhr. Wie sagt man das?", options: ["halb acht", "halb sieben", "sieben halb", "acht halb"], answer: 0 },

  /* ------------------------------------------------------------------- A2 */
  { id: "a2_1", level: "A2", text: "Gestern ___ ich ins Kino gegangen.", options: ["bin", "habe", "war", "hatte"], answer: 0 },
  { id: "a2_2", level: "A2", text: "Ich helfe ___ Mann mit dem Koffer.", options: ["dem", "den", "der", "des"], answer: 0 },
  { id: "a2_3", level: "A2", text: "Meine Schwester ist zwei Jahre ___ als ich.", options: ["älter", "alt", "am ältesten", "die älteste"], answer: 0 },
  { id: "a2_4", level: "A2", text: "Der Zug fährt um neun Uhr ___.", options: ["ab", "aus", "an", "auf"], answer: 0 },
  { id: "a2_5", level: "A2", text: "Ich bleibe heute zu Hause, ___ ich krank bin.", options: ["weil", "denn", "deshalb", "trotzdem"], answer: 0 },
  { id: "a2_6", level: "A2", text: "___ du mir bitte kurz helfen?", options: ["Kannst", "Kann", "Könnt", "Können"], answer: 0 },

  /* ------------------------------------------------------------------- B1 */
  { id: "b1_1", level: "B1", text: "Wenn ich mehr Zeit hätte, ___ ich öfter Sport machen.", options: ["würde", "werde", "wurde", "wäre"], answer: 0 },
  { id: "b1_2", level: "B1", text: "Das ist der Kollege, ___ ich gestern getroffen habe.", options: ["den", "dem", "der", "dessen"], answer: 0 },
  { id: "b1_3", level: "B1", text: "Das Rathaus ___ 1920 gebaut.", options: ["wurde", "wird", "ist", "hat"], answer: 0 },
  { id: "b1_4", level: "B1", text: "___ des schlechten Wetters blieben wir zu Hause.", options: ["Wegen", "Trotz", "Statt", "Innerhalb"], answer: 0 },
  { id: "b1_5", level: "B1", text: "Ich weiß noch nicht, ___ er morgen kommt.", options: ["ob", "wenn", "dass", "als"], answer: 0 },
  { id: "b1_6", level: "B1", text: "Im Park habe ich einen ___ Hund gesehen.", options: ["großen", "großer", "große", "großes"], answer: 0 },

  /* ------------------------------------------------------------------- B2 */
  { id: "b2_1", level: "B2", text: "Der Termin muss leider verschoben ___.", options: ["werden", "worden", "wurde", "sein"], answer: 0 },
  { id: "b2_2", level: "B2", text: "Er sagte, er ___ im Moment keine Zeit.", options: ["habe", "hat", "haben", "hatten"], answer: 0 },
  { id: "b2_3", level: "B2", text: "___ es stark regnete, gingen wir spazieren.", options: ["Obwohl", "Weil", "Damit", "Indem"], answer: 0 },
  { id: "b2_4", level: "B2", text: "Ich freue mich schon sehr ___ das Wochenende.", options: ["auf", "über", "für", "an"], answer: 0 },
  { id: "b2_5", level: "B2", text: "Die ___ Probleme müssen dringend gelöst werden.", options: ["bestehenden", "bestehend", "bestanden", "bestehende"], answer: 0 },
  { id: "b2_6", level: "B2", text: "Je mehr er übte, ___ sicherer wurde er.", options: ["desto", "so", "dann", "als"], answer: 0 },

  /* ------------------------------------------------------------------- C1 */
  { id: "c1_1", level: "C1", text: "Hätte ich das früher gewusst, ___ ich anders gehandelt.", options: ["hätte", "würde", "wäre", "hatte"], answer: 0 },
  { id: "c1_2", level: "C1", text: "Er besitzt keinen Cent, ___ ein Vermögen.", options: ["geschweige denn", "sondern", "trotzdem", "dennoch"], answer: 0 },
  { id: "c1_3", level: "C1", text: "Die von der Regierung ___ Maßnahmen wurden scharf kritisiert.", options: ["beschlossenen", "beschließenden", "beschlossen", "beschließend"], answer: 0 },
  { id: "c1_4", level: "C1", text: "„Es ist nicht auszuschließen, dass …“ bedeutet:", options: ["Es ist möglich.", "Es ist unmöglich.", "Es ist sicher.", "Es ist verboten."], answer: 0 },
  { id: "c1_5", level: "C1", text: "Sie nahm die Kritik ___ Kenntnis.", options: ["zur", "zu", "in", "auf"], answer: 0 },
  { id: "c1_6", level: "C1", text: "___ der Tatsache, dass er krank war, arbeitete er weiter.", options: ["Ungeachtet", "Aufgrund", "Infolge", "Anhand"], answer: 0 },
];

/** How many of a level's six questions must be right to count it as passed. */
const PASS_MARK = 4;
export const PER_LEVEL = 6;
export const TOTAL_QUESTIONS = QUESTIONS.length;

/**
 * A deterministic shuffle so the correct answer is not always first, while the
 * same question always presents its options in the same order (no reshuffling
 * between renders, and the stored index stays meaningful).
 */
function shuffled(question) {
  let seed = [...question.id].reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 7);
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const order = question.options.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return {
    order,
    options: order.map((i) => question.options[i]),
    answer: order.indexOf(question.answer),
  };
}

/** What the browser is given: no answers. */
export function publicQuestions() {
  return QUESTIONS.map((q) => {
    const { options } = shuffled(q);
    return { id: q.id, level: q.level, text: q.text, options };
  });
}

/**
 * Grades a set of answers.
 * `answers` maps a question id to the index the visitor chose.
 */
export function gradeAnswers(answers = {}) {
  const review = QUESTIONS.map((q) => {
    const { options, answer } = shuffled(q);
    const chosen = Number.isInteger(answers[q.id]) ? answers[q.id] : null;
    return {
      id: q.id,
      level: q.level,
      text: q.text,
      chosen,
      chosenText: chosen != null ? options[chosen] ?? null : null,
      correctText: options[answer],
      isCorrect: chosen === answer,
    };
  });

  const byLevel = LEVELS.map((level) => {
    const rows = review.filter((r) => r.level === level);
    const correct = rows.filter((r) => r.isCorrect).length;
    return { level, correct, total: rows.length, passed: correct >= PASS_MARK };
  });

  // Walk up from A1 and stop at the first level that was not reached: a learner
  // is placed at the highest level they have actually consolidated, not the
  // highest one they happened to guess a few answers in.
  let placed = null;
  for (const row of byLevel) {
    if (!row.passed) break;
    placed = row.level;
  }

  const correctTotal = review.filter((r) => r.isCorrect).length;

  return {
    // Someone who does not yet pass A1 still starts at A1 — it is the entry course.
    level: placed || LEVELS[0],
    reachedAny: Boolean(placed),
    correctTotal,
    total: review.length,
    percent: Math.round((correctTotal / review.length) * 100),
    byLevel,
    review,
  };
}
