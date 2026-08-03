/* Экраны, гараж, сохранение прогресса. */
(function () {
  'use strict';

  const $ = sel => document.querySelector(sel);
  const KEY = 'glam-racing-v1';

  /* ---------------- сохранение ---------------- */
  const defaults = { gems: 0, best: 0, owned: ['vesta'], car: 'vesta', sound: true };
  let save = Object.assign({}, defaults);
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) save = Object.assign({}, defaults, JSON.parse(raw));
  } catch (e) { /* приватный режим — играем без сохранения */ }
  if (!save.owned.includes('vesta')) save.owned.push('vesta');
  const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) {} };

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

  /* ---------------- меню ---------------- */
  function renderMenu() {
    const car = window.CAR_BY_ID[save.car] || window.CARS[0];
    $('#menu-best').textContent = save.best.toLocaleString('ru-RU');
    $('#menu-gems').textContent = save.gems.toLocaleString('ru-RU') + ' 💎';
    $('#menu-car-name').textContent = car.name;
    $('#menu-car-sub').textContent = car.sub;
    const img = $('#menu-car-img');
    img.src = window.CAR_SPRITE(car.id);
    img.alt = car.name;
    $('#btn-sound').textContent = save.sound ? '🔊 Звук: вкл' : '🔇 Звук: выкл';
  }

  /* ---------------- гараж ---------------- */
  function statBar(label, value) {
    return '<div class="bar"><span>' + label + '</span><i><b style="width:' + (value * 10) + '%"></b></i></div>';
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
            statBar('Скорость', car.speed) +
            statBar('Управление', car.handling) +
            statBar('Магнит', car.magnet) +
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

  /* ---------------- игра ---------------- */
  const canvas = $('#canvas');
  window.Game.init(canvas);

  const hudScore = $('#hud-score'), hudGems = $('#hud-gems'),
        hudLives = $('#hud-lives'), hudSpeed = $('#hud-speed'),
        boostFlash = $('#boost-flash'), touchHint = $('#touch-hint');

  window.Game.onHud = s => {
    hudScore.textContent = s.score.toLocaleString('ru-RU');
    hudGems.textContent = s.gems + ' 💎';
    hudLives.textContent = '💖'.repeat(Math.max(0, s.lives));
    hudSpeed.textContent = s.speed;
    boostFlash.classList.toggle('on', s.boost);
  };
  window.Game.onTouchStart = () => touchHint.classList.add('hidden');
  window.Game.onPickup = type => {
    if (type === 'gem') beep(1100, 0.07, 'triangle', 0.05);
    else if (type === 'star') { beep(880, 0.1); setTimeout(() => beep(1320, 0.16), 90); }
    else beep(760, 0.16, 'sine', 0.08);
  };
  window.Game.onCrash = () => beep(140, 0.28, 'sawtooth', 0.09);

  window.Game.onOver = res => {
    save.gems += res.gems;
    const record = res.score > save.best;
    if (record) save.best = res.score;
    persist();
    $('#over-emoji').textContent = record ? '👑' : '🏁';
    $('#over-title').textContent = record ? 'Новый рекорд!' : 'Заезд окончен';
    $('#over-score').textContent = res.score.toLocaleString('ru-RU');
    $('#over-line').textContent = 'Собрано ' + res.gems + ' 💎 · дистанция ' + res.dist + ' м';
    overlay('over');
    beep(record ? 660 : 300, 0.3, record ? 'triangle' : 'sine', 0.08);
    if (record) setTimeout(() => beep(990, 0.35, 'triangle', 0.08), 200);
  };

  function startRace() {
    const car = window.CAR_BY_ID[save.car] || window.CARS[0];
    show('game');
    touchHint.classList.remove('hidden');
    setTimeout(() => touchHint.classList.add('hidden'), 3200);
    requestAnimationFrame(() => window.Game.start(car));
    beep(520, 0.1); setTimeout(() => beep(780, 0.14), 110);
  }

  function quitToMenu() {
    window.Game.stop();
    closeOverlay();
    renderMenu();
    show('menu');
  }

  /* ---------------- события ---------------- */
  $('#btn-play').addEventListener('click', startRace);
  $('#btn-garage').addEventListener('click', () => { renderGarage(); show('garage'); });
  $('#btn-help').addEventListener('click', () => show('help'));
  $('#btn-sound').addEventListener('click', () => {
    save.sound = !save.sound; persist(); renderMenu(); beep(700, 0.1);
  });
  document.querySelectorAll('[data-back]').forEach(b =>
    b.addEventListener('click', () => { renderMenu(); show('menu'); }));

  $('#btn-pause').addEventListener('click', () => { window.Game.pause(); overlay('pause'); });
  $('#btn-resume').addEventListener('click', () => { closeOverlay(); window.Game.resume(); });
  $('#btn-quit').addEventListener('click', quitToMenu);

  $('#btn-again').addEventListener('click', () => { closeOverlay(); startRace(); });
  $('#btn-over-menu').addEventListener('click', quitToMenu);
  $('#btn-over-garage').addEventListener('click', () => {
    window.Game.stop(); closeOverlay(); renderGarage(); show('garage');
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && window.Game.running && !window.Game.paused) {
      window.Game.pause(); overlay('pause');
    }
  });
  window.addEventListener('keydown', e => {
    if (e.key === 'Escape' && window.Game.running) {
      if (window.Game.paused) { closeOverlay(); window.Game.resume(); }
      else { window.Game.pause(); overlay('pause'); }
    }
  });

  /* ---------------- старт ---------------- */
  renderMenu();
  loadSprites(() => { renderMenu(); show('menu'); });
})();
