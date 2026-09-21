import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight, Video, Users, BookMarked, MessageSquareText, PlayCircle, Award, CheckCircle2,
  CalendarDays, ChevronDown, Mail, Phone, Compass, ClipboardCheck, GraduationCap,
} from "lucide-react";
import SiteShell from "@/components/site/SiteShell";
import HeroSlideshow from "@/components/site/HeroSlideshow";
import Marquee from "@/components/site/Marquee";
import CourseCard from "@/components/site/CourseCard";
import ContactForm from "@/components/site/ContactForm";
import IntroVideo from "@/components/site/IntroVideo";
import { getI18n } from "@/lib/i18n/server";
import { getPublishedCourses, safe } from "@/lib/data";
import { LEVELS } from "@/lib/constants";
import { site } from "@/lib/site";
import { formatDate } from "@/lib/utils";

/** A small caps heading with a brass rule — the section marker used throughout. */
function SectionHead({ eyebrow, title, text, center = false, light = false, children }) {
  return (
    <div className={center ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      <p className={light ? "eyebrow text-gold-400" : "eyebrow"}>{eyebrow}</p>
      <h2 className={`mt-2 font-display text-[26px] font-semibold leading-tight tracking-tight sm:text-[30px] ${light ? "text-white" : "text-navy-900"}`}>
        {title}
      </h2>
      {text && <p className={`mt-2.5 text-[15px] leading-relaxed ${light ? "text-white/65" : "text-muted"}`}>{text}</p>}
      {children}
    </div>
  );
}

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
      {/* ------------------------------------------------------------------ hero */}
      <section className="border-b border-line bg-cream">
        <div className="container-page grid items-center gap-10 py-12 lg:grid-cols-12 lg:py-16">
          <div className="lg:col-span-7">
            <p className="eyebrow">{t("home.hero.eyebrow")}</p>
            <h1 className="mt-2.5 max-w-2xl font-display text-[32px] font-semibold leading-[1.15] tracking-tight text-navy-900 sm:text-[40px]">
              {t("home.hero.title1")} <span className="text-gold-600">{t("home.hero.titleAccent")}</span> {t("home.hero.title2")}
            </h1>
            <div className="mt-4 h-[3px] w-20 flag-stripe" />
            <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-muted">{t("home.hero.subtitle")}</p>

            <div className="mt-7 flex flex-wrap gap-2.5">
              <Link href="/courses" className="btn btn-primary btn-lg">
                {t("home.hero.ctaPrimary")} <ArrowRight className="size-4 rtl:rotate-180" />
              </Link>
              <Link href="/#contact" className="btn btn-outline btn-lg">{t("home.hero.ctaSecondary")}</Link>
            </div>

            <ul className="mt-8 grid max-w-xl grid-cols-1 gap-x-8 gap-y-2 border-t border-line pt-5 text-[13.5px] text-ink/80 sm:grid-cols-2">
              {["a", "b", "c", "d"].map((k) => (
                <li key={k} className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 shrink-0 text-gold-600" /> {t(`home.hero.points.${k}`)}
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-5">
            <figure className="card overflow-hidden">
              <HeroSlideshow alt={t("home.hero.imageAlt")} />
              <figcaption className="flex items-center justify-between gap-3 border-t border-line bg-cream px-3.5 py-2.5">
                <span className="text-[10.5px] font-semibold uppercase tracking-[0.07em] text-muted">{t("home.hero.nextIntake")}</span>
                {next ? (
                  <span className="min-w-0 text-end">
                    <span className="block truncate text-[13px] font-semibold text-navy-900">{next.level} · {next.title}</span>
                    <span className="block text-[11.5px] text-muted tabular">{formatDate(next.startDate, locale)}</span>
                  </span>
                ) : (
                  <span className="text-[13px] font-semibold text-navy-900">{t("home.hero.newGroups")}</span>
                )}
              </figcaption>
            </figure>
          </div>
        </div>
      </section>

      <Marquee />

      {/* ---------------------------------------------------------------- levels */}
      <section id="levels" className="scroll-mt-20 bg-white py-14">
        <div className="container-page">
          <SectionHead center eyebrow={t("home.levels.eyebrow")} title={t("home.levels.title")} text={t("home.levels.subtitle")} />
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {LEVELS.map((level) => (
              <Link key={level} href={`/courses?level=${level}`} className="card group flex flex-col p-4 transition-colors hover:border-navy-700">
                <div className="flex items-baseline justify-between gap-2 border-b border-line pb-2.5">
                  <span className="font-display text-[26px] font-semibold leading-none text-navy-900" dir="ltr">{level}</span>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-gold-600">{t(`levels.${level}.stage`)}</span>
                </div>
                <p className="mt-2.5 text-[13.5px] font-semibold text-ink">{t(`levels.${level}.name`)}</p>
                <p className="mt-1.5 flex-1 text-[12.5px] leading-relaxed text-muted">{t(`levels.${level}.desc`)}</p>
                <span className="mt-3 inline-flex items-center gap-1 text-[11.5px] font-semibold text-navy-700 group-hover:text-gold-600">
                  {t("home.levels.viewCourses")} <ArrowRight className="size-3 rtl:rotate-180" />
                </span>
              </Link>
            ))}
          </div>

          <div className="mt-6 flex flex-col items-start justify-between gap-3 border border-line bg-cream px-4 py-3.5 sm:flex-row sm:items-center">
            <div>
              <p className="text-[14px] font-semibold text-navy-900">{t("test.title")}</p>
              <p className="mt-0.5 text-[12.5px] text-muted">
                {t("test.facts.questions", { n: 30 })} · {t("test.facts.minutes")} · {t("test.facts.noSignup")}
              </p>
            </div>
            <Link href="/level-test" className="btn btn-primary shrink-0">
              {t("test.intro.start")} <ArrowRight className="size-4 rtl:rotate-180" />
            </Link>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- method */}
      <section id="method" className="scroll-mt-20 border-y border-navy-800 bg-navy-900 py-14 text-white">
        <div className="container-page grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <SectionHead light eyebrow={t("home.method.eyebrow")} title={t("home.method.title")} text={t("home.method.subtitle")} />
            <Link href="/register" className="btn btn-gold mt-6">{t("home.method.cta")}</Link>
          </div>
          <ol className="grid gap-px overflow-hidden border border-white/10 bg-white/10 sm:grid-cols-2 lg:col-span-8">
            {steps.map(({ icon: I, key }, i) => (
              <li key={key} className="bg-navy-900 p-5 transition-colors hover:bg-navy-800">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <span className="flex size-8 items-center justify-center rounded-[2px] bg-white/5 text-gold-400"><I className="size-4" /></span>
                  <span className="font-display text-[22px] text-white/20 tabular" dir="ltr">0{i + 1}</span>
                </div>
                <h3 className="mt-3.5 text-[14px] font-semibold">{t(`home.method.steps.${key}.title`)}</h3>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-white/60">{t(`home.method.steps.${key}.text`)}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* -------------------------------------------------------------- features */}
      <section className="border-b border-line bg-white py-14">
        <div className="container-page">
          <SectionHead center eyebrow={t("home.features.eyebrow")} title={t("home.features.title")} />
          <div className="mt-8 grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(({ icon: I, key }) => (
              <div key={key} className="flex gap-3.5 border-t border-line pt-4">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-[2px] border border-gold-100 bg-gold-50 text-gold-600"><I className="size-4" /></span>
                <div>
                  <h3 className="text-[14px] font-semibold text-navy-900">{t(`home.features.items.${key}.title`)}</h3>
                  <p className="mt-1 text-[13px] leading-relaxed text-muted">{t(`home.features.items.${key}.text`)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------------- courses */}
      <section className="border-y border-line bg-cream py-14">
        <div className="container-page">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <SectionHead eyebrow={t("home.courses.eyebrow")} title={t("home.courses.title")} />
            <Link href="/courses" className="btn btn-outline shrink-0">{t("home.courses.all")} <ArrowRight className="size-4 rtl:rotate-180" /></Link>
          </div>
          {courses.length ? (
            <div className="mt-7 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {courses.map((c) => <CourseCard key={c._id} course={c} t={t} locale={locale} />)}
            </div>
          ) : (
            <div className="card mt-7 flex flex-col items-center gap-2.5 p-8 text-center">
              <CalendarDays className="size-6 text-gold-600" />
              <p className="text-[14px] font-semibold text-navy-900">{t("home.courses.emptyTitle")}</p>
              <p className="max-w-md text-[13px] text-muted">{t("home.courses.emptyText")}</p>
              <Link href="/#contact" className="btn btn-primary mt-2">{t("home.hero.ctaSecondary")}</Link>
            </div>
          )}
        </div>
      </section>

      {/* ------------------------------------------------- the academy & teacher */}
      <section id="about" className="scroll-mt-20 bg-white py-14">
        <div className="container-page grid gap-10 lg:grid-cols-12">
          <div className="mx-auto w-full max-w-[300px] lg:col-span-4 lg:mx-0">
            <figure className="card overflow-hidden">
              <IntroVideo
                src="/media/intro.mp4"
                poster="/media/intro-poster.jpg"
                label={t("home.about.videoLabel")}
                className="aspect-[9/16] w-full object-cover"
              />
            </figure>
          </div>

          <div className="lg:col-span-8">
            <SectionHead eyebrow={t("home.about.eyebrow")} title={t("home.about.title")} />
            <p className="mt-4 text-[14.5px] leading-relaxed text-muted">{t("home.about.p1")}</p>
            <p className="mt-3 text-[14.5px] leading-relaxed text-muted">{t("home.about.p2")}</p>

            <div className="mt-6 flex items-center gap-4 border-y border-line py-4">
              <Image
                src="/media/instructor.jpg"
                alt={t("home.about.teacherName")}
                width={660}
                height={879}
                sizes="76px"
                className="size-[76px] shrink-0 rounded-[2px] border border-line object-cover object-top"
              />
              <div className="min-w-0 flex-1">
                <p className="font-display text-[18px] font-semibold leading-tight text-navy-900">{t("home.about.teacherName")}</p>
                <p className="mt-1 text-[12.5px] text-muted">{t("home.about.teacherRole")}</p>
                <span className="mt-2 block h-[3px] w-12 flag-stripe" />
              </div>
              <div className="hidden shrink-0 border-s border-line ps-4 text-end sm:block">
                <p className="font-display text-[20px] font-semibold leading-none text-navy-900" dir="ltr">
                  A1<span className="mx-0.5 text-gold-600">→</span>C1
                </p>
                <p className="mt-1.5 text-[10.5px] font-semibold uppercase tracking-[0.07em] text-muted">{t("home.about.pathLabel")}</p>
              </div>
            </div>

            <ul className="mt-5 grid gap-2.5 sm:grid-cols-2">
              {["a", "b", "c", "d"].map((k) => (
                <li key={k} className="flex items-start gap-2 text-[13.5px] text-ink/85">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-gold-600" /> {t(`home.about.points.${k}`)}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------- faq */}
      <section id="faq" className="scroll-mt-20 border-t border-line bg-cream py-14">
        <div className="container-page grid gap-8 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <SectionHead eyebrow={t("home.faq.eyebrow")} title={t("home.faq.title")} text={t("home.faq.subtitle")} />
          </div>
          <div className="card divide-y divide-line lg:col-span-8">
            {["q1", "q2", "q3", "q4", "q5", "q6"].map((q) => (
              <details key={q} className="group px-4 [&[open]]:bg-cream/50">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-3 text-[14px] font-semibold text-navy-900">
                  {t(`home.faq.items.${q}.q`)}
                  <ChevronDown className="size-4 shrink-0 text-muted transition group-open:rotate-180" />
                </summary>
                <p className="pb-4 text-[13px] leading-relaxed text-muted">{t(`home.faq.items.${q}.a`)}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------------- contact */}
      <section id="contact" className="scroll-mt-20 border-t border-line bg-white py-14">
        <div className="container-page grid gap-8 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <SectionHead eyebrow={t("contact.eyebrow")} title={t("contact.title")} text={t("contact.subtitle")} />
            <div className="mt-6 space-y-2.5">
              <a href={`mailto:${site.email}`} className="card flex items-center gap-3 p-3 transition-colors hover:border-navy-700">
                <span className="flex size-9 items-center justify-center rounded-[2px] bg-navy-900 text-white"><Mail className="size-4" /></span>
                <span>
                  <span className="block text-[11px] uppercase tracking-[0.07em] text-muted">{t("form.email")}</span>
                  <span className="text-[13.5px] font-semibold text-navy-900">{site.email}</span>
                </span>
              </a>
              <div className="card flex items-center gap-3 p-3">
                <span className="flex size-9 items-center justify-center rounded-[2px] bg-navy-900 text-white"><Phone className="size-4" /></span>
                <span>
                  <span className="block text-[11px] uppercase tracking-[0.07em] text-muted">{t("form.phone")}</span>
                  <span className="text-[13.5px] font-semibold text-navy-900" dir="ltr">{site.phone}</span>
                </span>
              </div>
            </div>
          </div>
          <div className="card p-5 sm:p-6 lg:col-span-7">
            <ContactForm />
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------- cta */}
      <section className="bg-navy-950">
        <div className="container-page flex flex-col items-start justify-between gap-5 py-10 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-display text-[22px] font-semibold text-white sm:text-[26px]">{t("home.cta.title")}</h2>
            <p className="mt-1.5 text-[14px] text-white/60">{t("home.cta.text")}</p>
          </div>
          <Link href="/register" className="btn btn-gold btn-lg shrink-0">{t("home.cta.button")} <ArrowRight className="size-4 rtl:rotate-180" /></Link>
        </div>
      </section>
    </SiteShell>
  );
}
