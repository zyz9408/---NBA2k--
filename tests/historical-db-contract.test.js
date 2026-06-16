'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const readJson = rel => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
const readText = rel => fs.readFileSync(path.join(root, rel), 'utf8');

function parseCsv(text) {
  const lines = String(text || '').split(/\r?\n/).filter(line => line.trim());
  const headers = lines.shift().split(';').map(h => h.replace(/^\uFEFF/, '').trim());
  return lines.map(line => {
    const cells = line.split(';');
    const row = {};
    headers.forEach((h, i) => { row[h] = String(cells[i] || '').trim(); });
    return row;
  });
}

function parseNum(value, fallback = 0) {
  const n = Number(String(value ?? '').replace(/,/g, '').trim());
  return Number.isFinite(n) ? n : fallback;
}

function rowsFor(realId, type) {
  const dir = path.join(root, 'assets/data/historical');
  return fs.readdirSync(dir)
    .filter(name => /^player_seasons_\d+\.json$/.test(name))
    .flatMap(name => readJson(`assets/data/historical/${name}`).rows)
    .filter(row => row.realId === realId && row.type === type)
    .sort((a, b) => parseNum(a.season) - parseNum(b.season));
}

function assertLocalPhoto(player, label) {
  assert.ok(player?.photoLocal, `${label} should include photoLocal`);
  assert.ok(!/IMG0000\.png$/i.test(player.photoLocal), `${label} should not use IMG0000`);
  assert.ok(fs.existsSync(path.join(root, player.photoLocal)), `${label} photo file should exist`);
}

const manifest = readJson('assets/data/historical/manifest.json');
assert.equal(manifest.version, 2, 'historical manifest should be v2');
assert.deepEqual(manifest.supportedStartYears, [1983, 1996, 2003, 2009, 2025], 'manifest should expose only five playable start years');
assert.deepEqual(manifest.dataValidationYears, [2005], 'manifest should retain 2005 as a data validation year');
assert.ok(manifest.files.players && manifest.files.draftClasses && manifest.files.eraTop100 && manifest.files.validationReport, 'manifest should list core historical files');
assert.ok(manifest.sourceCoverage.providerChain.some(p => p.id === 'nba_api'), 'manifest should document NBA API provider');
assert.ok(manifest.sourceCoverage.providerChain.some(p => p.id === 'balldontlie'), 'manifest should document balldontlie provider');
assert.ok(manifest.sourceCoverage.providerChain.some(p => p.id === 'sportsdataio'), 'manifest should document SportsDataIO provider');
assert.ok(manifest.sourceCoverage.providerChain.some(p => p.id === 'local_csv' && p.used), 'manifest should document local CSV fallback usage');

const validation = readJson('assets/data/historical/validation_report.json');
assert.equal(validation.errors.length, 0, 'historical validation should have no blocking errors');
assert.equal(validation.checks.targetDraftPhotos, true, 'target draft classes should have local photos');
assert.equal(validation.checks.noPlayerSeasonTeamIdZero, true, 'player-season rows should never write teamId=0');
assert.equal(validation.checks.iverson2005CareerBeforeStart, true, 'Iverson 2005 history check should pass');
assert.equal(validation.checks.noSeedEraTop100, true, 'era top100 should not contain seed entries');
assert.equal(validation.checks.matchedOfficialRowsFullyWritten, true, 'matched official NBA rows should be fully written to season files');
assert.equal(validation.checks.rosterPlayersWithPriorSeasonRows, true, 'CBA/fictional/no-NBA-regular-season players should not fail history coverage');
assert.ok(validation.checks.allowedNoNbaDataPlayerCount < 600, 'allowed no-NBA-data roster players should stay bounded and auditable');

const players = readJson('assets/data/historical/players.json').players;
const shaq = players.find(p => p.realId === 'nba:shaq-oneal');
const lebron = players.find(p => p.realId === 'nba:lebron-james');
const iverson = players.find(p => p.realId === 'nba:allen-iverson');
assert.ok(shaq, 'players.json should contain Shaquille ONeal canonical id');
assert.ok(lebron, 'players.json should contain LeBron James canonical id');
assert.ok(iverson, 'players.json should contain Allen Iverson canonical id');
assertLocalPhoto(shaq, 'Shaq');
assertLocalPhoto(lebron, 'LeBron');
assertLocalPhoto(iverson, 'Iverson');

