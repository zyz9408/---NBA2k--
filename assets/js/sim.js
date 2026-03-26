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

function buildPlayerGameRow(player, targetPts, oppRating, { teamId = 0, home = false } = {}) {
  const isSelf = !!player.isSelf;
  const minutes = clamp(Math.round(parseNum(player.minutes, 0)), 0, 40);
  const pos = clamp(parseNum(player.pos, 3), 1, 5);
  const rating = clamp(parseNum(player.rating, 65), 40, 99);
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
    tov: 0,
    fgm: 0,
    fga: 0,
    tpm: 0,
    tpa: 0,
    ftm: 0,
    fta: 0
  };

  if (minutes <= 0 || targetPts <= 0) {
    row.reb = clamp(Math.round((minutes / 12) * (pos >= 4 ? 1.2 : 0.5) + (rating - 60) / 35 + rng(-1, 1)), 0, pos >= 4 ? 14 : 9);
    row.ast = clamp(Math.round((minutes / 13) * (pos <= 2 ? 1.4 : pos === 3 ? 0.9 : 0.5) + (rating - 60) / 45 + rng(-1, 1)), 0, 12);
    row.stl = clamp(Math.round((minutes / 18) * (pos <= 3 ? 0.5 : 0.3) + rng(0, 1)), 0, 5);
    row.blk = clamp(Math.round((minutes / 18) * (pos >= 4 ? 0.65 : 0.2) + rng(0, 1)), 0, 5);
    row.tov = clamp(Math.round((minutes / 10) * (pos <= 2 ? 0.75 : 0.5) + rng(0, 1)), 0, 8);
    return row;
  }

  let fta = clamp(Math.round(targetPts * (0.08 + (rating - 60) / 280) + rng(0, 1)), 0, Math.min(12, targetPts));
  let ftm = clamp(Math.round(fta * clamp(0.68 + (rating - 65) / 90, 0.65, 0.93)), 0, fta);
  let fgPts = Math.max(0, targetPts - ftm);
  let tpm = 0;
  let fgm = 0;

  if (fgPts > 0) {
    const maxTpm = Math.floor(fgPts / 3);
    const threeBase = pos <= 2 ? 0.95 : pos === 3 ? 0.58 : 0.22;
    tpm = clamp(Math.round((minutes / 36) * (threeBase * 4) + (rating - 60) / 18 - (oppRating - 75) / 60 + rng(-1, 1)), 0, maxTpm);
    if (((fgPts - tpm) & 1) === 1) {
      if (tpm < maxTpm) tpm++;
      else if (tpm > 0) tpm--;
    }
    while (tpm > maxTpm) tpm--;
    fgm = Math.max(tpm, (fgPts - tpm) / 2);
  }

  const fga = clamp(Math.max(fgm + rng(1, 4), Math.round(minutes * 0.42) + rng(-1, 3), tpm + rng(1, 3)), Math.max(fgm, tpm), 28);
  const tpa = clamp(Math.max(tpm, Math.round(fga * (pos <= 2 ? 0.44 : pos === 3 ? 0.34 : 0.22) + rng(-1, 1))), tpm, fga);

  row.fta = fta;
  row.ftm = ftm;
  row.fgm = fgm;
  row.fga = fga;
  row.tpm = tpm;
  row.tpa = tpa;
  row.pts = (row.fgm - row.tpm) * 2 + row.tpm * 3 + row.ftm;
  row.reb = clamp(Math.round((minutes / 12) * (pos >= 4 ? 1.25 : 0.55) + (rating - 60) / 35 + rng(-1, 2)), 0, pos >= 4 ? 16 : 10);
  row.ast = clamp(Math.round((minutes / 13) * (pos <= 2 ? 1.55 : pos === 3 ? 0.95 : 0.5) + (rating - 60) / 45 + rng(-1, 2)), 0, 14);
  row.stl = clamp(Math.round((minutes / 18) * (pos <= 3 ? 0.55 : 0.35) + rng(0, 1)), 0, 6);
  row.blk = clamp(Math.round((minutes / 18) * (pos >= 4 ? 0.7 : 0.25) + rng(0, 1)), 0, 6);
  row.tov = clamp(Math.round((minutes / 10) * (pos <= 2 ? 0.8 : 0.55) + (targetPts >= 20 ? 0.5 : 0.2) + rng(0, 1)), 0, 8);
  return row;
}

