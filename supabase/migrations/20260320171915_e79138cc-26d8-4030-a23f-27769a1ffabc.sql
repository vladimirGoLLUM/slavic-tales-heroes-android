CREATE TABLE public.arena_battle_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attacker_id uuid NOT NULL,
  defender_id uuid,
  attacker_name text NOT NULL DEFAULT '',
  defender_name text NOT NULL DEFAULT '',
  attacker_rating integer NOT NULL DEFAULT 0,
  defender_rating integer NOT NULL DEFAULT 0,
  rating_change integer NOT NULL DEFAULT 0,
  result text NOT NULL DEFAULT 'win',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.arena_battle_history ENABLE ROW LEVEL SECURITY;

-- Anyone can see battles involving them (attacker or defender)
CREATE POLICY "Users can see own battles"
  ON public.arena_battle_history
  FOR SELECT
  TO authenticated
  USING (auth.uid() = attacker_id OR auth.uid() = defender_id);

-- Users can insert their own battles
CREATE POLICY "Users can insert own battles"
  ON public.arena_battle_history
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = attacker_id);

CREATE INDEX idx_arena_history_attacker ON public.arena_battle_history(attacker_id, created_at DESC);
CREATE INDEX idx_arena_history_defender ON public.arena_battle_history(defender_id, created_at DESC);