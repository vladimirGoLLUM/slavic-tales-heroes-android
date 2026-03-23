import { type Champion, CHAMPIONS, type Rarity } from './gameData';
import { type ArtifactRarity, generateArtifact, type Artifact } from './artifacts';
import { supabase } from '@/integrations/supabase/client';

// ═══════════════════════════════════════════════════
// Arena: Колизей Богов — ranks, opponents, coins
// ═══════════════════════════════════════════════════

export type ArenaMetalTier = 'Ярь-Медь' | 'Кованое Серебро' | 'Червонное Золото' | 'Пламень-Сталь' | 'Лунный Мефрил';

export interface ArenaRankInfo {
  tier: ArenaMetalTier;
  subRank: number; // 1-5
  label: string;
  minRating: number;
  maxRating: number;
}

export const ARENA_TIERS: { tier: ArenaMetalTier; baseRating: number; color: string; icon: string }[] = [
  { tier: 'Ярь-Медь', baseRating: 0, color: 'text-amber-600', icon: '🟤' },
  { tier: 'Кованое Серебро', baseRating: 1000, color: 'text-slate-300', icon: '⚪' },
  { tier: 'Червонное Золото', baseRating: 2000, color: 'text-yellow-400', icon: '🟡' },
  { tier: 'Пламень-Сталь', baseRating: 3000, color: 'text-orange-500', icon: '🔶' },
  { tier: 'Лунный Мефрил', baseRating: 4000, color: 'text-cyan-300', icon: '💎' },
];

export const ARENA_COIN_TYPES: Record<ArenaMetalTier, { name: string; icon: string }> = {
  'Ярь-Медь': { name: 'Монета Ярилы', icon: '🪙' },
  'Кованое Серебро': { name: 'Сребреник Велеса', icon: '🥈' },
  'Червонное Золото': { name: 'Златник Даждьбога', icon: '🥇' },
  'Пламень-Сталь': { name: 'Пламень Сварога', icon: '🔥' },
  'Лунный Мефрил': { name: 'Луна Велеса', icon: '🌙' },
};

export const GODS_COIN_MAX = 10;
export const GODS_COIN_REGEN_MS = 60 * 60 * 1000; // 1 hour
export const FREE_REFRESHES_PER_DAY = 3;
export const ARENA_WIN_RATING = 10;
export const ARENA_LOSS_RATING = 8;

export const DAILY_ARENA_REWARDS: Record<ArenaMetalTier, { souls: number; runes: number }> = {
  'Ярь-Медь':         { souls: 50,  runes: 500 },
  'Кованое Серебро':   { souls: 100, runes: 1000 },
  'Червонное Золото':  { souls: 150, runes: 1500 },
  'Пламень-Сталь':     { souls: 200, runes: 2000 },
  'Лунный Мефрил':     { souls: 250, runes: 2500 },
};

/** Returns ms until next midnight UTC */
export function getTimeUntilDailyReset(): number {
  const now = new Date();
  const tomorrow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0));
  return tomorrow.getTime() - now.getTime();
}

export function getRankFromRating(rating: number): ArenaRankInfo {
  // Лунный Мефрил — no cap
  if (rating >= 4000) {
    const sub = Math.min(5, Math.floor((rating - 4000) / 200) + 1);
    return {
      tier: 'Лунный Мефрил',
      subRank: sub,
      label: `Лунный Мефрил ${toRoman(sub)}`,
      minRating: 4000 + (sub - 1) * 200,
      maxRating: sub >= 5 ? Infinity : 4000 + sub * 200 - 1,
    };
  }

  for (let i = ARENA_TIERS.length - 1; i >= 0; i--) {
    const t = ARENA_TIERS[i];
    if (rating >= t.baseRating) {
      const offset = rating - t.baseRating;
      const sub = Math.min(5, Math.floor(offset / 200) + 1);
      return {
        tier: t.tier,
        subRank: sub,
        label: `${t.tier} ${toRoman(sub)}`,
        minRating: t.baseRating + (sub - 1) * 200,
        maxRating: t.baseRating + sub * 200 - 1,
      };
    }
  }

  return { tier: 'Ярь-Медь', subRank: 1, label: 'Ярь-Медь I', minRating: 0, maxRating: 199 };
}

