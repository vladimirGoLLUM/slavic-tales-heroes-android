import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface WelcomeModalProps {
  open: boolean;
  onClose: () => void;
}

export default function WelcomeModal({ open, onClose }: WelcomeModalProps) {
  const [step, setStep] = useState(0);

  const steps = [
    {
      icon: '🌟',
      title: 'Добро пожаловать, Богатырь!',
      text: 'Тебя ждёт путь великого воина. Древние боги даровали тебе начальное снаряжение — используй его с умом!',
    },
    {
      icon: '🏺',
      title: 'Твой стартовый набор',
      items: [
        { icon: '/ui/vessel_mythic.png', label: 'Оранжевый сосуд', qty: '×1', color: 'text-rarity-mythic' },
        { icon: '/ui/vessel_legendary.png', label: 'Фиолетовый сосуд', qty: '×1', color: 'text-rarity-legendary' },
        { icon: '/ui/vessel_epic.png', label: 'Синий сосуд', qty: '×1', color: 'text-rarity-epic' },
        { icon: '/ui/vessel_rare.png', label: 'Зелёный сосуд', qty: '×1', color: 'text-rarity-rare' },
        { icon: '/ui/icon_runes.png', label: 'Руны', qty: '15 000', color: 'text-foreground' },
      ],
      text: 'Открой сосуды в Алтаре Призыва, чтобы получить своих первых героев!',
    },
    {
      icon: '⚔️',
      title: 'Что делать дальше?',
      steps: [
        { num: '1', text: 'Открой сосуды в Алтаре Призыва', icon: '/ui/icon_vessel_summon.png' },
        { num: '2', text: 'Собери отряд из призванных героев', icon: '/ui/icon_squad_shield.png' },
        { num: '3', text: 'Пройди первый бой Кампании', icon: '/ui/icon_campaign_map.png' },
        { num: '4', text: 'Зайди в Отряд → нажми на героя → экипируй Меч', icon: '/ui/icon_sword_equip.png' },
        { num: '5', text: 'Одень Шлем и прокачай Меч до +5', icon: '/ui/icon_anvil_upgrade.png' },
      ],
      text: 'Следуй подсвеченным кнопкам и стрелкам на главном экране!',
    },
  ];

  const current = steps[step];
  const isLast = step === steps.length - 1;

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center px-4"
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

        {/* Modal */}
        <motion.div
          initial={{ scale: 0.85, opacity: 0, y: 30 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.85, opacity: 0 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className="relative w-full max-w-sm bg-surface border-2 border-primary/50 rounded-2xl overflow-hidden shadow-[0_0_40px_hsl(var(--primary)/0.3)]"
        >
          {/* Decorative top glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1 bg-gradient-to-r from-transparent via-primary to-transparent" />

          <div className="p-6 pt-8">
            {/* Icon */}
            <motion.div
              key={step}
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', damping: 12 }}
              className="text-5xl text-center mb-4"
            >
              {current.icon}
            </motion.div>

            {/* Title */}
            <motion.h2
              key={`t-${step}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xl font-kelly text-primary text-center mb-3 text-gold-glow"
            >
              {current.title}
            </motion.h2>

            {/* Content depending on step */}
            <motion.div
              key={`c-${step}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              {'items' in current && current.items && (
                <div className="space-y-2 mb-4">
                  {current.items.map((item, i) => (
                    <div key={i} className="flex items-center gap-3 bg-background/40 rounded-lg px-3 py-2 border border-border/30">
                      <img src={item.icon} alt="" className="w-8 h-8 object-contain" />
                      <span className={`font-kelly text-sm flex-1 ${item.color}`}>{item.label}</span>
                      <span className="font-mono text-sm text-primary">{item.qty}</span>
                    </div>
                  ))}
                </div>
              )}

              {'steps' in current && current.steps && (
                <div className="space-y-3 mb-4">
                  {current.steps.map((s, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="w-7 h-7 flex items-center justify-center rounded-full bg-primary/20 border border-primary/40 font-kelly text-primary text-sm flex-shrink-0">
                        {s.num}
                      </span>
                      <span className="text-sm text-foreground">{s.text}</span>
                      <img src={s.icon} alt="" className="ml-auto w-7 h-7 object-contain" loading="lazy" />
                    </div>
                  ))}
                </div>
              )}

              <p className="text-sm text-muted-foreground text-center">{current.text}</p>
            </motion.div>
          </div>

          {/* Footer */}
          <div className="px-6 pb-6 flex gap-3">
            {step > 0 && (
              <button
                onClick={() => setStep(s => s - 1)}
                className="flex-1 py-3 rounded-xl font-kelly text-sm bg-secondary hover:bg-secondary/80 text-secondary-foreground transition-all min-h-[48px]"
              >
                ← Назад
              </button>
            )}
            <button
              onClick={() => isLast ? onClose() : setStep(s => s + 1)}
              className="flex-1 py-3 rounded-xl font-kelly text-sm bg-primary hover:bg-primary/90 text-primary-foreground transition-all min-h-[48px] shadow-[0_0_15px_hsl(var(--primary)/0.3)]"
            >
              {isLast ? '🔥 В бой!' : 'Далее →'}
            </button>
          </div>

          {/* Dots */}
          <div className="flex justify-center gap-2 pb-4">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-all ${i === step ? 'bg-primary w-5' : 'bg-muted-foreground/30'}`}
              />
            ))}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
