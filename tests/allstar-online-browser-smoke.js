'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const net = require('node:net');
const path = require('node:path');
const { spawn } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const outputDir = path.join(root, 'output', 'allstar-online-reveal');
const viewport = {
  width: Number(process.env.MOBILE_WIDTH || 430),
  height: Number(process.env.MOBILE_HEIGHT || 760)
};
const deviceScaleFactor = Number(process.env.MOBILE_DPR || 1);
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
    const keepFlexible = process.env.MOBILE_KEEP_FLEXIBLE === '1' && game.stage === 1;
    await page.locator(keepFlexible ? '[data-sdo="lock-no"]' : '[data-sdo="lock-yes"]').click();
  } else if (game.awaiting === 'action') {
    await page.locator('[data-sdo="keep-lock"]').click();
  } else if (game.awaiting === 'bid_attack' || game.awaiting === 'bid_defend') {
    const bid = game.awaiting === 'bid_attack' ? game.bid.price + 1 : game.bid.price;
    await page.locator('#sdoBidInput').fill(String(bid));
    await page.locator('[data-sdo="submit-bid"]').click();
  }
}

async function waitForPlayablePage(pages, timeoutMs = 8000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    for (const page of pages) {
      const state = await gameState(page);
      if (!state.game?.you?.canAct) continue;
      if (await page.locator('.sd-card-grid.is-dealing, .sd-announce-bg').count()) continue;
      return page;
    }
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  throw new Error('No playable mobile draft state appeared');
}

async function mobileLayoutMetrics(page) {
  return page.evaluate(() => {
    const rect = selector => document.querySelector(selector)?.getBoundingClientRect() || null;
    const cards = [...document.querySelectorAll('.sd-card')].map(node => node.getBoundingClientRect());
    const cardBacks = [...document.querySelectorAll('.sd-card-back')];
    const visibleButtons = [...document.querySelectorAll('.sd-action-zone button, .manager-back-link')]
      .filter(node => {
        const box = node.getBoundingClientRect();
        return box.width > 0 && box.height > 0;
      });
    return {
      viewport: { width: innerWidth, height: innerHeight },
      documentOverflowX: document.documentElement.scrollWidth > innerWidth + 1,
      documentOverflowY: document.documentElement.scrollHeight > innerHeight + 1,
      topbar: rect('.sd-topbar'),
      flowbar: rect('.sd-flowbar'),
      managers: rect('.sd-mgr-strip'),
      headline: rect('.sd-headline'),
      grid: rect('.sd-card-grid'),
      action: rect('.sd-action-zone'),
      cards,
      clippedCardCount: cardBacks.filter(node => node.scrollHeight > node.clientHeight + 1 || node.scrollWidth > node.clientWidth + 1).length,
      clippedCards: cardBacks.map((node, index) => ({
        index,
        scrollHeight: node.scrollHeight,
        clientHeight: node.clientHeight,
        scrollWidth: node.scrollWidth,
        clientWidth: node.clientWidth,
        offenders: [...node.querySelectorAll('*')]
          .map(child => ({
            className: child.className,
            text: child.textContent?.trim().replace(/\s+/g, ' ').slice(0, 80),
            scrollWidth: child.scrollWidth,
            clientWidth: child.clientWidth
          }))
          .filter(child => child.scrollWidth > child.clientWidth + 1)
          .slice(0, 5)
      }))
        .filter(card => card.scrollHeight > card.clientHeight + 1 || card.scrollWidth > card.clientWidth + 1),
      minTouchHeight: visibleButtons.length ? Math.min(...visibleButtons.map(node => node.getBoundingClientRect().height)) : 999
    };
  });
}

function assertMobileLayout(metrics) {
  assert.equal(metrics.documentOverflowX, false, '手机端不能横向溢出');
  assert.equal(metrics.documentOverflowY, false, '选牌必须保持一屏且不能纵向溢出');
  assert.equal(metrics.cards.length, 5, '手机端必须完整展示 5 张卡');
  assert.equal(metrics.clippedCardCount, 0, `卡面内容不能被卡片自身裁掉: ${JSON.stringify(metrics.clippedCards)}`);
  assert.ok(metrics.headline.bottom <= Math.min(...metrics.cards.map(card => card.top)) + 1, '指令条不能压住卡牌');
  assert.ok(Math.max(...metrics.cards.map(card => card.bottom)) <= metrics.action.top + 1, '卡牌不能被操作区遮挡');
  assert.ok(metrics.action.bottom <= metrics.viewport.height + 1, '操作区必须完整留在视口内');
  assert.ok(metrics.minTouchHeight >= 40, `主要触控目标过小: ${metrics.minTouchHeight}px`);
}

