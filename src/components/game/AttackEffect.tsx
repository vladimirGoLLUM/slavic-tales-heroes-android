import { motion, AnimatePresence } from 'framer-motion';

interface AttackEffectProps {
  unitId: string;
  active: boolean;
  type: 'hit' | 'crit' | 'heal' | 'buff' | 'debuff';
  element?: string;
}

const ELEMENT_COLORS: Record<string, string> = {
  fire: 'from-orange-500/60 to-red-500/40',
  water: 'from-blue-400/60 to-cyan-400/40',
  wood: 'from-green-500/60 to-emerald-400/40',
  stone: 'from-amber-600/60 to-yellow-700/40',
  shadow: 'from-purple-600/60 to-violet-800/40',
};

export default function AttackEffect({ unitId, active, type, element }: AttackEffectProps) {
  const gradient = element ? ELEMENT_COLORS[element] || 'from-primary/50 to-accent/30' : 'from-accent/50 to-red-500/30';

  return (
    <AnimatePresence>
      {active && type === 'hit' && (
        <motion.div
          key={`hit-${unitId}`}
          className={`absolute inset-0 rounded-lg bg-gradient-to-t ${gradient} z-10 pointer-events-none`}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: [0, 0.8, 0], scale: [0.9, 1.1, 1] }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
        />
      )}
      {active && type === 'crit' && (
        <>
          <motion.div
            key={`crit-${unitId}`}
            className="absolute inset-0 rounded-lg bg-gradient-to-t from-primary/70 to-yellow-400/50 z-10 pointer-events-none"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: [0, 1, 0], scale: [0.8, 1.3, 1] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
          />
          {/* Starburst */}
          <motion.div
            key={`star-${unitId}`}
            className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none text-3xl"
            initial={{ opacity: 0, scale: 0, rotate: 0 }}
            animate={{ opacity: [0, 1, 0], scale: [0, 1.5, 0.5], rotate: 180 }}
            transition={{ duration: 0.7 }}
          >
            ✦
          </motion.div>
        </>
      )}
      {active && type === 'heal' && (
        <motion.div
          key={`heal-${unitId}`}
          className="absolute inset-0 rounded-lg bg-gradient-to-t from-green-500/50 to-emerald-300/30 z-10 pointer-events-none"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: [0, 0.7, 0], y: [-5, -15] }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
        />
      )}
    </AnimatePresence>
  );
}
