---
name: annotation-master
description: 标注大师1.0.6 — 零侵入HTML原型标注。双击角标切换状态（🔴未处理↔🟢已完成），碰撞检测+滚动双保险。每页独立编号。
trigger: 标注|标注一下|开始标注|执行标注|标注大师|加标注|添加标注|annotation|执行标注大师
category: product
---

# 标注大师 1.0.2 (Annotation Master)

在 HTML 原型文件上添加可视化数字角标标注。**零侵入原布局**：仅添加 `data-am-target` 属性，JS 动态渲染 `position:fixed` 浮层角标。每页独立编号。CSS 驱动 tooltip 定位（相对角标），JS 仅判断方向。

## 版本演进

| 版本 | 关键改进 |
|------|---------|
| V1.0.0 | 初始版本：HTML 注入角标子元素 |
| V1.0.1 | 浮层架构：`data-am-target` + JS 动态渲染 + 页面隔离 |
| V1.0.2 | 修复初始化显示、每页独立编号、CSS驱动tooltip定位 |

## 触发条件

用户消息包含以下任意关键词时触发：
- "标注" / "标注一下" / "开始标注" / "执行标注"
- "标注大师" / "执行标注大师"
- "加标注" / "添加标注"
- "annotation"

## 工作流程

### 第1步：确认目标 HTML 文件

1. 如果用户未提供文件路径，询问：**"请提供需要标注的 HTML 原型文件路径"**
2. 如果用户提供了路径，用 `read_file` 读取验证：
   - 文件是否存在
   - 是否为 .html 文件
   - 文件大小（超过 1MB 提示用户确认）
3. 读取后简要告知用户原型概况（标题、大致结构）

### 第2步：收集标注内容

支持两种模式，优先使用模式B（批量），模式A（逐条）仅在用户明确逐条给出时使用。

**模式A — 逐条标注**：
用户逐条给出，每条包含标注位置和标注内容。每收到一条确认后继续下一条。用户说"没有了"、"标注完成"、"完成"、"done"时进入下一步。

**模式B — 批量标注**（推荐）：
用户一次性给出多个标注。先全部收集，再批量注入。格式灵活，支持：
```
在【登录按钮】标注：改为品牌蓝 #1890FF，增加 hover 动效
首页搜索框：增加搜索历史下拉功能
#3 商品价格 显示划线原价和折扣标签
```

**主动询问策略**：
- 用户只说"标注"但没给内容 → 询问："请告诉我标注内容，可以说'在【位置】标注：【说明】'"
- 用户给了内容但位置模糊 → 在 HTML 中搜索候选元素，列出让用户选择
- 用户多次给出 → 累计收集，用户确认后统一注入

**模式C — PRD驱动标注**（批量自动）：
用户同时提供 PRD 文档和 HTML 原型时触发。从 PRD 中提取关键需求点，自动映射到 HTML 原型的对应元素，批量生成标注。此模式下：
1. 读取 PRD 内容，识别各章节的功能需求
2. 将需求点映射到 HTML 中对应的 UI 区域
3. 生成标注列表并展示给用户确认
4. 确认后批量注入
PRD 驱动标注时，每条标注的 content 应简洁提炼 PRD 中的核心规则（非完整复制 PRD 文本）。

### 第3步：定位标注目标

对每条标注，在 HTML 中定位目标元素：

1. **语义搜索**：在 HTML 中搜索标注位置关键词，匹配规则：
   - 按钮：`<button>`, `<a class="...btn...">`, `input[type=submit]`
   - 输入框：`<input>`, `<textarea>`
   - 文字标签：包含关键词的 `<label>`, `<span>`, `<h1>-<h6>`, `<p>`, `<div>`
   - 图片区域：`<img>`, 包含 `image`/`photo`/`pic` 的 class
   - 卡片/区块：包含 `card`/`section`/`panel`/`box` 的 class
2. **优先级**：按钮 > 表单元素 > 语义标签 > div 容器
3. **多匹配处理**：找到多个候选时，列出候选（显示 tag + class + 部分文本），让用户选
4. **无匹配处理**：告知用户"未找到匹配元素"，建议用户提供更具体的关键词或 CSS 选择器

### 第3.5步：锚点唯一性验证（CRITICAL）

在注入前，**必须验证每个标注的 anchor 在文件中唯一**。用 `search_files` 做 `output_mode='count'` 检查：

