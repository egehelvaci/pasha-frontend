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

  const inputBaseClass =
    'w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition hover:border-slate-400 focus:border-[#00365a] focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15';

  const defaultLockedClass = priceList?.is_default ? ' cursor-not-allowed bg-slate-100' : '';

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f8fa] px-4">
        <div className="w-full max-w-md rounded-xl border border-slate-200/80 bg-white p-8 text-center shadow-sm">
          <h3 className="text-base font-semibold text-slate-900">Erişim Reddedildi</h3>
          <p className="mt-2 text-sm text-slate-500">Bu sayfaya erişim yetkiniz bulunmamaktadır.</p>
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="mt-6 inline-flex items-center justify-center rounded-lg bg-[#00365a] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#004170] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/25"
          >
            Dashboard&apos;a Dön
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <div className="mx-auto max-w-[1120px] px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-light tracking-[0.08em] text-neutral-900 sm:text-3xl sm:tracking-[0.12em]">
              Fiyat Listesi Düzenle
            </h1>
            <div className="mt-3 h-px w-[min(100%,20rem)] bg-neutral-300 sm:mt-4" />
            <p className="mt-3 text-sm text-slate-500">Fiyat listesi bilgilerini güncelleyin</p>
          </div>
          <button
            type="button"
            onClick={() => router.push('/dashboard/fiyat-listeleri')}
            className="inline-flex shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15"
          >
            Fiyat Listeleri
          </button>
        </div>

        {loadingData ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-slate-200/80 bg-white py-16 shadow-sm">
            <div className="h-9 w-9 animate-spin rounded-full border-2 border-slate-200 border-t-[#00365a]" />
            <p className="text-sm font-medium text-slate-700">Fiyat Listesi Yükleniyor</p>
            <p className="text-sm text-slate-500">Lütfen bekleyiniz...</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 bg-slate-50/60 px-4 py-3 sm:px-5">
              <h2 className="text-sm font-semibold text-slate-900">Fiyat Listesi Güncelle</h2>
              <div className="flex flex-wrap items-center gap-2">
                {priceList?.is_default && (
                  <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                    Varsayılan
                  </span>
                )}
                <span className="text-xs text-slate-500">Zorunlu alanlar * ile işaretlidir</span>
              </div>
            </div>

            <form onSubmit={onFinish} className="p-4 sm:p-5">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Temel Bilgiler</h3>
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                      Liste Adı <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      disabled={priceList?.is_default}
                      className={`${inputBaseClass}${defaultLockedClass} ${errors.name ? 'border-rose-300' : ''}`}
                      placeholder="Örn: 2024 Bahar Koleksiyonu"
                    />
                    {errors.name && <p className="mt-1.5 text-xs text-rose-600">{errors.name}</p>}
                  </div>

                  <div className="sm:col-span-2">
                    <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                      Açıklama <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      disabled={priceList?.is_default}
                      rows={3}
                      className={`${inputBaseClass}${defaultLockedClass} resize-none ${errors.description ? 'border-rose-300' : ''}`}
                      placeholder="Fiyat listesi hakkında açıklama..."
                    />
                    {errors.description && <p className="mt-1.5 text-xs text-rose-600">{errors.description}</p>}
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                      Başlangıç Tarihi
                    </label>
                    <input
                      type="date"
                      value={formData.validFrom}
                      onChange={(e) => handleInputChange('validFrom', e.target.value)}
                      disabled={priceList?.is_default}
                      className={`${inputBaseClass}${defaultLockedClass}`}
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                      Bitiş Tarihi
                    </label>
                    <input
                      type="date"
                      value={formData.validTo}
                      onChange={(e) => handleInputChange('validTo', e.target.value)}
                      disabled={priceList?.is_default}
                      className={`${inputBaseClass}${defaultLockedClass} ${errors.validTo ? 'border-rose-300' : ''}`}
                    />
                    {errors.validTo && <p className="mt-1.5 text-xs text-rose-600">{errors.validTo}</p>}
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                      Para Birimi <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={formData.currency}
                      onChange={(e) => handleInputChange('currency', e.target.value)}
                      disabled={priceList?.is_default}
                      className={`${inputBaseClass}${defaultLockedClass} ${errors.currency ? 'border-rose-300' : ''}`}
                    >
                      <option value="TRY">TRY</option>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                    </select>
                    {errors.currency && <p className="mt-1.5 text-xs text-rose-600">{errors.currency}</p>}
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                      Limit Tutarı
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.limitAmount || ''}
                      onChange={(e) => handleInputChange('limitAmount', parseFloat(e.target.value) || undefined)}
                      disabled={priceList?.is_default}
                      className={`${inputBaseClass}${defaultLockedClass} tabular-nums`}
                      placeholder="0.00"
                    />
                    <p className="mt-1.5 text-xs text-slate-500">Boş bırakılırsa limitsiz olur</p>
                  </div>

                  {!priceList?.is_default && (
                    <div className="sm:col-span-2">
                      <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50/60 p-3">
                        <input
                          type="checkbox"
                          id="isActive"
                          checked={formData.isActive}
                          onChange={(e) => handleInputChange('isActive', e.target.checked)}
                          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#00365a] focus:ring-[#00365a]/20"
                        />
                        <div>
                          <label htmlFor="isActive" className="text-sm font-medium text-slate-900">
                            Aktif
                          </label>
                          <p className="mt-0.5 text-xs text-slate-500">
                            Fiyat listesinin aktif olup olmadığını belirtir
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-5 border-t border-slate-200/80 pt-5">
                <h3 className="text-sm font-semibold text-slate-900">Toplu Fiyat Güncelleme</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Girilen oran ile mevcut fiyatlar güncellenerek yeni fiyatlar hesaplanacaktır.
                </p>
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                      İşlem Tipi
                    </label>
                    <select
                      value={formData.adjustmentType}
                      onChange={(e) => handleInputChange('adjustmentType', e.target.value as 'increase' | 'decrease')}
                      className={inputBaseClass}
                    >
                      <option value="increase">Zam</option>
                      <option value="decrease">İndirim</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                      Oran (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={formData.adjustmentRate || ''}
                      onChange={(e) => handleInputChange('adjustmentRate', parseFloat(e.target.value) || undefined)}
                      className={`${inputBaseClass} tabular-nums`}
                      placeholder="Örn: 10"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={applyAdjustment}
                    className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15"
                  >
                    Uygula
                  </button>
                </div>
              </div>

              <div className="mt-5 border-t border-slate-200/80 pt-5">
                <h3 className="text-sm font-semibold text-slate-900">Koleksiyon Fiyatları</h3>

                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {collections.map((collection) => (
                    <div key={collection.collectionId}>
                      <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                        {collection.name}
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.collectionPrices[collection.collectionId] || ''}
                        onChange={(e) => handleCollectionPriceChange(collection.collectionId, parseFloat(e.target.value) || 0)}
                        className={`${inputBaseClass} tabular-nums`}
                        placeholder={`${collection.code} için fiyat`}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 flex flex-col-reverse gap-2 border-t border-slate-200/80 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => router.push('/dashboard/fiyat-listeleri')}
                  className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center justify-center rounded-lg bg-[#00365a] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#004170] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/25 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? 'Güncelleniyor...' : 'Fiyat Listesi Güncelle'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
} 