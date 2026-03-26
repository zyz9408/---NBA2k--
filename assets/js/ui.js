// ui.js
// ============ CREATE PAGE UI ============
let createStep = 0;
function getCreateStepItems() {
  return [
    { id: 0, label: '建档', sub: '身份录入' },
    { id: 1, label: '体型', sub: '身体框架' },
    { id: 2, label: '模板', sub: '比赛风格' },
    { id: 3, label: '天赋', sub: '初始评级' },
    { id: 4, label: '徽章', sub: 'X-Factor' },
    { id: 5, label: '选秀', sub: '生涯起点' }
  ];
}

function renderCreateStageHeader(title, subtitle, kicker = '篮球生涯') {
  const steps = getCreateStepItems();
  const activeIndex = Math.max(0, Math.min(createStep, steps.length - 1));
  return `
    <div class="create-stage-head">
      <div class="create-stage-copy">
        <div class="create-stage-kicker">${kicker}</div>
        <h1 class="create-stage-title">${title}</h1>
        <div class="create-stage-subtitle">${subtitle}</div>
      </div>
      <div class="create-stage-progress" aria-label="创建进度">
        ${steps.map((step, index) => `
          <div class="create-progress-item ${index === activeIndex ? 'active' : ''} ${index < activeIndex ? 'done' : ''}">
            <div class="create-progress-index">${index + 1}</div>
            <div class="create-progress-copy">
              <div class="create-progress-label">${step.label}</div>
              <div class="create-progress-sub">${step.sub}</div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function renderCreate() {
  const pg = $('createPage');
  if (createStep === 0) {
    pg.innerHTML = `
    <div class="create-page-shell">
      ${renderCreateStageHeader('新秀登记', '从球员身份开始，建立属于你的第一份球探档案。', 'Draft Combine')}
      <div class="create-intro-grid">
        <div class="card create-intro-panel">
          <div class="create-hero-copy">
            <div class="create-hero-mark">🏀</div>
            <div>
              <div class="create-hero-kicker">Rookie Journey</div>
              <div class="create-hero-title">进入选秀夜之前，先把你的标签定下来。</div>
            </div>
          </div>
          <div class="create-hero-story">
            从起始年份、位置、头像到姓名，这一步决定你会以什么身份踏进联盟。界面已按窄屏重排，手机和小窗口也不会再把表单挤爆。
          </div>
          <div class="create-hero-stats">
            <div class="create-hero-stat">
              <div class="create-hero-stat-label">起点</div>
              <div class="create-hero-stat-value">选秀前夜</div>
            </div>
            <div class="create-hero-stat">
              <div class="create-hero-stat-label">目标</div>
              <div class="create-hero-stat-value">成为乐透焦点</div>
            </div>
            <div class="create-hero-stat">
              <div class="create-hero-stat-label">风格</div>
              <div class="create-hero-stat-value">篮球生涯模式</div>
            </div>
          </div>
          ${renderLocalFileHint()}
          <div class="create-hero-note">建议先上传头像再开档，全身图会自动裁到头部区域。</div>
        </div>
        <div class="card create-form-panel">
          <div class="create-avatar-stage">
            <div class="create-avatar-ring" onclick="document.getElementById('avatarInput').click()" title="点击上传头像">
              <img id="avatarPreview" src="${G.player.avatar || G.player.photo || ''}" class="create-avatar-preview" style="display:${(G.player.avatar || G.player.photo) ? 'block' : 'none'}">
              <div id="avatarPlaceholder" class="create-avatar-placeholder" style="display:${(G.player.avatar || G.player.photo) ? 'none' : 'flex'}">📷</div>
            </div>
            <input type="file" id="avatarInput" accept="image/*" style="display:none" onchange="handleAvatarUpload(this)">
            <div class="create-avatar-copy">
              <div class="create-avatar-title">球员头像</div>
              <div class="create-avatar-sub">可选上传，系统会自动聚焦头部</div>
            </div>
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
          <button class="btn btn-gold create-next-btn" onclick="createStep1()">进入体测营 →</button>
        </div>
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

function normalizeAvatarCropRect(rect, width, height) {
  const iw = Math.max(1, Math.floor(parseNum(width, 0)));
  const ih = Math.max(1, Math.floor(parseNum(height, 0)));
  const rawSw = Math.max(1, Math.floor(parseNum(rect?.sw ?? rect?.width, iw)));
  const rawSh = Math.max(1, Math.floor(parseNum(rect?.sh ?? rect?.height, ih)));
  const sw = Math.max(1, Math.min(iw, rawSw));
  const sh = Math.max(1, Math.min(ih, rawSh));
  const maxSx = Math.max(0, iw - sw);
  const maxSy = Math.max(0, ih - sh);
  const sx = Math.max(0, Math.min(maxSx, Math.round(parseNum(rect?.sx ?? rect?.x, 0))));
  const sy = Math.max(0, Math.min(maxSy, Math.round(parseNum(rect?.sy ?? rect?.y, 0))));
  return { sx, sy, sw, sh };
}

async function detectAvatarFaceBox(img) {
  const Detector = window.FaceDetector;
  if (typeof Detector !== 'function') return null;
  try {
    const detector = new Detector({ fastMode: true, maxDetectedFaces: 1 });
    const faces = await detector.detect(img);
    if (!Array.isArray(faces) || !faces.length) return null;
    const face = faces.slice().sort((a, b) => {
      const aw = parseNum(a?.boundingBox?.width, 0);
      const ah = parseNum(a?.boundingBox?.height, 0);
      const bw = parseNum(b?.boundingBox?.width, 0);
      const bh = parseNum(b?.boundingBox?.height, 0);
      return (bw * bh) - (aw * ah);
    })[0];
    const box = face?.boundingBox || {};
    const iw = img.naturalWidth || img.width || 0;
    const ih = img.naturalHeight || img.height || 0;
    return normalizeAvatarCropRect({
      sx: parseNum(box.x, 0),
      sy: parseNum(box.y, 0),
      sw: parseNum(box.width, 0),
      sh: parseNum(box.height, 0)
    }, iw, ih);
  } catch (err) {
    return null;
  }
}

function getAvatarCropRect(img, faceBox = null) {
  const iw = Math.max(1, Math.floor(img.naturalWidth || img.width || 1));
  const ih = Math.max(1, Math.floor(img.naturalHeight || img.height || 1));
  const side = Math.max(1, Math.min(iw, ih));
  const clampSquare = (sx, sy) => normalizeAvatarCropRect({ sx, sy, sw: side, sh: side }, iw, ih);
  if (faceBox && parseNum(faceBox.sw, 0) > 0 && parseNum(faceBox.sh, 0) > 0) {
    const faceCx = parseNum(faceBox.sx, 0) + parseNum(faceBox.sw, 0) / 2;
    const faceCy = parseNum(faceBox.sy, 0) + parseNum(faceBox.sh, 0) / 2;
    return clampSquare(faceCx - side / 2, faceCy - side * 0.34);
  }
  if (ih > iw * 1.08) {
    const bias = Math.max(0, Math.min(ih - side, Math.round((ih - side) * 0.08)));
    return clampSquare((iw - side) / 2, bias);
  }
  return clampSquare((iw - side) / 2, (ih - side) / 2);
}

function drawAvatarCrop(img, crop, targetSize = 128) {
  const size = Math.max(32, Math.floor(parseNum(targetSize, 128)));
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, size, size);
  return canvas;
}

function handleAvatarUpload(input) {
  const file = input.files && input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function (e) {
    const img = new Image();
    img.onload = async function () {
      const faceBox = await detectAvatarFaceBox(img);
      const crop = getAvatarCropRect(img, faceBox);
      const canvas = drawAvatarCrop(img, crop, 128);
      G.player.avatar = canvas.toDataURL('image/jpeg', 0.9);
      G.player.photo = G.player.avatar;
      const preview = $('avatarPreview');
      const placeholder = $('avatarPlaceholder');
      if (preview) {
        preview.src = G.player.avatar;
        preview.style.display = 'block';
      }
      if (placeholder) placeholder.style.display = 'none';
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function renderBodyType() {
  $('createPage').innerHTML = `
  <div class="create-page-shell">
    ${renderCreateStageHeader('身体模板', '选择体型会影响你在选秀报告中的第一印象，以及后续身高、体重和臂展范围。', 'Draft Combine')}
    <div class="card create-stage-card">
      <div class="card-title">📏 选择体型</div>
      <div class="create-card-note">更宽的肩线、更长的臂展，还是灵活轻快的后场模型，都在这里定调。</div>
      <div class="create-choice-grid create-choice-grid-body" id="bodyGrid">
      ${BODY_TYPES.map(b => `
        <div class="choice-card create-choice-card" onclick="selectBody('${b.id}')">
          <div class="create-choice-top">
            <div class="fs-lg fw-b">${b.n}</div>
            <div class="badge b-gold">体测模板</div>
          </div>
          <div class="t-2 fs-sm mt-12">${b.d}</div>
          <div class="create-choice-meta">
            <span>身高 ${b.hRange[0]}-${b.hRange[1]}cm</span>
            <span>体重 ${b.wRange[0]}-${b.wRange[1]}kg</span>
          </div>
          <div class="create-tag-row mt-12">${Object.entries(b.boost).map(([k, v]) => `<span class="tag tag-gold">+${v} ${ATTRS.find(a => a.k === k)?.n || k}</span>`).join('')}</div>
          <div class="create-tag-row">${Object.entries(b.nerf).map(([k, v]) => `<span class="tag create-tag-danger">${v} ${ATTRS.find(a => a.k === k)?.n || k}</span>`).join('')}</div>
        </div>`).join('')}
      </div>
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
  <div class="create-page-shell">
    ${renderCreateStageHeader('比赛模板', '决定你的球风标签，让球探一眼看出你是控场核心、锋线终结者还是全面持球手。', pos ? `${pos.n} / ${pos.z}` : 'Player Archetype')}
    <div class="card create-stage-card">
      <div class="card-title">🎯 选择模版${pos ? ` (${pos.n} ${pos.z})` : ''}</div>
      <div class="create-card-note">模板将影响初始属性倾向、球探对位想象以及模拟中的成长方向。</div>
      <div class="create-choice-grid create-choice-grid-template" id="tplGrid">
      ${templates.map(t => `
        <div class="choice-card create-choice-card" onclick="selectTemplate('${t.id}')">
          <div class="create-choice-top">
            <div class="fs-lg fw-b">${t.n}</div>
            <div class="badge b-cyan">${t.z}</div>
          </div>
          <div class="t-2 fs-sm mt-12">${t.d}</div>
          <div class="create-tag-row mt-12">${Object.entries(t.boost).map(([k, v]) => `<span class="tag tag-gold">+${v} ${ATTRS.find(a => a.k === k)?.n || k}</span>`).join('')}</div>
          <div class="create-tag-row">${Object.entries(t.nerf).map(([k, v]) => `<span class="tag create-tag-danger">${v} ${ATTRS.find(a => a.k === k)?.n || k}</span>`).join('')}</div>
        </div>`).join('')}
      </div>
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
  <div class="create-page-shell">
    ${renderCreateStageHeader('新秀评测', '反复重抽直到你满意为止，选出第一份真正像样的新秀属性面板。', 'Scouting Report')}
    <div class="create-roll-grid">
      <div class="card create-roll-summary">
        <div class="card-title">🎲 天赋抽取</div>
        <div class="create-card-note">这里允许无限重抽。想冲高上限就继续刷，想保底稳进联盟也可以直接锁定。</div>
        <div class="create-roll-scoreboard">
          <div class="create-score-card gold">
            <div class="create-score-label">综合评分</div>
            <div class="create-score-value">${ovr(a)}</div>
            <div class="create-score-note">OVR</div>
          </div>
          <div class="create-score-card cyan">
            <div class="create-score-label">成长上限</div>
            <div class="create-score-value">${G.player.potential}</div>
            <div class="create-score-note">POT</div>
          </div>
        </div>
        <div class="create-roll-actions">
          <button class="btn btn-gold" onclick="doReroll()">🎲 重新抽取</button>
          <button class="btn btn-ok" onclick="confirmAttrs()">✓ 确认属性</button>
        </div>
      </div>
      <div class="card create-roll-detail">
        <div class="card-title">📊 球探拆解</div>
        ${ATTRS.map(at => `
          <div class="create-attr-row">
            <span class="fs-sm create-attr-label">${at.n}</span>
            <div class="bar create-attr-bar"><div class="bar-fill ${barClass(a[at.k])}" style="width:${a[at.k]}%"></div></div>
            <span class="fw-b create-attr-value">${a[at.k]}</span>
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
  <div class="create-page-shell">
    ${renderCreateStageHeader('X-Factor 揭晓', '你的核心天赋已经浮出水面，这会是新秀赛季最鲜明的个人标识。', 'Special Trait')}
    <div class="card create-reveal-card tc">
      <div class="card-title fc" style="justify-content:center">✨ X-Factor 天赋揭晓</div>
      <div class="xfactor-card create-xfactor-panel">
        <div class="create-xfactor-icon">${xf.icon}</div>
        <div class="fs-lg fw-b t-purple mt-12">${xf.n}</div>
        <div class="t-2 mt-12">${xf.d}</div>
      </div>
      <div class="create-hero-note">下一步将生成选秀夜结果，并根据当前年份载入对应联盟环境。</div>
      <button class="btn btn-gold mt-16 create-next-btn" onclick="gotoDraft()">进入选秀 →</button>
    </div>
  </div>`;
}

async function gotoDraft() {
  $('createPage').innerHTML = `
  <div class="card tc">
    <div class="card-title fc" style="justify-content:center">🧾 生成选秀报告</div>
    <div class="t-2">正在模拟选秀并生成球探剧情报道，请稍候...</div>
  </div>`;
  assignToDraft();
  if (typeof generateDraftScoutingReport === 'function') {
    try { 
      const scout = await generateDraftScoutingReport({ force: true }); 
      if (scout && scout.story && typeof showStoryModal === 'function') {
        await showStoryModal('选秀夜', scout.story);
      }
    } catch (e) { }
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
  <div class="create-page-shell">
    ${renderCreateStageHeader('选秀夜', '球队已经做出决定。这里是你的顺位、球探总结，以及同届新秀榜单。', 'Draft Night')}
    <div class="create-draft-grid">
      <div class="card create-draft-hero">
        <div class="card-title fc" style="justify-content:center">🎉 选秀结果</div>
        <div class="team-logo create-draft-logo" style="background:${t.cl};margin:16px auto">${teamLogoMarkup(t, 80)}</div>
        <div class="fs-lg fw-b mt-12">${board?.year || G.year}年NBA选秀</div>
        <div class="create-draft-pick">第${G.draftPick}顺位</div>
        <div class="fs-lg">${t.z} ${t.n}</div>
        <div class="t-2 mt-12">${G.player.name} | ${getPos(G.player.pos).n} | OVR ${ovr(G.player.attrs)}</div>
        <div class="t-2 fs-sm mt-12">合同: ${G.player.contractYears}年 / $${formatSalaryM(G.player.salary)}M</div>
        ${board ? `<div class="t-2 fs-sm mt-12">同届: ${board.classSize || allResults.length}人竞争 (${tierText})</div>` : ''}
        <button class="btn btn-gold mt-16 create-next-btn" onclick="startCareer()" style="font-size:18px;padding:14px 40px">开始生涯 🏀</button>
      </div>
      <div class="create-draft-side">
      ${scout ? `
      <div class="card create-draft-report" style="text-align:left;background:rgba(0,0,0,.18)">
        <div class="card-title">🧾 球探报道</div>
        <div class="fw-b" style="font-size:15px;color:var(--gold);margin-bottom:8px">${scout.title || '球队球探报告'}</div>
        <div class="t-2" style="line-height:1.7;margin-bottom:14px;padding:10px 12px;background:rgba(255,255,255,.04);border-radius:6px">${scout.summary || ''}</div>
        <div class="create-report-grid" style="margin-bottom:14px">
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
      <div class="card create-draft-board">
        <div class="card-title">📋 同届榜单</div>
        <div class="tbl" style="text-align:left;max-height:360px;overflow-y:auto">
        <table>
          <thead><tr><th>顺位</th><th>球队</th><th>球员</th><th>位置</th><th>OVR</th><th>POT</th></tr></thead>
          <tbody>
            ${allResults.map(r => `<tr class="${r.user ? 'hl-row' : ''}"><td>${r.pick}</td><td>${r.team || '--'}</td><td>${r.user ? `⭐ ${r.name}` : r.name}</td><td>${r.pos}</td><td>${r.rating}</td><td>${r.potential}</td></tr>`).join('')}
          </tbody>
        </table>
        </div>
      </div>
      `: ''}
      </div>
    </div>
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

  // 在用户进入NBA前，模拟一个完整的NPC赛季（属性成长+数据积累）
  if (G.season === 1 && typeof simulatePreDraftSeason === 'function') {
    simulatePreDraftSeason();
  }

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
  
  if (!G.storyLog) {
    G.storyLog = ["欢迎来到《篮球生涯模拟器》。你的传奇，从这里开始——\\n点击【推进日程】开启新的一天或直接去打比赛。"];
  }

  const storyContent = G.storyLog.map(msg => `<div style="margin-bottom:12px;padding-bottom:12px;border-bottom:1px solid rgba(255,255,255,0.05);line-height:1.6">${msg}</div>`).join('');

  $('homePage').innerHTML = `
  <div class="grid" style="grid-template-columns: 3fr 2fr; gap: 16px;">
    <!-- LEFT: Story Board -->
    <div class="flex f-col" style="height: 75vh;">
      <div id="homeActionContainer" style="margin-bottom:12px;"></div>
      <div id="storyBoard" class="card" style="flex:1; overflow-y:auto; margin-bottom:0; padding:16px; background:#0B0C10; border-radius:8px; font-family:'Courier New', monospace; font-size:15px; box-shadow:inset 0 0 10px rgba(0,0,0,0.5);">
        <div class="t-2 mb-8" style="font-size:12px;border-bottom:1px dashed rgba(255,255,255,0.1);padding-bottom:4px">📜 生涯日志</div>
        ${storyContent}
      </div>
    </div>
    
    <!-- RIGHT: Status & Stats -->
    <div style="overflow-y:auto; height: 75vh; padding-right:8px;">
      <div class="card mb-16">
        <div class="flex fb ai-c mb-16">
          <div class="flex ai-c gap-12">
            ${p.avatar ? `<img src="${p.avatar}" style="width:50px;height:50px;border-radius:50%;object-fit:cover;border:2px solid var(--gold)">` : ''}
            <div>
              <div class="fs-lg fw-b t-gold">${p.name}</div>
              <div class="fs-sm t-2">${p.age}岁 | ${getPos(p.pos).z} | OVR ${ovr(p.attrs)}</div>
            </div>
          </div>
          <div class="tc"><div class="fs-xl fw-b">${s.wins}-${s.losses}</div><div class="fs-xs t-2">战绩</div></div>
        </div>
        
        <div class="grid mt-12 mb-12" style="grid-template-columns: repeat(4, 1fr); gap: 8px; background:rgba(0,0,0,.2);padding:10px;border-radius:8px">
          <div class="tc"><div class="t-2 fs-xs">得分</div><div class="fw-b">${(s.pts / gp).toFixed(1)}</div></div>
          <div class="tc"><div class="t-2 fs-xs">篮板</div><div class="fw-b">${(s.reb / gp).toFixed(1)}</div></div>
          <div class="tc"><div class="t-2 fs-xs">助攻</div><div class="fw-b">${(s.ast / gp).toFixed(1)}</div></div>
          <div class="tc"><div class="t-2 fs-xs">薪金</div><div class="fw-b t-gold">$${formatSalaryM(p.salary)}M</div></div>
          <div class="tc mt-8"><div class="t-2 fs-xs">抢断</div><div class="fw-b">${(s.stl / gp).toFixed(1)}</div></div>
          <div class="tc mt-8"><div class="t-2 fs-xs">盖帽</div><div class="fw-b">${(s.blk / gp).toFixed(1)}</div></div>
          <div class="tc mt-8"><div class="t-2 fs-xs">失误</div><div class="fw-b">${(s.tov / gp).toFixed(1)}</div></div>
          <div class="tc mt-8"><div class="t-2 fs-xs">命中</div><div class="fw-b">${s.fga>0 ? Math.round(s.fgm/s.fga*100) : 0}%</div></div>
        </div>
        
        <div class="grid g2 mt-12 mb-12">
          <div class="flex fb fs-sm mb-8"><span class="t-2">天赋</span><span class="t-purple">${xf.icon} ${xf.n}</span></div>
          <div class="flex fb fs-sm mb-8"><span class="t-2">存款</span><span class="t-gold">$${parseNum(p.cash, 0).toFixed(2)}M</span></div>
          <div class="flex fb fs-sm mb-8"><span class="t-2">声望</span><span>${p.fame}</span></div>
          <div class="flex fb fs-sm mb-8"><span class="t-2">信任</span><span>${p.trust}</span></div>
        </div>
        <div class="flex fb fs-sm mb-12"><span class="t-2">士气</span><span>${(() => { const m = parseNum(G.teamMorale, 50); const streak = Math.abs(G.winStreak||0) >= 2 ? `(${G.winStreak>0?'连胜':'连败'})` : ''; return (m > 65 ? '🔥' : m < 40 ? '💧' : '⚖️') + m + streak; })()}</span></div>
        
        <div class="mb-12 mt-12"><span class="t-2 fs-sm">体力: ${p.stamina}%</span>
          <div class="stamina-bar mt-4"><div class="stamina-fill" style="width:${p.stamina}%"></div></div>
        </div>
        ${p.injury.active ? `<div class="mb-12" style="color:var(--danger)">🩹 ${p.injury.type} (缺阵${p.injury.games}场)</div>` : ''}
        
        <div class="mt-16"><button class="btn btn-sm" style="background:#dc3545;color:#fff;width:100%" onclick="if(confirm('确定要宣布退役吗？生涯将就此落幕！\\n如果是误触请点击取消。')) forceRetire()">👋 宣布退役 (结束生涯)</button></div>
      </div>
      
      <div class="card mb-16">
        <div class="card-title">📰 最新资讯</div>
        <div class="news-ticker">${G.news.slice(0, 5).map(n => `<div class="news-item fs-sm">${n.text}</div>`).join('') || '<div class="t-2 tc">暂无新闻</div>'}</div>
      </div>
    </div>
  </div>`;
  
  setTimeout(() => {
    const sb = $('storyBoard');
    if (sb) sb.scrollTop = sb.scrollHeight;
  }, 10);

  if (G.playoffs && G.playoffs.active && !G.playoffs.eliminated) {
    if (typeof renderPlayoffGame === 'function') renderPlayoffGame();
  } else if (G.gameNum >= 82) {
    if (typeof renderSeasonEnd === 'function') renderSeasonEnd();
  } else {
    if (typeof renderRegularSeasonAction === 'function') renderRegularSeasonAction();
  }
}

function appendStoryToBoard(text, color = '#fff', typewrite = true) {
  if (!G.storyLog) G.storyLog = [];
  const formatted = `<span style="color:${color}">${text}</span>`;
  G.storyLog.push(formatted);
  if (G.storyLog.length > 50) G.storyLog.shift(); // Keep history size contained

  const sb = $('storyBoard');
  if (sb) {
    if (typewrite) {
      const id = "story_msg_" + Date.now() + "_" + Math.floor(Math.random()*1000);
      const span = document.createElement('div');
      span.style.marginBottom = '12px';
      span.style.paddingBottom = '12px';
      span.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
      span.style.lineHeight = '1.6';
      span.style.color = color;
      span.id = id;
      sb.appendChild(span);
      
      let i = 0;
      const speed = 25;
      function typeWriter() {
        if (i < text.length) {
          const char = text.charAt(i);
          span.innerHTML += char === '\\n' ? '<br>' : char;
          i++;
          sb.scrollTop = sb.scrollHeight;
          setTimeout(typeWriter, speed);
        }
      }
      typeWriter();
    } else {
      const el = document.createElement('div');
      el.style.marginBottom = '12px';
      el.style.paddingBottom = '12px';
      el.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
      el.style.lineHeight = '1.6';
      el.innerHTML = formatted.replace(/\\n/g, '<br>');
      sb.appendChild(el);
      sb.scrollTop = sb.scrollHeight;
    }
  }
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
        <div class="fw-b ${homeWin ? 't-ok' : 't-no'}">${parseNum(game.awayScore, 0)} - ${parseNum(game.homeScore, 0)}</div>
        <div class="fw-b">${home.z || home.n || '主队'} (${home.a || '--'})</div>
      </div>
      <div class="tc mt-12">
        <span class="badge ${homeWin ? 'b-ok' : 'b-no'}">${homeWin ? '主胜' : '客胜'}</span>
        ${game.userGame ? '<span class="badge b-gold">你的比赛</span>' : ''}
      </div>
    </div>
    ${renderHomeAwayFlow(game)}
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
function safeSvgText(text = '') {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
function renderMatchupSvg({ myTeam = null, oppTeam = null, home = true } = {}) {
  const myAbbr = safeSvgText(myTeam?.a || 'ME');
  const oppAbbr = safeSvgText(oppTeam?.a || 'OPP');
  const leftAbbr = home ? myAbbr : oppAbbr;
  const rightAbbr = home ? oppAbbr : myAbbr;
  const leftColor = home ? (myTeam?.cl || '#1d428a') : (oppTeam?.cl || '#2a2f4a');
  const rightColor = home ? (oppTeam?.cl || '#2a2f4a') : (myTeam?.cl || '#1d428a');
  return `
  <svg class="sim-svg matchup-svg" viewBox="0 0 420 160" xmlns="http://www.w3.org/2000/svg" aria-label="比赛对阵图">
    <defs>
      <linearGradient id="courtGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="rgba(253,185,39,.2)"/>
        <stop offset="100%" stop-color="rgba(0,212,255,.06)"/>
      </linearGradient>
    </defs>
    <rect x="8" y="12" width="404" height="136" rx="18" fill="url(#courtGrad)" class="svg-court-line"/>
    <path d="M210 20v120" stroke="rgba(255,255,255,.22)" stroke-width="2" stroke-dasharray="4 6"/>
    <circle cx="210" cy="80" r="26" fill="none" stroke="rgba(255,255,255,.18)" stroke-width="2"/>
    <circle cx="210" cy="80" r="12" class="svg-ball-bounce" fill="#fdb927"/>
    <rect x="40" y="45" width="110" height="70" rx="12" fill="${leftColor}" class="svg-pulse-soft"/>
    <rect x="270" y="45" width="110" height="70" rx="12" fill="${rightColor}" class="svg-pulse-soft"/>
    <text x="95" y="90" fill="#fff" font-size="28" text-anchor="middle" font-weight="700">${leftAbbr}</text>
    <text x="325" y="90" fill="#fff" font-size="28" text-anchor="middle" font-weight="700">${rightAbbr}</text>
    <text x="210" y="88" fill="#fff" font-size="18" text-anchor="middle" font-weight="700">VS</text>
  </svg>`;
}
function renderResultBadgeSvg({ win = false } = {}) {
  const color = win ? '#28a745' : '#dc3545';
  const mark = win ? 'W' : 'L';
  return `
  <svg class="sim-svg result-svg" viewBox="0 0 320 84" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <rect x="6" y="8" width="308" height="68" rx="14" fill="${win ? 'rgba(40,167,69,.12)' : 'rgba(220,53,69,.12)'}" stroke="${color}" class="svg-court-line"/>
    <circle cx="48" cy="42" r="18" fill="${color}" class="svg-pulse-soft"/>
    <text x="48" y="49" fill="#fff" font-size="16" text-anchor="middle" font-weight="700">${mark}</text>
    <path d="M86 42h206" stroke="${color}" stroke-width="2" stroke-dasharray="4 7" class="svg-dash-flow"/>
  </svg>`;
}
function renderEventTypeSvg(type = 'neu', symbol = '★', { large = false } = {}) {
  const tone = type === 'pos'
    ? { c: '#28a745', bg: 'rgba(40,167,69,.18)' }
    : type === 'neg'
      ? { c: '#dc3545', bg: 'rgba(220,53,69,.18)' }
      : { c: '#fdb927', bg: 'rgba(253,185,39,.18)' };
  const size = large ? 108 : 46;
  const fontSize = large ? 30 : 16;
  const safeSymbol = safeSvgText((Array.from(String(symbol || '★'))[0] || '★'));
  return `
  <svg class="event-type-svg ${large ? 'large' : ''}" viewBox="0 0 100 100" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <circle cx="50" cy="50" r="44" fill="${tone.bg}" stroke="${tone.c}" stroke-width="2" class="svg-court-line"/>
    <g class="svg-rotate-slow" transform="translate(50,50)">
      <path d="M0-36L6-16L26-16L10-4L16 16L0 6L-16 16L-10 -4L-26 -16L-6 -16Z" fill="${tone.c}" opacity=".22"/>
    </g>
    <circle cx="50" cy="50" r="24" fill="${tone.c}" class="svg-pulse-soft"/>
    <text x="50" y="58" text-anchor="middle" fill="#fff" font-size="${fontSize}" font-weight="700">${safeSymbol}</text>
  </svg>`;
}
function renderUserGameFlow(flow) {
  if (!flow || typeof flow !== 'object') return '';
  const labels = Array.isArray(flow.periodLabels) && flow.periodLabels.length ? flow.periodLabels : ['Q1', 'Q2', 'Q3', 'Q4'];
  const myPeriods = Array.isArray(flow.myPeriods) ? flow.myPeriods : [];
  const oppPeriods = Array.isArray(flow.oppPeriods) ? flow.oppPeriods : [];
  if (!myPeriods.length || !oppPeriods.length) return '';
  const myTotal = myPeriods.reduce((s, x) => s + parseNum(x, 0), 0);
  const oppTotal = oppPeriods.reduce((s, x) => s + parseNum(x, 0), 0);
  const runs = Array.isArray(flow.runs) ? flow.runs.slice(0, 2) : [];
  return `
  <div class="sim-flow-card mt-12">
    <div class="tbl">
      <table>
        <thead><tr><th>队伍</th>${labels.map(x => `<th>${x}</th>`).join('')}<th>TOT</th></tr></thead>
        <tbody>
          <tr><td>${safeSvgText(flow.myAbbr || 'ME')}</td>${myPeriods.map(x => `<td>${parseNum(x, 0)}</td>`).join('')}<td>${myTotal}</td></tr>
          <tr><td>${safeSvgText(flow.oppAbbr || 'OPP')}</td>${oppPeriods.map(x => `<td>${parseNum(x, 0)}</td>`).join('')}<td>${oppTotal}</td></tr>
        </tbody>
      </table>
    </div>
    <div class="sim-flow-meta t-2 fs-sm">
      回合 ${parseNum(flow.myPoss, 0)}-${parseNum(flow.oppPoss, 0)} | 进攻效率 ${parseNum(flow.myOrtg, 0)}-${parseNum(flow.oppOrtg, 0)} |
      领先交替 ${parseNum(flow.leadChanges, 0)} 次 ${flow.clutch ? `| 关键球分差 ${parseNum(flow.clutchMargin, 0)}` : ''}
    </div>
    <div class="sim-flow-meta t-2 fs-sm">
      eFG% ${parseNum(flow.myEfg, 0)}-${parseNum(flow.oppEfg, 0)} | TOV% ${parseNum(flow.myTovRate, 0)}-${parseNum(flow.oppTovRate, 0)} |
      最大领先 ${parseNum(flow.myBiggestLead, 0)}-${parseNum(flow.oppBiggestLead, 0)}
    </div>
    ${flow.summary ? `<div class="sim-flow-summary">${flow.summary}</div>` : ''}
    ${runs.length ? `<div class="event-log mt-12">${runs.map(r => `<div class="ev neu">${r}</div>`).join('')}</div>` : ''}
  </div>`;
}
function renderHomeAwayFlow(game) {
  const flow = game?.flow;
  if (!flow || typeof flow !== 'object') return '';
  const homeAbbr = safeSvgText(flow.homeAbbr || getTeam(game.homeTeamId)?.a || 'HOME');
  const awayAbbr = safeSvgText(flow.awayAbbr || getTeam(game.awayTeamId)?.a || 'AWAY');
  const labels = Array.isArray(flow.periodLabels) && flow.periodLabels.length ? flow.periodLabels : ['Q1', 'Q2', 'Q3', 'Q4'];
  const homePeriods = Array.isArray(flow.homePeriods) ? flow.homePeriods : [];
  const awayPeriods = Array.isArray(flow.awayPeriods) ? flow.awayPeriods : [];
  if (!homePeriods.length || !awayPeriods.length) return '';
  const homeTotal = homePeriods.reduce((s, x) => s + parseNum(x, 0), 0);
  const awayTotal = awayPeriods.reduce((s, x) => s + parseNum(x, 0), 0);
  const runs = Array.isArray(flow.runs) ? flow.runs.slice(0, 3) : [];
  return `
  <div class="card" style="margin-bottom:12px">
    <div class="card-title">⏱ 比赛流</div>
    <div class="tbl">
      <table>
        <thead><tr><th>队伍</th>${labels.map(x => `<th>${x}</th>`).join('')}<th>TOT</th></tr></thead>
        <tbody>
          <tr><td>${homeAbbr}</td>${homePeriods.map(x => `<td>${parseNum(x, 0)}</td>`).join('')}<td>${homeTotal}</td></tr>
          <tr><td>${awayAbbr}</td>${awayPeriods.map(x => `<td>${parseNum(x, 0)}</td>`).join('')}<td>${awayTotal}</td></tr>
        </tbody>
      </table>
    </div>
    <div class="sim-flow-meta t-2 fs-sm">
      回合 ${parseNum(flow.homePoss, 0)}-${parseNum(flow.awayPoss, 0)} | 进攻效率 ${parseNum(flow.homeOrtg, 0)}-${parseNum(flow.awayOrtg, 0)} |
      领先交替 ${parseNum(flow.leadChanges, 0)} 次 ${flow.clutch ? `| 关键球分差 ${parseNum(flow.clutchMargin, 0)}` : ''}
    </div>
    <div class="sim-flow-meta t-2 fs-sm">
      eFG% ${parseNum(flow.homeEfg, 0)}-${parseNum(flow.awayEfg, 0)} | TOV% ${parseNum(flow.homeTovRate, 0)}-${parseNum(flow.awayTovRate, 0)} |
      最大领先 ${parseNum(flow.biggestLeadHome, 0)}-${parseNum(flow.biggestLeadAway, 0)}
    </div>
    ${flow.summary ? `<div class="sim-flow-summary">${flow.summary}</div>` : ''}
    ${runs.length ? `<div class="event-log mt-12">${runs.map(r => `<div class="ev neu">${r}</div>`).join('')}</div>` : ''}
  </div>`;
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
    const evtSvg = renderEventTypeSvg(type, evtIcon);

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
      <div class="sim-event-head">
        ${evtSvg}
        <div class="fw-b filter-blur" style="display:flex;justify-content:space-between;flex:1;align-items:center">
          <span>${evtName}</span>
          ${result ? `<span class="badge" style="background:${color};color:#fff;font-size:11px">${isPos ? '正面' : isNeg ? '负面' : '特殊'}</span>` : ''}
        </div>
      </div>
      ${rollHtml}
      <div class="t-2 fs-sm" style="margin-top:6px">${desc}</div>
    </div>`;
  }

  const effortTag = effortCfg && effortCfg.id !== 'normal' ? `<span class="badge" style="background:${effortCfg.color};color:#fff;margin-left:8px;font-size:11px">${effortCfg.icon} ${effortCfg.n}</span>` : '';
  const teamAbbr = G.team?.a || 'HOME';
  const oppAbbr = res?.opp?.a || res?.opp?.z || 'AWAY';
  const flowHtml = renderUserGameFlow(res?.flow);
  const recapData = res?.gameRecap
    || (res?.gameId && G._gameRecapMap ? G._gameRecapMap[res.gameId] : null)
    || (G._latestGameRecap && G._latestGameRecap.gameId === res.gameId ? G._latestGameRecap : null);
  const recapHtml = recapData
    ? `
    <div class="sim-flow-card mt-12">
      <div class="fw-b">${recapData.headline || '比赛战报'} <span class="badge b-cyan" style="margin-left:6px">AI</span></div>
      <div class="t-2 fs-sm mt-8" style="line-height:1.7">${recapData.recap || ''}</div>
    </div>`
    : '';
  const resultSvg = renderResultBadgeSvg({ win: !!res.win });

  return `
  <div class="card">
    <div class="card-title">${res.win ? '🎉 胜利' : '😞 失败'}${effortTag}</div>
    <div class="result-banner ${res.win ? 'win' : 'loss'}">${res.win ? 'W 胜利' : 'L 失利'}</div>
    <div class="tc">${resultSvg}</div>
    <div class="tc fw-b mt-12">${teamAbbr} ${parseNum(res.teamPts, 0)} : ${parseNum(res.oppPts, 0)} ${oppAbbr}</div>
    <div class="grade ${gradeClass(res.grade)}">${gradeLetter(res.grade)}</div>
    <div class="grid g4 mt-12">
      <div class="stat-box"><div class="stat-val">${res.st.pts}</div><div class="stat-lbl">得分</div></div>
      <div class="stat-box"><div class="stat-val">${res.st.reb}</div><div class="stat-lbl">篮板</div></div>
      <div class="stat-box"><div class="stat-val">${res.st.ast}</div><div class="stat-lbl">助攻</div></div>
      <div class="stat-box"><div class="stat-val">${res.st.stl}/${res.st.blk}</div><div class="stat-lbl">抢断/盖帽</div></div>
    </div>
    <div class="t-2 fs-sm tc mt-12">
      投篮: ${res.st.fgm}/${res.st.fga} | 三分: ${res.st.tpm}/${res.st.tpa} | 罚球: ${res.st.ftm}/${res.st.fta} | +${parseNum(res.xp, 0)}XP
    </div>
    ${flowHtml}
    ${recapHtml}
    ${evBanner}
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

function renderRegularSeasonAction() {
  const container = $('homeActionContainer');
  if (!container) return;


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

  let gameHtml = '';
  if (isToday) {
    gameHtml = `
      <div style="background:linear-gradient(90deg, rgba(20,20,20,0.9), rgba(40,40,40,0.9)); border:1px solid var(--gold); border-radius:6px; padding:8px 12px; display:flex; justify-content:space-between; align-items:center;">
        <div style="font-size:14px;">
          📅 第${G.dayNum + 1}天 | 🏀 比赛: ${G.gameNum + 1}/82 VS <span class="t-gold fw-b">${opp?.z || '对手'}</span> (${game?.home ? '主场' : '客场'})
        </div>
        <div style="display:flex; align-items:center; gap:8px;">
          <select id="effortSel" class="input-sm" style="padding:4px; height:28px; background:#222; color:#fff; border:1px solid #555; border-radius:4px" onchange="G._effortMode=this.value">
            <option value="slack" ${(G._effortMode==='slack')?'selected':''}>划水</option>
            <option value="normal" ${(!G._effortMode||G._effortMode==='normal')?'selected':''}>正常</option>
            <option value="hard" ${(G._effortMode==='hard')?'selected':''}>拼命</option>
          </select>
          <button class="btn btn-gold btn-sm" style="padding:4px 12px; height:28px; border-radius:4px" ${simBusy ? 'disabled' : ''} onclick="G._effortMode=$('effortSel').value; doSimulateDay()">
            ${simBusy ? '处理中...' : '▶ 比赛并推演剧情'}
          </button>
        </div>
      </div>
    `;
  } else {
    gameHtml = `
      <div style="background:rgba(20,20,20,0.8); border:1px solid #444; border-radius:6px; padding:8px 12px; display:flex; justify-content:space-between; align-items:center;">
        <div style="font-size:14px; color:#aaa;">
          📅 第${G.dayNum + 1}天 | 😴 休息日 | 距下场比赛还有 <span class="t-cyan fw-b">${daysToGame}</span> 天
        </div>
        <button class="btn btn-pri btn-sm" style="padding:4px 12px; height:28px; border-radius:4px" ${simBusy ? 'disabled' : ''} onclick="doSimulateDay()">
          ${simBusy ? '处理中...' : '▶ 顺延日常并推演'}
        </button>
      </div>
    `;
  }
  container.innerHTML = typeof stripUndefinedTokens === 'function' ? stripUndefinedTokens(gameHtml) : gameHtml;
}

function doPlayGame() {
  // 保留旧函数作为备用
  doSimulateDay();
}

async function doSimulateDay() {
  if (G._simulatingDay) return;
  G._simulatingDay = true;
  renderHome();
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

    // ========== 剧情引擎接管 ==========
    if (typeof generateDailyStoryByLLM === 'function') {
      await generateDailyStoryByLLM(result);
    }
    // ===================================
    if (result.isGame && typeof generateMatchRecapByLLM === 'function') {
      const recap = await generateMatchRecapByLLM(result);
      if (recap?.ok && recap.recap) {
        result.gameRecap = recap.recap;
        G._latestGameRecap = recap.recap;
      }
    }

    G._latestDayResult = result;
    updateHeader();
    renderHome();
    if ($('phonePage').classList.contains('active')) renderPhone();

    // 后台非阻塞生成推文，每日都生成从而反映休赛日花边或日常训练
    if (typeof generateDailySocialTweets === 'function') {
      generateDailySocialTweetsSmart(result).then(() => {
        if ($('phonePage').classList.contains('active')) renderPhone();
      }).catch(e => {
        G.social = G.social || {};
        G.social.lastLLMError = String(e?.message || e || '推文生成失败');
      });
    }
  } finally {
    G._simulatingDay = false;
    if ($('homePage').classList.contains('active')) renderHome();
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
  renderHome();
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
  renderHome();
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
  const container = $('homeActionContainer') || $('gamePage');
  if (container) container.innerHTML = `
  <div style="background:rgba(40,20,0,0.9); border:1px solid var(--gold); border-radius:6px; padding:8px 12px; display:flex; justify-content:space-between; align-items:center;">
    <div style="font-size:14px;">
      🏁 <span class="t-gold fw-b">${G.year}-${G.year+1} 赛季结束</span> | 战绩: ${s.wins}胜${s.losses}负 ${G.playoffs.champion ? '🏆 总冠军' : ''} | 场均 ${ (s.pts / gp).toFixed(1) }分 ${ (s.reb / gp).toFixed(1) }板 ${ (s.ast / gp).toFixed(1) }助
    </div>
    <button class="btn btn-gold btn-sm" style="padding:4px 12px; height:28px; border-radius:4px" onclick="goToOffseason()">进入休赛期 ▶</button>
  </div>`;
}

function renderPlayoffGame() {
  const s = G.playoffs.series;
  const opp = getTeam(s.opp);
  const roundNames = ["", "首轮", "次轮", "分区决赛", "总决赛"];
  const staminaStatus = getStaminaStatus(G.player.stamina);
  const container = $('homeActionContainer') || $('gamePage');
  if (container) container.innerHTML = `
  <div style="background:linear-gradient(90deg, rgba(80,20,20,0.9), rgba(40,10,10,0.9)); border:1px solid var(--danger); border-radius:6px; padding:8px 12px; display:flex; justify-content:space-between; align-items:center;">
    <div style="font-size:14px;">
      🏆 季后赛 ${roundNames[G.playoffs.round]} | 🏀 VS <span class="t-gold fw-b">${opp.z}</span> | 总比分: <span id="playoff-my-wins" class="t-cyan fw-b">${s.myWins}</span> - <span id="playoff-opp-wins" class="t-danger fw-b">${s.oppWins}</span>
    </div>
    <div style="display:flex; align-items:center; gap:8px;">
      <select id="playoffEffort" class="input-sm" style="padding:4px; height:28px; background:#222; color:#fff; border:1px solid #555; border-radius:4px" onchange="G._effortMode=this.value">
        <option value="slack" ${(G._effortMode==='slack')?'selected':''}>划水</option>
        <option value="normal" ${(!G._effortMode||G._effortMode==='normal')?'selected':''}>正常</option>
        <option value="hard" ${(G._effortMode==='hard')?'selected':''}>拼命</option>
      </select>
      <button class="btn btn-danger btn-sm" style="padding:4px 12px; height:28px; border-radius:4px; font-weight:bold;" onclick="G._effortMode=$('playoffEffort').value; doPlayoffGame()">▶ 比赛并生成剧情</button>
    </div>
  </div>
  <div id="playoffResult" style="display:none;"></div>`;
}

function doPlayoffGame() {
  const res = playPlayoffGame();
  const status = checkSeriesEnd();
  // 后台非阻塞生成推文
  if (typeof generateDailySocialTweets === 'function') {
    const socialDay = parseNum(G.dayNum, 0) + 1000 + parseNum(G.playoffs.round, 0) * 10 + parseNum(res.myWins + res.oppWins, 0);
    generateDailySocialTweetsSmart({
      day: socialDay,
      date: `${G.year}季后赛R${parseNum(G.playoffs.round, 0)}G${parseNum(res.myWins + res.oppWins, 0)}`,
      isGame: true,
      gameResult: {
        win: !!res.win,
        opp: res.opp,
        teamPts: parseNum(res?.st?.teamPts, 0),
        oppPts: parseNum(res?.st?.oppPts, 0),
        st: res.st,
        grade: res.grade,
        flow: res.flow || null
      }
    }, { force: true }).then(() => {
      if ($('phonePage').classList.contains('active')) renderPhone();
    }).catch(() => { });
  }
  // 实时更新比分板
  if ($('playoff-my-wins')) $('playoff-my-wins').textContent = res.myWins;
  if ($('playoff-opp-wins')) $('playoff-opp-wins').textContent = res.oppWins;

  if (typeof generateDailyStoryByLLM === 'function') {
    // 强制追加季后赛上下文
    res.isPlayoffs = true;
    res.playoffRoundName = ['','首轮','次轮','分区决赛','总决赛'][G.playoffs.round];
    generateDailyStoryByLLM({
      isGame: true,
      gameResult: res,
      type: 'playoffGame'
    }).then(() => {
      if (status === 'continue' || status === 'advance') {
        renderPlayoffGame();
      } else {
        renderSeasonEnd();
      }
    });
  } else {
    // 降级时立即刷新
    if (status === 'continue' || status === 'advance') renderPlayoffGame(); else renderSeasonEnd();
  }
}

async function goToOffseason() {
  const alpha = isPlayerAlpha();
  if (!alpha) {
    await endSeason();
    _offseasonContinue();
    return;
  }
  await endSeason({ staged: true });
  const renewRes = runOffseasonStaged_renewals();
  const draftState = createOffseasonDraftState();
  const pickIdx = getTeamFirstRoundPick(G.teamId);
  if (pickIdx >= 0 && draftState.pool.length > 0) {
    const start = Math.max(0, pickIdx - 2);
    const prospects = draftState.pool.slice(start, start + 6);
    showDraftDecisionModal(pickIdx, prospects, renewRes, draftState);
  } else {
    _offseasonAfterDraft(renewRes, null, draftState);
  }
}
function _offseasonAfterDraft(renewRes, draftPref, draftState) {
  const summary = [];
  summary.push(`续约阶段：续约 ${renewRes.renewed} 人，进入自由市场 ${renewRes.released.length} 人`);
  G.offseasonStage = 228;
  const round1 = processDraftRoundStage(draftState, 1, draftPref || null, G.teamId);
  summary.push(`选秀首轮：完成 ${round1.length} 个签位`);
  G.offseasonStage = 229;
  const round2 = processDraftRoundStage(draftState, 2, draftPref || null, G.teamId);
  summary.push(`选秀次轮：完成 ${round2.length} 个签位`);
  if (draftPref) {
    const picked = draftState.results.find(r => r.teamId === G.teamId);
    if (picked && String(picked.player?.id || picked.player?.name) === String(draftPref)) {
      summary.push(`✅ 球队采纳了你的选秀建议！`);
    } else {
      summary.push(`❌ 球队最终没有选择你推荐的球员`);
    }
  }
  G._offseasonDraftState = draftState;
  G._offseasonRenewRes = renewRes;
  G._offseasonDraftSummary = summary;
  if (isPlayerAlpha()) {
    const freePool = processDraftFinishStage(draftState, renewRes.released);
    const affordable = getAffordableFreeAgents(G.teamId, freePool, 8);
    if (affordable.length > 0) {
      showFAInviteModal(affordable, freePool);
      return;
    }
  }
  _offseasonFinishPipeline(null);
}
function _offseasonFinishPipeline(faPref) {
  const draftState = G._offseasonDraftState;
  const renewRes = G._offseasonRenewRes;
  const draftSummary = G._offseasonDraftSummary || [];
  const faSummary = runOffseasonStaged_fa(draftState, renewRes, faPref);
  G.offseasonSummary = [...draftSummary, ...faSummary];
  endSeasonPostPipeline();
  delete G._offseasonDraftState;
  delete G._offseasonRenewRes;
  delete G._offseasonDraftSummary;
  _offseasonContinue();
}
function _offseasonContinue() {
  if (G.player.contractYears <= 0) {
    showFreeAgencyModal();
  } else {
    showOffseasonModal();
  }
}
function showDraftDecisionModal(pickIdx, prospects, renewRes, draftState) {
  const pickNo = pickIdx + 1;
  const team = getTeam(G.teamId) || {};
  G._draftProspects = prospects;
  G._draftRenewRes = renewRes;
  G._draftState = draftState;
  G._offseasonModalDismiss = () => selectDraftProspect(-1);
  showModal(`
    <div class="modal-hd"><h3>🎓 选秀建议</h3><button class="modal-x" onclick="selectDraftProspect(-1)">✕</button></div>
    <div class="mb-16 t-2">作为球队当家球星，管理层希望听取你的选秀意见。</div>
    <div class="mb-16"><span class="fw-b">${team.z} ${team.n}</span> 持有第 <span class="t-gold fw-b">${pickNo}</span> 顺位</div>
    <div class="mb-16 fw-b">预计顺位附近的新秀：</div>
    ${prospects.map((p, i) => {
    const posText = posLabel(p.pos) + (parseNum(p.pos2, 0) ? '/' + posLabel(p.pos2) : '');
    const rating = parseNum(p.rating, 70);
    const pot = parseNum(p.potential, rating);
    return `<div class="choice-card mb-16" style="text-align:left;cursor:pointer" onclick="selectDraftProspect(${i})">
        <div class="flex fb">
          <div>
            <span class="fw-b">${p.name}</span>
            <span class="badge b-pri">${posText}</span>
          </div>
          <button class="btn btn-sm btn-ok" onclick="event.stopPropagation();selectDraftProspect(${i})">推荐</button>
        </div>
        <div class="t-2 fs-sm mt-12">能力 ${rating} | 潜力 ${pot} | 球探评分 ${p.scoutScore?.toFixed(1) || '-'}</div>
      </div>`;
  }).join('')}
    <button class="btn btn-sm" onclick="selectDraftProspect(-1)" style="width:100%;margin-top:8px;opacity:.7">不干预，交给管理层</button>
  `);
}
function selectDraftProspect(idx) {
  const prospects = G._draftProspects || [];
  const renewRes = G._draftRenewRes;
  const draftState = G._draftState;
  const pref = idx >= 0 && prospects[idx] ? String(prospects[idx].id) : null;
  delete G._draftProspects;
  delete G._draftRenewRes;
  delete G._draftState;
  delete G._offseasonModalDismiss;
  hideModal();
  _offseasonAfterDraft(renewRes, pref, draftState);
}
function showFAInviteModal(affordable, fullPool) {
  G._faInvitePool = fullPool;
  G._offseasonModalDismiss = () => selectFAInvite(-1);
  showModal(`
    <div class="modal-hd"><h3>📋 自由球员邀约</h3><button class="modal-x" onclick="selectFAInvite(-1)">✕</button></div>
    <div class="mb-16 t-2">作为当家球星，你可以向管理层推荐一名自由球员。</div>
    <div class="mb-16 t-2 fs-sm">薪资空间: $${formatSalaryM(LEAGUE_SALARY_CAP_M * 1.18 - teamPayrollMillion(G.teamId))}M</div>
    ${affordable.map((p, i) => {
    const posText = posLabel(p.pos) + (parseNum(p.pos2, 0) ? '/' + posLabel(p.pos2) : '');
    const rating = parseNum(p.rating, 70);
    const age = parseNum(p.age, 25);
    const c = npcFreeAgentContract(p);
    return `<div class="choice-card mb-16" style="text-align:left;cursor:pointer" onclick="selectFAInvite(${i})">
        <div class="flex fb">
          <div>
            <span class="fw-b">${p.name}</span>
            <span class="badge b-pri">${posText}</span>
          </div>
          <button class="btn btn-sm btn-ok" onclick="event.stopPropagation();selectFAInvite(${i})">邀请</button>
        </div>
        <div class="t-2 fs-sm mt-12">能力 ${rating} | 年龄 ${age} | 预估合同 ${c.years}年 $${formatSalaryM(c.salary)}M/年</div>
      </div>`;
  }).join('')}
    <button class="btn btn-sm" onclick="selectFAInvite(-1)" style="width:100%;margin-top:8px;opacity:.7">不干预，交给管理层</button>
  `);
  G._faInviteAffordable = affordable;
}
function selectFAInvite(idx) {
  const affordable = G._faInviteAffordable || [];
  const pref = idx >= 0 && affordable[idx] ? String(affordable[idx].id) : null;
  delete G._faInviteAffordable;
  delete G._faInvitePool;
  delete G._offseasonModalDismiss;
  hideModal();
  _offseasonFinishPipeline(pref);
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
  delete G._nextDraftPreview;
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
          <td>${nameCell}${p.injury?.active ? ` <span class="badge b-no">🩹 ${p.injury.type} 缺${p.injury.games}场</span>` : ''}</td>
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
  const injuryMap = new Map();
  roster.forEach(p => { if (p.injury?.active) injuryMap.set(String(p.id || (p.isSelf ? 'USER_SELF' : '')), p.injury); });
  function injBadge(id, isSelf) {
    const inj = injuryMap.get(String(id)) || (isSelf ? injuryMap.get('USER_SELF') : null);
    return inj ? `<span class="badge b-no">🩹 ${inj.type} 缺${inj.games}场</span>` : '';
  }
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
          <span class="badge b-pri">${getRotationRoleLabel(rp.rotationRole, rp)}</span>
          ${injBadge(rp.id, rp.isSelf)}
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
          ${pl.injury?.active ? `<span class="badge b-no">🩹 ${pl.injury.type} 缺${pl.injury.games}场</span>` : ''}
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
  const map = {
    fame: '声望',
    trust: '信任',
    money: '金钱',
    xp: '经验',
    stamina: '体力',
    games: '缺阵',
    injury: '受伤风险',
    risk: '风险',
    pass: '传球',
    shotInt: '内线',
    shotExt: '外线',
    shotFree: '罚球',
    speed: '速度',
    strength: '力量',
    reb: '篮板',
    blk: '盖帽',
    stl: '抢断',
    physique: '体能'
  };
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
  const allowed = new Set(['feed', 'compose', 'market', 'endorse', 'inbox']);
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
function renderPhoneEndorseTab() {
  const view = typeof buildEndorsementOffersView === 'function' ? buildEndorsementOffersView() : null;
  const resultMsg = G._phoneEndorseResult ? `<div class="ev ${G._phoneEndorseResult.ok ? 'pos' : 'neg'}" style="margin-bottom:10px">${G._phoneEndorseResult.message}</div>` : '';
  if (!view) {
    return '<div class="card" style="margin:0"><div class="t-2">代言系统未加载</div></div>';
  }
  const summary = view.summary || {};
  const activeCards = (view.activeDeals || []).length ? view.activeDeals.map(deal => {
    const shoe = deal.shoe || null;
    return `
      <div class="ev pos" style="margin-bottom:8px">
        <div class="flex fb">
          <div>
            <div class="fw-b">${deal.brand}</div>
            <div class="t-2 fs-xs">${deal.category} · ${deal.product}</div>
          </div>
          <span class="badge b-ok">生效中</span>
        </div>
        <div class="t-2 fs-sm mt-8">剩余 ${parseNum(deal.remainingDays, 0)} 天 | 基础日入 $${phoneFmtM(deal.baseDailyIncome)} | 比赛日 $${phoneFmtM(deal.baseGameIncome)} | 累计 $${phoneFmtM(deal.earned)}</div>
        ${shoe ? `<div class="t-2 fs-sm mt-8">自创球鞋：${shoe.name}</div><div class="t-2 fs-sm mt-4">属性：${formatEffectText(shoe.boosts || {})}</div><div class="t-2 fs-sm mt-4">额外分成：日常 $${phoneFmtM(shoe.dailyIncome)} | 比赛日 $${phoneFmtM(shoe.gameIncome)}</div>` : (deal.shoeEligible ? '<div class="t-2 fs-sm mt-8">这份球鞋代言还可以继续打造你的签名鞋。</div>' : '')}
        ${deal.shoeEligible ? `
          <div class="mt-12">
            <button class="btn btn-gold btn-sm" onclick="doPhoneCreateSignatureShoe('${deal.id}')">创建签名鞋</button>
          </div>` : ''}
      </div>`;
  }).join('') : '<div class="t-2 fs-sm">暂无已签约代言</div>';

  const renderOffer = (offer) => {
    const statusMeta = {
      active: { text: '生效中', cls: 'b-ok' },
      available: { text: '可签约', cls: 'b-gold' },
      locked: { text: '未解锁', cls: 'b-pri' },
      rejected: { text: '本季已拒绝', cls: 'b-no' }
    };
    const st = statusMeta[offer.status] || statusMeta.locked;
    const active = offer.active || null;
    const activeShoe = active?.shoe || null;
    return `
      <div class="ev ${offer.status === 'active' ? 'pos' : offer.status === 'locked' ? 'neu' : offer.status === 'rejected' ? 'neg' : 'neu'}" style="margin-bottom:8px;opacity:${offer.status === 'locked' ? 0.78 : 1}">
        <div class="flex fb">
          <div>
            <div class="fw-b">${offer.brand}</div>
            <div class="t-2 fs-xs">${offer.product} · ${offer.category}</div>
          </div>
          <span class="badge ${st.cls}">${st.text}</span>
        </div>
        <div class="t-2 fs-sm mt-8">签约金 $${phoneFmtM(offer.signingBonus)} | 日常 $${phoneFmtM(offer.dailyIncome)} | 比赛日 $${phoneFmtM(offer.gameIncome)} | 合约 ${parseNum(offer.termDays, 0)} 天</div>
        <div class="t-2 fs-xs mt-8">解锁：市场分≥${parseNum(offer.marketScore, 0)} / 声望≥${parseNum(offer.minFame, 0)} / 信任≥${parseNum(offer.minTrust, 0)} / 荣誉分≥${parseNum(offer.minHonor, 0)}</div>
        ${offer.note ? `<div class="t-2 fs-xs mt-8">${offer.note}</div>` : ''}
        ${offer.status === 'available' ? `
          <div class="grid g2 mt-12">
            <button class="btn btn-gold btn-sm" onclick="doPhoneAcceptEndorsement('${offer.id}')">签约</button>
            <button class="btn btn-pri btn-sm" onclick="doPhoneRejectEndorsement('${offer.id}')">拒绝</button>
          </div>` : ''}
        ${offer.status === 'active' && offer.shoeEligible ? `
          <div class="t-2 fs-xs mt-12">球鞋代言可继续打造签名鞋，属性会直接加到球员身上。</div>
          <div class="mt-8">
            <button class="btn btn-gold btn-sm" onclick="doPhoneCreateSignatureShoe('${offer.id}')">创建签名鞋</button>
          </div>` : ''}
        ${offer.status === 'active' && active ? `
          <div class="t-2 fs-xs mt-12">累计入账 $${phoneFmtM(active.earned)} · 剩余 ${parseNum(active.remainingDays, 0)} 天</div>
          ${activeShoe ? `<div class="t-2 fs-xs mt-4">签名鞋：${activeShoe.name} · ${formatEffectText(activeShoe.boosts || {})}</div>` : ''}
        ` : ''}
        ${offer.status === 'locked' ? `<div class="t-2 fs-xs mt-8">原因：${offer.lockReason || '当前市场表现暂未达到要求'}</div>` : ''}
      </div>`;
  };

  return `
  <div class="card" style="margin:0">
    <div class="card-title">🤝 代言中心</div>
    ${resultMsg}
    <div class="grid g2">
      <div class="stat-box"><div class="stat-val">${parseNum(summary.marketScore, 0).toFixed(1)}</div><div class="stat-lbl">代言市场分</div></div>
      <div class="stat-box"><div class="stat-val">${summary.marketLabel || '未评级'}</div><div class="stat-lbl">当前档位</div></div>
      <div class="stat-box"><div class="stat-val">${summary.activeCount || 0}</div><div class="stat-lbl">已签约</div></div>
      <div class="stat-box"><div class="stat-val">$${phoneFmtM(summary.totalDailyIncome || 0)}</div><div class="stat-lbl">日常分成</div></div>
    </div>
    <div class="t-2 fs-sm mt-12">声望 ${parseNum(summary.fame, 0)} | 信任 ${parseNum(summary.trust, 0)} | 荣誉分 ${parseNum(summary.honorScore, 0)} | 荣誉：${summary.honorText || '暂无'}</div>
    <div class="t-2 fs-sm mt-8">综合：${parseNum(summary.overall, 0)} | 场均 ${parseNum(summary.ppg, 0).toFixed(1)} / ${parseNum(summary.apg, 0).toFixed(1)} / ${parseNum(summary.rpg, 0).toFixed(1)} | 比赛日额外分成 $${phoneFmtM(summary.totalGameIncome || 0)}</div>
    <div class="mt-16">
      <div class="fw-b mb-12">当前已签约</div>
      ${activeCards}
    </div>
    <div class="mt-16">
      <div class="fw-b mb-12">50 个代言品牌池</div>
      <div class="t-2 fs-sm mb-12">当前可签约 ${summary.availableCount || 0} 个，未解锁 ${summary.lockedCount || 0} 个，本季拒绝 ${summary.rejectedCount || 0} 个。</div>
      ${view.categories.map(cat => `
        <div class="mt-16">
          <div class="fw-b mb-12">${cat.name} <span class="badge b-pri">${cat.items.length} 个</span></div>
          ${cat.items.map(renderOffer).join('')}
        </div>
      `).join('')}
    </div>
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
  else if (tab === 'endorse') content = renderPhoneEndorseTab();
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
          ${tabBtn('endorse', '代言')}
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
function doPhoneAcceptEndorsement(offerId) {
  if (typeof acceptEndorsementOffer !== 'function') return;
  const res = acceptEndorsementOffer(offerId);
  G._phoneEndorseResult = { ok: !!res.ok, message: res.message || (res.ok ? '签约成功' : '签约失败') };
  updateHeader();
  renderPhone();
}
function doPhoneRejectEndorsement(offerId) {
  if (typeof rejectEndorsementOffer !== 'function') return;
  const res = rejectEndorsementOffer(offerId);
  G._phoneEndorseResult = { ok: !!res.ok, message: res.message || (res.ok ? '已拒绝' : '操作失败') };
  renderPhone();
}
function doPhoneCreateSignatureShoe(offerId, styleKey) {
  if (typeof createSignatureShoeForOffer !== 'function') return;
  const res = createSignatureShoeForOffer(offerId, styleKey || 'allaround');
  G._phoneEndorseResult = { ok: !!res.ok, message: res.message || (res.ok ? '球鞋打造完成' : '球鞋打造失败') };
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

// ============ COMMERCE PAGE ============
let _commerceTab = 'overview';
function setCommerceTab(tab) {
  _commerceTab = tab;
  renderCommerce();
}
function renderCommerce() {
  if (typeof ensureEconomyState === 'function') ensureEconomyState();
  if (typeof ensureSocialState === 'function') ensureSocialState();
  const pg = $('commercePage');
  const tab = _commerceTab;
  const tabBtn = (id, label) => `<button class="btn btn-sm ${tab === id ? 'btn-gold' : 'btn-pri'}" style="padding:6px 12px" onclick="setCommerceTab('${id}')">${label}</button>`;
  let content = '';
  if (tab === 'overview') content = renderCommerceOverview();
  else if (tab === 'endorse') content = renderCommerceEndorse();
  else if (tab === 'assets') content = renderCommerceAssets();
  else if (tab === 'shoe') content = renderCommerceShoe();
  else if (tab === 'logs') content = renderCommerceLogs();
  pg.innerHTML = `
  <div style="max-width:720px;margin:0 auto">
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px">
      ${tabBtn('overview', '概览')}
      ${tabBtn('endorse', '代言')}
      ${tabBtn('shoe', '签名鞋')}
      ${tabBtn('assets', '资产')}
      ${tabBtn('logs', '动态')}
    </div>
    ${content}
  </div>`;
}
function renderCommerceOverview() {
  const shop = typeof buildEconomyShopView === 'function' ? buildEconomyShopView() : null;
  const endorseView = typeof buildEndorsementOffersView === 'function' ? buildEndorsementOffersView() : null;
  const s = endorseView?.summary || {};
  const sh = shop || {};
  const signatureShoe = typeof getSignatureShoeCurrentState === 'function' && s.signatureShoe
    ? getSignatureShoeCurrentState(s.signatureShoe) : null;
  return `
  <div class="card" style="margin-bottom:12px">
    <div class="card-title">财务概览</div>
    <div class="grid g3">
      <div class="stat-box"><div class="stat-val">$${phoneFmtM(sh.cash || 0)}</div><div class="stat-lbl">现金</div></div>
      <div class="stat-box"><div class="stat-val">$${phoneFmtM(G.player.salary)}</div><div class="stat-lbl">年薪</div></div>
      <div class="stat-box"><div class="stat-val">${parseNum(s.activeCount, 0)}</div><div class="stat-lbl">代言数</div></div>
      <div class="stat-box"><div class="stat-val">$${phoneFmtM(s.totalDailyIncome || 0)}</div><div class="stat-lbl">日常分成</div></div>
      <div class="stat-box"><div class="stat-val">$${phoneFmtM(s.totalGameIncome || 0)}</div><div class="stat-lbl">比赛日分成</div></div>
      <div class="stat-box"><div class="stat-val">${parseNum(s.marketScore, 0).toFixed(1)}</div><div class="stat-lbl">市场分</div></div>
    </div>
    <div class="t-2 fs-sm mt-12">声望 ${parseNum(s.fame, 0)} | 信任 ${parseNum(s.trust, 0)} | 档位 ${s.marketLabel || '未评级'}</div>
  </div>
  ${signatureShoe ? `
  <div class="card" style="margin-bottom:12px">
    <div class="card-title">签名鞋</div>
    <div style="text-align:center;margin-bottom:12px">
      <img src="${signatureShoe.image}" alt="${signatureShoe.name}" style="max-width:200px;border-radius:12px;box-shadow:0 4px 16px rgba(0,0,0,.3)" />
    </div>
    <div class="fw-b" style="text-align:center">${signatureShoe.name}</div>
    <div class="t-2 fs-sm" style="text-align:center">${signatureShoe.brand} · ${signatureShoe.styleLabel} · L${signatureShoe.level}</div>
    <div class="t-2 fs-sm mt-8" style="text-align:center">属性：${formatEffectText(signatureShoe.boosts || {})}</div>
    <div class="t-2 fs-sm" style="text-align:center">日常 $${phoneFmtM(signatureShoe.dailyIncome)} | 比赛日 $${phoneFmtM(signatureShoe.gameIncome)}</div>
    <div class="t-2 fs-sm" style="text-align:center">点数 ${signatureShoe.pointsUsed}/${signatureShoe.pointsBudget}${signatureShoe.remainingPoints > 0 ? `（剩余 ${signatureShoe.remainingPoints} 点）` : ''}</div>
  </div>` : ''}
  ${(endorseView?.activeDeals || []).length ? `
  <div class="card" style="margin-bottom:12px">
    <div class="card-title">已签约代言</div>
    ${(endorseView.activeDeals || []).map(deal => `
      <div class="ev pos" style="margin-bottom:8px">
        <div class="flex fb">
          <div><div class="fw-b">${deal.brand}</div><div class="t-2 fs-xs">${deal.category} · ${deal.product}</div></div>
          <span class="badge b-ok">生效中</span>
        </div>
        <div class="t-2 fs-sm mt-8">剩余 ${parseNum(deal.remainingDays, 0)} 天 | 日常 $${phoneFmtM(deal.baseDailyIncome)} | 累计 $${phoneFmtM(deal.earned)}</div>
      </div>`).join('')}
  </div>` : ''}
  <div class="card" style="margin-bottom:12px">
    <div class="card-title">团队</div>
    <div class="t-2 fs-sm">体能教练：${sh.staminaCurrent?.name || '未聘请'} (Lv.${sh.staminaLevel || 0})</div>
    <div class="t-2 fs-sm">训练教练：${sh.trainingCurrent?.name || '未聘请'} (Lv.${sh.trainingLevel || 0})</div>
  </div>`;
}
function renderCommerceEndorse() {
  const view = typeof buildEndorsementOffersView === 'function' ? buildEndorsementOffersView() : null;
  if (!view) return '<div class="card"><div class="t-2">代言系统未加载</div></div>';
  const s = view.summary || {};
  const resultMsg = G._commerceEndorseResult ? `<div class="ev ${G._commerceEndorseResult.ok ? 'pos' : 'neg'}" style="margin-bottom:10px">${G._commerceEndorseResult.message}</div>` : '';
  const renderOffer = (offer) => {
    const statusMeta = {
      active: { text: '生效中', cls: 'b-ok' },
      available: { text: '可签约', cls: 'b-gold' },
      locked: { text: '未解锁', cls: 'b-pri' },
      rejected: { text: '本季已拒绝', cls: 'b-no' }
    };
    const st = statusMeta[offer.status] || statusMeta.locked;
    const active = offer.active || null;
    const activeShoe = active?.shoe || null;
    return `
      <div class="ev ${offer.status === 'active' ? 'pos' : offer.status === 'locked' ? 'neu' : 'neu'}" style="margin-bottom:8px;opacity:${offer.status === 'locked' ? 0.78 : 1}">
        <div class="flex fb">
          <div><div class="fw-b">${offer.brand}</div><div class="t-2 fs-xs">${offer.product} · ${offer.category}</div></div>
          <span class="badge ${st.cls}">${st.text}</span>
        </div>
        <div class="t-2 fs-sm mt-8">签约金 $${phoneFmtM(offer.signingBonus)} | 日常 $${phoneFmtM(offer.dailyIncome)} | 比赛日 $${phoneFmtM(offer.gameIncome)} | 合约 ${parseNum(offer.termDays, 0)} 天</div>
        <div class="t-2 fs-xs mt-8">解锁：市场分≥${parseNum(offer.marketScore, 0)} / 声望≥${parseNum(offer.minFame, 0)} / 信任≥${parseNum(offer.minTrust, 0)}</div>
        ${offer.status === 'available' ? `
          <div class="grid g2 mt-12">
            <button class="btn btn-gold btn-sm" onclick="doCommerceAcceptEndorsement('${offer.id}')">签约</button>
            <button class="btn btn-pri btn-sm" onclick="doCommerceRejectEndorsement('${offer.id}')">拒绝</button>
          </div>` : ''}
        ${offer.status === 'active' && offer.shoeEligible && !activeShoe ? `
          <div class="mt-12">
            <button class="btn btn-gold btn-sm" onclick="doCommerceCreateShoe('${offer.id}')">创建签名鞋</button>
          </div>` : ''}
        ${offer.status === 'active' && active ? `
          <div class="t-2 fs-xs mt-12">累计 $${phoneFmtM(active.earned)} · 剩余 ${parseNum(active.remainingDays, 0)} 天</div>
          ${activeShoe ? `<div class="t-2 fs-xs mt-4">签名鞋：${activeShoe.name} · ${formatEffectText(activeShoe.boosts || {})}</div>` : ''}
        ` : ''}
        ${offer.status === 'locked' ? `<div class="t-2 fs-xs mt-8">原因：${offer.lockReason || '暂未达标'}</div>` : ''}
      </div>`;
  };
  return `
  <div class="card" style="margin-bottom:12px">
    <div class="card-title">代言市场</div>
    ${resultMsg}
    <div class="grid g4">
      <div class="stat-box"><div class="stat-val">${parseNum(s.marketScore, 0).toFixed(1)}</div><div class="stat-lbl">市场分</div></div>
      <div class="stat-box"><div class="stat-val">${s.marketLabel || '未评级'}</div><div class="stat-lbl">档位</div></div>
      <div class="stat-box"><div class="stat-val">${s.activeCount || 0}</div><div class="stat-lbl">已签约</div></div>
      <div class="stat-box"><div class="stat-val">${s.availableCount || 0}</div><div class="stat-lbl">可签约</div></div>
    </div>
    <div class="t-2 fs-sm mt-12">声望 ${parseNum(s.fame, 0)} | 信任 ${parseNum(s.trust, 0)} | 荣誉分 ${parseNum(s.honorScore, 0)}</div>
  </div>
  <div class="card" style="margin-bottom:12px">
    <div class="card-title">50 个代言品牌池</div>
    ${view.categories.map(cat => `
      <div class="mt-16">
        <div class="fw-b mb-12">${cat.name} <span class="badge b-pri">${cat.items.length} 个</span></div>
        ${cat.items.map(renderOffer).join('')}
      </div>
    `).join('')}
  </div>`;
}
function renderCommerceAssets() {
  const shop = typeof buildEconomyShopView === 'function' ? buildEconomyShopView() : null;
  if (!shop) return '<div class="card"><div class="t-2">资产系统未加载</div></div>';
  const purchaseMsg = G._commerceAssetResult ? `<div class="ev ${G._commerceAssetResult.ok ? 'pos' : 'neg'}" style="margin-bottom:10px">${G._commerceAssetResult.message}</div>` : '';
  return `
  <div class="card" style="margin-bottom:12px">
    <div class="card-title">团队升级</div>
    ${purchaseMsg}
    <div class="grid g2">
      <div class="stat-box"><div class="stat-val">$${phoneFmtM(shop.cash)}</div><div class="stat-lbl">现金</div></div>
      <div class="stat-box"><div class="stat-val">$${phoneFmtM(G.player.salary)}</div><div class="stat-lbl">年薪</div></div>
    </div>
    <div class="mt-16">
      <div class="fw-b">体能教练：Lv.${shop.staminaLevel}（${shop.staminaCurrent?.name || '未聘请'}）</div>
      <div class="t-2 fs-sm mt-12">休息恢复 +${parseNum(shop.staminaCurrent?.restBonus, 0)} | 赛后恢复 +${parseNum(shop.staminaCurrent?.gameBonus, 0)} | 伤病系数 ×${parseNum(shop.staminaCurrent?.injuryMult, 1).toFixed(2)}</div>
      ${shop.staminaNext ? `<button class="btn btn-pri mt-12" onclick="doCommerceBuyStamina()">升级到 ${shop.staminaNext.name}（$${phoneFmtM(shop.staminaNext.cost)}）</button>` : '<div class="t-2 fs-sm mt-12">已满级</div>'}
    </div>
    <div class="mt-16">
      <div class="fw-b">训练教练：Lv.${shop.trainingLevel}（${shop.trainingCurrent?.name || '未聘请'}）</div>
      <div class="t-2 fs-sm mt-12">训练 XP 倍率 ×${parseNum(shop.trainingCurrent?.xpMult, 1).toFixed(2)}</div>
      ${shop.trainingNext ? `<button class="btn btn-pri mt-12" onclick="doCommerceBuyTraining()">升级到 ${shop.trainingNext.name}（$${phoneFmtM(shop.trainingNext.cost)}）</button>` : '<div class="t-2 fs-sm mt-12">已满级</div>'}
    </div>
  </div>
  <div class="card" style="margin-bottom:12px">
    <div class="card-title">奢侈品</div>
    ${shop.luxury.map(it => `
      <div class="ev neu" style="margin-bottom:8px">
        <div class="flex fb">
          <span class="fw-b">${it.name}</span>
          <span class="t-2">$${phoneFmtM(it.cost)}</span>
        </div>
        <div class="t-2 fs-sm mt-12">声望 ${it.fame >= 0 ? '+' : ''}${it.fame}，信任 ${it.trust >= 0 ? '+' : ''}${it.trust}</div>
        ${it.owned ? '<span class="badge b-ok mt-12">已拥有</span>' : `<button class="btn btn-cyan btn-sm mt-12" onclick="doCommerceBuyLuxury('${it.id}')">购买</button>`}
      </div>
    `).join('')}
  </div>`;
}
function renderCommerceShoe() {
  if (typeof getEndorsementState !== 'function') return '<div class="card"><div class="t-2">签名鞋系统未加载</div></div>';
  const state = getEndorsementState();
  const shoeContracts = (state.active || []).filter(c => c && c.shoeEligible);
  const shoeResult = G._commerceShoeResult || null;
  const resultMsg = shoeResult ? `<div class="ev ${shoeResult.ok ? 'pos' : 'neg'}" style="margin-bottom:12px">${shoeResult.message}</div>` : '';

  if (!shoeContracts.length) {
    return `
    <div class="card">
      <div class="card-title">签名鞋</div>
      ${resultMsg}
      <div class="t-2 fs-sm">暂无球鞋代言。先在「代言」标签签约带有<span class="badge b-gold" style="margin:0 4px">鞋类</span>标记的代言（运动装备类），即可在此打造签名鞋。</div>
    </div>`;
  }

  return shoeContracts.map(contract => {
    const shoe = typeof getSignatureShoeCurrentState === 'function' ? getSignatureShoeCurrentState(contract) : null;
    const upgradeStatus = typeof getSignatureShoeUpgradeStatus === 'function' ? getSignatureShoeUpgradeStatus(contract, shoe) : null;
    const cid = String(contract.id);

    if (!shoe) {
      return `
      <div class="card" style="margin-bottom:12px">
        <div class="card-title">${contract.brand} · ${contract.product}</div>
        ${resultMsg}
        <div class="t-2 fs-sm mb-12">球鞋代言已签约，可以打造你的签名鞋。</div>
        <div class="mt-8">
          <button class="btn btn-gold btn-sm" onclick="doCommerceCreateShoe('${cid}')">创建签名鞋</button>
        </div>
      </div>`;
    }

    const allocs = shoe.allocations || {};
    const slotLabels = { speed: '速度', shooting: '投射', finishing: '终结', playmaking: '组织', defense: '防守' };
    const allocRows = Object.entries(slotLabels).map(([key, label]) => {
      const val = parseNum(allocs[key], 0);
      return `
      <div style="display:flex;align-items:center;gap:0;margin-bottom:10px">
        <span style="width:52px;font-size:.85em;color:var(--t2)">${label}</span>
        <div style="flex:1;height:6px;background:rgba(255,255,255,.08);border-radius:3px;margin:0 10px;position:relative">
          <div style="width:${Math.round(val / Math.max(parseNum(shoe.pointsBudget,5),1) * 100)}%;height:100%;background:var(--gold);border-radius:3px;transition:width .2s"></div>
        </div>
        <span class="fw-b" style="width:20px;text-align:center;font-size:.95em">${val}</span>
        <button onclick="doCommerceAdjustAlloc('${cid}','${key}',-1)" style="margin-left:8px;width:26px;height:26px;border-radius:6px;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.06);color:#fff;cursor:pointer;font-size:1em;line-height:1;display:flex;align-items:center;justify-content:center">−</button>
        <button onclick="doCommerceAdjustAlloc('${cid}','${key}',1)" style="margin-left:4px;width:26px;height:26px;border-radius:6px;border:1px solid rgba(255,210,0,.45);background:rgba(255,200,0,.10);color:var(--gold);cursor:pointer;font-size:1em;line-height:1;display:flex;align-items:center;justify-content:center">＋</button>
      </div>`;
    }).join('');

    const upStatus = upgradeStatus || {};
    const upgradeBlock = upStatus.currentLevel < 5 ? `
      <div class="mt-16">
        <div class="fw-b mb-8">升级到 L${upStatus.nextLevel || (upStatus.currentLevel + 1)}</div>
        <div class="t-2 fs-sm">条件：${upStatus.targetText || '暂无信息'}</div>
        ${upStatus.canUpgrade
          ? `<button class="btn btn-gold mt-12" onclick="doCommerceUpgradeShoe('${cid}')">立即升级</button>`
          : `<div class="t-2 fs-sm mt-8 neg">未达标：${(upStatus.reasons || []).join(' / ')}</div>`}
      </div>` : '<div class="t-2 fs-sm mt-12 t-2">已达最高等级 L5</div>';

    return `
    <div class="card" style="margin-bottom:12px">
      <div class="card-title">签名鞋 · ${contract.brand}</div>
      ${resultMsg}
      <div style="text-align:center;margin-bottom:12px">
        <img src="${shoe.image}" alt="${shoe.name}" style="max-width:180px;border-radius:12px;box-shadow:0 4px 16px rgba(0,0,0,.35)" />
      </div>
      <div class="fw-b" style="text-align:center">${shoe.name}</div>
      <div class="t-2 fs-sm" style="text-align:center">${shoe.brand} · ${shoe.styleLabel} · L${shoe.level}</div>
      <div class="t-2 fs-sm mt-8" style="text-align:center">日常 $${phoneFmtM(shoe.dailyIncome)} | 比赛日 $${phoneFmtM(shoe.gameIncome)}</div>
      <div class="t-2 fs-sm" style="text-align:center">属性：${formatEffectText(shoe.boosts || {})}</div>

      <div class="mt-16">
        <div class="fw-b mb-8">属性分配（剩余 ${parseNum(shoe.remainingPoints, 0)} / ${parseNum(shoe.pointsBudget, 5)} 点）</div>
        ${allocRows}
      </div>

      <div class="mt-16">
        <div class="fw-b mb-8">改名</div>
        <div style="display:flex;gap:8px">
          <input id="shoeRename_${cid}" class="form-control" value="${shoe.name}" style="flex:1" maxlength="28" />
          <button class="btn btn-pri btn-sm" onclick="doCommerceRenameShoe('${cid}')">确认</button>
        </div>
      </div>

      ${upgradeBlock}

      <div class="mt-16">
        <div class="fw-b mb-8">球鞋外形提示词（可选）</div>
        <textarea id="shoeImageHint_${cid}" class="form-control" rows="2" placeholder="例：黑金配色，鞋面有龙纹，低帮设计，镂空侧翼" style="font-size:.85em">${shoe.imagePrompt ? '' : ''}</textarea>
        <button class="btn btn-cyan mt-12" onclick="doCommerceGenShoeImage('${cid}')">🎨 生成/更新球鞋图片</button>
      </div>
    </div>`;
  }).join('');
}
function renderCommerceLogs() {  const logs = G.economy?.logs || [];
  const events = typeof getRecentCommercialEvents === 'function' ? getRecentCommercialEvents(10) : [];
  return `
  <div class="card" style="margin-bottom:12px">
    <div class="card-title">商业动态</div>
    ${events.length ? events.map(e => `
      <div class="ev ${e.type === 'purchase' ? 'neu' : 'pos'}" style="margin-bottom:8px">
        <div class="fw-b">${e.displayLabel || e.label || ''}</div>
        <div class="t-2 fs-sm mt-8">${e.detail || ''}</div>
      </div>`).join('') : '<div class="t-2 fs-sm">暂无商业动态</div>'}
  </div>
  <div class="card" style="margin-bottom:12px">
    <div class="card-title">财务流水</div>
    ${logs.length ? logs.slice(0, 15).map(l => `<div class="t-2 fs-sm" style="margin-bottom:4px">S${l.season || ''} D${l.day || ''} ${l.text}</div>`).join('') : '<div class="t-2 fs-sm">暂无流水</div>'}
  </div>`;
}
function doCommerceAcceptEndorsement(offerId) {
  if (typeof acceptEndorsementOffer !== 'function') return;
  const res = acceptEndorsementOffer(offerId);
  G._commerceEndorseResult = { ok: !!res.ok, message: res.message || (res.ok ? '签约成功' : '签约失败') };
  updateHeader();
  renderCommerce();
}
function doCommerceRejectEndorsement(offerId) {
  if (typeof rejectEndorsementOffer !== 'function') return;
  const res = rejectEndorsementOffer(offerId);
  G._commerceEndorseResult = { ok: !!res.ok, message: res.message || (res.ok ? '已拒绝' : '操作失败') };
  renderCommerce();
}
function doCommerceCreateShoe(offerId, styleKey) {
  if (typeof createSignatureShoeForOffer !== 'function') return;
  const res = createSignatureShoeForOffer(offerId, styleKey || 'allaround');
  G._commerceEndorseResult = { ok: !!res.ok, message: res.message || (res.ok ? '球鞋打造完成' : '球鞋打造失败') };
  updateHeader();
  renderCommerce();
}
function doCommerceBuyStamina() {
  if (typeof buyStaminaCoach !== 'function') return;
  const res = buyStaminaCoach();
  G._commerceAssetResult = { ok: !!res.ok, message: res.message || (res.ok ? '购买成功' : '购买失败') };
  updateHeader();
  renderCommerce();
}
function doCommerceBuyTraining() {
  if (typeof buyTrainingCoach !== 'function') return;
  const res = buyTrainingCoach();
  G._commerceAssetResult = { ok: !!res.ok, message: res.message || (res.ok ? '购买成功' : '购买失败') };
  updateHeader();
  renderCommerce();
}
function doCommerceBuyLuxury(itemId) {
  if (typeof buyLuxuryItem !== 'function') return;
  const res = buyLuxuryItem(itemId);
  G._commerceAssetResult = { ok: !!res.ok, message: res.message || (res.ok ? '购买成功' : '购买失败') };
  updateHeader();
  renderCommerce();
}
function doCommerceAdjustAlloc(contractId, slotKey, delta) {
  if (typeof adjustSignatureShoeAllocation !== 'function') return;
  const res = adjustSignatureShoeAllocation(contractId, slotKey, delta);
  G._commerceShoeResult = { ok: !!res.ok, message: res.message || (res.ok ? '已调整' : '调整失败') };
  renderCommerce();
}
function doCommerceSetShoeStyle(contractId, styleKey) {
  if (typeof setSignatureShoeStyle !== 'function') return;
  const res = setSignatureShoeStyle(contractId, styleKey);
  G._commerceShoeResult = { ok: !!res.ok, message: res.message || (res.ok ? '风格已切换' : '切换失败') };
  renderCommerce();
}
function doCommerceRenameShoe(contractId) {
  if (typeof renameSignatureShoe !== 'function') return;
  const input = document.getElementById('shoeRename_' + contractId);
  const name = input ? input.value.trim() : '';
  if (!name) return;
  const res = renameSignatureShoe(contractId, name);
  G._commerceShoeResult = { ok: !!res.ok, message: res.message || (res.ok ? '改名成功' : '改名失败') };
  renderCommerce();
}
function doCommerceUpgradeShoe(contractId) {
  if (typeof upgradeSignatureShoeContract !== 'function') return;
  const res = upgradeSignatureShoeContract(contractId);
  G._commerceShoeResult = { ok: !!res.ok, message: res.message || (res.ok ? '升级成功' : '升级失败') };
  updateHeader();
  renderCommerce();
}
async function doCommerceGenShoeImage(contractId) {
  if (typeof generateSignatureShoeImageForOffer !== 'function') return;
  const hintEl = document.getElementById('shoeImageHint_' + contractId);
  const extraHint = hintEl ? hintEl.value.trim() : '';
  G._commerceShoeResult = { ok: true, message: '正在生成图片...' };
  renderCommerce();
  try {
    let res;
    if (extraHint && typeof resolveEndorsementContract === 'function' && typeof buildSignatureShoeImagePrompt === 'function' && typeof generateSignatureShoeImageByLLM === 'function' && typeof updateSignatureShoeProject === 'function') {
      const contract = resolveEndorsementContract(contractId);
      const shoe = contract ? getSignatureShoeCurrentState(contract) : null;
      if (contract && shoe) {
        const basePrompt = buildSignatureShoeImagePrompt(contract, shoe);
        const fullPrompt = basePrompt + '. Custom appearance: ' + extraHint;
        const llm = G.social?.llm || {};
        const baseUrl = typeof normalizeLLMBaseUrl === 'function' ? normalizeLLMBaseUrl(llm.baseUrl) : (llm.baseUrl || '');
        const isGemini = typeof isGoogleGeminiEndpoint === 'function' && isGoogleGeminiEndpoint(baseUrl);
        const defaultModel = isGemini ? 'gemini-3.1-flash-image-preview' : 'gpt-image-1';
        const imageModel = (llm.imageModel || '').trim() || defaultModel;
        const llmResult = await generateSignatureShoeImageByLLM(fullPrompt, { model: imageModel });
        const image = llmResult.ok && llmResult.image ? llmResult.image : typeof buildSignatureShoeFallbackImage === 'function' ? buildSignatureShoeFallbackImage(contract, shoe) : '';
        res = updateSignatureShoeProject(contract, {
          image,
          imagePrompt: fullPrompt,
          imageModel: llmResult.ok ? (llmResult.model || imageModel) : 'fallback',
          imageStatus: llmResult.ok ? 'llm' : 'fallback',
          imageUpdatedAt: Date.now()
        }, { action: '签名鞋生图', detail: extraHint, buzz: true });
        res = { ok: !!res.ok, message: llmResult.ok ? `图片已生成（${llmResult.model || imageModel}）` : `已使用本地样图：${llmResult.message || ''}` };
      } else {
        res = await generateSignatureShoeImageForOffer(contractId);
      }
    } else {
      res = await generateSignatureShoeImageForOffer(contractId);
    }
    G._commerceShoeResult = { ok: !!res.ok, message: res.message || (res.ok ? '图片已生成' : '生成失败') };
  } catch (e) {
    G._commerceShoeResult = { ok: false, message: `生成失败：${e?.message || e}` };
  }
  renderCommerce();
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
  delete saveObj._latestGameRecap;
  delete saveObj._gameRecapMap;
  delete saveObj._gameEvent;
  delete saveObj._effortMode;
  delete saveObj._mainMenuLLMResult;
  delete saveObj._phoneComposeResult;
  delete saveObj._phoneShopResult;
  delete saveObj._phoneEndorseResult;
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
  let saveListHtml = '<div class="tc t-2 fs-sm">正在读取存档列表...</div>';

  if (G._saveHandle) {
    // If handle exists, list files
    if (!G._saveFiles) {
      refreshSaveFiles(); // Trigger async refresh
    } else if (G._saveFiles.length === 0) {
      saveListHtml = '<div class="tc t-2 fs-sm">该文件夹下没有 .json 存档</div>';
    } else {
      saveListHtml = G._saveFiles.map(f => `
         <div class="save-item flex-row justify-between align-center p-8 bg-black-2 mb-4 rounded border-1 border-white-1">
           <div class="flex-1 tl mr-10" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
             <div class="t-1 fs-sm">${f.name}</div>
             <div class="t-3 fs-xs">${new Date(f.lastModified).toLocaleString()}</div>
           </div>
           <button class="btn btn-sm btn-pri" onclick="loadSaveDirect('${f.name}')">读取</button>
         </div>
       `).join('');
    }
  }

  $('savePage').innerHTML = `
  <div class="card">
    <div class="card-title">💾 存档管理</div>
    <div class="tc p-16">
      <div class="mb-16">当前进度: ${G.year}赛季 第${G.season}年 | ${G.player.name} | 第${G.dayNum + 1}天</div>
      
      <!-- Auto Save Folder UI -->
      <div class="mb-16 p-12 bg-black-3 rounded border-1 border-gold-2">
        <div class="flex-row justify-between align-center mb-8">
            <div class="t-1 fw-bold">📂 自动存档目录</div>
             <button class="btn btn-sm btn-gold" onclick="bindSaveDirectory()">
               ${G._saveHandle ? '切换目录' : '📁 绑定 "Save" 文件夹'}
             </button>
        </div>
        ${G._saveHandle
      ? `<div class="t-2 fs-xs mb-8">已绑定: ${G._saveHandle.name} <span class="t-green">(点击保存直接写入)</span></div>`
      : '<div class="t-3 fs-xs mb-8">绑定后可一键保存/读取，无需每次选择文件。建议绑定根目录下的 Save 文件夹。</div>'}
        
        ${G._saveHandle ? `<div class="save-list" style="max-height:200px;overflow-y:auto;border:1px solid #333;padding:4px">${saveListHtml}</div>` : ''}
      </div>

      <div class="t-2 fs-sm mb-16">上次保存: ${lastSaveTime}</div>
      <div class="grid g2" style="gap:12px;max-width:500px;margin:0 auto">
        <button class="btn btn-gold" onclick="autoSaveToFile()" style="padding:14px 20px;font-size:16px">💾 保存存档</button>
        <div style="position:relative">
          <button class="btn btn-pri" style="padding:14px 20px;font-size:16px;width:100%">📂 读取本地文件</button>
          <input type="file" accept=".json" style="position:absolute;top:0;left:0;width:100%;height:100%;opacity:0;cursor:pointer" onchange="loadSaveFromFile(this)">
        </div>
      </div>
    </div>
  </div>
  <div class="card">
    <div class="card-title">⚡ 快速操作</div>
    <div class="tc p-16">
      <button class="btn btn-cyan" onclick="quickSaveLocalStorage()" style="padding:10px 20px">💾 临时存档（浏览器缓存）</button>
      <button class="btn btn-pri mt-12" onclick="quickLoadLocalStorage()" style="padding:10px 20px">📂 读取临时存档</button>
    </div>
  </div>`;

  // Try to load handle on first render if missing
  if (!G._saveHandleChecked) {
    G._saveHandleChecked = true;
    loadSavedHandle().then(h => {
      if (h) {
        G._saveHandle = h;
        refreshSaveFiles();
      }
    });
  }
}

// === Save Folder Automation ===
const DB_SAVE_CFG = { name: 'nba_save_db', store: 'config', key: 'save_handle' }; // Separate DB for safety
async function openSaveDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_SAVE_CFG.name, 1);
    req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains(DB_SAVE_CFG.store)) req.result.createObjectStore(DB_SAVE_CFG.store); };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function loadSavedHandle() {
  try {
    const db = await openSaveDB();
    return await new Promise(resolve => {
      const tx = db.transaction(DB_SAVE_CFG.store, 'readonly');
      const req = tx.objectStore(DB_SAVE_CFG.store).get(DB_SAVE_CFG.key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch (e) { return null; }
}

async function bindSaveDirectory() {
  try {
    const handle = await window.showDirectoryPicker({ id: 'nba_save_dir', mode: 'readwrite' });
    if (handle) {
      // Verify permission
      if ((await handle.queryPermission({ mode: 'readwrite' })) !== 'granted') {
        if ((await handle.requestPermission({ mode: 'readwrite' })) !== 'granted') return;
      }
      G._saveHandle = handle;
      // Save to DB
      const db = await openSaveDB();
      const tx = db.transaction(DB_SAVE_CFG.store, 'readwrite');
      tx.objectStore(DB_SAVE_CFG.store).put(handle, DB_SAVE_CFG.key);

      refreshSaveFiles();
    }
  } catch (e) {
    if (e.name !== 'AbortError') alert('绑定失败: ' + e.message);
  }
}

async function refreshSaveFiles() {
  if (!G._saveHandle) return;
  try {
    const files = [];
    for await (const entry of G._saveHandle.values()) {
      if (entry.kind === 'file' && entry.name.endsWith('.json')) {
        const file = await entry.getFile();
        files.push({ name: entry.name, lastModified: file.lastModified, handle: entry });
      }
    }
    // Sort by time desc
    files.sort((a, b) => b.lastModified - a.lastModified);
    G._saveFiles = files;
    if ($('savePage').classList.contains('active')) renderSave();
  } catch (e) {
    console.warn('Listing failed', e);
    // Maybe permission lost?
    G._saveHandle = null;
    renderSave();
  }
}

async function loadSaveDirect(filename) {
  if (!G._saveFiles) return;
  const target = G._saveFiles.find(f => f.name === filename);
  if (!target) return;
  try {
    const file = await target.handle.getFile();
    const text = await file.text();
    const data = JSON.parse(text);
    applySaveData(data);
    alert('读取成功: ' + filename);
  } catch (e) {
    alert('读取失败: ' + e.message);
  }
}

async function autoSaveToFile() {
  try {
    const saveObj = buildSaveObj();
    const json = JSON.stringify(saveObj, null, 2);
    const filename = getSaveFilename();

    if (G._saveHandle) {
      // Direct Write Mode
      try {
        // Check permission
        if ((await G._saveHandle.queryPermission({ mode: 'readwrite' })) !== 'granted') {
          if ((await G._saveHandle.requestPermission({ mode: 'readwrite' })) !== 'granted') throw new Error('Permission denied');
        }
        const fileHandle = await G._saveHandle.getFileHandle(filename, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(json);
        await writable.close();
        G._lastSaveTime = Date.now();
        try { localStorage.setItem('nba_save_auto', json); } catch (e) { }
        alert(`存档已保存到: ${G._saveHandle.name}/${filename}`);
        refreshSaveFiles(); // Update list
        if ($('savePage').classList.contains('active')) renderSave();
        return;
      } catch (e) {
        console.warn('Direct save failed, falling back', e);
      }
    }

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

  // 重新计算所有球队强度（修复旧存档未包含玩家的问题）
  if (LEAGUE.loaded && LEAGUE.teams) {
    Object.values(LEAGUE.teams).forEach(t => {
      // 确保calcTeamStrength能访问到正确的G.teamId/G.player
      if (typeof calcTeamStrength === 'function') {
        t.strength = calcTeamStrength(t);
      }
      // 重新计算球员ATT/DEF（修复旧存档数值相同的问题）
      if (Array.isArray(t.players)) {
        t.players.forEach(p => {
          if (p.attrs) {
            if (typeof calcPlayerAtt === 'function') p.att = calcPlayerAtt(p.attrs);
            if (typeof calcPlayerDef === 'function') p.def = calcPlayerDef(p.attrs);
          }
        });
      }
    });
  }

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
    home: renderHome, stats: renderStats,
    matches: renderMatchCenter, roster: renderRoster, upgrade: renderUpgrade, trade: renderTrade, awards: renderAwards,
    phone: renderPhone, save: renderSave, commerce: renderCommerce
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
      apiKey: typeof data.apiKey === 'string' ? data.apiKey : undefined,
      presets: data.presets && typeof data.presets === 'object' ? data.presets : undefined
    };
  } catch (e) {
    return null;
  }
}
function writeMainMenuLLMDraft({ enabled, baseUrl, model, apiKey, presets } = {}) {
  try {
    const payload = {
      enabled: typeof enabled === 'boolean' ? enabled : false,
      baseUrl: String(baseUrl || '').trim(),
      model: String(model || '').trim(),
      apiKey: String(apiKey || '').trim()
    };
    if (presets !== undefined) {
      payload.presets = typeof normalizeLLMPresetConfig === 'function'
        ? normalizeLLMPresetConfig(presets)
        : presets;
    }
    localStorage.setItem(MAIN_MENU_LLM_DRAFT_KEY, JSON.stringify(payload));
  } catch (e) { }
}
function collectMainMenuLLMPresetValues() {
  const presets = {
    enabled: $('menuLlmPresetEnabled')?.checked !== false,
    antiTalk: $('menuLlmPresetAntiTalk')?.checked !== false,
    strictTurnTaking: $('menuLlmPresetStrictTurnTaking')?.checked === true,
    styleEnabled: $('menuLlmPresetStyleEnabled')?.checked !== false,
    style: $('menuLlmPresetStyle')?.value || '白描',
    antiOmniscience: $('menuLlmPresetAntiOmniscience')?.checked !== false,
    antiVariable: $('menuLlmPresetAntiVariable')?.checked !== false,
    emotionControl: $('menuLlmPresetEmotionControl')?.checked !== false,
    roleHope: $('menuLlmPresetRoleHope')?.checked !== false,
    gameInteraction: $('menuLlmPresetGameInteraction')?.checked !== false,
    dataFirst: $('menuLlmPresetDataFirst')?.checked !== false
  };
  return typeof normalizeLLMPresetConfig === 'function'
    ? normalizeLLMPresetConfig(presets)
    : presets;
}
function collectMainMenuLLMFormValues() {
  const enabled = parseNum($('menuLlmEnabled')?.value, 0) === 1;
  const baseUrl = $('menuLlmBase')?.value || 'https://api.openai.com/v1';
  const model = $('menuLlmModel')?.value || 'gpt-4.1-mini';
  const apiKey = $('menuLlmKey')?.value || '';
  const presets = collectMainMenuLLMPresetValues();
  return { enabled, baseUrl, model, apiKey, presets };
}
function persistMainMenuLLMDraft() {
  writeMainMenuLLMDraft(collectMainMenuLLMFormValues());
}

function renderMainMenu() {
  if (typeof ensureSocialState === 'function') ensureSocialState();
  const llm = G.social?.llm || {
    enabled: false,
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4.1-mini',
    apiKey: '',
    presets: {
      enabled: true,
      antiTalk: true,
      strictTurnTaking: false,
      styleEnabled: true,
      style: '白描',
      antiOmniscience: true,
      antiVariable: true,
      emotionControl: true,
      roleHope: true,
      gameInteraction: true,
      dataFirst: true
    }
  };
  const draft = readMainMenuLLMDraft();
  const presetView = typeof normalizeLLMPresetConfig === 'function'
    ? normalizeLLMPresetConfig(draft?.presets || llm.presets || {})
    : {
      enabled: true,
      antiTalk: true,
      strictTurnTaking: false,
      styleEnabled: true,
      style: '白描',
      antiOmniscience: true,
      antiVariable: true,
      emotionControl: true,
      roleHope: true,
      gameInteraction: true,
      dataFirst: true
    };
  const presetStyleOptions = ['白描', 'TG推荐文风', 'TG推荐文风2', '纯爱文风', '轻小说文风', '热血', '数据流', '纪实', '吐槽'];
  const llmView = {
    enabled: typeof draft?.enabled === 'boolean' ? draft.enabled : !!llm.enabled,
    baseUrl: draft?.baseUrl || llm.baseUrl || 'https://api.openai.com/v1',
    model: draft?.model || llm.model || 'gpt-4.1-mini',
    apiKey: draft?.apiKey || llm.apiKey || '',
    presets: presetView
  };
  const modelOptions = Array.isArray(G.social?.llmModels) ? G.social.llmModels : [];
  const llmResult = G._mainMenuLLMResult ? `<div class="ev ${G._mainMenuLLMResult.ok ? 'pos' : 'neg'} mt-12">${G._mainMenuLLMResult.message}</div>` : '';
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  $('mainNav').style.display = 'none'; // Hide nav on main menu
  $('mainMenuPage').classList.add('active');

  const menuHtml = `
    <div class="main-menu-page">
      <div class="main-menu-shell">
        <section class="card main-menu-panel main-menu-hero">
          <div class="main-menu-brand">
            <div class="main-menu-mark">🏀</div>
            <div>
              <div class="main-menu-kicker">Career Launcher</div>
              <div class="main-menu-title">NBA Career Sim</div>
              <div class="main-menu-subtitle">从训练馆到镁光灯，打造你的篮球生涯。这里是新秀入口，也是你每次回归的更衣室。</div>
            </div>
          </div>
          <div class="main-menu-pills">
            <span class="main-menu-pill gold">选秀夜入口</span>
            <span class="main-menu-pill cyan">赛季叙事驱动</span>
            <span class="main-menu-pill purple">商业成长线</span>
          </div>
          <div class="main-menu-actions">
            <button class="btn btn-gold main-menu-primary" onclick="startNewGame()">开始新生涯</button>
            <div class="main-menu-file btn btn-pri">
              读取存档
              <input type="file" id="saveFileInput" accept=".json" onchange="importSave(this)">
            </div>
          </div>
          <div class="main-menu-tagline">版本 v1.2 | Local Save | 建议先完成右侧模型配置后再开档</div>
          <div class="main-menu-stat-grid">
            <div class="main-menu-stat">
              <div class="main-menu-stat-label">模式</div>
              <div class="main-menu-stat-value">生涯叙事</div>
              <div class="main-menu-stat-note">从新秀到全明星的完整剧本</div>
            </div>
            <div class="main-menu-stat">
              <div class="main-menu-stat-label">节奏</div>
              <div class="main-menu-stat-value">赛季推进</div>
              <div class="main-menu-stat-note">日程、交易、奖项全流程</div>
            </div>
            <div class="main-menu-stat">
              <div class="main-menu-stat-label">加成</div>
              <div class="main-menu-stat-value">商业系统</div>
              <div class="main-menu-stat-note">代言、奢侈品与签名鞋</div>
            </div>
          </div>
          <div class="main-menu-feature-grid">
            <div class="main-menu-feature gold">
              <div class="main-menu-feature-title">选秀夜剧情</div>
              <div class="main-menu-feature-copy">基于年份与球探报告生成分位与生涯起点。</div>
            </div>
            <div class="main-menu-feature cyan">
              <div class="main-menu-feature-title">球员成长</div>
              <div class="main-menu-feature-copy">属性、潜力与 X-Factor 推动长期进化。</div>
            </div>
            <div class="main-menu-feature purple">
              <div class="main-menu-feature-title">社媒动态</div>
              <div class="main-menu-feature-copy">赛季舆论与城市故事持续刷新。</div>
            </div>
            <div class="main-menu-feature red">
              <div class="main-menu-feature-title">商业兑现</div>
              <div class="main-menu-feature-copy">代言和签名鞋带来成长加成与现金流。</div>
            </div>
          </div>
          <div class="main-menu-footer">
            <span class="badge b-gold">本地存档</span>
            <span class="badge b-cyan">可自定义模型</span>
            <span class="badge b-purple">生成式叙事</span>
          </div>
        </section>

        <section class="card main-menu-panel main-menu-console">
          <div class="card-title">🤖 大模型配置（主页）</div>
          <div class="t-2 fs-sm">用于选秀前球探报道与赛季社媒生成。建议在开始新生涯前先配置。</div>
          <div class="main-menu-console-grid mt-12">
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
          <div class="main-menu-console-actions">
            <button class="btn btn-pri" onclick="doMainMenuSaveLLMSettings()">保存设置</button>
            <button class="btn btn-cyan" onclick="doMainMenuTestLLMConnectivity()">测试连通性并读取模型</button>
          </div>
          <div class="main-menu-status">
            ${llmResult}
            ${G.social?.lastLLMError ? `<div class="t-2 fs-sm mt-12">最近错误: ${G.social.lastLLMError}</div>` : ''}
          </div>

          <details class="main-menu-advanced">
            <summary>TGbreak 预设参数</summary>
            <div class="main-menu-advanced-body">
              <div class="main-menu-advanced-note">参考 TGbreak V1.0.7，把防抢话、文风和比赛互动拆成可开关的预设。</div>
              <label class="flex ai-c gap-8 pointer">
                <input type="checkbox" id="menuLlmPresetEnabled" ${presetView.enabled ? 'checked' : ''} onchange="persistMainMenuLLMDraft()">
                <span>启用预设参数</span>
              </label>
              <div class="main-menu-advanced-grid mt-12">
                <label class="flex ai-c gap-8 pointer">
                  <input type="checkbox" id="menuLlmPresetAntiTalk" ${presetView.antiTalk ? 'checked' : ''} onchange="persistMainMenuLLMDraft()">
                  <span>防抢话</span>
                </label>
                <label class="flex ai-c gap-8 pointer">
                  <input type="checkbox" id="menuLlmPresetStrictTurnTaking" ${presetView.strictTurnTaking ? 'checked' : ''} onchange="persistMainMenuLLMDraft()">
                  <span>超级防抢话</span>
                </label>
                <label class="flex ai-c gap-8 pointer">
                  <input type="checkbox" id="menuLlmPresetStyleEnabled" ${presetView.styleEnabled ? 'checked' : ''} onchange="persistMainMenuLLMDraft()">
                  <span>启用文风</span>
                </label>
                <label class="flex ai-c gap-8 pointer">
                  <input type="checkbox" id="menuLlmPresetGameInteraction" ${presetView.gameInteraction ? 'checked' : ''} onchange="persistMainMenuLLMDraft()">
                  <span>比赛互动</span>
                </label>
                <label class="flex ai-c gap-8 pointer">
                  <input type="checkbox" id="menuLlmPresetDataFirst" ${presetView.dataFirst ? 'checked' : ''} onchange="persistMainMenuLLMDraft()">
                  <span>双方数据优先</span>
                </label>
                <label class="flex ai-c gap-8 pointer">
                  <input type="checkbox" id="menuLlmPresetAntiOmniscience" ${presetView.antiOmniscience ? 'checked' : ''} onchange="persistMainMenuLLMDraft()">
                  <span>防全知</span>
                </label>
                <label class="flex ai-c gap-8 pointer">
                  <input type="checkbox" id="menuLlmPresetAntiVariable" ${presetView.antiVariable ? 'checked' : ''} onchange="persistMainMenuLLMDraft()">
                  <span>防变量出错</span>
                </label>
                <label class="flex ai-c gap-8 pointer">
                  <input type="checkbox" id="menuLlmPresetEmotionControl" ${presetView.emotionControl ? 'checked' : ''} onchange="persistMainMenuLLMDraft()">
                  <span>防极端情绪</span>
                </label>
                <label class="flex ai-c gap-8 pointer">
                  <input type="checkbox" id="menuLlmPresetRoleHope" ${presetView.roleHope ? 'checked' : ''} onchange="persistMainMenuLLMDraft()">
                  <span>角色防绝望</span>
                </label>
              </div>
              <label class="t-2 fs-sm mt-12">文风</label>
              <select id="menuLlmPresetStyle" class="form-control main-menu-select" onchange="persistMainMenuLLMDraft()">
                ${presetStyleOptions.map(style => `<option value="${style}" ${presetView.style === style ? 'selected' : ''}>${style}</option>`).join('')}
              </select>
              <div class="t-2 fs-sm mt-8">文风会作为系统提示注入；关闭“启用文风”后，只保留事实类预设。</div>
            </div>
          </details>
        </section>
      </div>
    </div>
  `;
  $('mainMenuPage').innerHTML = typeof stripUndefinedTokens === 'function' ? stripUndefinedTokens(menuHtml) : menuHtml;
}
function doMainMenuSaveLLMSettings() {
  if (typeof saveSocialLLMSettings !== 'function') return;
  const values = collectMainMenuLLMFormValues();
  writeMainMenuLLMDraft(values);
  saveSocialLLMSettings(values);
  G._mainMenuLLMResult = { ok: true, message: '主页模型设置已保存' };
  renderMainMenu();
}
async function doMainMenuTestLLMConnectivity() {
  if (typeof saveSocialLLMSettings !== 'function' || typeof testSocialLLMConnectivity !== 'function') return;
  const values = collectMainMenuLLMFormValues();
  writeMainMenuLLMDraft(values);
  saveSocialLLMSettings(values);
  const res = await testSocialLLMConnectivity();
  const suffix = res.ok ? (Array.isArray(res.models) && res.models.length ? `，已加载 ${res.models.length} 个模型` : '') : '';
  G._mainMenuLLMResult = { ok: !!res.ok, message: `${res.message || (res.ok ? '连接成功' : '连接失败')}${suffix}` };
  renderMainMenu();
}

async function exportSave() {
  // 初次使用引导绑定本地真实文件夹，实现丝滑直接保存
  if (!G._saveHandle && window.showDirectoryPicker) {
    if (confirm('为了实现【直接保存】且不再弹出烦人的下载框，强烈建议您先绑定一个游戏专属的存档目录（建议在游戏所在目录下新建一个叫做 Save 的文件夹并选中它）。\\n\\n点击确定进行绑定，之后的所有存档都将自动覆盖或创建在该目录下！')) {
      await bindSaveDirectory();
      if (!G._saveHandle) return; // 用户取消了绑定
    }
  }
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
  if (typeof loadTGBreakPromptSource === 'function') await loadTGBreakPromptSource();
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
    const eventSvg = renderEventTypeSvg(type, evt.icon || '🎲', { large: true });

    showModal(`
      <div class="tc" style="padding:10px 8px">
        <div class="tc" style="margin-bottom:8px">${eventSvg}</div>
        <div class="fs-xl fw-b mb-12" style="color:var(--gold)">${title}</div>
        <div class="t-2 fs-sm mb-16">${attrName} 检定（DC${dcVal}）</div>
        <div class="t-2 mb-16" style="min-height:38px">${evt.desc || '突发状况出现，你需要一次检定。'}</div>

        <div id="dice-container" class="dice-container" style="background:radial-gradient(circle at 50% 30%, rgba(253,185,39,.18), rgba(0,0,0,.45));border-radius:12px;padding:20px;margin:18px 0;border:2px solid var(--border);transition:all .3s">
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
// ============ RETIREMENT (LLM POWERED) ============
async function forceRetire() {
  $('gamePage').innerHTML = `<div class="card tc"><div class="card-title">光荣退役中...</div><div class="t-2 mt-12">正在由大模型生成生涯四极管评价，请稍候...</div></div>`;
  switchPage('home');

  ensureSocialState();
  const llm = G.social.llm || {};
  
  let llmSummary = null;
  if (llm.enabled && llm.apiKey) {
    const baseUrl = normalizeLLMBaseUrl(llm.baseUrl);
    const model = String(llm.model || 'gpt-4.1-mini');
    
    let honorsText = (G.awards || []).join('、');
    if (!honorsText) honorsText = "无";
    
    const sysPrompt = `你是一个体育媒体的 AI 故事引擎。玩家即将退役，请根据玩家的生涯数据、荣誉、拥有的奢侈品属性等，生成一份“退役总结报告”。
要求必须返回合法的 JSON 格式。包含四个视角的锐评以及总分：
{
  "media": "媒体视角的评价(客观带点夸张)...",
  "players": "球员视角的评价(敬佩或敌意)...",
  "fans": "粉丝视角的评价(狂热回忆)...",
  "critics": "毒舌球评人的评价(挑剔但承认伟大)...",
  "message": "最后的总评语...",
  "score": 98 // 生涯总分 0-100
}`;

    let luxury = "无";
    if (typeof getLuxuryItemsNames === 'function') luxury = getLuxuryItemsNames();

    const promptContext = `玩家姓名: ${G.player.name}
生涯赛季数: ${G.careerStats.length}
累计荣誉: ${honorsText}
奢侈品资产: ${luxury}

请给出这名 ${G.player.age} 岁球员的退役定论。`;

    let raw = "";
    try {
      if (isGoogleGeminiEndpoint(baseUrl)) {
        const modelName = normalizeModelNameForGemini(model);
        const endpoint = `${baseUrl}/models/${encodeURIComponent(modelName)}:generateContent`;
        const req = buildLLMRequestConfig(baseUrl, llm.apiKey, endpoint, { jsonBody: true });
        const payload = {
          systemInstruction: { parts: [{ text: sysPrompt }] },
          contents: [{ role: 'user', parts: [{ text: promptContext }] }],
          generationConfig: { temperature: 0.7, responseMimeType: 'application/json' }
        };
        const res = await fetch(req.url, { method: 'POST', headers: req.headers, body: JSON.stringify(payload) });
        const data = await readJSONResponseSafe(res, '退役生成');
        raw = (data?.candidates?.[0]?.content?.parts || []).map(p => p.text).join('') || '';
      } else {
        const payload = {
          model,
          temperature: 0.7,
          messages: [
            { role: 'system', content: sysPrompt },
            { role: 'user', content: promptContext }
          ]
        };
        const endpoint = `${baseUrl}/chat/completions`;
        const req = buildLLMRequestConfig(baseUrl, llm.apiKey, endpoint);
        const res = await fetch(req.url, { method: 'POST', headers: req.headers, body: JSON.stringify(payload) });
        const data = await readJSONResponseSafe(res, '退役生成');
        raw = data?.choices?.[0]?.message?.content || '';
      }
      
      const parsed = tryParseJSONText(raw.replace(/^\\s*\`\`\`json/i, '').replace(/^\\s*\`\`\`/i, '').replace(/\`\`\`\\s*$/, '').trim());
      if (parsed) llmSummary = parsed;
    } catch(e) { console.error('Retire LLM error:', e); }
  }

  // Fallback summary if LLM failed
  if (!llmSummary) {
    llmSummary = {
      media: "他是一个数据刷子，还是真正的赢家？历史会给出答案。",
      players: "和他对位很难受，但退役后我会想念他的。",
      fans: "永远的传奇！我会一直穿着他的球衣。",
      critics: "不够完美，但在他的时代，他留下了属于自己的印记。",
      message: "传奇落幕，江湖再见。",
      score: 85
    };
  }
  
  renderRetirement(llmSummary);
}

function renderRetirement(summary) {
  $('gamePage').innerHTML = `
  <div class="card tc">
    <div class="card-title fc fc-center" style="color:var(--gold);font-size:24px;">🐐 生涯落幕 - 退役仪式</div>
    <div class="fs-lg fw-b mt-12">${G.player.name} 正式宣布退役</div>
    
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:20px 0;text-align:left;">
      <div style="background:rgba(255,255,255,.05);padding:10px;border-radius:8px;border-left:3px solid #17a2b8;">
        <div class="fw-b" style="color:#17a2b8;margin-bottom:6px">📺 媒体评价</div>
        <div class="t-2 fs-sm">${summary.media}</div>
      </div>
      <div style="background:rgba(255,255,255,.05);padding:10px;border-radius:8px;border-left:3px solid #fd7e14;">
        <div class="fw-b" style="color:#fd7e14;margin-bottom:6px">🏀 球员评价</div>
        <div class="t-2 fs-sm">${summary.players}</div>
      </div>
      <div style="background:rgba(255,255,255,.05);padding:10px;border-radius:8px;border-left:3px solid #e83e8c;">
        <div class="fw-b" style="color:#e83e8c;margin-bottom:6px">📣 粉丝评价</div>
        <div class="t-2 fs-sm">${summary.fans}</div>
      </div>
      <div style="background:rgba(255,255,255,.05);padding:10px;border-radius:8px;border-left:3px solid #6f42c1;">
        <div class="fw-b" style="color:#6f42c1;margin-bottom:6px">🧐 球评人评价</div>
        <div class="t-2 fs-sm">${summary.critics}</div>
      </div>
    </div>
    
    <div style="margin-top:20px;padding:15px;background:rgba(253,185,39,.1);border:1px solid var(--gold);border-radius:8px;">
      <div class="fs-xl fw-b t-gold" style="font-size:32px;margin-bottom:8px">总分：${summary.score}</div>
      <div class="t-2">${summary.message}</div>
    </div>
    
    <button class="btn btn-primary mt-16" onclick="location.reload()" style="width:100%">重头再来 (重新开始)</button>
  </div>
  `;
}

window.showStoryModal = async function(title, text) {
  return new Promise(resolve => {
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.style.background = 'rgba(0,0,0,0.95)';
    modal.innerHTML = `
      <div class="modal-content" style="max-width:800px;background:#0f172a;border:1px solid var(--gold);padding:30px">
        <h2 class="t-gold tc mb-24">${title}</h2>
        <div id="storyText" class="t-2" style="font-size:18px;line-height:1.8;min-height:200px"></div>
        <button id="storyBtn" class="btn btn-gold mt-24" style="width:100%;display:none">继续</button>
      </div>`;
    document.body.appendChild(modal);

    const st = modal.querySelector('#storyText');
    const btn = modal.querySelector('#storyBtn');
    let i = 0;
    const speed = 30;
    function typeWriter() {
      if (i < text.length) {
        st.innerHTML += text.charAt(i) === '\\n' ? '<br>' : text.charAt(i);
        i++;
        setTimeout(typeWriter, speed);
      } else {
        btn.style.display = 'block';
      }
    }
    typeWriter();

    btn.onclick = () => {
      document.body.removeChild(modal);
      resolve();
    };
  });
};
