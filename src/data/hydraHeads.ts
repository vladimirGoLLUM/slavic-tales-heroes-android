/**
 * Hydra Head System
 * 
 * 6 possible heads, 4 active simultaneously. When a head is decapitated,
 * a "Vulnerable Neck" appears for 2 turns, then a NEW random head regrows
 * (different from the one that was cut).
 * 
 * Each head has:
 * - A passive buff (always active while head is alive)
 * - An active ability (triggers on boss turn with a cooldown)
 * 
 * Head Types:
 * - Защита жизни (Life Barrier): passive 15% damage reduction; active: grants boss shield
 * - Ядовитый покров (Poison Cloud): passive poison tick; active: heavy poison burst
 * - Мщение (Vengeance): passive 400% counter; active: enrage (ATK boost to boss)
 * - Узы боли (Pain Link): passive 25% reflect; active: link two heroes (shared damage)
 * - Пожирающая (Devouring): passive heal boss 2%/turn; active: steal buff from random hero
 * - Ледяная (Frost): passive -10% SPD to heroes; active: freeze random hero
 */

import type { EffectType, EffectApplication } from '@/types/game';

// Head images
import imgLifeBarrier from '@/assets/hydra/head_life_barrier.png';
import imgPoisonCloud from '@/assets/hydra/head_poison_cloud.png';
import imgVengeance from '@/assets/hydra/head_vengeance.png';
import imgPainLink from '@/assets/hydra/head_pain_link.png';
import imgDevouring from '@/assets/hydra/head_devouring.png';
import imgFrost from '@/assets/hydra/head_frost.png';
import imgNeckStump from '@/assets/hydra/head_neck_stump.png';

export { imgNeckStump };

export interface HydraHeadAbility {
  name: string;
  description: string;
  cooldown: number;
  /** Effects applied to targets */
  effects: EffectApplication[];
  /** Target: 'random_hero' | 'all_heroes' | 'boss_self' */
  target: 'random_hero' | 'all_heroes' | 'boss_self';
  /** Damage as % of head's ATK (0 = no damage) */
  damagePct: number;
}

export interface HydraHead {
  id: string;
  name: string;
  icon: string;
  imageUrl: string;
  color: string;
  buffType: EffectType;
  buffDescription: string;
  /** Passive effect value (percent) */
  buffValue: number;
  /** HP multiplier relative to boss base HP fraction */
  hpMultiplier: number;
  /** Active ability used on boss turn */
  activeAbility: HydraHeadAbility;
}

/** Base combat stats for each head type */
export interface HydraHeadCombatStats {
  hp: number;
  atk: number;
  def: number;
  spd: number;
  critChance: number;
  critDmg: number;
  resistance: number;
  accuracy: number;
}

/** Base stats per head — these get scaled by round */
export const HYDRA_HEAD_BASE_STATS: Record<string, HydraHeadCombatStats> = {
  life_barrier: { hp: 80000, atk: 800, def: 300, spd: 80, critChance: 10, critDmg: 50, resistance: 150, accuracy: 100 },
  poison_cloud: { hp: 60000, atk: 1000, def: 150, spd: 95, critChance: 15, critDmg: 50, resistance: 100, accuracy: 150 },
  vengeance:    { hp: 70000, atk: 1200, def: 200, spd: 85, critChance: 20, critDmg: 80, resistance: 120, accuracy: 120 },
  pain_link:    { hp: 75000, atk: 900, def: 250, spd: 75, critChance: 10, critDmg: 50, resistance: 180, accuracy: 130 },
  devouring:    { hp: 55000, atk: 1100, def: 180, spd: 100, critChance: 15, critDmg: 60, resistance: 100, accuracy: 140 },
  frost:        { hp: 65000, atk: 950, def: 200, spd: 90, critChance: 12, critDmg: 55, resistance: 130, accuracy: 120 },
};

/** Escalation per round: +25% ATK, +20% HP */
export const HYDRA_ROUND_ATK_ESCALATION = 0.25;
export const HYDRA_ROUND_HP_ESCALATION = 0.20;
export const HYDRA_ROUND_SPD_ESCALATION = 0.10;

export interface HydraHeadState {
  headId: string;
  currentHp: number;
  maxHp: number;
  isAlive: boolean;
  /** Turns until regrowth (-1 = not decapitated) */
  regrowthTimer: number;
  /** Current cooldown for active ability */
  abilityCooldown: number;
}

