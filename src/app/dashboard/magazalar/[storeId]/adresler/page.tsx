'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { 
  getStoreAddresses, 
  createStoreAddress, 
  updateStoreAddress, 
  deleteStoreAddress, 
  setDefaultStoreAddress,
  StoreAddress,
  CreateStoreAddressRequest 
} from '@/services/api';

interface AddressModal {
  isOpen: boolean;
  type: 'create' | 'edit';
  address?: StoreAddress;
}

export default function StoreAddressesPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { isAdmin, isAdminOrEditor } = useAuth();
  
  const isOrderMode = searchParams.get('mode') === 'order';
  const [addresses, setAddresses] = useState<StoreAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<AddressModal>({ isOpen: false, type: 'create' });
  const [formData, setFormData] = useState<CreateStoreAddressRequest>({
    title: '',
    address: '',
    city: '',
    district: '',
    postal_code: '',
    is_default: false
  });
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState({ isOpen: false, title: '', message: '', isError: false });
  const [addressToDelete, setAddressToDelete] = useState<string | null>(null);
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
    // Sipariş modu yalnızca admin; normal adres yönetimi admin/editör
    if (isOrderMode && !isAdmin) {
      router.push('/dashboard/magazalar');
      return;
    }

    if (!isOrderMode && !isAdminOrEditor) {
      router.push('/dashboard');
      return;
    }
    
    // Sipariş modunda ise doğrudan kullanıcı seçim sayfasına yönlendir
    if (isOrderMode) {
      router.push(`/dashboard/magazalar/${storeId}/kullanicilar`);
      return;
    }
    
    fetchAddresses();
  }, [isAdmin, isAdminOrEditor, isOrderMode, router, storeId]);

  const fetchAddresses = async () => {
    try {
      setLoading(true);
      const response = await getStoreAddresses(storeId);
      if (response.success) {
        setAddresses(response.data);
      }
    } catch (error) {
      console.error('Adresler yüklenemedi:', error);
      showNotice('Adresler yüklenirken bir hata oluştu', true);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAddress = async () => {
    try {
      setSubmitting(true);
      const payload = { 
        ...formData, 
        store_id: storeId // Admin için store_id ekliyoruz 
      };
      const response = await createStoreAddress(payload);
      if (response.success) {
        showNotice('Adres başarıyla eklendi');
        setModal({ isOpen: false, type: 'create' });
        resetForm();
        fetchAddresses();
      }
    } catch (error: any) {
      showNotice(error.message || 'Adres eklenirken bir hata oluştu', true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateAddress = async () => {
    if (!modal.address) return;
    
    try {
      setSubmitting(true);
      const response = await updateStoreAddress(modal.address.id, formData);
      if (response.success) {
        showNotice('Adres başarıyla güncellendi');
        setModal({ isOpen: false, type: 'edit' });
        resetForm();
        fetchAddresses();
      }
    } catch (error: any) {
      showNotice(error.message || 'Adres güncellenirken bir hata oluştu', true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAddress = async () => {
    if (!addressToDelete) return;
    try {
      const response = await deleteStoreAddress(addressToDelete);
      if (response.success) {
        setAddressToDelete(null);
        showNotice('Adres başarıyla silindi');
        fetchAddresses();
      }
    } catch (error: any) {
      showNotice(error.message || 'Adres silinirken bir hata oluştu', true);
    }
  };

  const handleSetDefault = async (addressId: string) => {
    try {
      const response = await setDefaultStoreAddress(addressId);
      if (response.success) {
        showNotice('Varsayılan adres değiştirildi');
        fetchAddresses();
      }
    } catch (error: any) {
      showNotice(error.message || 'Varsayılan adres değiştirilemedi', true);
    }
  };

  const openCreateModal = () => {
    resetForm();
    setModal({ isOpen: true, type: 'create' });
  };

  const openEditModal = (address: StoreAddress) => {
    setFormData({
      title: address.title,
      address: address.address,
      city: address.city || '',
      district: address.district || '',
      postal_code: address.postal_code || '',
      is_default: address.is_default
    });
    setModal({ isOpen: true, type: 'edit', address });
  };

  const resetForm = () => {
    setFormData({
      title: '',
      address: '',
      city: '',
      district: '',
      postal_code: '',
      is_default: false
    });
  };

  const closeModal = () => {
    setModal({ isOpen: false, type: 'create' });
    resetForm();
  };

  // Sipariş modu yalnızca admin; normal adres yönetimi admin/editör
  if (isOrderMode && !isAdmin) return null;
  if (!isOrderMode && !isAdminOrEditor) return null;

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <button
              type="button"
              onClick={() => router.push('/dashboard/magazalar')}
              className="mb-3 text-sm font-medium text-slate-500 transition hover:text-[#00365a]"
            >
              Mağazalara dön
            </button>
            <h1 className="text-2xl font-light tracking-[0.08em] text-neutral-900 sm:text-3xl">Mağaza Adres Yönetimi</h1>
            <div className="mt-3 h-px w-[min(100%,20rem)] bg-neutral-300" />
            <p className="mt-3 text-sm text-slate-500">Mağaza adreslerini yönetin</p>
          </div>
          {!isOrderMode && (
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center justify-center rounded-lg bg-[#00365a] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#004170]"
            >
              Yeni Adres Ekle
            </button>
          )}
        </div>

        {/* Address List */}
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-[#00365a]" />
          </div>
        ) : (
          <div>
            {addresses.length === 0 ? (
              <div className="rounded-xl border border-slate-200/80 bg-white px-6 py-16 text-center shadow-sm">
                <h3 className="mb-2 text-lg font-semibold tracking-tight text-slate-900">Henüz adres yok</h3>
                <p className="mb-6 text-sm text-slate-500">
                  {isOrderMode
                    ? 'Bu mağaza için henüz adres tanımlanmamış. Sipariş verebilmek için önce adres eklenmeli.'
                    : 'Bu mağaza için henüz adres tanımlanmamış'}
                </p>
                {!isOrderMode && (
                  <button
                    type="button"
                    onClick={openCreateModal}
                    className="rounded-lg bg-[#00365a] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#004170]"
                  >
                    İlk Adresi Ekle
                  </button>
                )}
              </div>
            ) : (
              <div className="grid gap-4">
                {addresses.map((address) => (
                  <div
                    key={address.id}
                    className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-semibold text-slate-900">{address.title}</h3>
                          {address.is_default && (
                            <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                              Varsayılan
                            </span>
                          )}
                          {!address.is_active && (
                            <span className="rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-medium text-rose-700">
                              Pasif
                            </span>
                          )}
                        </div>
                        <p className="text-slate-700 mb-2">{address.address}</p>
                        {(address.district || address.city || address.postal_code) && (
                          <p className="text-slate-500 text-sm">
                            {address.district && address.district + ', '}
                            {address.city}
                            {address.postal_code && ' - ' + address.postal_code}
                          </p>
                        )}
                        <p className="mt-2 text-xs text-slate-500">
                          Oluşturulma: {new Date(address.created_at).toLocaleDateString('tr-TR')}
                        </p>
                      </div>
                      
                      <div className="flex gap-2">
                        {!isOrderMode && (
                          // Normal yönetim modu
                          <>
                            {!address.is_default && (
                              <button
                                type="button"
                                onClick={() => handleSetDefault(address.id)}
                                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                              >
                                Varsayılan yap
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => openEditModal(address)}
                              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                            >
                              Düzenle
                            </button>
                            <button
                              type="button"
                              onClick={() => setAddressToDelete(address.id)}
                              className="rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-medium text-rose-700 transition hover:bg-rose-50"
                            >
                              Sil
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Modal */}
        {modal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-2xl rounded-xl border border-slate-200/80 bg-white shadow-sm">
              <div className="border-b border-slate-200/80 px-6 py-4">
                <h3 className="text-lg font-semibold tracking-tight text-slate-900">
                  {modal.type === 'create' ? 'Yeni Adres Ekle' : 'Adres Düzenle'}
                </h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Adres Başlığı <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Örn: Ana Mağaza, Depo, Şube 1"
                      className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 transition hover:bg-white focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/25"
                      required
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Tam Adres <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={formData.address}
                      onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                      placeholder="Sokak, cadde, mahalle, bina no vs."
                      rows={3}
                      className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 transition hover:bg-white focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/25"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">İlçe</label>
                    <input
                      type="text"
                      value={formData.district}
                      onChange={(e) => setFormData(prev => ({ ...prev, district: e.target.value }))}
                      placeholder="Örn: Kadıköy"
                      className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 transition hover:bg-white focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/25"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Şehir</label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                      placeholder="Örn: İstanbul"
                      className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 transition hover:bg-white focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/25"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Posta Kodu</label>
                    <input
                      type="text"
                      value={formData.postal_code}
                      onChange={(e) => setFormData(prev => ({ ...prev, postal_code: e.target.value }))}
                      placeholder="Örn: 34710"
                      className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 transition hover:bg-white focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/25"
                    />
                  </div>
                  
                  <div className="flex items-center">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.is_default}
                        onChange={(e) => setFormData(prev => ({ ...prev, is_default: e.target.checked }))}
                        className="rounded border-slate-300 text-blue-600 focus-visible:ring-2 focus-visible:ring-[#00365a]/25 focus:outline-none"
                      />
                      <span className="ml-2 text-sm text-slate-700">Varsayılan adres olarak ayarla</span>
                    </label>
                  </div>
                </div>
                
                <div className="flex justify-end gap-3 mt-6">
                  <button
                    onClick={closeModal}
                    className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    İptal
                  </button>
                  <button
                    onClick={modal.type === 'create' ? handleCreateAddress : handleUpdateAddress}
                    disabled={submitting || !formData.title || !formData.address}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#00365a] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#004170] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {submitting
                      ? (modal.type === 'create' ? 'Ekleniyor...' : 'Güncelleniyor...')
                      : (modal.type === 'create' ? 'Ekle' : 'Güncelle')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        {addressToDelete && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-md rounded-xl border border-slate-200/80 bg-white p-6">
              <h3 className="mb-3 text-lg font-semibold tracking-tight text-slate-900">Adresi sil</h3>
              <p className="mb-6 text-sm text-slate-500">Bu adresi silmek istediğinizden emin misiniz?</p>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAddressToDelete(null)}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Vazgeç
                </button>
                <button
                  type="button"
                  onClick={handleDeleteAddress}
                  className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-700"
                >
                  Sil
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
