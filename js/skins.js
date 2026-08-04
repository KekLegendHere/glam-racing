/* Скины — окраски, которые применяются к любой машине из гаража.

   Скин описан строкой CSS-фильтра. Одна и та же строка работает и в разметке
   (`filter` у картинки), и на холсте (`ctx.filter`), поэтому превью в гараже
   и машина на трассе выглядят одинаково — без отдельных наборов картинок.

   Перекрашенный спрайт запекается один раз в отдельный холст и дальше рисуется
   как обычная картинка: применять фильтр на каждом кадре слишком дорого. */
(function () {
  'use strict';

  /* Машины покрашены по-разному, поэтому просто повернуть оттенок нельзя: от голубой
     Тройки и от розовой Весты один и тот же поворот даёт разные цвета. Сначала сводим
     краску к общей основе (`grayscale` + `sepia` дают монотон с оттенком около 35°),
     и уже от неё отсчитываем нужный тон — тогда скин выглядит одинаково на любой машине. */
  const BASE = 'grayscale(1) sepia(1) ';
  const paint = (hue, sat, bright) =>
    BASE + 'hue-rotate(' + (hue - 35) + 'deg) saturate(' + sat + ') brightness(' + bright + ')';

  window.SKINS = [
    {
      id: 'base', name: 'Родной цвет', price: 0, filter: 'none',
      note: 'Заводская окраска — как машина выглядит в гараже.'
    },
    {
      id: 'candy', name: 'Розовая карамель', price: 200,
      filter: paint(330, 5, 1.05),
      note: 'Тот самый глянцевый розовый.'
    },
    {
      id: 'mint', name: 'Мятный лёд', price: 300,
      filter: paint(155, 3.4, 1.12),
      note: 'Прохладный мятный с лёгким блеском.'
    },
    {
      id: 'lavender', name: 'Лавандовое поле', price: 400,
      filter: paint(268, 3.2, 1.08),
      note: 'Нежный сиреневый на каждый день.'
    },
    {
      id: 'sunset', name: 'Закатный апельсин', price: 550,
      filter: paint(22, 4.6, 1.06),
      note: 'Тёплый оранжевый с золотым отливом.'
    },
    {
      id: 'chrome', name: 'Хром', price: 750,
      filter: 'grayscale(1) contrast(1.25) brightness(1.2)',
      note: 'Зеркальное серебро без единого цвета.'
    },
    {
      id: 'gold', name: 'Червонное золото', price: 1000,
      filter: paint(45, 3.6, 1.12),
      note: 'Тяжёлое золото. Видно с другого конца трассы.'
    },
    {
      id: 'pearl', name: 'Чёрный жемчуг', price: 1300,
      filter: 'grayscale(1) brightness(0.42) contrast(1.3)',
      note: 'Глубокий тёмный лак с перламутром.'
    },
    {
      id: 'neon', name: 'Кислотный неон', price: 1700,
      filter: paint(295, 9, 1.18),
      note: 'Цвет выкручен до предела.',
      glow: '#ff5fa2'
    },
    {
      id: 'rainbow', name: 'Радужный перелив', price: 2500,
      filter: BASE + 'saturate(4.5) brightness(1.08)',
      note: 'Цвет плавно переливается прямо на ходу.',
      /* Радуга не статична: спрайт запекается несколькими фазами оттенка
         и на трассе они листаются по кругу. */
      phases: 12
    }
  ];

  window.SKIN_BY_ID = Object.fromEntries(window.SKINS.map(s => [s.id, s]));

  const cache = new Map();
  /** Поддержку фильтров на холсте проверяем один раз: в старых Safari его нет. */
  let canFilter = null;
  function filterSupported() {
    if (canFilter === null) {
      try {
        const c = document.createElement('canvas').getContext('2d');
        c.filter = 'brightness(1.2)';
        canFilter = c.filter === 'brightness(1.2)';
      } catch (e) { canFilter = false; }
    }
    return canFilter;
  }

  function bake(img, filter, hueShift) {
    const size = 256;                     // на трассе машина мельче, больше не нужно
    const cv = document.createElement('canvas');
    cv.width = cv.height = size;
    const ctx = cv.getContext('2d');
    const extra = hueShift ? ' hue-rotate(' + hueShift + 'deg)' : '';
    ctx.filter = filter === 'none' ? (extra || 'none') : filter + extra;
    ctx.drawImage(img, 0, 0, size, size);
    return cv;
  }

  window.Skins = {
    /**
     * Картинка машины с наложенным скином. Возвращает исходный спрайт, если
     * скин обычный или браузер не умеет фильтровать холст.
     * time — секунды с начала заезда, нужны только переливающимся скинам.
     */
    sprite(img, skinId, time) {
      const skin = window.SKIN_BY_ID[skinId];
      if (!img || !skin || skin.id === 'base' || !filterSupported()) return img;

      let phase = 0;
      if (skin.phases) phase = Math.floor((time || 0) * 6) % skin.phases;

      const key = (img.src || 'img') + '|' + skin.id + '|' + phase;
      let baked = cache.get(key);
      if (!baked) {
        const hue = skin.phases ? Math.round(360 / skin.phases * phase) : 0;
        baked = bake(img, skin.filter, hue);
        cache.set(key, baked);
      }
      return baked;
    },

    /** Свечение вокруг машины — есть только у неона. */
    glow(skinId) {
      const skin = window.SKIN_BY_ID[skinId];
      return skin && skin.glow ? skin.glow : null;
    },

    /** Строка для атрибута style — превью в меню и гараже. */
    css(skinId) {
      const skin = window.SKIN_BY_ID[skinId];
      return skin && skin.filter !== 'none' ? skin.filter : '';
    }
  };
})();