export interface HydraHeadsState {
  heads: HydraHeadState[];
  /** Total heads decapitated (for escalation) */
  totalDecapitations: number;
  /** Pool of head IDs not currently active (available for regrowth) */
  reservePool: string[];
}

/** All 6 possible hydra heads */
export const ALL_HYDRA_HEADS: HydraHead[] = [
  {
    id: 'life_barrier',
    name: 'Голова Защиты',
    icon: '🛡️',
    imageUrl: imgLifeBarrier,
    color: 'text-blue-400',
    buffType: 'life_barrier',
    buffDescription: 'Поглощает 15% входящего урона по боссу',
    buffValue: 15,
    hpMultiplier: 1.0,
    activeAbility: {
      name: 'Барьер Жизни',
      description: 'Даёт боссу щит 10% макс. ЗДР на 3 хода',
      cooldown: 4,
      effects: [{ type: 'shield', value: 10, duration: 3, chance: 1, target: 'self' }],
      target: 'boss_self',
      damagePct: 0,
    },
  },
  {
    id: 'poison_cloud',
    name: 'Голова Яда',
    icon: '☠️',
    imageUrl: imgPoisonCloud,
    color: 'text-green-400',
    buffType: 'poison_cloud',
    buffDescription: 'Герои получают 3% макс. ЗДР ядом каждый ход',
    buffValue: 3,
    hpMultiplier: 0.8,
    activeAbility: {
      name: 'Ядовитый Выброс',
      description: 'Накладывает сильный яд (5%, 3 хода) на всех героев',
      cooldown: 5,
      effects: [{ type: 'poison', value: 5, duration: 3, chance: 1, target: 'all_enemies' }],
      target: 'all_heroes',
      damagePct: 0,
    },
  },
  {
    id: 'vengeance',
    name: 'Голова Мщения',
    icon: '⚔️',
    imageUrl: imgVengeance,
    color: 'text-red-400',
    buffType: 'vengeance',
    buffDescription: 'Контрудар 400% урона при получении урона',
    buffValue: 400,
    hpMultiplier: 0.9,
    activeAbility: {
      name: 'Ярость Гидры',
      description: 'Усиливает босса: +30% АТК на 3 хода',
      cooldown: 5,
      effects: [{ type: 'atk_up', value: 30, duration: 3, chance: 1, target: 'self' }],
      target: 'boss_self',
      damagePct: 0,
    },
  },
  {
    id: 'pain_link',
    name: 'Голова Боли',
    icon: '🔗',
    imageUrl: imgPainLink,
    color: 'text-purple-400',
    buffType: 'pain_link',
    buffDescription: '25% урона отражается обратно атакующему',
    buffValue: 25,
    hpMultiplier: 1.1,
    activeAbility: {
      name: 'Путы Агонии',
      description: 'Накладывает слабость (-25% входящего исцеления) на случайного героя',
      cooldown: 4,
      effects: [{ type: 'heal_reduction', value: 50, duration: 3, chance: 1, target: 'enemy' }],
      target: 'random_hero',
      damagePct: 0,
    },
  },
  {
    id: 'devouring',
    name: 'Пожирающая Голова',
    icon: '👁️',
    imageUrl: imgDevouring,
    color: 'text-amber-400',
    buffType: 'heal_over_time',
    buffDescription: 'Босс регенерирует 2% ЗДР каждый ход',
    buffValue: 2,
    hpMultiplier: 0.85,
    activeAbility: {
      name: 'Пожирание Силы',
      description: 'Крадёт все баффы у случайного героя (рассеивание)',
      cooldown: 4,
      effects: [{ type: 'dispel', value: 0, duration: 1, chance: 1, target: 'enemy' }],
      target: 'random_hero',
      damagePct: 0,
    },
  },
  {
    id: 'frost',
    name: 'Ледяная Голова',
    icon: '❄️',
    imageUrl: imgFrost,
    color: 'text-cyan-400',
    buffType: 'spd_down',
    buffDescription: 'Герои теряют 10% скорости (пассивно)',
    buffValue: 10,
    hpMultiplier: 0.95,
    activeAbility: {
      name: 'Ледяное Дыхание',
      description: 'Замораживает случайного героя на 1 ход',
      cooldown: 5,
      effects: [{ type: 'freeze', value: 0, duration: 1, chance: 1, target: 'enemy' }],
      target: 'random_hero',
      damagePct: 0,
    },
  },
];

