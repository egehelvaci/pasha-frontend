const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

// Load the real service with an isolated fetch; no live credentials or backend needed.
const source = ts.transpileModule(fs.readFileSync('src/services/api.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
function service(payload, ok = true) {
  const calls = [];
  const context = { exports: {}, process: { env: {} }, console,
    fetch: async (...args) => { calls.push(args); return { ok, json: async () => payload }; } };
  vm.runInNewContext(source, context);
  return { get: context.exports.getBestsellers, calls };
}
const product = (id, quantity) => ({ product_id: id, product_name: `Product ${id}`, total_quantity: quantity });
const options = { token: 'test-only', isAdmin: true, signal: new AbortController().signal };

test('admin uses sales endpoint, authentication, cancellation, and descending real quantities', async () => {
  const { get, calls } = service({ success: true, data: { products: [product('a', 2), product('b', '10'), product('zero', 0)] } });
  const result = await get(options);
  assert.equal(result.map(p => p.product_id).join(','), 'b,a');
  assert.match(calls[0][0], /admin\/statistics\/top-products\?period=1_year$/);
  assert.equal(calls[0][1].headers.Authorization, 'Bearer test-only');
  assert.equal(calls[0][1].signal, options.signal);
  assert.equal(calls[0][1].cache, 'no-store');
});
test('dealer reads only their own statistics', async () => {
  const { get, calls } = service({ success: true, data: { top_products: [product('a', 4)] } });
  assert.equal((await get({ ...options, isAdmin: false }))[0].total_quantity, 4);
  assert.match(calls[0][0], /my-statistics\/user-stats\?period=1_year$/);
});
test('successful empty data remains empty', async () => {
  assert.equal((await service({ success: true, data: { products: [] } }).get(options)).length, 0);
});
test('HTTP, API-level failure and malformed data reject instead of showing an empty success', async () => {
  for (const payload of [{ success: false, data: { products: [] } }, {}, { success: true, data: { products: [product('a', null)] } }]) {
    await assert.rejects(service(payload).get(options));
  }
  await assert.rejects(service({}, false).get(options));
});
test('duplicate products do not render duplicate cards', async () => {
  const result = await service({ success: true, data: { products: [product('a', 3), product('a', 3)] } }).get(options);
  assert.equal(result.length, 1);
});
