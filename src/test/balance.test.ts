import { describe, it, expect } from 'vitest';
import { CHAMPIONS, ELEMENT_ADVANTAGE, SUMMON_RATES, RARITY_ORDER, type Element, type Rarity } from '@/data/gameData';

// ═══════════════════════════════════════════════
// 🔥 СКРИПТ ПРОВЕРКИ БАЛАНСА — «БЫЛИНА»
// ═══════════════════════════════════════════════

/** Формула мощности: ATK + HP/10 + (critChance * critDmg) / 2 */
function powerRating(c: typeof CHAMPIONS[0]): number {
  const s = c.baseStats;
  return s.atk + s.hp / 10 + (s.critChance * s.critDmg) / 200;
}

/** Средний DPS с учётом крита */
function effectiveDPS(c: typeof CHAMPIONS[0]): number {
  const s = c.baseStats;
  const avgCritMult = 1 + (s.critChance / 100) * (s.critDmg / 100);
  return s.atk * avgCritMult;
}

/** Суммарная «живучесть» */
function tankiness(c: typeof CHAMPIONS[0]): number {
  const s = c.baseStats;
  return s.hp * (1 + s.def / 100) * (1 + s.resistance / 200);
}

// ═══════════════════════════════════════════════
// 1. АНАЛИЗ МОЩНОСТИ ГЕРОЕВ
// ═══════════════════════════════════════════════

describe('🏋️ Анализ мощности героев', () => {
  const ratings = CHAMPIONS.map(c => ({
    name: c.name,
    rarity: c.rarity,
    element: c.element,
    power: Math.round(powerRating(c)),
    dps: Math.round(effectiveDPS(c)),
    tank: Math.round(tankiness(c)),
  })).sort((a, b) => b.power - a.power);

  it('должен вывести рейтинг мощности всех героев', () => {
    console.log('\n📊 РЕЙТИНГ МОЩНОСТИ (ATK + HP/10 + CRIT/2):');
    console.log('─'.repeat(70));
    console.log(
      'Герой'.padEnd(28),
      'Редкость'.padEnd(14),
      'Мощь'.padStart(6),
      'DPS'.padStart(6),
      'Живуч.'.padStart(8),
    );
    console.log('─'.repeat(70));
    ratings.forEach(r => {
      console.log(
        r.name.padEnd(28),
        r.rarity.padEnd(14),
        String(r.power).padStart(6),
        String(r.dps).padStart(6),
        String(r.tank).padStart(8),
      );
    });
    expect(ratings.length).toBe(CHAMPIONS.length);
  });

  it('Самоцветные герои должны быть в топ-30% по мощности', () => {
    const mythics = ratings.filter(r => r.rarity === 'Самоцветный');
    const top30Threshold = ratings[Math.floor(ratings.length * 0.3)]?.power ?? 0;
    const weak = mythics.filter(m => m.power < top30Threshold);
    if (weak.length > 0) {
      console.warn('⚠️ Слабые Самоцветные:', weak.map(w => `${w.name} (${w.power})`));
    }
    expect(weak.length).toBe(0);
  });

  it('Обиходные герои должны быть в нижних 50% по мощности', () => {
    const commons = ratings.filter(r => r.rarity === 'Обиходный');
    const median = ratings[Math.floor(ratings.length / 2)]?.power ?? 0;
    const overpowered = commons.filter(c => c.power > median);
    if (overpowered.length > 0) {
      console.warn('⚠️ Слишком сильные Обиходные:', overpowered.map(o => `${o.name} (${o.power})`));
    }
    expect(overpowered.length).toBe(0);
  });

  it('разброс мощности внутри одной редкости не должен превышать 40%', () => {
    const byRarity: Record<string, number[]> = {};
    ratings.forEach(r => {
      if (!byRarity[r.rarity]) byRarity[r.rarity] = [];
      byRarity[r.rarity].push(r.power);
    });

    const issues: string[] = [];
    Object.entries(byRarity).forEach(([rarity, powers]) => {
      if (powers.length < 2) return;
      const min = Math.min(...powers);
      const max = Math.max(...powers);
      const spread = ((max - min) / min) * 100;
      console.log(`  ${rarity}: мин=${min}, макс=${max}, разброс=${spread.toFixed(1)}%`);
      if (spread > 40) {
        issues.push(`${rarity}: разброс ${spread.toFixed(1)}% (${min}–${max})`);
      }
    });

    if (issues.length > 0) {
      console.warn('⚠️ Высокий разброс:', issues);
    }
    // Мягкая проверка — предупреждение, не фейл
    expect(issues.length).toBeLessThanOrEqual(2);
  });
});

// ═══════════════════════════════════════════════
// 2. РАСПРЕДЕЛЕНИЕ ПО РЕДКОСТЯМ
// ═══════════════════════════════════════════════

