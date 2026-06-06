# 标注大师 1.0 — 注入技术参考

本参考文件记录在本次 session（易运盈商城 V1 原型，4.4MB，18 条标注）中验证过的注入模式。

## 文件特征
- 大文件（4.4MB），包含大量 inline base64 图片
- CSS 全部内联在 `<style>` 标签中，head 区约 2MB
- HTML 部分行高度压缩（单行可能包含复杂的嵌套结构）
- 三视图结构：`#login-view` → `#list-view` → `#detail-view`

## 注入流程（已验证）

### 阶段 1：准备
1. 用 `read_file` 读取文件头（确认是 HTML、获取概览）
2. 用 `search_files` 确认关键结构标记（`<section id="login-view"`, `<section id="list-view"` 等）
3. 用 `execute_code` + Python 的 `open()` 读取完整文件内容

### 阶段 2：定义标注
每个标注需要：
```python
{
    "id": 1,
    "location": "显示给用户的区域名称",
    "content": "完整需求说明（显示在 tooltip 中）",
    "anchor": '唯一的 HTML 字符串标记',
    "type": "div|button|select|input|section|aside|label|header"
}
```

### 阶段 3：锚点唯一性验证（CRITICAL）
**在实际注入前，必须验证每个 anchor 在文件中唯一。**
```python
for ann in annotations_data:
    count = html.count(ann["anchor"])
    assert count == 1, f"Anchor for #{ann['id']} appears {count} times!"
```

本次执行中 `<header class="header">` 出现 2 次（list-view + detail-view），需要特殊处理：用 `html.index(anchor, list_view_start)` 仅替换列表视图中的那个。

### 阶段 4：批量字符串替换
不同类型的元素，替换策略不同：

**容器类（div/section/aside/form/label/header）**：
```python
anchor = '<div class="invite-tip"'
replacement = '<div class="invite-tip" style="position:relative">' + badge_html(id, content)
html = html.replace(anchor, replacement, 1)
```

**按钮类（button）**：
```python
anchor = '<button id="send-code"'
replacement = '<button id="send-code" style="position:relative">' + badge_html(id, content)
html = html.replace(anchor, replacement, 1)
```

**自闭合类（select/input）**：
需要两步操作：
```python
# 步骤 1：替换 anchor，开始包装
anchor = '<select id="prefix" class="phone-prefix">'
replacement = '<span style="position:relative;display:inline-block"><select id="prefix" class="phone-prefix">'
html = html.replace(anchor, replacement, 1)

# 步骤 2：找到对应的 </select>，在其后插入 badge + </span>
select_pos = html.index('<span style="position:relative;display:inline-block"><select id="prefix"')
select_close = html.index('</select>', select_pos)
badge = badge_html(id, content)
html = html[:select_close + len('</select>')] + badge + '</span>' + html[select_close + len('</select>'):]
```

### 阶段 5：CSS 注入
- 位置：`</head>` 之前
- 格式：压缩为单行 CSS 以减少文件膨胀
- 使用 `html.index('</head>')` 定位，然后用切片插入

### 阶段 6：面板 HTML + JS 注入
- 位置：`</body>` 之前
- 面板 HTML：overlay + toggle 按钮 + 侧边栏（含所有标注清单项）
- JS：压缩为单行，内联标注 JSON 数据
- 使用 `html.index('</body>')` 定位

### 阶段 7：输出与验证
```python
output_path = original_path.replace('.html', '-标注版.html')
with open(output_path, 'w', encoding='utf-8') as f:
    f.write(html)
```

验证检查清单：
- `</head>` / `</body>` 各 1 次
- 每个 `data-annotation-id` 出现 2 次（HTML badge + JS 数据）
- 关键结构标记（view sections）数量不变

## badge_html 辅助函数
```python
def badge_html(aid, content):
    safe_content = content.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;').replace('"', '&quot;')
    return (
        f'<span class="am-badge" data-annotation-id="{aid}">{aid}'
        f'<span class="am-tooltip">'
        f'<span class="am-close">&times;</span>'
        f'<span class="am-tooltip-id">#{aid}</span>'
        f'{safe_content}'
        f'</span>'
        f'</span>'
    )
```

## 常见陷阱

1. **header 标签重复**：`<header class="header">` 可能在多视图间重复。需要用 viewsection ID 作为上下文限定搜索范围。
2. **header-right 重复**：同 header 一样，需要用 list-view 上下文限定。
3. **select 不能包含 span**：`<select>` 内不能直接放 `<span class="am-badge">` —— 必须用外部包装法。
4. **inline base64 膨胀**：文件的 base64 iVBOR 图片占大部分体积，锚点搜索不会被它们影响，但用 `read_file` 读取大段会截断。
5. **CSS 中的 `</style>` 计数**：如果原文件 CSS 中包含类似 `</style>` 的字符串片段（如在 @media 或其他位置），不要惊慌。只要我们的 `<style>` 块正确闭合即可。
