/* ============================================================
 * 全明星联网争夺战
 * WebSocket client for the authoritative room/draft state machine.
 * ============================================================ */
(function () {
  'use strict';

  const root = document.getElementById('showdownRoot');
  const screenEl = document.getElementById('screenShowdown');
  const entryBtn = document.getElementById('showdownOnlineBtn');
  if (!root || !screenEl || !entryBtn) return;

  const SLOTS = [
    { short: 'PG', name: '控球后卫' },
    { short: 'SG', name: '得分后卫' },
    { short: 'SF', name: '小前锋' },
    { short: 'PF', name: '大前锋' },
    { short: 'C', name: '中锋' }
  ];

  const STAGE_LABELS = {
    1: '数据轮',
    2: '荣誉轮',
    3: '球队轮'
  };

  const ERAS = [
    { year: 2025, label: '新世代', desc: '小球空间 · 三分狂潮' },
    { year: 2009, label: '巨星年代', desc: '科比与詹姆斯的巅峰' },
    { year: 2003, label: '王朝余晖', desc: 'OK组合与石佛的时代' },
    { year: 1996, label: '乔丹王朝', desc: '公牛72胜的统治力' },
    { year: 1983, label: '黑白双雄', desc: '魔术师与大鸟的联盟' }
  ];

  const ICONS = {
    coin: '<svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="6.6" fill="#fbbf24" stroke="#b45309" stroke-width="1.2"/><circle cx="8" cy="8" r="4.4" fill="none" stroke="#b45309" stroke-width="0.9" opacity="0.7"/><path d="M8 5.2 8.8 7h1.9L9.2 8.2l.6 1.9L8 8.9l-1.8 1.2.6-1.9L5.3 7h1.9Z" fill="#92400e"/></svg>',
    lock: '<svg viewBox="0 0 16 16"><rect x="3.4" y="7" width="9.2" height="6.6" rx="1.6" fill="currentColor"/><path d="M5.5 7V5.2a2.5 2.5 0 0 1 5 0V7" fill="none" stroke="currentColor" stroke-width="1.7"/></svg>',
    unlock: '<svg viewBox="0 0 16 16"><rect x="3.4" y="7" width="9.2" height="6.6" rx="1.6" fill="currentColor" opacity="0.5"/><path d="M5.5 7V5.2a2.5 2.5 0 0 1 5-.6" fill="none" stroke="currentColor" stroke-width="1.7"/></svg>',
    swap: '<svg viewBox="0 0 16 16"><path d="M3 5.5h8l-2.2-2.2M13 10.5H5l2.2 2.2" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    gavel: '<svg viewBox="0 0 16 16"><rect x="7.2" y="1.6" width="4.4" height="6.4" rx="1" transform="rotate(45 9.4 4.8)" fill="currentColor"/><path d="M8.2 8.4 3 13.6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M2 14.6h7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
    trophy: '<svg viewBox="0 0 16 16"><path d="M4.5 2h7v3.6A3.5 3.5 0 0 1 8 9a3.5 3.5 0 0 1-3.5-3.4Z" fill="currentColor"/><path d="M4.5 3.2H2.6c0 2.2 1 3.4 2.4 3.6M11.5 3.2h1.9c0 2.2-1 3.4-2.4 3.6" fill="none" stroke="currentColor" stroke-width="1.2"/><path d="M8 9v2.4M5.6 13.8c0-1.3 1.1-2.4 2.4-2.4s2.4 1.1 2.4 2.4Z" fill="currentColor"/></svg>',
    star: '<svg viewBox="0 0 16 16"><path d="m8 1.6 1.9 4 4.4.5-3.3 3 .9 4.4L8 11.3l-3.9 2.2.9-4.4-3.3-3 4.4-.5Z" fill="currentColor"/></svg>',
    ball: '<svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="6.4" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M8 1.6v12.8M1.6 8h12.8M3.4 3.4c2.5 2.5 6.7 2.5 9.2 0M3.4 12.6c2.5-2.5 6.7-2.5 9.2 0" fill="none" stroke="currentColor" stroke-width="1.1"/></svg>',
    chart: '<svg viewBox="0 0 16 16"><path d="M2 13.5h12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><rect x="3.2" y="8" width="2.4" height="4" rx="0.6" fill="currentColor"/><rect x="6.8" y="5" width="2.4" height="7" rx="0.6" fill="currentColor"/><rect x="10.4" y="2.6" width="2.4" height="9.4" rx="0.6" fill="currentColor"/></svg>',
    medal: '<svg viewBox="0 0 16 16"><path d="m4.4 1.6 2 4.2M11.6 1.6l-2 4.2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><circle cx="8" cy="10" r="4.2" fill="currentColor"/><path d="m8 7.9.8 1.6 1.8.2-1.3 1.2.3 1.8L8 11.8l-1.6.9.3-1.8-1.3-1.2 1.8-.2Z" fill="#0b1220"/></svg>',
    jersey: '<svg viewBox="0 0 16 16"><path d="M5.4 1.8 2 4.4l1.6 2.4 1.2-.8v8h6.4V6l1.2.8L14 4.4l-3.4-2.6a2.6 2.6 0 0 1-5.2 0Z" fill="currentColor"/></svg>',
    crown: '<svg viewBox="0 0 16 16"><path d="M2 5.4 5 8l3-4.4L11 8l3-2.6-1.2 7H3.2Z" fill="currentColor"/><rect x="3.2" y="13" width="9.6" height="1.6" rx="0.8" fill="currentColor"/></svg>',
    bot: '<svg viewBox="0 0 16 16"><rect x="3" y="5" width="10" height="8" rx="2" fill="currentColor"/><circle cx="6.2" cy="8.6" r="1.2" fill="#0b1220"/><circle cx="9.8" cy="8.6" r="1.2" fill="#0b1220"/><path d="M8 5V2.6M8 2.4a1 1 0 1 1 .1 0" stroke="currentColor" stroke-width="1.4"/></svg>',
    user: '<svg viewBox="0 0 16 16"><circle cx="8" cy="5" r="3.2" fill="currentColor"/><path d="M2.4 14.4a5.6 5.6 0 0 1 11.2 0Z" fill="currentColor"/></svg>',
    flag: '<svg viewBox="0 0 16 16"><path d="M3.6 1.6v12.8" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path d="M4.6 2.6h8l-2.2 2.8 2.2 2.8h-8Z" fill="currentColor"/></svg>',
    eye: '<svg viewBox="0 0 16 16"><path d="M1.6 8s2.4-4.4 6.4-4.4S14.4 8 14.4 8 12 12.4 8 12.4 1.6 8 1.6 8Z" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="8" cy="8" r="2.1" fill="currentColor"/></svg>',
    silhouette: '<svg viewBox="0 0 64 64"><circle cx="32" cy="20" r="11" fill="currentColor"/><path d="M10 56c0-12.2 9.8-22 22-22s22 9.8 22 22Z" fill="currentColor"/></svg>',
    bolt: '<svg viewBox="0 0 16 16"><path d="M9.2 1.2 3.6 9h3.2l-1 5.8L11.4 7H8.2Z" fill="currentColor"/></svg>',
    shield: '<svg viewBox="0 0 16 16"><path d="M8 1.4 13.4 3.4v4.2c0 3.6-2.3 6-5.4 7-3.1-1-5.4-3.4-5.4-7V3.4Z" fill="currentColor"/></svg>'
  };

  function icon(name, cls = '') {
    return `<i class="sd-ic ${cls}" aria-hidden="true">${ICONS[name] || ''}</i>`;
  }

  function coinsHtml(value) {
    return `<span class="sd-coins">${icon('coin')}<b>${num(value, 0)}</b></span>`;
  }

  const state = {
    mode: 'home',
    ws: null,
    wsUrl: normalizeWsUrl(localStorage.getItem('allstarOnlineWsUrl') || defaultWsUrl()),
    name: localStorage.getItem('allstarOnlineName') || '',
    roomCodeInput: '',
    connected: false,
    connecting: false,
    playerId: '',
    playerToken: '',
    roomCode: '',
    room: null,
    game: null,
    error: '',
    notice: '',
    bidValue: 0,
    bidKey: '',
    fx: {
      announce: null,
      dealingUntil: 0,
      revealingUntil: 0,
      announceTimer: null,
      renderTimer: null
    }
  };

  function defaultWsUrl() {
    const host = window.location.hostname;
    if (host === 'localhost' || host.startsWith('127.0.0.1')) return 'ws://127.0.0.1:3001/ws';
    if (host === '143.20.149.27') return 'ws://143.20.149.27/allstar/ws';
    return 'wss://mofi1994.xyz/allstar/ws';
  }

  function normalizeWsUrl(url) {
    url = String(url || '').trim();
    if (window.location.protocol === 'https:' && url === 'ws://143.20.149.27/allstar/ws') {
      return 'wss://mofi1994.xyz/allstar/ws';
    }
    return url;
  }

  function healthUrlFromWsUrl(url) {
    try {
      const endpoint = new URL(url);
      endpoint.protocol = endpoint.protocol === 'wss:' ? 'https:' : 'http:';
      endpoint.pathname = endpoint.pathname.replace(/\/ws\/?$/, '/health');
      endpoint.search = '';
      endpoint.hash = '';
      return endpoint.toString();
    } catch (_) {
      return '';
    }
  }

  async function diagnoseWsFailure(url) {
    const healthUrl = healthUrlFromWsUrl(url);
    if (!healthUrl) return '连接失败，请检查 WebSocket 地址格式';
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4500);
    try {
      const res = await fetch(healthUrl, { cache: 'no-store', signal: controller.signal });
      clearTimeout(timer);
      if (res.ok) {
        return `HTTPS 健康检查可达，但 WebSocket 握手失败。请让对方关闭代理/加速器/浏览器插件后重试，或换一个网络。检测地址: ${healthUrl}`;
      }
      return `服务器健康检查返回 ${res.status}，请稍后重试。检测地址: ${healthUrl}`;
    } catch (_) {
      clearTimeout(timer);
      return `连接失败。请让对方先打开 ${healthUrl}，如果不是 JSON 或打不开，就是对方 DNS/网络/证书没有连到服务器。`;
    }
  }

  function esc(value) {
    if (typeof escapeHtml === 'function') return escapeHtml(String(value == null ? '' : value));
    return String(value == null ? '' : value).replace(/[&<>"']/g, ch => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[ch]));
  }

  function num(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function fmt1(value) {
    const n = num(value, NaN);
    return Number.isFinite(n) ? n.toFixed(1) : '--';
  }

  function managerByIdx(idx) {
    return state.game?.managers?.find(mgr => mgr.idx === idx) || null;
  }

  function myManager() {
    return managerByIdx(state.game?.you?.managerIdx);
  }

  function isDealing() {
    return Date.now() < num(state.fx.dealingUntil, 0);
  }

  function isRevealing() {
    const game = state.game || {};
    return game.awaiting === 'reveal' || Date.now() < num(state.fx.revealingUntil, 0);
  }

  function scheduleFxRender(delay) {
    if (state.fx.renderTimer) window.clearTimeout(state.fx.renderTimer);
    state.fx.renderTimer = window.setTimeout(() => {
      state.fx.renderTimer = null;
      render();
    }, Math.max(0, num(delay, 0)));
  }

  function showAnnounce(announce, hold = 1500) {
    state.fx.announce = announce;
    if (state.fx.announceTimer) window.clearTimeout(state.fx.announceTimer);
    state.fx.announceTimer = window.setTimeout(() => {
      state.fx.announceTimer = null;
      if (state.fx.announce === announce) {
        state.fx.announce = null;
        render();
      }
    }, Math.max(0, num(hold, 1500)));
    render();
  }

  function startDealingFx(game) {
    const pos = game?.pos || '';
    state.fx.dealingUntil = Date.now() + 2150;
    showAnnounce({
      kicker: `位置 ${num(game?.posIndex, 0) + 1}/5`,
      title: `${pos} 开始选牌`,
      sub: `5 张 ${pos} 全明星卡正在从卡堆散开`,
      ic: 'ball'
    }, 1500);
    scheduleFxRender(2160);
  }

  function applyGameFx(prevGame, nextGame) {
    if (!nextGame) return;
    if (nextGame.phase === 'draft') {
      const hasCards = (nextGame.cards || []).length > 0;
      const newPosition = !prevGame
        || prevGame.phase !== 'draft'
        || prevGame.posIndex !== nextGame.posIndex
        || !(prevGame.cards || []).length;
      if (hasCards && newPosition && nextGame.stage === 1) startDealingFx(nextGame);
      if (prevGame?.phase === 'draft' && prevGame.posIndex === nextGame.posIndex && prevGame.stage !== nextGame.stage) {
        if (nextGame.stage === 2) {
          showAnnounce({ kicker: `${nextGame.pos} · 第2轮`, title: '荣誉轮开启', sub: '生涯荣誉揭示,未锁定者可以换卡/截胡/比价', ic: 'medal' }, 1450);
        } else if (nextGame.stage === 3) {
          showAnnounce({ kicker: `${nextGame.pos} · 第3轮`, title: '球队轮开启', sub: '效力球队揭示,这是本位置最后调整机会', ic: 'jersey' }, 1450);
        }
      }
      const wasRevealed = (prevGame?.cards || []).some(card => card.revealed);
      const revealedNow = (nextGame.cards || []).some(card => card.revealed) && !wasRevealed;
      if (revealedNow) {
        state.fx.revealingUntil = Date.now() + 1800;
        showAnnounce({ kicker: `${nextGame.pos} · 揭晓`, title: '身份揭晓', sub: '翻牌!看看每位经理抢到了谁', ic: 'star' }, 1200);
        scheduleFxRender(1810);
      }
    }
    if (prevGame?.phase !== nextGame.phase) {
      if (nextGame.phase === 'era') {
        showAnnounce({ kicker: '五队集结', title: '命运转盘', sub: '等待房主启动年代转盘', ic: 'bolt' }, 1500);
      } else if (nextGame.phase === 'sim') {
        showAnnounce({ kicker: `${nextGame.era?.year || ''} ${nextGame.era?.label || ''}`, title: '82场赛季开打', sub: '服务端正在同步模拟全部赛程', ic: 'ball' }, 1500);
      } else if (nextGame.phase === 'results') {
        showAnnounce({ kicker: '赛季完成', title: '最终结算', sub: '冠军、战绩、球员数据全部生成', ic: 'trophy' }, 1200);
      }
    }
  }

  const STAGE_ICONS = ['chart', 'medal', 'jersey'];
  const FLOW_STEPS = [
    { key: 1, ic: 'chart', label: '① 数据轮', desc: '看数据 · 认领+锁定' },
    { key: 2, ic: 'medal', label: '② 荣誉轮', desc: '荣誉揭示 · 可换/抢/比价' },
    { key: 3, ic: 'jersey', label: '③ 球队轮', desc: '球队揭示 · 最后调整' },
    { key: 4, ic: 'star', label: '④ 揭晓', desc: '翻牌 · 确认归属' }
  ];

  function stageNow() {
    const game = state.game || {};
    if (game.phase !== 'draft') return 4;
    return Math.min(3, Math.max(1, num(game.stage, 1)));
  }

  function flowStepNow() {
    const game = state.game || {};
    if (isRevealing()) return 4;
    return game.cards?.some(card => card.revealed) ? 4 : stageNow();
  }

  function statTone(value, hi, mid) {
    const v = num(value, 0);
    return v >= hi ? 'elite' : v >= mid ? 'good' : '';
  }

  function honorBadgeClass(text) {
    if (/MVP|FMVP|冠军|一阵|得分王/.test(text)) return 'gold';
    if (/防|篮板|助攻|盖帽|抢断|DPOY/.test(text)) return 'cyan';
    if (/较少|暂无/.test(text)) return 'none';
    return 'pri';
  }

  function honorBadgesHtml(summary, max = 8) {
    const parts = String(summary || '').split('/').map(part => part.trim()).filter(Boolean);
    if (!parts.length) return '<span class="sd-honor none">生涯荣誉较少</span>';
    return parts.slice(0, max).map(part => `<span class="sd-honor ${honorBadgeClass(part)}">${esc(part)}</span>`).join('')
      + (parts.length > max ? `<span class="sd-honor none">+${parts.length - max}</span>` : '');
  }

  function managerHoldingCard(idx) {
    return state.game?.cards?.find(card => card.ownerIdx === idx) || null;
  }

  function managerTurnState(mgr) {
    const game = state.game || {};
    if (game.activeIdx === mgr.idx) return { key: 'acting', label: '行动中' };
    if (!mgr.connected) return { key: 'skip', label: '离线' };
    const card = managerHoldingCard(mgr.idx);
    if (stageNow() >= 2 && card?.locked) return { key: 'skip', label: '锁定 · 跳过' };
    if (card) return card.locked ? { key: 'done', label: '✓ 已锁定' } : { key: 'done', label: '✓ 已持卡' };
    return { key: 'wait', label: '待行动' };
  }

  function resultOwner(entry) {
    return {
      name: entry.manager,
      teamName: entry.teamName,
      color: entry.color,
      human: entry.managerIdx === state.game?.you?.managerIdx
    };
  }

  function recordDiff(record) {
    const gp = Math.max(1, num(record?.gp, 82));
    return ((num(record?.pf, 0) - num(record?.pa, 0)) / gp).toFixed(1);
  }

  function stageLabel(game = state.game) {
    if (!game) return '大厅';
    if (game.phase === 'era') return '命运转盘';
    if (game.phase === 'sim') return `${game.era?.year || ''} 赛季直播`;
    if (game.phase === 'results') return '赛季结算';
    return `${game.pos || '--'} · ${STAGE_LABELS[game.stage] || '选牌'}`;
  }

  function switchToShowdown() {
    document.querySelectorAll('.screen-view').forEach(node => {
      const active = node === screenEl;
      node.classList.toggle('hidden', !active);
      node.classList.toggle('active', active);
      node.style.display = active ? '' : 'none';
    });
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  function exitToMenu() {
    if (state.game && state.game.phase !== 'results' && !confirm('返回主菜单将离开当前联网界面，确定吗?')) return;
    if (state.ws) state.ws.close(1000, 'leave');
    state.ws = null;
    state.connected = false;
    state.connecting = false;
    state.mode = 'home';
    state.room = null;
    state.game = null;
    state.error = '';
    root.innerHTML = '';
    const main = document.getElementById('screenMainMenu');
    document.querySelectorAll('.screen-view').forEach(node => {
      const active = node === main;
      node.classList.toggle('hidden', !active);
      node.classList.toggle('active', active);
      node.style.display = active ? '' : 'none';
    });
  }

  function persistInputs() {
    const nameEl = document.getElementById('sdoName');
    const roomEl = document.getElementById('sdoRoomCode');
    const wsEl = document.getElementById('sdoWsUrl');
    if (nameEl) state.name = nameEl.value.trim();
    if (roomEl) state.roomCodeInput = roomEl.value.trim().toUpperCase();
    if (wsEl) state.wsUrl = normalizeWsUrl(wsEl.value);
    localStorage.setItem('allstarOnlineName', state.name);
    localStorage.setItem('allstarOnlineWsUrl', state.wsUrl);
  }

  function cleanName() {
    persistInputs();
    state.name = state.name || `玩家${Math.floor(Math.random() * 90 + 10)}`;
    localStorage.setItem('allstarOnlineName', state.name);
    return state.name;
  }

  function normalizeRoomCode(value) {
    return String(value || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
  }

  function connectSocket() {
    persistInputs();
    if (!state.wsUrl) {
      state.error = '请填写 WebSocket 地址';
      render();
      return Promise.reject(new Error(state.error));
    }
    if (state.ws && state.ws.readyState === WebSocket.OPEN && state.ws.url === state.wsUrl) {
      return Promise.resolve();
    }
    if (state.ws && state.ws.readyState !== WebSocket.CLOSED) {
      state.ws.close(1000, 'switch-url');
    }

    state.connecting = true;
    state.connected = false;
    state.error = '';
    render();

    return new Promise((resolve, reject) => {
      let settled = false;
      let failed = false;
      let ws;
      try {
        ws = new WebSocket(state.wsUrl);
      } catch (err) {
        state.connecting = false;
        state.error = err.message || String(err);
        render();
        reject(err);
        return;
      }

      state.ws = ws;
      ws.addEventListener('open', () => {
        state.connecting = false;
        state.connected = true;
        state.notice = '服务器已连接';
        settled = true;
        render();
        resolve();
      });
      ws.addEventListener('message', event => handleServerMessage(event.data));
      ws.addEventListener('close', () => {
        if (state.ws === ws) {
          state.connected = false;
          state.connecting = false;
          state.notice = '';
          render();
        }
      });
      ws.addEventListener('error', () => {
        if (failed) return;
        failed = true;
        state.connected = false;
        state.connecting = false;
        state.error = '连接失败，正在检测服务器连通性...';
        render();
        diagnoseWsFailure(state.wsUrl).then(message => {
          if (state.ws === ws && !state.connected) {
            state.error = message;
            render();
          }
        });
        if (!settled) {
          settled = true;
          reject(new Error(state.error));
        }
      });
    });
  }

  async function send(type, payload = {}) {
    try {
      await connectSocket();
      if (!state.ws || state.ws.readyState !== WebSocket.OPEN) throw new Error('WebSocket 未连接');
      const roomCode = state.room?.code || state.roomCode || state.roomCodeInput;
      state.error = '';
      state.ws.send(JSON.stringify({ type, roomCode, ...payload }));
    } catch (err) {
      state.error = err.message || String(err);
      render();
    }
  }

  function handleServerMessage(raw) {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch (_) {
      return;
    }
    if (msg.type === 'hello') {
      state.playerId = msg.playerId || state.playerId;
      state.playerToken = msg.playerToken || state.playerToken;
      state.connected = true;
      state.connecting = false;
      state.notice = `${msg.service || 'server'} ${msg.version || ''}`.trim();
    } else if (msg.type === 'room_created' || msg.type === 'room_joined') {
      state.room = msg.room;
      state.roomCode = msg.room?.code || state.roomCode;
      state.playerToken = msg.playerToken || state.playerToken;
      state.mode = 'lobby';
      state.error = '';
    } else if (msg.type === 'room_state') {
      state.room = msg.room || state.room;
      state.roomCode = state.room?.code || state.roomCode;
      state.mode = state.room?.status === 'lobby' ? 'lobby' : 'game';
    } else if (msg.type === 'game_state') {
      const prevGame = state.game;
      state.room = msg.room || state.room;
      state.game = msg.game || state.game;
      state.roomCode = state.room?.code || state.roomCode;
      state.mode = 'game';
      syncBidValue();
      applyGameFx(prevGame, state.game);
    } else if (msg.type === 'error') {
      state.error = msg.message || msg.code || '服务器拒绝了该操作';
    } else if (msg.type === 'pong') {
      state.notice = 'pong';
    }
    render();
  }

  function syncBidValue() {
    const game = state.game;
    const bid = game?.bid;
    if (!game || !bid || !['bid_attack', 'bid_defend'].includes(game.awaiting)) {
      state.bidKey = '';
      return;
    }
    const key = `${game.awaiting}:${bid.cardIdx}:${bid.price}:${game.activeIdx}`;
    if (state.bidKey === key) return;
    state.bidKey = key;
    state.bidValue = bidLimits().min;
  }

  function bidLimits() {
    const game = state.game;
    const bid = game?.bid || {};
    const mgr = myManager();
    const price = num(bid.price, 0);
    if (game?.awaiting === 'bid_defend') return { min: price, max: price + num(mgr?.coins, 0) };
    return { min: price + 1, max: num(mgr?.coins, 0) };
  }

  function topbar() {
    const chipClass = state.connected ? 'ok' : state.connecting ? 'warn' : '';
    const chipText = state.connected ? '已连接' : state.connecting ? '连接中' : '未连接';
    return `
      <header class="sd-topbar glass-panel">
        <div class="sd-topbar-left">
          <button class="manager-back-link" data-sdo="back" type="button">返回主菜单</button>
          <h2>联网争夺战</h2>
        </div>
        <div class="sd-topbar-right">
          <span class="sdo-chip ${chipClass}">${esc(chipText)}</span>
          <span class="sd-stage-chip">${esc(state.room?.code ? `${state.room.code} · ${stageLabel()}` : '联机大厅')}</span>
        </div>
      </header>`;
  }

  function connectionWarning() {
    if (window.location.protocol === 'https:' && state.wsUrl.startsWith('ws://')) {
      return '<div class="sdo-note">当前页面是 HTTPS，浏览器可能会拦截明文 ws。正式联机请使用带 SSL 的域名和 wss 地址。</div>';
    }
    return '';
  }

  function renderHome() {
    return `
      ${topbar()}
      <section class="sdo-home">
        <article class="sdo-panel">
          <h3>创建房间</h3>
          <div class="sdo-form">
            <div class="sdo-field">
              <label for="sdoName">昵称</label>
              <input id="sdoName" maxlength="18" value="${esc(state.name)}" placeholder="输入昵称">
            </div>
            <div class="sdo-field">
              <label for="sdoWsUrl">服务器</label>
              <input id="sdoWsUrl" value="${esc(state.wsUrl)}" spellcheck="false">
            </div>
            ${connectionWarning()}
            ${state.error ? `<div class="sdo-error">${esc(state.error)}</div>` : ''}
            <div class="sdo-actions">
              <button class="manager-btn massive primary" data-sdo="create" type="button">创建房间</button>
              <button class="manager-btn secondary" data-sdo="connect" type="button">测试连接</button>
            </div>
          </div>
        </article>
        <article class="sdo-panel">
          <h3>加入房间</h3>
          <div class="sdo-form">
            <div class="sdo-field">
              <label for="sdoRoomCode">房间码</label>
              <input id="sdoRoomCode" maxlength="6" value="${esc(state.roomCodeInput)}" placeholder="AB12CD" spellcheck="false">
            </div>
            <p>2 到 5 个经理席位，真人玩家至少 2 人。AI 不会自动补位，由房主手动添加。</p>
            <div class="sdo-actions">
              <button class="manager-btn massive secondary" data-sdo="join" type="button">加入房间</button>
            </div>
          </div>
        </article>
      </section>`;
  }

  function renderLobby() {
    const room = state.room;
    if (!room) return renderHome();
    const seats = room.seats || [];
    const humanCount = seats.filter(seat => seat.kind === 'human').length;
    const aiCount = seats.filter(seat => seat.kind === 'ai').length;
    const isHost = room.hostId === state.playerId;
    return `
      ${topbar()}
      <section class="sdo-lobby-grid">
        <main class="sdo-panel">
          <div class="sdo-actions" style="justify-content:space-between;margin-bottom:14px">
            <div>
              <span class="sdo-room-code">${esc(room.code)}</span>
            </div>
            <div class="sdo-actions">
              <button class="manager-btn secondary" data-sdo="copy-code" type="button">复制房间码</button>
              <button class="manager-btn secondary" data-sdo="ping" type="button">Ping</button>
            </div>
          </div>
          <div class="sdo-status-grid">
            <div class="sdo-stat"><span>真人</span><strong>${humanCount} / 5</strong></div>
            <div class="sdo-stat"><span>AI</span><strong>${aiCount}</strong></div>
            <div class="sdo-stat"><span>席位</span><strong>${seats.length} / 5</strong></div>
          </div>
          <div class="sdo-seat-list">
            ${seats.map((seat, index) => renderSeat(seat, index, room)).join('')}
          </div>
        </main>
        <aside class="sdo-panel">
          <h3>房主控制</h3>
          ${isHost ? `
            <div class="sdo-actions">
              <button class="manager-btn secondary" data-sdo="add-ai" type="button" ${seats.length >= 5 ? 'disabled' : ''}>添加 AI</button>
              <button class="manager-btn secondary" data-sdo="remove-ai" type="button" ${aiCount <= 0 ? 'disabled' : ''}>移除 AI</button>
              <button class="manager-btn massive primary" data-sdo="start-game" type="button" ${humanCount < 2 || seats.length < 2 ? 'disabled' : ''}>开始选牌</button>
            </div>
            <p style="margin-top:12px">当前规则不会自动补 AI。需要 AI 时由房主在开局前添加。</p>
          ` : '<p>等待房主添加 AI 或开始游戏。</p>'}
          ${humanCount < 2 ? '<div class="sdo-note" style="margin-top:12px">至少需要 2 名真人玩家才能开始。</div>' : ''}
          ${state.error ? `<div class="sdo-error" style="margin-top:12px">${esc(state.error)}</div>` : ''}
        </aside>
      </section>`;
  }

  function renderSeat(seat, index, room) {
    const color = seat.kind === 'ai' ? '#34d399' : '#22d3ee';
    const role = room.hostId === seat.playerId ? '房主' : seat.kind === 'ai' ? 'AI经理' : '玩家';
    const online = seat.kind === 'ai' || seat.connected;
    return `
      <div class="sdo-seat" style="--mc:${color}">
        <div class="sdo-seat-num">${index + 1}</div>
        <div>
          <div class="sdo-seat-name">${esc(seat.name)}</div>
          <div class="sdo-seat-meta">${esc(role)}</div>
        </div>
        <div class="sdo-seat-state ${online ? '' : 'off'}">${online ? '在线' : '离线'}</div>
      </div>`;
  }

  function renderGame() {
    const game = state.game;
    if (!game) return renderLobby();
    if (game.phase === 'era') return renderEra();
    if (game.phase === 'sim') return renderSim();
    if (game.phase === 'results') return renderResults();
    const dealing = isDealing();
    const revealing = isRevealing();
    return `
      ${topbar()}
      <div class="sd-draft-layout">
        <section class="sd-main">
          ${renderFlowbar()}
          ${renderManagerStrip()}
          <div class="sd-card-stage">
            ${renderStageHeadline()}
            ${dealing ? `
              <div class="sd-deck" aria-hidden="true">
                <i></i><i></i><i></i>
                <span class="sd-deck-label">${icon('ball')}${esc(game.pos || '')} 卡堆</span>
              </div>` : ''}
            <div class="sd-card-grid ${revealing ? 'revealing' : ''} ${dealing ? 'is-dealing' : ''}">
              ${game.cards.map(renderCard).join('')}
            </div>
          </div>
          <div class="sd-action-zone">${renderActionBar()}</div>
        </section>
        <aside class="sd-side">
          <h3>我的阵容</h3>
          ${renderRosters()}
          <h3>实况</h3>
          ${renderLog()}
        </aside>
      </div>
      ${state.error ? `<div class="sdo-error" style="margin-top:14px">${esc(state.error)}</div>` : ''}`;
  }

  function renderFlowbar() {
    const game = state.game || {};
    const stepNow = flowStepNow();
    return `
      <div class="sd-flowbar">
        <div class="sd-flow-pos">
          <span class="sd-flow-pos-big">${esc(game.pos || '--')}</span>
          <span class="sd-flow-pos-sub">位置 ${num(game.posIndex, 0) + 1}/5</span>
          <div class="sd-flow-pos-dots">
            ${SLOTS.map((slot, index) => `<i class="${index < num(game.posIndex, 0) ? 'done' : index === num(game.posIndex, 0) ? 'now' : ''}" title="${esc(slot.short)}"></i>`).join('')}
          </div>
        </div>
        <div class="sd-flow-steps">
          ${FLOW_STEPS.map(step => {
            const cls = stepNow > step.key ? 'done' : stepNow === step.key ? 'now' : '';
            return `
              <div class="sd-flow-step ${cls}">
                <div class="sd-flow-step-head">${icon(step.ic)}${step.label}${cls === 'done' ? '<b>✓</b>' : ''}</div>
                <div class="sd-flow-step-desc">${step.desc}</div>
              </div>`;
          }).join('<span class="sd-flow-link"></span>')}
        </div>
      </div>`;
  }

  function renderStageHeadline() {
    const game = state.game || {};
    if (isDealing()) {
      return `<div class="sd-headline dealing">${icon('ball')}<b>发牌中</b><span>5 张 ${esc(game.pos || '')} 全明星卡正在从卡堆散开...</span></div>`;
    }
    if (isRevealing() || game.cards?.some(card => card.revealed)) {
      return `<div class="sd-headline reveal">${icon('star')}<b>身份揭晓</b><span>翻牌!看看每位经理抢到了谁</span></div>`;
    }
    const stage = stageNow();
    const copy = stage === 1
      ? { b: '第1轮 · 数据轮', s: '只显示巅峰数据 → 按顺序认领一张卡,并决定是否锁定' }
      : stage === 2
        ? { b: '第2轮 · 荣誉轮', s: '生涯荣誉已揭示 → 未锁定者轮流行动: 保持 / 换无主卡 / 截胡未锁卡 / 对锁定卡比价' }
        : { b: '第3轮 · 球队轮(最终轮)', s: '效力球队已揭示 → 最后调整机会,本轮结束后全员强制锁定并翻牌' };
    return `<div class="sd-headline s${stage}">${icon(STAGE_ICONS[stage - 1])}<b>${copy.b}</b><span>${copy.s}</span></div>`;
  }

  function renderManagerStrip() {
    const game = state.game;
    return `
      <div class="sd-mgr-strip" style="grid-template-columns:repeat(${Math.max(2, game.managers.length)},1fr)">
        ${game.managers.map((mgr, orderIdx) => {
          const active = game.activeIdx === mgr.idx;
          const mine = game.you?.managerIdx === mgr.idx;
          const card = game.cards.find(c => c.ownerIdx === mgr.idx);
          const st = managerTurnState(mgr);
          return `
            <div class="sd-mgr ${active ? 'active' : ''} ${mine ? 'human' : ''} st-${st.key}" style="--mc:${mgr.color}">
              <span class="sd-mgr-order">顺位${orderIdx + 1}</span>
              <div class="sd-mgr-ava">${icon(mgr.kind === 'ai' ? 'bot' : 'user')}</div>
              <div class="sd-mgr-info">
                <div class="sd-mgr-name">${esc(mgr.name)}${mine ? '（你）' : ''}</div>
                <div class="sd-mgr-team">${esc(mgr.teamName)}</div>
              </div>
              <div class="sd-mgr-state">
                ${coinsHtml(mgr.coins)}
                <span class="sd-mgr-hold ${card?.locked ? 'lk' : ''}">${card ? `${icon(card.locked ? 'lock' : 'unlock')}${card.no}号` : '未持卡'}</span>
              </div>
              <div class="sd-mgr-turnchip ${st.key}">${st.label}</div>
            </div>`;
        }).join('')}
      </div>`;
  }

  function renderActionBar() {
    const game = state.game;
    if (isDealing()) {
      return `<div class="sd-hint dim">${icon('ball')}正在发牌...</div>`;
    }
    if (isRevealing() || game.awaiting === 'reveal') {
      return `<div class="sd-hint dim">${icon('star')}身份揭晓中...</div>`;
    }
    if (game.awaiting === 'bid_attack' || game.awaiting === 'bid_defend') {
      return `<div class="sd-hint dim">${icon('gavel')}金币比价进行中...</div>`;
    }
    if (!game.you?.canAct) {
      const active = game.activeName ? `等待 ${game.activeName} 操作` : '等待服务端推进';
      const activeMgr = game.managers.find(mgr => mgr.idx === game.activeIdx);
      if (activeMgr && activeMgr.kind !== 'human') {
        return `
          <div class="sd-callout thinking" style="--mc:${activeMgr.color}">
            <div class="sd-callout-ava">${icon('bot')}</div>
            <div class="sd-callout-copy">
              <b>轮到 ${esc(activeMgr.name)}</b>
              <span class="sd-thinking">正在思考<i>.</i><i>.</i><i>.</i></span>
            </div>
          </div>`;
      }
      return `<div class="sd-hint dim">${icon('ball')}${esc(active)}</div>`;
    }
    if (game.awaiting === 'claim') {
      return turnBanner('认领一张卡', '点击任意一张【无主】卡牌,收入囊中');
    }
    if (game.awaiting === 'reclaim') {
      return turnBanner('重新认领', '你的卡被夺走了!点击一张【无主】卡牌补选');
    }
    if (game.awaiting === 'lockchoice') {
      return turnBanner('是否锁定?', '锁定=不能再换,对手要抢必须比价且出价超过卡的当前身价;不锁=下一轮还能换,但可能被免费截胡', `
        <button class="manager-btn primary sd-btn-ic" data-sdo="lock-yes" type="button">${icon('lock')}锁定这张卡</button>
        <button class="manager-btn secondary sd-btn-ic" data-sdo="lock-no" type="button">${icon('unlock')}保持灵活</button>`);
    }
    if (game.awaiting === 'action') {
      const mine = managerHoldingCard(game.you.managerIdx);
      return turnBanner('调整或坚守', '点对手的卡: 未锁定→免费截胡 / 已锁定→金币比价;或处理自己的持卡', `
        <button class="manager-btn primary sd-btn-ic" data-sdo="keep-lock" type="button">${icon('lock')}锁定当前 ${mine ? `${mine.no}号卡` : ''}</button>
        <button class="manager-btn secondary sd-btn-ic" data-sdo="keep" type="button">${icon('eye')}保持观望</button>`);
    }
    return `<div class="sd-hint">${icon('ball')}等待操作</div>`;
  }

  function turnBanner(title, sub, extra = '') {
    return `
      <div class="sd-turn-banner">
        <div class="sd-turn-badge">${icon('user')}<b>你的回合</b></div>
        <div class="sd-turn-copy"><strong>${esc(title)}</strong><span>${esc(sub)}</span></div>
        ${extra ? `<div class="sd-action-row">${extra}</div>` : ''}
      </div>`;
  }

  function renderBidBar() {
    const game = state.game;
    const bid = game.bid || {};
    const isDefend = game.awaiting === 'bid_defend';
    const card = game.cards.find(c => c.idx === bid.cardIdx);
    const limits = bidLimits();
    state.bidValue = clamp(num(state.bidValue, limits.min), limits.min, limits.max);
    return `
      <div class="sd-turn-banner">
        <div class="sd-turn-badge">${isDefend ? '守价' : '挑战'}</div>
        <div class="sd-turn-copy">
          <strong>${isDefend ? '提交防守总承诺' : '提交挑战出价'}</strong>
          <span>${esc(card ? `${card.no}号卡` : '目标卡')} 当前身价 ${num(bid.price, 0)}，可出 ${limits.min} 到 ${limits.max}</span>
        </div>
        <div class="sd-action-row">
          <div class="sdo-bid-box">
            <div class="sd-bid-stepper">
              <button data-sdo="bid-minus" type="button">-</button>
              <input class="sdo-bid-input" id="sdoBidInput" type="number" min="${limits.min}" max="${limits.max}" value="${state.bidValue}">
              <button data-sdo="bid-plus" type="button">+</button>
            </div>
            <div class="sdo-bid-range">${isDefend ? '守方只在超过当前身价时补差价' : '挑战者必须高于当前身价'}</div>
            <button class="manager-btn primary" data-sdo="submit-bid" type="button">确认出价</button>
          </div>
        </div>
      </div>`;
  }

  function renderBidModal() {
    const game = state.game;
    const bid = game?.bid;
    if (!bid || !['bid_attack', 'bid_defend'].includes(game.awaiting)) return '';
    const card = game.cards.find(c => c.idx === bid.cardIdx);
    const challenger = managerByIdx(bid.challengerIdx) || {};
    const defender = managerByIdx(bid.defenderIdx) || {};
    const isDefend = game.awaiting === 'bid_defend';
    const limits = bidLimits();
    state.bidValue = clamp(num(state.bidValue, limits.min), limits.min, limits.max);
    return `
      <div class="sd-modal-bg">
        <div class="sd-modal">
          <h3>${icon('gavel')}金币比价 · ${card ? `${card.no}号卡` : '目标卡'} <span class="sd-price-chip">${icon('coin')}身价 ${num(bid.price, 0)}</span></h3>
          <p class="sd-bid-tip">${isDefend
            ? `<b>${esc(challenger.name)}</b> 想抢走你锁定的卡。你已押 <b>${num(bid.price, 0)}</b> 金币在这张卡上,这里决定总承诺(只补差价)。`
            : `对 <b>${esc(defender.name)}</b> 锁定的卡出价。当前身价 <b>${num(bid.price, 0)}</b>,总出价必须超过身价且高于守方总承诺才能抢到。`}</p>
          <div class="sd-bid-stepper">
            <button data-sdo="bid-minus" type="button" aria-label="减少">-</button>
            <span class="sd-bid-value">${icon('coin')}<input class="sdo-bid-input" id="sdoBidInput" type="number" min="${limits.min}" max="${limits.max}" value="${state.bidValue}"></span>
            <button data-sdo="bid-plus" type="button" aria-label="增加">+</button>
            <em>${isDefend ? `总承诺(范围 ${limits.min}-${limits.max})` : `/ 手上 ${num(myManager()?.coins, 0)} 枚`}</em>
          </div>
          <div class="sd-action-row center">
            <button class="manager-btn primary sd-btn-ic" data-sdo="submit-bid" type="button">${icon(isDefend ? 'shield' : 'gavel')}确认暗价</button>
          </div>
        </div>
      </div>`;
  }

  function cardHint(card) {
    const game = state.game;
    if (isDealing() || isRevealing() || game?.awaiting === 'reveal') return null;
    if (!game?.you?.canAct) return null;
    if ((game.awaiting === 'claim' || game.awaiting === 'reclaim') && card.ownerIdx < 0) {
      return { label: game.awaiting === 'claim' ? '点击认领' : '点击补选', ic: 'star' };
    }
    if (game.awaiting === 'action' && card.ownerIdx !== game.you.managerIdx) {
      if (card.locked && card.ownerIdx >= 0) return myManager()?.coins >= card.price + 1 ? { label: `比价 ≥${card.price + 1}`, ic: 'gavel' } : null;
      if (!card.locked) return card.ownerIdx >= 0 ? { label: '点击截胡', ic: 'bolt' } : { label: '点击换取', ic: 'swap' };
    }
    return null;
  }

  function renderCard(card) {
    const hint = cardHint(card);
    const owner = managerByIdx(card.ownerIdx);
    const cls = ['sd-card', 'sdo-card'];
    if (card.locked) cls.push('locked');
    if (card.ownerIdx >= 0) cls.push('owned');
    if (card.revealed) cls.push('revealed');
    if (card.ownerIdx === state.game?.you?.managerIdx) cls.push('is-mine');
    if (isDealing()) cls.push('dealing');
    if (hint) cls.push('actionable');
    const stats = card.stats || {};
    const stage = stageNow();
    const player = card.player || {};
    const fallbackPhoto = typeof getPlayerPhotoPath === 'function' ? getPlayerPhotoPath(0) : 'assets/images/Player/IMG0000.png';
    const photoSrc = typeof getPlayerPhotoSrc === 'function' ? getPlayerPhotoSrc(player) : fallbackPhoto;
    return `
      <div class="${cls.join(' ')}" data-card="${card.idx}" style="--di:${card.idx}">
        ${owner ? `<div class="sd-owner-ribbon" style="--mc:${owner.color}">${icon(owner.kind === 'ai' ? 'bot' : 'user')}${esc(owner.name)}${card.price ? ` <span class="sd-rib-cost">${icon('coin')}${card.price}</span>` : ''}</div>`
        : `<div class="sd-owner-ribbon free">${icon('eye')}无主</div>`}
        <div class="sd-card-inner">
          <div class="sd-card-back">
            <div class="sd-card-head">
              <span class="sd-card-no">${icon('ball')}${card.no}号卡</span>
              ${card.locked ? `<span class="sd-lock">${icon('lock')}已锁定</span>` : `<span class="sd-lock open">${icon('unlock')}可争夺</span>`}
            </div>
            <div class="sd-mystery">${icon('silhouette', 'big')}<em>神秘全明星</em></div>
            <div class="sd-sec">
              <div class="sd-sec-title on">${icon('chart')}巅峰数据</div>
              <div class="sd-stat-main">
                <div class="${statTone(stats.ppg, 27, 20)}"><strong>${fmt1(stats.ppg)}</strong><span>得分</span></div>
                <div class="${statTone(stats.rpg, 10, 7)}"><strong>${fmt1(stats.rpg)}</strong><span>篮板</span></div>
                <div class="${statTone(stats.apg, 8, 5.5)}"><strong>${fmt1(stats.apg)}</strong><span>助攻</span></div>
              </div>
              <div class="sd-stat-sub">
                <span>断 <b>${fmt1(stats.spg)}</b></span>
                <span>帽 <b>${fmt1(stats.bpg)}</b></span>
                <span>命中 <b>${fmt1(stats.fgPct)}%</b></span>
                <span>三分 <b>${num(stats.tpPct, 0) > 0 ? `${fmt1(stats.tpPct)}%` : '--'}</b></span>
              </div>
            </div>
            <div class="sd-sec ${card.honors ? (stage === 2 ? 'new-info' : '') : 'sealed'}">
              <div class="sd-sec-title ${card.honors ? 'on' : ''}">${icon('medal')}生涯荣誉${card.honors ? '' : '<em>荣誉轮揭示</em>'}</div>
              ${card.honors ? `<div class="sd-honor-row">${honorBadgesHtml(card.honors)}</div>` : ''}
            </div>
            <div class="sd-sec ${card.peak ? 'new-info' : 'sealed'}">
              <div class="sd-sec-title ${card.peak ? 'on' : ''}">${icon('jersey')}效力球队${card.peak ? '' : '<em>球队轮揭示</em>'}</div>
              ${card.peak ? `<div class="sd-team-row">${esc(card.peak)}</div>` : ''}
            </div>
            ${hint ? `<div class="sd-act-hint">${icon(hint.ic)}${esc(hint.label)}</div>` : ''}
          </div>
          ${card.revealed ? `
            <div class="sd-card-front">
              <img class="sd-photo" src="${esc(photoSrc)}" alt="" onerror="this.src='${esc(fallbackPhoto)}'">
              <div class="sd-front-name">${esc(card.name || '全明星')}</div>
              <div class="sd-front-sub">${esc(card.peak || '')}</div>
              <div class="sd-front-ovr">OVR <b>${num(player.rating, 0)}</b></div>
            </div>
          ` : ''}
        </div>
        <div class="sd-sleeve" aria-hidden="true">
          <svg viewBox="0 0 200 300" preserveAspectRatio="none">
            <defs>
              <linearGradient id="slv" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stop-color="#1c2c4e"/><stop offset="55%" stop-color="#101a30"/><stop offset="100%" stop-color="#0a1120"/>
              </linearGradient>
            </defs>
            <rect width="200" height="300" rx="14" fill="url(#slv)" stroke="#3b5a8a" stroke-width="2"/>
            <circle cx="100" cy="132" r="52" fill="none" stroke="#fbbf24" stroke-width="2.5" opacity="0.85"/>
            <path d="M100 80v104M48 132h104M63 95c20 20 54 20 74 0M63 169c20-20 54-20 74 0" fill="none" stroke="#fbbf24" stroke-width="2" opacity="0.7"/>
            <path d="m100 118 4.6 9.6 10.6 1.2-7.9 7.2 2.2 10.5-9.5-5.4-9.5 5.4 2.2-10.5-7.9-7.2 10.6-1.2Z" fill="#fbbf24"/>
            <text x="100" y="228" text-anchor="middle" font-size="17" font-weight="900" fill="#e9f2f9" letter-spacing="3">ALL-STAR</text>
            <text x="100" y="250" text-anchor="middle" font-size="11" fill="#7b93ab" letter-spacing="2">1996 - 2025</text>
            <rect x="8" y="8" width="184" height="284" rx="10" fill="none" stroke="#fbbf24" stroke-width="1" opacity="0.35" stroke-dasharray="4 5"/>
          </svg>
        </div>
      </div>`;
  }

  function renderHonors(text) {
    return `<div class="sd-honor-row">${honorBadgesHtml(text)}</div>`;
  }

  function renderRosters() {
    const game = state.game;
    const idx = Math.max(0, num(game.you?.managerIdx, 0));
    const roster = game.rosters[idx] || game.rosters[0] || { players: [] };
    return `
      <div class="sd-roster">
        ${SLOTS.map((slot, slotIdx) => {
          const player = roster.players?.[slotIdx];
          return `
            <div class="sd-roster-row ${player ? 'filled' : ''} ${slotIdx === num(game.posIndex, -1) && game.phase === 'draft' ? 'now' : ''}">
              <span class="sd-roster-pos">${slot.short}</span>
              <span class="sd-roster-name">${player ? esc(player.name) : (slotIdx === num(game.posIndex, -1) ? '选秀中...' : '待选')}</span>
              <span class="sd-roster-src">${player ? `${esc(player.peak)}${player.price ? ` ${coinsHtml(player.price)}` : ''}` : ''}</span>
            </div>`;
        }).join('')}
      </div>`;
  }

  function renderLog() {
    const logs = state.game?.log || [];
    if (!logs.length) return '<div class="sd-log"><div class="sd-log-line">等待第一条日志</div></div>';
    return `
      <div class="sd-log">
        ${logs.slice(0, 12).map(item => `<div class="sd-log-line ${esc(item.kind || '')}">${icon({ me: 'user', ai: 'bot', duel: 'gavel', stage: 'flag', reveal: 'star', info: 'ball' }[item.kind] || 'ball')}<span>${esc(item.text)}</span></div>`).join('')}
      </div>`;
  }

  function renderEra() {
    const game = state.game;
    const picked = game.era || null;
    return `
      ${topbar()}
      <div class="sd-era-layout">
        <h2 class="sd-era-title">${picked ? `命运降临 · ${picked.year} ${esc(picked.label)}` : '五支梦之队集结完毕'}</h2>
        <p class="sd-era-sub">${picked ? esc(picked.desc) : '由房主启动服务端年代转盘，所有玩家看到同一个年代结果'}</p>
        <div class="sd-era-wheel ${picked ? 'landed' : ''}">
          ${ERAS.map(era => `
            <div class="sd-era-card ${picked && picked.year === era.year ? 'final' : ''}">
              <span class="sd-era-year">${era.year}</span>
              <span class="sd-era-label">${esc(era.label)}</span>
              <span class="sd-era-desc">${esc(era.desc)}</span>
            </div>
          `).join('')}
        </div>
        ${game.you?.canRollEra ? `<button class="manager-btn massive primary sd-btn-ic" data-sdo="roll-era" type="button">${icon('bolt')}启动命运转盘</button>` : ''}
        ${!game.you?.canRollEra && !picked ? `<div class="sd-hint dim">${icon('ball')}等待房主启动年代转盘</div>` : ''}
        ${picked ? `<div class="sd-era-go">正在空降 ${picked.year} 联盟,所有玩家同步开打 82 场...</div>` : ''}
        <div class="sd-recap-grid">
          ${game.rosters.map(roster => `
            <div class="sd-recap-team" style="--mc:${roster.color}">
              <div class="sd-recap-head">${icon(roster.managerIdx === game.you?.managerIdx ? 'user' : 'bot')}<b>${esc(roster.manager)} · ${esc(roster.teamName)}</b><em>${roster.players.filter(Boolean).length}/5</em></div>
              <div class="sd-recap-players">
                ${roster.players.filter(Boolean).map(player => `<span><b>${esc(player.slot)}</b> ${esc(player.name)}</span>`).join('')}
              </div>
            </div>
          `).join('')}
        </div>
      </div>`;
  }

  function renderSim() {
    const game = state.game;
    const rows = [...(game.simRows || [])].sort((a, b) => num(b.w, 0) - num(a.w, 0) || num(b.derbyW, 0) - num(a.derbyW, 0));
    const maxW = Math.max(1, ...rows.map(row => num(row.w, 0)));
    return `
      ${topbar()}
      <div class="sd-sim-layout">
        <div class="sd-sim-head">
          <h2>${icon('ball')}${game.era ? `${game.era.year} ${esc(game.era.label)} · 五队争霸直播` : '服务端赛季模拟'}</h2>
          <span class="sd-sim-round">ROUND ${num(game.simRound, 0)} / 82</span>
          <span class="live-pill">LIVE</span>
        </div>
        <div class="sd-sim-progress"><i style="width:${(num(game.simRound, 0) / 82 * 100).toFixed(1)}%"></i></div>
        <div class="sd-race">
          ${rows.map((row, index) => {
            const pct = (num(row.w, 0) / maxW * 100).toFixed(1);
            const last = row.last || null;
            const isMine = row.managerIdx === game.you?.managerIdx;
            return `
              <div class="sd-race-row ${isMine ? 'human' : ''} ${index === 0 ? 'leader' : ''}" style="--mc:${row.color}">
                <span class="sd-race-rank">${index === 0 ? icon('crown') : `#${index + 1}`}</span>
                <span class="sd-race-team">${esc(row.teamName)}<small>${icon(isMine ? 'user' : 'bot')}${esc(row.manager)}</small></span>
                <span class="sd-race-bar"><i style="width:${pct}%"></i></span>
                <span class="sd-race-rec">${num(row.w, 0)}<em>胜</em>${num(row.l, 0)}<em>负</em></span>
                <span class="sd-race-last ${last?.win ? 'w' : 'l'} ${last?.derby ? 'derby' : ''}">
                  ${last ? `${last.derby ? icon('gavel') : ''}${last.win ? 'W' : 'L'} ${last.my}-${last.opp} ${last.home ? 'vs' : '@'} ${esc(last.oppName)}` : '--'}
                </span>
                <span class="sd-race-streak">${num(row.streak, 0) > 2 ? `${icon('bolt')}${num(row.streak, 0)}连胜` : num(row.streak, 0) < -2 ? `${-num(row.streak, 0)}连败` : `德比 ${num(row.derbyW, 0)}-${num(row.derbyL, 0)}`}</span>
              </div>`;
          }).join('')}
        </div>
        <div class="sim-actions">
          ${game.you?.canSkipSim ? `<button class="manager-btn ghost" data-sdo="skip-sim" type="button">${game.skipSim ? '⏩ 快进中...' : '⏩ 跳过动画,直接看结果'}</button>` : ''}
        </div>
      </div>`;
  }

  function renderStandingsPreview() {
    const standings = state.game?.standings || [];
    if (!standings.length) return '';
    return `
      <article class="sdo-panel">
        <h3>联盟实时前十</h3>
        ${standings.slice(0, 10).map(row => `
          <div class="award-row ${row.kind === 'manager' ? 'sd-standing-us' : ''}">
            <span>#${row.rank} ${esc(row.name)}</span>
            <strong>${num(row.w, 0)}-${num(row.l, 0)}</strong>
          </div>
        `).join('')}
      </article>`;
  }

  function renderResults() {
    const game = state.game;
    const entries = game?.result?.entries || [];
    const champ = entries[0];
    const era = game?.result?.era || game?.era || {};
    const standings = game?.result?.standings || game?.standings || [];
    return `
      ${topbar()}
      <div class="sd-results">
        ${champ ? `
          <section class="sd-champ-hero" style="--mc:${champ.color}">
            <div class="sd-confetti" aria-hidden="true">${Array.from({ length: 14 }, (_, i) => `<i style="--ci:${i}"></i>`).join('')}</div>
            <div class="sd-champ-trophy">${icon('trophy', 'huge')}</div>
            <div class="sd-champ-copy">
              <p class="sd-champ-kicker">${era.year ? `${era.year} ${esc(era.label)}` : 'ONLINE ALL-STAR SHOWDOWN'} · 最强球队</p>
              <h2>${esc(champ.teamName)}</h2>
              <p class="sd-champ-sub">${esc(champ.manager)} · 战绩 ${num(champ.record?.w, 0)}-${num(champ.record?.l, 0)} · 德比 ${num(champ.derbyW, 0)}-${num(champ.derbyL, 0)} · 联盟第 ${num(champ.leagueRank, 0)}</p>
              <p class="sd-champ-motto">联网对局 · 服务端权威模拟</p>
            </div>
            <div class="grade-stamp ${esc(champ.grade?.cls || '')}">
              <span class="grade-letter">${esc(champ.grade?.letter || '#1')}</span>
              <span class="grade-sub">${num(champ.record?.w, 0)} WINS</span>
            </div>
          </section>` : ''}

        <section class="sd-podium">
          ${entries.map(entry => `
            <div class="sd-podium-row ${entry.rank === 1 ? 'first' : ''} ${entry.managerIdx === game.you?.managerIdx ? 'human' : ''}" style="--mc:${entry.color}">
              <span class="sd-podium-rank">${entry.rank === 1 ? icon('crown') : `#${entry.rank}`}</span>
              <span class="sd-podium-team">${esc(entry.teamName)}<small>${esc(entry.manager)}</small></span>
              <span class="sd-podium-rec">${num(entry.record?.w, 0)}-${num(entry.record?.l, 0)}</span>
              <span class="sd-podium-derby">德比 ${num(entry.derbyW, 0)}-${num(entry.derbyL, 0)}</span>
              <span class="sd-podium-diff">净胜 ${recordDiff(entry.record)}</span>
              <span class="sd-podium-rank2">联盟第${num(entry.leagueRank, 0)}</span>
              <span class="sd-podium-coin">${coinsHtml(entry.coinsLeft)}</span>
              <span class="sd-podium-grade ${esc(entry.grade?.cls || '')}">${esc(entry.grade?.letter || '')}</span>
            </div>
          `).join('')}
        </section>

        ${entries.map(entry => `
          <article class="result-card full sd-team-card ${entry.managerIdx === game.you?.managerIdx ? 'human' : ''}" style="--mc:${entry.color}">
            <h3>${entry.rank === 1 ? '🏆 ' : `#${entry.rank} `}${esc(entry.teamName)} <small>· ${esc(entry.manager)} · ${num(entry.record?.w, 0)}-${num(entry.record?.l, 0)} · 花费💰${num(entry.coinsSpent, 0)}</small></h3>
            <div class="tbl"><table>
              <thead><tr><th>位置</th><th>球员</th><th>巅峰来源</th><th>获得方式</th><th>GP</th><th>MIN</th><th>PTS</th><th>REB</th><th>AST</th><th>STL</th><th>BLK</th><th>FG%</th><th>3P%</th></tr></thead>
              <tbody>
                ${(entry.players || []).map(player => `
                  <tr>
                    <td>${esc(player.slot)}</td>
                    <td class="sd-res-name">${esc(player.name)}</td>
                    <td>${esc(player.peak || '--')}</td>
                    <td>${esc(acquiredText(player))}</td>
                    <td>${num(player.gp, 0)}</td>
                    <td>${fmt1(player.mpg)}</td>
                    <td>${fmt1(player.ppg)}</td>
                    <td>${fmt1(player.rpg)}</td>
                    <td>${fmt1(player.apg)}</td>
                    <td>${fmt1(player.spg)}</td>
                    <td>${fmt1(player.bpg)}</td>
                    <td>${player.fgPct ?? '--'}</td>
                    <td>${player.tpPct ?? '--'}</td>
                  </tr>`).join('')}
              </tbody>
            </table></div>
          </article>
        `).join('')}

        <div class="results-grid">
          <article class="result-card">
            <h3>金币账本</h3>
            ${entries.map(entry => `
              <div class="award-row"><span>${esc(entry.manager)}</span><strong>花 ${num(entry.coinsSpent, 0)} / 剩 ${num(entry.coinsLeft, 0)}</strong></div>`).join('')}
            ${renderDuelRecapInline()}
          </article>
          <article class="result-card">
            <h3>${era.year ? `${era.year} ` : ''}联盟格局</h3>
            ${standings.slice(0, 10).map((row, index) => `
              <div class="award-row ${row.kind === 'manager' ? 'sd-standing-us' : ''}">
                <span>#${row.rank || index + 1} ${esc(row.name || row.z || row.n || '')}</span><strong>${num(row.w, 0)}-${num(row.l, 0)}</strong>
              </div>`).join('')}
          </article>
        </div>

        <footer class="results-footer">
          <button class="manager-btn massive secondary sd-btn-ic" data-sdo="back" type="button">${icon('flag')}返回主菜单</button>
        </footer>
      </div>`;
  }

  function renderFinalStandings() {
    const standings = state.game?.result?.standings || state.game?.standings || [];
    if (!standings.length) return '';
    return `
      <article class="sdo-panel">
        <h3>联盟格局</h3>
        ${standings.slice(0, 12).map(row => `
          <div class="award-row ${row.kind === 'manager' ? 'sd-standing-us' : ''}">
            <span>#${row.rank} ${esc(row.name)}</span>
            <strong>${num(row.w, 0)}-${num(row.l, 0)}</strong>
          </div>
        `).join('')}
      </article>`;
  }

  function acquiredText(player) {
    if (!player) return '';
    if (player.acquiredBy === 'duel') return `比价夺得${player.price ? ` 💰${player.price}` : ''}`;
    if (player.acquiredBy === 'steal') return '中途截胡';
    if (player.acquiredBy === 'reclaim') return '被抢后补选';
    return player.price ? `防守保住 💰${player.price}` : '直接认领';
  }

  function renderDuelRecapInline() {
    const duels = state.game?.result?.duels || state.game?.duels || [];
    if (!duels.length) return '<p class="sd-duel-recap">全程和平,无人开启金币战争</p>';
    const biggest = [...duels].sort((a, b) => Math.max(num(b.cBid, 0), num(b.dBid, 0)) - Math.max(num(a.cBid, 0), num(a.dBid, 0)))[0];
    return `<p class="sd-duel-recap">共发生 ${duels.length} 次金币争夺${biggest ? `,最大手笔: ${esc(biggest.winner)} 为 ${esc(biggest.card)} 掷出 ${Math.max(num(biggest.cBid, 0), num(biggest.dBid, 0))} 金币` : ''}</p>`;
  }

  function renderDuelRecap() {
    const duels = state.game?.result?.duels || state.game?.duels || [];
    if (!duels.length) return '';
    return `
      <article class="sdo-panel">
        <h3>金币比价记录</h3>
        <div class="sd-log">
          ${duels.slice(0, 12).map(duel => `
            <div class="sd-log-line duel">${esc(duel.pos)} ${esc(duel.card)}: ${esc(duel.challenger)} ${duel.cBid} vs ${esc(duel.defender)} ${duel.dBid}，${esc(duel.winner)}胜出</div>
          `).join('')}
        </div>
      </article>`;
  }

  function renderAnnounce() {
    const a = state.fx.announce;
    if (!a) return '';
    return `
      <div class="sd-announce-bg">
        <div class="sd-announce">
          <div class="sd-announce-ic">${icon(a.ic || 'flag')}</div>
          ${a.kicker ? `<p class="sd-announce-kicker">${esc(a.kicker)}</p>` : ''}
          <h2 class="sd-announce-title">${esc(a.title)}</h2>
          ${a.sub ? `<p class="sd-announce-sub">${esc(a.sub)}</p>` : ''}
        </div>
      </div>`;
  }

  function render() {
    if (state.mode === 'home') {
      root.innerHTML = `<div class="sdo-wrap">${renderHome()}</div>`;
    } else if (state.mode === 'lobby') {
      root.innerHTML = `<div class="sdo-wrap">${renderLobby()}</div>`;
    } else {
      root.innerHTML = `<div class="sd-wrap">${renderGame()}${renderBidModal()}${renderAnnounce()}</div>`;
    }
    bindEvents();
  }

  function bindEvents() {
    root.querySelectorAll('[data-sdo]').forEach(node => {
      node.addEventListener('click', () => handleAction(node.getAttribute('data-sdo')));
    });
    root.querySelectorAll('[data-card]').forEach(node => {
      node.addEventListener('click', () => handleCardClick(num(node.getAttribute('data-card'), -1)));
    });
    const bidInput = document.getElementById('sdoBidInput');
    if (bidInput) {
      bidInput.addEventListener('input', () => {
        const limits = bidLimits();
        state.bidValue = clamp(num(bidInput.value, limits.min), limits.min, limits.max);
        bidInput.value = String(state.bidValue);
      });
    }
    const roomInput = document.getElementById('sdoRoomCode');
    if (roomInput) {
      roomInput.addEventListener('input', () => {
        roomInput.value = normalizeRoomCode(roomInput.value);
        state.roomCodeInput = roomInput.value;
      });
    }
  }

  function handleAction(action) {
    switch (action) {
      case 'back':
        exitToMenu();
        break;
      case 'connect':
        connectSocket().catch(() => {});
        break;
      case 'create':
        send('create_room', { name: cleanName() });
        break;
      case 'join': {
        const code = normalizeRoomCode(document.getElementById('sdoRoomCode')?.value || state.roomCodeInput);
        state.roomCodeInput = code;
        if (code.length !== 6) {
          state.error = '请输入 6 位房间码';
          render();
          return;
        }
        send('join_room', { roomCode: code, name: cleanName() });
        break;
      }
      case 'copy-code':
        if (state.room?.code && navigator.clipboard) navigator.clipboard.writeText(state.room.code).catch(() => {});
        state.notice = '房间码已复制';
        render();
        break;
      case 'ping':
        send('ping');
        break;
      case 'add-ai':
        send('add_ai');
        break;
      case 'remove-ai':
        send('remove_ai');
        break;
      case 'start-game':
        send('start_game');
        break;
      case 'roll-era':
        send('roll_era');
        break;
      case 'skip-sim':
        send('skip_sim');
        break;
      case 'lock-yes':
        send('choose_lock', { lock: true });
        break;
      case 'lock-no':
        send('choose_lock', { lock: false });
        break;
      case 'keep':
        send('keep');
        break;
      case 'keep-lock':
        send('keep_lock');
        break;
      case 'bid-minus':
      case 'bid-plus': {
        const limits = bidLimits();
        const delta = action === 'bid-plus' ? 1 : -1;
        state.bidValue = clamp(num(state.bidValue, limits.min) + delta, limits.min, limits.max);
        render();
        break;
      }
      case 'submit-bid': {
        const input = document.getElementById('sdoBidInput');
        const limits = bidLimits();
        state.bidValue = clamp(num(input?.value, state.bidValue), limits.min, limits.max);
        send('submit_bid', { bid: state.bidValue });
        break;
      }
      default:
        break;
    }
  }

  function handleCardClick(cardIdx) {
    const game = state.game;
    const card = game?.cards?.find(c => c.idx === cardIdx);
    if (isDealing() || isRevealing() || game?.awaiting === 'reveal') return;
    if (!game?.you?.canAct || !card) return;
    if (game.awaiting === 'claim' && card.ownerIdx < 0) {
      send('claim_card', { cardIdx });
    } else if (game.awaiting === 'reclaim' && card.ownerIdx < 0) {
      send('reclaim_card', { cardIdx });
    } else if (game.awaiting === 'action' && card.ownerIdx !== game.you.managerIdx) {
      if (card.locked && card.ownerIdx >= 0) send('challenge_card', { cardIdx });
      else if (!card.locked) send('take_card', { cardIdx });
    }
  }

  const prevRenderText = window.render_game_to_text;
  window.render_game_to_text = function () {
    if (state.mode !== 'home' && state.room) {
      return JSON.stringify({
        mode: 'allstar_showdown_online',
        room: state.room,
        game: state.game,
        connected: state.connected,
        error: state.error
      }, null, 1);
    }
    return typeof prevRenderText === 'function' ? prevRenderText() : '{}';
  };

  entryBtn.addEventListener('click', () => {
    switchToShowdown();
    state.mode = state.room ? (state.room.status === 'lobby' ? 'lobby' : 'game') : 'home';
    render();
  });
})();
