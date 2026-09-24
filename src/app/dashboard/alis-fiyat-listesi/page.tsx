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
      <div className="min-h-screen bg-[#f7f8fa]">
        <div className="mx-auto max-w-[1600px] px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
          <div className="flex flex-col items-center justify-center gap-3 py-16">
            <div className="h-9 w-9 animate-spin rounded-full border-2 border-slate-200 border-t-[#00365a]" />
            <p className="text-sm text-slate-500">Alış fiyat listesi yükleniyor...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#f7f8fa]">
        <div className="mx-auto max-w-[1600px] px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-700">
            {error}
          </div>
        </div>
      </div>
    );
  }

  if (!priceList) {
    return (
      <div className="min-h-screen bg-[#f7f8fa]">
        <div className="mx-auto max-w-[1600px] px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
          <div className="rounded-xl border border-slate-200/80 bg-white px-6 py-16 text-center shadow-sm">
            <p className="text-sm font-medium text-slate-900">Alış fiyat listesi bulunamadı</p>
          </div>
        </div>
      </div>
    );
  }

  const details = priceList.details.sort((a, b) => 
    a.collection.name.localeCompare(b.collection.name, 'tr-TR')
  );

  const inputClassName =
    'w-full rounded-lg border-2 border-[#00365a] bg-slate-50 px-3 py-2.5 pr-12 text-right text-base font-semibold tabular-nums text-slate-900 placeholder:font-normal placeholder:text-slate-400 transition hover:bg-white focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/25';

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <div className="mx-auto max-w-[1600px] px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-light tracking-[0.08em] text-neutral-900 sm:text-3xl sm:tracking-[0.12em]">
              Alış Fiyat Listesi
            </h1>
            <div className="mt-3 h-px w-[min(100%,20rem)] bg-neutral-300 sm:mt-4" />
          </div>
          <button
            type="button"
            onClick={() => router.push('/dashboard/satin-alim-islemleri')}
            className="inline-flex shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15"
          >
            Satıcılar
          </button>
        </div>

        <div className="mb-6 overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200/80 bg-slate-50/60 px-4 py-3 sm:px-5">
            <h2 className="text-sm font-semibold text-slate-900">Liste Bilgileri</h2>
          </div>
          <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-3 sm:p-5">
            <div>
              <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                Para Birimi
              </span>
              <p className="text-sm font-medium text-slate-900">{priceList.currency}</p>
            </div>
            <div>
              <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                Durum
              </span>
              <span
                className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                  priceList.is_active
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : 'border-rose-200 bg-rose-50 text-rose-700'
                }`}
              >
                {priceList.is_active ? 'Aktif' : 'Pasif'}
              </span>
            </div>
            <div>
              <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                Toplam Koleksiyon
              </span>
              <p className="text-sm font-medium tabular-nums text-slate-900">{details.length}</p>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200/80 bg-slate-50/60 px-4 py-3 sm:px-5">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Koleksiyon Fiyatları</h2>
              <p className="mt-0.5 text-xs text-slate-500">Metrekare başına alış fiyatları</p>
            </div>
          </div>

          <div className="w-full overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50/60">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                    Koleksiyon Kodu
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                    Koleksiyon Adı
                  </th>
                  <th className="w-[13rem] px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-700">
                    Metrekare Fiyatı ({priceList.currency})
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                    Son Güncelleme
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {details.map((detail) => (
                  <tr key={detail.id} className="transition-colors hover:bg-slate-50/70">
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-xs font-medium text-sky-700">
                        {detail.collection.code}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">
                      {detail.collection.name}
                    </td>
                    <td className="px-4 py-3">
                      <div className="relative ml-auto w-36">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={collectionPrices[detail.collection_id] || ''}
                          onChange={(e) => handlePriceChange(detail.collection_id, e.target.value)}
                          onWheel={(e) => e.currentTarget.blur()}
                          className={inputClassName}
                          placeholder="0.00"
                          aria-label={`${detail.collection.name} metrekare fiyatı`}
                        />
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-500">
                          {priceList.currency}
                        </span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">
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

          <div className="mt-6 flex flex-col-reverse gap-2 border-t border-slate-200/80 px-4 pt-5 pb-4 sm:flex-row sm:justify-end sm:px-5 sm:pb-5">
            <button
              type="button"
              onClick={handleUpdatePrices}
              disabled={saving}
              className="inline-flex items-center justify-center rounded-lg bg-[#00365a] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#004170] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/25 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? 'Güncelleniyor...' : 'Fiyatları Güncelle'}
            </button>
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
          <p className="text-sm text-slate-700">
            <span className="font-medium text-slate-900">Toplam {details.length} koleksiyon</span>{' '}
            için alış fiyat listesi tanımlanmıştır. Tüm fiyatlar {priceList.currency} cinsinden metrekare
            başına belirtilmiştir.
          </p>
        </div>
      </div>
    </div>
  );
}
