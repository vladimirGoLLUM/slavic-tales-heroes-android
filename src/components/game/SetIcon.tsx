import { SET_ICONS, type ArtifactSet } from '@/data/artifacts';
import type { Element } from '@/data/gameData';
import MythicOverlay from './MythicOverlay';

/** Map each artifact set to a thematic element for MythicOverlay coloring */
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

interface SetIconProps {
  set: ArtifactSet;
  size?: number;
  className?: string;
}

export default function SetIcon({ set, size = 16, className = '' }: SetIconProps) {
  return (
    <span className="relative inline-block overflow-hidden rounded-sm" style={{ width: size, height: size }}>
      <img
        src={SET_ICONS[set]}
        alt={set}
        width={size}
        height={size}
        className={`object-contain inline-block ${className}`}
      />
      <MythicOverlay element={SET_ELEMENT[set]} rarity="Калиновый" compact />
    </span>
  );
}
