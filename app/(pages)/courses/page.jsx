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
        <div className="container-page py-12">
          <p className="eyebrow">{t("courses.eyebrow")}</p>
          <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-navy-900">{t("courses.title")}</h1>
          <p className="mt-3 max-w-2xl text-muted">{t("courses.subtitle")}</p>
          <div className="mt-8 flex flex-wrap gap-2">
            {[null, ...LEVELS].map((l) => (
              <Link
                key={l || "all"}
                href={l ? `/courses?level=${l}` : "/courses"}
                className={cn("btn btn-sm rounded-full px-4", active === l ? "btn-primary" : "btn-outline")}
              >
                {l ? `${l} · ${t(`levels.${l}.name`)}` : t("courses.allLevels")}
              </Link>
            ))}
          </div>
        </div>
      </section>
      <section className="py-12">
        <div className="container-page">
          {courses.length ? (
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {courses.map((c) => <CourseCard key={c._id} course={c} t={t} locale={locale} />)}
            </div>
          ) : (
            <div className="card flex flex-col items-center gap-3 p-12 text-center">
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
