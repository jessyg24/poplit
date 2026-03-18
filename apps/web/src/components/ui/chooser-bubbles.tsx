"use client";

import { useEffect, useRef, useCallback, useState } from "react";

/* ---------- types ---------- */

interface ChooserBubble {
  label: string;
  color: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alive: boolean;
  wobble: { amp: number; phase: number; freq: number }[];
  popTime: number | null;
}

interface PopParticle {
  x: number;
  y: number;
  color: string;
  time: number;
  size: number;
}

/* ---------- constants ---------- */

const WOBBLE_MODES = 3;
const WOBBLE_DECAY = 0.97;
const WOBBLE_SPEED = 0.04;
const BOB_AMP = 0.3; // gentle floating movement
const BOB_SPEED = 0.008;

/* ---------- helpers ---------- */

function makeWobble(size: number): ChooserBubble["wobble"] {
  return Array.from({ length: WOBBLE_MODES }, (_, i) => ({
    amp: i === 0 ? size * 0.01 : 0,
    phase: Math.random() * Math.PI * 2,
    freq: 2 + i,
  }));
}

function exciteWobble(b: ChooserBubble, strength: number) {
  for (let i = 0; i < b.wobble.length; i++) {
    const w = b.wobble[i]!;
    w.amp = Math.min(w.amp + strength * (1 / (1 + i * 0.8)), b.size * 0.06);
  }
}

