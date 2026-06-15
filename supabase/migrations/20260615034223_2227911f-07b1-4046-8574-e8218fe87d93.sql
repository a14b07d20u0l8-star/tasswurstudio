-- Track payments for refund calc + pinning + soft-delete
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS total_paid integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pinned boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_paid_at timestamptz;

-- Banned users
CREATE TABLE IF NOT EXISTS public.banned_users (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text,
  banned_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.banned_users TO authenticated;
GRANT ALL ON public.banned_users TO service_role;
ALTER TABLE public.banned_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "owner manages bans" ON public.banned_users;
CREATE POLICY "owner manages bans" ON public.banned_users
  FOR ALL TO authenticated USING (public.is_owner(auth.uid())) WITH CHECK (public.is_owner(auth.uid()));
DROP POLICY IF EXISTS "user reads own ban" ON public.banned_users;
CREATE POLICY "user reads own ban" ON public.banned_users
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_owner(auth.uid()));

-- One review per (user, listing) and stars constraint: 1-5, owner up to 7
ALTER TABLE public.ratings DROP CONSTRAINT IF EXISTS ratings_user_listing_unique;
DELETE FROM public.ratings r WHERE r.id IN (
  SELECT id FROM (
    SELECT id, row_number() OVER (PARTITION BY user_id, listing_id ORDER BY created_at) rn FROM public.ratings
  ) s WHERE rn > 1
);
ALTER TABLE public.ratings ADD CONSTRAINT ratings_user_listing_unique UNIQUE (user_id, listing_id);

CREATE OR REPLACE FUNCTION public.validate_rating_stars()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.stars < 1 THEN RAISE EXCEPTION 'stars must be at least 1'; END IF;
  IF NEW.stars > 7 THEN RAISE EXCEPTION 'stars cannot exceed 7'; END IF;
  IF NEW.stars > 5 AND NOT public.is_owner(NEW.user_id) THEN
    RAISE EXCEPTION 'Only the owner can give more than 5 stars';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS validate_rating_stars_trg ON public.ratings;
CREATE TRIGGER validate_rating_stars_trg BEFORE INSERT OR UPDATE ON public.ratings
  FOR EACH ROW EXECUTE FUNCTION public.validate_rating_stars();

-- Allow owner to update/delete/pin any listing
DROP POLICY IF EXISTS "owner manages listings" ON public.listings;
CREATE POLICY "owner manages listings" ON public.listings
  FOR ALL TO authenticated USING (public.is_owner(auth.uid())) WITH CHECK (public.is_owner(auth.uid()));

-- Refund function: returns ms remaining etc. and processes deletion
CREATE OR REPLACE FUNCTION public.delete_listing_with_refund(_listing_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _l record;
  _age_days numeric;
  _pct numeric;
  _refund integer;
BEGIN
  SELECT * INTO _l FROM public.listings WHERE id = _listing_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Not found'; END IF;
  IF _l.user_id <> auth.uid() AND NOT public.is_owner(auth.uid()) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  _age_days := EXTRACT(EPOCH FROM (now() - COALESCE(_l.last_paid_at, _l.created_at))) / 86400.0;
  _pct := CASE
    WHEN _age_days <= 3 THEN 0.8
    WHEN _age_days <= 15 THEN 0.5
    WHEN _age_days <= 25 THEN 0.2
    ELSE 0
  END;
  _refund := floor(COALESCE(_l.total_paid, 0) * _pct)::int;
  IF _refund > 0 THEN
    UPDATE public.profiles SET tokens = COALESCE(tokens, 0) + _refund WHERE id = _l.user_id;
  END IF;
  DELETE FROM public.listings WHERE id = _listing_id;
  RETURN _refund;
END $$;
REVOKE EXECUTE ON FUNCTION public.delete_listing_with_refund(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_listing_with_refund(uuid) TO authenticated;