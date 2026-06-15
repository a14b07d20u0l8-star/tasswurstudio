import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { Send, Mic, Image as ImageIcon, X, Trash2, Play, Pause, Download, ZoomIn, SkipForward, LogOut, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { containsBannedContent } from "@/lib/modules";

export const Route = createFileRoute("/_authenticated/relaxa")({
  head: () => ({ meta: [{ title: "Relaxa · Tasswur Studio" }] }),
  component: Relaxa,
});

// Services tiles removed — services are accessible via the sidebar only.

type Msg = {
  id: string;
  room_id: string;
  sender_id: string;
  kind: "text" | "image" | "voice";
  content: string | null;
  media_url: string | null;
  duration_ms: number | null;
  created_at: string;
  _localUrl?: string;
};

const sdb = supabase as any;

function Relaxa() {
  const [userId, setUserId] = useState<string | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [partnerOnline, setPartnerOnline] = useState(false);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [recordedDur, setRecordedDur] = useState(0);
  const [zoomImg, setZoomImg] = useState<string | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const recStart = useRef(0);
  const presenceCh = useRef<any>(null);
  const msgCh = useRef<any>(null);
  const roomCh = useRef<any>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<any>(null);

  // Auth
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  // Auto-join on mount
  useEffect(() => {
    if (userId && !roomId && !searching) joinQueue();
    // cleanup on unmount
    return () => {
      cleanupChannels();
      if (roomId) sdb.rpc("relaxa_leave", { _room: roomId });
      else if (userId) sdb.rpc("relaxa_leave", { _room: null });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Scroll to bottom on new msgs
  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs.length]);

  function cleanupChannels() {
    [presenceCh.current, msgCh.current, roomCh.current].forEach((c) => { if (c) supabase.removeChannel(c); });
    presenceCh.current = null; msgCh.current = null; roomCh.current = null;
  }

  const setupRoom = useCallback((rid: string) => {
    setRoomId(rid);
    setMsgs([]);
    setPartnerOnline(false);
    setPartnerTyping(false);

    // load existing messages
    sdb.from("relaxa_messages").select("*").eq("room_id", rid).order("created_at", { ascending: true })
      .then(({ data }: any) => { if (data) setMsgs(data as Msg[]); });

    // subscribe to new messages
    msgCh.current = supabase
      .channel(`relaxa-msgs-${rid}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "relaxa_messages", filter: `room_id=eq.${rid}` }, (payload: any) => {
        setMsgs((m) => (m.find((x) => x.id === payload.new.id) ? m : [...m, payload.new as Msg]));
      })
      .subscribe();

    // listen for room close
    roomCh.current = supabase
      .channel(`relaxa-room-${rid}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "relaxa_rooms", filter: `id=eq.${rid}` }, (payload: any) => {
        if (payload.new.active === false) {
          toast("Stranger left the chat");
          setRoomId(null);
          cleanupChannels();
          // auto-search next
          setTimeout(() => joinQueue(), 500);
        }
      })
      .subscribe();

    // presence + typing channel
    presenceCh.current = supabase.channel(`relaxa-presence-${rid}`, { config: { presence: { key: userId ?? "anon" } } });
    presenceCh.current
      .on("presence", { event: "sync" }, () => {
        const state = presenceCh.current.presenceState();
        const peers = Object.keys(state).filter((k) => k !== userId);
        setPartnerOnline(peers.length > 0);
      })
      .on("broadcast", { event: "typing" }, ({ payload }: any) => {
        if (payload.from !== userId) {
          setPartnerTyping(true);
          clearTimeout(typingTimer.current);
          typingTimer.current = setTimeout(() => setPartnerTyping(false), 1500);
        }
      })
      .subscribe(async (status: string) => {
        if (status === "SUBSCRIBED") await presenceCh.current.track({ online_at: Date.now() });
      });
  }, [userId]);

  async function joinQueue() {
    if (!userId) return;
    cleanupChannels();
    setSearching(true);
    const { data, error } = await sdb.rpc("relaxa_join");
    if (error) { setSearching(false); return toast.error(error.message); }
    if (data) {
      setSearching(false);
      setupRoom(data as string);
      return;
    }
    // No partner yet – subscribe to rooms where we become a member
    roomCh.current = supabase
      .channel(`relaxa-wait-${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "relaxa_rooms", filter: `user_b=eq.${userId}` }, (payload: any) => {
        setSearching(false);
        cleanupChannels();
        setupRoom(payload.new.id);
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "relaxa_rooms", filter: `user_a=eq.${userId}` }, (payload: any) => {
        setSearching(false);
        cleanupChannels();
        setupRoom(payload.new.id);
      })
      .subscribe();
  }

  async function leaveRoom(thenSearch = false) {
    if (roomId) await sdb.rpc("relaxa_leave", { _room: roomId });
    cleanupChannels();
    setRoomId(null);
    setMsgs([]);
    if (thenSearch) joinQueue();
  }

  async function sendText(e?: React.FormEvent) {
    e?.preventDefault();
    const txt = input.trim();
    if (!txt || !roomId || !userId) return;
    setInput("");
    const { error } = await sdb.from("relaxa_messages").insert({
      room_id: roomId, sender_id: userId, kind: "text", content: txt,
    });
    if (error) toast.error(error.message);
  }

  function broadcastTyping() {
    if (presenceCh.current && userId) presenceCh.current.send({ type: "broadcast", event: "typing", payload: { from: userId } });
  }

  // ---- Voice recording ----
  async function startRecord() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunks.current = [];
      recStart.current = Date.now();
      mr.ondataavailable = (e) => { if (e.data.size) chunks.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(chunks.current, { type: mr.mimeType || "audio/webm" });
        setRecordedBlob(blob);
        setRecordedUrl(URL.createObjectURL(blob));
        setRecordedDur(Date.now() - recStart.current);
        stream.getTracks().forEach((t) => t.stop());
      };
      mr.start();
      recorder.current = mr;
      setRecording(true);
    } catch {
      toast.error("Microphone permission denied");
    }
  }
  function stopRecord() {
    recorder.current?.stop();
    recorder.current = null;
    setRecording(false);
  }
  function discardRecording() {
    if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    setRecordedBlob(null); setRecordedUrl(null); setRecordedDur(0);
  }
  async function sendRecording() {
    if (!recordedBlob || !roomId || !userId) return;
    const path = `${userId}/voice-${Date.now()}.webm`;
    const { error: upErr } = await supabase.storage.from("relaxa-media").upload(path, recordedBlob, { contentType: recordedBlob.type });
    if (upErr) return toast.error(upErr.message);
    const { data: signed } = await supabase.storage.from("relaxa-media").createSignedUrl(path, 60 * 60 * 24 * 7);
    const url = signed?.signedUrl ?? path;
    const dur = recordedDur;
    discardRecording();
    const { error } = await sdb.from("relaxa_messages").insert({
      room_id: roomId, sender_id: userId, kind: "voice", media_url: url, duration_ms: dur,
    });
    if (error) toast.error(error.message);
  }

  // ---- Image upload ----
  async function pickImage(file: File) {
    if (!roomId || !userId) return;
    const path = `${userId}/img-${Date.now()}-${file.name.replace(/\s/g, "_")}`;
    const { error: upErr } = await supabase.storage.from("relaxa-media").upload(path, file, { contentType: file.type });
    if (upErr) return toast.error(upErr.message);
    const { data: signed } = await supabase.storage.from("relaxa-media").createSignedUrl(path, 60 * 60 * 24 * 7);
    const url = signed?.signedUrl ?? path;
    const { error } = await sdb.from("relaxa_messages").insert({
      room_id: roomId, sender_id: userId, kind: "image", media_url: url,
    });
    if (error) toast.error(error.message);
  }

  return (
    <AppShell title="Dreamy">
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        {/* Services moved to the sidebar — open the menu (top-left) to browse. */}



        {/* Chat */}
        <div className="glass flex h-[68dvh] flex-col rounded-3xl p-3 animate-scale-in">
          {/* Top bar */}
          <div className="flex items-center justify-between border-b border-white/10 px-2 pb-2">
            <div className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${partnerOnline ? "bg-emerald-400 shadow-[0_0_10px_#34d399]" : "bg-foreground/30"}`} />
              <div>
                <div className="text-sm font-semibold text-gradient-gold">Thauda User</div>
                <div className="text-[10px] uppercase tracking-widest text-foreground/50">
                  {searching ? "Searching for another user…" : roomId ? (partnerTyping ? "typing…" : partnerOnline ? "online" : "connected") : "Idle"}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button title="Next user" onClick={() => leaveRoom(true)} disabled={!roomId && !searching}
                className="rounded-full p-2 text-foreground/70 transition hover:bg-white/10 hover:text-gold disabled:opacity-40">
                <SkipForward size={16} />
              </button>
              <button title="New chat" onClick={() => joinQueue()} disabled={searching}
                className="rounded-full p-2 text-foreground/70 transition hover:bg-white/10 hover:text-gold disabled:opacity-40">
                <RefreshCw size={16} />
              </button>
              <button title="Leave" onClick={() => leaveRoom(false)} disabled={!roomId}
                className="rounded-full p-2 text-destructive transition hover:bg-destructive/10 disabled:opacity-40">
                <LogOut size={16} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 space-y-2 overflow-y-auto p-2 scrollbar-thin">
            {searching && !roomId && (
              <div className="flex h-full items-center justify-center">
                <div className="text-center">
                  <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-gold/30 border-t-gold" />
                  <p className="mt-3 text-sm text-foreground/70">Searching for another user…</p>
                </div>
              </div>
            )}
            {!searching && !roomId && msgs.length === 0 && (
              <div className="flex h-full items-center justify-center">
                <button onClick={() => joinQueue()} className="btn-neon btn-neon-hover">Start Anonymous Chat</button>
              </div>
            )}
            {msgs.map((m) => {
              const mine = m.sender_id === userId;
              return (
                <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`} style={{ animation: "fade-up 0.3s ease both" }}>
                  <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                    mine
                      ? "rounded-br-md bg-gradient-to-br from-gold/80 to-gold-dim/80 text-primary-foreground glow-gold"
                      : "rounded-bl-md border border-white/10 bg-black/40 text-foreground/90"
                  }`}>
                    {m.kind === "text" && <p className="whitespace-pre-wrap break-words">{m.content}</p>}
                    {m.kind === "image" && m.media_url && (
                      <div className="relative">
                        <img src={m.media_url} alt="" className="max-h-60 cursor-zoom-in rounded-xl object-cover" onClick={() => setZoomImg(m.media_url)} />
                        <div className="mt-1 flex justify-end gap-2">
                          <a href={m.media_url} download className="text-[10px] underline opacity-80 hover:opacity-100">
                            <Download size={12} className="inline" /> Save
                          </a>
                          <button onClick={() => setZoomImg(m.media_url)} className="text-[10px] underline opacity-80 hover:opacity-100">
                            <ZoomIn size={12} className="inline" /> Zoom
                          </button>
                        </div>
                      </div>
                    )}
                    {m.kind === "voice" && m.media_url && (
                      <VoicePlayer url={m.media_url} duration={m.duration_ms ?? 0} mine={mine} />
                    )}
                    <p className="mt-1 text-right text-[10px] opacity-60">
                      {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      {mine && " · sent"}
                    </p>
                  </div>
                </div>
              );
            })}
            {partnerTyping && (
              <div className="flex justify-start"><div className="rounded-2xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-foreground/60">typing…</div></div>
            )}
            <div ref={bottom} />
          </div>

          {/* Recording preview */}
          {recordedUrl && !recording && (
            <div className="m-2 flex items-center gap-2 rounded-2xl border border-gold/40 bg-black/40 p-2">
              <audio src={recordedUrl} controls className="h-8 flex-1" />
              <span className="text-[10px] text-foreground/60">{Math.round(recordedDur / 100) / 10}s</span>
              <button onClick={discardRecording} className="rounded-full p-2 text-destructive hover:bg-destructive/10"><Trash2 size={14} /></button>
              <button onClick={sendRecording} className="rounded-full bg-gold p-2 text-primary-foreground glow-gold"><Send size={14} /></button>
            </div>
          )}

          {/* Composer */}
          <form onSubmit={sendText} className="mt-2 flex items-center gap-2 rounded-full border border-white/10 bg-black/40 p-1.5">
            <label className="cursor-pointer rounded-full p-2 text-foreground/70 transition hover:bg-white/10 hover:text-gold" title="Send image">
              <ImageIcon size={16} />
              <input type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) pickImage(f); e.target.value = ""; }} />
            </label>
            <input
              value={input}
              onChange={(e) => { setInput(e.target.value); broadcastTyping(); }}
              placeholder={roomId ? "Type a message…" : "Connect to start chatting…"}
              disabled={!roomId}
              className="flex-1 bg-transparent px-2 text-sm outline-none placeholder:text-foreground/40 disabled:opacity-50"
            />
            <button
              type="button"
              onClick={recording ? stopRecord : startRecord}
              disabled={!roomId}
              className={`rounded-full p-2 transition disabled:opacity-40 ${recording ? "bg-destructive text-white animate-pulse" : "text-foreground/70 hover:bg-white/10 hover:text-gold"}`}
              title={recording ? "Stop recording" : "Record voice"}
            >
              <Mic size={16} />
            </button>
            <button
              type="submit"
              disabled={!roomId || !input.trim()}
              className="rounded-full bg-gold p-2 text-primary-foreground transition hover:scale-110 disabled:opacity-40 glow-gold"
              aria-label="Send"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      </div>

      {/* Zoom modal */}
      {zoomImg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm animate-fade-in" onClick={() => setZoomImg(null)}>
          <button className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white" onClick={() => setZoomImg(null)}><X size={20} /></button>
          <img src={zoomImg} alt="" className="max-h-[90vh] max-w-[95vw] rounded-2xl object-contain" />
          <a href={zoomImg} download className="absolute bottom-4 right-4 inline-flex items-center gap-2 rounded-full bg-gold px-4 py-2 text-sm text-primary-foreground glow-gold" onClick={(e) => e.stopPropagation()}>
            <Download size={14} /> Download
          </a>
        </div>
      )}
    </AppShell>
  );
}

