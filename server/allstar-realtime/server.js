#!/usr/bin/env node
'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

const HOST = process.env.HOST || '127.0.0.1';
const PORT = Number(process.env.PORT || 3001);
const SERVICE = 'allstar-showdown-realtime';
const VERSION = '0.2.0';
const START_COINS = 15;

const SLOTS = [
  { id: 1, short: 'PG', name: '控球后卫' },
  { id: 2, short: 'SG', name: '得分后卫' },
  { id: 3, short: 'SF', name: '小前锋' },
  { id: 4, short: 'PF', name: '大前锋' },
  { id: 5, short: 'C', name: '中锋' }
];

const MANAGER_COLORS = ['#22d3ee', '#f59e0b', '#a78bfa', '#ef4444', '#34d399'];
const AI_PROFILES = [
  { name: '数据帝·老K', teamName: '算法王朝', abbr: 'DAT', color: '#f59e0b', style: 'stats', aggr: 1.0, lockMargin: 3.0, noise: 0.08 },
  { name: '戒指控·霍普金', teamName: '荣耀军团', abbr: 'RNG', color: '#a78bfa', style: 'honors', aggr: 1.1, lockMargin: 2.6, noise: 0.10 },
  { name: '梭哈王·赌圣', teamName: '全押帝国', abbr: 'ALN', color: '#ef4444', style: 'gambler', aggr: 1.7, lockMargin: 5.0, noise: 0.18 },
  { name: '铁算盘·葛朗台', teamName: '抠门兄弟', abbr: 'MSR', color: '#34d399', style: 'miser', aggr: 0.55, lockMargin: 1.6, noise: 0.06 },
  { name: '冠军计算器', teamName: '冠军工坊', abbr: 'CPU', color: '#60a5fa', style: 'balanced', aggr: 0.95, lockMargin: 2.8, noise: 0.10 }
];

const clients = new Map();
const rooms = new Map();
let poolCache = null;

function num(v, d = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
}

function json(res, code, body) {
  const data = code === 204 ? '' : JSON.stringify(body);
  res.writeHead(code, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,OPTIONS'
  });
  res.end(data);
}

function loadPool() {
  if (poolCache) return poolCache;
  const candidates = [
    process.env.ALLSTAR_POOL_PATH,
    path.join(__dirname, 'data', 'allstar_pool.json'),
    path.join(process.cwd(), 'data', 'allstar_pool.json'),
    path.resolve(__dirname, '..', '..', 'assets', 'data', 'allstar_pool.json')
  ].filter(Boolean);
  const file = candidates.find(p => fs.existsSync(p));
  if (!file) throw new Error(`allstar_pool.json not found; checked ${candidates.join(', ')}`);
  const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  poolCache = raw.players || raw;
  if (!Array.isArray(poolCache) || !poolCache.length) throw new Error('allstar_pool.json has no players');
  return poolCache;
}

function publicRoom(room) {
  return {
    code: room.code,
    status: room.status,
    hostId: room.hostId,
    createdAt: room.createdAt,
    updatedAt: room.updatedAt,
    seats: room.seats.map(seat => ({
      seatId: seat.seatId,
      kind: seat.kind,
      playerId: seat.playerId || null,
      name: seat.name,
      connected: seat.kind === 'ai' ? true : clients.has(seat.playerId)
    }))
  };
}

function publicGame(room, client) {
  const game = room.game;
  if (!game) return null;
  const viewerIdx = room.managers.findIndex(m => m.kind === 'human' && m.playerId === client.playerId);
  const slot = SLOTS[game.posIndex] || null;
  const bid = game.bidCtx ? {
    cardIdx: game.bidCtx.cardIdx,
    challengerIdx: game.bidCtx.challengerIdx,
    defenderIdx: game.bidCtx.defenderIdx,
    price: game.bidCtx.price,
    cBid: game.bidCtx.phase === 'reveal' ? game.bidCtx.cBid : null,
    dBid: game.bidCtx.phase === 'reveal' ? game.bidCtx.dBid : null,
    phase: game.bidCtx.phase
  } : null;
  return {
    phase: game.phase,
    posIndex: game.posIndex,
    pos: slot ? slot.short : null,
    posName: slot ? slot.name : null,
    stage: game.stage,
    awaiting: game.awaiting,
    activeIdx: game.activeIdx,
    activeName: game.activeIdx >= 0 ? room.managers[game.activeIdx]?.name : null,
    pendingCardIdx: game.pendingCardIdx,
    bid,
    you: {
      playerId: client.playerId,
      managerIdx: viewerIdx,
      isHost: room.hostId === client.playerId,
      canAct: viewerIdx >= 0 && viewerIdx === game.activeIdx && !!game.awaiting
    },
    managers: room.managers.map((mgr, idx) => ({
      idx,
      seatId: mgr.seatId,
      kind: mgr.kind,
      name: mgr.name,
      teamName: mgr.teamName,
      color: mgr.color,
      coins: game.coins[idx],
      spent: game.spent[idx],
      connected: mgr.kind === 'ai' ? true : clients.has(mgr.playerId),
      holdingCardIdx: managerCard(game, idx)?.idx ?? null
    })),
    cards: game.cards.map(card => cardView(game, room, card)),
    rosters: game.rosters.map((roster, idx) => ({
      managerIdx: idx,
      manager: room.managers[idx]?.name || '',
      teamName: room.managers[idx]?.teamName || '',
      color: room.managers[idx]?.color || '#9ca3af',
      players: roster.map((card, slotIdx) => card ? {
        slot: SLOTS[slotIdx].short,
        name: card.entry.nameCn,
        peak: `${card.entry.peakYear} ${card.entry.peakTeamCn}`,
        acquiredBy: card.acquiredBy,
        price: card.price || 0
      } : null)
    })),
    result: game.result,
    duels: game.duels,
    log: game.log.slice(0, 24)
  };
}

