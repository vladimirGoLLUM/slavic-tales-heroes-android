
CREATE POLICY "Users can delete own battle history"
  ON public.arena_battle_history FOR DELETE
  TO authenticated
  USING (auth.uid() = attacker_id);
