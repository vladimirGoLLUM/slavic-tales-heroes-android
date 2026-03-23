import { MAX_STARS } from '@/data/upgradeData';
import { MAX_RED_STARS } from '@/data/upgradeData';

interface StarDisplayProps {
  stars: number;
  redStars?: number;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

const sizes = {
  xs: 'text-[8px]',
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-lg',
};

export default function StarDisplay({ stars, redStars = 0, size = 'md', className = '' }: StarDisplayProps) {
  return (
    <div className={`flex gap-0.5 ${className}`}>
      {Array.from({ length: MAX_STARS }).map((_, i) => {
        const isRedStar = i < redStars && stars >= MAX_STARS;
        const isGoldStar = i < stars && !isRedStar;
        const isEmpty = !isRedStar && !isGoldStar;

        return (
          <span
            key={i}
            className={`${sizes[size]} transition-colors ${
              isRedStar
                ? 'drop-shadow-[0_0_4px_rgba(239,68,68,0.7)]'
                : isGoldStar
                ? 'text-primary drop-shadow-[0_0_4px_hsl(var(--primary)/0.6)]'
                : 'text-muted-foreground/30'
            }`}
            style={isRedStar ? { color: '#ef4444' } : undefined}
          >
            ★
          </span>
        );
      })}
    </div>
  );
}
