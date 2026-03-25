import { useGame } from '@/context/GameContext';

interface SoulDisplayProps {
  souls: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

/**
 * Displays Souls with booster/VIP indicator
 */
export default function SoulDisplay({ souls, prefix = '', suffix = '', className = '' }: SoulDisplayProps) {
  const { isSoulBoosterActive, isVipActive } = useGame();
  const booster = isSoulBoosterActive();
  const vip = isVipActive();
  const mult = (booster ? 2 : 1) * (vip ? 1.5 : 1);
  const boosted = Math.floor(souls * mult);

  return (
    <span className={className}>
      {prefix}{souls}
      <span
        className={`font-bold ${mult > 1 ? 'text-[hsl(40,85%,55%)]' : 'text-muted-foreground/50'}`}
      >
        ({vip ? '👑' : ''}{boosted})
      </span>
      {suffix}
    </span>
  );
}