async function assertActionButtonsVisible(page, label) {
  const metrics = await page.evaluate(() => {
    const action = document.querySelector('.sd-action-zone')?.getBoundingClientRect();
    const buttons = [...document.querySelectorAll('.sd-action-zone .sd-action-row .manager-btn')]
      .map(button => button.getBoundingClientRect())
      .filter(rect => rect.width > 0 && rect.height > 0);
    return { action, buttons };
  });
  assert.ok(metrics.action, `${label} 缺少操作区`);
  assert.ok(metrics.buttons.length >= 2, `${label} 应显示两个选择按钮`);
  metrics.buttons.forEach((button, index) => {
    assert.ok(button.top >= metrics.action.top - 1, `${label} 按钮 ${index + 1} 超出操作框顶部`);
    assert.ok(button.bottom <= metrics.action.bottom + 1, `${label} 按钮 ${index + 1} 超出操作框底部`);
    assert.ok(button.left >= metrics.action.left - 1, `${label} 按钮 ${index + 1} 超出操作框左侧`);
    assert.ok(button.right <= metrics.action.right + 1, `${label} 按钮 ${index + 1} 超出操作框右侧`);
    assert.ok(button.height >= 40, `${label} 按钮 ${index + 1} 触控高度过小: ${button.height}px`);
  });
}

async function assertScrollableMode(page, label) {
  const metrics = await page.evaluate(() => {
    const screen = document.getElementById('screenShowdown');
    const lastPanel = [...document.querySelectorAll('.sdo-panel, .sd-results > *')].at(-1);
    return {
      scrollClass: screen?.classList.contains('sd-scroll-screen'),
      overflowY: screen ? getComputedStyle(screen).overflowY : '',
      documentHeight: document.documentElement.scrollHeight,
      viewportHeight: innerHeight,
      lastBottom: lastPanel?.getBoundingClientRect().bottom || 0
    };
  });
  assert.equal(metrics.scrollClass, true, `${label} 必须启用自然滚动模式`);
  assert.notEqual(metrics.overflowY, 'hidden', `${label} 不能隐藏纵向内容`);
  assert.ok(metrics.documentHeight >= Math.min(metrics.lastBottom, metrics.viewportHeight), `${label} 文档高度必须覆盖最后一个面板`);
}

