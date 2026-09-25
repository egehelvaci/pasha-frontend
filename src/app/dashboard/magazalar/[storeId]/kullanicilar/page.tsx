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
  const [notice, setNotice] = useState({ isOpen: false, title: '', message: '', isError: false });
  const showNotice = (message: string, isError = false) => {
    setNotice({
      isOpen: true,
      title: isError ? 'İşlem tamamlanamadı' : 'İşlem tamamlandı',
      message,
      isError,
    });
  };

  const storeId = params.storeId as string;

  useEffect(() => {
    // Sipariş oluşturma yalnızca admin; kullanıcı listesi admin/editör
    const isOrderMode = !!selectedAddressId;
    
    if (!authLoading && isOrderMode && !isAdmin) {
      router.push('/dashboard/magazalar');
      return;
    }

    if (!authLoading && !isOrderMode && !isAdminOrEditor) {
      router.push('/dashboard');
      return;
    }
    
    // Kimlik doğrulama yüklemesi tamamlandığında veri çek
    if (!authLoading && storeId && (isAdmin || isAdminOrEditor)) {
      fetchStoreUsers();
      fetchStoreInfo();
    }
  }, [isAdmin, isAdminOrEditor, authLoading, router, storeId, selectedAddressId]);

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
      showNotice(error.message || 'Kullanıcılar yüklenirken bir hata oluştu', true);
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
      <div className="flex min-h-screen items-center justify-center bg-[#f7f8fa]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-[#00365a]" />
      </div>
    );
  }

  // Yetki kontrolü
  const isOrderMode = !!selectedAddressId;
  if (isOrderMode && !isAdmin) {
    return null;
  }
  if (!isOrderMode && !isAdminOrEditor) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f8fa] px-4">
        <div className="w-full max-w-md rounded-xl border border-slate-200/80 bg-white p-8 text-center shadow-sm">
          <h3 className="text-base font-semibold text-slate-900">Erişim Reddedildi</h3>
          <p className="mt-2 text-sm text-slate-500">
            Bu sayfaya erişim yetkiniz bulunmamaktadır. Kullanıcı yönetimi sadece admin ve editör kullanıcılar tarafından kullanılabilir.
          </p>
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="mt-6 rounded-lg bg-[#00365a] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#004170]"
          >
            Dashboard&apos;a Dön
          </button>
        </div>
      </div>
    );
  }

  const openOrderForUser = (user: StoreUser) => {
    if (!isAdmin) return;
    const userId = user.user_id || (user as any).id || (user as any).userId;
    router.push(
      `/dashboard/admin-siparis-olustur?storeId=${storeId}&userId=${userId}&userName=${encodeURIComponent(`${user.name} ${user.surname}`)}`
    );
  };

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <div className="mb-6">
          <button
            type="button"
            onClick={() => router.push('/dashboard/magazalar')}
            className="mb-3 text-sm font-medium text-slate-500 transition hover:text-[#00365a]"
          >
            Mağazalara dön
          </button>
          <h1 className="text-2xl font-light tracking-[0.08em] text-neutral-900 sm:text-3xl">
            {selectedAddressTitle ? 'Kullanıcı Seçin' : 'Mağaza Kullanıcıları'}
          </h1>
          <div className="mt-3 h-px w-[min(100%,20rem)] bg-neutral-300" />
          <p className="mt-3 text-sm text-slate-500">
            {store ? `${store.kurum_adi} · ` : ''}
            {selectedAddressTitle
              ? `Seçilen adres: ${decodeURIComponent(selectedAddressTitle)}. Sipariş vermek için bir kullanıcı seçin.`
              : `${filteredUsers.length} kullanıcı`}
          </p>
          <input
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Kullanıcı ara"
            className="mt-4 w-full max-w-sm rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/25"
          />
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
          {loading ? (
            <div className="flex h-48 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-[#00365a]" />
            </div>
          ) : filteredUsers.length > 0 ? (
            <>
              {/* Desktop Table View */}
              <div className="hidden xl:block overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Kullanıcı
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        İletişim
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                        İşlem
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {filteredUsers.map((user) => (
                      <tr
                        key={user.user_id}
                        className={`transition hover:bg-slate-50 ${isAdmin ? 'cursor-pointer' : ''}`}
                        onClick={() => openOrderForUser(user)}
                      >
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-slate-900">{user.name} {user.surname}</div>
                          <div className="text-sm text-slate-500">@{user.username}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-slate-900">{user.email}</div>
                          {user.phone_number && (
                            <div className="text-sm text-slate-500">{user.phone_number}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          {isAdmin ? (
                            <span className="inline-flex rounded-lg bg-[#00365a] px-3 py-1.5 text-xs font-medium text-white">
                              Sipariş Ver
                            </span>
                          ) : (
                            <span className="text-sm text-slate-400">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile/Tablet Card View */}
              <div className="space-y-3 p-4 xl:hidden">
                {filteredUsers.map((user) => (
                  <div
                    key={user.user_id}
                    className={`rounded-xl border border-slate-200/80 bg-white p-4 ${isAdmin ? 'cursor-pointer' : ''}`}
                    onClick={() => openOrderForUser(user)}
                  >
                    <div className="text-sm font-medium text-slate-900">{user.name} {user.surname}</div>
                    <p className="text-sm text-slate-500">@{user.username}</p>
                    <p className="mt-2 text-sm text-slate-700">{user.email}</p>
                    {user.phone_number && <p className="text-sm text-slate-500">{user.phone_number}</p>}
                    {isAdmin && (
                      <span className="mt-3 inline-flex rounded-lg bg-[#00365a] px-3 py-1.5 text-xs font-medium text-white">
                        Sipariş Ver
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="px-6 py-16 text-center">
              <h3 className="mb-2 text-lg font-semibold tracking-tight text-slate-900">Kullanıcı bulunamadı</h3>
              <p className="mx-auto mb-6 max-w-md text-sm text-slate-500">
                {searchTerm
                  ? 'Arama kriterlerinize uygun kullanıcı bulunamadı.'
                  : 'Bu mağazaya henüz kullanıcı atanmamış.'}
              </p>
              <button
                type="button"
                onClick={() => router.push('/dashboard/magazalar')}
                className="rounded-lg bg-[#00365a] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#004170]"
              >
                Mağazalara Dön
              </button>
            </div>
          )}
        </div>
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