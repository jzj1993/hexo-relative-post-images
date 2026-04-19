# hexo-relative-post-images

[中文](./README.zh-CN.md)

A Hexo plugin for posts that reference local images with relative paths.

The plugin does not modify Markdown rendering or rewrite rendered HTML. After `hexo generate`, it scans post source files and copies relative-path image files into each post's final output directory.

Hexo's default `post_asset_folder` works well when a post and its assets follow the standard one-to-one layout. But many projects use looser structures, for example:

```text
source/_posts/markdown-test.md
source/_posts/img/markdown-test-image.jpg

source/_posts/basic/index.md
source/_posts/basic/cover.jpg
source/_posts/basic/images/basic-demo.webp
```

In those cases, Markdown can still render image links, but Hexo may not copy the actual files into `public`. The plugin fills that gap by copying local relative images into the final post output directory after `hexo generate`.

## For Users

### What It Supports

- Supports same-directory, child-directory, and parent-directory relative paths
- Supports Markdown images like `![alt](cover.jpg)`, `![alt](./images/demo.webp)`, and `![alt](<cover image.png>)`
- Supports HTML images like `<img src="./images/demo.webp">` and `<img src='./images/demo.webp'>`
- Follows Hexo's final post output path, including `url` or `permalink` if set
- Supports common special-character filenames such as spaces, Unicode, parentheses, `#`, and `?` when written with valid Markdown / URL encoding
- Image references inside front matter, fenced code blocks, and inline code are ignored
- Skips unchanged files with a lightweight `size + mtime` check
- Designed to be cross-platform for macOS, Linux, and Windows through Node.js `fs` and `path` APIs

### Install

```bash
npm install hexo-relative-post-images --save
```

or

```bash
yarn add hexo-relative-post-images
```

### Quick Start

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

### Renderer Compatibility

- `markdown-it`: works with `relative_link: true` or `false`
- `marked`: use either `relative_link: true` or `marked.prependRoot: false`
- `marked.postAsset: true` is intentionally unsupported

### Example

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

### Supported Assumptions

- It handles images only
- Image files must stay inside Hexo's `source` directory
- Supports real filesystem-relative layouts such as `source/_posts/foo/index.md` next to `source/_posts/foo/cover.jpg`
- It supports common inline Markdown variants such as optional titles
- HTML `<img>` support currently assumes quoted `src` attributes such as `<img src="cover.jpg">` or `<img src='cover.jpg'>`

### Unsupported or Ignored

- Absolute paths are unsupported
- Does not emulate Hexo's `foo.md` plus `foo/` post-asset-folder mapping
- Unquoted HTML `src` forms such as `<img src=cover.jpg>` are out of scope
- Standard reference-style images such as `![alt][logo]` currently produce `warning_unsupported_syntax` and are not copied
- Obsidian wikilink images such as `![[image.png]]` currently produce `warning_unsupported_syntax` and are not copied
- Relative image URLs may still be unsuitable for some theme archive / index / excerpt pages because this plugin does not rewrite rendered HTML

## For Maintainers and AI

### Design Contract

- `docs/SPEC.md` is the source of truth for behavior and compatibility boundaries
- `docs/REFERENCE.md` records research, upstream behavior, and external issue analysis
- Keep concrete design rules in `docs/SPEC.md`, not in this README

### Environment

- Node.js `>=18`
- Hexo `>=6`
- npm

### Change Workflow

- Update `docs/SPEC.md` first
- Then update the code
- Then update tests
- Finally sync the README
- Run `npm test`
- Run `npm run lint`

### Test Scope

- Unit tests live in [test/index.test.js](./test/index.test.js)
- Real Hexo integration tests live in [test/hexo.integration.test.js](./test/hexo.integration.test.js)
- Fixtures for parser coverage live in [test/test.md](./test/test.md)
- Current test scope includes `marked`, `markdown-it`, `relative_link`, custom `permalink`, `url/root` changes, special characters, code-block exclusion, and error summaries

### Release Flow

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
