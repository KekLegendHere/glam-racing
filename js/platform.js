/* Слой платформ: Яндекс Игры, VK, Telegram, обычный веб.
   Подход перенесён из WebGravity: остальной код никогда не трогает window.YaGames,
   window.vkBridge или window.Telegram напрямую — только через этот интерфейс.

   У каждой платформы одинаковый набор методов:
     init()                     — загрузить SDK и представиться платформе
     notifyGameReady()          — сказать, что игра готова к взаимодействию (Яндекс требует)
     getUserName()              — имя игрока для подписи призрака, '' если гость
     cloudLoad() / cloudSave()  — облачный прогресс, чтобы он жил между устройствами
     submitScore(board, value)  — рекорд в таблицу лидеров, если платформа её даёт
     shareLink(link, text)      — нативный «поделиться», false если нечем
     getLanguage()              — язык окружения

   Все методы безопасны: если SDK не ответил, игра продолжает работать на localStorage. */
(function () {
  'use strict';

  const loadScript = src => new Promise((resolve, reject) => {
    if (document.querySelector('script[src="' + src + '"]')) { resolve(); return; }
    const s = document.createElement('script');
    s.src = src; s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Не загрузился ' + src));
    document.head.appendChild(s);
  });

  const qs = key => {
    try { return new URLSearchParams(location.search).get(key); } catch (e) { return null; }
  };

  /* SDK платформы может не ответить вовсе: VK Bridge вне VK, например, просто
     не резолвит промис. Без ограничения по времени игра застrevает на загрузке,
     поэтому каждый внешний вызов ограничен по времени и падает в безопасное значение. */
  function withTimeout(promise, ms, fallback) {
    return Promise.race([
      Promise.resolve(promise).catch(() => fallback),
      new Promise(resolve => setTimeout(() => resolve(fallback), ms))
    ]);
  }

  /* ---------------- обычный браузер ---------------- */
  const WebPlatform = {
    type: 'web',
    async init() {},
    notifyGameReady() {},
    getUserName() { return ''; },
    async cloudLoad() { return null; },
    async cloudSave() {},
    async submitScore() {},
    async shareLink(link, text) {
      if (navigator.share) {
        try { await navigator.share({ url: link, text: text || '' }); return true; } catch (e) { return false; }
      }
      if (navigator.clipboard) {
        try { await navigator.clipboard.writeText(link); return 'copied'; } catch (e) {}
      }
      return false;
    },
    getLanguage() { return (navigator.language || 'ru').slice(0, 2); }
  };

  /* ---------------- Яндекс Игры ---------------- */
  const YandexPlatform = {
    type: 'yandex',
    ysdk: null, player: null, _lastSaved: null,

    async init() {
      await loadScript('https://yandex.ru/games/sdk/v2');
      this.ysdk = await withTimeout(window.YaGames.init(), 6000, null);
      if (!this.ysdk) throw new Error('Яндекс SDK не ответил');
      /* Гостевой вход обязателен по правилам Яндекса: прогресс должен сохраняться
         и без авторизации, поэтому отсутствие игрока не считаем ошибкой. */
      this.player = await withTimeout(this.ysdk.getPlayer({ scopes: false }), 5000, null);
    },

    notifyGameReady() {
      try { this.ysdk.features.LoadingAPI.ready(); } catch (e) {}
    },

    getUserName() {
      try { return this.player && this.player.isAuthorized() ? this.player.getName() : ''; }
      catch (e) { return ''; }
    },

    async cloudLoad() {
      if (!this.player) return null;
      const data = await withTimeout(this.player.getData(['glamSave']), 5000, null);
      return data && typeof data.glamSave === 'string' ? data.glamSave : null;
    },

    async cloudSave(json) {
      if (!this.player) return;
      /* SDK ругается, если сохранять то же самое повторно. */
      if (json === this._lastSaved) return;
      await withTimeout(this.player.setData({ glamSave: json }, false), 5000, null);
      this._lastSaved = json;
    },

    async submitScore(board, value) {
      try { await this.ysdk.getLeaderboards().then(lb => lb.setLeaderboardScore(board, value)); }
      catch (e) { /* таблица может быть не заведена в консоли — это нормально */ }
    },

    /* Яндекс запрещает уводить игрока на внешние ресурсы. */
    async shareLink() { return false; },

    getLanguage() {
      try { return this.ysdk.environment.i18n.lang || 'ru'; } catch (e) { return 'ru'; }
    }
  };

  /* ---------------- VK Mini Apps ---------------- */
  const VkPlatform = {
    type: 'vk',
    bridge: null, user: null,

    async init() {
      await loadScript('https://unpkg.com/@vkontakte/vk-bridge/dist/browser.min.js');
      this.bridge = window.vkBridge;
      /* VKWebAppInit обязателен в первые секунды после запуска. */
      await withTimeout(this.bridge.send('VKWebAppInit'), 3000, null);
      this.user = await withTimeout(this.bridge.send('VKWebAppGetUserInfo'), 3000, null);
    },

    notifyGameReady() {},

    getUserName() {
      return this.user ? (this.user.first_name || '') : '';
    },

    async cloudLoad() {
      const r = await withTimeout(this.bridge.send('VKWebAppStorageGet', { keys: ['glamSave'] }), 4000, null);
      const item = r && r.keys && r.keys[0];
      return item && item.value ? item.value : null;
    },

    async cloudSave(json) {
      await withTimeout(this.bridge.send('VKWebAppStorageSet', { key: 'glamSave', value: json }), 4000, null);
    },

    async submitScore(board, value) {
      /* VK показывает результат в общем рейтинге приложения. */
      try { await this.bridge.send('VKWebAppShowLeaderBoardBox', { user_result: value }); }
      catch (e) {}
    },

    async shareLink(link, text) {
      try { await this.bridge.send('VKWebAppShare', { link: link }); return true; }
      catch (e) { return false; }
    },

    getLanguage() { return (qs('vk_language') || 'ru').slice(0, 2); }
  };

  /* ---------------- Telegram Mini App ---------------- */
  const TelegramPlatform = {
    type: 'telegram',
    get wa() { return window.Telegram && window.Telegram.WebApp; },

    async init() {
      const wa = this.wa;
      if (!wa) return;
      try { wa.ready(); wa.expand(); } catch (e) {}
      try { wa.requestFullscreen && wa.requestFullscreen(); } catch (e) {}
    },

    notifyGameReady() {},

    getUserName() {
      const u = this.wa && this.wa.initDataUnsafe && this.wa.initDataUnsafe.user;
      return u ? (u.first_name || '') : '';
    },

    cloudLoad() {
      const cs = this.wa && this.wa.CloudStorage;
      if (!cs) return Promise.resolve(null);
      return new Promise(resolve => {
        try { cs.getItem('glamSave', (err, value) => resolve(err ? null : (value || null))); }
        catch (e) { resolve(null); }
      });
    },

    cloudSave(json) {
      const cs = this.wa && this.wa.CloudStorage;
      if (!cs) return Promise.resolve();
      return new Promise(resolve => {
        try { cs.setItem('glamSave', json, () => resolve()); } catch (e) { resolve(); }
      });
    },

    async submitScore() {},

    async shareLink(link, text) {
      const url = 'https://t.me/share/url?url=' + encodeURIComponent(link) +
                  (text ? '&text=' + encodeURIComponent(text) : '');
      try { this.wa.openTelegramLink(url); return true; }
      catch (e) {
        try { window.open(url, '_blank'); return true; } catch (e2) { return false; }
      }
    },

    getLanguage() {
      const u = this.wa && this.wa.initDataUnsafe && this.wa.initDataUnsafe.user;
      return (u && u.language_code) || 'ru';
    }
  };

  /* ---------------- определение платформы ----------------
     Порядок важен: Telegram и VK узнаются по своему окружению, Яндекс — по
     параметру запуска либо по тому, что игра открыта внутри его iframe. */
  function detect() {
    if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initData) return TelegramPlatform;
    if (qs('vk_app_id')) return VkPlatform;
    const forced = qs('platform');
    if (forced === 'yandex' || forced === 'vk' || forced === 'telegram') {
      return { yandex: YandexPlatform, vk: VkPlatform, telegram: TelegramPlatform }[forced];
    }
    if (window.YaGames) return YandexPlatform;
    /* Игра под Яндексом всегда открыта в iframe с его домена. */
    try {
      if (window.top !== window.self && /yandex\./.test(document.referrer)) return YandexPlatform;
    } catch (e) { /* cross-origin — значит точно в чужом iframe, но чей неизвестно */ }
    return WebPlatform;
  }

  const active = detect();

  /* Единая точка входа. Любой сбой SDK не должен ронять игру, поэтому init
     оборачивается и при ошибке платформа откатывается к веб-варианту. */
  window.Platform = {
    type: active.type,
    async init() {
      try {
        /* Общий предохранитель: даже если SDK совсем не отвечает, меню появится. */
        const ok = await withTimeout(active.init().then(() => true), 9000, false);
        if (!ok) throw new Error('SDK не уложился в отведённое время');
      } catch (e) {
        console.warn('[platform] ' + active.type + ' не поднялся, работаем как обычный сайт', e);
        window.Platform.type = 'web';
        window.Platform._impl = WebPlatform;
        return;
      }
      window.Platform._impl = active;
      window.Platform.type = active.type;
    },
    _impl: WebPlatform,
    notifyGameReady() { try { this._impl.notifyGameReady(); } catch (e) {} },
    getUserName() { try { return this._impl.getUserName() || ''; } catch (e) { return ''; } },
    /* Ни одно облачное обращение не должно задерживать игру дольше пары секунд. */
    cloudLoad() { try { return withTimeout(this._impl.cloudLoad(), 5000, null); } catch (e) { return Promise.resolve(null); } },
    cloudSave(json) { try { return withTimeout(this._impl.cloudSave(json), 5000, null); } catch (e) { return Promise.resolve(); } },
    submitScore(board, value) { try { return withTimeout(this._impl.submitScore(board, value), 5000, null); } catch (e) { return Promise.resolve(); } },
    shareLink(link, text) { try { return withTimeout(this._impl.shareLink(link, text), 8000, false); } catch (e) { return Promise.resolve(false); } },
    getLanguage() { try { return this._impl.getLanguage(); } catch (e) { return 'ru'; } }
  };
})();
