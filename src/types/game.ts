export type EffectType =
  | 'atk_up' | 'def_up' | 'spd_up' | 'crit_up' | 'critdmg_up' | 'acc_up' | 'res_up'
  | 'atk_down' | 'def_down' | 'spd_down' | 'crit_down' | 'acc_down' | 'res_down'
  | 'poison' | 'bleed' | 'burn'
  | 'stun' | 'freeze' | 'sleep' | 'fear'
  | 'heal_over_time' | 'shield'
  | 'counterattack' | 'extra_turn' | 'cleanse' | 'revive'
  | 'heal' | 'lifesteal' | 'dispel' | 'polymorph' | 'spd_steal' | 'taunt'
  | 'tm_boost' | 'tm_reduce';

export interface StatusEffect {
  id: string;
  type: EffectType;
  value: number;
  duration: number;
  sourceId: string;
}

export interface EffectApplication {
  type: EffectType;
  value?: number;
  duration?: number;
  chance?: number;
  target: 'self' | 'enemy' | 'all_allies' | 'all_enemies' | 'ally' | 'dead_ally' | 'lowest_hp_ally';
}

export const EFFECT_ICONS: Record<EffectType, string> = {
  atk_up: '/effects/atk_up.png', def_up: '/effects/def_up.png', spd_up: '/effects/spd_up.png', crit_up: '/effects/crit_up.png',
  critdmg_up: '/effects/critdmg_up.png', acc_up: '/effects/acc_up.png', res_up: '/effects/res_up.png',
  atk_down: '/effects/atk_down.png', def_down: '/effects/def_down.png', spd_down: '/effects/spd_down.png', crit_down: '/effects/crit_down.png',
  acc_down: '/effects/acc_down.png', res_down: '/effects/res_down.png',
  poison: '/effects/poison.png', bleed: '/effects/bleed.png', burn: '/effects/burn.png',
  stun: '/effects/stun.png', freeze: '/effects/freeze.png', sleep: '/effects/sleep.png', fear: '/effects/fear.png',
  heal_over_time: '/effects/heal_over_time.png', shield: '/effects/shield.png',
  counterattack: '/effects/counterattack.png', extra_turn: '/effects/extra_turn.png', cleanse: '/effects/cleanse.png', revive: '/effects/revive.png',
  heal: '/effects/heal.png', lifesteal: '/effects/lifesteal.png', dispel: '/effects/dispel.png', polymorph: '/effects/polymorph.png', spd_steal: '/effects/spd_steal.png', taunt: '/effects/taunt.png',
  tm_boost: '/effects/spd_up.png', tm_reduce: '/effects/spd_down.png',
};

export const EFFECT_NAMES: Record<EffectType, string> = {
  atk_up: 'Сила↑', def_up: 'Защита↑', spd_up: 'Скорость↑', crit_up: 'Крит↑',
  critdmg_up: 'Крит.урон↑', acc_up: 'Меткость↑', res_up: 'Стойкость↑',
  atk_down: 'Сила↓', def_down: 'Защита↓', spd_down: 'Скорость↓', crit_down: 'Крит↓',
  acc_down: 'Меткость↓', res_down: 'Стойкость↓',
  poison: 'Яд', bleed: 'Кровотечение', burn: 'Ожог',
  stun: 'Оглушение', freeze: 'Заморозка', sleep: 'Сон', fear: 'Страх',
  heal_over_time: 'Регенерация', shield: 'Щит',
  counterattack: 'Контратака', extra_turn: 'Доп.ход', cleanse: 'Очищение', revive: 'Воскрешение',
  heal: 'Исцеление', lifesteal: 'Кража жизни', dispel: 'Рассеивание', polymorph: 'Превращение', spd_steal: 'Кража скорости', taunt: 'Провокация',
  tm_boost: 'Залив шкалы↑', tm_reduce: 'Срез шкалы↓',
};

export function isBuffType(type: EffectType): boolean {
  return type.endsWith('_up') || ['heal_over_time', 'shield', 'counterattack', 'extra_turn', 'heal', 'lifesteal', 'taunt', 'tm_boost'].includes(type);
}

export function isDebuffType(type: EffectType): boolean {
  return type.endsWith('_down') || ['poison', 'bleed', 'burn', 'stun', 'freeze', 'sleep', 'fear', 'polymorph', 'spd_steal', 'tm_reduce'].includes(type);
}

export function isCCType(type: EffectType): boolean {
  return ['stun', 'freeze', 'sleep', 'fear', 'polymorph'].includes(type);
}

export function isDotType(type: EffectType): boolean {
  return ['poison', 'bleed', 'burn'].includes(type);
}
