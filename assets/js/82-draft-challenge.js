(function () {
  const POSITION_SLOTS = [
    { id: 1, short: 'PG', name: '控球后卫' },
    { id: 2, short: 'SG', name: '得分后卫' },
    { id: 3, short: 'SF', name: '小前锋' },
    { id: 4, short: 'PF', name: '大前锋' },
    { id: 5, short: 'C', name: '中锋' }
  ];

  const ROSTER_SEASONS = [
    { code: 1, year: 2025, label: '2025' },
    { code: 2, year: 2024, label: '2024' },
    { code: 3, year: 2023, label: '2023' },
    { code: 4, year: 2022, label: '2022' },
    { code: 5, year: 2021, label: '2021' },
    { code: 6, year: 2020, label: '2020' },
    { code: 7, year: 2019, label: '2019' },
    { code: 8, year: 2018, label: '2018' },
    { code: 9, year: 2017, label: '2017' },
    { code: 10, year: 2016, label: '2016' },
    { code: 11, year: 2011, label: '2011' },
    { code: 12, year: 2009, label: '2009' },
    { code: 13, year: 2005, label: '2005' },
    { code: 14, year: 2003, label: '2003' },
    { code: 15, year: 1996, label: '1996' },
    { code: 16, year: 1984, label: '1984' },
    { code: 17, year: 1971, label: '1971' },
    { code: 19, year: 1959, label: '1959' }
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
    1: 1946, 2: 1976, 3: 1946, 4: 1946, 5: 1995,
    6: 1966, 7: 1970, 8: 1948, 9: 1976, 10: 1968,
    11: 1949, 12: 1988, 13: 1988, 14: 1989, 15: 1961,
    16: 1976, 17: 1989, 18: 1967, 19: 1970, 20: 1974,
    21: 1946, 22: 1970, 23: 1947, 24: 1968, 25: 1948,
    26: 1980, 27: 1967, 28: 1995, 29: 2002, 30: 1976
  };

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
    rerollsLeft: 1,
    rosterCache: new Map(),
    coachChoices: [],
    selectedCoach: null,
    busy: false,
    result: null
  };

  const el = {
    currentSlotLabel: document.getElementById('currentSlotLabel'),
    sourceLabel: document.getElementById('sourceLabel'),
    rerollLabel: document.getElementById('rerollLabel'),
    roundKicker: document.getElementById('roundKicker'),
    poolTitle: document.getElementById('poolTitle'),
    rollButton: document.getElementById('rollButton'),
    rerollButton: document.getElementById('rerollButton'),
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
    backToMenuBtn: document.getElementById('backToMenuBtn')
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

  function isTeamAvailableInSeason(teamId, year) {
    const firstYear = TEAM_ACTIVE_FROM_YEAR[parseNum(teamId, 0)];
    return !!firstYear && parseNum(year, 0) >= firstYear;
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
      if (!isTeamAvailableInSeason(teamId, season.year)) return;
      const player = rowToPlayer(row, idx + 1, { teamId });
      player.sourceYear = season.year;
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

  function sampleCandidatePool(pack) {
    const usedKeys = new Set(state.selected.map(sourceKey));
    const eligibleTeams = pack.teams
      .map(bucket => {
        const players = bucket.players
          .filter(player => !usedKeys.has(sourceKey({
            ...player,
            originalId: player.id,
            sourceRosterCode: pack.season.code,
            sourceTeamId: bucket.team.id
          })))
          .filter(player => positionOptionsForPlayer(player).length);
        return { team: bucket.team, players };
      })
      .filter(bucket => bucket.players.length >= 5);

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
          sourceLabel: pack.season.label,
          sourceRosterCode: pack.season.code
        };
        out.positionOptions = positionOptionsForPlayer(out);
        return out;
      });
    return { season: pack.season, team: bucket.team, candidates };
  }

  async function rollTeamYear({ consumeReroll = false } = {}) {
    if (state.busy || selectedCount() >= POSITION_SLOTS.length) return;
    state.busy = true;
    state.stage = 'spin';
    setButtons();
    el.emptyState.hidden = false;
    el.emptyState.innerHTML = '<strong>正在抽取</strong><span>读取项目内名单，随机年份和球队。</span>';
    el.candidateGrid.innerHTML = '';

    try {
      let pool = null;
      const skippedErrors = [];
      for (let attempt = 0; attempt < 42 && !pool; attempt++) {
        const season = pick(ROSTER_SEASONS);
        try {
          const pack = await loadRosterSeason(season);
          pool = sampleCandidatePool(pack);
        } catch (err) {
          if (isLocalFsPermissionError(err)) throw err;
          skippedErrors.push(`${season.label}: ${err.message || err}`);
        }
      }
      if (!pool) {
        const detail = skippedErrors.length ? `；已跳过读取失败赛季：${skippedErrors.slice(0, 3).join(' / ')}` : '';
        throw new Error(`没有找到足够的候选球员${detail}`);
      }
      if (consumeReroll) state.rerollsLeft = Math.max(0, state.rerollsLeft - 1);
      state.currentPool = pool;
      state.pendingPlayer = null;
      state.stage = 'player_select';
      state.result = null;
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
    const pending = {
      ...clone(candidate),
      fantasyId: 820000 + selectedCount() + 1,
      id: candidate.id,
      positionOptions: positionOptionsForPlayer(candidate)
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
      renderAll();
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
      await loadLeagueData({ startYear: 2025, strictRoster: true });
      const pool = (LEAGUE.coaches || [])
        .filter(coach => coach && coach.name)
        .map((coach, index) => normalizeCoachChoice(coach, index));
      const picked = [];
      const usedNames = new Set();
      const pushCoach = (coach) => {
        if (!coach || usedNames.has(String(coach.name))) return;
        usedNames.add(String(coach.name));
        picked.push(coach);
      };
      ['pace_space', 'perimeter_star', 'interior_star', 'defense', 'seven_seconds', 'triangle', 'balance'].forEach(systemId => {
        pushCoach(pool.find(coach => coach.systemId === systemId && !usedNames.has(String(coach.name))));
      });
      shuffle(pool).forEach(pushCoach);

      if (!picked.length) {
        picked.push(normalizeCoachChoice({
          id: 8201,
          name: '临时主教练',
          teamId: FANTASY_TEAM_ID,
          systemId: 'balance',
          baseShotIntPercent: 40,
          baseShotTriplePercent: 40,
          baseOffensive: 40,
          baseDefense: 40,
          techLevel: 0,
          techDev: 0,
          loyalty: 5
        }, 0));
      }
      state.coachChoices = picked.slice(0, 5).map((coach, index) => normalizeCoachChoice(coach, index));
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
      el.poolTitle.textContent = '2025 赛季结果';
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
      el.sourceLabel.textContent = '2025 教练池';
    } else {
      el.sourceLabel.textContent = count >= 5 ? '等待教练选择' : '等待抽取';
    }

    el.rerollLabel.textContent = `${state.rerollsLeft} 次`;
    const wins = state.result?.challengeRecord?.w;
    const losses = state.result?.challengeRecord?.l;
    el.challengeRecord.textContent = Number.isFinite(wins) ? `结果 ${wins}-${losses}` : '目标 82-0';
  }

  function setButtons() {
    const canRoll = state.stage === 'spin' && selectedCount() < POSITION_SLOTS.length;
    el.rollButton.hidden = !canRoll;
    el.rollButton.disabled = state.busy;
    el.rerollButton.hidden = state.stage !== 'player_select';
    el.rerollButton.disabled = state.busy || !state.currentPool || state.rerollsLeft <= 0;
    el.simulateButton.hidden = state.stage !== 'ready_to_simulate';
    el.simulateButton.disabled = state.busy || selectedCount() < 5 || !state.selectedCoach;
    el.restartButton.hidden = state.stage !== 'results';
    el.restartButton.disabled = state.busy;
  }

  function candidateStatTiles(player) {
    return [
      `<div class="stat-tile"><span>进攻</span><strong>${parseNum(player.att, 0)}</strong></div>`,
      `<div class="stat-tile"><span>防守</span><strong>${parseNum(player.def, 0)}</strong></div>`,
      `<div class="stat-tile"><span>OVR</span><strong>${ratingOf(player)}</strong></div>`
    ].join('');
  }

  function renderPlayerChoices() {
    if (!state.currentPool) return '';
    return `
      <div class="source-strip">
        <div class="source-chip team">${safeText(state.currentPool.team.a)}</div>
        <div class="source-chip year">${safeText(state.currentPool.season.label)}</div>
        <div class="source-copy">先选球员，下一步再从可打位置中落位。</div>
      </div>
      <div class="candidate-grid-inner">
        ${state.currentPool.candidates.map((player, index) => `
          <button class="candidate-card" type="button" data-pick="${index}" aria-label="选择 ${safeText(playerName(player))}">
            <div class="candidate-image-wrap">
              <img class="player-photo" src="${safeText(getPlayerPhotoSrc(player))}" alt="${safeText(playerName(player))}" onerror="this.src='${safeText(getPlayerPhotoPath(0))}'">
              <img class="team-logo-chip" src="${safeText(getTeamLogoPath(player.sourceTeamId, player.sourceTeamAbbr))}" alt="${safeText(player.sourceTeamName)}" onerror="this.src='${safeText(getTeamAltLogoPath(player.sourceTeamId))}'">
            </div>
            <div class="candidate-body">
              <div class="candidate-source">${safeText(player.sourceLabel)} · ${safeText(player.sourceTeamName)}</div>
              <div class="candidate-name">${safeText(playerName(player))}</div>
              <div class="candidate-meta">
                <span class="tag">${safeText(posLabel(player.pos))}${player.pos2 ? ` / ${safeText(posLabel(player.pos2))}` : ''}</span>
                <span class="tag gold">可落位 ${safeText(describePositions(player.positionOptions || []))}</span>
                <span class="tag">${parseNum(player.age, 0)} 岁</span>
              </div>
            </div>
            <div class="candidate-stats">${candidateStatTiles(player)}</div>
          </button>
        `).join('')}
      </div>
    `;
  }

  function renderCourtBoard(pending = null) {
    const options = pending ? positionOptionsForPlayer(pending) : [];
    return `
      <div class="court-board" aria-label="位置选择球场">
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
              <span class="tag gold">OVR ${ratingOf(player)}</span>
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
          const teamName = coach.teamMeta?.z || getTeam(coach.teamId)?.z || '2025 教练池';
          return `
            <button class="coach-card" type="button" data-coach-choice="${index}">
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
        <p>${safeText(coach.name)} 的 ${safeText(summary.fx.systemLabel)} 会在模拟前调整首发属性，并作为 82-0 挑战队主教练参与 2025 赛季模拟。</p>
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
        el.emptyState.innerHTML = '<strong>正在读取 2025 教练池</strong><span>教练战术会影响首发适配和赛季模拟。</span>';
      } else {
        el.emptyState.innerHTML = '<strong>先抽取球队和年份</strong><span>抽中来源后选择球员，再按球员可打位置落位。五个位置完成后选择教练。</span>';
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
          <div class="slot-rating">${player ? ratingOf(player) : '--'}</div>
        </div>
      `;
    }).join('');

    if (selectedCount() >= 5) {
      const lineupForReview = state.selectedCoach
        ? state.selected.map(player => applyCoachTacticalFit(player, state.selectedCoach))
        : state.selected;
      const profile = analyzeLineup(lineupForReview);
      const coachCopy = state.selectedCoach ? `，教练：${state.selectedCoach.name}` : '，等待教练选择';
      el.lineupSummary.innerHTML = `均值 OVR <strong>${profile.avgRating}</strong>，进攻 <strong>${profile.offense}</strong>，防守 <strong>${profile.defense}</strong>${safeText(coachCopy)}。标签：${safeText(profile.tags.join(' / '))}`;
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
    G.startYear = 2025;
    G.year = 2025;
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

  function updateSimProgress(round, total) {
    const pctValue = Math.round(round / total * 100);
    el.simStatus.textContent = `正在模拟第 ${Math.min(round, total)} / ${total} 轮`;
    el.simPercent.textContent = `${pctValue}%`;
    el.simProgressBar.style.width = `${pctValue}%`;
  }

  function selectedStatRows(targetTeamId, selectedPlayers) {
    const rows = getLeaguePlayerSeasonRows();
    return selectedPlayers.map(player => {
      const row = rows.find(item => parseNum(item.teamId, 0) === targetTeamId && String(item.playerId) === String(player.id));
      const gp = Math.max(1, parseNum(row?.gp, 0));
      return {
        player,
        row,
        gp: parseNum(row?.gp, 0),
        ppg: +(parseNum(row?.pts, 0) / gp).toFixed(1),
        rpg: +(parseNum(row?.reb, 0) / gp).toFixed(1),
        apg: +(parseNum(row?.ast, 0) / gp).toFixed(1),
        spg: +(parseNum(row?.stl, 0) / gp).toFixed(1),
        bpg: +(parseNum(row?.blk, 0) / gp).toFixed(1),
        fgPct: parseNum(row?.fga, 0) > 0 ? +(parseNum(row?.fgm, 0) / parseNum(row?.fga, 1) * 100).toFixed(1) : 0,
        tpPct: parseNum(row?.tpa, 0) > 0 ? +(parseNum(row?.tpm, 0) / parseNum(row?.tpa, 1) * 100).toFixed(1) : 0
      };
    });
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
      el.simStatus.textContent = '加载 2025 名单';
      await loadLeagueData({ startYear: 2025, strictRoster: true });
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
            year: 2025,
            phase: 'regular',
            userTeamId: targetTeamId
          });
        });
        if (roundIndex % 4 === 0 || roundIndex === rounds.length - 1) {
          updateSimProgress(roundIndex + 1, rounds.length);
          await new Promise(resolve => setTimeout(resolve, 0));
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

    if (profile.avgRating >= 88) positives.push('首发个人能力足以碾压大多数 2025 常规赛对手。');
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

    if (profile.spacing < 74) negatives.push('空间不足，遇到强护框队时进攻上限会被压低。');
    if (profile.creation < 74) negatives.push('组织点偏少，关键场次容易变成低效单打。');
    if (profile.rebounding < 74) negatives.push('篮板保护一般，82-0 挑战最怕被弱队靠二次进攻偷一场。');
    if (profile.stocks < 74) negatives.push('防守破坏性不足，无法稳定把优势扩大到垃圾时间。');
    if (avgFit <= -1) negatives.push('教练体系压制了部分首发的自然打法，强点不能完全释放。');
    if (parseNum(coachFx.threeRateMult, 1) <= 0.95 && profile.spacing >= 82) negatives.push('教练减少外线权重，会压低空间型阵容的进攻上限。');
    if (parseNum(record.w, 0) < 82) negatives.push('82 场全胜容错为零，即便强队也会被赛程疲劳和单场波动击穿。');

    if (pg && pg.attrs && pg.attrs.pass < 75 && pg.att < 80) negatives.push('【缺乏大脑】控卫组织和进攻能力偏弱，进攻端容易陷入停滞。');
    if (c && c.def < 75) negatives.push('【万人捅】首发中锋护框能力堪忧，禁区形同虚设。');

    if (!positives.length) positives.push('阵容没有明显断点，胜场主要来自五个位置都能贡献正向价值。');
    if (!negatives.length) negatives.push('主要风险来自模拟随机性和替补阶段，而不是首发结构。');
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
            <thead><tr><th>位置</th><th>球员</th><th>来源</th><th>战术适配</th><th>GP</th><th>PTS</th><th>REB</th><th>AST</th><th>STL</th><th>BLK</th><th>FG%</th><th>3P%</th></tr></thead>
            <tbody>
              ${result.selectedStats.map(item => `
                <tr>
                  <td>${safeText(item.player.chosenSlotShort)}</td>
                  <td>${safeText(playerName(item.player))}</td>
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
                </tr>
              `).join('')}
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
          sourceTeam: player.sourceTeamName,
          rating: ratingOf(player),
          coachFit: state.selectedCoach ? coachImpactForPlayer(player, state.selectedCoach).label : null
        } : { slot: slot.short, empty: true };
      }),
      pendingPlayer: state.pendingPlayer ? {
        name: playerName(state.pendingPlayer),
        sourceYear: state.pendingPlayer.sourceLabel,
        sourceTeam: state.pendingPlayer.sourceTeamName,
        positionOptions: positionOptionsForPlayer(state.pendingPlayer).map(posLabel)
      } : null,
      pool: state.currentPool ? {
        year: state.currentPool.season.label,
        team: state.currentPool.team.z,
        candidates: state.currentPool.candidates.map(player => ({
          name: playerName(player),
          positions: describePositions(player.positionOptions || []),
          rating: ratingOf(player)
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
      rerollsLeft: state.rerollsLeft,
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
    state.rerollsLeft = 1;
    state.coachChoices = [];
    state.selectedCoach = null;
    state.busy = false;
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

  function startCareer() {
    switchScreen('draft_room');
    rollTeamYear();
  }

  function bind() {
    buildTeamOptions();
    switchScreen('main_menu');
    renderAll();
    el.startGameBtn.addEventListener('click', startCareer);
    el.backToMenuBtn.addEventListener('click', () => {
      if (state.stage !== 'spin' && !confirm('返回主菜单将重置当前挑战进度，确定吗？')) return;
      resetChallenge();
    });
    el.rollButton.addEventListener('click', () => rollTeamYear());
    el.rerollButton.addEventListener('click', () => {
      if (state.rerollsLeft > 0 && state.currentPool && state.stage === 'player_select') rollTeamYear({ consumeReroll: true });
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
