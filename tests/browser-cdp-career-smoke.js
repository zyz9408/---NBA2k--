'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const outputDir = path.join(root, 'output', 'browser-cdp-career-smoke');
fs.mkdirSync(outputDir, { recursive: true });

function loadPlaywright() {
  try {
    return require('playwright');
  } catch (err) {
    const runtimeNodeModules = path.join(
      process.env.USERPROFILE || 'C:\\Users\\46676',
      '.cache',
      'codex-runtimes',
      'codex-primary-runtime',
      'dependencies',
      'node',
      'node_modules'
    );
    const directPackage = path.join(runtimeNodeModules, 'playwright');
    try {
      return require(directPackage);
    } catch (directErr) {
      const pnpmRoot = path.join(runtimeNodeModules, '.pnpm');
      const packageDir = fs.readdirSync(pnpmRoot)
        .filter(name => name.startsWith('playwright@'))
        .sort()
        .reverse()
        .map(name => path.join(pnpmRoot, name, 'node_modules', 'playwright'))
        .find(candidate => fs.existsSync(candidate));
      if (!packageDir) throw directErr;
      return require(packageDir);
    }
  }
}

function argValue(name, fallback = '') {
  const idx = process.argv.indexOf(name);
  return idx >= 0 && process.argv[idx + 1] ? process.argv[idx + 1] : fallback;
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

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForHttp(url, timeoutMs = 10000) {
  const deadline = Date.now() + timeoutMs;
  let lastErr = null;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.ok) return res;
      lastErr = new Error(`${url} returned ${res.status}`);
    } catch (err) {
      lastErr = err;
    }
    await sleep(200);
  }
  throw lastErr || new Error(`Timed out waiting for ${url}`);
}

