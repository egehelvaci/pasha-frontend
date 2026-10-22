const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { JSDOM } = require('jsdom');

const context = { exports: {}, require };
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/app/utils/printDocument.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
}).outputText, context);

test('printed API fields cannot execute scripts, event handlers, or active embeds', () => {
  const dom = new JSDOM('', { url: 'https://frontend.test', runScripts: 'dangerously' });
  const { window } = dom;
  const safe = context.exports.sanitizePrintHtml(window, `<!doctype html><html><head>
    <style>@page { size: 80mm 100mm; } .label { color: black; }</style>
    <meta http-equiv="refresh" content="0;url=https://attacker.test"></head><body>
    <p>Mağaza &amp; müşteri</p><script>window.compromised = true</script>
    <img src="/qr.png" onerror="window.compromised=true">
    <a href="javascript:alert(1)">Details</a><iframe srcdoc="<script>alert(1)</script>"></iframe>
    <object data="https://attacker.test"></object></body></html>`);
  window.document.write(safe);
  window.document.querySelector('img').dispatchEvent(new window.Event('error'));
  assert.equal(window.compromised, undefined);
  assert.equal(window.document.querySelector('script, iframe, object, meta'), null);
  assert.equal(window.document.querySelector('img').hasAttribute('onerror'), false);
  assert.equal(window.document.querySelector('a').hasAttribute('href'), false);
  assert.match(window.document.querySelector('style').textContent, /80mm 100mm/);
  assert.equal(window.document.querySelector('img').getAttribute('src'), '/qr.png');
  assert.match(window.document.body.textContent, /Mağaza & müşteri/);
  window.close();
});

test('the receipt print button works without allowing inline event handlers', () => {
  const dom = new JSDOM('', { url: 'https://frontend.test' });
  let printed = 0;
  dom.window.print = () => printed++;
  context.exports.writePrintDocument(dom.window, '<button class="print-button" onclick="alert(1)">Yazdır</button>');
  dom.window.document.querySelector('button').click();
  assert.equal(printed, 1);
  assert.equal(dom.window.document.querySelector('button').hasAttribute('onclick'), false);
  dom.window.close();
});
