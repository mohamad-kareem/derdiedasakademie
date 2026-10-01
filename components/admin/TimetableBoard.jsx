"use client";

import { useCallback, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2, CalendarPlus, GripVertical, Clock, ArrowRight, Pencil } from "lucide-react";
import Modal from "@/components/ui/Modal";
import { useI18n } from "@/components/I18nProvider";
import { toast } from "@/components/ui/Toaster";
import { moveSlot, addSlot, fillNow, saveTimetable } from "@/app/actions/schedule";
import { clockOf, colourFor, minutesOfClock, DAY_KEYS } from "@/lib/schedule";
import { cn, formatDate } from "@/lib/utils";

/**
 * The academy's week.
 *
 * Not a calendar of dates but the standing arrangement: which course occupies
 * which evening, week in, week out. One block per slot, so a course that meets
 * twice appears twice. Drag a block and the course itself moves — the sessions
 * that follow from it are re-reckoned afterwards.
 *
 * Because nothing here is tied to a date, there is nothing to page through:
 * this is simply the week, and it is the same week every week.
 */

const PX_PER_MIN = 0.8; // an hour is 48px
const SNAP = 15;
const DEFAULT_FROM = 8 * 60;
const DEFAULT_TO = 21 * 60;

export default function TimetableBoard({ slots, courses, locale }) {
  const { t } = useI18n();
  const router = useRouter();
  const [picked, setPicked] = useState(null);
  const [adding, setAdding] = useState(null); // { day, start } for a new slot
  const [ghost, setGhost] = useState(null);
  const [busy, startTransition] = useTransition();
  const drag = useRef(null);
  const ghostRef = useRef(null);
  const boardRef = useRef(null);

  // The hours on show: around whatever is actually timetabled, with an hour of
  // air either side, so an evening academy is not made to scroll past its own
  // empty mornings.
  const [from, to] = useMemo(() => {
    if (!slots.length) return [DEFAULT_FROM, DEFAULT_TO];
    let lo = 1440;
    let hi = 0;
    for (const s of slots) {
      lo = Math.min(lo, s.start);
      hi = Math.max(hi, s.start + s.sessionMin);
    }
    lo = Math.max(0, Math.floor(lo / 60) * 60 - 60);
    hi = Math.min(1440, Math.ceil(hi / 60) * 60 + 60);
    return [lo, Math.min(1440, Math.max(hi, lo + 360))];
  }, [slots]);

  const byDay = useMemo(() => {
    const map = {};
    for (const s of slots) (map[s.day] ||= []).push(s);
    for (const list of Object.values(map)) list.sort((a, b) => a.start - b.start);
    return map;
  }, [slots]);

  /* --------------------------------------------------------------- moving */

  const commit = useCallback(
    (slot, day, start) => {
      startTransition(async () => {
        const res = await moveSlot(slot.course, slot.index, day, start);
        setGhost(null);
        if (res?.ok === false) toast(t(res.error, res.vars), "error");
        else {
          toast(t("admin.timetable.moved"));
          router.refresh();
        }
      });
    },
    [router, t],
  );

  /** The column under the pointer, from the columns' own geometry. */
  const dayUnder = useCallback((x, y) => {
    const cells = boardRef.current?.querySelectorAll("[data-day]") || [];
    let best = null;
    for (const cell of cells) {
      const r = cell.getBoundingClientRect();
      const dx = x < r.left ? r.left - x : x > r.right ? x - r.right : 0;
      const dy = y < r.top ? r.top - y : y > r.bottom ? y - r.bottom : 0;
      const far = dx * dx + dy * dy;
      if (!best || far < best.far) best = { far, day: Number(cell.dataset.day), rect: r };
      if (far === 0) break;
    }
    return best;
  }, []);

  const onPointerDown = (e, slot) => {
    if (!slot.mine || busy) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const cell = e.currentTarget.closest("[data-day]");
    const rect = cell?.getBoundingClientRect();
    drag.current = {
      slot,
      grabY: rect ? e.clientY - (rect.top + (slot.start - from) * PX_PER_MIN) : 0,
      moved: false,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e) => {
    const d = drag.current;
    if (!d) return;
    const hit = dayUnder(e.clientX, e.clientY);
    if (!hit) return;
    const raw = (e.clientY - hit.rect.top - d.grabY) / PX_PER_MIN + from;
    const start = Math.max(0, Math.min(1440 - d.slot.sessionMin, Math.round(raw / SNAP) * SNAP));
    if (hit.day !== d.slot.day || start !== d.slot.start) d.moved = true;
    const next = { key: d.slot.key, day: hit.day, start, sessionMin: d.slot.sessionMin };
    ghostRef.current = next;
    setGhost(next);
  };

  const onPointerUp = (slot) => {
    const d = drag.current;
    const where = ghostRef.current;
    drag.current = null;
    ghostRef.current = null;
    if (!d) return;
    if (!d.moved || !where) {
      setGhost(null);
      setPicked(courses.find((c) => c._id === slot.course) || null);
      return;
    }
    if (where.day === d.slot.day && where.start === d.slot.start) return setGhost(null);
    commit(d.slot, where.day, where.start);
  };

  /* ---------------------------------------------------------------- empty */

  const untimetabled = courses.filter((c) => c.mine && !c.slots.length);
  const hours = [];
  for (let m = Math.ceil(from / 60) * 60; m <= to; m += 60) hours.push(m);
  const height = (to - from) * PX_PER_MIN;

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <p className="flex-1 text-[12.5px] text-muted">{t("admin.timetable.hint")}</p>
        {busy && <Loader2 className="size-4 animate-spin text-muted" />}
      </div>

      <div ref={boardRef} className="card overflow-hidden">
        <div className="grid grid-cols-[46px_repeat(7,minmax(0,1fr))] border-b border-line bg-cream">
          <span />
          {DAY_KEYS.map((key) => (
            <span key={key} className="border-s border-line px-1.5 py-2 text-center text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted">
              {t(`weekdays.short.${key}`)}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-[46px_repeat(7,minmax(0,1fr))] pb-3">
          <div className="relative" style={{ height }}>
            {hours.map((m) => (
              <span key={m} className="absolute -translate-y-1/2 pe-1.5 text-end text-[10.5px] tabular text-muted" style={{ top: (m - from) * PX_PER_MIN, insetInlineEnd: 0 }}>
                {clockOf(m)}
              </span>
            ))}
          </div>

          {DAY_KEYS.map((key, day) => {
            const list = byDay[day] || [];
            const lanes = layout(list);
            return (
              <div key={key} data-day={day} className="relative border-s border-line" style={{ height }}>
                {hours.map((m) => (
                  <span key={m} className="pointer-events-none absolute inset-x-0 border-t border-line/70" style={{ top: (m - from) * PX_PER_MIN }} />
                ))}

                {/* An empty hour is a place a course could go. */}
                <button
                  type="button"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const raw = (e.clientY - rect.top) / PX_PER_MIN + from;
                    setAdding({ day, start: Math.max(0, Math.round(raw / 30) * 30) });
                  }}
                  className="absolute inset-0 cursor-copy"
                  aria-label={t("admin.timetable.addHere")}
                />

                {ghost?.day === day && (
                  <span
                    className="pointer-events-none absolute inset-x-[2px] z-20 flex items-start justify-center rounded-[3px] border-2 border-dashed border-navy-700 bg-navy-900/10 pt-0.5 text-[10.5px] font-semibold tabular text-navy-800"
                    style={{ top: (ghost.start - from) * PX_PER_MIN, height: Math.max(20, ghost.sessionMin * PX_PER_MIN - 2) }}
                  >
                    {clockOf(ghost.start)}
                  </span>
                )}

                {list.map((s) => {
                  const lane = lanes[s.key] || { index: 0, of: 1 };
                  const colour = colourFor(s.course);
                  return (
                    <button
                      key={s.key}
                      type="button"
                      onPointerDown={(e) => onPointerDown(e, s)}
                      onPointerMove={onPointerMove}
                      onPointerUp={() => onPointerUp(s)}
                      className={cn(
                        "absolute overflow-hidden rounded-[3px] border-s-[3px] px-1.5 py-1 text-start",
                        s.mine ? "cursor-grab touch-none active:cursor-grabbing" : "cursor-pointer",
                        ghost?.key === s.key && "opacity-35",
                      )}
                      style={{
                        top: (s.start - from) * PX_PER_MIN,
                        height: Math.max(22, s.sessionMin * PX_PER_MIN - 2),
                        insetInlineStart: `calc(${(lane.index / lane.of) * 100}% + 2px)`,
                        width: `calc(${100 / lane.of}% - 4px)`,
                        background: colour.tint,
                        borderInlineStartColor: colour.bar,
                        color: colour.ink,
                      }}
                      title={`${s.title} · ${clockOf(s.start)}`}
                    >
                      <span dir="auto" className="block truncate text-[11.5px] font-semibold leading-tight">{s.title}</span>
                      <span dir="auto" className="block truncate text-[10px] leading-tight opacity-75">
                        {/* The clock is always read left to right, even in Arabic. */}
                        <span dir="ltr">{clockOf(s.start)}–{clockOf(Math.min(1439, s.start + s.sessionMin))}</span>
                        {s.teacher ? ` · ${s.teacher}` : ""}
                      </span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* ------------------------------------------------- not timetabled yet */}
      {untimetabled.length > 0 && (
        <div className="mt-4 rounded-[3px] border border-line bg-paper p-3">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">{t("admin.timetable.noSlotYet")}</p>
          <ul className="flex flex-wrap gap-1.5">
            {untimetabled.map((c) => (
              <li key={c._id}>
                <button
                  type="button"
                  onClick={() => setPicked(c)}
                  className="inline-flex items-center gap-1.5 rounded-[2px] border border-line bg-cream px-2.5 py-1.5 text-[12.5px] text-ink hover:border-navy-700 hover:text-navy-900"
                >
                  <span className="size-2.5 rounded-[1px]" style={{ background: colourFor(c._id).bar }} aria-hidden />
                  {c.level} · {c.title}
                  <Plus className="size-3.5 text-muted" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Legend courses={courses.filter((c) => c.slots.length)} />

      {picked && <CoursePanel key={picked._id} course={picked} onClose={() => setPicked(null)} locale={locale} t={t} onChanged={() => router.refresh()} />}

      {adding && (
        <PickCourse
          courses={courses.filter((c) => c.mine)}
          at={adding}
          onClose={() => setAdding(null)}
          t={t}
          onChosen={(courseId) => {
            startTransition(async () => {
              const res = await addSlot(courseId, adding.day, adding.start);
              setAdding(null);
              if (res?.ok === false) toast(t(res.error, res.vars), "error");
              else {
                toast(t("admin.timetable.slotAdded"));
                router.refresh();
              }
            });
          }}
        />
      )}
    </>
  );
}

/** Two courses at the same hour sit side by side rather than on top. */
function layout(list) {
  const ends = [];
  const out = {};
  for (const s of list) {
    const finish = s.start + s.sessionMin;
    let i = ends.findIndex((end) => end <= s.start);
    if (i === -1) {
      i = ends.length;
      ends.push(finish);
    } else {
      ends[i] = finish;
    }
    out[s.key] = { index: i };
  }
  const of = Math.max(1, ends.length);
  for (const key of Object.keys(out)) out[key].of = of;
  return out;
}

function Legend({ courses }) {
  if (courses.length < 2) return null;
  return (
    <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
      {courses.map((c) => (
        <li key={c._id} className="flex items-center gap-1.5 text-[11.5px] text-muted">
          <span className="size-2.5 rounded-[1px]" style={{ background: colourFor(c._id).bar }} aria-hidden />
          <span className="text-ink">{c.title}</span>
          {c.teacher && <span className="text-muted/80">· {c.teacher}</span>}
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------- choosing a course */

function PickCourse({ courses, at, onClose, onChosen, t }) {
  return (
    <Modal open onClose={onClose} title={t("admin.timetable.addHere")} description={`${t(`weekdays.long.${DAY_KEYS[at.day]}`)} · ${clockOf(at.start)}`} size="sm">
      {courses.length ? (
        <ul className="divide-y divide-line">
          {courses.map((c) => (
            <li key={c._id}>
              <button type="button" onClick={() => onChosen(c._id)} className="flex w-full items-center gap-2 px-1 py-2.5 text-start hover:bg-cream">
                <span className="size-2.5 shrink-0 rounded-[1px]" style={{ background: colourFor(c._id).bar }} aria-hidden />
                <span className="min-w-0 flex-1 truncate text-[13px] text-ink">{c.level} · {c.title}</span>
                <ArrowRight className="size-3.5 shrink-0 text-muted rtl:rotate-180" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="py-6 text-center text-[13px] text-muted">{t("admin.timetable.noCourses")}</p>
      )}
    </Modal>
  );
}

/* -------------------------------------------------------- one course's week */

function CoursePanel({ course, onClose, locale, t, onChanged }) {
  const [meetings, setMeetings] = useState(() => course.slots.map((s) => ({ day: s.day, start: s.start })));
  const [time, setTime] = useState(() => clockOf(course.slots[0]?.start ?? 18 * 60));
  const [sessionMin, setSessionMin] = useState(course.sessionMin || 90);
  const [weeksAhead, setWeeksAhead] = useState(course.weeksAhead ?? 3);
  const [busy, startTransition] = useTransition();

  const start = minutesOfClock(time);
  const has = (d) => meetings.some((m) => m.day === d && m.start === start);

  function toggle(d) {
    setMeetings((list) => (has(d) ? list.filter((m) => !(m.day === d && m.start === start)) : [...list, { day: d, start }]));
  }

  function save() {
    startTransition(async () => {
      const res = await saveTimetable(course._id, { meetings, sessionMin, weeksAhead });
      if (res?.ok === false) return toast(t(res.error, res.vars), "error");
      toast(res.added ? t("admin.timetable.savedWith", { n: res.added }) : t("admin.saved"));
      if (res.skipped?.length) toast(t("admin.timetable.someSkipped", { n: res.skipped.length }), "error");
      onChanged?.();
      onClose();
    });
  }

  function fill() {
    startTransition(async () => {
      const res = await fillNow(course._id);
      if (res?.ok === false) return toast(t(res.error, res.vars), "error");
      toast(t(res.message, res.vars));
      onChanged?.();
    });
  }

  const colour = colourFor(course._id);

  return (
    <Modal open onClose={onClose} title={course.title} description={`${course.level}${course.teacher ? ` · ${course.teacher}` : ""}`}>
      <div className="space-y-4">
        <p className="flex flex-wrap items-center gap-x-4 gap-y-1 border-s-[3px] bg-cream px-3 py-2 text-[12.5px] text-muted" style={{ borderInlineStartColor: colour.bar }}>
          <span className="inline-flex items-center gap-1.5">
            <Clock className="size-3.5" /> {course.sessions} {t("admin.timetable.sessionsPlanned")}
          </span>
          {course.nextAt && <span>{t("admin.timetable.nextOn", { date: formatDate(course.nextAt, locale, { weekday: "short" }) })}</span>}
          {course.filledUntil && <span>{t("admin.timetable.filledUntil", { date: formatDate(course.filledUntil, locale) })}</span>}
        </p>

        {course.mine ? (
          <>
            <div className="flex flex-wrap items-end gap-3">
              <label className="block">
                <span className="label">{t("admin.timetable.at")}</span>
                <input type="time" step="300" value={time} onChange={(e) => setTime(e.target.value)} className="input h-9 w-32 py-0" />
              </label>
              <div className="min-w-0">
                <span className="label">{t("admin.timetable.onDays")}</span>
                <div className="flex flex-wrap gap-1">
                  {DAY_KEYS.map((key, d) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => toggle(d)}
                      aria-pressed={has(d)}
                      className={cn(
                        "h-9 min-w-[44px] rounded-[3px] border px-2 text-[12.5px] font-medium",
                        has(d) ? "border-navy-900 bg-navy-900 text-white" : "border-line bg-paper text-muted hover:bg-cream hover:text-navy-900",
                      )}
                    >
                      {t(`weekdays.short.${key}`)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {meetings.length > 0 && (
              <ul className="flex flex-wrap gap-1.5">
                {[...meetings].sort((a, b) => a.day - b.day || a.start - b.start).map((m) => (
                  <li key={`${m.day}:${m.start}`}>
                    <button
                      type="button"
                      onClick={() => setMeetings((list) => list.filter((x) => !(x.day === m.day && x.start === m.start)))}
                      className="inline-flex items-center gap-1.5 rounded-[2px] border border-line bg-paper px-2 py-1 text-[12px] text-ink hover:border-red-300 hover:text-red-700"
                      title={t("admin.timetable.removeSlot")}
                    >
                      <span className="font-medium">{t(`weekdays.short.${DAY_KEYS[m.day]}`)}</span>
                      <span className="tabular text-muted">{clockOf(m.start)}</span>
                      <Trash2 className="size-3" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="label">{t("admin.fields.duration")}</span>
                <input type="number" min="15" step="5" value={sessionMin} onChange={(e) => setSessionMin(Number(e.target.value))} className="input h-9 py-0" />
              </label>
              <label className="block">
                <span className="label">{t("admin.timetable.weeksAhead")}</span>
                <input type="number" min="0" max="12" value={weeksAhead} onChange={(e) => setWeeksAhead(Number(e.target.value))} className="input h-9 py-0" />
              </label>
            </div>
            <p className="text-[11.5px] text-muted">{t("admin.timetable.weeksAheadHint")}</p>
          </>
        ) : (
          <p className="text-[13px] text-muted">{t("admin.course.readOnly")}</p>
        )}

        <div className="flex flex-wrap items-center gap-2 border-t border-line pt-4">
          <Link href={`/admin/courses/${course._id}?tab=sessions`} className="btn btn-outline btn-sm">
            <Pencil className="size-3.5" /> {t("admin.timetable.openSessions")}
          </Link>
          {course.mine && (
            <button type="button" onClick={fill} disabled={busy} className="btn btn-outline btn-sm">
              <CalendarPlus className="size-3.5" /> {t("admin.timetable.fillNow")}
            </button>
          )}
          {course.mine && (
            <button type="button" onClick={save} disabled={busy} className="btn btn-primary btn-sm ms-auto">
              {busy ? <Loader2 className="size-3.5 animate-spin" /> : null} {t("common.save")}
            </button>
          )}
        </div>

        {course.mine && (
          <p className="flex items-start gap-1.5 text-[11.5px] text-muted">
            <GripVertical className="mt-px size-3.5 shrink-0" /> {t("admin.timetable.dragHint")}
          </p>
        )}
      </div>
    </Modal>
  );
}
