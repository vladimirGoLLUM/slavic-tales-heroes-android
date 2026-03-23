import { SLOT_ICONS, type ArtifactSlot } from '@/data/artifacts';

interface SlotIconProps {
  slot: ArtifactSlot;
  size?: number;
  className?: string;
}

export default function SlotIcon({ slot, size = 32, className = '' }: SlotIconProps) {
  return (
    <img
      src={SLOT_ICONS[slot]}
      alt={slot}
      width={size}
      height={size}
      className={`object-contain ${className}`}
    />
  );
}
