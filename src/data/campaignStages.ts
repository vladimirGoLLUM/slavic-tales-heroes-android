import { type Champion, CHAMPIONS } from './gameData';

export type Difficulty = 'Явь' | 'Навь' | 'Правь' | 'Ирий';

export const DIFFICULTIES: Difficulty[] = ['Явь', 'Навь', 'Правь', 'Ирий'];

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  'Явь': 'Легко',
  'Навь': 'Средне',
  'Правь': 'Сложно',
  'Ирий': 'Ад',
};

export const DIFFICULTY_COLORS: Record<Difficulty, string> = {
  'Явь': 'text-green-400',
  'Навь': 'text-blue-400',
  'Правь': 'text-purple-400',
  'Ирий': 'text-red-400',
};

export const DIFFICULTY_ICONS: Record<Difficulty, string> = {
  'Явь': '🌿',
  'Навь': '🌊',
  'Правь': '⚡',
  'Ирий': '🔥',
};

/** Base stat scaling per difficulty */
const DIFFICULTY_SCALE: Record<Difficulty, number> = {
  'Явь': 0.6,
  'Навь': 1.2,
  'Правь': 2.0,
  'Ирий': 3.0,
};

/** Exponential growth factor per chapter, per difficulty */
const GROWTH_FACTOR: Record<Difficulty, number> = {
  'Явь': 0.15,
  'Навь': 0.25,
  'Правь': 0.35,
  'Ирий': 0.5,
};

const BOSS_MULTIPLIER = 2.0;

/** Extra enemies per difficulty */
const EXTRA_ENEMIES: Record<Difficulty, number> = {
  'Явь': 0,
  'Навь': 1,
  'Правь': 2,
  'Ирий': 3,
};

/** Skill power multiplier per difficulty */
export const SKILL_POWER_SCALE: Record<Difficulty, number> = {
  'Явь': 1.0,
  'Навь': 1.2,
  'Правь': 1.5,
  'Ирий': 2.0,
};

export const TOTAL_CHAPTERS = 20;
export const STAGES_PER_CHAPTER = 7;

/** Elite modifier types for Правь and Ирий */
export interface EliteModifier {
  label: string;
  stat: 'atk' | 'def' | 'spd' | 'hp';
  bonus: number;
}

const ELITE_POOL: EliteModifier[] = [
  { label: '🛡️ Элита: +30% ЗАЩ', stat: 'def', bonus: 0.3 },
  { label: '⚔️ Элита: +20% АТК', stat: 'atk', bonus: 0.2 },
  { label: '💨 Элита: +15% СКР', stat: 'spd', bonus: 0.15 },
  { label: '❤️ Элита: +25% ЗДР', stat: 'hp', bonus: 0.25 },
  { label: '⚔️ Элита: +35% АТК', stat: 'atk', bonus: 0.35 },
  { label: '🛡️ Элита: +40% ЗАЩ', stat: 'def', bonus: 0.4 },
];

export interface StarCondition {
  type: 'victory' | 'no_deaths' | 'turn_limit' | 'small_squad';
  label: string;
  value?: number; // for turn_limit or small_squad (max heroes)
}

export interface StageRewards {
  firstClear: { souls: number; runes: number; exp: number };
  repeat: { souls: number; runes: number; exp: number };
}

export const WAVES_PER_STAGE = 3;

export interface Stage {
  id: string;
  chapter: number;
  stageNumber: number;
  name: string;
  isBoss: boolean;
  enemyIds: string[];
  rewards: StageRewards;
  recommendedLevel: number;
  starConditions: StarCondition[];
  waveCount: number; // always 3
}

export interface CampaignProgress {
  [difficulty: string]: {
    [chapter: number]: {
      highestStage: number;
      stars: Record<string, number>; // stageId -> 0-3
    };
  };
}

/** Track which chapter bonuses have been claimed (difficulty:chapter -> true) */
export type ChapterBonusesClaimed = Record<string, boolean>;

