import { useGame } from '@/context/GameContext';

interface RuneDisplayProps {
  runes: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

/**
 * Displays Runes with booster/VIP indicator
 */
export default function RuneDisplay({ runes, prefix = '', suffix = '', className = '' }: RuneDisplayProps) {
  const { isRuneBoosterActive, isVipActive } = useGame();
  const booster = isRuneBoosterActive();
  const vip = isVipActive();
  const mult = (booster ? 2 : 1) * (vip ? 1.5 : 1);
  const boosted = Math.floor(runes * mult);

  return (
    <span className={className}>
      {prefix}{runes}
      <span
        className={`font-bold ${mult > 1 ? 'text-[hsl(40,85%,55%)]' : 'text-muted-foreground/50'}`}
      >
        ({vip ? '👑' : ''}{boosted})
      </span>
      {suffix}
    </span>
  );
}
