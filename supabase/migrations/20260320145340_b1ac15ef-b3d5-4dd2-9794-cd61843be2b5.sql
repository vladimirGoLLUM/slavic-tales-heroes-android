
-- World Boss daily damage leaderboard
CREATE TABLE public.world_boss_damage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  boss_id TEXT NOT NULL DEFAULT 'hydra',
  damage_today BIGINT NOT NULL DEFAULT 0,
  damage_total BIGINT NOT NULL DEFAULT 0,
  attacks_used INTEGER NOT NULL DEFAULT 0,
  last_attack_date TEXT NOT NULL DEFAULT '',
  rewards_claimed BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, boss_id)
);

ALTER TABLE public.world_boss_damage ENABLE ROW LEVEL SECURITY;

-- Users can see all entries (for leaderboard)
CREATE POLICY "Anyone can view world boss leaderboard"
  ON public.world_boss_damage
  FOR SELECT
  TO authenticated
  USING (true);

-- Users can insert their own
CREATE POLICY "Users can insert own damage"
  ON public.world_boss_damage
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own
CREATE POLICY "Users can update own damage"
  ON public.world_boss_damage
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.world_boss_damage;
