import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '@/context/GameContext';
import { SHOP_PACKAGES, CHAMPIONS } from '@/data/gameData';
import { ALL_SETS, SET_ICONS, SET_BONUSES, ALL_SLOTS, generateArtifact, type ArtifactSet } from '@/data/artifacts';
import { VESSEL_TYPES } from '@/data/vessels';
import iconSouls from '@/assets/icons/icon_souls.png';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import HeroCard from '@/components/game/HeroCard';

const LOCKED_TABS: Tab[] = ['runes', 'heroes', 'gear'];
const SHOP_PASSWORD = '1990';

function formatBoosterTime(ms: number): string {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h >= 24) return `${Math.floor(h / 24)}д ${h % 24}ч`;
  return `${h}ч ${m}м`;
}

const MITHRIL_EXCHANGES = [
  { id: 'energy', label: '100 энергии', cost: 50, give: '+100 энергии', action: 'energy' },
  { id: 'gods_coins', label: '10 Монет Богов', cost: 50, give: '+10 Монет Богов', action: 'gods_coins' },
];

const GEMSTONE_HEROES = CHAMPIONS.filter(c => c.rarity === 'Самоцветный');

type Tab = 'runes' | 'exchange' | 'heroes' | 'gear' | 'vessels' | 'vip';

export default function ShopPage() {
  const navigate = useNavigate();
  const { player, addMithrilRunes, spendMithrilRunes, addSouls, addEnergy, addGodsCoins, buyGemstoneHero, addArtifacts, buyVessel, buyVesselWithMR, activateXpBooster, isXpBoosterActive, getXpBoosterTimeLeft, activateRuneBooster, isRuneBoosterActive, getRuneBoosterTimeLeft, activateSoulBooster, isSoulBoosterActive, getSoulBoosterTimeLeft, isVipActive, getVipTimeLeft, buyVip } = useGame();
  const [confirmPkg, setConfirmPkg] = useState<typeof SHOP_PACKAGES[0] | null>(null);
  const [purchaseResult, setPurchaseResult] = useState<{ name: string; amount: number } | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('vessels');
  const [confirmBuyHero, setConfirmBuyHero] = useState<typeof CHAMPIONS[0] | null>(null);
  const [boughtHero, setBoughtHero] = useState<typeof CHAMPIONS[0] | null>(null);
  const [confirmBuySet, setConfirmBuySet] = useState<ArtifactSet | null>(null);
  const [unlockedTabs, setUnlockedTabs] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [pendingTab, setPendingTab] = useState<Tab | null>(null);

  const handleTabClick = (tab: Tab) => {
    if (LOCKED_TABS.includes(tab) && !unlockedTabs) {
      setPendingTab(tab);
      setPasswordInput('');
      setShowPasswordDialog(true);
      return;
    }
    setActiveTab(tab);
  };

  const handlePasswordSubmit = () => {
    if (passwordInput === SHOP_PASSWORD) {
      setUnlockedTabs(true);
      setShowPasswordDialog(false);
      if (pendingTab) setActiveTab(pendingTab);
      setPendingTab(null);
      toast.success('Доступ разрешён!');
    } else {
      toast.error('Неверный пароль!');
    }
  };

  const handleBuyPackage = (pkg: typeof SHOP_PACKAGES[0]) => {
    setConfirmPkg(pkg);
  };

  const confirmPurchase = () => {
    if (!confirmPkg) return;
    const total = confirmPkg.mithrilRunes + confirmPkg.bonus;
    addMithrilRunes(total);
    setPurchaseResult({ name: confirmPkg.name, amount: total });
    setConfirmPkg(null);
    toast.success(`+${total} Мифриловых Рун!`);
  };

  const handleExchange = (exchange: typeof MITHRIL_EXCHANGES[0]) => {
    if (!spendMithrilRunes(exchange.cost)) {
      toast.error('Недостаточно Мифриловых Рун!');
      return;
    }
    switch (exchange.action) {
      case 'energy':
        addEnergy(100);
        toast.success('+100 Энергии!');
        break;
      case 'gods_coins':
        addGodsCoins(10);
        toast.success('+10 Монет Богов!');
        break;
    }
  };

  const handleBuyGemstone = (hero: typeof CHAMPIONS[0]) => {
    if (player.mithrilRunes < 1000) {
      toast.error('Недостаточно Мифриловых Рун! Нужно 1000 МР.');
      return;
    }
    setConfirmBuyHero(hero);
  };

  const confirmGemstoneHeroPurchase = () => {
    if (!confirmBuyHero) return;
    if (buyGemstoneHero(confirmBuyHero.id)) {
      setBoughtHero(confirmBuyHero);
      toast.success(`Получен Самоцветный герой: ${confirmBuyHero.name}!`);
    } else {
      toast.error('Не удалось купить героя');
    }
    setConfirmBuyHero(null);
  };

  const handleBuySet = (set: ArtifactSet) => {
    if (player.mithrilRunes < 1000) {
      toast.error('Недостаточно Мифриловых Рун! Нужно 1000 МР.');
      return;
    }
    setConfirmBuySet(set);
  };

  const confirmSetPurchase = () => {
    if (!confirmBuySet) return;
    if (!spendMithrilRunes(1000)) {
      toast.error('Недостаточно Мифриловых Рун!');
      setConfirmBuySet(null);
      return;
    }
    const artifacts = ALL_SLOTS.map(slot =>
      generateArtifact('Самоцветный', 0, 5, confirmBuySet, slot)
    );
    addArtifacts(artifacts);
    toast.success(`Набор «${confirmBuySet}» (9 предметов ★5) получен!`);
    setConfirmBuySet(null);
  };

  const TABS: { key: Tab; label: string }[] = [
    { key: 'vessels', label: 'Сосуды' },
    { key: 'vip', label: '👑 VIP' },
    { key: 'runes', label: 'Руны' },
    { key: 'exchange', label: 'Обмен' },
    { key: 'heroes', label: 'Герои' },
    { key: 'gear', label: 'Экипировка' },
  ];

  return (
    <div className="min-h-screen bg-background pb-32 pt-4 px-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <button
            onClick={() => navigate('/')}
            className="text-muted-foreground hover:text-foreground text-xl min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            ←
          </button>
          <h1 className="font-kelly text-2xl text-foreground">Торжище</h1>
          <div className="ml-auto flex items-center gap-1.5 bg-surface/60 rounded-lg px-3 py-1.5 card-lubok">
            <img src="/ui/icon_mithril.png" alt="МР" className="w-5 h-5" />
            <span className="font-mono text-sm text-foreground">{player.mithrilRunes}</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => handleTabClick(tab.key)}
              className={`flex-1 py-2.5 rounded-xl font-kelly text-sm transition-all relative ${
                activeTab === tab.key
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'bg-surface/60 text-muted-foreground hover:bg-surface/80 border border-border/50'
              }`}
            >
              {LOCKED_TABS.includes(tab.key) && !unlockedTabs && <span className="absolute -top-1 -right-1 text-xs">🔒</span>}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab: Vessels */}
        {activeTab === 'vessels' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <h2 className="font-kelly text-lg text-primary mb-1">Сосуды Души</h2>
            <p className="text-xs text-muted-foreground mb-2">
              Купи сосуд за Души, затем используй его на Алтаре Призыва
            </p>
            <div className="flex items-center gap-1.5 mb-4 bg-surface/50 rounded-lg px-3 py-1.5 w-fit">
              <img src={iconSouls} alt="" className="w-4 h-4" />
              <span className="font-mono text-sm text-foreground">{player.souls} Душ</span>
            </div>
            <div className="flex flex-col gap-3">
              {VESSEL_TYPES.map((vessel, i) => {
                const owned = player.vessels[vessel.id as keyof typeof player.vessels] ?? 0;
                return (
                  <motion.div
                    key={vessel.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="w-full flex items-center gap-3 bg-surface/70 backdrop-blur-sm border border-border/50 rounded-xl px-4 py-3 card-lubok"
                  >
                    <img src={vessel.icon} alt="" className="w-12 h-12 object-contain flex-shrink-0" />
                    <div className="flex flex-col items-start flex-1 min-w-0">
                      <span className={`font-kelly text-sm ${vessel.color}`}>{vessel.label}</span>
                      <span className="text-xs text-muted-foreground">{vessel.sublabel}</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {vessel.dropRates.map(dr => (
                          <span key={dr.rarity} className="text-[10px] text-muted-foreground">
                            {dr.rarity} {(dr.chance * 100).toFixed(1)}%
                          </span>
                        ))}
                      </div>
                      {vessel.excludeElements && (
                        <span className="text-[10px] text-destructive mt-0.5">Без: {vessel.excludeElements.join(', ')}</span>
                      )}
                      {/* Buy buttons - Souls */}
                      <div className="flex items-center gap-1.5 mt-2 mb-1">
                        <img src={iconSouls} alt="Души" className="w-4 h-4 flex-shrink-0" />
                        <span className="text-[10px] text-muted-foreground font-kelly">За Души</span>
                      </div>
                      <div className="flex gap-1.5 w-full">
                        {[1, 5, 10].map(n => (
                          <button
                            key={n}
                            onClick={() => {
                              if (buyVessel(vessel.id, n)) {
                                toast.success(`+${n} ${vessel.label}!`);
                              } else {
                                toast.error('Недостаточно Душ!');
                              }
                            }}
                            disabled={player.souls < vessel.cost * n}
                            className="flex-1 flex flex-col items-center bg-primary/20 hover:bg-primary/30 border border-primary/40 rounded-lg py-1.5 px-1 transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.97]"
                          >
                            <span className="font-kelly text-xs text-primary">×{n}</span>
                            <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                              <img src={iconSouls} alt="" className="w-3 h-3" />
                              {vessel.cost * n}
                            </span>
                          </button>
                        ))}
                      </div>
                      {/* Divider */}
                      <div className="flex items-center gap-2 my-1.5 w-full">
                        <div className="flex-1 h-px bg-border/60" />
                        <span className="text-[9px] text-muted-foreground/60">или</span>
                        <div className="flex-1 h-px bg-border/60" />
                      </div>
                      {/* Buy buttons - Mithril Runes */}
                      <div className="flex items-center gap-1.5 mb-1">
                        <img src="/ui/icon_mithril.png" alt="МР" className="w-4 h-4 flex-shrink-0" />
                        <span className="text-[10px] text-muted-foreground font-kelly">За МР</span>
                      </div>
                      {(() => {
                        const mrCosts: Record<string, number> = { 'Обиходный': 9, 'Заветный': 90, 'Сказанный': 98, 'Калиновый': 150, 'Самоцветный': 640 };
                        const mrCost = mrCosts[vessel.id] ?? 0;
                        return (
                          <div className="flex gap-1.5 w-full">
                            {[1, 5, 10].map(n => (
                              <button
                                key={n}
                                onClick={() => {
                                  if (buyVesselWithMR(vessel.id, n)) {
                                    toast.success(`+${n} ${vessel.label} за ${mrCost * n} МР!`);
                                  } else {
                                    toast.error('Недостаточно Мифриловых Рун!');
                                  }
                                }}
                                disabled={player.mithrilRunes < mrCost * n}
                                className="flex-1 flex flex-col items-center bg-accent/20 hover:bg-accent/30 border border-accent/40 rounded-lg py-1.5 px-1 transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.97]"
                              >
                                <span className="font-kelly text-xs text-accent-foreground">×{n}</span>
                                <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                                  <img src="/ui/icon_mithril.png" alt="" className="w-3 h-3" />
                                  {mrCost * n}
                                </span>
                              </button>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                    <div className="flex flex-col items-center gap-1 flex-shrink-0">
                      {owned > 0 && (
                        <span className="text-xs text-accent-foreground font-kelly">×{owned}</span>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}


        {activeTab === 'runes' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-3">
            <h2 className="font-kelly text-lg text-primary mb-1">Пакеты Мифриловых Рун</h2>
            {SHOP_PACKAGES.map((pkg, i) => (
              <motion.button
                key={pkg.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                onClick={() => handleBuyPackage(pkg)}
                className="w-full flex items-center gap-4 bg-surface/70 backdrop-blur-sm hover:bg-surface/90 border border-border/50 hover:border-primary/40 rounded-xl px-4 py-3.5 card-lubok transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <img src="/ui/icon_mithril.png" alt="" className="w-10 h-10 object-contain flex-shrink-0" />
                <div className="flex flex-col items-start flex-1 min-w-0">
                  <span className="font-kelly text-sm text-foreground">{pkg.name}</span>
                  <span className="text-xs text-muted-foreground">{pkg.description}</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-primary font-bold">{pkg.mithrilRunes} МР</span>
                    {pkg.bonus > 0 && (
                      <span className="text-xs text-accent-foreground bg-accent/20 px-1.5 py-0.5 rounded">+{pkg.bonus} бонус</span>
                    )}
                  </div>
                </div>
                <div className="flex-shrink-0 bg-primary/20 border border-primary/40 rounded-lg px-3 py-1.5">
                  <span className="font-kelly text-sm text-primary">{pkg.price}₽</span>
                </div>
              </motion.button>
            ))}
          </motion.div>
        )}

        {/* Tab: VIP */}
        {activeTab === 'vip' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <h2 className="font-kelly text-lg text-primary mb-1">👑 Карта VIP</h2>
            <p className="text-xs text-muted-foreground mb-4">
              Привилегии для настоящих героев
            </p>

            {/* VIP Status */}
            {isVipActive() && (
              <div className="mb-4 bg-primary/10 border border-primary/40 rounded-xl p-4 card-lubok">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-2xl">👑</span>
                  <span className="font-kelly text-lg text-primary">VIP Активна</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Осталось: <span className="text-primary font-bold">{formatBoosterTime(getVipTimeLeft())}</span>
                </p>
              </div>
            )}

            {/* VIP Bonuses description */}
            <div className="mb-4 bg-surface/70 border border-border/50 rounded-xl p-4 card-lubok">
              <h3 className="font-kelly text-sm text-foreground mb-2">Бонусы VIP:</h3>
              <div className="space-y-1.5 text-xs text-muted-foreground">
                <div className="flex items-center gap-2"><span className="text-primary">⚔️</span> +50% опыт героев во всех битвах</div>
                <div className="flex items-center gap-2"><span className="text-primary">💰</span> +50% получение душ во всех битвах</div>
                <div className="flex items-center gap-2"><span className="text-primary">🔮</span> +50% получение рун во всех битвах</div>
                <div className="flex items-center gap-2"><span className="text-primary">⚡</span> 100 мультибоёв в день (вместо 30)</div>
              </div>
            </div>

            {/* VIP Purchase options */}
            <div className="flex flex-col gap-3">
              {([
                { months: 1, label: '1 Месяц', price: '800₽', badge: '' },
                { months: 6, label: '6 Месяцев', price: '4 000₽', badge: 'Выгодно' },
                { months: 12, label: '1 Год', price: '7 000₽', badge: 'Лучшая цена' },
              ] as const).map((tier) => (
                <motion.button
                  key={tier.months}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => {
                    if (buyVip(tier.months)) {
                      toast.success(`VIP активирована на ${tier.label}! 👑`);
                    }
                  }}
                  className="relative flex items-center gap-3 bg-surface/70 border border-primary/30 rounded-xl px-4 py-3 card-lubok transition-all hover:border-primary/60"
                >
                  {tier.badge && (
                    <span className="absolute -top-2 right-3 bg-accent text-accent-foreground text-[10px] font-kelly px-2 py-0.5 rounded-full">
                      {tier.badge}
                    </span>
                  )}
                  <span className="text-2xl">👑</span>
                  <div className="flex-1 text-left">
                    <span className="font-kelly text-sm text-foreground">{tier.label}</span>
                    <span className="block text-[10px] text-muted-foreground">
                      {isVipActive() ? 'Продлить на ' : ''}{tier.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 bg-primary/20 border border-primary/40 rounded-lg px-3 py-1.5">
                    <span className="font-kelly text-sm text-primary">{tier.price}</span>
                  </div>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Tab: Exchange */}
        {activeTab === 'exchange' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <h2 className="font-kelly text-lg text-primary mb-3">Обмен Мифриловых Рун</h2>

            {/* XP Booster section */}
            <div className="mb-4 bg-surface/70 border border-border/50 rounded-xl p-4 card-lubok">
              <div className="flex items-center gap-2 mb-2">
                <img src="/ui/icon_booster_xp.png" alt="" className="w-6 h-6 object-contain" loading="lazy" />
                <span className="font-kelly text-sm text-foreground">Пламя Ратоборца</span>
              </div>
              <p className="text-xs text-muted-foreground mb-3">Удваивает опыт героев во всех битвах</p>
              {isXpBoosterActive() && (
                <div className="text-xs text-accent-foreground bg-accent/20 rounded-lg px-3 py-1.5 mb-3">
                  ✅ Активно — осталось {formatBoosterTime(getXpBoosterTimeLeft())}
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    if (!spendMithrilRunes(150)) { toast.error('Недостаточно МР!'); return; }
                    activateXpBooster(1);
                    toast.success('🔥 Пламя Ратоборца на 1 день!');
                  }}
                  disabled={player.mithrilRunes < 150}
                  className="flex flex-col items-center gap-1 bg-background/40 border border-border/50 hover:border-primary/40 rounded-xl p-3 transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]"
                >
                  <span className="font-kelly text-sm text-foreground">1 день</span>
                  <div className="flex items-center gap-1">
                    <img src="/ui/icon_mithril.png" alt="" className="w-4 h-4" />
                    <span className="text-xs font-bold text-primary">150</span>
                  </div>
                </button>
                <button
                  onClick={() => {
                    if (!spendMithrilRunes(300)) { toast.error('Недостаточно МР!'); return; }
                    activateXpBooster(3);
                    toast.success('🔥 Пламя Ратоборца на 3 дня!');
                  }}
                  disabled={player.mithrilRunes < 300}
                  className="flex flex-col items-center gap-1 bg-background/40 border border-border/50 hover:border-primary/40 rounded-xl p-3 transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]"
                >
                  <span className="font-kelly text-sm text-foreground">3 дня</span>
                  <div className="flex items-center gap-1">
                    <img src="/ui/icon_mithril.png" alt="" className="w-4 h-4" />
                    <span className="text-xs font-bold text-primary">300</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Rune Booster */}
            <div className="mb-4 bg-surface/70 border border-border/50 rounded-xl p-4 card-lubok">
              <div className="flex items-center gap-2 mb-2">
                <img src="/ui/icon_booster_runes.png" alt="" className="w-6 h-6 object-contain" loading="lazy" />
                <span className="font-kelly text-sm text-foreground">Рунный Прилив</span>
              </div>
              <p className="text-xs text-muted-foreground mb-3">Удваивает получение рун во всех битвах</p>
              {isRuneBoosterActive() && (
                <div className="text-xs text-accent-foreground bg-accent/20 rounded-lg px-3 py-1.5 mb-3">
                  ✅ Активно — осталось {formatBoosterTime(getRuneBoosterTimeLeft())}
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => { if (!spendMithrilRunes(150)) { toast.error('Недостаточно МР!'); return; } activateRuneBooster(1); toast.success('Рунный Прилив на 1 день!'); }} disabled={player.mithrilRunes < 150} className="flex flex-col items-center gap-1 bg-background/40 border border-border/50 hover:border-primary/40 rounded-xl p-3 transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]">
                  <span className="font-kelly text-sm text-foreground">1 день</span>
                  <div className="flex items-center gap-1"><img src="/ui/icon_mithril.png" alt="" className="w-4 h-4" /><span className="text-xs font-bold text-primary">150</span></div>
                </button>
                <button onClick={() => { if (!spendMithrilRunes(300)) { toast.error('Недостаточно МР!'); return; } activateRuneBooster(3); toast.success('Рунный Прилив на 3 дня!'); }} disabled={player.mithrilRunes < 300} className="flex flex-col items-center gap-1 bg-background/40 border border-border/50 hover:border-primary/40 rounded-xl p-3 transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]">
                  <span className="font-kelly text-sm text-foreground">3 дня</span>
                  <div className="flex items-center gap-1"><img src="/ui/icon_mithril.png" alt="" className="w-4 h-4" /><span className="text-xs font-bold text-primary">300</span></div>
                </button>
              </div>
            </div>

            {/* Soul Booster */}
            <div className="mb-4 bg-surface/70 border border-border/50 rounded-xl p-4 card-lubok">
              <div className="flex items-center gap-2 mb-2">
                <img src="/ui/icon_booster_souls.png" alt="" className="w-6 h-6 object-contain" loading="lazy" />
                <span className="font-kelly text-sm text-foreground">Зов Предков</span>
              </div>
              <p className="text-xs text-muted-foreground mb-3">Удваивает получение душ во всех битвах</p>
              {isSoulBoosterActive() && (
                <div className="text-xs text-accent-foreground bg-accent/20 rounded-lg px-3 py-1.5 mb-3">
                  ✅ Активно — осталось {formatBoosterTime(getSoulBoosterTimeLeft())}
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => { if (!spendMithrilRunes(150)) { toast.error('Недостаточно МР!'); return; } activateSoulBooster(1); toast.success('Зов Предков на 1 день!'); }} disabled={player.mithrilRunes < 150} className="flex flex-col items-center gap-1 bg-background/40 border border-border/50 hover:border-primary/40 rounded-xl p-3 transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]">
                  <span className="font-kelly text-sm text-foreground">1 день</span>
                  <div className="flex items-center gap-1"><img src="/ui/icon_mithril.png" alt="" className="w-4 h-4" /><span className="text-xs font-bold text-primary">150</span></div>
                </button>
                <button onClick={() => { if (!spendMithrilRunes(300)) { toast.error('Недостаточно МР!'); return; } activateSoulBooster(3); toast.success('Зов Предков на 3 дня!'); }} disabled={player.mithrilRunes < 300} className="flex flex-col items-center gap-1 bg-background/40 border border-border/50 hover:border-primary/40 rounded-xl p-3 transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]">
                  <span className="font-kelly text-sm text-foreground">3 дня</span>
                  <div className="flex items-center gap-1"><img src="/ui/icon_mithril.png" alt="" className="w-4 h-4" /><span className="text-xs font-bold text-primary">300</span></div>
                </button>
              </div>
            </div>

            {/* Bundle deals */}
            <div className="mb-4 bg-accent/5 border border-accent/30 rounded-xl p-4 card-lubok">
              <h3 className="font-kelly text-sm text-accent text-center mb-3">🔥 Набор «Все 3 бустера» — скидка!</h3>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    if (!spendMithrilRunes(350)) { toast.error('Недостаточно МР!'); return; }
                    activateXpBooster(1); activateRuneBooster(1); activateSoulBooster(1);
                    toast.success('Все 3 бустера активированы на 1 день!');
                  }}
                  disabled={player.mithrilRunes < 350}
                  className="flex flex-col items-center gap-1.5 bg-background/40 border border-accent/30 hover:border-accent/60 rounded-xl p-3 transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]"
                >
                  <div className="flex gap-1">
                    <img src="/ui/icon_booster_xp.png" alt="" className="w-5 h-5 object-contain" />
                    <img src="/ui/icon_booster_runes.png" alt="" className="w-5 h-5 object-contain" />
                    <img src="/ui/icon_booster_souls.png" alt="" className="w-5 h-5 object-contain" />
                  </div>
                  <span className="font-kelly text-sm text-foreground">×3 на 1 день</span>
                  <div className="flex items-center gap-1">
                    <img src="/ui/icon_mithril.png" alt="" className="w-4 h-4" />
                    <span className="text-xs font-bold text-accent">350</span>
                    <span className="text-[9px] text-muted-foreground line-through ml-0.5">450</span>
                  </div>
                </button>
                <button
                  onClick={() => {
                    if (!spendMithrilRunes(650)) { toast.error('Недостаточно МР!'); return; }
                    activateXpBooster(3); activateRuneBooster(3); activateSoulBooster(3);
                    toast.success('Все 3 бустера активированы на 3 дня!');
                  }}
                  disabled={player.mithrilRunes < 650}
                  className="flex flex-col items-center gap-1.5 bg-background/40 border border-accent/30 hover:border-accent/60 rounded-xl p-3 transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]"
                >
                  <div className="flex gap-1">
                    <img src="/ui/icon_booster_xp.png" alt="" className="w-5 h-5 object-contain" />
                    <img src="/ui/icon_booster_runes.png" alt="" className="w-5 h-5 object-contain" />
                    <img src="/ui/icon_booster_souls.png" alt="" className="w-5 h-5 object-contain" />
                  </div>
                  <span className="font-kelly text-sm text-foreground">×3 на 3 дня</span>
                  <div className="flex items-center gap-1">
                    <img src="/ui/icon_mithril.png" alt="" className="w-4 h-4" />
                    <span className="text-xs font-bold text-accent">650</span>
                    <span className="text-[9px] text-muted-foreground line-through ml-0.5">900</span>
                  </div>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {MITHRIL_EXCHANGES.map((ex, i) => (
                <motion.button
                  key={ex.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.06 }}
                  onClick={() => handleExchange(ex)}
                  disabled={player.mithrilRunes < ex.cost}
                  className="flex flex-col items-center gap-2 bg-surface/60 border border-border/50 hover:border-primary/40 rounded-xl p-4 card-lubok transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]"
                >
                  <span className="font-kelly text-sm text-foreground">{ex.label}</span>
                  <span className="text-xs text-muted-foreground">{ex.give}</span>
                  <div className="flex items-center gap-1 mt-1">
                    <img src="/ui/icon_mithril.png" alt="" className="w-4 h-4" />
                    <span className="text-xs font-bold text-primary">{ex.cost}</span>
                  </div>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Tab: Heroes */}
        {activeTab === 'heroes' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <h2 className="font-kelly text-lg text-primary mb-1">Покупка Самоцветного Героя</h2>
            <p className="text-xs text-muted-foreground mb-4">
              Выберите героя для покупки за 1000 Мифриловых Рун
            </p>

            <div className="grid grid-cols-2 gap-4">
              {GEMSTONE_HEROES.map((hero, i) => (
                <motion.div
                  key={hero.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => handleBuyGemstone(hero)}
                  className="flex flex-col items-center gap-1 cursor-pointer hover:scale-105 transition-transform"
                >
                  <HeroCard champion={hero} compact />
                  <div className="flex items-center gap-1">
                    <img src="/ui/icon_mithril.png" alt="" className="w-3.5 h-3.5" />
                    <span className="text-xs font-bold text-primary">1000</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Tab: Gear */}
        {activeTab === 'gear' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <h2 className="font-kelly text-lg text-primary mb-1">Наборы Экипировки</h2>
            <p className="text-xs text-muted-foreground mb-4">
              Полный набор из 9 Самоцветных артефактов ★5 за 1000 МР
            </p>
            <div className="flex flex-col gap-3">
              {ALL_SETS.map((set, i) => {
                const bonus = SET_BONUSES[set]?.[0];
                return (
                  <motion.button
                    key={set}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    onClick={() => handleBuySet(set)}
                    disabled={player.mithrilRunes < 1000}
                    className="w-full flex items-center gap-3 bg-surface/70 backdrop-blur-sm hover:bg-surface/90 border border-border/50 hover:border-primary/40 rounded-xl px-4 py-3 card-lubok transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.01] active:scale-[0.98]"
                  >
                    <img src={SET_ICONS[set]} alt="" className="w-10 h-10 object-contain flex-shrink-0" />
                    <div className="flex flex-col items-start flex-1 min-w-0">
                      <span className="font-kelly text-sm text-foreground">{set}</span>
                      {bonus && <span className="text-xs text-muted-foreground">{bonus.label}</span>}
                      <span className="text-xs text-accent-foreground mt-0.5">9 предметов • Самоцветный ★5</span>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0 bg-primary/20 border border-primary/40 rounded-lg px-3 py-1.5">
                      <img src="/ui/icon_mithril.png" alt="" className="w-4 h-4" />
                      <span className="font-kelly text-sm text-primary">1000</span>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}
      </div>

      {/* Confirm purchase dialog */}
      <Dialog open={!!confirmPkg} onOpenChange={() => setConfirmPkg(null)}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-kelly text-foreground">Тестовая покупка</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Это симуляция покупки. В реальной версии здесь будет платёжный шлюз.
            </DialogDescription>
          </DialogHeader>
          {confirmPkg && (
            <div className="flex flex-col items-center gap-4 py-4">
              <img src="/ui/icon_mithril.png" alt="" className="w-16 h-16" />
              <div className="text-center">
                <p className="font-kelly text-lg text-foreground">{confirmPkg.name}</p>
                <p className="text-primary font-bold text-xl mt-1">+{confirmPkg.mithrilRunes + confirmPkg.bonus} Мифриловых Рун</p>
                <p className="text-muted-foreground text-sm mt-1">Цена: {confirmPkg.price}₽</p>
              </div>
              <div className="flex gap-3 w-full">
                <Button variant="outline" className="flex-1" onClick={() => setConfirmPkg(null)}>Отмена</Button>
                <Button className="flex-1" onClick={confirmPurchase}>Купить</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirm set purchase */}
      <Dialog open={!!confirmBuySet} onOpenChange={() => setConfirmBuySet(null)}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-kelly text-foreground">Купить набор «{confirmBuySet}»?</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Вы получите 9 Самоцветных артефактов ★5 за 1000 МР.
            </DialogDescription>
          </DialogHeader>
          {confirmBuySet && (
            <div className="flex flex-col items-center gap-4 py-4">
              <img src={SET_ICONS[confirmBuySet]} alt="" className="w-16 h-16" />
              <p className="text-sm text-muted-foreground text-center">{SET_BONUSES[confirmBuySet]?.[0]?.label}</p>
              <div className="flex items-center gap-2">
                <img src="/ui/icon_mithril.png" alt="" className="w-6 h-6" />
                <span className="font-kelly text-xl text-primary">1000 МР</span>
              </div>
              <div className="flex gap-3 w-full">
                <Button variant="outline" className="flex-1" onClick={() => setConfirmBuySet(null)}>Отмена</Button>
                <Button className="flex-1" onClick={confirmSetPurchase}>Купить</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!confirmBuyHero} onOpenChange={() => setConfirmBuyHero(null)}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-kelly text-foreground">Купить героя?</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {confirmBuyHero?.name} будет добавлен в вашу коллекцию за 1000 МР.
            </DialogDescription>
          </DialogHeader>
          {confirmBuyHero && (
            <div className="flex flex-col items-center gap-4 py-4">
              <HeroCard champion={confirmBuyHero} />
              <div className="flex items-center gap-2">
                <img src="/ui/icon_mithril.png" alt="" className="w-6 h-6" />
                <span className="font-kelly text-xl text-primary">1000 МР</span>
              </div>
              <div className="flex gap-3 w-full">
                <Button variant="outline" className="flex-1" onClick={() => setConfirmBuyHero(null)}>Отмена</Button>
                <Button className="flex-1" onClick={confirmGemstoneHeroPurchase}>Купить</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Bought hero result */}
      <AnimatePresence>
        {boughtHero && (
          <Dialog open={!!boughtHero} onOpenChange={() => setBoughtHero(null)}>
            <DialogContent className="bg-card border-border max-w-sm">
              <DialogHeader>
                <DialogTitle className="font-kelly text-primary">Новый герой!</DialogTitle>
                <DialogDescription>Самоцветный герой присоединился к вашей коллекции</DialogDescription>
              </DialogHeader>
              <div className="flex flex-col items-center gap-4 py-4">
                <motion.div
                  initial={{ scale: 0, rotate: -20 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 200 }}
                >
                  <HeroCard champion={boughtHero} />
                </motion.div>
                <p className="font-kelly text-xl text-foreground">{boughtHero.name}</p>
                <Button onClick={() => setBoughtHero(null)} className="mt-2">Отлично!</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>

      {/* Purchase result */}
      <AnimatePresence>
        {purchaseResult && (
          <Dialog open={!!purchaseResult} onOpenChange={() => setPurchaseResult(null)}>
            <DialogContent className="bg-card border-border max-w-sm">
              <DialogHeader>
                <DialogTitle className="font-kelly text-primary">Покупка совершена!</DialogTitle>
                <DialogDescription>Мифриловые Руны зачислены на ваш счёт</DialogDescription>
              </DialogHeader>
              <div className="flex flex-col items-center gap-3 py-4">
                <motion.img
                  src="/ui/icon_mithril.png"
                  alt=""
                  className="w-20 h-20"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1, rotate: [0, 15, -15, 0] }}
                  transition={{ type: 'spring', stiffness: 200 }}
                />
                <p className="font-kelly text-2xl text-primary">+{purchaseResult.amount}</p>
                <p className="text-muted-foreground text-sm">{purchaseResult.name}</p>
                <Button onClick={() => setPurchaseResult(null)} className="mt-2">Отлично!</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>

      {/* Password dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-kelly text-foreground">🔒 Введите пароль</DialogTitle>
            <DialogDescription className="text-muted-foreground">Этот раздел защищён паролем</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-2">
            <input
              type="password"
              value={passwordInput}
              onChange={e => setPasswordInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handlePasswordSubmit()}
              placeholder="Пароль..."
              className="w-full bg-surface/60 border border-border rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground font-spectral focus:outline-none focus:ring-1 focus:ring-primary/50"
              autoFocus
            />
            <Button onClick={handlePasswordSubmit}>Войти</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
