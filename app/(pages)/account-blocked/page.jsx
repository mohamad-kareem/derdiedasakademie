import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getI18n } from "@/lib/i18n/server";
import { logoutAction } from "@/app/actions/auth";

export default async function BlockedAccountPage() {
  const user = await requireUser({ allowBlocked: true });
  if (!user.isBlocked) redirect("/dashboard");
  const { t } = await getI18n();
  return <main className="mx-auto my-16 max-w-xl px-4"><section className="card p-6">
    <h1 className="text-xl font-semibold text-navy-900">{t("blocking.studentTitle")}</h1>
    <p className="mt-3 text-sm text-muted">{t("blocking.studentHint")}</p>
    <div className="mt-4 rounded border border-red-200 bg-red-50 p-4"><h2 className="text-sm font-semibold">{t("blocking.reason")}</h2><p className="mt-2 whitespace-pre-wrap break-words text-sm">{user.blockReason}</p></div>
    <div className="mt-5 flex gap-2"><Link href="/" className="btn btn-outline">{t("common.back")}</Link><form action={logoutAction}><button className="btn btn-primary">{t("nav.logout")}</button></form></div>
  </section></main>;
}
