import { useMemo } from "react";

export function Particles({ count = 28 }: { count?: number }) {
  const particles = useMemo(
    () =>
      Array.from({ length: count }).map((_, i) => {
        const left = Math.random() * 100;
        const top = Math.random() * 100;
        const dx = (Math.random() - 0.5) * 200;
        const dy = -Math.random() * 200 - 60;
        const dur = 6 + Math.random() * 10;
        const delay = Math.random() * 8;
        const size = 1.5 + Math.random() * 3;
        const hue = Math.random() > 0.5 ? "var(--gold)" : Math.random() > 0.5 ? "var(--neon-purple)" : "var(--neon-blue)";
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
            boxShadow: `0 0 ${p.size * 4}px ${p.hue}`,
            ["--dx" as string]: `${p.dx}px`,
            ["--dy" as string]: `${p.dy}px`,
            animation: `sparkle-drift ${p.dur}s linear ${p.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
}
