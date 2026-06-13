import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { MODULES, type ModuleKey } from "@/lib/modules";

export const Route = createFileRoute("/_authenticated/m/$module")({
  component: ModulePage,
});

function ModulePage() {
  const { module } = Route.useParams();
  const key = module as ModuleKey;
  const cfg = MODULES[key];
  if (!cfg) return <AppShell title="Not found" back="/relaxa"><p>Unknown module.</p></AppShell>;

  return (
    <AppShell title={cfg.title} back="/relaxa">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 text-center" style={{ animation: "fade-up 0.5s ease both" }}>
          <h1 className="font-display text-3xl text-gradient-gold sm:text-4xl">{cfg.title}</h1>
          <p className="mt-1 text-xs uppercase tracking-[0.3em] text-foreground/60">{cfg.tagline}</p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {cfg.categories.map((cat, i) => (
            <Link
              key={cat}
              to="/m/$module/$category"
              params={{ module, category: encodeURIComponent(cat) }}
              className="glass group flex aspect-square flex-col items-center justify-center rounded-2xl p-4 text-center transition hover:-translate-y-1 hover:glow-gold"
              style={{ animation: `scale-in 0.4s ease ${i * 0.04}s both` }}
            >
              <div className="font-display text-sm text-gradient-gold sm:text-base">{cat}</div>
              <div className="mt-2 text-[10px] uppercase tracking-widest text-foreground/50 opacity-0 transition group-hover:opacity-100">View →</div>
            </Link>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