const manifestSources = manifest.sourceCoverage.regularSeasonSources || [];
assert.ok(manifest.sourceCoverage.regularSeasonMatchedPlayers >= 2000, 'historical DB should match player-season rows for most roster players');
assert.ok(manifestSources.some(s => s.id === 'github_kaggle_seasons_stats' && s.available), 'historical DB should use the Kaggle/GitHub Seasons_Stats CSV');
assert.ok(manifestSources.some(s => s.id === 'github_nba_box_scores_2010_2024' && s.available), 'historical DB should use 2010-2024 player box score aggregation');
assert.ok(manifestSources.some(s => s.id === 'github_2025_per_game' && s.available), 'historical DB should use 2024-25 per-game CSV');

const shaqRegular = rowsFor('nba:shaq-oneal', 'regular');
const shaqPlayoffs = rowsFor('nba:shaq-oneal', 'playoffs');
[1992, 1993, 1994, 1995, 1996, 1997, 1998, 1999, 2000, 2001, 2002].forEach(year => {
  assert.ok(shaqRegular.some(row => row.season === year), `2003 Shaq should include ${year}-${String(year + 1).slice(-2)} regular-season history`);
});
assert.ok(shaqPlayoffs.some(r => r.season === 2003 && r.ppg === 27), 'Shaq should have 2003 playoff history');

const iversonRegular = rowsFor('nba:allen-iverson', 'regular');
[1996, 1997, 1998, 1999, 2000, 2001, 2002, 2003, 2004].forEach(year => {
  assert.ok(iversonRegular.some(row => row.season === year), `2005 Iverson should include ${year}-${String(year + 1).slice(-2)} regular-season history`);
});

function rowsForName(name) {
  return fs.readdirSync(path.join(root, 'assets/data/historical'))
    .filter(file => /^player_seasons_\d+\.json$/.test(file))
    .flatMap(file => readJson(`assets/data/historical/${file}`).rows)
    .filter(row => row.type === 'regular' && row.displayName === name)
    .sort((a, b) => parseNum(a.season) - parseNum(b.season));
}

const allRegularRows = fs.readdirSync(path.join(root, 'assets/data/historical'))
  .filter(file => /^player_seasons_\d+\.json$/.test(file))
  .flatMap(file => readJson(`assets/data/historical/${file}`).rows)
  .filter(row => row.type === 'regular');
assert.equal(allRegularRows.some(row => parseNum(row.teamId, 0) <= 0), false, 'all regular season rows should resolve to a real game team id');

const bobMcAdoo1977 = allRegularRows.find(row => row.displayName === 'Bob McAdoo' && row.season === 1976);
assert.ok(bobMcAdoo1977, 'Bob McAdoo 1976-77 traded season should exist');
assert.ok(parseNum(bobMcAdoo1977.teamId, 0) > 0, 'TOT/traded seasons should resolve a primary teamId');
assert.equal(bobMcAdoo1977.teamAggregate, 'TOT', 'TOT/traded seasons should preserve aggregate marker');
assert.ok(Array.isArray(bobMcAdoo1977.teamSpan) && bobMcAdoo1977.teamSpan.length >= 2, 'TOT/traded seasons should keep teamSpan');

const sgaRows = rowsForName('Shai Gilgeous-Alexander');
assert.ok(sgaRows.length >= 7, '2025 SGA should have real season rows from 2018-19 through 2024-25');
assert.equal(sgaRows[0].season, 2018, 'SGA history should begin with 2018-19');
assert.equal(sgaRows.at(-1).seasonEndYear, 2025, 'SGA history should include 2024-25');
assert.ok(sgaRows.some(row => row.source === 'github_nba_box_scores_2010_2024'), 'SGA should use aggregated 2010-2024 box score rows');
assert.ok(sgaRows.some(row => row.source === 'github_2025_per_game'), 'SGA should use 2024-25 per-game row');

const lukaRows = rowsForName('Luka Dončić');
assert.ok(lukaRows.length >= 7, '2025 Luka should have real season rows through 2024-25');
const antRows = rowsForName('Anthony Edwards');
assert.ok(antRows.length >= 5, '2025 Anthony Edwards should have real season rows through 2024-25');
const robertRows = rowsForName('Robert Williams');
assert.ok(robertRows.length >= 7, '2025 Robert Williams should merge Robert Williams/Robert Williams III history rows');
const reggieRows = rowsForName('Reggie Bullock Jr.');
assert.ok(reggieRows.length >= 10, '2025 Reggie Bullock Jr. should merge Jr/non-Jr history rows instead of one source year');
const xavierRows = rowsForName('Xavier Tillman Sr.');
assert.ok(xavierRows.length >= 5, '2025 Xavier Tillman Sr. should merge Sr/non-Sr history rows');
const juanchoRows = rowsForName('Juan Hernangómez');
assert.ok(juanchoRows.length >= 7, 'Juan Hernangómez should merge Juan/Juancho history rows');

