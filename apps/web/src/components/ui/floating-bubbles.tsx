"use client";

import { useEffect, useCallback, useRef, useState } from "react";

const BUBBLE_COLORS = [
  "#F97316",
  "#A855F7",
  "#3B82F6",
  "#EC4899",
  "#14B8A6",
  "#F59E0B",
  "#8B5CF6",
];

const WOBBLE_MODES = 3; // fewer modes = smoother shape
const WOBBLE_DECAY = 0.97; // slower decay = gentler settle
const WOBBLE_SPEED = 0.04; // much slower phase = less spinning

interface Bubble {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alive: boolean;
  wobble: { amp: number; phase: number; freq: number }[];
}

interface PopParticle {
  id: string;
  x: number;
  y: number;
  color: string;
  size: number;
  time: number;
}

let nextId = 0;

function makeWobble(): Bubble["wobble"] {
  return Array.from({ length: WOBBLE_MODES }, (_, i) => ({
    amp: 0,
    phase: Math.random() * Math.PI * 2,
    freq: 2 + i,
  }));
}

function exciteWobble(bubble: Bubble, strength: number) {
  for (let i = 0; i < bubble.wobble.length; i++) {
    const w = bubble.wobble[i]!;
    const modeStrength = strength * (1 / (1 + i * 0.8));
    w.amp = Math.min(w.amp + modeStrength, bubble.size * 0.06);
  }
}

function createBubble(w: number, h: number, fromEdge?: boolean): Bubble {
  const id = nextId++;
  const size = 100 + Math.random() * 180;
  let x: number, y: number, vx: number, vy: number;

  if (fromEdge) {
    const edge = Math.floor(Math.random() * 4);
    if (edge === 0) { x = -size; y = Math.random() * h; }
    else if (edge === 1) { x = w + 10; y = Math.random() * h; }
    else if (edge === 2) { x = Math.random() * w; y = -size; }
    else { x = Math.random() * w; y = h + 10; }
    const angle = Math.atan2(h / 2 - y, w / 2 - x);
    vx = Math.cos(angle) * (0.8 + Math.random() * 0.8);
    vy = Math.sin(angle) * (0.8 + Math.random() * 0.8);
  } else {
    x = size + Math.random() * (w - size * 2);
    y = size + Math.random() * (h - size * 2);
    vx = (Math.random() - 0.5) * 1.5;
    vy = (Math.random() - 0.5) * 1.5;
  }

  const wobble = makeWobble();
  wobble[0]!.amp = size * 0.008;

  return { id, x, y, vx, vy, size, color: BUBBLE_COLORS[id % BUBBLE_COLORS.length]!, alive: true, wobble };
}

function drawWobbleBubble(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, r: number,
  color: string, wobble: Bubble["wobble"],
) {
  const segments = 48;

  ctx.save();
  ctx.translate(cx, cy);

  ctx.beginPath();
  for (let i = 0; i <= segments; i++) {
    const theta = (i / segments) * Math.PI * 2;
    let radius = r;
    for (const w of wobble) {
      radius += w.amp * Math.sin(w.freq * theta + w.phase);
    }
    const px = Math.cos(theta) * radius;
    const py = Math.sin(theta) * radius;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();

  const grad = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r * 1.1);
  grad.addColorStop(0, "rgba(255,255,255,0.08)");
  grad.addColorStop(0.4, color);
  grad.addColorStop(1, color);
  ctx.globalAlpha = 0.2;
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.globalAlpha = 1;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.stroke();

  const shineWobbleX = wobble[0] ? wobble[0].amp * 0.3 * Math.sin(wobble[0].phase) : 0;
  const shineWobbleY = wobble[1] ? wobble[1].amp * 0.3 * Math.sin(wobble[1].phase) : 0;
  ctx.beginPath();
  ctx.ellipse(-r * 0.25 + shineWobbleX, -r * 0.3 + shineWobbleY, r * 0.25, r * 0.15, -0.5, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.15)";
  ctx.fill();

  ctx.restore();
}

