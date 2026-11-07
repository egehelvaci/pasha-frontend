const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { createRoot } = require('react-dom/client');
const { JSDOM } = require('jsdom');

function load(file, overrides = {}) {
  const context = { exports: {}, require, console, ...overrides };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText, context);
  return context.exports;
}

function rendererHarness({ compileFails = false } = {}) {
  const frames = new Map(), images = [], draws = [], deleted = [], visibility = [];
  let now = 0, nextFrame = 0, nextTexture = 0, unit, restored = 0;
  const bound = {};
  const gl = new Proxy({
    createShader: () => ({}), getShaderParameter: () => !compileFails,
    createProgram: () => ({}), getProgramParameter: () => true,
    createBuffer: () => ({}), getAttribLocation: () => 0,
    createTexture: () => ({ id: ++nextTexture }), getError: () => 'NO_ERROR',
    getUniformLocation: (_, name) => name,
    activeTexture: value => { unit = value; }, bindTexture: (_, texture) => { bound[unit] = texture; },
    drawArrays: () => draws.push([bound.TEXTURE0?.id, bound.TEXTURE1?.id]),
    deleteTexture: texture => deleted.push(texture.id),
  }, { get: (target, name) => name in target ? target[name] : /^[A-Z_0-9]+$/.test(name) ? name : () => {} });
  const canvas = Object.assign(new EventTarget(), { getContext: () => gl, clientWidth: 1000, clientHeight: 500, width: 0, height: 0 });
  const api = load('src/components/ui/morph-renderer.ts', {
    require: () => ({ VERT: '', FRAG: '' }), window: { devicePixelRatio: 2 }, performance: { now: () => now },
    Image: class { constructor() { this.naturalWidth = 600; this.naturalHeight = 900; images.push(this); } },
    ResizeObserver: class { observe() {} disconnect() {} },
    requestAnimationFrame: fn => { frames.set(++nextFrame, fn); return nextFrame; }, cancelAnimationFrame: id => frames.delete(id),
  });
  const renderer = api.createMorphRenderer(canvas, ['one.jpg', 'two.jpg', 'three.jpg'], {
    initialIndex: 0, duration: 1400, noiseScale: 3.5, edge: .15, drift: .2, loop: true,
    onVisibility: value => visibility.push(value), onRestore: () => { restored++; },
  });
  return { renderer, images, frames, draws, deleted, visibility, canvas, api, restored: () => restored,
    tick(time) { now = time; const pending = [...frames.values()]; frames.clear(); pending.forEach(fn => fn(now)); } };
}

test('shader only displays the requested slide, resumes when that texture arrives, and sleeps while idle', () => {
  const app = rendererHarness();
  app.images[0].onload(); app.tick(0);
  assert.deepEqual(app.draws.at(-1), [1, 1]);
  assert.equal(app.frames.size, 0);
  app.renderer.show(1); app.tick(50);
  assert.equal(app.visibility.at(-1), false);
  const drawCount = app.draws.length;
  app.images[2].onload(); app.tick(100);
  assert.equal(app.draws.length, drawCount, 'An unrelated loaded texture must not replace the requested banner');
  app.images[1].onload(); app.tick(150);
  assert.deepEqual(app.draws.at(-1), [3, 3]);
  app.renderer.show(0); app.tick(200);
  assert.equal(app.frames.size, 1);
  app.tick(2000);
  assert.deepEqual(app.draws.at(-1), [3, 1]);
  assert.equal(app.frames.size, 0, 'No perpetual render loop after the dissolve finishes');
  app.renderer.dispose();
  assert.deepEqual(app.deleted.sort(), [1, 2, 3]);
  assert.ok(app.images.every(image => image.onload === null && image.onerror === null));
});

test('CORS failure and context loss reveal the ordinary image; restoration requests a clean renderer', () => {
  const app = rendererHarness();
  app.images[0].onload(); app.tick(0);
  app.renderer.show(1); app.images[1].onerror(); app.tick(20);
  assert.equal(app.visibility.at(-1), false);
  app.renderer.show(0); app.tick(30);
  app.canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }));
  assert.equal(app.visibility.at(-1), false);
  assert.equal(app.frames.size, 0);
  app.canvas.dispatchEvent(new Event('webglcontextrestored'));
  assert.equal(app.restored(), 1);
  app.renderer.dispose();
});

test('shader compilation failure falls back without loading images or leaving animation work', () => {
  const app = rendererHarness({ compileFails: true });
  assert.equal(app.renderer, null);
  assert.equal(app.images.length, 0);
  assert.equal(app.frames.size, 0);
});

const items = [
  { id: 'one', src: '/one.jpg', mobileSrc: '/one-mobile.jpg', alt: 'Birinci koleksiyon', href: '/first' },
  { id: 'two', src: '/two.jpg', alt: 'İkinci koleksiyon', href: '/second' },
  { id: 'three', src: '/three.jpg', alt: 'Üçüncü koleksiyon' },
];