function buildTeamGameBoxScore(teamId, teamPts, oppRating, { home = false, includeUser = false } = {}) {
  const team = getTeam(teamId) || {};
  const teamName = String(team.z || team.n || '--').trim();
  const abbr = String(team.a || team.abbr || '--').trim();
  let rotation = getGameRotationSnapshot(teamId, { includeUser: !!includeUser || parseNum(teamId, 0) === parseNum(G.teamId, 0) });
  if (!rotation.length) {
    const fallbackPlayers = [...(getTeamPlayers(teamId) || [])];
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

  const weights = rotation.map(p => {
    const rating = clamp(parseNum(p.rating, 65), 40, 99);
    const minutes = clamp(parseNum(p.minutes, 18), 0, 40);
    const tierBonus = { alpha: 1.18, second: 1.12, third: 1.07, sixthman: 1.04, rolestarter: 1.0, bench: 0.88, end: 0.72 }[p.teamTier] || 1;
    const selfBonus = p.isSelf ? 1.12 : 1;
    return Math.max(0.1, minutes * (0.7 + rating / 130) * tierBonus * selfBonus * (1 + rng(-0.08, 0.08)));
  });
  const targets = allocateIntegerShares(Math.max(0, Math.round(parseNum(teamPts, 0))), weights);
  const rows = rotation.map((p, i) => buildPlayerGameRow(p, targets[i] || 0, oppRating, { teamId, home }));

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
    acc.tov += parseNum(row.tov, 0);
    acc.fgm += parseNum(row.fgm, 0);
    acc.fga += parseNum(row.fga, 0);
    acc.tpm += parseNum(row.tpm, 0);
    acc.tpa += parseNum(row.tpa, 0);
    acc.ftm += parseNum(row.ftm, 0);
    acc.fta += parseNum(row.fta, 0);
    return acc;
  }, { gp: 0, mins: 0, pts: 0, reb: 0, ast: 0, stl: 0, blk: 0, tov: 0, fgm: 0, fga: 0, tpm: 0, tpa: 0, ftm: 0, fta: 0 });

  return { teamId: parseNum(teamId, 0), team, teamName, abbr, home: !!home, teamPts: parseNum(teamPts, 0), oppRating: parseNum(oppRating, 75), boxScore: rows, rows, totals };
}

