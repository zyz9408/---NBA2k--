#!/usr/bin/env node
'use strict';

const crypto = require('node:crypto');
const http = require('node:http');

const HOST = process.env.HOST || '127.0.0.1';
const PORT = Number(process.env.PORT || 3001);
const SERVICE = 'allstar-showdown-realtime';
const VERSION = '0.1.1';

const clients = new Map();
const rooms = new Map();

function json(res, code, body) {
  const data = JSON.stringify(body);
  res.writeHead(code, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,OPTIONS'
  });
  res.end(data);
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
    }]
  };
  rooms.set(code, room);
  client.roomCode = code;
  sendJson(client, {
    type: 'room_created',
    room: publicRoom(room),
    playerToken: client.playerToken
  });
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
  if (room.seats.filter(seat => seat.kind === 'human').length >= 5) {
    return sendError(client, 'room_full', '真人玩家已满');
  }
  const usedSeats = new Set(room.seats.map(seat => seat.seatId));
  let seatId = 0;
  while (usedSeats.has(seatId)) seatId += 1;
  room.seats.push({
    seatId,
    kind: 'human',
    playerId: client.playerId,
    name: cleanName(msg.name)
  });
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
  room.seats.push({
    seatId,
    kind: 'ai',
    name: `AI经理${room.seats.filter(seat => seat.kind === 'ai').length + 1}`
  });
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
  room.status = 'draft_pending';
  room.updatedAt = new Date().toISOString();
  broadcastRoom(room, {
    note: `联网房间底座已就绪，本局 ${totalSeats} 个经理席位，AI 不会自动补位。完整选牌状态机将在下一阶段接入。`
  });
}

function handleClientMessage(client, raw) {
  let msg;
  try {
    msg = JSON.parse(raw);
  } catch (_) {
    return sendError(client, 'bad_json', '消息不是有效 JSON');
  }
  switch (msg.type) {
    case 'ping':
      return sendJson(client, { type: 'pong', t: Date.now() });
    case 'create_room':
      return handleCreateRoom(client, msg);
    case 'join_room':
      return handleJoinRoom(client, msg);
    case 'add_ai':
      return handleAddAi(client, msg);
    case 'remove_ai':
      return handleRemoveAi(client, msg);
    case 'start_game':
      return handleStartGame(client, msg);
    default:
      return sendError(client, 'unknown_type', `未知消息类型: ${msg.type || ''}`);
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
  if (req.url !== '/ws') {
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
  const accept = crypto
    .createHash('sha1')
    .update(`${key}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`)
    .digest('base64');
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
  sendJson(client, {
    type: 'hello',
    service: SERVICE,
    version: VERSION,
    connectionId: client.connectionId,
    playerId: client.playerId,
    playerToken: client.playerToken
  });
  socket.on('data', chunk => parseFrames(client, chunk));
  socket.on('close', () => {
    clients.delete(client.playerId);
    if (client.roomCode && rooms.has(client.roomCode)) {
      const room = rooms.get(client.roomCode);
      room.updatedAt = new Date().toISOString();
      broadcastRoom(room);
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
      clients: clients.size
    });
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
