import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { MODULES, type ModuleKey, type ModuleConfig } from "@/lib/modules";
import { supabase } from "@/integrations/supabase/client";
import { waLink } from "@/lib/whatsapp";
import { toast } from "sonner";
import { Search, Plus, MessageCircle, Star, X, ImagePlus, Trash2, Pin, Globe, Instagram, Facebook } from "lucide-react";

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
  pinned?: boolean;
  total_paid?: number;
  whatsapp_channel?: string | null;
  tiktok?: string | null;
  instagram?: string | null;
  facebook?: string | null;
  website?: string | null;
}

interface Rating {
  id: string;
  listing_id: string;
  user_id: string;
  stars: number;
  comment: string | null;
  created_at: string;
}

interface ListingWithStats extends Listing {
  avg: number;
  count: number;
}

async function recordContact(listingId: string) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("profile_contacts").insert({ user_id: user.id, listing_id: listingId });
  } catch {
    // duplicate or offline — ignore
  }
}

function SocialIconLink({ href, label, children, color }: { href: string; label: string; children: React.ReactNode; color: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" title={label} aria-label={label}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-black/40 text-foreground/80 transition hover:scale-110 ${color}`}>
      {children}
    </a>
  );
}

function SocialLinks({ item }: { item: Listing }) {
  const has = item.whatsapp_channel || item.tiktok || item.instagram || item.facebook || item.website;
  if (!has) return null;
  const norm = (u: string) => (/^https?:\/\//i.test(u) ? u : `https://${u}`);
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {item.whatsapp_channel && (
        <SocialIconLink href={norm(item.whatsapp_channel)} label="WhatsApp Channel" color="hover:text-emerald-400 hover:border-emerald-400/60">
          <MessageCircle size={14} />
        </SocialIconLink>
      )}
      {item.tiktok && (
        <SocialIconLink href={norm(item.tiktok)} label="TikTok" color="hover:text-pink-400 hover:border-pink-400/60">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden><path d="M19.6 6.3a5 5 0 0 1-3.2-1.2 5 5 0 0 1-1.7-3H11v12.3a2.7 2.7 0 1 1-2-2.6V8.4a5.7 5.7 0 1 0 5 5.6V9.8a8 8 0 0 0 5 1.7v-3a5 5 0 0 1-1.4-2.2z"/></svg>
        </SocialIconLink>
      )}
      {item.instagram && (
        <SocialIconLink href={norm(item.instagram)} label="Instagram" color="hover:text-pink-400 hover:border-pink-400/60">
          <Instagram size={14} />
        </SocialIconLink>
      )}
      {item.facebook && (
        <SocialIconLink href={norm(item.facebook)} label="Facebook" color="hover:text-blue-400 hover:border-blue-400/60">
          <Facebook size={14} />
        </SocialIconLink>
      )}
      {item.website && (
        <SocialIconLink href={norm(item.website)} label="Website" color="hover:text-gold hover:border-gold/60">
          <Globe size={14} />
        </SocialIconLink>
      )}
    </div>
  );
}

