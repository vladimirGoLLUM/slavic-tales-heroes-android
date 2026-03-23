import { motion } from 'framer-motion';
import { useGame } from '@/context/GameContext';
import { type PlayerChampion } from '@/data/gameData';
import { MAX_STARS, MAX_RED_STARS, getAscensionCost, ELEMENT_RUNE_KEY, ELEMENT_RUNE_NAMES, RED_STAR_BONUSES } from '@/data/upgradeData';
import StarDisplay from '@/components/game/StarDisplay';
import { toast } from 'sonner';

const RUNE_ICONS: Record<string, string> = {
  'Огонь': '/ui/rune_fire.png',
  'Вода': '/ui/rune_water.png',
  'Лес': '/ui/rune_forest.png',
  'Камень': '/ui/rune_stone.png',
  'Тень': '/ui/rune_shadow.png',
  'Свет': '/ui/rune_light.png',
  'Божественность': '/ui/rune_divine.png',
};

interface AscensionSectionProps {
  pc: PlayerChampion;
}

export default function AscensionSection({ pc }: AscensionSectionProps) {
  const { player, ascendHero } = useGame();
  const stars = pc.stars ?? 0;
  const redStars = pc.redStars ?? 0;
  const maxRedStarsAllowed = Math.min(stars, MAX_RED_STARS);

  if (stars < 1) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="bg-surface/60 rounded-xl p-4 card-lubok border border-border/30"
      >
        <h3 className="font-kelly text-foreground mb-2">🔥 Вознесение</h3>
        <p className="text-xs text-muted-foreground">
          Доступно после получения хотя бы 1★. Прокачайте героя, чтобы открыть красные звёзды.
        </p>
        <div className="mt-3 text-center py-6 bg-background/30 rounded-lg border border-dashed border-border/40">
          <span className="text-3xl">🔒</span>
          <p className="text-sm text-muted-foreground mt-2 font-kelly">Нужно хотя бы 1★</p>
        </div>
      </motion.div>
    );
  }

  const cost = getAscensionCost(redStars);
  const elementKey = ELEMENT_RUNE_KEY[pc.champion.element] ?? '';
  const elementRuneName = ELEMENT_RUNE_NAMES[pc.champion.element] ?? 'Руна';
  const elementRuneIcon = RUNE_ICONS[elementKey] ?? '';
  const divineRuneIcon = RUNE_ICONS['Божественность'];

  const currentElementRunes = player.divineRunes[elementKey as keyof typeof player.divineRunes] ?? 0;
  const currentDivineRunes = player.divineRunes['Божественность' as keyof typeof player.divineRunes] ?? 0;

  const canAscend = cost && currentElementRunes >= cost.elementRunes && currentDivineRunes >= cost.divineRunes;

  const handleAscend = () => {
    if (ascendHero(pc.id)) {
      toast.success(`🔥 Вознесение до ${redStars + 1}★!`, {
        description: RED_STAR_BONUSES[redStars + 1],
      });
    } else {
      toast.error('Недостаточно рун для вознесения!');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="bg-surface/60 rounded-xl p-4 card-lubok border border-red-500/30"
    >
      <div className="flex items-center gap-2 mb-3">
        <h3 className="font-kelly text-foreground">🔥 Вознесение</h3>
        {redStars > 0 && (
          <StarDisplay stars={MAX_STARS} redStars={redStars} size="sm" />
        )}
      </div>

      {/* Current bonuses */}
      {redStars > 0 && (
        <div className="space-y-1 mb-3">
          {Array.from({ length: redStars }).map((_, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              <span style={{ color: '#ef4444' }}>★{i + 1}</span>
              <span className="text-muted-foreground">{RED_STAR_BONUSES[i + 1]}</span>
            </div>
          ))}
        </div>
      )}

      {redStars >= maxRedStarsAllowed ? (
        <div className="text-center py-4">
          <div className="text-2xl mb-1">🔥</div>
          <p className="font-kelly text-sm" style={{ color: '#ef4444' }}>
            {redStars >= MAX_RED_STARS ? 'Максимальное Вознесение!' : `Максимум для ${stars}★ — прокачайте звёзды!`}
          </p>
          <StarDisplay stars={stars} redStars={redStars} size="lg" className="justify-center mt-2" />
        </div>
      ) : cost ? (
        <div className="bg-background/40 rounded-lg p-3">
          {/* Next star bonus preview */}
          <div className="mb-3 p-2 rounded-lg bg-red-500/10 border border-red-500/20">
            <div className="text-xs font-kelly" style={{ color: '#ef4444' }}>
              ★{redStars + 1} — {RED_STAR_BONUSES[redStars + 1]}
            </div>
          </div>

          {/* Cost display */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="flex items-center gap-2 bg-background/50 rounded-lg p-2">
              <img src={elementRuneIcon} alt={elementRuneName} className="w-6 h-6" />
              <div className="text-xs">
                <div className="font-kelly text-foreground truncate">{elementRuneName}</div>
                <div className="font-mono">
                  <span className={currentElementRunes >= cost.elementRunes ? 'text-primary' : 'text-accent'}>
                    {currentElementRunes}
                  </span>
                  <span className="text-muted-foreground">/{cost.elementRunes}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-background/50 rounded-lg p-2">
              <img src={divineRuneIcon} alt="Руна Божественности" className="w-6 h-6" />
              <div className="text-xs">
                <div className="font-kelly text-foreground truncate">Руна Божеств.</div>
                <div className="font-mono">
                  <span className={currentDivineRunes >= cost.divineRunes ? 'text-primary' : 'text-accent'}>
                    {currentDivineRunes}
                  </span>
                  <span className="text-muted-foreground">/{cost.divineRunes}</span>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={handleAscend}
            disabled={!canAscend}
            className="w-full py-2 rounded-lg font-kelly text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              backgroundColor: canAscend ? '#ef4444' : undefined,
              color: canAscend ? 'white' : undefined,
            }}
          >
            {canAscend
              ? `🔥 Вознести до ${redStars + 1}★`
              : `Недостаточно рун`
            }
          </button>
        </div>
      ) : null}
    </motion.div>
  );
}
