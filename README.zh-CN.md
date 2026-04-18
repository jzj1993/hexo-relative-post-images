# hexo-relative-post-images

[English](./README.md)

一个 Hexo 插件，用来处理文章里通过相对路径引用本地图片的场景。

Hexo 默认的 `post_asset_folder` 更适合“文章文件”和“资源目录”严格一一对应的结构。但很多项目里的文章组织会更自由，例如：

```text
source/_posts/markdown-test.md
source/_posts/img/markdown-test-image.jpg

source/_posts/basic/index.md
source/_posts/basic/cover.jpg
source/_posts/basic/images/basic-demo.webp
```

这种情况下，Markdown 里的图片链接虽然能被渲染出来，但 Hexo 不一定会把图片文件复制到 `public`。这个插件就是在 `hexo generate` 后把这些本地相对路径图片补复制到文章最终输出目录里。

## 功能

- 支持 Markdown 图片：`![alt](cover.jpg)`、`![alt](./images/demo.webp)`
- 支持 HTML 图片：`<img src="./images/demo.webp">`
- 会忽略代码块 (fenced code block) 和内联代码里的图片引用
- 支持同级、子目录、上级目录的相对路径
- 跟随 Hexo 最终文章输出路径，设置了 `url` 或 `permalink` 也能正常工作
- 通过 `size + mtime` 做轻量增量跳过
- 日志使用 `Copied:`，和 Hexo 原生 `Generated:` 区分开
- 基于 Node.js 的 `fs` 和 `path` API，设计上兼容 macOS、Linux 和 Windows

## 安装

```bash
npm install hexo-relative-post-images --save
```

或者

```bash
yarn add hexo-relative-post-images
```

## 使用

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

## 日志示例

```text
INFO  [relative-post-images] Start copying relative post images
INFO  [relative-post-images] Copied: markdown-test/img/markdown-test-image.jpg
INFO  [relative-post-images] Finished: 1 copied, 3 skipped, 0 missing, 0 failed, 0 outside_source, 0 outside_public in 2 ms
```

## 限制

- 它是 `post_asset_folder` 的补充，不是替代
- 当前只处理图片
- 增量判断基于 `size + mtime`
- 图片文件必须放在 Hexo 的 `source` 目录里面
- 不要引用 `source` 外面的文件，也不要让路径解析后落到文章最终 `public` 目录外面
- 如果源图片不存在，或者解析后的路径超出 `source` / `public` 范围，插件会输出 warning 并跳过

## 完整例子

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

## 开发

### 环境配置

- Node.js `>=18`
- Hexo `>=6`
- npm

### 本地开发

- 改代码时同步更新 README
- 运行 `npm run lint`
- 用实际 Hexo 项目执行 `hexo generate`

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
