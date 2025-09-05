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
      setAddSizeError('Genişlik ve boy 0\'dan büyük olmalı');
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
      setEditSizeError('Genişlik ve boy 0\'dan büyük olmalı');
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
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

  // Admin kontrolü
  if (!isAdmin) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center max-w-md">
          <div className="w-20 h-20 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="h-10 w-10 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-3">Erişim Reddedildi</h3>
          <p className="text-gray-600 mb-8 leading-relaxed">Bu sayfaya erişim yetkiniz bulunmamaktadır. Ürün kuralları yönetimi sadece admin kullanıcılar tarafından kullanılabilir.</p>
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

  if (loading) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-[#00365a]"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <svg className="w-6 h-6 text-[#00365a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900">Kural Detayları Yükleniyor</h3>
              <p className="text-sm text-gray-500 mt-1">Lütfen bekleyiniz...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !rule) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center max-w-md">
          <div className="w-20 h-20 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="h-10 w-10 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-3">Hata Oluştu</h3>
          <p className="text-gray-600 mb-8 leading-relaxed">{error || 'Kural bulunamadı'}</p>
          <Link
            href="/dashboard/urun-kurallari"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#00365a] hover:bg-[#004170] text-white rounded-lg font-semibold transition-all shadow-md hover:shadow-lg"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
            </svg>
            Geri Dön
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-3 mb-8">
          <Link
            href="/dashboard/urun-kurallari"
            className="inline-flex items-center gap-2 text-[#00365a] hover:text-[#004170] font-medium px-3 py-2 rounded-lg hover:bg-white transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Ürün Kuralları
          </Link>
          <span className="text-gray-400">/</span>
          <span className="text-gray-600 font-medium">{rule.name}</span>
        </div>

        {/* Page Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <h1 className="text-3xl font-bold text-[#00365a] flex items-center">
                  <svg className="w-8 h-8 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  {rule.name}
                </h1>
                <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                  rule.isActive 
                    ? 'bg-green-100 text-green-800 border border-green-200' 
                    : 'bg-red-100 text-red-800 border border-red-200'
                }`}>
                  {rule.isActive ? 'Aktif' : 'Pasif'}
                </span>
              </div>
              <p className="text-gray-600 leading-relaxed">{rule.description}</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={openManageCutTypesModal}
                className="px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-all shadow-md hover:shadow-lg flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                </svg>
                Kesim Türleri
              </button>
              <Link
                href={`/dashboard/urun-kurallari/${rule.id}/duzenle`}
                className="px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-all shadow-md hover:shadow-lg flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Düzenle
              </Link>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{rule.sizeOptions.length}</div>
                <div className="text-sm text-gray-500">Boyut Seçeneği</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                </svg>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-800">{rule.cutTypes.length}</div>
                <div className="text-sm text-purple-600">Kesim Türü</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-800">
                  {rule.canHaveFringe ? 'Evet' : 'Hayır'}
                </div>
                <div className="text-sm text-green-600">Saçak Desteği</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-800">
                  {rule.productCount || 0}
                </div>
                <div className="text-sm text-orange-600">Kullanan Ürün</div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Size Options */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-green-600 text-white px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="bg-white bg-opacity-20 rounded-lg p-2 mr-3">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                    </svg>
                  </div>
                  <h2 className="text-lg font-semibold">📏 Boyut Seçenekleri</h2>
                </div>
                <button
                  onClick={openAddSizeModal}
                  className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-3 py-2 rounded-lg font-semibold transition-all flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Ekle
                </button>
              </div>
            </div>
            
            <div className="p-6">
              {rule.sizeOptions.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Boyut Seçeneği Yok</h3>
                  <p className="text-gray-600 mb-4">Henüz hiç boyut seçeneği eklenmemiş.</p>
                  <button
                    onClick={openAddSizeModal}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-all"
                  >
                    İlk Boyutu Ekle
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {rule.sizeOptions.map((option) => (
                    <div key={option.id} className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-lg font-semibold text-gray-900 mb-1">
                            {option.width}cm × {option.height}cm
                          </div>
                          {option.isOptionalHeight && (
                            <span className="inline-flex px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                              Boy İsteğe Bağlı
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEditSizeModal(option)}
                            className="text-green-600 hover:text-green-700 hover:bg-green-50 p-2 rounded-lg transition-all"
                            title="Düzenle"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteSizeOption(option.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-all"
                            title="Sil"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Cut Types */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-purple-600 text-white px-6 py-4">
              <div className="flex items-center">
                <div className="bg-white bg-opacity-20 rounded-lg p-2 mr-3">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                  </svg>
                </div>
                <h2 className="text-lg font-semibold">✂️ Kesim Türleri</h2>
              </div>
            </div>
            
            <div className="p-6">
              {rule.cutTypes.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Kesim Türü Yok</h3>
                  <p className="text-gray-600 mb-4">Henüz hiç kesim türü atanmamış.</p>
                  <button
                    onClick={openManageCutTypesModal}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-all"
                  >
                    Kesim Türü Ata
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {rule.cutTypes.map((cutType) => (
                    <div key={cutType.id} className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center mr-3">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                          </svg>
                        </div>
                        <span className="font-semibold text-purple-900">{cutType.name}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Used Products */}
        {rule.products && rule.products.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-orange-600 text-white px-6 py-4">
              <div className="flex items-center">
                <div className="bg-white bg-opacity-20 rounded-lg p-2 mr-3">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <h2 className="text-lg font-semibold">🏷️ Bu Kuralı Kullanan Ürünler</h2>
              </div>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {rule.products.map((product) => (
                  <div key={product.productId} className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center mr-3">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                      </div>
                      <div>
                        <div className="font-semibold text-orange-900">{product.name}</div>
                        <div className="text-xs text-orange-600">ID: {product.productId}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Add Size Option Modal */}
        {addSizeModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
              <div className="bg-green-600 text-white rounded-t-2xl p-6">
                <div className="flex items-center">
                  <div className="bg-white bg-opacity-20 rounded-xl p-2 mr-3">
                    <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold">Yeni Boyut Seçeneği Ekle</h3>
                </div>
              </div>

              <div className="p-6">
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Genişlik (cm) *</label>
                    <div className="relative">
                      <input
                        type="number"
                        min="1"
                        value={newSizeOption.width || ''}
                        onChange={(e) => setNewSizeOption({...newSizeOption, width: parseInt(e.target.value) || 0})}
                        className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                        placeholder="100"
                      />
                      <svg className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4" />
                      </svg>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Boy (cm) *</label>
                    <div className="relative">
                      <input
                        type="number"
                        min="1"
                        value={newSizeOption.height || ''}
                        onChange={(e) => setNewSizeOption({...newSizeOption, height: parseInt(e.target.value) || 0})}
                        className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                        placeholder="150"
                      />
                      <svg className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4" />
                      </svg>
                    </div>
                  </div>
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newSizeOption.isOptionalHeight}
                        onChange={(e) => setNewSizeOption({...newSizeOption, isOptionalHeight: e.target.checked})}
                        className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm font-semibold text-blue-800">Boy İsteğe Bağlı</span>
                    </label>
                  </div>
                </div>
                
                {addSizeError && (
                  <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-red-800">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {addSizeError}
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-gray-50 px-6 py-4 rounded-b-2xl flex justify-end gap-3">
                <button
                  onClick={() => setAddSizeModalOpen(false)}
                  disabled={addSizeLoading}
                  className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-semibold transition-all disabled:opacity-50"
                >
                  İptal
                </button>
                <button
                  onClick={handleAddSizeOption}
                  disabled={addSizeLoading}
                  className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {addSizeLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      Ekleniyor...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Ekle
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Size Option Modal */}
        {editSizeModalOpen && editingSizeOption && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
              <div className="bg-amber-600 text-white rounded-t-2xl p-6">
                <div className="flex items-center">
                  <div className="bg-white bg-opacity-20 rounded-xl p-2 mr-3">
                    <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold">Boyut Seçeneğini Düzenle</h3>
                </div>
              </div>

              <div className="p-6">
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Genişlik (cm) *</label>
                    <div className="relative">
                      <input
                        type="number"
                        min="1"
                        value={editingSizeOption.data.width || ''}
                        onChange={(e) => setEditingSizeOption({
                          ...editingSizeOption,
                          data: {...editingSizeOption.data, width: parseInt(e.target.value) || 0}
                        })}
                        className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                      />
                      <svg className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4" />
                      </svg>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Boy (cm) *</label>
                    <div className="relative">
                      <input
                        type="number"
                        min="1"
                        value={editingSizeOption.data.height || ''}
                        onChange={(e) => setEditingSizeOption({
                          ...editingSizeOption,
                          data: {...editingSizeOption.data, height: parseInt(e.target.value) || 0}
                        })}
                        className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                      />
                      <svg className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4" />
                      </svg>
                    </div>
                  </div>
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingSizeOption.data.isOptionalHeight}
                        onChange={(e) => setEditingSizeOption({
                          ...editingSizeOption,
                          data: {...editingSizeOption.data, isOptionalHeight: e.target.checked}
                        })}
                        className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm font-semibold text-blue-800">Boy İsteğe Bağlı</span>
                    </label>
                  </div>
                </div>
                
                {editSizeError && (
                  <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-red-800">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {editSizeError}
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-gray-50 px-6 py-4 rounded-b-2xl flex justify-end gap-3">
                <button
                  onClick={() => setEditSizeModalOpen(false)}
                  disabled={editSizeLoading}
                  className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-semibold transition-all disabled:opacity-50"
                >
                  İptal
                </button>
                <button
                  onClick={handleEditSizeOption}
                  disabled={editSizeLoading}
                  className="px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {editSizeLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      Güncelleniyor...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Güncelle
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Manage Cut Types Modal */}
        {manageCutTypesModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[80vh] overflow-y-auto shadow-2xl">
              <div className="bg-purple-600 text-white rounded-t-2xl p-6">
                <div className="flex items-center">
                  <div className="bg-white bg-opacity-20 rounded-xl p-2 mr-3">
                    <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Kesim Türlerini Yönet</h3>
                    <p className="text-purple-100 text-sm mt-1">Bu kurala atanacak kesim türlerini seçin</p>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
                  {allCutTypes.map((cutType) => (
                    <label 
                      key={cutType.id} 
                      className="group relative bg-gray-50 hover:bg-purple-50 border border-gray-200 hover:border-purple-300 rounded-lg p-4 cursor-pointer transition-all duration-200"
                    >
                      <div className="flex items-center gap-3">
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
                          className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                        />
                        <span className="text-sm font-medium text-gray-900 group-hover:text-purple-900">{cutType.name}</span>
                      </div>
                      {selectedCutTypeIds.includes(cutType.id) && (
                        <div className="absolute top-2 right-2">
                          <div className="w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center">
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        </div>
                      )}
                    </label>
                  ))}
                </div>

                {selectedCutTypeIds.length > 0 && (
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
                    <div className="flex items-center gap-2 text-purple-800">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="font-semibold">{selectedCutTypeIds.length} kesim türü seçildi</span>
                    </div>
                  </div>
                )}
                
                {manageCutTypesError && (
                  <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-red-800">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {manageCutTypesError}
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-gray-50 px-6 py-4 rounded-b-2xl flex justify-end gap-3">
                <button
                  onClick={() => setManageCutTypesModalOpen(false)}
                  disabled={manageCutTypesLoading}
                  className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-semibold transition-all disabled:opacity-50"
                >
                  İptal
                </button>
                <button
                  onClick={handleManageCutTypes}
                  disabled={manageCutTypesLoading}
                  className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {manageCutTypesLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      Güncelleniyor...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Güncelle
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 