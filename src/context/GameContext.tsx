import React, { createContext, useContext, useState, useCallback, useRef, useEffect, type ReactNode } from 'react';

import { createInitialPlayerState, CHAMPIONS, SUMMON_RATES, FEED_XP, PITY_THRESHOLDS, PITY_PRIORITY, type PlayerState, type PlayerChampion, type Champion, type Rarity, type PityCounters, type Squad, DEFAULT_SQUADS, RARITY_ORDER, ENERGY_REGEN_INTERVAL, MAX_ENERGY, getEnergyCost, DEFAULT_CHAMPION_SLOTS, SLOTS_EXPANSION_AMOUNT, SLOTS_EXPANSION_COST } from '@/data/gameData';
import { type Artifact, type ArtifactSlot, canEquipSlot, levelUpArtifact, getArtifactUpgradeCost, MAX_ARTIFACT_LEVEL, MAX_ARTIFACT_STARS, getArtifactStarUpgradeCost, starUpgradeArtifact, calculateArtifactStats, getArtifactSellPrice } from '@/data/artifacts';
import { STAR_MULTIPLIERS, LEVEL_STAT_BONUS_PER_LEVEL, getNextLevelXp, getLevelFromXp, getStarUpgradeCost, MAX_LEVEL, MAX_STARS, RED_STAR_STAT_MULTIPLIERS, getAscensionCost, MAX_RED_STARS, ELEMENT_RUNE_KEY, XP_PER_LEVEL } from '@/data/upgradeData';
import { type CampaignProgress, type Difficulty, createInitialCampaignProgress, type ChapterBonusesClaimed, isChapterFullyCompleted, chapterBonusKey, STAGES_PER_CHAPTER } from '@/data/campaignStages';
import { getChapterBonusReward, generateChapterBonusArtifacts } from '@/data/chapterBonuses';
import { type ArenaState, createInitialArenaState, generateArenaOpponents, fetchArenaOpponentsFromDB, computeGodsCoins, getRankFromRating, getRankMilestoneKey, ARENA_WIN_RATING, ARENA_LOSS_RATING, FREE_REFRESHES_PER_DAY, GODS_COIN_MAX, applyWeeklyDecay, DAILY_ARENA_REWARDS, ARENA_WIN_STREAK_THRESHOLD, ARENA_WIN_STREAK_BONUS, ARENA_RANK_MILESTONE_REWARD } from '@/data/arenaData';
import { createInitialTowerUpgrades, type TowerUpgrades, type TowerStat, type TowerCoinTier, TOWER_UPGRADE_TABLE, MAX_TOWER_LEVEL, getAvailableCoins, getTowerBonus, TOWER_ELEMENTS, TOWER_STATS } from '@/data/towerData';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SavedGameData {
  player: PlayerState;
  campaignProgress: CampaignProgress;
  chapterBonusesClaimed?: ChapterBonusesClaimed;
  arenaState?: ArenaState;
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
  addDivineRunes: (element: string, amount: number) => void;
  setUsername: (name: string) => void;
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
  saving: boolean;
  loaded: boolean;
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
    })),
  };
}

