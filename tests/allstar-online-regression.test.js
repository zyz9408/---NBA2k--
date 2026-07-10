'use strict';

const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const crypto = require('node:crypto');
const net = require('node:net');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const MIN_REVEAL_HOLD_MS = 3600;
const MIN_POSITION_INTRO_MS = 1600;
const MIN_DEAL_HOLD_MS = 2400;
const MIN_STAGE_HOLD_MS = 1400;
const MIN_DUEL_REVEAL_MS = 1300;
const MIN_AI_THINK_MS = 700;
const MIN_AI_ACTION_MS = 800;

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(err => err ? reject(err) : resolve(port));
    });
  });
}

async function startRealtimeServer() {
  const port = await freePort();
  const child = spawn(process.execPath, ['server/allstar-realtime/server.js'], {
    cwd: root,
    env: { ...process.env, HOST: '127.0.0.1', PORT: String(port), HEARTBEAT_MS: '1000' },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  let logs = '';
  child.stdout.on('data', chunk => { logs += chunk; });
  child.stderr.on('data', chunk => { logs += chunk; });
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    if (child.exitCode != null) throw new Error(`realtime server exited early\n${logs}`);
    try {
      const response = await fetch(`http://127.0.0.1:${port}/health`);
      if (response.ok) return { child, port, logs: () => logs };
    } catch (_) {
      // Server is still starting.
    }
    await delay(40);
  }
  child.kill();
  throw new Error(`realtime server did not start\n${logs}`);
}

class Client {
  constructor(url, name) {
    this.url = url;
    this.name = name;
    this.ws = null;
    this.playerId = '';
    this.playerToken = '';
    this.messages = [];
    this.waiters = new Set();
  }

  async connect() {
    this.ws = new WebSocket(this.url);
    this.ws.addEventListener('message', event => {
      const msg = JSON.parse(String(event.data));
      this.messages.push(msg);
      if (msg.type === 'hello') {
        this.playerId = msg.playerId;
        this.playerToken = msg.playerToken;
      }
      for (const waiter of [...this.waiters]) {
        if (!waiter.predicate(msg)) continue;
        this.waiters.delete(waiter);
        clearTimeout(waiter.timer);
        waiter.resolve(msg);
      }
    });
    await new Promise((resolve, reject) => {
      this.ws.addEventListener('open', resolve, { once: true });
      this.ws.addEventListener('error', reject, { once: true });
    });
    await this.waitFor(msg => msg.type === 'hello');
    return this;
  }

  send(type, payload = {}) {
    this.ws.send(JSON.stringify({ type, ...payload }));
  }

  waitFor(predicate, timeoutMs = 6000) {
    const existing = this.messages.findLast(predicate);
    if (existing) return Promise.resolve(existing);
    return new Promise((resolve, reject) => {
      const waiter = { predicate, resolve, timer: null };
      waiter.timer = setTimeout(() => {
        this.waiters.delete(waiter);
        reject(new Error(`${this.name} timed out waiting for server state`));
      }, timeoutMs);
      this.waiters.add(waiter);
    });
  }

  close() {
    if (this.ws && this.ws.readyState < WebSocket.CLOSING) this.ws.close(1000, 'test-done');
  }
}

async function createTwoPlayerRoom(port, suffix) {
  const url = `ws://127.0.0.1:${port}/ws`;
  const host = await new Client(url, `host-${suffix}`).connect();
  const guest = await new Client(url, `guest-${suffix}`).connect();
  host.send('create_room', { name: `房主${suffix}` });
  const created = await host.waitFor(msg => msg.type === 'room_created');
  const roomCode = created.room.code;
  guest.send('join_room', { roomCode, name: `玩家${suffix}` });
  await guest.waitFor(msg => msg.type === 'room_joined');
  await host.waitFor(msg => msg.type === 'room_state' && msg.room.seats.length === 2);
  return { host, guest, roomCode };
}

function installAutoDriver(client) {
  const acted = new Set();
  const listener = event => {
    const msg = JSON.parse(String(event.data));
    if (msg.type !== 'game_state' || !msg.game?.you?.canAct) return;
    const game = msg.game;
    const signature = [game.posIndex, game.stage, game.awaiting, game.activeIdx, game.pendingCardIdx, game.bid?.phase].join(':');
    if (acted.has(signature)) return;
    acted.add(signature);
    const free = game.cards.find(card => card.ownerIdx < 0);
    if (game.awaiting === 'claim' && free) client.send('claim_card', { roomCode: msg.room.code, cardIdx: free.idx });
    else if (game.awaiting === 'reclaim' && free) client.send('reclaim_card', { roomCode: msg.room.code, cardIdx: free.idx });
    else if (game.awaiting === 'lockchoice') client.send('choose_lock', { roomCode: msg.room.code, lock: true });
    else if (game.awaiting === 'action') client.send('keep_lock', { roomCode: msg.room.code });
    else if (game.awaiting === 'bid_attack') client.send('submit_bid', { roomCode: msg.room.code, bid: game.bid.price + 1 });
    else if (game.awaiting === 'bid_defend') client.send('submit_bid', { roomCode: msg.room.code, bid: game.bid.price });
  };
  client.ws.addEventListener('message', listener);
  return () => client.ws.removeEventListener('message', listener);
}

function latestGame(client) {
  return client.messages.findLast(msg => msg.type === 'game_state') || null;
}

async function waitUntil(predicate, timeoutMs = 8000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const value = await predicate();
    if (value) return value;
    await delay(20);
  }
  throw new Error('timed out waiting for deterministic test state');
}

