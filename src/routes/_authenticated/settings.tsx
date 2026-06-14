import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Youtube, Instagram, Facebook, LogOut, Trash2, Users } from "lucide-react";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
});

interface ProfileRow {
  username: string;
  full_name: string | null;
  email: string | null;
  tokens: number;
  youtube_url: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
}

function SettingsPage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [visitors, setVisitors] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("profiles")
      .select("username, full_name, email, tokens, youtube_url, instagram_url, facebook_url")
      .eq("id", user.id).maybeSingle();
    setProfile(data as ProfileRow);
    const { data: stats } = await supabase.from("site_stats").select("value").eq("key", "visitors").maybeSingle();
    setVisitors(stats?.value ?? 0);
  }
  useEffect(() => { load(); }, []);

  async function save() {
    if (!profile) return;
    setBusy(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("profiles").update({
      full_name: profile.full_name,
      youtube_url: profile.youtube_url,
      instagram_url: profile.instagram_url,
      facebook_url: profile.facebook_url,
    }).eq("id", user.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Saved");
  }

  async function logout() {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }

  async function deleteAccount() {
    if (!confirm("Delete your account permanently?")) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    // Best-effort: delete profile + sign out (full auth deletion requires admin function)
    await supabase.from("profiles").delete().eq("id", user.id);
    await supabase.auth.signOut();
    toast.success("Account data removed");
    navigate({ to: "/" });
  }

  if (!profile) return <AppShell title="Settings" back="/relaxa"><p className="py-12 text-center text-sm text-foreground/50">Loading…</p></AppShell>;

  return (
    <AppShell title="Settings" back="/relaxa">
      <div className="mx-auto max-w-md space-y-4">
        <div className="glass rounded-3xl p-5 animate-scale-in">
          <p className="text-xs uppercase tracking-widest text-foreground/60">User Profile</p>
          <h2 className="font-display text-xl text-gradient-gold">@{profile.username}</h2>
          <p className="text-xs text-foreground/60">{profile.email}</p>
          <p className="mt-2 text-sm">Tokens: <span className="text-gold font-bold">{profile.tokens} AT</span></p>

          <label className="mt-4 block">
            <span className="mb-1 block text-xs uppercase tracking-widest text-foreground/60">Full Name</span>
            <input
              value={profile.full_name ?? ""}
              onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
              className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2.5 text-sm outline-none focus:border-gold/60"
            />
          </label>
        </div>

        <div className="glass rounded-3xl p-5">
          <p className="text-xs uppercase tracking-widest text-foreground/60">Social Links</p>
          <div className="mt-3 space-y-2">
            <SocialInput icon={<Youtube size={16} />} value={profile.youtube_url ?? ""} onChange={(v) => setProfile({ ...profile, youtube_url: v })} placeholder="YouTube URL" />
            <SocialInput icon={<Instagram size={16} />} value={profile.instagram_url ?? ""} onChange={(v) => setProfile({ ...profile, instagram_url: v })} placeholder="Instagram URL" />
            <SocialInput icon={<Facebook size={16} />} value={profile.facebook_url ?? ""} onChange={(v) => setProfile({ ...profile, facebook_url: v })} placeholder="Facebook URL" />
          </div>
        </div>

        <button disabled={busy} onClick={save} className="btn-neon btn-neon-hover w-full disabled:opacity-50">
          {busy ? "Saving…" : "Save Profile"}
        </button>

        <div className="glass flex items-center gap-3 rounded-2xl p-4">
          <Users size={18} className="text-gold" />
          <div>
            <p className="text-xs uppercase tracking-widest text-foreground/60">User Counter</p>
            <p className="font-display text-lg text-gradient-gold">{visitors ?? "—"} visitors</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button onClick={logout} className="flex items-center justify-center gap-2 rounded-full border border-white/10 bg-black/40 px-4 py-3 text-sm hover:bg-white/5">
            <LogOut size={14} /> Logout
          </button>
          <button onClick={deleteAccount} className="flex items-center justify-center gap-2 rounded-full border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive hover:bg-destructive/20">
            <Trash2 size={14} /> Delete Account
          </button>
        </div>
      </div>
    </AppShell>
  );
}

function SocialInput({ icon, value, onChange, placeholder }: { icon: React.ReactNode; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/40 px-3 py-2">
      <span className="text-foreground/60">{icon}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="flex-1 bg-transparent text-sm outline-none placeholder:text-foreground/40" />
    </div>
  );
}
