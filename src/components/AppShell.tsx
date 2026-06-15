import { Link, useNavigate } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { ArrowLeft, Menu, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";


const NAV = [
  { to: "/relaxa", label: "Dreamy" },
  { to: "/m/dfunctions", label: "D-Services" },
  { to: "/m/onstore", label: "On-Store" },
  { to: "/m/model", label: "On-Model" },
  { to: "/m/academy", label: "On-Academy" },
  { to: "/m/worker", label: "On-Worker" },
  { to: "/m/hall", label: "On-Hall" },
  { to: "/m/onrider", label: "On-Rider" },
  { to: "/m/bpartner", label: "B-Partner" },
  { to: "/atvester", label: "At-Vester" },
  { to: "/support", label: "Support" },
  { to: "/my-profiles", label: "My Profiles" },
  { to: "/add-funds", label: "Add Funds" },
  { to: "/settings", label: "Settings" },
] as const;

export function AppShell({ title, children, back }: { title?: string; children: ReactNode; back?: string }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }

  return (
    <div className="relative z-10 flex min-h-dvh flex-col page-enter">
      {/* Header */}
      <header className="glass sticky top-0 z-30 flex h-14 items-center justify-between border-b border-white/5 px-3 sm:px-4">
        <div className="flex items-center gap-2">
          {back ? (
            <button
              onClick={() => navigate({ to: back })}
              className="rounded-full p-2 text-foreground/80 transition hover:bg-white/10 hover:text-gold"
              aria-label="Back"
            >
              <ArrowLeft size={20} />
            </button>
          ) : (
            <button
              onClick={() => setOpen(true)}
              className="rounded-full p-2 text-foreground/80 transition hover:bg-white/10 hover:text-gold"
              aria-label="Menu"
            >
              <Menu size={22} />
            </button>
          )}
          {title && (
            <span className="font-display text-sm uppercase tracking-widest text-foreground/80">
              {title}
            </span>
          )}
        </div>
        <Link to="/relaxa" className="flex items-center gap-2 font-display text-sm font-bold uppercase tracking-widest text-gradient-gold transition hover:scale-105">
          <Logo size={28} />
          <span className="hidden sm:inline">Tasswur&nbsp;Studio</span>
        </Link>

      </header>

      {/* Sidebar drawer */}
      <div
        className={`fixed inset-0 z-40 transition ${open ? "pointer-events-auto" : "pointer-events-none"}`}
        aria-hidden={!open}
      >
        <div
          className={`absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity ${open ? "opacity-100" : "opacity-0"}`}
          onClick={() => setOpen(false)}
        />
        <aside
          className={`glass absolute left-0 top-0 h-full w-72 border-r border-white/10 p-4 transition-transform duration-300 ${open ? "translate-x-0" : "-translate-x-full"}`}
        >
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Logo size={32} />
              <span className="font-display text-base uppercase tracking-widest text-gradient-gold">
                Tasswur Studio
              </span>
            </div>
            <button onClick={() => setOpen(false)} className="rounded-full p-2 hover:bg-white/10">
              <X size={18} />
            </button>
          </div>

          <nav className="flex flex-col gap-1 scrollbar-thin max-h-[calc(100dvh-8rem)] overflow-y-auto">
            {NAV.map((item, i) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className="group flex items-center justify-between rounded-xl border border-transparent px-3 py-3 text-sm text-foreground/80 transition hover:border-gold/30 hover:bg-white/5 hover:text-gold"
                style={{ animation: `fade-up 0.4s ease ${i * 0.04}s both` }}
              >
                <span className="font-medium">{item.label}</span>
                <span className="text-gold opacity-0 transition group-hover:opacity-100">→</span>
              </Link>
            ))}
            <button
              onClick={handleLogout}
              className="mt-2 rounded-xl px-3 py-3 text-left text-sm text-destructive transition hover:bg-destructive/10"
            >
              Logout
            </button>
          </nav>
        </aside>
      </div>

      <main className="relative z-10 flex-1 px-3 pb-10 pt-4 sm:px-6">{children}</main>
    </div>
  );
}