async function testAuthoritativeAnimationPacing(port) {
  const { host, guest, roomCode } = await createTwoPlayerRoom(port, '动画');
  try {
    host.send('start_game', { roomCode });
    const intro = await host.waitFor(msg => msg.type === 'game_state' && msg.game.phase === 'draft');
    const introStartedAt = Date.now();
    assert.equal(intro.game.transition?.kind, 'position_intro', '位置过场必须在发牌前单独播放');
    assert.equal(intro.game.you.canAct, false, '位置过场结束前不能操作');
    assert.ok(intro.game.transition.endsAt - Date.now() >= MIN_POSITION_INTRO_MS - 150,
      '位置过场 transition 必须覆盖完整全屏动画');
    const deal = await host.waitFor(msg => msg.type === 'game_state' && msg.game.transition?.kind === 'deal', 5000);
    assert.ok(Date.now() - introStartedAt >= MIN_POSITION_INTRO_MS,
      '位置过场未结束时不能启动发牌');
    const dealStartedAt = Date.now();
    assert.equal(deal.game.transition?.kind, 'deal', '发牌期间服务端必须发布 deal transition');
    assert.equal(deal.game.you.canAct, false, '发牌动画结束前不能开始玩家回合');
    assert.ok(deal.game.transition.endsAt - Date.now() >= MIN_DEAL_HOLD_MS - 150,
      '发牌 transition 必须覆盖最后一张牌套动画');
    await host.waitFor(msg => msg.type === 'game_state' && msg.game.awaiting === 'claim', 6000);
    assert.ok(Date.now() - dealStartedAt >= MIN_DEAL_HOLD_MS,
      '发牌动画未结束时服务端不能推进到认领');
  } finally {
    host.close();
    guest.close();
  }
}

