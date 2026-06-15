-- Owner role
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('owner', 'admin', 'user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users read own roles" ON public.user_roles;
CREATE POLICY "users read own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_owner(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'owner')
$$;

-- Grant owner role to the specified email
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'owner'::public.app_role FROM auth.users WHERE email = 'a14b07d20u0l8@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Auto-grant owner on signup for that email
CREATE OR REPLACE FUNCTION public.auto_grant_owner()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.email = 'a14b07d20u0l8@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'owner')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS auto_grant_owner_trg ON auth.users;
CREATE TRIGGER auto_grant_owner_trg AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.auto_grant_owner();

-- Support tickets & messages
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'open',
  last_message_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);
GRANT SELECT, INSERT, UPDATE ON public.support_tickets TO authenticated;
GRANT ALL ON public.support_tickets TO service_role;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user reads own ticket" ON public.support_tickets
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_owner(auth.uid()));
CREATE POLICY "user creates own ticket" ON public.support_tickets
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "owner updates tickets" ON public.support_tickets
  FOR UPDATE TO authenticated USING (auth.uid() = user_id OR public.is_owner(auth.uid()));

CREATE TABLE IF NOT EXISTS public.support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.support_messages TO authenticated;
GRANT ALL ON public.support_messages TO service_role;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ticket members read messages" ON public.support_messages
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.support_tickets t WHERE t.id = ticket_id AND (t.user_id = auth.uid() OR public.is_owner(auth.uid())))
  );
CREATE POLICY "ticket members send messages" ON public.support_messages
  FOR INSERT TO authenticated WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (SELECT 1 FROM public.support_tickets t WHERE t.id = ticket_id AND (t.user_id = auth.uid() OR public.is_owner(auth.uid())))
  );

-- Owner presence (heartbeat)
CREATE TABLE IF NOT EXISTS public.owner_presence (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  last_seen_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.owner_presence TO authenticated;
GRANT INSERT, UPDATE ON public.owner_presence TO authenticated;
GRANT ALL ON public.owner_presence TO service_role;
ALTER TABLE public.owner_presence ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone authed reads presence" ON public.owner_presence
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "owner writes own presence" ON public.owner_presence
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND public.is_owner(auth.uid()));
CREATE POLICY "owner updates own presence" ON public.owner_presence
  FOR UPDATE TO authenticated USING (auth.uid() = user_id AND public.is_owner(auth.uid()));

ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;