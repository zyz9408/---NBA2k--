'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

const html = read('nba-82-0-draft.html');
const script = read('assets/js/82-draft-challenge.js');
const css = read('assets/css/82-draft-challenge.css');
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
assert.ok(sim.includes('estimateLeagueThreePctForRow'), 'league row simulation should estimate realistic three-point percentage');
assert.ok(sim.includes('leagueThreeAttemptProfileForRow'), 'league row simulation should model three-point attempt volume separately from percentage');
assert.ok(sim.includes('Math.ceil(tpm / targetThreePct)'), 'league row simulation should backfill 3PA from target 3P%');
assert.ok(sim.includes('lowVolumeBig'), 'league row simulation should keep non-shooting bigs at low three-point volume');
assert.ok(sim.includes('yearsLeague: parseNum(simPlayer?.yearsLeague'), 'league game rows should preserve player experience for award eligibility');
assert.ok(sim.includes('yearsLeague: parseNum(ps.yearsLeague, -1)'), 'league season row exports should preserve player experience for awards');
assert.ok(sim.includes('parseNum(r.yearsLeague, -1) === 0'), 'ROY filtering should not treat missing experience as rookie eligibility');
assert.ok(script.includes('isThreeBlackHole'), 'challenge result tags should use a volume-aware three-point black-hole rule');
assert.ok(script.includes('tpaPerGame'), 'challenge result table should expose three-point attempt volume');
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
