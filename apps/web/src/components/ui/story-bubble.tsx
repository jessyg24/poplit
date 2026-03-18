"use client";

import { useEffect, useRef, useCallback, useState } from "react";

/* ---------- types ---------- */

export interface StoryBubbleData {
  id: string;
  title: string;
  genre: string;
  genreColor: string;
  triggers: string[];
  hook: string;
  prompt?: string;
  authorPenName: string;
}

interface BubbleState {
  x: number;
  y: number;
  size: number;
  alive: boolean;
  enterProgress: number; // 0-1 for float-in animation
  wobble: { amp: number; phase: number; freq: number }[];
  dragX: number;
  dragStartX: number;
  dragging: boolean;
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
const BOB_AMP = 0.4;
const BOB_SPEED = 0.01;
const ENTER_SPEED = 0.025;
const SWIPE_THRESHOLD = 80;

/* ---------- helpers ---------- */

function makeWobble(size: number): BubbleState["wobble"] {
  return Array.from({ length: WOBBLE_MODES }, (_, i) => ({
    amp: i === 0 ? size * 0.01 : 0,
    phase: Math.random() * Math.PI * 2,
    freq: 2 + i,
  }));
}

function exciteWobble(b: BubbleState, strength: number) {
  for (let i = 0; i < b.wobble.length; i++) {
    const w = b.wobble[i]!;
    w.amp = Math.min(w.amp + strength * (1 / (1 + i * 0.8)), b.size * 0.06);
  }
}

function drawBubbleShape(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  color: string,
  wobble: BubbleState["wobble"],
  alpha: number,
) {
  const segments = 48;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.globalAlpha = alpha;

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
  grad.addColorStop(0, "rgba(255,255,255,0.2)");
  grad.addColorStop(0.4, color);
  grad.addColorStop(1, color);
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.strokeStyle = "rgba(255,255,255,0.25)";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Shine
  ctx.beginPath();
  ctx.ellipse(-r * 0.25, -r * 0.3, r * 0.22, r * 0.12, -0.5, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.2)";
  ctx.fill();

  ctx.restore();
}

/* ---------- component ---------- */

interface StoryBubbleCanvasProps {
  story: StoryBubbleData;
  onPop: (story: StoryBubbleData) => void;
  onSwipeAway: () => void;
}

export function StoryBubbleCanvas({ story, onPop, onSwipeAway }: StoryBubbleCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bubbleRef = useRef<BubbleState | null>(null);
  const popsRef = useRef<PopParticle[]>([]);
  const rafRef = useRef<number>(0);
  const frameRef = useRef(0);
  const [isPopped, setIsPopped] = useState(false);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
  const isDraggingRef = useRef(false);

  // Init bubble
  useEffect(() => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const size = Math.min(w * 0.7, 280);

    bubbleRef.current = {
      x: (w - size) / 2,
      y: h + 20, // start off-screen below
      size,
      alive: true,
      enterProgress: 0,
      wobble: makeWobble(size),
      dragX: 0,
      dragStartX: 0,
      dragging: false,
    };
    setIsPopped(false);
    setSwipeOffset(0);
  }, [story.id]);

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
      const b = bubbleRef.current;
      const w = canvas!.width;
      const h = canvas!.height;
      const now = Date.now();

      ctx!.clearRect(0, 0, w, h);

      if (b && b.alive) {
        // Float in from bottom
        if (b.enterProgress < 1) {
          b.enterProgress = Math.min(1, b.enterProgress + ENTER_SPEED);
          const targetY = h * 0.35;
          const startY = h + 20;
          // Ease out cubic
          const t = 1 - Math.pow(1 - b.enterProgress, 3);
          b.y = startY + (targetY - startY) * t;
        } else {
          // Gentle bob
          const targetY = h * 0.35;
          b.y = targetY + Math.sin(frameRef.current * BOB_SPEED) * BOB_AMP * 8;
        }

        // Wobble update
        for (const wob of b.wobble) {
          wob.phase += WOBBLE_SPEED * (wob.freq * 0.25);
          wob.amp *= WOBBLE_DECAY;
          if (wob.amp < 0.1) wob.amp = 0;
        }
        b.wobble[0]!.amp = Math.max(b.wobble[0]!.amp, b.size * 0.01);

        const drawX = b.x + b.size / 2 + b.dragX;
        const drawY = b.y + b.size / 2;
        const swipeAlpha = Math.max(0.3, 1 - Math.abs(b.dragX) / 300);

        drawBubbleShape(
          ctx!,
          drawX,
          drawY,
          b.size / 2,
          story.genreColor,
          b.wobble,
          swipeAlpha,
        );
      }

