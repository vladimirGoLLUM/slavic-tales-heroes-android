import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '@/context/GameContext';
import { SHOP_PACKAGES, CHAMPIONS } from '@/data/gameData';
import { ALL_SETS, SET_ICONS, SET_BONUSES, ALL_SLOTS, generateArtifact, type ArtifactSet } from '@/data/artifacts';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import HeroCard from '@/components/game/HeroCard';

const MITHRIL_EXCHANGES = [
  { id: 'summon1', label: '1 призыв', cost: 30, give: '1 призыв героя', action: 'summon1' },
  { id: 'summon10', label: '10 призывов', cost: 280, give: '10 призывов героев', action: 'summon10' },
  { id: 'energy', label: '100 энергии', cost: 50, give: '+100 энергии', action: 'energy' },
  { id: 'gods_coins', label: '10 Монет Богов', cost: 50, give: '+10 Монет Богов', action: 'gods_coins' },
];

const GEMSTONE_HEROES = CHAMPIONS.filter(c => c.rarity === 'Самоцветный');

type Tab = 'runes' | 'exchange' | 'heroes' | 'gear';

export default function ShopPage() {
  const navigate = useNavigate();
  const { player, addMithrilRunes, spendMithrilRunes, addSouls, addEnergy, addGodsCoins, buyGemstoneHero, addArtifacts } = useGame();
  const [confirmPkg, setConfirmPkg] = useState<typeof SHOP_PACKAGES[0] | null>(null);
  const [purchaseResult, setPurchaseResult] = useState<{ name: string; amount: number } | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('runes');
  const [confirmBuyHero, setConfirmBuyHero] = useState<typeof CHAMPIONS[0] | null>(null);
  const [boughtHero, setBoughtHero] = useState<typeof CHAMPIONS[0] | null>(null);
  const [confirmBuySet, setConfirmBuySet] = useState<ArtifactSet | null>(null);

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
      case 'summon1':
        addSouls(100);
        toast.success('+100 Душ для призыва!');
        break;
      case 'summon10':
        addSouls(900);
        toast.success('+900 Душ для 10 призывов!');
        break;
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
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-2.5 rounded-xl font-kelly text-sm transition-all ${
                activeTab === tab.key
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'bg-surface/60 text-muted-foreground hover:bg-surface/80 border border-border/50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab: Runes */}
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

        {/* Tab: Exchange */}
        {activeTab === 'exchange' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <h2 className="font-kelly text-lg text-primary mb-3">Обмен Мифриловых Рун</h2>
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
    </div>
  );
}
