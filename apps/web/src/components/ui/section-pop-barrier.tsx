"use client";

import { useEffect, useRef, useState, useCallback } from "react";

/* ---------- types ---------- */

interface PopParticle {
  x: number;
  y: number;
  color: string;
  time: number;
}

/* ---------- component ---------- */

interface SectionPopBarrierProps {
  sectionNumber: number;
  totalSections: number;
  color: string;
  onPop: () => void;
  disabled?: boolean;
  overlay?: boolean;
}

export function SectionPopBarrier({
  sectionNumber,
  totalSections,
  color,
  onPop,
  disabled,
  overlay,
}: SectionPopBarrierProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [popped, setPopped] = useState(false);
  const popsRef = useRef<PopParticle[]>([]);
  const rafRef = useRef<number>(0);
  const wobblePhaseRef = useRef(Math.random() * Math.PI * 2);
  const activeRef = useRef(false);

  const BUBBLE_R = overlay ? 60 : 32;
  const CANVAS_W = overlay ? 240 : 260;
  const CANVAS_H = overlay ? 160 : 80;

  // Draw the barrier bubble
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;

    function startLoop() {
      if (activeRef.current) return;
      activeRef.current = true;

      function tick() {
        const now = Date.now();
        ctx!.clearRect(0, 0, CANVAS_W, CANVAS_H);

        if (!popped) {
          wobblePhaseRef.current += 0.03;
          const cx = CANVAS_W / 2;
          const cy = CANVAS_H / 2;
          const segments = 32;

          ctx!.beginPath();
          for (let i = 0; i <= segments; i++) {
            const theta = (i / segments) * Math.PI * 2;
            const wobble = Math.sin(2 * theta + wobblePhaseRef.current) * (overlay ? 4 : 2);
            const r = BUBBLE_R + wobble;
            const px = cx + Math.cos(theta) * r;
            const py = cy + Math.sin(theta) * r;
            if (i === 0) ctx!.moveTo(px, py);
            else ctx!.lineTo(px, py);
          }
          ctx!.closePath();

          const grad = ctx!.createRadialGradient(cx - 8, cy - 8, 4, cx, cy, BUBBLE_R);
          grad.addColorStop(0, "rgba(255,255,255,0.3)");
          grad.addColorStop(0.4, color);
          grad.addColorStop(1, color);
          ctx!.fillStyle = grad;
          ctx!.fill();
          ctx!.strokeStyle = "rgba(255,255,255,0.3)";
          ctx!.lineWidth = 1.5;
          ctx!.stroke();

          // Shine
          const shineOffX = overlay ? -14 : -8;
          const shineOffY = overlay ? -18 : -10;
          const shineRx = overlay ? 14 : 8;
          const shineRy = overlay ? 9 : 5;
          ctx!.beginPath();
          ctx!.ellipse(cx + shineOffX, cy + shineOffY, shineRx, shineRy, -0.4, 0, Math.PI * 2);
          ctx!.fillStyle = "rgba(255,255,255,0.25)";
          ctx!.fill();

          // Label
          ctx!.fillStyle = "#fff";
          ctx!.font = overlay ? "bold 16px system-ui, sans-serif" : "bold 11px system-ui, sans-serif";
          ctx!.textAlign = "center";
          ctx!.textBaseline = "middle";
          ctx!.fillText(`Section ${sectionNumber + 1}`, cx, cy - (overlay ? 6 : 3));
          ctx!.font = overlay ? "14px system-ui, sans-serif" : "10px system-ui, sans-serif";
          ctx!.fillStyle = "rgba(255,255,255,0.75)";
          ctx!.fillText("Pop to continue", cx, cy + (overlay ? 16 : 11));
        }

        // Pop particles
        const alive = popsRef.current.filter((p) => now - p.time < 500);
        popsRef.current = alive;

        for (const pop of alive) {
          const elapsed = (now - pop.time) / 500;
          ctx!.globalAlpha = 1 - elapsed;

          ctx!.beginPath();
          ctx!.arc(pop.x, pop.y, BUBBLE_R * (0.3 + elapsed * 1.5), 0, Math.PI * 2);
          ctx!.strokeStyle = pop.color;
          ctx!.lineWidth = overlay ? 3 : 2;
          ctx!.stroke();

          const particleCount = overlay ? 16 : 10;
          for (let i = 0; i < particleCount; i++) {
            const angle = (i / particleCount) * Math.PI * 2;
            const dist = elapsed * (overlay ? 70 + i * 10 : 40 + i * 8);
            const baseSize = overlay ? 6 + (i % 3) * 3 : 4 + (i % 3) * 2;
            ctx!.beginPath();
            ctx!.arc(pop.x + Math.cos(angle) * dist, pop.y + Math.sin(angle) * dist, baseSize * (1 - elapsed), 0, Math.PI * 2);
            ctx!.fillStyle = pop.color;
            ctx!.fill();
          }

          ctx!.globalAlpha = 1;
        }

        if (!popped || alive.length > 0) {
          rafRef.current = requestAnimationFrame(tick);
        } else {
          activeRef.current = false;
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    }

    startLoop();
    return () => {
      cancelAnimationFrame(rafRef.current);
      activeRef.current = false;
    };
  }, [popped, color, sectionNumber, overlay]);

  const handleClick = useCallback(() => {
    if (popped || disabled) return;
    setPopped(true);
    popsRef.current.push({
      x: CANVAS_W / 2,
      y: CANVAS_H / 2,
      color,
      time: Date.now(),
    });
    setTimeout(onPop, 300);
  }, [popped, disabled, color, onPop, CANVAS_W, CANVAS_H]);

  // Overlay mode: absolute-positioned bubble over blurred text
  if (overlay) {
    if (popped) {
      return (
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <canvas ref={canvasRef} width={CANVAS_W} height={CANVAS_H} />
        </div>
      );
    }
    return (
      <div className="absolute inset-0 flex items-center justify-center z-10">
        <div className="relative cursor-pointer" onClick={handleClick}>
          <canvas ref={canvasRef} width={CANVAS_W} height={CANVAS_H} />
        </div>
      </div>
    );
  }

  if (popped) {
    return (
      <div className="flex justify-center py-4">
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          className="cursor-default"
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center py-6">
      {/* Divider lines */}
      <div className="flex items-center gap-3 w-full max-w-xs">
        <div className="flex-1 h-px bg-slate-200" />
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          onClick={handleClick}
          className="cursor-pointer flex-shrink-0"
        />
        <div className="flex-1 h-px bg-slate-200" />
      </div>
      <p className="text-xs text-slate-400 mt-1">
        {sectionNumber + 1} of {totalSections}
      </p>
    </div>
  );
}
