import { useState, useEffect, useMemo, useCallback } from 'react';
import DragScroll from '@/components/ui/DragScroll';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '@/context/GameContext';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  ACHIEVEMENTS, ACHIEVEMENT_CATEGORIES,
  type AchievementDef, type AchievementCategory,
} from '@/data/achievementsData';
import { generateArtifact } from '@/data/artifacts';
import { toast } from 'sonner';

interface AchievementRow {
  achievement_key: string;
  progress: number;
  claimed: boolean;
}

/** Compute current progress values from game state */
function useAchievementProgress() {
  const { player, campaignProgress, arenaState } = useGame();

  return useMemo(() => {
    const p: Record<string, number> = {};

    // Arena
    // We track arena wins as the sum of wins in battle history — but since we don't store a counter locally,
    // we approximate from rating (each win = +10 rating, so total wins ≈ accumulated rating adjustments)
    // For now, store zero — will be updated from DB battle history count
    p['arena_wins'] = 0; // populated from DB
    p['arena_streak'] = arenaState.arenaWinStreak ?? 0;
    p['arena_rating'] = arenaState.arenaRating;

    // Campaign: count completed stages across all difficulties
    let totalStages = 0;
    let total3Stars = 0;
    let completedChapters = 0;
    for (const diff of Object.keys(campaignProgress)) {
      for (const ch of Object.keys(campaignProgress[diff])) {
        const chData = campaignProgress[diff][Number(ch)];
        if (chData) {
          totalStages += chData.highestStage;
          const starValues = Object.values(chData.stars);
          total3Stars += starValues.filter(s => s >= 3).length;
          // A chapter is "complete" if highestStage >= 10 (STAGES_PER_CHAPTER)
          if (chData.highestStage >= 10) completedChapters++;
        }
      }
    }
    p['campaign_stages'] = totalStages;
    p['campaign_3star'] = total3Stars;
    p['campaign_chapters'] = completedChapters;

    // Heroes
    const uniqueHeroes = new Set(player.champions.map(c => c.champion.id));
    p['heroes_collected'] = uniqueHeroes.size;
    p['heroes_max_level'] = player.champions.filter(c => c.level >= 50).length;
    p['heroes_5star'] = player.champions.filter(c => (c.stars ?? 0) >= 5).length;
    p['heroes_red_star'] = player.champions.filter(c => (c.redStars ?? 0) >= 1).length;

    // Collection
    p['summon_total'] = 0; // populated from stats
    p['runes_earned'] = 0;
    p['souls_earned'] = 0;

    // Bosses
    p['boss_hydra_damage'] = player.worldBossDamageToday ?? 0;
    p['boss_cerberus_damage'] = player.cerberusDamageToday ?? 0;
    p['boss_attacks'] = 0;

    // Artifacts
    p['artifacts_total'] = player.artifacts.length;
    p['artifacts_upgraded'] = player.artifacts.filter(a => a.level >= 20).length;
    p['artifacts_legendary'] = player.artifacts.filter(a => a.rarity === 'Калиновый' || a.rarity === 'Самоцветный').length;

    // Forge
    p['forge_crafted'] = 0;
    p['artifacts_sold'] = 0;

    // Tower
    const towerUpgrades = player.towerUpgrades ?? {};
    let towerCount = 0;
    let towerTotalLevel = 0;
    for (const val of Object.values(towerUpgrades)) {
      const lvl = typeof val === 'number' ? val : 0;
      if (lvl > 0) towerCount++;
      towerTotalLevel += lvl;
    }
    p['tower_upgrades'] = towerCount;
    p['tower_level_total'] = towerTotalLevel;

    return p;
  }, [player, campaignProgress, arenaState]);
}

