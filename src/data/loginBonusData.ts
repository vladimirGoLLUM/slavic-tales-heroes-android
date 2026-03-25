import { generateArtifact, type Artifact, type ArtifactSlot } from './artifacts';
import { CHAMPIONS, type Champion } from './gameData';

export interface LoginBonusDay {
  day: number;
  type: 'artifact' | 'hero';
  slot?: ArtifactSlot;
  label: string;
  icon: string;
}

export const LOGIN_BONUS_DAYS: LoginBonusDay[] = [
  { day: 1, type: 'artifact', slot: 'weapon',  label: 'Оружие 5★',    icon: '⚔️' },
  { day: 2, type: 'artifact', slot: 'helmet',  label: 'Шлем 5★',      icon: '⛑️' },
  { day: 3, type: 'artifact', slot: 'shield',  label: 'Щит 5★',       icon: '🛡️' },
  { day: 4, type: 'artifact', slot: 'gloves',  label: 'Перчатки 5★',  icon: '🧤' },
  { day: 5, type: 'artifact', slot: 'armor',   label: 'Доспех 5★',    icon: '🛡️' },
  { day: 6, type: 'artifact', slot: 'boots',   label: 'Сапоги 5★',    icon: '👢' },
  { day: 7, type: 'hero',     label: 'Герой ✨', icon: '🦸' },
];

export function generateLoginArtifactReward(day: number): Artifact {
  const info = LOGIN_BONUS_DAYS[day - 1];
  if (!info || info.type !== 'artifact' || !info.slot) {
    throw new Error(`Invalid artifact day: ${day}`);
  }
  return generateArtifact('Самоцветный', 0, 5, 'Неуязвимость', info.slot);
}

export function getRandomMythicHero(): Champion {
  const mythics = CHAMPIONS.filter(c => c.rarity === 'Самоцветный');
  return mythics[Math.floor(Math.random() * mythics.length)];
}

export function getTodayDateString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function canClaimLoginBonusCheck(loginBonusDay: number, loginBonusLastClaim: string): boolean {
  if (loginBonusDay >= 7) return false;
  return loginBonusLastClaim !== getTodayDateString();
}
