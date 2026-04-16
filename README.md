# hexo-relative-post-images

[中文](./README.zh-CN.md)

A Hexo plugin for posts that use local images with relative paths.

Hexo's default `post_asset_folder` works well when a post and its assets follow the standard one-to-one layout. But many projects use looser structures, for example:

```text
source/_posts/markdown-test.md
source/_posts/img/markdown-test-image.jpg

source/_posts/basic/index.md
source/_posts/basic/cover.jpg
source/_posts/basic/images/basic-demo.webp
```

In those cases, Markdown can still render image links, but Hexo may not copy the actual files into `public`. This plugin fills that gap by copying local relative images into the final post output directory after `hexo generate`.

## Features

- Supports Markdown images like `![alt](cover.jpg)` and `![alt](./images/demo.webp)`
- Supports HTML images like `<img src="./images/demo.webp">`
- Supports same-directory, child-directory, and parent-directory relative paths
- Follows Hexo's final post output path, including `url` or `permalink` if set
- Skips unchanged files with a lightweight `size + mtime` check
- Uses `Copied:` logs so it stays separate from Hexo's native `Generated:` logs
- Designed to be cross-platform for macOS, Linux, and Windows through Node.js `fs` and `path` APIs

## Install

```bash
npm install hexo-relative-post-images --save
```

or

```bash
yarn add hexo-relative-post-images
```

## Usage

Run:

```bash
hexo generate
```

or

```bash
npx hexo generate
```

Optional config in `_config.yml`:

```yml
relative_post_images:
  enable: true
  log_prefix: "[relative-post-images]"
```

Disable it completely:

```yml
relative_post_images: false
```

## Log Example

```text
INFO  [relative-post-images] Start copying relative post images
INFO  [relative-post-images] Copied: markdown-test/img/markdown-test-image.jpg
INFO  [relative-post-images] Finished: 1 copied, 3 skipped, 0 missing, 0 failed, 0 outside_source, 0 outside_public in 2 ms
```

## Limitations

- It complements `post_asset_folder`; it does not replace it
- It currently handles images only
- Incremental checks are based on `size + mtime`
- Image files must stay inside Hexo's `source` directory
- Do not reference files outside `source`, or files that would resolve outside the final `public` post directory
- If a source image is missing, or the resolved path is outside `source` / `public`, the plugin will log a warning and skip that file

## Full Example

Source files:

```text
source/_posts/basic/index.md
source/_posts/basic/cover.jpg
source/_posts/basic/images/basic-demo.webp
```

Markdown:

```md
![Cover](cover.jpg)
![Demo](./images/basic-demo.webp)
```

Generated output:

```text
public/basic/index.html
public/basic/cover.jpg
public/basic/images/basic-demo.webp
```

If the post sets:

```yml
url: custom/demo
```

then the output becomes:

```text
public/custom/demo/index.html
public/custom/demo/cover.jpg
public/custom/demo/images/basic-demo.webp
```

## Development

### Environment

- Node.js `>=18`
- Hexo `>=6`
- npm

### Local development

- Update code and README together
- Run `npm run lint`
- Test the plugin in a real Hexo project with `hexo generate`

### Release flow

1. Update `package.json` version
2. Commit and push to GitHub
3. Create and push a matching Git tag such as `v0.1.0`
4. Publish the same version to npm
5. Verify that the GitHub tag, npm version, and README all match

## License

MIT
