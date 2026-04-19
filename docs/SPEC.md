# hexo-relative-post-images 规格说明

## 1. 目标

本插件只做一件事：

- 在 `hexo generate` 完成后扫描文章 Markdown 源码
- 找出其中“相对路径引用的本地图片”
- 把这些图片复制到文章最终输出目录中的对应相对位置

本插件不做的事情：

- 不修改 Markdown 渲染流程
- 不改写渲染后的 HTML
- 不生成绝对 URL
- 不解决编辑器本地预览问题

## 2. 核心规则

### 2.1 Source of truth

图片路径以文章 Markdown 源码为准，不以渲染后的 HTML 为准。

### 2.2 Relative only

本插件只支持相对路径，本质上是“复制文件”，不是“改写路径”。

### 2.3 输出目标

图片复制目标跟随文章最终输出目录。

示例：

```text
source/_posts/basic/index.md
source/_posts/basic/cover.jpg
source/_posts/basic/images/demo.webp
```

Markdown：

```md
![Cover](cover.jpg)
![Demo](./images/demo.webp)
```

生成结果：

```text
public/basic/index.html
public/basic/cover.jpg
public/basic/images/demo.webp
```

如果文章最终输出路径变化，例如设置了 `url` 或 `permalink`，图片也必须跟随新的输出目录复制。

### 2.4 统一处理结果

扫描过程中只有三种处理结果：

- `ignore`：完全忽略，不复制，不记录，不进入汇总
- `warning`：跳过当前图片，记录单条日志，按类型进入最终汇总，继续处理
- `error`：属于配置级错误，直接中断插件执行

## 3. 语法支持

### 3.1 必须支持

1. inline Markdown image

支持：

```md
![alt](cover.jpg)
![alt](./images/demo.webp)
![alt](../shared/banner.png)
![alt](<cover image.png>)
![alt](cover.jpg "title")
![alt]
(cover.jpg)
![alt](special(v1).png)
![alt](special%28v1%29.png)
```

2. HTML `<img>`

支持：

```html
<img src="./images/demo.webp">
<img src="../shared/banner.png">
<img src='./images/demo.webp'>
```

说明：

- 当前只承诺支持带引号的 `src`
- 当前不做完整 Markdown 图片解析器

### 3.2 当前不支持，但要单独 warning

以下属于标准 Markdown 图片语法，但不是图片目标里直接写相对路径的形式。当前版本不复制，必须记为 warning：

- 完整引用式：`![alt][logo]`
- 折叠引用式：`![alt][]`
- 快捷引用式：`![logo]`

结果：`warning`

### 3.3 当前不支持，但要单独 warning

以下语法也不是图片目标里直接写相对路径的形式。当前版本不复制，必须记为 warning：

- Obsidian wikilink 图片：`![[image.png]]`

结果：`warning`

### 3.4 忽略的引用

以下引用不属于本插件处理范围，应忽略：

- `https://...`
- `http://...`
- `//cdn.example.com/...`
- `data:...`
- `mailto:...`
- `tel:...`
- `#demo`

结果：`ignore`

### 3.5 忽略的上下文

以下上下文中的图片写法不参与扫描：

- front matter
- inline code 里的 Markdown 图片
- inline code 里的 HTML `<img>`
- fenced code block 里的 Markdown 图片
- fenced code block 里的 HTML `<img>`

结果：`ignore`

## 4. 路径规则

### 4.1 支持的目录关系

支持：

- 同目录
- 子目录
- 父目录

前提：

- 解析后的源文件必须仍在 Hexo `source` 目录内
- 解析后的目标文件必须仍在 Hexo `public` 目录内

### 4.2 绝对路径

任何本地绝对路径都不支持，必须记为 `warning_absolute_path`。

包括：

- 站点根路径：`/images/demo.png`
- POSIX 绝对路径：`/Users/name/site/source/demo.png`
- Windows 盘符路径：`C:\site\source\demo.png`
- Windows UNC 路径：`\\server\share\demo.png`

结果：`warning`

### 4.3 越界路径

如果路径解析后：

- 源文件超出 `source` 目录，记为 `warning_outside_source`
- 目标文件超出 `public` 目录，记为 `warning_outside_public`

结果：`warning`

### 4.4 特殊字符

当前必须正确处理：

- 空格
- 中文和其他 Unicode 字符
- 圆括号 `(` `)`
- 文件名中的 `#`
- 文件名中的 `?`

推荐写法：

```md
![img](<cover image.png>)
![img](cover%20image.png)
![img](<special(v1).png>)
![img](special%28v1%29.png)
![img](hash%23name.png)
![img](query%3Fname.png)
```

路径解释规则：

- 去掉 query
- 去掉 fragment
- 对合法 URL 编码做解码
- 保留目录层级

例如：

- `hash%23name.png` 解析为 `hash#name.png`
- `query%3Fname.png` 解析为 `query?name.png`

补充规则：

