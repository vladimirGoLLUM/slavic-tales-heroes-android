import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useGame } from '@/context/GameContext';
import { RELICS, getRelicById } from '@/data/relics';
import { ABYSS_MILESTONES } from '@/data/abyssData';
import { MILESTONE_ITEM_TO_RELIC } from '@/data/relics';

const RELIC_MILESTONE_FLOOR: Record<string, number> = {};
for (const m of ABYSS_MILESTONES) {
  if (m.rewards.bonusItem && MILESTONE_ITEM_TO_RELIC[m.rewards.bonusItem]) {
    RELIC_MILESTONE_FLOOR[MILESTONE_ITEM_TO_RELIC[m.rewards.bonusItem]] = m.floor;
  }
}

export default function RelicsPage() {
  const navigate = useNavigate();
  const { player } = useGame();
  const ownedRelics = player.relics ?? [];

  // Find which hero has each relic equipped
  const relicToHero: Record<string, string> = {};
  for (const pc of player.champions) {
    for (const rid of (pc.equippedRelics ?? [])) {
      relicToHero[rid] = pc.champion.name;
    }
  }

  return (
    <div className="min-h-screen bg-background pb-32 pt-4 px-4">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="text-muted-foreground hover:text-foreground text-xl min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            ←
          </button>
          <h1 className="font-kelly text-2xl text-foreground">🏺 Реликвии Бездны</h1>
        </div>

        <p className="text-sm text-muted-foreground mb-4 font-spectral">
          Реликвии — уникальные артефакты, полученные за покорение Бездны. Каждый герой может носить до 3 реликвий, дающих постоянные бонусы к характеристикам.
        </p>

        <div className="text-xs text-muted-foreground mb-6 bg-surface/40 rounded-lg p-2.5 border border-border/20">
          Собрано: <span className="text-primary font-mono font-bold">{ownedRelics.length}</span> / {RELICS.length}
        </div>

        <div className="space-y-3">
          {RELICS.map((relic, i) => {
            const owned = ownedRelics.includes(relic.id);
            const equippedOn = relicToHero[relic.id];
            const floor = RELIC_MILESTONE_FLOOR[relic.id];

            return (
              <motion.div
                key={relic.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className={`rounded-xl p-4 card-lubok border transition-all ${
                  owned
                    ? 'bg-purple-950/30 border-purple-500/30'
                    : 'bg-surface/30 border-border/20 opacity-50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`relative w-16 h-16 flex-shrink-0 rounded-lg flex items-center justify-center ${
                    owned ? 'bg-purple-900/30' : 'bg-muted/20 grayscale'
                  }`}>
                    {owned && (
                      <>
                        <div className="absolute inset-0 rounded-lg animate-pulse" style={{
                          boxShadow: '0 0 15px 4px hsl(270 60% 50% / 0.4), inset 0 0 10px 2px hsl(270 60% 50% / 0.2)',
                        }} />
                        <div className="absolute inset-0 rounded-lg" style={{
                          background: 'radial-gradient(circle at 50% 30%, hsl(270 80% 70% / 0.25), transparent 70%)',
                          animation: 'relicGlow 3s ease-in-out infinite alternate',
                        }} />
                        {/* Particles */}
                        {Array.from({ length: 6 }).map((_, pi) => (
                          <span
                            key={pi}
                            className="absolute rounded-full pointer-events-none"
                            style={{
                              width: 3 + (pi % 3),
                              height: 3 + (pi % 3),
                              background: `hsl(${260 + pi * 15} 80% ${65 + pi * 4}%)`,
                              boxShadow: `0 0 4px 1px hsl(${260 + pi * 15} 80% 60% / 0.7)`,
                              left: `${15 + (pi * 13) % 70}%`,
                              top: `${10 + (pi * 17) % 75}%`,
                              animation: `relicParticle${pi % 3} ${2.5 + pi * 0.4}s ease-in-out infinite`,
                              animationDelay: `${pi * 0.3}s`,
                              opacity: 0.8,
                            }}
                          />
                        ))}
                      </>
                    )}
                    <img src={relic.icon} alt={relic.name} className={`w-14 h-14 object-contain relative z-[1] ${owned ? 'drop-shadow-[0_0_6px_hsl(270_70%_60%/0.6)]' : ''}`} />
                    {!owned && (
                      <div className="absolute inset-0 flex items-center justify-center bg-background/50">
                        <span className="text-2xl">🔒</span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-kelly text-foreground text-sm">{relic.name}</h3>
                      {owned && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-kelly">Получено</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 font-spectral italic">{relic.description}</p>

                    {/* Bonuses */}
                    <div className="mt-2 space-y-0.5">
                      {relic.bonuses.filter((b, idx, arr) => {
                        // For "all stats" relics, show once
                        if (b.allStats) return idx === 0;
                        return true;
                      }).map((b, idx) => (
                        <div key={idx} className="text-xs font-mono text-primary">
                          {b.allStats
                            ? `+${b.percent}% ко всем статам`
                            : `+${b.percent}% ${STAT_LABEL[b.stat] ?? b.stat}`
                          }
                          {b.abyssOnly && <span className="text-purple-400 text-[10px] ml-1">(только в Бездне)</span>}
                        </div>
                      ))}
                    </div>

                    {/* Source */}
                    <div className="mt-2 text-[10px] text-muted-foreground">
                      📍 Источник: Бездна, этаж {floor ?? '?'} (награда за прохождение)
                    </div>

                    {/* Equipped status */}
                    {equippedOn && (
                      <div className="mt-1 text-[10px] text-accent">
                        ⚔️ Экипировано: {equippedOn}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const STAT_LABEL: Record<string, string> = {
  hp: 'ЗДР',
  atk: 'АТК',
  def: 'ЗЩТ',
  spd: 'СКР',
  critChance: 'Крит. шанс',
  critDmg: 'Крит. урон',
  resistance: 'Стойкость',
  accuracy: 'Меткость',
};
