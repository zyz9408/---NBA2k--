'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

const jsFiles = [
  'assets/js/core.js',
  'assets/js/text-pools.js',
  'assets/js/text-pools-extra.js',
  'assets/js/text-pools-long.js',
  'assets/js/sim.js',
  'assets/js/signature-shoe.js',
  'assets/js/ui.js'
];

for (const file of jsFiles) {
  assert.doesNotThrow(() => new Function(read(file)), `${file} should parse as browser JavaScript`);
}

const html = read('nba-career-simulator.html');
[
  'assets/js/core.js',
  'assets/js/text-pools.js',
  'assets/js/text-pools-extra.js',
  'assets/js/text-pools-long.js',
  'assets/js/sim.js',
  'assets/js/signature-shoe.js',
  'assets/js/ui.js'
].forEach(src => assert.ok(html.includes(src), `${src} should be loaded by HTML`));
assert.ok(html.includes('assets/css/app.css?v=20260615auto'), 'HTML should cache-bust auto-career CSS');
assert.ok(html.includes('assets/js/sim.js?v=20260615auto'), 'HTML should cache-bust auto-career sim.js');
assert.ok(html.includes('assets/js/ui.js?v=20260615auto'), 'HTML should cache-bust auto-career ui.js');
assert.ok(html.includes('data-p="history"'), 'HTML should expose the historical top100 page');
assert.ok(html.includes('id="historyPage"'), 'HTML should include the historical page container');

const sim = read('assets/js/sim.js');
[
  'function AutoCareerState',
  'function ensureAutoCareerState',
  'function simulateCareerWeek',
  'function callAutoCareerLLM',
  'function buildOpenAICompatibleUrl',
  'function looksLikeHtmlResponse',
  'function buildLLMHtmlResponseError',
  'function createAutoCareerSnapshot',
  'function restoreAutoCareerSnapshot',
  'function applyAutoWeeklyPlayerDevelopment',
  'function getAutoUserAnnualOvrTarget',
  'function createDefaultHistoricalArchive',
  'function buildUserHonorArchiveFromGame',
  'function syncUserAwardRecordForSeason',
  'function loadHistoricalArchiveObject',
  'function serializeHistoricalArchive',
  'function finalizeUserHistoricalCareer',
  'function generateAutoRetirementSummaryByLLM',
  'function buildDraftMediaFactPacket',
  'function generateDraftScoutingReportFromLLM',
  'function coerceDraftMediaList',
  'function buildAutoCareerLLMResponseContract'
].forEach(fragment => assert.ok(sim.includes(fragment), `sim.js should implement ${fragment}`));
[
  'const HISTORICAL_TOP100_VERSION = 4',
  'const HISTORICAL_LEGACY_FORMULA_VERSION = 5',
  'function getHistoricalArchiveEntriesForYear',
  'eraRankings',
  'generatedRankings',
  'formulaVersion',
  'eraTop10'
].forEach(fragment => assert.ok(sim.includes(fragment), `historical v4 contract missing in sim.js: ${fragment}`));
assert.ok(sim.includes("mode: 'auto'"), 'AutoCareerState should set mode=auto');
assert.ok(sim.includes("POST'"), 'LLM requests should use POST');
assert.ok(sim.includes('/chat/completions'), 'LLM requests should target OpenAI-compatible chat completions');
assert.ok(sim.includes('https://api.openai.com/v1'), 'LLM errors should show the correct OpenAI API root example');
assert.ok(sim.includes('LLM 接口返回 HTML 页面'), 'LLM HTML responses should receive a clear diagnostic');
assert.ok(sim.includes('res.text()'), 'LLM response parsing should inspect raw text before JSON parsing');
assert.ok(sim.includes('LLM 返回内容不是合法 JSON'), 'LLM invalid JSON should receive a clear diagnostic');
assert.ok(sim.includes('response_format: { type: \'json_object\' }'), 'LLM requests should ask for JSON object responses');
assert.ok(sim.includes("err.code = 'llm_missing'"), 'missing LLM config should be an explicit blocking error');
assert.ok(sim.includes('restoreAutoCareerSnapshot(snapshot)'), 'simulateCareerWeek should restore the snapshot on LLM failure');
assert.ok(sim.includes('callAutoCareerLLM(\'weekly_report\''), 'weekly reports should come from LLM');
assert.ok(sim.includes('callAutoCareerLLM(\'retirement\''), 'retirement settlement should come from LLM');
assert.ok(sim.includes('callAutoCareerLLM(\'draft_media_prediction\''), 'draft eve media prediction should come from LLM');
['expertMocks', 'latestBuzz', 'fanTalk', 'consensus'].forEach(fragment => assert.ok(sim.includes(fragment), `draft media LLM contract missing: ${fragment}`));
assert.ok(sim.includes('latestBuzz must be a JSON array'), 'draft media LLM contract should explicitly require usable latestBuzz');
assert.ok(sim.includes('draft_media_prediction missing usable latestBuzz; return latestBuzz as a JSON array'), 'latestBuzz validation should provide an actionable error');
const draftScoutingMain = sim.slice(sim.indexOf('async function generateDraftScoutingReport({'), sim.indexOf('// ============ MATCH SIMULATION ============'));
assert.ok(!draftScoutingMain.includes('fallbackDraftScoutingReport'), 'draft scouting main path should not fallback to local templates');
assert.ok(!/generateRetirementSummaryFromPool\(\)/.test(sim), 'new retirement path should not call template retirement fallback in sim.js');