// Deserialize from DB back to PlayerState
function deserializePlayer(data: any): PlayerState | null {
  if (!data || !data.champions) return null;
  try {
    return {
      username: data.username ?? 'Витязь',
      souls: data.souls ?? 0,
      runes: data.runes ?? 0,
      mithrilRunes: data.mithrilRunes ?? 0,
      energy: data.energy ?? MAX_ENERGY,
      maxEnergy: data.maxEnergy ?? MAX_ENERGY,
      championSlots: data.championSlots ?? 200,
      lastEnergyUpdate: data.lastEnergyUpdate ?? Date.now(),
      champions: (data.champions as any[]).map(pc => {
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
        };
      }).filter((c): c is PlayerChampion => c !== null),
      squad: data.squad ?? [],
      squads: data.squads ?? DEFAULT_SQUADS.map(s => ({ ...s })),
      activeSquadId: data.activeSquadId ?? 0,
      artifacts: data.artifacts ?? [],
      pityCounters: data.pityCounters ?? { 'Заветный': 0, 'Сказанный': 0, 'Калиновый': 0, 'Самоцветный': 0 },
      divineRunes: data.divineRunes ?? { 'Огонь': 0, 'Вода': 0, 'Лес': 0, 'Камень': 0, 'Тень': 0, 'Свет': 0, 'Божественность': 0 },
      worldBossDamageToday: data.worldBossDamageToday ?? 0,
      worldBossAttacksLeft: data.worldBossAttacksLeft ?? 3,
      lastWorldBossAttackDate: data.lastWorldBossAttackDate ?? '',
      worldBossRewardsClaimed: data.worldBossRewardsClaimed ?? false,
      cerberusDamageToday: data.cerberusDamageToday ?? 0,
      cerberusAttacksLeft: data.cerberusAttacksLeft ?? 3,
      lastCerberusAttackDate: data.lastCerberusAttackDate ?? '',
      cerberusRewardsClaimed: data.cerberusRewardsClaimed ?? false,
      towerUpgrades: data.towerUpgrades ?? createInitialTowerUpgrades(),
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
    setLoaded(false);
  }, [user]);

  // Load game data from DB
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function load() {
      const { data, error } = await supabase
        .from('profiles')
        .select('game_data, username')
        .eq('id', user!.id)
        .single();

      if (cancelled) return;

      // Get the username from the profile (set during registration)
      const profileUsername = data?.username || '';

      if (!error && data?.game_data && typeof data.game_data === 'object') {
        const saved = data.game_data as any;
        const restoredPlayer = deserializePlayer(saved.player);
        if (restoredPlayer) {
          // Use profile username if the player still has the default name
          if (profileUsername && (restoredPlayer.username === 'Витязь' || !restoredPlayer.username)) {
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
        }
        if (saved.campaignProgress) {
          setCampaignProgress(saved.campaignProgress);
        }
        if (saved.chapterBonusesClaimed) {
          setChapterBonusesClaimed(saved.chapterBonusesClaimed);
        }
        if (saved.arenaState) {
          const decayed = applyWeeklyDecay(saved.arenaState);
          setArenaState(decayed);
        }
      } else if (profileUsername) {
        // New account — no game_data yet, use profile username as initial name
        setPlayer(prev => ({ ...prev, username: profileUsername }));
      }
      setLoaded(true);
    }

    load();
    return () => { cancelled = true; };
  }, [user]);

  // Save function with retry
  const saveGameData = useCallback(async (retries = 2) => {
    if (!user) return;
    setSaving(true);
    const gameData: SavedGameData = {
      player: serializePlayer(playerRef.current) as any,
      campaignProgress,
      chapterBonusesClaimed,
      arenaState: arenaStateRef.current,
    };
    for (let attempt = 0; attempt <= retries; attempt++) {
      const { error } = await supabase
        .from('profiles')
        .update({
          game_data: gameData as any,
          arena_rating: arenaStateRef.current.arenaRating,
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
  }, [user, campaignProgress, chapterBonusesClaimed]);

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
  }, [player, campaignProgress, chapterBonusesClaimed, arenaState, user, loaded, saveGameData]);

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
          updated_at: new Date().toISOString(),
        }));
      } catch (e) {
        console.error('Emergency save failed:', e);
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [user, campaignProgress, chapterBonusesClaimed]);

  // Reset progress
  const resetProgress = useCallback(async () => {
    const initial = createInitialPlayerState();
    // Preserve the player's username
    initial.username = player.username || 'Витязь';
    const initialCampaign = createInitialCampaignProgress();
    setPlayer(initial);
    setCampaignProgress(initialCampaign);
    setChapterBonusesClaimed({});
    setArenaState(createInitialArenaState());
    uidRef.current = 0;

    if (user) {
      const gameData: SavedGameData = {
        player: serializePlayer(initial) as any,
        campaignProgress: initialCampaign,
        chapterBonusesClaimed: {},
        arenaState: createInitialArenaState(),
      };
      await Promise.all([
        supabase
          .from('profiles')
          .update({ game_data: gameData as any, arena_rating: 0, arena_power: 0, updated_at: new Date().toISOString() })
          .eq('id', user.id),
        supabase
          .from('world_boss_damage')
          .delete()
          .eq('user_id', user.id),
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
      return { ...prev, squads, squad: activeMembers };
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
    setPlayer(prev => ({ ...prev, souls: prev.souls + amount }));
  }, []);

  const addRunes = useCallback((amount: number) => {
    setPlayer(prev => ({ ...prev, runes: prev.runes + amount }));
  }, []);

  const addDivineRunes = useCallback((element: string, amount: number) => {
    setPlayer(prev => ({
      ...prev,
      divineRunes: {
        ...prev.divineRunes,
        [element]: (prev.divineRunes[element as keyof typeof prev.divineRunes] ?? 0) + amount,
      },
    }));
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
        });
      }
      
      resultHeroes = heroes;
      
      return {
        ...prev,
        champions: [...prev.champions, ...newChampions],
        pityCounters: counters,
      };
    });
    
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
    const cost = getStarUpgradeCost(stars);
    if (!cost || fodderIds.length < cost) return false;
    const validFodder = fodderIds.filter(fId => {
      const f = player.champions.find(c => c.id === fId);
      return f && f.champion.id === hero.champion.id && f.id !== pcId && !f.locked && f.level >= MAX_LEVEL;
    });
    if (validFodder.length < cost) return false;
    const toConsume = new Set(validFodder.slice(0, cost));
    setPlayer(prev => ({
      ...prev,
      champions: prev.champions
        .filter(c => !toConsume.has(c.id))
        .map(c => c.id === pcId ? { ...c, stars: stars + 1 } : c),
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
    const elementRunes = player.divineRunes[elementKey as keyof typeof player.divineRunes] ?? 0;
    const divineRunes = player.divineRunes['Божественность' as keyof typeof player.divineRunes] ?? 0;
    if (elementRunes < cost.elementRunes || divineRunes < cost.divineRunes) return false;

    setPlayer(prev => ({
      ...prev,
      divineRunes: {
        ...prev.divineRunes,
        [elementKey]: (prev.divineRunes[elementKey as keyof typeof prev.divineRunes] ?? 0) - cost.elementRunes,
        'Божественность': (prev.divineRunes['Божественность'] ?? 0) - cost.divineRunes,
      },
      champions: prev.champions.map(c =>
        c.id === pcId ? { ...c, redStars: currentRed + 1 } : c
      ),
    }));
    return true;
  }, [player.champions, player.divineRunes]);

  const addXpToSquad = useCallback((totalXp: number) => {
    setPlayer(prev => {
      const squadChampions = prev.champions.filter(c => prev.squad.includes(c.id));
      if (squadChampions.length === 0) return prev;

      // Only give XP to heroes below max level
      const eligibleMembers = squadChampions.filter(c => c.level < MAX_LEVEL);
      if (eligibleMembers.length === 0) return prev;

      const smallSquadBonus = eligibleMembers.length < 4 ? 1.1 : 1;
      const xpEach = Math.floor((totalXp / eligibleMembers.length) * smallSquadBonus);

      return {
        ...prev,
        champions: prev.champions.map(c => {
          if (!prev.squad.includes(c.id)) return c;
          if (c.level >= MAX_LEVEL) return c;
          const maxXp = XP_PER_LEVEL[MAX_LEVEL] ?? Infinity;
          const newXp = Math.min(c.xp + xpEach, maxXp);
          const newLevel = Math.min(getLevelFromXp(newXp), MAX_LEVEL);
          return { ...c, xp: newXp, level: newLevel };
        }),
      };
    });
  }, []);

  const feedHero = useCallback((targetPcId: string, fodderPcIds: string[]): { xpGained: number; heroesConsumed: number } => {
    const target = player.champions.find(c => c.id === targetPcId);
    if (!target) return { xpGained: 0, heroesConsumed: 0 };

    // If already max level, don't consume anyone
    if (target.level >= MAX_LEVEL) return { xpGained: 0, heroesConsumed: 0 };

    const fodderHeroes = player.champions.filter(c => fodderPcIds.includes(c.id) && c.id !== targetPcId && !c.locked);
    if (fodderHeroes.length === 0) return { xpGained: 0, heroesConsumed: 0 };

    // Calculate max XP needed to reach level 50
    const maxXp = XP_PER_LEVEL[MAX_LEVEL] ?? Infinity;
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
      const newLevel = Math.min(getLevelFromXp(newXp), MAX_LEVEL);
      return {
        ...prev,
        champions: prev.champions
          .filter(c => !consumedSet.has(c.id) || c.id === targetPcId)
          .map(c => c.id === targetPcId ? { ...c, xp: newXp, level: newLevel } : c),
        squad: prev.squad.filter(id => !consumedSet.has(id) || id === targetPcId),
      };
    });
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
    const totalMult = (starMult + redStarBonus) * levelMult;
    const base = pc.champion.baseStats;
    const element = pc.champion.element;
    const tu = playerRef.current.towerUpgrades;
    const tHp = 1 + (getTowerBonus(tu, element, 'hp') / 100);
    const tAtk = 1 + (getTowerBonus(tu, element, 'atk') / 100);
    const tDef = 1 + (getTowerBonus(tu, element, 'def') / 100);
    const tCrit = getTowerBonus(tu, element, 'critChance');
    const tRes = getTowerBonus(tu, element, 'resistance');
    const tAcc = getTowerBonus(tu, element, 'accuracy');
    return {
      hp: Math.floor(base.hp * totalMult * tHp),
      atk: Math.floor(base.atk * totalMult * tAtk),
      def: Math.floor(base.def * totalMult * tDef),
      spd: Math.floor(base.spd * totalMult),
      critChance: base.critChance + tCrit,
      critDmg: base.critDmg,
      resistance: base.resistance + tRes,
      accuracy: base.accuracy + tAcc,
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
  }, []);

  const addArtifacts = useCallback((artifacts: Artifact[]) => {
    setPlayer(prev => ({ ...prev, artifacts: [...prev.artifacts, ...artifacts] }));
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
      return {
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
    setPlayer(prev => ({
      ...prev,
      runes: prev.runes - cost,
      artifacts: prev.artifacts.map(a => a.id === artifactId ? upgraded : a),
    }));
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
    setPlayer(prev => ({
      ...prev,
      artifacts: prev.artifacts
        .filter(a => !toConsume.has(a.id))
        .map(a => a.id === artifactId ? upgraded : a),
      champions: prev.champions.map(pc => ({
        ...pc,
        equippedArtifacts: pc.equippedArtifacts.filter(id => !toConsume.has(id)),
      })),
    }));
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
    setPlayer(prev => ({
      ...prev,
      artifacts: prev.artifacts.filter(a => !sellIds.has(a.id)),
      runes: prev.runes + runesGained,
    }));
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
  }, []);

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

  const addMithrilRunes = useCallback((amount: number) => {
    setPlayer(prev => ({ ...prev, mithrilRunes: prev.mithrilRunes + amount }));
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
      if (attacksLeft <= 0) return prev;
      return {
        ...prev,
        cerberusDamageToday: (isNewDay ? 0 : prev.cerberusDamageToday) + damage,
        cerberusAttacksLeft: attacksLeft - 1,
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
    return true;
  }, []);

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
      resetProgress,
      setUsername: setUsernameFunc,
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
      saving,
      loaded,
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
