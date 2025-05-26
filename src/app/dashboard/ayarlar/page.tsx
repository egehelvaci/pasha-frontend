"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';
import { FaPlus, FaEdit, FaTrash, FaStore } from 'react-icons/fa';
import { getStores, assignUserToStore, removeUserFromStore } from '@/services/api';

interface User {
  userId: string;
  username: string;
  fullName?: string;
  name?: string;
  surname?: string;
  email: string;
  isActive: boolean;
  credit: number;
  debit: number;
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
  userTypeName: string;
  storeId?: string;
  isActive?: boolean;
  credit?: string;
  debit?: string;
}

export default function Settings() {
  const { user, token } = useAuth();
  const router = useRouter();
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
    userTypeName: 'viewer',
    storeId: ''
  });
  const [assignStoreModalOpen, setAssignStoreModalOpen] = useState(false);
  const [assigningUserId, setAssigningUserId] = useState<string | null>(null);
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');
  const [stores, setStores] = useState<{store_id: string, kurum_adi: string}[]>([]);
  const [assignLoading, setAssignLoading] = useState(false);
  const [removeLoading, setRemoveLoading] = useState(false);
  
  // API çağrısını takip etmek için ref oluştur
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (!user) {
      router.push('/dashboard');
      return;
    }
    
    // Sadece bir kez çağrılmasını sağla
    if (!fetchedRef.current) {
      fetchedRef.current = true;
    fetchUsers();
      fetchStores();
    }
  }, [user, router]);

  useEffect(() => {
    if (selectedUser) {
      setFormData({
        username: selectedUser.username,
        name: (selectedUser.fullName || ((selectedUser.name || '') + ' ' + (selectedUser.surname || ''))).split(' ')[0],
        surname: (selectedUser.fullName || ((selectedUser.name || '') + ' ' + (selectedUser.surname || ''))).split(' ').slice(1).join(' '),
        email: selectedUser.email,
        userTypeName:
          typeof selectedUser.userType === 'object'
            ? selectedUser.userType.name
            : selectedUser.userType || '',
        isActive: typeof selectedUser.isActive === 'boolean' ? selectedUser.isActive : true,
        credit: selectedUser.credit ? String(selectedUser.credit) : '',
        debit: selectedUser.debit ? String(selectedUser.debit) : '',
        storeId: selectedUser.Store?.store_id || ''
      });
    } else {
      setFormData({
        username: '',
        password: '',
        name: '',
        surname: '',
        email: '',
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
      setError(err.message || "Kullanıcı detayları yüklenirken bir hata oluştu");
    }
  };

  const handleDelete = async () => {
    if (!deleteUserId) return;
    try {
      const res = await fetch(`https://pasha-backend-production.up.railway.app/api/admin/users/${deleteUserId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ permanently: true })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      setDeleteModalOpen(false);
      setDeleteUserId(null);
      
      // Kullanıcıları yenile
      fetchedRef.current = false; // useRef'i sıfırla
      fetchUsers();
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bakiye</th>
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
                  <td className={
                    `px-6 py-4 whitespace-nowrap text-sm font-semibold ` +
                    (((Number(user.credit) || 0) - (Number(user.debit) || 0)) < 0
                      ? 'text-red-600'
                      : 'text-green-600')
                  }>
                    {((Number(user.credit) || 0) - (Number(user.debit) || 0)).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
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
            <button className="absolute top-2 right-3 text-gray-400 hover:text-gray-700" onClick={() => setModalOpen(false)}>&times;</button>
            <h2 className="text-xl font-bold mb-4 text-black">{selectedUser ? 'Kullanıcı Düzenle' : 'Yeni Kullanıcı'}</h2>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
              <div className="flex flex-col gap-1">
                <label htmlFor="credit" className="text-sm font-semibold text-gray-700">Alacak</label>
                <input
                  name="credit"
                  id="credit"
                  value={formData.credit ?? ''}
                  onChange={handleInputChange}
                  placeholder="Alacak"
                  className="border rounded px-3 py-2 text-black"
                  type="number"
                  min="0"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="debit" className="text-sm font-semibold text-gray-700">Borç</label>
                <input
                  name="debit"
                  id="debit"
                  value={formData.debit ?? ''}
                  onChange={handleInputChange}
                  placeholder="Borç"
                  className="border rounded px-3 py-2 text-black"
                  type="number"
                  min="0"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="isActive" className="text-sm font-semibold text-gray-700">Durum</label>
                <div className="flex items-center gap-2">
                  <input
                    id="isActive"
                    name="isActive"
                    type="checkbox"
                    checked={formData.isActive ?? true}
                    onChange={e => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                    className="w-4 h-4"
                  />
                  <span className="text-black">{formData.isActive ? 'Aktif' : 'Pasif'}</span>
                </div>
              </div>
              <button type="submit" className="bg-blue-900 text-white rounded-full px-6 py-2 font-semibold mt-2">
                {selectedUser ? 'Güncelle' : 'Ekle'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Silme Onay Modalı */}
      {deleteModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-lg relative">
            <h2 className="text-lg font-bold mb-4 text-black">Onay</h2>
            <div className="mb-6 text-black">Bu kullanıcıyı silmek istediğinize emin misiniz?</div>
            <div className="flex justify-end gap-2">
              <button className="px-4 py-2 rounded bg-gray-200 text-black" onClick={() => { setDeleteModalOpen(false); setDeleteUserId(null); }}>Vazgeç</button>
              <button className="px-4 py-2 rounded bg-red-600 text-white" onClick={handleDelete}>Evet</button>
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