function CategoryPage() {
  const { module, category } = Route.useParams();
  const key = module as ModuleKey;
  const cfg = MODULES[key];
  const cat = decodeURIComponent(category);

  const [items, setItems] = useState<ListingWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [gallery, setGallery] = useState<string[] | null>(null);
  const [reviewsFor, setReviewsFor] = useState<Listing | null>(null);
  const [me, setMe] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      setMe(data.user?.id ?? null);
      if (data.user) {
        const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", data.user.id);
        setIsOwner(!!roles?.some(r => r.role === "owner"));
      }
    });
  }, []);

  async function load() {
    if (!cfg) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("listings")
      .select("*, ratings(stars)")
      .eq("module", key)
      .eq("category", cat)
      .eq("active", true)
      .gt("expires_at", new Date().toISOString());
    if (error) toast.error(error.message);
    const withStats: ListingWithStats[] = ((data as any[]) ?? []).map((it) => {
      const stars: number[] = (it.ratings ?? []).map((r: any) => r.stars);
      const avg = stars.length ? stars.reduce((a, b) => a + b, 0) / stars.length : 0;
      return { ...(it as Listing), avg, count: stars.length };
    });
    // pinned first, then by avg desc, then count desc
    withStats.sort((a, b) => {
      if ((b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) !== 0) return (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0);
      if (b.avg !== a.avg) return b.avg - a.avg;
      return b.count - a.count;
    });
    setItems(withStats);
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

  async function togglePin(it: Listing) {
    const { error } = await supabase.from("listings").update({ pinned: !it.pinned }).eq("id", it.id);
    if (error) toast.error(error.message); else { toast.success(it.pinned ? "Unpinned" : "Pinned"); load(); }
  }
  async function ownerDelete(it: Listing) {
    if (!confirm("Delete this profile?")) return;
    const { error } = await supabase.from("listings").delete().eq("id", it.id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); load(); }
  }

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
              <ListingCard
                key={it.id}
                item={it}
                cfg={cfg}
                delay={i * 0.05}
                isOwner={isOwner}
                isMine={me === it.user_id}
                onOpenGallery={() => setGallery(it.images)}
                onOpenReviews={() => setReviewsFor(it)}
                onPin={() => togglePin(it)}
                onDelete={() => ownerDelete(it)}
              />
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <CreateForm module={key} category={cat} onClose={() => setShowForm(false)} onCreated={load} />
      )}
      {gallery && <GalleryModal images={gallery} onClose={() => setGallery(null)} />}
      {reviewsFor && <ReviewsModal listing={reviewsFor} me={me} isOwner={isOwner} onClose={() => setReviewsFor(null)} />}
    </AppShell>
  );
}

