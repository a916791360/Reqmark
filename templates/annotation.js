// 标注大师 1.1.7 — 角标删除+编辑(会话级) + 四方向全判满 + scope隔离 + fixed直定位 + 宽元素左置
(function () {
  'use strict';

  var ANNOTATIONS = __ANNOTATION_DATA__;
  var badges = {};
  var targets = {};
  var pinnedId = null;
  var activeScope = 'customers';
  var ticking = false;

  // V1.1.7: 会话级状态（刷新恢复）
  var deletedIds = {};
  var editedContent = {};

  function getContent(a) {
    return editedContent[a.id] != null ? editedContent[a.id] : a.content;
  }

  function init() {
    scanTargets();
    detectScope();
    createAllBadges();
    createPanel();
    createScrollTop();
    requestAnimationFrame(function () {
      updateAllPositions();
      updateVisibility();
      setTimeout(function () { updateAllPositions(); updateVisibility(); }, 300);
    });
    bindGlobalEvents();
    startTracking();
    refreshPanel();
    logReady();
  }

  function scanTargets() {
    targets = {};
    document.querySelectorAll('[data-am-target]').forEach(function (el) {
      targets[el.getAttribute('data-am-target')] = el;
    });
  }

  function getAnnotationScope(a) { return a.scope || 'global'; }

  function detectScope() {
    var masks = [
      ['drawerMask', 'drawer-customer'], ['reviewMask', 'drawer-review'],
      ['confirmMask', 'modal-confirm'], ['rejectMask', 'modal-reject'],
      ['createdMask', 'modal-created'], ['passwordMask', 'modal-password']
    ];
    for (var i = 0; i < masks.length; i++) {
      var el = document.getElementById(masks[i][0]);
      if (el && window.getComputedStyle(el).display !== 'none') { activeScope = masks[i][1]; return; }
    }
    var tabApp = document.getElementById('tabApplications');
    activeScope = (tabApp && tabApp.classList.contains('active')) ? 'applications' : 'customers';
  }

  // V1.1.7: 过滤已删除 + scope
  function isAnnotationVisible(a) {
    if (deletedIds[a.id]) return false;
    var s = getAnnotationScope(a);
    return s === 'global' || s === activeScope;
  }

  function getVisibleAnnotations() {
    return ANNOTATIONS.filter(function (a) { return isAnnotationVisible(a); });
  }

  // ============================================================
  // 创建角标
  // ============================================================
  function createAllBadges() { ANNOTATIONS.forEach(function (a) { createBadge(a); }); }

  function createBadge(a) {
    var va = getVisibleAnnotations();
    var pi = -1;
    for (var i = 0; i < va.length; i++) { if (va[i].id === a.id) { pi = i + 1; break; } }

    var b = document.createElement('span');
    b.className = 'am-badge';
    b.setAttribute('data-annotation-id', a.id);

    var num = document.createElement('span');
    num.className = 'am-num';
    num.textContent = pi > 0 ? pi : '';
    b.appendChild(num);

    var t = document.createElement('span');
    t.className = 'am-tooltip';
    t.innerHTML = '<span class="am-close" title="关闭">&times;</span>' +
      '<span class="am-tooltip-id">#' + (pi > 0 ? pi : '?') + '</span>' +
      '<span class="am-tooltip-body">' + escapeHTML(getContent(a)) + '</span>';
    b.appendChild(t);
    b.style.display = 'none';
    document.body.appendChild(b);
    badges[a.id] = b;
  }

  // 刷新单个角标的 tooltip 内容
  function refreshBadgeTooltip(a) {
    var b = badges[a.id];
    if (!b) return;
    var tip = b.querySelector('.am-tooltip');
    if (!tip) return;
    var body = tip.querySelector('.am-tooltip-body');
    if (body) body.innerHTML = escapeHTML(getContent(a));
    var va = getVisibleAnnotations();
    var pi = -1;
    for (var i = 0; i < va.length; i++) { if (va[i].id === a.id) { pi = i + 1; break; } }
    var num = b.querySelector('.am-num');
    if (num) num.textContent = pi > 0 ? pi : '';
    var tid = tip.querySelector('.am-tooltip-id');
    if (tid) tid.textContent = '#' + (pi > 0 ? pi : '?');
  }

  // ============================================================
  // 宽元素左置
  // ============================================================
  function updateBadgePosition(a) {
    var b = badges[a.id], t = targets[a.id];
    if (!b || !t) return;
    var r = t.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) { b.style.display = 'none'; return; }
    var vw = window.innerWidth, vh = window.innerHeight;
    var x, y;
    if (r.width > vw * 0.7) {
      x = r.left - 8; if (x < 6) x = 6;
    } else {
      x = r.right - 6; if (x < 6) x = 6; if (x > vw - 28) x = vw - 28;
    }
    y = r.top - 8; if (y < 6) y = 6; if (y > vh - 28) y = vh - 28;
    b.style.left = x + 'px'; b.style.top = y + 'px';
  }

  // ============================================================
  // scope 可见性 + 编号重算
  // ============================================================
  function updateVisibility() {
    detectScope();
    ANNOTATIONS.forEach(function (a) {
      var b = badges[a.id]; if (!b) return;
      var t = targets[a.id];
      if (!t || !isAnnotationVisible(a)) { b.style.display = 'none'; return; }
      var r = t.getBoundingClientRect();
      b.style.display = (r.width > 0 || r.height > 0) ? '' : 'none';
    });
    // 刷新所有角标编号和 tooltip
    var va = getVisibleAnnotations();
    va.forEach(function (a, idx) {
      var b = badges[a.id];
      if (b && b.style.display !== 'none') {
        var num = b.querySelector('.am-num');
        if (num) num.textContent = idx + 1;
        var tid = b.querySelector('.am-tooltip-id');
        if (tid) tid.textContent = '#' + (idx + 1);
        var body = b.querySelector('.am-tooltip-body');
        if (body) body.innerHTML = escapeHTML(getContent(a));
      }
    });
    refreshPanel();
  }

  function updateAllPositions() {
    ANNOTATIONS.forEach(function (a) { updateBadgePosition(a); });
    resolveCollisions();
  }

  function resolveCollisions() {
    var MIN_DIST = 26, vh = window.innerHeight;
    var visible = [];
    Object.keys(badges).sort(function (a, b) { return parseInt(a) - parseInt(b); }).forEach(function (id) {
      var b = badges[id];
      if (!b || b.style.display === 'none') return;
      var bx = parseFloat(b.style.left) || 0, by = parseFloat(b.style.top) || 0;
      for (var i = 0; i < visible.length; i++) {
        if (Math.abs(bx - visible[i].left) < MIN_DIST && Math.abs(by - visible[i].top) < MIN_DIST) {
          by = visible[i].top + MIN_DIST;
          if (by > vh - 28) by = vh - 28;
          b.style.top = by + 'px';
        }
      }
      visible.push({ left: bx, top: parseFloat(b.style.top) || by });
    });
  }

  // ============================================================
  // V1.1.6: 四方向全判满
  // ============================================================
  function positionTooltip(badge) {
    var tip = badge.querySelector('.am-tooltip');
    if (!tip) return;
    tip.classList.remove('up', 'right', 'left');
    var br = badge.getBoundingClientRect();
    var vw = window.innerWidth, vh = window.innerHeight;
    var th = tip.offsetHeight, tw = tip.offsetWidth;
    if (!th || !tw) return;
    var gap = 8, cx = br.left + br.width / 2;
    var sd = vh - br.bottom - gap, su = br.top - gap, sr = vw - br.right - gap, sl = br.left - gap;
    var hOk = (cx - tw / 2 >= 5) && (cx + tw / 2 <= vw - 5);
    if (sd >= th && hOk) { return; }
    if (sd >= th && sr >= tw) { tip.classList.add('right'); return; }
    if (sd >= th && sl >= tw) { tip.classList.add('left'); return; }
    if (su >= th && hOk) { tip.classList.add('up'); return; }
    if (su >= th && sr >= tw) { tip.classList.add('right'); return; }
    if (su >= th && sl >= tw) { tip.classList.add('left'); return; }
    if (sr >= tw) { tip.classList.add('right'); return; }
    if (sl >= tw) { tip.classList.add('left'); return; }
    tip.classList.add('up');
  }

  // ============================================================
  // ★ V1.1.7: 面板（含编辑/删除按钮）
  // ============================================================
  function createPanel() {
    var d = document.createElement('div');
    d.innerHTML = '<div id="am-overlay-bg"></div><button id="am-panel-toggle" title="标注清单">📋</button>' +
      '<div id="am-panel"><div id="am-panel-header"><div><h3>📋 标注清单</h3><span id="am-panel-page-label"></span></div><span id="am-panel-count"></span></div><div id="am-panel-list"></div></div>';
    while (d.firstChild) document.body.appendChild(d.firstChild);
    document.getElementById('am-panel-toggle').addEventListener('click', function (e) { e.stopPropagation(); document.getElementById('am-panel').classList.contains('open') ? closePanel() : openPanel(); });
    document.getElementById('am-overlay-bg').addEventListener('click', closePanel);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closePanel(); });
  }
  function openPanel() { document.getElementById('am-panel').classList.add('open'); document.getElementById('am-panel-toggle').classList.add('open'); document.getElementById('am-panel-toggle').innerHTML = '✕'; document.getElementById('am-overlay-bg').classList.add('visible'); refreshPanel(); }
  function closePanel() { document.getElementById('am-panel').classList.remove('open'); document.getElementById('am-panel-toggle').classList.remove('open'); document.getElementById('am-panel-toggle').innerHTML = '📋'; document.getElementById('am-overlay-bg').classList.remove('visible'); }

  // V1.1.7: 面板项带编辑/删除按钮
  function refreshPanel() {
    var l = document.getElementById('am-panel-list'), c = document.getElementById('am-panel-count'), lb = document.getElementById('am-panel-page-label');
    if (!l || !c) return;
    var sn = { 'customers': '客户账号管理', 'applications': '开户申请审核', 'drawer-customer': '新增/编辑抽屉', 'drawer-review': '审核抽屉', 'modal-confirm': '确认弹窗', 'modal-reject': '驳回弹窗', 'modal-created': '创建成功弹窗', 'modal-password': '重置密码弹窗' };
    lb.textContent = sn[activeScope] || activeScope;
    var va = getVisibleAnnotations().filter(function (a) {
      var b = badges[a.id], t = targets[a.id];
      if (!b || b.style.display === 'none' || !t) return false;
      return t.getBoundingClientRect().width > 0;
    });
    c.textContent = va.length + ' 条';
    l.innerHTML = va.map(function (a, idx) {
      var di = idx + 1, b = badges[a.id], done = b && b.classList.contains('done');
      var sd = done ? '<span class="am-status-dot done" title="已完成">●</span>' : '<span class="am-status-dot" title="未处理">●</span>';
      return '<div class="am-panel-item' + (done ? ' done' : '') + '" data-annotation-id="' + a.id + '">' +
        '<div class="am-item-top"><span class="am-item-id">#' + di + '</span>' + sd +
        '<span class="am-item-location">' + escapeHTML(a.location) + '</span>' +
        '<span class="am-item-actions">' +
        '<button class="am-btn-edit" data-action="edit" data-id="' + a.id + '" title="编辑">✏️</button>' +
        '<button class="am-btn-del" data-action="delete" data-id="' + a.id + '" title="删除">🗑</button>' +
        '</span></div>' +
        '<div class="am-item-content" data-content-id="' + a.id + '">' + escapeHTML(getContent(a)) + '</div>' +
        '</div>';
    }).join('');

    // 编辑按钮
    l.querySelectorAll('.am-btn-edit').forEach(function (btn) {
      btn.addEventListener('click', function (e) { e.stopPropagation(); startEdit(btn.getAttribute('data-id')); });
    });
    // 删除按钮
    l.querySelectorAll('.am-btn-del').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var id = btn.getAttribute('data-id');
        if (confirm('确认删除该标注？（刷新页面恢复）')) {
          deletedIds[id] = true;
          updateVisibility();
        }
      });
    });
    // 点击行 → 滚动到目标
    l.querySelectorAll('.am-panel-item').forEach(function (it) {
      it.addEventListener('click', function (e) {
        if (e.target.closest('button') || e.target.closest('textarea') || e.target.closest('.am-edit-wrap')) return;
        var id = this.getAttribute('data-annotation-id'), t = targets[id];
        if (t) t.scrollIntoView({ behavior: 'smooth', block: 'center' });
        var b = badges[id]; if (b) { b.classList.add('flash'); setTimeout(function () { b.classList.remove('flash'); }, 1800); }
        closePanel();
      });
    });
  }

  // V1.1.7: 简易编辑
  function startEdit(id) {
    var aid = parseInt(id);
    var item = document.querySelector('.am-panel-item[data-annotation-id="' + id + '"]');
    if (!item) return;
    var contentDiv = item.querySelector('.am-item-content');
    if (!contentDiv || contentDiv.querySelector('textarea')) return; // 已在编辑中

    var a = null;
    for (var i = 0; i < ANNOTATIONS.length; i++) { if (ANNOTATIONS[i].id === aid) { a = ANNOTATIONS[i]; break; } }
    if (!a) return;

    var oldHTML = contentDiv.innerHTML;
    var currentText = getContent(a);
    contentDiv.innerHTML = '<div class="am-edit-wrap"><textarea class="am-edit-ta">' + escapeHTML(currentText) + '</textarea>' +
      '<div class="am-edit-btns"><button class="am-edit-cancel">取消</button><button class="am-edit-save">保存</button></div></div>';

    var ta = contentDiv.querySelector('.am-edit-ta');
    ta.focus();

    contentDiv.querySelector('.am-edit-save').addEventListener('click', function (e) {
      e.stopPropagation();
      editedContent[aid] = ta.value;
      refreshBadgeTooltip(a);
      refreshPanel();
    });
    contentDiv.querySelector('.am-edit-cancel').addEventListener('click', function (e) {
      e.stopPropagation();
      contentDiv.innerHTML = oldHTML;
    });
    ta.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { contentDiv.innerHTML = oldHTML; }
    });
  }

  function createScrollTop() {
    var b = document.createElement('button'); b.id = 'am-scroll-top'; b.textContent = '↑'; b.title = '返回顶部';
    document.body.appendChild(b);
    b.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });
  }

  // ============================================================
  // 事件
  // ============================================================
  function bindGlobalEvents() {
    document.addEventListener('click', function (e) {
      var b = e.target.closest('.am-badge');
      if (!b) { unpinAll(); return; }
      e.stopPropagation();
      var id = b.getAttribute('data-annotation-id');
      if (pinnedId === id) { unpinAll(); }
      else { unpinAll(); b.classList.add('pinned'); pinnedId = id; positionTooltip(b); }
    });
    document.addEventListener('dblclick', function (e) {
      var b = e.target.closest('.am-badge'); if (!b) return;
      e.stopPropagation(); toggleStatus(b);
    });
    document.addEventListener('mouseover', function (e) {
      var b = e.target.closest('.am-badge');
      if (b) positionTooltip(b);
    }, true);
    document.addEventListener('mouseout', function (e) {
      var b = e.target.closest('.am-badge');
      if (b && pinnedId !== b.getAttribute('data-annotation-id')) {
        var tip = b.querySelector('.am-tooltip');
        if (tip) tip.classList.remove('up', 'right', 'left');
      }
    }, true);
  }

  function toggleStatus(badge) { badge.classList.toggle('done'); refreshPanel(); }
  function unpinAll() { pinnedId = null; document.querySelectorAll('.am-badge.pinned').forEach(function (b) { b.classList.remove('pinned'); }); }

  // ============================================================
  // 追踪
  // ============================================================
  function startTracking() {
    window.addEventListener('scroll', onUpdate, { passive: true });
    window.addEventListener('resize', onUpdate, { passive: true });
    document.addEventListener('scroll', onUpdate, { passive: true, capture: true });
    bindScrollAncestors();
    var obs = new MutationObserver(function (ms) {
      var scopeChanged = false;
      ms.forEach(function (m) {
        if (m.type === 'childList' || m.type === 'subtree') { scanTargets(); scheduleUpdate(); }
        if (m.type === 'attributes' && (m.attributeName === 'class' || m.attributeName === 'style')) {
          var id = m.target.id || '';
          if (id.indexOf('Mask') >= 0 || id.indexOf('Tab') >= 0) scopeChanged = true;
          scheduleUpdate();
        }
      });
      if (scopeChanged) setTimeout(function () { updateVisibility(); }, 100);
    });
    document.querySelectorAll('.mask, .drawer, .modal, .page-tab, .page-tabs, .table-wrap, .drawer-body').forEach(function (v) {
      obs.observe(v, { attributes: true, attributeFilter: ['class', 'style'], childList: true, subtree: true });
    });
    obs.observe(document.body, { attributes: true, attributeFilter: ['class'], childList: true, subtree: false });
    var origSwitch = window.switchPage;
    if (origSwitch) { window.switchPage = function () { origSwitch.apply(this, arguments); setTimeout(function () { updateVisibility(); }, 150); }; }
    ['openDrawer', 'openReview', 'closeReview', 'closeCreated', 'closePassword', 'closeConfirm', 'closeRejectModal', 'tryCloseDrawer'].forEach(function (fn) {
      var orig = window[fn];
      if (typeof orig === 'function') { window[fn] = function () { orig.apply(this, arguments); setTimeout(function () { updateVisibility(); }, 150); }; }
    });
  }

  function bindScrollAncestors() {
    document.querySelectorAll('[data-am-target]').forEach(function (el) {
      var p = el.parentElement;
      while (p && p !== document.body) {
        var s = window.getComputedStyle(p);
        if ((s.overflowX.indexOf('auto') >= 0 || s.overflowX.indexOf('scroll') >= 0 || s.overflow.indexOf('auto') >= 0 || s.overflow.indexOf('scroll') >= 0 || s.overflowY.indexOf('auto') >= 0 || s.overflowY.indexOf('scroll') >= 0) && !p._amBound) {
          p._amBound = true; p.addEventListener('scroll', onUpdate, { passive: true });
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

  function escapeHTML(s) { var d = document.createElement('div'); d.textContent = s != null ? s : ''; return d.innerHTML; }

  function logReady() {
    console.log('%c📋 标注大师 1.1.7 %c已就绪 | %c' + ANNOTATIONS.length + ' 条标注 | 删除/编辑(刷新恢复)', 'font-weight:bold;', '', 'color:#FF4D4F;font-weight:bold;');
    console.log('%c💡 面板✏️编辑 🗑删除 | hover智能定位 | scope隔离', 'color:#999;font-size:12px;');
    console.log('%c📍 scope:' + activeScope + ' | 可见:' + getVisibleAnnotations().length + ' 条', 'color:#1890FF;');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