function buildGameFlow(homeSnapshot, awaySnapshot, { userTeamId = 0 } = {}) {
  const homeScore = parseNum(homeSnapshot?.teamPts, 0);
  const awayScore = parseNum(awaySnapshot?.teamPts, 0);
  const labels = ['Q1', 'Q2', 'Q3', 'Q4'];
  const margin = Math.abs(homeScore - awayScore);
  const closeGame = margin <= 7;
  const homePeriods = allocateIntegerShares(homeScore, [0.24, 0.25, 0.25, 0.26].map((w, i) => Math.max(0.08, w + (closeGame && i === 3 ? 0.04 : 0) + rng(-0.02, 0.02))));
  const awayPeriods = allocateIntegerShares(awayScore, [0.25, 0.24, 0.25, 0.26].map((w, i) => Math.max(0.08, w + (closeGame && i === 3 ? 0.03 : 0) + rng(-0.02, 0.02))));
  const homePoss = clamp(Math.round(92 + rng(-3, 5) + (parseNum(homeSnapshot?.totals?.fga, 0) + parseNum(awaySnapshot?.totals?.fga, 0)) * 0.12), 84, 108);
  const awayPoss = clamp(Math.round(homePoss + rng(-2, 2)), 84, 108);
  const homeOrtg = Math.round(homeScore / Math.max(1, homePoss) * 100);
  const awayOrtg = Math.round(awayScore / Math.max(1, awayPoss) * 100);
  const homeEfg = homeSnapshot?.totals?.fga > 0 ? Math.round(((homeSnapshot.totals.fgm + 0.5 * homeSnapshot.totals.tpm) / homeSnapshot.totals.fga) * 100) : 0;
  const awayEfg = awaySnapshot?.totals?.fga > 0 ? Math.round(((awaySnapshot.totals.fgm + 0.5 * awaySnapshot.totals.tpm) / awaySnapshot.totals.fga) * 100) : 0;
  const homeTovRate = Math.round((parseNum(homeSnapshot?.totals?.tov, 0) / Math.max(1, homePoss)) * 100);
  const awayTovRate = Math.round((parseNum(awaySnapshot?.totals?.tov, 0) / Math.max(1, awayPoss)) * 100);

  let homeCum = 0;
  let awayCum = 0;
  let biggestLeadHome = 0;
  let biggestLeadAway = 0;
  let leadChanges = 0;
  let prevLeader = 0;
  for (let i = 0; i < 4; i++) {
    homeCum += homePeriods[i] || 0;
    awayCum += awayPeriods[i] || 0;
    const diff = homeCum - awayCum;
    const leader = diff > 0 ? 1 : (diff < 0 ? -1 : 0);
    if (leader !== 0 && prevLeader !== 0 && leader !== prevLeader) leadChanges++;
    if (leader !== 0) prevLeader = leader;
    biggestLeadHome = Math.max(biggestLeadHome, diff);
    biggestLeadAway = Math.max(biggestLeadAway, -diff);
  }

  const summary = homeScore > awayScore
    ? (closeGame ? '双方鏖战到最后一节，主队顶住了最后的反扑。' : '主队在下半场拉开差距，稳稳收下比赛。')
    : (closeGame ? '比赛一路拉扯到最后，客队在收官阶段完成反超。' : '客队早早建立优势，并把领先保持到了终场。');
  const runs = closeGame
    ? [
        homeScore > awayScore ? `${homeSnapshot.abbr || 'HOME'} 在第四节守住了关键回合` : `${awaySnapshot.abbr || 'AWAY'} 在第四节打出反扑高潮`,
        '双方一度陷入拉锯，分差始终在一个回合以内'
      ]
    : [
        homeScore > awayScore ? `${homeSnapshot.abbr || 'HOME'} 在第三节打出一波小高潮` : `${awaySnapshot.abbr || 'AWAY'} 在第二节建立两位数优势`
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
    hasOvertime: false,
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
  const homeStrength = getTeamStrength(homeId);
  const awayStrength = getTeamStrength(awayId);
  let homePts = clamp(Math.round(96 + (homeStrength - 75) * 0.72 - (awayStrength - 75) * 0.32 + rng(-8, 8) + (userTeamId && homeId === userTeamId ? 2 : 0)), 78, 142);
  let awayPts = clamp(Math.round(96 + (awayStrength - 75) * 0.72 - (homeStrength - 75) * 0.32 + rng(-8, 8) + (userTeamId && awayId === userTeamId ? 2 : 0)), 78, 142);
  if (userTeamId && homeId === userTeamId && G.player?.injury?.active) homePts = clamp(homePts - 8, 72, 142);
  if (userTeamId && awayId === userTeamId && G.player?.injury?.active) awayPts = clamp(awayPts - 8, 72, 142);
  const homeSnapshot = buildTeamGameBoxScore(homeId, homePts, awayStrength, { home: true, includeUser: true });
  const awaySnapshot = buildTeamGameBoxScore(awayId, awayPts, homeStrength, { home: false, includeUser: false });
  const flow = buildGameFlow(homeSnapshot, awaySnapshot, { userTeamId: parseNum(opts.userTeamId, 0) });
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
  const st = selfRow ? {
    mins: parseNum(selfRow.mins, 0),
    pts: parseNum(selfRow.pts, 0),
    reb: parseNum(selfRow.reb, 0),
    ast: parseNum(selfRow.ast, 0),
    stl: parseNum(selfRow.stl, 0),
    blk: parseNum(selfRow.blk, 0),
    tov: parseNum(selfRow.tov, 0),
    fgm: parseNum(selfRow.fgm, 0),
    fga: parseNum(selfRow.fga, 0),
    tpm: parseNum(selfRow.tpm, 0),
    tpa: parseNum(selfRow.tpa, 0),
    ftm: parseNum(selfRow.ftm, 0),
    fta: parseNum(selfRow.fta, 0)
  } : { mins: 0, pts: 0, reb: 0, ast: 0, stl: 0, blk: 0, tov: 0, fgm: 0, fga: 0, tpm: 0, tpa: 0, ftm: 0, fta: 0 };

  const result = {
    game: idx + 1,
    gameNum: idx,
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

  const effortCfg = getEffortMode(G._effortMode);
  const staminaLoss = injured ? 4 : clamp(Math.round((12 + st.mins / 5 + Math.max(0, st.pts - 20) * 0.2) * (effortCfg.staminaMult || 1)), 4, 28);
  G.player.stamina = clamp(parseNum(G.player.stamina, 100) - staminaLoss, 0, 100);
  if (typeof checkInjury === 'function' && !G.player?.injury?.active) checkInjury();

  // 添加比赛带来的 XP (基础15 + 表现加成)
  const gradeBonus = { 'S+': 15, 'S': 12, 'A': 8, 'B': 5, 'C': 3, 'D': 1, 'F': 0 }[result.grade] || 2;
  const matchXp = 15 + gradeBonus;
  addPlayerXP(matchXp);
  result.events.push(`🏀 比赛表现 ${result.grade}，XP+${matchXp}`);

  G.results.push(result);
  G.gameNum = idx + 1;
  updateTeamMorale(result.win);
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
    result.gameEvent = gameRes?.gameEvent || G._gameEventResult || null;
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
    case 'luxury_purchase':
      return `${playerName}刚入手${label}，${category}热度直接被拉起来。${detail ? ` ${detail}` : ''}`.trim();
    default:
      return `${playerName}又完成了一笔${category}相关采购：${label}。${detail ? ` ${detail}` : ''}`.trim();
  }
}
function createCommercialBuzzPost(event, { day = Math.max(0, G.dayNum - 1), season = G.season, year = G.year } = {}) {
  const evt = event || {};
  const score = parseNum(evt.fame, 0) + parseNum(evt.trust, 0);
  const tone = score >= 2 ? 'positive' : (score <= -2 ? 'negative' : 'neutral');
  const personaKey = String(evt.type || 'purchase') === 'endorsement_sign'
    ? 'news'
    : String(evt.type || 'purchase') === 'signature_shoe'
      ? 'data'
      : String(evt.type || 'purchase') === 'coach_upgrade'
        ? 'tactical'
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
    likes: clamp(Math.round(110 + Math.max(0, score * 22) + rng(20, 180)), 20, 9999),
    reposts: clamp(Math.round(18 + Math.max(0, score * 4) + rng(5, 70)), 5, 9999),
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
  if (!Array.isArray(G.social.commercialEvents)) G.social.commercialEvents = [];
  if (!Array.isArray(G.social.llmModels)) G.social.llmModels = [];
  if (!Number.isFinite(parseNum(G.social.llmModelsFetchedAt, NaN))) G.social.llmModelsFetchedAt = 0;
  if (!G.social.lastLLMTest || typeof G.social.lastLLMTest !== 'object') G.social.lastLLMTest = { ok: false, message: '', at: 0 };
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
function saveSocialLLMSettings({ enabled, baseUrl, model, apiKey, imageModel, presets } = {}) {
  ensureSocialState();
  const llm = G.social.llm;
  if (typeof enabled === 'boolean') llm.enabled = enabled;
  if (baseUrl !== undefined) llm.baseUrl = normalizeLLMBaseUrl(baseUrl);
  if (model !== undefined) llm.model = String(model || 'gpt-4.1-mini').trim() || 'gpt-4.1-mini';
  if (apiKey !== undefined) llm.apiKey = String(apiKey || '').trim();
  if (imageModel !== undefined) llm.imageModel = String(imageModel || '').trim();
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
  const commercialEvents = typeof getRecentCommercialEvents === 'function' ? getRecentCommercialEvents(3).map(e => ({
    label: e?.displayLabel || e?.label || '', detail: e?.detail || '', type: e?.type || ''
  })) : [];

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
    commercialEvents
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

    markSocialGeneratedDay(day, added.length, season);
    G.social.lastLLMError = '';
    return added;
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

  markSocialGeneratedDay(day, added.length, season);
  return added;
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
    luxury: LUXURY_MARKET.map(item => ({ ...item, image: buildLuxuryImage(item), owned: owned.has(String(item.id)) })),
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
  emitPurchaseSocialBuzz({
    type: 'luxury_purchase',
    label: item.name,
    displayLabel: item.name,
    tag: item.socialTag || '消费',
    category: item.socialTag || '消费',
    brand: item.name,
    product: '',
    detail: `购买价 $${parseNum(item.cost, 0).toFixed(1)}M`,
    fame: parseNum(item.fame, 0),
    trust: parseNum(item.trust, 0),
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
