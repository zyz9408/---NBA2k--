// ui.js
// ============ CREATE PAGE UI ============
let createStep = 0;
function renderCreate() {
  const pg = $('createPage');
  if (createStep === 0) {
    pg.innerHTML = `
    <div class="card tc">
      <h1 class="t-gold" style="font-size:32px;margin-bottom:8px">🏀 NBA球员生涯模拟器</h1>
      <p class="t-2 mb-16">创建你的球员，开启传奇生涯</p>
      ${renderLocalFileHint()}
      <div style="max-width:400px;margin:0 auto">
        <div class="form-group" style="text-align:center">
          <label>球员头像</label>
          <div style="position:relative;width:100px;height:100px;margin:8px auto;border-radius:50%;overflow:hidden;border:3px solid var(--gold);background:#1a1a2e;cursor:pointer" onclick="document.getElementById('avatarInput').click()" title="点击上传头像">
            <img id="avatarPreview" src="${G.player.avatar || G.player.photo || ''}" style="width:100%;height:100%;object-fit:cover;display:${(G.player.avatar || G.player.photo) ? 'block' : 'none'}">
            <div id="avatarPlaceholder" style="display:${(G.player.avatar || G.player.photo) ? 'none' : 'flex'};align-items:center;justify-content:center;width:100%;height:100%;font-size:36px;color:var(--gold)">📷</div>
          </div>
          <input type="file" id="avatarInput" accept="image/*" style="display:none" onchange="handleAvatarUpload(this)">
          <div class="t-2 fs-xs">点击上传头像（可选）</div>
        </div>
        <div class="form-group"><label>球员姓名</label>
          <input class="form-control" id="cName" placeholder="输入你的名字" value="${G.player.name}"></div>
        <div class="form-group"><label>开始剧本（年份）</label>
          <select class="form-control" id="cStartYear">
            ${getAvailableScriptYears().map(y => `<option value="${y}" ${y === parseNum(G.startYear, G.year) ? 'selected' : ''}>${y}年</option>`).join('')}
          </select>
        </div>
        <div class="form-group"><label>选择位置</label>
          <select class="form-control" id="cPos">
            ${POS.map(p => `<option value="${p.id}">${p.n} - ${p.z}</option>`).join('')}
          </select></div>
        <button class="btn btn-gold" onclick="createStep1()" style="width:100%">下一步 →</button>
      </div>
    </div>`;
  } else if (createStep === 1) {
    renderBodyType();
  } else if (createStep === 2) {
    renderTemplateSelect();
  } else if (createStep === 3) {
    renderAttrRoll();
  } else if (createStep === 4) {
    renderXFactorReveal();
  } else if (createStep === 5) {
    renderDraftResult();
  }
}

async function createStep1() {
  G.player.name = $('cName').value.trim() || '球员';
  // 头像已在 handleAvatarUpload 中存入 G.player.avatar
  const startYears = getAvailableScriptYears();
  const selectedYear = parseNum($('cStartYear')?.value, G.startYear || G.year || 2025);
  G.startYear = startYears.includes(selectedYear) ? selectedYear : (startYears[0] || selectedYear);
  G.year = G.startYear;
  G.season = 1;
  G.player.pos = +$('cPos').value;
  $('createPage').innerHTML = `
  <div class="card tc">
    <div class="card-title fc" style="justify-content:center">⏳ 载入${G.startYear}年名单</div>
    <div class="t-2">正在读取对应年份的球员与教练数据，请稍候...</div>
  </div>`;
  await loadLeagueData({ startYear: G.startYear, strictRoster: true });
  if (!LEAGUE.loaded) {
    alert(`未能读取 ${G.startYear} 年对应名单。请确认已选择项目根目录（包含 APK/resources/res/raw）。`);
  }
  createStep = 1; renderCreate();
}