[
  'potential >= 95',
  'min = 4; max = 6;',
  'potential >= 88',
  'min = 2; max = 4;',
  'potential >= 80',
  'min = 1; max = 2;',
  'age >= 33',
  'applyOvrDeltaToAttrs(G.player.attrs, 1, G.player.potential',
  'applyOvrDeltaToAttrs(G.player.attrs, -1, G.player.potential'
].forEach(fragment => assert.ok(sim.includes(fragment), `auto growth contract missing: ${fragment}`));

[
  'historical_top100.json',
  'retiredUserCareers',
  'legacyScore',
  'peakScore',
  'honorSeasons',
  'honorSummary',
  'honorSource',
  'rank1',
  'rank10',
  'rank25',
  'rank50',
  'rank100'
].forEach(fragment => assert.ok(sim.includes(fragment), `historical top100 contract missing: ${fragment}`));

const ui = read('assets/js/ui.js');
[
  'function renderRegularSeasonAction',
  'doSimulateCareerWeek',
  '模拟下一周',
  'LLM / 历史档案设置',
  'function renderAutoCareerLLMSettingsForm',
  'function openAutoCareerLLMSettingsModal',
  'mainMenuAutoLlm',
  'function renderHistory',
  '游戏荣誉同步',
  'function saveAutoCareerLLMSettings',
  'function exportHistoricalArchiveFromUI',
  'function importHistoricalArchiveFromInput'
].forEach(fragment => assert.ok(ui.includes(fragment), `ui.js should expose ${fragment}`));
['时代排名', '当前档案', '数据覆盖', '荣誉参考'].forEach(fragment => assert.ok(ui.includes(fragment), `history UI should expose ${fragment}`));
assert.ok(ui.includes('真实数据计算'), 'history UI should describe data-derived rankings');
assert.ok(ui.includes('generateAutoRetirementSummaryByLLM'), 'forceRetire should use LLM retirement summary');
assert.ok(ui.includes('finalizeUserHistoricalCareer'), 'forceRetire should write historical archive after LLM settlement');
assert.ok(!ui.includes('switchPage(\'home\')'), 'forceRetire should not call missing switchPage');

const autoRegularSeason = ui.slice(ui.lastIndexOf('function renderRegularSeasonAction'));
[
  'effortSel',
  'renderPregamePlanPicker',
  '开始比赛',
  '推进日程',
  'home-select'
].forEach(fragment => {
  assert.ok(!autoRegularSeason.includes(fragment), `auto action panel should not expose manual control: ${fragment}`);
});

const autoUpgrade = ui.slice(ui.lastIndexOf('function renderUpgrade'), ui.lastIndexOf('function renderTrade'));
['doUpgrade(', 'doUpgradeBadge(', 'doUpgradeTendency(', 'XP:'].forEach(fragment => {
  assert.ok(!autoUpgrade.includes(fragment), `auto development page should not expose manual upgrades: ${fragment}`);
});

