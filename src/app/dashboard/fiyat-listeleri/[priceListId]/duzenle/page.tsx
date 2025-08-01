'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PriceList, CreatePriceListData, getPriceLists, updatePriceList } from '@/services/api';
import { useAuth } from '@/app/context/AuthContext';
import type { Collection } from '@/services/api';
import { useToken } from '@/app/hooks/useToken';

// Form için değerlerin tipini tanımla
interface FormValues {
  name: string;
  description: string;
  validFrom: string;
  validTo: string;
  limitAmount?: number;
  currency: string;
  isActive: boolean;
  collectionPrices: Record<string, number>;
  adjustmentType: 'increase' | 'decrease';
  adjustmentRate?: number;
}

// API yanıt tipi
interface PriceListDetailItem {
  price_list_detail_id: string;
  price_list_id: string;
  collection_id: string;
  price_per_square_meter: number;
  created_at: string;
  updated_at: string;
  Collection: {
    collectionId: string;
    name: string;
    code: string;
    description: string;
  }
}

interface PriceListDetailResponse {
  success: boolean;
  data: {
    price_list: {
      price_list_id: string;
      name: string;
      description: string;
      is_default: boolean;
      valid_from: string | null;
      valid_to: string | null;
      limit_amount: string | null;
      currency: string;
      is_active: boolean;
      created_at: string;
      updated_at: string;
    };
    collection_prices: {
      price_list_detail_id: string;
      collection_id: string;
      collection_name: string;
      collection_code: string;
      price_per_square_meter: string;
    }[];
  }
}

