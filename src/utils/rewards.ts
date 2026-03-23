import { type Artifact, generateArtifact, type ArtifactRarity } from '@/data/artifacts';

export interface TempleRuneReward {
  count: number;
  runeName: string;
  runeRarity: string;
  runeIcon: string;
  element: string;
}

export interface BattleRewards {
  souls: number;
  exp: number;
  runes?: number;
  artifactDrop: boolean;
  artifactRarity?: string;
  droppedArtifacts: Artifact[];
  templeRunes?: TempleRuneReward;
}

export function calculateRewards(
  playerLevel: number,
  difficulty: 'easy' | 'normal' | 'hard' = 'normal'
): BattleRewards {
  const mult = { easy: 0.7, normal: 1, hard: 1.5 }[difficulty];

  const artifactDrop = true;
  const droppedArtifacts: Artifact[] = [];

  if (artifactDrop) {
    const dropCount = Math.random() < 0.3 ? (Math.random() < 0.3 ? 3 : 2) : 1;
    for (let i = 0; i < dropCount; i++) {
      const rarityRoll = Math.random();
      const rarity: ArtifactRarity =
        rarityRoll < 0.01 ? 'Самоцветный' :
        rarityRoll < 0.06 ? 'Калиновый' :
        rarityRoll < 0.20 ? 'Сказанный' :
        rarityRoll < 0.55 ? 'Заветный' : 'Обиходный';
      droppedArtifacts.push(generateArtifact(rarity));
    }
  }

  return {
    souls: Math.floor((30 + playerLevel * 2) * mult),
    exp: Math.floor((50 + playerLevel * 3) * mult),
    artifactDrop,
    artifactRarity: droppedArtifacts[0]?.rarity,
    droppedArtifacts,
  };
}

export function distributeExp(exp: number, squadSize: number): number {
  const bonus = squadSize < 4 ? 1.1 : 1;
  return Math.floor(exp / squadSize * bonus);
}
