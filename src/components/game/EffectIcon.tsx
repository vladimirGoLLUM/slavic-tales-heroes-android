import { EFFECT_ICONS, type EffectType } from '@/types/game';

interface EffectIconProps {
  type: EffectType;
  size?: number;
  className?: string;
}

export default function EffectIcon({ type, size = 16, className = '' }: EffectIconProps) {
  const src = EFFECT_ICONS[type];
  return (
    <img
      src={src}
      alt={type}
      width={size}
      height={size}
      className={`inline-block object-contain ${className}`}
    />
  );
}