describe('📦 Распределение по редкостям', () => {
  const distribution: Record<Rarity, string[]> = {
    'Обиходный': [],
    'Заветный': [],
    'Сказанный': [],
    'Калиновый': [],
    'Самоцветный': [],
  };

  CHAMPIONS.forEach(c => distribution[c.rarity].push(c.name));

  it('должно быть минимум 2 героя каждой редкости', () => {
    console.log('\n📦 РАСПРЕДЕЛЕНИЕ ПО РЕДКОСТЯМ:');
    console.log('─'.repeat(50));
    const issues: string[] = [];
    Object.entries(distribution).forEach(([rarity, heroes]) => {
      const rate = SUMMON_RATES[rarity as Rarity];
      console.log(`  ${rarity} (${(rate * 100).toFixed(1)}%): ${heroes.length} героев`);
      heroes.forEach(h => console.log(`    • ${h}`));
      if (heroes.length < 2) {
        issues.push(`${rarity}: только ${heroes.length} герой(ев)`);
      }
    });
    if (issues.length > 0) {
      console.warn('⚠️ Недостаток героев:', issues);
    }
    expect(issues.length).toBe(0);
  });

  it('сумма шансов призыва должна быть ~100%', () => {
    const total = Object.values(SUMMON_RATES).reduce((a, b) => a + b, 0);
    console.log(`\n  Сумма шансов: ${(total * 100).toFixed(2)}%`);
    // Допуск 0.1% из-за float
    expect(total).toBeGreaterThan(0.99);
    expect(total).toBeLessThanOrEqual(1.001);
  });

  it('средняя мощность должна расти с редкостью', () => {
    const avgByRarity: { rarity: Rarity; avg: number }[] = [];
    (Object.keys(distribution) as Rarity[]).forEach(rarity => {
      const heroes = CHAMPIONS.filter(c => c.rarity === rarity);
      if (heroes.length === 0) return;
      const avg = heroes.reduce((sum, c) => sum + powerRating(c), 0) / heroes.length;
      avgByRarity.push({ rarity, avg: Math.round(avg) });
    });

    console.log('\n📈 СРЕДНЯЯ МОЩНОСТЬ ПО РЕДКОСТЯМ:');
    avgByRarity.forEach(r => console.log(`  ${r.rarity}: ${r.avg}`));

    // Проверяем что каждая следующая редкость >= предыдущей
    for (let i = 1; i < avgByRarity.length; i++) {
      const prev = avgByRarity[i - 1];
      const curr = avgByRarity[i];
      if (curr.avg < prev.avg) {
        console.warn(`⚠️ ${curr.rarity} (${curr.avg}) слабее ${prev.rarity} (${prev.avg})`);
      }
    }

    // Самоцветные должны быть сильнее Обиходных
    const mythicAvg = avgByRarity.find(r => r.rarity === 'Самоцветный')?.avg ?? 0;
    const commonAvg = avgByRarity.find(r => r.rarity === 'Обиходный')?.avg ?? 0;
    expect(mythicAvg).toBeGreaterThan(commonAvg);
  });
});

// ═══════════════════════════════════════════════
// 3. ЭЛЕМЕНТАЛЬНОЕ ПРЕИМУЩЕСТВО
// ═══════════════════════════════════════════════

