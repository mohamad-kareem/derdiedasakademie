import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(new URL("../app/actions/payments.js", import.meta.url), "utf8");
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
function loadAction(name, nextName) {
  const start = source.indexOf(`export async function ${name}`);
  const end = nextName ? source.indexOf(`export async function ${nextName}`, start) : source.length;
  const fn = source.slice(start, end).trim();
  return new AsyncFunction("args", "actionUser", "isOwner", "str", "isId", "fail", "done", "User", "Enrollment", "revalidatePath",
    `const [${name === "saveBankAccount" ? "formData" : "enrollmentId, formData"}] = args;\n${fn.slice(fn.indexOf("{") + 1, fn.lastIndexOf("}"))}`);
}
const bank = loadAction("saveBankAccount", "setStudentPaymentMethod");
const method = loadAction("setStudentPaymentMethod");
const form = (values) => { const f = new FormData(); Object.entries(values).forEach(([k, v]) => f.set(k, v)); return f; };
function harness(user = { id: "student1", role: "student" }, matchedCount = 1) {
  const writes = [];
  const model = { updateOne: async (query, update) => { writes.push({ query, update }); return { matchedCount }; } };
  return { writes, call: (fn, ...args) => fn(args, async () => user, (u) => u?.role === "owner",
    (f, k, max) => String(f.get(k) || "").trim().slice(0, max), (id) => /^[a-f0-9]{24}$/.test(id),
    (error) => ({ ok: false, error }), (message) => ({ ok: true, message }), model, model, () => {}) };
}

test("only owners can configure the receiving bank", async () => {
  for (const role of ["teacher", "student"]) {
    const h = harness({ id: "u", role });
    assert.equal((await h.call(bank, form({}))).error, "errors.forbidden");
    assert.equal(h.writes.length, 0);
  }
});
test("bank configuration rejects partial details and invalid formats", async () => {
  const h = harness({ id: "owner1", role: "owner" });
  assert.equal((await h.call(bank, form({ bankName: "Bank" }))).error, "bank.incomplete");
  const base = { bankName: "Bank", bankAccountHolder: "Academy", bankCurrency: "EUR", bankAccountNumber: "123456" };
  assert.equal((await h.call(bank, form({ ...base, bankIban: "wrong" }))).error, "bank.invalidIban");
  assert.equal((await h.call(bank, form({ ...base, bankSwift: "wrong" }))).error, "bank.invalidSwift");
  assert.equal(h.writes.length, 0);
});
test("bank details normalize and can be removed", async () => {
  const h = harness({ id: "owner1", role: "owner" });
  assert.equal((await h.call(bank, form({ bankAccountHolder: "Academy", bankName: "Bank", bankIban: "DE89 3704 0044 0532 0130 00", bankCurrency: "eur", bankSwift: "COBADEFFXXX" }))).ok, true);
  assert.equal(h.writes[0].query._id, "owner1");
  assert.equal(h.writes[0].update.bankIban, "DE89370400440532013000");
  assert.equal(h.writes[0].update.bankCurrency, "EUR");
  assert.equal((await h.call(bank, form({}))).ok, true);
  assert.ok(Object.values(h.writes[1].update).every((v) => v === ""));
});
test("payment choice is scoped to the student's unpaid enrollment and never marks paid", async () => {
  const h = harness();
  const id = "6abe962d8a602e6ac556fe58";
  assert.equal((await h.call(method, id, form({ paymentMethod: "bank" }))).ok, true);
  assert.equal(h.writes[0].query.student, "student1");
  assert.deepEqual(h.writes[0].query.paymentStatus, { $in: ["unpaid", "partial"] });
  assert.deepEqual(h.writes[0].update, { paymentMethod: "bank" });
  assert.equal((await h.call(method, id, form({ paymentMethod: "other" }))).error, "whish.invalidMethod");
  assert.equal(h.writes.length, 1);
  const denied = harness(undefined, 0);
  assert.equal((await denied.call(method, id, form({ paymentMethod: "bank" }))).error, "errors.forbidden");
});
