export function paymentBalance(enrollment) {
  const total = Math.max(0, Number(enrollment?.amount) || 0);
  const received = enrollment?.paymentStatus === "paid" ? total : Math.min(total, Math.max(0, Number(enrollment?.paidAmount) || 0));
  return { total, received, remaining: Math.round((total - received) * 100) / 100 };
}

export function schoolToday(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export function validDueDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
}

export function installmentReminder(enrollment, today = schoolToday()) {
  if (!["active", "completed"].includes(enrollment.status) || enrollment.paymentStatus !== "partial" || paymentBalance(enrollment).remaining <= 0 || !validDueDate(enrollment.paymentDueDate || "")) return null;
  const days = Math.round((Date.parse(`${enrollment.paymentDueDate}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86400000);
  return days <= 3 ? { days, overdue: days < 0 } : null;
}

export function paymentUpdate(total, mode, receivedValue, dueDate) {
  if (!Number.isFinite(total) || total < 0) return { error: "installments.invalidAmount" };
  if (mode === "full") return { paymentStatus: "paid", paidAmount: total, paymentDueDate: "" };
  if (mode !== "partial") return { error: "errors.generic" };
  const received = Number(receivedValue);
  if (!receivedValue || !Number.isFinite(received) || received <= 0 || received >= total || Math.abs(received * 100 - Math.round(received * 100)) > 0.000001) return { error: "installments.invalidAmount" };
  if (!validDueDate(dueDate)) return { error: "installments.invalidDate" };
  return { paymentStatus: "partial", paidAmount: Math.round(received * 100) / 100, paymentDueDate: dueDate };
}
