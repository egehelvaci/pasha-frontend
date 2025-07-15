'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { 
  ProductRule, 
  getProductRule,
  updateProductRule,
  UpdateProductRuleData
} from '@/services/api';
import { useAuth } from '@/app/context/AuthContext';
import Link from 'next/link';

export default function EditProductRulePage() {
  const router = useRouter();
  const params = useParams();
  const ruleId = parseInt(params.ruleId as string);
  const { isAdmin, isLoading: authLoading } = useAuth();
  
  const [rule, setRule] = useState<ProductRule | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    canHaveFringe: false,
    isActive: true
  });
  
  const [formErrors, setFormErrors] = useState<{[key: string]: string}>({});

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.push('/dashboard');
      return;
    }
    
    if (!authLoading && isAdmin && ruleId) {
      fetchRule();
    }
  }, [isAdmin, authLoading, router, ruleId]);

  const fetchRule = async () => {
    try {
      setLoading(true);
      const ruleData = await getProductRule(ruleId);
      setRule(ruleData);
      setFormData({
        name: ruleData.name,
        description: ruleData.description,
        canHaveFringe: ruleData.canHaveFringe,
        isActive: ruleData.isActive
      });
    } catch (error: any) {
      setError(error.message || 'Kural yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
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

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      setSaveLoading(true);
      setError('');

      const updateData: UpdateProductRuleData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        canHaveFringe: formData.canHaveFringe,
        isActive: formData.isActive
      };

      await updateProductRule(ruleId, updateData);
      router.push(`/dashboard/urun-kurallari/${ruleId}`);
    } catch (error: any) {
      setError(error.message || 'Kural güncellenirken bir hata oluştu');
    } finally {
      setSaveLoading(false);
    }
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error && !rule) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <svg className="mx-auto h-12 w-12 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">Hata</h3>
          <p className="mt-1 text-sm text-gray-500">{error}</p>
          <div className="mt-6">
            <Link
              href="/dashboard/urun-kurallari"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              Geri Dön
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center space-x-4 mb-8">
          <Link
            href="/dashboard/urun-kurallari"
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
          >
            <svg className="mr-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Ürün Kuralları
          </Link>
          <span className="text-gray-500">/</span>
          <Link
            href={`/dashboard/urun-kurallari/${ruleId}`}
            className="text-gray-500 hover:text-gray-700"
          >
            {rule?.name}
          </Link>
          <span className="text-gray-500">/</span>
          <span className="text-gray-900 font-medium">Düzenle</span>
        </div>

        {/* Başlık */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Ürün Kuralını Düzenle</h1>
          <p className="text-gray-600 mt-2">Ürün kuralının temel bilgilerini güncelleyin.</p>
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

        {/* Bilgi Kutusu */}
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-md p-4">
          <div className="flex">
            <svg className="h-5 w-5 text-blue-400 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div className="text-sm text-blue-800">
              <p><strong>Not:</strong> Boyut seçenekleri ve kesim türleri düzenlemeleri için kural detay sayfasını kullanın.</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Temel Bilgiler */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-6">Temel Bilgiler</h2>
            
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

              <div className="space-y-4">
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

                <div>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Aktif Durum</span>
                  </label>
                  <p className="text-xs text-gray-500 mt-1">Pasif kurallar yeni ürünlerde kullanılamaz</p>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Açıklama *
              </label>
              <textarea
                id="description"
                rows={4}
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

          {/* Mevcut Durumlar */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Mevcut Ayarlar</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 border border-gray-200 rounded-md">
                <div className="text-2xl font-bold text-blue-600">{rule?.sizeOptions.length || 0}</div>
                <div className="text-sm text-gray-500">Boyut Seçeneği</div>
                <Link
                  href={`/dashboard/urun-kurallari/${ruleId}`}
                  className="text-xs text-blue-600 hover:text-blue-800 mt-1 inline-block"
                >
                  Yönet →
                </Link>
              </div>
              
              <div className="text-center p-4 border border-gray-200 rounded-md">
                <div className="text-2xl font-bold text-green-600">{rule?.cutTypes.length || 0}</div>
                <div className="text-sm text-gray-500">Kesim Türü</div>
                <Link
                  href={`/dashboard/urun-kurallari/${ruleId}`}
                  className="text-xs text-green-600 hover:text-green-800 mt-1 inline-block"
                >
                  Yönet →
                </Link>
              </div>
              
              <div className="text-center p-4 border border-gray-200 rounded-md">
                <div className="text-2xl font-bold text-purple-600">{rule?.productCount || 0}</div>
                <div className="text-sm text-gray-500">Kullanılan Ürün</div>
                {rule && rule.productCount && rule.productCount > 0 && (
                  <div className="text-xs text-purple-600 mt-1">Detay sayfasında görün</div>
                )}
              </div>
            </div>
          </div>

          {/* Form Butonları */}
          <div className="flex justify-end space-x-4">
            <Link
              href={`/dashboard/urun-kurallari/${ruleId}`}
              className="px-6 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              İptal
            </Link>
            <button
              type="submit"
              disabled={saveLoading}
              className="px-6 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
            >
              {saveLoading ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 