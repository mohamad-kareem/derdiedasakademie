import { Mail, Check, X } from "lucide-react";
import { PageHeader, Breadcrumb, Panel } from "@/components/ui/Blocks";
import EmailTest from "@/components/admin/EmailTest";
import { requireOwner } from "@/lib/auth";
import { getI18n } from "@/lib/i18n/server";
import { isEmailConfigured } from "@/lib/email";
import { isStorageConfigured } from "@/lib/storage";
import { isLiveKitConfigured } from "@/lib/livekit";

/** How the academy itself is configured. The owner's page. */
export default async function AdminSettingsPage() {
  const user = await requireOwner();
  const { t } = await getI18n();
  const email = isEmailConfigured();

  const parts = [
    { key: "email", on: email },
    { key: "storage", on: isStorageConfigured() },
    { key: "classroom", on: isLiveKitConfigured() },
  ];

  return (
    <>
      <PageHeader title={t("admin.nav.settings")} description={t("admin.settings.subtitle")}>
        <Breadcrumb trail={[t("admin.portal"), t("admin.nav.settings")]} />
      </PageHeader>

      <div className="grid gap-5 xl:grid-cols-3">
        {/* What is switched on. Each of these is a set of environment
            variables, so the honest thing to show is simply whether they are
            there — not a switch that pretends the page can turn them on. */}
        <Panel title={t("admin.settings.whatIsOn")} bodyClassName="divide-y divide-line">
          {parts.map((p) => (
            <div key={p.key} className="flex items-start gap-2.5 px-4 py-3">
              <span className={p.on ? "mt-0.5 text-emerald-700" : "mt-0.5 text-muted"}>
                {p.on ? <Check className="size-4" /> : <X className="size-4" />}
              </span>
              <span className="min-w-0">
                <span className="block text-[13px] font-medium text-ink">{t(`admin.settings.parts.${p.key}`)}</span>
                <span className="block text-[11.5px] text-muted">
                  {t(p.on ? `admin.settings.parts.${p.key}On` : `admin.settings.parts.${p.key}Off`)}
                </span>
              </span>
            </div>
          ))}
        </Panel>

        <Panel
          className="xl:col-span-2"
          title={<span className="inline-flex items-center gap-2"><Mail className="size-4" /> {t("admin.settings.emailTitle")}</span>}
          bodyClassName="p-5"
        >
          {email ? (
            <>
              <p className="mb-4 text-[13px] text-muted">{t("admin.settings.emailOnText")}</p>
              <EmailTest defaultTo={user.email} />
            </>
          ) : (
            <div className="space-y-3 text-[13px] text-muted">
              <p>{t("admin.settings.emailOffText")}</p>
              <pre className="overflow-x-auto rounded-[3px] border border-line bg-cream p-3 font-mono text-[11.5px] leading-relaxed text-ink" dir="ltr">{`SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=your-login
SMTP_PASSWORD=your-key
MAIL_FROM=info@your-domain.de
NEXT_PUBLIC_SITE_URL=https://derdiedasakademie.vercel.app`}</pre>
              <p>{t("admin.settings.emailOffHint")}</p>
            </div>
          )}
        </Panel>
      </div>

      <div className="card mt-5 p-5 text-sm text-muted">
        <h2 className="mb-2 text-sm font-semibold text-navy-900">{t("admin.settings.siteTitle")}</h2>
        <p>{t("admin.settings.siteText")}</p>
      </div>
    </>
  );
}

export const dynamic = "force-dynamic";
