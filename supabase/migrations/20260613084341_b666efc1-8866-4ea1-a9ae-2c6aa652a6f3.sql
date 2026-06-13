
-- listing-images: public read, owner write under {user_id}/
create policy "Listing images are readable"
  on storage.objects for select using (bucket_id = 'listing-images');
create policy "Users upload own listing images"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'listing-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Users update own listing images"
  on storage.objects for update to authenticated
  using (bucket_id = 'listing-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Users delete own listing images"
  on storage.objects for delete to authenticated
  using (bucket_id = 'listing-images' and (storage.foldername(name))[1] = auth.uid()::text);

-- fund-screenshots: private to owner
create policy "Users read own fund screenshots"
  on storage.objects for select to authenticated
  using (bucket_id = 'fund-screenshots' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Users upload own fund screenshots"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'fund-screenshots' and (storage.foldername(name))[1] = auth.uid()::text);
