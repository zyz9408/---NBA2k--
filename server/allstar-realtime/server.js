#!/usr/bin/env node
'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

const HOST = process.env.HOST || '127.0.0.1';
const PORT = Number(process.env.PORT || 3001);
const SERVICE = 'allstar-showdown-realtime';
const VERSION = '0.3.6';
const START_COINS = 15;
const TEAM_ID_BASE = 31;
const CARDS_PER_POSITION = 5;
const DEAL_HOLD_MS = Math.max(2200, Number(process.env.DEAL_HOLD_MS || 2300));
const STAGE_HOLD_MS = Math.max(1400, Number(process.env.STAGE_HOLD_MS || 1750));
const AI_ACTION_HOLD_MS = Math.max(500, Number(process.env.AI_ACTION_HOLD_MS || 850));
const HUMAN_ACTION_HOLD_MS = Math.max(350, Number(process.env.HUMAN_ACTION_HOLD_MS || 500));
const PRE_REVEAL_HOLD_MS = Math.max(1200, Number(process.env.PRE_REVEAL_HOLD_MS || 1400));
const DUEL_REVEAL_HOLD_MS = Math.max(1300, Number(process.env.DUEL_REVEAL_HOLD_MS || 1600));
const REVEAL_HOLD_MS = Math.max(3600, Number(process.env.REVEAL_HOLD_MS || 4200));
const HEARTBEAT_MS = Math.max(1000, Number(process.env.HEARTBEAT_MS || 30000));

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

const ERAS = [
  { year: 2025, label: '新世代', desc: '小球空间 · 三分狂潮', baseScore: 116, pace: 102, threeRate: 1.15 },
  { year: 2009, label: '巨星年代', desc: '科比与詹姆斯的巅峰', baseScore: 102, pace: 95, threeRate: 0.74 },
  { year: 2003, label: '王朝余晖', desc: 'OK组合与石佛的时代', baseScore: 96, pace: 91, threeRate: 0.50 },
  { year: 1996, label: '乔丹王朝', desc: '公牛72胜的统治力', baseScore: 99, pace: 90, threeRate: 0.40 },
  { year: 1983, label: '黑白双雄', desc: '魔术师与大鸟的联盟', baseScore: 110, pace: 103, threeRate: 0.16 }
];

const LEAGUE_TEAMS = [
  { id: 1, n: 'Celtics', z: '凯尔特人', a: 'BOS', c: 'East', cl: '#007A33', r: 88 },
  { id: 2, n: 'Nets', z: '篮网', a: 'BKN', c: 'East', cl: '#111827', r: 77 },
  { id: 3, n: 'Knicks', z: '尼克斯', a: 'NYK', c: 'East', cl: '#f97316', r: 83 },
  { id: 4, n: '76ers', z: '76人', a: 'PHI', c: 'East', cl: '#2563eb', r: 84 },
  { id: 5, n: 'Raptors', z: '猛龙', a: 'TOR', c: 'East', cl: '#dc2626', r: 78 },
  { id: 6, n: 'Bulls', z: '公牛', a: 'CHI', c: 'East', cl: '#dc2626', r: 79 },
  { id: 7, n: 'Cavaliers', z: '骑士', a: 'CLE', c: 'East', cl: '#7f1d1d', r: 84 },
  { id: 8, n: 'Pistons', z: '活塞', a: 'DET', c: 'East', cl: '#1d4ed8', r: 76 },
  { id: 9, n: 'Pacers', z: '步行者', a: 'IND', c: 'East', cl: '#fbbf24', r: 82 },
  { id: 10, n: 'Bucks', z: '雄鹿', a: 'MIL', c: 'East', cl: '#166534', r: 86 },
  { id: 11, n: 'Hawks', z: '老鹰', a: 'ATL', c: 'East', cl: '#dc2626', r: 80 },
  { id: 12, n: 'Hornets', z: '黄蜂', a: 'CHA', c: 'East', cl: '#0891b2', r: 75 },
  { id: 13, n: 'Heat', z: '热火', a: 'MIA', c: 'East', cl: '#ef4444', r: 82 },
  { id: 14, n: 'Magic', z: '魔术', a: 'ORL', c: 'East', cl: '#2563eb', r: 81 },
  { id: 15, n: 'Wizards', z: '奇才', a: 'WAS', c: 'East', cl: '#1d4ed8', r: 75 },
  { id: 16, n: 'Mavericks', z: '独行侠', a: 'DAL', c: 'West', cl: '#2563eb', r: 84 },
  { id: 17, n: 'Rockets', z: '火箭', a: 'HOU', c: 'West', cl: '#dc2626', r: 81 },
  { id: 18, n: 'Grizzlies', z: '灰熊', a: 'MEM', c: 'West', cl: '#60a5fa', r: 80 },
  { id: 19, n: 'Pelicans', z: '鹈鹕', a: 'NOP', c: 'West', cl: '#b45309', r: 79 },
  { id: 20, n: 'Spurs', z: '马刺', a: 'SAS', c: 'West', cl: '#94a3b8', r: 78 },
  { id: 21, n: 'Warriors', z: '勇士', a: 'GSW', c: 'West', cl: '#f59e0b', r: 84 },
  { id: 22, n: 'Timberwolves', z: '森林狼', a: 'MIN', c: 'West', cl: '#1d4ed8', r: 86 },
  { id: 23, n: 'Lakers', z: '湖人', a: 'LAL', c: 'West', cl: '#a855f7', r: 84 },
  { id: 24, n: 'Suns', z: '太阳', a: 'PHX', c: 'West', cl: '#f97316', r: 83 },
  { id: 25, n: 'Jazz', z: '爵士', a: 'UTA', c: 'West', cl: '#facc15', r: 77 },
  { id: 26, n: 'Trail Blazers', z: '开拓者', a: 'POR', c: 'West', cl: '#ef4444', r: 76 },
  { id: 27, n: 'Kings', z: '国王', a: 'SAC', c: 'West', cl: '#7c3aed', r: 81 },
  { id: 28, n: 'Clippers', z: '快船', a: 'LAC', c: 'West', cl: '#2563eb', r: 82 },
  { id: 29, n: 'Thunder', z: '雷霆', a: 'OKC', c: 'West', cl: '#38bdf8', r: 87 },
  { id: 30, n: 'Nuggets', z: '掘金', a: 'DEN', c: 'West', cl: '#fbbf24', r: 86 }
];

