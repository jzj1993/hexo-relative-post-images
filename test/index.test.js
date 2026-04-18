'use strict';

const fs = require('fs/promises');
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

const { extractImageRefs } = require('../src/index.js');

test('extractImageRefs ignores image references inside code', async () => {
  const markdown = await fs.readFile(path.join(__dirname, 'test.md'), 'utf8');

  assert.deepEqual(
    extractImageRefs(markdown).sort(),
    ['cover.jpg', './images/demo.webp', './real-inline-context.png'].sort()
  );
});
