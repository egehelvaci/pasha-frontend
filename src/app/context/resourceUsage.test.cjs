const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { createRoot } = require('react-dom/client');
const { JSDOM } = require('jsdom');

function setup(file, services = {}, extra = {}) {
  const dom = new JSDOM('<div id="root"></div>', { url: 'https://frontend.test' });
  global.window = dom.window;
  global.document = dom.window.document;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  let now = 100000;
  const context = { exports: {}, window: dom.window, document: dom.window.document, navigator: dom.window.navigator,
    AbortController, console, process: { env: {} }, Date: { now: () => now }, setTimeout, clearTimeout,
    setInterval, clearInterval,
    require(name) {
      if (name.includes('AuthContext')) return { useAuth: () => ({ user: { userId: 'user-1' }, isLoading: false }) };
      if (name.includes('services/api')) return services;
      return require(name);
    }, ...extra };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true, target: ts.ScriptTarget.ES2020 },
  }).outputText, context);
  const root = createRoot(document.getElementById('root'));
  return { dom, api: context.exports, root, advance: ms => { now += ms; },
    async close() { await React.act(async () => root.unmount()); dom.window.close(); delete global.window; delete global.document; } };
}

test('site settings coalesce pending/focus requests, preserve manual refresh, and cancel on unmount', async () => {
  const calls = [];
  let resolve;
  const app = setup('src/app/context/SiteSettingsContext.tsx', {
    getSiteSettings: signal => {
      calls.push(signal);
      return new Promise((done, reject) => {
        resolve = done;
        signal.addEventListener('abort', () => reject(new Error('Aborted')), { once: true });
      });
    },
  });
  let settings;
  function Consumer() { settings = app.api.useSiteSettings(); return null; }
  try {
    await React.act(async () => app.root.render(React.createElement(app.api.SiteSettingsProvider, null, React.createElement(Consumer))));
    app.dom.window.dispatchEvent(new app.dom.window.Event('focus'));
    app.dom.window.document.dispatchEvent(new app.dom.window.Event('visibilitychange'));
    assert.equal(calls.length, 1);
    await React.act(async () => resolve({ hideStock: true, hideBalance: false, banners: [] }));
    assert.equal(settings.hideStock, true);
    app.dom.window.dispatchEvent(new app.dom.window.Event('focus'));
    assert.equal(calls.length, 1);
    await React.act(async () => { void settings.refreshSiteSettings(); });
    assert.equal(calls.length, 2);
    await app.close();
    assert.equal(calls[1].aborted, true);
  } finally {
    if (global.window) await app.close();
  }
});

test('notification polling pauses in hidden tabs and removes its timer on unmount', async () => {
  let count = 0, tick, cleared = false;
  const app = setup('src/app/context/NotificationContext.tsx', {
    getUnreadNotificationCount: async () => { count++; return 0; },
  }, { setInterval: callback => { tick = callback; return 1; }, clearInterval: () => { cleared = true; } });
  try {
    await React.act(async () => app.root.render(React.createElement(app.api.NotificationProvider)));
    assert.equal(count, 1);
    Object.defineProperty(app.dom.window.document, 'visibilityState', { configurable: true, value: 'hidden' });
    app.advance(61000);
    await React.act(async () => tick());
    assert.equal(count, 1);
    Object.defineProperty(app.dom.window.document, 'visibilityState', { configurable: true, value: 'visible' });
    await React.act(async () => tick());
    assert.equal(count, 2);
    await app.close();
    assert.equal(cleared, true);
  } finally {
    if (global.window) await app.close();
  }
});

test('product listing makes one request on mount and one per page change', async () => {
  const calls = [];
  const router = { push() {}, replace() {} };
  const query = new URLSearchParams();
  const auth = { user: { userId: 'user-1' }, isAdmin: false, isAdminOrEditor: false };
  const app = setup('src/app/dashboard/urunler/liste/page.tsx', {}, {
    URLSearchParams,
    fetch: async (url, options) => {
      calls.push([url, options]);
      const page = Number(new URL(url).searchParams.get('page') || 1);
      return { ok: true, json: async () => ({ success: true, data: [], pagination: { page, totalPages: 2, total: 2 } }) };
    },
    require(name) {
      if (name === 'next/navigation') return { useRouter: () => router, useSearchParams: () => query };
      if (name === 'next/link') return { __esModule: true, default: props => React.createElement('a', props) };
      if (name === 'next/image') return { __esModule: true, default: () => null };
      if (name === 'react-icons/fa') return { FaTrash: () => null };
      if (name.includes('AuthContext')) return { useAuth: () => auth };
      if (name.includes('CartContext')) return { useCart: () => ({ refreshCart() {} }) };
      if (name.includes('SiteSettingsContext')) return { useSiteSettings: () => ({ hideStock: false, isLoaded: true }) };
      if (name.includes('useToken')) return { useToken: () => 'test-token' };
      if (name.includes('services/api')) return { getProductRules: async () => [] };
      if (name.includes('productStock')) return {};
      return require(name);
    },
  });
  try {
    await React.act(async () => app.root.render(React.createElement(app.api.default)));
    await React.act(async () => new Promise(resolve => setTimeout(resolve, 350)));
    assert.equal(calls.filter(([url]) => new URL(url).pathname === '/api/products').length, 1);
    const next = Array.from(document.querySelectorAll('button')).find(button => button.textContent === 'Sonraki');
    assert.ok(next);
    await React.act(async () => next.dispatchEvent(new app.dom.window.MouseEvent('click', { bubbles: true })));
    const products = calls.filter(([url]) => new URL(url).pathname === '/api/products');
    assert.equal(products.length, 2);
    assert.equal(new URL(products[1][0]).searchParams.get('page'), '2');
    assert.equal(calls.filter(([url]) => new URL(url).pathname === '/api/collections/').length, 1);
  } finally {
    await app.close();
  }
});
