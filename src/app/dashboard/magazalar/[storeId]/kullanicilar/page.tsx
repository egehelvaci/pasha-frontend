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
      console.log('Mağaza kullanıcıları:', data);
      
      // Her kullanıcının yapısını kontrol et
      data.forEach((user, index) => {
        console.log(`Kullanıcı ${index + 1}:`, {
          user_id: user.user_id,
          id: (user as any).id,
          userId: (user as any).userId,
          username: user.username,
          name: user.name,
          surname: user.surname
        });
      });
      
      setUsers(data);
    } catch (error: any) {
      console.error('Kullanıcılar yüklenirken hata:', error);
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
      console.error('Mağaza bilgileri alınamadı:', error);
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
              <div className="flex items-center mb-2">
                <button
                  onClick={() => router.push('/dashboard/magazalar')}
                  className="mr-4 text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <h1 className="text-3xl font-bold text-[#00365a] flex items-center">
                  {selectedAddressTitle ? 'Kullanıcı Seçin - Sipariş Ver' : 'Mağaza Kullanıcıları'}
                </h1>
                {selectedAddressTitle && (
                  <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>Seçilen Adres:</strong> {decodeURIComponent(selectedAddressTitle)}
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                      Bu adrese sipariş vermek için bir kullanıcı seçin
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-[#00365a]">
            <div className="flex items-center">
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
            <>
              {/* Desktop Table View */}
              <div className="hidden xl:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Kullanıcı Bilgileri
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        İletişim
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Durum
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredUsers.map((user) => (
                      <tr 
                        key={user.user_id} 
                        className="hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => {
                          // Kullanıcı seçimi - admin-siparis-olustur sayfasına yönlendir
                          console.log('Kullanıcı verisi (desktop):', user);
                          console.log('Kullanıcı ID alanları (desktop):', {
                            user_id: user.user_id,
                            id: (user as any).id,
                            userId: (user as any).userId
                          });
                          
                          // Farklı ID alanlarını kontrol et
                          const userId = user.user_id || (user as any).id || (user as any).userId;
                          
                          const url = `/dashboard/admin-siparis-olustur?storeId=${storeId}&userId=${userId}&userName=${encodeURIComponent(`${user.name} ${user.surname}`)}`;
                          console.log('Oluşturulan URL (desktop):', url);
                          router.push(url);
                        }}
                      >
                        <td className="px-6 py-4">
                          <div>
                            <div className="text-sm font-semibold text-gray-900">{user.name} {user.surname}</div>
                            <div className="text-sm text-gray-500">@{user.username}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <div className="text-sm text-gray-900">{user.email}</div>
                            {user.phone_number && (
                              <div className="text-sm text-gray-500">{user.phone_number}</div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center">
                            <button className="px-3 py-1 bg-[#00365a] text-white text-sm rounded-lg hover:bg-[#004170] transition-colors">
                              Sipariş Ver
                            </button>
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
                  {filteredUsers.map((user) => (
                    <div 
                      key={user.user_id} 
                      className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer" 
                      onClick={() => {
                        // Kullanıcı seçimi - admin-siparis-olustur sayfasına yönlendir
                        console.log('Kullanıcı verisi (mobil):', user);
                        console.log('Kullanıcı ID alanları (mobil):', {
                          user_id: user.user_id,
                          id: (user as any).id,
                          userId: (user as any).userId
                        });
                        
                        // Farklı ID alanlarını kontrol et
                        const userId = user.user_id || (user as any).id || (user as any).userId;
                        
                        const url = `/dashboard/admin-siparis-olustur?storeId=${storeId}&userId=${userId}&userName=${encodeURIComponent(`${user.name} ${user.surname}`)}`;
                        console.log('Oluşturulan URL (mobil):', url);
                        router.push(url);
                      }}>
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 mb-1">{user.name} {user.surname}</h3>
                          <p className="text-sm text-gray-500">@{user.username}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div className="bg-blue-50 rounded-lg p-4">
                          <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                            <svg className="w-4 h-4 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            İletişim
                          </h4>
                          <p className="text-sm text-gray-900">{user.email}</p>
                          {user.phone_number && <p className="text-sm text-gray-500">{user.phone_number}</p>}
                        </div>

                        <div className="bg-blue-50 rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <button className="w-full px-4 py-2 bg-[#00365a] text-white rounded-lg hover:bg-[#004170] transition-colors flex items-center justify-center gap-2">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5-5M17 13v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6m8 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4.01" />
                                </svg>
                                Sipariş Ver
                              </button>
                            </div>
                          </div>
                        </div>
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Kullanıcı Bulunamadı</h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto leading-relaxed">
                {searchTerm 
                  ? 'Arama kriterlerinize uygun kullanıcı bulunamadı. Arama terimini değiştirerek tekrar deneyin.'
                  : 'Bu mağazaya henüz hiç kullanıcı atanmamış.'
                }
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-white hover:bg-gray-50 text-[#00365a] border-2 border-[#00365a] rounded-lg font-semibold transition-all hover:shadow-md"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Aramayı Temizle
                  </button>
                )}
                <button
                  onClick={() => router.push('/dashboard/magazalar')}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-[#00365a] hover:bg-[#004170] text-white rounded-lg font-semibold transition-all shadow-md hover:shadow-lg"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
                  </svg>
                  Mağazalara Dön
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 