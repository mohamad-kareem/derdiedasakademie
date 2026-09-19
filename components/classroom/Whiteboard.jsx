"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Pen, Highlighter, Minus, MoveUpRight, Square, Circle, Type, Eraser, Undo2, Trash2, Download, Loader2 } from "lucide-react";
import { useI18n } from "@/components/I18nProvider";
import { COLORS, SIZES, drawBackground, drawOp, hitTest, round } from "./boardDraw";
import { getPdf } from "./pdf";
import { cn } from "@/lib/utils";

const TOOLS = [
  { id: "pen", icon: Pen },
  { id: "hl", icon: Highlighter },
  { id: "line", icon: Minus },
  { id: "arrow", icon: MoveUpRight },
  { id: "rect", icon: Square },
  { id: "ellipse", icon: Circle },
  { id: "text", icon: Type },
  { id: "eraser", icon: Eraser },
];

/**
 * Shared whiteboard. `background` = { kind: "blank"|"lines"|"grid" } | { kind: "pdf", url, page } | { kind: "image", url }
 * ops: committed operations for this page; drafts: in-progress strokes from others.
 */
export default function Whiteboard({ me, ops, drafts, background, canDraw, isTeacher, onOp, onDraft, onErase, onClear, onPageCount, title }) {
  const { t } = useI18n();
  const wrapRef = useRef(null);
  const bgRef = useRef(null);
  const inkRef = useRef(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [docAspect, setDocAspect] = useState(null);
  const isDoc = (background.kind === "pdf" || background.kind === "image") && Boolean(background.url);
  const aspect = isDoc && docAspect?.url === background.url ? docAspect.value : 16 / 9;
  const [tool, setTool] = useState("pen");
  const [color, setColor] = useState(COLORS[1]);
  const [width, setWidth] = useState(SIZES[1]);
  const bgKey = `${background.kind}|${background.url}|${background.page}|${size.w}x${size.h}|${aspect}`;
  const [bgDone, setBgDone] = useState({ key: null, error: false });
  const loadingBg = isDoc && bgDone.key !== bgKey;
  const bgError = isDoc && bgDone.key === bgKey && bgDone.error;
  const [textBox, setTextBox] = useState(null);
  const current = useRef(null);
  const lastDraftSent = useRef(0);
  const myIds = useRef([]);
  const textRef = useRef(null);
  const textOpened = useRef(0);

  // Fit the board into the available space while keeping its aspect ratio.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width: cw, height: ch } = entry.contentRect;
      let w = cw;
      let h = cw / aspect;
      if (h > ch) {
        h = ch;
        w = ch * aspect;
      }
      setSize({ w: Math.floor(w), h: Math.floor(h) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [aspect]);

  // Background: paper, PDF page or image.
  useEffect(() => {
    const canvas = bgRef.current;
    if (!canvas || !size.w) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size.w * dpr;
    canvas.height = size.h * dpr;
    const ctx = canvas.getContext("2d");
    let cancelled = false;
    let renderTask;

    if (background.kind === "pdf" && background.url) {
      getPdf(background.url)
        .then(async (pdf) => {
          if (cancelled) return;
          onPageCount?.(pdf.numPages);
          const page = await pdf.getPage(Math.min(Math.max(1, background.page || 1), pdf.numPages));
          const vp1 = page.getViewport({ scale: 1 });
          const nextAspect = vp1.width / vp1.height;
          if (Math.abs(nextAspect - aspect) > 0.01) {
            setDocAspect({ url: background.url, value: nextAspect });
            return;
          }
          const viewport = page.getViewport({ scale: (size.w * dpr) / vp1.width });
          ctx.fillStyle = "#fff";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          renderTask = page.render({ canvasContext: ctx, viewport, canvas });
          await renderTask.promise;
          if (!cancelled) setBgDone({ key: bgKey, error: false });
        })
        .catch((err) => {
          if (err?.name !== "RenderingCancelledException") console.error("[board] document failed", err?.name, err?.message);
          if (err?.name !== "RenderingCancelledException" && !cancelled) setBgDone({ key: bgKey, error: true });
        });
    } else if (background.kind === "image" && background.url) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        if (cancelled) return;
        const nextAspect = img.width / img.height;
        if (Math.abs(nextAspect - aspect) > 0.01) {
          setDocAspect({ url: background.url, value: nextAspect });
          return;
        }
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        setBgDone({ key: bgKey, error: false });
      };
      img.onerror = () => !cancelled && setBgDone({ key: bgKey, error: true });
      img.src = background.url;
    } else {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawBackground(ctx, background.kind, size.w, size.h);
    }
    return () => {
      cancelled = true;
      renderTask?.cancel?.();
    };
  }, [background.kind, background.url, background.page, size.w, size.h, aspect, bgKey, onPageCount]);

  // Ink layer.
  const redraw = useCallback(() => {
    const canvas = inkRef.current;
    if (!canvas || !size.w) return;
    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== size.w * dpr) {
      canvas.width = size.w * dpr;
      canvas.height = size.h * dpr;
    }
    const ctx = canvas.getContext("2d");
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    for (const op of ops) drawOp(ctx, op, size.w, size.h);
    for (const d of Object.values(drafts || {})) drawOp(ctx, d, size.w, size.h);
    if (current.current && current.current.t !== "eraser") drawOp(ctx, current.current, size.w, size.h);
  }, [ops, drafts, size.w, size.h]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  function pos(e) {
    const rect = inkRef.current.getBoundingClientRect();
    return [round((e.clientX - rect.left) / rect.width), round((e.clientY - rect.top) / rect.height)];
  }

  function newId() {
    return `${me}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  }

  function onPointerDown(e) {
    if (!canDraw || e.button > 0) return;
    const p = pos(e);
    if (tool === "text") {
      // Cancel the compatibility mouse events this pointer would otherwise
      // raise: their default action moves focus to the document, which blurred
      // the box the instant it opened and closed it again before anything
      // could be typed.
      e.preventDefault();
      if (textBox) commitText();
      textOpened.current = performance.now();
      setTextBox({ x: p[0], y: p[1], v: "" });
      return;
    }
    e.currentTarget.setPointerCapture(e.pointerId);
    if (tool === "eraser") {
      current.current = { t: "eraser" };
      const ids = hitTest(ops, p[0], p[1], 0.012);
      if (ids.length) onErase(ids);
      return;
    }
    const base = { id: newId(), by: me, c: color, w: width };
    current.current = tool === "pen" || tool === "hl" ? { ...base, t: tool, p: [p] } : { ...base, t: tool, a: p, b: p };
    redraw();
  }

  function onPointerMove(e) {
    const cur = current.current;
    if (!cur) return;
    const p = pos(e);
    if (cur.t === "eraser") {
      const ids = hitTest(ops, p[0], p[1], 0.012);
      if (ids.length) onErase(ids);
      return;
    }
    if (cur.p) {
      const last = cur.p[cur.p.length - 1];
      if (Math.hypot(p[0] - last[0], p[1] - last[1]) < 0.0015) return;
      cur.p.push(p);
    } else {
      cur.b = p;
    }
    redraw();
    const now = performance.now();
    if (now - lastDraftSent.current > 70) {
      lastDraftSent.current = now;
      onDraft?.(cur);
    }
  }

  function onPointerUp() {
    const cur = current.current;
    current.current = null;
    if (!cur || cur.t === "eraser") return;
    if (cur.a && Math.hypot(cur.b[0] - cur.a[0], cur.b[1] - cur.a[1]) < 0.004) {
      redraw();
      return;
    }
    myIds.current.push(cur.id);
    onOp(cur);
  }

  function commitText() {
    if (textBox?.v.trim()) {
      const op = { id: newId(), by: me, t: "text", c: color, s: width * 7, x: textBox.x, y: textBox.y, v: textBox.v };
      myIds.current.push(op.id);
      onOp(op);
    }
    setTextBox(null);
  }

  function undo() {
    const existing = new Set(ops.map((o) => o.id));
    while (myIds.current.length) {
      const id = myIds.current.pop();
      if (existing.has(id)) {
        onErase([id]);
        return;
      }
    }
  }

  function exportPng() {
    const out = document.createElement("canvas");
    out.width = bgRef.current.width;
    out.height = bgRef.current.height;
    const ctx = out.getContext("2d");
    try {
      ctx.drawImage(bgRef.current, 0, 0);
      ctx.drawImage(inkRef.current, 0, 0);
      const a = document.createElement("a");
      a.download = `${(title || "board").replace(/[^\w-]+/g, "_")}.png`;
      a.href = out.toDataURL("image/png");
      a.click();
    } catch {
      // cross-origin background without CORS
    }
  }

  return (
    <div className="flex h-full min-h-0 w-full gap-2">
      {canDraw && (
        <div className="flex shrink-0 flex-col items-center gap-1 overflow-y-auto rounded-xl bg-navy-900/90 p-1.5">
          {TOOLS.map(({ id, icon: I }) => (
            <button key={id} type="button" title={t(`classroom.board.tools.${id}`)} onClick={() => setTool(id)} className={cn("flex size-8 items-center justify-center rounded-lg transition", tool === id ? "bg-gold-500 text-white" : "text-white/70 hover:bg-white/10 hover:text-white")}>
              <I className="size-4" />
            </button>
          ))}
          <div className="my-1 h-px w-6 bg-white/15" />
          {COLORS.map((c) => (
            <button key={c} type="button" onClick={() => setColor(c)} className={cn("size-5 rounded-full border-2 transition", color === c ? "scale-110 border-gold-400" : "border-white/20")} style={{ background: c }} aria-label={c} />
          ))}
          <div className="my-1 h-px w-6 bg-white/15" />
          {SIZES.map((s) => (
            <button key={s} type="button" onClick={() => setWidth(s)} className={cn("flex size-8 items-center justify-center rounded-lg", width === s ? "bg-white/15" : "hover:bg-white/10")} aria-label={`size ${s}`}>
              <span className="rounded-full bg-white" style={{ width: s + 3, height: s + 3 }} />
            </button>
          ))}
          <div className="my-1 h-px w-6 bg-white/15" />
          <button type="button" onClick={undo} title={t("classroom.board.undo")} className="flex size-8 items-center justify-center rounded-lg text-white/70 hover:bg-white/10 hover:text-white"><Undo2 className="size-4" /></button>
          {isTeacher && (
            <>
              <button type="button" onClick={onClear} title={t("classroom.board.clear")} className="flex size-8 items-center justify-center rounded-lg text-white/70 hover:bg-red-600 hover:text-white"><Trash2 className="size-4" /></button>
              <button type="button" onClick={exportPng} title={t("classroom.board.export")} className="flex size-8 items-center justify-center rounded-lg text-white/70 hover:bg-white/10 hover:text-white"><Download className="size-4" /></button>
            </>
          )}
        </div>
      )}
      <div ref={wrapRef} className="relative flex min-h-0 min-w-0 flex-1 items-center justify-center">
        <div className="relative overflow-hidden rounded-lg bg-white shadow-2xl" style={{ width: size.w, height: size.h }}>
          <canvas ref={bgRef} className="absolute inset-0 size-full" />
          <canvas
            ref={inkRef}
            className={cn("absolute inset-0 size-full touch-none", canDraw ? (tool === "text" ? "cursor-text" : "cursor-crosshair") : "cursor-default")}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          />
          {textBox && (
            <textarea
              ref={textRef}
              autoFocus
              value={textBox.v}
              onChange={(e) => setTextBox({ ...textBox, v: e.target.value })}
              onBlur={() => {
                // A blur in the first moments after opening is the browser
                // settling focus, not the teacher leaving the box.
                if (performance.now() - textOpened.current < 400) {
                  textRef.current?.focus();
                  return;
                }
                commitText();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  commitText();
                }
                if (e.key === "Escape") setTextBox(null);
              }}
              className="absolute z-10 min-w-40 resize rounded border-2 border-dashed border-gold-500 bg-white/90 p-1 font-semibold outline-none"
              style={{ left: textBox.x * size.w, top: textBox.y * size.h, color, fontSize: width * 7 * (size.w / 1000) }}
              dir="auto"
            />
          )}
          {loadingBg && <div className="absolute inset-0 flex items-center justify-center bg-white/60"><Loader2 className="size-6 animate-spin text-navy-700" /></div>}
          {bgError && <div className="absolute inset-x-0 top-0 bg-red-50 px-3 py-2 text-center text-xs text-red-700">{t("classroom.board.docError")}</div>}
        </div>
      </div>
    </div>
  );
}
