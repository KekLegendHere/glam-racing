/* Достижения: длинные цели, которые видно с первого дня.

   Каждое — это условие над сохранением плюс награда кристаллами. Проверка идёт
   по всему списку после любого заезда и любой покупки, поэтому достижение
   засчитается даже если условие выполнилось «задним числом» — например, после
   переноса прогресса из облака.

   `progress` возвращает пару «сделано / нужно», чтобы в списке была видна не
   только галочка, но и то, сколько осталось. */
(function () {
  'use strict';

  const stars = save => Object.values(save.levels || {}).reduce((n, l) => n + (l.stars || 0), 0);
  const tuned = save => Object.values(save.upgrades || {})
    .reduce((n, u) => n + Object.values(u).reduce((m, v) => m + v, 0), 0);

  window.ACHIEVEMENTS = [
    { id: 'first_ride', icon: '🏁', name: 'Первый заезд', note: 'Проехать любой уровень',
      reward: 50, goal: 1, done: s => stars(s) >= 1 ? 1 : 0 },
    { id: 'three_levels', icon: '🛣️', name: 'Разгон', note: 'Пройти три уровня',
      reward: 100, goal: 3, done: s => Object.keys(s.levels || {}).length },
    { id: 'perfect', icon: '🌟', name: 'Безупречно', note: 'Взять три звезды на уровне',
      reward: 150, goal: 1, done: s => Object.values(s.levels || {}).some(l => l.stars === 3) ? 1 : 0 },
    { id: 'half_stars', icon: '✨', name: 'Звёздный сбор', note: 'Собрать 18 звёзд',
      reward: 250, goal: 18, done: s => stars(s) },
    { id: 'all_levels', icon: '👑', name: 'Вся трасса', note: 'Пройти все двенадцать уровней',
      reward: 600, goal: 12, done: s => Object.keys(s.levels || {}).length },

    { id: 'garage3', icon: '🚗', name: 'Три ключа', note: 'Иметь три машины',
      reward: 100, goal: 3, done: s => (s.owned || []).length },
    { id: 'garage10', icon: '🏆', name: 'Коллекционер', note: 'Иметь десять машин',
      reward: 400, goal: 10, done: s => (s.owned || []).length },
    { id: 'skin3', icon: '🎨', name: 'Модница', note: 'Открыть три скина',
      reward: 200, goal: 3, done: s => (s.skins || []).length },
    { id: 'full_tune', icon: '🔧', name: 'Полный тюнинг', note: 'Выкупить девять улучшений одной машине',
      reward: 300, goal: 9,
      done: s => Math.max(0, ...Object.values(s.upgrades || {})
        .map(u => Object.values(u).reduce((m, v) => m + v, 0))) },
    { id: 'tuner', icon: '⚙️', name: 'Механик', note: 'Купить двадцать улучшений всего',
      reward: 350, goal: 20, done: s => tuned(s) },

    { id: 'daily1', icon: '📅', name: 'Заглянула', note: 'Проехать заезд дня',
      reward: 80, goal: 1, done: s => (s.daily && s.daily.streak) ? 1 : 0 },
    { id: 'daily3', icon: '🔥', name: 'Три дня подряд', note: 'Серия заездов дня — три дня',
      reward: 250, goal: 3, done: s => (s.daily && s.daily.streak) || 0 },
    { id: 'daily7', icon: '💎', name: 'Неделя блеска', note: 'Серия заездов дня — семь дней',
      reward: 700, goal: 7, done: s => (s.daily && s.daily.streak) || 0 },

    { id: 'score5k', icon: '📈', name: 'Пять тысяч', note: 'Набрать 5000 очков за заезд',
      reward: 200, goal: 5000, done: s => s.best || 0 },
    { id: 'chase', icon: '😼', name: 'Не догнала', note: 'Продержаться минуту в погоне',
      reward: 300, goal: 60, done: s => Math.floor(s.chaseBest || 0) }
  ];

  window.Achievements = {
    /** Сделано / нужно по конкретному достижению. */
    progress(save, a) {
      return { done: Math.min(a.goal, a.done(save) || 0), goal: a.goal };
    },

    unlocked(save, id) {
      return !!(save.achievements && save.achievements.includes(id));
    },

    /**
     * Отмечает всё, что выполнено, и начисляет награды.
     * Возвращает список только что открытых — их показываем всплывашкой.
     */
    check(save) {
      if (!save.achievements) save.achievements = [];
      const fresh = [];
      for (const a of window.ACHIEVEMENTS) {
        if (this.unlocked(save, a.id)) continue;
        if ((a.done(save) || 0) >= a.goal) {
          save.achievements.push(a.id);
          save.gems += a.reward;
          fresh.push(a);
        }
      }
      return fresh;
    },

    total() { return window.ACHIEVEMENTS.length; },
    count(save) { return (save.achievements || []).length; }
  };
})();
