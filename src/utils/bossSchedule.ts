/**
 * Boss availability schedule.
 * Hydra: Mon(1), Wed(3), Fri(5), Sun(0)
 * Cerberus: Tue(2), Thu(4), Sat(6), Sun(0)
 */

const HYDRA_DAYS = [1, 3, 5, 0]; // Mon, Wed, Fri, Sun
const CERBERUS_DAYS = [2, 4, 6, 0]; // Tue, Thu, Sat, Sun

const DAY_NAMES_RU = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];

export function isBossAvailableToday(bossId: 'hydra' | 'cerberus'): boolean {
  const day = new Date().getDay();
  const days = bossId === 'hydra' ? HYDRA_DAYS : CERBERUS_DAYS;
  return days.includes(day);
}

/** Returns ms until the next available day for this boss */
export function getTimeUntilNextAvailable(bossId: 'hydra' | 'cerberus'): number {
  const now = new Date();
  const currentDay = now.getDay();
  const days = bossId === 'hydra' ? HYDRA_DAYS : CERBERUS_DAYS;

  // Find next available day
  for (let offset = 1; offset <= 7; offset++) {
    const nextDay = (currentDay + offset) % 7;
    if (days.includes(nextDay)) {
      const next = new Date(now);
      next.setDate(next.getDate() + offset);
      next.setHours(0, 0, 0, 0);
      return next.getTime() - now.getTime();
    }
  }
  return 0;
}

export function getNextAvailableDayName(bossId: 'hydra' | 'cerberus'): string {
  const now = new Date();
  const currentDay = now.getDay();
  const days = bossId === 'hydra' ? HYDRA_DAYS : CERBERUS_DAYS;

  for (let offset = 1; offset <= 7; offset++) {
    const nextDay = (currentDay + offset) % 7;
    if (days.includes(nextDay)) {
      return DAY_NAMES_RU[nextDay];
    }
  }
  return '';
}

export function formatCountdown(ms: number): string {
  if (ms <= 0) return '00:00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function getBossAvailableDaysText(bossId: 'hydra' | 'cerberus'): string {
  if (bossId === 'hydra') return 'Пн, Ср, Пт, Вс';
  return 'Вт, Чт, Сб, Вс';
}
