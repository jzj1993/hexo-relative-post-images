'use strict';

const fs = require('fs/promises');
const path = require('path');

const PLUGIN_NAME = 'hexo-relative-post-images';
const DEFAULT_CONFIG = {
  enable: true,
  log_prefix: '[relative-post-images]'
};
const HTML_IMAGE_RE = /<img\b[^>]*\bsrc=(["'])(.*?)\1/gi;

function maskNonNewlines(text) {
  return text.replace(/[^\r\n]/g, ' ');
}

function stripFrontMatter(content) {
  return content.replace(/^(-{3,}|;{3,})\n[\s\S]+?\n\1(?:\n|$)/, '');
}

function stripCodeContexts(content) {
  let result = '';
  let cursor = 0;
  let fencedBlock;
  const fencedBlockRe = /^( {0,3})([`~])\2{2,}.*(?:\r?\n|$)/gm;

  while ((fencedBlock = fencedBlockRe.exec(content)) !== null) {
    const openingIndex = fencedBlock.index;
    const openingLine = fencedBlock[0];
    const fenceChar = fencedBlock[2];
    const fenceLength = openingLine.trimStart().match(new RegExp(`^\\${fenceChar}+`))[0].length;
    const closingRe = new RegExp(`^ {0,3}\\${fenceChar}{${fenceLength},}[ \t]*(?:\r?\n|$)`, 'gm');

    closingRe.lastIndex = fencedBlockRe.lastIndex;
    const closingMatch = closingRe.exec(content);
    const blockEnd = closingMatch ? closingRe.lastIndex : content.length;

    result += stripInlineCode(content.slice(cursor, openingIndex));
    result += maskNonNewlines(content.slice(openingIndex, blockEnd));
    cursor = blockEnd;
    fencedBlockRe.lastIndex = blockEnd;
  }

  result += stripInlineCode(content.slice(cursor));
  return result;
}

function stripInlineCode(content) {
  return content.replace(/(`+)([\s\S]*?)\1/g, (match) => maskNonNewlines(match));
}

function isWindowsAbsolutePath(ref) {
  return /^[a-zA-Z]:[\\/]/.test(ref) || /^\\\\/.test(ref);
}

function resolveImagePaths(imageRef, sourcePath, outputDir) {
  return {
    resolvedSource: path.resolve(path.dirname(sourcePath), imageRef),
    resolvedTarget: path.resolve(outputDir, imageRef)
  };
}

function isEscaped(text, index) {
  let backslashCount = 0;

  for (let cursor = index - 1; cursor >= 0 && text[cursor] === '\\'; cursor -= 1) {
    backslashCount += 1;
  }

  return backslashCount % 2 === 1;
}

function findClosingBracket(text, startIndex, openChar, closeChar) {
  let depth = 1;

  for (let cursor = startIndex + 1; cursor < text.length; cursor += 1) {
    const current = text[cursor];

    if (isEscaped(text, cursor)) continue;
    if (current === openChar) depth += 1;
    if (current === closeChar) depth -= 1;
    if (depth === 0) return cursor;
  }

  return -1;
}

function consumeMarkdownLinkTitle(text, startIndex) {
  const openingChar = text[startIndex];
  const closingChar = openingChar === '(' ? ')' : openingChar;

  if (!['"', '\'', '('].includes(openingChar)) {
    return null;
  }

  let cursor = startIndex + 1;

  while (cursor < text.length) {
    if (text[cursor] === closingChar && !isEscaped(text, cursor)) {
      return cursor + 1;
    }

    cursor += 1;
  }

  return null;
}

function skipMarkdownLinkWhitespace(text, startIndex) {
  let cursor = startIndex;
  let sawLineEnding = false;

  while (cursor < text.length) {
    const current = text[cursor];

    if (current === ' ' || current === '\t') {
      cursor += 1;
      continue;
    }

    if (current === '\r' || current === '\n') {
      if (sawLineEnding) {
        break;
      }

      sawLineEnding = true;
      cursor += current === '\r' && text[cursor + 1] === '\n' ? 2 : 1;
      continue;
    }

    break;
  }

  return cursor;
}

function parseMarkdownImageRefAt(text, startIndex) {
  if (text[startIndex] !== '!' || text[startIndex + 1] !== '[') {
    return null;
  }

  const altEnd = findClosingBracket(text, startIndex + 1, '[', ']');
  if (altEnd === -1) return null;

  let cursor = skipMarkdownLinkWhitespace(text, altEnd + 1);

  if (text[cursor] !== '(') return null;
  cursor += 1;

  while (cursor < text.length && /\s/.test(text[cursor])) {
    cursor += 1;
  }

  let rawRef = '';

  if (text[cursor] === '<') {
    cursor += 1;

    while (cursor < text.length) {
      if (text[cursor] === '>' && !isEscaped(text, cursor)) {
        cursor += 1;
        break;
      }

      rawRef += text[cursor];
      cursor += 1;
    }

    if (cursor > text.length || text[cursor - 1] !== '>') {
      return null;
    }
  } else {
    let nestedParenDepth = 0;

    while (cursor < text.length) {
      const current = text[cursor];

      if (current === '(') {
        nestedParenDepth += 1;
        rawRef += current;
        cursor += 1;
        continue;
      }

      if (current === ')') {
        if (nestedParenDepth === 0) break;
        nestedParenDepth -= 1;
        rawRef += current;
        cursor += 1;
        continue;
      }

      if (/\s/.test(current) && nestedParenDepth === 0) {
        break;
      }

      rawRef += current;
      cursor += 1;
    }
  }

  if (!rawRef) return null;

  while (cursor < text.length && /\s/.test(text[cursor])) {
    cursor += 1;
  }

  if (text[cursor] !== ')') {
    const nextCursor = consumeMarkdownLinkTitle(text, cursor);
    if (nextCursor === null) return null;
    cursor = nextCursor;

    while (cursor < text.length && /\s/.test(text[cursor])) {
      cursor += 1;
    }

    if (text[cursor] !== ')') return null;
  }

  return {
    rawRef,
    endIndex: cursor + 1
  };
}

function parseMarkdownReferenceImageAt(text, startIndex) {
  if (text[startIndex] !== '!' || text[startIndex + 1] !== '[') {
    return null;
  }

  if (text[startIndex + 2] === '[') {
    return null;
  }

  const altEnd = findClosingBracket(text, startIndex + 1, '[', ']');
  if (altEnd === -1) return null;

  const cursor = skipMarkdownLinkWhitespace(text, altEnd + 1);

  if (text[cursor] === '(') {
    return null;
  }

  if (text[cursor] === '[') {
    const labelEnd = findClosingBracket(text, cursor, '[', ']');
    if (labelEnd === -1) return null;

    return {
      rawSyntax: text.slice(startIndex, labelEnd + 1),
      endIndex: labelEnd + 1
    };
  }

  return {
    rawSyntax: text.slice(startIndex, altEnd + 1),
    endIndex: altEnd + 1
  };
}

function parseObsidianImageAt(text, startIndex) {
  if (text[startIndex] !== '!' || text[startIndex + 1] !== '[' || text[startIndex + 2] !== '[') {
    return null;
  }

  const closingIndex = text.indexOf(']]', startIndex + 3);
  if (closingIndex === -1) return null;

  return {
    rawSyntax: text.slice(startIndex, closingIndex + 2),
    endIndex: closingIndex + 2
  };
}

function extractMarkdownImageRawRefs(content) {
  const refs = [];

  for (let cursor = 0; cursor < content.length; cursor += 1) {
    const parsed = parseMarkdownImageRefAt(content, cursor);
    if (!parsed) continue;

    refs.push(parsed.rawRef);
    cursor = parsed.endIndex - 1;
  }

  return refs;
}

function extractMarkdownUnsupportedImageSyntaxes(content) {
  const refs = [];

  for (let cursor = 0; cursor < content.length; cursor += 1) {
    const parsedInline = parseMarkdownImageRefAt(content, cursor);
    if (parsedInline) {
      cursor = parsedInline.endIndex - 1;
      continue;
    }

    const parsedReference = parseMarkdownReferenceImageAt(content, cursor);
    if (parsedReference) {
      refs.push(parsedReference.rawSyntax);
      cursor = parsedReference.endIndex - 1;
      continue;
    }

    const parsedObsidian = parseObsidianImageAt(content, cursor);
    if (!parsedObsidian) continue;

    refs.push(parsedObsidian.rawSyntax);
    cursor = parsedObsidian.endIndex - 1;
  }

  return refs;
}

function sanitizeRef(rawRef) {
  if (!rawRef) return null;

  let ref = rawRef.trim();

  if (!ref) return null;
  if (/^(?:[a-z]+:)?\/\//i.test(ref)) return null;
  if (/^(?:data|mailto|tel):/i.test(ref)) return null;
  if (ref.startsWith('#')) return null;

  ref = ref.split('#')[0].split('?')[0].trim();
  if (!ref) return null;

  return decodePathRef(ref);
}

function decodePathRef(ref) {
  return ref
    .split('/')
    .map((segment) => {
      try {
        const decoded = decodeURIComponent(segment);
        return decoded.includes('/') || decoded.includes('\\') ? segment : decoded;
      } catch {
        return segment;
      }
    })
    .join('/');
}

function normalizeRef(rawRef) {
  const ref = sanitizeRef(rawRef);

  if (!ref) return null;
  if (ref.startsWith('/')) return null;
  if (isWindowsAbsolutePath(ref)) return null;

  return ref;
}

function extractRefsByKind(markdown) {
  const relativeRefs = [];
  const absoluteRefs = [];
  const unsupportedRefs = [];
  const content = stripCodeContexts(stripFrontMatter(markdown));

  for (const rawRef of extractMarkdownImageRawRefs(content)) {
    collectRef(rawRef, relativeRefs, absoluteRefs);
  }

  for (const rawSyntax of extractMarkdownUnsupportedImageSyntaxes(content)) {
    unsupportedRefs.push({ rawRef: rawSyntax });
  }

  for (const match of content.matchAll(HTML_IMAGE_RE)) {
    collectRef(match[2], relativeRefs, absoluteRefs);
  }

  return {
    relativeRefs,
    absoluteRefs,
    unsupportedRefs
  };
}

function collectRef(rawRef, relativeRefs, absoluteRefs) {
  const ref = sanitizeRef(rawRef);
  if (!ref) return;

  if (ref.startsWith('/') || isWindowsAbsolutePath(ref)) {
    absoluteRefs.push({ rawRef, ref });
    return;
  }

  relativeRefs.push({ rawRef, ref });
}

function extractImageRefs(markdown) {
  return [...new Set(extractRefsByKind(markdown).relativeRefs.map(({ ref }) => ref))];
}

function extractUnsupportedAbsoluteImageRefs(markdown) {
  return [...new Set(extractRefsByKind(markdown).absoluteRefs.map(({ ref }) => ref))];
}

function extractUnsupportedMarkdownImageSyntaxes(markdown) {
  return extractRefsByKind(markdown).unsupportedRefs.map(({ rawRef }) => rawRef);
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

function assertCompatibleHexoConfig(ctx, logPrefix) {
  if (ctx.config.marked && ctx.config.marked.postAsset) {
    throw new Error(
      `${PLUGIN_NAME} only supports relative image paths that stay relative after Markdown rendering. ` +
      `${logPrefix} Incompatible Hexo config: marked.postAsset=true rewrites Markdown images into absolute post asset paths.`
    );
  }

  if (ctx.config.marked && ctx.config.marked.prependRoot !== false && !ctx.config.relative_link) {
    throw new Error(
      `${PLUGIN_NAME} only supports relative image paths that stay relative after Markdown rendering. ` +
      `${logPrefix} Incompatible Hexo config: marked.prependRoot=true with relative_link=false rewrites relative Markdown images into root-absolute paths. ` +
      `Set relative_link=true or marked.prependRoot=false.`
    );
  }
}

function logImageWarning(log, logPrefix, warningType, imageRef, postSource) {
  log.warn('%s Warning [%s]: %s (from %s)', logPrefix, warningType, imageRef, postSource);
}

function register(hexoInstance) {
  hexoInstance.extend.filter.register('after_generate', async function() {
    const pluginConfig = getPluginConfig(this);
    const logPrefix = pluginConfig.log_prefix || DEFAULT_CONFIG.log_prefix;

    if (!pluginConfig.enable) {
      this.log.info('%s Disabled', logPrefix);
      return;
    }

    assertCompatibleHexoConfig(this, logPrefix);

    const posts = this.locals.get('posts').toArray();
    const sourceDir = this.source_dir;
    const publicDir = this.public_dir;
    const startTime = Date.now();
    let copiedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;
    let absolutePathCount = 0;
    let outsideSourceCount = 0;
    let outsidePublicCount = 0;
    let missingCount = 0;
    let unsupportedSyntaxCount = 0;

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
        this.log.warn('%s Warning [warning_post_read_failed]: Failed to read post source: %s', logPrefix, post.source);
        continue;
      }

      const { relativeRefs, absoluteRefs, unsupportedRefs } = extractRefsByKind(markdown);

      for (const imageRef of absoluteRefs) {
        absolutePathCount += 1;
        logImageWarning(this.log, logPrefix, 'warning_absolute_path', imageRef.rawRef, post.source);
      }

      for (const imageRef of unsupportedRefs) {
        unsupportedSyntaxCount += 1;
        logImageWarning(this.log, logPrefix, 'warning_unsupported_syntax', imageRef.rawRef, post.source);
      }

      for (const imageRef of relativeRefs) {
        const { resolvedSource, resolvedTarget } = resolveImagePaths(imageRef.ref, sourcePath, outputDir);

        if (!isInside(sourceDir, resolvedSource)) {
          outsideSourceCount += 1;
          logImageWarning(this.log, logPrefix, 'warning_outside_source', imageRef.rawRef, post.source);
          continue;
        }

        if (!isInside(publicDir, resolvedTarget)) {
          outsidePublicCount += 1;
          logImageWarning(this.log, logPrefix, 'warning_outside_public', imageRef.rawRef, post.source);
          continue;
        }

        let sourceStat;
        try {
          sourceStat = await fs.stat(resolvedSource);
        } catch {
          missingCount += 1;
          logImageWarning(this.log, logPrefix, 'warning_source_image_missing', imageRef.rawRef, post.source);
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

    const warningsTotal = absolutePathCount +
      missingCount +
      failedCount +
      outsideSourceCount +
      outsidePublicCount +
      unsupportedSyntaxCount;

    this.log.info(
      '%s Finished: %d copied, %d skipped, %d warnings_total, %d warning_absolute_path, %d warning_source_image_missing, %d warning_post_read_failed, %d warning_outside_source, %d warning_outside_public, %d warning_unsupported_syntax in %d ms',
      logPrefix,
      copiedCount,
      skippedCount,
      warningsTotal,
      absolutePathCount,
      missingCount,
      failedCount,
      outsideSourceCount,
      outsidePublicCount,
      unsupportedSyntaxCount,
      Date.now() - startTime
    );
  });
}

if (typeof hexo !== 'undefined' && hexo && hexo.extend && hexo.extend.filter) {
  register(hexo);
}

module.exports = {
  extractImageRefs,
  extractMarkdownImageRawRefs,
  extractUnsupportedMarkdownImageSyntaxes,
  extractUnsupportedAbsoluteImageRefs,
  isWindowsAbsolutePath,
  isInside,
  normalizeRef,
  parseMarkdownImageRefAt,
  parseObsidianImageAt,
  parseMarkdownReferenceImageAt,
  register,
  resolveImagePaths,
  sanitizeRef,
  stripCodeContexts,
  stripFrontMatter,
  stripInlineCode
};