function galleryHarness({ reduced = false, mobile = false } = {}) {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost', pretendToBeVisual: true });
  global.window = dom.window; global.document = dom.window.document; global.IS_REACT_ACT_ENVIRONMENT = true;
  const timers = new Map();
  let nextTimer = 0;
  dom.window.matchMedia = query => ({ matches: query.includes('reduced') ? reduced : mobile, addEventListener() {}, removeEventListener() {} });
  const { default: Gallery } = load('src/components/ui/morph-gallery.tsx', {
    window: dom.window, document: dom.window.document,
    setTimeout: fn => { timers.set(++nextTimer, fn); return nextTimer; }, clearTimeout: id => timers.delete(id),
    IntersectionObserver: class { constructor(fn) { this.fn = fn; } observe() { this.fn([{ isIntersecting: true }]); } disconnect() {} },
    require(name) {
      if (name.endsWith('.module.css')) return { __esModule: true, default: new Proxy({}, { get: (_, key) => key }) };
      if (name === 'next/image') return { __esModule: true, default: ({ fill, unoptimized, priority, ...props }) => React.createElement('img', props) };
      if (name === './morph-renderer') return { createMorphRenderer: () => null, wrapIndex: (i, n, loop) => n ? loop ? ((i % n) + n) % n : Math.max(0, Math.min(i, n - 1)) : 0 };
      return require(name);
    },
  });
  const root = createRoot(document.getElementById('root'));
  return { dom, timers,
    async render(props = {}) { await React.act(async () => root.render(React.createElement(Gallery, { items, autoplay: 6000, ...props }))); },
    async close() { await React.act(async () => root.unmount()); dom.window.close(); delete global.window; delete global.document; },
  };
}
const button = name => document.querySelector(`button[aria-label="${name}"]`);
const click = async element => React.act(async () => element.click());
const currentSlide = () => document.querySelector('[data-active="true"]');

test('fallback gallery keeps images, accessible names and links in sync across arrows, thumbnails and keyboard', async () => {
  const app = galleryHarness();
  try {
    await app.render();
    assert.ok(currentSlide().querySelector('img[alt="Birinci koleksiyon"]'));
    await click(button('Sonraki duyuru'));
    assert.equal(document.querySelector('a').getAttribute('href'), '/second');
    assert.ok(currentSlide().querySelector('img[alt="İkinci koleksiyon"]'));
    assert.equal(app.timers.size, 0);
    await click(button('3. duyuruya git'));
    assert.equal(document.querySelector('a'), null);
    await React.act(async () => document.querySelector('section').dispatchEvent(new app.dom.window.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })));
    assert.ok(currentSlide().querySelector('img[alt="Birinci koleksiyon"]'));
    assert.equal(button('1. duyuruya git').getAttribute('aria-current'), 'true');
  } finally { await app.close(); }
});

test('mobile art direction, vertical gesture rejection, horizontal swipe and single/empty lists', async () => {
  const app = galleryHarness({ mobile: true, reduced: true });
  try {
    await app.render();
    assert.equal(button('1. duyuruya git').querySelector('img').getAttribute('src'), '/one-mobile.jpg');
    assert.equal(currentSlide().querySelector('source').getAttribute('srcset'), '/one-mobile.jpg');
    const stage = document.querySelector('.stage');
    stage.setPointerCapture = () => {}; stage.hasPointerCapture = () => true; stage.releasePointerCapture = () => {};
    async function pointer(type, x, y) {
      const event = new app.dom.window.Event(type, { bubbles: true });
      Object.assign(event, { pointerId: 1, clientX: x, clientY: y, isPrimary: true, button: 0 });
      await React.act(async () => stage.dispatchEvent(event));
    }
    await pointer('pointerdown', 200, 100); await pointer('pointerup', 150, 300);
    assert.equal(button('1. duyuruya git').getAttribute('aria-current'), 'true');
    await pointer('pointerdown', 200, 100); await pointer('pointerup', 100, 110);
    assert.equal(button('2. duyuruya git').getAttribute('aria-current'), 'true');
    await app.render({ items: [items[0]] });
    assert.equal(button('Sonraki duyuru'), null);
    await app.render({ items: [] });
    assert.equal(document.querySelector('section'), null);
  } finally { await app.close(); }
});

test('autoplay pauses in hidden tabs and is disabled for reduced motion', async () => {
  for (const reduced of [false, true]) {
    const app = galleryHarness({ reduced });
    try {
      await app.render();
      assert.equal(app.timers.size, reduced ? 0 : 1);
      Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
      await React.act(async () => document.dispatchEvent(new app.dom.window.Event('visibilitychange')));
      assert.equal(app.timers.size, 0);
    } finally { await app.close(); }
  }
});

test('banner URLs allow only HTTP(S) links', () => {
  const { safeBannerHref } = load('src/components/BannerCarousel.tsx', { URL, require: () => ({}) });
  for (const invalid of [null, '  ', 'javascript:alert(1)', 'data:text/html,test', 'file:///local']) assert.equal(safeBannerHref(invalid), undefined);
  assert.equal(safeBannerHref('https://example.com/collection'), 'https://example.com/collection');
  assert.equal(safeBannerHref('/dashboard/koleksiyonlar/example'), '/dashboard/koleksiyonlar/example');
});
