import { type ArtifactRarity, generateArtifact, type Artifact } from '@/data/artifacts';

export interface ChapterBonusReward {
  souls: number;
  runes: number;
  mithrilRunes: number;
  artifactRarity: ArtifactRarity;
  artifactCount: number;
}

/** Reward tiers scale with chapter number */
export function getChapterBonusReward(chapter: number): ChapterBonusReward {
  if (chapter <= 3) {
    return { souls: 500, runes: 250, mithrilRunes: 150, artifactRarity: 'Сказанный', artifactCount: 1 };
  }
  if (chapter <= 7) {
    return { souls: 1000, runes: 500, mithrilRunes: 150, artifactRarity: 'Калиновый', artifactCount: 1 };
  }
  if (chapter <= 12) {
    return { souls: 2000, runes: 1000, mithrilRunes: 150, artifactRarity: 'Калиновый', artifactCount: 2 };
  }
  if (chapter <= 16) {
    return { souls: 3000, runes: 1500, mithrilRunes: 150, artifactRarity: 'Самоцветный', artifactCount: 1 };
  }
  // Chapters 17-20
  return { souls: 5000, runes: 2500, mithrilRunes: 150, artifactRarity: 'Самоцветный', artifactCount: 2 };
}

/** Generate the actual artifact rewards for a chapter bonus */
export function generateChapterBonusArtifacts(reward: ChapterBonusReward): Artifact[] {
  const artifacts: Artifact[] = [];
  for (let i = 0; i < reward.artifactCount; i++) {
    artifacts.push(generateArtifact(reward.artifactRarity));
  }
  return artifacts;
}
