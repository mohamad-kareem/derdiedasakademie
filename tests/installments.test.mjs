import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function load(path) {
  const source = await readFile(new URL(path, import.meta.url), "utf8");
  return import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
}
const { paymentBalance, paymentUpdate, installmentReminder, schoolToday } = await load("../lib/installments.js");
const { hasCourseAccess, courseAccessFilter } = await load("../lib/enrollment-access.js");

test("full and partial payments calculate the actual balance", () => {
  const partial = paymentUpdate(250, "partial", "100", "2026-10-10");
  assert.deepEqual(partial, { paymentStatus: "partial", paidAmount: 100, paymentDueDate: "2026-10-10" });
  assert.deepEqual(paymentBalance({ amount: 250, ...partial }), { total: 250, received: 100, remaining: 150 });
  assert.deepEqual(paymentUpdate(250, "full", "", ""), { paymentStatus: "paid", paidAmount: 250, paymentDueDate: "" });
  assert.equal(paymentBalance({ amount: 250, paymentStatus: "paid" }).remaining, 0);
  assert.equal(paymentBalance({ amount: 0.3, paymentStatus: "partial", paidAmount: 0.1 }).remaining, 0.2);
});

test("partial payment requires a positive amount below the total and a real due date", () => {
  for (const received of ["", "0", "-1", "250", "251", "abc", "1.001", "Infinity"]) {
    assert.equal(paymentUpdate(250, "partial", received, "2026-10-10").error, "installments.invalidAmount");
  }
  for (const date of ["", "2026-02-30", "wrong", "2026-13-01"]) {
    assert.equal(paymentUpdate(250, "partial", "100", date).error, "installments.invalidDate");
  }
});

test("reminders start three calendar days before the due date and include overdue balances", () => {
  const enrollment = { status: "active", amount: 250, paymentStatus: "partial", paidAmount: 100, paymentDueDate: "2026-10-10" };
  assert.equal(installmentReminder(enrollment, "2026-10-06"), null);
  assert.deepEqual(installmentReminder(enrollment, "2026-10-07"), { days: 3, overdue: false });
  assert.deepEqual(installmentReminder(enrollment, "2026-10-10"), { days: 0, overdue: false });
  assert.deepEqual(installmentReminder(enrollment, "2026-10-11"), { days: -1, overdue: true });
  assert.equal(installmentReminder({ ...enrollment, paymentStatus: "paid" }, "2026-10-11"), null);
  assert.equal(installmentReminder({ ...enrollment, status: "cancelled" }, "2026-10-11"), null);
  assert.equal(schoolToday(new Date("2026-10-06T22:30:00Z")), "2026-10-07");
});

test("confirmed partial payments unlock approved courses without pretending the full amount was paid", () => {
  const enrollment = { status: "active", amount: 250, paymentStatus: "partial", paidAmount: 100 };
  assert.equal(hasCourseAccess(enrollment), true);
  assert.equal(hasCourseAccess({ ...enrollment, status: "pending" }), false);
  assert.equal(hasCourseAccess({ ...enrollment, paidAmount: 0 }), false);
  assert.equal(hasCourseAccess({ ...enrollment, paymentStatus: "unpaid" }), false);
  assert.ok(courseAccessFilter().$or.some((clause) => clause.paymentStatus === "partial" && clause.paidAmount.$gt === 0));
  assert.equal(paymentBalance(enrollment).remaining, 150);
});

test("installment deadlines and reminders never automatically revoke course access", () => {
  const enrollment = { status: "active", amount: 250, paymentStatus: "partial", paidAmount: 100, paymentDueDate: "2026-10-10" };
  for (const today of ["2026-10-01", "2026-10-07", "2026-10-10", "2026-10-11"]) {
    const before = { ...enrollment };
    installmentReminder(enrollment, today);
    assert.deepEqual(enrollment, before);
    assert.equal(hasCourseAccess(enrollment), true);
    assert.equal(hasCourseAccess(enrollment, { activeOnly: true }), true);
  }
  assert.equal("paymentDueDate" in courseAccessFilter(), false);
});
