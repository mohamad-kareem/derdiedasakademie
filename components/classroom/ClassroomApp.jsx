"use client";

import { useState } from "react";
import { LiveKitRoom } from "@livekit/components-react";
import { VideoPresets } from "livekit-client";
import PreJoin from "./PreJoin";
import Room from "./Room";
import { useI18n } from "@/components/I18nProvider";

export default function ClassroomApp({ serverUrl, token, ...props }) {
  const { t } = useI18n();
  const [choices, setChoices] = useState(null);
  const [error, setError] = useState("");

  if (!choices) return <PreJoin me={props.me} lesson={props.lesson} course={props.course} backHref={props.backHref} onJoin={setChoices} />;

  return (
    <LiveKitRoom
      serverUrl={serverUrl}
      token={token}
      connect
      audio={choices.audio ? { deviceId: choices.audioId || undefined, echoCancellation: true, noiseSuppression: true } : false}
      video={choices.video ? { deviceId: choices.videoId || undefined, resolution: VideoPresets.h720.resolution } : false}
      options={{ adaptiveStream: true, dynacast: true, publishDefaults: { simulcast: true } }}
      onError={(err) => setError(err?.message || "error")}
      data-lk-theme="none"
    >
      {error && (
        <div className="fixed inset-x-0 top-14 z-50 mx-auto w-fit rounded-lg bg-red-600 px-4 py-2 text-sm text-white shadow-xl">
          {t("classroom.connectError")}
        </div>
      )}
      <Room {...props} />
    </LiveKitRoom>
  );
}
