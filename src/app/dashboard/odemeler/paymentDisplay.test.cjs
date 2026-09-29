const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

const context = { exports: {}, Intl };
vm.runInNewContext(ts.transpileModule(fs.readFileSync(`${__dirname}/paymentDisplay.ts`, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText, context);
const { paymentCurrencyLabel, originalPaymentAmountLabel } = context.exports;

test('payment currency and original amount are independent of converted and store amounts', () => {
  for (const currency of ['TRY', 'USD', 'EUR']) {
    const payment = { payment_currency: currency, original_amount: 125.5, store_currency: 'TRY', amount: 5000, converted_amount: 5000 };
    assert.equal(paymentCurrencyLabel(payment), currency);
    assert.equal(originalPaymentAmountLabel(payment), new Intl.NumberFormat('tr-TR', { style: 'currency', currency }).format(125.5));
  }
});

test('zero is a valid original amount', () => {
  assert.equal(originalPaymentAmountLabel({ payment_currency: 'USD', original_amount: 0 }), new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'USD' }).format(0));
});

test('missing currency is unspecified and never inferred from store currency', () => {
  const payment = { payment_currency: null, original_amount: 1234.5, store_currency: 'TRY', amount: 50000 };
  assert.equal(paymentCurrencyLabel(payment), 'Belirtilmemiş');
  assert.equal(originalPaymentAmountLabel(payment), new Intl.NumberFormat('tr-TR').format(1234.5));
  assert.equal(originalPaymentAmountLabel({ original_amount: 0 }), '0');
});

test('legacy and null original amounts display a dash without substituting amount', () => {
  for (const original_amount of [null, undefined]) {
    assert.equal(originalPaymentAmountLabel({ payment_currency: 'EUR', original_amount, amount: 100 }), '—');
  }
  assert.equal(paymentCurrencyLabel({}), 'Belirtilmemiş');
});
