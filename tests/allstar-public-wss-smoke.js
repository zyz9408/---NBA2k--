'use strict';

const url = process.argv[2] || 'wss://mofi1994.xyz/allstar/ws';
const socket = new WebSocket(url);
const timer = setTimeout(() => {
  console.error('FAIL public WSS smoke: timeout');
  process.exit(1);
}, 10000);

socket.addEventListener('message', event => {
  const message = JSON.parse(String(event.data));
  if (message.type === 'hello') {
    console.log(`HELLO ${message.version}`);
    socket.send(JSON.stringify({ type: 'create_room', name: 'deploy-smoke' }));
  } else if (message.type === 'room_created') {
    console.log(`ROOM ${message.room.status} ${message.room.seats.length}`);
    clearTimeout(timer);
    socket.close(1000, 'smoke-complete');
    setTimeout(() => process.exit(0), 200);
  } else if (message.type === 'error') {
    clearTimeout(timer);
    console.error(`FAIL public WSS smoke: ${message.code} ${message.message}`);
    process.exit(1);
  }
});

socket.addEventListener('error', () => {
  clearTimeout(timer);
  console.error('FAIL public WSS smoke: connection error');
  process.exit(1);
});
