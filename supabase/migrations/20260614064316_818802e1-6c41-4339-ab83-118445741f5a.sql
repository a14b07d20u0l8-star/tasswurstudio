
-- 1) profiles: lock to own row + public-safe view
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Users see own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);

CREATE OR REPLACE VIEW public.profiles_public WITH (security_invoker=on) AS
  SELECT id, username, full_name, avatar_url, instagram_url, youtube_url, facebook_url, created_at
  FROM public.profiles;
GRANT SELECT ON public.profiles_public TO anon, authenticated;

-- Username -> email lookup for login (kept minimal, no other column exposure)
CREATE OR REPLACE FUNCTION public.get_email_by_username(_username text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email FROM public.profiles WHERE username = _username LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.get_email_by_username(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_email_by_username(text) TO anon, authenticated;

-- 2) listings: require auth to read (hides whatsapp from anonymous enumeration)
DROP POLICY IF EXISTS "Listings are viewable by everyone" ON public.listings;
CREATE POLICY "Listings viewable by authenticated" ON public.listings
  FOR SELECT TO authenticated USING (true);

-- 3) ratings: require auth to read
DROP POLICY IF EXISTS "Ratings viewable by everyone" ON public.ratings;
CREATE POLICY "Ratings viewable by authenticated" ON public.ratings
  FOR SELECT TO authenticated USING (true);

-- 4) Realtime channel authorization for Relaxa
DROP POLICY IF EXISTS "relaxa realtime read" ON realtime.messages;
DROP POLICY IF EXISTS "relaxa realtime write" ON realtime.messages;

CREATE POLICY "relaxa realtime read" ON realtime.messages
  FOR SELECT TO authenticated
  USING (
    CASE
      WHEN realtime.topic() LIKE 'relaxa-wait-%' THEN
        substring(realtime.topic() from length('relaxa-wait-') + 1) = auth.uid()::text
      WHEN realtime.topic() ~ '^relaxa-(msgs|room|presence)-' THEN
        EXISTS (
          SELECT 1 FROM public.relaxa_rooms r
          WHERE r.id::text = regexp_replace(realtime.topic(), '^relaxa-(msgs|room|presence)-', '')
            AND (r.user_a = auth.uid() OR r.user_b = auth.uid())
        )
      ELSE false
    END
  );

CREATE POLICY "relaxa realtime write" ON realtime.messages
  FOR INSERT TO authenticated
  WITH CHECK (
    CASE
      WHEN realtime.topic() LIKE 'relaxa-wait-%' THEN
        substring(realtime.topic() from length('relaxa-wait-') + 1) = auth.uid()::text
      WHEN realtime.topic() ~ '^relaxa-(msgs|room|presence)-' THEN
        EXISTS (
          SELECT 1 FROM public.relaxa_rooms r
          WHERE r.id::text = regexp_replace(realtime.topic(), '^relaxa-(msgs|room|presence)-', '')
            AND (r.user_a = auth.uid() OR r.user_b = auth.uid())
        )
      ELSE false
    END
  );

-- 5) Storage policies
-- listing-images: require auth to read
DROP POLICY IF EXISTS "Listing images are readable" ON storage.objects;
CREATE POLICY "Listing images readable by authenticated" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'listing-images');

-- relaxa-media: restrict reads to owner, add update/delete for owner
DROP POLICY IF EXISTS "relaxa media read" ON storage.objects;
CREATE POLICY "relaxa media read own" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'relaxa-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "relaxa media update own" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'relaxa-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "relaxa media delete own" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'relaxa-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 6) Revoke execute on relaxa rpcs from anon (auth still required by auth.uid() check)
REVOKE EXECUTE ON FUNCTION public.relaxa_join() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.relaxa_leave(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.increment_visitor() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.relaxa_join() TO authenticated;
GRANT EXECUTE ON FUNCTION public.relaxa_leave(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_visitor() TO anon, authenticated;
