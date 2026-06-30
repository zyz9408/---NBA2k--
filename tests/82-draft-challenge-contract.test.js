'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

const html = read('nba-82-0-draft.html');
const script = read('assets/js/82-draft-challenge.js');
const css = read('assets/css/82-draft-challenge.css');
const core = read('assets/js/core.js');
const sim = read('assets/js/sim.js');
const historicalStats = read('assets/data/historical_season_stats.json');
const historicalStatsJson = JSON.parse(historicalStats);
const historicalPlayerSeason1984 = JSON.parse(read('assets/data/historical/player_seasons_1984.json'));
const roster03 = read('assets/data/rosters03.csv');
const roster04 = read('assets/data/rosters04.csv');
const roster11 = read('assets/data/rosters11.csv');
const roster13 = read('assets/data/rosters13.csv');
const roster14 = read('assets/data/rosters14.csv');
const roster15 = read('assets/data/rosters15.csv');
const roster17 = read('assets/data/rosters17.csv');
const roster19 = read('assets/data/rosters19.csv');
const rookieReal = read('assets/data/rostersRookiesReal.csv');

assert.doesNotThrow(() => new Function(script), '82-draft-challenge.js should parse as browser JavaScript');

[
  'assets/js/core.js',
  'assets/js/text-pools.js',
  'assets/js/text-pools-extra.js',
  'assets/js/text-pools-long.js',
  'assets/js/sim.js',
  'assets/js/82-draft-challenge.js'
].forEach(src => assert.ok(html.includes(src), `${src} should be loaded by the challenge page`));

assert.ok(!html.includes('assets/js/ui.js'), 'challenge page should not bootstrap the main career UI');
assert.ok(html.includes('id="modalBg"'), 'challenge page should provide modalBg required by core.js');
assert.ok(html.includes('id="candidateGrid"'), 'challenge page should expose candidate grid');
assert.ok(html.includes('id="simulationPanel"'), 'challenge page should expose simulation results panel');
assert.ok(html.includes('当前阶段'), 'challenge page should describe the stage-based draft flow');
assert.ok(html.includes('id="restartButton"'), 'challenge page should expose restart button');
assert.ok(!html.includes('targetTeamSelect'), 'challenge page should not ask for a carrier team');

[
  'const POSITION_SLOTS',
  'yearRerollsLeft: 1',
  'teamRerollsLeft: 1',
  'rerollYearButton',
  'rerollTeamButton',
  "fixedTeamId: rerollType === 'year' ? currentPool?.team?.id : null",
  "fixedSeason: rerollType === 'team' ? currentPool?.season : null",
  'const ROSTER_SEASONS',
  "{ code: 3, year: 2024, statsYear: 2024, label: '2023-2024赛季' }",
  "{ code: 4, year: 2023, statsYear: 2023, label: '2022-2023赛季' }",
  "{ code: 11, year: 2012, statsYear: 2012, label: '2011-2012赛季' }",
  "{ code: 13, year: 2006, statsYear: 2006, label: '2005-2006赛季' }",
  "{ code: 17, year: 1972, statsYear: 1972, label: '1971-1972赛季' }",
  'const FANTASY_TEAM_ID = 31',
  'TEAM_ACTIVE_FROM_YEAR',
  'TEAM_NAME_ACTIVE_FROM_YEAR',
  'isTeamAvailableInSeason',
  'isTeamAvailableInSeason(teamId, season.year, row.team)',
  'isLocalFsPermissionError',
  'ensureFantasyTeamShell',
  'requestDraftDataAccessAndRetry',
  'draftDataPermissionActionsHtml',
  "stage: 'spin'",
  'pendingPlayer',
  'rollTeamYear',
  'positionOptionsForPlayer',
  'choosePosition',
  'prepareCoachChoices',
  'selectedCoach',
  'resetChallenge',
  'getCoachEffectsByCoach',
  'applyCoachTacticalFit',
  'historical_season_stats.json',
  'findHistoricalStatsForPlayer',
  'playerStatNames',
  'player?.nameEn',
  'player?.altName',
  'statLookupYears',
  'sourceStatsYear',
  'ensureHistoricalSeasonStatsForYear',
  'mergeHistoricalSeasonPack',
  'player_seasons_${seasonYear}.json',
  'STOCKS_TRACKED_FROM_YEAR = 1974',
  "UNTRACKED_STAT_TEXT = '未统计'",
  'hasRealCandidateAverages',
  '.filter(player => hasRealCandidateAverages(player))',
  'loadRosterSeason',
  'rowToPlayer',
  'loadLeagueData({ startYear: state.challengeYear, strictRoster: true })',
  'simulateLeagueMatchup',
  'leagueAwardEntryForSeason',
  'getLeagueTeamRecordsArray',
  'getLeaguePlayerSeasonRows',
  'buildSeasonRoundPairs(82, targetTeamId)',
  'window.render_game_to_text',
  'window.advanceTime'
].forEach(fragment => assert.ok(script.includes(fragment), `challenge contract missing: ${fragment}`));