```
用 search_files 对每个 anchor 做计数：
  - count == 1 → ✅ 直接使用
  - count == 0 → ❌ anchor 不存在，重新定位
  - count > 1  → ⚠️ 如 `<header class="header">` 在多视图间重复
                 用上下文限定（如 `html.index(anchor, view_section_start)`）
```

此步骤不可跳过——否则可能将角标注入到错误的视图或重复元素中。

### 第4步：注入标注系统（零侵入模式）

**核心原则**：不修改目标元素的样式或结构。仅在目标元素上添加 `data-am-target="N"` 属性（对布局零影响），所有角标由 JS 动态渲染为 `position:fixed` 浮层。

#### 4a. 标记目标元素

对每条标注的目标元素，仅添加一个 `data-am-target="N"` 属性：

```html
<!-- 原始 -->
<button class="login-btn">登录</button>

<!-- 标注后（仅加属性，零布局影响） -->
<button class="login-btn" data-am-target="1">登录</button>
```

**不添加**：`style="position:relative"`、子元素、wrapper。

#### 4b. JS 动态渲染浮层

JS 启动时：
1. 扫描所有 `[data-am-target]` 元素
2. 创建浮层容器 `<div id="am-overlay">`（`position:fixed;inset:0;pointer-events:none;z-index:99999`）
3. 为每个目标元素创建角标 `<span class="am-badge">`（`position:absolute` 相对浮层，`pointer-events:auto`）
4. 通过 `getBoundingClientRect()` 计算目标元素位置，角标定位到其右上角
5. 监听 `scroll`/`resize`/`MutationObserver` 实时追踪位置

#### 4c. 页面隔离

HTML 原型通常使用 view 切换（如 `.view.active`）。JS 检测当前激活的 view，只显示该 view 内的标注角标和清单项。

- 有 `data-am-page` 属性的角标：按 page 过滤
- 无 `data-am-page` 属性：自动判断所属 view（检查目标元素是否在可见 view 内）
- 清单侧边栏：只显示当前页标注

#### 4d. 视口感知 Tooltip

Tooltip 使用 `position:fixed` 定位，突破父元素 `overflow:hidden` 限制。JS 计算最佳弹出方向：
- 默认向上弹出（角标上方）
- 角标距顶部 < 150px → 向下弹出
- 角标距右侧 < 350px → 向左偏移
- 角标距左侧 < 200px → 向右偏移

#### 4e. CSS 样式

见模板文件 `templates/annotation.css` — 浮层容器、fixed 定位 badge、视口感知 tooltip。

#### 4f. JavaScript

见模板文件 `templates/annotation.js` — 动态渲染引擎、页面检测、位置追踪、交互逻辑。

### 第5步：生成输出文件

1. 输出文件路径：`{原目录}/{原文件名}-标注版.html`
2. 用 `write_file` 写入修改后的 HTML
3. 不覆盖原文件

### 第6步：展示结果

告知用户：
- ✅ 标注版文件路径
- 📊 标注总数
- 📋 标注清单概要（编号 + 位置 + 内容摘要）
- 💡 使用方式："浏览器打开即可，hover 角标查看详情，右下角 📋 查看清单"

---

## 标注数据结构

所有标注以 JSON 数组形式存储，方便后续程序化读取：

```json
{
  "version": "1.0",
  "createdAt": "2026-06-06T10:00:00",
  "annotations": [
    {
      "id": 1,
      "location": "登录按钮",
      "content": "改为品牌蓝 #1890FF，增加 hover 动效",
      "selector": ".login-btn"
    }
  ]
}
```

JSON 数据在注入时写入 `<script id="am-data" type="application/json">` 标签中。

---

## 角标定位策略（细节）

### 目标元素匹配优先级
1. **精确文字匹配**：`<button>登录</button>` → 用户说"登录按钮"
2. **class/id 模糊匹配**：`class="login-btn"` → 用户说"登录按钮"
3. **上下文匹配**：`<label>用户名</label><input>` → 用户说"用户名输入框"
4. **语义区域匹配**：`<div class="product-card">` → 用户说"商品卡片"