export function createInitialCampaignProgress(): CampaignProgress {
  const progress: CampaignProgress = {};
  for (const diff of DIFFICULTIES) {
    progress[diff] = {};
    for (let ch = 1; ch <= TOTAL_CHAPTERS; ch++) {
      progress[diff][ch] = { highestStage: 0, stars: {} };
    }
  }
  return progress;
}

/** Check if every stage in a chapter has 3 stars */
export function isChapterFullyCompleted(chapter: number, progress: CampaignProgress, difficulty: Difficulty): boolean {
  const chData = progress[difficulty]?.[chapter];
  if (!chData || (chData.highestStage ?? 0) < STAGES_PER_CHAPTER) return false;
  const stages = getStagesForChapter(chapter);
  return stages.every(s => (chData.stars?.[s.id] ?? 0) >= 3);
}

/** Get bonus key for storing claimed state */
export function chapterBonusKey(difficulty: Difficulty, chapter: number): string {
  return `${difficulty}:${chapter}`;
}

/* ─── Chapter definitions ─── */

export interface ChapterDef {
  name: string;
  icon: string;
}

export const CHAPTERS: ChapterDef[] = [
  { name: 'Тёмный Лес', icon: '🌲' },
  { name: 'Каменные Пустоши', icon: '⛰️' },
  { name: 'Навьи Врата', icon: '💀' },
  { name: 'Ледяная Пустошь', icon: '❄️' },
  { name: 'Огненное Ущелье', icon: '🌋' },
  { name: 'Болота Тоски', icon: '🐸' },
  { name: 'Древний Курган', icon: '⚱️' },
  { name: 'Змеиный Перевал', icon: '🐍' },
  { name: 'Чёрный Бор', icon: '🌑' },
  { name: 'Пещеры Велеса', icon: '🐻' },
  { name: 'Каменный Храм', icon: '🏛️' },
  { name: 'Долина Грёз', icon: '🌙' },
  { name: 'Кровавая Река', icon: '🩸' },
  { name: 'Вершина Мира', icon: '🏔️' },
  { name: 'Пустыня Забвения', icon: '🏜️' },
  { name: 'Грозовой Утёс', icon: '⛈️' },
  { name: 'Чертоги Мары', icon: '👻' },
  { name: 'Радужный Мост', icon: '🌈' },
  { name: 'Корень Мира', icon: '🌳' },
  { name: 'Трон Богов', icon: '👑' },
];

const STAGE_NAMES_POOL = [
  ['Опушка', 'Чаща', 'Болото', 'Берлога', 'Поляна', 'Тропа', 'Хозяин Леса'],
  ['Перевал', 'Ущелье', 'Пещера', 'Каменоломня', 'Развалины', 'Вершина', 'Горыня'],
  ['Туман', 'Переправа', 'Кладбище', 'Чертог', 'Темница', 'Склеп', 'Чернобог'],
  ['Пурга', 'Замёрзшее Озеро', 'Ледник', 'Снежная Крепость', 'Метель', 'Трещина', 'Морозный Король'],
  ['Лава', 'Жерло', 'Пепелище', 'Огненный Мост', 'Плавильня', 'Пламенник', 'Змей Горыныч'],
  ['Трясина', 'Топь', 'Тростник', 'Омут', 'Туманник', 'Гнилушка', 'Болотная Ведьма'],
  ['Захоронение', 'Подземелье', 'Лабиринт', 'Сокровищница', 'Ловушка', 'Страж', 'Вечный Дух'],
  ['Тропа Змей', 'Каменный Язык', 'Логово', 'Чешуйница', 'Извилина', 'Клык', 'Царь Змей'],
  ['Чернолесье', 'Мрачный Дуб', 'Тень', 'Паутина', 'Гнездо', 'Бурелом', 'Лесной Дух'],
  ['Берлога', 'Тоннель', 'Грот', 'Капище', 'Водопад', 'Эхо', 'Велес'],
  ['Портик', 'Зал Колонн', 'Святилище', 'Алтарь', 'Книжница', 'Купол', 'Каменный Страж'],
  ['Сумерки', 'Лунный Луг', 'Зыбкая Тропа', 'Мираж', 'Сонная Роща', 'Грёза', 'Хранитель Снов'],
  ['Брод', 'Пороги', 'Водоворот', 'Отмель', 'Карниз', 'Исток', 'Кровавый Царь'],
  ['Подножье', 'Серпантин', 'Облака', 'Ветровал', 'Ледяной Шпиль', 'Заря', 'Владыка Ветров'],
  ['Барханы', 'Оазис', 'Руины', 'Песчаная Буря', 'Каньон', 'Мираж', 'Песчаный Титан'],
  ['Утёс', 'Молния', 'Расщелина', 'Громовал', 'Ливень', 'Сияние', 'Перун'],
  ['Завеса', 'Тропа Мёртвых', 'Ворота', 'Стенание', 'Склеп Мары', 'Холод', 'Мара'],
  ['Мост', 'Радужный Луг', 'Сияние', 'Врата Света', 'Небесный Путь', 'Звёздный Зал', 'Страж Моста'],
  ['Корни', 'Пустота', 'Мировое Древо', 'Источник Силы', 'Ядро', 'Бездна', 'Хранитель Корня'],
  ['Предбожье', 'Зал Славы', 'Тронный Путь', 'Испытание', 'Финальный Рубеж', 'Святая Святых', 'Сварог'],
];

