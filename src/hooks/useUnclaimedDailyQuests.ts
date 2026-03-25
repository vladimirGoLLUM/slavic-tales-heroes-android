import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { DAILY_QUESTS, getTodayDateKey } from '@/data/dailyQuestsData';

/**
 * Returns the count of daily quests that are completed but not yet claimed.
 */
export function useUnclaimedDailyQuests(): number {
  const { user } = useAuth();
  const [data, setData] = useState<Record<string, { progress: number; claimed: boolean }>>({});

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const load = async () => {
      const today = getTodayDateKey();
      const { data: rows } = await supabase
        .from('daily_quests')
        .select('quest_key, progress, claimed')
        .eq('user_id', user.id)
        .eq('quest_date', today);

      if (cancelled) return;
      const map: Record<string, { progress: number; claimed: boolean }> = {};
      rows?.forEach(r => { map[r.quest_key] = { progress: r.progress, claimed: r.claimed }; });
      setData(map);
    };

    load();
    const interval = setInterval(load, 30000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [user]);

  return useMemo(() => {
    let count = 0;
    for (const q of DAILY_QUESTS) {
      const row = data[q.key];
      if (row && row.progress >= q.target && !row.claimed) count++;
    }
    return count;
  }, [data]);
}
