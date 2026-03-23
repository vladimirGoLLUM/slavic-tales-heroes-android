import { motion } from 'framer-motion';

interface StageNodeProps {
  stageNumber: number;
  name: string;
  isBoss: boolean;
  isUnlocked: boolean;
  isCleared: boolean;
  isCurrent: boolean;
  stars: number; // 0-3
  onClick: () => void;
}

export default function StageNode({
  stageNumber, name, isBoss, isUnlocked, isCleared, isCurrent, stars, onClick,
}: StageNodeProps) {
  return (
    <motion.button
      whileTap={isUnlocked ? { scale: 0.9 } : undefined}
      whileHover={isUnlocked ? { scale: 1.08 } : undefined}
      onClick={isUnlocked ? onClick : undefined}
      disabled={!isUnlocked}
      className={`relative flex flex-col items-center gap-1 min-w-[64px] ${
        !isUnlocked ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
      }`}
    >
      {/* Node circle */}
      <div
        className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center text-lg sm:text-xl font-kelly border-2 transition-all ${
          isCleared
            ? 'bg-primary/20 border-primary text-primary'
            : isCurrent
            ? 'bg-accent/20 border-accent text-accent animate-pulse'
            : isUnlocked
            ? 'bg-surface border-border text-foreground hover:border-primary/50'
            : 'bg-muted/30 border-muted text-muted-foreground'
        }`}
        style={isCurrent ? { boxShadow: '0 0 16px hsl(var(--accent) / 0.5)' } : undefined}
      >
        {isCleared ? '✓' : isBoss ? '👑' : stageNumber}
      </div>

      {/* Stars */}
      {isCleared && (
        <div className="flex gap-0.5">
          {[1, 2, 3].map(s => (
            <span key={s} className={`text-[10px] ${s <= stars ? 'text-primary' : 'text-muted/30'}`}>
              ⭐
            </span>
          ))}
        </div>
      )}

      {/* Name */}
      <span className={`text-[10px] sm:text-xs font-kelly text-center leading-tight max-w-[72px] ${
        isCleared ? 'text-primary' : isCurrent ? 'text-accent' : 'text-muted-foreground'
      }`}>
        {name}
      </span>
    </motion.button>
  );
}
