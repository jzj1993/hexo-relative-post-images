'use strict';

const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const test = require('node:test');
const assert = require('node:assert/strict');

global.hexo = {
  extend: {
    filter: {
      register() {}
    }
  }
};

const {
  extractImageRefs,
  extractUnsupportedMarkdownImageSyntaxes,
  extractUnsupportedAbsoluteImageRefs,
  normalizeRef,
  register,
  resolveImagePaths
} = require('../src/index.js');

async function writeFile(baseDir, relativePath, content) {
  const filePath = path.join(baseDir, relativePath);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content);
  return filePath;
}

function getAfterGenerateFilter() {
  let afterGenerate;

  register({
    extend: {
      filter: {
        register(name, fn) {
          if (name === 'after_generate') afterGenerate = fn;
        }
      }
    }
  });

  assert.equal(typeof afterGenerate, 'function');
  return afterGenerate;
}

test('extractImageRefs keeps only relative refs outside code contexts', async () => {
  const markdown = await fs.readFile(path.join(__dirname, 'test.md'), 'utf8');

  assert.deepEqual(
    extractImageRefs(markdown).sort(),
    [
      'cover.jpg',
      'title-image.png',
      './multiline-image.png',
      './images/demo.webp',
      './images/demo-single.webp',
      '../shared/parent-cover.png',
      '../shared/parent-html.png',
      './real-inline-context.png',
      'cover image.png',
      'special(v1).png',
      '中文图片.png',
      '中文 图片.png',
      'hash#name.png',
      'query?name.png'
    ].sort()
  );
});

test('extractUnsupportedAbsoluteImageRefs finds site-root and filesystem absolute refs', async () => {
  const markdown = await fs.readFile(path.join(__dirname, 'test.md'), 'utf8');

  assert.deepEqual(
    extractUnsupportedAbsoluteImageRefs(markdown).sort(),
    [
      '/images/site-cover.png',
      '/images/site-html.png',
      'C:\\repo\\source\\images\\cover-win.png',
      'D:/repo/source/images/cover-win-forward.png',
      '\\\\server\\share\\site\\source\\images\\cover-unc.png',
      'C:\\images\\cover-html.png',
      'D:/images/cover-html.png',
      '\\\\server\\share\\cover-html.png'
    ].sort()
  );
});

test('extractUnsupportedMarkdownImageSyntaxes finds reference-style and Obsidian images outside code', async () => {
  const markdown = await fs.readFile(path.join(__dirname, 'test.md'), 'utf8');

  assert.deepEqual(
    extractUnsupportedMarkdownImageSyntaxes(markdown),
    [
      '![full reference][logo]',
      '![collapsed reference][]',
      '![shortcut reference]',
      '![[obsidian.png]]'
    ]
  );
});

test('resolveImagePaths supports only relative refs', () => {
  const sourcePath = '/repo/source/_posts/guide/index.md';
  const outputDir = '/repo/public/guide';

  assert.deepEqual(
    resolveImagePaths('cover.jpg', sourcePath, outputDir),
    {
      resolvedSource: '/repo/source/_posts/guide/cover.jpg',
      resolvedTarget: '/repo/public/guide/cover.jpg'
    }
  );

  assert.deepEqual(
    resolveImagePaths('../shared/parent-cover.png', sourcePath, outputDir),
    {
      resolvedSource: '/repo/source/_posts/shared/parent-cover.png',
      resolvedTarget: '/repo/public/shared/parent-cover.png'
    }
  );
});

test('normalizeRef rejects absolute local paths and keeps special relative names', () => {
  assert.equal(normalizeRef('/images/site-cover.png'), null);
  assert.equal(normalizeRef('C:\\repo\\source\\images\\cover.png'), null);
  assert.equal(normalizeRef('D:/repo/source/images/cover.png'), null);
  assert.equal(normalizeRef('\\\\server\\share\\site\\source\\images\\cover.png'), null);

  assert.equal(normalizeRef('cover%20image.png'), 'cover image.png');
  assert.equal(normalizeRef('special%28v1%29.png'), 'special(v1).png');
  assert.equal(normalizeRef('hash%23name.png'), 'hash#name.png');
  assert.equal(normalizeRef('query%3Fname.png'), 'query?name.png');
});

