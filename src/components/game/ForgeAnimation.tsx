import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

interface ForgeAnimationProps {
  isPlaying: boolean;
  onComplete: () => void;
  newStars: number;
}

/** Full-screen forging animation: hammer strikes, sparks, fire, then star reveal */
export default function ForgeAnimation({ isPlaying, onComplete, newStars }: ForgeAnimationProps) {
  const [phase, setPhase] = useState<'idle' | 'hammer' | 'sparks' | 'reveal'>('idle');

  useEffect(() => {
    if (!isPlaying) { setPhase('idle'); return; }
    setPhase('hammer');
    const t1 = setTimeout(() => setPhase('sparks'), 1200);
    const t2 = setTimeout(() => setPhase('reveal'), 2200);
    const t3 = setTimeout(() => { setPhase('idle'); onComplete(); }, 3600);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [isPlaying, onComplete]);

  if (!isPlaying && phase === 'idle') return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 pointer-events-auto"
      >
        {/* Fire glow background */}
        <motion.div
          className="absolute inset-0"
          animate={{
            background: phase === 'hammer'
              ? 'radial-gradient(circle at 50% 60%, hsl(20 90% 30% / 0.6), transparent 70%)'
              : phase === 'sparks'
              ? 'radial-gradient(circle at 50% 50%, hsl(35 100% 50% / 0.5), transparent 60%)'
              : phase === 'reveal'
              ? 'radial-gradient(circle at 50% 50%, hsl(45 100% 60% / 0.4), transparent 70%)'
              : 'transparent',
          }}
          transition={{ duration: 0.5 }}
        />

        {/* Hammer */}
        {phase === 'hammer' && (
          <motion.div className="absolute text-7xl sm:text-8xl" style={{ top: '30%' }}>
            <motion.span
              animate={{
                rotate: [0, -40, 0, -40, 0, -40, 0],
                y: [0, 20, 0, 20, 0, 20, 0],
                scale: [1, 1.15, 1, 1.15, 1, 1.15, 1],
              }}
              transition={{ duration: 1.2, ease: 'easeInOut' }}
              className="inline-block drop-shadow-[0_0_20px_hsl(var(--primary)/0.8)]"
            >
              🔨
            </motion.span>
          </motion.div>
        )}

        {/* Anvil */}
        {(phase === 'hammer' || phase === 'sparks') && (
          <motion.div
            className="absolute text-5xl sm:text-6xl"
            style={{ top: '55%' }}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            ⚒️
          </motion.div>
        )}

        {/* Sparks */}
        {phase === 'sparks' && (
          <div className="absolute inset-0 overflow-hidden">
            {Array.from({ length: 24 }).map((_, i) => (
              <Spark key={i} index={i} />
            ))}
          </div>
        )}

        {/* Fire particles during hammer phase */}
        {phase === 'hammer' && (
          <div className="absolute inset-0 overflow-hidden">
            {Array.from({ length: 12 }).map((_, i) => (
              <FireParticle key={i} index={i} />
            ))}
          </div>
        )}

        {/* Star reveal */}
        {phase === 'reveal' && (
          <motion.div
            className="flex flex-col items-center gap-4"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          >
            <motion.div
              className="text-6xl sm:text-7xl drop-shadow-[0_0_30px_hsl(var(--primary)/0.9)]"
              animate={{ rotate: [0, 10, -10, 5, -5, 0], scale: [1, 1.2, 1] }}
              transition={{ duration: 1 }}
            >
              ⭐
            </motion.div>
            <motion.div
              className="flex gap-1"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              {Array.from({ length: newStars }).map((_, i) => (
                <motion.span
                  key={i}
                  className="text-2xl sm:text-3xl text-primary drop-shadow-[0_0_8px_hsl(var(--primary)/0.7)]"
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.4 + i * 0.15, type: 'spring', stiffness: 300 }}
                >
                  ★
                </motion.span>
              ))}
            </motion.div>
            <motion.p
              className="font-kelly text-primary text-lg sm:text-xl text-gold-glow"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              {newStars}★ достигнуто!
            </motion.p>
          </motion.div>
        )}

        {/* Screen shake on hammer hits */}
        {phase === 'hammer' && (
          <motion.div
            className="absolute inset-0 pointer-events-none"
            animate={{ x: [0, -3, 3, -2, 2, 0, -3, 3, -2, 2, 0] }}
            transition={{ duration: 1.2 }}
          />
        )}
      </motion.div>
    </AnimatePresence>
  );
}

/* ─── Spark particle ─── */
function Spark({ index }: { index: number }) {
  const angle = (index / 24) * 360 + Math.random() * 30;
  const distance = 120 + Math.random() * 200;
  const rad = (angle * Math.PI) / 180;
  const tx = Math.cos(rad) * distance;
  const ty = Math.sin(rad) * distance;
  const size = 3 + Math.random() * 5;
  const colors = ['hsl(35 100% 60%)', 'hsl(20 100% 55%)', 'hsl(45 100% 70%)', 'hsl(10 90% 50%)'];
  const color = colors[index % colors.length];

  return (
    <motion.div
      className="absolute rounded-full"
      style={{
        width: size,
        height: size,
        left: '50%',
        top: '50%',
        background: color,
        boxShadow: `0 0 ${size * 2}px ${color}`,
      }}
      initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
      animate={{ x: tx, y: ty, opacity: 0, scale: 0.2 }}
      transition={{ duration: 0.6 + Math.random() * 0.6, delay: Math.random() * 0.3, ease: 'easeOut' }}
    />
  );
}

/* ─── Fire particle ─── */
function FireParticle({ index }: { index: number }) {
  const x = -30 + Math.random() * 60;
  const colors = ['hsl(20 100% 50%)', 'hsl(35 100% 55%)', 'hsl(10 90% 45%)'];

  return (
    <motion.div
      className="absolute rounded-full"
      style={{
        width: 6 + Math.random() * 8,
        height: 6 + Math.random() * 8,
        left: '50%',
        top: '55%',
        background: colors[index % colors.length],
        boxShadow: `0 0 12px ${colors[index % colors.length]}`,
        filter: 'blur(1px)',
      }}
      initial={{ x: 0, y: 0, opacity: 0.8, scale: 1 }}
      animate={{ x, y: -80 - Math.random() * 100, opacity: 0, scale: 0.3 }}
      transition={{
        duration: 0.8 + Math.random() * 0.5,
        delay: index * 0.1,
        ease: 'easeOut',
        repeat: 1,
      }}
    />
  );
}
