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

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-[#00365a] flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mr-3" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 01-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 010-2h4a1 1 0 011 1v4a1 1 0 01-2 0V6.414l-2.293 2.293a1 1 0 11-1.414-1.414L13.586 5H12zm-9 7a1 1 0 012 0v1.586l2.293-2.293a1 1 0 111.414 1.414L6.414 15H8a1 1 0 010 2H4a1 1 0 01-1-1v-4zm13-1a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 010-2h1.586l-2.293-2.293a1 1 0 111.414-1.414L15.586 13V12a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                Ürün Kuralları Yönetimi
              </h1>
              <p className="text-gray-600 mt-2">Ürün kurallarını yönetin, boyut seçenekleri ve kesim türleri atayın</p>
            </div>
            <Link
              href="/dashboard/urun-kurallari/ekle"
              className="bg-[#00365a] hover:bg-[#004170] text-white px-6 py-3 rounded-lg font-semibold transition-all shadow-md hover:shadow-lg flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span>Yeni Kural Ekle</span>
            </Link>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-[#00365a]" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.553.894l-2 1A1 1 0 018 16v-4.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
            </svg>
            <h3 className="text-lg font-semibold text-[#00365a]">Filtreler</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Arama</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Kural adı veya açıklamada ara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#00365a] focus:border-transparent transition-all"
                />
                <svg className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle cx="11" cy="11" r="8"/>
                  <path d="M21 21l-4.35-4.35"/>
                </svg>
              </div>
            </div>
            <div className="dropdown-container">
              <label className="block text-sm font-medium text-gray-700 mb-2">Durum</label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#00365a] focus:border-transparent transition-all text-left bg-white"
                >
                  <span className="text-gray-900">
                    {activeFilter === "all" && "Tüm Kurallar"}
                    {activeFilter === "active" && "Aktif Kurallar"}
                    {activeFilter === "inactive" && "Pasif Kurallar"}
                  </span>
                  <svg 
                    className={`absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 transition-transform ${statusDropdownOpen ? 'rotate-180' : ''}`}
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {statusDropdownOpen && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    <div
                      className={`px-3 py-2 cursor-pointer hover:bg-gray-50 transition-colors ${
                        activeFilter === "all" ? 'bg-blue-50 text-blue-900' : 'text-gray-900'
                      }`}
                      onClick={() => {
                        setActiveFilter("all");
                        setStatusDropdownOpen(false);
                      }}
                    >
                      Tüm Kurallar
                    </div>
                    <div
                      className={`px-3 py-2 cursor-pointer hover:bg-gray-50 transition-colors ${
                        activeFilter === "active" ? 'bg-blue-50 text-blue-900' : 'text-gray-900'
                      }`}
                      onClick={() => {
                        setActiveFilter("active");
                        setStatusDropdownOpen(false);
                      }}
                    >
                      Aktif Kurallar
                    </div>
                    <div
                      className={`px-3 py-2 cursor-pointer hover:bg-gray-50 transition-colors ${
                        activeFilter === "inactive" ? 'bg-blue-50 text-blue-900' : 'text-gray-900'
                      }`}
                      onClick={() => {
                        setActiveFilter("inactive");
                        setStatusDropdownOpen(false);
                      }}
                    >
                      Pasif Kurallar
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-end">
              <button
                onClick={handleSearch}
                className="w-full px-4 py-2 bg-[#00365a] hover:bg-[#004170] text-white rounded-lg font-semibold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Ara
              </button>
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{productRules.length}</div>
                <div className="text-sm text-gray-500">Toplam Kural</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-800">
                  {productRules.filter(r => r.isActive).length}
                </div>
                <div className="text-sm text-green-600">Aktif Kural</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-800">
                  {productRules.filter(r => !r.isActive).length}
                </div>
                <div className="text-sm text-red-600">Pasif Kural</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-[#00365a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                </svg>
              </div>
              <div>
                <div className="text-2xl font-bold text-[#00365a]">{cutTypes.length}</div>
                <div className="text-sm text-[#00365a]">Kesim Türü</div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-[#00365a]">
            <div className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <h3 className="text-lg font-semibold text-white">Ürün Kuralları</h3>
              <span className="ml-4 text-blue-100 text-sm">({filteredRules.length} kural)</span>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center h-48 p-6">
              <div className="relative">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-[#00365a]"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg className="w-6 h-6 text-[#00365a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
              </div>
              <div className="text-center mt-4">
                <h3 className="text-lg font-semibold text-gray-900">Kurallar Yükleniyor</h3>
                <p className="text-sm text-gray-500 mt-1">Lütfen bekleyiniz...</p>
              </div>
            </div>
          ) : filteredRules.length === 0 ? (
            <div className="text-center py-16 p-6">
              <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center">
                <svg className="w-12 h-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Kural Bulunamadı</h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto leading-relaxed">
                {searchTerm ? 'Arama kriterlerinize uygun kural bulunamadı.' : 'Henüz hiç ürün kuralı eklenmemiş. İlk kuralı ekleyerek başlayın.'}
              </p>
              <Link
                href="/dashboard/urun-kurallari/ekle"
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#00365a] hover:bg-[#004170] text-white rounded-lg font-semibold transition-all shadow-md hover:shadow-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                İlk Kuralı Ekle
              </Link>
            </div>
          ) : (
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredRules.map((rule) => (
                  <div key={rule.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">{rule.name}</h3>
                            <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                              rule.isActive 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {rule.isActive ? 'Aktif' : 'Pasif'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mb-4 line-clamp-2">{rule.description}</p>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex items-center text-sm text-gray-600">
                          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                            </svg>
                          </div>
                          <span className="font-medium">{rule.sizeOptions.length} boyut seçeneği</span>
                        </div>
                        
                        <div className="flex items-center text-sm text-gray-600">
                          <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                            <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                            </svg>
                          </div>
                          <span className="font-medium">{rule.cutTypes.length} kesim türü</span>
                        </div>
                        
                        <div className="flex items-center text-sm text-gray-600">
                          <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                            </svg>
                          </div>
                          <span className="font-medium">Saçak: {rule.canHaveFringe ? 'Evet' : 'Hayır'}</span>
                        </div>
                        
                        {rule.productCount !== undefined && (
                          <div className="flex items-center text-sm text-gray-600">
                            <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center mr-3">
                              <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                              </svg>
                            </div>
                            <span className="font-medium">{rule.productCount} ürün kullanıyor</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
                      <div className="flex space-x-2">
                        <Link
                          href={`/dashboard/urun-kurallari/${rule.id}`}
                          className="text-[#00365a] hover:text-[#004170] text-sm font-semibold flex items-center gap-1 px-3 py-1 rounded-lg hover:bg-blue-50 transition-all"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          Detay
                        </Link>
                        <Link
                          href={`/dashboard/urun-kurallari/${rule.id}/duzenle`}
                          className="text-green-600 hover:text-green-700 text-sm font-semibold flex items-center gap-1 px-3 py-1 rounded-lg hover:bg-green-50 transition-all"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Düzenle
                        </Link>
                      </div>
                      <button
                        onClick={() => openDeleteModal(rule)}
                        className="text-red-600 hover:text-red-700 text-sm font-semibold flex items-center gap-1 px-3 py-1 rounded-lg hover:bg-red-50 transition-all"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Sil
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
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
              {/* Header */}
              <div className="bg-red-600 text-white rounded-t-2xl p-6">
                <div className="flex items-center">
                  <div className="bg-white bg-opacity-20 rounded-xl p-2 mr-3">
                    <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold">Kuralı Sil</h3>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                <p className="text-gray-900 mb-4">
                  <strong>"{ruleToDelete.name}"</strong> kuralını silmek istediğinizden emin misiniz?
                </p>
                
                {ruleToDelete.productCount && ruleToDelete.productCount > 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                    <div className="flex items-start">
                      <svg className="h-5 w-5 text-yellow-400 mr-2 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <div className="text-sm text-yellow-800">
                        Bu kural {ruleToDelete.productCount} ürün tarafından kullanılıyor. 
                        Önce ürünlerden kural atamasını kaldırmanız gerekebilir.
                      </div>
                    </div>
                  </div>
                )}
                
                {deleteError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                    <div className="text-sm text-red-800">{deleteError}</div>
                  </div>
                )}

                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-700 text-sm">
                    ⚠️ Bu işlem geri alınamaz.
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="bg-gray-50 px-6 py-4 rounded-b-2xl flex justify-end gap-3">
                <button
                  onClick={() => {
                    setDeleteModalOpen(false);
                    setRuleToDelete(null);
                    setDeleteError('');
                  }}
                  disabled={deleteLoading}
                  className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-semibold transition-all disabled:opacity-50"
                >
                  İptal
                </button>
                <button
                  onClick={handleDeleteRule}
                  disabled={deleteLoading}
                  className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {deleteLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      Siliniyor...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Sil
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