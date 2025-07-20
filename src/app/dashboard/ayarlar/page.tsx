"use client";

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';
import { useToken } from '@/app/hooks/useToken';
import { FaPlus, FaEdit, FaTrash, FaStore, FaUser, FaLock, FaBuilding, FaEye, FaEyeSlash } from 'react-icons/fa';
import { getStores, assignUserToStore, removeUserFromStore, getMyProfile, updateStoreProfile, changePassword, updateUserProfile, StoreUpdateData, PasswordChangeData, UserProfileInfo, StoreProfileInfo, UserUpdateData } from '@/services/api';

interface User {
  userId: string;
  username: string;
  fullName?: string;
  name?: string;
  surname?: string;
  email: string;
  isActive: boolean;
  userType: {
    id: number;
    name: string;
    description: string;
  } | string;
  Store?: {
    store_id: string;
    kurum_adi: string;
  }
}

interface UserFormData {
  username: string;
  password?: string;
  name: string;
  surname: string;
  email: string;
  phoneNumber?: string;
  adres?: string;                     // 🆕 Kullanıcı adres alanı
  userTypeName: string;
  storeId?: string;
}

export default function Settings() {
  const { user, isAdmin, isLoading: authLoading } = useAuth();
  const token = useToken();
  const router = useRouter();
  
  // Admin için mevcut state'ler
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [formData, setFormData] = useState<UserFormData>({
    username: '',
    password: '',
    name: '',
    surname: '',
    email: '',
    phoneNumber: '',
    adres: '',
    userTypeName: 'viewer',
    storeId: ''
  });
  const [assignStoreModalOpen, setAssignStoreModalOpen] = useState(false);
  const [assigningUserId, setAssigningUserId] = useState<string | null>(null);
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');
  const [stores, setStores] = useState<{store_id: string, kurum_adi: string}[]>([]);
  const [assignLoading, setAssignLoading] = useState(false);
  const [removeLoading, setRemoveLoading] = useState(false);
  
  // Normal kullanıcı için yeni state'ler
  const [activeTab, setActiveTab] = useState<'profile' | 'store' | 'password'>('profile');
  const [userProfile, setUserProfile] = useState<UserProfileInfo | null>(null);
  const [storeProfile, setStoreProfile] = useState<StoreProfileInfo | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  
  // Şifre değiştirme form state'leri
  const [passwordForm, setPasswordForm] = useState<PasswordChangeData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Kullanıcı profil güncelleme form state'leri
  const [userForm, setUserForm] = useState<UserUpdateData>({
    name: '',
    surname: '',
    phoneNumber: '',
    adres: ''
  });
  const [userLoading, setUserLoading] = useState(false);
  const [userMessage, setUserMessage] = useState('');
  
  // Mağaza güncelleme form state'leri
  const [storeForm, setStoreForm] = useState<StoreUpdateData>({
    kurum_adi: '',
    vergi_numarasi: '',
    vergi_dairesi: '',
    yetkili_adi: '',
    yetkili_soyadi: '',
    telefon: '',
    eposta: '',
    faks_numarasi: '',
    tckn: ''
  });
  const [storeLoading, setStoreLoading] = useState(false);
  const [storeMessage, setStoreMessage] = useState('');
  
  // API çağrısını takip etmek için ref oluştur
  const fetchedRef = useRef(false);

  useEffect(() => {
    // Auth yüklemesi tamamlanmadıysa bekle
    if (authLoading) return;
    
    // Admin kullanıcılar için mevcut logic
    if (isAdmin) {
      // Sadece bir kez çağrılmasını sağla
      if (!fetchedRef.current) {
        fetchedRef.current = true;
        fetchUsers();
        fetchStores();
      }
    } else {
      // Normal kullanıcılar için profil bilgilerini getir
      fetchUserProfile();
    }
  }, [isAdmin, authLoading, router]);

  // Auth yüklenirken loading göster
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Normal kullanıcı profil bilgilerini getir
  const fetchUserProfile = async () => {
    setProfileLoading(true);
    try {
      const profileData = await getMyProfile();
      setUserProfile(profileData.user);
      setStoreProfile(profileData.store);
      
      // Kullanıcı form'unu doldur
      if (profileData.user) {
        setUserForm({
          name: profileData.user.name || '',
          surname: profileData.user.surname || '',
          phoneNumber: profileData.user.phoneNumber || '',
          adres: profileData.user.adres || ''
        });
      }
      
      // Mağaza form'unu doldur
      if (profileData.store) {
        setStoreForm({
          kurum_adi: profileData.store.kurum_adi || '',
          vergi_numarasi: profileData.store.vergi_numarasi || '',
          vergi_dairesi: profileData.store.vergi_dairesi || '',
          yetkili_adi: profileData.store.yetkili_adi || '',
          yetkili_soyadi: profileData.store.yetkili_soyadi || '',
          telefon: profileData.store.telefon || '',
          eposta: profileData.store.eposta || '',
          faks_numarasi: profileData.store.faks_numarasi || '',
          tckn: profileData.store.tckn || ''
        });
      }
    } catch (err: any) {
      setError(err.message || "Profil bilgileri yüklenirken bir hata oluştu");
    } finally {
      setProfileLoading(false);
    }
  };

  // Şifre değiştirme form handler'ı
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordForm(prev => ({ ...prev, [name]: value }));
    setPasswordMessage(''); // Mesajı temizle
  };

  // Şifre değiştirme submit
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage('');

    // Frontend validasyonu
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordMessage('Yeni şifre ve onay şifresi eşleşmiyor');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setPasswordMessage('Yeni şifre en az 6 karakter olmalıdır');
      return;
    }

    setPasswordLoading(true);
    try {
      const message = await changePassword(passwordForm);
      setPasswordMessage(message);
      // Form'u temizle
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (err: any) {
      setPasswordMessage('Hata: ' + err.message);
    } finally {
      setPasswordLoading(false);
    }
  };

  // Mağaza form handler'ı
  const handleStoreChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setStoreForm(prev => ({ ...prev, [name]: value }));
    setStoreMessage(''); // Mesajı temizle
  };

  // Mağaza güncelleme submit
  const handleStoreSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStoreMessage('');

    // Frontend validasyonu
    if (!storeForm.kurum_adi.trim()) {
      setStoreMessage('Kurum adı zorunludur');
      return;
    }

    setStoreLoading(true);
    try {
      await updateStoreProfile(storeForm);
      setStoreMessage('Mağaza bilgileri başarıyla güncellendi!');
      // Profil bilgilerini yenile
      await fetchUserProfile();
    } catch (err: any) {
      setStoreMessage('Hata: ' + err.message);
    } finally {
      setStoreLoading(false);
    }
  };

  // Kullanıcı form handler'ı
  const handleUserChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setUserForm(prev => ({ ...prev, [name]: value }));
    setUserMessage(''); // Mesajı temizle
  };

  // Kullanıcı profil güncelleme submit
  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserMessage('');

    // Frontend validasyonu
    if (!userForm.name.trim() || !userForm.surname.trim()) {
      setUserMessage('Ad ve soyad zorunludur');
      return;
    }

    setUserLoading(true);
    try {
      await updateUserProfile(userForm);
      setUserMessage('Profil bilgileri başarıyla güncellendi!');
      // Profil bilgilerini yenile
      await fetchUserProfile();
    } catch (err: any) {
      setUserMessage('Hata: ' + err.message);
    } finally {
      setUserLoading(false);
    }
  };

  // Admin için mevcut fonksiyonlar (değişiklik yok)
  useEffect(() => {
    if (selectedUser) {
      setFormData({
        username: selectedUser.username,
        name: (selectedUser.fullName || ((selectedUser.name || '') + ' ' + (selectedUser.surname || ''))).split(' ')[0],
        surname: (selectedUser.fullName || ((selectedUser.name || '') + ' ' + (selectedUser.surname || ''))).split(' ').slice(1).join(' '),
        email: selectedUser.email,
        phoneNumber: (selectedUser as any).phoneNumber || '',
        adres: (selectedUser as any).adres || '',
        userTypeName:
          typeof selectedUser.userType === 'object'
            ? selectedUser.userType.name
            : selectedUser.userType || '',
        storeId: selectedUser.Store?.store_id || ''
      });
    } else {
      setFormData({
        username: '',
        password: '',
        name: '',
        surname: '',
        email: '',
        phoneNumber: '',
        adres: '',
        userTypeName: 'viewer',
        storeId: ''
      });
    }
  }, [selectedUser]);

  const fetchUsers = async () => {
    // Zaten yükleme yapılıyorsa çık
    if (loading && users.length > 0) return;
    
    setLoading(true);
    try {
      const res = await fetch("https://pasha-backend-production.up.railway.app/api/admin/users", {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      setUsers(data.data || []);
    } catch (err: any) {
      setError(err.message || "Kullanıcılar yüklenirken bir hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  const fetchStores = async () => {
    try {
      const storesData = await getStores();
      setStores(storesData.map(store => ({
        store_id: store.store_id,
        kurum_adi: store.kurum_adi
      })));
    } catch (err: any) {
      setError(err.message || "Mağazalar yüklenirken bir hata oluştu");
    }
  };

  const handleUserClick = async (userId: string) => {
    try {
      const res = await fetch(`https://pasha-backend-production.up.railway.app/api/admin/users/${userId}`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      setSelectedUser(data.data);
      setModalOpen(true);
    } catch (err: any) {
      setError(err.message || "Kullanıcı bilgileri alınırken bir hata oluştu");
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteUserId) return;
    
    try {
      const res = await fetch(`https://pasha-backend-production.up.railway.app/api/admin/users/${deleteUserId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      
      setUsers(users.filter(u => u.userId !== deleteUserId));
      setDeleteModalOpen(false);
      setDeleteUserId(null);
    } catch (err: any) {
      setError(err.message || "Kullanıcı silinirken bir hata oluştu");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = selectedUser 
        ? `https://pasha-backend-production.up.railway.app/api/admin/users/${selectedUser.userId}`
        : "https://pasha-backend-production.up.railway.app/api/admin/users";
      
      const method = selectedUser ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      
      setModalOpen(false);
      setSelectedUser(null);
      
      // Kullanıcıları yenile
      fetchedRef.current = false; // useRef'i sıfırla
      fetchUsers();
    } catch (err: any) {
      setError(err.message || "İşlem sırasında bir hata oluştu");
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAssignStore = async () => {
    if (!assigningUserId) return;
    
    // Mağaza atamasını kaldırma seçeneği
    if (selectedStoreId === "remove") {
      await handleRemoveStore();
      return;
    }
    
    if (!selectedStoreId) return;
    
    setAssignLoading(true);
    try {
      const result = await assignUserToStore(assigningUserId, {
        storeId: selectedStoreId
      });
      
      // Kullanıcı listesini güncelle
      setUsers(users.map(u => 
        u.userId === assigningUserId 
          ? {...u, Store: result.data.Store} 
          : u
      ));
      
      setAssignStoreModalOpen(false);
      setAssigningUserId(null);
      setSelectedStoreId('');
    } catch (err: any) {
      setError(err.message || "Kullanıcı mağazaya atanırken bir hata oluştu");
    } finally {
      setAssignLoading(false);
    }
  };
  
  const handleRemoveStore = async () => {
    if (!assigningUserId) return;
    
    setRemoveLoading(true);
    try {
      const result = await removeUserFromStore(assigningUserId);
      
      // Kullanıcı listesini güncelle
      setUsers(users.map(u => {
        if (u.userId === assigningUserId) {
          // Store özelliğini undefined olarak ayarla (null değil)
          const updatedUser = {...u};
          updatedUser.Store = undefined;
          return updatedUser;
        }
        return u;
      }));
      
      setAssignStoreModalOpen(false);
      setAssigningUserId(null);
      setSelectedStoreId('');
    } catch (err: any) {
      setError(err.message || "Kullanıcının mağaza ataması kaldırılırken bir hata oluştu");
    } finally {
      setRemoveLoading(false);
    }
  };

  // Normal kullanıcı için profil yönetimi UI'ı
  if (!isAdmin) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Profil Ayarları</h1>
          <p className="text-gray-600">Kişisel bilgilerinizi ve ayarlarınızı yönetin</p>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('profile')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'profile'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <FaUser className="inline mr-2" />
              Profil Bilgileri
            </button>
            {storeProfile && (
              <button
                onClick={() => setActiveTab('store')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'store'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <FaBuilding className="inline mr-2" />
                Mağaza Bilgileri
              </button>
            )}
            <button
              onClick={() => setActiveTab('password')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'password'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <FaLock className="inline mr-2" />
              Şifre Değiştir
            </button>
          </nav>
        </div>

        {profileLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            {/* Profil Bilgileri Tab */}
            {activeTab === 'profile' && userProfile && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Kişisel Bilgiler</h2>
                
                {userMessage && (
                  <div className={`mb-4 p-3 rounded-md ${
                    userMessage.startsWith('Hata') 
                      ? 'bg-red-50 border border-red-200 text-red-700' 
                      : 'bg-green-50 border border-green-200 text-green-700'
                  }`}>
                    {userMessage}
                  </div>
                )}

                <form onSubmit={handleUserSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Ad <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={userForm.name}
                        onChange={handleUserChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Soyad <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="surname"
                        value={userForm.surname}
                        onChange={handleUserChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Telefon
                      </label>
                      <input
                        type="tel"
                        name="phoneNumber"
                        value={userForm.phoneNumber}
                        onChange={handleUserChange}
                        placeholder="05xx xxx xx xx"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Kullanıcı Adı</label>
                      <p className="bg-gray-50 px-3 py-2 rounded-md text-gray-900">{userProfile.username}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">E-posta</label>
                      <p className="bg-gray-50 px-3 py-2 rounded-md text-gray-900">{userProfile.email}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Kullanıcı Tipi</label>
                      <p className="bg-gray-50 px-3 py-2 rounded-md text-gray-900">{userProfile.userType}</p>
                    </div>
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Adres
                    </label>
                    <textarea
                      name="adres"
                      value={userForm.adres}
                      onChange={handleUserChange}
                      rows={3}
                      placeholder="Tam adres bilginizi giriniz..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={userLoading}
                      className="px-6 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {userLoading ? 'Güncelleniyor...' : 'Güncelle'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Mağaza Bilgileri Tab */}
            {activeTab === 'store' && storeProfile && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Mağaza Bilgileri</h2>
                
                {storeMessage && (
                  <div className={`mb-4 p-3 rounded-md ${
                    storeMessage.startsWith('Hata') 
                      ? 'bg-red-50 border border-red-200 text-red-700' 
                      : 'bg-green-50 border border-green-200 text-green-700'
                  }`}>
                    {storeMessage}
                  </div>
                )}

                <form onSubmit={handleStoreSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Kurum Adı *
                      </label>
                      <input
                        type="text"
                        name="kurum_adi"
                        value={storeForm.kurum_adi}
                        onChange={handleStoreChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Vergi Numarası
                      </label>
                      <input
                        type="text"
                        name="vergi_numarasi"
                        value={storeForm.vergi_numarasi}
                        onChange={handleStoreChange}
                        placeholder="10-11 haneli sayısal değer"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Vergi Dairesi
                      </label>
                      <input
                        type="text"
                        name="vergi_dairesi"
                        value={storeForm.vergi_dairesi}
                        onChange={handleStoreChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Yetkili Adı
                      </label>
                      <input
                        type="text"
                        name="yetkili_adi"
                        value={storeForm.yetkili_adi}
                        onChange={handleStoreChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Yetkili Soyadı
                      </label>
                      <input
                        type="text"
                        name="yetkili_soyadi"
                        value={storeForm.yetkili_soyadi}
                        onChange={handleStoreChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        TCKN
                      </label>
                      <input
                        type="text"
                        name="tckn"
                        value={storeForm.tckn}
                        onChange={handleStoreChange}
                        maxLength={11}
                        placeholder="12345678901"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Telefon
                      </label>
                      <input
                        type="tel"
                        name="telefon"
                        value={storeForm.telefon}
                        onChange={handleStoreChange}
                        placeholder="0212 555 0123"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        E-posta
                      </label>
                      <input
                        type="email"
                        name="eposta"
                        value={storeForm.eposta}
                        onChange={handleStoreChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Faks Numarası
                      </label>
                      <input
                        type="tel"
                        name="faks_numarasi"
                        value={storeForm.faks_numarasi}
                        onChange={handleStoreChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={storeLoading}
                      className="px-6 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {storeLoading ? 'Güncelleniyor...' : 'Güncelle'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Şifre Değiştir Tab */}
            {activeTab === 'password' && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Şifre Değiştir</h2>
                
                {passwordMessage && (
                  <div className={`mb-4 p-3 rounded-md ${
                    passwordMessage.startsWith('Hata') 
                      ? 'bg-red-50 border border-red-200 text-red-700' 
                      : 'bg-green-50 border border-green-200 text-green-700'
                  }`}>
                    {passwordMessage}
                  </div>
                )}

                <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-md">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Mevcut Şifre *
                    </label>
                    <div className="relative">
                      <input
                        type={showCurrentPassword ? "text" : "password"}
                        name="currentPassword"
                        value={passwordForm.currentPassword}
                        onChange={handlePasswordChange}
                        required
                        className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      >
                        {showCurrentPassword ? <FaEyeSlash className="h-4 w-4 text-gray-400" /> : <FaEye className="h-4 w-4 text-gray-400" />}
                      </button>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Yeni Şifre *
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? "text" : "password"}
                        name="newPassword"
                        value={passwordForm.newPassword}
                        onChange={handlePasswordChange}
                        required
                        minLength={6}
                        className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      >
                        {showNewPassword ? <FaEyeSlash className="h-4 w-4 text-gray-400" /> : <FaEye className="h-4 w-4 text-gray-400" />}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">En az 6 karakter olmalıdır</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Yeni Şifre Onayı *
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        name="confirmPassword"
                        value={passwordForm.confirmPassword}
                        onChange={handlePasswordChange}
                        required
                        className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      >
                        {showConfirmPassword ? <FaEyeSlash className="h-4 w-4 text-gray-400" /> : <FaEye className="h-4 w-4 text-gray-400" />}
                      </button>
                    </div>
                  </div>
                  
                  <div className="pt-4">
                    <button
                      type="submit"
                      disabled={passwordLoading}
                      className="w-full px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {passwordLoading ? 'Değiştiriliyor...' : 'Şifre Değiştir'}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  // Admin için mevcut UI (değişiklik yok)
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Yükleniyor...</div>;
  }

  if (error) {
    return <div className="min-h-screen flex items-center justify-center text-red-500">{error}</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-black">Kullanıcı Yönetimi</h1>
        <button
          onClick={() => { setSelectedUser(null); setModalOpen(true); }}
          className="bg-blue-900 text-white rounded-full px-6 py-2 font-semibold flex items-center gap-2"
        >
          <FaPlus /> Yeni Kullanıcı
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kullanıcı Adı</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ad Soyad</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">E-posta</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kullanıcı Tipi</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mağaza</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Durum</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user, index) => (
                <tr
                  key={user.userId}
                  className={
                    `${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} ` +
                    (!user.isActive ? ' opacity-50 text-gray-400' : '')
                  }
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.username}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.fullName || ((user.name || '') + ' ' + (user.surname || ''))}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {typeof user.userType === 'object'
                      ? (user.userType.description || user.userType.name)
                      : user.userType}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.Store ? user.Store.kurum_adi : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {user.isActive ? 'Aktif' : 'Pasif'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleUserClick(user.userId)}
                      className="text-blue-600 hover:text-blue-900 mr-4"
                    >
                      <FaEdit />
                    </button>
                    <button
                      onClick={() => { 
                        setAssigningUserId(user.userId); 
                        setSelectedStoreId(user.Store?.store_id || '');
                        setAssignStoreModalOpen(true); 
                      }}
                      className="text-green-600 hover:text-green-900 mr-4"
                    >
                      <FaStore />
                    </button>
                    <button
                      onClick={() => { setDeleteUserId(user.userId); setDeleteModalOpen(true); }}
                      className="text-red-600 hover:text-red-900"
                    >
                      <FaTrash />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Kullanıcı Detay/Düzenleme Modalı */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-lg relative">
            <h2 className="text-lg font-bold mb-4 text-black">
              {selectedUser ? 'Kullanıcı Düzenle' : 'Yeni Kullanıcı Ekle'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex flex-col gap-1">
                <label htmlFor="username" className="text-sm font-semibold text-gray-700">Kullanıcı Adı</label>
                <input
                  name="username"
                  id="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  placeholder="Kullanıcı Adı"
                  className="border rounded px-3 py-2 text-black"
                  required
                />
              </div>
              {!selectedUser && (
                <div className="flex flex-col gap-1">
                  <label htmlFor="password" className="text-sm font-semibold text-gray-700">Şifre</label>
                  <input
                    name="password"
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="Şifre"
                    className="border rounded px-3 py-2 text-black"
                    required
                  />
                </div>
              )}
              <div className="flex flex-col gap-1">
                <label htmlFor="name" className="text-sm font-semibold text-gray-700">Ad</label>
                <input
                  name="name"
                  id="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Ad"
                  className="border rounded px-3 py-2 text-black"
                  required
                />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="surname" className="text-sm font-semibold text-gray-700">Soyad</label>
                <input
                  name="surname"
                  id="surname"
                  value={formData.surname}
                  onChange={handleInputChange}
                  placeholder="Soyad"
                  className="border rounded px-3 py-2 text-black"
                  required
                />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="email" className="text-sm font-semibold text-gray-700">E-posta</label>
                <input
                  name="email"
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="E-posta"
                  className="border rounded px-3 py-2 text-black"
                  required
                />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="phoneNumber" className="text-sm font-semibold text-gray-700">Telefon</label>
                <input
                  name="phoneNumber"
                  id="phoneNumber"
                  type="tel"
                  value={formData.phoneNumber}
                  onChange={handleInputChange}
                  placeholder="05xx xxx xx xx"
                  className="border rounded px-3 py-2 text-black"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="adres" className="text-sm font-semibold text-gray-700">Adres</label>
                <textarea
                  name="adres"
                  id="adres"
                  value={formData.adres}
                  onChange={handleInputChange}
                  placeholder="Kullanıcı adresi..."
                  rows={3}
                  className="border rounded px-3 py-2 text-black resize-none"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="userTypeName" className="text-sm font-semibold text-gray-700">Kullanıcı Tipi</label>
                <select
                  name="userTypeName"
                  id="userTypeName"
                  value={formData.userTypeName}
                  onChange={handleInputChange}
                  className="border rounded px-3 py-2 text-black"
                  required
                >
                  <option value="admin">Admin</option>
                  <option value="editor">Editör</option>
                  <option value="viewer">Görüntüleyici</option>
                </select>
              </div>
              {!selectedUser && (
                <div className="flex flex-col gap-1">
                  <label htmlFor="storeId" className="text-sm font-semibold text-gray-700">Mağaza</label>
                  <select
                    name="storeId"
                    id="storeId"
                    value={formData.storeId || ''}
                    onChange={handleInputChange}
                    className="border rounded px-3 py-2 text-black"
                    required
                  >
                    <option value="">Mağaza Seçin</option>
                    {stores.map(store => (
                      <option key={store.store_id} value={store.store_id}>
                        {store.kurum_adi}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex justify-end gap-2 mt-6">
                <button type="button" className="px-4 py-2 rounded bg-gray-200 text-black" onClick={() => { setModalOpen(false); setSelectedUser(null); }}>
                  Vazgeç
                </button>
                <button type="submit" className="bg-blue-900 text-white rounded px-6 py-2 font-semibold">
                  {selectedUser ? 'Güncelle' : 'Ekle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Silme Onay Modalı */}
      {deleteModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-lg relative">
            <h2 className="text-lg font-bold mb-4 text-black">Kullanıcıyı Sil</h2>
            <p className="text-gray-600 mb-6">Bu kullanıcıyı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.</p>
            <div className="flex justify-end gap-2">
              <button className="px-4 py-2 rounded bg-gray-200 text-black" onClick={() => { setDeleteModalOpen(false); setDeleteUserId(null); }}>Vazgeç</button>
              <button className="px-4 py-2 rounded bg-red-600 text-white" onClick={handleDeleteUser}>Evet</button>
            </div>
          </div>
        </div>
      )}

      {/* Mağaza Atama Modalı */}
      {assignStoreModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-lg relative">
            <h2 className="text-lg font-bold mb-4 text-black">Kullanıcı Mağaza Bilgileri</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Mağaza</label>
              <select
                value={selectedStoreId}
                onChange={(e) => setSelectedStoreId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-black"
              >
                <option value="" className="text-black">Mağaza seçin</option>
                {stores.map(store => (
                  <option key={store.store_id} value={store.store_id} className="text-black">
                    {store.kurum_adi}
                  </option>
                ))}
                {users.find(u => u.userId === assigningUserId)?.Store && (
                  <option value="remove" className="text-red-600 font-medium">
                    Mağaza Atamasını Kaldır
                  </option>
                )}
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <button 
                className="px-4 py-2 rounded bg-gray-200 text-black" 
                onClick={() => { 
                  setAssignStoreModalOpen(false); 
                  setAssigningUserId(null);
                  setSelectedStoreId('');
                }}
              >
                Vazgeç
              </button>
              <button 
                className={`px-4 py-2 rounded ${selectedStoreId === "remove" ? "bg-red-600" : "bg-blue-900"} text-white`}
                onClick={handleAssignStore}
                disabled={!selectedStoreId || assignLoading || removeLoading}
              >
                {assignLoading || removeLoading 
                  ? 'İşleniyor...' 
                  : selectedStoreId === "remove" 
                    ? 'Kaldır' 
                    : 'Ata'
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 