import { useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import type { Element, Rarity } from '@/data/gameData';
import { RARITY_ORDER } from '@/data/gameData';

/** HSL color strings per element */
export const ELEMENT_HSL: Record<Element, string> = {
  'Огонь': '15 90% 55%',
  'Вода': '210 80% 50%',
  'Лес': '140 70% 40%',
  'Камень': '30 50% 40%',
  'Тень': '270 60% 45%',
  'Свет': '45 95% 60%',
};

/** Rarity HSL for glow color when element isn't dominant */
const RARITY_HSL: Record<string, string> = {
  'Обиходный': '40 10% 50%',
  'Заветный': '145 50% 45%',
  'Сказанный': '220 60% 55%',
  'Калиновый': '280 55% 55%',
  'Самоцветный': '40 85% 55%',
};

/** Per-rarity intensity config */
interface RarityConfig {
  particles: number;
  particleSize: number;
  holoOpacity: number;
  holoHoverOpacity: number;
  glowIntensity: number;
  glareStrength: number;
  shimmerSpeed: number;
  useRainbow: boolean;
}

const RARITY_CONFIG: Record<number, RarityConfig> = {
  0: { // Обиходный — subtle single-color shimmer
    particles: 0,
    particleSize: 0,
    holoOpacity: 0.06,
    holoHoverOpacity: 0.15,
    glowIntensity: 0.05,
    glareStrength: 0.08,
    shimmerSpeed: 6,
    useRainbow: false,
  },
  1: { // Заветный — faint particles + light glow
    particles: 2,
    particleSize: 0.75,
    holoOpacity: 0.1,
    holoHoverOpacity: 0.25,
    glowIntensity: 0.1,
    glareStrength: 0.12,
    shimmerSpeed: 5,
    useRainbow: false,
  },
  2: { // Сказанный — visible particles + medium glow
    particles: 3,
    particleSize: 1,
    holoOpacity: 0.15,
    holoHoverOpacity: 0.4,
    glowIntensity: 0.15,
    glareStrength: 0.15,
    shimmerSpeed: 4.5,
    useRainbow: false,
  },
  3: { // Калиновый — strong particles + rich holo
    particles: 5,
    particleSize: 1,
    holoOpacity: 0.22,
    holoHoverOpacity: 0.6,
    glowIntensity: 0.22,
    glareStrength: 0.2,
    shimmerSpeed: 3.5,
    useRainbow: true,
  },
  4: { // Самоцветный — full mythic effects
    particles: 8,
    particleSize: 1,
    holoOpacity: 0.35,
    holoHoverOpacity: 0.85,
    glowIntensity: 0.35,
    glareStrength: 0.25,
    shimmerSpeed: 3,
    useRainbow: true,
  },
};

interface MythicOverlayProps {
  element: Element;
  rarity?: Rarity;
  /** Enable interactive mouse tracking (disable for battle perf) */
  interactive?: boolean;
  /** Compact mode reduces particle count */
  compact?: boolean;
}

/**
 * Reusable holographic + particle overlay for ALL hero rarities.
 * Effects scale with rarity tier. Place inside a `position: relative; overflow: hidden` container.
 */
export default function MythicOverlay({ element, rarity = 'Самоцветный', interactive = false, compact = false }: MythicOverlayProps) {
  const rarityIdx = RARITY_ORDER[rarity];
  const cfg = RARITY_CONFIG[rarityIdx] ?? RARITY_CONFIG[0];
  const ec = ELEMENT_HSL[element];
  const rc = RARITY_HSL[rarity] ?? ec;
  const glowColor = rarityIdx >= 3 ? ec : rc;

  const containerRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMove = useCallback((e: React.MouseEvent) => {
    if (!interactive || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setMousePos({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    });
  }, [interactive]);

  const particleCount = compact ? Math.max(0, cfg.particles - 2) : cfg.particles;

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 pointer-events-none z-10"
      style={{ pointerEvents: interactive ? 'auto' : 'none' }}
      onMouseMove={handleMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => { setIsHovered(false); setMousePos({ x: 50, y: 50 }); }}
    >
      {/* Floating elemental particles */}
      {particleCount > 0 && Array.from({ length: particleCount }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: cfg.particleSize * 4,
            height: cfg.particleSize * 4,
            background: `hsl(${ec})`,
            left: `${10 + ((i * 37) % 80)}%`,
            top: `${10 + ((i * 53) % 80)}%`,
            boxShadow: `0 0 ${3 + rarityIdx}px hsl(${ec})`,
          }}
          animate={{
            y: [0, -(6 + rarityIdx * 2), 0],
            opacity: [0.1, 0.4 + rarityIdx * 0.1, 0.1],
            scale: [0.6, 1 + rarityIdx * 0.1, 0.6],
          }}
          transition={{
            duration: cfg.shimmerSpeed - (i % 3) * 0.3,
            repeat: Infinity,
            delay: (i * 0.4) % 2,
          }}
        />
      ))}

      {/* Holographic overlay — rainbow for high rarity, monochrome for lower */}
      <div
        className="absolute inset-0"
        style={{
          mixBlendMode: 'overlay',
          background: cfg.useRainbow
            ? `linear-gradient(
                ${mousePos.x * 3.6}deg,
                rgba(255,0,0,0.08) 0%,
                rgba(255,154,0,0.12) 15%,
                rgba(208,222,33,0.08) 25%,
                rgba(0,255,128,0.12) 40%,
                rgba(0,200,255,0.08) 55%,
                rgba(100,100,255,0.12) 70%,
                rgba(180,0,255,0.08) 85%,
                rgba(255,0,100,0.08) 100%
              )`
            : `linear-gradient(
                ${mousePos.x * 3.6}deg,
                hsl(${rc} / 0.05) 0%,
                hsl(${rc} / ${0.08 + rarityIdx * 0.03}) 50%,
                hsl(${rc} / 0.05) 100%
              )`,
          opacity: isHovered ? cfg.holoHoverOpacity : cfg.holoOpacity,
          transition: 'opacity 0.3s',
        }}
      />

      {/* Interactive glare */}
      {interactive && isHovered && cfg.glareStrength > 0 && (
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(circle at ${mousePos.x}% ${mousePos.y}%, rgba(255,255,255,${cfg.glareStrength}), transparent 55%)`,
          }}
        />
      )}

      {/* Pulsing border glow */}
      {cfg.glowIntensity > 0 && (
        <motion.div
          className="absolute inset-0 rounded-[inherit]"
          animate={{
            boxShadow: [
              `inset 0 0 ${4 + rarityIdx * 2}px hsl(${glowColor} / ${cfg.glowIntensity * 0.5}), 0 0 ${5 + rarityIdx * 3}px hsl(${glowColor} / ${cfg.glowIntensity * 0.6})`,
              `inset 0 0 ${8 + rarityIdx * 3}px hsl(${glowColor} / ${cfg.glowIntensity * 0.8}), 0 0 ${12 + rarityIdx * 4}px hsl(${glowColor} / ${cfg.glowIntensity})`,
              `inset 0 0 ${4 + rarityIdx * 2}px hsl(${glowColor} / ${cfg.glowIntensity * 0.5}), 0 0 ${5 + rarityIdx * 3}px hsl(${glowColor} / ${cfg.glowIntensity * 0.6})`,
            ],
          }}
          transition={{ duration: cfg.shimmerSpeed, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}
    </div>
  );
}
