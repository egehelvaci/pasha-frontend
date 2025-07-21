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
      <div className="p-6 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-[#00365a]"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <svg className="w-6 h-6 text-[#00365a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
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
          <p className="text-gray-600 mb-8 leading-relaxed">Bu sayfaya erişim yetkiniz bulunmamaktadır. Fiyat listesi yönetimi sadece admin kullanıcılar tarafından kullanılabilir.</p>
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
      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-[#00365a] flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mr-3" viewBox="0 0 20 20" fill="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
                Fiyat Listeleri
              </h1>
              <p className="text-gray-600 mt-2">Fiyat listelerini görüntüleyin ve yönetin</p>
            </div>
            <button
              onClick={() => router.push('/dashboard/fiyat-listeleri/ekle')}
              className="bg-[#00365a] hover:bg-[#004170] text-white px-6 py-3 rounded-lg font-semibold transition-all shadow-md hover:shadow-lg flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span>Yeni Fiyat Listesi</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-[#00365a]" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.553.894l-2 1A1 1 0 018 16v-4.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
            </svg>
            <h3 className="text-lg font-semibold text-[#00365a]">Filtreler</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Arama</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Liste adı, açıklama..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#00365a] focus:border-transparent transition-all"
                />
                <svg className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle cx="11" cy="11" r="8"/>
                  <path d="M21 21l-4.35-4.35"/>
                </svg>
              </div>
            </div>
            <div className="dropdown-container">
              <label className="block text-sm font-medium text-gray-700 mb-2">Durum</label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#00365a] focus:border-transparent transition-all text-left bg-white"
                >
                  <span className="text-gray-900">
                    {statusFilter === "all" && "Tüm Durumlar"}
                    {statusFilter === "active" && "Aktif"}
                    {statusFilter === "inactive" && "Pasif"}
                    {statusFilter === "default" && "Varsayılan"}
                  </span>
                  <svg 
                    className={`absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 transition-transform ${statusDropdownOpen ? 'rotate-180' : ''}`}
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {statusDropdownOpen && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    <div
                      className={`px-3 py-2 cursor-pointer hover:bg-gray-50 transition-colors ${
                        statusFilter === "all" ? 'bg-blue-50 text-blue-900' : 'text-gray-900'
                      }`}
                      onClick={() => {
                        setStatusFilter("all");
                        setStatusDropdownOpen(false);
                      }}
                    >
                      Tüm Durumlar
                    </div>
                    <div
                      className={`px-3 py-2 cursor-pointer hover:bg-gray-50 transition-colors ${
                        statusFilter === "active" ? 'bg-blue-50 text-blue-900' : 'text-gray-900'
                      }`}
                      onClick={() => {
                        setStatusFilter("active");
                        setStatusDropdownOpen(false);
                      }}
                    >
                      Aktif
                    </div>
                    <div
                      className={`px-3 py-2 cursor-pointer hover:bg-gray-50 transition-colors ${
                        statusFilter === "inactive" ? 'bg-blue-50 text-blue-900' : 'text-gray-900'
                      }`}
                      onClick={() => {
                        setStatusFilter("inactive");
                        setStatusDropdownOpen(false);
                      }}
                    >
                      Pasif
                    </div>
                    <div
                      className={`px-3 py-2 cursor-pointer hover:bg-gray-50 transition-colors ${
                        statusFilter === "default" ? 'bg-blue-50 text-blue-900' : 'text-gray-900'
                      }`}
                      onClick={() => {
                        setStatusFilter("default");
                        setStatusDropdownOpen(false);
                      }}
                    >
                      Varsayılan
                    </div>
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
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors w-full font-medium"
              >
                Temizle
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-[#00365a]">
            <div className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
              <h3 className="text-lg font-semibold text-white">Fiyat Listesi</h3>
              <span className="ml-4 text-blue-100 text-sm">({filteredPriceLists.length} liste)</span>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center h-48 p-6">
              <div className="relative">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-[#00365a]"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg className="w-6 h-6 text-[#00365a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
              </div>
              <div className="text-center mt-4">
                <h3 className="text-lg font-semibold text-gray-900">Fiyat Listeleri Yükleniyor</h3>
                <p className="text-sm text-gray-500 mt-1">Lütfen bekleyiniz...</p>
              </div>
            </div>
          ) : filteredPriceLists.length > 0 ? (
            <>
              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Liste Bilgileri
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Geçerlilik
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Limit & Para Birimi
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Durum
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Ürün Sayısı
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        İşlemler
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredPriceLists.map((priceList) => {
                      const status = getPriceListStatus(priceList);
                      return (
                        <tr key={priceList.price_list_id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4">
                            <div>
                              <div className="flex items-center">
                                <div className="text-sm font-semibold text-gray-900">{priceList.name}</div>
                                {priceList.is_default && (
                                  <span className="ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                                    Varsayılan
                                  </span>
                                )}
                              </div>
                              <div className="text-sm text-gray-500">{priceList.description}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div>
                              {priceList.valid_from || priceList.valid_to ? (
                                <>
                                  <div className="text-sm text-gray-900">
                                    {priceList.valid_from ? new Date(priceList.valid_from).toLocaleDateString('tr-TR') : 'Başlangıç: -'}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    {priceList.valid_to ? new Date(priceList.valid_to).toLocaleDateString('tr-TR') : 'Bitiş: -'}
                                  </div>
                                </>
                              ) : (
                                <span className="inline-flex px-3 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                  Süresiz
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div>
                              <div className="text-sm text-gray-900">
                                {priceList.limit_amount ? (
                                  `${priceList.limit_amount.toLocaleString('tr-TR')} ${priceList.currency}`
                                ) : (
                                  <span className="inline-flex px-3 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                    Limitsiz
                                  </span>
                                )}
                              </div>
                              <div className="text-sm text-gray-500">Para birimi: {priceList.currency}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                                status.statusColor === 'green' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {status.statusText}
                              </span>
                              {(status.isExpired || status.isLimitLow) && !priceList.is_default && (
                                <div className="text-xs text-gray-500 mt-1">
                                  {status.isExpired && (priceList.valid_to && new Date(priceList.valid_to) < new Date() ? 'Süresi dolmuş' : 'Henüz başlamamış')}
                                  {status.isLimitLow && 'Limit yetersiz (≤1000 TL)'}
                                  {status.isExpired && status.isLimitLow && ' & '}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{priceList.PriceListDetail?.length || 0}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex gap-2">
                              <button
                                onClick={() => router.push(`/dashboard/fiyat-listeleri/${priceList.price_list_id}/duzenle`)}
                                className="text-[#00365a] hover:text-[#004170] flex items-center gap-1 px-3 py-1 rounded-lg hover:bg-blue-50 transition-all"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                Güncelle
                              </button>
                              {!priceList.is_default && (
                                <button
                                  onClick={() => {
                                    setPriceListToDelete(priceList);
                                    setDeleteModalVisible(true);
                                  }}
                                  className="text-red-600 hover:text-red-700 flex items-center gap-1 px-3 py-1 rounded-lg hover:bg-red-50 transition-all"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                  Sil
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
              <div className="lg:hidden p-6">
                <div className="space-y-6">
                  {filteredPriceLists.map((priceList) => {
                    const status = getPriceListStatus(priceList);
                    return (
                      <div key={priceList.price_list_id} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex-1">
                            <div className="flex items-center mb-2">
                              <h3 className="text-lg font-semibold text-gray-900">{priceList.name}</h3>
                              {priceList.is_default && (
                                <span className="ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                                  Varsayılan
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-500 mb-3">{priceList.description}</p>
                            <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                              status.statusColor === 'green' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {status.statusText}
                            </span>
                            {(status.isExpired || status.isLimitLow) && !priceList.is_default && (
                              <div className="text-xs text-gray-500 mt-1">
                                {status.isExpired && (priceList.valid_to && new Date(priceList.valid_to) < new Date() ? 'Süresi dolmuş' : 'Henüz başlamamış')}
                                {status.isLimitLow && 'Limit yetersiz (≤1000 TL)'}
                                {status.isExpired && status.isLimitLow && ' & '}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div className="bg-blue-50 rounded-lg p-4">
                            <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                              <svg className="w-4 h-4 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              Geçerlilik Tarihi
                            </h4>
                            {priceList.valid_from || priceList.valid_to ? (
                              <>
                                <p className="text-sm text-gray-900">
                                  Başlangıç: {priceList.valid_from ? new Date(priceList.valid_from).toLocaleDateString('tr-TR') : '-'}
                                </p>
                                <p className="text-sm text-gray-900">
                                  Bitiş: {priceList.valid_to ? new Date(priceList.valid_to).toLocaleDateString('tr-TR') : '-'}
                                </p>
                              </>
                            ) : (
                              <span className="inline-flex px-3 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                Süresiz
                              </span>
                            )}
                          </div>

                          <div className="bg-green-50 rounded-lg p-4">
                            <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                              <svg className="w-4 h-4 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                              </svg>
                              Finansal Bilgiler
                            </h4>
                            <p className="text-sm text-gray-900">
                              Limit: {priceList.limit_amount ? 
                                `${priceList.limit_amount.toLocaleString('tr-TR')} ${priceList.currency}` : 
                                'Limitsiz'
                              }
                            </p>
                            <p className="text-sm text-gray-500">Para birimi: {priceList.currency}</p>
                          </div>

                          <div className="bg-purple-50 rounded-lg p-4">
                            <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                              <svg className="w-4 h-4 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                              </svg>
                              Ürün Sayısı
                            </h4>
                            <p className="text-sm text-gray-900 font-semibold">{priceList.PriceListDetail?.length || 0} ürün</p>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => router.push(`/dashboard/fiyat-listeleri/${priceList.price_list_id}/duzenle`)}
                            className="flex items-center gap-2 px-4 py-2 bg-[#00365a] hover:bg-[#004170] text-white rounded-lg font-medium transition-all shadow-sm hover:shadow-md"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Güncelle
                          </button>
                          {!priceList.is_default && (
                            <button
                              onClick={() => {
                                setPriceListToDelete(priceList);
                                setDeleteModalVisible(true);
                              }}
                              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-all shadow-sm hover:shadow-md"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              Sil
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-16 p-6">
              <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center">
                <svg className="w-12 h-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Fiyat Listesi Bulunamadı</h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto leading-relaxed">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Arama kriterlerinize uygun fiyat listesi bulunamadı. Filtreleri temizleyerek tekrar deneyin.'
                  : 'Henüz hiç fiyat listesi eklenmemiş. İlk fiyat listesini ekleyerek başlayın.'
                }
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={() => router.push('/dashboard/fiyat-listeleri/ekle')}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-[#00365a] hover:bg-[#004170] text-white rounded-lg font-semibold transition-all shadow-md hover:shadow-lg"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  İlk Fiyat Listesini Ekle
                </button>
                {(searchTerm || statusFilter !== 'all') && (
                  <button
                    onClick={() => {
                      setSearchTerm("");
                      setStatusFilter("all");
                    }}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-white hover:bg-gray-50 text-[#00365a] border-2 border-[#00365a] rounded-lg font-semibold transition-all hover:shadow-md"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Filtreleri Temizle
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Delete Confirmation Modal */}
        {deleteModalVisible && priceListToDelete && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
              {/* Header */}
              <div className="bg-red-600 text-white rounded-t-2xl p-6">
                <div className="flex items-center">
                  <div className="bg-white bg-opacity-20 rounded-xl p-2 mr-3">
                    <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold">Fiyat Listesi Sil</h3>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                <p className="text-gray-900 mb-4">
                  <strong>{priceListToDelete.name}</strong> fiyat listesini silmek istediğinize emin misiniz?
                </p>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-700 text-sm">
                    ⚠️ Bu işlem geri alınamaz ve fiyat listesine bağlı tüm fiyatlar silinecektir.
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="bg-gray-50 px-6 py-4 rounded-b-2xl flex justify-end gap-3">
                <button
                  onClick={() => {
                    setDeleteModalVisible(false);
                    setPriceListToDelete(null);
                  }}
                  className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-semibold transition-all"
                >
                  İptal
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleteLoading}
                  className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {deleteLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      Siliniyor...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Sil
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 