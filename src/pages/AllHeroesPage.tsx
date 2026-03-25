import { useState, useMemo } from 'react';
import DragScroll from '@/components/ui/DragScroll';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { CHAMPIONS, ELEMENT_ICONS, FACTION_ICONS, type Element, type Rarity, type Skill } from '@/data/gameData';
import { EFFECT_ICONS, EFFECT_NAMES } from '@/types/game';
import EffectIcon from '@/components/game/EffectIcon';

const ELEMENTS: Element[] = ['Огонь', 'Вода', 'Лес', 'Камень', 'Тень', 'Свет'];
const RARITIES: Rarity[] = ['Обиходный', 'Заветный', 'Сказанный', 'Калиновый', 'Самоцветный'];
const FACTIONS = [...new Set(CHAMPIONS.map(c => c.faction))].sort();

const SKILL_TYPE_LABELS: Record<Skill['type'], string> = {
  damage: '⚔️ Урон', buff: '✨ Бафф', debuff: '💀 Дебафф', heal: '💚 Лечение',
  aoe: '🌊 АОЕ', control: '🔒 Контроль', special: '⭐ Особый', passive: '🔄 Пассив',
};

const SKILL_TYPE_COLORS: Record<Skill['type'], string> = {
  damage: 'text-red-400', buff: 'text-emerald-400', debuff: 'text-purple-400', heal: 'text-green-400',
  aoe: 'text-orange-400', control: 'text-cyan-400', special: 'text-yellow-400', passive: 'text-blue-400',
};

const RARITY_COLORS: Record<Rarity, string> = {
  'Обиходный': 'border-zinc-500/40', 'Заветный': 'border-green-500/40',
  'Сказанный': 'border-blue-500/40', 'Калиновый': 'border-purple-500/40', 'Самоцветный': 'border-amber-500/40',
};

const RARITY_TEXT: Record<Rarity, string> = {
  'Обиходный': 'text-zinc-400', 'Заветный': 'text-green-400',
  'Сказанный': 'text-blue-400', 'Калиновый': 'text-purple-400', 'Самоцветный': 'text-amber-400',
};