const awardsFile = readJson('assets/data/historical/awards.json');
const awards = awardsFile.playerAwards;
const awardSeasons = awardsFile.awardSeasons;
assert.equal(awardsFile.version, 2, 'awards.json should be v2');
assert.ok(awards && Object.keys(awards).length >= 100, 'awards.json should include broad historical player award coverage');
assert.ok(awardSeasons && Object.keys(awardSeasons).length >= 100, 'awards.json should include awardSeasons');
function latestAwards(realId, asOfYear) {
  const byYear = awards[realId] || {};
  const years = Object.keys(byYear).map(Number).filter(year => year <= asOfYear).sort((a, b) => a - b);
  return years.length ? byYear[String(years.at(-1))] : {};
}
function realIdByName(name) {
  const player = players.find(p => new RegExp(name, 'i').test(p.displayName || p.name || p.nameEn || ''));
  assert.ok(player, `players.json should include ${name}`);
  return player.realId;
}
const shaq2003 = awards['nba:shaq-oneal']['2003'];
const rosterShaq = parseCsv(readText('assets/data/rosters14.csv')).find(row => /Shaquille/i.test(row.nameBirth));
assert.ok(rosterShaq, 'rosters14 should include Shaq');
assert.equal(shaq2003.rings, parseNum(rosterShaq.rings), 'Shaq 2003 rings should align with roster honors');
assert.equal(shaq2003.mvp, parseNum(rosterShaq.mvps), 'Shaq 2003 MVP should align with roster honors');
assert.equal(shaq2003.fmvp, parseNum(rosterShaq.fmvps), 'Shaq 2003 FMVP should align with roster honors');
assert.equal(shaq2003.allNba1, parseNum(rosterShaq.allTeam1), 'Shaq 2003 All-NBA first team should align with roster honors');
assert.ok(!awards['nba:lebron-james']['2003'], '2003 LeBron should not have future awards');
const lebron2009Awards = latestAwards('nba:lebron-james', 2009);
assert.equal(lebron2009Awards.rings, 0, '2009 LeBron should have no future rings');
assert.equal(lebron2009Awards.mvp, 1, '2009 LeBron should have one MVP');
assert.equal(lebron2009Awards.fmvp, 0, '2009 LeBron should have no future FMVP');
const lebron2009SeasonAwards = (awardSeasons['nba:lebron-james'] || []).find(row => parseNum(row.seasonEndYear, 0) === 2009);
assert.ok(lebron2009SeasonAwards, '2009 LeBron should have an awardSeasons row');
['MVP', '一阵', '一防', '全明星'].forEach(label => {
  assert.ok(lebron2009SeasonAwards.awards.join('/').includes(label), `2009 LeBron awardSeasons should include ${label}`);
});
const kobe2009Awards = latestAwards(realIdByName('Kobe Bryant'), 2009);
assert.ok(kobe2009Awards.rings >= 4, '2009 Kobe should include four titles');
assert.ok(kobe2009Awards.fmvp >= 1, '2009 Kobe should include 2009 FMVP');
const jordan2009Awards = latestAwards(realIdByName('Michael Jordan'), 2009);
assert.equal(jordan2009Awards.rings, 6, '2009 Jordan should include six titles');
assert.equal(jordan2009Awards.mvp, 5, '2009 Jordan should include five MVPs');
assert.equal(jordan2009Awards.fmvp, 6, '2009 Jordan should include six FMVPs');

const draftClasses = readJson('assets/data/historical/draft_classes.json').classes;
[1983, 1996, 2003, 2009, 2025].forEach(year => {
  assert.ok(Array.isArray(draftClasses[String(year)]) && draftClasses[String(year)].length > 0, `${year} draft class should exist`);
  draftClasses[String(year)].forEach(player => assertLocalPhoto(player, `${year} ${player.name}`));
});
const draft2003 = draftClasses['2003'].map(p => p.name);
['LeBron James', 'Carmelo Anthony', 'Dwyane Wade', 'Chris Bosh'].forEach(name => {
  assert.ok(draft2003.includes(name), `2003 draft class should include ${name}`);
});
const draft2009 = draftClasses['2009'].map(p => p.name);
['Blake Griffin', 'James Harden', 'Stephen Curry'].forEach(name => {
  assert.ok(draft2009.includes(name), `2009 draft class should include ${name}`);
});
const cooper = draftClasses['2025'].find(p => /Cooper Flagg/i.test(p.name));
assert.ok(cooper, '2025 draft class should include Cooper Flagg');
assertLocalPhoto(cooper, 'Cooper Flagg');

