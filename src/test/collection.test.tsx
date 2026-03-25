import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AllHeroesPage from '../pages/AllHeroesPage';
import { CHAMPIONS } from '../data/gameData';

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => {
      const { initial, animate, exit, whileHover, whileTap, layout, transition, ...domProps } = props;
      return <div {...domProps}>{children}</div>;
    },
    h1: ({ children, ...props }: any) => {
      const { initial, animate, transition, ...domProps } = props;
      return <h1 {...domProps}>{children}</h1>;
    },
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <AllHeroesPage />
    </MemoryRouter>
  );
}

describe('🖼️ Авто-проверка коллекции «Все герои»', () => {

  const getVisibleHeroes = () => CHAMPIONS.filter(ch => screen.queryByText(ch.name) != null);

  it('должен отобразить всех героев', async () => {
    renderPage();
    await waitFor(() => {
      expect(getVisibleHeroes()).toHaveLength(CHAMPIONS.length);
    });
  });

  it('фильтр по элементу «Свет» показывает только героев Света', async () => {
    renderPage();
    const lightHeroes = CHAMPIONS.filter(c => c.element === 'Свет');

    fireEvent.click(screen.getByRole('button', { name: /^☀️ Свет$/ }));

    await waitFor(() => {
      expect(getVisibleHeroes()).toHaveLength(lightHeroes.length);
    });

    lightHeroes.forEach(h => {
      expect(screen.queryByText(h.name)).toBeTruthy();
    });
  });

  it('фильтр по редкости «Самоцветный» показывает правильное число', async () => {
    renderPage();
    const mythic = CHAMPIONS.filter(c => c.rarity === 'Самоцветный');

    fireEvent.click(screen.getByRole('button', { name: /^Самоцветный$/ }));

    await waitFor(() => {
      expect(getVisibleHeroes()).toHaveLength(mythic.length);
    });
  });

  it('комбинация фильтров работает (Свет + Самоцветный)', async () => {
    renderPage();
    const target = CHAMPIONS.filter(c => c.element === 'Свет' && c.rarity === 'Самоцветный');

    fireEvent.click(screen.getByRole('button', { name: /^☀️ Свет$/ }));
    fireEvent.click(screen.getByRole('button', { name: /^Самоцветный$/ }));

    await waitFor(() => {
      expect(getVisibleHeroes()).toHaveLength(target.length);
    });
  });

  it('поиск по имени фильтрует корректно', async () => {
    renderPage();
    const input = screen.getByPlaceholderText('Поиск по имени...');
    fireEvent.change(input, { target: { value: 'Илья' } });

    const expected = CHAMPIONS.filter(c => c.name.toLowerCase().includes('илья'));
    await waitFor(() => {
      expect(getVisibleHeroes()).toHaveLength(expected.length);
    });
  });

  it('сброс фильтров возвращает всех героев', async () => {
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: /^☀️ Свет$/ }));
    await waitFor(() => {
      expect(getVisibleHeroes().length).toBeLessThan(CHAMPIONS.length);
    });

    fireEvent.click(screen.getByText('✕ Сбросить фильтры'));
    await waitFor(() => {
      expect(getVisibleHeroes()).toHaveLength(CHAMPIONS.length);
    });
  });

  it('каждая карточка содержит имя героя', () => {
    renderPage();
    CHAMPIONS.forEach(champion => {
      expect(screen.queryByText(champion.name)).toBeTruthy();
    });
  });

  it('рендерит коллекцию менее чем за 1000мс', () => {
    const start = performance.now();
    renderPage();
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(1000);
  });
});
