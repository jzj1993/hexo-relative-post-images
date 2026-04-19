'use strict';

const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const test = require('node:test');
const assert = require('node:assert/strict');
const Hexo = require('hexo');

const { register } = require('../src/index.js');

async function writeFile(baseDir, relativePath, content) {
  const filePath = path.join(baseDir, relativePath);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content);
  return filePath;
}

function resolvePostOutputPaths(hexo, post) {
  const htmlPath = post.path.endsWith('/')
    ? path.join(hexo.public_dir, post.path, 'index.html')
    : path.join(hexo.public_dir, post.path);
  const outputDir = post.path.endsWith('/')
    ? path.join(hexo.public_dir, post.path)
    : path.join(hexo.public_dir, path.dirname(post.path));

  return { htmlPath, outputDir };
}

async function generateHexoSite({
  renderer,
  relativeLink,
  markedConfig,
  permalink,
  root = '/',
  url = 'http://example.com',
  postDirSegment = 'guide'
}) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), `hexo-relative-post-images-${renderer}-`));
  const hexo = new Hexo(tempDir, { silent: true });

  try {
    const postBase = `source/_posts/${postDirSegment}`;

    if (postDirSegment === 'guide') {
      await writeFile(tempDir, `${postBase}/index.md`, [
        '---',
        'title: Demo',
        'date: 2024-01-02 03:04:05',
        'layout: false',
        '---',
        '',
        '![cover](cover.jpg)',
        '![space](<cover image.png>)',
        '![paren](special%28v1%29.png)',
        '![hash](hash%23name.png)',
        '![query](query%3Fname.png)',
        '',
        '[Next](next/page.html)'
      ].join('\n'));

      await writeFile(tempDir, `${postBase}/cover.jpg`, 'cover');
      await writeFile(tempDir, `${postBase}/cover image.png`, 'space');
      await writeFile(tempDir, `${postBase}/special(v1).png`, 'paren');
      await writeFile(tempDir, `${postBase}/hash#name.png`, 'hash');
      await writeFile(tempDir, `${postBase}/query?name.png`, 'query');
    } else {
      await writeFile(tempDir, `${postBase}/index.md`, [
        '---',
        'title: Demo',
        'date: 2024-01-02 03:04:05',
        'layout: false',
        '---',
        '',
        '![x](a.png)'
      ].join('\n'));

      await writeFile(tempDir, `${postBase}/a.png`, 'png');
    }

    await hexo.init();

    hexo.config.url = url;
    hexo.config.root = root;
    hexo.config.relative_link = relativeLink;
    if (permalink) {
      hexo.config.permalink = permalink;
    }

    if (renderer === 'marked') {
      hexo.config.marked = {
        prependRoot: true,
        postAsset: false,
        ...markedConfig
      };
    }

    global.hexo = hexo;

    for (const moduleName of ['hexo-renderer-marked', 'hexo-renderer-markdown-it']) {
      try {
        delete require.cache[require.resolve(moduleName)];
      } catch {
        // Module may not have been loaded yet.
      }
    }

    require(renderer === 'marked' ? 'hexo-renderer-marked' : 'hexo-renderer-markdown-it');
    register(hexo);

    await hexo.call('generate');

    const post = hexo.locals.get('posts').toArray()[0];
    const { htmlPath, outputDir } = resolvePostOutputPaths(hexo, post);
    const html = await fs.readFile(htmlPath, 'utf8');

    return {
      hexo,
      tempDir,
      post,
      html,
      outputDir
    };
  } catch (error) {
    await cleanupGeneratedSite({ hexo, tempDir });
    throw error;
  }
}

async function cleanupGeneratedSite(site) {
  try {
    if (site && site.hexo) {
      await site.hexo.exit();
    }
  } finally {
    if (site && site.tempDir) {
      await fs.rm(site.tempDir, { recursive: true, force: true });
    }
  }
}

test('Hexo generate stays compatible with marked when prependRoot is disabled', async () => {
  const site = await generateHexoSite({
    renderer: 'marked',
    relativeLink: false,
    markedConfig: {
      prependRoot: false
    }
  });

  try {
    assert.match(site.html, /<img src="cover\.jpg" alt="cover">/);
    assert.match(site.html, /<a href="next\/page\.html">Next<\/a>/);

    assert.equal(await fs.readFile(path.join(site.outputDir, 'cover.jpg'), 'utf8'), 'cover');
    assert.equal(await fs.readFile(path.join(site.outputDir, 'cover image.png'), 'utf8'), 'space');
    assert.equal(await fs.readFile(path.join(site.outputDir, 'special(v1).png'), 'utf8'), 'paren');
    assert.equal(await fs.readFile(path.join(site.outputDir, 'hash#name.png'), 'utf8'), 'hash');
    assert.equal(await fs.readFile(path.join(site.outputDir, 'query?name.png'), 'utf8'), 'query');
  } finally {
    await cleanupGeneratedSite(site);
  }
});

