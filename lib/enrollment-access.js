/** Approval and payment are separate: both are needed for paid course content. */
export function hasCourseAccess(enrollment, { activeOnly = false } = {}) {
  const statuses = activeOnly ? ["active"] : ["active", "completed"];
  return Boolean(enrollment && statuses.includes(enrollment.status) &&
    (enrollment.paymentStatus === "paid" ||
      (typeof enrollment.amount === "number" && enrollment.amount <= 0)));
}

export function courseAccessFilter({ activeOnly = false } = {}) {
  return {
    status: { $in: activeOnly ? ["active"] : ["active", "completed"] },
    $or: [{ paymentStatus: "paid" }, { amount: { $lte: 0 } }],
  };
}
