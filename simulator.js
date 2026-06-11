'use strict';
/* ===================================================
   수능 수학 킬러 대비 - 삼각함수 교점 시뮬레이터
   JavaScript - iOS/iPad/모바일 완전 대응 버전
   =================================================== */

// ─────────────────────────────────────────────
//  STATE
// ─────────────────────────────────────────────
const state = {
  funcType: 'sin',
  A: 1, B: 1, C: 0, D: 0,
  m: 0.3, n: 0.5,
};

const X_MIN = 0;
const X_MAX = 10;
const Y_MIN = -3;
const Y_MAX = 3;

// ─────────────────────────────────────────────
//  CANVAS SETUP
// ─────────────────────────────────────────────
const canvas = document.getElementById('graph-canvas');
const ctx    = canvas.getContext('2d');

// iOS: devicePixelRatio 를 초기에 고정 (동적 변경 대응)
let DPR = Math.min(window.devicePixelRatio || 1, 3); // 3 이상은 불필요하게 무거움

// canvas 크기를 컨테이너에 맞춤
function resizeCanvas() {
  const container = document.getElementById('canvas-container');
  if (!container) return;

  const rect = container.getBoundingClientRect();
  const w    = Math.floor(rect.width);
  const h    = Math.floor(rect.height);

  if (w === 0 || h === 0) return;

  DPR = Math.min(window.devicePixelRatio || 1, 3);

  canvas.width  = w * DPR;
  canvas.height = h * DPR;
  canvas.style.width  = w + 'px';
  canvas.style.height = h + 'px';

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(DPR, DPR);

  draw();
}

// ─────────────────────────────────────────────
//  COORDINATE TRANSFORMS
// ─────────────────────────────────────────────
function toCanvasX(x) {
  const w = canvas.width / DPR;
  return ((x - X_MIN) / (X_MAX - X_MIN)) * w;
}

function toCanvasY(y) {
  const h = canvas.height / DPR;
  return h - ((y - Y_MIN) / (Y_MAX - Y_MIN)) * h;
}

// ─────────────────────────────────────────────
//  MATH FUNCTIONS
// ─────────────────────────────────────────────
function evalTrig(x, A, B, C, D, type) {
  const arg = B * (x - C);
  let inner;
  if      (type === 'sin') inner = A * Math.sin(arg) + D;
  else if (type === 'cos') inner = A * Math.cos(arg) + D;
  else                     inner = A * Math.tan(arg) + D;
  return Math.abs(inner);
}

function evalOrigTrig(x, A, B, C, D, type) {
  const arg = B * (x - C);
  if      (type === 'sin') return A * Math.sin(arg) + D;
  else if (type === 'cos') return A * Math.cos(arg) + D;
  else                     return A * Math.tan(arg) + D;
}

function evalLine(x, m, n) {
  return m * x + n;
}

// ─────────────────────────────────────────────
//  INTERSECTION FINDER (이분법 Bisection)
// ─────────────────────────────────────────────
// 모바일 성능: 샘플 수를 화면 너비에 맞게 동적 조정
function getSamples() {
  const w = canvas.width / DPR;
  return Math.max(1500, Math.min(3000, Math.round(w * 4)));
}

function findIntersections(A, B, C, D, m, n, type) {
  const pts    = [];
  const SAMPLES = getSamples();
  const step   = (X_MAX - X_MIN) / SAMPLES;
  const EPS    = 1e-9;
  const MAX_Y  = 100; // tan 점근선 필터

  function diff(x) {
    const ty = evalTrig(x, A, B, C, D, type);
    if (!isFinite(ty) || ty > MAX_Y) return NaN;
    return ty - evalLine(x, m, n);
  }

  let prevX = X_MIN;
  let prevD = diff(X_MIN);

  for (let i = 1; i <= SAMPLES; i++) {
    const curX = X_MIN + i * step;
    const curD = diff(curX);

    if (isNaN(prevD) || isNaN(curD)) {
      prevX = curX; prevD = curD; continue;
    }

    if (prevD * curD <= 0 && prevD !== 0) {
      // 이분법
      let lo = prevX, hi = curX;
      let loD = prevD;

      for (let j = 0; j < 52; j++) {
        const mid  = (lo + hi) * 0.5;
        const midD = diff(mid);
        if (isNaN(midD)) break;
        if (Math.abs(midD) < EPS) { lo = hi = mid; break; }
        if (loD * midD <= 0) { hi = mid; }
        else                 { lo = mid; loD = midD; }
      }

      const px = (lo + hi) * 0.5;
      const py = evalLine(px, m, n);
      const isDup = pts.some(p => Math.abs(p.x - px) < 0.02);
      if (!isDup && px >= X_MIN && px <= X_MAX && isFinite(py)) {
        pts.push({ x: px, y: py });
      }
    }

    prevX = curX;
    prevD = curD;
  }

  return pts;
}