/** Legacy alias — the initial 4 heads */
export const HYDRA_HEADS = ALL_HYDRA_HEADS;

/** How many heads are active at once */
export const ACTIVE_HEADS_COUNT = 4;

/** Turns until a decapitated head regrows */
const BASE_REGROWTH_TIMER = 2;

/** Head HP = bossMaxHp * HEAD_HP_FRACTION * head.hpMultiplier */
const HEAD_HP_FRACTION = 0.00003;

/** Boss ATK multiplier per round for escalation */
export const HYDRA_ROUND_ATK_SCALE = 0.05; // +5% ATK per round

/** Convert head definitions into BattleUnit-compatible champion objects for a given round */
export function createHydraHeadChampions(headIds: string[], round: number): Array<{
  id: string;
  champion: {
    id: string;
    name: string;
    element: string;
    faction: string;
    rarity: string;
    description: string;
    imageUrl: string;
    baseStats: HydraHeadCombatStats;
    skills: import('@/data/gameData').Skill[];
  };
  maxHp: number;
}> {
  const atkMult = 1 + (round - 1) * HYDRA_ROUND_ATK_ESCALATION;
  const hpMult = 1 + (round - 1) * HYDRA_ROUND_HP_ESCALATION;
  const spdMult = 1 + (round - 1) * HYDRA_ROUND_SPD_ESCALATION;

  return headIds.map(headId => {
    const headDef = ALL_HYDRA_HEADS.find(h => h.id === headId);
    if (!headDef) return null;
    const base = HYDRA_HEAD_BASE_STATS[headId] ?? HYDRA_HEAD_BASE_STATS.life_barrier;

    const scaledStats: HydraHeadCombatStats = {
      hp: Math.floor(base.hp * hpMult),
      atk: Math.floor(base.atk * atkMult),
      def: base.def,
      spd: Math.floor(base.spd * spdMult),
      critChance: base.critChance,
      critDmg: base.critDmg,
      resistance: base.resistance,
      accuracy: base.accuracy,
    };

    // Build skills from head ability
    const ability = headDef.activeAbility;
    const basicAttack: import('@/data/gameData').Skill = {
      name: `Укус ${headDef.name.split(' ').pop()}`,
      description: `Базовая атака ${headDef.name}`,
      type: 'damage',
      power: 1.0,
      cooldown: 0,
    };

    const activeSkill: import('@/data/gameData').Skill = {
      name: ability.name,
      description: ability.description,
      type: ability.target === 'all_heroes' ? 'aoe' : ability.target === 'boss_self' ? 'buff' : 'control',
      power: ability.damagePct > 0 ? ability.damagePct / 100 : 0.8,
      cooldown: ability.cooldown,
      effects: ability.effects,
    };

    return {
      id: headId,
      champion: {
        id: `hydra-head-${headId}`,
        name: headDef.name,
        element: 'Тень' as string,
        faction: 'Гидра',
        rarity: 'Самоцветный',
        description: headDef.buffDescription,
        imageUrl: headDef.imageUrl,
        baseStats: scaledStats,
        skills: [basicAttack, activeSkill],
      },
      maxHp: scaledStats.hp,
    };
  }).filter(Boolean) as any[];
}

function sanitizeHydraState(state: HydraHeadsState): HydraHeadsState {
  const heads = state.heads.slice(0, ACTIVE_HEADS_COUNT);
  const activeIds = new Set(heads.map(h => h.headId));
  const allIds = ALL_HYDRA_HEADS.map(h => h.id);

  const reserveUnique = state.reservePool.filter((id, idx, arr) => {
    if (!allIds.includes(id)) return false;
    if (activeIds.has(id)) return false;
    return arr.indexOf(id) === idx;
  });

  for (const id of allIds) {
    if (!activeIds.has(id) && !reserveUnique.includes(id)) {
      reserveUnique.push(id);
    }
  }

  const targetReserveSize = Math.max(0, allIds.length - heads.length);

  return {
    ...state,
    heads,
    reservePool: reserveUnique.slice(0, targetReserveSize),
  };
}

