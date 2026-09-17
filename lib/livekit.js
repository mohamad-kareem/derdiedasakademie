import { AccessToken, RoomServiceClient, TrackSource } from "livekit-server-sdk";


export function isLiveKitConfigured() {
  return Boolean(process.env.LIVEKIT_URL && process.env.LIVEKIT_API_KEY && process.env.LIVEKIT_API_SECRET);
}

export function roomNameFor(lessonId) {
  return `ddd-lesson-${lessonId}`;
}

function httpHost() {
  return process.env.LIVEKIT_URL.replace(/^ws(s?):\/\//, "http$1://");
}

export function roomService() {
  return new RoomServiceClient(httpHost(), process.env.LIVEKIT_API_KEY, process.env.LIVEKIT_API_SECRET);
}

export const STUDENT_SOURCES = [TrackSource.CAMERA, TrackSource.MICROPHONE];
export const PRESENTER_SOURCES = [TrackSource.CAMERA, TrackSource.MICROPHONE, TrackSource.SCREEN_SHARE, TrackSource.SCREEN_SHARE_AUDIO];

export async function createClassToken({ user, lessonId, isTeacher }) {
  const at = new AccessToken(process.env.LIVEKIT_API_KEY, process.env.LIVEKIT_API_SECRET, {
    identity: user.id,
    name: user.name,
    ttl: "6h",
    metadata: JSON.stringify({ role: isTeacher ? "teacher" : "student" }),
    attributes: { role: isTeacher ? "teacher" : "student" },
  });
  at.addGrant({
    room: roomNameFor(lessonId),
    roomJoin: true,
    roomAdmin: isTeacher,
    canSubscribe: true,
    canPublish: true,
    canPublishData: true,
    canUpdateOwnMetadata: true,
    canPublishSources: isTeacher ? PRESENTER_SOURCES : STUDENT_SOURCES,
  });
  return at.toJwt();
}
