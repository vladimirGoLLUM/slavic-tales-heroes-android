import { supabase } from '@/integrations/supabase/client';
import { getTodayDateKey } from '@/data/dailyQuestsData';

/**
 * Increment daily quest progress by a given amount.
 * Safe to call from anywhere — silently fails if user not logged in.
 */
export async function incrementDailyQuest(questKey: string, amount: number = 1) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const today = getTodayDateKey();

  // Try upsert
  const { data: existing } = await supabase
    .from('daily_quests')
    .select('id, progress')
    .eq('user_id', user.id)
    .eq('quest_key', questKey)
    .eq('quest_date', today)
    .maybeSingle();

  if (existing) {
    await supabase
      .from('daily_quests')
      .update({ progress: existing.progress + amount })
      .eq('id', existing.id);
  } else {
    await supabase
      .from('daily_quests')
      .insert({ user_id: user.id, quest_key: questKey, progress: amount, quest_date: today });
  }
}