async function runSequentialDuelBrowserScenario(browser, pageUrl, wsUrl, errors) {
  const defender = await browser.newPage({ viewport, deviceScaleFactor });
  const challenger = await browser.newPage({ viewport, deviceScaleFactor });
  for (const page of [defender, challenger]) {
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
    page.on('pageerror', err => errors.push(err.message));
  }
  try {
    await defender.addInitScript(({ wsUrl }) => {
      localStorage.setItem('allstarOnlineWsUrl', wsUrl);
      localStorage.setItem('allstarOnlineName', '锁卡守方');
    }, { wsUrl });
    await challenger.addInitScript(({ wsUrl }) => {
      localStorage.setItem('allstarOnlineWsUrl', wsUrl);
      localStorage.setItem('allstarOnlineName', '顺序挑战者');
    }, { wsUrl });
    await Promise.all([defender.goto(pageUrl), challenger.goto(pageUrl)]);
    await Promise.all([defender.click('#showdownOnlineBtn'), challenger.click('#showdownOnlineBtn')]);
    await defender.click('[data-sdo="create"]');
    await defender.waitForFunction(() => JSON.parse(window.render_game_to_text()).room?.status === 'lobby');
    const roomCode = (await gameState(defender)).room.code;
    await challenger.locator('#sdoRoomCode').fill(roomCode);
    await challenger.click('[data-sdo="join"]');
    await defender.waitForFunction(() => JSON.parse(window.render_game_to_text()).room?.seats?.length === 2);
    await defender.click('[data-sdo="start-game"]');

    const acted = new Set();
    const deadline = Date.now() + 30000;
    while (Date.now() < deadline) {
      const challengerState = await gameState(challenger);
      if (challengerState.game?.stage === 2 && challengerState.game.awaiting === 'action' && challengerState.game.you?.canAct
        && !(await challenger.locator('.sd-announce-bg').count())) break;
      for (const [page, lock, role] of [[defender, true, 'defender'], [challenger, false, 'challenger']]) {
        const state = await gameState(page);
        const game = state.game;
        if (game?.stage !== 1 || !game.you?.canAct) continue;
        if (await page.locator('.sd-card-grid.is-dealing, .sd-announce-bg').count()) continue;
        const signature = `${role}:${game.awaiting}:${game.activeIdx}:${game.pendingCardIdx}`;
        if (acted.has(signature)) continue;
        acted.add(signature);
        if (game.awaiting === 'claim') {
          const free = game.cards.find(card => card.ownerIdx < 0);
          await page.locator(`[data-card="${free.idx}"]`).click();
        } else if (game.awaiting === 'lockchoice') {
          await page.locator(lock ? '[data-sdo="lock-yes"]' : '[data-sdo="lock-no"]').click();
        }
      }
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    const actionState = await gameState(challenger);
    assert.equal(actionState.game?.awaiting, 'action', '挑战者应在荣誉轮获得行动回合');
    assert.equal(actionState.game?.you?.canAct, true, '挑战者应可选择锁卡目标');
    const defenderIdx = (await gameState(defender)).game.you.managerIdx;
    const target = actionState.game.cards.find(card => card.ownerIdx === defenderIdx && card.locked);
    assert.ok(target, '浏览器比价用例需要守方锁定卡');
    await challenger.locator(`[data-card="${target.idx}"]`).click();

    await Promise.all([
      challenger.waitForFunction(() => JSON.parse(window.render_game_to_text()).game?.awaiting === 'bid_attack'),
      defender.waitForFunction(() => JSON.parse(window.render_game_to_text()).game?.awaiting === 'bid_attack')
    ]);
    await challenger.waitForTimeout(380);
    assert.equal(await challenger.locator('.sd-modal[data-bid-mode="attack"]').count(), 1, '挑战者应看到挑战出价框');
    assert.equal(await defender.locator('.sd-modal-bg').count(), 0, '守方不能与挑战者同时看到出价框');
    await challenger.screenshot({ path: path.join(outputDir, `bid-attack-${viewport.width}x${viewport.height}.png`) });
    const attack = await gameState(challenger);
    await challenger.locator('#sdoBidInput').fill(String(attack.game.bid.price + 1));
    await challenger.click('[data-sdo="submit-bid"]');

    await Promise.all([
      defender.waitForFunction(() => JSON.parse(window.render_game_to_text()).game?.awaiting === 'bid_defend'),
      challenger.waitForFunction(() => JSON.parse(window.render_game_to_text()).game?.awaiting === 'bid_defend')
    ]);
    await defender.waitForTimeout(380);
    assert.equal(await defender.locator('.sd-modal[data-bid-mode="defend"]').count(), 1, '挑战者提交后应只轮到守方出价');
    assert.equal(await challenger.locator('.sd-modal-bg').count(), 0, '挑战者提交后不能再次看到可输入出价框');
    await defender.screenshot({ path: path.join(outputDir, `bid-defend-${viewport.width}x${viewport.height}.png`) });
    const defend = await gameState(defender);
    await defender.locator('#sdoBidInput').fill(String(defend.game.bid.price));
    await defender.click('[data-sdo="submit-bid"]');

    await Promise.all([
      defender.waitForFunction(() => JSON.parse(window.render_game_to_text()).game?.bid?.phase === 'reveal'),
      challenger.waitForFunction(() => JSON.parse(window.render_game_to_text()).game?.bid?.phase === 'reveal')
    ]);
    await challenger.waitForTimeout(380);
    for (const page of [defender, challenger]) {
      assert.equal(await page.locator('.sd-modal[data-bid-mode="reveal"]').count(), 1, '双方都应看到金币揭价结果');
      assert.equal(await page.locator('.sd-modal input').count(), 0, '揭价阶段不能继续输入金币');
      assert.equal(await page.locator('.sd-bid-side strong').count(), 2, '揭价阶段必须同时展示双方出价');
    }
    await challenger.screenshot({ path: path.join(outputDir, `bid-reveal-${viewport.width}x${viewport.height}.png`) });
    await challenger.waitForFunction(() => !document.querySelector('.sd-modal-bg'), null, { timeout: 5000 });
  } finally {
    await defender.close().catch(() => {});
    await challenger.close().catch(() => {});
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
    const host = await browser.newPage({ viewport, deviceScaleFactor });
    const guest = await browser.newPage({ viewport, deviceScaleFactor });
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
    await host.screenshot({ path: path.join(outputDir, `lobby-${viewport.width}x${viewport.height}.png`), fullPage: true });
    await assertScrollableMode(host, '联网大厅');
    for (let i = 0; i < 3; i += 1) {
      await host.click('[data-sdo="add-ai"]');
      await host.waitForFunction(count => JSON.parse(window.render_game_to_text()).room?.seats?.length === count, i + 3);
    }
    await host.click('[data-sdo="start-game"]');
    await guest.waitForFunction(() => JSON.parse(window.render_game_to_text()).game?.phase === 'draft');
    await guest.reload();
    await guest.click('#showdownOnlineBtn');
    await guest.waitForFunction(() => JSON.parse(window.render_game_to_text()).game?.phase === 'draft', null, { timeout: 5000 });

    const playablePage = await waitForPlayablePage([host, guest]);
    const layoutMetrics = await mobileLayoutMetrics(playablePage);
    await playablePage.screenshot({ path: path.join(outputDir, `draft-${viewport.width}x${viewport.height}.png`) });
    assertMobileLayout(layoutMetrics);

    let stageTwoChecked = false;
    let lockChoiceChecked = false;
    const deadline = Date.now() + 45000;
    while (Date.now() < deadline) {
      const beforeDrive = await gameState(host);
      if (!stageTwoChecked && beforeDrive.game?.stage === 2 && beforeDrive.game.cards?.some(card => card.honors)
        && !(await host.locator('.sd-announce-bg, .sd-card-grid.is-dealing').count())) {
        await host.waitForTimeout(450);
        const stageTwoMetrics = await mobileLayoutMetrics(host);
        await host.screenshot({ path: path.join(outputDir, `honors-${viewport.width}x${viewport.height}.png`) });
        assertMobileLayout(stageTwoMetrics);
        stageTwoChecked = true;
      }
      if (!lockChoiceChecked) {
        for (const page of [host, guest]) {
          const lockState = await gameState(page);
          if (lockState.game?.awaiting !== 'lockchoice' || !lockState.game.you?.canAct) continue;
          if (await page.locator('.sd-announce-bg, .sd-card-grid.is-dealing').count()) continue;
          await assertActionButtonsVisible(page, '是否锁定');
          await page.screenshot({ path: path.join(outputDir, `lockchoice-${viewport.width}x${viewport.height}.png`) });
          lockChoiceChecked = true;
          break;
        }
      }
      await driveCurrentTurn(host);
      await driveCurrentTurn(guest);
      const state = await gameState(host);
      if (state.game?.posIndex === 0 && state.game.awaiting === 'reveal' && state.game.cards.every(card => card.revealed)) break;
      await new Promise(resolve => setTimeout(resolve, 60));
    }
    const revealed = await gameState(host);
    assert.equal(revealed.game.awaiting, 'reveal', '应进入身份揭晓阶段');
    assert.equal(lockChoiceChecked, true, '应检查是否锁定按钮布局');
    if (process.env.MOBILE_KEEP_FLEXIBLE === '1') assert.equal(stageTwoChecked, true, '灵活选牌场景应检查荣誉轮布局');
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

    const solo = await browser.newPage({ viewport, deviceScaleFactor });
    solo.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
    solo.on('pageerror', err => errors.push(err.message));
    await solo.goto(pageUrl);
    await solo.click('#showdownModeBtn');
    await solo.waitForFunction(() => {
      const state = JSON.parse(window.render_game_to_text());
      return state.mode === 'allstar_showdown' && state.phase === 'draft' && state.cards?.length === 5;
    }, null, { timeout: 15000 });
    await solo.waitForFunction(() => !document.querySelector('.sd-announce-bg, .sd-card-grid.is-dealing'), null, { timeout: 10000 });
    const soloMetrics = await mobileLayoutMetrics(solo);
    await solo.screenshot({ path: path.join(outputDir, `solo-draft-${viewport.width}x${viewport.height}.png`) });
    assertMobileLayout(soloMetrics);

    await runSequentialDuelBrowserScenario(browser, pageUrl, wsUrl, errors);

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
