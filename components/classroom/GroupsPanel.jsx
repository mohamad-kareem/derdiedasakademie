"use client";

import { useEffect, useState } from "react";
import { useParticipants } from "@livekit/components-react";
import { Users, Shuffle, Play, Undo2, Send, LogIn, Loader2 } from "lucide-react";
import { useI18n } from "@/components/I18nProvider";
import { toast } from "@/components/ui/Toaster";
import { startBreakouts, endBreakouts, messageBreakouts, breakoutPresence } from "@/app/actions/classroom";
import { cn } from "@/lib/utils";

/**
 * Break-out groups, the teacher's side.
 *
 * Before the split it is a planning board: choose how many groups, shuffle the
 * class into them, move anyone by hand. Once running it becomes a monitor —
 * who is actually in each room, a line you can send into all of them at once,
 * a way to drop into one, and the button that brings everybody back.
 */
export default function GroupsPanel({ lessonId, me, running, group, onSwitchRoom, onRunning }) {
  const { t } = useI18n();
  const participants = useParticipants();
  const [count, setCount] = useState(2);
  const [plan, setPlan] = useState({}); // identity -> group
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [rooms, setRooms] = useState([]);

  const students = participants.filter((p) => p.identity !== me && p.attributes?.role !== "teacher");

  // While groups are running, keep an eye on who is actually where.
  useEffect(() => {
    if (!running) return undefined;
    let alive = true;
    const look = async () => {
      const res = await breakoutPresence(lessonId);
      if (alive && res?.ok) setRooms(res.rooms);
    };
    look();
    const id = setInterval(look, 8000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [running, lessonId]);

  function shuffle() {
    const shuffled = [...students].sort(() => Math.random() - 0.5);
    const next = {};
    shuffled.forEach((p, i) => {
      next[p.identity] = (i % count) + 1;
    });
    setPlan(next);
  }

  async function start() {
    const assignments = Object.fromEntries(
      students.map((p) => [p.identity, plan[p.identity] || 1]).filter(([, g]) => g >= 1),
    );
    if (!Object.keys(assignments).length) return toast(t("classroom.groups.needStudents"), "error");
    setBusy(true);
    const res = await startBreakouts(lessonId, assignments);
    setBusy(false);
    if (!res?.ok) return toast(t(res?.error || "errors.generic"), "error");
    onRunning?.({ groups: Math.max(...Object.values(assignments)), assignments });
  }

  async function bringBack() {
    setBusy(true);
    const res = await endBreakouts(lessonId);
    setBusy(false);
    if (!res?.ok) return toast(t(res?.error || "errors.generic"), "error");
    if (group > 0) onSwitchRoom?.(0);
    onRunning?.(null);
  }

  async function sendNote(e) {
    e.preventDefault();
    const text = note.trim();
    if (!text) return;
    setNote("");
    const res = await messageBreakouts(lessonId, text);
    if (!res?.ok) toast(t(res?.error || "errors.generic"), "error");
    else toast(t("classroom.groups.noteSent"));
  }

  /* ------------------------------------------------------------- running */
  if (running) {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <div className="border-b border-white/10 p-2">
          <button type="button" onClick={bringBack} disabled={busy} className="btn btn-sm w-full bg-gold-500 text-white hover:bg-gold-600">
            {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Undo2 className="size-3.5" />} {t("classroom.groups.bringBack")}
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-2">
          {rooms.map((r) => (
            <div key={r.group} className={cn("rounded-lg border p-2", group === r.group ? "border-gold-500/60 bg-gold-500/10" : "border-white/10 bg-white/5")}>
              <div className="flex items-center gap-2">
                <p className="flex-1 text-[12.5px] font-semibold text-white">
                  {t("classroom.groups.group", { n: r.group })}
                  <span className="ms-1.5 font-normal text-white/45">{t("classroom.inClass", { n: r.people.length })}</span>
                </p>
                <button
                  type="button"
                  onClick={() => onSwitchRoom?.(group === r.group ? 0 : r.group)}
                  className="rounded p-1 text-white/60 hover:bg-white/10 hover:text-white"
                  title={group === r.group ? t("classroom.groups.leaveGroup") : t("classroom.groups.joinGroup")}
                >
                  <LogIn className="size-3.5 rtl:-scale-x-100" />
                </button>
              </div>
              <ul className="mt-1 space-y-0.5">
                {r.people.length ? (
                  r.people.map((p) => (
                    <li key={p.identity} className="truncate text-[11.5px] text-white/60">{p.name || p.identity}</li>
                  ))
                ) : (
                  <li className="text-[11.5px] italic text-white/30">{t("classroom.groups.nobodyYet")}</li>
                )}
              </ul>
            </div>
          ))}
        </div>

        <form onSubmit={sendNote} className="flex gap-1.5 border-t border-white/10 p-2">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t("classroom.groups.notePlaceholder")}
            className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/35 focus:border-gold-400 focus:outline-none"
          />
          <button type="submit" className="rounded-lg bg-white/10 px-2.5 text-white hover:bg-white/20" title={t("classroom.groups.sendNote")}>
            <Send className="size-4 rtl:-scale-x-100" />
          </button>
        </form>
      </div>
    );
  }

  /* -------------------------------------------------------------- planning */
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="space-y-2 border-b border-white/10 p-2">
        <div className="flex items-center gap-2">
          <span className="text-[11px] uppercase tracking-wider text-white/45">{t("classroom.groups.howMany")}</span>
          <div className="flex overflow-hidden rounded-lg border border-white/10">
            {[2, 3, 4, 5, 6].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setCount(n)}
                className={cn("px-2.5 py-1 text-xs", count === n ? "bg-white/20 text-white" : "text-white/60 hover:bg-white/10")}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={shuffle} className="btn btn-sm flex-1 bg-white/10 text-white hover:bg-white/20">
            <Shuffle className="size-3.5" /> {t("classroom.groups.shuffle")}
          </button>
          <button type="button" onClick={start} disabled={busy} className="btn btn-sm flex-1 bg-gold-500 text-white hover:bg-gold-600">
            {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Play className="size-3.5" />} {t("classroom.groups.start")}
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {students.length ? (
          <ul className="space-y-1">
            {students.map((p) => (
              <li key={p.identity} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-white/5">
                <span className="min-w-0 flex-1 truncate text-[12.5px] text-white">{p.name || p.identity}</span>
                <div className="flex overflow-hidden rounded border border-white/10">
                  {Array.from({ length: count }, (_, i) => i + 1).map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setPlan((x) => ({ ...x, [p.identity]: n }))}
                      className={cn(
                        "px-2 py-0.5 text-[11px] tabular",
                        (plan[p.identity] || 0) === n ? "bg-gold-500 text-white" : "text-white/50 hover:bg-white/10",
                      )}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-2 py-6 text-center text-[12.5px] text-white/40">
            <Users className="mx-auto mb-2 size-5 opacity-40" />
            {t("classroom.groups.needStudents")}
          </p>
        )}
      </div>
    </div>
  );
}
