# 调研参考

## 1. Hexo 官方与渲染器

- Hexo 资源文件夹文档
  - https://hexo.io/zh-cn/docs/asset-folders
  - 用来确认 `post_asset_folder` 的官方语义，以及普通 Markdown 相对路径在首页/归档页的限制

- hexo-renderer-marked
  - https://github.com/hexojs/hexo-renderer-marked
  - 用来确认 `prependRoot`、`postAsset` 等配置的设计意图

- marked 官方仓库
  - https://github.com/markedjs/marked
  - 用来确认标准 Markdown 图片、链接目标在主流实现中的实际解析方式

- hexo-renderer-markdown-it
  - https://github.com/hexojs/hexo-renderer-markdown-it
  - 用来确认 markdown-it 路径处理链路

- markdown-it 官方仓库
  - https://github.com/markdown-it/markdown-it
  - 用来确认标准 Markdown 图片、链接目标、引用式图片在主流实现中的实际支持情况

- Hexo core 本地源码
  - 用来确认 `_config.yml` 的加载条件、`relative_link` 默认值，以及程序化测试时哪些配置需要手动注入

## 2. Markdown 规范

- CommonMark 规范
  - https://spec.commonmark.org/0.31.2/
  - 本次关注点：
    - 图片语法本质上复用链接语法
    - link destination 支持裸目标和尖括号目标
    - 图片除了 inline image 之外，还有引用式图片

本次从规范得到的关键结论：

- `![img](<cover image.png>)` 是标准 CommonMark 写法，不是 Obsidian 特有
- 引用式图片 `![alt][label]`、`![alt][]`、`![label]` 也属于标准 Markdown 图片语法
- Obsidian `![[image.png]]` wikilink 图片不属于 CommonMark 标准

## 3. Marked 源码调研

本地代码位置：

- [`../node_modules/marked/lib/marked.cjs`](../node_modules/marked/lib/marked.cjs)

本次重点查看：

- [`../node_modules/marked/lib/marked.cjs`](../node_modules/marked/lib/marked.cjs)
  - 位置：`237`
  - `link` 正则里 `href` 明确允许两类形式：
    - `<...>`
    - 非空白裸目标

- [`../node_modules/marked/lib/marked.cjs`](../node_modules/marked/lib/marked.cjs)
  - 位置：`877`
  - `Tokenizer.link()` 同时处理 link 和 image

- [`../node_modules/marked/lib/marked.cjs`](../node_modules/marked/lib/marked.cjs)
  - 位置：`880`
  - 当目标以 `<` 开头时，`marked` 会走尖括号分支校验闭合

- [`../node_modules/marked/lib/marked.cjs`](../node_modules/marked/lib/marked.cjs)
  - 位置：`914`
  - 后续会把外层尖括号剥掉，得到真正的 `href`

- [`../node_modules/marked/lib/marked.cjs`](../node_modules/marked/lib/marked.cjs)
  - 位置：`890`
  - 对非尖括号目标，`marked` 会专门处理括号闭合

本次从 `marked` 得到的关键结论：

- `marked` 显式支持尖括号包裹的图片目标
- `![img](<cover image.png>)` 会被 `marked` 解析为 `href = "cover image.png"`
- `marked` 对裸目标和尖括号目标的边界处理不一样
- 如果文件名里有空格或括号，尖括号包裹是更稳妥的标准写法

## 4. hexo-renderer-marked 本地源码调研

本地代码位置：

- [`../node_modules/hexo-renderer-marked/index.js`](../node_modules/hexo-renderer-marked/index.js)
- [`../node_modules/hexo-renderer-marked/lib/renderer.js`](../node_modules/hexo-renderer-marked/lib/renderer.js)

本次重点查看：

- [`../node_modules/hexo-renderer-marked/index.js`](../node_modules/hexo-renderer-marked/index.js)
  - 位置：`7`
  - 默认配置里 `prependRoot: true`

