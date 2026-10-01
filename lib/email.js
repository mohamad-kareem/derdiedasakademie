import nodemailer from "nodemailer";
import { site } from "@/lib/site";
import { dictionaries } from "@/lib/i18n/server";
import { makeT } from "@/lib/i18n/translate";
import { DEFAULT_LOCALE, LOCALES } from "@/lib/constants";

/**
 * The academy's post.
 *
 * Plain SMTP, so the academy can send through whatever it likes — Brevo,
 * Mailgun, its own mail host — by setting five environment variables and
 * nothing else. No account, no SDK, no vendor to be locked into.
 *
 * Two rules hold everywhere below.
 *
 *   Silence is allowed. With no SMTP settings the system runs exactly as it
 *   did before: nothing is sent, nothing is logged as an error, and no page
 *   breaks. An academy that has not set up email yet is not a broken academy.
 *
 *   A letter never breaks the thing that sent it. Enrolling a student is the
 *   important part; telling them about it is not worth failing the enrolment
 *   over, so every send is awaited only for its own sake and its failure is
 *   written to the log and otherwise forgotten.
 */

const HOST = process.env.SMTP_HOST || "";
const PORT = Number(process.env.SMTP_PORT || 587);
const USER = process.env.SMTP_USER || "";
const PASS = process.env.SMTP_PASSWORD || "";
const FROM = process.env.MAIL_FROM || USER;

export function isEmailConfigured() {
  return Boolean(HOST && USER && PASS && FROM);
}

let transport = null;
function mailer() {
  if (!transport) {
    transport = nodemailer.createTransport({
      host: HOST,
      port: PORT,
      // 465 is the implicit-TLS port; everything else starts plain and upgrades.
      secure: PORT === 465,
      auth: { user: USER, pass: PASS },
    });
  }
  return transport;
}

/** Where the site lives, for the links inside a letter. */
export function siteUrl(path = "/") {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL || "")
    .replace(/\/$/, "");
  const root = base ? (base.startsWith("http") ? base : `https://${base}`) : "";
  return `${root}${path}`;
}

/**
 * Send one letter. Returns whether it went, and never throws: the caller is
 * always in the middle of doing something more important.
 */
export async function send({ to, subject, heading, lines = [], action = null, footnote = "", locale = DEFAULT_LOCALE }) {
  if (!isEmailConfigured() || !to) return false;
  try {
    await mailer().sendMail({
      from: `"${site.name}" <${FROM}>`,
      to,
      subject,
      text: asText({ heading, lines, action, footnote }),
      html: asHtml({ subject, heading, lines, action, footnote, locale }),
    });
    return true;
  } catch (err) {
    console.error("[email]", err?.message || err);
    return false;
  }
}

/** The translator for whoever is being written to, not for whoever is reading the screen. */
export function forLocale(locale) {
  const code = LOCALES.includes(locale) ? locale : DEFAULT_LOCALE;
  return { t: makeT(dictionaries[code], dictionaries.en), locale: code, dir: code === "ar" ? "rtl" : "ltr" };
}

/* ------------------------------------------------------------- the paper */

function asText({ heading, lines, action, footnote }) {
  return [heading, "", ...lines, action ? `\n${action.label}: ${action.href}` : "", footnote ? `\n${footnote}` : "", `\n${site.name}`]
    .filter((x) => x !== null && x !== undefined)
    .join("\n");
}

/**
 * One letterhead for everything the academy sends: the national stripe, the
 * name, the message, one button. Inline styles and tables only, because mail
 * clients are twenty years behind browsers and always will be.
 */
function asHtml({ subject, heading, lines, action, footnote, locale }) {
  const dir = locale === "ar" ? "rtl" : "ltr";
  const align = dir === "rtl" ? "right" : "left";
  const body = lines.map((l) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#1a1f26">${l}</p>`).join("");
  const button = action
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px 0"><tr><td style="background:#12243b;border-radius:3px">
         <a href="${action.href}" style="display:inline-block;padding:11px 22px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none">${action.label}</a>
       </td></tr></table>
       <p style="margin:0 0 6px;font-size:12px;color:#5b6470">${escapeHtml(action.hint || "")}</p>
       <p style="margin:0;font-size:12px;color:#5b6470;word-break:break-all">${action.href}</p>`
    : "";

  return `<!doctype html>
<html dir="${dir}" lang="${locale}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:24px 12px;background:#f2f2ef;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #dcdcd6">
    <tr><td style="height:4px;padding:0;background:#12243b;font-size:0;line-height:0">
      <!-- The flag reads the same way round in every language. -->
      <table role="presentation" dir="ltr" cellpadding="0" cellspacing="0" width="100%"><tr>
        <td width="33%" style="height:4px;background:#000000;font-size:0;line-height:0">&nbsp;</td>
        <td width="33%" style="height:4px;background:#c81a1a;font-size:0;line-height:0">&nbsp;</td>
        <td width="34%" style="height:4px;background:#d8a220;font-size:0;line-height:0">&nbsp;</td>
      </tr></table>
    </td></tr>
    <tr><td style="padding:22px 26px 0;text-align:${align}">
      <p style="margin:0;font-size:13px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#12243b">${escapeHtml(site.name)}</p>
    </td></tr>
    <tr><td style="padding:16px 26px 26px;text-align:${align}">
      <h1 style="margin:0 0 16px;font-size:19px;line-height:1.35;color:#12243b">${escapeHtml(heading)}</h1>
      ${body}
      ${button}
      ${footnote ? `<p style="margin:20px 0 0;padding-top:16px;border-top:1px solid #dcdcd6;font-size:12px;line-height:1.6;color:#5b6470">${footnote}</p>` : ""}
    </td></tr>
  </table>
  <p style="max-width:560px;margin:14px auto 0;text-align:${align};font-size:11.5px;color:#5b6470">
    ${escapeHtml(site.name)}${site.email ? ` · ${escapeHtml(site.email)}` : ""}${site.phone ? ` · ${escapeHtml(site.phone)}` : ""}
  </p>
</body>
</html>`;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

/** Safe to drop straight into a letter's body. */
export const esc = escapeHtml;
