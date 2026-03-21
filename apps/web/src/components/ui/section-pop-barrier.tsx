"use client";

import { useRef, useState, useCallback } from "react";

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
  const [popped, setPopped] = useState(false);
  const [hovering, setHovering] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleClick = useCallback(() => {
    if (popped || disabled) return;
    setPopped(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      onPop();
    }, overlay ? 50 : 200);
  }, [popped, disabled, onPop, overlay]);

  // Overlay mode: full-width tall rounded rectangle covering the blurred text
  if (overlay) {
    if (popped) {
      return (
        <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
          <div className="relative" style={{ width: 300, height: 300 }}>
            {Array.from({ length: 20 }).map((_, i) => {
              const angle = (i / 20) * 360;
              const dist = 80 + (i % 4) * 25;
              return (
                <div
                  key={i}
                  className="absolute rounded-full"
                  style={{
                    width: 6 + (i % 3) * 5,
                    height: 6 + (i % 3) * 5,
                    backgroundColor: i % 3 === 0 ? "white" : i % 2 === 0 ? color : `${color}88`,
                    left: "50%",
                    top: "50%",
                    marginLeft: -5,
                    marginTop: -5,
                    animation: `pop-p-${i} 0.6s ease-out forwards`,
                  }}
                />
              );
            })}
          </div>
          <style>{`
            ${Array.from({ length: 20 }).map((_, i) => {
              const angle = (i / 20) * 360;
              const dist = 80 + (i % 4) * 25;
              const rad = angle * Math.PI / 180;
              return `@keyframes pop-p-${i} {
                0% { opacity: 1; transform: translate(0,0) scale(1.2); }
                100% { opacity: 0; transform: translate(${Math.cos(rad) * dist}px,${Math.sin(rad) * dist}px) scale(0); }
              }`;
            }).join("\n")}
          `}</style>
        </div>
      );
    }

    return (
      <div
        className="absolute inset-0 z-10 flex items-center justify-center cursor-pointer"
        onClick={handleClick}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
      >
        <div
          className="relative flex flex-col items-center justify-center gap-2 select-none"
          style={{
            background: `linear-gradient(160deg, ${color}dd, ${color}bb, ${color}ee)`,
            backdropFilter: "blur(6px)",
            boxShadow: hovering
              ? `0 12px 48px ${color}60, inset 0 2px 0 rgba(255,255,255,0.25)`
              : `0 8px 32px ${color}40, inset 0 1px 0 rgba(255,255,255,0.2)`,
            width: "92%",
            minHeight: "90%",
            borderRadius: 32,
            animation: hovering ? "bubbleWobbleHover 0.6s ease-in-out infinite" : "bubbleWobble 3s ease-in-out infinite",
            transition: "box-shadow 0.3s ease",
          }}
        >
          {/* Shine */}
          <div
            className="absolute top-4 left-8 rounded-full opacity-15"
            style={{ width: "40%", height: 10, background: "linear-gradient(90deg, white, transparent)" }}
          />
          {/* Small floating decorations */}
          <div
            className="absolute rounded-full opacity-25"
            style={{
              width: 18, height: 18, backgroundColor: "white",
              top: -6, right: 24,
              animation: "bubbleDeco 2.5s ease-in-out infinite 0.3s",
            }}
          />
          <div
            className="absolute rounded-full opacity-15"
            style={{
              width: 12, height: 12, backgroundColor: "white",
              bottom: -4, left: 16,
              animation: "bubbleDeco 3s ease-in-out infinite 0.8s",
            }}
          />
          <div
            className="absolute rounded-full opacity-20"
            style={{
              width: 10, height: 10, backgroundColor: "white",
              top: "30%", right: -3,
              animation: "bubbleDeco 2.8s ease-in-out infinite 1.2s",
            }}
          />
          <p className="text-white font-bold text-2xl tracking-tight drop-shadow-sm">
            Section {sectionNumber + 1}
          </p>
          <p className="text-white/80 text-base font-medium">
            Pop to continue reading
          </p>
          {hovering && (
            <p className="text-white/60 text-xs mt-1 animate-pulse">
              Click!
            </p>
          )}
        </div>

        <style>{`
          @keyframes bubbleWobble {
            0% { transform: translateY(0px) scaleX(1) scaleY(1); }
            25% { transform: translateY(-5px) scaleX(1.01) scaleY(0.99); }
            50% { transform: translateY(-2px) scaleX(0.99) scaleY(1.01); }
            75% { transform: translateY(-6px) scaleX(1.005) scaleY(0.995); }
            100% { transform: translateY(0px) scaleX(1) scaleY(1); }
          }
          @keyframes bubbleWobbleHover {
            0% { transform: translateY(0px) scaleX(1) scaleY(1); }
            20% { transform: translateY(-4px) scaleX(1.02) scaleY(0.98); }
            40% { transform: translateY(2px) scaleX(0.98) scaleY(1.02); }
            60% { transform: translateY(-3px) scaleX(1.015) scaleY(0.985); }
            80% { transform: translateY(1px) scaleX(0.99) scaleY(1.01); }
            100% { transform: translateY(0px) scaleX(1) scaleY(1); }
          }
          @keyframes bubbleDeco {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-8px); }
          }
        `}</style>
      </div>
    );
  }

  // Non-overlay mode: small completion bubble (last section)
  if (popped) {
    return (
      <div className="flex justify-center py-4">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xs"
          style={{
            backgroundColor: color,
            opacity: 0,
            transform: "scale(1.5)",
            transition: "all 0.3s ease-out",
          }}
        >
          ✓
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center py-6">
      <div className="flex items-center gap-3 w-full max-w-xs">
        <div className="flex-1 h-px bg-slate-200" />
        <button
          onClick={handleClick}
          onMouseEnter={() => setHovering(true)}
          onMouseLeave={() => setHovering(false)}
          className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xs cursor-pointer transition-transform select-none"
          style={{
            background: `radial-gradient(circle at 35% 35%, rgba(255,255,255,0.3), ${color} 60%)`,
            boxShadow: `0 4px 12px ${color}40`,
            animation: hovering ? "bubbleWobbleHover 0.6s ease-in-out infinite" : "bubbleWobble 3s ease-in-out infinite",
          }}
        >
          <div className="text-center leading-tight">
            <div className="text-[10px] opacity-75">Section {sectionNumber + 1}</div>
            <div className="text-[9px] opacity-60">Pop</div>
          </div>
        </button>
        <div className="flex-1 h-px bg-slate-200" />
      </div>
      <p className="text-xs text-slate-400 mt-1">
        {sectionNumber + 1} of {totalSections}
      </p>
      <style>{`
        @keyframes bubbleWobble {
          0% { transform: translateY(0px) scaleX(1) scaleY(1); }
          25% { transform: translateY(-5px) scaleX(1.01) scaleY(0.99); }
          50% { transform: translateY(-2px) scaleX(0.99) scaleY(1.01); }
          75% { transform: translateY(-6px) scaleX(1.005) scaleY(0.995); }
          100% { transform: translateY(0px) scaleX(1) scaleY(1); }
        }
        @keyframes bubbleWobbleHover {
          0% { transform: translateY(0px) scaleX(1) scaleY(1); }
          20% { transform: translateY(-4px) scaleX(1.02) scaleY(0.98); }
          40% { transform: translateY(2px) scaleX(0.98) scaleY(1.02); }
          60% { transform: translateY(-3px) scaleX(1.015) scaleY(0.985); }
          80% { transform: translateY(1px) scaleX(0.99) scaleY(1.01); }
          100% { transform: translateY(0px) scaleX(1) scaleY(1); }
        }
      `}</style>
    </div>
  );
}
