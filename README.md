# Die DerDieDas Akademie — Online German Academy Platform

Next.js 16 · React 19 · Tailwind CSS 4 · MongoDB (Mongoose) · English / Deutsch / العربية (RTL)

## Setup

1. `npm install`
2. Create `.env.local` (see `.env.example`):
   - `MONGODB_URI` – your MongoDB connection string
   - `JWT_SECRET` – a long random string
   - `ADMIN_EMAILS` – the teacher's email (comma-separate several)
3. `npm run dev` → http://localhost:3000
4. Register with the email from `ADMIN_EMAILS` → you land in the admin area at `/admin`.
   (If that account already exists, just log in — it is promoted automatically.)

## What's inside

**Public website** — landing page (levels A1–C1, method, features, upcoming courses, about, FAQ, contact form),
course catalogue with level filter, course detail with enrollment request, login/register. Language switcher (EN default, DE, AR with right-to-left layout).

**Student portal** (`/dashboard`) — overview (next sessions with live "Join" button, open homework, announcements, average grade),
my courses (status + payment), course room (sessions, recordings, materials, assignments, announcements, progress),
assignments (submit text + file link, see grade & feedback), profile & password, printable certificate.

**Admin** (`/admin`) — overview stats (students, pending requests, revenue, grading queue), courses (create / edit / publish / archive),
per-course management (sessions with materials & recordings, roster, add student manually, assignments, announcements, settings),
enrollments (approve / reject / mark paid / complete → certificate), students (search, detail, level, notes, disable, reset password),
grading queue, global announcements, website inquiries, account settings.

## Where to edit things

| What | File |
| --- | --- |
| Contact email, phone, social links | `lib/site.js` |
| All texts (3 languages) | `lib/i18n/en.js`, `de.js`, `ar.js` |
| Colors & fonts | `app/globals.css`, `app/layout.js` |
| Database models | `models/` |
| Server logic (forms/actions) | `app/actions/` |

Class times are entered and shown in academy time (Europe/Berlin by default).
Payments are tracked manually (mark paid); files are shared as links (Google Drive, Dropbox, …).

## Folders you can delete (old version, now unused)

`app/(pages)/LandingPage`, `app/(pages)/choose-course`, `app/(pages)/dashboard/admin`, `app/(components)`,
`app/api/auth`, `app/api/course-registration`, `models/CourseRegistration.js`.
They were replaced by redirects/stubs so nothing breaks if you keep them.