test('normalizeRef keeps encoded path separators inside a single segment', () => {
  assert.equal(normalizeRef('dir%2Fname.png'), 'dir%2Fname.png');
  assert.equal(normalizeRef('dir%5Cname.png'), 'dir%5Cname.png');
});

test('after_generate copies supported relative images into the expected public paths', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'hexo-relative-post-images-'));
  const sourceDir = path.join(tempDir, 'source');
  const publicDir = path.join(tempDir, 'public');
  const afterGenerate = getAfterGenerateFilter();

  try {
    await writeFile(sourceDir, '_posts/guide/index.md', [
      '---',
      'summary: "![front matter ignored](./front-matter-ignored.png)"',
      '---',
      '![cover](cover.jpg)',
      '![title](title-image.png "Title")',
      '![multiline]',
      '(./multiline-image.png)',
      '![space](<cover image.png>)',
      '![paren](special%28v1%29.png)',
      '![cjk](中文图片.png)',
      '![hash](hash%23name.png)',
      '![query](query%3Fname.png)',
      `<img src='./images/demo-single.webp' alt='demo single'>`,
      '![parent](../shared/parent-cover.png)',
      '`![code](./code-only.png)`',
      '```html',
      '<img src="./code-only-html.png">',
      '```'
    ].join('\n'));

    await writeFile(sourceDir, '_posts/guide/cover.jpg', 'cover');
    await writeFile(sourceDir, '_posts/guide/title-image.png', 'title');
    await writeFile(sourceDir, '_posts/guide/multiline-image.png', 'multiline');
    await writeFile(sourceDir, '_posts/guide/cover image.png', 'space');
    await writeFile(sourceDir, '_posts/guide/special(v1).png', 'paren');
    await writeFile(sourceDir, '_posts/guide/中文图片.png', 'cjk');
    await writeFile(sourceDir, '_posts/guide/hash#name.png', 'hash');
    await writeFile(sourceDir, '_posts/guide/query?name.png', 'query');
    await writeFile(sourceDir, '_posts/guide/front-matter-ignored.png', 'front matter');
    await writeFile(sourceDir, '_posts/guide/images/demo-single.webp', 'single html');
    await writeFile(sourceDir, '_posts/shared/parent-cover.png', 'parent');

    const logs = [];
    await afterGenerate.call({
      config: {},
      locals: {
        get(name) {
          assert.equal(name, 'posts');
          return {
            toArray() {
              return [
                {
                  source: '_posts/guide/index.md',
                  path: 'guide/index.html'
                }
              ];
            }
          };
        }
      },
      log: {
        info(...args) {
          logs.push(['info', args]);
        },
        error(...args) {
          logs.push(['error', args]);
        },
        warn(...args) {
          logs.push(['warn', args]);
        }
      },
      public_dir: publicDir,
      source_dir: sourceDir
    });

    assert.equal(await fs.readFile(path.join(publicDir, 'guide/cover.jpg'), 'utf8'), 'cover');
    assert.equal(await fs.readFile(path.join(publicDir, 'guide/title-image.png'), 'utf8'), 'title');
    assert.equal(await fs.readFile(path.join(publicDir, 'guide/multiline-image.png'), 'utf8'), 'multiline');
    assert.equal(await fs.readFile(path.join(publicDir, 'guide/cover image.png'), 'utf8'), 'space');
    assert.equal(await fs.readFile(path.join(publicDir, 'guide/special(v1).png'), 'utf8'), 'paren');
    assert.equal(await fs.readFile(path.join(publicDir, 'guide/中文图片.png'), 'utf8'), 'cjk');
    assert.equal(await fs.readFile(path.join(publicDir, 'guide/hash#name.png'), 'utf8'), 'hash');
    assert.equal(await fs.readFile(path.join(publicDir, 'guide/query?name.png'), 'utf8'), 'query');
    assert.equal(await fs.readFile(path.join(publicDir, 'guide/images/demo-single.webp'), 'utf8'), 'single html');
    assert.equal(await fs.readFile(path.join(publicDir, 'shared/parent-cover.png'), 'utf8'), 'parent');

    await assert.rejects(fs.access(path.join(publicDir, 'guide/code-only.png')));
    await assert.rejects(fs.access(path.join(publicDir, 'guide/code-only-html.png')));
    await assert.rejects(fs.access(path.join(publicDir, 'guide/front-matter-ignored.png')));
    assert.equal(logs.some(([level]) => level === 'warn'), false);
    assert.equal(logs.some(([level]) => level === 'error'), false);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});

