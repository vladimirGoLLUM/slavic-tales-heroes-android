import React from 'react';
import { motion } from 'framer-motion';
import { type Champion, ELEMENT_ICONS, FACTION_ICONS, RARITY_ORDER } from '@/data/gameData';
import StarDisplay from './StarDisplay';
import MythicOverlay from './MythicOverlay';

interface HeroCardProps {
  champion: Champion;
  level?: number;
  stars?: number;
  redStars?: number;
  onClick?: () => void;
  compact?: boolean;
  currentHp?: number;
}

const rarityStyles: Record<string, {
  border: string;
  glow: string;
  overlay: string;
  nameBg: string;
  cornerColor: string;
  shimmer: string;
  borderWidth: number;
}> = {
  'Обиходный': {
    border: 'hsl(40 10% 35%)',
    glow: 'none',
    overlay: 'transparent',
    nameBg: 'transparent',
    cornerColor: 'transparent',
    shimmer: 'transparent',
    borderWidth: 1,
  },
  'Заветный': {
    border: 'hsl(145 50% 40%)',
    glow: '0 0 12px hsl(145 50% 40% / 0.25)',
    overlay: 'linear-gradient(180deg, transparent 60%, hsl(145 50% 40% / 0.08) 100%)',
    nameBg: 'linear-gradient(90deg, hsl(145 50% 40% / 0.15), transparent)',
    cornerColor: 'hsl(145 50% 40% / 0.5)',
    shimmer: 'hsl(145 60% 55% / 0.12)',
    borderWidth: 1.5,
  },
  'Сказанный': {
    border: 'hsl(220 60% 55%)',
    glow: '0 0 20px hsl(220 60% 55% / 0.3), 0 0 40px hsl(220 60% 55% / 0.1)',
    overlay: 'linear-gradient(180deg, hsl(220 60% 55% / 0.05) 0%, transparent 30%, hsl(220 60% 55% / 0.1) 100%)',
    nameBg: 'linear-gradient(90deg, hsl(220 60% 55% / 0.2), transparent)',
    cornerColor: 'hsl(220 60% 55% / 0.6)',
    shimmer: 'hsl(220 70% 65% / 0.15)',
    borderWidth: 1.5,
  },
  'Калиновый': {
    border: 'hsl(280 55% 50%)',
    glow: '0 0 25px hsl(280 55% 50% / 0.35), 0 0 50px hsl(280 55% 50% / 0.15)',
    overlay: 'linear-gradient(180deg, hsl(280 55% 50% / 0.08) 0%, transparent 40%, hsl(280 55% 50% / 0.12) 100%)',
    nameBg: 'linear-gradient(90deg, hsl(280 55% 50% / 0.25), transparent)',
    cornerColor: 'hsl(280 55% 50% / 0.7)',
    shimmer: 'hsl(280 65% 60% / 0.18)',
    borderWidth: 2,
  },
  'Самоцветный': {
    border: 'hsl(40 85% 55%)',
    glow: '0 0 30px hsl(40 85% 55% / 0.4), 0 0 60px hsl(40 85% 55% / 0.15), 0 0 80px hsl(0 70% 50% / 0.08)',
    overlay: 'linear-gradient(180deg, hsl(40 85% 55% / 0.1) 0%, transparent 30%, hsl(0 70% 50% / 0.1) 70%, hsl(40 85% 55% / 0.15) 100%)',
    nameBg: 'linear-gradient(90deg, hsl(40 85% 55% / 0.3), hsl(0 70% 50% / 0.1), transparent)',
    cornerColor: 'hsl(40 85% 55% / 0.8)',
    shimmer: 'hsl(40 90% 60% / 0.2)',
    borderWidth: 2,
  },
};

const rarityLabelColors: Record<string, string> = {
  'Обиходный': 'hsl(40 10% 50%)',
  'Заветный': 'hsl(145 50% 45%)',
  'Сказанный': 'hsl(220 60% 60%)',
  'Калиновый': 'hsl(280 55% 60%)',
  'Самоцветный': 'hsl(40 85% 55%)',
};

