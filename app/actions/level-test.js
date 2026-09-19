"use server";

import { gradeAnswers, TOTAL_QUESTIONS } from "@/lib/level-test";

/**
 * Grades a submitted placement test.
 *
 * Grading happens here rather than in the browser so the answer key is never
 * shipped to the page. Nothing is stored: the test is anonymous.
 */
export async function gradeLevelTest(answers) {
  if (!answers || typeof answers !== "object" || Array.isArray(answers)) {
    return { ok: false };
  }
  const clean = {};
  for (const [id, value] of Object.entries(answers)) {
    if (typeof id !== "string" || id.length > 20) continue;
    if (Number.isInteger(value) && value >= 0 && value <= 3) clean[id] = value;
  }
  if (Object.keys(clean).length > TOTAL_QUESTIONS) return { ok: false };

  return { ok: true, result: gradeAnswers(clean) };
}
