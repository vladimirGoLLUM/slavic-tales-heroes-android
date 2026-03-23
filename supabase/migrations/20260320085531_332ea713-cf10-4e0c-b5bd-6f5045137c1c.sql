
-- Add arena columns to profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS arena_rating integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS arena_power integer NOT NULL DEFAULT 0;

-- Create a secure leaderboard view (no game_data exposed)
CREATE OR REPLACE VIEW public.arena_leaderboard
WITH (security_invoker = on) AS
SELECT id, username, avatar_url, arena_rating, arena_power
FROM public.profiles
WHERE arena_rating > 0
ORDER BY arena_rating DESC
LIMIT 100;

-- Allow all authenticated users to read other profiles' public arena data
CREATE POLICY "Anyone can read arena leaderboard"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- Drop the old restrictive policy since new one covers it
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