const clients = new Map();
const rooms = new Map();
let poolCache = null;

function num(v, d = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, num(value, min)));
}

function randomFloat() {
  return crypto.randomInt(0, 1_000_000) / 1_000_000;
}

function randomRange(min, max) {
  return min + (max - min) * randomFloat();
}

function randomNormal(scale = 1) {
  return (randomFloat() + randomFloat() + randomFloat() + randomFloat() + randomFloat() + randomFloat() - 3) * scale;
}

function pick(list) {
  return list[crypto.randomInt(list.length)];
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
    era: game.era,
    simRound: game.simRound || 0,
    simRows: game.simRows || [],
    standings: game.standings || [],
    skipSim: !!game.skipSim,
    revealEndsAt: game.revealEndsAt || 0,
    transition: game.transition ? { ...game.transition } : null,
    awaiting: game.awaiting,
    activeIdx: game.activeIdx,
    activeName: game.activeIdx >= 0 ? room.managers[game.activeIdx]?.name : null,
    pendingCardIdx: game.pendingCardIdx,
    bid,
    you: {
      playerId: client.playerId,
      managerIdx: viewerIdx,
      isHost: room.hostId === client.playerId,
      canAct: !game.transition && viewerIdx >= 0 && viewerIdx === game.activeIdx && !!game.awaiting,
      canRollEra: room.hostId === client.playerId && game.phase === 'era' && !game.era,
      canSkipSim: room.hostId === client.playerId && game.phase === 'sim' && (game.simRound || 0) < 82
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
      autoManaged: mgr.kind === 'human' && !clients.has(mgr.playerId),
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
  const row = card.entry.row || {};
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
    player: card.revealed ? {
      id: num(row.id, 820000 + game.posIndex * 10 + card.idx),
      uid: row.uid ? String(row.uid) : `allstar_${card.entry.id}`,
      name: card.entry.nameCn,
      nameCn: card.entry.nameCn,
      nameEn: row.nameBirth || row.altName || '',
      image: num(row.image, 0),
      rating: hiddenScore(card)
    } : null,
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

function cleanupClientRoom(client) {
  if (client.cleanedUp) return;
  client.cleanedUp = true;
  const code = client.roomCode;
  client.roomCode = null;
  if (!code || !rooms.has(code)) return;
  const room = rooms.get(code);
  room.updatedAt = new Date().toISOString();

  if (room.status === 'lobby') {
    const oldLength = room.seats.length;
    room.seats = room.seats.filter(seat => !(seat.kind === 'human' && seat.playerId === client.playerId));
    if (room.seats.length !== oldLength) {
      const humans = room.seats.filter(seat => seat.kind === 'human' && seat.playerId);
      if (!humans.length) {
        rooms.delete(room.code);
        return;
      }
      if (room.hostId === client.playerId) room.hostId = humans[0].playerId;
    }
    broadcastRoom(room);
    return;
  }

  const connectedHumans = room.seats.filter(seat => seat.kind === 'human' && seat.playerId && clients.has(seat.playerId));
  if (!connectedHumans.length) {
    clearRoomTimers(room);
    rooms.delete(room.code);
    return;
  }
  if (room.hostId === client.playerId || !clients.has(room.hostId)) {
    room.hostId = connectedHumans[0].playerId;
  }
  resumeDisconnectedManager(room, client.playerId);
  broadcastRoom(room);
  if (room.game) broadcastGame(room);
}

function clearRoomTimers(room) {
  if (!room.game) return;
  if (room.game.revealTimer) clearTimeout(room.game.revealTimer);
  if (room.game.simTimer) clearTimeout(room.game.simTimer);
  if (room.game.advanceTimer) clearTimeout(room.game.advanceTimer);
  room.game.revealTimer = null;
  room.game.simTimer = null;
  room.game.advanceTimer = null;
  room.game.transition = null;
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

function managerNeedsHumanInput(mgr) {
  return mgr?.kind === 'human' && clients.has(mgr.playerId);
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
  const picked = shuffleList(eligible).slice(0, CARDS_PER_POSITION);
  if (picked.length < CARDS_PER_POSITION) throw new Error(`${slot.short} 可用卡池不足`);
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
    era: null,
    simRound: 0,
    simRows: room.managers.map(m => ({ managerIdx: m.idx, manager: m.name, teamName: m.teamName, color: m.color, w: 0, l: 0, streak: 0, derbyW: 0, derbyL: 0, last: null })),
    standings: [],
    season: null,
    skipSim: false,
    simTimer: null,
    revealTimer: null,
    revealEndsAt: 0,
    advanceTimer: null,
    transition: null,
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

function startTransition(room, kind, holdMs, detail = {}, resume = continueDraft) {
  const game = room.game;
  if (!game) return;
  if (game.advanceTimer) clearTimeout(game.advanceTimer);
  clearWait(game);
  const transition = {
    kind,
    startedAt: Date.now(),
    endsAt: Date.now() + holdMs,
    ...detail
  };
  game.transition = transition;
  room.updatedAt = new Date().toISOString();
  broadcastGame(room);
  game.advanceTimer = setTimeout(() => {
    const liveRoom = rooms.get(room.code);
    if (!liveRoom || liveRoom.game !== game || game.transition !== transition) return;
    game.advanceTimer = null;
    game.transition = null;
    liveRoom.updatedAt = new Date().toISOString();
    resume(liveRoom);
  }, holdMs);
}

function continueDraft(room) {
  const game = room.game;
  if (game.transition) return;
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
      startTransition(room, 'deal', DEAL_HOLD_MS, { posIndex: game.posIndex, stage: 1 });
      return;
    }
    const order = currentOrder(game);
    if (game.stage === 1) {
      if (game.turnIndex >= order.length) {
        game.stage = 2;
        game.turnIndex = 0;
        pushLog(game, `${SLOTS[game.posIndex].short} 进入荣誉轮`, 'stage');
        startTransition(room, 'stage', STAGE_HOLD_MS, { posIndex: game.posIndex, stage: 2 });
        return;
      }
      const idx = order[game.turnIndex];
      const mgr = room.managers[idx];
      if (managerNeedsHumanInput(mgr)) {
        requestHuman(room, idx, 'claim');
        broadcastGame(room);
        return;
      }
      aiClaim(room, idx);
      game.turnIndex += 1;
      startTransition(room, 'ai_action', AI_ACTION_HOLD_MS, {
        managerIdx: idx,
        action: game.log[0]?.text || ''
      });
      return;
    }
    if (game.stage <= 3) {
      if (game.turnIndex >= order.length) {
        if (game.stage < 3) {
          game.stage += 1;
          game.turnIndex = 0;
          pushLog(game, `${SLOTS[game.posIndex].short} 进入${game.stage === 2 ? '荣誉轮' : '球队轮'}`, 'stage');
          startTransition(room, 'stage', STAGE_HOLD_MS, { posIndex: game.posIndex, stage: game.stage });
          return;
        }
        startTransition(room, 'pre_reveal', PRE_REVEAL_HOLD_MS, {
          posIndex: game.posIndex,
          stage: game.stage
        }, startPositionReveal);
        return;
      }
      const idx = order[game.turnIndex];
      const mgr = room.managers[idx];
      const card = managerCard(game, idx);
      if (card && card.locked) {
        game.turnIndex += 1;
        continue;
      }
      if (managerNeedsHumanInput(mgr)) {
        requestHuman(room, idx, 'action');
        broadcastGame(room);
        return;
      }
      const completed = aiAction(room, idx);
      if (completed) game.turnIndex += 1;
      if (game.transition) return;
      if (game.awaiting) {
        broadcastGame(room);
        return;
      }
      if (completed) {
        startTransition(room, 'ai_action', AI_ACTION_HOLD_MS, {
          managerIdx: idx,
          action: game.log[0]?.text || ''
        });
        return;
      }
      continue;
    }
  }
  throw new Error('draft_state_loop_guard');
}

function startPositionReveal(room) {
  const game = room.game;
  if (!game || game.awaiting === 'reveal') return;
  const slot = SLOTS[game.posIndex];
  for (const card of game.cards) {
    card.locked = true;
    card.revealed = true;
  }
  game.activeIdx = -1;
  game.pendingCardIdx = -1;
  game.awaiting = 'reveal';
  game.revealEndsAt = Date.now() + REVEAL_HOLD_MS;
  room.updatedAt = new Date().toISOString();
  pushLog(game, `${slot.short} 身份揭晓`, 'reveal');
  broadcastGame(room);
  if (game.revealTimer) clearTimeout(game.revealTimer);
  game.revealTimer = setTimeout(() => {
    const liveRoom = rooms.get(room.code);
    if (!liveRoom || liveRoom.game !== game || game.awaiting !== 'reveal') return;
    game.revealTimer = null;
    game.revealEndsAt = 0;
    clearWait(game);
    finishPosition(liveRoom);
    liveRoom.updatedAt = new Date().toISOString();
    continueDraft(liveRoom);
  }, REVEAL_HOLD_MS);
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
  if (managerNeedsHumanInput(victim)) {
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
  if (managerNeedsHumanInput(room.managers[challengerIdx])) {
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
  if (managerNeedsHumanInput(defender)) {
    requestHuman(room, ctx.defenderIdx, 'bid_defend');
    return false;
  }
  ctx.dBid = clampBid(aiBidAmount(room, defender, game.cards[ctx.cardIdx], true), ctx.price, ctx.price + game.coins[ctx.defenderIdx]);
  return beginDuelReveal(room);
}

function clampBid(value, min, max) {
  return Math.max(min, Math.min(max, num(value, min)));
}

function beginDuelReveal(room) {
  const game = room.game;
  const ctx = game.bidCtx;
  if (!ctx || ctx.cBid == null || ctx.dBid == null) return true;
  ctx.phase = 'reveal';
  startTransition(room, 'duel_reveal', DUEL_REVEAL_HOLD_MS, {
    cardIdx: ctx.cardIdx,
    challengerIdx: ctx.challengerIdx,
    defenderIdx: ctx.defenderIdx
  }, liveRoom => {
    const completed = resolveDuel(liveRoom);
    if (completed) {
      liveRoom.game.turnIndex += 1;
      continueDraft(liveRoom);
    } else {
      broadcastGame(liveRoom);
    }
  });
  return false;
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

function autoReclaimCard(room, idx) {
  const game = room.game;
  const mgr = room.managers[idx];
  const free = freeCards(game);
  if (!mgr || !free.length) return false;
  const best = free.reduce((a, b) => aiCardValue(game, mgr, b) > aiCardValue(game, mgr, a) ? b : a, free[0]);
  best.owner = idx;
  best.acquiredBy = 'reclaim';
  pushLog(game, `${mgr.name} 掉线托管后重新认领 ${cardLabel(best)}`, 'ai');
  return true;
}

function resumeDisconnectedManager(room, playerId) {
  const game = room.game;
  if (!game || game.phase !== 'draft' || !game.awaiting) return false;
  const idx = room.managers.findIndex(mgr => mgr.kind === 'human' && mgr.playerId === playerId);
  if (idx < 0 || game.activeIdx !== idx) return false;
  const mgr = room.managers[idx];
  const awaiting = game.awaiting;
  pushLog(game, `${mgr.name} 已掉线，本回合由服务端 AI 托管`, 'ai');

  if (awaiting === 'claim' || awaiting === 'action') {
    clearWait(game);
    continueDraft(room);
    return true;
  }

  if (awaiting === 'lockchoice') {
    const card = game.cards[game.pendingCardIdx];
    if (card && card.owner === idx) card.locked = aiShouldLock(game, mgr, card);
    clearWait(game);
    game.turnIndex += 1;
    continueDraft(room);
    return true;
  }

  if (awaiting === 'reclaim') {
    autoReclaimCard(room, idx);
    const pending = game.pending;
    game.pending = null;
    clearWait(game);
    if (pending?.kind === 'postTakeLock') {
      const actor = room.managers[pending.actorIdx];
      const card = game.cards[pending.cardIdx];
      if (managerNeedsHumanInput(actor)) {
        requestHuman(room, pending.actorIdx, 'lockchoice', { pendingCardIdx: pending.cardIdx });
        broadcastGame(room);
        return true;
      }
      if (card && card.owner === pending.actorIdx) card.locked = aiShouldLock(game, actor, card);
    }
    game.turnIndex += 1;
    continueDraft(room);
    return true;
  }

  if (awaiting === 'bid_attack' && game.bidCtx) {
    const ctx = game.bidCtx;
    const card = game.cards[ctx.cardIdx];
    ctx.cBid = clampBid(aiBidAmount(room, mgr, card, false), ctx.price + 1, game.coins[idx]);
    clearWait(game);
    const completed = continueDuelDefender(room);
    if (completed) {
      game.turnIndex += 1;
      continueDraft(room);
    } else {
      broadcastGame(room);
    }
    return true;
  }

  if (awaiting === 'bid_defend' && game.bidCtx) {
    const ctx = game.bidCtx;
    const card = game.cards[ctx.cardIdx];
    ctx.dBid = clampBid(aiBidAmount(room, mgr, card, true), ctx.price, ctx.price + game.coins[idx]);
    clearWait(game);
    beginDuelReveal(room);
    return true;
  }

  clearWait(game);
  continueDraft(room);
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
  game.revealEndsAt = 0;
  game.stage = 1;
  game.turnIndex = 0;
  game.cards = [];
}

function managerTeamId(idx) {
  return TEAM_ID_BASE + idx;
}

function average(values, fallback = 0) {
  const list = values.map(value => num(value, NaN)).filter(Number.isFinite);
  if (!list.length) return fallback;
  return list.reduce((sum, value) => sum + value, 0) / list.length;
}

function eraByYear(year) {
  return ERAS.find(era => era.year === num(year, 0)) || ERAS[0];
}

function gradeForWins(wins) {
  const w = num(wins, 0);
  if (w >= 72) return { letter: 'SSS', cls: 'grade-sss' };
  if (w >= 65) return { letter: 'S', cls: 'grade-s' };
  if (w >= 58) return { letter: 'A', cls: 'grade-a' };
  if (w >= 50) return { letter: 'B', cls: 'grade-b' };
  if (w >= 42) return { letter: 'C', cls: 'grade-c' };
  if (w >= 35) return { letter: 'D', cls: 'grade-d' };
  return { letter: 'F', cls: 'grade-f' };
}

function profileFromManager(room, idx, era) {
  const game = room.game;
  const mgr = room.managers[idx];
  const cards = game.rosters[idx].filter(Boolean);
  const ratings = cards.map(hiddenScore);
  const stats = cards.map(card => card.entry.stats || {});
  const rows = cards.map(card => card.entry.row || {});
  const rating = average(ratings, 75);
  const ppg = average(stats.map(st => st.ppg), 14);
  const rpg = average(stats.map(st => st.rpg), 5);
  const apg = average(stats.map(st => st.apg), 3);
  const spg = average(stats.map(st => st.spg), 0.8);
  const bpg = average(stats.map(st => st.bpg), 0.6);
  const fg = average(stats.map(st => st.fgPct), 46);
  const tp = average(stats.map(st => st.tpPct), 30);
  const att = average(rows.map(row => row.ATT), rating);
  const def = average(rows.map(row => row.DEF), rating);
  const offense = clamp(48 + att * 0.28 + ppg * 0.62 + apg * 0.85 + fg * 0.06 + tp * 0.035 + era.threeRate * 1.4, 76, 99);
  const defense = clamp(52 + def * 0.32 + rpg * 0.34 + spg * 1.65 + bpg * 1.75, 74, 99);
  const passing = clamp(55 + apg * 5.2 + average(rows.map(row => row.skillPass), 70) * 0.2, 55, 99);
  const rebounding = clamp(58 + rpg * 3.2 + average(rows.map(row => row.skillRebound), 75) * 0.22, 55, 99);
  const pace = clamp(era.pace + average(rows.map(row => row.skillPhysique), 78) * 0.05 + average(rows.map(row => row.skillPass), 70) * 0.04 - 6, 86, 108);
  const strength = clamp(rating * 0.55 + offense * 0.24 + defense * 0.21, 72, 99);
  return {
    id: managerTeamId(idx),
    kind: 'manager',
    managerIdx: idx,
    name: mgr.teamName,
    abbr: mgr.abbr,
    color: mgr.color,
    conference: idx % 2 === 0 ? 'East' : 'West',
    rating: +rating.toFixed(1),
    offense: +offense.toFixed(1),
    defense: +defense.toFixed(1),
    passing: +passing.toFixed(1),
    rebounding: +rebounding.toFixed(1),
    pace: +pace.toFixed(1),
    strength: +strength.toFixed(1),
    cards
  };
}

function profileFromLeagueTeam(meta, era) {
  const rating = clamp(meta.r + randomNormal(2.2), 70, 91);
  const eraDefenseLift = era.year <= 2003 ? 2.4 : era.year >= 2025 ? -0.8 : 0;
  return {
    id: meta.id,
    kind: 'league',
    name: meta.z,
    abbr: meta.a,
    color: meta.cl,
    conference: meta.c,
    rating: +rating.toFixed(1),
    offense: +clamp(56 + rating * 0.35 + randomNormal(2.4) + (era.year >= 2025 ? 2 : 0), 70, 94).toFixed(1),
    defense: +clamp(58 + rating * 0.34 + randomNormal(2.0) + eraDefenseLift, 70, 95).toFixed(1),
    passing: +clamp(55 + rating * 0.28 + randomNormal(3), 55, 91).toFixed(1),
    rebounding: +clamp(54 + rating * 0.30 + randomNormal(3), 54, 92).toFixed(1),
    pace: +clamp(era.pace + randomNormal(4), 84, 110).toFixed(1),
    strength: +clamp(rating, 70, 91).toFixed(1)
  };
}

function makeSeasonRecord(profile) {
  return {
    id: profile.id,
    kind: profile.kind,
    managerIdx: profile.managerIdx ?? null,
    name: profile.name,
    abbr: profile.abbr,
    color: profile.color,
    conference: profile.conference,
    gp: 0,
    w: 0,
    l: 0,
    pf: 0,
    pa: 0,
    pct: 0
  };
}

function updateSeasonRecord(season, teamId, pointsFor, pointsAgainst) {
  const record = season.records[String(teamId)];
  if (!record) return null;
  record.gp += 1;
  record.pf += pointsFor;
  record.pa += pointsAgainst;
  if (pointsFor > pointsAgainst) record.w += 1;
  else record.l += 1;
  record.pct = record.gp ? +(record.w / record.gp).toFixed(4) : 0;
  return record;
}

function buildRoundRobinDerbyRounds(count) {
  if (count < 2) return [];
  let teams = Array.from({ length: count }, (_, i) => i);
  if (teams.length % 2 === 1) teams.push(null);
  const size = teams.length;
  const firstCycle = [];
  for (let round = 0; round < size - 1; round += 1) {
    const pairs = [];
    for (let i = 0; i < size / 2; i += 1) {
      const a = teams[i];
      const b = teams[size - 1 - i];
      if (a != null && b != null) {
        pairs.push(round % 2 === 0 ? { home: a, away: b } : { home: b, away: a });
      }
    }
    firstCycle.push(pairs);
    teams = [teams[0], teams[size - 1], ...teams.slice(1, size - 1)];
  }
  return [
    ...firstCycle,
    ...firstCycle.map(pairs => pairs.map(pair => ({ home: pair.away, away: pair.home })))
  ];
}

function buildDerbyRoundMap(managerCount) {
  const derbyRounds = buildRoundRobinDerbyRounds(managerCount);
  const used = new Set();
  const map = new Map();
  derbyRounds.forEach((pairs, i) => {
    let roundIndex = Math.max(0, Math.min(81, Math.round(((i + 1) * 82) / (derbyRounds.length + 1)) - 1));
    while (used.has(roundIndex) && roundIndex < 81) roundIndex += 1;
    while (used.has(roundIndex) && roundIndex > 0) roundIndex -= 1;
    used.add(roundIndex);
    map.set(roundIndex, pairs);
  });
  return map;
}

function buildSeasonRounds(room, season) {
  const managerCount = room.managers.length;
  const leagueIds = LEAGUE_TEAMS.map(team => team.id);
  const derbyMap = buildDerbyRoundMap(managerCount);
  const leagueOrders = room.managers.map(() => shuffleList(leagueIds));
  const rounds = [];
  for (let round = 0; round < 82; round += 1) {
    const pairs = [];
    const playedManagers = new Set();
    const usedLeague = new Set();
    const derbyPairs = derbyMap.get(round) || [];
    for (const pair of derbyPairs) {
      playedManagers.add(pair.home);
      playedManagers.add(pair.away);
      pairs.push({ homeTeamId: managerTeamId(pair.home), awayTeamId: managerTeamId(pair.away), derby: true });
    }
    for (let idx = 0; idx < managerCount; idx += 1) {
      if (playedManagers.has(idx)) continue;
      const order = leagueOrders[idx];
      let opp = order[round % order.length];
      let hop = 0;
      while (usedLeague.has(opp) && hop < order.length) {
        hop += 1;
        opp = order[(round + hop) % order.length];
      }
      usedLeague.add(opp);
      const managerHome = (round + idx) % 2 === 0;
      pairs.push({
        homeTeamId: managerHome ? managerTeamId(idx) : opp,
        awayTeamId: managerHome ? opp : managerTeamId(idx),
        derby: false
      });
    }
    const rest = shuffleList(leagueIds.filter(id => !usedLeague.has(id)));
    for (let i = 0; i + 1 < rest.length; i += 2) {
      pairs.push({ homeTeamId: rest[i], awayTeamId: rest[i + 1], derby: false, background: true });
    }
    rounds.push(pairs.filter(pair => season.profiles[String(pair.homeTeamId)] && season.profiles[String(pair.awayTeamId)]));
  }
  return rounds;
}

function allocateInteger(total, weights) {
  const sum = weights.reduce((acc, value) => acc + Math.max(0, num(value, 0)), 0);
  if (sum <= 0) {
    const base = Math.floor(total / Math.max(1, weights.length));
    const out = weights.map(() => base);
    for (let i = 0; i < total - base * weights.length; i += 1) out[i % out.length] += 1;
    return out;
  }
  const raw = weights.map(weight => Math.max(0, weight) / sum * total);
  const out = raw.map(Math.floor);
  let diff = total - out.reduce((acc, value) => acc + value, 0);
  const order = raw.map((value, i) => ({ i, frac: value - Math.floor(value) })).sort((a, b) => b.frac - a.frac);
  for (let i = 0; diff > 0 && order.length; i = (i + 1) % order.length, diff -= 1) out[order[i].i] += 1;
  return out;
}

function emptyPlayerSeasonLine(card, slotIdx) {
  return {
    slot: SLOTS[slotIdx].short,
    name: card.entry.nameCn,
    peak: `${card.entry.peakYear} ${card.entry.peakTeamCn}`,
    price: card.price || 0,
    acquiredBy: card.acquiredBy,
    gp: 0,
    mins: 0,
    pts: 0,
    reb: 0,
    ast: 0,
    stl: 0,
    blk: 0,
    tov: 0,
    fgm: 0,
    fga: 0,
    tpm: 0,
    tpa: 0,
    ftm: 0,
    fta: 0
  };
}

function addManagerPlayerStats(room, managerIdx, teamScore, opponentScore, win) {
  const game = room.game;
  const season = game.season;
  const era = game.era;
  const profile = season.profiles[String(managerTeamId(managerIdx))];
  const cards = game.rosters[managerIdx].filter(Boolean);
  const stats = cards.map(card => card.entry.stats || {});
  const rows = cards.map(card => card.entry.row || {});
  const ptsWeights = cards.map((card, i) => num(card.entry.stats?.ppg, 10) * 1.2 + hiddenScore(card) * 0.12 + (i <= 1 ? 3 : 0));
  const rebTotal = clamp(Math.round(40 + (profile.rebounding - 76) * 0.32 + randomNormal(4) + (win ? 1 : 0)), 28, 66);
  const astTotal = clamp(Math.round(teamScore * clamp(0.48 + (profile.passing - 72) / 260, 0.43, 0.72) / 2 + randomNormal(2)), 12, 45);
  const stlTotal = clamp(Math.round(6 + (profile.defense - 80) * 0.09 + randomNormal(1.4)), 2, 15);
  const blkTotal = clamp(Math.round(4 + (profile.defense - 80) * 0.08 + randomNormal(1.3)), 1, 13);
  const tovTotal = clamp(Math.round(14 - (profile.passing - 70) * 0.08 + randomNormal(2)), 5, 21);
  const pointParts = allocateInteger(teamScore, ptsWeights);
  const rebParts = allocateInteger(rebTotal, stats.map((st, i) => num(st.rpg, 4) + (i >= 3 ? 2 : 0)));
  const astParts = allocateInteger(astTotal, stats.map((st, i) => num(st.apg, 2) + (i <= 1 ? 2 : 0)));
  const stlParts = allocateInteger(stlTotal, stats.map(st => num(st.spg, 0.7) + 0.3));
  const blkParts = allocateInteger(blkTotal, stats.map((st, i) => num(st.bpg, 0.4) + (i >= 3 ? 0.5 : 0)));
  const tovParts = allocateInteger(tovTotal, stats.map((st, i) => num(st.ppg, 10) * 0.08 + num(st.apg, 2) * 0.22 + (i <= 1 ? 0.5 : 0)));
  cards.forEach((card, slotIdx) => {
    const line = season.playerStats[managerIdx][slotIdx];
    const st = stats[slotIdx] || {};
    const row = rows[slotIdx] || {};
    const pts = pointParts[slotIdx] || 0;
    const ftPct = clamp(num(st.ftPct, 75) / 100, 0.52, 0.93);
    const fgPct = clamp(num(st.fgPct, 47) / 100 + randomNormal(0.012), 0.36, 0.68);
    const threeSkill = num(st.tpPct, 0) > 0 ? clamp(num(st.tpPct, 32) / 100, 0.22, 0.47) : 0;
    const threeFactor = threeSkill > 0 ? clamp(era.threeRate * (num(row.skillShotExterior, 70) / 80), 0.05, 1.35) : 0;
    const tpa = clamp(Math.round((pts / 8) * threeFactor + randomRange(0, 2)), 0, Math.max(0, Math.round(pts / 2)));
    const tpm = clamp(Math.round(tpa * (threeSkill || 0) + randomNormal(0.65)), 0, tpa);
    const fta = clamp(Math.round(pts * clamp(0.17 + num(row.tendencyFr, 70) / 650, 0.12, 0.34) + randomNormal(1.1)), 0, 18);
    const ftm = clamp(Math.round(fta * ftPct), 0, fta);
    const remaining = Math.max(0, pts - ftm - tpm * 3);
    const twoPm = clamp(Math.ceil(remaining / 2), 0, 28);
    const fgm = tpm + twoPm;
    const fga = Math.max(fgm, clamp(Math.round(fgm / fgPct), fgm, 36));
    line.gp += 1;
    line.mins += 48;
    line.pts += pts;
    line.reb += rebParts[slotIdx] || 0;
    line.ast += astParts[slotIdx] || 0;
    line.stl += stlParts[slotIdx] || 0;
    line.blk += blkParts[slotIdx] || 0;
    line.tov += tovParts[slotIdx] || 0;
    line.fgm += fgm;
    line.fga += fga;
    line.tpm += tpm;
    line.tpa += Math.min(tpa, fga);
    line.ftm += ftm;
    line.fta += fta;
    line.last = { pts, reb: rebParts[slotIdx] || 0, ast: astParts[slotIdx] || 0, win, teamScore, opponentScore };
  });
}

function simulateSeasonGame(room, pair, roundIndex) {
  const game = room.game;
  const season = game.season;
  const era = game.era;
  const home = season.profiles[String(pair.homeTeamId)];
  const away = season.profiles[String(pair.awayTeamId)];
  if (!home || !away) return null;
  const base = era.baseScore + ((home.pace + away.pace) / 2 - era.pace) * 0.12;
  let homeScore = Math.round(base + (home.offense - away.defense) * 0.52 + (home.strength - away.strength) * 0.34 + 2.4 + randomNormal(pair.derby ? 7 : 8.5));
  let awayScore = Math.round(base + (away.offense - home.defense) * 0.52 + (away.strength - home.strength) * 0.34 + randomNormal(pair.derby ? 7 : 8.5));
  homeScore = clamp(homeScore, 74, 164);
  awayScore = clamp(awayScore, 74, 164);
  if (homeScore === awayScore) {
    if (home.strength + 1.5 >= away.strength) homeScore += 1;
    else awayScore += 1;
  }
  updateSeasonRecord(season, home.id, homeScore, awayScore);
  updateSeasonRecord(season, away.id, awayScore, homeScore);
  const detail = {
    round: roundIndex + 1,
    homeTeamId: home.id,
    awayTeamId: away.id,
    homeName: home.name,
    awayName: away.name,
    homeScore,
    awayScore,
    derby: !!pair.derby
  };
  [home, away].forEach(profile => {
    if (profile.kind !== 'manager') return;
    const isHome = profile.id === home.id;
    const my = isHome ? homeScore : awayScore;
    const opp = isHome ? awayScore : homeScore;
    const win = my > opp;
    const row = game.simRows[profile.managerIdx];
    if (win) {
      row.w += 1;
      row.streak = Math.max(1, num(row.streak, 0) + 1);
    } else {
      row.l += 1;
      row.streak = Math.min(-1, num(row.streak, 0) - 1);
    }
    if (pair.derby) {
      if (win) row.derbyW += 1;
      else row.derbyL += 1;
    }
    row.last = {
      my,
      opp,
      win,
      oppName: isHome ? away.name : home.name,
      home: isHome,
      derby: !!pair.derby
    };
    addManagerPlayerStats(room, profile.managerIdx, my, opp, win);
  });
  season.gameDetails.push(detail);
  return detail;
}

function playerSeasonAverages(line) {
  const gp = Math.max(1, num(line.gp, 0));
  const pct = (made, att) => num(att, 0) > 0 ? +(num(made, 0) / num(att, 1) * 100).toFixed(1) : '--';
  return {
    slot: line.slot,
    name: line.name,
    peak: line.peak,
    price: line.price,
    acquiredBy: line.acquiredBy,
    gp: line.gp,
    mpg: +(line.mins / gp).toFixed(1),
    ppg: +(line.pts / gp).toFixed(1),
    rpg: +(line.reb / gp).toFixed(1),
    apg: +(line.ast / gp).toFixed(1),
    spg: +(line.stl / gp).toFixed(1),
    bpg: +(line.blk / gp).toFixed(1),
    fgPct: pct(line.fgm, line.fga),
    tpPct: pct(line.tpm, line.tpa),
    ftPct: pct(line.ftm, line.fta)
  };
}

function buildSeasonStandings(room) {
  const season = room.game.season;
  const rows = Object.values(season.records).map(record => ({
    ...record,
    pct: record.gp ? +(record.w / record.gp).toFixed(4) : 0,
    diff: record.pf - record.pa
  })).sort((a, b) => b.pct - a.pct || b.w - a.w || b.diff - a.diff || b.pf - a.pf);
  rows.forEach((row, i) => { row.rank = i + 1; });
  return rows;
}

function initSeasonSimulation(room, era) {
  const game = room.game;
  const profiles = {};
  const records = {};
  const season = {
    era,
    profiles,
    records,
    rounds: [],
    gameDetails: [],
    playerStats: room.managers.map((_, idx) => game.rosters[idx].map((card, slotIdx) => emptyPlayerSeasonLine(card, slotIdx)))
  };
  LEAGUE_TEAMS.map(meta => profileFromLeagueTeam(meta, era)).forEach(profile => {
    profiles[String(profile.id)] = profile;
    records[String(profile.id)] = makeSeasonRecord(profile);
  });
  room.managers.forEach((_, idx) => {
    const profile = profileFromManager(room, idx, era);
    profiles[String(profile.id)] = profile;
    records[String(profile.id)] = makeSeasonRecord(profile);
  });
  season.rounds = buildSeasonRounds(room, season);
  game.season = season;
  game.simRound = 0;
  game.skipSim = false;
  game.simRows = room.managers.map(m => ({
    managerIdx: m.idx,
    manager: m.name,
    teamName: m.teamName,
    color: m.color,
    w: 0,
    l: 0,
    streak: 0,
    derbyW: 0,
    derbyL: 0,
    last: null
  }));
  game.standings = buildSeasonStandings(room).slice(0, 12);
}

function simulateNextRound(room) {
  const game = room.game;
  const season = game.season;
  if (!season || game.simRound >= 82) return false;
  const pairs = season.rounds[game.simRound] || [];
  pairs.forEach(pair => simulateSeasonGame(room, pair, game.simRound));
  game.simRound += 1;
  game.standings = buildSeasonStandings(room).slice(0, 12);
  return true;
}

function buildFinalSeasonResult(room) {
  const game = room.game;
  const standings = buildSeasonStandings(room);
  const entries = room.managers.map((mgr, idx) => {
    const teamId = managerTeamId(idx);
    const record = standings.find(row => row.id === teamId) || makeSeasonRecord({ id: teamId, kind: 'manager', name: mgr.teamName, abbr: mgr.abbr, color: mgr.color, conference: 'East' });
    const simRow = game.simRows[idx] || {};
    const rating = game.rosters[idx].filter(Boolean).reduce((sum, card) => sum + hiddenScore(card), 0);
    return {
      rank: 0,
      managerIdx: idx,
      manager: mgr.name,
      teamName: mgr.teamName,
      color: mgr.color,
      teamId,
      leagueRank: standings.findIndex(row => row.id === teamId) + 1,
      record,
      derbyW: num(simRow.derbyW, 0),
      derbyL: num(simRow.derbyL, 0),
      coinsLeft: game.coins[idx],
      coinsSpent: game.spent[idx],
      rating,
      strength: game.season.profiles[String(teamId)]?.strength || Math.round(rating / 5),
      grade: gradeForWins(record.w),
      players: game.season.playerStats[idx].map(playerSeasonAverages)
    };
  });
  entries.sort((a, b) =>
    num(b.record.w, 0) - num(a.record.w, 0)
    || num(b.derbyW, 0) - num(a.derbyW, 0)
    || (num(b.record.pf, 0) - num(b.record.pa, 0)) - (num(a.record.pf, 0) - num(a.record.pa, 0))
    || num(b.coinsLeft, 0) - num(a.coinsLeft, 0));
  entries.forEach((entry, i) => { entry.rank = i + 1; });
  return {
    entries,
    standings,
    era: game.era,
    duels: game.duels,
    rounds: 82,
    gameCount: game.season.gameDetails.length
  };
}

function finishSeason(room) {
  const game = room.game;
  game.phase = 'results';
  room.status = 'results';
  game.activeIdx = -1;
  game.awaiting = null;
  game.simRound = 82;
  game.standings = buildSeasonStandings(room).slice(0, 12);
  game.result = buildFinalSeasonResult(room);
  room.updatedAt = new Date().toISOString();
  pushLog(game, `${game.era.year} ${game.era.label} 82场赛季模拟完成`, 'stage');
}

function runSeasonLoop(roomCode) {
  const room = rooms.get(roomCode);
  if (!room || !room.game || room.game.phase !== 'sim') return;
  const game = room.game;
  if (game.simTimer) {
    clearTimeout(game.simTimer);
    game.simTimer = null;
  }
  const step = () => {
    const liveRoom = rooms.get(roomCode);
    if (!liveRoom || !liveRoom.game || liveRoom.game.phase !== 'sim') return;
    const liveGame = liveRoom.game;
    if (liveGame.skipSim) {
      while (liveGame.simRound < 82) simulateNextRound(liveRoom);
      finishSeason(liveRoom);
      broadcastRoom(liveRoom);
      broadcastGame(liveRoom);
      return;
    }
    simulateNextRound(liveRoom);
    liveRoom.updatedAt = new Date().toISOString();
    broadcastGame(liveRoom);
    if (liveGame.simRound >= 82) {
      finishSeason(liveRoom);
      broadcastRoom(liveRoom);
      broadcastGame(liveRoom);
      return;
    }
    liveGame.simTimer = setTimeout(step, liveGame.simRound < 5 ? 260 : 85);
  };
  if (game.skipSim) step();
  else game.simTimer = setTimeout(step, 240);
}

function finishDraft(room) {
  const game = room.game;
  game.phase = 'era';
  room.status = 'era';
  game.activeIdx = -1;
  game.awaiting = null;
  game.era = null;
  game.result = null;
  game.standings = [];
  room.updatedAt = new Date().toISOString();
  pushLog(game, '五个位置选牌完成，等待房主启动年代转盘', 'stage');
  broadcastRoom(room);
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
      playerToken: client.playerToken,
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
  room.seats.push({ seatId, kind: 'human', playerId: client.playerId, playerToken: client.playerToken, name: cleanName(msg.name) });
  room.seats.sort((a, b) => a.seatId - b.seatId);
  room.updatedAt = new Date().toISOString();
  client.roomCode = room.code;
  sendJson(client, { type: 'room_joined', room: publicRoom(room), playerToken: client.playerToken });
  broadcastRoom(room);
}

function handleResumeRoom(client, msg) {
  const room = requireRoom(client, msg.roomCode);
  if (!room) return;
  if (room.status === 'lobby') return sendError(client, 'resume_expired', '大厅席位已经释放，请重新加入房间');
  const token = String(msg.playerToken || '');
  const seat = room.seats.find(item => item.kind === 'human' && item.playerToken === token);
  if (!seat) return sendError(client, 'resume_failed', '恢复凭证无效或席位已经失效');

  const oldPlayerId = seat.playerId;
  const oldClient = clients.get(oldPlayerId);
  if (oldClient && oldClient !== client) {
    oldClient.cleanedUp = true;
    oldClient.roomCode = null;
    clients.delete(oldPlayerId);
    oldClient.socket.destroy();
  }

  seat.playerId = client.playerId;
  seat.playerToken = client.playerToken;
  client.roomCode = room.code;
  if (room.hostId === oldPlayerId) room.hostId = client.playerId;
  const manager = room.managers.find(item => item.kind === 'human' && item.playerId === oldPlayerId);
  if (manager) manager.playerId = client.playerId;
  room.updatedAt = new Date().toISOString();

  sendJson(client, {
    type: 'room_resumed',
    room: publicRoom(room),
    game: publicGame(room, client),
    playerToken: client.playerToken
  });
  broadcastRoom(room);
  broadcastGame(room);
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
  if (room.status !== 'lobby') return sendError(client, 'room_locked', '游戏已经开始');
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
  startTransition(room, 'human_action', HUMAN_ACTION_HOLD_MS, {
    managerIdx: turn.idx,
    action: game.log[0]?.text || ''
  });
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
  startTransition(room, 'human_action', HUMAN_ACTION_HOLD_MS, {
    managerIdx: turn.idx,
    action: game.log[0]?.text || ''
  });
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
  beginDuelReveal(room);
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
  startTransition(room, 'human_action', HUMAN_ACTION_HOLD_MS, {
    managerIdx: turn.idx,
    action: game.log[0]?.text || ''
  });
}

function handleRollEra(client, msg) {
  const room = requireRoom(client, msg.roomCode || client.roomCode);
  if (!room || !requireHost(client, room)) return;
  const game = room.game;
  if (!game || game.phase !== 'era' || room.status !== 'era') {
    return sendError(client, 'not_ready_for_era', '当前不能启动年代转盘');
  }
  if (game.era) return sendError(client, 'era_already_rolled', '年代已经确定');
  const era = pick(ERAS);
  game.era = era;
  game.phase = 'sim';
  room.status = 'sim';
  game.activeIdx = -1;
  game.awaiting = null;
  initSeasonSimulation(room, era);
  pushLog(game, `命运转盘落定: ${era.year} ${era.label}，82场赛季开始`, 'stage');
  room.updatedAt = new Date().toISOString();
  broadcastRoom(room);
  broadcastGame(room);
  runSeasonLoop(room.code);
}

function handleSkipSim(client, msg) {
  const room = requireRoom(client, msg.roomCode || client.roomCode);
  if (!room || !requireHost(client, room)) return;
  const game = room.game;
  if (!game || game.phase !== 'sim') return sendError(client, 'not_simulating', '当前不在赛季模拟阶段');
  game.skipSim = true;
  pushLog(game, '房主跳过直播动画，服务端快速完成剩余赛程', 'stage');
  if (game.simTimer) {
    clearTimeout(game.simTimer);
    game.simTimer = null;
  }
  runSeasonLoop(room.code);
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
    case 'resume_room': return handleResumeRoom(client, msg);
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
    case 'roll_era': return handleRollEra(client, msg);
    case 'skip_sim': return handleSkipSim(client, msg);
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
    cleanupClientRoom(client);
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
      cleanupClientRoom(client);
      continue;
    }
    if (!client.alive) {
      client.socket.destroy();
      continue;
    }
    client.alive = false;
    sendFrame(client.socket, 0x9, Buffer.from('ping'));
  }
}, HEARTBEAT_MS).unref();