function toRoman(n: number): string {
  return ['I', 'II', 'III', 'IV', 'V'][n - 1] || String(n);
}

export function getTierColor(tier: ArenaMetalTier): string {
  return ARENA_TIERS.find(t => t.tier === tier)?.color ?? 'text-foreground';
}

export function getTierIcon(tier: ArenaMetalTier): string {
  return ARENA_TIERS.find(t => t.tier === tier)?.icon ?? '⚔️';
}

// ═══════════════════════════════════════════════════
// Weekly rewards by tier
// ═══════════════════════════════════════════════════

export interface WeeklyChestReward {
  rarity: 'Обиходный' | 'Заветный' | 'Сказанный' | 'Калиновый' | 'Самоцветный';
  sets: string[];  // forced arena sets
  countByRank: number[];  // index 0 = rank1, index 4 = rank5
}

export interface WeeklyChestRewardMefril {
  rarity: 'Самоцветный';
  sets: string[];
  countByPlace: { top1: number; top2: number; top3: number; rest: number };
}

export interface WeeklyArenaReward {
  souls: number;
  runes: number;
  mithrilRunes: number;
  godsCoins: number | { top1: number; top2: number; top3: number; rest: number };
  chest: WeeklyChestReward | WeeklyChestRewardMefril;
}

const ARENA_CHEST_SETS = ['Воля Волхва', 'Крик Леля', 'Зов Перуна'];

export const WEEKLY_ARENA_REWARDS: Record<ArenaMetalTier, WeeklyArenaReward> = {
  'Ярь-Медь':         { souls: 200,   runes: 500,    mithrilRunes: 0,   godsCoins: 100,  chest: { rarity: 'Обиходный',  sets: ARENA_CHEST_SETS, countByRank: [1, 2, 3, 4, 5] } },
  'Кованое Серебро':   { souls: 500,   runes: 1500,   mithrilRunes: 50,  godsCoins: 200,  chest: { rarity: 'Заветный',   sets: ARENA_CHEST_SETS, countByRank: [1, 2, 3, 4, 5] } },
  'Червонное Золото':  { souls: 1000,  runes: 3000,   mithrilRunes: 100, godsCoins: 300,  chest: { rarity: 'Сказанный',  sets: ARENA_CHEST_SETS, countByRank: [1, 2, 3, 4, 5] } },
  'Пламень-Сталь':     { souls: 2000,  runes: 5000,   mithrilRunes: 200, godsCoins: 500,  chest: { rarity: 'Калиновый',  sets: ARENA_CHEST_SETS, countByRank: [1, 2, 3, 4, 5] } },
  'Лунный Мефрил':     { souls: 3000,  runes: 10000,  mithrilRunes: 500, godsCoins: { top1: 2000, top2: 1500, top3: 1000, rest: 700 }, chest: { rarity: 'Самоцветный', sets: ARENA_CHEST_SETS, countByPlace: { top1: 5, top2: 4, top3: 3, rest: 2 } } },
};

export function getWeeklyChestCount(reward: WeeklyArenaReward, subRank: number, position?: number): number {
  const chest = reward.chest;
  if ('countByPlace' in chest) {
    if (position === 1) return chest.countByPlace.top1;
    if (position === 2) return chest.countByPlace.top2;
    if (position === 3) return chest.countByPlace.top3;
    return chest.countByPlace.rest;
  }
  return chest.countByRank[Math.min(subRank - 1, chest.countByRank.length - 1)] ?? 1;
}

export function getWeeklyGodsCoins(tier: ArenaMetalTier, position: number): number {
  const reward = WEEKLY_ARENA_REWARDS[tier];
  if (typeof reward.godsCoins === 'number') return reward.godsCoins;
  if (position === 1) return reward.godsCoins.top1;
  if (position === 2) return reward.godsCoins.top2;
  if (position === 3) return reward.godsCoins.top3;
  return reward.godsCoins.rest;
}

