'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { getStoreUsers, StoreUser, getStores, Store } from '@/services/api';

export default function StoreUsersPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { isAdmin, isAdminOrEditor, isLoading: authLoading } = useAuth();
  
  const selectedAddressId = searchParams.get('selectedAddressId');
  const selectedAddressTitle = searchParams.get('selectedAddressTitle');
  const [users, setUsers] = useState<StoreUser[]>([]);
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const storeId = params.storeId as string;

  useEffect(() => {
    // Sipariş modu (selectedAddressId varsa) - tüm kullanıcılar erişebilir
    // Normal mod - sadece admin/editör erişebilir
    const isOrderMode = !!selectedAddressId;
    
    if (!authLoading && !isOrderMode && !isAdminOrEditor) {
      router.push('/dashboard');
      return;
    }
    
    // Kimlik doğrulama yüklemesi tamamlandığında veri çek
    if (!authLoading && storeId && (isOrderMode || isAdminOrEditor)) {
      fetchStoreUsers();
      fetchStoreInfo();
    }
  }, [isAdminOrEditor, authLoading, router, storeId, selectedAddressId]);

  const fetchStoreUsers = async () => {
    setLoading(true);
    try {
      const data = await getStoreUsers(storeId);
      
      // Her kullanıcının yapısını kontrol et
      
      setUsers(data);
    } catch (error: any) {
      alert(error.message || 'Kullanıcılar yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const fetchStoreInfo = async () => {
    try {
      const stores = await getStores();
      const currentStore = stores.find(s => s.store_id === storeId);
      if (currentStore) {
        setStore(currentStore);
      }
    } catch (error: any) {
      // Hata durumunda sessiz başarısızlık
    }
  };

  // Filtreleme
  const filteredUsers = users.filter(user => {
    const matchesSearch = searchTerm === "" || 
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.surname.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.phone_number && user.phone_number.toLowerCase().includes(searchTerm.toLowerCase()));
    
    return matchesSearch;
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
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

  // Yetki kontrolü - sipariş modunda tüm kullanıcılar, normal modda sadece admin/editör
  const isOrderMode = !!selectedAddressId;
  if (!isOrderMode && !isAdminOrEditor) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center max-w-md">
          <div className="w-20 h-20 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="h-10 w-10 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-3">Erişim Reddedildi</h3>
          <p className="text-gray-600 mb-8 leading-relaxed">Bu sayfaya erişim yetkiniz bulunmamaktadır. Kullanıcı yönetimi sadece admin ve editör kullanıcılar tarafından kullanılabilir.</p>
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
                <svg className="h-8 w-8 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                {store ? `${store.kurum_adi} - Kullanıcılar` : 'Mağaza Kullanıcıları'}
              </h1>
              <p className="text-gray-600 mt-2">
                {isOrderMode && selectedAddressTitle 
                  ? `Sipariş için kullanıcı seçin - ${selectedAddressTitle}`
                  : 'Mağaza kullanıcılarını görüntüleyin ve yönetin'
                }
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center mb-4">
            <svg className="h-5 w-5 mr-2 text-[#00365a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 011-1h2a1 1 0 011 1v8a1 1 0 01-1 1h-2a1 1 0 01-1-1V9z" />
            </svg>
            <h3 className="text-lg font-semibold text-[#00365a]">Arama ve Filtreleme</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Kullanıcı Arama</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Ad, soyad, kullanıcı adı, e-posta..."
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
            <div className="flex items-end">
              <button
                onClick={() => setSearchTerm("")}
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
              <svg className="h-5 w-5 mr-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
              </svg>
              <h3 className="text-lg font-semibold text-white">Kullanıcı Listesi</h3>
              <span className="ml-4 text-blue-100 text-sm">({filteredUsers.length} kullanıcı)</span>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center h-48 p-6">
              <div className="relative">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-[#00365a]"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg className="w-6 h-6 text-[#00365a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              </div>
              <div className="text-center mt-4">
                <h3 className="text-lg font-semibold text-gray-900">Kullanıcılar Yükleniyor</h3>
                <p className="text-sm text-gray-500 mt-1">Lütfen bekleyiniz...</p>
              </div>
            </div>
          ) : filteredUsers.length > 0 ? (
            <div className="p-6">
              <div className="space-y-4">
                {filteredUsers.map((user) => (
                  <div key={user.username} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">{user.name} {user.surname}</h3>
                          <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            Kullanıcı
                          </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div className="bg-blue-50 rounded-lg p-3">
                            <p className="text-blue-600 font-medium mb-1">Kullanıcı Adı</p>
                            <p className="text-gray-900">{user.username}</p>
                          </div>
                          <div className="bg-green-50 rounded-lg p-3">
                            <p className="text-green-600 font-medium mb-1">E-posta</p>
                            <p className="text-gray-900">{user.email}</p>
                          </div>
                          {user.phone_number && (
                            <div className="bg-purple-50 rounded-lg p-3">
                              <p className="text-purple-600 font-medium mb-1">Telefon</p>
                              <p className="text-gray-900">{user.phone_number}</p>
                            </div>
                          )}
                        </div>
                      </div>
                      {isOrderMode && (
                        <div className="ml-4">
                          <button
                            onClick={() => {
                              const returnUrl = `/dashboard/admin-siparis-olustur?storeId=${storeId}&userId=${user.username}&selectedAddressId=${selectedAddressId}&selectedAddressTitle=${encodeURIComponent(selectedAddressTitle || '')}`;
                              router.push(returnUrl);
                            }}
                            className="bg-[#00365a] hover:bg-[#004170] text-white px-6 py-3 rounded-lg font-semibold transition-all shadow-md hover:shadow-lg flex items-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Seç
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-16 p-6">
              <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center">
                <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Kullanıcı Bulunamadı</h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto leading-relaxed">
                {searchTerm 
                  ? 'Arama kriterlerinize uygun kullanıcı bulunamadı.'
                  : 'Bu mağazada henüz hiç kullanıcı bulunmuyor.'
                }
              </p>
              {!isOrderMode && (
                <button
                  onClick={() => router.push('/dashboard/magazalar')}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-[#00365a] hover:bg-[#004170] text-white rounded-lg font-semibold transition-all shadow-md hover:shadow-lg"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
                  </svg>
                  Mağazalara Dön
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}