import { MAX_FURNACE_LEVEL, FURNACE_BOSS_COLORS } from '@/data/artifacts';

interface FurnaceFlamesProps {
  furnaceLevel: number;
  furnaceBossId?: string;
  size?: 'xs' | 'sm';
}

/** Renders a row of flame icons showing furnace enhancement level, colored by boss */
export default function FurnaceFlames({ furnaceLevel, furnaceBossId, size = 'xs' }: FurnaceFlamesProps) {
  if (furnaceLevel <= 0) return null;
  const color = furnaceBossId ? (FURNACE_BOSS_COLORS[furnaceBossId] ?? 'hsl(30, 90%, 55%)') : 'hsl(30, 90%, 55%)';
  const iconSize = size === 'sm' ? 'w-2.5 h-2.5' : 'w-2 h-2';
  const dotSize = size === 'sm' ? 'w-1.5 h-1.5' : 'w-1 h-1';

  return (
    <div className="flex items-center justify-center gap-[2px] mt-0.5">
      {Array.from({ length: MAX_FURNACE_LEVEL }).map((_, i) => (
        i < furnaceLevel ? (
          <img
            key={i}
            src="/ui/icon_furnace_flame.png"
            alt=""
            className={`${iconSize} object-contain`}
            style={{
              filter: `drop-shadow(0 0 2px ${color})`,
            }}
          />
        ) : (
          <span
            key={i}
            className={`${dotSize} rounded-full`}
            style={{
              backgroundColor: 'hsl(var(--muted-foreground) / 0.15)',
            }}
          />
        )
      ))}
    </div>
  );
}
