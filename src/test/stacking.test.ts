import { describe, it, expect, vi, beforeEach } from 'vitest';
import { applyEffect, getStatMultiplier } from '@/utils/effects';
import type { BattleUnit } from '@/ai/enemyAI';
import type { EffectApplication } from '@/types/game';

function makeMockUnit(overrides?: Partial<BattleUnit>): BattleUnit {
  return {
    id: 'unit-1',
    champion: {
      id: 'test',
      name: 'Test',
      element: 'fire',
      rarity: 'common',
      faction: 'Славяне',
      baseStats: { hp: 1000, atk: 100, def: 50, spd: 100, critChance: 15, critDmg: 50, resistance: 30, accuracy: 30 },
      skills: [],
      image: '',
    } as any,
    currentHp: 1000,
    maxHp: 1000,
    isEnemy: false,
    skillCooldowns: [],
    effects: [],
    ...overrides,
  };
}

function forceApply(unit: BattleUnit, app: Partial<EffectApplication> & { type: EffectApplication['type'] }, sourceId: string) {
  const full: EffectApplication = { value: 20, duration: 2, chance: 1, target: 'enemy', ...app };
  // Force Math.random to always pass chance/resistance checks
  vi.spyOn(Math, 'random').mockReturnValue(0);
  const result = applyEffect(unit, full, sourceId);
  vi.restoreAllMocks();
  return result;
}

describe('Effect stacking limits', () => {
  it('three different sources apply atk_up → all three stack', () => {
    let unit = makeMockUnit();
    for (let i = 1; i <= 3; i++) {
      const r = forceApply(unit, { type: 'atk_up', value: 20 }, `hero-${i}`);
      unit = r.unit;
      expect(r.applied).toBe(true);
    }
    expect(unit.effects.filter(e => e.type === 'atk_up')).toHaveLength(3);
    // Total multiplier: 1 + 3 * 0.2 = 1.6
    expect(getStatMultiplier(unit, 'atk')).toBeCloseTo(1.6);
  });

  it('same source applies atk_up twice → refreshes duration, no double stack', () => {
    let unit = makeMockUnit();
    const r1 = forceApply(unit, { type: 'atk_up', value: 20, duration: 2 }, 'hero-1');
    unit = r1.unit;
    const r2 = forceApply(unit, { type: 'atk_up', value: 20, duration: 3 }, 'hero-1');
    unit = r2.unit;
    expect(unit.effects.filter(e => e.type === 'atk_up')).toHaveLength(1);
    expect(unit.effects[0].duration).toBe(3); // refreshed to max
  });

  it('fourth source atk_up replaces oldest (buff limit = 3)', () => {
    let unit = makeMockUnit();
    // Apply 3 with decreasing durations
    for (let i = 1; i <= 3; i++) {
      const r = forceApply(unit, { type: 'atk_up', value: 20, duration: 5 - i }, `hero-${i}`);
      unit = r.unit;
    }
    expect(unit.effects).toHaveLength(3);
    // hero-3 has duration=2 (smallest), should be replaced
    const r4 = forceApply(unit, { type: 'atk_up', value: 25, duration: 4 }, 'hero-4');
    unit = r4.unit;
    expect(unit.effects.filter(e => e.type === 'atk_up')).toHaveLength(3);
    expect(unit.effects.find(e => e.sourceId === 'hero-3')).toBeUndefined();
    expect(unit.effects.find(e => e.sourceId === 'hero-4')).toBeDefined();
  });

  it('debuffs stack up to 5 (def_down)', () => {
    let unit = makeMockUnit();
    for (let i = 1; i <= 5; i++) {
      const r = forceApply(unit, { type: 'def_down', value: 10 }, `hero-${i}`);
      unit = r.unit;
    }
    expect(unit.effects.filter(e => e.type === 'def_down')).toHaveLength(5);
    // Sixth replaces oldest
    const r6 = forceApply(unit, { type: 'def_down', value: 10, duration: 3 }, 'hero-6');
    unit = r6.unit;
    expect(unit.effects.filter(e => e.type === 'def_down')).toHaveLength(5);
  });

  it('two poisons stack → getStatMultiplier unaffected but both exist', () => {
    let unit = makeMockUnit();
    const r1 = forceApply(unit, { type: 'poison', value: 5, duration: 2 }, 'hero-1');
    unit = r1.unit;
    const r2 = forceApply(unit, { type: 'poison', value: 5, duration: 2 }, 'hero-2');
    unit = r2.unit;
    expect(unit.effects.filter(e => e.type === 'poison')).toHaveLength(2);
  });
});