async function testAiAnimationPacing(port) {
  const { host, guest, roomCode } = await createTwoPlayerRoom(port, '动画AI');
  const stopHost = installAutoDriver(host);
  const stopGuest = installAutoDriver(guest);
  try {
    host.send('add_ai', { roomCode });
    await host.waitFor(msg => msg.type === 'room_state' && msg.room.seats.length === 3);
    host.send('start_game', { roomCode });
    const thinkingMessage = await host.waitFor(msg => msg.type === 'game_state'
      && msg.game.transition?.kind === 'ai_thinking', 15000);
    const thinking = thinkingMessage.game;
    const managerIdx = thinking.transition.managerIdx;
    const thinkStartedAt = Date.now();
    assert.equal(thinking.you.canAct, false, 'AI 思考动画期间不能提前进入下一回合');
    assert.ok(thinking.transition.endsAt - Date.now() >= MIN_AI_THINK_MS - 150,
      'AI 思考 transition 太短');
    const action = await host.waitFor(msg => msg.type === 'game_state'
      && msg.game.transition?.kind === 'ai_action'
      && msg.game.transition.managerIdx === managerIdx, 4000);
    assert.ok(Date.now() - thinkStartedAt >= MIN_AI_THINK_MS, 'AI 还没思考完就公布了行动');
    const actionStartedAt = Date.now();
    const actionMessageIndex = host.messages.lastIndexOf(action);
    assert.ok(action.game.transition.endsAt - Date.now() >= MIN_AI_ACTION_MS - 150,
      'AI 行动结果 transition 太短');
    await waitUntil(() => host.messages.slice(actionMessageIndex + 1)
      .find(msg => msg.type === 'game_state'
        && (msg.game.transition?.startedAt !== action.game.transition.startedAt)), 4000);
    assert.ok(Date.now() - actionStartedAt >= MIN_AI_ACTION_MS, 'AI 行动结果没播完就进入下一状态');
  } finally {
    stopHost();
    stopGuest();
    host.close();
    guest.close();
  }
}

async function testSequentialHumanDuel(port) {
  const { host, guest, roomCode } = await createTwoPlayerRoom(port, '比价');
  try {
    host.send('start_game', { roomCode });
    const firstHost = await host.waitFor(msg => msg.type === 'game_state' && msg.game.phase === 'draft');
    const firstGuest = await guest.waitFor(msg => msg.type === 'game_state' && msg.game.phase === 'draft');
    const hostIdx = firstHost.game.you.managerIdx;
    const guestIdx = firstGuest.game.you.managerIdx;
    const acted = new Set();

    await waitUntil(async () => {
      for (const [client, lock] of [[host, true], [guest, false]]) {
        const message = latestGame(client);
        const game = message?.game;
        if (!game?.you?.canAct || game.stage !== 1) continue;
        const signature = `${game.awaiting}:${game.activeIdx}:${game.pendingCardIdx}`;
        if (acted.has(signature)) continue;
        acted.add(signature);
        if (game.awaiting === 'claim') {
          const free = game.cards.find(card => card.ownerIdx < 0);
          client.send('claim_card', { roomCode, cardIdx: free.idx });
        } else if (game.awaiting === 'lockchoice') {
          client.send('choose_lock', { roomCode, lock });
        }
      }
      const stage = latestGame(host)?.game;
      return stage?.stage === 2 && stage.transition?.kind === 'stage' ? stage : null;
    }, 12000);

    const stageTransition = latestGame(host).game;
    const stageStartedAt = Date.now();
    assert.equal(stageTransition.you.canAct, false, '荣誉轮揭示动画结束前不能操作');
    assert.ok(stageTransition.transition.endsAt - Date.now() >= MIN_STAGE_HOLD_MS - 150,
      '荣誉轮 transition 必须覆盖揭示动画');

    const guestAction = await guest.waitFor(msg => msg.type === 'game_state'
      && msg.game.stage === 2
      && msg.game.awaiting === 'action'
      && msg.game.you.canAct, 6000);
    assert.ok(Date.now() - stageStartedAt >= MIN_STAGE_HOLD_MS,
      '荣誉轮动画未结束时不能推进到玩家行动');
    const lockedTarget = guestAction.game.cards.find(card => card.ownerIdx === hostIdx && card.locked);
    assert.ok(lockedTarget, '测试需要房主持有一张锁定卡');
    guest.send('challenge_card', { roomCode, cardIdx: lockedTarget.idx });

    const attackGuest = await guest.waitFor(msg => msg.type === 'game_state'
      && msg.game.awaiting === 'bid_attack' && msg.game.bid?.phase === 'attack', 3000);
    const attackHost = await host.waitFor(msg => msg.type === 'game_state'
      && msg.game.awaiting === 'bid_attack' && msg.game.bid?.phase === 'attack', 3000);
    assert.equal(attackGuest.game.you.canAct, true, '挑战阶段只允许挑战者出价');
    assert.equal(attackHost.game.you.canAct, false, '挑战阶段守方不能同时出价');
    assert.equal(attackGuest.game.activeIdx, guestIdx);
    guest.send('submit_bid', { roomCode, bid: attackGuest.game.bid.price + 1 });

    const defendHost = await host.waitFor(msg => msg.type === 'game_state'
      && msg.game.awaiting === 'bid_defend' && msg.game.bid?.phase === 'defend', 3000);
    const defendGuest = await guest.waitFor(msg => msg.type === 'game_state'
      && msg.game.awaiting === 'bid_defend' && msg.game.bid?.phase === 'defend', 3000);
    assert.equal(defendHost.game.you.canAct, true, '守价阶段只允许守方出价');
    assert.equal(defendGuest.game.you.canAct, false, '挑战者提交后不能再次看到可操作出价阶段');
    assert.equal(defendHost.game.activeIdx, hostIdx);
    host.send('submit_bid', { roomCode, bid: defendHost.game.bid.price });

    const reveal = await host.waitFor(msg => msg.type === 'game_state'
      && msg.game.bid?.phase === 'reveal'
      && msg.game.transition?.kind === 'duel_reveal', 3000);
    const revealStartedAt = Date.now();
    const revealMessageIndex = host.messages.lastIndexOf(reveal);
    assert.equal(reveal.game.you.canAct, false, '双方揭价动画期间不能继续操作');
    assert.notEqual(reveal.game.bid.cBid, null, '揭价阶段必须展示挑战出价');
    assert.notEqual(reveal.game.bid.dBid, null, '揭价阶段必须展示守方出价');
    assert.ok(reveal.game.transition.endsAt - Date.now() >= MIN_DUEL_REVEAL_MS - 150,
      '服务端揭价 transition 必须覆盖金币翻转动画');
    await waitUntil(() => host.messages.slice(revealMessageIndex + 1)
      .find(msg => msg.type === 'game_state' && !msg.game.bid), 5000);
    assert.ok(Date.now() - revealStartedAt >= MIN_DUEL_REVEAL_MS,
      '双方金币揭价动画未播完就进入了下一状态');
  } finally {
    host.close();
    guest.close();
  }
}

