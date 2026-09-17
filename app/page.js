import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight, Video, Users, BookMarked, MessageSquareText, PlayCircle, Award, CheckCircle2,
  CalendarDays, ChevronDown, Mail, Phone, Compass, ClipboardCheck, GraduationCap, Sparkles,
} from "lucide-react";
import SiteShell from "@/components/site/SiteShell";
import CourseCard from "@/components/site/CourseCard";
import ContactForm from "@/components/site/ContactForm";
import { getI18n } from "@/lib/i18n/server";
import { getPublishedCourses, safe } from "@/lib/data";
import { LEVELS } from "@/lib/constants";
import { site } from "@/lib/site";
import { formatDate } from "@/lib/utils";

export default async function HomePage() {
  const { t, locale } = await getI18n();
  const courses = await safe(getPublishedCourses({ limit: 3, upcomingOnly: true }), []);
  const next = courses.find((c) => new Date(c.startDate) > new Date()) || courses[0];

  const features = [
    { icon: Video, key: "live" },
    { icon: Users, key: "small" },
    { icon: BookMarked, key: "structured" },
    { icon: MessageSquareText, key: "feedback" },
    { icon: PlayCircle, key: "materials" },
    { icon: Award, key: "certificate" },
  ];
  const steps = [
    { icon: Compass, key: "one" },
    { icon: ClipboardCheck, key: "two" },
    { icon: Video, key: "three" },
    { icon: GraduationCap, key: "four" },
  ];

  return (
    <SiteShell>
      {/* HERO */}
      <section className="relative overflow-hidden bg-cream">
        <div className="pointer-events-none absolute inset-0 opacity-[0.35] [background-image:linear-gradient(to_right,#e6e1d7_1px,transparent_1px),linear-gradient(to_bottom,#e6e1d7_1px,transparent_1px)] [background-size:56px_56px] [mask-image:radial-gradient(ellipse_at_top_left,black,transparent_70%)]" />
        <div className="container-page relative grid items-center gap-12 py-14 lg:grid-cols-12 lg:py-20">
          <div className="lg:col-span-6">
            <p className="eyebrow inline-flex items-center gap-2 rounded-full border border-gold-100 bg-white/70 px-3 py-1">
              <Sparkles className="size-3.5" /> {t("home.hero.eyebrow")}
            </p>
            <h1 className="mt-5 font-display text-4xl font-semibold leading-[1.1] tracking-tight text-navy-900 sm:text-5xl lg:text-[3.4rem]">
              {t("home.hero.title1")} <span className="italic text-gold-500 rtl:not-italic">{t("home.hero.titleAccent")}</span> {t("home.hero.title2")}
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-muted sm:text-lg">{t("home.hero.subtitle")}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/courses" className="btn btn-primary btn-lg">
                {t("home.hero.ctaPrimary")} <ArrowRight className="size-4 rtl:rotate-180" />
              </Link>
              <Link href="/#contact" className="btn btn-outline btn-lg">{t("home.hero.ctaSecondary")}</Link>
            </div>
            <ul className="mt-9 grid max-w-lg grid-cols-2 gap-x-6 gap-y-2.5 text-sm text-ink/80">
              {["a", "b", "c", "d"].map((k) => (
                <li key={k} className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 shrink-0 text-gold-500" /> {t(`home.hero.points.${k}`)}
                </li>
              ))}
            </ul>
          </div>
          <div className="relative lg:col-span-6">
            <div className="relative overflow-hidden rounded-2xl border border-white bg-white p-2 shadow-[0_30px_60px_-30px_rgba(15,30,53,0.35)]">
              <Image src="/back.png" alt={t("home.hero.imageAlt")} width={1536} height={1024} priority className="aspect-[4/3] w-full rounded-xl object-cover" sizes="(min-width: 1024px) 600px, 100vw" />
            </div>
            <div className="absolute -bottom-6 start-4 w-64 rounded-xl border border-line bg-white p-4 shadow-xl sm:start-8">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">{t("home.hero.nextIntake")}</p>
              {next ? (
                <>
                  <p className="mt-1 truncate text-sm font-semibold text-navy-900">{next.level} · {next.title}</p>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-muted"><CalendarDays className="size-3.5" /> {formatDate(next.startDate, locale)}</p>
                </>
              ) : (
                <p className="mt-1 text-sm font-semibold text-navy-900">{t("home.hero.newGroups")}</p>
              )}
            </div>
            <div className="absolute -top-4 end-4 hidden items-center gap-2 rounded-full border border-line bg-white px-3 py-2 text-xs font-semibold text-navy-900 shadow-lg sm:flex">
              <span className="relative flex size-2"><span className="absolute inline-flex size-full animate-ping rounded-full bg-red-500 opacity-60" /><span className="relative inline-flex size-2 rounded-full bg-red-500" /></span>
              {t("home.hero.liveBadge")}
            </div>
          </div>
        </div>
      </section>

      {/* LEVELS */}
      <section id="levels" className="scroll-mt-20 py-20">
        <div className="container-page">
          <div className="mx-auto max-w-2xl text-center">
            <p className="eyebrow">{t("home.levels.eyebrow")}</p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-navy-900 sm:text-4xl">{t("home.levels.title")}</h2>
            <p className="mt-3 text-muted">{t("home.levels.subtitle")}</p>
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {LEVELS.map((level, i) => (
              <Link key={level} href={`/courses?level=${level}`} className="card group relative flex flex-col overflow-hidden p-5 transition hover:border-navy-900">
                <div className="absolute inset-x-0 top-0 h-1 bg-navy-900" style={{ opacity: 0.25 + i * 0.18 }} />
                <div className="flex items-baseline justify-between">
                  <span className="font-display text-4xl font-semibold text-navy-900" dir="ltr">{level}</span>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-gold-500">{t(`levels.${level}.stage`)}</span>
                </div>
                <p className="mt-2 text-sm font-semibold text-ink">{t(`levels.${level}.name`)}</p>
                <p className="mt-2 flex-1 text-[13px] leading-relaxed text-muted">{t(`levels.${level}.desc`)}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-navy-700 group-hover:text-gold-600">
                  {t("home.levels.viewCourses")} <ArrowRight className="size-3.5 transition group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* METHOD */}
      <section id="method" className="scroll-mt-20 bg-navy-900 py-20 text-white">
        <div className="container-page">
          <div className="grid gap-12 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <p className="eyebrow text-gold-400">{t("home.method.eyebrow")}</p>
              <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">{t("home.method.title")}</h2>
              <p className="mt-4 text-white/65">{t("home.method.subtitle")}</p>
              <Link href="/register" className="btn btn-gold btn-lg mt-8">{t("home.method.cta")}</Link>
            </div>
            <ol className="grid gap-px overflow-hidden rounded-xl bg-white/10 sm:grid-cols-2 lg:col-span-8">
              {steps.map(({ icon: I, key }, i) => (
                <li key={key} className="bg-navy-900 p-6 transition hover:bg-navy-800">
                  <div className="flex items-center justify-between">
                    <span className="flex size-10 items-center justify-center rounded-lg bg-white/5 text-gold-400"><I className="size-5" /></span>
                    <span className="font-display text-3xl text-white/15" dir="ltr">0{i + 1}</span>
                  </div>
                  <h3 className="mt-5 font-semibold">{t(`home.method.steps.${key}.title`)}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/60">{t(`home.method.steps.${key}.text`)}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="py-20">
        <div className="container-page">
          <div className="mx-auto max-w-2xl text-center">
            <p className="eyebrow">{t("home.features.eyebrow")}</p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-navy-900 sm:text-4xl">{t("home.features.title")}</h2>
          </div>
          <div className="mt-12 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(({ icon: I, key }) => (
              <div key={key} className="flex gap-4">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-gold-100 bg-gold-50 text-gold-600"><I className="size-5" /></span>
                <div>
                  <h3 className="font-semibold text-navy-900">{t(`home.features.items.${key}.title`)}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">{t(`home.features.items.${key}.text`)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* COURSES */}
      <section className="border-y border-line bg-cream/60 py-20">
        <div className="container-page">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="eyebrow">{t("home.courses.eyebrow")}</p>
              <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-navy-900 sm:text-4xl">{t("home.courses.title")}</h2>
            </div>
            <Link href="/courses" className="btn btn-outline">{t("home.courses.all")} <ArrowRight className="size-4 rtl:rotate-180" /></Link>
          </div>
          {courses.length ? (
            <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {courses.map((c) => <CourseCard key={c._id} course={c} t={t} locale={locale} />)}
            </div>
          ) : (
            <div className="card mt-10 flex flex-col items-center gap-3 p-10 text-center">
              <CalendarDays className="size-8 text-gold-500" />
              <p className="font-semibold text-navy-900">{t("home.courses.emptyTitle")}</p>
              <p className="max-w-md text-sm text-muted">{t("home.courses.emptyText")}</p>
              <Link href="/#contact" className="btn btn-primary mt-2">{t("home.hero.ctaSecondary")}</Link>
            </div>
          )}
        </div>
      </section>

      {/* ABOUT */}
      <section id="about" className="scroll-mt-20 py-20">
        <div className="container-page grid items-center gap-12 lg:grid-cols-2">
          <div className="relative mx-auto w-full max-w-md lg:max-w-none">
            <div className="grid grid-cols-5 gap-3">
              <Image src="/logo/login.jpg" alt={t("home.about.imageAlt")} width={1134} height={2016} className="col-span-3 h-[440px] w-full rounded-xl object-cover" sizes="(min-width: 1024px) 360px, 60vw" />
              <div className="col-span-2 flex flex-col gap-3">
                <div className="flex flex-1 flex-col justify-end rounded-xl bg-navy-900 p-5 text-white">
                  <span className="font-display text-4xl" dir="ltr">A1<span className="text-gold-400">→</span>C1</span>
                  <span className="mt-2 text-xs text-white/60">{t("home.about.pathLabel")}</span>
                </div>
                <div className="flex flex-1 flex-col justify-end rounded-xl border border-line bg-cream p-5">
                  <Video className="size-6 text-gold-500" />
                  <span className="mt-3 text-sm font-semibold text-navy-900">{t("home.about.onlineLabel")}</span>
                </div>
              </div>
            </div>
          </div>
          <div>
            <p className="eyebrow">{t("home.about.eyebrow")}</p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-navy-900 sm:text-4xl">{t("home.about.title")}</h2>
            <p className="mt-5 leading-relaxed text-muted">{t("home.about.p1")}</p>
            <p className="mt-4 leading-relaxed text-muted">{t("home.about.p2")}</p>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {["a", "b", "c", "d"].map((k) => (
                <li key={k} className="flex items-start gap-2.5 text-sm text-ink/85"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-gold-500" /> {t(`home.about.points.${k}`)}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="scroll-mt-20 border-t border-line bg-white py-20">
        <div className="container-page grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <p className="eyebrow">{t("home.faq.eyebrow")}</p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-navy-900 sm:text-4xl">{t("home.faq.title")}</h2>
            <p className="mt-4 text-muted">{t("home.faq.subtitle")}</p>
          </div>
          <div className="divide-y divide-line rounded-xl border border-line lg:col-span-8">
            {["q1", "q2", "q3", "q4", "q5", "q6"].map((q) => (
              <details key={q} className="group px-5 [&[open]]:bg-cream/40">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-[15px] font-semibold text-navy-900">
                  {t(`home.faq.items.${q}.q`)}
                  <ChevronDown className="size-4 shrink-0 text-muted transition group-open:rotate-180" />
                </summary>
                <p className="pb-5 text-sm leading-relaxed text-muted">{t(`home.faq.items.${q}.a`)}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CONTACT */}
      <section id="contact" className="scroll-mt-20 bg-cream py-20">
        <div className="container-page grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <p className="eyebrow">{t("contact.eyebrow")}</p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-navy-900 sm:text-4xl">{t("contact.title")}</h2>
            <p className="mt-4 text-muted">{t("contact.subtitle")}</p>
            <div className="mt-8 space-y-3">
              <a href={`mailto:${site.email}`} className="card flex items-center gap-4 p-4 transition hover:border-navy-600/40">
                <span className="flex size-10 items-center justify-center rounded-lg bg-navy-900 text-white"><Mail className="size-4" /></span>
                <span><span className="block text-xs text-muted">{t("form.email")}</span><span className="text-sm font-semibold text-navy-900">{site.email}</span></span>
              </a>
              <div className="card flex items-center gap-4 p-4">
                <span className="flex size-10 items-center justify-center rounded-lg bg-navy-900 text-white"><Phone className="size-4" /></span>
                <span><span className="block text-xs text-muted">{t("form.phone")}</span><span className="text-sm font-semibold text-navy-900" dir="ltr">{site.phone}</span></span>
              </div>
            </div>
          </div>
          <div className="card p-6 shadow-sm sm:p-8 lg:col-span-7">
            <ContactForm />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-navy-950">
        <div className="container-page flex flex-col items-start justify-between gap-6 py-12 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-display text-2xl font-semibold text-white sm:text-3xl">{t("home.cta.title")}</h2>
            <p className="mt-2 text-white/60">{t("home.cta.text")}</p>
          </div>
          <Link href="/register" className="btn btn-gold btn-lg">{t("home.cta.button")} <ArrowRight className="size-4 rtl:rotate-180" /></Link>
        </div>
      </section>
    </SiteShell>
  );
}
