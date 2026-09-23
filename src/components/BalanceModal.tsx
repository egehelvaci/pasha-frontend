'use client';

import React, { useState, useEffect } from 'react';
import { Supplier, BalanceUpdateRequest } from '../services/api';

interface BalanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: BalanceUpdateRequest) => Promise<void>;
  supplier: Supplier | null;
  isLoading?: boolean;
}

export default function BalanceModal({ 
  isOpen, 
  onClose, 
  onSave, 
  supplier, 
  isLoading = false 
}: BalanceModalProps) {
  const [formData, setFormData] = useState({
    amount: '',
    exchange_rate: '',
    transaction_type: 'PURCHASE' as 'PAYMENT' | 'PURCHASE' | 'ADJUSTMENT' | 'REFUND' | 'DISCOUNT',
    description: '',
    reference_number: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Modal açıkken body scroll'unu devre dışı bırak
  useEffect(() => {
    if (isOpen) {
      // Scroll'u devre dışı bırak
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
    } else {
      // Scroll'u tekrar aktif et
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    }
    
    // Cleanup function
    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    };
  }, [isOpen]);

  // Form verilerini temizle
  useEffect(() => {
    if (isOpen) {
      setFormData({
        amount: '',
        exchange_rate: '',
        transaction_type: 'PURCHASE',
        description: '',
        reference_number: ''
      });
      setErrors({});
    }
  }, [isOpen]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.amount.trim()) {
      newErrors.amount = 'Tutar zorunludur';
    } else {
      const amount = parseFloat(formData.amount);
      if (isNaN(amount) || amount === 0) {
        newErrors.amount = 'Geçerli bir tutar giriniz';
      }
    }

    if (!formData.exchange_rate.trim()) {
      newErrors.exchange_rate = 'Dolar kuru zorunludur';
    } else {
      const rate = parseFloat(formData.exchange_rate);
      if (isNaN(rate) || rate <= 0) {
        newErrors.exchange_rate = 'Geçerli bir dolar kuru giriniz';
      }
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Açıklama zorunludur';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const submitData: BalanceUpdateRequest = {
      amount: parseFloat(formData.amount),
      exchange_rate: parseFloat(formData.exchange_rate),
      transaction_type: formData.transaction_type,
      description: formData.description.trim(),
      reference_number: formData.reference_number.trim() || undefined
    };

    try {
      await onSave(submitData);
      onClose();
    } catch (error) {
      console.error('Bakiye güncelleme hatası:', error);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Hata mesajını temizle
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const getTransactionTypeLabel = (type: string) => {
    const labels = {
      'PAYMENT': 'Ödeme',
      'PURCHASE': 'Alış',
      'ADJUSTMENT': 'Düzeltme',
      'REFUND': 'İade',
      'DISCOUNT': 'İndirim'
    };
    return labels[type as keyof typeof labels] || type;
  };

  const getTransactionTypeColor = (type: string) => {
    const colors = {
      'PAYMENT': 'text-green-600 bg-green-100',
      'PURCHASE': 'text-red-600 bg-red-100',
      'ADJUSTMENT': 'text-blue-600 bg-blue-100',
      'REFUND': 'text-purple-600 bg-purple-100',
      'DISCOUNT': 'text-orange-600 bg-orange-100'
    };
    return colors[type as keyof typeof colors] || 'text-gray-600 bg-gray-100';
  };

  if (!isOpen || !supplier) return null;

  const inputClass = (hasError?: boolean) =>
    `w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition-all duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-60 ${
      hasError
        ? 'border-red-300 hover:border-red-400'
        : 'border-slate-200/80 hover:border-slate-300 hover:bg-slate-50'
    }`;

  return (
    <div className="fixed inset-0 z-50 flex min-h-screen items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div
        className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.08)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200/80 px-5 py-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Bakiye Güncelle</h3>
            <p className="mt-0.5 text-xs text-slate-500">{supplier.name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition-all duration-200 ease-out hover:bg-slate-50 hover:text-slate-600 focus-visible:ring-2 focus-visible:ring-[#00365a]/20"
            disabled={isLoading}
            aria-label="Kapat"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5">
          <div className="space-y-5">
            <div className="rounded-xl border border-slate-200/80 bg-slate-50 p-4">
              <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Mevcut Bakiye</h4>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Güncel Bakiye:</span>
                <span className={`text-lg font-semibold tabular-nums ${
                  supplier.balance < 0 ? 'text-red-600' : 'text-emerald-600'
                }`}>
                  {supplier.balance.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {supplier.currency}
                </span>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                İşlem Türü <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.transaction_type}
                onChange={(e) => handleInputChange('transaction_type', e.target.value)}
                className={inputClass()}
                disabled={isLoading}
              >
                <option value="PURCHASE">Alış (Borç Artışı)</option>
                <option value="PAYMENT">Ödeme (Borç Azaltma)</option>
                <option value="ADJUSTMENT">Düzeltme</option>
                <option value="REFUND">İade</option>
                <option value="DISCOUNT">İndirim</option>
              </select>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                  Tutar (TRY) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => handleInputChange('amount', e.target.value)}
                  onWheel={(e) => e.currentTarget.blur()}
                  className={inputClass(!!errors.amount)}
                  placeholder="0.00"
                  disabled={isLoading}
                />
                {errors.amount && <p className="mt-1.5 text-xs text-red-600">{errors.amount}</p>}
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                  Dolar Kuru <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.exchange_rate}
                  onChange={(e) => handleInputChange('exchange_rate', e.target.value)}
                  onWheel={(e) => e.currentTarget.blur()}
                  className={inputClass(!!errors.exchange_rate)}
                  placeholder="34.50"
                  disabled={isLoading}
                />
                {errors.exchange_rate && <p className="mt-1.5 text-xs text-red-600">{errors.exchange_rate}</p>}
              </div>
            </div>

            {formData.amount && formData.exchange_rate && !errors.amount && !errors.exchange_rate && (
              <div className="rounded-xl border border-slate-200/80 bg-slate-50 p-4">
                <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Hesaplama Önizlemesi</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">TRY Tutarı:</span>
                    <span className="font-medium tabular-nums text-slate-900">
                      {parseFloat(formData.amount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TRY
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Dolar Kuru:</span>
                    <span className="font-medium tabular-nums text-slate-900">
                      {parseFloat(formData.exchange_rate).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-slate-200 pt-2">
                    <span className="text-slate-600">USD Tutarı:</span>
                    <span className="font-semibold tabular-nums text-slate-900">
                      {(parseFloat(formData.amount) / parseFloat(formData.exchange_rate)).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} USD
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">İşlem Türü:</span>
                    <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${getTransactionTypeColor(formData.transaction_type)}`}>
                      {getTransactionTypeLabel(formData.transaction_type)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                Açıklama <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={3}
                className={inputClass(!!errors.description)}
                placeholder="İşlem açıklaması (örn: Halı alımı - Fatura No: FA-2024-015)"
                disabled={isLoading}
              />
              {errors.description && <p className="mt-1.5 text-xs text-red-600">{errors.description}</p>}
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                Referans Numarası
              </label>
              <input
                type="text"
                value={formData.reference_number}
                onChange={(e) => handleInputChange('reference_number', e.target.value)}
                className={inputClass()}
                placeholder="FA-2024-015"
                disabled={isLoading}
              />
            </div>
          </div>
        </form>

        <div className="flex justify-end gap-2 border-t border-slate-200/80 bg-slate-50/50 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200/80 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-all duration-200 ease-out hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isLoading}
          >
            İptal
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-lg bg-[#00365a] px-4 py-2.5 text-sm font-medium text-white transition-all duration-200 ease-out hover:bg-[#004170] focus-visible:ring-2 focus-visible:ring-[#00365a]/25 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading && (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            )}
            <span>Güncelle</span>
          </button>
        </div>
      </div>
    </div>
  );
}
