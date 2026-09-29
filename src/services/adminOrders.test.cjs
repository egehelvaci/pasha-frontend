const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

const source = ts.transpileModule(fs.readFileSync('src/services/api.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;

function service(data) {
  const calls = [];
  const context = {
    exports: {}, process: { env: {} }, console, URLSearchParams, window: {},
    localStorage: { getItem: () => null },
    sessionStorage: { getItem: () => 'test-token' },
    fetch: async (...args) => {
      calls.push(args);
      return { ok: true, json: async () => ({ success: true, data }) };
    },
  };
  vm.runInNewContext(source, context);
  return { get: context.exports.getAdminOrdersLegacy, calls };
}

test('combined filters use backend parameter names and survive pagination', async () => {
  const { get, calls } = service({ orders: [], pagination: { totalCount: 42, totalPages: 3 } });
  const signal = new AbortController().signal;
  for (const page of [1, 2]) {
    await get({ page, limit: 20, storeId: 'store-uuid', status: 'delivered', signal });
    const [url, options] = calls.at(-1);
    const parsed = new URL(url);
    assert.equal(parsed.pathname, '/api/admin/orders');
    assert.equal(parsed.searchParams.get('store_id'), 'store-uuid');
    assert.equal(parsed.searchParams.get('order_statu'), 'delivered');
    assert.equal(parsed.searchParams.get('page'), String(page));
    assert.equal(parsed.searchParams.has('storeId'), false);
    assert.equal(options.signal, signal);
  }
});

test('all omits optional filters; records and filtered pagination come from data', async () => {
  const orders = [{ id: 'a' }, { id: 'b' }];
  const { get, calls } = service({
    orders,
    pagination: { page: 2, limit: 20, totalCount: 25, total: 999, totalPages: 2 },
    statistics: { total: 999 },
  });
  const result = await get({ page: 2, storeId: '', status: '' });
  const query = new URL(calls[0][0]).searchParams;
  assert.equal(query.has('store_id'), false);
  assert.equal(query.has('order_statu'), false);
  assert.equal(result.orders, orders);
  assert.equal(result.pagination.total, 25);
  assert.equal(result.pagination.totalPages, 2);
  assert.equal(result.pagination.hasNext, false);
  assert.equal(result.pagination.hasPrev, true);
});

test('one matching order does not expose an empty second page even with stale page metadata', async () => {
  const { get } = service({
    orders: [{ id: 'only-match' }],
    pagination: { page: 1, limit: 20, totalCount: 1, totalPages: 2, hasNext: true },
    statistics: { total: 250, confirmed: 32 },
  });
  const result = await get({ storeId: 'store-uuid', status: 'CONFIRMED' });
  assert.equal(result.pagination.totalPages, 1);
  assert.equal(result.pagination.hasNext, false);
  assert.equal(result.pagination.hasPrev, false);
});

test('pagination respects exact page boundaries and retains a real second page', async () => {
  for (const [totalCount, totalPages] of [[0, 0], [20, 1], [21, 2], [40, 2], [41, 3]]) {
    const { get } = service({ orders: [], pagination: { page: 1, limit: 20, totalCount, totalPages: 99 } });
    const result = await get();
    assert.equal(result.pagination.totalPages, totalPages);
    assert.equal(result.pagination.hasNext, totalPages > 1);
  }
});