async function testRevealHold(port) {
  const { host, guest, roomCode } = await createTwoPlayerRoom(port, '翻牌');
  const stopHost = installAutoDriver(host);
  const stopGuest = installAutoDriver(guest);
  try {
    for (let i = 0; i < 3; i += 1) host.send('add_ai', { roomCode });
    await host.waitFor(msg => msg.type === 'room_state' && msg.room.seats.length === 5);
    host.send('start_game', { roomCode });
    const reveal = await host.waitFor(msg => msg.type === 'game_state'
      && msg.game.posIndex === 0
      && msg.game.awaiting === 'reveal'
      && msg.game.cards.length === 5
      && msg.game.cards.every(card => card.revealed), 30000);
    const revealStartedAt = Date.now();
    assert.equal(reveal.game.cards.length, 5, '联网每个位置必须始终展示 5 张卡');
    await host.waitFor(msg => msg.type === 'game_state' && msg.game.posIndex === 1, 10000);
    const holdMs = Date.now() - revealStartedAt;
    assert.ok(holdMs >= MIN_REVEAL_HOLD_MS,
      `翻牌只保留 ${holdMs}ms，扣除 1200ms 揭晓遮罩后无法看清球员；至少需要 ${MIN_REVEAL_HOLD_MS}ms`);
    return holdMs;
  } finally {
    stopHost();
    stopGuest();
    host.close();
    guest.close();
  }
}

async function testDuplicateStartRejected(port) {
  const { host, guest, roomCode } = await createTwoPlayerRoom(port, '重开');
  try {
    host.send('start_game', { roomCode });
    const first = await host.waitFor(msg => msg.type === 'game_state' && msg.game.phase === 'draft');
    const firstCardKeys = first.game.cards.map(card => `${card.no}:${card.stats.ppg}`).join('|');
    host.send('start_game', { roomCode });
    const error = await host.waitFor(msg => msg.type === 'error' && msg.code === 'room_locked', 1500);
    assert.equal(error.code, 'room_locked');
    const latest = host.messages.findLast(msg => msg.type === 'game_state');
    assert.equal(latest.game.cards.map(card => `${card.no}:${card.stats.ppg}`).join('|'), firstCardKeys,
      '重复 start_game 不得重置正在进行的选秀');
  } finally {
    host.close();
    guest.close();
  }
}

