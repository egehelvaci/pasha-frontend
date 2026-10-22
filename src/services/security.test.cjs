const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

const source = ts.transpileModule(fs.readFileSync('src/services/api.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
function service(token = 'test-token') {
  const calls = [];
  const nativeFetch = async (...args) => { calls.push(args); return { ok: true, status: 401, json: async () => ({ success: true }) }; };
  const window = { fetch: nativeFetch, location: { origin: 'https://frontend.test' } };
  const context = { exports: {}, URL, URLSearchParams, FormData, window, console: { error() {} },
    process: { env: { NEXT_PUBLIC_API_BASE_URL: 'https://backend.test' } },
    localStorage: { getItem: () => null }, sessionStorage: { getItem: () => token }, fetch: nativeFetch };
  vm.runInNewContext(source, context);
  return { api: context.exports, calls, window };
}

test('legacy mutations require a session before issuing requests', async () => {
  const { api, calls } = service(null);
  await assert.rejects(api.deleteProduct('product-1'));
  await assert.rejects(api.createPrice({ productId: 'product-1', price: 10 }));
  assert.equal(calls.length, 0);
  const valid = service();
  await valid.api.deleteProduct('product-1');
  assert.equal(valid.calls[0][1].headers.Authorization, 'Bearer test-token');
});

test('fetch interception installs once and only expires sessions for trusted API origins', async () => {
  const { api, calls, window } = service();
  let expired = 0;
  api.setTokenExpiryHandler(() => expired++);
  api.setupGlobalFetchInterceptor();
  const first = window.fetch;
  api.setupGlobalFetchInterceptor();
  assert.equal(window.fetch, first);
  await window.fetch('https://external.test/api/assets');
  assert.equal(expired, 0);
  await window.fetch('https://backend.test/api/products');
  assert.equal(expired, 1);
  await window.fetch('/api/auth/logout');
  assert.equal(expired, 2);
  assert.equal(calls.length, 3);
});