function drawWobbleBubble(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  color: string,
  wobble: ChooserBubble["wobble"],
  label: string,
  alpha: number,
) {
  const segments = 48;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.globalAlpha = alpha;

  // Shape
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

  // Fill gradient
  const grad = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r * 1.1);
  grad.addColorStop(0, "rgba(255,255,255,0.25)");
  grad.addColorStop(0.35, color);
  grad.addColorStop(1, color);
  ctx.fillStyle = grad;
  ctx.fill();

  // Border
  ctx.strokeStyle = "rgba(255,255,255,0.3)";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Shine
  const shineWx = wobble[0] ? wobble[0].amp * 0.3 * Math.sin(wobble[0].phase) : 0;
  const shineWy = wobble[1] ? wobble[1].amp * 0.3 * Math.sin(wobble[1].phase) : 0;
  ctx.beginPath();
  ctx.ellipse(-r * 0.25 + shineWx, -r * 0.3 + shineWy, r * 0.25, r * 0.15, -0.5, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.25)";
  ctx.fill();

  // Label text
  ctx.globalAlpha = alpha;
  ctx.fillStyle = "#FFFFFF";
  ctx.font = `bold ${Math.round(r * 0.32)}px system-ui, -apple-system, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(0,0,0,0.3)";
  ctx.shadowBlur = 4;
  ctx.fillText(label, 0, 0);
  ctx.shadowBlur = 0;

  ctx.restore();
}

/* ---------- component ---------- */

interface ChooserBubblesProps {
  onSelect: (choice: "reading" | "writing") => void;
}

export function ChooserBubbles({ onSelect }: ChooserBubblesProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bubblesRef = useRef<ChooserBubble[]>([]);
  const popsRef = useRef<PopParticle[]>([]);
  const rafRef = useRef<number>(0);
  const frameRef = useRef(0);
  const [popped, setPopped] = useState<string | null>(null);

  // Initialize bubbles
  useEffect(() => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const size = Math.min(w, h) * 0.32;
    const clampedSize = Math.max(130, Math.min(size, 220));

    const gap = clampedSize * 0.4;
    const totalW = clampedSize * 2 + gap;
    const startX = (w - totalW) / 2;

    bubblesRef.current = [
      {
        label: "Reading",
        color: "#F97316", // orange
        x: startX,
        y: h * 0.42,
        vx: 0,
        vy: 0,
        size: clampedSize,
        alive: true,
        wobble: makeWobble(clampedSize),
        popTime: null,
      },
      {
        label: "Writing",
        color: "#A855F7", // purple
        x: startX + clampedSize + gap,
        y: h * 0.42,
        vx: 0,
        vy: 0,
        size: clampedSize,
        alive: true,
        wobble: makeWobble(clampedSize),
        popTime: null,
      },
    ];
  }, []);

  // Animation loop
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
      frameRef.current++;
      const bubs = bubblesRef.current;
      const w = canvas!.width;
      const h = canvas!.height;
      const now = Date.now();

      ctx!.clearRect(0, 0, w, h);

      // Update & draw bubbles
      for (const b of bubs) {
        if (!b.alive) continue;

        // Gentle bob
        b.y += Math.sin(frameRef.current * BOB_SPEED + (b.label === "Writing" ? Math.PI : 0)) * BOB_AMP;

        // Wobble update
        for (const wob of b.wobble) {
          wob.phase += WOBBLE_SPEED * (wob.freq * 0.25);
          wob.amp *= WOBBLE_DECAY;
          if (wob.amp < 0.1) wob.amp = 0;
        }
        b.wobble[0]!.amp = Math.max(b.wobble[0]!.amp, b.size * 0.01);

        // Bubble collision
        for (const other of bubs) {
          if (other === b || !other.alive) continue;
          const dx = (other.x + other.size / 2) - (b.x + b.size / 2);
          const dy = (other.y + other.size / 2) - (b.y + b.size / 2);
          const dist = Math.sqrt(dx * dx + dy * dy);
          const minDist = (b.size + other.size) / 2;
          if (dist < minDist && dist > 0.1) {
            const overlap = (minDist - dist) / 2 + 1;
            const nx = dx / dist;
            const ny = dy / dist;
            b.x -= nx * overlap;
            b.y -= ny * overlap;
            exciteWobble(b, 1);
          }
        }

        drawWobbleBubble(
          ctx!,
          b.x + b.size / 2,
          b.y + b.size / 2,
          b.size / 2,
          b.color,
          b.wobble,
          b.label,
          1,
        );
      }

      // Pop particles
      const activePops = popsRef.current.filter((p) => now - p.time < 600);
      popsRef.current = activePops;

      for (const pop of activePops) {
        const elapsed = (now - pop.time) / 600;
        ctx!.globalAlpha = 1 - elapsed;

        // Expanding ring
        ctx!.beginPath();
        ctx!.arc(pop.x, pop.y, pop.size * 0.5 * (0.3 + elapsed * 1.5), 0, Math.PI * 2);
        ctx!.strokeStyle = pop.color;
        ctx!.lineWidth = 3;
        ctx!.stroke();

        // Particles
        for (let i = 0; i < 14; i++) {
          const angle = (i / 14) * Math.PI * 2;
          const dist = elapsed * (80 + i * 12);
          const fx = pop.x + Math.cos(angle) * dist;
          const fy = pop.y + Math.sin(angle) * dist;
          const fSize = (6 + (i % 3) * 4) * (1 - elapsed);
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

  // Hit test
  const hitTest = useCallback((clientX: number, clientY: number): ChooserBubble | null => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    for (const b of bubblesRef.current) {
      if (!b.alive) continue;
      const dx = x - (b.x + b.size / 2);
      const dy = y - (b.y + b.size / 2);
      if (Math.sqrt(dx * dx + dy * dy) <= b.size / 2) return b;
    }
    return null;
  }, []);

  // Click handler
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (popped) return;
      const b = hitTest(e.clientX, e.clientY);
      if (!b) return;

      e.preventDefault();
      e.stopPropagation();

      b.alive = false;
      b.popTime = Date.now();

      popsRef.current.push({
        x: b.x + b.size / 2,
        y: b.y + b.size / 2,
        color: b.color,
        size: b.size,
        time: Date.now(),
      });

      // Push away the other bubble
      for (const other of bubblesRef.current) {
        if (!other.alive || other === b) continue;
        exciteWobble(other, 6);
      }

      const choice = b.label.toLowerCase() as "reading" | "writing";
      setPopped(choice);

      // Delay to show pop animation
      setTimeout(() => {
        onSelect(choice);
      }, 500);
    }

    window.addEventListener("click", onClick, true);
    return () => window.removeEventListener("click", onClick, true);
  }, [hitTest, onSelect, popped]);

  // Cursor
  useEffect(() => {
    function onMove(e: MouseEvent) {
      document.body.style.cursor = hitTest(e.clientX, e.clientY) ? "pointer" : "";
    }
    window.addEventListener("mousemove", onMove);
    return () => {
      window.removeEventListener("mousemove", onMove);
      document.body.style.cursor = "";
    };
  }, [hitTest]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0"
      style={{ zIndex: 10 }}
    />
  );
}