export function FloatingBubbles({ count = 14 }: { count?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bubblesRef = useRef<Bubble[]>([]);
  const popsRef = useRef<PopParticle[]>([]);
  const [pops, setPops] = useState<PopParticle[]>([]);
  const rafRef = useRef<number>(0);
  const scrollYRef = useRef(0);
  const respawnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function onScroll() { scrollYRef.current = window.scrollY; }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const w = window.innerWidth;
    const h = document.documentElement.scrollHeight;
    bubblesRef.current = Array.from({ length: count }, () => createBubble(w, h));
  }, [count]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    function resize() {
      canvas!.width = window.innerWidth;
      canvas!.height = window.innerHeight;
    }
    resize();
    window.addEventListener("resize", resize);

    function tick() {
      const bubs = bubblesRef.current;
      const w = window.innerWidth;
      const pageH = document.documentElement.scrollHeight;
      const scrollY = scrollYRef.current;
      const viewH = window.innerHeight;

      for (let i = 0; i < bubs.length; i++) {
        const a = bubs[i]!;
        if (!a.alive) continue;

        a.x += a.vx;
        a.y += a.vy;

        // Wobble update
        for (const wob of a.wobble) {
          wob.phase += WOBBLE_SPEED * (wob.freq * 0.25);
          wob.amp *= WOBBLE_DECAY;
          if (wob.amp < 0.1) wob.amp = 0;
        }
        a.wobble[0]!.amp = Math.max(a.wobble[0]!.amp, a.size * 0.008);

        // Wall bounce
        let wallHit = false;
        if (a.x <= 0) { a.x = 0; a.vx = Math.abs(a.vx); wallHit = true; }
        else if (a.x + a.size >= w) { a.x = w - a.size; a.vx = -Math.abs(a.vx); wallHit = true; }
        if (a.y <= 0) { a.y = 0; a.vy = Math.abs(a.vy); wallHit = true; }
        else if (a.y + a.size >= pageH) { a.y = pageH - a.size; a.vy = -Math.abs(a.vy); wallHit = true; }

        if (wallHit) exciteWobble(a, Math.sqrt(a.vx * a.vx + a.vy * a.vy) * 2);

        // Bubble-bubble collision
        for (let j = i + 1; j < bubs.length; j++) {
          const b = bubs[j]!;
          if (!b.alive) continue;

          const ax = a.x + a.size / 2;
          const ay = a.y + a.size / 2;
          const bx = b.x + b.size / 2;
          const by = b.y + b.size / 2;
          const dx = bx - ax;
          const dy = by - ay;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const minDist = (a.size + b.size) / 2;

          if (dist < minDist && dist > 0.1) {
            const nx = dx / dist;
            const ny = dy / dist;
            const dvx = a.vx - b.vx;
            const dvy = a.vy - b.vy;
            const dvn = dvx * nx + dvy * ny;

            if (dvn > 0) {
              const ma = a.size * a.size;
              const mb = b.size * b.size;
              const total = ma + mb;
              const impulse = dvn * 0.9;
              a.vx -= impulse * (mb / total) * nx;
              a.vy -= impulse * (mb / total) * ny;
              b.vx += impulse * (ma / total) * nx;
              b.vy += impulse * (ma / total) * ny;

              const hitStrength = Math.abs(dvn) * 2;
              exciteWobble(a, hitStrength);
              exciteWobble(b, hitStrength);
            }

            const overlap = minDist - dist;
            const sep = overlap / 2 + 0.5;
            a.x -= nx * sep;
            a.y -= ny * sep;
            b.x += nx * sep;
            b.y += ny * sep;
          }
        }

        const speed = Math.sqrt(a.vx * a.vx + a.vy * a.vy);
        if (speed > 2.5) {
          a.vx = (a.vx / speed) * 2.5;
          a.vy = (a.vy / speed) * 2.5;
        }
      }

      // Render
      ctx!.clearRect(0, 0, w, viewH);

      for (const b of bubs) {
        if (!b.alive) continue;
        const screenY = b.y - scrollY;
        if (screenY + b.size < -50 || screenY > viewH + 50) continue;
        drawWobbleBubble(ctx!, b.x + b.size / 2, screenY + b.size / 2, b.size / 2, b.color, b.wobble);
      }

      // Pop particles
      const now = Date.now();
      const activePops = popsRef.current.filter((p) => now - p.time < 500);
      popsRef.current = activePops;

      for (const pop of activePops) {
        const elapsed = (now - pop.time) / 500;
        const popScreenY = pop.y - scrollY;

        ctx!.beginPath();
        ctx!.arc(pop.x, popScreenY, pop.size * 0.5 * (0.3 + elapsed * 1.2), 0, Math.PI * 2);
        ctx!.strokeStyle = pop.color;
        ctx!.globalAlpha = 1 - elapsed;
        ctx!.lineWidth = 2;
        ctx!.stroke();

        for (let i = 0; i < 10; i++) {
          const angle = (i / 10) * Math.PI * 2;
          const dist = elapsed * (60 + i * 10);
          const fx = pop.x + Math.cos(angle) * dist;
          const fy = popScreenY + Math.sin(angle) * dist;
          const fSize = (5 + i % 3 * 3) * (1 - elapsed);

          ctx!.beginPath();
          ctx!.arc(fx, fy, Math.max(fSize, 0), 0, Math.PI * 2);
          ctx!.fillStyle = pop.color;
          ctx!.fill();
        }

        ctx!.globalAlpha = 1;
      }

      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
    };
  }, []);

  // Respawn
  useEffect(() => {
    const aliveCount = bubblesRef.current.filter((b) => b.alive).length;
    if (aliveCount < count) {
      if (respawnTimerRef.current) clearTimeout(respawnTimerRef.current);
      respawnTimerRef.current = setTimeout(() => {
        const w = window.innerWidth;
        const h = document.documentElement.scrollHeight;
        const b = createBubble(w, h, true);
        b.y = scrollYRef.current + Math.random() * window.innerHeight;
        bubblesRef.current = [...bubblesRef.current.filter((b) => b.alive), b];
      }, 1500 + Math.random() * 2000);
      return () => { if (respawnTimerRef.current) clearTimeout(respawnTimerRef.current); };
    }
  }, [pops, count]);

  const hitTest = useCallback((clientX: number, clientY: number): Bubble | null => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const clickX = clientX - rect.left;
    const clickY = clientY - rect.top;
    const scrollY = scrollYRef.current;

    const bubs = bubblesRef.current;
    for (let i = bubs.length - 1; i >= 0; i--) {
      const b = bubs[i]!;
      if (!b.alive) continue;
      const dx = clickX - (b.x + b.size / 2);
      const dy = clickY - (b.y - scrollY + b.size / 2);
      if (Math.sqrt(dx * dx + dy * dy) <= b.size / 2) return b;
    }
    return null;
  }, []);

  const popBubbleAt = useCallback((b: Bubble) => {
    b.alive = false;

    const pop: PopParticle = {
      id: `pop-${b.id}`,
      x: b.x + b.size / 2,
      y: b.y + b.size / 2,
      color: b.color,
      size: b.size,
      time: Date.now(),
    };
    popsRef.current = [...popsRef.current, pop];
    setPops([...popsRef.current]);

    for (const other of bubblesRef.current) {
      if (!other.alive || other.id === b.id) continue;
      const ox = other.x + other.size / 2 - (b.x + b.size / 2);
      const oy = other.y + other.size / 2 - (b.y + b.size / 2);
      const od = Math.sqrt(ox * ox + oy * oy);
      if (od < b.size * 3 && od > 0) {
        const force = (b.size / od) * 2;
        other.vx += (ox / od) * force;
        other.vy += (oy / od) * force;
        exciteWobble(other, force * 2);
      }
    }
  }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      const b = hitTest(e.clientX, e.clientY);
      if (b) {
        e.preventDefault();
        e.stopPropagation();
        popBubbleAt(b);
      }
    }
    window.addEventListener("click", onClick, true);
    return () => window.removeEventListener("click", onClick, true);
  }, [hitTest, popBubbleAt]);

  useEffect(() => {
    function onMove(e: MouseEvent) {
      document.body.style.cursor = hitTest(e.clientX, e.clientY) ? "pointer" : "";
    }
    window.addEventListener("mousemove", onMove);
    return () => { window.removeEventListener("mousemove", onMove); document.body.style.cursor = ""; };
  }, [hitTest]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 50 }}
    />
  );
}
