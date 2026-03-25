import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useGame } from '@/context/GameContext';
import { LOGIN_BONUS_DAYS } from '@/data/loginBonusData';
import { SLOT_LABELS, SLOT_ICONS } from '@/data/artifacts';
import { toast } from 'sonner';
import { Gift, Check, Lock } from 'lucide-react';

/* ── Particle burst on claim ── */
function ClaimParticles() {
  const particles = useMemo(() =>
    Array.from({ length: 24 }).map((_, i) => {
      const angle = (i / 24) * 360;
      const rad = (angle * Math.PI) / 180;
      const dist = 60 + Math.random() * 50;
      return {
        id: i,
        x: Math.cos(rad) * dist,
        y: Math.sin(rad) * dist,
        size: 3 + Math.random() * 4,
        delay: Math.random() * 0.15,
        hue: 35 + Math.random() * 20, // gold range
      };
    }), []);

  return (
    <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
      {particles.map(p => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: '50%',
            top: '50%',
            width: p.size,
            height: p.size,
            background: `hsl(${p.hue}, 90%, 60%)`,
            boxShadow: `0 0 6px hsl(${p.hue}, 90%, 60%)`,
          }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          animate={{ x: p.x, y: p.y, opacity: 0, scale: 0.3 }}
          transition={{ duration: 0.7, delay: p.delay, ease: 'easeOut' }}
        />
      ))}
    </div>
  );
}

/* ── Reward reveal overlay ── */
function RewardReveal({ type, label, onDone }: { type: 'artifact' | 'hero'; label: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2800);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <motion.div
      className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm rounded-lg"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Radial glow */}
      <motion.div
        className="absolute w-40 h-40 rounded-full"
        style={{
          background: 'radial-gradient(circle, hsl(40 90% 55% / 0.4), transparent 70%)',
        }}
        animate={{ scale: [0.5, 1.3, 1], opacity: [0, 1, 0.6] }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
      />

      {/* Spinning ring */}
      <motion.div
        className="absolute w-28 h-28 rounded-full border-2 border-primary/50"
        style={{ borderStyle: 'dashed' }}
        animate={{ rotate: 360 }}
        transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
      />

      {/* Icon */}
      <motion.div
        className="relative z-10"
        initial={{ scale: 0, rotate: -20 }}
        animate={{ scale: [0, 1.3, 1], rotate: [-20, 5, 0] }}
        transition={{ duration: 0.6, ease: 'backOut' }}
      >
        <span className="text-5xl">{type === 'hero' ? '🦸' : '⚔️'}</span>
      </motion.div>

      {/* Label */}
      <motion.p
        className="relative z-10 mt-3 font-kelly text-sm text-primary text-gold-glow text-center px-4"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        {label}
      </motion.p>

      {/* Floating sparkles */}
      {Array.from({ length: 6 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full bg-primary/60"
          style={{
            width: 3,
            height: 3,
            left: `${20 + i * 12}%`,
            top: `${30 + (i % 3) * 15}%`,
          }}
          animate={{
            y: [0, -15, 0],
            opacity: [0.2, 0.8, 0.2],
            scale: [0.6, 1.2, 0.6],
          }}
          transition={{
            duration: 1.5 + i * 0.2,
            repeat: Infinity,
            delay: i * 0.25,
          }}
        />
      ))}

      <ClaimParticles />
    </motion.div>
  );
}

interface LoginBonusModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function LoginBonusModal({ open, onOpenChange }: LoginBonusModalProps) {
  const { player, claimLoginBonus, canClaimLoginBonus } = useGame();
  const currentDay = player.loginBonusDay ?? 0;
  const canClaim = canClaimLoginBonus();
  const [justClaimed, setJustClaimed] = useState<number | null>(null);
  const [rewardInfo, setRewardInfo] = useState<{ type: 'artifact' | 'hero'; label: string } | null>(null);

  useEffect(() => {
    if (open) {
      setJustClaimed(null);
      setRewardInfo(null);
    }
  }, [open]);

