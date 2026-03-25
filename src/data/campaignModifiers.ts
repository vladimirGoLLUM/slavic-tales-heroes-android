import type { EffectType } from '@/types/game';
import type { Difficulty } from './campaignStages';

// === Chapter Buffs: enemies get passive buffs scaling by chapter ===
export interface ChapterBuff {
  chapters: number[]; // which chapters this applies to
  icon: string;
  label: string;
  effects: { type: EffectType; value: number; duration: number }[];
}

export const CHAPTER_BUFFS: ChapterBuff[] = [
  // Ch 1-5: no special buffs
  {
    chapters: [6, 7],
    icon: '🛡️',
    label: 'Закалка: +20% ЗАЩ',
    effects: [{ type: 'def_up', value: 20, duration: 3 }],
  },
  {
    chapters: [8, 9],
    icon: '⚔️',
    label: 'Ярость: +15% АТК',
    effects: [{ type: 'atk_up', value: 15, duration: 3 }],
  },
  {
    chapters: [10, 11],
    icon: '💚',
    label: 'Регенерация',
    effects: [{ type: 'heal_over_time', value: 5, duration: 3 }],
  },
  {
    chapters: [12, 13],
    icon: '💨',
    label: 'Проворство: +15% СКР',
    effects: [{ type: 'spd_up', value: 15, duration: 3 }],
  },
  {
    chapters: [14, 15],
    icon: '🛡️',
    label: 'Щит: 15% ЗДР',
    effects: [{ type: 'shield', value: 15, duration: 3 }],
  },
  {
    chapters: [16, 17],
    icon: '🔥',
    label: 'Критическая мощь',
    effects: [
      { type: 'crit_up', value: 15, duration: 3 },
      { type: 'critdmg_up', value: 20, duration: 3 },
    ],
  },
  {
    chapters: [18, 19],
    icon: '⚔️',
    label: 'Берсерк: +25% АТК, +20% СКР',
    effects: [
      { type: 'atk_up', value: 25, duration: 3 },
      { type: 'spd_up', value: 20, duration: 3 },
    ],
  },
  {
    chapters: [20],
    icon: '👑',
    label: 'Благословение Богов',
    effects: [
      { type: 'atk_up', value: 20, duration: 3 },
      { type: 'def_up', value: 20, duration: 3 },
      { type: 'spd_up', value: 15, duration: 3 },
    ],
  },
];

// === Stage Modifiers: debuffs applied to player at battle start ===
export interface StageModifier {
  id: string;
  icon: string;
  label: string;
  description: string;
  playerDebuffs?: { type: EffectType; value: number; duration: number }[];
  enemyBuffs?: { type: EffectType; value: number; duration: number }[];
}

const MODIFIER_POOL: StageModifier[] = [
  {
    id: 'heal_block',
    icon: '🩸',
    label: 'Проклятие крови',
    description: '-50% лечения на 3 хода',
    playerDebuffs: [{ type: 'heal_reduction', value: 50, duration: 3 }],
  },
  {
    id: 'weaken',
    icon: '💀',
    label: 'Немощь',
    description: 'Ослабление: +25% входящего урона',
    playerDebuffs: [{ type: 'weaken', value: 25, duration: 2 }],
  },
  {
    id: 'slow',
    icon: '🐌',
    label: 'Вязкий туман',
    description: '-15% скорости на 2 хода',
    playerDebuffs: [{ type: 'spd_down', value: 15, duration: 2 }],
  },
  {
    id: 'brittle',
    icon: '💔',
    label: 'Хрупкость',
    description: '-20% защиты на 2 хода',
    playerDebuffs: [{ type: 'def_down', value: 20, duration: 2 }],
  },
  {
    id: 'enemy_shield',
    icon: '🛡️',
    label: 'Кольчуга',
    description: 'Враги начинают с щитом 10% ЗДР',
    enemyBuffs: [{ type: 'shield', value: 10, duration: 3 }],
  },
  {
    id: 'enemy_counter',
    icon: '⚔️',
    label: 'Контрудар',
    description: 'Враги начинают с контратакой',
    enemyBuffs: [{ type: 'counterattack', value: 75, duration: 2 }],
  },
  {
    id: 'acc_down',
    icon: '🌫️',
    label: 'Пелена',
    description: '-20% меткости на 2 хода',
    playerDebuffs: [{ type: 'acc_down', value: 20, duration: 2 }],
  },
  {
    id: 'block_buffs',
    icon: '🚫',
    label: 'Отречение',
    description: 'Блок бонусов на 1 ход',
    playerDebuffs: [{ type: 'block_buffs', value: 0, duration: 1 }],
  },
];

