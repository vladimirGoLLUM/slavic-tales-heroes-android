import { describe, it, expect } from 'vitest';
import { calculateRewards } from '@/utils/rewards';
import {
  type Artifact, type ArtifactSlot, type ArtifactSet, type ArtifactRarity, type SubstatEntry,
  generateArtifact, calculateArtifactStats, getActiveSetBonuses,
  ALL_SLOTS, ALL_SETS, SET_BONUSES,
  getInitialSubstatCount, TOTAL_SUBSTAT_SLOTS, getUnlockedSubstats, getLockedSubstats,
  canEquipSlot, ACCESSORY_STAR_REQUIREMENTS, SLOT_PRIMARY_OPTIONS,
} from '@/data/artifacts';
import { CHAMPIONS } from '@/data/gameData';

/* ─── helpers ─── */

function makeArtifact(overrides: Partial<Artifact> & { slot: ArtifactSlot; set: ArtifactSet }): Artifact {
  return {
    id: `test-${Math.random().toString(36).slice(2)}`,
    name: 'Test Artifact',
    rarity: 'Заветный',
    stars: 1,
    level: 0,
    primaryStat: 'def',
    primaryType: 'flat',
    primaryValue: 30,
    substats: [],
    ...overrides,
  };
}

const BASE_STATS = CHAMPIONS[0].baseStats;

/* ════════════════════════════════════════════════════════ */

