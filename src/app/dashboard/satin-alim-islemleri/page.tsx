'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';
import { 
  Supplier, 
  BalanceSummary, 
  CreateSupplierRequest, 
  UpdateSupplierRequest,
  BalanceUpdateRequest,
  getSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  updateSupplierBalance,
  getBalanceSummary
} from '../../../services/api';
import SupplierModal from '../../../components/SupplierModal';
import BalanceModal from '../../../components/BalanceModal';


export default function SatinAlimIslemleriPage() {
  const { user, isAdmin } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'suppliers'>('suppliers');
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [balanceSummary, setBalanceSummary] = useState<BalanceSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modal states
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [isBalanceModalOpen, setIsBalanceModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);
  const [isModalLoading, setIsModalLoading] = useState(false);

  // Payment modal states
  const [selectedPaymentSupplier, setSelectedPaymentSupplier] = useState<Supplier | null>(null);
  const [supplierSearchTerm, setSupplierSearchTerm] = useState('');
  const [isSupplierDropdownOpen, setIsSupplierDropdownOpen] = useState(false);
  const [tlAmount, setTlAmount] = useState('');
  const [exchangeRate, setExchangeRate] = useState('');
  const [isPaymentLoading, setIsPaymentLoading] = useState(false);

  // Refs
  const supplierDropdownRef = useRef<HTMLDivElement>(null);

  // Admin kontrolü
  useEffect(() => {
    if (!isAdmin) {
      router.push('/dashboard');
      return;
    }
  }, [isAdmin, router]);

  // Click outside handler for supplier dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (supplierDropdownRef.current && !supplierDropdownRef.current.contains(event.target as Node)) {
        setIsSupplierDropdownOpen(false);
      }
    }

    if (isSupplierDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isSupplierDropdownOpen]);

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
      const [suppliersData, balanceSummaryData] = await Promise.all([
        getSuppliers(),
        getBalanceSummary()
      ]);
      
      setSuppliers(suppliersData);
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

  // Filtrelenmiş satıcıları döndür
  const filteredSuppliers = suppliers.filter(supplier =>
    supplier.name.toLowerCase().includes(supplierSearchTerm.toLowerCase()) ||
    supplier.company_name.toLowerCase().includes(supplierSearchTerm.toLowerCase())
  );

  // Ödeme modalını sıfırla
  const resetPaymentModal = () => {
    setSelectedPaymentSupplier(null);
    setSupplierSearchTerm('');
    setIsSupplierDropdownOpen(false);
    setTlAmount('');
    setExchangeRate('');
    setIsPaymentLoading(false);
  };

  // Ödeme modalını kapat
  const closePaymentModal = () => {
    setShowPaymentModal(false);
    resetPaymentModal();
  };

  // Ödeme işlemini onayla
  const handlePaymentConfirm = async () => {
    if (!selectedPaymentSupplier || !tlAmount || !exchangeRate) {
      alert('Lütfen tüm alanları doldurun');
      return;
    }

    const usdAmount = parseFloat(tlAmount) / parseFloat(exchangeRate);
    const currentDate = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    
    setIsPaymentLoading(true);
    try {
      const balanceUpdate: BalanceUpdateRequest = {
        amount: usdAmount,
        transaction_type: 'PAYMENT',
        description: `TL ödeme - ${tlAmount} TL (Kur: ${exchangeRate})`,
        reference_number: `PAY-${currentDate}-${randomNum}`,
        exchange_rate: parseFloat(exchangeRate)
      };

      await updateSupplierBalance(selectedPaymentSupplier.id, balanceUpdate);
      await loadData(); // Verileri yenile
      closePaymentModal();
      alert('Ödeme başarıyla gerçekleştirildi');
    } catch (err) {
      console.error('Ödeme işlemi hatası:', err);
      alert('Ödeme işlemi sırasında bir hata oluştu');
    } finally {
      setIsPaymentLoading(false);
    }
  };

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
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Satın Alım İşlemleri</h1>
            <button
              onClick={() => setShowPaymentModal(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center space-x-2 shadow-sm"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span>ÖDEME YAP</span>
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {activeTab === 'suppliers' && (
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Satıcı Yönetimi</h2>
                <div className="flex space-x-3">
                  <button 
                    onClick={() => router.push('/dashboard/alis-fiyat-listesi')}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <div className="flex items-center space-x-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      <span>Alış Fiyat Listesini Görüntüle</span>
                    </div>
                  </button>
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
              </div>

              {/* Bakiye Özeti */}
              {balanceSummary && (
                <div className="mb-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                </div>
              )}

              {/* Satıcı Listesi */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-[#00365a]">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                        SATICI BİLGİLERİ
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                        İLETİŞİM
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                        FİNANSAL DURUM
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                        DURUM
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                        İŞLEMLER
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {suppliers.map((supplier) => (
                      <tr key={supplier.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="space-y-1">
                            <div className="text-sm font-medium text-gray-900">{supplier.name}</div>
                            <div className="text-sm text-gray-600">{supplier.company_name}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{supplier.phone}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className={`text-sm font-medium ${
                            supplier.balance < 0 ? 'text-red-600' : supplier.balance > 0 ? 'text-green-600' : 'text-gray-600'
                          }`}>
                            {supplier.balance.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {supplier.currency}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            supplier.is_active 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {supplier.is_active ? 'Aktif' : 'Pasif'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex space-x-1">
                            <button 
                              onClick={() => router.push(`/dashboard/satici-siparis-ver?supplierId=${supplier.id}`)}
                              className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-full transition-colors"
                              title="Sipariş Ver"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                              </svg>
                            </button>
                            <button 
                              onClick={() => router.push(`/dashboard/satin-alim-islemleri/satici-gecmis-islemler/${supplier.id}`)}
                              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                              title="Geçmiş İşlemler"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </button>
                            <button 
                              onClick={() => handleEditSupplier(supplier)}
                              className="p-2 text-gray-400 hover:text-[#00365a] hover:bg-gray-100 rounded-full transition-colors"
                              title="Güncelle"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button 
                              onClick={() => handleDeleteSupplier(supplier)}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                              title="Sil"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
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

        {/* Payment Modal */}
        {showPaymentModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-md shadow-lg relative">
              <div className="bg-blue-600 rounded-t-xl px-6 py-4 relative">
                <h2 className="text-xl font-bold text-white">Ödeme Yap</h2>
                <button
                  onClick={closePaymentModal}
                  className="absolute right-4 top-4 text-white hover:text-gray-200 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="p-6">
                {/* Satıcı Seçimi */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Satıcı Seçin *
                  </label>
                  <div className="relative" ref={supplierDropdownRef}>
                    <button
                      type="button"
                      onClick={() => setIsSupplierDropdownOpen(!isSupplierDropdownOpen)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-left bg-white flex items-center justify-between"
                    >
                      <span className={selectedPaymentSupplier ? "text-gray-900" : "text-gray-500"}>
                        {selectedPaymentSupplier
                          ? `${selectedPaymentSupplier.company_name} (${selectedPaymentSupplier.name})`
                          : "Satıcı Seçin"
                        }
                      </span>
                      <svg
                        className={`w-5 h-5 text-gray-400 transition-transform ${
                          isSupplierDropdownOpen ? 'rotate-180' : ''
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {isSupplierDropdownOpen && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-hidden">
                        <div className="p-3 border-b border-gray-200">
                          <input
                            type="text"
                            placeholder="Satıcı ara..."
                            value={supplierSearchTerm}
                            onChange={(e) => setSupplierSearchTerm(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <div className="max-h-40 overflow-y-auto">
                          {filteredSuppliers.length > 0 ? (
                            filteredSuppliers.map((supplier) => (
                              <button
                                key={supplier.id}
                                type="button"
                                onClick={() => {
                                  setSelectedPaymentSupplier(supplier);
                                  setIsSupplierDropdownOpen(false);
                                  setSupplierSearchTerm('');
                                }}
                                className="w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
                              >
                                <div className="font-medium text-gray-900">{supplier.company_name}</div>
                                <div className="text-sm text-gray-600">{supplier.name}</div>
                                <div className="text-xs text-gray-500">
                                  Bakiye: ${supplier.balance} {supplier.currency}
                                </div>
                              </button>
                            ))
                          ) : (
                            <div className="px-3 py-2 text-gray-500 text-center">Satıcı bulunamadı</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* TL Değeri */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    TL Değeri *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Örn: 1000.00"
                    value={tlAmount}
                    onChange={(e) => setTlAmount(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Dolar Kuru */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dolar Kuru (TL/USD) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Örn: 34.50"
                    value={exchangeRate}
                    onChange={(e) => setExchangeRate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  {tlAmount && exchangeRate && (
                    <div className="mt-2 text-sm text-gray-600">
                      USD Karşılığı: ${(parseFloat(tlAmount) / parseFloat(exchangeRate)).toFixed(2)}
                    </div>
                  )}
                </div>

                {/* Butonlar */}
                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={closePaymentModal}
                    disabled={isPaymentLoading}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Kapat
                  </button>
                  <button
                    type="button"
                    onClick={handlePaymentConfirm}
                    disabled={isPaymentLoading || !selectedPaymentSupplier || !tlAmount || !exchangeRate}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                  >
                    {isPaymentLoading && (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    )}
                    <span>İşlemi Onayla</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
