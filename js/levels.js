/* Уровни: заезд на длину трека, всё появляется строго по долям такта.

   Трасса не рисуется руками по клеточкам, а собирается из параметров уровня
   детерминированно по seed: один и тот же уровень всегда одинаковый, но
   переписывать сотни строк разметки не нужно.

   Проходимость гарантируется built-in: свободная полоса смещается не больше
   чем на одну за долю, поэтому её всегда успеваешь достать. */
(function () {
  'use strict';

  const LANES = 4;

  const seeded = seed => {
    let s = (seed >>> 0) || 1;
    return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  };

  /* theme — окраска трассы: небо сверху, небо снизу, полотно, бордюр. */
  window.LEVELS = [
    {
      id: 'l1', name: 'Розовый рассвет', hint: 'Спокойный разгон под мягкий бит',
      bpm: 92, beats: 64, density: 0.16, holeShare: 0.25, gemRate: 0.55,
      root: 4, scale: 'minor', chords: [0, 0, 5, 7], seed: 1011,
      theme: { skyTop: '#33124d', skyBottom: '#b0447c', road: '#3a2551', kerb: '#ff5fa2' }
    },
    {
      id: 'l2', name: 'Неоновый бульвар', hint: 'Кристаллов много — собирай всё',
      bpm: 100, beats: 72, density: 0.20, holeShare: 0.3, gemRate: 0.6,
      root: 2, scale: 'minor', chords: [0, 5, 3, 7], seed: 2022,
      theme: { skyTop: '#241046', skyBottom: '#7c3fb0', road: '#33224d', kerb: '#7ee8c4' }
    },
    {
      id: 'l3', name: 'Сахарный поворот', hint: 'Появляются ямы одна за другой',
      bpm: 108, beats: 80, density: 0.24, holeShare: 0.45, gemRate: 0.5,
      root: 7, scale: 'dorian', chords: [0, 3, 5, 3], seed: 3033,
      theme: { skyTop: '#3d1030', skyBottom: '#d2618a', road: '#43213f', kerb: '#ffd166' }
    },
    {
      id: 'l4', name: 'Ночная набережная', hint: 'Темп выше, коридор уже',
      bpm: 116, beats: 88, density: 0.28, holeShare: 0.35, gemRate: 0.5,
      root: 0, scale: 'minor', chords: [0, 7, 5, 3], seed: 4044,
      theme: { skyTop: '#141033', skyBottom: '#4a3aa8', road: '#241f4a', kerb: '#8fb6ff' }
    },
    {
      id: 'l5', name: 'Мятный проспект', hint: 'Звёзды выпадают чаще — лови ускорение',
      bpm: 122, beats: 88, density: 0.30, holeShare: 0.4, gemRate: 0.45, starRate: 0.14,
      root: 5, scale: 'dorian', chords: [0, 5, 7, 5], seed: 5055,
      theme: { skyTop: '#0f2e2a', skyBottom: '#3fb0a0', road: '#1f3f45', kerb: '#7ee8c4' }
    },
    {
      id: 'l6', name: 'Золотая миля', hint: 'Плотный трафик и быстрый бит',
      bpm: 128, beats: 96, density: 0.34, holeShare: 0.3, gemRate: 0.45,
      root: 9, scale: 'minor', chords: [0, 3, 7, 10], seed: 6066,
      theme: { skyTop: '#3a2a08', skyBottom: '#d9a441', road: '#43351a', kerb: '#ffd166' }
    },
    {
      id: 'l7', name: 'Фиолетовый тоннель', hint: 'Ям больше, чем машин',
      bpm: 132, beats: 96, density: 0.36, holeShare: 0.6, gemRate: 0.4,
      root: 3, scale: 'minor', chords: [0, 5, 3, 7], seed: 7077,
      theme: { skyTop: '#1b0b33', skyBottom: '#6b2fb0', road: '#2a1a4d', kerb: '#c39bff' }
    },
    {
      id: 'l8', name: 'Карамельный вихрь', hint: 'Коридор виляет из стороны в сторону',
      bpm: 138, beats: 104, density: 0.38, holeShare: 0.4, gemRate: 0.42, weave: 0.85,
      root: 11, scale: 'dorian', chords: [0, 7, 3, 5], seed: 8088,
      theme: { skyTop: '#3d0f22', skyBottom: '#e0658f', road: '#45203a', kerb: '#ff9ecd' }
    },
    {
      id: 'l9', name: 'Ледяная трасса', hint: 'Быстро и скользко — держи ритм',
      bpm: 142, beats: 104, density: 0.40, holeShare: 0.5, gemRate: 0.4,
      root: 1, scale: 'minor', chords: [0, 3, 5, 7], seed: 9099,
      theme: { skyTop: '#0d2440', skyBottom: '#4aa8d9', road: '#1c3350', kerb: '#a8e0ff' }
    },
    {
      id: 'l10', name: 'Огни мегаполиса', hint: 'Почти нет пауз между рядами',
      bpm: 146, beats: 112, density: 0.44, holeShare: 0.35, gemRate: 0.38,
      root: 6, scale: 'minor', chords: [0, 5, 10, 7], seed: 10110,
      theme: { skyTop: '#2a0a2e', skyBottom: '#c23f7a', road: '#381c44', kerb: '#ff5fa2' }
    },
    {
      id: 'l11', name: 'Алмазная гонка', hint: 'Максимум кристаллов на максимальной скорости',
      bpm: 150, beats: 120, density: 0.42, holeShare: 0.45, gemRate: 0.55, starRate: 0.12,
      root: 8, scale: 'dorian', chords: [0, 7, 5, 3], seed: 11121,
      theme: { skyTop: '#10203a', skyBottom: '#7ad0e0', road: '#1e3348', kerb: '#ffffff' }
    },
    {
      id: 'l12', name: 'Финальный блеск', hint: 'Всё сразу. Последний рубеж',
      bpm: 156, beats: 128, density: 0.48, holeShare: 0.45, gemRate: 0.4, starRate: 0.12, weave: 0.9,
      root: 4, scale: 'minor', chords: [0, 3, 7, 10], seed: 12131,
      theme: { skyTop: '#33061f', skyBottom: '#ff5f8f', road: '#40142f', kerb: '#ffd166' }
    }
  ];

  window.LEVEL_BY_ID = Object.fromEntries(window.LEVELS.map(l => [l.id, l]));

  /**
   * Раскладка уровня по долям такта.
   * Возвращает массив длиной level.beats; каждый элемент — что приходит к игроку на этой доле:
   *   { items: [{ kind, type, lane, rel }] }
   *
   * rel — доля скорости игрока: попутная машина едет сама, поэтому сближается медленнее,
   * и выпускать её нужно раньше. Значение фиксируется здесь, чтобы движок знал заранее,
   * за сколько долей до ноты выпускать объект.
   *
   * Последние доли оставлены пустыми — это подъезд к финишу.
   */
  window.buildLevelPattern = function (level) {
    const rand = seeded(level.seed);
    const steps = [];
    const weave = level.weave || 0.6;          // насколько охотно коридор виляет
    const starRate = level.starRate || 0.07;
    const heartRate = 0.05;
    let free = 1 + Math.floor(rand() * 2);     // текущая свободная полоса
    let lastBusy = -1;                         // на предыдущей доле полоса была занята?
    /* Когда в полосе последний раз шла попутная машина. Они едут с разной скоростью,
       поэтому две подряд в одной полосе могут догнать друг друга — разводим их по времени. */
    const lastCar = new Array(LANES).fill(-99);

    for (let i = 0; i < level.beats; i++) {
      const step = { items: [] };

      /* Первые четыре доли — вступление: игрок слышит бит и готовится. */
      const intro = i < 4;
      /* Последние восемь — финишная прямая без препятствий. */
      const outro = i >= level.beats - 8;

      /* Коридор смещается максимум на одну полосу за долю. */
      if (rand() < weave) {
        const dir = rand() < 0.5 ? -1 : 1;
        const next = free + dir;
        if (next >= 0 && next < LANES) free = next;
      }
      /* Вторая свободная полоса рядом — вдвоём они дают запас на ошибку. */
      const neighbours = [free - 1, free + 1].filter(l => l >= 0 && l < LANES);
      const free2 = neighbours[Math.floor(rand() * neighbours.length)];

      for (let lane = 0; lane < LANES; lane++) {
        if (lane === free || lane === free2) {
          if (intro) continue;
          if (rand() < level.gemRate) step.items.push({ kind: 'pickup', type: 'gem', lane, rel: 0 });
          else if (rand() < starRate) step.items.push({ kind: 'pickup', type: 'star', lane, rel: 0 });
          else if (rand() < heartRate) step.items.push({ kind: 'pickup', type: 'heart', lane, rel: 0 });
          continue;
        }
        if (intro || outro) continue;
        /* Две доли подряд полностью забитыми не делаем — иначе читать трассу нечем. */
        if (lastBusy === i - 1 && rand() < 0.5) continue;
        if (rand() < level.density * 2.2) {
          /* В этой полосе недавно проехала машина — ставим яму, она никого не догонит. */
          const hole = rand() < level.holeShare || i - lastCar[lane] < 4;
          if (!hole) lastCar[lane] = i;
          step.items.push({
            kind: 'block',
            type: hole ? 'hole' : 'traffic',
            lane,
            /* Яма — часть асфальта и стоит на месте, машина едет своим ходом. */
            rel: hole ? 0 : 0.28 + rand() * 0.22,
            sprite: Math.floor(rand() * 1e6),
            shape: hole ? Array.from({ length: 11 }, () => 0.72 + rand() * 0.4) : null,
            squash: 0.62 + rand() * 0.2,
            radius: 0.24 + rand() * 0.07
          });
          lastBusy = i;
        }
      }

      steps.push(step);
    }
    return steps;
  };

  /** Сколько кристаллов всего на уровне — по нему считаются звёзды. */
  window.countLevelGems = function (pattern) {
    let n = 0;
    for (const s of pattern) for (const it of s.items) if (it.type === 'gem') n++;
    return n;
  };

  /** Самая медленная попутная машина — по ней движок считает, как далеко смотреть вперёд. */
  window.MAX_TRAFFIC_REL = 0.5;

  /** Звёзды за заезд: 1 — доехал, 2 — половина кристаллов, 3 — почти всё и без потерь. */
  window.levelStars = function (gems, totalGems, livesLeft) {
    if (totalGems <= 0) return 1;
    const share = gems / totalGems;
    if (share >= 0.85 && livesLeft >= 3) return 3;
    if (share >= 0.5) return 2;
    return 1;
  };
})();
