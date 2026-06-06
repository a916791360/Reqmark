# 标注大师 (Annotation Master)

> 给 HTML 原型一键打标注，像 Figma 评论一样简单。

🔴 角标定位 → 🖱️ hover 看需求 → 👆 单击固定 → 👆👆 双击标记已完成

## 安装

```bash
# 克隆到 Hermes skills 目录
git clone https://github.com/YOUR_USERNAME/hermes-annotation-master.git ~/.hermes/skills/product/annotation-master

# 或者直接复制
cp -r ./annotation-master ~/.hermes/skills/product/
```

重启 Hermes 或发送 `/reload-skills` 即可生效。

## 使用

```
# 方式1：随口说
"标注一下 /path/to/prototype.html"
"在搜索框标注：增加搜索历史下拉"

# 方式2：PRD 驱动
"根据这个PRD标注一下登录页和列表页"
```

## 功能

- **零侵入** — 仅加 `data-am-target` 属性，不修改样式/布局
- **单文件输出** — CSS/JS 全部内联，浏览器直接打开
- **PRD 驱动** — 扔文档过来，自动映射需求到 HTML 对应区域
- **页面隔离** — 多页面原型自动按 view 切换角标
- **状态管理** — 双击角标 🔴→🟢 标记已完成，清单同步
- **全滚动追踪** — 表格、抽屉、弹窗内角标实时跟随
- **视口感知 Tooltip** — 四方向智能翻转，不遮挡

## 结构

```
annotation-master/
├── SKILL.md              # Skill 定义 + 完整工作流程
├── README.md
└── templates/
    ├── annotation.css    # 浮层样式系统
    └── annotation.js     # 动态渲染引擎
```

## 版本

| 版本 | 关键特性 |
|------|---------|
| V1.0.0 | 初始：HTML 注入角标 |
| V1.0.1 | 浮层架构、零侵入 |
| V1.0.5 | 碰撞检测、滚动双保险 |
| V1.0.6 | 双击切换状态 🔴↔🟢 |
| V1.0.8 | 气泡 #N 标签同步变绿 |
