
CREATE OR REPLACE FUNCTION public.owner_find_user_by_email(_email text)
RETURNS TABLE(id uuid, username text, email text, tokens integer)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_owner(auth.uid()) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  RETURN QUERY
    SELECT p.id, p.username, p.email, COALESCE(p.tokens, 0)::int AS tokens
    FROM public.profiles p
    WHERE lower(p.email) = lower(_email)
    LIMIT 1;
END $$;

CREATE OR REPLACE FUNCTION public.owner_transfer_tokens(_recipient_email text, _amount integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _owner uuid := auth.uid();
  _recipient uuid;
  _owner_tokens integer;
  _new_balance integer;
BEGIN
  IF NOT public.is_owner(_owner) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  IF _amount IS NULL OR _amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be greater than zero';
  END IF;

  SELECT id INTO _recipient FROM public.profiles
    WHERE lower(email) = lower(_recipient_email) LIMIT 1;
  IF _recipient IS NULL THEN
    RAISE EXCEPTION 'No user found with that email';
  END IF;
  IF _recipient = _owner THEN
    RAISE EXCEPTION 'Cannot transfer to yourself';
  END IF;

  SELECT COALESCE(tokens, 0) INTO _owner_tokens FROM public.profiles WHERE id = _owner FOR UPDATE;
  IF _owner_tokens < _amount THEN
    RAISE EXCEPTION 'Insufficient tokens (you have % AT)', _owner_tokens;
  END IF;

  UPDATE public.profiles SET tokens = COALESCE(tokens, 0) - _amount WHERE id = _owner;
  UPDATE public.profiles SET tokens = COALESCE(tokens, 0) + _amount
    WHERE id = _recipient RETURNING tokens INTO _new_balance;

  RETURN _new_balance;
END $$;

GRANT EXECUTE ON FUNCTION public.owner_find_user_by_email(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.owner_transfer_tokens(text, integer) TO authenticated;
