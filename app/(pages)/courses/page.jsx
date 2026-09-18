import Link from "next/link";
import { SearchX } from "lucide-react";
import SiteShell from "@/components/site/SiteShell";
import CourseCard from "@/components/site/CourseCard";
import { getI18n } from "@/lib/i18n/server";
import { getPublishedCourses, safe } from "@/lib/data";
import { LEVELS } from "@/lib/constants";
import { cn } from "@/lib/utils";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t("courses.title") };
}

export default async function CoursesPage({ searchParams }) {
  const { level } = await searchParams;
  const active = LEVELS.includes(level) ? level : null;
  const { t, locale } = await getI18n();
  const courses = await safe(getPublishedCourses({ level: active, upcomingOnly: true }), []);

  return (
    <SiteShell>
      <section className="border-b border-line bg-cream">
        <div className="container-page py-10">
          <p className="eyebrow">{t("courses.eyebrow")}</p>
          <h1 className="mt-2 font-display text-[30px] font-semibold tracking-tight text-navy-900">{t("courses.title")}</h1>
          <div className="mt-3 h-[3px] w-20 flag-stripe" />
          <p className="mt-4 max-w-2xl text-[14.5px] leading-relaxed text-muted">{t("courses.subtitle")}</p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <span className="text-[10.5px] font-semibold uppercase tracking-[0.07em] text-muted">{t("admin.fields.level")}</span>
            <div className="toolbar">
              {[null, ...LEVELS].map((l) => (
                <Link
                  key={l || "all"}
                  href={l ? `/courses?level=${l}` : "/courses"}
                  className={cn("toolbar-item", active === l && "toolbar-item-active")}
                >
                  {l ? `${l} · ${t(`levels.${l}.name`)}` : t("courses.allLevels")}
                </Link>
              ))}
            </div>
            <span className="ms-auto text-[11.5px] text-muted tabular">
              {t(courses.length === 1 ? "common.result" : "common.results", { n: courses.length })}
            </span>
          </div>
        </div>
      </section>
      <section className="py-10">
        <div className="container-page">
          {courses.length ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {courses.map((c) => <CourseCard key={c._id} course={c} t={t} locale={locale} />)}
            </div>
          ) : (
            <div className="card flex flex-col items-center gap-2.5 p-10 text-center">
              <SearchX className="size-8 text-muted" />
              <p className="font-semibold text-navy-900">{t("courses.emptyTitle")}</p>
              <p className="max-w-md text-sm text-muted">{t("courses.emptyText")}</p>
              <Link href="/#contact" className="btn btn-primary mt-2">{t("home.hero.ctaSecondary")}</Link>
            </div>
          )}
        </div>
      </section>
    </SiteShell>
  );
}
