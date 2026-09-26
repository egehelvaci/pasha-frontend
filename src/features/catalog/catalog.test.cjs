const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

const source = ts.transpileModule(fs.readFileSync('src/features/catalog/model.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const context = { exports: {}, console };
vm.runInNewContext(source, context);
const { defaultOptions, normalizeCatalogProduct, parseCatalogDraft, planCatalogPages } = context.exports;
const product = (id, collection = 'A') => ({ id, name: `Ürün ${id}`, description: '', image: '', collectionId: collection, collectionName: collection });

test('compact and spacious layouts paginate each collection independently', () => {
  const products = [...Array.from({ length: 7 }, (_, i) => product(`a${i}`, 'A')), ...Array.from({ length: 4 }, (_, i) => product(`b${i}`, 'B'))];
  assert.deepEqual(Array.from(planCatalogPages(products, defaultOptions), page => page.products.length), [6, 1, 4]);
  assert.deepEqual(Array.from(planCatalogPages(products, { ...defaultOptions, layout: 'spacious' }), page => page.products.length), [4, 3, 4]);
});

test('duplicate products are discarded without changing selection order', () => {
  const pages = planCatalogPages([product('1'), product('1'), product('2')], defaultOptions);
  assert.equal(pages[0].products.map(item => item.id).join(','), '1,2');
});

test('API products are reduced to the printable payload', () => {
  const normalized = normalizeCatalogProduct({ productId: 'p1', name: 'Halı', description: 'Açıklama', productImage: 'https://example.com/a.jpg', collectionId: 'c1', collection: { name: 'Seri' }, price: 999, stock: 50 });
  assert.deepEqual(Object.keys(normalized), ['id', 'name', 'description', 'image', 'collectionId', 'collectionName']);
  assert.equal(normalized.collectionName, 'Seri');
});

test('draft restoration validates and normalizes options', () => {
  const restored = parseCatalogDraft(JSON.stringify({ version: 1, products: [product('1')], options: { title: 'Katalog', layout: 'spacious', quality: 'high', cover: false, descriptions: false } }));
  assert.equal(restored.products.length, 1);
  assert.equal(JSON.stringify(restored.options), JSON.stringify({ title: 'Katalog', layout: 'spacious', quality: 'high', cover: false, descriptions: false }));
  assert.throws(() => parseCatalogDraft('{"version":2}'));
});