test('after_generate logs each absolute local image as a warning and reports a summary', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'hexo-relative-post-images-'));
  const sourceDir = path.join(tempDir, 'source');
  const publicDir = path.join(tempDir, 'public');
  const afterGenerate = getAfterGenerateFilter();

  try {
    await writeFile(sourceDir, '_posts/guide/index.md', [
      '![site absolute](/images/site-cover.png)',
      '![windows absolute](C:\\repo\\source\\images\\cover-win.png)',
      '![cover](cover.jpg)'
    ].join('\n'));
    await writeFile(sourceDir, '_posts/guide/cover.jpg', 'cover');

    const logs = [];
    await afterGenerate.call({
      config: {},
      locals: {
        get() {
          return {
            toArray() {
              return [
                {
                  source: '_posts/guide/index.md',
                  path: 'guide/index.html'
                }
              ];
            }
          };
        }
      },
      log: {
        info(...args) {
          logs.push(['info', args]);
        },
        error(...args) {
          logs.push(['error', args]);
        },
        warn(...args) {
          logs.push(['warn', args]);
        }
      },
      public_dir: publicDir,
      source_dir: sourceDir
    });

	    assert.equal(await fs.readFile(path.join(publicDir, 'guide/cover.jpg'), 'utf8'), 'cover');
	    assert.equal(logs.filter(([level]) => level === 'warn').length, 2);
	    assert.match(logs.filter(([level]) => level === 'warn')[0][1].join(' '), /warning_absolute_path/);
	    assert.match(logs.filter(([level]) => level === 'warn')[1][1].join(' '), /warning_absolute_path/);

    const summaryLog = logs.find(([level, args]) => level === 'info' && String(args[0]).includes('Finished:'));
    assert.ok(summaryLog);
    assert.equal(summaryLog[1][4], 2);
    assert.equal(summaryLog[1][5], 2);
    assert.equal(summaryLog[1][6], 0);
    assert.equal(summaryLog[1][7], 0);
    assert.equal(summaryLog[1][8], 0);
    assert.equal(summaryLog[1][9], 0);
    assert.equal(summaryLog[1][10], 0);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});

