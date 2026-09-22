"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LiveKitRoom } from "@livekit/components-react";
import { DisconnectReason, VideoPresets } from "livekit-client";
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

  // Set the moment the page starts going away, so the disconnect that follows
  // is recognised as us leaving rather than the network failing.
  const leaving = useRef(false);
  useEffect(() => {
    const going = () => {
      leaving.current = true;
    };
    window.addEventListener("pagehide", going);
    window.addEventListener("beforeunload", going);
    return () => {
      window.removeEventListener("pagehide", going);
      window.removeEventListener("beforeunload", going);
    };
  }, []);

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

  // Most disconnects are perfectly ordinary: the tab is closing, the page is
  // being refreshed, we are hopping to a break-out room, the teacher removed
  // someone, the class ended. None of those is a problem, so none of them
  // should flash a red banner on the way out. Only a disconnect we did not
  // ask for counts as a connection we lost.
  const onDisconnected = useCallback((reason) => {
    if (leaving.current || moving.current) return;
    if (
      reason === DisconnectReason.CLIENT_INITIATED ||
      reason === DisconnectReason.PARTICIPANT_REMOVED ||
      reason === DisconnectReason.ROOM_DELETED ||
      reason === DisconnectReason.DUPLICATE_IDENTITY ||
      reason === DisconnectReason.USER_REJECTED ||
      reason === DisconnectReason.MIGRATION
    ) {
      return;
    }
    setStatus((s) => (s === "live" ? "lost" : s));
  }, []);

  const onError = useCallback(() => {
    if (leaving.current || moving.current) return;
    setStatus("lost");
  }, []);

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
      <ConnectionNotice status={status} onRejoin={rejoin} onSettled={onConnected} t={t} />
      <Room {...props} group={group} onSwitchRoom={switchTo} />
    </LiveKitRoom>
  );
}
