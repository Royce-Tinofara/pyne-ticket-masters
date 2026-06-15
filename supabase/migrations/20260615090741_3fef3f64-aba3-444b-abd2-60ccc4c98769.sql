
CREATE POLICY "ticket-designs admin write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'ticket-designs' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "ticket-designs admin update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'ticket-designs' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "ticket-designs admin delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'ticket-designs' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "ticket-designs authenticated read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'ticket-designs');