const era = readJson('assets/data/historical/era_top100.json').rankings;
const eraFile = readJson('assets/data/historical/era_top100.json');
assert.equal(eraFile.formulaVersion, 5, 'era rankings should use legacy formula v5');
assert.ok(era['2003'] && era['2009'] && era['2025'], 'era rankings should include five-era years');
assert.equal(Object.values(era).flat().some(e => e.source === 'seed'), false, 'era rankings should not contain seed entries');
assert.notDeepEqual(era['2003'].slice(0, 10).map(e => e.name), era['2009'].slice(0, 10).map(e => e.name), '2003 and 2009 era top tens should differ');
assert.ok(era['2003'].some(e => /Shaquille/i.test(e.name)), '2003 era ranking should include Shaq');
assert.equal(era['2003'].some(e => /LeBron/i.test(e.name)), false, '2003 era ranking should not include future LeBron career');
const lebronEra2009 = era['2009'].find(e => /LeBron/i.test(e.name));
assert.ok(lebronEra2009, '2009 LeBron should be ranked from pre-2009 real history');
assert.equal(lebronEra2009.honors.rings, 0, '2009 LeBron should not have future rings');
assert.equal(lebronEra2009.honors.mvp, 1, '2009 LeBron should only have his first MVP by 2009');
const iversonEra2009 = era['2009'].find(e => /Allen Iverson/i.test(e.name));
const shaqEra2009 = era['2009'].find(e => /Shaquille/i.test(e.name));
const duncanEra2009 = era['2009'].find(e => /Tim Duncan/i.test(e.name));
const kobeEra2009 = era['2009'].find(e => /Kobe Bryant/i.test(e.name));
const jordanEra2009 = era['2009'].find(e => /Michael Jordan/i.test(e.name));
const magicEra2009 = era['2009'].find(e => /Magic Johnson/i.test(e.name));
assert.ok(iversonEra2009 && shaqEra2009 && duncanEra2009 && kobeEra2009 && jordanEra2009 && magicEra2009, '2009 era ranking should include key legacy players');
assert.notEqual(era['2009'][0].name, 'Allen Iverson', '2009 Iverson should never rank first without rings/FMVPs');
assert.ok(iversonEra2009.rank > 12, '2009 Iverson should not rank near the top tier without rings/FMVPs');
assert.ok(lebronEra2009.rank > 20, '2009 LeBron should not be over-ranked before championships and later MVPs');
assert.ok(shaqEra2009.rank < iversonEra2009.rank, '2009 Shaq should rank above Iverson on rings/FMVP/All-NBA resume');
assert.ok(duncanEra2009.rank < lebronEra2009.rank, '2009 Duncan should rank above young LeBron on championship resume');
assert.ok(kobeEra2009.rank < lebronEra2009.rank, '2009 Kobe should rank above young LeBron on championship resume');
assert.equal(jordanEra2009.honors.rings, 6, '2009 Jordan should use complete post-retirement honor resume');
assert.equal(jordanEra2009.honors.fmvp, 6, '2009 Jordan should use complete Finals MVP resume');
assert.ok(magicEra2009.rank <= 10, '2009 Magic Johnson should be restored by real honor overrides');
assert.ok(jordanEra2009.honorSummary.includes('总冠军') && jordanEra2009.honorSummary.includes('MVP'), 'era ranking entries should expose honorSummary for UI reference');

const archive = readJson('historical_top100.json');
assert.equal(archive.version, 4, 'root historical_top100.json should be v4');
assert.equal(archive.generatedRankings?.formulaVersion, 5, 'root historical_top100 should persist the legacy formula version');
assert.ok(archive.eraRankings?.['2003'] && archive.eraRankings?.['2009'] && archive.eraRankings?.['2025'], 'historical archive should persist era rankings for second runs');
assert.equal(Object.values(archive.eraRankings).flat().some(e => e.source === 'seed'), false, 'historical archive should not persist seed entries');

console.log('historical DB contract tests passed');
