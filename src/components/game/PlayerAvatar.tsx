import { useGame } from '@/context/GameContext';

interface PlayerAvatarProps {
  src?: string | null;
  size?: number;
  className?: string;
  isVip?: boolean;
}

export default function PlayerAvatar({ src, size = 36, isVip, className = '' }: PlayerAvatarProps) {
  const { avatarUrl, isVipActive } = useGame();
  const url = src !== undefined ? src : avatarUrl;
  const vip = isVip !== undefined ? isVip : isVipActive();

  return (
    <div
      className={`relative rounded-full overflow-visible flex-shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      <div
        className={`rounded-full overflow-hidden w-full h-full border-2 ${vip ? 'border-amber-400' : 'border-primary/40'} bg-background/60`}
        style={vip ? { animation: 'vipGlow 2s ease-in-out infinite' } : undefined}
      >
        {url ? (
          <img src={url} alt="Аватар" className="w-full h-full object-cover object-top" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground" style={{ fontSize: size * 0.45 }}>
            👤
          </div>
        )}
      </div>
      {vip && (
        <span
          className="absolute flex items-center justify-center bg-amber-400 rounded-full border border-amber-600"
          style={{ width: size * 0.38, height: size * 0.38, bottom: -2, right: -2, fontSize: size * 0.22 }}
        >
          👑
        </span>
      )}
    </div>
  );
}
