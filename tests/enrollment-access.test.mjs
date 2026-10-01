import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

// Load the same dependency-free policy used by server queries and client UI.
const source = await readFile(new URL("../lib/enrollment-access.js", import.meta.url), "utf8");
const { hasCourseAccess, courseAccessFilter } = await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);

test("paid courses require both approval and verified payment", () => {
  for (const status of ["active", "completed"]) {
    assert.equal(hasCourseAccess({ status, paymentStatus: "unpaid", amount: 150 }), false);
    assert.equal(hasCourseAccess({ status, paymentStatus: "paid", amount: 150 }), true);
  }
  for (const status of ["pending", "rejected", "cancelled"]) {
    assert.equal(hasCourseAccess({ status, paymentStatus: "paid", amount: 150 }), false);
    assert.equal(hasCourseAccess({ status, paymentStatus: "unpaid", amount: 0 }), false);
  }
});

test("free approved enrollments are accessible; missing data does not unlock access", () => {
  assert.equal(hasCourseAccess({ status: "active", paymentStatus: "unpaid", amount: 0 }), true);
  assert.equal(hasCourseAccess({ status: "completed", paymentStatus: "unpaid", amount: 0 }), true);
  assert.equal(hasCourseAccess(null), false);
  assert.equal(hasCourseAccess({ status: "active", paymentStatus: "unpaid" }), false);
});

test("marking paid unlocks access and marking unpaid revokes it", () => {
  const enrollment = { status: "active", amount: 150, paymentStatus: "unpaid" };
  assert.equal(hasCourseAccess(enrollment), false);
  enrollment.paymentStatus = "paid";
  assert.equal(hasCourseAccess(enrollment), true);
  enrollment.paymentStatus = "unpaid";
  assert.equal(hasCourseAccess(enrollment), false);
});

test("classroom access excludes completed enrollments even when paid", () => {
  assert.equal(hasCourseAccess({ status: "completed", paymentStatus: "paid", amount: 150 }, { activeOnly: true }), false);
  assert.equal(hasCourseAccess({ status: "active", paymentStatus: "paid", amount: 150 }, { activeOnly: true }), true);
});

test("database policy agrees with the UI policy for all enrollment states", () => {
  for (const activeOnly of [false, true]) {
    const query = courseAccessFilter({ activeOnly });
    for (const status of ["pending", "active", "completed", "cancelled", "rejected"]) {
      for (const paymentStatus of ["unpaid", "paid"]) {
        for (const amount of [0, 150]) {
          const matches = query.status.$in.includes(status) &&
            query.$or.some((clause) => clause.paymentStatus === paymentStatus ||
              (clause.amount && amount <= clause.amount.$lte));
          assert.equal(Boolean(matches), hasCourseAccess({ status, paymentStatus, amount }, { activeOnly }));
        }
      }
    }
  }
});
