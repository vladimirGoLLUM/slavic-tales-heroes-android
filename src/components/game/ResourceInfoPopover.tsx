import { ReactNode } from 'react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { useGame } from '@/context/GameContext';
import { computeGodsCoins } from '@/data/arenaData';
import iconSouls from '@/assets/icons/icon_souls.png';
import coinGodsImg from '@/assets/icons/coin-gods.png';

export type ResourceType = 'souls' | 'runes' | 'mithril' | 'energy' | 'coins';

interface ResourceInfoPopoverProps {
  type: ResourceType;
  children: ReactNode;
}

const RESOURCE_META: Record<ResourceType, { name: string; icon: string; desc: string }> = {
  souls: { name: 'Души', icon: '', desc: 'Основная валюта для улучшения и прокачки героев.' },
  runes: { name: 'Руны', icon: '/ui/icon_runes.png', desc: 'Валюта для покупок в Торжище и улучшений.' },
  mithril: { name: 'Мифриловые Руны', icon: '/ui/icon_mithril.png', desc: 'Редкая валюта для особых покупок и создания артефактов.' },
  energy: { name: 'Энергия', icon: '/ui/energy.png', desc: 'Тратится на прохождение этапов Кампании. Восстанавливается со временем.' },
  coins: { name: 'Монеты Богов', icon: '', desc: 'Валюта Арены. Регенерация: 1 монета/час (макс. 10).' },
};

export default function ResourceInfoPopover({ type, children }: ResourceInfoPopoverProps) {
  const { player, getEnergyInfo, arenaState, isSoulBoosterActive, isRuneBoosterActive, isVipActive } = useGame();

  const meta = RESOURCE_META[type];
  const icon = type === 'souls' ? iconSouls : type === 'coins' ? coinGodsImg : meta.icon;
  const vip = isVipActive();

  const renderDetails = () => {
    switch (type) {
      case 'souls': {
        const booster = isSoulBoosterActive();
        const mult = (booster ? 2 : 1) * (vip ? 1.5 : 1);
        return (
          <>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Баланс:</span>
              <span className="font-mono text-foreground">{player.souls}</span>
            </div>
            <div className="text-xs space-y-0.5 mt-1">
              <div className={`flex justify-between ${booster ? 'text-primary animate-pulse font-bold' : 'text-muted-foreground'}`}>
                <span>Зов Предков</span><span>×2 {booster ? '✓' : '—'}</span>
              </div>
              <div className={`flex justify-between ${vip ? 'text-primary animate-pulse font-bold' : 'text-muted-foreground'}`}>
                <span>VIP 👑</span><span>×1.5 {vip ? '✓' : '—'}</span>
              </div>
              {mult > 1 && (
                <div className="flex justify-between text-primary font-bold text-sm mt-1 border-t border-border/50 pt-1">
                  <span>Итого множитель</span><span>×{mult}</span>
                </div>
              )}
            </div>
          </>
        );
      }
      case 'runes': {
        const booster = isRuneBoosterActive();
        const mult = (booster ? 2 : 1) * (vip ? 1.5 : 1);
        return (
          <>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Баланс:</span>
              <span className="font-mono text-foreground">{player.runes}</span>
            </div>
            <div className="text-xs space-y-0.5 mt-1">
              <div className={`flex justify-between ${booster ? 'text-primary animate-pulse font-bold' : 'text-muted-foreground'}`}>
                <span>Рунный Прилив</span><span>×2 {booster ? '✓' : '—'}</span>
              </div>
              <div className={`flex justify-between ${vip ? 'text-primary animate-pulse font-bold' : 'text-muted-foreground'}`}>
                <span>VIP 👑</span><span>×1.5 {vip ? '✓' : '—'}</span>
              </div>
              {mult > 1 && (
                <div className="flex justify-between text-primary font-bold text-sm mt-1 border-t border-border/50 pt-1">
                  <span>Итого множитель</span><span>×{mult}</span>
                </div>
              )}
            </div>
          </>
        );
      }
      case 'mithril':
        return (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Баланс:</span>
            <span className="font-mono text-foreground">{player.mithrilRunes}</span>
          </div>
        );
      case 'energy': {
        const info = getEnergyInfo();
        const minutesToFull = info.current < info.max ? Math.ceil((info.max - info.current) * 5) : 0;
        const hFull = Math.floor(minutesToFull / 60);
        const mFull = minutesToFull % 60;
        return (
          <>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Текущая:</span>
              <span className="font-mono text-foreground">{info.current}/{info.max}</span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Восстановление: 1 ед. / 5 мин
            </div>
            {minutesToFull > 0 && (
              <div className="text-xs text-primary mt-0.5">
                До полной: ~{hFull > 0 ? `${hFull}ч ` : ''}{mFull}м
              </div>
            )}
          </>
        );
      }
      case 'coins': {
        const { coins } = computeGodsCoins(arenaState.godsCoins, arenaState.lastGodsCoinUpdate);
        return (
          <>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Баланс:</span>
              <span className="font-mono text-foreground">{coins}</span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Регенерация: 1 монета/час (макс. 10)
            </div>
          </>
        );
      }
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity">
          {children}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-3 card-lubok" sideOffset={8}>
        <div className="flex items-center gap-2 mb-2">
          <img src={icon} alt={meta.name} className="w-5 h-5 object-contain" />
          <span className="font-kelly text-sm text-foreground">{meta.name}</span>
        </div>
        <p className="text-xs text-muted-foreground mb-2">{meta.desc}</p>
        {renderDetails()}
      </PopoverContent>
    </Popover>
  );
}
