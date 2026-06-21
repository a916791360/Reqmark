# 标注大师 (Reqmark)

> 给 HTML 原型一键打标注，像 Figma 评论一样简单。

🔴 角标定位 → 🖱️ hover 看需求 → 👆 单击固定 → 👆👆 双击标记已完成

## 安装

```bash
git clone https://github.com/a916791360/hermes-annotation-master.git ~/.hermes/skills/product/annotation-master
```

## 使用

```
"标注一下 /path/to/prototype.html"
"在搜索框标注：增加搜索历史下拉"
"根据这个PRD标注一下登录页和列表页"
```

## 功能

- **零侵入** — 仅加 `data-am-target` 属性，不修改样式/布局
- **Fixed 浮层架构** (V1.1.0) — 角标 `position:fixed` 直挂 body，零坐标误差
- **Scope 隔离** (V1.1.2) — Tab/抽屉/弹窗切换仅显示当前 scope 角标，编号自动重算
- **宽元素左置** (V1.1.1) — >70% 视口宽元素角标自动左置，防多元素堆叠
- **编辑 + 删除** (V1.1.7) — 清单面板每条支持修改内容和删除，角标自动重排
- **单文件输出** — CSS/JS 全部内联，浏览器直接打开
- **PRD 驱动** — 扔文档自动映射需求到 HTML
- **页面隔离** — 多页面原型按 view 切换角标
- **状态管理** — 双击角标 🔴→🟢 标记已完成，全链路绿色
- **全滚动追踪** — 表格/抽屉/弹窗角标实时跟随（三保险 + MutationObserver）
- **视口感知 Tooltip** — 四方向智能翻转 + 碰撞检测 + 垂直夹紧

## 版本

| 版本 | 关键更新 |
|------|---------|
| V1.1.7 | 编辑+删除：清单面板支持修改内容和删除角标 |
| V1.1.2 | Scope 隔离：Tab/抽屉/弹窗切换角标自动显隐 |
| V1.1.1 | 宽元素左置 + flex 容器 `min-width:0` 修复 |
| V1.1.0 | 架构重构：`position:fixed` 直挂 body |
| V1.0.9 | 智能视口夹紧 + MutationObserver DOM 重扫 |
| V1.0.8 | 全链路绿色：气泡 #N 标签同步变绿 |
| V1.0.6 | 双击切换状态 🔴↔🟢 |
