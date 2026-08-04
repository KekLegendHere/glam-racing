/* Заезд дня: один и тот же уровень у всех, меняется раз в сутки.

   Трасса не хранится и не скачивается — она целиком выводится из даты, поэтому
   у любого игрока в один и тот же день получается один и тот же заезд, и с ним
   можно честно меряться результатами.

   Серия — счётчик дней подряд. Он и есть главная причина заглянуть завтра,
   поэтому обрывается только при пропуске полного дня. */
(function () {
  'use strict';

  /* Локальная дата, а не UTC: игрок ждёт смены заезда в свою полночь. */
  function todayKey(d) {
    const t = d || new Date();
    return t.getFullYear() * 10000 + (t.getMonth() + 1) * 100 + t.getDate();
  }

  function seeded(seed) {
    let s = (seed >>> 0) || 1;
    return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  }

  const NAMES = [
    'Утренний блеск', 'Полуденный неон', 'Вечерняя пудра', 'Ночной глиттер',
    'Розовый шторм', 'Сахарная гонка', 'Зеркальный проспект', 'Лимонный вихрь'
  ];

  window.Daily = {
    todayKey,

    /** Уровень сегодняшнего дня — обычный уровень, просто собранный из даты. */
    level(dayKey) {
      const key = dayKey || todayKey();
      const rand = seeded(key);
      const themes = window.LEVELS.map(l => l.theme);
      const scales = ['minor', 'dorian', 'major'];

      /* Сложность плавает день ото дня, но не выходит за разумные рамки:
         заезд дня должен быть проходим и новичком, и без разогрева. */
      return {
        id: 'daily-' + key,
        name: NAMES[Math.floor(rand() * NAMES.length)],
        hint: 'Заезд дня — у всех одинаковый',
        bpm: 96 + Math.floor(rand() * 52),
        beats: 88,
        density: 0.2 + rand() * 0.2,
        holeShare: 0.25 + rand() * 0.35,
        gemRate: 0.45 + rand() * 0.15,
        starRate: 0.08 + rand() * 0.06,
        weave: 0.6 + rand() * 0.3,
        root: Math.floor(rand() * 12),
        scale: scales[Math.floor(rand() * scales.length)],
        chords: [0, Math.floor(rand() * 5) + 3, 5, 7],
        seed: key,
        theme: themes[Math.floor(rand() * themes.length)],
        daily: true
      };
    },

    /** Сыгран ли сегодняшний заезд. */
    playedToday(save) {
      return !!(save.daily && save.daily.date === todayKey());
    },

    /** Награда за прохождение: базовая плюс надбавка за длину серии. */
    reward(streak) {
      return 60 + Math.min(120, (streak - 1) * 15);
    },

    /**
     * Записывает результат. Возвращает, что показать игроку:
     * сколько кристаллов начислено и какой стала серия.
     */
    record(save, result) {
      const today = todayKey();
      const yesterday = todayKey(new Date(Date.now() - 86400000));
      const prev = save.daily || { date: 0, streak: 0, best: 0 };

      /* Серия продолжается только если предыдущий заезд был вчера.
         Повторный заезд в тот же день серию не наращивает. */
      let streak = prev.streak || 0;
      let gems = 0;
      const first = prev.date !== today;
      if (first) {
        streak = prev.date === yesterday ? streak + 1 : 1;
        gems = result.win ? this.reward(streak) : 0;
      }

      save.daily = {
        date: today,
        streak,
        best: prev.date === today ? Math.max(prev.best || 0, result.score) : result.score,
        stars: prev.date === today ? Math.max(prev.stars || 0, result.stars) : result.stars
      };
      return { gems, streak, first };
    }
  };
})();
