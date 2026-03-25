import { useState, useEffect, useMemo } from 'react';
import { useGame } from '@/context/GameContext';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { ACHIEVEMENTS } from '@/data/achievementsData';

/**
 * Returns the count of achievements that are completed but not yet claimed.
 */
export function useUnclaimedAchievements(): number {
  const { user } = useAuth();
  const { player, campaignProgress, arenaState } = useGame();
  const [dbData, setDbData] = useState<Record<string, { progress: number; claimed: boolean }>>({});
  const [dbWins, setDbWins] = useState(0);
  const [dbBossAttacks, setDbBossAttacks] = useState(0);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const load = async () => {
      const [{ data: rows }, { count: wins }, { count: attacks }] = await Promise.all([
        supabase.from('achievements').select('achievement_key, progress, claimed').eq('user_id', user.id),
        supabase.from('arena_battle_history').select('*', { count: 'exact', head: true }).eq('attacker_id', user.id).eq('result', 'win'),
        supabase.from('world_boss_damage').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
      ]);
      if (cancelled) return;
      const map: Record<string, { progress: number; claimed: boolean }> = {};
      rows?.forEach(r => { map[r.achievement_key] = { progress: r.progress, claimed: r.claimed }; });
      setDbData(map);
      setDbWins(wins ?? 0);
      setDbBossAttacks(attacks ?? 0);
    };

    load();
    // Refresh every 30s
    const interval = setInterval(load, 30000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [user]);

  const progress = useMemo(() => {
    const p: Record<string, number> = {};
    p['arena_wins'] = dbWins;
    p['arena_streak'] = arenaState.arenaWinStreak ?? 0;
    p['arena_rating'] = arenaState.arenaRating;

    let totalStages = 0, total3Stars = 0, completedChapters = 0;
    for (const diff of Object.keys(campaignProgress)) {
      for (const ch of Object.keys(campaignProgress[diff])) {
        const chData = campaignProgress[diff][Number(ch)];
        if (chData) {
          totalStages += chData.highestStage;
          const starValues = Object.values(chData.stars);
          total3Stars += starValues.filter(s => s >= 3).length;
          if (chData.highestStage >= 10) completedChapters++;
        }
      }
    }
    p['campaign_stages'] = totalStages;
    p['campaign_3star'] = total3Stars;
    p['campaign_chapters'] = completedChapters;

    const uniqueHeroes = new Set(player.champions.map(c => c.champion.id));
    p['heroes_collected'] = uniqueHeroes.size;
    p['heroes_max_level'] = player.champions.filter(c => c.level >= 50).length;
    p['heroes_5star'] = player.champions.filter(c => (c.stars ?? 0) >= 5).length;
    p['heroes_red_star'] = player.champions.filter(c => (c.redStars ?? 0) >= 1).length;
    p['artifacts_total'] = player.artifacts.length;
    p['artifacts_upgraded'] = player.artifacts.filter(a => a.level >= 20).length;
    p['artifacts_legendary'] = player.artifacts.filter(a => a.rarity === 'Калиновый' || a.rarity === 'Самоцветный').length;
    p['boss_attacks'] = dbBossAttacks;

    const towerUpgrades = player.towerUpgrades ?? {};
    let towerCount = 0, towerTotalLevel = 0;
    for (const val of Object.values(towerUpgrades)) {
      const lvl = typeof val === 'number' ? val : 0;
      if (lvl > 0) towerCount++;
      towerTotalLevel += lvl;
    }
    p['tower_upgrades'] = towerCount;
    p['tower_level_total'] = towerTotalLevel;

    return p;
  }, [player, campaignProgress, arenaState, dbWins, dbBossAttacks]);

  return useMemo(() => {
    let count = 0;
    for (const ach of ACHIEVEMENTS) {
      const current = progress[ach.key] ?? 0;
      const row = dbData[ach.key];
      const claimedTier = row?.claimed ? (row.progress ?? 0) : 0;

      for (let i = 0; i < ach.tiers.length; i++) {
        const tier = ach.tiers[i];
        const tierIndex = i + 1;
        if (current >= tier.target && tierIndex > claimedTier) {
          count++;
          break; // one unclaimed per achievement is enough
        }
      }
    }
    return count;
  }, [progress, dbData]);
}