function pickEnemies(chapterIdx: number, stageIdx: number, isBoss: boolean): string[] {
  const pool = CHAMPIONS.map(c => c.id);
  const seed = chapterIdx * 100 + stageIdx;
  const count = isBoss ? 4 : 3 + (stageIdx % 2);
  const enemies: string[] = [];
  for (let i = 0; i < count; i++) {
    enemies.push(pool[(seed + i * 7) % pool.length]);
  }
  return enemies;
}

function pickEliteModifiers(seed: number, difficulty: Difficulty): EliteModifier[] {
  if (difficulty !== 'Правь' && difficulty !== 'Ирий') return [];
  const count = difficulty === 'Ирий' ? 2 : 1;
  const mods: EliteModifier[] = [];
  for (let i = 0; i < count; i++) {
    mods.push(ELITE_POOL[(seed + i * 3) % ELITE_POOL.length]);
  }
  return mods;
}

function getStarConditions(_isBoss: boolean, _chapter: number): StarCondition[] {
  return [
    { type: 'victory', label: '⚔️ Победить (все раунды)' },
    { type: 'no_deaths', label: '🛡️ Без потерь' },
    { type: 'small_squad', label: '🦸 Пройти 1-2 героями без потерь', value: 2 },
  ];
}

function generateStages(): Stage[] {
  const stages: Stage[] = [];
  for (let ch = 1; ch <= TOTAL_CHAPTERS; ch++) {
    const names = STAGE_NAMES_POOL[(ch - 1) % STAGE_NAMES_POOL.length];
    for (let s = 1; s <= STAGES_PER_CHAPTER; s++) {
      const isBoss = s === STAGES_PER_CHAPTER;
      // Exponential reward growth
      const rewardScale = Math.pow(1.12, ch - 1);
      const baseSouls = Math.floor((20 + s * 5) * rewardScale);
      const baseRunes = Math.floor((30 + s * 8) * rewardScale);
      const baseExp = Math.floor((40 + s * 10) * rewardScale);
      // Recommended squad POWER grows with chapter/stage
      const baseLevel = 5 + (ch - 1) * 3 + s * 2 + Math.pow(1.1, ch - 1) * 2;
      const recPower = Math.floor(baseLevel * 180 + ch * 400 + (isBoss ? 1500 : 0));
      stages.push({
        id: `ch${ch}-s${s}`,
        chapter: ch,
        stageNumber: s,
        name: names[(s - 1) % names.length],
        isBoss,
        enemyIds: pickEnemies(ch, s, isBoss),
        rewards: {
          firstClear: {
            souls: Math.floor(baseSouls * 2),
            runes: Math.floor(baseRunes * 2),
            exp: Math.floor(baseExp * 2),
          },
          repeat: { souls: baseSouls, runes: baseRunes, exp: baseExp },
        },
        recommendedLevel: recPower,
        starConditions: getStarConditions(isBoss, ch),
        waveCount: WAVES_PER_STAGE,
      });
    }
  }
  return stages;
}

