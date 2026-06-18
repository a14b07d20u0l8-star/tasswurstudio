import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { MODULES, type ModuleKey } from "@/lib/modules";
import { toast } from "sonner";
import { Trash2, RefreshCcw, X, CheckCircle2, AlertTriangle, Clock, Pencil } from "lucide-react";

export const Route = createFileRoute("/_authenticated/my-profiles")({
  component: MyProfiles,
});

interface MyListing {
  id: string;
  user_id: string;
  module: string;
  category: string;
  business_name: string | null;
  owner_name: string;
  experience: string | null;
  whatsapp: string;
  age: number | null;
  city: string | null;
  address: string | null;
  fee: number | null;
  subjects: string[] | null;
  active: boolean;
  expires_at: string;
  created_at: string;
  last_paid_at: string | null;
  total_paid: number;
  plan: string | null;
  whatsapp_channel: string | null;
  tiktok: string | null;
  instagram: string | null;
  facebook: string | null;
  website: string | null;
}

function MyProfiles() {
  const [items, setItems] = useState<MyListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [reactivate, setReactivate] = useState<MyListing | null>(null);
  const [editing, setEditing] = useState<MyListing | null>(null);

  async function load() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase
      .from("listings")
      .select("id,user_id,module,category,business_name,owner_name,experience,whatsapp,age,city,address,fee,subjects,active,expires_at,created_at,last_paid_at,total_paid,plan,whatsapp_channel,tiktok,instagram,facebook,website")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setItems((data as MyListing[]) ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function refundPct(it: MyListing): number {
    const base = it.last_paid_at ?? it.created_at;
    const hours = (Date.now() - new Date(base).getTime()) / (1000 * 60 * 60);
    const days = hours / 24;
    if (hours <= 12) return 100;
    if (days <= 3) return 80;
    if (days <= 15) return 50;
    if (days <= 25) return 20;
    return 0;
  }

  async function del(it: MyListing) {
    const pct = refundPct(it);
    const refund = Math.floor((it.total_paid * pct) / 100);
    if (!confirm(`Delete this profile?\n\nYou'll get ${pct}% refund = ${refund} AT tokens.`)) return;
    const { data, error } = await supabase.rpc("delete_listing_with_refund", { _listing_id: it.id });
    if (error) return toast.error(error.message);
    toast.success(`Deleted. Refunded ${data ?? 0} AT.`);
    load();
  }

  return (
    <AppShell title="My Profiles" back="/relaxa">
      <div className="mx-auto max-w-3xl space-y-4">
        {loading ? (
          <p className="py-12 text-center text-sm text-foreground/50">Loading…</p>
        ) : items.length === 0 ? (
          <div className="glass rounded-3xl p-10 text-center">
            <p className="text-foreground/70">You haven't created any profiles yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((it) => {
              const cfg = MODULES[it.module as ModuleKey];
              const expired = new Date(it.expires_at).getTime() < Date.now();
              const pct = refundPct(it);
              const refund = Math.floor((it.total_paid * pct) / 100);
              return (
                <div key={it.id} className="glass rounded-2xl p-4 animate-fade-in">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-display text-base text-gradient-gold truncate">{it.business_name || it.owner_name}</h3>
                        {expired || !it.active ? (
                          <span className="rounded-full bg-zinc-500/20 px-2 py-0.5 text-[9px] uppercase tracking-widest text-zinc-300 inline-flex items-center gap-1">
                            <AlertTriangle size={10} /> Inactive
                          </span>
                        ) : (
                          <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[9px] uppercase tracking-widest text-emerald-300 inline-flex items-center gap-1">
                            <CheckCircle2 size={10} /> Active
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-foreground/60">
                        {cfg?.title ?? it.module} · {it.category}
                      </p>
                      <p className="mt-1 text-[11px] text-foreground/50 inline-flex items-center gap-1">
                        <Clock size={10} /> {expired ? "Expired" : "Expires"} {new Date(it.expires_at).toLocaleDateString()}
                      </p>
                      <p className="mt-1 text-[11px] text-foreground/50">
                        Refund tier: <span className="text-gold">{pct}% = {refund} AT</span>
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(expired || !it.active) && cfg && (
                      <button onClick={() => setReactivate(it)} className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-gold to-gold-dim px-3 py-2 text-xs font-semibold text-primary-foreground hover:scale-[1.02]">
                        <RefreshCcw size={12} /> Reactivate
                      </button>
                    )}
                    <button onClick={() => setEditing(it)} className="flex-1 inline-flex items-center justify-center gap-2 rounded-full border border-gold/40 px-3 py-2 text-xs text-gold hover:bg-gold/10">
                      <Pencil size={12} /> Edit
                    </button>
                    <button onClick={() => del(it)} className="flex-1 inline-flex items-center justify-center gap-2 rounded-full border border-destructive/40 px-3 py-2 text-xs text-destructive hover:bg-destructive/10">
                      <Trash2 size={12} /> Delete ({pct}%)
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {reactivate && (
        <ReactivateModal listing={reactivate} onClose={() => setReactivate(null)} onDone={() => { setReactivate(null); load(); }} />
      )}
      {editing && (
        <EditModal listing={editing} onClose={() => setEditing(null)} onDone={() => { setEditing(null); load(); }} />
      )}
    </AppShell>
  );
}

function EditModal({ listing, onClose, onDone }: { listing: MyListing; onClose: () => void; onDone: () => void }) {
  const cfg = MODULES[listing.module as ModuleKey];
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    business_name: listing.business_name ?? "",
    owner_name: listing.owner_name ?? "",
    experience: listing.experience ?? "",
    whatsapp: listing.whatsapp ?? "",
    age: listing.age?.toString() ?? "",
    city: listing.city ?? "",
    address: listing.address ?? "",
    fee: listing.fee?.toString() ?? "",
    subjects: (listing.subjects ?? []).join(", "),
    active: listing.active,
    whatsapp_channel: listing.whatsapp_channel ?? "",
    tiktok: listing.tiktok ?? "",
    instagram: listing.instagram ?? "",
    facebook: listing.facebook ?? "",
    website: listing.website ?? "",
  });
  function upd<K extends keyof typeof form>(k: K, v: typeof form[K]) { setForm(f => ({ ...f, [k]: v })); }

  async function save() {
    setBusy(true);
    try {
      const subjects = form.subjects ? form.subjects.split(",").map(s => s.trim()).filter(Boolean) : null;
      const { error } = await supabase.from("listings").update({
        business_name: cfg?.fields.business ? (form.business_name || null) : listing.business_name,
        owner_name: form.owner_name,
        experience: form.experience || null,
        whatsapp: form.whatsapp,
        age: cfg?.fields.age && form.age ? Number(form.age) : null,
        city: cfg?.fields.city ? (form.city || null) : null,
        address: cfg?.fields.address ? (form.address || null) : null,
        fee: cfg?.fields.fee && form.fee ? Number(form.fee) : null,
        subjects,
        active: form.active,
      }).eq("id", listing.id);
      if (error) throw error;
      toast.success("Profile updated");
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally { setBusy(false); }
  }

  const F = ({ label, value, onChange, type = "text", required }: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean }) => (
    <label className="block">
      <span className="mb-1 block text-xs uppercase tracking-widest text-foreground/60">{label}</span>
      <input
        type={type} value={value} required={required}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2.5 text-sm outline-none focus:border-gold/60"
      />
    </label>
  );

  return (
    <div onClick={onClose} className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur p-2 sm:items-center animate-fade-in">
      <div onClick={(e) => e.stopPropagation()} className="glass max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-3xl p-5 scrollbar-thin animate-scale-in">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="font-display text-lg text-gradient-gold">Edit Profile</h3>
            <p className="text-xs text-foreground/60">{cfg?.title} · {listing.category}</p>
          </div>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-white/10"><X size={16} /></button>
        </div>
        <div className="space-y-3">
          {cfg?.fields.business && <F label="Business Name" value={form.business_name} onChange={(v) => upd("business_name", v)} />}
          <F label="Name" required value={form.owner_name} onChange={(v) => upd("owner_name", v)} />
          {cfg?.fields.age && <F label="Age" type="number" value={form.age} onChange={(v) => upd("age", v)} />}
          {cfg?.fields.city && <F label="City" value={form.city} onChange={(v) => upd("city", v)} />}
          {cfg?.fields.address && <F label="Address" value={form.address} onChange={(v) => upd("address", v)} />}
          <F label="Experience" value={form.experience} onChange={(v) => upd("experience", v)} />
          {cfg?.fields.fee && <F label="Fee" type="number" value={form.fee} onChange={(v) => upd("fee", v)} />}
          {cfg?.fields.subjects && <F label="Subjects (comma separated)" value={form.subjects} onChange={(v) => upd("subjects", v)} />}
          <F label="WhatsApp Number" required value={form.whatsapp} onChange={(v) => upd("whatsapp", v)} />
          <label className="flex items-center justify-between rounded-xl border border-white/10 bg-black/40 px-4 py-3">
            <span className="text-sm">Visible / Active</span>
            <input type="checkbox" checked={form.active} onChange={(e) => upd("active", e.target.checked)} className="h-5 w-5 accent-gold" />
          </label>
        </div>
        <button disabled={busy} onClick={save} className="btn-neon btn-neon-hover mt-5 w-full disabled:opacity-50">
          {busy ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </div>
  );
}

function ReactivateModal({ listing, onClose, onDone }: { listing: MyListing; onClose: () => void; onDone: () => void }) {
  const cfg = MODULES[listing.module as ModuleKey];
  const [planId, setPlanId] = useState(cfg.plans[0].id);
  const [busy, setBusy] = useState(false);

  async function pay() {
    setBusy(true);
    try {
      const plan = cfg.plans.find(p => p.id === planId)!;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sign in");
      const { data: prof } = await supabase.from("profiles").select("tokens").eq("id", user.id).maybeSingle();
      const bal = prof?.tokens ?? 0;
      if (bal < plan.price) throw new Error(`Need ${plan.price} AT. You have ${bal}.`);
      const { error: dErr } = await supabase.from("profiles").update({ tokens: bal - plan.price }).eq("id", user.id);
      if (dErr) throw dErr;
      const expires = new Date(Date.now() + plan.days * 24 * 3600 * 1000).toISOString();
      const { error } = await supabase.from("listings").update({
        active: true, expires_at: expires, plan: plan.id,
        total_paid: (listing.total_paid ?? 0) + plan.price,
        last_paid_at: new Date().toISOString(),
      }).eq("id", listing.id);
      if (error) throw error;
      toast.success(`Reactivated for ${plan.days} days. ${plan.price} AT deducted.`);
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally { setBusy(false); }
  }

  return (
    <div onClick={onClose} className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur p-3 sm:items-center animate-fade-in">
      <div onClick={(e) => e.stopPropagation()} className="glass w-full max-w-md rounded-3xl p-5 animate-scale-in">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="font-display text-lg text-gradient-gold">Reactivate Profile</h3>
            <p className="text-xs text-foreground/60">{listing.business_name || listing.owner_name}</p>
          </div>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-white/10"><X size={16} /></button>
        </div>
        <p className="mb-3 text-xs text-foreground/70">All previous reviews, ratings, and data are preserved. Choose a plan to make it visible again.</p>
        <div className="grid grid-cols-2 gap-2">
          {cfg.plans.map(p => (
            <button key={p.id} type="button" onClick={() => setPlanId(p.id)}
              className={`rounded-xl border px-3 py-3 text-sm transition ${planId === p.id ? "border-gold/60 bg-gold/10 text-gold glow-gold" : "border-white/10 bg-black/40 text-foreground/70"}`}>
              {p.label}
            </button>
          ))}
        </div>
        <button disabled={busy} onClick={pay} className="btn-neon btn-neon-hover mt-4 w-full disabled:opacity-50">
          {busy ? "Processing…" : "Pay & Reactivate"}
        </button>
      </div>
    </div>
  );
}
