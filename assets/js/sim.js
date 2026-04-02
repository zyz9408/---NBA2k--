// sim.js
// ============ CHARACTER CREATION ============
const BODY_TYPES = [
  { id: "small", n: "灵动型", d: "小体型，步频和机动性最佳", hRange: [175, 186], wRange: [70, 80], wsBonus: -3, boost: { speed: 9, stl: 5 }, nerf: { strength: -7, reb: -5, blk: -6 } },
  { id: "lean", n: "修长型", d: "纤长身材，攻防覆盖更广", hRange: [183, 196], wRange: [76, 90], wsBonus: 1, boost: { speed: 5, shotExt: 3, stl: 3 }, nerf: { strength: -4 } },
  { id: "balanced", n: "均衡型", d: "标准体型，综合能力平滑", hRange: [188, 203], wRange: [84, 102], wsBonus: 0, boost: {}, nerf: {} },
  { id: "power", n: "力量型", d: "对抗强，适合冲击和卡位", hRange: [196, 212], wRange: [98, 118], wsBonus: 2, boost: { strength: 8, physique: 5, reb: 4 }, nerf: { speed: -5, shotExt: -3 } },
  { id: "tower", n: "塔柱型", d: "超大体型，禁区存在感极强", hRange: [205, 221], wRange: [108, 130], wsBonus: 4, boost: { strength: 9, reb: 6, blk: 6 }, nerf: { speed: -7, stl: -4, shotExt: -4 } }
];

// ============ 努力程度模式 ============
const EFFORT_MODES = [
  { id: 'allout', n: '全力', icon: '🔥', desc: '拼尽全力，表现提升但体力消耗大', staminaMult: 1.6, attrMult: 1.12, injuryMult: 1.35, xpMult: 1.3, color: '#dc3545' },
  { id: 'normal', n: '普通', icon: '⚡', desc: '正常发挥', staminaMult: 1.0, attrMult: 1.0, injuryMult: 1.0, xpMult: 1.0, color: '#fdb927' },
  { id: 'conserve', n: '省力', icon: '🛡️', desc: '保存体力，表现有所降低', staminaMult: 0.55, attrMult: 0.88, injuryMult: 0.6, xpMult: 0.7, color: '#17a2b8' }
];
function normalizeEffortModeId(id) {
  const raw = String(id || '').trim().toLowerCase();
  if (raw === 'hard') return 'allout';
  if (raw === 'slack') return 'conserve';
  return raw || 'normal';
}
function getEffortMode(id) {
  const normalized = normalizeEffortModeId(id);
  return EFFORT_MODES.find(m => m.id === normalized) || EFFORT_MODES[1];
}

function getScheduleGameDay(gameIndex = G.gameNum) {
  const idx = Math.max(0, Math.floor(parseNum(gameIndex, G.gameNum)));
  if (Array.isArray(G.gameDays) && G.gameDays.length > idx) return parseNum(G.gameDays[idx], idx * 2);
  return idx * 2;
}

function countRecentGamesInSpan(gameIndex, spanDays, { includeCurrent = true } = {}) {
  const idx = Math.max(0, Math.floor(parseNum(gameIndex, 0)));
  const gameDay = getScheduleGameDay(idx);
  let count = includeCurrent ? 1 : 0;
  for (let i = idx - 1; i >= 0; i--) {
    const prevDay = getScheduleGameDay(i);
    if (gameDay - prevDay > spanDays) break;
    count++;
  }
  return count;
}

function getRecentPlayedMinutesLoad(limit = 4) {
  const recent = Array.isArray(G.results) ? G.results.slice(-Math.max(1, parseNum(limit, 4))) : [];
  const minutes = recent
    .filter(item => item && !item.injured)
    .map(item => parseNum(item?.st?.mins, parseNum(item?.mins, 0)))
    .filter(value => value > 0);
  if (!minutes.length) return clamp(parseNum(G._currentRoleMinutes, 26), 18, 40);
  return minutes.reduce((sum, value) => sum + value, 0) / minutes.length;
}

function summarizeFatigueContext(ctx = {}) {
  const parts = [];
  if (ctx.backToBack) parts.push('背靠背');
  if (ctx.threeInFour) parts.push('3天2赛/4天3赛强度');
  if (ctx.fourInSix) parts.push('6天4赛强度');
  if (!ctx.home) parts.push(`客场${Math.max(1, parseNum(ctx.roadTripLength, 1))}连客`);
  else if (parseNum(ctx.homeStandLength, 0) >= 3) parts.push(`连续${parseNum(ctx.homeStandLength, 0)}个主场`);
  if (parseNum(ctx.restDays, 0) >= 2) parts.push(`${parseNum(ctx.restDays, 0)}天休整`);
  return parts.length ? parts.join(' / ') : '常规负荷';
}

function sampleGenericFatigueContext({ teamId = 0, home = false, roundIndex = 0, phase = 'regular' } = {}) {
  const isPlayoffs = String(phase || '').trim() === 'playoffs';
  let roll = Math.random();
  let restDays = 1;
  if (isPlayoffs) {
    if (roll < 0.10) restDays = 0;
    else if (roll < 0.54) restDays = 1;
    else if (roll < 0.84) restDays = 2;
    else restDays = 3;
  } else {
    if (roll < 0.14) restDays = 0;
    else if (roll < 0.59) restDays = 1;
    else if (roll < 0.86) restDays = 2;
    else restDays = 3;
  }
  const backToBack = restDays === 0;
  const threeInFour = backToBack ? Math.random() < 0.42 : Math.random() < 0.18;
  const fourInSix = (backToBack || threeInFour) ? Math.random() < 0.22 : Math.random() < 0.08;
  let roadTripLength = 0;
  let homeStandLength = 0;
  if (home) {
    homeStandLength = Math.random() < 0.34 ? rng(3, 5) : rng(1, 3);
  } else {
    roadTripLength = Math.random() < 0.36 ? rng(3, 5) : rng(1, 3);
  }
  let loadScore = 0;
  if (backToBack) loadScore += 6;
  if (threeInFour) loadScore += 3;
  if (fourInSix) loadScore += 2;
  if (!home) loadScore += 1;
  if (roadTripLength >= 3) loadScore += Math.min(4, roadTripLength - 2);
  const skillPenalty = clamp(Math.round(loadScore * 0.62 - Math.min(restDays, 2)), 0, 10);
  const pacePenalty = clamp(Math.round(loadScore * 0.36), 0, 7);
  const energyPenalty = clamp(Math.round(loadScore * 1.4), 0, 16);
  const injuryMult = +(1 + loadScore * 0.045 + (backToBack ? 0.05 : 0)).toFixed(2);
  const summary = summarizeFatigueContext({ backToBack, threeInFour, fourInSix, home, roadTripLength, homeStandLength, restDays });
  return {
    teamId: parseNum(teamId, 0),
    roundIndex: parseNum(roundIndex, 0),
    home: !!home,
    gameDay: NaN,
    restDays,
    backToBack,
    threeInFour,
    fourInSix,
    roadTripLength,
    homeStandLength,
    recentMinutes: 30,
    loadScore,
    skillPenalty,
    pacePenalty,
    energyPenalty,
    injuryMult,
    summary,
    synthetic: true
  };
}

function buildScheduleFatigueContext({ teamId = 0, home = false, roundIndex = 0, phase = 'regular', userTeamId = 0 } = {}) {
  const tid = parseNum(teamId, 0);
  const ridx = Math.max(0, Math.floor(parseNum(roundIndex, 0)));
  const phaseKey = String(phase || 'regular').trim() || 'regular';
  const canUseUserSchedule = tid > 0
    && tid === parseNum(G.teamId, 0)
    && phaseKey === 'regular'
    && Array.isArray(G.schedule)
    && Array.isArray(G.gameDays)
    && G.schedule.length > ridx
    && G.gameDays.length > ridx;
  if (!canUseUserSchedule) {
    return sampleGenericFatigueContext({ teamId: tid, home, roundIndex: ridx, phase: phaseKey });
  }
  const game = G.schedule[ridx] || {};
  const gameDay = getScheduleGameDay(ridx);
  const prevDay = ridx > 0 ? getScheduleGameDay(ridx - 1) : -3;
  const restDays = Math.max(0, gameDay - prevDay - 1);
  const backToBack = restDays === 0;
  const gamesIn4 = countRecentGamesInSpan(ridx, 3, { includeCurrent: true });
  const gamesIn6 = countRecentGamesInSpan(ridx, 5, { includeCurrent: true });
  const threeInFour = gamesIn4 >= 3;
  const fourInSix = gamesIn6 >= 4;
  let roadTripLength = 0;
  let homeStandLength = 0;
  for (let i = ridx; i >= 0; i--) {
    const item = G.schedule[i] || {};
    if (!!item.home !== !!game.home) break;
    if (item.home) homeStandLength++;
    else roadTripLength++;
  }
  const recentMinutes = getRecentPlayedMinutesLoad(4);
  const currentStamina = clamp(parseNum(G.player?.stamina, 100), 0, 100);
  let loadScore = 0;
  if (backToBack) loadScore += 6;
  if (threeInFour) loadScore += 3;
  if (fourInSix) loadScore += 2;
  if (!game.home) loadScore += 1;
  if (!game.home && roadTripLength >= 3) loadScore += Math.min(4, roadTripLength - 2);
  if (recentMinutes >= 38) loadScore += 3;
  else if (recentMinutes >= 34) loadScore += 2;
  else if (recentMinutes >= 30) loadScore += 1;
  if (currentStamina <= 70) loadScore += Math.round((70 - currentStamina) / 8);
  const skillPenalty = clamp(Math.round(loadScore * 0.66 - Math.min(restDays, 2)), 0, 11);
  const pacePenalty = clamp(Math.round(loadScore * 0.40), 0, 8);
  const energyPenalty = clamp(Math.round(loadScore * 1.55), 0, 18);
  const injuryMult = +(1 + loadScore * 0.05 + (backToBack ? 0.06 : 0) + (roadTripLength >= 4 ? 0.04 : 0)).toFixed(2);
  const summary = summarizeFatigueContext({ backToBack, threeInFour, fourInSix, home: !!game.home, roadTripLength, homeStandLength, restDays });
  return {
    teamId: tid,
    roundIndex: ridx,
    home: !!game.home,
    gameDay,
    restDays,
    backToBack,
    threeInFour,
    fourInSix,
    roadTripLength,
    homeStandLength,
    recentMinutes: +recentMinutes.toFixed(1),
    loadScore,
    skillPenalty,
    pacePenalty,
    energyPenalty,
    injuryMult,
    summary,
    synthetic: false
  };
}



// ============ 体力状态系统 (APK风格) ============
function getStaminaStatus(stamina) {
  const s = clamp(parseNum(stamina, 80), 0, 100);
  if (s >= 80) return { level: 'energized', icon: '💪', name: '精力充沛', attrMult: 1, accMult: 1, injuryMult: 1 };
  if (s >= 60) return { level: 'normal', icon: '✓', name: '正常', attrMult: 1, accMult: 1, injuryMult: 1 };
  if (s >= 40) return { level: 'tired', icon: '😓', name: '疲劳', attrMult: 0.95, accMult: 0.98, injuryMult: 1.3 };
  if (s >= 20) return { level: 'exhausted', icon: '😫', name: '体力不支', attrMult: 0.88, accMult: 0.94, injuryMult: 1.8 };
  return { level: 'depleted', icon: '💀', name: '极度疲惫', attrMult: 0.80, accMult: 0.88, injuryMult: 3.0 };
}
function usagePlayerKey(player) {
  if (!player) return '';
  if (player.id !== undefined && player.id !== null && String(player.id) !== '') return String(player.id);
  const name = String(player.name || '').trim();
  return name ? `name:${name}` : '';
}
function usagePlayerAttrs(player) {
  if (typeof getEffectivePlayerAttrs === 'function') {
    return getEffectivePlayerAttrs(player);
  }
  if (player?.attrs && Object.keys(player.attrs).length) return player.attrs;
  return parsePlayerAttrs(player || {});
}
function usagePlayerRating(player) {
  const attrs = usagePlayerAttrs(player);
  return parseNum(player?.rating, ovr(attrs));
}
function usagePlayerPass(player) {
  const attrs = usagePlayerAttrs(player);
  return parseNum(attrs.pass, 55);
}

// ============ 7层球队角色体系 ============
const TEAM_TIERS = [
  { id: 'alpha', name: '当家球星', usageMod: 0.18, astMod: 0.8, minTarget: 36, minRange: [33, 40] },
  { id: 'second', name: '二当家', usageMod: 0.10, astMod: 0.4, minTarget: 34, minRange: [31, 37] },
  { id: 'third', name: '三当家', usageMod: 0.04, astMod: 0.2, minTarget: 31, minRange: [28, 34] },
  { id: 'sixthman', name: '第六人', usageMod: 0.02, astMod: 0.1, minTarget: 25, minRange: [22, 28] },
  { id: 'rolestarter', name: '首发蓝领', usageMod: -0.06, astMod: 0, minTarget: 32, minRange: [28, 35] },
  { id: 'bench', name: '替补轮换', usageMod: -0.08, astMod: 0, minTarget: 17, minRange: [13, 22] },
  { id: 'end', name: '饮水机管理员', usageMod: -0.12, astMod: 0, minTarget: 4, minRange: [0, 8] }
];
function getTierDef(tierId) { return TEAM_TIERS.find(t => t.id === tierId) || TEAM_TIERS[6]; }

function buildTeamUsageContext(teamId = 0, roster = null, rotation = null) {
  const tid = parseNum(teamId, 0);
  const includeUser = tid > 0 && tid === parseNum(G?.teamId, 0);
  const rosterPool = Array.isArray(roster) && roster.length
    ? roster.filter(Boolean)
    : (() => {
      const base = (tid > 0 ? getTeamPlayers(tid) : []) || [];
      if (!includeUser || typeof createUserRosterSnapshot !== 'function') return base;
      const self = createUserRosterSnapshot();
      const selfKey = usagePlayerKey(self);
      if (!selfKey) return base;
      const hasSelf = base.some(p => usagePlayerKey(p) === selfKey);
      return hasSelf ? base : [self, ...base];
    })();
  const rotationPool = Array.isArray(rotation) && rotation.length
    ? rotation.filter(Boolean)
    : (tid > 0 && typeof buildDynamicTeamRotation === 'function'
      ? buildDynamicTeamRotation(tid, { includeUser })
      : []);

  const byKey = new Map();
  rosterPool.forEach(p => {
    const key = usagePlayerKey(p);
    if (key && !byKey.has(key)) byKey.set(key, p);
  });
  rotationPool.forEach(p => {
    const key = usagePlayerKey(p);
    if (key && !byKey.has(key)) byKey.set(key, p);
  });

  // 按评分排序所有轮换球员
  const rotationByRating = rotationPool
    .map((p, idx) => ({ player: p, key: usagePlayerKey(p), rating: usagePlayerRating(p), idx }))
    .filter(x => x.key)
    .sort((a, b) => b.rating - a.rating || usagePlayerPass(b.player) - usagePlayerPass(a.player));

  // 分配7层角色
  const tierMap = new Map();
  const topTiers = ['alpha', 'second', 'third'];
  const assignedKeys = new Set();
  // 前3名按评分 → 当家/二当家/三当家
  rotationByRating.slice(0, 3).forEach((entry, i) => {
    tierMap.set(entry.key, topTiers[i]);
    assignedKeys.add(entry.key);
  });
  // 剩余按轮换位置分配
  rotationPool.forEach((p, idx) => {
    const key = usagePlayerKey(p);
    if (!key || assignedKeys.has(key)) return;
    assignedKeys.add(key);
    const role = p?.rotationRole || (idx < 5 ? 'starter' : (idx === 5 ? 'sixth' : 'role'));
    if (role === 'starter' || idx < 5) {
      tierMap.set(key, 'rolestarter');
    } else if (role === 'sixth' || idx === 5) {
      tierMap.set(key, 'sixthman');
    } else if (idx <= 8) {
      tierMap.set(key, 'bench');
    } else {
      tierMap.set(key, 'end');
    }
  });

  return {
    teamId: tid,
    roster: rosterPool,
    rotation: rotationPool,
    byKey,
    tierMap
  };
}
function getPlayerTier(player, usageContext) {
  const key = usagePlayerKey(player);
  if (!key || !usageContext?.tierMap) return 'end';
  return usageContext.tierMap.get(key) || 'end';
}
function collectRoleEffects(roles = []) {
  return (roles || []).reduce((acc, role) => {
    acc.usageMod += parseNum(role?.usageMod, 0);
    acc.astMod += parseNum(role?.astMod, 0);
    acc.threeMod += parseNum(role?.threeMod, 0);
    acc.insideMod += parseNum(role?.insideMod, 0);
    acc.rebMod += parseNum(role?.rebMod, 0);
    acc.stlMod += parseNum(role?.stlMod, 0);
    acc.blkMod += parseNum(role?.blkMod, 0);
    if (role?.minRange) { acc.minRange = role.minRange; acc.minTarget = parseNum(role.minTarget, acc.minTarget); }
    return acc;
  }, { usageMod: 0, astMod: 0, threeMod: 0, insideMod: 0, rebMod: 0, stlMod: 0, blkMod: 0, minTarget: 17, minRange: null });
}
function buildCoachSystemRoleEffect(player, coachFx = {}) {
  const systemId = String(coachFx?.systemId || 'balance').trim() || 'balance';
  const systemLabel = String(coachFx?.systemLabel || '均衡体系').trim() || '均衡体系';
  const attrs = usagePlayerAttrs(player);
  const pos = clamp(parseNum(player?.pos, 3), 1, 5);
  const shotExt = parseNum(attrs.shotExt, 55);
  const shotInt = parseNum(attrs.shotInt, 55);
  const pass = parseNum(attrs.pass, 55);
  const reb = parseNum(attrs.reb, 55);
  const stl = parseNum(attrs.stl, 55);
  const blk = parseNum(attrs.blk, 55);
  const speed = parseNum(attrs.speed, 55);
  const physique = parseNum(attrs.physique, 55);
  const perimeterCut = pos <= 3 ? 70 : 65;
  const role = {
    type: 'coachSystem',
    name: `${systemLabel}适配`,
    usageMod: parseNum(coachFx?.usageByPos?.[pos], 0),
    astMod: 0,
    threeMod: 0,
    insideMod: 0,
    rebMod: 0,
    stlMod: 0,
    blkMod: 0
  };

  switch (systemId) {
    case 'defense':
      role.name = pos >= 4 ? '防守支柱' : '防守拼图';
      role.rebMod += pos >= 4 ? 0.45 : 0.12;
      role.stlMod += pos <= 3 ? 0.16 : 0.08;
      role.blkMod += pos >= 4 ? 0.18 : 0.04;
      if (pos >= 3 && (stl + blk) < 115) {
        role.name = '防守错配';
        role.usageMod -= 0.02;
        role.stlMod -= 0.10;
        role.blkMod -= 0.10;
      }
      break;
    case 'grit':
      role.name = pos >= 4 ? '硬仗蓝领' : '强硬后场';
      role.insideMod += pos >= 4 ? 0.03 : 0.01;
      role.rebMod += pos >= 4 ? 0.38 : 0.10;
      if (pos >= 4 && (physique + reb) < 145) {
        role.name = '磨阵错配';
        role.usageMod -= 0.03;
        role.insideMod -= 0.02;
        role.rebMod += 0.12;
      }
      break;
    case 'pace_space':
      if (shotExt >= perimeterCut) {
        role.name = pos >= 4 ? '空间内线' : '空间适配';
        role.usageMod += pos <= 3 ? 0.018 : 0.008;
        role.threeMod += 0.028;
        role.astMod += pos <= 3 ? 0.12 : 0.04;
      } else {
        role.name = '空间错配';
        role.usageMod -= pos <= 3 ? 0.05 : 0.035;
        role.threeMod -= 0.02;
        if (pos >= 4) role.rebMod += 0.28;
      }
      break;
    case 'perimeter_star':
      if (pos <= 2 && (pass + shotExt) >= 145) {
        role.name = '外核引擎';
        role.usageMod += 0.035;
        role.astMod += 0.26;
        role.threeMod += 0.024;
      } else if (pos <= 2) {
        role.name = '外核错配';
        role.usageMod -= 0.055;
        role.astMod -= 0.18;
        role.threeMod -= 0.015;
      } else if (pos === 3) {
        role.name = '侧翼终结';
        role.usageMod += 0.012;
        role.threeMod += 0.012;
      } else {
        role.name = '吃饼蓝领';
        role.usageMod -= 0.03;
        role.rebMod += 0.18;
      }
      break;
    case 'interior_star':
      if (pos >= 4 && (shotInt + reb) >= 140) {
        role.name = '内线支点';
        role.usageMod += 0.035;
        role.insideMod += 0.032;
        role.rebMod += 0.30;
        role.blkMod += 0.10;
      } else if (pos >= 4) {
        role.name = '内核错配';
        role.usageMod -= 0.04;
        role.insideMod -= 0.02;
        role.rebMod += 0.16;
      } else {
        role.name = '弱侧喂饼';
        role.usageMod -= 0.015;
        role.astMod += 0.08;
      }
      break;
    case 'triangle':
      if (pos === 1 && pass >= 72) {
        role.name = '三角发牌手';
        role.usageMod += 0.01;
        role.astMod += 0.22;
      } else if (pos >= 2 && pass >= 60) {
        role.name = '三角联动';
        role.usageMod += 0.008;
        role.astMod += 0.20;
        role.insideMod += 0.015;
      } else if (pos >= 2) {
        role.name = '三角错配';
        role.usageMod -= 0.02;
        role.astMod -= 0.12;
      }
      break;
    case 'seven_seconds':
      if (pos <= 3 && (speed + physique) >= 140) {
        role.name = '快攻推进';
        role.usageMod += 0.03;
        role.astMod += pos === 1 ? 0.18 : 0.08;
        role.threeMod += 0.02;
      } else if (pos <= 3) {
        role.name = '跑轰错配';
        role.usageMod -= 0.045;
        role.threeMod -= 0.01;
      } else {
        role.name = '转换终结';
        role.usageMod -= 0.015;
        role.insideMod += 0.01;
      }
      break;
    case 'balance':
    default:
      if (pos <= 3 && pass >= 70) {
        role.name = '体系通才';
        role.astMod += 0.10;
        role.usageMod += 0.005;
      } else if (pos >= 4 && reb >= 75) {
        role.name = '内线蓝领';
        role.rebMod += 0.18;
      }
      break;
  }
  return role;
}
function buildCoachRelationshipRoleEffect(player, coachFx = {}) {
  const isUser = !!player?.isSelf || String(player?.id || '') === 'USER_SELF';
  if (!isUser || typeof getUserCoachTreatmentProfile !== 'function') return null;
  const coach = typeof getTeamCoach === 'function' ? getTeamCoach(parseNum(G?.teamId, 0)) : null;
  const treatment = getUserCoachTreatmentProfile(player, coach);
  const pos = clamp(parseNum(player?.pos, 3), 1, 5);
  const role = {
    type: 'coachRelationship',
    name: treatment.label,
    usageMod: parseNum(treatment.usageDelta, 0),
    astMod: parseNum(treatment.creationDelta, 0),
    threeMod: 0,
    insideMod: 0,
    rebMod: 0,
    stlMod: 0,
    blkMod: 0
  };
  const systemId = String(coachFx?.systemId || coach?.systemId || 'balance').trim() || 'balance';
  if (parseNum(treatment.fitScore, 50) >= 70) {
    if (systemId === 'pace_space' || systemId === 'perimeter_star' || systemId === 'seven_seconds') {
      role.threeMod += pos <= 3 ? 0.012 : 0.006;
    } else if (systemId === 'interior_star' || systemId === 'grit') {
      role.insideMod += pos >= 4 ? 0.014 : 0.006;
      role.rebMod += pos >= 4 ? 0.10 : 0.03;
    } else if (systemId === 'triangle') {
      role.astMod += pos <= 3 ? 0.05 : 0.02;
    }
  } else if (parseNum(treatment.fitScore, 50) <= 42) {
    role.usageMod -= 0.012;
    if (systemId === 'pace_space' || systemId === 'perimeter_star' || systemId === 'seven_seconds') {
      role.threeMod -= 0.010;
    }
    if (systemId === 'interior_star' || systemId === 'grit') {
      role.insideMod -= 0.010;
    }
  }
  return role;
}

// ============ 球员角色计算 (7层体系 + 技能附加) ============
function getPlayerRole(player, roster, coachFx, usageContext = null) {
  const attrs = usagePlayerAttrs(player);
  const pos = parseNum(player.pos, 3);
  const roles = [];
  const teamIdFallback = String(player?.id) === 'USER_SELF'
    ? parseNum(G?.teamId, 0)
    : parseNum(player?.teamId, 0);
  const ctx = usageContext || buildTeamUsageContext(teamIdFallback, roster);
  const tier = getPlayerTier(player, ctx);
  const tierDef = getTierDef(tier);

  // 主角色：7层体系
  roles.push({ ...tierDef, type: tier });

  // 三分炮台：三分好且教练三分倾向高
  const shotExt = parseNum(attrs.shotExt, 55);
  const threeBias = parseNum(coachFx?.threeBias, 0);
  if (shotExt >= 78 && threeBias >= 0) roles.push({ type: 'shooter', name: '三分炮台', threeMod: 0.045 + (threeBias * 0.2) });

  // 低位核心：内线好且教练内线倾向高
  const shotInt = parseNum(attrs.shotInt, 55);
  const insideBias = parseNum(coachFx?.insideBias, 0);
  if (shotInt >= 78 && pos >= 4 && insideBias >= 0) roles.push({ type: 'post', name: '低位核心', insideMod: 0.045 + (insideBias * 0.2) });

  // 防守悍将：防守数据好且教练防守倾向高
  const stl = parseNum(attrs.stl, 55), blk = parseNum(attrs.blk, 55);
  const defBias = parseNum(coachFx?.defensiveBias, 0);
  if (stl + blk >= 130 && defBias >= 0) roles.push({ type: 'defender', name: '防守悍将' });

  roles.push(buildCoachSystemRoleEffect(player, coachFx));
  const relationshipRole = buildCoachRelationshipRoleEffect(player, coachFx);
  if (relationshipRole) roles.push(relationshipRole);

  return roles;
}

// 体力恢复计算
function recoverStamina(options = {}) {
  const ecoFx = options.ecoFx || (typeof getEconomyEffects === 'function' ? getEconomyEffects() : { restStaminaBonus: 0, gameStaminaBonus: 0 });
  const xfFx = getPlayerXFactorEffect(G.player);
  const badgeFx = getBadgeEffects(G.player);
  const regen = parseNum(xfFx.staminaRegen, 0);
  const badgeRegen = parseNum(badgeFx.staminaRegen, 0);
  const physique = parseNum(G.player.attrs?.physique, 60);
  const age = parseNum(G.player.age, 22);
  const phyBonus = Math.max(0, Math.round((physique - 60) / 9));
  const agePenalty = Math.max(0, Math.round((age - 30) * 0.3));
  const base = options.rest ? rng(10, 16) : rng(2, 5);
  const coachBonus = options.rest ? parseNum(ecoFx.restStaminaBonus, 0) : parseNum(ecoFx.gameStaminaBonus, 0);
  const total = clamp(Math.round(base + coachBonus + regen + badgeRegen + phyBonus - agePenalty), 1, options.rest ? 26 : 10);
  G.player.stamina = clamp(G.player.stamina + total, 0, 100);
  return total;
}

function calculateUserGameStaminaLoss(stats = {}, fatigueContext = null, gameMod = null) {
  const effortCfg = getEffortMode(G._effortMode);
  const xfFx = getPlayerXFactorEffect(G.player);
  const badgeFx = getBadgeEffects(G.player);
  const ecoFx = getEconomyEffects();
  const physique = parseNum(G.player.attrs?.physique, 60);
  const speed = parseNum(G.player.attrs?.speed, 55);
  const currentStamina = clamp(parseNum(G.player.stamina, 100), 0, 100);
  let loss = 6
    + parseNum(stats.mins, 0) * 0.31
    + (parseNum(stats.fga, 0) + parseNum(stats.fta, 0) * 0.35) * 0.20
    + (parseNum(stats.reb, 0) + parseNum(stats.ast, 0)) * 0.08
    + (parseNum(stats.stl, 0) + parseNum(stats.blk, 0) + parseNum(stats.tov, 0)) * 0.24;
  if (parseNum(stats.pts, 0) >= 30) loss += 1.2;
  if (fatigueContext?.backToBack) loss += 3;
  if (fatigueContext?.threeInFour) loss += 1.5;
  if (fatigueContext?.fourInSix) loss += 1.2;
  if (fatigueContext && !fatigueContext.home) loss += 0.8;
  if (parseNum(fatigueContext?.roadTripLength, 0) >= 3) loss += Math.min(3, (parseNum(fatigueContext?.roadTripLength, 0) - 2) * 0.9);
  if (gameMod?.foulTrouble) loss -= 1.2;
  loss += Math.max(0, (72 - currentStamina) * 0.05);
  loss -= Math.max(0, (physique - 60) * 0.08);
  loss -= Math.max(0, (speed - 65) * 0.03);
  loss -= parseNum(ecoFx.fatigueRelief, 0) * 14;
  loss *= effortCfg.staminaMult || 1;
  loss *= parseNum(xfFx.staminaCostMult, 1);
  loss *= parseNum(badgeFx.staminaCostMult, 1);
  return clamp(Math.round(loss), 7, 34);
}

// 获取玩家当前角色效果（供simGameStats使用）
function getUserRoleFx() {
  const ctx = buildTeamUsageContext(parseNum(G?.teamId, 0));
  const self = typeof createUserRosterSnapshot === 'function' ? createUserRosterSnapshot() : G.player;
  const coachFx = typeof getCoachEffects === 'function' ? getCoachEffects(parseNum(G?.teamId, 0)) : {};
  return collectRoleEffects(getPlayerRole(self, ctx.roster, coachFx, ctx));
}

function templateScoreForAttr(attrKey, pos, tpl, bt) {
  let s = (pos?.tend?.[attrKey] || 0) * 0.7;
  if (tpl) {
    s += (tpl.boost?.[attrKey] || 0);
    s += (tpl.nerf?.[attrKey] || 0);
  }
  if (bt) {
    s += (bt.boost?.[attrKey] || 0) * 0.8;
    s += (bt.nerf?.[attrKey] || 0) * 0.8;
  }
  return s;
}
function tuneAttrsToTarget(attrs, target, pos, tpl, bt) {
  let guard = 0;
  while (ovr(attrs) !== target && guard < 320) {
    const needUp = target > ovr(attrs);
    const order = ATTRS.map(at => at.k).sort((a, b) => templateScoreForAttr(b, pos, tpl, bt) - templateScoreForAttr(a, pos, tpl, bt));
    const keys = needUp ? order : [...order].reverse();
    let moved = false;
    for (const key of keys) {
      const next = attrs[key] + (needUp ? 1 : -1);
      if (next >= 35 && next <= 96) {
        attrs[key] = next;
        moved = true;
        break;
      }
    }
    if (!moved) break;
    guard++;
  }
}
function rollAttrs() {
  const a = {};
  const targetOvr = rng(60, 85);
  const pos = getPos(G.player.pos) || { tend: {} };
  const tpl = getTemplate(G.player.template, G.player.pos);
  const bt = BODY_TYPES.find(b => b.id === G.player.bodyType) || null;
  const xfFx = getPlayerXFactorEffect(G.player);
  ATTRS.forEach(at => {
    let base = targetOvr + rng(-8, 8);
    base += Math.round((pos.tend[at.k] || 0) * 0.55);
    if (tpl) {
      base += Math.round((tpl.boost?.[at.k] || 0) * 0.75);
      base += Math.round((tpl.nerf?.[at.k] || 0) * 0.75);
    }
    if (bt) {
      base += Math.round((bt.boost?.[at.k] || 0) * 0.65);
      base += Math.round((bt.nerf?.[at.k] || 0) * 0.65);
    }
    if (xfFx.attrBonus) base += xfFx.attrBonus;
    if (xfFx.attrBoost && xfFx.attrBoost[at.k]) base += xfFx.attrBoost[at.k];
    a[at.k] = clamp(base, 35, 96);
  });
  const avg = ovr(a);
  const shift = targetOvr - avg;
  if (shift !== 0) {
    ATTRS.forEach(at => {
      a[at.k] = clamp(a[at.k] + shift, 35, 96);
    });
  }
  tuneAttrsToTarget(a, targetOvr, pos, tpl, bt);
  const finalTarget = clamp(targetOvr, 60, 85);
  tuneAttrsToTarget(a, finalTarget, pos, tpl, bt);
  return a;
}

function rollPotential() { return rng(60, 99) }

// 根据属性生成初始倾向值 (内线/中投/外线, 范围55-75)
function rollTendencies() {
  const attrs = G.player.attrs || {};
  const shotInt = parseNum(attrs.shotInt, 55);
  const shotExt = parseNum(attrs.shotExt, 55);
  const shotMid = Math.round((shotInt + shotExt) / 2);
  // 属性→倾向: 基础与属性挂钩, 随机浮动, 上限100
  const calc = (attr) => clamp(Math.round(attr * 0.85 + rng(-5, 8)), 30, 100);
  return {
    in: calc(shotInt),
    mid: calc(shotMid),
    ex: calc(shotExt)
  };
}

function weightedIndex(weights) {
  const total = weights.reduce((a, b) => a + Math.max(0, b), 0);
  if (total <= 0) return rng(0, Math.max(0, weights.length - 1));
  let r = Math.random() * total;
  for (let i = 0; i < weights.length; i++) {
    r -= Math.max(0, weights[i]);
    if (r <= 0) return i;
  }
  return Math.max(0, weights.length - 1);
}
function buildDraftOrder60() {
  const recs = getLeagueTeamRecordsArray();
  const hasGames = recs.some(r => parseNum(r.gp, 0) > 0);
  const base = [...TEAMS].sort((a, b) => {
    if (hasGames) {
      const ra = recs.find(r => r.id === a.id) || { w: 0, l: 0 };
      const rb = recs.find(r => r.id === b.id) || { w: 0, l: 0 };
      return parseNum(ra.w, 0) - parseNum(rb.w, 0) || parseNum(rb.l, 0) - parseNum(ra.l, 0);
    }
    return getTeamStrength(a.id) - getTeamStrength(b.id);
  }).map(t => t.id);
  const lottery = base.slice(0, 14);
  const nonLottery = base.slice(14);
  const lotteryWeights = [140, 140, 140, 125, 105, 90, 75, 60, 45, 30, 20, 15, 10, 5];
  const pool = lottery.map((id, i) => ({ id, w: lotteryWeights[i] || 5 }));
  const top4 = [];
  for (let i = 0; i < 4 && pool.length; i++) {
    const idx = weightedIndex(pool.map(x => x.w));
    top4.push(pool[idx].id);
    pool.splice(idx, 1);
  }
  const orderMap = new Map(base.map((id, i) => [id, i]));
  const remainLottery = pool.map(x => x.id).sort((a, b) => orderMap.get(a) - orderMap.get(b));
  const firstRound = [...top4, ...remainLottery, ...nonLottery];
  return [...firstRound, ...firstRound];
}
function scoutScoreProspect(p, { isUser = false } = {}) {
  const attrs = p.attrs && Object.keys(p.attrs).length ? p.attrs : null;
  const rating = parseNum(p.rating, attrs ? ovr(attrs) : 70);
  const potential = parseNum(p.potential, clamp(rating + rng(6, 16), 60, 99));
  let score = rating * 0.7 + potential * 0.3;
  if (isUser) score += 0.05;
  return score;
}
function getTeamDraftNeedWeights(teamId) {
  const roster = [...getTeamPlayers(teamId)];
  const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  roster.forEach(p => {
    const p1 = clamp(parseNum(p.pos, 3), 1, 5);
    counts[p1] = (counts[p1] || 0) + 1;
    const p2 = parseNum(p.pos2, 0);
    if (p2 >= 1 && p2 <= 5) counts[p2] = (counts[p2] || 0) + 0.5;
  });
  const need = {};
  for (let pos = 1; pos <= 5; pos++) {
    need[pos] = Math.max(0, 2.2 - (counts[pos] || 0));
  }
  return need;
}
function chooseDraftCandidateForTeam(pool, teamId, preferredId) {
  if (!pool.length) return null;
  const top = Math.max(1, Math.min(3, pool.length));
  const candidates = pool.slice(0, top);
  if (preferredId) {
    const prefIdx = pool.findIndex(p => String(p.id) === String(preferredId));
    if (prefIdx >= 0 && !candidates.some(p => String(p.id) === String(preferredId))) {
      candidates.push(pool[prefIdx]);
    }
  }
  const need = getTeamDraftNeedWeights(teamId);
  const scored = candidates.map(p => {
    const p1 = clamp(parseNum(p.pos, 3), 1, 5);
    const p2 = parseNum(p.pos2, 0);
    let fit = (need[p1] || 0) * 5;
    if (p2 >= 1 && p2 <= 5) fit = Math.max(fit, (need[p2] || 0) * 3.5);
    let score = p.scoutScore + fit + rng(-6, 6) * 0.08;
    if (preferredId && String(p.id) === String(preferredId)) score += 12;
    return { p, score };
  }).sort((a, b) => b.score - a.score);
  if (scored.length === 1) return scored[0].p;
  const roll = Math.random();
  if (roll < 0.7) return scored[0].p;
  if (roll < 0.9) return scored[Math.min(1, scored.length - 1)].p;
  return scored[Math.min(2, scored.length - 1)].p;
}

function simulateDraft() {
  const totalPicks = 60;
  const draftClass = generateDraftClass(totalPicks - 1, { targetYear: G.year });
  const prospects = draftClass.players.map(p => ({
    ...p,
    scoutScore: scoutScoreProspect(p)
  }));
  prospects.push({
    id: 'USER_PROSPECT',
    uid: 'USER_PROSPECT',
    name: G.player.name,
    pos: G.player.pos,
    rating: ovr(G.player.attrs),
    potential: G.player.potential,
    age: G.player.age,
    scoutScore: scoutScoreProspect({
      pos: G.player.pos,
      rating: ovr(G.player.attrs),
      potential: G.player.potential,
      age: G.player.age,
      attrs: G.player.attrs
    }, { isUser: true })
  });
  const order = buildDraftOrder60();
  const boardPool = [...prospects].sort((a, b) => b.scoutScore - a.scoutScore || parseNum(b.potential, 0) - parseNum(a.potential, 0) || parseNum(b.rating, 0) - parseNum(a.rating, 0));
  const pickResults = [];
  let pickIndex = totalPicks - 1;
  let draftedTeamId = order[order.length - 1];
  for (let i = 0; i < totalPicks && boardPool.length; i++) {
    const pickNo = i + 1;
    const teamId = order[i] || TEAMS[rng(0, TEAMS.length - 1)].id;
    const chosen = chooseDraftCandidateForTeam(boardPool, teamId) || boardPool[0];
    const idx = boardPool.findIndex(p => String(p.id) === String(chosen.id));
    if (idx >= 0) boardPool.splice(idx, 1);
    pickResults.push({ pick: pickNo, teamId, player: chosen });
    if (chosen.id === 'USER_PROSPECT') {
      pickIndex = i;
      draftedTeamId = teamId;
    }
  }
  if (pickIndex >= totalPicks - 1) {
    const fallbackIndex = boardPool.findIndex(p => p.id === 'USER_PROSPECT');
    if (fallbackIndex >= 0) {
      const pickNo = Math.min(totalPicks, pickResults.length + 1);
      draftedTeamId = order[Math.min(order.length - 1, pickNo - 1)] || TEAMS[rng(0, TEAMS.length - 1)].id;
      pickResults.push({ pick: pickNo, teamId: draftedTeamId, player: boardPool[fallbackIndex] });
      boardPool.splice(fallbackIndex, 1);
      pickIndex = pickNo - 1;
    }
  }
  G.draftPick = pickIndex + 1;
  G.draftBoard = {
    tier: draftClass.tier,
    year: draftClass.year,
    classSize: pickResults.length,
    _pickResults: pickResults.map(r => ({ teamId: r.teamId, player: r.player })),
    top: pickResults.slice(0, 10).map(r => ({
      pick: r.pick,
      team: getTeam(r.teamId)?.a || '--',
      name: r.player.name,
      pos: getPos(parseNum(r.player.pos, 3))?.n || '-',
      rating: parseNum(r.player.rating, 70),
      potential: parseNum(r.player.potential, 78),
      user: r.player.id === 'USER_PROSPECT'
    })),
    results: pickResults.map(r => ({
      pick: r.pick,
      teamId: r.teamId,
      team: getTeam(r.teamId)?.a || '--',
      name: r.player.name,
      pos: getPos(parseNum(r.player.pos, 3))?.n || '-',
      rating: parseNum(r.player.rating, 70),
      potential: parseNum(r.player.potential, 78),
      user: r.player.id === 'USER_PROSPECT'
    }))
  };
  return draftedTeamId;
}

function assignToDraft() {
  const teamId = simulateDraft();
  G.teamId = teamId;
  G.team = getTeam(teamId);
  G.player.draft = parseNum(G.year, G.startYear || 2025) * 100 + parseNum(G.draftPick, 0);
  G.player.draftPick = parseNum(G.draftPick, 0);
  G.player.yearsLeague = 0;
  G.player.rookie = true;
  const c = rookieContractByPick(G.draftPick);
  G.player.salary = c.salary;
  G.player.contractYears = c.years;
  if (typeof applySeasonSalaryPayout === 'function') applySeasonSalaryPayout({ force: true, reason: '新秀合同首年薪资发放' });
  if (!G.player.teamsPlayed.includes(teamId)) G.player.teamsPlayed.push(teamId);
  recalcPlayerTradeValue();
}
function getDraftClassTopNames(limit = 5) {
  const top = Array.isArray(G.draftBoard?.top) ? G.draftBoard.top : [];
  return top.slice(0, Math.max(1, parseNum(limit, 5))).map(x => String(x?.name || '').trim()).filter(Boolean);
}
function buildDraftScoutingContext() {
  const pos = getPos(G.player.pos);
  const board = G.draftBoard || {};
  const tier = board.tier === 'big' ? '大年' : board.tier === 'weak' ? '小年' : '正常年';
  const topNames = getDraftClassTopNames(6);
  const team = getTeam(G.teamId) || {};
  return {
    season: G.season,
    startYear: parseNum(G.startYear, G.year),
    draftYear: parseNum(board.year, G.year),
    draftTier: tier,
    draftPick: parseNum(G.draftPick, 0),
    team: { id: team.id, name: team.z || team.n || '--', abbr: team.a || '--' },
    player: {
      name: String(G.player.name || '球员'),
      pos: pos?.n || '-',
      age: parseNum(G.player.age, 19),
      potential: parseNum(G.player.potential, 75),
      xfactor: G.player.xfactor || '',
      xfactorInfo: (() => {
        const xf = typeof getXFactor === 'function' ? getXFactor(G.player.xfactor) : null;
        return xf ? { n: xf.n, d: xf.d, icon: xf.icon } : null;
      })(),
      strengths: {
        pass: parseNum(G.player.attrs?.pass, 50),
        shotInt: parseNum(G.player.attrs?.shotInt, 50),
        shotExt: parseNum(G.player.attrs?.shotExt, 50),
        reb: parseNum(G.player.attrs?.reb, 50),
        blk: parseNum(G.player.attrs?.blk, 50),
        stl: parseNum(G.player.attrs?.stl, 50),
        speed: parseNum(G.player.attrs?.speed, 50),
        strength: parseNum(G.player.attrs?.strength, 50)
      }
    },
    classTopProspects: topNames
  };
}
function fallbackDraftScoutingReport(context) {
  const c = context || buildDraftScoutingContext();
  const pickNo = parseNum(c.draftPick, 0);
  const pickTag = pickNo === 1 ? '状元签' : (pickNo <= 3 ? '高顺位签' : (pickNo <= 14 ? '乐透签' : '轮换签位'));
  const topNames = (c.classTopProspects || []).slice(0, 3);
  const attrs = c.player?.strengths || {};
  const rank = [
    ['pass', '组织与阅读比赛', '组织能力'],
    ['shotInt', '内线终结', '篮下终结'],
    ['shotExt', '外线投射', '外线投射'],
    ['reb', '篮板卡位', '篮板争抢'],
    ['blk', '护筐威慑', '护筐能力'],
    ['stl', '抢断预判', '抢断嗅觉'],
    ['speed', '转换推进', '脚步速度'],
    ['strength', '对抗强度', '身体对抗']
  ].sort((a, b) => parseNum(attrs[b[0]], 50) - parseNum(attrs[a[0]], 50));

  // 最强3项作为优势
  const strengths = [];
  strengths.push(rank[0][1] + `（${parseNum(attrs[rank[0][0]], 50)}）`);
  strengths.push(rank[1][1] + `（${parseNum(attrs[rank[1][0]], 50)}）`);
  strengths.push(rank[2][1] + `（${parseNum(attrs[rank[2][0]], 50)}）`);

  // X-Factor天赋加入优势
  const xf = c.player?.xfactorInfo;
  if (xf) {
    strengths.push(`${xf.icon} X天赋「${xf.n}」: ${xf.d}`);
  }

  // 最弱2-3项作为缺点，附带具体数值
  const low = [...rank].reverse();
  const weaknesses = [];
  for (let i = 0; i < 3 && i < low.length; i++) {
    const val = parseNum(attrs[low[i][0]], 50);
    if (val < 70) {
      weaknesses.push(`${low[i][2]}偏弱（${val}），需要重点提升`);
    }
  }
  if (!weaknesses.length) {
    weaknesses.push(`需要提升 ${low[0][2]}（${parseNum(attrs[low[0][0]], 50)}）`);
  }

  // 根据X天赋补充风险提示
  if (c.player?.xfactor === 'glass_man') {
    weaknesses.push('「玻璃人」天赋导致伤病风险极高');
  } else if (c.player?.xfactor === 'toxic') {
    weaknesses.push('「更衣室毒瘤」天赋可能影响球队化学反应');
  } else if (c.player?.xfactor === 'streaky') {
    weaknesses.push('「情绪化」天赋导致表现波动极大');
  }

  const projection = pickNo === 1
    ? '预计直接进入首发并承担核心球权。'
    : pickNo <= 5
      ? '预计进入主轮换，赛季中后段争取首发。'
      : '预计先从轮换起步，通过表现争取更高角色。';

  // 结合X天赋的前景补充
  const xfProjection = xf ? ` 凭借「${xf.n}」天赋，${['sniper', 'deep_range', 'finisher', 'microwave', 'clutch'].includes(c.player?.xfactor) ? '进攻端有望快速兑现天赋。' :
    ['rim_wall', 'clamps', 'pickpocket', 'two_way_force'].includes(c.player?.xfactor) ? '防守端即战力突出。' :
      ['quick_learner', 'prodigy'].includes(c.player?.xfactor) ? '成长速度值得期待。' :
        ['iron', 'workhorse'].includes(c.player?.xfactor) ? '出勤率和耐久性有保障。' :
          '独特天赋为发展增添变数。'
    }` : '';

  return {
    title: `${c.team?.name || '--'} 选秀球探快报`,
    summary: `${c.draftYear} 届选秀（${c.draftTier}）中，球队用${pickTag}拿下 ${c.player?.name || '新秀'}。`,
    projection: projection + xfProjection,
    strengths,
    weaknesses,
    comparable: topNames.length ? `同届关注球员：${topNames.join('、')}` : '同届竞争激烈，后续观察实战适配。',
    source: 'fallback',
    ts: Date.now()
  };
}
function normalizeDraftScoutingReport(parsed, context, sourceOverride = '') {
  const fallback = fallbackDraftScoutingReport(context);
  let strengths = parsed?.strengths;
  if (typeof strengths === 'string') {
    strengths = strengths.split(/[,，\n]/).map(s => s.trim()).filter(s => s.length > 2);
  }
  if (!Array.isArray(strengths)) strengths = [];

  let weaknesses = parsed?.weaknesses;
  if (typeof weaknesses === 'string') {
    weaknesses = weaknesses.split(/[,，\n]/).map(s => s.trim()).filter(s => s.length > 2);
  }
  if (!Array.isArray(weaknesses)) weaknesses = [];

  return {
    title: cleanSocialText(parsed?.title || fallback.title),
    summary: cleanSocialText(parsed?.summary || fallback.summary),
    projection: cleanSocialText(parsed?.projection || fallback.projection),
    strengths: strengths.map(x => cleanSocialText(x)).filter(Boolean).slice(0, 5),
    weaknesses: weaknesses.map(x => cleanSocialText(x)).filter(Boolean).slice(0, 5),
    comparable: cleanSocialText(parsed?.comparable || fallback.comparable),
    story: cleanSocialText(parsed?.story || ''),
    source: sourceOverride || parsed?.source || fallback.source,
    ts: Date.now()
  };
}
function parseDraftScoutReportFromRaw(raw, context, sourceOverride = '') {
  if (!raw) return fallbackDraftScoutingReport(context);
  if (typeof raw === 'object') return normalizeDraftScoutingReport(raw, context, sourceOverride);
  const txt = String(raw).trim();
  if (!txt) return fallbackDraftScoutingReport(context);
  let parsed = tryParseJSONText(txt);
  if (!parsed) {
    const fixed = txt.replace(/^```json/i, '').replace(/^```/i, '').replace(/```$/, '').trim();
    parsed = tryParseJSONText(fixed);
  }
  if (!parsed) return fallbackDraftScoutingReport(context);
  return normalizeDraftScoutingReport(parsed, context, sourceOverride);
}
function draftScoutSystemPrompt() {
  return '你是NBA球队球探总监和故事编剧。请只输出JSON对象，包含字段: title (字符串), summary (字符串), projection (字符串), strengths (字符串数组), weaknesses (字符串数组), comparable (字符串), story (字符串)。优点和缺点(strengths/weaknesses)必须是简短的要点数组。并在 story 字段写出一段生动的选秀夜或选修前的戏剧性文字剧情（包含主角的一些背景和潜力讨论，约150字）。全部使用简体中文，语气专业而生动。不得提及 OVR/POT等游戏数值词。严格基于输入信息。';
}
async function generateDraftScoutingReportByGeminiNative(baseUrl, apiKey, model, context) {
  const modelName = normalizeModelNameForGemini(model || 'gemini-2.0-flash');
  const endpoint = `${baseUrl}/models/${encodeURIComponent(modelName)}:generateContent`;
  const req = buildLLMRequestConfig(baseUrl, apiKey, endpoint, { jsonBody: true });
  const payload = {
    systemInstruction: { parts: [{ text: draftScoutSystemPrompt() }] },
    contents: [{ role: 'user', parts: [{ text: JSON.stringify({ context }) }] }],
    generationConfig: { temperature: 0.6, responseMimeType: 'application/json' }
  };
  const res = await fetch(req.url, { method: 'POST', headers: req.headers, body: JSON.stringify(payload) });
  const data = await readJSONResponseSafe(res, '球探报告');
  const parts = data?.candidates?.[0]?.content?.parts;
  const raw = Array.isArray(parts) ? parts.map(p => String(p?.text || '')).join('').trim() : '';
  return parseDraftScoutReportFromRaw(raw, context, 'llm');
}

function resolveDraftLLMSettings() {
  ensureSocialState();
  const social = G.social.llm || {};
  const draft = typeof readMainMenuLLMDraft === 'function' ? readMainMenuLLMDraft() : null;
  const resolved = {
    enabled: !!social.enabled,
    baseUrl: String(social.baseUrl || '').trim(),
    model: String(social.model || '').trim(),
    apiKey: String(social.apiKey || '').trim()
  };
  if (draft && typeof draft === 'object') {
    if (typeof draft.enabled === 'boolean') resolved.enabled = draft.enabled;
    if (typeof draft.baseUrl === 'string' && draft.baseUrl.trim()) resolved.baseUrl = draft.baseUrl.trim();
    if (typeof draft.model === 'string' && draft.model.trim()) resolved.model = draft.model.trim();
    if (typeof draft.apiKey === 'string' && draft.apiKey.trim()) resolved.apiKey = draft.apiKey.trim();
  }
  resolved.baseUrl = normalizeLLMBaseUrl(resolved.baseUrl || 'https://api.openai.com/v1');
  resolved.model = resolved.model || 'gpt-4.1-mini';
  return resolved;
}

async function generateDraftScoutingReportByLLM(context) {
  const llm = resolveDraftLLMSettings();
  if (!llm.enabled || !llm.apiKey) return fallbackDraftScoutingReport(context);
  const baseUrl = normalizeLLMBaseUrl(llm.baseUrl);
  const model = String(llm.model || 'gpt-4.1-mini');
  if (isGoogleGeminiEndpoint(baseUrl)) {
    return generateDraftScoutingReportByGeminiNative(baseUrl, llm.apiKey, model, context);
  }

  const payload = {
    model,
    temperature: 0.6,
    messages: [
      { role: 'system', content: draftScoutSystemPrompt() },
      { role: 'user', content: JSON.stringify({ context }) }
    ]
  };
  const endpoint = `${baseUrl}/chat/completions`;
  const req = buildLLMRequestConfig(baseUrl, llm.apiKey, endpoint);

  try {
    const res = await fetch(req.url, { method: 'POST', headers: req.headers, body: JSON.stringify(payload) });
    const data = await readJSONResponseSafe(res, '球探报告');
    const raw = data?.choices?.[0]?.message?.content || '';
    return parseDraftScoutReportFromRaw(raw, context, 'llm');
  } catch (e) {
    console.warn('Draft report LLM failed:', e);
    return fallbackDraftScoutingReport(context);
  }
}

// ============ DAILY STORY GENERATOR ============
function getLuxuryItemsNames() {
  ensureEconomyState();
  if (!G.economy.ownedItems || !G.economy.ownedItems.length) return "无";
  const names = (G.economy.ownedItems || []).map(id => {
    const item = LUXURY_MARKET.find(x => String(x.id) === String(id));
    return item?.name || String(id || '').trim();
  }).filter(Boolean);
  return names.length ? names.join('、') : '无';
}

function formatGameStoryPeriodLines(flow = {}) {
  const periodLabels = Array.isArray(flow.periodLabels) && flow.periodLabels.length
    ? flow.periodLabels.map(label => String(label || '').trim()).filter(Boolean)
    : ['Q1', 'Q2', 'Q3', 'Q4'];
  const myPeriods = Array.isArray(flow.myPeriods) ? flow.myPeriods : [];
  const oppPeriods = Array.isArray(flow.oppPeriods) ? flow.oppPeriods : [];
  const total = Math.max(periodLabels.length, myPeriods.length, oppPeriods.length);
  const lines = [];

  for (let i = 0; i < total; i++) {
    const label = periodLabels[i] || `Q${i + 1}`;
    const myScore = parseNum(myPeriods[i], NaN);
    const oppScore = parseNum(oppPeriods[i], NaN);
    const myText = Number.isFinite(myScore) ? myScore : '—';
    const oppText = Number.isFinite(oppScore) ? oppScore : '—';
    lines.push(`${label} ${myText}-${oppText}`);
  }

  return lines;
}

function formatGameStoryTeamHighlights(teamSnapshot = null, label = '我方', limit = 3) {
  const rows = Array.isArray(teamSnapshot?.boxScore) ? teamSnapshot.boxScore.slice(0, Math.max(1, limit)) : [];
  if (!rows.length) return '';
  const text = rows.map(row => {
    const name = String(row?.name || '').trim() || '球员';
    const pts = parseNum(row?.pts, 0);
    const reb = parseNum(row?.reb, 0);
    const ast = parseNum(row?.ast, 0);
    return `${name}${pts}分${reb}板${ast}助`;
  }).join('；');
  return `【${label}主要表现】${text}`;
}

function getGameEventDomainLabel(attrKey = '') {
  const key = String(attrKey || '');
  if (['shotExt', 'shotInt', 'speed'].includes(key)) return '进攻';
  if (['stl', 'blk'].includes(key)) return '防守';
  if (key === 'physique') return '拼抢对抗';
  if (key === 'strength') return '心理对抗';
  if (key === 'pass') return '组织';
  return '综合';
}

function formatGameEventNarrativeLines(gameEvent) {
  if (!gameEvent || typeof gameEvent !== 'object') return [];
  const evt = (gameEvent.evt && typeof gameEvent.evt === 'object') ? gameEvent.evt : gameEvent;
  const roll = (gameEvent.roll && typeof gameEvent.roll === 'object') ? gameEvent.roll : {};
  const result = (gameEvent.result && typeof gameEvent.result === 'object') ? gameEvent.result : {};
  const mod = (result.mod && typeof result.mod === 'object') ? result.mod : {};
  const attrKey = String(evt.attr || '').trim();
  const attrLabel = typeof ATTRS !== 'undefined' && Array.isArray(ATTRS)
    ? (ATTRS.find(a => a.k === evt.attr)?.n || '综合')
    : '综合';
  const eventName = String(evt.n || '特殊事件').trim();
  const eventResult = String(result.desc || evt.desc || '本次事件已结算。').trim();
  const outcomeType = mod.type || (roll.success ? 'pos' : 'neg') || 'neu';
  const outcomeLabel = outcomeType === 'pos' ? '正面' : outcomeType === 'neg' ? '负面' : '中性';
  const lines = [
    `【特殊事件】${eventName}`,
    `【事件大类】${getGameEventDomainLabel(attrKey)}`,
    `【检定属性】${attrLabel}`
  ];
  const rollBits = [];
  const d20 = parseNum(roll.d20, NaN);
  if (Number.isFinite(d20)) rollBits.push(`d20=${d20}`);
  const modVal = parseNum(roll.mod, NaN);
  if (Number.isFinite(modVal)) rollBits.push(`修正=${modVal >= 0 ? '+' : ''}${modVal}`);
  const totalVal = parseNum(roll.total, NaN);
  if (Number.isFinite(totalVal)) rollBits.push(`总值=${totalVal}`);
  const dcVal = parseNum(roll.dc, NaN);
  if (Number.isFinite(dcVal)) rollBits.push(`DC=${dcVal}`);
  if (rollBits.length) lines.push(`【事件检定】${rollBits.join('，')}，${roll.success ? '成功' : '失败'}`);
  lines.push(`【结果倾向】${outcomeLabel}`);
  lines.push(`【事件结果】${eventResult}`);
  return lines;
}

function buildGameStoryNarrativeContext(result, matchup) {
  const gameRes = result?.gameResult || {};
  const flow = matchup?.flow || gameRes.flow || {};
  const opp = typeof getTeam === 'function' ? (getTeam(gameRes.opp) || {}) : {};
  const userTeamName = String(matchup?.userTeam?.name || matchup?.userTeam?.abbr || G.team?.z || G.team?.abbr || '我方').trim();
  const oppTeamName = String(matchup?.opponentTeam?.name || matchup?.opponentTeam?.abbr || opp.z || opp.a || opp.name || '对手').trim();
  const userScore = parseNum(gameRes.teamPts, 0);
  const oppScore = parseNum(gameRes.oppPts, 0);
  const finalMargin = Math.abs(userScore - oppScore);
  const hasOvertime = !!flow.hasOvertime;
  const closeGame = hasOvertime || finalMargin <= 7;
  const lines = [
    `【比赛叙事模式】${closeGame ? '焦灼收官' : '全场战报'}`,
    `【最终比分】${userTeamName} ${userScore} - ${oppScore} ${oppTeamName}`,
    `【最终分差】${finalMargin}分${hasOvertime ? '（含加时）' : ''}`
  ];
  const periodLines = formatGameStoryPeriodLines(flow);
  if (periodLines.length) lines.push(`【四节走势】${periodLines.join('；')}`);
  if (flow.summary) lines.push(`【比赛走势】${String(flow.summary).trim()}`);
  if (Array.isArray(flow.runs) && flow.runs.length) {
    const runText = flow.runs.map(r => String(r || '').trim()).filter(Boolean).slice(0, 4);
    if (runText.length) lines.push(`【关键连段】${runText.join('；')}`);
  }
  const userHighlights = formatGameStoryTeamHighlights(matchup?.userTeam, '我方', 3);
  if (userHighlights) lines.push(userHighlights);
  const oppHighlights = formatGameStoryTeamHighlights(matchup?.opponentTeam, '对手', 3);
  if (oppHighlights) lines.push(oppHighlights);
  const eventLines = formatGameEventNarrativeLines(result?.gameEvent);
  if (eventLines.length) lines.push(...eventLines);
  lines.push(
    closeGame
      ? '【写作要求】最后分差接近，重点写末节或加时的收官对抗，但不要忽略前三节的铺垫。'
      : '【写作要求】这场比赛不是焦灼局，请按全场四节节奏写完整战报，第四节只作收束，不要把整篇写成末节独角戏。'
  );
  return { closeGame, finalMargin, hasOvertime, lines };
}

function buildMatchRecapPromptContext(result, matchup, narrative) {
  const gameRes = result?.gameResult || result || {};
  const opp = getTeam(gameRes.opp) || {};
  const win = gameRes.win ? '胜利' : '失败';
  const st = gameRes.st || {};
  const userTeam = matchup?.userTeam?.name || matchup?.userTeam?.abbr || G.team?.z || '我方';
  const oppTeam = matchup?.opponentTeam?.name || matchup?.opponentTeam?.abbr || opp.z || opp.a || '对手';
  let text = `玩家${G.player.name}(${getPos(G.player.pos).n})效力于${userTeam}。\n`;
  text += `本场对阵${oppTeam}，最终比分 ${userTeam} ${parseNum(gameRes.teamPts, 0)} - ${parseNum(gameRes.oppPts, 0)} ${oppTeam}，结果：${win}。\n`;
  text += `个人数据：${parseNum(st.pts, 0)}分 ${parseNum(st.reb, 0)}板 ${parseNum(st.ast, 0)}助 ${parseNum(st.stl, 0)}断 ${parseNum(st.blk, 0)}帽，命中 ${parseNum(st.fgm, 0)}/${parseNum(st.fga, 0)}，三分 ${parseNum(st.tpm, 0)}/${parseNum(st.tpa, 0)}。\n`;
  if (narrative?.lines?.length) {
    text += `\n【比赛走势信息】\n${narrative.lines.join('\n')}\n`;
  }
  return text.trim();
}

async function generateMatchRecapByLLM(result, { force = false } = {}) {
  ensureSocialState();
  if (!result?.isGame || !result?.gameResult) return { ok: false, message: '非比赛日' };
  const gameId = String(result?.gameResult?.gameId || result?.gameResult?.id || '');
  if (!force && gameId && G._gameRecapMap && G._gameRecapMap[gameId]) {
    return { ok: true, recap: G._gameRecapMap[gameId], cached: true };
  }
  const llm = G.social.llm || {};
  if (!llm.enabled || !llm.apiKey) {
    return { ok: false, message: 'LLM 未启用或缺少 API Key' };
  }

  const baseUrl = normalizeLLMBaseUrl(llm.baseUrl);
  const model = String(llm.model || 'gpt-4.1-mini').trim();
  const matchup = result.matchup || buildMatchupContextForLLM(result, { limit: 4 });
  const narrative = buildGameStoryNarrativeContext(result, matchup);
  const promptContext = buildMatchRecapPromptContext(result, matchup, narrative);

  let sysPrompt = `你是篮球比赛战报解说员。
请基于输入的比赛信息写一段 120-180 字的比赛战报，要求：
- 必须提到比分、比赛走势（四节/关键连段/焦灼与否）
- 必须提到玩家个人数据
- 不允许虚构不存在的绝杀/逆转
- 风格燃、干净、有节奏
输出 JSON：
{
  "headline": "20字以内标题",
  "recap": "战报正文"
}`;

  const storySysPrompt = [sysPrompt, buildLLMPromptPresetSection({ context: { matchup }, scope: 'story' })]
    .filter(Boolean)
    .join('\n\n');

  let raw = '';
  try {
    if (isGoogleGeminiEndpoint(baseUrl)) {
      const modelName = normalizeModelNameForGemini(model);
      const endpoint = `${baseUrl}/models/${encodeURIComponent(modelName)}:generateContent`;
      const req = buildLLMRequestConfig(baseUrl, llm.apiKey, endpoint, { jsonBody: true });
      const payload = {
        systemInstruction: { parts: [{ text: storySysPrompt }] },
        contents: [{ role: 'user', parts: [{ text: promptContext }] }],
        generationConfig: { temperature: 0.6, responseMimeType: 'application/json' }
      };
      const res = await fetch(req.url, { method: 'POST', headers: req.headers, body: JSON.stringify(payload) });
      const data = await readJSONResponseSafe(res, '比赛战报');
      raw = (data?.candidates?.[0]?.content?.parts || []).map(p => p.text).join('') || '';
    } else {
      const payload = {
        model,
        temperature: 0.6,
        messages: [
          { role: 'system', content: storySysPrompt },
          { role: 'user', content: promptContext }
        ],
        response_format: { type: 'json_object' }
      };
      const endpoint = `${baseUrl}/chat/completions`;
      const req = buildLLMRequestConfig(baseUrl, llm.apiKey, endpoint);
      const res = await fetch(req.url, { method: 'POST', headers: req.headers, body: JSON.stringify(payload) });
      const data = await readJSONResponseSafe(res, '比赛战报');
      raw = data?.choices?.[0]?.message?.content || '';
    }

    let parsed = null;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = null;
    }
    const headline = String(parsed?.headline || '').trim() || '比赛战报';
    const recap = String(parsed?.recap || raw || '').trim();
    if (!recap) throw new Error('LLM 战报为空');

    const recapObj = { headline, recap, model, at: Date.now(), gameId };
    if (!G._gameRecapMap) G._gameRecapMap = {};
    if (gameId) G._gameRecapMap[gameId] = recapObj;
    return { ok: true, recap: recapObj };
  } catch (err) {
    const message = String(err?.message || err || '比赛战报生成失败');
    G.social.lastLLMError = message;
    return { ok: false, message };
  }
}

async function generateDailyStoryByLLM(result) {
  ensureSocialState();
  const llm = G.social.llm || {};
  if (!llm.enabled || !llm.apiKey) {
    if (typeof appendStoryToBoard === 'function') {
      appendStoryToBoard('⚠️ 系统大模型未配置 API Key，无法推演具体剧情，只能机械地流逝光阴。请在主页或设置配置参数。', '#dc3545', false);
    }
    return;
  }
  
  const baseUrl = normalizeLLMBaseUrl(llm.baseUrl);
  const model = String(llm.model || 'gpt-4.1-mini');
  
  const matchup = result.matchup || (result.isGame && result.gameResult ? buildMatchupContextForLLM(result, { limit: 4 }) : null);
  const gameNarrative = result.isGame && result.gameResult ? buildGameStoryNarrativeContext(result, matchup) : null;

  let promptContext = `玩家是${G.player.age}岁的${G.player.name}(${getPos(G.player.pos).n})。当前效力于 ${G.team.z}。
综合评分：${ovr(G.player.attrs)}。当前拥有奢侈品：${getLuxuryItemsNames()}。现金：$${parseNum(G.player.cash, 0).toFixed(2)}M。
今日是第${result.day + 1}天。`;

  if (result.isGame && result.gameResult) {
    const opp = getTeam(result.gameResult.opp) || {};
    const win = result.gameResult.win ? "胜利" : "失败";
    const st = result.gameResult.st || {};
    promptContext += `
今天进行了一场比赛，对阵 ${opp.z || opp.a || opp.name || '对手'}(OVR ${getTeamStrength(opp.id || result.gameResult.opp)})。比赛结果：${win}。
主队得分：${result.gameResult.teamPts}，客队得分：${result.gameResult.oppPts}。
玩家个人数据：${st.pts}分、${st.reb}篮板、${st.ast}助攻、${st.stl}抢断、${st.blk}盖帽。
${gameNarrative ? gameNarrative.lines.join('\n') : ''}`;
  } else {
    promptContext += "今天是休息日，或进行了一些日常训练。";
  }
  
  if (G.storyLog && G.storyLog.length > 0) {
    const recentContext = G.storyLog.slice(-3).map(s => {
      if (typeof s === 'string') return s.replace(/<[^>]+>/g, '').trim();
      return '';
    }).filter(Boolean).join('\n---\n');
    if (recentContext) {
      promptContext += `\n\n【前情提要（最近的往日事件）】\n${recentContext}\n\n请结合以上前情、当前的最新战况和所处环境，继续生动地推进这段生涯小说，保证文脉的连贯与合理性。`;
    }
  }
  
  let sysPrompt = `你是一个篮球养成文字游戏的故事推演引擎。
请根据提供的当天游戏信息，推演今日发生的事。
如果是休息日，请推演出场外生活事件（例如买了名表或豪车后产生的社交新闻或绯闻），字数控制在 200 字左右。
如果是比赛日，请生成一篇不少于 400 字的生动且燃向的“比赛战报/小说”。默认按全场四节走势来写，概括前三节铺垫、第三节转折和第四节收束；只有在最终分差很小、进入加时或末段真的焦灼时，才把末节/加时写成核心高潮。请优先使用输入里给出的四节比分、走势概括、关键连段和球员表现，不要只盯着第四节，更不要虚构不存在的绝杀、逆转或额外回合。
要求：无论是生活还是比赛，文笔必须极度生动，剧情张力拉满！
且必须返回合法的 JSON 格式。
JSON 格式要求如下：
{
  "story": "旁白口吻的事件推演内容或燃向比赛战报（支持分段）...",
  "changes": {"mood": 10, "cash": -0.5, "fame": 20} // 本周事件额外带来的心情变化、金钱惩罚/奖励(单位M)、声望/粉丝变动
}`;

  if (typeof applySillyTavernSystemPrompts === 'function') {
    const tp = applySillyTavernSystemPrompts();
    if (tp) sysPrompt += '\n\n【附加文本生成规则】\n' + tp;
  }
  if (gameNarrative) {
    sysPrompt += `\n\n【比赛日补充要求】${gameNarrative.closeGame ? '若最终分差很小、进入加时或末段真的焦灼，再把末节/加时写成高潮重点；否则按全场四节走势写完整战报，不要只盯第四节。' : '默认按全场战报写作，概括四节走势、关键转折和收尾；末节只需收束，不要把整篇写成第四节特写。'}\n【事实约束】只使用输入里给出的比分、分段走势、关键连段和球员表现，不要虚构不存在的绝杀、逆转或额外回合。`;
  }

  const storySysPrompt = [sysPrompt, buildLLMPromptPresetSection({ context: { matchup }, scope: 'story' })]
    .filter(Boolean)
    .join('\n\n');

  let raw = "";
  try {
    if (isGoogleGeminiEndpoint(baseUrl)) {
      const modelName = normalizeModelNameForGemini(model);
      const endpoint = `${baseUrl}/models/${encodeURIComponent(modelName)}:generateContent`;
      const req = buildLLMRequestConfig(baseUrl, llm.apiKey, endpoint, { jsonBody: true });
      const payload = {
        systemInstruction: { parts: [{ text: storySysPrompt }] },
        contents: [{ role: 'user', parts: [{ text: promptContext }] }],
        generationConfig: { temperature: 0.7, responseMimeType: 'application/json' }
      };
      if (typeof appendStoryToBoard === 'function') appendStoryToBoard('⏳ 正在推演今日事件...', '#888', false);
      const res = await fetch(req.url, { method: 'POST', headers: req.headers, body: JSON.stringify(payload) });
      const data = await readJSONResponseSafe(res, '故事生成');
      raw = (data?.candidates?.[0]?.content?.parts || []).map(p => p.text).join('') || '';
    } else {
      const payload = {
        model,
        temperature: 0.7,
        messages: [
          { role: 'system', content: storySysPrompt },
          { role: 'user', content: promptContext }
        ],
        response_format: { type: 'json_object' }
      };
      const endpoint = `${baseUrl}/chat/completions`;
      const req = buildLLMRequestConfig(baseUrl, llm.apiKey, endpoint);
      if (typeof appendStoryToBoard === 'function') appendStoryToBoard('⏳ 正在推演今日事件...', '#888', false);
      const res = await fetch(req.url, { method: 'POST', headers: req.headers, body: JSON.stringify(payload) });
      const data = await readJSONResponseSafe(res, '故事生成');
      raw = data?.choices?.[0]?.message?.content || '';
    }
    
    let jsonStr = raw;
    const match = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (match) {
      jsonStr = match[1];
    }
    const parsed = tryParseJSONText(jsonStr.trim());
    
    // 移除“⏳ 正在推演今日事件...” 这个 loading 提示
    if (G.storyLog && G.storyLog.length > 0 && G.storyLog[G.storyLog.length - 1].includes('正在推演今日事件')) {
      G.storyLog.pop();
    }
    
    if (!parsed || !parsed.story) {
      throw new Error(`LLM 格式化失败。原始返回: ${raw.slice(0, 150)}...`);
    }

    if (typeof appendStoryToBoard === 'function') {
      let finalStory = parsed.story;
      if (typeof applySillyTavernRegex === 'function') {
        finalStory = applySillyTavernRegex(finalStory, false);
      }
      appendStoryToBoard(`【第${result.day + 1}天】 ${finalStory}`, '#fff', true);
    }
    
    if (parsed.changes) {
      if (parsed.changes.mood) G.player.mood = clamp(G.player.mood + parsed.changes.mood, 0, 100);
      if (parsed.changes.cash) G.player.cash += parsed.changes.cash;
      if (parsed.changes.fame) G.player.fame += parsed.changes.fame;
    }
  } catch(e) {
    console.error('Daily LLM Engine err:', e);
    if (G.storyLog && G.storyLog.length > 0 && G.storyLog[G.storyLog.length - 1].includes('正在推演今日事件')) {
      G.storyLog.pop();
    }
    if (typeof appendStoryToBoard === 'function') {
      appendStoryToBoard(`⚠️ 剧情引擎受干扰，记录受损 (${String(e.message || e)})`, '#dc3545', false);
    }
  }
}

// ============ GAME EVENTS (DND STYLE) ============
const GAME_EVENTS = [
  // --- 进攻检定 ---
  // mod 字段说明 (赛前生效，影响模拟参数):
  //   extraFGA/extraFGM: 额外两分球出手/命中 (得分 = extraFGM * 2)
  //   extraFTA/extraFTM: 额外罚球出手/命中
  //   fgPctBoost: 命中率加成 (加到 inPct/doPct/exPct)
  //   extraTOV: 额外失误
  //   stl/blk/reb/ast: 直接加到对应数据
  //   minsPenalty: 上场时间惩罚
  //   attrPctBoost: 全属性百分比加成
  //   morale/stamina/grade: 士气/体力/评分修正
  {
    id: 'hot_hand', n: '手感火热', desc: '你感觉篮筐像大海一样宽广。', icon: '🔥',
    attr: 'shotExt', dc: 15,
    success: { desc: '投篮如有神助！(命中率+12%, +4个两分球命中)', mod: { fgPctBoost: 0.12, extraFGA: 4, extraFGM: 4, type: 'pos' } },
    fail: { desc: '或者是错觉？(无效果)', mod: { type: 'neu' } }
  },
  // 1. Update GAME_EVENTS clutch_time success mod
  {
    id: 'clutch_time', n: '关键时刻', desc: '比赛进入白热化阶段，需要有人站出来。', icon: '⏱️',
    attr: 'shotExt', dc: 18,
    // Add winRateBoost: 0.30
    success: { desc: '你接管了比赛！(胜率+30%, 命中率+10%, +3个两分球命中)', mod: { winRateBoost: 0.30, fgPctBoost: 0.10, extraFGA: 3, extraFGM: 3, type: 'pos' } },
    fail: { desc: '你没能顶住压力。(失误+2)', mod: { extraTOV: 2, type: 'neg' } }
  },


  {
    id: 'iso_battle', n: '单打对决', desc: '对面王牌向你发起了挑战。', icon: '⚔️',
    attr: 'shotInt', dc: 14,
    success: { desc: '你用得分回应了挑衅！(+3个两分球命中)', mod: { extraFGA: 3, extraFGM: 3, type: 'pos' } },
    fail: { desc: '你被防守限制住了。(命中率-10%)', mod: { fgPctBoost: -0.10, type: 'neg' } }
  },
  {
    id: 'ankle_breaker', n: '脚踝终结', desc: '尝试一个大幅度变向过人。', icon: '⛸️',
    attr: 'speed', dc: 16,
    success: { desc: '对手被你晃倒在地！(+2个两分球命中, +2罚球命中)', mod: { extraFGA: 2, extraFGM: 2, extraFTA: 2, extraFTM: 2, morale: 5, type: 'pos' } },
    fail: { desc: '运球失误，球丢了！(失误+1)', mod: { extraTOV: 1, type: 'neg' } }
  },

  // --- 防守检定 ---
  {
    id: 'lockdown', n: '死亡缠绕', desc: '你决定全场领防对方核心。', icon: '🔒',
    attr: 'stl', dc: 15,
    success: { desc: '对手心态崩了！(抢断+2)', mod: { stl: 2, type: 'pos' } },
    fail: { desc: '你被一步过掉。(犯规麻烦, 上场时间-5)', mod: { minsPenalty: -5, type: 'neg' } }
  },
  {
    id: 'rim_protect', n: '禁区守护', desc: '对手冲进了内线，准备起跳。', icon: '🧱',
    attr: 'blk', dc: 16,
    success: { desc: '排球大帽！(盖帽+2, 士气+3)', mod: { blk: 2, morale: 3, type: 'pos' } },
    fail: { desc: '被对手隔扣了...(士气-5)', mod: { morale: -5, type: 'neg' } }
  },

  // --- 身体/精神检定 ---
  {
    id: 'loose_ball', n: '地板球争夺', desc: '一个五五开的球权机会。', icon: '👐',
    attr: 'physique', dc: 14,
    success: { desc: '你拼下了球权！(抢断+1, 评价提升)', mod: { stl: 1, grade: 10, type: 'pos' } },
    fail: { desc: '你慢了一步，还受了点硬伤。(体力-10)', mod: { stamina: -10, type: 'neg' } }
  },
  {
    id: 'trash_talk', n: '垃圾话', desc: '对手在耳边喋喋不休。', icon: '🗣️',
    attr: 'strength', dc: 12,
    success: { desc: '你用表现让他闭嘴。(全属性+5%)', mod: { attrPctBoost: 0.05, type: 'pos' } },
    fail: { desc: '你心态受到了影响。(失误+1, 命中率-5%)', mod: { extraTOV: 1, fgPctBoost: -0.05, type: 'neg' } }
  }
];

function rollGameEvent() {
  const ev = pick(GAME_EVENTS);
  const attrKey = ev.attr; // e.g. 'shotExt'
  // 获取玩家属性并计算调整值 (Attr - 50) / 2，类似 DND
  // 50属性 = +0, 60 = +5, 90 = +20, 99 = +24
  const attrVal = getEffectiveAttr(attrKey);
  const mod = Math.floor((attrVal - 50) / 2);

  // Dynamic Difficulty: Adjust DC based on opponent strength
  let dcMod = 0;
  try {
    // Check if G.schedule is available and valid
    if (G.schedule && G.gameNum >= 0 && G.gameNum < G.schedule.length) {
      const nextGame = G.schedule[G.gameNum];
      if (nextGame) {
        const oppId = nextGame.opp;
        const oppStr = getTeamStrength(oppId);
        // Average strength ~75. Strong teams ~90 (+15). Weak ~65 (-10).
        // Adjust DC by +1 for every 6 points of strength difference from 75
        dcMod = Math.round((oppStr - 75) / 6);
      }
    }
  } catch (e) { console.warn('Dynamic Difficulty check failed', e); }

  const d20 = rng(1, 20);
  const finalDc = ev.dc + dcMod;
  const total = d20 + mod;
  const success = total >= finalDc;

  return {
    evt: ev,
    roll: { d20, mod, total, success, dc: finalDc }, // Return final DC for UI
    result: success ? ev.success : ev.fail
  };
}

// 赛前预掷事件 (由UI层在比赛前调用，展示给玩家后再开始模拟)
function rollPreGameEvent() {
  if (G.player?.injury?.active) {
    G._gameEvent = null;
    G._gameEventResult = null;
    return null;
  }
  const ev = Math.random() < 0.15 ? rollGameEvent() : null;
  G._gameEvent = ev;
  G._gameEventResult = ev || null;
  return ev;
}

// 获取徽章加成效果汇总
function getBadgeEffects(player) {
  const fx = {
    // 基础命中率
    fgPctBonus: 0, tpPctBonus: 0, ftPctBonus: 0,
    // 属性加成
    attrBoost: {},
    astFlat: 0, rebFlat: 0, stlFlat: 0, blkFlat: 0,
    insidePctBonus: 0,
    // 特殊效果
    staminaCostMult: 1.0, staminaRegen: 0, injuryMult: 1.0,
    xpMult: 1.0,
    // 战斗特定
    heatUpRate: 1.0, // 微波炉
    clutchBoost: 0.0, // 关键时刻
    highlightBoost: 0.0, // 高光表现
    contestResist: 0.0, // 抗干扰
    tovMult: 1.0, // 失误倍率
    // X天赋专用
    attrPct: 0, // 全属性百分比加成
    varianceRange: 6, // 表现波动范围(默认6)
    underdogBoost: 0, // 落后时属性加成
    usageBoost: 0, // 使用率/得分加成
    rookieBoost: 0 // 新秀赛季加成
  };
  if (!player) return fx;

  // 遍历 X-Factors
  if (player.xfactor) {
    const xf = XFACTORS.find(x => x.id === player.xfactor);
    if (xf && xf.effect) mergeEffects(fx, xf.effect);
  }

  // 遍历 Badges
  if (player.badges) {
    if (Array.isArray(player.badges)) {
      // Legacy support: Array of strings
      player.badges.forEach(bid => {
        const b = BADGES.find(x => x.id === bid);
        if (b && b.effect) mergeEffects(fx, b.effect);
      });
    } else if (typeof player.badges === 'object') {
      // New support: Object { id: level }
      Object.entries(player.badges).forEach(([bid, level]) => {
        const b = BADGES.find(x => x.id === bid);
        const lv = Math.max(0, Math.min(4, parseNum(level, 0)));
        if (b && b.effect && lv > 0) {
          // Scale effect by level (Base * Level) or custom logic
          // Simple scaling for now: Effect * Level
          // Special case for multipliers (e.g. 0.95 -> 1 - (1-0.95)*lvl ?)
          // For now assuming additive bonuses like pctBonus, attrBoost
          const scaled = {};
          for (const k in b.effect) {
            const v = b.effect[k];
            if (k.toLowerCase().includes('mult')) {
              // Multipliers: start with 1, apply (val-1)*lvl + 1 ?
              // e.g. 1.05 -> 1 + 0.05*4 = 1.2
              // e.g. 0.95 -> 1 - 0.05*4 = 0.8
              // Simplified: Math.pow(v, lv) maybe?
              // Let's use linear scaling for deviation from 1
              const diff = v - 1;
              scaled[k] = 1 + (diff * lv);
            } else if (typeof v === 'number') {
              scaled[k] = v * lv;
            } else if (typeof v === 'object' && v !== null) {
              // Nested object like attrBoost
              scaled[k] = {};
              for (const subK in v) {
                scaled[k][subK] = v[subK] * lv;
              }
            } else {
              scaled[k] = v;
            }
          }
          mergeEffects(fx, scaled);
        }
      });
    }
  }
  return fx;
}

function mergeEffects(target, source) {
  if (source.fgPct) target.fgPctBonus = (target.fgPctBonus || 0) + source.fgPct;
  if (source.fgPctBonus) target.fgPctBonus += source.fgPctBonus;
  if (source.tpPctBonus) target.tpPctBonus += source.tpPctBonus;
  if (source.ftPctBonus) target.ftPctBonus += source.ftPctBonus;
  if (source.staminaRegen) target.staminaRegen += source.staminaRegen;
  if (source.xpMult && source.xpMult !== 1) target.xpMult *= source.xpMult;
  if (source.highlightBoost) target.highlightBoost += source.highlightBoost;
  if (source.contestResist) target.contestResist += source.contestResist;
  if (source.deep3) target.tpPctBonus += source.deep3; // 无限射程归入三分
  if (source.corner3) target.tpPctBonus += source.corner3 * 0.3; // 简化底角加成到整体三分
  if (source.staminaCostMult) target.staminaCostMult *= source.staminaCostMult;
  if (source.staminaSave) target.staminaCostMult *= (1 - source.staminaSave);
  if (source.injuryMult) target.injuryMult *= source.injuryMult;
  if (source.heatUpRate) target.heatUpRate = Math.max(target.heatUpRate, source.heatUpRate); // 取最大
  if (source.clutchShot) target.clutchBoost += source.clutchShot;
  if (source.clutchBoost) target.clutchBoost += source.clutchBoost;
  if (source.tovMult !== undefined) {
    const tv = parseNum(source.tovMult, 0);
    if (tv > 0 && tv < 2) target.tovMult *= tv;
    else target.tovMult += tv;
  }
  if (source.astFlat) target.astFlat += source.astFlat;
  if (source.rebFlat) target.rebFlat += source.rebFlat;
  if (source.stlFlat) target.stlFlat += source.stlFlat;
  if (source.blkFlat) target.blkFlat += source.blkFlat;
  if (source.contactLayup) target.insidePctBonus += source.contactLayup;
  if (source.acrobatLayup) target.insidePctBonus += source.acrobatLayup * 0.9;
  if (source.floater) target.insidePctBonus += source.floater * 0.7;
  if (source.contactDunk) target.insidePctBonus += source.contactDunk * 0.6;
  if (source.postPush) target.insidePctBonus += source.postPush * 0.4;
  if (source.lobFinish) target.insidePctBonus += source.lobFinish * 0.5;
  if (source.teammateShotBoost) target.astFlat += source.teammateShotBoost * 10;
  if (source.passInterceptResist) target.tovMult *= Math.max(0.55, 1 - source.passInterceptResist * 0.45);
  if (source.stripResist) target.tovMult *= Math.max(0.55, 1 - source.stripResist * 0.45);
  if (source.passIntercept) target.stlFlat += source.passIntercept * 5;
  if (source.blockBoost) target.blkFlat += source.blockBoost * 4;
  if (source.chaseDownBlock) target.blkFlat += source.chaseDownBlock * 2.5;
  if (source.rebRange) target.rebFlat += source.rebRange * 10;
  if (source.boxoutStrength) target.rebFlat += source.boxoutStrength * 7;
  if (source.wormMove) target.rebFlat += source.wormMove * 6;
  if (source.teamOffAttr) {
    target.attrBoost.pass = (target.attrBoost.pass || 0) + source.teamOffAttr;
    target.attrBoost.shotInt = (target.attrBoost.shotInt || 0) + source.teamOffAttr;
    target.attrBoost.shotExt = (target.attrBoost.shotExt || 0) + source.teamOffAttr;
  }
  if (source.teamDefAttr) {
    target.attrBoost.stl = (target.attrBoost.stl || 0) + source.teamDefAttr;
    target.attrBoost.blk = (target.attrBoost.blk || 0) + source.teamDefAttr;
    target.attrBoost.reb = (target.attrBoost.reb || 0) + source.teamDefAttr;
  }

  if (source.attrBoost) {
    for (let k in source.attrBoost) {
      target.attrBoost[k] = (target.attrBoost[k] || 0) + source.attrBoost[k];
    }
  }
  // 全属性加成（玻璃人等）
  if (source.attrBonus) {
    const allKeys = ['pass', 'shotInt', 'shotExt', 'shotFree', 'speed', 'strength', 'reb', 'blk', 'stl'];
    allKeys.forEach(k => { target.attrBoost[k] = (target.attrBoost[k] || 0) + source.attrBonus; });
  }
  // 全属性百分比加成（双向统治等）
  if (source.attrPct) target.attrPct += source.attrPct;
  // 表现波动范围（情绪化/冷静心态）
  if (source.varianceRange !== undefined) target.varianceRange = source.varianceRange;
  // 落后时属性加成（逆境之王）
  if (source.underdogBoost) target.underdogBoost += source.underdogBoost;
  // 使用率/得分加成（微波炉/毒瘤）
  if (source.usageBoost) target.usageBoost += source.usageBoost;
  // 新秀赛季加成（天才新秀）
  if (source.rookieBoost) target.rookieBoost += source.rookieBoost;
}

function getEffectiveAttr(key) {
  let v = parseNum(G.player.attrs[key], 60);
  // 应用徽章/X-Factor 属性加成
  const fx = getBadgeEffects(G.player);
  if (fx.attrBoost && fx.attrBoost[key]) v += fx.attrBoost[key];

  const staminaStatus = getStaminaStatus(G.player.stamina);
  v *= staminaStatus.attrMult;

  // 努力程度倍率
  const effortCfg = getEffortMode(G._effortMode);
  v *= effortCfg.attrMult;

  // 关键属性加成 (简单判定：最后几场或季后赛)
  if (fx.clutchBoost > 0 && (G.gameNum > 75 || G.phase === 'playoffs')) {
    v *= (1 + fx.clutchBoost);
  }

  return clamp(Math.round(v), 20, 99);
}

function simGameStats(oppRating) {
  const fx = getBadgeEffects(G.player);
  const coachFx = getCoachEffects(G.teamId);
  const attrs = { ...G.player.attrs };
  if (fx.attrBoost) {
    Object.entries(fx.attrBoost).forEach(([k, v]) => {
      attrs[k] = clamp(parseNum(attrs[k], 55) + parseNum(v, 0), 20, 99);
    });
  }
  // === 赛前事件修正 (在模拟前注入参数) ===
  const evMod = (G._gameEventResult?.result?.mod) || {};
  if (evMod.attrPctBoost) {
    const boost = parseNum(evMod.attrPctBoost, 0);
    Object.keys(attrs).forEach(k => { attrs[k] = clamp(Math.round(attrs[k] * (1 + boost)), 20, 99); });
  }
  // X天赋: 全属性百分比加成（双向统治）
  if (fx.attrPct) {
    Object.keys(attrs).forEach(k => { attrs[k] = clamp(Math.round(attrs[k] * (1 + fx.attrPct)), 20, 99); });
  }
  // X天赋: 逆境之王 — 落后时属性加成
  if (fx.underdogBoost && G.seasonStats.losses > G.seasonStats.wins) {
    Object.keys(attrs).forEach(k => { attrs[k] = clamp(Math.round(attrs[k] * (1 + fx.underdogBoost)), 20, 99); });
  }

  const ovrVal = ovr(attrs);
  const diff = ovrVal - oppRating;
  const pos = parseNum(G.player.pos, 3);
  const roleFx = getUserRoleFx();
  const minsRaw = clamp(parseNum(G._currentRoleMinutes, 32) + rng(-2, 2), 14, 42);
  const mins = clamp(minsRaw + parseNum(evMod.minsPenalty, 0), 10, 42);

  // 倾向值 (内线/中投/外线)
  const tendencyIn = parseNum(G.player.tendencies?.in, 55);
  const tendencyMid = parseNum(G.player.tendencies?.mid, 55);
  const tendencyEx = parseNum(G.player.tendencies?.ex, 55);

  // 努力模式
  const effortCfg = getEffortMode(G._effortMode);
  const effortMult = effortCfg.attrMult || 1;

  // === 出手分配 (APK风格: 倾向控制出手量, 技能控制命中率) ===
  const usageExtra = parseNum(fx.usageBoost, 0);
  const usage = clamp(0.27 + ((ovrVal - 70) * 0.003) + (diff / 80) + usageExtra + roleFx.usageMod, 0.18, 0.52) * posUsageFactor(pos);
  const fga = clamp(Math.round(mins * usage * effortMult * clamp(Math.pow(parseNum(coachFx.paceMult, 1), 0.55), 0.90, 1.10)) + rng(-2, 2), 4, 28);

  // 三分出手率: 受倾向ex + 三分技能 + 位置偏好 + 角色加成
  const threeRateBase = 0.08 + parseNum(attrs.shotExt, 55) / 260 + (tendencyEx - 50) / 500 + posThreeBias(pos) + roleFx.threeMod;
  const threeRate = clamp(threeRateBase * clamp(parseNum(coachFx.threeRateMult, 1), 0.82, 1.28), 0.04, 0.60);
  const tpa = clamp(Math.round(fga * threeRate) + rng(-1, 1), 0, Math.min(14, fga));
  const nonThree = Math.max(0, fga - tpa);

  // 内线出手比例: 受倾向in + 内线技能, 中投倾向mid降低内线比例 + 角色加成
  const inShareBase = 0.32 + parseNum(attrs.shotInt, 55) / 290 + (tendencyIn - 50) / 500 - (tendencyMid - 50) / 550 - (threeRate * 0.18) + roleFx.insideMod;
  const inShare = clamp(inShareBase * clamp(parseNum(coachFx.paintRateMult, 1), 0.82, 1.24), 0.22, 0.76);
  const shotsIn = clamp(Math.round(nonThree * inShare), 0, nonThree);
  const shotsDo = Math.max(0, nonThree - shotsIn); // 中距离

  // === 命中率 (技能决定 + 事件加成) ===
  const insidePctBonus = parseNum(fx.fgPctBonus, 0) + parseNum(fx.insidePctBonus, 0);
  const evFgBoost = parseNum(evMod.fgPctBoost, 0) * 100;
  const contestBonus = parseNum(fx.contestResist, 0) * 100; // 抗干扰命中率加成
  // 关键时刻加成：赛季末段或季后赛时命中率提升
  const clutchPct = (fx.clutchBoost > 0 && (G.gameNum > 75 || G.phase === 'playoffs')) ? fx.clutchBoost * 100 : 0;
  const inPct = clamp(Math.round(shotPctByType('in', attrs, ovrVal, oppRating) + insidePctBonus * 100 + evFgBoost + contestBonus + clutchPct), 40, 80);
  const doPct = clamp(Math.round(shotPctByType('do', attrs, ovrVal, oppRating) + insidePctBonus * 80 + evFgBoost + contestBonus + clutchPct), 32, 60);
  const exPct = clamp(Math.round(shotPctByType('ex', attrs, ovrVal, oppRating) + parseNum(fx.tpPctBonus, 0) * 100 + evFgBoost + contestBonus * 0.5 + clutchPct), 22, 48);
  const frPct = clamp(Math.round(shotPctByType('fr', attrs, ovrVal, oppRating) + parseNum(fx.ftPctBonus, 0) * 100), 40, 95);

  // === 投篮结果 ===
  const inOk = shotInResult(inPct, shotsIn);
  const doOk = shotDoResult(doPct, shotsDo);
  const exOk = shotExResult(exPct, tpa);
  // 事件额外两分球 (extraFGA/extraFGM 代表额外的两分球出手和命中)
  const evExtraFGA = clamp(parseNum(evMod.extraFGA, 0), 0, 8);
  const evExtraFGM = clamp(parseNum(evMod.extraFGM, 0), 0, evExtraFGA);
  const fgm = inOk + doOk + exOk + evExtraFGM;
  const totalFga = fga + evExtraFGA;

  // === 罚球 (受内线出手 + 突破能力) ===
  const drive = ((parseNum(attrs.shotInt, 55) * 0.42) + (parseNum(attrs.physique, 55) * 0.3) + (parseNum(attrs.strength, 55) * 0.28));
  const ftaBase = (shotsIn * 0.31) + (shotsDo * 0.08) + (drive / 120);
  // 事件额外罚球
  const evExtraFTA = clamp(parseNum(evMod.extraFTA, 0), 0, 10);
  const evExtraFTM = clamp(parseNum(evMod.extraFTM, 0), 0, evExtraFTA);
  const fta = clamp(Math.round(ftaBase) + rng(0, 2), 0, 14) + evExtraFTA;
  const ftm = shotFrResult(frPct, fta - evExtraFTA) + evExtraFTM;

  // === 其他数据 (位置系数 + 技能) ===
  const astBase = (mins / 36) * (0.7 + parseNum(attrs.pass, 55) / 24) * posAstFactor(pos) * clamp(parseNum(coachFx.astMult, 1), 0.90, 1.24);
  const rebBase = (mins / 36) * (1.1 + parseNum(attrs.reb, 55) / 18) * posRebFactor(pos) * clamp(parseNum(coachFx.rebMult, 1), 0.90, 1.24);
  const stlBase = (mins / 36) * (parseNum(attrs.stl, 55) / 48) * posStlFactor(pos) * clamp(parseNum(coachFx.stocksMult, 1), 0.90, 1.24);
  const blkBase = (mins / 36) * (parseNum(attrs.blk, 55) / 48) * posBlkFactor(pos) * clamp(parseNum(coachFx.stocksMult, 1), 0.90, 1.24);
  const tovBase = (mins / 36) * (1 + fga / 8 + (pos <= 2 ? 0.65 : 0.25) - parseNum(attrs.pass, 55) / 95 - roleFx.astMod * 0.08);

  const ast = clamp(Math.round(astBase + roleFx.astMod + parseNum(fx.astFlat, 0)) + rng(-2, 2), 0, 14);
  const reb = clamp(Math.round(rebBase + roleFx.rebMod + parseNum(fx.rebFlat, 0)) + rng(-1, 2), 0, 20);
  const stl = clamp(Math.round(stlBase + roleFx.stlMod + parseNum(fx.stlFlat, 0)) + rng(0, 1) + parseNum(evMod.stl, 0), 0, 8);
  const blk = clamp(Math.round(blkBase + roleFx.blkMod + parseNum(fx.blkFlat, 0)) + rng(0, 1) + parseNum(evMod.blk, 0), 0, 8);
  const tov = clamp(Math.round(tovBase * clamp(parseNum(fx.tovMult, 1), 0.55, 1.8)) + rng(0, 2) + parseNum(evMod.extraTOV, 0), 0, 10);

  let line = clampLineStats({ mins, reb, ast, stl, blk, tov, fgm, fga: totalFga, tpm: exOk, tpa, ftm, fta, pts: 0 });

  // X天赋: 表现波动（情绪化=±12, 冷静心态=±2, 默认=±6）
  // 注意：所有得分修正必须通过投篮数据实现，不能直接改pts，否则pts与fgm/tpm/ftm不一致
  const variance = parseNum(fx.varianceRange, 6);
  if (variance > 0) {
    const swing = rng(-variance, variance);
    if (swing > 0) {
      const addFgm = Math.floor(swing / 2);
      const addFt = swing - addFgm * 2;
      line.fgm += addFgm; line.fga += addFgm + rng(0, 1);
      if (addFt > 0) { line.ftm += addFt; line.fta += addFt; }
    } else if (swing < 0) {
      let rem = Math.abs(swing);
      const canRm2 = Math.max(0, line.fgm - line.tpm);
      const rm2 = Math.min(Math.floor(rem / 2), canRm2);
      line.fgm -= rm2; rem -= rm2 * 2;
      if (rem > 0) { const rmFt = Math.min(rem, line.ftm); line.ftm -= rmFt; }
    }
  }
  // X天赋: 新秀赛季加成（天才新秀）
  if (fx.rookieBoost && parseNum(G.season, 1) === 1) {
    const boost = fx.rookieBoost;
    const addFgm = Math.max(0, Math.round((line.fgm - line.tpm) * boost));
    const addTpm = Math.max(0, Math.round(line.tpm * boost));
    const addFtm = Math.max(0, Math.round(line.ftm * boost));
    line.fgm += addFgm + addTpm; line.fga += addFgm + addTpm + rng(0, 1);
    line.tpm += addTpm; line.tpa += addTpm;
    line.ftm += addFtm; line.fta += addFtm + rng(0, 1);
    line.ast = Math.min(14, Math.round(line.ast * (1 + boost * 0.5)));
    line.reb = Math.min(20, Math.round(line.reb * (1 + boost * 0.5)));
  }
  // X天赋: 高光表现（花式大师）— 随机触发额外得分
  if (fx.highlightBoost && Math.random() < fx.highlightBoost) {
    const extraPts = rng(3, 8);
    const addFgm = Math.floor(extraPts / 2);
    const addFt = extraPts - addFgm * 2;
    line.fgm += addFgm; line.fga += addFgm + rng(0, 1);
    if (addFt > 0) { line.ftm += addFt; line.fta += addFt; }
    line.ast = Math.min(14, line.ast + rng(1, 2));
  }
  // 重新校验所有数据，pts从投篮数据重新计算
  line = clampLineStats(line);

  // 体力消耗
  let staminaCost = rng(10, 20) + Math.round(parseNum(line.mins, 24) / 6);
  if (fx.staminaCostMult) staminaCost = Math.round(staminaCost * fx.staminaCostMult);
  staminaCost = Math.round(staminaCost * effortCfg.staminaMult);
  G.player.stamina = clamp(G.player.stamina - staminaCost, 0, 100);
  if (fx.staminaRegen) G.player.stamina = clamp(G.player.stamina + fx.staminaRegen, 0, 100);
  // 事件体力修正
  if (evMod.stamina) G.player.stamina = clamp(G.player.stamina + evMod.stamina, 0, 100);

  return {
    mins: line.mins, pts: line.pts, reb: line.reb, ast: line.ast, stl: line.stl, blk: line.blk, tov: line.tov,
    fgm: line.fgm, fga: line.fga, tpm: line.tpm, tpa: line.tpa, ftm: line.ftm, fta: line.fta
  };
}

async function generateDraftScoutingReport({ force = false } = {}) {
  if (!force && G.draftScoutingReport) return G.draftScoutingReport;
  const context = buildDraftScoutingContext();
  try {
    const report = await generateDraftScoutingReportByLLM(context);
    G.draftScoutingReport = report || fallbackDraftScoutingReport(context);
  } catch (e) {
    G.social = G.social || {};
    G.social.lastLLMError = String(e?.message || e);
    G.draftScoutingReport = fallbackDraftScoutingReport(context);
  }
  return G.draftScoutingReport;
}

// ============ MATCH SIMULATION ============


function calcGrade(st) {
  let g = 50;
  g += st.pts * 1.2;
  g += st.ast * 2.5;
  g += st.reb * 1.5;
  g += st.stl * 4;
  g += st.blk * 4;
  g -= st.tov * 3;
  if (st.fga > 0) g += (st.fgm / st.fga - 0.45) * 30;
  return clamp(Math.round(g), 0, 99);
}

function checkInjury({ gameContext = null, gameStats = null, gameMod = null } = {}) {
  const fx = getPlayerXFactorEffect(G.player);
  const badgeFx = getBadgeEffects(G.player);
  const staminaStatus = getStaminaStatus(G.player.stamina);
  const ecoFx = getEconomyEffects();
  const recentMinutes = getRecentPlayedMinutesLoad(4);
  const age = parseNum(G.player.age, 22);
  let chance = 0.0065;
  if (fx.injuryMult) chance *= fx.injuryMult;
  if (badgeFx.injuryMult) chance *= badgeFx.injuryMult;
  // 使用体力状态的伤病倍率
  chance *= staminaStatus.injuryMult;
  chance *= clamp(parseNum(ecoFx.injuryMult, 1), 0.7, 1.2);
  if (parseNum(gameStats?.mins, parseNum(G._currentRoleMinutes, 24)) >= 34) chance *= 1.14;
  if (parseNum(gameStats?.mins, 0) >= 38) chance *= 1.06;
  if (recentMinutes >= 35) chance *= 1.08;
  if (age >= 31) chance *= 1 + Math.min(0.10, (age - 30) * 0.012);
  if (gameContext?.backToBack) chance *= 1.12;
  if (gameContext?.threeInFour) chance *= 1.07;
  if (parseNum(gameContext?.roadTripLength, 0) >= 4) chance *= 1.05;
  if (gameMod?.issueTag) chance *= 1.12;
  // 努力程度影响伤病概率
  const effortCfg = getEffortMode(G._effortMode);
  chance *= effortCfg.injuryMult;
  if (Math.random() < chance) {
    const severe = Math.random() < 0.14;
    const games = Math.max(1, Math.round((severe ? rng(14, 45) : rng(2, 10)) * clamp(parseNum(ecoFx.injuryDaysMult, 1), 0.72, 1)));
    const type = severe ? pick(["ACL撕裂", "跟腱断裂", "骨折"]) : pick(["脚踝扭伤", "肌肉拉伤", "膝盖酸痛"]);
    G.player.injury = { active: true, games, type };
    addNews(`💔 ${G.player.name}遭遇${type}，预计缺阵${games}场！`, 'neg');
    addPhone("医疗团队", `诊断结果：${type}，需要休战${games}场比赛。`, 'warn');
    return true;
  }
  return false;
}

// ============ SEASON MANAGEMENT ============
// ============ 选秀前赛季模拟：让NPC球员在用户进入前已经打过一个赛季 ============
function initLeagueSeasonState() {
  ensureLeagueStateShape();
  const teamRecords = {};
  const playerStats = {};
  const teamGameLogs = {};
  (TEAMS || []).forEach(t => {
    teamRecords[t.id] = makeTeamRecord();
    teamGameLogs[t.id] = [];
    const teamObj = LEAGUE.loaded ? LEAGUE.teams?.[t.id] : null;
    if (!teamObj) return;
    (teamObj.players || []).forEach(p => {
      if (!p.injury || typeof p.injury !== 'object') p.injury = { active: false, games: 0, type: '' };
      p.injury.active = false;
      p.injury.games = 0;
      p.injury.type = '';
      playerStats[leaguePlayerKey(t.id, p.id, false)] = emptySeasonLine(t.id, p.id, p.name, p.pos, false);
    });
    teamObj.rotation = toRotation(teamObj.players || []);
    teamObj.strength = calcTeamStrength(teamObj);
  });
  if (G.player && parseNum(G.teamId, 0) > 0) {
    playerStats[leaguePlayerKey(G.teamId, 'USER_SELF', true)] = emptySeasonLine(G.teamId, 'USER_SELF', G.player.name, G.player.pos, true);
  }
  G.leagueSeason = { round: 0, teamRecords, playerStats, roundSchedule: [], teamGameLogs, gameDetails: [] };
  return G.leagueSeason;
}

function getLeagueGameDetailById(gameId) {
  ensureLeagueStateShape();
  const id = String(gameId || '').trim();
  if (!id) return null;
  return (G.leagueSeason.gameDetails || []).find(g => String(g?.id || g?.gameId || '').trim() === id) || null;
}

function getLeagueGameDetails(filter = {}) {
  ensureLeagueStateShape();
  const season = filter.season != null ? parseNum(filter.season, NaN) : NaN;
  const year = filter.year != null ? parseNum(filter.year, NaN) : NaN;
  const round = filter.round != null ? parseNum(filter.round, NaN) : NaN;
  const teamId = filter.teamId != null ? parseNum(filter.teamId, NaN) : NaN;
  const oppId = filter.oppId != null ? parseNum(filter.oppId, NaN) : NaN;
  const phase = filter.phase != null ? String(filter.phase).trim() : '';
  return (G.leagueSeason.gameDetails || [])
    .filter(g => {
      if (Number.isFinite(season) && parseNum(g.season, NaN) !== season) return false;
      if (Number.isFinite(year) && parseNum(g.year, NaN) !== year) return false;
      if (Number.isFinite(round) && parseNum(g.round, NaN) !== round) return false;
      if (phase && String(g.phase || '').trim() !== phase) return false;
      if (Number.isFinite(teamId)) {
        const hasTeam = parseNum(g.homeTeamId, NaN) === teamId || parseNum(g.awayTeamId, NaN) === teamId;
        if (!hasTeam) return false;
      }
      if (Number.isFinite(oppId)) {
        const hasOpp = parseNum(g.homeTeamId, NaN) === oppId || parseNum(g.awayTeamId, NaN) === oppId;
        if (!hasOpp) return false;
      }
      return true;
    })
    .sort((a, b) => parseNum(a.round, 0) - parseNum(b.round, 0) || parseNum(a.seq, 0) - parseNum(b.seq, 0));
}

function findLeagueGameDetail(query = {}) {
  const teamId = query.teamId != null ? parseNum(query.teamId, NaN) : NaN;
  const oppId = query.oppId != null ? parseNum(query.oppId, NaN) : NaN;
  const round = query.round != null ? parseNum(query.round, NaN) : NaN;
  const season = query.season != null ? parseNum(query.season, NaN) : NaN;
  const year = query.year != null ? parseNum(query.year, NaN) : NaN;
  const phase = query.phase != null ? String(query.phase).trim() : '';
  return getLeagueGameDetails({ season, year, phase }).find(g => {
    if (Number.isFinite(round) && parseNum(g.round, NaN) !== round) return false;
    if (Number.isFinite(teamId) && Number.isFinite(oppId)) {
      return (
        (parseNum(g.homeTeamId, NaN) === teamId && parseNum(g.awayTeamId, NaN) === oppId) ||
        (parseNum(g.homeTeamId, NaN) === oppId && parseNum(g.awayTeamId, NaN) === teamId)
      );
    }
    if (Number.isFinite(teamId)) return parseNum(g.homeTeamId, NaN) === teamId || parseNum(g.awayTeamId, NaN) === teamId;
    if (Number.isFinite(oppId)) return parseNum(g.homeTeamId, NaN) === oppId || parseNum(g.awayTeamId, NaN) === oppId;
    return true;
  }) || null;
}

function tickLeagueInjuries() {
  ensureLeagueStateShape();
  const tick = (player) => {
    if (!player || !player.injury || !player.injury.active) return;
    player.injury.games = Math.max(0, parseNum(player.injury.games, 0) - 1);
    if (player.injury.games <= 0) {
      player.injury.active = false;
      player.injury.games = 0;
      player.injury.type = '';
    }
  };
  if (LEAGUE.loaded) {
    Object.values(LEAGUE.teams || {}).forEach(team => (team.players || []).forEach(tick));
  }
  tick(G.player);
}

function getGameRotationSnapshot(teamId, { includeUser = false } = {}) {
  const tid = parseNum(teamId, 0);
  let rotation = [];
  if (typeof buildDynamicTeamRotation === 'function') {
    rotation = buildDynamicTeamRotation(tid, { includeUser: !!includeUser && tid === parseNum(G.teamId, 0) });
  } else if (typeof toRotation === 'function') {
    rotation = toRotation(getTeamPlayers(tid) || []);
  }
  if (!Array.isArray(rotation)) rotation = [];
  const injuredIds = new Set();
  (getTeamPlayers(tid) || []).forEach(p => { if (p?.injury?.active) injuredIds.add(String(p.id)); });
  if (includeUser && tid === parseNum(G.teamId, 0) && G.player?.injury?.active) injuredIds.add('USER_SELF');
  rotation = rotation.filter(r => !injuredIds.has(String(r.id)));
  if (typeof normalizeRotationMinutes === 'function') normalizeRotationMinutes(rotation, 240);
  return rotation.slice(0, 10);
}

function allocateIntegerShares(total, weights = []) {
  const count = Array.isArray(weights) ? weights.length : 0;
  if (!count) return [];
  const safeWeights = weights.map(w => Math.max(0.001, parseNum(w, 1)));
  const sum = safeWeights.reduce((s, w) => s + w, 0);
  if (sum <= 0) {
    const base = Math.floor(total / count);
    const out = Array(count).fill(base);
    let rem = total - base * count;
    for (let i = 0; rem > 0; i++, rem--) out[i % count]++;
    return out;
  }
  const raw = safeWeights.map(w => total * w / sum);
  const out = raw.map(v => Math.max(0, Math.floor(v)));
  let rem = total - out.reduce((s, v) => s + v, 0);
  const order = raw.map((v, i) => ({ i, frac: v - Math.floor(v), w: safeWeights[i] })).sort((a, b) => b.frac - a.frac || b.w - a.w);
  let idx = 0;
  while (rem > 0 && order.length) {
    out[order[idx % order.length].i]++;
    rem--;
    idx++;
  }
  while (rem < 0) {
    const cutOrder = [...out.keys()].sort((a, b) => out[b] - out[a] || safeWeights[b] - safeWeights[a]);
    let changed = false;
    for (const i of cutOrder) {
      if (rem === 0) break;
      if (out[i] > 0) {
        out[i]--;
        rem++;
        changed = true;
      }
    }
    if (!changed) break;
  }
  return out;
}

function buildSimRotationContext(teamId, { includeUser = false } = {}) {
  const tid = parseNum(teamId, 0);
  const team = getTeam(tid) || {};
  const teamName = String(team.z || team.n || '--').trim();
  const abbr = String(team.a || team.abbr || '--').trim();
  const coachFx = getCoachEffects(tid);
  let rotation = getGameRotationSnapshot(tid, { includeUser: !!includeUser || tid === parseNum(G.teamId, 0) });
  if (!rotation.length) {
    const fallbackPlayers = [...(getTeamPlayers(tid) || [])];
    if (fallbackPlayers.length) {
      rotation = fallbackPlayers.slice(0, 10).map((p, idx) => ({
        id: p.id,
        name: p.name,
        pos: parseNum(p.pos, 3),
        pos2: parseNum(p.pos2, 0),
        minutes: clamp(28 - idx * 2, 6, 36),
        rating: parseNum(p.rating, 65),
        teamTier: idx < 5 ? 'starter' : 'bench',
        isSelf: false
      }));
    }
  }
  const rosterLookup = new Map((getTeamPlayers(tid) || []).map(p => [String(p.id), p]));
  const simPlayers = rotation.map(p => {
    const src = p.isSelf
      ? (typeof createUserRosterSnapshot === 'function' ? createUserRosterSnapshot() : G.player)
      : (rosterLookup.get(String(p.id)) || p);
    return {
      ...src,
      id: p.id,
      name: p.name || src?.name,
      pos: parseNum(p.pos, parseNum(src?.pos, 3)),
      pos2: parseNum(p.pos2, parseNum(src?.pos2, 0)),
      rating: parseNum(p.rating, parseNum(src?.rating, 65)),
      minutes: parseNum(p.minutes, 18),
      rotationRole: p.rotationRole,
      teamTier: p.teamTier,
      isSelf: !!p.isSelf
    };
  });
  return { teamId: tid, team, teamName, abbr, coachFx, rotation, simPlayers };
}

function weightedRotationAverage(players, selector, fallback = 55) {
  const list = Array.isArray(players) ? players.filter(Boolean) : [];
  if (!list.length) return fallback;
  let totalWeight = 0;
  let totalValue = 0;
  list.forEach((player, idx) => {
    const weight = Math.max(1, parseNum(player?.minutes, 0) || (idx < 5 ? 28 - idx * 2 : 14 - (idx - 5)));
    const value = parseNum(selector(player), NaN);
    if (!Number.isFinite(value)) return;
    totalWeight += weight;
    totalValue += value * weight;
  });
  if (totalWeight <= 0) return fallback;
  return +(totalValue / totalWeight).toFixed(1);
}

function computePlayerMatchupEdge(player, oppProfile = {}) {
  const attrs = usagePlayerAttrs(player);
  const pos = clamp(parseNum(player?.pos, 3), 1, 5);
  const perimeterAttack = (parseNum(attrs.shotExt, 55) * 0.54) + (parseNum(attrs.pass, 55) * 0.20) + (parseNum(attrs.speed, 55) * 0.26);
  const interiorAttack = (parseNum(attrs.shotInt, 55) * 0.46) + (parseNum(attrs.strength, parseNum(attrs.physique, 55)) * 0.32) + (parseNum(attrs.reb, 55) * 0.14) + (parseNum(attrs.speed, 55) * 0.08);
  const perimeterDefense = parseNum(oppProfile?.perimeterDef, 55);
  const rimDefense = (parseNum(oppProfile?.rimProtection, 55) * 0.62) + (parseNum(oppProfile?.size, 58) * 0.38);
  if (pos <= 2) return clamp((perimeterAttack - perimeterDefense) / 28, -1.15, 1.15);
  if (pos >= 4) return clamp((interiorAttack - rimDefense) / 28, -1.15, 1.15);
  return clamp((((perimeterAttack * 0.55) + (interiorAttack * 0.45)) - ((perimeterDefense * 0.52) + (rimDefense * 0.48))) / 30, -1.1, 1.1);
}

function buildSingleGamePlayerModifier(player, {
  teamId = 0,
  home = false,
  teamProfile = null,
  oppProfile = null,
  fatigueContext = null,
  baseMinutes = 18,
  coachFx = null
} = {}) {
  const attrs = usagePlayerAttrs(player);
  const ecoFx = getEconomyEffects();
  const pos = clamp(parseNum(player?.pos, 3), 1, 5);
  const rating = clamp(parseNum(player?.rating, ovr(attrs)), 40, 99);
  const age = parseNum(player?.age, 26);
  const isSelf = !!player?.isSelf || String(player?.id || '') === 'USER_SELF';
  const stamina = isSelf ? clamp(parseNum(G.player?.stamina, 100), 0, 100) : clamp(90 - parseNum(fatigueContext?.energyPenalty, 0) + rng(-5, 3) - Math.max(0, age - 31) * 0.4, 62, 97);
  const matchupEdge = computePlayerMatchupEdge(player, oppProfile);
  const coachStocks = parseNum(coachFx?.stocksMult, parseNum(teamProfile?.coachFx?.stocksMult, 1));
  const defensiveLoad = clamp((parseNum(attrs.stl, 55) + parseNum(attrs.blk, 55)) / 120, 0.65, 1.35);
  const fatigueLoad = clamp(
    parseNum(fatigueContext?.loadScore, 0) * 0.7
    + Math.max(0, parseNum(baseMinutes, 18) - 28) * 0.22
    + Math.max(0, age - 30) * 0.35
    + Math.max(0, (72 - stamina) * 0.18),
    0,
    16
  );
  let minuteMult = clamp(1 - fatigueLoad * 0.012 + rng(-0.03, 0.03), 0.72, 1.10);
  let usageMult = clamp(1 - fatigueLoad * 0.007 + matchupEdge * 0.08 + rng(-0.03, 0.03), 0.78, 1.20);
  let efficiencyShift = clamp(matchupEdge * 0.028 - fatigueLoad * 0.0028, -0.08, 0.08);
  let astMult = clamp(1 + matchupEdge * 0.05 - fatigueLoad * 0.003, 0.88, 1.15);
  let rebMult = clamp(1 + (pos >= 4 ? matchupEdge * 0.04 : matchupEdge * 0.02) - fatigueLoad * 0.002, 0.88, 1.16);
  let stocksMult = clamp(1 - fatigueLoad * 0.003 + (coachStocks - 1) * 0.18, 0.86, 1.18);
  const notes = [];
  if (isSelf && parseNum(ecoFx.prepBonus, 0) > 0) {
    const prepBoost = clamp(parseNum(ecoFx.prepBonus, 0) / 100, 0, 0.07);
    efficiencyShift += prepBoost * 0.55;
    astMult *= 1 + prepBoost * 0.6;
    usageMult *= 1 + prepBoost * 0.25;
    notes.push(`赛前准备充分，读秒与对位判断更从容`);
  }

  const hotChance = clamp(0.08 + (rating - 70) * 0.002, 0.08, 0.15);
  const coldChance = clamp(0.09 - (rating - 70) * 0.001, 0.05, 0.11);
  const varianceRoll = Math.random();
  let varianceTag = 'steady';
  if (varianceRoll < hotChance) {
    varianceTag = 'hot';
    usageMult *= 1.06;
    efficiencyShift += 0.03;
    astMult *= 1.04;
    notes.push('手感发烫，进攻参与度上升');
  } else if (varianceRoll > 1 - coldChance) {
    varianceTag = 'cold';
    usageMult *= 0.93;
    efficiencyShift -= 0.035;
    notes.push('开场手感偏冷，效率走低');
  }

  let issueTag = '';
  const issueChance = clamp(0.025 + fatigueLoad * 0.009 + (parseNum(fatigueContext?.backToBack, 0) ? 0.02 : 0), 0.025, 0.20);
  if (Math.random() < issueChance && baseMinutes >= 18) {
    issueTag = pick(['膝盖发紧', '脚踝发酸', '腿部沉重', '腰背僵硬']);
    const minuteHit = rng(8, 16) / 100;
    minuteMult *= 1 - minuteHit;
    usageMult *= 0.95;
    efficiencyShift -= 0.02;
    rebMult *= 0.97;
    notes.push(`${issueTag}，出场时间受限`);
  }

  if (matchupEdge >= 0.45) {
    usageMult *= 1.04;
    efficiencyShift += 0.015;
    notes.push(pos >= 4 ? '对位内线点名空间更大' : '对位脚步跟不上你');
  } else if (matchupEdge <= -0.45) {
    usageMult *= 0.94;
    efficiencyShift -= 0.018;
    astMult *= 0.97;
    notes.push(pos >= 4 ? '对位护框压迫较强' : '对位外线压迫感很强');
  }

  const foulRisk = clamp(
    0.045
    + Math.max(0, parseNum(baseMinutes, 18) - 20) * 0.003
    + (pos >= 4 ? 0.02 : 0.01)
    + Math.max(0, -matchupEdge) * 0.035
    + (defensiveLoad - 1) * 0.04
    + (coachStocks - 1) * 0.16
    + (parseNum(fatigueContext?.backToBack, 0) ? 0.015 : 0),
    0.05,
    0.22
  );
  const foulTrouble = Math.random() < foulRisk;
  let foulCount = clamp(Math.round((parseNum(baseMinutes, 18) / 11.5) + (pos >= 4 ? 0.6 : 0.2) + rng(-1, 1) + Math.max(0, -matchupEdge) * 1.2), 0, 6);
  if (foulTrouble) {
    minuteMult *= pos >= 4 ? rng(68, 84) / 100 : rng(74, 88) / 100;
    usageMult *= 0.93;
    foulCount = clamp(rng(4, 6), 4, 6);
    notes.push('遭遇犯规麻烦，轮换被迫缩短');
  }

  return {
    minuteMult: clamp(minuteMult, 0.56, 1.12),
    usageMult: clamp(usageMult, 0.75, 1.22),
    efficiencyShift: clamp(efficiencyShift, -0.09, 0.09),
    astMult: clamp(astMult, 0.86, 1.18),
    rebMult: clamp(rebMult, 0.86, 1.18),
    stocksMult: clamp(stocksMult, 0.84, 1.22),
    matchupEdge: +matchupEdge.toFixed(2),
    foulTrouble,
    foulCount,
    fatigueLoad: +fatigueLoad.toFixed(1),
    stamina,
    varianceTag,
    issueTag,
    notes
  };
}

function applySingleGameMinuteCaps(rotation = [], gameMods = []) {
  const liveRotation = Array.isArray(rotation) ? rotation : [];
  if (!liveRotation.length) return liveRotation;
  const caps = liveRotation.map((player, i) => {
    const mod = gameMods[i] || {};
    const baseMinutes = clamp(parseNum(player?.baseMinutesRaw, parseNum(player?.minutes, 18)), 0, 40);
    if (mod.foulTrouble) return clamp(Math.round(baseMinutes * 0.82), 12, 34);
    if (mod.issueTag) return clamp(Math.round(baseMinutes * 0.9), 14, 36);
    if (parseNum(mod.minuteMult, 1) < 0.97) return clamp(Math.round(baseMinutes * parseNum(mod.minuteMult, 1)), 10, 38);
    return 40;
  });
  let surplus = 0;
  liveRotation.forEach((player, i) => {
    if (parseNum(player.minutes, 0) > caps[i]) {
      surplus += parseNum(player.minutes, 0) - caps[i];
      player.minutes = caps[i];
    }
  });
  while (surplus > 0) {
    const candidates = liveRotation
      .map((player, i) => ({
        i,
        room: Math.max(0, caps[i] - parseNum(player.minutes, 0)),
        rating: parseNum(player.rating, 65),
        role: String(player.rotationRole || '')
      }))
      .filter(item => item.room > 0)
      .sort((a, b) => b.rating - a.rating || (a.role === 'starter' ? -1 : 0) - (b.role === 'starter' ? -1 : 0));
    if (!candidates.length) break;
    const next = candidates[0];
    liveRotation[next.i].minutes += 1;
    surplus -= 1;
  }
  return liveRotation;
}

function buildTeamSimulationProfile(teamId, { includeUser = false, home = false, fatigueContext = null } = {}) {
  const ctx = buildSimRotationContext(teamId, { includeUser });
  const players = (ctx.simPlayers || []).length ? ctx.simPlayers : (ctx.rotation || []);
  const fatigue = fatigueContext || sampleGenericFatigueContext({ teamId, home, roundIndex: 0, phase: 'regular' });
  const rating = weightedRotationAverage(players, p => parseNum(p?.rating, ovr(usagePlayerAttrs(p))), parseNum(getTeamStrength(teamId), 72));
  const shotExt = weightedRotationAverage(players, p => parseNum(usagePlayerAttrs(p).shotExt, 55), 55);
  const shotInt = weightedRotationAverage(players, p => parseNum(usagePlayerAttrs(p).shotInt, 55), 55);
  const shotFree = weightedRotationAverage(players, p => parseNum(usagePlayerAttrs(p).shotFree, 68), 68);
  const pass = weightedRotationAverage(players, p => parseNum(usagePlayerAttrs(p).pass, 55), 55);
  const rebounding = weightedRotationAverage(players, p => parseNum(usagePlayerAttrs(p).reb, 55), 55);
  const speed = weightedRotationAverage(players, p => parseNum(usagePlayerAttrs(p).speed, 55), 55);
  const strengthAttr = weightedRotationAverage(players, p => parseNum(usagePlayerAttrs(p).strength, parseNum(usagePlayerAttrs(p).physique, 55)), 55);
  const stl = weightedRotationAverage(players, p => parseNum(usagePlayerAttrs(p).stl, 55), 55);
  const blk = weightedRotationAverage(players, p => parseNum(usagePlayerAttrs(p).blk, 55), 55);
  const perimeterDef = weightedRotationAverage(players, p => {
    const attrs = usagePlayerAttrs(p);
    return (parseNum(attrs.stl, 55) * 0.42) + (parseNum(attrs.speed, 55) * 0.22) + (parseNum(p?.def, parseNum(p?.rating, 65)) * 0.36);
  }, 55);
  const rimProtection = weightedRotationAverage(players, p => {
    const attrs = usagePlayerAttrs(p);
    return (parseNum(attrs.blk, 55) * 0.52) + (parseNum(attrs.reb, 55) * 0.18) + (parseNum(attrs.strength, parseNum(attrs.physique, 55)) * 0.30);
  }, 55);
  const size = weightedRotationAverage(players, p => {
    const attrs = usagePlayerAttrs(p);
    const pos = clamp(parseNum(p?.pos, 3), 1, 5);
    const positionSize = pos >= 4 ? 66 : pos === 3 ? 60 : 54;
    return (parseNum(attrs.reb, 55) * 0.25) + (parseNum(attrs.strength, parseNum(attrs.physique, 55)) * 0.35) + positionSize;
  }, 58);
  const starters = players.slice(0, 5);
  const bench = players.slice(5);
  const starterRating = weightedRotationAverage(starters, p => parseNum(p?.rating, rating), rating);
  const benchRating = bench.length ? weightedRotationAverage(bench, p => parseNum(p?.rating, rating - 6), rating - 6) : (starterRating - 7);
  let depth = clamp(52 + (benchRating - 68) * 1.65 + Math.max(0, players.length - 8) * 1.2, 36, 88);
  let offense = 57 + parseNum(getTeamStrength(teamId), rating) * 0.24 + rating * 0.18 + shotExt * 0.11 + shotInt * 0.10 + pass * 0.12 + (parseNum(ctx.coachFx?.offPct, 0) + parseNum(ctx.coachFx?.tacticsPct, 0)) * 60 + (parseNum(ctx.coachFx?.teamRatingMult, 1) - 1) * 30;
  let defense = 55 + parseNum(getTeamStrength(teamId), rating) * 0.22 + perimeterDef * 0.14 + rimProtection * 0.12 + rebounding * 0.10 + depth * 0.08 + (parseNum(ctx.coachFx?.defPct, 0) + parseNum(ctx.coachFx?.tacticsPct, 0) * 0.5) * 60;
  let pace = clamp(48 + speed * 0.18 + pass * 0.10 + (parseNum(ctx.coachFx?.paceMult, 1) - 1) * 110 + (parseNum(ctx.coachFx?.threeRateMult, 1) - 1) * 16, 44, 84);
  offense -= parseNum(fatigue?.skillPenalty, 0) * 0.72;
  defense -= parseNum(fatigue?.skillPenalty, 0) * 0.58;
  pace -= parseNum(fatigue?.pacePenalty, 0) * 0.65;
  depth -= parseNum(fatigue?.loadScore, 0) * 0.28;
  if (parseNum(teamId, 0) === parseNum(G.teamId, 0) && G.player?.injury?.active) {
    offense -= 4.5;
    depth -= 2;
    pace -= 1;
  }
  return {
    ...ctx,
    home: !!home,
    rating: +rating.toFixed(1),
    shotExt,
    shotInt,
    shotFree,
    pass,
    rebounding,
    speed,
    strengthAttr,
    stl,
    blk,
    perimeterDef: +perimeterDef.toFixed(1),
    rimProtection: +rimProtection.toFixed(1),
    size: +size.toFixed(1),
    depth: +depth.toFixed(1),
    offense: +clamp(offense, 68, 97).toFixed(1),
    defense: +clamp(defense, 68, 97).toFixed(1),
    pace: +pace.toFixed(1),
    starterRating: +starterRating.toFixed(1),
    benchRating: +benchRating.toFixed(1),
    fatigueContext: fatigue
  };
}

function simulateTeamOffensePlan(teamProfile, oppProfile, { home = false, sharedPossessions = 96 } = {}) {
  const homeBoost = home ? 0.008 : 0;
  const offenseEdge = parseNum(teamProfile?.offense, 78) - parseNum(oppProfile?.defense, 78);
  const possessions = clamp(Math.round(sharedPossessions + (home ? 1 : 0) + (parseNum(teamProfile?.depth, 55) - parseNum(oppProfile?.depth, 55)) / 22 + rng(-1, 1)), 88, 112);
  const threeShare = clamp(
    0.29
    + (parseNum(teamProfile?.shotExt, 55) - 55) / 210
    + (parseNum(teamProfile?.coachFx?.threeRateMult, 1) - 1) * 0.62
    + (parseNum(teamProfile?.coachFx?.paceMult, 1) - 1) * 0.08
    - (parseNum(oppProfile?.perimeterDef, 55) - 55) / 800
    + rng(-0.015, 0.015),
    0.22,
    0.50
  );
  const threePct = clamp(
    0.31
    + (parseNum(teamProfile?.shotExt, 55) - 55) / 240
    + offenseEdge / 500
    - (parseNum(oppProfile?.perimeterDef, 55) - 55) / 350
    + homeBoost
    + rng(-0.012, 0.012),
    0.28,
    0.43
  );
  const twoPct = clamp(
    0.47
    + (parseNum(teamProfile?.shotInt, 55) - 55) / 220
    + offenseEdge / 420
    - (parseNum(oppProfile?.rimProtection, 55) - 55) / 340
    + homeBoost
    + rng(-0.012, 0.012),
    0.43,
    0.63
  );
  const fgPct = clamp((twoPct * (1 - threeShare)) + (threePct * threeShare), 0.41, 0.58);
  const tovRate = clamp(
    0.145
    - (parseNum(teamProfile?.rating, 72) - 72) / 650
    - (parseNum(teamProfile?.pass, 55) - 55) / 450
    - (parseNum(teamProfile?.speed, 55) - 55) / 900
    + (parseNum(oppProfile?.perimeterDef, 55) - 55) / 420
    + (parseNum(oppProfile?.coachFx?.stocksMult, 1) - 1) * 0.18
    - (home ? 0.004 : 0)
    + rng(-0.006, 0.006),
    0.095,
    0.185
  );
  const orbRate = clamp(
    0.245
    + (parseNum(teamProfile?.rebounding, 55) - parseNum(oppProfile?.rebounding, 55)) / 280
    + (parseNum(teamProfile?.size, 58) - parseNum(oppProfile?.size, 58)) / 420
    + (parseNum(teamProfile?.coachFx?.rebMult, 1) - 1) * 0.45
    + rng(-0.015, 0.015),
    0.18,
    0.37
  );
  const ftr = clamp(
    0.20
    + (parseNum(teamProfile?.shotInt, 55) - parseNum(oppProfile?.rimProtection, 55)) / 260
    + (parseNum(teamProfile?.coachFx?.paintRateMult, 1) - 1) * 0.26
    + homeBoost
    + rng(-0.015, 0.015),
    0.12,
    0.34
  );
  const ftPct = clamp(
    0.73
    + (parseNum(teamProfile?.shotFree, 68) - 68) / 200
    + (parseNum(teamProfile?.pass, 55) - 55) / 900
    + (home ? 0.004 : 0),
    0.67,
    0.87
  );
  const turnovers = clamp(Math.round(possessions * tovRate), 7, 22);
  const denom = clamp(1 + (0.44 * ftr) - (orbRate * (1 - fgPct)), 0.74, 1.18);
  const fga = clamp(Math.round((possessions - turnovers) / denom), 60, 104);
  const tpa = clamp(Math.round(fga * threeShare), 12, fga);
  const twoPa = Math.max(0, fga - tpa);
  const tpm = clamp(Math.round(tpa * threePct), 0, tpa);
  const twoPm = clamp(Math.round(twoPa * twoPct), 0, twoPa);
  const fgm = tpm + twoPm;
  const misses = Math.max(0, fga - fgm);
  const orb = clamp(Math.round(misses * orbRate), 4, 22);
  const fta = clamp(Math.round(fga * ftr), 8, 40);
  const ftm = clamp(Math.round(fta * ftPct), 0, fta);
  const astRate = clamp(
    0.54
    + (parseNum(teamProfile?.pass, 55) - 55) / 220
    + (parseNum(teamProfile?.coachFx?.astMult, 1) - 1) * 0.6
    - (parseNum(oppProfile?.perimeterDef, 55) - 55) / 800,
    0.42,
    0.74
  );
  const ast = clamp(Math.round(fgm * astRate), 8, fgm);
  return {
    teamId: parseNum(teamProfile?.teamId, 0),
    home: !!home,
    possessions,
    turnovers,
    tovRate: +tovRate.toFixed(3),
    orb,
    orbRate: +orbRate.toFixed(3),
    ftr: +ftr.toFixed(3),
    fga,
    fgm,
    tpa,
    tpm,
    twoPa,
    twoPm,
    fta,
    ftm,
    ftPct: +ftPct.toFixed(3),
    twoPct: +twoPct.toFixed(3),
    threePct: +threePct.toFixed(3),
    threeShare: +threeShare.toFixed(3),
    fgPct: +fgPct.toFixed(3),
    efg: +(((fgm + (0.5 * tpm)) / Math.max(1, fga))).toFixed(3),
    ast,
    astRate: +astRate.toFixed(3),
    points: (twoPm * 2) + (tpm * 3) + ftm,
    oppDefenseRating: parseNum(oppProfile?.defense, 78)
  };
}

function buildMatchupSimulationPlans(homeProfile, awayProfile, opts = {}) {
  const phase = String(opts.phase || 'regular').trim() || 'regular';
  const averagePace = (parseNum(homeProfile?.pace, 60) + parseNum(awayProfile?.pace, 60)) / 2;
  const coachPace = (parseNum(homeProfile?.coachFx?.paceMult, 1) + parseNum(awayProfile?.coachFx?.paceMult, 1)) / 2;
  let sharedPossessions = 96
    + (averagePace - 60) * 0.20
    + (coachPace - 1) * 18
    + (parseNum(homeProfile?.depth, 55) + parseNum(awayProfile?.depth, 55) - 120) * 0.03
    + rng(-4, 4);
  if (phase === 'playoffs') sharedPossessions -= 1.5;
  sharedPossessions = clamp(Math.round(sharedPossessions), 88, 111);

  const homePlan = simulateTeamOffensePlan(homeProfile, awayProfile, { home: true, sharedPossessions });
  const awayPlan = simulateTeamOffensePlan(awayProfile, homeProfile, { home: false, sharedPossessions });
  const homeStealShare = clamp(0.42 + (parseNum(homeProfile?.perimeterDef, 55) - 55) / 180 + (parseNum(homeProfile?.coachFx?.stocksMult, 1) - 1) * 0.45, 0.32, 0.66);
  const awayStealShare = clamp(0.42 + (parseNum(awayProfile?.perimeterDef, 55) - 55) / 180 + (parseNum(awayProfile?.coachFx?.stocksMult, 1) - 1) * 0.45, 0.32, 0.66);
  homePlan.stl = clamp(Math.round(parseNum(awayPlan?.turnovers, 12) * homeStealShare), 3, 14);
  awayPlan.stl = clamp(Math.round(parseNum(homePlan?.turnovers, 12) * awayStealShare), 3, 14);
  homePlan.blk = clamp(Math.round(parseNum(awayPlan?.twoPa, 48) * clamp(0.032 + (parseNum(homeProfile?.rimProtection, 55) - 55) / 680 + (parseNum(homeProfile?.coachFx?.stocksMult, 1) - 1) * 0.08, 0.02, 0.11)), 1, 10);
  awayPlan.blk = clamp(Math.round(parseNum(homePlan?.twoPa, 48) * clamp(0.032 + (parseNum(awayProfile?.rimProtection, 55) - 55) / 680 + (parseNum(awayProfile?.coachFx?.stocksMult, 1) - 1) * 0.08, 0.02, 0.11)), 1, 10);
  homePlan.drb = clamp(Math.round(Math.max(0, parseNum(awayPlan?.fga, 84) - parseNum(awayPlan?.fgm, 38)) * (1 - parseNum(awayPlan?.orbRate, 0.24))), 18, 42);
  awayPlan.drb = clamp(Math.round(Math.max(0, parseNum(homePlan?.fga, 84) - parseNum(homePlan?.fgm, 38)) * (1 - parseNum(homePlan?.orbRate, 0.24))), 18, 42);
  homePlan.reb = homePlan.orb + homePlan.drb;
  awayPlan.reb = awayPlan.orb + awayPlan.drb;

  let overtimes = 0;
  const homeOtPeriods = [];
  const awayOtPeriods = [];
  const currentMargin = Math.abs(parseNum(homePlan?.points, 0) - parseNum(awayPlan?.points, 0));
  const homeFavored = parseNum(homePlan?.points, 0) === parseNum(awayPlan?.points, 0)
    ? (parseNum(homeProfile?.offense, 78) + 1.5 >= parseNum(awayProfile?.offense, 78))
    : parseNum(homePlan?.points, 0) > parseNum(awayPlan?.points, 0);
  const otChance = parseNum(homePlan?.points, 0) === parseNum(awayPlan?.points, 0)
    ? 1
    : currentMargin <= 1 ? 0.10 : currentMargin <= 3 ? 0.04 : currentMargin <= 5 ? 0.01 : 0;
  if (Math.random() < otChance) {
    overtimes = (currentMargin <= 1 && Math.random() < 0.04) ? 2 : 1;
    const avgScore = Math.round((parseNum(homePlan?.points, 0) + parseNum(awayPlan?.points, 0)) / 2);
    const regulationTie = clamp(avgScore - rng(6, 9) * overtimes, 82, 132);
    for (let i = 0; i < overtimes; i++) {
      const loserPts = rng(4, 8);
      const winnerPts = loserPts + rng(1, 4);
      if (homeFavored) {
        homeOtPeriods.push(winnerPts);
        awayOtPeriods.push(loserPts);
      } else {
        awayOtPeriods.push(winnerPts);
        homeOtPeriods.push(loserPts);
      }
    }
    homePlan.points = regulationTie + homeOtPeriods.reduce((sum, value) => sum + value, 0);
    awayPlan.points = regulationTie + awayOtPeriods.reduce((sum, value) => sum + value, 0);
    homePlan.possessions += overtimes * 5;
    awayPlan.possessions += overtimes * 5;
  } else if (parseNum(homePlan?.points, 0) === parseNum(awayPlan?.points, 0)) {
    if (homeFavored) homePlan.points += 1;
    else awayPlan.points += 1;
  }

  homePlan.ortg = Math.round(parseNum(homePlan?.points, 0) / Math.max(1, parseNum(homePlan?.possessions, 96)) * 100);
  awayPlan.ortg = Math.round(parseNum(awayPlan?.points, 0) / Math.max(1, parseNum(awayPlan?.possessions, 96)) * 100);
  return { homePlan, awayPlan, overtimes, homeOtPeriods, awayOtPeriods };
}

function buildPlayerGameRow(player, targetPts, oppRating, { teamId = 0, home = false, sourcePlayer = null, coachFx = null, teamPlan = null, gameMod = null } = {}) {
  const isSelf = !!player.isSelf;
  const simPlayer = sourcePlayer || player;
  const attrs = usagePlayerAttrs(simPlayer);
  const teamCoachFx = coachFx || getCoachEffects(teamId);
  const systemRole = buildCoachSystemRoleEffect(simPlayer, teamCoachFx);
  const minutes = clamp(Math.round(parseNum(player.minutes, 0)), 0, 40);
  const pos = clamp(parseNum(player.pos, 3), 1, 5);
  const rating = clamp(parseNum(player.rating, 65), 40, 99);
  const planPaceFactor = teamPlan ? clamp(Math.pow(parseNum(teamPlan?.possessions, 96) / 96, 0.55), 0.88, 1.14) : 1;
  const planThreeFactor = teamPlan ? clamp(parseNum(teamPlan?.threeShare, 0.34) / 0.34, 0.82, 1.24) : 1;
  const planPaintFactor = teamPlan ? clamp(0.84 + parseNum(teamPlan?.ftr, 0.20) * 1.45, 0.82, 1.24) : 1;
  const planAstFactor = teamPlan ? clamp(0.82 + parseNum(teamPlan?.astRate, 0.58), 0.86, 1.22) : 1;
  const planRebFactor = teamPlan ? clamp(0.76 + parseNum(teamPlan?.orbRate, 0.24) * 1.2, 0.84, 1.20) : 1;
  const planStocksFactor = teamPlan ? clamp(0.82 + parseNum(teamPlan?.oppDefenseRating, 78) / 100, 0.88, 1.18) : 1;
  const threeShareMult = clamp((parseNum(teamCoachFx?.threeRateMult, 1) + parseNum(systemRole?.threeMod, 0) * 1.4) * planThreeFactor * (gameMod?.varianceTag === 'hot' ? 1.03 : gameMod?.varianceTag === 'cold' ? 0.97 : 1), 0.76, 1.38);
  const paintShareMult = clamp((parseNum(teamCoachFx?.paintRateMult, 1) + parseNum(systemRole?.insideMod, 0) * 1.4) * planPaintFactor, 0.76, 1.36);
  const astMult = clamp((parseNum(teamCoachFx?.astMult, 1) + parseNum(systemRole?.astMod, 0) * 0.10) * planAstFactor * parseNum(gameMod?.astMult, 1), 0.84, 1.34);
  const rebMult = clamp((parseNum(teamCoachFx?.rebMult, 1) + parseNum(systemRole?.rebMod, 0) * 0.12) * planRebFactor * parseNum(gameMod?.rebMult, 1), 0.84, 1.34);
  const stocksMult = clamp((parseNum(teamCoachFx?.stocksMult, 1) + (parseNum(systemRole?.stlMod, 0) + parseNum(systemRole?.blkMod, 0)) * 0.10) * planStocksFactor * parseNum(gameMod?.stocksMult, 1), 0.84, 1.32);
  const row = {
    teamId,
    playerId: isSelf ? 'USER_SELF' : (player.id ?? 0),
    name: String(player.name || 'Player'),
    pos,
    pos2: clamp(parseNum(player.pos2, 0), 0, 5),
    isSelf,
    home,
    mins: minutes,
    pts: 0,
    reb: 0,
    ast: 0,
    stl: 0,
    blk: 0,
    pf: 0,
    tov: 0,
    fgm: 0,
    fga: 0,
    tpm: 0,
    tpa: 0,
    ftm: 0,
    fta: 0,
    issueTag: '',
    foulTrouble: false,
    varianceTag: 'steady'
  };

  if (minutes <= 0 || targetPts <= 0) {
    row.reb = clamp(Math.round(((minutes / 12) * (pos >= 4 ? 1.2 : 0.5) + (rating - 60) / 35) * rebMult + parseNum(systemRole?.rebMod, 0) + rng(-1, 1)), 0, pos >= 4 ? 14 : 9);
    row.ast = clamp(Math.round(((minutes / 13) * (pos <= 2 ? 1.4 : pos === 3 ? 0.9 : 0.5) + (rating - 60) / 45) * astMult + parseNum(systemRole?.astMod, 0) + rng(-1, 1)), 0, 12);
    row.stl = clamp(Math.round(((minutes / 18) * (pos <= 3 ? 0.5 : 0.3)) * stocksMult + parseNum(systemRole?.stlMod, 0) + rng(0, 1)), 0, 5);
    row.blk = clamp(Math.round(((minutes / 18) * (pos >= 4 ? 0.65 : 0.2)) * stocksMult + parseNum(systemRole?.blkMod, 0) + rng(0, 1)), 0, 5);
    row.tov = clamp(Math.round((minutes / 10) * (pos <= 2 ? 0.75 : 0.5) + rng(0, 1)), 0, 8);
    row.pf = clamp(parseNum(gameMod?.foulCount, Math.round((minutes / 12) * (pos >= 4 ? 1.25 : 1.0) + rng(0, 1))), 0, 6);
    row.issueTag = String(gameMod?.issueTag || '').trim();
    row.foulTrouble = !!gameMod?.foulTrouble;
    row.varianceTag = String(gameMod?.varianceTag || 'steady');
    row.gameNotes = Array.isArray(gameMod?.notes) ? [...gameMod.notes] : [];
    return row;
  }

  let fta = clamp(Math.round(targetPts * (0.08 + (rating - 60) / 280) * paintShareMult + rng(0, 1)), 0, Math.min(12, targetPts));
  let ftm = clamp(Math.round(fta * clamp(0.68 + (rating - 65) / 90, 0.65, 0.93)), 0, fta);
  let fgPts = Math.max(0, targetPts - ftm);
  let tpm = 0;
  let fgm = 0;

  if (fgPts > 0) {
    const maxTpm = Math.floor(fgPts / 3);
    const threeBase = (pos <= 2 ? 0.95 : pos === 3 ? 0.58 : 0.22) * threeShareMult;
    tpm = clamp(Math.round((minutes / 36) * (threeBase * 4) + (rating - 60) / 18 - (oppRating - 75) / 60 + rng(-1, 1)), 0, maxTpm);
    if (((fgPts - tpm) & 1) === 1) {
      if (tpm < maxTpm) tpm++;
      else if (tpm > 0) tpm--;
    }
    while (tpm > maxTpm) tpm--;
    fgm = Math.max(tpm, (fgPts - tpm) / 2);
  }

  const varianceEfficiency = 1 - (parseNum(gameMod?.efficiencyShift, 0) * 1.8);
  const efficiencyFactor = teamPlan ? clamp((1.08 - ((parseNum(teamPlan?.efg, 0.52) - 0.52) * 0.9)) * varianceEfficiency, 0.84, 1.16) : clamp(varianceEfficiency, 0.86, 1.16);
  const fga = clamp(Math.max(fgm + rng(1, 4), Math.round(minutes * 0.42 * planPaceFactor * efficiencyFactor) + rng(-1, 3), tpm + rng(1, 3)), Math.max(fgm, tpm), 28);
  const tpa = clamp(Math.max(tpm, Math.round(fga * clamp((pos <= 2 ? 0.44 : pos === 3 ? 0.34 : 0.22) * threeShareMult, 0.10, 0.65) + rng(-1, 1))), tpm, fga);

  row.fta = fta;
  row.ftm = ftm;
  row.fgm = fgm;
  row.fga = fga;
  row.tpm = tpm;
  row.tpa = tpa;
  row.pts = (row.fgm - row.tpm) * 2 + row.tpm * 3 + row.ftm;
  row.reb = clamp(Math.round(((minutes / 12) * (pos >= 4 ? 1.25 : 0.55) + (rating - 60) / 35) * rebMult + parseNum(systemRole?.rebMod, 0) + rng(-1, 2)), 0, pos >= 4 ? 16 : 10);
  row.ast = clamp(Math.round(((minutes / 13) * (pos <= 2 ? 1.55 : pos === 3 ? 0.95 : 0.5) + (rating - 60) / 45) * astMult + parseNum(systemRole?.astMod, 0) + rng(-1, 2)), 0, 14);
  row.stl = clamp(Math.round(((minutes / 18) * (pos <= 3 ? 0.55 : 0.35)) * stocksMult + parseNum(systemRole?.stlMod, 0) + rng(0, 1)), 0, 6);
  row.blk = clamp(Math.round(((minutes / 18) * (pos >= 4 ? 0.7 : 0.25)) * stocksMult + parseNum(systemRole?.blkMod, 0) + rng(0, 1)), 0, 6);
  row.tov = clamp(Math.round((minutes / 10) * (pos <= 2 ? 0.8 : 0.55) + (targetPts >= 20 ? 0.5 : 0.2) + rng(0, 1)), 0, 8);
  row.pf = clamp(parseNum(gameMod?.foulCount, Math.round((minutes / 11.5) * (pos >= 4 ? 1.2 : 0.95) + Math.max(0, -parseNum(gameMod?.matchupEdge, 0)) + rng(-1, 1))), 0, 6);
  row.issueTag = String(gameMod?.issueTag || '').trim();
  row.foulTrouble = !!gameMod?.foulTrouble;
  row.varianceTag = String(gameMod?.varianceTag || 'steady');
  row.gameNotes = Array.isArray(gameMod?.notes) ? [...gameMod.notes] : [];
  return row;
}

function buildTeamGameBoxScore(teamId, teamPts, oppRating, { home = false, includeUser = false, teamProfile = null, oppProfile = null, fatigueContext = null } = {}) {
  const teamPlan = teamPts && typeof teamPts === 'object' ? teamPts : null;
  const resolvedTeamPts = parseNum(teamPlan?.points, parseNum(teamPts, 0));
  const oppRatingValue = parseNum(teamPlan?.oppDefenseRating, parseNum(oppRating?.defense, parseNum(oppRating, 75)));
  const ctx = buildSimRotationContext(teamId, { includeUser });
  const team = ctx.team;
  const teamName = ctx.teamName;
  const abbr = ctx.abbr;
  const coachFx = ctx.coachFx;
  const rotation = ctx.rotation;
  const simPlayers = ctx.simPlayers;
  const ownProfile = teamProfile || buildTeamSimulationProfile(teamId, { includeUser, home, fatigueContext });
  const enemyProfile = oppProfile || (oppRating && typeof oppRating === 'object' ? oppRating : null);
  const gameMods = rotation.map((p, i) => buildSingleGamePlayerModifier(simPlayers[i] || p, {
    teamId,
    home,
    teamProfile: ownProfile,
    oppProfile: enemyProfile,
    fatigueContext: fatigueContext || ownProfile?.fatigueContext,
    baseMinutes: parseNum(p?.minutes, 18),
    coachFx
  }));
  const liveRotation = rotation.map((p, i) => ({
    ...p,
    baseMinutesRaw: parseNum(p?.minutes, 18),
    minutes: clamp(Math.round(parseNum(p?.minutes, 18) * parseNum(gameMods[i]?.minuteMult, 1)), 0, 40)
  }));
  if (typeof normalizeRotationMinutes === 'function') normalizeRotationMinutes(liveRotation, 240);
  applySingleGameMinuteCaps(liveRotation, gameMods);
  if (typeof normalizeRotationMinutes === 'function') normalizeRotationMinutes(liveRotation, 240);
  applySingleGameMinuteCaps(liveRotation, gameMods);
  const usageContext = buildTeamUsageContext(teamId, simPlayers, simPlayers);

  const weights = liveRotation.map((p, i) => {
    const simPlayer = simPlayers[i] || p;
    const roleFx = collectRoleEffects(getPlayerRole(simPlayer, simPlayers, coachFx, usageContext));
    const rating = clamp(parseNum(p.rating, 65), 40, 99);
    const minutes = clamp(parseNum(p.minutes, 18), 0, 40);
    const tierBonus = { alpha: 1.18, second: 1.12, third: 1.07, sixthman: 1.04, rolestarter: 1.0, bench: 0.88, end: 0.72 }[p.teamTier] || 1;
    const selfBonus = p.isSelf ? 1.12 : 1;
    const planPaceFactor = teamPlan ? clamp(Math.pow(parseNum(teamPlan?.possessions, 96) / 96, 0.45), 0.90, 1.12) : 1;
    const usageBoost = clamp((1 + roleFx.usageMod * 0.90 + (parseNum(coachFx.paceMult, 1) - 1) * 0.35) * planPaceFactor * parseNum(gameMods[i]?.usageMult, 1), 0.72, 1.36);
    const shotProfileBoost = clamp(1 + roleFx.threeMod * 0.55 + roleFx.insideMod * 0.55, 0.82, 1.24);
    const efficiencyBoost = clamp(1 + parseNum(gameMods[i]?.efficiencyShift, 0) * 3.2, 0.80, 1.22);
    return Math.max(0.1, minutes * (0.7 + rating / 130) * tierBonus * selfBonus * usageBoost * shotProfileBoost * efficiencyBoost * (1 + rng(-0.08, 0.08)));
  });
  const targets = allocateIntegerShares(Math.max(0, Math.round(resolvedTeamPts)), weights);
  const rows = liveRotation.map((p, i) => buildPlayerGameRow(p, targets[i] || 0, oppRatingValue, { teamId, home, sourcePlayer: simPlayers[i], coachFx, teamPlan, gameMod: gameMods[i] }));

  if (teamId === parseNum(G.teamId, 0) && G.player?.injury?.active) {
    rows.push({
      teamId,
      playerId: 'USER_SELF',
      name: String(G.player.name || 'Player'),
      pos: clamp(parseNum(G.player.pos, 3), 1, 5),
      pos2: 0,
      isSelf: true,
      home,
      mins: 0,
      pts: 0,
      reb: 0,
      ast: 0,
      stl: 0,
      blk: 0,
      pf: 0,
      tov: 0,
      fgm: 0,
      fga: 0,
      tpm: 0,
      tpa: 0,
      ftm: 0,
      fta: 0,
      status: 'DNP'
    });
  }

  rows.sort((a, b) => (a.status ? 1 : 0) - (b.status ? 1 : 0) || parseNum(b.pts, 0) - parseNum(a.pts, 0) || parseNum(b.mins, 0) - parseNum(a.mins, 0) || (a.isSelf ? -1 : 0) - (b.isSelf ? -1 : 0));

  const totals = rows.reduce((acc, row) => {
    if (!row.status) acc.gp++;
    acc.mins += parseNum(row.mins, 0);
    acc.pts += parseNum(row.pts, 0);
    acc.reb += parseNum(row.reb, 0);
    acc.ast += parseNum(row.ast, 0);
    acc.stl += parseNum(row.stl, 0);
    acc.blk += parseNum(row.blk, 0);
    acc.pf += parseNum(row.pf, 0);
    acc.tov += parseNum(row.tov, 0);
    acc.fgm += parseNum(row.fgm, 0);
    acc.fga += parseNum(row.fga, 0);
    acc.tpm += parseNum(row.tpm, 0);
    acc.tpa += parseNum(row.tpa, 0);
    acc.ftm += parseNum(row.ftm, 0);
    acc.fta += parseNum(row.fta, 0);
    return acc;
  }, { gp: 0, mins: 0, pts: 0, reb: 0, ast: 0, stl: 0, blk: 0, pf: 0, tov: 0, fgm: 0, fga: 0, tpm: 0, tpa: 0, ftm: 0, fta: 0 });

  return { teamId: parseNum(teamId, 0), team, teamName, abbr, home: !!home, teamPts: resolvedTeamPts, oppRating: oppRatingValue, boxScore: rows, rows, totals, teamPlan };
}

function computePeriodLeadStats(homePeriods = [], awayPeriods = []) {
  let homeCum = 0;
  let awayCum = 0;
  let biggestLeadHome = 0;
  let biggestLeadAway = 0;
  let leadChanges = 0;
  let prevLeader = 0;
  const total = Math.max(homePeriods.length, awayPeriods.length);
  for (let i = 0; i < total; i++) {
    homeCum += parseNum(homePeriods[i], 0);
    awayCum += parseNum(awayPeriods[i], 0);
    const diff = homeCum - awayCum;
    const leader = diff > 0 ? 1 : (diff < 0 ? -1 : 0);
    if (leader !== 0 && prevLeader !== 0 && leader !== prevLeader) leadChanges++;
    if (leader !== 0) prevLeader = leader;
    biggestLeadHome = Math.max(biggestLeadHome, diff);
    biggestLeadAway = Math.max(biggestLeadAway, -diff);
  }
  return { biggestLeadHome, biggestLeadAway, leadChanges };
}

function injectPeriodComebackSwing(homePeriods, awayPeriods, { winnerHome = true, forceTwoSwings = false } = {}) {
  if (!Array.isArray(homePeriods) || !Array.isArray(awayPeriods) || homePeriods.length < 4 || awayPeriods.length < 4) return;
  const primaryEarly = Math.random() < 0.5 ? 0 : 1;
  const primaryLate = 3;
  const applySwing = (fromWinner, fromLoser, amount) => {
    if (amount <= 0) return;
    if (winnerHome) {
      homePeriods[fromWinner] -= amount;
      awayPeriods[fromWinner] += amount;
      homePeriods[fromLoser] += amount;
      awayPeriods[fromLoser] -= amount;
    } else {
      awayPeriods[fromWinner] -= amount;
      homePeriods[fromWinner] += amount;
      awayPeriods[fromLoser] += amount;
      homePeriods[fromLoser] -= amount;
    }
  };
  const primaryCap = Math.min(
    winnerHome ? parseNum(homePeriods[primaryEarly], 0) : parseNum(awayPeriods[primaryEarly], 0),
    winnerHome ? parseNum(awayPeriods[primaryLate], 0) : parseNum(homePeriods[primaryLate], 0)
  );
  const primarySwing = clamp(Math.min(5, Math.floor(primaryCap / 3)), 2, 5);
  applySwing(primaryEarly, primaryLate, primarySwing);

  if (!forceTwoSwings) return;
  const secondaryEarly = primaryEarly === 0 ? 1 : 0;
  const secondaryLate = 2;
  const secondaryCap = Math.min(
    winnerHome ? parseNum(homePeriods[secondaryEarly], 0) : parseNum(awayPeriods[secondaryEarly], 0),
    winnerHome ? parseNum(awayPeriods[secondaryLate], 0) : parseNum(homePeriods[secondaryLate], 0)
  );
  const secondarySwing = clamp(Math.min(3, Math.floor(secondaryCap / 4)), 1, 3);
  applySwing(secondaryEarly, secondaryLate, secondarySwing);
}

function buildGameFlow(homeSnapshot, awaySnapshot, { userTeamId = 0, homePlan = null, awayPlan = null, overtimes = 0, homeOtPeriods = null, awayOtPeriods = null } = {}) {
  const homeScore = parseNum(homeSnapshot?.teamPts, 0);
  const awayScore = parseNum(awaySnapshot?.teamPts, 0);
  const margin = Math.abs(homeScore - awayScore);
  const closeGame = margin <= 7 || parseNum(overtimes, 0) > 0;
  const winnerHome = homeScore > awayScore;
  const resolvedHomeOt = Array.isArray(homeOtPeriods) ? homeOtPeriods.slice() : [];
  const resolvedAwayOt = Array.isArray(awayOtPeriods) ? awayOtPeriods.slice() : [];
  const labels = ['Q1', 'Q2', 'Q3', 'Q4'];
  for (let i = 0; i < parseNum(overtimes, 0); i++) labels.push(i === 0 ? 'OT' : `${i + 1}OT`);
  let regulationHomeScore = homeScore - resolvedHomeOt.reduce((sum, value) => sum + parseNum(value, 0), 0);
  let regulationAwayScore = awayScore - resolvedAwayOt.reduce((sum, value) => sum + parseNum(value, 0), 0);
  if (parseNum(overtimes, 0) <= 0) {
    regulationHomeScore = homeScore;
    regulationAwayScore = awayScore;
  }
  const homeRegWeights = [0.24, 0.25, 0.25, 0.26].map((w, i) => Math.max(0.08, w + (closeGame && i === 3 ? 0.04 : 0) + (!winnerHome && closeGame && i === 1 ? 0.015 : 0) + (winnerHome && margin >= 10 && i === 3 ? -0.02 : 0) + rng(-0.02, 0.02)));
  const awayRegWeights = [0.25, 0.24, 0.25, 0.26].map((w, i) => Math.max(0.08, w + (closeGame && i === 3 ? 0.04 : 0) + (winnerHome && closeGame && i === 1 ? 0.015 : 0) + (!winnerHome && margin >= 10 && i === 3 ? -0.02 : 0) + rng(-0.02, 0.02)));
  const homePeriods = [...allocateIntegerShares(Math.max(0, regulationHomeScore), homeRegWeights), ...resolvedHomeOt];
  const awayPeriods = [...allocateIntegerShares(Math.max(0, regulationAwayScore), awayRegWeights), ...resolvedAwayOt];
  let leadStats = computePeriodLeadStats(homePeriods, awayPeriods);
  if (closeGame && leadStats.leadChanges === 0) {
    injectPeriodComebackSwing(homePeriods, awayPeriods, { winnerHome, forceTwoSwings: margin <= 4 || parseNum(overtimes, 0) > 0 });
    leadStats = computePeriodLeadStats(homePeriods, awayPeriods);
  }
  const homePoss = clamp(parseNum(homePlan?.possessions, Math.round(92 + rng(-3, 5) + (parseNum(homeSnapshot?.totals?.fga, 0) + parseNum(awaySnapshot?.totals?.fga, 0)) * 0.12)), 84, 115);
  const awayPoss = clamp(parseNum(awayPlan?.possessions, Math.round(homePoss + rng(-2, 2))), 84, 115);
  const homeOrtg = Math.round(homeScore / Math.max(1, homePoss) * 100);
  const awayOrtg = Math.round(awayScore / Math.max(1, awayPoss) * 100);
  const homeEfg = Number.isFinite(parseNum(homePlan?.efg, NaN))
    ? Math.round(parseNum(homePlan?.efg, 0.52) * 100)
    : (homeSnapshot?.totals?.fga > 0 ? Math.round(((homeSnapshot.totals.fgm + 0.5 * homeSnapshot.totals.tpm) / homeSnapshot.totals.fga) * 100) : 0);
  const awayEfg = Number.isFinite(parseNum(awayPlan?.efg, NaN))
    ? Math.round(parseNum(awayPlan?.efg, 0.52) * 100)
    : (awaySnapshot?.totals?.fga > 0 ? Math.round(((awaySnapshot.totals.fgm + 0.5 * awaySnapshot.totals.tpm) / awaySnapshot.totals.fga) * 100) : 0);
  const homeTovRate = Math.round(parseNum(homePlan?.tovRate, parseNum(homeSnapshot?.totals?.tov, 0) / Math.max(1, homePoss)) * 100);
  const awayTovRate = Math.round(parseNum(awayPlan?.tovRate, parseNum(awaySnapshot?.totals?.tov, 0) / Math.max(1, awayPoss)) * 100);

  const biggestLeadHome = leadStats.biggestLeadHome;
  const biggestLeadAway = leadStats.biggestLeadAway;
  const leadChanges = leadStats.leadChanges;

  const summary = parseNum(overtimes, 0) > 0
    ? (winnerHome ? '双方鏖战至加时，主队在额外回合里执行更稳。' : '比赛被拖入加时，客队在加时阶段完成收割。')
    : (winnerHome
      ? (closeGame ? '双方一路拉扯到最后，主队在收官段顶住了反扑。' : '主队在下半场逐步拉开分差，最终稳住胜势。')
      : (closeGame ? '比赛一路胶着到最后，客队在关键回合里笑到最后。' : '客队在第二节后建立优势，并把领先保持到了终场。'));
  const runs = parseNum(overtimes, 0) > 0
    ? [
        winnerHome ? `${homeSnapshot.abbr || 'HOME'} 在加时前半段连拿关键分` : `${awaySnapshot.abbr || 'AWAY'} 在加时阶段抓住了每次错位`,
        '双方常规时间战成平手，末段每个回合都在换领先'
      ]
    : closeGame
      ? [
          winnerHome ? `${homeSnapshot.abbr || 'HOME'} 在第四节守住了关键球` : `${awaySnapshot.abbr || 'AWAY'} 在第四节打出反扑高潮`,
          '双方一度陷入拉锯，分差始终维持在两个回合以内'
        ]
      : [
          winnerHome ? `${homeSnapshot.abbr || 'HOME'} 在第三节打出决定比赛的攻防高潮` : `${awaySnapshot.abbr || 'AWAY'} 在第二节后半段建立两位数优势`
        ];
  const userIsHome = userTeamId && parseNum(userTeamId, 0) === parseNum(homeSnapshot?.teamId, 0);
  return {
    periodLabels: labels,
    homePeriods,
    awayPeriods,
    homeAbbr: homeSnapshot?.abbr || 'HOME',
    awayAbbr: awaySnapshot?.abbr || 'AWAY',
    homePoss,
    awayPoss,
    homeOrtg,
    awayOrtg,
    homeEfg,
    awayEfg,
    homeTovRate,
    awayTovRate,
    biggestLeadHome,
    biggestLeadAway,
    leadChanges,
    clutch: closeGame,
    clutchMargin: margin,
    summary,
    runs,
    hasOvertime: parseNum(overtimes, 0) > 0,
    overtimeCount: parseNum(overtimes, 0),
    myPeriods: userIsHome ? homePeriods : awayPeriods,
    oppPeriods: userIsHome ? awayPeriods : homePeriods,
    myAbbr: userIsHome ? homeSnapshot?.abbr || 'HOME' : awaySnapshot?.abbr || 'AWAY',
    oppAbbr: userIsHome ? awaySnapshot?.abbr || 'AWAY' : homeSnapshot?.abbr || 'HOME',
    myPoss: userIsHome ? homePoss : awayPoss,
    oppPoss: userIsHome ? awayPoss : homePoss,
    myOrtg: userIsHome ? homeOrtg : awayOrtg,
    oppOrtg: userIsHome ? awayOrtg : homeOrtg,
    myEfg: userIsHome ? homeEfg : awayEfg,
    oppEfg: userIsHome ? awayEfg : homeEfg,
    myTovRate: userIsHome ? homeTovRate : awayTovRate,
    oppTovRate: userIsHome ? awayTovRate : homeTovRate
  };
}

function simulateLeagueMatchup(homeTeamId, awayTeamId, opts = {}) {
  ensureLeagueStateShape();
  const homeId = parseNum(homeTeamId, 0);
  const awayId = parseNum(awayTeamId, 0);
  if (!homeId || !awayId || homeId === awayId) return null;

  const season = parseNum(opts.season, G.season);
  const year = parseNum(opts.year, G.year);
  const phase = String(opts.phase || 'regular').trim() || 'regular';
  const roundIndex = parseNum(opts.roundIndex, 0);
  const userTeamId = parseNum(opts.userTeamId, 0);
  const seq = (G.leagueSeason.gameDetails || []).length + 1;
  const homeFatigue = buildScheduleFatigueContext({ teamId: homeId, home: true, roundIndex, phase, userTeamId });
  const awayFatigue = buildScheduleFatigueContext({ teamId: awayId, home: false, roundIndex, phase, userTeamId });
  const homeProfile = buildTeamSimulationProfile(homeId, { includeUser: homeId === userTeamId, home: true, fatigueContext: homeFatigue });
  const awayProfile = buildTeamSimulationProfile(awayId, { includeUser: awayId === userTeamId, home: false, fatigueContext: awayFatigue });
  const simPlans = buildMatchupSimulationPlans(homeProfile, awayProfile, { phase, roundIndex, userTeamId });
  const homeSnapshot = buildTeamGameBoxScore(homeId, simPlans.homePlan, awayProfile, { home: true, includeUser: homeId === userTeamId, teamProfile: homeProfile, oppProfile: awayProfile, fatigueContext: homeFatigue });
  const awaySnapshot = buildTeamGameBoxScore(awayId, simPlans.awayPlan, homeProfile, { home: false, includeUser: awayId === userTeamId, teamProfile: awayProfile, oppProfile: homeProfile, fatigueContext: awayFatigue });
  const flow = buildGameFlow(homeSnapshot, awaySnapshot, {
    userTeamId: parseNum(opts.userTeamId, 0),
    homePlan: simPlans.homePlan,
    awayPlan: simPlans.awayPlan,
    overtimes: simPlans.overtimes,
    homeOtPeriods: simPlans.homeOtPeriods,
    awayOtPeriods: simPlans.awayOtPeriods
  });
  const homeScore = parseNum(homeSnapshot.teamPts, 0);
  const awayScore = parseNum(awaySnapshot.teamPts, 0);
  const homeWin = homeScore >= awayScore;
  const gameId = `lg_${season}_${phase}_${roundIndex}_${seq}_${homeId}_${awayId}`;

  const detail = {
    id: gameId,
    gameId,
    season,
    year,
    phase,
    round: roundIndex + 1,
    seq,
    homeTeamId: homeId,
    awayTeamId: awayId,
    homeScore,
    awayScore,
    homeWin,
    awayWin: !homeWin,
    homeRows: homeSnapshot.boxScore,
    awayRows: awaySnapshot.boxScore,
    homeTeam: getTeam(homeId) || {},
    awayTeam: getTeam(awayId) || {},
    homeFatigue,
    awayFatigue,
    flow,
    userGame: !!opts.userTeamId && (homeId === parseNum(opts.userTeamId, 0) || awayId === parseNum(opts.userTeamId, 0))
  };

  const records = G.leagueSeason.teamRecords || {};
  const homeRec = records[homeId] || makeTeamRecord();
  const awayRec = records[awayId] || makeTeamRecord();
  homeRec.gp += 1;
  awayRec.gp += 1;
  homeRec.pf += homeScore;
  homeRec.pa += awayScore;
  awayRec.pf += awayScore;
  awayRec.pa += homeScore;
  if (homeWin) {
    homeRec.w += 1;
    awayRec.l += 1;
  } else {
    awayRec.w += 1;
    homeRec.l += 1;
  }
  records[homeId] = homeRec;
  records[awayId] = awayRec;
  G.leagueSeason.teamRecords = records;

  const updateStats = (row) => {
    if (!row || row.status) return;
    const key = leaguePlayerKey(row.teamId, row.playerId, !!row.isSelf);
    const cur = G.leagueSeason.playerStats[key] || emptySeasonLine(row.teamId, row.playerId, row.name, row.pos, !!row.isSelf);
    cur.key = key;
    cur.teamId = parseNum(row.teamId, cur.teamId);
    cur.playerId = row.playerId;
    cur.name = String(row.name || cur.name || 'Player');
    cur.pos = parseNum(row.pos, cur.pos);
    cur.isSelf = !!row.isSelf;
    cur.gp = parseNum(cur.gp, 0) + 1;
    cur.mins = parseNum(cur.mins, 0) + parseNum(row.mins, 0);
    cur.pts = parseNum(cur.pts, 0) + parseNum(row.pts, 0);
    cur.reb = parseNum(cur.reb, 0) + parseNum(row.reb, 0);
    cur.ast = parseNum(cur.ast, 0) + parseNum(row.ast, 0);
    cur.stl = parseNum(cur.stl, 0) + parseNum(row.stl, 0);
    cur.blk = parseNum(cur.blk, 0) + parseNum(row.blk, 0);
    cur.tov = parseNum(cur.tov, 0) + parseNum(row.tov, 0);
    cur.fgm = parseNum(cur.fgm, 0) + parseNum(row.fgm, 0);
    cur.fga = parseNum(cur.fga, 0) + parseNum(row.fga, 0);
    cur.tpm = parseNum(cur.tpm, 0) + parseNum(row.tpm, 0);
    cur.tpa = parseNum(cur.tpa, 0) + parseNum(row.tpa, 0);
    cur.ftm = parseNum(cur.ftm, 0) + parseNum(row.ftm, 0);
    cur.fta = parseNum(cur.fta, 0) + parseNum(row.fta, 0);
    G.leagueSeason.playerStats[key] = cur;
  };
  (homeSnapshot.boxScore || []).forEach(updateStats);
  (awaySnapshot.boxScore || []).forEach(updateStats);

  if (!G.leagueSeason.teamGameLogs[homeId]) G.leagueSeason.teamGameLogs[homeId] = [];
  if (!G.leagueSeason.teamGameLogs[awayId]) G.leagueSeason.teamGameLogs[awayId] = [];
  G.leagueSeason.teamGameLogs[homeId].push({ gameId, round: roundIndex + 1, season, year, phase, home: true, opp: awayId, win: homeWin, teamPts: homeScore, oppPts: awayScore });
  G.leagueSeason.teamGameLogs[awayId].push({ gameId, round: roundIndex + 1, season, year, phase, home: false, opp: homeId, win: !homeWin, teamPts: awayScore, oppPts: homeScore });
  G.leagueSeason.gameDetails.push(detail);
  if (roundIndex + 1 > parseNum(G.leagueSeason.round, 0)) G.leagueSeason.round = roundIndex + 1;
  G.leagueSeason.roundSchedule.push({ gameId, round: roundIndex + 1, season, year, phase, homeTeamId: homeId, awayTeamId: awayId, homeScore, awayScore });
  return detail;
}

function playGame(gameNum) {
  const sched = Array.isArray(G.schedule) ? G.schedule : [];
  const idx = clamp(Math.floor(parseNum(gameNum, G.gameNum)), 0, Math.max(0, sched.length - 1));
  const game = sched[idx] || null;
  const userTeamId = parseNum(G.teamId, 0);
  const oppTeamId = parseNum(game?.opp, 0) || TEAMS.find(t => t.id !== userTeamId)?.id || 0;
  const userHome = game ? !!game.home : true;
  const homeTeamId = userHome ? userTeamId : oppTeamId;
  const awayTeamId = userHome ? oppTeamId : userTeamId;
  const detail = simulateLeagueMatchup(homeTeamId, awayTeamId, { roundIndex: idx, season: G.season, year: G.year, phase: 'regular', userTeamId });
  if (!detail) return null;

  const userScore = userHome ? detail.homeScore : detail.awayScore;
  const oppScore = userHome ? detail.awayScore : detail.homeScore;
  const userRows = userHome ? detail.homeRows : detail.awayRows;
  const selfRow = (userRows || []).find(r => r.isSelf && !r.status) || null;
  const injured = !!(G.player?.injury?.active && parseNum(G.player?.injury?.games, 0) > 0 && !selfRow);
  const userFatigue = userHome ? detail.homeFatigue : detail.awayFatigue;
  const selfGameNotes = Array.isArray(selfRow?.gameNotes) ? selfRow.gameNotes : [];
  const st = selfRow ? {
    mins: parseNum(selfRow.mins, 0),
    pts: parseNum(selfRow.pts, 0),
    reb: parseNum(selfRow.reb, 0),
    ast: parseNum(selfRow.ast, 0),
    stl: parseNum(selfRow.stl, 0),
    blk: parseNum(selfRow.blk, 0),
    pf: parseNum(selfRow.pf, 0),
    tov: parseNum(selfRow.tov, 0),
    fgm: parseNum(selfRow.fgm, 0),
    fga: parseNum(selfRow.fga, 0),
    tpm: parseNum(selfRow.tpm, 0),
    tpa: parseNum(selfRow.tpa, 0),
    ftm: parseNum(selfRow.ftm, 0),
    fta: parseNum(selfRow.fta, 0)
  } : { mins: 0, pts: 0, reb: 0, ast: 0, stl: 0, blk: 0, pf: 0, tov: 0, fgm: 0, fga: 0, tpm: 0, tpa: 0, ftm: 0, fta: 0 };

  const result = {
    game: idx + 1,
    gameNum: idx,
    events: [],
    opp: oppTeamId,
    home: userHome,
    teamPts: userScore,
    oppPts: oppScore,
    win: userScore > oppScore,
    injured,
    pts: st.pts,
    reb: st.reb,
    ast: st.ast,
    stl: st.stl,
    blk: st.blk,
    pf: st.pf,
    tov: st.tov,
    fgm: st.fgm,
    fga: st.fga,
    tpm: st.tpm,
    tpa: st.tpa,
    ftm: st.ftm,
    fta: st.fta,
    grade: calcGrade(st),
    st,
    flow: detail.flow,
    gameId: detail.id,
    season: G.season,
    year: G.year,
    userGame: true,
    homeTeamId: detail.homeTeamId,
    awayTeamId: detail.awayTeamId,
    homeScore: detail.homeScore,
    awayScore: detail.awayScore,
    homeRows: detail.homeRows,
    awayRows: detail.awayRows,
    gameEvent: G._gameEventResult || null
  };
  if (userFatigue?.summary) result.events.push(`🧭 赛程负荷：${userFatigue.summary}`);
  selfGameNotes.forEach(note => result.events.push(`🎯 ${note}`));

  if (!injured) {
    G.seasonStats.gp += 1;
    G.seasonStats.pts += st.pts;
    G.seasonStats.reb += st.reb;
    G.seasonStats.ast += st.ast;
    G.seasonStats.stl += st.stl;
    G.seasonStats.blk += st.blk;
    G.seasonStats.tov += st.tov;
    G.seasonStats.mins += st.mins;
    G.seasonStats.fgm += st.fgm;
    G.seasonStats.fga += st.fga;
    G.seasonStats.tpm += st.tpm;
    G.seasonStats.tpa += st.tpa;
    G.seasonStats.ftm += st.ftm;
    G.seasonStats.fta += st.fta;
  }
  if (result.win) G.seasonStats.wins += 1;
  else G.seasonStats.losses += 1;

  const staminaLoss = injured ? 4 : calculateUserGameStaminaLoss(st, userFatigue, selfRow || null);
  G.player.stamina = clamp(parseNum(G.player.stamina, 100) - staminaLoss, 0, 100);
  result.staminaLoss = staminaLoss;
  if (typeof checkInjury === 'function' && !G.player?.injury?.active) {
    checkInjury({ gameContext: userFatigue, gameStats: st, gameMod: selfRow || null });
  }

  // 添加比赛带来的 XP (基础15 + 表现加成)
  const gradeBonus = { 'S+': 15, 'S': 12, 'A': 8, 'B': 5, 'C': 3, 'D': 1, 'F': 0 }[result.grade] || 2;
  const matchXp = 15 + gradeBonus;
  addPlayerXP(matchXp);
  result.events.push(`🏀 比赛表现 ${result.grade}，XP+${matchXp}`);

  G.results.push(result);
  G.gameNum = idx + 1;
  updateTeamMorale(result.win);
  updateCoachFavorabilityAfterGame(result);
  return result;
}

function buildMatchupContextForLLM(result, { limit = 3 } = {}) {
  const gameRes = result?.gameResult || result || {};
  const homeTeam = getTeam(gameRes.homeTeamId) || {};
  const awayTeam = getTeam(gameRes.awayTeamId) || {};
  const userTeamId = parseNum(G.teamId, 0);
  const userIsHome = parseNum(gameRes.homeTeamId, 0) === userTeamId;
  const trimRows = (rows) => Array.isArray(rows)
    ? rows.slice().sort((a, b) => parseNum(b.pts, 0) - parseNum(a.pts, 0) || parseNum(b.mins, 0) - parseNum(a.mins, 0)).slice(0, Math.max(1, parseNum(limit, 3)))
    : [];
  const snap = (team, rows, score, home) => ({
    teamId: parseNum(team?.id, 0),
    name: String(team?.z || team?.n || '--').trim(),
    abbr: String(team?.a || team?.abbr || '--').trim(),
    score: parseNum(score, 0),
    home: !!home,
    boxScore: trimRows(rows)
  });
  return {
    homeTeam: snap(homeTeam, gameRes.homeRows, gameRes.homeScore, true),
    awayTeam: snap(awayTeam, gameRes.awayRows, gameRes.awayScore, false),
    userTeam: snap(userIsHome ? homeTeam : awayTeam, userIsHome ? gameRes.homeRows : gameRes.awayRows, userIsHome ? gameRes.homeScore : gameRes.awayScore, userIsHome),
    opponentTeam: snap(userIsHome ? awayTeam : homeTeam, userIsHome ? gameRes.awayRows : gameRes.homeRows, userIsHome ? gameRes.awayScore : gameRes.homeScore, !userIsHome),
    flow: gameRes.flow || null
  };
}

function simulatePreDraftSeason() {
  if (!LEAGUE.loaded) return;
  console.log('[Pre-Draft] 模拟选秀前赛季...');

  // 1. 初始化联赛赛季状态（临时）
  ensureLeagueStateShape();
  const teamRecords = {};
  const playerStats = {};
  TEAMS.forEach(t => { teamRecords[t.id] = makeTeamRecord(); });
  if (LEAGUE.loaded) {
    Object.values(LEAGUE.teams).forEach(t => {
      const tid = t.meta?.id || 0;
      (t.players || []).forEach(p => {
        if (!p.injury) p.injury = { active: false, games: 0, type: "" };
        const key = leaguePlayerKey(tid, p.id, false);
        playerStats[key] = emptySeasonLine(tid, p.id, p.name, p.pos, false);
      });
    });
  }
  G.leagueSeason = { round: 0, teamRecords, playerStats, roundSchedule: [], teamGameLogs: {}, gameDetails: [] };
  TEAMS.forEach(t => { G.leagueSeason.teamGameLogs[t.id] = []; });

  // 2. 生成NPC-only比赛配对（82轮）— 只模拟比赛数据，不做增量成长
  const teamIds = TEAMS.map(t => t.id);
  const totalRounds = 82;

  for (let round = 0; round < totalRounds; round++) {
    const shuffled = [...teamIds].sort(() => Math.random() - 0.5);
    for (let i = 0; i < shuffled.length - 1; i += 2) {
      simulateLeagueMatchup(shuffled[i], shuffled[i + 1], { roundIndex: round, phase: 'preDraft' });
    }
    tickLeagueInjuries();
  }

  // 3. 保存NPC赛季数据到 careerHistory
  if (G.leagueSeason?.playerStats) {
    Object.values(G.leagueSeason.playerStats).forEach(ps => {
      if (ps.isSelf || !ps.playerId || ps.gp <= 0) return;
      const teamObj = LEAGUE.teams?.[ps.teamId];
      if (!teamObj) return;
      const playerObj = (teamObj.players || []).find(p => String(p.id) === String(ps.playerId));
      if (!playerObj) return;
      if (!Array.isArray(playerObj.careerHistory)) playerObj.careerHistory = [];
      const ngp = Math.max(ps.gp, 1);
      playerObj.careerHistory.push({
        season: 0, year: G.year, team: ps.teamId, gp: ps.gp,
        ppg: +(ps.pts / ngp).toFixed(1), apg: +(ps.ast / ngp).toFixed(1), rpg: +(ps.reb / ngp).toFixed(1),
        spg: +(ps.stl / ngp).toFixed(1), bpg: +(ps.blk / ngp).toFixed(1),
        fgPct: ps.fga > 0 ? +(ps.fgm / ps.fga * 100).toFixed(1) : 0,
        tpPct: ps.tpa > 0 ? +(ps.tpm / ps.tpa * 100).toFixed(1) : 0,
        ftPct: ps.fta > 0 ? +(ps.ftm / ps.fta * 100).toFixed(1) : 0
      });
    });
  }

  // 4. 直接对每个NPC球员应用完整赛季成长（属性+年龄+1）
  Object.values(LEAGUE.teams).forEach(t => {
    const coach = t.coach || null;
    (t.players || []).forEach(p => {
      applyNpcSeasonDevelopment(p, coach);
      delete p._seasonDevApplied; // 清理标志，不影响后续赛季
    });
    t.rotation = toRotation(t.players);
    t.strength = calcTeamStrength(t);
  });

  // 5. 年份递增（选秀年已过）
  G.year++;

  // 6. 清理伤病，准备下赛季
  Object.values(LEAGUE.teams).forEach(t => {
    (t.players || []).forEach(p => {
      if (p.injury) { p.injury.active = false; p.injury.games = 0; }
    });
  });

  console.log(`[Pre-Draft] 选秀前赛季模拟完成，年份推进到 ${G.year}`);
}

// ============ 士气系统 ============
function updateTeamMorale(win) {
  // 更新连胜/连败
  if (win) G.winStreak = G.winStreak > 0 ? G.winStreak + 1 : 1;
  else G.winStreak = G.winStreak < 0 ? G.winStreak - 1 : -1;
  const streak = G.winStreak;
  const abs = Math.abs(streak);
  // 基础：赢+2 输-2，连胜/连败额外加成（上限±4）
  let delta = win ? 2 : -2;
  delta += (win ? 1 : -1) * Math.min(abs - 1, 4);
  // 信任拉动
  delta += (parseNum(G.player.trust, 50) - 50) * 0.04;
  // 自然回归50
  const cur = parseNum(G.teamMorale, 50);
  delta -= (cur - 50) * 0.05;
  G.teamMorale = clamp(Math.round(cur + delta), 0, 100);
}
function getMoraleMult() {
  return 1 + (parseNum(G.teamMorale, 50) - 50) * 0.001;
}

function generateSchedule() {
  G.schedule = []; G.results = []; G.gameNum = 0;
  G.dayNum = 0;
  G.gameDays = [];
  G._latestDayResult = null;
  G.teamMorale = 50; G.winStreak = 0;
  if (G.social && typeof G.social === 'object') {
    G.social.lastGeneratedDay = -1;
    G.social.pendingRequiredDay = -1;
  }
  G.seasonStats = { pts: 0, reb: 0, ast: 0, stl: 0, blk: 0, tov: 0, mins: 0, fgm: 0, fga: 0, tpm: 0, tpa: 0, ftm: 0, fta: 0, gp: 0, wins: 0, losses: 0 };
  const others = TEAMS.filter(t => t.id !== G.teamId);
  let sched = [];
  others.forEach(t => {
    sched.push({ opp: t.id, home: true });
    sched.push({ opp: t.id, home: false });
    if (t.c === G.team.c) sched.push({ opp: t.id, home: Math.random() > 0.5 });
  });
  while (sched.length < 82) sched.push({ opp: others[rng(0, others.length - 1)].id, home: Math.random() > 0.5 });
  sched = sched.slice(0, 82);
  for (let i = sched.length - 1; i > 0; i--) { const j = rng(0, i);[sched[i], sched[j]] = [sched[j], sched[i]]; }
  G.schedule = sched; G.totalGames = 82;
  initLeagueSeasonState();
}

function makeTeamRecord() {
  return { gp: 0, w: 0, l: 0, pf: 0, pa: 0 };
}
function getLeagueTeamRecordsArray() {
  ensureLeagueStateShape();
  const records = G.leagueSeason?.teamRecords || {};
  return TEAMS.map(team => {
    const raw = records[team.id] && typeof records[team.id] === 'object' ? records[team.id] : {};
    const gp = Math.max(0, Math.floor(parseNum(raw.gp, 0)));
    const w = Math.max(0, Math.floor(parseNum(raw.w, 0)));
    const l = Math.max(0, Math.floor(parseNum(raw.l, 0)));
    const pf = Math.max(0, parseNum(raw.pf, 0));
    const pa = Math.max(0, parseNum(raw.pa, 0));
    return {
      id: team.id,
      teamId: team.id,
      team,
      z: team.z,
      n: team.n,
      a: team.a,
      c: team.c,
      gp,
      w,
      l,
      pf,
      pa,
      pct: gp > 0 ? +(w / gp).toFixed(3) : 0,
      ...raw
    };
  });
}
function getLeaguePlayerSeasonRows() {
  ensureLeagueStateShape();
  const stats = G.leagueSeason?.playerStats || {};
  return Object.entries(stats).map(([key, raw]) => {
    const ps = raw && typeof raw === 'object' ? raw : {};
    const gp = Math.max(0, Math.floor(parseNum(ps.gp, 0)));
    const pts = parseNum(ps.pts, 0);
    const reb = parseNum(ps.reb, 0);
    const ast = parseNum(ps.ast, 0);
    const stl = parseNum(ps.stl, 0);
    const blk = parseNum(ps.blk, 0);
    const tov = parseNum(ps.tov, 0);
    const fgm = parseNum(ps.fgm, 0);
    const fga = parseNum(ps.fga, 0);
    const tpm = parseNum(ps.tpm, 0);
    const tpa = parseNum(ps.tpa, 0);
    const ftm = parseNum(ps.ftm, 0);
    const fta = parseNum(ps.fta, 0);
    const row = {
      key: String(ps.key || key),
      teamId: parseNum(ps.teamId, 0),
      playerId: ps.playerId != null ? ps.playerId : 0,
      name: String(ps.name || 'Player'),
      pos: parseNum(ps.pos, 3),
      isSelf: !!ps.isSelf,
      gp,
      pts,
      reb,
      ast,
      stl,
      blk,
      tov,
      fgm,
      fga,
      tpm,
      tpa,
      ftm,
      fta
    };
    row.ppg = gp > 0 ? +(pts / gp).toFixed(1) : 0;
    row.rpg = gp > 0 ? +(reb / gp).toFixed(1) : 0;
    row.apg = gp > 0 ? +(ast / gp).toFixed(1) : 0;
    row.spg = gp > 0 ? +(stl / gp).toFixed(1) : 0;
    row.bpg = gp > 0 ? +(blk / gp).toFixed(1) : 0;
    row.fgPct = fga > 0 ? +(fgm / fga * 100).toFixed(1) : 0;
    row.tpPct = tpa > 0 ? +(tpm / tpa * 100).toFixed(1) : 0;
    row.ftPct = fta > 0 ? +(ftm / fta * 100).toFixed(1) : 0;
    return row;
  });
}
function rookieContractByPick(pickNo) {
  const pick = clamp(Math.floor(parseNum(pickNo, 1)), 1, 60);
  if (pick <= 30) {
    const t = (pick - 1) / 29;
    const salary = 12 - (t * 8.5);
    const years = pick <= 14 ? 4 : (pick <= 26 ? 3 : 2);
    return { pick, salary: +salary.toFixed(2), years };
  }
  const t = (pick - 31) / 29;
  const salary = 2.8 - (t * 1.6);
  const years = pick <= 45 ? 2 : 1;
  return { pick, salary: +Math.max(0.85, salary).toFixed(2), years };
}
function calcPlayerTradeValue(player = G.player) {
  const attrs = player?.attrs || {};
  const rating = parseNum(player?.rating, typeof ovr === 'function' ? ovr(attrs) : 50);
  const potential = parseNum(player?.potential, rating);
  const fame = parseNum(player?.fame, 0);
  const trust = parseNum(player?.trust, 50);
  const salary = parseNum(player?.salary, 0);
  const years = parseNum(player?.contractYears, 0);
  let value = 20 + rating * 0.62 + potential * 0.18 + fame * 0.12 + (trust - 50) * 0.08 + years * 1.8 - salary * 0.35;
  if (years <= 1) value += 4;
  if (player?.isSelf) value += 4;
  return clamp(Math.round(value), 1, 99);
}
function recalcPlayerTradeValue() {
  if (!G.player || typeof G.player !== 'object') return 0;
  G.player.tradeValue = calcPlayerTradeValue(G.player);
  return G.player.tradeValue;
}
function buildTradeAssetFromPlayer(player = {}) {
  return {
    id: player.id,
    name: String(player.name || '球员'),
    pos: parseNum(player.pos, 3),
    pos2: parseNum(player.pos2, 0),
    rating: parseNum(player.rating, typeof ovr === 'function' ? ovr(player.attrs || {}) : 70),
    potential: parseNum(player.potential, parseNum(player.rating, 70)),
    salary: normalizeSalaryMillion(parseNum(player.salary, 0)),
    value: calcPlayerTradeValue(player)
  };
}
function evaluateTeamNeedForPosition(teamId, pos) {
  const rotation = typeof buildDynamicTeamRotation === 'function'
    ? buildDynamicTeamRotation(parseNum(teamId, 0), { includeUser: false })
    : [];
  const samePos = rotation
    .filter(p => parseNum(p?.pos, 0) === parseNum(pos, 0) || parseNum(p?.pos2, 0) === parseNum(pos, 0))
    .sort((a, b) => parseNum(b?.rating, 0) - parseNum(a?.rating, 0));
  const bestRating = parseNum(samePos[0]?.rating, 62);
  const depth = samePos.length;
  const needScore = clamp((74 - bestRating) / 18 + (depth <= 1 ? 0.35 : depth === 2 ? 0.14 : 0), -0.18, 0.92);
  return { bestRating, depth, needScore };
}
function getUserTradePressureProfile() {
  const coach = typeof getTeamCoach === 'function' ? getTeamCoach(parseNum(G.teamId, 0)) : null;
  const favor = coach && typeof getCoachFavorability === 'function' ? getCoachFavorability(coach) : 50;
  const treatment = coach && typeof getUserCoachTreatmentProfile === 'function' ? getUserCoachTreatmentProfile(G.player, coach) : null;
  const records = typeof getLeagueTeamRecordsArray === 'function' ? getLeagueTeamRecordsArray() : [];
  const record = records.find(r => parseNum(r.teamId, 0) === parseNum(G.teamId, 0)) || {};
  const pct = clamp(parseNum(record?.pct, 0.5), 0, 1);
  const favorBoost = clamp((52 - favor) / 70, 0, 0.42);
  const treatmentBoost = clamp(Math.max(0, -parseNum(treatment?.leverage, 0)) / 120, 0, 0.22);
  const teamBoost = clamp((0.44 - pct) / 0.55, 0, 0.12);
  const pressure = clamp(0.08 + favorBoost + treatmentBoost + teamBoost, 0.08, 0.72);
  return {
    favor,
    treatment,
    pct,
    pressure,
    valueDiscount: clamp(pressure * 0.22, 0.02, 0.18),
    acceptBonus: clamp(pressure * 0.26, 0.02, 0.22)
  };
}
function buildTradePackagesForTeam(teamId, targetValue, desiredSalary = normalizeSalaryMillion(G.player.salary)) {
  const assets = (typeof getTeamPlayers === 'function' ? getTeamPlayers(parseNum(teamId, 0)) : [])
    .filter(p => !p?.injury?.active)
    .map(buildTradeAssetFromPlayer)
    .sort((a, b) => Math.abs(parseNum(a.value, 0) - targetValue) - Math.abs(parseNum(b.value, 0) - targetValue) || parseNum(b.rating, 0) - parseNum(a.rating, 0))
    .slice(0, 8);
  const packages = [];
  assets.forEach(a => {
    packages.push({ players: [a], totalValue: parseNum(a.value, 0), totalSalary: normalizeSalaryMillion(a.salary) });
  });
  for (let i = 0; i < assets.length; i++) {
    for (let j = i + 1; j < assets.length; j++) {
      packages.push({
        players: [assets[i], assets[j]],
        totalValue: parseNum(assets[i].value, 0) + parseNum(assets[j].value, 0),
        totalSalary: normalizeSalaryMillion(assets[i].salary) + normalizeSalaryMillion(assets[j].salary)
      });
    }
  }
  packages.forEach(pkg => {
    const posNeed = pkg.players.reduce((sum, asset) => sum + evaluateTeamNeedForPosition(parseNum(teamId, 0), asset.pos).needScore, 0);
    pkg.score = Math.abs(pkg.totalValue - targetValue) + Math.abs(pkg.totalSalary - desiredSalary) * 2.2 + (pkg.players.length - 1) * 3 - posNeed * 6;
  });
  packages.sort((a, b) => parseNum(a.score, 999) - parseNum(b.score, 999));
  return packages;
}
function buildUserTradeProposal(targetId) {
  const teamId = parseNum(targetId, 0);
  const team = typeof getTeam === 'function' ? getTeam(teamId) : null;
  if (!team || teamId === parseNum(G.teamId, 0)) return null;
  const myValue = recalcPlayerTradeValue();
  const pressure = getUserTradePressureProfile();
  const need = evaluateTeamNeedForPosition(teamId, parseNum(G.player.pos, 3));
  const targetValue = clamp(Math.round(myValue * (1 - pressure.valueDiscount) + need.needScore * 10), 18, 99);
  const packages = buildTradePackagesForTeam(teamId, targetValue);
  if (!packages.length) return null;
  const selected = packages[0];
  const capRoom = LEAGUE_SALARY_CAP_M * 1.18 - teamPayrollMillion(teamId);
  const valueFit = clamp(1 - Math.abs(parseNum(selected.totalValue, 0) - targetValue) / 38, 0, 1);
  const capPenalty = parseNum(selected.totalSalary, 0) > capRoom ? 0.08 : 0;
  const acceptChance = clamp(0.24 + valueFit * 0.34 + need.needScore * 0.16 + pressure.acceptBonus - capPenalty + (selected.players.length === 1 ? 0.04 : 0), 0.08, 0.92);
  const valueRange = { min: Math.max(1, Math.round(targetValue - 10)), max: Math.round(targetValue + 14) };
  return {
    team,
    outgoing: [{
      id: 'USER_SELF',
      name: String(G.player.name || '球员'),
      pos: parseNum(G.player.pos, 3),
      pos2: 0,
      rating: typeof ovr === 'function' ? ovr(G.player.attrs || {}) : parseNum(G.player.tradeValue, 50),
      potential: parseNum(G.player.potential, 80),
      salary: normalizeSalaryMillion(parseNum(G.player.salary, 0)),
      value: myValue,
      isUser: true
    }],
    incoming: selected.players,
    outgoingValue: myValue,
    incomingValue: parseNum(selected.totalValue, 0),
    outgoingSalary: normalizeSalaryMillion(parseNum(G.player.salary, 0)),
    incomingSalary: parseNum(selected.totalSalary, 0),
    acceptChance,
    valueRange,
    leverage: pressure,
    need
  };
}
function executeUserTradeRequest(req) {
  const teamId = parseNum(req?.team?.id, 0);
  if (G.dayNum > G.tradeDeadline) return { ok: false, reason: 'deadline' };
  if (!teamId || teamId === parseNum(G.teamId, 0)) return { ok: false, reason: 'same_team' };
  const chance = clamp(parseNum(req?.acceptChance, 0.5), 0.05, 0.95);
  if (Math.random() > chance) return { ok: false, reason: 'rejected', chance };
  const oldTeamId = parseNum(G.teamId, 0);
  const oldTeam = typeof getTeam === 'function' ? getTeam(oldTeamId) : null;
  const newTeam = typeof getTeam === 'function' ? getTeam(teamId) : req.team || null;
  const oldTeamObj = LEAGUE.teams?.[oldTeamId] || null;
  const newTeamObj = LEAGUE.teams?.[teamId] || null;
  const incomingIds = new Set((Array.isArray(req?.incoming) ? req.incoming : []).map(p => String(p?.id || '')));
  if (oldTeamObj && newTeamObj && incomingIds.size) {
    const moved = [];
    newTeamObj.players = (newTeamObj.players || []).filter(player => {
      const keep = !incomingIds.has(String(player?.id || ''));
      if (!keep) moved.push(player);
      return keep;
    });
    oldTeamObj.players = [...(oldTeamObj.players || []), ...moved];
    oldTeamObj.rotation = typeof toRotation === 'function' ? toRotation(oldTeamObj.players) : oldTeamObj.rotation;
    newTeamObj.rotation = typeof toRotation === 'function' ? toRotation(newTeamObj.players) : newTeamObj.rotation;
    if (typeof calcTeamStrength === 'function') {
      oldTeamObj.strength = calcTeamStrength(oldTeamObj);
      newTeamObj.strength = calcTeamStrength(newTeamObj);
    }
  }
  G.teamId = teamId;
  G.team = newTeam;
  if (!Array.isArray(G.player.teamsPlayed)) G.player.teamsPlayed = [];
  if (!G.player.teamsPlayed.includes(teamId)) G.player.teamsPlayed.push(teamId);
  if (oldTeamId !== teamId) G.nomadCount = Math.max(0, parseNum(G.nomadCount, 0)) + 1;
  if (typeof ensureCoachDynamicsState === 'function') {
    const dynamics = ensureCoachDynamicsState();
    dynamics.directives.usageDemandUntilDay = -1;
    dynamics.directives.startingDemandUntilDay = -1;
    dynamics.directives.buyInUntilDay = -1;
  }
  if (typeof ensureCoachRelationshipState === 'function') ensureCoachRelationshipState();
  if (typeof recalcPlayerTradeValue === 'function') recalcPlayerTradeValue();
  G._currentRotation = null;
  G._rotationGame = -1;
  G._rotationTeam = -1;
  addNews(`🔄 交易达成：${G.player.name} 从${oldTeam?.z || '原球队'}转投${newTeam?.z || '新球队'}。`, 'neu');
  addPhone('经纪人', `交易完成，你已经被送往 ${newTeam?.z || '新球队'}。准备和新的教练组重新建立关系。`, 'info');
  return { ok: true, team: newTeam };
}
function buildUserFreeAgencyProfile() {
  const overall = typeof ovr === 'function' ? ovr(G.player.attrs || {}) : parseNum(G.player.tradeValue, 50);
  const gp = Math.max(parseNum(G.seasonStats?.gp, 0), 1);
  const ppg = +(parseNum(G.seasonStats?.pts, 0) / gp).toFixed(1);
  const apg = +(parseNum(G.seasonStats?.ast, 0) / gp).toFixed(1);
  const rpg = +(parseNum(G.seasonStats?.reb, 0) / gp).toFixed(1);
  const age = parseNum(G.player.age, 24);
  const fame = clamp(parseNum(G.player.fame, 10), 0, 100);
  const trust = clamp(parseNum(G.player.trust, 50), 0, 100);
  const baseSalary = clamp(1.2 + overall * 0.22 + ppg * 0.16 + apg * 0.09 + rpg * 0.05 + fame * 0.02 + trust * 0.01, 1.2, 42);
  return { overall, ppg, apg, rpg, age, fame, trust, baseSalary };
}
function evaluateUserOfferForTeam(teamId, profile) {
  const team = typeof getTeam === 'function' ? getTeam(teamId) : null;
  if (!team) return null;
  const need = evaluateTeamNeedForPosition(teamId, parseNum(G.player.pos, 3));
  const capRoom = LEAGUE_SALARY_CAP_M * 1.18 - teamPayrollMillion(teamId);
  if (capRoom <= 0.8) return null;
  const strength = typeof getTeamStrength === 'function' ? getTeamStrength(teamId) : 75;
  const coach = typeof getTeamCoach === 'function' ? getTeamCoach(teamId) : null;
  const fitScore = coach && typeof getCoachPlayerSystemFit === 'function' ? getCoachPlayerSystemFit(G.player, coach).fitScore : 55;
  let interest = 0.22 + need.needScore * 0.30 + (profile.overall - 72) / 85 + (profile.ppg - 12) / 75 + capRoom / 180 - strength / 420;
  let years = clamp(profile.age <= 26 ? 4 : (profile.age <= 30 ? 3 : 2), 1, 4);
  let salary = clamp(profile.baseSalary * (0.80 + interest * 0.45), 1.2, Math.max(1.5, capRoom - 0.4));
  let renewalInterest = null;
  if (teamId === parseNum(G.teamId, 0)) {
    const favor = coach && typeof getCoachFavorability === 'function' ? getCoachFavorability(coach) : 50;
    const treatment = coach && typeof getUserCoachTreatmentProfile === 'function' ? getUserCoachTreatmentProfile(G.player, coach) : null;
    renewalInterest = clamp(0.18 + (favor - 25) / 90 + (fitScore - 45) / 90 + (profile.overall - 70) / 85 + (profile.ppg - 10) / 120, 0, 1);
    if (renewalInterest < 0.33) return null;
    salary = clamp(profile.baseSalary * (0.92 + renewalInterest * 0.20), 1.2, Math.max(1.5, capRoom - 0.2));
    years = renewalInterest >= 0.72 ? Math.max(years, 3) : (renewalInterest >= 0.5 ? Math.max(2, years - 1) : 1);
    interest += renewalInterest * 0.22 + parseNum(treatment?.leverage, 0) / 180;
  } else if (interest < 0.28) {
    return null;
  }
  return {
    team,
    years,
    salary: +salary.toFixed(2),
    current: teamId === parseNum(G.teamId, 0),
    interest: clamp(interest, 0, 1),
    renewalInterest,
    fitScore,
    need
  };
}
function freeAgency() {
  const profile = buildUserFreeAgencyProfile();
  return (TEAMS || [])
    .map(team => evaluateUserOfferForTeam(parseNum(team?.id, 0), profile))
    .filter(Boolean)
    .sort((a, b) => parseNum(b.salary, 0) - parseNum(a.salary, 0) || parseNum(b.interest, 0) - parseNum(a.interest, 0))
    .slice(0, 6);
}
function signContract(teamId, salary, years) {
  const tid = parseNum(teamId, 0);
  const oldTeamId = parseNum(G.teamId, 0);
  G.teamId = tid;
  G.team = typeof getTeam === 'function' ? getTeam(tid) : G.team;
  G.player.salary = normalizeSalaryMillion(parseNum(salary, 0));
  G.player.contractYears = Math.max(1, Math.round(parseNum(years, 1)));
  if (!Array.isArray(G.player.teamsPlayed)) G.player.teamsPlayed = [];
  if (!G.player.teamsPlayed.includes(tid)) G.player.teamsPlayed.push(tid);
  if (oldTeamId !== tid) G.nomadCount = Math.max(0, parseNum(G.nomadCount, 0)) + 1;
  if (typeof ensureCoachDynamicsState === 'function') {
    const dynamics = ensureCoachDynamicsState();
    dynamics.directives.usageDemandUntilDay = -1;
    dynamics.directives.startingDemandUntilDay = -1;
    dynamics.directives.buyInUntilDay = -1;
  }
  if (typeof ensureCoachRelationshipState === 'function') ensureCoachRelationshipState();
  if (typeof recalcPlayerTradeValue === 'function') recalcPlayerTradeValue();
  G._currentRotation = null;
  G._rotationGame = -1;
  G._rotationTeam = -1;
  addNews(`📝 ${G.player.name} 与${G.team?.z || '球队'}签下 ${G.player.contractYears} 年合同。`, 'pos');
  addPhone('经纪人', `合同敲定：${G.team?.z || '球队'} ${G.player.contractYears}年 $${formatSalaryMillion(G.player.salary)}M/年。`, 'info');
}
function checkPlayerRenewal() {
  if (parseNum(G.player?.contractYears, 0) > 1) return false;
  if (parseNum(G.dayNum, 0) < parseNum(G.renewalDeadline, 160) - 8) return false;
  if (typeof ensureCoachDynamicsState !== 'function') return false;
  const dynamics = ensureCoachDynamicsState();
  if (parseNum(dynamics.lastRenewalBriefSeason, 0) === parseNum(G.season, 1)) return false;
  dynamics.lastRenewalBriefSeason = parseNum(G.season, 1);
  const coach = typeof getTeamCoach === 'function' ? getTeamCoach(parseNum(G.teamId, 0)) : null;
  const favor = coach && typeof getCoachFavorability === 'function' ? getCoachFavorability(coach) : 50;
  const treatment = coach && typeof getUserCoachTreatmentProfile === 'function' ? getUserCoachTreatmentProfile(G.player, coach) : null;
  const fitScore = parseNum(treatment?.fitScore, 55);
  const cold = favor < 35 || parseNum(treatment?.leverage, 0) < -10;
  const text = cold
    ? `当前球队的续约态度偏冷。教练好感度 ${favor}，体系契合 ${fitScore}，管理层更倾向让你去试水市场。`
    : `当前球队仍保留续约兴趣。教练好感度 ${favor}，体系契合 ${fitScore}，只要赛季后段不失控，留队仍有空间。`;
  addPhone('经纪人', text, cold ? 'warn' : 'info');
  if (cold) addNews(`📉 ${G.player.name} 与当前教练组关系偏冷，外界认为他的续约前景正在下滑。`, 'neg');
  return true;
}
function tryAIRenewal() {
  return false;
}
const GENERATED_COACH_FIRST_NAMES = ['Mike', 'Chris', 'David', 'James', 'Mark', 'Alex', 'Nate', 'Will', 'Sam', 'Ryan'];
const GENERATED_COACH_LAST_NAMES = ['Carter', 'Brooks', 'Lawson', 'Foster', 'Graham', 'Sullivan', 'Harper', 'Bailey', 'Murray', 'Reed'];
function buildTeamCoachStyleProfile(teamId) {
  const tid = parseNum(teamId, 0);
  const roster = [];
  if (tid > 0 && tid === parseNum(G.teamId, 0) && typeof createUserRosterSnapshot === 'function') {
    roster.push(createUserRosterSnapshot());
  }
  roster.push(...(typeof getTeamPlayers === 'function' ? getTeamPlayers(tid) : []));
  const core = roster
    .slice()
    .sort((a, b) => parseNum(b?.rating, 0) - parseNum(a?.rating, 0))
    .slice(0, 8);
  if (!core.length) {
    return { perimeter: 60, interior: 60, defense: 60, pace: 60, playmaking: 60, rebounding: 60 };
  }
  const sums = core.reduce((acc, player) => {
    const attrs = player?.attrs || {};
    acc.perimeter += parseNum(attrs.shotExt, 55) * (parseNum(player?.pos, 3) <= 3 ? 1.1 : 0.85);
    acc.interior += parseNum(attrs.shotInt, 55) * (parseNum(player?.pos, 3) >= 4 ? 1.1 : 0.9);
    acc.defense += (parseNum(attrs.stl, 55) + parseNum(attrs.blk, 55) + parseNum(player?.def, parseNum(player?.rating, 55))) / 3;
    acc.pace += (parseNum(attrs.speed, 55) + parseNum(attrs.pass, 55)) / 2;
    acc.playmaking += parseNum(attrs.pass, 55) * (parseNum(player?.pos, 3) <= 3 ? 1.08 : 0.95);
    acc.rebounding += parseNum(attrs.reb, 55) * (parseNum(player?.pos, 3) >= 4 ? 1.15 : 0.85);
    return acc;
  }, { perimeter: 0, interior: 0, defense: 0, pace: 0, playmaking: 0, rebounding: 0 });
  const count = core.length || 1;
  return {
    perimeter: +(sums.perimeter / count).toFixed(1),
    interior: +(sums.interior / count).toFixed(1),
    defense: +(sums.defense / count).toFixed(1),
    pace: +(sums.pace / count).toFixed(1),
    playmaking: +(sums.playmaking / count).toFixed(1),
    rebounding: +(sums.rebounding / count).toFixed(1)
  };
}
function pickCoachSystemForTeam(teamId, fallbackSystemId = 'balance') {
  const style = buildTeamCoachStyleProfile(teamId);
  const scores = {
    balance: 52 + Math.min(style.perimeter, style.interior) * 0.12 + style.playmaking * 0.1,
    defense: 42 + style.defense * 0.55 + style.rebounding * 0.22,
    grit: 36 + style.interior * 0.28 + style.rebounding * 0.4 + style.defense * 0.18,
    pace_space: 34 + style.perimeter * 0.42 + style.playmaking * 0.28 + style.pace * 0.25,
    perimeter_star: 30 + style.perimeter * 0.52 + style.playmaking * 0.2,
    interior_star: 30 + style.interior * 0.52 + style.rebounding * 0.18 + style.defense * 0.1,
    triangle: 28 + style.playmaking * 0.34 + style.perimeter * 0.18 + style.interior * 0.18,
    seven_seconds: 24 + style.pace * 0.5 + style.perimeter * 0.24 + style.playmaking * 0.16
  };
  const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  return ranked[0]?.[0] || fallbackSystemId || 'balance';
}
function getCoachCandidateQuality(coach, teamId = 0) {
  const fx = typeof getCoachEffectsByCoach === 'function' ? getCoachEffectsByCoach(coach) : {};
  const ratingMult = parseNum(fx.teamRatingMult, 1);
  let score = 52;
  score += parseNum(fx.techLevel, 0) * 4.6;
  score += parseNum(fx.techDev, 0) * 3.8;
  score += (parseNum(fx.baseOff, 40) - 40) * 0.7;
  score += (parseNum(fx.baseDef, 40) - 40) * 0.7;
  score += (ratingMult - 1) * 115;
  if (parseNum(teamId, 0) === parseNum(G.teamId, 0)) {
    score += (getCoachFavorability(coach) - 50) * 0.08;
  }
  return clamp(Math.round(score), 28, 94);
}
function buildCoachHireScore(teamId, coach) {
  const systemId = String(coach?.systemId || resolveCoachSystemIdByName(coach?.name) || 'balance').trim() || 'balance';
  const style = buildTeamCoachStyleProfile(teamId);
  let fit = 0;
  if (systemId === 'defense') fit = style.defense * 0.45 + style.rebounding * 0.18;
  else if (systemId === 'grit') fit = style.interior * 0.22 + style.rebounding * 0.42 + style.defense * 0.18;
  else if (systemId === 'pace_space') fit = style.perimeter * 0.38 + style.pace * 0.3 + style.playmaking * 0.2;
  else if (systemId === 'perimeter_star') fit = style.perimeter * 0.48 + style.playmaking * 0.18;
  else if (systemId === 'interior_star') fit = style.interior * 0.48 + style.rebounding * 0.16;
  else if (systemId === 'triangle') fit = style.playmaking * 0.32 + style.perimeter * 0.16 + style.interior * 0.16;
  else if (systemId === 'seven_seconds') fit = style.pace * 0.46 + style.perimeter * 0.2 + style.playmaking * 0.16;
  else fit = Math.min(style.perimeter, style.interior) * 0.2 + style.playmaking * 0.18 + style.defense * 0.12;
  const agePenalty = Math.max(0, parseNum(coach?.age, 45) - 63) * 0.9;
  return getCoachCandidateQuality(coach, teamId) + fit * 0.22 - agePenalty + rng(-4, 4);
}
function estimateCoachSalary(coach) {
  const quality = getCoachCandidateQuality(coach, parseNum(coach?.teamId, 0));
  return +clamp((quality - 20) * 0.12, 2.2, 9.8).toFixed(2);
}
function buildCoachRetentionProfile(teamId, coach, teamRecord = null) {
  const teamIdNum = parseNum(teamId, 0);
  const record = teamRecord || (typeof getLeagueTeamRecordsArray === 'function'
    ? getLeagueTeamRecordsArray().find(r => parseNum(r.teamId, 0) === teamIdNum)
    : null) || {};
  const gp = Math.max(0, parseNum(record?.gp, 0));
  const pct = gp > 0 ? clamp(parseNum(record?.pct, parseNum(record?.w, 0) / Math.max(1, gp)), 0, 1) : 0.5;
  const age = parseNum(coach?.age, 45);
  const contract = Math.max(0, parseNum(coach?.yearsContract, 2));
  const loyalty = clamp(parseNum(coach?.loyalty, 5), 0, 10);
  const quality = getCoachCandidateQuality(coach, teamIdNum);
  let pressure = 26;
  pressure += clamp((0.53 - pct) * 120, -16, 36);
  pressure += clamp((age - 56) * 1.25, 0, 22);
  pressure += contract <= 0 ? 18 : contract === 1 ? 10 : contract === 2 ? 4 : -3;
  pressure -= clamp((loyalty - 5) * 2.8, -9, 12);
  pressure -= clamp((quality - 62) * 0.28, -9, 9);
  if (teamIdNum === parseNum(G.teamId, 0)) {
    pressure -= clamp((getCoachFavorability(coach) - 50) * 0.42, -18, 18);
  }
  pressure = clamp(pressure, 4, 94);
  const moveChance = clamp(0.02 + Math.max(0, pressure - 30) / 95, 0.02, 0.72);
  return {
    teamId: teamIdNum,
    pct,
    age,
    contract,
    loyalty,
    quality,
    pressure,
    moveChance,
    extensionYears: pct >= 0.6 ? rng(3, 4) : (pct >= 0.48 ? rng(2, 3) : rng(1, 2))
  };
}
function createGeneratedCoach(teamId, fallbackCoach = null) {
  const tid = parseNum(teamId, 0);
  const team = typeof getTeam === 'function' ? getTeam(tid) : null;
  const systemId = pickCoachSystemForTeam(tid, fallbackCoach?.systemId || 'balance');
  const systemProfile = typeof getCoachSystemProfile === 'function' ? getCoachSystemProfile(systemId) : { label: '均衡体系', secondaryLean: '按阵容灵活分配球权' };
  const seed = parseNum(G.year, 2025) + tid + parseNum(fallbackCoach?.id, 0);
  const name = `${GENERATED_COACH_FIRST_NAMES[seed % GENERATED_COACH_FIRST_NAMES.length]} ${GENERATED_COACH_LAST_NAMES[(seed * 3) % GENERATED_COACH_LAST_NAMES.length]}`;
  const techLevel = clamp(Math.round(1 + rng(0, 2) + (buildTeamCoachStyleProfile(tid).playmaking - 60) / 18), 1, 4);
  const techDev = clamp(Math.round(1 + rng(0, 2)), 1, 4);
  const baseShotTriplePercent = clamp(Math.round(systemId === 'pace_space' || systemId === 'perimeter_star' || systemId === 'seven_seconds' ? 42 + rng(-2, 2) : 38 + rng(-2, 2)), 35, 45);
  const baseShotIntPercent = clamp(Math.round(systemId === 'interior_star' || systemId === 'grit' ? 42 + rng(-2, 2) : 38 + rng(-2, 2)), 35, 45);
  const baseOffensive = clamp(Math.round(39 + techLevel + rng(-1, 3)), 35, 45);
  const baseDefense = clamp(Math.round(39 + techDev + (systemId === 'defense' ? 2 : 0) + rng(-1, 2)), 35, 45);
  const coach = {
    id: Date.now() + tid,
    name,
    teamId: tid,
    age: clamp(41 + (seed % 11), 38, 56),
    yearsContract: rng(2, 4),
    salary: 0,
    techLevel,
    techDev,
    baseShotIntPercent,
    baseShotTriplePercent,
    baseOffensive,
    baseDefense,
    currentShotIntPercent: baseShotIntPercent,
    currentShotTriplePercent: baseShotTriplePercent,
    currentOffensive: baseOffensive,
    currentDefense: baseDefense,
    loyalty: clamp(5 + rng(-1, 2), 3, 8),
    systemId,
    systemLabel: systemProfile.label,
    secondaryLean: systemProfile.secondaryLean,
    generated: true,
    previousTeam: team?.a || ''
  };
  coach.salary = estimateCoachSalary(coach);
  return coach;
}
function runOffseasonCoachCarousel() {
  if (!LEAGUE.loaded || !LEAGUE.teams) return [];
  if (typeof ensureCoachRelationshipState === 'function') ensureCoachRelationshipState();
  const records = typeof getLeagueTeamRecordsArray === 'function' ? getLeagueTeamRecordsArray() : [];
  const recordMap = new Map(records.map(r => [parseNum(r.teamId, 0), r]));
  const evaluations = [];
  Object.entries(LEAGUE.teams).forEach(([tidRaw, teamObj]) => {
    const teamId = parseNum(tidRaw, 0);
    if (!teamId || !teamObj?.coach) return;
    const coach = teamObj.coach;
    coach.teamId = teamId;
    coach.age = Math.max(35, parseNum(coach.age, 45) + 1);
    coach.yearsContract = Math.max(0, parseNum(coach.yearsContract, 2) - 1);
    coach.systemId = String(coach.systemId || resolveCoachSystemIdByName(coach.name) || pickCoachSystemForTeam(teamId, 'balance')).trim() || 'balance';
    const systemProfile = typeof getCoachSystemProfile === 'function' ? getCoachSystemProfile(coach.systemId) : { label: '均衡体系', secondaryLean: '按阵容灵活分配球权' };
    coach.systemLabel = systemProfile.label;
    coach.secondaryLean = systemProfile.secondaryLean;
    coach.salary = parseNum(coach.salary, 0) > 0 ? parseNum(coach.salary, 0) : estimateCoachSalary(coach);
    evaluations.push({
      teamId,
      teamObj,
      team: typeof getTeam === 'function' ? getTeam(teamId) : teamObj.meta,
      coach,
      profile: buildCoachRetentionProfile(teamId, coach, recordMap.get(teamId))
    });
  });
  if (!evaluations.length) {
    if (typeof syncLeagueCoachList === 'function') syncLeagueCoachList();
    return [];
  }
  evaluations.sort((a, b) => b.profile.pressure - a.profile.pressure);
  const minMoves = evaluations[0].profile.pressure >= 66 ? 2 : (evaluations[0].profile.pressure >= 52 ? 1 : 0);
  const vacancyTeams = [];
  const releasedCoaches = [];
  const retainedLines = [];
  evaluations.forEach((entry, idx) => {
    const forcedMove = idx < minMoves;
    const shouldMove = forcedMove || Math.random() < entry.profile.moveChance;
    if (shouldMove) {
      entry.teamObj.coach = null;
      releasedCoaches.push({ coach: { ...entry.coach }, prevTeamId: entry.teamId, prevTeam: entry.team });
      vacancyTeams.push(entry);
      return;
    }
    const shouldExtend = entry.profile.contract <= 0 || (entry.profile.contract <= 1 && entry.profile.pressure <= 46) || entry.profile.pct >= 0.58;
    if (shouldExtend) {
      entry.coach.yearsContract = Math.max(entry.coach.yearsContract, entry.profile.extensionYears);
      entry.coach.salary = estimateCoachSalary(entry.coach);
      if (entry.teamId === parseNum(G.teamId, 0)) {
        retainedLines.push(`🤝 ${entry.coach.name} 获得续约，与你的好感度 ${getCoachFavorability(entry.coach)} 让留任倾向更稳。`);
      }
    }
  });
  const moveLines = [];
  vacancyTeams.forEach(vacancy => {
    const candidates = releasedCoaches
      .filter(item => parseNum(item.prevTeamId, 0) !== vacancy.teamId)
      .map(item => ({ ...item, hireScore: buildCoachHireScore(vacancy.teamId, item.coach) }))
      .sort((a, b) => b.hireScore - a.hireScore);
    let selected = candidates[0] || null;
    let nextCoach = selected ? { ...selected.coach } : createGeneratedCoach(vacancy.teamId, vacancy.coach);
    if (selected) {
      const idx = releasedCoaches.findIndex(item => String(item.coach?.id || item.coach?.name) === String(selected.coach?.id || selected.coach?.name) && parseNum(item.prevTeamId, 0) === parseNum(selected.prevTeamId, 0));
      if (idx >= 0) releasedCoaches.splice(idx, 1);
    }
    nextCoach.teamId = vacancy.teamId;
    nextCoach.systemId = String(nextCoach.systemId || pickCoachSystemForTeam(vacancy.teamId, vacancy.coach?.systemId || 'balance')).trim() || 'balance';
    const nextSystem = typeof getCoachSystemProfile === 'function' ? getCoachSystemProfile(nextCoach.systemId) : { label: '均衡体系', secondaryLean: '按阵容灵活分配球权' };
    nextCoach.systemLabel = nextSystem.label;
    nextCoach.secondaryLean = nextSystem.secondaryLean;
    nextCoach.yearsContract = Math.max(2, parseNum(nextCoach.yearsContract, 0) || rng(2, 4));
    nextCoach.salary = estimateCoachSalary(nextCoach);
    vacancy.teamObj.coach = nextCoach;
    if (vacancy.teamId === parseNum(G.teamId, 0) && typeof setCoachFavorability === 'function') {
      setCoachFavorability(nextCoach, getDefaultCoachFavorability(nextCoach, vacancy.teamId), { season: G.season, teamId: vacancy.teamId, games: 0 });
    }
    const teamAbbr = String(vacancy.team?.a || vacancy.team?.abbr || vacancy.team?.z || vacancy.team?.n || `T${vacancy.teamId}`).trim();
    moveLines.push(`🧠 ${teamAbbr} 换帅：${vacancy.coach.name} → ${nextCoach.name}（胜率 ${(vacancy.profile.pct * 100).toFixed(1)}%，年龄 ${vacancy.profile.age}，压力 ${Math.round(vacancy.profile.pressure)}）`);
    if (vacancy.teamId === parseNum(G.teamId, 0)) {
      addNews(`🧠 ${vacancy.team?.z || vacancy.team?.n || '球队'} 在休赛期更换主教练：${vacancy.coach.name} 离任，${nextCoach.name} 接任。`, vacancy.profile.pressure >= 60 ? 'neg' : 'neu');
      addPhone('管理层', `休赛期决定：${vacancy.coach.name} 离任，新帅 ${nextCoach.name} 上任，主体系 ${nextCoach.systemLabel || '均衡体系'}。`, 'info');
    }
  });
  evaluations
    .filter(entry => !vacancyTeams.some(v => v.teamId === entry.teamId) && entry.teamId === parseNum(G.teamId, 0))
    .forEach(entry => {
      const favor = getCoachFavorability(entry.coach);
      addPhone(entry.coach.name, `管理层确认我会继续带队。你目前的教练好感度 ${favor}，下赛季继续冲。`, 'info');
    });
  Object.values(LEAGUE.teams || {}).forEach(teamObj => {
    if (!teamObj) return;
    if (Array.isArray(teamObj.players) && typeof toRotation === 'function') {
      teamObj.rotation = toRotation(teamObj.players);
    }
    if (typeof calcTeamStrength === 'function') {
      teamObj.strength = calcTeamStrength(teamObj);
    }
  });
  if (typeof syncLeagueCoachList === 'function') syncLeagueCoachList();
  const summary = [];
  summary.push(`教练市场：${moveLines.length} 支球队完成换帅，评估会看胜率、年龄、合同和你与教练的好感度。`);
  summary.push(...retainedLines.slice(0, 1));
  summary.push(...moveLines.slice(0, 6));
  return summary.filter(Boolean);
}
function endSeasonPostPipeline() {
  const coachSummary = runOffseasonCoachCarousel();
  if (!Array.isArray(G.offseasonSummary)) G.offseasonSummary = [];
  if (coachSummary.length) G.offseasonSummary.push(...coachSummary);
}
function updateCoachFavorabilityAfterGame(result) {
  const coach = typeof getTeamCoach === 'function' ? getTeamCoach(parseNum(G.teamId, 0)) : null;
  if (!coach || typeof changeCoachFavorability !== 'function') return null;
  const entry = typeof ensureCoachRelationEntry === 'function' ? ensureCoachRelationEntry(coach) : null;
  const gradeDeltaMap = { 'S+': 3, 'S': 2, 'A': 1.2, 'B': 0.4, 'C': 0, 'D': -0.8, 'F': -1.6 };
  let delta = result?.win ? 1.1 : -0.8;
  delta += gradeDeltaMap[result?.grade] || 0;
  const mins = parseNum(result?.st?.mins, 0);
  const pts = parseNum(result?.pts, 0);
  const ast = parseNum(result?.ast, 0);
  if (mins >= 34) delta += 0.4;
  else if (mins <= 14) delta -= 0.5;
  if (pts >= 30) delta += 0.5;
  if (ast >= 8) delta += 0.25;
  if (result?.injured) delta -= 0.4;
  const before = getCoachFavorability(coach);
  const next = changeCoachFavorability(coach, clamp(delta, -3, 3), {
    games: Math.max(0, parseNum(entry?.games, 0)) + 1,
    season: G.season,
    teamId: G.teamId
  });
  return { before, after: next, delta: next - before };
}
function applyCoachRelationshipOutcome({ favorDelta = 0, fameDelta = 0, trustDelta = 0, moodDelta = 0, xpDelta = 0, directives = null, source = '', phone = '', news = '', type = 'info' } = {}) {
  const coach = typeof getTeamCoach === 'function' ? getTeamCoach(parseNum(G.teamId, 0)) : null;
  if (coach && typeof changeCoachFavorability === 'function') {
    changeCoachFavorability(coach, favorDelta, { season: G.season, teamId: G.teamId });
  }
  if (typeof ensureCoachDynamicsState === 'function') {
    const dynamics = ensureCoachDynamicsState();
    if (directives && typeof directives === 'object') {
      Object.entries(directives).forEach(([key, value]) => {
        if (value == null) return;
        dynamics.directives[key] = parseNum(value, dynamics.directives[key] || -1);
      });
    }
  }
  if (fameDelta || trustDelta) applyReputationDelta({ fame: fameDelta, trust: trustDelta, source: source || '教练关系' });
  if (moodDelta) G.player.mood = clamp(parseNum(G.player.mood, 50) + parseNum(moodDelta, 0), 0, 100);
  if (xpDelta > 0) addPlayerXP(xpDelta);
  if (phone) addPhone(coach?.name || '教练组', phone, type);
  if (news) addNews(news, favorDelta >= 0 ? 'pos' : 'neg');
  return {
    favor: coach ? getCoachFavorability(coach) : 50,
    mood: clamp(parseNum(G.player.mood, 50), 0, 100)
  };
}
function normalizeFreeTextResponse(text = '') {
  return String(text || '')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
function analyzeCoachFreeTextSignals(text = '') {
  const raw = normalizeFreeTextResponse(text);
  const lower = raw.toLowerCase();
  const hasAny = (list = []) => list.some(token => raw.includes(token) || lower.includes(String(token).toLowerCase()));
  const countAny = (list = []) => list.reduce((sum, token) => sum + ((raw.includes(token) || lower.includes(String(token).toLowerCase())) ? 1 : 0), 0);
  const aggression = clamp(
    countAny(['垃圾', '扯淡', '闭嘴', '滚', '烂', '不爽', '生气', '愤怒', '凭什么', '必须', '立刻', '交易我', 'trade me']) * 18 +
    (raw.includes('!') ? 8 : 0),
    0,
    100
  );
  const diplomacy = clamp(
    20 + countAny(['谢谢', '理解', '尊重', '希望', '尽量', '沟通', '配合', '接受', '愿意', '一起', '抱歉']) * 14,
    0,
    100
  );
  const teamOrientation = clamp(
    10 + countAny(['球队', '团队', '大家', '我们', '赢球', '防守', '执行', '战术', '体系', '教练']) * 15,
    0,
    100
  );
  const businessRisk = clamp(
    countAny(['媒体', '热搜', '公开', '发推', '采访', '新闻', '球迷', '品牌', '代言']) * 15 + Math.max(0, aggression - diplomacy) * 0.35,
    0,
    100
  );
  const usageDemand = clamp(
    countAny(['球权', '出手', '更多球', '多拿球', '战术地位', '核心', '终结']) * 22 + Math.max(0, aggression - 20) * 0.3,
    0,
    100
  );
  const startingDemand = clamp(
    countAny(['首发', '先发', '主力', '时间', '位置', '更大角色', '更大位置']) * 24 + Math.max(0, aggression - 15) * 0.24,
    0,
    100
  );
  const buyIn = clamp(
    countAny(['体系', '战术', '服从', '执行', '跑位', '配合', '牺牲', '团队']) * 18 + diplomacy * 0.28 + teamOrientation * 0.22,
    0,
    100
  );
  const selfFocus = clamp(
    countAny(['我', '自己', '我的', '我要', '我想', '我会']) * 10 + usageDemand * 0.2 + startingDemand * 0.2 - teamOrientation * 0.08,
    0,
    100
  );
  const filmStudy = clamp(
    countAny(['录像', '加练', '研究', '训练', '复盘', '看录像', '加训']) * 22 + diplomacy * 0.12,
    0,
    100
  );
  return {
    text: raw,
    aggression: Math.round(aggression),
    diplomacy: Math.round(diplomacy),
    teamOrientation: Math.round(teamOrientation),
    businessRisk: Math.round(businessRisk),
    usageDemand: Math.round(usageDemand),
    startingDemand: Math.round(startingDemand),
    buyIn: Math.round(buyIn),
    selfFocus: Math.round(selfFocus),
    filmStudy: Math.round(filmStudy)
  };
}
async function classifyCoachResponseByLLM(prompt, text) {
  ensureSocialState();
  const llm = G.social?.llm || {};
  if (!llm.enabled || !String(llm.apiKey || '').trim()) return null;
  const promptType = String(prompt?.type || '').trim() || 'coach_prompt';
  const allowed = Array.isArray(prompt?.choices) ? prompt.choices.map(c => String(c.id || '').trim()).filter(Boolean) : [];
  if (!allowed.length) return null;
  const baseUrl = normalizeLLMBaseUrl(llm.baseUrl);
  const model = String(llm.model || 'gpt-4.1-mini').trim();
  const system = `你是篮球生涯游戏的文本判定器。用户会输入一段中文回答，请你只做分类，不做创作。
你必须返回合法 JSON：
{
  "choiceId": "必须从给定列表中选择一个",
  "aggression": 0-100,
  "diplomacy": 0-100,
  "teamOrientation": 0-100,
  "businessRisk": 0-100,
  "summary": "不超过24字的判断摘要"
}
不要输出解释。`;
  const userPayload = JSON.stringify({
    type: promptType,
    title: prompt?.title || '',
    desc: prompt?.desc || '',
    allowedChoiceIds: allowed,
    answer: normalizeFreeTextResponse(text)
  });
  try {
    let raw = '';
    if (isGoogleGeminiEndpoint(baseUrl)) {
      const modelName = normalizeModelNameForGemini(model);
      const endpoint = `${baseUrl}/models/${encodeURIComponent(modelName)}:generateContent`;
      const req = buildLLMRequestConfig(baseUrl, llm.apiKey, endpoint, { jsonBody: true });
      const payload = {
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: 'user', parts: [{ text: userPayload }] }],
        generationConfig: { temperature: 0.2, responseMimeType: 'application/json' }
      };
      const res = await fetch(req.url, { method: 'POST', headers: req.headers, body: JSON.stringify(payload) });
      const data = await readJSONResponseSafe(res, '自由输入判定');
      raw = (data?.candidates?.[0]?.content?.parts || []).map(p => p.text).join('') || '';
    } else {
      const payload = {
        model,
        temperature: 0.2,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: userPayload }
        ],
        response_format: { type: 'json_object' }
      };
      const endpoint = `${baseUrl}/chat/completions`;
      const req = buildLLMRequestConfig(baseUrl, llm.apiKey, endpoint);
      const res = await fetch(req.url, { method: 'POST', headers: req.headers, body: JSON.stringify(payload) });
      const data = await readJSONResponseSafe(res, '自由输入判定');
      raw = data?.choices?.[0]?.message?.content || '';
    }
    let jsonStr = raw;
    const match = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (match) jsonStr = match[1];
    const parsed = tryParseJSONText(jsonStr.trim());
    if (!parsed || typeof parsed !== 'object') return null;
    const choiceId = allowed.includes(String(parsed.choiceId || '').trim()) ? String(parsed.choiceId || '').trim() : '';
    return {
      choiceId,
      aggression: clamp(parseNum(parsed.aggression, 50), 0, 100),
      diplomacy: clamp(parseNum(parsed.diplomacy, 50), 0, 100),
      teamOrientation: clamp(parseNum(parsed.teamOrientation, 50), 0, 100),
      businessRisk: clamp(parseNum(parsed.businessRisk, 50), 0, 100),
      summary: String(parsed.summary || '').trim()
    };
  } catch (e) {
    return null;
  }
}
function decideCoachChoiceFromSignals(prompt, analysis = {}) {
  const type = String(prompt?.type || '').trim();
  if (type === 'postgame_interview') {
    if (parseNum(analysis.usageDemand, 0) >= 55 || parseNum(analysis.aggression, 0) >= 66) return 'postgame_usage_complaint';
    if (parseNum(analysis.buyIn, 0) >= 66 || (parseNum(analysis.teamOrientation, 0) >= 68 && parseNum(analysis.diplomacy, 0) >= 56)) return 'postgame_credit_system';
    return 'postgame_team_first';
  }
  if (type === 'training_attitude') {
    if (parseNum(analysis.filmStudy, 0) >= 60 && parseNum(analysis.buyIn, 0) >= 52) return 'training_extra_film';
    if (parseNum(analysis.buyIn, 0) >= 64 || parseNum(analysis.teamOrientation, 0) >= 72) return 'training_system_buyin';
    return 'training_me_first';
  }
  if (type === 'coach_conversation') {
    if (parseNum(analysis.startingDemand, 0) >= 56) return 'demand_start';
    if (parseNum(analysis.buyIn, 0) >= 64 && parseNum(analysis.diplomacy, 0) >= 54) return 'obey_system';
    return 'complain_usage';
  }
  return String(prompt?.choices?.[0]?.id || '').trim();
}
function buildCoachInputAnalysisText(choiceId, analysis = {}, llmSummary = '') {
  const labels = [];
  if (parseNum(analysis.aggression, 0) >= 70) labels.push('强硬');
  else if (parseNum(analysis.diplomacy, 0) >= 70) labels.push('圆滑');
  if (parseNum(analysis.teamOrientation, 0) >= 65) labels.push('团队导向');
  if (parseNum(analysis.businessRisk, 0) >= 65) labels.push('媒体风险高');
  if (parseNum(analysis.buyIn, 0) >= 68) labels.push('服从体系');
  if (parseNum(analysis.usageDemand, 0) >= 60) labels.push('争取球权');
  if (parseNum(analysis.startingDemand, 0) >= 60) labels.push('争取位置');
  const choiceMap = {
    postgame_team_first: '先稳团队',
    postgame_usage_complaint: '公开施压球权',
    postgame_credit_system: '公开支持体系',
    training_extra_film: '主动加练复盘',
    training_me_first: '偏个人训练',
    training_system_buyin: '按体系训练',
    complain_usage: '私下抱怨球权',
    demand_start: '要求更大位置',
    obey_system: '主动服从体系'
  };
  const head = choiceMap[String(choiceId || '').trim()] || '已识别态度';
  const suffix = labels.length ? `系统识别：${head}，${labels.join(' / ')}` : `系统识别：${head}`;
  return llmSummary ? `${suffix}。${llmSummary}` : suffix;
}
async function resolveCoachPromptTextResponse(prompt, userText, result = null) {
  const text = normalizeFreeTextResponse(userText);
  if (!text) return { ok: false, text: '你什么都没说，教练组无法判断你的态度。' };
  const heuristic = analyzeCoachFreeTextSignals(text);
  const llmAnalysis = await classifyCoachResponseByLLM(prompt, text);
  const analysis = {
    ...heuristic,
    aggression: llmAnalysis ? clamp(parseNum(llmAnalysis.aggression, heuristic.aggression), 0, 100) : heuristic.aggression,
    diplomacy: llmAnalysis ? clamp(parseNum(llmAnalysis.diplomacy, heuristic.diplomacy), 0, 100) : heuristic.diplomacy,
    teamOrientation: llmAnalysis ? clamp(parseNum(llmAnalysis.teamOrientation, heuristic.teamOrientation), 0, 100) : heuristic.teamOrientation,
    businessRisk: llmAnalysis ? clamp(parseNum(llmAnalysis.businessRisk, heuristic.businessRisk), 0, 100) : heuristic.businessRisk
  };
  let choiceId = String(llmAnalysis?.choiceId || '').trim();
  if (!choiceId) choiceId = decideCoachChoiceFromSignals(prompt, analysis);
  let outcome = String(prompt?.type || '').trim() === 'coach_conversation'
    ? applyCoachConversationChoice(choiceId)
    : applyCoachDailyPromptChoice(prompt, choiceId, result);
  const favorDelta = (analysis.diplomacy >= 72 ? 1 : 0) + (analysis.teamOrientation >= 72 ? 1 : 0) - (analysis.aggression >= 74 ? 2 : 0);
  const trustDelta = (analysis.teamOrientation >= 70 ? 1 : 0) + (analysis.diplomacy >= 74 ? 1 : 0) - (analysis.businessRisk >= 72 ? 1 : 0);
  const fameDelta = analysis.businessRisk >= 70 ? 1 : 0;
  const moodDelta = analysis.aggression >= 72 ? 1 : (analysis.buyIn >= 72 ? -1 : 0);
  if (favorDelta || trustDelta || fameDelta || moodDelta) {
    applyCoachRelationshipOutcome({
      favorDelta,
      trustDelta,
      fameDelta,
      moodDelta,
      source: '自由输入态度判定'
    });
  }
  outcome = outcome && typeof outcome === 'object' ? outcome : { ok: true, text: '教练已经记下了你的态度。' };
  outcome.choiceId = choiceId;
  outcome.analysis = analysis;
  outcome.analysisText = buildCoachInputAnalysisText(choiceId, analysis, String(llmAnalysis?.summary || '').trim());
  ensureSocialState();
  G.social.playerStatementLog.unshift({
    day: parseNum(result?.day, G.dayNum),
    season: parseNum(G.season, 1),
    title: String(prompt?.title || '教练沟通').trim(),
    type: String(prompt?.type || '').trim(),
    text,
    choiceId,
    analysisText: outcome.analysisText,
    ts: Date.now()
  });
  if (G.social.playerStatementLog.length > 12) G.social.playerStatementLog.length = 12;
  return outcome;
}
function buildCoachDailyPrompt(result) {
  if (!result || typeof ensureCoachDynamicsState !== 'function') return null;
  const coach = typeof getTeamCoach === 'function' ? getTeamCoach(parseNum(G.teamId, 0)) : null;
  if (!coach) return null;
  const dynamics = ensureCoachDynamicsState();
  if (parseNum(dynamics.lastDailyPromptDay, -99) === parseNum(result.day, -100)) return null;
  if (result.isGame) {
    const game = result.gameResult || {};
    const margin = Math.abs(parseNum(game.teamPts, 0) - parseNum(game.oppPts, 0));
    const spotlight = ['S+', 'S', 'A', 'D', 'F'].includes(String(game.grade || '').trim()) || parseNum(game.pts, 0) >= 28 || margin <= 6;
    if (!spotlight) return null;
    return {
      type: 'postgame_interview',
      inputMode: 'free_text',
      title: '赛后采访',
      desc: `${coach.name} 希望你在镜头前给出一个明确信号。媒体刚把话筒递到你嘴边。`,
      placeholder: '自己打字回答，比如强调团队、公开要球，或为体系背书……',
      choices: [
        { id: 'postgame_team_first', title: '先夸团队', detail: '稳住更衣室和教练关系，个人光环会少一点。', badge: '教练好感↑ / 信任↑' },
        { id: 'postgame_usage_complaint', title: '暗示自己该多拿球', detail: '短期更容易抢到球权，但会让教练不舒服。', badge: '球权施压 / 教练好感↓' },
        { id: 'postgame_credit_system', title: '公开支持教练体系', detail: '你会显得更职业，但要接受短期让出一些球权。', badge: '服从体系 / 心情↓' }
      ]
    };
  }
  const trained = Array.isArray(result.events) && result.events.some(x => String(x || '').includes('训练'));
  if (!trained) return null;
  return {
    type: 'training_attitude',
    inputMode: 'free_text',
    title: '训练态度',
    desc: `${coach.name} 把今天的训练录像递给你，想看你到底愿不愿意按球队方案走。`,
    placeholder: '自己打字回答，比如愿意加练看录像，或坚持练自己喜欢的回合……',
    choices: [
      { id: 'training_extra_film', title: '加练并看录像', detail: '更累，但会被教练视为可靠球员。', badge: '教练好感↑ / XP↑' },
      { id: 'training_me_first', title: '只练自己想打的回合', detail: '短期有利于个人手感，但体系评价会下降。', badge: '球权施压 / 教练好感↓' },
      { id: 'training_system_buyin', title: '按体系跑位和战术', detail: '个人球权会被压一点，但长期更容易吃到体系红利。', badge: '服从体系 / 信任↑' }
    ]
  };
}
function applyCoachDailyPromptChoice(prompt, choiceId, result = null) {
  const promptType = String(prompt?.type || '').trim();
  const id = String(choiceId || '').trim();
  const day = parseNum(G.dayNum, 0);
  if (typeof ensureCoachDynamicsState === 'function') ensureCoachDynamicsState().lastDailyPromptDay = parseNum(result?.day, day);
  const coach = typeof getTeamCoach === 'function' ? getTeamCoach(parseNum(G.teamId, 0)) : null;
  const coachName = coach?.name || '教练';
  if (promptType === 'postgame_interview') {
    const game = result?.gameResult || {};
    if (id === 'postgame_team_first') {
      applyCoachRelationshipOutcome({
        favorDelta: game.win ? 4 : 3,
        trustDelta: 2,
        fameDelta: 1,
        moodDelta: -1,
        source: '赛后采访：强调团队',
        phone: `你在采访里先讲球队和执行力，这种表态我会记住。`,
        news: `🎙️ ${G.player.name} 赛后把功劳先让给球队和教练组，更衣室气氛稳定。`
      });
      return { ok: true, text: `你把话题压回团队，${coachName} 对你的职业态度更满意。` };
    }
    if (id === 'postgame_usage_complaint') {
      applyCoachRelationshipOutcome({
        favorDelta: parseNum(game.pts, 0) >= 30 ? -5 : -7,
        trustDelta: -2,
        fameDelta: 2,
        moodDelta: 1,
        directives: { usageDemandUntilDay: day + 6 },
        source: '赛后采访：暗示球权不够',
        phone: `媒体会放大你的发言。既然你想要更多球权，我也会更严格看你的选择。`,
        news: `🎙️ ${G.player.name} 在采访中暗示自己该获得更多球权，外界开始讨论他与教练组的张力。`,
        type: 'warn'
      });
      return { ok: true, text: `你公开给了教练组压力，短期会更容易拿到球，但关系也变紧了。` };
    }
    applyCoachRelationshipOutcome({
      favorDelta: 6,
      trustDelta: 1,
      moodDelta: -2,
      directives: { buyInUntilDay: day + 7 },
      source: '赛后采访：公开支持体系',
      phone: `你替体系说话，这能让整个更衣室更容易接受我们的打法。`,
      news: `🎙️ ${G.player.name} 赛后公开为教练体系背书，球队内部执行力预期走高。`
    });
    return { ok: true, text: `你把功劳让给体系，教练会更愿意长期重用你。` };
  }
  if (promptType === 'training_attitude') {
    if (id === 'training_extra_film') {
      applyCoachRelationshipOutcome({
        favorDelta: 5,
        trustDelta: 1,
        moodDelta: -2,
        xpDelta: 3,
        directives: { buyInUntilDay: day + 5 },
        source: '训练态度：主动加练',
        phone: `你今天把录像室坐满了。累是累，但这种态度会直接反映在轮换里。`,
        type: 'info'
      });
      return { ok: true, text: `你把训练强度拉满，教练组会把你视为更可靠的执行点。` };
    }
    if (id === 'training_me_first') {
      applyCoachRelationshipOutcome({
        favorDelta: -4,
        trustDelta: -1,
        moodDelta: 1,
        xpDelta: 2,
        directives: { usageDemandUntilDay: day + 4 },
        source: '训练态度：只练个人回合',
        phone: `你练了很多自己喜欢的东西，但对团队战术帮助有限。`,
        type: 'warn'
      });
      return { ok: true, text: `你更偏向练自己的进攻包，手感可能更顺，但教练会下调体系评价。` };
    }
    applyCoachRelationshipOutcome({
      favorDelta: 4,
      trustDelta: 2,
      moodDelta: -1,
      directives: { buyInUntilDay: day + 6 },
      source: '训练态度：服从体系',
      phone: `你今天完全按球队要求跑位，这会让之后的战术待遇更稳定。`,
      type: 'info'
    });
    return { ok: true, text: `你老老实实按体系训练，教练对你的信任更高了。` };
  }
  return { ok: false, text: '没有发生额外变化。' };
}
function buildCoachConversationPrompt() {
  const coach = typeof getTeamCoach === 'function' ? getTeamCoach(parseNum(G.teamId, 0)) : null;
  if (!coach) return null;
  const rotation = typeof ensureGameRotation === 'function' ? ensureGameRotation() : [];
  const self = rotation.find(p => p?.isSelf || String(p?.id || '') === 'USER_SELF') || null;
  const isStarter = String(self?.rotationRole || '') === 'starter';
  const starterLabel = isStarter ? '要求更多核心回合' : '要求首发位置';
  return {
    type: 'coach_conversation',
    inputMode: 'free_text',
    title: '教练沟通',
    desc: `${coach.name} 愿意听你一次正面表达诉求，但这次沟通会留下代价。`,
    placeholder: '自己打字说明诉求，比如想要更多球权、首发位置，或表态愿意服从体系。',
    choices: [
      { id: 'complain_usage', title: '抱怨球权', detail: '短期更容易拿到出手，但教练好感和信任会掉。', badge: '球权施压 / 教练好感↓' },
      { id: 'demand_start', title: starterLabel, detail: '你可能抢到更多分钟，但会明显冒犯教练权威。', badge: '首发施压 / 风险高' },
      { id: 'obey_system', title: '服从体系', detail: '短期要牺牲个人触球，但会换来更高信任。', badge: '服从体系 / 教练好感↑' }
    ]
  };
}
function applyCoachConversationChoice(choiceId) {
  const id = String(choiceId || '').trim();
  const day = parseNum(G.dayNum, 0);
  if (typeof ensureCoachDynamicsState === 'function') ensureCoachDynamicsState().lastConversationDay = day;
  if (id === 'complain_usage') {
    applyCoachRelationshipOutcome({
      favorDelta: -7,
      trustDelta: -3,
      moodDelta: 2,
      directives: { usageDemandUntilDay: day + 8 },
      source: '教练沟通：抱怨球权',
      phone: `你想要更多球，我听到了。但从现在开始，我也会更严苛地要求你。`,
      news: `🗣️ ${G.player.name} 被曝私下向教练组表达过对球权分配的不满。`,
      type: 'warn'
    });
    return { ok: true, text: '你把球权问题摊开了说，短期战术地位会上浮，但教练关系明显变差。' };
  }
  if (id === 'demand_start') {
    applyCoachRelationshipOutcome({
      favorDelta: -9,
      trustDelta: -4,
      moodDelta: 1,
      directives: { startingDemandUntilDay: day + 10 },
      source: '教练沟通：要求更大位置',
      phone: `你已经把立场说得很清楚了。短期我会重新审视轮换，但这不是免费的。`,
      news: `🗣️ ${G.player.name} 向教练组明确表达了自己想要更大位置的态度。`,
      type: 'warn'
    });
    return { ok: true, text: '你直接要求更大位置，分钟可能短暂上涨，但关系代价也最大。' };
  }
  applyCoachRelationshipOutcome({
    favorDelta: 6,
    trustDelta: 2,
    moodDelta: -2,
    directives: { buyInUntilDay: day + 10, usageDemandUntilDay: -1, startingDemandUntilDay: -1 },
    source: '教练沟通：服从体系',
    phone: `你愿意按体系来，我就更愿意把稳定的轮换和关键时间给你。`,
    news: `🤝 ${G.player.name} 与教练组沟通后选择先服从球队体系。`,
    type: 'info'
  });
  return { ok: true, text: '你选择先服从体系，短期数据未必最好看，但教练关系会明显回暖。' };
}
function leaguePlayerKey(teamId, playerId, isSelf = false) {
  return isSelf ? 'USER_SELF' : `${teamId}_${playerId}`;
}
function emptySeasonLine(teamId, playerId, name, pos, isSelf = false) {
  return {
    key: leaguePlayerKey(teamId, playerId, isSelf),
    teamId,
    playerId,
    name: name || 'Player',
    pos: parseNum(pos, 3),
    isSelf,
    gp: 0, pts: 0, reb: 0, ast: 0, stl: 0, blk: 0, tov: 0, fgm: 0, fga: 0, tpm: 0, tpa: 0, ftm: 0, fta: 0, mins: 0
  };
}
function ensureLeagueStateShape() {
  if (!G.leagueSeason || typeof G.leagueSeason !== 'object') {
    G.leagueSeason = { round: 0, teamRecords: {}, playerStats: {}, roundSchedule: [], teamGameLogs: {}, gameDetails: [] };
  }
  if (!G.leagueSeason.teamRecords) G.leagueSeason.teamRecords = {};
  if (!G.leagueSeason.playerStats) G.leagueSeason.playerStats = {};
  if (!Array.isArray(G.leagueSeason.roundSchedule)) G.leagueSeason.roundSchedule = [];
  if (!G.leagueSeason.teamGameLogs) G.leagueSeason.teamGameLogs = {};
  if (!Array.isArray(G.leagueSeason.gameDetails)) G.leagueSeason.gameDetails = [];
  if (!Number.isFinite(G.leagueSeason.round)) G.leagueSeason.round = 0;
}

// ============ 天数模拟系统 (APK风格) ============
function generateGameDays() {
  // 82场比赛分布在180天，平均每2.2天一场
  const days = [];
  const total = G.totalGames || 82;
  const seasonLen = G.seasonDays || 180;
  const gap = seasonLen / total;
  for (let i = 0; i < total; i++) {
    days.push(Math.floor(i * gap + rng(0, 1)));
  }
  // 去重排序
  G.gameDays = [...new Set(days)].sort((a, b) => a - b);
  // 确保有82天比赛
  while (G.gameDays.length < total) {
    const last = G.gameDays[G.gameDays.length - 1] || 0;
    if (last + 1 < seasonLen && !G.gameDays.includes(last + 1)) G.gameDays.push(last + 1);
    else if (last + 2 < seasonLen && !G.gameDays.includes(last + 2)) G.gameDays.push(last + 2);
    else break;
    G.gameDays.sort((a, b) => a - b);
  }
  return G.gameDays;
}

function getDayDateString(dayNum) {
  // 赛季从10月开始，dayNum=0对应10月1日
  const startMonth = 10;
  const base = new Date(G.year, startMonth - 1, 1);
  base.setDate(base.getDate() + dayNum);
  return `${base.getMonth() + 1}月${base.getDate()}日`;
}

function getNextGameDay() {
  for (let i = 0; i < G.gameDays.length; i++) {
    if (G.gameDays[i] >= G.dayNum) return G.gameDays[i];
  }
  return -1; // 赛季结束
}

function isGameDay(dayNum) {
  return G.gameDays.includes(dayNum);
}

function simulateDay() {
  if (G.dayNum >= G.seasonDays) return { type: 'seasonEnd' };
  ensureEconomyState();
  decayCommercialMomentum();
  const ecoFx = getEconomyEffects();

  const isGame = isGameDay(G.dayNum);
  const result = { day: G.dayNum, date: getDayDateString(G.dayNum), isGame, events: [] };

  if (isGame && G.gameNum < 82) {
    // 比赛日
    const gameRes = playGame(G.gameNum);
    result.gameResult = gameRes;
    result.gameEvent = gameRes?.gameEvent || G._gameEventResult || null;
    if (typeof buildMatchupContextForLLM === 'function') {
      result.matchup = buildMatchupContextForLLM(result, { limit: 3 });
    }
    result.events.push(`⚔️ 进行了第${G.gameNum}场比赛`);
    const postRecovery = recoverStamina({ rest: false, ecoFx });
    result.events.push(`🔋 赛后恢复 +${postRecovery}`);
  } else {
    // 休息日
    const staminaRec = recoverStamina({ rest: true, ecoFx });
    result.events.push(`😴 休息日，体力+${staminaRec}`);
    // 训练获得少量XP
    if (Math.random() < 0.4) {
      const xp = rng(2, 6);
      addPlayerXP(xp);
      result.events.push(`🏋️ 训练，XP+${xp}`);
    }
  }

  // 每日运行交易与续约系统
  if (typeof settleEndorsementIncome === 'function') settleEndorsementIncome(result);
  maybeTriggerCommercialOpportunity(result);
  if (typeof tryAITrade === 'function') tryAITrade();
  if (typeof tryAIRenewal === 'function') tryAIRenewal();
  if (typeof triggerTradeRequest === 'function') triggerTradeRequest();
  if (typeof checkPlayerRenewal === 'function') checkPlayerRenewal();

  G.dayNum++;
  return result;
}

function simulateDays(count) {
  const results = [];
  for (let i = 0; i < count; i++) {
    if (G.dayNum >= G.seasonDays) break;
    if (G.gameNum >= 82) break;
    const res = simulateDay();
    results.push(res);
    // 如果有待处理事件，中断
    if (res.hasEvent) break;
  }
  return results;
}

function skipToNextGame() {
  const nextGame = getNextGameDay();
  if (nextGame < 0) return [];
  const daysToSkip = nextGame - G.dayNum;
  if (daysToSkip <= 0) return simulateDays(1);
  return simulateDays(daysToSkip);
}

// ============ SOCIAL (推文) & ECONOMY (金钱) ============
const STAMINA_COACH_MARKET = [
  { level: 0, name: '未聘请', cost: 0, restBonus: 0, gameBonus: 0, injuryMult: 1 },
  { level: 1, name: '体能教练-基础', cost: 2.2, restBonus: 2, gameBonus: 1, injuryMult: 0.97 },
  { level: 2, name: '体能教练-进阶', cost: 6.5, restBonus: 4, gameBonus: 2, injuryMult: 0.92 },
  { level: 3, name: '体能教练-专家', cost: 13.0, restBonus: 6, gameBonus: 3, injuryMult: 0.88 },
  { level: 4, name: '体能教练-冠军组', cost: 24.0, restBonus: 8, gameBonus: 4, injuryMult: 0.84 }
];
const TRAINING_COACH_MARKET = [
  { level: 0, name: '未聘请', cost: 0, xpMult: 1 },
  { level: 1, name: '训练教练-基础', cost: 2.8, xpMult: 1.08 },
  { level: 2, name: '训练教练-进阶', cost: 7.8, xpMult: 1.16 },
  { level: 3, name: '训练教练-专家', cost: 16.0, xpMult: 1.26 },
  { level: 4, name: '训练教练-顶级', cost: 29.0, xpMult: 1.38 }
];
const RECOVERY_TEAM_MARKET = [
  { level: 0, name: '未聘请', cost: 0, restBonus: 0, gameBonus: 0, injuryMult: 1, injuryDaysMult: 1 },
  { level: 1, name: '康复团队-理疗组', cost: 3.4, restBonus: 1, gameBonus: 0, injuryMult: 0.97, injuryDaysMult: 0.96 },
  { level: 2, name: '康复团队-运动医学组', cost: 8.6, restBonus: 2, gameBonus: 1, injuryMult: 0.93, injuryDaysMult: 0.91 },
  { level: 3, name: '康复团队-专家组', cost: 18.5, restBonus: 3, gameBonus: 1, injuryMult: 0.88, injuryDaysMult: 0.86 },
  { level: 4, name: '康复团队-冠军实验室', cost: 31.0, restBonus: 4, gameBonus: 2, injuryMult: 0.83, injuryDaysMult: 0.8 }
];
const PR_TEAM_MARKET = [
  { level: 0, name: '未聘请', cost: 0, posRepMult: 1, negRepMult: 1, socialHeatMult: 1, eventBonus: 0, marketScoreBonus: 0 },
  { level: 1, name: '公关团队-基础', cost: 2.6, posRepMult: 1.05, negRepMult: 0.92, socialHeatMult: 1.05, eventBonus: 0.012, marketScoreBonus: 2 },
  { level: 2, name: '公关团队-进阶', cost: 6.8, posRepMult: 1.1, negRepMult: 0.84, socialHeatMult: 1.1, eventBonus: 0.024, marketScoreBonus: 4 },
  { level: 3, name: '公关团队-全国档', cost: 14.8, posRepMult: 1.16, negRepMult: 0.78, socialHeatMult: 1.16, eventBonus: 0.038, marketScoreBonus: 6 },
  { level: 4, name: '公关团队-顶流班底', cost: 27.5, posRepMult: 1.22, negRepMult: 0.72, socialHeatMult: 1.24, eventBonus: 0.052, marketScoreBonus: 9 }
];
const AGENT_TEAM_MARKET = [
  { level: 0, name: '未聘请', cost: 0, marketScoreBonus: 0, offerMult: 1, incomeMult: 1, activeCapBonus: 0 },
  { level: 1, name: '经纪团队-基础', cost: 2.9, marketScoreBonus: 3, offerMult: 1.04, incomeMult: 1.03, activeCapBonus: 0 },
  { level: 2, name: '经纪团队-进阶', cost: 7.9, marketScoreBonus: 6, offerMult: 1.08, incomeMult: 1.06, activeCapBonus: 1 },
  { level: 3, name: '经纪团队-明星班底', cost: 17.2, marketScoreBonus: 10, offerMult: 1.14, incomeMult: 1.1, activeCapBonus: 1 },
  { level: 4, name: '经纪团队-门面级', cost: 32.0, marketScoreBonus: 14, offerMult: 1.2, incomeMult: 1.15, activeCapBonus: 2 }
];
const ANALYTICS_SERVICE_MARKET = [
  { level: 0, name: '未订阅', cost: 0, xpMult: 1, prepBonus: 0, fatigueRelief: 0, marketScoreBonus: 0 },
  { level: 1, name: '数据分析-基础', cost: 2.1, xpMult: 1.03, prepBonus: 1.5, fatigueRelief: 0.01, marketScoreBonus: 1 },
  { level: 2, name: '数据分析-进阶', cost: 5.8, xpMult: 1.06, prepBonus: 2.5, fatigueRelief: 0.015, marketScoreBonus: 2 },
  { level: 3, name: '数据分析-专家', cost: 12.6, xpMult: 1.1, prepBonus: 4, fatigueRelief: 0.02, marketScoreBonus: 4 },
  { level: 4, name: '数据分析-冠军智库', cost: 22.8, xpMult: 1.15, prepBonus: 6, fatigueRelief: 0.03, marketScoreBonus: 6 }
];
const LUXURY_MARKET = [
  { id: 'loft', name: '城市高层公寓', cost: 1.8, fame: 1, trust: 0, socialTag: '房产' },
  { id: 'riverside_flat', name: '江景平层', cost: 2.6, fame: 1, trust: 0, socialTag: '房产' },
  { id: 'suburb_villa', name: '城郊独栋别墅', cost: 6.9, fame: 3, trust: 1, socialTag: '豪宅' },
  { id: 'downtown_penthouse', name: '市中心顶层公寓', cost: 8.4, fame: 3, trust: 0, socialTag: '豪宅' },
  { id: 'lake_house', name: '湖畔庄园', cost: 11.2, fame: 4, trust: 1, socialTag: '豪宅' },
  { id: 'seaview_villa', name: '海景别墅', cost: 18.5, fame: 6, trust: 1, socialTag: '豪宅' },
  { id: 'mountain_estate', name: '山景庄园', cost: 15.8, fame: 5, trust: 1, socialTag: '豪宅' },
  { id: 'historic_mansion', name: '历史风豪宅', cost: 13.3, fame: 4, trust: 0, socialTag: '豪宅' },
  { id: 'smart_mansion', name: '智能豪宅', cost: 16.1, fame: 5, trust: 1, socialTag: '豪宅' },
  { id: 'private_island_home', name: '私人岛屿住宅', cost: 38.0, fame: 9, trust: -2, socialTag: '豪宅' },
  { id: 'sports_sedan', name: '高性能轿跑', cost: 2.9, fame: 2, trust: 0, socialTag: '跑车' },
  { id: 'muscle_car', name: '经典肌肉车', cost: 2.1, fame: 1, trust: 0, socialTag: '跑车' },
  { id: 'sports_car', name: '性能跑车', cost: 4.2, fame: 3, trust: -1, socialTag: '跑车' },
  { id: 'luxury_suv', name: '旗舰豪华SUV', cost: 3.8, fame: 2, trust: 0, socialTag: '座驾' },
  { id: 'electric_supercar', name: '电动超跑', cost: 7.6, fame: 4, trust: -1, socialTag: '超跑' },
  { id: 'hyper_car', name: '限量超跑', cost: 12.8, fame: 5, trust: -2, socialTag: '超跑' },
  { id: 'collector_racecar', name: '收藏级赛车', cost: 10.9, fame: 5, trust: -1, socialTag: '超跑' },
  { id: 'offroad_beast', name: '极限越野车', cost: 5.7, fame: 3, trust: 0, socialTag: '座驾' },
  { id: 'armored_limo', name: '防弹礼宾车', cost: 6.4, fame: 3, trust: -1, socialTag: '座驾' },
  { id: 'vintage_collection', name: '复古名车收藏', cost: 9.5, fame: 4, trust: 0, socialTag: '跑车' },
  { id: 'lux_watch', name: '限量名表', cost: 2.6, fame: 2, trust: 0, socialTag: '奢侈品' },
  { id: 'diamond_watch', name: '镶钻腕表', cost: 4.1, fame: 3, trust: -1, socialTag: '奢侈品' },
  { id: 'haute_couture', name: '高定西装套装', cost: 1.4, fame: 1, trust: 0, socialTag: '奢侈品' },
  { id: 'jewelry_set', name: '高珠套装', cost: 6.7, fame: 4, trust: -1, socialTag: '奢侈品' },
  { id: 'art_collection', name: '现代艺术收藏', cost: 8.9, fame: 4, trust: 1, socialTag: '收藏' },
  { id: 'rare_wine_cellar', name: '珍藏酒窖', cost: 3.3, fame: 2, trust: 0, socialTag: '奢侈品' },
  { id: 'private_yacht', name: '私人游艇', cost: 21.0, fame: 7, trust: -2, socialTag: '游艇' },
  { id: 'mega_yacht', name: '超级游艇', cost: 44.0, fame: 10, trust: -3, socialTag: '游艇' },
  { id: 'private_jet', name: '私人飞机', cost: 32.0, fame: 8, trust: -3, socialTag: '私人飞机' },
  { id: 'charity_fund', name: '公益基金会', cost: 6.0, fame: 3, trust: 3, socialTag: '公益' }
];
const FACILITY_MARKET = [
  { id: 'private_gym', name: '私人球馆', cost: 9.8, fame: 2, trust: 1, socialTag: '设施', restBonus: 1, xpMult: 1.04, marketScoreBonus: 4, socialHeatMult: 1.05, momentum: 6 },
  { id: 'recovery_lab', name: '恢复实验室', cost: 7.4, fame: 1, trust: 2, socialTag: '设施', restBonus: 2, gameBonus: 1, injuryMult: 0.95, injuryDaysMult: 0.93, momentum: 5 },
  { id: 'film_room', name: '数据分析室', cost: 6.2, fame: 1, trust: 1, socialTag: '数据服务', xpMult: 1.03, prepBonus: 3, marketScoreBonus: 5, momentum: 4 },
  { id: 'content_studio', name: '个人内容工作室', cost: 8.9, fame: 3, trust: 0, socialTag: '媒体包装', posRepMult: 1.08, socialHeatMult: 1.12, marketScoreBonus: 6, momentum: 8 }
];
const FAME_PRIVILEGE_TIERS = [
  { level: 0, minScore: 0, label: '新秀观察', scoreBonus: 0, socialHeatMult: 1, eventChance: 0.02, activeCapBonus: 0, offerMult: 1, incomeMult: 1, perks: ['只开放基础品牌与本地活动'] },
  { level: 1, minScore: 34, label: '本地热度', scoreBonus: 3, socialHeatMult: 1.04, eventChance: 0.035, activeCapBonus: 0, offerMult: 1.02, incomeMult: 1.01, perks: ['开始进入城市活动池', '社媒热度略有放大'] },
  { level: 2, minScore: 58, label: '全国讨论', scoreBonus: 6, socialHeatMult: 1.09, eventChance: 0.05, activeCapBonus: 1, offerMult: 1.04, incomeMult: 1.03, perks: ['更高规格品牌开始主动接触', '可并行处理更多代言'] },
  { level: 3, minScore: 82, label: '品牌宠儿', scoreBonus: 10, socialHeatMult: 1.15, eventChance: 0.07, activeCapBonus: 1, offerMult: 1.07, incomeMult: 1.05, perks: ['综艺、专访、封面拍摄开始常驻', '高消费更容易转成舆论热度'] },
  { level: 4, minScore: 106, label: '城市门面', scoreBonus: 14, socialHeatMult: 1.22, eventChance: 0.095, activeCapBonus: 2, offerMult: 1.1, incomeMult: 1.08, perks: ['城市宣传和公益活动大幅增多', '顶级品牌报价明显抬升'] },
  { level: 5, minScore: 130, label: '联盟门面', scoreBonus: 18, socialHeatMult: 1.3, eventChance: 0.12, activeCapBonus: 2, offerMult: 1.14, incomeMult: 1.12, perks: ['门面级品牌与纪录片事件解锁', '推文和商业曝光会被显著放大'] }
];
function escapeSvgText(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
function hashStringToHue(seed) {
  let h = 0;
  const src = String(seed || 'nba');
  for (let i = 0; i < src.length; i++) {
    h = (h * 31 + src.charCodeAt(i)) >>> 0;
  }
  return h % 360;
}
function makeSvgDataUri(svg) {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}
function buildArtPalette(seed, shift = 0) {
  const hue = (hashStringToHue(seed) + shift) % 360;
  const hue2 = (hue + 34) % 360;
  return [
    `hsl(${hue} 82% 54%)`,
    `hsl(${hue2} 76% 46%)`,
    `hsl(${(hue + 180) % 360} 58% 18%)`,
    `hsl(${(hue2 + 180) % 360} 42% 14%)`
  ];
}
function getEndorsementIcon(kind = 'gear') {
  const map = {
    gear: '鞋',
    drink: '饮',
    food: '食',
    tech: '电',
    auto: '车',
    finance: '财',
    fashion: '潮',
    beauty: '美',
    game: '游',
    public: '益',
    city: '城'
  };
  return map[String(kind || '').toLowerCase()] || '牌';
}
function getLuxuryIcon(tag = '') {
  const src = String(tag || '').trim();
  if (src.includes('房')) return '宅';
  if (src.includes('座驾') || src.includes('车')) return '车';
  if (src.includes('游艇')) return '艇';
  if (src.includes('飞机')) return '机';
  if (src.includes('收藏')) return '藏';
  if (src.includes('公益')) return '善';
  return '奢';
}
function buildCommercialArt({
  title = '',
  subtitle = '',
  badge = '',
  icon = '牌',
  seed = '',
  accent = '',
  accent2 = '',
  footer = '',
  tone = 'neutral'
} = {}) {
  const [c1, c2, c3, c4] = accent ? [accent, accent2 || accent, '#10131f', '#08101a'] : buildArtPalette(seed);
  const toneGlow = tone === 'positive' ? 0.75 : (tone === 'negative' ? 0.35 : 0.55);
  const titleText = escapeSvgText(title).slice(0, 26);
  const subtitleText = escapeSvgText(subtitle).slice(0, 36);
  const badgeText = escapeSvgText(badge).slice(0, 18);
  const footerText = escapeSvgText(footer).slice(0, 32);
  const iconText = escapeSvgText(icon).slice(0, 4);
  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 640" role="img" aria-label="${titleText}">
    <defs>
      <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0%" stop-color="${c1}" />
        <stop offset="55%" stop-color="${c2}" />
        <stop offset="100%" stop-color="${c3}" />
      </linearGradient>
      <linearGradient id="glow" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0%" stop-color="${c1}" stop-opacity="${toneGlow}" />
        <stop offset="100%" stop-color="${c4}" stop-opacity=".12" />
      </linearGradient>
      <radialGradient id="orb" cx="35%" cy="25%" r="70%">
        <stop offset="0%" stop-color="#fff" stop-opacity=".18" />
        <stop offset="100%" stop-color="#fff" stop-opacity="0" />
      </radialGradient>
    </defs>
    <rect width="960" height="640" rx="48" fill="url(#bg)" />
    <circle cx="150" cy="120" r="220" fill="url(#orb)" />
    <circle cx="820" cy="130" r="180" fill="url(#orb)" />
    <rect x="52" y="52" width="856" height="536" rx="34" fill="url(#glow)" stroke="rgba(255,255,255,.18)" stroke-width="2" />
    <circle cx="160" cy="326" r="122" fill="rgba(0,0,0,.18)" stroke="rgba(255,255,255,.26)" stroke-width="3" />
    <text x="160" y="360" text-anchor="middle" font-size="116" font-family="Arial, 'PingFang SC', 'Microsoft YaHei', sans-serif" font-weight="900" fill="#fff">${iconText}</text>
    <text x="348" y="200" font-size="34" fill="rgba(255,255,255,.78)" font-family="Arial, 'PingFang SC', 'Microsoft YaHei', sans-serif">${badgeText}</text>
    <text x="348" y="282" font-size="68" fill="#fff" font-family="Arial, 'PingFang SC', 'Microsoft YaHei', sans-serif" font-weight="900">${titleText}</text>
    <text x="348" y="338" font-size="30" fill="rgba(255,255,255,.88)" font-family="Arial, 'PingFang SC', 'Microsoft YaHei', sans-serif">${subtitleText}</text>
    <text x="348" y="414" font-size="24" fill="rgba(255,255,255,.68)" font-family="Arial, 'PingFang SC', 'Microsoft YaHei', sans-serif">${footerText}</text>
    <rect x="342" y="448" width="260" height="12" rx="6" fill="rgba(255,255,255,.28)" />
    <rect x="342" y="448" width="182" height="12" rx="6" fill="#fff" />
    <path d="M690 178 C760 196, 818 250, 830 322" fill="none" stroke="rgba(255,255,255,.24)" stroke-width="10" stroke-linecap="round" />
    <path d="M710 170 C784 202, 834 258, 850 330" fill="none" stroke="rgba(255,255,255,.16)" stroke-width="4" stroke-linecap="round" />
  </svg>`;
  return makeSvgDataUri(svg.trim());
}
function buildEndorsementImage(template) {
  const kind = String(template?.kind || template?.categoryKey || 'gear');
  const palette = {
    gear: ['#37a6ff', '#1154bf'],
    food: ['#ff8d3a', '#f43f5e'],
    tech: ['#00d4ff', '#7c3aed'],
    auto: ['#ef4444', '#f59e0b'],
    finance: ['#22c55e', '#0f766e'],
    fashion: ['#f97316', '#8b5cf6'],
    beauty: ['#ec4899', '#a855f7'],
    game: ['#22c55e', '#00d4ff'],
    public: ['#14b8a6', '#22c55e'],
    city: ['#f59e0b', '#2563eb']
  }[String(template?.categoryKey || '').toLowerCase()] || buildArtPalette(template?.brand || kind);
  return buildCommercialArt({
    title: `${template?.brand || '品牌'} ${template?.product || ''}`.trim(),
    subtitle: String(template?.category || template?.categoryLabel || template?.categoryKey || ''),
    badge: `${String(template?.tier || 1)} 星代言${template?.shoeEligible ? ' · 鞋类' : ''}`,
    icon: getEndorsementIcon(kind),
    seed: `${template?.brand || ''}_${template?.product || ''}_${template?.categoryKey || ''}`,
    accent: palette[0],
    accent2: palette[1],
    footer: template?.shoeEligible ? '可打造签名鞋并叠加持续分成' : '签约后即可获得日常与比赛日收益',
    tone: 'positive'
  });
}
function buildLuxuryImage(item) {
  const tag = String(item?.socialTag || '').trim();
  const palette = {
    房产: ['#7c3aed', '#2563eb'],
    豪宅: ['#f59e0b', '#f97316'],
    座驾: ['#ef4444', '#fb7185'],
    奢侈品: ['#8b5cf6', '#ec4899'],
    收藏: ['#14b8a6', '#0ea5e9'],
    游艇: ['#06b6d4', '#2563eb'],
    私人飞机: ['#f59e0b', '#3b82f6'],
    公益: ['#22c55e', '#16a34a']
  }[tag] || buildArtPalette(item?.name || tag);
  return buildCommercialArt({
    title: String(item?.name || '奢侈品'),
    subtitle: `${tag || '高端资产'} · $${parseNum(item?.cost, 0).toFixed(1)}M`,
    badge: `${item?.fame >= 0 ? '+' : ''}${parseNum(item?.fame, 0)} 声望 · ${item?.trust >= 0 ? '+' : ''}${parseNum(item?.trust, 0)} 信任`,
    icon: getLuxuryIcon(tag),
    seed: `${item?.id || ''}_${item?.name || ''}`,
    accent: palette[0],
    accent2: palette[1],
    footer: '购买后会直接写入商业动态与手机推文',
    tone: parseNum(item?.trust, 0) < 0 ? 'negative' : 'positive'
  });
}
function summarizeCommercialEvents(events = [], limit = 4) {
  return (Array.isArray(events) ? events : [])
    .slice(0, Math.max(1, parseNum(limit, 4)))
    .map(evt => {
      const head = String(evt?.displayLabel || evt?.label || evt?.brand || '商业动态').trim();
      const detail = String(evt?.detail || '').trim();
      return detail ? `${head}（${detail}）` : head;
    })
    .filter(Boolean);
}
function buildCommercialBuzzText(event) {
  const evt = event || {};
  const playerName = String(evt.playerName || G.player?.name || '球员');
  const label = String(evt.displayLabel || evt.label || evt.brand || '商业动态').trim();
  const category = String(evt.tag || evt.category || '商业').trim();
  const detail = String(evt.detail || '').trim();
  switch (String(evt.type || 'purchase')) {
    case 'endorsement_sign':
      return `${playerName}和${label}正式牵手，${category}代言落袋，商业版图又往外扩了一圈。${detail ? ` ${detail}` : ''}`.trim();
    case 'endorsement_reject':
      return `${playerName}婉拒了${label}的邀约，球迷已经开始讨论下一份更大的合约了。${detail ? ` ${detail}` : ''}`.trim();
    case 'signature_shoe':
      return `${playerName}把${label}做成了签名鞋，属性和分成一起到位，球鞋圈今天有新话题了。${detail ? ` ${detail}` : ''}`.trim();
    case 'coach_upgrade':
      return `${playerName}的新团队配置到位，${label}上线后，训练和恢复都更稳了。${detail ? ` ${detail}` : ''}`.trim();
    case 'facility_upgrade':
      return `${playerName}把${label}配齐了，个人训练和恢复条件直接升档。${detail ? ` ${detail}` : ''}`.trim();
    case 'luxury_purchase':
      return `${playerName}刚入手${label}，${category}热度直接被拉起来。${detail ? ` ${detail}` : ''}`.trim();
    case 'media_event':
      return `${playerName}拿到一档更高规格的曝光：${label}。${detail ? ` ${detail}` : ''}`.trim();
    case 'brand_interest':
      return `${label}开始主动接触${playerName}，商业风向已经明显升温。${detail ? ` ${detail}` : ''}`.trim();
    default:
      return `${playerName}又完成了一笔${category}相关采购：${label}。${detail ? ` ${detail}` : ''}`.trim();
  }
}
function createCommercialBuzzPost(event, { day = Math.max(0, G.dayNum - 1), season = G.season, year = G.year } = {}) {
  const evt = event || {};
  const score = parseNum(evt.fame, 0) + parseNum(evt.trust, 0);
  const ecoFx = typeof getEconomyEffects === 'function' ? getEconomyEffects() : { socialHeatMult: 1 };
  const heatMult = clamp(parseNum(ecoFx?.socialHeatMult, 1), 0.9, 1.6);
  const tone = score >= 2 ? 'positive' : (score <= -2 ? 'negative' : 'neutral');
  const personaKey = String(evt.type || 'purchase') === 'endorsement_sign'
    ? 'news'
    : String(evt.type || 'purchase') === 'signature_shoe'
      ? 'data'
      : String(evt.type || 'purchase') === 'coach_upgrade'
        ? 'tactical'
        : String(evt.type || 'purchase') === 'facility_upgrade'
          ? 'tactical'
          : String(evt.type || 'purchase') === 'brand_interest'
            ? 'news'
        : (String(evt.tag || '').includes('公益') ? 'neutral' : 'casual');
  const text = buildCommercialBuzzText(evt);
  return {
    day,
    season,
    year,
    author: personaHandle(personaKey),
    persona: SOCIAL_PERSONAS[personaKey]?.type || SOCIAL_PERSONAS.neutral.type,
    tone,
    text,
    image: String(evt.image || '').trim(),
    likes: clamp(Math.round((110 + Math.max(0, score * 22) + rng(20, 180)) * heatMult), 20, 9999),
    reposts: clamp(Math.round((18 + Math.max(0, score * 4) + rng(5, 70)) * clamp(0.92 + heatMult * 0.2, 1, 1.45)), 5, 9999),
    comments: makeFallbackComments(text, tone === 'negative' ? 'negative' : (tone === 'positive' ? 'positive' : 'neutral'), 3)
  };
}
function getRecentCommercialEvents(limit = 5) {
  ensureSocialState();
  return [...(G.social.commercialEvents || [])].slice(0, Math.max(1, parseNum(limit, 5)));
}
function recordCommercialEvent(event) {
  ensureSocialState();
  if (!event || typeof event !== 'object') return null;
  G.social.commercialEvents.unshift(event);
  if (G.social.commercialEvents.length > 30) G.social.commercialEvents.pop();
  return event;
}
function appendSocialPost(post) {
  ensureSocialState();
  if (!post || typeof post !== 'object') return null;
  const next = {
    ...post,
    id: Number.isFinite(parseNum(post.id, NaN)) ? parseNum(post.id, 0) : G.social.nextPostId++,
    ts: parseNum(post.ts, Date.now()),
    day: parseNum(post.day, Math.max(0, G.dayNum - 1)),
    season: parseNum(post.season, G.season),
    year: parseNum(post.year, G.year)
  };
  G.social.posts.unshift(next);
  if (G.social.posts.length > 200) G.social.posts.length = 200;
  if (typeof updateHeader === 'function') updateHeader();
  if (typeof renderPhone === 'function' && $('phonePage')?.classList.contains('active')) renderPhone();
  return next;
}
function inferCommercialEventType(tag, fallback = 'purchase') {
  const raw = String(tag || '').toLowerCase();
  if (raw.includes('代言')) return 'endorsement_sign';
  if (raw.includes('签名鞋') || raw.includes('球鞋')) return 'signature_shoe';
  if (raw.includes('训练')) return 'coach_upgrade';
  if (raw.includes('设施') || raw.includes('球馆') || raw.includes('实验室') || raw.includes('工作室')) return 'facility_upgrade';
  if (raw.includes('采访') || raw.includes('曝光') || raw.includes('综艺') || raw.includes('封面')) return 'media_event';
  if (raw.includes('主动接触') || raw.includes('试探') || raw.includes('品牌邀约')) return 'brand_interest';
  if (raw.includes('车') || raw.includes('座驾') || raw.includes('豪宅') || raw.includes('房') || raw.includes('游艇') || raw.includes('飞机') || raw.includes('收藏') || raw.includes('公益') || raw.includes('奢')) {
    return 'luxury_purchase';
  }
  return fallback;
}
function normalizeCommercialEvent(label, tag = '消费', meta = {}) {
  const src = label && typeof label === 'object'
    ? { ...label, ...meta }
    : { ...meta, label, tag };
  const eventType = inferCommercialEventType(src.type || src.tag || tag, 'purchase');
  const brand = String(src.brand || '').trim();
  const product = String(src.product || '').trim();
  const displayLabel = String(src.displayLabel || src.label || [brand, product].filter(Boolean).join(' · ') || tag || '商业动态').trim();
  const detail = String(src.detail || '').trim();
  return {
    type: eventType,
    label: String(src.label || displayLabel).trim(),
    displayLabel,
    tag: String(src.tag || tag || '').trim(),
    category: String(src.category || src.tag || tag || '').trim(),
    brand,
    product,
    detail,
    fame: parseNum(src.fame, 0),
    trust: parseNum(src.trust, 0),
    kind: String(src.kind || '').trim(),
    image: String(src.image || '').trim(),
    playerName: String(src.playerName || G.player?.name || '球员').trim(),
    teamName: String(src.teamName || G.team?.z || '').trim(),
    teamAbbr: String(src.teamAbbr || G.team?.a || '').trim(),
    day: parseNum(src.day, Math.max(0, G.dayNum - 1)),
    season: parseNum(src.season, G.season),
    year: parseNum(src.year, G.year),
    ts: parseNum(src.ts, Date.now()),
    posted: !!src.posted
  };
}
const ENDORSEMENT_SINGLE_SLOT_CATEGORIES = new Set(['food', 'auto']);
const SOCIAL_PERSONAS = {
  news: {
    type: '新闻型',
    handles: ['@赛场快报', '@篮球前线', '@联盟观察台', '@晚间体育讯']
  },
  fan: {
    type: '粉丝型',
    handles: ['@真爱球迷阿哲', '@主场北看台', '@湖区老粉', '@少年球迷团']
  },
  hater: {
    type: '黑子型',
    handles: ['@键盘评球', '@毒舌看台', '@杠精联盟', '@反向预测王', '@黑出感情了', '@专业拆台30年']
  },
  neutral: {
    type: '中立型',
    handles: ['@路人看球', '@篮球观察员', '@客观派', '@半场分析']
  },
  data: {
    type: '数据流',
    handles: ['@数据实验室', '@高阶统计师', '@效率模型', '@战术热图']
  },
  gambler: {
    type: '串子型',
    handles: ['@今晚稳赢', '@篮球串子哥', '@盘口分析师', '@让分大师', '@昨晚又红了', '@稳胆推荐王']
  },
  youtuber: {
    type: '野生UP主',
    handles: ['@篮球老炮儿', '@深夜看球室', '@战术大湿', '@野球帝解说', '@三分钟看懂NBA', '@震惊体育圈']
  },
  hottake: {
    type: '热评型',
    handles: ['@锐评哥', '@暴论制造机', '@逆天发言合集', '@球评界泥石流', '@我说的都对']
  },
  casual: {
    type: '吃瓜型',
    handles: ['@刚看NBA三天', '@女朋友让我看球', '@隔壁老王聊球', '@上班摸鱼看比分', '@啥也不懂但我爱看']
  },
  hupu_toxic: {
    type: '虎扑毒舌',
    handles: ['@步行街扛把子', '@虎扑JR真话哥', '@只说实话不怕喷', '@虎扑鉴球大师', '@直播间毒奶王', '@评分只给59']
  },
  oldhead: {
    type: '老球迷',
    handles: ['@看球20年老炮', '@乔丹时代过来人', '@科比门徒', '@老派篮球信徒', '@当年的禅师']
  },
  tactical: {
    type: '战术分析',
    handles: ['@挡拆实验室', '@半场战术板', '@防守端观察', '@转换进攻研究所', '@回合效率分析']
  },
  emotional: {
    type: '情绪球迷',
    handles: ['@看球气到住院', '@赢球就封神输球就交易', '@心态已崩', '@又在骂教练了', '@血压已经220了']
  }
};
function personaHandle(personaKey) {
  const key = String(personaKey || 'neutral').toLowerCase();
  const persona = SOCIAL_PERSONAS[key] || SOCIAL_PERSONAS.neutral || { handles: ['@线上看球'] };
  const handles = Array.isArray(persona.handles) ? persona.handles.filter(Boolean) : [];
  return handles.length ? handles[0] : '@线上看球';
}
const SOCIAL_COMMENTERS = [
  '@篮圈路人', '@冷静分析', '@主队铁粉', '@客队球迷', '@数字派',
  '@看热闹不嫌事大', '@理性发言', '@今日话题', '@吃瓜群众甲',
  '@懂球帝本帝', '@评论区战神', '@我就看看不说话', '@杠就完了',
  '@前排出售瓜子', '@这也能吵起来', '@纯路人不站队',
  '@虎扑步行街来的', '@JR代表发言', '@球盲鉴定完毕', '@反转了家人们',
  '@教练下课吧求你了', '@这球我能吹一年', '@防守端看哭了',
  '@选秀眼光帝', '@伤病满员出发', '@替补席观察员', '@垃圾时间之王',
  '@赛后复盘师', '@更衣室消息灵通人士', '@技术统计狂魔'
];

function makeFallbackComments(text, tone = 'neutral', count = 3) {
  const safeCount = Math.max(0, Math.floor(parseNum(count, 3)));
  const source = String(text || '').trim();
  const seed = source.length + source.split(/\s+/).length * 7;
  const positiveTexts = ['这波可以', '牌面拉满', '有点强', '这合同值了', '稳'];
  const negativeTexts = ['这也太离谱', '先观望', '有点难评', '看看后续', '不太看好'];
  const neutralTexts = ['关注一下', '信息量不少', '继续看', '这条挺关键', '等后续'];
  const textPool = tone === 'positive' ? positiveTexts : (tone === 'negative' ? negativeTexts : neutralTexts);
  const comments = [];
  for (let i = 0; i < safeCount; i++) {
    const author = SOCIAL_COMMENTERS[(seed + i) % SOCIAL_COMMENTERS.length] || `@评论${i + 1}`;
    const textIndex = (seed * 3 + i) % textPool.length;
    comments.push({
      author,
      text: textPool[textIndex],
      likes: clamp(rng(1, tone === 'positive' ? 88 : 48), 1, 9999)
    });
  }
  return comments;
}

const SOCIAL_LINK_STATUS = {
  rival: { id: 'rival', label: '宿敌', badgeClass: 'b-purple', priority: 4 },
  friend: { id: 'friend', label: '朋友', badgeClass: 'b-gold', priority: 3 },
  respect: { id: 'respect', label: '尊重', badgeClass: 'b-pri', priority: 2 },
  tense: { id: 'tense', label: '竞争', badgeClass: 'b-silver', priority: 1 },
  neutral: { id: 'neutral', label: '普通', badgeClass: '', priority: 0 }
};
function socialPlayerRefKey(teamId, playerId, isSelf = false, name = '') {
  if (isSelf) return 'USER_SELF';
  const tid = parseNum(teamId, 0);
  const pid = String(playerId ?? '').trim();
  if (tid > 0 && pid) return `${tid}_${pid}`;
  const nk = nameKey(name);
  return nk ? `name:${nk}` : '';
}
function buildStarHandleFromName(name = '', teamAbbr = '') {
  const base = String(name || '').trim().replace(/\s+/g, '');
  const clean = base.replace(/[^\p{L}\p{N}_]+/gu, '');
  if (!clean) return '@联盟球星';
  const suffixPool = ['Hoops', 'Tape', 'Talk', 'Live', String(teamAbbr || '').trim()].filter(Boolean);
  const suffix = suffixPool[(clean.length + suffixPool.length) % suffixPool.length] || '';
  const hasAscii = /^[A-Za-z0-9_]+$/.test(clean);
  if (hasAscii) return `@${clean}${suffix}`;
  return `@${clean}`;
}
function buildSocialStarArchetype(row = {}) {
  const ppg = parseNum(row.ppg, 0);
  const apg = parseNum(row.apg, 0);
  const rpg = parseNum(row.rpg, 0);
  const bpg = parseNum(row.bpg, 0);
  const spg = parseNum(row.spg, 0);
  const pos = parseNum(row.pos, 3);
  if (ppg >= 26) return pos <= 2 ? '外线得分手' : '锋线核心';
  if (apg >= 8) return '组织核心';
  if (rpg >= 11) return pos >= 4 ? '禁区支柱' : '篮板机器';
  if (bpg >= 2 || spg >= 2) return '防守尖兵';
  if (pos <= 2) return '后场球星';
  if (pos === 3) return '锋线主将';
  return '内线球星';
}
function buildSocialLeaguePlayerPool() {
  const pool = [];
  const leagueTeams = LEAGUE?.teams || {};
  Object.values(leagueTeams).forEach(teamObj => {
    const teamId = parseNum(teamObj?.meta?.id, 0);
    (teamObj?.players || []).forEach(player => {
      if (!player || String(player.id || '') === String(G.player?.id || '')) return;
      const key = leaguePlayerKey(teamId, player.id, false);
      const ps = G.leagueSeason?.playerStats?.[key] || {};
      const gp = Math.max(0, Math.floor(parseNum(ps.gp, 0)));
      const rating = parseNum(player.rating, ovr(player.attrs && Object.keys(player.attrs).length ? player.attrs : parsePlayerAttrs(player)));
      pool.push({
        key,
        teamId,
        playerId: player.id,
        name: String(player.name || ps.name || '球员').trim(),
        nameEn: String(player.nameEn || player.altName || '').trim(),
        pos: parseNum(player.pos, parseNum(ps.pos, 3)),
        rating,
        gp,
        ppg: gp > 0 ? +(parseNum(ps.pts, 0) / gp).toFixed(1) : 0,
        apg: gp > 0 ? +(parseNum(ps.ast, 0) / gp).toFixed(1) : 0,
        rpg: gp > 0 ? +(parseNum(ps.reb, 0) / gp).toFixed(1) : 0,
        spg: gp > 0 ? +(parseNum(ps.stl, 0) / gp).toFixed(1) : 0,
        bpg: gp > 0 ? +(parseNum(ps.blk, 0) / gp).toFixed(1) : 0,
        fgPct: gp > 0 ? +(parseNum(ps.fga, 0) > 0 ? parseNum(ps.fgm, 0) / Math.max(1, parseNum(ps.fga, 0)) * 100 : 0).toFixed(1) : 0
      });
    });
  });
  return pool;
}
function scoreSocialStarRow(row = {}) {
  const teamRecord = G.leagueSeason?.teamRecords?.[parseNum(row.teamId, 0)] || {};
  const gp = Math.max(0, parseNum(teamRecord.gp, 0));
  const winPct = gp > 0 ? parseNum(teamRecord.w, 0) / gp : 0.5;
  const samePosBonus = parseNum(row.pos, -1) === parseNum(G.player?.pos, -2) ? 6 : 0;
  return (
    parseNum(row.rating, 75) * 1.15 +
    parseNum(row.ppg, 0) * 3 +
    parseNum(row.apg, 0) * 2.2 +
    parseNum(row.rpg, 0) * 1.8 +
    parseNum(row.spg, 0) * 1.4 +
    parseNum(row.bpg, 0) * 1.4 +
    winPct * 14 +
    samePosBonus
  );
}
function ensureSocialStarProfile(row = {}) {
  ensureSocialState();
  const key = socialPlayerRefKey(row.teamId, row.playerId, false, row.name);
  if (!key) return null;
  if (!G.social.starProfiles[key] || typeof G.social.starProfiles[key] !== 'object') G.social.starProfiles[key] = {};
  const team = getTeam(parseNum(row.teamId, 0)) || {};
  const profile = G.social.starProfiles[key];
  profile.key = key;
  profile.playerId = row.playerId;
  profile.teamId = parseNum(row.teamId, 0);
  profile.name = String(row.name || profile.name || '球星').trim();
  profile.nameEn = String(row.nameEn || profile.nameEn || '').trim();
  profile.pos = parseNum(row.pos, profile.pos ?? 3);
  profile.rating = parseNum(row.rating, profile.rating ?? 75);
  profile.teamAbbr = String(team.a || profile.teamAbbr || '--').trim();
  profile.teamName = String(team.z || team.n || profile.teamName || '').trim();
  profile.handle = String(profile.handle || buildStarHandleFromName(profile.nameEn || profile.name, profile.teamAbbr)).trim();
  profile.archetype = String(profile.archetype || buildSocialStarArchetype(row)).trim();
  return profile;
}
function getSocialStarProfileByRef(ref = {}) {
  ensureSocialState();
  const key = String(ref.key || socialPlayerRefKey(ref.teamId, ref.playerId, !!ref.isSelf, ref.name)).trim();
  if (key && G.social.starProfiles?.[key]) return G.social.starProfiles[key];
  const pool = buildSocialLeaguePlayerPool();
  const matched = pool.find(row =>
    String(row.key) === key ||
    (String(ref.playerId || '') && String(row.playerId) === String(ref.playerId) && parseNum(row.teamId, 0) === parseNum(ref.teamId, 0)) ||
    (String(ref.name || '').trim() && String(row.name || '').trim() === String(ref.name || '').trim())
  );
  if (matched) return ensureSocialStarProfile(matched);
  if (!key) return null;
  return ensureSocialStarProfile({
    key,
    playerId: ref.playerId,
    teamId: parseNum(ref.teamId, 0),
    name: String(ref.name || '球星').trim(),
    pos: parseNum(ref.pos, 3),
    rating: parseNum(ref.rating, 80)
  });
}
function resolveSocialLinkStatus(link = null) {
  const affinity = clamp(parseNum(link?.affinity, 0), -100, 100);
  const respect = clamp(parseNum(link?.respect, 0), 0, 100);
  const heat = clamp(parseNum(link?.heat, 0), 0, 100);
  if (affinity <= -28 || (affinity <= -12 && heat >= 36)) return SOCIAL_LINK_STATUS.rival;
  if (affinity >= 30) return SOCIAL_LINK_STATUS.friend;
  if (respect >= 18) return SOCIAL_LINK_STATUS.respect;
  if (heat >= 18 || affinity <= -10) return SOCIAL_LINK_STATUS.tense;
  return SOCIAL_LINK_STATUS.neutral;
}
function syncPrimaryRivalFromSocialLinks() {
  ensureSocialState();
  const rivals = Object.values(G.social.playerLinks || {})
    .filter(link => resolveSocialLinkStatus(link).id === 'rival')
    .sort((a, b) => parseNum(b.heat, 0) - parseNum(a.heat, 0) || parseNum(a.affinity, 0) - parseNum(b.affinity, 0));
  G.player.rivalId = rivals.length ? parseNum(rivals[0].playerId, 0) : 0;
}
function applySocialPlayerLinkDelta(ref = {}, { affinityDelta = 0, respectDelta = 0, heatDelta = 0, source = '' } = {}) {
  ensureSocialState();
  const profile = getSocialStarProfileByRef(ref);
  if (!profile) return null;
  const key = String(profile.key || '').trim();
  if (!key) return null;
  if (!G.social.playerLinks[key] || typeof G.social.playerLinks[key] !== 'object') {
    G.social.playerLinks[key] = {
      key,
      playerId: profile.playerId,
      teamId: profile.teamId,
      name: profile.name,
      handle: profile.handle,
      pos: profile.pos,
      affinity: 0,
      respect: 0,
      heat: 0,
      interactions: 0,
      lastDay: -1,
      lastSource: ''
    };
  }
  const link = G.social.playerLinks[key];
  const oldStatus = resolveSocialLinkStatus(link);
  link.playerId = profile.playerId;
  link.teamId = profile.teamId;
  link.name = profile.name;
  link.handle = profile.handle;
  link.pos = profile.pos;
  link.teamAbbr = profile.teamAbbr;
  link.teamName = profile.teamName;
  link.affinity = clamp(parseNum(link.affinity, 0) + parseNum(affinityDelta, 0), -100, 100);
  link.respect = clamp(parseNum(link.respect, 0) + Math.max(0, parseNum(respectDelta, 0)), 0, 100);
  link.heat = clamp(parseNum(link.heat, 0) + Math.max(0, parseNum(heatDelta, 0)), 0, 100);
  link.interactions = parseNum(link.interactions, 0) + 1;
  link.lastDay = parseNum(G.dayNum, 0);
  link.lastSource = String(source || '').trim();
  const newStatus = resolveSocialLinkStatus(link);
  syncPrimaryRivalFromSocialLinks();
  if (oldStatus.id !== newStatus.id) {
    if (newStatus.id === 'friend') {
      addPhone('社媒关系', `${profile.name} 现在更愿意公开支持你了。你们的关系已升级为朋友。`, 'info');
      addNews(`🤝 ${profile.name} 与你的关系升温，已经公开站到你这边。`, 'pos');
    } else if (newStatus.id === 'rival') {
      addPhone('社媒关系', `${profile.name} 把你视为宿敌，后续对位会更有火药味。`, 'warn');
      addNews(`🔥 ${profile.name} 开始公开把你当成宿敌。`, 'neg');
    } else if (newStatus.id === 'respect') {
      addPhone('社媒关系', `${profile.name} 开始正面评价你，你在球星圈里拿到了一层尊重。`, 'info');
    }
  }
  return { link, profile, oldStatus, newStatus };
}
function getTrackedSocialRelationships(limit = 6) {
  ensureSocialState();
  return Object.values(G.social.playerLinks || {})
    .map(link => ({
      ...link,
      status: resolveSocialLinkStatus(link),
      profile: getSocialStarProfileByRef(link)
    }))
    .filter(link => link.status.id !== 'neutral' && link.profile)
    .sort((a, b) =>
      parseNum(b.status.priority, 0) - parseNum(a.status.priority, 0) ||
      Math.max(Math.abs(parseNum(b.affinity, 0)), parseNum(b.respect, 0), parseNum(b.heat, 0)) -
      Math.max(Math.abs(parseNum(a.affinity, 0)), parseNum(a.respect, 0), parseNum(a.heat, 0))
    )
    .slice(0, Math.max(1, parseNum(limit, 6)));
}
function buildSocialRelationshipFeedView(limit = 4) {
  const all = getTrackedSocialRelationships(32);
  const list = all.slice(0, Math.max(1, parseNum(limit, 4)));
  return {
    list,
    friendCount: all.filter(item => item.status.id === 'friend').length,
    rivalCount: all.filter(item => item.status.id === 'rival').length,
    respectCount: all.filter(item => item.status.id === 'respect').length
  };
}
function getSocialRelationshipBadgeForPost(post = {}) {
  const key = String(post.playerRefKey || '').trim();
  if (!key || !G.social?.playerLinks?.[key]) return null;
  const status = resolveSocialLinkStatus(G.social.playerLinks[key]);
  return status.id === 'neutral' ? null : status;
}
function appendPlayerStatementLog(entry = {}) {
  ensureSocialState();
  G.social.playerStatementLog.unshift({
    day: parseNum(entry.day, G.dayNum),
    season: parseNum(entry.season, G.season),
    title: String(entry.title || '社媒发言').trim(),
    type: String(entry.type || 'social').trim(),
    text: cleanSocialText(entry.text || ''),
    choiceId: String(entry.choiceId || '').trim(),
    analysisText: String(entry.analysisText || '').trim(),
    ts: parseNum(entry.ts, Date.now())
  });
  if (G.social.playerStatementLog.length > 12) G.social.playerStatementLog.length = 12;
}
function analyzePlayerSocialText(text = '', { targetPost = null, mode = 'post' } = {}) {
  const raw = normalizeFreeTextResponse(text);
  const lower = raw.toLowerCase();
  const countAny = (list = []) => list.reduce((sum, token) => sum + ((raw.includes(token) || lower.includes(String(token).toLowerCase())) ? 1 : 0), 0);
  const praise = countAny(['respect', '佩服', '牛', '厉害', '欣赏', '兄弟', '喜欢看', '致敬', '支持', '合作', '一起', '谢谢']);
  const toxic = countAny(['垃圾', '软', '碰瓷', '水货', '闭嘴', '别装', '刷子', '废', '滚', '算了吧', '锁死', '打爆你']);
  const competitive = countAny(['下次见', '下一场', '对位', '碰面', '点名', '记住', '等着', '较量', '单挑', 'battle']);
  const humble = countAny(['团队', '球队', '我们', '赢球', '防守', '执行', '比赛', '继续努力', '学习']);
  const selfPromo = countAny(['我是', '我会', '该轮到我', '该我', '证明', '别忽视我', '我就是']);
  let relationAffinity = 0;
  let relationRespect = 0;
  let relationHeat = 0;
  let fame = 0;
  let trust = 0;
  let label = '普通互动';
  let tone = 'neutral';
  if (toxic >= Math.max(1, praise) || (competitive >= 2 && praise === 0 && humble === 0)) {
    relationAffinity = -12 - Math.max(0, toxic - 1) * 3;
    relationRespect = competitive > 0 ? 4 : 1;
    relationHeat = 12 + competitive * 4 + toxic * 2;
    fame = 1;
    trust = toxic >= 2 ? -2 : -1;
    label = mode === 'reply' ? '火药味上升' : '公开挑衅';
    tone = competitive > 0 ? 'competitive' : 'negative';
  } else if (praise >= 1 || humble >= 2) {
    relationAffinity = 10 + praise * 2;
    relationRespect = 8 + humble * 2 + praise;
    fame = 1;
    trust = 1;
    label = mode === 'reply' ? '关系回暖' : '职业发言';
    tone = 'positive';
  } else if (competitive >= 1) {
    relationAffinity = -4 - Math.max(0, competitive - 1) * 2;
    relationRespect = 7 + competitive * 2;
    relationHeat = 10 + competitive * 3;
    fame = 1;
    label = '形成对位话题';
    tone = 'competitive';
  } else if (selfPromo >= 2) {
    fame = 1;
    trust = -1;
    relationAffinity = -3;
    relationRespect = 2;
    relationHeat = 4;
    label = '个人锋芒外露';
  }
  if (targetPost?.authorType === 'star' && mode === 'reply' && !relationAffinity && !relationRespect && !relationHeat) {
    relationAffinity = 3;
    relationRespect = 4;
    label = '被球星注意到';
  }
  return { label, tone, fame, trust, relationAffinity, relationRespect, relationHeat, raw };
}
function findMentionedSocialStars(text = '', limit = 2) {
  const raw = normalizeFreeTextResponse(text);
  const lower = raw.toLowerCase();
  const pool = [
    ...getTrackedSocialRelationships(8).map(item => item.profile).filter(Boolean),
    ...buildSocialLeaguePlayerPool().sort((a, b) => scoreSocialStarRow(b) - scoreSocialStarRow(a)).slice(0, 18).map(row => ensureSocialStarProfile(row)).filter(Boolean)
  ];
  const seen = new Set();
  const matched = [];
  pool.forEach(profile => {
    const key = String(profile?.key || '').trim();
    if (!key || seen.has(key)) return;
    const tokens = [
      String(profile.name || '').trim(),
      String(profile.nameEn || '').trim(),
      String(profile.handle || '').trim()
    ].filter(Boolean);
    if (tokens.some(token => raw.includes(token) || lower.includes(token.toLowerCase()))) {
      seen.add(key);
      matched.push(profile);
    }
  });
  return matched.slice(0, Math.max(1, parseNum(limit, 2)));
}
function buildStarTweetCandidates(dayResult = {}, count = 2) {
  const pool = buildSocialLeaguePlayerPool().sort((a, b) => scoreSocialStarRow(b) - scoreSocialStarRow(a));
  const relationRows = getTrackedSocialRelationships(8);
  const picked = [];
  const used = new Set();
  const pushProfile = (profile, topic) => {
    const safe = getSocialStarProfileByRef(profile);
    const key = String(safe?.key || '').trim();
    if (!safe || !key || used.has(key)) return;
    used.add(key);
    picked.push({ profile: safe, topic });
  };
  if (dayResult?.isGame && parseNum(dayResult?.gameResult?.opp, 0) > 0) {
    const oppStar = pool.find(row => parseNum(row.teamId, 0) === parseNum(dayResult.gameResult.opp, 0));
    if (oppStar) pushProfile(oppStar, 'opponent');
  }
  const topRival = relationRows.find(item => item.status.id === 'rival');
  if (topRival) pushProfile(topRival.profile, 'rival');
  const topFriend = relationRows.find(item => item.status.id === 'friend');
  if (topFriend && Math.random() < 0.72) pushProfile(topFriend.profile, 'friend');
  const samePosStar = pool.find(row => parseNum(row.pos, -1) === parseNum(G.player?.pos, -2));
  if (samePosStar) pushProfile(samePosStar, 'same_pos');
  for (const row of pool) {
    if (picked.length >= Math.max(1, parseNum(count, 2))) break;
    pushProfile(row, 'league');
  }
  return picked.slice(0, Math.max(1, parseNum(count, 2)));
}
function buildStarTweetPayload(profile, relationInfo, dayResult = {}, topic = 'league') {
  const playerName = G.player?.name || '球员';
  const gr = dayResult?.gameResult || {};
  const userPts = parseNum(gr?.st?.pts, 0);
  const userStrong = userPts >= 24 || ['S+', 'S', 'A'].includes(String(gr?.grade || '').trim());
  const samePos = parseNum(profile?.pos, -1) === parseNum(G.player?.pos, -2);
  let text = '';
  let tone = 'neutral';
  let affinityDelta = 0;
  let respectDelta = 0;
  let heatDelta = 0;
  if (dayResult?.isGame) {
    if (topic === 'rival' || relationInfo.id === 'rival') {
      text = userStrong
        ? `${playerName}今晚打得像样，但别急着上头。下次对位我会把这笔账收回来。`
        : `${playerName}这场还没到能跟我对线的级别，下一次碰面我会继续给压力。`;
      tone = 'negative';
      affinityDelta = -2;
      respectDelta = userStrong ? 1 : 0;
      heatDelta = 4;
    } else if (topic === 'friend' || relationInfo.id === 'friend') {
      text = userStrong
        ? `${playerName}今晚这场真够硬，细节都在线。继续打，联盟很快会把他放进更高一档的讨论。`
        : `${playerName}今晚手感一般，但比赛感觉没问题。年轻人都会经历这种夜晚，继续干。`;
      tone = 'positive';
      affinityDelta = 2;
      respectDelta = 2;
    } else if (topic === 'opponent' || samePos) {
      text = userStrong
        ? `最近总有人拿我和${playerName}做比较。挺好，联盟就该有这种对位。下次见会更热闹。`
        : `${playerName}今晚的节奏不错，但联盟会一直逼你补细节。下次见再聊。`;
      tone = userStrong ? 'competitive' : 'neutral';
      affinityDelta = userStrong ? -1 : 0;
      respectDelta = 1;
      heatDelta = userStrong ? 2 : 1;
    } else {
      text = `${playerName}今天的侵略性不错。能把这种强度稳定一个月，再往更高的位置冲。`;
      tone = 'positive';
      affinityDelta = 1;
      respectDelta = 1;
    }
  } else {
    if (topic === 'rival' || relationInfo.id === 'rival') {
      text = `${playerName}最近热度挺高。没关系，等真正对位的时候我会把话题拉回球场。`;
      tone = 'competitive';
      affinityDelta = -2;
      respectDelta = 1;
      heatDelta = 3;
    } else if (topic === 'friend' || relationInfo.id === 'friend') {
      text = `训练馆又碰到${playerName}加练了。别只看比赛，真下功夫的人联盟里都知道。`;
      tone = 'positive';
      affinityDelta = 2;
      respectDelta = 2;
    } else if (samePos) {
      text = `最近总有人拿我和${playerName}比较。挺好，同位置之间本来就该互相逼着进步。`;
      tone = 'competitive';
      affinityDelta = -1;
      respectDelta = 2;
      heatDelta = 2;
    } else {
      text = `联盟里最近有几个年轻人窜得很快，${playerName}算一个。先把样本继续打大吧。`;
      tone = 'positive';
      affinityDelta = 1;
      respectDelta = 1;
    }
  }
  return {
    author: String(profile.handle || buildStarHandleFromName(profile.name, profile.teamAbbr)).trim(),
    persona: `${profile.archetype || '联盟球星'} · ${profile.teamAbbr || '--'}`,
    text,
    tone,
    likes: rng(120, 2200),
    reposts: rng(20, 260),
    comments: makeFallbackComments(text, tone, 2),
    authorType: 'star',
    mentionsPlayer: true,
    playerRefKey: profile.key,
    playerId: profile.playerId,
    teamId: profile.teamId,
    playerName: profile.name,
    affinityDelta,
    respectDelta,
    heatDelta
  };
}
function generateStarPlayerSocialPosts(dayResult, day, season, count = 2) {
  const candidates = buildStarTweetCandidates(dayResult, count);
  const added = [];
  candidates.forEach(item => {
    const relationLink = G.social?.playerLinks?.[String(item.profile?.key || '').trim()] || null;
    const payload = buildStarTweetPayload(item.profile, resolveSocialLinkStatus(relationLink), dayResult, item.topic);
    const post = appendSocialPost({
      ...payload,
      day,
      season,
      year: G.year
    });
    if (post) {
      added.push(post);
      applySocialPlayerLinkDelta(item.profile, {
        affinityDelta: parseNum(payload.affinityDelta, 0),
        respectDelta: parseNum(payload.respectDelta, 0),
        heatDelta: parseNum(payload.heatDelta, 0),
        source: '球星社媒发声'
      });
    }
  });
  return added;
}
function buildStarReplyComment(profile, relationInfo, impact, targetPost = null) {
  const playerName = G.player?.name || '你';
  if (impact.tone === 'negative') return `${playerName}，这话我记住了。到场上见。`;
  if (impact.tone === 'competitive') {
    return relationInfo.id === 'rival'
      ? `火药味可以，记得把这股劲带到下一次对位。`
      : `这才像联盟该有的味道，下一次碰面别躲。`;
  }
  if (impact.tone === 'positive') {
    return relationInfo.id === 'friend'
      ? `收到，继续保持。比赛里见真章，场下不用整那些虚的。`
      : `看到了，继续把比赛打硬。联盟会记住真正肯下功夫的人。`;
  }
  return targetPost?.authorType === 'star'
    ? `先把比赛打好，其他话题以后再聊。`
    : `我看到了。先把表现稳定住。`;
}
function maybeCreateStarResponseForPlayerPost(post, text, impact) {
  const mentioned = findMentionedSocialStars(text, 2);
  const fallback = buildStarTweetCandidates({ isGame: false }, 1).map(item => item.profile);
  const targets = (mentioned.length ? mentioned : fallback).filter(Boolean).slice(0, 2);
  if (!targets.length) return [];
  const responses = [];
  targets.forEach(profile => {
    if (!profile || Math.random() >= (mentioned.length ? 0.92 : 0.58)) return;
    const link = G.social?.playerLinks?.[String(profile.key || '').trim()] || null;
    const relationInfo = resolveSocialLinkStatus(link);
    const replyText = buildStarReplyComment(profile, relationInfo, impact, post);
    post.comments = Array.isArray(post.comments) ? post.comments : [];
    post.comments.unshift({
      author: String(profile.handle || buildStarHandleFromName(profile.name, profile.teamAbbr)).trim(),
      text: replyText,
      likes: rng(30, 420)
    });
    post.likes = parseNum(post.likes, 0) + rng(40, 260);
    post.reposts = parseNum(post.reposts, 0) + rng(6, 40);
    responses.push(profile);
    addPhone('社媒提醒', `${profile.name} 回复了你的推文。`, 'info');
    applySocialPlayerLinkDelta(profile, {
      affinityDelta: parseNum(impact.relationAffinity, 0),
      respectDelta: parseNum(impact.relationRespect, 0),
      heatDelta: parseNum(impact.relationHeat, 0),
      source: '公开社媒互动'
    });
  });
  return responses;
}

function ensureEconomyState() {
  if (!G.player) return;
  if (!Number.isFinite(parseNum(G.player.cash, NaN))) {
    const salary = normalizeSalaryMillion(parseNum(G.player.salary, 0));
    G.player.cash = +(Math.max(1.2, salary * 0.45 + 1)).toFixed(2);
  } else {
    G.player.cash = +Math.max(0, parseNum(G.player.cash, 0)).toFixed(2);
  }
  if (!G.economy || typeof G.economy !== 'object') G.economy = {};
  if (!Number.isFinite(parseNum(G.economy.staminaCoachLevel, NaN))) G.economy.staminaCoachLevel = 0;
  if (!Number.isFinite(parseNum(G.economy.trainingCoachLevel, NaN))) G.economy.trainingCoachLevel = 0;
  if (!Number.isFinite(parseNum(G.economy.recoveryTeamLevel, NaN))) G.economy.recoveryTeamLevel = 0;
  if (!Number.isFinite(parseNum(G.economy.prTeamLevel, NaN))) G.economy.prTeamLevel = 0;
  if (!Number.isFinite(parseNum(G.economy.agentTeamLevel, NaN))) G.economy.agentTeamLevel = 0;
  if (!Number.isFinite(parseNum(G.economy.analyticsLevel, NaN))) G.economy.analyticsLevel = 0;
  if (!Number.isFinite(parseNum(G.economy.salaryPaidSeason, NaN))) G.economy.salaryPaidSeason = parseNum(G.season, 1) - 1;
  G.economy.staminaCoachLevel = clamp(parseNum(G.economy.staminaCoachLevel, 0), 0, STAMINA_COACH_MARKET.length - 1);
  G.economy.trainingCoachLevel = clamp(parseNum(G.economy.trainingCoachLevel, 0), 0, TRAINING_COACH_MARKET.length - 1);
  G.economy.recoveryTeamLevel = clamp(parseNum(G.economy.recoveryTeamLevel, 0), 0, RECOVERY_TEAM_MARKET.length - 1);
  G.economy.prTeamLevel = clamp(parseNum(G.economy.prTeamLevel, 0), 0, PR_TEAM_MARKET.length - 1);
  G.economy.agentTeamLevel = clamp(parseNum(G.economy.agentTeamLevel, 0), 0, AGENT_TEAM_MARKET.length - 1);
  G.economy.analyticsLevel = clamp(parseNum(G.economy.analyticsLevel, 0), 0, ANALYTICS_SERVICE_MARKET.length - 1);
  if (!Array.isArray(G.economy.ownedItems)) G.economy.ownedItems = [];
  if (!Array.isArray(G.economy.ownedFacilities)) G.economy.ownedFacilities = [];
  if (!Array.isArray(G.economy.logs)) G.economy.logs = [];
  if (!Number.isFinite(parseNum(G.economy.totalSpent, NaN))) G.economy.totalSpent = 0;
  if (!Number.isFinite(parseNum(G.economy.visibilityMomentum, NaN))) G.economy.visibilityMomentum = 0;
  if (!Number.isFinite(parseNum(G.economy.visibilityMomentumUntilDay, NaN))) G.economy.visibilityMomentumUntilDay = -1;
  if (!Number.isFinite(parseNum(G.economy.lastOpportunityDay, NaN))) G.economy.lastOpportunityDay = -99;
  G.economy.totalSpent = +Math.max(0, parseNum(G.economy.totalSpent, 0)).toFixed(2);
  G.economy.visibilityMomentum = clamp(parseNum(G.economy.visibilityMomentum, 0), 0, 120);
  if (!G.economy.endorsements || typeof G.economy.endorsements !== 'object') G.economy.endorsements = {};
  const e = G.economy.endorsements;
  if (!Array.isArray(e.active)) e.active = [];
  if (!e.rejected || typeof e.rejected !== 'object') e.rejected = {};
  if (!Number.isFinite(parseNum(e.lastPayoutDay, NaN))) e.lastPayoutDay = -1;
  if (!Number.isFinite(parseNum(e.lastRefreshSeason, NaN))) e.lastRefreshSeason = parseNum(G.season, 1);
  if (!e.signatureShoe || typeof e.signatureShoe !== 'object') e.signatureShoe = (e.active || []).find(c => c && c.shoe) || null;
}
function ensureSocialState() {
  if (!G.social || typeof G.social !== 'object') G.social = {};
  if (!Array.isArray(G.social.posts)) G.social.posts = [];
  if (!Number.isFinite(parseNum(G.social.nextPostId, NaN))) G.social.nextPostId = 1;
  if (!Number.isFinite(parseNum(G.social.lastGeneratedDay, NaN))) G.social.lastGeneratedDay = -1;
  if (!G.social.generatedDayCounts || typeof G.social.generatedDayCounts !== 'object') G.social.generatedDayCounts = {};
  if (!Number.isFinite(parseNum(G.social.pendingRequiredDay, NaN))) G.social.pendingRequiredDay = -1;
  if (!G.social.playerRepliedPostIds || typeof G.social.playerRepliedPostIds !== 'object') G.social.playerRepliedPostIds = {};
  if (!G.social.playerPostsByDay || typeof G.social.playerPostsByDay !== 'object') G.social.playerPostsByDay = {};
  if (!Array.isArray(G.social.playerStatementLog)) G.social.playerStatementLog = [];
  if (!G.social.playerLinks || typeof G.social.playerLinks !== 'object') G.social.playerLinks = {};
  if (!G.social.starProfiles || typeof G.social.starProfiles !== 'object') G.social.starProfiles = {};
  if (!Array.isArray(G.social.commercialEvents)) G.social.commercialEvents = [];
  if (!Array.isArray(G.social.llmModels)) G.social.llmModels = [];
  if (!Number.isFinite(parseNum(G.social.llmModelsFetchedAt, NaN))) G.social.llmModelsFetchedAt = 0;
  if (!G.social.lastLLMTest || typeof G.social.lastLLMTest !== 'object') G.social.lastLLMTest = { ok: false, message: '', at: 0 };
  if (typeof G.social.tweetImagesEnabled !== 'boolean') G.social.tweetImagesEnabled = false;
  if (!G.social.llm || typeof G.social.llm !== 'object') {
    G.social.llm = { enabled: false, baseUrl: 'https://api.openai.com/v1', model: 'gpt-4.1-mini', apiKey: '', imageModel: '' };
  }
  const llm = G.social.llm;
  if (typeof llm.enabled !== 'boolean') llm.enabled = false;
  if (!llm.baseUrl) llm.baseUrl = 'https://api.openai.com/v1';
  if (!llm.model) llm.model = 'gpt-4.1-mini';
  if (typeof llm.apiKey !== 'string') llm.apiKey = '';
  if (typeof llm.imageModel !== 'string') llm.imageModel = '';
  llm.presets = normalizeLLMPresetConfig(llm.presets);
  try {
    const savedCfgText = localStorage.getItem('nba_social_llm_settings');
    if (savedCfgText) {
      const savedCfg = JSON.parse(savedCfgText);
      if (savedCfg && typeof savedCfg === 'object') {
        if (typeof savedCfg.enabled === 'boolean') llm.enabled = savedCfg.enabled;
        if (typeof savedCfg.baseUrl === 'string' && savedCfg.baseUrl.trim()) {
          llm.baseUrl = normalizeLLMBaseUrl(savedCfg.baseUrl);
        }
        if (typeof savedCfg.model === 'string' && savedCfg.model.trim()) {
          llm.model = savedCfg.model.trim();
        }
        if (typeof savedCfg.apiKey === 'string' && savedCfg.apiKey.trim()) {
          llm.apiKey = savedCfg.apiKey.trim();
        }
        if (typeof savedCfg.imageModel === 'string' && savedCfg.imageModel.trim()) {
          llm.imageModel = savedCfg.imageModel.trim();
        }
        if (typeof savedCfg.tweetImagesEnabled === 'boolean') {
          G.social.tweetImagesEnabled = savedCfg.tweetImagesEnabled;
        }
        if (savedCfg.presets && typeof savedCfg.presets === 'object') {
          llm.presets = normalizeLLMPresetConfig(savedCfg.presets);
        }
      }
    }
    const savedKey = localStorage.getItem('nba_social_llm_key');
    if (!llm.apiKey && savedKey) llm.apiKey = savedKey;
  } catch (e) { }
}
function stripErrorTextPreview(text) {
  const plain = String(text || '')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return plain.slice(0, 140);
}
function normalizeLLMBaseUrl(rawUrl) {
  let base = String(rawUrl || 'https://api.openai.com/v1').trim();
  if (!base) base = 'https://api.openai.com/v1';
  base = base.replace(/\/+$/, '');
  base = base.replace(/\/models$/i, '');
  base = base.replace(/\/chat\/completions$/i, '');
  base = base.replace(/\/completions$/i, '');
  return base || 'https://api.openai.com/v1';
}
function isGoogleGeminiEndpoint(baseUrl) {
  const url = String(baseUrl || '').toLowerCase();
  if (!url.includes('generativelanguage.googleapis.com')) return false;
  // Google OpenAI兼容层(/openai)依旧走Bearer + chat/completions
  return !url.includes('/openai');
}
function appendQueryParam(url, key, value) {
  const sep = String(url).includes('?') ? '&' : '?';
  return `${url}${sep}${encodeURIComponent(String(key))}=${encodeURIComponent(String(value))}`;
}
function buildLLMRequestConfig(baseUrl, apiKey, url, { jsonBody = false } = {}) {
  const headers = {};
  if (jsonBody) headers['Content-Type'] = 'application/json';
  const key = String(apiKey || '').trim();
  if (!key) return { url, headers };
  if (isGoogleGeminiEndpoint(baseUrl)) {
    return { url: appendQueryParam(url, 'key', key), headers };
  }
  headers.Authorization = `Bearer ${key}`;
  return { url, headers };
}
function buildLLMPromptPresetSection({ context = null, scope = 'social' } = {}) {
  ensureSocialState();
  const presets = normalizeLLMPresetConfig(G.social?.llm?.presets);
  if (!presets.enabled) return '';
  const lines = [];
  if (presets.antiTalk) lines.push('禁止角色之间无营养闲聊，每条推文/剧情必须有信息增量。');
  if (presets.strictTurnTaking) lines.push('严格按照一问一答的节奏推进，不允许一次输出多个角色的连续发言。');
  if (presets.styleEnabled && presets.style) lines.push(`文风：${presets.style}。用这种文风贯穿全文，避免过多华丽辞藻。`);
  if (presets.antiOmniscience) lines.push('视角限制：角色只能知道自己能观察到的信息，不能全知全能，不能读心。');
  if (presets.antiVariable) lines.push('保持角色性格和立场的一致性，不要在同一段输出中自相矛盾。');
  if (presets.emotionControl) lines.push('情绪描写克制，不要过度煽情或使用过多感叹号，让读者自己感受。');
  if (presets.roleHope) lines.push('允许角色保有希望和正面动机，不要所有情节都走向绝望和负面。');
  if (presets.gameInteraction && scope === 'story') lines.push('如果当天有比赛，必须紧扣比赛数据和结果来推进剧情，不要脱离比赛数据编故事。');
  if (presets.dataFirst) lines.push('数据优先：提及球员表现时必须引用 context 中提供的具体数字，禁止编造不存在的数据。');
  return lines.length ? lines.join('\n') : '';
}
function llmSystemPrompt(context = null) {
  let sys = `你是NBA社媒运营助手。必须使用简体中文，语气真实自然，模仿Twitter/Reddit/虎扑网友风格。

  【最高优先级：只用提供的数据】
  ⚠️ 这是一个模拟游戏，不是真实NBA历史。你必须：
  - **只使用 context 中提供的球员名字、球队战绩、数据统计**，不要用你记忆中的真实NBA历史数据
  - 提到球员数据时，**必须引用 context.league 中的真实数据**（得分榜、助攻榜、篮板榜、球队战绩）
  - **严禁**把不同届的球员混为同届，球员的选秀届别以 context.draft 为准
  - **严禁**编造 context 中不存在的球员数据（如得分、助攻、篮板等具体数字）
  - 如果 context 中没有某球员的数据，就不要提他的具体表现数字
  - **提到球员荣誉时，必须且只能引用 context.player.honors**，严禁编造不存在的MVP、冠军、全明星等成就
  - context.player.seasonYear 表示球员第几个赛季，评论必须符合球员实际资历

  【核心原则：丰富度与多样性】
  1. **强烈关联 recentStories**：如果 context 中存在 recentStories（近期生涯故事线），务必生成至少 1-2 条推文去**精准探讨或吐槽**这些事件（如主角去酒吧、被教练骂、绝杀、投资赚钱等），让网友们的反应像是在实时“追更”主角的小说人生！
  2. **主题必须覆盖至少5个不同类别**，从以下随机选取：
     - 球队战术分析（挡拆效率、转换进攻、半场阵地战、联防策略）
     - 球星对比/排名争论（历史地位辩论、同位置对比、数据对决）
     - 交易流言/自由市场分析（薪资空间、选秀权交易、球队补强方向）
     - 伤病/轮换阵容讨论（替补表现、球员负荷管理、伤病对线影响）
     - 赛程/季后赛形势（剩余赛程强度、附加赛争夺、种子位之争）
     - 新秀/年轻球员发展（新秀墙、角色球员突破、潜力兑现）
     - 下届选秀前瞻（如果 context.nextDraft 存在，可讨论下一届新秀的球探报告、模拟选秀排名、球队摆烂形势，引用 nextDraft.prospects 中的真实名字和简介）
     - 教练组/管理层决策（換帅传闻、轮换争议、战术调整、阵容实验）
     - 文化/球迷日常（球鞋文化、看球习惯、球迷之间抬杠、球场饮食）
     - 赌球/串子讨论（盘口分析、大小分、让分、连黑连红）
     - 数据深挖（进阶数据、真实命中率、使用率、净效率值）
  
  2. **角色多样化**：每次生成**至少覆盖5种不同角色**——
     虎扑JR、老球迷、战术分析师、情绪球迷、数据帝、串子哥、
     粉丝、黑子、吃瓜路人、野生UP主、退役球员视角、球队记者、
     相声型球迷、阴阳怪气达人、理中客、段子手
  
  3. **严格反重复规则**：
     - 每条推文的句式、开头词、标点方式必须完全不同
     - 禁止两条推文以相同的词语开头
     - 禁止重复使用"太"、"真的"、"说实话"、"我觉得"等高频开头词
     - 评论区回复不得超过8个字相同
     - 鼓励使用：反问句、省略号、括号吐槽、引用数据、emoji混搭、对话体、截图体
     - 语气风格变化：有的长分析、有的一句话暴论、有的数据流、有的纯段子、有的认真讨论
  
  4. **篮球为主（95%以上）**：
     - 基于 context.league.top5/bot3 讨论强队弱队、战绩排名、季后赛形势
     - 基于 context.league.scorers/assisters/rebounders 讨论球星表现、数据对比
     - 讨论战术体系、球队化学反应、交易传闻、伤病影响、新秀成长
     - 如果 context.nextDraft 存在，可以偶尔（1-2条）讨论下届选秀新秀，必须使用 nextDraft.prospects 中的名字和信息
     - 讨论比赛关键回合、教练决策、轮换阵容、防守策略
     - 非篮球内容最多1条（约5%），且必须与年代背景相关

  【严格禁令】
  - 🚫 **绝对禁止**出现 OVR, POT, 能力值, 评分, 潜力值 等游戏术语
  - 🚫 **严禁**编造 context 中不存在的球员名字或数据
  - 🚫 **严禁**出现时间错乱的人物
  - 🚫 **严禁**在非选秀期间疯狂刷屏"选秀"关键词
  - 🚫 **严禁**大量讨论数码产品、歌手明星、娱乐八卦等非篮球话题
  - 🚫 **严禁**连续使用相同句式结构

  【输出格式】
  只输出JSON对象（不要Markdown）：
  {
    "posts": [
      { "author": "用户名", "persona": "人设标签", "text": "推文内容", "likes": "点赞数(带k/w)", "reposts": "转发数", "comments": [ {"author":"评论者网名","text":"评论内容","likes":数字} ] }
    ]
  }
  确保 posts 数组包含 5-8 条高质量推文，主题互不重复。`;

  if (typeof applySillyTavernSystemPrompts === 'function') {
    const tp = applySillyTavernSystemPrompts();
    if (tp) sys += '\\n\\n【附加文本生成规则】\\n' + tp;
  }
  sys += '\\n- 每轮推文不要全部围绕主角展开：主角相关最多2条，其余必须覆盖联盟其他球队、球星、教练、交易、伤病、球鞋、城市、球迷或数据讨论。';
  if (context?.commercialEvents?.length) {
    sys += '\\n- 如果 context.commercialEvents 存在，至少在 1 条推文里明确提到最新代言签约、奢侈品购买或签名鞋动态，不要把商业事件当作背景板。';
  }
  if (context?.gameToday && context?.gameStory) {
    sys += `\n- 赛后新闻/推文默认采用全场战报视角：优先写四节走势、关键转折、球队整体执行和胜负原因，不要把整轮内容都压到第四节。`;
    sys += `\n- 本场比赛判定为${context.gameStory.closeGame ? '焦灼局' : '非焦灼局'}；${context.gameStory.closeGame ? '可以强调末节/加时，但仍要交代全场铺垫。' : '只要按全场四节节奏写即可，末节不要喧宾夺主。'}`;
  }
  const presetPrompt = buildLLMPromptPresetSection({ context, scope: 'social' });
  if (presetPrompt) sys += `\n\n【预设参数】\n${presetPrompt}`;
  return sys;
}
function llmUserPromptPayload(context, count) {
  return JSON.stringify({
    context,
    count,
    mix: {
      maxPlayerCentricPosts: Math.min(2, Math.max(1, Math.round(count * 0.35))),
      minNonPlayerPosts: Math.max(3, count - Math.min(2, Math.max(1, Math.round(count * 0.35)))),
      requireLeagueWideTopics: true,
      requireOtherTeamCoverage: true
    },
    rules: {
      language: 'zh-CN',
      noGameTerms: true,
      draftYearMustMatchContext: true,
      respectDraftPickIdentity: true
    }
  });
}
function normalizeModelNameForGemini(model) {
  const raw = String(model || 'gemini-2.0-flash').trim() || 'gemini-2.0-flash';
  return raw.replace(/^models\//i, '');
}
function tryParseJSONText(text) {
  const raw = String(text || '').trim();
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}
async function readJSONResponseSafe(res, label = '接口') {
  const bodyText = await res.text();
  const data = tryParseJSONText(bodyText);
  if (!res.ok) {
    const statusMsg = data?.error?.message || data?.message || stripErrorTextPreview(bodyText) || '请求失败';
    throw new Error(`${label} ${res.status}: ${statusMsg}`);
  }
  if (data === null) {
    throw new Error(`${label} 返回非 JSON：${stripErrorTextPreview(bodyText) || '(空响应)'}`);
  }
  return data;
}
function extractModelIds(data) {
  const source = Array.isArray(data?.data)
    ? data.data
    : (Array.isArray(data?.models) ? data.models : (Array.isArray(data) ? data : []));
  const ids = source.map(m => {
    if (typeof m === 'string') return m.trim();
    return String(m?.id || m?.name || m?.model || '').trim();
  }).filter(Boolean);
  return [...new Set(ids)].sort((a, b) => a.localeCompare(b));
}
async function fetchSocialLLMModels() {
  ensureSocialState();
  const llm = G.social.llm || {};
  const baseUrl = normalizeLLMBaseUrl(llm.baseUrl);
  const apiKey = String(llm.apiKey || '').trim();
  if (!apiKey) throw new Error('API Key 为空');
  const req = buildLLMRequestConfig(baseUrl, apiKey, `${baseUrl}/models`, { jsonBody: false });
  const res = await fetch(req.url, {
    method: 'GET',
    headers: req.headers
  });
  const data = await readJSONResponseSafe(res, '模型列表');
  const models = extractModelIds(data);
  if (!models.length) throw new Error('模型列表为空或响应格式不支持');
  G.social.llmModels = models;
  G.social.llmModelsFetchedAt = Date.now();
  return models;
}
async function testSocialLLMConnectivity() {
  ensureSocialState();
  const llm = G.social.llm || {};
  const baseUrl = normalizeLLMBaseUrl(llm.baseUrl);
  const apiKey = String(llm.apiKey || '').trim();
  if (!apiKey) {
    const msg = 'API Key 不能为空';
    G.social.lastLLMError = msg;
    G.social.lastLLMTest = { ok: false, message: msg, at: Date.now() };
    return { ok: false, message: msg, models: [] };
  }
  try {
    const models = await fetchSocialLLMModels();
    const currentModel = String(llm.model || '').trim();
    if ((!currentModel || !models.includes(currentModel)) && models.length) {
      llm.model = models[0];
    }
    saveSocialLLMSettings({ enabled: llm.enabled, baseUrl: llm.baseUrl, model: llm.model, apiKey: llm.apiKey });
    const msg = `连通成功，读取 ${models.length} 个模型`;
    G.social.lastLLMError = '';
    G.social.lastLLMTest = { ok: true, message: msg, at: Date.now() };
    return { ok: true, message: msg, models };
  } catch (e) {
    let msg = String(e?.message || e);
    if (isGoogleGeminiEndpoint(baseUrl) && /invalid authentication credentials/i.test(msg)) {
      msg += '（Google Gemini 请使用 API Key，Base URL 建议 https://generativelanguage.googleapis.com/v1beta）';
    }
    saveSocialLLMSettings({ enabled: llm.enabled, baseUrl: llm.baseUrl, model: llm.model, apiKey: llm.apiKey });
    G.social.lastLLMError = msg;
    G.social.lastLLMTest = { ok: false, message: msg, at: Date.now() };
    return { ok: false, message: msg, models: [] };
  }
}
function saveSocialLLMSettings({ enabled, baseUrl, model, apiKey, imageModel, tweetImagesEnabled, presets } = {}) {
  ensureSocialState();
  const llm = G.social.llm;
  if (typeof enabled === 'boolean') llm.enabled = enabled;
  if (baseUrl !== undefined) llm.baseUrl = normalizeLLMBaseUrl(baseUrl);
  if (model !== undefined) llm.model = String(model || 'gpt-4.1-mini').trim() || 'gpt-4.1-mini';
  if (apiKey !== undefined) llm.apiKey = String(apiKey || '').trim();
  if (imageModel !== undefined) llm.imageModel = String(imageModel || '').trim();
  if (typeof tweetImagesEnabled === 'boolean') G.social.tweetImagesEnabled = tweetImagesEnabled;
  if (presets !== undefined) llm.presets = normalizeLLMPresetConfig(presets);
  else llm.presets = normalizeLLMPresetConfig(llm.presets);
  try {
    const nextImageModel = String(llm.imageModel || '').trim();
    localStorage.setItem('nba_social_llm_settings', JSON.stringify({
      enabled: !!llm.enabled,
      baseUrl: normalizeLLMBaseUrl(llm.baseUrl),
      model: String(llm.model || 'gpt-4.1-mini').trim() || 'gpt-4.1-mini',
      apiKey: String(llm.apiKey || '').trim(),
      imageModel: nextImageModel,
      tweetImagesEnabled: !!G.social.tweetImagesEnabled,
      presets: normalizeLLMPresetConfig(llm.presets)
    }));
    if (llm.apiKey) localStorage.setItem('nba_social_llm_key', llm.apiKey);
    else localStorage.removeItem('nba_social_llm_key');
  } catch (e) { }
  return llm;
}
function getStaminaCoachConfig(level = parseNum(G?.economy?.staminaCoachLevel, 0)) {
  return STAMINA_COACH_MARKET[clamp(parseNum(level, 0), 0, STAMINA_COACH_MARKET.length - 1)];
}
function getTrainingCoachConfig(level = parseNum(G?.economy?.trainingCoachLevel, 0)) {
  return TRAINING_COACH_MARKET[clamp(parseNum(level, 0), 0, TRAINING_COACH_MARKET.length - 1)];
}
function getRecoveryTeamConfig(level = parseNum(G?.economy?.recoveryTeamLevel, 0)) {
  return RECOVERY_TEAM_MARKET[clamp(parseNum(level, 0), 0, RECOVERY_TEAM_MARKET.length - 1)];
}
function getPRTeamConfig(level = parseNum(G?.economy?.prTeamLevel, 0)) {
  return PR_TEAM_MARKET[clamp(parseNum(level, 0), 0, PR_TEAM_MARKET.length - 1)];
}
function getAgentTeamConfig(level = parseNum(G?.economy?.agentTeamLevel, 0)) {
  return AGENT_TEAM_MARKET[clamp(parseNum(level, 0), 0, AGENT_TEAM_MARKET.length - 1)];
}
function getAnalyticsConfig(level = parseNum(G?.economy?.analyticsLevel, 0)) {
  return ANALYTICS_SERVICE_MARKET[clamp(parseNum(level, 0), 0, ANALYTICS_SERVICE_MARKET.length - 1)];
}
function ownedFacilitySet() {
  ensureEconomyState();
  return new Set((G.economy.ownedFacilities || []).map(x => String(x)));
}
function getOwnedFacilityEntries() {
  const owned = ownedFacilitySet();
  return FACILITY_MARKET.filter(item => owned.has(String(item.id)));
}
function getOwnedLuxuryEntries() {
  const owned = ownedLuxurySet();
  return LUXURY_MARKET.filter(item => owned.has(String(item.id)));
}
function getActiveVisibilityMomentum() {
  ensureEconomyState();
  const raw = clamp(parseNum(G.economy.visibilityMomentum, 0), 0, 120);
  const untilDay = parseNum(G.economy.visibilityMomentumUntilDay, -1);
  if (untilDay < 0 || parseNum(G.dayNum, 0) <= untilDay) return raw;
  return clamp(raw - (parseNum(G.dayNum, 0) - untilDay) * 3, 0, 120);
}
function getFamePrivilegeTier(privilegeScore) {
  const score = parseNum(privilegeScore, 0);
  let current = FAME_PRIVILEGE_TIERS[0];
  FAME_PRIVILEGE_TIERS.forEach(rule => {
    if (score >= parseNum(rule.minScore, 0)) current = rule;
  });
  return current || FAME_PRIVILEGE_TIERS[0];
}
function buildCommercialIdentityProfile() {
  ensureEconomyState();
  const fame = clamp(parseNum(G.player?.fame, 10), 0, 100);
  const trust = clamp(parseNum(G.player?.trust, 50), 0, 100);
  const ownedLuxury = getOwnedLuxuryEntries();
  const ownedFacilities = getOwnedFacilityEntries();
  const flashyScore = ownedLuxury.reduce((sum, item) => {
    const tag = String(item.socialTag || '');
    const extra = /超跑|游艇|私人飞机|豪宅/.test(tag) ? 2 : /跑车|奢侈品|收藏/.test(tag) ? 1 : 0;
    return sum + extra;
  }, 0);
  const groundedScore = ownedLuxury.reduce((sum, item) => sum + (/公益/.test(String(item.socialTag || '')) ? 3 : /房产/.test(String(item.socialTag || '')) ? 1 : 0), 0);
  const facilityScore = ownedFacilities.reduce((sum, item) => sum + Math.max(1, parseNum(item.marketScoreBonus, 0) * 0.45 + parseNum(item.momentum, 0) * 0.25), 0);
  const visibilityMomentum = getActiveVisibilityMomentum();
  const totalSpent = parseNum(G.economy.totalSpent, 0);
  const identityLabel = flashyScore - groundedScore >= 4
    ? '顶流奢华'
    : groundedScore - flashyScore >= 3
      ? '低调公益'
      : facilityScore >= 8
        ? '专业团队流'
        : fame >= 55
          ? '联盟明星'
          : '上升新贵';
  const prestigeScore = clamp(
    fame * 0.82 +
    trust * 0.34 +
    flashyScore * 3 +
    groundedScore * 2.6 +
    facilityScore * 1.7 +
    Math.min(26, totalSpent * 0.45) +
    visibilityMomentum * 0.28,
    0,
    180
  );
  const privilegeTier = getFamePrivilegeTier(prestigeScore);
  return {
    fame,
    trust,
    flashyScore,
    groundedScore,
    facilityScore: +facilityScore.toFixed(1),
    totalSpent: +totalSpent.toFixed(2),
    visibilityMomentum,
    identityLabel,
    prestigeScore: +prestigeScore.toFixed(1),
    privilegeTier
  };
}
function getEconomyEffects() {
  ensureEconomyState();
  const sCfg = getStaminaCoachConfig();
  const tCfg = getTrainingCoachConfig();
  const recoveryCfg = getRecoveryTeamConfig();
  const prCfg = getPRTeamConfig();
  const agentCfg = getAgentTeamConfig();
  const analyticsCfg = getAnalyticsConfig();
  const identity = buildCommercialIdentityProfile();
  const ownedFacilities = getOwnedFacilityEntries();
  const facilityFx = ownedFacilities.reduce((acc, item) => {
    acc.restBonus += parseNum(item.restBonus, 0);
    acc.gameBonus += parseNum(item.gameBonus, 0);
    acc.injuryMult *= parseNum(item.injuryMult, 1);
    acc.injuryDaysMult *= parseNum(item.injuryDaysMult, 1);
    acc.xpMult *= parseNum(item.xpMult, 1);
    acc.prepBonus += parseNum(item.prepBonus, 0);
    acc.marketScoreBonus += parseNum(item.marketScoreBonus, 0);
    acc.socialHeatMult *= parseNum(item.socialHeatMult, 1);
    acc.posRepMult *= parseNum(item.posRepMult, 1);
    acc.momentum += parseNum(item.momentum, 0);
    return acc;
  }, {
    restBonus: 0,
    gameBonus: 0,
    injuryMult: 1,
    injuryDaysMult: 1,
    xpMult: 1,
    prepBonus: 0,
    marketScoreBonus: 0,
    socialHeatMult: 1,
    posRepMult: 1,
    momentum: 0
  });
  const tier = identity.privilegeTier || FAME_PRIVILEGE_TIERS[0];
  const activeDealCap = 8 + parseNum(agentCfg.activeCapBonus, 0) + parseNum(tier.activeCapBonus, 0);
  return {
    restStaminaBonus: parseNum(sCfg.restBonus, 0) + parseNum(recoveryCfg.restBonus, 0) + parseNum(facilityFx.restBonus, 0),
    gameStaminaBonus: parseNum(sCfg.gameBonus, 0) + parseNum(recoveryCfg.gameBonus, 0) + parseNum(facilityFx.gameBonus, 0),
    injuryMult: parseNum(sCfg.injuryMult, 1) * parseNum(recoveryCfg.injuryMult, 1) * parseNum(facilityFx.injuryMult, 1),
    injuryDaysMult: parseNum(recoveryCfg.injuryDaysMult, 1) * parseNum(facilityFx.injuryDaysMult, 1),
    xpMult: parseNum(tCfg.xpMult, 1) * parseNum(analyticsCfg.xpMult, 1) * parseNum(facilityFx.xpMult, 1),
    prepBonus: parseNum(analyticsCfg.prepBonus, 0) + parseNum(facilityFx.prepBonus, 0),
    fatigueRelief: parseNum(analyticsCfg.fatigueRelief, 0),
    repPositiveMult: parseNum(prCfg.posRepMult, 1) * parseNum(facilityFx.posRepMult, 1),
    repNegativeMult: parseNum(prCfg.negRepMult, 1),
    endorsementScoreBonus: parseNum(prCfg.marketScoreBonus, 0) + parseNum(agentCfg.marketScoreBonus, 0) + parseNum(analyticsCfg.marketScoreBonus, 0) + parseNum(facilityFx.marketScoreBonus, 0) + parseNum(tier.scoreBonus, 0),
    endorsementOfferMult: parseNum(agentCfg.offerMult, 1) * parseNum(tier.offerMult, 1),
    endorsementIncomeMult: parseNum(agentCfg.incomeMult, 1) * parseNum(tier.incomeMult, 1),
    socialHeatMult: parseNum(prCfg.socialHeatMult, 1) * parseNum(tier.socialHeatMult, 1) * parseNum(facilityFx.socialHeatMult, 1),
    specialEventChance: clamp(parseNum(prCfg.eventBonus, 0) + parseNum(tier.eventChance, 0) + Math.min(0.03, identity.visibilityMomentum / 2400), 0.02, 0.24),
    activeDealCap,
    visibilityMomentum: identity.visibilityMomentum,
    prestigeScore: identity.prestigeScore,
    fameTier: parseNum(tier.level, 0),
    fameTierLabel: String(tier.label || '新秀观察'),
    perkList: Array.isArray(tier.perks) ? [...tier.perks] : [],
    commercialIdentity: identity.identityLabel,
    totalSpent: identity.totalSpent,
    flashyScore: identity.flashyScore,
    groundedScore: identity.groundedScore,
    facilityScore: identity.facilityScore
  };
}
function getTrainingCoachXpMultiplier() {
  return getEconomyEffects().xpMult;
}
function addEconomyLog(text, type = 'neu') {
  ensureEconomyState();
  G.economy.logs.unshift({ text, type, season: G.season, day: G.dayNum, ts: Date.now() });
  if (G.economy.logs.length > 80) G.economy.logs.pop();
}
function adjustPlayerCash(deltaM, reason = '') {
  ensureEconomyState();
  const delta = parseNum(deltaM, 0);
  G.player.cash = +(Math.max(0, parseNum(G.player.cash, 0) + delta).toFixed(2));
  if (reason) addEconomyLog(`${delta >= 0 ? '收入' : '支出'} ${Math.abs(delta).toFixed(2)}M：${reason}`, delta >= 0 ? 'pos' : 'neu');
  return G.player.cash;
}
function applySeasonSalaryPayout({ force = false, reason = '' } = {}) {
  ensureEconomyState();
  const season = parseNum(G.season, 1);
  const paidSeason = parseNum(G.economy.salaryPaidSeason, season - 1);
  const years = parseNum(G.player.contractYears, 0);
  const salary = normalizeSalaryMillion(parseNum(G.player.salary, 0));
  if (!force && paidSeason === season) return { ok: false, reason: 'already_paid', amount: 0 };
  if (years <= 0) return { ok: false, reason: 'no_contract', amount: 0 };
  if (salary <= 0) return { ok: false, reason: 'no_salary', amount: 0 };
  adjustPlayerCash(salary, reason || `赛季薪资发放（${season}赛季）`);
  G.economy.salaryPaidSeason = season;
  addPhone('财务团队', `本赛季薪资已发放：$${salary.toFixed(2)}M`, 'info');
  return { ok: true, amount: salary, season };
}
function socialGeneratedKey(day, season = G.season) {
  return `${parseNum(season, 0)}_${parseNum(day, 0)}`;
}
function getGeneratedSocialCount(day, season = G.season) {
  ensureSocialState();
  const key = socialGeneratedKey(day, season);
  const recorded = parseNum(G.social.generatedDayCounts?.[key], -1);
  if (recorded >= 0) return recorded;
  const posts = (G.social.posts || []).filter(p =>
    parseNum(p?.season, 0) === parseNum(season, 0) &&
    parseNum(p?.day, -999) === parseNum(day, -999) &&
    !p?.isPlayer
  );
  const count = posts.length;
  if (count >= 5) G.social.generatedDayCounts[key] = count;
  return count;
}
function hasGeneratedSocialForDay(day, season = G.season) {
  return getGeneratedSocialCount(day, season) >= 5;
}
function markSocialGeneratedDay(day, count, season = G.season) {
  ensureSocialState();
  const key = socialGeneratedKey(day, season);
  G.social.generatedDayCounts[key] = Math.max(0, parseNum(count, 0));
}
function getSocialTimeline(limit = 50) {
  ensureSocialState();
  const safeLimit = Math.max(1, parseNum(limit, 50));
  return [...(G.social.posts || [])]
    .sort((a, b) => parseNum(b?.ts, 0) - parseNum(a?.ts, 0) || parseNum(b?.id, 0) - parseNum(a?.id, 0))
    .slice(0, safeLimit);
}

// ============ SOCIAL TWEET GENERATION ============
// 标记函数，用于 typeof 检查
function generateDailySocialTweets() { return true; }

// 构建社媒 LLM 上下文
function buildSocialLLMContext(dayResult = {}) {
  ensureSocialState();
  const s = G.seasonStats || {};
  const gp = Math.max(1, parseNum(s.gp, parseNum(G.gameNum, 0)));
  const teamRecords = typeof getLeagueTeamRecordsArray === 'function' ? getLeagueTeamRecordsArray() : [];
  const sorted = [...teamRecords].sort((a, b) => b.w - a.w || a.l - b.l);
  const leaguePlayers = typeof getLeaguePlayerSeasonRows === 'function' ? getLeaguePlayerSeasonRows().filter(r => parseNum(r.gp, 0) > 0) : [];
  const scorers = [...leaguePlayers].sort((a, b) => b.ppg - a.ppg).slice(0, 5).map(r => ({ name: r.name, team: (getTeam(r.teamId) || {}).a || '--', ppg: r.ppg?.toFixed(1) }));
  const assisters = [...leaguePlayers].sort((a, b) => b.apg - a.apg).slice(0, 5).map(r => ({ name: r.name, team: (getTeam(r.teamId) || {}).a || '--', apg: r.apg?.toFixed(1) }));
  const rebounders = [...leaguePlayers].sort((a, b) => b.rpg - a.rpg).slice(0, 5).map(r => ({ name: r.name, team: (getTeam(r.teamId) || {}).a || '--', rpg: r.rpg?.toFixed(1) }));
  const recentStories = (G.storyLog || []).slice(-3).map(s => typeof s === 'string' ? s.replace(/<[^>]+>/g, '').trim().slice(0, 200) : '').filter(Boolean);
  const recentStatements = (G.social?.playerStatementLog || []).slice(-3).map(item => ({
    title: String(item?.title || '').trim(),
    tone: String(item?.analysisText || '').trim(),
    text: cleanSocialText(item?.text || '').slice(0, 120)
  })).filter(item => item.text);
  const commercialEvents = typeof getRecentCommercialEvents === 'function' ? getRecentCommercialEvents(3).map(e => ({
    label: e?.displayLabel || e?.label || '', detail: e?.detail || '', type: e?.type || ''
  })) : [];
  const relationships = getTrackedSocialRelationships(4).map(item => ({
    name: String(item?.name || '').trim(),
    team: String(item?.teamAbbr || item?.profile?.teamAbbr || '--').trim(),
    status: String(item?.status?.label || '').trim(),
    affinity: parseNum(item?.affinity, 0),
    respect: parseNum(item?.respect, 0),
    heat: parseNum(item?.heat, 0)
  }));

  const context = {
    player: {
      name: G.player?.name || '球员',
      team: G.team?.z || G.team?.n || '球队',
      teamAbbr: G.team?.a || '--',
      age: G.player?.age || 19,
      pos: posLabel(G.player?.pos),
      rating: ovr(G.player?.attrs || {}),
      seasonYear: parseNum(G.season, 1),
      ppg: (s.pts / gp).toFixed(1),
      apg: (s.ast / gp).toFixed(1),
      rpg: (s.reb / gp).toFixed(1),
      honors: (G.allAwards || []).map(a => (a.awards || []).join(', ')).filter(Boolean).join('; ') || '暂无',
      fame: parseNum(G.player?.fame, 10),
      trust: parseNum(G.player?.trust, 50)
    },
    league: {
      top5: sorted.slice(0, 5).map(r => ({ team: (getTeam(r.id) || {}).z || '--', w: r.w, l: r.l })),
      bot3: sorted.slice(-3).map(r => ({ team: (getTeam(r.id) || {}).z || '--', w: r.w, l: r.l })),
      scorers,
      assisters,
      rebounders
    },
    day: parseNum(dayResult.day, G.dayNum),
    year: G.year,
    season: G.season,
    gameToday: !!dayResult.isGame,
    recentStories,
    recentStatements,
    commercialEvents,
    relationships
  };

  if (dayResult.isGame && dayResult.gameResult) {
    const gr = dayResult.gameResult;
    const opp = getTeam(gr.opp) || {};
    context.gameStory = {
      win: !!gr.win,
      opponent: opp.z || opp.a || '--',
      teamPts: parseNum(gr.teamPts, 0),
      oppPts: parseNum(gr.oppPts, 0),
      closeGame: Math.abs(parseNum(gr.teamPts, 0) - parseNum(gr.oppPts, 0)) <= 5,
      playerStats: gr.st ? `${gr.st.pts}分${gr.st.reb}板${gr.st.ast}助${gr.st.stl}断${gr.st.blk}帽` : '',
      grade: gr.grade || ''
    };
  }
  return context;
}
function buildSocialTweetImagePrompt(post, context = {}) {
  const src = post || {};
  const text = cleanSocialText(src.text || '').slice(0, 220);
  const tags = [
    context?.gameToday ? 'basketball game night' : 'basketball lifestyle day',
    context?.player?.team || '',
    context?.player?.name || '',
    src.persona || '',
    context?.commercialEvents?.length ? 'commercial sports buzz' : ''
  ].filter(Boolean).join(', ');
  return `为一条中文篮球社媒动态生成配图。画面要像真实社交媒体会配的体育图，不要出现水印、文字墙或海报排版。
主题标签：${tags}
动态内容：${text || '联盟日常讨论'}
要求：横向画面、强体育新闻感、人物与场馆氛围清晰、适合手机推文流展示。`;
}
async function attachGeneratedImagesToSocialPosts(posts = [], dayResult = {}, context = null) {
  ensureSocialState();
  if (!G.social?.tweetImagesEnabled) return posts;
  if (typeof generateSignatureShoeImageByLLM !== 'function') return posts;
  const llm = G.social?.llm || {};
  if (!llm.enabled || !String(llm.apiKey || '').trim()) return posts;
  const baseUrl = normalizeLLMBaseUrl(llm.baseUrl);
  const defaultModel = isGoogleGeminiEndpoint(baseUrl) ? 'gemini-3.1-flash-image-preview' : 'gpt-image-1';
  const imageModel = String(llm.imageModel || '').trim() || defaultModel;
  const ctx = context || buildSocialLLMContext(dayResult);
  const candidates = [...(Array.isArray(posts) ? posts : [])]
    .filter(post => post && !post.isPlayer && !String(post.image || '').trim())
    .sort((a, b) => parseNum(b?.likes, 0) - parseNum(a?.likes, 0))
    .slice(0, dayResult?.isGame ? 2 : 1);
  for (const post of candidates) {
    const prompt = buildSocialTweetImagePrompt(post, ctx);
    try {
      const res = await generateSignatureShoeImageByLLM(prompt, { model: imageModel, size: '1536x1024' });
      if (res?.ok && res.image) {
        post.image = String(res.image || '').trim();
        post.imagePrompt = prompt;
        post.imageModel = String(res.model || imageModel).trim();
        post.imageStatus = 'llm';
      }
    } catch (e) { }
  }
  return posts;
}

// 智能社媒推文生成（调用LLM）
async function generateDailySocialTweetsSmart(dayResult = {}, { force = false, count = 6 } = {}) {
  ensureSocialState();
  const day = parseNum(dayResult.day, Math.max(0, G.dayNum - 1));
  const season = parseNum(G.season, 1);

  // 已生成过则跳过（除非 force）
  if (!force && hasGeneratedSocialForDay(day, season)) return [];

  const llm = G.social.llm || {};
  if (!llm.enabled || !llm.apiKey) {
    // LLM 未配置时回退到本地占位推文
    return generateFallbackSocialTweets(dayResult, day, season, count);
  }

  const baseUrl = normalizeLLMBaseUrl(llm.baseUrl);
  const model = String(llm.model || 'gpt-4.1-mini').trim();
  const context = buildSocialLLMContext(dayResult);
  const sysPrompt = llmSystemPrompt(context);
  const userPayload = llmUserPromptPayload(context, count);

  let raw = '';
  try {
    if (isGoogleGeminiEndpoint(baseUrl)) {
      const modelName = normalizeModelNameForGemini(model);
      const endpoint = `${baseUrl}/models/${encodeURIComponent(modelName)}:generateContent`;
      const req = buildLLMRequestConfig(baseUrl, llm.apiKey, endpoint, { jsonBody: true });
      const payload = {
        systemInstruction: { parts: [{ text: sysPrompt }] },
        contents: [{ role: 'user', parts: [{ text: userPayload }] }],
        generationConfig: { temperature: 0.85, responseMimeType: 'application/json' }
      };
      const res = await fetch(req.url, { method: 'POST', headers: req.headers, body: JSON.stringify(payload) });
      const data = await readJSONResponseSafe(res, '推文生成');
      raw = (data?.candidates?.[0]?.content?.parts || []).map(p => p.text).join('') || '';
    } else {
      const payload = {
        model,
        temperature: 0.85,
        messages: [
          { role: 'system', content: sysPrompt },
          { role: 'user', content: userPayload }
        ],
        response_format: { type: 'json_object' }
      };
      const endpoint = `${baseUrl}/chat/completions`;
      const req = buildLLMRequestConfig(baseUrl, llm.apiKey, endpoint);
      const res = await fetch(req.url, { method: 'POST', headers: req.headers, body: JSON.stringify(payload) });
      const data = await readJSONResponseSafe(res, '推文生成');
      raw = data?.choices?.[0]?.message?.content || '';
    }

    // 解析 JSON
    let jsonStr = raw;
    const match = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (match) jsonStr = match[1];
    const parsed = tryParseJSONText(jsonStr.trim());
    if (!parsed || !Array.isArray(parsed.posts) || !parsed.posts.length) {
      throw new Error('LLM 推文格式错误');
    }

    // 插入推文
    const added = [];
    parsed.posts.forEach(post => {
      if (!post || !post.text) return;
      const p = appendSocialPost({
        author: String(post.author || '@线上看球').trim(),
        persona: String(post.persona || '中立型').trim(),
        text: String(post.text).trim(),
        tone: String(post.tone || 'neutral'),
        likes: parseNum(String(post.likes || '').replace(/[kw万千]/gi, m => ({ k: '000', w: '0000', '万': '0000', '千': '000' }[m.toLowerCase()] || '')), rng(50, 500)),
        reposts: parseNum(post.reposts, rng(10, 100)),
        comments: Array.isArray(post.comments) ? post.comments.map(c => ({
          author: String(c?.author || '@评论用户').trim(),
          text: String(c?.text || '').trim(),
          likes: parseNum(c?.likes, rng(1, 50))
        })) : makeFallbackComments(post.text, 'neutral', 2),
        day,
        season,
        year: G.year
      });
      if (p) added.push(p);
    });

    await attachGeneratedImagesToSocialPosts(added, dayResult, context);
    const starAdded = generateStarPlayerSocialPosts(dayResult, day, season, Math.min(2, Math.max(1, Math.round(count * 0.34))));
    const totalAdded = added.concat(starAdded);
    markSocialGeneratedDay(day, totalAdded.length, season);
    G.social.lastLLMError = '';
    return totalAdded;
  } catch (err) {
    const message = String(err?.message || err || '推文生成失败');
    console.warn('Social tweet LLM generation failed:', err);
    G.social.lastLLMError = message;
    // 回退到本地
    return generateFallbackSocialTweets(dayResult, day, season, count);
  }
}

// 本地回退推文（无需LLM）
function generateFallbackSocialTweets(dayResult, day, season, count = 6) {
  const added = [];
  const isGame = !!dayResult?.isGame;
  const gr = dayResult?.gameResult;
  const playerName = G.player?.name || '球员';
  const teamName = G.team?.z || '球队';

  const templates = isGame && gr ? [
    { a: '@赛场快报', t: 'news', text: `${teamName}${gr.win ? '拿下' : '不敌'}${(getTeam(gr.opp) || {}).z || '对手'}，比分 ${gr.teamPts}-${gr.oppPts}。${playerName}贡献${gr.st?.pts || 0}分${gr.st?.reb || 0}板${gr.st?.ast || 0}助。` },
    { a: '@真爱球迷阿哲', t: 'fan', text: gr.win ? `赢了！${playerName}今晚太猛了！` : `输了…但${playerName}已经尽力了，下一场再来` },
    { a: '@数据实验室', t: 'data', text: `${playerName}本场效率值：${gr.st ? Math.round((gr.st.pts + gr.st.reb + gr.st.ast + gr.st.stl + gr.st.blk) * 1.2) : '??'}，${gr.win ? '正负值为正' : '球队整体需要反思'}` },
    { a: '@键盘评球', t: 'hater', text: gr.win ? `赢了就吹？看看对面什么水平` : `就这？说好的核心呢？` },
    { a: '@篮球老炮儿', t: 'youtuber', text: `今晚这场球我准备做个五分钟速看，${gr.win ? '精华太多了' : '槽点太多了'}` },
    { a: '@看球气到住院', t: 'emotional', text: gr.win ? `赢球的快乐谁懂啊啊啊！！！` : `血压上来了，教练换人能不能快点` }
  ] : [
    { a: '@赛场快报', t: 'news', text: `${teamName}今日休赛，${playerName}进行了日常训练。` },
    { a: '@篮球前线', t: 'news', text: `联盟今日无大交易动态，各队继续备战。` },
    { a: '@吃瓜群众甲', t: 'casual', text: `今天没球赛看，刷刷论坛等明天的比赛` },
    { a: '@步行街扛把子', t: 'hupu_toxic', text: `休赛日水贴，大家觉得${playerName}赛季结束能拿什么荣誉？` },
    { a: '@半场分析', t: 'neutral', text: `休赛日复盘一下最近的战绩走势，${teamName}需要稳住节奏` },
    { a: '@今晚稳赢', t: 'gambler', text: `明天的比赛盘口出了，研究研究` }
  ];

  templates.slice(0, count).forEach(tpl => {
    const p = appendSocialPost({
      author: tpl.a,
      persona: SOCIAL_PERSONAS[tpl.t]?.type || '中立型',
      text: tpl.text,
      tone: 'neutral',
      likes: rng(30, 300),
      reposts: rng(5, 60),
      comments: makeFallbackComments(tpl.text, 'neutral', 2),
      day, season, year: G.year
    });
    if (p) added.push(p);
  });

  const starAdded = generateStarPlayerSocialPosts(dayResult, day, season, Math.min(2, Math.max(1, Math.round(count * 0.34))));
  const totalAdded = added.concat(starAdded);
  markSocialGeneratedDay(day, totalAdded.length, season);
  return totalAdded;
}
function getDailySocialGateStatus() {
  ensureSocialState();
  const currentDay = parseNum(G.dayNum, 0);
  if (currentDay <= 0) {
    return { blocked: false, requiredDay: -1, generated: true, count: 0, text: '推文状态：首日可直接开始' };
  }
  const requiredDay = currentDay - 1;
  const season = parseNum(G.season, 0);
  const count = getGeneratedSocialCount(requiredDay, season);
  const generated = count >= 5;
  const blocked = !generated;
  const dateText = getDayDateString(requiredDay);
  const text = generated
    ? `推文状态：${dateText} 已生成 ${count} 条`
    : `推文状态：${dateText} 未生成（禁止进入下一天）`;
  return { blocked, requiredDay, generated, count, season, text };
}
async function ensureDailySocialReadyBeforeAdvance() {
  ensureSocialState();
  const gate = getDailySocialGateStatus();
  if (!gate.blocked) {
    G.social.pendingRequiredDay = -1;
    return { ok: true, ...gate };
  }
  const day = parseNum(gate.requiredDay, -1);
  const fallback = {
    day,
    date: getDayDateString(day),
    isGame: false,
    gameResult: null,
    events: []
  };
  const dayResult = (G._latestDayResult && parseNum(G._latestDayResult.day, -99) === day) ? G._latestDayResult : fallback;
  try {
    const added = await generateDailySocialTweetsSmart(dayResult, { force: true });
    const generated = hasGeneratedSocialForDay(day, gate.season);
    if (generated) {
      G.social.pendingRequiredDay = -1;
      return { ok: true, blocked: false, requiredDay: day, count: getGeneratedSocialCount(day, gate.season), added };
    }
    G.social.pendingRequiredDay = day;
    return { ok: false, blocked: true, requiredDay: day, count: getGeneratedSocialCount(day, gate.season), message: '自动补生成失败，请重试' };
  } catch (e) {
    const message = String(e?.message || e || '推文生成失败');
    G.social.pendingRequiredDay = day;
    G.social.lastLLMError = message;
    return { ok: false, blocked: true, requiredDay: day, count: getGeneratedSocialCount(day, gate.season), message };
  }
}
function socialPlayerPostKey(day = G.dayNum, season = G.season) {
  return `${parseNum(season, 0)}_${parseNum(day, 0)}`;
}
function postPlayerTweet(text = '') {
  ensureSocialState();
  const cleaned = cleanSocialText(text || '');
  if (!cleaned) return { ok: false, message: '推文内容不能为空' };
  const day = parseNum(G.dayNum, 0);
  const key = socialPlayerPostKey(day, G.season);
  const used = parseNum(G.social.playerPostsByDay?.[key], 0);
  if (used >= 3) return { ok: false, message: '当天最多发 3 条推文' };
  const impact = analyzePlayerSocialText(cleaned, { mode: 'post' });
  const post = appendSocialPost({
    author: `@${String(G.player?.name || 'player').trim().replace(/\s+/g, '')}`,
    persona: '球员本人',
    text: cleaned,
    tone: impact.tone,
    likes: rng(80, 680),
    reposts: rng(8, 88),
    comments: [],
    isPlayer: true,
    day,
    season: G.season,
    year: G.year
  });
  if (!post) return { ok: false, message: '发布失败' };
  G.social.playerPostsByDay[key] = used + 1;
  const rep = applyReputationDelta({ fame: impact.fame, trust: impact.trust, source: '个人推文' });
  const responders = maybeCreateStarResponseForPlayerPost(post, cleaned, impact);
  appendPlayerStatementLog({
    day,
    season: G.season,
    title: '个人推文',
    type: 'social_post',
    text: cleaned,
    analysisText: impact.label
  });
  if (responders.length) {
    const names = responders.map(p => p.name).filter(Boolean).join('、');
    addNews(`📱 你的推文引来了球星互动：${names} 公开回应了你。`, impact.tone === 'negative' ? 'neg' : 'pos');
  }
  return { ok: true, post, impact: { ...impact, label: impact.label, fameDelta: rep.fameDelta, trustDelta: rep.trustDelta }, responders };
}
async function postPlayerTweetAsync(text = '') {
  return postPlayerTweet(text);
}
function replyToSocialPost(postId, text = '') {
  ensureSocialState();
  const target = (G.social.posts || []).find(p => String(p.id) === String(postId));
  if (!target) return { ok: false, message: '推文不存在' };
  if (target.isPlayer) return { ok: false, message: '不能回复自己的推文' };
  const key = String(postId);
  if (G.social.playerRepliedPostIds?.[key]) return { ok: false, message: '这条推文你已经回复过了' };
  const cleaned = cleanSocialText(text || '');
  if (!cleaned) return { ok: false, message: '回复内容不能为空' };
  const impact = analyzePlayerSocialText(cleaned, { targetPost: target, mode: 'reply' });
  target.comments = Array.isArray(target.comments) ? target.comments : [];
  target.comments.unshift({
    author: `@${String(G.player?.name || 'player').trim().replace(/\s+/g, '')}`,
    text: cleaned,
    likes: rng(4, 90)
  });
  target.likes = parseNum(target.likes, 0) + rng(6, 46);
  G.social.playerRepliedPostIds[key] = 1;
  const rep = applyReputationDelta({ fame: impact.fame, trust: impact.trust, source: '回复推文' });
  let relation = null;
  if (target.authorType === 'star' || String(target.playerRefKey || '').trim()) {
    const profile = getSocialStarProfileByRef({
      key: target.playerRefKey,
      playerId: target.playerId,
      teamId: target.teamId,
      name: target.playerName
    });
    if (profile) {
      relation = applySocialPlayerLinkDelta(profile, {
        affinityDelta: impact.relationAffinity,
        respectDelta: impact.relationRespect,
        heatDelta: impact.relationHeat,
        source: '回复球星推文'
      });
      const responseText = buildStarReplyComment(profile, resolveSocialLinkStatus(relation?.link), impact, target);
      target.comments.unshift({
        author: String(profile.handle || buildStarHandleFromName(profile.name, profile.teamAbbr)).trim(),
        text: responseText,
        likes: rng(20, 260)
      });
      addPhone('社媒提醒', `${profile.name} 看到了你的回复，并公开回了一句。`, 'info');
    }
  }
  appendPlayerStatementLog({
    day: parseNum(target.day, G.dayNum),
    season: parseNum(target.season, G.season),
    title: `回复 ${target.author || '推文'}`,
    type: 'social_reply',
    text: cleaned,
    analysisText: impact.label
  });
  return {
    ok: true,
    target,
    relation,
    impact: {
      ...impact,
      label: relation?.newStatus?.id && relation.newStatus.id !== 'neutral'
        ? `${impact.label} · ${relation.newStatus.label}`
        : impact.label,
      fameDelta: rep.fameDelta,
      trustDelta: rep.trustDelta
    }
  };
}
async function regenerateTodaySocialTweets() {
  ensureSocialState();
  const fallbackDay = Math.max(0, parseNum(G.dayNum, 0) - 1);
  const dayResult = G._latestDayResult || {
    day: fallbackDay,
    date: getDayDateString(fallbackDay),
    isGame: false,
    gameResult: null,
    events: []
  };
  const day = parseNum(dayResult.day, fallbackDay);
  const season = parseNum(G.season, 1);
  G.social.posts = (G.social.posts || []).filter(post => !(parseNum(post?.day, -999) === day && parseNum(post?.season, 0) === season && !post?.isPlayer));
  delete G.social.generatedDayCounts[socialGeneratedKey(day, season)];
  return generateDailySocialTweetsSmart(dayResult, { force: true });
}
function applyReputationDelta({ fame = 0, trust = 0, source = '' } = {}) {
  const ecoFx = getEconomyEffects();
  const scaleDelta = (value) => {
    const raw = parseNum(value, 0);
    if (!raw) return 0;
    const mult = raw > 0 ? parseNum(ecoFx.repPositiveMult, 1) : parseNum(ecoFx.repNegativeMult, 1);
    return raw > 0
      ? Math.max(1, Math.round(raw * mult))
      : -Math.max(1, Math.round(Math.abs(raw) * mult));
  };
  const oldFame = clamp(parseNum(G.player.fame, 10), 0, 100);
  const oldTrust = clamp(parseNum(G.player.trust, 50), 0, 100);
  G.player.fame = clamp(oldFame + scaleDelta(fame), 0, 100);
  G.player.trust = clamp(oldTrust + scaleDelta(trust), 0, 100);
  const fameDelta = G.player.fame - oldFame;
  const trustDelta = G.player.trust - oldTrust;
  if ((fameDelta || trustDelta) && source) {
    const parts = [];
    if (fameDelta) parts.push(`声望${fameDelta > 0 ? '+' : ''}${fameDelta}`);
    if (trustDelta) parts.push(`信任${trustDelta > 0 ? '+' : ''}${trustDelta}`);
    addNews(`📣 舆论反馈（${source}）：${parts.join(' / ')}`, fameDelta + trustDelta >= 0 ? 'pos' : 'neg');
  }
  return { fameDelta, trustDelta };
}
function ownedLuxurySet() {
  ensureEconomyState();
  return new Set((G.economy.ownedItems || []).map(x => String(x)));
}
function buildEconomyEffectSummary(item = {}) {
  const parts = [];
  if (parseNum(item.fame, 0)) parts.push(`声望 ${parseNum(item.fame, 0) > 0 ? '+' : ''}${parseNum(item.fame, 0)}`);
  if (parseNum(item.trust, 0)) parts.push(`信任 ${parseNum(item.trust, 0) > 0 ? '+' : ''}${parseNum(item.trust, 0)}`);
  if (parseNum(item.restBonus, 0)) parts.push(`休息恢复 +${parseNum(item.restBonus, 0)}`);
  if (parseNum(item.gameBonus, 0)) parts.push(`赛后恢复 +${parseNum(item.gameBonus, 0)}`);
  if (parseNum(item.xpMult, 1) > 1) parts.push(`训练 XP ×${parseNum(item.xpMult, 1).toFixed(2)}`);
  if (parseNum(item.injuryMult, 1) < 1) parts.push(`伤病风险 ×${parseNum(item.injuryMult, 1).toFixed(2)}`);
  if (parseNum(item.posRepMult, 1) > 1) parts.push(`正面舆论 ×${parseNum(item.posRepMult, 1).toFixed(2)}`);
  if (parseNum(item.socialHeatMult, 1) > 1) parts.push(`热度 ×${parseNum(item.socialHeatMult, 1).toFixed(2)}`);
  if (parseNum(item.marketScoreBonus, 0) > 0) parts.push(`市场分 +${parseNum(item.marketScoreBonus, 0)}`);
  if (parseNum(item.prepBonus, 0) > 0) parts.push(`赛前准备 +${parseNum(item.prepBonus, 0)}`);
  return parts.join(' | ') || '提升商业曝光与生涯体验';
}
function addCommercialMomentum({ label = '', cost = 0, extra = 0, source = '商业运作', quiet = false } = {}) {
  ensureEconomyState();
  const gain = clamp(Math.round(parseNum(cost, 0) * 0.7 + parseNum(extra, 0)), 1, 22);
  G.economy.totalSpent = +(parseNum(G.economy.totalSpent, 0) + Math.max(0, parseNum(cost, 0))).toFixed(2);
  G.economy.visibilityMomentum = clamp(getActiveVisibilityMomentum() + gain, 0, 120);
  G.economy.visibilityMomentumUntilDay = Math.max(parseNum(G.economy.visibilityMomentumUntilDay, -1), parseNum(G.dayNum, 0) + 5 + Math.round(parseNum(cost, 0)));
  if (!quiet && (parseNum(cost, 0) >= 6 || gain >= 7)) {
    addNews(`💼 商业热度上升：${label || source} 带动了额外曝光`, 'pos');
    addPhone('商业顾问', `${label || source} 开始发酵，品牌和媒体对你的关注正在升温。`, 'info');
  }
  return { gain, momentum: G.economy.visibilityMomentum, untilDay: G.economy.visibilityMomentumUntilDay };
}
function decayCommercialMomentum() {
  ensureEconomyState();
  const current = getActiveVisibilityMomentum();
  if (current <= 0) {
    G.economy.visibilityMomentum = 0;
    return 0;
  }
  G.economy.visibilityMomentum = clamp(current - 1.4, 0, 120);
  return G.economy.visibilityMomentum;
}
function buildCommercialOpportunityPool() {
  const ecoFx = getEconomyEffects();
  const identity = buildCommercialIdentityProfile();
  const pool = [
    { label: '本地电视专访', type: 'media_event', tag: '采访曝光', cash: 0.06, fame: 1, trust: 0, detail: '本地体育台录制了你的赛季专题' },
    { label: '城市球迷会见面日', type: 'media_event', tag: '城市活动', cash: 0.05, fame: 1, trust: 1, detail: '球迷互动和本地曝光一起抬升' }
  ];
  if (parseNum(ecoFx.fameTier, 0) >= 2) {
    pool.push(
      { label: '品牌短片拍摄', type: 'media_event', tag: '品牌曝光', cash: 0.12, fame: 2, trust: 0, detail: '短片上线后，商业讨论度明显升温' },
      { label: '城市公益活动', type: 'media_event', tag: '公益曝光', cash: 0.08, fame: 1, trust: 2, detail: '社区和媒体对你的好感同步提升' }
    );
  }
  if (parseNum(ecoFx.fameTier, 0) >= 3) {
    pool.push(
      { label: '综艺短访邀约', type: 'media_event', tag: '综艺曝光', cash: 0.18, fame: 2, trust: 0, detail: '这次露出把你推到了更大的受众面前' },
      { label: '高端品牌试探接触', type: 'brand_interest', tag: '品牌主动接触', cash: 0.1, fame: 1, trust: 1, detail: '品牌开始评估更高规格的合作报价', extraMomentum: 4 }
    );
  }
  if (parseNum(ecoFx.fameTier, 0) >= 4) {
    pool.push(
      { label: '封面人物拍摄', type: 'media_event', tag: '封面曝光', cash: 0.28, fame: 3, trust: 0, detail: '封面释出后，你的社媒讨论度继续抬升', extraMomentum: 5 },
      { label: '城市形象宣传片', type: 'media_event', tag: '城市活动', cash: 0.22, fame: 2, trust: 2, detail: '城市级活动开始把你当门面来用', extraMomentum: 4 }
    );
  }
  if (identity.groundedScore >= identity.flashyScore + 2) {
    pool.push({ label: '公益基金扩散报道', type: 'media_event', tag: '公益曝光', cash: 0.12, fame: 1, trust: 3, detail: '公益线的人设进一步坐实', extraMomentum: 3 });
  }
  if (identity.flashyScore >= identity.groundedScore + 2) {
    pool.push({ label: '生活方式大片', type: 'media_event', tag: '时尚曝光', cash: 0.2, fame: 3, trust: -1, detail: '张扬的生活方式再次冲上热搜', extraMomentum: 5 });
  }
  return pool;
}
function maybeTriggerCommercialOpportunity(result = null) {
  ensureEconomyState();
  const ecoFx = getEconomyEffects();
  if (parseNum(G.dayNum, 0) - parseNum(G.economy.lastOpportunityDay, -99) < 4) return null;
  let chance = clamp(parseNum(ecoFx.specialEventChance, 0.04), 0.02, 0.24);
  if (result?.isGame && result?.gameResult?.win) chance += 0.012;
  if (parseNum(ecoFx.visibilityMomentum, 0) >= 10) chance += 0.015;
  if (Math.random() >= chance) return null;
  const pool = buildCommercialOpportunityPool();
  if (!pool.length) return null;
  const evt = pool[rng(0, pool.length - 1)];
  adjustPlayerCash(parseNum(evt.cash, 0), evt.label);
  const rep = applyReputationDelta({ fame: parseNum(evt.fame, 0), trust: parseNum(evt.trust, 0), source: evt.label });
  addCommercialMomentum({ label: evt.label, cost: Math.max(0.6, parseNum(evt.cash, 0) * 16), extra: parseNum(evt.extraMomentum, 0), source: evt.label, quiet: true });
  addPhone('商业团队', `${evt.label} 已落地。${evt.detail} 收入 $${parseNum(evt.cash, 0).toFixed(2)}M。`, 'info');
  addEconomyLog(`商业机会：${evt.label}`, 'pos');
  emitPurchaseSocialBuzz({
    type: evt.type,
    label: evt.label,
    displayLabel: evt.label,
    tag: evt.tag,
    category: evt.tag,
    detail: `${evt.detail} 收入 $${parseNum(evt.cash, 0).toFixed(2)}M`,
    fame: rep.fameDelta,
    trust: rep.trustDelta,
    playerName: G.player?.name || '',
    teamName: G.team?.z || '',
    teamAbbr: G.team?.a || ''
  }, evt.tag);
  G.economy.lastOpportunityDay = parseNum(G.dayNum, 0);
  if (result && Array.isArray(result.events)) {
    const parts = [`收入 $${parseNum(evt.cash, 0).toFixed(2)}M`];
    if (rep.fameDelta) parts.push(`声望${rep.fameDelta > 0 ? '+' : ''}${rep.fameDelta}`);
    if (rep.trustDelta) parts.push(`信任${rep.trustDelta > 0 ? '+' : ''}${rep.trustDelta}`);
    result.events.push(`🎥 ${evt.label}：${parts.join(' / ')}`);
  }
  return evt;
}
function buildEconomyShopView() {
  ensureEconomyState();
  const ecoFx = getEconomyEffects();
  const staminaLevel = parseNum(G.economy.staminaCoachLevel, 0);
  const trainingLevel = parseNum(G.economy.trainingCoachLevel, 0);
  const recoveryLevel = parseNum(G.economy.recoveryTeamLevel, 0);
  const prLevel = parseNum(G.economy.prTeamLevel, 0);
  const agentLevel = parseNum(G.economy.agentTeamLevel, 0);
  const analyticsLevel = parseNum(G.economy.analyticsLevel, 0);
  const staminaCurrent = getStaminaCoachConfig(staminaLevel);
  const trainingCurrent = getTrainingCoachConfig(trainingLevel);
  const recoveryCurrent = getRecoveryTeamConfig(recoveryLevel);
  const prCurrent = getPRTeamConfig(prLevel);
  const agentCurrent = getAgentTeamConfig(agentLevel);
  const analyticsCurrent = getAnalyticsConfig(analyticsLevel);
  const staminaNext = STAMINA_COACH_MARKET[staminaLevel + 1] || null;
  const trainingNext = TRAINING_COACH_MARKET[trainingLevel + 1] || null;
  const recoveryNext = RECOVERY_TEAM_MARKET[recoveryLevel + 1] || null;
  const prNext = PR_TEAM_MARKET[prLevel + 1] || null;
  const agentNext = AGENT_TEAM_MARKET[agentLevel + 1] || null;
  const analyticsNext = ANALYTICS_SERVICE_MARKET[analyticsLevel + 1] || null;
  const owned = ownedLuxurySet();
  const facilityOwned = ownedFacilitySet();
  return {
    cash: +parseNum(G.player.cash, 0).toFixed(2),
    staminaLevel,
    trainingLevel,
    recoveryLevel,
    prLevel,
    agentLevel,
    analyticsLevel,
    staminaCurrent,
    trainingCurrent,
    recoveryCurrent,
    prCurrent,
    agentCurrent,
    analyticsCurrent,
    staminaNext,
    trainingNext,
    recoveryNext,
    prNext,
    agentNext,
    analyticsNext,
    profile: {
      privilegeLabel: ecoFx.fameTierLabel,
      commercialIdentity: ecoFx.commercialIdentity,
      visibilityMomentum: ecoFx.visibilityMomentum,
      totalSpent: ecoFx.totalSpent,
      activeDealCap: ecoFx.activeDealCap,
      specialEventChance: ecoFx.specialEventChance,
      perkList: ecoFx.perkList,
      endorsementScoreBonus: ecoFx.endorsementScoreBonus,
      socialHeatMult: ecoFx.socialHeatMult
    },
    facilities: FACILITY_MARKET.map(item => ({ ...item, owned: facilityOwned.has(String(item.id)), effectText: buildEconomyEffectSummary(item) })),
    luxury: LUXURY_MARKET.map(item => ({ ...item, image: buildLuxuryImage(item), owned: owned.has(String(item.id)), effectText: buildEconomyEffectSummary(item) })),
    logs: [...(G.economy.logs || [])]
  };
}
function emitPurchaseSocialBuzz(label, tag = '消费', meta = {}) {
  const event = normalizeCommercialEvent(label, tag, meta);
  const stored = recordCommercialEvent({ ...event, posted: true });
  if (!stored) return [];
  const post = createCommercialBuzzPost(stored, { day: stored.day, season: stored.season, year: stored.year });
  if (post) {
    appendSocialPost({
      ...post,
      day: parseNum(stored.day, Math.max(0, G.dayNum - 1)),
      season: parseNum(stored.season, G.season),
      year: parseNum(stored.year, G.year),
      ts: parseNum(stored.ts, Date.now())
    });
  }
  return post ? [post] : [];
}
function buyLevelUpgrade({ levelKey = '', market = [], maxMessage = '已满级', message = '', fame = 1, trust = 1, phoneFrom = '团队', buzzTag = '团队升级', eventType = 'coach_upgrade' } = {}) {
  ensureEconomyState();
  const cur = parseNum(G.economy[levelKey], 0);
  const next = market[cur + 1];
  if (!next) return { ok: false, reason: 'max', message: maxMessage };
  if (parseNum(G.player.cash, 0) < parseNum(next.cost, 0)) return { ok: false, reason: 'cash', message: '资金不足' };
  adjustPlayerCash(-next.cost, `聘请/升级 ${next.name}`);
  G.economy[levelKey] = next.level;
  addCommercialMomentum({ label: next.name, cost: parseNum(next.cost, 0), extra: parseNum(next.marketScoreBonus, 0) * 0.8, source: buzzTag });
  const rep = applyReputationDelta({ fame, trust, source: `启用${next.name}` });
  addPhone(phoneFrom, message || `${next.name} 已就位。`, 'info');
  emitPurchaseSocialBuzz({
    type: eventType,
    label: next.name,
    displayLabel: next.name,
    tag: buzzTag,
    category: buzzTag,
    detail: buildEconomyEffectSummary(next),
    fame: rep.fameDelta,
    trust: rep.trustDelta,
    playerName: G.player?.name || '',
    teamName: G.team?.z || '',
    teamAbbr: G.team?.a || ''
  }, buzzTag);
  return { ok: true, message: `已启用 ${next.name}`, rep };
}
function buyStaminaCoach() {
  return buyLevelUpgrade({
    levelKey: 'staminaCoachLevel',
    market: STAMINA_COACH_MARKET,
    maxMessage: '体能教练已满级',
    message: '体能恢复和赛后回补会更稳，负荷管理也更专业。',
    fame: 1,
    trust: 1,
    phoneFrom: '体能团队',
    buzzTag: '训练团队升级',
    eventType: 'coach_upgrade'
  });
}
function buyTrainingCoach() {
  return buyLevelUpgrade({
    levelKey: 'trainingCoachLevel',
    market: TRAINING_COACH_MARKET,
    maxMessage: '训练教练已满级',
    message: '训练强度和成长效率已经拉高，日常练习回报会更明显。',
    fame: 1,
    trust: 2,
    phoneFrom: '训练师',
    buzzTag: '训练团队升级',
    eventType: 'coach_upgrade'
  });
}
function buyRecoveryTeam() {
  return buyLevelUpgrade({
    levelKey: 'recoveryTeamLevel',
    market: RECOVERY_TEAM_MARKET,
    maxMessage: '康复团队已满级',
    message: '康复团队已接管理疗和伤后恢复，后续身体管理会更稳。',
    fame: 1,
    trust: 2,
    phoneFrom: '医疗团队',
    buzzTag: '康复团队升级',
    eventType: 'coach_upgrade'
  });
}
function buyPRTeam() {
  return buyLevelUpgrade({
    levelKey: 'prTeamLevel',
    market: PR_TEAM_MARKET,
    maxMessage: '公关团队已满级',
    message: '公关团队已上线。今后的舆论放大和危机缓冲都会更强。',
    fame: 2,
    trust: 1,
    phoneFrom: '公关主管',
    buzzTag: '公关团队升级',
    eventType: 'coach_upgrade'
  });
}
function buyAgentTeam() {
  return buyLevelUpgrade({
    levelKey: 'agentTeamLevel',
    market: AGENT_TEAM_MARKET,
    maxMessage: '经纪团队已满级',
    message: '经纪团队已开始推高你的报价和品牌池，后续谈判空间会更大。',
    fame: 2,
    trust: 1,
    phoneFrom: '经纪团队',
    buzzTag: '经纪团队升级',
    eventType: 'coach_upgrade'
  });
}
function buyAnalyticsService() {
  return buyLevelUpgrade({
    levelKey: 'analyticsLevel',
    market: ANALYTICS_SERVICE_MARKET,
    maxMessage: '数据分析服务已满级',
    message: '数据分析服务已接入，训练反馈和赛前准备都会更细。',
    fame: 1,
    trust: 2,
    phoneFrom: '数据分析师',
    buzzTag: '数据服务升级',
    eventType: 'coach_upgrade'
  });
}
function buyFacilityItem(itemId) {
  ensureEconomyState();
  const item = FACILITY_MARKET.find(x => String(x.id) === String(itemId));
  if (!item) return { ok: false, reason: 'invalid', message: '设施不存在' };
  const owned = ownedFacilitySet();
  if (owned.has(String(item.id))) return { ok: false, reason: 'owned', message: '已拥有该设施' };
  if (parseNum(G.player.cash, 0) < parseNum(item.cost, 0)) return { ok: false, reason: 'cash', message: '资金不足' };
  adjustPlayerCash(-item.cost, `购入 ${item.name}`);
  G.economy.ownedFacilities.push(item.id);
  addCommercialMomentum({ label: item.name, cost: parseNum(item.cost, 0), extra: parseNum(item.momentum, 0) + parseNum(item.marketScoreBonus, 0), source: '基础设施升级' });
  const rep = applyReputationDelta({ fame: parseNum(item.fame, 0), trust: parseNum(item.trust, 0), source: `启用${item.name}` });
  addPhone('资产经理', `${item.name} 已投入使用。${buildEconomyEffectSummary(item)}`, 'info');
  emitPurchaseSocialBuzz({
    type: 'facility_upgrade',
    label: item.name,
    displayLabel: item.name,
    tag: item.socialTag || '设施升级',
    category: item.socialTag || '设施升级',
    detail: buildEconomyEffectSummary(item),
    fame: rep.fameDelta,
    trust: rep.trustDelta,
    playerName: G.player?.name || '',
    teamName: G.team?.z || '',
    teamAbbr: G.team?.a || ''
  }, item.socialTag || '设施升级');
  return { ok: true, message: `已购入 ${item.name}`, rep };
}
function buyLuxuryItem(itemId) {
  ensureEconomyState();
  const item = LUXURY_MARKET.find(x => String(x.id) === String(itemId));
  if (!item) return { ok: false, reason: 'invalid', message: '商品不存在' };
  const owned = ownedLuxurySet();
  if (owned.has(String(item.id))) return { ok: false, reason: 'owned', message: '已拥有该资产' };
  if (parseNum(G.player.cash, 0) < parseNum(item.cost, 0)) return { ok: false, reason: 'cash', message: '资金不足' };
  adjustPlayerCash(-item.cost, `购入 ${item.name}`);
  G.economy.ownedItems.push(item.id);
  addCommercialMomentum({
    label: item.name,
    cost: parseNum(item.cost, 0),
    extra: /公益/.test(String(item.socialTag || '')) ? 4 : /豪宅|超跑|游艇|私人飞机/.test(String(item.socialTag || '')) ? 6 : 3,
    source: item.socialTag || '消费'
  });
  const rep = applyReputationDelta({ fame: parseNum(item.fame, 0), trust: parseNum(item.trust, 0), source: `购入${item.name}` });
  addPhone('私人助理', `已完成采购：${item.name}。`, 'info');
  emitPurchaseSocialBuzz({
    type: 'luxury_purchase',
    label: item.name,
    displayLabel: item.name,
    tag: item.socialTag || '消费',
    category: item.socialTag || '消费',
    brand: item.name,
    product: '',
    detail: `购买价 $${parseNum(item.cost, 0).toFixed(1)}M`,
    fame: rep.fameDelta,
    trust: rep.trustDelta,
    playerName: G.player?.name || '',
    teamName: G.team?.z || '',
    teamAbbr: G.team?.a || '',
    image: buildLuxuryImage(item)
  }, item.socialTag || '消费');
  return { ok: true, message: `已购入 ${item.name}`, rep };
}
const ENDORSEMENT_TIER_RULES = {
  1: { marketScore: 28, fame: 12, trust: 34, honor: 0, signing: 0.18, daily: 0.003, game: 0.006, termDays: 54 },
  2: { marketScore: 38, fame: 18, trust: 38, honor: 1, signing: 0.32, daily: 0.004, game: 0.008, termDays: 66 },
  3: { marketScore: 50, fame: 24, trust: 44, honor: 4, signing: 0.56, daily: 0.006, game: 0.012, termDays: 78 },
  4: { marketScore: 66, fame: 34, trust: 50, honor: 8, signing: 0.95, daily: 0.008, game: 0.016, termDays: 90 },
  5: { marketScore: 84, fame: 46, trust: 58, honor: 14, signing: 1.6, daily: 0.012, game: 0.024, termDays: 108 }
};
const ENDORSEMENT_CATEGORY_MODIFIERS = {
  gear: { score: -4, fame: -3, trust: 0, honor: 0, signingMult: 1.0, dailyMult: 1.05, gameMult: 1.1, termBonus: 0 },
  food: { score: -6, fame: -4, trust: 0, honor: 0, signingMult: 0.9, dailyMult: 0.95, gameMult: 1.0, termBonus: -6 },
  tech: { score: 0, fame: -1, trust: 0, honor: 0, signingMult: 1.05, dailyMult: 1.0, gameMult: 1.05, termBonus: 0 },
  auto: { score: 10, fame: 4, trust: 5, honor: 5, signingMult: 1.7, dailyMult: 1.45, gameMult: 1.4, termBonus: 12 },
  finance: { score: 12, fame: 3, trust: 7, honor: 6, signingMult: 1.6, dailyMult: 1.35, gameMult: 1.2, termBonus: 10 },
  fashion: { score: 4, fame: 2, trust: 2, honor: 1, signingMult: 1.3, dailyMult: 1.15, gameMult: 1.1, termBonus: 4 },
  beauty: { score: -4, fame: -2, trust: 3, honor: 0, signingMult: 0.85, dailyMult: 0.9, gameMult: 0.95, termBonus: -4 },
  game: { score: -2, fame: 0, trust: 0, honor: 0, signingMult: 1.0, dailyMult: 1.05, gameMult: 1.1, termBonus: 0 },
  public: { score: -3, fame: -1, trust: 6, honor: 2, signingMult: 0.8, dailyMult: 0.85, gameMult: 0.9, termBonus: 0 },
  city: { score: 2, fame: 1, trust: 5, honor: 1, signingMult: 1.0, dailyMult: 0.95, gameMult: 0.95, termBonus: 4 }
};
const ENDORSEMENT_CATEGORY_DEFS = [
  ['gear', '运动装备类', [
    { brand: '迅步', product: '签名鞋', tier: 1, kind: 'shoe', shoeEligible: true, shoeStyle: 'speed' },
    { brand: '铁卫', product: '训练护具', tier: 2, kind: 'gear' },
    { brand: '脉冲', product: '运动手表', tier: 3, kind: 'wearable' },
    { brand: '极光', product: '联名球衣', tier: 4, kind: 'apparel' },
    { brand: '冠军轨迹', product: '顶级签名鞋', tier: 5, kind: 'shoe', shoeEligible: true, shoeStyle: 'scoring' }
  ]],
  ['food', '饮料和食品类', [
    { brand: '能量泉', product: '运动饮料', tier: 1, kind: 'drink' },
    { brand: '冰极', product: '矿泉水', tier: 1, kind: 'drink' },
    { brand: '锋味', product: '蛋白棒', tier: 2, kind: 'food' },
    { brand: '燃点', product: '功能饮料', tier: 3, kind: 'drink' },
    { brand: '冠军补给', product: '轻食联名', tier: 4, kind: 'food' }
  ]],
  ['tech', '科技电子类', [
    { brand: '雷音', product: '运动耳机', tier: 1, kind: 'tech' },
    { brand: '智翼', product: '旗舰手机', tier: 2, kind: 'tech' },
    { brand: '星核', product: '游戏设备', tier: 3, kind: 'tech' },
    { brand: '闪步', product: '智能穿戴', tier: 4, kind: 'tech' },
    { brand: '镜界', product: '影像相机', tier: 5, kind: 'tech' }
  ]],
  ['auto', '汽车类', [
    { brand: '轮动', product: '高性能轮胎', tier: 1, kind: 'auto' },
    { brand: '远航', product: '出行平台', tier: 2, kind: 'auto' },
    { brand: '星驰', product: '新能源轿跑', tier: 3, kind: 'auto' },
    { brand: '纵横', product: '豪华SUV', tier: 4, kind: 'auto' },
    { brand: '极境', product: '性能轿跑', tier: 5, kind: 'auto' }
  ]],
  ['finance', '金融与商业服务类', [
    { brand: '快付', product: '数字钱包', tier: 1, kind: 'finance' },
    { brand: '竞篮', product: '联名信用卡', tier: 2, kind: 'finance' },
    { brand: '守护', product: '保险计划', tier: 3, kind: 'finance' },
    { brand: '稳盈', product: '投资平台', tier: 4, kind: 'finance' },
    { brand: '速联', product: '电商通讯服务', tier: 5, kind: 'finance' }
  ]],
  ['fashion', '时尚与生活方式类', [
    { brand: '霓裳', product: '潮牌联名', tier: 1, kind: 'fashion' },
    { brand: '轻奢行囊', product: '箱包', tier: 2, kind: 'fashion' },
    { brand: '银曜', product: '腕表', tier: 3, kind: 'fashion' },
    { brand: '星棱', product: '珠宝', tier: 4, kind: 'fashion' },
    { brand: '夜幕', product: '香氛', tier: 5, kind: 'fashion' }
  ]],
  ['beauty', '美妆与个人护理类', [
    { brand: '清野', product: '男士护肤', tier: 1, kind: 'beauty' },
    { brand: '速净', product: '洗护', tier: 2, kind: 'beauty' },
    { brand: '锋芒', product: '剃须', tier: 3, kind: 'beauty' },
    { brand: '活力', product: '口腔护理', tier: 4, kind: 'beauty' },
    { brand: '温和', product: '身体护理', tier: 5, kind: 'beauty' }
  ]],
  ['game', '游戏与娱乐类', [
    { brand: '篮火', product: '手游', tier: 1, kind: 'game' },
    { brand: '主机战线', product: '主机游戏', tier: 2, kind: 'game' },
    { brand: '赛场对决', product: '体育游戏联名', tier: 3, kind: 'game' },
    { brand: '全明星直播', product: '直播平台', tier: 4, kind: 'game' },
    { brand: '星途', product: '综艺合作', tier: 5, kind: 'game' }
  ]],
  ['public', '公益与社会形象类', [
    { brand: '青篮计划', product: '青少年篮球公益', tier: 1, kind: 'public' },
    { brand: '反毒行动', product: '社会倡导', tier: 2, kind: 'public' },
    { brand: '助学灯塔', product: '教育助学', tier: 3, kind: 'public' },
    { brand: '城市球场修复', product: '社区项目', tier: 4, kind: 'public' },
    { brand: '少年成长营', product: '长期公益大使', tier: 5, kind: 'public' }
  ]],
  ['city', '地方文旅与城市推广类', [
    { brand: '西部旅线', product: '文旅线路', tier: 1, kind: 'city' },
    { brand: '海港之城', product: '旅游城市推广', tier: 2, kind: 'city' },
    { brand: '地方好物', product: '城市品牌', tier: 3, kind: 'city' },
    { brand: '赛事之都', product: '国际赛事宣传', tier: 4, kind: 'city' },
    { brand: '城市节拍', product: '年度文旅大使', tier: 5, kind: 'city' }
  ]]
];
function getEndorsementTierRule(tier) {
  return ENDORSEMENT_TIER_RULES[clamp(parseNum(tier, 1), 1, 5)] || ENDORSEMENT_TIER_RULES[1];
}
function getEndorsementCategoryMod(categoryKey) {
  return ENDORSEMENT_CATEGORY_MODIFIERS[categoryKey] || ENDORSEMENT_CATEGORY_MODIFIERS.gear;
}
function makeEndorsementTemplate(categoryKey, categoryName, raw, index) {
  const template = {
    id: String(raw.id || `${categoryKey}_${index + 1}`),
    categoryKey,
    category: categoryName,
    brand: String(raw.brand || `品牌${index + 1}`),
    product: String(raw.product || '合作'),
    tier: clamp(parseNum(raw.tier, 1), 1, 5),
    kind: String(raw.kind || categoryKey),
    shoeEligible: !!raw.shoeEligible,
    shoeStyle: String(raw.shoeStyle || 'allaround'),
    note: String(raw.note || '')
  };
  template.exclusiveSlot = ENDORSEMENT_SINGLE_SLOT_CATEGORIES.has(String(categoryKey || '').toLowerCase()) ? categoryKey : '';
  template.image = buildEndorsementImage(template);
  return template;
}
function buildEndorsementCatalog() {
  return ENDORSEMENT_CATEGORY_DEFS.flatMap(([categoryKey, categoryName, items]) =>
    items.map((item, index) => makeEndorsementTemplate(categoryKey, categoryName, item, index))
  );
}
const ENDORSEMENT_CATALOG = buildEndorsementCatalog();
function defaultUserHonorCounter() {
  return {
    rings: 0,
    mvp: 0,
    fmvp: 0,
    dpoy: 0,
    allStar: 0,
    allNba1: 0,
    allNba2: 0,
    allNba3: 0,
    scoring: 0,
    rebound: 0,
    assist: 0,
    block: 0,
    steal: 0,
    sixthMan: 0,
    allStarMvp: 0
  };
}
function normalizeUserHonorCounter(raw = null) {
  const out = defaultUserHonorCounter();
  if (!raw || typeof raw !== 'object') return out;
  Object.keys(out).forEach(key => {
    out[key] = Math.max(0, Math.floor(parseNum(raw[key], 0)));
  });
  return out;
}
function addHonorTextToCounter(text, counter) {
  const value = String(text || '').trim();
  if (!value) return;
  const lower = value.toLowerCase();
  const hasFmvp = /fmvp|总决赛mvp|finals mvp/.test(lower) || /总决赛mvp/.test(value);
  const hasAllStarMvp = /全明星mvp|all[-\s]?star mvp/.test(lower);
  if (/总冠军|nba冠军|冠军|champion|title/.test(lower)) counter.rings += 1;
  if (hasFmvp) counter.fmvp += 1;
  if (!hasFmvp && /\bmvp\b/.test(lower)) counter.mvp += 1;
  if (/dpoy|最佳防守球员|defensive player of the year/.test(lower)) counter.dpoy += 1;
  if (/一阵|一队|all[-\s]?nba[\s-]*1|first team all nba/.test(lower)) counter.allNba1 += 1;
  if (/二阵|二队|all[-\s]?nba[\s-]*2|second team all nba/.test(lower)) counter.allNba2 += 1;
  if (/三阵|三队|all[-\s]?nba[\s-]*3|third team all nba/.test(lower)) counter.allNba3 += 1;
  if (/得分王|scoring champion/.test(lower)) counter.scoring += 1;
  if (/篮板王|rebound champion/.test(lower)) counter.rebound += 1;
  if (/助攻王|assist champion/.test(lower)) counter.assist += 1;
  if (/盖帽王|block champion/.test(lower)) counter.block += 1;
  if (/抢断王|steal champion/.test(lower)) counter.steal += 1;
  if (/最佳第六人|sixth man|6th man/.test(lower)) counter.sixthMan += 1;
  if (hasAllStarMvp) counter.allStarMvp += 1;
  if (hasAllStarMvp || /全明星|all[-\s]?star/.test(lower)) counter.allStar += 1;
}
function collectUserHonorCounterFromHistory() {
  const counter = defaultUserHonorCounter();
  const history = Array.isArray(G.allAwards) && G.allAwards.length
    ? G.allAwards
    : (Array.isArray(G.awards) ? G.awards : []);
  const stack = Array.isArray(history) ? [...history] : [history];
  while (stack.length) {
    const item = stack.shift();
    if (!item) continue;
    if (Array.isArray(item)) {
      stack.push(...item);
      continue;
    }
    if (typeof item === 'object') {
      if (item.champion) counter.rings += 1;
      if (Array.isArray(item.awards)) stack.push(...item.awards);
      else if (typeof item.awards === 'string') stack.push(item.awards);
      if (typeof item.title === 'string') addHonorTextToCounter(item.title, counter);
      if (typeof item.label === 'string') addHonorTextToCounter(item.label, counter);
      if (typeof item.name === 'string' && /mvp|dpoy|all[-\s]?nba|冠军|得分王|篮板王|助攻王|盖帽王|抢断王|第六人/i.test(item.name)) {
        addHonorTextToCounter(item.name, counter);
      }
      continue;
    }
    addHonorTextToCounter(item, counter);
  }
  return counter;
}
function buildPlayerHonorsSummary(honors = null) {
  const c = normalizeUserHonorCounter(honors || collectUserHonorCounterFromHistory());
  const labels = [
    ['rings', '总冠军'],
    ['mvp', 'MVP'],
    ['fmvp', 'FMVP'],
    ['dpoy', 'DPOY'],
    ['allStar', '全明星'],
    ['allStarMvp', '全明星MVP'],
    ['allNba1', '一阵'],
    ['allNba2', '二阵'],
    ['allNba3', '三阵'],
    ['scoring', '得分王'],
    ['rebound', '篮板王'],
    ['assist', '助攻王'],
    ['block', '盖帽王'],
    ['steal', '抢断王'],
    ['sixthMan', '最佳第六人']
  ];
  const parts = labels
    .filter(([key]) => parseNum(c[key], 0) > 0)
    .map(([key, label]) => `${label} x${parseNum(c[key], 0)}`);
  return parts.length ? parts.join(' / ') : '暂无荣誉';
}
function getPlayerEndorsementHonorScore(honors = null) {
  const c = normalizeUserHonorCounter(honors || (typeof collectUserHonorCounterFromHistory === 'function' ? collectUserHonorCounterFromHistory() : defaultUserHonorCounter()));
  return (
    parseNum(c.rings, 0) * 15 +
    parseNum(c.mvp, 0) * 20 +
    parseNum(c.fmvp, 0) * 14 +
    parseNum(c.dpoy, 0) * 10 +
    parseNum(c.allStar, 0) * 3 +
    parseNum(c.allNba1, 0) * 9 +
    parseNum(c.allNba2, 0) * 7 +
    parseNum(c.allNba3, 0) * 5 +
    parseNum(c.scoring, 0) * 5 +
    parseNum(c.rebound, 0) * 4 +
    parseNum(c.assist, 0) * 4 +
    parseNum(c.block, 0) * 4 +
    parseNum(c.steal, 0) * 4 +
    parseNum(c.sixthMan, 0) * 4 +
    parseNum(c.allStarMvp, 0) * 6
  );
}
function getEndorsementMarketLabel(score) {
  const s = parseNum(score, 0);
  if (s >= 110) return '门面级';
  if (s >= 95) return '超级巨星';
  if (s >= 78) return '全明星级';
  if (s >= 60) return '明星级';
  if (s >= 45) return '联盟关注';
  if (s >= 30) return '本地热度';
  return '新秀观察';
}
function buildEndorsementProfile() {
  const ecoFx = getEconomyEffects();
  const identity = buildCommercialIdentityProfile();
  const fame = clamp(parseNum(G.player.fame, 10), 0, 100);
  const trust = clamp(parseNum(G.player.trust, 50), 0, 100);
  const overall = typeof ovr === 'function' ? ovr(G.player.attrs || {}) : parseNum(G.player.tradeValue, 50);
  const gp = Math.max(parseNum(G.seasonStats?.gp, 0), 1);
  const ppg = parseNum(G.seasonStats?.pts, 0) / gp;
  const apg = parseNum(G.seasonStats?.ast, 0) / gp;
  const rpg = parseNum(G.seasonStats?.reb, 0) / gp;
  const teamRecord = G.leagueSeason?.teamRecords?.[G.teamId] || {};
  const teamGp = Math.max(parseNum(teamRecord.w, 0) + parseNum(teamRecord.l, 0), 1);
  const winPct = parseNum(teamRecord.w, 0) / teamGp;
  const honorCounts = typeof collectUserHonorCounterFromHistory === 'function' ? collectUserHonorCounterFromHistory() : defaultUserHonorCounter();
  const honorScore = getPlayerEndorsementHonorScore(honorCounts);
  const statsScore = clamp(
    overall * 0.22 +
    ppg * 0.8 +
    apg * 0.55 +
    rpg * 0.45 +
    winPct * 20,
    0,
    70
  );
  const identityBonus = identity.visibilityMomentum * 0.18 + identity.facilityScore * 1.15 + Math.max(0, identity.totalSpent - 5) * 0.18;
  const marketScore = clamp(statsScore + fame * 0.55 + trust * 0.25 + honorScore * 0.85 + parseNum(ecoFx.endorsementScoreBonus, 0) + identityBonus, 0, 155);
  return {
    playerName: String(G.player.name || '球员'),
    teamName: String(G.team?.z || ''),
    seasonYear: parseNum(G.season, 1),
    year: parseNum(G.year, 2025),
    fame,
    trust,
    overall,
    ppg: +ppg.toFixed(1),
    apg: +apg.toFixed(1),
    rpg: +rpg.toFixed(1),
    winPct: +winPct.toFixed(3),
    honorCounts,
    honorText: buildPlayerHonorsSummary(),
    honorScore,
    statsScore: +statsScore.toFixed(1),
    marketScore: +marketScore.toFixed(1),
    marketLabel: getEndorsementMarketLabel(marketScore),
    activeCount: Array.isArray(G.economy?.endorsements?.active) ? G.economy.endorsements.active.length : 0,
    maxActiveDeals: parseNum(ecoFx.activeDealCap, 8),
    fameTier: parseNum(ecoFx.fameTier, 0),
    fameTierLabel: String(ecoFx.fameTierLabel || '新秀观察'),
    commercialIdentity: String(ecoFx.commercialIdentity || identity.identityLabel || '上升新贵'),
    visibilityMomentum: parseNum(ecoFx.visibilityMomentum, 0),
    specialEventChance: parseNum(ecoFx.specialEventChance, 0),
    endorsementOfferMult: parseNum(ecoFx.endorsementOfferMult, 1),
    endorsementIncomeMult: parseNum(ecoFx.endorsementIncomeMult, 1),
    socialHeatMult: parseNum(ecoFx.socialHeatMult, 1),
    perkList: Array.isArray(ecoFx.perkList) ? [...ecoFx.perkList] : []
  };
}
function getEndorsementState() {
  ensureEconomyState();
  return G.economy.endorsements;
}
function evaluateEndorsementOffer(template, profile, state = null) {
  const tierRule = getEndorsementTierRule(template.tier);
  const categoryMod = getEndorsementCategoryMod(template.categoryKey);
  const minScore = Math.max(0, tierRule.marketScore + parseNum(categoryMod.score, 0));
  const minFame = Math.max(0, tierRule.fame + parseNum(categoryMod.fame, 0));
  const minTrust = Math.max(0, tierRule.trust + parseNum(categoryMod.trust, 0));
  const minHonor = Math.max(0, tierRule.honor + parseNum(categoryMod.honor, 0));
  const scale = clamp((0.8 + parseNum(profile?.marketScore, 0) / 160) * parseNum(profile?.endorsementOfferMult, 1), 0.85, 3.0);
  const activeState = state || getEndorsementState();
  const active = (activeState.active || []).find(x => String(x.id) === String(template.id)) || null;
  const rejectedSeason = parseNum(activeState.rejected?.[template.id], -1);
  const eligible = profile.marketScore >= minScore && profile.fame >= minFame && profile.trust >= minTrust && profile.honorScore >= minHonor;
  const lockReason = eligible ? '' : [
    profile.marketScore < minScore ? `市场分 ${minScore}` : '',
    profile.fame < minFame ? `声望 ${minFame}` : '',
    profile.trust < minTrust ? `信任 ${minTrust}` : '',
    profile.honorScore < minHonor ? `荣誉分 ${minHonor}` : ''
  ].filter(Boolean).join(' / ');
  const signingBonus = +(tierRule.signing * parseNum(categoryMod.signingMult, 1) * scale).toFixed(2);
  const dailyIncome = +(tierRule.daily * parseNum(categoryMod.dailyMult, 1) * scale).toFixed(3);
  const gameIncome = +(tierRule.game * parseNum(categoryMod.gameMult, 1) * scale).toFixed(3);
  const termDays = Math.max(30, Math.round((tierRule.termDays + parseNum(categoryMod.termBonus, 0)) * (0.9 + scale * 0.15)));
  const status = active ? 'active' : (rejectedSeason === parseNum(G.season, 1) ? 'rejected' : (eligible ? 'available' : 'locked'));
  return {
    ...template,
    status,
    eligible,
    active,
    lockReason,
    signingBonus,
    dailyIncome,
    gameIncome,
    termDays,
    marketScore: minScore,
    minFame,
    minTrust,
    minHonor,
    categoryLabel: template.category,
    scale: +scale.toFixed(2),
    activeCap: parseNum(profile?.maxActiveDeals, 8)
  };
}
function buildEndorsementOffersView() {
  const profile = buildEndorsementProfile();
  const state = getEndorsementState();
  const liveIncomeMult = clamp(parseNum(profile?.endorsementIncomeMult, 1), 1, 1.5);
  const categories = [];
  const seen = new Map();
  ENDORSEMENT_CATALOG.forEach(template => {
    const offer = evaluateEndorsementOffer(template, profile, state);
    if (!seen.has(template.categoryKey)) {
      seen.set(template.categoryKey, { key: template.categoryKey, name: template.category, items: [] });
      categories.push(seen.get(template.categoryKey));
    }
    seen.get(template.categoryKey).items.push(offer);
  });
  const activeDeals = (state.active || []).map(deal => ({
    ...deal,
    totalIncome: +((parseNum(deal.baseDailyIncome, 0) + parseNum(deal.baseGameIncome, 0) + parseNum(deal.shoe?.dailyIncome, 0) + parseNum(deal.shoe?.gameIncome, 0)) * liveIncomeMult).toFixed(3),
    remainingDays: parseNum(deal.remainingDays, 0)
  }));
  const totals = activeDeals.reduce((acc, deal) => {
    acc.daily += (parseNum(deal.baseDailyIncome, 0) + parseNum(deal.shoe?.dailyIncome, 0)) * liveIncomeMult;
    acc.game += (parseNum(deal.baseGameIncome, 0) + parseNum(deal.shoe?.gameIncome, 0)) * liveIncomeMult;
    return acc;
  }, { daily: 0, game: 0 });
  const summary = {
    catalogCount: ENDORSEMENT_CATALOG.length,
    activeCount: activeDeals.length,
    availableCount: categories.reduce((sum, c) => sum + c.items.filter(i => i.status === 'available').length, 0),
    lockedCount: categories.reduce((sum, c) => sum + c.items.filter(i => i.status === 'locked').length, 0),
    rejectedCount: categories.reduce((sum, c) => sum + c.items.filter(i => i.status === 'rejected').length, 0),
    marketScore: profile.marketScore,
    marketLabel: profile.marketLabel,
    fameTierLabel: profile.fameTierLabel,
    commercialIdentity: profile.commercialIdentity,
    visibilityMomentum: profile.visibilityMomentum,
    specialEventChance: profile.specialEventChance,
    maxActiveDeals: profile.maxActiveDeals,
    socialHeatMult: profile.socialHeatMult,
    perkList: profile.perkList,
    fame: profile.fame,
    trust: profile.trust,
    honorText: profile.honorText,
    honorScore: profile.honorScore,
    overall: profile.overall,
    ppg: profile.ppg,
    apg: profile.apg,
    rpg: profile.rpg,
    totalDailyIncome: +totals.daily.toFixed(3),
    totalGameIncome: +totals.game.toFixed(3),
    signatureShoe: state.signatureShoe || activeDeals.find(deal => deal && deal.shoe) || null
  };
  return { profile, summary, categories, activeDeals };
}
function applyEndorsementAttrBoosts(boosts, direction = 1) {
  if (!G.player?.attrs || !boosts) return;
  Object.entries(boosts).forEach(([k, v]) => {
    if (!Object.prototype.hasOwnProperty.call(G.player.attrs, k)) return;
    G.player.attrs[k] = clamp(parseNum(G.player.attrs[k], 0) + parseNum(v, 0) * direction, 25, 99);
  });
}

/* Signature shoe engine moved to assets/js/signature-shoe.js
const SIGNATURE_SHOE_SLOT_KEYS = ['speed', 'shooting', 'finishing', 'playmaking', 'defense'];
const SIGNATURE_SHOE_EFFECT_LABELS = {
  speed: '??',
  shooting: '??',
  finishing: '??',
  playmaking: '??',
  defense: '??',
  speedAttr: '??',
  shotExt: '??',
  shotInt: '??',
  pass: '??',
  stl: '??',
  blk: '??',
  physique: '??'
};
const SIGNATURE_SHOE_STYLE_DEFS = {
  speed: { label: '???', bonusKey: 'speed', priority: ['speed', 'shooting', 'playmaking', 'finishing', 'defense'] },
  scoring: { label: '???', bonusKey: 'shotExt', priority: ['shooting', 'finishing', 'speed', 'playmaking', 'defense'] },
  defense: { label: '???', bonusKey: 'stl', priority: ['defense', 'speed', 'playmaking', 'finishing', 'shooting'] },
  allaround: { label: '???', bonusKey: 'pass', priority: ['speed', 'shooting', 'finishing', 'playmaking', 'defense'] }
};
const SIGNATURE_SHOE_LEVEL_RULES = {
  1: { level: 1, label: '???', extraPoints: 0, fame: 0, earned: 0, days: 0 },
  2: { level: 2, label: '???', extraPoints: 2, fame: 30, earned: 0.35, days: 10 },
  3: { level: 3, label: '???', extraPoints: 2, fame: 45, earned: 0.95, days: 24 },
  4: { level: 4, label: '???', extraPoints: 3, fame: 60, earned: 1.9, days: 42 },
  5: { level: 5, label: '???', extraPoints: 3, fame: 75, earned: 3.5, days: 60 }
};
function normalizeSignatureShoeStyle(styleKey) {
  const key = String(styleKey || '').toLowerCase();
  return Object.prototype.hasOwnProperty.call(SIGNATURE_SHOE_STYLE_DEFS, key) ? key : 'allaround';
}
function getSignatureShoeStyleDef(styleKey) {
  return SIGNATURE_SHOE_STYLE_DEFS[normalizeSignatureShoeStyle(styleKey)] || SIGNATURE_SHOE_STYLE_DEFS.allaround;
}
function getSignatureShoeStylePriority(styleKey) {
  return getSignatureShoeStyleDef(styleKey).priority || SIGNATURE_SHOE_STYLE_DEFS.allaround.priority;
}
function getSignatureShoeUpgradeRule(level) {
  const lv = clamp(parseNum(level, 1), 1, 5);
  return SIGNATURE_SHOE_LEVEL_RULES[lv] || SIGNATURE_SHOE_LEVEL_RULES[1];
}
function getSignatureShoeBaseBudget() {
  return 5;
}
function getSignatureShoeDefaultAllocations(styleKey, budget = 5) {
  const out = { speed: 0, shooting: 0, finishing: 0, playmaking: 0, defense: 0 };
  const priority = getSignatureShoeStylePriority(styleKey);
  const total = Math.max(1, Math.floor(parseNum(budget, 5)));
  for (let i = 0; i < total; i++) {
    const key = priority[i % priority.length];
    out[key] += 1;
  }
  return out;
}
function normalizeSignatureShoeAllocations(raw, styleKey, budget = 5) {
  const out = { speed: 0, shooting: 0, finishing: 0, playmaking: 0, defense: 0 };
  if (raw && typeof raw === 'object') {
    SIGNATURE_SHOE_SLOT_KEYS.forEach(key => {
      out[key] = clamp(Math.floor(parseNum(raw[key], 0)), 0, 99);
    });
  }
  let total = SIGNATURE_SHOE_SLOT_KEYS.reduce((sum, key) => sum + parseNum(out[key], 0), 0);
  const target = Math.max(1, Math.floor(parseNum(budget, 5)));
  if (total === 0) return getSignatureShoeDefaultAllocations(styleKey, target);
  const priority = getSignatureShoeStylePriority(styleKey);
  if (total < target) {
    let i = 0;
    while (total < target) {
      const key = priority[i % priority.length];
      out[key] += 1;
      total += 1;
      i += 1;
    }
    return out;
  }
  if (total > target) {
    let guard = 0;
    while (total > target && guard < 300) {
      const key = priority[(priority.length - 1 - (guard % priority.length) + priority.length) % priority.length];
      if (out[key] > 0) {
        out[key] -= 1;
        total -= 1;
      }
      guard += 1;
    }
  }
  return out;
}
function spreadSignatureShoeAllocations(allocations, styleKey, extraPoints = 0) {
  const out = { ...(allocations || {}) };
  const priority = getSignatureShoeStylePriority(styleKey);
  let points = Math.max(0, Math.floor(parseNum(extraPoints, 0)));
  let i = 0;
  while (points > 0) {
    const key = priority[i % priority.length];
    out[key] = parseNum(out[key], 0) + 1;
    points -= 1;
    i += 1;
  }
  return out;
}
function formatSignatureShoeBoostText(boosts = {}) {
  return Object.entries(boosts || {})
    .filter(([, v]) => parseNum(v, 0) > 0)
    .map(([k, v]) => (SIGNATURE_SHOE_EFFECT_LABELS[k] || k) + '+' + parseNum(v, 0))
    .join(' ? ');
}
function sanitizeSignatureShoeName(raw, fallback = '') {
  const txt = String(raw || '').replace(/s+/g, ' ').trim();
  const base = txt || String(fallback || '').replace(/s+/g, ' ').trim();
  return base.slice(0, 28);
}
function calculateSignatureShoeIncome(contract, shoe = {}) {
  const tier = clamp(parseNum(contract?.tier, 1), 1, 5);
  const level = clamp(parseNum(shoe?.level, 1), 1, 5);
  const pointsBudget = Math.max(5, parseNum(shoe?.pointsBudget, getSignatureShoeBaseBudget(contract)));
  const fame = clamp(parseNum(G.player?.fame, 0), 0, 100);
  const trust = clamp(parseNum(G.player?.trust, 0), 0, 100);
  const honor = clamp(parseNum(typeof getPlayerEndorsementHonorScore === 'function' ? getPlayerEndorsementHonorScore() : 0, 0), 0, 300);
  const tierFactor = 0.95 + tier * 0.18;
  const fameFactor = 0.85 + fame / 100;
  const trustFactor = 0.9 + trust / 180;
  const honorFactor = 0.92 + honor / 220;
  const levelFactor = 1 + (level - 1) * 0.28;
  const budgetFactor = 1 + Math.max(0, pointsBudget - 5) * 0.05;
  const dailyIncome = +(0.0045 * tierFactor * fameFactor * trustFactor * honorFactor * levelFactor * budgetFactor).toFixed(3);
  const gameIncome = +(dailyIncome * (1.45 + level * 0.1)).toFixed(3);
  return {
    dailyIncome,
    gameIncome,
    revenueRate: +(dailyIncome * 30).toFixed(3),
    tierFactor,
    fameFactor,
    trustFactor,
    honorFactor,
    levelFactor,
    budgetFactor
  };
}
/* Signature shoe engine moved to assets/js/signature-shoe.js
  const styleLabel = String(shoe?.label || getSignatureShoeStyleDef(shoe?.styleKey).label || '???').trim();
  const boostText = String(shoe?.summary || formatSignatureShoeBoostText(shoe?.boosts || {})).trim();
  const revenueText = '??';
  const state = getEndorsementState();
  const profile = buildEndorsementProfile();
  const template = ENDORSEMENT_CATALOG.find(x => String(x.id) === String(offerId));
  if (!template) return { ok: false, reason: 'invalid', message: '代言不存在' };
  if (state.active.length >= 8) return { ok: false, reason: 'cap', message: '最多同时签约 8 个代言' };
  if (state.active.some(x => String(x.id) === String(offerId))) return { ok: false, reason: 'active', message: '这个代言已经签约了' };
  const offer = evaluateEndorsementOffer(template, profile, state);
  if (offer.status === 'locked') return { ok: false, reason: 'locked', message: `暂时未解锁：${offer.lockReason}` };
  if (offer.status === 'rejected') return { ok: false, reason: 'rejected', message: '这个代言本季已经拒绝过了' };
  if (offer.status === 'active') return { ok: false, reason: 'active', message: '这个代言已经在生效中' };
  const contract = {
    id: offer.id,
    categoryKey: offer.categoryKey,
    category: offer.category,
    brand: offer.brand,
    product: offer.product,
    tier: offer.tier,
    kind: offer.kind,
    signingBonus: offer.signingBonus,
    baseDailyIncome: offer.dailyIncome,
    baseGameIncome: offer.gameIncome,
    remainingDays: offer.termDays,
    earned: 0,
    shoeEligible: !!offer.shoeEligible,
    shoe: null,
    signedSeason: parseNum(G.season, 1),
    signedDay: parseNum(G.dayNum, 0)
  };
  state.active.unshift(contract);
  delete state.rejected[offer.id];
  adjustPlayerCash(offer.signingBonus, `签约代言 ${offer.brand}`);
  addPhone('代言经纪人', `已签下 ${offer.brand}（${offer.category}）代言，签约金 $${offer.signingBonus.toFixed(2)}M。`, 'info');
  addEconomyLog(`签约代言 ${offer.brand}（${offer.category}）`, 'pos');
  return { ok: true, message: `已签约 ${offer.brand}`, contract };
}
function rejectEndorsementOffer(offerId) {
  const state = getEndorsementState();
  const template = ENDORSEMENT_CATALOG.find(x => String(x.id) === String(offerId));
  if (!template) return { ok: false, reason: 'invalid', message: '代言不存在' };
  state.rejected[template.id] = parseNum(G.season, 1);
  addPhone('代言经纪人', `你拒绝了 ${template.brand} 的代言邀约。`, 'neu');
  addEconomyLog(`拒绝代言 ${template.brand}`, 'neu');
  return { ok: true, message: `已拒绝 ${template.brand}` };
}
*/
