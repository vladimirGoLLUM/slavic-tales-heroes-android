ALTER TABLE public.arena_battle_history
  ADD COLUMN attacker_squad jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN defender_squad jsonb DEFAULT '[]'::jsonb;