import Link from "next/link";
import { CalendarDays, Clock, Users, ArrowRight } from "lucide-react";
import { LevelBadge } from "@/components/ui/Badges";
import { formatDate, formatMoney } from "@/lib/utils";

export default function CourseCard({ course, t, locale }) {
  const full = course.seatsLeft <= 0;
  return (
    <article className="card group flex flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-[0_12px_32px_-12px_rgba(15,30,53,0.18)]">
      <div className="flex items-center justify-between border-b border-line bg-cream/60 px-5 py-3">
        <div className="flex items-center gap-2">
          <LevelBadge level={course.level} />
          <span className="text-xs font-medium text-muted">{t(`levels.${course.level}.name`)}</span>
        </div>
        <span className="text-xs font-medium text-muted">{t(`format.${course.format}`)}</span>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-lg font-semibold leading-snug text-navy-900">{course.title}</h3>
        {course.description && <p className="mt-2 line-clamp-2 text-sm text-muted">{course.description}</p>}
        <ul className="mb-5 mt-4 space-y-2 text-sm text-ink/80">
          <li className="flex items-center gap-2"><CalendarDays className="size-4 text-gold-500" />{formatDate(course.startDate, locale)} – {formatDate(course.endDate, locale)}</li>
          {course.schedule && <li className="flex items-center gap-2"><Clock className="size-4 text-gold-500" />{course.schedule}</li>}
          <li className="flex items-center gap-2">
            <Users className="size-4 text-gold-500" />
            {full ? <span className="font-medium text-red-600">{t("courses.full")}</span> : t("courses.seatsLeft", { n: course.seatsLeft })}
          </li>
        </ul>
        <div className="mt-auto flex items-end justify-between border-t border-line pt-4">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted">{t("courses.price")}</p>
            <p className="text-xl font-semibold text-navy-900">{course.price > 0 ? formatMoney(course.price, course.currency, locale) : t("courses.contactPrice")}</p>
          </div>
          <Link href={`/courses/${course._id}`} className="btn btn-outline group-hover:border-navy-900 group-hover:bg-navy-900 group-hover:text-white">
            {t("courses.details")} <ArrowRight className="size-4 rtl:rotate-180" />
          </Link>
        </div>
      </div>
    </article>
  );
}
