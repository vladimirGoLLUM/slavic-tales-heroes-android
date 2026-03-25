import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '@/context/GameContext';
import { useEffect, useRef, useState } from 'react';

interface TutorialCompleteModalProps {
  open: boolean;
  onClose: () => void;
}

const REWARDS = [
  { emoji: '🔥', title: 'Пламя Ратоборца — 1 день', desc: '×2 опыт героев', border: 'border-accent/30', bg: 'bg-accent/10' },
  { emoji: '🔮', title: 'Рунный Прилив — 1 день', desc: '×2 руны', border: 'border-accent/30', bg: 'bg-accent/10' },
  { emoji: '💎', title: 'Зов Предков — 1 день', desc: '×2 души', border: 'border-accent/30', bg: 'bg-accent/10' },
  { emoji: '👑', title: 'VIP-статус — 1 день', desc: '+50% к наградам во всех битвах', border: 'border-amber-500/30', bg: 'bg-amber-500/10' },
  { emoji: '🏺', title: 'Калиновый Сосуд ×1', desc: 'Гарантированный Калиновый герой', border: 'border-purple-500/30', bg: 'bg-purple-500/10' },
  { emoji: '💠', title: '500 Мифриловых Рун', desc: 'Премиальная валюта', border: 'border-primary/30', bg: 'bg-primary/10' },
];

export default function TutorialCompleteModal({ open, onClose }: TutorialCompleteModalProps) {
  const { activateXpBooster, activateRuneBooster, activateSoulBooster, activateVipDays, addMithrilRunes, grantVessel } = useGame();
  const grantedRef = useRef(false);
  const [revealedCount, setRevealedCount] = useState(0);

  useEffect(() => {
    if (open && !grantedRef.current) {
      grantedRef.current = true;
      activateXpBooster(1);
      activateRuneBooster(1);
      activateSoulBooster(1);
      activateVipDays(1);
      addMithrilRunes(500);
      grantVessel('Калиновый', 1);
    }
  }, [open, activateXpBooster, activateRuneBooster, activateSoulBooster, activateVipDays, addMithrilRunes, grantVessel]);

  useEffect(() => {
    if (!open) { setRevealedCount(0); return; }
    if (revealedCount >= REWARDS.length) return;
    const timer = setTimeout(() => setRevealedCount(c => c + 1), 400);
    return () => clearTimeout(timer);
  }, [open, revealedCount]);

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center px-4"
      >
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
        <motion.div
          initial={{ scale: 0.85, opacity: 0, y: 30 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.85, opacity: 0 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className="relative w-full max-w-sm bg-surface border-2 border-primary/50 rounded-2xl overflow-hidden shadow-[0_0_40px_hsl(var(--primary)/0.3)] max-h-[90vh] overflow-y-auto"
        >
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1 bg-gradient-to-r from-transparent via-primary to-transparent" />
          <div className="p-6 pt-8 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1, rotate: [0, 10, -10, 0] }}
              transition={{ type: 'spring', damping: 10 }}
              className="text-6xl mb-4"
            >
              🏆
            </motion.div>
            <h2 className="text-xl font-kelly text-primary text-gold-glow mb-3">
              В добрый путь, Богатырь!
            </h2>
            <p className="text-sm text-foreground mb-2">
              Ты освоил основы боевого искусства!
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              Теперь тебе открыт весь мир Былины — Торжище, Горн Древних, Арена и многое другое. Сражайся, расти, становись легендой!
            </p>
            <div className="space-y-2 text-left bg-background/40 rounded-xl p-3 mb-4">
              {['Призвал героев', 'Собрал отряд', 'Прошёл первые бои', 'Экипировал снаряжение', 'Прокачал артефакт'].map(t => (
                <div key={t} className="flex items-center gap-2 text-sm">
                  <span className="text-primary">✅</span>
                  <span className="text-foreground">{t}</span>
                </div>
              ))}
            </div>

            <p className="text-xs font-kelly text-primary mb-2">🎁 Твои награды:</p>
            <div className="space-y-2 mb-2">
              {REWARDS.map((r, i) => (
                <AnimatePresence key={i}>
                  {i < revealedCount && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.5, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      transition={{ type: 'spring', damping: 14, stiffness: 200 }}
                      className={`${r.bg} border ${r.border} rounded-xl p-3`}
                    >
                      <p className="text-sm font-kelly text-foreground flex items-center gap-2">
                        <motion.span
                          initial={{ scale: 2, rotate: -20 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ type: 'spring', damping: 8, delay: 0.1 }}
                        >
                          {r.emoji}
                        </motion.span>
                        {r.title}
                      </p>
                      <p className="text-[10px] text-muted-foreground">{r.desc}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              ))}
            </div>
          </div>
          <div className="px-6 pb-6">
            <AnimatePresence>
              {revealedCount >= REWARDS.length && (
                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  onClick={onClose}
                  className="w-full py-3 rounded-xl font-kelly text-lg bg-primary hover:bg-primary/90 text-primary-foreground transition-all min-h-[48px] shadow-[0_0_15px_hsl(var(--primary)/0.3)]"
                >
                  🔥 В добрый путь!
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
