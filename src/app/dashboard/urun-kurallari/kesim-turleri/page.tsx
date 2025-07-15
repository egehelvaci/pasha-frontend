'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { CutType, getCutTypes, createCutType, updateCutType, deleteCutType } from '@/services/api';
import { useAuth } from '@/app/context/AuthContext';
import Link from 'next/link';

export default function CutTypesPage() {
  const router = useRouter();
  const { isAdmin, isLoading: authLoading } = useAuth();
  const [cutTypes, setCutTypes] = useState<CutType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal states
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  
  // Form data
  const [newCutTypeName, setNewCutTypeName] = useState('');
  const [editingCutType, setEditingCutType] = useState<CutType | null>(null);
  const [editName, setEditName] = useState('');
  const [cutTypeToDelete, setCutTypeToDelete] = useState<CutType | null>(null);
  
  // Loading states
  const [addLoading, setAddLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  
  // Error states
  const [addError, setAddError] = useState('');
  const [editError, setEditError] = useState('');
  const [deleteError, setDeleteError] = useState('');
  
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.push('/dashboard');
      return;
    }
    
    if (!authLoading && isAdmin && !fetchedRef.current) {
      fetchedRef.current = true;
      fetchCutTypes();
    }
  }, [isAdmin, authLoading, router]);

  const fetchCutTypes = async () => {
    try {
      setLoading(true);
      const data = await getCutTypes();
      setCutTypes(data);
    } catch (error) {
      console.error('Kesim türleri getirme hatası:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    try {
      setLoading(true);
      const data = await getCutTypes(searchTerm || undefined);
      setCutTypes(data);
    } catch (error) {
      console.error('Arama hatası:', error);
    } finally {
      setLoading(false);
    }
  };

  // Add new cut type
  const handleAddCutType = async () => {
    if (!newCutTypeName.trim()) {
      setAddError('Kesim türü adı zorunludur');
      return;
    }

    try {
      setAddLoading(true);
      setAddError('');
      await createCutType({ name: newCutTypeName.trim() });
      await fetchCutTypes();
      setAddModalOpen(false);
      setNewCutTypeName('');
    } catch (error: any) {
      setAddError(error.message || 'Kesim türü oluşturulurken bir hata oluştu');
    } finally {
      setAddLoading(false);
    }
  };

  // Edit cut type
  const handleEditCutType = async () => {
    if (!editingCutType || !editName.trim()) {
      setEditError('Kesim türü adı zorunludur');
      return;
    }

    try {
      setEditLoading(true);
      setEditError('');
      await updateCutType(editingCutType.id, { name: editName.trim() });
      await fetchCutTypes();
      setEditModalOpen(false);
      setEditingCutType(null);
      setEditName('');
    } catch (error: any) {
      setEditError(error.message || 'Kesim türü güncellenirken bir hata oluştu');
    } finally {
      setEditLoading(false);
    }
  };

  // Delete cut type
  const handleDeleteCutType = async () => {
    if (!cutTypeToDelete) return;

    try {
      setDeleteLoading(true);
      setDeleteError('');
      await deleteCutType(cutTypeToDelete.id);
      await fetchCutTypes();
      setDeleteModalOpen(false);
      setCutTypeToDelete(null);
    } catch (error: any) {
      setDeleteError(error.message || 'Silme işlemi başarısız');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Modal handlers
  const openAddModal = () => {
    setNewCutTypeName('');
    setAddError('');
    setAddModalOpen(true);
  };

  const openEditModal = (cutType: CutType) => {
    setEditingCutType(cutType);
    setEditName(cutType.name);
    setEditError('');
    setEditModalOpen(true);
  };

  const openDeleteModal = (cutType: CutType) => {
    setCutTypeToDelete(cutType);
    setDeleteError('');
    setDeleteModalOpen(true);
  };

  const filteredCutTypes = cutTypes.filter(cutType =>
    cutType.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Admin kontrolü
  if (!authLoading && !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <svg className="mx-auto h-12 w-12 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">Erişim Reddedildi</h3>
          <p className="mt-1 text-sm text-gray-500">Bu sayfaya erişim yetkiniz bulunmamaktadır.</p>
          <div className="mt-6">
            <button
              onClick={() => router.push('/dashboard')}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Dashboard'a Dön
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto">
        {/* Başlık */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <Link
              href="/dashboard/urun-kurallari"
              className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
            >
              <svg className="mr-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Ürün Kuralları
            </Link>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Kesim Türleri Yönetimi</h1>
              <p className="text-gray-600 mt-2">Ürün kurallarında kullanılacak kesim türlerini yönetin.</p>
            </div>
            <button
              onClick={openAddModal}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Yeni Kesim Türü
            </button>
          </div>
        </div>

        {/* Arama */}
        <div className="mb-6 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Kesim türü adında ara..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <button
              onClick={handleSearch}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Ara
            </button>
          </div>
        </div>

        {/* İstatistik */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-2xl font-bold text-gray-900">{cutTypes.length}</div>
            <div className="text-sm text-gray-500">Toplam Kesim Türü</div>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="text-2xl font-bold text-blue-800">
              {cutTypes.filter(ct => ct.ruleCount && ct.ruleCount > 0).length}
            </div>
            <div className="text-sm text-blue-600">Kullanılan Türler</div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <div className="text-2xl font-bold text-gray-800">
              {cutTypes.filter(ct => !ct.ruleCount || ct.ruleCount === 0).length}
            </div>
            <div className="text-sm text-gray-600">Kullanılmayan Türler</div>
          </div>
        </div>

        {/* Kesim Türleri Listesi */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredCutTypes.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">Kesim türü bulunamadı</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm ? 'Arama kriterlerinize uygun kesim türü bulunamadı.' : 'Henüz hiç kesim türü eklenmemiş.'}
            </p>
            <div className="mt-6">
              <button
                onClick={openAddModal}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                İlk Kesim Türünü Ekle
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Kesim Türü
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Kullanım
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Oluşturma Tarihi
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    İşlemler
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredCutTypes.map((cutType) => (
                  <tr key={cutType.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{cutType.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-4">
                        {cutType.ruleCount !== undefined && (
                          <div className="flex items-center text-sm text-gray-500">
                            <svg className="mr-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                            {cutType.ruleCount} kural
                          </div>
                        )}
                        {cutType.variationCount !== undefined && (
                          <div className="flex items-center text-sm text-gray-500">
                            <svg className="mr-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                            </svg>
                            {cutType.variationCount} varyasyon
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {cutType.createdAt ? new Date(cutType.createdAt).toLocaleDateString('tr-TR') : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => openEditModal(cutType)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          Düzenle
                        </button>
                        <button
                          onClick={() => openDeleteModal(cutType)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Sil
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Add Modal */}
        {addModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <div className="flex items-center mb-4">
                <svg className="h-6 w-6 text-blue-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900">Yeni Kesim Türü Ekle</h3>
              </div>
              
              <div className="mb-4">
                <label htmlFor="cutTypeName" className="block text-sm font-medium text-gray-700 mb-1">
                  Kesim Türü Adı
                </label>
                <input
                  type="text"
                  id="cutTypeName"
                  value={newCutTypeName}
                  onChange={(e) => setNewCutTypeName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Örn: Oval"
                />
              </div>
              
              {addError && (
                <div className="mb-4 text-sm text-red-600">{addError}</div>
              )}

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setAddModalOpen(false);
                    setNewCutTypeName('');
                    setAddError('');
                  }}
                  disabled={addLoading}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  İptal
                </button>
                <button
                  onClick={handleAddCutType}
                  disabled={addLoading}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {addLoading ? 'Ekleniyor...' : 'Ekle'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {editModalOpen && editingCutType && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <div className="flex items-center mb-4">
                <svg className="h-6 w-6 text-green-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900">Kesim Türünü Düzenle</h3>
              </div>
              
              <div className="mb-4">
                <label htmlFor="editCutTypeName" className="block text-sm font-medium text-gray-700 mb-1">
                  Kesim Türü Adı
                </label>
                <input
                  type="text"
                  id="editCutTypeName"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              {editError && (
                <div className="mb-4 text-sm text-red-600">{editError}</div>
              )}

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setEditModalOpen(false);
                    setEditingCutType(null);
                    setEditName('');
                    setEditError('');
                  }}
                  disabled={editLoading}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  İptal
                </button>
                <button
                  onClick={handleEditCutType}
                  disabled={editLoading}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                >
                  {editLoading ? 'Güncelleniyor...' : 'Güncelle'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Modal */}
        {deleteModalOpen && cutTypeToDelete && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <div className="flex items-center mb-4">
                <svg className="h-6 w-6 text-red-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900">Kesim Türünü Sil</h3>
              </div>
              
              <p className="text-sm text-gray-500 mb-4">
                <strong>"{cutTypeToDelete.name}"</strong> kesim türünü silmek istediğinizden emin misiniz? 
                Bu işlem geri alınamaz.
              </p>
              
              {cutTypeToDelete.ruleCount && cutTypeToDelete.ruleCount > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4">
                  <div className="flex">
                    <svg className="h-5 w-5 text-yellow-400 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <div className="text-sm text-yellow-800">
                      Bu kesim türü {cutTypeToDelete.ruleCount} kural tarafından kullanılıyor. 
                      Önce kurallardan kaldırmanız gerekebilir.
                    </div>
                  </div>
                </div>
              )}
              
              {deleteError && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
                  <div className="text-sm text-red-800">{deleteError}</div>
                </div>
              )}

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setDeleteModalOpen(false);
                    setCutTypeToDelete(null);
                    setDeleteError('');
                  }}
                  disabled={deleteLoading}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  İptal
                </button>
                <button
                  onClick={handleDeleteCutType}
                  disabled={deleteLoading}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                >
                  {deleteLoading ? 'Siliniyor...' : 'Sil'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 