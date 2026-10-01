/** Confirmed full or partial payment unlocks an approved enrollment. */
export function hasCourseAccess(enrollment, { activeOnly = false } = {}) {
  const statuses = activeOnly ? ["active"] : ["active", "completed"];
  return Boolean(enrollment && statuses.includes(enrollment.status) &&
    (enrollment.paymentStatus === "paid" ||
      (enrollment.paymentStatus === "partial" && enrollment.paidAmount > 0) ||
      (typeof enrollment.amount === "number" && enrollment.amount <= 0)));
}

export function courseAccessFilter({ activeOnly = false } = {}) {
  return {
    status: { $in: activeOnly ? ["active"] : ["active", "completed"] },
    $or: [{ paymentStatus: "paid" }, { paymentStatus: "partial", paidAmount: { $gt: 0 } }, { amount: { $lte: 0 } }],
  };
}