async function testDisconnectAutopilotAndHostTransfer(port) {
  const { host, guest, roomCode } = await createTwoPlayerRoom(port, '掉线');
  try {
    host.send('start_game', { roomCode });
    const deadline = Date.now() + 8000;
    while (Date.now() < deadline) {
      const state = guest.messages.findLast(msg => msg.type === 'game_state');
      if (state?.game?.you?.canAct) {
        const free = state.game.cards.find(card => card.ownerIdx < 0);
        if (state.game.awaiting === 'claim') guest.send('claim_card', { roomCode, cardIdx: free.idx });
        else if (state.game.awaiting === 'lockchoice') guest.send('choose_lock', { roomCode, lock: true });
      }
      const hostState = host.messages.findLast(msg => msg.type === 'game_state');
      if (hostState?.game?.you?.canAct) break;
      await delay(30);
    }
    const hostTurn = host.messages.findLast(msg => msg.type === 'game_state' && msg.game.you.canAct);
    assert.ok(hostTurn, '测试应推进到房主回合');
    host.close();
    const advanced = await guest.waitFor(msg => msg.type === 'game_state'
      && msg.room.hostId === guest.playerId
      && msg.game.managers.some(mgr => mgr.playerId !== guest.playerId || !mgr.connected)
      && (msg.game.transition || msg.game.you.canAct || msg.game.awaiting === 'reveal' || msg.game.posIndex > 0), 6000);
    assert.equal(advanced.room.hostId, guest.playerId, '房主掉线后应转移给仍在线的真人');
    assert.notEqual(advanced.game.activeIdx, hostTurn.game.you.managerIdx,
      '掉线玩家的待操作回合必须由服务端托管并继续');
  } finally {
    host.close();
    guest.close();
  }
}

async function testFullOnlineMatch(port) {
  const { host, guest, roomCode } = await createTwoPlayerRoom(port, '全流程');
  const stopHost = installAutoDriver(host);
  const stopGuest = installAutoDriver(guest);
  try {
    for (let i = 0; i < 3; i += 1) host.send('add_ai', { roomCode });
    await host.waitFor(msg => msg.type === 'room_state' && msg.room.seats.length === 5);
    host.send('start_game', { roomCode });
    const eraState = await host.waitFor(msg => msg.type === 'game_state' && msg.game.phase === 'era', 150000);
    assert.equal(eraState.game.rosters.length, 5, '结集阶段应有 5 支球队');
    const drafted = eraState.game.rosters.flatMap(roster => roster.players.filter(Boolean));
    assert.equal(drafted.length, 25, '5 支球队都应选满 5 个位置');
    assert.equal(new Set(drafted.map(player => player.name)).size, 25, '同一局不能重复选中球员');
    assert.ok(eraState.game.managers.every(mgr => mgr.coins + mgr.spent === 15), '每位经理的金币必须守恒');

    host.send('roll_era', { roomCode });
    const simState = await host.waitFor(msg => msg.type === 'game_state' && msg.game.phase === 'sim', 5000);
    assert.ok(simState.game.era?.year, '年代转盘结果必须由服务端同步');
    host.send('skip_sim', { roomCode });
    const results = await host.waitFor(msg => msg.type === 'game_state' && msg.game.phase === 'results', 15000);
    assert.equal(results.game.result.entries.length, 5, '结算应包含 5 支梦之队');
    for (const row of results.game.result.entries) {
      assert.equal(row.record.w + row.record.l, 82, `${row.teamName || row.manager} 必须打满 82 场`);
      assert.equal(row.players.length, 5, `${row.teamName || row.manager} 应有 5 条球员赛季数据`);
    }
  } finally {
    stopHost();
    stopGuest();
    host.close();
    guest.close();
  }
}

