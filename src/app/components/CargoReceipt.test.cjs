const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');

const source = ts.transpileModule(fs.readFileSync('src/app/components/CargoReceipt.tsx', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText;

function printReceipt(items, orderOverrides = {}) {
  let html = '';
  let printed = false;
  const content = { scrollHeight: 960, style: {} };
  const popup = {
    document: {
      write(value) { html = value; },
      close() {},
      querySelector(selector) {
        return selector === '.receipt-container' ? { clientHeight: 480 } : content;
      },
    },
    focus() {},
    print() { printed = true; },
    close() {},
  };
  const context = {
    exports: {},
    require(name) {
      if (name === 'react') return { useEffect() {} };
      if (name === '@/app/context/AuthContext') return { useAuth: () => ({ isAdminOrEditor: true }) };
      return require(name);
    },
    window: { open: () => popup },
    setTimeout(callback) { callback(); },
  };
  vm.runInNewContext(source, context);
  const tree = context.exports.default({
    order: {
      id: '12345678', created_at: '2026-09-28', store_name: 'Mağaza',
      store_email: 'private@example.com', store_tax_number: 'TAX-123',
      store_tax_office: 'PRIVATE-TAX-OFFICE', items, ...orderOverrides,
    },
    isVisible: true, onClose() {},
  });
  function visit(element) {
    if (!React.isValidElement(element)) return;
    if (element.type === 'button' && element.props.onClick.name === 'handlePrint') {
      element.props.onClick();
    }
    React.Children.forEach(element.props.children, visit);
  }
  visit(tree);
  popup.onload();
  assert.equal(printed, true);
  return { html, content };
}

test('simplified receipt keeps print settings and only shipping information', () => {
  const { html } = printReceipt([
    { width: 80, height: 300, product: { name: 'STAR ANTRASİT' }, quantity: 1 },
    { width: 120, height: 180, product: { name: 'Halı <Özel> & Desen' }, quantity: 3 },
  ], {
    store_name: 'MAHMUT TERZİ - HALICELL', store_phone: '0535 014 34 11',
    address: { title: 'MAHMUT TERZİ - HALICELL', address: 'Hacıhalil Mh. Yeni Bağdat Cd. No:428/A', district: 'GEBZE', city: 'KOCAELİ' },
    sender_info: { kurum_adi: 'PAŞAOĞLU HALICILIK SANAYİ VE TİCARET LİMİTED ŞİRKETİ', address: 'Güneşli, Mahmutbey Cd. No:145 D:147, 34212 Bağcılar/İstanbul', telefon: '0538 375 71 44' }
  });
  assert.doesNotMatch(html, /private@example.com|TAX-123|PRIVATE-TAX-OFFICE|Sipariş No:|Tarih:|Yetkili:|Posta Kodu:|Ürün Detay|www.pasahome/);
  assert.equal((html.match(/MAHMUT TERZİ - HALICELL/g) || []).length, 1);
  assert.ok(html.includes('STAR ANTRASİT 80 × 300</li>'));
  assert.match(html, /Halı &lt;Özel&gt; &amp; Desen 120 × 180 · 3 adet/);
  assert.ok(html.indexOf('<ul class="product-list">') > html.indexOf('GÖNDEREN'));
  assert.match(html, /@page { margin: 0; size: auto; }/);
  assert.match(html, /max-width: 800px/);
  assert.match(html, /padding: 20px/);
  assert.match(html, /0538 375 71 44/);
  assert.doesNotMatch(html, /1296|555 234/);
  if (process.env.CARGO_PREVIEW_PATH) fs.writeFileSync(process.env.CARGO_PREVIEW_PATH, html);
});

test('missing values and special characters remain safe', () => {
  const { html } = printReceipt([{ quantity: 1 }], { delivery_address: 'Alternatif <adres>', store_name: '<Halı> & Ev' });
  assert.match(html, /Ürün — × —/);
  assert.match(html, /Alternatif &lt;adres&gt;/);
  assert.match(html, /&lt;Halı&gt; &amp; Ev/);
  assert.match(html, /No:145 D:147/);
  assert.match(printReceipt([]).html, /Ürün bulunamadı/);
  const current = printReceipt([], { sender_info: { address: '<Güncel> adres', kurum_adi: 'Firma & Ev', telefon: '123' } }).html;
  assert.match(current, /&lt;Güncel&gt; adres/);
  assert.match(current, /Firma &amp; Ev/);
});
