// vfx.js — Particle System, Animation Utilities, SVG Icon Library
// Loaded before core.js, ui.js. All functions are global scope.

;(function(){
"use strict";

// ==================== PARTICLE SYSTEM ====================
const MAX_PARTICLES = 350;
let particles = [];
let canvas, ctx;
let rafId = null;
let running = false;

function initVFX() {
  if (canvas) return;
  canvas = document.createElement('canvas');
  canvas.id = 'vfxCanvas';
  canvas.style.cssText = 'position:fixed;inset:0;z-index:9999;pointer-events:none;';
  document.body.appendChild(canvas);
  ctx = canvas.getContext('2d');
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
}

function resizeCanvas() {
  if (!canvas) return;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

function createParticle(type, x, y, color) {
  const p = { type, x, y, life: 1, rotation: Math.random() * Math.PI * 2 };
  switch(type) {
    case 'confetti':
      p.vx = (Math.random() - .5) * 8;
      p.vy = -(Math.random() * 6 + 2);
      p.gravity = .18;
      p.size = Math.random() * 5 + 3;
      p.color = color || ['#ffd54f','#00e5ff','#b388ff','#ff5252','#69f0ae','#fff'][Math.floor(Math.random()*6)];
      p.decay = .012 + Math.random() * .008;
      p.spin = (Math.random()-.5) * .2;
      break;
    case 'basketball':
      p.vx = (Math.random()-.5) * 4;
      p.vy = -(Math.random() * 4 + 1);
      p.gravity = .22;
      p.size = Math.random() * 6 + 4;
      p.color = '#ff8a3d';
      p.decay = .015 + Math.random() * .008;
      p.spin = (Math.random()-.5) * .15;
      break;
    case 'energy':
      p.vx = (Math.random()-.5) * 3;
      p.vy = -(Math.random() * 3 + 1.5);
      p.gravity = -.04;
      p.size = Math.random() * 3 + 1.5;
      p.color = color || '#ffd54f';
      p.decay = .018 + Math.random() * .01;
      p.spin = 0;
      break;
    case 'spark':
      p.vx = (Math.random()-.5) * 6;
      p.vy = (Math.random()-.5) * 6;
      p.gravity = 0;
      p.size = Math.random() * 2 + 1;
      p.color = color || '#fff';
      p.decay = .04 + Math.random() * .03;
      p.spin = 0;
      break;
    default:
      p.vx = (Math.random()-.5) * 3;
      p.vy = -(Math.random() * 3);
      p.gravity = .1;
      p.size = 3;
      p.color = color || '#ffd54f';
      p.decay = .02;
      p.spin = 0;
  }
  return p;
}

function spawnParticles(type, x, y, count, color) {
  initVFX();
  for (let i = 0; i < count; i++) {
    if (particles.length >= MAX_PARTICLES) particles.shift();
    particles.push(createParticle(type, x + (Math.random()-0.5)*20, y + (Math.random()-0.5)*20, color));
  }
  if (!running) startLoop();
}

function spawnConfetti(x, y) { spawnParticles('confetti', x, y, 40); }
function spawnBasketballParticles(x, y) { spawnParticles('basketball', x, y, 15); }
function spawnEnergyParticles(x, y, color) { spawnParticles('energy', x, y, 20, color); }
function spawnSparks(x, y, color) { spawnParticles('spark', x, y, 12, color); }

function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += p.gravity;
    p.life -= p.decay;
    p.rotation += p.spin;
    if (p.life <= 0) { particles.splice(i, 1); }
  }
}

function drawParticles() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (const p of particles) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);
    if (p.type === 'confetti') {
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size/2, -p.size/4, p.size, p.size/2);
    } else if (p.type === 'basketball') {
      // Mini basketball with seam
      ctx.beginPath();
      ctx.arc(0, 0, p.size, 0, Math.PI*2);
      ctx.fillStyle = p.color;
      ctx.fill();
      ctx.strokeStyle = 'rgba(139,69,19,.5)';
      ctx.lineWidth = .8;
      ctx.beginPath();
      ctx.moveTo(-p.size, 0);
      ctx.lineTo(p.size, 0);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, p.size, 0, Math.PI*2);
      ctx.strokeStyle = 'rgba(139,69,19,.4)';
      ctx.stroke();
    } else if (p.type === 'energy') {
      ctx.beginPath();
      ctx.arc(0, 0, p.size, 0, Math.PI*2);
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, p.size, 0, Math.PI*2);
      ctx.fillStyle = p.color;
      ctx.fill();
    }
    ctx.restore();
  }
}