const autoTrade = ui.slice(ui.lastIndexOf('function renderTrade'), ui.lastIndexOf('function renderPhone'));
['doRequestTrade', 'tradeTarget', '生成交易筹码'].forEach(fragment => {
  assert.ok(!autoTrade.includes(fragment), `auto trade page should not expose manual trade controls: ${fragment}`);
});

const autoPhone = ui.slice(ui.lastIndexOf('function renderPhone'), ui.lastIndexOf('function renderCommerce'));
['compose', 'renderPhoneComposeTab', 'setPhoneTab', 'choice-card', '<textarea', 'doAcceptTradeOffer', 'doRejectTradeOffer'].forEach(fragment => {
  assert.ok(!autoPhone.includes(fragment), `auto phone page should be read-only: ${fragment}`);
});

const autoCommerce = ui.slice(ui.lastIndexOf('function renderCommerce'), ui.lastIndexOf('function renderHistory'));
[
  'doCommerceAcceptEndorsement',
  'doCommerceRejectEndorsement',
  'doCommerceBuy',
  'doCommerceAdjustAlloc',
  'doCommerceRenameShoe',
  'doCommerceUpgradeShoe',
  'doCommerceGenShoeImage'
].forEach(fragment => {
  assert.ok(!autoCommerce.includes(fragment), `auto commerce page should be read-only: ${fragment}`);
});

const css = read('assets/css/app.css');
[
  '.auto-week-dashboard',
  '.auto-report-grid',
  '.auto-rank-strip',
  '.auto-attr-grid',
  '.home-main-stack'
].forEach(fragment => assert.ok(css.includes(fragment), `CSS should style ${fragment}`));

const core = read('assets/js/core.js');
[
  'function loadHistoricalDb',
  'function hydratePlayerWithHistoricalData',
  'function getHistoricalHonorSeasonsForPlayer',
  'function getHistoricalDraftClass',
  'function buildHistoricalRookieCatalog',
  'function historicalDraftYears',
  'careerBeforeStart',
  'historicalStatsBySeason',
  'awardSeasonsByPlayer',
  '历史荣誉',
  '暂无可验证 NBA 历史荣誉',
  'photoLocal',
  'photoStatus'
].forEach(fragment => assert.ok(core.includes(fragment), `historical DB contract missing in core.js: ${fragment}`));
assert.ok(!core.includes('真实逐赛季数据${rank'), 'player detail modal should not show historical rank/data coverage copy');

[
  'assets/data/historical/manifest.json',
  'assets/data/historical/players.json',
  'assets/data/historical/draft_classes.json',
  'assets/data/historical/awards.json',
  'assets/data/historical/era_top100.json',
  'assets/data/historical/validation_report.json',
  'tools/data/build_historical_db.mjs',
  'tools/data/sources.lock.json'
].forEach(rel => assert.ok(fs.existsSync(path.join(root, rel)), `${rel} should exist`));

const historicalGenerator = read('tools/data/build_historical_db.mjs');
[
  'PROVIDER_CHAIN',
  'nba_api',
  'balldontlie',
  'sportsdataio',
  'local_csv',
  'HEADSHOT_DIR',
  'github_nba_box_scores_2010_2024',
  'loadBoxScoreSeasonRows',
  'validation_report.json',
  'LEGACY_FORMULA_VERSION = 5',
  'version: 4'
].forEach(fragment => assert.ok(historicalGenerator.includes(fragment), `historical generator contract missing: ${fragment}`));
assert.ok(!historicalGenerator.includes('HISTORICAL_SEED_NAMES'), 'historical generator should not use fixed seed ranking names');

const docs = read('LLM_README.md');
assert.ok(docs.includes('全自动生涯模拟'), 'docs should describe the auto-career branch');
assert.ok(docs.includes('POST /chat/completions'), 'docs should document the OpenAI-compatible LLM interface');
assert.ok(docs.includes('historical_top100.json'), 'docs should document the historical archive');

console.log('auto career contract smoke tests passed');