describe('🏺 Artifact system v2 e2e', () => {

  /* ── 1. Battle rewards generate artifacts ── */
  describe('Battle artifact drops', () => {
    it('generateArtifact returns a valid artifact with all required fields', () => {
      const art = generateArtifact('Заветный');
      expect(art.id).toBeTruthy();
      expect(art.name).toBeTruthy();
      expect(ALL_SETS).toContain(art.set);
      expect(ALL_SLOTS).toContain(art.slot);
      expect(art.rarity).toBe('Заветный');
      expect(art.primaryValue).toBeGreaterThan(0);
      expect(art.primaryStat).toBeTruthy();
      expect(art.level).toBe(0);
    });

    it('calculateRewards drops 1-3 artifacts when RNG is forced', () => {
      const original = Math.random;
      Math.random = () => 0;

      const rewards = calculateRewards(1);
      expect(rewards.artifactDrop).toBe(true);
      expect(rewards.droppedArtifacts.length).toBeGreaterThanOrEqual(1);
      expect(rewards.droppedArtifacts.length).toBeLessThanOrEqual(3);
      rewards.droppedArtifacts.forEach(art => {
        expect(art.id).toBeTruthy();
        expect(ALL_SLOTS).toContain(art.slot);
      });

      Math.random = original;
    });
  });

  /* ── 2. Stat calculation ── */
  describe('Artifact stat calculation', () => {
    it('equipping a single flat artifact increases total stats', () => {
      const art = makeArtifact({
        slot: 'weapon',
        set: 'Атака',
        primaryStat: 'atk',
        primaryType: 'flat',
        primaryValue: 50,
        substats: [],
      });

      const bonus = calculateArtifactStats([art], BASE_STATS);
      expect(bonus.atk).toBe(50);
    });

    it('multiple artifacts stack their stats', () => {
      const arts: Artifact[] = [
        makeArtifact({ slot: 'weapon', set: 'Атака', primaryStat: 'atk', primaryType: 'flat', primaryValue: 40, substats: [] }),
        makeArtifact({ slot: 'shield', set: 'Защита', primaryStat: 'def', primaryType: 'flat', primaryValue: 30, substats: [
          { stat: 'hp', type: 'flat', value: 100, boosts: 0, unlockLevel: 5 },
        ], level: 10 }),
      ];

      const bonus = calculateArtifactStats(arts, BASE_STATS);
      expect(bonus.atk).toBe(40);
      expect(bonus.def).toBe(30);
      expect(bonus.hp).toBe(100); // unlocked since level 10 >= 5
    });

    it('locked substats are NOT counted', () => {
      const art = makeArtifact({
        slot: 'weapon',
        set: 'Атака',
        primaryStat: 'atk',
        primaryType: 'flat',
        primaryValue: 20,
        level: 3, // below unlock level
        substats: [
          { stat: 'hp', type: 'flat', value: 100, boosts: 0, unlockLevel: 5 },
        ],
      });

      const bonus = calculateArtifactStats([art], BASE_STATS);
      expect(bonus.atk).toBe(20);
      expect(bonus.hp).toBeUndefined(); // not unlocked
    });
  });

  /* ── 3. Set bonuses (2-piece only) ── */
  describe('Set bonuses', () => {
    it('2-piece Защита grants +15% DEF', () => {
      const arts: Artifact[] = [
        makeArtifact({ slot: 'weapon', set: 'Защита', primaryStat: 'atk', primaryType: 'flat', primaryValue: 10, substats: [] }),
        makeArtifact({ slot: 'shield', set: 'Защита', primaryStat: 'def', primaryType: 'flat', primaryValue: 20, substats: [] }),
      ];

      const bonus = calculateArtifactStats(arts, BASE_STATS);
      expect(bonus.def).toBe(20 + Math.floor(BASE_STATS.def * 0.15));

      const active = getActiveSetBonuses(arts);
      expect(active).toHaveLength(1);
      expect(active[0].set).toBe('Защита');
      expect(active[0].bonus.pieces).toBe(2);
    });

    it('4 pieces of same set activates bonus twice', () => {
      const arts: Artifact[] = ALL_SLOTS.slice(0, 4).map(slot =>
        makeArtifact({ slot, set: 'Защита', primaryStat: 'def', primaryType: 'flat', primaryValue: 10, substats: [] })
      );

      const bonus = calculateArtifactStats(arts, BASE_STATS);
      const flatDef = 10 * 4;
      const setBonus = Math.floor(BASE_STATS.def * 0.15) * 2; // activated twice
      expect(bonus.def).toBe(flatDef + setBonus);

      const active = getActiveSetBonuses(arts);
      expect(active).toHaveLength(2);
    });

    it('Скорость set grants flat +12 speed', () => {
      const arts: Artifact[] = [
        makeArtifact({ slot: 'weapon', set: 'Скорость', primaryStat: 'atk', primaryType: 'flat', primaryValue: 10, substats: [] }),
        makeArtifact({ slot: 'boots', set: 'Скорость', primaryStat: 'spd', primaryType: 'flat', primaryValue: 8, substats: [] }),
      ];

      const bonus = calculateArtifactStats(arts, BASE_STATS);
      expect(bonus.spd).toBe(8 + 12); // flat primary + flat set bonus
    });

    it('mixed sets grant bonuses only for sets with enough pieces', () => {
      const arts: Artifact[] = [
        makeArtifact({ slot: 'weapon', set: 'Атака', primaryStat: 'atk', primaryType: 'flat', primaryValue: 10, substats: [] }),
        makeArtifact({ slot: 'shield', set: 'Атака', primaryStat: 'def', primaryType: 'flat', primaryValue: 10, substats: [] }),
        makeArtifact({ slot: 'helmet', set: 'Защита', primaryStat: 'hp', primaryType: 'flat', primaryValue: 10, substats: [] }),
      ];

      const active = getActiveSetBonuses(arts);
      expect(active).toHaveLength(1);
      expect(active[0].set).toBe('Атака');
    });
  });

  /* ── 4. Substat unlocking at correct levels ── */
  describe('Substat unlocking', () => {
    it('substats unlock progressively at 5, 10, 15, 20', () => {
      const subs: SubstatEntry[] = [
        { stat: 'hp', type: 'flat', value: 50, boosts: 0, unlockLevel: 5 },
        { stat: 'atk', type: 'flat', value: 20, boosts: 0, unlockLevel: 10 },
        { stat: 'def', type: 'flat', value: 15, boosts: 0, unlockLevel: 15 },
        { stat: 'spd', type: 'flat', value: 5, boosts: 0, unlockLevel: 20 },
      ];

      const art: Artifact = makeArtifact({
        slot: 'weapon', set: 'Атака',
        rarity: 'Самоцветный', level: 0,
        substats: subs,
      });

      expect(getUnlockedSubstats(art)).toHaveLength(0);
      expect(getLockedSubstats(art)).toHaveLength(4);

      const at5 = { ...art, level: 5 };
      expect(getUnlockedSubstats(at5)).toHaveLength(1);
      expect(getUnlockedSubstats(at5)[0].stat).toBe('hp');

      const at10 = { ...art, level: 10 };
      expect(getUnlockedSubstats(at10)).toHaveLength(2);

      const at15 = { ...art, level: 15 };
      expect(getUnlockedSubstats(at15)).toHaveLength(3);

      const at20 = { ...art, level: 20 };
      expect(getUnlockedSubstats(at20)).toHaveLength(4);
      expect(getLockedSubstats(at20)).toHaveLength(0);
    });

    it('rarity determines number of initial substats', () => {
      const rarities: ArtifactRarity[] = ['Обиходный', 'Заветный', 'Сказанный', 'Калиновый', 'Самоцветный'];
      rarities.forEach((rarity, idx) => {
        expect(getInitialSubstatCount(rarity)).toBe(idx);
      });
    });

    it('generated artifact always has 4 total substats', () => {
      const rarities: ArtifactRarity[] = ['Обиходный', 'Заветный', 'Сказанный', 'Калиновый', 'Самоцветный'];
      for (const rarity of rarities) {
        const art = generateArtifact(rarity);
        expect(art.substats).toHaveLength(TOTAL_SUBSTAT_SLOTS);
      }
    });
  });

  /* ── 5. Accessory star requirements ── */
  describe('Accessory star requirements', () => {
    it('ring requires 2 stars', () => {
      expect(canEquipSlot('ring', 0)).toBe(false);
      expect(canEquipSlot('ring', 1)).toBe(false);
      expect(canEquipSlot('ring', 2)).toBe(true);
      expect(canEquipSlot('ring', 5)).toBe(true);
    });

    it('amulet requires 3 stars', () => {
      expect(canEquipSlot('amulet', 2)).toBe(false);
      expect(canEquipSlot('amulet', 3)).toBe(true);
    });

    it('banner requires 4 stars', () => {
      expect(canEquipSlot('banner', 3)).toBe(false);
      expect(canEquipSlot('banner', 4)).toBe(true);
    });

    it('main slots have no star requirement', () => {
      const mainSlots: ArtifactSlot[] = ['weapon', 'helmet', 'shield', 'gloves', 'armor', 'boots'];
      for (const slot of mainSlots) {
        expect(canEquipSlot(slot, 0)).toBe(true);
      }
    });
  });

  /* ── 6. Primary stat validity per slot ── */
  describe('Slot primary stat validity', () => {
    it('weapon only allows flat atk', () => {
      const opts = SLOT_PRIMARY_OPTIONS.weapon;
      expect(opts).toHaveLength(1);
      expect(opts[0].stat).toBe('atk');
      expect(opts[0].type).toBe('flat');
    });

    it('helmet only allows flat hp', () => {
      const opts = SLOT_PRIMARY_OPTIONS.helmet;
      expect(opts).toHaveLength(1);
      expect(opts[0].stat).toBe('hp');
    });

    it('shield only allows flat def', () => {
      const opts = SLOT_PRIMARY_OPTIONS.shield;
      expect(opts).toHaveLength(1);
      expect(opts[0].stat).toBe('def');
    });

    it('gloves has multiple options including critChance', () => {
      const opts = SLOT_PRIMARY_OPTIONS.gloves;
      expect(opts.length).toBeGreaterThan(1);
      expect(opts.some(o => o.stat === 'critChance')).toBe(true);
    });

    it('generated artifacts respect slot primary constraints', () => {
      const original = Math.random;
      let seed = 42;
      Math.random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

      for (let i = 0; i < 100; i++) {
        const art = generateArtifact('Сказанный');
        const validPrimaries = SLOT_PRIMARY_OPTIONS[art.slot].map(o => o.stat);
        expect(validPrimaries).toContain(art.primaryStat);
      }

      Math.random = original;
    });
  });

  /* ── 7. Inventory filtering logic ── */
  describe('Inventory filtering', () => {
    const inventory: Artifact[] = [
      makeArtifact({ slot: 'weapon', set: 'Атака', rarity: 'Калиновый', primaryStat: 'atk', primaryType: 'flat', primaryValue: 50, substats: [] }),
      makeArtifact({ slot: 'shield', set: 'Защита', rarity: 'Заветный', primaryStat: 'def', primaryType: 'flat', primaryValue: 30, substats: [] }),
      makeArtifact({ slot: 'weapon', set: 'Защита', rarity: 'Сказанный', primaryStat: 'atk', primaryType: 'flat', primaryValue: 40, substats: [] }),
      makeArtifact({ slot: 'boots', set: 'Скорость', rarity: 'Самоцветный', primaryStat: 'spd', primaryType: 'flat', primaryValue: 25, substats: [] }),
      makeArtifact({ slot: 'ring', set: 'Атака', rarity: 'Обиходный', primaryStat: 'atk', primaryType: 'flat', primaryValue: 5, substats: [] }),
    ];

    it('filter by slot returns only matching artifacts', () => {
      const weapons = inventory.filter(a => a.slot === 'weapon');
      expect(weapons).toHaveLength(2);
    });

    it('filter by set returns only matching artifacts', () => {
      const def = inventory.filter(a => a.set === 'Защита');
      expect(def).toHaveLength(2);
    });

    it('filter by rarity returns only matching artifacts', () => {
      const epic = inventory.filter(a => a.rarity === 'Калиновый');
      expect(epic).toHaveLength(1);
    });
  });

  /* ── 8. Generation covers all rarities ── */
  describe('Artifact generation', () => {
    it('generates artifacts for all rarity tiers', () => {
      const rarities: ArtifactRarity[] = ['Обиходный', 'Заветный', 'Сказанный', 'Калиновый', 'Самоцветный'];
      for (const rarity of rarities) {
        const art = generateArtifact(rarity);
        expect(art.rarity).toBe(rarity);
        expect(art.primaryValue).toBeGreaterThan(0);
        expect(art.substats).toHaveLength(TOTAL_SUBSTAT_SLOTS);
      }
    });

    it('higher rarity artifacts have higher primary values on average', () => {
      const samples = 50;
      const avg = (rarity: ArtifactRarity) => {
        let sum = 0;
        const origRandom = Math.random;
        let seed = 42;
        Math.random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
        for (let i = 0; i < samples; i++) {
          sum += generateArtifact(rarity).primaryValue;
        }
        Math.random = origRandom;
        return sum / samples;
      };

      expect(avg('Самоцветный')).toBeGreaterThan(avg('Обиходный'));
    });
  });
});