      // Pop particles
      const activePops = popsRef.current.filter((p) => now - p.time < 600);
      popsRef.current = activePops;

      for (const pop of activePops) {
        const elapsed = (now - pop.time) / 600;
        ctx!.globalAlpha = 1 - elapsed;

        ctx!.beginPath();
        ctx!.arc(pop.x, pop.y, pop.size * 0.5 * (0.3 + elapsed * 1.5), 0, Math.PI * 2);
        ctx!.strokeStyle = pop.color;
        ctx!.lineWidth = 3;
        ctx!.stroke();

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
  }, [story.genreColor]);

  // Hit test
  const hitTest = useCallback((clientX: number, clientY: number): boolean => {
    const b = bubbleRef.current;
    if (!b || !b.alive) return false;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return false;
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const dx = x - (b.x + b.size / 2 + b.dragX);
    const dy = y - (b.y + b.size / 2);
    return Math.sqrt(dx * dx + dy * dy) <= b.size / 2;
  }, []);

  // Pointer handlers for swipe/pop
  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (isPopped) return;
      if (!hitTest(e.clientX, e.clientY)) return;
      pointerStartRef.current = { x: e.clientX, y: e.clientY };
      isDraggingRef.current = false;
      if (bubbleRef.current) {
        bubbleRef.current.dragStartX = e.clientX;
        bubbleRef.current.dragging = true;
      }
    }

    function onPointerMove(e: PointerEvent) {
      const b = bubbleRef.current;
      if (!b || !b.dragging || !pointerStartRef.current) return;
      const dx = e.clientX - b.dragStartX;
      if (Math.abs(dx) > 5) isDraggingRef.current = true;
      b.dragX = dx;
      setSwipeOffset(dx);
    }

    function onPointerUp(e: PointerEvent) {
      const b = bubbleRef.current;
      if (!b || !b.dragging) return;
      b.dragging = false;

      if (Math.abs(b.dragX) > SWIPE_THRESHOLD) {
        // Swipe away
        b.alive = false;
        setSwipeOffset(0);
        onSwipeAway();
      } else if (!isDraggingRef.current && hitTest(e.clientX, e.clientY)) {
        // Pop!
        b.alive = false;
        popsRef.current.push({
          x: b.x + b.size / 2 + b.dragX,
          y: b.y + b.size / 2,
          color: story.genreColor,
          size: b.size,
          time: Date.now(),
        });
        setIsPopped(true);
        setTimeout(() => onPop(story), 400);
      }

      b.dragX = 0;
      setSwipeOffset(0);
      pointerStartRef.current = null;
      isDraggingRef.current = false;
    }

    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [hitTest, isPopped, onPop, onSwipeAway, story]);

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
    <>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 touch-none"
        style={{ zIndex: 10 }}
      />
      {/* Text overlay on bubble */}
      {!isPopped && bubbleRef.current?.alive !== false && (
        <div
          className="absolute left-1/2 pointer-events-none text-center"
          style={{
            zIndex: 15,
            transform: `translateX(calc(-50% + ${swipeOffset}px))`,
            top: "calc(35vh + 20px)",
            width: "min(70vw, 280px)",
            opacity: Math.max(0.3, 1 - Math.abs(swipeOffset) / 300),
          }}
        >
          <p className="text-white font-bold text-lg drop-shadow-lg truncate">{story.title}</p>
          <span
            className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-semibold text-white/90"
            style={{ backgroundColor: "rgba(255,255,255,0.2)" }}
          >
            {story.genre}
          </span>
          {story.triggers.length > 0 && (
            <div className="flex gap-1 justify-center mt-1.5 flex-wrap">
              {story.triggers.map((tw) => (
                <span
                  key={tw}
                  className="px-1.5 py-0.5 rounded text-[10px] bg-red-500/30 text-red-200"
                >
                  {tw}
                </span>
              ))}
            </div>
          )}
          <p className="mt-2 text-white/80 text-sm italic line-clamp-2 drop-shadow">{story.hook}</p>
          {story.prompt && (
            <p className="mt-1 text-white/60 text-xs truncate">
              Prompt: {story.prompt}
            </p>
          )}
        </div>
      )}
    </>
  );
}