export const ALL_STAGES = generateStages();

type PowerStats = Pick<Champion['baseStats'], 'hp' | 'atk' | 'def' | 'spd'>;

export function calculateUnitPower(stats: PowerStats): number {
  return stats.hp + stats.atk * 4 + stats.def * 3 + stats.spd * 5;
}

/** Recommended squad power = total enemy team power (same formula as player squad) */
export function getRecommendedPower(stage: Stage, difficulty: Difficulty): number {
  const enemies = buildEnemyTeam(stage, difficulty);
  return enemies.reduce((sum, enemy) => sum + calculateUnitPower(enemy.baseStats), 0);
}

export function getStagesForChapter(chapter: number): Stage[] {
  return ALL_STAGES.filter(s => s.chapter === chapter);
}

export interface ScaledChampion extends Champion {
  eliteModifiers?: EliteModifier[];
  skillPowerScale?: number;
}

/** Build enemy BattleUnit-ready champions scaled by difficulty + exponential chapter growth */
export function buildEnemyTeam(stage: Stage, difficulty: Difficulty): ScaledChampion[] {
  const baseScale = DIFFICULTY_SCALE[difficulty];
  const growth = GROWTH_FACTOR[difficulty];
  // Exponential chapter scaling
  const chapterScale = Math.pow(1 + growth, stage.chapter - 1);
  // Stage-within-chapter scaling
  const stageScale = 1 + (stage.stageNumber - 1) * 0.05;
  const bossMult = stage.isBoss ? BOSS_MULTIPLIER : 1.0;
  const finalScale = baseScale * chapterScale * stageScale * bossMult;
  const skillScale = SKILL_POWER_SCALE[difficulty];

  // Build enemy IDs + extra enemies for harder difficulties
  const baseIds = [...stage.enemyIds];
  const extra = EXTRA_ENEMIES[difficulty];
  const pool = CHAMPIONS.map(c => c.id);
  const seed = stage.chapter * 100 + stage.stageNumber;
  for (let i = 0; i < extra; i++) {
    const idx = (seed + baseIds.length + i * 11) % pool.length;
    baseIds.push(pool[idx]);
  }
  const enemyIds = baseIds.slice(0, 6);

  return enemyIds.map((id, idx) => {
    const base = CHAMPIONS.find(c => c.id === id) ?? CHAMPIONS[0];
    const eliteMods = pickEliteModifiers(seed + idx, difficulty);

    let hp = Math.floor(base.baseStats.hp * finalScale);
    let atk = Math.floor(base.baseStats.atk * finalScale);
    let def = Math.floor(base.baseStats.def * finalScale);
    let spd = Math.floor(base.baseStats.spd * (0.9 + finalScale * 0.1));

    for (const mod of eliteMods) {
      if (mod.stat === 'hp') hp = Math.floor(hp * (1 + mod.bonus));
      if (mod.stat === 'atk') atk = Math.floor(atk * (1 + mod.bonus));
      if (mod.stat === 'def') def = Math.floor(def * (1 + mod.bonus));
      if (mod.stat === 'spd') spd = Math.floor(spd * (1 + mod.bonus));
    }

    const scaledSkills = base.skills.map(s => ({
      ...s,
      power: s.power * skillScale,
      cooldown: difficulty === 'Ирий' ? Math.max(1, s.cooldown - 1) : s.cooldown,
    }));

    return {
      ...base,
      skills: scaledSkills,
      baseStats: {
        hp, atk, def, spd,
        critChance: base.baseStats.critChance * Math.min(finalScale, 1.5),
        critDmg: base.baseStats.critDmg * Math.min(finalScale, 1.5),
        resistance: base.baseStats.resistance * finalScale,
        accuracy: base.baseStats.accuracy * finalScale,
      },
      eliteModifiers: eliteMods.length > 0 ? eliteMods : undefined,
      skillPowerScale: skillScale,
    };
  });
}

