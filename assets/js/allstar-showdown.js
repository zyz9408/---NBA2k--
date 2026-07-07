/* ============================================================
 * 全明星争夺战 (All-Star Showdown)
 * 玩家 + 4 位 AI 经理,各持 15 金币,PG→C 逐位置抽 5 张
 * 1996-2025 全明星卡,三轮信息揭示(数据→荣誉→球队)蛇形选秀,
 * 锁定/抢卡/金币暗标比价,随机年代联盟 82 场同步模拟,决出最强球队。
 * 依赖全局: core.js (rowToPlayer/TEAMS/LEAGUE/G...), sim.js
 * ============================================================ */
(function () {
  'use strict';

  const SLOTS = [
    { id: 1, short: 'PG', name: '控球后卫' },
    { id: 2, short: 'SG', name: '得分后卫' },
    { id: 3, short: 'SF', name: '小前锋' },
    { id: 4, short: 'PF', name: '大前锋' },
    { id: 5, short: 'C', name: '中锋' }
  ];
  const START_COINS = 15;
  const TEAM_ID_BASE = 31;

  const MANAGERS = [
    { idx: 0, human: true, name: '你', teamName: '玩家梦之队', abbr: 'YOU', color: '#22d3ee', style: 'human', motto: '相信自己的眼光' },
    { idx: 1, human: false, name: '数据帝·老K', teamName: '算法王朝', abbr: 'DAT', color: '#f59e0b', style: 'stats', aggr: 1.0, lockMargin: 3.0, noise: 0.08, motto: '数字从不说谎' },
    { idx: 2, human: false, name: '戒指控·霍普金', teamName: '荣耀军团', abbr: 'RNG', color: '#a78bfa', style: 'honors', aggr: 1.1, lockMargin: 2.6, noise: 0.10, motto: '没有戒指都是浮云' },
    { idx: 3, human: false, name: '梭哈王·赌圣', teamName: '全押帝国', abbr: 'ALN', color: '#ef4444', style: 'gambler', aggr: 1.7, lockMargin: 5.0, noise: 0.18, motto: '要么全赢要么全输' },
    { idx: 4, human: false, name: '铁算盘·葛朗台', teamName: '抠门兄弟', abbr: 'MSR', color: '#34d399', style: 'miser', aggr: 0.55, lockMargin: 1.6, noise: 0.06, motto: '一个金币掰两半花' }
  ];

  const ERAS = [
    { year: 2025, label: '新世代', desc: '小球空间 · 三分狂潮' },
    { year: 2009, label: '巨星年代', desc: '科比与詹姆斯的巅峰' },
    { year: 2003, label: '王朝余晖', desc: 'OK组合与石佛的时代' },
    { year: 1996, label: '乔丹王朝', desc: '公牛72胜的统治力' },
    { year: 1983, label: '黑白双雄', desc: '魔术师与大鸟的联盟' }
  ];

  const STAGE_INFO = [
    { no: 1, label: '数据轮', desc: '仅显示巅峰赛季数据' },
    { no: 2, label: '荣誉轮', desc: '追加显示生涯荣誉' },
    { no: 3, label: '球队轮', desc: '追加显示效力球队(最后一轮)' }
  ];

  /* ---------- 状态 ---------- */
  const S = {
    active: false,
    gen: 0,
    phase: 'idle', // draft | era | sim | results
    pool: [],
    poolError: null,
    coins: [],
    spent: [],
    rosters: [],       // [managerIdx][slotIndex] = card
    draftedIds: new Set(),
    baseOrder: [],
    posIndex: 0,
    stage: 1,
    cards: [],
    activeIdx: -1,     // 当前行动经理
    awaiting: null,    // claim | action | bid | reclaim | lockchoice
    pendingCardIdx: -1,
    bidCtx: null,
    duels: [],
    log: [],
    era: null,
    eraRolling: false,
    simRows: [],
    simRound: 0,
    skipSim: false,
    result: null,
    revealing: false,
    dealing: false,
    prevRanks: null,
    announce: null,   // 全屏阶段过场 {kicker,title,sub}
    acted: [],        // 本轮已行动的经理 idx
    lastAction: null  // 回合行动结果气泡 {mgrIdx,text,ic}
  };

  let uiResolver = null;
  let poolPromise = null;

  const root = document.getElementById('showdownRoot');
  const screenEl = document.getElementById('screenShowdown');
  const entryBtn = document.getElementById('showdownModeBtn');
  if (!root || !screenEl || !entryBtn) return;

  /* ---------- 小工具 ---------- */
  function esc(v) { return escapeHtml(String(v == null ? '' : v)); }
  function num(v, d = 0) { return parseNum(v, d); }
  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
  function shuffleList(list) {
    const arr = [...list];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
  function fmt1(v) { const n = num(v, NaN); return Number.isFinite(n) ? n.toFixed(1) : '--'; }

  class Aborted extends Error { }
  function guard(gen) { if (gen !== S.gen) throw new Aborted('restarted'); }

  /* ---------- SVG 图标库 (currentColor, 16x16 viewBox) ---------- */
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
  function coinsHtml(n) {
    return `<span class="sd-coins">${icon('coin')}<b>${n}</b></span>`;
  }

  function waitUI() {
    return new Promise(resolve => { uiResolver = resolve; });
  }
  function resolveUI(value) {
    if (!uiResolver) return;
    const fn = uiResolver;
    uiResolver = null;
    fn(value);
  }

  function pushLog(text, kind = 'info') {
    S.log.unshift({ text, kind, t: Date.now() });
    if (S.log.length > 40) S.log.pop();
  }

  // 全屏阶段过场: 明确告诉玩家现在进行到哪一步、该做什么
  async function announce(gen, { kicker = '', title = '', sub = '', ic = 'flag', hold = 1500 } = {}) {
    guard(gen);
    S.announce = { kicker, title, sub, ic };
    render();
    await sleep(hold);
    guard(gen);
    S.announce = null;
    render();
  }

  // 回合制行动拍: AI 的行动结果以大字气泡停留展示,再进入下一个回合
  async function actionBeat(gen, mgrIdx, text, ic = 'bolt', hold = 1000) {
    guard(gen);
    S.lastAction = { mgrIdx, text, ic };
    render();
    await sleep(hold);
    guard(gen);
    S.lastAction = null;
  }

  /* ---------- 卡池 ---------- */
  async function loadPool() {
    if (S.pool.length) return S.pool;
    if (!poolPromise) {
      poolPromise = (async () => {
        let data = null;
        try {
          const res = await fetch('assets/data/allstar_pool.json?v=20260707showdown');
          if (res && res.ok) data = await res.json();
        } catch (err) { /* fall through */ }
        if (!data && typeof fetchText === 'function') {
          try { data = JSON.parse(await fetchText('assets/data/allstar_pool.json')); } catch (err) { /* noop */ }
        }
        if (!data || !Array.isArray(data.players) || !data.players.length) {
          throw new Error('无法加载全明星卡池数据 (assets/data/allstar_pool.json)');
        }
        return data.players;
      })();
    }
    S.pool = await poolPromise;
    return S.pool;
  }

  function entryFits(entry, slotId) {
    const p1 = num(entry.row?.positionFirst, 0);
    const p2 = num(entry.row?.positionSecond, 0);
    return p1 === slotId || p2 === slotId;
  }

  /* ---------- 卡牌价值评估 ---------- */
  function statsScore(entry) {
    const st = entry.stats || {};
    let v = num(st.ppg) + num(st.rpg) * 1.1 + num(st.apg) * 1.4 + num(st.spg) * 1.6 + num(st.bpg) * 1.6;
    v += Math.max(-3, (num(st.fgPct) - 45) * 0.15);
    if (num(st.tpPct) > 33) v += (num(st.tpPct) - 33) * 0.06;
    return v;
  }
  function honorsScore(entry) {
    const h = entry.honors || {};
    return num(h.mvp) * 6 + num(h.fmvp) * 4 + num(h.rings) * 2.5 + num(h.dpoy) * 2
      + num(h.allNba1) * 2 + num(h.allNba2) * 1.2 + num(h.allNba3) * 0.8
      + num(h.allStar) * 0.7 + num(h.scoring) * 1.5 + num(h.allStarMvp) * 1
      + (num(h.rebound) + num(h.assist) + num(h.block) + num(h.steal)) * 0.5;
  }
  function hiddenScore(card) {
    return num(card.player?.rating, 70);
  }
  // AI 眼中的卡牌价值(随信息轮次变化, 带人格权重与固定噪声)
  function aiCardValue(mgr, card, stage) {
    let v = statsScore(card.entry);
    if (stage >= 2) {
      const hw = mgr.style === 'honors' ? 0.9 : mgr.style === 'stats' ? 0.25 : 0.45;
      v += honorsScore(card.entry) * hw;
    }
    if (stage >= 3) v += (hiddenScore(card) - 75) * 0.8;
    if (mgr.style === 'stats') v += statsScore(card.entry) * 0.25;
    return v * (1 + card.aiNoise[mgr.idx]);
  }
  function humanValueHint(card) {
    return statsScore(card.entry).toFixed(1);
  }

  /* ---------- 开始 / 重置 ---------- */
  function switchToShowdownScreen(on) {
    ['screenMainMenu', 'screenDraftRoom', 'screenResults'].forEach(id => {
      const el = document.getElementById(id);
      if (el) { el.classList.toggle('hidden', on); el.classList.toggle('active', false); }
    });
    if (!on) {
      const menu = document.getElementById('screenMainMenu');
      if (menu) { menu.classList.remove('hidden'); menu.classList.add('active'); }
    }
    screenEl.classList.toggle('hidden', !on);
    screenEl.classList.toggle('active', on);
  }

  function resetState() {
    S.gen += 1;
    resolveUI(null);
    S.active = true;
    S.phase = 'draft';
    S.coins = MANAGERS.map(() => START_COINS);
    S.spent = MANAGERS.map(() => 0);
    S.rosters = MANAGERS.map(() => SLOTS.map(() => null));
    S.draftedIds = new Set();
    S.baseOrder = shuffleList(MANAGERS.map(m => m.idx));
    S.posIndex = 0;
    S.stage = 1;
    S.cards = [];
    S.activeIdx = -1;
    S.awaiting = null;
    S.pendingCardIdx = -1;
    S.bidCtx = null;
    S.duels = [];
    S.log = [];
    S.era = null;
    S.eraRolling = false;
    S.simRows = MANAGERS.map(m => ({ idx: m.idx, w: 0, l: 0, streak: 0, last: null }));
    S.simRound = 0;
    S.skipSim = false;
    S.result = null;
    S.revealing = false;
    S.dealing = false;
    S.prevRanks = null;
    S.announce = null;
    S.acted = [];
    S.lastAction = null;
  }

  async function startShowdown() {
    entryBtn.disabled = true;
    entryBtn.textContent = '⭐ 正在准备卡池...';
    try {
      await loadPool();
      S.poolError = null;
    } catch (err) {
      S.poolError = err.message || String(err);
    }
    entryBtn.disabled = false;
    entryBtn.innerHTML = '⭐ 全明星争夺战 <small>vs 4位AI经理</small>';
    resetState();
    switchToShowdownScreen(true);
    if (S.poolError) { render(); return; }
    pushLog(`选秀顺位抽签: ${S.baseOrder.map(i => MANAGERS[i].name).join(' → ')}`);
    runDraft(S.gen).catch(err => {
      if (!(err instanceof Aborted)) {
        console.error(err);
        S.poolError = err.message || String(err);
        render();
      }
    });
  }

  function exitToMenu() {
    S.gen += 1;
    resolveUI(null);
    S.active = false;
    S.phase = 'idle';
    switchToShowdownScreen(false);
  }

  /* ---------- 选秀主流程 ---------- */
  function currentOrder() {
    const order = [...S.baseOrder];
    return S.posIndex % 2 === 0 ? order : order.reverse();
  }
  function slotNow() { return SLOTS[S.posIndex]; }
  function cardOwner(card) { return card.owner >= 0 ? MANAGERS[card.owner] : null; }
  function managerCard(idx) { return S.cards.find(c => c.owner === idx) || null; }
  function freeCards() { return S.cards.filter(c => c.owner < 0); }

  function dealCards(gen) {
    guard(gen);
    const slot = slotNow();
    const eligible = S.pool.filter(e => entryFits(e, slot.id) && !S.draftedIds.has(e.id));
    const picked = shuffleList(eligible).slice(0, 5);
    S.cards = picked.map((entry, i) => {
      const player = rowToPlayer({ ...entry.row }, 820000 + S.posIndex * 10 + i, {});
      return {
        key: `${slot.short}_${i}`,
        idx: i,
        entry,
        player,
        owner: -1,
        locked: false,
        price: 0,        // 当前身价: 现任持有者为这张卡押上的金币(位置内持续有效)
        acquiredBy: '',
        aiNoise: MANAGERS.map(m => m.human ? 0 : (Math.random() * 2 - 1) * m.noise)
      };
    });
  }

  async function runDraft(gen) {
    for (S.posIndex = 0; S.posIndex < SLOTS.length; S.posIndex++) {
      guard(gen);
      S.stage = 1;
      S.acted = [];
      dealCards(gen);
      pushLog(`—— ${slotNow().short} 位置开抽: 5 张全明星卡(${STAGE_INFO[0].label}) ——`, 'stage');

      // 过场①: 位置开始
      await announce(gen, {
        kicker: `第 ${S.posIndex + 1} / 5 个位置`,
        title: `${slotNow().short} · ${slotNow().name}`,
        sub: '发 5 张全明星卡 → 第1轮只看【巅峰数据】,按顺序认领并决定是否锁定',
        ic: 'ball', hold: 1700
      });

      // 发牌动效: 卡堆飞出5张牌背 → 依次翻开数据面
      S.dealing = true;
      render();
      await sleep(2150);
      guard(gen);
      S.dealing = false;
      render();
      await sleep(350);

      // 第一轮: 认领 + 锁定
      for (const mIdx of currentOrder()) {
        guard(gen);
        await takeClaimTurn(gen, mIdx);
        S.acted.push(mIdx);
        render();
      }

      // 第二/三轮: 未锁定者行动
      for (S.stage = 2; S.stage <= 3; S.stage++) {
        guard(gen);
        S.acted = [];
        pushLog(`—— ${slotNow().short} ${STAGE_INFO[S.stage - 1].label}: ${STAGE_INFO[S.stage - 1].desc} ——`, 'stage');
        const lockedCount = S.cards.filter(c => c.locked && c.owner >= 0).length;
        await announce(gen, S.stage === 2 ? {
          kicker: `${slotNow().short} · 第 2 / 3 轮`,
          title: '荣誉轮 · 生涯荣誉揭示',
          sub: `所有卡追加显示生涯荣誉 → 未锁定的 ${5 - lockedCount} 人可以: 保持 / 换卡 / 截胡 / 金币比价${lockedCount ? ` (已锁定 ${lockedCount} 人跳过)` : ''}`,
          ic: 'medal', hold: 1700
        } : {
          kicker: `${slotNow().short} · 第 3 / 3 轮 (最终轮)`,
          title: '球队轮 · 效力球队揭示',
          sub: `所有卡追加显示年份和球队 → 最后的调整机会,本轮结束后全员强制锁定${lockedCount ? ` (已锁定 ${lockedCount} 人跳过)` : ''}`,
          ic: 'jersey', hold: 1700
        });
        for (const mIdx of currentOrder()) {
          guard(gen);
          const card = managerCard(mIdx);
          if (card && card.locked) { S.acted.push(mIdx); continue; }
          await takeActionTurn(gen, mIdx);
          S.acted.push(mIdx);
          render();
        }
      }

      // 收尾: 全员锁定 + 翻牌
      S.stage = 3;
      S.cards.forEach(card => { card.locked = true; });
      await announce(gen, {
        kicker: `${slotNow().short} 位置尘埃落定`,
        title: '翻牌 · 身份揭晓',
        sub: '五张卡即将翻开,看看每位经理抢到了谁!',
        ic: 'star', hold: 1400
      });
      await revealPosition(gen);
    }
    guard(gen);
    await announce(gen, {
      kicker: 'PG · SG · SF · PF · C 全部选完',
      title: '五支梦之队集结完毕',
      sub: '接下来: 命运转盘随机决定空降哪个年代的联盟,五队同场竞技 82 场',
      ic: 'trophy', hold: 1800
    });
    S.phase = 'era';
    render();
  }

  /* ---------- 回合: 认领 ---------- */
  async function takeClaimTurn(gen, mIdx) {
    const mgr = MANAGERS[mIdx];
    S.activeIdx = mIdx;
    if (mgr.human) {
      S.awaiting = 'claim';
      render();
      const cardIdx = await waitUI();
      guard(gen);
      const card = S.cards[cardIdx];
      card.owner = mIdx;
      card.acquiredBy = 'claim';
      S.awaiting = 'lockchoice';
      S.pendingCardIdx = cardIdx;
      render();
      const lock = await waitUI();
      guard(gen);
      card.locked = !!lock;
      S.pendingCardIdx = -1;
      pushLog(`你认领了 ${cardLabel(card)}${card.locked ? ' 并【锁定】' : ''}`, 'me');
    } else {
      render();
      await sleep(850);
      guard(gen);
      const free = freeCards();
      const best = free.reduce((a, b) => aiCardValue(mgr, b, S.stage) > aiCardValue(mgr, a, S.stage) ? b : a, free[0]);
      best.owner = mIdx;
      best.acquiredBy = 'claim';
      best.locked = aiShouldLock(mgr, best);
      const text = `认领了 ${cardLabel(best)}${best.locked ? ',并【锁定】' : ',保持灵活'}`;
      pushLog(`${mgr.name} ${text}`, 'ai');
      await actionBeat(gen, mIdx, text, best.locked ? 'lock' : 'star');
    }
    S.awaiting = null;
    S.activeIdx = -1;
    render();
  }

  function aiShouldLock(mgr, card) {
    const myVal = aiCardValue(mgr, card, S.stage);
    const rivals = S.cards.filter(c => c !== card).map(c => aiCardValue(mgr, c, S.stage));
    const bestRival = rivals.length ? Math.max(...rivals) : 0;
    if (S.stage >= 3) return true;
    return myVal - bestRival > mgr.lockMargin;
  }

  /* ---------- 回合: 行动(第二/三轮) ---------- */
  async function takeActionTurn(gen, mIdx) {
    const mgr = MANAGERS[mIdx];
    S.activeIdx = mIdx;
    if (mgr.human) {
      S.awaiting = 'action';
      render();
      const act = await waitUI(); // {type:'keep'|'keeplock'|'take'|'challenge', cardIdx}
      guard(gen);
      await applyHumanAction(gen, act);
    } else {
      render();
      await sleep(850);
      guard(gen);
      await aiAction(gen, mgr);
    }
    S.awaiting = null;
    S.activeIdx = -1;
    render();
  }

  async function applyHumanAction(gen, act) {
    const mIdx = 0;
    const mine = managerCard(mIdx);
    if (!act || act.type === 'keep') {
      pushLog('你选择保持现有卡牌(不锁定)', 'me');
      return;
    }
    if (act.type === 'keeplock') {
      if (mine) { mine.locked = true; pushLog(`你【锁定】了 ${cardLabel(mine)}`, 'me'); }
      return;
    }
    const target = S.cards[act.cardIdx];
    if (!target) return;
    if (act.type === 'take') {
      const victim = target.owner;
      if (target.owner === mIdx || target.locked) return;
      if (victim >= 0) {
        if (mine) mine.owner = -1;
        target.owner = mIdx;
        target.acquiredBy = 'steal';
        pushLog(`你抢走了 ${MANAGERS[victim].name} 的 ${cardLabel(target)}!`, 'me');
        await reclaimFor(gen, victim);
      } else {
        if (mine) mine.owner = -1;
        target.owner = mIdx;
        target.acquiredBy = 'claim';
        pushLog(`你换成了无主的 ${cardLabel(target)}`, 'me');
      }
      S.awaiting = 'lockchoice';
      S.pendingCardIdx = target.idx;
      render();
      const lock = await waitUI();
      guard(gen);
      target.locked = !!lock;
      S.pendingCardIdx = -1;
      if (target.locked) pushLog(`你【锁定】了 ${cardLabel(target)}`, 'me');
    } else if (act.type === 'challenge') {
      await runDuel(gen, mIdx, target);
    }
  }

  async function aiAction(gen, mgr) {
    const mine = managerCard(mgr.idx);
    const myVal = mine ? aiCardValue(mgr, mine, S.stage) : -999;
    let best = null;
    let bestVal = myVal;
    S.cards.forEach(card => {
      if (card.owner === mgr.idx) return;
      const v = aiCardValue(mgr, card, S.stage);
      if (v > bestVal) { best = card; bestVal = v; }
    });

    if (!best) {
      if (mine && aiShouldLock(mgr, mine)) {
        mine.locked = true;
        pushLog(`${mgr.name}【锁定】了 ${cardLabel(mine)}`, 'ai');
        await actionBeat(gen, mgr.idx, `【锁定】了 ${cardLabel(mine)}`, 'lock');
      } else {
        pushLog(`${mgr.name} 按兵不动,继续观望`, 'ai');
        await actionBeat(gen, mgr.idx, '按兵不动,继续观望', 'eye', 800);
      }
      return;
    }

    const gain = bestVal - myVal;
    if (!best.locked) {
      const threshold = mgr.style === 'gambler' ? 0.5 : 1.2;
      if (gain > threshold) {
        const victim = best.owner;
        if (mine) mine.owner = -1;
        best.owner = mgr.idx;
        best.acquiredBy = victim >= 0 ? 'steal' : 'claim';
        best.locked = aiShouldLock(mgr, best);
        if (victim >= 0) {
          pushLog(`${mgr.name} 抢走了 ${MANAGERS[victim].name} 的 ${cardLabel(best)}${best.locked ? ' 并【锁定】' : ''}`, 'ai');
          await actionBeat(gen, mgr.idx, `截胡!抢走 ${MANAGERS[victim].name} 的 ${cardLabel(best)}${best.locked ? ' 并【锁定】' : ''}`, 'bolt', 1200);
          await reclaimFor(gen, victim);
        } else {
          pushLog(`${mgr.name} 换成了无主的 ${cardLabel(best)}${best.locked ? ' 并【锁定】' : ''}`, 'ai');
          await actionBeat(gen, mgr.idx, `换成了无主的 ${cardLabel(best)}${best.locked ? ' 并【锁定】' : ''}`, 'swap');
        }
        return;
      }
    } else {
      const challengeMargin = mgr.style === 'gambler' ? 1.5 : mgr.style === 'miser' ? 6 : 3;
      const price = num(best.price, 0);
      const worthIt = Math.round(gain * 0.3 * mgr.aggr) >= price + 1; // 身价已高于这张卡对我的价值就不追了
      if (gain > challengeMargin && worthIt && S.coins[mgr.idx] >= price + 1) {
        await actionBeat(gen, mgr.idx, `盯上了 ${MANAGERS[best.owner].name} 锁定的 ${cardLabel(best)}(身价${price}),发起比价!`, 'gavel', 1200);
        await runDuel(gen, mgr.idx, best);
        return;
      }
    }
    if (mine && aiShouldLock(mgr, mine)) {
      mine.locked = true;
      pushLog(`${mgr.name}【锁定】了 ${cardLabel(mine)}`, 'ai');
      await actionBeat(gen, mgr.idx, `【锁定】了 ${cardLabel(mine)}`, 'lock');
    } else {
      pushLog(`${mgr.name} 保持现状,继续观望`, 'ai');
      await actionBeat(gen, mgr.idx, '保持现状,继续观望', 'eye', 800);
    }
  }

  /* ---------- 被抢后重新认领 ---------- */
  async function reclaimFor(gen, mIdx) {
    const mgr = MANAGERS[mIdx];
    const free = freeCards();
    if (!free.length) return;
    if (mgr.human) {
      S.awaiting = 'reclaim';
      render();
      const cardIdx = await waitUI();
      guard(gen);
      const card = S.cards[cardIdx] && S.cards[cardIdx].owner < 0 ? S.cards[cardIdx] : free[0];
      card.owner = mIdx;
      card.acquiredBy = 'reclaim';
      pushLog(`你重新认领了 ${cardLabel(card)}`, 'me');
      S.awaiting = null;
    } else {
      await sleep(450);
      guard(gen);
      const best = free.reduce((a, b) => aiCardValue(mgr, b, S.stage) > aiCardValue(mgr, a, S.stage) ? b : a, free[0]);
      best.owner = mIdx;
      best.acquiredBy = 'reclaim';
      pushLog(`${mgr.name} 重新认领了 ${cardLabel(best)}`, 'ai');
      await actionBeat(gen, mIdx, `被抢后重新认领了 ${cardLabel(best)}`, 'swap', 900);
    }
    render();
  }

  /* ---------- 金币比价 ---------- */
  // AI 出价(身价制): 挑战者返回总出价 B(须>身价P), 守方返回总承诺 D(≥P, 差额为加价)
  function aiBidAmount(mgr, card, isDefender, oppIdx) {
    const P = num(card.price, 0);
    const val = aiCardValue(mgr, card, S.stage);
    const mine = managerCard(mgr.idx);
    const backup = isDefender
      ? (freeCards().length ? Math.max(...freeCards().map(c => aiCardValue(mgr, c, S.stage)), 0) : 0)
      : (mine ? aiCardValue(mgr, mine, S.stage) : 0);
    const gain = Math.max(0, val - backup);
    const remainingSlots = SLOTS.length - S.posIndex;
    const reserve = mgr.style === 'gambler' ? 0 : mgr.style === 'miser' ? Math.min(4, remainingSlots) : Math.max(0, remainingSlots - 2);
    const avail = Math.max(0, S.coins[mgr.idx] - reserve);
    // 这张卡对我总共值多少金币(总承诺意愿)
    const worth = Math.round(gain * 0.3 * mgr.aggr + (mgr.style === 'gambler' ? 1 : 0));
    if (isDefender) {
      // 守方: 总承诺 = min(意愿, P+可加金额); 意愿不足身价则维持不加价
      return Math.max(P, Math.min(P + avail, Math.max(P, Math.round(worth * 1.05))));
    }
    // 挑战者: 出价须 > P 且 ≤ 可用金币(挑战者全额押上, 不留保留金也可由 avail 控制)
    return Math.max(P + 1, Math.min(Math.max(0, S.coins[mgr.idx] - Math.max(0, reserve - 1)), worth));
  }

  /* 身价制金币比价:
   * - 卡有当前身价 P(现任持有者押上的金币, 位置内持续有效)
   * - 挑战者必须暗出 B > P; 守方决定总承诺 D(≥P, 补差价即可, 不用重复掏钱)
   * - D ≥ B 守方保住(补 D-P); B > D 挑战者接管(押 B, 守方全额退回 P)
   * - 押金只在位置揭晓时真正消耗; 中途丢卡全额退回
   */
  async function runDuel(gen, challengerIdx, card) {
    const defenderIdx = card.owner;
    const challenger = MANAGERS[challengerIdx];
    const defender = MANAGERS[defenderIdx];
    const P = num(card.price, 0);
    if (S.coins[challengerIdx] < P + 1) return;

    S.bidCtx = { cardIdx: card.idx, challengerIdx, defenderIdx, price: P, cBid: null, dBid: null, phase: 'input' };
    pushLog(`⚔️ ${challenger.name} 对 ${defender.name} 锁定的 ${cardLabel(card)} 发起比价!当前身价 ${P}`, 'duel');

    let cBid;
    let dBid;
    if (challenger.human) {
      S.awaiting = 'bid';
      render();
      cBid = num(await waitUI(), P + 1);
      guard(gen);
    } else {
      cBid = aiBidAmount(challenger, card, false, defenderIdx);
    }
    cBid = Math.max(P + 1, Math.min(S.coins[challengerIdx], cBid));
    S.bidCtx.cBid = cBid;

    if (defender.human) {
      S.awaiting = 'bid';
      S.bidCtx.phase = 'defend';
      render();
      dBid = num(await waitUI(), P);
      guard(gen);
    } else {
      dBid = aiBidAmount(defender, card, true, challengerIdx);
    }
    // 守方总承诺: 至少维持身价 P, 加价上限 = P + 剩余金币
    dBid = Math.max(P, Math.min(P + S.coins[defenderIdx], dBid));
    S.bidCtx.dBid = dBid;

    // 揭示
    S.awaiting = null;
    S.bidCtx.phase = 'reveal';
    render();
    await sleep(1500);
    guard(gen);

    const challengerWins = cBid > dBid;
    S.duels.push({
      pos: slotNow().short, card: cardLabel(card),
      challenger: challenger.name, defender: defender.name,
      cBid, dBid, priceBefore: P, winner: challengerWins ? challenger.name : defender.name
    });

    if (challengerWins) {
      // 挑战者押上 B 接管; 守方全额退回已押身价
      S.coins[challengerIdx] -= cBid;
      S.coins[defenderIdx] += P;
      const mine = managerCard(challengerIdx);
      if (mine) mine.owner = -1;
      card.owner = challengerIdx;
      card.locked = true;
      card.acquiredBy = 'duel';
      card.price = cBid;
      pushLog(`💰 ${challenger.name} 出 ${cBid} > ${defender.name} 的 ${dBid},接管 ${cardLabel(card)}(新身价 ${cBid});${defender.name} 退回 ${P} 金币`, 'duel');
      S.bidCtx = null;
      render();
      await reclaimFor(gen, defenderIdx);
    } else {
      const topUp = dBid - P;
      if (topUp > 0) {
        S.coins[defenderIdx] -= topUp;
        card.price = dBid;
        pushLog(`🛡️ ${defender.name} 总承诺 ${dBid} ≥ ${challenger.name} 的 ${cBid},加价 ${topUp} 保住 ${cardLabel(card)}(新身价 ${dBid})`, 'duel');
      } else {
        pushLog(`🛡️ ${defender.name} 维持身价 ${P},但 ${challenger.name} 出价 ${cBid} 未超过守方承诺,保卡成功`, 'duel');
      }
      pushLog(`${challenger.name} 比价失败,不消耗金币`, 'duel');
      S.bidCtx = null;
    }
    render();
  }

  /* ---------- 位置揭晓 ---------- */
  async function revealPosition(gen) {
    S.revealing = true;
    render();
    await sleep(400);
    guard(gen);
    const slotIndex = S.posIndex;
    S.cards.forEach(card => {
      card.revealed = true;
      if (card.owner >= 0) {
        S.rosters[card.owner][slotIndex] = card;
        S.draftedIds.add(card.entry.id);
        // 位置揭晓 = 押金正式消耗(此前只是押上,丢卡会退回)
        S.spent[card.owner] += num(card.price, 0);
      }
    });
    render();
    await sleep(2600);
    guard(gen);
    S.cards.forEach(card => {
      if (card.owner >= 0) {
        pushLog(`${MANAGERS[card.owner].name} 的 ${slotNow().short}: ${esc(card.entry.nameCn)} (${card.entry.peakYear} ${card.entry.peakTeamCn})`, 'reveal');
      }
    });
    S.revealing = false;
  }

  function cardLabel(card) {
    if (card.revealed) return `${card.entry.nameCn}`;
    return `${card.idx + 1}号卡`;
  }

  // 当前持有者为这张卡押上的金币(=身价)
  function cardCost(card) {
    if (!card || card.owner < 0) return 0;
    return num(card.price, 0);
  }

  /* ============================================================
   * 年代随机 + 联盟模拟
   * ============================================================ */
  async function rollEraAndSim() {
    const gen = S.gen;
    S.eraRolling = true;
    render();
    // 老虎机动画: 高亮循环减速
    const totalTicks = 22 + Math.floor(Math.random() * 5);
    const finalIdx = Math.floor(Math.random() * ERAS.length);
    for (let t = 0; t <= totalTicks; t++) {
      guard(gen);
      S.eraHighlight = (finalIdx + t - totalTicks + ERAS.length * 10) % ERAS.length;
      render();
      await sleep(60 + Math.pow(t / totalTicks, 2.2) * 330);
    }
    S.era = ERAS[finalIdx];
    S.eraRolling = false;
    pushLog(`🎰 命运转盘落定: 五支球队空降 ${S.era.year} ${S.era.label}!`, 'stage');
    render();
    await sleep(1600);
    guard(gen);
    await runShowdownSeason(gen);
  }

  function fantasyTeamMeta(mgr) {
    return {
      id: TEAM_ID_BASE + mgr.idx,
      n: mgr.teamName,
      z: mgr.teamName,
      a: mgr.abbr,
      c: mgr.idx % 2 === 0 ? 'East' : 'West',
      cl: mgr.color,
      r: 90
    };
  }

  function installShowdownTeams() {
    // 清理旧的 31+ 球队(含 82 挑战模式的 shell)
    for (let i = TEAMS.length - 1; i >= 0; i--) {
      if (num(TEAMS[i].id, 0) >= TEAM_ID_BASE) TEAMS.splice(i, 1);
    }
    Object.keys(LEAGUE.teams || {}).forEach(key => {
      if (num(key, 0) >= TEAM_ID_BASE) delete LEAGUE.teams[key];
    });

    const rotations = {};
    MANAGERS.forEach(mgr => {
      const meta = fantasyTeamMeta(mgr);
      TEAMS.push(meta);
      const players = S.rosters[mgr.idx].map((card, i) => {
        const slot = SLOTS[i];
        const out = JSON.parse(JSON.stringify(card.player));
        out.id = 820000 + mgr.idx * 100 + i + 1;
        out.uid = `showdown_${mgr.abbr}_${slot.short}`.toLowerCase();
        out.teamId = meta.id;
        out.chosenSlotId = slot.id;
        out.chosenSlotShort = slot.short;
        out.pos2 = num(out.pos, 0) === slot.id ? num(out.pos2, 0) : num(out.pos, 0);
        out.pos = slot.id;
        out.fantasyStarter = true;
        out.injury = { active: false, games: 0, type: '' };
        out.att = num(out.att, calcPlayerAtt(out.attrs || {}));
        out.def = num(out.def, calcPlayerDef(out.attrs || {}));
        return out;
      });
      const rotation = players.map((p, i) => ({
        id: p.id,
        name: p.name,
        pos: SLOTS[i].id,
        pos2: num(p.pos2, 0),
        slotPos: SLOTS[i].id,
        rotationRole: 'starter',
        teamTier: i === 0 ? 'alpha' : i === 1 ? 'second' : i === 2 ? 'third' : 'rolestarter',
        minutes: 48,
        rating: num(p.rating, 75),
        roleScore: num(p.rating, 75),
        photo: p.photo,
        image: p.image,
        isSelf: false,
        fantasyStarter: true,
        fullGameStarter: true,
        noFatigue: true
      }));
      LEAGUE.teams[meta.id] = {
        meta,
        players,
        rotation,
        coach: null,
        strength: 90,
        noFatigue: true,
        noRotation: true
      };
      rotations[meta.id] = rotation;
    });
    return rotations;
  }

  // 5队单循环德比轮次表(圆桌法): 每行 [对阵, 对阵, 轮空]
  const DERBY_ROBIN = [
    [[0, 1], [2, 3], 4],
    [[0, 2], [1, 4], 3],
    [[3, 4], [1, 2], 0],
    [[0, 3], [2, 4], 1],
    [[0, 4], [1, 3], 2]
  ];
  // 德比场次分布在整个赛季(双循环,每队8场德比+74场联盟赛)
  const DERBY_ROUNDS = [8, 16, 24, 32, 40, 48, 56, 64, 72, 80];

  function buildShowdownRounds(rounds = 82) {
    const leagueIds = TEAMS.map(t => num(t.id, 0)).filter(id => id >= 1 && id <= 30);
    const fantasyIds = MANAGERS.map(m => TEAM_ID_BASE + m.idx);
    const orders = fantasyIds.map(() => shuffleList(leagueIds));
    const out = [];
    for (let r = 0; r < rounds; r++) {
      const used = new Set();
      const pairs = [];
      const derbySlot = DERBY_ROUNDS.indexOf(r);
      const fantasyNeedingLeagueOpp = [];

      if (derbySlot >= 0) {
        // 德比轮: 两场梦之队内战 + 轮空队照常打联盟对手
        const robin = DERBY_ROBIN[derbySlot % 5];
        const swap = derbySlot >= 5; // 第二循环交换主客
        robin.slice(0, 2).forEach(([a, b], gi) => {
          const home = swap ? b : a;
          const away = swap ? a : b;
          pairs.push({
            homeTeamId: TEAM_ID_BASE + home,
            awayTeamId: TEAM_ID_BASE + away,
            derby: true
          });
        });
        fantasyNeedingLeagueOpp.push(robin[2]);
      } else {
        fantasyIds.forEach((fid, fi) => fantasyNeedingLeagueOpp.push(fi));
      }

      fantasyNeedingLeagueOpp.forEach(fi => {
        const fid = fantasyIds[fi];
        const order = orders[fi];
        let opp = order[r % order.length];
        let hop = 0;
        while (used.has(opp) && hop < order.length) {
          hop += 1;
          opp = order[(r + hop) % order.length];
        }
        used.add(opp);
        const home = (r + fi) % 2 === 0;
        pairs.push({ homeTeamId: home ? fid : opp, awayTeamId: home ? opp : fid });
      });

      const rest = shuffleList(leagueIds.filter(id => !used.has(id)));
      for (let i = 0; i + 1 < rest.length; i += 2) {
        pairs.push({ homeTeamId: rest[i], awayTeamId: rest[i + 1] });
      }
      out.push(pairs);
    }
    return out;
  }

  function resetShowdownLeagueState() {
    G.phase = 'season';
    G.team = null;
    G.teamId = 0;
    G.startYear = S.era.year;
    G.year = S.era.year;
    G.season = 1;
    G.gameNum = 0;
    G.dayNum = 0;
    G.totalGames = 82;
    G.seasonDays = 180;
    G.gameDays = [];
    G.schedule = [];
    G.results = [];
    G.news = [];
    G.events = [];
    G.awards = [];
    G.allAwards = [];
    G.leagueAwards = [];
    G.playoffs = typeof defaultPlayoffState === 'function' ? defaultPlayoffState() : { active: false, champion: false };
    G.seasonStats = { pts: 0, reb: 0, ast: 0, stl: 0, blk: 0, tov: 0, mins: 0, fgm: 0, fga: 0, tpm: 0, tpa: 0, ftm: 0, fta: 0, gp: 0, wins: 0, losses: 0 };
  }

  async function runShowdownSeason(gen) {
    S.phase = 'sim';
    S.skipSim = false;
    S.simRound = 0;
    S.simRows = MANAGERS.map(m => ({ idx: m.idx, w: 0, l: 0, streak: 0, last: null }));
    render();

    let originalBuildDynamic = null;
    try {
      await loadLeagueData({ startYear: S.era.year, strictRoster: true });
      if (!(LEAGUE.loaded && LEAGUE.teams && Object.keys(LEAGUE.teams).length)) {
        await loadLeagueData({ startYear: 2025, strictRoster: true });
      }
      guard(gen);
      const rotations = installShowdownTeams();
      resetShowdownLeagueState();
      originalBuildDynamic = buildDynamicTeamRotation;
      buildDynamicTeamRotation = function showdownRotation(teamId, opts) {
        const rot = rotations[num(teamId, 0)];
        if (rot) return JSON.parse(JSON.stringify(rot));
        return originalBuildDynamic(teamId, opts);
      };
      initLeagueSeasonState();
      MANAGERS.forEach(mgr => {
        const teamObj = LEAGUE.teams[TEAM_ID_BASE + mgr.idx];
        teamObj.rotation = rotations[TEAM_ID_BASE + mgr.idx];
        teamObj.strength = calcTeamStrength(teamObj);
      });

      const fantasyIds = MANAGERS.map(m => TEAM_ID_BASE + m.idx);
      const rounds = buildShowdownRounds(82);
      for (let r = 0; r < rounds.length; r++) {
        guard(gen);
        const details = [];
        rounds[r].forEach(pair => {
          const detail = simulateLeagueMatchup(pair.homeTeamId, pair.awayTeamId, {
            roundIndex: r,
            season: 1,
            year: S.era.year,
            phase: 'regular',
            userTeamId: TEAM_ID_BASE,
            fullStrengthTeamIds: fantasyIds
          });
          if (detail && (num(detail.homeTeamId, 0) >= TEAM_ID_BASE || num(detail.awayTeamId, 0) >= TEAM_ID_BASE)) {
            details.push({ detail, derby: !!pair.derby });
          }
        });
        S.simRound = r + 1;
        details.forEach(({ detail, derby }) => {
          [num(detail.homeTeamId, 0), num(detail.awayTeamId, 0)].forEach(tid => {
            if (tid < TEAM_ID_BASE) return;
            const mIdx = tid - TEAM_ID_BASE;
            const row = S.simRows[mIdx];
            const isHome = num(detail.homeTeamId, 0) === tid;
            const my = isHome ? detail.homeScore : detail.awayScore;
            const opp = isHome ? detail.awayScore : detail.homeScore;
            const win = my > opp;
            if (win) { row.w += 1; row.streak = Math.max(1, row.streak + 1); }
            else { row.l += 1; row.streak = Math.min(-1, row.streak - 1); }
            if (derby) {
              if (win) row.derbyW = (row.derbyW || 0) + 1;
              else row.derbyL = (row.derbyL || 0) + 1;
            }
            const oppTeam = getTeam(isHome ? detail.awayTeamId : detail.homeTeamId) || {};
            row.last = { my, opp, win, oppName: oppTeam.z || oppTeam.n || '', home: isHome, derby };
          });
        });
        if (!S.skipSim) {
          render();
          await sleep(r < 3 ? 320 : 65);
        } else if (r % 10 === 0) {
          render();
          await sleep(0);
        }
      }
      guard(gen);
      buildShowdownResult();
      S.phase = 'results';
      render();
    } catch (err) {
      if (err instanceof Aborted) return;
      console.error(err);
      S.poolError = `模拟失败: ${err.message || err}`;
      render();
    } finally {
      if (originalBuildDynamic) buildDynamicTeamRotation = originalBuildDynamic;
    }
  }

  /* ---------- 结算 ---------- */
  function showdownGrade(w) {
    if (w >= 72) return { letter: 'SSS', cls: 'grade-sss' };
    if (w >= 65) return { letter: 'S', cls: 'grade-s' };
    if (w >= 58) return { letter: 'A', cls: 'grade-a' };
    if (w >= 50) return { letter: 'B', cls: 'grade-b' };
    if (w >= 42) return { letter: 'C', cls: 'grade-c' };
    if (w >= 35) return { letter: 'D', cls: 'grade-d' };
    return { letter: 'F', cls: 'grade-f' };
  }

  function teamSeasonStats(teamId, players) {
    const rows = getLeaguePlayerSeasonRows();
    return players.map(p => {
      const row = rows.find(item => num(item.teamId, 0) === teamId && String(item.playerId) === String(p.id));
      const gp = Math.max(1, num(row?.gp, 0));
      const tpa = num(row?.tpa, 0);
      const fta = num(row?.fta, 0);
      return {
        player: p,
        gp: num(row?.gp, 0),
        ppg: +(num(row?.pts, 0) / gp).toFixed(1),
        rpg: +(num(row?.reb, 0) / gp).toFixed(1),
        apg: +(num(row?.ast, 0) / gp).toFixed(1),
        spg: +(num(row?.stl, 0) / gp).toFixed(1),
        bpg: +(num(row?.blk, 0) / gp).toFixed(1),
        fgPct: num(row?.fga, 0) > 0 ? +(num(row?.fgm, 0) / num(row?.fga, 1) * 100).toFixed(1) : '--',
        tpPct: tpa > 0 ? +(num(row?.tpm, 0) / tpa * 100).toFixed(1) : '--',
        ftPct: fta > 0 ? +(num(row?.ftm, 0) / fta * 100).toFixed(1) : '--'
      };
    });
  }

  function buildShowdownResult() {
    const standings = getLeagueTeamRecordsArray()
      .sort((a, b) => b.pct - a.pct || b.w - a.w || (b.pf - b.pa) - (a.pf - a.pa));
    const entries = MANAGERS.map(mgr => {
      const teamId = TEAM_ID_BASE + mgr.idx;
      const teamObj = LEAGUE.teams[teamId];
      const record = standings.find(row => row.id === teamId) || { w: 0, l: 0, pf: 0, pa: 0, gp: 82, pct: 0 };
      const leagueRank = standings.findIndex(row => row.id === teamId) + 1;
      const simRow = S.simRows[mgr.idx] || {};
      return {
        mgr,
        teamId,
        record,
        leagueRank,
        derbyW: num(simRow.derbyW, 0),
        derbyL: num(simRow.derbyL, 0),
        coinsLeft: S.coins[mgr.idx],
        coinsSpent: S.spent[mgr.idx],
        roster: S.rosters[mgr.idx],
        stats: teamSeasonStats(teamId, teamObj.players),
        strength: teamObj.strength,
        grade: showdownGrade(num(record.w, 0))
      };
    });
    // 排名: 总胜场 → 梦之队德比战绩 → 净胜分 → 剩余金币
    entries.sort((a, b) =>
      num(b.record.w, 0) - num(a.record.w, 0)
      || b.derbyW - a.derbyW
      || (num(b.record.pf, 0) - num(b.record.pa, 0)) - (num(a.record.pf, 0) - num(a.record.pa, 0))
      || b.coinsLeft - a.coinsLeft);
    entries.forEach((entry, i) => { entry.rank = i + 1; });
    S.result = {
      entries,
      standings,
      awards: typeof leagueAwardEntryForSeason === 'function' ? leagueAwardEntryForSeason(1) : {},
      era: S.era,
      duels: S.duels
    };
  }

  /* ============================================================
   * 渲染
   * ============================================================ */
  function render() {
    if (!S.active) return;
    if (S.poolError) {
      root.innerHTML = `
        <div class="sd-wrap">
          ${renderTopbar()}
          <div class="sd-error"><strong>出错了</strong><span>${esc(S.poolError)}</span>
            <button class="manager-btn secondary" data-sd="back">返回主菜单</button></div>
        </div>`;
      bindRoot();
      return;
    }
    let body = '';
    if (S.phase === 'draft') body = renderDraft();
    else if (S.phase === 'era') body = renderEra();
    else if (S.phase === 'sim') body = renderSim();
    else if (S.phase === 'results') body = renderResultsView();
    root.innerHTML = `<div class="sd-wrap">${renderTopbar()}${body}${renderBidModal()}${renderAnnounce()}</div>`;
    bindRoot();
  }

  // 全屏阶段过场层
  function renderAnnounce() {
    const a = S.announce;
    if (!a) return '';
    return `
      <div class="sd-announce-bg">
        <div class="sd-announce">
          <div class="sd-announce-ic">${icon(a.ic || 'flag')}</div>
          ${a.kicker ? `<p class="sd-announce-kicker">${a.kicker}</p>` : ''}
          <h2 class="sd-announce-title">${a.title}</h2>
          ${a.sub ? `<p class="sd-announce-sub">${a.sub}</p>` : ''}
        </div>
      </div>`;
  }

  function renderTopbar() {
    const stageInfo = STAGE_INFO[Math.min(3, Math.max(1, S.stage)) - 1];
    const stageText = S.phase === 'draft'
      ? `${slotNow() ? slotNow().short : ''} · ${stageInfo.label}`
      : S.phase === 'era' ? '命运转盘' : S.phase === 'sim' ? `${S.era ? S.era.year : ''} 赛季直播` : '最终结算';
    return `
      <header class="sd-topbar glass-panel">
        <div class="sd-topbar-left">
          <button class="manager-back-link" data-sd="back" type="button">返回主菜单</button>
          <h2>⭐ 全明星争夺战</h2>
        </div>
        <div class="sd-topbar-right"><span class="sd-stage-chip">${esc(stageText)}</span></div>
      </header>`;
  }

  /* ---------- 选秀渲染 ---------- */
  function honorBadgesHtml(entry, max = 8) {
    const h = entry.honors || {};
    const defs = [
      ['rings', '总冠军', 'gold'], ['mvp', 'MVP', 'gold'], ['fmvp', 'FMVP', 'gold'],
      ['allStarMvp', '全明星MVP', 'gold'], ['dpoy', 'DPOY', 'cyan'], ['roy', 'ROY', 'pri'],
      ['allNba1', '一阵', 'gold'], ['allNba2', '二阵', 'pri'], ['allNba3', '三阵', 'pri'],
      ['allDefensive', '一防', 'cyan'], ['allStar', '全明星', 'pri'], ['scoring', '得分王', 'red'],
      ['rebound', '篮板王', 'cyan'], ['assist', '助攻王', 'cyan'], ['block', '盖帽王', 'cyan'],
      ['steal', '抢断王', 'cyan'], ['sixthMan', '最佳第六人', 'pri']
    ];
    const items = defs.filter(([k]) => num(h[k], 0) > 0)
      .map(([k, label, cls]) => `<span class="sd-honor ${cls}">${label}×${h[k]}</span>`);
    if (!items.length) return '<span class="sd-honor none">生涯荣誉较少</span>';
    return items.slice(0, max).join('') + (items.length > max ? `<span class="sd-honor none">+${items.length - max}</span>` : '');
  }

  // 可交互性判定: 当前玩家回合下这张卡可以点吗? 返回动作提示文案
  function cardActionHint(card) {
    const owner = cardOwner(card);
    if (S.awaiting === 'claim' || S.awaiting === 'reclaim') {
      return !owner ? { act: 'claim', label: '点击认领', ic: 'star' } : null;
    }
    if (S.awaiting === 'action') {
      if (owner && owner.idx === 0) return null;
      if (!owner) return { act: 'claim', label: '点击换取', ic: 'swap' };
      if (card.locked) {
        const minBid = num(card.price, 0) + 1;
        return S.coins[0] >= minBid ? { act: 'duel', label: `比价 ≥${minBid}`, ic: 'gavel' } : null;
      }
      return { act: 'steal', label: '点击截胡', ic: 'bolt' };
    }
    return null;
  }

  function statTone(value, hi, mid) {
    const v = num(value, 0);
    return v >= hi ? 'elite' : v >= mid ? 'good' : '';
  }

  function renderCard(card) {
    const st = card.entry.stats || {};
    const owner = cardOwner(card);
    const hint = cardActionHint(card);
    const cls = ['sd-card'];
    if (card.locked) cls.push('locked');
    if (owner) cls.push('owned');
    if (card.revealed) cls.push('revealed');
    if (owner && owner.idx === 0) cls.push('is-mine');
    if (S.dealing) cls.push('dealing');
    if (hint) cls.push('actionable');
    const stageNow = Math.min(3, Math.max(1, S.stage));
    const front = card.revealed ? `
      <div class="sd-card-front">
        <img class="sd-photo" src="${esc(getPlayerPhotoSrc(card.player))}" alt="" onerror="this.src='${esc(getPlayerPhotoPath(0))}'">
        <div class="sd-front-name">${esc(card.entry.nameCn)}</div>
        <div class="sd-front-sub">${card.entry.peakYear} · ${esc(card.entry.peakTeamCn)}</div>
        <div class="sd-front-ovr">OVR <b>${num(card.player.rating, 0)}</b></div>
      </div>` : '';
    return `
      <div class="${cls.join(' ')}" data-card="${card.idx}" style="--di:${card.idx}">
        ${owner ? `<div class="sd-owner-ribbon" style="--mc:${owner.color}">${icon(owner.idx === 0 ? 'user' : 'bot')}${esc(owner.name)}${cardCost(card) ? ` <span class="sd-rib-cost">${icon('coin')}${cardCost(card)}</span>` : ''}</div>`
        : `<div class="sd-owner-ribbon free">${icon('eye')}无主</div>`}
        <div class="sd-card-inner">
          <div class="sd-card-back">
            <div class="sd-card-head">
              <span class="sd-card-no">${icon('ball')}${card.idx + 1}号卡</span>
              ${card.locked ? `<span class="sd-lock">${icon('lock')}已锁定</span>` : `<span class="sd-lock open">${icon('unlock')}可争夺</span>`}
            </div>
            <div class="sd-mystery">${icon('silhouette', 'big')}<em>神秘全明星</em></div>
            <div class="sd-sec">
              <div class="sd-sec-title on">${icon('chart')}巅峰数据</div>
              <div class="sd-stat-main">
                <div class="${statTone(st.ppg, 27, 20)}"><strong>${fmt1(st.ppg)}</strong><span>得分</span></div>
                <div class="${statTone(st.rpg, 10, 7)}"><strong>${fmt1(st.rpg)}</strong><span>篮板</span></div>
                <div class="${statTone(st.apg, 8, 5.5)}"><strong>${fmt1(st.apg)}</strong><span>助攻</span></div>
              </div>
              <div class="sd-stat-sub">
                <span>断 <b>${fmt1(st.spg)}</b></span>
                <span>帽 <b>${fmt1(st.bpg)}</b></span>
                <span>命中 <b>${fmt1(st.fgPct)}%</b></span>
                <span>三分 <b>${num(st.tpPct, 0) > 0 ? fmt1(st.tpPct) + '%' : '--'}</b></span>
              </div>
            </div>
            <div class="sd-sec ${stageNow >= 2 ? (stageNow === 2 ? 'new-info' : '') : 'sealed'}">
              <div class="sd-sec-title ${stageNow >= 2 ? 'on' : ''}">${icon('medal')}生涯荣誉${stageNow < 2 ? '<em>荣誉轮揭示</em>' : ''}</div>
              ${stageNow >= 2 ? `<div class="sd-honor-row">${honorBadgesHtml(card.entry)}</div>` : ''}
            </div>
            <div class="sd-sec ${stageNow >= 3 ? 'new-info' : 'sealed'}">
              <div class="sd-sec-title ${stageNow >= 3 ? 'on' : ''}">${icon('jersey')}效力球队${stageNow < 3 ? '<em>球队轮揭示</em>' : ''}</div>
              ${stageNow >= 3 ? `<div class="sd-team-row">${card.entry.peakYear} 赛季 · ${esc(card.entry.peakTeamCn)}</div>` : ''}
            </div>
            ${hint ? `<div class="sd-act-hint">${icon(hint.ic)}${hint.label}</div>` : ''}
          </div>
          ${front}
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

  // 每位经理在当前轮的状态: 行动中 / 已行动 / 锁定跳过 / 待行动
  function managerTurnState(idx) {
    if (S.activeIdx === idx) return { key: 'acting', label: '行动中' };
    const card = managerCard(idx);
    if (S.acted.includes(idx)) {
      return card && card.locked ? { key: 'done', label: '✓ 已锁定' } : { key: 'done', label: '✓ 已行动' };
    }
    if (S.stage >= 2 && card && card.locked) return { key: 'skip', label: '锁定 · 跳过' };
    return { key: 'wait', label: '待行动' };
  }

  function renderManagerStrip() {
    const order = currentOrder();
    return `
      <div class="sd-mgr-strip">
        ${order.map((idx, oi) => {
          const mgr = MANAGERS[idx];
          const card = managerCard(idx);
          const st = managerTurnState(idx);
          return `
            <div class="sd-mgr ${st.key === 'acting' ? 'active' : ''} st-${st.key} ${mgr.human ? 'human' : ''}" style="--mc:${mgr.color}">
              <span class="sd-mgr-order">顺位${oi + 1}</span>
              <div class="sd-mgr-ava">${icon(mgr.human ? 'user' : 'bot')}</div>
              <div class="sd-mgr-info">
                <div class="sd-mgr-name">${esc(mgr.name)}</div>
                <div class="sd-mgr-team">${esc(mgr.teamName)}</div>
              </div>
              <div class="sd-mgr-state">
                ${coinsHtml(S.coins[idx])}
                <span class="sd-mgr-hold ${card && card.locked ? 'lk' : ''}">${card ? `${icon(card.locked ? 'lock' : 'unlock')}${card.idx + 1}号` : '未持卡'}</span>
              </div>
              <div class="sd-mgr-turnchip ${st.key}">${st.label}</div>
            </div>`;
        }).join('')}
      </div>`;
  }

  function turnBanner(title, sub, extraHtml = '') {
    return `
      <div class="sd-turn-banner">
        <div class="sd-turn-badge">${icon('user')}<b>你的回合</b></div>
        <div class="sd-turn-copy"><strong>${title}</strong><span>${sub}</span></div>
        ${extraHtml ? `<div class="sd-action-row">${extraHtml}</div>` : ''}
      </div>`;
  }

  // 回合行动结果气泡: AI 干了什么,大字展示一拍
  function renderActionCallout() {
    const act = S.lastAction;
    if (!act) return '';
    const mgr = MANAGERS[act.mgrIdx];
    return `
      <div class="sd-callout" style="--mc:${mgr.color}">
        <div class="sd-callout-ava">${icon(mgr.human ? 'user' : 'bot')}</div>
        <div class="sd-callout-copy">
          <b>${esc(mgr.name)}</b>
          <span>${icon(act.ic)}${act.text}</span>
        </div>
      </div>`;
  }

  function renderActionBar() {
    if (S.lastAction) return renderActionCallout();
    if (S.dealing) {
      return `<div class="sd-hint dim">${icon('ball')}正在发牌...</div>`;
    }
    if (S.awaiting === 'claim') {
      return turnBanner('认领一张卡', '点击任意一张【无主】卡牌,收入囊中');
    }
    if (S.awaiting === 'lockchoice') {
      return turnBanner('是否锁定?', '锁定=不能再换,对手要抢必须比价且出价超过卡的当前身价;不锁=下一轮还能换,但可能被免费截胡', `
        <button class="manager-btn primary sd-btn-ic" data-sd="lock-yes">${icon('lock')}锁定这张卡</button>
        <button class="manager-btn secondary sd-btn-ic" data-sd="lock-no">${icon('unlock')}保持灵活</button>`);
    }
    if (S.awaiting === 'action') {
      const mine = managerCard(0);
      return turnBanner('调整或坚守', '点对手的卡: 未锁定→免费截胡 / 已锁定→金币比价;或处理自己的持卡', `
        <button class="manager-btn primary sd-btn-ic" data-sd="keep-lock">${icon('lock')}锁定当前 ${mine ? `${mine.idx + 1}号卡` : ''}</button>
        <button class="manager-btn secondary sd-btn-ic" data-sd="keep">${icon('eye')}保持观望</button>`);
    }
    if (S.awaiting === 'reclaim') {
      return turnBanner('重新认领', '你的卡被夺走了!点击一张【无主】卡牌补选');
    }
    if (S.activeIdx >= 0 && !MANAGERS[S.activeIdx].human) {
      const mgr = MANAGERS[S.activeIdx];
      return `
        <div class="sd-callout thinking" style="--mc:${mgr.color}">
          <div class="sd-callout-ava">${icon('bot')}</div>
          <div class="sd-callout-copy">
            <b>轮到 ${esc(mgr.name)}</b>
            <span class="sd-thinking">正在思考<i>.</i><i>.</i><i>.</i></span>
          </div>
        </div>`;
    }
    return '';
  }

  const LOG_ICONS = { me: 'user', ai: 'bot', duel: 'gavel', stage: 'flag', reveal: 'star', info: 'ball' };
  function renderLogFeed() {
    return `
      <div class="sd-log">
        ${S.log.slice(0, 12).map(item => `<div class="sd-log-line ${item.kind}">${icon(LOG_ICONS[item.kind] || 'ball')}<span>${item.text}</span></div>`).join('')}
      </div>`;
  }

  const STAGE_ICONS = ['chart', 'medal', 'jersey'];
  // 本位置的 4 个流程步骤(数据轮/荣誉轮/球队轮/揭晓), 用于流程时间轴
  const FLOW_STEPS = [
    { key: 1, ic: 'chart', label: '① 数据轮', desc: '看数据 · 认领+锁定' },
    { key: 2, ic: 'medal', label: '② 荣誉轮', desc: '荣誉揭示 · 可换/抢/比价' },
    { key: 3, ic: 'jersey', label: '③ 球队轮', desc: '球队揭示 · 最后调整' },
    { key: 4, ic: 'star', label: '④ 揭晓', desc: '翻牌 · 确认归属' }
  ];

  function flowStepNow() {
    if (S.revealing) return 4;
    return Math.min(3, Math.max(1, S.stage));
  }

  function renderStageRail() {
    const stepNow = flowStepNow();
    return `
      <div class="sd-flowbar">
        <div class="sd-flow-pos">
          <span class="sd-flow-pos-big">${slotNow() ? slotNow().short : ''}</span>
          <span class="sd-flow-pos-sub">位置 ${S.posIndex + 1}/5</span>
          <div class="sd-flow-pos-dots">
            ${SLOTS.map((slot, i) => `<i class="${i < S.posIndex ? 'done' : i === S.posIndex ? 'now' : ''}" title="${slot.short}"></i>`).join('')}
          </div>
        </div>
        <div class="sd-flow-steps">
          ${FLOW_STEPS.map(step => {
            const state = stepNow > step.key ? 'done' : stepNow === step.key ? 'now' : '';
            return `
              <div class="sd-flow-step ${state}">
                <div class="sd-flow-step-head">${icon(step.ic)}${step.label}${state === 'done' ? '<b>✓</b>' : ''}</div>
                <div class="sd-flow-step-desc">${step.desc}</div>
              </div>`;
          }).join('<span class="sd-flow-link"></span>')}
        </div>
      </div>`;
  }

  // 卡区上方常驻指令条: 当前轮该干嘛,一句话讲清楚
  function renderStageHeadline() {
    if (S.dealing) {
      return `<div class="sd-headline dealing">${icon('ball')}<b>发牌中</b><span>5 张 ${slotNow().short} 全明星卡正在从卡堆散开...</span></div>`;
    }
    if (S.revealing) {
      return `<div class="sd-headline reveal">${icon('star')}<b>身份揭晓</b><span>翻牌!看看每位经理抢到了谁</span></div>`;
    }
    const stage = Math.min(3, Math.max(1, S.stage));
    const copy = stage === 1
      ? { b: '第1轮 · 数据轮', s: '只显示巅峰数据 → 按蛇形顺序认领一张卡,并决定是否锁定' }
      : stage === 2
        ? { b: '第2轮 · 荣誉轮', s: '生涯荣誉已揭示 → 未锁定者轮流行动: 保持 / 换无主卡 / 截胡未锁卡 / 对锁定卡比价(出价须超其身价)' }
        : { b: '第3轮 · 球队轮(最终轮)', s: '效力球队已揭示 → 最后调整机会(比价同样须超身价),本轮结束后全员强制锁定并翻牌' };
    return `<div class="sd-headline s${stage}">${icon(STAGE_ICONS[stage - 1])}<b>${copy.b}</b><span>${copy.s}</span></div>`;
  }

  function renderDraft() {
    return `
      <div class="sd-draft-layout">
        <section class="sd-main">
          ${renderStageRail()}
          ${renderManagerStrip()}
          <div class="sd-card-stage">
            ${renderStageHeadline()}
            ${S.dealing ? `
              <div class="sd-deck" aria-hidden="true">
                <i></i><i></i><i></i>
                <span class="sd-deck-label">${icon('ball')}${slotNow().short} 卡堆</span>
              </div>` : ''}
            <div class="sd-card-grid ${S.revealing ? 'revealing' : ''} ${S.dealing ? 'is-dealing' : ''}">
              ${S.cards.map(renderCard).join('')}
            </div>
          </div>
          <div class="sd-action-zone">${renderActionBar()}</div>
        </section>
        <aside class="sd-side">
          <h3>我的阵容</h3>
          <div class="sd-roster">
            ${SLOTS.map((slot, i) => {
              const card = S.rosters[0][i];
              return `
                <div class="sd-roster-row ${card ? 'filled' : ''} ${i === S.posIndex && S.phase === 'draft' ? 'now' : ''}">
                  <span class="sd-roster-pos">${slot.short}</span>
                  <span class="sd-roster-name">${card ? esc(card.entry.nameCn) : (i === S.posIndex ? '选秀中...' : '待选')}</span>
                  <span class="sd-roster-src">${card ? `${card.entry.peakYear} ${esc(card.entry.peakTeamCn)}${cardCost(card) ? ` 💰${cardCost(card)}` : ''}` : ''}</span>
                </div>`;
            }).join('')}
          </div>
          <h3>实况</h3>
          ${renderLogFeed()}
        </aside>
      </div>`;
  }

  /* ---------- 比价弹窗 ---------- */
  function renderBidModal() {
    if (!S.bidCtx) return '';
    const ctx = S.bidCtx;
    const card = S.cards[ctx.cardIdx];
    const challenger = MANAGERS[ctx.challengerIdx];
    const defender = MANAGERS[ctx.defenderIdx];
    const humanSide = S.awaiting === 'bid' ? (ctx.phase === 'defend' ? 'defend' : 'attack') : null;
    const P = num(ctx.price, 0);
    let body = '';
    if (ctx.phase === 'reveal') {
      const cWin = ctx.cBid > ctx.dBid;
      body = `
        <div class="sd-bid-reveal">
          <div class="sd-bid-side ${cWin ? 'win' : 'lose'}" style="--mc:${challenger.color}">
            <i class="sd-bid-role">${icon('gavel')}挑战</i>
            <span>${esc(challenger.name)}</span>
            <strong>${icon('coin')}${ctx.cBid}</strong>
            ${cWin ? `<em class="sd-bid-tag">${icon('trophy')}夺得</em>` : '<em class="sd-bid-tag keep">不消耗</em>'}
          </div>
          <div class="sd-bid-vs">VS</div>
          <div class="sd-bid-side ${cWin ? 'lose' : 'win'}" style="--mc:${defender.color}">
            <i class="sd-bid-role">${icon('shield')}防守</i>
            <span>${esc(defender.name)}</span>
            <strong>${icon('coin')}${ctx.dBid}</strong>
            ${cWin ? '<em class="sd-bid-tag keep">不消耗</em>' : `<em class="sd-bid-tag">${icon('shield')}保住</em>`}
          </div>
        </div>
        <p class="sd-bid-result">${cWin ? `${esc(challenger.name)} 出价更高,夺走球员!` : `${esc(defender.name)} 守住了球员!`}</p>`;
    } else if (humanSide) {
      const isDefend = humanSide === 'defend';
      // 挑战者: 总出价须 > 身价, 上限 = 手上金币; 守方: 总承诺 ≥ 身价, 上限 = 身价 + 手上金币
      const minBid = isDefend ? P : P + 1;
      const maxBid = isDefend ? P + S.coins[0] : S.coins[0];
      body = `
        <p class="sd-bid-tip">${isDefend
          ? `<b>${esc(challenger.name)}</b> 想抢走你锁定的 <b>${cardLabel(card)}</b>!你已押 <b>${P}</b> 金币在这张卡上 —— 决定<b>总承诺</b>(只需补差价): 对方总出价超过你的总承诺才能抢走;守住只扣差价,丢卡则全额退回 ${P} 金币`
          : `对 <b>${esc(defender.name)}</b> 锁定的 <b>${cardLabel(card)}</b> 出价 —— 当前身价 <b>${P}</b>,总出价必须超过身价且高于守方总承诺才能抢到;赢了押上出价(成为新身价),输了不花钱`}</p>
        <div class="sd-bid-stepper">
          <button type="button" data-sd="bid-minus" aria-label="减少">−</button>
          <span class="sd-bid-value">${icon('coin')}<b id="sdBidValue" data-min="${minBid}" data-max="${maxBid}">${minBid}</b></span>
          <button type="button" data-sd="bid-plus" aria-label="增加">+</button>
          <em>${isDefend ? `总承诺(已押${P},加价上限${S.coins[0]})` : `/ 手上 ${S.coins[0]} 枚`}</em>
        </div>
        <div class="sd-action-row center">
          <button class="manager-btn primary sd-btn-ic" data-sd="bid-confirm">${icon(isDefend ? 'shield' : 'gavel')}确认暗价</button>
        </div>`;
    } else {
      body = `<p class="sd-bid-tip center">${icon('coin')}双方正在暗中出价...</p>`;
    }
    return `
      <div class="sd-modal-bg">
        <div class="sd-modal">
          <h3>${icon('gavel')}金币比价 · ${cardLabel(card)} <span class="sd-price-chip">${icon('coin')}身价 ${P}</span></h3>
          ${body}
        </div>
      </div>`;
  }

  /* ---------- 年代转盘 ---------- */
  function renderEra() {
    const rosterRecap = MANAGERS.map(mgr => `
      <div class="sd-recap-team" style="--mc:${mgr.color}">
        <div class="sd-recap-head">${icon(mgr.human ? 'user' : 'bot')}${esc(mgr.name)} · ${esc(mgr.teamName)} <em>剩${coinsHtml(S.coins[mgr.idx])}</em></div>
        <div class="sd-recap-players">
          ${S.rosters[mgr.idx].map((card, i) => card ? `<span><b>${SLOTS[i].short}</b> ${esc(card.entry.nameCn)}</span>` : '').join('')}
        </div>
      </div>`).join('');
    return `
      <div class="sd-era-layout">
        <h2 class="sd-era-title">${S.era ? `命运降临 · ${S.era.year} ${esc(S.era.label)}` : '五支梦之队集结完毕'}</h2>
        <p class="sd-era-sub">${S.era ? esc(S.era.desc) : '点击按钮,让命运转盘决定你们空降哪个年代的联盟'}</p>
        <div class="sd-era-wheel ${S.eraRolling ? 'rolling' : ''} ${S.era ? 'landed' : ''}">
          ${ERAS.map((era, i) => `
            <div class="sd-era-card ${S.eraRolling && S.eraHighlight === i ? 'hot' : ''} ${S.era && S.era.year === era.year ? 'final' : ''}">
              <span class="sd-era-year">${era.year}</span>
              <span class="sd-era-label">${esc(era.label)}</span>
              <span class="sd-era-desc">${esc(era.desc)}</span>
            </div>`).join('')}
        </div>
        ${!S.era && !S.eraRolling ? `<button class="manager-btn massive primary sd-btn-ic" data-sd="roll-era">${icon('bolt')}启动命运转盘</button>` : ''}
        ${S.era ? `<div class="sd-era-go">正在空降 ${S.era.year} 联盟,五队同步开打 82 场...</div>` : ''}
        <div class="sd-recap-grid">${rosterRecap}</div>
      </div>`;
  }

  /* ---------- 模拟直播 ---------- */
  function renderSim() {
    const sorted = [...S.simRows].sort((a, b) => b.w - a.w || (b.derbyW || 0) - (a.derbyW || 0));
    const maxW = Math.max(1, ...S.simRows.map(r => r.w));
    const ranksNow = {};
    sorted.forEach((row, rank) => { ranksNow[row.idx] = rank + 1; });
    const prev = S.prevRanks || ranksNow;
    S.prevRanks = ranksNow;
    return `
      <div class="sd-sim-layout">
        <div class="sd-sim-head">
          <h2>${icon('ball')}${S.era.year} ${esc(S.era.label)} · 五队争霸直播</h2>
          <span class="sd-sim-round">ROUND ${S.simRound} / 82</span>
          <span class="live-pill">LIVE</span>
        </div>
        <div class="sd-sim-progress"><i style="width:${(S.simRound / 82 * 100).toFixed(1)}%"></i></div>
        <div class="sd-race">
          ${sorted.map((row, rank) => {
            const mgr = MANAGERS[row.idx];
            const delta = (prev[row.idx] || rank + 1) - (rank + 1);
            return `
              <div class="sd-race-row ${mgr.human ? 'human' : ''} ${rank === 0 ? 'leader' : ''}" style="--mc:${mgr.color}">
                <span class="sd-race-rank">${rank === 0 ? icon('crown') : `#${rank + 1}`}
                  ${delta > 0 ? '<i class="rk-up">▲</i>' : delta < 0 ? '<i class="rk-dn">▼</i>' : ''}</span>
                <span class="sd-race-team">${esc(mgr.teamName)}<small>${icon(mgr.human ? 'user' : 'bot')}${esc(mgr.name)}</small></span>
                <div class="sd-race-bar"><i style="width:${(row.w / Math.max(maxW, 1) * 100).toFixed(1)}%"></i></div>
                <span class="sd-race-rec">${row.w}<em>胜</em>${row.l}<em>负</em></span>
                <span class="sd-race-last ${row.last ? (row.last.win ? 'w' : 'l') : ''} ${row.last && row.last.derby ? 'derby' : ''}">${row.last ? `${row.last.derby ? icon('gavel') : ''}${row.last.win ? 'W' : 'L'} ${row.last.my}-${row.last.opp} ${row.last.home ? 'vs' : '@'} ${esc(row.last.oppName)}` : '--'}</span>
                <span class="sd-race-streak">${row.streak > 2 ? `${icon('bolt')}${row.streak}连胜` : row.streak < -2 ? `${-row.streak}连败` : ''}</span>
              </div>`;
          }).join('')}
        </div>
        <div class="sim-actions">
          <button class="manager-btn ghost" data-sd="skip-sim" ${S.skipSim ? 'disabled' : ''}>${S.skipSim ? '⏩ 快进中...' : '⏩ 跳过动画,直接看结果'}</button>
        </div>
      </div>`;
  }

  /* ---------- 结算渲染 ---------- */
  function acquiredText(card) {
    if (!card) return '';
    if (card.acquiredBy === 'duel') return `比价夺得 💰${cardCost(card)}`;
    if (card.acquiredBy === 'steal') return '中途截胡';
    if (card.acquiredBy === 'reclaim') return '被抢后补选';
    return cardCost(card) ? `防守保住 💰${cardCost(card)}` : '直接认领';
  }

  function renderResultsView() {
    const res = S.result;
    if (!res) return '';
    const champ = res.entries[0];
    const awards = res.awards || {};
    const fantasyIdSet = new Set(res.entries.map(e => e.teamId));
    const awardRows = [
      ['MVP', awards.mvp], ['DPOY', awards.dpoy], ['得分王', awards.scoring],
      ['篮板王', awards.rebound], ['助攻王', awards.assist]
    ];
    return `
      <div class="sd-results">
        <section class="sd-champ-hero" style="--mc:${champ.mgr.color}">
          <div class="sd-confetti" aria-hidden="true">${Array.from({ length: 14 }, (_, i) => `<i style="--ci:${i}"></i>`).join('')}</div>
          <div class="sd-champ-trophy">${icon('trophy', 'huge')}</div>
          <div class="sd-champ-copy">
            <p class="sd-champ-kicker">${res.era.year} ${esc(res.era.label)} · 最强球队</p>
            <h2>${esc(champ.mgr.teamName)}</h2>
            <p class="sd-champ-sub">经理: ${esc(champ.mgr.name)} · 战绩 ${champ.record.w}-${champ.record.l} · 德比 ${champ.derbyW}-${champ.derbyL} · 联盟第 ${champ.leagueRank}</p>
            <p class="sd-champ-motto">"${esc(champ.mgr.motto)}"</p>
          </div>
          <div class="grade-stamp ${champ.grade.cls}">
            <span class="grade-letter">${champ.grade.letter}</span>
            <span class="grade-sub">${champ.record.w} WINS</span>
          </div>
        </section>

        <section class="sd-podium">
          ${res.entries.map(entry => `
            <div class="sd-podium-row ${entry.rank === 1 ? 'first' : ''} ${entry.mgr.human ? 'human' : ''}" style="--mc:${entry.mgr.color}">
              <span class="sd-podium-rank">${entry.rank === 1 ? icon('crown') : `#${entry.rank}`}</span>
              <span class="sd-podium-team">${esc(entry.mgr.teamName)}<small>${esc(entry.mgr.name)}</small></span>
              <span class="sd-podium-rec">${entry.record.w}-${entry.record.l}</span>
              <span class="sd-podium-derby">德比 ${entry.derbyW}-${entry.derbyL}</span>
              <span class="sd-podium-diff">净胜 ${((num(entry.record.pf, 0) - num(entry.record.pa, 0)) / Math.max(1, num(entry.record.gp, 82))).toFixed(1)}</span>
              <span class="sd-podium-rank2">联盟第${entry.leagueRank}</span>
              <span class="sd-podium-coin">${coinsHtml(entry.coinsLeft)}</span>
              <span class="sd-podium-grade ${entry.grade.cls}">${entry.grade.letter}</span>
            </div>`).join('')}
        </section>

        ${res.entries.map(entry => `
          <article class="result-card full sd-team-card ${entry.mgr.human ? 'human' : ''}" style="--mc:${entry.mgr.color}">
            <h3>${entry.rank === 1 ? '🏆 ' : `#${entry.rank} `}${esc(entry.mgr.teamName)} <small>· ${esc(entry.mgr.name)} · ${entry.record.w}-${entry.record.l} · 花费💰${entry.coinsSpent}</small></h3>
            <div class="tbl"><table>
              <thead><tr><th>位置</th><th>球员</th><th>巅峰来源</th><th>获得方式</th><th>GP</th><th>PTS</th><th>REB</th><th>AST</th><th>STL</th><th>BLK</th><th>FG%</th><th>3P%</th><th>生涯荣誉</th></tr></thead>
              <tbody>
                ${entry.stats.map((item, i) => {
                  const card = entry.roster[i];
                  return `
                    <tr>
                      <td>${SLOTS[i].short}</td>
                      <td class="sd-res-name">${esc(card ? card.entry.nameCn : item.player.name)}</td>
                      <td>${card ? `${card.entry.peakYear} ${esc(card.entry.peakTeamCn)}` : '--'}</td>
                      <td>${acquiredText(card)}</td>
                      <td>${item.gp}</td><td>${item.ppg}</td><td>${item.rpg}</td><td>${item.apg}</td>
                      <td>${item.spg}</td><td>${item.bpg}</td><td>${item.fgPct}</td><td>${item.tpPct}</td>
                      <td class="sd-res-honors">${card ? honorBadgesHtml(card.entry, 6) : ''}</td>
                    </tr>`;
                }).join('')}
              </tbody>
            </table></div>
          </article>`).join('')}

        <div class="results-grid">
          <article class="result-card">
            <h3>赛季奖项</h3>
            ${awardRows.map(([label, item]) => `
              <div class="award-row"><span>${label}</span><strong>${item ? `${esc(item.name)} · ${esc(item.team)}` : '--'}</strong></div>`).join('')}
          </article>
          <article class="result-card">
            <h3>金币账本</h3>
            ${res.entries.map(entry => `
              <div class="award-row"><span>${esc(entry.mgr.name)}</span><strong>花 ${entry.coinsSpent} / 剩 ${entry.coinsLeft}</strong></div>`).join('')}
            ${res.duels.length ? `<p class="sd-duel-recap">共发生 ${res.duels.length} 次金币争夺${(() => {
              const biggest = [...res.duels].sort((a, b) => Math.max(b.cBid, b.dBid) - Math.max(a.cBid, a.dBid))[0];
              return biggest ? `,最大手笔: ${esc(biggest.winner)} 为 ${esc(biggest.card)} 掷出 ${Math.max(biggest.cBid, biggest.dBid)} 金币` : '';
            })()}</p>` : '<p class="sd-duel-recap">全程和平,无人开启金币战争</p>'}
          </article>
          <article class="result-card">
            <h3>${res.era.year} 联盟格局</h3>
            ${res.standings.slice(0, 10).map((row, i) => `
              <div class="award-row ${fantasyIdSet.has(row.id) ? 'sd-standing-us' : ''}">
                <span>#${i + 1} ${esc(row.z || row.n)}</span><strong>${row.w}-${row.l}</strong>
              </div>`).join('')}
          </article>
        </div>

        <footer class="results-footer">
          <button class="manager-btn massive primary" data-sd="restart">再来一局 (REMATCH)</button>
          <button class="manager-btn massive secondary" data-sd="back">返回主菜单</button>
        </footer>
      </div>`;
  }

  /* ---------- 事件绑定 ---------- */
  function bindRoot() {
    root.querySelectorAll('[data-sd]').forEach(btn => {
      btn.addEventListener('click', () => handleAction(btn.getAttribute('data-sd')));
    });
    root.querySelectorAll('[data-card]').forEach(cardEl => {
      cardEl.addEventListener('click', () => handleCardClick(num(cardEl.getAttribute('data-card'), -1)));
    });
  }

  function handleAction(action) {
    switch (action) {
      case 'back':
        if (S.phase === 'results' || confirm('返回主菜单将放弃当前对局,确定吗?')) exitToMenu();
        break;
      case 'restart':
        exitToMenu();
        startShowdown();
        break;
      case 'lock-yes': if (S.awaiting === 'lockchoice') { S.awaiting = null; resolveUI(true); } break;
      case 'lock-no': if (S.awaiting === 'lockchoice') { S.awaiting = null; resolveUI(false); } break;
      case 'keep': if (S.awaiting === 'action') { S.awaiting = null; resolveUI({ type: 'keep' }); } break;
      case 'keep-lock': if (S.awaiting === 'action') { S.awaiting = null; resolveUI({ type: 'keeplock' }); } break;
      case 'roll-era': if (S.phase === 'era' && !S.eraRolling && !S.era) {
        rollEraAndSim().catch(err => { if (!(err instanceof Aborted)) { console.error(err); S.poolError = String(err.message || err); render(); } });
      } break;
      case 'skip-sim': S.skipSim = true; render(); break;
      case 'bid-minus': stepBid(-1); break;
      case 'bid-plus': stepBid(1); break;
      case 'bid-confirm': {
        const span = document.getElementById('sdBidValue');
        if (span && S.awaiting === 'bid') { S.awaiting = null; resolveUI(num(span.textContent, 0)); }
        break;
      }
      default: break;
    }
  }

  function stepBid(delta) {
    const span = document.getElementById('sdBidValue');
    if (!span) return;
    const min = num(span.getAttribute('data-min'), 0);
    const max = num(span.getAttribute('data-max'), 0);
    span.textContent = String(Math.max(min, Math.min(max, num(span.textContent, 0) + delta)));
  }

  function handleCardClick(cardIdx) {
    const card = S.cards[cardIdx];
    if (!card) return;
    if (S.awaiting === 'claim') {
      if (card.owner >= 0) return;
      S.awaiting = null;
      resolveUI(cardIdx);
    } else if (S.awaiting === 'reclaim') {
      if (card.owner >= 0) return;
      S.awaiting = null;
      resolveUI(cardIdx);
    } else if (S.awaiting === 'action') {
      if (card.owner === 0) return; // 自己的卡用按钮处理
      if (card.locked && card.owner >= 0) {
        const minBid = num(card.price, 0) + 1;
        if (S.coins[0] < minBid) { pushLog(`这张卡身价 ${card.price},至少要出 ${minBid} 金币,你的金币不足`, 'me'); render(); return; }
        S.awaiting = null;
        resolveUI({ type: 'challenge', cardIdx });
      } else {
        S.awaiting = null;
        resolveUI({ type: 'take', cardIdx });
      }
    }
  }

  /* ---------- render_game_to_text (测试钩子) ---------- */
  const prevRenderText = window.render_game_to_text;
  window.render_game_to_text = function () {
    if (!S.active) return typeof prevRenderText === 'function' ? prevRenderText() : '{}';
    return JSON.stringify({
      mode: 'allstar_showdown',
      phase: S.phase,
      pos: S.phase === 'draft' && slotNow() ? slotNow().short : null,
      stage: S.stage,
      awaiting: S.awaiting,
      activeManager: S.activeIdx >= 0 ? MANAGERS[S.activeIdx].name : null,
      coins: S.coins,
      cards: S.cards.map(c => ({
        no: c.idx + 1,
        owner: c.owner >= 0 ? MANAGERS[c.owner].name : null,
        locked: c.locked,
        price: c.price || 0,
        revealed: !!c.revealed,
        name: c.revealed ? c.entry.nameCn : undefined,
        stats: c.entry.stats,
        honors: S.stage >= 2 ? c.entry.honorSummary : undefined,
        team: S.stage >= 3 ? `${c.entry.peakYear} ${c.entry.peakTeamCn}` : undefined
      })),
      rosters: S.rosters.map((r, i) => ({
        manager: MANAGERS[i].name,
        players: r.map((c, j) => c ? `${SLOTS[j].short}:${c.entry.nameCn}` : null).filter(Boolean)
      })),
      bid: S.bidCtx ? { phase: S.bidCtx.phase, cBid: S.bidCtx.cBid, dBid: S.bidCtx.dBid } : null,
      era: S.era ? S.era.year : null,
      simRound: S.simRound,
      simRows: S.simRows.map(r => ({ team: MANAGERS[r.idx].teamName, w: r.w, l: r.l, derbyW: r.derbyW || 0, derbyL: r.derbyL || 0 })),
      result: S.result ? S.result.entries.map(e => ({ rank: e.rank, team: e.mgr.teamName, w: e.record.w, l: e.record.l, coinsLeft: e.coinsLeft, coinsSpent: e.coinsSpent })) : null,
      log: S.log.slice(0, 6).map(l => l.text)
    }, null, 1);
  };

  entryBtn.addEventListener('click', startShowdown);
})();
