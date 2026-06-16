// ui.js
// ============ CREATE PAGE UI ============
let createStep = 0;
const TEST_ATTR_PANEL_STATE = {
  draft: false,
  upgrade: false,
  message: {
    draft: '',
    upgrade: ''
  }
};

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

function getTestAttrInputId(scope, attrKey) {
  return `testAttr_${scope}_${attrKey}`;
}

function getTestAttrPanelMeta(scope) {
  if (scope === 'draft') {
    return {
      title: '测试属性',
      note: '直接覆盖当前新秀评测面板的属性，用来测试抽取阶段和后续开档表现。'
    };
  }
  return {
    title: '测试属性',
    note: '直接覆盖当前球员属性，方便快速验证加点、比赛和表现逻辑。'
  };
}

function buildTestAttrPanel(scope) {
  const meta = getTestAttrPanelMeta(scope);
  const open = !!TEST_ATTR_PANEL_STATE[scope];
  const attrs = G.player?.attrs || {};
  const potential = clamp(parseNum(G.player?.potential, 75), 50, 99);
  const actionLabel = open ? '收起测试面板' : '展开测试面板';
  const messageText = TEST_ATTR_PANEL_STATE.message?.[scope] || '';
  const message = messageText
    ? `<div class="t-cyan fs-xs" style="margin-top:10px">${messageText}</div>`
    : '';
  return `
  <div class="card" style="margin-top:16px">
    <div class="flex fb" style="gap:12px;align-items:center;flex-wrap:wrap">
      <div>
        <div class="card-title" style="margin-bottom:6px">🧪 ${meta.title}</div>
        <div class="t-2 fs-xs">${meta.note}</div>
      </div>
      <button class="btn btn-sm btn-purple" onclick="toggleTestAttrPanel('${scope}')">${actionLabel}</button>
    </div>
    ${open ? `
    <div class="grid g2" style="margin-top:16px">
      <div class="form-group" style="margin-bottom:10px">
        <label>潜力</label>
        <input
          id="${getTestAttrInputId(scope, 'potential')}"
          class="form-control"
          type="number"
          min="50"
          max="99"
          step="1"
          value="${potential}">
      </div>
      ${ATTRS.map(at => `
      <div class="form-group" style="margin-bottom:10px">
        <label>${at.n}</label>
        <input
          id="${getTestAttrInputId(scope, at.k)}"
          class="form-control"
          type="number"
          min="25"
          max="99"
          step="1"
          value="${clamp(parseNum(attrs[at.k], 55), 25, 99)}">
      </div>`).join('')}
    </div>
    <div class="flex" style="gap:10px;flex-wrap:wrap;margin-top:8px">
      <button class="btn btn-gold" onclick="applyTestAttrs('${scope}')">应用测试属性</button>
      <button class="btn btn-sm" onclick="fillTestAttrs('${scope}', 99)">全 99</button>
      <button class="btn btn-sm" onclick="fillTestAttrs('${scope}', 60)">全 60</button>
      <button class="btn btn-sm" onclick="syncTestAttrsFromPlayer('${scope}')">读取当前属性</button>
    </div>
    ${message}
    ` : ''}
  </div>`;
}

function rerenderTestAttrScope(scope) {
  if (scope === 'draft') {
    if (createStep === 3) {
      renderAttrRoll();
      return;
    }
    if (createStep === 5) {
      renderDraftResult();
      return;
    }
    renderCreate();
    return;
  }
  renderUpgrade();
}

function toggleTestAttrPanel(scope) {
  TEST_ATTR_PANEL_STATE[scope] = !TEST_ATTR_PANEL_STATE[scope];
  TEST_ATTR_PANEL_STATE.message[scope] = '';
  rerenderTestAttrScope(scope);
}

function syncTestAttrsFromPlayer(scope) {
  const potentialInput = $(getTestAttrInputId(scope, 'potential'));
  if (potentialInput) {
    potentialInput.value = clamp(parseNum(G.player?.potential, 75), 50, 99);
  }
  ATTRS.forEach(at => {
    const input = $(getTestAttrInputId(scope, at.k));
    if (!input) return;
    input.value = clamp(parseNum(G.player?.attrs?.[at.k], 55), 25, 99);
  });
  TEST_ATTR_PANEL_STATE.message[scope] = '已同步为当前属性。';
  rerenderTestAttrScope(scope);
}

function fillTestAttrs(scope, value) {
  const potentialInput = $(getTestAttrInputId(scope, 'potential'));
  if (potentialInput) {
    potentialInput.value = clamp(parseNum(value, 75), 50, 99);
  }
  ATTRS.forEach(at => {
    const input = $(getTestAttrInputId(scope, at.k));
    if (!input) return;
    input.value = clamp(parseNum(value, 60), 25, 99);
  });
}

function applyTestAttrs(scope) {
  if (!G.player) return;
  const potentialInput = $(getTestAttrInputId(scope, 'potential'));
  const nextAttrs = {};
  ATTRS.forEach(at => {
    const input = $(getTestAttrInputId(scope, at.k));
    const fallback = parseNum(G.player?.attrs?.[at.k], 55);
    nextAttrs[at.k] = clamp(parseNum(input?.value, fallback), 25, 99);
  });
  G.player.attrs = nextAttrs;
  G.player.potential = clamp(parseNum(potentialInput?.value, G.player?.potential || 75), 50, 99);
  G.player.rating = ovr(nextAttrs);
  G.player.att = typeof calcPlayerAtt === 'function' ? calcPlayerAtt(nextAttrs) : G.player.rating;
  G.player.def = typeof calcPlayerDef === 'function' ? calcPlayerDef(nextAttrs) : G.player.rating;
  if (typeof recalcPlayerBadges === 'function') recalcPlayerBadges(G.player);
  if (typeof recalcPlayerTradeValue === 'function') recalcPlayerTradeValue();
  TEST_ATTR_PANEL_STATE.message[scope] = `已应用测试属性，当前 OVR ${G.player.rating} / POT ${G.player.potential}。`;
  updateHeader();
  rerenderTestAttrScope(scope);
}

