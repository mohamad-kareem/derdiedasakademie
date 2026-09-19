"use client";

import { VideoTrack, useIsSpeaking, useIsMuted, useParticipantAttributes, isTrackReference } from "@livekit/components-react";
import { Track } from "livekit-client";
import { MicOff, Hand, Crown, MonitorUp } from "lucide-react";
import { avatarSrc } from "@/components/ui/Avatar";
import { cn, initials } from "@/lib/utils";

const SIGNAL_ICON = { understood: "✅", repeat: "🔁", slower: "🐢", question: "❓" };

export default function VideoTile({ trackRef, signal, className, compact = false, t }) {
  const participant = trackRef.participant;
  const speaking = useIsSpeaking(participant);
  const micMuted = useIsMuted({ participant, source: Track.Source.Microphone });
  const { attributes } = useParticipantAttributes({ participant });
  const isScreen = trackRef.source === Track.Source.ScreenShare;
  const hasVideo = isTrackReference(trackRef) && trackRef.publication && !trackRef.publication.isMuted && trackRef.publication.isSubscribed !== false;
  const isTeacher = attributes?.role === "teacher";
  const name = participant.name || participant.identity;

  return (
    <div
      className={cn(
        "relative flex items-center justify-center overflow-hidden rounded-xl bg-navy-800 ring-2 transition",
        speaking && !isScreen ? "ring-gold-400" : "ring-transparent",
        className,
      )}
      data-participant={participant.identity}
    >
      {hasVideo ? (
        <VideoTrack trackRef={trackRef} className={cn("size-full", isScreen ? "object-contain bg-black" : "object-cover")} />
      ) : (
        <div className="flex flex-col items-center gap-2">
          {avatarSrc(attributes?.avatar) ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={avatarSrc(attributes.avatar)} alt="" className={cn("rounded-full object-cover", compact ? "size-10" : "size-20")} />
          ) : (
            <span className={cn("flex items-center justify-center rounded-full bg-navy-600 font-semibold text-white", compact ? "size-10 text-sm" : "size-20 text-2xl")}>{initials(name)}</span>
          )}
        </div>
      )}
      {attributes?.hand === "1" && !isScreen && (
        <span className="absolute end-2 top-2 flex items-center gap-1 rounded-full bg-gold-500 px-2 py-1 text-xs font-bold text-white shadow-lg animate-bounce">
          <Hand className="size-3.5" />
        </span>
      )}
      {signal && !isScreen && <span className="absolute start-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-sm shadow">{SIGNAL_ICON[signal]}</span>}
      <div className="absolute inset-x-0 bottom-0 flex items-center gap-1.5 bg-gradient-to-t from-black/70 to-transparent px-2.5 pb-1.5 pt-5 text-xs font-medium text-white">
        {isScreen ? <MonitorUp className="size-3.5 text-gold-400" /> : isTeacher && <Crown className="size-3.5 text-gold-400" />}
        <span className="truncate">{isScreen ? `${name} · ${t("classroom.screen")}` : name}</span>
        {micMuted && !isScreen && <MicOff className="ms-auto size-3.5 text-red-400" />}
      </div>
    </div>
  );
}
