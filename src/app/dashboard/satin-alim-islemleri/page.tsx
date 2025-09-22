'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';
import { 
  Supplier, 
  PurchasePriceList, 
  BalanceSummary, 
  CreateSupplierRequest, 
  UpdateSupplierRequest,
  BalanceUpdateRequest,
  CreatePurchasePriceListRequest,
  getSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  updateSupplierBalance,
  getBalanceSummary,
  getPurchasePriceLists
} from '../../../services/api';
import SupplierModal from '../../../components/SupplierModal';
import BalanceModal from '../../../components/BalanceModal';
import PurchasePriceListModal from '../../../components/PurchasePriceListModal';


export default function SatinAlimIslemleriPage() {
  const { user, isAdmin } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'suppliers' | 'price-lists' | 'balance'>('suppliers');
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [priceLists, setPriceLists] = useState<PurchasePriceList[]>([]);
  const [balanceSummary, setBalanceSummary] = useState<BalanceSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modal states
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [isBalanceModalOpen, setIsBalanceModalOpen] = useState(false);
  const [isPriceListModalOpen, setIsPriceListModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [selectedPriceList, setSelectedPriceList] = useState<PurchasePriceList | null>(null);
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);
  const [isModalLoading, setIsModalLoading] = useState(false);

  // Admin kontrolü
  useEffect(() => {
    if (!isAdmin) {
      router.push('/dashboard');
      return;
    }
  }, [isAdmin, router]);

  // Veri yükleme
  useEffect(() => {
    if (isAdmin) {
      loadData();
    }
  }, [isAdmin]);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Paralel API çağrıları
      const [suppliersData, priceListsData, balanceSummaryData] = await Promise.all([
        getSuppliers(),
        getPurchasePriceLists(),
        getBalanceSummary()
      ]);
      
      setSuppliers(suppliersData);
      setPriceLists(priceListsData);
      setBalanceSummary(balanceSummaryData);

    } catch (err) {
      setError('Veriler yüklenirken bir hata oluştu');
      console.error('Data loading error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Modal işlemleri
  const handleCreateSupplier = () => {
    setSelectedSupplier(null);
    setIsSupplierModalOpen(true);
  };

  const handleEditSupplier = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setIsSupplierModalOpen(true);
  };

  const handleDeleteSupplier = (supplier: Supplier) => {
    setSupplierToDelete(supplier);
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteSupplier = async () => {
    if (!supplierToDelete) return;

    setIsModalLoading(true);
    try {
      await deleteSupplier(supplierToDelete.id);
      await loadData(); // Verileri yenile
      setIsDeleteModalOpen(false);
      setSupplierToDelete(null);
    } catch (error) {
      console.error('Satıcı silme hatası:', error);
      alert('Satıcı silinirken bir hata oluştu');
    } finally {
      setIsModalLoading(false);
    }
  };

  const handleUpdateBalance = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setIsBalanceModalOpen(true);
  };

  const handleSaveSupplier = async (data: CreateSupplierRequest | UpdateSupplierRequest) => {
    setIsModalLoading(true);
    try {
      if (selectedSupplier) {
        await updateSupplier(selectedSupplier.id, data as UpdateSupplierRequest);
      } else {
        await createSupplier(data as CreateSupplierRequest);
      }
      await loadData(); // Verileri yenile
    } catch (error) {
      console.error('Satıcı kaydetme hatası:', error);
      throw error; // Modal'da hata gösterilsin
    } finally {
      setIsModalLoading(false);
    }
  };

  const handleSaveBalance = async (data: BalanceUpdateRequest) => {
    if (!selectedSupplier) return;
    
    setIsModalLoading(true);
    try {
      await updateSupplierBalance(selectedSupplier.id, data);
      await loadData(); // Verileri yenile
    } catch (error) {
      console.error('Bakiye güncelleme hatası:', error);
      throw error; // Modal'da hata gösterilsin
    } finally {
      setIsModalLoading(false);
    }
  };

  // Fiyat listesi işlemleri
  const handleCreatePriceList = () => {
    setSelectedPriceList(null);
    setIsPriceListModalOpen(true);
  };

  const handleEditPriceList = (priceList: PurchasePriceList) => {
    setSelectedPriceList(priceList);
    setIsPriceListModalOpen(true);
  };

  const handleSavePriceList = async (data: CreatePurchasePriceListRequest) => {
    setIsModalLoading(true);
    try {
      if (selectedPriceList) {
        // Güncelleme işlemi - API'de updatePurchasePriceList fonksiyonu kullanılabilir
        console.log('Fiyat listesi güncelleme:', selectedPriceList.id, data);
      } else {
        // Yeni oluşturma işlemi - API'de createPurchasePriceList fonksiyonu kullanılabilir
        console.log('Yeni fiyat listesi oluşturma:', data);
      }
      await loadData(); // Verileri yenile
    } catch (error) {
      console.error('Fiyat listesi kaydetme hatası:', error);
      throw error; // Modal'da hata gösterilsin
    } finally {
      setIsModalLoading(false);
    }
  };

  if (!isAdmin) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00365a] mx-auto mb-4"></div>
          <p className="text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Hata Oluştu</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={loadData}
            className="px-4 py-2 bg-[#00365a] text-white rounded-lg hover:bg-[#004170] transition-colors"
          >
            Tekrar Dene
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Başlık */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Satın Alım İşlemleri</h1>
          <p className="text-gray-600">Satıcı yönetimi, alış fiyat listeleri ve bakiye takibi</p>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('suppliers')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'suppliers'
                    ? 'border-[#00365a] text-[#00365a]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <span>Satıcılar</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('price-lists')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'price-lists'
                    ? 'border-[#00365a] text-[#00365a]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  <span>Alış Fiyat Listeleri</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('balance')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'balance'
                    ? 'border-[#00365a] text-[#00365a]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                  <span>Bakiye Özeti</span>
                </div>
              </button>
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {activeTab === 'suppliers' && (
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Satıcı Yönetimi</h2>
                <button 
                  onClick={handleCreateSupplier}
                  className="px-4 py-2 bg-[#00365a] text-white rounded-lg hover:bg-[#004170] transition-colors"
                >
                  <div className="flex items-center space-x-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <span>Yeni Satıcı</span>
                  </div>
                </button>
              </div>

              {/* Satıcı Listesi */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Satıcı
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Firma
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        İletişim
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Bakiye
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Durum
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        İşlemler
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {suppliers.map((supplier) => (
                      <tr key={supplier.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{supplier.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{supplier.company_name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{supplier.phone}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`text-sm font-medium ${
                            supplier.balance < 0 ? 'text-red-600' : supplier.balance > 0 ? 'text-green-600' : 'text-gray-600'
                          }`}>
                            {supplier.balance.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {supplier.currency}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            supplier.is_active 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {supplier.is_active ? 'Aktif' : 'Pasif'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button 
                              onClick={() => handleUpdateBalance(supplier)}
                              className="text-green-600 hover:text-green-800"
                            >
                              Kayıt Gir
                            </button>
                            <button 
                              onClick={() => handleEditSupplier(supplier)}
                              className="text-[#00365a] hover:text-[#004170]"
                            >
                              Düzenle
                            </button>
                            <button 
                              onClick={() => handleDeleteSupplier(supplier)}
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
            </div>
          )}

          {activeTab === 'price-lists' && (
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Alış Fiyat Listeleri</h2>
                <button 
                  onClick={handleCreatePriceList}
                  className="px-4 py-2 bg-[#00365a] text-white rounded-lg hover:bg-[#004170] transition-colors"
                >
                  <div className="flex items-center space-x-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <span>Yeni Liste</span>
                  </div>
                </button>
              </div>

              {/* Fiyat Listesi */}
              <div className="grid gap-4">
                {priceLists.map((list) => (
                  <div key={list.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">{list.name}</h3>
                        <p className="text-sm text-gray-600 mt-1">{list.description}</p>
                        <div className="flex items-center space-x-4 mt-2">
                          <span className="text-sm text-gray-500">
                            Para Birimi: {list.currency}
                          </span>
                          {list.is_default && (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                              Varsayılan
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => handleEditPriceList(list)}
                          className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                        >
                          Düzenle
                        </button>
                        <button className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors">
                          Görüntüle
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'balance' && balanceSummary && (
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Bakiye Özeti</h2>
              
              {/* Özet Kartları */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                      </svg>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-green-600">Toplam Alacak</p>
                      <p className="text-2xl font-bold text-green-900">
                        {balanceSummary.summary.totalReceivable.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} USD
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                      </svg>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-red-600">Toplam Borç</p>
                      <p className="text-2xl font-bold text-red-900">
                        {balanceSummary.summary.totalPayable.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} USD
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-blue-600">Toplam Satıcı</p>
                      <p className="text-2xl font-bold text-blue-900">
                        {balanceSummary.summary.totalSuppliers}
                      </p>
                    </div>
                  </div>
                </div>

                <div className={`border rounded-lg p-4 ${
                  balanceSummary.summary.netBalance < 0 
                    ? 'bg-red-50 border-red-200' 
                    : 'bg-green-50 border-green-200'
                }`}>
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <svg className={`w-8 h-8 ${
                        balanceSummary.summary.netBalance < 0 ? 'text-red-600' : 'text-green-600'
                      }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <div className="ml-4">
                      <p className={`text-sm font-medium ${
                        balanceSummary.summary.netBalance < 0 ? 'text-red-600' : 'text-green-600'
                      }`}>Net Durum</p>
                      <p className={`text-2xl font-bold ${
                        balanceSummary.summary.netBalance < 0 ? 'text-red-900' : 'text-green-900'
                      }`}>
                        {balanceSummary.summary.netBalance.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} USD
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Detaylı Bilgiler */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Borçlu Satıcılar</h3>
                  <p className="text-sm text-gray-600">Detaylı borçlu satıcı listesi burada görüntülenecek.</p>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Alacaklı Satıcılar</h3>
                  <p className="text-sm text-gray-600">Detaylı alacaklı satıcı listesi burada görüntülenecek.</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modals */}
        <SupplierModal
          isOpen={isSupplierModalOpen}
          onClose={() => setIsSupplierModalOpen(false)}
          onSave={handleSaveSupplier}
          supplier={selectedSupplier}
          isLoading={isModalLoading}
        />

        <BalanceModal
          isOpen={isBalanceModalOpen}
          onClose={() => setIsBalanceModalOpen(false)}
          onSave={handleSaveBalance}
          supplier={selectedSupplier}
          isLoading={isModalLoading}
        />

        <PurchasePriceListModal
          isOpen={isPriceListModalOpen}
          onClose={() => setIsPriceListModalOpen(false)}
          onSave={handleSavePriceList}
          priceList={selectedPriceList}
          isLoading={isModalLoading}
        />

        {/* Silme Onay Modalı */}
        {isDeleteModalOpen && supplierToDelete && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center min-h-screen p-4">
            <div 
              className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-red-500 to-red-600">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center text-white text-lg font-bold">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.664-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-white">Satıcı Sil</h3>
                </div>
                <button
                  onClick={() => {
                    setIsDeleteModalOpen(false);
                    setSupplierToDelete(null);
                  }}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors text-white"
                  disabled={isModalLoading}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {/* Modal Content */}
              <div className="p-6">
                <div className="text-center">
                  <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                    <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </div>
                  <h4 className="text-lg font-medium text-gray-900 mb-2">
                    Satıcıyı Silmek İstediğinizden Emin Misiniz?
                  </h4>
                  <p className="text-sm text-gray-600 mb-4">
                    <strong>{supplierToDelete.name}</strong> adlı satıcıyı silmek üzeresiniz.
                  </p>
                </div>
              </div>
              
              {/* Modal Footer */}
              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsDeleteModalOpen(false);
                    setSupplierToDelete(null);
                  }}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                  disabled={isModalLoading}
                >
                  İptal
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteSupplier}
                  disabled={isModalLoading}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {isModalLoading && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  )}
                  <span>Evet, Sil</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
