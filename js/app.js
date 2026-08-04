/* Экраны, гараж, сохранение прогресса. */
(function () {
  'use strict';

  const $ = sel => document.querySelector(sel);
  const KEY = 'glam-racing-v1';

  /* ---------------- сохранение ---------------- */
  const defaults = {
    gems: 0, best: 0, owned: ['vesta'], car: 'vesta', sound: true, levels: {}, name: '',
    skins: ['base'], skin: 'base'
  };
  let save = Object.assign({}, defaults);
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) save = Object.assign({}, defaults, JSON.parse(raw));
  } catch (e) { /* приватный режим — играем без сохранения */ }
  if (!save.owned.includes('vesta')) save.owned.push('vesta');
  if (!save.levels) save.levels = {};
  if (!save.skins || !save.skins.includes('base')) save.skins = ['base'].concat(save.skins || []);
  const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) {} };

  /* Облако платформы — прогресс переезжает между устройствами.
     Локальное хранилище остаётся ведущим: облако может быть недоступно. */
  let cloudTimer = 0;
  function syncCloud() {
    clearTimeout(cloudTimer);
    cloudTimer = setTimeout(() => window.Platform.cloudSave(JSON.stringify(save)), 400);
  }

  /** Берёт облачный прогресс, если он богаче локального (больше звёзд и кристаллов). */
  async function loadCloud() {
    const raw = await window.Platform.cloudLoad();
    if (!raw) return;
    try {
      const remote = JSON.parse(raw);
      const stars = s => Object.values((s && s.levels) || {}).reduce((n, l) => n + (l.stars || 0), 0);
      const richer = stars(remote) > stars(save) ||
                     (stars(remote) === stars(save) && (remote.gems || 0) > save.gems);
      if (richer) {
        save = Object.assign({}, defaults, remote);
        if (!save.owned.includes('vesta')) save.owned.push('vesta');
        if (!save.levels) save.levels = {};
        persist();
      }
    } catch (e) { console.warn('[cloud] прогресс не разобран', e); }
  }

  /* Уровень открыт, если предыдущий пройден хотя бы на одну звезду. */
  function unlocked(levelId) {
    const i = window.LEVELS.findIndex(l => l.id === levelId);
    if (i <= 0) return true;
    const prev = save.levels[window.LEVELS[i - 1].id];
    return !!(prev && prev.stars > 0);
  }

  const totalStars = () =>
    Object.values(save.levels).reduce((n, l) => n + (l.stars || 0), 0);

  /* ---------------- звук ---------------- */
  let actx = null;
  function beep(freq, dur, type, vol) {
    if (!save.sound) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      if (actx.state === 'suspended') actx.resume();
      const o = actx.createOscillator(), g = actx.createGain();
      o.type = type || 'triangle';
      o.frequency.setValueAtTime(freq, actx.currentTime);
      g.gain.setValueAtTime(vol == null ? 0.06 : vol, actx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + dur);
      o.connect(g); g.connect(actx.destination);
      o.start(); o.stop(actx.currentTime + dur);
    } catch (e) {}
  }

  /* ---------------- экраны ---------------- */
  const screens = {};
  document.querySelectorAll('.screen').forEach(s => screens[s.id.replace('screen-', '')] = s);
  let overlayOpen = null;

  function show(name) {
    Object.values(screens).forEach(s => s.classList.remove('is-active'));
    screens[name].classList.add('is-active');
    overlayOpen = null;
  }
  function overlay(name) {
    screens[name].classList.add('is-active');
    overlayOpen = name;
  }
  function closeOverlay() {
    if (overlayOpen) screens[overlayOpen].classList.remove('is-active');
    overlayOpen = null;
  }

  function toast(text) {
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = text;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2600);
  }

  /* ---------------- загрузка спрайтов ---------------- */
  window.SPRITES = {};
  function loadSprites(done) {
    const ids = window.CARS.map(c => c.id);
    const total = ids.length + 1;
    let loaded = 0;
    const tick = () => {
      loaded++;
      $('#loader-fill').style.width = Math.round(loaded / total * 100) + '%';
      if (loaded >= total) setTimeout(done, 250);
    };
    ids.forEach(id => {
      const img = new Image();
      img.onload = () => { window.SPRITES[id] = img; tick(); };
      img.onerror = tick;                       // без картинки рисуем вектор
      img.src = window.CAR_SPRITE(id);
    });
    const hero = new Image();
    hero.onload = () => {
      $('#hero').style.backgroundImage = 'url(' + hero.src + ')';
      tick();
    };
    hero.onerror = tick;
    hero.src = 'assets/ui/hero.jpg?v=' + window.ASSET_V;
  }

  /* ---------------- иконки предметов ---------------- */
  /* Рисуем их движком, а не эмодзи: ребёнок видит в справке ровно те фигуры,
     что встретит на трассе. Спрайты к этому моменту уже загружены. */
  function paintIcons() {
    const car = window.CAR_BY_ID[save.car] || window.CARS[0];
    document.querySelectorAll('.help-icon').forEach(c =>
      window.Game.renderIcon(c, c.dataset.icon, car));
    window.Game.renderIcon($('#stat-gem-icon'), 'gem');
  }

  /* ---------------- меню ---------------- */
  function renderMenu() {
    const car = window.CAR_BY_ID[save.car] || window.CARS[0];
    $('#menu-best').textContent = save.best.toLocaleString('ru-RU');
    $('#menu-gems').textContent = save.gems.toLocaleString('ru-RU');
    $('#menu-car-name').textContent = car.name;
    $('#menu-car-sub').textContent = car.sub;
    const img = $('#menu-car-img');
    img.src = window.CAR_SPRITE(car.id);
    img.alt = car.name;
    img.style.filter = window.Skins.css(save.skin);
    $('#btn-sound').textContent = save.sound ? '🔊 Звук' : '🔇 Звук';
    paintIcons();
  }

  /* ---------------- гараж ---------------- */
  function statBar(icon, label, value) {
    return '<div class="bar"><span><em>' + icon + '</em>' + label + '</span>' +
           '<i><b style="width:' + (value * 10) + '%"></b></i></div>';
  }

  function renderGarage() {
    $('#garage-gems').textContent = save.gems.toLocaleString('ru-RU') + ' 💎';
    $('#garage-count').textContent = 'Открыто ' + save.owned.length + ' из ' + window.CARS.length;
    const list = $('#garage-list');
    list.innerHTML = '';
    window.CARS.forEach(car => {
      const owned = save.owned.includes(car.id);
      const selected = save.car === car.id;
      const el = document.createElement('div');
      el.className = 'car-card' + (selected ? ' is-selected' : '') + (owned ? '' : ' is-locked');
      el.innerHTML =
        '<div class="car-thumb"><img src="' + window.CAR_SPRITE(car.id) + '" alt="' + car.name + '"></div>' +
        '<div class="car-body">' +
          '<h3 class="car-name">' + car.name +
            (selected ? ' <span class="pill">выбрана</span>' : (owned ? '' : ' <span class="pill">' + car.price + ' 💎</span>')) +
            '<small>' + car.sub + '</small>' +
          '</h3>' +
          '<p class="car-note">' + car.note + '</p>' +
          '<div class="bars">' +
            statBar('🚀', 'Скорость', car.speed) +
            statBar('🎯', 'Поворот', car.handling) +
            statBar('🧲', 'Магнит', car.magnet) +
          '</div>' +
          '<button class="btn car-action">' +
            (selected ? 'Выбрана ✓' : owned ? 'Выбрать' : 'Купить за ' + car.price + ' 💎') +
          '</button>' +
        '</div>';

      const btn = el.querySelector('.car-action');
      if (selected) btn.disabled = true;
      if (!owned && save.gems < car.price) {
        btn.disabled = true;
        btn.textContent = 'Нужно ' + (car.price - save.gems) + ' 💎';
      }
      btn.addEventListener('click', () => {
        if (!save.owned.includes(car.id)) {
          if (save.gems < car.price) return;
          save.gems -= car.price;
          save.owned.push(car.id);
          beep(880, 0.18, 'triangle', 0.08);
          setTimeout(() => beep(1320, 0.22, 'triangle', 0.08), 120);
          toast('Открыта: ' + car.name + ' 🎉');
        } else {
          beep(660, 0.1);
        }
        save.car = car.id;
        persist();
        renderGarage();
        renderMenu();
      });

      list.appendChild(el);
    });
  }

  /* ---------------- скины ---------------- */
  function renderSkins() {
    $('#skins-gems').textContent = save.gems.toLocaleString('ru-RU') + ' 💎';
    const car = window.CAR_BY_ID[save.car] || window.CARS[0];
    const list = $('#skin-list');
    list.innerHTML = '';

    window.SKINS.forEach(skin => {
      const owned = save.skins.includes(skin.id);
      const active = save.skin === skin.id;
      const el = document.createElement('div');
      el.className = 'skin-card' + (active ? ' is-selected' : '') + (owned ? '' : ' is-locked');
      /* Превью — текущая машина игрока под этой окраской: видно, что именно покупаешь.
         Переливающийся скин показываем анимацией, иначе он выглядел бы просто жёлтым. */
      el.innerHTML =
        '<div class="skin-thumb">' +
          (skin.phases
            ? '<img class="is-rainbow" src="' + window.CAR_SPRITE(car.id) + '" alt="">'
            : '<img src="' + window.CAR_SPRITE(car.id) + '" alt="" ' +
              'style="filter:' + (window.Skins.css(skin.id) || 'none') + '">') +
        '</div>' +
        '<div class="skin-body">' +
          '<b>' + skin.name + (active ? ' <span class="pill">на машине</span>' : '') + '</b>' +
          '<span class="skin-note">' + skin.note + '</span>' +
          '<button class="btn skin-action">' +
            (active ? 'Выбран ✓' : owned ? 'Надеть' : 'Купить за ' + skin.price + ' 💎') +
          '</button>' +
        '</div>';

      const btn = el.querySelector('.skin-action');
      if (active) btn.disabled = true;
      if (!owned && save.gems < skin.price) {
        btn.disabled = true;
        btn.textContent = 'Нужно ' + (skin.price - save.gems) + ' 💎';
      }
      btn.addEventListener('click', () => {
        if (!save.skins.includes(skin.id)) {
          if (save.gems < skin.price) return;
          save.gems -= skin.price;
          save.skins.push(skin.id);
          beep(880, 0.18, 'triangle', 0.08);
          setTimeout(() => beep(1320, 0.22, 'triangle', 0.08), 120);
          toast('Открыт скин: ' + skin.name + ' ✨');
        } else {
          beep(660, 0.1);
        }
        save.skin = skin.id;
        persist(); syncCloud();
        renderSkins(); renderMenu();
      });

      list.appendChild(el);
    });
  }

  /* ---------------- уровни ---------------- */
  function renderLevels() {
    $('#levels-stars').textContent = totalStars() + ' ⭐';
    const list = $('#level-list');
    list.innerHTML = '';

    window.LEVELS.forEach((level, i) => {
      const done = save.levels[level.id];
      const open = unlocked(level.id);
      const rival = window.Ghosts.rival(level.id);
      const el = document.createElement('div');
      el.className = 'level-card' + (open ? '' : ' is-locked') + (done && done.stars ? ' is-done' : '');
      el.style.setProperty('--lv', level.theme.kerb);
      el.innerHTML =
        '<div class="level-num">' + (open ? (i + 1) : '🔒') + '</div>' +
        '<div class="level-body">' +
          '<b>' + level.name + '</b>' +
          '<span class="level-hint">' + (open ? level.hint : 'Пройди предыдущий уровень') + '</span>' +
          '<span class="level-meta">♪ ' + level.bpm + ' BPM' +
            (rival ? ' · 👻 ' + rival.name : '') + '</span>' +
        '</div>' +
        '<div class="level-stars">' +
          '⭐'.repeat(done ? done.stars : 0) + '☆'.repeat(3 - (done ? done.stars : 0)) +
        '</div>';

      if (open) el.addEventListener('click', () => { closeOverlay(); startRace(level); });
      list.appendChild(el);
    });
  }

  /* ---------------- игра ---------------- */
  const canvas = $('#canvas');
  window.Game.init(canvas);

  const hudScore = $('#hud-score'), hudGems = $('#hud-gems'),
        hudLives = $('#hud-lives'), hudSpeed = $('#hud-speed'),
        boostFlash = $('#boost-flash'), touchHint = $('#touch-hint');

  const trackFill = $('#track-fill');

  window.Game.onHud = s => {
    hudScore.textContent = s.score.toLocaleString('ru-RU');
    hudGems.textContent = s.mode === 'level'
      ? s.gems + ' / ' + s.totalGems + ' 💎'
      : s.gems + ' 💎';
    hudLives.textContent = '💖'.repeat(Math.max(0, s.lives));
    hudSpeed.textContent = s.speed;
    boostFlash.classList.toggle('on', s.boost);
    if (s.mode === 'level') trackFill.style.width = (s.progress * 100).toFixed(1) + '%';
  };
  window.Game.onTouchStart = () => touchHint.classList.add('hidden');
  window.Game.onPickup = type => {
    if (type === 'gem') beep(1100, 0.07, 'triangle', 0.05);
    else if (type === 'star') { beep(880, 0.1); setTimeout(() => beep(1320, 0.16), 90); }
    else beep(760, 0.16, 'sine', 0.08);
  };
  window.Game.onCrash = () => beep(140, 0.28, 'sawtooth', 0.09);

  let lastGhost = null;          // призрак только что пройденного уровня — для вызова друга

  window.Game.onOver = res => {
    save.gems += res.gems;
    persist();
    const levelRun = !!res.level;

    if (levelRun) onLevelFinished(res);
    else {
      const record = res.score > save.best;
      if (record) save.best = res.score;
      persist();
      $('#over-emoji').textContent = record ? '👑' : '🏁';
      $('#over-title').textContent = record ? 'Новый рекорд!' : 'Заезд окончен';
      $('#over-stars').hidden = true;
      $('#btn-next').hidden = true;
      $('#btn-challenge').hidden = true;
      $('#over-score').textContent = res.score.toLocaleString('ru-RU');
      $('#over-line').textContent = 'Собрано ' + res.gems + ' 💎 · дистанция ' + res.dist + ' м';
      beep(record ? 660 : 300, 0.3, record ? 'triangle' : 'sine', 0.08);
      if (record) setTimeout(() => beep(990, 0.35, 'triangle', 0.08), 200);
      window.Platform.submitScore('endless', res.score);
    }
    syncCloud();
    overlay('over');
  };

  /** Итог уровня: звёзды, разблокировка следующего, сохранение призрака. */
  function onLevelFinished(res) {
    const prev = save.levels[res.level] || { stars: 0, score: 0 };
    const idx = window.LEVELS.findIndex(l => l.id === res.level);

    if (res.win) {
      save.levels[res.level] = {
        stars: Math.max(prev.stars, res.stars),
        score: Math.max(prev.score, res.score)
      };
      /* Призрака держим только за лучший заезд — с ним и поедет следующая попытка. */
      if (res.ghost && res.score >= prev.score) {
        res.ghost.name = playerName();
        window.Ghosts.save(res.level, res.ghost);
        lastGhost = res.ghost;
      }
      persist();
      window.Platform.submitScore('level_' + res.level, res.score);
    }

    const next = window.LEVELS[idx + 1];
    $('#over-emoji').textContent = res.win ? (res.stars === 3 ? '🌟' : '🏁') : '💔';
    $('#over-title').textContent = res.win ? 'Уровень пройден!' : 'Не доехала…';
    $('#over-stars').hidden = false;
    $('#over-stars').textContent = '⭐'.repeat(res.stars) + '☆'.repeat(3 - res.stars);
    $('#over-score').textContent = res.score.toLocaleString('ru-RU');
    $('#over-line').textContent = res.win
      ? 'Кристаллы: ' + res.gems + ' из ' + res.totalGems
      : 'Собрано ' + res.gems + ' 💎 — попробуй ещё раз';
    $('#btn-next').hidden = !(res.win && next && unlocked(next.id));
    $('#btn-challenge').hidden = !(res.win && lastGhost);
    nextLevelId = next ? next.id : null;
  }

  let nextLevelId = null;

  function playerName() {
    return window.Platform.getUserName() || save.name || 'Ты';
  }

  let currentLevel = null;

  function startRace(level) {
    const car = window.CAR_BY_ID[save.car] || window.CARS[0];
    currentLevel = level || null;
    show('game');
    window.Game.playerName = playerName();
    touchHint.classList.remove('hidden');
    setTimeout(() => touchHint.classList.add('hidden'), 3200);
    const bar = $('#track-bar');
    bar.hidden = !level;
    if (level) $('#track-name').textContent = level.name + ' · ' + level.bpm + ' BPM';
    window.Music.setMuted(!save.sound);
    requestAnimationFrame(() => window.Game.start(car, level, save.skin));
    beep(520, 0.1); setTimeout(() => beep(780, 0.14), 110);
  }

  function quitToMenu() {
    window.Game.stop();
    window.Music.stop();
    closeOverlay();
    renderMenu();
    show('menu');
  }

  /* ---------------- события ---------------- */
  $('#btn-play').addEventListener('click', () => startRace(null));
  $('#btn-levels').addEventListener('click', () => { renderLevels(); show('levels'); });
  $('#btn-garage').addEventListener('click', () => { renderGarage(); show('garage'); });
  $('#btn-skins').addEventListener('click', () => { renderSkins(); show('skins'); });
  /* Со скинов возвращаемся в гараж — оттуда сюда и пришли. */
  $('#btn-skins-back').addEventListener('click', () => { renderGarage(); show('garage'); });
  $('#btn-help').addEventListener('click', () => show('help'));
  $('#btn-sound').addEventListener('click', () => {
    save.sound = !save.sound; persist(); renderMenu();
    window.Music.setMuted(!save.sound);
    beep(700, 0.1);
  });

  $('#btn-next').addEventListener('click', () => {
    const level = window.LEVEL_BY_ID[nextLevelId];
    if (level) { closeOverlay(); startRace(level); }
  });

  /* Вызов друга: ссылка с записью заезда. Открывший её поедет против призрака. */
  $('#btn-challenge').addEventListener('click', async () => {
    if (!lastGhost) return;
    const link = window.Ghosts.challengeLink(lastGhost);
    const text = 'Обгони меня в Glam Racing! Мой результат: ' + lastGhost.score;
    const res = await window.Platform.shareLink(link, text);
    if (res === 'copied') toast('Ссылка скопирована 👻');
    else if (!res) {
      try { await navigator.clipboard.writeText(link); toast('Ссылка скопирована 👻'); }
      catch (e) { toast('Не получилось поделиться'); }
    }
  });
  document.querySelectorAll('[data-back]').forEach(b =>
    b.addEventListener('click', () => { renderMenu(); show('menu'); }));

  const pauseRace = () => { window.Game.pause(); window.Music.pause(); overlay('pause'); };
  const resumeRace = () => { closeOverlay(); window.Music.resume(); window.Game.resume(); };
  $('#btn-pause').addEventListener('click', pauseRace);
  $('#btn-resume').addEventListener('click', resumeRace);
  $('#btn-quit').addEventListener('click', quitToMenu);

  $('#btn-again').addEventListener('click', () => { closeOverlay(); startRace(currentLevel); });
  $('#btn-over-menu').addEventListener('click', quitToMenu);
  $('#btn-over-garage').addEventListener('click', () => {
    window.Game.stop(); closeOverlay(); renderGarage(); show('garage');
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && window.Game.running && !window.Game.paused) pauseRace();
  });
  window.addEventListener('keydown', e => {
    if (e.key === 'Escape' && window.Game.running) {
      if (window.Game.paused) resumeRace(); else pauseRace();
    }
  });

  /* ---------------- старт ----------------
     Порядок важен: сперва платформа (она даёт имя игрока и облачный прогресс),
     потом картинки, и только затем говорим платформе, что игра готова. */
  renderMenu();

  const challenge = window.Ghosts.fromUrl();

  (async () => {
    try { await window.Platform.init(); } catch (e) {}
    try { await loadCloud(); } catch (e) {}
    if (!save.name) { save.name = window.Platform.getUserName(); persist(); }
    renderMenu();
    loadSprites(() => {
      renderMenu();
      window.Platform.notifyGameReady();
      if (challenge && window.LEVEL_BY_ID[challenge.level]) {
        /* Пришли по ссылке-вызову: открываем список уровней и подсвечиваем нужный. */
        renderLevels();
        show('levels');
        toast('Тебя вызвал ' + challenge.name + ' 👻');
      } else {
        show('menu');
      }
    });
  })();
})();
