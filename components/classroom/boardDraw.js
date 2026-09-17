// Pure drawing helpers for the classroom whiteboard. Coordinates are normalised (0..1).

export const COLORS = ["#0f1e35", "#dd0000", "#1d4ed8", "#15803d", "#ea580c", "#b8862f", "#7c3aed", "#ffffff"];
export const SIZES = [2, 4, 8];

export const ARTICLE_COLORS = { der: "#2563eb", die: "#dc2626", das: "#16a34a", none: "#475569" };

export function drawBackground(ctx, kind, W, H) {
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);
  if (kind === "lines") {
    const gap = H / 16;
    ctx.strokeStyle = "#c7d2e3";
    ctx.lineWidth = Math.max(1, W / 1600);
    for (let y = gap * 1.5; y < H; y += gap) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }
    ctx.strokeStyle = "#f3a5a5";
    ctx.beginPath();
    ctx.moveTo(W * 0.08, 0);
    ctx.lineTo(W * 0.08, H);
    ctx.stroke();
  } else if (kind === "grid") {
    const gap = H / 36;
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = Math.max(1, W / 2400);
    for (let x = gap; x < W; x += gap) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let y = gap; y < H; y += gap) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }
  }
}

function strokePath(ctx, pts, W, H) {
  if (!pts?.length) return;
  ctx.beginPath();
  ctx.moveTo(pts[0][0] * W, pts[0][1] * H);
  if (pts.length === 1) {
    ctx.lineTo(pts[0][0] * W + 0.01, pts[0][1] * H + 0.01);
  }
  for (let i = 1; i < pts.length - 1; i += 1) {
    const mx = ((pts[i][0] + pts[i + 1][0]) / 2) * W;
    const my = ((pts[i][1] + pts[i + 1][1]) / 2) * H;
    ctx.quadraticCurveTo(pts[i][0] * W, pts[i][1] * H, mx, my);
  }
  if (pts.length > 1) {
    const last = pts[pts.length - 1];
    ctx.lineTo(last[0] * W, last[1] * H);
  }
  ctx.stroke();
}

export function drawOp(ctx, op, W, H) {
  const lw = (op.w || 4) * (W / 1000);
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = op.c;
  ctx.fillStyle = op.c;
  ctx.lineWidth = lw;
  switch (op.t) {
    case "pen":
      strokePath(ctx, op.p, W, H);
      break;
    case "hl":
      ctx.globalAlpha = 0.3;
      ctx.lineWidth = lw * 4;
      ctx.lineCap = "butt";
      strokePath(ctx, op.p, W, H);
      break;
    case "line":
    case "arrow": {
      const [x1, y1] = [op.a[0] * W, op.a[1] * H];
      const [x2, y2] = [op.b[0] * W, op.b[1] * H];
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      if (op.t === "arrow") {
        const ang = Math.atan2(y2 - y1, x2 - x1);
        const head = Math.max(10, lw * 4);
        ctx.beginPath();
        ctx.moveTo(x2, y2);
        ctx.lineTo(x2 - head * Math.cos(ang - 0.45), y2 - head * Math.sin(ang - 0.45));
        ctx.lineTo(x2 - head * Math.cos(ang + 0.45), y2 - head * Math.sin(ang + 0.45));
        ctx.closePath();
        ctx.fill();
      }
      break;
    }
    case "rect": {
      const x = Math.min(op.a[0], op.b[0]) * W;
      const y = Math.min(op.a[1], op.b[1]) * H;
      ctx.strokeRect(x, y, Math.abs(op.b[0] - op.a[0]) * W, Math.abs(op.b[1] - op.a[1]) * H);
      break;
    }
    case "ellipse": {
      const cx = ((op.a[0] + op.b[0]) / 2) * W;
      const cy = ((op.a[1] + op.b[1]) / 2) * H;
      ctx.beginPath();
      ctx.ellipse(cx, cy, (Math.abs(op.b[0] - op.a[0]) * W) / 2, (Math.abs(op.b[1] - op.a[1]) * H) / 2, 0, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }
    case "text": {
      const size = (op.s || 28) * (W / 1000);
      ctx.font = `600 ${size}px Inter, system-ui, sans-serif`;
      ctx.textBaseline = "top";
      String(op.v || "")
        .split("\n")
        .forEach((line, i) => ctx.fillText(line, op.x * W, op.y * H + i * size * 1.25));
      break;
    }
    default:
      break;
  }
  ctx.restore();
}

function distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const len = dx * dx + dy * dy;
  let tt = len ? ((px - ax) * dx + (py - ay) * dy) / len : 0;
  tt = Math.max(0, Math.min(1, tt));
  return Math.hypot(px - (ax + tt * dx), py - (ay + tt * dy));
}

/** Returns ids of ops touched by an eraser at (x,y) with normalised radius r. */
export function hitTest(ops, x, y, r) {
  const hits = [];
  for (const op of ops) {
    let hit = false;
    if (op.t === "pen" || op.t === "hl") {
      const p = op.p || [];
      for (let i = 0; i < p.length && !hit; i += 1) {
        const q = p[i + 1] || p[i];
        if (distToSegment(x, y, p[i][0], p[i][1], q[0], q[1]) < r + (op.t === "hl" ? 0.01 : 0.003)) hit = true;
      }
    } else if (op.t === "line" || op.t === "arrow") {
      hit = distToSegment(x, y, op.a[0], op.a[1], op.b[0], op.b[1]) < r;
    } else if (op.t === "rect" || op.t === "ellipse") {
      const [x1, x2] = [Math.min(op.a[0], op.b[0]), Math.max(op.a[0], op.b[0])];
      const [y1, y2] = [Math.min(op.a[1], op.b[1]), Math.max(op.a[1], op.b[1])];
      hit = x > x1 - r && x < x2 + r && y > y1 - r && y < y2 + r && (Math.abs(x - x1) < r * 2 || Math.abs(x - x2) < r * 2 || Math.abs(y - y1) < r * 2 || Math.abs(y - y2) < r * 2 || op.t === "ellipse");
    } else if (op.t === "text") {
      hit = x > op.x - r && x < op.x + 0.02 * String(op.v).length + r && y > op.y - r && y < op.y + 0.05 + r;
    }
    if (hit) hits.push(op.id);
  }
  return hits;
}

export const round = (n) => Math.round(n * 10000) / 10000;
