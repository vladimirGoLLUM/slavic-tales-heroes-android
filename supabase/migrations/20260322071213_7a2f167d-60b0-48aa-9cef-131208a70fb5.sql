CREATE TABLE public.daily_quests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quest_key text NOT NULL,
  progress integer NOT NULL DEFAULT 0,
  claimed boolean NOT NULL DEFAULT false,
  quest_date text NOT NULL DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD'),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, quest_key, quest_date)
);

ALTER TABLE public.daily_quests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own daily quests" ON public.daily_quests
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own daily quests" ON public.daily_quests
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own daily quests" ON public.daily_quests
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);