import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import portrait from "@/assets/tasswur-monogram.png";
import { Youtube } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Tasswur Studio — Serving nation-wide since 2024" },
      { name: "description", content: "Meet Abdullah Tasswur — motivation for students and dreamers. Enter the Dreamy platform." },
      { property: "og:title", content: "Tasswur Studio — Serving nation-wide since 2024" },
      { property: "og:description", content: "Meet Abdullah Tasswur — motivation for students and dreamers." },
    ],
  }),
  component: IntroPage,
});

const G = ({ children }: { children: React.ReactNode }) => (
  <span className="text-gradient-gold font-semibold">{children}</span>
);
const W = ({ children }: { children: React.ReactNode }) => (
  <span className="text-white font-semibold">{children}</span>
);
const R = ({ children }: { children: React.ReactNode }) => (
  <span className="font-bold" style={{ color: "oklch(0.55 0.18 25)" }}>{children}</span>
);

function IntroPage() {
  const [stage, setStage] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setStage(1), 1400);
    supabase.rpc("increment_visitor").then(() => {});
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="relative z-10 min-h-dvh">
      <section className="flex min-h-dvh flex-col items-center justify-center px-4 py-16 text-center">
        {/* Premium logo / brand mark */}
        <div className="relative mx-auto mb-8 h-40 w-40 sm:h-48 sm:w-48 animate-logo-entrance group">
          <div
            aria-hidden
            className="absolute -inset-4 rounded-full opacity-70"
            style={{
              background: "conic-gradient(from 0deg, oklch(0.82 0.16 85/0.6), oklch(0.6 0.25 295/0.6), oklch(0.7 0.2 240/0.6), oklch(0.82 0.16 85/0.6))",
              filter: "blur(14px)",
              animation: "ring-spin 12s linear infinite",
            }}
          />
          <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_center,oklch(0.82_0.16_85/0.45),transparent_70%)] blur-2xl" />
          <img
            src={portrait}
            alt="Tasswur Studio"
            className="relative h-full w-full rounded-full object-cover ring-2 ring-gold/50 glow-gold transition group-hover:scale-105"
            style={{ animation: "float-y 6s ease-in-out infinite" }}
          />
        </div>

        <h1
          className="font-display text-5xl sm:text-7xl md:text-8xl text-gradient-neon"
          style={{ animation: "fade-up 1s ease-out 0.3s both, gradient-pan 6s ease infinite" }}
        >
          Tasswur Studio
        </h1>
        <p
          className="mt-4 text-sm sm:text-base uppercase tracking-[0.4em] text-foreground/70"
          style={{ animation: "fade-up 1s ease-out 0.6s both" }}
        >
          Serving nation-wide since 2024
        </p>

        {stage >= 1 && (
          <div className="mt-10 animate-scale-in" style={{ animation: "fade-up 0.8s ease-out both" }}>
            <h2 className="font-display text-3xl sm:text-4xl text-gradient-gold">Abdullah Tasswur</h2>
            <p className="mt-2 text-sm uppercase tracking-[0.3em] text-foreground/60">
              Motivation for students and dreamers
            </p>
          </div>
        )}
      </section>


      {/* Story */}
      <section className="mx-auto max-w-3xl px-5 pb-24">
        <div className="glass rounded-3xl p-6 sm:p-10" style={{ animation: "fade-up 1s ease-out 0.4s both" }}>
          <p className="text-lg leading-relaxed text-foreground/90 sm:text-xl text-center">
            <G>Some people wait for opportunities.</G>
            <br />
            <W>We build them.</W>
          </p>

          <p className="mt-6 text-center font-display text-2xl sm:text-3xl text-gradient-neon" style={{ animation: "gradient-pan 6s ease infinite" }}>
            From Zero Investment to Unlimited Possibilities.
          </p>

          <p className="mt-8 text-base leading-relaxed text-foreground/85 sm:text-lg text-center">
            Welcome to <G>Tasswur Studio</G> — a platform designed for <W>dreamers</W>, <W>creators</W>, <W>students</W>, <W>workers</W>, <W>businesses</W>, <W>innovators</W> and many more.
          </p>

          <div className="mt-8 flex flex-col items-center gap-2 text-base sm:text-lg">
            <p className="text-foreground/85"><G>Connect</G> with people.</p>
            <p className="text-foreground/85"><G>Discover</G> opportunities.</p>
            <p className="text-foreground/85"><G>Build</G> your future.</p>
          </div>

          <p className="mt-8 text-center font-display text-xl sm:text-2xl text-gradient-gold">
            Your next opportunity starts here.
          </p>

          <div className="mt-10 flex justify-center">
            <Link to="/auth" className="btn-neon btn-neon-hover animate-pulse-glow">
              Enter Dreamy →
            </Link>
          </div>
        </div>

        <footer className="mt-10 flex flex-col items-center gap-3 text-center">
          <a
            href="https://youtube.com/@Tasswur_Studio"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-sm text-foreground/70 transition hover:text-gold"
          >
            <Youtube size={18} /> @Tasswur_Studio
          </a>
          <p className="text-xs text-foreground/40">© Tasswur Studio · Pakistan</p>
        </footer>
      </section>
    </div>
  );
}
