'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { PriceList, getPriceLists, deletePriceList } from '@/services/api';
import { useAuth } from '@/app/context/AuthContext';

export default function PriceListsPage() {
  const router = useRouter();
  const { isAdmin, isLoading: authLoading } = useAuth();
  const [priceLists, setPriceLists] = useState<PriceList[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [priceListToDelete, setPriceListToDelete] = useState<PriceList | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'default'>('all');
  
  // Custom dropdown state'i
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  
  // API çağrısını takip etmek için ref oluştur
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.push('/dashboard');
      return;
    }
    
    if (!authLoading && isAdmin && !fetchedRef.current) {
      fetchedRef.current = true;
      fetchPriceLists();
    }
  }, [isAdmin, authLoading, router]);

  // Dropdown'ın dışına tıklandığında kapanması
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.dropdown-container')) {
        setStatusDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const fetchPriceLists = async () => {
    // Zaten yükleme yapılıyorsa çık
    if (loading && priceLists.length > 0) return;
    
    setLoading(true);
    try {
      const data = await getPriceLists();
      
      // Varsayılan fiyat listesini en üste yerleştir
      const sortedData = data.sort((a, b) => {
        // Varsayılan liste (is_default: true) en üstte olacak
        if (a.is_default && !b.is_default) return -1;
        if (!a.is_default && b.is_default) return 1;
        
        // Diğerleri için alfabetik sıralama
        return a.name.localeCompare(b.name, 'tr-TR');
      });
      
      setPriceLists(sortedData);
    } catch (error: any) {
      console.error('Fiyat listeleri yüklenirken hata:', error);
      alert(error.message || 'Fiyat listeleri yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!priceListToDelete) return;
    
    setDeleteLoading(true);
    try {
      await deletePriceList(priceListToDelete.price_list_id);
      alert('Fiyat listesi başarıyla silindi');
      
      // Listeden sil ve sıralamayı koru
      const filteredLists = priceLists.filter(list => list.price_list_id !== priceListToDelete.price_list_id);
      const sortedData = filteredLists.sort((a, b) => {
        // Varsayılan liste (is_default: true) en üstte olacak
        if (a.is_default && !b.is_default) return -1;
        if (!a.is_default && b.is_default) return 1;
        
        // Diğerleri için alfabetik sıralama
        return a.name.localeCompare(b.name, 'tr-TR');
      });
      
      setPriceLists(sortedData);
      setDeleteModalVisible(false);
      setPriceListToDelete(null);
      
      // Verileri yenilemek için referansı sıfırla
      fetchedRef.current = false;
    } catch (error: any) {
      alert(error.message || 'Fiyat listesi silinirken bir hata oluştu');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Durum kontrolü
  const getPriceListStatus = (priceList: PriceList) => {
    const currentDate = new Date();
    let isExpired = false;
    let isLimitLow = false;
    
    // Default olmayan fiyat listeleri için tarih kontrolü yap
    if (!priceList.is_default) {
      // valid_to tarihi varsa ve geçmişse expired olarak işaretle
      if (priceList.valid_to) {
        const validToDate = new Date(priceList.valid_to);
        isExpired = validToDate < currentDate;
      }
      
      // valid_from tarihi varsa ve henüz gelmemişse de inactive sayılabilir
      if (priceList.valid_from) {
        const validFromDate = new Date(priceList.valid_from);
        if (validFromDate > currentDate) {
          isExpired = true; // Henüz başlamamış
        }
      }
      
      // Limit 1000 TL ve altına düşmüşse pasif yap
      if (priceList.limit_amount && priceList.limit_amount <= 1000) {
        isLimitLow = true;
      }
    }
    
    // Tarihi geçmişse veya limit düşükse pasif göster
    const isActive = priceList.is_active && !isExpired && !isLimitLow;
    
    return {
      isActive,
      isExpired,
      isLimitLow,
      statusText: isActive ? 'Aktif' : 'Pasif',
      statusColor: isActive ? 'green' : 'red'
    };
  };

  // Filtreleme
  const filteredPriceLists = priceLists.filter(priceList => {
    const matchesSearch = searchTerm === "" || 
      priceList.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      priceList.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const status = getPriceListStatus(priceList);
    
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && status.isActive) ||
      (statusFilter === 'inactive' && !status.isActive) ||
      (statusFilter === 'default' && priceList.is_default);
    
    return matchesSearch && matchesStatus;
  });

  // Loading state
  if (authLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#f7f8fa]">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-slate-200 border-t-[#00365a]" />
        <p className="text-sm text-slate-500">Yetkilendirme kontrol ediliyor...</p>
      </div>
    );
  }

  // Admin kontrolü
  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f8fa] px-4">
        <div className="w-full max-w-md rounded-xl border border-slate-200/80 bg-white shadow-sm px-6 py-10 text-center">
          <h3 className="text-base font-semibold text-slate-900">Erişim Reddedildi</h3>
          <p className="mt-2 text-sm text-slate-500">
            Bu sayfaya erişim yetkiniz bulunmamaktadır. Fiyat listesi yönetimi sadece admin kullanıcılar
            tarafından kullanılabilir.
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            className="mt-6 inline-flex items-center justify-center rounded-lg bg-[#00365a] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#004170] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/25 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Dashboard&apos;a Dön
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <div className="mx-auto max-w-[1600px] px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-light tracking-[0.08em] text-neutral-900 sm:text-3xl sm:tracking-[0.12em]">
              Fiyat Listeleri
            </h1>
            <div className="mt-3 h-px w-[min(100%,20rem)] bg-neutral-300 sm:mt-4" />
            <p className="mt-3 text-sm text-slate-500">Fiyat listelerini görüntüleyin ve yönetin</p>
          </div>
          <button
            type="button"
            onClick={() => router.push('/dashboard/fiyat-listeleri/ekle')}
            className="inline-flex shrink-0 items-center justify-center rounded-lg bg-[#00365a] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#004170] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/25 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Yeni Fiyat Listesi
          </button>
        </div>

        {/* Filters */}
        <div className="mb-6 rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto]">
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">Arama</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Liste adı, açıklama..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-slate-50 py-2.5 pl-10 pr-3 text-sm text-slate-900 placeholder:text-slate-400 transition hover:border-slate-400 focus:border-[#00365a] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15"
                />
                <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                  <circle cx="11" cy="11" r="8" />
                  <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
                </svg>
              </div>
            </div>
            <div className="dropdown-container">
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">Durum</label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
                  className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 pr-9 text-left text-sm text-slate-900 transition hover:border-slate-400 focus:border-[#00365a] focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15"
                >
                  {statusFilter === "all" && "Tüm Durumlar"}
                  {statusFilter === "active" && "Aktif"}
                  {statusFilter === "inactive" && "Pasif"}
                  {statusFilter === "default" && "Varsayılan"}
                  <svg
                    className={`absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-transform ${statusDropdownOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.8}
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {statusDropdownOpen && (
                  <div className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                    <button
                      type="button"
                      className={`block w-full px-3 py-2 text-left text-sm transition-colors hover:bg-slate-50 ${
                        statusFilter === "all" ? 'bg-[#00365a]/[0.06] font-medium text-[#00365a]' : 'text-slate-700'
                      }`}
                      onClick={() => {
                        setStatusFilter("all");
                        setStatusDropdownOpen(false);
                      }}
                    >
                      Tüm Durumlar
                    </button>
                    <button
                      type="button"
                      className={`block w-full px-3 py-2 text-left text-sm transition-colors hover:bg-slate-50 ${
                        statusFilter === "active" ? 'bg-[#00365a]/[0.06] font-medium text-[#00365a]' : 'text-slate-700'
                      }`}
                      onClick={() => {
                        setStatusFilter("active");
                        setStatusDropdownOpen(false);
                      }}
                    >
                      Aktif
                    </button>
                    <button
                      type="button"
                      className={`block w-full px-3 py-2 text-left text-sm transition-colors hover:bg-slate-50 ${
                        statusFilter === "inactive" ? 'bg-[#00365a]/[0.06] font-medium text-[#00365a]' : 'text-slate-700'
                      }`}
                      onClick={() => {
                        setStatusFilter("inactive");
                        setStatusDropdownOpen(false);
                      }}
                    >
                      Pasif
                    </button>
                    <button
                      type="button"
                      className={`block w-full px-3 py-2 text-left text-sm transition-colors hover:bg-slate-50 ${
                        statusFilter === "default" ? 'bg-[#00365a]/[0.06] font-medium text-[#00365a]' : 'text-slate-700'
                      }`}
                      onClick={() => {
                        setStatusFilter("default");
                        setStatusDropdownOpen(false);
                      }}
                    >
                      Varsayılan
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("all");
                }}
                className="inline-flex w-full items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15 md:w-auto"
              >
                Temizle
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200/80 bg-slate-50/60 px-4 py-3 sm:px-5">
            <h3 className="text-sm font-semibold text-slate-900">Fiyat Listesi</h3>
            <span className="text-xs text-slate-500">{filteredPriceLists.length} liste</span>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16">
              <div className="h-9 w-9 animate-spin rounded-full border-2 border-slate-200 border-t-[#00365a]" />
              <p className="text-sm text-slate-500">Fiyat listeleri yükleniyor...</p>
            </div>
          ) : filteredPriceLists.length > 0 ? (
            <>
              {/* Desktop Table View */}
              <div className="hidden w-full overflow-x-auto lg:block">
                <table className="w-full min-w-full">
                  <thead className="bg-slate-50/60">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                        Liste Bilgileri
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                        Geçerlilik
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                        Limit & Para Birimi
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                        Durum
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-500">
                        Ürün Sayısı
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-500">
                        İşlemler
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredPriceLists.map((priceList) => {
                      const status = getPriceListStatus(priceList);
                      return (
                        <tr key={priceList.price_list_id} className="transition-colors hover:bg-slate-50/70">
                          <td className="px-4 py-3">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <div className="text-sm font-medium text-slate-900">{priceList.name}</div>
                                {priceList.is_default && (
                                  <span className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-xs font-medium text-sky-700">
                                    Varsayılan
                                  </span>
                                )}
                              </div>
                              <div className="mt-0.5 text-sm text-slate-500">{priceList.description}</div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div>
                              {priceList.valid_from || priceList.valid_to ? (
                                <>
                                  <div className="text-sm text-slate-900">
                                    {priceList.valid_from ? new Date(priceList.valid_from).toLocaleDateString('tr-TR') : 'Başlangıç: -'}
                                  </div>
                                  <div className="text-sm text-slate-500">
                                    {priceList.valid_to ? new Date(priceList.valid_to).toLocaleDateString('tr-TR') : 'Bitiş: -'}
                                  </div>
                                </>
                              ) : (
                                <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                                  Süresiz
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div>
                              <div className="text-sm text-slate-900">
                                {priceList.limit_amount ? (
                                  `${priceList.limit_amount.toLocaleString('tr-TR')} ${priceList.currency}`
                                ) : (
                                  <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                                    Limitsiz
                                  </span>
                                )}
                              </div>
                              <div className="mt-0.5 text-sm text-slate-500">Para birimi: {priceList.currency}</div>
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3">
                            <div>
                              <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                                status.statusColor === 'green'
                                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                  : 'border-rose-200 bg-rose-50 text-rose-700'
                              }`}>
                                {status.statusText}
                              </span>
                              {(status.isExpired || status.isLimitLow) && !priceList.is_default && (
                                <div className="mt-1 text-xs text-slate-500">
                                  {status.isExpired && (priceList.valid_to && new Date(priceList.valid_to) < new Date() ? 'Süresi dolmuş' : 'Henüz başlamamış')}
                                  {status.isLimitLow && 'Limit yetersiz (≤1000 TL)'}
                                  {status.isExpired && status.isLimitLow && ' & '}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-slate-900">
                            {priceList.PriceListDetail?.length || 0}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => router.push(`/dashboard/fiyat-listeleri/${priceList.price_list_id}/duzenle`)}
                                aria-label="Güncelle"
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-[#00365a] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15"
                              >
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              {!priceList.is_default && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPriceListToDelete(priceList);
                                    setDeleteModalVisible(true);
                                  }}
                                  aria-label="Sil"
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-rose-600 transition hover:bg-rose-50 hover:text-rose-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/20"
                                >
                                  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile/Tablet Card View */}
              <div className="divide-y divide-slate-100 lg:hidden">
                {filteredPriceLists.map((priceList) => {
                  const status = getPriceListStatus(priceList);
                  return (
                    <div key={priceList.price_list_id} className="p-4 sm:p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-base font-medium text-slate-900">{priceList.name}</h3>
                            {priceList.is_default && (
                              <span className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-xs font-medium text-sky-700">
                                Varsayılan
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 text-sm text-slate-500">{priceList.description}</p>
                        </div>
                        <div>
                          <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                            status.statusColor === 'green'
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                              : 'border-rose-200 bg-rose-50 text-rose-700'
                          }`}>
                            {status.statusText}
                          </span>
                          {(status.isExpired || status.isLimitLow) && !priceList.is_default && (
                            <div className="mt-1 text-xs text-slate-500">
                              {status.isExpired && (priceList.valid_to && new Date(priceList.valid_to) < new Date() ? 'Süresi dolmuş' : 'Henüz başlamamış')}
                              {status.isLimitLow && 'Limit yetersiz (≤1000 TL)'}
                              {status.isExpired && status.isLimitLow && ' & '}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="rounded-lg border border-slate-200/80 bg-slate-50/60 p-3">
                          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Geçerlilik Tarihi</p>
                          {priceList.valid_from || priceList.valid_to ? (
                            <div className="mt-1.5 text-sm text-slate-700">
                              <p>Başlangıç: {priceList.valid_from ? new Date(priceList.valid_from).toLocaleDateString('tr-TR') : '-'}</p>
                              <p>Bitiş: {priceList.valid_to ? new Date(priceList.valid_to).toLocaleDateString('tr-TR') : '-'}</p>
                            </div>
                          ) : (
                            <span className="mt-1.5 inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                              Süresiz
                            </span>
                          )}
                        </div>

                        <div className="rounded-lg border border-slate-200/80 bg-slate-50/60 p-3">
                          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Finansal Bilgiler</p>
                          <p className="mt-1.5 text-sm text-slate-900">
                            Limit: {priceList.limit_amount ?
                              `${priceList.limit_amount.toLocaleString('tr-TR')} ${priceList.currency}` :
                              'Limitsiz'
                            }
                          </p>
                          <p className="text-sm text-slate-500">Para birimi: {priceList.currency}</p>
                        </div>

                        <div className="rounded-lg border border-slate-200/80 bg-slate-50/60 p-3 sm:col-span-2">
                          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Ürün Sayısı</p>
                          <p className="mt-1.5 text-sm font-medium text-slate-900">{priceList.PriceListDetail?.length || 0} ürün</p>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => router.push(`/dashboard/fiyat-listeleri/${priceList.price_list_id}/duzenle`)}
                          className="inline-flex items-center justify-center rounded-lg bg-[#00365a] px-3 py-2 text-xs font-medium text-white transition hover:bg-[#004170]"
                        >
                          Güncelle
                        </button>
                        {!priceList.is_default && (
                          <button
                            type="button"
                            onClick={() => {
                              setPriceListToDelete(priceList);
                              setDeleteModalVisible(true);
                            }}
                            className="inline-flex items-center justify-center rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-medium text-rose-600 transition hover:bg-rose-50 hover:text-rose-700"
                          >
                            Sil
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="px-6 py-16 text-center">
              <h3 className="text-sm font-medium text-slate-900">Fiyat Listesi Bulunamadı</h3>
              <p className="mx-auto mt-1.5 max-w-md text-sm text-slate-500">
                {searchTerm || statusFilter !== 'all'
                  ? 'Arama kriterlerinize uygun fiyat listesi bulunamadı. Filtreleri temizleyerek tekrar deneyin.'
                  : 'Henüz hiç fiyat listesi eklenmemiş. İlk fiyat listesini ekleyerek başlayın.'
                }
              </p>
              <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => router.push('/dashboard/fiyat-listeleri/ekle')}
                  className="inline-flex items-center justify-center rounded-lg bg-[#00365a] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#004170] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/25 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  İlk Fiyat Listesini Ekle
                </button>
                {(searchTerm || statusFilter !== 'all') && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchTerm("");
                      setStatusFilter("all");
                    }}
                    className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15"
                  >
                    Filtreleri Temizle
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Delete Confirmation Modal */}
        {deleteModalVisible && priceListToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
            <div className="w-full max-w-md overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-lg">
              <div className="border-b border-slate-200/80 px-5 py-4">
                <h3 className="text-base font-semibold text-slate-900">Fiyat Listesi Sil</h3>
              </div>

              <div className="px-5 py-5">
                <p className="text-sm text-slate-700">
                  <span className="font-medium text-slate-900">{priceListToDelete.name}</span> fiyat listesini silmek istediğinize emin misiniz?
                </p>
                <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-3">
                  <p className="text-sm text-rose-700">
                    ⚠️ Bu işlem geri alınamaz ve fiyat listesine bağlı tüm fiyatlar silinecektir.
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-200/80 bg-slate-50/60 px-5 py-3.5">
                <button
                  type="button"
                  onClick={() => {
                    setDeleteModalVisible(false);
                    setPriceListToDelete(null);
                  }}
                  className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15"
                >
                  İptal
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleteLoading}
                  className="inline-flex items-center justify-center rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-rose-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/25 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {deleteLoading ? 'Siliniyor...' : 'Sil'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 