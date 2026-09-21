import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, Clock, Users, Video, Layers, CheckCircle2, Wallet } from "lucide-react";
import SiteShell from "@/components/site/SiteShell";
import EnrollBox from "@/components/site/EnrollBox";
import { LevelBadge, StatusBadge } from "@/components/ui/Badges";
import { getI18n } from "@/lib/i18n/server";
import { getPublishedCourse, safe } from "@/lib/data";
import { getCurrentUser } from "@/lib/auth";
import { isId } from "@/lib/validate";
import { isStaff } from "@/lib/roles";
import Enrollment from "@/models/Enrollment";
import { formatDate, formatMoney } from "@/lib/utils";

export async function generateMetadata({ params }) {
  const { id } = await params;
  const course = isId(id) ? await safe(getPublishedCourse(id), null) : null;
  return { title: course ? `${course.level} · ${course.title}` : "Course" };
}

export default async function CourseDetailPage({ params }) {
  const { id } = await params;
  if (!isId(id)) notFound();
  const { t, locale } = await getI18n();
  const course = await getPublishedCourse(id);
  if (!course) notFound();

  const user = await safe(getCurrentUser(), null);
  let enrollment = null;
  if (user?.role === "student") {
    enrollment = await Enrollment.findOne({ student: user.id, course: id }).select("status").lean();
  }
  const weeks = Math.max(1, Math.round((new Date(course.endDate) - new Date(course.startDate)) / (7 * 864e5)));

  const facts = [
    { icon: CalendarDays, label: t("courses.dates"), value: `${formatDate(course.startDate, locale)} – ${formatDate(course.endDate, locale)}` },
    { icon: Clock, label: t("courses.schedule"), value: course.schedule || "—" },
    { icon: Layers, label: t("courses.duration"), value: t("courses.weeks", { n: weeks }) },
    { icon: Video, label: t("courses.format"), value: `${t(`format.${course.format}`)} · ${t("courses.online")}` },
    { icon: Users, label: t("courses.seats"), value: course.seatsLeft > 0 ? t("courses.seatsLeft", { n: course.seatsLeft }) : t("courses.full") },
  ];

  return (
    <SiteShell>
      <section className="border-b border-line bg-cream">
        <div className="container-page py-10">
          <Link href="/courses" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-navy-900">
            <ArrowLeft className="size-4 rtl:rotate-180" /> {t("courses.back")}
          </Link>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <LevelBadge level={course.level} />
            <span className="text-sm text-muted">{t(`levels.${course.level}.name`)} · {t(`levels.${course.level}.stage`)}</span>
          </div>
          <h1 className="mt-3 max-w-3xl font-display text-3xl font-semibold tracking-tight text-navy-900 sm:text-4xl">{course.title}</h1>
        </div>
      </section>
      <section className="py-10">
        <div className="container-page grid gap-8 lg:grid-cols-12">
          <div className="space-y-8 lg:col-span-8">
            <div className="card p-6">
              <h2 className="text-base font-semibold text-navy-900">{t("courses.about")}</h2>
              <p className="prose-text mt-3">{course.description || t(`levels.${course.level}.desc`)}</p>
            </div>
            <div className="card p-6">
              <h2 className="text-base font-semibold text-navy-900">{t("courses.outcomesTitle", { level: course.level })}</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted">{t(`levels.${course.level}.desc`)}</p>
            </div>
            <div className="card p-6">
              <h2 className="text-base font-semibold text-navy-900">{t("courses.includedTitle")}</h2>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {["live", "materials", "homework", "support", "certificate", "portal"].map((k) => (
                  <li key={k} className="flex items-start gap-2.5 text-sm text-ink/85"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-gold-500" /> {t(`courses.included.${k}`)}</li>
                ))}
              </ul>
            </div>
          </div>
          <aside className="lg:col-span-4">
            <div className="card sticky top-24 overflow-hidden">
              <div className="border-b border-line bg-navy-900 p-5 text-white">
                <p className="flex items-center gap-2 text-xs text-white/60"><Wallet className="size-4" /> {t("courses.price")}</p>
                <p className="mt-1 text-3xl font-semibold">{course.price > 0 ? formatMoney(course.price, course.currency, locale) : t("courses.contactPrice")}</p>
              </div>
              <ul className="divide-y divide-line">
                {facts.map(({ icon: I, label, value }) => (
                  <li key={label} className="flex items-center gap-3 px-5 py-3">
                    <I className="size-4 shrink-0 text-gold-500" />
                    <span className="text-xs text-muted">{label}</span>
                    <span className="ms-auto text-end text-sm font-medium text-ink">{value}</span>
                  </li>
                ))}
              </ul>
              <div className="border-t border-line p-5">
                {isStaff(user) ? (
                  <Link href={`/admin/courses/${course._id}`} className="btn btn-primary w-full">{t("courses.manage")}</Link>
                ) : enrollment && ["pending", "active", "completed"].includes(enrollment.status) ? (
                  <div className="space-y-3 text-center">
                    <StatusBadge status={enrollment.status} label={t(`status.${enrollment.status}`)} />
                    <p className="text-sm text-muted">{t(`enroll.state.${enrollment.status}`)}</p>
                    <Link href={enrollment.status === "pending" ? "/dashboard/courses" : `/dashboard/courses/${course._id}`} className="btn btn-primary w-full">{t("nav.myPortal")}</Link>
                  </div>
                ) : user ? (
                  <EnrollBox courseId={course._id} disabled={course.seatsLeft <= 0} />
                ) : (
                  <div className="space-y-2">
                    <Link href={`/register?next=/courses/${course._id}`} className="btn btn-primary w-full">{t("enroll.createAccount")}</Link>
                    <Link href={`/login?next=/courses/${course._id}`} className="btn btn-outline w-full">{t("enroll.haveAccount")}</Link>
                  </div>
                )}
              </div>
            </div>
          </aside>
        </div>
      </section>
    </SiteShell>
  );
}
