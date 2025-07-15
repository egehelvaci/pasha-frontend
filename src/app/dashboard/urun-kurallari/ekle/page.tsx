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
          errors[`sizeOption_height_${index}`] = 'Yükseklik 0\'dan büyük olmalı';
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

  // Admin kontrolü
  if (!authLoading && !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <svg className="mx-auto h-12 w-12 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">Erişim Reddedildi</h3>
          <p className="mt-1 text-sm text-gray-500">Bu sayfaya erişim yetkiniz bulunmamaktadır.</p>
          <div className="mt-6">
            <button
              onClick={() => router.push('/dashboard')}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Dashboard'a Dön
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Başlık */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <Link
              href="/dashboard/urun-kurallari"
              className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
            >
              <svg className="mr-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Ürün Kuralları
            </Link>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Yeni Ürün Kuralı Ekle</h1>
          <p className="text-gray-600 mt-2">Yeni bir ürün kuralı oluşturun ve boyut seçenekleri ile kesim türlerini atayın.</p>
        </div>

        {/* Hata Mesajı */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <svg className="h-5 w-5 text-red-400 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <div className="text-sm text-red-800">{error}</div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Temel Bilgiler */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Temel Bilgiler</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Kural Adı *
                </label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    formErrors.name ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Örn: Standart Halı Kuralları"
                />
                {formErrors.name && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.name}</p>
                )}
              </div>

              <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.canHaveFringe}
                    onChange={(e) => setFormData({ ...formData, canHaveFringe: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Saçak Desteği</span>
                </label>
                <p className="text-xs text-gray-500 mt-1">Bu kurala sahip ürünler saçak seçeneğine sahip olabilir</p>
              </div>
            </div>

            <div className="mt-6">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Açıklama *
              </label>
              <textarea
                id="description"
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  formErrors.description ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Kuralın ne için kullanıldığını açıklayın..."
              />
              {formErrors.description && (
                <p className="mt-1 text-sm text-red-600">{formErrors.description}</p>
              )}
            </div>
          </div>

          {/* Boyut Seçenekleri */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-medium text-gray-900">Boyut Seçenekleri</h2>
                <p className="text-sm text-gray-500">Ürünler için mevcut boyut seçeneklerini belirleyin</p>
              </div>
              <button
                type="button"
                onClick={addSizeOption}
                className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <svg className="mr-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Boyut Ekle
              </button>
            </div>

            {formErrors.sizeOptions && (
              <div className="mb-4 text-sm text-red-600">{formErrors.sizeOptions}</div>
            )}

            <div className="space-y-4">
              {sizeOptions.map((option, index) => (
                <div key={index} className="flex items-center space-x-4 p-4 border border-gray-200 rounded-md">
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Genişlik (cm)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={option.width || ''}
                        onChange={(e) => updateSizeOption(index, 'width', parseInt(e.target.value) || 0)}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          formErrors[`sizeOption_width_${index}`] ? 'border-red-300' : 'border-gray-300'
                        }`}
                        placeholder="100"
                      />
                      {formErrors[`sizeOption_width_${index}`] && (
                        <p className="mt-1 text-xs text-red-600">{formErrors[`sizeOption_width_${index}`]}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Yükseklik (cm)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={option.height || ''}
                        onChange={(e) => updateSizeOption(index, 'height', parseInt(e.target.value) || 0)}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          formErrors[`sizeOption_height_${index}`] ? 'border-red-300' : 'border-gray-300'
                        }`}
                        placeholder="150"
                      />
                      {formErrors[`sizeOption_height_${index}`] && (
                        <p className="mt-1 text-xs text-red-600">{formErrors[`sizeOption_height_${index}`]}</p>
                      )}
                    </div>

                    <div className="flex items-center">
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={option.isOptionalHeight}
                          onChange={(e) => updateSizeOption(index, 'isOptionalHeight', e.target.checked)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">Yükseklik İsteğe Bağlı</span>
                      </label>
                    </div>
                  </div>

                  {sizeOptions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeSizeOption(index)}
                      className="text-red-600 hover:text-red-800 p-1"
                    >
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Kesim Türleri */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="mb-4">
              <h2 className="text-lg font-medium text-gray-900">Kesim Türleri</h2>
              <p className="text-sm text-gray-500">Bu kurala uygulanabilecek kesim türlerini seçin</p>
            </div>

            {formErrors.cutTypes && (
              <div className="mb-4 text-sm text-red-600">{formErrors.cutTypes}</div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {cutTypes.map((cutType) => (
                <label key={cutType.id} className="flex items-center space-x-2 p-3 border border-gray-200 rounded-md hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedCutTypeIds.includes(cutType.id)}
                    onChange={() => handleCutTypeToggle(cutType.id)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{cutType.name}</span>
                </label>
              ))}
            </div>

            {cutTypes.length === 0 && (
              <div className="text-center py-8">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">Kesim türü bulunamadı</h3>
                <p className="mt-1 text-sm text-gray-500">Önce kesim türleri oluşturmalısınız.</p>
                <div className="mt-4">
                  <Link
                    href="/dashboard/urun-kurallari/kesim-turleri"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    Kesim Türleri Yönetimi
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Form Butonları */}
          <div className="flex justify-end space-x-4">
            <Link
              href="/dashboard/urun-kurallari"
              className="px-6 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              İptal
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? 'Oluşturuluyor...' : 'Kuralı Oluştur'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 