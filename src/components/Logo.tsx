import portrait from "@/assets/tasswur-monogram.png";

export function Logo({ size = 40, className = "", glow = true }: { size?: number; className?: string; glow?: boolean }) {
  return (
    <span
      className={`relative inline-block shrink-0 rounded-full ${className}`}
      style={{ width: size, height: size }}
    >
      {glow && (
        <span
          aria-hidden
          className="absolute inset-0 rounded-full"
          style={{
            background: "radial-gradient(circle, oklch(0.82 0.16 85 / 0.55), transparent 65%)",
            filter: "blur(8px)",
            animation: "pulse-glow 2.6s ease-in-out infinite",
          }}
        />
      )}
      <img
        src={portrait}
        alt="Tasswur Studio"
        width={size}
        height={size}
        className="relative h-full w-full rounded-full object-cover ring-1 ring-gold/50"
        style={{ animation: "float-y 5s ease-in-out infinite" }}
      />
    </span>
  );
}
