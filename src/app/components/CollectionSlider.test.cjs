const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { createRoot } = require('react-dom/client');
const { JSDOM } = require('jsdom');

const products = [
  { id: 'one', name: 'Halı 1', image: '/one.jpg' },
  { id: 'two', name: 'Halı 2', image: null },
  { id: 'three', name: 'Halı 3', image: '/three.jpg' },
];

function setup({ reduced = false, service } = {}) {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost', pretendToBeVisual: true });
  global.window = dom.window;
  global.document = dom.window.document;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const timers = new Map();
  let timerId = 0;
  dom.window.matchMedia = () => ({ matches: reduced, addEventListener() {}, removeEventListener() {} });
  dom.window.HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  dom.window.HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
  const cache = new Map();
  function load(file) {
    if (cache.has(file)) return cache.get(file);
    const context = {
      exports: {}, window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement,
      console, AbortController, setTimeout, clearTimeout,
      setInterval: fn => { timers.set(++timerId, fn); return timerId; },
      clearInterval: id => timers.delete(id),
      ResizeObserver: class { constructor(fn) { this.fn = fn; } observe() { this.fn([{ contentRect: { width: 1200 } }]); } disconnect() {} },
      IntersectionObserver: class { constructor(fn) { this.fn = fn; } observe() { this.fn([{ isIntersecting: true }]); } disconnect() {} },
      require(name) {
        if (name.endsWith('.module.css')) return { __esModule: true, default: new Proxy({}, { get: (_, key) => key }) };
        if (name === 'next/image') return { __esModule: true, default: ({ fill, unoptimized, ...props }) => React.createElement('img', props) };
        if (name === 'next/link') return { __esModule: true, default: props => React.createElement('a', props) };
        if (name.includes('services/api')) return { getPublicCollections: service };
        if (name.includes('product-rail-gallery')) return load('src/components/ui/product-rail-gallery.tsx');
        return require(name);
      },
    };
    vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    }).outputText, context);
    cache.set(file, context.exports);
    return context.exports;
  }
  const root = createRoot(document.getElementById('root'));
  return {
    dom, timers,
    async renderGallery(props = {}) {
      const Gallery = load('src/components/ui/product-rail-gallery.tsx').default;
      await React.act(async () => root.render(React.createElement(Gallery, { items: products, heading: 'Test koleksiyonu', ...props })));
    },
    async renderCatalog() {
      await React.act(async () => root.render(React.createElement(load('src/app/components/CollectionSlider.tsx').default)));
    },
    async close() {
      await React.act(async () => root.unmount());
      dom.window.close();
      delete global.window;
      delete global.document;
    },
  };
}

const button = label => document.querySelector(`button[aria-label="${label}"]`);
const selected = () => document.querySelector('button[aria-current="true"]');
const click = async element => React.act(async () => element.click());

test('keyboard reaches every rug, respects boundaries, and modal restores focus and scrolling', async () => {
  const app = setup();
  try {
    await app.renderGallery({ autoplay: false });
    assert.equal(button('Önceki halı').disabled, true);
    const stage = document.querySelector('[role="group"]');
    await React.act(async () => stage.dispatchEvent(new app.dom.window.KeyboardEvent('keydown', { key: 'End', bubbles: true })));
    assert.match(selected().getAttribute('aria-label'), /Halı 3/);
    assert.equal(button('Sonraki halı').disabled, true);
    const opener = selected();
    await click(opener);
    assert.equal(document.querySelector('dialog').open, true);
    assert.equal(document.body.style.overflow, 'hidden');
    assert.equal(document.activeElement, button('Ürün detayını kapat'));
    await click(button('Detayda önceki halı'));
    assert.match(document.querySelector('dialog h3').textContent, /Halı 2/);
    await React.act(async () => document.querySelector('dialog').dispatchEvent(new app.dom.window.Event('cancel', { cancelable: true })));
    assert.equal(document.querySelector('dialog').open, false);
    assert.equal(document.body.style.overflow, '');
    assert.equal(document.activeElement, selected());
    assert.match(selected().getAttribute('aria-label'), /Halı 2/);
  } finally { await app.close(); }
});