function VoicePlayer({ url, duration, mine }: { url: string; duration: number; mine: boolean }) {
  const audio = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [cur, setCur] = useState(0);
  const [dur, setDur] = useState(duration / 1000 || 0);

  useEffect(() => {
    const a = new Audio(url);
    audio.current = a;
    a.onloadedmetadata = () => { if (isFinite(a.duration)) setDur(a.duration); };
    a.ontimeupdate = () => setCur(a.currentTime);
    a.onended = () => { setPlaying(false); setCur(0); };
    return () => { a.pause(); audio.current = null; };
  }, [url]);

  function toggle() {
    if (!audio.current) return;
    if (playing) { audio.current.pause(); setPlaying(false); }
    else { audio.current.play(); setPlaying(true); }
  }

  const pct = dur > 0 ? (cur / dur) * 100 : 0;
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

  return (
    <div className="flex min-w-[180px] items-center gap-2">
      <button onClick={toggle} className={`rounded-full p-1.5 ${mine ? "bg-black/20" : "bg-gold/20"}`}>
        {playing ? <Pause size={14} /> : <Play size={14} />}
      </button>
      <div className="flex-1">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/30">
          <div className="h-full bg-gold transition-all" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-0.5 flex justify-between text-[10px] opacity-70">
          <span>{fmt(cur)}</span><span>{fmt(dur)}</span>
        </div>
      </div>
      <a href={url} download className="opacity-70 hover:opacity-100" title="Download">
        <Download size={12} />
      </a>
    </div>
  );
}