function handleAvatarUpload(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function (e) {
    const img = new Image();
    img.onload = function () {
      // 缩放到128x128，减少存档大小
      const canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 128;
      const ctx = canvas.getContext('2d');
      // 居中裁切
      const size = Math.min(img.width, img.height);
      const sx = (img.width - size) / 2;
      const sy = (img.height - size) / 2;
      ctx.drawImage(img, sx, sy, size, size, 0, 0, 128, 128);
      G.player.avatar = canvas.toDataURL('image/jpeg', 0.8);
      G.player.photo = G.player.avatar;
      // 更新预览
      const preview = $('avatarPreview');
      const placeholder = $('avatarPlaceholder');
      if (preview) { preview.src = G.player.avatar; preview.style.display = 'block'; }
      if (placeholder) placeholder.style.display = 'none';
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function renderBodyType() {
  $('createPage').innerHTML = `
  <div class="card"><div class="card-title">📏 选择体型</div>
    <div class="grid g5" id="bodyGrid">
      ${BODY_TYPES.map(b => `
        <div class="choice-card" onclick="selectBody('${b.id}')">
          <div class="fs-lg fw-b">${b.n}</div>
          <div class="t-2 fs-sm mt-12">${b.d}</div>
          <div class="t-2 fs-sm mt-12">身高: ${b.hRange[0]}-${b.hRange[1]}cm</div>
          <div class="t-2 fs-sm">体重: ${b.wRange[0]}-${b.wRange[1]}kg</div>
          <div class="mt-12">${Object.entries(b.boost).map(([k, v]) => `<span class="tag tag-gold">+${v} ${ATTRS.find(a => a.k === k)?.n || k}</span>`).join('')}</div>
          <div>${Object.entries(b.nerf).map(([k, v]) => `<span class="tag" style="background:var(--danger)">${v} ${ATTRS.find(a => a.k === k)?.n || k}</span>`).join('')}</div>
        </div>`).join('')}
    </div>
  </div>`;
}

function selectBody(id) {
  const bt = BODY_TYPES.find(b => b.id === id);
  G.player.bodyType = id;
  G.player.height = rng(bt.hRange[0], bt.hRange[1]);
  G.player.weight = rng(bt.wRange[0], bt.wRange[1]);
  G.player.wingspan = G.player.height + bt.wsBonus + rng(-3, 5);
  createStep = 2; renderCreate();
}

function renderTemplateSelect() {
  const pos = getPos(G.player.pos);
  const templates = getTemplatesForPos(G.player.pos);
  $('createPage').innerHTML = `
  <div class="card"><div class="card-title">🎯 选择模版${pos ? ` (${pos.n} ${pos.z})` : ''}</div>
    <div class="grid g3" id="tplGrid">
      ${templates.map(t => `
        <div class="choice-card" onclick="selectTemplate('${t.id}')">
          <div class="fs-lg fw-b">${t.n}</div>
          <div class="t-2 fs-sm">${t.z}</div>
          <div class="t-2 fs-sm mt-12">${t.d}</div>
          <div class="mt-12">${Object.entries(t.boost).map(([k, v]) => `<span class="tag tag-gold">+${v} ${ATTRS.find(a => a.k === k)?.n || k}</span>`).join('')}</div>
          <div>${Object.entries(t.nerf).map(([k, v]) => `<span class="tag" style="background:var(--danger)">${v} ${ATTRS.find(a => a.k === k)?.n || k}</span>`).join('')}</div>
        </div>`).join('')}
    </div>
  </div>`;
}

function selectTemplate(id) {
  G.player.template = id;
  G.player.attrs = rollAttrs();
  G.player.potential = rollPotential();
  G.player.tendencies = rollTendencies();
  createStep = 3; renderCreate();
}

function renderAttrRoll() {
  const a = G.player.attrs;
  $('createPage').innerHTML = `
  <div class="card"><div class="card-title">🎲 天赋抽取 (无限重抽)</div>
    <div class="grid g2">
      <div>
        <div class="stat-box mb-16"><div class="stat-val t-gold">${ovr(a)}</div><div class="stat-lbl">综合评分 OVR</div></div>
        <div class="stat-box"><div class="stat-val t-cyan">${G.player.potential}</div><div class="stat-lbl">潜力 POT</div></div>
        <div class="mt-16 tc">
          <button class="btn btn-gold" onclick="doReroll()">🎲 重新抽取</button>
          <button class="btn btn-ok mt-12" onclick="confirmAttrs()" style="width:100%">✓ 确认属性</button>
        </div>
      </div>
      <div>
        ${ATTRS.map(at => `
          <div class="flex fb" style="margin-bottom:8px">
            <span class="fs-sm" style="width:50px">${at.n}</span>
            <div class="bar" style="flex:1;margin:0 8px"><div class="bar-fill ${barClass(a[at.k])}" style="width:${a[at.k]}%"></div></div>
            <span class="fw-b" style="width:30px;text-align:right">${a[at.k]}</span>
          </div>`).join('')}
      </div>
    </div>
  </div>`;
}

function doReroll() {
  G.player.attrs = rollAttrs();
  G.player.potential = rollPotential();
  G.player.tendencies = rollTendencies();
  renderCreate();
}

function confirmAttrs() {
  G.player.xfactor = pick(XFACTORS).id;
  createStep = 4; renderCreate();
}

function renderXFactorReveal() {
  const xf = getXFactor(G.player.xfactor) || { icon: '❔', n: '未知天赋', d: '该天赋未能正确加载' };
  $('createPage').innerHTML = `
  <div class="card tc">
    <div class="card-title fc" style="justify-content:center">✨ X-Factor 天赋揭晓</div>
    <div class="xfactor-card" style="max-width:400px;margin:20px auto">
      <div style="font-size:64px">${xf.icon}</div>
      <div class="fs-lg fw-b t-purple mt-12">${xf.n}</div>
      <div class="t-2 mt-12">${xf.d}</div>
    </div>
    <button class="btn btn-gold mt-16" onclick="gotoDraft()">进入选秀 →</button>
  </div>`;
}

async function gotoDraft() {
  $('createPage').innerHTML = `
  <div class="card tc">
    <div class="card-title fc" style="justify-content:center">🧾 生成选秀报告</div>
    <div class="t-2">正在模拟选秀并生成球探报道，请稍候...</div>
  </div>`;
  assignToDraft();
  if (typeof generateDraftScoutingReport === 'function') {
    try { await generateDraftScoutingReport({ force: true }); } catch (e) { }
  }
  createStep = 5; renderCreate();
}

function renderDraftResult() {
  const t = G.team;
  const board = G.draftBoard;
  const scout = G.draftScoutingReport || null;
  const allResults = Array.isArray(board?.results) ? board.results : [];
  const tierText = board ? (board.tier === 'big' ? '大年' : board.tier === 'weak' ? '小年' : '正常年') : '';
  $('createPage').innerHTML = `
  <div class="card tc">
    <div class="card-title fc" style="justify-content:center">🎉 选秀结果</div>
    <div class="team-logo" style="width:80px;height:80px;font-size:20px;background:${t.cl};margin:16px auto">${teamLogoMarkup(t, 80)}</div>
    <div class="fs-lg fw-b mt-12">${board?.year || G.year}年NBA选秀</div>
    <div class="t-gold" style="font-size:36px;font-weight:900;margin:12px 0">第${G.draftPick}顺位</div>
    <div class="fs-lg">${t.z} ${t.n}</div>
    <div class="t-2 mt-12">${G.player.name} | ${getPos(G.player.pos).n} | OVR ${ovr(G.player.attrs)}</div>
    <div class="t-2 fs-sm mt-12">合同: ${G.player.contractYears}年 / $${formatSalaryM(G.player.salary)}M</div>
    ${board ? `<div class="t-2 fs-sm mt-12">同届: ${board.classSize || allResults.length}人竞争 (${tierText})</div>` : ''}
    ${scout ? `
      <div class="card mt-16" style="text-align:left;background:rgba(0,0,0,.18)">
        <div class="card-title">🧾 球探报道</div>
        <div class="fw-b" style="font-size:15px;color:var(--gold);margin-bottom:8px">${scout.title || '球队球探报告'}</div>
        <div class="t-2" style="line-height:1.7;margin-bottom:14px;padding:10px 12px;background:rgba(255,255,255,.04);border-radius:6px">${scout.summary || ''}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px">
          <div style="padding:10px 12px;background:rgba(40,167,69,.12);border-radius:8px;border:1px solid rgba(40,167,69,.3)">
            <div class="fw-b" style="color:#28a745;margin-bottom:6px">💪 优势</div>
            ${Array.isArray(scout.strengths) ? scout.strengths.map(s => `<div style="padding:4px 0;font-size:13px">• ${s}</div>`).join('') : '<div class="t-2">-</div>'}
          </div>
          <div style="padding:10px 12px;background:rgba(220,53,69,.12);border-radius:8px;border:1px solid rgba(220,53,69,.3)">
            <div class="fw-b" style="color:#dc3545;margin-bottom:6px">⚠️ 风险</div>
            ${Array.isArray(scout.weaknesses) ? scout.weaknesses.map(w => `<div style="padding:4px 0;font-size:13px">• ${w}</div>`).join('') : '<div class="t-2">-</div>'}
          </div>
        </div>
        ${scout.projection ? `<div style="padding:10px 12px;background:rgba(253,185,39,.08);border-radius:6px;border-left:3px solid var(--gold);margin-bottom:10px"><span class="fw-b" style="color:var(--gold)">📈 前景预测：</span><span class="t-2">${scout.projection}</span></div>` : ''}
        ${scout.comparable ? `<div style="padding:10px 12px;background:rgba(23,162,184,.08);border-radius:6px;border-left:3px solid var(--cyan)"><span class="fw-b" style="color:var(--cyan)">🔄 球员模版：</span><span class="t-2">${scout.comparable}</span></div>` : ''}
      </div>
    ` : ''}
    ${allResults.length ? `
      <div class="tbl mt-16" style="text-align:left;max-height:360px;overflow-y:auto">
        <table>
          <thead><tr><th>顺位</th><th>球队</th><th>球员</th><th>位置</th><th>OVR</th><th>POT</th></tr></thead>
          <tbody>
            ${allResults.map(r => `<tr class="${r.user ? 'hl-row' : ''}"><td>${r.pick}</td><td>${r.team || '--'}</td><td>${r.user ? `⭐ ${r.name}` : r.name}</td><td>${r.pos}</td><td>${r.rating}</td><td>${r.potential}</td></tr>`).join('')}
          </tbody>
        </table>
      </div>
    `: ''}
    <button class="btn btn-gold mt-16" onclick="startCareer()" style="font-size:18px;padding:14px 40px">开始生涯 🏀</button>
  </div>`;
}

function startCareer() {
  G.phase = 'season';
  G.offseasonStage = 0;
  G.offseasonSummary = [];
  G._pendingRegularSeasonAwardsModal = false;
  if (!Array.isArray(G.awards)) G.awards = [];
  if (!Array.isArray(G.allAwards)) G.allAwards = [];
  if (!Array.isArray(G.leagueAwards)) G.leagueAwards = [];
  if (!Array.isArray(G.hallOfFame)) G.hallOfFame = [];
  if (!Number.isFinite(parseNum(G.hallOfFameThreshold, 0)) || parseNum(G.hallOfFameThreshold, 0) <= 0) G.hallOfFameThreshold = 120;
  G._phoneTab = 'feed';
  if (typeof ensureEconomyState === 'function') ensureEconomyState();
  if (typeof ensureSocialState === 'function') ensureSocialState();
  if (typeof applySeasonSalaryPayout === 'function') applySeasonSalaryPayout({ force: false, reason: '新秀赛季薪资发放' });
  if (typeof recalcPlayerTradeValue === 'function') recalcPlayerTradeValue();
  if (typeof ensureLeagueBadges === 'function') ensureLeagueBadges();
  if (typeof enforceLeagueRosterCap === 'function') enforceLeagueRosterCap(15);
  if (typeof enforceLeagueRosterCap === 'function') enforceLeagueRosterCap(15);

  // Fix: Ensure CPU rookies (from the current start year's draft class) are assigned to teams
  // The user reported that drafted players were missing from the NBA at start.
  if (typeof injectSeasonRookies === 'function') {
    // We execute this asynchronously but it modifies LEAGUE state which generateSchedule uses?
    // Actually generateSchedule uses TEAMS. injectSeasonRookies pushes to LEAGUE.teams.players.
    // We should await it if possible, but startCareer is sync.
    // injectSeasonRookies is async in definition.
    // We should make startCareer async or handle the promise.
    // Since UI calls startCareer() via onclick, making it async is fine.
    injectSeasonRookies().then(() => {
      generateSchedule();
      $('mainNav').style.display = 'flex';
      $('createPage').classList.remove('active');
      $('homePage').classList.add('active');
      updateHeader();
      renderHome();
      addNews(`🌟 ${G.player.name}在${G.startYear}年剧本中正式加入${G.team.z}，NBA生涯开始！`, 'pos');
      const coach = getTeamCoach(G.teamId);
      addPhone(coach ? coach.name : "教练", `欢迎加入${G.team.z}！期待你的表现。`, 'info');
    });
    return; // Defer rest of function
  }

  generateSchedule();
  $('mainNav').style.display = 'flex';
  $('createPage').classList.remove('active');
  $('homePage').classList.add('active');
  updateHeader();
  renderHome();
  addNews(`🌟 ${G.player.name}在${G.startYear}年剧本中正式加入${G.team.z}，NBA生涯开始！`, 'pos');
  const coach = getTeamCoach(G.teamId);
  addPhone(coach ? coach.name : "教练", `欢迎加入${G.team.z}！期待你的表现。`, 'info');
}

function updateHeader() {
  $('hdrSeason').textContent = `赛季: ${G.year}-${G.year + 1} (第${G.season}赛季)`;
  $('hdrTeam').textContent = `球队: ${G.team ? G.team.z : '--'}`;
  const effA = typeof getEffectivePlayerAttrs === 'function' ? getEffectivePlayerAttrs(G.player) : G.player.attrs;
  const baseOvr = ovr(G.player.attrs);
  const effOvr = ovr(effA);
  const ovrBonus = effOvr - baseOvr;
  $('hdrOvr').textContent = `OVR: ${baseOvr}${ovrBonus > 0 ? '(+' + ovrBonus + ')' : ''}`;
}

// ============ HOME PAGE ============
function renderHome() {
  const p = G.player, s = G.seasonStats, gp = Math.max(s.gp, 1);
  const xf = getXFactor(p.xfactor) || { icon: '❔', n: '未知天赋' };
  const tpl = getTemplate(p.template, p.pos);
  $('homePage').innerHTML = `
  <div class="grid g2">
    <div class="card">
      <div class="card-title">👤 ${p.name}</div>
      <div class="flex gap-16">
        ${p.avatar ? `<div style="flex-shrink:0"><img src="${p.avatar}" style="width:80px;height:80px;border-radius:50%;object-fit:cover;border:3px solid var(--gold)"></div>` : ''}
        <div class="hex-container"><canvas id="hexChart" class="hex-canvas"></canvas></div>
        <div style="flex:1">
          <div class="flex fb mb-16"><span class="t-2">位置</span><span class="fw-b">${getPos(p.pos).n} ${getPos(p.pos).z}</span></div>
          <div class="flex fb mb-16"><span class="t-2">年龄</span><span>${p.age}岁</span></div>
          <div class="flex fb mb-16"><span class="t-2">身高/体重</span><span>${p.height}cm / ${p.weight}kg</span></div>
          <div class="flex fb mb-16"><span class="t-2">臂展</span><span>${p.wingspan}cm</span></div>
          <div class="flex fb mb-16"><span class="t-2">模版</span><span>${tpl ? tpl.n : '-'}</span></div>
          <div class="flex fb mb-16"><span class="t-2">X-Factor</span><span class="t-purple">${xf.icon} ${xf.n}</span></div>
          <div class="flex fb mb-16"><span class="t-2">合同</span><span>${p.contractYears}年 / $${formatSalaryM(p.salary)}M</span></div>
          <div class="flex fb mb-16"><span class="t-2">现金</span><span class="t-gold">$${parseNum(p.cash, 0).toFixed(2)}M</span></div>
          <div class="flex fb"><span class="t-2">XP</span><span class="t-gold">${p.xp}</span></div>
        </div>
      </div>
    </div>
    <div>
      <div class="card">
        <div class="card-title">📊 赛季数据 (${s.gp}场)</div>
        <div class="grid g3">
          <div class="stat-box"><div class="stat-val">${(s.pts / gp).toFixed(1)}</div><div class="stat-lbl">得分</div></div>
          <div class="stat-box"><div class="stat-val">${(s.ast / gp).toFixed(1)}</div><div class="stat-lbl">助攻</div></div>
          <div class="stat-box"><div class="stat-val">${(s.reb / gp).toFixed(1)}</div><div class="stat-lbl">篮板</div></div>
          <div class="stat-box"><div class="stat-val">${(s.stl / gp).toFixed(1)}</div><div class="stat-lbl">抢断</div></div>
          <div class="stat-box"><div class="stat-val">${(s.blk / gp).toFixed(1)}</div><div class="stat-lbl">盖帽</div></div>
          <div class="stat-box"><div class="stat-val">${s.wins}-${s.losses}</div><div class="stat-lbl">战绩</div></div>
        </div>
      </div>
      <div class="card">
        <div class="card-title">状态</div>
        <div class="mb-16"><span class="t-2 fs-sm">体力</span>
          <div class="stamina-bar mt-12"><div class="stamina-fill" style="width:${p.stamina}%"></div></div>
          <div class="t-2 fs-sm tc">${p.stamina}%</div>
        </div>
        <div class="flex fb fs-sm"><span class="t-2">心情</span><span>${p.mood > 70 ? '😊 良好' : p.mood > 40 ? '😐 一般' : '😞 低落'}</span></div>
        <div class="flex fb fs-sm mt-12"><span class="t-2">声望</span><span>${p.fame}</span></div>
        <div class="flex fb fs-sm mt-12"><span class="t-2">信任</span><span>${p.trust}</span></div>
        ${p.injury.active ? `<div class="mt-12" style="color:var(--danger)">🩹 ${p.injury.type} (缺阵${p.injury.games}场)</div>` : ''}
      </div>
    </div>
  </div>
  <div class="card">
    <div class="card-title">📰 新闻</div>
    <div class="news-ticker">${G.news.slice(0, 10).map(n => `<div class="news-item">${n.text}</div>`).join('') || '<div class="t-2 tc">暂无新闻</div>'}</div>
  </div>`;
  const effAttrs = typeof getEffectivePlayerAttrs === 'function' ? getEffectivePlayerAttrs(p) : p.attrs;
  setTimeout(() => drawHexChart('hexChart', effAttrs), 50);
}

function findResultGameDetail(r) {
  if (!r) return null;
  if (r.gameId && typeof getLeagueGameDetailById === 'function') {
    const byId = getLeagueGameDetailById(r.gameId);
    if (byId) return byId;
  }
  if (typeof findLeagueGameDetail !== 'function') return null;
  const round = parseNum(r.game, 0);
  const teamId = parseNum(r.teamId, G.teamId);
  const oppId = parseNum(r.opp, 0);
  const season = parseNum(r.season, G.season);
  return findLeagueGameDetail({ round, teamId, oppId, season }) || findLeagueGameDetail({ round, teamId, oppId });
}
function teamWinForGame(game, teamId) {
  if (!game || !teamId) return false;
  if (parseNum(game.homeTeamId, 0) === parseNum(teamId, 0)) return parseNum(game.homeScore, 0) > parseNum(game.awayScore, 0);
  if (parseNum(game.awayTeamId, 0) === parseNum(teamId, 0)) return parseNum(game.awayScore, 0) > parseNum(game.homeScore, 0);
  return false;
}
function gameDetailNameCell(row) {
  if (!row) return '-';
  if (row.isSelf) {
    return `<button class="player-link" onclick="showMyPlayerModal()">${row.name}</button> <span class="badge b-gold">你</span>`;
  }
  const pid = String(row.playerId ?? '');
  if (!pid || pid === '0') {
    return `<span>${row.name}</span>`;
  }
  return `<button class="player-link" onclick="showTeamPlayerModal(${parseNum(row.teamId, 0)},'${pid}')">${row.name}</button>`;
}
function renderGameDetailRows(rows) {
  if (!Array.isArray(rows) || !rows.length) {
    return '<tr><td colspan="11" class="t-2">暂无球员数据</td></tr>';
  }
  return rows.map((row, i) => {
    const dnp = !!row.status;
    const fg = `${parseNum(row.fgm, 0)}/${parseNum(row.fga, 0)}`;
    const tp = `${parseNum(row.tpm, 0)}/${parseNum(row.tpa, 0)}`;
    const ft = `${parseNum(row.ftm, 0)}/${parseNum(row.fta, 0)}`;
    return `<tr class="${row.isSelf ? 'self-row' : ''}">
    <td>${i + 1}</td>
    <td>${gameDetailNameCell(row)}</td>
    <td>${posLabel(row.pos)}${parseNum(row.pos2, 0) ? `/${posLabel(row.pos2)}` : ''}</td>
    <td>${dnp ? row.status : parseNum(row.mins, 0)}</td>
    <td>${dnp ? '-' : parseNum(row.pts, 0)}</td>
    <td>${dnp ? '-' : parseNum(row.reb, 0)}</td>
    <td>${dnp ? '-' : parseNum(row.ast, 0)}</td>
    <td>${dnp ? '-' : parseNum(row.stl, 0)}</td>
    <td>${dnp ? '-' : parseNum(row.blk, 0)}</td>
    <td>${dnp ? '-' : parseNum(row.tov, 0)}</td>
    <td>${dnp ? '-' : `${fg} | ${tp} | ${ft}`}</td>
  </tr>`;
  }).join('');
}
function showLeagueGameDetailModal(gameId) {
  if (typeof getLeagueGameDetailById !== 'function') return;
  const game = getLeagueGameDetailById(gameId);
  if (!game) return;
  const home = getTeam(game.homeTeamId) || {};
  const away = getTeam(game.awayTeamId) || {};
  const homeRows = Array.isArray(game.homeRows) ? game.homeRows : [];
  const awayRows = Array.isArray(game.awayRows) ? game.awayRows : [];
  const homeWin = parseNum(game.homeScore, 0) > parseNum(game.awayScore, 0);
  showModal(`
    <div class="game-detail-wrap">
    <div class="modal-hd">
      <h3>比赛详情 | 第${parseNum(game.round, 0)}轮 ${parseNum(game.year, G.year)}赛季</h3>
      <button class="modal-x" onclick="hideModal()">✕</button>
    </div>
    <div class="card game-detail-score" style="margin-bottom:12px">
      <div class="flex fb">
        <div class="fw-b">${away.z || away.n || '客队'} (${away.a || '--'})</div>
        <div class="fw-b ${homeWin ? 't-ok' : 't-no'}">${parseNum(game.homeScore, 0)} - ${parseNum(game.awayScore, 0)}</div>
        <div class="fw-b">${home.z || home.n || '主队'} (${home.a || '--'})</div>
      </div>
      <div class="tc mt-12">
        <span class="badge ${homeWin ? 'b-ok' : 'b-no'}">${homeWin ? '主胜' : '客胜'}</span>
        ${game.userGame ? '<span class="badge b-gold">你的比赛</span>' : ''}
      </div>
    </div>
    <div class="grid g1 game-detail-teams">
      <div class="card game-detail-team" style="margin-bottom:0">
        <div class="card-title">${home.z || home.n || '主队'} 盒分</div>
        <div class="tbl"><table><thead><tr>
          <th>#</th><th>球员</th><th>位置</th><th>MIN</th><th>PTS</th><th>REB</th><th>AST</th><th>STL</th><th>BLK</th><th>TOV</th><th>命中 FG/3PT/FT</th>
        </tr></thead><tbody>${renderGameDetailRows(homeRows)}</tbody></table></div>
      </div>
      <div class="card game-detail-team" style="margin-bottom:0">
        <div class="card-title">${away.z || away.n || '客队'} 盒分</div>
        <div class="tbl"><table><thead><tr>
          <th>#</th><th>球员</th><th>位置</th><th>MIN</th><th>PTS</th><th>REB</th><th>AST</th><th>STL</th><th>BLK</th><th>TOV</th><th>命中 FG/3PT/FT</th>
        </tr></thead><tbody>${renderGameDetailRows(awayRows)}</tbody></table></div>
      </div>
    </div>
    </div>
  `, { className: 'modal-game-detail' });
}
function renderRecentGameRows(limit = 10) {
  return G.results.slice(-limit).reverse().map(r => {
    const o = getTeam(r.opp);
    const teamPts = parseNum(r.teamPts, NaN);
    const oppPts = parseNum(r.oppPts, NaN);
    const scoreText = Number.isFinite(teamPts) && Number.isFinite(oppPts) ? `${teamPts}-${oppPts}` : '-';
    const rowCls = r.win ? 'win-row' : 'loss-row';
    const resultText = r.injured ? `${r.win ? '胜' : '负'} (缺阵)` : (r.win ? '胜' : '负');
    return `<tr class="${rowCls}">
      <td>${r.game}</td>
      <td>${o.a}</td>
      <td>${r.home ? '主' : '客'}</td>
      <td>${scoreText}</td>
      <td><span class="badge ${r.win ? 'b-ok' : 'b-no'}">${resultText}</span></td>
      <td>${r.injured ? '-' : parseNum(r.pts, 0)}</td>
      <td>${r.injured ? '-' : parseNum(r.reb, 0)}</td>
      <td>${r.injured ? '-' : parseNum(r.ast, 0)}</td>
      <td>${r.injured ? '-' : gradeLetter(parseNum(r.grade, 0))}</td>
    </tr>`;
  }).join('');
}

function renderGameResultCard(res) {
  let ev = null, roll = null, result = null;
  if (res.gameEvent) {
    if (res.gameEvent.evt) {
      ev = res.gameEvent.evt;
      roll = res.gameEvent.roll;
      result = res.gameEvent.result;
    } else {
      ev = res.gameEvent;
    }
  }

  const effortCfg = typeof getEffortMode === 'function' ? getEffortMode(res.effortMode) : null;

  let evBanner = '';
  if (ev && ev.id !== 'quiet_game') {
    // Determine color based on result type or event category
    const type = result?.mod?.type || ev.cat || 'neu';
    const isPos = type === 'pos';
    const isNeg = type === 'neg';
    const color = isPos ? '#28a745' : isNeg ? '#dc3545' : '#fdb927';
    const bg = isPos ? 'rgba(40,167,69,.18)' : isNeg ? 'rgba(220,53,69,.18)' : 'rgba(253,185,39,.18)';
    const attrLabel = ATTRS.find(a => a.k === ev.attr)?.n || '综合';
    const evtIcon = ev.icon || '🎲';
    const evtName = ev.n || '特殊事件';

    // Roll details HTML
    let rollHtml = '';
    if (roll) {
      rollHtml = `
      <div style="margin-top:8px;padding:6px;background:rgba(0,0,0,0.15);border-radius:6px;display:flex;justify-content:space-between;align-items:center">
        <div style="font-size:12px">
          <span style="font-weight:bold">${attrLabel}</span> 检定
        </div>
        <div style="font-family:monospace;font-size:13px">
          <span style="color:${roll.d20 === 20 ? 'gold' : roll.d20 === 1 ? 'red' : 'inherit'}">🎲${parseNum(roll.d20, 1)}</span>
          ${parseNum(roll.mod, 0) >= 0 ? '+' : ''}${parseNum(roll.mod, 0)} = 
          <span style="font-weight:bold">${parseNum(roll.total, 0)}</span>
          <span style="color:#aaa;margin:0 4px">vs</span>
          <span>DC${parseNum(ev.dc, 10)}</span>
        </div>
        <div style="font-weight:bold;font-size:12px;color:${roll?.success ? '#28a745' : '#dc3545'}">
          ${roll?.success ? '成功' : '失败'}
        </div>
      </div>`;
    }

    const desc = (result?.desc || ev.desc || '无额外效果');

    evBanner = `
    <div style="margin-top:10px;padding:10px 14px;border-radius:8px;background:${bg};border:1px solid ${color}">
      <div class="fw-b filter-blur" style="display:flex;justify-content:space-between">
        <span>${evtIcon} ${evtName}</span>
        ${result ? `<span class="badge" style="background:${color};color:#fff;font-size:11px">${isPos ? '正面' : isNeg ? '负面' : '特殊'}</span>` : ''}
      </div>
      ${rollHtml}
      <div class="t-2 fs-sm" style="margin-top:6px">${desc}</div>
    </div>`;
  }

  const effortTag = effortCfg && effortCfg.id !== 'normal' ? `<span class="badge" style="background:${effortCfg.color};color:#fff;margin-left:8px;font-size:11px">${effortCfg.icon} ${effortCfg.n}</span>` : '';
  const teamAbbr = G.team?.a || 'HOME';
  const oppAbbr = res?.opp?.a || res?.opp?.z || 'AWAY';

  return `
  <div class="card">
    <div class="card-title">${res.win ? '🎉 胜利' : '😞 失败'}${effortTag}</div>
    <div class="result-banner ${res.win ? 'win' : 'loss'}">${res.win ? 'W 胜利' : 'L 失利'}</div>
    <div class="tc fw-b mt-12">${teamAbbr} ${parseNum(res.teamPts, 0)} : ${parseNum(res.oppPts, 0)} ${oppAbbr}</div>
    <div class="grade ${gradeClass(res.grade)}">${gradeLetter(res.grade)}</div>
    <div class="grid g4 mt-12">
      <div class="stat-box"><div class="stat-val">${res.st.pts}</div><div class="stat-lbl">得分</div></div>
      <div class="stat-box"><div class="stat-val">${res.st.reb}</div><div class="stat-lbl">篮板</div></div>
      <div class="stat-box"><div class="stat-val">${res.st.ast}</div><div class="stat-lbl">助攻</div></div>
      <div class="stat-box"><div class="stat-val">${res.st.stl}/${res.st.blk}</div><div class="stat-lbl">抢断/盖帽</div></div>
    </div>
    <div class="t-2 fs-sm tc mt-12">
      投篮: ${res.st.fgm}/${res.st.fga} | 三分: ${res.st.tpm}/${res.st.tpa} | 罚球: ${res.st.ftm}/${res.st.fta} | +${res.xp}XP
    </div>${evBanner}
    ${res.gameId ? `<div class="tc mt-12"><button class="btn btn-cyan btn-sm" onclick="showLeagueGameDetailModal('${res.gameId}')">查看本场双方数据</button></div>` : ''}
  </div>`;
}
function renderQuickResultCardFromLog(log) {
  if (!log) return '';
  const opp = getTeam(log.opp) || {};
  const detail = findResultGameDetail(log);
  const scoreText = Number.isFinite(parseNum(log.teamPts, NaN)) && Number.isFinite(parseNum(log.oppPts, NaN))
    ? `${parseNum(log.teamPts, 0)} : ${parseNum(log.oppPts, 0)}`
    : '-';
  return `
  <div class="card">
    <div class="card-title">${log.win ? '🎉 胜利' : '😞 失败'}</div>
    <div class="result-banner ${log.win ? 'win' : 'loss'}">${log.win ? 'W 胜利' : 'L 失利'}</div>
    <div class="tc fw-b mt-12">${G.team?.a || '--'} ${scoreText} ${opp.a || '--'}</div>
    <div class="t-2 fs-sm tc mt-12">${log.injured ? '本场你缺阵，已完成比赛模拟。' : '已完成比赛模拟。'}</div>
    ${detail ? `<div class="tc mt-12"><button class="btn btn-cyan btn-sm" onclick="showLeagueGameDetailModal('${detail.id}')">查看本场双方数据</button></div>` : ''}
  </div>`;
}

// ============ GAME PAGE ============
function renderGame() {
  const pg = $('gamePage');
  if (G.playoffs.active && !G.playoffs.eliminated) {
    renderPlayoffGame(); return;
  }
  if (G.gameNum >= 82) {
    renderSeasonEnd(); return;
  }

  // 初始化gameDays
  if (!G.gameDays || G.gameDays.length === 0) generateGameDays();

  const isToday = isGameDay(G.dayNum);
  const nextGameDayNum = getNextGameDay();
  const daysToGame = nextGameDayNum >= 0 ? nextGameDayNum - G.dayNum : 0;
  const staminaStatus = getStaminaStatus(G.player.stamina);
  const injured = G.player.injury.active;
  const cash = Number.isFinite(parseNum(G.player.cash, NaN)) ? parseNum(G.player.cash, 0) : 0;
  const latest = (G._latestDayResult && parseNum(G._latestDayResult.day, -99) === parseNum(G.dayNum, 0) - 1) ? G._latestDayResult : null;
  const simBusy = !!G._simulatingDay;

  // 下场比赛信息
  const game = G.schedule[G.gameNum];
  const opp = getTeam(game?.opp);

  const gameHtml = `
  <div class="card">
    <div class="card-title">📅 ${G.year}赛季 - ${getDayDateString(G.dayNum)}（单日模拟）</div>
    <div class="grid g4" style="gap:12px;padding:12px 0">
      <div class="tc">
        <div class="fs-xl fw-b" style="color:var(--gold)">${G.dayNum + 1}</div>
        <div class="t-2 fs-sm">第几天</div>
      </div>
      <div class="tc">
        <div class="fs-xl fw-b">${G.gameNum}/82</div>
        <div class="t-2 fs-sm">已打场次</div>
      </div>
      <div class="tc">
        <div class="fs-xl fw-b">${G.seasonStats.wins}-${G.seasonStats.losses}</div>
        <div class="t-2 fs-sm">战绩</div>
      </div>
      <div class="tc">
        <div class="fs-xl fw-b t-gold">$${cash.toFixed(2)}M</div>
        <div class="t-2 fs-sm">现金</div>
      </div>
    </div>
    <div class="tc" style="padding:8px;background:rgba(0,0,0,.2);border-radius:6px">
      <span>${staminaStatus.icon || '💪'} 体力: ${parseNum(G.player.stamina, 0)}</span> <span class="t-2">(${staminaStatus.name || '正常'})</span>
      ${injured ? `<span style="color:var(--danger);margin-left:12px">🩹 ${G.player.injury.type} 剩${G.player.injury.games}场</span>` : ''}
    </div>
  </div>
  
  ${latest?.isGame && latest?.gameResult ? renderGameResultCard(latest.gameResult) : ''}
  ${latest && !latest.isGame ? `
  <div class="card">
    <div class="card-title">📌 昨日总结</div>
    <div class="t-2">${latest.date} 休息日</div>
    <div class="event-log mt-12">${(latest.events || []).map(x => `<div class="ev neu">${x}</div>`).join('')}</div>
  </div>` : ''}

  ${isToday ? `
  <div class="card" style="border:2px solid var(--gold)">
    <div class="card-title" style="color:var(--gold)">🏀 今日有比赛！第${G.gameNum + 1}场</div>
    <div class="flex fc gap-16" style="padding:12px 0">
      <div class="tc">
        <div class="team-logo" style="background:${G.team?.cl || '#333'};margin:0 auto">${teamLogoMarkup(G.team, 40)}</div>
        <div class="fw-b mt-12">${G.team?.z || '我的球队'}</div>
      </div>
      <div class="t-gold fs-lg fw-b">${game?.home ? '主场' : '客场'} VS</div>
      <div class="tc">
        <div class="team-logo" style="background:${opp?.cl || '#333'};margin:0 auto">${teamLogoMarkup(opp, 40)}</div>
        <div class="fw-b mt-12">${opp?.z || '对手'}</div>
        <div class="t-2 fs-sm">强度 ${getTeamStrength(opp?.id)}</div>
      </div>
    </div>
    <div style="margin-top:12px;padding:10px;background:rgba(0,0,0,.25);border-radius:8px">
      <div class="t-2 fs-sm" style="margin-bottom:8px;text-align:center">选择比赛强度：</div>
      <div style="display:flex;gap:6px;justify-content:center">
        ${EFFORT_MODES.map(m => {
    const sel = (G._effortMode || 'normal') === m.id;
    return `<button class="btn btn-sm" style="padding:8px 14px;border:2px solid ${m.color};background:${sel ? m.color : 'transparent'};color:${sel ? '#fff' : m.color};font-weight:bold;border-radius:8px;transition:all .2s" onclick="G._effortMode='${m.id}';renderGame()" title="${m.desc}">${m.icon} ${m.n}</button>`;
  }).join('')}
      </div>
      <div class="t-2 fs-xs tc" style="margin-top:6px">${getEffortMode(G._effortMode || 'normal').desc}</div>
    </div>
    <div class="tc mt-12">
      <button class="btn btn-gold mt-12" ${simBusy ? 'disabled' : ''} onclick="doSimulateDay()">${simBusy ? '处理中...' : '▶ 模拟今日（含比赛）'}</button>
    </div>
  </div>
  `: `
  <div class="card">
    <div class="card-title">😴 今日休息日</div>
    <div class="t-2">距离下场比赛还有 <span class="fw-b" style="color:var(--cyan)">${daysToGame}</span> 天</div>
    ${opp ? `<div class="t-2 mt-12">下场对手: <span class="fw-b">${opp.z}</span> (${game?.home ? '主场' : '客场'})</div>` : ''}
    <div class="tc mt-12">
      <button class="btn btn-pri mt-12" ${simBusy ? 'disabled' : ''} onclick="doSimulateDay()">${simBusy ? '处理中...' : '模拟今天'}</button>
    </div>
  </div>
  `}
  
  <div class="card"><div class="card-title">📋 最近比赛</div>
    <div class="tbl"><table><thead><tr>
      <th>#</th><th>对手</th><th>主客</th><th>比分</th><th>结果</th><th>PTS</th><th>REB</th><th>AST</th><th>评分</th>
    </tr></thead>
    <tbody id="recentGamesBody">${renderRecentGameRows(8)}</tbody></table></div>
  </div>`;
  pg.innerHTML = typeof stripUndefinedTokens === 'function' ? stripUndefinedTokens(gameHtml) : gameHtml;
}

function doPlayGame() {
  // 保留旧函数作为备用
  doSimulateDay();
}

async function doSimulateDay() {
  if (G._simulatingDay) return;
  G._simulatingDay = true;
  renderGame();
  try {
    // 赛前事件：如果今天是比赛日，先掷骰并展示事件
    const isGame = typeof isGameDay === 'function' && isGameDay(G.dayNum) && G.gameNum < 82;
    if (isGame && !G.player?.injury?.active && typeof rollPreGameEvent === 'function') {
      const ev = rollPreGameEvent();
      if (ev && typeof showEventOutcomeModal === 'function') {
        await showEventOutcomeModal(ev);
      }
    }

    const result = simulateDay();
    if (!result) return;
    if (result.type === 'seasonEnd') {
      updateHeader();
      renderSeasonEnd();
      return;
    }
    G._latestDayResult = result;
    updateHeader();
    renderGame();
    if ($('phonePage').classList.contains('active')) renderPhone();

    // 后台非阻塞生成推文，不等待 LLM 响应
    if (typeof generateDailySocialTweets === 'function') {
      generateDailySocialTweets(result).then(() => {
        if ($('phonePage').classList.contains('active')) renderPhone();
      }).catch(e => {
        G.social = G.social || {};
        G.social.lastLLMError = String(e?.message || e || '推文生成失败');
      });
    }
  } finally {
    G._simulatingDay = false;
    if ($('gamePage').classList.contains('active')) renderGame();
    if ($('phonePage').classList.contains('active')) renderPhone();
    // 自动备份到 localStorage
    try { localStorage.setItem('nba_save_auto', JSON.stringify(buildSaveObj())); } catch (e) { }
  }
}

async function doResolveDailySocialGate() {
  if (typeof ensureDailySocialReadyBeforeAdvance !== 'function') return;
  const res = await ensureDailySocialReadyBeforeAdvance();
  G._phoneComposeResult = {
    ok: !!res?.ok,
    message: res?.ok
      ? `补生成完成：${res?.count || 0} 条`
      : (res?.message || '补生成失败，请检查模型设置后重试')
  };
  renderGame();
  if ($('phonePage').classList.contains('active')) renderPhone();
}

function doSimulateDays(count) {
  doSimulateDay();
}

function doSkipToGame() {
  doSimulateDay();
}

function renderDaySimResults(results) {
  if (Array.isArray(results) && results.length) {
    G._latestDayResult = results[results.length - 1];
  }
  renderGame();
}

function showRegularSeasonAwardsModal(madePlayoffs = false) {
  const leagueAwards = typeof leagueAwardEntryForSeason === 'function'
    ? leagueAwardEntryForSeason(G.season)
    : (Array.isArray(G.leagueAwards) ? G.leagueAwards.find(a => parseNum(a?.season, -1) === parseNum(G.season, -2)) : null);
  if (!leagueAwards) return;
  const userAwards = (typeof buildUserAwardsFromLeague === 'function')
    ? buildUserAwardsFromLeague(leagueAwards, { includeFinals: false })
    : (Array.isArray(G.awards) ? G.awards : []);
  showModal(`
    <div class="modal-hd"><h3>🏆 常规赛颁奖</h3><button class="modal-x" onclick="closeRegularSeasonAwardsModal(${madePlayoffs ? 1 : 0})">✕</button></div>
    <div class="mb-16 t-2">${leagueAwards.year}-${leagueAwards.year + 1} 赛季常规赛奖项已揭晓：</div>
    ${leagueAwards.mvp ? `<div class="ev neu">MVP：<span class="fw-b">${leagueAwards.mvp.name}</span> (${leagueAwards.mvp.team})</div>` : ''}
    ${leagueAwards.dpoy ? `<div class="ev neu">DPOY：<span class="fw-b">${leagueAwards.dpoy.name}</span> (${leagueAwards.dpoy.team})</div>` : ''}
    ${leagueAwards.roy ? `<div class="ev neu">ROY：<span class="fw-b">${leagueAwards.roy.name}</span> (${leagueAwards.roy.team})</div>` : ''}
    ${leagueAwards.scoring ? `<div class="ev neu">得分王：<span class="fw-b">${leagueAwards.scoring.name}</span> (${leagueAwards.scoring.team}) ${leagueAwards.scoring.ppg || '--'}分</div>` : ''}
    ${(Array.isArray(userAwards) && userAwards.length) ? `<div class="mt-16"><div class="fw-b mb-12">你的本赛季荣誉</div>${userAwards.map(a => `<span class="badge b-gold">${a}</span> `).join('')}</div>` : ''}
    <button class="btn btn-gold mt-16" style="width:100%" onclick="closeRegularSeasonAwardsModal(${madePlayoffs ? 1 : 0})">${madePlayoffs ? '进入季后赛 →' : '知道了'}</button>
  `);
}
function closeRegularSeasonAwardsModal(madePlayoffs = 0) {
  hideModal();
  if (parseNum(madePlayoffs, 0) === 1) renderPlayoffGame();
}

function renderSeasonEnd() {
  const s = G.seasonStats, gp = Math.max(s.gp, 1);
  if (!G.playoffs.active && !G.playoffs.eliminated) {
    const made = startPlayoffs();
    const shouldShowAwards = !!G._pendingRegularSeasonAwardsModal;
    G._pendingRegularSeasonAwardsModal = false;
    if (shouldShowAwards) {
      showRegularSeasonAwardsModal(made);
      if (made) return;
    }
    if (made) { renderPlayoffGame(); return; }
  }
  $('gamePage').innerHTML = `
  <div class="card tc">
    <div class="card-title fc" style="justify-content:center">🏁 赛季结束</div>
    <div class="fs-lg fw-b">${G.year}-${G.year + 1} 赛季总结</div>
    <div class="grid g3 mt-16">
      <div class="stat-box"><div class="stat-val">${(s.pts / gp).toFixed(1)}</div><div class="stat-lbl">场均得分</div></div>
      <div class="stat-box"><div class="stat-val">${(s.ast / gp).toFixed(1)}</div><div class="stat-lbl">场均助攻</div></div>
      <div class="stat-box"><div class="stat-val">${(s.reb / gp).toFixed(1)}</div><div class="stat-lbl">场均篮板</div></div>
    </div>
    <div class="mt-16"><span class="fw-b">${s.wins}胜${s.losses}负</span></div>
    ${G.playoffs.champion ? '<div class="t-gold fs-lg fw-b mt-16">🏆 NBA总冠军！</div>' : ''}
    <button class="btn btn-gold mt-16" onclick="goToOffseason()">进入休赛期 →</button>
  </div>`;
}

function renderPlayoffGame() {
  const s = G.playoffs.series;
  const opp = getTeam(s.opp);
  const roundNames = ["", "首轮", "次轮", "分区决赛", "总决赛"];
  $('gamePage').innerHTML = `
  <div class="card">
    <div class="card-title">🏆 季后赛 - ${roundNames[G.playoffs.round]}</div>
    <div class="flex fc gap-16" style="padding:20px 0">
      <div class="tc">
        <div class="team-logo" style="background:${G.team.cl};margin:0 auto">${teamLogoMarkup(G.team, 50)}</div>
        <div class="fw-b mt-12">${G.team.z}</div>
        <div class="t-gold fs-lg fw-b">${s.myWins}</div>
      </div>
      <div class="t-2 fs-lg">VS</div>
      <div class="tc">
        <div class="team-logo" style="background:${opp.cl};margin:0 auto">${teamLogoMarkup(opp, 50)}</div>
        <div class="fw-b mt-12">${opp.z}</div>
        <div class="t-2 fs-lg fw-b">${s.oppWins}</div>
      </div>
    </div>
    <div class="tc mt-16">
      <button class="btn btn-gold" onclick="doPlayoffGame()">▶ 比赛</button>
    </div>
  </div>
  <div id="playoffResult"></div>`;
}

function doPlayoffGame() {
  const res = playPlayoffGame();
  const status = checkSeriesEnd();
  // 后台非阻塞生成推文
  if (typeof generateDailySocialTweets === 'function') {
    const socialDay = parseNum(G.dayNum, 0) + 1000 + parseNum(G.playoffs.round, 0) * 10 + parseNum(res.myWins + res.oppWins, 0);
    generateDailySocialTweets({
      day: socialDay,
      date: `${G.year}季后赛R${parseNum(G.playoffs.round, 0)}G${parseNum(res.myWins + res.oppWins, 0)}`,
      isGame: true,
      gameResult: {
        win: !!res.win,
        opp: res.opp,
        teamPts: parseNum(res?.st?.teamPts, 0),
        oppPts: parseNum(res?.st?.oppPts, 0),
        st: res.st,
        grade: res.grade
      }
    }, { force: true }).then(() => {
      if ($('phonePage').classList.contains('active')) renderPhone();
    }).catch(() => { });
  }
  const scoreText = Number.isFinite(parseNum(res?.st?.teamPts, NaN)) && Number.isFinite(parseNum(res?.st?.oppPts, NaN))
    ? `${parseNum(res.st.teamPts, 0)} - ${parseNum(res.st.oppPts, 0)}`
    : '-';
  $('playoffResult').innerHTML = `
  <div class="card">
    <div class="card-title">${res.win ? '🎉 胜利' : '😞 失败'}</div>
    <div class="grade ${gradeClass(res.grade)}">${gradeLetter(res.grade)}</div>
    <div class="tc fw-b mt-12">比分 ${scoreText}</div>
    <div class="grid g4 mt-12">
      <div class="stat-box"><div class="stat-val">${res.st.pts}</div><div class="stat-lbl">得分</div></div>
      <div class="stat-box"><div class="stat-val">${res.st.reb}</div><div class="stat-lbl">篮板</div></div>
      <div class="stat-box"><div class="stat-val">${res.st.ast}</div><div class="stat-lbl">助攻</div></div>
      <div class="stat-box"><div class="stat-val">${res.st.stl}/${res.st.blk}</div><div class="stat-lbl">抢断/盖帽</div></div>
    </div>
    ${res.gameId ? `<div class="tc mt-12"><button class="btn btn-cyan btn-sm" onclick="showLeagueGameDetailModal('${res.gameId}')">查看本场双方数据</button></div>` : ''}
    <div class="tc mt-12 fw-b">系列赛 ${res.myWins} - ${res.oppWins}</div>
    <div class="tc mt-16">
      ${status === 'continue' ? `<button class="btn btn-gold" onclick="renderPlayoffGame()">下一场</button>` : ''}
      ${status === 'advance' ? `<button class="btn btn-gold" onclick="renderPlayoffGame()">下一轮</button>` : ''}
      ${status === 'champion' || status === 'eliminated' ? `<button class="btn btn-gold" onclick="renderSeasonEnd()">赛季总结</button>` : ''}
    </div>
  </div>`;
}

async function goToOffseason() {
  await endSeason();
  if (G.player.contractYears <= 0) {
    showFreeAgencyModal();
  } else {
    showOffseasonModal();
  }
}

function showOffseasonModal() {
  const allAwards = Array.isArray(G.allAwards) ? G.allAwards : [];
  const leagueList = Array.isArray(G.leagueAwards) ? G.leagueAwards : [];
  const targetSeason = parseNum(G.season, 0) - 1;
  const awardsRec = [...allAwards].reverse().find(a => parseNum(a?.season, 0) === targetSeason) || allAwards[allAwards.length - 1] || null;
  const leagueAwards = [...leagueList].reverse().find(a => parseNum(a?.season, 0) === parseNum(G.season, 0) - 1) || leagueList[leagueList.length - 1] || null;
  const awards = (leagueAwards && typeof buildUserAwardsFromLeague === 'function')
    ? buildUserAwardsFromLeague(leagueAwards, { includeFinals: true })
    : (awardsRec?.awards || []);
  const offseasonSummary = Array.isArray(G.offseasonSummary) ? G.offseasonSummary : [];
  const hof = typeof getUserHallOfFameProfile === 'function' ? getUserHallOfFameProfile() : null;
  showModal(`
    <div class="modal-hd"><h3>🏖️ 休赛期</h3><button class="modal-x" onclick="hideModal()">✕</button></div>
    ${awards.length ? `<div class="mb-16"><div class="fw-b mb-16">🏆 本赛季荣誉</div>
      ${awards.map(a => `<span class="badge b-gold">${a}</span> `).join('')}</div>` : ''}
    ${leagueAwards ? `<div class="mb-16">
      <div class="fw-b mb-16">🌐 联盟奖项</div>
      ${leagueAwards.mvp ? `<div class="t-2 fs-sm">MVP: ${leagueAwards.mvp.name} (${leagueAwards.mvp.team})</div>` : ''}
      ${leagueAwards.dpoy ? `<div class="t-2 fs-sm">DPOY: ${leagueAwards.dpoy.name} (${leagueAwards.dpoy.team})</div>` : ''}
      ${leagueAwards.roy ? `<div class="t-2 fs-sm">ROY: ${leagueAwards.roy.name} (${leagueAwards.roy.team})</div>` : ''}
      ${leagueAwards.fmvp ? `<div class="t-2 fs-sm">FMVP: ${leagueAwards.fmvp.name} (${leagueAwards.fmvp.team})</div>` : ''}
    </div>`: ''}
    ${hof ? `<div class="mb-16"><div class="fw-b mb-16">🏛 名人堂进度</div>
      <div class="t-2 fs-sm">积分: ${hof.score} / ${hof.threshold} ${hof.eligible ? '<span class="badge b-gold">达到门槛</span>' : ''}</div>
    </div>` : ''}
    ${offseasonSummary.length ? `<div class="mb-16"><div class="fw-b mb-16">📅 休赛期流程（APK阶段）</div>
      <div class="event-log">${offseasonSummary.map(x => `<div class="ev neu">${x}</div>`).join('')}</div>
    </div>`: ''}
    <div class="mb-16"><div class="fw-b">属性变化 (年龄: ${G.player.age}岁)</div>
      <div class="t-2 fs-sm mt-12">玩家按 XP 成长；NPC 已按教练培养和年龄曲线更新。</div>
    </div>
    <button class="btn btn-gold" onclick="startNewSeason()" style="width:100%">开始新赛季 →</button>
  `);
}

function showFreeAgencyModal() {
  const offers = freeAgency();
  G._faOffers = offers;
  if (!offers.length) {
    showOffseasonModal();
    return;
  }
  showModal(`
    <div class="modal-hd"><h3>📝 自由市场</h3><button class="modal-x" onclick="hideModal()">✕</button></div>
    <div class="mb-16 t-2">合同到期！以下球队向你发出报价：</div>
    ${offers.map((o, i) => `
      <div class="choice-card mb-16" style="text-align:left">
        <div class="flex fb">
          <div>
            <span class="fw-b">${o.team.z} ${o.team.n}</span>
            ${o.current ? '<span class="badge b-pri">当前球队</span>' : ''}
          </div>
          <button class="btn btn-sm btn-ok" onclick="acceptOffer(${i})">签约</button>
        </div>
        <div class="t-2 fs-sm mt-12">${o.years}年 $${formatSalaryM(o.salary)}M/年</div>
      </div>`).join('')}
  `);
}

function acceptOffer(idx) {
  const o = G._faOffers[idx];
  signContract(o.team.id, o.salary, o.years);
  hideModal();
  showOffseasonModal();
}

function startNewSeason() {
  hideModal();
  G.offseasonStage = 0;
  G.offseasonSummary = [];
  G._pendingRegularSeasonAwardsModal = false;
  G._latestDayResult = null;
  G._phoneTab = 'feed';
  if (typeof ensureEconomyState === 'function') ensureEconomyState();
  if (typeof ensureSocialState === 'function') ensureSocialState();
  if (typeof applySeasonSalaryPayout === 'function') applySeasonSalaryPayout({ force: false, reason: '新赛季薪资发放' });
  generateSchedule();
  updateHeader();
  renderHome();
  navTo('home');
}

function showEventModal(ev) {
  showModal(`
    <div class="modal-hd"><h3>${ev.n}</h3><button class="modal-x" onclick="hideModal()">✕</button></div>
    <div class="mb-16">${ev.d}</div>
    <div class="grid g3">
      ${ev.choices.map((c, i) => `
        <div class="choice-card" onclick="handleEventChoice(${i})">
          <div class="fw-b">${c.t}</div>
          <div class="t-2 fs-sm mt-12">${Object.entries(c.eff || c.reward || {}).map(([k, v]) => `${k}:${v > 0 ? '+' : ''}${v}`).join(' ') || '无额外效果'}</div>
        </div>`).join('')}
    </div>
  `);
  G._currentEvent = ev;
}

function handleEventChoice(idx) {
  if (G._currentEvent) {
    applyEventChoice(G._currentEvent, idx);
    G._currentEvent = null;
  }
  hideModal();
}

// ============ STATS PAGE ============
function renderStats() {
  const s = G.seasonStats, gp = Math.max(s.gp, 1);
  const teamRecords = getLeagueTeamRecordsArray();
  const east = teamRecords.filter(r => (getTeam(r.id)?.c || 'East') === 'East').sort((a, b) => b.w - a.w || a.l - b.l);
  const west = teamRecords.filter(r => (getTeam(r.id)?.c || 'West') === 'West').sort((a, b) => b.w - a.w || a.l - b.l);
  const leaguePlayers = getLeaguePlayerSeasonRows().filter(r => parseNum(r.gp, 0) > 0);
  const scoreLeaders = [...leaguePlayers].sort((a, b) => b.ppg - a.ppg).slice(0, 10);
  const astLeaders = [...leaguePlayers].sort((a, b) => b.apg - a.apg).slice(0, 10);
  const rebLeaders = [...leaguePlayers].sort((a, b) => b.rpg - a.rpg).slice(0, 10);
  const stlLeaders = [...leaguePlayers].sort((a, b) => b.spg - a.spg).slice(0, 10);
  const blkLeaders = [...leaguePlayers].sort((a, b) => b.bpg - a.bpg).slice(0, 10);
  const rookieRows = typeof getRookieLeaderboard === 'function' ? getRookieLeaderboard() : [];
  const rookieScoreLeaders = [...rookieRows].sort((a, b) => b.ppg - a.ppg).slice(0, 10);
  const rookieRebLeaders = [...rookieRows].sort((a, b) => b.rpg - a.rpg).slice(0, 10);
  const rookieAstLeaders = [...rookieRows].sort((a, b) => b.apg - a.apg).slice(0, 10);
  const selectedTeamId = clamp(parseNum(G._statsTeamView, G.teamId), 1, 30);
  G._statsTeamView = selectedTeamId;
  const selectedTeam = getTeam(selectedTeamId) || {};
  const selfPlayer = createUserRosterSnapshot();
  const selectedRoster = (selectedTeamId === G.teamId ? [selfPlayer, ...getTeamPlayers(selectedTeamId)] : [...getTeamPlayers(selectedTeamId)]).sort((a, b) => (b.rating || 0) - (a.rating || 0));
  const lineMap = new Map(leaguePlayers.map(r => [r.key, r]));
  const showLeagueData = LEAGUE.loaded && teamRecords.some(r => r.gp > 0);
  const renderLeaderRows = (rows, valKey) => rows.map((r, i) => {
    const val = parseNum(r[valKey], 0);
    const team = getTeam(r.teamId) || {};
    const key = r.isSelf ? 'USER_SELF' : `${r.teamId}_${r.playerId}`;
    const btn = r.isSelf
      ? `<button class="player-link" onclick="showMyPlayerModal()">${r.name}</button>`
      : `<button class="player-link" onclick="showTeamPlayerModal(${r.teamId},${r.playerId})">${r.name}</button>`;
    return `<tr><td>${i + 1}</td><td>${btn}</td><td>${team.a || '--'}</td><td>${val.toFixed(1)}</td><td>${r.gp}</td></tr>`;
  }).join('');
  $('statsPage').innerHTML = `
  <div class="card">
    <div class="card-title">📊 本赛季数据</div>
    <div class="grid g5">
      <div class="stat-box"><div class="stat-val">${(s.pts / gp).toFixed(1)}</div><div class="stat-lbl">得分</div></div>
      <div class="stat-box"><div class="stat-val">${(s.ast / gp).toFixed(1)}</div><div class="stat-lbl">助攻</div></div>
      <div class="stat-box"><div class="stat-val">${(s.reb / gp).toFixed(1)}</div><div class="stat-lbl">篮板</div></div>
      <div class="stat-box"><div class="stat-val">${(s.stl / gp).toFixed(1)}</div><div class="stat-lbl">抢断</div></div>
      <div class="stat-box"><div class="stat-val">${(s.blk / gp).toFixed(1)}</div><div class="stat-lbl">盖帽</div></div>
    </div>
    <div class="grid g3 mt-16">
      <div class="stat-box"><div class="stat-val">${s.fga > 0 ? (s.fgm / s.fga * 100).toFixed(1) : 0}%</div><div class="stat-lbl">投篮%</div></div>
      <div class="stat-box"><div class="stat-val">${s.tpa > 0 ? (s.tpm / s.tpa * 100).toFixed(1) : 0}%</div><div class="stat-lbl">三分%</div></div>
      <div class="stat-box"><div class="stat-val">${s.fta > 0 ? (s.ftm / s.fta * 100).toFixed(1) : 0}%</div><div class="stat-lbl">罚球%</div></div>
    </div>
  </div>
  <div class="card">
    <div class="card-title">📈 生涯数据</div>
    <div class="tbl"><table><thead><tr>
      <th>赛季</th><th>球队</th><th>场次</th><th>得分</th><th>助攻</th><th>篮板</th><th>抢断</th><th>盖帽</th><th>FG%</th><th>3P%</th><th>战绩</th>
    </tr></thead><tbody>
    ${G.careerStats.map(c => {
    const t = getTeam(c.team);
    return `<tr><td>${c.year}</td><td>${t.a}</td><td>${c.gp}</td>
        <td>${c.ppg}</td><td>${c.apg}</td><td>${c.rpg}</td>
        <td>${c.spg}</td><td>${c.bpg}</td><td>${c.fgPct}%</td><td>${c.tpPct}%</td>
        <td>${c.wins}-${c.losses}</td></tr>`;
  }).join('')}
    </tbody></table></div>
  </div>
  <div class="card">
    <div class="card-title">🏆 联盟排行榜</div>
    ${showLeagueData ? '' : '<div class="t-2 fs-sm mb-16">需要先读取真实名单并至少进行 1 场比赛后才会显示完整联盟排行榜。</div>'}
    <div class="grid g2">
      <div>
        <div class="fw-b mb-16">东部战绩</div>
        <div class="tbl"><table><thead><tr><th>#</th><th>球队</th><th>战绩</th><th>胜率</th></tr></thead><tbody>
          ${east.map((r, i) => { const t = getTeam(r.id) || {}; const pct = (r.w + r.l) > 0 ? (r.w / (r.w + r.l) * 100).toFixed(1) : '0.0'; return `<tr><td>${i + 1}</td><td>${t.z || t.n}</td><td>${r.w}-${r.l}</td><td>${pct}%</td></tr>`; }).join('')}
        </tbody></table></div>
      </div>
      <div>
        <div class="fw-b mb-16">西部战绩</div>
        <div class="tbl"><table><thead><tr><th>#</th><th>球队</th><th>战绩</th><th>胜率</th></tr></thead><tbody>
          ${west.map((r, i) => { const t = getTeam(r.id) || {}; const pct = (r.w + r.l) > 0 ? (r.w / (r.w + r.l) * 100).toFixed(1) : '0.0'; return `<tr><td>${i + 1}</td><td>${t.z || t.n}</td><td>${r.w}-${r.l}</td><td>${pct}%</td></tr>`; }).join('')}
        </tbody></table></div>
      </div>
    </div>
    <div class="grid g2 mt-16">
      <div class="tbl"><table><thead><tr><th colspan="5">得分榜</th></tr><tr><th>#</th><th>球员</th><th>队</th><th>场均</th><th>场次</th></tr></thead><tbody>${renderLeaderRows(scoreLeaders, 'ppg') || '<tr><td colspan="5" class="t-2">暂无</td></tr>'}</tbody></table></div>
      <div class="tbl"><table><thead><tr><th colspan="5">助攻榜</th></tr><tr><th>#</th><th>球员</th><th>队</th><th>场均</th><th>场次</th></tr></thead><tbody>${renderLeaderRows(astLeaders, 'apg') || '<tr><td colspan="5" class="t-2">暂无</td></tr>'}</tbody></table></div>
      <div class="tbl"><table><thead><tr><th colspan="5">篮板榜</th></tr><tr><th>#</th><th>球员</th><th>队</th><th>场均</th><th>场次</th></tr></thead><tbody>${renderLeaderRows(rebLeaders, 'rpg') || '<tr><td colspan="5" class="t-2">暂无</td></tr>'}</tbody></table></div>
      <div class="tbl"><table><thead><tr><th colspan="5">抢断榜</th></tr><tr><th>#</th><th>球员</th><th>队</th><th>场均</th><th>场次</th></tr></thead><tbody>${renderLeaderRows(stlLeaders, 'spg') || '<tr><td colspan="5" class="t-2">暂无</td></tr>'}</tbody></table></div>
      <div class="tbl"><table><thead><tr><th colspan="5">盖帽榜</th></tr><tr><th>#</th><th>球员</th><th>队</th><th>场均</th><th>场次</th></tr></thead><tbody>${renderLeaderRows(blkLeaders, 'bpg') || '<tr><td colspan="5" class="t-2">暂无</td></tr>'}</tbody></table></div>
    </div>
  </div>
  <div class="card">
    <div class="card-title">🌟 新秀排行榜</div>
    ${rookieScoreLeaders.length ? `<div class="grid g3">
      <div class="tbl"><table><thead><tr><th colspan="5">新秀得分榜</th></tr><tr><th>#</th><th>球员</th><th>队</th><th>场均</th><th>场次</th></tr></thead><tbody>${renderLeaderRows(rookieScoreLeaders, 'ppg') || '<tr><td colspan="5" class="t-2">暂无</td></tr>'}</tbody></table></div>
      <div class="tbl"><table><thead><tr><th colspan="5">新秀篮板榜</th></tr><tr><th>#</th><th>球员</th><th>队</th><th>场均</th><th>场次</th></tr></thead><tbody>${renderLeaderRows(rookieRebLeaders, 'rpg') || '<tr><td colspan="5" class="t-2">暂无</td></tr>'}</tbody></table></div>
      <div class="tbl"><table><thead><tr><th colspan="5">新秀助攻榜</th></tr><tr><th>#</th><th>球员</th><th>队</th><th>场均</th><th>场次</th></tr></thead><tbody>${renderLeaderRows(rookieAstLeaders, 'apg') || '<tr><td colspan="5" class="t-2">暂无</td></tr>'}</tbody></table></div>
    </div>` : '<div class="t-2">暂无新秀数据，需加载名单并进行比赛。</div>'}
  </div>
  <div class="card">
    <div class="card-title">🔎 跨队球员数据</div>
    <div class="form-group" style="max-width:420px">
      <label>选择球队</label>
      <select class="form-control" id="statsTeamSelect" onchange="changeStatsTeamView()">
        ${TEAMS.map(t => `<option value="${t.id}" ${t.id === selectedTeamId ? 'selected' : ''}>${t.z} ${t.n} (${t.a})</option>`).join('')}
      </select>
    </div>
    ${selectedRoster.length ? `<div class="tbl"><table><thead><tr>
      <th>#</th><th>球员</th><th>位置</th><th>OVR</th><th>POT</th><th>场次</th><th>得分</th><th>篮板</th><th>助攻</th><th>抢断</th><th>盖帽</th>
    </tr></thead><tbody>
      ${selectedRoster.map((p, i) => {
    const isSelf = selectedTeamId === G.teamId && String(p.id) === 'USER_SELF';
    const key = isSelf ? 'USER_SELF' : `${selectedTeamId}_${p.id}`;
    const line = lineMap.get(key);
    const nameCell = isSelf
      ? `<button class="player-link" onclick="showMyPlayerModal()">${p.name}</button> <span class="badge b-gold">你</span>`
      : `<button class="player-link" onclick="showTeamPlayerModal(${selectedTeamId},${p.id})">${p.name}</button>`;
    return `<tr>
          <td>${i + 1}</td>
          <td>${nameCell}</td>
          <td>${posLabel(p.pos)}${p.pos2 ? `/${posLabel(p.pos2)}` : ''}</td>
          <td>${p.rating || 0}</td>
          <td>${p.potential || 0}</td>
          <td>${line ? line.gp : 0}</td>
          <td>${line ? line.ppg.toFixed(1) : '0.0'}</td>
          <td>${line ? line.rpg.toFixed(1) : '0.0'}</td>
          <td>${line ? line.apg.toFixed(1) : '0.0'}</td>
          <td>${line ? line.spg.toFixed(1) : '0.0'}</td>
          <td>${line ? line.bpg.toFixed(1) : '0.0'}</td>
        </tr>`;
  }).join('')}
    </tbody></table></div>`: '<div class="t-2">当前球队无数据</div>'}
  </div>`;
}

// ============ MATCH CENTER PAGE ============
function matchCenterResultBadge(game, teamId = 0) {
  if (!game) return '<span class="badge b-no">-</span>';
  const tid = parseNum(teamId, 0);
  if (tid > 0 && (parseNum(game.homeTeamId, 0) === tid || parseNum(game.awayTeamId, 0) === tid)) {
    const win = teamWinForGame(game, tid);
    return `<span class="badge ${win ? 'b-ok' : 'b-no'}">${win ? '胜' : '负'}</span>`;
  }
  const homeWin = parseNum(game.homeScore, 0) > parseNum(game.awayScore, 0);
  return `<span class="badge ${homeWin ? 'b-ok' : 'b-no'}">${homeWin ? '主胜' : '客胜'}</span>`;
}
function renderMatchCenterRows(rows, { perspectiveTeamId = 0 } = {}) {
  if (!Array.isArray(rows) || !rows.length) {
    return '<tr><td colspan="7" class="t-2">暂无比赛数据</td></tr>';
  }
  return rows.map((g, i) => {
    const home = getTeam(g.homeTeamId) || {};
    const away = getTeam(g.awayTeamId) || {};
    const phase = String(g.phase || 'regular');
    const roundText = phase === 'playoff'
      ? `季后赛R${parseNum(g.round, 0)} G${Math.max(1, parseNum(g.seriesGame, 1))}`
      : `第${parseNum(g.round, 0)}轮`;
    const isUserGame = parseNum(g.homeTeamId, 0) === parseNum(G.teamId, 0) || parseNum(g.awayTeamId, 0) === parseNum(G.teamId, 0);
    return `<tr class="${isUserGame ? 'hl-row' : ''}">
      <td>${i + 1}</td>
      <td>${roundText}</td>
      <td>${away.a || '--'} @ ${home.a || '--'}</td>
      <td>${parseNum(g.awayScore, 0)} - ${parseNum(g.homeScore, 0)}</td>
      <td>${matchCenterResultBadge(g, perspectiveTeamId)}</td>
      <td>${isUserGame ? '<span class="badge b-gold">本队</span>' : '-'}</td>
      <td><button class="btn btn-sm btn-cyan" onclick="showLeagueGameDetailModal('${g.id}')">双方数据</button></td>
    </tr>`;
  }).join('');
}
function changeMatchCenterTeamFilter() {
  const sel = $('matchCenterTeamSelect');
  if (!sel) return;
  G._matchCenterTeamView = parseNum(sel.value, 0);
  renderMatchCenter();
}
function changeMatchCenterRoundFilter() {
  const sel = $('matchCenterRoundSelect');
  if (!sel) return;
  G._matchCenterRoundView = parseNum(sel.value, 0);
  renderMatchCenter();
}
function changeMatchCenterPhaseFilter() {
  const sel = $('matchCenterPhaseSelect');
  if (!sel) return;
  const v = String(sel.value || 'regular');
  G._matchCenterPhaseView = (v === 'playoff') ? 'playoff' : 'regular';
  G._matchCenterRoundView = 0;
  renderMatchCenter();
}
function renderMatchCenter() {
  const page = $('matchesPage');
  if (!page) return;
  const playoffLogged = typeof getLeagueGameDetails === 'function' ? getLeagueGameDetails({ season: G.season, phase: 'playoff' }) : [];
  let phaseView = String(G._matchCenterPhaseView || '');
  if (!phaseView) phaseView = playoffLogged.length ? 'playoff' : 'regular';
  if (phaseView !== 'playoff') phaseView = 'regular';
  G._matchCenterPhaseView = phaseView;
  const allGames = typeof getLeagueGameDetails === 'function' ? getLeagueGameDetails({ season: G.season, phase: phaseView }) : [];
  const maxRound = allGames.reduce((mx, g) => Math.max(mx, parseNum(g.round, 0)), 0);
  let teamView = parseNum(G._matchCenterTeamView, 0);
  if (teamView < 0 || teamView > 30) teamView = 0;
  if (teamView !== 0 && !getTeam(teamView)) teamView = 0;
  let roundView = parseNum(G._matchCenterRoundView, 0);
  if (roundView < 0 || roundView > maxRound) roundView = 0;
  G._matchCenterTeamView = teamView;
  G._matchCenterRoundView = roundView;

  const sortedAll = [...allGames].sort((a, b) =>
    parseNum(b.round, 0) - parseNum(a.round, 0) ||
    parseNum(a.homeTeamId, 0) - parseNum(b.homeTeamId, 0) ||
    parseNum(a.awayTeamId, 0) - parseNum(b.awayTeamId, 0)
  );
  const teamGames = sortedAll.filter(g => parseNum(g.homeTeamId, 0) === parseNum(G.teamId, 0) || parseNum(g.awayTeamId, 0) === parseNum(G.teamId, 0));
  const recentTeamGames = teamGames.slice(0, 10);
  let filtered = sortedAll;
  if (teamView > 0) {
    filtered = filtered.filter(g => parseNum(g.homeTeamId, 0) === teamView || parseNum(g.awayTeamId, 0) === teamView);
  }
  if (roundView > 0) {
    filtered = filtered.filter(g => parseNum(g.round, 0) === roundView);
  }

  const matchHtml = `
  <div class="card">
    <div class="card-title">🎬 比赛中心</div>
    <div class="grid g3">
      <div class="stat-box"><div class="stat-val">${sortedAll.length}</div><div class="stat-lbl">已记录比赛</div></div>
      <div class="stat-box"><div class="stat-val">${teamGames.length}</div><div class="stat-lbl">本队比赛</div></div>
      <div class="stat-box"><div class="stat-val">${maxRound || 0}</div><div class="stat-lbl">${phaseView === 'playoff' ? '季后赛轮次' : '常规赛轮次'}</div></div>
    </div>
  </div>
  <div class="card">
    <div class="card-title">${phaseView === 'playoff' ? '📋 本队最近季后赛（双方盒分）' : '📋 本队最近比赛（双方盒分）'}</div>
    <div class="tbl"><table><thead><tr>
      <th>#</th><th>轮次</th><th>对阵</th><th>比分</th><th>结果</th><th>标记</th><th>详情</th>
    </tr></thead><tbody>
      ${renderMatchCenterRows(recentTeamGames, { perspectiveTeamId: G.teamId })}
    </tbody></table></div>
  </div>
  <div class="card">
    <div class="card-title">🌐 ${phaseView === 'playoff' ? '季后赛' : '常规赛'} 比赛与数据</div>
    <div class="grid g3">
      <div class="form-group">
        <label>阶段切换</label>
        <select class="form-control" id="matchCenterPhaseSelect" onchange="changeMatchCenterPhaseFilter()">
          <option value="regular" ${phaseView === 'regular' ? 'selected' : ''}>常规赛</option>
          <option value="playoff" ${phaseView === 'playoff' ? 'selected' : ''}>季后赛</option>
        </select>
      </div>
      <div class="form-group">
        <label>球队筛选</label>
        <select class="form-control" id="matchCenterTeamSelect" onchange="changeMatchCenterTeamFilter()">
          <option value="0" ${teamView === 0 ? 'selected' : ''}>联盟全部球队</option>
          ${TEAMS.map(t => `<option value="${t.id}" ${t.id === teamView ? 'selected' : ''}>${t.z} ${t.n} (${t.a})</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>轮次筛选</label>
        <select class="form-control" id="matchCenterRoundSelect" onchange="changeMatchCenterRoundFilter()">
          <option value="0" ${roundView === 0 ? 'selected' : ''}>全部轮次</option>
          ${Array.from({ length: maxRound }, (_, i) => i + 1).map(r => `<option value="${r}" ${r === roundView ? 'selected' : ''}>第${r}轮</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="t-2 fs-sm mb-16">${phaseView === 'playoff' ? '可在此查看季后赛盒分；若尚未打季后赛会显示空列表。' : '点击“双方数据”可查看该场比赛完整盒分。'}</div>
    <div class="tbl" style="max-height:520px;overflow:auto"><table><thead><tr>
      <th>#</th><th>轮次</th><th>对阵</th><th>比分</th><th>结果</th><th>标记</th><th>详情</th>
    </tr></thead><tbody>
      ${renderMatchCenterRows(filtered, { perspectiveTeamId: teamView })}
    </tbody></table></div>
  </div>`;
  page.innerHTML = typeof stripUndefinedTokens === 'function' ? stripUndefinedTokens(matchHtml) : matchHtml;
}

// ============ ROSTER PAGE ============
function renderRoster() {
  const team = getTeam(G.teamId) || {};
  const selfPlayer = createUserRosterSnapshot();
  const rotation = ensureGameRotation();
  const roster = [selfPlayer, ...getTeamPlayers(G.teamId)].sort((a, b) => (b.rating || 0) - (a.rating || 0));
  const coach = getTeamCoach(G.teamId);
  const coachFx = getCoachEffects(G.teamId);
  const rotationSet = new Set(rotation.map(r => String(r.id)));
  const usageContext = typeof buildTeamUsageContext === 'function'
    ? buildTeamUsageContext(G.teamId, roster, rotation)
    : null;

  // 计算球员角色
  function getPlayerUsageLabel(pl) {
    const roles = getPlayerRole ? getPlayerRole(pl, roster, coachFx, usageContext) : [];
    if (roles.length === 0) return '-';
    return roles.map(r => r.name).join('/');
  }

  $('rosterPage').innerHTML = `
  <div class="card">
    <div class="flex fb">
      <div class="player-head">
        <div class="team-logo" style="width:68px;height:68px;background:${team.cl || '#2d5ab8'}">${teamLogoMarkup(team, 68)}</div>
        <div>
          <div class="fw-b fs-lg">${team.z || team.n || '球队'} (${team.a || '--'})</div>
          <div class="t-2 fs-sm mt-12">球队强度: ${getTeamStrength(G.teamId)} | 全队人数: ${roster.length}</div>
        </div>
      </div>
      <button class="btn btn-gold" onclick="navTo('upgrade')">去加点</button>
      ${G.dayNum <= G.tradeDeadline ? `<button class="btn btn-danger" onclick="doRequestTrade()">申请交易</button>` : '<button class="btn btn-disabled">交易截止</button>'}
    </div>
  </div>

  ${coach ? `<div class="card">
    <div class="card-title">🏀 教练信息</div>
    <div class="grid g2" style="gap:12px">
      <div>
        <div class="fw-b">${coach.name}</div>
        <div class="t-2 fs-sm">年龄: ${coach.age || '-'} | 合同: ${coach.yearsContract || '-'}年</div>
      </div>
      <div class="t-2 fs-sm">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
          <div>📊 战术水平: <span class="fw-b">${coachFx.techLevel >= 0 ? '+' : ''}${coachFx.techLevel}</span></div>
          <div>📈 培养能力: <span class="fw-b">${coachFx.techDev >= 0 ? '+' : ''}${coachFx.techDev}</span></div>
          <div>🎯 内线倾向: <span class="fw-b">${coachFx.baseShotInt || 40}</span></div>
          <div>🏹 三分倾向: <span class="fw-b">${coachFx.baseShotTriple || 40}</span></div>
          <div>⚔️ 进攻体系: <span class="fw-b">${coachFx.baseOff || 40}</span></div>
          <div>🛡️ 防守体系: <span class="fw-b">${coachFx.baseDef || 40}</span></div>
          <div>❤️ 忠诚度: <span class="fw-b">${coachFx.loyalty || 5}</span></div>
          <div>📊 综合倍率: <span class="fw-b">×${coachFx.teamRatingMult?.toFixed(2) || '1.00'}</span></div>
        </div>
      </div>
    </div>
    <div class="t-2 fs-sm mt-12" style="padding:8px;background:rgba(0,0,0,.2);border-radius:6px">
      <span style="color:var(--cyan)">进攻加成:</span> ${coachFx.offPct >= 0 ? '+' : ''}${(coachFx.offPct * 100).toFixed(1)}% | 
      <span style="color:var(--cyan)">防守加成:</span> ${coachFx.defPct >= 0 ? '+' : ''}${(coachFx.defPct * 100).toFixed(1)}% | 
      <span style="color:var(--cyan)">XP加成:</span> ${coachFx.xpPct >= 0 ? '+' : ''}${(coachFx.xpPct * 100).toFixed(1)}%
    </div>
  </div>` : ''}

  <div class="card">
    <div class="card-title">球队轮换（点击球员查看详情）</div>
    ${rotation.length ? `<div class="tbl"><table><thead><tr><th>轮换</th><th>球员</th><th>位置</th><th>评分</th><th>分钟</th><th>球权</th><th>照片</th></tr></thead><tbody>
      ${rotation.map((rp, i) => `<tr>
        <td>${i + 1}</td>
        <td>
          ${rp.isSelf ? `<button class="player-link" onclick="showMyPlayerModal()">${rp.name}</button> <span class="badge b-gold">你</span>` : `<button class="player-link" onclick="showTeamPlayerModal(${G.teamId},${rp.id})">${rp.name}</button>`}
          <span class="badge b-pri">${getRotationRoleLabel(rp.rotationRole)}</span>
        </td>
        <td>${getRotationPositionDisplay(rp, i)}</td>
        <td>${rp.rating}</td>
        <td>${rp.minutes}</td>
        <td><span class="badge b-cyan">${getPlayerUsageLabel(rp)}</span></td>
        <td><img src="${getPlayerPhotoSrc(rp)}" style="width:34px;height:34px;border-radius:6px;object-fit:contain;background:rgba(0,0,0,.25)" onerror="if(!this.dataset.fb){this.dataset.fb='1';this.src='${getPlayerPhotoPath(0)}';}else{this.style.opacity=.2}"></td>
      </tr>`).join('')}
    </tbody></table></div>`: '<div class="t-2">未加载到真实数据，当前使用默认模拟。</div>'}
  </div>

  <div class="card">
    <div class="card-title">全队球员数据与属性（点击球员查看详情）</div>
    ${roster.length ? `<div class="tbl"><table><thead><tr>
      <th>#</th><th>球员</th><th>位置</th><th>OVR</th><th>POT</th><th>年龄</th><th>球权</th>
      <th>传球</th><th>内线</th><th>三分</th><th>罚球</th><th>体能</th><th>盖帽</th><th>篮板</th><th>抢断</th><th>照片</th>
    </tr></thead><tbody>
      ${roster.map((pl, i) => `<tr class="${pl.isSelf ? 'self-row' : (rotationSet.has(String(pl.id)) ? 'hl-row' : '')}">
        <td>${i + 1}</td>
        <td>
          ${pl.isSelf ? `<button class="player-link" onclick="showMyPlayerModal()">${pl.name}</button> <span class="badge b-gold">你</span>` : `<button class="player-link" onclick="showTeamPlayerModal(${G.teamId},${pl.id})">${pl.name}</button>`}
          ${pl.rookie ? '<span class="badge b-cyan">新秀</span>' : ''}
          ${rotationSet.has(String(pl.id)) ? '<span class="badge b-pri">轮换</span>' : ''}
        </td>
        <td>${posLabel(pl.pos)}${pl.pos2 ? `/${posLabel(pl.pos2)}` : ''}</td>
        <td>${pl.rating}</td>
        <td>${pl.potential}</td>
        <td>${pl.age}</td>
        <td><span class="badge b-cyan fs-xs">${getPlayerUsageLabel(pl)}</span></td>
        <td>${pl.attrs?.pass ?? 0}</td>
        <td>${pl.attrs?.shotInt ?? 0}</td>
        <td>${pl.attrs?.shotExt ?? 0}</td>
        <td>${pl.attrs?.shotFree ?? 0}</td>
        <td>${pl.attrs?.physique ?? 0}</td>
        <td>${pl.attrs?.blk ?? 0}</td>
        <td>${pl.attrs?.reb ?? 0}</td>
        <td>${pl.attrs?.stl ?? 0}</td>
        <td><img src="${getPlayerPhotoSrc(pl)}" style="width:34px;height:34px;border-radius:6px;object-fit:contain;background:rgba(0,0,0,.25)" onerror="if(!this.dataset.fb){this.dataset.fb='1';this.src='${getPlayerPhotoPath(0)}';}else{this.style.opacity=.2}"></td>
      </tr>`).join('')}
    </tbody></table></div>`: '<div class="t-2">暂无球员列表</div>'}
  </div>
  `;
}

// ============ UPGRADE PAGE ============
function renderUpgrade() {
  const p = G.player;
  const playerBadges = (p.badges && typeof p.badges === 'object') ? p.badges : {};
  const badgeBonuses = typeof getBadgeAttrBonuses === 'function' ? getBadgeAttrBonuses(p) : {};
  $('upgradePage').innerHTML = `
  <div class="grid g2">
    <div class="card">
      <div class="card-title">💪 属性加点 (XP: <span class="t-gold">${p.xp}</span>)</div>
      ${ATTRS.map(at => {
    const v = p.attrs[at.k];
    const bonus = Math.round(parseNum(badgeBonuses[at.k], 0));
    const cost = getUpgradeCost(v);
    const maxed = v >= 99;
    const bonusTag = bonus > 0 ? `<span class="t-cyan fs-xs" style="margin-left:2px">(+${bonus})</span>` : '';
    return `<div class="flex fb" style="margin-bottom:10px">
          <span class="fs-sm" style="width:50px">${at.n}</span>
          <div class="bar" style="flex:1;margin:0 8px"><div class="bar-fill ${barClass(v + bonus)}" style="width:${Math.min(v + bonus, 99)}%"></div></div>
          <span class="fw-b" style="width:50px;text-align:right">${v}${bonusTag}</span>
          <button class="btn btn-sm btn-gold" style="margin-left:8px" onclick="doUpgrade('${at.k}')"
            ${maxed || p.xp < cost ? 'disabled' : ''}>${maxed ? 'MAX' : cost + 'XP'}</button>
        </div>`;
  }).join('')}
    </div>
    <div class="card">
      <div class="card-title">🎖 徽章升级</div>
      ${BADGES.map(b => {
    const lv = playerBadges[b.id] || 0;
    const costs = [0, 30, 80, 180, 400];
    const nextCost = lv < 4 ? costs[lv + 1] : 0;
    const icon = typeof getBadgeIconMarkup === 'function'
      ? getBadgeIconMarkup(b, 16)
      : (b.icon || (typeof getBadgeCategoryIcon === 'function' ? getBadgeCategoryIcon(b.cat) : '🎖️'));
    const reqText = typeof getBadgeRequirementText === 'function' ? getBadgeRequirementText(b) : (b.req || '无');
    const reqMet = typeof isBadgeRequirementMet === 'function' ? isBadgeRequirementMet(G.player, b.id, { allowLegendFallback: false }) : true;
    const effectText = typeof getBadgeEffectShortText === 'function'
      ? (getBadgeEffectShortText(b.effect, Math.max(1, lv || 1)) || b.d || '暂无描述')
      : (b.d || '暂无描述');
    return `<div class="flex fb" style="margin-bottom:10px;align-items:flex-start">
          <div style="padding-right:8px">
            <div><span class="fw-b fs-sm">${icon} ${b.n}</span>
            <span class="tag ${badgeTierClass(lv)}">${badgeTierName(lv)}</span></div>
            <div class="t-2 fs-xs mt-12">${effectText}</div>
            <div class="t-2 fs-xs mt-12" style="color:${reqMet || lv > 0 ? '#9ad0ff' : '#ff9a9a'}">${reqMet || lv > 0 ? '✅' : '⛔'} 要求: ${reqText}</div>
          </div>
          <button class="btn btn-sm btn-purple" onclick="doUpgradeBadge('${b.id}')"
            ${lv >= 4 || p.xp < nextCost ? 'disabled' : ''}>${lv >= 4 ? 'HOF' : nextCost + 'XP'}</button>
        </div>`;
  }).join('')}
    </div>
  </div>
  <div class="card">
    <div class="card-title">🎯 倾向升级 (XP: <span class="t-gold">${p.xp}</span>)</div>
    <div class="t-2 fs-xs mb-16">倾向影响比赛中的出手分配 (上限100)，升级后会重新计算徽章</div>
    ${[
      { k: 'in', n: '内线倾向', d: '越高越多内线出手', color: '#e74c3c' },
      { k: 'mid', n: '中投倾向', d: '越高越多中距离出手', color: '#f39c12' },
      { k: 'ex', n: '外线倾向', d: '越高越多三分出手', color: '#3498db' }
    ].map(t => {
      const v = parseNum(p.tendencies?.[t.k], 55);
      const maxed = v >= 100;
      const cost = typeof getTendencyUpgradeCost === 'function' ? getTendencyUpgradeCost(v) : 10;
      return `<div class="flex fb" style="margin-bottom:10px">
        <span class="fs-sm" style="width:70px">${t.n}</span>
        <div class="bar" style="flex:1;margin:0 8px"><div class="bar-fill" style="width:${v}%;background:${t.color}"></div></div>
        <span class="fw-b" style="width:36px;text-align:right;color:${t.color}">${v}</span>
        <button class="btn btn-sm btn-gold" style="margin-left:8px" onclick="doUpgradeTendency('${t.k}')"
          ${maxed || p.xp < cost ? 'disabled' : ''}>${maxed ? 'MAX' : cost + 'XP'}</button>
      </div>`;
    }).join('')}
  </div>`;
}

function doUpgrade(key) {
  const cost = getUpgradeCost(G.player.attrs[key]);
  if (spendXP(key, cost)) { renderUpgrade(); updateHeader(); }
}

function doUpgradeBadge(id) {
  if (upgradeBadge(id)) renderUpgrade();
}

// 倾向XP升级
function doUpgradeTendency(key) {
  const v = parseNum(G.player.tendencies?.[key], 55);
  const cost = typeof getTendencyUpgradeCost === 'function' ? getTendencyUpgradeCost(v) : 10;
  if (typeof spendTendencyXP === 'function' && spendTendencyXP(key, cost)) {
    renderUpgrade();
    updateHeader();
  }
}

// ============ TRADE PAGE ============
function renderTrade() {
  if (typeof recalcPlayerTradeValue === 'function') recalcPlayerTradeValue();
  const others = TEAMS.filter(t => t.id !== G.teamId);
  $('tradePage').innerHTML = `
  <div class="card">
    <div class="card-title">🔄 交易中心</div>
    <div class="t-2 mb-16">当前球队: <span class="fw-b">${G.team.z}</span> | 交易价值 ${G.player.tradeValue}</div>
    <div class="form-group"><label>选择目标球队</label>
      <select class="form-control" id="tradeTarget">
        ${others.map(t => `<option value="${t.id}">${t.z} ${t.n} (${t.a}) - 强度${getTeamStrength(t.id)}</option>`).join('')}
      </select>
    </div>
    <div class="t-2 fs-sm mb-16">流程：按APK逻辑先生成双方1-3人交易筹码，再确认提交交易请求。</div>
    <button class="btn btn-gold" onclick="doRequestTrade()">📤 生成交易筹码</button>
    <div id="tradeResult" class="mt-16"></div>
  </div>`;
}

function doTrade() {
  doRequestTrade();
}
function formatSalaryM(v, digits = 2) {
  if (typeof formatSalaryMillion === 'function') return formatSalaryMillion(v, digits);
  const n = parseNum(v, 0);
  const m = n > 500000 ? (n / 1000000) : n;
  return m.toFixed(digits);
}

function setTradeResultMessage(html) {
  const box = $('tradeResult');
  if (box) box.innerHTML = html;
}
function tradeFailReasonText(reason) {
  const map = {
    rejected: '对方经理拒绝了报价',
    deadline: '交易截止日已过',
    same_team: '不能向当前球队交易',
    asset_changed: '交易筹码状态变化，请重新生成',
    contract: '包含到期合同，无法交易',
    injury: '包含伤病球员，无法交易',
    salary: '双方薪资不匹配',
    salary_cap: '触发球队薪资上限规则',
    positions: '目标球队阵容位置失衡',
    value_rule: '价值规则不满足',
    invalid: '交易方案无效'
  };
  return map[reason] || '交易未通过';
}
function renderTradeAssetPackageRows(assets, emptyText = '无') {
  const list = Array.isArray(assets) ? assets : [];
  if (!list.length) return `<div class="t-2 fs-sm">${emptyText}</div>`;
  return list.map(a => {
    const posText = `${posLabel(a.pos)}${parseNum(a.pos2, 0) ? `/${posLabel(a.pos2)}` : ''}`;
    const rating = parseNum(a.rating, 70);
    const potential = parseNum(a.potential, rating);
    const salary = formatSalaryM(a.salary, 2);
    const value = parseNum(a.value, rating);
    return `
      <div class="ev neu" style="margin-bottom:8px;padding:10px">
        <div class="flex fb">
          <div class="fw-b">${a.name || '球员'} ${a.isUser ? '<span class="badge b-gold">你</span>' : ''}</div>
          <span class="badge b-cyan">估值 ${value}</span>
        </div>
        <div class="t-2 fs-sm mt-12">${posText} | OVR ${rating} | POT ${potential} | $${salary}M</div>
      </div>
    `;
  }).join('');
}
function renderUserTradeProposalModal(proposal) {
  if (!proposal || !proposal.team) return;
  const outgoing = Array.isArray(proposal.outgoing) && proposal.outgoing.length
    ? proposal.outgoing
    : [{
      id: 'USER_SELF',
      name: G.player.name,
      pos: G.player.pos,
      pos2: 0,
      rating: ovr(G.player.attrs || {}),
      potential: G.player.potential,
      salary: parseNum(G.player.salary, 0),
      isUser: true,
      value: parseNum(G.player.tradeValue, 50)
    }];
  const incoming = Array.isArray(proposal.incoming) && proposal.incoming.length
    ? proposal.incoming
    : (proposal.player ? [proposal.player] : []);
  const myVal = parseNum(proposal.outgoingValue, parseNum(proposal.myValue, parseNum(G.player.tradeValue, 50)));
  const theirVal = parseNum(proposal.incomingValue, parseNum(proposal.targetValue, parseNum(incoming[0]?.rating, 70)));
  const mySalaryNum = normalizeSalaryMillion(parseNum(proposal.outgoingSalary, outgoing.reduce((s, a) => s + normalizeSalaryMillion(a?.salary), 0)));
  const theirSalaryNum = normalizeSalaryMillion(parseNum(proposal.incomingSalary, incoming.reduce((s, a) => s + normalizeSalaryMillion(a?.salary), 0)));
  const mySalary = mySalaryNum.toFixed(2);
  const theirSalary = theirSalaryNum.toFixed(2);
  const cap = parseNum(typeof LEAGUE_SALARY_CAP_M === 'number' ? LEAGUE_SALARY_CAP_M : 170, 170);
  const myPayrollBase = (typeof teamPayrollMillion === 'function' ? teamPayrollMillion(G.teamId) : 0) + normalizeSalaryMillion(G.player.salary);
  const theirPayrollBase = (typeof teamPayrollMillion === 'function' ? teamPayrollMillion(parseNum(proposal.team?.id, 0)) : 0);
  const myPayrollAfter = +(myPayrollBase - mySalaryNum + theirSalaryNum).toFixed(2);
  const theirPayrollAfter = +(theirPayrollBase - theirSalaryNum + mySalaryNum).toFixed(2);
  const chance = Math.round(clamp(parseNum(proposal.acceptChance, 0.5), 0.05, 0.95) * 100);
  showModal(`
    <div class="modal-hd">
      <h3>📤 APK风格主动交易</h3>
      <button class="modal-x" onclick="doCancelUserTrade()">✕</button>
    </div>
    <div class="grid g2">
      <div class="card" style="margin:0">
        <div class="card-title">你方送出 (${outgoing.length}人)</div>
        ${renderTradeAssetPackageRows(outgoing, '无可送出筹码')}
        <div class="t-2 fs-sm mt-12">折算估值: <span class="fw-b">${myVal}</span> | 薪资: <span class="fw-b">$${mySalary}M</span></div>
      </div>
      <div class="card" style="margin:0">
        <div class="card-title">${proposal.team.z} 送出 (${incoming.length}人)</div>
        ${renderTradeAssetPackageRows(incoming, '无可回收筹码')}
        <div class="t-2 fs-sm mt-12">折算估值: <span class="fw-b">${theirVal}</span> | 薪资: <span class="fw-b">$${theirSalary}M</span></div>
      </div>
    </div>
    <div class="card" style="margin:12px 0 0 0;padding:12px">
      <div class="t-2 fs-sm">价值差: ${Math.abs(theirVal - myVal)} | 预计通过率: <span class="fw-b">${chance}%</span></div>
      ${proposal.valueRange ? `<div class="t-2 fs-sm mt-12">APK估值窗口: ${proposal.valueRange.min} ~ ${proposal.valueRange.max}</div>` : ''}
      <div class="t-2 fs-sm mt-12">交易后薪资: 你方 ${myPayrollAfter.toFixed(2)}M / ${cap.toFixed(0)}M；对方 ${theirPayrollAfter.toFixed(2)}M / ${cap.toFixed(0)}M</div>
    </div>
    <div class="grid g2 mt-16">
      <button class="btn btn-danger" onclick="doCancelUserTrade()">取消</button>
      <button class="btn btn-gold" onclick="doConfirmUserTrade()">确认并提交交易</button>
    </div>
  `);
}
function doRequestTrade(targetId = 0) {
  if (G.dayNum > G.tradeDeadline) {
    const text = '<div class="ev neg">❌ 交易截止日已过，无法申请交易</div>';
    setTradeResultMessage(text);
    alert('交易截止日已过，无法申请交易');
    return;
  }
  let tid = parseNum(targetId, 0);
  const teamSelect = $('tradeTarget');
  if (!tid && teamSelect) tid = parseNum(teamSelect.value, 0);
  if (!tid) {
    const others = TEAMS.filter(t => t.id !== G.teamId);
    if (!others.length) {
      setTradeResultMessage('<div class="ev neg">❌ 当前没有可交易的目标球队</div>');
      return;
    }
    // 从阵容页直接发起时，先让用户选择目标球队
    if (!teamSelect) {
      showModal(`
        <div class="modal-hd">
          <h3>选择目标球队</h3>
          <button class="modal-x" onclick="hideModal()">✕</button>
        </div>
        <div class="form-group">
          <label>目标球队</label>
          <select class="form-control" id="quickTradeTarget">
            ${others.map(t => `<option value="${t.id}">${t.z} ${t.n} (${t.a}) - 强度${getTeamStrength(t.id)}</option>`).join('')}
          </select>
        </div>
        <button class="btn btn-gold" onclick="const tid=parseNum($('quickTradeTarget')?.value,0); hideModal(); doRequestTrade(tid);">下一步：生成交易筹码</button>
      `);
      return;
    }
    tid = parseNum(others[0].id, 0);
  }
  if (tid === G.teamId) {
    setTradeResultMessage('<div class="ev neg">❌ 不能向当前球队发起交易</div>');
    return;
  }
  const proposal = typeof buildUserTradeProposal === 'function' ? buildUserTradeProposal(tid) : null;
  if (!proposal) {
    const t = getTeam(tid);
    setTradeResultMessage(`<div class="ev neg">❌ 未能与${t?.z || '目标球队'}生成有效交易筹码</div>`);
    return;
  }
  G.pendingUserTrade = proposal;
  setTradeResultMessage('<div class="ev neu">📋 已生成交易筹码，请在弹窗中确认提交</div>');
  renderUserTradeProposalModal(proposal);
}
function doConfirmUserTrade() {
  const req = G.pendingUserTrade;
  if (!req) return;
  const chance = Math.round(clamp(parseNum(req.acceptChance, 0.5), 0.05, 0.95) * 100);
  const result = typeof executeUserTradeRequest === 'function'
    ? executeUserTradeRequest(req)
    : { ok: requestTrade(req.team?.id), chance: chance / 100 };
  G.pendingUserTrade = null;
  hideModal();
  if (result.ok) {
    updateHeader();
    if ($('tradePage').classList.contains('active')) renderTrade();
    if ($('rosterPage').classList.contains('active')) renderRoster();
    setTradeResultMessage(`<div class="ev pos">✅ 交易通过！你已加入${req.team.z}</div>`);
  } else {
    const reasonText = tradeFailReasonText(result.reason);
    const chanceText = result.reason === 'rejected' ? `（预计通过率 ${chance}%）` : '';
    setTradeResultMessage(`<div class="ev neg">❌ ${reasonText}${chanceText}</div>`);
  }
}
function doCancelUserTrade() {
  G.pendingUserTrade = null;
  hideModal();
}

// ============ AWARDS PAGE ============
function renderAwards() {
  if (typeof updateUserHallOfFameProgress === 'function') updateUserHallOfFameProgress();
  const myAwards = [...(G.allAwards || [])].sort((a, b) => parseNum(b?.season, 0) - parseNum(a?.season, 0));
  const leagueAwards = [...(G.leagueAwards || [])].sort((a, b) => parseNum(b?.season, 0) - parseNum(a?.season, 0));
  const leagueBySeason = new Map(leagueAwards.map(a => [parseNum(a?.season, 0), a]));
  const hof = typeof getUserHallOfFameProfile === 'function' ? getUserHallOfFameProfile() : null;
  const hofList = [...(G.hallOfFame || [])].sort((a, b) => parseNum(b?.score, 0) - parseNum(a?.score, 0));

  $('awardsPage').innerHTML = `
  <div class="card">
    <div class="card-title">🏆 荣誉殿堂</div>
    ${myAwards.length === 0 ? '<div class="t-2 tc">暂无荣誉</div>' : ''}
    ${myAwards.map(a => {
    const seasonLeague = leagueBySeason.get(parseNum(a?.season, 0));
    const seasonAwards = (seasonLeague && typeof buildUserAwardsFromLeague === 'function')
      ? buildUserAwardsFromLeague(seasonLeague, { includeFinals: true })
      : (Array.isArray(a.awards) ? a.awards : []);
    return `
      <div class="ev ${a.champion ? 'special' : 'pos'}" style="margin-bottom:12px">
        <div class="flex fb">
          <span class="fw-b">${a.year}-${a.year + 1} 赛季</span>
          <span class="t-2 fs-sm">${getTeam(a.team)?.z || '--'} | ${a.wins}-${a.losses}</span>
        </div>
        <div class="mt-12">
          ${seasonAwards.map(aw => `<span class="badge b-gold">${aw}</span> `).join('')}
          ${a.champion ? '<span class="badge b-cyan">🏆 总冠军</span>' : ''}
        </div>
        <div class="t-2 fs-sm mt-12">
          场均 ${a.stats?.ppg ?? 0}分 / ${a.stats?.apg ?? 0}助 / ${a.stats?.rpg ?? 0}板 / ${a.stats?.spg ?? 0}断 / ${a.stats?.bpg ?? 0}帽
        </div>
      </div>`;
  }).join('')}
  </div>`;

  if (leagueAwards.length) {
    $('awardsPage').innerHTML += `
    <div class="card">
      <div class="card-title">🌐 联盟奖项记录</div>
      ${leagueAwards.map(a => `
        <div class="ev neu">
          <div class="flex fb"><span class="fw-b">${a.year}-${a.year + 1}</span><span class="t-2 fs-sm">第${a.season}赛季</span></div>
          ${a.mvp ? `<div class="t-2 fs-sm mt-12">MVP: ${a.mvp.name} (${a.mvp.team}) ${a.mvp.ppg ?? '--'}分</div>` : ''}
          ${a.dpoy ? `<div class="t-2 fs-sm mt-12">DPOY: ${a.dpoy.name} (${a.dpoy.team}) STOCK ${a.dpoy.stocks ?? '--'}</div>` : ''}
          ${a.roy ? `<div class="t-2 fs-sm mt-12">ROY: ${a.roy.name} (${a.roy.team}) ${a.roy.ppg ?? '--'}分</div>` : ''}
          ${a.scoring ? `<div class="t-2 fs-sm mt-12">得分王: ${a.scoring.name} (${a.scoring.team}) ${a.scoring.ppg ?? '--'}分</div>` : ''}
          ${a.fmvp ? `<div class="t-2 fs-sm mt-12">FMVP: ${a.fmvp.name} (${a.fmvp.team})</div>` : ''}
          ${Array.isArray(a.allNba1) && a.allNba1.length ? `<div class="t-2 fs-sm mt-12">最佳阵容一阵: ${a.allNba1.map(x => x.name).join(' / ')}</div>` : ''}
        </div>
      `).join('')}
    </div>`;
  }

  $('awardsPage').innerHTML += `
  <div class="card">
    <div class="card-title">🏛 名人堂（APK规则）</div>
    ${hof ? `
      <div class="mb-16">当前积分: <span class="fw-b">${hof.score}</span> / ${hof.threshold}
        ${hof.eligible ? '<span class="badge b-gold">达到门槛</span>' : '<span class="badge b-pri">尚未达标</span>'}
      </div>
      <div class="t-2 fs-sm mb-16">
        MVP ${hof.counts.mvp} | FMVP ${hof.counts.fmvp} | 一阵 ${hof.counts.allNba1} | 二阵 ${hof.counts.allNba2} | 三阵 ${hof.counts.allNba3} | DPOY ${hof.counts.dpoy} | 总冠军 ${hof.counts.rings}
      </div>
    ` : '<div class="t-2">暂未生成名人堂数据</div>'}
    <div class="fw-b mb-12">入选列表</div>
    ${hofList.length ? hofList.map(h => `
      <div class="ev pos" style="margin-bottom:10px">
        <div class="flex fb"><span class="fw-b">${h.name}</span><span class="badge b-gold">${h.score}分</span></div>
        <div class="t-2 fs-sm mt-12">入选赛季: 第${h.inductedSeason}赛季 (${h.inductedYear}年) | 冠军 ${h.rings || 0} 枚</div>
      </div>
    `).join('') : '<div class="t-2 fs-sm">暂无入选记录</div>'}
  </div>`;
}

// ============ PHONE PAGE ============
// 效果键中文翻译
function translateEffectKey(key) {
  const map = { fame: '声望', trust: '信任', money: '金钱', xp: '经验', stamina: '体力', games: '缺阵', injury: '受伤风险', risk: '风险' };
  return map[key] || key;
}
function formatEffectText(eff) {
  return Object.entries(eff).map(([k, v]) => `${translateEffectKey(k)}:${v > 0 ? '+' : ''}${v}`).join(' ');
}
function phoneFmtM(v) {
  return `${parseNum(v, 0).toFixed(2)}M`;
}
function formatPhoneTime(ts, dayArg = null) {
  // Uses specific day if provided (for historic posts), otherwise current day
  const day = dayArg !== null ? parseNum(dayArg, 0) : parseNum(G.dayNum, 0);
  const gameDate = typeof getDayDateString === 'function' ? getDayDateString(Math.max(0, day)) : '';
  const h = String(8 + (parseNum(ts, 0) % 14)).padStart(2, '0');
  const m = String(parseNum(ts, 0) % 60).padStart(2, '0');
  return `${gameDate} ${h}:${m}`;
}
function setPhoneTab(tab) {
  G._phoneTab = tab;
  renderPhone();
}
function getPhoneTab() {
  const allowed = new Set(['feed', 'compose', 'market', 'inbox']);
  const tab = String(G._phoneTab || 'feed');
  return allowed.has(tab) ? tab : 'feed';
}
function renderPhoneFeedTab() {
  const timeline = typeof getSocialTimeline === 'function' ? getSocialTimeline(50) : [];
  if (!timeline.length) {
    return `
    <div class="card" style="margin:0">
      <div class="t-2">今日推文尚未生成。</div>
      <button class="btn btn-gold mt-12" onclick="doPhoneGenerateTweets()">补生成当天推文</button>
    </div>`;
  }
  return timeline.map(post => {
    const replied = !!(G.social?.playerRepliedPostIds?.[String(post.id)]);
    const comments = Array.isArray(post.comments) ? post.comments.slice(0, 4) : [];
    return `
    <div class="card" style="margin-bottom:10px">
      <div class="flex fb">
        <div>
          <span class="fw-b">${post.author}</span>
          <span class="badge b-pri">${post.persona || '中立'}</span>
          ${post.isPlayer ? '<span class="badge b-gold">你</span>' : ''}
        </div>
        <span class="t-2 fs-xs">${formatPhoneTime(post.ts, post.day)}</span>
      </div>
      <div class="mt-12">${post.text || ''}</div>
      <div class="t-2 fs-sm mt-12">👍 ${parseNum(post.likes, 0)} | 🔁 ${parseNum(post.reposts, 0)} | 💬 ${Array.isArray(post.comments) ? post.comments.length : 0}</div>
      ${comments.length ? `<div class="mt-12" style="padding:8px;background:rgba(255,255,255,.04);border-radius:8px">
        ${comments.map(c => `<div class="fs-sm" style="margin-bottom:6px"><span class="fw-b">${c.author}</span>: ${c.text}</div>`).join('')}
      </div>` : ''}
      ${replied ? '<div class="t-2 fs-sm mt-12">你已回复过这条推文</div>' : `
      <div class="mt-12">
        <textarea id="phoneReply_${post.id}" class="form-control" rows="2" placeholder="回复这条推文（每条仅一次）"></textarea>
        <button class="btn btn-cyan mt-12" onclick="doPhoneReply(${post.id})">发送回复</button>
      </div>`}
    </div>`;
  }).join('');
}
function renderPhoneComposeTab() {
  const tip = G._phoneComposeResult ? `<div class="ev ${G._phoneComposeResult.ok ? 'pos' : 'neg'}">${G._phoneComposeResult.message}</div>` : '';
  return `
  <div class="card" style="margin:0">
    <div class="card-title">✍️ 发布推文</div>
    ${tip}
    <textarea id="phoneComposeInput" class="form-control" rows="5" placeholder="输入你的推文，建议结合比赛与团队内容（当天最多3条）"></textarea>
    <div class="t-2 fs-sm mt-12">规则：发言会影响声望与信任；挑衅/逼宫倾向会明显降低信任。</div>
    <button class="btn btn-gold mt-12" onclick="doPhonePostTweet()">发布</button>
  </div>`;
}
function renderPhoneMarketTab() {
  const shop = typeof buildEconomyShopView === 'function' ? buildEconomyShopView() : null;
  if (!shop) return '<div class="card" style="margin:0"><div class="t-2">商城未加载</div></div>';
  const staminaNext = shop.staminaNext;
  const trainingNext = shop.trainingNext;
  const purchaseMsg = G._phoneShopResult ? `<div class="ev ${G._phoneShopResult.ok ? 'pos' : 'neg'}" style="margin-bottom:10px">${G._phoneShopResult.message}</div>` : '';
  return `
  <div class="card" style="margin:0">
    <div class="card-title">💰 资产与团队</div>
    ${purchaseMsg}
    <div class="grid g2">
      <div class="stat-box"><div class="stat-val">$${phoneFmtM(shop.cash)}</div><div class="stat-lbl">现金</div></div>
      <div class="stat-box"><div class="stat-val">$${phoneFmtM(G.player.salary)}</div><div class="stat-lbl">年薪</div></div>
    </div>
    <div class="mt-16">
      <div class="fw-b">体能教练：Lv.${shop.staminaLevel}（${shop.staminaCurrent?.name || '未聘请'}）</div>
      <div class="t-2 fs-sm mt-12">休息恢复 +${parseNum(shop.staminaCurrent?.restBonus, 0)} | 赛后恢复 +${parseNum(shop.staminaCurrent?.gameBonus, 0)} | 伤病系数 ×${parseNum(shop.staminaCurrent?.injuryMult, 1).toFixed(2)}</div>
      ${staminaNext ? `<button class="btn btn-pri mt-12" onclick="doPhoneBuyStaminaCoach()">升级到 ${staminaNext.name}（$${phoneFmtM(staminaNext.cost)}）</button>` : '<div class="t-2 fs-sm mt-12">已满级</div>'}
    </div>
    <div class="mt-16">
      <div class="fw-b">训练教练：Lv.${shop.trainingLevel}（${shop.trainingCurrent?.name || '未聘请'}）</div>
      <div class="t-2 fs-sm mt-12">训练 XP 倍率 ×${parseNum(shop.trainingCurrent?.xpMult, 1).toFixed(2)}</div>
      ${trainingNext ? `<button class="btn btn-pri mt-12" onclick="doPhoneBuyTrainingCoach()">升级到 ${trainingNext.name}（$${phoneFmtM(trainingNext.cost)}）</button>` : '<div class="t-2 fs-sm mt-12">已满级</div>'}
    </div>
    <div class="mt-16">
      <div class="fw-b mb-12">豪宅 / 跑车 / 奢侈品</div>
      ${shop.luxury.map(it => `
        <div class="ev neu" style="margin-bottom:8px">
          <div class="flex fb">
            <span class="fw-b">${it.name}</span>
            <span class="t-2">$${phoneFmtM(it.cost)}</span>
          </div>
          <div class="t-2 fs-sm mt-12">购买后：声望 ${it.fame >= 0 ? '+' : ''}${it.fame}，信任 ${it.trust >= 0 ? '+' : ''}${it.trust}</div>
          ${it.owned ? '<span class="badge b-ok mt-12">已拥有</span>' : `<button class="btn btn-cyan btn-sm mt-12" onclick="doPhoneBuyLuxury('${it.id}')">购买</button>`}
        </div>
      `).join('')}
    </div>
    ${shop.logs.length ? `<div class="mt-16"><div class="fw-b mb-12">最近流水</div>${shop.logs.slice(0, 8).map(l => `<div class="t-2 fs-sm">${formatPhoneTime(l.ts)} ${l.text}</div>`).join('')}</div>` : ''}
  </div>`;
}
function renderPhoneInboxTab() {
  const msgs = G.phone || [];
  return `
  <div class="card" style="margin:0">
    <div class="card-title">📩 消息列表</div>
    ${msgs.length ? msgs.map(m => `
      <div class="list-item">
        <div class="flex fb mb-4"><span class="fw-b">${m.from}</span><span class="t-2 fs-xs">${formatPhoneTime(m.ts)}</span></div>
        <div class="fs-sm">${m.text}</div>
      </div>
    `).join('') : '<div class="t-2">暂无消息</div>'}
  </div>`;
}
function renderPhone() {
  if (typeof ensureSocialState === 'function') ensureSocialState();
  if (typeof ensureEconomyState === 'function') ensureEconomyState();
  const pg = $('phonePage');
  const tab = getPhoneTab();
  const tabBtn = (id, label) => `<button class="btn btn-sm ${tab === id ? 'btn-gold' : 'btn-pri'}" style="padding:6px 10px" onclick="setPhoneTab('${id}')">${label}</button>`;
  let content = '';
  if (tab === 'feed') content = renderPhoneFeedTab();
  else if (tab === 'compose') content = renderPhoneComposeTab();
  else if (tab === 'market') content = renderPhoneMarketTab();
  else content = renderPhoneInboxTab();

  const pendingTradeBanner = G.pendingTrade ? `
    <div class="ev neu" style="margin-bottom:10px">
      <div class="fw-b">${G.pendingTrade.team.z} 发来交易邀请</div>
      <div class="t-2 fs-sm mt-12">送出：${G.pendingTrade.player.name}（${G.pendingTrade.player.rating}）</div>
      <div class="grid g2 mt-12">
        <button class="btn btn-gold btn-sm" onclick="doAcceptTradeOffer()">接受</button>
        <button class="btn btn-danger btn-sm" onclick="doRejectTradeOffer()">拒绝</button>
      </div>
    </div>` : '';

  pg.innerHTML = `
  <div style="max-width:440px;margin:0 auto">
    <div style="border:2px solid #27427f;border-radius:28px;overflow:hidden;background:linear-gradient(180deg,#0b1738 0%,#101e45 100%);box-shadow:0 16px 36px rgba(0,0,0,.35)">
      <div style="padding:10px 14px;background:linear-gradient(90deg,#1e3f85,#172f66);display:flex;justify-content:space-between;align-items:center">
        <span class="fw-b">📱 社媒中心</span>
        <span class="t-2 fs-xs">${getDayDateString(Math.max(0, G.dayNum - 1))}</span>
      </div>
      <div style="padding:10px 12px">
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px">
          ${tabBtn('feed', '推文流')}
          ${tabBtn('compose', '发推')}
          ${tabBtn('market', '商城')}
          ${tabBtn('inbox', '消息')}
        </div>
        ${pendingTradeBanner}
        <div style="max-height:72vh;overflow:auto;padding-right:2px">${content}</div>
      </div>
    </div>
  </div>`;
}
async function doPhonePostTweet() {
  const text = $('phoneComposeInput')?.value || '';
  if (typeof postPlayerTweetAsync === 'function') {
    G._phoneComposeResult = { ok: false, message: '正在发布并等待AI评估...' };
    renderPhone();
    try {
      const res = await postPlayerTweetAsync(text);
      const src = res.llmUsed ? '(AI评估)' : '(本地评估)';
      G._phoneComposeResult = { ok: !!res.ok, message: res.ok ? `发布成功${src}：${res.impact?.label || '已生效'}` : (res.message || '发布失败') };
      if (res.ok) updateHeader();
    } catch (e) {
      G._phoneComposeResult = { ok: false, message: `发布失败: ${e?.message || e}` };
    }
    renderPhone();
    return;
  }
  if (typeof postPlayerTweet !== 'function') return;
  const res = postPlayerTweet(text);
  G._phoneComposeResult = { ok: !!res.ok, message: res.ok ? `发布成功：${res.impact?.label || '已生效'}` : (res.message || '发布失败') };
  if (res.ok) updateHeader();
  renderPhone();
}
function doPhoneReply(postId) {
  const box = $(`phoneReply_${postId}`);
  const text = box ? box.value : '';
  if (typeof replyToSocialPost !== 'function') return;
  const res = replyToSocialPost(postId, text);
  G._phoneComposeResult = { ok: !!res.ok, message: res.ok ? `回复成功：${res.impact?.label || '已生效'}` : (res.message || '回复失败') };
  if (res.ok) updateHeader();
  renderPhone();
}
function doPhoneBuyStaminaCoach() {
  if (typeof buyStaminaCoach !== 'function') return;
  const res = buyStaminaCoach();
  G._phoneShopResult = { ok: !!res.ok, message: res.message || (res.ok ? '购买成功' : '购买失败') };
  updateHeader();
  renderPhone();
}
function doPhoneBuyTrainingCoach() {
  if (typeof buyTrainingCoach !== 'function') return;
  const res = buyTrainingCoach();
  G._phoneShopResult = { ok: !!res.ok, message: res.message || (res.ok ? '购买成功' : '购买失败') };
  updateHeader();
  renderPhone();
}
function doPhoneBuyLuxury(itemId) {
  if (typeof buyLuxuryItem !== 'function') return;
  const res = buyLuxuryItem(itemId);
  G._phoneShopResult = { ok: !!res.ok, message: res.message || (res.ok ? '购买成功' : '购买失败') };
  updateHeader();
  renderPhone();
}
async function doPhoneGenerateTweets() {
  if (typeof regenerateTodaySocialTweets !== 'function') return;
  try {
    await regenerateTodaySocialTweets();
    G._phoneComposeResult = { ok: true, message: '补生成完成' };
  } catch (e) {
    G._phoneComposeResult = { ok: false, message: `补生成失败: ${e?.message || e}` };
  }
  renderPhone();
}

function doAcceptTradeOffer() {
  executePlayerTrade(G.pendingTrade);
  G.pendingTrade = null;
  if (typeof recalcPlayerTradeValue === 'function') recalcPlayerTradeValue();
  updateHeader();
  navTo('roster');
}

function doRejectTradeOffer() {
  addPhone("系统", "你拒绝了交易请求。", "neu");
  G.pendingTrade = null;
  renderPhone();
  updateHeader();
}

// ============ SAVE PAGE ============
function buildSaveObj() {
  const saveObj = { ...G };
  // 保留 API Key 到 localStorage，不写入存档文件
  if (saveObj.social?.llm) {
    saveObj.social = { ...saveObj.social, llm: { ...saveObj.social.llm, apiKey: '' } };
  }
  if (saveObj.results && saveObj.results.length > 50) saveObj.results = saveObj.results.slice(-50);
  delete saveObj.tradeOffers;
  delete saveObj.pendingEvent;
  delete saveObj.pendingUserTrade;
  // 清理临时状态
  delete saveObj._simulatingDay;
  delete saveObj._latestDayResult;
  delete saveObj._gameEvent;
  delete saveObj._effortMode;
  delete saveObj._mainMenuLLMResult;
  delete saveObj._phoneComposeResult;
  // ---- 保存联盟数据（队友、名单、教练等） ----
  if (LEAGUE.loaded && LEAGUE.teams) {
    saveObj._leagueTeams = {};
    Object.entries(LEAGUE.teams).forEach(([tid, t]) => {
      saveObj._leagueTeams[tid] = {
        meta: t.meta,
        players: t.players,
        rotation: t.rotation,
        coach: t.coach,
        strength: t.strength
      };
    });
    saveObj._leagueCoaches = LEAGUE.coaches || [];
    saveObj._leagueRookiesBySeason = LEAGUE.rookiesBySeason || {};
  }
  return saveObj;
}

function getSaveFilename() {
  const dateStr = new Date().toISOString().slice(0, 10);
  const name = String(G.player?.name || 'Player').replace(/[\\/:*?"<>|]/g, '_');
  return `NBACareer_${name}_S${parseNum(G.season, 1)}_${dateStr}.json`;
}

function renderSave() {
  const lastSaveTime = G._lastSaveTime ? new Date(G._lastSaveTime).toLocaleString('zh-CN') : '暂无';
  $('savePage').innerHTML = `
  <div class="card">
    <div class="card-title">💾 存档管理</div>
    <div class="tc p-16">
      <div class="mb-16">当前进度: ${G.year}赛季 第${G.season}年 | ${G.player.name} | 第${G.dayNum + 1}天</div>
      <div class="t-2 fs-sm mb-16">上次保存: ${lastSaveTime}</div>
      <div class="grid g2" style="gap:12px;max-width:500px;margin:0 auto">
        <button class="btn btn-gold" onclick="autoSaveToFile()" style="padding:14px 20px;font-size:16px">💾 保存存档</button>
        <div style="position:relative">
          <button class="btn btn-pri" style="padding:14px 20px;font-size:16px;width:100%">📂 读取存档</button>
          <input type="file" accept=".json" style="position:absolute;top:0;left:0;width:100%;height:100%;opacity:0;cursor:pointer" onchange="loadSaveFromFile(this)">
        </div>
      </div>
      <div class="t-2 mt-16 fs-sm">保存时会弹出文件选择器，建议保存到项目 Save 文件夹。<br>读取时选择之前保存的 .json 文件即可。</div>
    </div>
  </div>
  <div class="card">
    <div class="card-title">⚡ 快速操作</div>
    <div class="tc p-16">
      <button class="btn btn-cyan" onclick="quickSaveLocalStorage()" style="padding:10px 20px">💾 临时存档（浏览器缓存）</button>
      <button class="btn btn-pri mt-12" onclick="quickLoadLocalStorage()" style="padding:10px 20px">📂 读取临时存档</button>
      <div class="t-2 mt-12 fs-xs">临时存档保存在浏览器中，清除缓存会丢失。建议用上方文件存档。</div>
    </div>
  </div>`;
}

async function autoSaveToFile() {
  try {
    const saveObj = buildSaveObj();
    const json = JSON.stringify(saveObj, null, 2);
    const filename = getSaveFilename();

    if (window.showSaveFilePicker) {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: filename,
          startIn: 'documents',
          types: [{
            description: 'JSON Save File',
            accept: { 'application/json': ['.json'] },
          }],
        });
        const writable = await handle.createWritable();
        await writable.write(json);
        await writable.close();
        G._lastSaveTime = Date.now();
        // 同时备份到 localStorage
        try { localStorage.setItem('nba_save_auto', json); } catch (e) { }
        if ($('savePage').classList.contains('active')) renderSave();
        alert('存档已保存！');
        return;
      } catch (err) {
        if (err.name === 'AbortError') return;
        console.warn('File System Access API failed, falling back:', err);
      }
    }

    // 降级：下载方式
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    G._lastSaveTime = Date.now();
    try { localStorage.setItem('nba_save_auto', json); } catch (e) { }
    if ($('savePage').classList.contains('active')) renderSave();
    alert('存档已导出（浏览器下载）！');
  } catch (e) {
    console.error(e);
    alert('保存失败: ' + e.message);
  }
}

function loadSaveFromFile(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const data = JSON.parse(e.target.result);
      if (!data.player || !data.year) throw new Error("无效的存档文件");
      applySaveData(data);
      alert('存档读取成功！');
    } catch (err) {
      console.error(err);
      alert('读取失败: 存档文件损坏或格式错误');
    }
  };
  reader.readAsText(file);
}

function applySaveData(data) {
  // ---- 恢复联盟数据（队友、名单、教练等） ----
  if (data._leagueTeams && typeof data._leagueTeams === 'object') {
    LEAGUE.teams = {};
    Object.entries(data._leagueTeams).forEach(([tid, t]) => {
      LEAGUE.teams[tid] = {
        meta: t.meta,
        players: t.players || [],
        rotation: t.rotation || [],
        coach: t.coach || null,
        strength: t.strength || 75
      };
    });
    LEAGUE.loaded = true;
  }
  if (Array.isArray(data._leagueCoaches)) {
    LEAGUE.coaches = data._leagueCoaches;
  }
  if (data._leagueRookiesBySeason && typeof data._leagueRookiesBySeason === 'object') {
    LEAGUE.rookiesBySeason = data._leagueRookiesBySeason;
  }

  Object.assign(G, data);
  // 清理存档中的联盟快照字段，不留在G上
  delete G._leagueTeams;
  delete G._leagueCoaches;
  delete G._leagueRookiesBySeason;

  G.pendingUserTrade = null;
  G._pendingRegularSeasonAwardsModal = false;
  if (typeof normalizeLeagueSalaryUnits === 'function') normalizeLeagueSalaryUnits({ includeUser: true });
  if (typeof recalcPlayerTradeValue === 'function') recalcPlayerTradeValue();
  if (!Number.isFinite(parseNum(G.startYear, 0))) G.startYear = parseNum(G.year, 2025);
  if (!Array.isArray(G.awards)) G.awards = [];
  if (!Array.isArray(G.allAwards)) G.allAwards = [];
  if (!Array.isArray(G.leagueAwards)) G.leagueAwards = [];
  if (!Array.isArray(G.hallOfFame)) G.hallOfFame = [];
  if (!Number.isFinite(parseNum(G.hallOfFameThreshold, 0)) || parseNum(G.hallOfFameThreshold, 0) <= 0) G.hallOfFameThreshold = 120;
  if (!Array.isArray(G.offseasonSummary)) G.offseasonSummary = [];
  if (!Number.isFinite(parseNum(G.offseasonStage, 0))) G.offseasonStage = 0;
  G._phoneTab = 'feed';
  if (typeof ensureEconomyState === 'function') ensureEconomyState();
  if (typeof ensureSocialState === 'function') ensureSocialState();
  if (typeof ensureLeagueBadges === 'function') ensureLeagueBadges();
  if (typeof enforceLeagueRosterCap === 'function') enforceLeagueRosterCap(15);
  ensureLeagueStateShape();
  if (!G.leagueSeason.round && !Object.keys(G.leagueSeason.teamRecords || {}).length) {
    initLeagueSeasonState();
  }
  G.team = getTeam(G.teamId);
  G.phase = 'season';
  $('mainNav').style.display = 'flex';
  $('createPage').classList.remove('active');
  $('mainMenuPage').classList.remove('active');
  updateHeader();
  navTo('home');
}

function quickSaveLocalStorage() {
  try {
    const saveObj = buildSaveObj();
    localStorage.setItem('nba_save_auto', JSON.stringify(saveObj));
    G._lastSaveTime = Date.now();
    renderSave();
    alert('临时存档已保存！');
  } catch (e) {
    if (e.name === 'QuotaExceededError') {
      alert('浏览器存储空间不足！请使用文件保存。');
    } else {
      alert('保存失败: ' + e.message);
    }
  }
}

function quickLoadLocalStorage() {
  const d = localStorage.getItem('nba_save_auto');
  if (!d) { alert('没有找到临时存档！'); return; }
  try {
    const data = JSON.parse(d);
    applySaveData(data);
    alert('临时存档已读取！');
  } catch (e) {
    console.error('Load failed', e);
    alert('读取失败: ' + e.message);
  }
}

function saveGame(slot) {
  // 兼容旧代码调用，自动保存到localStorage
  quickSaveLocalStorage();
}

function loadGame(slot) {
  const d = localStorage.getItem('nba_save_' + slot);
  if (!d) { quickLoadLocalStorage(); return; }
  try {
    const data = JSON.parse(d);
    applySaveData(data);
  } catch (e) { console.error('Load failed', e); }
}

function deleteSave(slot) {
  localStorage.removeItem('nba_save_' + slot);
  renderSave();
}

// ============ NAVIGATION ============
function navTo(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  const pg = $(page + 'Page');
  if (pg) pg.classList.add('active');
  const btn = document.querySelector(`.nav-btn[data-p="${page}"]`);
  if (btn) btn.classList.add('active');
  const renderers = {
    home: renderHome, game: renderGame, stats: renderStats,
    matches: renderMatchCenter, roster: renderRoster, upgrade: renderUpgrade, trade: renderTrade, awards: renderAwards,
    phone: renderPhone, save: renderSave
  };
  if (renderers[page]) renderers[page]();
}

// ============ INITIALIZATION ============
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => navTo(btn.dataset.p));
});