export default function AllHeroesPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [selectedElement, setSelectedElement] = useState<Element | null>(null);
  const [selectedRarity, setSelectedRarity] = useState<Rarity | null>(null);
  const [selectedFaction, setSelectedFaction] = useState<string | null>(null);
  const [expandedHero, setExpandedHero] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const hasFilters = !!search || !!selectedElement || !!selectedRarity || !!selectedFaction;

  const filtered = useMemo(() => {
    return CHAMPIONS.filter(c => {
      if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (selectedElement && c.element !== selectedElement) return false;
      if (selectedRarity && c.rarity !== selectedRarity) return false;
      if (selectedFaction && c.faction !== selectedFaction) return false;
      return true;
    });
  }, [search, selectedElement, selectedRarity, selectedFaction]);

  const clearFilters = () => {
    setSearch(''); setSelectedElement(null); setSelectedRarity(null); setSelectedFaction(null);
  };

  return (
    <div className="min-h-screen pb-28 relative">
      <div className="fixed inset-0 z-0 bg-background" />

      <div className="relative z-10 px-3 sm:px-4 pt-6 sm:pt-8 max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-1">
          <button
            onClick={() => navigate('/')}
            className="text-muted-foreground hover:text-foreground text-xl min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            ←
          </button>
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl sm:text-3xl font-kelly text-primary text-gold-glow"
          >
            📜 Все Герои
          </motion.h1>
        </div>
        <p className="text-center text-muted-foreground text-sm mb-4">
          {CHAMPIONS.length} героев в мире Былины
        </p>

        {/* Search */}
        <div className="mb-3">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Поиск по имени..."
            className="w-full bg-surface/60 backdrop-blur-sm border border-border rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground font-spectral focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
        </div>

        {/* Filters toggle on mobile */}
        <div className="mb-3">
          <button
            onClick={() => setFiltersOpen(!filtersOpen)}
            className="sm:hidden w-full flex items-center justify-between px-3 py-2 bg-surface/40 border border-border/30 rounded-lg text-sm font-kelly text-foreground"
          >
            <span>🔍 Фильтры {hasFilters ? `(${filtered.length})` : ''}</span>
            <span>{filtersOpen ? '▲' : '▼'}</span>
          </button>

          {/* Filters — always visible on sm+, toggle on mobile */}
          <div className={`space-y-2 mt-2 ${filtersOpen ? 'block' : 'hidden'} sm:block`}>
            <div className="flex flex-wrap gap-1.5">
              {ELEMENTS.map(el => (
                <button
                  key={el}
                  onClick={() => setSelectedElement(selectedElement === el ? null : el)}
                  className={`px-2 py-1 rounded-lg text-xs font-kelly transition-all border min-h-[36px] ${
                    selectedElement === el
                      ? 'bg-primary/20 border-primary/50 text-primary'
                      : 'bg-surface/40 border-border/30 text-muted-foreground hover:border-border'
                  }`}
                >
                  {ELEMENT_ICONS[el]} {el}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-1.5">
              {RARITIES.map(r => (
                <button
                  key={r}
                  onClick={() => setSelectedRarity(selectedRarity === r ? null : r)}
                  className={`px-2 py-1 rounded-lg text-xs font-kelly transition-all border min-h-[36px] ${
                    selectedRarity === r
                      ? 'bg-primary/20 border-primary/50 text-primary'
                      : 'bg-surface/40 border-border/30 text-muted-foreground hover:border-border'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>

            <DragScroll className="-mx-3 px-3 sm:mx-0 sm:px-0">
              <div className="flex sm:flex-wrap gap-1.5 sm:gap-2">
                {FACTIONS.map(f => (
                  <button
                    key={f}
                    onClick={() => setSelectedFaction(selectedFaction === f ? null : f)}
                    className={`px-2 py-1 rounded-lg text-xs font-kelly transition-all border whitespace-nowrap min-h-[36px] flex-shrink-0 flex items-center gap-1 ${
                      selectedFaction === f
                        ? 'bg-primary/20 border-primary/50 text-primary'
                        : 'bg-surface/40 border-border/30 text-muted-foreground hover:border-border'
                    }`}
                  >
                    {FACTION_ICONS[f] && <img src={FACTION_ICONS[f]} alt={f} className="w-4 h-4 object-contain" />}
                    {f}
                  </button>
                ))}
              </div>
            </DragScroll>

            {hasFilters && (
              <button onClick={clearFilters} className="text-xs text-accent font-kelly hover:text-accent/80 transition-colors min-h-[36px]">
                ✕ Сбросить фильтры
              </button>
            )}
          </div>
        </div>

        {hasFilters && <p className="text-xs text-muted-foreground mb-3">Найдено: {filtered.length}</p>}

        {/* Hero List */}
        <div className="space-y-2">
          <AnimatePresence mode="popLayout">
            {filtered.map((champion, i) => {
              const isExpanded = expandedHero === champion.id;
              return (
                <motion.div
                  key={champion.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ delay: Math.min(i * 0.02, 0.3) }}
                  className={`bg-surface/50 backdrop-blur-sm border ${RARITY_COLORS[champion.rarity]} rounded-xl overflow-hidden`}
                >
                  <button
                    onClick={() => setExpandedHero(isExpanded ? null : champion.id)}
                    className="w-full flex items-center gap-2 sm:gap-3 p-2 sm:p-3 text-left hover:bg-surface/70 transition-colors min-h-[56px]"
                  >
                    <img src={champion.imageUrl} alt={champion.name} className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg object-cover flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-kelly text-foreground text-sm sm:text-base">{champion.name}</span>
                        <span className="text-xs">{ELEMENT_ICONS[champion.element]}</span>
                        <span className={`text-[10px] sm:text-xs font-kelly ${RARITY_TEXT[champion.rarity]}`}>{champion.rarity}</span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {FACTION_ICONS[champion.faction] && <img src={FACTION_ICONS[champion.faction]} alt="" className="w-3.5 h-3.5 object-contain" />}
                        <span className="text-[10px] sm:text-xs text-muted-foreground">{champion.faction}</span>
                      </div>
                    </div>
                    <div className="text-muted-foreground text-sm flex-shrink-0">{isExpanded ? '▲' : '▼'}</div>
                  </button>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="px-2 sm:px-3 pb-3 space-y-2 border-t border-border/20 pt-2">
                          <p className="text-xs text-muted-foreground font-spectral italic mb-2">{champion.description}</p>
                          {champion.skills.map((skill, sIdx) => (
                            <div key={sIdx} className="bg-background/40 rounded-lg p-2 sm:p-3 border border-border/20">
                              <div className="flex items-center justify-between mb-1 flex-wrap gap-1">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-kelly text-xs sm:text-sm text-foreground">{skill.name}</span>
                                  <span className={`text-[10px] sm:text-xs font-kelly ${SKILL_TYPE_COLORS[skill.type]}`}>{SKILL_TYPE_LABELS[skill.type]}</span>
                                </div>
                                <div className="flex items-center gap-2 text-[10px] sm:text-xs text-muted-foreground">
                                  {skill.power > 0 && <span>⚔️ {(skill.power * 100).toFixed(0)}%</span>}
                                  <span>{skill.cooldown === 0 ? '♾️' : `⏱ ${skill.cooldown}`}</span>
                                </div>
                              </div>
                              <p className="text-[10px] sm:text-xs text-muted-foreground font-spectral mb-1">{skill.description}</p>
                              {skill.effects && skill.effects.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {skill.effects.map((eff, eIdx) => (
                                    <span key={eIdx} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-surface/60 border border-border/20 text-[10px]">
                                      <EffectIcon type={eff.type} size={12} />
                                      <span className="text-muted-foreground">{EFFECT_NAMES[eff.type] || eff.type}</span>
                                      {eff.value != null && <span className="text-foreground">{eff.value}%</span>}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                          <button
                            onClick={() => navigate(`/hero/champion-${champion.id}`)}
                            className="w-full mt-1 text-xs font-kelly text-primary hover:text-primary/80 transition-colors py-2 min-h-[44px]"
                          >
                            Подробнее →
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-base font-kelly">Герои не найдены</p>
          </div>
        )}
      </div>
    </div>
  );
}