function loop() {
  if (particles.length === 0) { running = false; rafId = null; return; }
  updateParticles();
  drawParticles();
  rafId = requestAnimationFrame(loop);
}

function startLoop() {
  running = true;
  rafId = requestAnimationFrame(loop);
}

// ==================== ANIMATION UTILITIES ====================

function animateCountUp(el, from, to, duration) {
  if (!el) return;
  const start = performance.now();
  const diff = to - from;
  function tick(now) {
    const t = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - t, 3);
    el.textContent = Math.round(from + diff * eased);
    if (t < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

function animateStatBars(container) {
  if (!container) return;
  const bars = container.querySelectorAll('.bar-fill[data-target], .home-mini-track span[data-target]');
  bars.forEach((bar, i) => {
    const target = bar.dataset.target;
    if (target == null) return;
    bar.style.width = '0%';
    setTimeout(() => { bar.style.width = target + '%'; }, 80 + i * 60);
  });
}

function flashScreen(color, duration) {
  const flash = document.createElement('div');
  flash.className = 'screen-flash';
  flash.style.background = color || 'rgba(248,193,77,.15)';
  if (duration) flash.style.animationDuration = duration + 'ms';
  document.body.appendChild(flash);
  flash.addEventListener('animationend', () => flash.remove());
}

function shakeElement(el) {
  if (!el) return;
  el.style.animation = 'none';
  el.offsetHeight; // reflow
  el.style.animation = 'shake .4s ease';
  el.addEventListener('animationend', () => { el.style.animation = ''; }, { once: true });
}

function playUpgradeFlash(barEl) {
  if (!barEl) return;
  barEl.classList.add('upgrade-flash-bar');
  setTimeout(() => barEl.classList.remove('upgrade-flash-bar'), 500);
}

function addFloatText(parentEl, text, color) {
  if (!parentEl) return;
  const ft = document.createElement('span');
  ft.className = 'float-plus';
  ft.textContent = text;
  ft.style.color = color || '#69f0ae';
  parentEl.style.position = 'relative';
  parentEl.appendChild(ft);
  ft.addEventListener('animationend', () => ft.remove());
}

function addRipple(btn, e) {
  if (!btn || !e) return;
  const rect = btn.getBoundingClientRect();
  const ripple = document.createElement('span');
  ripple.className = 'btn-ripple';
  const size = Math.max(rect.width, rect.height);
  ripple.style.width = ripple.style.height = size + 'px';
  ripple.style.left = (e.clientX - rect.left - size/2) + 'px';
  ripple.style.top = (e.clientY - rect.top - size/2) + 'px';
  btn.appendChild(ripple);
  ripple.addEventListener('animationend', () => ripple.remove());
}

// Add ripple to all .btn clicks via delegation
document.addEventListener('click', function(e) {
  const btn = e.target.closest('.btn');
  if (btn) addRipple(btn, e);
});

// ==================== SVG ICON LIBRARY ====================
// viewBox="0 0 24 24", uses currentColor
const SVG_ICONS = {
  home: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1h-2z"/></svg>`,

  matches: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 3c-1.5 2-2 5-2 9s.5 7 2 9"/><path d="M12 3c1.5 2 2 5 2 9s-.5 7-2 9"/><path d="M3 12h18"/><ellipse cx="12" cy="12" rx="4" ry="9"/></svg>`,

  stats: `<svg viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="12" width="4" height="9" rx="1"/><rect x="10" y="6" width="4" height="15" rx="1"/><rect x="17" y="2" width="4" height="19" rx="1"/></svg>`,

  roster: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="9" cy="7" r="3.5"/><path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2"/><circle cx="18" cy="8" r="2.5"/><path d="M18 14a3.5 3.5 0 013.5 3.5V19"/></svg>`,

  upgrade: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`,

  commerce: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 3v18"/><path d="M15 8.5c0-1.5-1.3-2.5-3-2.5s-3 1-3 2.5 1.3 2.5 3 2.5 3 1 3 2.5-1.3 2.5-3 2.5-3-1-3-2.5"/></svg>`,

  trade: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 16l-4-4 4-4"/><path d="M17 8l4 4-4 4"/><path d="M3 12h18"/><path d="M3 12l6-3"/><path d="M21 12l-6 3"/></svg>`,

  awards: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 010-5H6"/><path d="M18 9h1.5a2.5 2.5 0 000-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20 17 22"/><path d="M18 2H6v7a6 6 0 1012 0V2z"/></svg>`,

  phone: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 18h.01"/></svg>`,

  settings: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>`,

  save: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>`,

  basketball: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2c-2.5 3-4 6.5-4 10s1.5 7 4 10"/><path d="M12 2c2.5 3 4 6.5 4 10s-1.5 7-4 10"/></svg>`,

  xfactor: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>`,

  trophy: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 010-5H6"/><path d="M18 9h1.5a2.5 2.5 0 000-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20 17 22"/><path d="M18 2H6v7a6 6 0 1012 0V2z"/></svg>`,

  court: `<svg viewBox="0 0 500 470" fill="none"><rect x="10" y="10" width="480" height="450" rx="4" stroke="rgba(253,185,39,.08)" stroke-width="2" class="court-line"/><circle cx="250" cy="470" r="60" stroke="rgba(253,185,39,.08)" stroke-width="2" class="court-line"/><path d="M50 470 Q50 200 250 200 Q450 200 450 470" stroke="rgba(253,185,39,.08)" stroke-width="2" class="court-line"/><rect x="170" y="350" width="160" height="120" stroke="rgba(253,185,39,.08)" stroke-width="2" class="court-line"/><circle cx="250" cy="350" r="60" stroke="rgba(253,185,39,.08)" stroke-width="2" class="court-line"/><circle cx="250" cy="430" r="8" fill="none" stroke="rgba(253,185,39,.12)" stroke-width="2"/></svg>`,

  playerSilhouette: `<svg viewBox="0 0 300 500" fill="rgba(253,185,39,.08)"><ellipse cx="150" cy="52" rx="32" ry="38"/><path d="M120 90c-10 5-22 35-28 70s-5 55 5 65c8 7 20 5 25-2l10-40 8 50c5 30 15 70 25 95l5 15c5 12 15 18 28 15s18-12 15-25l-5-20-15-60 10-65c5-25 8-50 5-70s-15-30-30-35c-10-3-22 0-30 5l-28 2z"/><path d="M115 230l-15 80c-5 22-8 45-5 60l3 18c2 12 12 18 25 16s18-10 17-22l-2-20 10-55"/></svg>`,

  loadingBall: `<svg viewBox="0 0 40 40" fill="none"><circle cx="20" cy="20" r="16" fill="#ff8a3d" stroke="#8b5e3c" stroke-width="1.5"/><path d="M4 20h32" stroke="#8b5e3c" stroke-width="1" opacity=".5"/><ellipse cx="20" cy="20" rx="8" ry="16" stroke="#8b5e3c" stroke-width="1" opacity=".5"/><path d="M12 6c4 6 4 22 0 28M28 6c-4 6-4 22 0 28" stroke="#8b5e3c" stroke-width="1" opacity=".4"/></svg>`
};

function svgIcon(name, size) {
  const svg = SVG_ICONS[name];
  if (!svg) return '';
  const s = size || 18;
  return svg.replace('<svg ', `<svg width="${s}" height="${s}" `);
}

// ==================== SVG COURT BACKGROUND ====================
function svgCourtBg() {
  return `<div class="court-bg-svg" aria-hidden="true">
    <svg viewBox="0 0 500 470" fill="none" style="width:100%;height:100%">
      <rect x="10" y="10" width="480" height="450" rx="4" stroke="rgba(253,185,39,.08)" stroke-width="2" class="court-line"/>
      <circle cx="250" cy="470" r="60" stroke="rgba(253,185,39,.08)" stroke-width="2" class="court-line"/>
      <path d="M50 470 Q50 200 250 200 Q450 200 450 470" stroke="rgba(253,185,39,.08)" stroke-width="2" class="court-line"/>
      <rect x="170" y="350" width="160" height="120" stroke="rgba(253,185,39,.08)" stroke-width="2" class="court-line"/>
      <circle cx="250" cy="350" r="60" stroke="rgba(253,185,39,.08)" stroke-width="2" class="court-line"/>
      <circle cx="250" cy="430" r="8" fill="none" stroke="rgba(253,185,39,.12)" stroke-width="2"/>
    </svg>
  </div>`;
}

// ==================== SVG PLAYER SILHOUETTE ====================
function svgPlayerSilhouette() {
  return `<div class="player-watermark" aria-hidden="true">
    <svg viewBox="0 0 300 500" fill="rgba(253,185,39,.08)" style="width:100%;height:100%">
      <ellipse cx="150" cy="52" rx="32" ry="38"/>
      <path d="M120 90c-10 5-22 35-28 70s-5 55 5 65c8 7 20 5 25-2l10-40 8 50c5 30 15 70 25 95l5 15c5 12 15 18 28 15s18-12 15-25l-5-20-15-60 10-65c5-25 8-50 5-70s-15-30-30-35c-10-3-22 0-30 5l-28 2z"/>
    </svg>
  </div>`;
}

// ==================== SVG RADAR CHART (for Upgrade Page) ====================
function buildRadarSVG(attrs, labels) {
  // attrs: array of numbers 0-99, labels: array of strings
  // Both length 10
  const n = Math.min(attrs.length, labels.length, 10);
  if (n < 3) return '';
  const cx = 150, cy = 150, r = 110;
  const levels = 4;
  let svg = `<svg class="radar-chart-svg" viewBox="0 0 300 300" aria-label="Attribute Radar">`;

  // Grid levels
  for (let l = 1; l <= levels; l++) {
    const lr = r * l / levels;
    let pts = [];
    for (let i = 0; i < n; i++) {
      const angle = (Math.PI * 2 * i / n) - Math.PI / 2;
      pts.push(`${cx + lr * Math.cos(angle)},${cy + lr * Math.sin(angle)}`);
    }
    svg += `<polygon class="radar-grid" points="${pts.join(' ')}"/>`;
  }

  // Axes
  for (let i = 0; i < n; i++) {
    const angle = (Math.PI * 2 * i / n) - Math.PI / 2;
    svg += `<line class="radar-axis" x1="${cx}" y1="${cy}" x2="${cx + r * Math.cos(angle)}" y2="${cy + r * Math.sin(angle)}"/>`;
  }

  // Data polygon
  let dataPts = [];
  for (let i = 0; i < n; i++) {
    const angle = (Math.PI * 2 * i / n) - Math.PI / 2;
    const val = Math.max(0, Math.min(99, attrs[i])) / 99;
    dataPts.push(`${cx + r * val * Math.cos(angle)},${cy + r * val * Math.sin(angle)}`);
  }
  svg += `<polygon class="radar-data" points="${dataPts.join(' ')}" fill="rgba(45,102,255,.18)" stroke="rgba(83,216,255,.7)" stroke-width="2"/>`;

  // Data points
  for (let i = 0; i < n; i++) {
    const angle = (Math.PI * 2 * i / n) - Math.PI / 2;
    const val = Math.max(0, Math.min(99, attrs[i])) / 99;
    svg += `<circle cx="${cx + r * val * Math.cos(angle)}" cy="${cy + r * val * Math.sin(angle)}" r="3.5" fill="var(--cyan)" stroke="#fff" stroke-width="1"/>`;
  }

  // Labels
  for (let i = 0; i < n; i++) {
    const angle = (Math.PI * 2 * i / n) - Math.PI / 2;
    const lx = cx + (r + 22) * Math.cos(angle);
    const ly = cy + (r + 22) * Math.sin(angle);
    svg += `<text class="radar-label" x="${lx}" y="${ly}">${labels[i]}</text>`;
  }

  svg += `</svg>`;
  return svg;
}

// ==================== LOADING SPINNER ====================
function showLoading() {
  const el = document.createElement('div');
  el.id = 'vfxLoading';
  el.style.cssText = 'position:fixed;inset:0;z-index:9997;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.5);pointer-events:all;';
  el.innerHTML = `<div class="loading-spinner">${SVG_ICONS.loadingBall}</div>`;
  document.body.appendChild(el);
}
function hideLoading() {
  const el = document.getElementById('vfxLoading');
  if (el) el.remove();
}

// ==================== INIT ON DOM READY ====================
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initVFX);
} else {
  initVFX();
}

// Expose globals
window.spawnParticles = spawnParticles;
window.spawnConfetti = spawnConfetti;
window.spawnBasketballParticles = spawnBasketballParticles;
window.spawnEnergyParticles = spawnEnergyParticles;
window.spawnSparks = spawnSparks;
window.animateCountUp = animateCountUp;
window.animateStatBars = animateStatBars;
window.flashScreen = flashScreen;
window.shakeElement = shakeElement;
window.playUpgradeFlash = playUpgradeFlash;
window.addFloatText = addFloatText;
window.svgIcon = svgIcon;
window.svgCourtBg = svgCourtBg;
window.svgPlayerSilhouette = svgPlayerSilhouette;
window.buildRadarSVG = buildRadarSVG;
window.showLoading = showLoading;
window.hideLoading = hideLoading;
window.initVFX = initVFX;

})();
