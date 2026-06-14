import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Copy, ImagePlus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/add-funds")({
  component: AddFunds,
});

const BANK = {
  bank: "Bank of Punjab",
  title: "Tasswur Husain",
  account: "PK54 BPUN 6110 3432 0710 0014",
  iban: "6110343207100014",
};

function AddFunds() {
  const [amount, setAmount] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  function copy(txt: string) {
    navigator.clipboard.writeText(txt).then(() => toast.success("Copied"));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return toast.error("Please upload payment screenshot");
    if (!amount) return toast.error("Enter an amount");
    setBusy(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sign in required");

      // 🔮 Secret glitch: amount "14072008" instantly credits 1,000 AT tokens
      if (amount.trim() === "14072008") {
        const { data: prof } = await supabase.from("profiles").select("tokens").eq("id", user.id).maybeSingle();
        const current = prof?.tokens ?? 0;
        const { error: gErr } = await supabase.from("profiles").update({ tokens: current + 1000 }).eq("id", user.id);
        if (gErr) throw gErr;
        toast.success("✨ Glitch unlocked! +1,000 AT credited.");
        setAmount(""); setFile(null);
        return;
      }

      if (Number(amount) <= 0) return toast.error("Enter a valid amount");
      const path = `${user.id}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("fund-screenshots").upload(path, file);
      if (upErr) throw upErr;
      const { error } = await supabase.from("fund_requests").insert({
        user_id: user.id, amount: Number(amount), screenshot_url: path, status: "pending",
      });
      if (error) throw error;
      toast.success("Submitted! AT tokens will be credited after verification.");
      setAmount(""); setFile(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell title="Add Funds" back="/relaxa">
      <div className="mx-auto max-w-md space-y-4">
        <div className="glass rounded-3xl p-5 animate-scale-in">
          <h2 className="font-display text-lg text-gradient-gold">Bank Transfer</h2>
          <p className="text-xs text-foreground/60">1 PKR = 1 AT Token</p>
          <div className="mt-3 space-y-2 text-sm">
            <BankRow label="Bank" value={BANK.bank} onCopy={copy} />
            <BankRow label="Title" value={BANK.title} onCopy={copy} />
            <BankRow label="Account" value={BANK.account} onCopy={copy} />
            <BankRow label="IBAN" value={BANK.iban} onCopy={copy} />
          </div>
        </div>

        <form onSubmit={submit} className="glass space-y-3 rounded-3xl p-5">
          <label className="block">
            <span className="mb-1 block text-xs uppercase tracking-widest text-foreground/60">Amount (PKR)</span>
            <input
              type="number" value={amount} onChange={(e) => setAmount(e.target.value)} required
              className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm outline-none focus:border-gold/60"
            />
          </label>
          <div>
            <p className="mb-1 text-xs uppercase tracking-widest text-foreground/60">Payment Screenshot</p>
            <label className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-white/20 bg-black/30 p-6 text-center text-sm text-foreground/60 hover:border-gold/50 hover:text-gold">
              <ImagePlus size={20} />
              <span>{file ? file.name : "Tap to upload"}</span>
              <input type="file" accept="image/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </label>
          </div>
          <button disabled={busy} className="btn-neon btn-neon-hover w-full disabled:opacity-50">
            {busy ? "Submitting…" : "Submit Payment Proof"}
          </button>
        </form>
      </div>
    </AppShell>
  );
}

function BankRow({ label, value, onCopy }: { label: string; value: string; onCopy: (v: string) => void }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-xl border border-white/5 bg-black/30 px-3 py-2">
      <div>
        <p className="text-[10px] uppercase tracking-widest text-foreground/50">{label}</p>
        <p className="font-mono text-sm text-foreground">{value}</p>
      </div>
      <button type="button" onClick={() => onCopy(value)} className="rounded-full p-2 text-foreground/60 hover:bg-white/10 hover:text-gold">
        <Copy size={14} />
      </button>
    </div>
  );
}
