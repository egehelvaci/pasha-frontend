const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

const source = ts.transpileModule(fs.readFileSync('src/app/utils/productStock.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const context = { exports: {} };
vm.runInNewContext(source, context);
const { getOptionalHeightLimit, normalizeOptionalHeightInput, sortSizeOptionsByWidth } = context.exports;

test('size dropdowns show cut sizes before ready sizes, ordered by width and height within each group', () => {
  const sizes = [
    { id: 'ready-80-long', width: 80, height: 300, is_optional_height: false },
    { id: 'cut-200', width: '200', height: 0, is_optional_height: true },
    { id: 'ready-60', width: 60, height: 100 },
    { id: 'cut-80', width: '80', height: 0, is_optional_height: true },
    { id: 'ready-80-short', width: 80, height: 150, is_optional_height: false },
  ];
  const originalOrder = sizes.map(size => size.id);
  const result = sortSizeOptionsByWidth(sizes);
  assert.deepEqual(Array.from(result, size => size.id), [
    'cut-80', 'cut-200', 'ready-60', 'ready-80-short', 'ready-80-long',
  ]);
  assert.deepEqual(sizes.map(size => size.id), originalOrder);
});

test('optional height accepts multi-digit values when backend uses a sentinel height', () => {
  assert.equal(getOptionalHeightLimit(0), 10000);
  assert.equal(getOptionalHeightLimit(1), 10000);
  assert.equal(normalizeOptionalHeightInput('2', 0), '2');
  assert.equal(normalizeOptionalHeightInput('25', 0), '25');
  assert.equal(normalizeOptionalHeightInput('250', 0), '250');
});

test('optional height respects a real configured maximum', () => {
  assert.equal(getOptionalHeightLimit(500), 500);
  assert.equal(normalizeOptionalHeightInput('500', 500), '500');
  assert.equal(normalizeOptionalHeightInput('501', 500), null);
  assert.equal(normalizeOptionalHeightInput('', 500), '');
  assert.equal(normalizeOptionalHeightInput('12e2', 500), null);
});