/** Pick 4 random starting heads */
export function pickStartingHeads(): { active: string[]; reserve: string[] } {
  const shuffled = [...ALL_HYDRA_HEADS].sort(() => Math.random() - 0.5);
  const active = shuffled.slice(0, ACTIVE_HEADS_COUNT).map(h => h.id);
  const reserve = shuffled.slice(ACTIVE_HEADS_COUNT).map(h => h.id);
  return { active, reserve };
}

/** Initialize heads state for battle start */
export function createHydraHeadsState(bossMaxHp: number): HydraHeadsState {
  const { active, reserve } = pickStartingHeads();
  const heads: HydraHeadState[] = active.map(headId => {
    const headDef = ALL_HYDRA_HEADS.find(h => h.id === headId)!;
    const maxHp = Math.floor(bossMaxHp * HEAD_HP_FRACTION * headDef.hpMultiplier);
    return {
      headId,
      currentHp: maxHp,
      maxHp,
      isAlive: true,
      regrowthTimer: -1,
      abilityCooldown: 0,
    };
  });
  return sanitizeHydraState({ heads, totalDecapitations: 0, reservePool: reserve });
}

/** Get currently active (alive) head definitions */
export function getActiveHeads(state: HydraHeadsState): HydraHead[] {
  const safeState = sanitizeHydraState(state);
  return safeState.heads
    .filter(h => h.isAlive)
    .map(h => ALL_HYDRA_HEADS.find(def => def.id === h.headId)!)
    .filter(Boolean);
}

/** Check if a specific head buff is active */
export function isHeadBuffActive(state: HydraHeadsState, buffType: EffectType): boolean {
  const safeState = sanitizeHydraState(state);
  return safeState.heads.some(h => h.isAlive && ALL_HYDRA_HEADS.find(def => def.id === h.headId)?.buffType === buffType);
}

/** Deal damage to a specific head */
export function damageHead(
  state: HydraHeadsState,
  headId: string,
  damage: number,
): { state: HydraHeadsState; decapitated: boolean } {
  const safeState = sanitizeHydraState(state);
  const heads = safeState.heads.map(h => {
    if (h.headId !== headId || !h.isAlive) return h;
    const newHp = Math.max(0, h.currentHp - damage);
    if (newHp <= 0) {
      return { ...h, currentHp: 0, isAlive: false, regrowthTimer: BASE_REGROWTH_TIMER, abilityCooldown: 0 };
    }
    return { ...h, currentHp: newHp };
  });
  const wasAlive = safeState.heads.find(h => h.headId === headId)?.isAlive ?? false;
  const nowDead = heads.find(h => h.headId === headId)?.isAlive === false;
  const decapitated = wasAlive && nowDead;

  // Don't modify reserve pool here - it's managed during regrowth
  return {
    state: sanitizeHydraState({
      heads,
      totalDecapitations: safeState.totalDecapitations + (decapitated ? 1 : 0),
      reservePool: safeState.reservePool,
    }),
    decapitated,
  };
}

/** Tick regrowth timers on boss turn. A regrown neck gets a NEW random head from the reserve. */
export function tickHeadRegrowth(
  state: HydraHeadsState,
  bossMaxHp: number,
): { state: HydraHeadsState; regrownHeads: string[] } {
  const safeState = sanitizeHydraState(state);
  const regrownHeads: string[] = [];
  let reservePool = [...safeState.reservePool];

  const heads = safeState.heads.map(h => {
    if (h.isAlive || h.regrowthTimer < 0) return h;
    const newTimer = h.regrowthTimer - 1;
    if (newTimer <= 0) {
      // Pick a random head from reserve pool (different from what was cut)
      let newHeadId: string;
      if (reservePool.length > 0) {
        const idx = Math.floor(Math.random() * reservePool.length);
        newHeadId = reservePool[idx];
        // Remove chosen head from reserve, put the old (decapitated) head into reserve
        reservePool = [...reservePool.slice(0, idx), ...reservePool.slice(idx + 1)];
        reservePool.push(h.headId); // old head goes to reserve
      } else {
        // Fallback: regrow same head if reserve is empty
        newHeadId = h.headId;
      }

      const headDef = ALL_HYDRA_HEADS.find(def => def.id === newHeadId);
      const maxHp = Math.floor(bossMaxHp * HEAD_HP_FRACTION * (headDef?.hpMultiplier ?? 1));
      regrownHeads.push(newHeadId);
      return { ...h, headId: newHeadId, currentHp: maxHp, maxHp, isAlive: true, regrowthTimer: -1, abilityCooldown: 0 };
    }
    return { ...h, regrowthTimer: newTimer };
  });

  return { state: sanitizeHydraState({ ...safeState, heads, reservePool }), regrownHeads };
}

