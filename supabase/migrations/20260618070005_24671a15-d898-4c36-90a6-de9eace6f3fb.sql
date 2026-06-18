
-- 1. Add optional social/website links to listings
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS whatsapp_channel text,
  ADD COLUMN IF NOT EXISTS tiktok text,
  ADD COLUMN IF NOT EXISTS instagram text,
  ADD COLUMN IF NOT EXISTS facebook text,
  ADD COLUMN IF NOT EXISTS website text;

-- 2. Receipt payment time on fund requests (for 2-hour validity window)
ALTER TABLE public.fund_requests
  ADD COLUMN IF NOT EXISTS payment_datetime timestamptz;

-- 3. Profile contact tracking (verified reviews)
CREATE TABLE IF NOT EXISTS public.profile_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, listing_id)
);

GRANT SELECT, INSERT ON public.profile_contacts TO authenticated;
GRANT ALL ON public.profile_contacts TO service_role;

ALTER TABLE public.profile_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own contacts"
  ON public.profile_contacts FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_owner(auth.uid()));

CREATE POLICY "Users can record their own contacts"
  ON public.profile_contacts FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 4. Update refund function: 100% refund within first 12 hours of activation
CREATE OR REPLACE FUNCTION public.delete_listing_with_refund(_listing_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _l record;
  _age_hours numeric;
  _age_days numeric;
  _pct numeric;
  _refund integer;
BEGIN
  SELECT * INTO _l FROM public.listings WHERE id = _listing_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Not found'; END IF;
  IF _l.user_id <> auth.uid() AND NOT public.is_owner(auth.uid()) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  _age_hours := EXTRACT(EPOCH FROM (now() - COALESCE(_l.last_paid_at, _l.created_at))) / 3600.0;
  _age_days := _age_hours / 24.0;
  _pct := CASE
    WHEN _age_hours <= 12 THEN 1.0
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
END $function$;
