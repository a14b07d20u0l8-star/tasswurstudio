import { useMemo } from "react";

export function Particles({ count = 44 }: { count?: number }) {
  const particles = useMemo(
    () =>
      Array.from({ length: count }).map((_, i) => {
        const left = Math.random() * 100;
        const top = Math.random() * 100;
        const dx = (Math.random() - 0.5) * 260;
        const dy = -Math.random() * 260 - 60;
        const dur = 6 + Math.random() * 12;
        const delay = Math.random() * 10;
        const size = 1 + Math.random() * 3.5;
        const r = Math.random();
        const hue = r > 0.66 ? "var(--gold)" : r > 0.33 ? "var(--neon-purple)" : "var(--neon-blue)";
        return { i, left, top, dx, dy, dur, delay, size, hue };
      }),
    [count],
  );

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {particles.map((p) => (
        <span
          key={p.i}
          className="absolute rounded-full"
          style={{
            left: `${p.left}%`,
            top: `${p.top}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            background: p.hue,
            boxShadow: `0 0 ${p.size * 5}px ${p.hue}`,
            ["--dx" as string]: `${p.dx}px`,
            ["--dy" as string]: `${p.dy}px`,
            animation: `sparkle-drift ${p.dur}s linear ${p.delay}s infinite`,
          }}
        />
      ))}
      {/* Glowing dust clouds */}
      <div
        className="absolute -left-20 top-1/3 h-72 w-72 rounded-full opacity-30"
        style={{ background: "radial-gradient(circle, oklch(0.6 0.25 295/0.55), transparent 70%)", filter: "blur(40px)", animation: "float-y 14s ease-in-out infinite" }}
      />
      <div
        className="absolute -right-20 top-2/3 h-80 w-80 rounded-full opacity-30"
        style={{ background: "radial-gradient(circle, oklch(0.82 0.16 85/0.45), transparent 70%)", filter: "blur(50px)", animation: "float-y 18s ease-in-out infinite reverse" }}
      />
    </div>
  );
}