  const handleClaim = () => {
    const result = claimLoginBonus();
    if (result) {
      const dayNum = currentDay + 1;
      setJustClaimed(dayNum);

      if (result.type === 'artifact') {
        const slotLabel = SLOT_LABELS[result.item.slot as keyof typeof SLOT_LABELS] ?? result.item.slot;
        setRewardInfo({ type: 'artifact', label: `${slotLabel} 5★ Самоцветный\nСет «Неуязвимость»` });
        toast.success(`🎁 День ${dayNum}: ${slotLabel} 5★ Самоцветный!`, {
          description: `Сет «Неуязвимость» добавлен в инвентарь`,
        });
      } else {
        setRewardInfo({ type: 'hero', label: `${result.item.name}\nСамоцветный Герой` });
        toast.success(`🎁 День 7: Герой ${result.item.name}!`, {
          description: `Самоцветный герой добавлен в коллекцию`,
        });
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 bg-surface border-primary/40 card-lubok overflow-hidden">
        <DialogTitle className="sr-only">Бонус 7 дней входа</DialogTitle>

        {/* Ambient floating particles in background */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
          {Array.from({ length: 8 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full bg-primary/20"
              style={{
                width: 2 + (i % 3) * 2,
                height: 2 + (i % 3) * 2,
                left: `${10 + i * 11}%`,
                top: `${20 + (i * 17) % 60}%`,
              }}
              animate={{
                y: [0, -(10 + i * 3), 0],
                opacity: [0.1, 0.5, 0.1],
              }}
              transition={{
                duration: 3 + i * 0.4,
                repeat: Infinity,
                delay: i * 0.5,
              }}
            />
          ))}
        </div>

        {/* Header */}
        <div className="relative z-10 px-5 pt-5 pb-3 text-center">
          <motion.h2
            className="font-kelly text-xl text-primary text-gold-glow"
            animate={{ textShadow: ['0 0 8px hsl(40 90% 55% / 0.3)', '0 0 16px hsl(40 90% 55% / 0.6)', '0 0 8px hsl(40 90% 55% / 0.3)'] }}
            transition={{ duration: 2.5, repeat: Infinity }}
          >
            🎁 Бонус 7 дней входа
          </motion.h2>
          <p className="text-xs text-muted-foreground mt-1">Заходи каждый день и получай награды!</p>
        </div>

        {/* Days grid */}
        <div className="relative z-10 px-4 pb-5">
          <div className="grid grid-cols-4 gap-2">
            {LOGIN_BONUS_DAYS.map((day) => {
              const claimed = day.day <= currentDay;
              const isActive = day.day === currentDay + 1 && canClaim;
              const isJustClaimed = justClaimed === day.day;
              const locked = !claimed && !isActive;

              return (
                <motion.div
                  key={day.day}
                  className={`relative rounded-lg border p-2 flex flex-col items-center gap-1 transition-all overflow-hidden ${
                    isJustClaimed
                      ? 'border-primary bg-primary/20 shadow-[0_0_24px_hsl(var(--primary)/0.6)]'
                      : isActive
                        ? 'border-primary/60 bg-primary/10 shadow-[0_0_12px_hsl(var(--primary)/0.3)]'
                        : claimed
                          ? 'border-border/40 bg-surface/40 opacity-60'
                          : 'border-border/20 bg-surface/20 opacity-40'
                  }`}
                  animate={isActive && !justClaimed ? {
                    scale: [1, 1.04, 1],
                    boxShadow: [
                      '0 0 8px hsl(var(--primary) / 0.2)',
                      '0 0 20px hsl(var(--primary) / 0.5)',
                      '0 0 8px hsl(var(--primary) / 0.2)',
                    ],
                  } : {}}
                  transition={isActive ? { duration: 2, repeat: Infinity } : {}}
                >
                  {/* Active cell glow ring */}
                  {isActive && !justClaimed && (
                    <motion.div
                      className="absolute inset-0 rounded-lg border-2 border-primary/40"
                      animate={{ opacity: [0.3, 0.8, 0.3] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    />
                  )}

                  {/* Day number */}
                  <span className={`text-[10px] font-kelly ${isActive ? 'text-primary' : claimed ? 'text-muted-foreground' : 'text-muted-foreground/60'}`}>
                    День {day.day}
                  </span>

                  {/* Icon with glow for active */}
                  <div className="relative w-10 h-10 flex items-center justify-center">
                    {isActive && (
                      <motion.div
                        className="absolute inset-0 rounded-full"
                        style={{ background: 'radial-gradient(circle, hsl(var(--primary) / 0.3), transparent 70%)' }}
                        animate={{ scale: [0.8, 1.2, 0.8], opacity: [0.3, 0.7, 0.3] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                    )}
                    {day.type === 'artifact' && day.slot ? (
                      <motion.img
                        src={SLOT_ICONS[day.slot]}
                        alt={SLOT_LABELS[day.slot]}
                        className={`w-8 h-8 object-contain relative z-10 ${locked ? 'grayscale' : ''}`}
                        animate={isJustClaimed ? { rotate: [0, -10, 10, 0], scale: [1, 1.2, 1] } : {}}
                        transition={isJustClaimed ? { duration: 0.5 } : {}}
                      />
                    ) : (
                      <motion.span
                        className="text-2xl relative z-10"
                        animate={isJustClaimed ? { scale: [1, 1.3, 1] } : {}}
                        transition={isJustClaimed ? { duration: 0.5 } : {}}
                      >
                        🦸
                      </motion.span>
                    )}
                  </div>

                  {/* Label */}
                  <span className={`text-[9px] font-kelly text-center leading-tight ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {day.label}
                  </span>

                  {/* Status overlay */}
                  {claimed && !isJustClaimed && (
                    <div className="absolute inset-0 rounded-lg bg-background/40 flex items-center justify-center">
                      <Check className="w-6 h-6 text-primary" />
                    </div>
                  )}
                  {locked && !claimed && (
                    <div className="absolute top-1 right-1">
                      <Lock className="w-3 h-3 text-muted-foreground/40" />
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* Set label */}
          <p className="text-center text-[10px] text-muted-foreground mt-2">
            Дни 1–6: Сет «Неуязвимость» • День 7: Случайный герой
          </p>

          {/* Claim button */}
          <div className="mt-3 flex justify-center">
            {currentDay >= 7 ? (
              <p className="text-sm font-kelly text-primary">✅ Все награды получены!</p>
            ) : canClaim && !justClaimed ? (
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: [0.95, 1.05, 0.95] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <Button
                  onClick={handleClaim}
                  className="bg-primary text-primary-foreground font-kelly px-6 shadow-[0_0_16px_hsl(var(--primary)/0.4)]"
                >
                  <Gift className="w-4 h-4 mr-1" />
                  Забрать День {currentDay + 1}
                </Button>
              </motion.div>
            ) : justClaimed ? (
              <motion.p
                className="text-sm font-kelly text-primary"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
              >
                ✨ Награда получена!
              </motion.p>
            ) : (
              <p className="text-sm font-kelly text-muted-foreground">Приходи завтра за наградой!</p>
            )}
          </div>
        </div>

        {/* Reward reveal animation overlay */}
        <AnimatePresence>
          {rewardInfo && (
            <RewardReveal
              type={rewardInfo.type}
              label={rewardInfo.label}
              onDone={() => setRewardInfo(null)}
            />
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
