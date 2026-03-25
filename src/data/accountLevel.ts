// Account Character Level System
// XP required per level (cumulative feel, increasing per level)

export const MAX_ACCOUNT_LEVEL = 50;

/** XP needed to go from level N to N+1 */
export function getAccountXpForLevel(level: number): number {
  if (level <= 0) return 50;
  if (level >= MAX_ACCOUNT_LEVEL) return Infinity;
  // Exponential-ish curve: 50, 80, 120, 170, 230, ...
  return Math.floor(50 + level * 30 + level * level * 2);
}

/** Get level and remaining XP from total XP */
export function getAccountLevelFromXp(totalXp: number): { level: number; xpInLevel: number; xpForNext: number } {
  let xp = totalXp;
  let level = 0;
  while (level < MAX_ACCOUNT_LEVEL) {
    const needed = getAccountXpForLevel(level);
    if (xp < needed) break;
    xp -= needed;
    level++;
  }
  return {
    level,
    xpInLevel: level >= MAX_ACCOUNT_LEVEL ? 0 : xp,
    xpForNext: level >= MAX_ACCOUNT_LEVEL ? 1 : getAccountXpForLevel(level),
  };
}

/** Account character stat bonuses per level */
export function getAccountStatBonuses(level: number) {
  return {
    hpPercent: level * 2,     // +2% HP per level
    atkPercent: level * 1.5,  // +1.5% ATK per level
    defPercent: level * 1.5,  // +1.5% DEF per level
  };
}

/** XP rewards for various activities */
export const ACCOUNT_XP_REWARDS = {
  campaign_stage: 15,
  campaign_boss: 30,
  arena_battle: 10,
  arena_win: 20,
  daily_quest_claim: 25,
  temple_floor: 20,
  boss_attack: 15,
  summon_hero: 5,
  abyss_floor: 10,
  forge_craft: 5,
} as const;

/** Content unlock thresholds */
export const CONTENT_UNLOCK_LEVELS: Record<string, number> = {
  campaign: 0,      // Always available
  summon: 0,        // Always available
  squads: 0,        // Always available
  shop: 0,          // Always available
  forge: 0,         // Always available
  temples: 10,
  arena: 15,
  worldboss: 20,
  abyss: 30,
  dungeon: 40,
};

export function isContentUnlocked(contentId: string, level: number): boolean {
  const required = CONTENT_UNLOCK_LEVELS[contentId] ?? 1;
  return level >= required;
}
