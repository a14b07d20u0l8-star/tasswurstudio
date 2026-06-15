import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LogOut, Trash2, Users, AtSign, KeyRound, Save } from "lucide-react";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
});

interface ProfileRow {
  username: string;
  full_name: string | null;
  email: string | null;
  tokens: number;
}

function SettingsPage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [visitors, setVisitors] = useState<number | null>(null);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("profiles")
      .select("username, full_name, email, tokens")
      .eq("id", user.id).maybeSingle();
    if (data) {
      setProfile(data as ProfileRow);
      setNewUsername(data.username ?? "");
    }
    const { data: stats } = await supabase.from("site_stats").select("value").eq("key", "visitors").maybeSingle();
    setVisitors(stats?.value ?? 0);
  }
  useEffect(() => { load(); }, []);

  async function saveProfile() {
    if (!profile) return;
    setBusy(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const updates: { full_name: string | null; username?: string } = { full_name: profile.full_name };
      if (newUsername && newUsername !== profile.username) {
        if (!/^[a-zA-Z0-9_]{3,24}$/.test(newUsername)) throw new Error("Username must be 3-24 chars (letters, numbers, _)");
        updates.username = newUsername;
      }
      const { error } = await supabase.from("profiles").update(updates).eq("id", user.id);
      if (error) throw error;
      toast.success("Profile saved");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally { setBusy(false); }
  }

  async function changePassword() {
    if (!newPassword) return toast.error("Enter a new password");
    if (newPassword.length < 6) return toast.error("Password must be at least 6 characters");
    if (newPassword !== confirmPwd) return toast.error("Passwords don't match");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Password updated");
    setNewPassword(""); setConfirmPwd("");
  }

  async function logout() {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }

  async function deleteAccount() {
    if (!confirm("Delete your account permanently?")) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
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
        </div>

        <div className="glass rounded-3xl p-5 space-y-3">
          <p className="text-xs uppercase tracking-widest text-foreground/60">Edit Profile</p>
          <label className="block">
            <span className="mb-1 block text-xs text-foreground/60">Full Name</span>
            <input
              value={profile.full_name ?? ""}
              onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
              className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2.5 text-sm outline-none focus:border-gold/60"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-foreground/60 flex items-center gap-1"><AtSign size={12} /> Username</span>
            <input
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2.5 text-sm outline-none focus:border-gold/60"
            />
          </label>
          <button disabled={busy} onClick={saveProfile} className="btn-neon btn-neon-hover w-full disabled:opacity-50 inline-flex items-center justify-center gap-2">
            <Save size={14} /> {busy ? "Saving…" : "Save Profile"}
          </button>
        </div>

        <div className="glass rounded-3xl p-5 space-y-3">
          <p className="text-xs uppercase tracking-widest text-foreground/60 flex items-center gap-1"><KeyRound size={12} /> Change Password</p>
          <input
            type="password" placeholder="New password (min 6 chars)" value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2.5 text-sm outline-none focus:border-gold/60"
          />
          <input
            type="password" placeholder="Confirm new password" value={confirmPwd}
            onChange={(e) => setConfirmPwd(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2.5 text-sm outline-none focus:border-gold/60"
          />
          <button disabled={busy} onClick={changePassword} className="btn-neon btn-neon-hover w-full disabled:opacity-50">
            {busy ? "Updating…" : "Update Password"}
          </button>
        </div>

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
