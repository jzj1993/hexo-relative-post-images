# hexo-relative-post-images

[中文](./README.md)

A Hexo plugin for post image layouts that are not handled well by Hexo's default `post_asset_folder` rules. When a post uses local images through relative paths, this plugin copies those images into the post's final `public` output directory after `hexo generate`.

## What It Solves

Hexo's built-in `post_asset_folder` works best with this kind of layout:

```text
source/_posts/hello.md
source/_posts/hello/image.png
```

But many projects use more flexible layouts, such as:

```text
source/_posts/markdown-test.md
source/_posts/img/markdown-test-image.jpg

source/_posts/basic/index.md
source/_posts/basic/images/basic-demo.webp

source/_posts/notes/deep/path-demo/index.md
source/_posts/notes/deep/path-demo/media/path-demo.jpg
```

In these cases, the page may contain image links, but the matching files may not exist in `public`. This plugin fills that gap.

## Features

- Supports Markdown images: `![alt](./img/example.jpg)`
- Supports HTML images: `<img src="./img/example.jpg">`
- Only handles local relative paths
- Copies files into the matching post output directory
- Lightweight incremental skip based on `size + mtime`
- Uses separate logs instead of Hexo's native `Generated:` wording

## Installation

Run this in the root of your Hexo project:

```bash
npm install hexo-relative-post-images --save
```

or:

```bash
yarn add hexo-relative-post-images
```

No manual `require` is needed. Hexo automatically loads installed packages whose names start with `hexo-`.

## Common Directory Layout

### source layout

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

### image references in Markdown

```md
![Same directory image](cover.jpg)
![Same directory image](./cover.jpg)
![Local image](img/markdown-test-image.jpg)
![Example image](./images/basic-demo.webp)
![Nested image](./media/path-demo.jpg)
```

Notes:

- `cover.jpg` and `./cover.jpg` both mean an image in the same directory as the Markdown file
- `img/xxx.jpg` means an image in a child directory
- `../xxx.jpg` also works for a parent directory

### generated public layout

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

## Usage

After installation, just run:

```bash
hexo generate
```

or:

```bash
npx hexo generate
```

The plugin runs in the `after_generate` stage, scans all posts, and copies locally referenced relative images into the correct output locations.

## URL Behavior

The plugin does not read the front matter `url` field directly. It follows the final post output path that Hexo has already resolved.

- If the post sets `url` or `permalink`, the plugin copies images under that final output path
- If not, it follows Hexo's default post path rules

So the plugin uses Hexo's final result. It does not calculate a separate URL on its own.

## Full Example

Assume the post is:

```text
source/_posts/markdown-test.md
```

The image is:

```text
source/_posts/img/cover.jpg
```

And the Markdown uses:

```md
![Cover](img/cover.jpg)
```

After generate:

```text
public/markdown-test/index.html
public/markdown-test/img/cover.jpg
```

So the relative path `img/cover.jpg` works correctly.

Images in the same directory also work:

```text
source/_posts/basic/index.md
source/_posts/basic/cover.jpg
```

Markdown:

```md
![Cover](cover.jpg)
```

After generate:

```text
public/basic/index.html
public/basic/cover.jpg
```

If the post front matter contains:

```yml
url: custom/demo
```

then the output becomes:

```text
public/custom/demo/index.html
public/custom/demo/img/cover.jpg
```

## Configuration

No configuration is required by default. You can optionally add this to your Hexo `_config.yml`:

```yml
relative_post_images:
  enable: true
  log_prefix: "[relative-post-images]"
```

Fields:

- `enable`: enable or disable the plugin, default `true`
- `log_prefix`: log prefix, default `[relative-post-images]`

To disable it completely:

```yml
relative_post_images: false
```

## Log Example

```text
INFO  [relative-post-images] Start copying relative post images
INFO  [relative-post-images] Copied: markdown-test/img/markdown-test-image.jpg
INFO  [relative-post-images] Copied: basic/images/basic-demo.webp
INFO  [relative-post-images] Finished: 2 copied, 3 skipped in 2 ms
```

## Limitations

- This is a complement, not a replacement for native `post_asset_folder`
- It currently handles images only, not videos, PDFs, or normal links
- Incremental checks are based on `size + mtime`

## License

MIT
