(function () {
  let historicalSeasonStats = null;
  let historicalStatsPromise = null;
  const historicalSeasonPackPromises = new Map();
  const STOCKS_TRACKED_FROM_YEAR = 1974;
  const UNTRACKED_STAT_TEXT = '未统计';
  const POSITION_SLOTS = [
    { id: 1, short: 'PG', name: '控球后卫' },
    { id: 2, short: 'SG', name: '得分后卫' },
    { id: 3, short: 'SF', name: '小前锋' },
    { id: 4, short: 'PF', name: '大前锋' },
    { id: 5, short: 'C', name: '中锋' }
  ];

  const ROSTER_SEASONS = [
    { code: 1, year: 2025, statsYear: 2025, label: '2025-2026名单' },
    { code: 2, year: 2025, statsYear: 2025, label: '2024-2025赛季' },
    { code: 3, year: 2024, statsYear: 2024, label: '2023-2024赛季' },
    { code: 4, year: 2023, statsYear: 2023, label: '2022-2023赛季' },
    { code: 5, year: 2022, statsYear: 2022, label: '2021-2022赛季' },
    { code: 6, year: 2021, statsYear: 2021, label: '2020-2021赛季' },
    { code: 7, year: 2020, statsYear: 2020, label: '2019-2020赛季' },
    { code: 8, year: 2019, statsYear: 2019, label: '2018-2019赛季' },
    { code: 9, year: 2018, statsYear: 2018, label: '2017-2018赛季' },
    { code: 10, year: 2016, statsYear: 2016, label: '2015-2016赛季' },
    { code: 11, year: 2012, statsYear: 2012, label: '2011-2012赛季' },
    { code: 12, year: 2009, statsYear: 2009, label: '2008-2009赛季' },
    { code: 13, year: 2006, statsYear: 2006, label: '2005-2006赛季' },
    { code: 14, year: 2003, statsYear: 2003, label: '2002-2003赛季' },
    { code: 15, year: 1996, statsYear: 1996, label: '1995-1996赛季' },
    { code: 16, year: 1984, statsYear: 1984, label: '1983-1984赛季' },
    { code: 17, year: 1972, statsYear: 1972, label: '1971-1972赛季' }
  ];

  const FANTASY_TEAM_ID = 31;
  const FANTASY_TEAM_META = {
    id: FANTASY_TEAM_ID,
    n: 'Challenge',
    z: '82-0挑战队',
    a: '820',
    c: 'East',
    cl: '#167a86',
    r: 75
  };

  const TEAM_ACTIVE_FROM_YEAR = {
    1: 1947, 2: 1977, 3: 1947, 4: 1947, 5: 1996,
    6: 1967, 7: 1971, 8: 1949, 9: 1977, 10: 1969,
    11: 1950, 12: 1989, 13: 1989, 14: 1990, 15: 1962,
    16: 1977, 17: 1990, 18: 1968, 19: 1971, 20: 1975,
    21: 1947, 22: 1971, 23: 1949, 24: 1969, 25: 1949,
    26: 1981, 27: 1968, 28: 1996, 29: 2003, 30: 1977
  };

  const TEAM_NAME_ACTIVE_FROM_YEAR = [
    { names: ['篮网', 'nets'], firstYear: 1977 },
    { names: ['步行者', 'pacers'], firstYear: 1977 },
    { names: ['掘金', 'nuggets'], firstYear: 1977 },
    { names: ['马刺', 'spurs'], firstYear: 1977 },
    { names: ['快船', 'clippers'], firstYear: 1979 },
    { names: ['小牛'], firstYear: 1981 },
    { names: ['黄蜂', 'hornets'], firstYear: 1989 },
    { names: ['热火', 'heat'], firstYear: 1989 },
    { names: ['魔术', 'magic'], firstYear: 1990 },
    { names: ['森林狼', 'timberwolves'], firstYear: 1990 },
    { names: ['猛龙', 'raptors'], firstYear: 1996 },
    { names: ['灰熊', 'grizzlies'], firstYear: 1996 },
    { names: ['奇才', 'wizards'], firstYear: 1998 },
    { names: ['山猫', 'bobcats'], firstYear: 2005 },
    { names: ['雷霆', 'thunder'], firstYear: 2009 },
    { names: ['鹈鹕', 'pelicans'], firstYear: 2014 },
    { names: ['独行侠', 'mavericks'], firstYear: 2019 }
  ];

  const STAGE_LABELS = {
    spin: '抽取球队/年份',
    player_select: '选择球员',
    position_select: '选择位置',
    coach_select: '选择教练',
    ready_to_simulate: '准备模拟',
    simulating: '赛季模拟',
    results: '赛季结果'
  };

  const state = {
    screen: 'main_menu',
    stage: 'spin',
    selected: [],
    pendingPlayer: null,
    currentPool: null,
    rosterCache: new Map(),
    coachChoices: [],
    selectedCoach: null,
    busy: false,
    autoRolling: false,
    result: null,
    challengeYear: 2025,
    yearRerollsLeft: 1,
    teamRerollsLeft: 1
  };

  const el = {
    currentSlotLabel: document.getElementById('currentSlotLabel'),
    sourceLabel: document.getElementById('sourceLabel'),
    rerollLabel: document.getElementById('rerollLabel'),
    roundKicker: document.getElementById('roundKicker'),
    poolTitle: document.getElementById('poolTitle'),
    rollButton: document.getElementById('rollButton'),
    rerollYearButton: document.getElementById('rerollYearButton'),
    rerollTeamButton: document.getElementById('rerollTeamButton'),
    simulateButton: document.getElementById('simulateButton'),
    restartButton: document.getElementById('restartButton'),
    candidateGrid: document.getElementById('candidateGrid'),
    emptyState: document.getElementById('emptyState'),
    lineupList: document.getElementById('lineupList'),
    lineupSummary: document.getElementById('lineupSummary'),
    simulationPanel: document.getElementById('simulationPanel'),
    simStatus: document.getElementById('simStatus'),
    simPercent: document.getElementById('simPercent'),
    simProgressBar: document.getElementById('simProgressBar'),
    resultsGrid: document.getElementById('resultsGrid'),
    challengeRecord: document.getElementById('challengeRecord'),
    startGameBtn: document.getElementById('startGameBtn'),
    screenMainMenu: document.getElementById('screenMainMenu'),
    screenDraftRoom: document.getElementById('screenDraftRoom'),
    screenResults: document.getElementById('screenResults'),
    backToMenuBtn: document.getElementById('backToMenuBtn'),
    challengeYearHeader: document.getElementById('challengeYearHeader'),
    rosterYearText: document.getElementById('rosterYearText'),
    resultYearText: document.getElementById('resultYearText')
  };

  function switchScreen(screenId) {
    el.screenMainMenu.classList.toggle('hidden', screenId !== 'main_menu');
    el.screenMainMenu.classList.toggle('active', screenId === 'main_menu');
    el.screenDraftRoom.classList.toggle('hidden', screenId !== 'draft_room');
    el.screenDraftRoom.classList.toggle('active', screenId === 'draft_room');
    el.screenResults.classList.toggle('hidden', screenId !== 'results');
    el.screenResults.classList.toggle('active', screenId === 'results');
    state.screen = screenId;
  }

  function safeText(value) {
    return typeof escapeHtml === 'function' ? escapeHtml(value) : String(value ?? '');
  }

  function isLocalFsPermissionError(err) {
    return String(err?.message || err || '').startsWith('LOCAL_FS_PERMISSION_REQUIRED:');
  }

  function posLabel(id) {
    const slot = POSITION_SLOTS.find(p => p.id === parseNum(id, 0));
    return slot ? slot.short : `P${id}`;
  }

  function slotLabel(slot) {
    return `${slot.short} ${slot.name}`;
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function shuffle(list) {
    const out = [...list];
    for (let i = out.length - 1; i > 0; i--) {
      const j = rng(0, i);
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }

  function ratingOf(player) {
    return clamp(parseNum(player?.rating, ovr(player?.attrs || {})), 40, 99);
  }

  function playerName(player) {
    return player?.name || player?.nameCn || player?.altName || player?.nameEn || 'Unknown';
  }

  function playerEnglishName(player) {
    return player?.altName || player?.nameEn || '';
  }

  function selectedCount() {
    return state.selected.filter(Boolean).length;
  }

  function currentRoundNumber() {
    return Math.min(selectedCount() + 1, POSITION_SLOTS.length);
  }

  function getSelectedBySlot(positionId) {
    return state.selected.find(player => parseNum(player?.chosenSlotId, 0) === parseNum(positionId, 0)) || null;
  }

  function filledPositionIds() {
    return new Set(state.selected.map(player => String(player.chosenSlotId)));
  }

  function playerFitsPosition(player, positionId) {
    const pos = parseNum(player?.pos, parseNum(player?.positionFirst, 0));
    const pos2 = parseNum(player?.pos2, parseNum(player?.positionSecond, 0));
    const target = parseNum(positionId, 0);
    if (pos === target || pos2 === target) return true;
    if (target === 1) return pos === 2;
    if (target === 2) return pos === 1 || pos === 3;
    if (target === 3) return pos === 2 || pos === 4;
    if (target === 4) return pos === 3 || pos === 5;
    if (target === 5) return pos === 4;
    return false;
  }

  function naturalPositionIds(player) {
    const out = [];
    const pos = parseNum(player?.pos, parseNum(player?.positionFirst, 0));
    const pos2 = parseNum(player?.pos2, parseNum(player?.positionSecond, 0));
    [pos, pos2].forEach(id => {
      if (id >= 1 && id <= 5 && !out.includes(id)) out.push(id);
    });
    return out;
  }

  function positionOptionsForPlayer(player) {
    const filled = filledPositionIds();
    const natural = naturalPositionIds(player).filter(id => !filled.has(String(id)));
    if (natural.length) return natural;
    return POSITION_SLOTS
      .filter(slot => !filled.has(String(slot.id)) && playerFitsPosition(player, slot.id))
      .map(slot => slot.id);
  }

  function sourceKey(player) {
    return [
      parseNum(player?.sourceRosterCode, 0),
      parseNum(player?.sourceTeamId, 0),
      parseNum(player?.originalId, parseNum(player?.id, 0))
    ].join(':');
  }

  function describePositions(ids) {
    return ids.map(posLabel).join(' / ');
  }

  function normalizeSourceTeamName(value) {
    if (typeof normalizeTeamToken === 'function') return normalizeTeamToken(value);
    return String(value || '').toLowerCase().trim()
      .replace(/[·\.\-_']/g, '')
      .replace(/\s+/g, '')
      .replace(/队$/, '');
  }

  function isTeamAvailableInSeason(teamId, year, sourceTeamName = '') {
    const seasonYear = parseNum(year, 0);
    const sourceToken = normalizeSourceTeamName(sourceTeamName);
    const nameRule = TEAM_NAME_ACTIVE_FROM_YEAR.find(rule =>
      rule.names.some(name => normalizeSourceTeamName(name) === sourceToken)
    );
    if (nameRule && seasonYear < nameRule.firstYear) return false;
    const firstYear = TEAM_ACTIVE_FROM_YEAR[parseNum(teamId, 0)];
    return !!firstYear && seasonYear >= firstYear;
  }

  function ensureFantasyTeamShell() {
    if (!TEAMS.some(team => parseNum(team.id, 0) === FANTASY_TEAM_ID)) {
      TEAMS.push({ ...FANTASY_TEAM_META });
    }
    if (!LEAGUE.teams) LEAGUE.teams = {};
    if (!LEAGUE.teams[FANTASY_TEAM_ID]) {
      LEAGUE.teams[FANTASY_TEAM_ID] = {
        meta: { ...FANTASY_TEAM_META },
        players: [],
        rotation: [],
        coach: null,
        strength: 75
      };
    } else {
      LEAGUE.teams[FANTASY_TEAM_ID].meta = { ...FANTASY_TEAM_META };
    }
    return LEAGUE.teams[FANTASY_TEAM_ID];
  }

  async function loadRosterSeason(season) {
    const key = String(season.code);
    if (state.rosterCache.has(key)) return state.rosterCache.get(key);
    const path = `assets/data/rosters${pad2(season.code)}.csv`;
    const rows = parseCSV(await fetchText(path));
    const players = [];
    rows.forEach((row, idx) => {
      const teamId = resolveTeamId(row.teamID, row.team);
      if (teamId <= 0 || teamId > 30) return;
      if (!isTeamAvailableInSeason(teamId, season.year, row.team)) return;
      const player = rowToPlayer(row, idx + 1, { teamId });
      player.sourceYear = season.year;
      player.sourceStatsYear = season.statsYear || season.year;
      player.sourceLabel = season.label;
      player.sourceRosterCode = season.code;
      player.sourceTeamId = teamId;
      player.sourceTeamName = row.team || getTeam(teamId)?.z || teamNameFallback(teamId);
      players.push(player);
    });
    const teamIds = [...new Set(players.map(player => parseNum(player.teamId, 0)))];
    const teams = teamIds
      .map(teamId => {
        const currentTeam = getTeam(teamId) || TEAMS.find(team => team.id === teamId) || { id: teamId, a: `T${teamId}`, z: teamNameFallback(teamId), n: teamNameFallback(teamId) };
        const teamPlayers = players.filter(player => parseNum(player.teamId, 0) === teamId);
        const sourceTeamName = teamPlayers[0]?.sourceTeamName || currentTeam.z;
        return { team: { ...currentTeam, z: sourceTeamName }, sourceTeamName, players: teamPlayers };
      })
      .filter(bucket => bucket.players.length);
    const pack = { season, players, teams };
    state.rosterCache.set(key, pack);
    return pack;
  }

  async function requestDraftDataAccessAndRetry() {
    if (state.busy) return;
    const canAsk = typeof getRootHandle === 'function';
    if (!canAsk) {
      el.emptyState.innerHTML = '<strong>无法授权数据目录</strong><span>请改用本地 HTTP 服务打开页面，例如 http://127.0.0.1:8127/nba-82-0-draft.html。</span>';
      return;
    }
    state.busy = true;
    setButtons();
    el.emptyState.hidden = false;
    el.emptyState.innerHTML = '<strong>等待授权</strong><span>请选择项目根目录，或直接选择 assets/data 目录。</span>';
    try {
      const handle = await getRootHandle(false, true);
      if (!handle) throw new Error('未获得目录读取权限');
      state.rosterCache.clear();
      state.busy = false;
      await rollTeamYear();
    } catch (err) {
      state.busy = false;
      el.emptyState.hidden = false;
      el.emptyState.innerHTML = `<strong>授权失败</strong><span>${safeText(err.message || err)}</span>${draftDataPermissionActionsHtml()}`;
      bindDraftDataPermissionButton();
      setButtons();
    }
  }

  function draftDataPermissionActionsHtml() {
    const serviceCopy = '也可以用本地 HTTP 服务打开页面，避免浏览器 file:// 读取限制。';
    const canAsk = typeof getRootHandle === 'function';
    return `
      <div class="permission-actions">
        ${canAsk ? '<button class="btn primary" id="grantDraftDataButton" type="button">授权本地数据目录</button>' : ''}
        <span>${safeText(serviceCopy)}</span>
      </div>
    `;
  }

  function bindDraftDataPermissionButton() {
    const btn = document.getElementById('grantDraftDataButton');
    if (btn) btn.addEventListener('click', requestDraftDataAccessAndRetry);
  }

  function sampleCandidatePool(pack, { fixedTeamId = null, excludeTeamId = null } = {}) {
    const usedKeys = new Set(state.selected.map(sourceKey));
    let eligibleTeams = pack.teams
      .map(bucket => {
        const players = bucket.players
          .filter(player => !usedKeys.has(sourceKey({
            ...player,
            originalId: player.id,
            sourceRosterCode: pack.season.code,
            sourceTeamId: bucket.team.id
          })))
          .filter(player => hasRealCandidateAverages(player))
          .filter(player => positionOptionsForPlayer(player).length);
        return { team: bucket.team, players };
      })
      .filter(bucket => bucket.players.length >= 5);

    if (fixedTeamId) {
      eligibleTeams = eligibleTeams.filter(bucket => parseNum(bucket.team.id, 0) === parseNum(fixedTeamId, 0));
    }
    if (excludeTeamId) {
      eligibleTeams = eligibleTeams.filter(bucket => parseNum(bucket.team.id, 0) !== parseNum(excludeTeamId, 0));
    }

    if (!eligibleTeams.length) return null;
    const bucket = pick(eligibleTeams);
    const candidates = shuffle(bucket.players)
      .sort((a, b) => ratingOf(b) - ratingOf(a))
      .slice(0, 5)
      .map((player, index) => {
        const out = {
          ...clone(player),
          cardIndex: index,
          originalId: player.id,
          sourceTeamId: bucket.team.id,
          sourceTeamName: bucket.sourceTeamName || bucket.team.z,
          sourceTeamAbbr: bucket.team.a,
          sourceYear: pack.season.year,
          sourceStatsYear: pack.season.statsYear || pack.season.year,
          sourceLabel: pack.season.label,
          sourceRosterCode: pack.season.code
        };
        out.positionOptions = positionOptionsForPlayer(out);
        return out;
      });
    return { season: pack.season, team: bucket.team, candidates };
  }

  async function buildCandidatePool({ fixedSeason = null, excludeSeasonCode = null, fixedTeamId = null, excludeTeamId = null } = {}) {
    const skippedErrors = [];
    const seasons = fixedSeason
      ? [fixedSeason]
      : shuffle(ROSTER_SEASONS.filter(season => String(season.code) !== String(excludeSeasonCode || '')));
    for (let attempt = 0; attempt < seasons.length; attempt++) {
      const season = seasons[attempt];
      try {
        const pack = await loadRosterSeason(season);
        await ensureHistoricalSeasonStatsForYear(season.statsYear || season.year);
        const pool = sampleCandidatePool(pack, { fixedTeamId, excludeTeamId });
        if (pool) return { pool, skippedErrors };
      } catch (err) {
        if (isLocalFsPermissionError(err)) throw err;
        skippedErrors.push(`${season.label}: ${err.message || err}`);
      }
    }
    return { pool: null, skippedErrors };
  }

  function ensureGachaOverlay() {
    let gachaEl = document.getElementById('gachaOverlay');
    if (!gachaEl) {
      gachaEl = document.createElement('div');
      gachaEl.id = 'gachaOverlay';
      gachaEl.className = 'gacha-overlay';
      const host = document.getElementById('draftApp') || document.body;
      host.appendChild(gachaEl);
    }
    return gachaEl;
  }

  async function playTeamSearchOverlay(pool, rerollType = null) {
    const gachaEl = ensureGachaOverlay();
    const phases = [
      { phase: 'year', ms: 760 },
      { phase: 'team', ms: 860 },
      { phase: 'ready', ms: 1050 }
    ];
    gachaEl.classList.add('active');
    for (const item of phases) {
      gachaEl.innerHTML = renderTeamSearchOverlay(pool, item.phase, rerollType);
      await new Promise(resolve => setTimeout(resolve, item.ms));
    }
    gachaEl.classList.remove('active');
    await new Promise(resolve => setTimeout(resolve, 180));
  }

  async function rollTeamYear({ rerollType = null } = {}) {
    if (state.busy || selectedCount() >= POSITION_SLOTS.length) return;
    if (rerollType === 'year' && (!state.currentPool || state.yearRerollsLeft <= 0)) return;
    if (rerollType === 'team' && (!state.currentPool || state.teamRerollsLeft <= 0)) return;
    state.busy = true;
    state.stage = 'spin';
    setButtons();
    el.emptyState.hidden = false;
    el.emptyState.innerHTML = renderEmptyScout('正在抽取', '先锁定年份，再锁定球队。');
    el.candidateGrid.innerHTML = '';

    try {
      const currentPool = state.currentPool;
      const { pool, skippedErrors } = await buildCandidatePool({
        fixedSeason: rerollType === 'team' ? currentPool?.season : null,
        excludeSeasonCode: rerollType === 'year' ? currentPool?.season?.code : null,
        fixedTeamId: rerollType === 'year' ? currentPool?.team?.id : null,
        excludeTeamId: rerollType === 'team' ? currentPool?.team?.id : null
      });
      if (!pool) {
        const detail = skippedErrors.length ? `；已跳过读取失败赛季：${skippedErrors.slice(0, 3).join(' / ')}` : '';
        throw new Error(`没有找到足够的候选球员${detail}`);
      }
      state.currentPool = pool;
      state.pendingPlayer = null;
      state.result = null;
      if (rerollType === 'year') state.yearRerollsLeft = Math.max(0, state.yearRerollsLeft - 1);
      if (rerollType === 'team') state.teamRerollsLeft = Math.max(0, state.teamRerollsLeft - 1);

      await playTeamSearchOverlay(pool, rerollType);

      state.stage = 'player_select';
      renderAll();
    } catch (err) {
      state.stage = 'spin';
      el.emptyState.hidden = false;
      if (isLocalFsPermissionError(err)) {
        el.emptyState.innerHTML = `<strong>需要本地数据目录权限</strong><span>${safeText(err.message || err)}</span>${draftDataPermissionActionsHtml()}`;
        bindDraftDataPermissionButton();
      } else {
        console.error(err);
        el.emptyState.innerHTML = `<strong>抽取失败</strong><span>${safeText(err.message || err)}</span>`;
      }
    } finally {
      state.busy = false;
      setButtons();
    }
  }

  function selectCandidate(index) {
    if (state.busy || !state.currentPool) return;
    const candidate = state.currentPool.candidates[index];
    if (!candidate) return;
    const options = positionOptionsForPlayer(candidate);
    if (!options.length) return;
    const pending = {
      ...clone(candidate),
      fantasyId: 820000 + selectedCount() + 1,
      id: candidate.id,
      positionOptions: options
    };
    state.pendingPlayer = pending;
    state.stage = 'position_select';
    state.result = null;
    renderAll();
  }

  async function choosePosition(positionId) {
    if (state.busy || !state.pendingPlayer) return;
    const target = parseNum(positionId, 0);
    const options = positionOptionsForPlayer(state.pendingPlayer);
    if (!options.includes(target)) return;
    const slot = POSITION_SLOTS.find(item => item.id === target);
    if (!slot || getSelectedBySlot(slot.id)) return;

    const selected = {
      ...clone(state.pendingPlayer),
      fantasyId: 820000 + selectedCount() + 1,
      originalId: state.pendingPlayer.originalId || state.pendingPlayer.id,
      chosenSlotId: slot.id,
      chosenSlotShort: slot.short
    };
    selected.id = selected.fantasyId;
    selected.uid = `fantasy_${selected.fantasyId}`;
    selected.teamId = FANTASY_TEAM_ID;
    selected.fantasyStarter = true;
    state.selected.push(selected);
    state.pendingPlayer = null;
    state.currentPool = null;
    state.result = null;
    el.simulationPanel.hidden = true;
    el.resultsGrid.innerHTML = '';

    if (selectedCount() >= POSITION_SLOTS.length) {
      await enterCoachStage();
    } else {
      state.stage = 'spin';
      state.autoRolling = true;
      renderAll();
      await new Promise(resolve => setTimeout(resolve, 260));
      state.autoRolling = false;
      await rollTeamYear();
    }
  }

  async function enterCoachStage() {
    state.stage = 'coach_select';
    state.currentPool = null;
    state.pendingPlayer = null;
    state.selectedCoach = null;
    state.result = null;
    await prepareCoachChoices();
    renderAll();
  }

  function normalizeCoachChoice(coach, index) {
    const out = { ...clone(coach), coachPickIndex: index };
    const fx = coachEffectsFor(out);
    out.systemId = fx.systemId;
    out.systemLabel = fx.systemLabel;
    out.secondaryLean = fx.secondaryLean;
    out.systemSummary = fx.systemSummary;
    return out;
  }

  async function prepareCoachChoices() {
    if (state.coachChoices.length) return;
    state.busy = true;
    renderAll();
    try {
      await loadLeagueData({ startYear: state.challengeYear, strictRoster: true });
      const picked = [
        normalizeCoachChoice({
          id: 82001, name: '斯蒂夫-科尔', teamId: FANTASY_TEAM_ID, systemId: 'pace_space',
          baseShotIntPercent: 30, baseShotTriplePercent: 50, baseOffensive: 50, baseDefense: 30, techLevel: 0, techDev: 0, loyalty: 5
        }, 0),
        normalizeCoachChoice({
          id: 82002, name: '菲尔-杰克逊', teamId: FANTASY_TEAM_ID, systemId: 'triangle',
          baseShotIntPercent: 45, baseShotTriplePercent: 35, baseOffensive: 50, baseDefense: 40, techLevel: 0, techDev: 0, loyalty: 5
        }, 1),
        normalizeCoachChoice({
          id: 82003, name: '迈克-德安东尼', teamId: FANTASY_TEAM_ID, systemId: 'seven_seconds',
          baseShotIntPercent: 35, baseShotTriplePercent: 45, baseOffensive: 55, baseDefense: 25, techLevel: 0, techDev: 0, loyalty: 5
        }, 2),
        normalizeCoachChoice({
          id: 82004, name: '查克-戴利', teamId: FANTASY_TEAM_ID, systemId: 'defense',
          baseShotIntPercent: 45, baseShotTriplePercent: 30, baseOffensive: 35, baseDefense: 55, techLevel: 0, techDev: 0, loyalty: 5
        }, 3),
        normalizeCoachChoice({
          id: 82005, name: '格雷格-波波维奇', teamId: FANTASY_TEAM_ID, systemId: 'balance',
          baseShotIntPercent: 40, baseShotTriplePercent: 40, baseOffensive: 45, baseDefense: 45, techLevel: 0, techDev: 0, loyalty: 5
        }, 4)
      ];

      state.coachChoices = picked;
    } catch (err) {
      console.error(err);
      el.emptyState.hidden = false;
      el.emptyState.innerHTML = `<strong>教练读取失败</strong><span>${safeText(err.message || err)}</span>`;
    } finally {
      state.busy = false;
    }
  }

  function selectCoach(index) {
    if (state.busy) return;
    const coach = state.coachChoices[index];
    if (!coach) return;
    state.selectedCoach = normalizeCoachChoice(coach, index);
    state.stage = 'ready_to_simulate';
    state.result = null;
    renderAll();
  }

  function coachEffectsFor(coach) {
    if (typeof getCoachEffectsByCoach === 'function') return getCoachEffectsByCoach(coach);
    return {
      systemId: coach?.systemId || 'balance',
      systemLabel: '均衡体系',
      secondaryLean: '按阵容灵活分配球权',
      systemSummary: '回合分配平均，强调稳定和阵容均衡。',
      paceMult: 1,
      threeRateMult: 1,
      paintRateMult: 1,
      astMult: 1,
      rebMult: 1,
      stocksMult: 1,
      usageByPos: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      teamRatingMult: 1
    };
  }

  function coachProfileSummary(coach) {
    const fx = coachEffectsFor(coach);
    const buffs = [];
    const nerfs = [];
    if (fx.paceMult >= 1.06) buffs.push('提速转换');
    if (fx.threeRateMult >= 1.06) buffs.push('外线投射');
    if (fx.paintRateMult >= 1.06) buffs.push('内线终结');
    if (fx.astMult >= 1.06) buffs.push('传导组织');
    if (fx.rebMult >= 1.05) buffs.push('篮板保护');
    if (fx.stocksMult >= 1.05) buffs.push('防守破坏');
    if (fx.paceMult <= 0.96) nerfs.push('降低节奏');
    if (fx.threeRateMult <= 0.95) nerfs.push('减少外线');
    if (fx.paintRateMult <= 0.95) nerfs.push('减少低位');
    if (fx.rebMult <= 0.98) nerfs.push('牺牲篮板');
    if (!buffs.length) buffs.push('均衡分配');
    if (!nerfs.length) nerfs.push('无明显短板');
    return { fx, buffs, nerfs };
  }

  function coachImpactForPlayer(player, coach) {
    if (!coach) return { score: 0, label: '未选择教练', buffs: [], nerfs: [] };
    const fx = coachEffectsFor(coach);
    const attrs = player?.attrs || {};
    const positionId = parseNum(player?.chosenSlotId, parseNum(player?.pos, 0));
    const shotExt = parseNum(attrs.shotExt, 55);
    const shotInt = parseNum(attrs.shotInt, 55);
    const pass = parseNum(attrs.pass, 55);
    const reb = parseNum(attrs.reb, 55);
    const stl = parseNum(attrs.stl, 55);
    const blk = parseNum(attrs.blk, 55);
    const speed = parseNum(attrs.speed, 55);
    let score = 0;
    const buffs = [];
    const nerfs = [];

    if (fx.threeRateMult >= 1.06) {
      if (shotExt >= 78 || positionId <= 3) {
        score += 2;
        buffs.push('空间/三分');
      } else {
        score -= 1;
        nerfs.push('非空间点球权下降');
      }
    }
    if (fx.paintRateMult >= 1.06) {
      if (shotInt >= 78 || reb >= 78 || positionId >= 4) {
        score += 2;
        buffs.push('篮下/顺下');
      } else if (positionId <= 2) {
        score -= 1;
        nerfs.push('后场持球比例下降');
      }
    }
    if (fx.paceMult >= 1.06) {
      if (speed >= 76 || pass >= 76 || positionId <= 3) {
        score += 1;
        buffs.push('转换推进');
      } else {
        score -= 1;
        nerfs.push('慢速内线被拉开');
      }
    }
    if (fx.astMult >= 1.06 && pass >= 76) {
      score += 1;
      buffs.push('组织传导');
    }
    if (fx.rebMult >= 1.05 && reb >= 76) {
      score += 1;
      buffs.push('篮板');
    }
    if (fx.stocksMult >= 1.05 && (stl >= 76 || blk >= 76)) {
      score += 1;
      buffs.push('抢断/盖帽');
    }

    const usageDelta = parseNum(fx.usageByPos?.[positionId], 0);
    if (usageDelta >= 0.015) {
      score += 1;
      buffs.push('位置球权');
    } else if (usageDelta <= -0.015) {
      score -= 1;
      nerfs.push('位置球权');
    }

    let label = '适配一般';
    if (score >= 4) label = '核心受益';
    else if (score >= 2) label = '正向适配';
    else if (score <= -2) label = '体系压制';
    return {
      score,
      label,
      buffs: [...new Set(buffs)],
      nerfs: [...new Set(nerfs)]
    };
  }

  function applyCoachTacticalFit(player, coach) {
    const out = clone(player);
    if (!coach) return out;
    const fx = coachEffectsFor(coach);
    const impact = coachImpactForPlayer(out, coach);
    const attrs = { ...(out.attrs || {}) };
    const positionId = parseNum(out.chosenSlotId, parseNum(out.pos, 0));
    const add = (key, value) => {
      attrs[key] = clamp(parseNum(attrs[key], 55) + value, 25, 99);
    };

    if (fx.threeRateMult >= 1.06) {
      add('shotExt', parseNum(attrs.shotExt, 55) >= 74 ? 3 : 1);
      if (positionId >= 4 && parseNum(attrs.shotExt, 55) < 72) add('reb', -1);
    } else if (fx.threeRateMult <= 0.95) {
      add('shotExt', -2);
    }
    if (fx.paintRateMult >= 1.06) {
      add('shotInt', 2);
      if (positionId >= 4) {
        add('reb', 2);
        add('str', 1);
      }
      if (positionId <= 2) add('pass', -1);
    } else if (fx.paintRateMult <= 0.95) {
      add('shotInt', -2);
    }
    if (fx.paceMult >= 1.06) {
      add('speed', 2);
      if (positionId <= 3) add('pass', 1);
      if (positionId >= 4) add('str', -1);
    } else if (fx.paceMult <= 0.96) {
      add('speed', -1);
      if (positionId >= 4) add('str', 1);
    }
    if (fx.astMult >= 1.06) add('pass', 2);
    if (fx.rebMult >= 1.05) add('reb', 2);
    if (fx.stocksMult >= 1.05) {
      add('stl', 1);
      add('blk', 1);
    }

    const usageDelta = parseNum(fx.usageByPos?.[positionId], 0);
    out.attrs = attrs;
    out.att = clamp(Math.round(calcPlayerAtt(attrs) + usageDelta * 90), 25, 99);
    out.def = clamp(Math.round(calcPlayerDef(attrs)), 25, 99);
    out.rating = clamp(Math.round(ovr(attrs) + usageDelta * 35 + impact.score * 0.4), 40, 99);
    out.coachFit = impact;
    return out;
  }

  function renderStatus() {
    const count = selectedCount();
    el.currentSlotLabel.textContent = STAGE_LABELS[state.stage] || '抽取球队/年份';
    if (state.stage === 'results') {
      el.roundKicker.textContent = '赛季模拟完成';
      el.poolTitle.textContent = `${state.challengeYear} 赛季结果`;
    } else if (state.stage === 'coach_select' || state.stage === 'ready_to_simulate') {
      el.roundKicker.textContent = '5 / 5 个位置完成';
      el.poolTitle.textContent = state.stage === 'coach_select' ? '选择主教练和战术体系' : '阵容与教练已锁定';
    } else {
      el.roundKicker.textContent = `第 ${currentRoundNumber()} / 5 轮`;
      el.poolTitle.textContent = state.stage === 'position_select'
        ? '选择这个球员要打的位置'
        : state.stage === 'player_select'
          ? '从随机球队里选择球员'
          : '先抽取球队和年份';
    }

    if (state.currentPool) {
      el.sourceLabel.textContent = `${state.currentPool.season.label} · ${state.currentPool.team.z}`;
    } else if (state.selectedCoach) {
      const summary = coachProfileSummary(state.selectedCoach);
      el.sourceLabel.textContent = `${state.selectedCoach.name} · ${summary.fx.systemLabel}`;
    } else if (state.stage === 'coach_select') {
      el.sourceLabel.textContent = `${state.challengeYear} 教练池`;
    } else {
      el.sourceLabel.textContent = count >= 5 ? '等待教练选择' : '等待抽取';
    }

    el.rerollLabel.textContent = `年份 ${state.yearRerollsLeft} / 球队 ${state.teamRerollsLeft}`;
    const wins = state.result?.challengeRecord?.w;
    const losses = state.result?.challengeRecord?.l;
    el.challengeRecord.textContent = Number.isFinite(wins) ? `结果 ${wins}-${losses}` : '目标 82-0';
  }

  function setButtons() {
    const canRoll = state.stage === 'spin' && selectedCount() < POSITION_SLOTS.length && !state.autoRolling;
    el.rollButton.hidden = !canRoll;
    el.rollButton.disabled = state.busy;
    el.rerollYearButton.hidden = state.stage !== 'player_select';
    el.rerollYearButton.disabled = state.busy || !state.currentPool || state.yearRerollsLeft <= 0;
    el.rerollTeamButton.hidden = state.stage !== 'player_select';
    el.rerollTeamButton.disabled = state.busy || !state.currentPool || state.teamRerollsLeft <= 0;
    el.simulateButton.hidden = state.stage !== 'ready_to_simulate';
    el.simulateButton.disabled = state.busy || selectedCount() < 5 || !state.selectedCoach;
    el.restartButton.hidden = state.stage !== 'results';
    el.restartButton.disabled = state.busy;
  }

  function getPlayerAverages(player) {
    const row = findHistoricalStatsForPlayer(player);
    return row ? statRowToAverages(row, 'real', statLookupYears(player)[0]) : null;
  }

  function statRowToAverages(row, source, year) {
    const statsYear = parseNum(year, 0);
    return {
      pts: formatStatNumber(row.PTS),
      reb: formatStatNumber(row.REB),
      ast: formatStatNumber(row.AST),
      stl: isStatTracked('STL', statsYear) ? formatStatNumber(row.STL) : UNTRACKED_STAT_TEXT,
      blk: isStatTracked('BLK', statsYear) ? formatStatNumber(row.BLK) : UNTRACKED_STAT_TEXT,
      source
    };
  }

  function isStatTracked(key, year) {
    const stat = String(key || '').toUpperCase();
    if (stat === 'STL' || stat === 'BLK') return parseNum(year, 0) >= STOCKS_TRACKED_FROM_YEAR;
    return true;
  }

  function hasNumericStat(row, key) {
    return Number.isFinite(parseNum(row?.[key], NaN));
  }

  function hasRealCandidateAverages(player) {
    const row = findHistoricalStatsForPlayer(player);
    if (!row) return false;
    const year = statLookupYears(player)[0];
    if (!['PTS', 'REB', 'AST'].every(key => hasNumericStat(row, key))) return false;
    if (isStatTracked('STL', year) && !hasNumericStat(row, 'STL')) return false;
    if (isStatTracked('BLK', year) && !hasNumericStat(row, 'BLK')) return false;
    return true;
  }

  function formatStatNumber(value) {
    const n = parseNum(value, NaN);
    return Number.isFinite(n) ? n.toFixed(1) : '0.0';
  }

  function statNameKey(value) {
    return String(value || '')
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
  }

  function playerStatNames(player) {
    return [
      player?.nameEn,
      player?.altName,
      player?.nameBirth,
      player?.Name,
      player?.name,
      player?.nameCn
    ]
      .map(name => String(name || '').trim())
      .filter((name, index, list) => name && list.indexOf(name) === index);
  }

  function statLookupYears(player) {
    const year = parseNum(player?.sourceStatsYear || player?.sourceYear || state.challengeYear, 0);
    return year && historicalSeasonStats?.[year] ? [year] : [];
  }

  function findHistoricalStatsForPlayer(player) {
    if (!historicalSeasonStats) return null;
    const names = playerStatNames(player);
    if (!names.length) return null;
    const normalizedNames = names.map(statNameKey).filter(Boolean);
    for (const year of statLookupYears(player)) {
      const db = historicalSeasonStats[year];
      for (const name of names) {
        if (db[name]) return db[name];
      }
      const matchedKey = Object.keys(db).find(key => normalizedNames.includes(statNameKey(key)));
      if (matchedKey) return db[matchedKey];
    }
    return null;
  }

  function historicalPackRows(data) {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.rows)) return data.rows;
    if (Array.isArray(data?.players)) return data.players;
    if (Array.isArray(data?.seasons)) return data.seasons;
    return [];
  }

  function historicalPackRowToStats(row) {
    return {
      GP: row.gp,
      PTS: row.ppg,
      REB: row.rpg,
      AST: row.apg,
      STL: row.spg,
      BLK: row.bpg,
      FG: row.fgPct,
      TP: row.tpPct,
      FT: row.ftPct
    };
  }

  function mergeHistoricalSeasonPack(year, data) {
    const seasonYear = parseNum(year, 0);
    if (!seasonYear) return;
    if (!historicalSeasonStats) historicalSeasonStats = {};
    if (!historicalSeasonStats[seasonYear]) historicalSeasonStats[seasonYear] = {};
    const bucket = historicalSeasonStats[seasonYear];
    historicalPackRows(data)
      .filter(row => String(row.type || 'regular') === 'regular')
      .filter(row => parseNum(row.seasonEndYear, seasonYear) === seasonYear)
      .forEach(row => {
        const stats = historicalPackRowToStats(row);
        [row.name, row.displayName, row.nameEn, row.nameCn]
          .map(name => String(name || '').trim())
          .filter((name, index, list) => name && list.indexOf(name) === index)
          .forEach(name => {
            if (!bucket[name]) bucket[name] = stats;
          });
      });
  }

  async function ensureHistoricalSeasonStatsForYear(year) {
    const seasonYear = parseNum(year, 0);
    if (!seasonYear) return;
    if (historicalSeasonPackPromises.has(seasonYear)) {
      await historicalSeasonPackPromises.get(seasonYear);
      return;
    }
    const promise = fetch(`assets/data/historical/player_seasons_${seasonYear}.json?v=20260629realstats`)
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (data) mergeHistoricalSeasonPack(seasonYear, data);
      })
      .catch(() => {});
    historicalSeasonPackPromises.set(seasonYear, promise);
    await promise;
  }

  function candidateStatTiles(player) {
    const avg = getPlayerAverages(player);
    if (!avg) {
      return '<div class="stat-tile wide"><span>真实数据</span><strong>缺失</strong></div>';
    }
    return [
      `<div class="stat-tile"><span>得分</span><strong>${avg.pts}</strong></div>`,
      `<div class="stat-tile"><span>篮板</span><strong>${avg.reb}</strong></div>`,
      `<div class="stat-tile"><span>助攻</span><strong>${avg.ast}</strong></div>`,
      `<div class="stat-tile"><span>抢断</span><strong>${avg.stl}</strong></div>`,
      `<div class="stat-tile"><span>盖帽</span><strong>${avg.blk}</strong></div>`
    ].join('');
  }

  function playerAveragesLine(player) {
    const avg = getPlayerAverages(player);
    if (!avg) return '无真实赛季数据';
    const stockText = avg.stl === UNTRACKED_STAT_TEXT && avg.blk === UNTRACKED_STAT_TEXT
      ? '抢断/盖帽未统计'
      : `${avg.stl}断 ${avg.blk}帽`;
    return `${avg.pts}分 ${avg.reb}板 ${avg.ast}助 ${stockText}`;
  }

  function renderSearchSvg() {
    return `
      <svg class="scanner-svg" viewBox="0 0 360 220" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id="scannerBeam" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stop-color="#06b6d4" stop-opacity="0" />
            <stop offset="45%" stop-color="#06b6d4" stop-opacity="0.5" />
            <stop offset="100%" stop-color="#f59e0b" stop-opacity="0" />
          </linearGradient>
          <filter id="scannerGlow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <rect class="scanner-court" x="34" y="22" width="292" height="176" rx="18" />
        <path class="scanner-line" d="M180 22v176M104 22v58h152V22M116 80c14 40 114 40 128 0M112 198c8-64 128-64 136 0" />
        <g class="scanner-radar" filter="url(#scannerGlow)">
          <circle cx="180" cy="110" r="50" />
          <circle cx="180" cy="110" r="24" />
          <path d="M180 110l44-23" />
        </g>
        <path class="scanner-beam" d="M46 40h268v140H46z" />
        <g class="scanner-cards">
          <rect class="scan-card scan-card-1" x="64" y="54" width="46" height="58" rx="8" />
          <rect class="scan-card scan-card-2" x="250" y="62" width="46" height="58" rx="8" />
          <rect class="scan-card scan-card-3" x="156" y="142" width="46" height="58" rx="8" />
        </g>
        <g class="scanner-ball">
          <circle cx="180" cy="110" r="13" />
          <path d="M167 110h26M180 97c-9 9-9 17 0 26M180 97c9 9 9 17 0 26" />
        </g>
      </svg>
    `;
  }

  function renderStageStepRail(stage = state.stage) {
    const steps = [
      { key: 'spin', label: '来源' },
      { key: 'player_select', label: '球员' },
      { key: 'position_select', label: '位置' },
      { key: 'coach_select', label: '教练' },
      { key: 'ready_to_simulate', label: '模拟' }
    ];
    const activeIndex = Math.max(0, steps.findIndex(step => step.key === stage));
    return `
      <div class="stage-rail" aria-label="挑战流程">
        ${steps.map((step, index) => {
          const classes = ['stage-dot'];
          if (index < activeIndex) classes.push('done');
          if (index === activeIndex) classes.push('active');
          return `<span class="${classes.join(' ')}"><b>${index + 1}</b><em>${safeText(step.label)}</em></span>`;
        }).join('')}
      </div>
    `;
  }

  function renderTeamSearchOverlay(pool, phase = 'ready', rerollType = null) {
    const phaseIndex = phase === 'year' ? 0 : phase === 'team' ? 1 : 2;
    const label = phase === 'year'
      ? (rerollType === 'year' ? 'RESELECTING SEASON' : 'LOCKING SEASON')
      : phase === 'team'
        ? (rerollType === 'team' ? 'RESELECTING TEAM' : 'SCANNING TEAM')
        : 'DRAFT BOARD READY';
    const teamChip = phaseIndex >= 1 ? (pool.team.a || pool.team.z) : '...';
    const teamName = phaseIndex >= 1 ? pool.team.z : '扫描球队';
    const steps = [
      { title: '年份', value: pool.season.label },
      { title: '球队', value: teamName },
      { title: '候选', value: '5 选 1' }
    ];
    return `
      <div class="gacha-scanner" role="status" aria-live="polite">
        ${renderSearchSvg()}
        <div class="scanner-meta">
          <span class="scanner-label">${safeText(label)}</span>
          <div class="scanner-chips">
            <strong class="scanner-chip year-chip">${safeText(pool.season.label)}</strong>
            <strong class="scanner-chip team-chip">${safeText(teamChip)}</strong>
          </div>
          <div class="scanner-timeline" aria-hidden="true">
            ${steps.map((step, index) => {
              const classes = ['scanner-step'];
              if (index < phaseIndex) classes.push('done');
              if (index === phaseIndex) classes.push('active');
              return `<span class="${classes.join(' ')}"><b>${index + 1}</b><em>${safeText(step.title)}</em><strong>${safeText(step.value)}</strong></span>`;
            }).join('')}
          </div>
        </div>
      </div>
    `;
  }

  function renderEmptyScout(title = '抽取球队和年份', detail = '项目名单会随机给出球队、赛季和五名候选。') {
    return `
      <div class="empty-scout">
        ${renderSearchSvg()}
        <strong>${safeText(title)}</strong>
        <span>${safeText(detail)}</span>
      </div>
    `;
  }

  function sumAverageStat(rows, key) {
    return rows.reduce((sum, row) => sum + (parseFloat(row?.[key]) || 0), 0);
  }

  function lineupStockSummary(rows) {
    const tracked = rows.filter(row => row.stl !== UNTRACKED_STAT_TEXT || row.blk !== UNTRACKED_STAT_TEXT);
    if (!tracked.length) return '，抢断/盖帽未统计';
    const stl = sumAverageStat(tracked, 'stl').toFixed(1);
    const blk = sumAverageStat(tracked, 'blk').toFixed(1);
    const note = tracked.length < rows.length ? '（未统计球员不计入）' : '';
    return ` ${stl}断 ${blk}帽${note}`;
  }

  function renderPlayerChoices() {
    if (!state.currentPool) return '';
    return `
      <div class="source-strip">
        <div class="source-chip team">${safeText(state.currentPool.team.a)}</div>
        <div class="source-chip year">${safeText(state.currentPool.season.label)}</div>
        <div class="source-signal" aria-hidden="true">
          <span></span><span></span><span></span>
        </div>
        ${renderStageStepRail('player_select')}
      </div>
      <div class="candidate-grid-inner">
        ${state.currentPool.candidates.map((player, index) => {
          const availPos = positionOptionsForPlayer(player);
          const isDisabled = !availPos.length;
          return `
          <button class="candidate-card${isDisabled ? ' disabled-card' : ''}" type="button" ${isDisabled ? 'disabled' : `data-pick="${index}"`} aria-label="${isDisabled ? '无可用位置' : '选择'} ${safeText(playerName(player))}">
            <div class="candidate-image-wrap">
              <img class="player-photo" src="${safeText(getPlayerPhotoSrc(player))}" alt="${safeText(playerName(player))}" onerror="this.src='${safeText(getPlayerPhotoPath(0))}'">
              <img class="team-logo-chip" src="${safeText(getTeamLogoPath(player.sourceTeamId, player.sourceTeamAbbr))}" alt="${safeText(player.sourceTeamName)}" onerror="this.src='${safeText(getTeamAltLogoPath(player.sourceTeamId))}'">
            </div>
            <div class="candidate-body">
              <div class="candidate-source">${safeText(player.sourceLabel)} · ${safeText(player.sourceTeamName)}</div>
              <div class="candidate-name">${safeText(playerName(player))}</div>
              <div class="candidate-meta">
                <span class="tag">${safeText(posLabel(player.pos))}${player.pos2 ? ` / ${safeText(posLabel(player.pos2))}` : ''}</span>
                <span class="tag ${isDisabled ? 'red' : 'gold'}">${isDisabled ? '位置已满' : `可落位 ${safeText(describePositions(availPos))}`}</span>
                <span class="tag">${parseNum(player.age, 0)} 岁</span>
              </div>
            </div>
            <div class="candidate-stats">${candidateStatTiles(player)}</div>
          </button>
        `;}).join('')}
      </div>
    `;
  }

  function renderCourtBoard(pending = null) {
    const options = pending ? positionOptionsForPlayer(pending) : [];
    return `
      <div class="court-board" aria-label="位置选择球场">
        <svg class="court-route-svg" viewBox="0 0 500 420" aria-hidden="true" focusable="false">
          <path class="court-route-line" d="M250 355 C215 286 145 262 92 240 M250 355 C286 282 356 260 413 240 M250 355 C238 223 205 105 172 78 M250 355 C262 223 295 105 328 78 M250 355 C250 226 250 128 250 76" />
          <circle class="court-route-ball" cx="250" cy="355" r="8" />
        </svg>
        ${POSITION_SLOTS.map(slot => {
          const player = getSelectedBySlot(slot.id);
          const eligible = options.includes(slot.id);
          const classes = ['court-slot', `pos-${slot.short.toLowerCase()}`];
          if (player) classes.push('filled');
          else if (eligible) classes.push('available');
          else classes.push('blocked');
          return `
            <button class="${classes.join(' ')}" type="button" ${eligible && !player ? `data-position-choice="${slot.id}"` : 'disabled'}>
              <span>${safeText(slot.short)}</span>
              <strong>${player ? safeText(playerName(player)) : eligible ? '可选' : '空位'}</strong>
            </button>
          `;
        }).join('')}
      </div>
    `;
  }

  function renderPositionChoices() {
    const player = state.pendingPlayer;
    if (!player) return '';
    const options = positionOptionsForPlayer(player);
    return `
      <div class="position-stage">
        <article class="pending-player-card">
          <div class="pending-photo-wrap">
            <img class="player-photo" src="${safeText(getPlayerPhotoSrc(player))}" alt="${safeText(playerName(player))}" onerror="this.src='${safeText(getPlayerPhotoPath(0))}'">
          </div>
          <div>
            <p class="candidate-source">${safeText(player.sourceLabel)} · ${safeText(player.sourceTeamName)}</p>
            <h3>${safeText(playerName(player))}</h3>
            <p>${safeText(playerEnglishName(player))}</p>
            <div class="candidate-meta">
              <span class="tag">原始位置 ${safeText(posLabel(player.pos))}${player.pos2 ? ` / ${safeText(posLabel(player.pos2))}` : ''}</span>
              <span class="tag gold">场均 ${safeText(playerAveragesLine(player))}</span>
              <span class="tag">可打 ${safeText(describePositions(options))}</span>
            </div>
          </div>
        </article>
        <div class="position-choice-grid">
          ${POSITION_SLOTS.map(slot => {
            const filled = getSelectedBySlot(slot.id);
            const eligible = options.includes(slot.id);
            return `
              <button class="position-choice ${eligible && !filled ? 'available' : ''}" type="button" ${eligible && !filled ? `data-position-choice="${slot.id}"` : 'disabled'}>
                <strong>${safeText(slot.short)}</strong>
                <span>${filled ? `已占用：${safeText(playerName(filled))}` : eligible ? slot.name : '不可落位'}</span>
              </button>
            `;
          }).join('')}
        </div>
        ${renderCourtBoard(player)}
      </div>
    `;
  }

  function renderCoachChoices() {
    if (state.busy && !state.coachChoices.length) return '';
    return `
      <div class="coach-grid">
        ${state.coachChoices.map((coach, index) => {
          const summary = coachProfileSummary(coach);
          const teamName = coach.teamMeta?.z || getTeam(coach.teamId)?.z || `${state.challengeYear} 教练池`;
          return `
            <button class="coach-card" type="button" data-coach-choice="${index}">
              <svg class="coach-tactic-svg" viewBox="0 0 180 86" aria-hidden="true" focusable="false">
                <rect x="8" y="8" width="164" height="70" rx="10" />
                <path d="M90 8v70M34 26h44M34 60h44M102 26c18-14 38-14 54 0M104 60c18 14 38 14 54 0" />
                <circle cx="42" cy="26" r="5" /><circle cx="72" cy="60" r="5" /><circle cx="118" cy="31" r="5" /><circle cx="148" cy="55" r="5" />
              </svg>
              <div class="coach-card-head">
                <div>
                  <p>${safeText(teamName)}</p>
                  <h3>${safeText(coach.name)}</h3>
                </div>
                <span class="tag gold">${safeText(summary.fx.systemLabel)}</span>
              </div>
              <p class="coach-summary">${safeText(summary.fx.systemSummary || summary.fx.secondaryLean)}</p>
              <div class="impact-list">
                <span><strong>强化</strong>${safeText(summary.buffs.join(' / '))}</span>
                <span><strong>削弱</strong>${safeText(summary.nerfs.join(' / '))}</span>
              </div>
            </button>
          `;
        }).join('')}
      </div>
    `;
  }

  function renderReadyPanel() {
    const coach = state.selectedCoach;
    const summary = coachProfileSummary(coach);
    return `
      <div class="ready-panel">
        <h3>阵容、落位和教练已锁定</h3>
        <p>${safeText(coach.name)} 的 ${safeText(summary.fx.systemLabel)} 会在模拟前调整首发属性，并作为 82-0 挑战队主教练参与 ${state.challengeYear} 赛季模拟。</p>
        <div class="impact-list">
          <span><strong>强化</strong>${safeText(summary.buffs.join(' / '))}</span>
          <span><strong>削弱</strong>${safeText(summary.nerfs.join(' / '))}</span>
        </div>
      </div>
    `;
  }

  function renderDraftStage() {
    let html = '';
    if (state.stage === 'player_select') html = renderPlayerChoices();
    else if (state.stage === 'position_select') html = renderPositionChoices();
    else if (state.stage === 'coach_select') html = renderCoachChoices();
    else if (state.stage === 'ready_to_simulate' || state.stage === 'results') html = renderReadyPanel();

    if (html) {
      el.emptyState.hidden = true;
      el.candidateGrid.innerHTML = html;
    } else {
      el.candidateGrid.innerHTML = '';
      el.emptyState.hidden = false;
      if (state.busy && state.stage === 'coach_select') {
        el.emptyState.innerHTML = renderEmptyScout(`读取 ${state.challengeYear} 教练池`, '战术板会强化或削弱不同类型球员。');
      } else {
        el.emptyState.innerHTML = renderEmptyScout();
      }
    }

    el.candidateGrid.querySelectorAll('[data-pick]').forEach(btn => {
      btn.addEventListener('click', () => selectCandidate(parseNum(btn.getAttribute('data-pick'), -1)));
    });
    el.candidateGrid.querySelectorAll('[data-position-choice]').forEach(btn => {
      btn.addEventListener('click', () => choosePosition(parseNum(btn.getAttribute('data-position-choice'), 0)));
    });
    el.candidateGrid.querySelectorAll('[data-coach-choice]').forEach(btn => {
      btn.addEventListener('click', () => selectCoach(parseNum(btn.getAttribute('data-coach-choice'), -1)));
    });
  }

  function renderLineup() {
    el.lineupList.innerHTML = POSITION_SLOTS.map(slot => {
      const player = getSelectedBySlot(slot.id);
      const fit = player && state.selectedCoach ? coachImpactForPlayer(player, state.selectedCoach) : null;
      return `
        <div class="lineup-slot ${player ? 'filled' : ''}">
          <div class="slot-pos">${safeText(slot.short)}</div>
          <div class="slot-name">
            <strong>${player ? safeText(playerName(player)) : '未选择'}</strong>
            <span>${player ? `${safeText(player.sourceLabel)} · ${safeText(player.sourceTeamName)}${fit ? ` · ${safeText(fit.label)}` : ''}` : safeText(slot.name)}</span>
          </div>
          <div class="slot-rating" style="font-size:12px; font-weight:800; white-space:nowrap;">${player ? safeText(playerAveragesLine(player)) : '--'}</div>
        </div>
      `;
    }).join('');

    if (selectedCount() >= 5) {
      const lineupForReview = state.selectedCoach
        ? state.selected.map(player => applyCoachTacticalFit(player, state.selectedCoach))
        : state.selected;
      const profile = analyzeLineup(lineupForReview);
      const coachCopy = state.selectedCoach ? `，教练：${state.selectedCoach.name}` : '，等待教练选择';
      const realAverages = lineupForReview.map(getPlayerAverages).filter(Boolean);
      const totalPts = sumAverageStat(realAverages, 'pts').toFixed(1);
      const totalReb = sumAverageStat(realAverages, 'reb').toFixed(1);
      const totalAst = sumAverageStat(realAverages, 'ast').toFixed(1);
      const stockSummary = lineupStockSummary(realAverages);
      el.lineupSummary.innerHTML = `首发合计场均 <strong>${totalPts}分 ${totalReb}板 ${totalAst}助${safeText(stockSummary)}</strong>，进攻 <strong>${profile.offense}</strong>，防守 <strong>${profile.defense}</strong>${safeText(coachCopy)}。标签：${safeText(profile.tags.join(' / '))}`;
    } else {
      el.lineupSummary.textContent = `已选 ${selectedCount()} / 5。每轮先抽来源、选球员，再选择位置。`;
    }
  }

  function renderAll() {
    renderStatus();
    renderDraftStage();
    renderLineup();
    setButtons();
  }

  function buildTeamOptions() {
    ensureFantasyTeamShell();
  }

  function resetLeagueGameState(targetTeamId) {
    G.phase = 'season';
    G.player.name = '';
    G.team = null;
    G.teamId = 0;
    G.startYear = state.challengeYear;
    G.year = state.challengeYear;
    G.season = 1;
    G.gameNum = 0;
    G.dayNum = 0;
    G.totalGames = 82;
    G.seasonDays = 180;
    G.gameDays = [];
    G.schedule = [];
    G.results = [];
    G.news = [];
    G.phone = [];
    G.events = [];
    G.careerStats = [];
    G.awards = [];
    G.allAwards = [];
    G.leagueAwards = [];
    G.playoffs = typeof defaultPlayoffState === 'function' ? defaultPlayoffState() : { active: false, champion: false };
    G.seasonStats = { pts: 0, reb: 0, ast: 0, stl: 0, blk: 0, tov: 0, mins: 0, fgm: 0, fga: 0, tpm: 0, tpa: 0, ftm: 0, fta: 0, gp: 0, wins: 0, losses: 0 };
    G._fantasyChallengeTargetTeamId = targetTeamId;
  }

  function makeFantasyPlayer(player, targetTeamId, index) {
    const slot = POSITION_SLOTS.find(item => item.id === parseNum(player.chosenSlotId, 0)) || POSITION_SLOTS[index];
    const adjusted = applyCoachTacticalFit(player, state.selectedCoach);
    const out = {
      ...clone(adjusted),
      id: 820000 + index + 1,
      uid: `fantasy_starter_${slot.short.toLowerCase()}`,
      teamId: targetTeamId,
      pos: slot.id,
      pos2: parseNum(player.pos, 0) === slot.id ? parseNum(player.pos2, 0) : parseNum(player.pos, 0),
      chosenSlotId: slot.id,
      chosenSlotShort: slot.short,
      fantasyStarter: true,
      injury: { active: false, games: 0, type: '' }
    };
    out.rating = ratingOf(out);
    out.att = parseNum(out.att, calcPlayerAtt(out.attrs || {}));
    out.def = parseNum(out.def, calcPlayerDef(out.attrs || {}));
    return out;
  }

  function buildForcedRotation(starters, benchPool) {
    const starterMinutes = [37, 36, 35, 35, 34];
    const benchMinutes = [24, 16, 12, 8, 3];
    const rotation = starters.map((player, index) => {
      const slot = POSITION_SLOTS.find(item => item.id === parseNum(player.chosenSlotId, 0)) || POSITION_SLOTS[index];
      return {
        id: player.id,
        name: playerName(player),
        pos: slot.id,
        pos2: parseNum(player.pos2, 0),
        slotPos: slot.id,
        rotationRole: 'starter',
        teamTier: index === 0 ? 'alpha' : index === 1 ? 'second' : index === 2 ? 'third' : 'rolestarter',
        minutes: starterMinutes[index],
        rating: ratingOf(player),
        roleScore: ratingOf(player),
        photo: player.photo,
        avatar: player.avatar || '',
        image: player.image,
        isSelf: false,
        fantasyStarter: true
      };
    });

    benchPool.slice(0, 5).forEach((player, index) => {
      rotation.push({
        id: player.id,
        name: playerName(player),
        pos: parseNum(player.pos, 3),
        pos2: parseNum(player.pos2, 0),
        slotPos: 0,
        rotationRole: index === 0 ? 'sixth' : 'role',
        teamTier: index === 0 ? 'sixthman' : 'bench',
        minutes: benchMinutes[index] || 6,
        rating: ratingOf(player),
        roleScore: ratingOf(player),
        photo: player.photo,
        avatar: player.avatar || '',
        image: player.image,
        isSelf: false
      });
    });
    normalizeRotationMinutes(rotation, 240);
    return rotation;
  }

  function buildExpansionBench(targetTeamId, starterIds) {
    const used = new Set([...starterIds].map(String));
    const pool = Object.entries(LEAGUE.teams || {})
      .filter(([teamId]) => parseNum(teamId, 0) !== targetTeamId)
      .flatMap(([, teamObj]) => Array.isArray(teamObj?.players) ? teamObj.players : [])
      .filter(player => player && !used.has(String(player.id)))
      .sort((a, b) => roleScoreForPlayer(b) - roleScoreForPlayer(a));
    const middle = pool.slice(150, 160).length >= 5 ? pool.slice(150, 160) : pool.slice(-10);
    return middle.slice(0, 5).map((player, index) => {
      const out = clone(player);
      out.id = 821000 + index + 1;
      out.uid = `fantasy_bench_${index + 1}`;
      out.teamId = targetTeamId;
      out.fantasyBench = true;
      out.injury = { active: false, games: 0, type: '' };
      return out;
    });
  }

  function installFantasyTeam(targetTeamId) {
    const teamObj = ensureFantasyTeamShell();
    const starters = POSITION_SLOTS
      .map(slot => getSelectedBySlot(slot.id))
      .filter(Boolean)
      .map((player, index) => makeFantasyPlayer(player, targetTeamId, index));
    const benchPool = buildExpansionBench(targetTeamId, new Set(starters.map(player => player.originalId || player.id)));

    teamObj.players = [...starters, ...benchPool];
    teamObj.meta = { ...FANTASY_TEAM_META };
    if (state.selectedCoach) {
      const assignedCoach = normalizeCoachChoice(state.selectedCoach, 0);
      assignedCoach.teamId = targetTeamId;
      assignedCoach.team = teamObj.meta.z;
      assignedCoach.teamMeta = teamObj.meta;
      teamObj.coach = assignedCoach;
    }
    const forcedRotation = buildForcedRotation(starters, benchPool);
    teamObj.rotation = forcedRotation;
    teamObj.strength = calcTeamStrength(teamObj);

    return { teamObj, starters, benchPool, forcedRotation, coach: teamObj.coach };
  }

  function buildSeasonRoundPairs(rounds = 82, challengeTeamId = FANTASY_TEAM_ID) {
    const ids = TEAMS.map(t => t.id).filter(id => parseNum(id, 0) !== parseNum(challengeTeamId, 0));
    const opponentOrder = shuffle(ids);
    const out = [];
    for (let round = 0; round < rounds; round++) {
      const opponent = opponentOrder[round % opponentOrder.length];
      const shuffled = shuffle(ids.filter(id => id !== opponent));
      const pairs = [];
      const challengeHome = round % 2 === 0;
      pairs.push({
        homeTeamId: challengeHome ? challengeTeamId : opponent,
        awayTeamId: challengeHome ? opponent : challengeTeamId
      });
      for (let i = 0; i + 1 < shuffled.length - 1; i += 2) {
        const a = shuffled[i];
        const b = shuffled[i + 1];
        const homeFirst = (round + i) % 2 === 0;
        pairs.push({ homeTeamId: homeFirst ? a : b, awayTeamId: homeFirst ? b : a });
      }
      out.push(pairs);
    }
    return out;
  }

  function updateSimProgress(round, total, extraText = '') {
    const pctValue = Math.round(round / total * 100);
    el.simStatus.textContent = extraText ? `第 ${Math.min(round, total)} 场: ${extraText}` : `正在模拟第 ${Math.min(round, total)} / ${total} 场`;
    el.simPercent.textContent = `${pctValue}%`;
    el.simProgressBar.style.width = `${pctValue}%`;
  }

  function selectedStatRows(targetTeamId, selectedPlayers) {
    const rows = getLeaguePlayerSeasonRows();
    return selectedPlayers.map(player => {
      const row = rows.find(item => parseNum(item.teamId, 0) === targetTeamId && String(item.playerId) === String(player.id));
      const gp = Math.max(1, parseNum(row?.gp, 0));
      const rawFgPct = parseNum(row?.fga, 0) > 0 ? +(parseNum(row?.fgm, 0) / parseNum(row?.fga, 1) * 100).toFixed(1) : '--';
      const totalTpa = parseNum(row?.tpa, 0);
      const totalTpm = parseNum(row?.tpm, 0);
      const tpaPerGame = +(totalTpa / gp).toFixed(1);
      const rawTpPct = totalTpa > 0 ? +(totalTpm / totalTpa * 100).toFixed(1) : null;
      return {
        player,
        row,
        gp: parseNum(row?.gp, 0),
        ppg: +(parseNum(row?.pts, 0) / gp).toFixed(1),
        rpg: +(parseNum(row?.reb, 0) / gp).toFixed(1),
        apg: +(parseNum(row?.ast, 0) / gp).toFixed(1),
        spg: +(parseNum(row?.stl, 0) / gp).toFixed(1),
        bpg: +(parseNum(row?.blk, 0) / gp).toFixed(1),
        fgPct: rawFgPct,
        tpPct: rawTpPct == null ? '--' : rawTpPct,
        tpPctValue: rawTpPct,
        tpa: totalTpa,
        tpm: totalTpm,
        tpaPerGame
      };
    });
  }

  function isThreeBlackHole(item) {
    const attempts = parseNum(item?.tpaPerGame, 0);
    const pct = parseNum(item?.tpPctValue, NaN);
    return attempts >= 2 && Number.isFinite(pct) && pct < 30;
  }

  async function runFantasySeason() {
    if (state.busy || selectedCount() < 5 || !state.selectedCoach) return;
    state.busy = true;
    state.stage = 'simulating';
    switchScreen('results');
    setButtons();
    el.simulationPanel.hidden = false;
    el.resultsGrid.innerHTML = '';
    updateSimProgress(0, 82);

    const targetTeamId = FANTASY_TEAM_ID;
    let originalBuildDynamic = null;
    try {
      el.simStatus.textContent = `加载 ${state.challengeYear} 名单`;
      await loadLeagueData({ startYear: state.challengeYear, strictRoster: true });
      ensureFantasyTeamShell();
      resetLeagueGameState(targetTeamId);
      const fantasy = installFantasyTeam(targetTeamId);
      originalBuildDynamic = buildDynamicTeamRotation;
      buildDynamicTeamRotation = function fantasyBuildDynamicTeamRotation(teamId, opts) {
        if (parseNum(teamId, 0) === targetTeamId) return clone(fantasy.forcedRotation);
        return originalBuildDynamic(teamId, opts);
      };
      initLeagueSeasonState();
      fantasy.teamObj.rotation = fantasy.forcedRotation;
      fantasy.teamObj.strength = calcTeamStrength(fantasy.teamObj);

      const rounds = buildSeasonRoundPairs(82, targetTeamId);
      for (let roundIndex = 0; roundIndex < rounds.length; roundIndex++) {
        const pairs = rounds[roundIndex];
        pairs.forEach(pair => {
          simulateLeagueMatchup(pair.homeTeamId, pair.awayTeamId, {
            roundIndex,
            season: 1,
            year: state.challengeYear,
            phase: 'regular',
            userTeamId: targetTeamId
          });
        });
        if (roundIndex % 2 === 0 || roundIndex === rounds.length - 1) {
          const teamResults = G.results.filter(r => r.awayId === targetTeamId || r.homeId === targetTeamId);
          const latest = teamResults[teamResults.length - 1];
          let extraText = '';
          if (latest) {
             const isHome = latest.homeId === targetTeamId;
             const oppName = getTeam(isHome ? latest.awayId : latest.homeId)?.z || '对手';
             const myScore = isHome ? latest.homeScore : latest.awayScore;
             const oppScore = isHome ? latest.awayScore : latest.homeScore;
             const wl = myScore > oppScore ? 'W' : 'L';
             extraText = `${wl} vs ${oppName} ${myScore}-${oppScore}`;
          }
          updateSimProgress(roundIndex + 1, rounds.length, extraText);
          await new Promise(resolve => setTimeout(resolve, 30));
        }
      }

      const awards = leagueAwardEntryForSeason(1);
      const standings = getLeagueTeamRecordsArray()
        .sort((a, b) => b.pct - a.pct || b.w - a.w || (b.pf - b.pa) - (a.pf - a.pa));
      const challengeRecord = standings.find(row => row.id === targetTeamId);
      const coachEffects = coachEffectsFor(fantasy.coach);
      const result = {
        targetTeamId,
        targetTeam: fantasy.teamObj.meta,
        selectedStats: selectedStatRows(targetTeamId, fantasy.starters),
        standings,
        awards,
        challengeRecord,
        lineupProfile: analyzeLineup(fantasy.starters),
        coach: fantasy.coach,
        coachEffects,
        gameCount: getLeagueGameDetails({ phase: 'regular' }).length
      };
      state.result = result;
      state.stage = 'results';
      renderResults(result);
      renderAll();
    } catch (err) {
      console.error(err);
      state.stage = 'ready_to_simulate';
      el.resultsGrid.innerHTML = `<div class="result-card full"><h3>模拟失败</h3><p>${safeText(err.message || err)}</p></div>`;
    } finally {
      if (originalBuildDynamic) buildDynamicTeamRotation = originalBuildDynamic;
      state.busy = false;
      setButtons();
    }
  }

  function analyzeLineup(players) {
    const list = Array.isArray(players) ? players : [];
    const avg = (fn) => list.length ? list.reduce((sum, player) => sum + parseNum(fn(player), 0), 0) / list.length : 0;
    const rating = avg(player => ratingOf(player));
    const offense = avg(player => parseNum(player.att, calcPlayerAtt(player.attrs || {})));
    const defense = avg(player => parseNum(player.def, calcPlayerDef(player.attrs || {})));
    const spacing = avg(player => parseNum(player.attrs?.shotExt, 55));
    const creation = avg(player => parseNum(player.attrs?.pass, 55));
    const rebounding = avg(player => parseNum(player.attrs?.reb, 55));
    const stocks = avg(player => (parseNum(player.attrs?.stl, 55) + parseNum(player.attrs?.blk, 55)) / 2);
    const tags = [];
    if (rating >= 88) tags.push('历史级天赋');
    else if (rating >= 82) tags.push('争冠核心');
    else tags.push('需要爆冷');
    if (spacing >= 82) tags.push('空间优秀');
    if (creation >= 80) tags.push('传控稳定');
    if (rebounding >= 82) tags.push('篮板压制');
    if (stocks >= 80) tags.push('防守事件多');
    if (!tags.some(tag => /空间|传控|篮板|防守/.test(tag))) tags.push('结构偏均衡');
    return {
      avgRating: +rating.toFixed(1),
      offense: +offense.toFixed(1),
      defense: +defense.toFixed(1),
      spacing: +spacing.toFixed(1),
      creation: +creation.toFixed(1),
      rebounding: +rebounding.toFixed(1),
      stocks: +stocks.toFixed(1),
      tags
    };
  }

  function buildStrengthReview(result) {
    const record = result.challengeRecord || {};
    const profile = result.lineupProfile;
    const rank = result.standings.findIndex(row => row.id === result.targetTeamId) + 1;
    const positives = [];
    const negatives = [];
    const coachFx = result.coachEffects || {};
    const avgFit = result.selectedStats.length
      ? result.selectedStats.reduce((sum, item) => sum + parseNum(item.player.coachFit?.score, 0), 0) / result.selectedStats.length
      : 0;

    const getPos = posShort => result.selectedStats.find(s => s.player.chosenSlotShort === posShort)?.player;
    const pg = getPos('PG');
    const sg = getPos('SG');
    const sf = getPos('SF');
    const pf = getPos('PF');
    const c = getPos('C');

    if (profile.avgRating >= 88) positives.push(`首发个人能力足以碾压大多数 ${state.challengeYear} 常规赛对手。`);
    if (profile.spacing >= 82) positives.push('外线空间拉满，模拟中更容易打出高进攻效率。');
    if (profile.creation >= 80) positives.push('持球和传导稳定，减少了单点哑火风险。');
    if (profile.rebounding >= 82) positives.push('篮板优势能把随机手感波动转成更多二次进攻。');
    if (profile.stocks >= 80) positives.push('抢断和盖帽覆盖好，能在僵持局里制造额外回合。');
    if (avgFit >= 2) positives.push(`${result.coach?.name || '主教练'} 的 ${coachFx.systemLabel || '体系'} 与首发适配度高，强化点能直接进入模拟。`);
    if (coachFx.threeRateMult >= 1.08) positives.push('教练鼓励外线和空间，适合三分与持球点多的阵容。');
    if (coachFx.paintRateMult >= 1.08) positives.push('教练强调内线回合，能放大终结和篮板优势。');

    // Advanced Positional Evaluation
    if (pg && sg && pg.att >= 85 && sg.att >= 85) positives.push('【后场双枪】后场进攻火力冠绝联盟，能够轻易撕碎对手防线。');
    if (c && c.def >= 88) positives.push('【禁区大闸】拥有绝对的禁区防守核心，内线固若金汤。');
    if (sf && pf && sf.def >= 80 && pf.def >= 80 && sf.att >= 80 && pf.att >= 80) positives.push('【全能锋线群】锋线群攻防一体，极具现代篮球的换防与冲击力。');
    if (pg && (pg.attrs?.pass >= 85 || pg.att >= 85) && c && c.att >= 85) positives.push('【内外连线】强力控卫与内线猛兽的组合，挡拆战术极具杀伤力。');
    if (pg && sg && sf && pf && c && [pg, sg, sf, pf, c].every(p => p.att >= 80)) positives.push('【五星连珠】首发五人皆有出色的得分能力，对手防不胜防。');

    if (profile.spacing < 74) negatives.push('【空间拥挤】三分投射极差，面对强队护框时进攻严重受阻。');
    else if (profile.spacing < 80) negatives.push('【外线不足】外线火力一般，可能遇到得分荒。');

    if (profile.creation < 74) negatives.push('【组织便秘】缺乏有效的传导球，进攻过于依赖单打。');
    if (profile.rebounding < 74) negatives.push('【篮板失控】内线完全失守，会被对手打出大量二次进攻。');
    if (profile.stocks < 74) negatives.push('【防守疲软】防守端无法制造压迫，极容易被一波流带走。');
    if (avgFit <= -1) negatives.push('【体系冲突】教练体系压制了首发的自然打法，严重影响化学反应。');
    if (parseNum(coachFx.threeRateMult, 1) <= 0.95 && profile.spacing >= 82) negatives.push('教练减少外线权重，压低了这套空间型阵容的进攻上限。');
    if (parseNum(record.w, 0) < 82) negatives.push('82 场全胜容错为零，即便强队也会被赛程疲劳和单场波动击穿。');

    if (pg && pg.attrs && pg.attrs.pass < 75 && pg.att < 80) negatives.push('【缺乏大脑】首发控卫组织和进攻偏弱，极容易被强队针对。');
    if (c && c.def < 75) negatives.push('【万人捅】首发中锋护框能力堪忧，禁区形同虚设。');

    if (!positives.length) positives.push('阵容没有明显断点，整体实力均衡。');
    if (!negatives.length) negatives.push('没有明显的阵容缺陷，主要风险来自单场随机性。');
    return { rank, positives, negatives };
  }

  function renderResults(result) {
    const record = result.challengeRecord || { w: 0, l: 0, pct: 0 };
    const review = buildStrengthReview(result);
    const hit = parseNum(record.w, 0) >= 82;
    const awards = result.awards || {};
    const awardRows = [
      ['MVP', awards.mvp],
      ['DPOY', awards.dpoy],
      ['ROY', awards.roy],
      ['得分王', awards.scoring],
      ['篮板王', awards.rebound],
      ['助攻王', awards.assist],
      ['最佳第六人', awards.sixthMan]
    ];
    const coachSummary = coachProfileSummary(result.coach);

    el.resultsGrid.innerHTML = `
      <article class="result-card">
        <h3>挑战结果</h3>
        <div class="record-number ${hit ? 'win' : 'miss'}">${parseNum(record.w, 0)}-${parseNum(record.l, 0)}</div>
        <p>${hit ? '完成 82 胜挑战。' : `玩家球队排名第 ${review.rank}，距离 82 胜还差 ${82 - parseNum(record.w, 0)} 场。`}</p>
        <p>本次共模拟 ${parseNum(result.gameCount, 0)} 场常规赛。</p>
      </article>

      <article class="result-card">
        <h3>阵容评级</h3>
        <ul class="compact-list">
          <li><span>平均 OVR</span><strong>${result.lineupProfile.avgRating}</strong></li>
          <li><span>进攻</span><strong>${result.lineupProfile.offense}</strong></li>
          <li><span>防守</span><strong>${result.lineupProfile.defense}</strong></li>
          <li><span>标签</span><strong>${safeText(result.lineupProfile.tags.join(' / '))}</strong></li>
        </ul>
      </article>

      <article class="result-card">
        <h3>教练战术</h3>
        <div class="coach-result">
          <strong>${safeText(result.coach?.name || '主教练')}</strong>
          <span>${safeText(coachSummary.fx.systemLabel)} · ${safeText(coachSummary.fx.secondaryLean)}</span>
        </div>
        <div class="impact-list">
          <span><strong>强化</strong>${safeText(coachSummary.buffs.join(' / '))}</span>
          <span><strong>削弱</strong>${safeText(coachSummary.nerfs.join(' / '))}</span>
        </div>
      </article>

      <article class="result-card">
        <h3>赛季奖项</h3>
        ${awardRows.map(([label, item]) => `
          <div class="award-row"><span>${safeText(label)}</span><strong>${item ? `${safeText(item.name)} · ${safeText(item.team)}` : '--'}</strong></div>
        `).join('')}
      </article>

      <article class="result-card wide">
        <h3>五人赛季数据</h3>
        <div class="tbl">
          <table>
            <thead><tr><th>位置</th><th>球员</th><th>来源</th><th>战术适配</th><th>GP</th><th>PTS</th><th>REB</th><th>AST</th><th>STL</th><th>BLK</th><th>FG%</th><th>3P%</th><th>3PA</th></tr></thead>
            <tbody>
              ${result.selectedStats.map(item => {
                const attrs = item.player.attrs || {};
                const wTags = [];
                if (isThreeBlackHole(item)) wTags.push('三分黑洞');
                if (item.player.def < 65) wTags.push('防守漏勺');
                if (parseNum(attrs.pass, 55) < 65 && item.player.chosenSlotShort === 'PG') wTags.push('缺乏视野');
                if (parseNum(attrs.reb, 55) < 65 && (item.player.chosenSlotShort === 'C' || item.player.chosenSlotShort === 'PF')) wTags.push('篮板弱点');
                if (parseNum(item.player.coachFit?.score, 0) < -1) wTags.push('体系冲突');
                const wHtml = wTags.map(t => `<span class="weakness-tag">${t}</span>`).join('');
                return `
                <tr>
                  <td>${safeText(item.player.chosenSlotShort)}</td>
                  <td>${safeText(playerName(item.player))}${wHtml}</td>
                  <td>${safeText(item.player.sourceLabel)} ${safeText(item.player.sourceTeamName)}</td>
                  <td>${safeText(item.player.coachFit?.label || '--')}</td>
                  <td>${item.gp}</td>
                  <td>${item.ppg}</td>
                  <td>${item.rpg}</td>
                  <td>${item.apg}</td>
                  <td>${item.spg}</td>
                  <td>${item.bpg}</td>
                  <td>${item.fgPct}</td>
                  <td>${item.tpPct}</td>
                  <td>${item.tpaPerGame}</td>
                </tr>
              `;}).join('')}
            </tbody>
          </table>
        </div>
      </article>

      <article class="result-card">
        <h3>系统评价</h3>
        <div class="strength-copy">
          <div><strong>优点：</strong>${safeText(review.positives.join(' '))}</div>
          <div><strong>缺点：</strong>${safeText(review.negatives.join(' '))}</div>
        </div>
      </article>

      <article class="result-card full">
        <h3>玩家球队排名</h3>
        <div class="team-rank-summary">
          ${(() => {
            const row = result.challengeRecord || {};
            const gp = Math.max(1, parseNum(row.gp, 0));
            const pf = parseNum(row.pf, 0) / gp;
            const pa = parseNum(row.pa, 0) / gp;
            return `
              <div><span>玩家排名</span><strong>#${review.rank} / ${result.standings.length}</strong></div>
              <div><span>战绩</span><strong>${parseNum(row.w, 0)}-${parseNum(row.l, 0)}</strong></div>
              <div><span>胜率</span><strong>${(parseNum(row.pct, 0) * 100).toFixed(1)}%</strong></div>
              <div><span>场均得失</span><strong>${pf.toFixed(1)} / ${pa.toFixed(1)}</strong></div>
              <div><span>净胜分</span><strong>${(pf - pa).toFixed(1)}</strong></div>
            `;
          })()}
        </div>
      </article>
    `;
  }

  function renderGameToText() {
    return JSON.stringify({
      mode: state.result ? 'results' : state.stage,
      coordinateSystem: 'DOM layout, no canvas coordinates',
      round: currentRoundNumber(),
      selected: POSITION_SLOTS.map(slot => {
        const player = getSelectedBySlot(slot.id);
        return player ? {
          slot: slot.short,
          name: playerName(player),
          sourceYear: player.sourceLabel,
          statsYear: player.sourceStatsYear,
          sourceTeam: player.sourceTeamName,
          rating: ratingOf(player),
          coachFit: state.selectedCoach ? coachImpactForPlayer(player, state.selectedCoach).label : null
        } : { slot: slot.short, empty: true };
      }),
      pendingPlayer: state.pendingPlayer ? {
        name: playerName(state.pendingPlayer),
        sourceYear: state.pendingPlayer.sourceLabel,
        statsYear: state.pendingPlayer.sourceStatsYear,
        sourceTeam: state.pendingPlayer.sourceTeamName,
        positionOptions: positionOptionsForPlayer(state.pendingPlayer).map(posLabel)
      } : null,
      pool: state.currentPool ? {
        year: state.currentPool.season.label,
        team: state.currentPool.team.z,
        candidates: state.currentPool.candidates.map(player => ({
          name: playerName(player),
          positions: describePositions(player.positionOptions || []),
          rating: ratingOf(player),
          statsYear: player.sourceStatsYear,
          averages: getPlayerAverages(player)
        }))
      } : null,
      coachChoices: state.stage === 'coach_select' ? state.coachChoices.map(coach => ({
        name: coach.name,
        system: coachProfileSummary(coach).fx.systemLabel
      })) : [],
      selectedCoach: state.selectedCoach ? {
        name: state.selectedCoach.name,
        system: coachProfileSummary(state.selectedCoach).fx.systemLabel
      } : null,
      rerolls: {
        year: state.yearRerollsLeft,
        team: state.teamRerollsLeft
      },
      result: state.result ? {
        record: `${state.result.challengeRecord?.w || 0}-${state.result.challengeRecord?.l || 0}`,
        rank: state.result.standings.findIndex(row => row.id === state.result.targetTeamId) + 1,
        awards: {
          mvp: state.result.awards?.mvp?.name || null,
          dpoy: state.result.awards?.dpoy?.name || null
        }
      } : null
    });
  }

  function resetChallenge() {
    state.stage = 'spin';
    state.selected = [];
    state.pendingPlayer = null;
    state.currentPool = null;
    state.yearRerollsLeft = 1;
    state.teamRerollsLeft = 1;
    state.coachChoices = [];
    state.selectedCoach = null;
    state.busy = false;
    state.autoRolling = false;
    state.result = null;
    el.resultsGrid.innerHTML = '';
    el.simulationPanel.hidden = true;
    el.simPercent.textContent = '0%';
    el.simProgressBar.style.width = '0%';
    el.simStatus.textContent = '等待模拟';
    switchScreen('main_menu');
    renderAll();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function startCareer() {
    if (historicalStatsPromise) {
      const origText = el.startGameBtn.textContent;
      el.startGameBtn.textContent = '加载数据中...';
      el.startGameBtn.disabled = true;
      await historicalStatsPromise;
      el.startGameBtn.textContent = origText;
      el.startGameBtn.disabled = false;
    }
    switchScreen('draft_room');
    rollTeamYear();
  }

  function bind() {
    historicalStatsPromise = fetch('assets/data/historical_season_stats.json?v=20260629realstats')
      .then(r => r.json())
      .then(data => { historicalSeasonStats = data; })
      .catch(() => { historicalSeasonStats = null; });

    buildTeamOptions();
    switchScreen('main_menu');
    renderAll();
    el.startGameBtn.addEventListener('click', startCareer);
    el.backToMenuBtn.addEventListener('click', () => {
      if (state.stage !== 'spin' && !confirm('返回主菜单将重置当前挑战进度，确定吗？')) return;
      resetChallenge();
    });

    document.querySelectorAll('.era-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.era-btn').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        state.challengeYear = parseNum(e.currentTarget.getAttribute('data-year'), 2025);
        if(el.challengeYearHeader) el.challengeYearHeader.textContent = state.challengeYear;
        if(el.rosterYearText) el.rosterYearText.textContent = state.challengeYear;
        if(el.resultYearText) el.resultYearText.textContent = state.challengeYear;
      });
    });

    el.rollButton.addEventListener('click', () => rollTeamYear());
    el.rerollYearButton.addEventListener('click', () => {
      if (state.yearRerollsLeft > 0 && state.currentPool && state.stage === 'player_select') rollTeamYear({ rerollType: 'year' });
    });
    el.rerollTeamButton.addEventListener('click', () => {
      if (state.teamRerollsLeft > 0 && state.currentPool && state.stage === 'player_select') rollTeamYear({ rerollType: 'team' });
    });
    el.simulateButton.addEventListener('click', runFantasySeason);
    el.restartButton.addEventListener('click', resetChallenge);
    window.render_game_to_text = renderGameToText;
    window.advanceTime = () => {
      renderAll();
      if (state.result) renderResults(state.result);
    };
  }

  bind();
})();
