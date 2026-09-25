'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Store, getStores, deleteStore, PriceList, getPriceLists, assignStorePriceList } from '@/services/api';
import { useAuth } from '@/app/context/AuthContext';
import { StoreType, storeTypeLabels } from '@/components/StoreTypeSelector';

export default function StoresPage() {
  const router = useRouter();
  const { isAdmin, isAdminOrEditor, isLoading: authLoading } = useAuth();
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [storeToDelete, setStoreToDelete] = useState<Store | null>(null);
  const [priceLists, setPriceLists] = useState<PriceList[]>([]);
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [selectedPriceList, setSelectedPriceList] = useState<string>('');
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [assignLoading, setAssignLoading] = useState(false);
  const [notice, setNotice] = useState({ isOpen: false, title: '', message: '', isError: false });
  const showNotice = (message: string, isError = false) => {
    setNotice({
      isOpen: true,
      title: isError ? 'İşlem tamamlanamadı' : 'İşlem tamamlandı',
      message,
      isError,
    });
  };
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  
  // Custom dropdown state'leri
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [priceListDropdownOpen, setPriceListDropdownOpen] = useState(false);
  
  // API çağrılarını takip etmek için ref oluştur
  const storesFetchedRef = useRef(false);
  const priceListsFetchedRef = useRef(false);

  useEffect(() => {
    // Kimlik doğrulama yüklemesi tamamlandığında ve admin/editör değilse
    if (!authLoading && !isAdminOrEditor) {
      router.push('/dashboard');
      return;
    }
    
    // Kimlik doğrulama yüklemesi tamamlandığında ve admin/editör ise veri çek
    if (!authLoading && isAdminOrEditor) {
      if (!storesFetchedRef.current) {
        storesFetchedRef.current = true;
      fetchStores();
      }
      
      if (!priceListsFetchedRef.current) {
        priceListsFetchedRef.current = true;
      fetchPriceLists();
      }
    }
  }, [isAdminOrEditor, authLoading, router]);

  // Dropdown'ların dışına tıklandığında kapanması
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.dropdown-container')) {
        setStatusDropdownOpen(false);
        setPriceListDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Fiyat listesi format fonksiyonu
  const formatPriceListDisplay = (priceListId: string) => {
    const priceList = priceLists.find(list => list.price_list_id === priceListId);
    if (!priceList) return '';
    
    let displayText = priceList.name;
    
    if (priceList.valid_from || priceList.valid_to) {
      const fromDate = priceList.valid_from && priceList.valid_from !== null ? new Date(priceList.valid_from).toLocaleDateString('tr-TR') : '';
      const toDate = priceList.valid_to && priceList.valid_to !== null ? new Date(priceList.valid_to).toLocaleDateString('tr-TR') : '';
      
      if (fromDate && toDate) {
        displayText += ` (${fromDate} - ${toDate})`;
      } else if (fromDate) {
        displayText += ` (${fromDate})`;
      } else if (toDate) {
        displayText += ` (${toDate})`;
      }
    }
    
    return displayText;
  };

  const fetchStores = async () => {
    // Zaten yükleme yapılıyorsa çık
    if (loading && stores.length > 0) return;
    
    setLoading(true);
    try {
      const data = await getStores();
      setStores(data);
    } catch (error: any) {
      showNotice(error.message || 'Mağazalar yüklenirken bir hata oluştu', true);
    } finally {
      setLoading(false);
    }
  };

  const fetchPriceLists = async () => {
    try {
      const data = await getPriceLists();
      // Geçerli tarihlere göre fiyat listelerini filtrele
      const currentDate = new Date().toISOString();
      const validPriceLists = data.filter(list => {
        // valid_from tarihi boş veya şu andaki tarihten önce ise
        const isValidFrom = !list.valid_from || new Date(list.valid_from).toISOString() <= currentDate;
        // valid_to tarihi boş veya şu andaki tarihten sonra ise
        const isValidTo = !list.valid_to || new Date(list.valid_to).toISOString() >= currentDate;
        // Aktif olarak işaretlenmişse
        const isActive = list.is_active;
        
        return isValidFrom && isValidTo && isActive;
      });
      
      setPriceLists(validPriceLists);
    } catch (error) {
      showNotice('Fiyat listeleri yüklenirken bir hata oluştu', true);
    }
  };

  const handleDelete = async () => {
    if (!storeToDelete) return;
    
    setDeleteLoading(true);
    try {
      await deleteStore(storeToDelete.store_id);
      showNotice('Mağaza başarıyla silindi');
      setStores(stores.filter(store => store.store_id !== storeToDelete.store_id));
      setDeleteModalVisible(false);
      setStoreToDelete(null);
      
      // Verileri yenilemek için referansı sıfırla
      storesFetchedRef.current = false;
    } catch (error: any) {
      showNotice(error.message || 'Mağaza silinirken bir hata oluştu', true);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleAssignPriceList = async () => {
    if (!selectedStore || !selectedPriceList) return;

    setAssignLoading(true);
    try {
      await assignStorePriceList({
        storeId: selectedStore.store_id,
        priceListId: selectedPriceList
      });
      showNotice('Fiyat listesi başarıyla atandı');
      setAssignModalVisible(false);
      setSelectedStore(null);
      setSelectedPriceList('');
      
      // Mağaza listesini yenilemek için referansı sıfırla
      storesFetchedRef.current = false;
      fetchStores();
    } catch (error: any) {
      showNotice(error.message || 'Fiyat listesi atanırken bir hata oluştu', true);
    } finally {
      setAssignLoading(false);
    }
  };

  // Filtreleme ve alfabetik sıralama
  const filteredStores = stores.filter(store => {
    const matchesSearch = searchTerm === "" || 
      store.kurum_adi.toLowerCase().includes(searchTerm.toLowerCase()) ||
      store.yetkili_adi.toLowerCase().includes(searchTerm.toLowerCase()) ||
      store.yetkili_soyadi.toLowerCase().includes(searchTerm.toLowerCase()) ||
      store.eposta.toLowerCase().includes(searchTerm.toLowerCase()) ||
      store.vergi_numarasi.includes(searchTerm);
    
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && store.is_active) ||
      (statusFilter === 'inactive' && !store.is_active);
    
    return matchesSearch && matchesStatus;
  }).sort((a, b) => a.kurum_adi.localeCompare(b.kurum_adi, 'tr-TR'));

  // Loading state
  if (authLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#f7f8fa]">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-slate-200 border-t-[#00365a]" />
        <p className="text-sm text-slate-500">Yetkilendirme kontrol ediliyor...</p>
      </div>
    );
  }

  // Admin ve Editör kontrolü
  if (!isAdminOrEditor) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f8fa] px-4">
        <div className="w-full max-w-md rounded-xl border border-slate-200/80 bg-white shadow-sm px-6 py-10 text-center">
          <h3 className="text-base font-semibold text-slate-900">Erişim Reddedildi</h3>
          <p className="mt-2 text-sm text-slate-500">
            Bu sayfaya erişim yetkiniz bulunmamaktadır. Mağaza yönetimi sadece admin ve editör kullanıcılar
            tarafından kullanılabilir.
          </p>
          <button onClick={() => router.push('/dashboard')} className="mt-6 inline-flex items-center justify-center rounded-lg bg-[#00365a] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#004170] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/25 disabled:cursor-not-allowed disabled:opacity-50">
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
              Mağazalar
            </h1>
            <div className="mt-3 h-px w-[min(100%,20rem)] bg-neutral-300 sm:mt-4" />
            <p className="mt-3 text-sm text-slate-500">Mağaza bilgilerini görüntüleyin ve yönetin</p>
          </div>
          <button onClick={() => router.push('/dashboard/magazalar/ekle')} className="inline-flex items-center justify-center rounded-lg bg-[#00365a] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#004170] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/25 disabled:cursor-not-allowed disabled:opacity-50 shrink-0">
            Yeni Mağaza
          </button>
        </div>

        {/* Filters */}
        <div className="mb-6 rounded-xl border border-slate-200/80 bg-white shadow-sm p-4 sm:p-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto]">
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">Arama</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Mağaza, yetkili adı, e-posta..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition hover:border-slate-400 focus:border-[#00365a] focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15 pl-10"
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
                  className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition hover:border-slate-400 focus:border-[#00365a] focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15 pr-9 text-left"
                >
                  {statusFilter === "all" && "Tüm Durumlar"}
                  {statusFilter === "active" && "Aktif"}
                  {statusFilter === "inactive" && "Pasif"}
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
                  <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
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
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("all");
                }}
                className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15 w-full md:w-auto"
              >
                Temizle
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200/80 bg-slate-50/60 px-4 py-3 sm:px-5">
            <h3 className="text-sm font-semibold text-slate-900">Mağaza Listesi</h3>
            <span className="text-xs text-slate-500">{filteredStores.length} mağaza</span>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16">
              <div className="h-9 w-9 animate-spin rounded-full border-2 border-slate-200 border-t-[#00365a]" />
              <p className="text-sm text-slate-500">Mağazalar yükleniyor...</p>
            </div>
          ) : filteredStores.length > 0 ? (
            <>
              {/* Desktop Table View */}
              <div className="hidden overflow-x-auto xl:block">
                <table className="w-full min-w-[1240px]">
                  <thead className="bg-slate-50/60">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Mağaza Bilgileri</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Mağaza Türü</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Yetkili</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">İletişim</th>
                      {isAdmin && <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Finansal Durum</th>}
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Durum</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500 text-right">İşlemler</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredStores.map((store) => (
                      <tr key={store.store_id} className="transition-colors hover:bg-slate-50/70">
                        <td className="px-4 py-3 align-top">
                          <div className="text-sm font-medium text-slate-900">{store.kurum_adi}</div>
                          {store.aciklama ? <div className="mt-0.5 text-xs text-slate-500">{store.aciklama}</div> : null}
                          <div className="mt-1 text-xs text-slate-400">
                            VN: {store.vergi_numarasi} • {store.vergi_dairesi}
                          </div>
                        </td>
                        <td className="px-4 py-3 align-top">
                          {store.store_type ? (
                            <span className="text-sm text-slate-700">{storeTypeLabels[store.store_type as StoreType]}</span>
                          ) : (
                            <span className="text-sm text-slate-400">Belirtilmemiş</span>
                          )}
                        </td>
                        <td className="px-4 py-3 align-top">
                          <div className="text-sm font-medium text-slate-900">
                            {store.yetkili_adi} {store.yetkili_soyadi}
                          </div>
                          <div className="mt-0.5 text-xs text-slate-500">{store.eposta}</div>
                          <div className="mt-1 text-xs text-slate-400">TCKN: {store.tckn}</div>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <div className="text-sm text-slate-700">{store.telefon}</div>
                          {store.faks_numarasi && (
                            <div className="mt-0.5 text-xs text-slate-500">Faks: {store.faks_numarasi}</div>
                          )}
                          <div className="mt-1 text-xs text-slate-400">{store.adres}</div>
                        </td>
                        {isAdmin && (
                          <td className="px-4 py-3 align-top">
                            <dl className="space-y-1">
                              <div className="flex items-baseline justify-between gap-4">
                                <dt className="text-xs text-slate-500">Bakiye</dt>
                                <dd className={`text-sm tabular-nums ${(store.bakiye || 0) < 0 ? 'font-medium text-rose-600' : 'text-slate-900'}`}>
                                  {store.bakiye?.toLocaleString('tr-TR') || '0'} {store.currency === 'USD' ? '$' : '₺'}
                                </dd>
                              </div>
                              <div className="flex items-baseline justify-between gap-4">
                                <dt className="text-xs text-slate-500">Açık Hesap</dt>
                                <dd className="text-sm tabular-nums text-slate-900">
                                  {store.limitsiz_acik_hesap ? 'Limitsiz' : `${store.acik_hesap_tutari?.toLocaleString('tr-TR') || '0'} ${store.currency === 'USD' ? '$' : '₺'}`}
                                </dd>
                              </div>
                              <div className="flex items-baseline justify-between gap-4">
                                <dt className="text-xs text-slate-500">Max Taksit</dt>
                                <dd className="text-sm tabular-nums text-slate-900">{store.maksimum_taksit || 1}</dd>
                              </div>
                            </dl>
                          </td>
                        )}
                        <td className="whitespace-nowrap px-4 py-3 align-top">
                          <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                            store.is_active ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700'
                          }`}>
                            {store.is_active ? 'Aktif' : 'Pasif'}
                          </span>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <div className="flex flex-wrap items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => router.push(`/dashboard/magazalar/${store.store_id}/duzenle`)}
                              className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15"
                            >
                              Düzenle
                            </button>
                            <button
                              type="button"
                              onClick={() => router.push(`/dashboard/magazalar/${store.store_id}/adresler`)}
                              className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15"
                            >
                              Adresler
                            </button>
                            <button
                              type="button"
                              onClick={() => router.push(`/dashboard/magazalar/${store.store_id}/kullanicilar`)}
                              className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15"
                            >
                              Kullanıcılar
                            </button>
                            {isAdmin && (
                              <button
                                type="button"
                                onClick={() => router.push(`/dashboard/magazalar/${store.store_id}/adresler?mode=order`)}
                                className="inline-flex items-center justify-center rounded-lg bg-[#00365a] px-3 py-2 text-xs font-medium text-white transition hover:bg-[#004170] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/25"
                              >
                                Sipariş Ver
                              </button>
                            )}
                            {isAdmin && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedStore(store);
                                  setAssignModalVisible(true);
                                }}
                                className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15"
                              >
                                Fiyat Listesi
                              </button>
                            )}
                            {isAdmin && (
                              <button
                                type="button"
                                onClick={() => {
                                  setStoreToDelete(store);
                                  setDeleteModalVisible(true);
                                }}
                                className="inline-flex items-center justify-center rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-medium text-rose-600 transition hover:bg-rose-50 hover:text-rose-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/25"
                              >
                                Sil
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile/Tablet Card View */}
              <div className="divide-y divide-slate-100 xl:hidden">
                {filteredStores.map((store) => (
                  <div key={store.store_id} className="p-4 sm:p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="text-base font-medium text-slate-900">{store.kurum_adi}</h3>
                        {store.aciklama ? <p className="mt-0.5 text-xs text-slate-500">{store.aciklama}</p> : null}
                        {store.store_type && (
                          <p className="mt-1 text-xs text-slate-500">{storeTypeLabels[store.store_type as StoreType]}</p>
                        )}
                      </div>
                      <span className={`inline-flex shrink-0 items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                        store.is_active ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700'
                      }`}>
                        {store.is_active ? 'Aktif' : 'Pasif'}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Yetkili</p>
                        <p className="mt-1 text-sm font-medium text-slate-900">{store.yetkili_adi} {store.yetkili_soyadi}</p>
                        <p className="text-xs text-slate-500">{store.eposta}</p>
                        <p className="mt-0.5 text-xs text-slate-400">TCKN: {store.tckn}</p>
                      </div>

                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">İletişim</p>
                        <p className="mt-1 text-sm text-slate-900">{store.telefon}</p>
                        {store.faks_numarasi && <p className="text-xs text-slate-500">Faks: {store.faks_numarasi}</p>}
                        <p className="mt-0.5 text-xs text-slate-400">{store.adres}</p>
                      </div>

                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Vergi Bilgileri</p>
                        <p className="mt-1 text-sm text-slate-900">{store.vergi_numarasi}</p>
                        <p className="text-xs text-slate-500">{store.vergi_dairesi}</p>
                      </div>

                      {isAdmin && (
                        <div>
                          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Finansal Durum</p>
                          <dl className="mt-1 space-y-1">
                            <div className="flex items-baseline justify-between gap-4">
                              <dt className="text-xs text-slate-500">Bakiye</dt>
                              <dd className={`text-sm tabular-nums ${(store.bakiye || 0) < 0 ? 'font-medium text-rose-600' : 'text-slate-900'}`}>
                                {store.bakiye?.toLocaleString('tr-TR') || '0'} {store.currency === 'USD' ? '$' : '₺'}
                              </dd>
                            </div>
                            <div className="flex items-baseline justify-between gap-4">
                              <dt className="text-xs text-slate-500">Açık Hesap</dt>
                              <dd className="text-sm tabular-nums text-slate-900">
                                {store.limitsiz_acik_hesap ? 'Limitsiz' : `${store.acik_hesap_tutari?.toLocaleString('tr-TR') || '0'} ${store.currency === 'USD' ? '$' : '₺'}`}
                              </dd>
                            </div>
                            <div className="flex items-baseline justify-between gap-4">
                              <dt className="text-xs text-slate-500">Max Taksit</dt>
                              <dd className="text-sm tabular-nums text-slate-900">{store.maksimum_taksit || 1}</dd>
                            </div>
                          </dl>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        onClick={() => router.push(`/dashboard/magazalar/${store.store_id}/duzenle`)}
                        className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                      >
                        Düzenle
                      </button>
                      <button
                        onClick={() => router.push(`/dashboard/magazalar/${store.store_id}/adresler`)}
                        className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                      >
                        Adresler
                      </button>
                      <button
                        onClick={() => router.push(`/dashboard/magazalar/${store.store_id}/kullanicilar`)}
                        className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                      >
                        Kullanıcılar
                      </button>
                      {isAdmin && (
                        <button
                          onClick={() => router.push(`/dashboard/magazalar/${store.store_id}/adresler?mode=order`)}
                          className="inline-flex items-center justify-center rounded-lg bg-[#00365a] px-3 py-2 text-xs font-medium text-white transition hover:bg-[#004170]"
                        >
                          Sipariş Ver
                        </button>
                      )}
                      {isAdmin && (
                        <button
                          onClick={() => {
                            setSelectedStore(store);
                            setAssignModalVisible(true);
                          }}
                          className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                        >
                          Fiyat Listesi
                        </button>
                      )}

                      {isAdmin && (
                        <button
                          onClick={() => {
                            setStoreToDelete(store);
                            setDeleteModalVisible(true);
                          }}
                          className="inline-flex items-center justify-center rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-medium text-rose-600 transition hover:bg-rose-50 hover:text-rose-700"
                        >
                          Sil
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="px-6 py-16 text-center">
              <h3 className="text-sm font-medium text-slate-900">Mağaza Bulunamadı</h3>
              <p className="mx-auto mt-1.5 max-w-md text-sm text-slate-500">
                {searchTerm || statusFilter !== 'all'
                  ? 'Arama kriterlerinize uygun mağaza bulunamadı. Filtreleri temizleyerek tekrar deneyin.'
                  : 'Henüz hiç mağaza eklenmemiş. İlk mağazayı ekleyerek başlayın.'
                }
              </p>
              <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
                <button onClick={() => router.push('/dashboard/magazalar/ekle')} className="inline-flex items-center justify-center rounded-lg bg-[#00365a] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#004170] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/25 disabled:cursor-not-allowed disabled:opacity-50">
                  İlk Mağazayı Ekle
                </button>
                {(searchTerm || statusFilter !== 'all') && (
                  <button
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
        {deleteModalVisible && storeToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
            <div className="w-full max-w-md overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-lg">
              <div className="border-b border-slate-200/80 px-5 py-4">
                <h3 className="text-base font-semibold text-slate-900">Mağaza Sil</h3>
              </div>

              <div className="px-5 py-5">
                <p className="text-sm text-slate-700">
                  <span className="font-medium text-slate-900">{storeToDelete.kurum_adi}</span> mağazasını silmek
                  istediğinize emin misiniz?
                </p>
                <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-3">
                  <p className="text-sm text-rose-700">
                    Bu işlem geri alınamaz ve mağazaya bağlı tüm kullanıcı bağlantıları kaldırılacaktır.
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-200/80 bg-slate-50/60 px-5 py-3.5">
                <button
                  onClick={() => {
                    setDeleteModalVisible(false);
                    setStoreToDelete(null);
                  }}
                  className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15"
                >
                  İptal
                </button>
                <button onClick={handleDelete} disabled={deleteLoading} className="inline-flex items-center justify-center rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-rose-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/25 disabled:cursor-not-allowed disabled:opacity-50">
                  {deleteLoading ? 'Siliniyor...' : 'Sil'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Price List Assignment Modal */}
        {assignModalVisible && selectedStore && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
            <div className="w-full max-w-md rounded-xl border border-slate-200/80 bg-white shadow-lg">
              <div className="border-b border-slate-200/80 px-5 py-4">
                <h3 className="text-base font-semibold text-slate-900">Fiyat Listesi Ata</h3>
                <p className="mt-0.5 text-xs text-slate-500">{selectedStore.kurum_adi}</p>
              </div>

              <div className="px-5 py-5">
                <div className="dropdown-container">
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">Fiyat Listesi Seçin</label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setPriceListDropdownOpen(!priceListDropdownOpen)}
                      className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition hover:border-slate-400 focus:border-[#00365a] focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15 pr-9 text-left"
                    >
                      <span className={selectedPriceList ? "text-slate-900" : "text-slate-400"}>
                        {selectedPriceList
                          ? formatPriceListDisplay(selectedPriceList)
                          : "Fiyat listesi seçin"
                        }
                      </span>
                      <svg
                        className={`absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-transform ${priceListDropdownOpen ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={1.8}
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {priceListDropdownOpen && (
                      <div className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                        <button
                          type="button"
                          className={`block w-full px-3 py-2 text-left text-sm transition-colors hover:bg-slate-50 ${
                            !selectedPriceList ? 'bg-[#00365a]/[0.06] font-medium text-[#00365a]' : 'text-slate-700'
                          }`}
                          onClick={() => {
                            setSelectedPriceList("");
                            setPriceListDropdownOpen(false);
                          }}
                        >
                          Fiyat listesi seçin
                        </button>
                        {priceLists.map(list => (
                          <button
                            key={list.price_list_id}
                            type="button"
                            className={`block w-full px-3 py-2 text-left text-sm transition-colors hover:bg-slate-50 ${
                              selectedPriceList === list.price_list_id ? 'bg-[#00365a]/[0.06] font-medium text-[#00365a]' : 'text-slate-700'
                            }`}
                            onClick={() => {
                              setSelectedPriceList(list.price_list_id);
                              setPriceListDropdownOpen(false);
                            }}
                          >
                            {formatPriceListDisplay(list.price_list_id)}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 rounded-b-xl border-t border-slate-200/80 bg-slate-50/60 px-5 py-3.5">
                <button
                  onClick={() => {
                    setAssignModalVisible(false);
                    setSelectedStore(null);
                    setSelectedPriceList('');
                  }}
                  className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15"
                >
                  İptal
                </button>
                <button
                  onClick={handleAssignPriceList}
                  disabled={assignLoading || !selectedPriceList}
                  className="inline-flex items-center justify-center rounded-lg bg-[#00365a] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#004170] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/25 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {assignLoading ? 'Atanıyor...' : 'Ata'}
                </button>
              </div>
            </div>
          </div>
        )}
        {notice.isOpen && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-md rounded-xl border border-slate-200/80 bg-white p-6">
              <h3 className="mb-3 text-lg font-semibold tracking-tight text-slate-900">{notice.title}</h3>
              <p className={`mb-6 text-sm ${notice.isError ? 'text-rose-700' : 'text-slate-500'}`}>{notice.message}</p>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setNotice((prev) => ({ ...prev, isOpen: false }))}
                  className="rounded-lg bg-[#00365a] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#004170]"
                >
                  Tamam
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
