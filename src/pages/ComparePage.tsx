import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CHAMPIONS, ELEMENT_ICONS, getStatLabel, type Champion } from '@/data/gameData';

const STAT_KEYS = ['hp', 'atk', 'def', 'spd', 'critChance', 'critDmg', 'resistance', 'accuracy'] as const;

const STAT_MAX: Record<string, number> = {
  hp: 2500, atk: 300, def: 200, spd: 130,
  critChance: 50, critDmg: 150, resistance: 100, accuracy: 120,
};

function HeroSelector({ selected, onSelect, otherSelected }: {
  selected: Champion | null;
  onSelect: (c: Champion) => void;
  otherSelected: Champion | null;
}) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() =>
    CHAMPIONS.filter(c => {
      if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    }),
    [search]
  );

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 bg-surface/60 border border-border rounded-xl p-3 hover:bg-surface/80 transition-colors"
      >
        {selected ? (
          <>
            <img src={selected.imageUrl} alt={selected.name} className="w-10 h-10 rounded-lg object-cover" />
            <div className="text-left flex-1 min-w-0">
              <div className="font-kelly text-foreground truncate">{selected.name}</div>
              <div className="text-xs text-muted-foreground">{ELEMENT_ICONS[selected.element]} {selected.element} · {selected.faction}</div>
            </div>
          </>
        ) : (
          <span className="text-muted-foreground font-kelly flex-1 text-center">Выбрать героя</span>
        )}
        <span className="text-muted-foreground">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute z-20 top-full mt-1 left-0 right-0 bg-surface border border-border rounded-xl shadow-xl max-h-64 overflow-hidden flex flex-col"
        >
          <div className="p-2 border-b border-border/30">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Поиск..."
              autoFocus
              className="w-full bg-background/60 border border-border/30 rounded-lg px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
          </div>
          <div className="overflow-y-auto flex-1">
            {filtered.map(c => (
              <button
                key={c.id}
                onClick={() => { onSelect(c); setOpen(false); setSearch(''); }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-primary/10 transition-colors text-sm ${
                  otherSelected?.id === c.id ? 'opacity-40' : ''
                }`}
              >
                <img src={c.imageUrl} alt={c.name} className="w-8 h-8 rounded-md object-cover" />
                <span className="font-kelly text-foreground flex-1 truncate">{c.name}</span>
                <span className="text-xs text-muted-foreground">{ELEMENT_ICONS[c.element]}</span>
              </button>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}

function StatBar({ label, valueA, valueB, maxVal }: {
  label: string; valueA: number; valueB: number; maxVal: number;
}) {
  const pctA = Math.min(100, (valueA / maxVal) * 100);
  const pctB = Math.min(100, (valueB / maxVal) * 100);
  const aWins = valueA > valueB;
  const bWins = valueB > valueA;
  const tie = valueA === valueB;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs font-kelly text-muted-foreground">
        <span className={`font-mono text-sm ${aWins ? 'text-primary' : tie ? 'text-foreground' : 'text-muted-foreground'}`}>
          {valueA}
        </span>
        <span className="text-foreground">{label}</span>
        <span className={`font-mono text-sm ${bWins ? 'text-primary' : tie ? 'text-foreground' : 'text-muted-foreground'}`}>
          {valueB}
        </span>
      </div>
      <div className="flex gap-1 h-2">
        <div className="flex-1 bg-background/40 rounded-l-full overflow-hidden flex justify-end">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pctA}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className={`h-full rounded-l-full ${aWins ? 'bg-primary' : 'bg-muted-foreground/40'}`}
          />
        </div>
        <div className="flex-1 bg-background/40 rounded-r-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pctB}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className={`h-full rounded-r-full ${bWins ? 'bg-primary' : 'bg-muted-foreground/40'}`}
          />
        </div>
      </div>
    </div>
  );
}

export default function ComparePage() {
  const navigate = useNavigate();
  const [heroA, setHeroA] = useState<Champion | null>(null);
  const [heroB, setHeroB] = useState<Champion | null>(null);

  const totalA = heroA ? STAT_KEYS.reduce((s, k) => s + heroA.baseStats[k], 0) : 0;
  const totalB = heroB ? STAT_KEYS.reduce((s, k) => s + heroB.baseStats[k], 0) : 0;

  const winsA = heroA && heroB ? STAT_KEYS.filter(k => heroA.baseStats[k] > heroB.baseStats[k]).length : 0;
  const winsB = heroA && heroB ? STAT_KEYS.filter(k => heroB.baseStats[k] > heroA.baseStats[k]).length : 0;

  return (
    <div className="min-h-screen pb-28 relative">
      <div className="fixed inset-0 z-0 bg-background" />

      <div className="relative z-10 px-3 sm:px-4 pt-6 sm:pt-8 max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-1">
          <button onClick={() => navigate('/')} className="text-muted-foreground hover:text-foreground text-xl min-w-[44px] min-h-[44px] flex items-center justify-center">←</button>
          <motion.h1 initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-2xl sm:text-3xl font-kelly text-primary text-gold-glow">
            ⚖️ Сравнение
          </motion.h1>
        </div>
        <p className="text-center text-muted-foreground text-xs sm:text-sm mb-4 font-spectral">
          Выбери двух героев для сравнения
        </p>

        <div className="grid grid-cols-2 gap-2 sm:gap-4 mb-6">
          <HeroSelector selected={heroA} onSelect={setHeroA} otherSelected={heroB} />
          <HeroSelector selected={heroB} onSelect={setHeroB} otherSelected={heroA} />
        </div>

        {(heroA || heroB) && (
          <div className="grid grid-cols-2 gap-2 sm:gap-4 mb-4">
            {[heroA, heroB].map((hero, idx) => (
              <motion.div key={idx} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: hero ? 1 : 0.3, scale: 1 }} className="text-center">
                {hero ? (
                  <div className="space-y-1">
                    <img src={hero.imageUrl} alt={hero.name} className="w-16 h-16 sm:w-24 sm:h-24 rounded-xl object-cover mx-auto border-2 border-border/30" />
                    <div>
                      <div className="font-kelly text-foreground text-xs sm:text-base">{hero.name}</div>
                      <div className="text-[10px] sm:text-xs text-muted-foreground">{ELEMENT_ICONS[hero.element]} {hero.element} · {hero.rarity}</div>
                    </div>
                  </div>
                ) : (
                  <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-xl bg-surface/30 border border-dashed border-border/30 mx-auto flex items-center justify-center">
                    <span className="text-muted-foreground text-xl">?</span>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}

        {/* Stats comparison */}
        {heroA && heroB && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-surface/60 backdrop-blur-sm rounded-xl p-3 sm:p-5 card-lubok space-y-3"
          >
            {/* Score header */}
            <div className="flex items-center justify-between mb-2">
              <div className={`text-lg font-kelly ${winsA > winsB ? 'text-primary' : 'text-muted-foreground'}`}>
                {winsA} ✓
              </div>
              <div className="text-xs text-muted-foreground font-kelly">Преимущество по параметрам</div>
              <div className={`text-lg font-kelly ${winsB > winsA ? 'text-primary' : 'text-muted-foreground'}`}>
                ✓ {winsB}
              </div>
            </div>

            {/* Stat bars */}
            {STAT_KEYS.map(key => (
              <StatBar
                key={key}
                label={getStatLabel(key)}
                valueA={heroA.baseStats[key]}
                valueB={heroB.baseStats[key]}
                maxVal={STAT_MAX[key] || 100}
              />
            ))}

            {/* Total */}
            <div className="border-t border-border/30 pt-3">
              <div className="flex items-center justify-between">
                <span className={`font-mono text-lg font-kelly ${totalA > totalB ? 'text-primary' : 'text-foreground'}`}>
                  {totalA}
                </span>
                <span className="text-sm font-kelly text-muted-foreground">Сумма</span>
                <span className={`font-mono text-lg font-kelly ${totalB > totalA ? 'text-primary' : 'text-foreground'}`}>
                  {totalB}
                </span>
              </div>
            </div>

            {/* Skills comparison */}
            <div className="border-t border-border/30 pt-4">
              <h3 className="text-center font-kelly text-foreground mb-3">Навыки</h3>
              <div className="grid grid-cols-2 gap-4">
                {[heroA, heroB].map((hero, hIdx) => (
                  <div key={hIdx} className="space-y-2">
                    {hero.skills.map((skill, sIdx) => (
                      <div key={sIdx} className="bg-background/40 rounded-lg p-2 border border-border/20">
                        <div className="font-kelly text-xs text-foreground">{skill.name}</div>
                        <div className="text-[10px] text-muted-foreground font-spectral mt-0.5">{skill.description}</div>
                        <div className="flex gap-2 mt-1 text-[10px] text-muted-foreground font-mono">
                          {skill.power > 0 && <span>⚔️{(skill.power * 100).toFixed(0)}%</span>}
                          <span>{skill.cooldown === 0 ? '♾️' : `⏱${skill.cooldown}`}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {!heroA && !heroB && (
          <div className="text-center py-16">
            <p className="text-muted-foreground text-4xl mb-4">⚔️</p>
            <p className="text-muted-foreground font-kelly">Выберите героев для сравнения</p>
          </div>
        )}
      </div>
    </div>
  );
}
