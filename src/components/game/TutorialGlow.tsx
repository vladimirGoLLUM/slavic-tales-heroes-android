import { motion } from 'framer-motion';

interface TutorialGlowProps {
  /** Border radius class, e.g. 'rounded-xl', 'rounded-2xl', 'rounded-lg' */
  rounded?: string;
  /** Optional text label shown above the element */
  label?: string;
  /** z-index for the glow layers (default 10) */
  z?: number;
  /** Allow multi-line wide labels */
  wide?: boolean;
  /** Render label below the element instead of above */
  below?: boolean;
}

/**
 * Renders an animated golden gradient border + pulsing shadow glow.
 * Must be placed inside a `relative` parent.
 */
export default function TutorialGlow({ rounded = 'rounded-xl', label, z = 10, wide = false, below = false }: TutorialGlowProps) {
  return (
    <>
      {/* Animated gradient border */}
      <motion.span
        className={`absolute -inset-[3px] ${rounded} pointer-events-none`}
        style={{
          zIndex: z,
          background: 'linear-gradient(135deg, hsl(45 80% 55%), hsl(30 70% 45%), hsl(45 90% 65%), hsl(40 75% 50%))',
          backgroundSize: '300% 300%',
        }}
        animate={{ backgroundPosition: ['0% 0%', '100% 100%', '0% 0%'], opacity: [0.7, 1, 0.7] }}
        transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
      />
      {/* Pulsing outer shadow */}
      <motion.span
        className={`absolute -inset-1 ${rounded} pointer-events-none`}
        style={{ zIndex: z - 1 }}
        animate={{
          boxShadow: [
            '0 0 8px 2px hsl(45 70% 55% / 0.3), 0 0 20px 4px hsl(45 60% 50% / 0.15)',
            '0 0 14px 4px hsl(45 70% 55% / 0.5), 0 0 30px 8px hsl(45 60% 50% / 0.25)',
            '0 0 8px 2px hsl(45 70% 55% / 0.3), 0 0 20px 4px hsl(45 60% 50% / 0.15)',
          ],
        }}
        transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
      />
      {/* Optional label */}
      {label && (
        <motion.span
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.4, ease: 'easeOut' }}
          className={`absolute left-1/2 -translate-x-1/2 text-[10px] font-kelly text-primary bg-background/80 backdrop-blur-sm px-2 py-0.5 rounded-md border border-primary/30 pointer-events-none ${below ? 'top-full mt-2' : wide ? '-top-14' : '-top-8'} ${wide ? 'max-w-[220px] text-center whitespace-normal' : 'whitespace-nowrap'}`}
          style={{ zIndex: z + 50 }}
        >
          {label}
        </motion.span>
      )}
    </>
  );
}
