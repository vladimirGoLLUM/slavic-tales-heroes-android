import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ALL_HYDRA_HEADS, ACTIVE_HEADS_COUNT, type HydraHeadsState, imgNeckStump } from '@/data/hydraHeads';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface HydraHeadsPanelProps {
  headsState: HydraHeadsState;
}

export default function HydraHeadsPanel({ headsState }: HydraHeadsPanelProps) {
  // Only render up to ACTIVE_HEADS_COUNT heads
  const visibleHeads = headsState.heads.length > 0 ? headsState.heads.slice(0, ACTIVE_HEADS_COUNT) : [];

  const aliveCount = visibleHeads.filter(h => h.isAlive).length;
  const deadHeads = visibleHeads.filter(h => !h.isAlive && h.regrowthTimer >= 0);

  // Track recently regrown heads for the green flash + growth animation
  const prevHeadsRef = useRef<typeof visibleHeads>(visibleHeads);
  const [regrownSlots, setRegrownSlots] = useState<Set<number>>(new Set());

  useEffect(() => {
    const prev = prevHeadsRef.current;
    const newRegrown = new Set<number>();

    visibleHeads.forEach((head, idx) => {
      const prevHead = prev[idx];
      // Was dead (or different head) and now alive with full HP = just regrown
      if (prevHead && !prevHead.isAlive && head.isAlive && head.currentHp === head.maxHp) {
        newRegrown.add(idx);
      }
      // Head ID changed while alive = regrown as different head
      if (prevHead && prevHead.headId !== head.headId && head.isAlive) {
        newRegrown.add(idx);
      }
    });

    if (newRegrown.size > 0) {
      setRegrownSlots(newRegrown);
      const timer = setTimeout(() => setRegrownSlots(new Set()), 2000);
      return () => clearTimeout(timer);
    }

    prevHeadsRef.current = visibleHeads;
  }, [visibleHeads]);

  // Update ref after regrown detection
  useEffect(() => {
    prevHeadsRef.current = visibleHeads;
  });

  if (visibleHeads.length === 0) return null;

  return (
    <div className="max-w-2xl mx-auto mb-2">
      {/* Header: slot counter + regrowth timers */}
      <div className="flex items-center justify-between mb-1 px-1">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-kelly text-muted-foreground">🐉 Головы:</span>
          <span className={`text-[11px] font-kelly font-bold ${aliveCount === ACTIVE_HEADS_COUNT ? 'text-primary' : 'text-accent'}`}>
            {aliveCount}/{ACTIVE_HEADS_COUNT}
          </span>
        </div>
        {deadHeads.length > 0 && (
          <div className="flex items-center gap-2">
            {deadHeads.map((h, i) => {
              const headDef = ALL_HYDRA_HEADS.find(d => d.id === h.headId);
              return (
                <motion.div
                  key={`regrowth-${h.headId}-${i}`}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-0.5 bg-accent/10 border border-accent/20 rounded-md px-1.5 py-0.5"
                >
                  <span className="text-[9px]">{headDef?.icon ?? '🔄'}</span>
                  <span className="text-[9px] font-mono text-accent">⏱{h.regrowthTimer}</span>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
      <div className="flex gap-1.5 sm:gap-2 [&>*]:flex-1 [&>*]:min-w-[70px]">
        {visibleHeads.map((headState, idx) => {
          const headDef = ALL_HYDRA_HEADS.find(h => h.id === headState.headId);
          if (!headDef) return null;

          const hpPct = headState.isAlive
            ? Math.round((headState.currentHp / Math.max(1, headState.maxHp)) * 100)
            : 0;

          const abilityReady = headState.isAlive && headState.abilityCooldown <= 0;

          return (
            <Popover key={`${headState.headId}-${idx}`}>
              <PopoverTrigger asChild>
                <motion.div
                  layout
                  className={`relative rounded-xl border overflow-hidden cursor-help transition-all ${
                    headState.isAlive
                      ? 'bg-background/60 border-border/50'
                      : 'bg-muted/10 border-muted/20'
                  }`}
                  initial={regrownSlots.has(idx) ? { scale: 0.3, opacity: 0 } : false}
                  animate={headState.isAlive
                    ? regrownSlots.has(idx)
                      ? { opacity: 1, scale: [0.3, 1.15, 1], transition: { duration: 0.8, ease: 'easeOut' } }
                      : { opacity: 1 }
                    : { opacity: 0.5 }
                  }
                >
                  {/* Regrowth green flash */}
                  <AnimatePresence>
                    {regrownSlots.has(idx) && (
                      <motion.div
                        className="absolute inset-0 z-20 pointer-events-none rounded-xl"
                        initial={{ opacity: 1 }}
                        animate={{ opacity: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 1.8, ease: 'easeOut' }}
                        style={{
                          background: 'radial-gradient(circle at center, hsl(140 80% 55% / 0.8) 0%, hsl(140 80% 45% / 0.4) 40%, transparent 75%)',
                          boxShadow: '0 0 30px 10px hsl(140 80% 50% / 0.5), inset 0 0 20px hsl(140 80% 60% / 0.3)',
                        }}
                      />
                    )}
                  </AnimatePresence>

                  {/* Regrowth particle sparks */}
                  <AnimatePresence>
                    {regrownSlots.has(idx) && (
                      <>
                        {[...Array(6)].map((_, pi) => (
                          <motion.div
                            key={`spark-${idx}-${pi}`}
                            className="absolute z-30 pointer-events-none rounded-full"
                            style={{
                              width: 4 + Math.random() * 4,
                              height: 4 + Math.random() * 4,
                              background: `hsl(${120 + Math.random() * 40} 80% ${55 + Math.random() * 20}%)`,
                              left: `${30 + Math.random() * 40}%`,
                              top: `${30 + Math.random() * 40}%`,
                            }}
                            initial={{ opacity: 1, scale: 0 }}
                            animate={{
                              opacity: [1, 1, 0],
                              scale: [0, 1.5, 0.5],
                              x: (Math.random() - 0.5) * 60,
                              y: (Math.random() - 0.5) * 60 - 20,
                            }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.8 + Math.random() * 0.6, delay: Math.random() * 0.3 }}
                          />
                        ))}
                      </>
                    )}
                  </AnimatePresence>

                  {/* Head image */}
                  <div className="relative aspect-square overflow-hidden">
                    <img
                      src={headState.isAlive ? headDef.imageUrl : imgNeckStump}
                      alt={headState.isAlive ? headDef.name : 'Уязвимая шея'}
                      className={`w-full h-full object-contain ${
                        headState.isAlive ? '' : 'grayscale opacity-60'
                      }`}
                    />

                    {/* Color glow overlay for alive heads */}
                    {headState.isAlive && (
                      <motion.div
                        className="absolute inset-0 pointer-events-none"
                        animate={{ opacity: [0.1, 0.25, 0.1] }}
                        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                        style={{
                          background: `radial-gradient(circle at center, ${
                            headDef.id === 'life_barrier' ? 'hsl(210 90% 55% / 0.3)' :
                            headDef.id === 'poison_cloud' ? 'hsl(130 70% 40% / 0.3)' :
                            headDef.id === 'vengeance' ? 'hsl(0 80% 50% / 0.3)' :
                            headDef.id === 'pain_link' ? 'hsl(280 80% 55% / 0.3)' :
                            headDef.id === 'devouring' ? 'hsl(40 90% 50% / 0.3)' :
                            'hsl(195 90% 55% / 0.3)'
                          } 30%, transparent 70%)`,
                        }}
                      />
                    )}

                    {/* Ability ready indicator flash */}
                    {abilityReady && (
                      <motion.div
                        className="absolute inset-0 pointer-events-none"
                        animate={{ opacity: [0, 0.4, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                        style={{
                          border: '2px solid hsl(var(--accent))',
                          borderRadius: 'inherit',
                          boxShadow: '0 0 12px hsl(var(--accent) / 0.5)',
                        }}
                      />
                    )}

                    {/* Decapitation flash */}
                    <AnimatePresence>
                      {!headState.isAlive && headState.regrowthTimer === 2 && (
                        <motion.div
                          className="absolute inset-0 z-10 pointer-events-none"
                          initial={{ opacity: 0.9 }}
                          animate={{ opacity: 0 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 1.5 }}
                          style={{
                            background: 'radial-gradient(circle, hsl(var(--destructive) / 0.7) 0%, transparent 70%)',
                          }}
                        />
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Bottom info bar */}
                  <div className="p-1 sm:p-1.5">
                    <div className={`text-[8px] sm:text-[9px] font-kelly leading-tight text-center truncate ${
                      headState.isAlive ? headDef.color : 'text-muted-foreground'
                    }`}>
                      {headState.isAlive ? headDef.name : 'Шея'}
                    </div>

                    {/* HP bar or regrowth timer */}
                    {headState.isAlive ? (
                      <>
                        <div className="w-full h-1 sm:h-1.5 bg-muted/30 rounded-full mt-0.5 overflow-hidden">
                          <motion.div
                            className="h-full rounded-full"
                            style={{
                              background: `linear-gradient(90deg, hsl(var(--accent)), hsl(var(--destructive)))`,
                            }}
                            animate={{ width: `${hpPct}%` }}
                            transition={{ duration: 0.4 }}
                          />
                        </div>
                        <div className="flex items-center justify-between mt-0.5">
                          <span className="text-[7px] font-mono text-muted-foreground">{hpPct}%</span>
                          <span className={`text-[7px] font-kelly ${abilityReady ? 'text-accent' : 'text-muted-foreground/50'}`}>
                            {abilityReady ? '⚡' : `⏱${headState.abilityCooldown}`}
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center justify-center gap-0.5 mt-0.5">
                        <span className="text-[8px] text-accent font-mono">⏱ {headState.regrowthTimer} хода</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              </PopoverTrigger>
              <PopoverContent side="bottom" className="w-56 p-2 text-xs">
                <div className="flex items-center gap-2 mb-1.5">
                  <img src={headDef.imageUrl} alt={headDef.name} className="w-8 h-8 object-contain" />
                  <div>
                    <div className={`font-kelly ${headDef.color}`}>{headDef.name}</div>
                    <div className="text-[9px] text-muted-foreground">ЗДР: {hpPct}%</div>
                  </div>
                </div>
                <div className="text-muted-foreground mb-1.5">
                  <span className="font-kelly text-primary text-[10px]">Пассивка:</span> {headDef.buffDescription}
                </div>
                <div className="text-muted-foreground border-t border-border/30 pt-1">
                  <span className="font-kelly text-accent text-[10px]">⚡ {headDef.activeAbility.name}:</span>{' '}
                  {headDef.activeAbility.description}
                  <span className="text-[9px] text-muted-foreground/60 ml-1">(кд: {headDef.activeAbility.cooldown})</span>
                </div>
              </PopoverContent>
            </Popover>
          );
        })}
      </div>
    </div>
  );
}
