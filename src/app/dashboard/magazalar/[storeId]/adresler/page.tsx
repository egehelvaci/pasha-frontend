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

  const storeId = params.storeId as string;

  useEffect(() => {
    // Sipariş modunda tüm kullanıcılar erişebilir, normal modda sadece admin/editör
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
  }, [isAdminOrEditor, isOrderMode, router, storeId]);

  const fetchAddresses = async () => {
    try {
      setLoading(true);
      const response = await getStoreAddresses(storeId);
      if (response.success) {
        setAddresses(response.data);
      }
    } catch (error) {
      console.error('Adresler yüklenemedi:', error);
      alert('Adresler yüklenirken bir hata oluştu');
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
        alert('Adres başarıyla eklendi');
        setModal({ isOpen: false, type: 'create' });
        resetForm();
        fetchAddresses();
      }
    } catch (error: any) {
      alert(error.message || 'Adres eklenirken bir hata oluştu');
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
        alert('Adres başarıyla güncellendi');
        setModal({ isOpen: false, type: 'edit' });
        resetForm();
        fetchAddresses();
      }
    } catch (error: any) {
      alert(error.message || 'Adres güncellenirken bir hata oluştu');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAddress = async (addressId: string) => {
    if (!confirm('Bu adresi silmek istediğinizden emin misiniz?')) return;
    
    try {
      const response = await deleteStoreAddress(addressId);
      if (response.success) {
        alert('Adres başarıyla silindi');
        fetchAddresses();
      }
    } catch (error: any) {
      alert(error.message || 'Adres silinirken bir hata oluştu');
    }
  };

  const handleSetDefault = async (addressId: string) => {
    try {
      const response = await setDefaultStoreAddress(addressId);
      if (response.success) {
        alert('Varsayılan adres değiştirildi');
        fetchAddresses();
      }
    } catch (error: any) {
      alert(error.message || 'Varsayılan adres değiştirilemedi');
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

  // Sipariş modunda tüm kullanıcılar erişebilir, normal modda sadece admin/editör
  if (!isOrderMode && !isAdminOrEditor) return null;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => router.push('/dashboard/magazalar')}
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-3xl font-bold text-gray-900">
              Mağaza Adres Yönetimi
            </h1>
          </div>
          <div className="flex justify-between items-center">
            <p className="text-gray-600">
              Mağaza adreslerini yönetin
            </p>
            {!isOrderMode && (
              <button
                onClick={openCreateModal}
                className="bg-[#00365a] text-white px-6 py-2 rounded-lg hover:bg-[#004170] transition-colors flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Yeni Adres Ekle
              </button>
            )}
          </div>
        </div>

        {/* Address List */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="grid gap-6">
            {addresses.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center">
                  <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Henüz adres yok</h3>
                <p className="text-gray-600 mb-6">
                  {isOrderMode 
                    ? 'Bu mağaza için henüz adres tanımlanmamış. Sipariş verebilmek için önce adres eklenmeli.' 
                    : 'Bu mağaza için henüz adres tanımlanmamış'
                  }
                </p>
                {!isOrderMode && (
                  <button
                    onClick={openCreateModal}
                    className="bg-[#00365a] text-white px-6 py-3 rounded-lg hover:bg-[#004170] transition-colors"
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
                    className={`bg-white rounded-lg shadow-sm border-2 p-6 transition-all ${
                      address.is_default ? 'border-green-200 bg-green-50' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">{address.title}</h3>
                          {address.is_default && (
                            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                              Varsayılan
                            </span>
                          )}
                          {!address.is_active && (
                            <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full">
                              Pasif
                            </span>
                          )}
                        </div>
                        <p className="text-gray-700 mb-2">{address.address}</p>
                        {(address.district || address.city || address.postal_code) && (
                          <p className="text-gray-600 text-sm">
                            {address.district && address.district + ', '}
                            {address.city}
                            {address.postal_code && ' - ' + address.postal_code}
                          </p>
                        )}
                        <p className="text-gray-500 text-xs mt-2">
                          Oluşturulma: {new Date(address.created_at).toLocaleDateString('tr-TR')}
                        </p>
                      </div>
                      
                      <div className="flex gap-2">
                        {!isOrderMode && (
                          // Normal yönetim modu
                          <>
                            {!address.is_default && (
                              <button
                                onClick={() => handleSetDefault(address.id)}
                                className="text-green-600 hover:text-green-700 p-2 rounded-lg hover:bg-green-50 transition-colors"
                                title="Varsayılan yap"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              </button>
                            )}
                            <button
                              onClick={() => openEditModal(address)}
                              className="text-blue-600 hover:text-blue-700 p-2 rounded-lg hover:bg-blue-50 transition-colors"
                              title="Düzenle"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDeleteAddress(address.id)}
                              className="text-red-600 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-colors"
                              title="Sil"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
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
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl max-w-2xl w-full shadow-2xl">
              <div className="bg-[#00365a] text-white rounded-t-xl p-6">
                <h3 className="text-xl font-bold">
                  {modal.type === 'create' ? 'Yeni Adres Ekle' : 'Adres Düzenle'}
                </h3>
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Adres Başlığı <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Örn: Ana Mağaza, Depo, Şube 1"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tam Adres <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={formData.address}
                      onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                      placeholder="Sokak, cadde, mahalle, bina no vs."
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">İlçe</label>
                    <input
                      type="text"
                      value={formData.district}
                      onChange={(e) => setFormData(prev => ({ ...prev, district: e.target.value }))}
                      placeholder="Örn: Kadıköy"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Şehir</label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                      placeholder="Örn: İstanbul"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Posta Kodu</label>
                    <input
                      type="text"
                      value={formData.postal_code}
                      onChange={(e) => setFormData(prev => ({ ...prev, postal_code: e.target.value }))}
                      placeholder="Örn: 34710"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div className="flex items-center">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.is_default}
                        onChange={(e) => setFormData(prev => ({ ...prev, is_default: e.target.checked }))}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Varsayılan adres olarak ayarla</span>
                    </label>
                  </div>
                </div>
                
                <div className="flex justify-end gap-3 mt-6">
                  <button
                    onClick={closeModal}
                    className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    İptal
                  </button>
                  <button
                    onClick={modal.type === 'create' ? handleCreateAddress : handleUpdateAddress}
                    disabled={submitting || !formData.title || !formData.address}
                    className="px-6 py-2 bg-[#00365a] text-white rounded-lg hover:bg-[#004170] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                        {modal.type === 'create' ? 'Ekleniyor...' : 'Güncelleniyor...'}
                      </>
                    ) : (
                      modal.type === 'create' ? 'Ekle' : 'Güncelle'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
