import { send, siteUrl, forLocale, esc } from "@/lib/email";
import { formatDate, formatDateTime } from "@/lib/utils";

/**
 * Everything the academy puts in writing.
 *
 * Each letter is one small function so that the words and the moment they are
 * sent stay in the same place, and so a letter can be read here in full rather
 * than assembled out of fragments elsewhere. Every one of them is written in
 * the *recipient's* language, which is why each begins by asking for their
 * translator rather than using the one belonging to whoever is at the screen.
 *
 * None of these is awaited for its result by the code that triggers it: see
 * lib/email.js for why.
 */

/** A student has just created an account. */
export async function welcome(user) {
  const { t, locale } = forLocale(user.locale);
  return send({
    to: user.email,
    locale,
    subject: t("email.welcome.subject"),
    heading: t("email.hello", { name: firstName(user.name) }),
    lines: [esc(t("email.welcome.line1")), esc(t("email.welcome.line2"))],
    action: { label: t("email.welcome.action"), href: siteUrl("/courses") },
  });
}

/** A student has asked for a place on a course. */
export async function enrolmentReceived(user, course) {
  const { t, locale } = forLocale(user.locale);
  return send({
    to: user.email,
    locale,
    subject: t("email.enrolReceived.subject", { course: course.title }),
    heading: t("email.hello", { name: firstName(user.name) }),
    lines: [
      esc(t("email.enrolReceived.line1", { course: course.title, level: course.level })),
      esc(t("email.enrolReceived.line2")),
    ],
    action: { label: t("email.enrolReceived.action"), href: siteUrl("/dashboard/courses") },
  });
}

/** And the academy is told there is something to decide. */
export async function enrolmentToDecide(staff, student, course) {
  const { t, locale } = forLocale(staff.locale);
  return send({
    to: staff.email,
    locale,
    subject: t("email.enrolNew.subject", { name: student.name }),
    heading: t("email.enrolNew.heading"),
    lines: [esc(t("email.enrolNew.line1", { name: student.name, email: student.email, course: course.title }))],
    action: { label: t("email.enrolNew.action"), href: siteUrl("/admin/enrollments") },
  });
}

/** The place was given, or it was not. */
export async function enrolmentDecided(user, course, status, firstLesson, locale0) {
  const { t, locale } = forLocale(user.locale || locale0);
  if (status === "active") {
    const when = firstLesson ? formatDateTime(firstLesson.startsAt, locale) : "";
    return send({
      to: user.email,
      locale,
      subject: t("email.enrolApproved.subject", { course: course.title }),
      heading: t("email.enrolApproved.heading", { course: course.title }),
      lines: [
        esc(when ? t("email.enrolApproved.line1", { when }) : t("email.enrolApproved.line1none")),
        esc(t("email.enrolApproved.line2")),
      ],
      action: { label: t("email.enrolApproved.action"), href: siteUrl("/dashboard/courses") },
    });
  }
  if (status === "rejected") {
    return send({
      to: user.email,
      locale,
      subject: t("email.enrolRejected.subject", { course: course.title }),
      heading: t("email.hello", { name: firstName(user.name) }),
      lines: [esc(t("email.enrolRejected.line1", { course: course.title })), esc(t("email.enrolRejected.line2"))],
      action: { label: t("email.enrolRejected.action"), href: siteUrl("/courses") },
    });
  }
  return false;
}

/** A colleague's account has been made; this is how they get into it. */
export async function staffInvited(user, token) {
  const { t, locale } = forLocale(user.locale);
  return send({
    to: user.email,
    locale,
    subject: t("email.invite.subject"),
    heading: t("email.hello", { name: firstName(user.name) }),
    lines: [esc(t("email.invite.line1")), esc(t("email.invite.line2"))],
    action: { label: t("email.invite.action"), href: siteUrl(`/reset/${token}`), hint: t("email.invite.hint") },
    footnote: esc(t("email.invite.expires")),
  });
}

/** Somebody said they had forgotten their password. */
export async function passwordReset(user, token) {
  const { t, locale } = forLocale(user.locale);
  return send({
    to: user.email,
    locale,
    subject: t("email.reset.subject"),
    heading: t("email.reset.heading"),
    lines: [esc(t("email.reset.line1")), esc(t("email.reset.line2"))],
    action: { label: t("email.reset.action"), href: siteUrl(`/reset/${token}`), hint: t("email.reset.hint") },
    footnote: esc(t("email.reset.ignore")),
  });
}

/** There is a class today. */
export async function classReminder(user, lesson, course) {
  const { t, locale } = forLocale(user.locale);
  return send({
    to: user.email,
    locale,
    subject: t("email.reminder.subject", { course: course.title }),
    heading: t("email.reminder.heading", { when: formatDateTime(lesson.startsAt, locale) }),
    lines: [
      esc(t("email.reminder.line1", { course: course.title, title: lesson.title, minutes: lesson.durationMin || 90 })),
    ],
    action: {
      label: t("email.reminder.action"),
      href: course.classroom === "external" && (lesson.meetingUrl || course.meetingUrl)
        ? lesson.meetingUrl || course.meetingUrl
        : siteUrl(`/classroom/${lesson._id}`),
    },
  });
}

/** A course is running and has not been paid for. */
export async function paymentReminder(user, course, amount, currency, locale0) {
  const { t, locale } = forLocale(user.locale || locale0);
  return send({
    to: user.email,
    locale,
    subject: t("email.payment.subject", { course: course.title }),
    heading: t("email.hello", { name: firstName(user.name) }),
    lines: [
      esc(t("email.payment.line1", { course: course.title, amount: `${amount} ${currency}` })),
      esc(t("email.payment.line2")),
    ],
    action: { label: t("email.payment.action"), href: siteUrl("/dashboard/courses") },
  });
}

/** Proof to the person setting it up that the settings actually work. */
export async function testLetter(to, locale) {
  const { t, locale: code } = forLocale(locale);
  return send({
    to,
    locale: code,
    subject: t("email.test.subject"),
    heading: t("email.test.heading"),
    lines: [esc(t("email.test.line1", { date: formatDate(new Date(), code) }))],
  });
}

function firstName(name = "") {
  return String(name).trim().split(" ")[0] || name;
}
