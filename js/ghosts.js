/* Призраки: заезд записывается и потом едет рядом полупрозрачной машиной.

   Идея перенесена из WebGravity, но запись там — нажатия кнопок, которые
   переигрывает физика. У нас физики нет, поэтому пишем сразу положение машины
   поперёк дороги. Важная деталь: время меряется в долях такта, а не в
   секундах. Трасса и музыка идут по одним часам, поэтому призрак совпадает с
   собственным заездом на любом устройстве, независимо от частоты кадров.

   Дорожка компактная: одно значение на половину доли, координата ужата в байт.
   Заезд на 128 долей — это 256 байт, то есть призрак влезает в ссылку и его
   можно отдать другу. */
(function () {
  'use strict';

  const STEP = 0.5;          // доли такта между отсчётами
  const VERSION = 1;

  const clamp01 = v => v < 0 ? 0 : (v > 1 ? 1 : v);

  const Ghosts = {
    rec: null,

    /* ---------------- запись ---------------- */

    startRecording(levelId) {
      this.rec = { levelId, xs: [], nextBeat: 0 };
    },

    /** Вызывается каждый кадр: beats — доли с начала трека, x — 0..1 поперёк дороги. */
    sample(beats, x) {
      const r = this.rec;
      if (!r) return;
      /* Добираем пропущенные отсчёты, если кадр был долгим: дорожка обязана
         остаться равномерной, иначе призрак «поедет» по времени. */
      while (r.nextBeat <= beats && r.xs.length < 4096) {
        r.xs.push(Math.round(clamp01(x) * 255));
        r.nextBeat += STEP;
      }
    },

    /** Завершает запись и возвращает призрака (в хранилище не пишет). */
    finish(meta) {
      const r = this.rec;
      this.rec = null;
      if (!r || r.xs.length < 4) return null;
      return {
        v: VERSION,
        level: r.levelId,
        name: (meta && meta.name) || 'Ты',
        car: (meta && meta.car) || 'vesta',
        score: (meta && meta.score) || 0,
        gems: (meta && meta.gems) || 0,
        stars: (meta && meta.stars) || 0,
        xs: r.xs
      };
    },

    /* ---------------- воспроизведение ---------------- */

    /** Положение призрака (0..1) на указанной доле; null — запись кончилась. */
    positionAt(ghost, beats) {
      if (!ghost || !ghost.xs || !ghost.xs.length) return null;
      const idx = beats / STEP;
      const i = Math.floor(idx);
      if (i < 0) return ghost.xs[0] / 255;
      if (i >= ghost.xs.length - 1) return null;
      const a = ghost.xs[i], b = ghost.xs[i + 1];
      return (a + (b - a) * (idx - i)) / 255;
    },

    /* ---------------- хранение ---------------- */

    key(levelId) { return 'glam-ghost-' + levelId; },

    load(levelId) {
      try {
        const raw = localStorage.getItem(this.key(levelId));
        return raw ? JSON.parse(raw) : null;
      } catch (e) { return null; }
    },

    save(levelId, ghost) {
      try { localStorage.setItem(this.key(levelId), JSON.stringify(ghost)); } catch (e) {}
    },

    /** Призрак-соперник: тот, что пришёл по ссылке, иначе собственный рекорд. */
    rival(levelId) {
      return this.shared[levelId] || this.load(levelId);
    },

    /** Призраки, полученные от других игроков по ссылке (в этой сессии). */
    shared: {},

    /* ---------------- обмен ---------------- */

    /** Строка для ссылки: заголовок через `~`, дорожка — base64. */
    encode(ghost) {
      try {
        let bin = '';
        for (const v of ghost.xs) bin += String.fromCharCode(v);
        const b64 = btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        return [VERSION, ghost.level, encodeURIComponent(ghost.name), ghost.car,
                ghost.score, ghost.stars, b64].join('~');
      } catch (e) { return ''; }
    },

    decode(code) {
      try {
        const p = String(code).split('~');
        if (p.length < 7 || Number(p[0]) !== VERSION) return null;
        const b64 = p[6].replace(/-/g, '+').replace(/_/g, '/');
        const bin = atob(b64 + '==='.slice((b64.length + 3) % 4));
        const xs = new Array(bin.length);
        for (let i = 0; i < bin.length; i++) xs[i] = bin.charCodeAt(i);
        return {
          v: VERSION, level: p[1], name: decodeURIComponent(p[2]) || 'Соперник',
          car: p[3] || 'vesta', score: Number(p[4]) || 0, gems: 0,
          stars: Number(p[5]) || 0, xs
        };
      } catch (e) { return null; }
    },

    /** Ссылка-вызов: открывший её поедет против этого призрака. */
    challengeLink(ghost) {
      const base = location.origin + location.pathname;
      return base + '?ghost=' + encodeURIComponent(this.encode(ghost));
    },

    /** Разбирает `?ghost=` при запуске. Возвращает призрака или null. */
    fromUrl() {
      try {
        const code = new URLSearchParams(location.search).get('ghost');
        if (!code) return null;
        const g = this.decode(code);
        if (g) this.shared[g.level] = g;
        return g;
      } catch (e) { return null; }
    }
  };

  window.Ghosts = Ghosts;
})();