function cardView(game, room, card) {
  const owner = card.owner >= 0 ? room.managers[card.owner] : null;
  return {
    idx: card.idx,
    no: card.idx + 1,
    ownerIdx: card.owner,
    ownerName: owner ? owner.name : null,
    ownerColor: owner ? owner.color : null,
    locked: !!card.locked,
    price: card.price || 0,
    acquiredBy: card.acquiredBy || '',
    revealed: !!card.revealed,
    name: card.revealed ? card.entry.nameCn : null,
    peak: game.stage >= 3 || card.revealed ? `${card.entry.peakYear} ${card.entry.peakTeamCn}` : null,
    stats: card.entry.stats || {},
    honors: game.stage >= 2 || card.revealed ? card.entry.honorSummary : null,
    positions: [card.entry.row?.positionFirst, card.entry.row?.positionSecond].map(v => num(v, 0)).filter(Boolean)
  };
}

function sendFrame(socket, opcode, payload) {
  const data = Buffer.isBuffer(payload) ? payload : Buffer.from(payload || '');
  let header;
  if (data.length < 126) {
    header = Buffer.from([0x80 | opcode, data.length]);
  } else if (data.length <= 0xffff) {
    header = Buffer.alloc(4);
    header[0] = 0x80 | opcode;
    header[1] = 126;
    header.writeUInt16BE(data.length, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x80 | opcode;
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(data.length), 2);
  }
  socket.write(Buffer.concat([header, data]));
}

function sendJson(client, message) {
  if (!client.socket.destroyed) sendFrame(client.socket, 0x1, JSON.stringify(message));
}

function sendError(client, code, message) {
  sendJson(client, { type: 'error', code, message });
}

function broadcastRoom(room, extra = {}) {
  const message = { type: 'room_state', room: publicRoom(room), ...extra };
  for (const seat of room.seats) {
    if (seat.kind !== 'human' || !seat.playerId) continue;
    const client = clients.get(seat.playerId);
    if (client) sendJson(client, message);
  }
}

function broadcastGame(room, extra = {}) {
  for (const seat of room.seats) {
    if (seat.kind !== 'human' || !seat.playerId) continue;
    const client = clients.get(seat.playerId);
    if (client) sendJson(client, { type: 'game_state', room: publicRoom(room), game: publicGame(room, client), ...extra });
  }
}

function roomCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  for (let tries = 0; tries < 100; tries += 1) {
    let code = '';
    for (let i = 0; i < 6; i += 1) code += alphabet[crypto.randomInt(alphabet.length)];
    if (!rooms.has(code)) return code;
  }
  throw new Error('failed_to_allocate_room_code');
}

function newId(prefix) {
  return `${prefix}_${crypto.randomBytes(8).toString('hex')}`;
}

function cleanName(value) {
  const name = String(value || '').trim().replace(/\s+/g, ' ');
  return name.slice(0, 18) || '玩家';
}

function findSeat(room, playerId) {
  return room.seats.find(seat => seat.playerId === playerId) || null;
}

function requireRoom(client, code) {
  const room = rooms.get(String(code || '').trim().toUpperCase());
  if (!room) {
    sendError(client, 'room_not_found', '房间不存在');
    return null;
  }
  return room;
}

function requireHost(client, room) {
  if (room.hostId !== client.playerId) {
    sendError(client, 'host_only', '只有房主可以执行该操作');
    return false;
  }
  return true;
}

function clientManagerIdx(room, client) {
  return room.managers ? room.managers.findIndex(m => m.kind === 'human' && m.playerId === client.playerId) : -1;
}

function assertTurn(room, client, awaiting) {
  const game = room.game;
  const idx = clientManagerIdx(room, client);
  if (!game || room.status !== 'draft') return { ok: false, idx, error: ['not_in_game', '游戏未开始'] };
  if (game.phase !== 'draft') return { ok: false, idx, error: ['draft_done', '选牌已经结束'] };
  if (idx < 0) return { ok: false, idx, error: ['not_seated', '你不在本局座位中'] };
  if (game.activeIdx !== idx || game.awaiting !== awaiting) return { ok: false, idx, error: ['not_your_turn', '当前不是你的回合'] };
  return { ok: true, idx };
}

