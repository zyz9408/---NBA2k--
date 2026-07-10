'use strict';

/* 全明星争夺战端到端冒烟测试
 * 驱动完整流程: 入口 → 5位置×3轮选秀(认领/锁定/抢卡/金币比价) → 年代转盘 → 82场模拟 → 结算
 * 用法: node tests/allstar-showdown-smoke.js [--headed]
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');

const root = path.resolve(__dirname, '..');
const outputDir = path.join(root, 'output', 'allstar-showdown-smoke');
const viewport = {
  width: Number(process.env.TEST_VIEWPORT_WIDTH || 1440),
  height: Number(process.env.TEST_VIEWPORT_HEIGHT || 940)
};
const deviceScaleFactor = Number(process.env.TEST_DEVICE_SCALE_FACTOR || 1);
const shotSuffix = process.env.TEST_VIEWPORT_WIDTH ? `-${viewport.width}x${viewport.height}@${deviceScaleFactor}x` : '';
fs.mkdirSync(outputDir, { recursive: true });

function loadPlaywright() {
  try {
    return require('playwright');
  } catch (err) {
    const runtimeNodeModules = path.join(
      process.env.USERPROFILE || 'C:\\Users\\46676',
      '.cache', 'codex-runtimes', 'codex-primary-runtime', 'dependencies', 'node', 'node_modules'
    );
    const directPackage = path.join(runtimeNodeModules, 'playwright');
    try {
      return require(directPackage);
    } catch (directErr) {
      const pnpmRoot = path.join(runtimeNodeModules, '.pnpm');
      const packageDir = fs.readdirSync(pnpmRoot)
        .filter(name => name.startsWith('playwright@'))
        .sort().reverse()
        .map(name => path.join(pnpmRoot, name, 'node_modules', 'playwright'))
        .find(candidate => fs.existsSync(candidate));
      if (!packageDir) throw directErr;
      return require(packageDir);
    }
  }
}

function findChrome() {
  return [
    process.env.CHROME_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Users\\46676\\AppData\\Local\\ms-playwright\\chromium_headless_shell-1208\\chrome-headless-shell-win64\\chrome-headless-shell.exe'
  ].filter(Boolean).find(p => fs.existsSync(p));
}

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.csv': 'text/plain; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml'
};

function startServer() {
  return new Promise(resolve => {
    const server = http.createServer((req, res) => {
      const urlPath = decodeURIComponent(req.url.split('?')[0]);
      let filePath = path.join(root, urlPath === '/' ? 'nba-82-0-draft.html' : urlPath);
      if (!filePath.startsWith(root)) { res.writeHead(403); res.end(); return; }
      fs.readFile(filePath, (err, data) => {
        if (err) { res.writeHead(404); res.end('not found'); return; }
        res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream' });
        res.end(data);
      });
    });
    // 端口 0 = 系统自动分配空闲端口,避免残留进程冲突
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

async function stateOf(page) {
  const raw = await page.evaluate(() => window.render_game_to_text ? window.render_game_to_text() : '{}');
  try { return JSON.parse(raw); } catch (err) { return {}; }
}

async function shot(page, name) {
  await page.screenshot({ path: path.join(outputDir, `${name}${shotSuffix}.png`), fullPage: false });
}

async function assertScrollablePhase(page, label) {
  const metrics = await page.evaluate(() => {
    const screen = document.getElementById('screenShowdown');
    return {
      scrollClass: screen?.classList.contains('sd-scroll-screen'),
      overflowY: screen ? getComputedStyle(screen).overflowY : '',
      documentOverflowX: document.documentElement.scrollWidth > innerWidth + 1,
      nestedTableOverflow: [...document.querySelectorAll('.sd-result-table')]
        .filter(table => table.scrollWidth > table.clientWidth + 1 || table.parentElement.scrollWidth > table.parentElement.clientWidth + 1)
        .map(table => ({ scrollWidth: table.scrollWidth, clientWidth: table.clientWidth })),
      documentHeight: document.documentElement.scrollHeight,
      viewportHeight: innerHeight,
      scrollY: window.scrollY
    };
  });
  assert.equal(metrics.scrollClass, true, `${label} 必须启用滚动布局`);
  assert.notEqual(metrics.overflowY, 'hidden', `${label} 不能裁掉纵向内容`);
  assert.equal(metrics.documentOverflowX, false, `${label} 不能横向溢出`);
  assert.deepEqual(metrics.nestedTableOverflow, [], `${label} 阵容数据不能依赖横向滚动`);
  assert.ok(metrics.documentHeight >= metrics.viewportHeight, `${label} 页面高度异常`);
  assert.ok(metrics.scrollY <= 1, `${label} 切换后必须从顶部开始`);
}

async function main() {
  const headed = process.argv.includes('--headed');
  const { chromium } = loadPlaywright();
  const server = await startServer();
  const port = server.address().port;
  const chromePath = findChrome();
  const browser = await chromium.launch({ headless: !headed, executablePath: chromePath || undefined });
  const page = await browser.newPage({ viewport, deviceScaleFactor });
  const consoleErrors = [];
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  page.on('pageerror', err => consoleErrors.push(String(err && err.message || err)));

  const summary = { duelsTried: 0, duelsSeen: 0, locksByMe: 0, stealsByMe: 0, screenshots: [] };

  try {
    await page.goto(`http://127.0.0.1:${port}/nba-82-0-draft.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#showdownModeBtn', { timeout: 15000 });
    await sleep(800);
    await shot(page, '01-menu');

    await page.click('#showdownModeBtn');
    // 等待进入选秀
    await page.waitForFunction(() => {
      try { return JSON.parse(window.render_game_to_text()).mode === 'allstar_showdown'; } catch (e) { return false; }
    }, { timeout: 30000 });

    let posShots = new Set();
    let bidShotDone = false;
    let guardLoops = 0;
    // ---- 选秀主循环: 响应 awaiting 状态 ----
    while (true) {
      guardLoops += 1;
      assert.ok(guardLoops < 3000, '选秀循环超时(疑似卡死)');
      const st = await stateOf(page);
      if (st.mode !== 'allstar_showdown') { await sleep(300); continue; }
      if (st.phase === 'era') break;
      if (st.phase !== 'draft') { await sleep(300); continue; }

      if (!posShots.has(`${st.pos}_${st.stage}`) && st.pos) {
        posShots.add(`${st.pos}_${st.stage}`);
        await shot(page, `02-draft-${st.pos}-stage${st.stage}`);
      }

      const awaiting = st.awaiting;
      if (!awaiting) { await sleep(220); continue; }

      if (awaiting === 'claim' || awaiting === 'reclaim') {
        const free = (st.cards || []).find(c => !c.owner);
        assert.ok(free, `${awaiting}: 应有无主卡`);
        await page.click(`[data-card="${free.no - 1}"]`);
        await sleep(150);
      } else if (awaiting === 'lockchoice') {
        // PG/SF 锁定,其余保持灵活,覆盖两条分支
        const lock = st.pos === 'PG' || st.pos === 'SF';
        if (lock) summary.locksByMe += 1;
        await page.click(lock ? '[data-sd="lock-yes"]' : '[data-sd="lock-no"]');
        await sleep(150);
      } else if (awaiting === 'action') {
        const lockedRival = (st.cards || []).find(c => c.owner && c.owner !== '你' && c.locked);
        const unlockedRival = (st.cards || []).find(c => c.owner && c.owner !== '你' && !c.locked);
        const myCoins = st.coins ? st.coins[0] : 0;
        if (lockedRival && myCoins >= 2 && summary.duelsTried < 2 && st.stage === 2) {
          summary.duelsTried += 1;
          await page.click(`[data-card="${lockedRival.no - 1}"]`);
        } else if (unlockedRival && summary.stealsByMe < 1 && st.stage === 3) {
          summary.stealsByMe += 1;
          await page.click(`[data-card="${unlockedRival.no - 1}"]`);
        } else {
          await page.click('[data-sd="keep-lock"]');
        }
        await sleep(150);
      } else if (awaiting === 'bid') {
        summary.duelsSeen += 1;
        if (!bidShotDone) { bidShotDone = true; await shot(page, '03-bid-modal'); }
        // 出 2~3 枚金币
        await page.click('[data-sd="bid-plus"]');
        await page.click('[data-sd="bid-plus"]');
        await page.click('[data-sd="bid-confirm"]');
        await sleep(200);
      } else {
        await sleep(200);
      }
    }

    // ---- 年代转盘 ----
    await shot(page, '04-era-ready');
    let st = await stateOf(page);
    assert.equal(st.phase, 'era', '应进入年代转盘阶段');
    await assertScrollablePhase(page, '年代转盘');
    assert.ok(st.rosters.every(r => r.players.length === 5), '五队都应集齐 5 名球员');
    const allNames = st.rosters.flatMap(r => r.players);
    assert.equal(new Set(allNames).size, 25, '25 名球员不应重复');
    await page.click('[data-sd="roll-era"]');
    await page.waitForFunction(() => {
      try { const s = JSON.parse(window.render_game_to_text()); return s.phase === 'sim' || s.phase === 'results'; } catch (e) { return false; }
    }, { timeout: 60000 });
    await shot(page, '05-era-landed');

    // ---- 模拟 ----
    st = await stateOf(page);
    assert.ok(st.era >= 1983, '应随机出年代年份');
    await sleep(1500);
    await shot(page, '06-sim-live');
    // 看几轮直播后跳过
    await sleep(2500);
    await page.evaluate(() => {
      const btn = document.querySelector('[data-sd="skip-sim"]');
      if (btn) btn.click();
    });
    await page.waitForFunction(() => {
      try { return JSON.parse(window.render_game_to_text()).phase === 'results'; } catch (e) { return false; }
    }, { timeout: 240000 });

    // ---- 结算 ----
    await sleep(1200);
    const topbarCopy = await page.locator('.sd-topbar-left').innerText();
    assert.match(topbarCopy, /返回主菜单/);
    assert.match(topbarCopy, /全明星争夺战/);
    await shot(page, '07-results-top');
    await assertScrollablePhase(page, '赛季结算');
    await page.evaluate(() => window.scrollTo(0, 900));
    await shot(page, '08-results-teams');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await shot(page, '09-results-bottom');

    st = await stateOf(page);
    assert.equal(st.phase, 'results');
    assert.equal(st.result.length, 5, '结算应有五支球队');
    const totalGames = st.result.map(r => r.w + r.l);
    totalGames.forEach(g => assert.equal(g, 82, `每队都应打满82场(实际${g})`));
    const ranks = st.result.map(r => r.rank).sort().join(',');
    assert.equal(ranks, '1,2,3,4,5', '排名应为1-5');
    for (let i = 1; i < st.result.length; i++) {
      assert.ok(st.result[i - 1].w >= st.result[i].w, '排名应按胜场降序');
    }
    // 金币守恒: 身价制押金/退款后, 每人 剩余+花费 必须 = 15
    st.result.forEach(r => {
      assert.equal(r.coinsLeft + r.coinsSpent, 15, `${r.team} 金币不守恒: 剩${r.coinsLeft}+花${r.coinsSpent}`);
      assert.ok(r.coinsLeft >= 0 && r.coinsSpent >= 0, `${r.team} 金币出现负数`);
    });

    const fatalErrors = consoleErrors.filter(t => !/favicon|net::ERR_FAILED.*headshots|404/i.test(t));
    assert.deepEqual(fatalErrors, [], `不应有致命控制台错误: ${JSON.stringify(fatalErrors.slice(0, 5))}`);

    console.log('PASS allstar-showdown-smoke');
    console.log('  era:', st.era, '| duels tried:', summary.duelsTried, 'bids seen:', summary.duelsSeen);
    console.log('  final:', st.result.map(r => `#${r.rank} ${r.team} ${r.w}-${r.l}`).join(' | '));
    console.log('  consoleErrors(non-fatal):', consoleErrors.length);
  } catch (err) {
    await shot(page, '99-failure').catch(() => {});
    const st = await stateOf(page).catch(() => ({}));
    console.error('FAIL:', err.message);
    console.error('state snapshot:', JSON.stringify(st).slice(0, 2000));
    console.error('console errors:', consoleErrors.slice(0, 10));
    process.exitCode = 1;
  } finally {
    await browser.close().catch(() => {});
    server.close();
  }
}

main();