// === Elemental Effects: enemies deal element-based debuffs ===
export interface ElementalEffect {
  element: string;
  icon: string;
  label: string;
  effects: { type: EffectType; value: number; duration: number }[];
}

export const ELEMENTAL_ENEMY_EFFECTS: ElementalEffect[] = [
  { element: 'Огонь', icon: '🔥', label: 'Ожог', effects: [{ type: 'burn', value: 5, duration: 2 }] },
  { element: 'Вода', icon: '❄️', label: 'Заморозка', effects: [{ type: 'freeze', value: 0, duration: 1 }] },
  { element: 'Лес', icon: '🌿', label: 'Яд', effects: [{ type: 'poison', value: 5, duration: 2 }] },
  { element: 'Камень', icon: '⛰️', label: 'Оглушение', effects: [{ type: 'stun', value: 0, duration: 1 }] },
  { element: 'Тень', icon: '🌑', label: 'Ослабление', effects: [{ type: 'weaken', value: 25, duration: 2 }] },
  { element: 'Свет', icon: '✨', label: 'Блок штрафов', effects: [{ type: 'block_debuffs', value: 0, duration: 2 }] },
];

// === Difficulty-based modifier scaling ===
const DIFFICULTY_MODIFIER_COUNT: Record<Difficulty, number> = {
  'Явь': 0,
  'Навь': 1,
  'Правь': 2,
  'Ирий': 3,
};

// Chapters that start getting modifiers
const MODIFIER_START_CHAPTER = 4;

/** Get chapter buff for a given chapter */
export function getChapterBuff(chapter: number): ChapterBuff | null {
  return CHAPTER_BUFFS.find(b => b.chapters.includes(chapter)) ?? null;
}

/** Get elemental effect for a given element */
export function getElementalEffect(element: string): ElementalEffect | null {
  return ELEMENTAL_ENEMY_EFFECTS.find(e => e.element === element) ?? null;
}

/** Pick stage modifiers based on chapter, stage, difficulty */
export function getStageModifiers(chapter: number, stageNumber: number, difficulty: Difficulty): StageModifier[] {
  if (chapter < MODIFIER_START_CHAPTER) return [];
  const count = DIFFICULTY_MODIFIER_COUNT[difficulty];
  if (count === 0) return [];
  
  // Add extra modifiers for later chapters
  const chapterBonus = Math.floor((chapter - MODIFIER_START_CHAPTER) / 5);
  const totalCount = Math.min(count + chapterBonus, 3);
  
  // Deterministic seed-based selection
  const seed = chapter * 100 + stageNumber;
  const mods: StageModifier[] = [];
  for (let i = 0; i < totalCount; i++) {
    const idx = (seed + i * 7) % MODIFIER_POOL.length;
    const mod = MODIFIER_POOL[idx];
    if (!mods.find(m => m.id === mod.id)) {
      mods.push(mod);
    }
  }
  return mods;
}

/** Full campaign modifiers info for a stage */
export interface CampaignModifiers {
  chapterBuff: ChapterBuff | null;
  stageModifiers: StageModifier[];
  elementalEffects: ElementalEffect[];
}

export function getCampaignModifiers(chapter: number, stageNumber: number, difficulty: Difficulty, enemyElements: string[]): CampaignModifiers {
  const chapterBuff = getChapterBuff(chapter);
  const stageModifiers = getStageModifiers(chapter, stageNumber, difficulty);
  
  // Unique elemental effects from enemies (only on Навь+)
  const elementalEffects: ElementalEffect[] = [];
  if (difficulty !== 'Явь') {
    const seenElements = new Set<string>();
    for (const el of enemyElements) {
      if (!seenElements.has(el)) {
        seenElements.add(el);
        const effect = getElementalEffect(el);
        if (effect) elementalEffects.push(effect);
      }
    }
  }
  
  return { chapterBuff, stageModifiers, elementalEffects };
}
