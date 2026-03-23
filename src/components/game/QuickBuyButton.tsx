import { useCallback } from 'react';
import { useGame } from '@/context/GameContext';
import { toast } from 'sonner';

interface QuickBuyButtonProps {
  type: 'energy' | 'coins';
  size?: 'sm' | 'md';
}

export default function QuickBuyButton({ type, size = 'sm' }: QuickBuyButtonProps) {
  const { spendMithrilRunes, addEnergy, addGodsCoins } = useGame();

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (type === 'energy') {
      if (!spendMithrilRunes(50)) { toast.error('Недостаточно МР!'); return; }
      addEnergy(100);
      toast.success('+100 Энергии за 50 МР');
    } else {
      if (!spendMithrilRunes(50)) { toast.error('Недостаточно МР!'); return; }
      addGodsCoins(10);
      toast.success('+10 Монет Богов за 50 МР');
    }
  }, [type, spendMithrilRunes, addEnergy, addGodsCoins]);

  const sizeClass = size === 'md' ? 'w-6 h-6 text-sm' : 'w-5 h-5 text-xs';

  return (
    <button
      onClick={handleClick}
      className={`${sizeClass} rounded-full bg-primary/20 hover:bg-primary/40 text-primary font-bold flex items-center justify-center transition-colors flex-shrink-0`}
      title={type === 'energy' ? 'Купить 100 энергии за 50 МР' : 'Купить 10 монет за 50 МР'}
    >
      +
    </button>
  );
}