// ─────────────────────────────────────────────
//  COLORS
// ─────────────────────────────────────────────
const COLORS = {
  sin:        '#4f8ef7',
  cos:        '#a855f7',
  tan:        '#fb923c',
  line:       '#22d3a5',
  inter:      '#fbbf24',
  grid:       'rgba(255,255,255,0.055)',
  axis:       'rgba(255,255,255,0.18)',
  label:      'rgba(255,255,255,0.4)',
  background: '#0f1628',
};

// ─────────────────────────────────────────────
//  DRAW
// ─────────────────────────────────────────────
// iOS 성능 최적화: 이전 프레임과 state가 같으면 skip (throttle)
let rafId    = null;
let lastDraw = '';

function requestDraw() {
  if (rafId) cancelAnimationFrame(rafId);
  rafId = requestAnimationFrame(() => {
    rafId = null;
    const key = JSON.stringify(state) + canvas.width + canvas.height;
    if (key === lastDraw) return;
    lastDraw = key;
    draw();
  });
}

function draw() {
  const W = canvas.width  / DPR;
  const H = canvas.height / DPR;
  const { A, B, C, D, m, n, funcType } = state;

  // ── Background
  ctx.fillStyle = COLORS.background;
  ctx.fillRect(0, 0, W, H);

  // ── Grid (정수 눈금)
  ctx.lineWidth   = 1;
  ctx.strokeStyle = COLORS.grid;

  for (let x = Math.ceil(X_MIN); x <= X_MAX; x++) {
    const cx = toCanvasX(x);
    ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, H); ctx.stroke();
  }
  for (let y = Math.ceil(Y_MIN); y <= Y_MAX; y++) {
    const cy = toCanvasY(y);
    ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(W, cy); ctx.stroke();
  }

  // ── Axes
  ctx.lineWidth   = 1.5;
  ctx.strokeStyle = COLORS.axis;

  const cy0 = toCanvasY(0);
  ctx.beginPath(); ctx.moveTo(0, cy0); ctx.lineTo(W, cy0); ctx.stroke();

  const cx0 = toCanvasX(0);
  ctx.beginPath(); ctx.moveTo(cx0, 0); ctx.lineTo(cx0, H); ctx.stroke();

  // ── Axis Labels (iOS: 폰트 fallback 포함)
  const fontSize = Math.max(9, Math.min(12, W / 60));
  ctx.fillStyle = COLORS.label;
  ctx.font = `${fontSize}px "JetBrains Mono", "Courier New", monospace`;
  ctx.textAlign = 'center';

  for (let x = 1; x <= X_MAX; x++) {
    if (x % 2 === 0 || W > 400) { // 좁은 화면에서는 짝수만
      ctx.fillText(String(x), toCanvasX(x), cy0 + 13);
    }
  }

  ctx.textAlign = 'right';
  for (let y = Math.ceil(Y_MIN); y <= Y_MAX; y++) {
    if (y === 0) continue;
    ctx.fillText(String(y), cx0 - 4, toCanvasY(y) + 4);
  }

  // ── D 폴딩 보조선
  if (D !== 0 && Math.abs(D) <= Y_MAX) {
    const cyD = toCanvasY(Math.abs(D));
    ctx.setLineDash([4, 7]);
    ctx.lineWidth   = 1;
    ctx.strokeStyle = 'rgba(168,85,247,0.35)';
    ctx.beginPath(); ctx.moveTo(0, cyD); ctx.lineTo(W, cyD); ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = 'rgba(168,85,247,0.55)';
    ctx.font      = `${Math.max(9, fontSize - 1)}px "Noto Sans KR", sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText('폴딩 y=|D|', cx0 + 4, cyD - 3);
  }

  // ── 원래 삼각함수 (점선)
  const origAlpha = funcType === 'sin' ? 'rgba(79,142,247,0.3)'
                  : funcType === 'cos' ? 'rgba(168,85,247,0.3)'
                  :                      'rgba(251,146,60,0.3)';

  ctx.setLineDash([4, 5]);
  ctx.lineWidth   = 1;
  ctx.strokeStyle = origAlpha;
  _plotFunction(evalOrigTrig, A, B, C, D, funcType, 1000, false);
  ctx.setLineDash([]);

  // ── 절댓값 삼각함수 (실선, glow)
  const trigColor = COLORS[funcType] || COLORS.sin;

  ctx.lineWidth   = 2.5;
  ctx.strokeStyle = trigColor;
  // iOS Safari에서 shadowBlur는 성능 저하 → 작은 화면에서는 비활성화
  const useGlow = W > 500;
  if (useGlow) { ctx.shadowColor = trigColor; ctx.shadowBlur = 6; }
  _plotFunction(evalTrig, A, B, C, D, funcType, 2000, true);
  if (useGlow) ctx.shadowBlur = 0;

  // ── 직선 y = mx + n
  ctx.lineWidth   = 2;
  ctx.strokeStyle = COLORS.line;
  if (useGlow) { ctx.shadowColor = COLORS.line; ctx.shadowBlur = 5; }
  ctx.beginPath();
  ctx.moveTo(toCanvasX(X_MIN), toCanvasY(evalLine(X_MIN, m, n)));
  ctx.lineTo(toCanvasX(X_MAX), toCanvasY(evalLine(X_MAX, m, n)));
  ctx.stroke();
  if (useGlow) ctx.shadowBlur = 0;

  // ── 교점
  const inters = findIntersections(A, B, C, D, m, n, funcType);
  const dotR   = Math.max(4, Math.min(6, W / 120));

  inters.forEach(pt => {
    const px = toCanvasX(pt.x);
    const py = toCanvasY(pt.y);

    if (py < -10 || py > H + 10) return; // 화면 밖 제외

    // 글로우 링
    ctx.beginPath();
    ctx.arc(px, py, dotR + 4, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(251,191,36,0.15)';
    ctx.fill();

    // 흰 테두리
    ctx.beginPath();
    ctx.arc(px, py, dotR + 1.5, 0, Math.PI * 2);
    ctx.fillStyle = 'white';
    ctx.fill();

    // 코어 점
    ctx.beginPath();
    ctx.arc(px, py, dotR, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.inter;
    if (useGlow) { ctx.shadowColor = COLORS.inter; ctx.shadowBlur = 10; }
    ctx.fill();
    if (useGlow) ctx.shadowBlur = 0;
  });

  // ── UI 업데이트
  updateIntersectionUI(inters);
}

// 삼각함수 경로 그리기 헬퍼
function _plotFunction(evalFn, A, B, C, D, type, steps, isAbs) {
  const MAX_Y = 20;
  let first    = true;

  ctx.beginPath();
  for (let i = 0; i <= steps; i++) {
    const x  = X_MIN + (i / steps) * (X_MAX - X_MIN);
    const ry = evalFn(x, A, B, C, D, type);

    if (!isFinite(ry) || Math.abs(ry) > MAX_Y) {
      first = true; continue;
    }

    const cy = toCanvasY(ry);
    if (first) { ctx.moveTo(toCanvasX(x), cy); first = false; }
    else        { ctx.lineTo(toCanvasX(x), cy); }
  }
  ctx.stroke();
}

// ─────────────────────────────────────────────
//  UI UPDATES
// ─────────────────────────────────────────────
function updateIntersectionUI(inters) {
  const countEl   = document.getElementById('intersection-count');
  const listEl    = document.getElementById('intersection-list');
  const prevCount = parseInt(countEl.textContent) || -1;
  const newCount  = inters.length;

  countEl.textContent = newCount;
  if (prevCount !== newCount) {
    countEl.classList.remove('changed');
    void countEl.offsetWidth;
    countEl.classList.add('changed');
  }

  listEl.innerHTML = '';
  inters.forEach((pt, i) => {
    const chip = document.createElement('span');
    chip.className   = 'inter-chip';
    chip.textContent = `P${i+1}(${pt.x.toFixed(2)}, ${pt.y.toFixed(2)})`;
    listEl.appendChild(chip);
  });

  updateTip(newCount);
}

const TIPS = {
  sin: [
    '주기 계수 B를 늘리면 주기가 짧아져 교점 수가 증가합니다.',
    'D를 ±1 근처로 조절하면 절댓값 꺾임 위치가 극값 근처로 이동합니다.',
    '직선 기울기 m이 작을수록 더 많은 교점을 가질 수 있습니다.',
    'C(위상이동)를 변경하면 첫 번째 교점의 x좌표가 달라집니다.',
  ],
  cos: [
    'x=0에서 cos(0)=1이므로 코사인은 처음부터 최댓값으로 시작합니다.',
    'D=0.5이면 cos+0.5=0 → cos=−0.5인 점에서 꺾임이 발생합니다.',
    'B=2이면 주기가 π로 짧아져 [0,10] 구간에 약 3개의 완전한 주기가 포함됩니다.',
    'y=k(수평선) 형태로 설정하면 교점=k와 극값의 관계를 명확히 볼 수 있습니다.',
  ],
  tan: [
    '|tan(x)|의 주기는 π/2로, 사인/코사인 절반입니다.',
    '점근선(tan→∞) 근처에서 교점은 항상 최소 1개 이상 발생합니다.',
    'D를 조절하면 각 V-패턴의 최솟값 위치가 달라집니다.',
    '기울기 m이 클수록 후반부 구간에서 교점이 줄어듭니다.',
  ],
};

let tipCycleTimer = null;
function updateTip(count) {
  const tipEl = document.getElementById('tip-text');
  if (!tipEl) return;

  if (count === 0) {
    tipEl.textContent = '⚠️ 교점이 없습니다. 직선의 y절편(n)을 높이거나 기울기(m)를 줄여보세요.';
  } else {
    const tips = TIPS[state.funcType];
    const idx  = Math.floor(Date.now() / 8000) % tips.length;
    tipEl.textContent = tips[idx];
  }
}

function updateFormulaDisplay() {
  const { A, B, C, D, m, n, funcType } = state;
  const trigEl = document.getElementById('formula-trig');
  const lineEl = document.getElementById('formula-line');
  if (!trigEl || !lineEl) return;

  const Astr  = A === 1  ? '' : A.toFixed(1);
  const Bstr  = B === 1  ? '' : B.toFixed(1);
  const Cstr  = C === 0  ? 'x' : (C > 0 ? `(x−${C.toFixed(1)})` : `(x+${Math.abs(C).toFixed(1)})`);
  const Dstr  = D === 0  ? '' : (D > 0 ? ` + ${D.toFixed(1)}` : ` − ${Math.abs(D).toFixed(1)}`);
  const inner = `${Astr}${funcType}(${Bstr}${Cstr})${Dstr}`;

  trigEl.textContent = `y = |${inner}|`;

  const mStr = m === 0  ? '0' : `${m.toFixed(2)}x`;
  const nStr = n === 0  ? '' : (n > 0 ? ` + ${n.toFixed(1)}` : ` − ${Math.abs(n).toFixed(1)}`);
  lineEl.textContent = `y = ${mStr}${nStr}`;
}

// ─────────────────────────────────────────────
//  SLIDERS
// ─────────────────────────────────────────────
const SLIDERS = [
  { id: 'slider-A', key: 'A', valId: 'val-A', digits: 1 },
  { id: 'slider-B', key: 'B', valId: 'val-B', digits: 1 },
  { id: 'slider-C', key: 'C', valId: 'val-C', digits: 1 },
  { id: 'slider-D', key: 'D', valId: 'val-D', digits: 1 },
  { id: 'slider-m', key: 'm', valId: 'val-m', digits: 2 },
  { id: 'slider-n', key: 'n', valId: 'val-n', digits: 1 },
];

SLIDERS.forEach(({ id, key, valId, digits }) => {
  const el  = document.getElementById(id);
  const val = document.getElementById(valId);
  if (!el || !val) return;

  function onInput() {
    state[key] = parseFloat(el.value);
    val.textContent = parseFloat(el.value).toFixed(digits);
    updateFormulaDisplay();
    requestDraw();
  }

  // iOS: input 이벤트가 실시간 반응 (change는 손 뗄 때만)
  el.addEventListener('input',  onInput);
  el.addEventListener('change', onInput); // 일부 Android 구형 대응
});

// ─────────────────────────────────────────────
//  FUNCTION TYPE BUTTONS
// ─────────────────────────────────────────────
document.querySelectorAll('.func-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.func-btn').forEach(b => {
      b.classList.remove('active');
      b.setAttribute('aria-pressed', 'false');
    });
    btn.classList.add('active');
    btn.setAttribute('aria-pressed', 'true');
    state.funcType = btn.dataset.func;
    updateLegendColor();
    updateFormulaDisplay();
    requestDraw();
  });
});

function updateLegendColor() {
  const trigL = document.querySelector('.trig-color');
  const origL = document.querySelector('.orig-color');
  if (!trigL || !origL) return;
  const colors = { sin: '#4f8ef7', cos: '#a855f7', tan: '#fb923c' };
  const c = colors[state.funcType];
  trigL.style.background    = c;
  origL.style.borderTopColor = c;
}

// ─────────────────────────────────────────────
//  RESET
// ─────────────────────────────────────────────
document.getElementById('reset-btn')?.addEventListener('click', () => {
  Object.assign(state, { funcType: 'sin', A: 1, B: 1, C: 0, D: 0, m: 0.3, n: 0.5 });

  const set = (id, v, d) => {
    const el = document.getElementById(id);
    if (el) el.value = v;
    const vEl = document.getElementById('val-' + id.replace('slider-', ''));
    if (vEl) vEl.textContent = parseFloat(v).toFixed(d);
  };

  set('slider-A', 1,   1);
  set('slider-B', 1,   1);
  set('slider-C', 0,   1);
  set('slider-D', 0,   1);
  set('slider-m', 0.3, 2);
  set('slider-n', 0.5, 1);

  document.querySelectorAll('.func-btn').forEach(b => {
    b.classList.remove('active');
    b.setAttribute('aria-pressed', 'false');
  });
  const sinBtn = document.getElementById('btn-sin');
  if (sinBtn) { sinBtn.classList.add('active'); sinBtn.setAttribute('aria-pressed', 'true'); }

  updateLegendColor();
  updateFormulaDisplay();
  requestDraw();
});

// ─────────────────────────────────────────────
//  MOBILE CONTROLS TOGGLE (접기/펼치기)
// ─────────────────────────────────────────────
const toggleBtn  = document.getElementById('controls-toggle');
const controlsBody = document.getElementById('controls-body');
const toggleArrow  = document.getElementById('toggle-arrow');

let isControlsOpen = true;

if (toggleBtn && controlsBody) {
  // 초기: 모바일에서는 기본 열림
  function initControlsState() {
    const isTablet = window.innerWidth >= 768;
    // 태블릿/데스크탑: 항상 열림 (CSS에서 display:flex 강제)
    if (isTablet) {
      controlsBody.style.display = 'flex';
      isControlsOpen = true;
    } else {
      // 모바일: 열린 상태
      controlsBody.style.display = 'flex';
      isControlsOpen = true;
      if (toggleArrow) toggleArrow.classList.remove('collapsed');
    }
  }

  toggleBtn.addEventListener('click', () => {
    // 768px 이상에서는 토글 무시 (CSS에서 버튼 hidden)
    if (window.innerWidth >= 768) return;

    isControlsOpen = !isControlsOpen;
    controlsBody.style.display = isControlsOpen ? 'flex' : 'none';
    if (toggleArrow) {
      if (isControlsOpen) toggleArrow.classList.remove('collapsed');
      else                toggleArrow.classList.add('collapsed');
    }
    toggleBtn.setAttribute('aria-expanded', String(isControlsOpen));

    // 열릴 때 캔버스 리사이즈
    if (isControlsOpen) {
      setTimeout(resizeCanvas, 100);
    }
  });

  initControlsState();
}

// ─────────────────────────────────────────────
//  TABS
// ─────────────────────────────────────────────
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const tabId = btn.dataset.tab;

    document.querySelectorAll('.tab-btn').forEach(b => {
      b.classList.remove('active');
      b.setAttribute('aria-selected', 'false');
    });
    btn.classList.add('active');
    btn.setAttribute('aria-selected', 'true');

    document.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));
    const tabEl = document.getElementById('tab-' + tabId);
    if (tabEl) tabEl.classList.add('active');

    if (tabId === 'simulator') {
      // iOS: 탭 전환 후 레이아웃 안정화 기다렸다가 리사이즈
      setTimeout(resizeCanvas, 80);
    }

    // iOS Safari: 탭 전환 시 스크롤 위로
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
});

// ─────────────────────────────────────────────
//  PROBLEM FILTER
// ─────────────────────────────────────────────
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const filter = btn.dataset.filter;
    document.querySelectorAll('.problem-card').forEach(card => {
      if (filter === 'all' || card.dataset.type === filter) card.classList.remove('hidden');
      else card.classList.add('hidden');
    });
  });
});

// ─────────────────────────────────────────────
//  SIMULATOR BUTTONS (문제 탭)
// ─────────────────────────────────────────────
function applySimState(A, B, C, D, m, n, func) {
  state.funcType = func;
  state.A = A; state.B = B; state.C = C; state.D = D;
  state.m = m; state.n = n;

  const setSlider = (id, v, d) => {
    const el  = document.getElementById(id);
    const key = id.replace('slider-', '');
    const vEl = document.getElementById('val-' + key);
    if (el)  el.value = v;
    if (vEl) vEl.textContent = parseFloat(v).toFixed(d);
  };

  setSlider('slider-A', A, 1);
  setSlider('slider-B', B, 1);
  setSlider('slider-C', C, 1);
  setSlider('slider-D', D, 1);
  setSlider('slider-m', m, 2);
  setSlider('slider-n', n, 1);

  document.querySelectorAll('.func-btn').forEach(b => {
    b.classList.remove('active');
    b.setAttribute('aria-pressed', 'false');
  });
  const activeBtn = document.getElementById('btn-' + func);
  if (activeBtn) { activeBtn.classList.add('active'); activeBtn.setAttribute('aria-pressed', 'true'); }

  // 시뮬레이터 탭으로 이동
  document.querySelectorAll('.tab-btn').forEach(b => {
    b.classList.remove('active');
    b.setAttribute('aria-selected', 'false');
  });
  const simTab = document.querySelector('[data-tab="simulator"]');
  if (simTab) { simTab.classList.add('active'); simTab.setAttribute('aria-selected', 'true'); }

  document.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));
  const simContent = document.getElementById('tab-simulator');
  if (simContent) simContent.classList.add('active');

  window.scrollTo({ top: 0, behavior: 'smooth' });

  updateLegendColor();
  updateFormulaDisplay();
  setTimeout(resizeCanvas, 80);
}

document.querySelectorAll('.sim-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const func = btn.dataset.func;
    const A = parseFloat(btn.dataset.a ?? btn.dataset.A ?? 1);
    const B = parseFloat(btn.dataset.b ?? btn.dataset.B ?? 1);
    const C = parseFloat(btn.dataset.c ?? btn.dataset.C ?? 0);
    const D = parseFloat(btn.dataset.d ?? btn.dataset.D ?? 0);
    const m = parseFloat(btn.dataset.m ?? 0.3);
    const n = parseFloat(btn.dataset.n ?? 0);
    applySimState(A, B, C, D, m, n, func);
  });
});

// ─────────────────────────────────────────────
//  RESIZE / ORIENTATION CHANGE
// ─────────────────────────────────────────────
// iOS: orientationchange 이벤트가 resize보다 빠름
window.addEventListener('orientationchange', () => {
  // 방향 전환 후 레이아웃 안정화 기다림
  setTimeout(resizeCanvas, 300);
});

// Debounced resize
let resizeTimer = null;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if (document.getElementById('tab-simulator')?.classList.contains('active')) {
      resizeCanvas();
    }
  }, 100);
});

// ResizeObserver: 컨테이너 크기 변화 감지 (iOS 지원)
if (typeof ResizeObserver !== 'undefined') {
  const ro = new ResizeObserver(() => {
    if (document.getElementById('tab-simulator')?.classList.contains('active')) {
      resizeCanvas();
    }
  });
  const container = document.getElementById('canvas-container');
  if (container) ro.observe(container);
}

// ─────────────────────────────────────────────
//  iOS: visibilitychange (홈 버튼→다시 열기)
// ─────────────────────────────────────────────
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    setTimeout(resizeCanvas, 100);
  }
});

// ─────────────────────────────────────────────
//  iOS: 스크롤 중 슬라이더 오작동 방지
//  (슬라이더 터치 시 스크롤 막기)
// ─────────────────────────────────────────────
document.querySelectorAll('.slider').forEach(slider => {
  slider.addEventListener('touchstart', e => {
    e.stopPropagation();
  }, { passive: true });

  // 슬라이더 드래그 중 페이지 스크롤 방지
  slider.addEventListener('touchmove', e => {
    e.stopPropagation();
  }, { passive: true });
});

// ─────────────────────────────────────────────
//  INIT
// ─────────────────────────────────────────────
function init() {
  updateFormulaDisplay();
  updateLegendColor();

  // iOS: DOMContentLoaded 시점과 레이아웃 완성 시점 사이 딜레이 필요
  resizeCanvas();
  setTimeout(resizeCanvas, 200);
  setTimeout(resizeCanvas, 500); // 폰트 로딩 완료 후
}

// DOMContentLoaded가 이미 완료됐을 수 있으므로 즉시 실행 보장
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// 이미지/폰트 완전 로딩 후 한 번 더
window.addEventListener('load', () => {
  setTimeout(resizeCanvas, 100);
});
