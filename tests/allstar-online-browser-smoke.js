'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const net = require('node:net');
const path = require('node:path');
const { spawn } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const outputDir = path.join(root, 'output', 'allstar-online-reveal');
fs.mkdirSync(outputDir, { recursive: true });

function loadPlaywright() {
  const candidates = [
    'playwright',
    path.join(process.env.USERPROFILE || 'C:\\Users\\46676', '.codex', 'node_modules', 'playwright'),
    path.join(process.env.USERPROFILE || 'C:\\Users\\46676', '.cache', 'codex-runtimes', 'codex-primary-runtime', 'dependencies', 'node', 'node_modules', 'playwright')
  ];
  for (const candidate of candidates) {
    try { return require(candidate); } catch (_) { /* Try the next installed runtime. */ }
  }
  throw new Error('Playwright is not installed');
}

function findChrome() {
  return [
    process.env.CHROME_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
  ].filter(Boolean).find(file => fs.existsSync(file));
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

function startStaticServer() {
  return new Promise(resolve => {
    const server = http.createServer((req, res) => {
      const urlPath = decodeURIComponent(req.url.split('?')[0]);
      const file = path.join(root, urlPath === '/' ? 'nba-82-0-draft.html' : urlPath);
      if (!file.startsWith(root)) { res.writeHead(403); res.end(); return; }
      fs.readFile(file, (err, data) => {
        if (err) { res.writeHead(404); res.end(); return; }
        const ext = path.extname(file);
        const type = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg' }[ext] || 'application/octet-stream';
        res.writeHead(200, { 'content-type': `${type}${/^text\//.test(type) || type === 'application/json' ? '; charset=utf-8' : ''}` });
        res.end(data);
      });
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

async function waitForHealth(port) {
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    try {
      if ((await fetch(`http://127.0.0.1:${port}/health`)).ok) return;
    } catch (_) { /* Server is still starting. */ }
    await new Promise(resolve => setTimeout(resolve, 40));
  }
  throw new Error('Realtime server did not become healthy');
}

async function gameState(page) {
  return JSON.parse(await page.evaluate(() => window.render_game_to_text()));
}

async function driveCurrentTurn(page) {
  const state = await gameState(page);
  const game = state.game;
  if (!game?.you?.canAct) return;
  if (await page.locator('.sd-card-grid.is-dealing, .sd-announce-bg').count()) return;
  const free = game.cards.find(card => card.ownerIdx < 0);
  if ((game.awaiting === 'claim' || game.awaiting === 'reclaim') && free) {
    await page.locator(`[data-card="${free.idx}"]`).click();
  } else if (game.awaiting === 'lockchoice') {
    await page.locator('[data-sdo="lock-yes"]').click();
  } else if (game.awaiting === 'action') {
    await page.locator('[data-sdo="keep-lock"]').click();
  } else if (game.awaiting === 'bid_attack' || game.awaiting === 'bid_defend') {
    const bid = game.awaiting === 'bid_attack' ? game.bid.price + 1 : game.bid.price;
    await page.locator('#sdoBidInput').fill(String(bid));
    await page.locator('[data-sdo="submit-bid"]').click();
  }
}

async function main() {
  const staticServer = await startStaticServer();
  const realtimePort = await freePort();
  const realtime = spawn(process.execPath, ['server/allstar-realtime/server.js'], {
    cwd: root,
    env: { ...process.env, HOST: '127.0.0.1', PORT: String(realtimePort) },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  let browser;
  try {
    await waitForHealth(realtimePort);
    const { chromium } = loadPlaywright();
    browser = await chromium.launch({ headless: true, executablePath: findChrome() });
    const host = await browser.newPage({ viewport: { width: 430, height: 760 }, deviceScaleFactor: 1 });
    const guest = await browser.newPage({ viewport: { width: 430, height: 760 }, deviceScaleFactor: 1 });
    const errors = [];
    for (const page of [host, guest]) {
      page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
      page.on('pageerror', err => errors.push(err.message));
    }
    const wsUrl = `ws://127.0.0.1:${realtimePort}/ws`;
    await host.addInitScript(({ wsUrl }) => {
      localStorage.setItem('allstarOnlineWsUrl', wsUrl);
      localStorage.setItem('allstarOnlineName', '手机房主');
    }, { wsUrl });
    await guest.addInitScript(({ wsUrl }) => {
      localStorage.setItem('allstarOnlineWsUrl', wsUrl);
      localStorage.setItem('allstarOnlineName', '手机玩家');
    }, { wsUrl });
    const pageUrl = `http://127.0.0.1:${staticServer.address().port}/nba-82-0-draft.html`;
    await Promise.all([host.goto(pageUrl), guest.goto(pageUrl)]);
    await Promise.all([host.click('#showdownOnlineBtn'), guest.click('#showdownOnlineBtn')]);

    await host.click('[data-sdo="create"]');
    await host.waitForFunction(() => JSON.parse(window.render_game_to_text()).room?.status === 'lobby');
    const roomCode = (await gameState(host)).room.code;
    await guest.locator('#sdoRoomCode').fill(roomCode);
    await guest.click('[data-sdo="join"]');
    await host.waitForFunction(() => JSON.parse(window.render_game_to_text()).room?.seats?.length === 2);
    for (let i = 0; i < 3; i += 1) {
      await host.click('[data-sdo="add-ai"]');
      await host.waitForFunction(count => JSON.parse(window.render_game_to_text()).room?.seats?.length === count, i + 3);
    }
    await host.click('[data-sdo="start-game"]');
    await guest.waitForFunction(() => JSON.parse(window.render_game_to_text()).game?.phase === 'draft');
    await guest.reload();
    await guest.click('#showdownOnlineBtn');
    await guest.waitForFunction(() => JSON.parse(window.render_game_to_text()).game?.phase === 'draft', null, { timeout: 5000 });

    const deadline = Date.now() + 20000;
    while (Date.now() < deadline) {
      await driveCurrentTurn(host);
      await driveCurrentTurn(guest);
      const state = await gameState(host);
      if (state.game?.posIndex === 0 && state.game.awaiting === 'reveal' && state.game.cards.every(card => card.revealed)) break;
      await new Promise(resolve => setTimeout(resolve, 60));
    }
    const revealed = await gameState(host);
    assert.equal(revealed.game.awaiting, 'reveal', '应进入身份揭晓阶段');
    assert.equal(revealed.game.cards.length, 5, '揭晓时必须保留 5 张卡');
    await host.waitForFunction(() => !document.querySelector('.sd-announce-bg'));
    await host.waitForTimeout(500);
    const names = host.locator('.sd-card.revealed .sd-front-name');
    assert.equal(await names.count(), 5, '五张翻牌都应显示球员姓名');
    await host.screenshot({ path: path.join(outputDir, 'reveal-readable-start.png') });

    await host.waitForTimeout(1800);
    const heldState = await gameState(host);
    assert.equal(heldState.game.posIndex, 0, '阅读时间内不能提前切到下一个位置');
    assert.ok(heldState.game.cards.every(card => card.revealed && card.name), '阅读时间内球员身份必须持续可见');
    await host.screenshot({ path: path.join(outputDir, 'reveal-readable-held.png') });
    const fatalErrors = errors.filter(text => !/favicon|404.*headshot|ERR_FAILED.*headshot/i.test(text));
    assert.deepEqual(fatalErrors, [], `浏览器不应出现致命错误: ${fatalErrors.slice(0, 3).join(' | ')}`);
    console.log(`PASS allstar-online-browser-smoke: ${heldState.game.cards.map(card => card.name).join(' / ')}`);
  } finally {
    if (browser) await browser.close().catch(() => {});
    realtime.kill();
    staticServer.close();
  }
}

main().catch(err => {
  console.error(`FAIL allstar-online-browser-smoke: ${err.stack || err}`);
  process.exitCode = 1;
});
