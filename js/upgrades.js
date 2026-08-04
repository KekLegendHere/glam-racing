/* Прокачка машин: за кристаллы каждой характеристике можно добавить до трёх уровней.

   Потолок специально небольшой. Прокачанная Семёрка должна догонять заводской
   Мустанг, но не превращаться в Аурус — иначе покупать дорогие машины станет
   незачем, а гараж и есть главная цель игры.

   Улучшения хранятся отдельно от каталога: `save.upgrades[carId]`. Каталог
   остаётся описанием заводских характеристик и не меняется. */
(function () {
  'use strict';

  const MAX_LEVEL = 3;

  const STATS = [
    { id: 'speed', name: 'Скорость', icon: '🚀', note: 'Быстрее едет и больше очков за путь' },
    { id: 'handling', name: 'Поворот', icon: '🎯', note: 'Резче слушается пальца' },
    { id: 'magnet', name: 'Магнит', icon: '🧲', note: 'Дальше притягивает кристаллы' }
  ];

  window.Upgrades = {
    MAX_LEVEL,
    STATS,

    /** Сколько уровней уже куплено для характеристики. */
    level(save, carId, stat) {
      const u = save.upgrades && save.upgrades[carId];
      return (u && u[stat]) || 0;
    },

    /** Итоговое значение характеристики с учётом прокачки. */
    value(save, car, stat) {
      return (car[stat] || 0) + this.level(save, car.id, stat);
    },

    /**
     * Цена следующего уровня. Зависит от класса машины: доводить топовую машину
     * дороже, чем стартовую, иначе прокачка Ауруса стоила бы как пара кристаллов.
     */
    price(car, level) {
      if (level >= MAX_LEVEL) return null;
      const base = 120 + Math.round(car.price * 0.14);
      return Math.round(base * (level + 1) / 10) * 10;
    },

    /** Всё ли куплено — по такой машине в гараже рисуется отметка. */
    maxed(save, carId) {
      return STATS.every(s => this.level(save, carId, s.id) >= MAX_LEVEL);
    },

    /** Сколько уровней куплено всего — для подписи в гараже. */
    totalLevels(save, carId) {
      return STATS.reduce((n, s) => n + this.level(save, carId, s.id), 0);
    },

    /**
     * Копия машины с применённой прокачкой — именно её получает движок.
     * Каталог при этом не трогается: там заводские значения.
     */
    tuned(save, car) {
      const out = Object.assign({}, car);
      for (const s of STATS) out[s.id] = this.value(save, car, s.id);
      return out;
    },

    /** Покупка уровня. Возвращает true, если хватило кристаллов. */
    buy(save, car, stat) {
      const lvl = this.level(save, car.id, stat);
      const cost = this.price(car, lvl);
      if (cost == null || save.gems < cost) return false;
      if (!save.upgrades) save.upgrades = {};
      if (!save.upgrades[car.id]) save.upgrades[car.id] = {};
      save.upgrades[car.id][stat] = lvl + 1;
      save.gems -= cost;
      return true;
    }
  };
})();