- URL 解码按 path segment 进行
- 如果某个 segment 解码后包含 `/` 或 `\`，则保留原始 segment，不接受这次解码结果

### 4.5 输出目录与 `post.path`

与 §4.4 分工：§4.4 只解析**正文里的图片路径**；复制落点一律按 Hexo 的 **`post.path`** 推导。默认配置下文章目录含中文、空格等时，`post.path` 与 `public` 通常一致即可用。插件**不**对 `post.path` 与磁盘路径做 URL 编码归一化。

## 5. Hexo 兼容性

### 5.1 与 `post_asset_folder` 的关系

本插件是补充，不是替代。

它支持：

```text
source/_posts/foo/index.md
source/_posts/foo/cover.jpg
```

它不模拟：

```text
source/_posts/foo.md
source/_posts/foo/cover.jpg
```

### 5.2 `markdown-it`

`markdown-it` 在 `relative_link: true/false` 下都应兼容。

### 5.3 `marked`

`marked` 兼容条件必须满足以下之一：

- `relative_link: true`
- `marked.prependRoot: false`

如果不满足，视为配置级错误。

### 5.4 不兼容配置

以下配置必须直接报错并中断插件执行：

- `marked.postAsset: true`
- `marked.prependRoot: true` 且 `relative_link: false`

### 5.5 页面显示限制

本插件保证“文章输出目录里图片文件存在”，但不保证以下页面里相对图片一定显示正确：

- 首页
- 归档页
- 列表页
- feed

原因是这些页面可能不是以文章页面作为相对路径基准，而本插件不会改写渲染后的 HTML。

### 5.6 插件自身配置

插件支持：

```yml
relative_post_images:
  enable: true
  log_prefix: "[relative-post-images]"
```

规则：

- `enable: false` 时插件直接跳过执行
- `log_prefix` 用于所有日志输出

## 6. 结果与日志

### 6.1 `error`

`error` 只用于配置级问题，必须直接中断插件执行。

包括：

- `marked.postAsset: true`
- `marked.prependRoot: true` 且 `relative_link: false`

### 6.2 `warning`

`warning` 只用于图片级问题，不中断整站处理。

包括：

- `warning_absolute_path`
- `warning_source_image_missing`
- `warning_outside_source`
- `warning_outside_public`
- `warning_post_read_failed`
- `warning_unsupported_syntax`

其中：

- `warning_absolute_path`：图片引用是本地绝对路径
- `warning_source_image_missing`：图片引用是相对路径，但源图片文件不存在
- `warning_outside_source`：相对路径解析后，源图片文件跑出了 Hexo `source` 目录
- `warning_outside_public`：相对路径解析后，目标复制路径跑出了 Hexo `public` 目录
- `warning_post_read_failed` 专指“文章源码读取失败”
- `warning_unsupported_syntax`：当前不支持的图片语法，包括标准 Markdown 引用式图片和 Obsidian wikilink 图片

每个 `warning` 都必须：

- 单条输出日志
- 日志至少包含 warning 类型、原始图片引用、所在文章
- 继续处理其他图片
- 继续处理其他文章
- 进入最终分类汇总

### 6.3 `ignore`

`ignore` 不复制、不记录、不进入最终汇总。

### 6.4 最终汇总

任务结束时必须输出分类汇总。

至少包括：

- `copied`
- `skipped`
- `warnings_total`
- `warning_absolute_path`
- `warning_source_image_missing`
- `warning_post_read_failed`
- `warning_outside_source`
- `warning_outside_public`
- `warning_unsupported_syntax`

其中：

- `warnings_total` 是所有图片级 warning 之和
- 每种 warning 类型都必须单独展示
- `skipped` 指目标文件已存在，且 `size + mtime` 与源文件一致

## 7. 验收要求

### 7.1 单元测试

至少覆盖：

- Markdown 图片提取
- HTML 图片提取
- Markdown 可选 title
- Markdown 跨行目标，例如 `![alt]` 换行后接 `(cover.jpg)`
- 尖括号目标
- 单引号 HTML `src`
- 特殊字符和 URL 编码
- front matter 忽略
- 忽略 inline code
- 忽略 fenced code block
- 忽略 `mailto:`、`tel:` 这类非文件引用
- 绝对路径记为 `warning_absolute_path`
- 引用式图片记为 `warning_unsupported_syntax`
- Obsidian wikilink 记为 `warning_unsupported_syntax`
- 越界保护
- `warning_source_image_missing`
- `warning_post_read_failed`
- `skipped` 统计
- warning 汇总
- URL 解码后如果 path segment 里出现 `/` 或 `\`，必须保留原始 segment

### 7.2 真实 Hexo 集成测试

至少覆盖：

- `hexo-renderer-marked`
- `hexo-renderer-markdown-it`
- `relative_link: false`
- `relative_link: true`
- 自定义 `permalink`
- `url/root` 变化
- `marked.prependRoot: false`
- `marked.prependRoot: true` + `relative_link: true`
- `marked.postAsset: true` 必须直接报错
- 文章目录名含中文或空格（§4.5）

验收点：

- 渲染器变化不应破坏图片复制
- `relative_link` 变化不应破坏图片复制
- 输出目录应跟随最终 `post.path`（文章路径含中文、空格等见 §4.5）
- 特殊字符文件名应正确复制
- 图片级 warning 不中断整站，且最终汇总正确

## 8. 备注

- 上游实现、CommonMark、外部 issue 和设计推导过程见 [REFERENCE.md](./REFERENCE.md)