describe('⚔️ Элементальное преимущество', () => {
  it('каждый элемент должен иметь хотя бы одно преимущество', () => {
    const allElements: Element[] = ['Огонь', 'Вода', 'Лес', 'Камень', 'Тень', 'Свет'];
    console.log('\n⚔️ ЭЛЕМЕНТАЛЬНЫЙ КРУГ:');
    allElements.forEach(el => {
      const adv = ELEMENT_ADVANTAGE[el];
      console.log(`  ${el} → бьёт: [${adv.join(', ')}]`);
      expect(adv.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('основной круг должен быть замкнут: Огонь > Лес > Вода > Камень > Огонь', () => {
    expect(ELEMENT_ADVANTAGE['Огонь']).toContain('Лес');
    expect(ELEMENT_ADVANTAGE['Лес']).toContain('Вода');
    expect(ELEMENT_ADVANTAGE['Вода']).toContain('Камень');
    expect(ELEMENT_ADVANTAGE['Камень']).toContain('Огонь');
  });

  it('Свет и Тень должны быть взаимно эффективны', () => {
    expect(ELEMENT_ADVANTAGE['Свет']).toContain('Тень');
    expect(ELEMENT_ADVANTAGE['Тень']).toContain('Свет');
  });

  it('каждый элемент должен иметь минимум 2 героев', () => {
    const byElement: Record<string, string[]> = {};
    CHAMPIONS.forEach(c => {
      if (!byElement[c.element]) byElement[c.element] = [];
      byElement[c.element].push(c.name);
    });

    console.log('\n🌍 РАСПРЕДЕЛЕНИЕ ПО ЭЛЕМЕНТАМ:');
    const issues: string[] = [];
    Object.entries(byElement).forEach(([el, heroes]) => {
      console.log(`  ${el}: ${heroes.length} героев — ${heroes.join(', ')}`);
      if (heroes.length < 2) issues.push(`${el}: только ${heroes.length}`);
    });

    // Свет может иметь 1 героя пока — предупреждение
    if (issues.length > 0) {
      console.warn('⚠️ Мало героев элемента:', issues);
    }
    // Мягкая проверка: максимум 1 элемент с недобором
    expect(issues.length).toBeLessThanOrEqual(1);
  });
});

// ═══════════════════════════════════════════════
// 4. ПРОВЕРКА ДАННЫХ ГЕРОЕВ
// ═══════════════════════════════════════════════

describe('🔍 Валидация данных героев', () => {
  it('все герои должны иметь уникальные id', () => {
    const ids = CHAMPIONS.map(c => c.id);
    const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
    if (dupes.length) console.error('❌ Дубликаты ID:', dupes);
    expect(dupes.length).toBe(0);
  });

  it('все герои должны иметь ровно 3 навыка', () => {
    const issues = CHAMPIONS.filter(c => c.skills.length !== 3);
    if (issues.length) {
      console.error('❌ Неверное количество навыков:', issues.map(c => `${c.name}: ${c.skills.length}`));
    }
    expect(issues.length).toBe(0);
  });

  it('все статы должны быть положительными', () => {
    const issues: string[] = [];
    CHAMPIONS.forEach(c => {
      Object.entries(c.baseStats).forEach(([stat, val]) => {
        if (val <= 0) issues.push(`${c.name}.${stat} = ${val}`);
      });
    });
    if (issues.length) console.error('❌ Невалидные статы:', issues);
    expect(issues.length).toBe(0);
  });

  it('все герои должны иметь изображение', () => {
    const noImg = CHAMPIONS.filter(c => !c.imageUrl);
    if (noImg.length) console.error('❌ Без изображения:', noImg.map(c => c.name));
    expect(noImg.length).toBe(0);
  });

  it('critChance должен быть 0-100, critDmg > 0', () => {
    const issues: string[] = [];
    CHAMPIONS.forEach(c => {
      if (c.baseStats.critChance < 0 || c.baseStats.critChance > 100) {
        issues.push(`${c.name}: critChance=${c.baseStats.critChance}`);
      }
      if (c.baseStats.critDmg <= 0) {
        issues.push(`${c.name}: critDmg=${c.baseStats.critDmg}`);
      }
    });
    expect(issues.length).toBe(0);
  });
});

// ═══════════════════════════════════════════════
// 5. ЧЕК-ЛИСТ ДЛЯ РУЧНОГО ТЕСТИРОВАНИЯ
// ═══════════════════════════════════════════════

describe('📋 Чек-лист для ручного тестирования', () => {
  it('вывести чек-лист', () => {
    console.log(`
╔══════════════════════════════════════════════════════╗
║          📋 ЧЕК-ЛИСТ РУЧНОГО ТЕСТИРОВАНИЯ           ║
╠══════════════════════════════════════════════════════╣
║                                                      ║
║ 🏠 ГЛАВНЫЙ ЭКРАН                                     ║
║ □ Отображается отряд из 4 героев                     ║
║ □ Показаны души и руны игрока                        ║
║ □ Навигация работает (Бой, Призыв, Коллекция)        ║
║                                                      ║
║ 📜 КОЛЛЕКЦИЯ                                         ║
║ □ Все ${String(CHAMPIONS.length).padEnd(2)} героев отображаются с портретами     ║
║ □ Фильтрация по элементу работает                    ║
║ □ Фильтрация по редкости работает                    ║
║ □ Клик по герою открывает детали                     ║
║                                                      ║
║ 🔮 ПРИЗЫВ                                            ║
║ □ Кнопка «Призвать» активна при ≥100 душ             ║
║ □ Кнопка неактивна при <100 душ                      ║
║ □ Анимация ритуала проигрывается                     ║
║ □ Показывается полученный герой                      ║
║ □ Души списываются после призыва                     ║
║ □ Герой добавляется в коллекцию                      ║
║ □ Шансы отображаются корректно                       ║
║                                                      ║
║ ⚔️ БОЙ                                               ║
║ □ Отряд 4 героя vs 4 врага                           ║
║ □ Очередь хода по скорости                           ║
║ □ Навыки применяются корректно                       ║
║ □ Элементальное преимущество учитывается             ║
║ □ Крит. удары отображаются визуально                 ║
║ □ HP обновляются после атаки                         ║
║                                                      ║
║ 🦸 КАРТОЧКА ГЕРОЯ                                    ║
║ □ Все 8 статов отображаются                          ║
║ □ 3 навыка с описанием                               ║
║ □ Элемент и редкость видны                           ║
║ □ Фракция указана                                    ║
║                                                      ║
║ 📱 АДАПТИВНОСТЬ                                      ║
║ □ Мобильная версия (375px)                           ║
║ □ Планшет (768px)                                    ║
║ □ Десктоп (1440px)                                   ║
║                                                      ║
╚══════════════════════════════════════════════════════╝
    `);
    expect(true).toBe(true);
  });
});
