const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function proxy(fetch) {
  const context = { exports: {}, require, Buffer, URL, AbortSignal, fetch, process: { env: { NEXT_PUBLIC_API_BASE_URL: 'https://backend.test' } } };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/app/api/auth/proxy.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, context);
  return context.exports;
}
const request = body => new Request('https://frontend.test/api/auth/login', { method: 'POST', body: JSON.stringify(body) });

test('login validates shape and limits streamed bytes even without Content-Length', async () => {
  const { readLoginBody } = proxy(() => { throw new Error('No network expected'); });
  const valid = await readLoginBody(request({ username: 'dealer', password: 'test-password' }));
  assert.equal(valid.rememberMe, false);
  for (const body of [null, {}, { username: 'a', password: {} }, { username: '', password: 'x' }, { username: 'a', password: 'x', rememberMe: 'yes' }]) {
    await assert.rejects(readLoginBody(request(body)));
  }
  const bytes = new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(8193)); controller.close(); } });
  await assert.rejects(readLoginBody(new Request('https://frontend.test', { method: 'POST', body: bytes, duplex: 'half' })), /too large/);
});

test('logout reaches the issuing backend and preserves an invalid-token response', async () => {
  let call;
  const { proxyAuthRequest } = proxy(async (...args) => {
    call = args;
    return Response.json({ success: false }, { status: 401 });
  });
  const result = await proxyAuthRequest(new Request('https://frontend.test/api/auth/logout', {
    method: 'POST', headers: { Authorization: 'Bearer test-token' },
  }), 'logout');
  assert.equal(result.status, 401);
  assert.equal(String(call[0]), 'https://backend.test/api/auth/logout');
  assert.equal(call[1].headers.Authorization, 'Bearer test-token');
  assert.equal(call[1].redirect, 'error');
  assert.ok(call[1].signal instanceof AbortSignal);
  assert.equal(result.headers.get('cache-control'), 'no-store');
});

test('self-proxy configuration fails closed and upstream failure returns a generic response', async () => {
  const { proxyAuthRequest } = proxy(() => { throw new Error('private upstream detail'); });
  assert.equal((await proxyAuthRequest(new Request('https://backend.test/api/auth/login'), 'login')).status, 503);
  const result = await proxyAuthRequest(new Request('https://frontend.test/api/auth/login'), 'login');
  assert.equal(result.status, 502);
  assert.doesNotMatch(await result.text(), /private upstream detail/);
});
