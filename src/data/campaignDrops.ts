/**
 * Campaign drop tables: each chapter drops a specific artifact set,
 * each stage drops a specific slot, difficulty determines rarity.
 */
import { type ArtifactSet, type ArtifactSlot, type ArtifactRarity, type Artifact, generateArtifact, ACCESSORY_SLOTS, ALL_SETS } from './artifacts';
import { type Difficulty } from './campaignStages';

/** Chapter → artifact set mapping (20 chapters = 20 unique sets) */
export const CHAPTER_SET_MAP: Record<number, ArtifactSet> = {
  1: 'Жизнь',
  2: 'Атака',
  3: 'Защита',
  4: 'Крит. шанс',
  5: 'Меткость',
  6: 'Скорость',
  7: 'Сопротивление',
  8: 'Крит. урон',
  9: 'Вампиризм',
  10: 'Возмездие',
  11: 'Ярость',
  12: 'Стойкость',
  13: 'Рассечение',
  14: 'Неуязвимость',
  15: 'Контратака',
  16: 'Отравление',
  17: 'Заморозка',
  18: 'Регенерация',
  19: 'Проклятие',
  20: 'Берсерк',
};

/** Stage number → slot mapping (1-6 = main slots, 7 = random accessory) */
const STAGE_SLOT_MAP: Record<number, ArtifactSlot | 'accessory'> = {
  1: 'weapon',
  2: 'helmet',
  3: 'shield',
  4: 'gloves',
  5: 'armor',
  6: 'boots',
  7: 'accessory',
};

/** Pick a random accessory slot */
function randomAccessorySlot(): ArtifactSlot {
  return ACCESSORY_SLOTS[Math.floor(Math.random() * ACCESSORY_SLOTS.length)];
}

/** Difficulty → allowed rarities */
function getRaritiesForDifficulty(difficulty: Difficulty): ArtifactRarity[] {
  switch (difficulty) {
    case 'Явь': return ['Обиходный', 'Заветный'];
    case 'Навь': return ['Сказанный', 'Калиновый'];
    case 'Правь': return ['Самоцветный'];
    case 'Ирий': return ['Самоцветный'];
  }
}

/** Roll star range based on difficulty */
function rollStarsForDifficulty(difficulty: Difficulty): number {
  if (difficulty === 'Ирий') {
    // 4-5★ only
    return Math.random() < 0.6 ? 4 : 5;
  }
  // Normal star distribution 1-5
  const roll = Math.random();
  if (roll < 0.40) return 1;
  if (roll < 0.70) return 2;
  if (roll < 0.88) return 3;
  if (roll < 0.97) return 4;
  return 5;
}

/** Generate campaign-specific artifact drops for a given chapter/stage/difficulty */
export function generateCampaignArtifacts(
  chapter: number,
  stageNumber: number,
  difficulty: Difficulty,
): Artifact[] {
  const set = CHAPTER_SET_MAP[chapter] ?? ALL_SETS[0];
  const slotOrAccessory = STAGE_SLOT_MAP[stageNumber] ?? 'weapon';
  const slot: ArtifactSlot = slotOrAccessory === 'accessory' ? randomAccessorySlot() : slotOrAccessory;
  
  const rarities = getRaritiesForDifficulty(difficulty);
  const rarity = rarities[Math.floor(Math.random() * rarities.length)];
  const stars = rollStarsForDifficulty(difficulty);

  // Always drop 1 artifact; chance for 2nd
  const artifacts: Artifact[] = [generateArtifact(rarity, 0, stars, set, slot)];
  
  // 30% chance for a second drop
  if (Math.random() < 0.3) {
    const rarity2 = rarities[Math.floor(Math.random() * rarities.length)];
    const stars2 = rollStarsForDifficulty(difficulty);
    artifacts.push(generateArtifact(rarity2, 0, stars2, set, slot));
  }

  return artifacts;
}
