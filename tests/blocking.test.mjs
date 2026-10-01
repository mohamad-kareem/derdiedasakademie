import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const source = await readFile(new URL("../app/actions/blocking.js", import.meta.url), "utf8");
const start = source.indexOf("export async function setStudentBlock");
const fn = source.slice(start);
const action = new AsyncFunction("studentId", "formData", "actionUser", "isOwner", "isId", "str", "fail", "done", "User", "revalidatePath", fn.slice(fn.indexOf("{") + 1, fn.lastIndexOf("}")));
function harness(role, matchedCount = 1) {
  const writes = [];
  return { writes, call: async (mode, reason = "") => {
    const form = new FormData(); form.set("mode", mode); form.set("blockReason", reason);
    return action("student1", form, async () => ({ id: "owner1", role }), (u) => u?.role === "owner", () => true,
      (f, k, max) => String(f.get(k) || "").trim().slice(0, max), (error) => ({ ok: false, error }), (message) => ({ ok: true, message }),
      { updateOne: async (query, update) => { writes.push({ query, update }); return { matchedCount }; } }, () => {});
  } };
}
test("only the owner can block students and a visible reason is required", async () => {
  for (const role of ["teacher", "student"]) {
    const h = harness(role); assert.equal((await h.call("block", "Reason")).error, "errors.forbidden"); assert.equal(h.writes.length, 0);
  }
  const h = harness("owner");
  assert.equal((await h.call("block", "   ")).error, "blocking.reasonRequired");
  assert.equal(h.writes.length, 0);
  assert.equal((await h.call("block", "Payment issue")).ok, true);
  assert.deepEqual(h.writes[0], { query: { _id: "student1", role: "student" }, update: { isBlocked: true, blockReason: "Payment issue" } });
  assert.equal((await h.call("unblock")).ok, true);
  assert.deepEqual(h.writes[1].update, { isBlocked: false, blockReason: "" });
});
test("blocked users cannot access course files or content even with an existing session", async () => {
  const accessSource = await readFile(new URL("../lib/access.js", import.meta.url), "utf8");
  for (const name of ["canUseCourse", "canReadKey"]) {
    const functionText = accessSource.slice(accessSource.indexOf(`export async function ${name}`));
    const text = functionText.match(/^[\s\S]*?\r?\n}/)[0];
    const body = text.slice(text.indexOf(") {") + 3, text.lastIndexOf("}"));
    if (name === "canUseCourse") {
      const fn = new AsyncFunction("user", "courseId", "isId", "activeOnly", body);
      assert.equal(await fn({ id: "s", isBlocked: true }, "course1", () => true, false), false);
    } else {
      const guard = new AsyncFunction("user", "key", "isId", body);
      assert.equal(await guard({ id: "s", isBlocked: true }, "courses/course1/file.pdf", () => true), false);
    }
  }
});
