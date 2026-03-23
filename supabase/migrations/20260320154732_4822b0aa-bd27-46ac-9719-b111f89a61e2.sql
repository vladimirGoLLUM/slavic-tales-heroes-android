CREATE POLICY "Users can delete own damage"
ON public.world_boss_damage
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);