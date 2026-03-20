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
function getEffortMode(id) { return EFFORT_MODES.find(m => m.id === id) || EFFORT_MODES[1]; }



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
    if (role?.minRange) { acc.minRange = role.minRange; acc.minTarget = parseNum(role.minTarget, acc.minTarget); }
    return acc;
  }, { usageMod: 0, astMod: 0, threeMod: 0, insideMod: 0, minTarget: 17, minRange: null });
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

  return roles;
}

// 体力恢复计算
function recoverStamina(options = {}) {
  const base = options.rest ? rng(18, 28) : rng(3, 8);
  const xfFx = getPlayerXFactorEffect(G.player);
  const regen = parseNum(xfFx.staminaRegen, 0);

  // Physique Bonus: (Physique - 60) / 8.  80 physique -> +2.5. 99 -> +5.
  const physique = parseNum(G.player.attrs?.physique, 60);
  const phyBonus = Math.max(0, Math.round((physique - 60) / 8));

  G.player.stamina = clamp(G.player.stamina + base + regen + phyBonus, 0, 100);
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
function normalizeDraftScoutingReport(parsed, context) {
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
    source: parsed?.source || fallback.source,
    ts: Date.now()
  };
}
function parseDraftScoutReportFromRaw(raw, context) {
  if (!raw) return fallbackDraftScoutingReport(context);
  if (typeof raw === 'object') return normalizeDraftScoutingReport(raw, context);
  const txt = String(raw).trim();
  if (!txt) return fallbackDraftScoutingReport(context);
  let parsed = tryParseJSONText(txt);
  if (!parsed) {
    const fixed = txt.replace(/^```json/i, '').replace(/^```/i, '').replace(/```$/, '').trim();
    parsed = tryParseJSONText(fixed);
  }
  if (!parsed) return fallbackDraftScoutingReport(context);
  return normalizeDraftScoutingReport(parsed, context);
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
  return parseDraftScoutReportFromRaw(raw, context);
}
async function generateDraftScoutingReportByLLM(context) {
  ensureSocialState();
  const llm = G.social.llm || {};
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
  const req = buildLLMRequestConfig(baseUrl, apiKey, endpoint);

  try {
    const res = await fetch(req.url, { method: 'POST', headers: req.headers, body: JSON.stringify(payload) });
    const data = await readJSONResponseSafe(res, '球探报告');
    const raw = data?.choices?.[0]?.message?.content || '';
    return parseDraftScoutReportFromRaw(raw, context);
  } catch (e) {
    console.warn('Draft report LLM failed:', e);
    return fallbackDraftScoutingReport(context);
  }
}

// ============ DAILY STORY GENERATOR ============
function getLuxuryItemsNames() {
  ensureEconomyState();
  if (!G.economy.ownedItems || !G.economy.ownedItems.length) return "无";
  return G.economy.ownedItems.join('、');
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
  lines.push(
    closeGame
      ? '【写作要求】最后分差接近，重点写末节或加时的收官对抗，但不要忽略前三节的铺垫。'
      : '【写作要求】这场比赛不是焦灼局，请按全场四节节奏写完整战报，第四节只作收束，不要把整篇写成末节独角戏。'
  );
  return { closeGame, finalMargin, hasOvertime, lines };
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
  const fga = clamp(Math.round(mins * usage * effortMult) + rng(-2, 2), 4, 28);

  // 三分出手率: 受倾向ex + 三分技能 + 位置偏好 + 角色加成
  const threeRate = clamp(0.08 + parseNum(attrs.shotExt, 55) / 260 + (tendencyEx - 50) / 500 + posThreeBias(pos) + roleFx.threeMod, 0.04, 0.58);
  const tpa = clamp(Math.round(fga * threeRate) + rng(-1, 1), 0, Math.min(14, fga));
  const nonThree = Math.max(0, fga - tpa);

  // 内线出手比例: 受倾向in + 内线技能, 中投倾向mid降低内线比例 + 角色加成
  const inShare = clamp(0.32 + parseNum(attrs.shotInt, 55) / 290 + (tendencyIn - 50) / 500 - (tendencyMid - 50) / 550 - (threeRate * 0.18) + roleFx.insideMod, 0.22, 0.76);
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
  const astBase = (mins / 36) * (0.7 + parseNum(attrs.pass, 55) / 24) * posAstFactor(pos);
  const rebBase = (mins / 36) * (1.1 + parseNum(attrs.reb, 55) / 18) * posRebFactor(pos);
  const stlBase = (mins / 36) * (parseNum(attrs.stl, 55) / 48) * posStlFactor(pos);
  const blkBase = (mins / 36) * (parseNum(attrs.blk, 55) / 48) * posBlkFactor(pos);
  const tovBase = (mins / 36) * (1 + fga / 8 + (pos <= 2 ? 0.65 : 0.25) - parseNum(attrs.pass, 55) / 95 - roleFx.astMod * 0.08);

  const ast = clamp(Math.round(astBase + roleFx.astMod + parseNum(fx.astFlat, 0)) + rng(-2, 2), 0, 14);
  const reb = clamp(Math.round(rebBase + parseNum(fx.rebFlat, 0)) + rng(-1, 2), 0, 20);
  const stl = clamp(Math.round(stlBase + parseNum(fx.stlFlat, 0)) + rng(0, 1) + parseNum(evMod.stl, 0), 0, 8);
  const blk = clamp(Math.round(blkBase + parseNum(fx.blkFlat, 0)) + rng(0, 1) + parseNum(evMod.blk, 0), 0, 8);
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

function checkInjury() {
  const fx = getPlayerXFactorEffect(G.player);
  const badgeFx = getBadgeEffects(G.player);
  const staminaStatus = getStaminaStatus(G.player.stamina);
  const ecoFx = getEconomyEffects();
  let chance = 0.008;
  if (fx.injuryMult) chance *= fx.injuryMult;
  if (badgeFx.injuryMult) chance *= badgeFx.injuryMult;
  // 使用体力状态的伤病倍率
  chance *= staminaStatus.injuryMult;
  chance *= clamp(parseNum(ecoFx.injuryMult, 1), 0.7, 1.2);
  if (parseNum(G._currentRoleMinutes, 24) >= 34) chance *= 1.18;
  // 努力程度影响伤病概率
  const effortCfg = getEffortMode(G._effortMode);
  chance *= effortCfg.injuryMult;
  if (Math.random() < chance) {
    const severe = Math.random() < 0.14;
    const games = severe ? rng(14, 45) : rng(2, 10);
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
      simulateLeagueMatchup(shuffled[i], shuffled[i + 1], { roundIndex: round });
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
  const ecoFx = getEconomyEffects();

  const isGame = isGameDay(G.dayNum);
  const result = { day: G.dayNum, date: getDayDateString(G.dayNum), isGame, events: [] };

  if (isGame && G.gameNum < 82) {
    // 比赛日
    const gameRes = playGame(G.gameNum);
    result.gameResult = gameRes;
    if (typeof buildMatchupContextForLLM === 'function') {
      result.matchup = buildMatchupContextForLLM(result, { limit: 3 });
    }
    result.events.push(`⚔️ 进行了第${G.gameNum}场比赛`);
    // 比赛后体力恢复少量
    G.player.stamina = clamp(G.player.stamina + rng(3, 8) + parseNum(ecoFx.gameStaminaBonus, 0), 0, 100);
  } else {
    // 休息日
    const staminaRec = rng(8, 15) + parseNum(ecoFx.restStaminaBonus, 0);
    G.player.stamina = clamp(G.player.stamina + staminaRec, 0, 100);
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
  tryAITrade();
  tryAIRenewal();
  triggerTradeRequest();
  checkPlayerRenewal();

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
  if (!Number.isFinite(parseNum(G.economy.salaryPaidSeason, NaN))) G.economy.salaryPaidSeason = parseNum(G.season, 1) - 1;
  G.economy.staminaCoachLevel = clamp(parseNum(G.economy.staminaCoachLevel, 0), 0, STAMINA_COACH_MARKET.length - 1);
  G.economy.trainingCoachLevel = clamp(parseNum(G.economy.trainingCoachLevel, 0), 0, TRAINING_COACH_MARKET.length - 1);
  if (!Array.isArray(G.economy.ownedItems)) G.economy.ownedItems = [];
  if (!Array.isArray(G.economy.logs)) G.economy.logs = [];
  if (!G.economy.endorsements || typeof G.economy.endorsements !== 'object') G.economy.endorsements = {};
  const e = G.economy.endorsements;
  if (!Array.isArray(e.active)) e.active = [];
  if (!e.rejected || typeof e.rejected !== 'object') e.rejected = {};
  if (!Number.isFinite(parseNum(e.lastPayoutDay, NaN))) e.lastPayoutDay = -1;
  if (!Number.isFinite(parseNum(e.lastRefreshSeason, NaN))) e.lastRefreshSeason = parseNum(G.season, 1);
  if (!e.signatureShoe || typeof e.signatureShoe !== 'object') e.signatureShoe = null;
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
  if (!Array.isArray(G.social.llmModels)) G.social.llmModels = [];
  if (!Number.isFinite(parseNum(G.social.llmModelsFetchedAt, NaN))) G.social.llmModelsFetchedAt = 0;
  if (!G.social.lastLLMTest || typeof G.social.lastLLMTest !== 'object') G.social.lastLLMTest = { ok: false, message: '', at: 0 };
  if (!G.social.llm || typeof G.social.llm !== 'object') {
    G.social.llm = { enabled: false, baseUrl: 'https://api.openai.com/v1', model: 'gpt-4.1-mini', apiKey: '' };
  }
  const llm = G.social.llm;
  if (typeof llm.enabled !== 'boolean') llm.enabled = false;
  if (!llm.baseUrl) llm.baseUrl = 'https://api.openai.com/v1';
  if (!llm.model) llm.model = 'gpt-4.1-mini';
  if (typeof llm.apiKey !== 'string') llm.apiKey = '';
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
function saveSocialLLMSettings({ enabled, baseUrl, model, apiKey, presets } = {}) {
  ensureSocialState();
  const llm = G.social.llm;
  if (typeof enabled === 'boolean') llm.enabled = enabled;
  if (baseUrl !== undefined) llm.baseUrl = normalizeLLMBaseUrl(baseUrl);
  if (model !== undefined) llm.model = String(model || 'gpt-4.1-mini').trim() || 'gpt-4.1-mini';
  if (apiKey !== undefined) llm.apiKey = String(apiKey || '').trim();
  if (presets !== undefined) llm.presets = normalizeLLMPresetConfig(presets);
  else llm.presets = normalizeLLMPresetConfig(llm.presets);
  try {
    localStorage.setItem('nba_social_llm_settings', JSON.stringify({
      enabled: !!llm.enabled,
      baseUrl: normalizeLLMBaseUrl(llm.baseUrl),
      model: String(llm.model || 'gpt-4.1-mini').trim() || 'gpt-4.1-mini',
      apiKey: String(llm.apiKey || '').trim(),
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
function getEconomyEffects() {
  ensureEconomyState();
  const sCfg = getStaminaCoachConfig();
  const tCfg = getTrainingCoachConfig();
  return {
    restStaminaBonus: parseNum(sCfg.restBonus, 0),
    gameStaminaBonus: parseNum(sCfg.gameBonus, 0),
    injuryMult: parseNum(sCfg.injuryMult, 1),
    xpMult: parseNum(tCfg.xpMult, 1)
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
function applyReputationDelta({ fame = 0, trust = 0, source = '' } = {}) {
  const oldFame = clamp(parseNum(G.player.fame, 10), 0, 100);
  const oldTrust = clamp(parseNum(G.player.trust, 50), 0, 100);
  G.player.fame = clamp(oldFame + parseNum(fame, 0), 0, 100);
  G.player.trust = clamp(oldTrust + parseNum(trust, 0), 0, 100);
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
function buildEconomyShopView() {
  ensureEconomyState();
  const staminaLevel = parseNum(G.economy.staminaCoachLevel, 0);
  const trainingLevel = parseNum(G.economy.trainingCoachLevel, 0);
  const staminaCurrent = getStaminaCoachConfig(staminaLevel);
  const trainingCurrent = getTrainingCoachConfig(trainingLevel);
  const staminaNext = STAMINA_COACH_MARKET[staminaLevel + 1] || null;
  const trainingNext = TRAINING_COACH_MARKET[trainingLevel + 1] || null;
  const owned = ownedLuxurySet();
  return {
    cash: +parseNum(G.player.cash, 0).toFixed(2),
    staminaLevel,
    trainingLevel,
    staminaCurrent,
    trainingCurrent,
    staminaNext,
    trainingNext,
    luxury: LUXURY_MARKET.map(item => ({ ...item, owned: owned.has(String(item.id)) })),
    logs: [...(G.economy.logs || [])]
  };
}
function emitPurchaseSocialBuzz(label, tag = '消费') {
  // 仅大模型生成推文，不再自动创建模板社交帖
  return [];
}
function buyStaminaCoach() {
  ensureEconomyState();
  const cur = parseNum(G.economy.staminaCoachLevel, 0);
  const next = STAMINA_COACH_MARKET[cur + 1];
  if (!next) return { ok: false, reason: 'max', message: '体能教练已满级' };
  if (parseNum(G.player.cash, 0) < parseNum(next.cost, 0)) return { ok: false, reason: 'cash', message: '资金不足' };
  adjustPlayerCash(-next.cost, `聘请 ${next.name}`);
  G.economy.staminaCoachLevel = next.level;
  const rep = applyReputationDelta({ fame: 1, trust: 1, source: `聘请${next.name}` });
  addPhone('经纪人', `你已聘请 ${next.name}，体能恢复和伤病管理将提升。`, 'info');
  emitPurchaseSocialBuzz(next.name, '训练团队升级');
  return { ok: true, message: `已聘请 ${next.name}`, rep };
}
function buyTrainingCoach() {
  ensureEconomyState();
  const cur = parseNum(G.economy.trainingCoachLevel, 0);
  const next = TRAINING_COACH_MARKET[cur + 1];
  if (!next) return { ok: false, reason: 'max', message: '训练教练已满级' };
  if (parseNum(G.player.cash, 0) < parseNum(next.cost, 0)) return { ok: false, reason: 'cash', message: '资金不足' };
  adjustPlayerCash(-next.cost, `聘请 ${next.name}`);
  G.economy.trainingCoachLevel = next.level;
  const rep = applyReputationDelta({ fame: 1, trust: 2, source: `聘请${next.name}` });
  addPhone('训练师', `${next.name} 已上岗，训练效率提升。`, 'info');
  emitPurchaseSocialBuzz(next.name, '训练团队升级');
  return { ok: true, message: `已聘请 ${next.name}`, rep };
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
  const rep = applyReputationDelta({ fame: parseNum(item.fame, 0), trust: parseNum(item.trust, 0), source: `购入${item.name}` });
  addPhone('私人助理', `已完成采购：${item.name}。`, 'info');
  emitPurchaseSocialBuzz(item.name, item.socialTag || '消费');
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
  return {
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
}
function buildEndorsementCatalog() {
  return ENDORSEMENT_CATEGORY_DEFS.flatMap(([categoryKey, categoryName, items]) =>
    items.map((item, index) => makeEndorsementTemplate(categoryKey, categoryName, item, index))
  );
}
const ENDORSEMENT_CATALOG = buildEndorsementCatalog();
function getPlayerEndorsementHonorScore(honors = null) {
  const c = honors || (typeof collectUserHonorCounterFromHistory === 'function' ? collectUserHonorCounterFromHistory() : defaultUserHonorCounter());
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
  const marketScore = clamp(statsScore + fame * 0.55 + trust * 0.25 + honorScore * 0.85, 0, 140);
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
    activeCount: Array.isArray(G.economy?.endorsements?.active) ? G.economy.endorsements.active.length : 0
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
  const scale = clamp(0.8 + parseNum(profile?.marketScore, 0) / 160, 0.85, 2.5);
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
    scale: +scale.toFixed(2)
  };
}
function buildEndorsementOffersView() {
  const profile = buildEndorsementProfile();
  const state = getEndorsementState();
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
    totalIncome: +(parseNum(deal.baseDailyIncome, 0) + parseNum(deal.baseGameIncome, 0) + parseNum(deal.shoe?.dailyIncome, 0) + parseNum(deal.shoe?.gameIncome, 0)).toFixed(3),
    remainingDays: parseNum(deal.remainingDays, 0)
  }));
  const totals = activeDeals.reduce((acc, deal) => {
    acc.daily += parseNum(deal.baseDailyIncome, 0) + parseNum(deal.shoe?.dailyIncome, 0);
    acc.game += parseNum(deal.baseGameIncome, 0) + parseNum(deal.shoe?.gameIncome, 0);
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
    signatureShoe: state.signatureShoe || null
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
function buildSignatureShoeBoosts(offer, styleKey) {
  const tier = clamp(parseNum(offer?.tier, 1), 1, 5);
  const style = String(styleKey || offer?.shoeStyle || 'allaround');
  const base = {
    speed: { speed: 2, shotExt: 1 },
    scoring: { shotExt: 2, shotInt: 1 },
    defense: { stl: 1, blk: 2, physique: 1 },
    allaround: { pass: 1, speed: 1, shotExt: 1, shotInt: 1 }
  };
  const boosts = { ...(base[style] || base.allaround) };
  const bonus = Math.max(0, Math.floor((tier - 1) / 2));
  Object.keys(boosts).forEach(k => { boosts[k] = parseNum(boosts[k], 0) + bonus; });
  const pos = parseNum(G.player?.pos, 0);
  if (pos <= 1) {
    boosts.speed = parseNum(boosts.speed, 0) + 1;
    boosts.shotExt = parseNum(boosts.shotExt, 0) + 1;
  } else if (pos === 2 || pos === 3) {
    boosts.shotExt = parseNum(boosts.shotExt, 0) + 1;
    boosts.pass = parseNum(boosts.pass, 0) + 1;
  } else {
    boosts.reb = parseNum(boosts.reb, 0) + 1;
    boosts.blk = parseNum(boosts.blk, 0) + 1;
  }
  const dailyIncome = +(0.003 + tier * 0.0015).toFixed(3);
  const gameIncome = +(0.006 + tier * 0.002).toFixed(3);
  const label = style === 'speed' ? '速度型' : style === 'scoring' ? '得分型' : style === 'defense' ? '防守型' : '全能型';
  return { boosts, dailyIncome, gameIncome, label, styleKey: style };
}
function acceptEndorsementOffer(offerId) {
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
function createSignatureShoeForOffer(offerId, styleKey = 'allaround') {
  const state = getEndorsementState();
  const contract = (state.active || []).find(x => String(x.id) === String(offerId));
  if (!contract) return { ok: false, reason: 'inactive', message: '请先签下这份球鞋代言' };
  if (!contract.shoeEligible) return { ok: false, reason: 'unsupported', message: '这份代言不支持自创球鞋' };
  const offer = ENDORSEMENT_CATALOG.find(x => String(x.id) === String(offerId));
  if (!offer) return { ok: false, reason: 'invalid', message: '代言不存在' };
  if (state.signatureShoe?.boosts) {
    applyEndorsementAttrBoosts(state.signatureShoe.boosts, -1);
  }
  const shoe = buildSignatureShoeBoosts(contract, styleKey);
  applyEndorsementAttrBoosts(shoe.boosts, 1);
  const shoeName = `${G.player?.name || '球员'} × ${contract.brand} ${shoe.label}`;
  const oldShoeContract = state.active.find(x => x.shoe && String(x.id) !== String(contract.id));
  if (oldShoeContract) oldShoeContract.shoe = null;
  contract.shoe = {
    name: shoeName,
    styleKey: shoe.styleKey,
    label: shoe.label,
    boosts: shoe.boosts,
    dailyIncome: shoe.dailyIncome,
    gameIncome: shoe.gameIncome,
    createdDay: parseNum(G.dayNum, 0),
    createdSeason: parseNum(G.season, 1)
  };
  state.signatureShoe = {
    contractId: contract.id,
    ...contract.shoe
  };
  addPhone('球鞋工坊', `已打造自创球鞋：${shoeName}，属性提升并解锁持续分成。`, 'pos');
  addEconomyLog(`打造自创球鞋 ${shoeName}`, 'pos');
  return { ok: true, message: `已打造 ${shoeName}`, shoe: contract.shoe };
}
function settleEndorsementIncome(dayResult) {
  const state = getEndorsementState();
  const day = parseNum(dayResult?.day, parseNum(G.dayNum, 0));
  if (parseNum(state.lastPayoutDay, -1) === day) return { ok: false, amount: 0, expired: 0 };
  const isGame = !!dayResult?.isGame;
  let total = 0;
  const expired = [];
  state.active = (state.active || []).map(contract => {
    if (!contract) return null;
    const payout = parseNum(contract.baseDailyIncome, 0) + (isGame ? parseNum(contract.baseGameIncome, 0) : 0) +
      parseNum(contract.shoe?.dailyIncome, 0) + (isGame ? parseNum(contract.shoe?.gameIncome, 0) : 0);
    if (payout > 0) {
      total += payout;
      contract.earned = +(parseNum(contract.earned, 0) + payout).toFixed(3);
    }
    contract.remainingDays = parseNum(contract.remainingDays, 0) - 1;
    if (contract.remainingDays <= 0) {
      if (contract.shoe?.boosts) applyEndorsementAttrBoosts(contract.shoe.boosts, -1);
      if (state.signatureShoe && String(state.signatureShoe.contractId) === String(contract.id)) {
        state.signatureShoe = null;
      }
      expired.push(contract);
      return null;
    }
    return contract;
  }).filter(Boolean);
  state.lastPayoutDay = day;
  if (total > 0) {
    adjustPlayerCash(total, `代言收入${isGame ? '（比赛日）' : ''}`);
    addEconomyLog(`代言入账 $${total.toFixed(3)}M`, 'pos');
  }
  if (expired.length) {
    addPhone('代言经纪人', `${expired.length} 个代言合约到期：${expired.slice(0, 3).map(x => x.brand).join('、')}`, 'warn');
    addEconomyLog(`代言合约到期：${expired.slice(0, 3).map(x => x.brand).join('、')}`, 'neu');
  }
  return { ok: total > 0 || expired.length > 0, amount: +total.toFixed(3), expired: expired.length };
}
function cleanSocialText(text) {
  return String(text || '').replace(/\s+/g, ' ').trim().slice(0, 280);
}
function sanitizeSocialGeneratedText(text) {
  let out = cleanSocialText(text);
  out = out
    .replace(/\bOVR\s*[:：]?\s*\d{1,3}\b/gi, '')
    .replace(/\b\d{1,3}\s*OVR\b/gi, '')
    .replace(/\bPOT\s*[:：]?\s*\d{1,3}\b/gi, '')
    .replace(/\b\d{1,3}\s*POT\b/gi, '')
    .replace(/综合评分\\s*[:：]?\\s*\\d{1,3}/g, '')
    .replace(/能力值\\s*[:：]?\\s*\\d{1,3}/g, '')
    .replace(/\\s{2,}/g, ' ')
    .trim();
  if (typeof applySillyTavernRegex === 'function') {
    out = applySillyTavernRegex(out, false);
  }
  return out;
}
function sanitizeDraftNarrativeText(text, context = null) {
  let out = sanitizeSocialGeneratedText(text);
  const ctx = context || buildDailySocialContext(null);
  const draft = ctx?.draft || {};
  const classYear = parseNum(draft.classYear, 0);
  const pickNo = parseNum(draft.pick, 0);
  const topNames = Array.isArray(draft.topNames) ? draft.topNames.filter(Boolean) : [];

  if (classYear > 0) {
    out = out.replace(/(\d{2,4})年这届新秀/g, `${classYear}年这届新秀`);
    out = out.replace(/(\d{2,4})届新秀/g, `${classYear}届新秀`);
  }
  if (classYear > 0 && /这届新秀太强|压力不小/.test(out) && topNames.length) {
    out = out.replace(/[^。！？]*新秀[^。！？]*/g, `${classYear}年这届新秀竞争激烈，像${topNames.slice(0, 3).join('、')}这样的球员都在同届`);
  }
  if (pickNo === 1) {
    out = out
      .replace(/落选秀|次轮秀|非知名新秀|无名新秀|没什么名气的新秀/g, '状元秀')
      .replace(/没什么名气的新秀控卫|状元秀控卫/g, '状元后卫')
      .replace(/作为一个状元秀或者状元秀/g, '作为状元秀');
    if (/签了个状元后卫/.test(out) && draft.team) {
      out = out.replace(/签了个状元后卫/g, `${draft.team}用状元签拿下新核心`);
    }
  } else if (pickNo > 0 && pickNo <= 5) {
    out = out.replace(/落选秀|次轮秀|非知名新秀|无名新秀|没什么名气的新秀/g, '高顺位新秀');
  }
  out = out.replace(/\s{2,}/g, ' ').trim();
  return out;
}
function nextSocialPostId() {
  ensureSocialState();
  const id = parseNum(G.social.nextPostId, 1);
  G.social.nextPostId = id + 1;
  return id;
}
function appendSocialPost(rawPost) {
  ensureSocialState();
  const now = Date.now();
  const postId = nextSocialPostId();
  const post = {
    id: postId,
    day: parseNum(rawPost?.day, Math.max(0, G.dayNum - 1)),
    season: parseNum(rawPost?.season, G.season),
    year: parseNum(rawPost?.year, G.year),
    author: String(rawPost?.author || '@匿名用户'),
    persona: String(rawPost?.persona || '中立型'),
    tone: String(rawPost?.tone || 'neutral'),
    text: sanitizeSocialGeneratedText(rawPost?.text || ''),
    likes: clamp(parseNum(rawPost?.likes, rng(30, 260)), 0, 999999),
    reposts: clamp(parseNum(rawPost?.reposts, rng(6, 120)), 0, 999999),
    isPlayer: !!rawPost?.isPlayer,
    ts: parseNum(rawPost?.ts, now),
    comments: []
  };
  const rawComments = Array.isArray(rawPost?.comments) ? rawPost.comments : [];
  post.comments = rawComments.slice(0, 8).map((c, idx) => ({
    id: `${post.id}_c${idx + 1}`,
    author: String(c?.author || pick(SOCIAL_COMMENTERS)),
    persona: String(c?.persona || '中立型'),
    tone: String(c?.tone || 'neutral'),
    text: sanitizeSocialGeneratedText(c?.text || ''),
    likes: clamp(parseNum(c?.likes, rng(1, 120)), 0, 99999),
    parentId: c?.parentId ? String(c.parentId) : '',
    fromPlayer: !!c?.fromPlayer,
    ts: parseNum(c?.ts, now + idx)
  }));
  G.social.posts.unshift(post);
  if (G.social.posts.length > 420) G.social.posts.splice(420);
  return post;
}
function getSocialTimeline(limit = 80) {
  ensureSocialState();
  const context = buildDailySocialContext(null);
  return [...(G.social.posts || [])]
    .sort((a, b) => parseNum(b.ts, 0) - parseNum(a.ts, 0))
    .slice(0, Math.max(1, parseNum(limit, 80)))
    .map(p => ({
      ...p,
      text: sanitizeDraftNarrativeText(p?.text || '', context),
      comments: (Array.isArray(p?.comments) ? p.comments : []).map(c => ({
        ...c,
        text: sanitizeDraftNarrativeText(c?.text || '', context)
      }))
    }));
}
function getSocialPostById(postId) {
  ensureSocialState();
  return (G.social.posts || []).find(p => String(p.id) === String(postId)) || null;
}
function buildLeagueSnapshotForLLM() {
  ensureLeagueStateShape();
  const records = G.leagueSeason.teamRecords || {};
  const standings = TEAMS.map(t => {
    const r = records[t.id] || { w: 0, l: 0 };
    return { name: t.z, abbr: t.a, w: r.w, l: r.l };
  }).sort((a, b) => b.w - a.w || a.l - b.l);
  const top5 = standings.slice(0, 5).map(t => `${t.name}(${t.w}-${t.l})`);
  const bot3 = standings.slice(-3).map(t => `${t.name}(${t.w}-${t.l})`);

  const ps = G.leagueSeason.playerStats || {};
  const leaders = Object.values(ps)
    .filter(p => p.gp >= 3)
    .map(p => ({ name: p.name, team: TEAMS.find(t => t.id === p.teamId)?.z || '', gp: p.gp, ppg: +(p.pts / p.gp).toFixed(1), apg: +(p.ast / p.gp).toFixed(1), rpg: +(p.reb / p.gp).toFixed(1) }));
  const scorers = [...leaders].sort((a, b) => b.ppg - a.ppg).slice(0, 5).map(p => `${p.name}(${p.team}) ${p.ppg}分`);
  const assisters = [...leaders].sort((a, b) => b.apg - a.apg).slice(0, 3).map(p => `${p.name}(${p.team}) ${p.apg}助`);
  const rebounders = [...leaders].sort((a, b) => b.rpg - a.rpg).slice(0, 3).map(p => `${p.name}(${p.team}) ${p.rpg}板`);

  return { top5, bot3, scorers, assisters, rebounders };
}
function buildPlayerHonorsSummary() {
  const c = typeof collectUserHonorCounterFromHistory === 'function' ? collectUserHonorCounterFromHistory() : {};
  const parts = [];
  if (c.rings) parts.push(`${c.rings}次总冠军`);
  if (c.mvp) parts.push(`${c.mvp}次MVP`);
  if (c.fmvp) parts.push(`${c.fmvp}次FMVP`);
  if (c.dpoy) parts.push(`${c.dpoy}次DPOY`);
  if (c.allStar) parts.push(`${c.allStar}次全明星`);
  if (c.allNba1) parts.push(`${c.allNba1}次最佳一阵`);
  if (c.scoring) parts.push(`${c.scoring}次得分王`);
  if (c.assist) parts.push(`${c.assist}次助攻王`);
  if (c.rebound) parts.push(`${c.rebound}次篮板王`);
  return parts.length ? parts.join('、') : '暂无荣誉';
}
function getNextDraftClassPreview() {
  const nextYear = G.year + 1;
  if (G._nextDraftPreview && G._nextDraftPreview.year === nextYear) return G._nextDraftPreview;
  try {
    const dc = generateDraftClass(20, { targetYear: nextYear });
    const sorted = dc.players
      .map(p => ({ name: p.name, pos: posLabel(p.pos), age: parseNum(p.age, 19), info: String(p.info || '').slice(0, 60) }))
      .slice(0, 8);
    const tier = dc.tier === 'big' ? '大年' : dc.tier === 'weak' ? '小年' : '正常年';
    G._nextDraftPreview = { year: nextYear, tier, prospects: sorted };
    return G._nextDraftPreview;
  } catch (e) { return null; }
}
function buildDailySocialContext(dayResult) {
  const res = dayResult || {};
  const gameRes = res.gameResult || null;
  const gp = Math.max(parseNum(G.seasonStats.gp, 0), 1);
  const draftYear = parseNum(G.draftBoard?.year, parseNum(G.startYear, G.year));
  const topProspects = getDraftClassTopNames(5);
  const matchup = res.matchup || (gameRes ? buildMatchupContextForLLM(res, { limit: 3 }) : null);
  const gameStory = gameRes ? buildGameStoryNarrativeContext(res, matchup) : null;
  return {
    date: res.date || getDayDateString(Math.max(0, parseNum(G.dayNum, 1) - 1)),
    day: parseNum(res.day, Math.max(0, parseNum(G.dayNum, 1) - 1)),
    season: G.season,
    year: G.year,
    team: { id: G.teamId, name: G.team?.z || '', abbr: G.team?.a || '' },
    record: { wins: parseNum(G.seasonStats.wins, 0), losses: parseNum(G.seasonStats.losses, 0) },
    player: {
      name: G.player.name,
      pos: posLabel(G.player.pos),
      ppg: +(parseNum(G.seasonStats.pts, 0) / gp).toFixed(1),
      apg: +(parseNum(G.seasonStats.ast, 0) / gp).toFixed(1),
      rpg: +(parseNum(G.seasonStats.reb, 0) / gp).toFixed(1),
      seasonYear: parseNum(G.season, 1),
      rookieSeason: parseNum(G.season, 1) === 1,
      fame: parseNum(G.player.fame, 10),
      trust: parseNum(G.player.trust, 50),
      honors: buildPlayerHonorsSummary()
    },
    draft: {
      classYear: draftYear,
      pick: parseNum(G.draftPick, 0),
      tier: String(G.draftBoard?.tier || ''),
      topNames: topProspects,
      team: G.team?.z || ''
    },
    gameToday: !!res.isGame,
    gameStory,
    gameResult: gameRes ? {
      gameId: String(gameRes.gameId || ''),
      teamId: parseNum(G.teamId, 0),
      teamName: G.team?.z || '',
      teamAbbr: G.team?.a || '',
      win: !!gameRes.win,
      oppId: parseNum(gameRes.opp?.id, 0),
      oppName: gameRes.opp?.z || gameRes.opp?.a || '--',
      oppAbbr: gameRes.opp?.a || gameRes.opp?.z || '--',
      teamPts: parseNum(gameRes.teamPts, 0),
      oppPts: parseNum(gameRes.oppPts, 0),
      finalMargin: Math.abs(parseNum(gameRes.teamPts, 0) - parseNum(gameRes.oppPts, 0)),
      hasOvertime: !!gameStory?.hasOvertime,
      clutch: !!gameStory?.closeGame,
      clutchMargin: parseNum(matchup?.flow?.clutchMargin, 0),
      summary: String(matchup?.flow?.summary || ''),
      periodLabels: Array.isArray(matchup?.flow?.periodLabels) ? [...matchup.flow.periodLabels] : ['Q1', 'Q2', 'Q3', 'Q4'],
      myPeriods: Array.isArray(matchup?.flow?.myPeriods) ? [...matchup.flow.myPeriods] : [],
      oppPeriods: Array.isArray(matchup?.flow?.oppPeriods) ? [...matchup.flow.oppPeriods] : [],
      pts: parseNum(gameRes.st?.pts, 0),
      reb: parseNum(gameRes.st?.reb, 0),
      ast: parseNum(gameRes.st?.ast, 0),
      stl: parseNum(gameRes.st?.stl, 0),
      blk: parseNum(gameRes.st?.blk, 0),
      grade: parseNum(gameRes.grade, 0),
      matchup
    } : null,
    hotNews: (G.news || []).slice(0, 6).map(n => n.text),
    recentStories: (G.storyLog && G.storyLog.length > 0) ? G.storyLog.slice(-3).map(s => typeof s === 'string' ? s.replace(/<[^>]+>/g, '').trim() : '').filter(Boolean) : [],
    league: buildLeagueSnapshotForLLM(),
    nextDraft: parseNum(G.seasonStats?.gp, 0) >= 40 ? getNextDraftClassPreview() : null,
    matchup
  };
}
const LLM_STYLE_PRESET_MAP = {
  '白描': '【文风：白描】用简洁动作、短句和对白推进，不堆砌形容词，重要节点再点一下即可。',
  '基础文风': '【文风：白描】用简洁动作、短句和对白推进，不堆砌形容词，重要节点再点一下即可。',
  'TG推荐文风': '【文风：日常白描】平时不炫技、关键处点睛，动作和对白推进，少做空泛抒情。',
  'TG推荐文风2': '【文风：中国风中文】用动作串起句子，少堆修饰词，句子讲究节奏，逻辑靠语义自然呈现。',
  '纯爱文风': '【文风：自然克制】语言干净自然，情感通过动作和眼神流露，不要过度煽情。',
  '轻小说文风': '【文风：轻小说】对话和动作驱动剧情，场景要有画面感，但不要喧宾夺主。',
  '热血': '【文风：热血】可以更有张力和节奏感，但仍要以场上动作、对位和结果为中心，不要夸张失真。',
  '数据流': '【文风：数据流】允许穿插简短数据、对位和攻防判断，但不要写成表格或报表。',
  '纪实': '【文风：纪实】语气克制，重事实、场面和人物反应，少空话，少主观感叹。',
  '吐槽': '【文风：轻松吐槽】可以带一点轻松评价和梗，但不能偏离比赛事实和人物一致性。'
};
function normalizeLLMPresetConfig(raw = {}) {
  const src = raw && typeof raw === 'object' ? raw : {};
  const style = String(src.style || '白描').trim() || '白描';
  return {
    enabled: src.enabled !== false,
    antiTalk: src.antiTalk !== false,
    strictTurnTaking: src.strictTurnTaking === true,
    styleEnabled: src.styleEnabled !== false,
    style: Object.prototype.hasOwnProperty.call(LLM_STYLE_PRESET_MAP, style) ? style : '白描',
    antiOmniscience: src.antiOmniscience !== false,
    antiVariable: src.antiVariable !== false,
    emotionControl: src.emotionControl !== false,
    roleHope: src.roleHope !== false,
    gameInteraction: src.gameInteraction !== false,
    dataFirst: src.dataFirst !== false
  };
}
const TGBREAK_PROMPT_SOURCE = {
  loaded: false,
  byName: Object.create(null),
  byId: Object.create(null)
};
async function loadTGBreakPromptSource() {
  if (TGBREAK_PROMPT_SOURCE.loaded) return TGBREAK_PROMPT_SOURCE;
  TGBREAK_PROMPT_SOURCE.loaded = true;
  try {
    const res = await fetch('TGbreak😺V1.0.7.json', { cache: 'no-store' });
    if (!res.ok) throw new Error(`TGbreak preset ${res.status}`);
    const data = await res.json();
    const prompts = Array.isArray(data?.prompts) ? data.prompts : [];
    for (const prompt of prompts) {
      if (!prompt || typeof prompt !== 'object') continue;
      const name = String(prompt.name || '').trim();
      const id = String(prompt.identifier || '').trim();
      const content = String(prompt.content || '');
      if (name) TGBREAK_PROMPT_SOURCE.byName[name] = content;
      if (id) TGBREAK_PROMPT_SOURCE.byId[id] = content;
    }
  } catch (e) {
    console.warn('Failed to load TGbreak prompt source:', e);
  }
  return TGBREAK_PROMPT_SOURCE;
}
function getTGBreakPromptContent(keys, fallback = '') {
  const list = Array.isArray(keys) ? keys : [keys];
  for (const key of list) {
    if (!key) continue;
    const nameHit = TGBREAK_PROMPT_SOURCE.byName[key];
    if (typeof nameHit === 'string' && nameHit) return nameHit;
    const idHit = TGBREAK_PROMPT_SOURCE.byId[key];
    if (typeof idHit === 'string' && idHit) return idHit;
  }
  return fallback;
}
function buildTeamNarrativeSnapshot(teamId, { gameRows = [], limit = 4 } = {}) {
  const tid = parseNum(teamId, 0);
  if (tid <= 0) return null;
  const team = getTeam(tid) || {};
  const usageCtx = typeof buildTeamUsageContext === 'function'
    ? buildTeamUsageContext(tid)
    : { roster: typeof getTeamPlayers === 'function' ? (getTeamPlayers(tid) || []) : [], rotation: [] };
  const rosterSource = Array.isArray(usageCtx.roster) ? usageCtx.roster : [];
  const rotationSource = Array.isArray(usageCtx.rotation) ? usageCtx.rotation : [];
  const teamRecord = G.leagueSeason?.teamRecords?.[tid] || {};
  const roster = [...rosterSource]
    .sort((a, b) => parseNum(b.rating, ovr(b.attrs || {})) - parseNum(a.rating, ovr(a.attrs || {})))
    .slice(0, Math.max(1, parseNum(limit, 4)))
    .map(p => ({
      id: String(p.id ?? ''),
      name: String(p.name || '').trim(),
      pos: posLabel(parseNum(p.pos, 3)),
      rating: parseNum(p.rating, ovr(p.attrs || {})),
      role: String(p.rotationRole || p.teamTier || ''),
      age: parseNum(p.age, 0)
    }));
  const rotation = [...rotationSource]
    .slice(0, Math.max(1, parseNum(limit, 4)))
    .map(p => ({
      id: String(p.id ?? ''),
      name: String(p.name || '').trim(),
      pos: posLabel(parseNum(p.pos, 3)),
      minutes: parseNum(p.minutes, 0),
      role: String(p.rotationRole || p.teamTier || '')
    }));
  const boxScore = [...(Array.isArray(gameRows) ? gameRows : [])]
    .sort((a, b) =>
      parseNum(b.mins, 0) - parseNum(a.mins, 0) ||
      parseNum(b.pts, 0) - parseNum(a.pts, 0) ||
      parseNum(b.rating, 0) - parseNum(a.rating, 0)
    )
    .slice(0, Math.max(1, parseNum(limit, 4)))
    .map(r => ({
      name: String(r.name || '').trim(),
      pts: parseNum(r.pts, 0),
      reb: parseNum(r.reb, 0),
      ast: parseNum(r.ast, 0),
      stl: parseNum(r.stl, 0),
      blk: parseNum(r.blk, 0),
      mins: parseNum(r.mins, 0),
      status: String(r.status || '')
    }));
  return {
    id: tid,
    name: String(team.z || team.name || '').trim(),
    abbr: String(team.a || team.abbr || '').trim(),
    strength: getTeamStrength(tid),
    record: {
      w: parseNum(teamRecord.w, 0),
      l: parseNum(teamRecord.l, 0),
      pf: parseNum(teamRecord.pf, 0),
      pa: parseNum(teamRecord.pa, 0)
    },
    roster,
    rotation,
    boxScore
  };
}
function buildMatchupContextForLLM(result, { limit = 4 } = {}) {
  const gameRes = result?.gameResult || null;
  if (!gameRes) return null;
  const gameId = String(result?.gameId || gameRes?.gameId || '');
  const detail = gameId && typeof getLeagueGameDetailById === 'function' ? getLeagueGameDetailById(gameId) : null;
  const userTeamId = parseNum(G.teamId, 0);
  const oppId = parseNum(gameRes?.opp?.id, 0);
  const homeTeamId = parseNum(detail?.homeTeamId, userTeamId);
  const awayTeamId = parseNum(detail?.awayTeamId, oppId || 0);
  const userIsHome = homeTeamId === userTeamId;
  const matchupUserTeamId = userTeamId;
  const matchupOppId = oppId || (userIsHome ? awayTeamId : homeTeamId);
  const userRows = userIsHome ? (detail?.homeRows || []) : (detail?.awayRows || []);
  const oppRows = userIsHome ? (detail?.awayRows || []) : (detail?.homeRows || []);
  const userTeam = buildTeamNarrativeSnapshot(matchupUserTeamId, { gameRows: userRows, limit });
  const opponentTeam = buildTeamNarrativeSnapshot(matchupOppId, { gameRows: oppRows, limit });
  const flow = gameRes.flow || null;
  return {
    gameId,
    phase: String(detail?.phase || 'regular'),
    round: parseNum(detail?.round, parseNum(result?.gameNum, 0)),
    userIsHome,
    win: !!gameRes.win,
    score: {
      user: parseNum(gameRes.teamPts, 0),
      opp: parseNum(gameRes.oppPts, 0)
    },
    flow: {
      summary: String(flow?.summary || detail?.flow?.summary || ''),
      leadChanges: parseNum(flow?.leadChanges, 0),
      clutch: !!flow?.clutch,
      clutchMargin: parseNum(flow?.clutchMargin, 0),
      pace: parseNum(flow?.pace, 96),
      periodLabels: Array.isArray(flow?.periodLabels) ? [...flow.periodLabels] : ['Q1', 'Q2', 'Q3', 'Q4'],
      hasOvertime: !!flow?.hasOvertime,
      finalMargin: Math.abs(parseNum(gameRes.teamPts, 0) - parseNum(gameRes.oppPts, 0)),
      myPeriods: Array.isArray(flow?.myPeriods) ? [...flow.myPeriods] : [],
      oppPeriods: Array.isArray(flow?.oppPeriods) ? [...flow.oppPeriods] : [],
      runs: Array.isArray(flow?.runs) ? flow.runs.slice(0, 5).map(x => String(x || '').slice(0, 80)) : []
    },
    userTeam,
    opponentTeam,
    spotlight: {
      user: userTeam?.boxScore || [],
      opp: opponentTeam?.boxScore || []
    }
  };
}
function buildLLMPromptPresetSection({ context = null, scope = 'social' } = {}) {
  ensureSocialState();
  const presets = normalizeLLMPresetConfig(G.social?.llm?.presets);
  if (!presets.enabled) return '';
  const allowNarrative = scope !== 'analysis';
  const lines = [];
  if (presets.dataFirst) {
    lines.push('【数据优先】只依据输入里的球队、球员、比分、轮换、比赛流和球队数据写作，不要编造不存在的球员、荣誉或比分。');
  }
  if (presets.antiOmniscience) {
    lines.push(getTGBreakPromptContent('👁️‍🗨️防全知（嵌入思维链）', '【防全知】只写角色已知信息；不知道就写疑惑、观察或去确认，不要偷看未来结果、未出现的内幕或别人的脑内想法。'));
  }
  if (presets.antiVariable) {
    lines.push(getTGBreakPromptContent('⚙️防变量出错', '【防变量出错】所有球队、球员、比分、轮换、时间和胜负关系都以 context 为准；若缺数据就保守写，不要补全。'));
  }
  if (allowNarrative && presets.antiTalk) {
    lines.push(getTGBreakPromptContent('🤐防抢话', '【防抢话】不要替用户或其他角色抢对白；轮到谁说话就让谁说，必要时用提问或停顿保留回应空间。'));
  }
  if (allowNarrative && presets.strictTurnTaking) {
    lines.push(getTGBreakPromptContent('🤐超级防抢话(Gemini3/3.1专用)', '【超级防抢话】遇到需要用户选择或回应的节点，立即收束，不要替用户做决定，也不要继续替用户发言。'));
  }
  if (allowNarrative && presets.styleEnabled) {
    const stylePromptMap = {
      '白描': ['👻基础文风', '基础文风'],
      'TG推荐文风': ['👻TG推荐文风', 'TG推荐文风'],
      'TG推荐文风2': ['👻TG推荐文风2', 'TG推荐文风2'],
      '纯爱文风': ['👻纯爱文风', '纯爱文风'],
      '轻小说文风': ['👻轻小说文风', '轻小说文风'],
      '热血': ['👻TG推荐文风', 'TG推荐文风'],
      '数据流': ['👻TG推荐文风2', 'TG推荐文风2'],
      '纪实': ['👻基础文风', '基础文风'],
      '吐槽': ['👻TG推荐文风', 'TG推荐文风']
    };
    const styleKeys = stylePromptMap[presets.style] || stylePromptMap['白描'];
    lines.push(getTGBreakPromptContent(styleKeys, LLM_STYLE_PRESET_MAP[presets.style] || LLM_STYLE_PRESET_MAP['白描']));
  }
  if (allowNarrative && presets.emotionControl) {
    lines.push(getTGBreakPromptContent('😱防极端情绪', '【情绪防极端】情绪保持克制和生活化，不要狂怒、崩溃或过度戏剧化，允许有波动但要有过渡。'));
  }
  if (allowNarrative && presets.roleHope) {
    lines.push(getTGBreakPromptContent('✔️角色防绝望', '【角色防绝望】角色可以不满、抗拒、嘴硬，但不要写成彻底绝望或自我放弃。'));
  }
  const matchup = context?.matchup || context?.gameResult?.matchup || context?.matchupContext || null;
  if (allowNarrative && presets.gameInteraction && matchup) {
    const userTeam = matchup.userTeam?.name || matchup.userTeam?.abbr || '主队';
    const oppTeam = matchup.opponentTeam?.name || matchup.opponentTeam?.abbr || '对手';
    lines.push(`【比赛互动】本场对阵 ${userTeam} 和 ${oppTeam}。必须同时写出主角、队友、对手核心或教练的反应，至少包含 2 个非主角角色的互动；赢球写庆祝、尊重或挑衅，输球写复盘、失落或对手回应。不要把整场比赛写成主角独白。`);
    lines.push(`【对位数据】${JSON.stringify({
      gameId: matchup.gameId,
      phase: matchup.phase,
      round: matchup.round,
      userIsHome: matchup.userIsHome,
      win: matchup.win,
      score: matchup.score,
      flow: matchup.flow,
      userTeam: matchup.userTeam,
      opponentTeam: matchup.opponentTeam
    })}`);
  }
  return lines.join('\n');
}
function personaHandle(key) {
  const p = SOCIAL_PERSONAS[key] || SOCIAL_PERSONAS.neutral;
  return pick(p.handles);
}

// ---- 互联网风格推文池 ----
function pickTwoTeams(excludeId) {
  const pool = TEAMS.filter(t => t.id !== excludeId);
  const a = pick(pool);
  const b = pick(pool.filter(t => t.id !== a.id));
  return [a, b];
}
function pickRandomPlayer() {
  return pick([
    '詹姆斯', '库里', '杜兰特', '字母哥', '约基奇', '东契奇', '恩比德',
    '塔图姆', '莫兰特', '爱德华兹', '文班亚马', '亚历山大', '布朗尼',
    '浓眉', '哈登', '威少', '欧文', '巴特勒', '利拉德', '米切尔',
    '锡安', '福克斯', '哈利伯顿', '班凯罗', '切特'
  ]);
}
function generateInternetPosts(context) {
  const c = context;
  const myTeam = c.team.abbr || 'LAL';
  const pool = [];

  // --- 1. 其他球队比赛结果 ---
  const [tA, tB] = pickTwoTeams(c.team.id);
  const sA = rng(88, 128), sB = rng(85, 125);
  const winner = sA > sB ? tA : tB;
  const loser = sA > sB ? tB : tA;
  pool.push({
    persona: 'news', tone: 'neutral',
    text: `【昨日战报】${tA.z} ${sA}-${sB} ${tB.z}，${winner.z}取得胜利。${pick([
      '关键第四节拉开分差。', '末节逆转，全场沸腾。', '双方打得难解难分。', '垃圾时间换人收尾。'
    ])}`,
    likes: rng(300, 2400), reposts: rng(40, 300)
  });

  // --- 2. 串子/赌狗 ---
  pool.push({
    persona: 'gambler', tone: 'neutral',
    text: pick([
      `今天${tA.z}让${rng(2, 7)}.5，我感觉稳吃。上车的兄弟们扣1。`,
      `昨晚三串一最后一场被${pick([tA, tB]).z}绝杀翻盘，心态崩了，这辈子不碰篮球了（明天继续）。`,
      `大小分开${rng(205, 225)}.5，看好大分，两队防守都是纸糊的。`,
      `连黑五天了，今天反着买，${tB.z}客场赢盘，不接受反驳。`,
      `兄弟们我研究了一套模型，胜率72%，昨天…昨天那场不算。`,
      `${pickRandomPlayer()}伤停消息一出，盘口直接动了3个点，庄家比我们先知道一切。`,
      `${tA.z}vs${tB.z}初盘让${rng(3, 6)}.5，信我反买赢到退休。`,
      `又爆冷！${loser.z}输球串子直接断了，这个月泡面都得省着吃。`,
      `发现一个规律：${tA.z}客场胜率离谱，紧跟我下一波就对了。`,
      `赢了一单就加仓，加了就黑。追、加、梭三大定律我全犯了。`,
      `今天${rng(2, 4)}串1全红！截图为证！（别问昨天）`,
      `有消息说${pick([tA, tB]).z}今晚主力轮休，赶紧调仓。`,
      `盘口在动！${tA.z}让分从${rng(3, 5)}变${rng(6, 8)}，这里面有故事。`,
      `比赛不看只看比分，这就是串子的修养。`,
      `模型说今天全买大分，上次它说的时候…算了不提。`,
    ]),
    likes: rng(50, 600), reposts: rng(5, 80)
  });

  // --- 3. 野生UP主/不靠谱视频 ---
  pool.push({
    persona: 'youtuber', tone: 'neutral',
    text: pick([
      `【新视频】${pickRandomPlayer()}被严重高估了！5个理由告诉你为什么他不配全明星→`,
      `【深度分析】为什么${pick([tA, tB]).z}今年必进总决赛？（时长3分钟，其中2分钟念广告）`,
      `【震惊】${pickRandomPlayer()}训练视频流出！这个动作联盟可能要禁止！！！`,
      `【万字长文】我用AI预测了本赛季MVP，结果出乎所有人意料…点赞过万出下期`,
      `【独家爆料】某队内线和教练发生冲突？知情人士透露更多细节（来源：我编的）`,
      `兄弟们新视频被限流了，求三连救一下，这期真的用心做了（虽然数据全是百度的）`,
      `【${pick([tA, tB]).z}赛季复盘】10分钟看完争冠到乐透的全过程→`,
      `【合集】${pickRandomPlayer()}本赛季最佳${rng(15, 30)}球！最后一个看了10遍`,
      `花了3天做${pick([tA, tB]).z}战术分解视频，阅读量还没我猫视频高。`,
      `【预测】联盟未来五年格局大胆猜想，最后一个成真我倒立洗头。`,
      `${pickRandomPlayer()}在场和不在场净效率差多少？数据让人倒吸凉气。`,
      `【球鞋盘点】${pickRandomPlayer()}本赛季上脚鞋款，最贵那双要好几千！`,
      `有一说一${pick([tA, tB]).z}转换进攻真是联盟最帅的，没有之一，合集已剪。`,
      `UP主觉悟：数据不够就凑、论点不行就吼、标题必须党。我全做到了。`,
      `【选秀回顾】当年${pick([tA, tB]).z}选了谁？放今天值不值？数据说话→`,
    ]),
    likes: rng(100, 1800), reposts: rng(20, 200)
  });

  // --- 4. 黑子内容（黑别人不是黑玩家） ---
  const hateTarget = pickRandomPlayer();
  pool.push({
    persona: 'hater', tone: 'negative',
    text: pick([
      `${hateTarget}要是在90年代打球，场均最多12分，现在的联盟太软了。`,
      `说${hateTarget}是超巨的人，你们看过乔丹打球吗？`,
      `${hateTarget}常规赛刷子，季后赛隐身，年年如此还有人洗？`,
      `${hateTarget}拿那个合同简直是抢钱，换我上我也能场均15+（在2K里）。`,
      `又有人吹${hateTarget}了？数据是好看，但你看看他对手都是谁。`,
      `${hateTarget}粉丝别急，我说的都是事实，数据自己去查。`,
      `${hateTarget}防守的时候像散步你们看不见吗？`,
      `每次看${hateTarget}打球就想关电视，节奏太慢，磨死人。`,
      `${hateTarget}这种球员放2004年连首发都进不了。`,
      `有人统计过没？${hateTarget}关键时刻命中率惨不忍睹。`,
      `${hateTarget}运球三秒半→急停打铁→摊手要犯规。经典。`,
      `说真的${hateTarget}就是吃了联盟红利，换个年代角色球员。`,
      `每次看有人神话${hateTarget}，建议先去看看录像。`,
      `${hateTarget}又刷了组好看数据，可惜球队又输了。蛮好的。`,
      `${hateTarget}那合同够买整支G联赛球队了。性价比感人。`,
    ]),
    likes: rng(200, 3000), reposts: rng(30, 400)
  });

  return pool;
}

function generateInternetPostsExtra(context) {
  const c = context;
  const pool = [];

  // --- 5. 热评/暴论 ---
  pool.push({
    persona: 'hottake', tone: 'neutral',
    text: pick([
      `现在的NBA就是三分大赛，中距离已死，篮球的魅力少了一半。`,
      `我觉得全明星赛应该取消，打得跟表演赛一样，还不如看扣篮大赛。`,
      `联盟应该把三分线往后移一米，现在logo shot也太离谱了。`,
      `说个暴论：现役前五里没有${pickRandomPlayer()}，不接受反驳。`,
      `十年后回头看，这个赛季会是联盟转折点，信不信由你。`,
      `为什么NBA收视率下降？因为比赛太多了，82场谁看得完？`,
      `选秀就是开盲盒，状元签翻车的概率比你想象的高多了。`,
      `罚球不进就应该扣钱。两罚不中罚款一万，保证命中率暴涨。`,
      `现在的球员真缺乏忠诚度。一不开心就申请交易，以前球星可不这样。`,
      `如果让我当总裁，第一件事就是赛季缩短到60场，质量比数量重要。`,
      `${pickRandomPlayer()}和${pickRandomPlayer()}谁强？两个都不在我前十。`,
      `这赛季裁判吹罚尺度简直是薛定谔的哨子。同样动作两个判罚。`,
      `教练挑战该改了。一场就一次机会，还有30%维持原判，纯浪费暂停。`,
      `NBA应该搞升降级。摆烂的队降到G联赛，看谁还敢摆。`,
      `负荷管理就是变相偷懒，你见过乔丹轮休吗？`,
      `每年休赛期交易流言最精彩。常规赛反而没那么好看。`,
      `为什么现在的年轻球员都不打无球了？全是持球单打，看着累。`,
      `不管你服不服，小球时代让中锋成了最尴尬的位置。`,
    ]),
    likes: rng(400, 5000), reposts: rng(60, 600)
  });

  // --- 6. 吃瓜群众 ---
  pool.push({
    persona: 'casual', tone: 'neutral',
    text: pick([
      `刚开始看NBA，请问为什么有的队名是动物有的是人？`,
      `女朋友问我为什么看球的时候比陪她还激动，我无法反驳。`,
      `上班偷偷看比分，老板从后面走过来的时候我假装在看Excel。`,
      `我就想问一下，NBA球员的鞋为什么那么贵，穿着打球不心疼吗？`,
      `昨晚熬夜看球今天上班困死了，这就是篮球的代价吗。`,
      `同事说他能防住${pickRandomPlayer()}，我选择微笑不说话。`,
      `第一次去现场看球，才发现球员真的好高，电视上看不出来。`,
      `球员的手真的好大，篮球在他们手里跟橘子一样。`,
      `请问NBA暂停为什么这么多？感觉一半时间都在看广告。`,
      `我爸看球30年了，每次罚球不进都要骂电视。遗传了。`,
      `问个傻问题：场均三双到底是很强还是特别强？`,
      `每次看完NBA去打野球，才知道理想和现实的差距。`,
      `NBA球员退役后怎么还会破产？年薪那么高。`,
      `食堂大叔说他年轻时能扣篮，大叔身高165。`,
      `刚买了件球衣，穿上感觉自己也能如入无人之境（在地铁上）。`,
    ]),
    likes: rng(300, 4000), reposts: rng(30, 500)
  });

  // --- 7. 交易流言 ---
  const [rA, rB] = pickTwoTeams(c.team.id);
  pool.push({
    persona: 'news', tone: 'neutral',
    text: pick([
      `【交易流言】据消息人士透露，${rA.z}正在与${rB.z}讨论一笔涉及多名球员的交易方案，目前谈判仍在进行中。`,
      `有报道称${rA.z}对${rB.z}阵中一名年轻球员表达了兴趣，但对方要价过高，短期内难以达成。`,
      `休赛期还没到，${rA.z}管理层已经开始为下赛季布局，据悉他们的目标是补强${pick(['后卫线', '锋线', '内线', '板凳深度'])}。`,
      `多方消息源确认：${rA.z}正在积极寻求一名${pick(['全明星得分手', '老将控卫', '3D侧翼', '护筐内线'])}。`,
      `${rB.z}管理层否认了交易传闻，但消息人士表示谈判仍在暗中进行。`,
      `据悉${rA.z}愿意用首轮签加年轻球员换取${rB.z}核心后卫，但对方要求两个不受保护首轮签。`,
      `两队谈判已冷却，分歧在于第三名球员估值。但消息说"门没完全关上"。`,
      `${rA.z}交易截止日策略逐渐清晰：清理老将合同、囤积选秀权、备战自由市场。`,
      `经纪人圈传出消息：${rB.z}某核心球员已通过经纪人转达交易意愿，管理层开始评估报价。`,
      `${rA.z}和${rB.z}去年就差点成交，当时因体检问题告吹。这次能成功吗？`,
    ]),
    likes: rng(500, 3000), reposts: rng(80, 500)
  });

  // --- 8. 数据帝分析别人 ---
  const dataTarget = pickRandomPlayer();
  pool.push({
    persona: 'data', tone: 'neutral',
    text: pick([
      `${dataTarget}本月真实命中率(TS%)下降了${rng(2, 5)}.${rng(1, 9)}个百分点，使用率却上升3.1%，效率堪忧。`,
      `有意思的数据：${dataTarget}第四节PER值全联盟前五，前三节只排第28，典型关键先生。`,
      `统计了一下，${dataTarget}挡拆后中距离命中率${rng(48, 56)}.${rng(0, 9)}%，联盟第${rng(2, 8)}，被严重低估。`,
      `本赛季联盟场均三分出手已达${rng(34, 40)}.${rng(0, 9)}次，又创新高，中距离要灭绝了。`,
      `${dataTarget}受助攻得分比例只有${rng(22, 38)}%，自主进攻能力确实顶级。`,
      `翻了${dataTarget}近${rng(10, 20)}场数据：场均${rng(2, 6)}次失误，被得分数字掩盖了。`,
      `空位三分命中率：${dataTarget}只有${rng(38, 46)}.${rng(0, 9)}%排联盟第${rng(15, 40)}，没你想的那么准。`,
      `${dataTarget}在场百回合净胜${rng(2, 12)}.${rng(0, 9)}分，不在场净负${rng(1, 8)}.${rng(0, 9)}分。差距说明一切。`,
      `${dataTarget}回合占有率${rng(28, 35)}.${rng(0, 9)}%却只有中游效率。吃球权但不够高效。`,
      `拆解${dataTarget}投篮热图，${pick(['左侧中距离', '底角三分', '左翼突破', '背身单打'])}是明显短板。`,
      `冷知识：${dataTarget}罚球命中率${rng(68, 88)}%，但最后两分钟仅${rng(50, 72)}%。`,
      `数据不说谎：${dataTarget}对阵前8球队场均比对后10少了${rng(4, 9)}分。强弱分明。`,
    ]),
    likes: rng(200, 1500), reposts: rng(30, 200)
  });

  return pool;
}

function makeFallbackComments(seedText, mood = 'neutral', baseCount = 3) {
  const count = clamp(parseNum(baseCount, 3), 2, 5);
  const positive = [
    '这球看得舒服。', '今天真顶。', '状态稳住就好。', '这条说到点子上了。',
    '冲就完了！', '终于等到这一天。', '我直接吹爆。', '赢麻了家人们。',
    '继续加油！', '太帅了！', '起飞了起飞了！', '就该这么打。',
    '硬气！', '球星该有的表现。', '鸡皮疙瘩起来了。', '成熟了不少。',
    '防守也很卖力。', '带这状态去季后赛。', '技术越来越全面了。', '教科书级别操作。'
  ];
  const negative = [
    '先把失误压下来吧。', '话可以少一点。', '表现和发言要统一。', '这波不太买账。',
    '就这？', '别尬吹了行吗。', '清醒一点吧。', '评论区比正文好看。',
    '什么水平心里没数吗？', '又开始了…', '防守呢？选择性无视？', '关键球又拉了。',
    '这成绩还好意思发言？', '场上拿表现说话。', '建议少刷手机多练球。',
    '顶薪打这水平，球迷不答应。', '嘴炮一流实力二流。', '教练都看不下去了。',
    '希望下场少犯低级失误。', '看完想关电视。'
  ];
  const neutral = [
    '继续观察。', '有一说一，信息量可以。', '理性看球。', '这条有讨论价值。',
    '马克一下回头看。', '前排占座。', '说得好像有道理。', '不懂但大受震撼。',
    '笑死，评论区人才辈出。', '这楼要歪了。', '坐等打脸。', '截图保存，年底验证。',
    '沙发。', '客观来说还行。', '太能引战了。', '呵呵不评价。',
    '话没错但也不全对。', '各位冷静，理性讨论。', '居然有点被说服了。',
    '这层盖到几楼了？', '典型幸存者偏差。', '年底来看这预测。',
    '歪个楼问今天谁打谁？', '评论比正文精彩。', '这条明显钓鱼。'
  ];
  const templates = mood === 'positive' ? positive : mood === 'negative' ? negative : neutral;
  const comments = [];
  const used = new Set();
  for (let i = 0; i < count; i++) {
    let t; let att = 0;
    do { t = pick(templates); att++; } while (used.has(t) && att < 10);
    used.add(t);
    comments.push({
      author: pick(SOCIAL_COMMENTERS),
      persona: pick([SOCIAL_PERSONAS.fan.type, SOCIAL_PERSONAS.hater.type, SOCIAL_PERSONAS.neutral.type, SOCIAL_PERSONAS.casual.type]),
      tone: mood,
      text: `${pick(templates)}${Math.random() < 0.2 ? `（${seedText.slice(0, 14)}）` : ''}`,
      likes: rng(2, 120)
    });
  }
  return comments;
}
function generateFallbackDailyTweets(context, count = rng(6, 12)) {
  const posts = [];
  const c = context || buildDailySocialContext(null);
  const game = c.gameResult;
  const gameStory = c.gameStory || null;
  const closeGame = !!gameStory?.closeGame;

  // --- 互联网内容（无论有没有比赛都生成） ---
  const inet1 = generateInternetPosts(c);
  const inet2 = generateInternetPostsExtra(c);
  const inetAll = [...inet1, ...inet2];
  // 随机抽取互联网帖子（非比赛日多抽，比赛日少抽）
  const inetCount = game ? rng(3, 5) : rng(5, 8);
  const shuffled = inetAll.sort(() => Math.random() - 0.5);
  shuffled.slice(0, inetCount).forEach(p => {
    posts.push({
      author: personaHandle(p.persona),
      persona: SOCIAL_PERSONAS[p.persona]?.type || SOCIAL_PERSONAS.neutral.type,
      tone: p.tone,
      text: p.text,
      likes: p.likes,
      reposts: p.reposts,
      comments: makeFallbackComments(p.text.slice(0, 14), p.tone === 'negative' ? 'negative' : 'neutral', rng(2, 4))
    });
  });

  // --- 比赛日：加入玩家相关帖子 ---
  if (game) {
    const recapTail = closeGame
      ? '这场球一直咬到最后才分出胜负。'
      : '这场球更像全场四节节奏推进出来的结果。';
    const winTexts = closeGame ? [
      `${c.player.name}今天把收官处理住了，硬仗就是这么拿下的。`,
      `这一场打到最后才分出胜负，${c.player.name}没掉链子。`,
      `${c.player.name}在末段站住了，这才是赢球的关键。`,
      `加时/收官都扛住了，${c.player.name}今天是真硬。`,
      `${c.player.name}今天把最后几回合都处理得很成熟。`,
      `赢球靠的是整场执行，${c.player.name}今天没让比赛跑偏。`,
      `${c.player.name}今天不是单节爆发，是全场都在压节奏。`,
      `这场赢球不是运气，是整场都咬得够紧。`
    ] : [
      `${c.player.name}今天整场都很稳，赢球靠的是全场输出。`,
      `赢球不是靠一节，${c.player.name}四节都在线。`,
      `${c.player.name}把比赛从头带到尾，节奏控制得很成熟。`,
      `这场赢球更像全队执行到位，不是单点爆发。`,
      `${game.pts}分${game.reb}板${game.ast}助，${c.player.name}今天是全场主线。`,
      `买票值了，${c.player.name}这一场是完整发挥。`,
      `赢了！${c.player.name}今天把整场强度都顶住了。`,
      `${c.player.name}今天不是一节发力，是四节都在发力。`
    ];
    const lossTexts = closeGame ? [
      `末段没咬住，前面铺垫再好也白搭。`,
      `关键回合处理得不够果断，最后差一口气。`,
      `一场咬到最后的球，还是在细节上输了。`,
      `${c.player.name}前面打得还行，但最后几回合还是没守住。`,
      `这种球就得看收官，今天显然差了点。`,
      `比赛一直打到最后，${c.player.name}还是没把胜负拽回来。`,
      `输了不怪某一节，整场执行都得更稳。`,
      `差的不是一个回合，是收尾那一下的稳定性。`
    ] : [
      `输了球先别盯着某一节，整场执行都要更稳。`,
      `${c.player.name}今天是全场都没把节奏拿住，不是最后一攻的问题。`,
      `这场输球看的是整场，不是单独一节。`,
      `防守和选择都得从头修。`,
      `${c.player.name}今天需要把整场的细节处理得更顺。`,
      `比分只是结果，过程里有太多回合该打得更聪明。`,
      `这场球的核心不是“第四节”，是整场的节奏都没抢回来。`,
      `要调整的是整场输出，不是只盯着末段。`
    ];
    posts.push({
      author: personaHandle('news'),
      persona: SOCIAL_PERSONAS.news.type,
      tone: 'neutral',
      text: `${c.team.abbr} ${game.teamPts}-${game.oppPts} ${game.opp}，${c.player.name} ${game.pts}分${game.reb}板${game.ast}助，评级 ${gradeLetter(game.grade)}。${recapTail}`,
      likes: rng(220, 1200),
      reposts: rng(40, 320),
      comments: makeFallbackComments('赛后快报', game.win ? 'positive' : 'negative', 4)
    });
    posts.push({
      author: personaHandle(game.win ? 'fan' : 'hater'),
      persona: game.win ? SOCIAL_PERSONAS.fan.type : SOCIAL_PERSONAS.hater.type,
      tone: game.win ? 'supportive' : 'critical',
      text: game.win
        ? pick(winTexts)
        : pick(lossTexts),
      likes: rng(80, 760),
      reposts: rng(10, 160),
      comments: makeFallbackComments('球迷反应', game.win ? 'positive' : 'negative', 3)
    });
  }

  // --- 非比赛日：加入历史/当年新闻与联盟花边 ---
  if (!game) {
    // 基础训练/球队推文（降低概率）
    if (Math.random() < 0.18) {
      posts.push({
        author: personaHandle('news'),
        persona: SOCIAL_PERSONAS.news.type,
        tone: 'neutral',
        text: pick([
          `${c.team.abbr} 今日无赛程，球队完成恢复日训练。`,
          `${c.team.name}今天安排了轻量训练，备战下一场比赛。`,
          `训练场报道：${c.player.name}加练了三组投篮。`,
        ]),
        likes: rng(50, 300),
        reposts: rng(5, 40),
        comments: makeFallbackComments('恢复日', 'neutral', 2)
      });
    }

    // 历史/当年新闻 (大幅增加权重)
    const historicalPosts = generateHistoricalContextPosts(c);
    historicalPosts.forEach(p => posts.push(p));

    // 更多联盟通用新闻
    const leagueNews = generateLeagueNewsPosts(c);
    leagueNews.forEach(p => posts.push(p));
  }

  // --- 热点新闻（最多2条） ---
  const newsPool = (c.hotNews || []).slice(0, 4);
  const newsSlice = newsPool.sort(() => Math.random() - 0.5).slice(0, Math.min(2, newsPool.length));
  newsSlice.forEach(txt => {
    posts.push({
      author: personaHandle(pick(['news', 'neutral'])),
      persona: pick([SOCIAL_PERSONAS.news.type, SOCIAL_PERSONAS.neutral.type]),
      tone: 'neutral',
      text: txt.slice(0, 120),
      likes: rng(70, 420),
      reposts: rng(6, 120),
      comments: makeFallbackComments('新闻', 'neutral', 2)
    });
  });

  // 打乱顺序，避免每次都是固定排列
  posts.sort(() => Math.random() - 0.5);
  return posts.slice(0, clamp(count, 6, 12));
}

function generateHistoricalContextPosts(context) {
  const c = context;
  const year = parseNum(c.year, 2025);
  const pool = [];

  // 通用年代感新闻库
  const genericEraNews = [
    `联盟正在讨论下赛季是否引入四分球规则，各队经理对此看法不一。`,
    `球员工会与资方关于新转播合同的谈判陷入僵局，停摆危机是否会重演？`,
    `最新民调显示，${year}届新秀被认为是近十年来质量最高的一届。`,
    `某东部高管匿名透露：现在的球员太早抱团了，失去了当年的竞争精神。`,
    `运动医学专家警告：现代比赛节奏过快导致球员膝盖伤病率激增20%。`,
    `选秀专家：明年的状元大热身高2米20还能运球投三分，简直是作弊。`,
    `联盟办公室宣布将严查"假摔"行为，违者将在赛后追加罚款。`,
    `据传多支球队有意在欧洲寻找下一个东契奇，球探网络已覆盖整个欧洲。`,
    `退役名宿在节目中炮轰现役球星："他们防守时像是在散步。"`,
    `新规则试行：G联赛将尝试罚球"一罚制"，以缩短比赛时长。`,
    `联盟计划在非洲举办季前赛，旨在拓展国际市场和发掘人才。`,
    `球员健康数据分析显示：背靠背比赛受伤概率比间隔两天的比赛高出35%。`,
    `某西部球队聘请了前AI工程师担任数据分析主管，用机器学习优化轮换策略。`,
    `一项调查显示，超过60%的年轻球迷更喜欢看${rng(1, 3)}分钟的比赛集锦而非完整比赛。`,
    `联盟正在考虑将赛季中锦标赛扩大规模，增加更多激励措施。`,
    `名宿访谈："如果让我重新选择，我宁愿少赚钱也要在一支球队打满整个生涯。"`,
    `NBA中国赛时隔多年重启讨论，联盟希望修复与中国市场的关系。`,
    `最新球鞋科技报告：碳纤维底板可以提升球员弹跳高度2-3厘米。`,
    `联盟宣布新赛季将增加裁判回放中心的权限，争议判罚可实时纠正。`,
    `球员营养学研究：越来越多球星开始采用素食饮食方案。`,
    `某分析师指出：本赛季快攻得分占总得分的比例创下历史新低。`,
    `退役球员创业潮：超过${rng(15, 30)}%的前球员在退役后投资了科技公司。`,
    `据统计，本赛季联盟平均年龄是近${rng(5, 15)}年来最年轻的。`,
    `球探报告：澳大利亚NBL联赛正在成为NBA人才的新输送渠道。`,
    `联盟正在评估是否允许球队在球衣上展示更大面积的赞助商标志。`
  ];

  // 特定年份彩蛋 (示例)
  if (year === 2025) {
    if (Math.random() < 0.3) pool.push(`【2025展望】文班亚马的第三个赛季能否冲击MVP？媒体投票显示他是头号热门。`);
  }
  if (year === 2026) {
    if (Math.random() < 0.3) pool.push(`【2026扩军】西雅图和拉斯维加斯扩军计划再次被提及，预计最快2028年落地。`);
  }

  // 随机抽取 1-2 条
  const count = rng(1, 2);
  for (let i = 0; i < count; i++) {
    pool.push(pick(genericEraNews));
  }

  return pool.map(text => ({
    author: personaHandle('news'),
    persona: SOCIAL_PERSONAS.news.type,
    tone: 'neutral',
    text,
    likes: rng(150, 800),
    reposts: rng(20, 150),
    comments: makeFallbackComments('联盟新闻', 'neutral', 2)
  }));
}

function generateLeagueNewsPosts(context) {
  const c = context;
  const pool = [];
  const [tA, tB] = pickTwoTeams(c.team.id);

  // 伤病/交易/周边新闻
  const topics = [
    `突发：${tA.z}当家球星在训练中扭伤脚踝，预计缺席2-4周。`,
    `流言：${tB.z}有意清理薪资空间，多名老将已被摆上货架。`,
    `数据统计：${tA.z}本赛季三分命中率领跑全联盟，进攻效率创队史新高。`,
    `名记爆料：${tB.z}更衣室出现不和传闻，主教练对此拒绝置评。`,
    `${tA.z}主场球馆宣布将在休赛期进行全面翻新，升级观众体验。`,
    `全明星票选首轮结果公布：${tB.z}的新星意外杀入前场前五。`,
    `${tA.z}主帅赛后承认球队需要改善${pick(['防守轮转', '篮板保护', '罚球命中率', '替补得分'])}。`,
    `${tB.z}宣布将老将${pick(['后卫', '前锋', '中锋'])}列入每日观察名单，伤情不容乐观。`,
    `据联盟消息人士透露，${tA.z}正在考虑更换主教练，多名候选人已被列入名单。`,
    `${tB.z}本赛季客场战绩离谱，目前仅有${rng(3, 8)}胜${rng(12, 20)}负，排名联盟倒数。`,
    `${tA.z}宣布与球队核心完成提前续约，合同细节暂未公布。`,
    `球探报告：${tB.z}的年轻球员发展速度超出预期，已引起多支球队关注。`,
    `${tA.z}新援加盟后球队化学反应明显改善，近${rng(5, 10)}场取得${rng(4, 8)}胜。`,
    `伤病报告：${tB.z}两名首发确认缺战接下来的${rng(2, 4)}场比赛。`,
    `选秀情报：${tA.z}球探已多次前往NCAA观察${pick(['后卫', '前锋', '内线'])}位置的潜力新秀。`,
    `${tB.z}管理层内部会议讨论了下赛季的薪资空间问题，预计有${rng(15, 35)}M可用。`
  ];

  const count = rng(1, 2);
  for (let i = 0; i < count; i++) {
    pool.push({
      author: personaHandle('news'),
      persona: SOCIAL_PERSONAS.news.type,
      tone: 'neutral',
      text: pick(topics),
      likes: rng(100, 600),
      reposts: rng(10, 80),
      comments: makeFallbackComments('突发', 'neutral', 2)
    });
  }
  return pool;
}
function normalizeDailySocialPosts(parsed) {
  if (!Array.isArray(parsed?.posts)) return null;
  const normalized = parsed.posts.slice(0, 10).map(p => ({
    author: String(p?.author || personaHandle('neutral')),
    persona: String(p?.persona || '中立型'),
    tone: String(p?.tone || 'neutral'),
    text: sanitizeSocialGeneratedText(p?.text || ''),
    likes: clamp(parseNum(p?.likes, rng(80, 400)), 0, 999999),
    reposts: clamp(parseNum(p?.reposts, rng(10, 110)), 0, 999999),
    comments: (Array.isArray(p?.comments) ? p.comments : []).slice(0, 6).map(c => ({
      author: String(c?.author || pick(SOCIAL_COMMENTERS)),
      persona: String(c?.persona || '中立型'),
      tone: String(c?.tone || 'neutral'),
      text: sanitizeSocialGeneratedText(c?.text || c?.content || c?.body || ''),
      likes: clamp(parseNum(c?.likes, rng(1, 80)), 0, 999999)
    }))
  })).filter(p => p.text.length >= 8);
  return normalized.length >= 3 ? normalized : null;
}
function parseDailySocialPostsFromRaw(raw) {
  let parsed = null;
  if (raw && typeof raw === 'object') {
    parsed = raw;
  } else {
    const rawText = String(raw || '').trim();
    if (!rawText) return null;
    parsed = tryParseJSONText(rawText);
    if (!parsed) {
      const fixed = rawText.replace(/^```json/i, '').replace(/^```/i, '').replace(/```$/, '').trim();
      parsed = tryParseJSONText(fixed);
    }
    if (!parsed) throw new Error(`LLM 返回内容无法解析为 JSON：${stripErrorTextPreview(rawText)}`);
  }
  return normalizeDailySocialPosts(parsed);
}
function socialPostMentionsPlayer(post, context = null) {
  const name = String(context?.player?.name || G.player?.name || '').trim();
  if (!name) return false;
  const text = cleanSocialText(post?.text || '');
  return !!text && text.includes(name);
}
function dedupeSocialPosts(posts) {
  const out = [];
  const seen = new Set();
  for (const post of Array.isArray(posts) ? posts : []) {
    const text = cleanSocialText(post?.text || '');
    if (!text) continue;
    const key = `${text}|${String(post?.author || '')}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(post);
  }
  return out;
}
function rebalanceDailySocialPosts(posts, context, targetCount) {
  const base = dedupeSocialPosts(posts);
  const desiredPlayerMax = context?.gameToday ? 2 : 1;
  const playerIdx = [];
  base.forEach((post, idx) => {
    if (socialPostMentionsPlayer(post, context)) playerIdx.push(idx);
  });
  const reserve = dedupeSocialPosts(generateFallbackDailyTweets(context, Math.max(10, targetCount + 4)))
    .filter(post => !socialPostMentionsPlayer(post, context));
  let reserveIdx = 0;
  while (playerIdx.length > desiredPlayerMax && reserveIdx < reserve.length) {
    const idx = playerIdx.pop();
    base[idx] = reserve[reserveIdx++];
  }
  while (base.length < targetCount && reserveIdx < reserve.length) {
    base.push(reserve[reserveIdx++]);
  }
  return base.slice(0, targetCount);
}
async function generateDailyTweetsByGeminiNative(baseUrl, apiKey, model, context, count) {
  const modelName = normalizeModelNameForGemini(model);
  const endpoint = `${baseUrl}/models/${encodeURIComponent(modelName)}:generateContent`;
  const req = buildLLMRequestConfig(baseUrl, apiKey, endpoint, { jsonBody: true });
  const payload = {
    systemInstruction: { parts: [{ text: llmSystemPrompt(context) }] },
    contents: [{ role: 'user', parts: [{ text: llmUserPromptPayload(context, count) }] }],
    generationConfig: {
      temperature: 0.9,
      responseMimeType: 'application/json'
    }
  };
  const res = await fetch(req.url, {
    method: 'POST',
    headers: req.headers,
    body: JSON.stringify(payload)
  });
  const data = await readJSONResponseSafe(res, 'LLM');
  const parts = data?.candidates?.[0]?.content?.parts;
  const raw = Array.isArray(parts) ? parts.map(p => String(p?.text || '')).join('').trim() : '';
  return parseDailySocialPostsFromRaw(raw);
}
async function generateDailyTweetsByLLM(context, count = 7) {
  ensureSocialState();
  const llm = G.social.llm || {};
  if (!llm.enabled || !llm.apiKey) return null;
  const baseUrl = normalizeLLMBaseUrl(llm.baseUrl);
  const model = String(llm.model || 'gpt-4.1-mini');
  if (isGoogleGeminiEndpoint(baseUrl)) {
    return generateDailyTweetsByGeminiNative(baseUrl, llm.apiKey, model, context, count);
  }
  const payload = {
    model,
    temperature: 0.9,
    messages: [
      { role: 'system', content: llmSystemPrompt(context) },
      { role: 'user', content: llmUserPromptPayload(context, count) }
    ],
    response_format: { type: 'json_object' }
  };
  const req = buildLLMRequestConfig(baseUrl, llm.apiKey, `${baseUrl}/chat/completions`, { jsonBody: true });
  const res = await fetch(req.url, {
    method: 'POST',
    headers: req.headers,
    body: JSON.stringify(payload)
  });
  const data = await readJSONResponseSafe(res, 'LLM');
  const msg = data?.choices?.[0]?.message || {};
  if (msg?.parsed && typeof msg.parsed === 'object') {
    return normalizeDailySocialPosts(msg.parsed);
  }
  let raw = msg?.content ?? '';
  if (Array.isArray(raw)) raw = raw.map(x => {
    if (typeof x === 'string') return x;
    if (typeof x?.text === 'string') return x.text;
    if (typeof x?.content === 'string') return x.content;
    return '';
  }).join('').trim();
  return parseDailySocialPostsFromRaw(raw);
}
async function generateDailySocialTweets(dayResult, { force = false } = {}) {
  ensureSocialState();
  const day = parseNum(dayResult?.day, Math.max(0, parseNum(G.dayNum, 1) - 1));
  const season = parseNum(dayResult?.season, G.season);
  if (!force && hasGeneratedSocialForDay(day, season)) return [];
  const context = buildDailySocialContext(dayResult);
  const targetCount = rng(5, 10);
  let posts = null;
  try {
    posts = await generateDailyTweetsByLLM(context, targetCount);
  } catch (e) {
    G.social.lastLLMError = String(e?.message || e);
  }
  if (Array.isArray(posts) && posts.length) G.social.lastLLMError = '';
  if (!Array.isArray(posts) || !posts.length) {
    // LLM 未开启或失败时不再生成模板推文，直接跳过
    return [];
  }
  posts = posts.map(p => ({
    ...p,
    text: sanitizeDraftNarrativeText(p?.text || '', context),
    comments: (Array.isArray(p?.comments) ? p.comments : []).map(c => ({
      ...c,
      text: sanitizeDraftNarrativeText(c?.text || '', context)
    }))
  }));
  const added = posts.slice(0, 10).map(p => appendSocialPost({ ...p, day, season, year: G.year }));
  const generatedCount = (G.social.posts || []).filter(p =>
    parseNum(p?.season, 0) === season &&
    parseNum(p?.day, -999) === day &&
    !p?.isPlayer
  ).length;
  markSocialGeneratedDay(day, generatedCount, season);
  G.social.lastGeneratedDay = day;
  if (parseNum(G.social.pendingRequiredDay, -1) === day && generatedCount >= 5) G.social.pendingRequiredDay = -1;
  if (added.length) addPhone('推特热榜', `今日生成 ${added.length} 条新推文，包含新闻/球迷/黑子/中立/数据流视角。`, 'social');
  return added;
}
async function generateDailySocialTweetsSmart(dayResult, { force = false } = {}) {
  ensureSocialState();
  const day = parseNum(dayResult?.day, Math.max(0, parseNum(G.dayNum, 1) - 1));
  const season = parseNum(dayResult?.season, G.season);
  if (!force && hasGeneratedSocialForDay(day, season)) return [];
  const context = buildDailySocialContext(dayResult);
  const targetCount = rng(5, 10);
  let posts = null;
  try {
    posts = await generateDailyTweetsByLLM(context, targetCount);
  } catch (e) {
    G.social.lastLLMError = String(e?.message || e);
  }
  if (Array.isArray(posts) && posts.length) G.social.lastLLMError = '';
  if (!Array.isArray(posts) || !posts.length) {
    posts = generateFallbackDailyTweets(context, targetCount);
  }
  if (!Array.isArray(posts) || !posts.length) return [];
  posts = rebalanceDailySocialPosts(posts, context, targetCount);
  posts = posts.map(p => ({
    ...p,
    text: sanitizeDraftNarrativeText(p?.text || '', context),
    comments: (Array.isArray(p?.comments) ? p.comments : []).map(c => ({
      ...c,
      text: sanitizeDraftNarrativeText(c?.text || '', context)
    }))
  }));
  const added = posts.slice(0, 10).map(p => appendSocialPost({ ...p, day, season, year: G.year }));
  const generatedCount = (G.social.posts || []).filter(p =>
    parseNum(p?.season, 0) === season &&
    parseNum(p?.day, -999) === day &&
    !p?.isPlayer
  ).length;
  markSocialGeneratedDay(day, generatedCount, season);
  G.social.lastGeneratedDay = day;
  if (parseNum(G.social.pendingRequiredDay, -1) === day && generatedCount >= 5) G.social.pendingRequiredDay = -1;
  if (added.length) addPhone('推特热榜', `今日生成 ${added.length} 条新推文，包含新闻/球迷/黑子/中立/数据流视角。`, 'social');
  return added;
}
function evaluatePublicTextImpact(text, { isReply = false } = {}) {
  const t = cleanSocialText(text).toLowerCase();
  if (!t) return { fame: 0, trust: 0, score: 0, label: '无效内容' };
  const posWords = ['团队', '队友', '感谢', '努力', '防守', '专注', '拼', 'respect', 'thank', 'fight', 'learn'];
  const negWords = ['垃圾', '废物', '摆烂', '演我', '黑幕', '假球', '喷子', '裁判瞎', '闭嘴', 'hate'];
  const tradeWords = ['申请交易', '离队', '逼宫', '不想待', 'trade me'];
  const hypeWords = ['mvp', 'goat', '历史第一', '无敌', '统治', '炸裂', '传奇'];
  const calmWords = ['反思', '承担', '下场改进', '继续训练', '保持冷静', '责任在我'];
  let pos = 0, neg = 0, hype = 0, calm = 0, trade = 0;
  posWords.forEach(w => { if (t.includes(w)) pos++; });
  negWords.forEach(w => { if (t.includes(w)) neg++; });
  hypeWords.forEach(w => { if (t.includes(w)) hype++; });
  calmWords.forEach(w => { if (t.includes(w)) calm++; });
  tradeWords.forEach(w => { if (t.includes(w)) trade++; });
  const noise = rng(-1, 1);
  let fame = Math.round(pos * 1.2 + hype * 0.8 - neg * 0.7 + noise);
  let trust = Math.round(pos * 1.4 + calm * 1.6 - neg * 1.5 - hype * 0.6 + noise);
  if (trade > 0) {
    fame += 1;
    trust -= 4;
  }
  if (isReply) {
    fame = Math.round(fame * 0.55);
    trust = Math.round(trust * 0.55);
  }
  fame = clamp(fame, -6, 6);
  trust = clamp(trust, -7, 6);
  const score = fame + trust;
  let label = '中性反馈';
  if (score >= 4) label = '正向反馈';
  else if (score <= -4) label = '负向反馈';
  return { fame, trust, score, label };
}
function createAIReplyForPlayer(post, playerComment, impact) {
  const mood = parseNum(impact?.score, 0) >= 2 ? 'positive' : (parseNum(impact?.score, 0) <= -2 ? 'negative' : 'neutral');
  const author = mood === 'positive' ? personaHandle('fan') : (mood === 'negative' ? personaHandle('hater') : personaHandle('neutral'));
  const text = mood === 'positive'
    ? '这回复挺成熟，继续保持这种态度。'
    : mood === 'negative'
      ? '这回复火药味有点重，场上拿表现说话更好。'
      : '观点收到，下一场再看实际表现。';
  return {
    id: `${post.id}_c${(post.comments?.length || 0) + 1}`,
    author,
    persona: mood === 'positive' ? SOCIAL_PERSONAS.fan.type : (mood === 'negative' ? SOCIAL_PERSONAS.hater.type : SOCIAL_PERSONAS.neutral.type),
    tone: mood,
    text,
    likes: rng(2, 80),
    parentId: String(playerComment.id || ''),
    fromPlayer: false,
    ts: Date.now()
  };
}

// ---- LLM 推文评估与回复生成 ----
function tweetEvalSystemPrompt() {
  return `你是NBA社媒舆论模拟器。球员发了一条推文，你需要：
1. 判断这条推文的舆论影响，输出 fame（声望变化，-6到+6）和 trust（信任变化，-7到+6）
2. 生成3-5条网友回复，要求风格多样：有粉丝、黑子、串子、吃瓜群众、数据帝等
3. 回复要像真实中文互联网评论，可以有梗、抬杠、玩梗、阴阳怪气
4. 给出一个简短的舆论标签label（如"正向反馈"/"引发争议"/"被群嘲"/"圈粉发言"等）

【重要：荣誉数据规则】
⚠️ 这是模拟游戏，不是真实NBA。回复中提到球员荣誉时，必须且只能引用 context.honors 中的实际荣誉。
- context.seasonYear 表示球员第几个赛季，context.honors 是球员实际获得的所有荣誉
- 如果 honors 为"暂无荣誉"，严禁提及任何MVP、冠军、全明星等成就
- 严禁用真实NBA球星的荣誉数据套用到该球员身上
- 黑子/数据帝吐槽时也必须基于实际数据，比如"才第2年就想跑？"而不是编造不存在的荣誉

输出严格JSON格式：
{"fame":数字,"trust":数字,"label":"舆论标签","comments":[{"author":"网名","persona":"类型","text":"评论内容","likes":数字}]}
persona可选：粉丝型/黑子型/串子型/吃瓜型/数据流/热评型/野生UP主/中立型/虎扑毒舌/老球迷/战术分析/情绪球迷
禁止输出Markdown，只输出JSON。`;
}

function buildTweetEvalPayload(tweetText, context) {
  const c = context || buildDailySocialContext(null);
  return JSON.stringify({
    task: 'evaluate_player_tweet',
    tweet: tweetText,
    context: {
      playerName: c.player.name, team: c.team.name,
      record: `${c.record.wins}-${c.record.losses}`,
      ppg: c.player.ppg, rpg: c.player.rpg, apg: c.player.apg,
      fame: c.player.fame, trust: c.player.trust,
      seasonYear: c.player.seasonYear,
      rookieSeason: c.player.rookieSeason,
      honors: c.player.honors,
      lastGame: c.gameResult
        ? `${c.gameResult.win ? '赢' : '输'} ${c.gameResult.pts}分${c.gameResult.reb}板${c.gameResult.ast}助`
        : '今日无比赛'
    }
  });
}

async function evaluateTweetByLLM(tweetText) {
  ensureSocialState();
  const llm = G.social.llm || {};
  if (!llm.enabled || !llm.apiKey) return null;
  const baseUrl = normalizeLLMBaseUrl(llm.baseUrl);
  const model = String(llm.model || 'gpt-4.1-mini');
  const context = buildDailySocialContext(null);
  const userMsg = buildTweetEvalPayload(tweetText, context);
  const sysMsg = tweetEvalSystemPrompt();
  try {
    let raw = '';
    if (isGoogleGeminiEndpoint(baseUrl)) {
      const modelName = normalizeModelNameForGemini(model);
      const endpoint = `${baseUrl}/models/${encodeURIComponent(modelName)}:generateContent`;
      const req = buildLLMRequestConfig(baseUrl, llm.apiKey, endpoint, { jsonBody: true });
      const payload = {
        systemInstruction: { parts: [{ text: sysMsg }] },
        contents: [{ role: 'user', parts: [{ text: userMsg }] }],
        generationConfig: { temperature: 0.9, responseMimeType: 'application/json' }
      };
      const res = await fetch(req.url, { method: 'POST', headers: req.headers, body: JSON.stringify(payload) });
      const data = await readJSONResponseSafe(res, 'LLM');
      const parts = data?.candidates?.[0]?.content?.parts;
      raw = Array.isArray(parts) ? parts.map(p => String(p?.text || '')).join('').trim() : '';
    } else {
      const payload = {
        model, temperature: 0.9,
        messages: [{ role: 'system', content: sysMsg }, { role: 'user', content: userMsg }],
        response_format: { type: 'json_object' }
      };
      const req = buildLLMRequestConfig(baseUrl, llm.apiKey, `${baseUrl}/chat/completions`, { jsonBody: true });
      const res = await fetch(req.url, { method: 'POST', headers: req.headers, body: JSON.stringify(payload) });
      const data = await readJSONResponseSafe(res, 'LLM');
      const msg = data?.choices?.[0]?.message || {};
      if (msg?.parsed && typeof msg.parsed === 'object') return normalizeTweetEvalResult(msg.parsed);
      raw = String(msg?.content ?? '');
    }
    const parsed = tryParseJSONText(raw) || tryParseJSONText(raw.replace(/^```json/i, '').replace(/```$/, '').trim());
    return normalizeTweetEvalResult(parsed);
  } catch (e) {
    console.warn('LLM推文评估失败:', e);
    return null;
  }
}

function normalizeTweetEvalResult(parsed) {
  if (!parsed || typeof parsed !== 'object') return null;
  const fame = clamp(parseNum(parsed.fame, 0), -6, 6);
  const trust = clamp(parseNum(parsed.trust, 0), -7, 6);
  const label = String(parsed.label || '舆论反馈').slice(0, 20);
  const comments = (Array.isArray(parsed.comments) ? parsed.comments : []).slice(0, 5).map(c => ({
    author: String(c?.author || pick(SOCIAL_COMMENTERS)).slice(0, 20),
    persona: String(c?.persona || '中立型').slice(0, 10),
    tone: fame + trust >= 2 ? 'positive' : (fame + trust <= -2 ? 'negative' : 'neutral'),
    text: sanitizeSocialGeneratedText(String(c?.text || '')).slice(0, 120),
    likes: clamp(parseNum(c?.likes, rng(5, 100)), 0, 9999)
  })).filter(c => c.text.length >= 4);
  if (comments.length < 2) return null;
  return { fame, trust, label, score: fame + trust, comments };
}

function postPlayerTweet(text) {
  ensureSocialState();
  ensureEconomyState();
  const msg = sanitizeSocialGeneratedText(text);
  if (msg.length < 6) return { ok: false, message: '内容太短，至少 6 个字。' };
  const dayKey = `${parseNum(G.season, 0)}_${Math.max(0, parseNum(G.dayNum, 0) - 1)}`;
  const used = parseNum(G.social.playerPostsByDay[dayKey], 0);
  if (used >= 3) return { ok: false, message: '当天最多发布 3 条推文。' };
  const impact = evaluatePublicTextImpact(msg, { isReply: false });
  const baseLikes = clamp(Math.round(40 + parseNum(G.player.fame, 10) * 6 + rng(-30, 90)), 20, 9000);
  const post = appendSocialPost({
    day: Math.max(0, parseNum(G.dayNum, 0) - 1),
    season: G.season,
    year: G.year,
    author: `@${String(G.player.name || 'Player').replace(/\s+/g, '')}`,
    persona: '球员本人',
    tone: impact.score >= 2 ? 'positive' : (impact.score <= -2 ? 'negative' : 'neutral'),
    text: msg,
    likes: baseLikes,
    reposts: clamp(Math.round(baseLikes * rng(8, 28) / 100), 5, 2800),
    isPlayer: true,
    comments: makeFallbackComments(msg, impact.score >= 2 ? 'positive' : (impact.score <= -2 ? 'negative' : 'neutral'), 3)
  });
  G.social.playerPostsByDay[dayKey] = used + 1;
  const rep = applyReputationDelta({ fame: impact.fame, trust: impact.trust, source: `发布推文：${impact.label}` });
  addPhone('社媒助手', `推文发布成功：${impact.label}（声望${rep.fameDelta >= 0 ? '+' : ''}${rep.fameDelta}，信任${rep.trustDelta >= 0 ? '+' : ''}${rep.trustDelta}）`, 'social');
  return { ok: true, post, impact, rep };
}
async function postPlayerTweetAsync(text) {
  ensureSocialState();
  ensureEconomyState();
  const msg = sanitizeSocialGeneratedText(text);
  if (msg.length < 6) return { ok: false, message: '内容太短，至少 6 个字。' };
  const dayKey = `${parseNum(G.season, 0)}_${Math.max(0, parseNum(G.dayNum, 0) - 1)}`;
  const used = parseNum(G.social.playerPostsByDay[dayKey], 0);
  if (used >= 3) return { ok: false, message: '当天最多发布 3 条推文。' };

  // 尝试LLM评估
  let llmResult = null;
  try { llmResult = await evaluateTweetByLLM(msg); } catch (e) { }

  const impact = llmResult
    ? { fame: llmResult.fame, trust: llmResult.trust, score: llmResult.score, label: llmResult.label }
    : evaluatePublicTextImpact(msg, { isReply: false });

  const baseLikes = clamp(Math.round(40 + parseNum(G.player.fame, 10) * 6 + rng(-30, 90)), 20, 9000);
  const comments = llmResult
    ? llmResult.comments.map(c => ({ ...c, fromPlayer: false, ts: Date.now() }))
    : makeFallbackComments(msg, impact.score >= 2 ? 'positive' : (impact.score <= -2 ? 'negative' : 'neutral'), 3);

  const post = appendSocialPost({
    day: Math.max(0, parseNum(G.dayNum, 0) - 1),
    season: G.season, year: G.year,
    author: `@${String(G.player.name || 'Player').replace(/\s+/g, '')}`,
    persona: '球员本人',
    tone: impact.score >= 2 ? 'positive' : (impact.score <= -2 ? 'negative' : 'neutral'),
    text: msg, likes: baseLikes,
    reposts: clamp(Math.round(baseLikes * rng(8, 28) / 100), 5, 2800),
    isPlayer: true, comments
  });
  G.social.playerPostsByDay[dayKey] = used + 1;
  const rep = applyReputationDelta({ fame: impact.fame, trust: impact.trust, source: `发布推文：${impact.label}` });
  const src = llmResult ? 'AI' : '关键词';
  addPhone('社媒助手', `推文发布成功(${src})：${impact.label}（声望${rep.fameDelta >= 0 ? '+' : ''}${rep.fameDelta}，信任${rep.trustDelta >= 0 ? '+' : ''}${rep.trustDelta}）`, 'social');
  return { ok: true, post, impact, rep, llmUsed: !!llmResult };
}
function replyToSocialPost(postId, text) {
  ensureSocialState();
  const post = getSocialPostById(postId);
  if (!post) return { ok: false, message: '推文不存在' };
  const pid = String(postId);
  if (G.social.playerRepliedPostIds[pid]) return { ok: false, message: '每条推文只能回复一次。' };
  const msg = sanitizeSocialGeneratedText(text);
  if (msg.length < 4) return { ok: false, message: '回复太短。' };
  const impact = evaluatePublicTextImpact(msg, { isReply: true });
  const playerComment = {
    id: `${post.id}_c${(post.comments?.length || 0) + 1}`,
    author: `@${String(G.player.name || 'Player').replace(/\s+/g, '')}`,
    persona: '球员回复',
    tone: impact.score >= 2 ? 'positive' : (impact.score <= -2 ? 'negative' : 'neutral'),
    text: msg,
    likes: rng(3, 120),
    parentId: '',
    fromPlayer: true,
    ts: Date.now()
  };
  if (!Array.isArray(post.comments)) post.comments = [];
  post.comments.push(playerComment);
  G.social.playerRepliedPostIds[pid] = true;
  const aiReply = createAIReplyForPlayer(post, playerComment, impact);
  post.comments.push(aiReply);
  const rep = applyReputationDelta({ fame: impact.fame, trust: impact.trust, source: `回复推文：${impact.label}` });
  return { ok: true, impact, rep };
}
async function regenerateTodaySocialTweets() {
  const dayResult = { day: Math.max(0, parseNum(G.dayNum, 0) - 1), date: getDayDateString(Math.max(0, parseNum(G.dayNum, 0) - 1)), isGame: false, gameResult: null };
  return generateDailySocialTweetsSmart(dayResult, { force: true });
}

// ============ 交易与续约系统 ============
function tryAITrade() {
  // 交易截止日后不交易
  if (G.dayNum > G.tradeDeadline) return;

  // 概率控制: 休赛期每天3%，赛季中每5场1%
  const isOffseason = G.dayNum < 10 || G.dayNum > 170;
  const chance = isOffseason ? 0.03 : (G.gameNum % 5 === 0 ? 0.01 : 0);
  if (Math.random() > chance) return;

  // 随机选两队
  const t1 = pick(TEAMS.filter(t => t.id !== G.teamId));
  const t2 = pick(TEAMS.filter(t => t.id !== G.teamId && t.id !== t1.id));
  if (!t1 || !t2) return;

  const roster1 = getTeamPlayers(t1.id).filter(p => !p.untouchable);
  const roster2 = getTeamPlayers(t2.id).filter(p => !p.untouchable);
  if (roster1.length < 8 || roster2.length < 8) return;

  const p1 = pick(roster1);
  const p2 = pick(roster2);

  // 价值匹配 (误差15%以内)
  const v1 = parseNum(p1.rating, 70);
  const v2 = parseNum(p2.rating, 70);
  if (Math.abs(v1 - v2) > 8) return;

  // 执行交易
  p1.teamId = t2.id;
  p2.teamId = t1.id;

  G.trades.unshift({
    day: G.dayNum,
    from: t1.z, to: t2.z,
    out: p1.name, in: p2.name,
    type: 'AI'
  });

  addNews(`🔄 交易: ${t1.z}送出${p1.name}，从${t2.z}得到${p2.name}`, 'neu');
}

function triggerTradeRequest() {
  if (G.dayNum > G.tradeDeadline) return;
  // 赛季中每10场约1%概率
  if (G.gameNum % 5 !== 0 || Math.random() > 0.02) return;
  if (G.pendingTrade) return;

  const interestedTeams = TEAMS.filter(t => t.id !== G.teamId);
  const targetTeam = pick(interestedTeams);
  const roster = getTeamPlayers(targetTeam.id);
  // 寻找价值匹配的筹码
  const myVal = parseNum(G.player.rating, 75);
  const offerPlayer = roster.find(p => Math.abs(p.rating - myVal) <= 5);

  if (offerPlayer) {
    G.pendingTrade = {
      team: targetTeam,
      player: offerPlayer,
      ts: Date.now()
    };
    addPhone(targetTeam.z + "经理", `我们对你很感兴趣，愿意送出${offerPlayer.name}来交换你，你意下如何？`, 'trade');
  }
}

function executePlayerTrade(trade) {
  const oldTeam = getTeam(G.teamId);
  const newTeam = trade.team;
  const swapPlayer = trade.player;

  // 玩家转会
  G.teamId = newTeam.id;
  G.team = newTeam;
  G.player.salary = normalizeSalaryMillion(swapPlayer.contractAmount || swapPlayer.salary || G.player.salary); // 继承或保持薪资

  // 交换球员
  swapPlayer.teamId = oldTeam.id;

  G.trades.unshift({
    day: G.dayNum,
    from: oldTeam.z, to: newTeam.z,
    out: G.player.name, in: swapPlayer.name,
    type: 'USER'
  });

  addNews(`💥 重磅交易！${oldTeam.z}送出${G.player.name}，从${newTeam.z}得到${swapPlayer.name}`, 'special');
  G.pendingTrade = null;
  G.pendingUserTrade = null;
  refreshTradeTeamState(oldTeam.id);
  refreshTradeTeamState(newTeam.id);
  G._currentRotation = null;
  G._rotationGame = -1;
  G._rotationTeam = 0;
  if (typeof ensureGameRotation === 'function') ensureGameRotation(true);

  // 重置相关状态
  G.player.trust = 50;
}

function tryAIRenewal() {
  if (G.dayNum > G.renewalDeadline) return;
  // 每天小概率触发AI续约
  if (Math.random() > 0.02) return;

  const team = pick(TEAMS);
  const expired = getTeamPlayers(team.id).filter(p => p.yearsContract === 1 && p.rating >= 80);
  if (expired.length === 0) return;

  const p = pick(expired);
  // 核心球员大概率续约
  if (Math.random() < 0.8) {
    p.yearsContract += rng(2, 4);
    addNews(`📝 ${team.z}与${p.name}完成续约`, 'neu');
  }
}

function checkPlayerRenewal() {
  if (G.dayNum === G.renewalDeadline && G.player.contractYears <= 1) {
    // 触发续约谈判
    addPhone("总经理", `赛季快结束了，我们希望与你续约。你愿意留下来吗？`, 'renewal');
  }
}
function buildLeagueRoundSchedule() {
  const rounds = [];
  for (let i = 0; i < G.schedule.length; i++) {
    const ug = G.schedule[i];
    if (!ug) continue;
    const oppId = ug.opp;
    const matchups = [];
    const userHome = !!ug.home;
    matchups.push({
      home: userHome ? G.teamId : oppId,
      away: userHome ? oppId : G.teamId,
      user: true
    });
    const others = TEAMS.map(t => t.id).filter(id => id !== G.teamId && id !== oppId);
    for (let j = others.length - 1; j > 0; j--) { const k = rng(0, j);[others[j], others[k]] = [others[k], others[j]]; }
    for (let j = 0; j < others.length - 1; j += 2) {
      const a = others[j], b = others[j + 1];
      if (Math.random() < 0.5) matchups.push({ home: a, away: b, user: false });
      else matchups.push({ home: b, away: a, user: false });
    }
    rounds.push(matchups);
  }
  return rounds;
}
function initLeagueSeasonState() {
  ensureLeagueStateShape();
  const teamRecords = {};
  const teamGameLogs = {};
  TEAMS.forEach(t => { teamRecords[t.id] = makeTeamRecord(); });
  const playerStats = {};
  TEAMS.forEach(t => { teamGameLogs[t.id] = []; });

  const self = createUserRosterSnapshot();
  const selfKey = leaguePlayerKey(G.teamId, 'USER_SELF', true);
  playerStats[selfKey] = emptySeasonLine(G.teamId, 'USER_SELF', self.name, self.pos, true);

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
  G.leagueSeason = { round: 0, teamRecords, playerStats, roundSchedule: buildLeagueRoundSchedule(), teamGameLogs, gameDetails: [] };
}
function ensureLeagueTeamRecord(teamId) {
  ensureLeagueStateShape();
  if (!G.leagueSeason.teamRecords[teamId]) G.leagueSeason.teamRecords[teamId] = makeTeamRecord();
  return G.leagueSeason.teamRecords[teamId];
}
function ensureLeagueTeamGameLog(teamId) {
  ensureLeagueStateShape();
  if (!Array.isArray(G.leagueSeason.teamGameLogs[teamId])) G.leagueSeason.teamGameLogs[teamId] = [];
  return G.leagueSeason.teamGameLogs[teamId];
}
function ensureLeagueGameDetails() {
  ensureLeagueStateShape();
  if (!Array.isArray(G.leagueSeason.gameDetails)) G.leagueSeason.gameDetails = [];
  return G.leagueSeason.gameDetails;
}
function sortGameDetailRows(rows) {
  if (!Array.isArray(rows)) return [];
  return rows.sort((a, b) =>
    parseNum(b.mins, 0) - parseNum(a.mins, 0) ||
    parseNum(b.pts, 0) - parseNum(a.pts, 0) ||
    parseNum(b.rating, 0) - parseNum(a.rating, 0)
  );
}
function makeGameDetailRow(player, stats, teamId, { isSelf = false, status = '' } = {}) {
  const p = player || {};
  const rawStats = stats ? clampLineStats({ ...stats }) : clampLineStats({
    mins: 0, pts: 0, reb: 0, ast: 0, stl: 0, blk: 0, tov: 0, fgm: 0, fga: 0, tpm: 0, tpa: 0, ftm: 0, fta: 0
  });
  const attrs = p.attrs && Object.keys(p.attrs).length ? p.attrs : parsePlayerAttrs(p || {});
  return {
    teamId: parseNum(teamId, 0),
    playerId: isSelf ? 'USER_SELF' : (p.id ?? 0),
    name: isSelf ? (G.player?.name || '你') : (p.name || 'Unknown'),
    pos: parseNum(p.pos, isSelf ? parseNum(G.player?.pos, 3) : 3),
    pos2: parseNum(p.pos2, 0),
    rating: clamp(parseNum(p.rating, ovr(attrs)), 0, 99),
    isSelf: !!isSelf,
    status: status || '',
    mins: parseNum(rawStats.mins, 0),
    pts: parseNum(rawStats.pts, 0),
    reb: parseNum(rawStats.reb, 0),
    ast: parseNum(rawStats.ast, 0),
    stl: parseNum(rawStats.stl, 0),
    blk: parseNum(rawStats.blk, 0),
    tov: parseNum(rawStats.tov, 0),
    fgm: parseNum(rawStats.fgm, 0),
    fga: parseNum(rawStats.fga, 0),
    tpm: parseNum(rawStats.tpm, 0),
    tpa: parseNum(rawStats.tpa, 0),
    ftm: parseNum(rawStats.ftm, 0),
    fta: parseNum(rawStats.fta, 0)
  };
}
function addLeagueGameDetail(detail) {
  if (!detail || !detail.id) return;
  const logs = ensureLeagueGameDetails();
  const idx = logs.findIndex(g => g.id === detail.id);
  if (idx >= 0) logs[idx] = detail;
  else logs.push(detail);
  logs.sort((a, b) =>
    parseNum(a.round, 0) - parseNum(b.round, 0) ||
    parseNum(a.homeTeamId, 0) - parseNum(b.homeTeamId, 0) ||
    parseNum(a.awayTeamId, 0) - parseNum(b.awayTeamId, 0)
  );
  if (logs.length > 1600) logs.splice(0, logs.length - 1600);
}
function getLeagueGameDetails({ teamId = 0, round = 0, season = 0, phase = '' } = {}) {
  ensureLeagueStateShape();
  const tid = parseNum(teamId, 0);
  const rd = parseNum(round, 0);
  const sn = parseNum(season, 0);
  const ph = String(phase || '').trim();
  return ensureLeagueGameDetails().filter(g => {
    if (tid > 0 && g.homeTeamId !== tid && g.awayTeamId !== tid) return false;
    if (rd > 0 && parseNum(g.round, 0) !== rd) return false;
    if (sn > 0 && parseNum(g.season, 0) !== sn) return false;
    if (ph) {
      const gPhase = String(g.phase || 'regular');
      if (gPhase !== ph) return false;
    }
    return true;
  }).sort((a, b) =>
    parseNum(b.round, 0) - parseNum(a.round, 0) ||
    parseNum(a.homeTeamId, 0) - parseNum(b.homeTeamId, 0) ||
    parseNum(a.awayTeamId, 0) - parseNum(b.awayTeamId, 0)
  );
}
function getLeagueGameDetailById(gameId) {
  if (!gameId) return null;
  return ensureLeagueGameDetails().find(g => String(g.id) === String(gameId)) || null;
}
function findLeagueGameDetail({ round = 0, homeTeamId = 0, awayTeamId = 0, teamId = 0, oppId = 0, season = 0 } = {}) {
  const rd = parseNum(round, 0);
  const h = parseNum(homeTeamId, 0);
  const a = parseNum(awayTeamId, 0);
  const t = parseNum(teamId, 0);
  const o = parseNum(oppId, 0);
  const sn = parseNum(season, 0);
  return ensureLeagueGameDetails().find(g => {
    if (rd > 0 && parseNum(g.round, 0) !== rd) return false;
    if (sn > 0 && parseNum(g.season, 0) !== sn) return false;
    if (h > 0 && a > 0) return g.homeTeamId === h && g.awayTeamId === a;
    if (t > 0 && o > 0) {
      return (g.homeTeamId === t && g.awayTeamId === o) || (g.awayTeamId === t && g.homeTeamId === o);
    }
    return false;
  }) || null;
}
function ensureLeaguePlayerLine(teamId, playerObj, isSelf = false) {
  ensureLeagueStateShape();
  const pid = isSelf ? 'USER_SELF' : playerObj?.id;
  const key = leaguePlayerKey(teamId, pid, isSelf);
  if (!G.leagueSeason.playerStats[key]) {
    G.leagueSeason.playerStats[key] = emptySeasonLine(teamId, pid, playerObj?.name || G.player.name, playerObj?.pos || G.player.pos, isSelf);
  }
  return G.leagueSeason.playerStats[key];
}
function addSeasonLineStat(line, st) {
  if (!line || !st) return;
  line.gp++;
  ['pts', 'reb', 'ast', 'stl', 'blk', 'tov', 'fgm', 'fga', 'tpm', 'tpa', 'ftm', 'fta', 'mins'].forEach(k => {
    line[k] += parseNum(st[k], 0);
  });
}
function addLeagueTeamGameResult(teamId, oppId, roundIndex, home, pts, oppPts) {
  const rec = ensureLeagueTeamRecord(teamId);
  rec.gp++;
  rec.pf += parseNum(pts, 0);
  rec.pa += parseNum(oppPts, 0);
  if (parseNum(pts, 0) >= parseNum(oppPts, 0)) rec.w++;
  else rec.l++;
  const logs = ensureLeagueTeamGameLog(teamId);
  logs.push({
    round: roundIndex + 1,
    oppId,
    home: !!home,
    pts: parseNum(pts, 0),
    oppPts: parseNum(oppPts, 0),
    win: parseNum(pts, 0) > parseNum(oppPts, 0)
  });
  if (logs.length > 164) logs.shift();
}
function tickLeagueInjuries() {
  if (!LEAGUE.loaded) return;
  Object.values(LEAGUE.teams).forEach(t => {
    (t.players || []).forEach(p => {
      if (!p.injury) p.injury = { active: false, games: 0, type: "" };
      if (p.injury.active) {
        p.injury.games--;
        if (p.injury.games <= 0) p.injury = { active: false, games: 0, type: "" };
      }
    });
  });
}
function maybeInjureLeaguePlayer(player, minutes) {
  if (!player) return false;
  if (!player.injury) player.injury = { active: false, games: 0, type: "" };
  if (player.injury.active) return false;
  const age = parseNum(player.age, 25);
  const base = 0.0025 + Math.max(0, minutes) / 5200 + Math.max(0, age - 29) * 0.0007;
  if (Math.random() < base) {
    const severe = Math.random() < 0.12;
    const games = severe ? rng(10, 28) : rng(2, 8);
    const type = severe ? pick(["膝盖重伤", "跟腱伤势", "手掌骨折"]) : pick(["脚踝扭伤", "腿筋拉伤", "肩部拉伤"]);
    player.injury = { active: true, games, type };
    if (parseNum(player.rating, 70) >= 82 && Math.random() < 0.45) {
      addNews(`🚑 ${player.name}（${teamNameFallback(player.teamId)}）遭遇${type}，缺阵${games}场`, 'neg');
    }
    return true;
  }
  return false;
}
function calcLinePoints(st) {
  const fgm = clamp(parseNum(st?.fgm, 0), 0, 99);
  const tpm = clamp(parseNum(st?.tpm, 0), 0, fgm);
  const ftm = clamp(parseNum(st?.ftm, 0), 0, 99);
  return Math.max(0, (fgm - tpm) * 2 + tpm * 3 + ftm);
}
function shotDoResult(percent, total) {
  const pctClamped = clamp(Math.round(parseNum(percent, 32)), 32, 60);
  const attempts = Math.max(0, Math.round(parseNum(total, 0)));
  let made = 0;
  for (let i = 0; i < attempts; i++) {
    if (rng(1, 100) <= pctClamped) made++;
  }
  return made;
}
function shotExResult(percent, total) {
  const pctClamped = clamp(Math.round(parseNum(percent, 22)), 22, 48);
  const attempts = Math.max(0, Math.round(parseNum(total, 0)));
  let made = 0;
  for (let i = 0; i < attempts; i++) {
    if (rng(1, 100) <= pctClamped) made++;
  }
  return made;
}
function shotFrResult(percent, total) {
  const pctClamped = clamp(Math.round(parseNum(percent, 40)), 40, 95);
  const attempts = Math.max(0, Math.round(parseNum(total, 0)));
  let made = 0;
  for (let i = 0; i < attempts; i++) {
    if (rng(1, 100) <= pctClamped) made++;
  }
  return made;
}
function shotInResult(percent, total) {
  const pctClamped = clamp(Math.round(parseNum(percent, 40)), 40, 80);
  const attempts = Math.max(0, Math.round(parseNum(total, 0)));
  let made = 0;
  for (let i = 0; i < attempts; i++) {
    if (rng(1, 100) <= pctClamped) made++;
  }
  return made;
}
function clampLineStats(st) {
  if (!st) return st;
  st.mins = clamp(Math.round(parseNum(st.mins, 20)), 6, 40);
  st.fga = clamp(Math.round(parseNum(st.fga, 0)), 0, 29);
  st.fgm = clamp(Math.round(parseNum(st.fgm, 0)), 0, st.fga);
  st.tpa = clamp(Math.round(parseNum(st.tpa, 0)), 0, Math.min(14, st.fga));
  st.tpm = clamp(Math.round(parseNum(st.tpm, 0)), 0, Math.min(st.tpa, st.fgm));
  st.fta = clamp(Math.round(parseNum(st.fta, 0)), 0, 14);
  st.ftm = clamp(Math.round(parseNum(st.ftm, 0)), 0, st.fta);
  st.reb = clamp(Math.round(parseNum(st.reb, 0)), 0, 20);
  st.ast = clamp(Math.round(parseNum(st.ast, 0)), 0, 14);
  st.stl = clamp(Math.round(parseNum(st.stl, 0)), 0, 5);
  st.blk = clamp(Math.round(parseNum(st.blk, 0)), 0, 5);
  st.tov = clamp(Math.round(parseNum(st.tov, 0)), 0, 7);
  st.pts = calcLinePoints(st);
  return st;
}
function scaleLineStats(st, scale) {
  const shotScale = clamp(scale, 0.65, 1.45);
  const miscScale = clamp(Math.sqrt(scale), 0.78, 1.28);
  st.fga = Math.round(parseNum(st.fga, 0) * shotScale);
  st.fgm = Math.round(parseNum(st.fgm, 0) * shotScale);
  st.tpa = Math.round(parseNum(st.tpa, 0) * shotScale);
  st.tpm = Math.round(parseNum(st.tpm, 0) * shotScale);
  st.fta = Math.round(parseNum(st.fta, 0) * shotScale);
  st.ftm = Math.round(parseNum(st.ftm, 0) * shotScale);
  st.reb = Math.round(parseNum(st.reb, 0) * miscScale);
  st.ast = Math.round(parseNum(st.ast, 0) * miscScale);
  st.stl = Math.round(parseNum(st.stl, 0) * miscScale);
  st.blk = Math.round(parseNum(st.blk, 0) * miscScale);
  st.tov = Math.round(parseNum(st.tov, 0) * miscScale);
  return clampLineStats(st);
}
function addOnePointToLine(st, cap, diff) {
  if (parseNum(st.pts, 0) >= cap) return false;
  if (diff === 1 && st.tpm < st.fgm && st.tpa < Math.min(14, st.fga)) {
    st.tpm++;
    st.tpa = Math.max(st.tpa, st.tpm);
    clampLineStats(st);
    return true;
  }
  if (diff === 1 && st.ftm < st.fta) {
    st.ftm++;
    clampLineStats(st);
    return true;
  }
  if (st.fta < 14 && (diff === 1 || Math.random() < 0.38)) {
    st.fta++;
    st.ftm = Math.min(st.fta, st.ftm + 1);
    clampLineStats(st);
    return true;
  }
  if (diff >= 3 && st.fga < 29 && st.tpa < 14 && Math.random() < 0.34) {
    st.fga++;
    st.fgm = Math.min(st.fga, st.fgm + 1);
    st.tpa = Math.min(st.fga, st.tpa + 1);
    st.tpm = Math.min(st.tpa, st.fgm, st.tpm + 1);
    clampLineStats(st);
    return true;
  }
  if (st.fga < 29) {
    st.fga++;
    st.fgm = Math.min(st.fga, st.fgm + 1);
    clampLineStats(st);
    return true;
  }
  if (st.tpm < st.fgm && st.tpa < Math.min(14, st.fga)) {
    st.tpm++;
    st.tpa = Math.max(st.tpa, st.tpm);
    clampLineStats(st);
    return true;
  }
  return false;
}
function removeOnePointFromLine(st, diff) {
  if (parseNum(st.pts, 0) <= 0) return false;
  if (diff === 1 && st.tpm > 0) {
    st.tpm--;
    if (st.tpa > st.tpm) st.tpa--;
    clampLineStats(st);
    return true;
  }
  if (st.ftm > 0) {
    st.ftm--;
    if (st.fta > st.ftm) st.fta--;
    clampLineStats(st);
    return true;
  }
  if (st.fgm > st.tpm) {
    st.fgm--;
    if (st.fga > st.fgm) st.fga--;
    clampLineStats(st);
    return true;
  }
  if (st.tpm > 0) {
    st.tpm--;
    st.fgm = Math.max(0, st.fgm - 1);
    if (st.tpa > st.tpm) st.tpa--;
    if (st.fga > st.fgm) st.fga--;
    clampLineStats(st);
    return true;
  }
  return false;
}
function pickLineForAdjustment(lines, needMore, cap) {
  if (!Array.isArray(lines) || !lines.length) return null;
  const sorted = [...lines].sort((a, b) =>
    parseNum(b.stats?.mins, 0) - parseNum(a.stats?.mins, 0) ||
    parseNum(b.player?.rating, 70) - parseNum(a.player?.rating, 70)
  );
  if (needMore) {
    const candidates = sorted.filter(row =>
      parseNum(row.stats?.pts, 0) < cap &&
      (parseNum(row.stats?.fga, 0) < 29 || parseNum(row.stats?.fta, 0) < 14 || parseNum(row.stats?.tpm, 0) < parseNum(row.stats?.fgm, 0))
    );
    if (!candidates.length) return null;
    const span = Math.max(1, Math.min(5, candidates.length));
    return candidates[rng(0, span - 1)];
  }
  const candidates = sorted.filter(row => parseNum(row.stats?.pts, 0) > 0);
  if (!candidates.length) return null;
  const span = Math.max(1, Math.min(6, candidates.length));
  return candidates[rng(0, span - 1)];
}
function normalizeTeamLinesToScore(lines, targetScore, { minTarget = 60, maxTarget = 145 } = {}) {
  const minT = clamp(Math.round(parseNum(minTarget, 0)), 0, 145);
  const maxT = clamp(Math.round(parseNum(maxTarget, 145)), minT, 145);
  const target = clamp(Math.round(parseNum(targetScore, 0)), minT, maxT);
  if (!Array.isArray(lines) || !lines.length) return target;
  const pointCap = Infinity;
  lines.forEach(row => clampLineStats(row.stats));
  const rawTotal = lines.reduce((sum, row) => sum + parseNum(row.stats.pts, 0), 0);
  const scale = rawTotal > 0 ? target / rawTotal : 1;
  lines.forEach(row => scaleLineStats(row.stats, scale));
  lines.forEach(row => {
    let capGuard = 0;
    while (parseNum(row.stats?.pts, 0) > pointCap && capGuard < 80) {
      capGuard++;
      const diff = parseNum(row.stats.pts, 0) - pointCap;
      if (!removeOnePointFromLine(row.stats, Math.min(3, diff))) break;
    }
  });
  let total = lines.reduce((sum, row) => sum + parseNum(row.stats.pts, 0), 0);
  let guard = 0;
  while (total !== target && guard < 4200) {
    guard++;
    const diff = target - total;
    const needMore = diff > 0;
    const row = pickLineForAdjustment(lines, needMore, pointCap);
    if (!row) break;
    const st = row.stats;
    if (needMore) {
      if (!addOnePointToLine(st, pointCap, Math.min(3, diff))) break;
    } else {
      if (!removeOnePointFromLine(st, Math.min(3, Math.abs(diff)))) break;
    }
    clampLineStats(st);
    total = lines.reduce((sum, x) => sum + parseNum(x.stats.pts, 0), 0);
  }
  if (total < minT) {
    let extra = 0;
    while (total < minT && extra < 1200) {
      extra++;
      const row = pickLineForAdjustment(lines, true, pointCap);
      if (!row || !addOnePointToLine(row.stats, pointCap, Math.min(3, minT - total))) break;
      clampLineStats(row.stats);
      total = lines.reduce((sum, x) => sum + parseNum(x.stats.pts, 0), 0);
    }
  }
  if (total > maxT) {
    let cut = 0;
    while (total > maxT && cut < 1200) {
      cut++;
      const row = pickLineForAdjustment(lines, false, pointCap);
      if (!row || !removeOnePointFromLine(row.stats, Math.min(3, total - maxT))) break;
      clampLineStats(row.stats);
      total = lines.reduce((sum, x) => sum + parseNum(x.stats.pts, 0), 0);
    }
  }
  lines.forEach(row => {
    let capGuard = 0;
    while (parseNum(row.stats?.pts, 0) > pointCap && capGuard < 80) {
      capGuard++;
      if (!removeOnePointFromLine(row.stats, Math.min(3, parseNum(row.stats.pts, 0) - pointCap))) break;
      clampLineStats(row.stats);
    }
  });
  total = lines.reduce((sum, x) => sum + parseNum(x.stats.pts, 0), 0);
  return total;
}
function posUsageFactor(pos) {
  return ({ 1: 1.08, 2: 1.03, 3: 1, 4: 0.95, 5: 0.91 })[parseNum(pos, 3)] || 1;
}
function posThreeBias(pos) {
  return ({ 1: 0.06, 2: 0.08, 3: 0.03, 4: -0.04, 5: -0.1 })[parseNum(pos, 3)] || 0;
}
function posRebFactor(pos) {
  return ({ 1: 0.62, 2: 0.76, 3: 0.95, 4: 1.18, 5: 1.42 })[parseNum(pos, 3)] || 1;
}
function posAstFactor(pos) {
  return ({ 1: 1.45, 2: 1.12, 3: 0.86, 4: 0.64, 5: 0.52 })[parseNum(pos, 3)] || 0.85;
}
function posStlFactor(pos) {
  return ({ 1: 1.08, 2: 1.02, 3: 0.92, 4: 0.78, 5: 0.66 })[parseNum(pos, 3)] || 0.9;
}
function posBlkFactor(pos) {
  return ({ 1: 0.34, 2: 0.44, 3: 0.66, 4: 0.96, 5: 1.26 })[parseNum(pos, 3)] || 0.8;
}
function shotPctByType(type, attrs, teamRating, oppRating) {
  const diff = (parseNum(teamRating, 75) - parseNum(oppRating, 75)) * 0.18;
  if (type === 'in') {
    return clamp(Math.round(40 + ((parseNum(attrs.shotInt, 55) - 50) * 0.45) + ((parseNum(attrs.physique, 55) - 50) * 0.12) + diff + rng(-3, 3)), 40, 80);
  }
  if (type === 'do') {
    return clamp(Math.round(30 + ((parseNum(attrs.shotInt, 55) - 50) * 0.34) + ((parseNum(attrs.shotExt, 55) - 50) * 0.12) + diff + rng(-3, 3)), 32, 60);
  }
  if (type === 'ex') {
    return clamp(Math.round(28 + ((parseNum(attrs.shotExt, 55) - 50) * 0.42) + diff * 0.7 + rng(-3, 3)), 22, 48);
  }
  return clamp(Math.round(50 + ((parseNum(attrs.shotFree, 55) - 50) * 0.5) + rng(-3, 3)), 40, 95);
}
function simulateAIPlayerLine(player, minutes, teamRating, oppRating, opponentSample = null, options = {}) {
  const rawAttrs = player.attrs && Object.keys(player.attrs).length ? player.attrs : parsePlayerAttrs(player);
  const badgeFx = getBadgeEffects(player);
  const attrs = { ...rawAttrs };
  if (badgeFx.attrBoost) {
    Object.entries(badgeFx.attrBoost).forEach(([k, v]) => {
      attrs[k] = clamp(parseNum(attrs[k], 55) + parseNum(v, 0), 20, 99);
    });
  }
  const badgeLevels = Array.isArray(player?.badges)
    ? player.badges.length
    : Object.values(player?.badges || {}).reduce((s, lv) => s + clamp(parseNum(lv, 0), 0, 4), 0);
  const badgePower = Math.min(6, badgeLevels * 0.24);
  const rating = clamp(parseNum(player.rating, ovr(rawAttrs)) + badgePower, 40, 99);
  const pos = parseNum(player.pos, 3);
  const mins = clamp(Math.round(parseNum(minutes, 20) + rng(-2, 2)), 8, 40);
  const tendencyIn = parseNum(player.tendencies?.in, 65);
  const tendencyMid = parseNum(player.tendencies?.mid, 65);
  const tendencyEx = parseNum(player.tendencies?.ex, 65);
  const playerTeamId = parseNum(player.teamId, 0);
  const opponent = opponentSample || {
    id: `opp_${parseNum(oppRating, 75)}`,
    pos: 3, pos2: 0, teamId: 0, rating: parseNum(oppRating, 75), stamina: 78,
    attrs: {
      pass: oppRating, shotInt: oppRating, shotExt: oppRating, shotFree: oppRating,
      physique: oppRating, blk: oppRating, reb: oppRating, stl: oppRating, speed: oppRating, strength: oppRating
    },
    tendencies: { in: 65, mid: 65, ex: 65 }
  };
  const opponentTeamId = parseNum(opponent.teamId, 0);

  // 获取教练风格影响
  const coachFx = playerTeamId > 0 ? getCoachEffects(playerTeamId) : {};
  const coachThreeBias = parseNum(coachFx.threeBias, 0);
  const coachInsideBias = parseNum(coachFx.insideBias, 0);
  const usageContext = options?.usageContext || (playerTeamId > 0 ? buildTeamUsageContext(playerTeamId, options?.roster, options?.rotation) : null);
  const roles = getPlayerRole(player, usageContext?.roster || options?.roster, coachFx, usageContext);
  const roleFx = collectRoleEffects(roles);

  const diff = rating - parseNum(oppRating, 75);
  const usage = clamp(0.27 + ((rating - 70) * 0.003) + (diff / 80) + roleFx.usageMod, 0.18, 0.52) * posUsageFactor(pos);
  const fga = clamp(Math.round(mins * usage) + rng(-2, 2), 2, 29);

  // 三分出手率受教练三分倾向影响
  const threeRate = clamp(0.08 + parseNum(attrs.shotExt, 55) / 260 + (tendencyEx - 50) / 500 + posThreeBias(pos) + coachThreeBias + roleFx.threeMod, 0.04, 0.62);
  const tpa = clamp(Math.round(fga * threeRate) + rng(-1, 1), 0, Math.min(14, fga));
  const nonThree = Math.max(0, fga - tpa);
  // 内线出手比例受教练内线倾向影响, 中投倾向mid降低内线比例
  const inShare = clamp(0.32 + parseNum(attrs.shotInt, 55) / 290 + (tendencyIn - 50) / 500 - (tendencyMid - 50) / 550 - (threeRate * 0.18) + coachInsideBias + roleFx.insideMod, 0.22, 0.76);
  const shotsIn = clamp(Math.round(nonThree * inShare), 0, nonThree);
  const shotsDo = Math.max(0, nonThree - shotsIn);

  let inPct = getPlayerShotPercentByType(player, opponent, 'in', { playerTeamId, opponentTeamId, lineupPos: pos, minutes: mins });
  let doPct = getPlayerShotPercentByType(player, opponent, 'do', { playerTeamId, opponentTeamId, lineupPos: pos, minutes: mins });
  let exPct = getPlayerShotPercentByType(player, opponent, 'ex', { playerTeamId, opponentTeamId, lineupPos: pos, minutes: mins });
  let frPct = getPlayerShotPercentByType(player, opponent, 'fr', { playerTeamId, opponentTeamId, lineupPos: pos, minutes: mins });
  const insidePctBonus = parseNum(badgeFx.fgPctBonus, 0) + parseNum(badgeFx.insidePctBonus, 0);
  const aiClutch = (badgeFx.clutchBoost > 0 && G.phase === 'playoffs') ? badgeFx.clutchBoost * 100 : 0;
  inPct = clamp(Math.round(inPct + insidePctBonus * 100 + aiClutch), 40, 88);
  doPct = clamp(Math.round(doPct + insidePctBonus * 80 + aiClutch), 32, 68);
  exPct = clamp(Math.round(exPct + parseNum(badgeFx.tpPctBonus, 0) * 100 + aiClutch), 22, 58);
  frPct = clamp(Math.round(frPct + parseNum(badgeFx.ftPctBonus, 0) * 100), 40, 98);

  const inOk = shotInResult(inPct, shotsIn);
  const doOk = shotDoResult(doPct, shotsDo);
  const exOk = shotExResult(exPct, tpa);
  const fgm = inOk + doOk + exOk;

  const drive = ((parseNum(attrs.shotInt, 55) * 0.42) + (parseNum(attrs.physique, 55) * 0.3) + (parseNum(attrs.strength, 55) * 0.28));
  const ftaBase = (shotsIn * 0.31) + (shotsDo * 0.08) + (drive / 120);
  const fta = clamp(Math.round(ftaBase) + rng(0, 2), 0, 14);
  const ftm = shotFrResult(frPct, fta);

  const astBase = (mins / 36) * (0.7 + parseNum(attrs.pass, 55) / 24) * posAstFactor(pos);
  const rebBase = (mins / 36) * (1.1 + parseNum(attrs.reb, 55) / 18) * posRebFactor(pos);
  const stlBase = (mins / 36) * (parseNum(attrs.stl, 55) / 48) * posStlFactor(pos);
  const blkBase = (mins / 36) * (parseNum(attrs.blk, 55) / 48) * posBlkFactor(pos);
  const tovBase = (mins / 36) * (1 + fga / 8 + (pos <= 2 ? 0.65 : 0.25) - parseNum(attrs.pass, 55) / 95 - roleFx.astMod * 0.08);

  const ast = clamp(Math.round(astBase + roleFx.astMod + parseNum(badgeFx.astFlat, 0)) + rng(-2, 2), 0, 14);
  const reb = clamp(Math.round(rebBase + parseNum(badgeFx.rebFlat, 0)) + rng(-1, 2), 0, 20);
  const stl = clamp(Math.round(stlBase + parseNum(badgeFx.stlFlat, 0)) + rng(0, 1), 0, 5);
  const blk = clamp(Math.round(blkBase + parseNum(badgeFx.blkFlat, 0)) + rng(0, 1), 0, 5);
  const tov = clamp(Math.round(tovBase * clamp(parseNum(badgeFx.tovMult, 1), 0.55, 1.8)) + rng(0, 2), 0, 7);

  const line = clampLineStats({ mins, reb, ast, stl, blk, tov, fgm, fga, tpm: exOk, tpa, ftm, fta, pts: 0 });
  return line;
}
function estimateLeagueTeamScore(teamRating, oppRating) {
  const pace = estimateLeagueGamePace(teamRating, oppRating);
  const offEff = 110 + (parseNum(teamRating, 75) - 75) * 0.52 - (parseNum(oppRating, 75) - 75) * 0.34 + rng(-5, 5);
  return clamp(Math.round((pace * offEff) / 100), 78, 132);
}
function estimateLeagueGamePace(teamRating, oppRating, { playoff = false } = {}) {
  const t = parseNum(teamRating, 75);
  const o = parseNum(oppRating, 75);
  const avg = (t + o) / 2;
  const style = (avg - 75) * 0.24;
  const spreadDrag = Math.abs(t - o) * 0.06;
  const playoffDrag = playoff ? 1.6 : 0;
  return clamp(Math.round(95 + style - spreadDrag - playoffDrag + rng(-3, 3)), 88, 108);
}
function estimateLeagueGameTargets(teamA, teamB, { playoff = false } = {}) {
  const pace = estimateLeagueGamePace(teamA, teamB, { playoff });
  const possA = clamp(pace + rng(-3, 3), 82, 114);
  const possB = clamp(pace + rng(-3, 3), 82, 114);
  const offA = 109 + (parseNum(teamA, 75) - 75) * 0.58 - (parseNum(teamB, 75) - 75) * 0.32 + rng(-4, 4);
  const offB = 109 + (parseNum(teamB, 75) - 75) * 0.58 - (parseNum(teamA, 75) - 75) * 0.32 + rng(-4, 4);
  const scoreA = clamp(Math.round((possA * offA) / 100), 78, 136);
  const scoreB = clamp(Math.round((possB * offB) / 100), 78, 136);
  return { scoreA, scoreB, pace, possA, possB };
}
function normalizeSegmentWeights(baseWeights) {
  const safe = (baseWeights || []).map(w => Math.max(0.12, parseNum(w, 0.25)));
  const sum = safe.reduce((s, v) => s + v, 0) || 1;
  return safe.map(v => v / sum);
}
function splitScoreByWeights(totalScore, rawWeights) {
  const total = Math.max(0, Math.round(parseNum(totalScore, 0)));
  const weights = normalizeSegmentWeights(rawWeights);
  if (!weights.length) return [total];
  const raw = weights.map(w => w * total);
  const base = raw.map(v => Math.floor(v));
  let remain = total - base.reduce((s, v) => s + v, 0);
  const order = raw
    .map((v, i) => ({ i, frac: v - base[i] }))
    .sort((a, b) => b.frac - a.frac);
  let ptr = 0;
  while (remain > 0 && order.length) {
    base[order[ptr % order.length].i]++;
    remain--;
    ptr++;
  }
  return base;
}
function buildRunNarratives(homeTeamId, awayTeamId, { closeGame = false, playoff = false } = {}) {
  const homeAbbr = getTeam(homeTeamId)?.a || 'HOME';
  const awayAbbr = getTeam(awayTeamId)?.a || 'AWAY';
  const runs = [];
  const runCount = closeGame ? rng(2, 4) : rng(1, 3);
  for (let i = 0; i < runCount; i++) {
    const isHomeRun = Math.random() < 0.5;
    const runFor = rng(playoff ? 9 : 8, playoff ? 16 : 15);
    const runAgainst = rng(0, closeGame ? 6 : 5);
    const attack = Math.max(runFor, runAgainst + rng(3, 8));
    const defend = Math.min(runAgainst, attack - 2);
    const team = isHomeRun ? homeAbbr : awayAbbr;
    runs.push(`${team} 打出 ${attack}-${defend} 攻击波`);
  }
  return runs;
}
function buildGameFlowDetail({ homeTeamId = 0, awayTeamId = 0, homeScore = 100, awayScore = 96, homeStrength = 75, awayStrength = 75, phase = 'regular' } = {}) {
  const hScore = clamp(Math.round(parseNum(homeScore, 100)), 60, 145);
  const aScore = clamp(Math.round(parseNum(awayScore, 96)), 60, 145);
  const diff = Math.abs(hScore - aScore);
  const playoff = String(phase || '').toLowerCase() === 'playoff';
  const closeGame = diff <= 8;

  const pace = estimateLeagueGamePace(homeStrength, awayStrength, { playoff });
  const homePoss = clamp(pace + rng(-3, 3), 82, 114);
  const awayPoss = clamp(pace + rng(-3, 3), 82, 114);
  const homeOrtg = +((hScore / Math.max(homePoss, 1)) * 100).toFixed(1);
  const awayOrtg = +((aScore / Math.max(awayPoss, 1)) * 100).toFixed(1);
  const homeEfg = +(clamp(0.47 + ((homeOrtg - 108) * 0.0024) + (rng(-20, 20) / 1000), 0.42, 0.64) * 100).toFixed(1);
  const awayEfg = +(clamp(0.47 + ((awayOrtg - 108) * 0.0024) + (rng(-20, 20) / 1000), 0.42, 0.64) * 100).toFixed(1);
  const homeTovRate = +clamp(12.8 - ((parseNum(homeStrength, 75) - 75) * 0.12) + (rng(-14, 14) / 10), 9.2, 17.8).toFixed(1);
  const awayTovRate = +clamp(12.8 - ((parseNum(awayStrength, 75) - 75) * 0.12) + (rng(-14, 14) / 10), 9.2, 17.8).toFixed(1);

  const homeWeights = normalizeSegmentWeights([
    0.24 + (rng(-15, 15) / 1000),
    0.25 + (rng(-15, 15) / 1000),
    0.23 + (rng(-15, 15) / 1000),
    0.28 + (closeGame ? 0.015 : -0.005) + (rng(-12, 12) / 1000)
  ]);
  const awayWeights = normalizeSegmentWeights([
    0.24 + (rng(-15, 15) / 1000),
    0.25 + (rng(-15, 15) / 1000),
    0.23 + (rng(-15, 15) / 1000),
    0.28 + (closeGame ? 0.015 : -0.005) + (rng(-12, 12) / 1000)
  ]);

  let periodLabels = ['Q1', 'Q2', 'Q3', 'Q4'];
  let homePeriods = [];
  let awayPeriods = [];
  let hasOvertime = false;
  const otChance = playoff ? 0.22 : 0.12;
  if (diff <= 6 && Math.random() < otChance) {
    let otHome = clamp(rng(6, 14) + (hScore > aScore ? 1 : 0), 5, 18);
    let otAway = clamp(rng(6, 14) + (aScore > hScore ? 1 : 0), 5, 18);
    if (hScore > aScore && otHome <= otAway) otHome = Math.min(18, otAway + 1);
    if (aScore > hScore && otAway <= otHome) otAway = Math.min(18, otHome + 1);
    const regHome = hScore - otHome;
    const regAway = aScore - otAway;
    if (regHome >= 62 && regAway >= 62) {
      homePeriods = splitScoreByWeights(regHome, homeWeights);
      awayPeriods = splitScoreByWeights(regAway, awayWeights);
      periodLabels = ['Q1', 'Q2', 'Q3', 'Q4', 'OT'];
      homePeriods.push(otHome);
      awayPeriods.push(otAway);
      hasOvertime = true;
    }
  }
  if (!homePeriods.length || !awayPeriods.length) {
    homePeriods = splitScoreByWeights(hScore, homeWeights);
    awayPeriods = splitScoreByWeights(aScore, awayWeights);
  }

  let swingSeed = 0;
  let hCum = 0;
  let aCum = 0;
  let lastLeader = 0;
  for (let i = 0; i < homePeriods.length; i++) {
    hCum += parseNum(homePeriods[i], 0);
    aCum += parseNum(awayPeriods[i], 0);
    const leader = hCum === aCum ? 0 : (hCum > aCum ? 1 : -1);
    if (leader !== 0 && lastLeader !== 0 && leader !== lastLeader) swingSeed++;
    if (leader !== 0) lastLeader = leader;
  }
  const leadChanges = clamp(swingSeed * 2 + (closeGame ? rng(4, 10) : rng(1, 5)), 1, 26);
  const winnerHome = hScore > aScore;
  const winnerLead = clamp(diff + rng(6, 14), 6, 30);
  const loserLead = clamp(rng(1, closeGame ? 8 : 6), 0, 14);
  const biggestLeadHome = winnerHome ? winnerLead : loserLead;
  const biggestLeadAway = winnerHome ? loserLead : winnerLead;
  const clutch = hasOvertime || diff <= 7 || (diff <= 12 && Math.random() < 0.45);
  const clutchMargin = clutch ? clamp(diff, 1, 12) : 0;

  let summary = '';
  if (hasOvertime) summary = '鏖战到加时才分出胜负。';
  else if (diff <= 3) summary = '最后一攻决定了比赛。';
  else if (diff <= 8) summary = '末节关键回合拉开分差。';
  else if (diff <= 15) summary = '第三节打出分差，末节守住优势。';
  else summary = '上半场建立优势，比赛节奏被完全掌控。';
  if (playoff) summary = `季后赛强度拉满，${summary}`;

  return {
    phase: playoff ? 'playoff' : 'regular',
    homeAbbr: getTeam(homeTeamId)?.a || 'HOME',
    awayAbbr: getTeam(awayTeamId)?.a || 'AWAY',
    periodLabels,
    homePeriods,
    awayPeriods,
    hasOvertime,
    pace,
    homePoss,
    awayPoss,
    homeOrtg,
    awayOrtg,
    homeEfg,
    awayEfg,
    homeTovRate,
    awayTovRate,
    leadChanges,
    biggestLeadHome,
    biggestLeadAway,
    clutch,
    clutchMargin,
    runs: buildRunNarratives(homeTeamId, awayTeamId, { closeGame, playoff }),
    summary
  };
}
function orientFlowForUser(flow, userIsHome) {
  if (!flow || typeof flow !== 'object') return null;
  const home = !!userIsHome;
  return {
    periodLabels: Array.isArray(flow.periodLabels) ? [...flow.periodLabels] : ['Q1', 'Q2', 'Q3', 'Q4'],
    myPeriods: Array.isArray(home ? flow.homePeriods : flow.awayPeriods) ? [...(home ? flow.homePeriods : flow.awayPeriods)] : [],
    oppPeriods: Array.isArray(home ? flow.awayPeriods : flow.homePeriods) ? [...(home ? flow.awayPeriods : flow.homePeriods)] : [],
    hasOvertime: !!flow.hasOvertime,
    pace: parseNum(flow.pace, 96),
    myPoss: parseNum(home ? flow.homePoss : flow.awayPoss, 95),
    oppPoss: parseNum(home ? flow.awayPoss : flow.homePoss, 95),
    myOrtg: parseNum(home ? flow.homeOrtg : flow.awayOrtg, 110),
    oppOrtg: parseNum(home ? flow.awayOrtg : flow.homeOrtg, 108),
    myEfg: parseNum(home ? flow.homeEfg : flow.awayEfg, 50),
    oppEfg: parseNum(home ? flow.awayEfg : flow.homeEfg, 50),
    myTovRate: parseNum(home ? flow.homeTovRate : flow.awayTovRate, 13),
    oppTovRate: parseNum(home ? flow.awayTovRate : flow.homeTovRate, 13),
    leadChanges: parseNum(flow.leadChanges, 0),
    myBiggestLead: parseNum(home ? flow.biggestLeadHome : flow.biggestLeadAway, 0),
    oppBiggestLead: parseNum(home ? flow.biggestLeadAway : flow.biggestLeadHome, 0),
    clutch: !!flow.clutch,
    clutchMargin: parseNum(flow.clutchMargin, 0),
    runs: Array.isArray(flow.runs) ? [...flow.runs] : [],
    summary: String(flow.summary || ''),
    myAbbr: home ? (flow.homeAbbr || 'ME') : (flow.awayAbbr || 'ME'),
    oppAbbr: home ? (flow.awayAbbr || 'OPP') : (flow.homeAbbr || 'OPP')
  };
}
function linesToGameDetailRows(lines, teamId) {
  return sortGameDetailRows((lines || []).map(({ player, stats }) => makeGameDetailRow(player, stats, teamId)));
}
function simulateLeagueMatchup(teamAId, teamBId, { roundIndex = 0, forceWinnerId = 0, scoreOverride = null, userGame = false, userTeamId = 0, userLine = null, userInjured = false } = {}) {
  const teamAObj = LEAGUE.teams?.[teamAId];
  const teamBObj = LEAGUE.teams?.[teamBId];
  const strA = getTeamStrength(teamAId);
  const strB = getTeamStrength(teamBId);
  const linesA = [], linesB = [];

  if (LEAGUE.loaded && teamAObj && teamBObj) {
    const rotA = buildDynamicTeamRotation(teamAId, { includeUser: false });
    const rotB = buildDynamicTeamRotation(teamBId, { includeUser: false });
    const mapA = new Map((teamAObj.players || []).map(p => [String(p.id), p]));
    const mapB = new Map((teamBObj.players || []).map(p => [String(p.id), p]));
    const usageCtxA = buildTeamUsageContext(teamAId, [...mapA.values()], rotA);
    const usageCtxB = buildTeamUsageContext(teamBId, [...mapB.values()], rotB);
    rotA.forEach((r, i) => {
      const p = mapA.get(String(r.id));
      if (!p || p.injury?.active) return;
      const oppRef = rotB.length ? mapB.get(String(rotB[i % rotB.length].id)) : null;
      const st = simulateAIPlayerLine(p, r.minutes, strA, strB, oppRef, { usageContext: usageCtxA });
      linesA.push({ player: p, stats: st });
      maybeInjureLeaguePlayer(p, st.mins);
    });
    rotB.forEach((r, i) => {
      const p = mapB.get(String(r.id));
      if (!p || p.injury?.active) return;
      const oppRef = rotA.length ? mapA.get(String(rotA[i % rotA.length].id)) : null;
      const st = simulateAIPlayerLine(p, r.minutes, strB, strA, oppRef, { usageContext: usageCtxB });
      linesB.push({ player: p, stats: st });
      maybeInjureLeaguePlayer(p, st.mins);
    });
  }

  let targetA, targetB;
  if (scoreOverride && Number.isFinite(scoreOverride.scoreA) && Number.isFinite(scoreOverride.scoreB)) {
    targetA = clamp(Math.round(scoreOverride.scoreA), 60, 145);
    targetB = clamp(Math.round(scoreOverride.scoreB), 60, 145);
  } else {
    const targetPack = estimateLeagueGameTargets(strA, strB, { playoff: false });
    targetA = parseNum(targetPack.scoreA, estimateLeagueTeamScore(strA, strB));
    targetB = parseNum(targetPack.scoreB, estimateLeagueTeamScore(strB, strA));
  }
  if (forceWinnerId === teamAId && targetA <= targetB) targetA = targetB + 1;
  if (forceWinnerId === teamBId && targetB <= targetA) targetB = targetA + 1;
  if (targetA === targetB) {
    if (Math.random() < 0.5) targetA++;
    else targetB++;
  }

  let scoreA = linesA.length ? normalizeTeamLinesToScore(linesA, targetA) : targetA;
  let scoreB = linesB.length ? normalizeTeamLinesToScore(linesB, targetB) : targetB;
  if (forceWinnerId === teamAId && scoreA <= scoreB) {
    scoreA = linesA.length ? normalizeTeamLinesToScore(linesA, scoreB + 1) : scoreB + 1;
  }
  if (forceWinnerId === teamBId && scoreB <= scoreA) {
    scoreB = linesB.length ? normalizeTeamLinesToScore(linesB, scoreA + 1) : scoreA + 1;
  }
  if (scoreA === scoreB) {
    if (Math.random() < 0.5) scoreA++;
    else scoreB++;
  }
  scoreA = clamp(scoreA, 60, 145);
  scoreB = clamp(scoreB, 60, 145);
  if (scoreA === scoreB) {
    if (Math.random() < 0.5) scoreA = Math.min(145, scoreA + 1);
    else scoreB = Math.min(145, scoreB + 1);
  }
  const flow = buildGameFlowDetail({
    homeTeamId: teamAId,
    awayTeamId: teamBId,
    homeScore: scoreA,
    awayScore: scoreB,
    homeStrength: strA,
    awayStrength: strB,
    phase: 'regular'
  });

  const userTid = parseNum(userTeamId, 0);
  const shouldInjectUser = !!userGame && userTid > 0 && (teamAId === userTid || teamBId === userTid);
  if (shouldInjectUser && userLine) {
    const userPts = clamp(parseNum(userLine.pts, 0), 0, 80);
    if (teamAId === userTid && linesA.length) {
      normalizeTeamLinesToScore(linesA, Math.max(0, scoreA - userPts), { minTarget: 0, maxTarget: 145 });
    } else if (teamBId === userTid && linesB.length) {
      normalizeTeamLinesToScore(linesB, Math.max(0, scoreB - userPts), { minTarget: 0, maxTarget: 145 });
    }
  }

  const aWin = scoreA > scoreB;
  addLeagueTeamGameResult(teamAId, teamBId, roundIndex, true, scoreA, scoreB);
  addLeagueTeamGameResult(teamBId, teamAId, roundIndex, false, scoreB, scoreA);
  linesA.forEach(({ player, stats }) => {
    const line = ensureLeaguePlayerLine(teamAId, player, false);
    addSeasonLineStat(line, stats);
  });
  linesB.forEach(({ player, stats }) => {
    const line = ensureLeaguePlayerLine(teamBId, player, false);
    addSeasonLineStat(line, stats);
  });

  const homeRows = linesToGameDetailRows(linesA, teamAId);
  const awayRows = linesToGameDetailRows(linesB, teamBId);
  if (shouldInjectUser) {
    const selfPseudo = {
      id: 'USER_SELF',
      name: G.player.name,
      pos: G.player.pos,
      pos2: 0,
      rating: ovr(G.player.attrs || {})
    };
    const selfRow = userLine
      ? makeGameDetailRow(selfPseudo, userLine, userTid, { isSelf: true })
      : makeGameDetailRow(selfPseudo, null, userTid, { isSelf: true, status: userInjured ? '缺阵' : 'DNP' });
    if (teamAId === userTid) {
      homeRows.push(selfRow);
      sortGameDetailRows(homeRows);
    } else if (teamBId === userTid) {
      awayRows.push(selfRow);
      sortGameDetailRows(awayRows);
    }
  }

  const gameId = `S${G.season}_R${roundIndex + 1}_H${teamAId}_A${teamBId}`;
  addLeagueGameDetail({
    id: gameId,
    season: G.season,
    year: G.year,
    phase: 'regular',
    round: roundIndex + 1,
    homeTeamId: teamAId,
    awayTeamId: teamBId,
    homeScore: scoreA,
    awayScore: scoreB,
    winTeamId: aWin ? teamAId : teamBId,
    userGame: !!shouldInjectUser,
    flow,
    homeRows,
    awayRows
  });
  // 生成高光新闻（高分、三双等）
  generateHighlightNews([...homeRows, ...awayRows], teamAId, teamBId, { scoreA, scoreB, flow });
  return { aWin, scoreA, scoreB, gameId, homeRows, awayRows, flow };
}
// ============ APK风格高光新闻生成器 ============
function generateHighlightNews(rows, homeId, awayId, gameInfo = null) {
  const homeTeam = (getTeam(homeId) || {}).a || '主队';
  const awayTeam = (getTeam(awayId) || {}).a || '客队';
  const newsGenerated = new Set();
  if (gameInfo && Number.isFinite(parseNum(gameInfo.scoreA, NaN)) && Number.isFinite(parseNum(gameInfo.scoreB, NaN))) {
    const flow = gameInfo.flow || {};
    const homeScore = parseNum(gameInfo.scoreA, 0);
    const awayScore = parseNum(gameInfo.scoreB, 0);
    const finalMargin = Math.abs(homeScore - awayScore);
    const closeGame = !!flow.hasOvertime || !!flow.clutch || finalMargin <= 7;
    const recap = String(flow.summary || '').trim() || (closeGame
      ? '末段一直咬到最后才分出胜负。'
      : '全场四节节奏清晰，胜负在整体执行里逐步拉开。');
    addNews(`📣 赛后快报：${homeTeam} ${homeScore}-${awayScore} ${awayTeam}，${recap}`, closeGame ? 'pos' : 'neu');
    const labels = Array.isArray(flow.periodLabels) && flow.periodLabels.length ? flow.periodLabels : ['Q1', 'Q2', 'Q3', 'Q4'];
    const homePeriods = Array.isArray(flow.homePeriods) ? flow.homePeriods : [];
    const awayPeriods = Array.isArray(flow.awayPeriods) ? flow.awayPeriods : [];
    const periodText = labels.map((label, idx) => `${label} ${parseNum(homePeriods[idx], 0)}-${parseNum(awayPeriods[idx], 0)}`).join('；');
    if (periodText) addNews(`🧭 四节走势：${periodText}`, 'neu');
  }

  // 按得分排序找最佳球员
  const validRows = rows.filter(r => r.status !== '缺阵' && r.status !== 'DNP');
  const sortedByPts = [...validRows].sort((a, b) => parseNum(b.pts, 0) - parseNum(a.pts, 0));

  validRows.forEach(r => {
    const pts = parseNum(r.pts, 0), reb = parseNum(r.reb, 0), ast = parseNum(r.ast, 0);
    const stl = parseNum(r.stl, 0), blk = parseNum(r.blk, 0), tov = parseNum(r.tov, 0);
    const fgm = parseNum(r.fgm, 0), fga = parseNum(r.fga, 0), tpm = parseNum(r.tpm, 0);
    const team = (getTeam(r.teamId) || {}).a || '--';
    const key = `${r.teamId}_${r.name}`;

    // ========== 超级表现 ==========
    // 70+分（传奇级）
    if (pts >= 70 && !newsGenerated.has(key)) {
      addNews(`🏆 历史之夜！${r.name}（${team}）狂砍${pts}分创造历史！`, 'special');
      newsGenerated.add(key);
    }
    // 60+分
    else if (pts >= 60 && !newsGenerated.has(key)) {
      const templates = [
        `🔥 无人可挡！${r.name}（${team}）爆发${pts}分！`,
        `🔥 ${r.name}（${team}）${pts}分，全场沸腾！`,
        `🔥 历史级表演！${r.name}（${team}）砍下${pts}分！`
      ];
      addNews(pick(templates), 'special');
      newsGenerated.add(key);
    }
    // 50+分
    else if (pts >= 50 && !newsGenerated.has(key)) {
      const templates = [
        `💥 ${r.name}（${team}）大爆发，狂砍${pts}分！`,
        `💥 ${r.name}（${team}）${pts}分带队取胜！`,
        `💥 得分狂人！${r.name}（${team}）轰下${pts}分！`
      ];
      addNews(pick(templates), 'pos');
      newsGenerated.add(key);
    }
    // 40+分（50%概率）
    else if (pts >= 40 && Math.random() < 0.5 && !newsGenerated.has(key)) {
      const templates = [
        `🏀 ${r.name}（${team}）砍下${pts}分`,
        `🏀 ${r.name}（${team}）${pts}分带领球队`,
        `🏀 高效输出！${r.name}（${team}）贡献${pts}分`
      ];
      addNews(pick(templates), 'neu');
      newsGenerated.add(key);
    }
    // 30+分首秀或第一场（低概率）
    else if (pts >= 30 && Math.random() < 0.15 && !newsGenerated.has(key)) {
      addNews(`📈 ${r.name}（${team}）拿下${pts}分表现出色`, 'neu');
      newsGenerated.add(key);
    }

    // ========== 特殊数据成就 ==========
    // 5x5
    if (pts >= 5 && reb >= 5 && ast >= 5 && stl >= 5 && blk >= 5 && !newsGenerated.has(key + '_5x5')) {
      addNews(`🌟 稀有成就！${r.name}（${team}）达成5x5：${pts}分${reb}板${ast}助${stl}断${blk}帽`, 'special');
      newsGenerated.add(key + '_5x5');
    }

    // 三双
    const td = (pts >= 10 ? 1 : 0) + (reb >= 10 ? 1 : 0) + (ast >= 10 ? 1 : 0) + (stl >= 10 ? 1 : 0) + (blk >= 10 ? 1 : 0);
    if (td >= 3 && !newsGenerated.has(key + '_td')) {
      if (pts >= 30) addNews(`📊 ${r.name}（${team}）30+三双：${pts}分${reb}板${ast}助！`, 'special');
      else addNews(`📊 ${r.name}（${team}）收获三双：${pts}分${reb}板${ast}助`, 'pos');
      newsGenerated.add(key + '_td');
    }

    // 20-20
    if ((pts >= 20 && reb >= 20) || (pts >= 20 && ast >= 20) || (reb >= 20 && ast >= 20)) {
      if (!newsGenerated.has(key + '_2020')) {
        addNews(`👑 ${r.name}（${team}）收获20-20：${pts}分${reb}板${ast}助`, 'special');
        newsGenerated.add(key + '_2020');
      }
    }

    // ========== 单项数据领袖 ==========
    // 助攻王（14+）
    if (ast >= 14 && Math.random() < 0.6 && !newsGenerated.has(key + '_ast')) {
      addNews(`🎯 ${r.name}（${team}）送出${ast}次助攻，组织核心！`, 'neu');
      newsGenerated.add(key + '_ast');
    }
    // 篮板王（18+）
    if (reb >= 18 && Math.random() < 0.6 && !newsGenerated.has(key + '_reb')) {
      addNews(`💪 ${r.name}（${team}）狂抢${reb}个篮板，统治内线！`, 'neu');
      newsGenerated.add(key + '_reb');
    }
    // 盖帽王（6+）
    if (blk >= 6 && Math.random() < 0.7 && !newsGenerated.has(key + '_blk')) {
      addNews(`🚫 ${r.name}（${team}）送出${blk}记盖帽，禁区守护者！`, 'neu');
      newsGenerated.add(key + '_blk');
    }
    // 抢断王（5+）
    if (stl >= 5 && Math.random() < 0.6 && !newsGenerated.has(key + '_stl')) {
      addNews(`🕵️ ${r.name}（${team}）${stl}次抢断，防守利器！`, 'neu');
      newsGenerated.add(key + '_stl');
    }

    // ========== 双双 ==========
    const dd = (pts >= 10 ? 1 : 0) + (reb >= 10 ? 1 : 0) + (ast >= 10 ? 1 : 0);
    if (dd >= 2 && td < 3 && pts >= 20 && Math.random() < 0.2 && !newsGenerated.has(key + '_dd')) {
      addNews(`📋 ${r.name}（${team}）拿下两双：${pts}分${reb >= 10 ? reb + '板' : ''}${ast >= 10 ? ast + '助' : ''}`, 'neu');
      newsGenerated.add(key + '_dd');
    }

    // ========== 高效表现 ==========
    // 高命中率高得分
    if (pts >= 25 && fga >= 10 && fgm / fga >= 0.65 && Math.random() < 0.3 && !newsGenerated.has(key + '_eff')) {
      const pct = Math.round(fgm / fga * 100);
      addNews(`🎯 ${r.name}（${team}）高效输出${pts}分，命中率${pct}%！`, 'neu');
      newsGenerated.add(key + '_eff');
    }
    // 三分雨（6+三分）
    if (tpm >= 6 && Math.random() < 0.5 && !newsGenerated.has(key + '_3pt')) {
      addNews(`🌧️ ${r.name}（${team}）命中${tpm}记三分，手感火热！`, 'neu');
      newsGenerated.add(key + '_3pt');
    }
  });
}
function estimateUserTeamScore(win, playerPts, myStrength, oppStrength, { playoff = false } = {}) {
  const pPts = parseNum(playerPts, 0);
  const estimatePack = estimateLeagueGameTargets(myStrength, oppStrength, { playoff });
  const baseTeam = parseNum(estimatePack.scoreA, estimateLeagueTeamScore(myStrength, oppStrength));
  // 队友得分 = 基础估算 × (1 - 玩家占比)，玩家得分越高队友占比越低
  const teammatePct = clamp(0.78 - pPts / 350, 0.55, 0.82);
  const restPts = Math.round(baseTeam * teammatePct + rng(-4, 4));
  let my = clamp(restPts + pPts, 72, 145);
  let opp = clamp(Math.round(parseNum(estimatePack.scoreB, estimateLeagueTeamScore(oppStrength, myStrength)) + rng(-4, 4)), 72, 145);
  if (win && my <= opp) my = Math.min(145, opp + rng(1, 7));
  if (!win && opp <= my) opp = Math.min(145, my + rng(1, 7));
  if (my === opp) {
    if (win) my = Math.min(145, my + 1);
    else opp = Math.min(145, opp + 1);
  }
  return {
    my,
    opp,
    pace: parseNum(estimatePack.pace, 96),
    myPoss: parseNum(estimatePack.possA, 95),
    oppPoss: parseNum(estimatePack.possB, 95)
  };
}
function getApproxUserLineFromRole(oppRating) {
  const attrs = {
    pass: getEffectiveAttr('pass'),
    shotInt: getEffectiveAttr('shotInt'),
    shotExt: getEffectiveAttr('shotExt'),
    shotFree: getEffectiveAttr('shotFree'),
    physique: getEffectiveAttr('physique'),
    blk: getEffectiveAttr('blk'),
    reb: getEffectiveAttr('reb'),
    stl: getEffectiveAttr('stl'),
    speed: getEffectiveAttr('speed'),
    strength: getEffectiveAttr('strength')
  };
  const pseudo = {
    id: 'USER_SELF',
    name: G.player.name,
    pos: G.player.pos,
    pos2: 0,
    rating: ovr(attrs),
    tendencies: { in: 65, mid: 65, ex: 65 },
    attrs,
    teamId: G.teamId,
    stamina: G.player.stamina
  };
  const mins = clamp(parseNum(G._currentRoleMinutes, 24) + rng(-3, 3), 14, 40);
  const oppPseudo = {
    id: 'OPP_REF',
    pos: 3,
    pos2: 0,
    rating: parseNum(oppRating, 75),
    attrs: {
      pass: oppRating, shotInt: oppRating, shotExt: oppRating, shotFree: oppRating,
      physique: oppRating, blk: oppRating, reb: oppRating, stl: oppRating, speed: oppRating, strength: oppRating
    },
    tendencies: { in: 65, mid: 65, ex: 65 },
    teamId: 0,
    stamina: 80
  };
  return simulateAIPlayerLine(pseudo, mins, getTeamStrength(G.teamId), oppRating, oppPseudo);
}
function simulateLeagueRound(userGame) {
  ensureLeagueStateShape();
  tickLeagueInjuries();
  const roundIndex = clamp(parseNum(userGame.round, G.gameNum), 0, Math.max(0, G.schedule.length - 1));
  const userOppId = parseNum(userGame.oppId, 0) || parseNum(G.schedule[roundIndex]?.opp, 0);
  const userHome = G.schedule[roundIndex] ? !!G.schedule[roundIndex].home : true;
  const rounds = G.leagueSeason.roundSchedule || [];
  let matchups = Array.isArray(rounds[roundIndex]) ? [...rounds[roundIndex]] : [];
  if (!matchups.length && userOppId > 0) {
    const fallback = [{ home: userHome ? G.teamId : userOppId, away: userHome ? userOppId : G.teamId, user: true }];
    const rest = TEAMS.map(t => t.id).filter(id => id !== G.teamId && id !== userOppId);
    for (let i = rest.length - 1; i > 0; i--) { const j = rng(0, i);[rest[i], rest[j]] = [rest[j], rest[i]]; }
    for (let i = 0; i < rest.length - 1; i += 2) {
      if (Math.random() < 0.5) fallback.push({ home: rest[i], away: rest[i + 1], user: false });
      else fallback.push({ home: rest[i + 1], away: rest[i], user: false });
    }
    matchups = fallback;
  }

  const myStrength = getTeamStrength(G.teamId);
  const oppStrength = getTeamStrength(userOppId);
  const playerPts = userGame.st ? parseNum(userGame.st.pts, 0) : 0;
  const score = estimateUserTeamScore(!!userGame.win, playerPts, myStrength, oppStrength);
  let userBox = {
    myScore: score.my,
    oppScore: score.opp,
    gameId: '',
    flow: null
  };

  matchups.forEach(m => {
    const isUserGame = (m.home === G.teamId && m.away === userOppId) || (m.home === userOppId && m.away === G.teamId);
    if (isUserGame) {
      const scoreA = m.home === G.teamId ? score.my : score.opp;
      const scoreB = m.home === G.teamId ? score.opp : score.my;
      const forceWinner = !!userGame.win ? G.teamId : userOppId;
      const res = simulateLeagueMatchup(m.home, m.away, {
        roundIndex,
        forceWinnerId: forceWinner,
        scoreOverride: { scoreA, scoreB },
        userGame: true,
        userTeamId: G.teamId,
        userLine: userGame.st ? { ...userGame.st } : null,
        userInjured: !userGame.st
      });
      userBox = {
        myScore: m.home === G.teamId ? res.scoreA : res.scoreB,
        oppScore: m.home === G.teamId ? res.scoreB : res.scoreA,
        gameId: res.gameId || '',
        flow: orientFlowForUser(res.flow, m.home === G.teamId)
      };
      if (userGame.st) {
        const selfLine = ensureLeaguePlayerLine(G.teamId, { id: 'USER_SELF', name: G.player.name, pos: G.player.pos }, true);
        addSeasonLineStat(selfLine, userGame.st);
      }
    } else {
      simulateLeagueMatchup(m.home, m.away, { roundIndex });
    }
  });
  if (userGame.st) {
    userGame.st.teamPts = userBox.myScore;
    userGame.st.oppPts = userBox.oppScore;
  }
  G.leagueSeason.round = Math.max(G.leagueSeason.round, roundIndex + 1);
  // NPC球员全年分散成长：每轮比赛时触发增量成长
  if (LEAGUE.loaded) {
    Object.values(LEAGUE.teams).forEach(t => {
      const coach = t.coach || null;
      (t.players || []).forEach(p => applyNpcIncrementalGrowth(p, coach));
    });
  }
  return userBox;
}
function getLeagueTeamRecordsArray() {
  ensureLeagueStateShape();
  return TEAMS.map(t => {
    const rec = G.leagueSeason.teamRecords[t.id] || makeTeamRecord();
    return { id: t.id, w: rec.w || 0, l: rec.l || 0, gp: rec.gp || 0, pf: rec.pf || 0, pa: rec.pa || 0 };
  });
}
function getLeaguePlayerSeasonRows() {
  ensureLeagueStateShape();
  const rows = Object.values(G.leagueSeason.playerStats || {});
  return rows.map(r => {
    const gp = Math.max(parseNum(r.gp, 0), 1);
    return {
      ...r,
      ppg: +(parseNum(r.pts, 0) / gp).toFixed(1),
      rpg: +(parseNum(r.reb, 0) / gp).toFixed(1),
      apg: +(parseNum(r.ast, 0) / gp).toFixed(1),
      spg: +(parseNum(r.stl, 0) / gp).toFixed(1),
      bpg: +(parseNum(r.blk, 0) / gp).toFixed(1),
      tovpg: +(parseNum(r.tov, 0) / gp).toFixed(1),
      mpg: +(parseNum(r.mins, 0) / gp).toFixed(1),
      fgPct: parseNum(r.fga, 0) > 0 ? +(parseNum(r.fgm, 0) / parseNum(r.fga, 0) * 100).toFixed(1) : 0,
      tpPct: parseNum(r.tpa, 0) > 0 ? +(parseNum(r.tpm, 0) / parseNum(r.tpa, 0) * 100).toFixed(1) : 0
    };
  });
}
function getRookieLeaderboard() {
  const allRows = getLeaguePlayerSeasonRows().filter(r => parseNum(r.gp, 0) > 0);
  const rookieRows = [];
  allRows.forEach(r => {
    if (r.isSelf) {
      if (parseNum(G.season, 1) === 1) rookieRows.push(r);
      return;
    }
    const tid = parseNum(r.teamId, 0);
    const teamObj = LEAGUE.teams?.[tid];
    if (!teamObj) return;
    const p = (teamObj.players || []).find(pl => String(pl.id) === String(r.playerId));
    if (p && parseNum(p.yearsLeague, 99) === 0) rookieRows.push(r);
  });
  return rookieRows;
}
function changeStatsTeamView() {
  const sel = $('statsTeamSelect');
  if (!sel) return;
  G._statsTeamView = parseNum(sel.value, G.teamId);
  renderStats();
}

function simStandings() {
  G.standings = { East: [], West: [] };
  const records = getLeagueTeamRecordsArray();
  const played = records.some(r => r.gp > 0);
  if (played) {
    records.forEach(r => {
      const rec = { id: r.id, w: r.w, l: r.l };
      const conf = getTeam(r.id)?.c || 'East';
      if (conf === 'East') G.standings.East.push(rec);
      else G.standings.West.push(rec);
    });
  } else {
    TEAMS.forEach(t => {
      let w;
      if (t.id === G.teamId) { w = G.seasonStats.wins; }
      else {
        const base = Math.round(getTeamStrength(t.id) * 82 / 100);
        w = clamp(base + rng(-8, 8), 15, 67);
      }
      const rec = { id: t.id, w, l: 82 - w };
      if (t.c === 'East') G.standings.East.push(rec);
      else G.standings.West.push(rec);
    });
  }
  G.standings.East.sort((a, b) => b.w - a.w);
  G.standings.West.sort((a, b) => b.w - a.w);
}

function playGame(idx) {
  const gameRotation = ensureGameRotation();
  const selfSlot = gameRotation.find(r => r.isSelf || String(r.id) === 'USER_SELF');
  // 基础上场时间：在轮换则用轮换时间，否则只给12分钟垃圾时间
  const baseMin = selfSlot ? selfSlot.minutes : 12;
  // 信任与心情只做微调，不再硬性缩放主力分钟，避免核心球员被压成替补出场
  const trustAdj = Math.round((parseNum(G.player.trust, 50) - 50) / 16);
  const moodAdj = Math.round((parseNum(G.player.mood, 50) - 50) / 35);
  let minuteFloor = 8;
  const selfTier = selfSlot?.teamTier || 'end';
  const selfTierDef = getTierDef(selfTier);
  minuteFloor = selfTierDef.minRange[0];
  if (parseNum(selfSlot?.rating, ovr(G.player.attrs || {})) >= 84) minuteFloor = Math.max(minuteFloor, 32);
  G._currentRoleMinutes = clamp(Math.max(baseMin + trustAdj + moodAdj, minuteFloor), 8, 40);
  if (G.player.injury.active) {
    G._gameEvent = null;
    G._gameEventResult = null;
    G.player.injury.games--;
    if (G.player.injury.games <= 0) G.player.injury = { active: false, games: 0, type: "" };
    const opp = getTeam(G.schedule[idx].opp);
    const myStr = getTeamStrength(G.teamId);
    const oppStr = getTeamStrength(opp.id);
    const teamWin = Math.random() < (myStr / (myStr + oppStr));
    if (teamWin) G.seasonStats.wins++; else G.seasonStats.losses++;
    const box = simulateLeagueRound({ round: idx, oppId: opp.id, win: teamWin, st: null });
    G.results.push({
      game: idx + 1,
      season: G.season,
      year: G.year,
      teamId: G.teamId,
      opp: opp.id,
      home: G.schedule[idx].home,
      gameId: box?.gameId || '',
      injured: true,
      win: teamWin,
      teamPts: parseNum(box?.myScore, 0),
      oppPts: parseNum(box?.oppScore, 0),
      flow: box?.flow || null,
      xp: 0
    });
    applyPostGameSocialEffects({ win: teamWin, grade: 50, stats: null, injured: true, playoff: false });
    updateTeamMorale(teamWin);
    G.gameNum++;
    return null;
  }
  const opp = getTeam(G.schedule[idx].opp);
  G._isHome = !!G.schedule[idx].home;
  G._behindInGame = Math.random() < 0.4;
  G._clutchTime = Math.random() < 0.24;
  // 事件已在赛前由 rollPreGameEvent() 预掷，批量模拟时清除残留事件
  if (!G._gameEvent) { G._gameEventResult = null; }
  const oppStr = getTeamStrength(opp.id);
  const st = simGameStats(oppStr);
  const evMod2 = (G._gameEventResult?.result?.mod) || {};
  const grade = clamp(calcGrade(st) + parseNum(evMod2.grade, 0), 0, 99);
  const injured = checkInjury();
  const xfFx = getPlayerXFactorEffect(G.player);

  const teamBoost = xfFx.teamBoost || 0;
  const toxicPenalty = xfFx.toxicAura ? Math.round(st.pts / 5) : 0;
  const teamStr = Math.round((getTeamStrength(G.teamId) + teamBoost - toxicPenalty + Math.round((grade - 50) / 8)) * getMoraleMult());
  const winRateBoost = parseNum(evMod2.winRateBoost, 0);
  const winChance = clamp(teamStr / (teamStr + oppStr) + winRateBoost, 0.2, 0.95);
  const win = Math.random() < winChance;

  if (win) G.seasonStats.wins++; else G.seasonStats.losses++;
  updateTeamMorale(win);
  G.seasonStats.gp++;
  ['pts', 'reb', 'ast', 'stl', 'blk', 'tov', 'mins', 'fgm', 'fga', 'tpm', 'tpa', 'ftm', 'fta'].forEach(k => G.seasonStats[k] += st[k]);

  const effortCfg = getEffortMode(G._effortMode);
  const badgeFx = getBadgeEffects(G.player);
  const xpGain = addPlayerXP((10 + grade / 5 + st.pts / 3) * effortCfg.xpMult * parseNum(badgeFx.xpMult, 1));
  const box = simulateLeagueRound({ round: idx, oppId: opp.id, win, st });

  G.results.push({
    game: idx + 1,
    season: G.season,
    year: G.year,
    teamId: G.teamId,
    opp: opp.id,
    home: G.schedule[idx].home,
    gameId: box?.gameId || '',
    ...st,
    grade,
    win,
    xp: xpGain,
    teamPts: parseNum(box?.myScore, 0),
    oppPts: parseNum(box?.oppScore, 0),
    flow: box?.flow || null
  });
  applyPostGameSocialEffects({ win, grade, stats: st, injured: !!injured, playoff: false });
  // 事件士气修正
  if (evMod2.morale) G.player.mood = clamp(parseNum(G.player.mood, 50) + evMod2.morale, 0, 100);
  G.gameNum++;

  return {
    st,
    grade,
    win,
    opp,
    xp: xpGain,
    injured,
    teamPts: parseNum(box?.myScore, 0),
    oppPts: parseNum(box?.oppScore, 0),
    flow: box?.flow || null,
    gameId: box?.gameId || '',
    gameEvent: G._gameEvent || null,
    effortMode: G._effortMode || 'normal'
  };
}

// ============ PLAYOFFS ============
function startPlayoffs() {
  simStandings();
  const regularAwardState = ensureRegularSeasonAwardsIssued();
  if (regularAwardState?.justIssued) G._pendingRegularSeasonAwardsModal = true;
  const myConf = G.team.c;
  const myStandings = myConf === 'East' ? G.standings.East : G.standings.West;
  const mySeed = myStandings.findIndex(s => s.id === G.teamId) + 1;
  if (mySeed > 8) {
    G.playoffs = { active: false, round: 0, series: [], eliminated: true, seed: mySeed };
    addNews(`${G.team.z}${G.seasonStats.wins}胜${G.seasonStats.losses}负未能进入季后赛`, 'neg');
    return false;
  }
  G.playoffs = { active: true, round: 1, series: [], eliminated: false, seed: mySeed, conf: myConf };
  addNews(`🏆 ${G.team.z}以${mySeed}号种子进入季后赛！`, 'pos');
  setupPlayoffRound();
  return true;
}

function setupPlayoffRound() {
  const r = G.playoffs.round;
  const conf = G.playoffs.conf;
  const standings = conf === 'East' ? G.standings.East : G.standings.West;
  const seed = G.playoffs.seed;
  let oppSeed;
  if (r === 1) oppSeed = 9 - seed;
  else if (r === 2) oppSeed = seed <= 4 ? rng(1, 4) : rng(5, 8);
  else if (r === 3) oppSeed = rng(1, 8);
  else oppSeed = rng(1, 8);
  const oppRec = standings[clamp(oppSeed - 1, 0, standings.length - 1)];
  const oppTeam = getTeam(oppRec ? oppRec.id : TEAMS[0].id);
  G.playoffs.series = { opp: oppTeam.id, myWins: 0, oppWins: 0, games: [], round: r };
}

function playPlayoffGame() {
  const s = G.playoffs.series;
  const opp = getTeam(s.opp);
  G._isHome = Math.random() < 0.5;
  G._behindInGame = Math.random() < 0.45;
  G._clutchTime = Math.random() < 0.32;
  const oppStr = getTeamStrength(opp.id);
  const st = simGameStats(oppStr + 5);
  const grade = calcGrade(st);
  const xfFx = getPlayerXFactorEffect(G.player);
  const teamBoost = xfFx.teamBoost || 0;
  const toxicPenalty = xfFx.toxicAura ? Math.round(st.pts / 6) : 0;
  const teamStr = Math.round((getTeamStrength(G.teamId) + teamBoost - toxicPenalty + Math.round((grade - 50) / 6)) * getMoraleMult());
  const winChance = clamp(teamStr / (teamStr + oppStr + 5), 0.25, 0.75);
  const win = Math.random() < winChance;
  const score = estimateUserTeamScore(win, parseNum(st.pts, 0), getTeamStrength(G.teamId), oppStr + 5, { playoff: true });
  const myScore = parseNum(score.my, 0);
  const oppScore = parseNum(score.opp, 0);
  const userHome = !!G._isHome;
  const homeTeamId = userHome ? G.teamId : opp.id;
  const awayTeamId = userHome ? opp.id : G.teamId;
  const homeScore = userHome ? myScore : oppScore;
  const awayScore = userHome ? oppScore : myScore;
  const flow = buildGameFlowDetail({
    homeTeamId,
    awayTeamId,
    homeScore,
    awayScore,
    homeStrength: userHome ? getTeamStrength(G.teamId) : oppStr + 5,
    awayStrength: userHome ? oppStr + 5 : getTeamStrength(G.teamId),
    phase: 'playoff'
  });
  const flowForUser = orientFlowForUser(flow, userHome);
  const gameNo = (Array.isArray(s.games) ? s.games.length : 0) + 1;
  const gameId = `P_S${G.season}_R${G.playoffs.round}_G${gameNo}_T${G.teamId}_O${opp.id}`;

  const selfRow = makeGameDetailRow(
    { id: 'USER_SELF', name: G.player.name, pos: G.player.pos, pos2: 0, rating: ovr(G.player.attrs || {}) },
    st,
    G.teamId,
    { isSelf: true }
  );
  const oppRoster = [...(getTeamPlayers(opp.id) || [])].sort((a, b) => parseNum(b.rating, 70) - parseNum(a.rating, 70));
  const oppCore = oppRoster[0] || { id: `OPP_${opp.id}`, name: `${opp.z || opp.a || '对手'}核心`, pos: 3, pos2: 0, rating: oppStr, attrs: {} };
  const oppFga = clamp(Math.round(parseNum(oppScore, 92) * 0.78), 8, 30);
  const oppFgm = clamp(Math.round(oppFga * clamp(0.42 + ((oppStr - 75) * 0.002), 0.36, 0.58)), 3, oppFga);
  const oppTpa = clamp(Math.round(oppFga * 0.34), 1, oppFga);
  const oppTpm = clamp(Math.round(oppTpa * clamp(0.32 + ((oppStr - 75) * 0.0015), 0.24, 0.45)), 0, oppTpa);
  const oppFta = clamp(Math.round(parseNum(oppScore, 92) * 0.2), 0, 18);
  const oppFtm = clamp(Math.round(oppFta * 0.78), 0, oppFta);
  const oppRow = makeGameDetailRow(oppCore, {
    mins: rng(34, 40),
    pts: clamp(Math.round(parseNum(oppScore, 92) * 0.23 + rng(-3, 3)), 10, 45),
    reb: rng(3, 13),
    ast: rng(2, 11),
    stl: rng(0, 4),
    blk: rng(0, 4),
    tov: rng(1, 6),
    fgm: oppFgm,
    fga: oppFga,
    tpm: oppTpm,
    tpa: oppTpa,
    ftm: oppFtm,
    fta: oppFta
  }, opp.id);
  const homeRows = userHome ? [selfRow] : [oppRow];
  const awayRows = userHome ? [oppRow] : [selfRow];

  addLeagueGameDetail({
    id: gameId,
    season: G.season,
    year: G.year,
    phase: 'playoff',
    round: G.playoffs.round,
    seriesGame: gameNo,
    homeTeamId,
    awayTeamId,
    homeScore,
    awayScore,
    winTeamId: win ? G.teamId : opp.id,
    userGame: true,
    flow,
    homeRows,
    awayRows
  });

  if (win) s.myWins++; else s.oppWins++;
  updateTeamMorale(win);
  s.games.push({ ...st, grade, win, teamPts: myScore, oppPts: oppScore, gameId, flow: flowForUser });
  // 季后赛体力系统：模拟休息日恢复 + 比赛消耗
  // 季后赛通常有1-2天休息，先恢复大量体力
  recoverStamina({ rest: true });

  const effortCfg = getEffortMode(G._effortMode);
  let staminaCost = rng(15, 25); // 季后赛强度更高
  staminaCost = Math.round(staminaCost * effortCfg.staminaMult);
  G.player.stamina = clamp(G.player.stamina - staminaCost, 0, 100);

  // 赛后额外恢复少量 (理疗等)
  const ecoFx = typeof getEconomyEffects === 'function' ? getEconomyEffects() : {};
  G.player.stamina = clamp(G.player.stamina + rng(2, 5) + parseNum(ecoFx.gameStaminaBonus, 0), 0, 100);

  const xpGain = addPlayerXP((15 + grade / 4 + st.pts / 2) * effortCfg.xpMult * parseNum(getBadgeEffects(G.player).xpMult, 1));
  applyPostGameSocialEffects({ win, grade, stats: st, injured: false, playoff: true });

  // 模拟背景比赛（其他系列赛）
  simulateBackgroundPlayoffGames();

  return {
    st: { ...st, teamPts: myScore, oppPts: oppScore },
    grade,
    win,
    opp,
    xp: xpGain,
    myWins: s.myWins,
    oppWins: s.oppWins,
    gameId,
    flow: flowForUser,
    effortMode: G._effortMode || 'normal'
  };
}

function simulateBackgroundPlayoffGames() {
  // 简单的背景模拟：生成一些其他球队的比赛新闻，让世界看起来在动
  // 只有在非总决赛阶段才模拟其他系列赛
  if (G.playoffs.round >= 4) return;

  const numNews = rng(1, 2); // 每次模拟1-2场其他比赛
  const confs = ['East', 'West'];
  const otherTeams = [];

  // 收集所有季后赛球队（除了自己和当前对手）
  confs.forEach(c => {
    const list = G.standings[c];
    if (Array.isArray(list)) {
      list.slice(0, 8).forEach(t => {
        if (t.id !== G.teamId && t.id !== G.playoffs.series.opp) {
          otherTeams.push(t);
        }
      });
    }
  });

  if (otherTeams.length < 2) return;

  for (let i = 0; i < numNews; i++) {
    const t1 = pick(otherTeams);
    const t2 = pick(otherTeams);
    if (t1.id === t2.id) continue;

    // 简单模拟比分
    const s1 = getTeamStrength(t1.id) + rng(-10, 10);
    const s2 = getTeamStrength(t2.id) + rng(-10, 10);
    const winScore = Math.max(90, Math.max(s1, s2) + rng(0, 10));
    const loseScore = Math.min(winScore - 1, Math.min(s1, s2) + rng(0, 10));

    const team1 = getTeam(t1.id);
    const team2 = getTeam(t2.id);
    const winner = s1 > s2 ? team1 : team2;
    const loser = s1 > s2 ? team2 : team1;

    addNews(`季后赛: ${winner.z} ${winScore}-${loseScore} 战胜 ${loser.z}`, 'neu');
  }

}

function checkSeriesEnd() {
  const s = G.playoffs.series;
  if (s.myWins >= 4) {
    const roundNames = ["", "首轮", "次轮", "分区决赛", "总决赛"];
    addNews(`🎉 ${G.team.z}${roundNames[G.playoffs.round]}胜利 (4-${s.oppWins})`, 'pos');
    if (G.playoffs.round >= 4) {
      addNews(`🏆🏆🏆 ${G.team.z}获得NBA总冠军！！！`, 'special');
      G.playoffs.champion = true;
      finalizeFinalsAwardsForSeason();
      return 'champion';
    }
    G.playoffs.round++;
    setupPlayoffRound();
    return 'advance';
  }
  if (s.oppWins >= 4) {
    addNews(`${G.team.z}被淘汰 (${s.myWins}-4)`, 'neg');
    G.playoffs.eliminated = true;
    return 'eliminated';
  }
  return 'continue';
}

// ============ AWARDS ============
const APK_HOF_THRESHOLD = 120;
function ensureAwardCollections() {
  if (!Array.isArray(G.awards)) G.awards = [];
  if (!Array.isArray(G.allAwards)) G.allAwards = [];
  if (!Array.isArray(G.leagueAwards)) G.leagueAwards = [];
  if (!Array.isArray(G.hallOfFame)) G.hallOfFame = [];
  if (!Number.isFinite(parseNum(G.hallOfFameThreshold, 0)) || parseNum(G.hallOfFameThreshold, 0) <= 0) {
    G.hallOfFameThreshold = APK_HOF_THRESHOLD;
  }
}
function leagueAwardEntryForSeason(season = G.season) {
  ensureAwardCollections();
  const s = parseNum(season, 0);
  return G.leagueAwards.find(a => parseNum(a?.season, -1) === s) || null;
}
function upsertLeagueAwardEntry(entry) {
  ensureAwardCollections();
  if (!entry) return null;
  const s = parseNum(entry.season, G.season);
  const idx = G.leagueAwards.findIndex(a => parseNum(a?.season, -1) === s);
  if (idx >= 0) G.leagueAwards[idx] = { ...G.leagueAwards[idx], ...entry };
  else G.leagueAwards.push({ ...entry });
  G.leagueAwards.sort((a, b) => parseNum(a?.season, 0) - parseNum(b?.season, 0));
  return leagueAwardEntryForSeason(s);
}
function upsertUserSeasonAwards(awards, { champion = false, regularSeasonIssued = false, finalsIssued = false } = {}) {
  ensureAwardCollections();
  const s = G.seasonStats || {};
  const gp = Math.max(parseNum(s.gp, 0), 1);
  const payload = {
    season: G.season,
    year: G.year,
    awards: [...new Set((awards || []).filter(Boolean))],
    stats: {
      ppg: +(parseNum(s.pts, 0) / gp).toFixed(1),
      apg: +(parseNum(s.ast, 0) / gp).toFixed(1),
      rpg: +(parseNum(s.reb, 0) / gp).toFixed(1),
      spg: +(parseNum(s.stl, 0) / gp).toFixed(1),
      bpg: +(parseNum(s.blk, 0) / gp).toFixed(1)
    },
    team: G.teamId,
    wins: parseNum(s.wins, 0),
    losses: parseNum(s.losses, 0),
    champion: !!champion,
    regularSeasonIssued: !!regularSeasonIssued,
    finalsIssued: !!finalsIssued
  };
  const idx = G.allAwards.findIndex(a => parseNum(a?.season, -1) === G.season && parseNum(a?.year, -1) === G.year);
  if (idx >= 0) G.allAwards[idx] = { ...G.allAwards[idx], ...payload };
  else G.allAwards.push(payload);
  G.allAwards.sort((a, b) => parseNum(a?.season, 0) - parseNum(b?.season, 0));
  return payload;
}
function awardWinnerFromRow(row, extras = {}) {
  if (!row) return null;
  const teamId = parseNum(row.teamId, 0);
  const playerId = String(row.playerId ?? '');
  return {
    playerId,
    teamId,
    name: row.name || '未知球员',
    team: getTeam(teamId)?.a || '--',
    isSelf: !!row.isSelf || playerId === 'USER_SELF',
    ...extras
  };
}
function includesSelfInAwardGroup(group) {
  return Array.isArray(group) && group.some(x => !!x?.isSelf || String(x?.playerId) === 'USER_SELF');
}
function buildUserAwardsFromLeague(leagueAward, { includeFinals = true } = {}) {
  if (!leagueAward) return [];
  const tags = [];
  if (leagueAward.roy?.isSelf) tags.push('ROY');
  if (leagueAward.mvp?.isSelf) tags.push('MVP');
  if (leagueAward.dpoy?.isSelf) tags.push('DPOY');
  if (includeFinals && leagueAward.fmvp?.isSelf && !!G.playoffs?.champion) tags.push('FMVP');
  if (leagueAward.scoring?.isSelf) tags.push('得分王');
  if (leagueAward.rebound?.isSelf) tags.push('篮板王');
  if (leagueAward.assist?.isSelf) tags.push('助攻王');
  if (leagueAward.steal?.isSelf) tags.push('抢断王');
  if (leagueAward.block?.isSelf) tags.push('盖帽王');
  if (includesSelfInAwardGroup(leagueAward.allNba1)) tags.push('最佳阵容一阵');
  else if (includesSelfInAwardGroup(leagueAward.allNba2)) tags.push('最佳阵容二阵');
  else if (includesSelfInAwardGroup(leagueAward.allNba3)) tags.push('最佳阵容三阵');
  if (includesSelfInAwardGroup(leagueAward.allDef1)) tags.push('最佳防守一阵');
  else if (includesSelfInAwardGroup(leagueAward.allDef2)) tags.push('最佳防守二阵');
  if (includesSelfInAwardGroup(leagueAward.allStar)) tags.push('全明星');
  return [...new Set(tags)];
}
function defaultUserHonorCounter() {
  return {
    mvp: 0, fmvp: 0,
    allNba1: 0, allNba2: 0, allNba3: 0,
    scoring: 0, rebound: 0, assist: 0, block: 0, steal: 0,
    allStar: 0, threePt: 0,
    dpoy: 0, allDef1: 0, allDef2: 0,
    sixthMan: 0, allStarMvp: 0,
    rings: 0
  };
}
function collectUserHonorCounterFromHistory() {
  const c = defaultUserHonorCounter();
  (G.allAwards || []).forEach(rec => {
    if (!rec) return;
    const tags = Array.isArray(rec.awards) ? rec.awards : [];
    tags.forEach(tagRaw => {
      const tag = String(tagRaw || '').trim();
      if (!tag) return;
      if (tag === 'MVP') c.mvp++;
      else if (tag === 'FMVP') c.fmvp++;
      else if (tag === 'DPOY') c.dpoy++;
      else if (tag === '得分王') c.scoring++;
      else if (tag === '篮板王') c.rebound++;
      else if (tag === '助攻王') c.assist++;
      else if (tag === '盖帽王') c.block++;
      else if (tag === '抢断王') c.steal++;
      else if (tag === '全明星') c.allStar++;
      else if (tag === '三分王' || tag === '三分大赛冠军') c.threePt++;
      else if (tag === '最佳第六人' || tag === '第六人') c.sixthMan++;
      else if (tag === '全明星MVP') c.allStarMvp++;
      else if (tag === '最佳阵容一阵') c.allNba1++;
      else if (tag === '最佳阵容二阵') c.allNba2++;
      else if (tag === '最佳阵容三阵') c.allNba3++;
      else if (tag === '最佳防守一阵' || tag === '最佳防守阵容') c.allDef1++;
      else if (tag === '最佳防守二阵') c.allDef2++;
    });
    if (rec.champion) c.rings++;
  });
  return c;
}
function computeApkHallOfFameScore(counter) {
  const c = counter || defaultUserHonorCounter();
  let score = 0;
  score += c.mvp * 12;
  score += c.fmvp * 7;
  score += c.allNba1 * 8;
  score += c.allNba2 * 6;
  score += c.allNba3 * 5;
  score += c.scoring * 6;
  score += c.rebound * 2;
  score += c.assist * 2;
  score += c.block * 1;
  score += c.steal * 1;
  score += c.allStar * 2;
  score += c.threePt * 1;
  score += c.dpoy * 5;
  score += c.allDef1 * 3;
  score += c.allDef2 * 2;
  score += c.sixthMan * 2;
  score += c.allStarMvp * 1;
  if (score > 30) score += c.rings * 5;
  else score += Math.floor(c.rings / 5) * 2;
  return Math.round(score);
}
function getUserHallOfFameProfile() {
  ensureAwardCollections();
  const counts = collectUserHonorCounterFromHistory();
  const score = computeApkHallOfFameScore(counts);
  const threshold = parseNum(G.hallOfFameThreshold, APK_HOF_THRESHOLD);
  return {
    score,
    threshold,
    eligible: score >= threshold,
    seasons: Array.isArray(G.allAwards) ? G.allAwards.length : 0,
    counts
  };
}
function updateUserHallOfFameProgress() {
  ensureAwardCollections();
  const profile = getUserHallOfFameProfile();
  if (!profile.eligible) return profile;
  const key = `${G.player?.name || 'PLAYER'}_${parseNum(G.startYear, G.year)}`;
  const entry = {
    key,
    name: G.player?.name || '未知球员',
    score: profile.score,
    threshold: profile.threshold,
    seasons: profile.seasons,
    rings: profile.counts.rings,
    inductedSeason: G.season,
    inductedYear: G.year,
    lastUpdatedYear: G.year,
    teamsPlayed: [...new Set(Array.isArray(G.player?.teamsPlayed) ? G.player.teamsPlayed : [G.teamId])],
    counts: { ...profile.counts }
  };
  const idx = G.hallOfFame.findIndex(x => String(x?.key || '') === key);
  if (idx >= 0) {
    G.hallOfFame[idx] = {
      ...G.hallOfFame[idx],
      ...entry,
      inductedSeason: G.hallOfFame[idx].inductedSeason || entry.inductedSeason,
      inductedYear: G.hallOfFame[idx].inductedYear || entry.inductedYear
    };
  } else {
    G.hallOfFame.push(entry);
  }
  G.hallOfFame.sort((a, b) => parseNum(b?.score, 0) - parseNum(a?.score, 0));
  return profile;
}
function syncUserAwardsFromLeague(leagueAward, { includeFinals = true } = {}) {
  const awards = buildUserAwardsFromLeague(leagueAward, { includeFinals });
  G.awards = awards;
  upsertUserSeasonAwards(awards, {
    champion: !!G.playoffs?.champion,
    regularSeasonIssued: !!leagueAward?.regularSeasonIssued,
    finalsIssued: !!leagueAward?.finalsIssued
  });
  updateUserHallOfFameProgress();
  return awards;
}
function ensureRegularSeasonAwardsIssued() {
  const exist = leagueAwardEntryForSeason(G.season);
  if (exist && exist.regularSeasonIssued) {
    syncUserAwardsFromLeague(exist, { includeFinals: !!exist.finalsIssued });
    return { entry: exist, justIssued: false };
  }
  const entry = evaluateLeagueAwardsFromSeason();
  if (!entry) return { entry: null, justIssued: false };
  return { entry, justIssued: true };
}
function resolveFinalsMvpAward(leagueAward) {
  if (G.playoffs?.champion) {
    const finalsGames = Array.isArray(G.playoffs?.series?.games) ? G.playoffs.series.games : [];
    const gp = Math.max(finalsGames.length, 1);
    const avgPts = finalsGames.reduce((s, g) => s + parseNum(g?.pts, 0), 0) / gp;
    const avgReb = finalsGames.reduce((s, g) => s + parseNum(g?.reb, 0), 0) / gp;
    const avgAst = finalsGames.reduce((s, g) => s + parseNum(g?.ast, 0), 0) / gp;
    const avgStl = finalsGames.reduce((s, g) => s + parseNum(g?.stl, 0), 0) / gp;
    const avgBlk = finalsGames.reduce((s, g) => s + parseNum(g?.blk, 0), 0) / gp;
    const score = avgPts * 1.4 + avgReb * 1.0 + avgAst * 1.2 + avgStl * 1.8 + avgBlk * 1.8;
    const userDominant = score >= 32 || avgPts >= 22;
    if (userDominant) {
      return {
        playerId: 'USER_SELF',
        teamId: G.teamId,
        name: G.player.name || '你',
        team: getTeam(G.teamId)?.a || '--',
        isSelf: true,
        ppg: +avgPts.toFixed(1),
        rpg: +avgReb.toFixed(1),
        apg: +avgAst.toFixed(1)
      };
    }
    const rotation = ensureGameRotation();
    const mate = [...rotation]
      .filter(r => !(r?.isSelf || String(r?.id) === 'USER_SELF'))
      .sort((a, b) =>
        (parseNum(b?.minutes, 0) * 0.65 + parseNum(b?.rating, 0) * 0.35) -
        (parseNum(a?.minutes, 0) * 0.65 + parseNum(a?.rating, 0) * 0.35)
      )[0];
    if (mate) {
      return {
        playerId: String(mate.id),
        teamId: G.teamId,
        name: mate.name || '队友',
        team: getTeam(G.teamId)?.a || '--',
        isSelf: false
      };
    }
  }
  // 玩家没夺冠 → FMVP 必须来自其他球队（冠军队），排除玩家球队
  const notMyTeam = r => parseNum(r?.teamId, 0) !== G.teamId;
  if (leagueAward?.mvp && notMyTeam(leagueAward.mvp)) return { ...leagueAward.mvp, isSelf: false };
  if (leagueAward?.scoring && notMyTeam(leagueAward.scoring)) return { ...leagueAward.scoring, isSelf: false };
  const fallback = getLeaguePlayerSeasonRows()
    .filter(r => parseNum(r.gp, 0) >= 20 && notMyTeam(r))
    .sort((a, b) => parseNum(b.ppg, 0) - parseNum(a.ppg, 0))[0];
  return awardWinnerFromRow(fallback, { ppg: fallback?.ppg });
}
function finalizeFinalsAwardsForSeason() {
  const regular = ensureRegularSeasonAwardsIssued();
  const base = regular?.entry;
  if (!base) return null;
  if (base.finalsIssued) {
    syncUserAwardsFromLeague(base, { includeFinals: true });
    return base;
  }
  const fmvp = resolveFinalsMvpAward(base);
  const updated = upsertLeagueAwardEntry({
    ...base,
    fmvp: fmvp || null,
    finalsIssued: true,
    championTeamId: G.playoffs?.champion ? G.teamId : parseNum(fmvp?.teamId, 0)
  });
  if (updated?.fmvp) {
    const tone = updated.fmvp.isSelf ? 'special' : 'neu';
    addNews(`🏆 FMVP：${updated.fmvp.name} (${updated.fmvp.team})`, tone);
  }
  syncUserAwardsFromLeague(updated, { includeFinals: true });
  return updated;
}
function evaluateAwards() {
  const state = ensureRegularSeasonAwardsIssued();
  if (!state?.entry) return [];
  return syncUserAwardsFromLeague(state.entry, { includeFinals: !!state.entry.finalsIssued });
}

// ============ PROGRESSION ============
function weightedPick(items) {
  if (!items.length) return null;
  const total = items.reduce((sum, it) => sum + Math.max(0, parseNum(it.w, 0)), 0);
  if (total <= 0) return items[rng(0, items.length - 1)];
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    r -= Math.max(0, parseNum(items[i].w, 0));
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}
function getYearlyOvrDeltaTarget({ age, rating, potential, growthBoost = 0, declineResist = 0 }) {
  const potGap = potential - rating;
  let min = 0, max = 0;

  if (age <= 22) {
    if (rating <= 70 && potential >= 90) { min = 4; max = 8; }
    else if (rating <= 78) { min = 2; max = 5; }
    else if (rating <= 86) { min = 1; max = 3; }
    else { min = 0; max = 2; }
  } else if (age <= 26) {
    if (rating <= 72 && potential >= 88) { min = 3; max = 6; }
    else if (rating <= 80) { min = 1; max = 4; }
    else if (rating <= 88) { min = 0; max = 2; }
    else { min = 0; max = 1; }
  } else if (age <= 29) {
    if (rating <= 78 && potential >= 85) { min = 1; max = 3; }
    else if (rating >= 88) { min = 0; max = 2; }
    else { min = 0; max = 2; }
  } else if (age <= 32) {
    min = -1; max = 1;
  } else if (age <= 35) {
    min = -3; max = 0;
  } else {
    min = -5; max = -1;
  }

  if (potGap >= 25) { min += 2; max += 3; }
  else if (potGap >= 15) { min += 1; max += 2; }
  else if (potGap <= -5) { min -= 1; max -= 1; }

  if (growthBoost > 0) {
    min += Math.round(growthBoost * 2);
    max += Math.round(growthBoost * 3);
  }
  if (age >= 29 && declineResist > 0) {
    const resist = Math.round(declineResist * 2);
    min += resist;
    max += resist;
  }

  if (age <= 24 && rating <= 68 && potential >= 99) {
    min = 6; max = 10;
  } else if (age <= 24 && rating <= 72 && potential >= 97) {
    min = Math.max(min, 5);
    max = Math.max(max, 9);
  }

  if (age <= 30 && rating >= 86) {
    min = Math.max(min, 1);
    max = Math.max(max, 2);
    min = Math.min(min, 2);
    max = Math.min(max, 2);
  }
  if (age >= 33) max = Math.min(max, 0);
  if (age >= 36) max = Math.min(max, -1);

  min = clamp(min, -8, 12);
  max = clamp(max, -8, 12);
  if (max < min) max = min;
  return rng(min, max);
}
function chooseAttrForDirection(attrs, direction, potential, age) {
  const weights = [];
  ATTRS.forEach(at => {
    const k = at.k;
    const cur = parseNum(attrs[k], 50);
    if (direction > 0) {
      if (cur >= 99) return;
      let w = 1;
      w += Math.max(0, 75 - cur) * 0.25;
      w += Math.max(0, potential - cur) * 0.16;
      w += Math.max(0, 99 - cur) * 0.05;
      if (cur < 60) w += 2;
      if (age <= 24 && (k === 'speed' || k === 'physique' || k === 'strength')) w += 1.2;
      weights.push({ k, w });
    } else {
      if (cur <= 25) return;
      let w = 1 + Math.max(0, cur - 65) * 0.18;
      if (k === 'speed' || k === 'physique' || k === 'strength') w += 2;
      if (k === 'shotFree' || k === 'pass') w *= 0.8;
      weights.push({ k, w });
    }
  });
  const picked = weightedPick(weights);
  return picked ? picked.k : null;
}
function applyOvrDeltaToAttrs(attrs, targetDelta, potential, age) {
  const before = ovr(attrs);
  const target = clamp(before + targetDelta, 40, 99);
  if (target === before) return;
  const direction = target > before ? 1 : -1;
  let now = before;
  let steps = 0;
  const maxSteps = Math.abs(target - before) * ATTRS.length * 3 + 50;

  while (now !== target && steps < maxSteps) {
    steps++;
    const key = chooseAttrForDirection(attrs, direction, potential, age);
    if (!key) break;
    attrs[key] = clamp(parseNum(attrs[key], 50) + direction, 25, 99);
    now = ovr(attrs);
  }

  if (now !== target) {
    let guard = 0;
    while (now !== target && guard < 500) {
      guard++;
      const dir = target > now ? 1 : -1;
      const keys = ATTRS.map(a => a.k).filter(k => {
        const v = parseNum(attrs[k], 50);
        return dir > 0 ? v < 99 : v > 25;
      });
      if (!keys.length) break;
      const key = keys[rng(0, keys.length - 1)];
      attrs[key] = clamp(parseNum(attrs[key], 50) + dir, 25, 99);
      now = ovr(attrs);
    }
  }
}
function evolvePlayerOneYear(player, { isUser = false } = {}) {
  const age = parseNum(player.age, 22);
  const pot = clamp(parseNum(player.potential, 75), 50, 99);
  const attrs = player.attrs && Object.keys(player.attrs).length ? { ...player.attrs } : parsePlayerAttrs(player);
  const fx = getPlayerXFactorEffect(player);
  const growthBoost = Math.max(0, parseNum(fx.growthBoost, 0));
  const declineResist = Math.max(0, parseNum(fx.declineResist, 0));
  const ratingBefore = ovr(attrs);
  const targetDelta = getYearlyOvrDeltaTarget({
    age,
    rating: ratingBefore,
    potential: pot,
    growthBoost,
    declineResist
  });
  applyOvrDeltaToAttrs(attrs, targetDelta, pot, age);
  player.attrs = attrs;
  player.rating = ovr(attrs);
  if (typeof calcPlayerAtt === 'function') player.att = calcPlayerAtt(attrs);
  else player.att = player.rating;
  if (typeof calcPlayerDef === 'function') player.def = calcPlayerDef(attrs);
  else player.def = player.rating;
  player.age = age + 1;
  if (!isUser) {
    player.yearsLeague = Math.max(0, parseNum(player.yearsLeague, 0) + 1);
    player.rookie = false;
  }
}
function growAttrs() {
  // 玩家成长由 XP 加点驱动，赛季结束只做年龄推进，不自动涨属性。
  ageUserOneYear();
}
function progressLeaguePlayers() {
  if (!LEAGUE.loaded) return;
  Object.values(LEAGUE.teams).forEach(t => {
    const coach = t.coach || null;
    (t.players || []).forEach(p => {
      // 属性成长已在赛季中通过 applyNpcIncrementalGrowth 完成
      // 对未触发过增量成长的球员，补一次完整成长
      if (!p._seasonDevApplied) {
        applyNpcSeasonDevelopment(p, coach);
      } else {
        // 只做年龄+1和状态更新，跳过属性变更
        p.age = parseNum(p.age, 24) + 1;
        p.yearsLeague = Math.max(0, parseNum(p.yearsLeague, 0) + 1);
        p.rookie = false;
        delete p._seasonDevApplied;
      }
    });
    t.rotation = toRotation(t.players);
    t.strength = calcTeamStrength(t);
  });
}

function spendXP(attrKey, cost) {
  if (G.player.xp < cost) return false;
  if (parseNum(G.player.attrs[attrKey], 0) >= 99) return false;
  G.player.xp -= cost;
  G.player.attrs[attrKey] = clamp(G.player.attrs[attrKey] + 1, 25, 99);
  return true;
}

function getUpgradeCost(val) {
  const v = clamp(parseNum(val, 25), 25, 99);
  const x = v - 25;
  const base = 6 + x * 0.5 + (x * x) / 70;
  const high = v >= 85 ? Math.pow(v - 84, 1.8) * 1.5 : 0;
  const elite = v >= 90 ? Math.pow(v - 89, 2.2) * 3.0 : 0;
  const legend = v >= 95 ? Math.pow(v - 94, 2.5) * 5.0 : 0;
  return Math.round(base + high + elite + legend);
}

function getTendencyUpgradeCost(val) {
  const v = clamp(parseNum(val, 50), 30, 100);
  const x = Math.max(0, v - 50);
  return Math.round(6 + x * 0.8 + (x * x) / 25);
}

function spendTendencyXP(key, cost) {
  if (!G.player.tendencies) G.player.tendencies = { in: 55, mid: 55, ex: 55 };
  const cur = parseNum(G.player.tendencies[key], 55);
  if (cur >= 100 || G.player.xp < cost) return false;
  G.player.xp -= cost;
  G.player.tendencies[key] = clamp(cur + 1, 30, 100);
  if (typeof recalcPlayerBadges === 'function') recalcPlayerBadges(G.player);
  return true;
}

function upgradeBadge(badgeId) {
  if (!G.player.badges || typeof G.player.badges !== 'object') G.player.badges = {};
  if (!BADGES.some(b => b.id === badgeId)) return false;
  const cur = G.player.badges[badgeId] || 0;
  if (cur >= 4) return false;
  if (cur === 0 && typeof isBadgeRequirementMet === 'function' && !isBadgeRequirementMet(G.player, badgeId, { allowLegendFallback: false })) {
    const req = typeof getBadgeRequirementText === 'function' ? getBadgeRequirementText(badgeId) : '未满足';
    alert(`未达到徽章要求：${req}`);
    return false;
  }
  const costs = [0, 30, 150, 400, 900];
  const cost = costs[cur + 1];
  if (!cost || G.player.xp < cost) return false;
  G.player.xp -= cost;
  G.player.badges[badgeId] = cur + 1;
  return true;
}

function badgeTierName(lv) { return ["", "铜", "银", "金", "名人堂"][lv || 0] }
function badgeTierClass(lv) { return ["", "tag-bronze", "tag-silver", "tag-gold", "tag-hof"][lv || 0] }

// ============ TRADE & FREE AGENCY ============
function recalcPlayerTradeValue() {
  const rating = ovr(G.player.attrs || {});
  const potential = clamp(parseNum(G.player.potential, rating), 50, 99);
  const age = clamp(parseNum(G.player.age, 20), 18, 45);
  const fame = clamp(parseNum(G.player.fame, 10), 0, 100);
  const trust = clamp(parseNum(G.player.trust, 50), 0, 100);
  const mood = clamp(parseNum(G.player.mood, 50), 0, 100);
  const gp = Math.max(parseNum(G.seasonStats?.gp, 0), 1);
  const ppg = gp > 0 ? parseNum(G.seasonStats?.pts, 0) / gp : 0;
  let value = rating * 0.62 + potential * 0.2 + fame * 0.14 + trust * 0.06 + mood * 0.03 + Math.min(8, ppg * 0.2);
  if (age <= 23) value += 2;
  if (age >= 31) value -= (age - 30) * 1.2;
  if (parseNum(G.player.contractYears, 0) >= 4) value += 1;
  if (G.player.injury?.active) value -= 4;
  const finalValue = clamp(Math.round(value), 25, 99);
  G.player.tradeValue = finalValue;
  return finalValue;
}
function applyPostGameSocialEffects({ win = false, grade = 50, stats = null, injured = false, playoff = false } = {}) {
  const g = clamp(parseNum(grade, 50), 0, 99);
  const pts = clamp(parseNum(stats?.pts, 0), 0, 80);
  let moodDelta = win ? rng(2, 5) : -rng(2, 6);
  if (playoff) moodDelta += (win ? 1 : -1);
  if (g >= 85) moodDelta += 1;
  if (g <= 40) moodDelta -= 1;
  if (injured) moodDelta -= 1;
  G.player.mood = clamp(parseNum(G.player.mood, 50) + moodDelta, 0, 100);

  let trustDelta = win ? rng(1, 3) : -rng(1, 3);
  if (g >= 80) trustDelta += 1;
  if (g <= 45) trustDelta -= 1;
  if (injured && win) trustDelta += 1;
  if (injured && !win) trustDelta -= 1;
  G.player.trust = clamp(parseNum(G.player.trust, 50) + trustDelta, 0, 100);

  let fameDelta = 0;
  if (win) fameDelta += 1;
  if (playoff && win) fameDelta += 1;
  if (pts >= 30) fameDelta += 1;
  if (pts >= 40) fameDelta += 2;
  if (g >= 90) fameDelta += 1;
  if (!win && g <= 35) fameDelta -= 1;
  G.player.fame = clamp(parseNum(G.player.fame, 10) + fameDelta, 0, 100);

  recalcPlayerTradeValue();
}
function getNpcTradeAssetValue(player) {
  const attrs = player?.attrs || {};
  const rating = parseNum(player?.rating, ovr(attrs));
  const potential = clamp(parseNum(player?.potential, rating), 50, 99);
  const age = clamp(parseNum(player?.age, 25), 18, 45);
  let value = rating * 0.74 + (potential - rating) * 0.35;
  if (age <= 24) value += 2;
  if (age >= 32) value -= (age - 31) * 1.1;
  if (player?.injury?.active) value -= 4;
  return clamp(Math.round(value), 20, 99);
}
function createUserTradeAssetSnapshot() {
  const attrs = { ...(G.player?.attrs || {}) };
  const rating = ovr(attrs);
  return {
    id: 'USER_SELF',
    name: G.player.name,
    pos: parseNum(G.player.pos, 3),
    pos2: 0,
    rating,
    potential: clamp(parseNum(G.player.potential, rating), 50, 99),
    age: clamp(parseNum(G.player.age, 20), 18, 45),
    salary: normalizeSalaryMillion(G.player.salary),
    contractYears: parseNum(G.player.contractYears, 0),
    injury: G.player.injury || { active: false, games: 0, type: "" },
    isUser: true,
    tradeValue: parseNum(G.player.tradeValue, rating),
    attrs
  };
}
function isUserTradeAsset(asset) {
  return !!asset && (asset.isUser || String(asset.id) === 'USER_SELF');
}
function isTradeableNpcPlayer(player) {
  if (!player) return false;
  if (player.untouchable) return false;
  if (player.injury?.active) return false;
  if (parseNum(player.contractYears, 0) <= 0) return false;
  return true;
}
function getTradeAssetValue(asset) {
  if (!asset) return 0;
  if (isUserTradeAsset(asset)) {
    return clamp(parseNum(asset.tradeValue, parseNum(G.player.tradeValue, recalcPlayerTradeValue())), 20, 99);
  }
  return getNpcTradeAssetValue(asset);
}
function serializeTradeAsset(asset) {
  if (!asset) return null;
  return {
    id: isUserTradeAsset(asset) ? 'USER_SELF' : asset.id,
    name: asset.name || (isUserTradeAsset(asset) ? G.player.name : '球员'),
    pos: parseNum(asset.pos, isUserTradeAsset(asset) ? parseNum(G.player.pos, 3) : 3),
    pos2: parseNum(asset.pos2, 0),
    rating: parseNum(asset.rating, isUserTradeAsset(asset) ? ovr(G.player.attrs || {}) : 70),
    potential: parseNum(asset.potential, parseNum(asset.rating, 70)),
    salary: normalizeSalaryMillion(parseNum(asset.salary, isUserTradeAsset(asset) ? parseNum(G.player.salary, 0) : 0)),
    contractYears: parseNum(asset.contractYears, isUserTradeAsset(asset) ? parseNum(G.player.contractYears, 0) : 0),
    isUser: isUserTradeAsset(asset),
    value: getTradeAssetValue(asset)
  };
}
function tradePackageRawValue(assets) {
  return Math.round((assets || []).reduce((sum, p) => sum + getTradeAssetValue(p), 0));
}
function tradePackageEffectiveValue(assets) {
  const list = assets || [];
  const size = list.length;
  if (!size) return 0;
  let value = tradePackageRawValue(list);
  if (size === 2) value = Math.round(value * 0.8);
  else if (size >= 3) value = Math.round(value * 0.6);
  return value;
}
function tradePackageSalary(assets) {
  return +(assets || []).reduce((sum, p) => sum + normalizeSalaryMillion(p?.salary), 0).toFixed(2);
}
function buildTradeAssetPackages(pool, maxSize = 3) {
  const list = Array.isArray(pool) ? pool.filter(Boolean) : [];
  const packs = [];
  for (let i = 0; i < list.length; i++) {
    packs.push([list[i]]);
    if (maxSize < 2) continue;
    for (let j = i + 1; j < list.length; j++) {
      packs.push([list[i], list[j]]);
      if (maxSize < 3) continue;
      for (let k = j + 1; k < list.length; k++) {
        packs.push([list[i], list[j], list[k]]);
      }
    }
  }
  return packs;
}
function applyPositionDelta(dist, player, delta) {
  if (!player || !Array.isArray(dist) || dist.length < 5) return;
  const p1 = parseNum(player.pos, 0);
  const p2 = parseNum(player.pos2, 0);
  if (p1 >= 1 && p1 <= 5) dist[p1 - 1] += delta;
  if (p2 >= 1 && p2 <= 5) dist[p2 - 1] += delta * 0.75;
}
function getTeamPositionDistribution(teamId, { includeUser = false } = {}) {
  const dist = [0, 0, 0, 0, 0];
  const roster = [...getTeamPlayers(teamId)];
  if (includeUser && parseNum(teamId, 0) === parseNum(G.teamId, 0)) {
    roster.unshift(createUserTradeAssetSnapshot());
  }
  roster.forEach(p => applyPositionDelta(dist, p, 1));
  return dist;
}
function validateTradePackageContract(outgoing, incoming) {
  const all = [...(outgoing || []), ...(incoming || [])];
  return all.every(p => {
    if (isUserTradeAsset(p)) return parseNum(G.player.contractYears, 0) > 0;
    return parseNum(p?.contractYears, 0) > 0;
  });
}
function validateTradePackageInjury(outgoing, incoming) {
  const all = [...(outgoing || []), ...(incoming || [])];
  return all.every(p => {
    if (isUserTradeAsset(p)) return !G.player.injury?.active;
    return !p?.injury?.active;
  });
}
function validateTradePackageSalary(outgoing, incoming, tolerance = 0.1) {
  const outSalary = tradePackageSalary(outgoing);
  const inSalary = tradePackageSalary(incoming);
  if (outSalary <= 0) return inSalary <= 0;
  return Math.abs(inSalary - outSalary) <= (outSalary * Math.max(0.01, tolerance));
}
function validateTradePackageSalaryCap(targetTeamId, outgoing, incoming, slack = 0.02) {
  const cap = parseNum(LEAGUE_SALARY_CAP_M, 170) * (1 + Math.max(0, parseNum(slack, 0.02)));
  const myCurrent = teamPayrollMillion(G.teamId) + normalizeSalaryMillion(G.player.salary);
  const theirCurrent = teamPayrollMillion(targetTeamId);
  const outSalary = tradePackageSalary(outgoing);
  const inSalary = tradePackageSalary(incoming);
  const myAfter = +(myCurrent - outSalary + inSalary).toFixed(2);
  const theirAfter = +(theirCurrent - inSalary + outSalary).toFixed(2);
  const myOk = myAfter <= cap || myAfter <= myCurrent + 0.01;
  const theirOk = theirAfter <= cap || theirAfter <= theirCurrent + 0.01;
  return myOk && theirOk;
}
function tradePackageStarScore(assets) {
  return (assets || []).reduce((sum, p) => {
    const rating = parseNum(p?.rating, 70);
    const potential = parseNum(p?.potential, rating);
    let score = 0;
    if (potential >= 96) score += 2;
    else if (potential >= 90) score += 1;
    if (rating >= 90) score += 2;
    else if (rating >= 84) score += 1;
    return sum + score;
  }, 0);
}
function validateTradePackageMeta(outgoing, incoming) {
  if ((incoming || []).length >= 3 && (outgoing || []).length < 2) return false;
  const outStar = tradePackageStarScore(outgoing);
  const inStar = tradePackageStarScore(incoming);
  if (inStar > outStar + 2) return false;
  return true;
}
function validateTradePackagePositions(targetTeamId, outgoing, incoming) {
  const meDist = getTeamPositionDistribution(G.teamId, { includeUser: true });
  const theirDist = getTeamPositionDistribution(targetTeamId, { includeUser: false });
  (outgoing || []).forEach(p => {
    applyPositionDelta(meDist, p, -1);
    applyPositionDelta(theirDist, p, 1);
  });
  (incoming || []).forEach(p => {
    applyPositionDelta(meDist, p, 1);
    applyPositionDelta(theirDist, p, -1);
  });
  for (let i = 0; i < theirDist.length; i++) {
    if (theirDist[i] < 2.5) return false;
  }
  const myCount = getTeamPlayers(G.teamId).length + 1 - (outgoing || []).length + (incoming || []).length;
  const theirCount = getTeamPlayers(targetTeamId).length - (incoming || []).length + (outgoing || []).length;
  if (myCount < 13 || theirCount < 13) return false;
  return true;
}
function buildUserOutgoingTradePackages() {
  const self = createUserTradeAssetSnapshot();
  const teammates = getTeamPlayers(G.teamId)
    .filter(isTradeableNpcPlayer)
    .map(p => {
      const val = getNpcTradeAssetValue(p);
      const age = parseNum(p.age, 25);
      const pot = parseNum(p.potential, val);
      const rating = parseNum(p.rating, val);
      const years = parseNum(p.yearsLeague, 5);
      const expendable = (age - 24) * 0.72 + (100 - pot) * 0.44 + (80 - rating) * 0.21 + Math.min(4, years) * 0.25 + rng(-1, 1);
      return { player: p, expendable };
    })
    .sort((a, b) => b.expendable - a.expendable)
    .slice(0, 7)
    .map(x => x.player);
  const packs = [[self]];
  teammates.forEach(p => packs.push([self, p]));
  for (let i = 0; i < teammates.length; i++) {
    for (let j = i + 1; j < teammates.length; j++) {
      packs.push([self, teammates[i], teammates[j]]);
    }
  }
  return packs;
}
function calcUserTradeAcceptChance({ outgoingValue = 0, incomingValue = 0, outgoingSize = 1, incomingSize = 1, targetTeamId = 0 } = {}) {
  const fame = clamp(parseNum(G.player.fame, 10), 0, 100);
  const contractYears = parseNum(G.player.contractYears, 0);
  const valueEdge = parseNum(outgoingValue, 0) - parseNum(incomingValue, 0);
  let chance = 0.3 + valueEdge * 0.018 + ((fame - 50) / 260);
  if (contractYears <= 1) chance += 0.08;
  if (contractYears >= 4) chance -= 0.04;
  chance -= Math.max(0, parseNum(incomingSize, 1) - parseNum(outgoingSize, 1)) * 0.025;
  chance -= Math.max(0, parseNum(getTeamStrength(targetTeamId), 75) - 84) * 0.004;
  return clamp(chance, 0.05, 0.95);
}
function findBestUserTradeCandidate(targetTeamId, outgoingPackages, incomingPackages, salaryTolerance = 0.1) {
  let best = null;
  const myPos = parseNum(G.player.pos, 3);
  (outgoingPackages || []).forEach(outPkg => {
    const outValue = tradePackageEffectiveValue(outPkg);
    const outRaw = tradePackageRawValue(outPkg);
    if (outValue <= 0) return;
    const minTarget = Math.max(5, Math.round((outValue - 15) - (outValue / 5)));
    const maxTarget = Math.max(minTarget, Math.round(outValue));
    const maxIncomingSize = outPkg.length > 1 ? 3 : 2;

    (incomingPackages || []).forEach(inPkg => {
      if (!inPkg || inPkg.length > maxIncomingSize) return;
      const inValue = tradePackageEffectiveValue(inPkg);
      if (inValue < minTarget || inValue > maxTarget) return;
      if (!validateTradePackageContract(outPkg, inPkg)) return;
      if (!validateTradePackageInjury(outPkg, inPkg)) return;
      if (!validateTradePackageSalary(outPkg, inPkg, salaryTolerance)) return;
      if (!validateTradePackageSalaryCap(targetTeamId, outPkg, inPkg, 0.02)) return;
      if (!validateTradePackagePositions(targetTeamId, outPkg, inPkg)) return;
      if (!validateTradePackageMeta(outPkg, inPkg)) return;

      const chance = calcUserTradeAcceptChance({
        outgoingValue: outValue,
        incomingValue: inValue,
        outgoingSize: outPkg.length,
        incomingSize: inPkg.length,
        targetTeamId
      });
      const salaryGap = Math.abs(tradePackageSalary(outPkg) - tradePackageSalary(inPkg));
      const fit = inPkg.reduce((sum, p) => {
        const p1 = parseNum(p?.pos, 0);
        const p2 = parseNum(p?.pos2, 0);
        return sum + ((p1 === myPos || p2 === myPos) ? 0.5 : 0);
      }, 0);
      const score = chance * 100 - (salaryGap * 1.3) + fit + rng(-0.8, 0.8);
      if (!best || score > best.score) {
        best = {
          outgoing: outPkg.slice(),
          incoming: inPkg.slice(),
          outgoingRaw: outRaw,
          incomingRaw: tradePackageRawValue(inPkg),
          outgoingValue: outValue,
          incomingValue: inValue,
          minTarget,
          maxTarget,
          chance,
          salaryTolerance,
          score
        };
      }
    });
  });
  return best;
}
function buildUserTradeProposal(targetId) {
  const tid = parseNum(targetId, 0);
  if (tid <= 0 || tid === G.teamId) return null;
  if (G.dayNum > G.tradeDeadline) return null;
  const target = getTeam(tid);
  if (!target) return null;
  if (typeof normalizeLeagueSalaryUnits === 'function') normalizeLeagueSalaryUnits({ includeUser: true });
  recalcPlayerTradeValue();
  const outgoingPackages = buildUserOutgoingTradePackages();
  if (!outgoingPackages.length) return null;
  const targetPool = getTeamPlayers(tid).filter(isTradeableNpcPlayer);
  if (!targetPool.length) return null;
  const incomingPackages = buildTradeAssetPackages(targetPool, 3);
  if (!incomingPackages.length) return null;

  // APK风格先走严格薪资匹配，若无解再放宽到可玩阈值
  const best = findBestUserTradeCandidate(tid, outgoingPackages, incomingPackages, 0.1)
    || findBestUserTradeCandidate(tid, outgoingPackages, incomingPackages, 0.22);
  if (!best) return null;

  return {
    type: 'USER_REQUEST',
    style: 'APK_PACKAGE',
    createdAt: Date.now(),
    team: target,
    outgoing: best.outgoing.map(serializeTradeAsset).filter(Boolean),
    incoming: best.incoming.map(serializeTradeAsset).filter(Boolean),
    player: serializeTradeAsset(best.incoming[0] || null),
    myValue: best.outgoingValue,
    targetValue: best.incomingValue,
    outgoingRawValue: best.outgoingRaw,
    incomingRawValue: best.incomingRaw,
    outgoingValue: best.outgoingValue,
    incomingValue: best.incomingValue,
    outgoingSalary: tradePackageSalary(best.outgoing),
    incomingSalary: tradePackageSalary(best.incoming),
    valueGap: Math.abs(best.incomingValue - best.outgoingValue),
    valueRange: { min: best.minTarget, max: best.maxTarget },
    salaryTolerance: best.salaryTolerance,
    acceptChance: best.chance
  };
}
function refreshTradeTeamState(teamId) {
  const tid = parseNum(teamId, 0);
  if (!tid || !LEAGUE.loaded || !LEAGUE.teams?.[tid]) return;
  const teamObj = LEAGUE.teams[tid];
  teamObj.rotation = toRotation(teamObj.players || []);
  teamObj.strength = calcTeamStrength(teamObj);
}
function executeUserTradeRequest(proposal) {
  const req = proposal || null;
  if (!req || !req.team) return { ok: false, reason: 'invalid' };
  if (G.dayNum > G.tradeDeadline) return { ok: false, reason: 'deadline' };
  if (typeof normalizeLeagueSalaryUnits === 'function') normalizeLeagueSalaryUnits({ includeUser: true });
  const targetId = parseNum(req.team.id, 0);
  if (targetId === parseNum(G.teamId, 0)) return { ok: false, reason: 'same_team' };

  const oldTeamId = parseNum(G.teamId, 0);
  const oldTeam = getTeam(oldTeamId);
  const newTeam = getTeam(targetId);
  if (!oldTeam || !newTeam) return { ok: false, reason: 'invalid' };

  const outgoingSpecs = Array.isArray(req.outgoing) && req.outgoing.length
    ? req.outgoing
    : [{ id: 'USER_SELF', isUser: true, name: G.player.name }];
  const incomingSpecs = Array.isArray(req.incoming) && req.incoming.length
    ? req.incoming
    : (req.player ? [req.player] : []);
  if (!incomingSpecs.length) return { ok: false, reason: 'invalid' };

  let includeUser = false;
  const outgoingNpc = [];
  for (const spec of outgoingSpecs) {
    if (spec?.isUser || String(spec?.id) === 'USER_SELF') {
      includeUser = true;
      continue;
    }
    const live = getTeamPlayers(oldTeamId).find(p => String(p.id) === String(spec?.id));
    if (!live || !isTradeableNpcPlayer(live)) return { ok: false, reason: 'asset_changed' };
    outgoingNpc.push(live);
  }
  if (!includeUser) return { ok: false, reason: 'invalid' };

  const incomingNpc = [];
  for (const spec of incomingSpecs) {
    const live = getTeamPlayers(targetId).find(p => String(p.id) === String(spec?.id));
    if (!live || !isTradeableNpcPlayer(live)) return { ok: false, reason: 'asset_changed' };
    incomingNpc.push(live);
  }

  const outgoingAssets = [createUserTradeAssetSnapshot(), ...outgoingNpc];
  const incomingAssets = incomingNpc.slice();
  if (!validateTradePackageContract(outgoingAssets, incomingAssets)) return { ok: false, reason: 'contract' };
  if (!validateTradePackageInjury(outgoingAssets, incomingAssets)) return { ok: false, reason: 'injury' };
  if (!validateTradePackageSalaryCap(targetId, outgoingAssets, incomingAssets, 0.02)) return { ok: false, reason: 'salary_cap' };
  if (!validateTradePackagePositions(targetId, outgoingAssets, incomingAssets)) return { ok: false, reason: 'positions' };
  if (!validateTradePackageMeta(outgoingAssets, incomingAssets)) return { ok: false, reason: 'value_rule' };

  const outVal = tradePackageEffectiveValue(outgoingAssets);
  const inVal = tradePackageEffectiveValue(incomingAssets);
  const chance = clamp(parseNum(req.acceptChance, calcUserTradeAcceptChance({
    outgoingValue: outVal,
    incomingValue: inVal,
    outgoingSize: outgoingAssets.length,
    incomingSize: incomingAssets.length,
    targetTeamId: targetId
  })), 0.05, 0.95);
  if (Math.random() <= chance) {
    outgoingNpc.forEach(p => { p.teamId = targetId; });
    incomingNpc.forEach(p => { p.teamId = oldTeamId; });

    G.teamId = targetId;
    G.team = newTeam;
    if (!G.player.teamsPlayed.includes(targetId)) G.player.teamsPlayed.push(targetId);

    const outNames = [G.player.name, ...outgoingNpc.map(p => p.name)].filter(Boolean);
    const inNames = incomingNpc.map(p => p.name);
    G.trades.unshift({
      day: G.dayNum,
      from: oldTeam.z, to: newTeam.z,
      out: outNames.join(' + '),
      in: inNames.join(' + '),
      type: 'USER_PACKAGE'
    });

    refreshTradeTeamState(oldTeamId);
    refreshTradeTeamState(targetId);
    G._currentRotation = null;
    G._rotationGame = -1;
    G._rotationTeam = 0;
    if (typeof ensureGameRotation === 'function') ensureGameRotation(true);

    addNews(`💥 APK交易达成！${oldTeam.z}送出${outNames.join(' + ')}，从${newTeam.z}得到${inNames.join(' + ')}`, 'special');
    recalcPlayerTradeValue();
    if (G.player.xfactor === 'nomad') {
      const nomadBoost = parseNum(getPlayerXFactorEffect(G.player).nomadBoost, 3);
      G.nomadCount++;
      ATTRS.forEach(at => { G.player.attrs[at.k] = clamp(G.player.attrs[at.k] + nomadBoost, 25, 99) });
      addNews(`🧳 流浪者天赋激活！属性提升！`, 'special');
    }
    G.pendingTrade = null;
    G.pendingUserTrade = null;
    addPhone("经纪", `交易完成！你现在是${newTeam.z}的一员了。`, 'info');
    return { ok: true, chance };
  }
  addNews(`交易请求被拒绝`, 'neg');
  addPhone("经纪", `${newTeam.z}拒绝了这笔交易提案。`, 'warn');
  return { ok: false, chance, reason: 'rejected' };
}
function requestTrade(targetId) {
  const proposal = buildUserTradeProposal(targetId);
  if (!proposal) {
    addNews(`未能生成交易方案`, 'neg');
    return false;
  }
  return executeUserTradeRequest(proposal).ok;
}

const LEAGUE_SALARY_CAP_M = 170;
function salaryToMillion(v) {
  return normalizeSalaryMillion(v);
}
function teamPayrollMillion(teamId) {
  const players = getTeamPlayers(teamId);
  return +players.reduce((s, p) => s + salaryToMillion(p.salary), 0).toFixed(2);
}
function rookieContractByPick(pick) {
  const p = clamp(parseNum(pick, 60), 1, 60);
  if (p <= 30) {
    const salary = +(12.0 - ((p - 1) * 0.3276)).toFixed(2);
    return { years: 4, salary: Math.max(2.5, salary) };
  }
  const p2 = p - 30;
  const salary = +(2.5 - (p2 * 0.038)).toFixed(2);
  return { years: rng(2, 3), salary: Math.max(1.2, salary) };
}
function npcFreeAgentContract(player) {
  const rating = parseNum(player?.rating, 70);
  const age = parseNum(player?.age, 25);
  let years = rng(1, 4);
  if (age >= 32) years = Math.min(years, 2);
  const salary = clamp(+(rating * 0.18 + rng(-2, 4)).toFixed(2), 1.2, 24);
  return { years, salary };
}
function shouldRenewNpcPlayer(teamId, player) {
  const rating = parseNum(player.rating, 70);
  const pot = parseNum(player.potential, 75);
  const age = parseNum(player.age, 25);
  const loyalty = clamp(parseNum(player.loyalty, 3), 1, 5);
  const roleScore = roleScoreForPlayer(player);
  let chance = 0.22 + (loyalty * 0.08);
  chance += clamp((rating - 72) / 50, -0.2, 0.35);
  chance += clamp((pot - rating) / 120, -0.12, 0.18);
  if (age >= 33) chance -= 0.2;
  if (roleScore >= 78) chance += 0.1;
  if (teamPayrollMillion(teamId) > LEAGUE_SALARY_CAP_M * 1.12) chance -= 0.18;
  return Math.random() < clamp(chance, 0.05, 0.92);
}
function normalizeLeagueContractYears() {
  if (!LEAGUE.loaded) return;
  Object.values(LEAGUE.teams).forEach(t => {
    (t.players || []).forEach(p => {
      const yrs = Math.max(0, parseNum(p.contractYears, 0) - 1);
      p.contractYears = yrs;
    });
  });
}
function processLeagueRenewalsStage() {
  if (!LEAGUE.loaded) return { released: [], renewed: 0 };
  const released = [];
  let renewed = 0;
  Object.values(LEAGUE.teams).forEach(t => {
    const teamId = t.meta.id;
    const kept = [];
    (t.players || []).forEach(p => {
      if (parseNum(p.contractYears, 0) > 0) {
        kept.push(p);
        return;
      }
      if (shouldRenewNpcPlayer(teamId, p)) {
        const offer = npcFreeAgentContract(p);
        if (teamPayrollMillion(teamId) + offer.salary <= LEAGUE_SALARY_CAP_M * 1.18) {
          p.contractYears = offer.years;
          p.salary = normalizeSalaryMillion(offer.salary);
          kept.push(p);
          renewed++;
          return;
        }
      }
      p.teamId = 0;
      p.salary = 0;
      p.contractYears = 0;
      released.push({ ...p });
    });
    t.players = kept;
  });
  return { released, renewed };
}
function createOffseasonDraftState() {
  const draftClass = generateDraftClass(60, { targetYear: G.year });
  const pool = draftClass.players.map(p => ({ ...p, scoutScore: scoutScoreProspect(p) }))
    .sort((a, b) => b.scoutScore - a.scoutScore || parseNum(b.potential, 0) - parseNum(a.potential, 0));
  return {
    year: draftClass.year,
    tier: draftClass.tier,
    order: buildDraftOrder60(),
    pool,
    results: []
  };
}
function applyDraftPickToTeam(teamId, rookie, pickNo) {
  const teamObj = LEAGUE.teams?.[teamId];
  if (!teamObj) return;
  const c = rookieContractByPick(pickNo);
  const player = {
    ...rookie,
    teamId,
    yearsLeague: 0,
    rookie: true,
    contractYears: c.years,
    salary: normalizeSalaryMillion(c.salary),
    draft: G.year * 100 + pickNo,
    draftPick: pickNo
  };
  teamObj.players.push(player);
  return player;
}
function processDraftRoundStage(draftState, round, preferredId, preferTeamId) {
  if (!draftState) return [];
  const start = round === 1 ? 0 : 30;
  const end = round === 1 ? 30 : 60;
  const picks = [];
  for (let i = start; i < end && draftState.pool.length; i++) {
    const teamId = draftState.order[i] || TEAMS[rng(0, TEAMS.length - 1)].id;
    const pref = (preferredId && teamId === preferTeamId) ? preferredId : null;
    const chosen = chooseDraftCandidateForTeam(draftState.pool, teamId, pref) || draftState.pool[0];
    const idx = draftState.pool.findIndex(p => String(p.id) === String(chosen.id));
    if (idx >= 0) draftState.pool.splice(idx, 1);
    const pickNo = i + 1;
    const picked = applyDraftPickToTeam(teamId, chosen, pickNo);
    if (picked) {
      picks.push({ pick: pickNo, teamId, player: picked });
      draftState.results.push({ pick: pickNo, teamId, player: picked });
    }
  }
  return picks;
}
function processDraftFinishStage(draftState, released) {
  const undrafted = (draftState?.pool || []).map(p => ({ ...p, teamId: 0, contractYears: 0, salary: 0, rookie: true, yearsLeague: 0 }));
  return [...(released || []), ...undrafted];
}
function processLeagueFreeAgencyStage(freeAgents, faPreferredId, faPreferTeamId) {
  if (!LEAGUE.loaded) return { signed: 0, remain: freeAgents?.length || 0 };
  const pool = [...(freeAgents || [])].sort((a, b) => scoutScoreProspect(b) - scoutScoreProspect(a));
  let signed = 0;
  const teamIds = Object.keys(LEAGUE.teams).map(Number).sort((a, b) => teamPayrollMillion(a) - teamPayrollMillion(b));
  teamIds.forEach(teamId => {
    const t = LEAGUE.teams[teamId];
    if (!t) return;
    while ((t.players || []).length < 13 && pool.length) {
      const top = pool.slice(0, Math.min(20, pool.length));
      if (faPreferredId && teamId === faPreferTeamId) {
        const prefInPool = pool.findIndex(p => String(p.id) === String(faPreferredId));
        if (prefInPool >= 0 && !top.some(p => String(p.id) === String(faPreferredId))) {
          top.push(pool[prefInPool]);
        }
      }
      let bestIdx = 0, bestScore = -1e9;
      top.forEach((p, i) => {
        const need = getTeamDraftNeedWeights(teamId);
        const pos1 = clamp(parseNum(p.pos, 3), 1, 5);
        const pos2 = parseNum(p.pos2, 0);
        let fit = (need[pos1] || 0) * 5;
        if (pos2 >= 1 && pos2 <= 5) fit = Math.max(fit, (need[pos2] || 0) * 3);
        let score = scoutScoreProspect(p) + fit + rng(-8, 8) * 0.08;
        if (faPreferredId && teamId === faPreferTeamId && String(p.id) === String(faPreferredId)) score += 15;
        if (score > bestScore) { bestScore = score; bestIdx = i; }
      });
      const chosen = top[bestIdx];
      const poolIndex = pool.findIndex(p => String(p.id) === String(chosen.id));
      if (poolIndex < 0) break;
      const offer = npcFreeAgentContract(chosen);
      if (teamPayrollMillion(teamId) + offer.salary > LEAGUE_SALARY_CAP_M * 1.18) {
        pool.splice(poolIndex, 1);
        continue;
      }
      const signedPlayer = { ...chosen, teamId, contractYears: offer.years, salary: normalizeSalaryMillion(offer.salary), rookie: false };
      t.players.push(signedPlayer);
      pool.splice(poolIndex, 1);
      signed++;
    }
  });
  return { signed, remain: pool.length };
}
function rosterRetentionScore(player, teamId) {
  const rating = parseNum(player?.rating, ovr(player?.attrs || {}));
  const potential = parseNum(player?.potential, rating);
  const age = parseNum(player?.age, 25);
  const yearsLeft = parseNum(player?.contractYears, 0);
  const rookieBonus = player?.rookie ? 2 : 0;
  const badgePower = typeof getPlayerBadgePower === 'function' ? getPlayerBadgePower(player) : 0;
  const need = getTeamDraftNeedWeights(teamId);
  const p1 = clamp(parseNum(player?.pos, 3), 1, 5);
  const p2 = parseNum(player?.pos2, 0);
  let fit = (need[p1] || 0) * 3;
  if (p2 >= 1 && p2 <= 5) fit = Math.max(fit, (need[p2] || 0) * 2);
  return rating * 0.9 + potential * 0.35 + badgePower * 1.8 + yearsLeft * 1.2 + fit + rookieBonus - Math.max(0, age - 31) * 1.1;
}
function enforceLeagueRosterCap(limit = 15) {
  if (!LEAGUE.loaded) return 0;
  const cap = clamp(parseNum(limit, 15), 10, 20);
  let released = 0;
  Object.values(LEAGUE.teams).forEach(t => {
    const teamId = parseNum(t?.meta?.id, 0);
    const players = Array.isArray(t?.players) ? t.players : [];
    if (players.length <= cap) return;
    const sorted = [...players].sort((a, b) => {
      const sa = rosterRetentionScore(a, teamId);
      const sb = rosterRetentionScore(b, teamId);
      return sb - sa || parseNum(b?.rating, 0) - parseNum(a?.rating, 0);
    });
    const keep = sorted.slice(0, cap);
    const cut = sorted.slice(cap);
    cut.forEach(p => {
      p.teamId = 0;
      p.contractYears = 0;
      p.salary = 0;
    });
    t.players = keep;
    released += cut.length;
  });
  return released;
}
function findLeaguePlayerByKey(teamId, playerId) {
  if (String(playerId) === 'USER_SELF') {
    return createUserRosterSnapshot();
  }
  return (getTeamPlayers(teamId) || []).find(p => String(p.id) === String(playerId)) || null;
}
function evaluateLeagueAwardsFromSeason() {
  ensureAwardCollections();
  const exist = leagueAwardEntryForSeason(G.season);
  if (exist?.regularSeasonIssued) {
    syncUserAwardsFromLeague(exist, { includeFinals: !!exist.finalsIssued });
    return exist;
  }

  const rows = getLeaguePlayerSeasonRows().filter(r => parseNum(r.gp, 0) >= 20);
  if (!rows.length) return exist || null;
  const recMap = new Map(getLeagueTeamRecordsArray().map(r => [r.id, r]));
  const scoreBy = (row, type) => {
    const rec = recMap.get(parseNum(row?.teamId, 0)) || { w: 0 };
    if (type === 'mvp') return parseNum(row.ppg, 0) * 1.5 + parseNum(row.apg, 0) * 1.2 + parseNum(row.rpg, 0) + parseNum(row.spg, 0) * 2 + parseNum(row.bpg, 0) * 2 + parseNum(rec.w, 0) * 0.3;
    if (type === 'dpoy') return parseNum(row.spg, 0) * 8 + parseNum(row.bpg, 0) * 10 + parseNum(row.rpg, 0) * 1.5;
    return parseNum(row.ppg, 0) * 1.4 + parseNum(row.rpg, 0) + parseNum(row.apg, 0) * 1.1;
  };
  const sortByScore = (arr, scorer) => [...arr].sort((a, b) =>
    scorer(b) - scorer(a) ||
    parseNum(b.ppg, 0) - parseNum(a.ppg, 0) ||
    parseNum(b.gp, 0) - parseNum(a.gp, 0)
  );
  const mvp = sortByScore(rows, r => scoreBy(r, 'mvp'))[0] || null;
  const dpoy = sortByScore(rows, r => scoreBy(r, 'dpoy'))[0] || null;
  const rookies = rows.filter(r => {
    const p = findLeaguePlayerByKey(r.teamId, r.playerId);
    return p && parseNum(p.yearsLeague, 0) <= 1;
  });
  const roy = rookies.length ? sortByScore(rookies, r => scoreBy(r, 'roy'))[0] : null;
  const scoring = [...rows].sort((a, b) => parseNum(b.ppg, 0) - parseNum(a.ppg, 0))[0] || null;
  const rebound = [...rows].sort((a, b) => parseNum(b.rpg, 0) - parseNum(a.rpg, 0))[0] || null;
  const assist = [...rows].sort((a, b) => parseNum(b.apg, 0) - parseNum(a.apg, 0))[0] || null;
  const steal = [...rows].sort((a, b) => parseNum(b.spg, 0) - parseNum(a.spg, 0))[0] || null;
  const block = [...rows].sort((a, b) => parseNum(b.bpg, 0) - parseNum(a.bpg, 0))[0] || null;
  const allNbaBoard = sortByScore(rows, r => scoreBy(r, 'mvp')).slice(0, 15);
  const allDefBoard = sortByScore(rows, r => scoreBy(r, 'dpoy')).slice(0, 10);
  const allStarBoard = sortByScore(rows, r => scoreBy(r, 'mvp')).slice(0, 24);

  const merged = upsertLeagueAwardEntry({
    ...(exist || {}),
    season: G.season,
    year: G.year,
    regularSeasonIssued: true,
    finalsIssued: !!exist?.finalsIssued,
    fmvp: exist?.fmvp || null,
    mvp: awardWinnerFromRow(mvp, { ppg: parseNum(mvp?.ppg, 0) }),
    dpoy: awardWinnerFromRow(dpoy, { stocks: +((parseNum(dpoy?.spg, 0) + parseNum(dpoy?.bpg, 0)).toFixed(1)) }),
    roy: awardWinnerFromRow(roy, { ppg: parseNum(roy?.ppg, 0) }),
    scoring: awardWinnerFromRow(scoring, { ppg: parseNum(scoring?.ppg, 0) }),
    rebound: awardWinnerFromRow(rebound, { rpg: parseNum(rebound?.rpg, 0) }),
    assist: awardWinnerFromRow(assist, { apg: parseNum(assist?.apg, 0) }),
    steal: awardWinnerFromRow(steal, { spg: parseNum(steal?.spg, 0) }),
    block: awardWinnerFromRow(block, { bpg: parseNum(block?.bpg, 0) }),
    allNba1: allNbaBoard.slice(0, 5).map(r => awardWinnerFromRow(r)),
    allNba2: allNbaBoard.slice(5, 10).map(r => awardWinnerFromRow(r)),
    allNba3: allNbaBoard.slice(10, 15).map(r => awardWinnerFromRow(r)),
    allDef1: allDefBoard.slice(0, 5).map(r => awardWinnerFromRow(r)),
    allDef2: allDefBoard.slice(5, 10).map(r => awardWinnerFromRow(r)),
    allStar: allStarBoard.map(r => awardWinnerFromRow(r))
  });

  if (merged?.mvp) addNews(`🏆 联盟MVP：${merged.mvp.name} (${merged.mvp.team})`, merged.mvp.isSelf ? 'special' : 'neu');
  if (merged?.dpoy) addNews(`🛡 DPOY：${merged.dpoy.name} (${merged.dpoy.team})`, merged.dpoy.isSelf ? 'special' : 'neu');
  if (merged?.roy) addNews(`🌟 最佳新秀：${merged.roy.name} (${merged.roy.team})`, merged.roy.isSelf ? 'special' : 'neu');
  syncUserAwardsFromLeague(merged, { includeFinals: !!merged.finalsIssued });
  return merged;
}
function runApkOffseasonPipeline(opts) {
  const { draftPref, faPref } = opts || {};
  const summary = [];
  G.offseasonStage = 227;
  const renewRes = processLeagueRenewalsStage();
  summary.push(`续约阶段：续约 ${renewRes.renewed} 人，进入自由市场 ${renewRes.released.length} 人`);
  G.offseasonStage = 228;
  const draftState = createOffseasonDraftState();
  const round1 = processDraftRoundStage(draftState, 1, draftPref || null, G.teamId);
  summary.push(`选秀首轮：完成 ${round1.length} 个签位`);
  G.offseasonStage = 229;
  const round2 = processDraftRoundStage(draftState, 2, draftPref || null, G.teamId);
  summary.push(`选秀次轮：完成 ${round2.length} 个签位`);
  G.offseasonStage = 230;
  const freePool = processDraftFinishStage(draftState, renewRes.released);
  summary.push(`选秀收尾：未签约球员池 ${freePool.length} 人`);
  G.offseasonStage = 231;
  const faRes = processLeagueFreeAgencyStage(freePool, faPref || null, G.teamId);
  summary.push(`自由市场：签约 ${faRes.signed} 人，剩余自由球员 ${faRes.remain} 人`);
  const trimmed = enforceLeagueRosterCap(15);
  if (trimmed > 0) summary.push(`阵容整理：裁掉 ${trimmed} 人（每队最多15人）`);
  G.offseasonStage = 232;
  Object.values(LEAGUE.teams).forEach(t => {
    t.rotation = toRotation(t.players || []);
    t.strength = calcTeamStrength(t);
  });
  const top = draftState.results[0];
  if (top) {
    addNews(`🎓 ${G.year}届选秀状元：${top.player.name} (${getTeam(top.teamId)?.a || '--'})`, 'neu');
  }
  return summary;
}
// ---- 大当家休赛期决策辅助 ----
function isPlayerAlpha() {
  try {
    const ctx = buildTeamUsageContext(G.teamId);
    const self = typeof createUserRosterSnapshot === 'function' ? createUserRosterSnapshot() : null;
    if (!self) return false;
    return ctx.tierMap.get(usagePlayerKey(self)) === 'alpha';
  } catch (e) { return false; }
}
function runOffseasonStaged_renewals() {
  G.offseasonStage = 227;
  return processLeagueRenewalsStage();
}
function runOffseasonStaged_draft(renewRes, draftPref) {
  const summary = [];
  summary.push(`续约阶段：续约 ${renewRes.renewed} 人，进入自由市场 ${renewRes.released.length} 人`);
  G.offseasonStage = 228;
  const draftState = createOffseasonDraftState();
  const round1 = processDraftRoundStage(draftState, 1, draftPref || null, G.teamId);
  summary.push(`选秀首轮：完成 ${round1.length} 个签位`);
  G.offseasonStage = 229;
  const round2 = processDraftRoundStage(draftState, 2, draftPref || null, G.teamId);
  summary.push(`选秀次轮：完成 ${round2.length} 个签位`);
  return { draftState, summary };
}
function runOffseasonStaged_fa(draftState, renewRes, faPref) {
  const summary = [];
  G.offseasonStage = 230;
  const freePool = processDraftFinishStage(draftState, renewRes.released);
  summary.push(`选秀收尾：未签约球员池 ${freePool.length} 人`);
  G.offseasonStage = 231;
  const faRes = processLeagueFreeAgencyStage(freePool, faPref || null, G.teamId);
  summary.push(`自由市场：签约 ${faRes.signed} 人，剩余自由球员 ${faRes.remain} 人`);
  const trimmed = enforceLeagueRosterCap(15);
  if (trimmed > 0) summary.push(`阵容整理：裁掉 ${trimmed} 人（每队最多15人）`);
  G.offseasonStage = 232;
  Object.values(LEAGUE.teams).forEach(t => {
    t.rotation = toRotation(t.players || []);
    t.strength = calcTeamStrength(t);
  });
  const top = draftState.results[0];
  if (top) addNews(`🎓 ${G.year}届选秀状元：${top.player.name} (${getTeam(top.teamId)?.a || '--'})`, 'neu');
  return summary;
}
function getTeamFirstRoundPick(teamId) {
  const order = buildDraftOrder60();
  for (let i = 0; i < 30; i++) {
    if (order[i] === teamId) return i;
  }
  return -1;
}
function previewDraftProspects(pickIndex, count) {
  const dc = generateDraftClass(60, { targetYear: G.year });
  const pool = dc.players.map(p => ({ ...p, scoutScore: scoutScoreProspect(p) }))
    .sort((a, b) => b.scoutScore - a.scoutScore || parseNum(b.potential, 0) - parseNum(a.potential, 0));
  const start = Math.max(0, pickIndex - 2);
  const end = Math.min(pool.length, start + count);
  return pool.slice(start, end);
}
function getAffordableFreeAgents(teamId, pool, limit) {
  limit = limit || 8;
  const payroll = teamPayrollMillion(teamId);
  const room = LEAGUE_SALARY_CAP_M * 1.18 - payroll;
  if (room <= 0) return [];
  return pool.filter(p => {
    const c = npcFreeAgentContract(p);
    return c.salary <= room;
  }).sort((a, b) => scoutScoreProspect(b) - scoutScoreProspect(a)).slice(0, limit);
}
function endSeasonPostPipeline() {
  G.player.stamina = 100;
  G.player.mood = clamp(G.player.mood + rng(-5, 10), 10, 100);
  recalcPlayerTradeValue();
  G.playoffs = { active: false, round: 0, series: [], eliminated: false };
  G.season++; G.year++;
}
function freeAgency() {
  const o = ovr(G.player.attrs);
  const offers = [];
  const teams = [...TEAMS].sort((a, b) => teamPayrollMillion(a.id) - teamPayrollMillion(b.id));
  teams.forEach(t => {
    const need = getTeamDraftNeedWeights(t.id);
    const posNeed = (need[parseNum(G.player.pos, 3)] || 0) * 6;
    const strengthBoost = (88 - getTeamStrength(t.id)) * 0.12;
    const payrollPenalty = Math.max(0, teamPayrollMillion(t.id) - LEAGUE_SALARY_CAP_M) * 0.08;
    const interest = 35 + posNeed + strengthBoost + (o - 70) * 0.8 - payrollPenalty + rng(-8, 8);
    if (interest < 36 && t.id !== G.teamId) return;
    const baseSalary = clamp(o * 0.2 + rng(-2, 4), 2.2, 28);
    const years = clamp(rng(1, 4) + (o >= 83 ? 1 : 0), 1, 5);
    offers.push({ team: t, salary: +baseSalary.toFixed(2), years, current: t.id === G.teamId, interest });
  });
  const sorted = offers.sort((a, b) => b.interest - a.interest || b.salary - a.salary);
  const top = sorted.slice(0, 6);
  if (!top.some(o => o.current) && G.team) {
    top.push({ team: G.team, salary: +clamp(o * 0.19, 2.5, 20).toFixed(2), years: rng(2, 4), current: true, interest: 50 });
  }
  return top.sort((a, b) => b.salary - a.salary);
}

function signContract(teamId, salary, years) {
  if (teamId !== G.teamId) {
    G.teamId = teamId; G.team = getTeam(teamId);
    G.player.teamsPlayed.push(teamId);
    G.player.trust = 45;
    G.teamMorale = 45; G.winStreak = 0;
    if (G.player.xfactor === 'nomad') {
      const nomadBoost = parseNum(getPlayerXFactorEffect(G.player).nomadBoost, 3);
      G.nomadCount++;
      ATTRS.forEach(at => { G.player.attrs[at.k] = clamp(G.player.attrs[at.k] + nomadBoost, 25, 99) });
    }
  }
  G.player.salary = normalizeSalaryMillion(salary); G.player.contractYears = years;
  if (typeof applySeasonSalaryPayout === 'function') applySeasonSalaryPayout({ force: true, reason: '签约后薪资发放' });
  recalcPlayerTradeValue();
  addNews(`✍️ ${G.player.name}与${G.team.z}签下${years}年$${normalizeSalaryMillion(salary).toFixed(2)}M合同`, 'pos');
}

// ============ SEASON END & EVENTS ============
async function endSeason(opts) {
  const s = G.seasonStats, gp = Math.max(s.gp, 1);
  G.careerStats.push({
    season: G.season, year: G.year, team: G.teamId, gp: s.gp,
    ppg: +(s.pts / gp).toFixed(1), apg: +(s.ast / gp).toFixed(1), rpg: +(s.reb / gp).toFixed(1),
    spg: +(s.stl / gp).toFixed(1), bpg: +(s.blk / gp).toFixed(1),
    fgPct: s.fga > 0 ? +(s.fgm / s.fga * 100).toFixed(1) : 0,
    tpPct: s.tpa > 0 ? +(s.tpm / s.tpa * 100).toFixed(1) : 0,
    ftPct: s.fta > 0 ? +(s.ftm / s.fta * 100).toFixed(1) : 0,
    wins: s.wins, losses: s.losses
  });

  // --- 保存NPC球员赛季数据到 careerHistory ---
  if (LEAGUE.loaded && G.leagueSeason?.playerStats) {
    Object.values(G.leagueSeason.playerStats).forEach(ps => {
      if (ps.isSelf || !ps.playerId || ps.gp <= 0) return;
      const teamObj = LEAGUE.teams?.[ps.teamId];
      if (!teamObj) return;
      const playerObj = (teamObj.players || []).find(p => String(p.id) === String(ps.playerId));
      if (!playerObj) return;
      if (!Array.isArray(playerObj.careerHistory)) playerObj.careerHistory = [];
      const ngp = Math.max(ps.gp, 1);
      playerObj.careerHistory.push({
        season: G.season, year: G.year, team: ps.teamId, gp: ps.gp,
        ppg: +(ps.pts / ngp).toFixed(1), apg: +(ps.ast / ngp).toFixed(1), rpg: +(ps.reb / ngp).toFixed(1),
        spg: +(ps.stl / ngp).toFixed(1), bpg: +(ps.blk / ngp).toFixed(1),
        fgPct: ps.fga > 0 ? +(ps.fgm / ps.fga * 100).toFixed(1) : 0,
        tpPct: ps.tpa > 0 ? +(ps.tpm / ps.tpa * 100).toFixed(1) : 0,
        ftPct: ps.fta > 0 ? +(ps.ftm / ps.fta * 100).toFixed(1) : 0
      });
    });
  }

  ensureRegularSeasonAwardsIssued();
  finalizeFinalsAwardsForSeason();
  G._pendingRegularSeasonAwardsModal = false;
  growAttrs();
  progressLeaguePlayers();
  G.player.contractYears = Math.max(0, parseNum(G.player.contractYears, 0) - 1);
  normalizeLeagueContractYears();
  if (opts && opts.staged) return;
  G.offseasonSummary = runApkOffseasonPipeline();
  endSeasonPostPipeline();
}

// 随机事件函数已移除

// ============ HEXAGONAL RADAR CHART ============
function drawHexChart(canvasId, attrs) {
  const c = document.getElementById(canvasId);
  if (!c) return;
  const ctx = c.getContext('2d');
  const w = c.width = 220, h = c.height = 220;
  const cx = w / 2, cy = h / 2, r = 80;
  const keys = ['pass', 'shotInt', 'shotExt', 'speed', 'reb', 'blk'];
  const labels = ['传球', '内线', '三分', '速度', '篮板', '盖帽'];
  const n = keys.length;
  ctx.clearRect(0, 0, w, h);
  // grid
  for (let lv = 1; lv <= 4; lv++) {
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const ang = Math.PI * 2 / n * i - Math.PI / 2;
      const rr = r * lv / 4;
      const x = cx + rr * Math.cos(ang), y = cy + rr * Math.sin(ang);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.1)'; ctx.stroke();
  }
  // data
  ctx.beginPath();
  keys.forEach((k, i) => {
    const v = (attrs[k] || 50) / 100;
    const ang = Math.PI * 2 / n * i - Math.PI / 2;
    const x = cx + r * v * Math.cos(ang), y = cy + r * v * Math.sin(ang);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.fillStyle = 'rgba(253,185,39,0.2)'; ctx.fill();
  ctx.strokeStyle = '#fdb927'; ctx.lineWidth = 2; ctx.stroke();
  // labels
  ctx.fillStyle = '#a0a0b0'; ctx.font = '11px sans-serif'; ctx.textAlign = 'center';
  keys.forEach((k, i) => {
    const ang = Math.PI * 2 / n * i - Math.PI / 2;
    const x = cx + (r + 18) * Math.cos(ang), y = cy + (r + 18) * Math.sin(ang) + 4;
    ctx.fillText(labels[i] + ' ' + Math.round(attrs[k] || 50), x, y);
  });
}
