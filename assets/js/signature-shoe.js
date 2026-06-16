const SIGNATURE_SHOE_SLOT_KEYS = ['speed', 'shooting', 'finishing', 'playmaking', 'defense'];
const SIGNATURE_SHOE_EFFECT_LABELS = {
  speed: '速度',
  shooting: '投射',
  finishing: '终结',
  playmaking: '组织',
  defense: '防守',
  speedAttr: '速度',
  shotExt: '外线投射',
  shotInt: '内线终结',
  pass: '传球',
  stl: '抢断',
  blk: '盖帽',
  physique: '体能'
};
const SIGNATURE_SHOE_STYLE_DEFS = {
  speed: { label: '速度型', priority: ['speed', 'shooting', 'playmaking', 'finishing', 'defense'] },
  scoring: { label: '得分型', priority: ['shooting', 'finishing', 'speed', 'playmaking', 'defense'] },
  defense: { label: '防守型', priority: ['defense', 'speed', 'playmaking', 'finishing', 'shooting'] },
  allaround: { label: '全能型', priority: ['speed', 'shooting', 'finishing', 'playmaking', 'defense'] }
};
const SIGNATURE_SHOE_LEVEL_RULES = {
  1: { level: 1, label: '基础版', extraPoints: 0, fame: 0, honor: 0, earned: 0, days: 0 },
  2: { level: 2, label: '进阶版', extraPoints: 2, fame: 30, honor: 20, earned: 0.35, days: 10 },
  3: { level: 3, label: '强化版', extraPoints: 2, fame: 45, honor: 35, earned: 0.95, days: 24 },
  4: { level: 4, label: '旗舰版', extraPoints: 3, fame: 60, honor: 50, earned: 1.9, days: 42 },
  5: { level: 5, label: '传奇版', extraPoints: 3, fame: 75, honor: 65, earned: 3.5, days: 60 }
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
function getSignatureShoeBudgetForLevel(level) {
  const lv = clamp(parseNum(level, 1), 1, 5);
  let budget = getSignatureShoeBaseBudget();
  for (let i = 2; i <= lv; i++) budget += parseNum(getSignatureShoeUpgradeRule(i)?.extraPoints, 0);
  return budget;
}
function getSignatureShoeDefaultAllocations(styleKey, budget = 5) {
  const out = { speed: 0, shooting: 0, finishing: 0, playmaking: 0, defense: 0 };
  const priority = getSignatureShoeStylePriority(styleKey);
  const total = Math.max(1, Math.floor(parseNum(budget, 5)));
  for (let i = 0; i < total; i++) out[priority[i % priority.length]] += 1;
  return out;
}
function normalizeSignatureShoeAllocations(raw, styleKey, budget = 5) {
  const out = { speed: 0, shooting: 0, finishing: 0, playmaking: 0, defense: 0 };
  if (raw && typeof raw === 'object') {
    SIGNATURE_SHOE_SLOT_KEYS.forEach(key => { out[key] = clamp(Math.floor(parseNum(raw[key], 0)), 0, 99); });
  }
  let total = SIGNATURE_SHOE_SLOT_KEYS.reduce((sum, key) => sum + parseNum(out[key], 0), 0);
  const target = Math.max(1, Math.floor(parseNum(budget, 5)));
  if (total === 0) return getSignatureShoeDefaultAllocations(styleKey, target);
  if (total > target) {
    const priority = getSignatureShoeStylePriority(styleKey).slice().reverse();
    let guard = 0;
    while (total > target && guard < 300) {
      const key = priority[guard % priority.length];
      if (out[key] > 0) {
        out[key] -= 1;
        total -= 1;
      }
      guard += 1;
    }
  }
  return out;
}
function formatSignatureShoeBoostText(boosts = {}) {
  return Object.entries(boosts || {})
    .filter(([, v]) => parseNum(v, 0) > 0)
    .map(([k, v]) => `${SIGNATURE_SHOE_EFFECT_LABELS[k] || k}+${parseNum(v, 0)}`)
    .join(' / ');
}
function formatSignatureShoeMoney(v) {
  return `${parseNum(v, 0).toFixed(3)}M`;
}
function sanitizeSignatureShoeName(raw, fallback = '') {
  const txt = String(raw || '').replace(/\s+/g, ' ').trim();
  const base = txt || String(fallback || '').replace(/\s+/g, ' ').trim();
  return base.slice(0, 28);
}
function calculateSignatureShoeIncome(contract, shoe = {}) {
  const tier = clamp(parseNum(contract?.tier, 1), 1, 5);
  const level = clamp(parseNum(shoe?.level, 1), 1, 5);
  const pointsBudget = Math.max(getSignatureShoeBaseBudget(), parseNum(shoe?.pointsBudget, getSignatureShoeBaseBudget()));
  const fame = clamp(parseNum(G.player?.fame, 0), 0, 100);
  const trust = clamp(parseNum(G.player?.trust, 0), 0, 100);
  const honor = clamp(parseNum(typeof getPlayerEndorsementHonorScore === 'function' ? getPlayerEndorsementHonorScore() : 0, 0), 0, 300);
  const tierFactor = 0.92 + tier * 0.16;
  const fameFactor = 0.85 + fame / 100;
  const trustFactor = 0.9 + trust / 180;
  const honorFactor = 0.92 + honor / 240;
  const levelFactor = 1 + (level - 1) * 0.3;
  const budgetFactor = 1 + Math.max(0, pointsBudget - 5) * 0.05;
  const dailyIncome = +(0.006 * tierFactor * fameFactor * trustFactor * honorFactor * levelFactor * budgetFactor).toFixed(3);
  const gameIncome = +(dailyIncome * (1.5 + level * 0.12)).toFixed(3);
  return { dailyIncome, gameIncome, revenueRate: +(dailyIncome * 30).toFixed(3), tierFactor, fameFactor, trustFactor, honorFactor, levelFactor, budgetFactor };
}
function buildSignatureShoeBoosts(contract, configOrStyleKey = {}) {
  const config = typeof configOrStyleKey === 'string' ? { styleKey: configOrStyleKey } : (configOrStyleKey || {});
  const source = config.shoe && typeof config.shoe === 'object' ? config.shoe : (contract?.shoe && typeof contract.shoe === 'object' ? contract.shoe : {});
  const styleKey = normalizeSignatureShoeStyle(config.styleKey ?? source.styleKey ?? contract?.shoeStyle ?? 'allaround');
  const level = clamp(parseNum(config.level ?? source.level ?? 1, 1), 1, 5);
  const baseBudget = getSignatureShoeBudgetForLevel(level);
  const budget = Math.max(baseBudget, parseNum(config.pointsBudget ?? source.pointsBudget ?? baseBudget, baseBudget));
  const allocations = normalizeSignatureShoeAllocations(config.allocations ?? source.allocations ?? null, styleKey, budget);
  const boosts = { speed: 0, shotExt: 0, shotInt: 0, pass: 0, stl: 0, blk: 0, physique: 0 };
  const slotEffects = {
    speed: { speed: 2, physique: 1 },
    shooting: { shotExt: 2 },
    finishing: { shotInt: 2, physique: 1 },
    playmaking: { pass: 2, speed: 1 },
    defense: { stl: 1, blk: 1, physique: 1 }
  };
  SIGNATURE_SHOE_SLOT_KEYS.forEach(slot => {
    const points = parseNum(allocations[slot], 0);
    const effect = slotEffects[slot] || {};
    Object.entries(effect).forEach(([key, value]) => { boosts[key] = parseNum(boosts[key], 0) + points * value; });
  });
  const pointsUsed = SIGNATURE_SHOE_SLOT_KEYS.reduce((sum, key) => sum + parseNum(allocations[key], 0), 0);
  const remainingPoints = Math.max(0, budget - pointsUsed);
  const styleDef = getSignatureShoeStyleDef(styleKey);
  return {
    styleKey,
    styleLabel: styleDef.label,
    level,
    levelRule: getSignatureShoeUpgradeRule(level),
    pointsBudget: budget,
    pointsUsed,
    remainingPoints,
    allocations,
    boosts,
    summary: formatSignatureShoeBoostText(boosts),
    revenue: calculateSignatureShoeIncome(contract, { ...source, level, pointsBudget: budget, allocations }),
    slotEffects
  };
}
function buildSignatureShoeFallbackImage(contract, shoe = {}) {
  const style = getSignatureShoeStyleDef(shoe?.styleKey);
  const revenue = calculateSignatureShoeIncome(contract, shoe);
  const balance = parseNum(shoe?.remainingPoints, 0) > 0 ? `剩余 ${parseNum(shoe?.remainingPoints, 0)} 点` : '已分配完毕';
  const palette = buildArtPalette(`${contract?.brand || ''}_${shoe?.name || ''}_${style.label || ''}`);
  return buildCommercialArt({
    title: sanitizeSignatureShoeName(shoe?.name || `${contract?.brand || '品牌'} 签名鞋`, `${contract?.brand || '品牌'} 签名鞋`),
    subtitle: `${String(contract?.brand || '品牌').trim()} · ${style.label}`,
    badge: `L${parseNum(shoe?.level, 1)} · ${balance}`,
    icon: '鞋',
    seed: `${contract?.id || ''}_${shoe?.styleKey || ''}_${shoe?.name || ''}`,
    accent: palette[0],
    accent2: palette[1],
    footer: `日常 ${formatSignatureShoeMoney(revenue.dailyIncome)} | 比赛日 ${formatSignatureShoeMoney(revenue.gameIncome)}`,
    tone: 'positive'
  });
}
function resolveEndorsementContract(contractRef) {
  if (contractRef && typeof contractRef === 'object') return contractRef;
  const state = getEndorsementState();
  return (state.active || []).find(c => String(c.id) === String(contractRef)) || null;
}
function syncSignatureShoePointer(state = null) {
  const e = state || getEndorsementState();
  if (!e || typeof e !== 'object') return null;
  const next = (Array.isArray(e.active) ? e.active : []).find(contract => contract && contract.shoe && contract.shoeEligible) || null;
  e.signatureShoe = next;
  return next;
}
function getSignatureShoeCurrentState(contractRef) {
  const contract = resolveEndorsementContract(contractRef);
  if (!contract || !contract.shoe || typeof contract.shoe !== 'object') return null;
  const base = contract.shoe;
  const derived = buildSignatureShoeBoosts(contract, base);
  let image = String(base.image || '').trim();
  if (!image) image = buildSignatureShoeFallbackImage(contract, { ...base, ...derived });
  return { ...base, ...derived, image, contractId: String(contract.id), brand: String(contract.brand || ''), product: String(contract.product || '签名鞋'), updatedAt: parseNum(base.updatedAt, Date.now()) };
}
function getSignatureShoeUpgradeStatus(contractRef, shoeRef = null) {
  const contract = resolveEndorsementContract(contractRef);
  const shoe = shoeRef && typeof shoeRef === 'object' ? shoeRef : getSignatureShoeCurrentState(contract);
  const currentLevel = clamp(parseNum(shoe?.level, 0), 0, 5);
  if (!contract || !shoe) {
    return { currentLevel, maxLevel: 5, canUpgrade: false, reasons: ['未创建签名鞋'], targetText: '先创建签名鞋', nextRule: getSignatureShoeUpgradeRule(1), nextLevel: 1 };
  }
  if (currentLevel >= 5) {
    return { currentLevel, maxLevel: 5, canUpgrade: false, reasons: ['已满级'], targetText: '已满级', nextRule: null, nextLevel: 5 };
  }
  const nextLevel = currentLevel + 1;
  const nextRule = getSignatureShoeUpgradeRule(nextLevel);
  const fame = clamp(parseNum(G.player?.fame, 0), 0, 1000);
  const honor = clamp(parseNum(typeof getPlayerEndorsementHonorScore === 'function' ? getPlayerEndorsementHonorScore() : 0, 0), 0, 1000);
  const earned = clamp(parseNum(contract?.earned, 0), 0, 1000);
  const daysActive = Math.max(0, parseNum(G.dayNum, 0) - parseNum(contract?.signedDay, parseNum(G.dayNum, 0)));
  const reasons = [];
  if (fame < parseNum(nextRule.fame, 0)) reasons.push(`声望 ${parseNum(nextRule.fame, 0)}`);
  if (honor < parseNum(nextRule.honor, 0)) reasons.push(`荣誉 ${parseNum(nextRule.honor, 0)}`);
  if (earned < parseNum(nextRule.earned, 0)) reasons.push(`累计分成 ${formatSignatureShoeMoney(nextRule.earned)}`);
  if (daysActive < parseNum(nextRule.days, 0)) reasons.push(`签约满 ${parseNum(nextRule.days, 0)} 天`);
  const targetText = `声望 ${parseNum(nextRule.fame, 0)} / 荣誉 ${parseNum(nextRule.honor, 0)} / 累计分成 ${formatSignatureShoeMoney(nextRule.earned)} / 合约满 ${parseNum(nextRule.days, 0)} 天`;
  const nextRevenue = calculateSignatureShoeIncome(contract, { ...shoe, level: nextLevel, pointsBudget: getSignatureShoeBudgetForLevel(nextLevel), allocations: shoe.allocations });
  return { currentLevel, maxLevel: 5, nextLevel, nextRule, canUpgrade: reasons.length === 0, reasons, targetText, nextRevenue, fame, honor, earned, daysActive, pointsBudget: parseNum(shoe?.pointsBudget, getSignatureShoeBudgetForLevel(currentLevel)), remainingPoints: parseNum(shoe?.remainingPoints, 0) };
}
function postSignatureShoeBuzz(contract, shoe, action, detail = '') {
  if (typeof emitPurchaseSocialBuzz !== 'function') return [];
  const actionText = String(action || '').trim();
  const eventType = actionText.includes('代言拒绝')
    ? 'endorsement_reject'
    : actionText.includes('代言签约')
      ? 'endorsement_sign'
      : 'signature_shoe';
  const displayLabel = eventType === 'signature_shoe'
    ? `${String(contract?.brand || '').trim()} 签名鞋`
    : `${String(contract?.brand || '').trim()} ${String(contract?.product || '').trim()}`.trim();
  const payload = {
    label: `${contract?.brand || '品牌'} ${shoe?.name || contract?.product || '签名鞋'}`.trim(),
    brand: String(contract?.brand || '').trim(),
    product: eventType === 'signature_shoe' ? '签名鞋' : String(contract?.product || '').trim(),
    categoryKey: String(contract?.categoryKey || '').trim(),
    logo: typeof buildCommercialBrandLogo === 'function'
      ? buildCommercialBrandLogo({
          brand: String(contract?.brand || '').trim(),
          product: eventType === 'signature_shoe' ? '签名鞋' : String(contract?.product || '').trim(),
          categoryKey: String(contract?.categoryKey || '').trim(),
          category: String(contract?.category || '').trim(),
          kind: String(contract?.kind || contract?.categoryKey || '').trim()
        })
      : String(contract?.logo || shoe?.logo || '').trim(),
    tag: eventType === 'signature_shoe' ? '签名鞋' : actionText,
    type: eventType,
    displayLabel,
    detail: String(detail || `${action} · ${shoe?.styleLabel || ''} · L${parseNum(shoe?.level, 1)} · ${shoe?.summary || ''}`).trim(),
    image: String(shoe?.image || '').trim(),
    imageStatus: String(shoe?.imageStatus || '').trim(),
    playerName: String(G.player?.name || '球员').trim()
  };
  return emitPurchaseSocialBuzz(payload, '签名鞋', { action, contractId: contract?.id, level: parseNum(shoe?.level, 1), day: parseNum(G.dayNum, 0), season: parseNum(G.season, 1), year: parseNum(G.year, 2025), image: String(shoe?.image || '').trim(), detail: payload.detail });
}
function commitSignatureShoeState(contractRef, updates = {}) {
  const contract = resolveEndorsementContract(contractRef);
  if (!contract) return { ok: false, reason: 'missing_contract', message: '未找到对应代言' };
  const current = contract.shoe && typeof contract.shoe === 'object' ? contract.shoe : null;
  if (!current && contract.shoeEligible === false) return { ok: false, reason: 'ineligible', message: '这份代言还不能创建签名鞋' };
  const now = Date.now();
  const styleKey = normalizeSignatureShoeStyle(updates.styleKey ?? current?.styleKey ?? contract.shoeStyle ?? 'allaround');
  const level = clamp(parseNum(updates.level ?? current?.level ?? 1, 1), 1, 5);
  const pointsBudget = Math.max(getSignatureShoeBudgetForLevel(level), parseNum(updates.pointsBudget ?? current?.pointsBudget ?? 0, 0));
  const allocations = normalizeSignatureShoeAllocations(updates.allocations ?? current?.allocations ?? null, styleKey, pointsBudget);
  const derived = buildSignatureShoeBoosts(contract, { styleKey, level, pointsBudget, allocations, shoe: current || {} });
  const name = sanitizeSignatureShoeName(updates.name ?? current?.name ?? `${contract.brand} 签名鞋`, `${contract.brand} 签名鞋`);
  let image = typeof updates.image === 'string' ? updates.image.trim() : String(current?.image || '').trim();
  const imagePrompt = typeof updates.imagePrompt === 'string' ? updates.imagePrompt : String(current?.imagePrompt || '').trim();
  if (!image) {
    image = buildSignatureShoeFallbackImage(contract, { ...current, ...derived, name, styleKey, level, pointsBudget: derived.pointsBudget, allocations: derived.allocations });
  }
  const shoe = { ...(current || {}), contractId: String(contract.id), brand: String(contract.brand || ''), product: String(contract.product || '签名鞋'), name, styleKey, styleLabel: derived.styleLabel, level, pointsBudget: derived.pointsBudget, allocations: derived.allocations, boosts: derived.boosts, summary: derived.summary, pointsUsed: derived.pointsUsed, remainingPoints: derived.remainingPoints, dailyIncome: derived.revenue.dailyIncome, gameIncome: derived.revenue.gameIncome, revenueRate: derived.revenue.revenueRate, image, imagePrompt, imageModel: String(updates.imageModel || current?.imageModel || '').trim(), imageStatus: String(updates.imageStatus || current?.imageStatus || (image ? 'ready' : 'fallback')).trim(), imageUpdatedAt: parseNum(updates.imageUpdatedAt, current?.imageUpdatedAt || now) || now, createdAt: parseNum(current?.createdAt, now) || now, updatedAt: now };
  contract.shoe = shoe;
  contract.shoeStyle = shoe.styleKey;
  syncSignatureShoePointer(getEndorsementState());
  return { ok: true, contract, shoe, derived };
}
function updateSignatureShoeProject(contractRef, updates = {}, options = {}) {
  const res = commitSignatureShoeState(contractRef, updates);
  if (!res.ok) return res;
  if (options.phoneMessage && options.phone !== false) addPhone('商业中心', options.phoneMessage, 'info');
  if (options.logMessage && options.log !== false) addEconomyLog(options.logMessage, options.logType || 'pos');
  if (options.action && options.buzz !== false) postSignatureShoeBuzz(res.contract, res.shoe, options.action, options.detail || '');
  return res;
}
function adjustSignatureShoeAllocation(contractRef, slotKey, delta = 1) {
  const contract = resolveEndorsementContract(contractRef);
  if (!contract || !contract.shoe) return { ok: false, reason: 'missing', message: '请先创建签名鞋' };
  if (!SIGNATURE_SHOE_SLOT_KEYS.includes(String(slotKey))) return { ok: false, reason: 'slot', message: '属性槽位无效' };
  const shoe = getSignatureShoeCurrentState(contract);
  if (!shoe) return { ok: false, reason: 'missing', message: '请先创建签名鞋' };
  const next = { ...(shoe.allocations || {}) };
  const current = parseNum(next[slotKey], 0);
  const step = Math.trunc(parseNum(delta, 0));
  if (step === 0) return { ok: false, reason: 'noop', message: '没有变化' };
  if (step > 0) {
    if (shoe.remainingPoints < step) return { ok: false, reason: 'budget', message: '剩余点数不足' };
    next[slotKey] = current + step;
  } else {
    if (current + step < 0) return { ok: false, reason: 'underflow', message: '该属性不能再减' };
    next[slotKey] = current + step;
  }
  const res = updateSignatureShoeProject(contract, { allocations: next }, { buzz: false, phone: false, log: false });
  if (!res.ok) return res;
  return { ok: true, contract: res.contract, shoe: res.shoe, message: `已调整 ${SIGNATURE_SHOE_EFFECT_LABELS[slotKey] || slotKey} ${step > 0 ? '+' : ''}${step}，剩余 ${parseNum(res.shoe.remainingPoints, 0)} 点` };
}
function setSignatureShoeStyle(contractRef, styleKey) {
  const contract = resolveEndorsementContract(contractRef);
  if (!contract || !contract.shoe) return { ok: false, reason: 'missing', message: '请先创建签名鞋' };
  const res = updateSignatureShoeProject(contract, { styleKey: normalizeSignatureShoeStyle(styleKey) }, { buzz: false, phone: false, log: false });
  if (!res.ok) return res;
  return { ok: true, contract: res.contract, shoe: res.shoe, message: `已切换风格：${res.shoe.styleLabel}` };
}
function renameSignatureShoe(contractRef, name) {
  const contract = resolveEndorsementContract(contractRef);
  if (!contract || !contract.shoe) return { ok: false, reason: 'missing', message: '请先创建签名鞋' };
  const nextName = sanitizeSignatureShoeName(name, contract.shoe.name || `${contract.brand} 签名鞋`);
  const res = updateSignatureShoeProject(contract, { name: nextName }, { buzz: false, phone: false, log: false });
  if (!res.ok) return res;
  return { ok: true, contract: res.contract, shoe: res.shoe, message: `已改名为：${res.shoe.name}` };
}
async function generateSignatureShoeImageForOffer(contractRef) {
  const contract = resolveEndorsementContract(contractRef);
  if (!contract || !contract.shoe) return { ok: false, reason: 'missing', message: '请先创建签名鞋' };
  const shoe = getSignatureShoeCurrentState(contract);
  if (!shoe) return { ok: false, reason: 'missing', message: '请先创建签名鞋' };
  const image = buildSignatureShoeFallbackImage(contract, shoe);
  const res = updateSignatureShoeProject(contract, {
    image,
    imageStatus: 'fallback',
    imageUpdatedAt: Date.now()
  }, {
    action: '签名鞋生图',
    detail: `已生成本地样图：${shoe.name}`,
    phoneMessage: `签名鞋 ${shoe.name} 图片已生成`,
    logMessage: `签名鞋图片生成 ${shoe.name} [SVG]`,
    buzz: true
  });
  if (!res.ok) return res;
  return { ok: true, contract: res.contract, shoe: res.shoe, image: res.shoe.image, message: `签名鞋图片已生成：${res.shoe.name}` };
}
function upgradeSignatureShoeContract(contractRef) {
  const contract = resolveEndorsementContract(contractRef);
  if (!contract || !contract.shoe) return { ok: false, reason: 'missing', message: '请先创建签名鞋' };
  const shoe = getSignatureShoeCurrentState(contract);
  const status = getSignatureShoeUpgradeStatus(contract, shoe);
  if (!status.canUpgrade || !status.nextRule) {
    return { ok: false, reason: 'locked', message: status.reasons && status.reasons.length ? `暂时不能升级：${status.reasons.join(' / ')}` : '暂时不能升级' };
  }
  const nextLevel = status.nextRule.level;
  const newBudget = getSignatureShoeBudgetForLevel(nextLevel);
  const res = updateSignatureShoeProject(contract, {
    level: nextLevel,
    pointsBudget: newBudget,
    allocations: shoe.allocations
  }, {
    action: '签名鞋升级',
    detail: `升级到 L${nextLevel}，新增 ${parseNum(status.nextRule.extraPoints, 0)} 点待分配`,
    phoneMessage: `签名鞋 ${shoe.name} 已升级到 L${nextLevel}，新增 ${parseNum(status.nextRule.extraPoints, 0)} 点待分配。`,
    logMessage: `签名鞋升级 ${shoe.name} -> L${nextLevel}`,
    buzz: true
  });
  if (!res.ok) return res;
  return { ok: true, contract: res.contract, shoe: res.shoe, message: `已升级到 L${nextLevel}，新增 ${parseNum(status.nextRule.extraPoints, 0)} 点待分配` };
}
function createSignatureShoeForOffer(offerId, styleKey = '', options = {}) {
  const contract = resolveEndorsementContract(offerId);
  if (!contract) return { ok: false, reason: 'missing', message: '请先签下一份鞋类代言' };
  if (contract.shoe && typeof contract.shoe === 'object') return { ok: true, contract, shoe: getSignatureShoeCurrentState(contract), message: '签名鞋已经存在' };
  if (!contract.shoeEligible) return { ok: false, reason: 'ineligible', message: '这份代言不能创建签名鞋' };
  const nextStyle = normalizeSignatureShoeStyle(styleKey || contract.shoeStyle || 'allaround');
  const shoeName = sanitizeSignatureShoeName(options?.name || `${contract.brand} 签名鞋`, `${contract.brand} 签名鞋`);
  const extraUpdates = options && typeof options === 'object' && options.allocations && typeof options.allocations === 'object'
    ? { allocations: options.allocations }
    : {};
  const res = updateSignatureShoeProject(contract, {
    name: shoeName,
    styleKey: nextStyle,
    level: 1,
    ...extraUpdates
  }, {
    action: '创建签名鞋',
    detail: `${contract.brand} 签名鞋已创建`,
    phoneMessage: `已创建签名鞋：${shoeName}`,
    logMessage: `创建签名鞋 ${shoeName}`,
    buzz: true
  });
  if (!res.ok) return res;
  return { ok: true, contract: res.contract, shoe: res.shoe, message: `已创建签名鞋：${res.shoe.name}` };
}
function settleEndorsementIncome(result) {
  const state = getEndorsementState();
  const day = parseNum(result?.day, G.dayNum);
  if (parseNum(state.lastPayoutDay, -1) === day) return result?.endorsementIncome || null;
  const ecoFx = typeof getEconomyEffects === 'function' ? getEconomyEffects() : { endorsementIncomeMult: 1 };
  const incomeMult = clamp(parseNum(ecoFx?.endorsementIncomeMult, 1), 1, 1.5);
  const nextActive = [];
  const summary = { total: 0, daily: 0, game: 0, shoeDaily: 0, shoeGame: 0, expired: 0, boost: 0 };
  const isGame = !!result?.isGame;
  (Array.isArray(state.active) ? state.active : []).forEach(contract => {
    if (!contract || typeof contract !== 'object') return;
    const daysLeft = parseNum(contract.remainingDays, 0);
    if (daysLeft <= 0) { summary.expired += 1; return; }
    let daily = parseNum(contract.baseDailyIncome, 0);
    let game = isGame ? parseNum(contract.baseGameIncome, 0) : 0;
    if (contract.shoe && typeof contract.shoe === 'object') {
      const shoeView = getSignatureShoeCurrentState(contract);
      if (shoeView) {
        contract.shoe = { ...contract.shoe, ...shoeView, image: shoeView.image || contract.shoe.image || '', updatedAt: Date.now() };
        daily += parseNum(shoeView.dailyIncome, 0);
        game += parseNum(shoeView.gameIncome, 0);
        summary.shoeDaily += parseNum(shoeView.dailyIncome, 0);
        summary.shoeGame += parseNum(shoeView.gameIncome, 0);
      }
    }
    const basePayout = daily + game;
    const payout = +(basePayout * incomeMult).toFixed(3);
    if (payout > 0) {
      contract.earned = +(parseNum(contract.earned, 0) + payout).toFixed(3);
      summary.daily += +(daily * incomeMult).toFixed(3);
      summary.game += +(game * incomeMult).toFixed(3);
      summary.boost += Math.max(0, payout - basePayout);
      summary.total += payout;
    }
    contract.remainingDays = Math.max(0, daysLeft - 1);
    if (contract.remainingDays > 0) nextActive.push(contract);
    else summary.expired += 1;
  });
  state.active = nextActive;
  syncSignatureShoePointer(state);
  state.lastPayoutDay = day;
  if (summary.total > 0) {
    adjustPlayerCash(summary.total, `代言与签名鞋分成 ${parseNum(result?.day, G.dayNum)}`);
    if (result && Array.isArray(result.events)) {
      const parts = [`代言收入 ${formatSignatureShoeMoney(summary.daily)}`];
      if (summary.game > 0) parts.push(`比赛日 ${formatSignatureShoeMoney(summary.game)}`);
      if (summary.shoeDaily > 0 || summary.shoeGame > 0) parts.push(`签名鞋 ${formatSignatureShoeMoney(summary.shoeDaily)} / ${formatSignatureShoeMoney(summary.shoeGame)}`);
      if (summary.boost > 0.001) parts.push(`团队放大 ${formatSignatureShoeMoney(summary.boost)}`);
      result.events.push(`💼 ${parts.join(' | ')}`);
    }
  }
  if (summary.expired > 0 && result && Array.isArray(result.events)) result.events.push(`⌛ ${summary.expired} 份代言合约到期`);
  if (result && typeof result === 'object') result.endorsementIncome = summary;
  return summary;
}
function acceptEndorsementOffer(offerId) {
  const state = getEndorsementState();
  const profile = buildEndorsementProfile();
  const template = ENDORSEMENT_CATALOG.find(x => String(x.id) === String(offerId));
  if (!template) return { ok: false, reason: 'invalid', message: '代言不存在' };
  const maxActiveDeals = Math.max(1, parseNum(profile?.maxActiveDeals, 8));
  if (state.active.length >= maxActiveDeals) return { ok: false, reason: 'cap', message: `最多同时签约 ${maxActiveDeals} 个代言` };
  if (state.active.some(x => String(x.id) === String(offerId))) return { ok: false, reason: 'active', message: '这个代言已经签约了' };
  const offer = evaluateEndorsementOffer(template, profile, state);
  if (offer.status === 'locked') return { ok: false, reason: 'locked', message: `暂时未解锁：${offer.lockReason}` };
  if (offer.status === 'rejected') return { ok: false, reason: 'rejected', message: '这个代言本季已经拒绝过了' };
  if (offer.status === 'active') return { ok: false, reason: 'active', message: '这个代言已经在生效中' };
  const contract = {
    id: offer.id, categoryKey: offer.categoryKey, category: offer.category, brand: offer.brand, product: offer.product,
    tier: offer.tier, kind: offer.kind, signingBonus: offer.signingBonus, baseDailyIncome: offer.dailyIncome,
    baseGameIncome: offer.gameIncome, remainingDays: offer.termDays, earned: 0, shoeEligible: !!offer.shoeEligible,
    logo: typeof buildCommercialBrandLogo === 'function'
      ? buildCommercialBrandLogo({
          brand: offer.brand,
          product: offer.product,
          categoryKey: offer.categoryKey,
          category: offer.category,
          kind: offer.kind
        })
      : String(offer.logo || '').trim(),
    shoe: null, signedSeason: parseNum(G.season, 1), signedDay: parseNum(G.dayNum, 0)
  };
  state.active.unshift(contract);
  delete state.rejected[offer.id];
  adjustPlayerCash(offer.signingBonus, `签约代言 ${offer.brand}`);
  if (typeof addCommercialMomentum === 'function') {
    addCommercialMomentum({
      label: `${offer.brand} 代言`,
      cost: Math.max(0.8, parseNum(offer.signingBonus, 0) * 2.4),
      extra: parseNum(offer.tier, 1) * 1.2,
      source: '代言签约',
      quiet: true
    });
  }
  addPhone('代言经纪人', `已签下 ${offer.brand}（${offer.category}）代言，签约金 $${offer.signingBonus.toFixed(2)}M。`, 'info');
  addEconomyLog(`签约代言 ${offer.brand}（${offer.category}）`, 'pos');
  postSignatureShoeBuzz(contract, {
    name: `${contract.brand} 代言`,
    styleLabel: offer.shoeEligible ? '鞋类代言' : '代言',
    level: 1,
    summary: offer.shoeEligible ? '可在商业中心创建签名鞋' : '代言签约完成',
    image: '',
    imageStatus: '',
    logo: String(offer.logo || '').trim()
  }, '代言签约', `已签下 ${offer.brand}（${offer.category}）`);
  return { ok: true, message: `已签约 ${offer.brand}`, contract };
}
function rejectEndorsementOffer(offerId) {
  const state = getEndorsementState();
  const template = ENDORSEMENT_CATALOG.find(x => String(x.id) === String(offerId));
  if (!template) return { ok: false, reason: 'invalid', message: '代言不存在' };
  state.rejected[template.id] = parseNum(G.season, 1);
  addPhone('代言经纪人', `你拒绝了 ${template.brand} 的代言邀约。`, 'neu');
  addEconomyLog(`拒绝代言 ${template.brand}`, 'neu');
  postSignatureShoeBuzz({
    brand: template.brand,
    product: template.product,
    logo: typeof buildCommercialBrandLogo === 'function'
      ? buildCommercialBrandLogo({
          brand: template.brand,
          product: template.product,
          categoryKey: template.categoryKey,
          category: template.category,
          kind: template.kind
        })
      : template.logo,
    categoryKey: template.categoryKey
  }, {
    name: template.product || template.brand,
    styleLabel: '代言拒绝',
    level: 1,
    summary: template.category || '代言拒绝',
    image: '',
    imageStatus: '',
    logo: typeof buildCommercialBrandLogo === 'function'
      ? buildCommercialBrandLogo({
          brand: template.brand,
          product: template.product,
          categoryKey: template.categoryKey,
          category: template.category,
          kind: template.kind
        })
      : String(template.logo || '').trim()
  }, '代言拒绝', `拒绝了 ${template.brand} 的代言邀约`);
  return { ok: true, message: `已拒绝 ${template.brand}` };
}
