'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getPurchasePriceLists, PurchasePriceList, updateCollectionPrice } from '@/services/api';


export default function AlisFiyatListesiPage() {
  const router = useRouter();
  const [priceList, setPriceList] = useState<PurchasePriceList | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [collectionPrices, setCollectionPrices] = useState<Record<string, number>>({});

  useEffect(() => {
    const fetchPriceList = async () => {
      try {
        setLoading(true);
        const response = await getPurchasePriceLists();
        if (response && response.length > 0) {
          const list = response[0];
          setPriceList(list);
          
          // Koleksiyon fiyatlarını state'e doldur
          const details = list.details;
          const prices: Record<string, number> = {};
          details.forEach((detail) => {
            prices[detail.collection_id] = parseFloat(detail.price_per_square_meter.toString());
          });
          setCollectionPrices(prices);
        }
      } catch (err) {
        setError('Alış fiyat listesi yüklenirken bir hata oluştu');
        console.error('Error fetching purchase price list:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPriceList();
  }, []);

  const handlePriceChange = (collectionId: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    setCollectionPrices(prev => ({
      ...prev,
      [collectionId]: numValue
    }));
  };

  const handleUpdatePrices = async () => {
    if (!priceList) return;

    setSaving(true);
    try {
      // Tüm koleksiyon fiyatlarını güncelle
      const updatePromises = Object.entries(collectionPrices)
        .filter(([_, price]) => price > 0)
        .map(([collectionId, price]) => 
          updateCollectionPrice(priceList.id, collectionId, price)
        );

      await Promise.all(updatePromises);
      
      // Verileri yeniden yükle
      const response = await getPurchasePriceLists();
      if (response && response.length > 0) {
        const list = response[0];
        setPriceList(list);
        
        const details = list.details;
        const prices: Record<string, number> = {};
        details.forEach((detail) => {
          prices[detail.collection_id] = parseFloat(detail.price_per_square_meter.toString());
        });
        setCollectionPrices(prices);
      }
      
      alert('Alış fiyat listesi başarıyla güncellendi');
    } catch (err) {
      console.error('Fiyat güncelleme hatası:', err);
      alert('Fiyatlar güncellenirken bir hata oluştu');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Alış fiyat listesi yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">⚠️</div>
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!priceList) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Alış fiyat listesi bulunamadı</p>
        </div>
      </div>
    );
  }

  const details = priceList.details.sort((a, b) => 
    a.collection.name.localeCompare(b.collection.name, 'tr-TR')
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Alış Fiyat Listesi</h1>
            </div>
            <button 
              onClick={() => router.push('/dashboard/satin-alim-islemleri')}
              className="px-4 py-2 bg-[#00365a] text-white rounded-lg hover:bg-[#004170] transition-colors"
            >
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <span>Satıcılar</span>
              </div>
            </button>
          </div>
        </div>

        {/* Price List Info */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Para Birimi</label>
              <p className="mt-1 text-lg font-semibold text-gray-900">{priceList.currency}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Durum</label>
              <span className={`mt-1 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                priceList.is_active 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {priceList.is_active ? 'Aktif' : 'Pasif'}
              </span>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Toplam Koleksiyon</label>
              <p className="mt-1 text-lg font-semibold text-gray-900">{details.length}</p>
            </div>
          </div>
        </div>

        {/* Collections List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Koleksiyon Fiyatları</h2>
            <p className="text-sm text-gray-600">Metrekare başına alış fiyatları</p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Koleksiyon Kodu
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Koleksiyon Adı
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Metrekare Fiyatı
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Son Güncelleme
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {details.map((detail) => (
                  <tr key={detail.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {detail.collection.code}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {detail.collection.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={collectionPrices[detail.collection_id] || ''}
                          onChange={(e) => handlePriceChange(detail.collection_id, e.target.value)}
                          onWheel={(e) => e.currentTarget.blur()}
                          className="w-24 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="0.00"
                        />
                        <span className="text-xs text-gray-500">{priceList.currency}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(priceList.updated_at).toLocaleDateString('tr-TR', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Update Button */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <div className="flex justify-end">
              <button
                onClick={handleUpdatePrices}
                disabled={saving}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-semibold transition-colors flex items-center space-x-2"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    <span>Güncelleniyor...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span>Fiyatları Güncelle</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="mt-6 bg-blue-50 rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-700">
                <strong>Toplam {details.length} koleksiyon</strong> için alış fiyat listesi tanımlanmıştır. 
                Tüm fiyatlar {priceList.currency} cinsinden metrekare başına belirtilmiştir.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