/** Tick ability cooldowns and return abilities ready to fire */
export function tickHeadAbilities(state: HydraHeadsState): { state: HydraHeadsState; readyAbilities: { headId: string; ability: HydraHeadAbility }[] } {
  const safeState = sanitizeHydraState(state);
  const readyAbilities: { headId: string; ability: HydraHeadAbility }[] = [];

  const heads = safeState.heads.map(h => {
    if (!h.isAlive) return h;
    const headDef = ALL_HYDRA_HEADS.find(def => def.id === h.headId);
    if (!headDef) return h;

    if (h.abilityCooldown <= 0) {
      // Ability fires!
      readyAbilities.push({ headId: h.headId, ability: headDef.activeAbility });
      return { ...h, abilityCooldown: headDef.activeAbility.cooldown };
    }
    return { ...h, abilityCooldown: h.abilityCooldown - 1 };
  });

  return { state: sanitizeHydraState({ ...safeState, heads }), readyAbilities };
}

/** Distribute damage across heads proportionally when boss takes damage. */
export function distributeHeadDamage(
  state: HydraHeadsState,
  totalDamage: number,
  _bossMaxHp: number,
): { state: HydraHeadsState; headDamageAbsorbed: number; decapitatedHeads: string[]; vengeanceDamage: number; painLinkDamage: number } {
  const safeState = sanitizeHydraState(state);
  const aliveHeads = safeState.heads.filter(h => h.isAlive);
  if (aliveHeads.length === 0) {
    return { state: safeState, headDamageAbsorbed: 0, decapitatedHeads: [], vengeanceDamage: 0, painLinkDamage: 0 };
  }

  const damagePerHead = Math.floor(totalDamage / aliveHeads.length);
  let headDamageAbsorbed = 0;
  const decapitatedHeads: string[] = [];
  let vengeanceDamage = 0;
  let painLinkDamage = 0;
  let newState = { ...safeState };

  for (const head of aliveHeads) {
    const headDef = ALL_HYDRA_HEADS.find(def => def.id === head.headId);
    const absorbed = Math.min(damagePerHead, head.currentHp);
    headDamageAbsorbed += absorbed;

    const result = damageHead(newState, head.headId, damagePerHead);
    newState = result.state;

    if (result.decapitated) {
      decapitatedHeads.push(head.headId);
    }

    if (headDef?.buffType === 'vengeance' && absorbed > 0 && !result.decapitated) {
      vengeanceDamage += Math.floor(absorbed * (headDef.buffValue / 100));
    }
    if (headDef?.buffType === 'pain_link' && absorbed > 0) {
      painLinkDamage += Math.floor(absorbed * (headDef.buffValue / 100));
    }
  }

  return { state: newState, headDamageAbsorbed, decapitatedHeads, vengeanceDamage, painLinkDamage };
}

/** Apply Life Barrier: reduce incoming damage */
export function applyLifeBarrier(state: HydraHeadsState, damage: number): { reducedDamage: number; barrierAbsorbed: number } {
  if (!isHeadBuffActive(state, 'life_barrier')) {
    return { reducedDamage: damage, barrierAbsorbed: 0 };
  }
  const headDef = ALL_HYDRA_HEADS.find(h => h.buffType === 'life_barrier')!;
  const barrierAbsorbed = Math.floor(damage * headDef.buffValue / 100);
  return { reducedDamage: damage - barrierAbsorbed, barrierAbsorbed };
}

/** Get Poison Cloud damage percent (0 if head not active) */
export function getPoisonCloudDamage(state: HydraHeadsState): number {
  if (!isHeadBuffActive(state, 'poison_cloud')) return 0;
  const headDef = ALL_HYDRA_HEADS.find(h => h.buffType === 'poison_cloud')!;
  return headDef.buffValue;
}
