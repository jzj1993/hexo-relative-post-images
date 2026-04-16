# hexo-relative-post-images

[English](./README.en.md)

一个 Hexo 插件，用来处理 Hexo 默认 `post_asset_folder` 覆盖不到的文章图片场景：当文章用相对路径引用本地图片时，插件会在 `hexo generate` 后把图片复制到文章对应的 `public` 输出目录。

## 解决什么问题

Hexo 原生的 `post_asset_folder` 更适合这种结构：

```text
source/_posts/hello.md
source/_posts/hello/image.png
```

但很多项目里的文章结构会更自由，例如：

```text
source/_posts/markdown-test.md
source/_posts/img/markdown-test-image.jpg

source/_posts/basic/index.md
source/_posts/basic/images/basic-demo.webp

source/_posts/notes/deep/path-demo/index.md
source/_posts/notes/deep/path-demo/media/path-demo.jpg
```

这时页面里会有图片链接，但 `public` 里不一定有对应文件。这个插件就是补这个缺口。

## 功能特性

- 支持 Markdown 图片：`![alt](./img/example.jpg)`
- 支持 HTML 图片：`<img src="./img/example.jpg">`
- 只处理本地相对路径
- 自动复制到文章对应的 `public` 目录
- 支持轻量增量跳过：`size + mtime` 相同就不重复复制
- 日志和 Hexo 原生 `Generated:` 区分开

## 安装

在你的 Hexo 项目根目录执行：

```bash
npm install hexo-relative-post-images --save
```

或者：

```bash
yarn add hexo-relative-post-images
```

安装后不需要再手动 `require`，Hexo 会自动加载符合 `hexo-*` 命名的插件包。

## 最常见的目录结构

### source 目录

```text
source/
└── _posts/
    ├── markdown-test.md
    ├── img/
    │   └── markdown-test-image.jpg
    ├── basic/
    │   ├── index.md
    │   ├── cover.jpg
    │   └── images/
    │       └── basic-demo.webp
    └── notes/
        └── deep/
            └── path-demo/
                ├── index.md
                └── media/
                    └── path-demo.jpg
```

### Markdown 里的引用方式

```md
![同级图片](cover.jpg)
![同级图片](./cover.jpg)
![本地图](img/markdown-test-image.jpg)
![示例图](./images/basic-demo.webp)
![深层目录图片](./media/path-demo.jpg)
```

其中：

- `cover.jpg` 和 `./cover.jpg` 都表示引用 Markdown 同级目录里的图片
- `img/xxx.jpg` 表示引用当前目录下的子目录图片
- `../xxx.jpg` 也可以，表示引用上一级目录图片

### 生成后的 public 目录

```text
public/
├── markdown-test/
│   ├── index.html
│   └── img/
│       └── markdown-test-image.jpg
├── basic/
│   ├── index.html
│   ├── cover.jpg
│   └── images/
│       └── basic-demo.webp
└── deep-path/
    ├── index.html
    └── media/
        └── path-demo.jpg
```

## 使用方式

安装完成后，直接运行：

```bash
hexo generate
```

或者：

```bash
npx hexo generate
```

插件会在 `after_generate` 阶段扫描所有文章内容，把文章里通过相对路径引用的本地图片复制到对应输出目录。

## URL 规则

插件不直接读取 front matter 里的 `url` 字段，而是跟着 Hexo 最终算出来的文章输出路径走。

- 如果文章设置了 `url` 或 `permalink`，插件会按这个最终输出路径复制图片
- 如果没有设置，插件会按 Hexo 默认规则处理

也就是说，插件使用的是 Hexo 的最终结果，不自己重算一套 URL。

## 一个完整例子

假设文章是：

```text
source/_posts/markdown-test.md
```

图片是：

```text
source/_posts/img/cover.jpg
```

Markdown 里这样写：

```md
![封面图](img/cover.jpg)
```

生成后：

```text
public/markdown-test/index.html
public/markdown-test/img/cover.jpg
```

这样页面里的 `img/cover.jpg` 就能正常访问。

同级目录图片也一样可以：

```text
source/_posts/basic/index.md
source/_posts/basic/cover.jpg
```

Markdown：

```md
![封面图](cover.jpg)
```

生成后：

```text
public/basic/index.html
public/basic/cover.jpg
```

如果这篇文章在 front matter 里设置了：

```yml
url: custom/demo
```

那么输出会变成：

```text
public/custom/demo/index.html
public/custom/demo/img/cover.jpg
```

## 配置

默认情况下无需配置。你也可以在 Hexo 的 `_config.yml` 中增加：

```yml
relative_post_images:
  enable: true
  log_prefix: "[relative-post-images]"
```

配置项：

- `enable`: 是否启用，默认 `true`
- `log_prefix`: 日志前缀，默认 `[relative-post-images]`

如果想临时禁用，也可以写成：

```yml
relative_post_images: false
```

## 日志示例

```text
INFO  [relative-post-images] Start copying relative post images
INFO  [relative-post-images] Copied: markdown-test/img/markdown-test-image.jpg
INFO  [relative-post-images] Copied: basic/images/basic-demo.webp
INFO  [relative-post-images] Finished: 2 copied, 3 skipped in 2 ms
```

## 限制

- 这是补充插件，不替代 Hexo 原生 `post_asset_folder`
- 目前只处理图片，不处理视频、PDF、普通链接
- 增量判断基于 `size + mtime`

## License

MIT