test('Hexo generate stays compatible with marked when relative_link is enabled', async () => {
  const site = await generateHexoSite({
    renderer: 'marked',
    relativeLink: true
  });

  try {
    assert.match(site.html, /<img src="cover\.jpg" alt="cover">/);
    assert.equal(await fs.readFile(path.join(site.outputDir, 'cover.jpg'), 'utf8'), 'cover');
  } finally {
    await cleanupGeneratedSite(site);
  }
});

test('Hexo generate stays compatible with markdown-it when relative_link is disabled', async () => {
  const site = await generateHexoSite({
    renderer: 'markdown-it',
    relativeLink: false
  });

  try {
    assert.match(site.html, /<img src="cover\.jpg" alt="cover">/);
    assert.equal(await fs.readFile(path.join(site.outputDir, 'cover image.png'), 'utf8'), 'space');
  } finally {
    await cleanupGeneratedSite(site);
  }
});

test('Hexo generate stays compatible with markdown-it when relative_link is enabled', async () => {
  const site = await generateHexoSite({
    renderer: 'markdown-it',
    relativeLink: true
  });

  try {
    assert.match(site.html, /<img src="cover\.jpg" alt="cover">/);
    assert.equal(await fs.readFile(path.join(site.outputDir, 'special(v1).png'), 'utf8'), 'paren');
  } finally {
    await cleanupGeneratedSite(site);
  }
});

test('Hexo generate fails fast for incompatible marked prependRoot settings', async () => {
  await assert.rejects(
    generateHexoSite({
      renderer: 'marked',
      relativeLink: false,
      markedConfig: {
        prependRoot: true
      }
    }),
    /marked\.prependRoot=true with relative_link=false/
  );
});

test('Hexo generate fails fast for marked postAsset settings', async () => {
  await assert.rejects(
    generateHexoSite({
      renderer: 'marked',
      relativeLink: true,
      markedConfig: {
        postAsset: true
      }
    }),
    /marked\.postAsset=true/
  );
});

test('Hexo generate stays compatible with marked under custom permalink and url/root changes', async () => {
  const site = await generateHexoSite({
    renderer: 'marked',
    relativeLink: false,
    permalink: 'articles/:title/index.html',
    root: '/nested/',
    url: 'https://example.com/nested',
    markedConfig: {
      prependRoot: false
    }
  });

  try {
    assert.equal(site.post.path, 'articles/guide/index/index.html');
    assert.equal(site.outputDir, path.join(site.hexo.public_dir, 'articles/guide/index'));
    assert.match(site.html, /<img src="cover\.jpg" alt="cover">/);
    assert.equal(await fs.readFile(path.join(site.outputDir, 'cover.jpg'), 'utf8'), 'cover');
    assert.equal(await fs.readFile(path.join(site.outputDir, 'cover image.png'), 'utf8'), 'space');
  } finally {
    await cleanupGeneratedSite(site);
  }
});

test('Hexo generate stays compatible with markdown-it under custom permalink and url/root changes', async () => {
  const site = await generateHexoSite({
    renderer: 'markdown-it',
    relativeLink: false,
    permalink: 'notes/:title/index.html',
    root: '/blog/',
    url: 'https://example.com/blog'
  });

  try {
    assert.equal(site.post.path, 'notes/guide/index/index.html');
    assert.equal(site.outputDir, path.join(site.hexo.public_dir, 'notes/guide/index'));
    assert.match(site.html, /<img src="cover\.jpg" alt="cover">/);
    assert.equal(await fs.readFile(path.join(site.outputDir, 'special(v1).png'), 'utf8'), 'paren');
    assert.equal(await fs.readFile(path.join(site.outputDir, 'query?name.png'), 'utf8'), 'query');
  } finally {
    await cleanupGeneratedSite(site);
  }
});

test('Hexo generate copies images when post source directory name contains CJK characters', async () => {
  const site = await generateHexoSite({
    renderer: 'markdown-it',
    relativeLink: false,
    postDirSegment: '中文标题'
  });

  try {
    assert.match(site.post.path, /中文标题/);
    assert.match(site.html, /<img src="a\.png" alt="x">/);
    assert.equal(await fs.readFile(path.join(site.outputDir, 'a.png'), 'utf8'), 'png');
  } finally {
    await cleanupGeneratedSite(site);
  }
});
