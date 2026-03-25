import { motion } from 'framer-motion';
import { useGame } from '@/context/GameContext';
import type { ReactNode } from 'react';

interface TutorialPulseProps {
  /** Tutorial steps at which this element should pulse */
  steps: number[];
  children: ReactNode;
  className?: string;
  /** Wrapper element type */
  as?: 'div' | 'span';
}

/**
 * Wraps an element with an animated golden glowing border
 * when the current tutorial step matches one of the given steps.
 */
export default function TutorialPulse({ steps, children, className = '', as: Tag = 'div' }: TutorialPulseProps) {
  const { player } = useGame();
  const step = player.tutorialStep ?? 99;
  const active = steps.includes(step);

  if (!active) return <Tag className={className}>{children}</Tag>;

  return (
    <Tag className={`relative ${className}`}>
      {/* Outer golden glow */}
      <motion.span
        className="absolute -inset-[3px] rounded-2xl pointer-events-none z-10"
        style={{
          background: 'linear-gradient(135deg, hsl(45 80% 55%), hsl(30 70% 45%), hsl(45 90% 65%), hsl(40 75% 50%))',
          backgroundSize: '300% 300%',
        }}
        animate={{
          backgroundPosition: ['0% 0%', '100% 100%', '0% 0%'],
          opacity: [0.7, 1, 0.7],
        }}
        transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
      />
      {/* Inner cutout to show only border */}
      <span className="absolute inset-0 rounded-xl bg-surface pointer-events-none z-10" />
      {/* Subtle pulsing shadow */}
      <motion.span
        className="absolute -inset-1 rounded-2xl pointer-events-none z-[9]"
        animate={{
          boxShadow: [
            '0 0 8px 2px hsl(45 70% 55% / 0.3), 0 0 20px 4px hsl(45 60% 50% / 0.15)',
            '0 0 14px 4px hsl(45 70% 55% / 0.5), 0 0 30px 8px hsl(45 60% 50% / 0.25)',
            '0 0 8px 2px hsl(45 70% 55% / 0.3), 0 0 20px 4px hsl(45 60% 50% / 0.15)',
          ],
        }}
        transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
      />
      {/* Content above the border layers */}
      <span className="relative z-20 block">{children}</span>
    </Tag>
  );
}
