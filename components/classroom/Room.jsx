"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  useRoomContext, useLocalParticipant, useParticipants, useTracks, useConnectionState, RoomAudioRenderer, useParticipantAttributes,
} from "@livekit/components-react";
import { Track, RoomEvent, ConnectionState, DisconnectReason } from "livekit-client";
import {
  Mic, MicOff, Video, VideoOff, MonitorUp, MonitorX, Hand, Smile, MessageSquare, Users, ListChecks, BookA, PhoneOff, Boxes,
  LayoutGrid, PenLine, FileText, Lock, Unlock, X, ChevronLeft, ChevronRight, Plus, Upload, Loader2, Power, Keyboard,
} from "lucide-react";
import { useBus } from "./useBus";
import VideoTile from "./VideoTile";
import Whiteboard from "./Whiteboard";
import ChatPanel from "./ChatPanel";
import PeoplePanel from "./PeoplePanel";
import GroupsPanel from "./GroupsPanel";
import QuizPanel, { PollAnswer } from "./QuizPanel";
import WordsPanel from "./WordsPanel";
import GermanKeyboard from "./GermanKeyboard";
import { ARTICLE_COLORS } from "./boardDraw";
import { useI18n } from "@/components/I18nProvider";
import { toast } from "@/components/ui/Toaster";
import {
  heartbeat, sendChatMessage, createPoll, answerPoll, closePoll, addVocab, deleteVocab, muteParticipant, setParticipantCamera, removeParticipant,
  setScreenSharePermission, setRoomLocked, endClass,
} from "@/app/actions/classroom";
import { uploadFile } from "@/lib/upload-client";
import { fileKind, fileUrl } from "@/lib/files-client";
import { cn } from "@/lib/utils";

const REACTIONS = ["👍", "👏", "❤️", "😂", "🎉", "😮"];
const SIGNALS = ["understood", "repeat", "slower", "question"];
const SIGNAL_ICON = { understood: "✅", repeat: "🔁", slower: "🐢", question: "❓" };

function useElapsed(startsAt) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const s = Math.max(0, Math.floor((now - new Date(startsAt).getTime()) / 1000));
  const h = Math.floor(s / 3600);
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const sec = String(s % 60).padStart(2, "0");
  return now < new Date(startsAt).getTime() ? "00:00" : h ? `${h}:${m}:${sec}` : `${m}:${sec}`;
}

function CtrlButton({ active, danger, onClick, icon: I, label, badge, disabled, className }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      className={cn(
        "relative flex h-12 min-w-12 flex-col items-center justify-center gap-0.5 rounded-xl px-2 text-[10px] font-medium transition disabled:opacity-40",
        danger ? "bg-red-600 text-white hover:bg-red-700" : active ? "bg-gold-500 text-white" : "bg-white/10 text-white/85 hover:bg-white/20",
        className,
      )}
    >
      <I className="size-5" />
      <span className="hidden max-w-16 truncate lg:block">{label}</span>
      {badge > 0 && <span className="absolute -end-1 -top-1 rounded-full bg-red-500 px-1.5 text-[10px] font-bold leading-4 text-white">{badge}</span>}
    </button>
  );
}