function renderCreate() {
  const pg = $('createPage');

  // 添加创建页面样式
  if (!$('nbaCreateStyles')) {
    const style = document.createElement('style');
    style.id = 'nbaCreateStyles';
    style.textContent = `
      .nba-create-page {
        min-height: 100vh;
        background: linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #0f0f1a 100%);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 40px 20px;
        position: relative;
        overflow: hidden;
      }

      .nba-create-bg {
        position: absolute;
        inset: 0;
        pointer-events: none;
      }

      .nba-create-court {
        position: absolute;
        inset: 0;
        background:
          linear-gradient(90deg, transparent 49.5%, rgba(251,191,39,0.03) 49.5%, rgba(251,191,39,0.03) 50.5%, transparent 50.5%),
          linear-gradient(0deg, transparent 49.5%, rgba(251,191,39,0.03) 49.5%, rgba(251,191,39,0.03) 50.5%, transparent 50.5%);
      }

      .nba-create-glow {
        position: absolute;
        width: 600px;
        height: 600px;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: radial-gradient(circle, rgba(251,191,39,0.1) 0%, transparent 70%);
        animation: createGlow 4s ease-in-out infinite;
      }

      @keyframes createGlow {
        0%, 100% { opacity: 0.3; transform: translate(-50%, -50%) scale(1); }
        50% { opacity: 0.6; transform: translate(-50%, -50%) scale(1.1); }
      }

      .nba-create-header {
        text-align: center;
        margin-bottom: 40px;
        position: relative;
        z-index: 2;
      }

      .nba-create-logo {
        margin-bottom: 16px;
      }

      .nba-ball-icon {
        width: 60px;
        height: 60px;
        color: #fbbf27;
        animation: ballBounce 2s ease-in-out infinite;
      }

      @keyframes ballBounce {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-10px); }
      }

      .nba-create-title {
        font-size: 36px;
        font-weight: 900;
        letter-spacing: 4px;
        background: linear-gradient(135deg, #fff 0%, #fbbf27 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        text-transform: uppercase;
      }

      .nba-create-subtitle {
        font-size: 14px;
        color: #666;
        margin-top: 8px;
        letter-spacing: 2px;
      }

      .nba-create-content {
        width: 100%;
        max-width: 440px;
        position: relative;
        z-index: 2;
      }

      .nba-create-avatar-section {
        display: flex;
        flex-direction: column;
        align-items: center;
        margin-bottom: 32px;
      }

      .nba-avatar-container {
        position: relative;
        width: 120px;
        height: 120px;
        cursor: pointer;
      }

      .nba-avatar-ring {
        position: absolute;
        inset: 0;
        border: 3px solid #fbbf27;
        border-radius: 50%;
        animation: ringPulse 2s ease-in-out infinite;
      }

      @keyframes ringPulse {
        0%, 100% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.05); opacity: 0.7; }
      }

      .nba-avatar-img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        border-radius: 50%;
      }

      .nba-avatar-placeholder {
        width: 100%;
        height: 100%;
        border-radius: 50%;
        background: rgba(255,255,255,0.05);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 4px;
      }

      .nba-avatar-icon {
        font-size: 32px;
      }

      .nba-avatar-text {
        font-size: 11px;
        color: #666;
      }

      .nba-avatar-hint {
        font-size: 12px;
        color: #555;
        margin-top: 12px;
      }

      .nba-create-form {
        background: rgba(0,0,0,0.3);
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 16px;
        padding: 24px;
        margin-bottom: 24px;
      }

      .nba-form-group {
        margin-bottom: 20px;
      }

      .nba-form-label {
        display: block;
        font-size: 11px;
        font-weight: 600;
        color: #888;
        text-transform: uppercase;
        letter-spacing: 1px;
        margin-bottom: 8px;
      }

      .nba-form-input, .nba-form-select {
        width: 100%;
        padding: 14px 16px;
        background: rgba(30,30,40,0.9);
        border: 1px solid rgba(255,255,255,0.15);
        border-radius: 8px;
        color: #fff;
        font-size: 15px;
        transition: all 0.2s;
      }

      .nba-form-select {
        appearance: none;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23888' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
        background-repeat: no-repeat;
        background-position: right 12px center;
        padding-right: 36px;
      }

      .nba-form-select option {
        background: #1a1a2e;
        color: #fff;
        padding: 8px;
      }

      .nba-form-input:focus, .nba-form-select:focus {
        outline: none;
        border-color: rgba(251,191,39,0.5);
        background: rgba(40,40,50,0.95);
      }

      .nba-form-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
      }

      .nba-create-btn {
        width: 100%;
        padding: 18px 32px;
        background: linear-gradient(135deg, #fbbf27 0%, #f59e0b 100%);
        border: none;
        border-radius: 12px;
        color: #000;
        font-size: 16px;
        font-weight: 700;
        letter-spacing: 2px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 12px;
        transition: all 0.3s;
        box-shadow: 0 4px 30px rgba(251,191,39,0.3);
      }

      .nba-create-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 40px rgba(251,191,39,0.5);
      }

      .nba-btn-arrow {
        font-size: 20px;
        transition: transform 0.3s;
      }

      .nba-create-btn:hover .nba-btn-arrow {
        transform: translateX(8px);
      }

      /* 身体模板页面 */
      .nba-body-page {
        min-height: 100vh;
        background: linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #0f0f1a 100%);
        padding: 40px 20px;
      }

      .nba-body-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
        gap: 16px;
        max-width: 600px;
        margin: 0 auto;
      }

      .nba-body-card {
        background: rgba(255,255,255,0.03);
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 12px;
        padding: 20px;
        text-align: center;
        cursor: pointer;
        transition: all 0.3s;
      }

      .nba-body-card:hover {
        border-color: rgba(251,191,39,0.5);
        transform: translateY(-4px);
      }

      .nba-body-icon {
        font-size: 48px;
        margin-bottom: 12px;
      }

      .nba-body-name {
        font-weight: 600;
        font-size: 14px;
        margin-bottom: 4px;
      }

      .nba-body-desc {
        font-size: 11px;
        color: #666;
      }

      .nba-body-stats {
        display: flex;
        justify-content: space-between;
        margin-top: 12px;
        font-size: 11px;
        color: #888;
      }

      /* 模板选择 */
      .nba-template-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 16px;
        max-width: 700px;
        margin: 0 auto;
        padding: 0 20px;
      }

      .nba-template-card {
        background: rgba(255,255,255,0.03);
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 12px;
        padding: 20px;
        cursor: pointer;
        transition: all 0.3s;
      }

      .nba-template-card:hover {
        border-color: rgba(251,191,39,0.5);
        transform: translateY(-4px);
      }

      .nba-template-name {
        font-size: 16px;
        font-weight: 700;
        color: #fff;
      }

      .nba-template-zh {
        font-size: 12px;
        color: #fbbf27;
        margin-top: 4px;
      }

      .nba-template-desc {
        font-size: 12px;
        color: #666;
        margin-top: 8px;
      }

      .nba-template-boosts {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-top: 12px;
      }

      .nba-boost {
        padding: 4px 8px;
        font-size: 10px;
        border-radius: 4px;
      }

      .nba-boost.pos {
        background: rgba(34,197,94,0.2);
        color: #22c55e;
      }

      /* 属性面板 */
      .nba-attr-page {
        min-height: 100vh;
        background: linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #0f0f1a 100%);
        padding: 40px 20px;
      }

      .nba-attr-container {
        max-width: 500px;
        margin: 0 auto;
      }

      .nba-attr-scores {
        display: flex;
        justify-content: center;
        gap: 40px;
        margin-bottom: 32px;
      }

      .nba-score-box {
        text-align: center;
      }

      .nba-score-value {
        font-size: 48px;
        font-weight: 900;
        color: #fbbf27;
        line-height: 1;
      }

      .nba-score-label {
        font-size: 12px;
        color: #666;
        margin-top: 8px;
        letter-spacing: 2px;
      }

      .nba-attr-panel {
        background: rgba(0,0,0,0.3);
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 16px;
        padding: 24px;
        margin-bottom: 24px;
      }

      .nba-attr-row {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 10px 0;
        border-bottom: 1px solid rgba(255,255,255,0.05);
      }

      .nba-attr-name {
        flex: 0 0 60px;
        font-size: 13px;
        color: #888;
      }

      .nba-attr-bar {
        flex: 1;
        height: 6px;
        background: rgba(255,255,255,0.1);
        border-radius: 3px;
        overflow: hidden;
      }

      .nba-attr-fill {
        height: 100%;
        background: linear-gradient(90deg, #fbbf27, #f59e0b);
        border-radius: 3px;
        transition: width 0.3s;
      }

      .nba-attr-value {
        flex: 0 0 40px;
        text-align: right;
        font-size: 16px;
        font-weight: 700;
        color: #fbbf27;
      }

      .nba-attr-actions {
        display: flex;
        gap: 12px;
      }

      .nba-reroll-btn {
        flex: 1;
        padding: 14px 20px;
        background: rgba(255,255,255,0.1);
        border: 1px solid rgba(255,255,255,0.2);
        border-radius: 8px;
        color: #fff;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
      }

      .nba-reroll-btn:hover {
        background: rgba(255,255,255,0.15);
      }

      .nba-confirm-btn {
        flex: 1;
        padding: 14px 20px;
        background: linear-gradient(135deg, #fbbf27 0%, #f59e0b 100%);
        border: none;
        border-radius: 8px;
        color: #000;
        font-size: 14px;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.2s;
      }

      .nba-confirm-btn:hover {
        transform: translateY(-2px);
      }

      /* X-Factor */
      .nba-xfactor-container {
        max-width: 400px;
        margin: 0 auto;
        text-align: center;
      }

      .nba-xfactor-header {
        margin-bottom: 32px;
      }

      .nba-xfactor-label {
        font-size: 12px;
        color: #666;
        letter-spacing: 4px;
      }

      .nba-xfactor-title {
        font-size: 28px;
        font-weight: 900;
        background: linear-gradient(135deg, #a855f7 0%, #6366f1 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        margin-top: 8px;
      }

      .nba-xfactor-card {
        background: rgba(168,85,247,0.1);
        border: 1px solid rgba(168,85,247,0.3);
        border-radius: 16px;
        padding: 40px 24px;
        margin-bottom: 32px;
      }

      .nba-xfactor-icon {
        font-size: 64px;
        margin-bottom: 16px;
      }

      .nba-xfactor-name {
        font-size: 24px;
        font-weight: 700;
        color: #a855f7;
        margin-bottom: 12px;
      }

      .nba-xfactor-desc {
        font-size: 14px;
        color: #888;
        line-height: 1.6;
      }
        border-radius: 2px;
        transition: width 0.3s;
      }

      @media (max-width: 480px) {
        .nba-create-title {
          font-size: 28px;
        }
        .nba-form-row {
          grid-template-columns: 1fr;
        }
      }
    `;
    document.head.appendChild(style);
  }

  if (createStep === 0) {
    pg.innerHTML = `
    <div class="nba-create-page">
      <div class="nba-create-bg">
        <div class="nba-create-court"></div>
        <div class="nba-create-glow"></div>
      </div>

      <div class="nba-create-header">
        <div class="nba-create-logo">
          <svg viewBox="0 0 100 100" class="nba-ball-icon">
            <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" stroke-width="2"/>
            <path d="M50 5 Q50 50 50 95" fill="none" stroke="currentColor" stroke-width="1.5"/>
            <path d="M5 50 Q50 50 95 50" fill="none" stroke="currentColor" stroke-width="1.5"/>
          </svg>
        </div>
        <div class="nba-create-title">CREATE YOUR PLAYER</div>
        <div class="nba-create-subtitle">打造你的NBA传奇</div>
      </div>

      <div class="nba-create-content">
        <div class="nba-create-avatar-section">
          <div class="nba-avatar-container" onclick="document.getElementById('avatarInput').click()">
            <div class="nba-avatar-ring"></div>
            <img id="avatarPreview" src="${G.player.avatar || G.player.photo || ''}" class="nba-avatar-img" style="display:${(G.player.avatar || G.player.photo) ? 'block' : 'none'}">
            <div id="avatarPlaceholder" class="nba-avatar-placeholder" style="display:${(G.player.avatar || G.player.photo) ? 'none' : 'flex'}">
              <span class="nba-avatar-icon">👤</span>
              <span class="nba-avatar-text">上传头像</span>
            </div>
          </div>
          <input type="file" id="avatarInput" accept="image/*" style="display:none" onchange="handleAvatarUpload(this)">
          <div class="nba-avatar-hint">点击上传球员照片</div>
        </div>

        <div class="nba-create-form">
          <div class="nba-form-group">
            <label class="nba-form-label">球员姓名</label>
            <input class="nba-form-input" id="cName" placeholder="输入你的名字" value="${G.player.name}">
          </div>

          <div class="nba-form-row">
            <div class="nba-form-group">
              <label class="nba-form-label">选秀年份</label>
              <select class="nba-form-select" id="cStartYear">
                ${getAvailableScriptYears().map(y => `<option value="${y}" ${y === parseNum(G.startYear, G.year) ? 'selected' : ''}>${y}届</option>`).join('')}
              </select>
            </div>
            <div class="nba-form-group">
              <label class="nba-form-label">场上位置</label>
              <select class="nba-form-select" id="cPos">
                ${POS.map(p => `<option value="${p.id}">${p.n}</option>`).join('')}
              </select>
            </div>
          </div>

          ${renderLocalFileHint()}
        </div>

        <button class="nba-create-btn" onclick="createStep1()">
          <span class="nba-btn-text">进入选秀</span>
          <span class="nba-btn-arrow">→</span>
        </button>
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
    alert(`未能读取 ${G.startYear} 年对应名单。请确认已选择项目根目录（包含 assets/data）或直接授权 assets/data 目录。`);
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
  <div class="nba-create-page">
    <div class="nba-create-bg">
      <div class="nba-create-court"></div>
      <div class="nba-create-glow"></div>
    </div>

    <div class="nba-create-header">
      <div class="nba-create-title">BODY TYPE</div>
      <div class="nba-create-subtitle">选择你的体型模板</div>
    </div>

    <div class="nba-body-grid">
      ${BODY_TYPES.map(b => `
        <div class="nba-body-card" onclick="selectBody('${b.id}')">
          <div class="nba-body-icon">${b.id === 'guard' ? '🏃' : b.id === 'wing' ? '🦅' : '💪'}</div>
          <div class="nba-body-name">${b.n}</div>
          <div class="nba-body-desc">${b.d}</div>
          <div class="nba-body-stats">
            <span>${b.hRange[0]}-${b.hRange[1]}cm</span>
            <span>${b.wRange[0]}-${b.wRange[1]}kg</span>
          </div>
        </div>
      `).join('')}
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
  <div class="nba-create-page">
    <div class="nba-create-bg">
      <div class="nba-create-court"></div>
      <div class="nba-create-glow"></div>
    </div>

    <div class="nba-create-header">
      <div class="nba-create-title">PLAY STYLE</div>
      <div class="nba-create-subtitle">${pos ? pos.n : ''} · 选择你的比赛风格</div>
    </div>

    <div class="nba-template-grid">
      ${templates.map(t => `
        <div class="nba-template-card" onclick="selectTemplate('${t.id}')">
          <div class="nba-template-name">${t.n}</div>
          <div class="nba-template-zh">${t.z}</div>
          <div class="nba-template-desc">${t.d}</div>
          <div class="nba-template-boosts">
            ${Object.entries(t.boost).map(([k, v]) => `<span class="nba-boost pos">+${v} ${ATTRS.find(a => a.k === k)?.n || k}</span>`).join('')}
          </div>
        </div>
      `).join('')}
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
  const ovrVal = ovr(a);
  $('createPage').innerHTML = `
  <div class="nba-create-page">
    <div class="nba-create-bg">
      <div class="nba-create-court"></div>
      <div class="nba-create-glow"></div>
      ${typeof svgCourtBg === 'function' ? svgCourtBg() : ''}
    </div>

    <div class="nba-create-header">
      <div class="nba-create-title">ATTRIBUTES</div>
      <div class="nba-create-subtitle">抽取你的初始属性</div>
    </div>

    <div class="nba-attr-container">
      <div class="nba-attr-scores">
        <div class="nba-score-box">
          <div class="nba-score-value" id="ovrCounter" data-target="${ovrVal}">0</div>
          <div class="nba-score-label">OVR</div>
        </div>
        <div class="nba-score-box">
          <div class="nba-score-value" id="potCounter" data-target="${G.player.potential}">0</div>
          <div class="nba-score-label">POT</div>
        </div>
      </div>

      <div class="nba-attr-panel">
        ${ATTRS.map((at, i) => `
          <div class="nba-attr-row" style="animation-delay:${i * 0.06}s">
            <span class="nba-attr-name">${at.n}</span>
            <div class="nba-attr-bar">
              <div class="nba-attr-fill" data-target="${a[at.k]}" style="width:0%"></div>
            </div>
            <span class="nba-attr-value">${a[at.k]}</span>
          </div>
        `).join('')}
      </div>

      <div class="nba-attr-actions">
        <button class="nba-reroll-btn btn-glow" onclick="doReroll()">🎲 重新抽取</button>
        <button class="nba-confirm-btn btn-glow" onclick="confirmAttrs()">确认属性 →</button>
      </div>
    </div>
  </div>`;
  // VFX: animate counters and bars
  setTimeout(() => {
    const ovrEl = document.getElementById('ovrCounter');
    const potEl = document.getElementById('potCounter');
    if (ovrEl && typeof animateCountUp === 'function') animateCountUp(ovrEl, 0, ovrVal, 800);
    if (potEl && typeof animateCountUp === 'function') animateCountUp(potEl, 0, G.player.potential, 800);
    document.querySelectorAll('.nba-attr-fill[data-target]').forEach((bar, i) => {
      setTimeout(() => { bar.style.width = bar.dataset.target + '%'; }, 100 + i * 80);
    });
    // Spark particles on OVR reveal
    if (typeof spawnSparks === 'function' && ovrEl) {
      const r = ovrEl.getBoundingClientRect();
      setTimeout(() => spawnSparks(r.left + r.width/2, r.top + r.height/2, '#ffd54f'), 700);
    }
  }, 50);
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
  <div class="nba-create-page">
    <div class="nba-create-bg">
      <div class="nba-create-court"></div>
      <div class="nba-create-glow"></div>
      ${typeof svgCourtBg === 'function' ? svgCourtBg() : ''}
    </div>

    <div class="nba-xfactor-container">
      <div class="nba-xfactor-header">
        <div class="nba-xfactor-label">X-FACTOR</div>
        <div class="nba-xfactor-title">特殊天赋</div>
      </div>

      <div class="xfactor-flip-container" style="margin:0 auto;max-width:420px">
        <div class="xfactor-flip-card nba-xfactor-card" id="xfactorCard" style="width:100%;min-height:200px">
          <div class="xfactor-flip-front" style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:linear-gradient(135deg,rgba(155,89,182,.18),rgba(0,212,255,.10));border:2px solid var(--purple);border-radius:16px;padding:24px;text-align:center">
            <div style="font-size:48px;margin-bottom:12px">❓</div>
            <div style="font-size:16px;font-weight:800;color:var(--purple)">点击揭示天赋</div>
          </div>
          <div class="xfactor-flip-back" style="display:flex;flex-direction:column;align-items:center;justify-content:center;background:linear-gradient(135deg,rgba(155,89,182,.18),rgba(0,212,255,.10));border:2px solid var(--purple);border-radius:16px;padding:24px;text-align:center">
            <div class="nba-xfactor-icon" style="font-size:72px;line-height:1">${xf.icon}</div>
            <div class="nba-xfactor-name" style="margin-top:12px;font-size:24px;font-weight:900">${xf.n}</div>
            <div class="nba-xfactor-desc" style="margin-top:8px;color:var(--text2);line-height:1.6">${xf.d}</div>
          </div>
        </div>
      </div>

      <button class="nba-create-btn btn-glow" onclick="gotoDraft()" style="margin-top:24px">
        <span class="nba-btn-text">进入选秀夜</span>
        <span class="nba-btn-arrow">→</span>
      </button>
    </div>
  </div>`;
  // Auto-flip after short delay
  setTimeout(() => {
    const card = document.getElementById('xfactorCard');
    if (card) {
      card.classList.add('flipped');
      // Purple particles on reveal
      if (typeof spawnEnergyParticles === 'function') {
        const r = card.getBoundingClientRect();
        setTimeout(() => spawnEnergyParticles(r.left + r.width/2, r.top + r.height/2, '#b388ff'), 350);
      }
    }
  }, 600);
}

async function gotoDraft() {
  $('createPage').innerHTML = `
  <div class="card tc">
    <div class="card-title fc" style="justify-content:center">生成选秀前夜媒体预测</div>
    <div class="t-2">正在提交事实包给真实 LLM，请稍候...</div>
  </div>`;
  if (!G.draftBoard || !Array.isArray(G.draftBoard.results)) assignToDraft();
  try {
    if (typeof generateDraftScoutingReport !== 'function') throw new Error('选秀前夜 LLM 生成函数未加载');
    const scout = await generateDraftScoutingReport({ force: true });
    if (scout && scout.story && typeof showStoryModal === 'function') {
      await showStoryModal('选秀前夜 · 媒体预测', scout.story);
    }
  } catch (e) {
    $('createPage').innerHTML = `
      <div class="card tc">
        <div class="card-title fc" style="justify-content:center">选秀前夜未生成</div>
        <div class="t-2 mt-12">${e?.message || e}</div>
        <div class="t-2 mt-12">媒体预测必须由真实 LLM JSON 生成。请先配置 LLM，或修正接口返回后重试。</div>
        <div class="grid g2 mt-16">
          <button class="btn btn-gold" onclick="openAutoCareerLLMSettingsModal()">打开 LLM 设置</button>
          <button class="btn btn-pri" onclick="gotoDraft()">重试选秀前夜</button>
        </div>
      </div>`;
    return;
  }
  createStep = 5; renderCreate();
}

function renderDraftResult() {
  const t = G.team;
  const board = G.draftBoard;
  const allResults = Array.isArray(board?.results) ? board.results : [];
  const tierText = board ? (board.tier === 'big' ? '大年' : board.tier === 'weak' ? '小年' : '正常年') : '';
  const pickResults = board?._pickResults || [];

  // 初始化选秀状态
  if (!G._draftState) {
    G._draftState = {
      currentPick: 0,
      isAnimating: false,
      showAll: false
    };
  }

  const currentPick = G._draftState.currentPick;
  const showAll = G._draftState.showAll;

  // 当前揭晓的球员
  const currentPlayer = currentPick > 0 && currentPick <= pickResults.length ? pickResults[currentPick - 1]?.player : null;
  const currentResult = currentPick > 0 && currentPick <= allResults.length ? allResults[currentPick - 1] : null;
  const currentTeam = currentResult ? getTeam(currentResult.teamId) : null;

  // 生成选秀榜单HTML
  const draftBoardHtml = allResults.map((r, idx) => {
    const pickNum = idx + 1;
    const isRevealed = showAll || pickNum <= currentPick;
    const isCurrent = pickNum === currentPick;
    const isUser = r.user;
    const team = getTeam(r.teamId) || {};

    return `
      <div class="draft-pick-row ${isUser ? 'user-pick' : ''} ${isCurrent ? 'current' : ''} ${isRevealed ? 'revealed' : ''}">
        <div class="draft-pick-num">${r.pick}</div>
        <div class="draft-pick-team-logo" style="background:${team.cl || '#333'}">
          ${teamLogoMarkup(team, 20)}
        </div>
        <div class="draft-pick-info">
          <div class="draft-pick-name">${isRevealed ? (isUser ? `⭐ ${r.name}` : r.name) : '---'}</div>
          <div class="draft-pick-meta">${isRevealed ? `${r.pos} | ${r.rating} OVR` : ''}</div>
        </div>
      </div>
    `;
  }).join('');

  // 生成当前球员球探报告
  let scoutReportHtml = '';
  if (currentPlayer && currentResult) {
    const pos = getPos(currentPlayer.pos) || { n: '-' };
    const attrs = currentPlayer.attrs || {};
    const isUser = currentResult.user;
    const avatarSrc = isUser ? (G.player.avatar || G.player.photo || currentPlayer.photo || '') : (currentPlayer.photo || '');
    const avatarHtml = avatarSrc
      ? `<img src="${avatarSrc}" style="width:64px;height:64px;border-radius:50%;object-fit:cover">`
      : `<div style="font-size:32px">🏀</div>`;

    // 球探分析：统一使用新格式报告
    const analysisHtml = generatePlayerScoutReport(currentPlayer, currentResult);

    scoutReportHtml = `
      <div class="draft-player-report">
        <div class="draft-report-header">
          <div class="draft-report-pick">PICK #${currentPick}</div>
          <div class="draft-report-team">${currentTeam?.z || ''} ${currentTeam?.n || ''}</div>
        </div>

        <div class="draft-report-player">
          <div class="draft-report-avatar">${avatarHtml}</div>
          <div class="draft-report-info">
            <div class="draft-report-name">${isUser ? `⭐ ${currentResult.name}` : currentResult.name}</div>
            <div class="draft-report-pos">${pos.n} | ${currentResult.rating} OVR | ${currentResult.potential} POT</div>
          </div>
        </div>

        <div class="draft-report-attrs">
          <div class="draft-attr-item"><span>传球</span><span>${attrs.pass || 50}</span></div>
          <div class="draft-attr-item"><span>内线</span><span>${attrs.shotInt || 50}</span></div>
          <div class="draft-attr-item"><span>外线</span><span>${attrs.shotExt || 50}</span></div>
          <div class="draft-attr-item"><span>篮板</span><span>${attrs.reb || 50}</span></div>
          <div class="draft-attr-item"><span>盖帽</span><span>${attrs.blk || 50}</span></div>
          <div class="draft-attr-item"><span>抢断</span><span>${attrs.stl || 50}</span></div>
        </div>

        <div class="draft-report-analysis">
          <div class="draft-analysis-title">球探分析</div>
          <div class="draft-analysis-content">
            ${analysisHtml}
          </div>
        </div>
      </div>
    `;
  }

  // 生成媒体预测（营造悬念）
  let mediaHtml = '';
  if (currentPick === 0) {
    const report = G.draftScoutingReport || {};
    const tierLabel = tierText || '正常年';
    const textCard = (text, cls = '') => `<div class="draft-media-card ${cls}"><div class="media-quote">${escapeAutoCareerAttr(text)}</div></div>`;
    const experts = Array.isArray(report.expertMocks) ? report.expertMocks : [];
    const latestBuzz = Array.isArray(report.latestBuzz) ? report.latestBuzz : [];
    const fanTalk = Array.isArray(report.fanTalk) ? report.fanTalk : [];

    mediaHtml = `
      <div class="draft-start-screen draft-media-phase">
        <div class="draft-start-title">选秀前夜 · 媒体预测</div>
        <div class="draft-start-subtitle">${board?.year || G.year} 届选秀 · ${tierLabel} · ${allResults.length} 名新秀</div>
        <div class="draft-media-summary">
          <div class="draft-summary-text">${escapeAutoCareerAttr(report.headline || report.title || '媒体预测已生成')}</div>
          <div class="draft-summary-sub">${escapeAutoCareerAttr(report.summary || '')}</div>
        </div>

        <div class="draft-media-feed">
          <div class="draft-media-section-label">专家模拟选秀</div>
          ${experts.length ? experts.slice(0, 4).map(text => textCard(text)).join('') : textCard('LLM 未返回专家模拟选秀。')}

          <div class="draft-media-section-label">最新动态</div>
          ${latestBuzz.length ? latestBuzz.slice(0, 4).map(text => textCard(text, 'draft-media-hot')).join('') : textCard('LLM 未返回最新动态。', 'draft-media-hot')}

          <div class="draft-media-section-label">球迷热议</div>
          ${fanTalk.length ? fanTalk.slice(0, 4).map(text => textCard(text, 'draft-media-fan')).join('') : textCard('LLM 未返回球迷热议。', 'draft-media-fan')}
        </div>

        <div class="draft-media-summary">
          <div class="draft-summary-text">综合预测：${escapeAutoCareerAttr(report.consensus || '各家意见仍有分歧')}</div>
          <div class="draft-summary-sub">最终顺位以选秀大会结果为准</div>
        </div>

        <button class="draft-start-btn" onclick="startDraftReveal()">选秀大会正式开始</button>
      </div>
    `;
  }

  $('createPage').innerHTML = `
  <div class="draft-night-page">
    <div class="draft-night-bg">
      <div class="draft-spotlight"></div>
    </div>

    <div class="draft-night-header">
      <div class="draft-night-title">🏀 ${board?.year || G.year} NBA DRAFT</div>
      <div class="draft-night-subtitle">${currentPick > 0 ? `${tierText} · 第 ${currentPick} / ${allResults.length} 顺位` : `${tierText} · 选秀前夜`}</div>
    </div>

    <div class="draft-night-content">
      <!-- 左侧：当前球员展示 -->
      <div class="draft-reveal-panel">
        ${currentPick === 0 ? mediaHtml : scoutReportHtml}

        ${currentPick > 0 && currentPick <= allResults.length ? `
          <div class="draft-reveal-actions">
            ${!showAll && currentPick < allResults.length ? `
              <button class="draft-next-btn" onclick="revealNextPick()">下一位 →</button>
            ` : ''}
            <button class="draft-skip-btn" onclick="revealAllPicks()">跳过剩余</button>
            <button class="draft-start-btn" onclick="startCareer()">开始生涯 🏀</button>
          </div>
        ` : ''}
      </div>

      <!-- 右侧：选秀榜单 -->
      <div class="draft-board-panel">
        <div class="draft-board-header">
          <span>📋 选秀榜单</span>
        </div>
        <div class="draft-board-list">
          ${draftBoardHtml}
        </div>
      </div>
    </div>
  </div>

  <!-- 球员详情弹窗 -->
  <div id="draftPlayerModal" class="draft-modal" style="display:none">
    <div class="draft-modal-content">
      <div class="draft-modal-header">
        <span class="draft-modal-title">球员详情</span>
        <button class="draft-modal-close" onclick="closeDraftPlayerModal()">×</button>
      </div>
      <div id="draftPlayerModalBody" class="draft-modal-body"></div>
    </div>
  </div>
  `;

  // 添加样式
  if (!$('draftNightStyles')) {
    const style = document.createElement('style');
    style.id = 'draftNightStyles';
    style.textContent = `
      .draft-night-page {
        min-height: 100vh;
        background: linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #0f0f1a 100%);
        padding: 20px;
        position: relative;
        overflow: hidden;
      }

      .draft-night-bg {
        position: absolute;
        inset: 0;
        pointer-events: none;
      }

      .draft-spotlight {
        position: absolute;
        top: -30%;
        left: 50%;
        transform: translateX(-50%);
        width: 600px;
        height: 600px;
        background: radial-gradient(ellipse, rgba(251,191,39,0.12) 0%, transparent 70%);
      }

      .draft-night-header {
        text-align: center;
        padding: 20px 0 24px;
        position: relative;
        z-index: 2;
      }

      .draft-night-title {
        font-size: 28px;
        font-weight: 900;
        letter-spacing: 3px;
        background: linear-gradient(135deg, #fff 0%, #fbbf27 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }

      .draft-night-subtitle {
        font-size: 14px;
        color: #666;
        margin-top: 8px;
      }

      .draft-night-content {
        display: flex;
        gap: 20px;
        max-width: 1100px;
        margin: 0 auto;
        position: relative;
        z-index: 2;
      }

      .draft-reveal-panel {
        flex: 1;
        min-width: 0;
      }

      .draft-start-screen {
        background: rgba(0,0,0,0.4);
        border: 1px solid rgba(251,191,39,0.2);
        border-radius: 16px;
        padding: 60px 40px;
        text-align: center;
      }

      .draft-start-title {
        font-size: 24px;
        font-weight: 700;
        color: #fbbf27;
        margin-bottom: 12px;
      }

      .draft-start-subtitle {
        font-size: 14px;
        color: #888;
        margin-bottom: 32px;
      }

      .draft-start-btn {
        padding: 14px 40px;
        background: linear-gradient(135deg, #fbbf27 0%, #f59e0b 100%);
        border: none;
        border-radius: 8px;
        color: #000;
        font-size: 16px;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.2s;
      }

      .draft-start-btn:hover {
        transform: translateY(-2px);
      }

      .draft-media-phase {
        max-height: 70vh;
        overflow-y: auto;
        padding: 30px 24px;
      }

      .draft-media-feed {
        margin: 16px 0;
        text-align: left;
      }

      .draft-media-section-label {
        font-size: 12px;
        font-weight: 600;
        color: #fbbf27;
        padding: 6px 12px;
        margin: 12px 0 6px;
        background: rgba(251,191,39,0.1);
        border-radius: 4px;
        letter-spacing: 1px;
      }

      .draft-media-card {
        background: rgba(255,255,255,0.04);
        border: 1px solid rgba(255,255,255,0.06);
        border-radius: 10px;
        padding: 12px 16px;
        margin-bottom: 8px;
        transition: all 0.2s;
      }

      .draft-media-card:hover {
        background: rgba(255,255,255,0.07);
        border-color: rgba(251,191,39,0.2);
      }

      .draft-media-hot {
        border-left: 3px solid #ef4444;
      }

      .draft-media-fan {
        border-left: 3px solid #3b82f6;
        font-style: italic;
      }

      .draft-media-card .media-source {
        font-size: 11px;
        color: #888;
        margin-bottom: 4px;
        font-weight: 600;
      }

      .draft-media-card .media-prediction {
        font-size: 14px;
        color: #fbbf27;
        font-weight: 600;
        margin-bottom: 4px;
      }

      .draft-media-card .media-quote {
        font-size: 13px;
        color: #bbb;
        line-height: 1.5;
      }

      .draft-media-summary {
        text-align: center;
        margin: 16px 0;
        padding: 12px;
        background: rgba(251,191,39,0.08);
        border-radius: 8px;
      }

      .draft-summary-text {
        font-size: 14px;
        color: #fbbf27;
        font-weight: 600;
      }

      .draft-summary-sub {
        font-size: 11px;
        color: #666;
        margin-top: 4px;
      }

      .draft-player-report {
        background: rgba(0,0,0,0.4);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 16px;
        padding: 24px;
        animation: slideIn 0.4s ease;
      }

      @keyframes slideIn {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }

      .draft-report-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
        padding-bottom: 16px;
        border-bottom: 1px solid rgba(255,255,255,0.1);
      }

      .draft-report-pick {
        font-size: 20px;
        font-weight: 900;
        color: #fbbf27;
      }

      .draft-report-team {
        font-size: 14px;
        color: #888;
      }

      .draft-report-player {
        display: flex;
        align-items: center;
        gap: 16px;
        margin-bottom: 24px;
      }

      .draft-report-avatar {
        width: 64px;
        height: 64px;
        border-radius: 50%;
        background: linear-gradient(135deg, #333 0%, #222 100%);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 32px;
        border: 2px solid #fbbf27;
      }

      .draft-report-name {
        font-size: 22px;
        font-weight: 700;
        color: #fff;
      }

      .draft-report-pos {
        font-size: 13px;
        color: #888;
        margin-top: 4px;
      }

      .draft-report-attrs {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 8px;
        margin-bottom: 20px;
      }

      .draft-attr-item {
        display: flex;
        justify-content: space-between;
        padding: 8px 12px;
        background: rgba(255,255,255,0.03);
        border-radius: 6px;
        font-size: 12px;
      }

      .draft-attr-item span:first-child { color: #888; }
      .draft-attr-item span:last-child { color: #fbbf27; font-weight: 600; }

      .draft-report-analysis {
        background: rgba(255,255,255,0.03);
        border-radius: 12px;
        padding: 16px;
      }

      .draft-analysis-title {
        font-size: 13px;
        font-weight: 600;
        color: #fbbf27;
        margin-bottom: 12px;
      }

      .draft-analysis-content {
        font-size: 13px;
        color: #aaa;
        line-height: 1.7;
      }

      .draft-analysis-content p {
        margin: 0 0 8px;
      }

      .draft-analysis-content .pros { color: #22c55e; margin-bottom: 4px; }
      .draft-analysis-content .cons { color: #ef4444; margin-bottom: 4px; }
      .draft-scout-compare { color: #818cf8; margin: 8px 0 4px; font-size: 13px; }
      .draft-scout-projection { color: #60a5fa; font-size: 13px; line-height: 1.6; }

      /* New Scout Report Full Format Styles */
      .scout-report-full {
        padding: 4px 0;
      }
      .scout-report-name {
        font-size: 18px;
        font-weight: 800;
        color: #fbbf27;
        text-align: center;
        margin-bottom: 12px;
        letter-spacing: 1px;
      }
      .scout-report-meta {
        display: flex;
        gap: 4px;
        margin-bottom: 8px;
        flex-wrap: wrap;
        justify-content: center;
      }
      .scout-meta-row {
        display: flex;
        gap: 6px;
        padding: 4px 10px;
        background: rgba(255,255,255,0.05);
        border-radius: 6px;
        font-size: 12px;
      }
      .scout-meta-label {
        color: #666;
        white-space: nowrap;
      }
      .scout-meta-value {
        color: #ddd;
        font-weight: 600;
        white-space: nowrap;
      }
      .scout-section-title {
        font-size: 13px;
        font-weight: 700;
        color: #fbbf27;
        margin: 14px 0 8px;
        padding-bottom: 4px;
        border-bottom: 1px solid rgba(251,191,39,0.2);
      }
      .scout-title-green {
        color: #22c55e;
        border-bottom-color: rgba(34,197,94,0.2);
      }
      .scout-title-red {
        color: #ef4444;
        border-bottom-color: rgba(239,68,68,0.2);
      }
      .scout-play-style {
        font-size: 13px;
        color: #ccc;
        line-height: 1.8;
        text-align: center;
        padding: 6px 0;
      }
      .scout-list {
        display: flex;
        flex-wrap: wrap;
        gap: 4px 6px;
        margin-bottom: 4px;
      }
      .scout-list-item {
        font-size: 12px;
        padding: 3px 8px;
        border-radius: 4px;
        line-height: 1.4;
      }
      .scout-list-pros .scout-list-item {
        background: rgba(34,197,94,0.1);
        color: #22c55e;
        border: 1px solid rgba(34,197,94,0.15);
      }
      .scout-list-cons .scout-list-item {
        background: rgba(239,68,68,0.08);
        color: #ef4444;
        border: 1px solid rgba(239,68,68,0.12);
      }
      .scout-evaluation {
        font-size: 13px;
        color: #bbb;
        line-height: 1.8;
        text-indent: 2em;
        margin-top: 4px;
      }

      .draft-reveal-actions {
        display: flex;
        gap: 12px;
        margin-top: 20px;
      }

      .draft-next-btn {
        flex: 1;
        padding: 14px 20px;
        background: linear-gradient(135deg, #fbbf27 0%, #f59e0b 100%);
        border: none;
        border-radius: 8px;
        color: #000;
        font-size: 14px;
        font-weight: 700;
        cursor: pointer;
      }

      .draft-skip-btn {
        padding: 14px 20px;
        background: rgba(255,255,255,0.1);
        border: 1px solid rgba(255,255,255,0.2);
        border-radius: 8px;
        color: #888;
        font-size: 14px;
        cursor: pointer;
      }

      .draft-board-panel {
        width: 320px;
        background: rgba(0,0,0,0.3);
        border-radius: 12px;
        overflow: hidden;
      }

      .draft-board-header {
        padding: 14px 16px;
        font-weight: 600;
        font-size: 13px;
        border-bottom: 1px solid rgba(255,255,255,0.1);
      }

      .draft-board-list {
        max-height: 450px;
        overflow-y: auto;
        padding: 8px;
      }

      .draft-pick-row {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px 12px;
        border-radius: 8px;
        margin-bottom: 4px;
        background: rgba(255,255,255,0.02);
        transition: all 0.3s;
      }

      .draft-pick-row.current {
        background: rgba(251,191,39,0.15);
        border: 1px solid rgba(251,191,39,0.3);
      }

      .draft-pick-row.user-pick {
        background: rgba(34,197,94,0.1);
      }

      .draft-pick-row.revealed {
        opacity: 1;
      }

      .draft-pick-row:not(.revealed) {
        opacity: 0.4;
      }

      .draft-pick-num {
        width: 28px;
        font-weight: 700;
        font-size: 13px;
        color: #fbbf27;
      }

      .draft-pick-team-logo {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .draft-pick-name {
        font-size: 13px;
        font-weight: 500;
      }

      .draft-pick-meta {
        font-size: 11px;
        color: #666;
        margin-top: 2px;
      }

      /* 弹窗 */
      .draft-modal {
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.85);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
      }

      .draft-modal-content {
        background: #1a1a2e;
        border-radius: 16px;
        width: 90%;
        max-width: 500px;
        max-height: 80vh;
        overflow: hidden;
      }

      .draft-modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 20px;
        border-bottom: 1px solid rgba(255,255,255,0.1);
      }

      .draft-modal-close {
        width: 28px;
        height: 28px;
        border: none;
        background: rgba(255,255,255,0.1);
        border-radius: 50%;
        color: #fff;
        font-size: 18px;
        cursor: pointer;
      }

      .draft-modal-body {
        padding: 20px;
        max-height: 60vh;
        overflow-y: auto;
      }

      @media (max-width: 800px) {
        .draft-night-content {
          flex-direction: column;
        }
        .draft-media-phase {
          max-height: none;
          overflow: visible;
        }
        .draft-board-panel {
          width: 100%;
        }
      }
    `;
    document.head.appendChild(style);
  }
}

function startDraftReveal() {
  G._draftState = { currentPick: 1, isAnimating: false, showAll: false };
  renderCreate();
}

function revealNextPick() {
  if (!G._draftState) G._draftState = { currentPick: 0 };
  const total = (G.draftBoard?.results || []).length;
  if (G._draftState.currentPick < total) {
    G._draftState.currentPick++;
    renderCreate();
  }
}

function revealAllPicks() {
  if (!G._draftState) G._draftState = { currentPick: 0 };
  const total = (G.draftBoard?.results || []).length;
  G._draftState.currentPick = total;
  G._draftState.showAll = true;
  renderCreate();
}

function generatePlayerScoutReport(player, result) {
  if (!player) return '<p>暂无球探报告</p>';

  // Use new full report system if available
  if (typeof generateFullScoutReport === 'function') {
    const report = generateFullScoutReport(player, result);
    if (report) return renderScoutReportHtml(report);
  }

  // Fallback (should rarely be reached)
  return '<p>暂无球探报告</p>';
}

/**
 * Render a full scout report object to HTML (Kobe-style format)
 */
function renderScoutReportHtml(report) {
  const h = report.header;
  const c = report.comparison;

  return `
    <div class="scout-report-full">
      <div class="scout-report-name">${h.name}${h.nameEn}</div>
      <div class="scout-report-meta">
        <div class="scout-meta-row"><span class="scout-meta-label">位置</span><span class="scout-meta-value">${h.posDisplay}</span></div>
        <div class="scout-meta-row"><span class="scout-meta-label">身高</span><span class="scout-meta-value">${h.heightStr}</span></div>
        <div class="scout-meta-row"><span class="scout-meta-label">体重</span><span class="scout-meta-value">${h.weightStr}</span></div>
      </div>
      <div class="scout-report-meta">
        <div class="scout-meta-row"><span class="scout-meta-label">球员模板</span><span class="scout-meta-value">${c.primary}</span></div>
        <div class="scout-meta-row"><span class="scout-meta-label">次级模板</span><span class="scout-meta-value">${c.secondary}</span></div>
      </div>

      <div class="scout-section-title">打法定位</div>
      <div class="scout-play-style">${report.playStyle}</div>

      <div class="scout-section-title scout-title-green">优势</div>
      <div class="scout-list scout-list-pros">
        ${(report.strengths || []).map(s => `<div class="scout-list-item">${s}</div>`).join('')}
      </div>

      <div class="scout-section-title scout-title-red">短板</div>
      <div class="scout-list scout-list-cons">
        ${(report.weaknesses || []).map(w => `<div class="scout-list-item">${w}</div>`).join('')}
      </div>

      <div class="scout-section-title">球探评价</div>
      <div class="scout-evaluation">${report.evaluation || ''}</div>
    </div>
  `;
}

function showDraftPlayerDetail(idx) {
  const pickResults = G.draftBoard?._pickResults || [];
  const player = pickResults[idx]?.player;
  if (!player) return;

  const team = getTeam(pickResults[idx]?.teamId) || {};
  const pos = getPos(player.pos) || { n: '-' };
  const attrs = player.attrs || {};
  const isUser = player.id === 'USER_PROSPECT';
  const avatarSrc = isUser ? (G.player.avatar || G.player.photo || player.photo || '') : (player.photo || '');
  const avatarInner = avatarSrc
    ? `<img src="${avatarSrc}" style="width:80px;height:80px;border-radius:50%;object-fit:cover;border:2px solid #fbbf27">`
    : `<div style="font-size:40px">🏀</div>`;

  const attrLabels = [
    { k: 'pass', n: '传球' },
    { k: 'shotInt', n: '内线' },
    { k: 'shotExt', n: '外线' },
    { k: 'ft', n: '罚球' },
    { k: 'reb', n: '篮板' },
    { k: 'blk', n: '盖帽' },
    { k: 'stl', n: '抢断' },
    { k: 'phy', n: '身体' }
  ];

  const modalBody = `
    <div style="text-align:center;margin-bottom:20px">
      <div style="width:80px;height:80px;border-radius:50%;background:#333;margin:0 auto 16px;display:flex;align-items:center;justify-content:center;overflow:hidden">${avatarInner}</div>
      <div style="font-size:20px;font-weight:700">${isUser ? `⭐ ${player.name}` : player.name}</div>
      <div style="font-size:13px;color:#888;margin-top:4px">${team.z || ''} ${team.n || ''} · ${pos.n}</div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:20px">
      <div style="background:rgba(255,255,255,0.03);padding:12px;border-radius:8px;text-align:center">
        <div style="font-size:24px;font-weight:700;color:#fbbf27">${player.rating || 70}</div>
        <div style="font-size:11px;color:#666">OVR</div>
      </div>
      <div style="background:rgba(255,255,255,0.03);padding:12px;border-radius:8px;text-align:center">
        <div style="font-size:24px;font-weight:700;color:#22c55e">${player.potential || 75}</div>
        <div style="font-size:11px;color:#666">POT</div>
      </div>
      <div style="background:rgba(255,255,255,0.03);padding:12px;border-radius:8px;text-align:center">
        <div style="font-size:24px;font-weight:700;color:#fff">${player.age || 20}</div>
        <div style="font-size:11px;color:#666">年龄</div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
      ${attrLabels.map(a => `
        <div style="display:flex;justify-content:space-between;padding:8px 12px;background:rgba(255,255,255,0.03);border-radius:6px;font-size:12px">
          <span style="color:#888">${a.n}</span>
          <span style="color:#fbbf27;font-weight:600">${attrs[a.k] || 50}</span>
        </div>
      `).join('')}
    </div>
    <div style="margin-top:16px;padding-top:12px;border-top:1px solid rgba(255,255,255,0.1)">
      <div style="font-size:13px;font-weight:700;color:#fbbf27;margin-bottom:8px">球探报告</div>
      ${generatePlayerScoutReport(player, { rating: player.rating, potential: player.potential })}
    </div>
  `;

  $('draftPlayerModalBody').innerHTML = modalBody;
  $('draftPlayerModal').style.display = 'flex';
}

function closeDraftPlayerModal() {
  $('draftPlayerModal').style.display = 'none';
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
  if (typeof migrateLegacyCommercialSocialState === 'function') migrateLegacyCommercialSocialState();
  if (typeof ensureCoachRelationshipState === 'function') ensureCoachRelationshipState();
  if (typeof ensureCoachDynamicsState === 'function') ensureCoachDynamicsState();
  if (typeof ensureGameplayState === 'function') ensureGameplayState();
  if (typeof ensureAutoCareerState === 'function') ensureAutoCareerState();
  if (typeof applySeasonSalaryPayout === 'function') applySeasonSalaryPayout({ force: false, reason: '新秀赛季薪资发放' });
  if (typeof recalcPlayerTradeValue === 'function') recalcPlayerTradeValue();
  if (typeof ensureLeagueBadges === 'function') ensureLeagueBadges();
  if (typeof enforceLeagueRosterCap === 'function') enforceLeagueRosterCap(15);
  if (typeof enforceLeagueRosterCap === 'function') enforceLeagueRosterCap(15);

  // 初始化队内关系和赛季目标
  if (typeof initTeamRelationsForCurrentTeam === 'function') initTeamRelationsForCurrentTeam();
  if (typeof initializeSeasonGoals === 'function') initializeSeasonGoals();

  // 开局直接进入所选年份的选秀与新秀赛季，不再强行预模拟一年。
  if (typeof injectSeasonRookies === 'function') {
    // We execute this asynchronously but it modifies LEAGUE state which generateSchedule uses?
    // Actually generateSchedule uses TEAMS. injectSeasonRookies pushes to LEAGUE.teams.players.
    // We should await it if possible, but startCareer is sync.
    // injectSeasonRookies is async in definition.
    // We should make startCareer async or handle the promise.
    // Since UI calls startCareer() via onclick, making it async is fine.
    injectSeasonRookies().then(() => {
      generateSchedule();
      setMainNavigationVisible(true);
      if (typeof applyAutoCareerNavigation === 'function') applyAutoCareerNavigation();
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
  setMainNavigationVisible(true);
  if (typeof applyAutoCareerNavigation === 'function') applyAutoCareerNavigation();
  $('createPage').classList.remove('active');
  $('homePage').classList.add('active');
  updateHeader();
  renderHome();
  addNews(`🌟 ${G.player.name}在${G.startYear}年剧本中正式加入${G.team.z}，NBA生涯开始！`, 'pos');
  const coach = getTeamCoach(G.teamId);
  addPhone(coach ? coach.name : "教练", `欢迎加入${G.team.z}！期待你的表现。`, 'info');
}

function updateHeader() {
  $('hdrSeason').textContent = `赛季: ${G.year - 1}-${G.year} (第${G.season}赛季)`;
  $('hdrTeam').textContent = `球队: ${G.team ? G.team.z : '--'}`;
  const effA = typeof getEffectivePlayerAttrs === 'function' ? getEffectivePlayerAttrs(G.player) : G.player.attrs;
  const baseOvr = ovr(G.player.attrs);
  const effOvr = ovr(effA);
  const ovrBonus = effOvr - baseOvr;
  const ovrEl = $('hdrOvr');
  const oldText = ovrEl?.textContent || '';
  const newText = `OVR: ${baseOvr}${ovrBonus > 0 ? '(+' + ovrBonus + ')' : ''}`;
  ovrEl.textContent = newText;
  // OVR change pulse animation
  if (oldText !== newText && ovrEl) {
    ovrEl.classList.remove('ovr-pulse');
    ovrEl.offsetHeight; // reflow
    ovrEl.classList.add('ovr-pulse');
    setTimeout(() => ovrEl.classList.remove('ovr-pulse'), 700);
  }
}

// ============ HOME PAGE ============
function renderPregamePlanPicker(game = null, opp = null) {
  if (!game || typeof getPregamePlanOptions !== 'function') return '';
  const gameKey = typeof getCurrentGameKey === 'function'
    ? getCurrentGameKey({ season: G.season, gameNum: G.gameNum, opp: game.opp })
    : `${G.season}_${G.gameNum}_${game.opp || 0}`;
  const view = getPregamePlanOptions({ gameKey, season: G.season, gameNum: G.gameNum, opp: game.opp, home: game.home });
  const opponentName = opp?.z || opp?.a || '对手';
  return `
    <div class="gameplan-board" data-gameplan-key="${gameKey}">
      <div class="gameplan-head">
        <div>
          <div class="gameplan-kicker">PreGame Plan</div>
          <div class="gameplan-title">今晚对阵 ${opponentName} 的赛前方案</div>
        </div>
        <div class="gameplan-status">${game?.home ? '主场' : '客场'}</div>
      </div>
      <div class="gameplan-axis-list">
        ${view.axes.map(axis => `
          <div class="gameplan-axis">
            <div class="gameplan-axis-title">${axis.title}</div>
            <div class="strategy-chip-row" role="group" aria-label="${axis.title}">
              ${axis.options.map(option => `
                <button class="strategy-chip ${option.active ? 'active' : ''}" data-plan-axis="${axis.id}" data-plan-option="${option.id}" onclick="setPregamePlanChoice('${axis.id}','${option.id}','${gameKey}'); renderHome();">
                  <span>${option.title}</span>
                  <small>${option.detail}</small>
                </button>
              `).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    </div>`;
}

function renderPostgameSummaryPanel() {
  const summary = G.gameplay?.latestPostgame?.summary || null;
  if (!summary || !Array.isArray(summary.lines) || !summary.lines.length) return '';
  return `
    <section class="card home-panel postgame-summary-panel">
      <div class="card-title home-section-title">赛后简报</div>
      <div class="postgame-summary-title">${summary.title || '赛后简报'}</div>
      <div class="postgame-summary-sub">${summary.subtitle || ''}</div>
      <div class="postgame-summary-lines">
        ${summary.lines.map(line => `<div class="postgame-summary-line">${line}</div>`).join('')}
      </div>
    </section>`;
}

function renderCareerLinesPanel() {
  const lines = typeof buildCareerLinesView === 'function' ? buildCareerLinesView() : [];
  if (!lines.length) return '';
  return `
    <section class="card home-panel career-lines-panel">
      <div class="card-title home-section-title">生涯线</div>
      <div class="career-line-grid">
        ${lines.map(line => `
          <div class="career-line-card tone-${line.tone || 'neutral'}">
            <div class="career-line-top">
              <span>${line.title}</span>
              <b>${line.score}</b>
            </div>
            <div class="career-line-track"><span style="width:${clamp(parseNum(line.score, 0), 0, 100)}%"></span></div>
            <div class="career-line-stage">${line.label}${line.lastDelta ? ` · ${line.lastDelta > 0 ? '+' : ''}${line.lastDelta}` : ''}</div>
          </div>
        `).join('')}
      </div>
    </section>`;
}

function renderHome() {
  if (typeof ensureGameplayState === 'function') ensureGameplayState();
  const p = G.player, s = G.seasonStats, gp = Math.max(s.gp, 1);
  const xf = getXFactor(p.xfactor) || { icon: '❔', n: '未知天赋' };
  const shopView = typeof buildEconomyShopView === 'function' ? buildEconomyShopView() : null;
  const commerceView = typeof buildEndorsementOffersView === 'function' ? buildEndorsementOffersView() : null;
  const commerceSummary = commerceView?.summary || {};
  const commerceProfile = shopView?.profile || {};
  const coach = typeof getTeamCoach === 'function' ? getTeamCoach(G.teamId) : null;
  const coachFavor = coach && typeof getCoachFavorability === 'function' ? getCoachFavorability(coach) : 50;
  const coachTreatment = coach && typeof getUserCoachTreatmentProfile === 'function' ? getUserCoachTreatmentProfile(G.player, coach) : null;
  const relationView = typeof buildSocialRelationshipFeedView === 'function' ? buildSocialRelationshipFeedView(3) : { list: [], friendCount: 0, rivalCount: 0, respectCount: 0 };

  // 队内关系和化学反应
  const teamChemistry = typeof ensureTeamRelationsState === 'function' ? ensureTeamRelationsState().chemistry : { overall: 50, lockerRoomMood: 50, dramaLevel: 0 };
  const teammateCount = Object.keys(G.teamRelations?.teammates || {}).length;

  // 赛季目标进度
  const goalsProgress = typeof getGoalsProgressView === 'function' ? getGoalsProgressView() : null;

  // 比赛解释器
  const lastExplanation = G.matchInterpreter?.lastGame?.explanations || [];
  const explanationSummary = lastExplanation.length > 0 ? lastExplanation.map(e => `${e.icon} ${e.label}`).join(' ') : null;

  if (!G.storyLog) {
    G.storyLog = ["欢迎来到《篮球生涯模拟器》。你的传奇，从这里开始——点击【推进日程】开启新的一天或直接去打比赛。"];
  }
  if (!G.gameDays || G.gameDays.length === 0) generateGameDays();

  const isToday = typeof isGameDay === 'function' ? isGameDay(G.dayNum) : false;
  const nextGameDayNum = typeof getNextGameDay === 'function' ? getNextGameDay() : -1;
  const daysToGame = nextGameDayNum >= 0 ? Math.max(0, nextGameDayNum - G.dayNum) : 0;
  const nextGame = G.schedule[G.gameNum] || null;
  const nextOpp = getTeam(nextGame?.opp) || {};
  const fatigueCtx = isToday && typeof buildScheduleFatigueContext === 'function'
    ? buildScheduleFatigueContext({ teamId: G.teamId, home: !!nextGame?.home, roundIndex: G.gameNum, phase: 'regular', userTeamId: G.teamId })
    : null;
  const latest = G.results.length ? G.results[G.results.length - 1] : null;
  const latestOpp = getTeam(latest?.opp) || {};
  const morale = parseNum(G.teamMorale, 50);
  const streakText = Math.abs(parseNum(G.winStreak, 0)) >= 2 ? `${G.winStreak > 0 ? '连胜' : '连败'}${Math.abs(G.winStreak)}` : '波动不大';
  const avgLine = `${(s.pts / gp).toFixed(1)} / ${(s.reb / gp).toFixed(1)} / ${(s.ast / gp).toFixed(1)}`;
  const storyContent = G.storyLog.slice(-18).map(msg => `<div class="home-story-item">${msg}</div>`).join('');
  const newsContent = G.news.slice(0, 6).map(n => `<div class="home-news-item fs-sm">${n.text}</div>`).join('') || '<div class="home-empty">暂无最新资讯</div>';
  const relationContent = relationView.list.length
    ? relationView.list.map(item => `<div class="home-news-item fs-sm">
        <div class="flex fb ai-c gap-8">
          <div class="fw-b">${item.name}</div>
          <span class="badge ${item.status?.badgeClass || 'b-pri'}">${item.status?.label || '普通'}</span>
        </div>
        <div class="t-2 mt-8">${item.teamAbbr || item.profile?.teamAbbr || '--'} | 关系 ${parseNum(item.affinity, 0)} | 尊重 ${parseNum(item.respect, 0)} | 火药味 ${parseNum(item.heat, 0)}</div>
      </div>`).join('')
    : '<div class="home-empty">还没有形成明确的球星关系。去推文流里主动互动，会更快出现朋友和宿敌。</div>';
  const portraitSrc = String(p.avatar || p.photo || '').trim();
  const portraitHtml = portraitSrc
    ? `<img src="${portraitSrc}" class="home-portrait" alt="${p.name}" onerror="if(!this.dataset.fb){this.dataset.fb='1';this.src='${typeof getPlayerPhotoPath === 'function' ? getPlayerPhotoPath(0) : 'assets/images/Player/IMG0000.png'}';}else{this.style.opacity=.25}">`
    : `<div class="home-portrait-placeholder"><div class="home-portrait-icon">🏀</div><div class="home-portrait-text">PLAYER FILE</div></div>`;
  const nextGameTitle = nextGame
    ? `${G.team?.a || '--'} vs ${nextOpp.a || '--'}`
    : '等待赛程加载';
  const nextGameNote = nextGame
    ? `${nextGame.home ? '主场' : '客场'}${isToday ? '，今日开打' : `，${daysToGame} 天后比赛`}${fatigueCtx ? ` · ${fatigueCtx.summary}` : ''}`
    : '赛季日程尚未生成';
  const latestGameHtml = latest
    ? `<div class="home-progress-stack">
        <div class="home-progress-row"><span>最近一战</span><span>${latest.win ? '胜利' : '失利'}</span></div>
        <div class="home-result-meta">${latestOpp.z || latestOpp.a || '对手'} · ${parseNum(latest.teamPts, 0)} : ${parseNum(latest.oppPts, 0)}</div>
        <div class="home-result-sub">你的数据：${latest.injured ? '本场缺阵' : `${parseNum(latest.pts, 0)} 分 ${parseNum(latest.reb, 0)} 板 ${parseNum(latest.ast, 0)} 助 · ${latest.grade || '--'} 级`}</div>
        ${explanationSummary ? `<div class="home-result-sub t-amber">${explanationSummary}</div>` : ''}
      </div>`
    : '<div class="home-empty">还没有正式比赛记录。</div>';

  // 赛季目标进度HTML
  const goalsHtml = goalsProgress ? `
    <div class="home-progress-stack mt-8">
      <div class="home-result-sub">
        ${goalsProgress.streaks.doubleFigures.current > 0 ? `🔥 连续${goalsProgress.streaks.doubleFigures.current}场上双` : ''}
        ${goalsProgress.streaks.over20.current > 0 ? ` · 连续${goalsProgress.streaks.over20.current}场20+` : ''}
      </div>
    </div>` : '';

  // 队内关系HTML
  const teamRelationHtml = `
    <div class="home-news-item fs-sm">
      <div class="flex fb ai-c gap-8">
        <div class="fw-b">更衣室氛围</div>
        <span class="badge ${teamChemistry.overall >= 60 ? 'b-gold' : teamChemistry.overall >= 40 ? 'b-pri' : 'b-war'}">${teamChemistry.overall >= 70 ? '融洽' : teamChemistry.overall >= 50 ? '一般' : '紧张'}</span>
      </div>
      <div class="t-2 mt-8">化学反应 ${Math.round(parseNum(teamChemistry.overall, 50))} | 队友好感 ${teammateCount}人 | ${teamChemistry.dramaLevel > 0 ? `⚠️ ${teamChemistry.dramaLevel}个矛盾` : '✅ 无明显矛盾'}</div>
    </div>`;

  $('homePage').innerHTML = `
  <div class="home-shell">
    ${typeof svgCourtBg === 'function' ? svgCourtBg() : ''}
    ${typeof svgPlayerSilhouette === 'function' ? svgPlayerSilhouette() : ''}
    <section class="card home-hero">
      <div class="home-hero-main">
        <div class="home-portrait-frame" style="position:relative">
          <svg style="position:absolute;inset:-4px;width:calc(100% + 8px);height:calc(100% + 8px);pointer-events:none" viewBox="0 0 160 210" fill="none">
            <rect x="2" y="2" width="156" height="206" rx="20" stroke="rgba(248,193,77,.25)" stroke-width="2" stroke-dasharray="6 4" class="svg-dash-flow"/>
            <rect x="6" y="6" width="148" height="198" rx="18" stroke="rgba(248,193,77,.12)" stroke-width="1"/>
          </svg>
          ${portraitHtml}
        </div>
        <div class="home-hero-copy">
          <div class="home-kicker">Career Command</div>
          <div class="home-title">${p.name}</div>
          <div class="home-subline">${G.team?.z || '--'} | ${p.age} 岁 | ${getPos(p.pos).z} | OVR ${ovr(p.attrs)}${p.injury.active ? ` · 🩹 ${p.injury.type} ${p.injury.games}场` : ''}</div>
          <div class="home-chip-row">
            <span class="home-chip">${xf.icon} ${xf.n}</span>
            <span class="home-chip">${G.year - 1}-${G.year} 赛季</span>
            <span class="home-chip">${commerceProfile.privilegeLabel || '新秀观察'}</span>
            <span class="home-chip ${p.injury.active ? 'danger' : ''}">${p.injury.active ? '伤病名单' : '可出战'}</span>
          </div>
          <div class="home-blurb">
            <span>球队士气 ${morale}</span><span class="home-dot"></span>
            <span>${streakText}</span><span class="home-dot"></span>
            <span>存款 $${parseNum(p.cash, 0).toFixed(2)}M</span><span class="home-dot"></span>
            <span>声望 ${p.fame} / 信任 ${p.trust}</span>
          </div>
          <div class="home-bars">
            <div>
              <div class="home-bar-row"><span class="home-bar-label">体力</span><span class="home-bar-value">${parseNum(p.stamina, 100)}%</span></div>
              <div class="home-mini-track"><span style="width:${clamp(parseNum(p.stamina, 100), 0, 100)}%"></span></div>
            </div>
            <div>
              <div class="home-bar-row"><span class="home-bar-label">教练好感</span><span class="home-bar-value">${coachFavor}</span></div>
              <div class="home-mini-track"><span style="width:${clamp(coachFavor, 0, 100)}%"></span></div>
            </div>
            <div>
              <div class="home-bar-row"><span class="home-bar-label">体系契合</span><span class="home-bar-value">${coachTreatment ? `${coachTreatment.fitScore}/100` : '--'}</span></div>
              <div class="home-mini-track"><span style="width:${clamp(parseNum(coachTreatment?.fitScore, 55), 0, 100)}%"></span></div>
            </div>
          </div>
        </div>
      </div>
      <div class="home-hero-side">
        <div id="homeActionContainer" class="home-action-host"></div>
        <div class="home-mini-grid">
          <div class="home-mini-tile tone-gold">
            <div class="home-mini-label">战绩</div>
            <div class="home-mini-value">${s.wins}-${s.losses}</div>
            <div class="home-mini-hint">${G.team?.z || '--'} 本季走势</div>
          </div>
          <div class="home-mini-tile tone-cyan">
            <div class="home-mini-label">场均线</div>
            <div class="home-mini-value">${avgLine}</div>
            <div class="home-mini-hint">PTS / REB / AST</div>
          </div>
          <div class="home-mini-tile tone-purple">
            <div class="home-mini-label">商业位阶</div>
            <div class="home-mini-value">${commerceSummary.marketLabel || commerceProfile.commercialIdentity || '未评级'}</div>
            <div class="home-mini-hint">曝光势能 ${parseNum(commerceProfile.visibilityMomentum, 0).toFixed(0)}</div>
          </div>
          <div class="home-mini-tile tone-neutral">
            <div class="home-mini-label">社媒关系</div>
            <div class="home-mini-value">${parseNum(relationView.friendCount, 0)} / ${parseNum(relationView.rivalCount, 0)}</div>
            <div class="home-mini-hint">朋友 / 宿敌</div>
          </div>
        </div>
      </div>
    </section>

    <div class="home-grid">
      <div class="home-main-stack">
      ${typeof renderAutoReportCard === 'function' ? renderAutoReportCard(G.autoCareer?.weeklyReports?.[0] || null) : ''}
      ${typeof renderAutoWeeklyFacts === 'function' ? renderAutoWeeklyFacts() : ''}
      <section class="card home-panel home-feed">
        <div class="card-title home-section-title">生涯播报</div>
        <div id="storyBoard" class="home-feed-scroll">${storyContent}</div>
      </section>
      </div>

      <div class="home-side">
        <section class="card home-panel">
          <div class="card-title home-section-title">作战板</div>
          <div class="home-match-head">
            <div>
              <div class="home-match-kicker">${isToday ? 'Game Night' : 'Schedule'}</div>
              <div class="home-match-title">${nextGameTitle}</div>
              <div class="home-result-sub mt-8">${nextGameNote}</div>
            </div>
            <div class="home-match-score">${isToday ? 'TODAY' : `${daysToGame}D`}</div>
          </div>
          <div class="home-metric-grid mt-12">
            <div class="home-mini-tile tone-neutral">
              <div class="home-mini-label">分钟待遇</div>
              <div class="home-mini-value">${coachTreatment ? `${coachTreatment.minuteDelta >= 0 ? '+' : ''}${coachTreatment.minuteDelta}` : '--'}</div>
              <div class="home-mini-hint">${coachTreatment?.label || '正常轮换'}</div>
            </div>
            <div class="home-mini-tile tone-neutral">
              <div class="home-mini-label">球权修正</div>
              <div class="home-mini-value">${coachTreatment ? `${coachTreatment.usageDelta >= 0 ? '+' : ''}${(coachTreatment.usageDelta * 100).toFixed(0)}%` : '--'}</div>
              <div class="home-mini-hint">${coachTreatment?.directiveText || '无额外指令'}</div>
            </div>
          </div>
          ${latestGameHtml}
          ${goalsHtml}
        </section>

        ${renderPostgameSummaryPanel()}
        ${renderCareerLinesPanel()}

        <section class="card home-panel">
          <div class="card-title home-section-title">关系网络</div>
          <div class="home-news-item fs-sm">
            <div class="flex fb ai-c gap-8">
              <div class="fw-b">${coach?.name || '主教练'}</div>
              <span class="badge b-gold">${coach?.systemLabel || '均衡体系'}</span>
            </div>
            <div class="t-2 mt-8">教练好感 ${coachFavor} | 体系契合 ${coachTreatment ? `${coachTreatment.fitScore}/100` : '--'} | ${coachTreatment?.fitLabel || '正常适配'}</div>
          </div>
          ${teamRelationHtml}
          ${relationContent}
          <div class="mt-12"><button class="btn btn-no btn-sm home-inline-btn" onclick="if(confirm('确定要宣布退役吗？生涯将就此落幕！\\n如果是误触请点击取消。')) forceRetire()">结束生涯</button></div>
        </section>

        <section class="card home-panel">
          <div class="card-title home-section-title">最新资讯</div>
          <div class="home-news-list">${newsContent}</div>
        </section>
      </div>
    </div>
  </div>`;

  setTimeout(() => {
    const sb = $('storyBoard');
    if (sb) sb.scrollTop = sb.scrollHeight;
    // VFX: stagger-animate story items
    if (typeof animateStatBars === 'function') animateStatBars($('homePage'));
    const stories = sb?.querySelectorAll('.home-story-item');
    if (stories) stories.forEach((item, i) => {
      item.classList.add('story-item-enter');
      item.style.animationDelay = (i * 0.05) + 's';
    });
  }, 10);

  if (typeof isAutoCareerMode === 'function' && isAutoCareerMode()) {
    if (typeof renderRegularSeasonAction === 'function') renderRegularSeasonAction();
  } else if (G.playoffs && G.playoffs.active && !G.playoffs.eliminated) {
    if (typeof renderPlayoffGame === 'function') renderPlayoffGame();
  } else if (G.gameNum >= (typeof getSeasonGameCount === 'function' ? getSeasonGameCount() : (G.totalGames || 82))) {
    if (typeof renderSeasonEnd === 'function') renderSeasonEnd();
  } else {
    if (typeof renderRegularSeasonAction === 'function') renderRegularSeasonAction();
  }
}

function appendStoryToBoard(text, color = '#fff', typewrite = true, opts = {}) {
  if (!G.storyLog) G.storyLog = [];
  const formatted = `<span style="color:${color}">${text}</span>`;
  G.storyLog.push(formatted);
  if (G.storyLog.length > 50) G.storyLog.shift(); // Keep history size contained
  if (opts?.skipDom) return;

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
    return '<tr><td colspan="12" class="t-2">暂无球员数据</td></tr>';
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
    <td>${dnp ? '-' : parseNum(row.pf, 0)}</td>
    <td>${dnp ? '-' : parseNum(row.tov, 0)}</td>
    <td>${dnp ? '-' : `${fg} | ${tp} | ${ft}`}</td>
  </tr>`;
  }).join('');
}
function showLeagueGameDetailModal(gameId) {
  if (typeof getLeagueGameDetailById !== 'function') return;
  const game = getLeagueGameDetailById(gameId);
  if (!game) return;
  if (typeof hydrateLeagueGameDetailRows === 'function') hydrateLeagueGameDetailRows(game);
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
          <th>#</th><th>球员</th><th>位置</th><th>MIN</th><th>PTS</th><th>REB</th><th>AST</th><th>STL</th><th>BLK</th><th>PF</th><th>TOV</th><th>命中 FG/3PT/FT</th>
        </tr></thead><tbody>${renderGameDetailRows(homeRows)}</tbody></table></div>
      </div>
      <div class="card game-detail-team" style="margin-bottom:0">
        <div class="card-title">${away.z || away.n || '客队'} 盒分</div>
        <div class="tbl"><table><thead><tr>
          <th>#</th><th>球员</th><th>位置</th><th>MIN</th><th>PTS</th><th>REB</th><th>AST</th><th>STL</th><th>BLK</th><th>PF</th><th>TOV</th><th>命中 FG/3PT/FT</th>
        </tr></thead><tbody>${renderGameDetailRows(awayRows)}</tbody></table></div>
      </div>
    </div>
    </div>
  `, { className: 'modal-game-detail' });
}

function cloneLeagueSeasonState() {
  return JSON.parse(JSON.stringify(G.leagueSeason || {
    round: 0,
    teamRecords: {},
    playerStats: {},
    roundSchedule: [],
    teamGameLogs: {},
    gameDetails: []
  }));
}

function previewLeagueMatchup(homeTeamId, awayTeamId, opts = {}) {
  if (typeof simulateLeagueMatchup !== 'function') return null;
  const snapshot = cloneLeagueSeasonState();
  try {
    return simulateLeagueMatchup(homeTeamId, awayTeamId, opts);
  } finally {
    G.leagueSeason = snapshot;
  }
}

function showLeagueMatchupPreviewModal(game) {
  if (!game) return;
  const home = getTeam(game.homeTeamId) || {};
  const away = getTeam(game.awayTeamId) || {};
  const homeRows = Array.isArray(game.homeRows) ? game.homeRows : [];
  const awayRows = Array.isArray(game.awayRows) ? game.awayRows : [];
  const homeWin = parseNum(game.homeScore, 0) > parseNum(game.awayScore, 0);
  showModal(`
    <div class="game-detail-wrap">
    <div class="modal-hd">
      <h3>比赛预览 | 第${parseNum(game.round, 0)}轮 · ${parseNum(game.year, G.year)}赛季</h3>
      <button class="modal-x" onclick="hideModal()">✕</button>
    </div>
    <div class="ev neu mb-12">这是一次预览，不会写入赛季积分、战绩或球员统计。</div>
    <div class="card game-detail-score" style="margin-bottom:12px">
      <div class="flex fb">
        <div class="fw-b">${away.z || away.n || '客队'} (${away.a || '--'})</div>
        <div class="fw-b ${homeWin ? 't-ok' : 't-no'}">${parseNum(game.awayScore, 0)} - ${parseNum(game.homeScore, 0)}</div>
        <div class="fw-b">${home.z || home.n || '主队'} (${home.a || '--'})</div>
      </div>
      <div class="tc mt-12">
        <span class="badge ${homeWin ? 'b-ok' : 'b-no'}">${homeWin ? '主胜' : '客胜'}</span>
      </div>
    </div>
    ${renderHomeAwayFlow(game)}
    <div class="grid g1 game-detail-teams">
      <div class="card game-detail-team" style="margin-bottom:0">
        <div class="card-title">${home.z || home.n || '主队'} 盒分</div>
        <div class="tbl"><table><thead><tr>
          <th>#</th><th>球员</th><th>位置</th><th>MIN</th><th>PTS</th><th>REB</th><th>AST</th><th>STL</th><th>BLK</th><th>PF</th><th>TOV</th><th>命中 FG/3PT/FT</th>
        </tr></thead><tbody>${renderGameDetailRows(homeRows)}</tbody></table></div>
      </div>
      <div class="card game-detail-team" style="margin-bottom:0">
        <div class="card-title">${away.z || away.n || '客队'} 盒分</div>
        <div class="tbl"><table><thead><tr>
          <th>#</th><th>球员</th><th>位置</th><th>MIN</th><th>PTS</th><th>REB</th><th>AST</th><th>STL</th><th>BLK</th><th>PF</th><th>TOV</th><th>命中 FG/3PT/FT</th>
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
      <div class="fw-b">${recapData.headline || '比赛战报'} <span class="badge b-cyan" style="margin-left:6px">本地模板</span></div>
      <div class="t-2 fs-sm mt-8" style="line-height:1.7">${recapData.recap || ''}</div>
    </div>`
    : '';
  const resultSvg = renderResultBadgeSvg({ win: !!res.win });

  return `
  <div class="card game-result-card" data-win="${!!res.win}">
    <div class="card-title">${res.win ? '🎉 胜利' : '😞 失败'}${effortTag}</div>
    <div class="result-banner ${res.win ? 'win' : 'loss'}">${res.win ? 'W 胜利' : 'L 失利'}</div>
    <div class="tc">${resultSvg}</div>
    <div class="tc fw-b mt-12 game-score-text">${teamAbbr} <span class="t-gold" data-score="${parseNum(res.teamPts, 0)}">0</span> : <span data-score="${parseNum(res.oppPts, 0)}">0</span> ${oppAbbr}</div>
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
  const fatigueCtx = isToday && typeof buildScheduleFatigueContext === 'function'
    ? buildScheduleFatigueContext({ teamId: G.teamId, home: !!game?.home, roundIndex: G.gameNum, phase: 'regular', userTeamId: G.teamId })
    : null;

  let gameHtml = '';
  if (isToday) {
    gameHtml = `
      <div style="background:linear-gradient(90deg, rgba(20,20,20,0.9), rgba(40,40,40,0.9)); border:1px solid var(--gold); border-radius:6px; padding:8px 12px; display:flex; justify-content:space-between; align-items:center;">
        <div style="font-size:14px;">
          📅 第${G.dayNum + 1}天 | 🏀 比赛: ${G.gameNum + 1}/${typeof getSeasonGameCount === 'function' ? getSeasonGameCount() : (G.totalGames || 82)} VS <span class="t-gold fw-b">${opp?.z || '对手'}</span> (${game?.home ? '主场' : '客场'})
          ${fatigueCtx ? `<div style="font-size:12px;color:#9fb0c8;margin-top:4px">体能报告: ${fatigueCtx.summary} | 当前体力 ${parseNum(G.player.stamina, 100)}%</div>` : ''}
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
  if (typeof showLoading === 'function') showLoading();
  renderHome();
  // 全局安全超时：60秒后提示重试（此时 simulateDay 已完成，只需重跑生成内容）
  let dayTimeoutId = null;
  let timedOut = false;
  dayTimeoutId = setTimeout(() => {
    timedOut = true;
    G._simulatingDay = false;
    if (typeof hideLoading === 'function') hideLoading();
    showModal(`
      <div style="text-align:center;padding:16px">
        <div style="font-size:28px;margin-bottom:12px">⏱️</div>
        <h3 style="margin:0 0 8px">模拟响应超时</h3>
        <p style="color:#aaa;margin:0 0 16px;font-size:14px">本地模板内容未能在规定时间内完成。比赛数据已保存，可以只重试剧情、战报和舆情。</p>
        <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
          <button class="btn btn-gold" onclick="hideModal();retryDayContent()">重试本地内容</button>
          <button class="btn" onclick="hideModal();renderHome()">跳过，继续游戏</button>
        </div>
      </div>
    `);
  }, 60000);
  try {
    // 赛前事件：如果今天是比赛日，先掷骰并展示事件
    const isGame = typeof isGameDay === 'function' && isGameDay(G.dayNum) && G.gameNum < (typeof getSeasonGameCount === 'function' ? getSeasonGameCount() : (G.totalGames || 82));
    if (isGame && !G.player?.injury?.active && typeof rollPreGameEvent === 'function') {
      const ev = rollPreGameEvent();
      if (ev && typeof showEventOutcomeModal === 'function') {
        if (typeof hideLoading === 'function') hideLoading();
        await showEventOutcomeModal(ev);
        if (typeof showLoading === 'function') showLoading();
      }
    }

    const result = simulateDay();
    if (!result) return;
    if (result.type === 'seasonEnd') {
      updateHeader();
      renderSeasonEnd();
      return;
    }

    let postgameRoute = null;
    if (result.isGame && typeof routePostgameEvents === 'function') {
      postgameRoute = routePostgameEvents(result);
    }
    const dailyPrompt = result.isGame
      ? (postgameRoute?.forcedPrompt || null)
      : (typeof buildDailyInteractionPrompt === 'function'
        ? buildDailyInteractionPrompt(result)
        : (typeof buildCoachDailyPrompt === 'function' ? buildCoachDailyPrompt(result) : null));
    if (dailyPrompt) {
      if (typeof hideLoading === 'function') hideLoading();
      await showCoachChoiceModal(dailyPrompt, result, { mandatory: true });
      if (typeof showLoading === 'function') showLoading();
      updateHeader();
      renderHome();
      if ($('rosterPage').classList.contains('active')) renderRoster();
      if ($('tradePage').classList.contains('active')) renderTrade();
      if ($('phonePage').classList.contains('active')) renderPhone();
    }

    G._latestDayResult = result;

    // ========== 本地模板剧情（优先，独立超时） ==========
    const storyPromise = typeof generateDailyStoryByTemplate === 'function'
      ? generateDailyStoryByTemplate(result, { deferRender: true }).catch(e => { console.warn('剧情生成失败:', e); return null; })
      : Promise.resolve(null);

    // ========== 战报 + 推文并行（不阻塞剧情） ==========
    const recapPromise = (result.isGame && typeof generateMatchRecapByTemplate === 'function')
      ? generateMatchRecapByTemplate(result).catch(e => { console.warn('战报生成失败:', e); return null; })
      : Promise.resolve(null);

    const tweetsPromise = typeof generateDailySocialTweetsSmart === 'function'
      ? generateDailySocialTweetsSmart(result).catch(e => { console.warn('推文生成失败:', e); return []; })
      : Promise.resolve([]);

    // 模板剧情先完成（渲染到面板），然后等战报和推文
    await storyPromise;
    const settled = await Promise.allSettled([recapPromise, tweetsPromise]);
    const recapResult = settled[0];
    if (recapResult?.status === 'fulfilled' && recapResult?.value?.ok && recapResult.value.recap) {
      result.gameRecap = recapResult.value.recap;
      G._latestGameRecap = recapResult.value.recap;
    }

    updateHeader();
    renderHome();
    if ($('phonePage').classList.contains('active')) renderPhone();
  } finally {
    clearTimeout(dayTimeoutId);
    G._simulatingDay = false;
    if (typeof hideLoading === 'function') hideLoading();
    if ($('homePage').classList.contains('active')) renderHome();
    if ($('phonePage').classList.contains('active')) renderPhone();
    // 自动备份到 localStorage
    try { localStorage.setItem('nba_save_auto', JSON.stringify(buildSaveObj())); } catch (e) { }
  }
}

async function retryDayContent() {
  const result = G._latestDayResult;
  if (!result) { renderHome(); return; }
  if (typeof showLoading === 'function') showLoading();
  try {
    const storyP = typeof generateDailyStoryByTemplate === 'function'
      ? generateDailyStoryByTemplate(result, { deferRender: true }).catch(e => { console.warn('剧情重试失败:', e); })
      : Promise.resolve();
    const recapP = (result.isGame && typeof generateMatchRecapByTemplate === 'function')
      ? generateMatchRecapByTemplate(result, { force: true }).then(r => {
          if (r?.ok && r.recap) { result.gameRecap = r.recap; G._latestGameRecap = r.recap; }
        }).catch(e => { console.warn('战报重试失败:', e); })
      : Promise.resolve();
    const tweetsP = typeof generateDailySocialTweetsSmart === 'function'
      ? generateDailySocialTweetsSmart(result, { force: true }).catch(e => { console.warn('推文重试失败:', e); })
      : Promise.resolve();
    await storyP;
    await Promise.allSettled([recapP, tweetsP]);
  } finally {
    if (typeof hideLoading === 'function') hideLoading();
    updateHeader();
    renderHome();
    if ($('phonePage').classList.contains('active')) renderPhone();
    try { localStorage.setItem('nba_save_auto', JSON.stringify(buildSaveObj())); } catch (e) { }
  }
}

function refreshCoachStateViews() {
  updateHeader();
  if ($('homePage')?.classList.contains('active')) renderHome();
  if ($('rosterPage')?.classList.contains('active')) renderRoster();
  if ($('tradePage')?.classList.contains('active')) renderTrade();
  if ($('phonePage')?.classList.contains('active')) renderPhone();
}

function buildCoachChoiceOutcomeSummary() {
  const coach = typeof getTeamCoach === 'function' ? getTeamCoach(parseNum(G.teamId, 0)) : null;
  const favor = coach && typeof getCoachFavorability === 'function' ? getCoachFavorability(coach) : 50;
  const treatment = coach && typeof getUserCoachTreatmentProfile === 'function'
    ? getUserCoachTreatmentProfile(G.player, coach)
    : null;
  const rows = [
    `教练好感度：${favor}/100`,
    `当前待遇：${treatment?.label || '正常轮换'}`,
    `体系契合：${treatment ? `${treatment.fitScore}/100 · ${treatment.fitLabel}` : '--'}`,
    `分钟修正：${treatment ? `${treatment.minuteDelta >= 0 ? '+' : ''}${treatment.minuteDelta}` : '--'}`,
    `球权修正：${treatment ? `${treatment.usageDelta >= 0 ? '+' : ''}${(treatment.usageDelta * 100).toFixed(1)}%` : '--'}`,
    `沟通状态：${treatment?.directiveText || '无额外沟通指令'}`
  ];
  return rows.map(line => `<div class="t-2 fs-sm mt-8">${line}</div>`).join('');
}

function buildTeamChoiceOutcomeSummary(prompt = null) {
  const chemistry = typeof ensureTeamRelationsState === 'function'
    ? ensureTeamRelationsState().chemistry
    : { overall: 50, lockerRoomMood: 50, dramaLevel: 0 };
  const targetPlayerId = parseNum(prompt?.targetPlayerId, 0);
  const relation = targetPlayerId && typeof getTeammateRelationEntry === 'function'
    ? getTeammateRelationEntry(targetPlayerId, G.teamId)
    : null;
  const attitude = relation && typeof getTeammateAttitudeLabel === 'function'
    ? getTeammateAttitudeLabel(relation.favorability, relation.usageSatisfaction)
    : null;
  const rows = [
    `更衣室化学反应：${Math.round(parseNum(chemistry?.overall, 50))}/100`,
    `更衣室氛围：${Math.round(parseNum(chemistry?.lockerRoomMood, 50))}/100`,
    `内部矛盾：${parseNum(chemistry?.dramaLevel, 0)}`
  ];
  if (relation) {
    rows.unshift(`球权满意度：${parseNum(relation.usageSatisfaction, 0) >= 0 ? '+' : ''}${parseNum(relation.usageSatisfaction, 0)}`);
    rows.unshift(`队友态度：${attitude ? `${attitude.icon} ${attitude.label}` : '普通'}`);
    rows.unshift(`${relation.name || '目标队友'} 好感度：${Math.round(parseNum(relation.favorability, 50))}/100`);
  }
  return rows.map(line => `<div class="t-2 fs-sm mt-8">${line}</div>`).join('');
}

function buildDailyChoiceOutcomeSummary(prompt = null) {
  const type = String(prompt?.type || '').trim();
  const teamPromptTypes = new Set(['teammate_ball_movement', 'teammate_shot_tension', 'veteran_film_session', 'rookie_help_request', 'bench_unit_talk']);
  if (String(prompt?.summaryMode || '').trim() === 'team' || teamPromptTypes.has(type)) {
    return buildTeamChoiceOutcomeSummary(prompt);
  }
  return buildCoachChoiceOutcomeSummary();
}

function showCoachChoiceModal(prompt, result = null, opts = {}) {
  const promptObj = prompt && typeof prompt === 'object' ? prompt : null;
  if (!promptObj || !Array.isArray(promptObj.choices) || !promptObj.choices.length) return Promise.resolve(null);
  const mandatory = !!opts?.mandatory;
  return new Promise(resolve => {
    const modalBg = $('modalBg');
    const cleanup = () => modalBg?.removeEventListener('click', bgHandler, true);
    const finish = (payload = null) => {
      cleanup();
      hideModal();
      resolve(payload);
    };
    const bgHandler = (e) => {
      if (e.target !== modalBg) return;
      e.stopImmediatePropagation();
      if (!mandatory) finish(null);
    };
    modalBg?.addEventListener('click', bgHandler, true);

    const renderOutcome = (choice, outcome) => {
      const summaryHtml = buildDailyChoiceOutcomeSummary(promptObj);
      showModal(`
        <div class="modal-hd coach-prompt-head">
          <h3>${promptObj.title}</h3>
          ${mandatory ? '' : '<button class="modal-x" id="coachChoiceCloseBtn">✕</button>'}
        </div>
        <div class="coach-prompt-lead">${promptObj.desc || '教练组希望你给出明确态度。'}</div>
        <div class="coach-prompt-outcome">
          <div class="coach-prompt-outcome-title">${choice?.title || '已完成沟通'}</div>
          ${choice?.badge ? `<div class="coach-prompt-outcome-badge">${choice.badge}</div>` : ''}
          <div class="coach-prompt-outcome-copy">${outcome?.text || '这次沟通已经产生影响。'}</div>
          ${outcome?.analysisText ? `<div class="coach-prompt-outcome-analysis">${outcome.analysisText}</div>` : ''}
        </div>
        <div class="coach-prompt-panel mt-16">
          <div class="coach-prompt-panel-kicker">当前反馈</div>
          <div class="coach-prompt-summary">${summaryHtml}</div>
        </div>
        <button class="btn btn-gold mt-16" id="coachChoiceDoneBtn" style="width:100%">继续</button>
      `, { className: 'modal-coach-prompt' });
      if (!mandatory) {
        const closeBtn = $('coachChoiceCloseBtn');
        if (closeBtn) closeBtn.onclick = () => finish(outcome || null);
      }
      const doneBtn = $('coachChoiceDoneBtn');
      if (doneBtn) {
        doneBtn.onclick = () => {
          refreshCoachStateViews();
          finish(outcome || null);
        };
      }
    };

    showModal(`
      <div class="modal-hd">
        <h3>${promptObj.title || '教练事件'}</h3>
        ${mandatory ? '' : '<button class="modal-x" id="coachChoiceCloseBtn">✕</button>'}
      </div>
      <div class="mb-16 t-2">${promptObj.desc || '教练组希望你给出明确态度。'}</div>
      <div class="grid g3">
        ${promptObj.choices.map((choice, index) => `
          <button class="choice-card" data-coach-choice="${index}" style="text-align:left">
            <div class="fw-b">${choice.title || `选项${index + 1}`}</div>
            <div class="t-2 fs-sm mt-12">${choice.detail || '会影响你和教练组的关系。'}</div>
            ${choice.badge ? `<div class="mt-12"><span class="badge b-cyan">${choice.badge}</span></div>` : ''}
          </button>
        `).join('')}
      </div>
      ${mandatory ? '<div class="t-2 fs-sm mt-16">你需要先表态，今天的流程才会继续。</div>' : '<button class="btn btn-danger mt-16" id="coachChoiceCancelBtn" style="width:100%">先不沟通</button>'}
    `);

    if (!mandatory) {
      const closeBtn = $('coachChoiceCloseBtn');
      if (closeBtn) closeBtn.onclick = () => finish(null);
      const cancelBtn = $('coachChoiceCancelBtn');
      if (cancelBtn) cancelBtn.onclick = () => finish(null);
    }

      document.querySelectorAll('[data-coach-choice]').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseNum(btn.getAttribute('data-coach-choice'), -1);
        const choice = promptObj.choices[idx];
        if (!choice) return;
        const outcome = typeof applyDailyInteractionChoice === 'function'
          ? applyDailyInteractionChoice(promptObj, choice.id, result)
          : (promptObj.type === 'coach_conversation'
            ? (typeof applyCoachConversationChoice === 'function' ? applyCoachConversationChoice(choice.id) : null)
            : (typeof applyCoachDailyPromptChoice === 'function' ? applyCoachDailyPromptChoice(promptObj, choice.id, result) : null));
        renderOutcome(choice, outcome);
      });
    });
  });
}

function openCoachConversationModal() {
  const prompt = typeof buildCoachConversationPrompt === 'function' ? buildCoachConversationPrompt() : null;
  if (!prompt) return;
  const dynamics = typeof ensureCoachDynamicsState === 'function' ? ensureCoachDynamicsState() : null;
  const day = parseNum(G.dayNum, 0);
  const remain = dynamics ? Math.max(0, parseNum(dynamics.lastConversationDay, -99) + 6 - day) : 0;
  if (remain > 0) {
    showModal(`
      <div class="modal-hd"><h3>教练沟通</h3><button class="modal-x" onclick="hideModal()">✕</button></div>
      <div class="t-2">这周你已经和教练正面沟通过一次了。</div>
      <div class="t-2 fs-sm mt-12">还需要等待 ${remain} 天，才能再次主动提要求或表态。</div>
      <button class="btn btn-gold mt-16" onclick="hideModal()" style="width:100%">知道了</button>
    `);
    return;
  }
  showCoachChoiceModal(prompt, null, { mandatory: false }).then(() => {
    refreshCoachStateViews();
  });
}

async function doResolveDailySocialGate() {
  if (typeof ensureDailySocialReadyBeforeAdvance !== 'function') return;
  const res = await ensureDailySocialReadyBeforeAdvance();
  G._phoneComposeResult = {
    ok: !!res?.ok,
    message: res?.ok
      ? `模板舆情已补齐：${res?.count || 0} 条`
      : (res?.message || '模板舆情补齐失败，请重试')
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
      🏁 <span class="t-gold fw-b">${G.year - 1}-${G.year} 赛季结束</span> | 战绩: ${s.wins}胜${s.losses}负 ${G.playoffs.champion ? '🏆 总冠军' : ''} | 场均 ${ (s.pts / gp).toFixed(1) }分 ${ (s.reb / gp).toFixed(1) }板 ${ (s.ast / gp).toFixed(1) }助
    </div>
    <button class="btn btn-gold btn-sm" style="padding:4px 12px; height:28px; border-radius:4px" onclick="goToOffseason()">进入休赛期 ▶</button>
  </div>`;
}

function renderPlayoffGame() {
  const s = G.playoffs.series;
  const opp = getTeam(s.opp);
  const roundNames = ["", "首轮", "次轮", "分区决赛", "总决赛"];
  const staminaStatus = getStaminaStatus(G.player.stamina);
  const simBusy = !!G._simulatingDay;
  const container = $('homeActionContainer') || $('gamePage');
  if (container) container.innerHTML = `
  <div style="background:linear-gradient(90deg, rgba(80,20,20,0.9), rgba(40,10,10,0.9)); border:1px solid var(--danger); border-radius:6px; padding:8px 12px; display:flex; justify-content:space-between; align-items:center;">
    <div style="font-size:14px;">
      🏆 季后赛 ${roundNames[G.playoffs.round]} | 🏀 VS <span class="t-gold fw-b">${opp.z}</span> | 总比分: <span id="playoff-my-wins" class="t-cyan fw-b">${s.myWins}</span> - <span id="playoff-opp-wins" class="t-danger fw-b">${s.oppWins}</span>
    </div>
    <div style="display:flex; align-items:center; gap:8px;">
      <select id="playoffEffort" class="input-sm" style="padding:4px; height:28px; background:#222; color:#fff; border:1px solid #555; border-radius:4px" ${simBusy ? 'disabled' : ''} onchange="G._effortMode=this.value">
        <option value="slack" ${(G._effortMode==='slack')?'selected':''}>划水</option>
        <option value="normal" ${(!G._effortMode||G._effortMode==='normal')?'selected':''}>正常</option>
        <option value="hard" ${(G._effortMode==='hard')?'selected':''}>拼命</option>
      </select>
      <button class="btn btn-danger btn-sm" style="padding:4px 12px; height:28px; border-radius:4px; font-weight:bold;" ${simBusy ? 'disabled' : ''} onclick="G._effortMode=$('playoffEffort').value; doPlayoffGame()">${simBusy ? '处理中...' : '▶ 比赛并生成剧情'}</button>
    </div>
  </div>
  <div id="playoffResult" style="display:none;"></div>`;
}

async function doPlayoffGame() {
  if (G._simulatingDay) return;
  G._simulatingDay = true;
  renderPlayoffGame();
  let nextRenderer = () => renderPlayoffGame();
  try {
    const res = playPlayoffGame();
    const status = checkSeriesEnd();
    const socialDay = parseNum(G.dayNum, 0) + 1000 + parseNum(G.playoffs.round, 0) * 10 + parseNum(res.myWins + res.oppWins, 0);
    const socialPayload = {
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
        gradeScore: res.gradeScore,
        flow: res.flow || null
      }
    };

    if (typeof generateDailyStoryByTemplate === 'function') {
      res.isPlayoffs = true;
      res.playoffRoundName = ['', '首轮', '次轮', '分区决赛', '总决赛'][G.playoffs.round];
      await generateDailyStoryByTemplate({
        isGame: true,
        gameResult: res,
        type: 'playoffGame'
      }, { deferRender: true });
    }
    if (typeof generateDailySocialTweetsSmart === 'function') {
      await generateDailySocialTweetsSmart(socialPayload, { force: true });
    }

    nextRenderer = (status === 'continue' || status === 'advance')
      ? () => renderPlayoffGame()
      : () => renderSeasonEnd();
  } finally {
    G._simulatingDay = false;
    updateHeader();
    nextRenderer();
    if ($('phonePage').classList.contains('active')) renderPhone();
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
    <div class="mb-16 t-2 fs-sm">薪资空间: $${formatSalaryM(getSalaryCap() * 1.18 - teamPayrollMillion(G.teamId))}M</div>
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
  const currentOffer = offers.find(o => o.current) || null;
  showModal(`
    <div class="modal-hd"><h3>📝 自由市场</h3><button class="modal-x" onclick="hideModal()">✕</button></div>
    <div class="mb-16 t-2">合同到期！以下球队向你发出报价：${currentOffer ? `当前球队续约兴趣 ${Math.round(clamp(parseNum(currentOffer.renewalInterest, currentOffer.interest), 0, 1) * 100)}%` : '当前球队暂无明确续约意向。'}</div>
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
        <div class="t-2 fs-sm mt-8">体系契合 ${parseNum(o.fitScore, 55)} | 兴趣 ${Math.round(clamp(parseNum(o.current ? o.renewalInterest : o.interest, o.interest), 0, 1) * 100)}%</div>
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
  if (typeof ensureCoachRelationshipState === 'function') ensureCoachRelationshipState();
  if (typeof ensureCoachDynamicsState === 'function') ensureCoachDynamicsState();
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

function changeStatsTeamView() {
  const sel = $('statsTeamSelect');
  if (!sel) return;
  G._statsTeamView = parseNum(sel.value, G.teamId);
  renderStats();
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

function changeMatchPreviewHomeTeam() {
  const sel = $('customMatchHome');
  if (!sel) return;
  G._matchPreviewHomeTeamId = parseNum(sel.value, G.teamId);
}

function changeMatchPreviewAwayTeam() {
  const sel = $('customMatchAway');
  if (!sel) return;
  G._matchPreviewAwayTeamId = parseNum(sel.value, G.teamId);
}

function previewCustomMatchup() {
  const homeSel = $('customMatchHome');
  const awaySel = $('customMatchAway');
  if (!homeSel || !awaySel) return;
  const homeTeamId = parseNum(homeSel.value, 0);
  const awayTeamId = parseNum(awaySel.value, 0);
  if (!homeTeamId || !awayTeamId || homeTeamId === awayTeamId) {
    alert('请选择两支不同的球队。');
    return;
  }
  G._matchPreviewHomeTeamId = homeTeamId;
  G._matchPreviewAwayTeamId = awayTeamId;
  const phase = G._matchCenterPhaseView === 'playoff' ? 'playoff' : 'regular';
  const roundView = parseNum(G._matchCenterRoundView, 0);
  const detail = previewLeagueMatchup(homeTeamId, awayTeamId, {
    roundIndex: roundView > 0 ? roundView - 1 : G.gameNum,
    season: G.season,
    year: G.year,
    phase,
    userTeamId: 0
  });
  if (!detail) {
    alert('这场对阵无法模拟。');
    return;
  }
  showLeagueMatchupPreviewModal(detail);
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
  let previewHomeTeamId = parseNum(G._matchPreviewHomeTeamId, G.teamId);
  if (previewHomeTeamId < 1 || previewHomeTeamId > 30 || !getTeam(previewHomeTeamId)) previewHomeTeamId = parseNum(G.teamId, 1);
  let previewAwayTeamId = parseNum(G._matchPreviewAwayTeamId, 0);
  if (previewAwayTeamId < 1 || previewAwayTeamId > 30 || !getTeam(previewAwayTeamId) || previewAwayTeamId === previewHomeTeamId) {
    previewAwayTeamId = TEAMS.find(t => t.id !== previewHomeTeamId)?.id || (previewHomeTeamId % 30) + 1;
  }
  G._matchPreviewHomeTeamId = previewHomeTeamId;
  G._matchPreviewAwayTeamId = previewAwayTeamId;

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
    <div class="t-2 fs-sm mb-16">${phaseView === 'playoff' ? '可在此查看季后赛盒分；若尚未打季后赛会显示空列表。' : '点击"双方数据"可查看该场比赛完整盒分。'}</div>
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
  const coachFavor = coach && typeof getCoachFavorability === 'function' ? getCoachFavorability(coach) : 50;
  const coachFavorTier = typeof getCoachFavorabilityTier === 'function' ? getCoachFavorabilityTier(coachFavor) : { label: '一般', hint: '会综合看战绩和合同' };
  const coachSeat = coach && typeof buildCoachRetentionProfile === 'function' ? buildCoachRetentionProfile(G.teamId, coach) : null;
  const coachDynamics = typeof ensureCoachDynamicsState === 'function' ? ensureCoachDynamicsState() : null;
  const conversationCooldown = coachDynamics ? Math.max(0, parseNum(coachDynamics.lastConversationDay, -99) + 6 - parseNum(G.dayNum, 0)) : 0;
  const coachTreatment = coach && typeof getUserCoachTreatmentProfile === 'function'
    ? getUserCoachTreatmentProfile(selfPlayer, coach)
    : null;
  const tradePressure = typeof getUserTradePressureProfile === 'function' ? getUserTradePressureProfile() : null;
  const rotationSet = new Set(rotation.map(r => String(r.id)));
  const injuryMap = new Map();
  roster.forEach(p => { if (p.injury?.active) injuryMap.set(String(p.id || (p.isSelf ? 'USER_SELF' : '')), p.injury); });

  // 队内关系
  const teamRelationState = typeof ensureTeamRelationsState === 'function'
    ? ensureTeamRelationsState()
    : { chemistry: { overall: 50, lockerRoomMood: 50, dramaLevel: 0 }, events: [] };
  const teamChemistry = teamRelationState.chemistry || { overall: 50, lockerRoomMood: 50, dramaLevel: 0 };
  const teamEvents = typeof getRecentTeamRelationEvents === 'function'
    ? getRecentTeamRelationEvents(4, G.teamId)
    : (Array.isArray(teamRelationState.events) ? teamRelationState.events.slice(0, 4) : []);

  function injBadge(id, isSelf) {
    const inj = injuryMap.get(String(id)) || (isSelf ? injuryMap.get('USER_SELF') : null);
    return inj ? `<span class="badge b-no">🩹 ${inj.type} 缺${inj.games}场</span>` : '';
  }

  function getTeammateRelationInfo(pl) {
    if (pl.isSelf) return { favor: 50, usageSatisfaction: 0, attitude: null, entry: null };
    const entry = typeof getTeammateRelationEntry === 'function' ? getTeammateRelationEntry(pl.id, G.teamId) : null;
    const favor = typeof getTeammateFavorability === 'function' ? getTeammateFavorability(pl.id, G.teamId) : 50;
    const usageSatisfaction = parseNum(entry?.usageSatisfaction, 0);
    const attitude = typeof getTeammateAttitudeLabel === 'function' ? getTeammateAttitudeLabel(favor, usageSatisfaction) : null;
    return { favor, usageSatisfaction, attitude, entry };
  }

  // 获取队友态度标签
  function getTeammateAttitudeBadge(pl) {
    if (pl.isSelf) return '';
    const { favor, attitude } = getTeammateRelationInfo(pl);
    if (!attitude || favor >= 45 && favor <= 55) return '';
    return `<span class="badge ${favor >= 65 ? 'b-gold' : favor >= 45 ? 'b-pri' : 'b-war'}" title="${attitude.hint}">${attitude.icon} ${attitude.label}</span>`;
  }

  function renderTeammateFavorability(pl) {
    if (pl.isSelf) return '<div class="t-2 fs-xs">自己</div>';
    const { favor, usageSatisfaction, attitude } = getTeammateRelationInfo(pl);
    const usageTone = usageSatisfaction >= 0 ? `+${usageSatisfaction}` : `${usageSatisfaction}`;
    return `
      <div style="min-width:110px">
        <div class="fw-b">${favor}/100</div>
        <div class="home-mini-track" style="margin-top:4px"><span style="width:${clamp(favor, 0, 100)}%"></span></div>
        <div class="t-2 fs-xs mt-8">${attitude ? `${attitude.icon} ${attitude.label}` : '普通'}</div>
        <div class="t-2 fs-xs">${usageTone} 球权感受</div>
      </div>
    `;
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
        <div class="t-2 fs-sm mt-8">主体系: <span class="badge b-gold">${coachFx.systemLabel || coach.systemLabel || '均衡体系'}</span></div>
        <div class="t-2 fs-sm mt-8">副倾向: ${coachFx.secondaryLean || coach.secondaryLean || '按阵容灵活分配球权'}</div>
        <div class="t-2 fs-sm mt-8">教练好感度: <span class="badge b-pri">${coachFavor}/100 · ${coachFavorTier.label}</span></div>
        <div class="t-2 fs-sm mt-8">留任说明: ${coachFavorTier.hint}</div>
        <div class="t-2 fs-sm mt-8">对你待遇: <span class="badge b-cyan">${coachTreatment?.label || '正常轮换'}</span></div>
        <div class="t-2 fs-sm mt-8">体系契合: ${coachTreatment ? `${coachTreatment.fitScore}/100 · ${coachTreatment.fitLabel}` : '--'}</div>
        <div class="t-2 fs-sm mt-8">沟通状态: ${coachTreatment?.directiveText || '无额外沟通指令'}</div>
        <div class="mt-12" style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn btn-cyan btn-sm" ${conversationCooldown > 0 ? 'disabled' : ''} onclick="openCoachConversationModal()">${conversationCooldown > 0 ? `教练沟通 ${conversationCooldown}天后` : '教练沟通'}</button>
          <span class="badge b-pri">主动交易压力 ${tradePressure ? Math.round(parseNum(tradePressure.pressure, 0.08) * 100) : '--'}%</span>
        </div>
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
          <div>⚡ 节奏倍率: <span class="fw-b">×${coachFx.paceMult?.toFixed(2) || '1.00'}</span></div>
          <div>🏹 外线倍率: <span class="fw-b">×${coachFx.threeRateMult?.toFixed(2) || '1.00'}</span></div>
          <div>🪓 内线倍率: <span class="fw-b">×${coachFx.paintRateMult?.toFixed(2) || '1.00'}</span></div>
          <div>🤝 传导倍率: <span class="fw-b">×${coachFx.astMult?.toFixed(2) || '1.00'}</span></div>
          <div>🧱 篮板倍率: <span class="fw-b">×${coachFx.rebMult?.toFixed(2) || '1.00'}</span></div>
          <div>🛑 防守数据倍率: <span class="fw-b">×${coachFx.stocksMult?.toFixed(2) || '1.00'}</span></div>
          <div>📉 当前胜率: <span class="fw-b">${coachSeat ? (coachSeat.pct * 100).toFixed(1) + '%' : '--'}</span></div>
          <div>🪑 换帅风险: <span class="fw-b">${coachSeat ? Math.round((coachSeat.moveChance || 0) * 100) + '%' : '--'}</span></div>
          <div>⏱️ 你的分钟修正: <span class="fw-b">${coachTreatment ? `${coachTreatment.minuteDelta >= 0 ? '+' : ''}${coachTreatment.minuteDelta}` : '--'}</span></div>
          <div>🏀 你的球权修正: <span class="fw-b">${coachTreatment ? `${coachTreatment.usageDelta >= 0 ? '+' : ''}${(coachTreatment.usageDelta * 100).toFixed(1)}%` : '--'}</span></div>
          <div>🔄 申请交易放行: <span class="fw-b">${tradePressure ? Math.round(parseNum(tradePressure.acceptBonus, 0.02) * 100) + '%' : '--'}</span></div>
          <div>📝 续约环境: <span class="fw-b">${coachFavor <= 35 ? '偏冷' : '可谈'}</span></div>
        </div>
      </div>
    </div>
    <div class="t-2 fs-sm mt-12" style="padding:8px;background:rgba(0,0,0,.2);border-radius:6px">
      <span style="color:var(--cyan)">进攻加成:</span> ${coachFx.offPct >= 0 ? '+' : ''}${(coachFx.offPct * 100).toFixed(1)}% |
      <span style="color:var(--cyan)">防守加成:</span> ${coachFx.defPct >= 0 ? '+' : ''}${(coachFx.defPct * 100).toFixed(1)}% |
      <span style="color:var(--cyan)">XP加成:</span> ${coachFx.xpPct >= 0 ? '+' : ''}${(coachFx.xpPct * 100).toFixed(1)}%
    </div>
    <div class="t-2 fs-sm mt-12" style="padding:8px;background:rgba(255,255,255,.04);border-radius:6px">
      ${coachFx.systemSummary || '当前体系会根据阵容结构重新分配球权、出手和篮板收益。'}
    </div>
    <div class="t-2 fs-sm mt-12" style="padding:8px;background:rgba(0,128,255,.08);border-radius:6px">
      ${coachTreatment?.summary || '教练会按球队轮换正常使用你。'}${coachTreatment ? ` 当前契合说明：${coachTreatment.fitHint}` : ''}
    </div>
    <div class="t-2 fs-sm mt-12" style="padding:8px;background:rgba(255,90,90,.08);border-radius:6px">
      ${tradePressure ? `当前主动交易压力 ${Math.round(parseNum(tradePressure.pressure, 0.08) * 100)}%。教练好感度越低、待遇越差，管理层越容易放行交易；同样会压低当前球队续约兴趣。` : '教练关系会同步影响主动交易通过率和续约意愿。'}
    </div>
  </div>` : ''}

  <div class="card">
    <div class="card-title">🤝 更衣室化学反应</div>
    <div class="grid g2" style="gap:12px">
      <div>
        <div class="home-bar-row"><span class="home-bar-label">总体化学反应</span><span class="home-bar-value">${Math.round(parseNum(teamChemistry.overall, 50))}</span></div>
        <div class="home-mini-track"><span style="width:${clamp(parseNum(teamChemistry.overall, 50), 0, 100)}%"></span></div>
      </div>
      <div>
        <div class="home-bar-row"><span class="home-bar-label">更衣室氛围</span><span class="home-bar-value">${parseNum(teamChemistry.lockerRoomMood, 50)}</span></div>
        <div class="home-mini-track"><span style="width:${clamp(parseNum(teamChemistry.lockerRoomMood, 50), 0, 100)}%"></span></div>
      </div>
    </div>
    <div class="t-2 fs-sm mt-12">
      ${teamChemistry.dramaLevel > 0 ? `⚠️ 存在 ${teamChemistry.dramaLevel} 个内部矛盾，可能影响防守配合和关键时刻表现。` : '✅ 更衣室氛围良好，无明显矛盾。'}
    </div>
  </div>

  <div class="card">
    <div class="card-title">🧩 最近更衣室动态</div>
    ${teamEvents.length ? teamEvents.map(evt => `
      <div class="ev ${evt.type === 'neg' ? 'neg' : evt.type === 'pos' ? 'pos' : 'neu'}">
        <div class="fw-b">${evt.title || '更衣室动态'}</div>
        <div class="t-2 fs-sm mt-8">${evt.detail || '最近队内关系有新的变化。'}</div>
        <div class="t-2 fs-xs mt-8">
          第${parseNum(evt.day, 0) + 1}天
          ${evt.playerName ? ` · ${evt.playerName}` : ''}
          ${parseNum(evt.favorDelta, 0) ? ` · 好感${parseNum(evt.favorDelta, 0) > 0 ? '+' : ''}${parseNum(evt.favorDelta, 0)}` : ''}
          ${parseNum(evt.usageDelta, 0) ? ` · 球权感受${parseNum(evt.usageDelta, 0) > 0 ? '+' : ''}${parseNum(evt.usageDelta, 0)}` : ''}
        </div>
      </div>
    `).join('') : '<div class="t-2">最近更衣室比较平稳，还没有新的关系波动。</div>'}
  </div>

  <div class="card">
    <div class="card-title">球队轮换（点击球员查看详情）</div>
    ${rotation.length ? `<div class="tbl"><table><thead><tr><th>轮换</th><th>球员</th><th>位置</th><th>评分</th><th>分钟</th><th>球权</th><th>好感</th><th>照片</th></tr></thead><tbody>
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
        <td>${renderTeammateFavorability(rp)}</td>
        <td><img src="${getPlayerPhotoSrc(rp)}" style="width:34px;height:34px;border-radius:6px;object-fit:contain;background:rgba(0,0,0,.25)" onerror="if(!this.dataset.fb){this.dataset.fb='1';this.src='${getPlayerPhotoPath(0)}';}else{this.style.opacity=.2}"></td>
      </tr>`).join('')}
    </tbody></table></div>`: '<div class="t-2">未加载到真实数据，当前使用默认模拟。</div>'}
  </div>

  <div class="card">
    <div class="card-title">全队球员数据与属性（点击球员查看详情）</div>
    ${roster.length ? `<div class="tbl"><table><thead><tr>
      <th>#</th><th>球员</th><th>位置</th><th>OVR</th><th>POT</th><th>年龄</th><th>球权</th>
      <th>好感</th><th>传球</th><th>内线</th><th>三分</th><th>罚球</th><th>体能</th><th>盖帽</th><th>篮板</th><th>抢断</th><th>照片</th>
    </tr></thead><tbody>
      ${roster.map((pl, i) => `<tr class="${pl.isSelf ? 'self-row' : (rotationSet.has(String(pl.id)) ? 'hl-row' : '')}">
        <td>${i + 1}</td>
        <td>
          ${pl.isSelf ? `<button class="player-link" onclick="showMyPlayerModal()">${pl.name}</button> <span class="badge b-gold">你</span>` : `<button class="player-link" onclick="showTeamPlayerModal(${G.teamId},${pl.id})">${pl.name}</button>`}
          ${pl.rookie ? '<span class="badge b-cyan">新秀</span>' : ''}
          ${rotationSet.has(String(pl.id)) ? '<span class="badge b-pri">轮换</span>' : ''}
          ${pl.injury?.active ? `<span class="badge b-no">🩹 ${pl.injury.type} 缺${pl.injury.games}场</span>` : ''}
          ${getTeammateAttitudeBadge(pl)}
        </td>
        <td>${posLabel(pl.pos)}${pl.pos2 ? `/${posLabel(pl.pos2)}` : ''}</td>
        <td>${pl.rating}</td>
        <td>${pl.potential}</td>
        <td>${pl.age}</td>
        <td><span class="badge b-cyan fs-xs">${getPlayerUsageLabel(pl)}</span></td>
        <td>${renderTeammateFavorability(pl)}</td>
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

  // Build radar chart SVG
  const radarLabels = ATTRS.map(a => a.n);
  const radarValues = ATTRS.map(a => {
    const v = parseNum(p.attrs[a.k], 50);
    const bonus = Math.round(parseNum(badgeBonuses[a.k], 0));
    return Math.min(v + bonus, 99);
  });
  const radarSVG = typeof buildRadarSVG === 'function' ? buildRadarSVG(radarValues, radarLabels) : '';

  $('upgradePage').innerHTML = `
  ${buildTestAttrPanel('upgrade')}
  ${radarSVG ? `<div class="card" style="text-align:center"><div class="card-title">${svgIcon('upgrade',16)} 属性雷达图</div>${radarSVG}</div>` : ''}
  <div class="grid g2">
    <div class="card">
      <div class="card-title">${svgIcon('upgrade',16)} 属性加点 (XP: <span class="t-gold" id="upgradeXP">${p.xp}</span>)</div>
      ${ATTRS.map(at => {
    const v = p.attrs[at.k];
    const bonus = Math.round(parseNum(badgeBonuses[at.k], 0));
    const cost = getUpgradeCost(v);
    const maxed = v >= 99;
    const bonusTag = bonus > 0 ? `<span class="t-cyan fs-xs" style="margin-left:2px">(+${bonus})</span>` : '';
    const maxBadge = maxed ? '<span class="max-badge" style="color:var(--gold);font-weight:900;margin-left:4px">MAX</span>' : '';
    return `<div class="flex fb" style="margin-bottom:10px;position:relative" id="attr-row-${at.k}">
          <span class="fs-sm" style="width:50px">${at.n}</span>
          <div class="bar" style="flex:1;margin:0 8px"><div class="bar-fill ${barClass(v + bonus)}" data-target="${Math.min(v + bonus, 99)}" style="width:0%"></div></div>
          <span class="fw-b" style="width:50px;text-align:right">${v}${bonusTag}${maxBadge}</span>
          <button class="btn btn-sm btn-gold btn-glow" style="margin-left:8px" onclick="doUpgrade('${at.k}')"
            ${maxed || p.xp < cost ? 'disabled' : ''}>${maxed ? 'MAX' : cost + 'XP'}</button>
        </div>`;
  }).join('')}
    </div>
    <div class="card">
      <div class="card-title">${svgIcon('awards',16)} 徽章升级</div>
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
    return `<div class="flex fb" style="margin-bottom:10px;align-items:flex-start" id="badge-row-${b.id}">
          <div style="padding-right:8px">
            <div><span class="fw-b fs-sm">${icon} ${b.n}</span>
            <span class="tag ${badgeTierClass(lv)}">${badgeTierName(lv)}</span></div>
            <div class="t-2 fs-xs mt-12">${effectText}</div>
            <div class="t-2 fs-xs mt-12" style="color:${reqMet || lv > 0 ? '#9ad0ff' : '#ff9a9a'}">${reqMet || lv > 0 ? '✅' : '⛔'} 要求: ${reqText}</div>
          </div>
          <button class="btn btn-sm btn-purple btn-glow" onclick="doUpgradeBadge('${b.id}')"
            ${lv >= 4 || p.xp < nextCost ? 'disabled' : ''}>${lv >= 4 ? 'HOF' : nextCost + 'XP'}</button>
        </div>`;
  }).join('')}
    </div>
  </div>
  <div class="card">
    <div class="card-title">${svgIcon('basketball',16)} 倾向升级 (XP: <span class="t-gold">${p.xp}</span>)</div>
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
        <div class="bar" style="flex:1;margin:0 8px"><div class="bar-fill" data-target="${v}" style="width:0%;background:${t.color}"></div></div>
        <span class="fw-b" style="width:36px;text-align:right;color:${t.color}">${v}</span>
        <button class="btn btn-sm btn-gold btn-glow" style="margin-left:8px" onclick="doUpgradeTendency('${t.k}')"
          ${maxed || p.xp < cost ? 'disabled' : ''}>${maxed ? 'MAX' : cost + 'XP'}</button>
      </div>`;
    }).join('')}
  </div>`;
  // Animate stat bars after render
  if (typeof animateStatBars === 'function') {
    setTimeout(() => animateStatBars($('upgradePage')), 50);
  }
}

function doUpgrade(key) {
  const cost = getUpgradeCost(G.player.attrs[key]);
  const oldVal = G.player.attrs[key];
  if (spendXP(key, cost)) {
    renderUpgrade();
    updateHeader();
    // VFX: upgrade flash + particles
    const row = document.getElementById('attr-row-' + key);
    if (row && typeof playUpgradeFlash === 'function') {
      const barFill = row.querySelector('.bar-fill');
      if (barFill) playUpgradeFlash(barFill);
      addFloatText(row, '+1', '#69f0ae');
    }
    if (oldVal >= 98 && typeof spawnConfetti === 'function') {
      // MAX reached — confetti!
      const rect = row?.getBoundingClientRect();
      if (rect) spawnConfetti(rect.left + rect.width/2, rect.top);
    } else if (typeof spawnSparks === 'function') {
      const rect = row?.getBoundingClientRect();
      if (rect) spawnSparks(rect.left + rect.width * 0.7, rect.top + rect.height/2, '#ffd54f');
    }
  }
}

function doUpgradeBadge(id) {
  if (upgradeBadge(id)) {
    renderUpgrade();
    // VFX: badge upgrade particles
    const row = document.getElementById('badge-row-' + id);
    if (row && typeof spawnEnergyParticles === 'function') {
      const rect = row.getBoundingClientRect();
      spawnEnergyParticles(rect.left + rect.width/2, rect.top + rect.height/2, '#b388ff');
    }
  }
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
  const pressure = typeof getUserTradePressureProfile === 'function' ? getUserTradePressureProfile() : null;
  $('tradePage').innerHTML = `
  <div class="card">
    <div class="card-title">🔄 交易中心</div>
    <div class="t-2 mb-16">当前球队: <span class="fw-b">${G.team.z}</span> | 交易价值 ${G.player.tradeValue} | 放行压力 ${pressure ? Math.round(parseNum(pressure.pressure, 0.08) * 100) : '--'}%</div>
    <div class="form-group"><label>选择目标球队</label>
      <select class="form-control" id="tradeTarget">
        ${others.map(t => `<option value="${t.id}">${t.z} ${t.n} (${t.a}) - 强度${getTeamStrength(t.id)}</option>`).join('')}
      </select>
    </div>
    <div class="t-2 fs-sm mb-16">流程：按APK逻辑先生成双方1-3人交易筹码，再确认提交交易请求。教练好感度越低、待遇越差，球队越容易批准你主动申请离队。</div>
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
  const cap = parseNum(typeof getSalaryCap === 'function' ? getSalaryCap() : (typeof LEAGUE_SALARY_CAP_M === 'number' ? LEAGUE_SALARY_CAP_M : 170), 170);
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
      ${proposal.leverage ? `<div class="t-2 fs-sm mt-12">教练关系: 好感 ${proposal.leverage.favor} | 球队胜率 ${(parseNum(proposal.leverage.pct, 0.5) * 100).toFixed(1)}% | 放行压力 ${Math.round(parseNum(proposal.leverage.pressure, 0.08) * 100)}%</div>` : ''}
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
        MVP ${hof.counter.mvp} | FMVP ${hof.counter.fmvp} | 一阵 ${hof.counter.allNba1} | 二阵 ${hof.counter.allNba2} | 三阵 ${hof.counter.allNba3} | DPOY ${hof.counter.dpoy} | 总冠军 ${hof.counter.rings}
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
  const allowed = new Set(['feed', 'compose', 'inbox']);
  const tab = String(G._phoneTab || 'feed');
  return allowed.has(tab) ? tab : 'feed';
}
function getSocialAvatarInitial(text = '') {
  const clean = String(text || '').replace(/^@+/, '').trim();
  if (!clean) return '球';
  const ascii = clean.replace(/[^A-Za-z0-9]/g, '');
  return ascii ? ascii.charAt(0).toUpperCase() : clean.charAt(0);
}
function getSocialAvatarTone(seed = '') {
  const hue = typeof hashStringToHue === 'function' ? hashStringToHue(String(seed || 'social')) : 210;
  const hue2 = (hue + 28) % 360;
  return `background:linear-gradient(135deg,hsl(${hue} 78% 56%),hsl(${hue2} 72% 44%));`;
}
function renderBrandLogoThumb(logo, label = '品牌', className = 'brand-logo-thumb') {
  const src = String(logo || '').trim();
  const fallback = `<span class="brand-logo-fallback-label">${getSocialAvatarInitial(label)}</span>`;
  if (src) {
    return `<span class="${className} brand-logo-thumb-has-image"><img src="${src}" alt="${label}" class="brand-logo-img" onerror="this.style.display='none';this.nextElementSibling&&this.nextElementSibling.classList.add('is-visible')"><span class="brand-logo-fallback-surface">${fallback}</span></span>`;
  }
  return `<span class="${className} brand-logo-fallback">${fallback}</span>`;
}
function getPostVisualBadge(post = {}) {
  const status = String(post.imageStatus || '').trim().toLowerCase();
  if (status === 'svg') return { label: 'SVG图', cls: 'b-cyan' };
  if (String(post.image || '').trim()) return { label: '品牌图', cls: 'b-pri' };
  if (String(post.logo || '').trim()) return { label: '品牌LOGO', cls: 'b-gold' };
  return null;
}
function renderSocialPostAvatar(post = {}) {
  if (String(post.logo || '').trim()) {
    return renderBrandLogoThumb(post.logo, post.brand || post.author, 'social-post-avatar social-post-avatar-logo');
  }
  const photo = String(post.avatar || post.photo || '').trim();
  if (photo) {
    const fallback = typeof getPlayerPhotoPath === 'function' ? getPlayerPhotoPath(0) : 'assets/images/Player/IMG0000.png';
    return `<img src="${photo}" class="social-post-avatar social-post-avatar-photo" alt="${post.playerName || post.author || '球员头像'}" onerror="if(!this.dataset.fb){this.dataset.fb='1';this.src='${fallback}';}else{this.style.opacity=.25}">`;
  }
  return `<span class="social-post-avatar social-post-avatar-text" style="${getSocialAvatarTone(post.author || post.persona || post.text)}">${getSocialAvatarInitial(post.author || post.persona || post.text)}</span>`;
}
function renderSocialPostVisual(post = {}) {
  const image = String(post.image || '').trim();
  const logo = String(post.logo || '').trim();
  const title = String(post.brand || post.author || '品牌').trim();
  if (!image && !logo) return '';
  const badge = getPostVisualBadge(post);
  if (!image) {
    return `
      <div class="social-post-visual mt-12">
        <div class="social-post-image-frame social-post-image-frame-logo">
          <div class="social-post-logo-stage">
            ${renderBrandLogoThumb(logo, title, 'brand-logo-thumb brand-logo-thumb-xl')}
            <div class="social-post-logo-copy">${title}</div>
            ${badge ? `<span class="badge ${badge.cls} social-post-badge-overlay">${badge.label}</span>` : ''}
          </div>
        </div>
      </div>`;
  }
  return `
    <div class="social-post-visual mt-12">
      <div class="social-post-image-frame">
        <img src="${image}" alt="${title}" class="social-post-image" onerror="this.closest('.social-post-visual')?.remove()">
        ${logo ? `<div class="social-post-logo-chip">${renderBrandLogoThumb(logo, title, 'brand-logo-thumb brand-logo-thumb-chip')}</div>` : ''}
        ${badge ? `<span class="badge ${badge.cls} social-post-badge-overlay">${badge.label}</span>` : ''}
      </div>
    </div>`;
}
function renderPhoneFeedTab() {
  const timeline = typeof getSocialTimeline === 'function' ? getSocialTimeline(50) : [];
  const relationView = typeof buildSocialRelationshipFeedView === 'function' ? buildSocialRelationshipFeedView(4) : null;
  const rivalInfo = typeof getUpcomingRivalMatchupInfo === 'function' ? getUpcomingRivalMatchupInfo() : null;
  const feedStatus = G._phoneFeedResult ? `<div class="ev ${G._phoneFeedResult.ok ? 'pos' : 'neg'}" style="margin:0">${G._phoneFeedResult.message}</div>` : '';
  const feedNotice = feedStatus ? `<div class="card" style="margin-bottom:10px">${feedStatus}</div>` : '';
  const relationCard = relationView ? `
    <div class="card" style="margin-bottom:10px">
      <div class="card-title">球星关系网</div>
      <div class="t-2 fs-sm">朋友 ${parseNum(relationView.friendCount, 0)} / 宿敌 ${parseNum(relationView.rivalCount, 0)} / 尊重 ${parseNum(relationView.respectCount, 0)}</div>
      ${rivalInfo?.profile ? `
        <div class="ev neg mt-12" style="margin-bottom:10px">
          <div class="fw-b">头号宿敌：${rivalInfo.profile.name} <span class="t-2 fs-sm">(${rivalInfo.profile.teamAbbr || rivalInfo.profile.teamName || '--'})</span></div>
          <div class="t-2 fs-sm mt-8">火药味 ${parseNum(rivalInfo.link?.heat, 0)} / 尊重 ${parseNum(rivalInfo.link?.respect, 0)} / 关系 ${parseNum(rivalInfo.link?.affinity, 0)}</div>
          <div class="t-2 fs-sm mt-8">
            ${rivalInfo.gameIndex >= 0
              ? `下一次对位：第 ${rivalInfo.gameIndex + 1} 场${Number.isFinite(rivalInfo.daysUntil) ? ` · ${rivalInfo.daysUntil === 0 ? '今天' : `${rivalInfo.daysUntil} 天后`}` : ''} · ${rivalInfo.home ? '主场' : '客场'}`
              : '当前赛程里还没有下一次直接碰面'}
          </div>
        </div>` : ''}
      <div class="mt-12" style="display:grid;gap:8px">
        ${Array.isArray(relationView.list) && relationView.list.length ? relationView.list.map(item => `
          <div style="padding:8px 10px;border-radius:10px;background:rgba(255,255,255,.04)">
            <div class="flex fb ai-c">
              <div>
                <span class="fw-b">${item.name}</span>
                <span class="t-2 fs-sm">${item.teamAbbr || item.profile?.teamAbbr || '--'}</span>
              </div>
              <span class="badge ${item.status?.badgeClass || 'b-pri'}">${item.status?.label || '普通'}</span>
            </div>
            <div class="t-2 fs-sm mt-8">关系 ${parseNum(item.affinity, 0)} / 尊重 ${parseNum(item.respect, 0)} / 火药味 ${parseNum(item.heat, 0)}</div>
          </div>
        `).join('') : '<div class="t-2 fs-sm">还没有形成明确关系。多回复球星推文、主动点名互动，朋友和宿敌会很快出现。</div>'}
      </div>
    </div>` : '';
  if (!timeline.length) {
    return `
    ${feedNotice}
    ${relationCard}
    <div class="card" style="margin:0">
      <div class="fw-b">暂无舆情动态</div>
      <div class="t-2 fs-sm mt-8">推进日程后，系统会自动写入本地模板推文和商业动态。这里不再提供手动生成按钮。</div>
    </div>`;
  }
  return feedNotice + relationCard + timeline.map(post => {
    const replied = !!(G.social?.playerRepliedPostIds?.[String(post.id)]);
    const comments = Array.isArray(post.comments) ? post.comments.slice(0, 6) : [];
    const relationBadge = typeof getSocialRelationshipBadgeForPost === 'function' ? getSocialRelationshipBadgeForPost(post) : null;
    const replyOptions = typeof getPlayerReplyOptions === 'function' ? getPlayerReplyOptions(post.id) : [];
    const visualBadge = getPostVisualBadge(post);
    const avatar = renderSocialPostAvatar(post);
    return `
    <div class="card social-post-card" style="margin-bottom:10px">
      <div class="social-post-head">
        <div class="social-post-author-wrap">
          ${avatar}
          <div class="social-post-author-copy">
            <div class="social-post-author-line">
              <span class="fw-b">${post.author}</span>
              <span class="badge b-pri">${post.persona || '中立'}</span>
              ${post.isPlayer ? '<span class="badge b-gold">你</span>' : ''}
              ${post.authorType === 'star' ? '<span class="badge b-cyan">球星</span>' : ''}
              ${relationBadge ? `<span class="badge ${relationBadge.badgeClass || 'b-pri'}">${relationBadge.label}</span>` : ''}
              ${post.mentionsPlayer ? '<span class="badge b-silver">提到你</span>' : ''}
              ${visualBadge && !String(post.image || '').trim() ? `<span class="badge ${visualBadge.cls}">${visualBadge.label}</span>` : ''}
            </div>
            ${post.brand ? `<div class="social-post-subline">${post.brand}${post.product ? ` · ${post.product}` : ''}</div>` : ''}
          </div>
        </div>
        <span class="t-2 fs-xs">${formatPhoneTime(post.ts, post.day)}</span>
      </div>
      <div class="social-post-text mt-12">${post.text || ''}</div>
      ${renderSocialPostVisual(post)}
      <div class="social-post-metrics t-2 fs-sm mt-12">👍 ${parseNum(post.likes, 0)} | 🔁 ${parseNum(post.reposts, 0)} | 💬 ${Array.isArray(post.comments) ? post.comments.length : 0}</div>
      ${comments.length ? `<div class="social-post-comments mt-12">
        ${comments.map(c => `<div class="social-post-comment fs-sm"><span class="fw-b">${c.author}</span>: ${c.text}</div>`).join('')}
      </div>` : ''}
      ${replied ? '<div class="t-2 fs-sm mt-12">你已回复过这条推文</div>' : `
      <div class="mt-12">
        <div class="t-2 fs-sm mb-8">选择回复口径（每条仅一次）</div>
        <div class="grid g2">
          ${replyOptions.map(opt => `
            <button class="choice-card" style="text-align:left" onclick="doPhoneReply(${post.id}, '${opt.id}')">
              <div class="fw-b">${opt.title}</div>
              <div class="t-2 fs-sm mt-8">${opt.detail}</div>
              ${opt.badge ? `<div class="mt-8"><span class="badge b-cyan">${opt.badge}</span></div>` : ''}
            </button>
          `).join('') || '<div class="t-2 fs-sm">这条动态暂时不能回复。</div>'}
        </div>
      </div>`}
    </div>`;
  }).join('');
}
function renderPhoneComposeTab() {
  const tip = G._phoneComposeResult ? `<div class="ev ${G._phoneComposeResult.ok ? 'pos' : 'neg'}">${G._phoneComposeResult.message}</div>` : '';
  const options = typeof getPlayerTweetOptions === 'function' ? getPlayerTweetOptions() : [];
  const used = options.length ? parseNum(options[0].used, 0) : 0;
  const limit = options.length ? parseNum(options[0].limit, 3) : 3;
  return `
  <div class="card" style="margin:0">
    <div class="card-title">✍️ 选择发声口径</div>
    ${tip}
    <div class="t-2 fs-sm mt-8">当天已发 ${used}/${limit} 条。发声会影响声望、信任、球星关系和更衣室观感。</div>
    <div class="grid g2 mt-12">
      ${options.map(opt => `
        <button class="choice-card" style="text-align:left" ${opt.disabled ? 'disabled' : ''} onclick="doPhonePostTweet('${opt.id}')">
          <div class="fw-b">${opt.title}</div>
          <div class="t-2 fs-sm mt-8">${opt.detail}</div>
          ${opt.badge ? `<div class="mt-8"><span class="badge b-gold">${opt.badge}</span></div>` : ''}
        </button>
      `).join('') || '<div class="t-2 fs-sm">社媒系统未加载。</div>'}
    </div>
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
        <div class="t-2 fs-sm mt-8">剩余 ${parseNum(deal.remainingDays, 0)} 天 | 实时收入 $${phoneFmtM(deal.totalIncome)} | 累计 $${phoneFmtM(deal.earned)}</div>
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
      <div class="stat-box"><div class="stat-val">${summary.fameTierLabel || '新秀观察'}</div><div class="stat-lbl">声望特权</div></div>
      <div class="stat-box"><div class="stat-val">${summary.activeCount || 0}/${summary.maxActiveDeals || 8}</div><div class="stat-lbl">已签约</div></div>
      <div class="stat-box"><div class="stat-val">$${phoneFmtM(summary.totalDailyIncome || 0)}</div><div class="stat-lbl">日常分成</div></div>
    </div>
    <div class="t-2 fs-sm mt-12">声望 ${parseNum(summary.fame, 0)} | 信任 ${parseNum(summary.trust, 0)} | 荣誉分 ${parseNum(summary.honorScore, 0)} | 人设 ${summary.commercialIdentity || '上升新贵'}</div>
    <div class="t-2 fs-sm mt-8">综合：${parseNum(summary.overall, 0)} | 场均 ${parseNum(summary.ppg, 0).toFixed(1)} / ${parseNum(summary.apg, 0).toFixed(1)} / ${parseNum(summary.rpg, 0).toFixed(1)} | 曝光势能 ${parseNum(summary.visibilityMomentum, 0).toFixed(0)} | 比赛日额外分成 $${phoneFmtM(summary.totalGameIncome || 0)}</div>
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
  const profile = shop.profile || {};
  const renderUpgrade = (title, level, current, next, onclick) => `
    <div class="ev neu" style="margin-bottom:8px">
      <div class="flex fb">
        <span class="fw-b">${title} Lv.${parseNum(level, 0)}</span>
        <span class="badge b-pri">${current?.name || '未启用'}</span>
      </div>
      <div class="t-2 fs-sm mt-12">${typeof buildEconomyEffectSummary === 'function' ? buildEconomyEffectSummary(current || {}) : ''}</div>
      ${next ? `<button class="btn btn-pri btn-sm mt-12" onclick="${onclick}">升级到 ${next.name}（$${phoneFmtM(next.cost)}）</button>` : '<div class="t-2 fs-sm mt-12">已满级</div>'}
    </div>`;
  const purchaseMsg = G._phoneShopResult ? `<div class="ev ${G._phoneShopResult.ok ? 'pos' : 'neg'}" style="margin-bottom:10px">${G._phoneShopResult.message}</div>` : '';
  return `
  <div class="card" style="margin:0">
    <div class="card-title">💰 资产与团队</div>
    ${purchaseMsg}
    <div class="grid g2">
      <div class="stat-box"><div class="stat-val">$${phoneFmtM(shop.cash)}</div><div class="stat-lbl">现金</div></div>
      <div class="stat-box"><div class="stat-val">${profile.privilegeLabel || '新秀观察'}</div><div class="stat-lbl">声望特权</div></div>
      <div class="stat-box"><div class="stat-val">${parseNum(profile.visibilityMomentum, 0).toFixed(0)}</div><div class="stat-lbl">曝光势能</div></div>
      <div class="stat-box"><div class="stat-val">$${phoneFmtM(profile.totalSpent || 0)}</div><div class="stat-lbl">累计投入</div></div>
    </div>
    <div class="t-2 fs-sm mt-12">人设 ${profile.commercialIdentity || '上升新贵'} | 最多并行代言 ${parseNum(profile.activeDealCap, 8)} | 机会率 ${(parseNum(profile.specialEventChance, 0.04) * 100).toFixed(1)}%</div>
    <div class="mt-12" style="display:flex;gap:6px;flex-wrap:wrap">
      ${(profile.perkList || []).map(text => `<span class="badge b-gold">${text}</span>`).join('') || '<span class="t-2 fs-sm">暂无已解锁特权</span>'}
    </div>
    <div class="mt-16">
      <div class="fw-b mb-12">核心团队</div>
      ${renderUpgrade('体能教练', shop.staminaLevel, shop.staminaCurrent, shop.staminaNext, 'doPhoneBuyStaminaCoach()')}
      ${renderUpgrade('训练教练', shop.trainingLevel, shop.trainingCurrent, shop.trainingNext, 'doPhoneBuyTrainingCoach()')}
      ${renderUpgrade('康复团队', shop.recoveryLevel, shop.recoveryCurrent, shop.recoveryNext, 'doPhoneBuyRecoveryTeam()')}
      ${renderUpgrade('公关团队', shop.prLevel, shop.prCurrent, shop.prNext, 'doPhoneBuyPRTeam()')}
      ${renderUpgrade('经纪团队', shop.agentLevel, shop.agentCurrent, shop.agentNext, 'doPhoneBuyAgentTeam()')}
      ${renderUpgrade('数据服务', shop.analyticsLevel, shop.analyticsCurrent, shop.analyticsNext, 'doPhoneBuyAnalyticsService()')}
    </div>
    <div class="mt-16">
      <div class="fw-b mb-12">训练设施 / 媒体设施</div>
      ${(shop.facilities || []).map(it => `
        <div class="ev neu" style="margin-bottom:8px">
          <div class="flex fb">
            <span class="fw-b">${it.name}</span>
            <span class="t-2">$${phoneFmtM(it.cost)}</span>
          </div>
          <div class="t-2 fs-sm mt-12">${it.effectText || ''}</div>
          ${it.owned ? '<span class="badge b-ok mt-12">已拥有</span>' : `<button class="btn btn-gold btn-sm mt-12" onclick="doPhoneBuyFacility('${it.id}')">购入</button>`}
        </div>
      `).join('')}
    </div>
    <div class="mt-16">
      <div class="fw-b mb-12">豪宅 / 跑车 / 奢侈品</div>
      ${shop.luxury.map(it => `
        <div class="ev neu" style="margin-bottom:8px">
          <div class="flex fb">
            <span class="fw-b">${it.name}</span>
            <span class="t-2">$${phoneFmtM(it.cost)}</span>
          </div>
          <div class="t-2 fs-sm mt-12">${it.effectText || ''}</div>
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
          ${tabBtn('compose', '发声')}
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
function doPhonePostTweet(choiceId) {
  if (typeof postPlayerTweetChoice !== 'function') return;
  const res = postPlayerTweetChoice(choiceId);
  G._phoneComposeResult = { ok: !!res.ok, message: res.ok ? `发布成功：${res.impact?.label || '已生效'}` : (res.message || '发布失败') };
  if (res.ok) updateHeader();
  renderPhone();
}
function doPhoneReply(postId, choiceId) {
  if (typeof replyToSocialPostChoice !== 'function') return;
  const res = replyToSocialPostChoice(postId, choiceId);
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
function doPhoneBuyRecoveryTeam() {
  if (typeof buyRecoveryTeam !== 'function') return;
  const res = buyRecoveryTeam();
  G._phoneShopResult = { ok: !!res.ok, message: res.message || (res.ok ? '购买成功' : '购买失败') };
  updateHeader();
  renderPhone();
}
function doPhoneBuyPRTeam() {
  if (typeof buyPRTeam !== 'function') return;
  const res = buyPRTeam();
  G._phoneShopResult = { ok: !!res.ok, message: res.message || (res.ok ? '购买成功' : '购买失败') };
  updateHeader();
  renderPhone();
}
function doPhoneBuyAgentTeam() {
  if (typeof buyAgentTeam !== 'function') return;
  const res = buyAgentTeam();
  G._phoneShopResult = { ok: !!res.ok, message: res.message || (res.ok ? '购买成功' : '购买失败') };
  updateHeader();
  renderPhone();
}
function doPhoneBuyAnalyticsService() {
  if (typeof buyAnalyticsService !== 'function') return;
  const res = buyAnalyticsService();
  G._phoneShopResult = { ok: !!res.ok, message: res.message || (res.ok ? '购买成功' : '购买失败') };
  updateHeader();
  renderPhone();
}
function doPhoneBuyFacility(itemId) {
  if (typeof buyFacilityItem !== 'function') return;
  const res = buyFacilityItem(itemId);
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
  if (G._phoneGenerating) return;
  G._phoneGenerating = true;
  G._phoneFeedResult = null;
  renderPhone();
  try {
    const added = await regenerateTodaySocialTweets();
    const count = Array.isArray(added) ? added.length : 0;
    G._phoneFeedResult = { ok: true, message: `模板刷新完成：${count} 条当天舆情已更新` };
  } catch (e) {
    G._phoneFeedResult = { ok: false, message: `模板刷新失败: ${e?.message || e}` };
  } finally {
    G._phoneGenerating = false;
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
  const profile = sh.profile || {};
  const signatureShoe = typeof getSignatureShoeCurrentState === 'function' && s.signatureShoe
    ? getSignatureShoeCurrentState(s.signatureShoe) : null;
  return `
  <div class="card" style="margin-bottom:12px">
    <div class="card-title">财务概览</div>
    <div class="grid g3">
      <div class="stat-box"><div class="stat-val">$${phoneFmtM(sh.cash || 0)}</div><div class="stat-lbl">现金</div></div>
      <div class="stat-box"><div class="stat-val">${profile.privilegeLabel || '新秀观察'}</div><div class="stat-lbl">声望特权</div></div>
      <div class="stat-box"><div class="stat-val">${parseNum(s.activeCount, 0)}/${parseNum(profile.activeDealCap, 8)}</div><div class="stat-lbl">代言数</div></div>
      <div class="stat-box"><div class="stat-val">$${phoneFmtM(s.totalDailyIncome || 0)}</div><div class="stat-lbl">日常分成</div></div>
      <div class="stat-box"><div class="stat-val">$${phoneFmtM(s.totalGameIncome || 0)}</div><div class="stat-lbl">比赛日分成</div></div>
      <div class="stat-box"><div class="stat-val">${parseNum(profile.visibilityMomentum, 0).toFixed(0)}</div><div class="stat-lbl">曝光势能</div></div>
    </div>
    <div class="t-2 fs-sm mt-12">声望 ${parseNum(s.fame, 0)} | 信任 ${parseNum(s.trust, 0)} | 档位 ${s.marketLabel || '未评级'} | 人设 ${profile.commercialIdentity || '上升新贵'}</div>
    <div class="t-2 fs-sm mt-8">市场分加成 ${parseNum(profile.endorsementScoreBonus, 0)} | 热度倍率 ×${parseNum(profile.socialHeatMult, 1).toFixed(2)} | 商业机会率 ${(parseNum(profile.specialEventChance, 0.04) * 100).toFixed(1)}%</div>
  </div>
  <div class="card" style="margin-bottom:12px">
    <div class="card-title">声望特权</div>
    <div class="grid g3">
      <div class="stat-box"><div class="stat-val">${profile.privilegeLabel || '新秀观察'}</div><div class="stat-lbl">当前层级</div></div>
      <div class="stat-box"><div class="stat-val">$${phoneFmtM(profile.totalSpent || 0)}</div><div class="stat-lbl">累计投入</div></div>
      <div class="stat-box"><div class="stat-val">${parseNum(profile.activeDealCap, 8)}</div><div class="stat-lbl">代言上限</div></div>
    </div>
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:12px">
      ${(profile.perkList || []).map(text => `<span class="badge b-gold">${text}</span>`).join('') || '<span class="t-2 fs-sm">暂无已解锁特权</span>'}
    </div>
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
      <div class="ev pos endorse-active-card" style="margin-bottom:8px">
        <div class="endorse-offer-head">
          ${renderBrandLogoThumb(deal.logo, deal.brand, 'brand-logo-thumb brand-logo-thumb-lg')}
          <div class="endorse-offer-main">
            <div class="fw-b">${deal.brand}</div>
            <div class="t-2 fs-xs">${deal.category} · ${deal.product}</div>
          </div>
          <span class="badge b-ok">生效中</span>
        </div>
        <div class="t-2 fs-sm mt-8">剩余 ${parseNum(deal.remainingDays, 0)} 天 | 实时收入 $${phoneFmtM(deal.totalIncome)} | 累计 $${phoneFmtM(deal.earned)}</div>
      </div>`).join('')}
  </div>` : ''}
  <div class="card" style="margin-bottom:12px">
    <div class="card-title">团队</div>
    <div class="t-2 fs-sm">体能教练：${sh.staminaCurrent?.name || '未聘请'} (Lv.${sh.staminaLevel || 0})</div>
    <div class="t-2 fs-sm">训练教练：${sh.trainingCurrent?.name || '未聘请'} (Lv.${sh.trainingLevel || 0})</div>
    <div class="t-2 fs-sm">康复团队：${sh.recoveryCurrent?.name || '未聘请'} (Lv.${sh.recoveryLevel || 0})</div>
    <div class="t-2 fs-sm">公关团队：${sh.prCurrent?.name || '未聘请'} (Lv.${sh.prLevel || 0})</div>
    <div class="t-2 fs-sm">经纪团队：${sh.agentCurrent?.name || '未聘请'} (Lv.${sh.agentLevel || 0})</div>
    <div class="t-2 fs-sm">数据服务：${sh.analyticsCurrent?.name || '未订阅'} (Lv.${sh.analyticsLevel || 0})</div>
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
      <div class="ev endorse-offer-card ${offer.status === 'active' ? 'pos' : offer.status === 'locked' ? 'neu' : 'neu'}" style="margin-bottom:8px;opacity:${offer.status === 'locked' ? 0.78 : 1}">
        <div class="endorse-offer-head">
          ${renderBrandLogoThumb(offer.logo, offer.brand, 'brand-logo-thumb brand-logo-thumb-lg')}
          <div class="endorse-offer-main">
            <div class="fw-b">${offer.brand}</div>
            <div class="t-2 fs-xs">${offer.product} · ${offer.category}</div>
          </div>
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
      <div class="stat-box"><div class="stat-val">${s.marketLabel || '未评级'}</div><div class="stat-lbl">市场档位</div></div>
      <div class="stat-box"><div class="stat-val">${s.fameTierLabel || '新秀观察'}</div><div class="stat-lbl">声望特权</div></div>
      <div class="stat-box"><div class="stat-val">${s.activeCount || 0}/${s.maxActiveDeals || 8}</div><div class="stat-lbl">已签约</div></div>
      <div class="stat-box"><div class="stat-val">${s.availableCount || 0}</div><div class="stat-lbl">可签约</div></div>
    </div>
    <div class="t-2 fs-sm mt-12">声望 ${parseNum(s.fame, 0)} | 信任 ${parseNum(s.trust, 0)} | 荣誉分 ${parseNum(s.honorScore, 0)} | 人设 ${s.commercialIdentity || '上升新贵'}</div>
    <div class="t-2 fs-sm mt-8">曝光势能 ${parseNum(s.visibilityMomentum, 0).toFixed(0)} | 热度倍率 ×${parseNum(s.socialHeatMult, 1).toFixed(2)} | 商业机会率 ${(parseNum(s.specialEventChance, 0.04) * 100).toFixed(1)}%</div>
  </div>
  <div class="card" style="margin-bottom:12px">
    <div class="card-title">50 个代言品牌池</div>
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">
      ${(s.perkList || []).map(text => `<span class="badge b-gold">${text}</span>`).join('')}
    </div>
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
  const profile = shop.profile || {};
  const renderUpgrade = (title, level, current, next, onclick) => `
    <div class="ev neu" style="margin-bottom:8px">
      <div class="flex fb">
        <span class="fw-b">${title} Lv.${parseNum(level, 0)}</span>
        <span class="badge b-pri">${current?.name || '未启用'}</span>
      </div>
      <div class="t-2 fs-sm mt-12">${typeof buildEconomyEffectSummary === 'function' ? buildEconomyEffectSummary(current || {}) : ''}</div>
      ${next ? `<button class="btn btn-pri btn-sm mt-12" onclick="${onclick}">升级到 ${next.name}（$${phoneFmtM(next.cost)}）</button>` : '<div class="t-2 fs-sm mt-12">已满级</div>'}
    </div>`;
  return `
  <div class="card" style="margin-bottom:12px">
    <div class="card-title">团队升级与设施</div>
    ${purchaseMsg}
    <div class="grid g3">
      <div class="stat-box"><div class="stat-val">$${phoneFmtM(shop.cash)}</div><div class="stat-lbl">现金</div></div>
      <div class="stat-box"><div class="stat-val">${profile.privilegeLabel || '新秀观察'}</div><div class="stat-lbl">声望特权</div></div>
      <div class="stat-box"><div class="stat-val">${parseNum(profile.visibilityMomentum, 0).toFixed(0)}</div><div class="stat-lbl">曝光势能</div></div>
    </div>
    <div class="mt-16">
      <div class="fw-b mb-12">核心团队</div>
      ${renderUpgrade('体能教练', shop.staminaLevel, shop.staminaCurrent, shop.staminaNext, 'doCommerceBuyStamina()')}
      ${renderUpgrade('训练教练', shop.trainingLevel, shop.trainingCurrent, shop.trainingNext, 'doCommerceBuyTraining()')}
      ${renderUpgrade('康复团队', shop.recoveryLevel, shop.recoveryCurrent, shop.recoveryNext, 'doCommerceBuyRecovery()')}
      ${renderUpgrade('公关团队', shop.prLevel, shop.prCurrent, shop.prNext, 'doCommerceBuyPR()')}
      ${renderUpgrade('经纪团队', shop.agentLevel, shop.agentCurrent, shop.agentNext, 'doCommerceBuyAgent()')}
      ${renderUpgrade('数据服务', shop.analyticsLevel, shop.analyticsCurrent, shop.analyticsNext, 'doCommerceBuyAnalytics()')}
    </div>
  </div>
  <div class="card" style="margin-bottom:12px">
    <div class="card-title">设施资产</div>
    ${(shop.facilities || []).map(it => `
      <div class="ev neu" style="margin-bottom:8px">
        <div class="flex fb">
          <span class="fw-b">${it.name}</span>
          <span class="t-2">$${phoneFmtM(it.cost)}</span>
        </div>
        <div class="t-2 fs-sm mt-12">${it.effectText || ''}</div>
        ${it.owned ? '<span class="badge b-ok mt-12">已拥有</span>' : `<button class="btn btn-gold btn-sm mt-12" onclick="doCommerceBuyFacility('${it.id}')">购入</button>`}
      </div>
    `).join('')}
  </div>
  <div class="card" style="margin-bottom:12px">
    <div class="card-title">奢侈品</div>
    ${shop.luxury.map(it => `
      <div class="ev neu" style="margin-bottom:8px">
        <div class="flex fb">
          <span class="fw-b">${it.name}</span>
          <span class="t-2">$${phoneFmtM(it.cost)}</span>
        </div>
        <div class="t-2 fs-sm mt-12">${it.effectText || ''}</div>
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
        <button class="btn btn-cyan" onclick="doCommerceGenShoeImage('${cid}')">🎨 生成/更新球鞋图片</button>
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
function doCommerceBuyRecovery() {
  if (typeof buyRecoveryTeam !== 'function') return;
  const res = buyRecoveryTeam();
  G._commerceAssetResult = { ok: !!res.ok, message: res.message || (res.ok ? '购买成功' : '购买失败') };
  updateHeader();
  renderCommerce();
}
function doCommerceBuyPR() {
  if (typeof buyPRTeam !== 'function') return;
  const res = buyPRTeam();
  G._commerceAssetResult = { ok: !!res.ok, message: res.message || (res.ok ? '购买成功' : '购买失败') };
  updateHeader();
  renderCommerce();
}
function doCommerceBuyAgent() {
  if (typeof buyAgentTeam !== 'function') return;
  const res = buyAgentTeam();
  G._commerceAssetResult = { ok: !!res.ok, message: res.message || (res.ok ? '购买成功' : '购买失败') };
  updateHeader();
  renderCommerce();
}
function doCommerceBuyAnalytics() {
  if (typeof buyAnalyticsService !== 'function') return;
  const res = buyAnalyticsService();
  G._commerceAssetResult = { ok: !!res.ok, message: res.message || (res.ok ? '购买成功' : '购买失败') };
  updateHeader();
  renderCommerce();
}
function doCommerceBuyFacility(itemId) {
  if (typeof buyFacilityItem !== 'function') return;
  const res = buyFacilityItem(itemId);
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
  G._commerceShoeResult = { ok: true, message: '正在生成图片...' };
  renderCommerce();
  try {
    // SVG image generation
    const res = await generateSignatureShoeImageForOffer(contractId);
    G._commerceShoeResult = { ok: !!res.ok, message: res.message || (res.ok ? '图片已生成' : '生成失败') };
  } catch (e) {
    G._commerceShoeResult = { ok: false, message: `生成失败：${e?.message || e}` };
  }
  renderCommerce();
}

function renderRegularSeasonAction() {
  const container = $('homeActionContainer');
  if (!container) return;
  if (!G.gameDays || G.gameDays.length === 0) generateGameDays();

  const isToday = isGameDay(G.dayNum);
  const nextGameDayNum = getNextGameDay();
  const daysToGame = nextGameDayNum >= 0 ? Math.max(0, nextGameDayNum - G.dayNum) : 0;
  const staminaStatus = getStaminaStatus(G.player.stamina);
  const injured = !!G.player?.injury?.active;
  const cash = parseNum(G.player?.cash, 0);
  const latest = (G._latestDayResult && parseNum(G._latestDayResult.day, -99) === parseNum(G.dayNum, 0) - 1) ? G._latestDayResult : null;
  const simBusy = !!G._simulatingDay;
  const game = G.schedule[G.gameNum];
  const opp = getTeam(game?.opp);
  const fatigueCtx = isToday && typeof buildScheduleFatigueContext === 'function'
    ? buildScheduleFatigueContext({ teamId: G.teamId, home: !!game?.home, roundIndex: G.gameNum, phase: 'regular', userTeamId: G.teamId })
    : null;
  const latestSummary = latest
    ? (latest.isGame
      ? `上一场${latest.win ? '赢球' : '输球'}，你交出 ${parseNum(latest.pts, 0)} 分 ${parseNum(latest.reb, 0)} 板 ${parseNum(latest.ast, 0)} 助。`
      : `上一日已完成推进，账户现金 $${phoneFmtM(cash)}。`)
    : '故事线刚刚开始，今天会决定新的节奏。';
  const staminaMeta = `${staminaStatus.icon} ${staminaStatus.name} · 体能 ${parseNum(G.player.stamina, 100)}%`;
  const injuryMeta = injured ? `伤病管理：${G.player.injury.name || '受伤'}，建议保守处理负荷。` : '身体状态允许正常参与比赛与训练。';

  let html = '';
  if (isToday) {
    const effortMode = G._effortMode || 'normal';
    html = `
      <div class="home-phase-stack">
        <div class="home-phase-bar home-phase-match">
          <div class="home-phase-copy">
            <div class="home-phase-kicker">Game Night</div>
            <div class="home-phase-title">第 ${G.gameNum + 1} 场常规赛 vs ${opp?.z || '对手'}</div>
            <div class="home-phase-note">
              ${game?.home ? '主场作战' : '客场作战'}${fatigueCtx ? ` · ${fatigueCtx.summary}` : ''} · ${staminaMeta}<br>
              ${injuryMeta}<br>
              ${latestSummary}
            </div>
          </div>
          <div class="home-phase-controls">
            <select id="effortSel" class="home-select" onchange="G._effortMode=this.value">
              <option value="slack" ${effortMode === 'slack' ? 'selected' : ''}>保留体能</option>
              <option value="normal" ${effortMode === 'normal' ? 'selected' : ''}>标准负荷</option>
              <option value="hard" ${effortMode === 'hard' ? 'selected' : ''}>全力冲击</option>
            </select>
            <button class="btn btn-gold home-phase-btn" ${simBusy ? 'disabled' : ''} onclick="G._effortMode=$('effortSel').value; doSimulateDay()">
              ${simBusy ? '处理中...' : '开始比赛'}
            </button>
          </div>
        </div>
        ${renderPregamePlanPicker(game, opp)}
      </div>
    `;
  } else {
    const restLabel = nextGameDayNum >= 0
      ? `距离下一战还有 ${daysToGame} 天`
      : '当前没有后续比赛日程';
    html = `
      <div class="home-phase-bar home-phase-rest">
        <div class="home-phase-copy">
          <div class="home-phase-kicker">Recovery Window</div>
          <div class="home-phase-title">${restLabel}</div>
          <div class="home-phase-note">
            ${staminaMeta} · ${injured ? `恢复重点：${G.player.injury.name || '伤病处理'}` : '今天适合恢复、训练和经营外部关系。'}<br>
            账户现金 $${phoneFmtM(cash)} · ${latestSummary}
          </div>
        </div>
        <div class="home-phase-controls">
          <button class="btn btn-pri home-phase-btn" ${simBusy ? 'disabled' : ''} onclick="doSimulateDay()">
            ${simBusy ? '处理中...' : '推进日程'}
          </button>
        </div>
      </div>
    `;
  }
  container.innerHTML = typeof stripUndefinedTokens === 'function' ? stripUndefinedTokens(html) : html;
}

function renderPhone() {
  if (typeof ensureSocialState === 'function') ensureSocialState();
  if (typeof ensureEconomyState === 'function') ensureEconomyState();
  const pg = $('phonePage');
  const tab = getPhoneTab();
  const tabMap = {
    feed: { label: '舆情流', note: '联盟舆论、球星互动和赛后热度都会在这里汇合。' },
    compose: { label: '主动发声', note: '这里决定你的人设风格，也会直接反作用到声望、信任和关系线。' },
    inbox: { label: '通讯记录', note: '球队消息、系统提醒和关键来信都沉淀在这里。' }
  };
  const tabBtn = (id) => `<button class="page-tab ${tab === id ? 'active' : ''}" onclick="setPhoneTab('${id}')">${tabMap[id]?.label || id}</button>`;
  let content = '';
  if (tab === 'feed') content = renderPhoneFeedTab();
  else if (tab === 'compose') content = renderPhoneComposeTab();
  else content = renderPhoneInboxTab();

  const posts = Array.isArray(G.social?.posts) ? G.social.posts : [];
  const todayPosts = posts.filter(post => parseNum(post?.day, -999) === parseNum(G.dayNum, 0)).length;
  const inboxCount = Array.isArray(G.phone) ? G.phone.length : 0;
  const relationView = typeof buildSocialRelationshipFeedView === 'function'
    ? buildSocialRelationshipFeedView(4)
    : { friendCount: 0, rivalCount: 0, respectCount: 0 };
  const playerPostCount = posts.filter(post => !!post?.isPlayer && parseNum(post?.day, -999) === parseNum(G.dayNum, 0)).length;
  const pendingTradeBanner = G.pendingTrade ? `
    <div class="ev neu" style="margin:0">
      <div class="fw-b">${G.pendingTrade.team.z} 发来交易邀请</div>
      <div class="t-2 fs-sm mt-12">送出：${G.pendingTrade.player.name}（${G.pendingTrade.player.rating}）</div>
      <div class="grid g2 mt-12">
        <button class="btn btn-gold btn-sm" onclick="doAcceptTradeOffer()">接受</button>
        <button class="btn btn-no btn-sm" onclick="doRejectTradeOffer()">拒绝</button>
      </div>
    </div>` : '';
  const statCard = (label, value) => `
    <div class="subpage-stat-card">
      <div class="subpage-stat-label">${label}</div>
      <div class="subpage-stat-value">${value}</div>
    </div>`;
  const sideStat = (label, value) => `
    <div class="terminal-stat">
      <div class="terminal-stat-label">${label}</div>
      <div class="terminal-stat-value">${value}</div>
    </div>`;

  pg.innerHTML = `
    <div class="subpage-shell">
      <section class="subpage-hero">
        <div>
          <div class="subpage-kicker">Social Command</div>
          <div class="subpage-title">社媒作战终端</div>
          <div class="subpage-copy">这里现在只负责社媒与通讯。推文、回复、球星关系和消息流在这一页独立处理，商业与设置已经拆到各自页面。</div>
        </div>
        <div class="subpage-stat-grid">
          ${statCard('今日舆情', `${todayPosts} 条`)}
          ${statCard('朋友 / 宿敌', `${parseNum(relationView.friendCount, 0)} / ${parseNum(relationView.rivalCount, 0)}`)}
          ${statCard('消息盒', `${inboxCount} 条`)}
          ${statCard('球星尊重', parseNum(relationView.respectCount, 0))}
        </div>
      </section>
      <div class="terminal-shell">
        <aside class="terminal-sidebar">
          <div class="terminal-brand">
            <div class="terminal-kicker">Broadcast Desk</div>
            <div class="terminal-title">${tabMap[tab]?.label || '社媒终端'}</div>
            <div class="terminal-copy">${tabMap[tab]?.note || ''}</div>
          </div>
          <div class="terminal-stat-grid">
            ${sideStat('日期', getDayDateString(Math.max(0, G.dayNum - 1)))}
            ${sideStat('今日发声', `${playerPostCount} 条`)}
            ${sideStat('消息盒', `${inboxCount} 条`)}
            ${sideStat('球星尊重', parseNum(relationView.respectCount, 0))}
          </div>
          ${pendingTradeBanner}
          <div class="terminal-note">当前账号会把你的采访、主动发声和回复球星全部写入长期舆论。商业合作请去商业中心。</div>
        </aside>
        <section class="terminal-screen">
          <div class="terminal-toolbar">
            <div>
              <div class="fw-b">${tabMap[tab]?.label || '社媒终端'}</div>
              <div class="terminal-toolbar-meta">赛季 S${G.season} · Day ${G.dayNum + 1} · 社媒与通讯分离视图</div>
            </div>
            <div class="page-tabbar">
              ${tabBtn('feed')}
              ${tabBtn('compose')}
              ${tabBtn('inbox')}
            </div>
          </div>
          <div class="terminal-content terminal-scroll">${content}</div>
        </section>
      </div>
    </div>`;
}

function renderCommerce() {
  if (typeof ensureEconomyState === 'function') ensureEconomyState();
  if (typeof ensureSocialState === 'function') ensureSocialState();
  const pg = $('commercePage');
  const tab = _commerceTab;
  const tabMap = {
    overview: { label: '总览', note: '查看你当前的商业位置、特权层级和收入流。' },
    endorse: { label: '代言', note: '品牌池、签约条件和签名鞋入口全部汇总在这里。' },
    shoe: { label: '签名鞋', note: '从球鞋外观、收益到属性分配，都应该像游戏装备库。' },
    assets: { label: '资产', note: '团队升级、设施投入和消费型资产都会改变成长节奏。' },
    logs: { label: '动态', note: '追踪最近的商业事件、财务流水和曝光变化。' }
  };
  const tabBtn = (id) => `<button class="page-tab ${tab === id ? 'active' : ''}" onclick="setCommerceTab('${id}')">${tabMap[id]?.label || id}</button>`;
  let content = '';
  if (tab === 'overview') content = renderCommerceOverview();
  else if (tab === 'endorse') content = renderCommerceEndorse();
  else if (tab === 'assets') content = renderCommerceAssets();
  else if (tab === 'shoe') content = renderCommerceShoe();
  else content = renderCommerceLogs();

  const shop = typeof buildEconomyShopView === 'function' ? buildEconomyShopView() : null;
  const endorseView = typeof buildEndorsementOffersView === 'function' ? buildEndorsementOffersView() : null;
  const profile = shop?.profile || {};
  const summary = endorseView?.summary || {};
  const statCard = (label, value) => `
    <div class="subpage-stat-card">
      <div class="subpage-stat-label">${label}</div>
      <div class="subpage-stat-value">${value}</div>
    </div>`;
  const sideStat = (label, value) => `
    <div class="terminal-stat">
      <div class="terminal-stat-label">${label}</div>
      <div class="terminal-stat-value">${value}</div>
    </div>`;
  const perkHtml = (profile.perkList || []).length
    ? (profile.perkList || []).map(text => `<span class="badge b-gold">${text}</span>`).join('')
    : '<span class="badge b-pri">尚未解锁额外特权</span>';

  pg.innerHTML = `
    <div class="subpage-shell">
      <section class="subpage-hero">
        <div>
          <div class="subpage-kicker">Commercial Command</div>
          <div class="subpage-title">商业指挥台</div>
          <div class="subpage-copy">金钱、声望和品牌不再只是附属面板。它们现在会决定你的代言上限、舆论放大器、签名鞋收益和设施成长速度。</div>
        </div>
        <div class="subpage-stat-grid">
          ${statCard('现金', `$${phoneFmtM(shop?.cash || 0)}`)}
          ${statCard('声望特权', profile.privilegeLabel || '新秀观察')}
          ${statCard('活跃代言', `${parseNum(summary.activeCount, 0)} / ${parseNum(profile.activeDealCap, 8)}`)}
          ${statCard('曝光势能', parseNum(profile.visibilityMomentum, 0).toFixed(0))}
        </div>
      </section>
      <div class="terminal-shell">
        <aside class="terminal-sidebar">
          <div class="terminal-brand">
            <div class="terminal-kicker">Brand Operations</div>
            <div class="terminal-title">${tabMap[tab]?.label || '商业指挥台'}</div>
            <div class="terminal-copy">${tabMap[tab]?.note || ''}</div>
          </div>
          <div class="terminal-stat-grid">
            ${sideStat('日常分成', `$${phoneFmtM(summary.totalDailyIncome || 0)}`)}
            ${sideStat('比赛日分成', `$${phoneFmtM(summary.totalGameIncome || 0)}`)}
            ${sideStat('商业人设', profile.commercialIdentity || '上升新贵')}
            ${sideStat('累计投入', `$${phoneFmtM(profile.totalSpent || 0)}`)}
          </div>
          <div class="terminal-note">
            <div class="fw-b mb-8">已解锁特权</div>
            <div style="display:flex;flex-wrap:wrap;gap:6px">${perkHtml}</div>
          </div>
        </aside>
        <section class="terminal-screen">
          <div class="terminal-toolbar">
            <div>
              <div class="fw-b">${tabMap[tab]?.label || '商业指挥台'}</div>
              <div class="terminal-toolbar-meta">声望 ${parseNum(summary.fame, 0)} · 信任 ${parseNum(summary.trust, 0)} · 商业机会率 ${(parseNum(profile.specialEventChance, 0.04) * 100).toFixed(1)}%</div>
            </div>
            <div class="page-tabbar">
              ${tabBtn('overview')}
              ${tabBtn('endorse')}
              ${tabBtn('shoe')}
              ${tabBtn('assets')}
              ${tabBtn('logs')}
            </div>
          </div>
          <div class="terminal-content terminal-scroll">${content}</div>
        </section>
      </div>
    </div>`;
}

function renderSettings() {
  if (typeof ensureSocialState === 'function') ensureSocialState();
  const pg = $('settingsPage');
  const statCard = (label, value) => `
    <div class="subpage-stat-card">
      <div class="subpage-stat-label">${label}</div>
      <div class="subpage-stat-value">${value}</div>
    </div>`;
  const sideStat = (label, value) => `
    <div class="terminal-stat">
      <div class="terminal-stat-label">${label}</div>
      <div class="terminal-stat-value">${value}</div>
    </div>`;
  pg.innerHTML = `
    <div class="subpage-shell">
      <section class="subpage-hero">
        <div>
          <div class="subpage-kicker">System Control</div>
          <div class="subpage-title">设置</div>
          <div class="subpage-copy">系统设置与导航。商业功能在商业中心，存档管理固定在最底部的存档页。</div>
        </div>
        <div class="subpage-stat-grid">
          ${statCard('剧情引擎', '本地')}
          ${statCard('推文生成', '本地')}
          ${statCard('图片生成', '本地')}
        </div>
      </section>
      <div class="terminal-shell">
        <aside class="terminal-sidebar">
          <div class="terminal-brand">
            <div class="terminal-kicker">Control Deck</div>
            <div class="terminal-title">系统设置</div>
            <div class="terminal-copy">所有内容均由本地引擎生成，无需外部 API。</div>
          </div>
          <div class="terminal-stat-grid">
            ${sideStat('存档页', '最底部')}
          </div>
          <div class="terminal-note">
            <div class="fw-b mb-8">页面分工</div>
            <div class="t-2 fs-sm">手机页保留社媒与消息。</div>
            <div class="t-2 fs-sm mt-8">商业中心负责代言、签名鞋、资产和消费。</div>
            <div class="t-2 fs-sm mt-8">存档管理固定放在导航最底部。</div>
          </div>
        </aside>
        <section class="terminal-screen">
          <div class="terminal-toolbar">
            <div>
              <div class="fw-b">系统说明</div>
              <div class="terminal-toolbar-meta">所有游戏内容由本地引擎生成，无需联网或配置 API。</div>
            </div>
          </div>
          <div class="terminal-content terminal-scroll">
            <div style="display:grid;gap:14px">
              <div class="card" style="margin:0">
                <div class="card-title">本地模式</div>
                <div class="t-2 fs-sm">剧情、战报、推文等均由本地文本池和规则引擎生成。</div>
                <div class="t-2 fs-sm mt-8">无需 API Key，无需联网，零延迟。</div>
                <div class="grid g2 mt-16">
                  <button class="btn btn-pri" onclick="navTo('commerce')">前往商业中心</button>
                  <button class="btn btn-s" onclick="navTo('save')">前往存档页</button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>`;
}

// ============ AUTO CAREER UI OVERRIDES ============
function applyAutoCareerNavigation() {
  const setCopy = (page, title, sub) => {
    const btn = document.querySelector(`.nav-btn[data-p="${page}"]`);
    if (!btn) return;
    const titleEl = btn.querySelector('.nav-btn-title');
    const subEl = btn.querySelector('.nav-btn-sub');
    if (titleEl) titleEl.textContent = title;
    if (subEl) subEl.textContent = sub;
  };
  setCopy('home', '周报', '驾驶舱');
  setCopy('upgrade', '成长', '自动');
  setCopy('trade', '交易', '只读');
  setCopy('phone', '社媒', '只读');
  setCopy('commerce', '商业', '自动');
  setCopy('awards', '荣誉', '档案');
  setCopy('history', '百大', '历史');
  setCopy('settings', '设置', 'LLM');
}

function renderAutoText(value) {
  if (Array.isArray(value)) return value.map(renderAutoText).join('');
  const text = String(value || '').trim();
  if (!text) return '<div class="t-2 fs-sm">暂无</div>';
  return `<div class="auto-text-block">${text.replace(/\n+/g, '<br>')}</div>`;
}

function renderAutoReportCard(entry = null) {
  const report = entry?.report || null;
  if (!report) {
    return `
      <section class="card home-panel auto-week-report">
        <div class="card-title home-section-title">LLM 周报</div>
        <div class="home-empty">还没有周报。配置 LLM 后点击“模拟下一周”。</div>
      </section>`;
  }
  return `
    <section class="card home-panel auto-week-report">
      <div class="card-title home-section-title">LLM 周报 · Week ${parseNum(entry.weekIndex, 0)}</div>
      <div class="auto-report-headline">${report.headline}</div>
      ${renderAutoText(report.weeklyStory)}
      <div class="auto-report-grid">
        <div><div class="fw-b">联盟</div>${renderAutoText(report.leagueNotes)}</div>
        <div><div class="fw-b">交易</div>${renderAutoText(report.tradeNotes)}</div>
        <div><div class="fw-b">商业</div>${renderAutoText(report.endorsementNotes)}</div>
        <div><div class="fw-b">历史排名</div>${renderAutoText(report.rankNarrative)}</div>
      </div>
      <div class="auto-player-arc">${renderAutoText(report.playerArc)}</div>
    </section>`;
}

function renderAutoWeeklyFacts() {
  const ranking = typeof updateLiveHistoricalRanking === 'function' ? updateLiveHistoricalRanking() : null;
  const last = G.autoCareer?.weeklyReports?.[0] || null;
  const weekGames = last?.facts?.week?.games || [];
  const decisions = (G.autoCareer?.autoDecisionLog || []).slice(0, 8);
  const gaps = ranking?.gaps || {};
  return `
    <section class="card home-panel auto-week-facts">
      <div class="card-title home-section-title">本周事实包</div>
      <div class="auto-rank-strip">
        <div><span>实时百大</span><b>#${ranking?.userRank || '--'}</b></div>
        <div><span>Legacy</span><b>${ranking?.liveEntry?.legacyScore || '--'}</b></div>
        <div><span>距第10</span><b>${gaps.rank10 ?? '--'}</b></div>
        <div><span>距第100</span><b>${gaps.rank100 ?? '--'}</b></div>
      </div>
      ${weekGames.length ? `<div class="auto-list mt-12">${weekGames.map(g => `
        <div class="auto-list-row">
          <div><b>${g.win ? '胜' : '负'} ${g.opponent}</b><span>${g.score}</span></div>
          <div>${g.line.pts}分 ${g.line.reb}板 ${g.line.ast}助 · ${g.line.grade || '--'}</div>
        </div>`).join('')}</div>` : '<div class="home-empty mt-12">最近一周还没有比赛事实。</div>'}
      <div class="auto-list mt-12">
        ${decisions.length ? decisions.map(d => `<div class="auto-list-row"><div><b>${d.type}</b><span>S${d.season} D${d.day}</span></div><div>${d.text}</div></div>`).join('') : '<div class="home-empty">暂无自动决策记录</div>'}
      </div>
    </section>`;
}

function renderRegularSeasonAction() {
  const container = $('homeActionContainer');
  if (!container) return;
  if (typeof ensureAutoCareerState === 'function') ensureAutoCareerState();
  if (!G.gameDays || G.gameDays.length === 0) generateGameDays();
  const status = typeof getAutoCareerLLMConfigStatus === 'function'
    ? getAutoCareerLLMConfigStatus()
    : { ok: false, model: '', baseURL: '', hasApiKey: false };
  const ranking = typeof updateLiveHistoricalRanking === 'function' ? updateLiveHistoricalRanking() : null;
  const nextGameDayNum = typeof getNextGameDay === 'function' ? getNextGameDay() : -1;
  const daysToGame = nextGameDayNum >= 0 ? Math.max(0, nextGameDayNum - G.dayNum) : 0;
  const busy = !!G._simulatingWeek;
  const latestError = G.autoCareer?.lastError?.message || '';
  container.innerHTML = `
    <div class="auto-week-dashboard">
      <div class="auto-week-kicker">AUTO CAREER</div>
      <div class="auto-week-title">全自动周推进</div>
      <div class="auto-week-note">
        Week ${parseNum(G.autoCareer?.weekIndex, 0) + 1} · 第 ${G.dayNum + 1} 天 · ${nextGameDayNum >= 0 ? `距下一场 ${daysToGame} 天` : '等待赛季节点'}<br>
        LLM：${status.ok ? `${status.model || '已配置'} / ${status.hasApiKey ? 'Key 已保存' : 'Key 缺失'}` : '未配置，不能提交本周'}<br>
        历史百大实时排名：#${ranking?.userRank || '--'} · Legacy ${ranking?.liveEntry?.legacyScore || '--'}
      </div>
      ${latestError ? `<div class="auto-week-error">${latestError}</div>` : ''}
      <button class="btn btn-gold home-phase-btn auto-week-button" ${busy ? 'disabled' : ''} onclick="doSimulateCareerWeek()">
        ${busy ? 'LLM 周报生成中...' : '模拟下一周'}
      </button>
      <button class="btn btn-pri btn-sm auto-week-settings" onclick="openAutoCareerLLMSettingsModal()">LLM / 历史档案设置</button>
    </div>`;
}

async function doSimulateCareerWeek() {
  if (G._simulatingWeek) return;
  if (typeof ensureAutoCareerState === 'function') ensureAutoCareerState();
  renderHome();
  const result = typeof simulateCareerWeek === 'function'
    ? await simulateCareerWeek()
    : { ok: false, message: '自动生涯模拟函数未加载' };
  updateHeader();
  if (result.ok) {
    renderHome();
    if ($('statsPage')?.classList.contains('active')) renderStats();
    if ($('matchesPage')?.classList.contains('active')) renderMatchCenter();
    if ($('commercePage')?.classList.contains('active')) renderCommerce();
    if ($('tradePage')?.classList.contains('active')) renderTrade();
    if ($('historyPage')?.classList.contains('active')) renderHistory();
    return;
  }
  renderHome();
  showModal(`
    <div class="modal-hd"><h3>本周未提交</h3><button class="modal-x" onclick="hideModal()">×</button></div>
    <div class="t-2 mb-16">${result.message || 'LLM 调用失败，模拟已回滚。'}</div>
    <div class="grid g2">
      <button class="btn btn-gold" onclick="hideModal();doSimulateCareerWeek()">重试本周</button>
      <button class="btn btn-pri" onclick="hideModal();openAutoCareerLLMSettingsModal()">检查 LLM 设置</button>
    </div>
  `);
}

function renderUpgrade() {
  if (typeof ensureAutoCareerState === 'function') ensureAutoCareerState();
  const p = G.player;
  const ledger = G.autoCareer?.developmentLedger || {};
  const currentOvr = typeof ovr === 'function' ? ovr(p.attrs || {}) : parseNum(p.rating, 70);
  const target = typeof getAutoUserAnnualOvrTarget === 'function' ? getAutoUserAnnualOvrTarget() : 0;
  const badgeBonuses = typeof getBadgeAttrBonuses === 'function' ? getBadgeAttrBonuses(p) : {};
  const radarValues = ATTRS.map(a => Math.min(parseNum(p.attrs[a.k], 50) + Math.round(parseNum(badgeBonuses[a.k], 0)), 99));
  const radarSVG = typeof buildRadarSVG === 'function' ? buildRadarSVG(radarValues, ATTRS.map(a => a.n)) : '';
  $('upgradePage').innerHTML = `
    <div class="subpage-shell">
      <section class="subpage-hero">
        <div>
          <div class="subpage-kicker">Auto Development</div>
          <div class="subpage-title">自动成长档案</div>
          <div class="subpage-copy">手动 XP 加点已关闭。属性会按年龄、潜力、当前 OVR 和赛季阶段自动增长或衰退。</div>
        </div>
        <div class="subpage-stat-grid">
          <div class="subpage-stat-card"><div class="subpage-stat-label">OVR</div><div class="subpage-stat-value">${currentOvr}</div></div>
          <div class="subpage-stat-card"><div class="subpage-stat-label">POT</div><div class="subpage-stat-value">${parseNum(p.potential, 0)}</div></div>
          <div class="subpage-stat-card"><div class="subpage-stat-label">年度趋势</div><div class="subpage-stat-value">${target >= 0 ? '+' : ''}${target}</div></div>
          <div class="subpage-stat-card"><div class="subpage-stat-label">周累计</div><div class="subpage-stat-value">${parseNum(ledger.carry, 0).toFixed(2)}</div></div>
        </div>
      </section>
      ${radarSVG ? `<div class="card" style="text-align:center"><div class="card-title">属性雷达图</div>${radarSVG}</div>` : ''}
      <div class="card">
        <div class="card-title">属性明细</div>
        <div class="auto-attr-grid">
          ${ATTRS.map(at => {
            const v = parseNum(p.attrs?.[at.k], 50);
            const bonus = Math.round(parseNum(badgeBonuses[at.k], 0));
            return `<div class="auto-attr-row"><span>${at.n}</span><div class="bar"><div class="bar-fill ${barClass(v + bonus)}" style="width:${clamp(v + bonus, 0, 99)}%"></div></div><b>${v}${bonus > 0 ? `(+${bonus})` : ''}</b></div>`;
          }).join('')}
        </div>
      </div>
      <div class="card">
        <div class="card-title">自动成长日志</div>
        ${(G.autoCareer?.autoDecisionLog || []).filter(x => x.type === 'development').slice(0, 12).map(x => `<div class="ev neu"><b>S${x.season} D${x.day}</b><div class="t-2 fs-sm mt-8">${x.text}</div></div>`).join('') || '<div class="t-2">暂无成长变动。</div>'}
      </div>
    </div>`;
}

function renderTrade() {
  if (typeof recalcPlayerTradeValue === 'function') recalcPlayerTradeValue();
  const tradeLog = (G.aiTradeLog || []).slice(-20).reverse();
  const decisions = (G.autoCareer?.autoDecisionLog || []).filter(x => x.type === 'trade').slice(0, 12);
  $('tradePage').innerHTML = `
    <div class="subpage-shell">
      <section class="subpage-hero">
        <div>
          <div class="subpage-kicker">Trade Desk</div>
          <div class="subpage-title">交易观察台</div>
          <div class="subpage-copy">主动交易请求已关闭。管理层询价、AI 交易和你的去留判断会在周模拟中自动完成。</div>
        </div>
        <div class="subpage-stat-grid">
          <div class="subpage-stat-card"><div class="subpage-stat-label">当前球队</div><div class="subpage-stat-value">${G.team?.a || '--'}</div></div>
          <div class="subpage-stat-card"><div class="subpage-stat-label">交易价值</div><div class="subpage-stat-value">${G.player.tradeValue || '--'}</div></div>
          <div class="subpage-stat-card"><div class="subpage-stat-label">截止日</div><div class="subpage-stat-value">D${G.tradeDeadline}</div></div>
        </div>
      </section>
      <div class="grid g2">
        <div class="card">
          <div class="card-title">自动去留决策</div>
          ${decisions.length ? decisions.map(d => `<div class="ev neu"><b>S${d.season} D${d.day}</b><div class="t-2 fs-sm mt-8">${d.text}</div></div>`).join('') : '<div class="t-2">暂无涉及玩家的交易决策。</div>'}
        </div>
        <div class="card">
          <div class="card-title">联盟交易流</div>
          ${tradeLog.length ? tradeLog.map(t => `<div class="ev neu"><b>S${t.season} D${t.day}</b><div class="t-2 fs-sm mt-8">${teamNameFallback(t.fromTeamId)} ↔ ${teamNameFallback(t.toTeamId)} · ${(t.players || []).join(' / ')}</div></div>`).join('') : '<div class="t-2">暂无联盟交易。</div>'}
        </div>
      </div>
    </div>`;
}

function renderPhone() {
  if (typeof ensureSocialState === 'function') ensureSocialState();
  const pg = $('phonePage');
  const posts = typeof getSocialTimeline === 'function' ? getSocialTimeline(30) : (G.social?.posts || []).slice(0, 30);
  const inbox = Array.isArray(G.phone) ? G.phone.slice(0, 30) : [];
  pg.innerHTML = `
    <div class="subpage-shell">
      <section class="subpage-hero">
        <div>
          <div class="subpage-kicker">Social Readout</div>
          <div class="subpage-title">社媒与通讯</div>
          <div class="subpage-copy">主动发声和手动回复已关闭。LLM 周报会根据事实包解释舆论，社媒动态只作为只读记录。</div>
        </div>
        <div class="subpage-stat-grid">
          <div class="subpage-stat-card"><div class="subpage-stat-label">动态</div><div class="subpage-stat-value">${posts.length}</div></div>
          <div class="subpage-stat-card"><div class="subpage-stat-label">消息</div><div class="subpage-stat-value">${inbox.length}</div></div>
        </div>
      </section>
      <div class="grid g2">
        <div class="card">
          <div class="card-title">舆情流</div>
          ${posts.length ? posts.map(post => `<div class="social-post-card"><div class="social-post-author-line"><b>${post.author || post.persona || '账号'}</b><span class="badge b-pri">只读</span></div><div class="social-post-text mt-12">${post.text || ''}</div></div>`).join('') : '<div class="t-2">暂无社媒动态。</div>'}
        </div>
        <div class="card">
          <div class="card-title">通讯记录</div>
          ${inbox.length ? inbox.map(msg => `<div class="ev neu"><b>${msg.from || '系统'}</b><div class="t-2 fs-sm mt-8">${msg.text || msg.msg || ''}</div></div>`).join('') : '<div class="t-2">暂无消息。</div>'}
        </div>
      </div>
    </div>`;
}

function renderCommerce() {
  if (typeof ensureEconomyState === 'function') ensureEconomyState();
  const view = typeof buildEndorsementOffersView === 'function' ? buildEndorsementOffersView() : null;
  const shop = typeof buildEconomyShopView === 'function' ? buildEconomyShopView() : null;
  const summary = view?.summary || {};
  const active = view?.activeDeals || [];
  const decisions = (G.autoCareer?.autoDecisionLog || []).filter(x => x.type === 'endorsement' || x.type === 'signature_shoe').slice(0, 12);
  $('commercePage').innerHTML = `
    <div class="subpage-shell">
      <section class="subpage-hero">
        <div>
          <div class="subpage-kicker">Commercial Autopilot</div>
          <div class="subpage-title">商业动态</div>
          <div class="subpage-copy">代言签约、签名鞋事件和商业投入由自动周模拟处理。这里保留财务、品牌与流水只读视图。</div>
        </div>
        <div class="subpage-stat-grid">
          <div class="subpage-stat-card"><div class="subpage-stat-label">现金</div><div class="subpage-stat-value">$${phoneFmtM(shop?.cash || 0)}</div></div>
          <div class="subpage-stat-card"><div class="subpage-stat-label">代言</div><div class="subpage-stat-value">${active.length}/${summary.maxActiveDeals || 8}</div></div>
          <div class="subpage-stat-card"><div class="subpage-stat-label">市场分</div><div class="subpage-stat-value">${parseNum(summary.marketScore, 0).toFixed(1)}</div></div>
        </div>
      </section>
      <div class="grid g2">
        <div class="card">
          <div class="card-title">已签约品牌</div>
          ${active.length ? active.map(deal => `<div class="ev pos endorse-active-card"><div class="endorse-offer-head">${renderBrandLogoThumb(deal.logo, deal.brand, 'brand-logo-thumb brand-logo-thumb-lg')}<div class="endorse-offer-main"><b>${deal.brand}</b><div class="t-2 fs-xs">${deal.category} · ${deal.product}</div></div><span class="badge b-ok">生效</span></div><div class="t-2 fs-sm mt-8">剩余 ${parseNum(deal.remainingDays, 0)} 天 · 实时收入 $${phoneFmtM(deal.totalIncome)} · 累计 $${phoneFmtM(deal.earned)}</div>${deal.shoe ? `<div class="t-2 fs-sm mt-8">签名鞋：${deal.shoe.name || '已生成'} · L${deal.shoe.level || 1}</div>` : ''}</div>`).join('') : '<div class="t-2">暂无活跃代言。</div>'}
        </div>
        <div class="card">
          <div class="card-title">自动商业记录</div>
          ${decisions.length ? decisions.map(d => `<div class="ev neu"><b>S${d.season} D${d.day}</b><div class="t-2 fs-sm mt-8">${d.text}</div></div>`).join('') : '<div class="t-2">暂无自动商业动作。</div>'}
        </div>
      </div>
      <div class="card">
        <div class="card-title">财务流水</div>
        ${(G.economy?.logs || []).slice(0, 18).map(l => `<div class="t-2 fs-sm mb-8">S${l.season || ''} D${l.day || ''} ${l.text}</div>`).join('') || '<div class="t-2">暂无流水。</div>'}
      </div>
    </div>`;
}

function renderHistory() {
  if (typeof ensureAutoCareerState === 'function') ensureAutoCareerState();
  const ranking = typeof getHistoricalRankingView === 'function' ? getHistoricalRankingView() : null;
  const live = ranking?.liveEntry || {};
  const gaps = ranking?.gaps || {};
  const retired = (G.historicalTop100?.retiredUserCareers || []).slice().sort((a, b) => parseNum(a.rank, 999) - parseNum(b.rank, 999));
  const eraYear = parseNum(ranking?.asOfYear, parseNum(G.startYear, G.year || 2025));
  const eraEntries = typeof getHistoricalArchiveEntriesForYear === 'function'
    ? getHistoricalArchiveEntriesForYear(G.historicalTop100, eraYear)
    : (ranking?.topEntries || []);
  const archiveEntries = Array.isArray(G.historicalTop100?.entries) ? G.historicalTop100.entries : [];
  const sourceCoverage = LEAGUE?.historicalDb?.manifest?.sourceCoverage || {};
  const liveHonors = typeof normalizeUserHonorCounter === 'function' ? normalizeUserHonorCounter(live.honors || null) : (live.honors || {});
  const honorSummary = live.honorSummary || (typeof buildPlayerHonorsSummary === 'function' ? buildPlayerHonorsSummary(liveHonors) : '暂无荣誉');
  const honorSeasons = Array.isArray(live.honorSeasons) ? live.honorSeasons : [];
  const honorBadges = [
    ['rings', '总冠军'],
    ['mvp', 'MVP'],
    ['fmvp', 'FMVP'],
    ['dpoy', 'DPOY'],
    ['roy', 'ROY'],
    ['allStar', '全明星'],
    ['allStarMvp', '全明星MVP'],
    ['allNba1', '一阵'],
    ['allNba2', '二阵'],
    ['allNba3', '三阵'],
    ['allDefensive', '一防'],
    ['scoring', '得分王'],
    ['rebound', '篮板王'],
    ['assist', '助攻王'],
    ['block', '盖帽王'],
    ['steal', '抢断王'],
    ['sixthMan', '最佳第六人']
  ].filter(([key]) => parseNum(liveHonors[key], 0) > 0);
  const historyHonorRef = entry => {
    const h = typeof normalizeUserHonorCounter === 'function' ? normalizeUserHonorCounter(entry?.honors || null) : (entry?.honors || {});
    const labels = [
      ['rings', '冠'],
      ['mvp', 'MVP'],
      ['fmvp', 'FMVP'],
      ['dpoy', 'DPOY'],
      ['allNba1', '一阵'],
      ['allStar', '全明星']
    ]
      .filter(([key]) => parseNum(h[key], 0) > 0)
      .map(([key, label]) => `${label}x${parseNum(h[key], 0)}`);
    return escapeAutoCareerAttr(labels.length ? labels.join(' / ') : '暂无主要荣誉');
  };
  const page = $('historyPage');
  if (!page) return;
  page.innerHTML = `
    <div class="subpage-shell">
      <section class="subpage-hero">
        <div>
          <div class="subpage-kicker">Historical Top 100</div>
          <div class="subpage-title">历史百大生涯巅峰</div>
          <div class="subpage-copy">${eraYear} 时代排名只读取当年前已发生的履历；实时 Legacy Score 会随荣誉、累计数据、巅峰三年和商业影响更新，退役后写入历史档案并在二周目保留。</div>
        </div>
        <div class="subpage-stat-grid">
          <div class="subpage-stat-card"><div class="subpage-stat-label">当前排名</div><div class="subpage-stat-value">#${ranking?.userRank || '--'}</div></div>
          <div class="subpage-stat-card"><div class="subpage-stat-label">Legacy</div><div class="subpage-stat-value">${live.legacyScore || '--'}</div></div>
          <div class="subpage-stat-card"><div class="subpage-stat-label">Peak</div><div class="subpage-stat-value">${live.peakScore || '--'}</div></div>
        </div>
      </section>
      <div class="card">
        <div class="card-title">差距</div>
        <div class="auto-rank-strip">
          <div><span>第1</span><b>${gaps.rank1 ?? '--'}</b></div>
          <div><span>第10</span><b>${gaps.rank10 ?? '--'}</b></div>
          <div><span>第25</span><b>${gaps.rank25 ?? '--'}</b></div>
          <div><span>第50</span><b>${gaps.rank50 ?? '--'}</b></div>
          <div><span>第100</span><b>${gaps.rank100 ?? '--'}</b></div>
        </div>
      </div>
      <div class="grid g3">
        <div class="card">
          <div class="card-title">时代排名</div>
          <div class="t-2 fs-sm">开档年 ${eraYear} · ${eraEntries.length || 0} 个席位 · 禁止未来荣誉穿越</div>
          <div class="mt-12">${eraEntries.slice(0, 3).map(e => `<div class="t-2 fs-sm">#${e.rank} ${e.name} · ${e.legacyScore}</div>`).join('') || '<div class="t-2 fs-sm">历史库未加载</div>'}</div>
        </div>
        <div class="card">
          <div class="card-title">当前档案</div>
          <div class="t-2 fs-sm">档案版本 ${G.historicalTop100?.version || 1} · 真实数据计算 ${archiveEntries.length || 0} 人 · 退役玩家 ${retired.length}</div>
          <div class="mt-12 t-2 fs-sm">来源：${sourceCoverage.rosters || '本地历史档案'} / ${sourceCoverage.rookies || '真实新秀库'}</div>
        </div>
        <div class="card">
          <div class="card-title">数据覆盖</div>
          <div class="t-2 fs-sm">常规赛：${sourceCoverage.regularSeason || '--'}</div>
          <div class="t-2 fs-sm mt-8">季后赛：${sourceCoverage.playoffs || '--'}</div>
          <div class="t-2 fs-sm mt-8">交易/薪资缺口会显示为空，不生成假数据。</div>
        </div>
      </div>
      <div class="card">
        <div class="card-title">游戏荣誉同步</div>
        <div class="t-2 fs-sm mb-12">历史档案使用荣誉页同源数据：<span class="fw-b">${honorSummary}</span></div>
        <div class="mb-16">
          ${honorBadges.length ? honorBadges.map(([key, label]) => `<span class="badge b-gold">${label} x${parseNum(liveHonors[key], 0)}</span> `).join('') : '<span class="t-2 fs-sm">暂无已归档荣誉</span>'}
        </div>
        <div class="auto-list">
          ${honorSeasons.length ? honorSeasons.slice().reverse().map(s => `
            <div class="auto-list-row">
              <div><b>${s.year || '--'} 赛季${s.champion ? ' · 总冠军' : ''}</b><span>${s.teamName || getTeam(s.team)?.z || '--'} · ${s.wins || 0}-${s.losses || 0}</span></div>
              <div>${(s.awards || []).map(a => `<span class="badge b-gold">${a}</span>`).join(' ')}</div>
            </div>
          `).join('') : '<div class="t-2 fs-sm">退役或赛季结算后，MVP、FMVP、最佳阵容、全明星、总冠军等会从游戏荣誉记录写入这里。</div>'}
        </div>
      </div>
      <div class="grid g2">
        <div class="card">
          <div class="card-title">时代 Top 100 + 玩家实时排名</div>
          <div class="tbl"><table><thead><tr><th>#</th><th>球员</th><th>Legacy</th><th>荣誉参考</th><th>来源</th></tr></thead><tbody>
            ${(ranking?.topEntries || []).slice(0, 100).map(e => `<tr class="${e.id === live.id ? 'self-row' : ''}"><td>${e.rank}</td><td>${escapeAutoCareerAttr(e.name)}</td><td>${e.legacyScore}</td><td>${historyHonorRef(e)}</td><td>${e.source === 'user' ? '玩家' : e.source === 'historical_db' ? '历史库' : e.source === 'roster_aggregate' ? '名单聚合' : '真实数据'}</td></tr>`).join('')}
          </tbody></table></div>
        </div>
        <div class="card">
          <div class="card-title">退役玩家存档</div>
          ${retired.length ? retired.map(e => `<div class="ev pos"><div class="flex fb"><b>#${e.rank} ${e.name}</b><span class="badge b-gold">${e.legacyScore}</span></div><div class="t-2 fs-sm mt-8">${e.team || '--'} · ${e.seasons || 0}季 · ${e.retired ? '已退役' : '现役'}</div><div class="t-2 fs-sm mt-8">${e.honorSummary || '暂无荣誉'}</div></div>`).join('') : '<div class="t-2">暂无退役玩家生涯。退役结算后会写入这里。</div>'}
          <div class="grid g2 mt-16">
            <button class="btn btn-pri" onclick="exportHistoricalArchiveFromUI()">导出 historical_top100.json</button>
            <label class="btn btn-cyan main-menu-file">导入历史档案<input type="file" accept=".json" onchange="importHistoricalArchiveFromInput(this)"></label>
          </div>
        </div>
      </div>
    </div>`;
}

function escapeAutoCareerAttr(value = '') {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function renderAutoCareerLLMSettingsForm(prefix = 'autoLlm', opts = {}) {
  if (typeof ensureAutoCareerState === 'function') ensureAutoCareerState();
  const cfg = typeof getAutoCareerLLMConfig === 'function' ? getAutoCareerLLMConfig() : {};
  const status = typeof getAutoCareerLLMConfigStatus === 'function' ? getAutoCareerLLMConfigStatus() : { ok: false, hasApiKey: false, model: '' };
  const compact = !!opts.compact;
  const resultId = `${prefix}SettingsResult`;
  const fields = `
    <div class="form-group"><label>baseURL</label><input id="${prefix}BaseURL" class="form-control" value="${escapeAutoCareerAttr(cfg.baseURL || '')}" placeholder="https://api.openai.com/v1"></div>
    <div class="form-group"><label>model</label><input id="${prefix}Model" class="form-control" value="${escapeAutoCareerAttr(cfg.model || '')}" placeholder="gpt-4.1-mini"></div>
    <div class="form-group"><label>apiKey</label><input id="${prefix}ApiKey" type="password" class="form-control" value="${escapeAutoCareerAttr(cfg.apiKey || '')}" placeholder="sk-..."></div>
    <div class="grid g2">
      <div class="form-group"><label>temperature</label><input id="${prefix}Temperature" type="number" step="0.05" min="0" max="2" class="form-control" value="${escapeAutoCareerAttr(cfg.temperature ?? 0.75)}"></div>
      <div class="form-group"><label>maxTokens</label><input id="${prefix}MaxTokens" type="number" step="100" min="300" max="8000" class="form-control" value="${escapeAutoCareerAttr(cfg.maxTokens ?? 1800)}"></div>
    </div>
  `;
  return `
    <div class="auto-llm-settings-form ${compact ? 'compact' : ''}" data-llm-prefix="${prefix}">
      <div class="auto-llm-status-row">
        <span class="badge ${status.ok ? 'b-ok' : 'b-war'}">${status.ok ? 'Ready' : 'Missing'}</span>
        <span class="t-2 fs-sm">${status.model || '未设置模型'} · ${status.hasApiKey ? 'Key 已保存' : 'Key 缺失'}</span>
      </div>
      ${fields}
      <button class="btn btn-gold" onclick="saveAutoCareerLLMSettings('${prefix}')">${opts.saveLabel || '保存 LLM 设置'}</button>
      <div id="${resultId}" class="mt-12"></div>
    </div>
  `;
}

function openAutoCareerLLMSettingsModal() {
  showModal(`
    <div class="modal-hd"><h3>LLM 设置</h3><button class="modal-x" onclick="hideModal()">×</button></div>
    <div class="t-2 mb-16">周报和退役结算必须使用 OpenAI 兼容接口。保存后会立即同步到本地配置。</div>
    ${renderAutoCareerLLMSettingsForm('modalAutoLlm')}
    <div class="grid g2 mt-16">
      <button class="btn btn-pri" onclick="hideModal();navTo('settings')">打开完整设置页</button>
      <button class="btn btn-s" onclick="hideModal()">关闭</button>
    </div>
  `);
}

function renderSettings() {
  if (typeof ensureAutoCareerState === 'function') ensureAutoCareerState();
  const status = typeof getAutoCareerLLMConfigStatus === 'function' ? getAutoCareerLLMConfigStatus() : { ok: false };
  $('settingsPage').innerHTML = `
    <div class="subpage-shell">
      <section class="subpage-hero">
        <div>
          <div class="subpage-kicker">LLM Control</div>
          <div class="subpage-title">自动生涯设置</div>
          <div class="subpage-copy">周报与退役结算只使用 OpenAI 兼容接口。配置缺失或 JSON 失败时，本周模拟会回滚并允许重试。</div>
        </div>
        <div class="subpage-stat-grid">
          <div class="subpage-stat-card"><div class="subpage-stat-label">LLM</div><div class="subpage-stat-value">${status.ok ? 'Ready' : 'Missing'}</div></div>
          <div class="subpage-stat-card"><div class="subpage-stat-label">历史档案</div><div class="subpage-stat-value">${G.historicalTop100?.entries?.length || 0}</div></div>
        </div>
      </section>
      <div class="grid g2">
        <div class="card">
          <div class="card-title">OpenAI 兼容接口</div>
          ${renderAutoCareerLLMSettingsForm('autoLlm')}
        </div>
        <div class="card">
          <div class="card-title">historical_top100.json</div>
          <div class="t-2 fs-sm">当前档案版本 ${G.historicalTop100?.version || 1}，记录 ${G.historicalTop100?.entries?.length || 0} 个 Top100 席位，退役玩家 ${G.historicalTop100?.retiredUserCareers?.length || 0} 个。</div>
          <div class="grid g2 mt-16">
            <button class="btn btn-pri" onclick="exportHistoricalArchiveFromUI()">导出历史百大</button>
            <label class="btn btn-cyan main-menu-file">导入历史百大<input type="file" accept=".json" onchange="importHistoricalArchiveFromInput(this)"></label>
          </div>
          <button class="btn btn-s mt-16" onclick="navTo('history')">查看历史百大页面</button>
        </div>
      </div>
    </div>`;
}

function saveAutoCareerLLMSettings(prefix = 'autoLlm') {
  const cfg = {
    baseURL: $(`${prefix}BaseURL`)?.value || '',
    model: $(`${prefix}Model`)?.value || '',
    apiKey: $(`${prefix}ApiKey`)?.value || '',
    temperature: $(`${prefix}Temperature`)?.value || 0.75,
    maxTokens: $(`${prefix}MaxTokens`)?.value || 1800
  };
  if (typeof saveAutoCareerLLMConfig === 'function') saveAutoCareerLLMConfig(cfg, true);
  const box = $(`${prefix}SettingsResult`);
  if (box) box.innerHTML = '<div class="ev pos">LLM 设置已保存。下一周模拟将使用真实接口；测试环境可注入 window.__autoCareerLLMMock。</div>';
  if ($('homePage')?.classList.contains('active')) renderRegularSeasonAction();
}

function exportHistoricalArchiveFromUI() {
  try {
    const json = typeof serializeHistoricalArchive === 'function' ? serializeHistoricalArchive() : JSON.stringify(G.historicalTop100 || {}, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'historical_top100.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (e) {
    alert('导出失败: ' + (e?.message || e));
  }
}

function importHistoricalArchiveFromInput(input) {
  const file = input.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const data = JSON.parse(e.target.result);
      if (typeof loadHistoricalArchiveObject === 'function') loadHistoricalArchiveObject(data);
      alert('历史百大档案已导入');
      if ($('historyPage')?.classList.contains('active')) renderHistory();
      if ($('settingsPage')?.classList.contains('active')) renderSettings();
    } catch (err) {
      alert('导入失败: ' + (err?.message || err));
    }
  };
  reader.readAsText(file);
  input.value = '';
}

// ============ SAVE PAGE ============
function buildSaveObj() {
  const saveObj = { ...G };
  // 清理旧版远程文本配置，不写入存档文件。
  if (saveObj.social?.llm) {
    delete saveObj.social.llm;
  }
  if (saveObj.results && saveObj.results.length > 50) saveObj.results = saveObj.results.slice(-50);
  delete saveObj.tradeOffers;
  delete saveObj.pendingEvent;
  delete saveObj.pendingUserTrade;
  // 清理临时状态
  delete saveObj._simulatingDay;
  delete saveObj._simulatingWeek;
  delete saveObj._retiring;
  delete saveObj._latestDayResult;
  delete saveObj._latestGameRecap;
  delete saveObj._gameRecapMap;
  delete saveObj._gameEvent;
  delete saveObj._effortMode;
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

  $('savePage').innerHTML = `
  <div class="card">
    <div class="card-title">💾 存档管理</div>
    <div class="tc p-16">
      <div class="mb-16">当前进度: ${G.year - 1}-${G.year}赛季 第${G.season}年 | ${G.player.name} | 第${G.dayNum + 1}天</div>

      <div class="save-slot-grid">
        ${[1,2,3,4,5].map(slot => {
          const info = getSaveSlotInfo(slot);
          const timeStr = info?.saveTime ? new Date(info.saveTime).toLocaleString('zh-CN') : '';
          return `
            <div class="save-slot-item ${info && !info.error ? 'has-save' : ''}">
              <div class="save-slot-header">
                <span class="save-slot-num">槽位 ${slot}</span>
                ${info && !info.error ? `<span class="save-slot-time">${timeStr}</span>` : '<span class="save-slot-empty">空</span>'}
              </div>
              ${info && !info.error ? `
                <div class="save-slot-info">
                  <span class="save-slot-name">${info.playerName}</span>
                  <span class="save-slot-detail">${info.year}赛季 S${info.season} 第${info.dayNum + 1}天</span>
                </div>
              ` : ''}
              <div class="save-slot-actions">
                <button class="btn btn-sm btn-gold" onclick="saveGame(${slot})">保存</button>
                ${info && !info.error ? `
                  <button class="btn btn-sm btn-pri" onclick="loadGame(${slot})">读取</button>
                  <button class="btn btn-sm btn-red" onclick="deleteSave(${slot})">删除</button>
                ` : ''}
              </div>
            </div>
          `;
        }).join('')}
      </div>

      <div class="t-2 fs-sm mt-16 mb-8">上次保存: ${lastSaveTime}</div>

      <div class="save-import-export mt-16">
        <div class="grid g2" style="gap:12px;max-width:400px;margin:0 auto">
          <div class="main-menu-file btn btn-cyan" style="padding:12px 20px">
            📥 导入存档
            <input type="file" accept=".json" style="position:absolute;top:0;left:0;width:100%;height:100%;opacity:0;cursor:pointer" onchange="importSave(this)">
          </div>
          <button class="btn btn-pri" style="padding:12px 20px" onclick="exportSave()">📤 导出存档</button>
        </div>
      </div>
    </div>
  </div>`;

  // 添加样式
  if (!$('saveSlotStyles')) {
    const style = document.createElement('style');
    style.id = 'saveSlotStyles';
    style.textContent = `
      .save-slot-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; max-width: 800px; margin: 0 auto; }
      .save-slot-item { background: rgba(0,0,0,0.3); border: 1px solid #333; border-radius: 8px; padding: 12px; transition: all 0.2s; }
      .save-slot-item.has-save { border-color: #28a745; background: rgba(40,167,69,0.1); }
      .save-slot-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
      .save-slot-num { font-weight: bold; color: #fdb927; }
      .save-slot-time { font-size: 11px; color: #888; }
      .save-slot-empty { font-size: 12px; color: #666; }
      .save-slot-info { margin-bottom: 8px; }
      .save-slot-name { font-weight: bold; color: #fff; margin-right: 8px; }
      .save-slot-detail { font-size: 12px; color: #aaa; }
      .save-slot-actions { display: flex; gap: 6px; flex-wrap: wrap; }
      .main-menu-file { position: relative; overflow: hidden; cursor: pointer; }
      .main-menu-file input[type="file"] { position: absolute; top: 0; left: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer; }
    `;
    document.head.appendChild(style);
  }
}

async function applySaveData(data) {
  let leagueReference = null;
  if (data?._leagueTeams && typeof buildLeagueReferenceState === 'function') {
    try {
      leagueReference = await buildLeagueReferenceState(parseNum(data.startYear, data.year || G.year || 2025));
    } catch (e) {
      console.warn('build league reference failed', e);
    }
  }
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

  if (leagueReference && typeof repairLeagueTeamsFromReference === 'function') {
    const repaired = repairLeagueTeamsFromReference(leagueReference);
    if (repaired?.repairedTeams?.length) {
      console.info('league team mapping repaired from reference', repaired);
    }
  }

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
  if (typeof migrateLegacyCommercialSocialState === 'function') migrateLegacyCommercialSocialState();
  if (typeof ensureCoachRelationshipState === 'function') ensureCoachRelationshipState();
  if (typeof ensureCoachDynamicsState === 'function') ensureCoachDynamicsState();
  if (typeof ensureGameplayState === 'function') ensureGameplayState();
  if (typeof ensureAutoCareerState === 'function') ensureAutoCareerState();
  if (typeof ensureLeagueBadges === 'function') ensureLeagueBadges();
  if (typeof enforceLeagueRosterCap === 'function') enforceLeagueRosterCap(15);
  ensureLeagueStateShape();
  if (typeof repairLeagueGameDetailsBoxScores === 'function') repairLeagueGameDetailsBoxScores();
  if (!G.leagueSeason.round && !Object.keys(G.leagueSeason.teamRecords || {}).length) {
    initLeagueSeasonState();
  }
  G.team = getTeam(G.teamId);
  G.phase = 'season';
  setMainNavigationVisible(true);
  $('createPage').classList.remove('active');
  $('mainMenuPage').classList.remove('active');
  updateHeader();
  navTo('home');
}

function saveGame(slot) {
  try {
    const saveObj = buildSaveObj();
    saveObj._saveTime = Date.now();
    saveObj._saveSlot = slot;
    localStorage.setItem('nba_save_slot_' + slot, JSON.stringify(saveObj));
    G._lastSaveTime = Date.now();
    renderSave(); // 刷新存档页面
    alert(`存档 ${slot} 保存成功！`);
  } catch (e) {
    if (e.name === 'QuotaExceededError') {
      alert('浏览器存储空间不足！请清理旧存档。');
    } else {
      alert('保存失败: ' + e.message);
    }
  }
}

async function loadGame(slot) {
  const d = localStorage.getItem('nba_save_slot_' + slot);
  if (!d) { alert(`存档 ${slot} 为空！`); return; }
  try {
    const data = JSON.parse(d);
    await applySaveData(data);
    alert(`存档 ${slot} 读取成功！`);
  } catch (e) {
    console.error('Load failed', e);
    alert('读取失败: ' + e.message);
  }
}

function deleteSave(slot) {
  const d = localStorage.getItem('nba_save_slot_' + slot);
  if (!d) { alert(`存档 ${slot} 为空，无需删除！`); return; }
  if (confirm(`确定要删除存档 ${slot} 吗？此操作不可恢复！`)) {
    localStorage.removeItem('nba_save_slot_' + slot);
    alert(`存档 ${slot} 已删除！`);
    // 刷新当前页面
    if ($('mainMenuPage').classList.contains('active')) {
      renderMainMenu();
    } else if ($('savePage').classList.contains('active')) {
      renderSave();
    }
  }
}

function getSaveSlotInfo(slot) {
  const d = localStorage.getItem('nba_save_slot_' + slot);
  if (!d) return null;
  try {
    const data = JSON.parse(d);
    return {
      slot: slot,
      playerName: data.player?.name || '未知',
      season: data.season || 1,
      year: data.year || 2025,
      dayNum: data.dayNum || 0,
      teamId: data.teamId || '',
      saveTime: data._saveTime || null
    };
  } catch (e) {
    return { slot: slot, error: true };
  }
}

function getAllSaveSlots() {
  const slots = [];
  for (let i = 1; i <= 5; i++) {
    slots.push(getSaveSlotInfo(i));
  }
  return slots;
}

// ============ NAVIGATION ============
function setMainNavigationVisible(visible) {
  const nav = $('mainNav');
  const shell = document.querySelector('.shell-main');
  if (nav) nav.style.display = visible ? 'flex' : 'none';
  if (shell) shell.classList.toggle('shell-main-nav-hidden', !visible);
  if (visible && typeof applyAutoCareerNavigation === 'function') applyAutoCareerNavigation();
}

// Post-render VFX hooks — called after each page render
function _vfxPostRender(page, pg) {
  if (!pg) return;
  // Animate stat bars on applicable pages
  if (typeof animateStatBars === 'function') {
    animateStatBars(pg);
  }
  // Animate game score count-up on home page
  if (page === 'home') {
    pg.querySelectorAll('[data-score]').forEach(el => {
      const target = parseInt(el.dataset.score, 10);
      if (!isNaN(target) && typeof animateCountUp === 'function') {
        animateCountUp(el, 0, target, 600);
      }
    });
    // VFX for latest game result win
    const latest = G.results?.length ? G.results[G.results.length - 1] : null;
    if (latest?.win && typeof spawnConfetti === 'function') {
      const card = pg.querySelector('.game-result-card[data-win="true"]');
      if (card) {
        const rect = card.getBoundingClientRect();
        setTimeout(() => spawnConfetti(rect.left + rect.width/2, rect.top + 30, 20), 400);
      }
    }
  }
  // Stagger-animate list items on stats, matches, roster pages
  if (page === 'stats' || page === 'matches' || page === 'roster' || page === 'trade') {
    pg.querySelectorAll('tbody tr').forEach((tr, i) => {
      tr.style.animation = `cardReveal .4s var(--ease-2k) ${i * 0.03}s backwards`;
    });
  }
  // Awards page: confetti for championships
  if (page === 'awards' && typeof spawnSparks === 'function') {
    const champEl = pg.querySelector('[data-champion]');
    if (champEl) {
      const r = champEl.getBoundingClientRect();
      setTimeout(() => spawnSparks(r.left + r.width/2, r.top + r.height/2, '#ffd54f'), 500);
    }
  }
}

function navTo(page) {
  if (G._simulatingDay || G._simulatingWeek) return;
  setMainNavigationVisible(true);
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  const pg = $(page + 'Page');
  if (pg) pg.classList.add('active');
  const btn = document.querySelector(`.nav-btn[data-p="${page}"]`);
  if (btn) btn.classList.add('active');
  const renderers = {
    home: renderHome, stats: renderStats,
    matches: renderMatchCenter, roster: renderRoster, upgrade: renderUpgrade, trade: renderTrade, awards: renderAwards,
    history: renderHistory, phone: renderPhone, commerce: renderCommerce, settings: renderSettings, save: renderSave
  };
  if (renderers[page]) renderers[page]();
  // Post-render VFX hooks
  _vfxPostRender(page, pg);
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
  setMainNavigationVisible(false);
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  $('createPage').classList.add('active');
}

function renderMainMenu() {
  if (typeof ensureSocialState === 'function') ensureSocialState();
  if (typeof ensureAutoCareerState === 'function') ensureAutoCareerState();
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  setMainNavigationVisible(false);
  $('mainMenuPage').classList.add('active');

  // 存档槽位HTML
  const saveSlotsHtml = [1,2,3,4,5].map(slot => {
    const info = getSaveSlotInfo(slot);
    const timeStr = info?.saveTime ? new Date(info.saveTime).toLocaleString('zh-CN') : '';
    if (info && !info.error) {
      return `
        <div class="nba-save-slot filled" onclick="loadGame(${slot})">
          <div class="nba-slot-bg"></div>
          <div class="nba-slot-content">
            <div class="nba-slot-number">${slot}</div>
            <div class="nba-slot-info">
              <div class="nba-slot-name">${info.playerName}</div>
              <div class="nba-slot-meta">${info.year}赛季 · S${info.season} · 第${info.dayNum + 1}天</div>
              <div class="nba-slot-time">${timeStr}</div>
            </div>
            <div class="nba-slot-actions">
              <button class="nba-btn-mini primary" onclick="event.stopPropagation();loadGame(${slot})">读取</button>
              <button class="nba-btn-mini danger" onclick="event.stopPropagation();deleteSave(${slot})">删除</button>
            </div>
          </div>
        </div>
      `;
    } else {
      return `
        <div class="nba-save-slot empty">
          <div class="nba-slot-content">
            <div class="nba-slot-number">${slot}</div>
            <div class="nba-slot-info">
              <div class="nba-slot-empty-text">空槽位</div>
            </div>
          </div>
        </div>
      `;
    }
  }).join('');

  const menuHtml = `
    <div class="nba-main-menu">
      <!-- 左侧主区域 -->
      <div class="nba-hero-section">
        <div class="nba-hero-bg">
          <div class="nba-court-lines"></div>
          <div class="nba-glow-orb"></div>
          ${typeof svgCourtBg === 'function' ? svgCourtBg() : ''}
          ${typeof svgPlayerSilhouette === 'function' ? svgPlayerSilhouette() : ''}
        </div>
        <div class="nba-hero-content">
          <div class="nba-logo-area">
            <div class="nba-logo-ball">
              <svg viewBox="0 0 100 100" class="nba-ball-svg">
                <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" stroke-width="2"/>
                <path d="M50 5 Q50 50 50 95" fill="none" stroke="currentColor" stroke-width="1.5"/>
                <path d="M5 50 Q50 50 95 50" fill="none" stroke="currentColor" stroke-width="1.5"/>
                <path d="M15 20 Q50 35 85 20" fill="none" stroke="currentColor" stroke-width="1"/>
                <path d="M15 80 Q50 65 85 80" fill="none" stroke="currentColor" stroke-width="1"/>
              </svg>
            </div>
            <div class="nba-title-group">
              <div class="nba-kicker">CAREER MODE</div>
              <div class="nba-title">NBA CAREER SIM</div>
              <div class="nba-subtitle">从新秀到传奇，书写你的篮球人生</div>
            </div>
          </div>

          <div class="nba-main-actions">
            <button class="nba-btn-hero btn-glow" onclick="startNewGame()" onmouseenter="if(typeof spawnBasketballParticles==='function'){const r=this.getBoundingClientRect();spawnBasketballParticles(r.left+r.width/2,r.top)}">
              <span class="nba-btn-icon">🏀</span>
              <span class="nba-btn-text">开始新生涯</span>
              <span class="nba-btn-arrow">→</span>
            </button>
          </div>

          <div class="nba-save-section">
            <div class="nba-section-header">
              <span class="nba-section-icon">💾</span>
              <span class="nba-section-title">存档</span>
            </div>
            <div class="nba-save-grid">
              ${saveSlotsHtml}
            </div>
            <div class="nba-save-footer">
              <label class="nba-import-btn">
                <span>📥 导入存档</span>
                <input type="file" accept=".json" onchange="importSave(this)" style="display:none">
              </label>
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧配置区 -->
      <div class="nba-config-section">
        <div class="nba-config-header">
          <div class="nba-config-title">LLM 设置</div>
        </div>
        <div class="nba-config-body">
          <div class="nba-config-card">
            <div class="nba-config-card-title">OpenAI 兼容接口</div>
            <div class="nba-config-copy">选秀后的周报和退役结算必须使用真实 LLM。这里保存后，开档进入生涯会自动带入。</div>
            ${renderAutoCareerLLMSettingsForm('mainMenuAutoLlm', { compact: true, saveLabel: '保存 LLM' })}
          </div>
          <div class="nba-config-card">
            <div class="nba-config-card-title">历史档案</div>
            <div class="nba-config-copy">历史百大与退役玩家档案会在生涯内的“百大/设置”页面导入导出。</div>
          </div>
          <div class="nba-version">v1.3.0 · Auto Career</div>
        </div>
      </div>
    </div>
  `;

  // 添加样式
  if (!$('nbaMenuStyles')) {
    const style = document.createElement('style');
    style.id = 'nbaMenuStyles';
    style.textContent = `
      .nba-main-menu {
        display: flex;
        min-height: 100vh;
        background: linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #0f0f1a 100%);
        font-family: 'Segoe UI', system-ui, sans-serif;
        color: #fff;
        position: relative;
        overflow: hidden;
      }

      /* 左侧主区域 */
      .nba-hero-section {
        flex: 1;
        display: flex;
        flex-direction: column;
        justify-content: center;
        padding: 40px 60px;
        position: relative;
        z-index: 1;
      }

      .nba-hero-bg {
        position: absolute;
        inset: 0;
        overflow: hidden;
        pointer-events: none;
      }

      .nba-court-lines {
        position: absolute;
        inset: 0;
        background:
          linear-gradient(90deg, transparent 49.5%, rgba(251,191,39,0.03) 49.5%, rgba(251,191,39,0.03) 50.5%, transparent 50.5%),
          linear-gradient(0deg, transparent 49.5%, rgba(251,191,39,0.03) 49.5%, rgba(251,191,39,0.03) 50.5%, transparent 50.5%);
        opacity: 0.5;
      }

      .nba-glow-orb {
        position: absolute;
        width: 600px;
        height: 600px;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: radial-gradient(circle, rgba(251,191,39,0.15) 0%, transparent 70%);
        animation: pulse 4s ease-in-out infinite;
      }

      @keyframes pulse {
        0%, 100% { opacity: 0.5; transform: translate(-50%, -50%) scale(1); }
        50% { opacity: 0.8; transform: translate(-50%, -50%) scale(1.1); }
      }

      .nba-hero-content {
        position: relative;
        z-index: 2;
      }

      /* Logo区域 */
      .nba-logo-area {
        display: flex;
        align-items: center;
        gap: 24px;
        margin-bottom: 48px;
      }

      .nba-logo-ball {
        width: 80px;
        height: 80px;
        color: #fbbf27;
        filter: drop-shadow(0 0 20px rgba(251,191,39,0.5));
        animation: float 3s ease-in-out infinite;
      }

      @keyframes float {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-10px); }
      }

      .nba-ball-svg {
        width: 100%;
        height: 100%;
      }

      .nba-title-group {
        flex: 1;
      }

      .nba-kicker {
        font-size: 12px;
        font-weight: 600;
        letter-spacing: 4px;
        color: #fbbf27;
        text-transform: uppercase;
        margin-bottom: 8px;
      }

      .nba-title {
        font-size: 48px;
        font-weight: 900;
        letter-spacing: 2px;
        background: linear-gradient(135deg, #fff 0%, #fbbf27 50%, #f59e0b 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        text-shadow: 0 0 60px rgba(251,191,39,0.3);
      }

      .nba-subtitle {
        font-size: 14px;
        color: #888;
        margin-top: 8px;
        letter-spacing: 1px;
      }

      /* 主按钮 */
      .nba-main-actions {
        margin-bottom: 48px;
      }

      .nba-btn-hero {
        display: inline-flex;
        align-items: center;
        gap: 16px;
        padding: 20px 48px;
        background: linear-gradient(135deg, #fbbf27 0%, #f59e0b 100%);
        border: none;
        border-radius: 4px;
        color: #000;
        font-size: 18px;
        font-weight: 700;
        letter-spacing: 2px;
        cursor: pointer;
        transition: all 0.3s ease;
        box-shadow: 0 4px 30px rgba(251,191,39,0.4);
        position: relative;
        overflow: hidden;
      }

      .nba-btn-hero::before {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(135deg, transparent 0%, rgba(255,255,255,0.2) 50%, transparent 100%);
        transform: translateX(-100%);
        transition: transform 0.5s ease;
      }

      .nba-btn-hero:hover::before {
        transform: translateX(100%);
      }

      .nba-btn-hero:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 40px rgba(251,191,39,0.6);
      }

      .nba-btn-icon {
        font-size: 24px;
      }

      .nba-btn-arrow {
        font-size: 20px;
        transition: transform 0.3s ease;
      }

      .nba-btn-hero:hover .nba-btn-arrow {
        transform: translateX(8px);
      }

      /* 存档区域 */
      .nba-save-section {
        background: rgba(255,255,255,0.03);
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 12px;
        padding: 24px;
        backdrop-filter: blur(10px);
      }

      .nba-section-header {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 20px;
      }

      .nba-section-icon {
        font-size: 20px;
      }

      .nba-section-title {
        font-size: 16px;
        font-weight: 600;
        letter-spacing: 2px;
        text-transform: uppercase;
        color: #aaa;
      }

      .nba-save-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 12px;
      }

      .nba-save-slot {
        position: relative;
        border-radius: 8px;
        overflow: hidden;
        cursor: pointer;
        transition: all 0.3s ease;
        min-height: 100px;
      }

      .nba-save-slot.empty {
        background: rgba(255,255,255,0.02);
        border: 1px dashed rgba(255,255,255,0.1);
      }

      .nba-save-slot.filled {
        background: linear-gradient(135deg, rgba(251,191,39,0.1) 0%, rgba(245,158,11,0.05) 100%);
        border: 1px solid rgba(251,191,39,0.3);
      }

      .nba-save-slot.filled:hover {
        border-color: rgba(251,191,39,0.6);
        transform: translateY(-2px);
        box-shadow: 0 8px 30px rgba(251,191,39,0.2);
      }

      .nba-slot-bg {
        position: absolute;
        inset: 0;
        background: linear-gradient(135deg, transparent 0%, rgba(251,191,39,0.05) 100%);
        opacity: 0;
        transition: opacity 0.3s ease;
      }

      .nba-save-slot.filled:hover .nba-slot-bg {
        opacity: 1;
      }

      .nba-slot-content {
        position: relative;
        z-index: 1;
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .nba-slot-number {
        position: absolute;
        top: 8px;
        right: 12px;
        font-size: 32px;
        font-weight: 900;
        color: rgba(251,191,39,0.15);
        line-height: 1;
      }

      .nba-slot-name {
        font-size: 14px;
        font-weight: 600;
        color: #fff;
      }

      .nba-slot-meta {
        font-size: 11px;
        color: #888;
      }

      .nba-slot-time {
        font-size: 10px;
        color: #666;
      }

      .nba-slot-empty-text {
        font-size: 12px;
        color: #444;
        text-align: center;
        padding: 20px 0;
      }

      .nba-slot-actions {
        display: flex;
        gap: 8px;
        margin-top: 8px;
      }

      .nba-btn-mini {
        padding: 6px 12px;
        font-size: 11px;
        font-weight: 600;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .nba-btn-mini.primary {
        background: #fbbf27;
        color: #000;
      }

      .nba-btn-mini.danger {
        background: rgba(239,68,68,0.2);
        color: #ef4444;
        border: 1px solid rgba(239,68,68,0.3);
      }

      .nba-btn-mini:hover {
        transform: scale(1.05);
      }

      .nba-save-footer {
        margin-top: 16px;
        padding-top: 16px;
        border-top: 1px solid rgba(255,255,255,0.05);
      }

      .nba-import-btn {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 10px 20px;
        background: rgba(255,255,255,0.05);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 6px;
        color: #888;
        font-size: 13px;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .nba-import-btn:hover {
        background: rgba(255,255,255,0.1);
        color: #fff;
      }

      /* 右侧配置区 */
      .nba-config-section {
        width: 380px;
        background: rgba(0,0,0,0.4);
        border-left: 1px solid rgba(255,255,255,0.05);
        padding: 32px 24px;
        display: flex;
        flex-direction: column;
        gap: 20px;
        overflow-y: auto;
        max-height: 100vh;
      }

      .nba-config-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .nba-config-title {
        font-size: 14px;
        font-weight: 600;
        letter-spacing: 1px;
        color: #aaa;
      }

      .nba-config-body {
        display: flex;
        flex-direction: column;
        gap: 14px;
      }

      .nba-config-card {
        background: rgba(255,255,255,0.04);
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 8px;
        padding: 14px;
      }

      .nba-config-card-title {
        font-size: 14px;
        font-weight: 800;
        letter-spacing: 1px;
        color: #fbbf27;
        margin-bottom: 8px;
      }

      .nba-config-copy {
        font-size: 12px;
        line-height: 1.55;
        color: #a8adbd;
        margin-bottom: 12px;
      }

      .auto-llm-status-row {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 12px;
        flex-wrap: wrap;
      }

      .auto-llm-settings-form.compact .form-group {
        margin-bottom: 10px;
      }

      .auto-llm-settings-form.compact .form-control {
        padding: 9px 10px;
        border-radius: 8px;
        font-size: 13px;
      }

      .auto-llm-settings-form.compact .grid.g2 {
        gap: 8px;
      }

      .auto-llm-settings-form.compact .btn {
        width: 100%;
      }

      .nba-btn:hover {
        transform: translateY(-1px);
      }

      .nba-version {
        text-align: center;
        font-size: 11px;
        color: #444;
        padding-top: 20px;
        border-top: 1px solid rgba(255,255,255,0.05);
        margin-top: auto;
      }

      /* 响应式 */
      @media (max-width: 900px) {
        .nba-main-menu {
          flex-direction: column;
        }
        .nba-hero-section {
          padding: 30px 20px;
        }
        .nba-title {
          font-size: 32px;
        }
        .nba-config-section {
          width: 100%;
          max-height: none;
          border-left: none;
          border-top: 1px solid rgba(255,255,255,0.05);
        }
      }
    `;
    document.head.appendChild(style);
  }

  $('mainMenuPage').innerHTML = menuHtml;
}
async function exportSave() {
  try {
    const saveObj = buildSaveObj();
    const json = JSON.stringify(saveObj, null, 2);
    const filename = getSaveFilename();

    // 下载方式
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    alert('存档已导出！');
  } catch (e) {
    console.error(e);
    alert('导出失败: ' + e.message);
  }
}

function importSave(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async function (e) {
    try {
      const data = JSON.parse(e.target.result);
      if (!data.player || !data.year) throw new Error("无效的存档文件");
      await applySaveData(data);
      alert('存档导入成功！');
    } catch (err) {
      console.error(err);
      alert('导入失败: 存档文件损坏或格式错误');
    }
  };
  reader.readAsText(file);
  input.value = ''; // 重置以便再次选择同一文件
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
// ============ RETIREMENT ============
async function forceRetire() {
  if (G._retiring) return;
  if (typeof ensureAutoCareerState === 'function') ensureAutoCareerState();
  if (typeof hasAutoCareerLLMConfig === 'function' && !hasAutoCareerLLMConfig()) {
    showModal(`
      <div class="modal-hd"><h3>无法退役结算</h3><button class="modal-x" onclick="hideModal()">×</button></div>
      <div class="t-2 mb-16">退役评价和最终历史排名必须由真实 LLM JSON 生成。请先在设置中填写 LLM 配置。</div>
      <button class="btn btn-gold" onclick="hideModal();openAutoCareerLLMSettingsModal()">前往设置</button>
    `);
    return;
  }
  G._retiring = true;
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  $('gamePage').classList.add('active');
  $('gamePage').innerHTML = `<div class="card tc"><div class="card-title">退役结算中</div><div class="t-2 mt-12">正在等待 LLM 生成媒体、球员、球迷、杂志和历史委员会评价...</div></div>`;
  try {
    const summary = typeof generateAutoRetirementSummaryByLLM === 'function'
      ? await generateAutoRetirementSummaryByLLM()
      : null;
    if (!summary) throw new Error('退役 LLM 结算函数未加载');
    const ranking = typeof finalizeUserHistoricalCareer === 'function'
      ? finalizeUserHistoricalCareer(summary)
      : null;
    summary.ranking = ranking || summary.ranking || null;
    G.phase = 'retired';
    renderRetirement(summary);
  } catch (e) {
    $('homePage').classList.add('active');
    $('gamePage').classList.remove('active');
    showModal(`
      <div class="modal-hd"><h3>退役未提交</h3><button class="modal-x" onclick="hideModal()">×</button></div>
      <div class="t-2 mb-16">${e?.message || e}</div>
      <div class="grid g2">
        <button class="btn btn-gold" onclick="hideModal();forceRetire()">重试退役结算</button>
        <button class="btn btn-pri" onclick="hideModal();openAutoCareerLLMSettingsModal()">检查 LLM 设置</button>
      </div>
    `);
  } finally {
    G._retiring = false;
  }
}

function renderRetirement(summary) {
  const ranking = summary?.ranking || {};
  const rankText = ranking.userRank || summary?.ranking?.rank || '--';
  const scoreText = summary?.score || ranking.liveEntry?.legacyScore || '--';
  $('gamePage').innerHTML = `
  <div class="card tc">
    <div class="card-title fc fc-center" style="color:var(--gold);font-size:24px;">生涯落幕 - 退役仪式</div>
    <div class="fs-lg fw-b mt-12">${G.player.name} 正式宣布退役</div>
    <div class="auto-rank-strip mt-16">
      <div><span>最终历史排名</span><b>#${rankText}</b></div>
      <div><span>Legacy Score</span><b>${scoreText}</b></div>
      <div><span>巅峰分</span><b>${ranking.liveEntry?.peakScore || '--'}</b></div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:20px 0;text-align:left;">
      <div style="background:rgba(255,255,255,.05);padding:10px;border-radius:8px;border-left:3px solid #17a2b8;">
        <div class="fw-b" style="color:#17a2b8;margin-bottom:6px">媒体评价</div>
        <div class="t-2 fs-sm">${summary.media}</div>
      </div>
      <div style="background:rgba(255,255,255,.05);padding:10px;border-radius:8px;border-left:3px solid #fd7e14;">
        <div class="fw-b" style="color:#fd7e14;margin-bottom:6px">球员评价</div>
        <div class="t-2 fs-sm">${summary.players}</div>
      </div>
      <div style="background:rgba(255,255,255,.05);padding:10px;border-radius:8px;border-left:3px solid #e83e8c;">
        <div class="fw-b" style="color:#e83e8c;margin-bottom:6px">球迷评价</div>
        <div class="t-2 fs-sm">${summary.fans}</div>
      </div>
      <div style="background:rgba(255,255,255,.05);padding:10px;border-radius:8px;border-left:3px solid #6f42c1;">
        <div class="fw-b" style="color:#6f42c1;margin-bottom:6px">球评人评价</div>
        <div class="t-2 fs-sm">${summary.critics}</div>
      </div>
      <div style="background:rgba(255,255,255,.05);padding:10px;border-radius:8px;border-left:3px solid #fdb927;">
        <div class="fw-b" style="color:#fdb927;margin-bottom:6px">杂志封面评语</div>
        <div class="t-2 fs-sm">${summary.magazine}</div>
      </div>
      <div style="background:rgba(255,255,255,.05);padding:10px;border-radius:8px;border-left:3px solid #28a745;">
        <div class="fw-b" style="color:#28a745;margin-bottom:6px">历史委员会</div>
        <div class="t-2 fs-sm">${summary.legacyCommittee}</div>
      </div>
    </div>

    <div style="margin-top:20px;padding:15px;background:rgba(253,185,39,.1);border:1px solid var(--gold);border-radius:8px;">
      <div class="fs-xl fw-b t-gold" style="font-size:32px;margin-bottom:8px">历史排名：#${rankText}</div>
      <div class="t-2">${summary.finalMessage}</div>
    </div>

    <div class="grid g2 mt-16">
      <button class="btn btn-pri" onclick="exportHistoricalArchiveFromUI()">导出历史百大 JSON</button>
      <button class="btn btn-gold" onclick="location.reload()">二周目重新开始</button>
    </div>
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