assert.ok(!script.includes('targetTeamSelect'), 'challenge script should not depend on a carrier-team selector');
assert.ok(!script.includes('if (target === 3) return pos === 2 || pos === 4'), 'PF/C players must not be auto-eligible at SF through adjacent-position fallback');
assert.ok(!script.includes('if (target === 4) return pos === 3 || pos === 5'), 'C players must not be auto-eligible at PF unless PF is an explicit listed position');
assert.ok(script.includes('return naturalPositionIds(player).filter(id => !filled.has(String(id)) && playerFitsPosition(player, id));'), 'position options should be limited to explicit primary/secondary positions');
assert.ok(!script.includes('联盟排名</h3>'), 'challenge results should not render full league standings table');
assert.ok(script.includes('玩家球队排名'), 'challenge results should show only the player team ranking summary');
assert.ok(!script.includes("return { pts: '--', reb: '--', ast: '--', stl: '--', blk: '--' }"), 'challenge candidates should never fall back to all-empty stat lines');
assert.ok(!script.includes('estimatePlayerAverages'), 'challenge candidate stats must not be estimated from ratings');
assert.ok(!script.includes("source: 'estimate'"), 'challenge candidate stats must not expose fabricated estimate rows');
assert.ok(!script.includes('year + 1, year - 1'), 'historical stats lookup should not borrow adjacent seasons');
assert.ok(!script.includes('{ code: 19,'), 'rosters19 is an all-time/legend roster and should not be used as a real NBA season');
[
  "names: ['山猫', 'bobcats'], firstYear: 2005",
  "names: ['鹈鹕', 'pelicans'], firstYear: 2014",
  "names: ['雷霆', 'thunder'], firstYear: 2009",
  "names: ['独行侠', 'mavericks'], firstYear: 2019"
].forEach(fragment => assert.ok(script.includes(fragment), `challenge script should guard source team era: ${fragment}`));
assert.ok(roster03.includes('Victor Wembanyama'), 'rosters03 should be treated as the 2023-2024 roster that contains Victor Wembanyama');
assert.ok(!roster04.includes('Victor Wembanyama'), 'rosters04 should be treated as the 2022-2023 roster and must not contain Victor Wembanyama');
assert.ok(roster11.includes('LeBron James') && roster11.includes('热火') && roster11.includes(';27;8;'), 'rosters11 should be treated as the 2011-2012 Heat-era roster');
assert.ok(roster13.includes('Kobe Bryant') && roster13.includes('湖人') && roster13.includes(';27;9;'), 'rosters13 should be treated as the 2005-2006 Lakers roster');
assert.ok(roster14.includes('Yi Jianlian') && roster14.includes('山猫') && roster14.includes('Baron Davis') && roster14.includes('黄蜂'), 'rosters14 includes invalid 2002-2003 Bobcats placeholders but valid New Orleans Hornets rows');
assert.ok(roster15.includes('胡卫东') && roster15.includes('山猫') && roster15.includes('Glen Rice') && roster15.includes('黄蜂'), 'rosters15 includes invalid 1995-1996 Bobcats placeholders but valid Charlotte Hornets rows');
assert.ok(roster17.includes('Kareem Abdul-Jabbar') && roster17.includes('雄鹿') && roster17.includes(';24;2;'), 'rosters17 should be treated as the 1971-1972 Bucks-era roster');
assert.ok(roster17.includes('鹈鹕1') && roster17.includes('超音速') && roster17.includes('勇敢者'), 'rosters17 includes placeholder future teams plus real 1971-1972 SuperSonics/Braves rows');
assert.ok(roster19.includes('Michael Jordan') && roster19.includes('Stephen Curry') && roster19.includes('Larry Bird'), 'rosters19 should be recognized as an all-time/legend mixed roster');
[
  "name: '斯蒂夫-科尔', teamId: FANTASY_TEAM_ID, systemId: 'pace_space'",
  "name: '菲尔-杰克逊', teamId: FANTASY_TEAM_ID, systemId: 'triangle'",
  "name: '迈克-德安东尼', teamId: FANTASY_TEAM_ID, systemId: 'seven_seconds'",
  "name: '查克-戴利', teamId: FANTASY_TEAM_ID, systemId: 'defense'",
  "name: '格雷格-波波维奇', teamId: FANTASY_TEAM_ID, systemId: 'balance'"
].forEach(fragment => assert.ok(script.includes(fragment), `82 special coach contract missing: ${fragment}`));
assert.ok(sim.includes('estimateLeagueThreePctForRow'), 'league row simulation should estimate realistic three-point percentage');
assert.ok(sim.includes('leagueThreeAttemptProfileForRow'), 'league row simulation should model three-point attempt volume separately from percentage');
assert.ok(sim.includes('fitThreeMakesToAttempts'), 'league row simulation should fit made threes against final 3PA and target 3P%');
assert.ok(sim.includes('function buildPlayerShotProfileForSim'), 'league row simulation should build an attribute/tendency/coach shot profile before scoring');
assert.ok(sim.includes('function buildTeamShotPlansForSim'), 'league row simulation should allocate team FGA/3PA/FTA before player points');
assert.ok(sim.includes('getPlayerShotTendenciesForSim'), 'league row simulation should read player tendencies for shot distribution');
assert.ok(sim.includes('source?.att ?? rotationPlayer?.att'), 'league row simulation should use ATT in shot distribution');
assert.ok(sim.includes('source?.coachFit?.score'), '82 fantasy coach fit should affect player shot distribution');
assert.ok(sim.includes('function realThreeAttemptsPerGameForSim'), 'league row simulation should read real 3PA volume when source-season stats provide it');
assert.ok(sim.includes('stats.TPA ?? stats.tpa'), 'real source-season 3PA should be part of the three-point attempt cap');
assert.ok(sim.includes('coachSystemShotStyleForSim'), 'league row simulation should map coach systemId to shooting style');
assert.ok(sim.includes('pace_space: { usage: 1.03, three: 1.20'), 'pace-space coach style should raise suitable three-point volume');
assert.ok(sim.includes('seven_seconds: { usage: 1.07, three: 1.14'), 'seven-seconds coach style should raise pace and perimeter volume');
assert.ok(sim.includes('defense: { usage: 0.94, three: 0.92'), 'defense coach style should not use the same shot profile as perimeter systems');
assert.ok(sim.includes('triangle: { usage: 0.98, three: 0.94'), 'triangle coach style should keep a distinct balanced passing profile');
assert.ok(sim.includes('shotPlan'), 'buildPlayerGameRow should accept a shotPlan for FGA-first box scores');
assert.ok(sim.includes('reconcileTeamRowsToTargetPoints'), 'team box scores should reconcile player points to the simulated team score');
assert.ok(sim.includes('lowVolumeBig'), 'league row simulation should keep non-shooting bigs at low three-point volume');
assert.ok(sim.includes('sourceYear > 0 && sourceYear < 1980'), 'league row simulation should not assign threes before the NBA three-point era');
assert.ok(sim.includes('frontcourtLimited'), 'league row simulation should cap frontcourt three-point volume by era and tendency');
assert.ok(sim.includes('stretchBig'), 'league row simulation should not position-cap shooting bigs with strong three-point attributes or tendency');
assert.ok(!sim.includes('const stretchBig = pos >= 4 && (shotExt >= 70 || extTendency >= 74)'), 'frontcourt players should not become stretch bigs from tendency alone');
assert.ok(sim.includes('__realThreePct'), 'league row simulation should use exact historical 3P% when a selected source season provides it');
assert.ok(script.includes('sourceRealStats'), 'draft challenge should pass selected source-season shooting percentages into simulation');
assert.ok(script.includes('TPA: row.tpa'), 'draft challenge should pass selected source-season 3PA volume into simulation');
assert.ok(script.includes('injectRealRookiesForChallengeSeason'), 'draft challenge should restore real current-draft rookies into the simulated 2025 league');
assert.ok(script.includes('loadChallengeLeagueData'), 'draft challenge should load a playable league fallback for challenge years outside the core strict roster map');
assert.ok(script.includes('hasRealRookieAttributeSource'), 'draft challenge should prefer real rookie attribute rows before historical seed fallback');
assert.ok(script.includes('sourceRookieAttrs'), 'draft challenge injected rookies should record the attribute source used for award candidates');
assert.ok(script.includes('realRookieAttributes'), 'draft challenge should preserve real rookie attribute markers on injected rookies');
assert.ok(script.includes('getHistoricalDraftClass(year)'), 'draft challenge should inject historical real draft classes when the loaded roster has no current-year rookies');
assert.ok(script.includes('catalogRookies.filter(player => parseNum(player.draftTeamId || player.originalTeamId'), 'draft challenge should distinguish roster-extracted rookies from historical catalog fallback rookies');
assert.ok(script.includes('fromHistoricalFallback'), 'draft challenge should allow rookie-version historical players even when veteran versions already exist in the loaded league');
assert.ok(core.includes('draftTeamId: p.teamId'), 'rookie catalog extraction should retain original team for later 2025 roster injection');
assert.ok(core.includes("source: p.source || 'roster_extracted_rookie'"), 'roster-extracted current rookies should be marked as real attribute rookies');
assert.ok(core.includes("source: 'real_rookie_csv'"), 'core league load should build rookie catalog players from the real rookie attribute CSV');
assert.ok(core.includes('realRookieCatalogFromRows'), 'core league load should merge the real rookie attribute catalog before historical seed rookies');
assert.ok(core.includes('[...extractedRookies, ...realRookies, ...historicalRookies]'), 'real rookie attribute rows should win de-duplication before historical seed rookies');
assert.ok(rookieReal.includes('Ben Simmons') && rookieReal.includes(';2016;201601;'), 'real rookie table should include 2016 first-pick attributes');
assert.ok(rookieReal.includes('Derrick Rose') && rookieReal.includes(';2008;200801;'), 'real rookie table should include 2008 first-pick attributes');
assert.ok(rookieReal.includes('Allen Iverson') && rookieReal.includes(';1996;199601;'), 'real rookie table should include 1996 first-pick attributes');
assert.ok(sim.includes('yearsLeague: parseNum(simPlayer?.yearsLeague'), 'league game rows should preserve player experience for award eligibility');
assert.ok(sim.includes('yearsLeague: parseNum(ps.yearsLeague, -1)'), 'league season row exports should preserve player experience for awards');
assert.ok(sim.includes('parseNum(r.yearsLeague, -1) === 0'), 'ROY filtering should not treat missing experience as rookie eligibility');
assert.ok(script.includes('isThreeBlackHole'), 'challenge result tags should use a volume-aware three-point black-hole rule');
assert.ok(script.includes('tpaPerGame'), 'challenge result table should expose three-point attempt volume');
assert.ok(script.includes('twoPaPerGame'), 'challenge result table should expose two-point attempt volume');
assert.ok(script.includes('<th>FGA</th><th>2PA</th><th>3PA</th>'), 'challenge result table should show shooting attempt structure');
assert.ok(script.includes("slot === 'PF' || slot === 'C' ? 4 : 3"), 'frontcourt three-point black-hole tag should require higher volume');
assert.ok(!script.includes('Very few 3PA per game - use attribute-based estimate'), 'challenge results must not replace low-volume 3P% with an attribute estimate');
assert.ok(!script.includes('tpFloor'), 'challenge results must not floor simulated 3P% from attributes');
assert.ok(historicalStats.includes('"Jayson Tatum"'), 'historical season stats should include English-name lookup keys');
assert.ok(historicalStats.includes('"Victor Wembanyama"'), 'historical season stats should include current era players');
assert.ok(!historicalStatsJson['2023']?.['Victor Wembanyama'], 'Victor Wembanyama should not have NBA regular-season stats in 2022-2023');
assert.ok(historicalStatsJson['2024']?.['Victor Wembanyama'], 'Victor Wembanyama NBA regular-season stats should start in 2023-2024');
assert.equal(historicalStatsJson['2012']?.['LeBron James']?.PTS, 27.1, '2011-2012 LeBron James stats should use the 2012 season row');
assert.equal(historicalStatsJson['2006']?.['Kobe Bryant']?.PTS, 35.4, '2005-2006 Kobe Bryant stats should use the 2006 season row');
assert.equal(historicalStatsJson['1972']?.['Kareem Abdul-Jabbar']?.PTS, 34.8, '1971-1972 Kareem Abdul-Jabbar stats should use the 1972 season row');
assert.equal(historicalStatsJson['1972']?.['Walt Frazier']?.PTS, 23.2, '1971-1972 Walt Frazier points should use the exact real season row');
assert.equal(historicalStatsJson['1972']?.['Walt Frazier']?.REB, 6.7, '1971-1972 Walt Frazier rebounds should use the exact real season row');
assert.equal(historicalStatsJson['1972']?.['Walt Frazier']?.AST, 5.8, '1971-1972 Walt Frazier assists should use the exact real season row');
assert.ok((historicalPlayerSeason1984.rows || historicalPlayerSeason1984).some(row => row.name === 'Isaiah Thomas' && row.seasonEndYear === 1984 && row.ppg === 21.3), 'full 1984 historical season pack should provide missing exact Isaiah Thomas stats');

[
  'candidate-grid',
  'candidate-grid-inner',
  'source-strip',
  'court-board',
  'position-choice',
  'coach-grid',
  'coach-card',
  'impact-list',
  'team-rank-summary',
  'permission-actions',
  'lineup-list',
  'results-grid',
  '@media (max-width: 760px)',
  'team-logo-chip',
  'player-photo'
].forEach(fragment => assert.ok(css.includes(fragment), `challenge CSS missing: ${fragment}`));
