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
    revealing: false
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
        paidBy: MANAGERS.map(() => 0),
        acquiredBy: '',
        aiNoise: MANAGERS.map(m => m.human ? 0 : (Math.random() * 2 - 1) * m.noise)
      };
    });
  }

  async function runDraft(gen) {
    for (S.posIndex = 0; S.posIndex < SLOTS.length; S.posIndex++) {
      guard(gen);
      S.stage = 1;
      dealCards(gen);
      pushLog(`—— ${slotNow().short} 位置开抽: 5 张全明星卡(${STAGE_INFO[0].label}) ——`, 'stage');
      render();
      await sleep(700);

      // 第一轮: 认领 + 锁定
      for (const mIdx of currentOrder()) {
        guard(gen);
        await takeClaimTurn(gen, mIdx);
      }

      // 第二/三轮: 未锁定者行动
      for (S.stage = 2; S.stage <= 3; S.stage++) {
        guard(gen);
        pushLog(`—— ${slotNow().short} ${STAGE_INFO[S.stage - 1].label}: ${STAGE_INFO[S.stage - 1].desc} ——`, 'stage');
        render();
        await sleep(800);
        for (const mIdx of currentOrder()) {
          guard(gen);
          const card = managerCard(mIdx);
          if (card && card.locked) continue;
          await takeActionTurn(gen, mIdx);
        }
      }

      // 收尾: 全员锁定 + 翻牌
      S.stage = 3;
      S.cards.forEach(card => { card.locked = true; });
      await revealPosition(gen);
    }
    guard(gen);
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
      await sleep(650);
      guard(gen);
      const free = freeCards();
      const best = free.reduce((a, b) => aiCardValue(mgr, b, S.stage) > aiCardValue(mgr, a, S.stage) ? b : a, free[0]);
      best.owner = mIdx;
      best.acquiredBy = 'claim';
      best.locked = aiShouldLock(mgr, best);
      pushLog(`${mgr.name} 认领了 ${cardLabel(best)}${best.locked ? ' 并【锁定】' : ''}`, 'ai');
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
      await sleep(750);
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
      } else {
        pushLog(`${mgr.name} 按兵不动,继续观望`, 'ai');
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
          await reclaimFor(gen, victim);
        } else {
          pushLog(`${mgr.name} 换成了无主的 ${cardLabel(best)}${best.locked ? ' 并【锁定】' : ''}`, 'ai');
        }
        return;
      }
    } else {
      const challengeMargin = mgr.style === 'gambler' ? 1.5 : mgr.style === 'miser' ? 6 : 3;
      if (gain > challengeMargin && S.coins[mgr.idx] >= 1) {
        await runDuel(gen, mgr.idx, best);
        return;
      }
    }
    if (mine && aiShouldLock(mgr, mine)) {
      mine.locked = true;
      pushLog(`${mgr.name}【锁定】了 ${cardLabel(mine)}`, 'ai');
    } else {
      pushLog(`${mgr.name} 保持现状,继续观望`, 'ai');
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
      await sleep(500);
      guard(gen);
      const best = free.reduce((a, b) => aiCardValue(mgr, b, S.stage) > aiCardValue(mgr, a, S.stage) ? b : a, free[0]);
      best.owner = mIdx;
      best.acquiredBy = 'reclaim';
      pushLog(`${mgr.name} 重新认领了 ${cardLabel(best)}`, 'ai');
    }
    render();
  }

  /* ---------- 金币比价 ---------- */
  function aiBidAmount(mgr, card, isDefender, oppIdx) {
    const val = aiCardValue(mgr, card, S.stage);
    const mine = managerCard(mgr.idx);
    const backup = isDefender
      ? (freeCards().length ? Math.max(...freeCards().map(c => aiCardValue(mgr, c, S.stage)), 0) : 0)
      : (mine ? aiCardValue(mgr, mine, S.stage) : 0);
    const gain = Math.max(0, val - backup);
    const remainingSlots = SLOTS.length - S.posIndex;
    const reserve = mgr.style === 'gambler' ? 0 : mgr.style === 'miser' ? Math.min(4, remainingSlots) : Math.max(0, remainingSlots - 2);
    const budget = Math.max(0, S.coins[mgr.idx] - reserve);
    let bid = Math.round(gain * 0.28 * mgr.aggr + (mgr.style === 'gambler' ? 1 : 0));
    if (isDefender) bid = Math.round(bid * 0.9);
    return Math.max(isDefender ? 0 : 1, Math.min(budget, bid));
  }

  async function runDuel(gen, challengerIdx, card) {
    const defenderIdx = card.owner;
    const challenger = MANAGERS[challengerIdx];
    const defender = MANAGERS[defenderIdx];
    if (S.coins[challengerIdx] < 1) return;

    S.bidCtx = { cardIdx: card.idx, challengerIdx, defenderIdx, cBid: null, dBid: null, phase: 'input' };
    pushLog(`⚔️ ${challenger.name} 对 ${defender.name} 锁定的 ${cardLabel(card)} 发起金币争夺!`, 'duel');

    let cBid;
    let dBid;
    if (challenger.human) {
      S.awaiting = 'bid';
      render();
      cBid = num(await waitUI(), 1);
      guard(gen);
    } else {
      cBid = aiBidAmount(challenger, card, false, defenderIdx);
    }
    cBid = Math.max(1, Math.min(S.coins[challengerIdx], cBid));
    S.bidCtx.cBid = cBid;

    if (defender.human) {
      S.awaiting = 'bid';
      S.bidCtx.phase = 'defend';
      render();
      dBid = num(await waitUI(), 0);
      guard(gen);
    } else {
      dBid = aiBidAmount(defender, card, true, challengerIdx);
    }
    dBid = Math.max(0, Math.min(S.coins[defenderIdx], dBid));
    S.bidCtx.dBid = dBid;

    // 揭示
    S.awaiting = null;
    S.bidCtx.phase = 'reveal';
    render();
    await sleep(1300);
    guard(gen);

    const challengerWins = cBid > dBid;
    const duelRec = {
      pos: slotNow().short, card: cardLabel(card),
      challenger: challenger.name, defender: defender.name,
      cBid, dBid, winner: challengerWins ? challenger.name : defender.name
    };
    S.duels.push(duelRec);

    if (challengerWins) {
      S.coins[challengerIdx] -= cBid;
      S.spent[challengerIdx] += cBid;
      const mine = managerCard(challengerIdx);
      if (mine) mine.owner = -1;
      card.owner = challengerIdx;
      card.locked = true;
      card.acquiredBy = 'duel';
      card.paidBy[challengerIdx] += cBid;
      pushLog(`💰 ${challenger.name} 出 ${cBid} 金币 > ${defender.name} 的 ${dBid},夺走 ${cardLabel(card)}!`, 'duel');
      S.bidCtx = null;
      render();
      await reclaimFor(gen, defenderIdx);
    } else {
      if (dBid > cBid) {
        S.coins[defenderIdx] -= dBid;
        S.spent[defenderIdx] += dBid;
        card.paidBy[defenderIdx] += dBid;
        pushLog(`🛡️ ${defender.name} 出 ${dBid} 金币 ≥ ${challenger.name} 的 ${cBid},保住 ${cardLabel(card)}`, 'duel');
      } else {
        pushLog(`🛡️ 双方各出 ${cBid} 金币打平,${defender.name} 保住 ${cardLabel(card)},双方不消耗`, 'duel');
      }
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

  // 当前持有者为这张卡实际支付的金币
  function cardCost(card) {
    if (!card || card.owner < 0) return 0;
    return num(card.paidBy && card.paidBy[card.owner], 0);
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
    root.innerHTML = `<div class="sd-wrap">${renderTopbar()}${body}${renderBidModal()}</div>`;
    bindRoot();
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

  function renderCard(card) {
    const st = card.entry.stats || {};
    const owner = cardOwner(card);
    const mineTurn = S.activeIdx === 0 && MANAGERS[0];
    const cls = ['sd-card'];
    if (card.locked) cls.push('locked');
    if (owner) cls.push('owned');
    if (card.revealed) cls.push('revealed');
    if (owner && owner.idx === 0) cls.push('is-mine');
    const stageNow = S.stage;
    const front = card.revealed ? `
      <div class="sd-card-front">
        <img class="sd-photo" src="${esc(getPlayerPhotoSrc(card.player))}" alt="" onerror="this.src='${esc(getPlayerPhotoPath(0))}'">
        <div class="sd-front-name">${esc(card.entry.nameCn)}</div>
        <div class="sd-front-sub">${card.entry.peakYear} · ${esc(card.entry.peakTeamCn)} · OVR ${num(card.player.rating, 0)}</div>
      </div>` : '';
    return `
      <div class="${cls.join(' ')}" data-card="${card.idx}">
        <div class="sd-card-inner">
          <div class="sd-card-back">
            <div class="sd-card-head">
              <span class="sd-card-no">${card.idx + 1}号卡</span>
              ${card.locked ? '<span class="sd-lock">🔒 已锁定</span>' : ''}
            </div>
            <div class="sd-mystery">?</div>
            <div class="sd-stat-grid">
              <div><span>得分</span><strong>${fmt1(st.ppg)}</strong></div>
              <div><span>篮板</span><strong>${fmt1(st.rpg)}</strong></div>
              <div><span>助攻</span><strong>${fmt1(st.apg)}</strong></div>
              <div><span>抢断</span><strong>${fmt1(st.spg)}</strong></div>
              <div><span>盖帽</span><strong>${fmt1(st.bpg)}</strong></div>
              <div><span>命中%</span><strong>${fmt1(st.fgPct)}</strong></div>
            </div>
            ${stageNow >= 2 ? `<div class="sd-honor-row">${honorBadgesHtml(card.entry)}</div>` : '<div class="sd-honor-row dim">荣誉将在下一轮揭示</div>'}
            ${stageNow >= 3 ? `<div class="sd-team-row">📍 ${card.entry.peakYear} 赛季 · ${esc(card.entry.peakTeamCn)}</div>` : '<div class="sd-team-row dim">球队将在最后一轮揭示</div>'}
            ${owner ? `<div class="sd-owner-chip" style="--mc:${owner.color}">${owner.idx === 0 ? '🫵 ' : ''}${esc(owner.name)}${cardCost(card) ? ` · 💰${cardCost(card)}` : ''}</div>` : '<div class="sd-owner-chip free">无主</div>'}
          </div>
          ${front}
        </div>
      </div>`;
  }

  function renderManagerStrip() {
    const order = currentOrder();
    return `
      <div class="sd-mgr-strip">
        ${order.map(idx => {
          const mgr = MANAGERS[idx];
          const card = managerCard(idx);
          const active = S.activeIdx === idx;
          return `
            <div class="sd-mgr ${active ? 'active' : ''} ${mgr.human ? 'human' : ''}" style="--mc:${mgr.color}">
              <div class="sd-mgr-name">${esc(mgr.name)}</div>
              <div class="sd-mgr-team">${esc(mgr.teamName)}</div>
              <div class="sd-mgr-coins">💰 ${S.coins[idx]}</div>
              <div class="sd-mgr-hold">${card ? `${card.idx + 1}号卡${card.locked ? ' 🔒' : ''}` : '未持卡'}</div>
            </div>`;
        }).join('')}
      </div>`;
  }

  function renderActionBar() {
    if (S.awaiting === 'claim') {
      return '<div class="sd-hint pulse">🫵 你的回合: 点击一张<b>无主卡</b>认领</div>';
    }
    if (S.awaiting === 'lockchoice') {
      return `
        <div class="sd-hint">是否锁定这张卡?锁定后本位置不能再更换,但对手要抢只能花金币比价。</div>
        <div class="sd-action-row">
          <button class="manager-btn primary" data-sd="lock-yes">🔒 锁定</button>
          <button class="manager-btn secondary" data-sd="lock-no">保持灵活</button>
        </div>`;
    }
    if (S.awaiting === 'action') {
      const mine = managerCard(0);
      return `
        <div class="sd-hint pulse">🫵 你的回合: 点其他卡可<b>换/抢/比价</b>,或直接处理当前持卡</div>
        <div class="sd-action-row">
          <button class="manager-btn primary" data-sd="keep-lock">🔒 锁定当前 ${mine ? `${mine.idx + 1}号卡` : ''}</button>
          <button class="manager-btn secondary" data-sd="keep">保持不锁</button>
        </div>`;
    }
    if (S.awaiting === 'reclaim') {
      return '<div class="sd-hint pulse">你的卡被夺走了!点击一张<b>无主卡</b>重新认领</div>';
    }
    if (S.activeIdx >= 0 && !MANAGERS[S.activeIdx].human) {
      return `<div class="sd-hint dim">${esc(MANAGERS[S.activeIdx].name)} 正在思考...</div>`;
    }
    return '';
  }

  function renderLogFeed() {
    return `
      <div class="sd-log">
        ${S.log.slice(0, 12).map(item => `<div class="sd-log-line ${item.kind}">${item.text}</div>`).join('')}
      </div>`;
  }

  function renderStageRail() {
    return `
      <div class="sd-stage-rail">
        ${SLOTS.map((slot, i) => `
          <span class="sd-slot-step ${i < S.posIndex ? 'done' : i === S.posIndex ? 'now' : ''}">${slot.short}</span>
        `).join('<i>›</i>')}
        <em>|</em>
        ${STAGE_INFO.map(info => `
          <span class="sd-info-step ${S.stage > info.no ? 'done' : S.stage === info.no ? 'now' : ''}">${info.label}</span>
        `).join('<i>›</i>')}
      </div>`;
  }

  function renderDraft() {
    return `
      <div class="sd-draft-layout">
        <section class="sd-main">
          ${renderStageRail()}
          ${renderManagerStrip()}
          <div class="sd-card-grid ${S.revealing ? 'revealing' : ''}">
            ${S.cards.map(renderCard).join('')}
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
    const maxCoins = humanSide === 'defend' ? S.coins[0] : S.coins[0];
    let body = '';
    if (ctx.phase === 'reveal') {
      const cWin = ctx.cBid > ctx.dBid;
      body = `
        <div class="sd-bid-reveal">
          <div class="sd-bid-side ${cWin ? 'win' : ''}" style="--mc:${challenger.color}">
            <span>${esc(challenger.name)}</span><strong>💰 ${ctx.cBid}</strong>
          </div>
          <div class="sd-bid-vs">VS</div>
          <div class="sd-bid-side ${cWin ? '' : 'win'}" style="--mc:${defender.color}">
            <span>${esc(defender.name)}</span><strong>💰 ${ctx.dBid}</strong>
          </div>
        </div>
        <p class="sd-bid-result">${cWin ? `${esc(challenger.name)} 夺走球员!` : `${esc(defender.name)} 保住球员!`}</p>`;
    } else if (humanSide) {
      const isDefend = humanSide === 'defend';
      const minBid = isDefend ? 0 : 1;
      body = `
        <p class="sd-bid-tip">${isDefend
          ? `${esc(challenger.name)} 想抢走你锁定的 ${cardLabel(card)}!暗中出价防守(出价高才保得住,赢了要支付金币,输了不花钱)`
          : `对 ${esc(defender.name)} 锁定的 ${cardLabel(card)} 出价(超过对方暗价才能抢到,赢了支付,输了不花钱)`}</p>
        <div class="sd-bid-stepper">
          <button type="button" data-sd="bid-minus">−</button>
          <span id="sdBidValue" data-min="${minBid}" data-max="${maxCoins}">${minBid}</span>
          <button type="button" data-sd="bid-plus">+</button>
          <em>/ 剩余 ${maxCoins} 金币</em>
        </div>
        <div class="sd-action-row">
          <button class="manager-btn primary" data-sd="bid-confirm">确认暗价</button>
        </div>`;
    } else {
      body = '<p class="sd-bid-tip">双方正在暗中出价...</p>';
    }
    return `
      <div class="sd-modal-bg">
        <div class="sd-modal">
          <h3>⚔️ 金币比价 · ${cardLabel(card)}</h3>
          ${body}
        </div>
      </div>`;
  }

  /* ---------- 年代转盘 ---------- */
  function renderEra() {
    const rosterRecap = MANAGERS.map(mgr => `
      <div class="sd-recap-team" style="--mc:${mgr.color}">
        <div class="sd-recap-head">${esc(mgr.name)} · ${esc(mgr.teamName)} <em>剩 💰${S.coins[mgr.idx]}</em></div>
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
        ${!S.era && !S.eraRolling ? '<button class="manager-btn massive primary" data-sd="roll-era">🎰 启动命运转盘</button>' : ''}
        ${S.era ? `<div class="sd-era-go">正在空降 ${S.era.year} 联盟,五队同步开打 82 场...</div>` : ''}
        <div class="sd-recap-grid">${rosterRecap}</div>
      </div>`;
  }

  /* ---------- 模拟直播 ---------- */
  function renderSim() {
    const sorted = [...S.simRows].sort((a, b) => b.w - a.w);
    const maxW = Math.max(1, ...S.simRows.map(r => r.w));
    return `
      <div class="sd-sim-layout">
        <div class="sd-sim-head">
          <h2>${S.era.year} ${esc(S.era.label)} · 五队争霸直播</h2>
          <span class="sd-sim-round">ROUND ${S.simRound} / 82</span>
          <span class="live-pill">LIVE</span>
        </div>
        <div class="sd-race">
          ${sorted.map((row, rank) => {
            const mgr = MANAGERS[row.idx];
            const pct = (row.w / Math.max(1, row.w + row.l)) * 100;
            return `
              <div class="sd-race-row ${mgr.human ? 'human' : ''}" style="--mc:${mgr.color}">
                <span class="sd-race-rank">#${rank + 1}</span>
                <span class="sd-race-team">${esc(mgr.teamName)}<small>${esc(mgr.name)}</small></span>
                <div class="sd-race-bar"><i style="width:${(row.w / Math.max(maxW, 1) * 100).toFixed(1)}%"></i></div>
                <span class="sd-race-rec">${row.w}胜${row.l}负</span>
                <span class="sd-race-last ${row.last ? (row.last.win ? 'w' : 'l') : ''} ${row.last && row.last.derby ? 'derby' : ''}">${row.last ? `${row.last.derby ? '⚔️' : ''}${row.last.win ? 'W' : 'L'} ${row.last.my}-${row.last.opp} ${row.last.home ? 'vs' : '@'} ${esc(row.last.oppName)}` : '--'}</span>
                <span class="sd-race-streak">${row.streak > 1 ? `${row.streak}连胜🔥` : row.streak < -1 ? `${-row.streak}连败💧` : ''}</span>
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
          <div class="sd-champ-trophy">🏆</div>
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
              <span class="sd-podium-rank">${entry.rank === 1 ? '👑' : `#${entry.rank}`}</span>
              <span class="sd-podium-team">${esc(entry.mgr.teamName)}<small>${esc(entry.mgr.name)}</small></span>
              <span class="sd-podium-rec">${entry.record.w}-${entry.record.l}</span>
              <span class="sd-podium-derby">德比 ${entry.derbyW}-${entry.derbyL}</span>
              <span class="sd-podium-diff">净胜 ${((num(entry.record.pf, 0) - num(entry.record.pa, 0)) / Math.max(1, num(entry.record.gp, 82))).toFixed(1)}</span>
              <span class="sd-podium-rank2">联盟第${entry.leagueRank}</span>
              <span class="sd-podium-coin">💰剩${entry.coinsLeft}</span>
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
        if (S.coins[0] < 1) { pushLog('金币不足,无法发起比价', 'me'); render(); return; }
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
      pos: S.phase === 'draft' ? slotNow().short : null,
      stage: S.stage,
      awaiting: S.awaiting,
      activeManager: S.activeIdx >= 0 ? MANAGERS[S.activeIdx].name : null,
      coins: S.coins,
      cards: S.cards.map(c => ({
        no: c.idx + 1,
        owner: c.owner >= 0 ? MANAGERS[c.owner].name : null,
        locked: c.locked,
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
      result: S.result ? S.result.entries.map(e => ({ rank: e.rank, team: e.mgr.teamName, w: e.record.w, l: e.record.l })) : null,
      log: S.log.slice(0, 6).map(l => l.text)
    }, null, 1);
  };

  entryBtn.addEventListener('click', startShowdown);
})();
