import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign In · Tasswur Studio" }] }),
  component: AuthPage,
});

function AuthPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const [form, setForm] = useState({ username: "", email: "", password: "", confirm: "" });

  function update<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        if (form.password !== form.confirm) throw new Error("Passwords do not match");
        if (form.password.length < 6) throw new Error("Password must be at least 6 characters");
        if (!form.username.trim()) throw new Error("Username required");
        const { error } = await supabase.auth.signUp({
          email: form.email,
          password: form.password,
          options: {
            emailRedirectTo: `${window.location.origin}/relaxa`,
            data: { username: form.username },
          },
        });
        if (error) throw error;
        toast.success("Welcome to Tasswur Studio!");
        navigate({ to: "/relaxa" });
      } else {
        // Login: accept email OR username
        let email = form.email;
        if (!email.includes("@")) {
          // username lookup
          const { data } = await supabase.from("profiles").select("email").eq("username", email).maybeSingle();
          if (!data?.email) throw new Error("Username not found");
          email = data.email;
        }
        const { error } = await supabase.auth.signInWithPassword({ email, password: form.password });
        if (error) throw error;
        toast.success("Signed in");
        navigate({ to: "/relaxa" });
      }
    } catch (err: any) {
      toast.error(err.message ?? "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative z-10 flex min-h-dvh items-center justify-center px-4 py-10 page-enter">
      <div className="glass w-full max-w-md rounded-3xl p-6 sm:p-8 animate-scale-in">
        <div className="text-center">
          <h1 className="font-display text-3xl text-gradient-gold">Tasswur Studio</h1>
          <p className="mt-1 text-xs uppercase tracking-[0.3em] text-foreground/60">
            {mode === "login" ? "Welcome Back" : "Create Account"}
          </p>
        </div>

        <div className="mt-6 grid grid-cols-2 rounded-full bg-white/5 p-1">
          {(["login", "signup"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`rounded-full py-2 text-xs font-semibold uppercase tracking-widest transition ${
                mode === m ? "bg-gold text-primary-foreground glow-gold" : "text-foreground/70"
              }`}
            >
              {m === "login" ? "Login" : "Sign Up"}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="mt-6 space-y-3">
          {mode === "signup" && (
            <Input label="Username" value={form.username} onChange={(v) => update("username", v)} required />
          )}
          <Input
            label={mode === "signup" ? "Email" : "Email or Username"}
            type={mode === "signup" ? "email" : "text"}
            value={form.email}
            onChange={(v) => update("email", v)}
            required
          />
          <Input label="Password" type="password" value={form.password} onChange={(v) => update("password", v)} required />
          {mode === "signup" && (
            <Input label="Confirm Password" type="password" value={form.confirm} onChange={(v) => update("confirm", v)} required />
          )}

          <button type="submit" disabled={loading} className="btn-neon btn-neon-hover w-full disabled:opacity-50">
            {loading ? "Please wait…" : mode === "login" ? "Login" : "Sign Up"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-foreground/60">
          <Link to="/" className="hover:text-gold">← Back to intro</Link>
        </p>
      </div>
    </div>
  );
}

function Input({
  label, value, onChange, type = "text", required,
}: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs uppercase tracking-widest text-foreground/60">{label}</span>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-foreground outline-none transition focus:border-gold/60 focus:glow-gold"
      />
    </label>
  );
}
