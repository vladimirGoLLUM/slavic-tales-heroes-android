import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const ITEMS = [
  { path: '/forge', label: 'Кузница', icon: '/ui/icon_forge.png', description: 'Улучшение снаряжения' },
  { path: '/inventory', label: 'Инвентарь', icon: '/ui/icon_inventory.png', description: 'Все предметы' },
  { path: '/ancient-tower', label: 'Башня Древних', icon: '/ui/icon_ancient_tower.png', description: 'Испытания башни' },
];

export default function AncientForgePage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-32 pt-4 px-4">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate('/')}
            className="text-muted-foreground hover:text-foreground text-xl min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            ←
          </button>
          <img src="/ui/icon_forge.png" alt="" className="w-8 h-8 object-contain" />
          <h1 className="font-kelly text-2xl text-foreground">Горн Древних</h1>
        </div>

        <div className="flex flex-col gap-3">
          {ITEMS.map((item, i) => (
            <motion.button
              key={item.path}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
              onClick={() => navigate(item.path)}
              className="w-full flex items-center gap-4 bg-surface/60 hover:bg-surface/80 border border-border/50 hover:border-primary/40 rounded-xl px-5 py-4 card-lubok transition-all min-h-[60px] group"
            >
              <img src={item.icon} alt={item.label} className="w-10 h-10 object-contain flex-shrink-0 group-hover:scale-110 transition-transform" />
              <div className="flex flex-col items-start">
                <span className="font-kelly text-base text-foreground">{item.label}</span>
                <span className="text-xs text-muted-foreground">{item.description}</span>
              </div>
              <span className="ml-auto text-muted-foreground/50 text-lg">›</span>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}
