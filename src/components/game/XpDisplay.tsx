import { useGame } from '@/context/GameContext';

interface XpDisplayProps {
  xp: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

/**
 * Displays XP with booster/VIP indicator
 */
export default function XpDisplay({ xp, prefix = '', suffix = '', className = '' }: XpDisplayProps) {
  const { isXpBoosterActive, isVipActive } = useGame();
  const booster = isXpBoosterActive();
  const vip = isVipActive();
  const mult = (booster ? 2 : 1) * (vip ? 1.5 : 1);
  const boosted = Math.floor(xp * mult);

  return (
    <span className={className}>
      {prefix}{xp}
      <span
        className={`font-bold ${mult > 1 ? 'text-[hsl(40,85%,55%)]' : 'text-muted-foreground/50'}`}
      >
        ({vip ? '👑' : ''}{boosted})
      </span>
      {suffix}
    </span>
  );
}