/** Returns ms until next Sunday 00:00 UTC */
export function getTimeUntilWeeklyReset(): number {
  const now = new Date();
  const dayOfWeek = now.getUTCDay(); // 0=Sun
  const daysUntilSun = dayOfWeek === 0 ? 7 : 7 - dayOfWeek;
  const nextSunday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + daysUntilSun, 0, 0, 0));
  return nextSunday.getTime() - now.getTime();
}

// ═══════════════════════════════════════════════════
// Opponent generation
// ═══════════════════════════════════════════════════

const SLAVIC_NAMES = [
  'Ратибор', 'Святослав', 'Любомир', 'Велимир', 'Ярополк',
  'Мстислав', 'Радогост', 'Всеволод', 'Горислав', 'Златогор',
  'Светозар', 'Добрыня', 'Буревой', 'Лютобор', 'Вышеслав',
  'Гостомысл', 'Хотен', 'Борислав', 'Ростислав', 'Изяслав',
  'Тихомир', 'Вышата', 'Нежата', 'Рогволод', 'Белояр',
  'Путята', 'Воислав', 'Твердислав', 'Ядрей', 'Жизнобуд',
];

export interface ArenaOpponent {
  id: string;
  name: string;
  rating: number;
  power: number;
  heroes: Champion[];
  defeated: boolean;
}

/** Scale hero stats for arena opponent based on rating */
function scaleChampionForRating(champion: Champion, rating: number): Champion {
  // Base scale: at 0 rating = 1.8x, at 4000 = 5.5x (Ярь-Медь starts ~15k power)
  const scale = 1.8 + (rating / 4000) * 3.7;
  return {
    ...champion,
    baseStats: {
      hp: Math.floor(champion.baseStats.hp * scale),
      atk: Math.floor(champion.baseStats.atk * scale),
      def: Math.floor(champion.baseStats.def * scale),
      spd: Math.floor(champion.baseStats.spd * (0.8 + scale * 0.2)),
      critChance: champion.baseStats.critChance,
      critDmg: champion.baseStats.critDmg,
      resistance: Math.floor(champion.baseStats.resistance * (0.8 + scale * 0.2)),
      accuracy: Math.floor(champion.baseStats.accuracy * (0.8 + scale * 0.2)),
    },
  };
}

function calculatePowerFromStats(stats: Champion['baseStats']): number {
  return stats.hp + stats.atk * 4 + stats.def * 3 + stats.spd * 5;
}

