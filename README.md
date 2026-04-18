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
- Supports site-root absolute paths like `![alt](/images/demo.webp)` and `<img src="/images/demo.webp">`
- Ignores image references inside fenced code blocks and inline code
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
- OS filesystem absolute paths such as `C:\demo.png` or `\\server\share\demo.png` are not supported
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

```bash
# 1. Enter the repository
cd /path/to/hexo-relative-post-images

# 2. Update package.json to the target version
# Example: change 0.1.3 to 0.1.4 before continuing

# 3. Run release checks
npm test
npm run lint
npm run pack:dry-run

# 4. Review the pending release changes
git status --short --branch
git diff

# 5. Commit the release
git add .
git commit -m "Release v0.1.4"

# 6. Push the release commit to GitHub
git push origin main

# 7. Create and push the matching Git tag
git tag -a v0.1.4 -m "Release v0.1.4"
git push origin v0.1.4

# 8. Log in to npm
npm login

# 9. Publish the same version to npm
npm publish --access public

# 10. Verify npm and GitHub state
npm view hexo-relative-post-images version dist-tags.latest --json
git ls-remote origin refs/heads/main
git ls-remote --tags origin v0.1.4 v0.1.4^{}
```

## License

MIT