test('swiping changes the selected rug without opening a detail dialog', async () => {
  const app = setup();
  try {
    await app.renderGallery({ autoplay: false });
    const stage = document.querySelector('[role="group"]');
    stage.setPointerCapture = () => {};
    stage.hasPointerCapture = () => true;
    stage.releasePointerCapture = () => {};
    async function pointer(type, x) {
      const event = new app.dom.window.Event(type, { bubbles: true });
      Object.assign(event, { pointerId: 1, clientX: x, clientY: 100, button: 0, isPrimary: true, pointerType: 'touch' });
      await React.act(async () => stage.dispatchEvent(event));
    }
    await pointer('pointerdown', 240);
    await pointer('pointermove', 120);
    await pointer('pointerup', 120);
    assert.match(selected().getAttribute('aria-label'), /Halı 2/);
    await React.act(async () => selected().dispatchEvent(new app.dom.window.MouseEvent('click', { bubbles: true, detail: 1 })));
    assert.equal(document.querySelector('dialog').open, false);
  } finally { await app.close(); }
});

test('autoplay pauses in a hidden tab, stops on interaction, and respects reduced motion', async () => {
  for (const reduced of [false, true]) {
    const app = setup({ reduced });
    try {
      await app.renderGallery();
      assert.equal(app.timers.size, reduced ? 0 : 1);
      if (!reduced) {
        await React.act(async () => [...app.timers.values()][0]());
        assert.match(selected().getAttribute('aria-label'), /Halı 2/);
        Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
        await React.act(async () => document.dispatchEvent(new app.dom.window.Event('visibilitychange')));
        assert.equal(app.timers.size, 0);
        Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
        await React.act(async () => document.dispatchEvent(new app.dom.window.Event('visibilitychange')));
        assert.equal(app.timers.size, 1);
        await click(button('Sonraki halı'));
        assert.equal(app.timers.size, 0);
      }
    } finally { await app.close(); }
    assert.equal(app.timers.size, 0);
  }
});

test('missing and failed photos have an accessible fallback; empty and single-item rails remain safe', async () => {
  const app = setup();
  try {
    await app.renderGallery({ autoplay: false });
    assert.ok(document.querySelector('img[alt="Halı 2 — görsel hazırlanıyor"]'));
    await React.act(async () => document.querySelector('img[alt="Halı 1"]').dispatchEvent(new app.dom.window.Event('error')));
    assert.ok(document.querySelector('img[alt="Halı 1 — görsel hazırlanıyor"]'));
    await app.renderGallery({ items: [products[0]] });
    assert.equal(button('Önceki halı').disabled, true);
    assert.equal(button('Sonraki halı').disabled, true);
    await app.renderGallery({ items: [] });
    assert.equal(document.querySelector('section'), null);
  } finally { await app.close(); }
});

test('catalog retries a failed request, filters empty collections, switches products and aborts on unmount', async () => {
  const signals = [];
  const app = setup({ service: async signal => {
    signals.push(signal);
    if (signals.length === 1) throw new Error('Offline');
    return { collections: [
      { id: 'empty', name: 'Boş', products: [] },
      { id: 'first', name: 'Birinci', products },
      { id: 'second', name: 'İkinci', products: [{ id: 'new', name: 'Yeni halı' }] },
    ] };
  } });
  try {
    await app.renderCatalog();
    assert.match(document.querySelector('[role="alert"]').textContent, /ulaşılamıyor/);
    await click([...document.querySelectorAll('button')].find(el => el.textContent === 'Tekrar dene'));
    assert.equal(document.querySelectorAll('option').length, 2);
    await React.act(async () => {
      const select = document.querySelector('select');
      select.value = 'second';
      select.dispatchEvent(new app.dom.window.Event('change', { bubbles: true }));
    });
    assert.match(selected().textContent + selected().getAttribute('aria-label'), /Yeni halı/);
    assert.equal(document.querySelectorAll('button[aria-haspopup="dialog"]').length, 1);
  } finally { await app.close(); }
  assert.ok(signals.every(signal => signal.aborted));
});