export default function Room({ me, isTeacher, lesson, course, docs: initialDocs, initial, storage, backHref, initiallyLocked, group = 0, breakoutActive = false, onSwitchRoom }) {
  const { t } = useI18n();
  const router = useRouter();
  const room = useRoomContext();
  const connection = useConnectionState();
  const { localParticipant, isMicrophoneEnabled, isCameraEnabled, isScreenShareEnabled } = useLocalParticipant();
  const { attributes: myAttributes } = useParticipantAttributes({ participant: localParticipant });
  const participants = useParticipants();
  const cameraTracks = useTracks([{ source: Track.Source.Camera, withPlaceholder: true }], { onlySubscribed: false });
  const screenTracks = useTracks([Track.Source.ScreenShare]);
  const elapsed = useElapsed(lesson.startsAt);

  const [panel, setPanel] = useState(() => (typeof window !== "undefined" && window.innerWidth < 1024 ? null : "chat"));
  const [stage, setStage] = useState({ mode: "grid", board: { page: 1, pages: 1, bg: "lines" }, doc: null, word: null });
  const [boards, setBoards] = useState({});
  const [drafts, setDrafts] = useState({});
  const [drawAllowed, setDrawAllowed] = useState(false);
  const [messages, setMessages] = useState(initial.messages || []);
  const [unread, setUnread] = useState(0);
  const [poll, setPoll] = useState(initial.poll || null);
  const [responses, setResponses] = useState(() => Object.fromEntries((initial.poll?.responses || []).map((r) => [String(r.user), r.choice])));
  const [myChoice, setMyChoice] = useState(() => {
    const mine = (initial.poll?.responses || []).find((r) => String(r.user) === me.id);
    return mine ? mine.choice : -1;
  });
  const [lastClosed, setLastClosed] = useState(null);
  const [vocab, setVocab] = useState(initial.vocab || []);
  const [reactions, setReactions] = useState([]);
  const [signals, setSignals] = useState({});
  const [locked, setLocked] = useState(Boolean(initiallyLocked));
  const [screenAllowed, setScreenAllowed] = useState([]);
  const [docs, setDocs] = useState(initialDocs || []);
  const [menu, setMenu] = useState(null); // "react" | "docs" | "keys"
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [ended, setEnded] = useState(false);
  const [ask, setAsk] = useState(null); // { what: "camera" | "mic", from }
  // A teacher who reloads mid-split should still see the monitor, not the planner.
  const [breakouts, setBreakouts] = useState(breakoutActive ? { groups: 0, assignments: {} } : null);
  const stateRef = useRef({});
  const panelRef = useRef(panel);
  const docInput = useRef(null);

  useEffect(() => {
    stateRef.current = { stage, boards, drawAllowed };
  }, [stage, boards, drawAllowed]);
  useEffect(() => {
    panelRef.current = panel;
  }, [panel]);
  const unreadShown = panel === "chat" ? 0 : unread;

  const pageKey = stage.mode === "doc" && stage.doc ? `doc:${stage.doc.key}:${stage.doc.page}` : `board:${stage.board.page}`;
  const handRaised = myAttributes?.hand === "1";

  /* ---------------- bus ---------------- */

  const flashSignal = useCallback((identity, kind) => {
    setSignals((s) => ({ ...s, [identity]: kind }));
    setTimeout(() => setSignals((s) => (s[identity] === kind ? { ...s, [identity]: undefined } : s)), 12000);
  }, []);

  const addReaction = useCallback((emoji, name) => {
    const id = Math.random().toString(36).slice(2);
    setReactions((r) => [...r.slice(-20), { id, emoji, name, left: 10 + Math.random() * 25 }]);
    setTimeout(() => setReactions((r) => r.filter((x) => x.id !== id)), 3500);
  }, []);

  const applyOp = useCallback((k, op) => {
    setBoards((b) => {
      const list = b[k] || [];
      if (list.some((o) => o.id === op.id)) return b;
      return { ...b, [k]: [...list, op] };
    });
    setDrafts((d) => {
      if (!d[k]?.[op.id]) return d;
      const { [op.id]: _drop, ...rest } = d[k];
      return { ...d, [k]: rest };
    });
  }, []);

  const send = useBus(
    useCallback(
      (type, payload, sender) => {
        const from = sender?.identity;
        const senderIsTeacher = sender?.attributes?.role === "teacher";
        switch (type) {
          case "sync:req": {
            const s = stateRef.current;
            const hasState = Object.keys(s.boards).length > 0 || s.stage.mode !== "grid";
            if (isTeacher || (senderIsTeacher && hasState)) send("sync", s, { to: [from] });
            break;
          }
          case "sync":
            if (!isTeacher || Object.keys(stateRef.current.boards).length === 0) {
              setStage(payload.stage);
              setBoards(payload.boards || {});
              setDrawAllowed(Boolean(payload.drawAllowed));
            }
            break;
          case "stage":
            if (senderIsTeacher) setStage(payload);
            break;
          case "wb:op":
            applyOp(payload.k, payload.op);
            break;
          case "wb:draft":
            setDrafts((d) => ({ ...d, [payload.k]: { ...(d[payload.k] || {}), [payload.op.id]: payload.op } }));
            break;
          case "wb:erase":
            setBoards((b) => ({ ...b, [payload.k]: (b[payload.k] || []).filter((o) => !payload.ids.includes(o.id)) }));
            break;
          case "wb:clear":
            if (senderIsTeacher) setBoards((b) => ({ ...b, [payload.k]: [] }));
            break;
          case "wb:perm":
            if (senderIsTeacher) {
              setDrawAllowed(Boolean(payload.allowed));
              toast(payload.allowed ? t("classroom.board.nowAllowed") : t("classroom.board.nowLocked"));
            }
            break;
          case "chat":
            setMessages((m) => (m.some((x) => x._id === payload._id) ? m : [...m, payload]));
            setUnread((n) => (panelRef.current === "chat" ? 0 : n + 1));
            break;
          case "reaction":
            addReaction(payload.emoji, sender?.name);
            break;
          case "signal":
            flashSignal(from, payload.kind);
            if (isTeacher) toast(`${sender?.name}: ${SIGNAL_ICON[payload.kind]} ${t(`classroom.signals.${payload.kind}`)}`);
            break;
          case "breakout:start":
            // Announced in the main room, so everyone hears it at once.
            if (senderIsTeacher || !sender) {
              const mineNow = payload.assignments?.[me.id];
              if (!isTeacher && mineNow) onSwitchRoom?.(Number(mineNow));
              if (isTeacher) setBreakouts({ groups: payload.groups, assignments: payload.assignments });
            }
            break;
          case "breakout:end":
            // Sent by the server into each group room, where the teacher is not.
            if (!sender || senderIsTeacher) {
              if (group > 0) onSwitchRoom?.(0);
              if (isTeacher) setBreakouts(null);
            }
            break;
          case "breakout:note":
            if (!sender || senderIsTeacher) toast(`${payload.from}: ${payload.text}`);
            break;
          case "ask":
            // The teacher would like this person's camera or microphone on.
            // Only they can actually do it, so they are asked, not switched.
            if (senderIsTeacher) setAsk({ what: payload.what, from: sender?.name || t("classroom.teacher") });
            break;
          case "hand:lower":
            if (senderIsTeacher && (payload.all || payload.identity === me.id)) room.localParticipant.setAttributes({ hand: "" }).catch(() => {});
            break;
          case "poll:start":
            if (senderIsTeacher) {
              setPoll(payload);
              setResponses({});
              setMyChoice(-1);
              setLastClosed(null);
            }
            break;
          case "poll:answer":
            if (isTeacher) setResponses((r) => ({ ...r, [from]: payload.choice }));
            break;
          case "poll:close":
            if (senderIsTeacher) {
              setPoll(null);
              setLastClosed(payload);
              if (panelRef.current !== "quiz") setPanel("quiz");
            }
            break;
          case "vocab:add":
            setVocab((v) => (v.some((x) => x._id === payload._id) ? v : [payload, ...v]));
            break;
          case "vocab:del":
            setVocab((v) => v.filter((x) => x._id !== payload.id));
            break;
          default:
            break;
        }
      },
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [isTeacher, me.id, room, applyOp, addReaction, flashSignal, t],
    ),
  );

  /* ---------------- lifecycle ---------------- */

  useEffect(() => {
    if (connection !== ConnectionState.Connected) return;
    heartbeat(lesson._id);
    const id = setInterval(() => heartbeat(lesson._id), 60000);
    const timer = setTimeout(() => send("sync:req", {}), 800);
    return () => {
      clearInterval(id);
      clearTimeout(timer);
    };
  }, [connection, lesson._id, send]);

  useEffect(() => {
    const onDisconnected = (reason) => {
      if (reason === DisconnectReason.ROOM_DELETED || reason === DisconnectReason.PARTICIPANT_REMOVED) setEnded(reason === DisconnectReason.ROOM_DELETED ? "ended" : "removed");
    };
    const onConnected = (p) => {
      if (isTeacher && p) setTimeout(() => send("sync", stateRef.current, { to: [p.identity] }), 1200);
    };
    room.on(RoomEvent.Disconnected, onDisconnected);
    room.on(RoomEvent.ParticipantConnected, onConnected);
    return () => {
      room.off(RoomEvent.Disconnected, onDisconnected);
      room.off(RoomEvent.ParticipantConnected, onConnected);
    };
  }, [room, isTeacher, send]);

  /* ---------------- actions ---------------- */

  function changeStage(next) {
    const merged = { ...stage, ...next };
    setStage(merged);
    send("stage", merged);
  }

  function boardOp(op) {
    applyOp(pageKey, op);
    send("wb:op", { k: pageKey, op });
  }
  function boardDraft(op) {
    send("wb:draft", { k: pageKey, op: { ...op, p: op.p ? [...op.p] : undefined } }, { lossy: true });
  }
  function boardErase(ids) {
    setBoards((b) => ({ ...b, [pageKey]: (b[pageKey] || []).filter((o) => !ids.includes(o.id)) }));
    send("wb:erase", { k: pageKey, ids });
  }
  function boardClear() {
    setBoards((b) => ({ ...b, [pageKey]: [] }));
    send("wb:clear", { k: pageKey });
  }
  function toggleDraw() {
    const next = !drawAllowed;
    setDrawAllowed(next);
    send("wb:perm", { allowed: next });
  }

  async function onChatSend({ text, attachment, error }) {
    if (error) return toast(t(error.includes(".") ? error : "files.uploadFailed"), "error");
    const res = await sendChatMessage(lesson._id, { text, attachment });
    if (!res.ok) return toast(t(res.error), "error");
    setMessages((m) => [...m, res.data]);
    send("chat", res.data);
  }

  async function toggleHand() {
    try {
      await localParticipant.setAttributes({ hand: handRaised ? "" : "1" });
    } catch {
      toast(t("errors.generic"), "error");
    }
  }

  function react(emoji) {
    addReaction(emoji, me.name);
    send("reaction", { emoji });
    setMenu(null);
  }
  function signal(kind) {
    flashSignal(me.id, kind);
    send("signal", { kind });
    setMenu(null);
    toast(`${SIGNAL_ICON[kind]} ${t("classroom.signalSent")}`);
  }

  async function toggleScreen() {
    try {
      await localParticipant.setScreenShareEnabled(!isScreenShareEnabled, { audio: true });
    } catch (err) {
      if (err?.name !== "NotAllowedError") toast(t("classroom.screenFailed"), "error");
    }
  }

  const canShareScreen = isTeacher || (localParticipant?.permissions?.canPublishSources || []).includes(3);

  async function onCreatePoll(data) {
    const res = await createPoll(lesson._id, data);
    if (!res.ok) {
      toast(t(res.error), "error");
      return false;
    }
    setPoll(res.data);
    setResponses({});
    setLastClosed(null);
    send("poll:start", res.data);
    return true;
  }
  async function onAnswer(choice) {
    setMyChoice(choice);
    const res = await answerPoll(lesson._id, poll._id, choice);
    if (!res.ok) return toast(t(res.error), "error");
    send("poll:answer", { pollId: poll._id, choice });
  }
  const counts = useMemo(() => (poll ? poll.options.map((_, i) => Object.values(responses).filter((c) => c === i).length) : []), [poll, responses]);
  async function onClosePoll() {
    const res = await closePoll(lesson._id, poll._id);
    if (!res.ok) return toast(t(res.error), "error");
    const payload = { poll: { ...poll, correctIndex: res.data.correctIndex }, counts: poll.options.map((_, i) => res.data.responses.filter((r) => r.choice === i).length) };
    setPoll(null);
    setLastClosed(payload);
    send("poll:close", payload);
  }

  async function onAddVocab(item) {
    const res = await addVocab(lesson._id, item);
    if (!res.ok) {
      toast(t(res.error), "error");
      return false;
    }
    setVocab((v) => [res.data, ...v]);
    send("vocab:add", res.data);
    return true;
  }
  async function onDeleteVocab(id) {
    const res = await deleteVocab(lesson._id, id);
    if (!res.ok) return toast(t(res.error), "error");
    setVocab((v) => v.filter((x) => x._id !== id));
    send("vocab:del", { id });
  }

  async function mute(identity, trackSid) {
    if (!trackSid) return;
    const res = await muteParticipant(lesson._id, identity, trackSid);
    if (!res.ok) toast(t(res.error), "error");
  }
  async function muteAll() {
    const tasks = participants
      .filter((p) => p.identity !== me.id && p.attributes?.role !== "teacher")
      .map((p) => p.getTrackPublication(Track.Source.Microphone))
      .filter((pub) => pub && !pub.isMuted);
    await Promise.all(participants.filter((p) => p.identity !== me.id && p.attributes?.role !== "teacher").map((p) => {
      const pub = p.getTrackPublication(Track.Source.Microphone);
      return pub && !pub.isMuted ? muteParticipant(lesson._id, p.identity, pub.trackSid) : null;
    }));
    toast(t("classroom.mutedAll", { n: tasks.length }));
  }
  /**
   * A camera can be switched off from here, but never on: a browser will not
   * let a page start someone's camera without them pressing something. So the
   * teacher asks, and the student gets a prompt with the button.
   */
  async function cameraOff(identity, trackSid) {
    if (!trackSid) return;
    const res = await setParticipantCamera(lesson._id, identity, trackSid, true);
    if (!res.ok) toast(t(res.error), "error");
  }
  function askFor(identity, what) {
    const who = participants.find((p) => p.identity === identity);
    send("ask", { what }, { to: [identity] });
    toast(t("classroom.asked", { name: who?.name || "" }));
  }

  async function remove(identity) {
    const res = await removeParticipant(lesson._id, identity);
    if (!res.ok) toast(t(res.error), "error");
  }
  async function toggleScreenPermission(identity, allowed) {
    const res = await setScreenSharePermission(lesson._id, identity, allowed);
    if (!res.ok) return toast(t(res.error), "error");
    setScreenAllowed((list) => (allowed ? [...list, identity] : list.filter((x) => x !== identity)));
  }
  function lowerHand(identity) {
    if (identity === me.id) return toggleHand();
    send("hand:lower", { identity });
  }
  async function toggleLock() {
    const res = await setRoomLocked(lesson._id, !locked);
    if (!res.ok) return toast(t(res.error), "error");
    setLocked(!locked);
    toast(!locked ? t("classroom.lockedOn") : t("classroom.lockedOff"));
  }
  async function finishClass() {
    const res = await endClass(lesson._id);
    if (!res.ok) return toast(t(res.error), "error");
    setEnded("ended");
    room.disconnect();
  }
  function leave() {
    room.disconnect();
    router.push(backHref);
  }

  async function uploadDoc(file) {
    if (!file) return;
    setUploadingDoc(true);
    try {
      const doc = await uploadFile(file, { scope: "materials", courseId: course._id });
      setDocs((d) => [doc, ...d]);
      openDoc(doc);
    } catch (err) {
      toast(t(String(err.message).includes(".") ? err.message : "files.uploadFailed"), "error");
    } finally {
      setUploadingDoc(false);
    }
  }
  function openDoc(doc) {
    setMenu(null);
    changeStage({ mode: "doc", doc: { key: doc.key, name: doc.name, kind: fileKind(doc) === "image" ? "image" : "pdf", page: 1, pages: 1 } });
  }

  const onPageCount = useCallback((n) => {
    setStage((s) => (s.doc && s.doc.pages !== n ? { ...s, doc: { ...s.doc, pages: n } } : s));
  }, []);

  /* ---------------- render ---------------- */

  if (ended) {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-4 bg-navy-950 p-6 text-center text-white">
        <div className="flag-stripe h-1 w-16 rounded-full" />
        <h1 className="text-2xl font-semibold">{ended === "removed" ? t("classroom.removedTitle") : t("classroom.endedTitle")}</h1>
        <p className="max-w-sm text-white/60">{t("classroom.endedText")}</p>
        <button type="button" onClick={() => router.push(backHref)} className="btn btn-gold btn-lg mt-2">{t("classroom.backToCourse")}</button>
      </div>
    );
  }

  const screenShare = screenTracks[0];
  const teacherFirst = [...cameraTracks].sort((a, b) => (b.participant.attributes?.role === "teacher") - (a.participant.attributes?.role === "teacher") || (a.participant.isLocal ? 1 : 0) - (b.participant.isLocal ? 1 : 0));
  const showGrid = stage.mode === "grid" && !screenShare;
  const n = teacherFirst.length;
  const cols = n <= 1 ? 1 : n <= 4 ? 2 : n <= 9 ? 3 : 4;
  const rows = Math.ceil(n / cols);
  const canDraw = isTeacher || drawAllowed;
  const studentPollPopup = !isTeacher && poll && myChoice < 0 && panel !== "quiz";

  const background =
    stage.mode === "doc" && stage.doc
      ? { kind: stage.doc.kind, url: fileUrl(stage.doc, { inline: true }), page: stage.doc.page }
      : { kind: stage.board.bg };

  const panels = [
    { id: "chat", icon: MessageSquare, label: t("classroom.panels.chat"), badge: unreadShown },
    { id: "people", icon: Users, label: t("classroom.panels.people"), badge: participants.filter((p) => p.attributes?.hand === "1").length },
    { id: "quiz", icon: ListChecks, label: t("classroom.panels.quiz"), badge: !isTeacher && poll && myChoice < 0 ? 1 : 0 },
    { id: "words", icon: BookA, label: t("classroom.panels.words") },
    ...(isTeacher ? [{ id: "groups", icon: Boxes, label: t("classroom.panels.groups"), badge: breakouts ? 1 : 0 }] : []),
  ];

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-navy-950 text-white" data-classroom>
      <RoomAudioRenderer />

      {/* top bar */}
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-white/10 px-3">
        <span className="rounded bg-white px-1 py-0.5" dir="ltr">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo/mark.png" alt="DDD" className="h-4 w-auto" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">
            <span className="me-2 rounded bg-white/10 px-1.5 py-0.5 text-[11px] font-bold" dir="ltr">{course.level}</span>
            {lesson.title}
            <span className="ms-2 hidden font-normal text-white/45 sm:inline">· {course.title}</span>
          </p>
        </div>
        {group > 0 && (
          <span className="flex items-center gap-1 rounded-full bg-gold-500/20 px-2 py-0.5 text-[11px] font-semibold text-gold-300">
            <Boxes className="size-3" /> {t("classroom.groups.group", { n: group })}
          </span>
        )}
        {locked && isTeacher && <Lock className="size-4 text-gold-400" />}
        <span className="hidden font-mono text-xs text-white/60 sm:inline" dir="ltr">{elapsed}</span>
        <span className="flex items-center gap-1 text-xs text-white/60"><Users className="size-3.5" /> {participants.length}</span>
        {connection !== ConnectionState.Connected && (
          <span className="flex items-center gap-1 rounded-full bg-amber-500/20 px-2 py-0.5 text-[11px] text-amber-300"><Loader2 className="size-3 animate-spin" /> {t(`classroom.connection.${connection}`)}</span>
        )}
      </header>

      <div className="flex min-h-0 flex-1">
        <main className="relative flex min-w-0 flex-1 flex-col gap-2 p-2">
          {/* teacher stage switcher */}
          {isTeacher && (
            <div className="flex flex-wrap items-center gap-1.5">
              <div className="flex rounded-lg bg-white/5 p-0.5">
                {[
                  { mode: "grid", icon: LayoutGrid, label: t("classroom.stage.grid") },
                  { mode: "board", icon: PenLine, label: t("classroom.stage.board") },
                ].map(({ mode, icon: I, label }) => (
                  <button key={mode} type="button" onClick={() => changeStage({ mode })} className={cn("flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium", stage.mode === mode ? "bg-white text-navy-900" : "text-white/70 hover:text-white")}>
                    <I className="size-3.5" /> {label}
                  </button>
                ))}
                <div className="relative">
                  <button type="button" onClick={() => setMenu(menu === "docs" ? null : "docs")} className={cn("flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium", stage.mode === "doc" ? "bg-white text-navy-900" : "text-white/70 hover:text-white")}>
                    <FileText className="size-3.5" /> {t("classroom.stage.document")}
                  </button>
                  {menu === "docs" && (
                    <div className="absolute start-0 top-full z-30 mt-1 w-72 overflow-hidden rounded-xl border border-white/10 bg-navy-900 shadow-2xl">
                      <input ref={docInput} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" className="hidden" onChange={(e) => { uploadDoc(e.target.files?.[0]); e.target.value = ""; }} />
                      {storage && (
                        <button type="button" disabled={uploadingDoc} onClick={() => docInput.current?.click()} className="flex w-full items-center gap-2 border-b border-white/10 px-3 py-2.5 text-sm text-gold-400 hover:bg-white/5">
                          {uploadingDoc ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />} {t("classroom.stage.uploadDoc")}
                        </button>
                      )}
                      <ul className="max-h-72 overflow-y-auto py-1">
                        {docs.length === 0 && <li className="px-3 py-3 text-xs text-white/45">{t("classroom.stage.noDocs")}</li>}
                        {docs.map((d) => (
                          <li key={d.key}>
                            <button type="button" onClick={() => openDoc(d)} className="flex w-full items-center gap-2 px-3 py-2 text-start text-sm hover:bg-white/5">
                              <FileText className="size-4 shrink-0 text-red-400" /> <span className="truncate" dir="ltr">{d.name}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              {stage.mode === "board" && (
                <>
                  <div className="flex rounded-lg bg-white/5 p-0.5">
                    {["blank", "lines", "grid"].map((bg) => (
                      <button key={bg} type="button" onClick={() => changeStage({ board: { ...stage.board, bg } })} className={cn("rounded-md px-2 py-1.5 text-xs", stage.board.bg === bg ? "bg-white/20 text-white" : "text-white/60 hover:text-white")}>
                        {t(`classroom.board.bg.${bg}`)}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center rounded-lg bg-white/5 p-0.5 text-xs">
                    <button type="button" disabled={stage.board.page <= 1} onClick={() => changeStage({ board: { ...stage.board, page: stage.board.page - 1 } })} className="rounded p-1.5 disabled:opacity-30"><ChevronLeft className="size-3.5 rtl:rotate-180" /></button>
                    <span className="px-1" dir="ltr">{stage.board.page} / {stage.board.pages}</span>
                    <button type="button" disabled={stage.board.page >= stage.board.pages} onClick={() => changeStage({ board: { ...stage.board, page: stage.board.page + 1 } })} className="rounded p-1.5 disabled:opacity-30"><ChevronRight className="size-3.5 rtl:rotate-180" /></button>
                    <button type="button" onClick={() => changeStage({ board: { ...stage.board, pages: stage.board.pages + 1, page: stage.board.pages + 1 } })} className="rounded p-1.5 hover:bg-white/10" title={t("classroom.board.addPage")}><Plus className="size-3.5" /></button>
                  </div>
                </>
              )}
              {stage.mode === "doc" && stage.doc && (
                <div className="flex items-center rounded-lg bg-white/5 p-0.5 text-xs">
                  <span className="max-w-40 truncate px-2 text-white/70" dir="ltr">{stage.doc.name}</span>
                  {stage.doc.kind === "pdf" && (
                    <>
                      <button type="button" disabled={stage.doc.page <= 1} onClick={() => changeStage({ doc: { ...stage.doc, page: stage.doc.page - 1 } })} className="rounded p-1.5 disabled:opacity-30"><ChevronLeft className="size-3.5 rtl:rotate-180" /></button>
                      <span className="px-1" dir="ltr">{stage.doc.page} / {stage.doc.pages}</span>
                      <button type="button" disabled={stage.doc.page >= stage.doc.pages} onClick={() => changeStage({ doc: { ...stage.doc, page: stage.doc.page + 1 } })} className="rounded p-1.5 disabled:opacity-30"><ChevronRight className="size-3.5 rtl:rotate-180" /></button>
                    </>
                  )}
                </div>
              )}
              {(stage.mode === "board" || stage.mode === "doc") && (
                <button type="button" onClick={toggleDraw} className={cn("flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium", drawAllowed ? "bg-gold-500 text-white" : "bg-white/5 text-white/70 hover:text-white")}>
                  <PenLine className="size-3.5" /> {drawAllowed ? t("classroom.board.studentsCanDraw") : t("classroom.board.letStudentsDraw")}
                </button>
              )}
            </div>
          )}

          {/* stage */}
          <div className="relative min-h-0 flex-1">
            {showGrid ? (
              <div className="grid size-full gap-2" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))` }}>
                {teacherFirst.map((tr) => (
                  <VideoTile key={`${tr.participant.identity}-${tr.source}`} trackRef={tr} signal={signals[tr.participant.identity]} t={t} />
                ))}
              </div>
            ) : stage.mode === "word" && stage.word && !screenShare ? (
              <div className="flex size-full items-center justify-center">
                <div className="w-full max-w-3xl rounded-3xl bg-white p-10 text-center text-navy-900 shadow-2xl" dir="ltr">
                  <p className="text-sm font-semibold uppercase tracking-[0.3em]" style={{ color: ARTICLE_COLORS[stage.word.article] }}>{stage.word.article !== "none" ? stage.word.article : ""}</p>
                  <p className="mt-2 text-6xl font-bold tracking-tight">
                    {stage.word.article !== "none" && <span style={{ color: ARTICLE_COLORS[stage.word.article] }}>{stage.word.article} </span>}
                    {stage.word.word}
                  </p>
                  {stage.word.plural && <p className="mt-3 text-xl text-muted">Plural: {stage.word.plural}</p>}
                  {stage.word.meaning && <p className="mt-5 text-2xl" dir="auto">{stage.word.meaning}</p>}
                  {stage.word.example && <p className="mt-4 text-lg italic text-muted">„{stage.word.example}“</p>}
                </div>
                {isTeacher && <button type="button" onClick={() => changeStage({ mode: "grid" })} className="absolute end-3 top-3 rounded-full bg-white/10 p-2 hover:bg-white/20"><X className="size-4" /></button>}
              </div>
            ) : screenShare && stage.mode === "grid" ? (
              <VideoTile trackRef={screenShare} t={t} className="size-full" />
            ) : (
              <Whiteboard
                key={pageKey}
                me={me.id}
                title={stage.mode === "doc" ? stage.doc?.name : `${course.level}-${lesson.title}-${stage.board.page}`}
                ops={boards[pageKey] || []}
                drafts={drafts[pageKey]}
                background={background}
                canDraw={canDraw}
                isTeacher={isTeacher}
                onOp={boardOp}
                onDraft={boardDraft}
                onErase={boardErase}
                onClear={boardClear}
                onPageCount={isTeacher ? onPageCount : undefined}
              />
            )}

            {/* the teacher has asked for a camera or a microphone */}
            {ask && (
              <div className="absolute inset-x-0 bottom-3 z-30 mx-auto w-full max-w-sm rounded-2xl border border-gold-500/50 bg-navy-900/95 p-4 text-center shadow-2xl backdrop-blur">
                <p className="text-sm text-white">
                  {t(ask.what === "camera" ? "classroom.askedCamera" : "classroom.askedMic", { name: ask.from })}
                </p>
                <div className="mt-3 flex justify-center gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        if (ask.what === "camera") await localParticipant.setCameraEnabled(true);
                        else await localParticipant.setMicrophoneEnabled(true);
                      } catch {
                        toast(t("classroom.deviceError"), "error");
                      }
                      setAsk(null);
                    }}
                    className="btn btn-sm bg-gold-500 text-white hover:bg-gold-600"
                  >
                    {ask.what === "camera" ? <Video className="size-3.5" /> : <Mic className="size-3.5" />} {t("classroom.turnOn")}
                  </button>
                  <button type="button" onClick={() => setAsk(null)} className="btn btn-sm bg-white/10 text-white hover:bg-white/20">
                    {t("classroom.notNow")}
                  </button>
                </div>
              </div>
            )}

            {/* floating reactions */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              {reactions.map((r) => (
                <div key={r.id} className="reaction-float absolute bottom-4 flex flex-col items-center" style={{ insetInlineEnd: `${r.left}%` }}>
                  <span className="text-4xl">{r.emoji}</span>
                  <span className="rounded-full bg-black/50 px-2 text-[10px]">{r.name}</span>
                </div>
              ))}
            </div>

            {studentPollPopup && (
              <div className="absolute inset-x-0 bottom-3 z-20 mx-auto w-full max-w-md rounded-2xl border border-gold-500/50 bg-navy-900/95 p-4 shadow-2xl backdrop-blur">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gold-400">{t("classroom.quiz.live")}</p>
                <p className="mb-3 mt-1 font-semibold" dir="auto">{poll.question}</p>
                <PollAnswer poll={poll} myChoice={myChoice} onAnswer={onAnswer} />
              </div>
            )}
          </div>

          {/* filmstrip */}
          {!showGrid && (
            <div className="flex h-24 shrink-0 gap-2 overflow-x-auto sm:h-28">
              {teacherFirst.map((tr) => (
                <VideoTile key={`${tr.participant.identity}-strip`} trackRef={tr} signal={signals[tr.participant.identity]} compact t={t} className="aspect-video h-full shrink-0" />
              ))}
            </div>
          )}

          {/* controls */}
          <div className="relative flex shrink-0 items-center gap-1.5 overflow-x-auto rounded-2xl bg-navy-900/80 p-1.5 sm:justify-center">
            <CtrlButton icon={isMicrophoneEnabled ? Mic : MicOff} danger={!isMicrophoneEnabled} label={t("classroom.controls.mic")} onClick={() => localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled).catch(() => toast(t("classroom.deviceError"), "error"))} />
            <CtrlButton icon={isCameraEnabled ? Video : VideoOff} danger={!isCameraEnabled} label={t("classroom.controls.camera")} onClick={() => localParticipant.setCameraEnabled(!isCameraEnabled).catch(() => toast(t("classroom.deviceError"), "error"))} />
            {canShareScreen && <CtrlButton icon={isScreenShareEnabled ? MonitorX : MonitorUp} active={isScreenShareEnabled} label={t("classroom.controls.screen")} onClick={toggleScreen} />}
            <CtrlButton icon={Hand} active={handRaised} label={t("classroom.controls.hand")} onClick={toggleHand} />
            <div className="relative">
              <CtrlButton icon={Smile} active={menu === "react"} label={t("classroom.controls.react")} onClick={() => setMenu(menu === "react" ? null : "react")} />
            </div>
            <CtrlButton icon={Keyboard} active={menu === "keys"} label="äöü" onClick={() => setMenu(menu === "keys" ? null : "keys")} />
            <div className="mx-1 h-8 w-px shrink-0 bg-white/10" />
            {panels.map((p) => (
              <CtrlButton key={p.id} icon={p.icon} active={panel === p.id} label={p.label} badge={p.badge} onClick={() => setPanel(panel === p.id ? null : p.id)} />
            ))}
            {isTeacher && (
              <>
                <div className="mx-1 h-8 w-px shrink-0 bg-white/10" />
                <CtrlButton icon={locked ? Lock : Unlock} active={locked} label={locked ? t("classroom.controls.unlock") : t("classroom.controls.lock")} onClick={toggleLock} />
                <CtrlButton icon={Power} danger label={t("classroom.controls.end")} onClick={() => setMenu(menu === "end" ? null : "end")} />
              </>
            )}
            <CtrlButton icon={PhoneOff} danger label={t("classroom.controls.leave")} onClick={leave} className="sm:ms-3" />
          </div>

          {menu === "react" && (
            <div className="absolute bottom-20 start-1/2 z-30 w-80 -translate-x-1/2 rounded-2xl border border-white/10 bg-navy-900 p-3 shadow-2xl rtl:translate-x-1/2">
              <div className="flex justify-between">
                {REACTIONS.map((e) => <button key={e} type="button" onClick={() => react(e)} className="rounded-lg p-1.5 text-2xl transition hover:scale-125 hover:bg-white/10">{e}</button>)}
              </div>
              <div className="mt-2 grid grid-cols-2 gap-1.5 border-t border-white/10 pt-2">
                {SIGNALS.map((s) => (
                  <button key={s} type="button" onClick={() => signal(s)} className="flex items-center gap-2 rounded-lg bg-white/5 px-2 py-2 text-start text-xs hover:bg-white/10">
                    <span className="text-base">{SIGNAL_ICON[s]}</span> {t(`classroom.signals.${s}`)}
                  </button>
                ))}
              </div>
            </div>
          )}
          {menu === "keys" && (
            <div className="absolute bottom-20 start-1/2 z-30 -translate-x-1/2 rounded-2xl border border-white/10 bg-navy-900 p-3 shadow-2xl rtl:translate-x-1/2">
              <p className="mb-2 text-xs text-white/50">{t("classroom.keyboardHint")}</p>
              <GermanKeyboard />
            </div>
          )}
          {menu === "end" && (
            <div className="absolute bottom-20 end-2 z-30 w-72 rounded-2xl border border-white/10 bg-navy-900 p-4 shadow-2xl">
              <p className="font-semibold">{t("classroom.endConfirmTitle")}</p>
              <p className="mt-1 text-xs text-white/55">{t("classroom.endConfirmText")}</p>
              <div className="mt-3 flex gap-2">
                <button type="button" onClick={() => setMenu(null)} className="btn btn-sm flex-1 bg-white/10 text-white hover:bg-white/20">{t("common.cancel")}</button>
                <button type="button" onClick={finishClass} className="btn btn-danger btn-sm flex-1">{t("classroom.controls.end")}</button>
              </div>
            </div>
          )}
        </main>

        {panel && (
          <aside className="fixed inset-0 z-40 flex flex-col bg-navy-900 lg:static lg:z-auto lg:w-[340px] lg:border-s lg:border-white/10">
            <div className="flex items-center gap-1 border-b border-white/10 p-1.5">
              {panels.map((p) => (
                <button key={p.id} type="button" onClick={() => setPanel(p.id)} className={cn("relative flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium", panel === p.id ? "bg-white/10 text-white" : "text-white/50 hover:text-white")}>
                  <p.icon className="size-4" /> <span className="hidden sm:inline">{p.label}</span>
                  {p.badge > 0 && <span className="rounded-full bg-red-500 px-1.5 text-[10px] font-bold leading-4 text-white">{p.badge}</span>}
                </button>
              ))}
              <button type="button" onClick={() => setPanel(null)} className="rounded-lg p-2 text-white/50 hover:bg-white/10 hover:text-white" aria-label="close"><X className="size-4" /></button>
            </div>
            <div className="min-h-0 flex-1">
              {panel === "chat" && <ChatPanel messages={messages} me={me.id} courseId={course._id} storage={storage} onSend={onChatSend} />}
              {panel === "people" && (
                <PeoplePanel me={me.id} isTeacher={isTeacher} signals={signals} screenAllowed={screenAllowed} onMute={mute} onMuteAll={muteAll} onCameraOff={cameraOff} onAsk={askFor} onRemove={remove} onToggleScreen={toggleScreenPermission} onLowerHand={lowerHand} onLowerAll={() => send("hand:lower", { all: true })} />
              )}
              {panel === "quiz" && (
                <QuizPanel isTeacher={isTeacher} poll={poll} counts={counts} myChoice={myChoice} lastClosed={lastClosed} participantsCount={participants.length} onCreate={onCreatePoll} onClose={onClosePoll} onAnswer={onAnswer} />
              )}
              {panel === "groups" && isTeacher && (
                <GroupsPanel
                  lessonId={lesson._id}
                  me={me.id}
                  running={breakouts}
                  group={group}
                  onSwitchRoom={onSwitchRoom}
                  onRunning={setBreakouts}
                />
              )}
              {panel === "words" && <WordsPanel isTeacher={isTeacher} vocab={vocab} onAdd={onAddVocab} onDelete={onDeleteVocab} onSpotlight={(item) => changeStage({ mode: "word", word: item })} />}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
