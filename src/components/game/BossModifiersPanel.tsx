import type { WorldBossModifiers } from '@/data/worldBoss';

interface BossModifiersPanelProps {
  modifiers: WorldBossModifiers;
}

export default function BossModifiersPanel({ modifiers }: BossModifiersPanelProps) {
  return (
    <div className="bg-background/40 rounded-xl p-3 border border-border/30">
      <h3 className="font-kelly text-xs text-muted-foreground mb-2">⚡ Модификаторы боя</h3>
      
      {/* Boss aura */}
      <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-accent/10 border border-accent/20 mb-2">
        <span className="text-sm">{modifiers.bossAura.icon}</span>
        <span className="text-[11px] font-kelly text-accent">{modifiers.bossAura.label}</span>
      </div>

      {/* Modifiers */}
      <div className="flex flex-wrap gap-1.5">
        {modifiers.modifiers.map(mod => (
          <span
            key={mod.id}
            title={mod.description}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-kelly border cursor-help ${
              mod.playerDebuffs
                ? 'bg-destructive/15 text-destructive border-destructive/30'
                : 'bg-accent/15 text-accent border-accent/30'
            }`}
          >
            {mod.icon} {mod.label}
          </span>
        ))}
      </div>
    </div>
  );
}
