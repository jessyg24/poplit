"use client";

import { createContext, useContext, useCallback, useRef, useEffect } from "react";

interface PopEffect {
  pop: (x: number, y: number, color?: string) => void;
}

const PopEffectContext = createContext<PopEffect>({ pop: () => {} });

export function usePopEffect() {
  return useContext(PopEffectContext);
}

export function PopEffectProvider({ children }: { children: React.ReactNode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Array<{
    x: number;
    y: number;
    color: string;
    time: number;
  }>>([]);
  const rafRef = useRef<number>(0);
  const activeRef = useRef(false);

  function startLoop() {
    if (activeRef.current) return;
    activeRef.current = true;

    function tick() {
      const canvas = canvasRef.current;
      if (!canvas) { activeRef.current = false; return; }
      const ctx = canvas.getContext("2d");
      if (!ctx) { activeRef.current = false; return; }

      const now = Date.now();
      const alive = particlesRef.current.filter((p) => now - p.time < 700);
      particlesRef.current = alive;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const pop of alive) {
        const elapsed = (now - pop.time) / 700;

        // Ring
        const ringR = 50 * (0.3 + elapsed * 1.8);
        ctx.beginPath();
        ctx.arc(pop.x, pop.y, ringR, 0, Math.PI * 2);
        ctx.strokeStyle = pop.color;
        ctx.globalAlpha = 1 - elapsed;
        ctx.lineWidth = 3;
        ctx.stroke();

        // Second ring
        const ring2R = 35 * (0.1 + elapsed * 2.2);
        ctx.beginPath();
        ctx.arc(pop.x, pop.y, ring2R, 0, Math.PI * 2);
        ctx.strokeStyle = pop.color;
        ctx.globalAlpha = (1 - elapsed) * 0.5;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.globalAlpha = 1 - elapsed;

        // Fragments
        for (let i = 0; i < 12; i++) {
          const angle = (i / 12) * Math.PI * 2 + 0.3;
          const dist = elapsed * (60 + i * 12);
          const fx = pop.x + Math.cos(angle) * dist;
          const fy = pop.y + Math.sin(angle) * dist;
          const fSize = (5 + (i % 3) * 3) * (1 - elapsed);

          ctx.beginPath();
          ctx.arc(fx, fy, Math.max(fSize, 0), 0, Math.PI * 2);
          ctx.fillStyle = pop.color;
          ctx.fill();
        }

        ctx.globalAlpha = 1;
      }

      if (alive.length > 0) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        activeRef.current = false;
      }
    }

    rafRef.current = requestAnimationFrame(tick);
  }

  useEffect(() => {
    function resize() {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
      }
    }
    resize();
    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const pop = useCallback((x: number, y: number, color?: string) => {
    particlesRef.current.push({
      x,
      y,
      color: color ?? "#F97316",
      time: Date.now(),
    });
    startLoop();
  }, []);

  // Listen for clicks on buttons and links
  useEffect(() => {
    function onClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      const clickable = target.closest("a, button, [role='button']");
      if (clickable) {
        pop(e.clientX, e.clientY, getAccentColor(clickable as HTMLElement));
      }
    }
    window.addEventListener("click", onClick);
    return () => window.removeEventListener("click", onClick);
  }, [pop]);

  return (
    <PopEffectContext.Provider value={{ pop }}>
      {children}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none"
        style={{ zIndex: 9999 }}
      />
    </PopEffectContext.Provider>
  );
}

function getAccentColor(el: HTMLElement): string {
  const bg = getComputedStyle(el).backgroundColor;
  if (bg && bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent") {
    return bg;
  }
  const color = getComputedStyle(el).color;
  if (color) return color;
  return "#F97316";
}
