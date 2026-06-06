// 标注大师 1.0.8 — 动态浮层渲染引擎
// 碰撞检测 + 滚动双保险 + 双击切换标注状态

(function () {
  'use strict';

  var ANNOTATIONS = __ANNOTATION_DATA__;
  var overlay = null;
  var badges = {};
  var targets = {};
  var pinnedId = null;
  var currentPage = null;
  var ticking = false;

  function init() {
    createOverlay();
    createPanel();
    createScrollTop();
    scanTargets();
    detectPage();
    createAllBadges();
    updateAllPositions();
    updateVisibility();
    bindGlobalEvents();
    startTracking();
    refreshPanel();
    logReady();
  }

  function createOverlay() {
    overlay = document.createElement('div');
    overlay.id = 'am-overlay';
    document.body.appendChild(overlay);
  }

  function scanTargets() {
    var els = document.querySelectorAll('[data-am-target]');
    els.forEach(function (el) {
      targets[el.getAttribute('data-am-target')] = el;
    });
  }

  function getAnnotationPage(a) { return a.page || 'unknown'; }

  function detectPage() {
    var av = document.querySelector('.view.active');
    if (av) {
      var id = av.id || '';
      if (id.indexOf('login') >= 0) { currentPage = 'login'; return; }
      if (id.indexOf('list') >= 0) { currentPage = 'list'; return; }
      if (id.indexOf('detail') >= 0) { currentPage = 'detail'; return; }
    }
    var views = document.querySelectorAll('.view');
    for (var i = 0; i < views.length; i++) {
      if (window.getComputedStyle(views[i]).display !== 'none') {
        var vid = views[i].id || '';
        if (vid.indexOf('login') >= 0) { currentPage = 'login'; return; }
        if (vid.indexOf('list') >= 0) { currentPage = 'list'; return; }
        if (vid.indexOf('detail') >= 0) { currentPage = 'detail'; return; }
        currentPage = vid; return;
      }
    }
    currentPage = 'unknown';
  }

  function getCurrentPageAnnotations() {
    return ANNOTATIONS.filter(function (a) { return getAnnotationPage(a) === currentPage; });
  }

  // ============================================================
  // 创建角标
  // ============================================================
  function createAllBadges() { ANNOTATIONS.forEach(function (a) { createBadge(a); }); }

  function createBadge(a) {
    var pa = ANNOTATIONS.filter(function (x) { return getAnnotationPage(x) === getAnnotationPage(a); });
    var pi = -1;
    for (var i = 0; i < pa.length; i++) { if (pa[i].id === a.id) { pi = i + 1; break; } }

    var b = document.createElement('span');
    b.className = 'am-badge';
    b.setAttribute('data-annotation-id', a.id);
    b.textContent = pi;

    var t = document.createElement('span');
    t.className = 'am-tooltip';
    t.innerHTML = '<span class="am-close">&times;</span><span class="am-tooltip-id">#' + pi + '</span>' + escapeHTML(a.content);
    b.appendChild(t);
    b.style.display = 'none';
    overlay.appendChild(b);
    badges[a.id] = b;
  }

  // ============================================================
  // 定位
  // ============================================================
  function updateBadgePosition(a) {
    var b = badges[a.id];
    var t = targets[a.id];
    if (!b || !t) return;
    var vis = !(!t.offsetParent && t.offsetWidth === 0 && t.offsetHeight === 0);
    if (vis) { var r = t.getBoundingClientRect(); if (r.width === 0 && r.height === 0) vis = false; }
    if (!vis) { b.style.display = 'none'; return; }
    var r = t.getBoundingClientRect();
    var x = r.right - 5, y = r.top - 8;
    if (x < 5) x = 5;
    if (y < 5) y = 5;
    if (x > window.innerWidth - 22) x = window.innerWidth - 22;
    if (y > window.innerHeight - 22) y = window.innerHeight - 22;
    b.style.left = x + 'px'; b.style.top = y + 'px';
  }

  function updateVisibility() {
    detectPage();
    ANNOTATIONS.forEach(function (a) {
      var b = badges[a.id]; if (!b) return;
      var t = targets[a.id]; if (!t) { b.style.display = 'none'; return; }
      var show = (getAnnotationPage(a) === currentPage || currentPage === 'unknown');
      if (show) {
        var vis = !(!t.offsetParent && t.offsetWidth === 0 && t.offsetHeight === 0);
        b.style.display = vis ? '' : 'none';
      } else { b.style.display = 'none'; }
    });
    refreshPanel();
  }

  function updateAllPositions() { ANNOTATIONS.forEach(function (a) { updateBadgePosition(a); }); resolveCollisions(); }

  // ============================================================
  // ★ 碰撞检测：防止角标堆叠
  // ============================================================
  function resolveCollisions() {
    var MIN_DIST = 26;
    var visible = [];
    var sortedIds = Object.keys(badges).sort(function (a, b) { return parseInt(a) - parseInt(b); });
    sortedIds.forEach(function (id) {
      var b = badges[id];
      if (!b || b.style.display === 'none') return;
      var bx = parseFloat(b.style.left) || 0;
      var by = parseFloat(b.style.top) || 0;
      for (var i = 0; i < visible.length; i++) {
        var dx = bx - visible[i].left;
        var dy = by - visible[i].top;
        if (Math.abs(dx) < MIN_DIST && Math.abs(dy) < MIN_DIST) {
          by = visible[i].top + MIN_DIST;
          b.style.top = by + 'px';
        }
      }
      visible.push({ left: bx, top: parseFloat(b.style.top) || by });
    });
  }

  // ============================================================
  // ★ Tooltip 定位（JS 全权计算 + clamp 到视口）
  // ============================================================
  function positionTooltip(badge) {
    var tip = badge.querySelector('.am-tooltip');
    if (!tip) return;

    // 重置
    tip.classList.remove('down', 'left', 'right');
    tip.style.left = ''; tip.style.top = '';

    var br = badge.getBoundingClientRect();
    var bw = br.width, bh = br.height;
    var th = tip.offsetHeight || 100;
    var tw = tip.offsetWidth || 300;
    var ww = window.innerWidth, wh = window.innerHeight;
    var gap = 10, pad = 5;

    // badge 中心
    var bcx = br.left + bw / 2;
    var bcy = br.top + bh / 2;

    // 候选位置（viewport 坐标）
    var tx, ty, dir = '';

    // 1) 优先上方
    tx = bcx - tw / 2; ty = br.top - th - gap;
    dir = '';
    var fitsUp = (ty >= pad);

    // 2) 下方
    var tyDown = br.bottom + gap;
    var fitsDown = (tyDown + th <= wh - pad);

    // 3) 右侧
    var txRight = br.right + gap;
    var tyRight = bcy - th / 2;
    var fitsRight = (txRight + tw <= ww - pad) && (tyRight >= pad) && (tyRight + th <= wh - pad);

    // 4) 左侧
    var txLeft = br.left - tw - gap;
    var tyLeft = bcy - th / 2;
    var fitsLeft = (txLeft >= pad) && (tyLeft >= pad) && (tyLeft + th <= wh - pad);

    if (!fitsUp) {
      if (fitsDown) { ty = tyDown; dir = 'down'; }
      else if (fitsRight) { tx = txRight; ty = tyRight; dir = 'right'; }
      else if (fitsLeft) { tx = txLeft; ty = tyLeft; dir = 'left'; }
      else { ty = tyDown; dir = 'down'; } // fallback
    }

    // Clamp 水平
    if (tx < pad) tx = pad;
    if (tx + tw > ww - pad) tx = ww - tw - pad;

    // Clamp 垂直
    if (ty < pad) ty = pad;
    if (ty + th > wh - pad) ty = wh - th - pad;

    // 转为 badge 相对坐标
    tip.style.left = (tx - br.left) + 'px';
    tip.style.top = (ty - br.top) + 'px';

    if (dir) tip.classList.add(dir);
  }

  // ============================================================
  // 面板
  // ============================================================
  function createPanel() {
    var d = document.createElement('div');
    d.innerHTML =
      '<div id="am-overlay-bg"></div>' +
      '<button id="am-panel-toggle" title="标注清单">📋</button>' +
      '<div id="am-panel">' +
      '  <div id="am-panel-header"><div><h3>📋 标注清单</h3><span id="am-panel-page-label"></span></div><span id="am-panel-count"></span></div>' +
      '  <div id="am-panel-list"></div>' +
      '</div>';
    while (d.firstChild) document.body.appendChild(d.firstChild);
    document.getElementById('am-panel-toggle').addEventListener('click', function (e) {
      e.stopPropagation();
      document.getElementById('am-panel').classList.contains('open') ? closePanel() : openPanel();
    });
    document.getElementById('am-overlay-bg').addEventListener('click', closePanel);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closePanel(); });
  }

  function openPanel() {
    document.getElementById('am-panel').classList.add('open');
    document.getElementById('am-panel-toggle').classList.add('open');
    document.getElementById('am-panel-toggle').innerHTML = '✕';
    document.getElementById('am-overlay-bg').classList.add('visible');
    refreshPanel();
  }

  function closePanel() {
    document.getElementById('am-panel').classList.remove('open');
    document.getElementById('am-panel-toggle').classList.remove('open');
    document.getElementById('am-panel-toggle').innerHTML = '📋';
    document.getElementById('am-overlay-bg').classList.remove('visible');
  }

  function refreshPanel() {
    var l = document.getElementById('am-panel-list');
    var c = document.getElementById('am-panel-count');
    var lb = document.getElementById('am-panel-page-label');
    if (!l || !c) return;
    var pn = { login: '登录页', list: '商品列表页', detail: '商品详情页' };
    var cur = currentPage || 'unknown';
    lb.textContent = pn[cur] || '';
    var pa = getCurrentPageAnnotations();
    c.textContent = pa.length + ' 条';
    l.innerHTML = pa.map(function (a, idx) {
      var di = idx + 1;
      var b = badges[a.id];
      var done = isBadgeDone(b);
      var statusDot = done ? '<span class="am-status-dot done" title="已完成">●</span>' : '<span class="am-status-dot" title="未处理">●</span>';
      return '<div class="am-panel-item' + (done ? ' done' : '') + '" data-annotation-id="' + a.id + '"><span class="am-item-id">#' + di + '</span>' + statusDot + '<div class="am-item-location">' + escapeHTML(a.location) + '</div><div class="am-item-content">' + escapeHTML(a.content) + '</div></div>';
    }).join('');
    l.querySelectorAll('.am-panel-item').forEach(function (it) {
      it.addEventListener('click', function () {
        var id = this.getAttribute('data-annotation-id');
        var t = targets[id]; if (t) t.scrollIntoView({ behavior: 'smooth', block: 'center' });
        var b = badges[id]; if (b) { b.classList.add('flash'); setTimeout(function () { b.classList.remove('flash'); }, 1800); }
        closePanel();
      });
    });
  }

  // ============================================================
  // 返回顶部
  // ============================================================
  function createScrollTop() {
    var b = document.createElement('button');
    b.id = 'am-scroll-top'; b.textContent = '↑'; b.title = '返回顶部';
    document.body.appendChild(b);
    b.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });
  }

  // ============================================================
  // 事件
  // ============================================================
  function bindGlobalEvents() {
    overlay.addEventListener('click', function (e) {
      var b = e.target.closest('.am-badge');
      if (!b) { unpinAll(); return; }
      e.stopPropagation();
      var id = b.getAttribute('data-annotation-id');
      if (pinnedId === id) { unpinAll(); }
      else { unpinAll(); b.classList.add('pinned'); pinnedId = id; positionTooltip(b); }
    });
    overlay.addEventListener('dblclick', function (e) {
      var b = e.target.closest('.am-badge');
      if (!b) return;
      e.stopPropagation();
      toggleStatus(b);
    });
    document.addEventListener('click', function (e) {
      if (!e.target.closest('.am-badge') && !e.target.closest('#am-panel') && !e.target.closest('#am-panel-toggle')) unpinAll();
    });
    overlay.addEventListener('click', function (e) {
      if (e.target.closest('.am-close')) { e.stopPropagation(); unpinAll(); }
    });
    overlay.addEventListener('mouseover', function (e) {
      var b = e.target.closest('.am-badge');
      if (b) positionTooltip(b);
    }, true);
  }

  // ============================================================
  // ★ 标注状态切换：双击 🔴未处理 ↔ 🟢已完成
  // ============================================================
  function toggleStatus(badge) {
    badge.classList.toggle('done');
    refreshPanel();
  }

  function isBadgeDone(badge) {
    return badge && badge.classList.contains('done');
  }

  function unpinAll() {
    pinnedId = null;
    overlay.querySelectorAll('.am-badge.pinned').forEach(function (b) { b.classList.remove('pinned'); });
  }

  // ============================================================
  // 追踪
  // ============================================================
  function startTracking() {
    window.addEventListener('scroll', onUpdate, { passive: true });
    window.addEventListener('resize', onUpdate, { passive: true });
    document.addEventListener('scroll', onUpdate, { passive: true, capture: true });
    bindScrollAncestors();
    var obs = new MutationObserver(function (ms) {
      ms.forEach(function (m) {
        if (m.type === 'attributes' && (m.attributeName === 'class' || m.attributeName === 'style')) {
          scheduleUpdate();
          // Re-bind scroll ancestors when visibility changes (e.g. drawer opens)
          if (m.target.classList && (m.target.classList.contains('show') || m.target.classList.contains('open'))) {
            setTimeout(bindScrollAncestors, 100);
          }
        }
      });
    });
    document.querySelectorAll('.view, .mask, .drawer, .modal').forEach(function (v) { obs.observe(v, { attributes: true, attributeFilter: ['class', 'style'] }); });
    obs.observe(document.body, { attributes: true, attributeFilter: ['class'] });
  }

  function bindScrollAncestors() {
    document.querySelectorAll('[data-am-target]').forEach(function (el) {
      var p = el.parentElement;
      while (p && p !== document.body) {
        var s = window.getComputedStyle(p);
        var scrolls = (s.overflowY === 'auto' || s.overflowY === 'scroll' || s.overflow === 'auto' || s.overflow === 'scroll');
        if (scrolls && !p._amBound) {
          p._amBound = true;
          p.addEventListener('scroll', onUpdate, { passive: true });
        }
        p = p.parentElement;
      }
    });
  }

  var updateScheduled = false;
  function scheduleUpdate() { if (updateScheduled) return; updateScheduled = true; requestAnimationFrame(function () { updateAllPositions(); updateVisibility(); updateScheduled = false; }); }

  function onUpdate() {
    if (!ticking) { requestAnimationFrame(function () { updateAllPositions(); updateVisibility(); var s = document.getElementById('am-scroll-top'); if (s) { s.classList[window.scrollY > 300 ? 'add' : 'remove']('visible'); } ticking = false; }); ticking = true; }
  }

  // ============================================================
  // 工具
  // ============================================================
  function escapeHTML(s) { var d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

  function logReady() {
    console.log('%c📋 标注大师 1.0.8 %c已就绪 %c· %c' + ANNOTATIONS.length + ' 条标注', 'font-weight:bold;', '', 'color:#999;', 'color:#FF4D4F;font-weight:bold;');
    console.log('%c💡 hover角标 | 点击固定 | 双击切换状态 | 📋清单 | 碰撞检测+滚动双保险', 'color:#999;font-size:12px;');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
