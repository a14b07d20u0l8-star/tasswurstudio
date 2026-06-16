
CREATE POLICY "support topic insert: owner or ticket user"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  (realtime.topic() LIKE 'support-ticket-%')
  AND (
    public.is_owner(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.support_tickets st
      WHERE st.id::text = regexp_replace(realtime.topic(), '^support-ticket-', '')
        AND st.user_id = auth.uid()
    )
  )
);
