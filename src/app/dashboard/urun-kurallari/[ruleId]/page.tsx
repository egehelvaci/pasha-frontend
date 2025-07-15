'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { 
  ProductRule, 
  getProductRule, 
  addSizeOption, 
  updateSizeOption, 
  deleteSizeOption,
  assignCutTypes,
  removeCutType,
  CutType,
  getCutTypes,
  CreateSizeOptionData
} from '@/services/api';
import { useAuth } from '@/app/context/AuthContext';
import Link from 'next/link';

export default function ProductRuleDetailPage() {
  const router = useRouter();
  const params = useParams();
  const ruleId = parseInt(params.ruleId as string);
  const { isAdmin, isLoading: authLoading } = useAuth();
  
  const [rule, setRule] = useState<ProductRule | null>(null);
  const [allCutTypes, setAllCutTypes] = useState<CutType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal states
  const [addSizeModalOpen, setAddSizeModalOpen] = useState(false);
  const [editSizeModalOpen, setEditSizeModalOpen] = useState(false);
  const [manageCutTypesModalOpen, setManageCutTypesModalOpen] = useState(false);
  
  // Form data
  const [newSizeOption, setNewSizeOption] = useState<CreateSizeOptionData>({
    width: 0,
    height: 0,
    isOptionalHeight: false
  });
  const [editingSizeOption, setEditingSizeOption] = useState<{id: number, data: CreateSizeOptionData} | null>(null);
  const [selectedCutTypeIds, setSelectedCutTypeIds] = useState<number[]>([]);
  
  // Loading states
  const [addSizeLoading, setAddSizeLoading] = useState(false);
  const [editSizeLoading, setEditSizeLoading] = useState(false);
  const [manageCutTypesLoading, setManageCutTypesLoading] = useState(false);
  
  // Error states
  const [addSizeError, setAddSizeError] = useState('');
  const [editSizeError, setEditSizeError] = useState('');
  const [manageCutTypesError, setManageCutTypesError] = useState('');

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.push('/dashboard');
      return;
    }
    
    if (!authLoading && isAdmin && ruleId) {
      fetchData();
    }
  }, [isAdmin, authLoading, router, ruleId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [ruleData, cutTypesData] = await Promise.all([
        getProductRule(ruleId),
        getCutTypes()
      ]);
      setRule(ruleData);
      setAllCutTypes(cutTypesData);
      setSelectedCutTypeIds(ruleData.cutTypes.map(ct => ct.id));
    } catch (error: any) {
      setError(error.message || 'Veri yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  // Add size option
  const handleAddSizeOption = async () => {
    if (newSizeOption.width <= 0 || newSizeOption.height <= 0) {
      setAddSizeError('Genişlik ve yükseklik 0\'dan büyük olmalı');
      return;
    }

    try {
      setAddSizeLoading(true);
      setAddSizeError('');
      await addSizeOption(ruleId, newSizeOption);
      await fetchData();
      setAddSizeModalOpen(false);
      setNewSizeOption({ width: 0, height: 0, isOptionalHeight: false });
    } catch (error: any) {
      setAddSizeError(error.message || 'Boyut seçeneği eklenirken bir hata oluştu');
    } finally {
      setAddSizeLoading(false);
    }
  };

  // Edit size option
  const handleEditSizeOption = async () => {
    if (!editingSizeOption) return;
    
    if (editingSizeOption.data.width <= 0 || editingSizeOption.data.height <= 0) {
      setEditSizeError('Genişlik ve yükseklik 0\'dan büyük olmalı');
      return;
    }

    try {
      setEditSizeLoading(true);
      setEditSizeError('');
      await updateSizeOption(ruleId, editingSizeOption.id, editingSizeOption.data);
      await fetchData();
      setEditSizeModalOpen(false);
      setEditingSizeOption(null);
    } catch (error: any) {
      setEditSizeError(error.message || 'Boyut seçeneği güncellenirken bir hata oluştu');
    } finally {
      setEditSizeLoading(false);
    }
  };

  // Delete size option
  const handleDeleteSizeOption = async (sizeId: number) => {
    if (!confirm('Bu boyut seçeneğini silmek istediğinizden emin misiniz?')) return;

    try {
      await deleteSizeOption(ruleId, sizeId);
      await fetchData();
    } catch (error: any) {
      alert('Boyut seçeneği silinirken bir hata oluştu: ' + error.message);
    }
  };

  // Manage cut types
  const handleManageCutTypes = async () => {
    try {
      setManageCutTypesLoading(true);
      setManageCutTypesError('');
      
      // Yeni atanacak kesim türleri
      const currentCutTypeIds = rule?.cutTypes.map(ct => ct.id) || [];
      const toAdd = selectedCutTypeIds.filter(id => !currentCutTypeIds.includes(id));
      const toRemove = currentCutTypeIds.filter(id => !selectedCutTypeIds.includes(id));
      
      // Yeni kesim türlerini ata
      if (toAdd.length > 0) {
        await assignCutTypes(ruleId, toAdd);
      }
      
      // Kaldırılacak kesim türlerini sil
      for (const cutTypeId of toRemove) {
        await removeCutType(ruleId, cutTypeId);
      }
      
      await fetchData();
      setManageCutTypesModalOpen(false);
    } catch (error: any) {
      setManageCutTypesError(error.message || 'Kesim türleri güncellenirken bir hata oluştu');
    } finally {
      setManageCutTypesLoading(false);
    }
  };

  // Modal handlers
  const openAddSizeModal = () => {
    setNewSizeOption({ width: 0, height: 0, isOptionalHeight: false });
    setAddSizeError('');
    setAddSizeModalOpen(true);
  };

  const openEditSizeModal = (sizeOption: any) => {
    setEditingSizeOption({
      id: sizeOption.id,
      data: {
        width: sizeOption.width,
        height: sizeOption.height,
        isOptionalHeight: sizeOption.isOptionalHeight
      }
    });
    setEditSizeError('');
    setEditSizeModalOpen(true);
  };

  const openManageCutTypesModal = () => {
    setSelectedCutTypeIds(rule?.cutTypes.map(ct => ct.id) || []);
    setManageCutTypesError('');
    setManageCutTypesModalOpen(true);
  };

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !rule) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <svg className="mx-auto h-12 w-12 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">Hata</h3>
          <p className="mt-1 text-sm text-gray-500">{error || 'Kural bulunamadı'}</p>
          <div className="mt-6">
            <Link
              href="/dashboard/urun-kurallari"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              Geri Dön
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center space-x-4 mb-8">
          <Link
            href="/dashboard/urun-kurallari"
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
          >
            <svg className="mr-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Ürün Kuralları
          </Link>
          <span className="text-gray-500">/</span>
          <span className="text-gray-900 font-medium">{rule.name}</span>
        </div>

        {/* Başlık */}
        <div className="mb-8 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <h1 className="text-3xl font-bold text-gray-900">{rule.name}</h1>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                rule.isActive 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {rule.isActive ? 'Aktif' : 'Pasif'}
              </span>
            </div>
            <p className="text-gray-600">{rule.description}</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Link
              href={`/dashboard/urun-kurallari/${rule.id}/duzenle`}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Düzenle
            </Link>
          </div>
        </div>

        {/* Kural Bilgileri */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-2xl font-bold text-gray-900">{rule.sizeOptions.length}</div>
            <div className="text-sm text-gray-500">Boyut Seçeneği</div>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="text-2xl font-bold text-blue-800">{rule.cutTypes.length}</div>
            <div className="text-sm text-blue-600">Kesim Türü</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <div className="text-2xl font-bold text-green-800">
              {rule.canHaveFringe ? 'Evet' : 'Hayır'}
            </div>
            <div className="text-sm text-green-600">Saçak Desteği</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Boyut Seçenekleri */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium text-gray-900">Boyut Seçenekleri</h2>
                <button
                  onClick={openAddSizeModal}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  <svg className="mr-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Ekle
                </button>
              </div>
            </div>
            <div className="p-6">
              {rule.sizeOptions.length === 0 ? (
                <div className="text-center py-8">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">Boyut seçeneği yok</h3>
                  <p className="mt-1 text-sm text-gray-500">Henüz hiç boyut seçeneği eklenmemiş.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {rule.sizeOptions.map((option) => (
                    <div key={option.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-md">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {option.width}cm x {option.height}cm
                        </div>
                        {option.isOptionalHeight && (
                          <div className="text-xs text-blue-600 mt-1">Yükseklik isteğe bağlı</div>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => openEditSizeModal(option)}
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          Düzenle
                        </button>
                        <button
                          onClick={() => handleDeleteSizeOption(option.id)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Sil
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Kesim Türleri */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium text-gray-900">Kesim Türleri</h2>
                <button
                  onClick={openManageCutTypesModal}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                >
                  <svg className="mr-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                  </svg>
                  Yönet
                </button>
              </div>
            </div>
            <div className="p-6">
              {rule.cutTypes.length === 0 ? (
                <div className="text-center py-8">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">Kesim türü yok</h3>
                  <p className="mt-1 text-sm text-gray-500">Henüz hiç kesim türü atanmamış.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {rule.cutTypes.map((cutType) => (
                    <div key={cutType.id} className="p-3 border border-gray-200 rounded-md text-center">
                      <div className="text-sm font-medium text-gray-900">{cutType.name}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Kullanılan Ürünler */}
        {rule.products && rule.products.length > 0 && (
          <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Bu Kuralı Kullanan Ürünler</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {rule.products.map((product) => (
                  <div key={product.productId} className="p-4 border border-gray-200 rounded-md">
                    <div className="text-sm font-medium text-gray-900">{product.name}</div>
                    <div className="text-xs text-gray-500 mt-1">ID: {product.productId}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Add Size Option Modal */}
        {addSizeModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <div className="flex items-center mb-4">
                <svg className="h-6 w-6 text-blue-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900">Yeni Boyut Seçeneği Ekle</h3>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Genişlik (cm)</label>
                  <input
                    type="number"
                    min="1"
                    value={newSizeOption.width || ''}
                    onChange={(e) => setNewSizeOption({...newSizeOption, width: parseInt(e.target.value) || 0})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Yükseklik (cm)</label>
                  <input
                    type="number"
                    min="1"
                    value={newSizeOption.height || ''}
                    onChange={(e) => setNewSizeOption({...newSizeOption, height: parseInt(e.target.value) || 0})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="150"
                  />
                </div>
                <div>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={newSizeOption.isOptionalHeight}
                      onChange={(e) => setNewSizeOption({...newSizeOption, isOptionalHeight: e.target.checked})}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Yükseklik İsteğe Bağlı</span>
                  </label>
                </div>
              </div>
              
              {addSizeError && (
                <div className="mt-4 text-sm text-red-600">{addSizeError}</div>
              )}

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setAddSizeModalOpen(false)}
                  disabled={addSizeLoading}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                >
                  İptal
                </button>
                <button
                  onClick={handleAddSizeOption}
                  disabled={addSizeLoading}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {addSizeLoading ? 'Ekleniyor...' : 'Ekle'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Size Option Modal */}
        {editSizeModalOpen && editingSizeOption && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <div className="flex items-center mb-4">
                <svg className="h-6 w-6 text-green-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900">Boyut Seçeneğini Düzenle</h3>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Genişlik (cm)</label>
                  <input
                    type="number"
                    min="1"
                    value={editingSizeOption.data.width || ''}
                    onChange={(e) => setEditingSizeOption({
                      ...editingSizeOption,
                      data: {...editingSizeOption.data, width: parseInt(e.target.value) || 0}
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Yükseklik (cm)</label>
                  <input
                    type="number"
                    min="1"
                    value={editingSizeOption.data.height || ''}
                    onChange={(e) => setEditingSizeOption({
                      ...editingSizeOption,
                      data: {...editingSizeOption.data, height: parseInt(e.target.value) || 0}
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={editingSizeOption.data.isOptionalHeight}
                      onChange={(e) => setEditingSizeOption({
                        ...editingSizeOption,
                        data: {...editingSizeOption.data, isOptionalHeight: e.target.checked}
                      })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Yükseklik İsteğe Bağlı</span>
                  </label>
                </div>
              </div>
              
              {editSizeError && (
                <div className="mt-4 text-sm text-red-600">{editSizeError}</div>
              )}

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setEditSizeModalOpen(false)}
                  disabled={editSizeLoading}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                >
                  İptal
                </button>
                <button
                  onClick={handleEditSizeOption}
                  disabled={editSizeLoading}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  {editSizeLoading ? 'Güncelleniyor...' : 'Güncelle'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Manage Cut Types Modal */}
        {manageCutTypesModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[80vh] overflow-y-auto">
              <div className="flex items-center mb-4">
                <svg className="h-6 w-6 text-green-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900">Kesim Türlerini Yönet</h3>
              </div>
              
              <div className="mb-4">
                <p className="text-sm text-gray-600">Bu kurala atanacak kesim türlerini seçin:</p>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                {allCutTypes.map((cutType) => (
                  <label key={cutType.id} className="flex items-center space-x-2 p-3 border border-gray-200 rounded-md hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedCutTypeIds.includes(cutType.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedCutTypeIds([...selectedCutTypeIds, cutType.id]);
                        } else {
                          setSelectedCutTypeIds(selectedCutTypeIds.filter(id => id !== cutType.id));
                        }
                      }}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{cutType.name}</span>
                  </label>
                ))}
              </div>
              
              {manageCutTypesError && (
                <div className="mb-4 text-sm text-red-600">{manageCutTypesError}</div>
              )}

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setManageCutTypesModalOpen(false)}
                  disabled={manageCutTypesLoading}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                >
                  İptal
                </button>
                <button
                  onClick={handleManageCutTypes}
                  disabled={manageCutTypesLoading}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  {manageCutTypesLoading ? 'Güncelleniyor...' : 'Güncelle'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 