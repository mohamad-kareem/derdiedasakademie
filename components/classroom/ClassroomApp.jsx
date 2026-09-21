"use client";

import { useCallback, useRef, useState } from "react";
import { LiveKitRoom } from "@livekit/components-react";
import { VideoPresets } from "livekit-client";
import PreJoin from "./PreJoin";
import Room from "./Room";
import ConnectionNotice from "./ConnectionNotice";
import { useI18n } from "@/components/I18nProvider";
import { joinRoom } from "@/app/actions/classroom";

/**
 * Holds the connection to the media server.
 *
 * Connection trouble is reported as a state, not as a permanent red banner:
 * a wobble that recovers clears itself, and only a failure the browser has
 * given up on asks the teacher to rejoin. `attempt` remounts the room, which
 * is the one reliable way to start a completely fresh connection.
 */
export default function ClassroomApp({ serverUrl, token, initialGroup = 0, ...props }) {
  const { t } = useI18n();
  const [choices, setChoices] = useState(null);
  const [status, setStatus] = useState("connecting"); // connecting · live · lost
  const [attempt, setAttempt] = useState(0);

  // Which room this person is in: 0 is the whole class, 1..n a break-out group.
  // Moving between them means a new token and a fresh connection, so the room
  // is remounted rather than reconfigured.
  const [{ group, ticket }, setPlace] = useState({ group: initialGroup, ticket: token });
  const moving = useRef(false);

  const switchTo = useCallback(
    async (next) => {
      if (moving.current || next === group) return;
      moving.current = true;
      setStatus("connecting");
      const res = await joinRoom(props.lesson._id, next);
      moving.current = false;
      if (!res?.ok) return;
      setPlace({ group: res.group, ticket: res.token });
      setAttempt((n) => n + 1);
    },
    [group, props.lesson._id],
  );

  const camerasOffByDefault = !props.isTeacher && props.course?.studentCameras !== "on";

  const onConnected = useCallback(() => setStatus("live"), []);
  const onDisconnected = useCallback(() => {
    // The room object disconnects for a great many ordinary reasons — leaving,
    // being removed, the class ending. Room itself handles those and shows its
    // own screen; anything still mounted here is a connection we lost.
    setStatus((s) => (s === "live" ? "lost" : s));
  }, []);
  const onError = useCallback(() => setStatus("lost"), []);

  function rejoin() {
    setStatus("connecting");
    setAttempt((n) => n + 1);
  }

  if (!choices) {
    return (
      <PreJoin
        me={props.me}
        lesson={props.lesson}
        course={props.course}
        backHref={props.backHref}
        cameraDefault={!camerasOffByDefault}
        onJoin={setChoices}
      />
    );
  }

  return (
    <LiveKitRoom
      key={attempt}
      serverUrl={serverUrl}
      token={ticket}
      connect
      audio={choices.audio ? { deviceId: choices.audioId || undefined, echoCancellation: true, noiseSuppression: true } : false}
      video={choices.video ? { deviceId: choices.videoId || undefined, resolution: (props.isTeacher ? VideoPresets.h540 : VideoPresets.h360).resolution } : false}
      options={{
        adaptiveStream: true,
        dynacast: true,
        // Hold on longer before giving up: a phone changing from wifi to mobile
        // data can take the better part of a minute to settle.
        disconnectOnPageLeave: true,
        reconnectPolicy: {
          nextRetryDelayInMs: ({ retryCount }) => (retryCount > 10 ? null : Math.min(1000 * 2 ** retryCount, 8000)),
        },
        videoCaptureDefaults: { resolution: (props.isTeacher ? VideoPresets.h540 : VideoPresets.h360).resolution },
        publishDefaults: {
          simulcast: true,
          videoEncoding: (props.isTeacher ? VideoPresets.h540 : VideoPresets.h360).encoding,
          screenShareEncoding: VideoPresets.h1080.encoding,
        },
      }}
      connectOptions={{ autoSubscribe: true, maxRetries: 8, peerConnectionTimeout: 25000, websocketTimeout: 20000 }}
      onConnected={onConnected}
      onDisconnected={onDisconnected}
      onError={onError}
      data-lk-theme="none"
    >
      <ConnectionNotice status={status} onRejoin={rejoin} t={t} />
      <Room {...props} group={group} onSwitchRoom={switchTo} />
    </LiveKitRoom>
  );
}
