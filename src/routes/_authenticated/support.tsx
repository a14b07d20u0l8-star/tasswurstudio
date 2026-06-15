import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Send, Phone, Mail, MapPin, ShieldAlert, Circle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/support")({
  component: SupportPage,
});

interface Msg {
  id: string;
  ticket_id: string;
  sender_id: string;
  body: string;
  created_at: string;
}
interface Ticket { id: string; user_id: string; }

const NCCIA = [
  {
    city: "Nation Wide – 24/7",
    phone: "1799",
    email: null,
    address: "Dial 1799 from any phone",
  },
  {
    city: "Lahore",
    phone: "+92 42 99268527",
    email: "Incharge.ccrc.lhr@nccia.gov.pk",
    address: "Street No. 15, Wafaqi Colony, Canal Road Lahore",
  },
  {
    city: "Islamabad",
    phone: "+92 51 9262106",
    email: "incharge.ccrc.ict@nccia.gov.pk",
    address: "Plaza 5/C, Street No. 169, G-13/3, Islamabad",
  },
  {
    city: "Karachi",
    phone: "+92 21 99333950",
    email: "incharge.ccrc.khi@nccia.gov.pk",
    address: "Near Darul Sehat Hospital, Gulistan-e-Johar, Karachi",
  },
  {
    city: "Multan",
    phone: "+92 61 9330999",
    email: "incharge.ccrc.mtn@nccia.gov.pk",
    address: "House No. 06, Street-3, Shalimar Town, Bosan Town, Multan",
  },
];

function SupportPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  // For owner: list of all tickets
  const [tickets, setTickets] = useState<Array<Ticket & { last_message_at: string }>>([]);
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [ownerOnline, setOwnerOnline] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);

  // Bootstrap
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      const owner = !!roles?.some(r => r.role === "owner");
      setIsOwner(owner);

      if (owner) {
        // Heartbeat presence
        await supabase.from("owner_presence").upsert({ user_id: user.id, last_seen_at: new Date().toISOString() });
        const hb = setInterval(() => {
          supabase.from("owner_presence").upsert({ user_id: user.id, last_seen_at: new Date().toISOString() });
        }, 30000);
        // Load all tickets
        const { data: ts } = await supabase
          .from("support_tickets")
          .select("id,user_id,last_message_at")
          .order("last_message_at", { ascending: false });
        setTickets(ts ?? []);
        if (ts && ts[0]) setActiveTicketId(ts[0].id);
        return () => clearInterval(hb);
      } else {
        // Get or create user's ticket
        const { data: existing } = await supabase
          .from("support_tickets")
          .select("id,user_id")
          .eq("user_id", user.id)
          .maybeSingle();
        let t = existing;
        if (!t) {
          const { data: created, error } = await supabase
            .from("support_tickets")
            .insert({ user_id: user.id })
            .select("id,user_id")
            .single();
          if (error) { toast.error(error.message); return; }
          t = created;
        }
        setTicket(t);
        setActiveTicketId(t.id);
      }
    })();
  }, []);

  // Owner online indicator (for non-owners)
  useEffect(() => {
    if (isOwner) return;
    const check = async () => {
      const { data } = await supabase
        .from("owner_presence")
        .select("last_seen_at")
        .order("last_seen_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!data) { setOwnerOnline(false); return; }
      const diff = Date.now() - new Date(data.last_seen_at).getTime();
      setOwnerOnline(diff < 2 * 60 * 1000);
    };
    check();
    const id = setInterval(check, 30000);
    return () => clearInterval(id);
  }, [isOwner]);

  // Load + subscribe to messages for active ticket
  useEffect(() => {
    if (!activeTicketId) return;
    (async () => {
      const { data } = await supabase
        .from("support_messages")
        .select("*")
        .eq("ticket_id", activeTicketId)
        .order("created_at", { ascending: true });
      setMsgs((data ?? []) as Msg[]);
    })();
    const channel = supabase
      .channel(`support-${activeTicketId}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "support_messages", filter: `ticket_id=eq.${activeTicketId}` },
        (payload) => setMsgs(prev => [...prev, payload.new as Msg]))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeTicketId]);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [msgs.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim() || !activeTicketId || !userId) return;
    setBusy(true);
    const text = body.trim();
    setBody("");
    const { error } = await supabase.from("support_messages").insert({
      ticket_id: activeTicketId, sender_id: userId, body: text,
    });
    if (error) { toast.error(error.message); setBody(text); }
    else {
      await supabase.from("support_tickets").update({ last_message_at: new Date().toISOString() }).eq("id", activeTicketId);
    }
    setBusy(false);
  }

  return (
    <AppShell title="Support" back="/relaxa">
      <div className="mx-auto max-w-3xl space-y-4">
        {/* Owner status banner */}
        {!isOwner && (
          <div className="glass flex items-center justify-between rounded-2xl px-4 py-3 animate-fade-in">
            <div className="flex items-center gap-2">
              <Circle size={10} className={ownerOnline ? "fill-emerald-400 text-emerald-400" : "fill-zinc-500 text-zinc-500"} />
              <span className="text-sm">Owner is <strong className={ownerOnline ? "text-emerald-400" : "text-foreground/60"}>{ownerOnline ? "Online" : "Offline"}</strong></span>
            </div>
            <span className="text-xs text-foreground/50">We reply ASAP</span>
          </div>
        )}

        {/* Owner ticket list */}
        {isOwner && (
          <div className="glass rounded-2xl p-3">
            <p className="px-2 pb-2 text-xs uppercase tracking-widest text-foreground/60">Tickets ({tickets.length})</p>
            <div className="flex gap-2 overflow-x-auto scrollbar-thin">
              {tickets.length === 0 && <p className="px-2 text-sm text-foreground/50">No tickets yet</p>}
              {tickets.map(t => (
                <button key={t.id}
                  onClick={() => setActiveTicketId(t.id)}
                  className={`shrink-0 rounded-xl border px-3 py-2 text-xs transition ${activeTicketId === t.id ? "border-gold bg-gold/10 text-gold" : "border-white/10 text-foreground/70 hover:border-gold/40"}`}>
                  {t.user_id.slice(0, 8)}…
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Chat */}
        <div className="glass flex h-[60dvh] flex-col rounded-3xl">
          <div ref={scroller} className="flex-1 space-y-2 overflow-y-auto p-4 scrollbar-thin">
            {msgs.length === 0 && (
              <p className="py-10 text-center text-sm text-foreground/50">
                {isOwner ? "Select a ticket to view messages." : "Start the conversation. Send your first message below."}
              </p>
            )}
            {msgs.map(m => {
              const mine = m.sender_id === userId;
              return (
                <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"} animate-fade-in`}>
                  <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${mine ? "bg-gradient-to-br from-gold/30 to-gold/10 border border-gold/30" : "bg-white/5 border border-white/10"}`}>
                    <p className="whitespace-pre-wrap break-words">{m.body}</p>
                    <p className="mt-1 text-[10px] text-foreground/40">{new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                  </div>
                </div>
              );
            })}
          </div>
          <form onSubmit={send} className="flex items-center gap-2 border-t border-white/10 p-3">
            <input
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder={isOwner ? "Reply to user…" : "Type a message…"}
              disabled={!activeTicketId || busy}
              className="flex-1 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none focus:border-gold/60"
            />
            <button disabled={!activeTicketId || busy || !body.trim()} className="btn-neon btn-neon-hover px-4 disabled:opacity-40">
              <Send size={16} />
            </button>
          </form>
        </div>

        {/* NCCIA */}
        <div className="glass rounded-3xl p-5 animate-scale-in">
          <div className="mb-3 flex items-center gap-2">
            <ShieldAlert className="text-gold" size={20} />
            <h2 className="font-display text-base uppercase tracking-widest text-gradient-gold">
              National Cyber Crime Investigating Agency (NCCIA)
            </h2>
          </div>
          <p className="mb-4 text-xs text-foreground/60">Nation wide 24/7 support — Dial <a href="tel:1799" className="text-gold underline">1799</a></p>
          <div className="grid gap-3 sm:grid-cols-2">
            {NCCIA.map(o => (
              <div key={o.city} className="rounded-2xl border border-white/10 bg-black/30 p-4 transition hover:border-gold/40">
                <p className="font-display text-sm uppercase tracking-widest text-gold">{o.city}</p>
                <div className="mt-2 space-y-1.5 text-xs">
                  <a href={`tel:${o.phone.replace(/\s/g, "")}`} className="flex items-center gap-2 text-foreground/80 hover:text-gold">
                    <Phone size={12} /> {o.phone}
                  </a>
                  {o.email && (
                    <a href={`mailto:${o.email}`} className="flex items-center gap-2 break-all text-foreground/80 hover:text-gold">
                      <Mail size={12} /> {o.email}
                    </a>
                  )}
                  <a href={`https://maps.google.com/?q=${encodeURIComponent(o.address)}`} target="_blank" rel="noreferrer" className="flex items-start gap-2 text-foreground/80 hover:text-gold">
                    <MapPin size={12} className="mt-0.5 shrink-0" /> <span>{o.address}</span>
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
