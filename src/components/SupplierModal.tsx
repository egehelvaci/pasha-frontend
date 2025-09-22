'use client';

import React, { useState, useEffect } from 'react';
import { Supplier, CreateSupplierRequest, UpdateSupplierRequest } from '../services/api';

interface SupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CreateSupplierRequest | UpdateSupplierRequest) => Promise<void>;
  supplier?: Supplier | null;
  isLoading?: boolean;
}

export default function SupplierModal({ 
  isOpen, 
  onClose, 
  onSave, 
  supplier, 
  isLoading = false 
}: SupplierModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    company_name: '',
    phone: '',
    address: '',
    notes: '',
    balance: ''
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

  // Form verilerini temizle ve supplier verisi varsa doldur
  useEffect(() => {
    if (isOpen) {
      if (supplier) {
        setFormData({
          name: supplier.name || '',
          company_name: supplier.company_name || '',
          phone: supplier.phone || '',
          address: supplier.address || '',
          notes: supplier.notes || '',
          balance: supplier.balance?.toString() || ''
        });
      } else {
        setFormData({
          name: '',
          company_name: '',
          phone: '',
          address: '',
          notes: '',
          balance: ''
        });
      }
      setErrors({});
    }
  }, [isOpen, supplier]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Satıcı adı zorunludur';
    }

    if (!formData.company_name.trim()) {
      newErrors.company_name = 'Firma adı zorunludur';
    }

    if (formData.balance && formData.balance !== '') {
      const balance = parseFloat(formData.balance);
      if (isNaN(balance)) {
        newErrors.balance = 'Geçerli bir bakiye giriniz';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const submitData: CreateSupplierRequest | UpdateSupplierRequest = {
      name: formData.name.trim(),
      company_name: formData.company_name.trim(),
      phone: formData.phone.trim() || undefined,
      address: formData.address.trim() || undefined,
      notes: formData.notes.trim() || undefined,
      currency: 'USD' // Sabit USD
    };

    // Bakiye varsa ekle
    if (formData.balance && formData.balance !== '') {
      submitData.balance = parseFloat(formData.balance);
    }

    try {
      await onSave(submitData);
      onClose();
    } catch (error) {
      console.error('Satıcı kaydetme hatası:', error);
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
        className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-[#00365a] to-[#004170]">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center text-white text-lg font-bold">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white">
              {supplier ? 'Satıcı Düzenle' : 'Yeni Satıcı'}
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Satıcı Adı <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#00365a] focus:border-transparent ${
                      errors.name ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Satıcı adını giriniz"
                    disabled={isLoading}
                  />
                  {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Firma Adı <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.company_name}
                    onChange={(e) => handleInputChange('company_name', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#00365a] focus:border-transparent ${
                      errors.company_name ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Firma adını giriniz"
                    disabled={isLoading}
                  />
                  {errors.company_name && <p className="mt-1 text-sm text-red-600">{errors.company_name}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Telefon
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00365a] focus:border-transparent"
                    placeholder="+90 212 555 0001"
                    disabled={isLoading}
                  />
                </div>

              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Adres
                </label>
                <textarea
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00365a] focus:border-transparent"
                  placeholder="Tam adres bilgisi"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Bakiye Bilgileri */}
            <div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bakiye (USD)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.balance}
                  onChange={(e) => handleInputChange('balance', e.target.value)}
                  onWheel={(e) => e.currentTarget.blur()}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#00365a] focus:border-transparent ${
                    errors.balance ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="0.00"
                  disabled={isLoading}
                />
                {errors.balance && <p className="mt-1 text-sm text-red-600">{errors.balance}</p>}
              </div>
            </div>

            {/* Notlar */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notlar
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00365a] focus:border-transparent"
                placeholder="Satıcı hakkında notlar..."
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
            <span>{supplier ? 'Güncelle' : 'Kaydet'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