test('after_generate keeps raw refs in warning logs and reports unsupported syntax separately', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'hexo-relative-post-images-'));
  const sourceDir = path.join(tempDir, 'source');
  const publicDir = path.join(tempDir, 'public');
  const afterGenerate = getAfterGenerateFilter();

  try {
    await writeFile(sourceDir, '_posts/guide/index.md', [
      '![full reference][logo]',
      '![collapsed reference][]',
      '![shortcut reference]',
      '![[obsidian.png]]',
      '![hash missing](hash%23missing.png)',
      '[logo]: ./images/logo.png "Logo"',
      '[collapsed reference]: ./images/collapsed.png',
      '[shortcut reference]: ./images/shortcut.png'
    ].join('\n'));

    const logs = [];
    await afterGenerate.call({
      config: {},
      locals: {
        get() {
          return {
            toArray() {
              return [
                {
                  source: '_posts/guide/index.md',
                  path: 'guide/index.html'
                }
              ];
            }
          };
        }
      },
      log: {
        info(...args) {
          logs.push(['info', args]);
        },
        error(...args) {
          logs.push(['error', args]);
        },
        warn(...args) {
          logs.push(['warn', args]);
        }
      },
      public_dir: publicDir,
      source_dir: sourceDir
    });

    const warningLines = logs
      .filter(([level]) => level === 'warn')
      .map(([, args]) => args.join(' '));
    assert.equal(warningLines.length, 5);
    assert.ok(warningLines.some((line) => line.includes('warning_unsupported_syntax') && line.includes('![full reference][logo]')));
    assert.ok(warningLines.some((line) => line.includes('warning_unsupported_syntax') && line.includes('![collapsed reference][]')));
    assert.ok(warningLines.some((line) => line.includes('warning_unsupported_syntax') && line.includes('![shortcut reference]')));
    assert.ok(warningLines.some((line) => line.includes('warning_unsupported_syntax') && line.includes('![[obsidian.png]]')));
    assert.ok(warningLines.some((line) => line.includes('warning_source_image_missing') && line.includes('hash%23missing.png')));

    const summaryLog = logs.find(([level, args]) => level === 'info' && String(args[0]).includes('Finished:'));
    assert.ok(summaryLog);
    assert.equal(summaryLog[1][4], 5);
    assert.equal(summaryLog[1][5], 0);
    assert.equal(summaryLog[1][6], 1);
    assert.equal(summaryLog[1][7], 0);
    assert.equal(summaryLog[1][8], 0);
    assert.equal(summaryLog[1][9], 0);
    assert.equal(summaryLog[1][10], 4);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});

test('after_generate counts skipped when target file already matches source', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'hexo-relative-post-images-'));
  const sourceDir = path.join(tempDir, 'source');
  const publicDir = path.join(tempDir, 'public');
  const afterGenerate = getAfterGenerateFilter();

  try {
    await writeFile(sourceDir, '_posts/guide/index.md', '![cover](cover.jpg)');
    const sourcePath = await writeFile(sourceDir, '_posts/guide/cover.jpg', 'cover');
    const targetPath = await writeFile(publicDir, 'guide/cover.jpg', 'cover');
    const sourceStat = await fs.stat(sourcePath);
    await fs.utimes(targetPath, sourceStat.atime, sourceStat.mtime);

    const logs = [];
    await afterGenerate.call({
      config: {},
      locals: {
        get() {
          return {
            toArray() {
              return [
                {
                  source: '_posts/guide/index.md',
                  path: 'guide/index.html'
                }
              ];
            }
          };
        }
      },
      log: {
        info(...args) {
          logs.push(['info', args]);
        },
        error(...args) {
          logs.push(['error', args]);
        },
        warn(...args) {
          logs.push(['warn', args]);
        }
      },
      public_dir: publicDir,
      source_dir: sourceDir
    });

    const summaryLog = logs.find(([level, args]) => level === 'info' && String(args[0]).includes('Finished:'));
    assert.ok(summaryLog);
    assert.equal(summaryLog[1][2], 0);
    assert.equal(summaryLog[1][3], 1);
    assert.equal(summaryLog[1][4], 0);
    assert.equal(logs.some(([level, args]) => level === 'info' && String(args[0]).includes('Copied:')), false);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});

test('after_generate does nothing when plugin is disabled', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'hexo-relative-post-images-'));
  const sourceDir = path.join(tempDir, 'source');
  const publicDir = path.join(tempDir, 'public');
  const afterGenerate = getAfterGenerateFilter();

  try {
    await writeFile(sourceDir, '_posts/guide/index.md', '![cover](cover.jpg)');
    await writeFile(sourceDir, '_posts/guide/cover.jpg', 'cover');

    const logs = [];
    await afterGenerate.call({
      config: {
        relative_post_images: false
      },
      locals: {
        get() {
          return {
            toArray() {
              return [
                {
                  source: '_posts/guide/index.md',
                  path: 'guide/index.html'
                }
              ];
            }
          };
        }
      },
      log: {
        info(...args) {
          logs.push(['info', args]);
        },
        error(...args) {
          logs.push(['error', args]);
        },
        warn(...args) {
          logs.push(['warn', args]);
        }
      },
      public_dir: publicDir,
      source_dir: sourceDir
    });

    assert.ok(logs.some(([level, args]) => level === 'info' && String(args[0]).includes('Disabled')));
    await assert.rejects(fs.access(path.join(publicDir, 'guide/cover.jpg')));
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});

