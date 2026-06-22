const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');
const css = fs.readFileSync(path.join(repoRoot, 'templates/annotation.css'), 'utf8');
const runtime = fs.readFileSync(path.join(repoRoot, 'templates/annotation.js'), 'utf8');

function rule(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = css.match(new RegExp(`${escaped}\\{([^}]*)\\}`));
  assert.ok(match, `missing CSS rule: ${selector}`);
  return match[1];
}

test('drawer CSS contains content and provides an independently scrollable editor', () => {
  const listRule = rule('#am-panel-list');
  assert.match(listRule, /overflow-y:auto/);
  assert.match(listRule, /min-height:0/);
  assert.match(listRule, /padding:0 24px/);

  const itemRule = rule('.am-panel-item');
  assert.match(itemRule, /width:100%/);
  assert.match(itemRule, /min-width:0/);
  assert.match(itemRule, /box-sizing:border-box/);

  const hoverRule = rule('.am-panel-item:hover');
  assert.doesNotMatch(hoverRule, /margin:\s*0\s+-/);

  const contentRule = rule('.am-panel-item .am-item-content');
  assert.match(contentRule, /overflow-wrap:anywhere/);

  const textareaRule = rule('.am-edit-ta');
  assert.match(textareaRule, /min-height:96px/);
  assert.match(textareaRule, /overflow-y:auto/);
  assert.match(textareaRule, /overscroll-behavior:contain/);
  assert.match(textareaRule, /cursor:text/);
});

test('panel runtime preserves editing DOM across position and scroll updates', () => {
  assert.match(runtime, /var editingId = null;/);
  assert.match(runtime, /var panelRenderSignature = '';/);
  assert.match(runtime, /function refreshPanel\(force\)/);
  assert.match(runtime, /if \(!force && signature === panelRenderSignature\) return;/);
  assert.match(runtime, /editingId = aid;/);
  assert.match(runtime, /editingId = null;/);
  assert.match(runtime, /refreshPanel\(true\)/);
});

test('runtime detects frontend pages and rescans dynamic annotation targets', () => {
  assert.match(runtime, /var activePage = 'global';/);
  assert.match(runtime, /function detectContext\(\)/);
  assert.match(runtime, /login-view[\s\S]*activePage = 'login'/);
  assert.match(runtime, /yy-search-mode[\s\S]*activePage = 'search'/);
  assert.match(runtime, /detail-view[\s\S]*activePage = 'detail'/);
  assert.match(runtime, /activePage = 'home'/);
  assert.match(runtime, /function isAnnotationInContext\(a\)/);
  assert.match(runtime, /function getDisplayedAnnotations\(\)/);
  assert.match(runtime, /function mutationTouchesTargets\(mutation\)/);
  assert.match(runtime, /isAnnotationUiNode/);
  assert.match(runtime, /obs\.observe\(document\.body, \{[\s\S]*subtree: true/);
  assert.match(runtime, /scanTargets\(\);[\s\S]*bindScrollAncestors\(\);[\s\S]*scheduleUpdate\(\)/);
});
