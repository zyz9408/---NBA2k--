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
  'rerollsLeft: 1',
  'const ROSTER_SEASONS',
  'const FANTASY_TEAM_ID = 31',
  'TEAM_ACTIVE_FROM_YEAR',
  'isTeamAvailableInSeason',
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
  'loadRosterSeason',
  'rowToPlayer',
  'loadLeagueData({ startYear: 2025, strictRoster: true })',
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
assert.ok(sim.includes('estimateLeagueThreePctForRow'), 'league row simulation should estimate realistic three-point percentage');
assert.ok(sim.includes('Math.ceil(tpm / targetThreePct)'), 'league row simulation should backfill 3PA from target 3P%');

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
