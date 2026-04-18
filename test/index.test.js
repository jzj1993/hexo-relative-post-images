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

const { extractImageRefs, normalizeRef, register, resolveImagePaths } = require('../src/index.js');

async function writeFile(baseDir, relativePath, content) {
  const filePath = path.join(baseDir, relativePath);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content);
  return filePath;
}

test('extractImageRefs keeps local project image refs outside code', async () => {
  const markdown = await fs.readFile(path.join(__dirname, 'test.md'), 'utf8');

  assert.deepEqual(
    extractImageRefs(markdown).sort(),
    [
      'cover.jpg',
      './images/demo.webp',
      '../shared/parent-cover.png',
      '../shared/parent-html.png',
      './real-inline-context.png',
      '/images/site-cover.png',
      '/images/site-html.png'
    ].sort()
  );
});

test('resolveImagePaths supports relative and source-root absolute refs', () => {
  const sourceDir = '/repo/source';
  const publicDir = '/repo/public';
  const sourcePath = '/repo/source/_posts/guide/index.md';
  const outputDir = '/repo/public/guide';

  assert.deepEqual(
    resolveImagePaths('cover.jpg', sourcePath, sourceDir, outputDir, publicDir),
    {
      resolvedSource: '/repo/source/_posts/guide/cover.jpg',
      resolvedTarget: '/repo/public/guide/cover.jpg'
    }
  );

  assert.deepEqual(
    resolveImagePaths('/images/site-cover.png', sourcePath, sourceDir, outputDir, publicDir),
    {
      resolvedSource: '/repo/source/images/site-cover.png',
      resolvedTarget: '/repo/public/images/site-cover.png'
    }
  );

  assert.deepEqual(
    resolveImagePaths('../shared/parent-cover.png', sourcePath, sourceDir, outputDir, publicDir),
    {
      resolvedSource: '/repo/source/_posts/shared/parent-cover.png',
      resolvedTarget: '/repo/public/shared/parent-cover.png'
    }
  );
});

test('normalizeRef ignores Windows filesystem absolute paths', () => {
  assert.equal(normalizeRef('C:\\repo\\source\\images\\cover.png'), null);
  assert.equal(normalizeRef('D:/repo/source/images/cover.png'), null);
  assert.equal(normalizeRef('\\\\server\\share\\site\\source\\images\\cover.png'), null);
});

test('after_generate copies supported local images into the expected public paths', async() => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'hexo-relative-post-images-'));
  const sourceDir = path.join(tempDir, 'source');
  const publicDir = path.join(tempDir, 'public');

  try {
    await writeFile(sourceDir, '_posts/guide/index.md', [
      '![cover](cover.jpg)',
      '![parent](../shared/parent-cover.png)',
      '![site](/images/site-cover.png)',
      '![remote](https://example.com/remote.png)',
      '`![code](./code-only.png)`',
      '```html',
      '<img src="./code-only-html.png">',
      '```'
    ].join('\n'));

    await writeFile(sourceDir, '_posts/guide/cover.jpg', 'cover');
    await writeFile(sourceDir, '_posts/shared/parent-cover.png', 'parent');
    await writeFile(sourceDir, 'images/site-cover.png', 'site');

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
        warn(...args) {
          logs.push(['warn', args]);
        }
      },
      public_dir: publicDir,
      source_dir: sourceDir
    });

    assert.equal(await fs.readFile(path.join(publicDir, 'guide/cover.jpg'), 'utf8'), 'cover');
    assert.equal(await fs.readFile(path.join(publicDir, 'shared/parent-cover.png'), 'utf8'), 'parent');
    assert.equal(await fs.readFile(path.join(publicDir, 'images/site-cover.png'), 'utf8'), 'site');

    await assert.rejects(fs.access(path.join(publicDir, 'guide/code-only.png')));
    await assert.rejects(fs.access(path.join(publicDir, 'guide/code-only-html.png')));
    await assert.rejects(fs.access(path.join(publicDir, 'guide/remote.png')));

    assert.equal(logs.some(([level]) => level === 'warn'), false);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});