function ListingCard({
  item, cfg, delay, isOwner, isMine, onOpenGallery, onOpenReviews, onPin, onDelete,
}: {
  item: ListingWithStats; cfg: ModuleConfig; delay: number;
  isOwner: boolean; isMine: boolean;
  onOpenGallery: () => void; onOpenReviews: () => void;
  onPin: () => void; onDelete: () => void;
}) {
  const title = item.business_name || item.owner_name;
  const firstImg = item.images?.[0];
  return (
    <div
      className={`glass group relative rounded-2xl p-4 transition hover:-translate-y-1 hover:glow-purple ${item.pinned ? "border-2 border-gold/60" : ""}`}
      style={{ animation: `fade-up 0.4s ease ${delay}s both` }}
    >
      {item.pinned && (
        <div className="absolute -top-2 left-3 rounded-full bg-gold px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-primary-foreground">📌 Pinned</div>
      )}
      {firstImg && (
        <button onClick={onOpenGallery} className="mb-3 block w-full overflow-hidden rounded-xl">
          <img src={firstImg} alt="" className="aspect-video w-full object-cover transition group-hover:scale-105" loading="lazy" />
          {item.images.length > 1 && (
            <span className="mt-1 block text-right text-[10px] text-foreground/50">+{item.images.length - 1} more — tap to view</span>
          )}
        </button>
      )}
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-display text-lg text-gradient-gold">{title}</h3>
          {item.business_name && <p className="text-xs text-foreground/60">{item.owner_name}</p>}
        </div>
        <div className="flex items-center gap-1 text-xs text-gold">
          <Star size={12} fill="currentColor" /> {item.count > 0 ? item.avg.toFixed(1) : "New"}
          {item.count > 0 && <span className="text-foreground/50">({item.count})</span>}
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
      <div className="mt-3 flex gap-2">
        <a
          href={waLink(item.whatsapp, `Hi! I found your profile on Tasswur Studio under ${cfg.title}.`)}
          target="_blank" rel="noreferrer"
          onClick={() => { void recordContact(item.id); }}
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-emerald-500/90 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-white transition hover:scale-[1.02]"
        >
          <MessageCircle size={14} /> WhatsApp
        </a>
        <button onClick={onOpenReviews} className="rounded-full border border-gold/40 px-3 py-2 text-xs text-gold transition hover:bg-gold/10">
          <Star size={12} className="inline" /> Reviews
        </button>
      </div>
      <SocialLinks item={item} />

      {(isOwner || isMine) && (
        <div className="mt-2 flex gap-2">
          {isOwner && (
            <button onClick={onPin} className="flex-1 rounded-full border border-white/10 px-2 py-1 text-[10px] text-foreground/70 hover:border-gold/50 hover:text-gold">
              <Pin size={10} className="inline" /> {item.pinned ? "Unpin" : "Pin"}
            </button>
          )}
          {(isOwner || isMine) && (
            <button onClick={onDelete} className="flex-1 rounded-full border border-destructive/40 px-2 py-1 text-[10px] text-destructive hover:bg-destructive/10">
              <Trash2 size={10} className="inline" /> Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function GalleryModal({ images, onClose }: { images: string[]; onClose: () => void }) {
  return (
    <div onClick={onClose} className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur p-3 animate-fade-in">
      <div onClick={(e) => e.stopPropagation()} className="glass max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-3xl p-4 scrollbar-thin">
        <div className="mb-3 flex items-center justify-between">
          <p className="font-display text-sm uppercase tracking-widest text-gradient-gold">Gallery ({images.length})</p>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-white/10"><X size={16} /></button>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {images.map((u, i) => (
            <a key={i} href={u} target="_blank" rel="noreferrer" className="overflow-hidden rounded-xl">
              <img src={u} alt="" className="aspect-square w-full object-cover transition hover:scale-105" />
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

function ReviewsModal({ listing, me, isOwner, onClose }: { listing: Listing; me: string | null; isOwner: boolean; onClose: () => void }) {
  const [reviews, setReviews] = useState<Rating[]>([]);
  const [stars, setStars] = useState(5);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [hasContacted, setHasContacted] = useState<boolean | null>(null);
  const max = isOwner ? 7 : 5;

  async function load() {
    const { data } = await supabase.from("ratings").select("*").eq("listing_id", listing.id).order("created_at", { ascending: false });
    setReviews((data as Rating[]) ?? []);
  }
  useEffect(() => { load(); }, [listing.id]);

  useEffect(() => {
    (async () => {
      if (!me) { setHasContacted(false); return; }
      const { data, error } = await supabase
        .from("profile_contacts").select("id")
        .eq("user_id", me).eq("listing_id", listing.id).maybeSingle();
      setHasContacted(!error && !!data);
    })();
  }, [me, listing.id]);

  const mine = reviews.find(r => r.user_id === me);
  useEffect(() => {
    if (mine) {
      setStars(mine.stars);
      setComment(mine.comment ?? "");
    }
  }, [mine?.id]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!me) return toast.error("Sign in required");
    if (me === listing.user_id) return toast.error("You can't review your own profile");
    if (!hasContacted) return toast.error("You must contact this profile before leaving a review.");
    setBusy(true);
    const payload = { listing_id: listing.id, user_id: me, stars, comment: comment || null };
    const { error } = mine
      ? await supabase.from("ratings").update({ stars, comment: comment || null }).eq("id", mine.id)
      : await supabase.from("ratings").insert(payload);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(mine ? "Review updated" : "Review submitted");
    load();
  }

  const canReview = !!me && me !== listing.user_id && hasContacted === true;
  const showContactGate = !!me && me !== listing.user_id && hasContacted === false;

  return (
    <div onClick={onClose} className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur p-2 sm:items-center animate-fade-in">
      <div onClick={(e) => e.stopPropagation()} className="glass max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-3xl p-5 scrollbar-thin">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="font-display text-lg text-gradient-gold">Reviews</h3>
            <p className="text-xs text-foreground/60">{listing.business_name || listing.owner_name}</p>
          </div>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-white/10"><X size={16} /></button>
        </div>

        {showContactGate && (
          <div className="mb-4 rounded-2xl border border-gold/30 bg-gold/5 p-3 text-xs text-foreground/80">
            You must contact this profile before leaving a review.
          </div>
        )}

        {canReview && (
          <form onSubmit={submit} className="mb-4 rounded-2xl border border-white/10 bg-black/30 p-3">
            <p className="mb-2 text-xs uppercase tracking-widest text-foreground/60">
              {mine ? "Update your review" : "Leave a review"} {isOwner && "(owner: up to 7★)"}
            </p>
            <div className="mb-2 flex gap-1">
              {Array.from({ length: max }, (_, i) => i + 1).map(n => (
                <button type="button" key={n} onClick={() => setStars(n)} className="transition hover:scale-110">
                  <Star size={20} className={n <= stars ? "fill-gold text-gold" : "text-foreground/30"} />
                </button>
              ))}
            </div>
            <textarea
              value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Optional comment…"
              maxLength={500} rows={2}
              className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none focus:border-gold/60"
            />
            <button disabled={busy} className="btn-neon btn-neon-hover mt-2 w-full !py-2 !text-xs disabled:opacity-50">
              {busy ? "Saving…" : mine ? "Update Review" : "Submit Review"}
            </button>
          </form>
        )}

        <div className="space-y-2">
          {reviews.length === 0 && <p className="py-6 text-center text-sm text-foreground/50">No reviews yet</p>}
          {reviews.map(r => (
            <div key={r.id} className="rounded-xl border border-white/10 bg-black/30 p-3">
              <div className="flex items-center gap-1 text-gold">
                {Array.from({ length: r.stars }, (_, i) => <Star key={i} size={12} fill="currentColor" />)}
              </div>
              {r.comment && <p className="mt-1 text-sm text-foreground/80">{r.comment}</p>}
              <p className="mt-1 text-[10px] text-foreground/40">{new Date(r.created_at).toLocaleDateString()}</p>
            </div>
          ))}
        </div>
      </div>
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
  whatsapp_channel: string;
  tiktok: string;
  instagram: string;
  facebook: string;
  website: string;
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
    whatsapp_channel: "", tiktok: "", instagram: "", facebook: "", website: "",
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
      const minImgs = cfg.fields.minImages ?? 0;
      if (minImgs > 0 && files.length < minImgs) {
        throw new Error(`Please upload at least ${minImgs} image${minImgs > 1 ? "s" : ""}`);
      }

      const { data: prof, error: pErr } = await supabase
        .from("profiles").select("tokens").eq("id", user.id).maybeSingle();
      if (pErr) throw pErr;
      const balance = prof?.tokens ?? 0;
      if (balance < plan.price) {
        throw new Error(`Need ${plan.price} AT tokens. You have ${balance}. Please Add Funds.`);
      }
      const { error: dErr } = await supabase
        .from("profiles").update({ tokens: balance - plan.price }).eq("id", user.id);
      if (dErr) throw dErr;

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
        total_paid: plan.price,
        last_paid_at: new Date().toISOString(),
        whatsapp_channel: form.whatsapp_channel.trim() || null,
        tiktok: form.tiktok.trim() || null,
        instagram: form.instagram.trim() || null,
        facebook: form.facebook.trim() || null,
        website: form.website.trim() || null,
      });
      if (error) throw error;
      toast.success(`Profile created! ${plan.price} AT deducted.`);
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
          {cfg.fields.city && <Field label="City" required value={form.city} onChange={(v) => upd("city", v)} />}
          {cfg.fields.address && <Field label="Address" value={form.address} onChange={(v) => upd("address", v)} />}
          <Field label="Experience" placeholder="e.g. 3 years" value={form.experience} onChange={(v) => upd("experience", v)} />
          {cfg.fields.fee && <Field label="Fee per subject (min 300)" type="number" value={form.fee} onChange={(v) => upd("fee", v)} />}
          {cfg.fields.subjects && <Field label="Subjects (comma separated)" value={form.subjects} onChange={(v) => upd("subjects", v)} />}
          <Field label="WhatsApp Number" placeholder="+923XXXXXXXXX" required value={form.whatsapp} onChange={(v) => upd("whatsapp", v)} />

          <div className="rounded-xl border border-white/10 bg-black/20 p-3 space-y-2">
            <p className="text-[10px] uppercase tracking-widest text-foreground/50">Social & Website Links (all optional)</p>
            <Field label="WhatsApp Channel Link" placeholder="https://whatsapp.com/channel/..." value={form.whatsapp_channel} onChange={(v) => upd("whatsapp_channel", v)} />
            <Field label="TikTok Profile Link" placeholder="https://tiktok.com/@you" value={form.tiktok} onChange={(v) => upd("tiktok", v)} />
            <Field label="Instagram Profile Link" placeholder="https://instagram.com/you" value={form.instagram} onChange={(v) => upd("instagram", v)} />
            <Field label="Facebook Profile Link" placeholder="https://facebook.com/you" value={form.facebook} onChange={(v) => upd("facebook", v)} />
            <Field label="Website Link" placeholder="https://yourwebsite.com" value={form.website} onChange={(v) => upd("website", v)} />
          </div>

          <ImageInput files={files} setFiles={setFiles} min={cfg.fields.minImages ?? 0} />


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
        Images{min > 0 ? ` (min ${min})` : " (optional)"} — {files.length} selected
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