### 角标插入位置（按目标元素类型）
| 目标元素类型 | 插入方式 |
|------------|---------|
| `<button>`, `<a>`, `<div>`, `<section>`, `<aside>`, `<label>`, `<header>` 等容器 | 锚点替换：`<tag class="x">` → `<tag class="x" style="position:relative">` + badge。badge 成为元素首个子节点，CSS 绝对定位于右上角。 |
| `<select>` | **两步包装法**：①替换 `<select>` 为 `<span style="position:relative;display:inline-block"><select>` ②找到对应 `</select>`，在其后插入 badge + `</span>` |
| `<input>`, `<textarea>` | **两步包装法**：同 select。①用 `<span style="position:relative;display:inline-block">` 包裹 ②在 `</div>` 或元素闭合后插入 badge + `</span>` |
| `<img>` | 包裹在 `<span style="position:relative;display:inline-block">` 中，img 后插入 badge |
| 大段文字 | 在文字末尾插入行内角标 |

> **⚠️ 陷阱**：`<select>` 和 `<input>` 不能包含 `<span>` 子元素，因此不能直接插入 badge。必须用外部 `<span>` 包装法。

---

## 示例对话

**用户**：标注一下这个原型 /Users/yr/Desktop/商品详情.html

**助手**：
> 已读取原型文件「商品详情.html」，页面包含：顶部导航、商品图片、价格区、规格选择、详情Tab、底部操作栏。
>
> 请告诉我标注内容，可以说：
> - 「在【区域/元素】标注：【说明文字】」
> - 或者批量给出多条标注
>
> 标注完成后说「标注完成」

**用户**：
> 商品图片区域标注：支持多图轮播，点击放大查看
> 价格下方标注：显示划线原价和折扣标签
> 底部按钮标注：增加"加入购物车"和"立即购买"两个按钮

**助手**：
> 收到 3 条标注，正在定位...
>
> ✅ #1 商品图片区域 → 「支持多图轮播，点击放大查看」→ 定位到 `.product-image`
> ✅ #2 价格下方 → 「显示划线原价和折扣标签」→ 定位到 `.price-section`
> ✅ #3 底部按钮 → 「增加"加入购物车"和"立即购买"两个按钮」→ 定位到 `.bottom-bar`
>
> 全部定位成功，正在注入标注系统...
>
> 📁 已生成：`/Users/yr/Desktop/商品详情-标注版.html`
> 📊 共 3 条标注
>
> 📋 标注清单：
> - #1 商品图片区域：支持多图轮播，点击放大查看
> - #2 价格区域：显示划线原价和折扣标签
> - #3 底部操作栏：增加"加入购物车"和"立即购买"两个按钮
>
> 浏览器打开即可查看，hover 红色角标显示详情，右下角 📋 查看完整清单。

---

## 页面隔离规则

HTML 原型通常使用 view 切换模式（`display:none`/`display:block`），如 `.view.active`。标注大师自动检测当前活跃 view：

| 场景 | 行为 |
|------|------|
| 当前在登录页 | 只显示登录页标注角标；清单只列登录页标注 |
| 切换到商品列表 | 隐去登录页角标，显示列表页角标 |
| 切换到商品详情 | 同上，按页隔离 |
| 全局元素（如公共 header 在多页复用） | 标注时指定 `data-am-page="all"` 或跟随所在 view |

**页面检测策略**：JS 扫描 `.view.active` 或 `[style*="display:block"]` 等活跃容器，判断角标目标元素是否在当前可见区域。

## 注意事项

1. **零布局侵入**：仅添加 `data-am-target` 属性，不修改样式/结构/position
2. **单文件输出**：所有 CSS/JS 内联，无需外部依赖
3. **浮层渲染**：角标和 tooltip 为 `position:fixed`，不参与页面流
4. **不覆盖原文件**：标注版另存为 `{原文件名}-标注版.html`
5. **视口感知**：tooltip 自动避开视口边缘，突破 overflow:hidden
6. **页面隔离**：自动检测活跃 view，仅显示当前页标注
7. **标注数据持久化**：JSON 内嵌在 HTML 中，后续可读取修改
8. **大文件处理**：HTML 超过 1MB 先提示用户确认
8. **完整注入参考**：见 `references/injection-technique.md`，包含经过实战验证的 Python 脚本模式、badge_html 辅助函数、阶段化注入流程和常见陷阱。

## 后续版本规划

- v1.1：标注修改/删除、标注状态（待处理/已完成）
- v1.2：标注导出 Markdown/Excel
- v1.3：多人协作标注（标注作者）
- v2.0：AI 自动识别需要标注的区域并建议标注内容
