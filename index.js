'use strict';

const fs = require('fs/promises');
const path = require('path');

const PLUGIN_NAME = 'hexo-relative-post-images';
const DEFAULT_CONFIG = {
  enable: true,
  log_prefix: '[relative-post-images]'
};
const MARKDOWN_IMAGE_RE = /!\[[^\]]*]\(([^)]+)\)/g;
const HTML_IMAGE_RE = /<img\b[^>]*\bsrc=(["'])(.*?)\1/gi;

function stripFrontMatter(content) {
  return content.replace(/^(-{3,}|;{3,})\n[\s\S]+?\n\1(?:\n|$)/, '');
}

function normalizeRef(rawRef) {
  if (!rawRef) return null;

  let ref = rawRef.trim();

  if (ref.startsWith('<') && ref.endsWith('>')) {
    ref = ref.slice(1, -1).trim();
  }

  const titleMatch = ref.match(/^(\S+)(?:\s+["'].+["'])$/);
  if (titleMatch) {
    ref = titleMatch[1];
  }

  ref = ref.split('#')[0].split('?')[0].trim();

  if (!ref) return null;
  if (/^(?:[a-z]+:)?\/\//i.test(ref)) return null;
  if (/^(?:data|mailto|tel):/i.test(ref)) return null;
  if (ref.startsWith('#') || ref.startsWith('/')) return null;

  try {
    return decodeURI(ref);
  } catch {
    return ref;
  }
}

function extractImageRefs(markdown) {
  const refs = new Set();
  const content = stripFrontMatter(markdown);

  for (const match of content.matchAll(MARKDOWN_IMAGE_RE)) {
    const ref = normalizeRef(match[1]);
    if (ref) refs.add(ref);
  }

  for (const match of content.matchAll(HTML_IMAGE_RE)) {
    const ref = normalizeRef(match[2]);
    if (ref) refs.add(ref);
  }

  return [...refs];
}

function isInside(baseDir, targetPath) {
  const relativePath = path.relative(baseDir, targetPath);
  return relativePath && !relativePath.startsWith('..') && !path.isAbsolute(relativePath);
}

function isSameFile(sourceStat, targetStat) {
  return sourceStat.size === targetStat.size &&
    Math.abs(sourceStat.mtimeMs - targetStat.mtimeMs) <= 1;
}

function getPluginConfig(ctx) {
  const userConfig = ctx.config.relative_post_images;

  if (userConfig === false) {
    return {
      ...DEFAULT_CONFIG,
      enable: false
    };
  }

  if (!userConfig || typeof userConfig !== 'object') {
    return { ...DEFAULT_CONFIG };
  }

  return {
    ...DEFAULT_CONFIG,
    ...userConfig
  };
}

hexo.extend.filter.register('after_generate', async function() {
  const pluginConfig = getPluginConfig(this);
  const logPrefix = pluginConfig.log_prefix || DEFAULT_CONFIG.log_prefix;

  if (!pluginConfig.enable) {
    this.log.info('%s Disabled', logPrefix);
    return;
  }

  const posts = this.locals.get('posts').toArray();
  const sourceDir = this.source_dir;
  const publicDir = this.public_dir;
  const startTime = Date.now();
  let copiedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;
  let outsideSourceCount = 0;
  let outsidePublicCount = 0;
  let missingCount = 0;

  this.log.info('%s Start copying relative post images', logPrefix);

  for (const post of posts) {
    const sourcePath = path.join(sourceDir, post.source);
    const outputDir = post.path.endsWith('/')
      ? path.join(publicDir, post.path)
      : path.join(publicDir, path.dirname(post.path));

    let markdown;
    try {
      markdown = await fs.readFile(sourcePath, 'utf8');
    } catch {
      failedCount += 1;
      this.log.warn('%s Failed to read post source: %s', logPrefix, post.source);
      continue;
    }

    const imageRefs = extractImageRefs(markdown);

    for (const imageRef of imageRefs) {
      const resolvedSource = path.resolve(path.dirname(sourcePath), imageRef);
      const resolvedTarget = path.resolve(outputDir, imageRef);

      if (!isInside(sourceDir, resolvedSource)) {
        outsideSourceCount += 1;
        this.log.warn('%s Skipped image outside source dir: %s (from %s)', logPrefix, imageRef, post.source);
        continue;
      }

      if (!isInside(publicDir, resolvedTarget)) {
        outsidePublicCount += 1;
        this.log.warn('%s Skipped image outside public dir: %s (from %s)', logPrefix, imageRef, post.source);
        continue;
      }

      let sourceStat;
      try {
        sourceStat = await fs.stat(resolvedSource);
      } catch {
        missingCount += 1;
        this.log.warn('%s Missing image: %s (from %s)', logPrefix, imageRef, post.source);
        continue;
      }

      try {
        const targetStat = await fs.stat(resolvedTarget);
        if (isSameFile(sourceStat, targetStat)) {
          skippedCount += 1;
          continue;
        }
      } catch {
        // Target file does not exist yet, continue to copy.
      }

      await fs.mkdir(path.dirname(resolvedTarget), { recursive: true });
      await fs.copyFile(resolvedSource, resolvedTarget);
      await fs.utimes(resolvedTarget, sourceStat.atime, sourceStat.mtime);
      copiedCount += 1;
      this.log.info('%s Copied: %s', logPrefix, path.relative(publicDir, resolvedTarget).replace(/\\/g, '/'));
    }
  }

  this.log.info(
    '%s Finished: %d copied, %d skipped, %d missing, %d failed, %d outside_source, %d outside_public in %d ms',
    logPrefix,
    copiedCount,
    skippedCount,
    missingCount,
    failedCount,
    outsideSourceCount,
    outsidePublicCount,
    Date.now() - startTime
  );
});
