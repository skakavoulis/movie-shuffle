-- Re-apply table grants (idempotent) for projects that created `likes` before grant
-- migrations were applied, or where migration history diverged.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.likes TO authenticated;

-- upsert() uses ON CONFLICT DO UPDATE; without this policy updates are rejected by RLS.
DROP POLICY IF EXISTS "Users can update own likes" ON public.likes;
CREATE POLICY "Users can update own likes"
  ON public.likes
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
