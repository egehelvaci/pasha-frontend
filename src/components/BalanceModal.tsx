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

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center min-h-screen p-4">
      <div 
        className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-[#00365a] to-[#004170]">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center text-white text-lg font-bold">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white">Bakiye Güncelle</h3>
              <p className="text-sm text-white/80">{supplier.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-colors text-white"
            disabled={isLoading}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Modal Content */}
        <form onSubmit={handleSubmit} className="p-6 max-h-[calc(90vh-140px)] overflow-y-auto">
          <div className="space-y-6">
            {/* Mevcut Bakiye */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Mevcut Bakiye</h4>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Güncel Bakiye:</span>
                <span className={`text-lg font-bold ${
                  supplier.balance < 0 ? 'text-red-600' : 'text-green-600'
                }`}>
                  {supplier.balance.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {supplier.currency}
                </span>
              </div>
            </div>

            {/* İşlem Türü */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                İşlem Türü <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.transaction_type}
                onChange={(e) => handleInputChange('transaction_type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00365a] focus:border-transparent"
                disabled={isLoading}
              >
                <option value="PURCHASE">Alış (Borç Artışı)</option>
                <option value="PAYMENT">Ödeme (Borç Azaltma)</option>
                <option value="ADJUSTMENT">Düzeltme</option>
                <option value="REFUND">İade</option>
                <option value="DISCOUNT">İndirim</option>
              </select>
            </div>

            {/* Tutar ve Dolar Kuru */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tutar (TRY) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => handleInputChange('amount', e.target.value)}
                  onWheel={(e) => e.currentTarget.blur()}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#00365a] focus:border-transparent ${
                    errors.amount ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="0.00"
                  disabled={isLoading}
                />
                {errors.amount && <p className="mt-1 text-sm text-red-600">{errors.amount}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dolar Kuru <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.exchange_rate}
                  onChange={(e) => handleInputChange('exchange_rate', e.target.value)}
                  onWheel={(e) => e.currentTarget.blur()}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#00365a] focus:border-transparent ${
                    errors.exchange_rate ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="34.50"
                  disabled={isLoading}
                />
                {errors.exchange_rate && <p className="mt-1 text-sm text-red-600">{errors.exchange_rate}</p>}
              </div>
            </div>

            {/* Hesaplama Önizlemesi */}
            {formData.amount && formData.exchange_rate && !errors.amount && !errors.exchange_rate && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-800 mb-2">Hesaplama Önizlemesi</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-blue-700">TRY Tutarı:</span>
                    <span className="font-medium text-blue-900">
                      {parseFloat(formData.amount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TRY
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700">Dolar Kuru:</span>
                    <span className="font-medium text-blue-900">
                      {parseFloat(formData.exchange_rate).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-blue-200 pt-2">
                    <span className="text-blue-700">USD Tutarı:</span>
                    <span className="font-bold text-blue-900">
                      {(parseFloat(formData.amount) / parseFloat(formData.exchange_rate)).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} USD
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700">İşlem Türü:</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTransactionTypeColor(formData.transaction_type)}`}>
                      {getTransactionTypeLabel(formData.transaction_type)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Açıklama */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Açıklama <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={3}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#00365a] focus:border-transparent ${
                  errors.description ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="İşlem açıklaması (örn: Halı alımı - Fatura No: FA-2024-015)"
                disabled={isLoading}
              />
              {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description}</p>}
            </div>

            {/* Referans Numarası */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Referans Numarası
              </label>
              <input
                type="text"
                value={formData.reference_number}
                onChange={(e) => handleInputChange('reference_number', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00365a] focus:border-transparent"
                placeholder="FA-2024-015"
                disabled={isLoading}
              />
            </div>
          </div>
        </form>
        
        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            disabled={isLoading}
          >
            İptal
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={isLoading}
            className="px-4 py-2 bg-[#00365a] text-white rounded-lg hover:bg-[#004170] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {isLoading && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            )}
            <span>Güncelle</span>
          </button>
        </div>
      </div>
    </div>
  );
}
