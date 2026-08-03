/* Движок аркадной гонки: вертикальный бесконечный раннер на canvas. */
(function () {
  'use strict';

  const LANES = 4;
  const MAX_LIVES = 3;
  const clamp = (v, a, b) => v < a ? a : (v > b ? b : v);
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = arr => arr[(Math.random() * arr.length) | 0];

  const Game = {
    canvas: null, ctx: null,
    W: 0, H: 0, dpr: 1,
    running: false, paused: false, raf: 0, last: 0,
    onHud: null, onOver: null, onPickup: null, onCrash: null,

    init(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.resize();
      window.addEventListener('resize', () => this.resize());
      this.bindInput();
    },

    resize() {
      const c = this.canvas;
      const r = c.getBoundingClientRect();
      const w = Math.max(1, Math.round(r.width || window.innerWidth));
      const h = Math.max(1, Math.round(r.height || window.innerHeight));
      this.dpr = Math.min(window.devicePixelRatio || 1, 2);
      c.width = Math.round(w * this.dpr);
      c.height = Math.round(h * this.dpr);
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      this.W = w; this.H = h;
      this.margin = w * 0.05;
      this.roadW = w - this.margin * 2;
      this.laneW = this.roadW / LANES;
      this.S = this.roadW * 0.30;              // сторона квадратного спрайта
      if (this.p) this.p.x = clamp(this.p.x, this.margin + this.S * 0.3, w - this.margin - this.S * 0.3);
    },

    laneX(i) { return this.margin + this.laneW * (i + 0.5); },

    bindInput() {
      const c = this.canvas;
      this.keys = {};
      const setKey = (e, down) => {
        const k = e.key.toLowerCase();
        if (['arrowleft', 'a', 'ф'].includes(k)) { this.keys.left = down; e.preventDefault(); }
        if (['arrowright', 'd', 'в'].includes(k)) { this.keys.right = down; e.preventDefault(); }
      };
      window.addEventListener('keydown', e => { if (this.running) setKey(e, true); });
      window.addEventListener('keyup', e => { if (this.running) setKey(e, false); });

      const track = e => {
        if (!this.running || this.paused) return;
        const t = e.touches ? e.touches[0] : e;
        const r = c.getBoundingClientRect();
        this.touchX = t.clientX - r.left;
        this.usingTouch = true;
        if (this.onTouchStart) this.onTouchStart();
      };
      c.addEventListener('pointerdown', e => { c.setPointerCapture?.(e.pointerId); track(e); });
      c.addEventListener('pointermove', e => { if (e.buttons || e.pointerType !== 'mouse') track(e); });
      c.addEventListener('pointerup', () => { this.touchX = null; });
      c.addEventListener('pointercancel', () => { this.touchX = null; });
      c.addEventListener('touchmove', e => e.preventDefault(), { passive: false });
    },

    start(car) {
      this.resize();
      this.car = car;
      this.p = {
        x: this.laneX(1),
        y: this.H * 0.76,
        tilt: 0
      };
      this.dist = 0; this.score = 0; this.gems = 0;
      this.lives = MAX_LIVES;
      this.invuln = 0; this.boost = 0;
      this.objects = [];
      this.sparks = [];
      this.scroll = 0;
      this.spawnGap = 0;
      this.touchX = null; this.usingTouch = false;
      this.keys = {};
      this.time = 0;
      this.running = true; this.paused = false;
      this.last = performance.now();
      cancelAnimationFrame(this.raf);
      this.raf = requestAnimationFrame(this.loop.bind(this));
      this.pushHud();
    },

    pause() { if (this.running) this.paused = true; },
    resume() {
      if (!this.running || !this.paused) return;
      this.paused = false; this.last = performance.now();
      this.raf = requestAnimationFrame(this.loop.bind(this));
    },
    stop() { this.running = false; this.paused = false; cancelAnimationFrame(this.raf); },

    /* --- скорость --- */
    speedFactor() {
      const growth = Math.min(1, this.dist / 9000);
      const base = 0.56 + growth * 0.86;                        // 0.56 → 1.42
      const carK = 0.60 + (this.car.speed || 7) * 0.047;        // 0.88 (6) … 1.07 (10)
      return base * carK * (this.boost > 0 ? 1.42 : 1);
    },

    loop(now) {
      if (!this.running || this.paused) return;
      let dt = (now - this.last) / 1000;
      this.last = now;
      dt = clamp(dt, 0, 0.05);
      this.update(dt);
      this.draw();
      this.raf = requestAnimationFrame(this.loop.bind(this));
    },

    update(dt) {
      this.time += dt;
      const k = this.speedFactor();
      const v = this.H * k;                 // пикселей в секунду
      this.dist += v * dt * 0.1;
      this.scroll = (this.scroll + v * dt) % 1e6;
      this.score += v * dt * 0.02 * (this.boost > 0 ? 2 : 1);
      if (this.invuln > 0) this.invuln -= dt;
      if (this.boost > 0) this.boost -= dt;

      /* --- управление --- */
      const p = this.p;
      const handling = this.car.handling || 7;
      const minX = this.margin + this.S * 0.28;
      const maxX = this.W - this.margin - this.S * 0.28;
      let target = null;
      if (this.keys.left) target = p.x - this.roadW;
      else if (this.keys.right) target = p.x + this.roadW;
      else if (this.touchX != null) target = this.touchX;

      if (target != null) {
        const maxStep = this.roadW * (0.85 + handling * 0.14) * dt;
        const d = clamp(target - p.x, -maxStep, maxStep);
        p.x += d;
        p.tilt += (clamp(d / (maxStep || 1), -1, 1) * 0.28 - p.tilt) * Math.min(1, dt * 12);
      } else {
        p.tilt += (0 - p.tilt) * Math.min(1, dt * 8);
      }
      p.x = clamp(p.x, minX, maxX);

      /* --- спавн --- */
      this.spawnGap -= v * dt;
      if (this.spawnGap <= 0) {
        this.spawnRow();
        const density = 1 - Math.min(0.45, this.dist / 20000);
        this.spawnGap = this.S * rand(1.6, 3.0) * density + this.S * 0.9;
      }

      /* --- объекты --- */
      const S = this.S;
      const magnetR = S * (0.35 + (this.car.magnet || 5) * 0.09);
      const hitW = S * 0.42, hitH = S * 0.72;

      for (let i = this.objects.length - 1; i >= 0; i--) {
        const o = this.objects[i];
        o.y += (v - (o.own || 0) * this.H) * dt;

        if (o.y > this.H + S) { this.objects.splice(i, 1); continue; }

        const dx = o.x - p.x, dy = o.y - p.y;

        if (o.kind === 'pickup') {
          const r = magnetR + o.r;
          if (Math.abs(dx) < r * 1.6 && Math.abs(dy) < r * 1.6) {
            const dd = Math.hypot(dx, dy) || 1;
            o.x -= (dx / dd) * dt * this.H * 0.9;
            o.y -= (dy / dd) * dt * this.H * 0.9;
          }
          if (Math.abs(o.x - p.x) < hitW * 0.9 + o.r && Math.abs(o.y - p.y) < hitH * 0.6 + o.r) {
            this.collect(o);
            this.objects.splice(i, 1);
            continue;
          }
        } else {
          const ow = (o.type === 'hole' ? o.r * 1.7 : S * 0.42);
          const oh = (o.type === 'hole' ? o.r * 1.7 * o.squash : S * 0.72);
          if (Math.abs(dx) < (hitW + ow) / 2 && Math.abs(dy) < (hitH + oh) / 2) {
            if (this.boost > 0) {
              this.burst(o.x, o.y, '#ffd166', 14);
              this.objects.splice(i, 1);
              this.score += 25;
              continue;
            }
            if (this.invuln <= 0) {
              this.crash(o);
              this.objects.splice(i, 1);
              continue;
            }
          }
        }
      }

      /* --- искры за машиной --- */
      if (this.time % 1 < 1) {
        const n = this.boost > 0 ? 3 : 1;
        for (let i = 0; i < n; i++) {
          this.sparks.push({
            x: p.x + rand(-S * 0.16, S * 0.16),
            y: p.y + S * 0.34,
            vy: rand(0.4, 0.9) * this.H,
            life: rand(0.25, 0.55), t: 0,
            r: rand(1.5, 4),
            c: this.boost > 0 ? '#ffd166' : (Math.random() < 0.5 ? '#ff9ecd' : '#ffffff')
          });
        }
      }
      for (let i = this.sparks.length - 1; i >= 0; i--) {
        const s = this.sparks[i];
        s.t += dt; s.y += s.vy * dt;
        if (s.t > s.life) this.sparks.splice(i, 1);
      }

      this.pushHud();
    },

    spawnRow() {
      const free = (Math.random() * LANES) | 0;
      const S = this.S;
      const hard = Math.min(1, this.dist / 12000);
      for (let l = 0; l < LANES; l++) {
        if (l === free) {
          if (Math.random() < 0.45) this.spawnPickup(l);
          continue;
        }
        const roll = Math.random();
        if (roll < 0.20 + hard * 0.18) {
          this.objects.push({
            kind: 'block', type: 'traffic', lane: l,
            x: this.laneX(l) + rand(-this.laneW * 0.05, this.laneW * 0.05),
            y: -S, own: rand(0.42, 0.62),
            sprite: pick(window.CARS).id,
            hue: pick(['#8fb6ff', '#a0e7c4', '#ffc48f', '#d3b3ff', '#ff9aa8', '#bfc7d4'])
          });
        } else if (roll < 0.38 + hard * 0.16) {
          this.objects.push({
            kind: 'block', type: 'hole',
            x: this.laneX(l) + rand(-this.laneW * 0.12, this.laneW * 0.12),
            y: -S, own: 0, r: S * rand(0.24, 0.31),
            shape: Array.from({ length: 11 }, () => rand(0.72, 1.12)),
            squash: rand(0.62, 0.82)
          });
        } else if (roll < 0.52) {
          this.spawnPickup(l);
        }
      }
    },

    spawnPickup(lane) {
      const S = this.S;
      const roll = Math.random();
      let type = 'gem';
      if (roll > 0.95) type = 'heart';
      else if (roll > 0.86) type = 'star';
      const n = type === 'gem' ? (1 + ((Math.random() * 2) | 0)) : 1;
      for (let i = 0; i < n; i++) {
        this.objects.push({
          kind: 'pickup', type,
          x: this.laneX(lane), y: -S - i * S * 0.55,
          own: 0, r: S * (type === 'gem' ? 0.13 : 0.17), phase: Math.random() * 6.28
        });
      }
    },

    collect(o) {
      if (o.type === 'gem') {
        this.gems++; this.score += 15;
        this.burst(o.x, o.y, '#ff7ab8', 10);
      } else if (o.type === 'star') {
        this.boost = 4; this.score += 40;
        this.burst(o.x, o.y, '#ffd166', 22);
      } else {
        if (this.lives < MAX_LIVES) this.lives++;
        else this.score += 60;
        this.burst(o.x, o.y, '#ff5f8f', 18);
      }
      if (this.onPickup) this.onPickup(o.type);
    },

    crash() {
      this.lives--;
      this.invuln = 1.6;
      this.burst(this.p.x, this.p.y, '#ffffff', 26);
      if (this.onCrash) this.onCrash(this.lives);
      if (navigator.vibrate) { try { navigator.vibrate(60); } catch (e) {} }
      if (this.lives <= 0) {
        this.stop();
        if (this.onOver) this.onOver({
          score: Math.floor(this.score),
          gems: this.gems,
          dist: Math.floor(this.dist)
        });
      }
    },

    burst(x, y, color, n) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, sp = rand(0.15, 0.75) * this.H;
        this.sparks.push({
          x, y, vy: Math.sin(a) * sp, vx: Math.cos(a) * sp,
          life: rand(0.25, 0.6), t: 0, r: rand(2, 5), c: color
        });
      }
    },

    pushHud() {
      if (!this.onHud) return;
      this.onHud({
        score: Math.floor(this.score),
        gems: this.gems,
        lives: this.lives,
        speed: Math.round(this.speedFactor() * 100),
        boost: this.boost > 0
      });
    },

    /* ---------------- отрисовка ---------------- */
    draw() {
      const ctx = this.ctx, W = this.W, H = this.H, S = this.S;
      const m = this.margin, rw = this.roadW;

      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, '#33124d');
      sky.addColorStop(0.45, '#5a1f63');
      sky.addColorStop(1, '#b0447c');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, H);

      /* обочина: бегущие блёстки */
      ctx.save();
      const step = S * 0.9;
      const off = this.scroll % step;
      for (let y = -step; y < H + step; y += step) {
        const yy = y + off;
        const t = (y / H);
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = '#ffb3de';
        ctx.beginPath(); ctx.arc(m * 0.5, yy, 2.5 + t, 0, 6.3); ctx.fill();
        ctx.beginPath(); ctx.arc(W - m * 0.5, yy + step * 0.5, 2.5 + t, 0, 6.3); ctx.fill();
      }
      ctx.restore();

      /* дорога */
      const road = ctx.createLinearGradient(m, 0, m + rw, 0);
      road.addColorStop(0, '#2b1b3d');
      road.addColorStop(0.5, '#3a2551');
      road.addColorStop(1, '#2b1b3d');
      ctx.fillStyle = road;
      ctx.fillRect(m, 0, rw, H);

      /* неоновые бордюры */
      ctx.fillStyle = '#ff5fa2';
      ctx.fillRect(m - 4, 0, 4, H);
      ctx.fillRect(m + rw, 0, 4, H);
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.shadowColor = '#ff5fa2'; ctx.shadowBlur = 18;
      ctx.fillRect(m - 4, 0, 4, H);
      ctx.fillRect(m + rw, 0, 4, H);
      ctx.restore();

      /* разметка */
      const dash = S * 0.55, gap = S * 0.5;
      const d0 = this.scroll % (dash + gap);
      ctx.fillStyle = 'rgba(255,255,255,0.30)';
      for (let l = 1; l < LANES; l++) {
        const x = m + this.laneW * l - 2;
        for (let y = -dash; y < H + dash; y += dash + gap) {
          ctx.fillRect(x, y + d0, 4, dash);
        }
      }

      /* объекты */
      for (const o of this.objects) {
        if (o.kind === 'pickup') this.drawPickup(o);
        else if (o.type === 'hole') this.drawHole(o);
        else this.drawCar(o.x, o.y, S, o.sprite, o.hue, 0, 1);
      }

      /* искры */
      for (const s of this.sparks) {
        const a = 1 - s.t / s.life;
        ctx.globalAlpha = Math.max(0, a);
        ctx.fillStyle = s.c;
        if (s.vx) s.x += s.vx * 0.016;
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r * a, 0, 6.3); ctx.fill();
      }
      ctx.globalAlpha = 1;

      /* игрок */
      const p = this.p;
      const blink = this.invuln > 0 && (Math.floor(this.invuln * 12) % 2 === 0);
      if (this.boost > 0) {
        ctx.save();
        ctx.globalAlpha = 0.55;
        const g = ctx.createRadialGradient(p.x, p.y, S * 0.1, p.x, p.y, S * 0.85);
        g.addColorStop(0, 'rgba(255,214,102,0.75)');
        g.addColorStop(1, 'rgba(255,214,102,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(p.x, p.y, S * 0.85, 0, 6.3); ctx.fill();
        ctx.restore();
      }
      this.drawCar(p.x, p.y, S * 1.06, this.car.id, this.car.color, p.tilt, blink ? 0.35 : 1);
    },

    drawCar(x, y, size, spriteId, color, tilt, alpha) {
      const ctx = this.ctx;
      const img = window.SPRITES && window.SPRITES[spriteId];
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(x, y);
      if (tilt) ctx.rotate(tilt);
      ctx.save();
      ctx.globalAlpha = alpha * 0.35;
      ctx.fillStyle = '#000';
      ctx.beginPath(); ctx.ellipse(0, size * 0.06, size * 0.24, size * 0.4, 0, 0, 6.3); ctx.fill();
      ctx.restore();
      if (img && img.complete && img.naturalWidth) {
        ctx.drawImage(img, -size / 2, -size / 2, size, size);
      } else {
        this.drawVectorCar(size, color);
      }
      ctx.restore();
    },

    drawVectorCar(size, color) {
      const ctx = this.ctx;
      const w = size * 0.46, h = size * 0.82, r = w * 0.28;
      ctx.fillStyle = color || '#ff5fa2';
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(-w / 2, -h / 2, w, h, r);
      else ctx.rect(-w / 2, -h / 2, w, h);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.fillRect(-w * 0.34, -h * 0.30, w * 0.68, h * 0.20);
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.fillRect(-w * 0.34, h * 0.10, w * 0.68, h * 0.16);
      ctx.fillStyle = '#241732';
      ctx.fillRect(-w * 0.58, -h * 0.30, w * 0.16, h * 0.22);
      ctx.fillRect(w * 0.42, -h * 0.30, w * 0.16, h * 0.22);
      ctx.fillRect(-w * 0.58, h * 0.12, w * 0.16, h * 0.22);
      ctx.fillRect(w * 0.42, h * 0.12, w * 0.16, h * 0.22);
    },

    drawPickup(o) {
      const ctx = this.ctx;
      const t = this.time * 3 + o.phase;
      const s = o.r * (1 + Math.sin(t) * 0.10);
      ctx.save();
      ctx.translate(o.x, o.y);
      ctx.shadowBlur = 14;
      if (o.type === 'gem') {
        ctx.shadowColor = '#ff5fa2';
        ctx.rotate(Math.sin(t * 0.6) * 0.25);
        ctx.fillStyle = '#ff8ec9';
        ctx.beginPath();
        ctx.moveTo(0, -s); ctx.lineTo(s * 0.8, 0); ctx.lineTo(0, s); ctx.lineTo(-s * 0.8, 0);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.beginPath();
        ctx.moveTo(0, -s); ctx.lineTo(s * 0.35, -s * 0.2); ctx.lineTo(0, s * 0.15); ctx.lineTo(-s * 0.35, -s * 0.2);
        ctx.closePath(); ctx.fill();
      } else if (o.type === 'star') {
        ctx.shadowColor = '#ffd166';
        ctx.rotate(t * 0.8);
        ctx.fillStyle = '#ffd166';
        ctx.beginPath();
        for (let i = 0; i < 10; i++) {
          const a = (Math.PI / 5) * i - Math.PI / 2;
          const rr = i % 2 ? s * 0.45 : s;
          ctx[i ? 'lineTo' : 'moveTo'](Math.cos(a) * rr, Math.sin(a) * rr);
        }
        ctx.closePath(); ctx.fill();
      } else {
        ctx.shadowColor = '#ff2d78';
        ctx.fillStyle = '#ff5f8f';
        ctx.beginPath();
        ctx.moveTo(0, s * 0.85);
        ctx.bezierCurveTo(-s * 1.4, -s * 0.2, -s * 0.55, -s * 1.1, 0, -s * 0.35);
        ctx.bezierCurveTo(s * 0.55, -s * 1.1, s * 1.4, -s * 0.2, 0, s * 0.85);
        ctx.fill();
      }
      ctx.restore();
    },

    /* яма в асфальте: рваный контур + осыпавшийся край + глубина */
    drawHole(o) {
      const ctx = this.ctx;
      const pts = o.shape, n = pts.length;
      const path = scale => {
        ctx.beginPath();
        for (let i = 0; i < n; i++) {
          const a = (Math.PI * 2 / n) * i;
          const rr = o.r * pts[i] * scale;
          const x = Math.cos(a) * rr, y = Math.sin(a) * rr * o.squash;
          if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
        }
        ctx.closePath();
      };

      ctx.save();
      ctx.translate(o.x, o.y);

      /* крошево вокруг ямы */
      ctx.fillStyle = 'rgba(255,214,240,0.20)';
      path(1.26); ctx.fill();
      ctx.fillStyle = 'rgba(120,80,150,0.45)';
      path(1.10); ctx.fill();

      /* сама дыра */
      ctx.fillStyle = '#0b0512';
      path(1); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.45)';
      ctx.lineWidth = Math.max(1.2, o.r * 0.07);
      path(1); ctx.stroke();

      /* подсвеченная передняя кромка — читается как глубина */
      const g = ctx.createLinearGradient(0, -o.r * o.squash, 0, o.r * o.squash);
      g.addColorStop(0, 'rgba(122,80,160,0.85)');
      g.addColorStop(0.4, 'rgba(11,5,18,1)');
      g.addColorStop(1, 'rgba(11,5,18,1)');
      ctx.fillStyle = g;
      path(0.92); ctx.fill();

      /* трещины по асфальту */
      ctx.strokeStyle = 'rgba(255,255,255,0.14)';
      ctx.lineWidth = Math.max(1, o.r * 0.045);
      for (let i = 0; i < n; i += 3) {
        const a = (Math.PI * 2 / n) * i;
        const r0 = o.r * pts[i] * 1.05, r1 = r0 + o.r * (0.18 + pts[i] * 0.22);
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0 * o.squash);
        ctx.lineTo(Math.cos(a) * r1, Math.sin(a) * r1 * o.squash);
        ctx.stroke();
      }
      ctx.restore();
    }
  };

  window.Game = Game;
})();
