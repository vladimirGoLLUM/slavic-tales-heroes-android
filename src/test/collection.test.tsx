import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AllHeroesPage from '../pages/AllHeroesPage';
import { CHAMPIONS } from '../data/gameData';
import { GameProvider } from '../context/GameContext';

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
      <GameProvider>
        <AllHeroesPage />
      </GameProvider>
    </MemoryRouter>
  );
}

describe('🖼️ Авто-проверка коллекции «Все герои»', () => {

  it('должен отобразить всех героев', () => {
    renderPage();
    const cards = document.querySelectorAll('[data-hero-id]');
    expect(cards.length).toBe(CHAMPIONS.length);
  });

  it('фильтр по элементу «Свет» показывает только героев Света', () => {
    renderPage();
    const lightHeroes = CHAMPIONS.filter(c => c.element === 'Свет');

    fireEvent.click(screen.getByRole('button', { name: /☀️ Свет/i }));

    const cards = document.querySelectorAll('[data-hero-id]');
    expect(cards.length).toBe(lightHeroes.length);
    lightHeroes.forEach(h => {
      expect(document.querySelector(`[data-hero-id="${h.id}"]`)).toBeTruthy();
    });
  });

  it('фильтр по редкости «Самоцветный» показывает правильное число', () => {
    renderPage();
    const mythic = CHAMPIONS.filter(c => c.rarity === 'Самоцветный');

    fireEvent.click(screen.getByRole('button', { name: /Самоцветный/i }));

    const cards = document.querySelectorAll('[data-hero-id]');
    expect(cards.length).toBe(mythic.length);
  });

  it('комбинация фильтров работает (Свет + Самоцветный)', () => {
    renderPage();
    const target = CHAMPIONS.filter(c => c.element === 'Свет' && c.rarity === 'Самоцветный');

    fireEvent.click(screen.getByRole('button', { name: /☀️ Свет/i }));
    fireEvent.click(screen.getByRole('button', { name: /Самоцветный/i }));

    const cards = document.querySelectorAll('[data-hero-id]');
    expect(cards.length).toBe(target.length);
  });

  it('поиск по имени фильтрует корректно', () => {
    renderPage();
    const input = screen.getByPlaceholderText('Поиск по имени...');
    fireEvent.change(input, { target: { value: 'Илья' } });

    const cards = document.querySelectorAll('[data-hero-id]');
    const expected = CHAMPIONS.filter(c => c.name.toLowerCase().includes('илья'));
    expect(cards.length).toBe(expected.length);
  });

  it('сброс фильтров возвращает всех героев', () => {
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: /☀️ Свет/i }));
    expect(document.querySelectorAll('[data-hero-id]').length).toBeLessThan(CHAMPIONS.length);

    fireEvent.click(screen.getByText('✕ Сбросить фильтры'));
    expect(document.querySelectorAll('[data-hero-id]').length).toBe(CHAMPIONS.length);
  });

  it('каждая карточка содержит имя героя', () => {
    renderPage();
    CHAMPIONS.forEach(champion => {
      const card = document.querySelector(`[data-hero-id="${champion.id}"]`);
      expect(card).toBeTruthy();
      expect(card!.textContent).toContain(champion.name);
    });
  });

  it('рендерит коллекцию менее чем за 1000мс', () => {
    const start = performance.now();
    renderPage();
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(1000);
  });
});
