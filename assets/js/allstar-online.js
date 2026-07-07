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
    bidKey: ''
  };

  function defaultWsUrl() {
    const host = window.location.hostname;
    if (host === 'localhost' || host.startsWith('127.0.0.1')) return 'ws://127.0.0.1:3001/ws';
    if (host === '143.20.149.27') return 'ws://143.20.149.27/allstar/ws';
    return 'wss://mofi1994.xyz/allstar/ws';
  }

  function normalizeWsUrl(url) {
    if (window.location.protocol === 'https:' && url === 'ws://143.20.149.27/allstar/ws') {
      return 'wss://mofi1994.xyz/allstar/ws';
    }
    return url;
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
    if (wsEl) state.wsUrl = wsEl.value.trim();
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
        state.connected = false;
        state.connecting = false;
        state.error = '连接失败，请检查服务器地址或防火墙';
        render();
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
      state.room = msg.room || state.room;
      state.game = msg.game || state.game;
      state.roomCode = state.room?.code || state.roomCode;
      state.mode = 'game';
      syncBidValue();
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
    return `
      ${topbar()}
      ${renderFlowbar()}
      ${renderManagerStrip()}
      <div class="sd-draft-layout">
        <main>
          ${renderActionBar()}
          <div class="sd-card-stage" style="margin-top:12px">
            <div class="sd-card-grid">
              ${game.cards.map(renderCard).join('')}
            </div>
          </div>
        </main>
        <aside class="sd-side">
          <h3>阵容与日志</h3>
          ${renderRosters()}
          ${renderLog()}
        </aside>
      </div>
      ${state.error ? `<div class="sdo-error" style="margin-top:14px">${esc(state.error)}</div>` : ''}`;
  }

  function renderFlowbar() {
    const game = state.game || {};
    const dots = SLOTS.map((slot, index) => {
      const cls = index < num(game.posIndex, 0) ? 'done' : index === num(game.posIndex, 0) ? 'now' : '';
      return `<i class="${cls}" title="${esc(slot.short)}"></i>`;
    }).join('');
    return `
      <div class="sd-flowbar">
        <div class="sd-flow-pos">
          <div class="sd-flow-pos-big">${esc(game.pos || '--')}</div>
          <div class="sd-flow-pos-sub">${esc(game.posName || '')}</div>
          <div class="sd-flow-pos-dots">${dots}</div>
        </div>
        <div class="sd-flow-steps">
          ${[1, 2, 3].map(stage => `
            <div class="sd-flow-step ${stage < game.stage ? 'done' : stage === game.stage ? 'now' : ''}">
              <div class="sd-flow-step-head">第${stage}轮${stage < game.stage ? '<b>✓</b>' : ''}</div>
              <div class="sd-flow-step-desc">${STAGE_LABELS[stage]}</div>
            </div>
            ${stage < 3 ? '<div class="sd-flow-link"></div>' : ''}
          `).join('')}
        </div>
      </div>`;
  }

  function renderManagerStrip() {
    const game = state.game;
    return `
      <div class="sd-mgr-strip" style="grid-template-columns:repeat(${Math.max(2, game.managers.length)},1fr)">
        ${game.managers.map(mgr => {
          const active = game.activeIdx === mgr.idx;
          const mine = game.you?.managerIdx === mgr.idx;
          const card = game.cards.find(c => c.ownerIdx === mgr.idx);
          return `
            <div class="sd-mgr ${active ? 'active' : ''} ${mine ? 'human' : ''}" style="--mc:${mgr.color}">
              <span class="sd-mgr-order">席位${mgr.idx + 1}</span>
              <div class="sd-mgr-ava">${mgr.kind === 'ai' ? 'AI' : 'P'}</div>
              <div class="sd-mgr-info">
                <div class="sd-mgr-name">${esc(mgr.name)}${mine ? '（你）' : ''}</div>
                <div class="sd-mgr-team">${esc(mgr.teamName)}</div>
              </div>
              <div class="sd-mgr-state">
                <span class="sd-coins"><b>${num(mgr.coins, 0)}</b>金币</span>
                <span class="sd-mgr-hold ${card?.locked ? 'lk' : ''}">${card ? `${card.no}号${card.locked ? ' 已锁' : ''}` : '未持卡'}</span>
              </div>
              <div class="sd-mgr-turnchip ${active ? 'acting' : 'wait'}">${active ? '行动中' : (mgr.connected ? '待命' : '离线')}</div>
            </div>`;
        }).join('')}
      </div>`;
  }

  function renderActionBar() {
    const game = state.game;
    if (!game.you?.canAct) {
      const active = game.activeName ? `等待 ${game.activeName} 操作` : '等待服务端推进';
      return `<div class="sd-hint dim">${esc(active)}</div>`;
    }
    if (game.awaiting === 'claim') {
      return turnBanner('认领一张卡', '点击任意无主卡，随后决定是否锁定。');
    }
    if (game.awaiting === 'reclaim') {
      return turnBanner('重新认领', '你的上一张卡被抢走了，从无主卡里选一张补回。');
    }
    if (game.awaiting === 'lockchoice') {
      return turnBanner('是否锁定当前卡', '锁定后只能被金币比价抢走；不锁定则下一轮仍可调整。', `
        <button class="manager-btn primary" data-sdo="lock-yes" type="button">锁定</button>
        <button class="manager-btn secondary" data-sdo="lock-no" type="button">暂不锁</button>`);
    }
    if (game.awaiting === 'action') {
      return turnBanner('行动回合', '保留当前卡，或点击场上的其他卡进行换取、截胡、比价。', `
        <button class="manager-btn primary" data-sdo="keep-lock" type="button">锁定当前卡</button>
        <button class="manager-btn secondary" data-sdo="keep" type="button">保持观望</button>`);
    }
    if (game.awaiting === 'bid_attack' || game.awaiting === 'bid_defend') {
      return renderBidBar();
    }
    return `<div class="sd-hint">等待操作</div>`;
  }

  function turnBanner(title, sub, extra = '') {
    return `
      <div class="sd-turn-banner">
        <div class="sd-turn-badge">你的回合</div>
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

  function cardHint(card) {
    const game = state.game;
    if (!game?.you?.canAct) return null;
    if ((game.awaiting === 'claim' || game.awaiting === 'reclaim') && card.ownerIdx < 0) {
      return game.awaiting === 'claim' ? '认领' : '重选';
    }
    if (game.awaiting === 'action' && card.ownerIdx !== game.you.managerIdx) {
      if (card.locked && card.ownerIdx >= 0) return myManager()?.coins >= card.price + 1 ? `比价 ${card.price + 1}+` : null;
      if (!card.locked) return card.ownerIdx >= 0 ? '截胡' : '换取';
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
    if (hint) cls.push('actionable');
    const stats = card.stats || {};
    return `
      <div class="${cls.join(' ')}" data-card="${card.idx}" style="--di:${card.idx}">
        ${owner ? `<div class="sd-owner-ribbon" style="--mc:${owner.color}">${esc(owner.name)}${card.price ? ` · ${card.price}金` : ''}</div>`
        : '<div class="sd-owner-ribbon free">无主</div>'}
        <div class="sd-card-inner">
          <div class="sd-card-back">
            <div class="sd-card-head">
              <span class="sd-card-no">${card.no}号卡</span>
              <span class="sdo-card-label">${card.locked ? '已锁定' : '可争夺'}</span>
            </div>
            <div class="sdo-card-title">${esc(card.revealed ? card.name : '神秘全明星')}</div>
            <div class="sdo-card-sub">${esc(card.peak || '球队轮揭示峰值赛季')}</div>
            <div class="sd-sec">
              <div class="sd-sec-title on">巅峰数据</div>
              <div class="sd-stat-main">
                <div><strong>${fmt1(stats.ppg)}</strong><span>得分</span></div>
                <div><strong>${fmt1(stats.rpg)}</strong><span>篮板</span></div>
                <div><strong>${fmt1(stats.apg)}</strong><span>助攻</span></div>
              </div>
              <div class="sd-stat-sub">
                <span>断 <b>${fmt1(stats.spg)}</b></span>
                <span>帽 <b>${fmt1(stats.bpg)}</b></span>
                <span>命中 <b>${fmt1(stats.fgPct)}%</b></span>
                <span>三分 <b>${num(stats.tpPct, 0) > 0 ? `${fmt1(stats.tpPct)}%` : '--'}</b></span>
              </div>
            </div>
            <div class="sd-sec ${card.honors ? '' : 'sealed'}">
              <div class="sd-sec-title ${card.honors ? 'on' : ''}">生涯荣誉${card.honors ? '' : '<em>荣誉轮揭示</em>'}</div>
              ${card.honors ? renderHonors(card.honors) : ''}
            </div>
            <div class="sd-sec ${card.peak ? '' : 'sealed'}">
              <div class="sd-sec-title ${card.peak ? 'on' : ''}">效力球队${card.peak ? '' : '<em>球队轮揭示</em>'}</div>
              ${card.peak ? `<div class="sd-team-row">${esc(card.peak)}</div>` : ''}
            </div>
            ${hint ? `<div class="sd-act-hint">${esc(hint)}</div>` : ''}
          </div>
          <div class="sd-card-front">
            <div class="sdo-front">
              <div class="sdo-front-name">${esc(card.name || '全明星')}</div>
              <div class="sdo-front-peak">${esc(card.peak || '')}</div>
              <div class="sdo-front-price">${card.price ? `身价 ${card.price} 金币` : '自由签入'}</div>
            </div>
          </div>
        </div>
      </div>`;
  }

  function renderHonors(text) {
    const parts = String(text || '').split('/').map(s => s.trim()).filter(Boolean).slice(0, 8);
    if (!parts.length) return '<div class="sdo-honor-row"><span>荣誉较少</span></div>';
    return `<div class="sdo-honor-row">${parts.map(part => `<span>${esc(part)}</span>`).join('')}</div>`;
  }

  function renderRosters() {
    const game = state.game;
    return `
      <div class="sdo-roster-all">
        ${game.rosters.map(roster => `
          <div class="sdo-roster-team" style="--mc:${roster.color}">
            <div class="sdo-roster-head">
              <b>${esc(roster.teamName || roster.manager)}</b>
              <span>${roster.players.filter(Boolean).length}/5</span>
            </div>
            <div class="sdo-roster-slots">
              ${SLOTS.map((slot, idx) => {
                const p = roster.players[idx];
                return `<div class="sdo-roster-slot"><b>${slot.short}</b><span>${p ? `${esc(p.name)} · ${esc(p.peak)}` : '空位'}</span></div>`;
              }).join('')}
            </div>
          </div>
        `).join('')}
      </div>`;
  }

  function renderLog() {
    const logs = state.game?.log || [];
    if (!logs.length) return '<div class="sd-log" style="margin-top:12px"><div class="sd-log-line">等待第一条日志</div></div>';
    return `
      <div class="sd-log" style="margin-top:12px">
        ${logs.map(item => `<div class="sd-log-line ${esc(item.kind || '')}">${esc(item.text)}</div>`).join('')}
      </div>`;
  }

  function renderEra() {
    const game = state.game;
    const picked = game.era || null;
    return `
      ${topbar()}
      <section class="sd-era-layout">
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
        ${game.you?.canRollEra ? `<button class="manager-btn massive primary" data-sdo="roll-era" type="button">启动命运转盘</button>` : ''}
        ${!game.you?.canRollEra && !picked ? '<div class="sd-hint dim">等待房主启动年代转盘</div>' : ''}
        <div class="sd-recap-grid">
          ${game.rosters.map(roster => `
            <div class="sd-recap-team" style="--mc:${roster.color}">
              <div class="sd-recap-head"><b>${esc(roster.teamName)}</b><em>${roster.players.filter(Boolean).length}/5</em></div>
              <div class="sd-recap-players">
                ${roster.players.filter(Boolean).map(player => `<span><b>${esc(player.slot)}</b>${esc(player.name)}</span>`).join('')}
              </div>
            </div>
          `).join('')}
        </div>
        ${renderLog()}
      </section>`;
  }

  function renderSim() {
    const game = state.game;
    const rows = [...(game.simRows || [])].sort((a, b) => num(b.w, 0) - num(a.w, 0) || num(b.derbyW, 0) - num(a.derbyW, 0));
    const maxW = Math.max(1, ...rows.map(row => num(row.w, 0)));
    return `
      ${topbar()}
      <section class="sd-sim-layout">
        <div class="sd-sim-head">
          <h2>${game.era ? `${game.era.year} ${esc(game.era.label)} · 联网赛季直播` : '服务端赛季模拟'}</h2>
          <span class="sd-sim-round">ROUND ${num(game.simRound, 0)} / 82</span>
        </div>
        <div class="sd-sim-progress"><i style="width:${(num(game.simRound, 0) / 82 * 100).toFixed(1)}%"></i></div>
        <div class="sd-race">
          ${rows.map((row, index) => {
            const pct = (num(row.w, 0) / maxW * 100).toFixed(1);
            const last = row.last || null;
            return `
              <div class="sd-race-row ${index === 0 ? 'leader' : ''}" style="--mc:${row.color}">
                <span class="sd-race-rank">#${index + 1}</span>
                <span class="sd-race-team">${esc(row.teamName)}<small>${esc(row.manager)}</small></span>
                <span class="sd-race-bar"><i style="width:${pct}%"></i></span>
                <span class="sd-race-rec">${num(row.w, 0)}<em>-</em>${num(row.l, 0)}</span>
                <span class="sd-race-last ${last?.win ? 'w' : 'l'} ${last?.derby ? 'derby' : ''}">
                  ${last ? `${last.win ? 'W' : 'L'} ${last.my}-${last.opp} vs ${esc(last.oppName)}` : '等待开赛'}
                </span>
                <span class="sd-race-streak">${num(row.derbyW, 0)}-${num(row.derbyL, 0)} 德比</span>
              </div>`;
          }).join('')}
        </div>
        <div class="sim-actions">
          ${game.you?.canSkipSim ? `<button class="manager-btn ghost" data-sdo="skip-sim" type="button">${game.skipSim ? '快进中...' : '跳过直播动画'}</button>` : ''}
        </div>
        ${renderStandingsPreview()}
        ${renderLog()}
      </section>`;
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
    return `
      ${topbar()}
      <section class="sd-results">
        ${champ ? `
          <div class="sd-champ-hero" style="--mc:${champ.color}">
            <div class="sd-results grade-stamp"><div class="grade-letter">${esc(champ.grade?.letter || '#1')}</div><div class="grade-sub">${num(champ.record?.w, 0)} WINS</div></div>
            <div>
              <p class="sd-champ-kicker">${era.year ? `${era.year} ${esc(era.label)}` : 'ONLINE ALL-STAR SHOWDOWN'} · 最强球队</p>
              <h2>${esc(champ.teamName)}</h2>
              <p class="sd-champ-sub">${esc(champ.manager)} · 战绩 ${num(champ.record?.w, 0)}-${num(champ.record?.l, 0)} · 德比 ${num(champ.derbyW, 0)}-${num(champ.derbyL, 0)} · 联盟第 ${num(champ.leagueRank, 0)}</p>
            </div>
          </div>` : ''}
        <div class="sdo-result-grid">
          ${entries.map(entry => `
            <article class="sdo-panel sd-team-card" style="--mc:${entry.color}">
              <div class="sdo-roster-head">
                <b>#${entry.rank} ${esc(entry.teamName)}</b>
                <span>${num(entry.record?.w, 0)}-${num(entry.record?.l, 0)}</span>
              </div>
              <p>${esc(entry.manager)} · 联盟第 ${num(entry.leagueRank, 0)} · 德比 ${num(entry.derbyW, 0)}-${num(entry.derbyL, 0)} · 强度 ${fmt1(entry.strength)} · 剩余 ${num(entry.coinsLeft, 0)} 金币 · 花费 ${num(entry.coinsSpent, 0)} 金币</p>
              <div class="sdo-player-tags">
                ${entry.players.map(player => `<span><b>${esc(player.slot)}</b> ${esc(player.name)} · ${fmt1(player.ppg)}分 ${fmt1(player.rpg)}板 ${fmt1(player.apg)}助 · ${fmt1(player.mpg)}分钟${player.price ? ` · ${player.price}金` : ''}</span>`).join('')}
              </div>
            </article>
          `).join('')}
        </div>
        ${renderFinalStandings()}
        ${renderDuelRecap()}
        <footer class="results-footer">
          <button class="manager-btn massive secondary" data-sdo="back" type="button">返回主菜单</button>
        </footer>
      </section>`;
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

  function render() {
    if (state.mode === 'home') {
      root.innerHTML = `<div class="sdo-wrap">${renderHome()}</div>`;
    } else if (state.mode === 'lobby') {
      root.innerHTML = `<div class="sdo-wrap">${renderLobby()}</div>`;
    } else {
      root.innerHTML = `<div class="sdo-wrap">${renderGame()}</div>`;
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