- [`../node_modules/hexo-renderer-marked/index.js`](../node_modules/hexo-renderer-marked/index.js)
  - 位置：`22`
  - 默认配置里 `postAsset: false`

- [`../node_modules/hexo-renderer-marked/lib/renderer.js`](../node_modules/hexo-renderer-marked/lib/renderer.js)
  - 位置：`143`
  - 当 `!relative_link && prependRoot` 时会对图片 `href` 走根路径改写

- [`../node_modules/hexo-renderer-marked/lib/renderer.js`](../node_modules/hexo-renderer-marked/lib/renderer.js)
  - 位置：`151`
  - 最终通过 `url_for` 把图片地址变成根路径形式

- [`../node_modules/hexo-renderer-marked/lib/renderer.js`](../node_modules/hexo-renderer-marked/lib/renderer.js)
  - 位置：`248`
  - `post_asset_folder && prependRoot && postAsset` 三者同时满足时，会走 post asset 解析逻辑

本次从 `hexo-renderer-marked` 得到的关键结论：

- `marked` 在 Hexo 里并不是“原样输出相对图片路径”
- 默认配置下，`prependRoot: true` 会让相对图片路径变成根路径图片
- 所以本项目要兼容 `marked`，必须额外约束：
  - `relative_link: true`
  - 或 `marked.prependRoot: false`
- `marked.postAsset: true` 与本项目的 relative-only 设计冲突
## 5. markdown-it 源码调研

本地代码位置：

- [`../node_modules/markdown-it/lib/rules_inline/image.js`](../node_modules/markdown-it/lib/rules_inline/image.js)
- [`../node_modules/markdown-it/lib/helpers/parse_link_destination.js`](../node_modules/markdown-it/lib/helpers/parse_link_destination.js)

本次重点查看：

- [`../node_modules/markdown-it/lib/rules_inline/image.js`](../node_modules/markdown-it/lib/rules_inline/image.js)
  - 位置：`9`
  - `image` rule 单独处理图片，不是简单把图片当成 link token

- [`../node_modules/markdown-it/lib/rules_inline/image.js`](../node_modules/markdown-it/lib/rules_inline/image.js)
  - 位置：`54`
  - inline image 的目标地址解析交给 `parseLinkDestination`

- [`../node_modules/markdown-it/lib/rules_inline/image.js`](../node_modules/markdown-it/lib/rules_inline/image.js)
  - 位置：`94`
  - 明确支持 link reference / image reference

- [`../node_modules/markdown-it/lib/rules_inline/image.js`](../node_modules/markdown-it/lib/rules_inline/image.js)
  - 位置：`112`
  - 支持 collapsed reference 和 shortcut reference

- [`../node_modules/markdown-it/lib/helpers/parse_link_destination.js`](../node_modules/markdown-it/lib/helpers/parse_link_destination.js)
  - 位置：`19`
  - 尖括号目标分支

- [`../node_modules/markdown-it/lib/helpers/parse_link_destination.js`](../node_modules/markdown-it/lib/helpers/parse_link_destination.js)
  - 位置：`45`
  - 裸目标分支，支持括号层级计数

本次从 `markdown-it` 得到的关键结论：

- `markdown-it` 明确支持尖括号图片目标
- `markdown-it` 明确支持引用式图片
- `markdown-it` 的裸目标解析支持括号层级，不只是最简单的 `foo.png`
- 对 `markdown-it` 来说，`![img](<cover image.png>)` 是标准路径写法，不是兼容补丁

## 6. Hexo core 本地源码调研

本地代码位置：

- [`../node_modules/hexo/dist/hexo/load_config.js`](../node_modules/hexo/dist/hexo/load_config.js)
- [`../node_modules/hexo/dist/hexo/default_config.js`](../node_modules/hexo/dist/hexo/default_config.js)

本次重点查看：

