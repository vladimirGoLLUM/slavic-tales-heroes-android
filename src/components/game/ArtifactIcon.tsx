import { getArtifactImageUrl, SLOT_ICONS, type ArtifactSlot, type ArtifactSet } from '@/data/artifacts';
import type { Element } from '@/data/gameData';
import MythicOverlay from './MythicOverlay';

const SET_ELEMENT: Record<ArtifactSet, Element> = {
  'Жизнь': 'Лес',
  'Атака': 'Огонь',
  'Защита': 'Камень',
  'Крит. шанс': 'Огонь',
  'Меткость': 'Свет',
  'Скорость': 'Вода',
  'Сопротивление': 'Камень',
  'Крит. урон': 'Огонь',
  'Вампиризм': 'Тень',
  'Возмездие': 'Свет',
  'Ярость': 'Огонь',
  'Стойкость': 'Камень',
  'Рассечение': 'Огонь',
  'Неуязвимость': 'Свет',
  'Контратака': 'Камень',
  'Отравление': 'Лес',
  'Заморозка': 'Вода',
  'Регенерация': 'Лес',
  'Проклятие': 'Тень',
  'Берсерк': 'Огонь',
  'Воля Волхва': 'Свет',
  'Крик Леля': 'Лес',
  'Зов Перуна': 'Свет',
  'Гнев Гидры': 'Вода',
  'Клыки Цербера': 'Тень',
  'Чёрная Вдова': 'Тень',
  'Каменный Жук': 'Камень',
  'Огненный Змей': 'Огонь',
  'Ледяная': 'Вода',
  'Небесный': 'Свет',
  'Дренос': 'Лес',
  'Боммал': 'Камень',
  'Тёмная': 'Тень',
};

interface ArtifactIconProps {
  slot: ArtifactSlot;
  set?: ArtifactSet;
  size?: number;
  className?: string;
}

export default function ArtifactIcon({ slot, set, size = 32, className = '' }: ArtifactIconProps) {
  const src = set ? getArtifactImageUrl(slot, set) : SLOT_ICONS[slot];

  return (
    <span className="relative inline-block overflow-hidden rounded-sm" style={{ width: size, height: size }}>
      <img
        src={src}
        alt={slot}
        width={size}
        height={size}
        className={`object-contain ${className}`}
        onError={(e) => {
          (e.target as HTMLImageElement).src = SLOT_ICONS[slot];
        }}
      />
      {set && (
        <MythicOverlay element={SET_ELEMENT[set]} rarity="Калиновый" compact />
      )}
    </span>
  );
}