export default function AchievementsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addSouls, addRunes, addArtifacts } = useGame();

  const progress = useAchievementProgress();
  const [dbData, setDbData] = useState<Record<string, AchievementRow>>({});
  const [dbWins, setDbWins] = useState(0);
  const [dbBossAttacks, setDbBossAttacks] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedCat, setSelectedCat] = useState<AchievementCategory>('arena');
  const [claimingKey, setClaimingKey] = useState<string | null>(null);

  // Load achievement rows & arena wins count from DB
  useEffect(() => {
    if (!user) return;
    setLoading(true);

    const loadAll = async () => {
      // Achievement rows
      const { data: rows } = await supabase
        .from('achievements')
        .select('achievement_key, progress, claimed')
        .eq('user_id', user.id);

      const map: Record<string, AchievementRow> = {};
      (rows ?? []).forEach(r => { map[r.achievement_key] = r as AchievementRow; });
      setDbData(map);

      // Arena wins count
      const { count: winsCount } = await supabase
        .from('arena_battle_history')
        .select('id', { count: 'exact', head: true })
        .eq('attacker_id', user.id)
        .eq('result', 'win');
      setDbWins(winsCount ?? 0);

      // Boss attacks count
      const { data: bossData } = await supabase
        .from('world_boss_damage')
        .select('attacks_used')
        .eq('user_id', user.id);
      const totalBossAttacks = (bossData ?? []).reduce((s, r) => s + (r.attacks_used ?? 0), 0);
      setDbBossAttacks(totalBossAttacks);

      setLoading(false);
    };
    loadAll();
  }, [user]);

  // Merge local progress with DB-sourced counters
  const mergedProgress = useMemo(() => {
    const m = { ...progress };
    m['arena_wins'] = dbWins;
    m['boss_attacks'] = dbBossAttacks;
    return m;
  }, [progress, dbWins, dbBossAttacks]);

  // Get effective claimed tier for an achievement (-1 = none claimed)
  const getClaimedTier = useCallback((key: string): number => {
    const row = dbData[key];
    if (!row || !row.claimed) return -1;
    return row.progress; // we store the claimed tier index in progress
  }, [dbData]);

  // Claim an achievement tier
  const claimAchievement = useCallback(async (achievement: AchievementDef, tierIndex: number) => {
    if (!user || claimingKey) return;
    setClaimingKey(achievement.key);

    const tier = achievement.tiers[tierIndex];
    
    // Save to DB
    const existing = dbData[achievement.key];
    if (existing) {
      await supabase
        .from('achievements')
        .update({
          progress: tierIndex,
          claimed: true,
          claimed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as any)
        .eq('user_id', user.id)
        .eq('achievement_key', achievement.key);
    } else {
      await supabase
        .from('achievements')
        .insert({
          user_id: user.id,
          achievement_key: achievement.key,
          progress: tierIndex,
          claimed: true,
          claimed_at: new Date().toISOString(),
        } as any);
    }

    // Give rewards
    addSouls(tier.souls);
    addRunes(tier.runes);
    if (tier.artifactRarity && tier.artifactCount) {
      const arts = [];
      for (let i = 0; i < tier.artifactCount; i++) {
        arts.push(generateArtifact(tier.artifactRarity));
      }
      addArtifacts(arts);
    }

    // Update local state
    setDbData(prev => ({
      ...prev,
      [achievement.key]: { achievement_key: achievement.key, progress: tierIndex, claimed: true },
    }));

    const rewardParts = [`+${tier.souls} душ`, `+${tier.runes} рун`];
    if (tier.artifactCount) rewardParts.push(`+${tier.artifactCount} артефакт(ов)`);
    toast.success(`🏆 ${achievement.name}: ${rewardParts.join(', ')}`);
    setClaimingKey(null);
  }, [user, dbData, claimingKey, addSouls, addRunes, addArtifacts]);

  // Filter achievements by category
  const filteredAchievements = useMemo(() =>
    ACHIEVEMENTS.filter(a => a.category === selectedCat),
    [selectedCat]
  );

  // Count total claimable
  const totalClaimable = useMemo(() => {
    let count = 0;
    for (const ach of ACHIEVEMENTS) {
      const claimed = getClaimedTier(ach.key);
      const prog = mergedProgress[ach.key] ?? 0;
      for (let i = 0; i < ach.tiers.length; i++) {
        if (i > claimed && prog >= ach.tiers[i].target) count++;
      }
    }
    return count;
  }, [mergedProgress, getClaimedTier]);

  return (
    <div className="min-h-screen bg-background pb-32 pt-4 px-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => navigate(-1)}
            className="text-muted-foreground hover:text-foreground text-xl min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            ←
          </button>
          <img src="/ui/icon_achievements.png" alt="" className="w-8 h-8 object-contain" />
          <h1 className="font-kelly text-2xl text-foreground">Свитки Славы</h1>
          {totalClaimable > 0 && (
            <span className="bg-accent text-accent-foreground text-xs font-kelly px-2 py-0.5 rounded-full">
              {totalClaimable}
            </span>
          )}
        </div>

        {/* Category tabs */}
        <DragScroll className="flex gap-1.5 mb-4 pb-1 items-center">
          {ACHIEVEMENT_CATEGORIES.map(cat => {
            const catCount = ACHIEVEMENTS.filter(a => a.category === cat.id).reduce((cnt, ach) => {
              const claimed = getClaimedTier(ach.key);
              const prog = mergedProgress[ach.key] ?? 0;
              for (let i = 0; i < ach.tiers.length; i++) {
                if (i > claimed && prog >= ach.tiers[i].target) cnt++;
              }
              return cnt;
            }, 0);

            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCat(cat.id)}
                className={`flex items-center gap-1 px-3 py-2 rounded-xl font-kelly text-xs whitespace-nowrap transition-all min-h-[36px] ${
                  selectedCat === cat.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-surface/60 text-muted-foreground hover:bg-surface/80 border border-border/30'
                }`}
              >
                <img src={cat.icon} alt={cat.label} className="w-5 h-5 object-contain" />
                <span>{cat.label}</span>
                {catCount > 0 && (
                  <span className="bg-accent text-accent-foreground text-[9px] px-1.5 py-0.5 rounded-full leading-none">
                    {catCount}
                  </span>
                )}
              </button>
            );
          })}
        </DragScroll>

        {loading ? (
          <div className="text-center text-muted-foreground py-12 font-kelly">Загрузка достижений...</div>
        ) : (
          <div className="space-y-3">
            {filteredAchievements.map((ach, ai) => {
              const prog = mergedProgress[ach.key] ?? 0;
              const claimedTier = getClaimedTier(ach.key);

              // Find the next tier to show progress toward
              let displayTierIdx = 0;
              for (let i = 0; i < ach.tiers.length; i++) {
                if (i <= claimedTier) continue;
                displayTierIdx = i;
                break;
              }
              if (claimedTier >= ach.tiers.length - 1) {
                displayTierIdx = ach.tiers.length - 1; // all done
              }

              const displayTier = ach.tiers[displayTierIdx];
              const allClaimed = claimedTier >= ach.tiers.length - 1;
              const canClaim = !allClaimed && prog >= displayTier.target && displayTierIdx > claimedTier;
              const progressPct = allClaimed ? 100 : Math.min(100, (prog / displayTier.target) * 100);

              return (
                <motion.div
                  key={ach.key}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: ai * 0.03 }}
                  className={`bg-surface/70 backdrop-blur-sm rounded-xl p-3 card-lubok border transition-all ${
                    canClaim
                      ? 'border-accent/50 shadow-[0_0_12px_hsl(var(--accent)/0.15)]'
                      : allClaimed
                        ? 'border-primary/30 opacity-70'
                        : 'border-border/40'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      allClaimed ? 'bg-primary/20' : canClaim ? 'bg-accent/20' : 'bg-muted/20'
                    }`}>
                      <img src={ach.icon} alt={ach.name} className="w-7 h-7 object-contain" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-kelly text-sm text-foreground">{ach.name}</span>
                        {allClaimed && <span className="text-primary text-xs">✅</span>}
                      </div>
                      <p className="text-[10px] text-muted-foreground mb-1.5">
                        {ach.description}: {displayTier.target.toLocaleString()}
                      </p>

                      {/* Progress bar */}
                      <div className="w-full h-1.5 bg-muted/30 rounded-full overflow-hidden mb-1">
                        <motion.div
                          className="h-full rounded-full"
                          style={{
                            background: allClaimed
                              ? 'hsl(var(--primary))'
                              : canClaim
                                ? 'hsl(var(--accent))'
                                : 'linear-gradient(90deg, hsl(var(--primary)/0.6), hsl(var(--primary)))',
                          }}
                          animate={{ width: `${progressPct}%` }}
                          transition={{ duration: 0.5 }}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground">
                          {prog.toLocaleString()} / {displayTier.target.toLocaleString()}
                        </span>
                        {/* Tier dots */}
                        <div className="flex gap-0.5">
                          {ach.tiers.map((_, ti) => (
                            <div
                              key={ti}
                              className={`w-1.5 h-1.5 rounded-full ${
                                ti <= claimedTier
                                  ? 'bg-primary'
                                  : ti === displayTierIdx && canClaim
                                    ? 'bg-accent'
                                    : 'bg-muted/40'
                              }`}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Rewards preview */}
                      <div className="flex items-center gap-2 mt-1.5 text-[9px] text-muted-foreground">
                        <span>🔮 {displayTier.souls} душ</span>
                        <span>💰 {displayTier.runes} рун</span>
                        {displayTier.artifactCount && (
                          <span>🎁 {displayTier.artifactCount}× {displayTier.artifactRarity}</span>
                        )}
                      </div>
                    </div>

                    {/* Claim button */}
                    {canClaim && (
                      <button
                        onClick={() => claimAchievement(ach, displayTierIdx)}
                        disabled={claimingKey === ach.key}
                        className="px-3 py-2 bg-accent hover:bg-accent/90 text-accent-foreground rounded-lg font-kelly text-xs transition-all hover:scale-105 active:scale-95 min-h-[36px] flex-shrink-0"
                      >
                        {claimingKey === ach.key ? '...' : 'Забрать'}
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