- [`../node_modules/hexo/dist/hexo/load_config.js`](../node_modules/hexo/dist/hexo/load_config.js)
  - 位置：`21`
  - `load_config` 在 `ctx.env.init` 不成立时直接返回

- [`../node_modules/hexo/dist/hexo/load_config.js`](../node_modules/hexo/dist/hexo/load_config.js)
  - 位置：`33`
  - 配置文件内容会 merge 进 `ctx.config`

- [`../node_modules/hexo/dist/hexo/default_config.js`](../node_modules/hexo/dist/hexo/default_config.js)
  - 位置：`40`
  - `relative_link` 默认值是 `false`

本次从 Hexo core 得到的关键结论：

- 程序化测试时，不能想当然认为 `_config.yml` 一定已经被加载
- `relative_link` 的默认值是 `false`
- 这会直接影响我们对 `marked` 默认行为的判断，也影响测试里配置注入的方式

## 7. 相关项目 issue 调研

- xcodebuild/hexo-asset-image issues
  - https://github.com/xcodebuild/hexo-asset-image/issues

- yiyungent/hexo-asset-img issues
  - https://github.com/yiyungent/hexo-asset-img/issues

本次实际看过的 issue：

- `yiyungent/hexo-asset-img`
  - [#1](https://github.com/yiyungent/hexo-asset-img/issues/1)
  - [#4](https://github.com/yiyungent/hexo-asset-img/issues/4)
  - [#10](https://github.com/yiyungent/hexo-asset-img/issues/10)
  - [#14](https://github.com/yiyungent/hexo-asset-img/issues/14)
  - [#15](https://github.com/yiyungent/hexo-asset-img/issues/15)

- `xcodebuild/hexo-asset-image`
  - [#44](https://github.com/xcodebuild/hexo-asset-image/issues/44)
  - [#46](https://github.com/xcodebuild/hexo-asset-image/issues/46)
  - [#47](https://github.com/xcodebuild/hexo-asset-image/issues/47)
  - [#49](https://github.com/xcodebuild/hexo-asset-image/issues/49)
  - [#50](https://github.com/xcodebuild/hexo-asset-image/issues/50)
  - [#51](https://github.com/xcodebuild/hexo-asset-image/issues/51)
  - [#52](https://github.com/xcodebuild/hexo-asset-image/issues/52)
  - [#56](https://github.com/xcodebuild/hexo-asset-image/issues/56)
  - [#59](https://github.com/xcodebuild/hexo-asset-image/issues/59)
  - [#60](https://github.com/xcodebuild/hexo-asset-image/issues/60)
  - [#61](https://github.com/xcodebuild/hexo-asset-image/issues/61)
  - [#62](https://github.com/xcodebuild/hexo-asset-image/issues/62)

本次从 issue 调研得到的关键结论：

- 改写渲染后的 HTML 很容易引入代码块误处理、URL 拼接错误、root 重复等问题
- 绝对路径方案容易受 `url`、`root`、子目录部署、permalink、abbrlink 影响
- “编辑器里本地预览图片”与“Hexo 生成产物正确复制图片”是两类不同需求

## 8. 当前对产品设计有直接影响的结论

- 尖括号图片目标必须纳入标准支持范围
- “支持 Markdown 图片”不能笼统表述，应区分：
  - inline image
  - 引用式图片
  - Obsidian wikilink 图片
- 引用式图片既是 CommonMark 标准范围，也是 `marked` / `markdown-it` 这两类主流实现的实际支持范围
- `marked` 的 Hexo 集成默认并不保持相对图片路径，兼容条件必须单独写清楚
- `_config.yml` 的加载前提和 `relative_link` 默认值会影响测试设计，不能在程序化测试里省略
- 如果当前实现还没支持引用式图片，spec 里必须明确写成“标准语法，但当前未承诺支持”
- 若后续扩展 Markdown 图片支持，优先级应先于支持 Obsidian 专有语法
