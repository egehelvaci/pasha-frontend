export interface OriginalPayment {
  payment_currency?: string | null;
  original_amount?: number | null;
}

export function paymentCurrencyLabel(payment: OriginalPayment): string {
  return payment.payment_currency ?? 'Belirtilmemiş';
}

export function originalPaymentAmountLabel(payment: OriginalPayment): string {
  if (payment.original_amount == null) return '—';
  return new Intl.NumberFormat('tr-TR', payment.payment_currency
    ? { style: 'currency', currency: payment.payment_currency }
    : undefined).format(payment.original_amount);
}