test('after_generate reports failed, outside_source, outside_public, and missing separately', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'hexo-relative-post-images-'));
  const sourceDir = path.join(tempDir, 'source');
  const publicDir = path.join(tempDir, 'public');
  const afterGenerate = getAfterGenerateFilter();

  try {
    await writeFile(sourceDir, '_posts/guide/index.md', [
      '![outside source](../../../secret.png)',
      '![outside public](../../escape.png)',
      '![missing](missing.png)'
    ].join('\n'));
    await writeFile(sourceDir, 'escape.png', 'escape');

    const logs = [];
    await afterGenerate.call({
      config: {},
      locals: {
        get() {
          return {
            toArray() {
              return [
                {
                  source: '_posts/guide/index.md',
                  path: 'guide/index.html'
                },
                {
                  source: '_posts/unreadable.md',
                  path: 'broken/index.html'
                }
              ];
            }
          };
        }
      },
      log: {
        info(...args) {
          logs.push(['info', args]);
        },
        error(...args) {
          logs.push(['error', args]);
        },
        warn(...args) {
          logs.push(['warn', args]);
        }
      },
      public_dir: publicDir,
      source_dir: sourceDir
    });

    const warningLines = logs
      .filter(([level]) => level === 'warn')
      .map(([, args]) => args.join(' '));

    assert.ok(warningLines.some((line) => line.includes('warning_outside_source') && line.includes('../../../secret.png')));
    assert.ok(warningLines.some((line) => line.includes('warning_outside_public') && line.includes('../../escape.png')));
    assert.ok(warningLines.some((line) => line.includes('warning_source_image_missing') && line.includes('missing.png')));
    assert.ok(warningLines.some((line) => line.includes('warning_post_read_failed') && line.includes('_posts/unreadable.md')));

    const summaryLog = logs.find(([level, args]) => level === 'info' && String(args[0]).includes('Finished:'));
    assert.ok(summaryLog);
    assert.equal(summaryLog[1][4], 4);
    assert.equal(summaryLog[1][5], 0);
    assert.equal(summaryLog[1][6], 1);
    assert.equal(summaryLog[1][7], 1);
    assert.equal(summaryLog[1][8], 1);
    assert.equal(summaryLog[1][9], 1);
    assert.equal(summaryLog[1][10], 0);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});

test('after_generate throws when Hexo marked.postAsset is enabled', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'hexo-relative-post-images-'));
  const sourceDir = path.join(tempDir, 'source');
  const publicDir = path.join(tempDir, 'public');
  const afterGenerate = getAfterGenerateFilter();

  try {
    await assert.rejects(
      afterGenerate.call({
        config: {
          marked: {
            postAsset: true
          }
        },
        locals: {
          get() {
            return {
              toArray() {
                return [];
              }
            };
          }
        },
        log: {
          info() {},
          warn() {}
        },
        public_dir: publicDir,
        source_dir: sourceDir
      }),
      /marked\.postAsset=true/
    );
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});

test('after_generate throws when Hexo marked.prependRoot stays enabled with relative_link=false', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'hexo-relative-post-images-'));
  const sourceDir = path.join(tempDir, 'source');
  const publicDir = path.join(tempDir, 'public');
  const afterGenerate = getAfterGenerateFilter();

  try {
    await assert.rejects(
      afterGenerate.call({
        config: {
          relative_link: false,
          marked: {
            prependRoot: true,
            postAsset: false
          }
        },
        locals: {
          get() {
            return {
              toArray() {
                return [];
              }
            };
          }
        },
        log: {
          info() {},
          warn() {}
        },
        public_dir: publicDir,
        source_dir: sourceDir
      }),
      /marked\.prependRoot=true with relative_link=false/
    );
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});
