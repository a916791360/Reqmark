# 标注大师 1.0.8 — 注入技术参考

## 架构概览

V1.0.1+ 采用**零侵入**方案：
- HTML 仅添加 `data-am-target="N"` 属性
- 所有角标由 JS 动态创建在 `#am-overlay` 浮层中（`position:fixed`）
- 不修改任何样式/结构/position

## 注入流程

### 阶段 1：锚点唯一性验证

```python
# 对每个 anchor 做计数
for anchor in ['<header class="header">', '<div class="search">', ...]:
    count = html.count(anchor)
    assert count == 1, f"Anchor appears {count} times"
```

特殊处理：`<header class="header">` 在多视图间重复时，用列表视图的起始位置做上下文限定：
```python
list_start = html.index('<section id="list-view"')
header_pos = html.index('<header class="header">', list_start)
```

### 阶段 2：添加 data-am-target 属性

```python
# 容器类（div/section/aside/button/header/label）
old = '<div class="invite-tip"'
new = '<div class="invite-tip" data-am-target="1"'
html = html.replace(old, new, 1)

# select/input 也直接加属性，无需包装
old = '<select id="prefix" class="phone-prefix">'
new = '<select id="prefix" class="phone-prefix" data-am-target="2">'
html = html.replace(old, new, 1)
```

### 阶段 3：注入 CSS

位置：`</head>` 之前。CSS 已压缩为单行样式，包含：
- `#am-overlay` 浮层容器
- `.am-badge` / `.am-badge:hover` / `.am-badge.pinned` / `.am-badge.done`
- `.am-tooltip` + 四方向箭头（.down/.right/.left）
- `.am-badge.done .am-tooltip-id` — 已完成角标气泡 #N 变绿
- `#am-panel` / `#am-panel-toggle` / `.am-panel-item`
- `.am-panel-item.done .am-item-id` — 已完成清单 #N 变绿
- `.am-status-dot` / `.am-status-dot.done`

### 阶段 4：注入 JS

位置：`</body>` 之前。JS 包含完整渲染引擎：
- 扫描 `[data-am-target]` → 创建 badge 到 `#am-overlay`
- `updateBadgePosition()` — `getBoundingClientRect()` 计算 viewport 坐标
- `resolveCollisions()` — 碰撞检测，间距 < 26px 偏移
- `positionTooltip()` — 四方向智能定位 + viewport clamp
- `bindScrollAncestors()` — 直绑所有 overflow:auto/scroll 祖先
- `startTracking()` — 三重滚动保险 + MutationObserver
- `toggleStatus()` — 双击切换 🔴↔🟢
- `detectPage()` — `.view.active` 页面检测
- `refreshPanel()` — 清单渲染（含状态圆点）

### 阶段 5：注解数据结构

```json
{
  "id": 1,
  "page": "login",
  "location": "邀请制提示",
  "content": "PRD 6.5: 商城仅面向受邀客户开放..."
}
```

- `id`：全局唯一，对应 `data-am-target`
- `page`：归属页面（"login"/"list"/"detail"/"admin"），用于页面隔离和独立编号
- `location`：UI 区域名称（显示在清单中）
- `content`：PRD 规则说明（显示在 tooltip 和清单中）

## 常见陷阱

1. **header 重复**：`<header class="header">` 在多视图间重复，需用 view section ID 做上下文限定搜索
2. **PRD 映射**：从 PRD 提取规则时，content 应简洁提炼核心规则（非完整复制 PRD 文本），每条含 PRD 章节引用
3. **抽屉/弹窗角标**：目标在 `display:none` 容器内时，`offsetParent` 为 null，角标自动隐藏。抽屉打开时 MutationObserver + scroll 触发重渲染
4. **body{overflow:hidden}**：页面禁止 body 滚动时，需 `capture:true` + `bindScrollAncestors` 双保险捕获内部滚动
5. **大文件**：HTML > 1MB 先用 `read_file` 读头部确认结构，用 `execute_code` + Python `open()` 做全文处理

## 已验证案例

- 商城 V1 原型（4.4MB，18 条标注，登录+列表两页隔离）
- 商城客户管理（397 行，15 条标注，单页面后台，含抽屉/弹窗动态角标）

## 单页面原型 detectPage 替换（完整版）

后台管理类单页面原型没有 `.view.active` 切换，`detectPage()` 无法自动检测。**必须完整替换整个函数体**，不能仅修改函数签名行：

```python
# ✅ 正确做法：找到 detectPage 完整函数体并替换
broken_start = html.find("function detectPage() {")
next_func = html.find("function getCurrentPageAnnotations()")
clean = "function detectPage() { currentPage = 'admin'; }"
html = html[:broken_start] + clean + "\n  " + html[next_func:]
```

```python
# ❌ 常见错误：仅替换第一行，残留下半段函数体
js.replace("function detectPage() {", 
           "function detectPage() { currentPage = 'admin'; return; var _unused =")
# 结果：function detectPage() { ... return; var _unused = var av = ... }
# var _unused = var av 是无效 JS → 整个脚本崩溃 → 角标全部消失
```

**故障排查**：标注版打开后无角标 → 打开浏览器 F12 控制台 → 通常可见 `SyntaxError: Unexpected token 'var'` 等错误，说明 detectPage 替换不完整。
