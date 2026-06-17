import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { waLink } from "@/lib/whatsapp";
import { toast } from "sonner";
import { Lock, MessageCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/atvester")({
  component: AtVester,
});

const VESTER_FEE = 5000;
const OWNER_WHATSAPP = "+923184454400";
const OWNER_MSG = "Assalam-u-Alaikum Abdullah Sir!\n\nI have created a new product you may like and I need investment for launch. Would you like to invest?";

function AtVester() {
  const [unlocked, setUnlocked] = useState(false);
  const [hasPwd, setHasPwd] = useState<boolean | null>(null);
  const [pwd, setPwd] = useState("");
  const [setPwdMode, setSetPwdMode] = useState(false);
  const [tokens, setTokens] = useState(0);
  const [loading, setLoading] = useState(true);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("profiles").select("vester_password, vester_unlocked, tokens").eq("id", user.id).maybeSingle();
    setHasPwd(!!data?.vester_password);
    setUnlocked(!!data?.vester_unlocked);
    setTokens(data?.tokens ?? 0);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function savePassword() {
    if (pwd.length < 4) return toast.error("Password must be at least 4 chars");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("profiles").update({ vester_password: pwd }).eq("id", user.id);
    if (error) return toast.error(error.message);
    toast.success("Password set");
    setSetPwdMode(false); setPwd(""); load();
  }

  async function unlock() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("profiles").select("vester_password, tokens").eq("id", user.id).maybeSingle();
    if (!data || data.vester_password !== pwd) return toast.error("Wrong password");
    if ((data.tokens ?? 0) < VESTER_FEE) return toast.error(`Need ${VESTER_FEE} tokens. You have ${data.tokens ?? 0}.`);
    const { error } = await supabase.from("profiles").update({ tokens: (data.tokens ?? 0) - VESTER_FEE, vester_unlocked: true }).eq("id", user.id);
    if (error) return toast.error(error.message);
    toast.success("Unlocked! Welcome.");
    setPwd(""); load();
  }

  if (loading) return <AppShell title="At-Vester" back="/relaxa"><p className="py-12 text-center text-sm text-foreground/50">Loading…</p></AppShell>;

  return (
    <AppShell title="At-Vester" back="/relaxa">
      <div className="mx-auto max-w-md">
        {!unlocked ? (
          <div className="glass rounded-3xl p-6 text-center animate-scale-in">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gold/10 text-gold animate-pulse-glow">
              <Lock size={28} />
            </div>
            <h1 className="font-display text-2xl text-gradient-gold">Investor Gateway</h1>
            <p className="mt-2 text-sm text-foreground/70">
              Entry fee: <span className="text-gold font-bold">{VESTER_FEE} tokens</span><br />
              Your balance: <span className="text-foreground">{tokens}</span>
            </p>

            {hasPwd === false && !setPwdMode && (
              <button onClick={() => setSetPwdMode(true)} className="btn-neon btn-neon-hover mt-4">Set Access Password</button>
            )}

            {(hasPwd || setPwdMode) && (
              <div className="mt-4 space-y-2">
                <input
                  type="password"
                  value={pwd}
                  onChange={(e) => setPwd(e.target.value)}
                  placeholder={setPwdMode ? "Choose a password" : "Enter password"}
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm outline-none focus:border-gold/60"
                />
                <button
                  onClick={setPwdMode ? savePassword : unlock}
                  className="btn-neon btn-neon-hover w-full"
                >
                  {setPwdMode ? "Save Password" : `Unlock (${VESTER_FEE} tokens)`}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="glass rounded-3xl p-6 animate-scale-in">
            <div className="text-center">
              <h1 className="font-display text-2xl text-gradient-gold">Abdullah Tasswur</h1>
            </div>
            <a
              href={waLink(OWNER_WHATSAPP, OWNER_MSG)}
              target="_blank" rel="noreferrer"
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-emerald-500 px-4 py-3 text-sm font-bold uppercase tracking-widest text-white transition hover:scale-[1.02]"
            >
              <MessageCircle size={16} /> Chat on WhatsApp
            </a>
          </div>
        )}
      </div>
    </AppShell>
  );
}
