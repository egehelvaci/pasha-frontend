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

  const inputBaseClass =
    'w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition hover:border-slate-400 focus:border-[#00365a] focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15';

  // Loading state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#f7f8fa]">
        <div className="mx-auto max-w-[1600px] px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
          <div className="flex flex-col items-center justify-center gap-3 py-16">
            <div className="h-9 w-9 animate-spin rounded-full border-2 border-slate-200 border-t-[#00365a]" />
            <p className="text-sm text-slate-500">Yetkilendirme kontrol ediliyor. Lütfen bekleyiniz...</p>
          </div>
        </div>
      </div>
    );
  }

  // Admin kontrolü
  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f8fa] px-4">
        <div className="w-full max-w-md rounded-xl border border-slate-200/80 bg-white p-8 text-center shadow-sm">
          <h3 className="text-base font-semibold text-slate-900">Erişim Reddedildi</h3>
          <p className="mt-2 text-sm text-slate-500">
            Bu sayfaya erişim yetkiniz bulunmamaktadır. Ürün kuralları yönetimi sadece admin kullanıcılar tarafından kullanılabilir.
          </p>
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="mt-6 inline-flex items-center justify-center rounded-lg bg-[#00365a] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#004170] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/25"
          >
            Dashboard&apos;a Dön
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f7f8fa]">
        <div className="mx-auto max-w-[1600px] px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
          <div className="flex flex-col items-center justify-center gap-3 py-16">
            <div className="h-9 w-9 animate-spin rounded-full border-2 border-slate-200 border-t-[#00365a]" />
            <p className="text-sm text-slate-500">Kural detayları yükleniyor. Lütfen bekleyiniz...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !rule) {
    return (
      <div className="min-h-screen bg-[#f7f8fa]">
        <div className="mx-auto max-w-[1600px] px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
          <div className="flex min-h-[60vh] flex-col items-center justify-center px-4">
            <div className="w-full max-w-md rounded-xl border border-slate-200/80 bg-white p-8 text-center shadow-sm">
              <h3 className="text-base font-semibold text-slate-900">Hata Oluştu</h3>
              <p className="mt-2 text-sm text-slate-500">{error || 'Kural bulunamadı'}</p>
              <Link
                href="/dashboard/urun-kurallari"
                className="mt-6 inline-flex items-center justify-center rounded-lg bg-[#00365a] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#004170] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/25"
              >
                Geri Dön
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <div className="mx-auto max-w-[1600px] px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-light tracking-[0.08em] text-neutral-900 sm:text-3xl sm:tracking-[0.12em]">
                {rule.name}
              </h1>
              <span
                className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                  rule.isActive
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : 'border-rose-200 bg-rose-50 text-rose-700'
                }`}
              >
                {rule.isActive ? 'Aktif' : 'Pasif'}
              </span>
            </div>
            <div className="mt-3 h-px w-[min(100%,20rem)] bg-neutral-300 sm:mt-4" />
            <p className="mt-3 text-sm text-slate-500">{rule.description}</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Link
              href="/dashboard/urun-kurallari"
              className="inline-flex shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15"
            >
              Ürün Kuralları
            </Link>
            <button
              type="button"
              onClick={openManageCutTypesModal}
              className="inline-flex shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15"
            >
              Kesim Türleri
            </button>
            <Link
              href={`/dashboard/urun-kurallari/${rule.id}/duzenle`}
              className="inline-flex shrink-0 items-center justify-center rounded-lg bg-[#00365a] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#004170] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/25"
            >
              Düzenle
            </Link>
          </div>
        </div>

        <div className="mb-6 rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Boyut Seçeneği</p>
              <p className="mt-2 text-sm font-medium tabular-nums text-slate-900">{rule.sizeOptions.length}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Kesim Türü</p>
              <p className="mt-2 text-sm font-medium tabular-nums text-slate-900">{rule.cutTypes.length}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Saçak Desteği</p>
              <p className="mt-2 text-sm font-medium text-slate-900">{rule.canHaveFringe ? 'Evet' : 'Hayır'}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Kullanan Ürün</p>
              <p className="mt-2 text-sm font-medium tabular-nums text-slate-900">{rule.productCount || 0}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8">
          <div className="rounded-xl border border-slate-200/80 bg-white shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200/80 bg-slate-50/60 px-4 py-3 sm:px-5">
              <h2 className="text-sm font-semibold text-slate-900">Boyut Seçenekleri</h2>
              <button
                type="button"
                onClick={openAddSizeModal}
                className="inline-flex items-center justify-center rounded-lg bg-[#00365a] px-3 py-2 text-xs font-medium text-white transition hover:bg-[#004170]"
              >
                Ekle
              </button>
            </div>
            <div className="p-4 sm:p-5">
              {rule.sizeOptions.length === 0 ? (
                <div className="px-6 py-16 text-center">
                  <h3 className="text-sm font-medium text-slate-900">Boyut Seçeneği Yok</h3>
                  <p className="mx-auto mt-1.5 max-w-md text-sm text-slate-500">Henüz hiç boyut seçeneği eklenmemiş.</p>
                  <button
                    type="button"
                    onClick={openAddSizeModal}
                    className="mt-4 inline-flex items-center justify-center rounded-lg bg-[#00365a] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#004170]"
                  >
                    İlk Boyutu Ekle
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50/60">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Boyut</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Not</th>
                        <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-500">İşlemler</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {rule.sizeOptions.map((option) => (
                        <tr key={option.id} className="transition-colors hover:bg-slate-50/70">
                          <td className="px-4 py-3 text-sm font-medium text-slate-900">
                            {option.width}cm × {option.height}cm
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-700">
                            {option.isOptionalHeight ? (
                              <span className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-xs font-medium text-sky-700">
                                Boy İsteğe Bağlı
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => openEditSizeModal(option)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-[#00365a] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15"
                                title="Düzenle"
                              >
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteSizeOption(option.id)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-rose-600 transition hover:bg-rose-50 hover:text-rose-700"
                                title="Sil"
                              >
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200/80 bg-white shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200/80 bg-slate-50/60 px-4 py-3 sm:px-5">
              <h2 className="text-sm font-semibold text-slate-900">Kesim Türleri</h2>
              <span className="text-xs text-slate-500">{rule.cutTypes.length} kayıt</span>
            </div>
            <div className="p-4 sm:p-5">
              {rule.cutTypes.length === 0 ? (
                <div className="px-6 py-16 text-center">
                  <h3 className="text-sm font-medium text-slate-900">Kesim Türü Yok</h3>
                  <p className="mx-auto mt-1.5 max-w-md text-sm text-slate-500">Henüz hiç kesim türü atanmamış.</p>
                  <button
                    type="button"
                    onClick={openManageCutTypesModal}
                    className="mt-4 inline-flex items-center justify-center rounded-lg bg-[#00365a] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#004170]"
                  >
                    Kesim Türü Ata
                  </button>
                </div>
              ) : (
                <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                  {rule.cutTypes.map((cutType) => (
                    <li key={cutType.id} className="px-4 py-3 text-sm font-medium text-slate-900">
                      {cutType.name}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        {rule.products && rule.products.length > 0 && (
          <div className="mt-6 rounded-xl border border-slate-200/80 bg-white shadow-sm lg:mt-8">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200/80 bg-slate-50/60 px-4 py-3 sm:px-5">
              <h2 className="text-sm font-semibold text-slate-900">Bu Kuralı Kullanan Ürünler</h2>
              <span className="text-xs text-slate-500">{rule.products.length} ürün</span>
            </div>
            <div className="overflow-x-auto p-4 sm:p-5">
              <table className="w-full">
                <thead className="bg-slate-50/60">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Ürün Adı</th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-500">Ürün ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rule.products.map((product) => (
                    <tr key={product.productId} className="transition-colors hover:bg-slate-50/70">
                      <td className="px-4 py-3 text-sm font-medium text-slate-900">{product.name}</td>
                      <td className="px-4 py-3 text-right text-sm tabular-nums text-slate-700">{product.productId}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Add Size Option Modal */}
        {addSizeModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
            <div className="flex max-h-[92vh] w-full max-w-md flex-col rounded-xl border border-slate-200/80 bg-white shadow-lg">
              <div className="flex items-start justify-between gap-4 rounded-t-xl border-b border-slate-200/80 px-5 py-4">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Yeni Boyut Seçeneği Ekle</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setAddSizeModalOpen(false)}
                  disabled={addSizeLoading}
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-[#00365a] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15 disabled:opacity-50"
                  aria-label="Kapat"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-5">
                <div className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                      Genişlik (cm) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={newSizeOption.width || ''}
                      onChange={(e) => setNewSizeOption({...newSizeOption, width: parseInt(e.target.value) || 0})}
                      className={inputBaseClass}
                      placeholder="100"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                      Boy (cm) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={newSizeOption.height || ''}
                      onChange={(e) => setNewSizeOption({...newSizeOption, height: parseInt(e.target.value) || 0})}
                      className={inputBaseClass}
                      placeholder="150"
                    />
                  </div>
                  <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-slate-50/60 p-3">
                    <input
                      type="checkbox"
                      checked={newSizeOption.isOptionalHeight}
                      onChange={(e) => setNewSizeOption({...newSizeOption, isOptionalHeight: e.target.checked})}
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#00365a] focus:ring-[#00365a]/20"
                    />
                    <span className="text-sm font-medium text-slate-900">Boy İsteğe Bağlı</span>
                  </label>
                </div>
                {addSizeError && (
                  <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-700">
                    {addSizeError}
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2 rounded-b-xl border-t border-slate-200/80 bg-slate-50/60 px-5 py-3.5">
                <button
                  type="button"
                  onClick={() => setAddSizeModalOpen(false)}
                  disabled={addSizeLoading}
                  className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15 disabled:opacity-50"
                >
                  İptal
                </button>
                <button
                  type="button"
                  onClick={handleAddSizeOption}
                  disabled={addSizeLoading}
                  className="inline-flex items-center justify-center rounded-lg bg-[#00365a] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#004170] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/25 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {addSizeLoading ? 'Ekleniyor...' : 'Ekle'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Size Option Modal */}
        {editSizeModalOpen && editingSizeOption && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
            <div className="flex max-h-[92vh] w-full max-w-md flex-col rounded-xl border border-slate-200/80 bg-white shadow-lg">
              <div className="flex items-start justify-between gap-4 rounded-t-xl border-b border-slate-200/80 px-5 py-4">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Boyut Seçeneğini Düzenle</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setEditSizeModalOpen(false)}
                  disabled={editSizeLoading}
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-[#00365a] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15 disabled:opacity-50"
                  aria-label="Kapat"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-5">
                <div className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                      Genişlik (cm) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={editingSizeOption.data.width || ''}
                      onChange={(e) => setEditingSizeOption({
                        ...editingSizeOption,
                        data: {...editingSizeOption.data, width: parseInt(e.target.value) || 0}
                      })}
                      className={inputBaseClass}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                      Boy (cm) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={editingSizeOption.data.height || ''}
                      onChange={(e) => setEditingSizeOption({
                        ...editingSizeOption,
                        data: {...editingSizeOption.data, height: parseInt(e.target.value) || 0}
                      })}
                      className={inputBaseClass}
                    />
                  </div>
                  <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-slate-50/60 p-3">
                    <input
                      type="checkbox"
                      checked={editingSizeOption.data.isOptionalHeight}
                      onChange={(e) => setEditingSizeOption({
                        ...editingSizeOption,
                        data: {...editingSizeOption.data, isOptionalHeight: e.target.checked}
                      })}
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#00365a] focus:ring-[#00365a]/20"
                    />
                    <span className="text-sm font-medium text-slate-900">Boy İsteğe Bağlı</span>
                  </label>
                </div>
                {editSizeError && (
                  <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-700">
                    {editSizeError}
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2 rounded-b-xl border-t border-slate-200/80 bg-slate-50/60 px-5 py-3.5">
                <button
                  type="button"
                  onClick={() => setEditSizeModalOpen(false)}
                  disabled={editSizeLoading}
                  className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15 disabled:opacity-50"
                >
                  İptal
                </button>
                <button
                  type="button"
                  onClick={handleEditSizeOption}
                  disabled={editSizeLoading}
                  className="inline-flex items-center justify-center rounded-lg bg-[#00365a] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#004170] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/25 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {editSizeLoading ? 'Güncelleniyor...' : 'Güncelle'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Manage Cut Types Modal */}
        {manageCutTypesModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
            <div className="flex max-h-[92vh] w-full max-w-2xl flex-col rounded-xl border border-slate-200/80 bg-white shadow-lg">
              <div className="flex items-start justify-between gap-4 rounded-t-xl border-b border-slate-200/80 px-5 py-4">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Kesim Türlerini Yönet</h3>
                  <p className="mt-0.5 text-xs text-slate-500">Bu kurala atanacak kesim türlerini seçin</p>
                </div>
                <button
                  type="button"
                  onClick={() => setManageCutTypesModalOpen(false)}
                  disabled={manageCutTypesLoading}
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-[#00365a] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15 disabled:opacity-50"
                  aria-label="Kapat"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-5">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {allCutTypes.map((cutType) => (
                    <label
                      key={cutType.id}
                      className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                        selectedCutTypeIds.includes(cutType.id)
                          ? 'border-[#00365a]/30 bg-[#00365a]/[0.06]'
                          : 'border-slate-200 bg-slate-50/60 hover:bg-slate-50'
                      }`}
                    >
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
                        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#00365a] focus:ring-[#00365a]/20"
                      />
                      <span className="text-sm font-medium text-slate-900">{cutType.name}</span>
                    </label>
                  ))}
                </div>

                {selectedCutTypeIds.length > 0 && (
                  <p className="mt-4 text-sm text-slate-700">
                    <span className="font-medium">{selectedCutTypeIds.length}</span> kesim türü seçildi
                  </p>
                )}

                {manageCutTypesError && (
                  <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-700">
                    {manageCutTypesError}
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2 rounded-b-xl border-t border-slate-200/80 bg-slate-50/60 px-5 py-3.5">
                <button
                  type="button"
                  onClick={() => setManageCutTypesModalOpen(false)}
                  disabled={manageCutTypesLoading}
                  className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15 disabled:opacity-50"
                >
                  İptal
                </button>
                <button
                  type="button"
                  onClick={handleManageCutTypes}
                  disabled={manageCutTypesLoading}
                  className="inline-flex items-center justify-center rounded-lg bg-[#00365a] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#004170] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/25 disabled:cursor-not-allowed disabled:opacity-50"
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