const HeroCard = React.memo(function HeroCard({ champion, level = 1, stars = 0, redStars = 0, onClick, compact, currentHp }: HeroCardProps) {
  const hpPercent = currentHp !== undefined ? (currentHp / champion.baseStats.hp) * 100 : 100;
  const style = rarityStyles[champion.rarity];
  const rarityIdx = RARITY_ORDER[champion.rarity];
  const isHighRarity = rarityIdx >= 3; // Калиновый+
  const isMythic = rarityIdx >= 4;

  return (
    <motion.div
      className="relative cursor-pointer group"
      data-hero-id={champion.id}
      data-testid="hero-card"
      style={{ borderRadius: 12, overflow: 'hidden' }}
      whileHover={{ y: -8, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      layout
    >
      <div
        className="relative bg-card"
        style={{
          borderRadius: 12,
          boxShadow: `0 0 0 ${style.borderWidth}px ${style.border}, 0 10px 30px -10px rgba(0,0,0,0.8), ${style.glow}`,
        }}
      >
        {/* Corner ornaments for epic+ */}
        {rarityIdx >= 2 && (
          <>
            <div className="absolute top-0 left-0 z-20 pointer-events-none" style={{
              width: 16, height: 16,
              borderTop: `2px solid ${style.cornerColor}`,
              borderLeft: `2px solid ${style.cornerColor}`,
              borderRadius: '12px 0 0 0',
            }} />
            <div className="absolute top-0 right-0 z-20 pointer-events-none" style={{
              width: 16, height: 16,
              borderTop: `2px solid ${style.cornerColor}`,
              borderRight: `2px solid ${style.cornerColor}`,
              borderRadius: '0 12px 0 0',
            }} />
            <div className="absolute bottom-0 left-0 z-20 pointer-events-none" style={{
              width: 16, height: 16,
              borderBottom: `2px solid ${style.cornerColor}`,
              borderLeft: `2px solid ${style.cornerColor}`,
              borderRadius: '0 0 0 12px',
            }} />
            <div className="absolute bottom-0 right-0 z-20 pointer-events-none" style={{
              width: 16, height: 16,
              borderBottom: `2px solid ${style.cornerColor}`,
              borderRight: `2px solid ${style.cornerColor}`,
              borderRadius: '0 0 12px 0',
            }} />
          </>
        )}

        {/* Image */}
        <div className="relative overflow-hidden" style={{ borderRadius: '12px 12px 0 0' }}>
          <div className={compact ? 'h-28 sm:h-40' : 'h-40 sm:h-56'}>
            <img
              src={champion.imageUrl}
              alt={champion.name}
              loading="lazy"
              className="w-full h-full object-cover transition-all duration-500 group-hover:scale-110 group-hover:brightness-110"
              style={{
                filter: rarityIdx === 0
                  ? 'sepia(0.4) contrast(1.05) brightness(0.85) saturate(0.8)'
                  : rarityIdx === 1
                  ? 'sepia(0.15) contrast(1.1) brightness(0.9) saturate(1.05)'
                  : rarityIdx === 2
                  ? 'contrast(1.15) brightness(0.95) saturate(1.15)'
                  : rarityIdx === 3
                  ? 'contrast(1.2) brightness(1.0) saturate(1.25)'
                  : 'contrast(1.25) brightness(1.05) saturate(1.35)',
              }}
            />
          </div>

          {/* Rarity color overlay on image */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: style.overlay }}
          />

          {/* Element badge */}
          <div className="absolute top-1 left-1 sm:top-2 sm:left-2 px-1.5 py-0.5 rounded-md bg-background/80 backdrop-blur-sm text-[10px] sm:text-sm font-kelly">
            <span>{ELEMENT_ICONS[champion.element]}</span>
            <span className="ml-0.5 hidden sm:inline">{champion.element}</span>
          </div>

          {/* Level badge */}
          <div className="absolute top-1 right-1 sm:top-2 sm:right-2 px-1.5 py-0.5 rounded-md bg-background/80 backdrop-blur-sm font-mono text-[10px] sm:text-sm">
            {level}
          </div>

          {/* Rarity label bottom-left */}
          <div
            className="absolute bottom-1.5 left-2 px-1.5 py-0.5 rounded text-[10px] font-kelly tracking-wide uppercase"
            style={{
              color: rarityLabelColors[champion.rarity],
              background: 'hsl(0 0% 0% / 0.55)',
              backdropFilter: 'blur(4px)',
              border: `1px solid ${style.cornerColor}`,
            }}
          >
            {champion.rarity}
          </div>

          {/* Rarity overlay — scales per tier */}
          <MythicOverlay element={champion.element} rarity={champion.rarity} interactive compact />

          {/* HP bar */}
          {currentHp !== undefined && (
            <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-background/50">
              <div
                className="h-full blood-gauge transition-all duration-500"
                style={{ width: `${hpPercent}%` }}
              />
            </div>
          )}
        </div>

        {/* Info section */}
        <div className="p-2 sm:p-3" style={{ background: style.nameBg }}>
          <h3 className="font-kelly text-sm sm:text-lg leading-tight truncate" style={{
            color: isMythic ? rarityLabelColors[champion.rarity] : 'hsl(var(--foreground))',
            textShadow: isMythic ? `0 0 8px ${style.shimmer}` : 'none',
          }}>
            {champion.name}
          </h3>

          <div className="flex items-center justify-between mt-0.5">
            <span className="text-[10px] sm:text-sm text-muted-foreground truncate flex items-center gap-1">
              {FACTION_ICONS[champion.faction] && <img src={FACTION_ICONS[champion.faction]} alt="" className="w-3 h-3 sm:w-4 sm:h-4 object-contain" />}
              {champion.faction}
            </span>
            <StarDisplay stars={stars} redStars={redStars} size="xs" />
          </div>

          {!compact && (
            <div className="grid grid-cols-4 gap-1 mt-2 sm:mt-3">
              {(['hp', 'atk', 'def', 'spd'] as const).map(stat => (
                <div key={stat} className="text-center">
                  <div className="text-[9px] sm:text-xs text-muted-foreground uppercase">
                    {stat === 'hp' ? 'ЗДР' : stat === 'atk' ? 'АТК' : stat === 'def' ? 'ЗАЩ' : 'СКР'}
                  </div>
                  <div className="font-mono text-[10px] sm:text-sm text-foreground">{champion.baseStats[stat]}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Animated shimmer — only for rare+ */}
        {rarityIdx >= 1 && (
          <motion.div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `linear-gradient(105deg, transparent 40%, ${style.shimmer} 45%, ${style.shimmer} 50%, ${style.shimmer} 55%, transparent 60%)`,
              backgroundSize: '200% 100%',
            }}
            initial={{ backgroundPosition: '-200% 0' }}
            whileHover={{ backgroundPosition: '200% 0' }}
            transition={{ duration: 0.8 }}
          />
        )}

        {/* Mythic animated border pulse */}
        {isMythic && (
          <motion.div
            className="absolute inset-0 pointer-events-none rounded-xl"
            style={{
              boxShadow: `inset 0 0 0 1px ${style.border}`,
            }}
            animate={{
              boxShadow: [
                `inset 0 0 0 1px ${style.border}`,
                `inset 0 0 15px 1px ${style.shimmer}`,
                `inset 0 0 0 1px ${style.border}`,
              ],
            }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}
      </div>
    </motion.div>
  );
});

export default HeroCard;
