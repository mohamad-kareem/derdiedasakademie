import Link from "next/link";
import { CalendarDays, Clock, Users, ArrowRight } from "lucide-react";
import { LevelBadge } from "@/components/ui/Badges";
import { formatDate, formatMoney } from "@/lib/utils";

export default function CourseCard({ course, t, locale }) {
  const full = course.seatsLeft <= 0;
  return (
    <article className="card group flex flex-col overflow-hidden transition-colors hover:border-navy-700">
      <div className="flex items-center justify-between border-b border-line bg-cream px-4 py-2.5">
        <div className="flex items-center gap-2">
          <LevelBadge level={course.level} />
          <span className="text-xs font-medium text-muted">{t(`levels.${course.level}.name`)}</span>
        </div>
        <span className="text-xs font-medium text-muted">{t(`format.${course.format}`)}</span>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="text-[15px] font-semibold leading-snug text-navy-900">{course.title}</h3>
        {course.description && <p className="mt-1.5 line-clamp-2 text-[13px] text-muted">{course.description}</p>}
        <ul className="mb-4 mt-3 space-y-1.5 text-[13px] text-ink/80">
          <li className="flex items-center gap-2"><CalendarDays className="size-3.5 text-gold-600" />{formatDate(course.startDate, locale)} – {formatDate(course.endDate, locale)}</li>
          {course.schedule && <li className="flex items-center gap-2"><Clock className="size-3.5 text-gold-600" />{course.schedule}</li>}
          <li className="flex items-center gap-2">
            <Users className="size-3.5 text-gold-600" />
            {full ? <span className="font-medium text-red-600">{t("courses.full")}</span> : t("courses.seatsLeft", { n: course.seatsLeft })}
          </li>
        </ul>
        <div className="mt-auto flex items-end justify-between border-t border-line pt-4">
          <div>
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.07em] text-muted">{t("courses.price")}</p>
            <p className="text-[17px] font-semibold text-navy-900 tabular">{course.price > 0 ? formatMoney(course.price, course.currency, locale) : t("courses.contactPrice")}</p>
          </div>
          <Link href={`/courses/${course._id}`} className="btn btn-outline btn-sm group-hover:border-navy-900 group-hover:bg-navy-900 group-hover:text-white">
            {t("courses.details")} <ArrowRight className="size-4 rtl:rotate-180" />
          </Link>
        </div>
      </div>
    </article>
  );
}
