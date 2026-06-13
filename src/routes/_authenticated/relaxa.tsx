import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Send } from "lucide-react";

export const Route = createFileRoute("/_authenticated/relaxa")({
  head: () => ({ meta: [{ title: "Relaxa · Tasswur Studio" }] }),
  component: Relaxa,
});

const TILES = [
  { to: "/m/dfunctions", label: "D-Functions", desc: "Services Marketplace" },
  { to: "/m/model", label: "On-Model", desc: "Talent & Portfolio" },
  { to: "/m/academy", label: "On-Academy", desc: "Teachers & Tutors" },
  { to: "/m/worker", label: "On-Worker", desc: "Skilled Professionals" },
  { to: "/m/hall", label: "On-Hall", desc: "Halls & Venues" },
  { to: "/m/bpartner", label: "B-Partner", desc: "Business Partners" },
  { to: "/atvester", label: "At-Vester", desc: "Investor Gateway" },
  { to: "/add-funds", label: "Add Funds", desc: "Top-up your tokens" },
] as const;

interface Msg { from: "user" | "bot"; text: string; time: string }

function Relaxa() {
  const [msgs, setMsgs] = useState<Msg[]>([
    { from: "bot", text: "Assalam-u-Alaikum! I am Relaxa. Pick a service below or send a message.", time: now() },
  ]);
  const [input, setInput] = useState("");

  function send(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    setMsgs((m) => [
      ...m,
      { from: "user", text: input.trim(), time: now() },
      { from: "bot", text: "Under Construction — Chat system will be enabled soon.", time: now() },
    ]);
    setInput("");
  }

  return (
    <AppShell title="Relaxa">
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        {/* Quick tiles */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {TILES.map((t, i) => (
            <Link
              key={t.to}
              to={t.to}
              className="glass group rounded-2xl p-3 text-center transition hover:-translate-y-1 hover:glow-gold"
              style={{ animation: `fade-up 0.5s ease ${i * 0.05}s both` }}
            >
              <div className="font-display text-xs uppercase tracking-widest text-gradient-gold">{t.label}</div>
              <div className="mt-1 text-[10px] text-foreground/60">{t.desc}</div>
            </Link>
          ))}
        </div>

        {/* Chat */}
        <div className="glass flex h-[60dvh] flex-col rounded-3xl p-3">
          <div className="flex-1 space-y-2 overflow-y-auto p-2 scrollbar-thin">
            {msgs.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.from === "user" ? "justify-end" : "justify-start"}`}
                style={{ animation: "fade-up 0.3s ease both" }}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                    m.from === "user"
                      ? "rounded-br-md bg-gradient-to-br from-gold/80 to-gold-dim/80 text-primary-foreground glow-gold"
                      : "rounded-bl-md border border-white/10 bg-black/40 text-foreground/90"
                  }`}
                >
                  <p>{m.text}</p>
                  <p className="mt-1 text-[10px] opacity-60">{m.time}</p>
                </div>
              </div>
            ))}
          </div>
          <form onSubmit={send} className="mt-2 flex items-center gap-2 rounded-full border border-white/10 bg-black/40 p-1.5">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a message…"
              className="flex-1 bg-transparent px-3 text-sm outline-none placeholder:text-foreground/40"
            />
            <button
              type="submit"
              className="rounded-full bg-gold p-2 text-primary-foreground transition hover:scale-110 glow-gold"
              aria-label="Send"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      </div>
    </AppShell>
  );
}

function now() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
