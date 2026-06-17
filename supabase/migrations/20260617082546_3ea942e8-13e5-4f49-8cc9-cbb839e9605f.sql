
ALTER TABLE public.fund_requests ADD COLUMN IF NOT EXISTS transaction_id text;

CREATE OR REPLACE FUNCTION public.owner_grant_owner_by_email(_email text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _target uuid;
BEGIN
  IF NOT public.is_owner(auth.uid()) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  SELECT id INTO _target FROM public.profiles WHERE lower(email) = lower(_email) LIMIT 1;
  IF _target IS NULL THEN RAISE EXCEPTION 'No user with that email'; END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (_target, 'owner')
    ON CONFLICT (user_id, role) DO NOTHING;
  RETURN _target;
END $$;

CREATE OR REPLACE FUNCTION public.owner_revoke_owner_by_email(_email text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _target uuid;
BEGIN
  IF NOT public.is_owner(auth.uid()) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF lower(_email) = 'a14b07d20u0l8@gmail.com' THEN
    RAISE EXCEPTION 'The primary owner cannot be revoked';
  END IF;
  SELECT id INTO _target FROM public.profiles WHERE lower(email) = lower(_email) LIMIT 1;
  IF _target IS NULL THEN RAISE EXCEPTION 'No user with that email'; END IF;
  DELETE FROM public.user_roles WHERE user_id = _target AND role = 'owner';
  RETURN _target;
END $$;

CREATE OR REPLACE FUNCTION public.owner_list_owners()
RETURNS TABLE(id uuid, username text, email text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_owner(auth.uid()) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  RETURN QUERY
    SELECT p.id, p.username, p.email FROM public.profiles p
    JOIN public.user_roles r ON r.user_id = p.id
    WHERE r.role = 'owner'
    ORDER BY p.email;
END $$;

GRANT EXECUTE ON FUNCTION public.owner_grant_owner_by_email(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.owner_revoke_owner_by_email(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.owner_list_owners() TO authenticated;