function shuffleList(list) {
  const arr = [...list];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = crypto.randomInt(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function entryFits(entry, slotId) {
  const row = entry.row || {};
  return num(row.positionFirst, 0) === slotId || num(row.positionSecond, 0) === slotId;
}

function statsScore(entry) {
  const st = entry.stats || {};
  return num(st.ppg) * 1.25 + num(st.rpg) * 0.8 + num(st.apg) * 0.9 + num(st.spg) * 2.5 + num(st.bpg) * 2.4 + num(st.fgPct) * 0.12 + num(st.tpPct) * 0.08;
}

function honorsScore(entry) {
  const h = entry.honors || {};
  return num(h.rings) * 8 + num(h.mvp) * 12 + num(h.fmvp) * 10 + num(h.allStar) * 1.7 + num(h.allNba1) * 5 + num(h.allNba2) * 3.2 + num(h.allNba3) * 2.4 + num(h.allDefensive) * 2.2 + num(h.scoring) * 3 + num(h.rebound) * 2 + num(h.assist) * 2 + num(h.block) * 2 + num(h.steal) * 2;
}

function hiddenScore(card) {
  return num(card.entry.row?.Ranks, 75);
}

function aiCardValue(game, mgr, card) {
  let v = statsScore(card.entry);
  if (game.stage >= 2) v += honorsScore(card.entry);
  if (game.stage >= 3) v += (hiddenScore(card) - 75) * 0.8;
  if (mgr.style === 'stats') v += statsScore(card.entry) * 0.25;
  if (mgr.style === 'honors') v += honorsScore(card.entry) * 0.35;
  if (mgr.style === 'miser') v += num(card.price, 0) ? -num(card.price, 0) * 2 : 0;
  return v * (1 + (card.aiNoise[mgr.idx] || 0));
}

function aiShouldLock(game, mgr, card) {
  const myVal = aiCardValue(game, mgr, card);
  const rivals = game.cards.filter(c => c !== card).map(c => aiCardValue(game, mgr, c));
  const bestRival = rivals.length ? Math.max(...rivals) : 0;
  if (game.stage >= 3) return true;
  return myVal - bestRival > num(mgr.lockMargin, 2.5);
}

function currentOrder(game) {
  const order = [...game.baseOrder];
  return game.posIndex % 2 === 0 ? order : order.reverse();
}

function managerCard(game, idx) {
  return game.cards.find(c => c.owner === idx) || null;
}

function freeCards(game) {
  return game.cards.filter(c => c.owner < 0);
}

function cardLabel(card) {
  return card.revealed ? card.entry.nameCn : `${card.idx + 1}号卡`;
}

function pushLog(game, text, kind = 'info') {
  game.log.unshift({ at: Date.now(), kind, text });
  if (game.log.length > 80) game.log.pop();
}

function dealCards(room) {
  const game = room.game;
  const slot = SLOTS[game.posIndex];
  const pool = loadPool();
  const eligible = pool.filter(entry => entryFits(entry, slot.id) && !game.draftedIds.includes(entry.id));
  const picked = shuffleList(eligible).slice(0, room.managers.length);
  if (picked.length < room.managers.length) throw new Error(`${slot.short} 可用卡池不足`);
  game.cards = picked.map((entry, i) => ({
    key: `${slot.short}_${i}_${entry.id}`,
    idx: i,
    entry,
    owner: -1,
    locked: false,
    revealed: false,
    price: 0,
    acquiredBy: '',
    aiNoise: room.managers.map(m => m.kind === 'human' ? 0 : (Math.random() * 2 - 1) * num(m.noise, 0.1))
  }));
  pushLog(game, `${slot.short} 开抽: 发出 ${picked.length} 张全明星卡`, 'stage');
}

function makeManagers(room) {
  let aiCount = 0;
  return room.seats.map((seat, idx) => {
    if (seat.kind === 'ai') {
      const profile = AI_PROFILES[aiCount % AI_PROFILES.length];
      aiCount += 1;
      return { ...profile, idx, seatId: seat.seatId, kind: 'ai', name: seat.name || profile.name };
    }
    return {
      idx,
      seatId: seat.seatId,
      kind: 'human',
      playerId: seat.playerId,
      name: seat.name,
      teamName: `${seat.name}梦之队`,
      abbr: `P${idx + 1}`,
      color: MANAGER_COLORS[idx % MANAGER_COLORS.length],
      style: 'human',
      aggr: 1,
      lockMargin: 3,
      noise: 0
    };
  });
}

function startDraft(room) {
  room.managers = makeManagers(room);
  room.status = 'draft';
  room.game = {
    phase: 'draft',
    posIndex: 0,
    stage: 1,
    baseOrder: shuffleList(room.managers.map(m => m.idx)),
    turnIndex: 0,
    cards: [],
    activeIdx: -1,
    awaiting: null,
    pendingCardIdx: -1,
    pending: null,
    bidCtx: null,
    coins: room.managers.map(() => START_COINS),
    spent: room.managers.map(() => 0),
    rosters: room.managers.map(() => SLOTS.map(() => null)),
    draftedIds: [],
    duels: [],
    log: [],
    result: null
  };
  pushLog(room.game, `选秀顺位: ${room.game.baseOrder.map(i => room.managers[i].name).join(' -> ')}`, 'stage');
  continueDraft(room);
}

function requestHuman(room, idx, awaiting, extra = {}) {
  const game = room.game;
  game.activeIdx = idx;
  game.awaiting = awaiting;
  if (Object.prototype.hasOwnProperty.call(extra, 'pendingCardIdx')) game.pendingCardIdx = extra.pendingCardIdx;
}

function clearWait(game) {
  game.awaiting = null;
  game.activeIdx = -1;
  game.pendingCardIdx = -1;
}

function continueDraft(room) {
  const game = room.game;
  for (let guard = 0; guard < 500; guard += 1) {
    if (game.awaiting) {
      broadcastGame(room);
      return;
    }
    if (game.posIndex >= SLOTS.length) {
      finishDraft(room);
      broadcastGame(room);
      return;
    }
    if (!game.cards.length) {
      game.stage = 1;
      game.turnIndex = 0;
      dealCards(room);
    }
    const order = currentOrder(game);
    if (game.stage === 1) {
      if (game.turnIndex >= order.length) {
        game.stage = 2;
        game.turnIndex = 0;
        pushLog(game, `${SLOTS[game.posIndex].short} 进入荣誉轮`, 'stage');
        continue;
      }
      const idx = order[game.turnIndex];
      const mgr = room.managers[idx];
      if (mgr.kind === 'human') {
        requestHuman(room, idx, 'claim');
        broadcastGame(room);
        return;
      }
      aiClaim(room, idx);
      game.turnIndex += 1;
      continue;
    }
    if (game.stage <= 3) {
      if (game.turnIndex >= order.length) {
        if (game.stage < 3) {
          game.stage += 1;
          game.turnIndex = 0;
          pushLog(game, `${SLOTS[game.posIndex].short} 进入${game.stage === 2 ? '荣誉轮' : '球队轮'}`, 'stage');
          continue;
        }
        finishPosition(room);
        continue;
      }
      const idx = order[game.turnIndex];
      const mgr = room.managers[idx];
      const card = managerCard(game, idx);
      if (card && card.locked) {
        game.turnIndex += 1;
        continue;
      }
      if (mgr.kind === 'human') {
        requestHuman(room, idx, 'action');
        broadcastGame(room);
        return;
      }
      const completed = aiAction(room, idx);
      if (completed) game.turnIndex += 1;
      if (game.awaiting) {
        broadcastGame(room);
        return;
      }
      continue;
    }
  }
  throw new Error('draft_state_loop_guard');
}

function aiClaim(room, idx) {
  const game = room.game;
  const mgr = room.managers[idx];
  const free = freeCards(game);
  const best = free.reduce((a, b) => aiCardValue(game, mgr, b) > aiCardValue(game, mgr, a) ? b : a, free[0]);
  best.owner = idx;
  best.acquiredBy = 'claim';
  best.locked = aiShouldLock(game, mgr, best);
  pushLog(game, `${mgr.name} 认领 ${cardLabel(best)}${best.locked ? ' 并锁定' : ''}`, 'ai');
}

function aiAction(room, idx) {
  const game = room.game;
  const mgr = room.managers[idx];
  const mine = managerCard(game, idx);
  const myVal = mine ? aiCardValue(game, mgr, mine) : -999;
  let best = null;
  let bestVal = myVal;
  for (const card of game.cards) {
    if (card.owner === idx) continue;
    const v = aiCardValue(game, mgr, card);
    if (v > bestVal) {
      best = card;
      bestVal = v;
    }
  }
  if (!best) {
    if (mine && aiShouldLock(game, mgr, mine)) {
      mine.locked = true;
      pushLog(game, `${mgr.name} 锁定 ${cardLabel(mine)}`, 'ai');
    } else {
      pushLog(game, `${mgr.name} 保持观望`, 'ai');
    }
    return true;
  }
  const gain = bestVal - myVal;
  if (!best.locked) {
    const threshold = mgr.style === 'gambler' ? 0.5 : 1.2;
    if (gain > threshold) {
      const victim = best.owner;
      if (mine) mine.owner = -1;
      best.owner = idx;
      best.acquiredBy = victim >= 0 ? 'steal' : 'claim';
      best.locked = aiShouldLock(game, mgr, best);
      pushLog(game, `${mgr.name} ${victim >= 0 ? `截胡 ${room.managers[victim].name} 的` : '换取'} ${cardLabel(best)}${best.locked ? ' 并锁定' : ''}`, 'ai');
      if (victim >= 0) return reclaimOrWait(room, victim, { kind: 'afterAiAction' });
      return true;
    }
  } else {
    const price = num(best.price, 0);
    const challengeMargin = mgr.style === 'gambler' ? 1.5 : mgr.style === 'miser' ? 6 : 3;
    const worthIt = Math.round(gain * 0.3 * num(mgr.aggr, 1)) >= price + 1;
    if (gain > challengeMargin && worthIt && game.coins[idx] >= price + 1) {
      return startDuel(room, idx, best.idx);
    }
  }
  if (mine && aiShouldLock(game, mgr, mine)) {
    mine.locked = true;
    pushLog(game, `${mgr.name} 锁定 ${cardLabel(mine)}`, 'ai');
  } else {
    pushLog(game, `${mgr.name} 保持现状`, 'ai');
  }
  return true;
}

function reclaimOrWait(room, victimIdx, pending) {
  const game = room.game;
  const free = freeCards(game);
  if (!free.length) return true;
  const victim = room.managers[victimIdx];
  if (victim.kind === 'human') {
    game.pending = pending;
    requestHuman(room, victimIdx, 'reclaim');
    return false;
  }
  const best = free.reduce((a, b) => aiCardValue(game, victim, b) > aiCardValue(game, victim, a) ? b : a, free[0]);
  best.owner = victimIdx;
  best.acquiredBy = 'reclaim';
  pushLog(game, `${victim.name} 重新认领 ${cardLabel(best)}`, 'ai');
  return true;
}

function aiBidAmount(room, mgr, card, isDefender) {
  const game = room.game;
  const price = num(card.price, 0);
  const val = aiCardValue(game, mgr, card);
  const mine = managerCard(game, mgr.idx);
  const backup = isDefender
    ? (freeCards(game).length ? Math.max(...freeCards(game).map(c => aiCardValue(game, mgr, c)), 0) : 0)
    : (mine ? aiCardValue(game, mgr, mine) : 0);
  const gain = Math.max(0, val - backup);
  const remainingSlots = SLOTS.length - game.posIndex;
  const reserve = mgr.style === 'gambler' ? 0 : mgr.style === 'miser' ? Math.min(4, remainingSlots) : Math.max(0, remainingSlots - 2);
  const avail = Math.max(0, game.coins[mgr.idx] - reserve);
  const worth = Math.round(gain * 0.3 * num(mgr.aggr, 1) + (mgr.style === 'gambler' ? 1 : 0));
  if (isDefender) return Math.max(price, Math.min(price + avail, Math.max(price, Math.round(worth * 1.05))));
  return Math.max(price + 1, Math.min(Math.max(0, game.coins[mgr.idx] - Math.max(0, reserve - 1)), worth));
}

function startDuel(room, challengerIdx, cardIdx) {
  const game = room.game;
  const card = game.cards[cardIdx];
  if (!card || !card.locked || card.owner < 0 || card.owner === challengerIdx) return true;
  const price = num(card.price, 0);
  if (game.coins[challengerIdx] < price + 1) return true;
  const defenderIdx = card.owner;
  game.bidCtx = { cardIdx, challengerIdx, defenderIdx, price, cBid: null, dBid: null, phase: 'attack' };
  pushLog(game, `${room.managers[challengerIdx].name} 挑战 ${room.managers[defenderIdx].name} 的 ${cardLabel(card)}，当前身价 ${price}`, 'duel');
  if (room.managers[challengerIdx].kind === 'human') {
    requestHuman(room, challengerIdx, 'bid_attack');
    return false;
  }
  game.bidCtx.cBid = clampBid(aiBidAmount(room, room.managers[challengerIdx], card, false), price + 1, game.coins[challengerIdx]);
  return continueDuelDefender(room);
}

function continueDuelDefender(room) {
  const game = room.game;
  const ctx = game.bidCtx;
  const defender = room.managers[ctx.defenderIdx];
  ctx.phase = 'defend';
  if (defender.kind === 'human') {
    requestHuman(room, ctx.defenderIdx, 'bid_defend');
    return false;
  }
  ctx.dBid = clampBid(aiBidAmount(room, defender, game.cards[ctx.cardIdx], true), ctx.price, ctx.price + game.coins[ctx.defenderIdx]);
  return resolveDuel(room);
}

function clampBid(value, min, max) {
  return Math.max(min, Math.min(max, num(value, min)));
}

function resolveDuel(room) {
  const game = room.game;
  const ctx = game.bidCtx;
  const card = game.cards[ctx.cardIdx];
  const challenger = room.managers[ctx.challengerIdx];
  const defender = room.managers[ctx.defenderIdx];
  ctx.phase = 'reveal';
  const challengerWins = ctx.cBid > ctx.dBid;
  game.duels.push({
    pos: SLOTS[game.posIndex].short,
    card: cardLabel(card),
    challenger: challenger.name,
    defender: defender.name,
    cBid: ctx.cBid,
    dBid: ctx.dBid,
    priceBefore: ctx.price,
    winner: challengerWins ? challenger.name : defender.name
  });
  if (challengerWins) {
    game.coins[ctx.challengerIdx] -= ctx.cBid;
    game.coins[ctx.defenderIdx] += ctx.price;
    const mine = managerCard(game, ctx.challengerIdx);
    if (mine) mine.owner = -1;
    card.owner = ctx.challengerIdx;
    card.locked = true;
    card.acquiredBy = 'duel';
    card.price = ctx.cBid;
    pushLog(game, `${challenger.name} 出 ${ctx.cBid} > ${defender.name} 的 ${ctx.dBid}，夺得 ${cardLabel(card)}`, 'duel');
    game.bidCtx = null;
    return reclaimOrWait(room, ctx.defenderIdx, { kind: 'afterDuel' });
  }
  const topUp = ctx.dBid - ctx.price;
  if (topUp > 0) {
    game.coins[ctx.defenderIdx] -= topUp;
    card.price = ctx.dBid;
  }
  pushLog(game, `${defender.name} 以总承诺 ${ctx.dBid} 守住 ${cardLabel(card)}，${challenger.name} 不消耗金币`, 'duel');
  game.bidCtx = null;
  return true;
}

function finishPosition(room) {
  const game = room.game;
  const slotIndex = game.posIndex;
  for (const card of game.cards) {
    card.locked = true;
    card.revealed = true;
    if (card.owner >= 0) {
      game.rosters[card.owner][slotIndex] = card;
      game.draftedIds.push(card.entry.id);
      game.spent[card.owner] += num(card.price, 0);
      pushLog(game, `${room.managers[card.owner].name} 的 ${SLOTS[slotIndex].short}: ${card.entry.nameCn}`, 'reveal');
    }
  }
  game.posIndex += 1;
  game.stage = 1;
  game.turnIndex = 0;
  game.cards = [];
}

function finishDraft(room) {
  const game = room.game;
  game.phase = 'results';
  room.status = 'results';
  game.activeIdx = -1;
  game.awaiting = null;
  const entries = room.managers.map((mgr, idx) => {
    const roster = game.rosters[idx];
    const rating = roster.reduce((sum, card) => sum + hiddenScore(card), 0);
    return {
      rank: 0,
      managerIdx: idx,
      manager: mgr.name,
      teamName: mgr.teamName,
      color: mgr.color,
      coinsLeft: game.coins[idx],
      coinsSpent: game.spent[idx],
      rating,
      players: roster.map((card, slotIdx) => ({
        slot: SLOTS[slotIdx].short,
        name: card.entry.nameCn,
        peak: `${card.entry.peakYear} ${card.entry.peakTeamCn}`,
        price: card.price || 0,
        acquiredBy: card.acquiredBy
      }))
    };
  }).sort((a, b) => b.rating - a.rating || b.coinsLeft - a.coinsLeft);
  entries.forEach((entry, i) => { entry.rank = i + 1; });
  game.result = { entries, duels: game.duels };
  pushLog(game, '全明星选牌完成，阵容结算已生成', 'stage');
}

function handleCreateRoom(client, msg) {
  const code = roomCode();
  const now = new Date().toISOString();
  const room = {
    code,
    status: 'lobby',
    hostId: client.playerId,
    createdAt: now,
    updatedAt: now,
    seats: [{
      seatId: 0,
      kind: 'human',
      playerId: client.playerId,
      name: cleanName(msg.name)
    }],
    managers: [],
    game: null
  };
  rooms.set(code, room);
  client.roomCode = code;
  sendJson(client, { type: 'room_created', room: publicRoom(room), playerToken: client.playerToken });
  broadcastRoom(room);
}

function handleJoinRoom(client, msg) {
  const room = requireRoom(client, msg.roomCode);
  if (!room) return;
  if (room.status !== 'lobby') return sendError(client, 'room_locked', '游戏已经开始');
  const existing = findSeat(room, client.playerId);
  if (existing) {
    client.roomCode = room.code;
    existing.name = cleanName(msg.name || existing.name);
    room.updatedAt = new Date().toISOString();
    return broadcastRoom(room);
  }
  if (room.seats.length >= 5 || room.seats.filter(seat => seat.kind === 'human').length >= 5) {
    return sendError(client, 'room_full', '房间已满');
  }
  const usedSeats = new Set(room.seats.map(seat => seat.seatId));
  let seatId = 0;
  while (usedSeats.has(seatId)) seatId += 1;
  room.seats.push({ seatId, kind: 'human', playerId: client.playerId, name: cleanName(msg.name) });
  room.seats.sort((a, b) => a.seatId - b.seatId);
  room.updatedAt = new Date().toISOString();
  client.roomCode = room.code;
  sendJson(client, { type: 'room_joined', room: publicRoom(room), playerToken: client.playerToken });
  broadcastRoom(room);
}

function handleAddAi(client, msg) {
  const room = requireRoom(client, msg.roomCode || client.roomCode);
  if (!room || !requireHost(client, room)) return;
  if (room.status !== 'lobby') return sendError(client, 'room_locked', '游戏已经开始');
  if (room.seats.length >= 5) return sendError(client, 'room_full', '房间席位已满');
  const usedSeats = new Set(room.seats.map(seat => seat.seatId));
  let seatId = 0;
  while (usedSeats.has(seatId)) seatId += 1;
  const profile = AI_PROFILES[room.seats.filter(seat => seat.kind === 'ai').length % AI_PROFILES.length];
  room.seats.push({ seatId, kind: 'ai', name: profile.name });
  room.seats.sort((a, b) => a.seatId - b.seatId);
  room.updatedAt = new Date().toISOString();
  broadcastRoom(room);
}

function handleRemoveAi(client, msg) {
  const room = requireRoom(client, msg.roomCode || client.roomCode);
  if (!room || !requireHost(client, room)) return;
  if (room.status !== 'lobby') return sendError(client, 'room_locked', '游戏已经开始');
  const idx = room.seats.map(seat => seat.kind).lastIndexOf('ai');
  if (idx < 0) return sendError(client, 'no_ai', '没有可移除的 AI');
  room.seats.splice(idx, 1);
  room.updatedAt = new Date().toISOString();
  broadcastRoom(room);
}

function handleStartGame(client, msg) {
  const room = requireRoom(client, msg.roomCode || client.roomCode);
  if (!room || !requireHost(client, room)) return;
  const humanCount = room.seats.filter(seat => seat.kind === 'human').length;
  const totalSeats = room.seats.length;
  if (humanCount < 2) return sendError(client, 'not_enough_players', '至少需要 2 名真人玩家');
  if (totalSeats < 2) return sendError(client, 'not_enough_seats', '至少需要 2 个经理席位');
  if (totalSeats > 5) return sendError(client, 'too_many_seats', '最多 5 个经理席位');
  try {
    loadPool();
    startDraft(room);
    room.updatedAt = new Date().toISOString();
    broadcastRoom(room);
    broadcastGame(room);
  } catch (err) {
    sendError(client, 'start_failed', err.message || String(err));
  }
}

function handleClaimCard(client, msg) {
  const room = requireRoom(client, msg.roomCode || client.roomCode);
  if (!room) return;
  const turn = assertTurn(room, client, 'claim');
  if (!turn.ok) return sendError(client, ...turn.error);
  const game = room.game;
  const card = game.cards[num(msg.cardIdx, -1)];
  if (!card || card.owner >= 0) return sendError(client, 'invalid_card', '请选择无主卡');
  card.owner = turn.idx;
  card.acquiredBy = 'claim';
  pushLog(game, `${room.managers[turn.idx].name} 认领 ${cardLabel(card)}`, 'me');
  requestHuman(room, turn.idx, 'lockchoice', { pendingCardIdx: card.idx });
  broadcastGame(room);
}

function handleChooseLock(client, msg) {
  const room = requireRoom(client, msg.roomCode || client.roomCode);
  if (!room) return;
  const turn = assertTurn(room, client, 'lockchoice');
  if (!turn.ok) return sendError(client, ...turn.error);
  const game = room.game;
  const card = game.cards[game.pendingCardIdx];
  if (card && card.owner === turn.idx) {
    card.locked = !!msg.lock;
    pushLog(game, `${room.managers[turn.idx].name} ${card.locked ? '锁定' : '暂不锁定'} ${cardLabel(card)}`, 'me');
  }
  clearWait(game);
  game.turnIndex += 1;
  continueDraft(room);
}

function handleKeep(client, msg, lock) {
  const room = requireRoom(client, msg.roomCode || client.roomCode);
  if (!room) return;
  const turn = assertTurn(room, client, 'action');
  if (!turn.ok) return sendError(client, ...turn.error);
  const game = room.game;
  const mine = managerCard(game, turn.idx);
  if (lock && mine) mine.locked = true;
  pushLog(game, `${room.managers[turn.idx].name} ${lock ? '锁定当前卡' : '保持观望'}`, 'me');
  clearWait(game);
  game.turnIndex += 1;
  continueDraft(room);
}

function handleTakeCard(client, msg) {
  const room = requireRoom(client, msg.roomCode || client.roomCode);
  if (!room) return;
  const turn = assertTurn(room, client, 'action');
  if (!turn.ok) return sendError(client, ...turn.error);
  const game = room.game;
  const target = game.cards[num(msg.cardIdx, -1)];
  if (!target || target.owner === turn.idx || target.locked) return sendError(client, 'invalid_card', '这张卡不能直接换取');
  const mine = managerCard(game, turn.idx);
  const victim = target.owner;
  if (mine) mine.owner = -1;
  target.owner = turn.idx;
  target.acquiredBy = victim >= 0 ? 'steal' : 'claim';
  pushLog(game, `${room.managers[turn.idx].name} ${victim >= 0 ? `截胡 ${room.managers[victim].name} 的` : '换取'} ${cardLabel(target)}`, 'me');
  clearWait(game);
  if (victim >= 0) {
    const completed = reclaimOrWait(room, victim, { kind: 'postTakeLock', actorIdx: turn.idx, cardIdx: target.idx });
    if (!completed) return broadcastGame(room);
  }
  requestHuman(room, turn.idx, 'lockchoice', { pendingCardIdx: target.idx });
  broadcastGame(room);
}

function handleChallengeCard(client, msg) {
  const room = requireRoom(client, msg.roomCode || client.roomCode);
  if (!room) return;
  const turn = assertTurn(room, client, 'action');
  if (!turn.ok) return sendError(client, ...turn.error);
  const game = room.game;
  const card = game.cards[num(msg.cardIdx, -1)];
  if (!card || !card.locked || card.owner < 0 || card.owner === turn.idx) return sendError(client, 'invalid_card', '这张卡不能比价');
  const minBid = num(card.price, 0) + 1;
  if (game.coins[turn.idx] < minBid) return sendError(client, 'not_enough_coins', `至少需要 ${minBid} 金币`);
  clearWait(game);
  const completed = startDuel(room, turn.idx, card.idx);
  if (completed) {
    game.turnIndex += 1;
    continueDraft(room);
  } else {
    broadcastGame(room);
  }
}

function handleSubmitBid(client, msg) {
  const room = requireRoom(client, msg.roomCode || client.roomCode);
  if (!room) return;
  const game = room.game;
  if (!game || !game.bidCtx || !['bid_attack', 'bid_defend'].includes(game.awaiting)) return sendError(client, 'no_bid', '当前没有需要你出价的比价');
  const turn = assertTurn(room, client, game.awaiting);
  if (!turn.ok) return sendError(client, ...turn.error);
  const ctx = game.bidCtx;
  const bid = num(msg.bid, 0);
  if (game.awaiting === 'bid_attack') {
    ctx.cBid = clampBid(bid, ctx.price + 1, game.coins[ctx.challengerIdx]);
    clearWait(game);
    const completed = continueDuelDefender(room);
    if (completed) {
      game.turnIndex += 1;
      continueDraft(room);
    } else {
      broadcastGame(room);
    }
    return;
  }
  ctx.dBid = clampBid(bid, ctx.price, ctx.price + game.coins[ctx.defenderIdx]);
  clearWait(game);
  const completed = resolveDuel(room);
  if (completed) {
    game.turnIndex += 1;
    continueDraft(room);
  } else {
    broadcastGame(room);
  }
}

function handleReclaimCard(client, msg) {
  const room = requireRoom(client, msg.roomCode || client.roomCode);
  if (!room) return;
  const turn = assertTurn(room, client, 'reclaim');
  if (!turn.ok) return sendError(client, ...turn.error);
  const game = room.game;
  const card = game.cards[num(msg.cardIdx, -1)];
  if (!card || card.owner >= 0) return sendError(client, 'invalid_card', '请选择无主卡');
  card.owner = turn.idx;
  card.acquiredBy = 'reclaim';
  pushLog(game, `${room.managers[turn.idx].name} 重新认领 ${cardLabel(card)}`, 'me');
  const pending = game.pending;
  game.pending = null;
  clearWait(game);
  if (pending && pending.kind === 'postTakeLock') {
    requestHuman(room, pending.actorIdx, 'lockchoice', { pendingCardIdx: pending.cardIdx });
    broadcastGame(room);
    return;
  }
  game.turnIndex += 1;
  continueDraft(room);
}

function handleClientMessage(client, raw) {
  let msg;
  try {
    msg = JSON.parse(raw);
  } catch (_) {
    return sendError(client, 'bad_json', '消息不是有效 JSON');
  }
  switch (msg.type) {
    case 'ping': return sendJson(client, { type: 'pong', t: Date.now() });
    case 'create_room': return handleCreateRoom(client, msg);
    case 'join_room': return handleJoinRoom(client, msg);
    case 'add_ai': return handleAddAi(client, msg);
    case 'remove_ai': return handleRemoveAi(client, msg);
    case 'start_game': return handleStartGame(client, msg);
    case 'claim_card': return handleClaimCard(client, msg);
    case 'choose_lock': return handleChooseLock(client, msg);
    case 'keep': return handleKeep(client, msg, false);
    case 'keep_lock': return handleKeep(client, msg, true);
    case 'take_card': return handleTakeCard(client, msg);
    case 'challenge_card': return handleChallengeCard(client, msg);
    case 'submit_bid': return handleSubmitBid(client, msg);
    case 'reclaim_card': return handleReclaimCard(client, msg);
    default: return sendError(client, 'unknown_type', `未知消息类型: ${msg.type || ''}`);
  }
}

function parseFrames(client, chunk) {
  client.buffer = Buffer.concat([client.buffer, chunk]);
  while (client.buffer.length >= 2) {
    const first = client.buffer[0];
    const second = client.buffer[1];
    const opcode = first & 0x0f;
    const masked = (second & 0x80) !== 0;
    let len = second & 0x7f;
    let offset = 2;
    if (len === 126) {
      if (client.buffer.length < offset + 2) return;
      len = client.buffer.readUInt16BE(offset);
      offset += 2;
    } else if (len === 127) {
      if (client.buffer.length < offset + 8) return;
      const big = client.buffer.readBigUInt64BE(offset);
      if (big > BigInt(1024 * 1024)) {
        sendFrame(client.socket, 0x8, Buffer.from('frame_too_large'));
        client.socket.destroy();
        return;
      }
      len = Number(big);
      offset += 8;
    }
    const maskLen = masked ? 4 : 0;
    if (client.buffer.length < offset + maskLen + len) return;
    let payload = client.buffer.subarray(offset + maskLen, offset + maskLen + len);
    if (masked) {
      const mask = client.buffer.subarray(offset, offset + 4);
      const out = Buffer.alloc(payload.length);
      for (let i = 0; i < payload.length; i += 1) out[i] = payload[i] ^ mask[i % 4];
      payload = out;
    }
    client.buffer = client.buffer.subarray(offset + maskLen + len);
    if (opcode === 0x1) handleClientMessage(client, payload.toString('utf8'));
    else if (opcode === 0x8) {
      sendFrame(client.socket, 0x8, Buffer.alloc(0));
      client.socket.end();
      return;
    } else if (opcode === 0x9) {
      sendFrame(client.socket, 0xA, payload);
    } else if (opcode === 0xA) {
      client.alive = true;
    }
  }
}

function upgrade(req, socket) {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname !== '/ws') {
    socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
    socket.destroy();
    return;
  }
  const key = req.headers['sec-websocket-key'];
  if (!key) {
    socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
    socket.destroy();
    return;
  }
  const accept = crypto.createHash('sha1').update(`${key}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`).digest('base64');
  socket.write([
    'HTTP/1.1 101 Switching Protocols',
    'Upgrade: websocket',
    'Connection: Upgrade',
    `Sec-WebSocket-Accept: ${accept}`,
    '\r\n'
  ].join('\r\n'));
  const client = {
    socket,
    connectionId: newId('conn'),
    playerId: newId('player'),
    playerToken: newId('token'),
    roomCode: null,
    alive: true,
    buffer: Buffer.alloc(0)
  };
  clients.set(client.playerId, client);
  sendJson(client, { type: 'hello', service: SERVICE, version: VERSION, connectionId: client.connectionId, playerId: client.playerId, playerToken: client.playerToken });
  socket.on('data', chunk => parseFrames(client, chunk));
  socket.on('close', () => {
    clients.delete(client.playerId);
    if (client.roomCode && rooms.has(client.roomCode)) {
      const room = rooms.get(client.roomCode);
      room.updatedAt = new Date().toISOString();
      broadcastRoom(room);
      if (room.game) broadcastGame(room);
    }
  });
  socket.on('error', () => {});
}

const server = http.createServer((req, res) => {
  if (req.method === 'OPTIONS') return json(res, 204, {});
  if (req.url === '/' || req.url === '/health') {
    return json(res, 200, {
      ok: true,
      service: SERVICE,
      version: VERSION,
      uptimeSec: Math.round(process.uptime()),
      rooms: rooms.size,
      clients: clients.size,
      poolLoaded: !!poolCache
    });
  }
  if (req.url === '/rooms') {
    return json(res, 200, { rooms: [...rooms.values()].map(publicRoom) });
  }
  return json(res, 404, { ok: false, error: 'not_found' });
});

server.on('upgrade', upgrade);
server.listen(PORT, HOST, () => {
  console.log(`${SERVICE} ${VERSION} listening on http://${HOST}:${PORT}`);
});

setInterval(() => {
  for (const client of clients.values()) {
    if (client.socket.destroyed) {
      clients.delete(client.playerId);
      continue;
    }
    sendFrame(client.socket, 0x9, Buffer.from('ping'));
  }
}, 30000).unref();
