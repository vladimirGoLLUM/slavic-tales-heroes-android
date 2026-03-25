CREATE TABLE public.achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  achievement_key text NOT NULL,
  progress integer NOT NULL DEFAULT 0,
  claimed boolean NOT NULL DEFAULT false,
  claimed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, achievement_key)
);

ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own achievements"
ON public.achievements FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own achievements"
ON public.achievements FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own achievements"
ON public.achievements FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);