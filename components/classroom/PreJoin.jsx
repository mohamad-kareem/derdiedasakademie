"use client";

import { useEffect, useRef, useState } from "react";
import { createLocalVideoTrack, Room } from "livekit-client";
import { Mic, MicOff, Video, VideoOff, ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useI18n } from "@/components/I18nProvider";
import { cn, initials } from "@/lib/utils";

export default function PreJoin({ me, lesson, course, backHref, onJoin }) {
  const { t } = useI18n();
  const videoRef = useRef(null);
  const [cam, setCam] = useState(true);
  const [mic, setMic] = useState(true);
  const [devices, setDevices] = useState({ audioinput: [], videoinput: [] });
  const [audioId, setAudioId] = useState("");
  const [videoId, setVideoId] = useState("");
  const [error, setError] = useState("");
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    let track;
    let cancelled = false;
    async function start() {
      if (!cam) return;
      try {
        track = await createLocalVideoTrack({ deviceId: videoId || undefined, resolution: { width: 1280, height: 720 } });
        if (cancelled) return track.stop();
        track.attach(videoRef.current);
        setError("");
        const list = await Room.getLocalDevices();
        setDevices({ audioinput: list.filter((d) => d.kind === "audioinput"), videoinput: list.filter((d) => d.kind === "videoinput") });
      } catch {
        setError(t("classroom.prejoin.noCamera"));
      }
    }
    start();
    return () => {
      cancelled = true;
      track?.stop();
    };
  }, [cam, videoId, t]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-navy-950 p-4 text-white">
      <div className="w-full max-w-4xl">
        <Link href={backHref} className="mb-6 inline-flex items-center gap-1.5 text-sm text-white/60 hover:text-white">
          <ArrowLeft className="size-4 rtl:rotate-180" /> {t("common.back")}
        </Link>
        <div className="grid gap-8 md:grid-cols-5">
          <div className="md:col-span-3">
            <div className="relative aspect-video overflow-hidden rounded-2xl bg-navy-800 ring-1 ring-white/10">
              {cam && !error ? (
                <video ref={videoRef} muted playsInline className="size-full -scale-x-100 object-cover" />
              ) : (
                <div className="flex size-full items-center justify-center">
                  <span className="flex size-24 items-center justify-center rounded-full bg-navy-600 text-3xl font-semibold">{initials(me.name)}</span>
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 flex justify-center gap-3 p-4">
                <button type="button" onClick={() => setMic((v) => !v)} className={cn("flex size-12 items-center justify-center rounded-full transition", mic ? "bg-white/15 hover:bg-white/25" : "bg-red-600")} aria-label="mic">
                  {mic ? <Mic className="size-5" /> : <MicOff className="size-5" />}
                </button>
                <button type="button" onClick={() => setCam((v) => !v)} className={cn("flex size-12 items-center justify-center rounded-full transition", cam ? "bg-white/15 hover:bg-white/25" : "bg-red-600")} aria-label="camera">
                  {cam ? <Video className="size-5" /> : <VideoOff className="size-5" />}
                </button>
              </div>
            </div>
            {error && <p className="mt-3 text-sm text-amber-300">{error}</p>}
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="block text-xs text-white/60">
                {t("classroom.prejoin.camera")}
                <select value={videoId} onChange={(e) => setVideoId(e.target.value)} className="mt-1 h-9 w-full rounded-md border border-white/10 bg-navy-900 px-2 text-sm text-white">
                  <option value="">{t("classroom.prejoin.default")}</option>
                  {devices.videoinput.map((d) => <option key={d.deviceId} value={d.deviceId}>{d.label || d.deviceId.slice(0, 8)}</option>)}
                </select>
              </label>
              <label className="block text-xs text-white/60">
                {t("classroom.prejoin.microphone")}
                <select value={audioId} onChange={(e) => setAudioId(e.target.value)} className="mt-1 h-9 w-full rounded-md border border-white/10 bg-navy-900 px-2 text-sm text-white">
                  <option value="">{t("classroom.prejoin.default")}</option>
                  {devices.audioinput.map((d) => <option key={d.deviceId} value={d.deviceId}>{d.label || d.deviceId.slice(0, 8)}</option>)}
                </select>
              </label>
            </div>
          </div>
          <div className="flex flex-col justify-center md:col-span-2">
            <div className="flag-stripe mb-5 h-1 w-14 rounded-full" />
            <p className="text-sm text-gold-400">{course.level} · {course.title}</p>
            <h1 className="mt-2 text-3xl font-semibold leading-tight">{lesson.title}</h1>
            <p className="mt-3 text-sm text-white/60">{t("classroom.prejoin.subtitle", { name: me.name })}</p>
            <button
              type="button"
              disabled={joining}
              onClick={() => {
                setJoining(true);
                onJoin({ audio: mic, video: cam && !error, audioId, videoId });
              }}
              className="btn btn-gold btn-lg mt-8 w-full"
            >
              {joining && <Loader2 className="size-4 animate-spin" />}
              {t("classroom.prejoin.join")}
            </button>
            <p className="mt-3 text-center text-xs text-white/40">{t("classroom.prejoin.tip")}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
