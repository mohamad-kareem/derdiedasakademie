"use client";

import { useParticipants, useParticipantAttributes } from "@livekit/components-react";
import { Track } from "livekit-client";
import { Mic, MicOff, Video, VideoOff, Hand, Crown, MonitorUp, UserX, HandMetal } from "lucide-react";
import { useI18n } from "@/components/I18nProvider";
import { cn, initials } from "@/lib/utils";

const SIGNAL_ICON = { understood: "✅", repeat: "🔁", slower: "🐢", question: "❓" };

function Row({ p, me, isTeacher, signal, screenAllowed, onMute, onRemove, onToggleScreen, onLowerHand }) {
  const { t } = useI18n();
  const { attributes } = useParticipantAttributes({ participant: p });
  const mic = p.getTrackPublication(Track.Source.Microphone);
  const cam = p.getTrackPublication(Track.Source.Camera);
  const micOn = mic && !mic.isMuted;
  const camOn = cam && !cam.isMuted;
  const teacher = attributes?.role === "teacher";
  const hand = attributes?.hand === "1";
  const self = p.identity === me;

  return (
    <li className={cn("group flex items-center gap-2.5 rounded-lg px-2 py-2", hand && "bg-gold-500/15")}>
      <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold", teacher ? "bg-gold-500 text-white" : "bg-navy-600 text-white")}>{initials(p.name || p.identity)}</span>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1 truncate text-sm text-white">
          {teacher && <Crown className="size-3.5 shrink-0 text-gold-400" />}
          <span className="truncate">{p.name || p.identity}</span>
          {self && <span className="text-white/40">({t("classroom.you")})</span>}
        </p>
        <p className="text-[11px] text-white/40">{teacher ? t("classroom.teacher") : t("classroom.student")}</p>
      </div>
      {signal && <span title={t(`classroom.signals.${signal}`)}>{SIGNAL_ICON[signal]}</span>}
      {hand && (
        <button type="button" disabled={!isTeacher && !self} onClick={() => onLowerHand(p.identity)} className="text-gold-400" title={t("classroom.lowerHand")}>
          <Hand className="size-4" />
        </button>
      )}
      {micOn ? <Mic className="size-4 text-white/60" /> : <MicOff className="size-4 text-red-400" />}
      {camOn ? <Video className="size-4 text-white/60" /> : <VideoOff className="size-4 text-white/30" />}
      {isTeacher && !self && !teacher && (
        <div className="flex items-center gap-0.5">
          <button type="button" disabled={!micOn} onClick={() => onMute(p.identity, mic?.trackSid)} className="rounded p-1 text-white/50 hover:bg-white/10 hover:text-white disabled:opacity-30" title={t("classroom.mute")}>
            <MicOff className="size-3.5" />
          </button>
          <button type="button" onClick={() => onToggleScreen(p.identity, !screenAllowed)} className={cn("rounded p-1 hover:bg-white/10", screenAllowed ? "text-gold-400" : "text-white/50 hover:text-white")} title={t("classroom.allowScreen")}>
            <MonitorUp className="size-3.5" />
          </button>
          <button type="button" onClick={() => onRemove(p.identity)} className="rounded p-1 text-white/50 hover:bg-red-600 hover:text-white" title={t("classroom.remove")}>
            <UserX className="size-3.5" />
          </button>
        </div>
      )}
    </li>
  );
}

export default function PeoplePanel({ me, isTeacher, signals, screenAllowed, onMute, onMuteAll, onRemove, onToggleScreen, onLowerHand, onLowerAll }) {
  const { t } = useI18n();
  const participants = useParticipants();
  const sorted = [...participants].sort((a, b) => {
    const ha = a.attributes?.hand === "1" ? 0 : 1;
    const hb = b.attributes?.hand === "1" ? 0 : 1;
    const ta = a.attributes?.role === "teacher" ? 0 : 1;
    const tb = b.attributes?.role === "teacher" ? 0 : 1;
    return ta - tb || ha - hb || (a.name || "").localeCompare(b.name || "");
  });
  const hands = participants.filter((p) => p.attributes?.hand === "1").length;

  return (
    <div className="flex h-full min-h-0 flex-col">
      {isTeacher && (
        <div className="flex gap-2 border-b border-white/10 p-2">
          <button type="button" onClick={onMuteAll} className="btn btn-sm flex-1 bg-white/10 text-white hover:bg-white/20"><MicOff className="size-3.5" /> {t("classroom.muteAll")}</button>
          <button type="button" onClick={onLowerAll} disabled={!hands} className="btn btn-sm flex-1 bg-white/10 text-white hover:bg-white/20"><HandMetal className="size-3.5" /> {t("classroom.lowerAll")}</button>
        </div>
      )}
      <p className="px-3 pt-3 text-[11px] font-semibold uppercase tracking-wider text-white/40">
        {t("classroom.inClass", { n: participants.length })}{hands > 0 && ` · ✋ ${hands}`}
      </p>
      <ul className="flex-1 space-y-0.5 overflow-y-auto p-2">
        {sorted.map((p) => (
          <Row key={p.identity} p={p} me={me} isTeacher={isTeacher} signal={signals[p.identity]} screenAllowed={screenAllowed.includes(p.identity)} onMute={onMute} onRemove={onRemove} onToggleScreen={onToggleScreen} onLowerHand={onLowerHand} />
        ))}
      </ul>
    </div>
  );
}