export function generateArenaOpponents(playerRating: number, count: number = 10): ArenaOpponent[] {
  const opponents: ArenaOpponent[] = [];
  const usedNames = new Set<string>();

  for (let i = 0; i < count; i++) {
    // Rating spread: ±100 from player rating
    const opponentRating = Math.max(0, playerRating + Math.floor((Math.random() - 0.5) * 200));

    // Pick name
    let name: string;
    do {
      name = SLAVIC_NAMES[Math.floor(Math.random() * SLAVIC_NAMES.length)];
    } while (usedNames.has(name) && usedNames.size < SLAVIC_NAMES.length);
    usedNames.add(name);

    // Pick 4 random heroes
    const shuffled = [...CHAMPIONS].sort(() => Math.random() - 0.5);
    const heroes = shuffled.slice(0, 4).map(c => scaleChampionForRating(c, opponentRating));

    const power = heroes.reduce((sum, h) => sum + calculatePowerFromStats(h.baseStats), 0);

    opponents.push({
      id: `arena-opp-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
      name,
      rating: opponentRating,
      power,
      heroes,
      defeated: false,
    });
  }

  // Sort by power
  opponents.sort((a, b) => a.power - b.power);
  return opponents;
}

/**
 * Fetch real players/bots from DB as arena opponents.
 * Falls back to generated opponents if not enough real players found.
 */
export async function fetchArenaOpponentsFromDB(
  playerRating: number,
  currentUserId: string,
  count: number = 10
): Promise<ArenaOpponent[]> {
  try {
    const minRating = Math.max(0, playerRating - 200);
    const maxRating = playerRating + 200;

    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, username, arena_rating, arena_power')
      .neq('id', currentUserId)
      .gte('arena_rating', minRating)
      .lte('arena_rating', maxRating)
      .order('arena_rating', { ascending: false })
      .limit(30);

    if (error || !profiles || profiles.length === 0) {
      return generateArenaOpponents(playerRating, count);
    }

    const shuffled = [...profiles].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, count);

    const opponents: ArenaOpponent[] = selected.map((p, i) => {
      const rating = p.arena_rating ?? 0;
      const heroPool = [...CHAMPIONS].sort(() => Math.random() - 0.5);
      const heroes = heroPool.slice(0, 4).map(c => scaleChampionForRating(c, rating));
      const power = p.arena_power || heroes.reduce((sum, h) => sum + calculatePowerFromStats(h.baseStats), 0);

      return {
        id: `arena-db-${p.id}-${Date.now()}-${i}`,
        name: p.username || 'Витязь',
        rating,
        power,
        heroes,
        defeated: false,
      };
    });

    if (opponents.length < count) {
      const generated = generateArenaOpponents(playerRating, count - opponents.length);
      opponents.push(...generated);
    }

    opponents.sort((a, b) => a.power - b.power);
    return opponents;
  } catch {
    return generateArenaOpponents(playerRating, count);
  }
}


// Gods coins computation (like energy)
// ═══════════════════════════════════════════════════

export function computeGodsCoins(current: number, lastUpdate: number): { coins: number; lastUpdate: number } {
  const now = Date.now();
  const elapsed = now - lastUpdate;
  const regen = Math.floor(elapsed / GODS_COIN_REGEN_MS);
  if (regen <= 0 || current >= GODS_COIN_MAX) return { coins: current, lastUpdate };
  const newCoins = Math.min(current + regen, GODS_COIN_MAX);
  const usedTime = regen * GODS_COIN_REGEN_MS;
  return { coins: newCoins, lastUpdate: lastUpdate + usedTime };
}

// ═══════════════════════════════════════════════════
// Weekly rewards
// ═══════════════════════════════════════════════════

const TIER_ARTIFACT_RARITY: Record<ArenaMetalTier, ArtifactRarity> = {
  'Ярь-Медь': 'Обиходный',
  'Кованое Серебро': 'Заветный',
  'Червонное Золото': 'Сказанный',
  'Пламень-Сталь': 'Калиновый',
  'Лунный Мефрил': 'Самоцветный',
};

export const ARENA_SETS = ['Воля Волхва', 'Крик Леля', 'Зов Перуна'] as const;
export type ArenaArtifactSet = typeof ARENA_SETS[number];

export function generateWeeklyRewardArtifacts(tier: ArenaMetalTier, subRank: number): Artifact[] {
  const rarity = TIER_ARTIFACT_RARITY[tier];
  const count = subRank; // 1-5 artifacts based on subrank
  const artifacts: Artifact[] = [];
  for (let i = 0; i < count; i++) {
    artifacts.push(generateArtifact(rarity));
  }
  return artifacts;
}

// ═══════════════════════════════════════════════════
// Leaderboard
// ═══════════════════════════════════════════════════

export interface LeaderboardEntry {
  name: string;
  rating: number;
  power: number;
  tier: ArenaMetalTier;
  isPlayer?: boolean;
}

const LEADERBOARD_NAMES = [
  'Кощей', 'Илья Муромец', 'Алёша Попович', 'Добрыня Никитич',
  'Василиса', 'Марья Моревна', 'Садко', 'Вольга',
  'Микула', 'Святогор', 'Полкан', 'Финист',
  'Кудеяр', 'Ставр', 'Дюк', 'Чурило',
  'Соловей', 'Горыня', 'Дубыня', 'Усыня',
  'Суровец', 'Потык', 'Хотен', 'Данила',
  'Сухман', 'Бермята', 'Калин', 'Тугарин',
  'Идолище', 'Жихарь', 'Колыван', 'Вольт',
  'Пересвет', 'Ослябя', 'Евпатий', 'Боян',
  'Баян', 'Лель', 'Купала', 'Ярило',
  'Стрибог', 'Хорс', 'Семаргл', 'Волос',
  'Мокошь', 'Лада', 'Жива', 'Берегиня',
  'Сварожич', 'Радегаст',
];

/** Generate a seeded leaderboard (stable per day) */
export function generateLeaderboard(playerName: string, playerRating: number, playerPower: number): LeaderboardEntry[] {
  // Use date as seed for stable daily leaderboard
  const seed = new Date().toDateString();
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;

  const seededRandom = (i: number) => {
    const x = Math.sin(hash + i * 9301) * 10000;
    return x - Math.floor(x);
  };

  const entries: LeaderboardEntry[] = [];

  for (let i = 0; i < 50; i++) {
    const name = LEADERBOARD_NAMES[i % LEADERBOARD_NAMES.length];
    // Spread ratings from 0 to ~5000, weighted toward top
    const rating = Math.floor(seededRandom(i) * 5000);
    const power = Math.floor(15000 + rating * 8 + seededRandom(i + 100) * 5000);
    const rank = getRankFromRating(rating);
    entries.push({ name, rating, power, tier: rank.tier });
  }

  // Add player
  const playerRank = getRankFromRating(playerRating);
  entries.push({
    name: playerName,
    rating: playerRating,
    power: playerPower,
    tier: playerRank.tier,
    isPlayer: true,
  });

  // Sort by rating descending
  entries.sort((a, b) => b.rating - a.rating);
  return entries;
}

// ═══════════════════════════════════════════════════
// Arena state interface
// ═══════════════════════════════════════════════════

export const ARENA_WIN_STREAK_THRESHOLD = 10;
export const ARENA_WIN_STREAK_BONUS = 30;
export const ARENA_RANK_MILESTONE_REWARD = 10; // Gods coins per new rank reached

export interface ArenaState {
  arenaRating: number;
  arenaFreeRefreshCount: number;
  lastRefreshDate: string;
  godsCoins: number;
  lastGodsCoinUpdate: number;
  arenaCoins: Record<string, number>;
  lastWeeklyReward: string;
  lastWeeklyDecay: string;
  lastDailyReward: string;
  arenaOpponents: ArenaOpponent[];
  arenaWinStreak: number;
  /** Rank milestones claimed this week (e.g. "Ярь-Медь-2", "Кованое Серебро-1") */
  claimedRankMilestones: string[];
  /** Week key when milestones were last reset */
  lastMilestoneWeek: string;
}

/** Get a unique key for a rank milestone */
export function getRankMilestoneKey(rating: number): string {
  const rank = getRankFromRating(rating);
  return `${rank.tier}-${rank.subRank}`;
}

export function createInitialArenaState(): ArenaState {
  return {
    arenaRating: 0,
    arenaFreeRefreshCount: 0,
    lastRefreshDate: new Date().toDateString(),
    godsCoins: GODS_COIN_MAX,
    lastGodsCoinUpdate: Date.now(),
    arenaCoins: {},
    lastWeeklyReward: '',
    lastWeeklyDecay: '',
    lastDailyReward: '',
    arenaOpponents: generateArenaOpponents(0, 10),
    arenaWinStreak: 0,
    claimedRankMilestones: [],
    lastMilestoneWeek: '',
  };
}

function getWeekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

/** Weekly decay: each tier drops to the previous tier rank 1 */
export function applyWeeklyDecay(state: ArenaState): ArenaState {
  const currentWeek = getWeekKey(new Date());
  if (state.lastWeeklyDecay === currentWeek) return state;

  const DECAY_MAP: Record<string, number> = {
    'Лунный Мефрил': 3000,
    'Пламень-Сталь': 2000,
    'Червонное Золото': 1000,
    'Кованое Серебро': 0,
    'Ярь-Медь': 0,
  };

  const rank = getRankFromRating(state.arenaRating);
  const newRating = DECAY_MAP[rank.tier] ?? 0;

  if (newRating >= state.arenaRating) {
    return { ...state, lastWeeklyDecay: currentWeek, claimedRankMilestones: [], lastMilestoneWeek: currentWeek };
  }

  return {
    ...state,
    arenaRating: newRating,
    lastWeeklyDecay: currentWeek,
    arenaOpponents: generateArenaOpponents(newRating, 10),
    claimedRankMilestones: [],
    lastMilestoneWeek: currentWeek,
  };
}
