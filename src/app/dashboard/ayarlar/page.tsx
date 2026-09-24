"use client";

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';
import { useToken } from '@/app/hooks/useToken';
import { FaEdit, FaTrash, FaStore, FaEye, FaEyeSlash } from 'react-icons/fa';
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
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#f7f8fa]">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-slate-200 border-t-[#00365a]" />
        <p className="text-sm text-slate-500">Yetkilendirme kontrol ediliyor...</p>
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
    const tabClass = (tab: typeof activeTab) =>
      `border-b-2 px-1 py-2 text-sm font-medium transition-colors ${
        activeTab === tab
          ? 'border-[#00365a] text-[#00365a]'
          : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
      }`;

    return (
      <div className="min-h-screen bg-[#f7f8fa]">
        <div className="mx-auto max-w-4xl px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
          <div className="mb-6 sm:mb-8">
            <h1 className="text-2xl font-light tracking-[0.08em] text-neutral-900 sm:text-3xl sm:tracking-[0.12em]">
              Profil Ayarları
            </h1>
            <div className="mt-3 h-px w-[min(100%,20rem)] bg-neutral-300 sm:mt-4" />
            <p className="mt-3 text-sm text-slate-500">Kişisel bilgilerinizi ve ayarlarınızı yönetin</p>
          </div>

          <div className="mb-6 border-b border-slate-200">
            <nav className="-mb-px flex flex-wrap gap-x-6 gap-y-1">
              <button type="button" onClick={() => setActiveTab('profile')} className={tabClass('profile')}>
                Profil Bilgileri
              </button>
              {storeProfile && (
                <button type="button" onClick={() => setActiveTab('store')} className={tabClass('store')}>
                  Mağaza Bilgileri
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setActiveTab('address');
                  if (addresses.length === 0) {
                    fetchAddresses();
                  }
                }}
                className={tabClass('address')}
              >
                Adres Yönetimi
              </button>
              <button type="button" onClick={() => setActiveTab('password')} className={tabClass('password')}>
                Şifre Değiştir
              </button>
            </nav>
          </div>

        {profileLoading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16">
            <div className="h-9 w-9 animate-spin rounded-full border-2 border-slate-200 border-t-[#00365a]" />
            <p className="text-sm text-slate-500">Profil bilgileri yükleniyor...</p>
          </div>
        ) : (
          <>
            {/* Profil Bilgileri Tab */}
            {activeTab === 'profile' && userProfile && (
              <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
                <h2 className="mb-4 text-sm font-semibold text-slate-900">Kişisel Bilgiler</h2>
                
                {userMessage && (
                  <div className={`mb-4 text-sm ${
                    userMessage.startsWith('Hata') 
                      ? 'rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-3 text-rose-700' 
                      : 'rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-emerald-700'
                  }`}>
                    {userMessage}
                  </div>
                )}

                <form onSubmit={handleUserSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                        Ad <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={userForm.name}
                        onChange={handleUserChange}
                        required
                        className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition hover:border-slate-400 focus:border-[#00365a] focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                        Soyad <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="surname"
                        value={userForm.surname}
                        onChange={handleUserChange}
                        required
                        className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition hover:border-slate-400 focus:border-[#00365a] focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                        Telefon
                      </label>
                      <input
                        type="tel"
                        name="phoneNumber"
                        value={userForm.phoneNumber}
                        onChange={handleUserChange}
                        placeholder="05xx xxx xx xx"
                        className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition hover:border-slate-400 focus:border-[#00365a] focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">Kullanıcı Adı</label>
                      <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900">{userProfile.username}</p>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">E-posta</label>
                      <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900">{userProfile.email}</p>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">Kullanıcı Tipi</label>
                      <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900">{userProfile.userType}</p>
                    </div>
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                      Adres
                    </label>
                    <div className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-500">
                      Adres bilgileri artık mağaza bazlı yönetilmektedir. Mağaza adres yönetimi için lütfen admin ile iletişime geçiniz.
                    </div>
                  </div>
                  
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={userLoading}
                      className="inline-flex items-center justify-center rounded-lg bg-[#00365a] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#004170] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/25 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {userLoading ? 'Güncelleniyor...' : 'Güncelle'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Mağaza Bilgileri Tab */}
            {activeTab === 'store' && storeProfile && (
              <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
                <h2 className="mb-4 text-sm font-semibold text-slate-900">Mağaza Bilgileri</h2>
                
                {storeMessage && (
                  <div className={`mb-4 text-sm ${
                    storeMessage.startsWith('Hata') 
                      ? 'rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-3 text-rose-700' 
                      : 'rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-emerald-700'
                  }`}>
                    {storeMessage}
                  </div>
                )}

                <form onSubmit={handleStoreSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                        Kurum Adı *
                      </label>
                      <input
                        type="text"
                        name="kurum_adi"
                        value={storeForm.kurum_adi}
                        onChange={handleStoreChange}
                        required
                        className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition hover:border-slate-400 focus:border-[#00365a] focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15"
                      />
                    </div>
                    
                    <div>
                      <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                        Vergi Numarası
                      </label>
                      <input
                        type="text"
                        name="vergi_numarasi"
                        value={storeForm.vergi_numarasi}
                        onChange={handleStoreChange}
                        placeholder="10-11 haneli sayısal değer"
                        className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition hover:border-slate-400 focus:border-[#00365a] focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15"
                      />
                    </div>
                    
                    <div>
                      <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                        Vergi Dairesi
                      </label>
                      <input
                        type="text"
                        name="vergi_dairesi"
                        value={storeForm.vergi_dairesi}
                        onChange={handleStoreChange}
                        className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition hover:border-slate-400 focus:border-[#00365a] focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15"
                      />
                    </div>
                    
                    <div>
                      <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                        Yetkili Adı
                      </label>
                      <input
                        type="text"
                        name="yetkili_adi"
                        value={storeForm.yetkili_adi}
                        onChange={handleStoreChange}
                        className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition hover:border-slate-400 focus:border-[#00365a] focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15"
                      />
                    </div>
                    
                    <div>
                      <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                        Yetkili Soyadı
                      </label>
                      <input
                        type="text"
                        name="yetkili_soyadi"
                        value={storeForm.yetkili_soyadi}
                        onChange={handleStoreChange}
                        className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition hover:border-slate-400 focus:border-[#00365a] focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15"
                      />
                    </div>
                    
                    <div>
                      <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                        TCKN
                      </label>
                      <input
                        type="text"
                        name="tckn"
                        value={storeForm.tckn}
                        onChange={handleStoreChange}
                        maxLength={11}
                        placeholder="12345678901"
                        className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition hover:border-slate-400 focus:border-[#00365a] focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15"
                      />
                    </div>
                    
                    <div>
                      <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                        Telefon
                      </label>
                      <input
                        type="tel"
                        name="telefon"
                        value={storeForm.telefon}
                        onChange={handleStoreChange}
                        placeholder="0212 555 0123"
                        className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition hover:border-slate-400 focus:border-[#00365a] focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15"
                      />
                    </div>
                    
                    <div>
                      <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                        E-posta
                      </label>
                      <input
                        type="email"
                        name="eposta"
                        value={storeForm.eposta}
                        onChange={handleStoreChange}
                        className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition hover:border-slate-400 focus:border-[#00365a] focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15"
                      />
                    </div>
                    
                    <div>
                      <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                        Faks Numarası
                      </label>
                      <input
                        type="tel"
                        name="faks_numarasi"
                        value={storeForm.faks_numarasi}
                        onChange={handleStoreChange}
                        className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition hover:border-slate-400 focus:border-[#00365a] focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15"
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={storeLoading}
                      className="inline-flex items-center justify-center rounded-lg bg-[#00365a] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#004170] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/25 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {storeLoading ? 'Güncelleniyor...' : 'Güncelle'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Şifre Değiştir Tab */}
            {activeTab === 'password' && (
              <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
                <h2 className="mb-4 text-sm font-semibold text-slate-900">Şifre Değiştir</h2>
                
                {passwordMessage && (
                  <div className={`mb-4 text-sm ${
                    passwordMessage.startsWith('Hata') 
                      ? 'rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-3 text-rose-700' 
                      : 'rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-emerald-700'
                  }`}>
                    {passwordMessage}
                  </div>
                )}

                <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-md">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                      Mevcut Şifre *
                    </label>
                    <div className="relative">
                      <input
                        type={showCurrentPassword ? "text" : "password"}
                        name="currentPassword"
                        value={passwordForm.currentPassword}
                        onChange={handlePasswordChange}
                        required
                        className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 pr-10 text-sm text-slate-900 placeholder:text-slate-400 transition hover:border-slate-400 focus:border-[#00365a] focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      >
                        {showCurrentPassword ? <FaEyeSlash className="h-4 w-4 text-slate-400" /> : <FaEye className="h-4 w-4 text-slate-400" />}
                      </button>
                    </div>
                  </div>
                  
                  <div>
                    <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
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
                        className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 pr-10 text-sm text-slate-900 placeholder:text-slate-400 transition hover:border-slate-400 focus:border-[#00365a] focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      >
                        {showNewPassword ? <FaEyeSlash className="h-4 w-4 text-slate-400" /> : <FaEye className="h-4 w-4 text-slate-400" />}
                      </button>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">En az 6 karakter olmalıdır</p>
                  </div>
                  
                  <div>
                    <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                      Yeni Şifre Onayı *
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        name="confirmPassword"
                        value={passwordForm.confirmPassword}
                        onChange={handlePasswordChange}
                        required
                        className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 pr-10 text-sm text-slate-900 placeholder:text-slate-400 transition hover:border-slate-400 focus:border-[#00365a] focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      >
                        {showConfirmPassword ? <FaEyeSlash className="h-4 w-4 text-slate-400" /> : <FaEye className="h-4 w-4 text-slate-400" />}
                      </button>
                    </div>
                  </div>
                  
                  <div className="pt-4">
                    <button
                      type="submit"
                      disabled={passwordLoading}
                      className="inline-flex w-full items-center justify-center rounded-lg bg-[#00365a] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#004170] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/25 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {passwordLoading ? 'Değiştiriliyor...' : 'Şifre Değiştir'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Adres Yönetimi Tab */}
            {activeTab === 'address' && (
              <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
                <div className="flex items-center justify-between gap-3 border-b border-slate-200/80 bg-slate-50/60 px-4 py-3 sm:px-5">
                  <h3 className="text-sm font-semibold text-slate-900">Adres Yönetimi</h3>
                  <button
                    type="button"
                    onClick={openCreateModal}
                    className="inline-flex items-center justify-center rounded-lg bg-[#00365a] px-3 py-2 text-xs font-medium text-white transition hover:bg-[#004170]"
                  >
                    Yeni Adres Ekle
                  </button>
                </div>

                <div className="p-4 sm:p-5">
                {addressesLoading ? (
                  <div className="flex flex-col items-center justify-center gap-3 py-16">
                    <div className="h-9 w-9 animate-spin rounded-full border-2 border-slate-200 border-t-[#00365a]" />
                    <p className="text-sm text-slate-500">Adresler yükleniyor...</p>
                  </div>
                ) : addresses.length === 0 ? (
                  <div className="px-6 py-16 text-center">
                    <h3 className="text-sm font-medium text-slate-900">Henüz adres yok</h3>
                    <p className="mx-auto mt-1.5 max-w-md text-sm text-slate-500">İlk adresinizi ekleyerek başlayın</p>
                    <button
                      type="button"
                      onClick={openCreateModal}
                      className="mt-4 inline-flex items-center justify-center rounded-lg bg-[#00365a] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#004170] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/25"
                    >
                      İlk Adresi Ekle
                    </button>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {addresses.map((address) => (
                      <div
                        key={address.id}
                        className={`rounded-lg border p-4 ${
                          address.is_default
                            ? 'border-emerald-200 bg-emerald-50/50'
                            : 'border-slate-200 bg-white'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="mb-2 flex flex-wrap items-center gap-2">
                              <h3 className="text-sm font-medium text-slate-900">{address.title}</h3>
                              {address.is_default && (
                                <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                                  Varsayılan
                                </span>
                              )}
                            </div>
                            <p className="mb-1 text-sm text-slate-700">{address.address}</p>
                            {(address.city || address.district) && (
                              <p className="text-sm text-slate-500">
                                {address.district && address.district + ', '}
                                {address.city}
                                {address.postal_code && ' - ' + address.postal_code}
                              </p>
                            )}
                          </div>

                          <div className="flex gap-1">
                            {!address.is_default && (
                              <button
                                type="button"
                                onClick={() => handleSetDefaultAddress(address.id)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-[#00365a] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15"
                                title="Varsayılan yap"
                              >
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleEditAddress(address)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-[#00365a] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15"
                              title="Düzenle"
                            >
                              <FaEdit className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteAddress(address.id)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-rose-600 transition hover:bg-rose-50 hover:text-rose-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/20"
                              title="Sil"
                            >
                              <FaTrash className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                </div>
              </div>
            )}
          </>
        )}
        
        {/* Adres Ekleme/Düzenleme Modal - Normal kullanıcı için */}
        {showAddressModal && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/50 p-4">
            <div className="max-h-[92vh] w-full max-w-2xl overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-lg">
              <div className="border-b border-slate-200/80 px-5 py-4">
                <h3 className="text-base font-semibold text-slate-900">
                  {editingAddress ? 'Adres Düzenle' : 'Yeni Adres Ekle'}
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">Adres bilgilerini girin</p>
              </div>
              
              <div className="max-h-[calc(92vh-8rem)] overflow-y-auto px-5 py-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                      Adres Başlığı <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newAddress.title}
                      onChange={(e) => setNewAddress(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Örn: Ana Mağaza, Depo, Şube 1"
                      className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition hover:border-slate-400 focus:border-[#00365a] focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15"
                      required
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                      Tam Adres <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      value={newAddress.address}
                      onChange={(e) => setNewAddress(prev => ({ ...prev, address: e.target.value }))}
                      placeholder="Sokak, cadde, mahalle, bina no vs."
                      rows={3}
                      className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition hover:border-slate-400 focus:border-[#00365a] focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">İlçe</label>
                    <input
                      type="text"
                      value={newAddress.district}
                      onChange={(e) => setNewAddress(prev => ({ ...prev, district: e.target.value }))}
                      placeholder="Örn: Kadıköy"
                      className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition hover:border-slate-400 focus:border-[#00365a] focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15"
                    />
                  </div>
                  
                  <div>
                    <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">Şehir</label>
                    <input
                      type="text"
                      value={newAddress.city}
                      onChange={(e) => setNewAddress(prev => ({ ...prev, city: e.target.value }))}
                      placeholder="Örn: İstanbul"
                      className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition hover:border-slate-400 focus:border-[#00365a] focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15"
                    />
                  </div>
                  
                  <div>
                    <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">Posta Kodu</label>
                    <input
                      type="text"
                      value={newAddress.postal_code}
                      onChange={(e) => setNewAddress(prev => ({ ...prev, postal_code: e.target.value }))}
                      placeholder="Örn: 34710"
                      className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition hover:border-slate-400 focus:border-[#00365a] focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15"
                    />
                  </div>
                  
                  <div className="flex items-center">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={newAddress.is_default}
                        onChange={(e) => setNewAddress(prev => ({ ...prev, is_default: e.target.checked }))}
                        className="rounded border-slate-300 text-[#00365a] focus:ring-[#00365a]"
                      />
                      <span className="ml-2 text-sm text-slate-700">Varsayılan adres olarak ayarla</span>
                    </label>
                  </div>
                </div>
                
              </div>
              <div className="flex justify-end gap-2 border-t border-slate-200/80 bg-slate-50/60 px-5 py-3.5">
                <button
                  type="button"
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
                  className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15"
                >
                  İptal
                </button>
                <button
                  type="button"
                  onClick={handleAddressSubmit}
                  disabled={addingAddress || !newAddress.title || !newAddress.address}
                  className="inline-flex items-center justify-center rounded-lg bg-[#00365a] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#004170] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/25 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {addingAddress
                    ? (editingAddress ? 'Güncelleniyor...' : 'Ekleniyor...')
                    : (editingAddress ? 'Güncelle' : 'Adres Ekle')}
                </button>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f7f8fa]">
        <div className="flex flex-col items-center justify-center gap-3 py-16 min-h-screen">
          <div className="h-9 w-9 animate-spin rounded-full border-2 border-slate-200 border-t-[#00365a]" />
          <p className="text-sm text-slate-500">Kullanıcılar yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#f7f8fa]">
        <div className="mx-auto flex min-h-screen max-w-lg items-center justify-center px-4">
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-700">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <div className="mx-auto max-w-[1600px] px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-light tracking-[0.08em] text-neutral-900 sm:text-3xl sm:tracking-[0.12em]">
              Kullanıcı Yönetimi
            </h1>
            <div className="mt-3 h-px w-[min(100%,20rem)] bg-neutral-300 sm:mt-4" />
            <p className="mt-3 text-sm text-slate-500">Sistem kullanıcılarını yönetin ve yeni kullanıcılar ekleyin</p>
          </div>
          <button
            onClick={() => { setSelectedUser(null); setModalOpen(true); }}
            className="inline-flex shrink-0 items-center justify-center rounded-lg bg-[#00365a] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#004170] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/25 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Yeni Kullanıcı
          </button>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200/80 bg-slate-50/60 px-4 py-3 sm:px-5">
            <h3 className="text-sm font-semibold text-slate-900">Kullanıcı Listesi</h3>
            <span className="text-xs text-slate-500">{users.length} kullanıcı</span>
          </div>
          <div className="w-full overflow-x-auto">
            <table className="w-full table-fixed">
              <thead className="bg-slate-50/60">
                <tr>
                  <th className="w-1/7 px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Kullanıcı Adı</th>
                  <th className="w-1/7 px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Ad Soyad</th>
                  <th className="w-1/5 px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">E-posta</th>
                  <th className="w-1/8 px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Kullanıcı Tipi</th>
                  <th className="w-1/4 px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Mağaza</th>
                  <th className="w-1/8 px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Durum</th>
                  <th className="w-1/8 px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-500">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((user) => (
                  <tr
                    key={user.userId}
                    className={`transition-colors hover:bg-slate-50/70 ${!user.isActive ? 'opacity-60' : ''}`}
                  >
                    <td className="px-4 py-3">
                      <span className="block truncate text-sm font-medium text-slate-900">{user.username}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="block truncate text-sm text-slate-700">
                        {user.fullName || ((user.name || '') + ' ' + (user.surname || ''))}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="block truncate text-sm text-slate-700" title={user.email}>{user.email}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-xs font-medium text-sky-700">
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
                    <td className="px-4 py-3">
                      <span className="block truncate text-sm text-slate-700" title={user.Store ? user.Store.kurum_adi : '-'}>
                        {user.Store ? user.Store.kurum_adi : '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                        user.isActive
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                          : 'border-rose-200 bg-rose-50 text-rose-700'
                      }`}>
                        {user.isActive ? 'Aktif' : 'Pasif'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleUserClick(user.userId)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-[#00365a] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15"
                          title="Düzenle"
                        >
                          <FaEdit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            setAssigningUserId(user.userId);
                            setSelectedStoreId(user.Store?.store_id || '');
                            setAssignStoreModalOpen(true);
                          }}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-[#00365a] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15"
                          title="Mağaza Ata"
                        >
                          <FaStore className="h-4 w-4" />
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => { setDeleteUserId(user.userId); setDeleteModalOpen(true); }}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-rose-600 transition hover:bg-rose-50 hover:text-rose-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/20"
                            title="Sil"
                          >
                            <FaTrash className="h-4 w-4" />
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

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-lg" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200/80 px-5 py-4">
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  {selectedUser ? 'Kullanıcı Düzenle' : 'Yeni Kullanıcı Ekle'}
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  {selectedUser ? 'Kullanıcı bilgilerini güncelleyin' : 'Yeni kullanıcı bilgilerini girin'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => { setModalOpen(false); setSelectedUser(null); }}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-[#00365a] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15"
                aria-label="Kapat"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col overflow-y-auto">
              <div className="space-y-6 px-5 py-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Kullanıcı Adı */}
                <div>
                  <label htmlFor="username" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">Kullanıcı Adı <span className="text-rose-500">*</span></label>
                  <input
                    name="username"
                    id="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    placeholder="Kullanıcı adını girin"
                    className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition hover:border-slate-400 focus:border-[#00365a] focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15"
                    required
                  />
                </div>

                {/* Şifre - Sadece yeni kullanıcı için */}
                {!selectedUser && (
                  <div>
                    <label htmlFor="password" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">Şifre <span className="text-rose-500">*</span></label>
                    <input
                      name="password"
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      placeholder="Şifre girin"
                      className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition hover:border-slate-400 focus:border-[#00365a] focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15"
                      required
                    />
                  </div>
                )}

                {/* Ad */}
                <div>
                  <label htmlFor="name" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">Ad <span className="text-rose-500">*</span></label>
                  <input
                    name="name"
                    id="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Adını girin"
                    className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition hover:border-slate-400 focus:border-[#00365a] focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15"
                    required
                  />
                </div>

                {/* Soyad */}
                <div>
                  <label htmlFor="surname" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">Soyad <span className="text-rose-500">*</span></label>
                  <input
                    name="surname"
                    id="surname"
                    value={formData.surname}
                    onChange={handleInputChange}
                    placeholder="Soyadını girin"
                    className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition hover:border-slate-400 focus:border-[#00365a] focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15"
                    required
                  />
                </div>

                {/* E-posta */}
                <div>
                  <label htmlFor="email" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">E-posta <span className="text-rose-500">*</span></label>
                  <input
                    name="email"
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="E-posta adresini girin"
                    className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition hover:border-slate-400 focus:border-[#00365a] focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15"
                    required
                  />
                </div>

                {/* Telefon */}
                <div>
                  <label htmlFor="phoneNumber" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">Telefon</label>
                  <input
                    name="phoneNumber"
                    id="phoneNumber"
                    type="tel"
                    value={formData.phoneNumber}
                    onChange={handleInputChange}
                    placeholder="05xx xxx xx xx"
                    className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition hover:border-slate-400 focus:border-[#00365a] focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15"
                  />
                </div>
              </div>

              {/* Adres - Artık kullanılmıyor */}
              <div>
                <label htmlFor="adres" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">Adres</label>
                <div className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-500">
                  Adres bilgileri artık mağaza bazlı yönetilmektedir. Mağaza ayarlarından adres yönetimini yapabilirsiniz.
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Kullanıcı Tipi Dropdown */}
                <div className="dropdown-container">
                  <label htmlFor="userTypeName" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">Kullanıcı Tipi <span className="text-rose-500">*</span></label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setUserTypeDropdownOpen(!userTypeDropdownOpen)}
                      className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 pr-9 text-left text-sm text-slate-900 transition hover:border-slate-400 focus:border-[#00365a] focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15"
                    >
                      <span className="text-slate-900">
                        {formData.userTypeName === "admin" && "Admin"}
                        {formData.userTypeName === "editor" && "Editör"}
                        {formData.userTypeName === "viewer" && "Görüntüleyici"}
                        {formData.userTypeName === "employee" && "Çalışan"}
                      </span>
                      <svg 
                        className={`absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-transform ${userTypeDropdownOpen ? 'rotate-180' : ''}`}
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    
                    {userTypeDropdownOpen && (
                      <div className="absolute z-[100] mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                        {canAssignAdmin && (
                          <div
                            className={`block w-full px-3 py-2 text-left text-sm transition-colors hover:bg-slate-50 ${
                              formData.userTypeName === "admin" ? 'bg-[#00365a]/[0.06] font-medium text-[#00365a]' : 'text-slate-700'
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
                          className={`block w-full px-3 py-2 text-left text-sm transition-colors hover:bg-slate-50 ${
                            formData.userTypeName === "editor" ? 'bg-[#00365a]/[0.06] font-medium text-[#00365a]' : 'text-slate-700'
                          }`}
                          onClick={() => {
                            setFormData(prev => ({ ...prev, userTypeName: "editor" }));
                            setUserTypeDropdownOpen(false);
                          }}
                        >
                          Editör
                        </div>
                        <div
                          className={`block w-full px-3 py-2 text-left text-sm transition-colors hover:bg-slate-50 ${
                            formData.userTypeName === "viewer" ? 'bg-[#00365a]/[0.06] font-medium text-[#00365a]' : 'text-slate-700'
                          }`}
                          onClick={() => {
                            setFormData(prev => ({ ...prev, userTypeName: "viewer" }));
                            setUserTypeDropdownOpen(false);
                          }}
                        >
                          Görüntüleyici
                        </div>
                        <div
                          className={`block w-full px-3 py-2 text-left text-sm transition-colors hover:bg-slate-50 ${
                            formData.userTypeName === "employee" ? 'bg-[#00365a]/[0.06] font-medium text-[#00365a]' : 'text-slate-700'
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
                    <label htmlFor="storeId" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">Mağaza <span className="text-rose-500">*</span></label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setStoreDropdownOpen(!storeDropdownOpen)}
                        className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 pr-9 text-left text-sm text-slate-900 transition hover:border-slate-400 focus:border-[#00365a] focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15"
                      >
                        <span className="text-slate-900">
                          {formData.storeId ? 
                            stores.find(s => s.store_id === formData.storeId)?.kurum_adi || 'Seçili Mağaza' :
                            'Mağaza seçin'
                          }
                        </span>
                        <svg 
                          className={`absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-transform ${storeDropdownOpen ? 'rotate-180' : ''}`}
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      
                      {storeDropdownOpen && (
                        <div className="absolute z-[100] mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                          {stores.map((store) => (
                            <div
                              key={store.store_id}
                              className={`block w-full px-3 py-2 text-left text-sm transition-colors hover:bg-slate-50 ${
                                formData.storeId === store.store_id ? 'bg-[#00365a]/[0.06] font-medium text-[#00365a]' : 'text-slate-700'
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
                  <div className="flex items-center space-x-3 rounded-lg border border-slate-200 bg-slate-50/60 p-4">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="canSeePrice"
                        name="canSeePrice"
                        checked={formData.canSeePrice}
                        onChange={(e) => setFormData(prev => ({ ...prev, canSeePrice: e.target.checked }))}
                        className="h-4 w-4 rounded border-slate-300 text-[#00365a] focus:ring-[#00365a]"
                      />
                    </div>
                    <div className="flex-1">
                      <label htmlFor="canSeePrice" className="block text-sm font-medium text-slate-700">
                        Fiyat Görme Yetkisi
                      </label>
                      <p className="mt-1 text-xs text-slate-500">
                        Bu kullanıcı ürün fiyatlarını görebilir
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              </div>
              <div className="flex shrink-0 justify-end gap-2 border-t border-slate-200/80 bg-slate-50/60 px-5 py-3.5">
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15"
                  onClick={() => { setModalOpen(false); setSelectedUser(null); }}
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded-lg bg-[#00365a] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#004170] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/25 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {selectedUser ? 'Güncelle' : 'Ekle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-lg">
            <div className="border-b border-slate-200/80 px-5 py-4">
              <h3 className="text-base font-semibold text-slate-900">Kullanıcıyı Sil</h3>
              <p className="mt-0.5 text-xs text-slate-500">Bu işlem geri alınamaz</p>
            </div>
            <div className="px-5 py-5">
              <p className="text-sm text-slate-700">Bu kullanıcıyı silmek istediğinizden emin misiniz?</p>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-200/80 bg-slate-50/60 px-5 py-3.5">
              <button type="button" className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15" onClick={() => { setDeleteModalOpen(false); setDeleteUserId(null); }}>Vazgeç</button>
              <button type="button" className="inline-flex items-center justify-center rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-rose-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/25 disabled:cursor-not-allowed disabled:opacity-50" onClick={handleDeleteUser}>Evet</button>
            </div>
          </div>
        </div>
      )}

      {assignStoreModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200/80 bg-white shadow-lg">
            <div className="flex items-start justify-between gap-3 border-b border-slate-200/80 px-5 py-4">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Kullanıcı Mağaza Bilgileri</h3>
                <p className="mt-0.5 text-xs text-slate-500">Kullanıcıya mağaza atayın veya kaldırın</p>
              </div>
              <button
                type="button"
                onClick={() => { setAssignStoreModalOpen(false); setAssigningUserId(null); setSelectedStoreId(''); }}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-[#00365a] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15"
                aria-label="Kapat"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-6 px-5 py-5">
              <div className="dropdown-container">
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">Mağaza</label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setAssignStoreDropdownOpen(!assignStoreDropdownOpen)}
                    className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 pr-9 text-left text-sm text-slate-900 transition hover:border-slate-400 focus:border-[#00365a] focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15"
                  >
                    <span className="text-slate-900">
                      {selectedStoreId === "remove" ? "Mağaza Atamasını Kaldır" :
                        selectedStoreId ? 
                          stores.find(s => s.store_id === selectedStoreId)?.kurum_adi || 'Seçili Mağaza' :
                          'Mağaza seçin'
                      }
                    </span>
                    <svg 
                      className={`absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-transform ${assignStoreDropdownOpen ? 'rotate-180' : ''}`}
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  {assignStoreDropdownOpen && (
                    <div className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                      {stores.map((store) => (
                        <div
                          key={store.store_id}
                          className={`block w-full px-3 py-2 text-left text-sm transition-colors hover:bg-slate-50 ${
                            selectedStoreId === store.store_id ? 'bg-[#00365a]/[0.06] font-medium text-[#00365a]' : 'text-slate-700'
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
                          className={`block w-full border-t border-slate-200 px-3 py-2 text-left text-sm transition-colors hover:bg-rose-50 ${
                            selectedStoreId === "remove" ? 'bg-rose-50 font-medium text-rose-700' : 'text-rose-600'
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

            </div>
            <div className="flex justify-end gap-2 rounded-b-xl border-t border-slate-200/80 bg-slate-50/60 px-5 py-3.5">
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15"
                onClick={() => {
                  setAssignStoreModalOpen(false);
                  setAssigningUserId(null);
                  setSelectedStoreId('');
                }}
              >
                Vazgeç
              </button>
              <button
                type="button"
                className={`inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-medium text-white transition focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 ${
                  selectedStoreId === "remove"
                    ? "bg-rose-600 hover:bg-rose-700 focus-visible:ring-2 focus-visible:ring-rose-500/25"
                    : "bg-[#00365a] hover:bg-[#004170] focus-visible:ring-2 focus-visible:ring-[#00365a]/25"
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
      )}

      </div>
    </div>
  );
} 