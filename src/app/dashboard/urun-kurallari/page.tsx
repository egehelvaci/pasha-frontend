'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ProductRule, getProductRules, deleteProductRule, CutType, getCutTypes } from '@/services/api';
import { useAuth } from '@/app/context/AuthContext';
import Link from 'next/link';

export default function ProductRulesPage() {
  const router = useRouter();
  const { isAdmin, isLoading: authLoading, token } = useAuth();
  const [productRules, setProductRules] = useState<ProductRule[]>([]);
  const [cutTypes, setCutTypes] = useState<CutType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [ruleToDelete, setRuleToDelete] = useState<ProductRule | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  
  // Custom dropdown state'i
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.push('/dashboard');
      return;
    }
    
    if (!authLoading && isAdmin && !fetchedRef.current) {
      fetchedRef.current = true;
      fetchData();
    }
  }, [isAdmin, authLoading, router]);

  // Dropdown'ın dışına tıklandığında kapanması
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.dropdown-container')) {
        setStatusDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [rulesData, cutTypesData] = await Promise.all([
        getProductRules(),
        getCutTypes()
      ]);
      setProductRules(rulesData);
      setCutTypes(cutTypesData);
    } catch (error) {
      console.error('Veri getirme hatası:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    try {
      setLoading(true);
      const isActive = activeFilter === 'all' ? undefined : activeFilter === 'active';
      const rules = await getProductRules(isActive, searchTerm || undefined);
      setProductRules(rules);
    } catch (error) {
      console.error('Arama hatası:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRule = async () => {
    if (!ruleToDelete) return;
    
    try {
      setDeleteLoading(true);
      setDeleteError('');
      await deleteProductRule(ruleToDelete.id);
      await fetchData(); // Listeyi yenile
      setDeleteModalOpen(false);
      setRuleToDelete(null);
    } catch (error: any) {
      setDeleteError(error.message || 'Silme işlemi başarısız');
    } finally {
      setDeleteLoading(false);
    }
  };

  const openDeleteModal = (rule: ProductRule) => {
    setRuleToDelete(rule);
    setDeleteError('');
    setDeleteModalOpen(true);
  };

  const filteredRules = productRules.filter(rule => {
    const matchesSearch = rule.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         rule.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (activeFilter === 'all') return matchesSearch;
    if (activeFilter === 'active') return matchesSearch && rule.isActive;
    if (activeFilter === 'inactive') return matchesSearch && !rule.isActive;
    
    return matchesSearch;
  });

  // Loading state
  if (authLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#f7f8fa]">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-slate-200 border-t-[#00365a]" />
        <p className="text-sm text-slate-500">Yetkilendirme kontrol ediliyor...</p>
      </div>
    );
  }

  // Admin kontrolü
  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f8fa] px-4">
        <div className="w-full max-w-md rounded-xl border border-slate-200/80 bg-white shadow-sm px-6 py-10 text-center">
          <h3 className="text-base font-semibold text-slate-900">Erişim Reddedildi</h3>
          <p className="mt-2 text-sm text-slate-500">
            Bu sayfaya erişim yetkiniz bulunmamaktadır. Ürün kuralları yönetimi sadece admin kullanıcılar
            tarafından kullanılabilir.
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            className="mt-6 inline-flex items-center justify-center rounded-lg bg-[#00365a] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#004170] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/25 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Dashboard&apos;a Dön
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <div className="mx-auto max-w-[1600px] px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-light tracking-[0.08em] text-neutral-900 sm:text-3xl sm:tracking-[0.12em]">
              Ürün Kuralları Yönetimi
            </h1>
            <div className="mt-3 h-px w-[min(100%,20rem)] bg-neutral-300 sm:mt-4" />
            <p className="mt-3 text-sm text-slate-500">Ürün kurallarını yönetin, boyut seçenekleri ve kesim türleri atayın</p>
          </div>
          <Link
            href="/dashboard/urun-kurallari/ekle"
            className="inline-flex shrink-0 items-center justify-center rounded-lg bg-[#00365a] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#004170] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/25 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Yeni Kural Ekle
          </Link>
        </div>

        {/* Filters */}
        <div className="mb-6 rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto]">
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">Arama</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Kural adı veya açıklamada ara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  className="w-full rounded-lg border border-slate-300 bg-slate-50 py-2.5 pl-10 pr-3 text-sm text-slate-900 placeholder:text-slate-400 transition hover:border-slate-400 focus:border-[#00365a] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15"
                />
                <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                  <circle cx="11" cy="11" r="8" />
                  <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
                </svg>
              </div>
            </div>
            <div className="dropdown-container">
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">Durum</label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
                  className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 pr-9 text-left text-sm text-slate-900 transition hover:border-slate-400 focus:border-[#00365a] focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15"
                >
                  {activeFilter === "all" && "Tüm Kurallar"}
                  {activeFilter === "active" && "Aktif Kurallar"}
                  {activeFilter === "inactive" && "Pasif Kurallar"}
                  <svg
                    className={`absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-transform ${statusDropdownOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.8}
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {statusDropdownOpen && (
                  <div className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                    <button
                      type="button"
                      className={`block w-full px-3 py-2 text-left text-sm transition-colors hover:bg-slate-50 ${
                        activeFilter === "all" ? 'bg-[#00365a]/[0.06] font-medium text-[#00365a]' : 'text-slate-700'
                      }`}
                      onClick={() => {
                        setActiveFilter("all");
                        setStatusDropdownOpen(false);
                      }}
                    >
                      Tüm Kurallar
                    </button>
                    <button
                      type="button"
                      className={`block w-full px-3 py-2 text-left text-sm transition-colors hover:bg-slate-50 ${
                        activeFilter === "active" ? 'bg-[#00365a]/[0.06] font-medium text-[#00365a]' : 'text-slate-700'
                      }`}
                      onClick={() => {
                        setActiveFilter("active");
                        setStatusDropdownOpen(false);
                      }}
                    >
                      Aktif Kurallar
                    </button>
                    <button
                      type="button"
                      className={`block w-full px-3 py-2 text-left text-sm transition-colors hover:bg-slate-50 ${
                        activeFilter === "inactive" ? 'bg-[#00365a]/[0.06] font-medium text-[#00365a]' : 'text-slate-700'
                      }`}
                      onClick={() => {
                        setActiveFilter("inactive");
                        setStatusDropdownOpen(false);
                      }}
                    >
                      Pasif Kurallar
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-end">
              <button
                onClick={handleSearch}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#00365a] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#004170] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/25 disabled:cursor-not-allowed disabled:opacity-50 md:w-auto"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Ara
              </button>
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Toplam Kural</p>
            <p className="mt-2 text-2xl font-light text-slate-900">{productRules.length}</p>
          </div>
          <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Aktif Kural</p>
            <p className="mt-2 text-2xl font-light text-slate-900">{productRules.filter(r => r.isActive).length}</p>
          </div>
          <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Pasif Kural</p>
            <p className="mt-2 text-2xl font-light text-slate-900">{productRules.filter(r => !r.isActive).length}</p>
          </div>
          <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Kesim Türü</p>
            <p className="mt-2 text-2xl font-light text-slate-900">{cutTypes.length}</p>
          </div>
        </div>

        {/* Main Content */}
        <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200/80 bg-slate-50/60 px-4 py-3 sm:px-5">
            <h3 className="text-sm font-semibold text-slate-900">Ürün Kuralları</h3>
            <span className="text-xs text-slate-500">{filteredRules.length} kural</span>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16">
              <div className="h-9 w-9 animate-spin rounded-full border-2 border-slate-200 border-t-[#00365a]" />
              <p className="text-sm text-slate-500">Kurallar yükleniyor...</p>
            </div>
          ) : filteredRules.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <h3 className="text-sm font-medium text-slate-900">Kural Bulunamadı</h3>
              <p className="mx-auto mt-1.5 max-w-md text-sm text-slate-500">
                {searchTerm ? 'Arama kriterlerinize uygun kural bulunamadı.' : 'Henüz hiç ürün kuralı eklenmemiş. İlk kuralı ekleyerek başlayın.'}
              </p>
              <Link
                href="/dashboard/urun-kurallari/ekle"
                className="mt-6 inline-flex items-center justify-center rounded-lg bg-[#00365a] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#004170] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/25 disabled:cursor-not-allowed disabled:opacity-50"
              >
                İlk Kuralı Ekle
              </Link>
            </div>
          ) : (
            <div className="p-4 sm:p-5">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
                {filteredRules.map((rule) => (
                  <div key={rule.id} className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
                    <div className="p-4 sm:p-5">
                      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
                        <h3 className="text-base font-medium text-slate-900">{rule.name}</h3>
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                          rule.isActive
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                            : 'border-rose-200 bg-rose-50 text-rose-700'
                        }`}>
                          {rule.isActive ? 'Aktif' : 'Pasif'}
                        </span>
                      </div>
                      <p className="mb-4 line-clamp-2 text-sm text-slate-700">{rule.description}</p>

                      <ul className="space-y-2 text-sm text-slate-700">
                        <li><span className="font-medium text-slate-900">{rule.sizeOptions.length}</span> boyut seçeneği</li>
                        <li><span className="font-medium text-slate-900">{rule.cutTypes.length}</span> kesim türü</li>
                        <li>Saçak: <span className="font-medium text-slate-900">{rule.canHaveFringe ? 'Evet' : 'Hayır'}</span></li>
                        {rule.productCount !== undefined && (
                          <li><span className="font-medium text-slate-900">{rule.productCount}</span> ürün kullanıyor</li>
                        )}
                      </ul>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200/80 bg-slate-50/60 px-4 py-3 sm:px-5">
                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={`/dashboard/urun-kurallari/${rule.id}`}
                          className="inline-flex items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          Detay
                        </Link>
                        <Link
                          href={`/dashboard/urun-kurallari/${rule.id}/duzenle`}
                          className="inline-flex items-center justify-center gap-1 rounded-lg bg-[#00365a] px-3 py-2 text-xs font-medium text-white transition hover:bg-[#004170]"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Düzenle
                        </Link>
                      </div>
                      <button
                        type="button"
                        onClick={() => openDeleteModal(rule)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-rose-600 transition hover:bg-rose-50 hover:text-rose-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/20"
                        aria-label="Sil"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Delete Confirmation Modal */}
        {deleteModalOpen && ruleToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
            <div className="w-full max-w-md overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-lg">
              <div className="border-b border-slate-200/80 px-5 py-4">
                <h3 className="text-base font-semibold text-slate-900">Kuralı Sil</h3>
              </div>

              <div className="px-5 py-5">
                <p className="text-sm text-slate-700">
                  <span className="font-medium text-slate-900">&quot;{ruleToDelete.name}&quot;</span> kuralını silmek istediğinizden emin misiniz?
                </p>

                {ruleToDelete.productCount && ruleToDelete.productCount > 0 && (
                  <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-3 text-sm text-amber-700">
                    Bu kural {ruleToDelete.productCount} ürün tarafından kullanılıyor.
                    Önce ürünlerden kural atamasını kaldırmanız gerekebilir.
                  </div>
                )}

                {deleteError && (
                  <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-700">
                    {deleteError}
                  </div>
                )}

                <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-3">
                  <p className="text-sm text-rose-700">
                    ⚠️ Bu işlem geri alınamaz.
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-200/80 bg-slate-50/60 px-5 py-3.5">
                <button
                  type="button"
                  onClick={() => {
                    setDeleteModalOpen(false);
                    setRuleToDelete(null);
                    setDeleteError('');
                  }}
                  disabled={deleteLoading}
                  className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  İptal
                </button>
                <button
                  type="button"
                  onClick={handleDeleteRule}
                  disabled={deleteLoading}
                  className="inline-flex items-center justify-center rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-rose-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/25 disabled:cursor-not-allowed disabled:opacity-50"
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