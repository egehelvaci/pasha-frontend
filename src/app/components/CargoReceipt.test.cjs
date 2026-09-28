const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');

const source = ts.transpileModule(fs.readFileSync('src/app/components/CargoReceipt.tsx', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText;

function printReceipt(items) {
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
      store_tax_office: 'PRIVATE-TAX-OFFICE', items,
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

test('cargo receipt omits recipient tax/email and lists every product below sender', () => {
  const { html, content } = printReceipt([
    { width: 80, height: 150, product: { name: 'Halı <Özel> & Desen' }, quantity: 2 },
    { width: 120, height: 180, product: { name: 'İkinci Halı' }, quantity: 3 },
  ]);
  assert.doesNotMatch(html, /private@example.com|TAX-123|PRIVATE-TAX-OFFICE|E-posta:|Vergi No:|Vergi Dairesi:/);
  assert.match(html, /80 × 150 cm · Halı &lt;Özel&gt; &amp; Desen · <strong>2 adet/);
  assert.match(html, /120 × 180 cm · İkinci Halı · <strong>3 adet/);
  assert.ok(html.indexOf('Ürün Detay') > html.indexOf('GÖNDERİCİ BİLGİLERİ'));
  assert.match(html, /size: A5 landscape/);
  assert.equal(content.style.transform, 'scale(0.5)');
});

test('cargo receipt handles missing product details and empty orders', () => {
  assert.match(printReceipt([{ quantity: 1 }]).html, /— × — cm · Ürün · <strong>1 adet/);
  assert.match(printReceipt([]).html, /Ürün bulunamadı/);
});