async function main() {
  const { chromium } = loadPlaywright();
  const port = parseInt(argValue('--port', '8021'), 10);
  const viewportWidth = parseInt(argValue('--viewport-width', '1280'), 10);
  const viewportHeight = parseInt(argValue('--viewport-height', '720'), 10);
  const mobileViewport = process.argv.includes('--mobile');
  const outputName = argValue('--output-name', mobileViewport ? 'auto-career-mobile' : 'auto-career');
  const chromePath = argValue('--chrome', '') || findChrome();
  assert.ok(chromePath, 'Chrome or Edge executable should exist');

  const server = spawn('python', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], {
    cwd: root,
    windowsHide: true,
    stdio: 'ignore'
  });

  let browser = null;
  try {
    const pageUrl = `http://127.0.0.1:${port}/nba-career-simulator.html`;
    await waitForHttp(pageUrl);
    browser = await chromium.launch({
      headless: true,
      executablePath: chromePath,
      args: ['--disable-gpu', '--disable-extensions', '--disable-background-networking', '--no-first-run', '--no-default-browser-check']
    });
    const context = await browser.newContext({
      viewport: { width: viewportWidth, height: viewportHeight },
      isMobile: mobileViewport,
      deviceScaleFactor: 1
    });
    const errors = [];
    const page = await context.newPage();
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
    page.on('pageerror', err => errors.push(err.message));
    await page.goto(pageUrl, { waitUntil: 'load' });
    await page.waitForFunction(() => document.getElementById('mainMenuPage')?.innerText?.includes('开始新生涯'), null, { timeout: 12000 });

    const value = await page.evaluate(async () => {
      const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
      const playerLabel = p => String(p?.nameEn || p?.altName || p?.name || '');
      const runtimeHistory = {};
      const mainMenuLlm = {
        hasForm: !!document.getElementById('mainMenuAutoLlmBaseURL') && String(document.getElementById('mainMenuPage')?.innerText || '').includes('OpenAI 兼容接口')
      };
      runtimeHistory.scriptYears = getAvailableScriptYears();
      document.getElementById('mainMenuAutoLlmBaseURL').value = 'https://llm.example.test/v1';
      document.getElementById('mainMenuAutoLlmModel').value = 'test-model-main';
      document.getElementById('mainMenuAutoLlmApiKey').value = 'sk-main-menu';
      document.getElementById('mainMenuAutoLlmTemperature').value = '0.55';
      document.getElementById('mainMenuAutoLlmMaxTokens').value = '1200';
      saveAutoCareerLLMSettings('mainMenuAutoLlm');
      const mainMenuSaved = getAutoCareerLLMConfig();
      mainMenuLlm.saved = mainMenuSaved.baseURL === 'https://llm.example.test/v1' && mainMenuSaved.model === 'test-model-main' && mainMenuSaved.apiKey === 'sk-main-menu';
      mainMenuLlm.message = String(document.getElementById('mainMenuAutoLlmSettingsResult')?.innerText || '');
      saveAutoCareerLLMConfig({ baseURL: '', model: '', apiKey: '', temperature: 0.75, maxTokens: 1800 }, true);
      localStorage.removeItem('nba_auto_career_llm_config_v1');

      const originalStartYear = G.startYear;
      const originalYear = G.year;
      const originalSeason = G.season;
      const originalPhase = G.phase;
      const originalLeagueState = snapshotLeagueDataState();

      try {
        await loadLeagueData({ startYear: 2003, strictRoster: true });
        const rosterPlayers2003 = Object.values(LEAGUE.teams).flatMap(team => team.players || []);
        const shaq2003 = rosterPlayers2003.find(p => /Shaquille O'?Neal/i.test(playerLabel(p)));
        const class2003 = generateDraftClass(14, { targetYear: 2003 });
        const class2003Names = (class2003.players || []).map(playerLabel);
        const era2003 = getHistoricalEraEntries(2003);
        runtimeHistory.y2003 = {
          shaqHasHistory: !!shaq2003?.careerBeforeStart,
          shaqFirstSeason: shaq2003?.careerBeforeStart?.firstSeason || null,
          shaqFirstSeasonEndYear: shaq2003?.careerBeforeStart?.firstSeasonEndYear || null,
          shaqLastSeason: shaq2003?.careerBeforeStart?.lastSeason || null,
          shaqLastSeasonEndYear: shaq2003?.careerBeforeStart?.lastSeasonEndYear || null,
          shaqRings: shaq2003?.careerBeforeStart?.honors?.rings || 0,
          lebronEraEntry: era2003.find(e => /LeBron James/i.test(e.name || e.nameEn || '')) || null,
          draftNames: class2003Names
        };

        await loadLeagueData({ startYear: 2009, strictRoster: true });
        const rosterPlayers2009 = Object.values(LEAGUE.teams).flatMap(team => team.players || []);
        const lebron2009 = rosterPlayers2009.find(p => /LeBron James/i.test(playerLabel(p)));
        const class2009 = generateDraftClass(12, { targetYear: 2009 });
        const class2009Players = class2009.players || [];
        const class2009Names = class2009Players.map(playerLabel);
        const era2009 = getHistoricalEraEntries(2009);
        let lebron2009ProfileText = '';
        if (lebron2009) {
          openPlayerDetailModal(lebron2009, null, '球员详情');
          lebron2009ProfileText = String(document.getElementById('modalBox')?.innerText || '');
          hideModal();
        }
        runtimeHistory.y2009 = {
          lebronHasHistory: !!lebron2009?.careerBeforeStart,
          lebronRings: lebron2009?.careerBeforeStart?.honors?.rings || 0,
          lebronMvp: lebron2009?.careerBeforeStart?.honors?.mvp || 0,
          lebronFmvp: lebron2009?.careerBeforeStart?.honors?.fmvp || 0,
          lebronHonorSeasons: lebron2009?.honorSeasons || [],
          lebronHonorSeason2009: (lebron2009?.honorSeasons || []).find(row => row.seasonEndYear === 2009) || null,
          lebronProfileText: lebron2009ProfileText.slice(0, 900),
          lebronEraEntry: era2009.find(e => /LeBron James/i.test(e.name || e.nameEn || '')) || null,
          draftNames: class2009Names,
          draftPhotosOk: class2009Players.every(p => !!p.photoLocal || (p.image && !/IMG0000/i.test(String(p.photo || '')))),
          eraTop5: era2009.slice(0, 5).map(e => e.name)
        };

        await loadLeagueData({ startYear: 2025, strictRoster: true });
        const rosterPlayers2025 = Object.values(LEAGUE.teams).flatMap(team => team.players || []);
        const sga2025 = rosterPlayers2025.find(p => /Shai Gilgeous-Alexander/i.test(playerLabel(p)));
        const robert2025 = rosterPlayers2025.find(p => /^Robert Williams$/i.test(playerLabel(p)));
        const jaren2025 = rosterPlayers2025.find(p => /^Jaren Jackson Jr\.$/i.test(playerLabel(p)));
        const xavier2025 = rosterPlayers2025.find(p => /^Xavier Tillman Sr\.$/i.test(playerLabel(p)));
        const walterClayton2025 = rosterPlayers2025.find(p => /^Walter Clayton Jr\.$/i.test(playerLabel(p)));
        const class2025 = generateDraftClass(12, { targetYear: 2025 });
        const class2025Players = class2025.players || [];
        const cooper = class2025Players.find(p => /Cooper Flagg/i.test(playerLabel(p)));
        const era2025 = getHistoricalEraEntries(2025);
        runtimeHistory.y2025 = {
          draftNames: class2025Players.map(playerLabel),
          cooperHasPhoto: !!cooper?.photoLocal && !/IMG0000/i.test(String(cooper?.photo || '')),
          sgaCareerRows: sga2025?.careerHistory?.length || 0,
          sgaSeasonIndexRows: Object.keys(sga2025?.historicalStatsBySeason || {}).length,
          sgaFirstSeason: sga2025?.careerHistory?.[0]?.year || null,
          sgaLastSeasonEndYear: sga2025?.careerHistory?.at(-1)?.seasonEndYear || null,
          robertCareerRows: robert2025?.careerHistory?.length || 0,
          jarenCareerRows: jaren2025?.careerHistory?.length || 0,
          jarenFirstSeason: jaren2025?.careerHistory?.[0]?.year || null,
          xavierCareerRows: xavier2025?.careerHistory?.length || 0,
          walterClaytonCareerRows: walterClayton2025?.careerHistory?.length || 0,
          walterClaytonHasCoverage: !!walterClayton2025?.sourceCoverage?.regularSeason,
          eraTop5: era2025.slice(0, 5).map(e => e.name)
        };
        runtimeHistory.eraRankingsDiffer = JSON.stringify(era2003.slice(0, 10).map(e => e.name)) !== JSON.stringify(era2009.slice(0, 10).map(e => e.name));
        runtimeHistory.era2025Differs = JSON.stringify(era2009.slice(0, 10).map(e => e.name)) !== JSON.stringify(era2025.slice(0, 10).map(e => e.name));
      } finally {
        restoreLeagueDataState(originalLeagueState);
        G.startYear = originalStartYear;
        G.year = originalYear;
        G.season = originalSeason;
        G.phase = originalPhase;
      }

      const draftMedia = { calls: 0, storyTitle: '' };
      window.showStoryModal = async (title) => { draftMedia.storyTitle = String(title || ''); };
      startNewGame();
      await sleep(100);
      runtimeHistory.entryOptions = Array.from(document.querySelectorAll('#cStartYear option')).map(option => parseInt(option.value, 10));
      document.getElementById('cName').value = 'Auto Tester';
      document.getElementById('cPos').value = '1';
      await createStep1();
      selectBody('balanced');
      const template = (getTemplatesForPos(G.player.pos) || [])[0];
      selectTemplate(template.id);
      confirmAttrs();
      window.__autoCareerLLMMock = async (task) => {
        if (task === 'draft_media_prediction') {
          draftMedia.calls += 1;
          return {
            headline: 'LLM 选秀前夜：行情分歧扩大',
            summary: '多家媒体只根据事实包评估 Auto Tester 的选秀前景。',
            expertMocks: [
              'ESPN Draft Analytics：预测 Auto Tester 可能落在乐透附近，取决于控卫需求。',
              'The Athletic 选秀专刊：他的组织与投射让部分球队愿意上探顺位。',
              'Bleacher Report：行情仍有波动，不能把模拟顺位视作最终结果。'
            ],
            latestBuzz: '• 球队试训反馈集中在控球、速度和外线投射。\n• 选秀房间仍把最终结果标记为未揭晓。',
            fanTalk: [
              '球迷讨论集中在他能否立即进入轮换。',
              '也有人担心他需要时间适应NBA节奏。'
            ],
            consensus: '预测区间仍有分歧，最终顺位以选秀大会结果为准。',
            projection: '媒体认为他有机会在首轮获得稳定位置。',
            strengths: ['组织阅读', '外线投射', '速度推进'],
            weaknesses: ['对抗稳定性', '防守经验'],
            comparable: '同届热门后卫与侧翼都会影响他的顺位。',
            story: '选秀前夜 · 媒体预测由 LLM 根据事实包生成。'
          };
        }
        throw new Error(`unexpected pre-draft mock task: ${task}`);
      };
      await gotoDraft();
      const draftMediaText = String(document.getElementById('createPage')?.innerText || '');
      draftMedia.hasLlmHeadline = draftMediaText.includes('LLM 选秀前夜：行情分歧扩大');
      draftMedia.hasExpertMock = draftMediaText.includes('ESPN Draft Analytics');
      draftMedia.hasLatestBuzz = draftMediaText.includes('球队试训反馈集中在控球、速度和外线投射') && draftMediaText.includes('选秀房间仍把最终结果标记为未揭晓');
      draftMedia.reportSource = G.draftScoutingReport?.source || '';
      delete window.__autoCareerLLMMock;
      saveAutoCareerLLMConfig({ baseURL: '', model: '', apiKey: '', temperature: 0.75, maxTokens: 1800 }, true);
      localStorage.removeItem('nba_auto_career_llm_config_v1');
      startDraftReveal();
      revealAllPicks();
      startCareer();
      await new Promise((resolve, reject) => {
        const deadline = Date.now() + 12000;
        const tick = () => {
          if (G.phase === 'season' && Array.isArray(G.schedule) && G.schedule.length && document.getElementById('homePage')?.classList.contains('active')) return resolve();
          if (Date.now() > deadline) return reject(new Error('career start timed out'));
          setTimeout(tick, 100);
        };
        tick();
      });
      ensureAutoCareerState();

      const missingBefore = { day: G.dayNum, gameNum: G.gameNum, week: G.autoCareer.weekIndex };
      const missing = await simulateCareerWeek();
      const missingAfter = { day: G.dayNum, gameNum: G.gameNum, week: G.autoCareer.weekIndex };

      renderHome();
      openAutoCareerLLMSettingsModal();
      await sleep(50);
      const homeModalLlm = {
        opened: document.getElementById('modalBg')?.classList.contains('active') && !!document.getElementById('modalAutoLlmBaseURL')
      };
      document.getElementById('modalAutoLlmBaseURL').value = 'https://llm.example.test/v1';
      document.getElementById('modalAutoLlmModel').value = 'test-model-home';
      document.getElementById('modalAutoLlmApiKey').value = 'sk-home-modal';
      document.getElementById('modalAutoLlmTemperature').value = '0.65';
      document.getElementById('modalAutoLlmMaxTokens').value = '1600';
      saveAutoCareerLLMSettings('modalAutoLlm');
      const homeSaved = getAutoCareerLLMConfig();
      homeModalLlm.saved = homeSaved.baseURL === 'https://llm.example.test/v1' && homeSaved.model === 'test-model-home' && homeSaved.apiKey === 'sk-home-modal';
      homeModalLlm.message = String(document.getElementById('modalAutoLlmSettingsResult')?.innerText || '');
      hideModal();

      window.__autoCareerLLMMock = async (task) => {
        if (task === 'retirement') {
          return {
            media: '媒体认为他的生涯有清晰的时代坐标。',
            players: '同代球员尊重他的持续输出和关键节点。',
            fans: '球迷把他的高光和球队记忆绑在一起。',
            critics: '评论者承认他的履历已经进入历史讨论。',
            magazine: '封面标题写着：一段完整生涯的终章。',
            legacyCommittee: '委员会按荣誉、累计和巅峰给出最终席位。',
            finalMessage: '生涯结束，排名写入历史档案。'
          };
        }
        return {
          headline: '自动周报：新的一周完成',
          weeklyStory: '本周根据事实包完成叙事，没有额外编造比分、荣誉或交易。',
          leagueNotes: '联盟新闻来自本周事实包。',
          tradeNotes: '交易动态按交易日志记录。',
          endorsementNotes: '商业动态按代言和签名鞋事实记录。',
          playerArc: '球员成长由潜力、年龄和自动负荷共同驱动。',
          rankNarrative: '历史百大排名已经按 Legacy Score 更新。'
        };
      };

      const badBefore = { day: G.dayNum, gameNum: G.gameNum, week: G.autoCareer.weekIndex };
      const oldMock = window.__autoCareerLLMMock;
      window.__autoCareerLLMMock = async () => '{bad json';
      const bad = await simulateCareerWeek();
      const badAfter = { day: G.dayNum, gameNum: G.gameNum, week: G.autoCareer.weekIndex };
      window.__autoCareerLLMMock = oldMock;

      const week1 = await simulateCareerWeek();
      const week2 = await simulateCareerWeek();
      G.leagueAwards.push({
        season: G.season,
        year: G.year,
        mvp: { name: G.player.name, teamId: G.teamId, team: G.team?.z || '' },
        fmvp: { name: G.player.name, teamId: G.teamId, team: G.team?.z || '' },
        dpoy: null,
        roy: null,
        scoring: null,
        rebound: null,
        assist: null,
        block: null,
        steal: null,
        allNba1: [{ name: G.player.name, teamId: G.teamId, team: G.team?.z || '' }],
        allNba2: [],
        allNba3: [],
        allDefensive: [{ name: G.player.name, teamId: G.teamId, team: G.team?.z || '' }],
        allStar: [{ name: G.player.name, teamId: G.teamId, team: G.team?.z || '' }],
        allStarMvp: null
      });
      G.awards.push({ season: G.season, year: G.year, text: '总冠军', type: 'ring' });
      syncUserAwardRecordForSeason(G.season);
      const honorArchive = buildUserHonorArchiveFromGame();
      renderHome();
      await sleep(300);
      const home = document.getElementById('homePage');
      const homeText = String(home?.innerText || '');
      const actionButton = document.querySelector('.auto-week-button');
      const controls = {
        hasWeekButton: !!actionButton && String(actionButton.innerText || '').includes('模拟下一周'),
        hasEffortSelect: !!document.getElementById('effortSel'),
        hasGameplanBoard: !!document.querySelector('.gameplan-board'),
        hasStrategyChip: !!document.querySelector('.strategy-chip'),
        hasTextarea: !!document.querySelector('textarea')
      };
      navTo('upgrade');
      const upgradeText = String(document.getElementById('upgradePage')?.innerText || '');
      const upgradeManualButtons = Array.from(document.querySelectorAll('#upgradePage button')).map(btn => String(btn.getAttribute('onclick') || '')).filter(x => /doUpgrade|doUpgradeBadge|doUpgradeTendency/.test(x)).length;
      navTo('trade');
      const tradeManual = !!document.getElementById('tradeTarget') || String(document.getElementById('tradePage')?.innerText || '').includes('生成交易筹码');
      navTo('phone');
      const phoneManual = !!document.querySelector('#phonePage textarea') || Array.from(document.querySelectorAll('#phonePage button')).some(btn => /doAcceptTradeOffer|doRejectTradeOffer|reply|compose/i.test(String(btn.getAttribute('onclick') || '')));
      navTo('commerce');
      const commerceManual = Array.from(document.querySelectorAll('#commercePage button')).some(btn => /doCommerceAccept|doCommerceReject|doCommerceBuy|doCommerceAdjust|doCommerceRename|doCommerceUpgrade|doCommerceGen/.test(String(btn.getAttribute('onclick') || '')));
      navTo('history');
      const historyText = String(document.getElementById('historyPage')?.innerText || '');
      const historyLayout = Array.from(document.querySelectorAll('#historyPage .subpage-hero, #historyPage .card')).map((el, index) => {
        const r = el.getBoundingClientRect();
        return { index, className: el.className, top: Math.round(r.top), height: Math.round(r.height), text: String(el.innerText || '').slice(0, 40) };
      });
      const ranking = getHistoricalRankingView();
      const retirement = await generateAutoRetirementSummaryByLLM();
      const finalized = finalizeUserHistoricalCareer(retirement);
      const archiveJson = serializeHistoricalArchive();
      const retiredEntry = G.historicalTop100.retiredUserCareers.find(e => e.name === 'Auto Tester');
      return {
        viewport: { innerWidth: window.innerWidth, mobileQuery: matchMedia('(max-width: 640px)').matches },
        phase: G.phase,
        scheduleGames: G.schedule?.length || 0,
        missing,
        missingBefore,
        missingAfter,
        bad,
        badBefore,
        badAfter,
        week1Ok: !!week1.ok,
        week2Ok: !!week2.ok,
        weeklyReports: G.autoCareer.weeklyReports.length,
        homeText: homeText.slice(0, 800),
        controls,
        upgradeText: upgradeText.slice(0, 300),
        upgradeManualButtons,
        tradeManual,
        phoneManual,
        commerceManual,
        historyText: historyText.slice(0, 1400),
        historyLayout,
        runtimeHistory,
        mainMenuLlm,
        homeModalLlm,
        draftMedia,
        ranking: { userRank: ranking.userRank, score: ranking.liveEntry?.legacyScore, gaps: ranking.gaps },
        finalized: { userRank: finalized.userRank, retiredCount: G.historicalTop100.retiredUserCareers.length },
        honorCounter: honorArchive.counter,
        honorSeasons: honorArchive.seasons,
        retiredHonors: retiredEntry?.honors || {},
        retiredHonorSeasons: retiredEntry?.honorSeasons || [],
        retiredHonorSummary: retiredEntry?.honorSummary || '',
        archiveHasUser: archiveJson.includes('Auto Tester'),
        archiveHasTop100: archiveJson.includes('retiredUserCareers') && archiveJson.includes('entries'),
        archiveHasHonorSeasons: archiveJson.includes('"honorSeasons"') && archiveJson.includes('"honorSource": "game_awards"')
      };
    });

    assert.equal(value.phase, 'season', 'career should enter season phase');
    assert.ok(value.scheduleGames > 0, 'schedule should be generated');
    assert.equal(value.mainMenuLlm.hasForm, true, 'main menu should expose LLM settings before career creation');
    assert.equal(value.mainMenuLlm.saved, true, 'main menu LLM settings should save into auto-career config');
    assert.ok(value.mainMenuLlm.message.includes('LLM 设置已保存'), 'main menu should show LLM save feedback');
    assert.deepEqual(value.runtimeHistory.scriptYears, [2025, 2009, 2003, 1996, 1983], 'runtime should expose only the five playable start years');
    assert.deepEqual(value.runtimeHistory.entryOptions, [2025, 2009, 2003, 1996, 1983], 'create page year dropdown should expose only five playable start years');
    assert.equal(value.draftMedia.calls, 1, 'draft eve media prediction should call the LLM once');
    assert.ok(value.draftMedia.storyTitle.includes('选秀前夜'), 'draft eve story modal should use the media prediction title');
    assert.equal(value.draftMedia.hasLlmHeadline, true, 'draft eve page should render the LLM headline');
    assert.equal(value.draftMedia.hasExpertMock, true, 'draft eve page should render LLM expert mock text');
    assert.equal(value.draftMedia.hasLatestBuzz, true, 'draft eve page should render usable latestBuzz even when LLM returns bullet text');
    assert.equal(value.draftMedia.reportSource, 'llm', 'draft scouting report should be marked as LLM generated');
    assert.equal(value.missing.ok, false, 'missing LLM config should block week simulation');
    assert.equal(value.missing.reason, 'llm_missing', 'missing LLM config should report llm_missing');
    assert.deepEqual(value.missingAfter, value.missingBefore, 'missing LLM config should not advance state');
    assert.equal(value.homeModalLlm.opened, true, 'home LLM settings button should open a modal form');
    assert.equal(value.homeModalLlm.saved, true, 'home modal LLM settings should save into auto-career config');
    assert.ok(value.homeModalLlm.message.includes('LLM 设置已保存'), 'home modal should show LLM save feedback');
    assert.equal(value.bad.ok, false, 'invalid LLM JSON should fail the week');
    assert.deepEqual(value.badAfter, value.badBefore, 'invalid LLM JSON should roll back the week');
    assert.equal(value.week1Ok, true, 'mocked LLM should allow week 1');
    assert.equal(value.week2Ok, true, 'mocked LLM should allow week 2');
    assert.ok(value.weeklyReports >= 2, 'weekly reports should be recorded');
    assert.ok(value.homeText.includes('LLM 周报') || value.homeText.includes('自动周报'), 'home should show LLM weekly report');
    assert.equal(value.controls.hasWeekButton, true, 'home should expose simulate-next-week button');
    assert.equal(value.controls.hasEffortSelect, false, 'home should not expose effort selector');
    assert.equal(value.controls.hasGameplanBoard, false, 'home should not expose manual pregame plan board');
    assert.equal(value.controls.hasStrategyChip, false, 'home should not expose strategy chips');
    assert.equal(value.controls.hasTextarea, false, 'auto UI should not expose textareas');
    assert.ok(value.upgradeText.includes('自动成长档案'), 'upgrade page should be read-only auto development');
    assert.equal(value.upgradeManualButtons, 0, 'upgrade page should not expose manual upgrade buttons');
    assert.equal(value.tradeManual, false, 'trade page should not expose manual request controls');
    assert.equal(value.phoneManual, false, 'phone page should not expose manual reply/trade buttons');
    assert.equal(value.commerceManual, false, 'commerce page should not expose manual commerce buttons');
    assert.ok(value.historyText.includes('历史百大'), 'history page should render');
    assert.ok(value.historyText.includes('时代排名'), 'history page should expose era ranking view');
    assert.ok(value.historyText.includes('荣誉参考'), 'history page should expose honor reference in top100 table');
    assert.ok(value.historyText.includes('数据覆盖'), 'history page should expose source coverage');
    assert.ok(value.historyText.includes('禁止未来荣誉穿越'), 'history page should explain no-future-data era rankings');
    assert.equal(value.runtimeHistory.y2003.shaqHasHistory, true, '2003 Shaq should be hydrated with prior real history at runtime');
    assert.equal(value.runtimeHistory.y2003.shaqFirstSeason, 1992, '2003 Shaq history should start at 1992-93');
    assert.equal(value.runtimeHistory.y2003.shaqFirstSeasonEndYear, 1993, '2003 Shaq first season should end in 1993');
    assert.equal(value.runtimeHistory.y2003.shaqLastSeason, 2002, '2003 Shaq history should stop at 2002-03');
    assert.equal(value.runtimeHistory.y2003.shaqLastSeasonEndYear, 2003, '2003 Shaq last pre-start season should end in 2003');
    assert.equal(value.runtimeHistory.y2003.shaqRings, 3, '2003 Shaq honor counter should use game-aligned rings');
    assert.equal(value.runtimeHistory.y2003.lebronEraEntry, null, '2003 era ranking should not include LeBron future career');
    assert.ok(value.runtimeHistory.y2003.draftNames.some(name => /LeBron James/i.test(name)), '2003 draft class should include LeBron James');
    assert.ok(value.runtimeHistory.y2003.draftNames.some(name => /Carmelo Anthony/i.test(name)), '2003 draft class should include Carmelo Anthony');
    assert.ok(value.runtimeHistory.y2003.draftNames.some(name => /Dwyane Wade/i.test(name)), '2003 draft class should include Dwyane Wade');
    assert.ok(value.runtimeHistory.y2003.draftNames.some(name => /Chris Bosh/i.test(name)), '2003 draft class should include Chris Bosh');
    assert.equal(value.runtimeHistory.y2009.lebronHasHistory, true, '2009 LeBron should be hydrated with prior real history at runtime');
    assert.equal(value.runtimeHistory.y2009.lebronRings, 0, '2009 LeBron honor counter should not include future rings');
    assert.equal(value.runtimeHistory.y2009.lebronMvp, 1, '2009 LeBron honor counter should include only his first MVP');
    assert.equal(value.runtimeHistory.y2009.lebronFmvp, 0, '2009 LeBron honor counter should not include future FMVPs');
    assert.ok(value.runtimeHistory.y2009.lebronHonorSeasons.length >= 1, '2009 LeBron should carry historical award season rows at runtime');
    assert.ok(value.runtimeHistory.y2009.lebronHonorSeason2009?.awards?.join('/').includes('MVP'), '2009 LeBron award season should include MVP');
    assert.ok(value.runtimeHistory.y2009.lebronHonorSeason2009?.awards?.join('/').includes('一阵'), '2009 LeBron award season should include All-NBA first team');
    assert.ok(value.runtimeHistory.y2009.lebronHonorSeason2009?.awards?.join('/').includes('一防'), '2009 LeBron award season should include all-defensive honor');
    assert.ok(value.runtimeHistory.y2009.lebronProfileText.includes('历史荣誉'), 'player detail modal should render historical honors section');
    assert.ok(value.runtimeHistory.y2009.lebronProfileText.includes('MVP') && value.runtimeHistory.y2009.lebronProfileText.includes('一阵'), 'player detail modal should render historical award labels');
    assert.equal(value.runtimeHistory.y2009.lebronProfileText.includes('真实逐赛季数据'), false, 'player detail modal should not show historical data coverage copy');
    assert.equal(value.runtimeHistory.y2009.lebronProfileText.includes('数据覆盖'), false, 'player detail modal should not show source coverage copy');
    assert.ok(value.runtimeHistory.y2009.lebronEraEntry, '2009 era ranking should include LeBron from pre-2009 history');
    assert.ok(value.runtimeHistory.y2009.draftNames.some(name => /Blake Griffin/i.test(name)), '2009 draft class should include Blake Griffin');
    assert.ok(value.runtimeHistory.y2009.draftNames.some(name => /James Harden/i.test(name)), '2009 draft class should include James Harden');
    assert.ok(value.runtimeHistory.y2009.draftNames.some(name => /Stephen Curry/i.test(name)), '2009 draft class should include Stephen Curry');
    assert.equal(value.runtimeHistory.y2009.draftPhotosOk, true, '2009 draft class should render local historical photos');
    assert.ok(value.runtimeHistory.y2025.draftNames.some(name => /Cooper Flagg/i.test(name)), '2025 draft class should include Cooper Flagg');
    assert.equal(value.runtimeHistory.y2025.cooperHasPhoto, true, '2025 Cooper Flagg should render a local historical photo');
    assert.ok(value.runtimeHistory.y2025.sgaCareerRows >= 7, '2025 roster SGA should carry real player-season careerHistory rows');
    assert.ok(value.runtimeHistory.y2025.sgaSeasonIndexRows >= 7, '2025 roster SGA should carry historicalStatsBySeason index');
    assert.equal(value.runtimeHistory.y2025.sgaFirstSeason, 2018, 'SGA historical rows should start at 2018-19');
    assert.equal(value.runtimeHistory.y2025.sgaLastSeasonEndYear, 2025, 'SGA historical rows should include 2024-25');
    assert.ok(value.runtimeHistory.y2025.robertCareerRows >= 7, '2025 Robert Williams should hydrate all merged official season rows');
    assert.ok(value.runtimeHistory.y2025.jarenCareerRows >= 7, '2025 Jaren Jackson Jr. should hydrate official season rows');
    assert.equal(value.runtimeHistory.y2025.jarenFirstSeason, 2018, '2025 Jaren Jackson Jr. should not merge his father historical rows');
    assert.ok(value.runtimeHistory.y2025.xavierCareerRows >= 5, '2025 Xavier Tillman Sr. should hydrate Sr/non-Sr merged season rows');
    assert.equal(value.runtimeHistory.y2025.walterClaytonCareerRows, 0, '2025 Walter Clayton Jr. should not receive fabricated NBA season rows before an NBA regular-season game');
    assert.equal(value.runtimeHistory.y2025.walterClaytonHasCoverage, false, '2025 Walter Clayton Jr. should stay marked as no official NBA regular-season coverage');
    assert.equal(value.runtimeHistory.eraRankingsDiffer, true, '2003 and 2009 era rankings should differ');
    assert.equal(value.runtimeHistory.era2025Differs, true, '2009 and 2025 era rankings should differ');
    assert.ok(value.ranking.userRank >= 1, 'history ranking should include current player');
    assert.equal(value.honorCounter.rings, 1, 'game championship should sync into historical honor counter');
    assert.equal(value.honorCounter.mvp, 1, 'game MVP should sync into historical honor counter');
    assert.equal(value.honorCounter.fmvp, 1, 'game FMVP should sync into historical honor counter');
    assert.equal(value.honorCounter.allNba1, 1, 'game All-NBA first team should sync into historical honor counter');
    assert.equal(value.honorCounter.allDefensive, 1, 'game all-defensive honor should sync into historical honor counter');
    assert.equal(value.honorCounter.allStar, 1, 'game all-star honor should sync into historical honor counter');
    assert.ok(value.honorSeasons.some(s => s.awards.includes('MVP') && s.awards.includes('总冠军')), 'historical honor seasons should preserve season award labels');
    assert.ok(value.finalized.retiredCount >= 1, 'retirement finalization should write retired user career');
    assert.equal(value.retiredHonors.mvp, 1, 'retired historical entry should preserve MVP count');
    assert.equal(value.retiredHonors.rings, 1, 'retired historical entry should preserve ring count');
    assert.ok(value.retiredHonorSeasons.some(s => s.awards.includes('FMVP')), 'retired historical entry should preserve per-season honors');
    assert.ok(value.retiredHonorSummary.includes('MVP') && value.retiredHonorSummary.includes('总冠军'), 'retired historical summary should show game honors');
    assert.equal(value.archiveHasUser, true, 'historical archive export should include retired user');
    assert.equal(value.archiveHasTop100, true, 'historical archive export should include entries and retiredUserCareers');
    assert.equal(value.archiveHasHonorSeasons, true, 'historical archive export should include game honor season snapshots');

    await page.evaluate(() => navTo('home'));
    await sleep(350);
    await page.screenshot({ path: path.join(outputDir, `${outputName}-home.png`), fullPage: true });
    await page.evaluate(() => navTo('history'));
    await sleep(350);
    await page.screenshot({ path: path.join(outputDir, `${outputName}.png`), fullPage: true });
    assert.deepEqual(errors, [], 'browser console should not emit errors');

    fs.writeFileSync(path.join(outputDir, `${outputName}.json`), JSON.stringify(value, null, 2));
    console.log(JSON.stringify(value, null, 2));
  } finally {
    if (browser) await browser.close().catch(() => {});
    if (!server.killed) server.kill();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
