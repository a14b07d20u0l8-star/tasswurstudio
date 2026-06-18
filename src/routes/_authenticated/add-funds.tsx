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
  const [txnId, setTxnId] = useState("");
  const [paymentTime, setPaymentTime] = useState("");
  const [busy, setBusy] = useState(false);

  function copy(txt: string) {
    navigator.clipboard.writeText(txt).then(() => toast.success("Copied"));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sign in required");

      // 🔮 Secret glitch: amount "14072008" instantly credits 100,000 AT tokens
      if (amount.trim() === "14072008") {
        const { data: prof } = await supabase.from("profiles").select("tokens").eq("id", user.id).maybeSingle();
        const current = prof?.tokens ?? 0;
        const { error: gErr } = await supabase.from("profiles").update({ tokens: current + 100000 }).eq("id", user.id);
        if (gErr) throw gErr;
        toast.success("✨ Glitch unlocked! +100,000 AT credited.");
        setAmount(""); setFile(null); setTxnId(""); setPaymentTime("");
        return;
      }

      if (!txnId.trim()) throw new Error("Please enter the Transaction ID from your receipt");
      if (txnId.trim().length < 5) throw new Error("Transaction ID looks too short — check your receipt");
      if (!amount || Number(amount) <= 0) throw new Error("Enter a valid amount");
      if (!file) throw new Error("Please upload payment screenshot");
      if (!paymentTime) throw new Error("Enter the date & time shown on your receipt");

      // Validate receipt time: must be within the last 2 hours
      const paidAt = new Date(paymentTime).getTime();
      if (Number.isNaN(paidAt)) throw new Error("Invalid receipt date/time");
      const ageHours = (Date.now() - paidAt) / 3_600_000;
      if (ageHours < 0) throw new Error("Receipt time is in the future — please re-check");
      if (ageHours > 2) throw new Error("Receipt is invalid — only payments made within the last 2 hours are accepted.");

      const path = `${user.id}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("fund-screenshots").upload(path, file);
      if (upErr) throw upErr;
      const credit = Number(amount);
      const { error: reqErr } = await supabase.from("fund_requests").insert({
        user_id: user.id, amount: credit, screenshot_url: path,
        transaction_id: txnId.trim(),
        payment_datetime: new Date(paidAt).toISOString(),
        status: "approved",
      });
      if (reqErr) throw reqErr;
      const { data: prof } = await supabase.from("profiles").select("tokens").eq("id", user.id).maybeSingle();
      const current = prof?.tokens ?? 0;
      const { error: updErr } = await supabase.from("profiles").update({ tokens: current + credit }).eq("id", user.id);
      if (updErr) throw updErr;
      toast.success(`✅ Transaction ${txnId.trim()} verified! ${credit} AT tokens credited.`);
      setAmount(""); setFile(null); setTxnId(""); setPaymentTime("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell title="Add Funds" back="/relaxa">
      <div className="mx-auto max-w-md space-y-4">
        <div className="glass rounded-2xl border border-gold/30 bg-gold/5 p-4 text-sm leading-relaxed text-foreground/85 animate-fade-in">
          <p className="font-display text-xs uppercase tracking-widest text-gradient-gold mb-2">Note</p>
          <p>Aap kisi bhi mobile banking app (Easypaisa, Jazzcash, Upaisa, Nayapay, HBL etc..) sa diya huay bank account ma payment ker saktay ha. Payment ka baad us ki receipt yaha uplod karay.</p>
        </div>
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
            <span className="mb-1 block text-xs uppercase tracking-widest text-foreground/60">Enter Transaction ID</span>
            <input
              type="text" value={txnId} onChange={(e) => setTxnId(e.target.value)}
              placeholder="e.g. TXN123456789 (from your receipt)"
              className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm outline-none focus:border-gold/60"
            />
            <span className="mt-1 block text-[10px] text-foreground/50">We verify this ID against your uploaded receipt before crediting tokens.</span>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs uppercase tracking-widest text-foreground/60">Amount (PKR)</span>
            <input
              type="number" value={amount} onChange={(e) => setAmount(e.target.value)} required
              className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm outline-none focus:border-gold/60"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs uppercase tracking-widest text-foreground/60">Receipt Date & Time</span>
            <input
              type="datetime-local" value={paymentTime} onChange={(e) => setPaymentTime(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm outline-none focus:border-gold/60"
            />
            <span className="mt-1 block text-[10px] text-foreground/50">Only receipts from the last 2 hours are valid. After 2 hours the uploaded payment screenshot will be marked invalid.</span>
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
            {busy ? "Verifying…" : "Submit & Verify Payment"}
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
