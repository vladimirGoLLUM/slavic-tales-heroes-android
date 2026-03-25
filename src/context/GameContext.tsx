import React, { createContext, useContext, useState, useCallback, useRef, useEffect, useMemo, type ReactNode } from 'react';
import { calculateRelicBonuses } from '@/data/relics';

import { createInitialPlayerState, CHAMPIONS, SUMMON_RATES, FEED_XP, PITY_THRESHOLDS, PITY_PRIORITY, type PlayerState, type PlayerChampion, type Champion, type Rarity, type PityCounters, type Squad, DEFAULT_SQUADS, RARITY_ORDER, ENERGY_REGEN_INTERVAL, MAX_ENERGY, getEnergyCost, DEFAULT_CHAMPION_SLOTS, SLOTS_EXPANSION_AMOUNT, SLOTS_EXPANSION_COST } from '@/data/gameData';
import { type AbyssProgress, createInitialAbyssProgress } from '@/data/abyssData';
import { type Artifact, type ArtifactSlot, canEquipSlot, levelUpArtifact, getArtifactUpgradeCost, MAX_ARTIFACT_LEVEL, MAX_ARTIFACT_STARS, getArtifactStarUpgradeCost, starUpgradeArtifact, calculateArtifactStats, getArtifactSellPrice, getFurnaceCost, MAX_FURNACE_LEVEL, generateArtifact } from '@/data/artifacts';
import { STAR_MULTIPLIERS, LEVEL_STAT_BONUS_PER_LEVEL, getNextLevelXp, getLevelFromXp, getStarUpgradeCost, MAX_LEVEL, MAX_STARS, RED_STAR_STAT_MULTIPLIERS, getAscensionCost, MAX_RED_STARS, ELEMENT_RUNE_KEY, XP_PER_LEVEL, getMaxLevelForStars } from '@/data/upgradeData';
import { type CampaignProgress, type Difficulty, createInitialCampaignProgress, type ChapterBonusesClaimed, isChapterFullyCompleted, chapterBonusKey, STAGES_PER_CHAPTER, calculateUnitPower } from '@/data/campaignStages';
import { getChapterBonusReward, generateChapterBonusArtifacts } from '@/data/chapterBonuses';
import { type ArenaState, createInitialArenaState, generateArenaOpponents, fetchArenaOpponentsFromDB, computeGodsCoins, getRankFromRating, getRankMilestoneKey, ARENA_WIN_RATING, ARENA_LOSS_RATING, FREE_REFRESHES_PER_DAY, GODS_COIN_MAX, applyWeeklyDecay, DAILY_ARENA_REWARDS, ARENA_WIN_STREAK_THRESHOLD, ARENA_WIN_STREAK_BONUS, ARENA_RANK_MILESTONE_REWARD } from '@/data/arenaData';
import { createInitialTowerUpgrades, type TowerUpgrades, type TowerStat, type TowerCoinTier, TOWER_UPGRADE_TABLE, MAX_TOWER_LEVEL, getAvailableCoins, getTowerBonus, TOWER_ELEMENTS, TOWER_STATS } from '@/data/towerData';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { incrementDailyQuest } from '@/utils/dailyQuestTracker';
import { VESSEL_TYPES, createInitialVesselPity, checkVesselPity, updateVesselPity } from '@/data/vessels';
import { getAccountLevelFromXp } from '@/data/accountLevel';

export type TempleProgress = Record<string, Record<number, number>>; // templeId → floor → stars

interface SavedGameData {
  player: PlayerState;
  campaignProgress: CampaignProgress;
  chapterBonusesClaimed?: ChapterBonusesClaimed;
  arenaState?: ArenaState;
  templeProgress?: TempleProgress;
}

interface GameContextType {
  player: PlayerState;
  addChampion: (champion: Champion) => void;
  removeFromSquad: (pcId: string) => void;
  addToSquad: (pcId: string) => void;
  setActiveSquad: (squadId: number) => void;
  renameSquad: (squadId: number, name: string) => void;
  addToSquadSlot: (squadId: number, pcId: string) => void;
  removeFromSquadSlot: (squadId: number, pcId: string) => void;
  addSquad: () => number | null;
  deleteSquad: (squadId: number) => void;
  spendSouls: (amount: number) => boolean;
  addSouls: (amount: number) => void;
  summonHero: () => Champion | null;
  summonHeroWithPity: (count: number) => Champion[];
  pityCounters: PityCounters;
  getSquadChampions: () => PlayerChampion[];
  addArtifact: (artifact: Artifact) => void;
  addArtifacts: (artifacts: Artifact[]) => void;
  equipArtifact: (heroId: string, artifactId: string) => void;
  unequipArtifact: (heroId: string, artifactId: string) => void;
  getHeroArtifacts: (heroId: string) => Artifact[];
  getUnequippedArtifacts: (slotFilter?: ArtifactSlot) => Artifact[];
  upgradeArtifact: (artifactId: string) => boolean;
  upgradeArtifactStar: (artifactId: string, fodderIds: string[]) => boolean;
  upgradeStar: (pcId: string, fodderIds: string[]) => boolean;
  ascendHero: (pcId: string) => boolean;
  addXpToSquad: (totalXp: number) => void;
  feedHero: (targetPcId: string, fodderPcIds: string[]) => { xpGained: number; heroesConsumed: number };
  getEffectiveStats: (pc: PlayerChampion) => Champion['baseStats'];
  getFullStats: (pc: PlayerChampion) => Champion['baseStats'];
  getDuplicates: (pcId: string) => PlayerChampion[];
  campaignProgress: CampaignProgress;
  chapterBonusesClaimed: ChapterBonusesClaimed;
  updateCampaignProgress: (difficulty: Difficulty, chapter: number, stageNumber: number, stageId: string, stars: number) => void;
  addRunes: (amount: number) => void;
  addDivineRunes: (element: string, amount: number, rarity?: string) => void;
  templeProgress: TempleProgress;
  updateTempleProgress: (templeId: string, floor: number, stars: number) => void;
  setUsername: (name: string) => void;
  avatarUrl: string | null;
  setAvatarUrl: (url: string | null) => void;
  sellArtifacts: (artifactIds: string[]) => { count: number; runesGained: number };
  toggleArtifactLock: (artifactId: string) => void;
  toggleHeroLock: (heroId: string) => void;
  checkAndClaimChapterBonus: (difficulty: Difficulty, chapter: number) => { claimed: boolean; souls?: number; runes?: number; mithrilRunes?: number; artifacts?: import('@/data/artifacts').Artifact[] } | null;
  spendEnergy: (amount: number) => boolean;
  addEnergy: (amount: number) => void;
  getEnergyInfo: () => { current: number; max: number; nextRegenIn: number };
  resetProgress: () => Promise<void>;
  arenaState: ArenaState;
  refreshArenaOpponents: () => void | Promise<void>;
  markArenaOpponentDefeated: (opponentId: string) => void | Promise<void>;
  updateArenaRating: (delta: number) => void;
  addArenaCoins: (tier: string, amount: number) => void;
  processArenaVictory: (opponentId: string, ratingDelta: number, coinTier: string) => void | Promise<void>;
  spendGodsCoins: (amount: number) => boolean;
  claimDailyArenaReward: () => { souls: number; runes: number } | null;
  claimWeeklyArenaReward: () => boolean;
  addGodsCoins: (amount: number) => void;
  addMithrilRunes: (amount: number) => void;
  spendMithrilRunes: (amount: number) => boolean;
  buyGemstoneHero: (championId: string) => boolean;
  expandChampionSlots: () => boolean;
  recordWorldBossDamage: (damage: number) => void;
  resetWorldBossDaily: () => void;
  claimWorldBossRewards: (runes: number, souls: number, artifacts: import('@/data/artifacts').Artifact[]) => void;
  recordCerberusDamage: (damage: number) => void;
  resetCerberusDaily: () => void;
  claimCerberusRewards: (runes: number, souls: number, artifacts: import('@/data/artifacts').Artifact[]) => void;
  upgradeTowerStat: (element: string, stat: TowerStat) => boolean;
  updateAbyssProgress: (progress: AbyssProgress) => void;
  furnaceEnhanceArtifact: (artifactId: string, bossId: string) => boolean;
  equipRelic: (heroId: string, relicId: string) => boolean;
  unequipRelic: (heroId: string, relicId: string) => void;
  addRelic: (relicId: string) => void;
  buyVessel: (vesselRarity: string, count?: number) => boolean;
  buyVesselWithMR: (vesselRarity: string, count?: number) => boolean;
  useVessel: (vesselRarity: string) => import('@/data/gameData').Champion | null;
  useVessels: (vesselRarity: string, count: number) => import('@/data/gameData').Champion[];
  grantVessel: (vesselRarity: string, count?: number) => void;
  saveArenaSquad: () => Promise<void>;
  saving: boolean;
  loaded: boolean;
  gainAccountXp: (amount: number) => void;
  accountLevel: number;
  advanceTutorial: (fromStep: number) => void;
  activateXpBooster: (days: number) => void;
  isXpBoosterActive: () => boolean;
  getXpBoosterTimeLeft: () => number;
  activateRuneBooster: (days: number) => void;
  isRuneBoosterActive: () => boolean;
  getRuneBoosterTimeLeft: () => number;
  activateSoulBooster: (days: number) => void;
  isSoulBoosterActive: () => boolean;
  getSoulBoosterTimeLeft: () => number;
  getMultiBattlesRemaining: () => number;
  getMultiBattleLimit: () => number;
  recordMultiBattles: (count: number) => void;
  isVipActive: () => boolean;
  getVipTimeLeft: () => number;
  buyVip: (months: number) => boolean;
  activateVipDays: (days: number) => void;
  claimVipDaily: () => boolean;
  canClaimVipDaily: () => boolean;
  claimLoginBonus: () => { type: 'artifact' | 'hero'; item: any } | null;
  canClaimLoginBonus: () => boolean;
}

const GameContext = createContext<GameContextType | null>(null);

// Serialize PlayerState for DB (strip champion objects, store champion IDs)
function serializePlayer(player: PlayerState): any {
  return {
    ...player,
    champions: player.champions.map(pc => ({
      id: pc.id,
      championId: pc.champion.id,
      level: pc.level,
      stars: pc.stars,
      redStars: pc.redStars ?? 0,
      xp: pc.xp,
      currentHp: pc.currentHp,
      equippedArtifacts: pc.equippedArtifacts,
      equippedRelics: pc.equippedRelics ?? [],
    })),
  };
}

