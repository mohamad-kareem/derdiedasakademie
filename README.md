# Die DerDieDas Akademie — Online German Academy Platform

Next.js 16 · React 19 · Tailwind CSS 4 · MongoDB (data + files) · LiveKit · English / Deutsch / العربية (RTL)

## 1. Install & run

```bash
npm install
npm run dev        # http://localhost:3000
```

Copy `.env.example` to `.env.local` and fill in the values (see below). Restart `npm run dev` after every change to `.env.local`.

Register with the email from `ADMIN_EMAILS` → you land in the teacher admin at `/admin`.

## 2. Files (PDFs, documents, homework) — nothing to set up

Uploaded files are stored **inside your MongoDB database**, so there is no storage account, no
credit card and no CORS settings. Uploads travel through the app in small chunks, which also
works on Vercel (a single request there may not exceed ~4.5 MB).

- Allowed: PDF, Word, PowerPoint, Excel, text, images, audio, small video, zip
- Limit: **25 MB per file** (change with `MAX_UPLOAD_MB`)
- Downloads go through `/api/files`, which checks that the person may see the file
  (admin, enrolled student, or the student who handed it in)

Keep an eye on your database size: the free MongoDB Atlas plan holds **512 MB in total**,
shared with all other data. Roughly 100–200 worksheets. If you outgrow it, upgrade the Atlas
plan or tell me and I can move file storage to an object store later.

## 3. LiveKit — the built-in live classroom

1. Create a free project at <https://cloud.livekit.io> (no credit card).
2. **Settings → Keys** → create a key → copy the **WebSocket URL**, **API Key** and **API Secret** into `.env.local`.

Free plan: 5,000 video minutes and 50 GB of traffic per month. Minutes count per person, so a
90-minute class with a teacher and five students uses 540 minutes — roughly nine such classes a month.
Asking students to switch cameras off during whiteboard work saves a lot of traffic.

**Class recording is not part of this platform** — nothing is recorded, downloaded or stored.

Each course can use this classroom (default) or an external meeting link (Zoom/Meet), set in the course settings.

### Classroom features
- Video & audio with speaker highlight, screen sharing (teacher; students when allowed), device check before joining
- **Whiteboard** with lined (German Lineatur) / grid / blank paper, pen, highlighter, shapes, arrows, text, eraser, undo, pages, save as image
- **Share PDFs & images** and write on them live (the teacher can let students write too)
- Chat with file sharing (saved), German keyboard (ä ö ü ß „ “)
- Raise hand, reactions and teaching signals (*understood / repeat / slower / question*)
- **Live quizzes** with instant results and correct answer (der/die/das & Richtig/Falsch templates)
- **Vocabulary board** (der = blue, die = red, das = green) saved to the course → students practise with flashcards & article quiz
- Teacher controls: mute, mute all, remove, lock room, end class for everyone
- Automatic **attendance** (minutes present) and a **session report** (attendance, quiz results, chat log)

## 4. Deploy on Vercel

1. Push the project to GitHub (don't commit `.env.local` — `.gitignore` already excludes it), then import the repo in Vercel.
2. **Project → Settings → Environment Variables** — add all of these for *Production* and *Preview*:
   `MONGODB_URI`, `JWT_SECRET`, `ADMIN_EMAILS`, `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`
   (optional: `MAX_UPLOAD_MB`, `APP_TIMEZONE`)
3. MongoDB Atlas → **Network Access** → allow `0.0.0.0/0`, because Vercel has no fixed IP address.
4. Deploy, then open `/register` with the admin email to create the teacher account on the live site.
5. Camera and microphone need HTTPS — Vercel gives you that automatically.

**Plan note:** Vercel's free *Hobby* plan is for personal, non-commercial projects only. Once the academy
sells courses, the *Pro* plan ($20/month) is the correct one. Everything else here stays free
(MongoDB Atlas free tier, LiveKit free tier).

Uploads are sent in ~3 MB pieces, which keeps them inside Vercel's request limit, and downloads stream
from the database, so no extra configuration is needed.

## Where to edit things

| What | File |
| --- | --- |
| Contact email, phone, social links | `lib/site.js` |
| Website & portal texts | `lib/i18n/en.js`, `de.js`, `ar.js` |
| Classroom, files, library texts | `lib/i18n/en-learning.js`, `de-learning.js`, `ar-learning.js` |
| Colors & fonts | `app/globals.css`, `app/layout.js` |
| Database models | `models/` |
| Server logic | `app/actions/` |

## Old folders you can delete

`app/(pages)/LandingPage`, `app/(pages)/choose-course`, `app/(pages)/dashboard/admin`, `app/(components)`,
`app/api/auth`, `app/api/course-registration`, `models/CourseRegistration.js` — they only contain redirects now.
