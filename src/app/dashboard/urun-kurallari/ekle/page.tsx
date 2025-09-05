'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CreateProductRuleData, createProductRule, CutType, getCutTypes } from '@/services/api';
import { useAuth } from '@/app/context/AuthContext';
import Link from 'next/link';

interface SizeOptionForm {
  width: number;
  height: number;
  isOptionalHeight: boolean;
}

export default function AddProductRulePage() {
  const router = useRouter();
  const { isAdmin, isLoading: authLoading } = useAuth();
  const [cutTypes, setCutTypes] = useState<CutType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    canHaveFringe: false
  });
  
  const [sizeOptions, setSizeOptions] = useState<SizeOptionForm[]>([
    { width: 0, height: 0, isOptionalHeight: false }
  ]);
  
  const [selectedCutTypeIds, setSelectedCutTypeIds] = useState<number[]>([]);
  
  const [formErrors, setFormErrors] = useState<{[key: string]: string}>({});

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.push('/dashboard');
      return;
    }
    
    if (!authLoading && isAdmin) {
      fetchCutTypes();
    }
  }, [isAdmin, authLoading, router]);

  const fetchCutTypes = async () => {
    try {
      const data = await getCutTypes();
      setCutTypes(data);
    } catch (error) {
      console.error('Kesim türleri getirme hatası:', error);
    }
  };

  const validateForm = (): boolean => {
    const errors: {[key: string]: string} = {};

    if (!formData.name.trim()) {
      errors.name = 'Kural adı zorunludur';
    }

    if (!formData.description.trim()) {
      errors.description = 'Açıklama zorunludur';
    }

    // Boyut seçenekleri kontrolü
    const validSizeOptions = sizeOptions.filter(option => option.width > 0 && option.height > 0);
    if (validSizeOptions.length === 0) {
      errors.sizeOptions = 'En az bir geçerli boyut seçeneği eklemelisiniz';
    }

    // Kesim türü kontrolü
    if (selectedCutTypeIds.length === 0) {
      errors.cutTypes = 'En az bir kesim türü seçmelisiniz';
    }

    // Boyut seçenekleri validasyonu
    sizeOptions.forEach((option, index) => {
      if (option.width > 0 || option.height > 0) {
        if (option.width <= 0) {
          errors[`sizeOption_width_${index}`] = 'Genişlik 0\'dan büyük olmalı';
        }
        if (option.height <= 0) {
          errors[`sizeOption_height_${index}`] = 'Boy 0\'dan büyük olmalı';
        }
      }
    });

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      setError('');

      const validSizeOptions = sizeOptions.filter(option => option.width > 0 && option.height > 0);

      const createData: CreateProductRuleData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        canHaveFringe: formData.canHaveFringe,
        sizeOptions: validSizeOptions,
        cutTypeIds: selectedCutTypeIds
      };

      await createProductRule(createData);
      router.push('/dashboard/urun-kurallari');
    } catch (error: any) {
      setError(error.message || 'Kural oluşturulurken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const addSizeOption = () => {
    setSizeOptions([...sizeOptions, { width: 0, height: 0, isOptionalHeight: false }]);
  };

  const removeSizeOption = (index: number) => {
    if (sizeOptions.length > 1) {
      setSizeOptions(sizeOptions.filter((_, i) => i !== index));
    }
  };

  const updateSizeOption = (index: number, field: keyof SizeOptionForm, value: number | boolean) => {
    const updatedOptions = [...sizeOptions];
    updatedOptions[index] = { ...updatedOptions[index], [field]: value };
    setSizeOptions(updatedOptions);
  };

  const handleCutTypeToggle = (cutTypeId: number) => {
    setSelectedCutTypeIds(prev => 
      prev.includes(cutTypeId) 
        ? prev.filter(id => id !== cutTypeId)
        : [...prev, cutTypeId]
    );
  };

  // Loading state
  if (authLoading) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-[#00365a]"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <svg className="w-6 h-6 text-[#00365a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900">Yetkilendirme Kontrol Ediliyor</h3>
              <p className="text-sm text-gray-500 mt-1">Lütfen bekleyiniz...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Admin kontrolü
  if (!isAdmin) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center max-w-md">
          <div className="w-20 h-20 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="h-10 w-10 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-3">Erişim Reddedildi</h3>
          <p className="text-gray-600 mb-8 leading-relaxed">Bu sayfaya erişim yetkiniz bulunmamaktadır. Ürün kuralları yönetimi sadece admin kullanıcılar tarafından kullanılabilir.</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#00365a] hover:bg-[#004170] text-white rounded-lg font-semibold transition-all shadow-md hover:shadow-lg"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
            </svg>
            Dashboard'a Dön
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Link
              href="/dashboard/urun-kurallari"
              className="inline-flex items-center gap-2 text-[#00365a] hover:text-[#004170] font-medium px-3 py-2 rounded-lg hover:bg-white transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Ürün Kuralları
            </Link>
            <span className="text-gray-400">/</span>
            <span className="text-gray-600 font-medium">Yeni Kural Ekle</span>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h1 className="text-3xl font-bold text-[#00365a] flex items-center">
              <svg className="w-8 h-8 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Yeni Ürün Kuralı Ekle
            </h1>
            <p className="text-gray-600 mt-2">Yeni bir ürün kuralı oluşturun ve boyut seçenekleri ile kesim türlerini atayın</p>
          </div>
        </div>

        {/* Global Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-start">
              <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center mr-3 flex-shrink-0">
                <svg className="h-5 w-5 text-red-600" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h4 className="text-red-800 font-semibold mb-1">Hata Oluştu</h4>
                <div className="text-sm text-red-700">{error}</div>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* 📋 Temel Bilgiler */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-[#00365a] text-white px-6 py-4">
              <div className="flex items-center">
                <div className="bg-white bg-opacity-20 rounded-lg p-2 mr-3">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h2 className="text-lg font-semibold">📋 Temel Bilgiler</h2>
              </div>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-2">
                    Kural Adı *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className={`w-full pl-10 pr-3 py-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#00365a] focus:border-transparent transition-all ${
                        formErrors.name ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Örn: Standart Halı Kuralları"
                    />
                    <svg className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                  </div>
                  {formErrors.name && (
                    <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {formErrors.name}
                    </p>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.canHaveFringe}
                        onChange={(e) => setFormData({ ...formData, canHaveFringe: e.target.checked })}
                        className="w-5 h-5 text-[#00365a] border-gray-300 rounded focus:ring-[#00365a] focus:ring-2"
                      />
                      <div>
                        <span className="text-sm font-semibold text-blue-800">Saçak Desteği</span>
                        <p className="text-xs text-blue-600 mt-1">Bu kurala sahip ürünler saçak seçeneğine sahip olabilir</p>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <label htmlFor="description" className="block text-sm font-semibold text-gray-700 mb-2">
                  Açıklama *
                </label>
                <div className="relative">
                  <textarea
                    id="description"
                    rows={4}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className={`w-full pl-10 pr-3 py-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#00365a] focus:border-transparent transition-all resize-none ${
                      formErrors.description ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Kuralın ne için kullanıldığını açıklayın..."
                  />
                  <svg className="w-5 h-5 absolute left-3 top-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                {formErrors.description && (
                  <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {formErrors.description}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* 📏 Boyut Seçenekleri */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-green-600 text-white px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="bg-white bg-opacity-20 rounded-lg p-2 mr-3">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">📏 Boyut Seçenekleri</h2>
                    <p className="text-green-100 text-sm">Ürünler için mevcut boyut seçeneklerini belirleyin</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={addSizeOption}
                  className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-4 py-2 rounded-lg font-semibold transition-all flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Boyut Ekle
                </button>
              </div>
            </div>

            <div className="p-6">
              {formErrors.sizeOptions && (
                <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-red-800">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {formErrors.sizeOptions}
                  </div>
                </div>
              )}

              <div className="space-y-4">
                {sizeOptions.map((option, index) => (
                  <div key={index} className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-semibold text-gray-900">Boyut Seçeneği #{index + 1}</h4>
                      {sizeOptions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeSizeOption(index)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-all"
                          title="Bu boyut seçeneğini sil"
                        >
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Genişlik (cm) *
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            value={option.width || ''}
                            onChange={(e) => updateSizeOption(index, 'width', parseInt(e.target.value) || 0)}
                            className={`w-full pl-10 pr-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all ${
                              formErrors[`sizeOption_width_${index}`] ? 'border-red-300' : 'border-gray-300'
                            }`}
                            placeholder="100"
                          />
                          <svg className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4" />
                          </svg>
                        </div>
                        {formErrors[`sizeOption_width_${index}`] && (
                          <p className="mt-1 text-xs text-red-600">{formErrors[`sizeOption_width_${index}`]}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Boy (cm) *
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            value={option.height || ''}
                            onChange={(e) => updateSizeOption(index, 'height', parseInt(e.target.value) || 0)}
                            className={`w-full pl-10 pr-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all ${
                              formErrors[`sizeOption_height_${index}`] ? 'border-red-300' : 'border-gray-300'
                            }`}
                            placeholder="150"
                          />
                          <svg className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4" />
                          </svg>
                        </div>
                        {formErrors[`sizeOption_height_${index}`] && (
                          <p className="mt-1 text-xs text-red-600">{formErrors[`sizeOption_height_${index}`]}</p>
                        )}
                      </div>

                      <div className="flex items-center">
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 w-full">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={option.isOptionalHeight}
                              onChange={(e) => updateSizeOption(index, 'isOptionalHeight', e.target.checked)}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <span className="text-sm text-blue-800 font-medium">Boy İsteğe Bağlı</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ✂️ Kesim Türleri */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-purple-600 text-white px-6 py-4">
              <div className="flex items-center">
                <div className="bg-white bg-opacity-20 rounded-lg p-2 mr-3">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-semibold">✂️ Kesim Türleri</h2>
                  <p className="text-purple-100 text-sm">Bu kurala uygulanabilecek kesim türlerini seçin</p>
                </div>
              </div>
            </div>

            <div className="p-6">
              {formErrors.cutTypes && (
                <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-red-800">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {formErrors.cutTypes}
                  </div>
                </div>
              )}

              {cutTypes.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Kesim Türü Bulunamadı</h3>
                  <p className="text-gray-600">Henüz sisteme kesim türü eklenmemiş. Sistem yöneticisine başvurun.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {cutTypes.map((cutType) => (
                    <label 
                      key={cutType.id} 
                      className="group relative bg-gray-50 hover:bg-purple-50 border border-gray-200 hover:border-purple-300 rounded-lg p-4 cursor-pointer transition-all duration-200"
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={selectedCutTypeIds.includes(cutType.id)}
                          onChange={() => handleCutTypeToggle(cutType.id)}
                          className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500 focus:ring-2"
                        />
                        <div className="flex-1">
                          <span className="text-sm font-medium text-gray-900 group-hover:text-purple-900">
                            {cutType.name}
                          </span>
                        </div>
                      </div>
                      {selectedCutTypeIds.includes(cutType.id) && (
                        <div className="absolute top-2 right-2">
                          <div className="w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center">
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        </div>
                      )}
                    </label>
                  ))}
                </div>
              )}

              {selectedCutTypeIds.length > 0 && (
                <div className="mt-6 bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-purple-800">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-semibold">{selectedCutTypeIds.length} kesim türü seçildi</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Form Actions */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex flex-col sm:flex-row justify-end gap-4">
              <Link
                href="/dashboard/urun-kurallari"
                className="order-2 sm:order-1 px-6 py-3 border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 rounded-lg font-semibold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                İptal
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="order-1 sm:order-2 px-8 py-3 bg-[#00365a] hover:bg-[#004170] text-white rounded-lg font-semibold transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Oluşturuluyor...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Kuralı Oluştur
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
} 