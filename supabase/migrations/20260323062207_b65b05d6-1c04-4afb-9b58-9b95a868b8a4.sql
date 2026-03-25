
CREATE POLICY "Users can delete own achievements"
  ON public.achievements FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own daily quests"
  ON public.daily_quests FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