// Deserialize from DB back to PlayerState
function deserializePlayer(data: any): PlayerState | null {
  if (!data || !data.champions) return null;
  try {
    const champions = (data.champions as any[]).map(pc => {
      const champion = CHAMPIONS.find(c => c.id === pc.championId);
      if (!champion) return null;
      return {
        id: pc.id,
        champion,
        level: pc.level ?? 1,
        stars: pc.stars ?? 0,
        redStars: pc.redStars ?? 0,
        xp: pc.xp ?? 0,
        currentHp: pc.currentHp ?? champion.baseStats.hp,
        equippedArtifacts: pc.equippedArtifacts ?? [],
        equippedRelics: pc.equippedRelics ?? [],
      };
    }).filter((c): c is PlayerChampion => c !== null);

    let squad: string[] = data.squad ?? [];


    return {
      username: data.username ?? '',
      souls: data.souls ?? 0,
      runes: data.runes ?? 0,
      mithrilRunes: data.mithrilRunes ?? 0,
      energy: data.energy ?? MAX_ENERGY,
      maxEnergy: data.maxEnergy ?? MAX_ENERGY,
      championSlots: data.championSlots ?? 200,
      lastEnergyUpdate: data.lastEnergyUpdate ?? Date.now(),
      champions,
      squad,
      squads: data.squads ?? DEFAULT_SQUADS.map(s => ({ ...s })),
      activeSquadId: data.activeSquadId ?? 0,
      artifacts: data.artifacts ?? [],
      pityCounters: data.pityCounters ?? { 'Заветный': 0, 'Сказанный': 0, 'Калиновый': 0, 'Самоцветный': 0 },
      divineRunes: data.divineRunes ?? {},
      worldBossDamageToday: data.worldBossDamageToday ?? 0,
      worldBossAttacksLeft: data.worldBossAttacksLeft ?? 3,
      lastWorldBossAttackDate: data.lastWorldBossAttackDate ?? '',
      worldBossRewardsClaimed: data.worldBossRewardsClaimed ?? false,
      cerberusDamageToday: data.cerberusDamageToday ?? 0,
      cerberusAttacksLeft: data.cerberusAttacksLeft ?? 3,
      lastCerberusAttackDate: data.lastCerberusAttackDate ?? '',
      cerberusRewardsClaimed: data.cerberusRewardsClaimed ?? false,
      towerUpgrades: data.towerUpgrades ?? createInitialTowerUpgrades(),
      abyssProgress: data.abyssProgress ?? createInitialAbyssProgress(),
      relics: data.relics ?? [],
      vessels: data.vessels ?? { 'Обиходный': 0, 'Заветный': 0, 'Сказанный': 0, 'Калиновый': 0, 'Самоцветный': 0 },
      vesselPity: data.vesselPity ?? createInitialVesselPity(),
      accountXp: data.accountXp ?? 0,
      tutorialStep: data.tutorialStep ?? (data.tutorialComplete ? 5 : (data.champions?.length > 0 ? 5 : 0)),
      xpBoosterExpires: data.xpBoosterExpires ?? 0,
      runeBoosterExpires: data.runeBoosterExpires ?? 0,
      soulBoosterExpires: data.soulBoosterExpires ?? 0,
      multiBattlesUsedToday: data.multiBattlesUsedToday ?? 0,
      multiBattlesDate: data.multiBattlesDate ?? '',
      vipExpiresAt: data.vipExpiresAt ?? 0,
      vipDailyClaimedDate: data.vipDailyClaimedDate ?? '',
      loginBonusDay: data.loginBonusDay ?? 0,
      loginBonusLastClaim: data.loginBonusLastClaim ?? '',
    };
  } catch {
    return null;
  }
}

