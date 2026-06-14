
CREATE POLICY "relaxa media upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'relaxa-media' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "relaxa media read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'relaxa-media');
