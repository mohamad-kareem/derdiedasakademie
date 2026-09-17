import { Check, X, BadgeCheck, CircleDollarSign, RotateCcw, Award } from "lucide-react";
import ActionButton from "@/components/ui/ActionButton";
import { setEnrollmentStatus, setPaymentStatus } from "@/app/actions/admin";

export default function EnrollmentActions({ e, t, compact = false }) {
  const id = e._id;
  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5">
      {e.status === "pending" && (
        <>
          <ActionButton action={setEnrollmentStatus.bind(null, id, "active")} className="btn-primary" title={t("admin.enroll.approve")}>
            <Check className="size-3.5" /> {!compact && t("admin.enroll.approve")}
          </ActionButton>
          <ActionButton action={setEnrollmentStatus.bind(null, id, "rejected")} confirm title={t("admin.enroll.reject")}>
            <X className="size-3.5" /> {!compact && t("admin.enroll.reject")}
          </ActionButton>
        </>
      )}
      {!["rejected", "cancelled", "pending"].includes(e.status) && (
        e.paymentStatus === "paid" ? (
          <ActionButton action={setPaymentStatus.bind(null, id, "unpaid")} confirm title={t("admin.enroll.markUnpaid")} className="btn-ghost">
            <CircleDollarSign className="size-3.5 text-emerald-600" /> {!compact && t("admin.enroll.markUnpaid")}
          </ActionButton>
        ) : (
          <ActionButton action={setPaymentStatus.bind(null, id, "paid")} title={t("admin.enroll.markPaid")}>
            <CircleDollarSign className="size-3.5" /> {!compact && t("admin.enroll.markPaid")}
          </ActionButton>
        )
      )}
      {e.status === "active" && (
        <ActionButton action={setEnrollmentStatus.bind(null, id, "completed")} confirm title={t("admin.enroll.complete")}>
          <BadgeCheck className="size-3.5" /> {!compact && t("admin.enroll.complete")}
        </ActionButton>
      )}
      {e.status === "completed" && (
        <a href={`/certificate/${id}`} className="btn btn-outline btn-sm" title={t("certificate.view")}><Award className="size-3.5" /></a>
      )}
      {["rejected", "cancelled", "completed"].includes(e.status) && (
        <ActionButton action={setEnrollmentStatus.bind(null, id, "active")} confirm title={t("admin.enroll.reactivate")} className="btn-ghost">
          <RotateCcw className="size-3.5" /> {!compact && t("admin.enroll.reactivate")}
        </ActionButton>
      )}
    </div>
  );
}
