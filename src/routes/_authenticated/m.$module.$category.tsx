import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { MODULES, type ModuleKey, type ModuleConfig } from "@/lib/modules";
import { supabase } from "@/integrations/supabase/client";
import { waLink } from "@/lib/whatsapp";
import { toast } from "sonner";
import { Search, Plus, MessageCircle, Star, X, ImagePlus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/m/$module/$category")({
  component: CategoryPage,
});

interface Listing {
  id: string;
  user_id: string;
  business_name: string | null;
  owner_name: string;
  experience: string | null;
  whatsapp: string;
  age: number | null;
  city: string | null;
  address: string | null;
  fee: number | null;
  subjects: string[] | null;
  images: string[];
  expires_at: string;
  active: boolean;
}

function CategoryPage() {
  const { module, category } = Route.useParams();
  const key = module as ModuleKey;
  const cfg = MODULES[key];
  const cat = decodeURIComponent(category);

  const [items, setItems] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [showForm, setShowForm] = useState(false);

  async function load() {
    if (!cfg) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("listings")
      .select("*")
      .eq("module", key)
      .eq("category", cat)
      .eq("active", true)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setItems((data as unknown as Listing[]) ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [module, category]);

  const filtered = useMemo(() => {
    const s = q.toLowerCase();
    return items.filter(
      (it) =>
        !s ||
        (it.business_name ?? "").toLowerCase().includes(s) ||
        it.owner_name.toLowerCase().includes(s) ||
        (it.city ?? "").toLowerCase().includes(s),
    );
  }, [items, q]);

  if (!cfg) return <AppShell title="Not found" back="/relaxa">Unknown</AppShell>;

  return (
    <AppShell title={`${cfg.title} · ${cat}`} back={`/m/${module}`}>
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row" style={{ animation: "fade-up 0.4s ease both" }}>
          <div className="glass flex flex-1 items-center gap-2 rounded-full px-4 py-2">
            <Search size={16} className="text-foreground/50" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={cfg.fields.city ? "Search name or city…" : "Search business name…"}
              className="w-full bg-transparent text-sm outline-none placeholder:text-foreground/40"
            />
          </div>
          <button onClick={() => setShowForm(true)} className="btn-neon btn-neon-hover inline-flex items-center gap-2 !py-2 !text-xs">
            <Plus size={14} /> Create Profile
          </button>
        </div>

        {loading ? (
          <p className="py-12 text-center text-sm text-foreground/50">Loading…</p>
        ) : filtered.length === 0 ? (
          <div className="glass rounded-3xl p-10 text-center">
            <p className="text-foreground/70">No active profiles in this category yet.</p>
            <p className="mt-1 text-xs text-foreground/50">Be the first to create one.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {filtered.map((it, i) => (
              <ListingCard key={it.id} item={it} cfg={cfg} delay={i * 0.05} />
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <CreateForm module={key} category={cat} onClose={() => setShowForm(false)} onCreated={load} />
      )}
    </AppShell>
  );
}

function ListingCard({ item, cfg, delay }: { item: Listing; cfg: ModuleConfig; delay: number }) {
  const title = item.business_name || item.owner_name;
  return (
    <div
      className="glass group rounded-2xl p-4 transition hover:-translate-y-1 hover:glow-purple"
      style={{ animation: `fade-up 0.4s ease ${delay}s both` }}
    >
      {item.images?.length > 0 && (
        <div className="mb-3 grid grid-cols-3 gap-1">
          {item.images.slice(0, 3).map((u, i) => (
            <img key={i} src={u} alt="" className="aspect-square rounded-lg object-cover" loading="lazy" />
          ))}
        </div>
      )}
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-display text-lg text-gradient-gold">{title}</h3>
          {item.business_name && <p className="text-xs text-foreground/60">{item.owner_name}</p>}
        </div>
        <div className="flex items-center gap-1 text-xs text-gold">
          <Star size={12} fill="currentColor" /> New
        </div>
      </div>
      <div className="mt-2 space-y-0.5 text-xs text-foreground/70">
        {item.experience && <p>Experience: <span className="text-foreground/90">{item.experience}</span></p>}
        {item.age && <p>Age: <span className="text-foreground/90">{item.age}</span></p>}
        {item.city && <p>City: <span className="text-foreground/90">{item.city}</span></p>}
        {item.address && <p>Address: <span className="text-foreground/90">{item.address}</span></p>}
        {item.fee && <p>Fee: <span className="text-foreground/90">{item.fee} PKR</span></p>}
        {item.subjects && item.subjects.length > 0 && (
          <p>Subjects: <span className="text-foreground/90">{item.subjects.join(", ")}</span></p>
        )}
      </div>
      <a
        href={waLink(item.whatsapp, `Hi! I found your profile on Tasswur Studio under ${cfg.title}.`)}
        target="_blank" rel="noreferrer"
        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full bg-emerald-500/90 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-white transition hover:scale-[1.02]"
      >
        <MessageCircle size={14} /> WhatsApp
      </a>
    </div>
  );
}

interface FormState {
  business_name: string;
  owner_name: string;
  experience: string;
  whatsapp: string;
  age: string;
  city: string;
  address: string;
  fee: string;
  subjects: string;
  plan: string;
  active: boolean;
}

function CreateForm({
  module, category, onClose, onCreated,
}: { module: ModuleKey; category: string; onClose: () => void; onCreated: () => void }) {
  const cfg = MODULES[module];
  const [busy, setBusy] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [form, setForm] = useState<FormState>({
    business_name: "", owner_name: "", experience: "", whatsapp: "",
    age: "", city: "", address: "", fee: "", subjects: "", plan: cfg.plans[0].id, active: true,
  });
  function upd<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Please sign in");
      const plan = cfg.plans.find((p) => p.id === form.plan)!;
      if (cfg.fields.minImages && files.length < cfg.fields.minImages) {
        throw new Error(`Please upload at least ${cfg.fields.minImages} images`);
      }

      const imageUrls: string[] = [];
      for (const f of files) {
        const path = `${user.id}/${crypto.randomUUID()}-${f.name}`;
        const { error: upErr } = await supabase.storage.from("listing-images").upload(path, f);
        if (upErr) throw upErr;
        const { data } = await supabase.storage.from("listing-images").createSignedUrl(path, 60 * 60 * 24 * 365);
        if (data?.signedUrl) imageUrls.push(data.signedUrl);
      }

      const expires = new Date(Date.now() + plan.days * 24 * 3600 * 1000).toISOString();
      const subjects = form.subjects ? form.subjects.split(",").map((s) => s.trim()).filter(Boolean) : null;

      const { error } = await supabase.from("listings").insert({
        user_id: user.id,
        module, category,
        business_name: cfg.fields.business ? form.business_name || null : null,
        owner_name: form.owner_name,
        experience: form.experience || null,
        whatsapp: form.whatsapp,
        age: cfg.fields.age && form.age ? Number(form.age) : null,
        city: cfg.fields.city ? form.city || null : null,
        address: cfg.fields.address ? form.address || null : null,
        fee: cfg.fields.fee && form.fee ? Number(form.fee) : null,
        subjects,
        images: imageUrls,
        plan: form.plan,
        active: form.active,
        expires_at: expires,
      });
      if (error) throw error;
      toast.success("Profile created!");
      onCreated();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create profile");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur p-2 sm:items-center" onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        className="glass max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-3xl p-5 scrollbar-thin animate-scale-in"
      >
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h3 className="font-display text-xl text-gradient-gold">Create Profile</h3>
            <p className="text-xs text-foreground/60">{cfg.title} · {category}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 hover:bg-white/10"><X size={16} /></button>
        </div>

        <div className="space-y-3">
          {cfg.fields.business && <Field label="Business Name" value={form.business_name} onChange={(v) => upd("business_name", v)} />}
          <Field label="Name" required value={form.owner_name} onChange={(v) => upd("owner_name", v)} />
          {cfg.fields.age && <Field label="Age" type="number" value={form.age} onChange={(v) => upd("age", v)} />}
          {cfg.fields.city && <Field label="City" value={form.city} onChange={(v) => upd("city", v)} />}
          {cfg.fields.address && <Field label="Address" value={form.address} onChange={(v) => upd("address", v)} />}
          <Field label="Experience" placeholder="e.g. 3 years" value={form.experience} onChange={(v) => upd("experience", v)} />
          {cfg.fields.fee && <Field label="Fee per subject (min 300)" type="number" value={form.fee} onChange={(v) => upd("fee", v)} />}
          {cfg.fields.subjects && <Field label="Subjects (comma separated)" value={form.subjects} onChange={(v) => upd("subjects", v)} />}
          <Field label="WhatsApp Number" placeholder="+923XXXXXXXXX" required value={form.whatsapp} onChange={(v) => upd("whatsapp", v)} />

          {cfg.fields.minImages && (
            <ImageInput files={files} setFiles={setFiles} min={cfg.fields.minImages} />
          )}

          <label className="flex items-center justify-between rounded-xl border border-white/10 bg-black/40 px-4 py-3">
            <span className="text-sm">Active Profile</span>
            <input type="checkbox" checked={form.active} onChange={(e) => upd("active", e.target.checked)} className="h-5 w-5 accent-gold" />
          </label>

          <div>
            <p className="mb-2 text-xs uppercase tracking-widest text-foreground/60">Payment Plan</p>
            <div className="grid grid-cols-2 gap-2">
              {cfg.plans.map((p) => (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => upd("plan", p.id)}
                  className={`rounded-xl border px-3 py-3 text-sm transition ${
                    form.plan === p.id ? "border-gold/60 bg-gold/10 text-gold glow-gold" : "border-white/10 bg-black/40 text-foreground/70"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button disabled={busy} className="btn-neon btn-neon-hover mt-5 w-full disabled:opacity-50">
          {busy ? "Creating…" : "Create Profile"}
        </button>
      </form>
    </div>
  );
}

interface FieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
}

function Field({ label, value, onChange, type = "text", required, placeholder }: FieldProps) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs uppercase tracking-widest text-foreground/60">{label}</span>
      <input
        type={type} required={required} value={value} placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2.5 text-sm outline-none focus:border-gold/60"
      />
    </label>
  );
}

function ImageInput({ files, setFiles, min }: { files: File[]; setFiles: (f: File[]) => void; min: number }) {
  return (
    <div>
      <p className="mb-1 text-xs uppercase tracking-widest text-foreground/60">
        Images (min {min}) — {files.length} selected
      </p>
      <label className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-white/20 bg-black/30 p-6 text-center text-sm text-foreground/60 transition hover:border-gold/50 hover:text-gold">
        <ImagePlus size={20} />
        <span>Tap to add images</span>
        <input
          type="file" accept="image/*" multiple className="hidden"
          onChange={(e) => setFiles([...files, ...Array.from(e.target.files ?? [])])}
        />
      </label>
      {files.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {files.map((f, i) => (
            <div key={i} className="relative">
              <img src={URL.createObjectURL(f)} alt="" className="h-14 w-14 rounded-md object-cover" />
              <button
                type="button"
                onClick={() => setFiles(files.filter((_, j) => j !== i))}
                className="absolute -right-1 -top-1 rounded-full bg-destructive p-0.5 text-white"
              >
                <Trash2 size={10} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