export function isStageUnlocked(
  chapter: number, stageNumber: number,
  progress: CampaignProgress, difficulty: Difficulty
): boolean {
  if (stageNumber === 1) {
    if (chapter === 1) return true;
    const prevChapter = progress[difficulty]?.[chapter - 1];
    return (prevChapter?.highestStage ?? 0) >= STAGES_PER_CHAPTER;
  }
  const chProgress = progress[difficulty]?.[chapter];
  return (chProgress?.highestStage ?? 0) >= stageNumber - 1;
}

export function isStageCleared(
  chapter: number, stageNumber: number,
  progress: CampaignProgress, difficulty: Difficulty
): boolean {
  const chProgress = progress[difficulty]?.[chapter];
  return (chProgress?.highestStage ?? 0) >= stageNumber;
}

export function getStageStars(
  stageId: string, chapter: number,
  progress: CampaignProgress, difficulty: Difficulty
): number {
  return progress[difficulty]?.[chapter]?.stars?.[stageId] ?? 0;
}

export function getChapterTotalStars(
  chapter: number, progress: CampaignProgress, difficulty: Difficulty
): number {
  const chStars = progress[difficulty]?.[chapter]?.stars ?? {};
  return Object.values(chStars).reduce((sum, s) => sum + s, 0);
}

/** Build 3 waves of enemies for a stage. Boss stages: waves 1-2 regular, wave 3 boss */
export function buildEnemyWaves(stage: Stage, difficulty: Difficulty): ScaledChampion[][] {
  const waves: ScaledChampion[][] = [];
  
  if (stage.isBoss) {
    // Boss stage: 2 regular waves + 1 boss wave
    const regularStage = { ...stage, isBoss: false };
    for (let w = 0; w < 2; w++) {
      // Vary enemies per wave using different seed
      const waveEnemyIds = pickEnemiesForWave(stage.chapter, stage.stageNumber, w, false);
      const waveStage = { ...regularStage, enemyIds: waveEnemyIds };
      waves.push(buildEnemyTeam(waveStage, difficulty));
    }
    // Wave 3: boss
    waves.push(buildEnemyTeam(stage, difficulty));
  } else {
    // Regular stage: 3 waves of regular enemies with slight variation
    for (let w = 0; w < WAVES_PER_STAGE; w++) {
      const waveEnemyIds = pickEnemiesForWave(stage.chapter, stage.stageNumber, w, false);
      const waveStage = { ...stage, enemyIds: waveEnemyIds };
      waves.push(buildEnemyTeam(waveStage, difficulty));
    }
  }
  
  return waves;
}

/** Pick enemies for a specific wave (uses wave index for variation) */
function pickEnemiesForWave(chapterIdx: number, stageIdx: number, waveIdx: number, isBoss: boolean): string[] {
  const pool = CHAMPIONS.map(c => c.id);
  const seed = chapterIdx * 100 + stageIdx * 10 + waveIdx * 3;
  const count = isBoss ? 4 : 3 + ((stageIdx + waveIdx) % 2);
  const enemies: string[] = [];
  for (let i = 0; i < count; i++) {
    enemies.push(pool[(seed + i * 7) % pool.length]);
  }
  return enemies;
}

/** Calculate how many stars earned based on battle results */
export function calculateBattleStars(
  conditions: StarCondition[],
  won: boolean,
  allyDeaths: number,
  _totalTurns: number,
  squadSize?: number,
): number {
  if (!won) return 0;
  let stars = 0;
  for (const cond of conditions) {
    if (cond.type === 'victory' && won) stars++;
    if (cond.type === 'no_deaths' && allyDeaths === 0) stars++;
    if (cond.type === 'small_squad' && cond.value && squadSize && squadSize <= cond.value && allyDeaths === 0) stars++;
    if (cond.type === 'turn_limit' && cond.value && _totalTurns <= cond.value) stars++;
  }
  return stars;
}
