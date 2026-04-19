# hexo-relative-post-images

[English](./README.md)

这是一个 Hexo 插件，用来处理文章里通过相对路径引用本地图片的场景。

插件不会修改 Markdown 渲染流程，也不会改写渲染后的 HTML。`hexo generate` 完成后，插件会扫描文章源码，把相对路径引用的本地图片复制到文章最终输出目录。

Hexo 默认的 `post_asset_folder` 更适合“文章文件”和“资源目录”严格一一对应的结构。但很多项目里的文章组织会更自由，例如：

```text
source/_posts/markdown-test.md
source/_posts/img/markdown-test-image.jpg

source/_posts/basic/index.md
source/_posts/basic/cover.jpg
source/_posts/basic/images/basic-demo.webp
```

这种情况下，Markdown 里的图片链接虽然能被渲染出来，但 Hexo 不一定会把图片文件复制到 `public`。插件的作用就是在 `hexo generate` 后把这些本地相对路径图片补复制到文章最终输出目录里。

## 面向使用者

### 支持范围

- 支持同级、子目录、上级目录的相对路径
- 支持 Markdown 图片：`![alt](cover.jpg)`、`![alt](./images/demo.webp)`、`![alt](<cover image.png>)`
- 支持 HTML 图片：`<img src="./images/demo.webp">`、`<img src='./images/demo.webp'>`
- 跟随 Hexo 最终文章输出路径，设置了 `url` 或 `permalink` 也能正常工作
- 支持常见特殊字符文件名，例如空格、中文、括号，以及通过 URL 编码写出的 `#`、`?`
- front matter、代码块 (fenced code block) 和内联代码里的图片引用会被忽略
- 通过 `size + mtime` 做轻量增量跳过
- 基于 Node.js 的 `fs` 和 `path` API，设计上兼容 macOS、Linux 和 Windows

### 安装

```bash
npm install hexo-relative-post-images --save
```

或者

```bash
yarn add hexo-relative-post-images
```

### 快速使用

运行：

```bash
hexo generate
```

或者

```bash
npx hexo generate
```

可选配置，写到 `_config.yml`：

```yml
relative_post_images:
  enable: true
  log_prefix: "[relative-post-images]"
```

如果要完全关闭：

```yml
relative_post_images: false
```

### 渲染器兼容性

- `markdown-it`：`relative_link: true/false` 都可以
- `marked`：请使用 `relative_link: true`，或者设置 `marked.prependRoot: false`
- `marked.postAsset: true` 不支持

### 例子

源文件：

```text
source/_posts/basic/index.md
source/_posts/basic/cover.jpg
source/_posts/basic/images/basic-demo.webp
```

Markdown：

```md
![Cover](cover.jpg)
![Demo](./images/basic-demo.webp)
```

生成后：

```text
public/basic/index.html
public/basic/cover.jpg
public/basic/images/basic-demo.webp
```

如果文章设置了：

```yml
url: custom/demo
```

那么输出会变成：

```text
public/custom/demo/index.html
public/custom/demo/cover.jpg
public/custom/demo/images/basic-demo.webp
```

### 适用前提

- 当前只处理图片
- 图片文件必须放在 Hexo 的 `source` 目录里面
- 支持的结构是“真实文件系统相对路径”，例如 `source/_posts/foo/index.md` 配合 `source/_posts/foo/cover.jpg`
- 支持一些常见 inline Markdown 变体，例如可选 title
- HTML `<img>` 当前默认只支持带引号的 `src`，例如 `<img src="cover.jpg">` 或 `<img src='cover.jpg'>`

### 不支持或会忽略

- 不支持绝对路径
- 不会模拟 Hexo 官方 `foo.md` 对应 `foo/` 资源目录的映射语义
- `<img src=cover.jpg>` 这种无引号 HTML `src` 写法不在支持范围
- 标准引用式图片语法，例如 `![alt][logo]`，当前会产出 `warning_unsupported_syntax`，不会复制
- Obsidian wikilink 图片，例如 `![[image.png]]`，当前也会产出 `warning_unsupported_syntax`，不会复制
- 对某些主题的首页、归档页、摘要页来说，相对路径图片仍然可能不适用，因为这个插件不会改写渲染后的 HTML

## 面向维护者与 AI

### 设计约束

- `docs/SPEC.md` 是行为和兼容性边界的唯一设计依据
- `docs/REFERENCE.md` 记录调研、上游行为和外部 issue 分析
- 具体设计规则写在 `docs/SPEC.md`，README 不重复展开

### 环境要求

- Node.js `>=18`
- Hexo `>=6`
- npm

### 变更流程

- 先修改 `docs/SPEC.md`
- 再修改代码
- 再修改测试
- 最后同步更新 README
- 运行 `npm test`
- 运行 `npm run lint`

### 测试范围

- 单元测试在 [test/index.test.js](./test/index.test.js)
- 真实 Hexo 集成测试在 [test/hexo.integration.test.js](./test/hexo.integration.test.js)
- 解析相关 fixture 在 [test/test.md](./test/test.md)
- 当前测试覆盖 `marked`、`markdown-it`、`relative_link`、自定义 `permalink`、`url/root` 变化、特殊字符、代码块忽略、错误汇总

### 发布流程

```bash
# 1. 进入仓库目录
cd /path/to/hexo-relative-post-images

# 2. 把 package.json 改成目标版本
# 例如先把 0.1.3 改成 0.1.4，再继续下面步骤

# 3. 执行发布前检查
npm test
npm run lint
npm run pack:dry-run

# 4. 检查这次发布包含的改动
git status --short --branch
git diff

# 5. 提交发布版本
git add .
git commit -m "Release v0.1.4"

# 6. 推送发布提交到 GitHub
git push origin main

# 7. 创建并推送对应的 Git tag
git tag -a v0.1.4 -m "Release v0.1.4"
git push origin v0.1.4

# 8. 登录 npm
npm login

# 9. 把同一个版本发布到 npm
npm publish --access public

# 10. 最后核对 npm 和 GitHub 状态
npm view hexo-relative-post-images version dist-tags.latest --json
git ls-remote origin refs/heads/main
git ls-remote --tags origin v0.1.4 v0.1.4^{}
```

## License

MIT
