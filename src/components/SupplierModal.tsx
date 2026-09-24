'use client';

import React, { useState, useEffect } from 'react';
import { Supplier, CreateSupplierRequest, UpdateSupplierRequest } from '../services/api';
import { useAuth } from '@/app/context/AuthContext';

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
  const { isAdmin } = useAuth();
  const canSeeBalance = isAdmin;
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

    // Bakiye yalnızca admin tarafından gönderilir
    if (canSeeBalance && formData.balance && formData.balance !== '') {
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

  const inputClass = (hasError?: boolean) =>
    `w-full rounded-lg border bg-slate-50 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition-all duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/20 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:opacity-60 ${
      hasError
        ? 'border-red-300 hover:border-red-400'
        : 'border-slate-300 hover:border-slate-400'
    }`;

  return (
    <div className="fixed inset-0 z-50 flex min-h-screen items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div
        className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.08)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200/80 px-5 py-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">
              {supplier ? 'Satıcı Düzenle' : 'Yeni Satıcı'}
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              {supplier ? 'Satıcı bilgilerini güncelleyin' : 'Yeni satıcı bilgilerini girin'}
            </p>
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
            <div>
              <h4 className="mb-3 text-sm font-semibold text-slate-900">Temel Bilgiler</h4>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                    Satıcı Adı <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className={inputClass(!!errors.name)}
                    placeholder="Satıcı adını giriniz"
                    disabled={isLoading}
                  />
                  {errors.name && <p className="mt-1.5 text-xs text-red-600">{errors.name}</p>}
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                    Firma Adı <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.company_name}
                    onChange={(e) => handleInputChange('company_name', e.target.value)}
                    className={inputClass(!!errors.company_name)}
                    placeholder="Firma adını giriniz"
                    disabled={isLoading}
                  />
                  {errors.company_name && <p className="mt-1.5 text-xs text-red-600">{errors.company_name}</p>}
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                    Telefon
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    className={inputClass()}
                    placeholder="+90 212 555 0001"
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                  Adres
                </label>
                <textarea
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  rows={3}
                  className={inputClass()}
                  placeholder="Tam adres bilgisi"
                  disabled={isLoading}
                />
              </div>
            </div>

            {canSeeBalance && (
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                Bakiye (USD)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.balance}
                onChange={(e) => handleInputChange('balance', e.target.value)}
                onWheel={(e) => e.currentTarget.blur()}
                className={inputClass(!!errors.balance)}
                placeholder="0.00"
                disabled={isLoading}
              />
              {errors.balance && <p className="mt-1.5 text-xs text-red-600">{errors.balance}</p>}
            </div>
            )}

            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                Notlar
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                rows={3}
                className={inputClass()}
                placeholder="Satıcı hakkında notlar..."
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
            <span>{supplier ? 'Güncelle' : 'Kaydet'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