async function testHeartbeatCleanup(port) {
  const before = await (await fetch(`http://127.0.0.1:${port}/health`)).json();
  const socket = net.createConnection({ host: '127.0.0.1', port });
  await new Promise((resolve, reject) => {
    let response = '';
    socket.once('error', reject);
    socket.once('connect', () => {
      const key = crypto.randomBytes(16).toString('base64');
      socket.write([
        'GET /ws HTTP/1.1',
        `Host: 127.0.0.1:${port}`,
        'Upgrade: websocket',
        'Connection: Upgrade',
        `Sec-WebSocket-Key: ${key}`,
        'Sec-WebSocket-Version: 13',
        '', ''
      ].join('\r\n'));
    });
    socket.on('data', chunk => {
      response += chunk.toString('latin1');
      if (response.includes('\r\n\r\n')) resolve();
    });
  });
  const connected = await (await fetch(`http://127.0.0.1:${port}/health`)).json();
  assert.ok(connected.clients >= before.clients + 1, '静默连接应先出现在服务端连接数中');
  await delay(2400);
  const cleaned = await (await fetch(`http://127.0.0.1:${port}/health`)).json();
  assert.ok(cleaned.clients <= before.clients, '连续不回应 pong 的半断开连接应被服务端清理');
  socket.destroy();
}

async function testReconnectRestoresSeat(port) {
  const { host, guest, roomCode } = await createTwoPlayerRoom(port, '重连');
  let resumed;
  try {
    host.send('start_game', { roomCode });
    const initial = await guest.waitFor(msg => msg.type === 'game_state' && msg.game.phase === 'draft');
    const managerIdx = initial.game.you.managerIdx;
    const oldToken = guest.playerToken;
    guest.close();
    await host.waitFor(msg => msg.type === 'game_state' && msg.game.managers[managerIdx]?.autoManaged, 2500);

    resumed = await new Client(`ws://127.0.0.1:${port}/ws`, 'guest-resumed').connect();
    resumed.send('resume_room', { roomCode, playerToken: oldToken });
    const restored = await resumed.waitFor(msg => msg.type === 'room_resumed', 2500);
    assert.equal(restored.game.you.managerIdx, managerIdx, '重连后必须回到原经理座位');
    assert.equal(restored.game.managers[managerIdx].connected, true, '重连座位应重新显示在线');
    assert.ok(restored.room.seats.some(seat => seat.playerId === resumed.playerId && seat.connected), '房间座位应绑定到新连接');
    assert.notEqual(restored.playerToken, oldToken, '恢复成功后应轮换连接令牌');
  } finally {
    host.close();
    guest.close();
    if (resumed) resumed.close();
  }
}

async function main() {
  const server = await startRealtimeServer();
  try {
    const cases = [
      ['authoritative animation pacing', () => testAuthoritativeAnimationPacing(server.port)],
      ['AI animation pacing', () => testAiAnimationPacing(server.port)],
      ['sequential human duel', () => testSequentialHumanDuel(server.port)],
      ['reveal hold', () => testRevealHold(server.port)],
      ['duplicate start', () => testDuplicateStartRejected(server.port)],
      ['disconnect recovery', () => testDisconnectAutopilotAndHostTransfer(server.port)],
      ['full online match', () => testFullOnlineMatch(server.port)],
      ['heartbeat cleanup', () => testHeartbeatCleanup(server.port)],
      ['reconnect restores seat', () => testReconnectRestoresSeat(server.port)]
    ];
    const caseFilter = String(process.argv[2] || '').trim().toLowerCase();
    const selectedCases = caseFilter
      ? cases.filter(([name]) => name.toLowerCase().includes(caseFilter))
      : cases;
    if (!selectedCases.length) throw new Error(`No regression case matches: ${process.argv[2]}`);
    const failures = [];
    for (const [name, run] of selectedCases) {
      try {
        const detail = await run();
        console.log(`PASS ${name}${detail ? ` (${detail}ms)` : ''}`);
      } catch (err) {
        failures.push(err);
        console.error(`FAIL ${name}: ${err.message}`);
      }
    }
    if (failures.length) throw new AggregateError(failures, `${failures.length} online regression case(s) failed`);
    console.log('PASS allstar-online-regression');
  } finally {
    server.child.kill();
  }
}

main().catch(err => {
  console.error(`FAIL allstar-online-regression: ${err.stack || err}`);
  process.exitCode = 1;
});