export default function EditPriceListPage() {
  const router = useRouter();
  const params = useParams();
  const { isAdmin } = useAuth();
  const token = useToken();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [priceList, setPriceList] = useState<PriceList | null>(null);
  const [formData, setFormData] = useState<FormValues>({
    name: '',
    description: '',
    validFrom: '',
    validTo: '',
    limitAmount: undefined,
    currency: 'TRY',
    isActive: true,
    collectionPrices: {},
    adjustmentType: 'increase',
    adjustmentRate: undefined,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // API çağrısını takip etmek için ref oluştur
  const priceListsFetchedRef = useRef(false);
  // Kod yeniden yüklendiğinde temiz bir başlangıç yapılması için
  const isInitializedRef = useRef(false);

  useEffect(() => {
    // İlk render'da tüm bağlantıları temizle ve yeniden başlat
    isInitializedRef.current = true;
    
    // Temizleme fonksiyonu
    return () => {
      isInitializedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!isAdmin) {
      router.push('/dashboard');
      return;
    }
    
    if (!priceListsFetchedRef.current) {
      priceListsFetchedRef.current = true;
      fetchData();
    }
  }, [isAdmin, router]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = 'Liste adı gereklidir';
    if (!formData.description.trim()) newErrors.description = 'Açıklama gereklidir';
    if (!formData.currency) newErrors.currency = 'Para birimi gereklidir';

    // Tarih validasyonu
    if (formData.validFrom && formData.validTo) {
      const fromDate = new Date(formData.validFrom);
      const toDate = new Date(formData.validTo);
      if (fromDate >= toDate) {
        newErrors.validTo = 'Bitiş tarihi başlangıç tarihinden sonra olmalıdır';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof FormValues, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleCollectionPriceChange = (collectionId: string, value: number) => {
    setFormData(prev => ({
      ...prev,
      collectionPrices: {
        ...prev.collectionPrices,
        [collectionId]: value
      }
    }));
  };

  // Zam/indirim uygulama fonksiyonu
  const applyAdjustment = () => {
    if (!formData.adjustmentRate || formData.adjustmentRate <= 0) {
      alert('Lütfen geçerli bir oran giriniz');
      return;
    }
    
    const updatedPrices: Record<string, number> = {};
    
    Object.entries(formData.collectionPrices).forEach(([collectionId, price]) => {
      if (price && typeof price === 'number' && price > 0) {
        const multiplier = formData.adjustmentType === 'increase' 
          ? (1 + formData.adjustmentRate! / 100) 
          : (1 - formData.adjustmentRate! / 100);
        updatedPrices[collectionId] = Math.round(Number(price) * multiplier * 100) / 100;
      }
    });
    
    setFormData(prev => ({ ...prev, collectionPrices: updatedPrices }));
    alert(`%${formData.adjustmentRate} ${formData.adjustmentType === 'increase' ? 'zam' : 'indirim'} uygulandı`);
  };

  const fetchData = async () => {
    setLoadingData(true);
    try {
      // Koleksiyonları getir
      const collectionsResponse = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'https://pashahomeapps.up.railway.app'}/api/collections/`);
      const collectionsData = await collectionsResponse.json();
      setCollections(collectionsData.data || []);

      // Fiyat listesini getir
      const priceLists = await getPriceLists();
      const currentPriceList = priceLists.find(p => p.price_list_id === params.priceListId);
      
      if (!currentPriceList) {
        alert('Fiyat listesi bulunamadı');
        router.push('/dashboard/fiyat-listeleri');
        return;
      }

      setPriceList(currentPriceList);

      // Doğrudan fiyat listesi detaylarını getir
      try {
        const authToken = token;
        const detailResponse = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'https://pashahomeapps.up.railway.app'}/api/price-lists/${params.priceListId}`, {
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        });
        const detailData = await detailResponse.json() as PriceListDetailResponse;
        
        if (detailData.success) {
          // Koleksiyon fiyatlarını doldur
          const collectionPrices: Record<string, number> = {};
          
          // API'den gelen koleksiyon fiyatlarını doldur
          detailData.data.collection_prices?.forEach((detail) => {
            collectionPrices[detail.collection_id] = Number(detail.price_per_square_meter);
          });
          
          // Form verilerini güncelle
          setFormData({
            name: detailData.data.price_list.name,
            description: detailData.data.price_list.description,
            validFrom: detailData.data.price_list.valid_from ? 
              new Date(detailData.data.price_list.valid_from).toISOString().split('T')[0] : '',
            validTo: detailData.data.price_list.valid_to ? 
              new Date(detailData.data.price_list.valid_to).toISOString().split('T')[0] : '',
            limitAmount: detailData.data.price_list.limit_amount ? Number(detailData.data.price_list.limit_amount) : undefined,
            currency: detailData.data.price_list.currency,
            isActive: detailData.data.price_list.is_active,
            collectionPrices,
            adjustmentType: 'increase',
            adjustmentRate: undefined,
          });
        }
      } catch (error) {
        console.error('Fiyat listesi detayı getirilemedi:', error);
        
        // Detay getirilemezse ana fiyat listesi verilerini kullan
        setFormData({
          name: currentPriceList.name,
          description: currentPriceList.description,
          validFrom: currentPriceList.valid_from ? 
            new Date(currentPriceList.valid_from).toISOString().split('T')[0] : '',
          validTo: currentPriceList.valid_to ? 
            new Date(currentPriceList.valid_to).toISOString().split('T')[0] : '',
                     limitAmount: currentPriceList.limit_amount ?? undefined,
          currency: currentPriceList.currency,
          isActive: currentPriceList.is_active,
          collectionPrices: {},
          adjustmentType: 'increase',
          adjustmentRate: undefined,
        });
      }
    } catch (error) {
      alert('Veriler yüklenirken bir hata oluştu');
    } finally {
      setLoadingData(false);
    }
  };

  const onFinish = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!priceList || !validateForm()) return;

    // Sadece değer girilmiş olan koleksiyon fiyatlarını dahil et
    const collectionPrices = Object.entries(formData.collectionPrices || {})
      .filter(([_, price]) => price !== undefined && price !== null && price > 0)
      .map(([collectionId, price]) => ({
        collectionId,
        pricePerSquareMeter: Number(price),
      }));
      
    // Tarihler için saat bilgisini ayarla 
    const validFrom = formData.validFrom ? new Date(formData.validFrom + 'T00:00:00').toISOString() : undefined;
    const validTo = formData.validTo ? new Date(formData.validTo + 'T23:59:59').toISOString() : undefined;

    const data: CreatePriceListData = {
      name: formData.name,
      description: formData.description,
      validFrom,
      validTo,
      limitAmount: formData.limitAmount,
      currency: formData.currency,
      is_active: formData.isActive,
      collectionPrices,
    };

    setLoading(true);
    try {
      await updatePriceList(priceList.price_list_id, data);
      alert('Fiyat listesi başarıyla güncellendi');
      router.push('/dashboard/fiyat-listeleri');
    } catch (error: any) {
      alert(error.message || 'Fiyat listesi güncellenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

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
          <p className="text-gray-600 mb-8 leading-relaxed">Bu sayfaya erişim yetkiniz bulunmamaktadır.</p>
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
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => router.push('/dashboard/fiyat-listeleri')}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
              </svg>
            </button>
            <div>
              <h1 className="text-3xl font-bold text-[#00365a] flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mr-3" viewBox="0 0 20 20" fill="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
                Fiyat Listesi Düzenle
              </h1>
              <p className="text-gray-600 mt-2">Fiyat listesi bilgilerini güncelleyin</p>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loadingData ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12">
            <div className="flex flex-col items-center justify-center">
              <div className="relative">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-[#00365a]"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg className="w-6 h-6 text-[#00365a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
              </div>
              <div className="text-center mt-4">
                <h3 className="text-lg font-semibold text-gray-900">Fiyat Listesi Yükleniyor</h3>
                <p className="text-sm text-gray-500 mt-1">Lütfen bekleyiniz...</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Form Header */}
            <div className="px-6 py-4 border-b border-gray-200 bg-[#00365a]">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  <h3 className="text-lg font-semibold text-white">Fiyat Listesi Güncelle</h3>
                </div>
                {priceList?.is_default && (
                  <span className="inline-flex px-3 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                    Varsayılan
                  </span>
                )}
              </div>
            </div>

            <form onSubmit={onFinish} className="p-6">
              <div className="space-y-8">
                {/* Temel Bilgiler */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-[#00365a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Temel Bilgiler
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-3">
                        <span className="text-red-500">*</span> Liste Adı
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        disabled={priceList?.is_default}
                        className={`w-full px-4 py-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#00365a] focus:border-transparent transition-all ${priceList?.is_default ? 'bg-gray-100 cursor-not-allowed' : ''} ${errors.name ? 'border-red-300' : 'border-gray-300'}`}
                        placeholder="Örn: 2024 Bahar Koleksiyonu"
                      />
                      {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-3">
                        <span className="text-red-500">*</span> Açıklama
                      </label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => handleInputChange('description', e.target.value)}
                        disabled={priceList?.is_default}
                        rows={3}
                        className={`w-full px-4 py-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#00365a] focus:border-transparent transition-all resize-none ${priceList?.is_default ? 'bg-gray-100 cursor-not-allowed' : ''} ${errors.description ? 'border-red-300' : 'border-gray-300'}`}
                        placeholder="Fiyat listesi hakkında açıklama..."
                      />
                      {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-3">
                        Başlangıç Tarihi
                      </label>
                      <input
                        type="date"
                        value={formData.validFrom}
                        onChange={(e) => handleInputChange('validFrom', e.target.value)}
                        disabled={priceList?.is_default}
                        className={`w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#00365a] focus:border-transparent transition-all ${priceList?.is_default ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-3">
                        Bitiş Tarihi
                      </label>
                      <input
                        type="date"
                        value={formData.validTo}
                        onChange={(e) => handleInputChange('validTo', e.target.value)}
                  disabled={priceList?.is_default}
                        className={`w-full px-4 py-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#00365a] focus:border-transparent transition-all ${priceList?.is_default ? 'bg-gray-100 cursor-not-allowed' : ''} ${errors.validTo ? 'border-red-300' : 'border-gray-300'}`}
                      />
                      {errors.validTo && <p className="mt-1 text-sm text-red-600">{errors.validTo}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-3">
                        <span className="text-red-500">*</span> Para Birimi
                      </label>
                      <select
                        value={formData.currency}
                        onChange={(e) => handleInputChange('currency', e.target.value)}
                        disabled={priceList?.is_default}
                        className={`w-full px-4 py-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#00365a] focus:border-transparent transition-all ${priceList?.is_default ? 'bg-gray-100 cursor-not-allowed' : ''} ${errors.currency ? 'border-red-300' : 'border-gray-300'}`}
                      >
                        <option value="TRY">TRY</option>
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                      </select>
                      {errors.currency && <p className="mt-1 text-sm text-red-600">{errors.currency}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-3">
                        Limit Tutarı
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.limitAmount || ''}
                        onChange={(e) => handleInputChange('limitAmount', parseFloat(e.target.value) || undefined)}
                        disabled={priceList?.is_default}
                        className={`w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#00365a] focus:border-transparent transition-all ${priceList?.is_default ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                        placeholder="0.00"
                      />
                      <p className="mt-1 text-xs text-gray-500">Boş bırakılırsa limitsiz olur</p>
                    </div>

              {!priceList?.is_default && (
                      <div className="md:col-span-2">
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            id="isActive"
                            checked={formData.isActive}
                            onChange={(e) => handleInputChange('isActive', e.target.checked)}
                            className="h-4 w-4 text-[#00365a] focus:ring-[#00365a] border-gray-300 rounded"
                          />
                          <label htmlFor="isActive" className="ml-3 text-sm font-semibold text-gray-700">
                            Aktif
                          </label>
                        </div>
                        <p className="mt-1 text-xs text-gray-500">Fiyat listesinin aktif olup olmadığını belirtir</p>
                      </div>
                    )}
                  </div>
                </div>

              {/* Zam/İndirim Bölümü */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-[#00365a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Toplu Fiyat Güncelleme
                  </h4>
                  <div className="bg-green-50 border border-green-200 rounded-xl p-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-3">
                          İşlem Tipi
                        </label>
                        <select
                          value={formData.adjustmentType}
                          onChange={(e) => handleInputChange('adjustmentType', e.target.value as 'increase' | 'decrease')}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                        >
                          <option value="increase">Zam</option>
                          <option value="decrease">İndirim</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-3">
                          Oran (%)
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={formData.adjustmentRate || ''}
                          onChange={(e) => handleInputChange('adjustmentRate', parseFloat(e.target.value) || undefined)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                        placeholder="Örn: 10"
                      />
                      </div>
                    
                      <button 
                        type="button"
                      onClick={applyAdjustment}
                        className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-all shadow-md hover:shadow-lg"
                    >
                      Uygula
                      </button>
                  </div>
                    <p className="text-sm text-green-700 mt-4">
                    Girilen oran ile mevcut fiyatlar güncellenerek yeni fiyatlar hesaplanacaktır.
                  </p>
                </div>
              </div>

                {/* Koleksiyon Fiyatları */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-[#00365a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    Koleksiyon Fiyatları
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {collections.map((collection) => (
                      <div key={collection.collectionId}>
                        <label className="block text-sm font-semibold text-gray-700 mb-3">
                          {collection.name}
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.collectionPrices[collection.collectionId] || ''}
                          onChange={(e) => handleCollectionPriceChange(collection.collectionId, parseFloat(e.target.value) || 0)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#00365a] focus:border-transparent transition-all"
                          placeholder={`${collection.code} için fiyat`}
                        />
                      </div>
                  ))}
                </div>
              </div>
            </div>

              {/* Form Footer */}
              <div className="flex justify-end gap-4 pt-8 border-t border-gray-200 mt-8">
                <button
                  type="button"
                  onClick={() => router.push('/dashboard/fiyat-listeleri')}
                  className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-semibold transition-all"
                >
                İptal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-8 py-3 bg-[#00365a] hover:bg-[#004170] text-white rounded-lg font-semibold transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      Güncelleniyor...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Fiyat Listesi Güncelle
                    </>
                  )}
                </button>
              </div>
            </form>
            </div>
        )}
        </div>
    </div>
  );
} 