
-- WAITING QUEUE
CREATE TABLE public.relaxa_waiting (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.relaxa_waiting TO authenticated;
GRANT ALL ON public.relaxa_waiting TO service_role;
ALTER TABLE public.relaxa_waiting ENABLE ROW LEVEL SECURITY;
CREATE POLICY "self queue read" ON public.relaxa_waiting FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "self queue insert" ON public.relaxa_waiting FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "self queue delete" ON public.relaxa_waiting FOR DELETE USING (auth.uid() = user_id);

-- ROOMS
CREATE TABLE public.relaxa_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_b uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz
);
CREATE INDEX relaxa_rooms_users_idx ON public.relaxa_rooms (user_a, user_b, active);
GRANT SELECT, INSERT, UPDATE ON public.relaxa_rooms TO authenticated;
GRANT ALL ON public.relaxa_rooms TO service_role;
ALTER TABLE public.relaxa_rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read room" ON public.relaxa_rooms FOR SELECT USING (auth.uid() = user_a OR auth.uid() = user_b);
CREATE POLICY "members update room" ON public.relaxa_rooms FOR UPDATE USING (auth.uid() = user_a OR auth.uid() = user_b);
CREATE POLICY "members insert room" ON public.relaxa_rooms FOR INSERT WITH CHECK (auth.uid() = user_a OR auth.uid() = user_b);

-- MESSAGES
CREATE TABLE public.relaxa_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.relaxa_rooms(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'text', -- text | image | voice
  content text,
  media_url text,
  duration_ms integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX relaxa_messages_room_idx ON public.relaxa_messages (room_id, created_at);
GRANT SELECT, INSERT ON public.relaxa_messages TO authenticated;
GRANT ALL ON public.relaxa_messages TO service_role;
ALTER TABLE public.relaxa_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read msgs" ON public.relaxa_messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.relaxa_rooms r WHERE r.id = room_id AND (r.user_a = auth.uid() OR r.user_b = auth.uid()))
);
CREATE POLICY "members send msgs" ON public.relaxa_messages FOR INSERT WITH CHECK (
  auth.uid() = sender_id AND
  EXISTS (SELECT 1 FROM public.relaxa_rooms r WHERE r.id = room_id AND r.active AND (r.user_a = auth.uid() OR r.user_b = auth.uid()))
);

-- MATCHMAKING
CREATE OR REPLACE FUNCTION public.relaxa_join()
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _self uuid := auth.uid(); _partner uuid; _room uuid;
BEGIN
  IF _self IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  -- Clean self from queue
  DELETE FROM public.relaxa_waiting WHERE user_id = _self;
  -- Look for a partner
  SELECT user_id INTO _partner FROM public.relaxa_waiting
    WHERE user_id <> _self ORDER BY created_at LIMIT 1 FOR UPDATE SKIP LOCKED;
  IF _partner IS NOT NULL THEN
    DELETE FROM public.relaxa_waiting WHERE user_id = _partner;
    INSERT INTO public.relaxa_rooms (user_a, user_b) VALUES (_partner, _self) RETURNING id INTO _room;
    RETURN _room;
  ELSE
    INSERT INTO public.relaxa_waiting (user_id) VALUES (_self) ON CONFLICT DO NOTHING;
    RETURN NULL;
  END IF;
END; $$;

CREATE OR REPLACE FUNCTION public.relaxa_leave(_room uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM public.relaxa_waiting WHERE user_id = auth.uid();
  IF _room IS NOT NULL THEN
    UPDATE public.relaxa_rooms SET active = false, ended_at = now()
      WHERE id = _room AND (user_a = auth.uid() OR user_b = auth.uid());
  END IF;
END; $$;

GRANT EXECUTE ON FUNCTION public.relaxa_join() TO authenticated;
GRANT EXECUTE ON FUNCTION public.relaxa_leave(uuid) TO authenticated;

-- REALTIME
ALTER PUBLICATION supabase_realtime ADD TABLE public.relaxa_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.relaxa_messages;
ALTER TABLE public.relaxa_messages REPLICA IDENTITY FULL;
ALTER TABLE public.relaxa_rooms REPLICA IDENTITY FULL;
