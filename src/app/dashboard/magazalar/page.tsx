'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Store, getStores, deleteStore, PriceList, getPriceLists, assignStorePriceList } from '@/services/api';
import { useAuth } from '@/app/context/AuthContext';
import { StoreType, storeTypeLabels, storeTypeColors, storeTypeIcons } from '@/components/StoreTypeSelector';

// Custom Tooltip Component
interface TooltipProps {
  children: React.ReactNode;
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

const Tooltip: React.FC<TooltipProps> = ({ children, content, position = 'top' }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  const positionClasses = {
    top: 'bottom-full left-1/2 transform -translate-x-1/2 mb-3',
    bottom: 'top-full left-1/2 transform -translate-x-1/2 mt-3',
    left: 'right-full top-1/2 transform -translate-y-1/2 mr-3',
    right: 'left-full top-1/2 transform -translate-y-1/2 ml-3'
  };

  const arrowClasses = {
    top: 'top-full left-1/2 transform -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent border-t-gray-900',
    bottom: 'bottom-full left-1/2 transform -translate-x-1/2 border-l-transparent border-r-transparent border-t-transparent border-b-gray-900',
    left: 'left-full top-1/2 transform -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent border-l-gray-900',
    right: 'right-full top-1/2 transform -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent border-r-gray-900'
  };

  const handleMouseEnter = () => {
    setIsVisible(true);
    setTimeout(() => setShowTooltip(true), 150); // 150ms delay
  };

  const handleMouseLeave = () => {
    setIsVisible(false);
    setShowTooltip(false);
  };

  return (
    <div 
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {isVisible && (
        <div className={`absolute z-50 ${positionClasses[position]} pointer-events-none`}>
          <div className={`
            bg-gradient-to-br from-gray-900 to-gray-800 text-white text-sm px-4 py-2.5 
            rounded-xl shadow-2xl max-w-xs whitespace-nowrap
            transition-all duration-300 ease-out border border-gray-700
            ${showTooltip 
              ? 'opacity-100 scale-100 translate-y-0' 
              : 'opacity-0 scale-95 translate-y-1'
            }
          `}>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse"></div>
              <span className="font-medium tracking-wide">{content}</span>
            </div>
            <div className={`absolute w-0 h-0 border-[6px] ${arrowClasses[position]}`}></div>
          </div>
        </div>
      )}
    </div>
  );
};

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
      alert(error.message || 'Mağazalar yüklenirken bir hata oluştu');
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
      alert('Fiyat listeleri yüklenirken bir hata oluştu');
    }
  };

  const handleDelete = async () => {
    if (!storeToDelete) return;
    
    setDeleteLoading(true);
    try {
      await deleteStore(storeToDelete.store_id);
      alert('Mağaza başarıyla silindi');
      setStores(stores.filter(store => store.store_id !== storeToDelete.store_id));
      setDeleteModalVisible(false);
      setStoreToDelete(null);
      
      // Verileri yenilemek için referansı sıfırla
      storesFetchedRef.current = false;
    } catch (error: any) {
      alert(error.message || 'Mağaza silinirken bir hata oluştu');
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
      alert('Fiyat listesi başarıyla atandı');
      setAssignModalVisible(false);
      setSelectedStore(null);
      setSelectedPriceList('');
      
      // Mağaza listesini yenilemek için referansı sıfırla
      storesFetchedRef.current = false;
      fetchStores();
    } catch (error: any) {
      alert(error.message || 'Fiyat listesi atanırken bir hata oluştu');
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
      <div className="p-6 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-[#00365a]"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <svg className="w-6 h-6 text-[#00365a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
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

  // Admin ve Editör kontrolü
  if (!isAdminOrEditor) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center max-w-md">
          <div className="w-20 h-20 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="h-10 w-10 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-3">Erişim Reddedildi</h3>
          <p className="text-gray-600 mb-8 leading-relaxed">Bu sayfaya erişim yetkiniz bulunmamaktadır. Mağaza yönetimi sadece admin ve editör kullanıcılar tarafından kullanılabilir.</p>
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
      <div className="max-w-[1600px] mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
              <h1 className="text-3xl font-bold text-[#00365a] flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mr-3" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm3 1h6v4H7V5zm8 8v2a1 1 0 01-1 1H6a1 1 0 01-1-1v-2h10z" clipRule="evenodd" />
                </svg>
                Mağazalar
              </h1>
              <p className="text-gray-600 mt-2">Mağaza bilgilerini görüntüleyin ve yönetin</p>
            </div>
            <button
              onClick={() => router.push('/dashboard/magazalar/ekle')}
              className="bg-[#00365a] hover:bg-[#004170] text-white px-6 py-3 rounded-lg font-semibold transition-all shadow-md hover:shadow-lg flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span>Yeni Mağaza</span>
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
                  placeholder="Mağaza, yetkili adı, e-posta..."
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <h3 className="text-lg font-semibold text-white">Mağaza Listesi</h3>
              <span className="ml-4 text-blue-100 text-sm">({filteredStores.length} mağaza)</span>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center h-48 p-6">
              <div className="relative">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-[#00365a]"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg className="w-6 h-6 text-[#00365a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
              </div>
              <div className="text-center mt-4">
                <h3 className="text-lg font-semibold text-gray-900">Mağazalar Yükleniyor</h3>
                <p className="text-sm text-gray-500 mt-1">Lütfen bekleyiniz...</p>
              </div>
            </div>
          ) : filteredStores.length > 0 ? (
            <>
              {/* Desktop Table View */}
              <div className="hidden xl:block overflow-x-auto">
                <table className="w-full min-w-[1400px] divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Mağaza Bilgileri
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Mağaza Türü
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Yetkili
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        İletişim
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Finansal Durum
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Durum
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-96">
                        İşlemler
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredStores.map((store) => (
                      <tr key={store.store_id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div>
                            <div className="text-sm font-semibold text-gray-900">{store.kurum_adi}</div>
                            <div className="text-sm text-gray-500">{store.aciklama}</div>
                            <div className="text-xs text-gray-400 mt-1">
                              VN: {store.vergi_numarasi} • {store.vergi_dairesi}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {store.store_type ? (
                            <div className={`inline-flex items-center gap-2 px-3 py-1 text-xs rounded-full border ${storeTypeColors[store.store_type as StoreType]}`}>
                              {storeTypeIcons[store.store_type as StoreType]}
                              {storeTypeLabels[store.store_type as StoreType]}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">Belirtilmemiş</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {store.yetkili_adi} {store.yetkili_soyadi}
                            </div>
                            <div className="text-sm text-gray-500">{store.eposta}</div>
                            <div className="text-xs text-gray-400 mt-1">TCKN: {store.tckn}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
        <div>
                            <div className="text-sm text-gray-900">{store.telefon}</div>
                            {store.faks_numarasi && (
                              <div className="text-sm text-gray-500">Faks: {store.faks_numarasi}</div>
                            )}
                            <div className="text-xs text-gray-400 mt-1">{store.adres}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            <div className="text-sm">
                              <span className="font-medium text-gray-700">Bakiye:</span>
                              <span className={`ml-1 font-semibold ${(store.bakiye || 0) < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {store.bakiye?.toLocaleString('tr-TR') || '0'} {store.currency === 'USD' ? '$' : '₺'}
                              </span>
                            </div>
                            <div className="text-sm">
                              <span className="font-medium text-gray-700">Açık Hesap:</span>
                              <span className="ml-1 text-[#00365a] font-semibold">
                                {store.limitsiz_acik_hesap ? 'Limitsiz' : `${store.acik_hesap_tutari?.toLocaleString('tr-TR') || '0'} ${store.currency === 'USD' ? '$' : '₺'}`}
                              </span>
                            </div>
                            <div className="text-sm">
                              <span className="font-medium text-gray-700">Max Taksit:</span>
                              <span className="ml-1 text-orange-600 font-semibold">{store.maksimum_taksit || 1}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                            store.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {store.is_active ? 'Aktif' : 'Pasif'}
                          </span>
                        </td>
                        <td className="px-6 py-4 w-96">
                          <div className="flex gap-1 items-center justify-start">
                            <Tooltip content="Mağaza Bilgilerini Düzenle" position="top">
                              <button
                                onClick={() => router.push(`/dashboard/magazalar/${store.store_id}/duzenle`)}
                                className="text-[#00365a] hover:text-[#004170] p-2 rounded-lg hover:bg-blue-50 transition-all shadow-sm hover:shadow-md group"
                              >
                                <svg className="w-4 h-4 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                            </Tooltip>
                            
                            <Tooltip content="Adres Yönetimi" position="top">
                              <button
                                onClick={() => router.push(`/dashboard/magazalar/${store.store_id}/adresler`)}
                                className="text-green-600 hover:text-green-700 p-2 rounded-lg hover:bg-green-50 transition-all shadow-sm hover:shadow-md group"
                              >
                                <svg className="w-4 h-4 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                              </button>
                            </Tooltip>
                            
                            <Tooltip content="Kullanıcı Yönetimi" position="top">
                              <button
                                onClick={() => router.push(`/dashboard/magazalar/${store.store_id}/kullanicilar`)}
                                className="text-orange-600 hover:text-orange-700 p-2 rounded-lg hover:bg-orange-50 transition-all shadow-sm hover:shadow-md group"
                              >
                                <svg className="w-4 h-4 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                                </svg>
                              </button>
                            </Tooltip>
                            
                            <Tooltip content="Mağaza için Sipariş Oluştur" position="top">
                              <button
                                onClick={() => router.push(`/dashboard/magazalar/${store.store_id}/adresler?mode=order`)}
                                className="text-purple-600 hover:text-purple-700 p-2 rounded-lg hover:bg-purple-50 transition-all shadow-sm hover:shadow-md group"
                              >
                                <svg className="w-4 h-4 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                                </svg>
                              </button>
                            </Tooltip>
                            
                            <Tooltip content="Fiyat Listesi Atama" position="top">
                              <button
                                onClick={() => {
                                  setSelectedStore(store);
                                  setAssignModalVisible(true);
                                }}
                                className="text-blue-600 hover:text-blue-700 p-2 rounded-lg hover:bg-blue-50 transition-all shadow-sm hover:shadow-md group"
                              >
                                <svg className="w-4 h-4 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                                </svg>
                              </button>
                            </Tooltip>

                            {isAdmin && (
                              <Tooltip content="Mağazayı Sil" position="top">
                                <button
                                  onClick={() => {
                                    setStoreToDelete(store);
                                    setDeleteModalVisible(true);
                                  }}
                                  className="text-red-600 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-all shadow-sm hover:shadow-md group"
                                >
                                  <svg className="w-4 h-4 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </Tooltip>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile/Tablet Card View */}
              <div className="xl:hidden p-6">
                <div className="space-y-6">
                  {filteredStores.map((store) => (
                    <div key={store.store_id} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">{store.kurum_adi}</h3>
                            {store.store_type && (
                              <div className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full border ${storeTypeColors[store.store_type as StoreType]}`}>
                                {storeTypeIcons[store.store_type as StoreType]}
                                {storeTypeLabels[store.store_type as StoreType]}
                              </div>
                            )}
                          </div>
                          <p className="text-sm text-gray-500">{store.aciklama}</p>
                          <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full mt-2 ${
                            store.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {store.is_active ? 'Aktif' : 'Pasif'}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div className="bg-blue-50 rounded-lg p-4">
                          <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                            <svg className="w-4 h-4 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            Yetkili
                          </h4>
                          <p className="text-sm font-medium text-gray-900">{store.yetkili_adi} {store.yetkili_soyadi}</p>
                          <p className="text-sm text-gray-500">{store.eposta}</p>
                          <p className="text-xs text-gray-400">TCKN: {store.tckn}</p>
                        </div>

                        <div className="bg-green-50 rounded-lg p-4">
                          <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                            <svg className="w-4 h-4 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                            İletişim
                          </h4>
                          <p className="text-sm text-gray-900">{store.telefon}</p>
                          {store.faks_numarasi && <p className="text-sm text-gray-500">Faks: {store.faks_numarasi}</p>}
                          <p className="text-xs text-gray-400">{store.adres}</p>
                        </div>

                        <div className="bg-purple-50 rounded-lg p-4">
                          <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                            <svg className="w-4 h-4 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Vergi Bilgileri
                          </h4>
                          <p className="text-sm text-gray-900">{store.vergi_numarasi}</p>
                          <p className="text-sm text-gray-500">{store.vergi_dairesi}</p>
                        </div>

                        <div className="bg-orange-50 rounded-lg p-4">
                          <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                            <svg className="w-4 h-4 mr-2 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                            </svg>
                            Finansal Durum
                          </h4>
                          <div className="space-y-1">
          <div className="text-sm">
            <span className="font-medium">Bakiye:</span> 
                              <span className={`ml-1 font-semibold ${(store.bakiye || 0) < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {store.bakiye?.toLocaleString('tr-TR') || '0'} {store.currency === 'USD' ? '$' : '₺'}
            </span>
          </div>
          <div className="text-sm">
                              <span className="font-medium">Açık Hesap:</span>
                              <span className="ml-1 text-orange-600 font-semibold">
                                {store.limitsiz_acik_hesap ? 'Limitsiz' : `${store.acik_hesap_tutari?.toLocaleString('tr-TR') || '0'} ${store.currency === 'USD' ? '$' : '₺'}`}
                              </span>
          </div>
          <div className="text-sm">
                              <span className="font-medium">Max Taksit:</span>
                              <span className="ml-1 text-purple-600 font-semibold">{store.maksimum_taksit || 1}</span>
                            </div>
          </div>
          </div>
        </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => router.push(`/dashboard/magazalar/${store.store_id}/duzenle`)}
                          className="flex items-center gap-2 px-4 py-2 bg-[#00365a] hover:bg-[#004170] text-white rounded-lg font-medium transition-all shadow-sm hover:shadow-md"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
            Düzenle
                        </button>
                        <button
                          onClick={() => router.push(`/dashboard/magazalar/${store.store_id}/adresler`)}
                          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-all shadow-sm hover:shadow-md"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          Adresler
                        </button>
                        <button
                          onClick={() => router.push(`/dashboard/magazalar/${store.store_id}/kullanicilar`)}
                          className="flex items-center gap-2 px-5 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-all shadow-sm hover:shadow-md"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                          </svg>
                          Kullanıcılar
                        </button>
                        <button
                          onClick={() => router.push(`/dashboard/magazalar/${store.store_id}/adresler?mode=order`)}
                          className="flex items-center gap-2 px-5 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-all shadow-sm hover:shadow-md"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                          </svg>
                          Sipariş Ver
                        </button>
                        <button
                          onClick={() => router.push(`/dashboard/magazalar/${store.store_id}/adresler`)}
                          className="flex items-center gap-2 px-5 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-all shadow-sm hover:shadow-md"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          Adresler
                        </button>
                        <button
            onClick={() => {
                            setSelectedStore(store);
              setAssignModalVisible(true);
            }}
                          className="flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all shadow-sm hover:shadow-md"
          >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                          </svg>
            Fiyat Listesi
                        </button>
                        
                        {isAdmin && (
                          <button
                            onClick={() => {
                              setStoreToDelete(store);
                              setDeleteModalVisible(true);
                            }}
                            className="flex items-center gap-2 px-5 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-all shadow-sm hover:shadow-md"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Sil
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-16 p-6">
              <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center">
                <svg className="w-12 h-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
        </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Mağaza Bulunamadı</h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto leading-relaxed">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Arama kriterlerinize uygun mağaza bulunamadı. Filtreleri temizleyerek tekrar deneyin.'
                  : 'Henüz hiç mağaza eklenmemiş. İlk mağazayı ekleyerek başlayın.'
                }
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
            onClick={() => router.push('/dashboard/magazalar/ekle')}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-[#00365a] hover:bg-[#004170] text-white rounded-lg font-semibold transition-all shadow-md hover:shadow-lg"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  İlk Mağazayı Ekle
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
        {deleteModalVisible && storeToDelete && (
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
                  <h3 className="text-xl font-bold">Mağaza Sil</h3>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                <p className="text-gray-900 mb-4">
                  <strong>{storeToDelete.kurum_adi}</strong> mağazasını silmek istediğinize emin misiniz?
                </p>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-700 text-sm">
                    ⚠️ Bu işlem geri alınamaz ve mağazaya bağlı tüm kullanıcı bağlantıları kaldırılacaktır.
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="bg-gray-50 px-6 py-4 rounded-b-2xl flex justify-end gap-3">
                <button
            onClick={() => {
              setDeleteModalVisible(false);
              setStoreToDelete(null);
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

        {/* Price List Assignment Modal */}
        {assignModalVisible && selectedStore && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
              {/* Header */}
              <div className="bg-[#00365a] text-white rounded-t-2xl p-6">
                <div className="flex items-center">
                  <div className="bg-white bg-opacity-20 rounded-xl p-2 mr-3">
                    <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold">Fiyat Listesi Ata</h3>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                <p className="text-gray-900 mb-4">
                  <strong>{selectedStore.kurum_adi}</strong> mağazasına fiyat listesi atayın.
                </p>
                <div className="mb-4 dropdown-container">
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Fiyat Listesi Seçin
                  </label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setPriceListDropdownOpen(!priceListDropdownOpen)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#00365a] focus:border-transparent transition-all text-left bg-white"
                    >
                      <span className={selectedPriceList ? "text-gray-900" : "text-gray-500"}>
                        {selectedPriceList 
                          ? formatPriceListDisplay(selectedPriceList)
                          : "Fiyat listesi seçin"
                        }
                      </span>
                      <svg 
                        className={`absolute right-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 transition-transform ${priceListDropdownOpen ? 'rotate-180' : ''}`}
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    
                    {priceListDropdownOpen && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        <div
                          className={`px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${
                            !selectedPriceList ? 'bg-blue-50 text-blue-900' : 'text-gray-900'
                          }`}
                          onClick={() => {
                            setSelectedPriceList("");
                            setPriceListDropdownOpen(false);
                          }}
                        >
                          Fiyat listesi seçin
                        </div>
                        {priceLists.map(list => (
                          <div
                            key={list.price_list_id}
                            className={`px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${
                              selectedPriceList === list.price_list_id ? 'bg-blue-50 text-blue-900' : 'text-gray-900'
                            }`}
                            onClick={() => {
                              setSelectedPriceList(list.price_list_id);
                              setPriceListDropdownOpen(false);
                            }}
                          >
                            {formatPriceListDisplay(list.price_list_id)}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="bg-gray-50 px-6 py-4 rounded-b-2xl flex justify-end gap-3">
                <button
            onClick={() => {
              setAssignModalVisible(false);
              setSelectedStore(null);
              setSelectedPriceList('');
            }}
                  className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-semibold transition-all"
          >
            İptal
                </button>
                <button
            onClick={handleAssignPriceList}
                  disabled={assignLoading || !selectedPriceList}
                  className="px-6 py-3 bg-[#00365a] hover:bg-[#004170] text-white rounded-lg font-semibold transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
                  {assignLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      Atanıyor...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Ata
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