export function GameProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [player, setPlayer] = useState<PlayerState>(createInitialPlayerState);
  const [campaignProgress, setCampaignProgress] = useState<CampaignProgress>(createInitialCampaignProgress);
  const [chapterBonusesClaimed, setChapterBonusesClaimed] = useState<ChapterBonusesClaimed>({});
  const [templeProgress, setTempleProgress] = useState<TempleProgress>({});
  const [arenaState, setArenaStateDirect] = useState<ArenaState>(createInitialArenaState);
  const arenaStateRef = useRef(arenaState);
  const setArenaState: typeof setArenaStateDirect = useCallback((val) => {
    if (typeof val === 'function') {
      setArenaStateDirect(prev => {
        const next = val(prev);
        arenaStateRef.current = next;
        return next;
      });
    } else {
      arenaStateRef.current = val;
      setArenaStateDirect(val);
    }
  }, []);
  const [avatarUrl, setAvatarUrlState] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const uidRef = useRef(0);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextId = () => `pc-${++uidRef.current}-${Date.now()}`;

  // Energy regeneration: compute energy based on elapsed time
  const computeEnergy = useCallback((p: PlayerState): PlayerState => {
    const now = Date.now();
    const elapsed = Math.floor((now - p.lastEnergyUpdate) / 1000);
    const regenCount = Math.floor(elapsed / ENERGY_REGEN_INTERVAL);
    if (regenCount <= 0 && p.energy < p.maxEnergy) return p;
    if (p.energy >= p.maxEnergy) return p;
    const newEnergy = Math.min(p.energy + regenCount, p.maxEnergy);
    if (newEnergy === p.energy) return p;
    const usedTime = regenCount * ENERGY_REGEN_INTERVAL * 1000;
    return { ...p, energy: newEnergy, lastEnergyUpdate: p.lastEnergyUpdate + usedTime };
  }, []);

  // Tick energy regen every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setPlayer(prev => {
        const next = computeEnergy(prev);
        return next === prev ? prev : next; // only re-render if changed
      });
    }, 10000);
    return () => clearInterval(interval);
  }, [computeEnergy]);

  // Keep a ref to latest player state for synchronous energy reads
  const playerRef = useRef(player);
  useEffect(() => { playerRef.current = player; }, [player]);

  const spendEnergy = useCallback((amount: number): boolean => {
    const current = computeEnergy(playerRef.current);
    if (current.energy < amount) return false;
    const updated = { ...current, energy: current.energy - amount, lastEnergyUpdate: Date.now() };
    playerRef.current = updated;
    setPlayer(updated);
    return true;
  }, [computeEnergy]);

  const addEnergy = useCallback((amount: number) => {
    const current = computeEnergy(playerRef.current);
    const updated = { ...current, energy: current.energy + amount, lastEnergyUpdate: Date.now() };
    playerRef.current = updated;
    setPlayer(updated);
  }, [computeEnergy]);

  const getEnergyInfo = useCallback((): { current: number; max: number; nextRegenIn: number } => {
    const now = Date.now();
    const elapsed = Math.floor((now - player.lastEnergyUpdate) / 1000);
    const regenCount = Math.floor(elapsed / ENERGY_REGEN_INTERVAL);
    const currentEnergy = player.energy > player.maxEnergy ? player.energy : Math.min(player.energy + regenCount, player.maxEnergy);
    const nextRegenIn = currentEnergy >= player.maxEnergy ? 0 : ENERGY_REGEN_INTERVAL - (elapsed % ENERGY_REGEN_INTERVAL);
    return { current: currentEnergy, max: player.maxEnergy, nextRegenIn };
  }, [player.energy, player.lastEnergyUpdate, player.maxEnergy]);

  // Reset loaded flag when user changes to prevent stale saves
  useEffect(() => {
    if (!user) {
      // If auth session is missing (or supabase is not configured),
      // do not block the whole app behind the "loading progress" screen.
      setLoaded(true);
      return;
    }
    setLoaded(false);
  }, [user]);

  // Load game data from DB
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function load() {
      const { data, error } = await supabase
        .from('profiles')
        .select('game_data, username, avatar_url')
        .eq('id', user!.id)
        .single();

      if (cancelled) return;

      // Get the username and avatar from the profile
      const profileUsername = data?.username || '';
      if (data?.avatar_url) setAvatarUrlState(data.avatar_url);

      if (!error && data?.game_data && typeof data.game_data === 'object') {
        const saved = data.game_data as any;
        const restoredPlayer = deserializePlayer(saved.player);
        if (restoredPlayer) {
          if (profileUsername && (!restoredPlayer.username)) {
            restoredPlayer.username = profileUsername;
          }
          // One-time patch: upgrade Берендей to 5★
          restoredPlayer.champions = restoredPlayer.champions.map(c =>
            c.champion.id === 'berendey' && c.level >= 50 && (c.stars ?? 0) < 5
              ? { ...c, stars: 5 }
              : c
          );
          // Restore uidRef to avoid id collisions
          const maxId = restoredPlayer.champions.reduce((max, pc) => {
            const m = pc.id.match(/^pc-(\d+)-/);
            return m ? Math.max(max, parseInt(m[1])) : max;
          }, 0);
          uidRef.current = maxId;
          setPlayer(restoredPlayer);
        } else if (profileUsername) {
          // game_data exists but has no player yet (new account with empty {})
          setPlayer(prev => ({ ...prev, username: profileUsername }));
        }
        if (saved.campaignProgress) {
          setCampaignProgress(saved.campaignProgress);
        }
        if (saved.chapterBonusesClaimed) {
          setChapterBonusesClaimed(saved.chapterBonusesClaimed);
        }
        if (saved.templeProgress) {
          setTempleProgress(saved.templeProgress);
        }
        if (saved.arenaState) {
          const { state: decayed, pendingReward } = applyWeeklyDecay(saved.arenaState);
          if (pendingReward) {
            setArenaState({ ...decayed, pendingWeeklyReward: pendingReward });
          } else {
            setArenaState(decayed);
          }
        }
      } else if (profileUsername) {
        // No game_data at all
        setPlayer(prev => ({ ...prev, username: profileUsername }));
      }
      setLoaded(true);
    }

    load();
    return () => { cancelled = true; };
  }, [user]);

  // Compute squad power for DB sync — includes artifact bonuses
  const computeSquadPower = useCallback(() => {
    const p = playerRef.current;
    const squadId = p.activeSquadId ?? 0;
    const squad = p.squads[squadId];
    if (!squad) return 0;
    return squad.members.reduce((sum, pcId) => {
      const pc = p.champions.find(c => c.id === pcId);
      if (!pc) return sum;
      // Base stat scaling
      const starMult = STAR_MULTIPLIERS[pc.stars ?? 0] ?? 1;
      const redStarBonus = RED_STAR_STAT_MULTIPLIERS[pc.redStars ?? 0] ?? 0;
      const levelMult = 1 + (pc.level - 1) * LEVEL_STAT_BONUS_PER_LEVEL;
      const combatMult = (starMult + redStarBonus) * levelMult;
      const baseMult = starMult + redStarBonus;
      const base = pc.champion.baseStats;
      const baseScaled = {
        hp: Math.floor(base.hp * combatMult),
        atk: Math.floor(base.atk * combatMult),
        def: Math.floor(base.def * combatMult),
        spd: Math.floor(base.spd * (baseMult || 1)),
        critChance: base.critChance ?? 15,
        critDmg: base.critDmg ?? 50,
        resistance: base.resistance ?? 0,
        accuracy: base.accuracy ?? 0,
      };
      // Add artifact bonuses
      const heroArtifacts = pc.equippedArtifacts
        .map(aid => p.artifacts.find(a => a.id === aid))
        .filter((a): a is Artifact => !!a);
      if (heroArtifacts.length > 0) {
        const bonuses = calculateArtifactStats(heroArtifacts, baseScaled);
        baseScaled.hp += (bonuses.hp ?? 0);
        baseScaled.atk += (bonuses.atk ?? 0);
        baseScaled.def += (bonuses.def ?? 0);
        baseScaled.spd += (bonuses.spd ?? 0);
      }
      return sum + calculateUnitPower(baseScaled);
    }, 0);
  }, []);

  // Save function with retry
  const saveGameData = useCallback(async (retries = 2) => {
    if (!user) return;
    setSaving(true);
    const gameData: SavedGameData = {
      player: serializePlayer(playerRef.current) as any,
      campaignProgress,
      chapterBonusesClaimed,
      arenaState: arenaStateRef.current,
      templeProgress,
    };
    const squadPower = computeSquadPower();
    for (let attempt = 0; attempt <= retries; attempt++) {
      const { error } = await supabase
        .from('profiles')
        .update({
          game_data: gameData as any,
          arena_rating: arenaStateRef.current.arenaRating,
          arena_power: squadPower,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);
      
      if (!error) {
        setSaving(false);
        return;
      }
      console.error(`Save failed (attempt ${attempt + 1}):`, error);
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
      } else {
        toast.error('Ошибка сохранения! Попробуй перезагрузить.');
      }
    }
    setSaving(false);
  }, [user, campaignProgress, chapterBonusesClaimed, templeProgress, computeSquadPower]);

  // Auto-save to DB (debounced)
  useEffect(() => {
    if (!user || !loaded) return;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveGameData();
    }, 2000);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [player, campaignProgress, chapterBonusesClaimed, arenaState, templeProgress, user, loaded, saveGameData]);

  // Force-save on tab close/refresh (best-effort)
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (!user) return;
      // Cancel any pending debounced save and save immediately
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      const gameData: SavedGameData = {
        player: serializePlayer(playerRef.current) as any,
        campaignProgress,
        chapterBonusesClaimed,
        arenaState: arenaStateRef.current,
        templeProgress,
      };
      // Synchronous XHR as last resort on unload
      try {
        const xhr = new XMLHttpRequest();
        xhr.open('PATCH', `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/profiles?id=eq.${user.id}`, false);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.setRequestHeader('apikey', import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);
        xhr.setRequestHeader('Authorization', `Bearer ${supabase.auth.getSession ? '' : ''}`);
        // Use supabase session token if available
        const session = JSON.parse(localStorage.getItem('sb-' + import.meta.env.VITE_SUPABASE_URL?.split('//')[1]?.split('.')[0] + '-auth-token') || '{}');
        if (session?.access_token) {
          xhr.setRequestHeader('Authorization', `Bearer ${session.access_token}`);
        }
        xhr.send(JSON.stringify({
          game_data: gameData,
          arena_rating: arenaStateRef.current.arenaRating,
          arena_power: computeSquadPower(),
          updated_at: new Date().toISOString(),
        }));
      } catch (e) {
        console.error('Emergency save failed:', e);
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [user, campaignProgress, chapterBonusesClaimed, templeProgress, computeSquadPower]);

  // Reset progress
  const resetProgress = useCallback(async () => {
    const initial = createInitialPlayerState();
    // Preserve latest username (avoid stale closure value after auth/load transitions)
    const latestUsername = (playerRef.current.username || '').trim();
    const metaUsername = typeof user?.user_metadata?.username === 'string' ? user.user_metadata.username.trim() : '';
    initial.username = latestUsername || metaUsername;
    const initialCampaign = createInitialCampaignProgress();
    setPlayer(initial);
    setCampaignProgress(initialCampaign);
    setChapterBonusesClaimed({});
    setTempleProgress({});
    setArenaState(createInitialArenaState());
    setAvatarUrlState(null);
    uidRef.current = 0;

    if (user) {
      const gameData: SavedGameData = {
        player: serializePlayer(initial) as any,
        campaignProgress: initialCampaign,
        chapterBonusesClaimed: {},
        arenaState: createInitialArenaState(),
        templeProgress: {},
      };
      await Promise.all([
        supabase
          .from('profiles')
          .update({ game_data: gameData as any, arena_rating: 0, arena_power: 0, arena_squad: [], avatar_url: null, updated_at: new Date().toISOString() })
          .eq('id', user.id),
        supabase
          .from('world_boss_damage')
          .delete()
          .eq('user_id', user.id),
        supabase
          .from('achievements')
          .delete()
          .eq('user_id', user.id),
        supabase
          .from('daily_quests')
          .delete()
          .eq('user_id', user.id),
        supabase
          .from('arena_battle_history')
          .delete()
          .eq('attacker_id', user.id),
      ]);
    }
    toast.success('Прогресс сброшен. Начни заново!');
  }, [user]);

  const addChampion = useCallback((champion: Champion) => {
    setPlayer(prev => ({
      ...prev,
      champions: [...prev.champions, {
        id: nextId(),
        champion,
        level: 1,
        stars: 0,
        redStars: 0,
        xp: 0,
        currentHp: champion.baseStats.hp,
        equippedArtifacts: [],
        equippedRelics: [],
      }],
    }));
  }, []);

  const removeFromSquad = useCallback((pcId: string) => {
    setPlayer(prev => ({
      ...prev,
      squad: prev.squad.filter(id => id !== pcId),
    }));
  }, []);

  const addToSquad = useCallback((pcId: string) => {
    setPlayer(prev => {
      if (prev.squad.length >= 4 || prev.squad.includes(pcId)) return prev;
      return { ...prev, squad: [...prev.squad, pcId] };
    });
  }, []);

  const setActiveSquad = useCallback((squadId: number) => {
    setPlayer(prev => {
      const sq = prev.squads.find(s => s.id === squadId);
      if (!sq) return prev;
      return { ...prev, activeSquadId: squadId, squad: sq.members };
    });
  }, []);

  const renameSquad = useCallback((squadId: number, name: string) => {
    setPlayer(prev => ({
      ...prev,
      squads: prev.squads.map(s => s.id === squadId ? { ...s, name } : s),
    }));
  }, []);

  const addToSquadSlot = useCallback((squadId: number, pcId: string) => {
    setPlayer(prev => {
      const championIds = new Set(prev.champions.map(c => c.id));
      const squads = prev.squads.map(s => {
        if (s.id !== squadId) return s;
        // Clean stale member IDs first
        const cleanMembers = s.members.filter(id => championIds.has(id));
        if (cleanMembers.length >= 4 || cleanMembers.includes(pcId)) return { ...s, members: cleanMembers };
        return { ...s, members: [...cleanMembers, pcId] };
      });
      const activeMembers = squadId === prev.activeSquadId ? (squads.find(s => s.id === squadId)?.members ?? prev.squad) : prev.squad;
      // Advance tutorial step 7 → 8 when 4 heroes in squad
      const newSquad = squads.find(s => s.id === squadId);
      let newStep = prev.tutorialStep;
      if (newStep === 7 && newSquad && newSquad.members.length >= 4) {
        newStep = 8;
      }
      return { ...prev, squads, squad: activeMembers, tutorialStep: newStep };
    });
  }, []);

  const removeFromSquadSlot = useCallback((squadId: number, pcId: string) => {
    setPlayer(prev => {
      const squads = prev.squads.map(s => {
        if (s.id !== squadId) return s;
        return { ...s, members: s.members.filter(id => id !== pcId) };
      });
      const activeMembers = squadId === prev.activeSquadId ? (squads.find(s => s.id === squadId)?.members ?? prev.squad) : prev.squad;
      return { ...prev, squads, squad: activeMembers };
    });
  }, []);

  const addSquad = useCallback((): number | null => {
    const MAX_SQUADS = 10;
    const prev = playerRef.current;
    if (prev.squads.length >= MAX_SQUADS) return null;
    const newId = prev.squads.length > 0 ? Math.max(...prev.squads.map(s => s.id)) + 1 : 0;
    const newSquad: Squad = { id: newId, name: `Отряд ${prev.squads.length + 1}`, members: [] };
    setPlayer(p => ({ ...p, squads: [...p.squads, newSquad] }));
    return newId;
  }, []);

  const deleteSquad = useCallback((squadId: number) => {
    setPlayer(prev => {
      if (prev.squads.length <= 1) return prev;
      const squads = prev.squads.filter(s => s.id !== squadId);
      const activeSquadId = prev.activeSquadId === squadId ? squads[0].id : prev.activeSquadId;
      const squad = activeSquadId !== prev.activeSquadId ? (squads.find(s => s.id === activeSquadId)?.members ?? []) : prev.squad;
      return { ...prev, squads, activeSquadId, squad };
    });
  }, []);

  const spendSouls = useCallback((amount: number): boolean => {
    let success = false;
    setPlayer(prev => {
      if (prev.souls >= amount) {
        success = true;
        return { ...prev, souls: prev.souls - amount };
      }
      return prev;
    });
    return success;
  }, []);

  const addSouls = useCallback((amount: number) => {
    setPlayer(prev => {
      const booster = (prev.soulBoosterExpires ?? 0) > Date.now() ? 2 : 1;
      const vip = (prev.vipExpiresAt ?? 0) > Date.now() ? 1.5 : 1;
      return { ...prev, souls: prev.souls + Math.floor(amount * booster * vip) };
    });
  }, []);

  const addRunes = useCallback((amount: number) => {
    setPlayer(prev => {
      const booster = (prev.runeBoosterExpires ?? 0) > Date.now() ? 2 : 1;
      const vip = (prev.vipExpiresAt ?? 0) > Date.now() ? 1.5 : 1;
      return { ...prev, runes: prev.runes + Math.floor(amount * booster * vip) };
    });
  }, []);

  const addDivineRunes = useCallback((element: string, amount: number, rarity?: string) => {
    // If rarity provided, use composite key "Element_Rarity", otherwise legacy flat key
    const key = rarity ? `${element}_${rarity}` : element;
    setPlayer(prev => {
      const booster = (prev.runeBoosterExpires ?? 0) > Date.now() ? 2 : 1;
      const vip = (prev.vipExpiresAt ?? 0) > Date.now() ? 1.5 : 1;
      const total = Math.floor(amount * booster * vip);
      return {
        ...prev,
        divineRunes: {
          ...prev.divineRunes,
          [key]: (prev.divineRunes[key as keyof typeof prev.divineRunes] ?? 0) + total,
        },
      };
    });
  }, []);

  const setUsernameFunc = useCallback(async (name: string) => {
    setPlayer(prev => ({ ...prev, username: name }));
    if (user) {
      await supabase
        .from('profiles')
        .update({ username: name, updated_at: new Date().toISOString() })
        .eq('id', user.id);
    }
  }, [user]);

  const setAvatarUrl = useCallback(async (url: string | null) => {
    setAvatarUrlState(url);
    if (user) {
      await supabase
        .from('profiles')
        .update({ avatar_url: url, updated_at: new Date().toISOString() })
        .eq('id', user.id);
    }
  }, [user]);

  const summonHero = useCallback((): Champion | null => {
    const roll = Math.random();
    let cumulative = 0;
    let selectedRarity: Rarity = 'Обиходный';
    
    for (const [rarity, rate] of Object.entries(SUMMON_RATES) as [Rarity, number][]) {
      cumulative += rate;
      if (roll <= cumulative) {
        selectedRarity = rarity;
        break;
      }
    }

    let candidates = CHAMPIONS.filter(c => c.rarity === selectedRarity);
    if (candidates.length === 0) candidates = CHAMPIONS;
    return candidates[Math.floor(Math.random() * candidates.length)];
  }, []);

  const summonHeroWithPity = useCallback((count: number): Champion[] => {
    const current = playerRef.current;
    const freeSlots = current.championSlots - current.champions.length;
    if (freeSlots <= 0) {
      toast.error('Нет свободных мест в Дружине!');
      return [];
    }
    const actualCount = Math.min(count, freeSlots);
    const rolls: number[] = [];
    const heroRolls: number[] = [];
    for (let i = 0; i < actualCount; i++) {
      rolls.push(Math.random());
      heroRolls.push(Math.random());
    }
    
    let resultHeroes: Champion[] = [];
    const costPerSummon = 100;
    
    setPlayer(prev => {
      const counters = { ...prev.pityCounters };
      const newChampions: PlayerChampion[] = [];
      const heroes: Champion[] = [];
      
      for (let i = 0; i < actualCount; i++) {
        for (const rarity of PITY_PRIORITY) {
          counters[rarity] = (counters[rarity] ?? 0) + costPerSummon;
        }
        
        let selectedRarity: Rarity | null = null;
        for (const rarity of PITY_PRIORITY) {
          const threshold = PITY_THRESHOLDS[rarity];
          if (threshold && counters[rarity] >= threshold) {
            selectedRarity = rarity;
            break;
          }
        }
        
        if (!selectedRarity) {
          const roll = rolls[i];
          let cumulative = 0;
          selectedRarity = 'Обиходный';
          for (const [rarity, rate] of Object.entries(SUMMON_RATES) as [Rarity, number][]) {
            cumulative += rate;
            if (roll <= cumulative) {
              selectedRarity = rarity;
              break;
            }
          }
        }
        
        if (counters[selectedRarity] !== undefined) {
          counters[selectedRarity] = 0;
        }
        
        let candidates = CHAMPIONS.filter(c => c.rarity === selectedRarity);
        if (candidates.length === 0) candidates = CHAMPIONS;
        const hero = candidates[Math.floor(heroRolls[i] * candidates.length)];
        heroes.push(hero);
        
        newChampions.push({
          id: nextId(),
          champion: hero,
          level: 1,
          stars: 0,
          redStars: 0,
          xp: 0,
          currentHp: hero.baseStats.hp,
          equippedArtifacts: [],
          equippedRelics: [],
        });
      }
      
      resultHeroes = heroes;
      
      return {
        ...prev,
        champions: [...prev.champions, ...newChampions],
        pityCounters: counters,
      };
    });
    
    if (resultHeroes.length > 0) {
      incrementDailyQuest('summon_heroes', resultHeroes.length);
      gainAccountXp(resultHeroes.length * 5);
    }
    return resultHeroes;
  }, []);

  const getSquadChampions = useCallback((): PlayerChampion[] => {
    return player.squad
      .map(id => player.champions.find(c => c.id === id))
      .filter((c): c is PlayerChampion => c !== undefined);
  }, [player.squad, player.champions]);

  const upgradeStar = useCallback((pcId: string, fodderIds: string[]): boolean => {
    const hero = player.champions.find(c => c.id === pcId);
    if (!hero) return false;
    const stars = hero.stars ?? 0;
    if (stars >= MAX_STARS) return false;
    if (hero.level < MAX_LEVEL) return false; // Hero must be level 50
    const costInfo = getStarUpgradeCost(stars);
    if (!costInfo) return false;
    const { copiesRequired, fodderStars } = costInfo;
    if (fodderIds.length < copiesRequired) return false;
    const validFodder = fodderIds.filter(fId => {
      const f = player.champions.find(c => c.id === fId);
      // Any hero (not same champion required), must match fodderStars and be level 50
      return f && f.id !== pcId && !f.locked && f.level >= MAX_LEVEL && (f.stars ?? 0) === fodderStars;
    });
    if (validFodder.length < copiesRequired) return false;
    const toConsume = new Set(validFodder.slice(0, copiesRequired));
    setPlayer(prev => ({
      ...prev,
      champions: prev.champions
        .filter(c => !toConsume.has(c.id))
        .map(c => c.id === pcId ? { ...c, stars: stars + 1, level: 1, xp: 0 } : c),
      squad: prev.squad.filter(id => !toConsume.has(id)),
      squads: prev.squads.map(sq => ({
        ...sq,
        members: sq.members.filter(id => !toConsume.has(id)),
      })),
    }));
    return true;
  }, [player.champions]);

  const ascendHero = useCallback((pcId: string): boolean => {
    const hero = player.champions.find(c => c.id === pcId);
    if (!hero) return false;
    const stars = hero.stars ?? 0;
    if (stars < 1) return false;
    const currentRed = hero.redStars ?? 0;
    if (currentRed >= Math.min(stars, MAX_RED_STARS)) return false;
    const cost = getAscensionCost(currentRed);
    if (!cost) return false;
    const elementKey = ELEMENT_RUNE_KEY[hero.champion.element];
    if (!elementKey) return false;

    // Use composite keys: "Element_Rarity"
    const runeRarity = cost.runeRarity;
    const elementRuneKey = `${elementKey}_${runeRarity}`;
    const divineRuneKey = `Божественность_${runeRarity}`;
    const elementRunes = player.divineRunes[elementRuneKey as keyof typeof player.divineRunes] ?? 0;
    const divineRunes = player.divineRunes[divineRuneKey as keyof typeof player.divineRunes] ?? 0;
    if (elementRunes < cost.elementRunes || divineRunes < cost.divineRunes) return false;

    setPlayer(prev => ({
      ...prev,
      divineRunes: {
        ...prev.divineRunes,
        [elementRuneKey]: (prev.divineRunes[elementRuneKey as keyof typeof prev.divineRunes] ?? 0) - cost.elementRunes,
        [divineRuneKey]: (prev.divineRunes[divineRuneKey as keyof typeof prev.divineRunes] ?? 0) - cost.divineRunes,
      },
      champions: prev.champions.map(c =>
        c.id === pcId ? { ...c, redStars: currentRed + 1 } : c
      ),
    }));
    return true;
  }, [player.champions, player.divineRunes]);

  const isXpBoosterActive = useCallback(() => {
    return (player.xpBoosterExpires ?? 0) > Date.now();
  }, [player.xpBoosterExpires]);

  const getXpBoosterTimeLeft = useCallback(() => {
    const diff = (player.xpBoosterExpires ?? 0) - Date.now();
    return diff > 0 ? diff : 0;
  }, [player.xpBoosterExpires]);

  const activateXpBooster = useCallback((days: number) => {
    setPlayer(prev => {
      const now = Date.now();
      const currentExpiry = (prev.xpBoosterExpires ?? 0) > now ? prev.xpBoosterExpires : now;
      return { ...prev, xpBoosterExpires: currentExpiry + days * 24 * 60 * 60 * 1000 };
    });
  }, []);

  // Rune Booster
  const isRuneBoosterActive = useCallback(() => {
    return (player.runeBoosterExpires ?? 0) > Date.now();
  }, [player.runeBoosterExpires]);

  const getRuneBoosterTimeLeft = useCallback(() => {
    const diff = (player.runeBoosterExpires ?? 0) - Date.now();
    return diff > 0 ? diff : 0;
  }, [player.runeBoosterExpires]);

  const activateRuneBooster = useCallback((days: number) => {
    setPlayer(prev => {
      const now = Date.now();
      const currentExpiry = (prev.runeBoosterExpires ?? 0) > now ? prev.runeBoosterExpires : now;
      return { ...prev, runeBoosterExpires: currentExpiry + days * 24 * 60 * 60 * 1000 };
    });
  }, []);

  // Soul Booster
  const isSoulBoosterActive = useCallback(() => {
    return (player.soulBoosterExpires ?? 0) > Date.now();
  }, [player.soulBoosterExpires]);

  const getSoulBoosterTimeLeft = useCallback(() => {
    const diff = (player.soulBoosterExpires ?? 0) - Date.now();
    return diff > 0 ? diff : 0;
  }, [player.soulBoosterExpires]);

  const activateSoulBooster = useCallback((days: number) => {
    setPlayer(prev => {
      const now = Date.now();
      const currentExpiry = (prev.soulBoosterExpires ?? 0) > now ? prev.soulBoosterExpires : now;
      return { ...prev, soulBoosterExpires: currentExpiry + days * 24 * 60 * 60 * 1000 };
    });
  }, []);

  // ═══ VIP Card ═══
  const VIP_PRICES: Record<number, number> = { 1: 800, 6: 4000, 12: 7000 };

  const isVipActive = useCallback(() => {
    return (player.vipExpiresAt ?? 0) > Date.now();
  }, [player.vipExpiresAt]);

  const getVipTimeLeft = useCallback(() => {
    const diff = (player.vipExpiresAt ?? 0) - Date.now();
    return diff > 0 ? diff : 0;
  }, [player.vipExpiresAt]);

  const buyVip = useCallback((months: number): boolean => {
    if (![1, 6, 12].includes(months)) return false;
    setPlayer(prev => {
      const now = Date.now();
      const currentExpiry = (prev.vipExpiresAt ?? 0) > now ? prev.vipExpiresAt : now;
      return {
        ...prev,
        vipExpiresAt: currentExpiry + months * 30 * 24 * 60 * 60 * 1000,
      };
    });
    return true;
  }, []);

  const activateVipDays = useCallback((days: number) => {
    setPlayer(prev => {
      const now = Date.now();
      const currentExpiry = (prev.vipExpiresAt ?? 0) > now ? prev.vipExpiresAt : now;
      return { ...prev, vipExpiresAt: currentExpiry + days * 24 * 60 * 60 * 1000 };
    });
  }, []);

  const canClaimVipDaily = useCallback(() => {
    const p = playerRef.current;
    if ((p.vipExpiresAt ?? 0) <= Date.now()) return false;
    const today = new Date().toISOString().slice(0, 10);
    return (p.vipDailyClaimedDate ?? '') !== today;
  }, [player.vipExpiresAt, player.vipDailyClaimedDate]);

  const claimVipDaily = useCallback((): boolean => {
    const p = playerRef.current;
    if ((p.vipExpiresAt ?? 0) <= Date.now()) return false;
    const today = new Date().toISOString().slice(0, 10);
    if ((p.vipDailyClaimedDate ?? '') === today) return false;
    setPlayer(prev => ({
      ...prev,
      energy: prev.energy + 50,
      souls: prev.souls + 500,
      vessels: { ...prev.vessels, 'Заветный': (prev.vessels['Заветный'] ?? 0) + 1 },
      vipDailyClaimedDate: today,
    }));
    return true;
  }, []);

  const canClaimLoginBonus = useCallback((): boolean => {
    const p = playerRef.current;
    if ((p.loginBonusDay ?? 0) >= 7) return false;
    const today = new Date().toISOString().slice(0, 10);
    return (p.loginBonusLastClaim ?? '') !== today;
  }, [player.loginBonusDay, player.loginBonusLastClaim]);

  const claimLoginBonus = useCallback((): { type: 'artifact' | 'hero'; item: any } | null => {
    const p = playerRef.current;
    const day = p.loginBonusDay ?? 0;
    if (day >= 7) return null;
    const today = new Date().toISOString().slice(0, 10);
    if ((p.loginBonusLastClaim ?? '') === today) return null;
    const currentDay = day + 1;
    if (currentDay <= 6) {
      const slots: import('@/data/artifacts').ArtifactSlot[] = ['weapon', 'helmet', 'shield', 'gloves', 'armor', 'boots'];
      const slot = slots[currentDay - 1];
      const artifact = generateArtifact('Самоцветный', 0, 5, 'Неуязвимость' as any, slot);
      setPlayer(prev => ({
        ...prev,
        artifacts: [...prev.artifacts, artifact],
        loginBonusDay: currentDay,
        loginBonusLastClaim: today,
      }));
      return { type: 'artifact', item: artifact };
    } else {
      const mythics = CHAMPIONS.filter(c => c.rarity === 'Самоцветный');
      const champion = mythics[Math.floor(Math.random() * mythics.length)];
      const pc: PlayerChampion = {
        id: `${champion.id}-${Date.now()}`,
        champion,
        level: 1,
        stars: 0,
        redStars: 0,
        xp: 0,
        currentHp: champion.baseStats.hp,
        equippedArtifacts: [],
        equippedRelics: [],
      };
      setPlayer(prev => ({
        ...prev,
        champions: [...prev.champions, pc],
        loginBonusDay: currentDay,
        loginBonusLastClaim: today,
      }));
      return { type: 'hero', item: champion };
    }
  }, []);

  const addXpToSquad = useCallback((totalXp: number) => {
    setPlayer(prev => {
      const squadChampions = prev.champions.filter(c => prev.squad.includes(c.id));
      if (squadChampions.length === 0) return prev;

      // Only give XP to heroes below their max level
      const eligibleMembers = squadChampions.filter(c => c.level < getMaxLevelForStars(c.stars ?? 0));
      if (eligibleMembers.length === 0) return prev;

      const boosterMult = (prev.xpBoosterExpires ?? 0) > Date.now() ? 2 : 1;
      const vipMult = (prev.vipExpiresAt ?? 0) > Date.now() ? 1.5 : 1;
      const smallSquadBonus = eligibleMembers.length < 4 ? 1.1 : 1;
      const xpEach = Math.floor((totalXp / eligibleMembers.length) * smallSquadBonus * boosterMult * vipMult);

      return {
        ...prev,
        champions: prev.champions.map(c => {
          if (!prev.squad.includes(c.id)) return c;
          const maxLvl = getMaxLevelForStars(c.stars ?? 0);
          if (c.level >= maxLvl) return c;
          const maxXp = XP_PER_LEVEL[maxLvl] ?? Infinity;
          const newXp = Math.min(c.xp + xpEach, maxXp);
          const newLevel = Math.min(getLevelFromXp(newXp, c.stars ?? 0), maxLvl);
          return { ...c, xp: newXp, level: newLevel };
        }),
      };
    });
  }, []);

  const feedHero = useCallback((targetPcId: string, fodderPcIds: string[]): { xpGained: number; heroesConsumed: number } => {
    const target = player.champions.find(c => c.id === targetPcId);
    if (!target) return { xpGained: 0, heroesConsumed: 0 };

    // If already max level for stars, don't consume anyone
    const heroMaxLevel = getMaxLevelForStars(target.stars ?? 0);
    if (target.level >= heroMaxLevel) return { xpGained: 0, heroesConsumed: 0 };

    const fodderHeroes = player.champions.filter(c => fodderPcIds.includes(c.id) && c.id !== targetPcId && !c.locked);
    if (fodderHeroes.length === 0) return { xpGained: 0, heroesConsumed: 0 };

    // Calculate max XP needed to reach max level
    const maxXp = XP_PER_LEVEL[heroMaxLevel] ?? Infinity;
    const xpRoom = maxXp - target.xp;

    // Only consume heroes until we hit the cap
    let xpGained = 0;
    const consumedIds: string[] = [];
    for (const f of fodderHeroes) {
      const fXp = FEED_XP[f.champion.rarity] ?? 50;
      consumedIds.push(f.id);
      xpGained += fXp;
      if (xpGained >= xpRoom) {
        xpGained = Math.min(xpGained, xpRoom);
        break;
      }
    }

    const heroesConsumed = consumedIds.length;
    const consumedSet = new Set(consumedIds);

    setPlayer(prev => {
      const t = prev.champions.find(c => c.id === targetPcId);
      if (!t) return prev;
      const newXp = t.xp + xpGained;
      const newLevel = Math.min(getLevelFromXp(newXp, t.stars ?? 0), heroMaxLevel);
      return {
        ...prev,
        champions: prev.champions
          .filter(c => !consumedSet.has(c.id) || c.id === targetPcId)
          .map(c => c.id === targetPcId ? { ...c, xp: newXp, level: newLevel } : c),
        squad: prev.squad.filter(id => !consumedSet.has(id) || id === targetPcId),
      };
    });
    incrementDailyQuest('upgrade_hero', heroesConsumed);
    return { xpGained, heroesConsumed };
  }, [player.champions]);

  const getDuplicates = useCallback((pcId: string): PlayerChampion[] => {
    const hero = player.champions.find(c => c.id === pcId);
    if (!hero) return [];
    return player.champions.filter(c => c.champion.id === hero.champion.id && c.id !== pcId);
  }, [player.champions]);

  const getEffectiveStats = useCallback((pc: PlayerChampion): Champion['baseStats'] => {
    const starMult = STAR_MULTIPLIERS[pc.stars ?? 0] ?? 1;
    const redStarBonus = RED_STAR_STAT_MULTIPLIERS[pc.redStars ?? 0] ?? 0;
    const levelMult = 1 + (pc.level - 1) * LEVEL_STAT_BONUS_PER_LEVEL;
    const combatMult = (starMult + redStarBonus) * levelMult;
    const baseMult = starMult + redStarBonus;
    const base = pc.champion.baseStats;
    const element = pc.champion.element;
    const tu = playerRef.current.towerUpgrades;
    const tHp = 1 + (getTowerBonus(tu, element, 'hp') / 100);
    const tAtk = 1 + (getTowerBonus(tu, element, 'atk') / 100);
    const tDef = 1 + (getTowerBonus(tu, element, 'def') / 100);
    const tCrit = getTowerBonus(tu, element, 'critChance');
    const tRes = getTowerBonus(tu, element, 'resistance');
    const tAcc = getTowerBonus(tu, element, 'accuracy');

    // Relic bonuses (non-abyss-only)
    const relicBonuses = calculateRelicBonuses(pc.equippedRelics ?? [], false);
    const rHp = 1 + ((relicBonuses.hp ?? 0) / 100);
    const rAtk = 1 + ((relicBonuses.atk ?? 0) / 100);
    const rDef = 1 + ((relicBonuses.def ?? 0) / 100);
    const rSpd = 1 + ((relicBonuses.spd ?? 0) / 100);
    const rCritDmg = relicBonuses.critDmg ?? 0;
    const rCritChance = relicBonuses.critChance ?? 0;
    const rRes = relicBonuses.resistance ?? 0;
    const rAcc = relicBonuses.accuracy ?? 0;

    return {
      hp: Math.floor(base.hp * combatMult * tHp * rHp),
      atk: Math.floor(base.atk * combatMult * tAtk * rAtk),
      def: Math.floor(base.def * combatMult * tDef * rDef),
      spd: Math.floor(base.spd * (baseMult || 1) * rSpd),
      critChance: base.critChance + tCrit + rCritChance,
      critDmg: base.critDmg + rCritDmg,
      resistance: base.resistance + tRes + rRes,
      accuracy: base.accuracy + tAcc + rAcc,
    };
  }, []);

  const getFullStats = useCallback((pc: PlayerChampion): Champion['baseStats'] => {
    const baseScaled = getEffectiveStats(pc);
    const heroArtifacts = pc.equippedArtifacts
      .map(aid => player.artifacts.find(a => a.id === aid))
      .filter((a): a is Artifact => !!a);
    if (heroArtifacts.length === 0) return baseScaled;
    const bonuses = calculateArtifactStats(heroArtifacts, baseScaled);
    return {
      hp: baseScaled.hp + (bonuses.hp ?? 0),
      atk: baseScaled.atk + (bonuses.atk ?? 0),
      def: baseScaled.def + (bonuses.def ?? 0),
      spd: baseScaled.spd + (bonuses.spd ?? 0),
      critChance: baseScaled.critChance + (bonuses.critChance ?? 0),
      critDmg: baseScaled.critDmg + (bonuses.critDmg ?? 0),
      resistance: baseScaled.resistance + (bonuses.resistance ?? 0),
      accuracy: baseScaled.accuracy + (bonuses.accuracy ?? 0),
    };
  }, [getEffectiveStats, player.artifacts]);

  const addArtifact = useCallback((artifact: Artifact) => {
    setPlayer(prev => ({ ...prev, artifacts: [...prev.artifacts, artifact] }));
    incrementDailyQuest('collect_artifacts');
  }, []);

  const addArtifacts = useCallback((artifacts: Artifact[]) => {
    setPlayer(prev => ({ ...prev, artifacts: [...prev.artifacts, ...artifacts] }));
    if (artifacts.length > 0) incrementDailyQuest('collect_artifacts', artifacts.length);
  }, []);

  const equipArtifact = useCallback((heroId: string, artifactId: string) => {
    setPlayer(prev => {
      const artifact = prev.artifacts.find(a => a.id === artifactId);
      if (!artifact) return prev;
      const hero = prev.champions.find(c => c.id === heroId);
      if (!hero || !canEquipSlot(artifact.slot, hero.stars ?? 0)) return prev;
      const champions = prev.champions.map(pc => ({
        ...pc,
        equippedArtifacts: pc.equippedArtifacts.filter(id => id !== artifactId),
      }));
      const newState = {
        ...prev,
        champions: champions.map(pc => {
          if (pc.id !== heroId) return pc;
          const currentInSlot = prev.artifacts.find(a =>
            pc.equippedArtifacts.includes(a.id) && a.slot === artifact.slot
          );
          const filtered = pc.equippedArtifacts.filter(id => id !== currentInSlot?.id && id !== artifactId);
          return { ...pc, equippedArtifacts: [...filtered, artifactId] };
        }),
      };
      // Advance tutorial step 20 → 21 when equipping a weapon
      if (newState.tutorialStep === 20 && artifact.slot === 'weapon') {
        newState.tutorialStep = 21;
      }
      // Advance tutorial step 34 → 35 when equipping a helmet
      if (newState.tutorialStep === 34 && artifact.slot === 'helmet') {
        newState.tutorialStep = 35;
      }
      return newState;
    });
  }, []);

  const unequipArtifact = useCallback((heroId: string, artifactId: string) => {
    setPlayer(prev => ({
      ...prev,
      champions: prev.champions.map(pc =>
        pc.id === heroId
          ? { ...pc, equippedArtifacts: pc.equippedArtifacts.filter(id => id !== artifactId) }
          : pc
      ),
    }));
  }, []);

  const getHeroArtifacts = useCallback((heroId: string): Artifact[] => {
    const hero = player.champions.find(c => c.id === heroId);
    if (!hero) return [];
    return hero.equippedArtifacts
      .map(id => player.artifacts.find(a => a.id === id))
      .filter((a): a is Artifact => a !== undefined);
  }, [player.champions, player.artifacts]);

  const getUnequippedArtifacts = useCallback((slotFilter?: ArtifactSlot): Artifact[] => {
    const equippedIds = new Set(player.champions.flatMap(c => c.equippedArtifacts));
    return player.artifacts.filter(a => {
      if (equippedIds.has(a.id)) return false;
      if (slotFilter && a.slot !== slotFilter) return false;
      return true;
    });
  }, [player.champions, player.artifacts]);

  const upgradeArtifact = useCallback((artifactId: string): boolean => {
    const art = player.artifacts.find(a => a.id === artifactId);
    if (!art || art.level >= MAX_ARTIFACT_LEVEL) return false;
    const cost = getArtifactUpgradeCost(art);
    if (player.runes < cost) return false;
    const upgraded = levelUpArtifact(art);
    if (!upgraded) return false;
    setPlayer(prev => {
      const newState = {
        ...prev,
        runes: prev.runes - cost,
        artifacts: prev.artifacts.map(a => a.id === artifactId ? upgraded : a),
      };
      // Advance tutorial step 36 → 37 when any artifact reaches level 5
      if (newState.tutorialStep === 36 && upgraded.level >= 5) {
        newState.tutorialStep = 37;
      }
      return newState;
    });
    incrementDailyQuest('forge_craft');
    gainAccountXp(5);
    return true;
  }, [player.artifacts, player.runes]);

  const upgradeArtifactStar = useCallback((artifactId: string, fodderIds: string[]): boolean => {
    const art = player.artifacts.find(a => a.id === artifactId);
    if (!art || art.stars >= MAX_ARTIFACT_STARS) return false;
    const cost = getArtifactStarUpgradeCost(art.stars);
    if (!cost) return false;
    const equippedIds = new Set(player.champions.flatMap(c => c.equippedArtifacts));
    const validFodder = fodderIds.filter(fId => {
      const f = player.artifacts.find(a => a.id === fId);
      return f && f.id !== artifactId && f.slot === art.slot && f.rarity === art.rarity && f.stars === art.stars && !equippedIds.has(f.id);
    });
    if (validFodder.length < cost) return false;
    const toConsume = new Set(validFodder.slice(0, cost));
    const upgraded = starUpgradeArtifact(art);
    if (!upgraded) return false;
    setPlayer(prev => {
      const newState = {
        ...prev,
        artifacts: prev.artifacts
          .filter(a => !toConsume.has(a.id))
          .map(a => a.id === artifactId ? upgraded : a),
        champions: prev.champions.map(pc => ({
          ...pc,
          equippedArtifacts: pc.equippedArtifacts.filter(id => !toConsume.has(id)),
        })),
      };
      // Advance forge tutorial step 46 → 47
      if (newState.tutorialStep === 46) {
        newState.tutorialStep = 47;
      }
      return newState;
    });
    return true;
  }, [player.artifacts, player.champions]);

  const toggleArtifactLock = useCallback((artifactId: string) => {
    setPlayer(prev => ({
      ...prev,
      artifacts: prev.artifacts.map(a =>
        a.id === artifactId ? { ...a, locked: !a.locked } : a
      ),
    }));
  }, []);

  const toggleHeroLock = useCallback((heroId: string) => {
    setPlayer(prev => ({
      ...prev,
      champions: prev.champions.map(c =>
        c.id === heroId ? { ...c, locked: !c.locked } : c
      ),
    }));
  }, []);

  const sellArtifacts = useCallback((artifactIds: string[]): { count: number; runesGained: number } => {
    const equippedSet = new Set(player.champions.flatMap(c => c.equippedArtifacts));
    const toSell = player.artifacts.filter(a => artifactIds.includes(a.id) && !equippedSet.has(a.id) && !a.locked);
    if (toSell.length === 0) return { count: 0, runesGained: 0 };
    const runesGained = toSell.reduce((sum, a) => sum + getArtifactSellPrice(a), 0);
    const sellIds = new Set(toSell.map(a => a.id));
    setPlayer(prev => {
      const newState = {
        ...prev,
        artifacts: prev.artifacts.filter(a => !sellIds.has(a.id)),
        runes: prev.runes + runesGained,
      };
      // Advance forge tutorial step 50 → 51
      if (newState.tutorialStep === 50) {
        newState.tutorialStep = 51;
        setTimeout(() => toast.success('🎓 Обучение завершено! Ты освоил Кузницу и продажу!'), 300);
      }
      return newState;
    });
    return { count: toSell.length, runesGained };
  }, [player.artifacts, player.champions]);

  const updateCampaignProgress = useCallback((difficulty: Difficulty, chapter: number, stageNumber: number, stageId: string, stars: number) => {
    setCampaignProgress(prev => {
      const current = prev[difficulty]?.[chapter]?.highestStage ?? 0;
      const currentStars = prev[difficulty]?.[chapter]?.stars ?? {};
      const existingStars = currentStars[stageId] ?? 0;
      const newHighest = Math.max(current, stageNumber);
      const newStars = Math.max(existingStars, stars);

      // Check if chapter was NOT fully cleared before this update
      const wasChapterCleared = current >= STAGES_PER_CHAPTER;

      const newProgress = {
        ...prev,
        [difficulty]: {
          ...prev[difficulty],
          [chapter]: {
            highestStage: newHighest,
            stars: { ...currentStars, [stageId]: newStars },
          },
        },
      };

      // First-time chapter completion — reward 100 energy
      if (!wasChapterCleared && newHighest >= STAGES_PER_CHAPTER) {
        setPlayer(p => ({ ...p, energy: p.energy + 100, lastEnergyUpdate: Date.now() }));
        toast.success('⚡ +100 Энергии за первое прохождение главы!');
      }

      return newProgress;
    });
    // Account XP & daily quests — outside setCampaignProgress to avoid stale closure
    setPlayer(prev => {
      const oldXp = prev.accountXp ?? 0;
      const newXp = oldXp + 15;
      const oldLevel = getAccountLevelFromXp(oldXp).level;
      const newLevel = getAccountLevelFromXp(newXp).level;
      const levelsGained = newLevel - oldLevel;
      if (levelsGained > 0) {
        const mrBonus = levelsGained * 10;
        const energyBonus = levelsGained * 10;
        toast.success(`Уровень ${newLevel}! +${mrBonus} МР, +${energyBonus} ⚡`);
        return { ...prev, accountXp: newXp, mithrilRunes: prev.mithrilRunes + mrBonus, energy: Math.min(prev.energy + energyBonus, prev.maxEnergy) };
      }
      return { ...prev, accountXp: newXp };
    });
    incrementDailyQuest('campaign_stages');
  }, [incrementDailyQuest]);

  const updateTempleProgress = useCallback((templeId: string, floor: number, stars: number) => {
    setTempleProgress(prev => {
      const existing = prev[templeId]?.[floor] ?? 0;
      if (stars <= existing) return prev;
      return {
        ...prev,
        [templeId]: {
          ...prev[templeId],
          [floor]: stars,
        },
      };
    });
    setPlayer(prev => {
      const oldXp = prev.accountXp ?? 0;
      const newXp = oldXp + 20;
      const oldLevel = getAccountLevelFromXp(oldXp).level;
      const newLevel = getAccountLevelFromXp(newXp).level;
      const levelsGained = newLevel - oldLevel;
      if (levelsGained > 0) {
        const mrBonus = levelsGained * 10;
        const energyBonus = levelsGained * 10;
        toast.success(`Уровень ${newLevel}! +${mrBonus} МР, +${energyBonus} ⚡`);
        return { ...prev, accountXp: newXp, mithrilRunes: prev.mithrilRunes + mrBonus, energy: Math.min(prev.energy + energyBonus, prev.maxEnergy) };
      }
      return { ...prev, accountXp: newXp };
    });
    incrementDailyQuest('temple_floors');
  }, [incrementDailyQuest]);

  const checkAndClaimChapterBonus = useCallback((difficulty: Difficulty, chapter: number) => {
    const key = chapterBonusKey(difficulty, chapter);
    if (chapterBonusesClaimed[key]) return null;
    if (!isChapterFullyCompleted(chapter, campaignProgress, difficulty)) return null;
    
    const reward = getChapterBonusReward(chapter);
    const artifacts = generateChapterBonusArtifacts(reward);
    
    // Claim it
    setChapterBonusesClaimed(prev => ({ ...prev, [key]: true }));
    setPlayer(prev => ({
      ...prev,
      souls: prev.souls + reward.souls,
      runes: prev.runes + reward.runes,
      mithrilRunes: prev.mithrilRunes + reward.mithrilRunes,
      artifacts: [...prev.artifacts, ...artifacts],
    }));
    
    return { claimed: true, souls: reward.souls, runes: reward.runes, mithrilRunes: reward.mithrilRunes, artifacts };
  }, [chapterBonusesClaimed, campaignProgress]);

  // ═══ Arena functions ═══
  
  // Gods coins regeneration tick
  useEffect(() => {
    const interval = setInterval(() => {
      setArenaState(prev => {
        const { coins, lastUpdate } = computeGodsCoins(prev.godsCoins, prev.lastGodsCoinUpdate);
        if (coins === prev.godsCoins) return prev;
        return { ...prev, godsCoins: coins, lastGodsCoinUpdate: lastUpdate };
      });
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const refreshArenaOpponents = useCallback(async () => {
    const prev = arenaStateRef.current;
    const todayStr = new Date().toDateString();
    const isNewDay = prev.lastRefreshDate !== todayStr;
    const freeUsed = isNewDay ? 0 : prev.arenaFreeRefreshCount;

    const allDefeated = prev.arenaOpponents.every(o => o.defeated);

    let canRefresh = false;
    let updates: Partial<ArenaState> = {};

    if (allDefeated) {
      canRefresh = true;
    } else if (freeUsed < FREE_REFRESHES_PER_DAY) {
      canRefresh = true;
      updates = { arenaFreeRefreshCount: freeUsed + 1, lastRefreshDate: todayStr };
    } else {
      const current = playerRef.current;
      if (current.mithrilRunes >= 10) {
        canRefresh = true;
        setPlayer(prev => ({ ...prev, mithrilRunes: prev.mithrilRunes - 10 }));
      }
    }

    if (!canRefresh) return;

    const newOpponents = user
      ? await fetchArenaOpponentsFromDB(prev.arenaRating, user.id, 10)
      : generateArenaOpponents(prev.arenaRating, 10);

    setArenaState(current => ({
      ...current,
      ...updates,
      arenaOpponents: newOpponents,
      arenaWinStreak: 0,
    }));
  }, [user]);

  const markArenaOpponentDefeated = useCallback(async (opponentId: string) => {
    const prev = arenaStateRef.current;
    const updated = prev.arenaOpponents.map(o =>
      o.id === opponentId ? { ...o, defeated: true } : o
    );
    const allDefeated = updated.every(o => o.defeated);

    // Immediately mark defeated
    const immediateState = { ...prev, arenaOpponents: updated };
    arenaStateRef.current = immediateState;
    setArenaState(immediateState);

    // Then async refresh if all defeated
    if (allDefeated) {
      const newOpponents = user
        ? await fetchArenaOpponentsFromDB(prev.arenaRating, user.id, 10)
        : generateArenaOpponents(prev.arenaRating, 10);
      setArenaState(current => {
        const refreshed = { ...current, arenaOpponents: newOpponents };
        arenaStateRef.current = refreshed;
        return refreshed;
      });
    }
  }, [user]);

  const updateArenaRating = useCallback((delta: number) => {
    setArenaState(prev => ({
      ...prev,
      arenaRating: Math.max(0, prev.arenaRating + delta),
      arenaWinStreak: delta < 0 ? 0 : prev.arenaWinStreak,
    }));
  }, []);

  const addArenaCoins = useCallback((tier: string, amount: number) => {
    setArenaState(prev => ({
      ...prev,
      arenaCoins: {
        ...prev.arenaCoins,
        [tier]: (prev.arenaCoins[tier] ?? 0) + amount,
      },
    }));
  }, []);

  const getWeekKeyForMilestone = () => {
    const now = new Date();
    const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
  };

  const processArenaVictory = useCallback(async (opponentId: string, ratingDelta: number, coinTier: string) => {
    const current = arenaStateRef.current;
    const { coins, lastUpdate } = computeGodsCoins(current.godsCoins, current.lastGodsCoinUpdate);
    const newStreak = (current.arenaWinStreak ?? 0) + 1;
    const streakBonus = newStreak === ARENA_WIN_STREAK_THRESHOLD ? ARENA_WIN_STREAK_BONUS : 0;
    if (streakBonus > 0) {
      toast.success(`🔥 ${ARENA_WIN_STREAK_THRESHOLD} побед подряд! +${ARENA_WIN_STREAK_BONUS} очков рейтинга!`);
    }
    const newRating = Math.max(0, current.arenaRating + ratingDelta + streakBonus);

    // Check for rank milestone reward
    const currentWeekKey = getWeekKeyForMilestone();
    let milestones = current.claimedRankMilestones ?? [];
    let milestoneWeek = current.lastMilestoneWeek ?? '';
    // Reset milestones if new week
    if (milestoneWeek !== currentWeekKey) {
      milestones = [];
      milestoneWeek = currentWeekKey;
    }
    const newMilestoneKey = getRankMilestoneKey(newRating);
    const oldMilestoneKey = getRankMilestoneKey(current.arenaRating);
    let milestoneBonus = 0;
    if (newMilestoneKey !== oldMilestoneKey && !milestones.includes(newMilestoneKey)) {
      milestoneBonus = ARENA_RANK_MILESTONE_REWARD;
      milestones = [...milestones, newMilestoneKey];
      toast.success(`🏆 Новый ранг! +${ARENA_RANK_MILESTONE_REWARD} Монет Богов!`);
    }

    const updatedOpponents = current.arenaOpponents.map(o =>
      o.id === opponentId ? { ...o, defeated: true } : o
    );
    const allDefeated = updatedOpponents.every(o => o.defeated);

    const immediateState = {
      ...current,
      arenaRating: newRating,
      arenaCoins: { ...current.arenaCoins, [coinTier]: (current.arenaCoins[coinTier] ?? 0) + 1 },
      arenaOpponents: updatedOpponents,
      godsCoins: coins + milestoneBonus,
      lastGodsCoinUpdate: lastUpdate,
      arenaWinStreak: streakBonus > 0 ? 0 : newStreak,
      claimedRankMilestones: milestones,
      lastMilestoneWeek: milestoneWeek,
    };
    arenaStateRef.current = immediateState;
    setArenaState(immediateState);

    // Track daily quests
    incrementDailyQuest('arena_battles');
    incrementDailyQuest('arena_wins');
    gainAccountXp(20);

    if (allDefeated) {
      const newOpponents = user
        ? await fetchArenaOpponentsFromDB(newRating, user.id, 10)
        : generateArenaOpponents(newRating, 10);
      setArenaState(prev => {
        const updated = { ...prev, arenaOpponents: newOpponents };
        arenaStateRef.current = updated;
        return updated;
      });
    }
  }, [user]);

  const spendGodsCoins = useCallback((amount: number): boolean => {
    const current = arenaStateRef.current;
    const { coins } = computeGodsCoins(current.godsCoins, current.lastGodsCoinUpdate);
    if (coins < amount) return false;
    const newState = { ...current, godsCoins: coins - amount, lastGodsCoinUpdate: Date.now() };
    arenaStateRef.current = newState;
    setArenaState(newState);
    return true;
  }, []);

  const addGodsCoins = useCallback((amount: number) => {
    setArenaState(prev => {
      const { coins } = computeGodsCoins(prev.godsCoins, prev.lastGodsCoinUpdate);
      const newState = { ...prev, godsCoins: coins + amount, lastGodsCoinUpdate: Date.now() };
      arenaStateRef.current = newState;
      return newState;
    });
  }, []);

  const claimDailyArenaReward = useCallback((): { souls: number; runes: number } | null => {
    const todayStr = new Date().toUTCString().slice(0, 16);
    const current = arenaStateRef.current;
    if (current.lastDailyReward === todayStr) return null;
    const rank = getRankFromRating(current.arenaRating);
    const reward = DAILY_ARENA_REWARDS[rank.tier];
    setPlayer(prev => ({
      ...prev,
      souls: prev.souls + reward.souls,
      runes: prev.runes + reward.runes,
    }));
    setArenaState(prev => ({ ...prev, lastDailyReward: todayStr }));
    return reward;
  }, []);

  const claimWeeklyArenaReward = useCallback((): boolean => {
    const current = arenaStateRef.current;
    const reward = current.pendingWeeklyReward;
    if (!reward) return false;
    setPlayer(prev => ({
      ...prev,
      souls: prev.souls + reward.souls,
      runes: prev.runes + reward.runes,
      mithrilRunes: prev.mithrilRunes + reward.mithrilRunes,
      artifacts: [...prev.artifacts, ...reward.artifacts],
    }));
    setArenaState(prev => {
      const { coins } = computeGodsCoins(prev.godsCoins, prev.lastGodsCoinUpdate);
      return { ...prev, godsCoins: coins + reward.godsCoins, lastGodsCoinUpdate: Date.now(), pendingWeeklyReward: null };
    });
    toast.success(`🏆 Награда за Арену (${reward.tierLabel})`, {
      description: `+${reward.souls} Душ, +${reward.runes} Рун${reward.mithrilRunes > 0 ? `, +${reward.mithrilRunes} МР` : ''}, +${reward.godsCoins} Монет Богов, ${reward.artifacts.length} артефактов`,
      duration: 8000,
    });
    return true;
  }, []);

  const addMithrilRunes = useCallback((amount: number) => {
    setPlayer(prev => ({ ...prev, mithrilRunes: prev.mithrilRunes + amount }));
  }, []);

  const grantVessel = useCallback((vesselRarity: string, count: number = 1) => {
    setPlayer(prev => ({
      ...prev,
      vessels: { ...prev.vessels, [vesselRarity]: (prev.vessels[vesselRarity as keyof typeof prev.vessels] ?? 0) + count },
    }));
  }, []);

  const spendMithrilRunes = useCallback((amount: number): boolean => {
    const current = playerRef.current;
    if (current.mithrilRunes < amount) return false;
    const updated = { ...current, mithrilRunes: current.mithrilRunes - amount };
    playerRef.current = updated;
    setPlayer(updated);
    return true;
  }, []);

  const buyGemstoneHero = useCallback((championId: string): boolean => {
    const current = playerRef.current;
    if (current.mithrilRunes < 1000) return false;
    const chosen = CHAMPIONS.find(c => c.id === championId && c.rarity === 'Самоцветный');
    if (!chosen) return false;
    const updated = {
      ...current,
      mithrilRunes: current.mithrilRunes - 1000,
      champions: [...current.champions, {
        id: nextId(),
        champion: chosen,
        level: 1,
        stars: 0,
        redStars: 0,
        xp: 0,
        currentHp: chosen.baseStats.hp,
        equippedArtifacts: [],
        equippedRelics: [],
      }],
    };
    playerRef.current = updated;
    setPlayer(updated);
    return true;
  }, []);

  const expandChampionSlots = useCallback((): boolean => {
    const current = playerRef.current;
    if (current.runes < SLOTS_EXPANSION_COST) {
      toast.error('Недостаточно Рун!');
      return false;
    }
    const updated = {
      ...current,
      runes: current.runes - SLOTS_EXPANSION_COST,
      championSlots: current.championSlots + SLOTS_EXPANSION_AMOUNT,
    };
    playerRef.current = updated;
    setPlayer(updated);
    toast.success(`+${SLOTS_EXPANSION_AMOUNT} мест в Дружине!`);
    return true;
  }, []);

  // ═══ Multi-battle daily limit ═══
  const getMultiBattleLimit = useCallback(() => {
    return isVipActive() ? 100 : 30;
  }, [isVipActive]);

  const getMultiBattlesRemaining = useCallback(() => {
    const today = new Date().toDateString();
    const p = playerRef.current;
    const limit = getMultiBattleLimit();
    if (p.multiBattlesDate !== today) return limit;
    return Math.max(0, limit - (p.multiBattlesUsedToday ?? 0));
  }, [getMultiBattleLimit]);

  const recordMultiBattles = useCallback((count: number) => {
    const today = new Date().toDateString();
    setPlayer(prev => {
      const isNewDay = prev.multiBattlesDate !== today;
      return {
        ...prev,
        multiBattlesUsedToday: (isNewDay ? 0 : (prev.multiBattlesUsedToday ?? 0)) + count,
        multiBattlesDate: today,
      };
    });
  }, []);

  // ═══ World Boss functions ═══

  const recordWorldBossDamage = useCallback((damage: number) => {
    const todayStr = new Date().toISOString().slice(0, 10);
    setPlayer(prev => {
      // Reset if new day
      const isNewDay = prev.lastWorldBossAttackDate !== todayStr;
      const attacksLeft = isNewDay ? 3 : prev.worldBossAttacksLeft;
      if (attacksLeft <= 0) return prev;
      return {
        ...prev,
        worldBossDamageToday: (isNewDay ? 0 : prev.worldBossDamageToday) + damage,
        worldBossAttacksLeft: attacksLeft - 1,
        lastWorldBossAttackDate: todayStr,
        worldBossRewardsClaimed: isNewDay ? false : prev.worldBossRewardsClaimed,
      };
    });
    incrementDailyQuest('boss_attack');
    gainAccountXp(15);
  }, []);

  const resetWorldBossDaily = useCallback(() => {
    setPlayer(prev => ({
      ...prev,
      worldBossDamageToday: 0,
      worldBossAttacksLeft: 3,
      worldBossRewardsClaimed: false,
    }));
  }, []);

  const claimWorldBossRewards = useCallback((runes: number, souls: number, artifacts: Artifact[]) => {
    setPlayer(prev => ({
      ...prev,
      runes: prev.runes + runes,
      souls: prev.souls + souls,
      artifacts: [...prev.artifacts, ...artifacts],
      worldBossRewardsClaimed: true,
    }));
  }, []);

  // ═══ Cerberus Boss functions ═══

  const recordCerberusDamage = useCallback((damage: number) => {
    const todayStr = new Date().toISOString().slice(0, 10);
    setPlayer(prev => {
      const isNewDay = prev.lastCerberusAttackDate !== todayStr;
      const attacksLeft = isNewDay ? 3 : prev.cerberusAttacksLeft;
      return {
        ...prev,
        cerberusDamageToday: (isNewDay ? 0 : prev.cerberusDamageToday) + damage,
        cerberusAttacksLeft: Math.max(0, attacksLeft - 1),
        lastCerberusAttackDate: todayStr,
        cerberusRewardsClaimed: isNewDay ? false : prev.cerberusRewardsClaimed,
      };
    });
  }, []);

  const resetCerberusDaily = useCallback(() => {
    setPlayer(prev => ({
      ...prev,
      cerberusDamageToday: 0,
      cerberusAttacksLeft: 3,
      cerberusRewardsClaimed: false,
    }));
  }, []);

  const claimCerberusRewards = useCallback((runes: number, souls: number, artifacts: Artifact[]) => {
    setPlayer(prev => ({
      ...prev,
      runes: prev.runes + runes,
      souls: prev.souls + souls,
      artifacts: [...prev.artifacts, ...artifacts],
      cerberusRewardsClaimed: true,
    }));
  }, []);

  const upgradeTowerStat = useCallback((element: string, stat: TowerStat): boolean => {
    const current = playerRef.current;
    const currentLevel = current.towerUpgrades[element]?.[stat] ?? 0;
    if (currentLevel >= MAX_TOWER_LEVEL) return false;
    const nextEntry = TOWER_UPGRADE_TABLE[currentLevel];
    if (!nextEntry) return false;
    const arenaCoins = arenaStateRef.current.arenaCoins;
    const { canAfford, spend } = getAvailableCoins(arenaCoins, nextEntry.coinTier, nextEntry.cost);
    if (!canAfford) return false;

    // Spend arena coins
    const newArenaCoins = { ...arenaCoins };
    for (const [tier, amount] of Object.entries(spend)) {
      newArenaCoins[tier] = (newArenaCoins[tier] ?? 0) - (amount as number);
    }
    const newArenaState = { ...arenaStateRef.current, arenaCoins: newArenaCoins };
    arenaStateRef.current = newArenaState;
    setArenaState(newArenaState);

    // Update tower level
    const newTower = {
      ...current.towerUpgrades,
      [element]: { ...current.towerUpgrades[element], [stat]: currentLevel + 1 },
    };
    const updated = { ...current, towerUpgrades: newTower };
    playerRef.current = updated;
    setPlayer(updated);
    // tower_upgrade quest removed
    return true;
  }, []);

  const updateAbyssProgress = useCallback((newProgress: AbyssProgress) => {
    setPlayer(prev => {
      // Grant account XP for abyss floor
      const oldXp = prev.accountXp ?? 0;
      const newXp = oldXp + 10;
      const oldLevel = getAccountLevelFromXp(oldXp).level;
      const newLevel = getAccountLevelFromXp(newXp).level;
      const levelsGained = newLevel - oldLevel;
      let extra: Record<string, any> = { accountXp: newXp };
      if (levelsGained > 0) {
        const mrBonus = levelsGained * 10;
        const energyBonus = levelsGained * 10;
        toast.success(`Уровень ${newLevel}! +${mrBonus} МР, +${energyBonus} ⚡`);
        extra = { ...extra, mithrilRunes: prev.mithrilRunes + mrBonus, energy: Math.min(prev.energy + energyBonus, prev.maxEnergy) };
      }
      const updated = { ...prev, ...extra, abyssProgress: newProgress };
      playerRef.current = updated;
      return updated;
    });
  }, []);

  const addRelic = useCallback((relicId: string) => {
    setPlayer(prev => {
      if (prev.relics.includes(relicId)) return prev;
      const updated = { ...prev, relics: [...prev.relics, relicId] };
      playerRef.current = updated;
      return updated;
    });
  }, []);

  const buyVessel = useCallback((vesselRarity: string, count: number = 1): boolean => {
    const vessel = VESSEL_TYPES.find((v) => v.id === vesselRarity);
    if (!vessel) return false;
    const p = playerRef.current;
    const totalCost = vessel.cost * count;
    if (p.souls < totalCost) return false;
    setPlayer(prev => {
      const updated = {
        ...prev,
        souls: prev.souls - totalCost,
        vessels: { ...prev.vessels, [vesselRarity]: (prev.vessels[vesselRarity as keyof typeof prev.vessels] ?? 0) + count },
      };
      playerRef.current = updated;
      return updated;
    });
    return true;
  }, []);

  const VESSEL_MR_COSTS: Record<string, number> = {
    'Обиходный': 9,
    'Заветный': 90,
    'Сказанный': 98,
    'Калиновый': 150,
    'Самоцветный': 640,
  };

  const buyVesselWithMR = useCallback((vesselRarity: string, count: number = 1): boolean => {
    const vessel = VESSEL_TYPES.find((v) => v.id === vesselRarity);
    if (!vessel) return false;
    const mrCost = VESSEL_MR_COSTS[vesselRarity];
    if (!mrCost) return false;
    const p = playerRef.current;
    const totalCost = mrCost * count;
    if (p.mithrilRunes < totalCost) return false;
    setPlayer(prev => {
      const updated = {
        ...prev,
        mithrilRunes: prev.mithrilRunes - totalCost,
        vessels: { ...prev.vessels, [vesselRarity]: (prev.vessels[vesselRarity as keyof typeof prev.vessels] ?? 0) + count },
      };
      playerRef.current = updated;
      return updated;
    });
    return true;
  }, []);

  const useVessel = useCallback((vesselRarity: string): Champion | null => {
    const vessel = VESSEL_TYPES.find((v) => v.id === vesselRarity);
    if (!vessel) return null;
    const p = playerRef.current;
    if ((p.vessels[vesselRarity as keyof typeof p.vessels] ?? 0) <= 0) return null;
    if (p.champions.length >= p.championSlots) {
      toast.error('Нет свободных мест в Дружине!');
      return null;
    }

    const pityResult = checkVesselPity(vessel.pityRules, p.vesselPity);
    let selectedRarity: Rarity;

    if (pityResult) {
      selectedRarity = pityResult.rarity;
    } else {
      const roll = Math.random();
      let cumulative = 0;
      selectedRarity = vessel.dropRates[0].rarity;
      for (const dr of vessel.dropRates) {
        cumulative += dr.chance;
        if (roll <= cumulative) { selectedRarity = dr.rarity; break; }
      }
    }

    let candidates = CHAMPIONS.filter(c => c.rarity === selectedRarity);
    if (vessel.excludeElements && vessel.excludeElements.length > 0) {
      candidates = candidates.filter(c => !vessel.excludeElements!.includes(c.element));
    }
    if (candidates.length === 0) candidates = CHAMPIONS.filter(c => c.rarity === selectedRarity);
    if (candidates.length === 0) return null;

    const hero = candidates[Math.floor(Math.random() * candidates.length)];
    const newPity = updateVesselPity(vessel.pityRules, p.vesselPity, selectedRarity);

    setPlayer(prev => {
      const newPc: PlayerChampion = {
        id: nextId(), champion: hero, level: 1, stars: 0, redStars: 0,
        xp: 0, currentHp: hero.baseStats.hp, equippedArtifacts: [], equippedRelics: [],
      };
      const updated = {
        ...prev,
        vessels: { ...prev.vessels, [vesselRarity]: (prev.vessels[vesselRarity as keyof typeof prev.vessels] ?? 0) - 1 },
        champions: [...prev.champions, newPc],
        vesselPity: newPity,
      // Advance tutorial: vessel opening steps 1→2→3→4→5
      tutorialStep: (prev.tutorialStep >= 1 && prev.tutorialStep <= 4) ? prev.tutorialStep + 1 : prev.tutorialStep,
      };
      playerRef.current = updated;
      return updated;
    });

    incrementDailyQuest('summon_heroes', 1);
    return hero;
  }, []);

  const useVessels = useCallback((vesselRarity: string, count: number): Champion[] => {
    const vessel = VESSEL_TYPES.find((v) => v.id === vesselRarity);
    if (!vessel) return [];
    const p = playerRef.current;
    const available = p.vessels[vesselRarity as keyof typeof p.vessels] ?? 0;
    const freeSlots = p.championSlots - p.champions.length;
    if (available <= 0 || freeSlots <= 0) return [];

    const actualCount = Math.min(count, available, freeSlots);
    const heroes: Champion[] = [];
    let pity = { ...p.vesselPity };

    const newChampions: PlayerChampion[] = [];
    for (let i = 0; i < actualCount; i++) {
      const pityResult = checkVesselPity(vessel.pityRules, pity);
      let selectedRarity: Rarity;

      if (pityResult) {
        selectedRarity = pityResult.rarity;
      } else {
        const roll = Math.random();
        let cumulative = 0;
        selectedRarity = vessel.dropRates[0].rarity;
        for (const dr of vessel.dropRates) {
          cumulative += dr.chance;
          if (roll <= cumulative) { selectedRarity = dr.rarity; break; }
        }
      }

      let candidates = CHAMPIONS.filter(c => c.rarity === selectedRarity);
      if (vessel.excludeElements && vessel.excludeElements.length > 0) {
        candidates = candidates.filter(c => !vessel.excludeElements!.includes(c.element));
      }
      if (candidates.length === 0) candidates = CHAMPIONS.filter(c => c.rarity === selectedRarity);
      if (candidates.length === 0) continue;

      const hero = candidates[Math.floor(Math.random() * candidates.length)];
      heroes.push(hero);
      pity = updateVesselPity(vessel.pityRules, pity, selectedRarity);

      newChampions.push({
        id: nextId(), champion: hero, level: 1, stars: 0, redStars: 0,
        xp: 0, currentHp: hero.baseStats.hp, equippedArtifacts: [], equippedRelics: [],
      });
    }

    if (heroes.length === 0) return [];

    setPlayer(prev => {
      const updated = {
        ...prev,
        vessels: { ...prev.vessels, [vesselRarity]: (prev.vessels[vesselRarity as keyof typeof prev.vessels] ?? 0) - heroes.length },
        champions: [...prev.champions, ...newChampions],
        vesselPity: pity,
        // Advance tutorial: vessel opening steps 1→5
        tutorialStep: (prev.tutorialStep >= 1 && prev.tutorialStep <= 4) ? Math.min(prev.tutorialStep + heroes.length, 5) : prev.tutorialStep,
      };
      playerRef.current = updated;
      return updated;
    });

    if (actualCount < count) {
      toast.info(`Призвано ${heroes.length} из ${count} — нет свободных мест или сосудов.`);
    }
    incrementDailyQuest('summon_heroes', heroes.length);
    return heroes;
  }, []);

  const equipRelic = useCallback((heroId: string, relicId: string): boolean => {
    const p = playerRef.current;
    if (!p.relics.includes(relicId)) return false;
    const pc = p.champions.find(c => c.id === heroId);
    if (!pc) return false;
    if ((pc.equippedRelics?.length ?? 0) >= 3) {
      toast.error('Максимум 3 реликвии на героя!');
      return false;
    }
    if (pc.equippedRelics?.includes(relicId)) return false;
    const alreadyEquipped = p.champions.some(c => c.id !== heroId && c.equippedRelics?.includes(relicId));
    if (alreadyEquipped) {
      toast.error('Эта реликвия уже экипирована на другом герое!');
      return false;
    }
    setPlayer(prev => {
      const updated = {
        ...prev,
        champions: prev.champions.map(c =>
          c.id === heroId ? { ...c, equippedRelics: [...(c.equippedRelics ?? []), relicId] } : c
        ),
      };
      playerRef.current = updated;
      return updated;
    });
    return true;
  }, []);

  const unequipRelic = useCallback((heroId: string, relicId: string) => {
    setPlayer(prev => {
      const updated = {
        ...prev,
        champions: prev.champions.map(c =>
          c.id === heroId ? { ...c, equippedRelics: (c.equippedRelics ?? []).filter(r => r !== relicId) } : c
        ),
      };
      playerRef.current = updated;
      return updated;
    });
  }, []);

  const furnaceEnhanceArtifact = useCallback((artifactId: string, bossId: string): boolean => {
    const art = playerRef.current.artifacts.find(a => a.id === artifactId);
    if (!art) return false;
    const currentLevel = art.furnaceLevel ?? 0;
    if (currentLevel >= MAX_FURNACE_LEVEL) return false;
    const cost = getFurnaceCost(currentLevel);
    const mats = playerRef.current.abyssProgress.materials ?? {};
    const available = mats[bossId] ?? 0;
    if (available < cost) return false;

    setPlayer(prev => ({
      ...prev,
      artifacts: prev.artifacts.map(a =>
        a.id === artifactId ? { ...a, furnaceLevel: (a.furnaceLevel ?? 0) + 1, furnaceBossId: bossId } : a
      ),
      abyssProgress: {
        ...prev.abyssProgress,
        materials: {
          ...(prev.abyssProgress.materials ?? {}),
          [bossId]: (prev.abyssProgress.materials?.[bossId] ?? 0) - cost,
        },
      },
    }));
    return true;
  }, []);
  const saveArenaSquad = useCallback(async () => {
    if (!user) return;
    const p = playerRef.current;
    const squadId = p.activeSquadId ?? 0;
    const squad = p.squads[squadId];
    if (!squad) return;
    const squadChampions = squad.members
      .map(pcId => p.champions.find(c => c.id === pcId))
      .filter((pc): pc is PlayerChampion => !!pc);
    
    // Save simplified champion data for arena display
    const arenaSquadData = squadChampions.map(pc => {
      const stats = getFullStats(pc);
      return {
        id: pc.champion.id,
        name: pc.champion.name,
        imageUrl: pc.champion.imageUrl,
        element: pc.champion.element,
        rarity: pc.champion.rarity,
        baseStats: stats,
        skills: pc.champion.skills,
      };
    });

    const squadPower = arenaSquadData.reduce((sum, c) => sum + calculateUnitPower(c.baseStats), 0);

    await supabase
      .from('profiles')
      .update({
        arena_squad: arenaSquadData as any,
        arena_power: squadPower,
      })
      .eq('id', user.id);
  }, [user, getFullStats]);

  const gainAccountXp = useCallback((amount: number) => {
    setPlayer(prev => {
      const oldXp = prev.accountXp ?? 0;
      const newXp = oldXp + amount;
      const oldLevel = getAccountLevelFromXp(oldXp).level;
      const newLevel = getAccountLevelFromXp(newXp).level;
      const levelsGained = newLevel - oldLevel;
      if (levelsGained > 0) {
        const mrBonus = levelsGained * 10;
        const energyBonus = levelsGained * 10;
        toast.success(`Уровень ${newLevel}! +${mrBonus} МР, +${energyBonus} ⚡`);
        const updated: any = {
          ...prev,
          accountXp: newXp,
          mithrilRunes: prev.mithrilRunes + mrBonus,
          energy: Math.min(prev.energy + energyBonus, prev.maxEnergy),
        };
        // Trigger forge tutorial when reaching level 5
        if (newLevel >= 5 && oldLevel < 5 && (prev.tutorialStep ?? 99) >= 40) {
          const tutWeapon1: Artifact = generateArtifact('Обиходный', 0, 1, undefined, 'weapon');
          const tutWeapon2: Artifact = generateArtifact('Обиходный', 0, 1, undefined, 'weapon');
          tutWeapon1.id = 'tutorial-forge-weapon-1';
          tutWeapon1.name = 'Учебный Меч';
          tutWeapon2.id = 'tutorial-forge-weapon-2';
          tutWeapon2.name = 'Учебный Меч';
          // Match primary stat so they're compatible
          tutWeapon2.primaryStat = tutWeapon1.primaryStat;
          tutWeapon2.primaryType = tutWeapon1.primaryType;
          tutWeapon2.primaryValue = tutWeapon1.primaryValue;
          tutWeapon2.set = tutWeapon1.set;
          updated.tutorialStep = 41;
          updated.artifacts = [...(updated.artifacts || prev.artifacts), tutWeapon1, tutWeapon2];
          setTimeout(() => toast('⚔️ Время изучить Кузницу!', { description: 'Открой Горн Древних' }), 500);
        }
        return updated;
      }
      return { ...prev, accountXp: newXp };
    });
  }, []);

  const advanceTutorial = useCallback((fromStep: number) => {
    setPlayer(prev => {
      if (prev.tutorialStep !== fromStep) return prev;
      const updated: any = { ...prev, tutorialStep: fromStep + 1 };
      // When advancing from 47→48, give a weapon for the sell tutorial
      if (fromStep === 47) {
        const sellWeapon: Artifact = generateArtifact('Обиходный', 0, 1, undefined, 'weapon');
        sellWeapon.id = 'tutorial-sell-weapon-1';
        sellWeapon.name = 'Ненужный Меч';
        updated.artifacts = [...prev.artifacts, sellWeapon];
      }
      playerRef.current = updated;
      return updated;
    });
  }, []);

  const accountLevel = useMemo(() => getAccountLevelFromXp(player.accountXp ?? 0).level, [player.accountXp]);

  if (!loaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="text-4xl animate-pulse mb-2">⚔️</div>
          <p className="text-muted-foreground font-kelly">Загрузка прогресса...</p>
        </div>
      </div>
    );
  }

  return (
    <GameContext.Provider value={{
      player,
      addChampion,
      removeFromSquad,
      addToSquad,
      setActiveSquad,
      renameSquad,
      addToSquadSlot,
      removeFromSquadSlot,
      addSquad,
      deleteSquad,
      spendSouls,
      addSouls,
      addRunes,
      addDivineRunes,
      summonHero,
      summonHeroWithPity,
      pityCounters: player.pityCounters,
      getSquadChampions,
      addArtifact,
      addArtifacts,
      equipArtifact,
      unequipArtifact,
      getHeroArtifacts,
      getUnequippedArtifacts,
      upgradeArtifact,
      upgradeArtifactStar,
      upgradeStar,
      ascendHero,
      addXpToSquad,
      feedHero,
      getDuplicates,
      getEffectiveStats,
      getFullStats,
      campaignProgress,
      chapterBonusesClaimed,
      updateCampaignProgress,
      templeProgress,
      updateTempleProgress,
      resetProgress,
      setUsername: setUsernameFunc,
      avatarUrl,
      setAvatarUrl,
      sellArtifacts,
      toggleArtifactLock,
      toggleHeroLock,
      checkAndClaimChapterBonus,
      spendEnergy,
      addEnergy,
      getEnergyInfo,
      arenaState,
      refreshArenaOpponents,
      markArenaOpponentDefeated,
      updateArenaRating,
      addArenaCoins,
      processArenaVictory,
      spendGodsCoins,
      claimDailyArenaReward,
      claimWeeklyArenaReward,
      addGodsCoins,
      addMithrilRunes,
      spendMithrilRunes,
      buyGemstoneHero,
      expandChampionSlots,
      recordWorldBossDamage,
      resetWorldBossDaily,
      claimWorldBossRewards,
      recordCerberusDamage,
      resetCerberusDaily,
      claimCerberusRewards,
      upgradeTowerStat,
      updateAbyssProgress,
      furnaceEnhanceArtifact,
      equipRelic,
      unequipRelic,
      addRelic,
      buyVessel,
      buyVesselWithMR,
      useVessel,
      useVessels,
      grantVessel,
      saveArenaSquad,
      saving,
      loaded,
      gainAccountXp,
      accountLevel,
      advanceTutorial,
      activateXpBooster,
      isXpBoosterActive,
      getXpBoosterTimeLeft,
      activateRuneBooster,
      isRuneBoosterActive,
      getRuneBoosterTimeLeft,
      activateSoulBooster,
      isSoulBoosterActive,
      getSoulBoosterTimeLeft,
      getMultiBattlesRemaining,
      getMultiBattleLimit,
      recordMultiBattles,
      isVipActive,
      getVipTimeLeft,
      buyVip,
      activateVipDays,
      claimVipDaily,
      canClaimVipDaily,
      claimLoginBonus,
      canClaimLoginBonus,
    }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}
