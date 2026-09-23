"use client";

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';
import { useToken } from '@/app/hooks/useToken';
import { FaPlus, FaEdit, FaTrash, FaStore, FaUser, FaLock, FaBuilding, FaEye, FaEyeSlash, FaMapMarkerAlt } from 'react-icons/fa';
import { getStores, assignUserToStore, removeUserFromStore, getMyProfile, updateStoreProfile, changePassword, updateUserProfile, StoreUpdateData, PasswordChangeData, UserProfileInfo, StoreProfileInfo, UserUpdateData, getStoreAddresses, createStoreAddress, updateStoreAddress, deleteStoreAddress, setDefaultStoreAddress, StoreAddress, CreateStoreAddressRequest } from '@/services/api';

interface User {
  userId: string;
  username: string;
  fullName?: string;
  name?: string;
  surname?: string;
  email: string;
  isActive: boolean;
  canSeePrice?: boolean;
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
  canSeePrice: boolean;
}

export default function Settings() {
  const { user, isAdmin, isAdminOrEditor, isLoading: authLoading } = useAuth();
  const canAssignAdmin = isAdmin;
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
    storeId: '',
    canSeePrice: true
  });
  const [assignStoreModalOpen, setAssignStoreModalOpen] = useState(false);
  const [assigningUserId, setAssigningUserId] = useState<string | null>(null);
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');
  const [stores, setStores] = useState<{store_id: string, kurum_adi: string}[]>([]);
  const [assignLoading, setAssignLoading] = useState(false);
  const [removeLoading, setRemoveLoading] = useState(false);
  
  // Custom dropdown state'leri
  const [userTypeDropdownOpen, setUserTypeDropdownOpen] = useState(false);
  const [storeDropdownOpen, setStoreDropdownOpen] = useState(false);
  const [assignStoreDropdownOpen, setAssignStoreDropdownOpen] = useState(false);
  
  // Normal kullanıcı için yeni state'ler
  const [activeTab, setActiveTab] = useState<'profile' | 'store' | 'address' | 'password'>('profile');
  const [userProfile, setUserProfile] = useState<UserProfileInfo | null>(null);
  const [storeProfile, setStoreProfile] = useState<StoreProfileInfo | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  
  // Adres yönetimi state'leri
  const [addresses, setAddresses] = useState<StoreAddress[]>([]);
  const [addressesLoading, setAddressesLoading] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState<StoreAddress | null>(null);
  const [newAddress, setNewAddress] = useState<CreateStoreAddressRequest>({
    title: '',
    address: '',
    city: '',
    district: '',
    postal_code: '',
    is_default: false
  });
  const [addingAddress, setAddingAddress] = useState(false);

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

  // Modal açıldığında body scroll'ını kapat
  useEffect(() => {
    if (modalOpen || showAddressModal || deleteModalOpen || assignStoreModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    // Cleanup function - component unmount olduğunda scroll'ı geri aç
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [modalOpen, showAddressModal, deleteModalOpen, assignStoreModalOpen]);

  useEffect(() => {
    // Auth yüklemesi tamamlanmadıysa bekle
    if (authLoading) return;
    
    // Admin ve editör kullanıcılar için mevcut logic
    if (isAdminOrEditor) {
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
  }, [isAdminOrEditor, authLoading, router]);

  // Dropdown'ların dışına tıklandığında kapanması
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.dropdown-container')) {
        setUserTypeDropdownOpen(false);
        setStoreDropdownOpen(false);
        setAssignStoreDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Seçili kullanıcı değiştiğinde formu doldur
  // NOT: Bu effect, aşağıdaki authLoading erken return'ünden ÖNCE olmalı (React hooks kuralı)
  useEffect(() => {
    if (selectedUser) {
      setFormData({
        username: selectedUser.username,
        name: (selectedUser.fullName || ((selectedUser.name || '') + ' ' + (selectedUser.surname || ''))).split(' ')[0],
        surname: (selectedUser.fullName || ((selectedUser.name || '') + ' ' + (selectedUser.surname || ''))).split(' ').slice(1).join(' '),
        email: selectedUser.email,
        phoneNumber: (selectedUser as any).phoneNumber || '',
        adres: '', // Artık kullanılmıyor - mağaza bazlı sistem
        userTypeName:
          typeof selectedUser.userType === 'object'
            ? selectedUser.userType.name
            : selectedUser.userType || '',
        storeId: selectedUser.Store?.store_id || '',
        canSeePrice: selectedUser.canSeePrice ?? true
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
        storeId: '',
        canSeePrice: true
      });
    }
  }, [selectedUser]);

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
          adres: '' // Artık kullanılmıyor - mağaza bazlı sistem
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

  // Adres yönetimi fonksiyonları
  const fetchAddresses = async () => {
    try {
      setAddressesLoading(true);
      const response = await getStoreAddresses();
      if (response.success) {
        setAddresses(response.data);
      }
    } catch (error) {
      console.error('Adresler getirilemedi:', error);
    } finally {
      setAddressesLoading(false);
    }
  };

  const handleAddressSubmit = async () => {
    if (!newAddress.title || !newAddress.address) {
      alert('Lütfen adres başlığı ve tam adres bilgilerini giriniz.');
      return;
    }

    try {
      setAddingAddress(true);
      if (editingAddress) {
        // Güncelleme modu
        await updateStoreAddress(editingAddress.id, newAddress);
        alert('Adres başarıyla güncellendi!');
      } else {
        // Yeni adres ekleme modu
        await createStoreAddress(newAddress);
        alert('Yeni adres başarıyla eklendi!');
      }
      
      setShowAddressModal(false);
      setEditingAddress(null);
      setNewAddress({
        title: '',
        address: '',
        city: '',
        district: '',
        postal_code: '',
        is_default: false
      });
      await fetchAddresses();
    } catch (error: any) {
      alert(error.message || 'Adres işlemi sırasında bir hata oluştu.');
    } finally {
      setAddingAddress(false);
    }
  };

  const handleEditAddress = (address: StoreAddress) => {
    setEditingAddress(address);
    setNewAddress({
      title: address.title,
      address: address.address,
      city: address.city,
      district: address.district,
      postal_code: address.postal_code,
      is_default: address.is_default
    });
    setShowAddressModal(true);
  };

  const handleDeleteAddress = async (addressId: string) => {
    if (confirm('Bu adresi silmek istediğinizden emin misiniz?')) {
      try {
        await deleteStoreAddress(addressId);
        alert('Adres başarıyla silindi!');
        await fetchAddresses();
      } catch (error: any) {
        alert(error.message || 'Adres silinemedi.');
      }
    }
  };

  const handleSetDefaultAddress = async (addressId: string) => {
    try {
      await setDefaultStoreAddress(addressId);
      alert('Varsayılan adres değiştirildi!');
      await fetchAddresses();
    } catch (error: any) {
      alert(error.message || 'Varsayılan adres ayarlanamadı.');
    }
  };

  const openCreateModal = () => {
    setEditingAddress(null);
    setNewAddress({
      title: '',
      address: '',
      city: '',
      district: '',
      postal_code: '',
      is_default: false
    });
    setShowAddressModal(true);
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

  const fetchUsers = async () => {
    // Zaten yükleme yapılıyorsa çık
    if (loading && users.length > 0) return;
    
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'https://pashahomeapps.up.railway.app'}/api/admin/users`, {
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
      })).sort((a, b) => a.kurum_adi.localeCompare(b.kurum_adi, 'tr-TR')));
    } catch (err: any) {
      setError(err.message || "Mağazalar yüklenirken bir hata oluştu");
    }
  };

  const handleUserClick = async (userId: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'https://pashahomeapps.up.railway.app'}/api/admin/users/${userId}`, {
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
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'https://pashahomeapps.up.railway.app'}/api/admin/users/${deleteUserId}`, {
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
      // Editörler yeni admin oluşturamaz veya bir kullanıcıyı admin yapamaz
      if (!canAssignAdmin) {
        const originalType = selectedUser
          ? (typeof selectedUser.userType === 'object' ? selectedUser.userType.name : selectedUser.userType)
          : null;
        if (formData.userTypeName === 'admin' && originalType !== 'admin') {
          setError('Admin kullanıcı ekleme veya admin yetkisi verme yetkiniz bulunmamaktadır.');
          return;
        }
      }

      const url = selectedUser 
        ? `${process.env.NEXT_PUBLIC_API_BASE_URL || 'https://pashahomeapps.up.railway.app'}/api/admin/users/${selectedUser.userId}`
        : `${process.env.NEXT_PUBLIC_API_BASE_URL || 'https://pashahomeapps.up.railway.app'}/api/admin/users`;
      
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
  if (!isAdminOrEditor) {
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
              onClick={() => {
                setActiveTab('address');
                if (addresses.length === 0) {
                  fetchAddresses();
                }
              }}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'address'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <FaMapMarkerAlt className="inline mr-2" />
              Adres Yönetimi
            </button>
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
                    <div className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-500 text-sm">
                      Adres bilgileri artık mağaza bazlı yönetilmektedir. Mağaza adres yönetimi için lütfen admin ile iletişime geçiniz.
                    </div>
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

            {/* Adres Yönetimi Tab */}
            {activeTab === 'address' && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-lg font-semibold text-gray-900">Adres Yönetimi</h2>
                  <button
                    onClick={openCreateModal}
                    className="bg-[#00365a] text-white px-4 py-2 rounded-lg hover:bg-[#004170] transition-colors flex items-center gap-2"
                  >
                    <FaPlus className="w-4 h-4" />
                    Yeni Adres Ekle
                  </button>
                </div>

                {addressesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : addresses.length === 0 ? (
                  <div className="text-center py-8">
                    <FaMapMarkerAlt className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Henüz adres yok</h3>
                    <p className="text-gray-600 mb-4">İlk adresinizi ekleyerek başlayın</p>
                    <button
                      onClick={openCreateModal}
                      className="bg-[#00365a] text-white px-6 py-2 rounded-lg hover:bg-[#004170] transition-colors"
                    >
                      İlk Adresi Ekle
                    </button>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {addresses.map((address) => (
                      <div
                        key={address.id}
                        className={`border rounded-lg p-4 ${
                          address.is_default 
                            ? 'border-green-200 bg-green-50' 
                            : 'border-gray-200 bg-white'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-medium text-gray-900">{address.title}</h3>
                              {address.is_default && (
                                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                                  Varsayılan
                                </span>
                              )}
                            </div>
                            <p className="text-gray-600 text-sm mb-1">{address.address}</p>
                            {(address.city || address.district) && (
                              <p className="text-gray-500 text-sm">
                                {address.district && address.district + ', '}
                                {address.city}
                                {address.postal_code && ' - ' + address.postal_code}
                              </p>
                            )}
                          </div>
                          
                          <div className="flex gap-2">
                            {!address.is_default && (
                              <button
                                onClick={() => handleSetDefaultAddress(address.id)}
                                className="text-green-600 hover:text-green-700 p-2 rounded-lg hover:bg-green-50 transition-colors"
                                title="Varsayılan yap"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              </button>
                            )}
                            <button
                              onClick={() => handleEditAddress(address)}
                              className="text-blue-600 hover:text-blue-700 p-2 rounded-lg hover:bg-blue-50 transition-colors"
                              title="Düzenle"
                            >
                              <FaEdit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteAddress(address.id)}
                              className="text-red-600 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-colors"
                              title="Sil"
                            >
                              <FaTrash className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
        
        {/* Adres Ekleme/Düzenleme Modal - Normal kullanıcı için */}
        {showAddressModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[9999]">
            <div className="bg-white rounded-xl max-w-2xl w-full shadow-2xl">
              <div className="bg-[#00365a] text-white rounded-t-xl p-6">
                <h3 className="text-xl font-bold">
                  {editingAddress ? 'Adres Düzenle' : 'Yeni Adres Ekle'}
                </h3>
                <p className="text-blue-100 text-sm mt-1">
                  Adres bilgilerini girin
                </p>
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Adres Başlığı <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newAddress.title}
                      onChange={(e) => setNewAddress(prev => ({ ...prev, title: e.target.value }))}
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
                      value={newAddress.address}
                      onChange={(e) => setNewAddress(prev => ({ ...prev, address: e.target.value }))}
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
                      value={newAddress.district}
                      onChange={(e) => setNewAddress(prev => ({ ...prev, district: e.target.value }))}
                      placeholder="Örn: Kadıköy"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Şehir</label>
                    <input
                      type="text"
                      value={newAddress.city}
                      onChange={(e) => setNewAddress(prev => ({ ...prev, city: e.target.value }))}
                      placeholder="Örn: İstanbul"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Posta Kodu</label>
                    <input
                      type="text"
                      value={newAddress.postal_code}
                      onChange={(e) => setNewAddress(prev => ({ ...prev, postal_code: e.target.value }))}
                      placeholder="Örn: 34710"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div className="flex items-center">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={newAddress.is_default}
                        onChange={(e) => setNewAddress(prev => ({ ...prev, is_default: e.target.checked }))}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Varsayılan adres olarak ayarla</span>
                    </label>
                  </div>
                </div>
                
                <div className="flex justify-end gap-3 mt-6">
                  <button
                    onClick={() => {
                      setShowAddressModal(false);
                      setEditingAddress(null);
                      setNewAddress({
                        title: '',
                        address: '',
                        city: '',
                        district: '',
                        postal_code: '',
                        is_default: false
                      });
                    }}
                    className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    İptal
                  </button>
                  <button
                    onClick={handleAddressSubmit}
                    disabled={addingAddress || !newAddress.title || !newAddress.address}
                    className="px-6 py-2 bg-[#00365a] text-white rounded-lg hover:bg-[#004170] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {addingAddress ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                        {editingAddress ? 'Güncelleniyor...' : 'Ekleniyor...'}
                      </>
                    ) : (
                      <>
                        <FaPlus className="w-4 h-4" />
                        {editingAddress ? 'Güncelle' : 'Adres Ekle'}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
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
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
      {/* Modern Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Kullanıcı Yönetimi</h1>
            <p className="text-gray-600">Sistem kullanıcılarını yönetin ve yeni kullanıcılar ekleyin</p>
          </div>
          <button
            onClick={() => { setSelectedUser(null); setModalOpen(true); }}
            className="bg-[#00365a] hover:bg-[#004170] text-white rounded-xl px-6 py-3 font-semibold flex items-center gap-2 transition-all shadow-lg hover:shadow-xl"
          >
            <FaPlus className="w-4 h-4" /> Yeni Kullanıcı
          </button>
        </div>
      </div>

      {/* Modern Table Container */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden w-full">
        <div className="overflow-x-auto">
          <table className="w-full divide-y divide-gray-200">
            <thead className="bg-gradient-to-r from-[#00365a] to-[#004170]">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider w-1/7">Kullanıcı Adı</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider w-1/7">Ad Soyad</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider w-1/5">E-posta</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider w-1/8">Kullanıcı Tipi</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider w-1/4">Mağaza</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider w-1/8">Durum</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-white uppercase tracking-wider w-1/8">İşlemler</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {users.map((user, index) => (
                <tr
                  key={user.userId}
                  className={`hover:bg-gray-50 transition-colors ${
                    !user.isActive ? 'opacity-60' : ''
                  }`}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="h-8 w-8 rounded-full bg-gradient-to-r from-[#00365a] to-[#004170] flex items-center justify-center text-white text-sm font-semibold mr-3 flex-shrink-0">
                        {user.username.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm font-medium text-gray-900 truncate">{user.username}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-900 truncate block">
                      {user.fullName || ((user.name || '') + ' ' + (user.surname || ''))}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-900 truncate block" title={user.email}>{user.email}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {(() => {
                        const userTypeName = typeof user.userType === 'object' ? user.userType.name : user.userType;
                        switch(userTypeName) {
                          case 'admin': return 'Admin';
                          case 'editor': return 'Editör';
                          case 'viewer': return 'Görüntüleyici';
                          case 'employee': return 'Çalışan';
                          default: return userTypeName;
                        }
                      })()}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-900 truncate block" title={user.Store ? user.Store.kurum_adi : '-'}>
                      {user.Store ? user.Store.kurum_adi : '-'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      user.isActive 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {user.isActive ? 'Aktif' : 'Pasif'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => handleUserClick(user.userId)}
                        className="p-2 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Düzenle"
                      >
                        <FaEdit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => { 
                          setAssigningUserId(user.userId); 
                          setSelectedStoreId(user.Store?.store_id || '');
                          setAssignStoreModalOpen(true); 
                        }}
                        className="p-2 text-green-600 hover:text-green-900 hover:bg-green-50 rounded-lg transition-colors"
                        title="Mağaza Ata"
                      >
                        <FaStore className="w-4 h-4" />
                      </button>
                      {isAdmin && (
                        <button
                          onClick={() => { setDeleteUserId(user.userId); setDeleteModalOpen(true); }}
                          className="p-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded-lg transition-colors"
                          title="Sil"
                        >
                          <FaTrash className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Kullanıcı Detay/Düzenleme Modalı */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full h-[95vh] overflow-y-auto shadow-2xl" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-[#00365a] to-[#004170] text-white rounded-t-2xl p-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold">
                    {selectedUser ? 'Kullanıcı Düzenle' : 'Yeni Kullanıcı Ekle'}
                  </h2>
                  <p className="text-blue-100 text-sm mt-1">
                    {selectedUser ? 'Kullanıcı bilgilerini güncelleyin' : 'Yeni kullanıcı bilgilerini girin'}
                  </p>
                </div>
                <button
                  onClick={() => { setModalOpen(false); setSelectedUser(null); }}
                  className="text-blue-100 hover:text-white transition-colors p-2 hover:bg-white hover:bg-opacity-20 rounded-xl"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Kullanıcı Adı */}
                <div>
                  <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">Kullanıcı Adı <span className="text-red-500">*</span></label>
                  <input
                    name="username"
                    id="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    placeholder="Kullanıcı adını girin"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00365a] focus:border-transparent transition-colors"
                    required
                  />
                </div>

                {/* Şifre - Sadece yeni kullanıcı için */}
                {!selectedUser && (
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">Şifre <span className="text-red-500">*</span></label>
                    <input
                      name="password"
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      placeholder="Şifre girin"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00365a] focus:border-transparent transition-colors"
                      required
                    />
                  </div>
                )}

                {/* Ad */}
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">Ad <span className="text-red-500">*</span></label>
                  <input
                    name="name"
                    id="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Adını girin"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00365a] focus:border-transparent transition-colors"
                    required
                  />
                </div>

                {/* Soyad */}
                <div>
                  <label htmlFor="surname" className="block text-sm font-medium text-gray-700 mb-2">Soyad <span className="text-red-500">*</span></label>
                  <input
                    name="surname"
                    id="surname"
                    value={formData.surname}
                    onChange={handleInputChange}
                    placeholder="Soyadını girin"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00365a] focus:border-transparent transition-colors"
                    required
                  />
                </div>

                {/* E-posta */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">E-posta <span className="text-red-500">*</span></label>
                  <input
                    name="email"
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="E-posta adresini girin"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00365a] focus:border-transparent transition-colors"
                    required
                  />
                </div>

                {/* Telefon */}
                <div>
                  <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-2">Telefon</label>
                  <input
                    name="phoneNumber"
                    id="phoneNumber"
                    type="tel"
                    value={formData.phoneNumber}
                    onChange={handleInputChange}
                    placeholder="05xx xxx xx xx"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00365a] focus:border-transparent transition-colors"
                  />
                </div>
              </div>

              {/* Adres - Artık kullanılmıyor */}
              <div>
                <label htmlFor="adres" className="block text-sm font-medium text-gray-700 mb-2">Adres</label>
                <div className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 text-sm">
                  Adres bilgileri artık mağaza bazlı yönetilmektedir. Mağaza ayarlarından adres yönetimini yapabilirsiniz.
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Kullanıcı Tipi Dropdown */}
                <div className="dropdown-container">
                  <label htmlFor="userTypeName" className="block text-sm font-medium text-gray-700 mb-2">Kullanıcı Tipi <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setUserTypeDropdownOpen(!userTypeDropdownOpen)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00365a] focus:border-transparent transition-colors text-left bg-white"
                    >
                      <span className="text-gray-900">
                        {formData.userTypeName === "admin" && "Admin"}
                        {formData.userTypeName === "editor" && "Editör"}
                        {formData.userTypeName === "viewer" && "Görüntüleyici"}
                        {formData.userTypeName === "employee" && "Çalışan"}
                      </span>
                      <svg 
                        className={`absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 transition-transform ${userTypeDropdownOpen ? 'rotate-180' : ''}`}
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    
                    {userTypeDropdownOpen && (
                      <div className="absolute z-[100] w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto scrollbar-hide">
                        {canAssignAdmin && (
                          <div
                            className={`px-3 py-2 cursor-pointer hover:bg-gray-50 transition-colors ${
                              formData.userTypeName === "admin" ? 'bg-blue-50 text-blue-900' : 'text-gray-900'
                            }`}
                            onClick={() => {
                              setFormData(prev => ({ ...prev, userTypeName: "admin" }));
                              setUserTypeDropdownOpen(false);
                            }}
                          >
                            Admin
                          </div>
                        )}
                        <div
                          className={`px-3 py-2 cursor-pointer hover:bg-gray-50 transition-colors ${
                            formData.userTypeName === "editor" ? 'bg-blue-50 text-blue-900' : 'text-gray-900'
                          }`}
                          onClick={() => {
                            setFormData(prev => ({ ...prev, userTypeName: "editor" }));
                            setUserTypeDropdownOpen(false);
                          }}
                        >
                          Editör
                        </div>
                        <div
                          className={`px-3 py-2 cursor-pointer hover:bg-gray-50 transition-colors ${
                            formData.userTypeName === "viewer" ? 'bg-blue-50 text-blue-900' : 'text-gray-900'
                          }`}
                          onClick={() => {
                            setFormData(prev => ({ ...prev, userTypeName: "viewer" }));
                            setUserTypeDropdownOpen(false);
                          }}
                        >
                          Görüntüleyici
                        </div>
                        <div
                          className={`px-3 py-2 cursor-pointer hover:bg-gray-50 transition-colors ${
                            formData.userTypeName === "employee" ? 'bg-blue-50 text-blue-900' : 'text-gray-900'
                          }`}
                          onClick={() => {
                            setFormData(prev => ({ ...prev, userTypeName: "employee" }));
                            setUserTypeDropdownOpen(false);
                          }}
                        >
                          Çalışan
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Mağaza Dropdown - Sadece yeni kullanıcı için */}
                {!selectedUser && (
                  <div className="dropdown-container">
                    <label htmlFor="storeId" className="block text-sm font-medium text-gray-700 mb-2">Mağaza <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setStoreDropdownOpen(!storeDropdownOpen)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00365a] focus:border-transparent transition-colors text-left bg-white"
                      >
                        <span className="text-gray-900">
                          {formData.storeId ? 
                            stores.find(s => s.store_id === formData.storeId)?.kurum_adi || 'Seçili Mağaza' :
                            'Mağaza seçin'
                          }
                        </span>
                        <svg 
                          className={`absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 transition-transform ${storeDropdownOpen ? 'rotate-180' : ''}`}
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      
                      {storeDropdownOpen && (
                        <div className="absolute z-[100] w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto scrollbar-hide">
                          {stores.map((store) => (
                            <div
                              key={store.store_id}
                              className={`px-3 py-2 cursor-pointer hover:bg-gray-50 transition-colors ${
                                formData.storeId === store.store_id ? 'bg-blue-50 text-blue-900' : 'text-gray-900'
                              }`}
                              onClick={() => {
                                setFormData(prev => ({ ...prev, storeId: store.store_id }));
                                setStoreDropdownOpen(false);
                              }}
                            >
                              {store.kurum_adi}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Fiyat Görme Yetkisi */}
                <div className="md:col-span-2">
                  <div className="flex items-center space-x-3 bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="canSeePrice"
                        name="canSeePrice"
                        checked={formData.canSeePrice}
                        onChange={(e) => setFormData(prev => ({ ...prev, canSeePrice: e.target.checked }))}
                        className="h-4 w-4 text-[#00365a] focus:ring-[#00365a] border-gray-300 rounded"
                      />
                    </div>
                    <div className="flex-1">
                      <label htmlFor="canSeePrice" className="block text-sm font-medium text-gray-700">
                        Fiyat Görme Yetkisi
                      </label>
                      <p className="text-xs text-gray-500 mt-1">
                        Bu kullanıcı ürün fiyatlarını görebilir
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Butonlar */}
              <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
                <button 
                  type="button" 
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors" 
                  onClick={() => { setModalOpen(false); setSelectedUser(null); }}
                >
                  Vazgeç
                </button>
                <button 
                  type="submit" 
                  className="bg-[#00365a] hover:bg-[#004170] text-white rounded-lg px-6 py-2 font-semibold transition-colors"
                >
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
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-[#00365a] to-[#004170] text-white rounded-t-2xl p-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold">Kullanıcı Mağaza Bilgileri</h2>
                  <p className="text-blue-100 text-sm mt-1">Kullanıcıya mağaza atayın veya kaldırın</p>
                </div>
                <button
                  onClick={() => { setAssignStoreModalOpen(false); setAssigningUserId(null); setSelectedStoreId(''); }}
                  className="text-blue-100 hover:text-white transition-colors p-2 hover:bg-white hover:bg-opacity-20 rounded-xl"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              <div className="dropdown-container">
                <label className="block text-sm font-medium text-gray-700 mb-2">Mağaza</label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setAssignStoreDropdownOpen(!assignStoreDropdownOpen)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00365a] focus:border-transparent transition-colors text-left bg-white"
                  >
                    <span className="text-gray-900">
                      {selectedStoreId === "remove" ? "Mağaza Atamasını Kaldır" :
                        selectedStoreId ? 
                          stores.find(s => s.store_id === selectedStoreId)?.kurum_adi || 'Seçili Mağaza' :
                          'Mağaza seçin'
                      }
                    </span>
                    <svg 
                      className={`absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 transition-transform ${assignStoreDropdownOpen ? 'rotate-180' : ''}`}
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  {assignStoreDropdownOpen && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto scrollbar-hide">
                      {stores.map((store) => (
                        <div
                          key={store.store_id}
                          className={`px-3 py-2 cursor-pointer hover:bg-gray-50 transition-colors ${
                            selectedStoreId === store.store_id ? 'bg-blue-50 text-blue-900' : 'text-gray-900'
                          }`}
                          onClick={() => {
                            setSelectedStoreId(store.store_id);
                            setAssignStoreDropdownOpen(false);
                          }}
                        >
                          {store.kurum_adi}
                        </div>
                      ))}
                      {users.find(u => u.userId === assigningUserId)?.Store && (
                        <div
                          className={`px-3 py-2 cursor-pointer hover:bg-red-50 transition-colors border-t border-gray-200 ${
                            selectedStoreId === "remove" ? 'bg-red-50 text-red-900' : 'text-red-600'
                          }`}
                          onClick={() => {
                            setSelectedStoreId("remove");
                            setAssignStoreDropdownOpen(false);
                          }}
                        >
                          Mağaza Atamasını Kaldır
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Butonlar */}
              <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
                <button 
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors" 
                  onClick={() => { 
                    setAssignStoreModalOpen(false); 
                    setAssigningUserId(null);
                    setSelectedStoreId('');
                  }}
                >
                  Vazgeç
                </button>
                <button 
                  className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                    selectedStoreId === "remove" 
                      ? "bg-red-600 hover:bg-red-700 text-white" 
                      : "bg-[#00365a] hover:bg-[#004170] text-white"
                  }`}
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
        </div>
      )}

    </div>
  );
} 