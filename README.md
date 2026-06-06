# 标注大师 (Reqmark)

> 给 HTML 原型一键打标注，像 Figma 评论一样简单。

🔴 角标定位 → 🖱️ hover 看需求 → 👆 单击固定 → 👆👆 双击标记已完成

## 安装

```bash
git clone https://github.com/a916791360/reqmark.git ~/.hermes/skills/product/annotation-master
```

## 使用

```
"标注一下 /path/to/prototype.html"
"在搜索框标注：增加搜索历史下拉"
"根据这个PRD标注一下登录页和列表页"
```

## 功能

- **零侵入** — 仅加 `data-am-target` 属性，不修改样式/布局
- **单文件输出** — CSS/JS 全部内联，浏览器直接打开
- **PRD 驱动** — 扔文档自动映射需求到 HTML
- **页面隔离** — 多页面原型按 view 切换角标
- **状态管理** — 双击角标 🔴→🟢 标记已完成
- **全滚动追踪** — 表格/抽屉/弹窗角标实时跟随
- **视口感知 Tooltip** — 四方向智能翻转