// ============ MAIN MENU ============
function startNewGame() {
  createStep = 0;
  G.draftScoutingReport = null;
  renderCreate();
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  $('createPage').classList.add('active');
}

const MAIN_MENU_LLM_DRAFT_KEY = 'nba_mainmenu_llm_draft';
function readMainMenuLLMDraft() {
  try {
    const raw = localStorage.getItem(MAIN_MENU_LLM_DRAFT_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object') return null;
    return {
      enabled: typeof data.enabled === 'boolean' ? data.enabled : undefined,
      baseUrl: typeof data.baseUrl === 'string' ? data.baseUrl : undefined,
      model: typeof data.model === 'string' ? data.model : undefined,
      apiKey: typeof data.apiKey === 'string' ? data.apiKey : undefined
    };
  } catch (e) {
    return null;
  }
}
function writeMainMenuLLMDraft({ enabled, baseUrl, model, apiKey }) {
  try {
    localStorage.setItem(MAIN_MENU_LLM_DRAFT_KEY, JSON.stringify({
      enabled: typeof enabled === 'boolean' ? enabled : false,
      baseUrl: String(baseUrl || '').trim(),
      model: String(model || '').trim(),
      apiKey: String(apiKey || '').trim()
    }));
  } catch (e) { }
}
function collectMainMenuLLMFormValues() {
  const enabled = parseNum($('menuLlmEnabled')?.value, 0) === 1;
  const baseUrl = $('menuLlmBase')?.value || 'https://api.openai.com/v1';
  const model = $('menuLlmModel')?.value || 'gpt-4.1-mini';
  const apiKey = $('menuLlmKey')?.value || '';
  return { enabled, baseUrl, model, apiKey };
}
function persistMainMenuLLMDraft() {
  writeMainMenuLLMDraft(collectMainMenuLLMFormValues());
}

function renderMainMenu() {
  if (typeof ensureSocialState === 'function') ensureSocialState();
  const llm = G.social?.llm || { enabled: false, baseUrl: 'https://api.openai.com/v1', model: 'gpt-4.1-mini', apiKey: '' };
  const draft = readMainMenuLLMDraft();
  const llmView = {
    enabled: typeof draft?.enabled === 'boolean' ? draft.enabled : !!llm.enabled,
    baseUrl: draft?.baseUrl || llm.baseUrl || 'https://api.openai.com/v1',
    model: draft?.model || llm.model || 'gpt-4.1-mini',
    apiKey: draft?.apiKey || llm.apiKey || ''
  };
  const modelOptions = Array.isArray(G.social?.llmModels) ? G.social.llmModels : [];
  const llmResult = G._mainMenuLLMResult ? `<div class="ev ${G._mainMenuLLMResult.ok ? 'pos' : 'neg'} mt-12">${G._mainMenuLLMResult.message}</div>` : '';
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  $('mainNav').style.display = 'none'; // Hide nav on main menu
  $('mainMenuPage').classList.add('active');

  const menuHtml = `
    <div class="flex f-col fc" style="height:100vh;background:linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)">
      <div class="logo mb-24" style="transform:scale(1.5)"><div class="logo-icon">🏀</div><span>NBA Career Sim</span></div>
      <div class="card tc" style="width:300px;padding:30px">
        <button class="btn btn-gold mb-16" style="width:100%;height:50px;font-size:18px" onclick="startNewGame()">开始新生涯</button>
        
        <div style="position:relative;width:100%">
          <button class="btn btn-pri" style="width:100%;height:50px;font-size:18px">读取存档</button>
          <input type="file" id="saveFileInput" accept=".json" style="position:absolute;top:0;left:0;width:100%;height:100%;opacity:0;cursor:pointer" onchange="importSave(this)">
        </div>
        
        <div class="t-2 mt-24 fs-sm">版本 v1.2 | Local Save</div>
      </div>
      <div class="card mt-16" style="width:min(720px,92vw);padding:20px">
        <div class="card-title">🤖 大模型配置（主页）</div>
        <div class="t-2 fs-sm">用于选秀前球探报道与赛季社媒生成。建议在开始新生涯前先配置。</div>
        <div class="grid g2 mt-12">
          <div>
            <label class="t-2 fs-sm">启用</label>
            <select id="menuLlmEnabled" class="form-control" onchange="persistMainMenuLLMDraft()">
              <option value="1" ${llmView.enabled ? 'selected' : ''}>启用</option>
              <option value="0" ${!llmView.enabled ? 'selected' : ''}>关闭</option>
            </select>
          </div>
          <div>
            <label class="t-2 fs-sm">Model</label>
            <input id="menuLlmModel" class="form-control" list="menuLlmModelList" value="${llmView.model || 'gpt-4.1-mini'}" oninput="persistMainMenuLLMDraft()" />
            <datalist id="menuLlmModelList">
              ${modelOptions.map(m => `<option value="${m}"></option>`).join('')}
            </datalist>
          </div>
        </div>
        <label class="t-2 fs-sm mt-12">Base URL</label>
        <input id="menuLlmBase" class="form-control" value="${llmView.baseUrl || 'https://api.openai.com/v1'}" oninput="persistMainMenuLLMDraft()" />
        <label class="t-2 fs-sm mt-12">API Key</label>
        <input id="menuLlmKey" class="form-control" type="password" value="${llmView.apiKey || ''}" placeholder="sk-... / AIza..." oninput="persistMainMenuLLMDraft()" />
        <div class="grid g2 mt-12">
          <button class="btn btn-pri" onclick="doMainMenuSaveLLMSettings()">保存设置</button>
          <button class="btn btn-cyan" onclick="doMainMenuTestLLMConnectivity()">测试连通性并读取模型</button>
        </div>
        ${llmResult}
        ${G.social?.lastLLMError ? `<div class="t-2 fs-sm mt-12">最近错误: ${G.social.lastLLMError}</div>` : ''}
      </div>
    </div>
  `;
  $('mainMenuPage').innerHTML = typeof stripUndefinedTokens === 'function' ? stripUndefinedTokens(menuHtml) : menuHtml;
}
function doMainMenuSaveLLMSettings() {
  if (typeof saveSocialLLMSettings !== 'function') return;
  const { enabled, baseUrl, model, apiKey } = collectMainMenuLLMFormValues();
  writeMainMenuLLMDraft({ enabled, baseUrl, model, apiKey });
  saveSocialLLMSettings({ enabled, baseUrl, model, apiKey });
  G._mainMenuLLMResult = { ok: true, message: '主页模型设置已保存' };
  renderMainMenu();
}
async function doMainMenuTestLLMConnectivity() {
  if (typeof saveSocialLLMSettings !== 'function' || typeof testSocialLLMConnectivity !== 'function') return;
  const { enabled, baseUrl, model, apiKey } = collectMainMenuLLMFormValues();
  writeMainMenuLLMDraft({ enabled, baseUrl, model, apiKey });
  saveSocialLLMSettings({ enabled, baseUrl, model, apiKey });
  const res = await testSocialLLMConnectivity();
  const suffix = res.ok ? (Array.isArray(res.models) && res.models.length ? `，已加载 ${res.models.length} 个模型` : '') : '';
  G._mainMenuLLMResult = { ok: !!res.ok, message: `${res.message || (res.ok ? '连接成功' : '连接失败')}${suffix}` };
  renderMainMenu();
}

async function exportSave() {
  // 统一使用 autoSaveToFile
  await autoSaveToFile();
}

function importSave(input) {
  // 统一使用 loadSaveFromFile
  loadSaveFromFile(input);
}

// Start the game
async function bootstrap() {
  await loadLeagueData({ startYear: G.startYear });
  renderMainMenu();
}
bootstrap();

function buildEventOutcomeEffectRows(mod = {}) {
  const rows = [];
  const num = (v, d = 0) => parseNum(v, d);
  const pct = v => `${num(v, 0) >= 0 ? '+' : '-'}${Math.abs(num(v, 0) * 100).toFixed(0)}%`;
  const signed = v => `${num(v, 0) >= 0 ? '+' : ''}${num(v, 0).toFixed(0)}`;
  const push = (label, val, format = signed) => {
    if (!Number.isFinite(parseNum(val, NaN)) || parseNum(val, 0) === 0) return;
    rows.push(`<div class="ev neu" style="margin:4px 0;padding:6px 8px"><span class="fw-b">${label}</span> <span class="t-cyan">${format(val)}</span></div>`);
  };
  // 新事件系统: 额外投篮/罚球
  if (num(mod.extraFGM, 0) > 0) push('额外两分球命中', mod.extraFGM);
  if (num(mod.extraFGA, 0) > 0 && num(mod.extraFGA, 0) !== num(mod.extraFGM, 0)) push('额外两分球出手', mod.extraFGA);
  if (num(mod.extraFTM, 0) > 0) push('额外罚球命中', mod.extraFTM);
  if (num(mod.extraFTA, 0) > 0 && num(mod.extraFTA, 0) !== num(mod.extraFTM, 0)) push('额外罚球出手', mod.extraFTA);
  push('投篮命中率', mod.fgPctBoost, pct);
  push('抢断', mod.stl);
  push('盖帽', mod.blk);
  push('失误', mod.extraTOV);
  push('上场时间', mod.minsPenalty);
  push('体力', mod.stamina);
  push('士气', mod.morale);
  push('评分', mod.grade);
  push('全属性加成', mod.attrPctBoost, pct);
  if (!rows.length) return `<div class="t-2 fs-sm">本次事件无额外数值变化。</div>`;
  return rows.join('');
}
function showEventOutcomeModal(evtData) {
  const evtRoot = evtData && typeof evtData === 'object' ? evtData : {};
  const evt = (evtRoot.evt && typeof evtRoot.evt === 'object') ? evtRoot.evt : evtRoot;
  if (!evt || typeof evt !== 'object') return Promise.resolve();

  return new Promise(resolve => {
    const rollRaw = (evtRoot.roll && typeof evtRoot.roll === 'object') ? evtRoot.roll : {};
    const d20 = clamp(parseNum(rollRaw.d20, rng(1, 20)), 1, 20);
    const modVal = parseNum(rollRaw.mod, 0);
    const totalVal = parseNum(rollRaw.total, d20 + modVal);
    const dcVal = parseNum(evt.dc, 10);
    const success = rollRaw.success === undefined ? (totalVal >= dcVal) : !!rollRaw.success;
    const result = (evtRoot.result && typeof evtRoot.result === 'object')
      ? evtRoot.result
      : (success ? (evt.success || {}) : (evt.fail || {}));
    const resultMod = (result.mod && typeof result.mod === 'object') ? result.mod : {};
    const type = resultMod.type || (success ? 'pos' : 'neg');
    const color = type === 'pos' ? '#28a745' : (type === 'neg' ? '#dc3545' : '#fdb927');
    const title = evt.n || '特殊事件';
    const desc = result.desc || evt.desc || '本次事件已结算。';
    const attrName = ATTRS.find(a => a.k === evt.attr)?.n || '综合';
    const effectHtml = buildEventOutcomeEffectRows(resultMod);

    showModal(`
      <div class="tc" style="padding:10px 8px">
        <div style="font-size:48px;margin-bottom:10px;filter:drop-shadow(0 0 10px rgba(253,185,39,.35))">${evt.icon || '🎲'}</div>
        <div class="fs-xl fw-b mb-12" style="color:var(--gold)">${title}</div>
        <div class="t-2 fs-sm mb-16">${attrName} 检定（DC${dcVal}）</div>
        <div class="t-2 mb-16" style="min-height:38px">${evt.desc || '突发状况出现，你需要一次检定。'}</div>

        <div id="dice-container" style="background:radial-gradient(circle at 50% 30%, rgba(253,185,39,.18), rgba(0,0,0,.45));border-radius:12px;padding:20px;margin:18px 0;border:2px solid var(--border);transition:all .3s">
          <div id="dice-anim" style="font-size:56px;font-weight:bold;font-family:monospace;color:var(--gold);min-height:74px;display:flex;align-items:center;justify-content:center">🎲 ?</div>
        </div>

        <button id="dice-roll-btn" class="btn btn-cyan" style="width:100%">🎲 投骰子</button>
        <div id="dice-outcome" style="opacity:0;max-height:0;overflow:hidden;transition:all .45s ease;margin-top:12px">
          <div class="fs-lg fw-b" style="color:${color};margin-bottom:8px">${success ? '✅ 检定成功' : '❌ 检定失败'}</div>
          <div class="t-2 fs-sm" style="padding:10px;background:${color}22;border-radius:6px;border:1px solid ${color}44">${desc}</div>
          <div class="mt-12" style="text-align:left">${effectHtml}</div>
        </div>

        <button id="dice-btn" class="btn btn-gold mt-16" style="width:100%;opacity:0;pointer-events:none">继续比赛</button>
      </div>
    `);

    const diceEl = document.getElementById('dice-anim');
    const container = document.getElementById('dice-container');
    const outcome = document.getElementById('dice-outcome');
    const btn = document.getElementById('dice-btn');
    const rollBtn = document.getElementById('dice-roll-btn');
    if (!diceEl || !container || !outcome || !btn || !rollBtn) { hideModal(); resolve(); return; }

    // 防止点击背景关闭弹窗导致 Promise 悬挂：拦截背景点击
    const modalBg = $('modalBg');
    const preventBgClose = (e) => { if (e.target === modalBg) e.stopImmediatePropagation(); };
    modalBg.addEventListener('click', preventBgClose, true);

    const cleanup = () => { modalBg.removeEventListener('click', preventBgClose, true); };
    btn.onclick = () => { cleanup(); hideModal(); resolve(); };

    rollBtn.onclick = () => {
      rollBtn.disabled = true;
      rollBtn.textContent = '正在投掷...';
      let steps = 0;
      const maxSteps = 16;
      const interval = setInterval(() => {
        steps++;
        const randomVal = Math.floor(Math.random() * 20) + 1;
        diceEl.innerText = `🎲 ${randomVal}`;
        container.style.transform = `translateY(${steps % 2 ? -2 : 2}px) scale(${1 + (Math.random() * 0.02)})`;

        if (steps >= maxSteps) {
          clearInterval(interval);
          container.style.transform = 'translateY(0) scale(1)';
          const d20Color = d20 === 20 ? 'gold' : (d20 === 1 ? 'red' : 'inherit');
          diceEl.innerHTML = `
            <span style="color:${d20Color}">🎲${d20}</span>
            <span style="font-size:24px;color:#888;vertical-align:middle;margin:0 4px">${modVal >= 0 ? '+' : ''}${modVal}</span>
            <span style="font-size:24px;vertical-align:middle">=</span>
            <span style="color:#fff">${totalVal}</span>
            <div style="font-size:14px;color:#aaa;margin-top:8px">vs DC${dcVal}</div>
          `;
          container.style.borderColor = success ? '#28a745' : '#dc3545';
          outcome.style.opacity = 1;
          outcome.style.maxHeight = '380px';
          btn.style.opacity = 1;
          btn.style.pointerEvents = 'auto';
          rollBtn.style.display = 'none';
        }
      }, 70);
    };
  });
}
