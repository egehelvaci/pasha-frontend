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
const { getOptionalHeightLimit, normalizeOptionalHeightInput } = context.exports;

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
