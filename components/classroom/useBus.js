"use client";

import { useCallback, useEffect, useRef } from "react";
import { RoomEvent } from "livekit-client";
import { useRoomContext } from "@livekit/components-react";

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const CHUNK = 12000;

/**
 * Tiny message bus over LiveKit data channels.
 * send(type, payload, { to: [identity], lossy }) — large payloads are chunked automatically.
 * onMessage(type, payload, sender) receives everything.
 */
export function useBus(onMessage) {
  const room = useRoomContext();
  const handlerRef = useRef(onMessage);
  const partsRef = useRef(new Map());

  useEffect(() => {
    handlerRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    function onData(payload, participant, _kind, topic) {
      if (topic !== "ddd") return;
      let msg;
      try {
        msg = JSON.parse(decoder.decode(payload));
      } catch {
        return;
      }
      if (msg.chunk) {
        const { id, i, n, d } = msg.chunk;
        const entry = partsRef.current.get(id) || { parts: new Array(n), got: 0 };
        if (!entry.parts[i]) {
          entry.parts[i] = d;
          entry.got += 1;
        }
        partsRef.current.set(id, entry);
        if (entry.got < n) return;
        partsRef.current.delete(id);
        try {
          msg = JSON.parse(entry.parts.join(""));
        } catch {
          return;
        }
      }
      handlerRef.current?.(msg.type, msg.payload, participant);
    }
    room.on(RoomEvent.DataReceived, onData);
    return () => room.off(RoomEvent.DataReceived, onData);
  }, [room]);

  return useCallback(
    async (type, payload, { to, lossy = false } = {}) => {
      const lp = room.localParticipant;
      if (!lp || room.state !== "connected") return;
      const text = JSON.stringify({ type, payload });
      const opts = { reliable: !lossy, topic: "ddd", destinationIdentities: to };
      try {
        if (text.length <= CHUNK) {
          await lp.publishData(encoder.encode(text), opts);
          return;
        }
        const id = Math.random().toString(36).slice(2);
        const n = Math.ceil(text.length / CHUNK);
        for (let i = 0; i < n; i += 1) {
          const d = text.slice(i * CHUNK, (i + 1) * CHUNK);
          await lp.publishData(encoder.encode(JSON.stringify({ chunk: { id, i, n, d } })), { ...opts, reliable: true });
        }
      } catch (err) {
        console.warn("[bus] send failed", err?.message);
      }
    },
    [room],
  );
}
