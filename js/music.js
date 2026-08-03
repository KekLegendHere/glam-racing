/* Музыка уровней на WebAudio: без единого mp3, всё синтезируется на лету.

   Главное здесь — не звук сам по себе, а общие часы: заезд идёт под трек,
   скорость дороги и появление препятствий считаются в долях такта, поэтому
   машинка едет строго в ритм.

   Планировщик работает с запасом: каждые 25 мс он расставляет ноты на 120 мс
   вперёд. Так звук не дёргается, даже когда вкладка занята отрисовкой. */
(function () {
  'use strict';

  const LOOKAHEAD_MS = 25;
  const SCHEDULE_AHEAD = 0.12;      // секунд вперёд

  /* Полутоны от корневой ноты. Минорная гамма звучит «глянцево-неоново». */
  const SCALES = {
    minor: [0, 2, 3, 5, 7, 8, 10],
    dorian: [0, 2, 3, 5, 7, 9, 10],
    major: [0, 2, 4, 5, 7, 9, 11]
  };

  const noteHz = semitone => 440 * Math.pow(2, (semitone - 9) / 12);

  /* Детерминированный генератор: одна и та же мелодия у уровня при каждом заезде. */
  function seeded(seed) {
    let s = seed >>> 0;
    return () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  const Music = {
    ctx: null,
    master: null,
    track: null,
    playing: false,
    muted: false,
    startTime: 0,
    nextNoteTime: 0,
    step: 0,                        // счётчик шестнадцатых с начала трека
    timer: 0,

    /** Готовит контекст. Вызывать по действию игрока, иначе браузер не разрешит звук. */
    ensure() {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return false;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.5;
        this.master.connect(this.ctx.destination);
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return true;
    },

    setMuted(muted) {
      this.muted = muted;
      if (this.master) this.master.gain.value = muted ? 0 : 0.5;
    },

    /** Запускает трек уровня. track: { bpm, root, scale, seed } */
    start(track) {
      if (!this.ensure()) return;
      this.stop();
      this.track = track;
      this.rand = seeded(track.seed || 1);
      this.melody = this.buildMelody(track);
      this.step = 0;
      this.startTime = this.ctx.currentTime + 0.08;
      this.nextNoteTime = this.startTime;
      this.playing = true;
      this.timer = setInterval(() => this.schedule(), LOOKAHEAD_MS);
    },

    stop() {
      this.playing = false;
      this.pausedAt = 0;
      if (this.timer) { clearInterval(this.timer); this.timer = 0; }
    },

    /** Пауза: часы трека замирают, иначе после возврата трасса «прыгнет» вперёд. */
    pause() {
      if (!this.playing) return;
      this.pausedAt = this.ctx.currentTime;
      this.playing = false;
      clearInterval(this.timer); this.timer = 0;
    },

    resume() {
      if (this.playing || !this.pausedAt || !this.track) return;
      const delta = this.ctx.currentTime - this.pausedAt;
      this.startTime += delta;
      this.nextNoteTime = this.ctx.currentTime + 0.05;
      this.pausedAt = 0;
      this.playing = true;
      this.timer = setInterval(() => this.schedule(), LOOKAHEAD_MS);
    },

    /** Секунд на одну долю (четверть). */
    beatDuration() { return 60 / ((this.track && this.track.bpm) || 120); },

    /** Сколько долей прошло с начала трека — по этим часам живёт весь заезд. */
    beatsElapsed() {
      if (!this.playing || !this.ctx) return 0;
      return Math.max(0, (this.ctx.currentTime - this.startTime) / this.beatDuration());
    },

    /** 0..1 внутри текущей доли — для пульсации картинки в такт. */
    beatPhase() {
      const b = this.beatsElapsed();
      return b - Math.floor(b);
    },

    /* --- сочинение --- */

    /** Мелодия на 64 шестнадцатых: ступени гаммы либо -1 (пауза). */
    buildMelody(track) {
      const scale = SCALES[track.scale] || SCALES.minor;
      const out = [];
      for (let i = 0; i < 64; i++) {
        const onBeat = i % 4 === 0;
        const r = this.rand();
        if (!onBeat && r < 0.55) { out.push(-1); continue; }
        const degree = Math.floor(this.rand() * scale.length);
        const octave = this.rand() < 0.25 ? 12 : 0;
        out.push(track.root + scale[degree] + octave);
      }
      return out;
    },

    /* --- планировщик --- */

    schedule() {
      if (!this.playing) return;
      const spb = this.beatDuration();
      const sixteenth = spb / 4;
      while (this.nextNoteTime < this.ctx.currentTime + SCHEDULE_AHEAD) {
        this.playStep(this.step, this.nextNoteTime, spb);
        this.nextNoteTime += sixteenth;
        this.step++;
      }
    },

    playStep(step, time, spb) {
      const s16 = step % 16;                 // позиция внутри такта
      const bar = Math.floor(step / 16);
      const t = this.track;

      /* Бочка — опора ритма, по ней же считается пульс картинки. */
      if (s16 === 0 || s16 === 6 || s16 === 10) this.kick(time);
      /* Хлопок на вторую и четвёртую долю. */
      if (s16 === 4 || s16 === 12) this.snare(time);
      /* Хэт восьмыми, на слабую долю тише. */
      if (s16 % 2 === 0) this.hat(time, s16 % 4 === 0 ? 0.05 : 0.03);

      /* Бас держит корень аккорда, меняется раз в такт. */
      if (s16 === 0 || s16 === 8) {
        const chord = t.chords[bar % t.chords.length];
        this.bass(noteHz(t.root + chord - 24), time, spb * 0.9);
      }

      /* Мелодия поверх — со второго такта, чтобы вступление не давило. */
      if (bar >= 1) {
        const note = this.melody[step % this.melody.length];
        if (note >= 0) this.lead(noteHz(note), time, spb * 0.45);
      }
    },

    /* --- голоса --- */

    env(node, time, attack, decay, peak) {
      const g = node.gain;
      g.setValueAtTime(0.0001, time);
      g.exponentialRampToValueAtTime(peak, time + attack);
      g.exponentialRampToValueAtTime(0.0001, time + attack + decay);
    },

    kick(time) {
      const o = this.ctx.createOscillator(), g = this.ctx.createGain();
      o.frequency.setValueAtTime(150, time);
      o.frequency.exponentialRampToValueAtTime(45, time + 0.12);
      this.env(g, time, 0.005, 0.16, 0.9);
      o.connect(g); g.connect(this.master);
      o.start(time); o.stop(time + 0.2);
    },

    snare(time) {
      const noise = this.ctx.createBufferSource();
      const len = Math.floor(this.ctx.sampleRate * 0.12);
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      noise.buffer = buf;
      const hp = this.ctx.createBiquadFilter();
      hp.type = 'highpass'; hp.frequency.value = 1400;
      const g = this.ctx.createGain();
      this.env(g, time, 0.004, 0.11, 0.35);
      noise.connect(hp); hp.connect(g); g.connect(this.master);
      noise.start(time); noise.stop(time + 0.14);
    },

    hat(time, peak) {
      const o = this.ctx.createOscillator(), g = this.ctx.createGain();
      o.type = 'square';
      o.frequency.value = 7800;
      this.env(g, time, 0.002, 0.035, peak);
      o.connect(g); g.connect(this.master);
      o.start(time); o.stop(time + 0.05);
    },

    bass(hz, time, dur) {
      const o = this.ctx.createOscillator(), g = this.ctx.createGain();
      const f = this.ctx.createBiquadFilter();
      o.type = 'sawtooth';
      o.frequency.value = hz;
      f.type = 'lowpass'; f.frequency.value = 420;
      this.env(g, time, 0.02, dur, 0.28);
      o.connect(f); f.connect(g); g.connect(this.master);
      o.start(time); o.stop(time + dur + 0.05);
    },

    lead(hz, time, dur) {
      const o = this.ctx.createOscillator(), g = this.ctx.createGain();
      o.type = 'triangle';
      o.frequency.value = hz;
      this.env(g, time, 0.01, dur, 0.16);
      o.connect(g); g.connect(this.master);
      o.start(time); o.stop(time + dur + 0.05);
    },

    /** Короткий аккорд победы — играется поверх остановленного трека. */
    fanfare(win) {
      if (!this.ensure()) return;
      const base = win ? 0 : -5;
      [0, 4, 7, 12].forEach((semi, i) => {
        const time = this.ctx.currentTime + i * 0.09;
        this.lead(noteHz(base + semi + 12), time, 0.35);
      });
    }
  };

  window.Music = Music;
})();
