'use client';

import React, { useState, useEffect } from 'react';
import { PurchasePriceList, CreatePurchasePriceListRequest } from '../services/api';

interface PurchasePriceListModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CreatePurchasePriceListRequest) => Promise<void>;
  priceList?: PurchasePriceList | null;
  isLoading?: boolean;
}

export default function PurchasePriceListModal({ 
  isOpen, 
  onClose, 
  onSave, 
  priceList, 
  isLoading = false 
}: PurchasePriceListModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    currency: 'USD'
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

  // Form verilerini temizle ve priceList verisi varsa doldur
  useEffect(() => {
    if (isOpen) {
      if (priceList) {
        setFormData({
          name: priceList.name || '',
          description: priceList.description || '',
          currency: priceList.currency || 'USD'
        });
      } else {
        setFormData({
          name: '',
          description: '',
          currency: 'USD'
        });
      }
      setErrors({});
    }
  }, [isOpen, priceList]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Liste adı zorunludur';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const submitData: CreatePurchasePriceListRequest = {
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      currency: formData.currency,
      collectionPrices: [] // Boş başlat, sonra koleksiyon fiyatları eklenebilir
    };

    try {
      await onSave(submitData);
      onClose();
    } catch (error) {
      console.error('Fiyat listesi kaydetme hatası:', error);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Hata mesajını temizle
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  if (!isOpen) return null;

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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white">
              {priceList ? 'Fiyat Listesi Düzenle' : 'Yeni Fiyat Listesi'}
            </h3>
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
            {/* Temel Bilgiler */}
            <div>
              <h4 className="text-lg font-medium text-gray-900 mb-4">Temel Bilgiler</h4>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Liste Adı <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#00365a] focus:border-transparent ${
                      errors.name ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Fiyat listesi adını giriniz"
                    disabled={isLoading}
                  />
                  {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Para Birimi
                  </label>
                  <select
                    value={formData.currency}
                    onChange={(e) => handleInputChange('currency', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00365a] focus:border-transparent"
                    disabled={isLoading}
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="TRY">TRY</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Açıklama
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00365a] focus:border-transparent"
                    placeholder="Fiyat listesi açıklaması..."
                    disabled={isLoading}
                  />
                </div>
              </div>
            </div>

            {/* Bilgi Kutusu */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">Bilgi:</p>
                  <p className="text-xs">
                    Fiyat listesi oluşturulduktan sonra koleksiyon fiyatları ayrıca eklenebilir.
                  </p>
                </div>
              </div>
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
            <span>{priceList ? 'Güncelle' : 'Kaydet'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
