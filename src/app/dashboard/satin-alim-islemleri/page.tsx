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
  
  // Search states
  const [searchTerm, setSearchTerm] = useState('');

  // Refs
  const supplierDropdownRef = useRef<HTMLDivElement>(null);

  // Filtered suppliers based on search term
  const filteredSuppliers = suppliers.filter(supplier => 
    supplier.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Modal açıldığında body scroll'unu engelle
  useEffect(() => {
    if (showPaymentModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    // Cleanup function - component unmount edildiğinde scroll'u geri getir
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showPaymentModal]);

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

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [suppliersData, balanceData] = await Promise.all([
        getSuppliers(),
        getBalanceSummary()
      ]);
      setSuppliers(suppliersData);
      setBalanceSummary(balanceData);
    } catch (err) {
      setError('Veriler yüklenirken bir hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

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
      throw error; // Modal'da hata gösterilsin
    } finally {
      setIsModalLoading(false);
    }
  };

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

    const tlAmountNumber = parseFloat(tlAmount);
    const currentDate = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    
    setIsPaymentLoading(true);
    try {
      const balanceUpdate: BalanceUpdateRequest = {
        amount: tlAmountNumber, // TL değeri doğrudan gönderiliyor
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
      alert('Ödeme işlemi sırasında bir hata oluştu');
    } finally {
      setIsPaymentLoading(false);
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
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-[1600px] mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-[#00365a] flex items-center">
                Satın Alım İşlemleri
              </h1>
              <p className="text-gray-600 mt-2">Satıcı bilgilerini yönetin ve satın alım işlemlerini gerçekleştirin</p>
            </div>
            <button
              onClick={() => setShowPaymentModal(true)}
              className="bg-[#00365a] hover:bg-[#004170] text-white px-6 py-3 rounded-lg font-semibold transition-all shadow-md hover:shadow-lg flex items-center gap-2"
            >
              <span>Ödeme Yap</span>
            </button>
          </div>
        </div>

        {/* Summary Card */}
        {balanceSummary && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
            <div className="px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Finansal Özet</h3>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">{balanceSummary.summary.totalSuppliers}</div>
                  <div className="text-sm text-gray-600">Toplam Satıcı</div>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">${balanceSummary.summary.totalPayable.toFixed(2)}</div>
                  <div className="text-sm text-red-700">Borç</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">${balanceSummary.summary.totalReceivable.toFixed(2)}</div>
                  <div className="text-sm text-green-700">Alacak</div>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className={`text-2xl font-bold ${balanceSummary.summary.netBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ${Math.abs(balanceSummary.summary.netBalance).toFixed(2)}
                  </div>
                  <div className="text-sm text-blue-700">Net Durum</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-[#00365a]">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex items-center">
                <h3 className="text-lg font-semibold text-white">Satıcı Yönetimi</h3>
                <span className="ml-4 text-blue-100 text-sm">({filteredSuppliers.length}/{suppliers.length} satıcı)</span>
              </div>
              
              {/* Search Bar */}
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder="Satıcı, firma, telefon veya adres ara..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 w-80 bg-white border border-gray-200 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50 focus:border-transparent"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      <svg className="h-4 w-4 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            </div>
            <div className="flex space-x-3 mt-4">
              <button 
                onClick={() => router.push('/dashboard/alis-fiyat-listesi')}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-all shadow-sm hover:shadow-md flex items-center gap-2"
              >
                Alış Fiyat Listesi
              </button>
              <button 
                onClick={handleCreateSupplier}
                className="bg-white hover:bg-gray-100 text-[#00365a] border border-white px-4 py-2 rounded-lg font-medium transition-all shadow-sm hover:shadow-md flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Yeni Satıcı
              </button>
            </div>
          </div>

          {/* Suppliers Table */}
          {!isLoading && (
            <div className="overflow-x-auto">
              <div className="min-w-full">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Satıcı Bilgileri
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        İletişim
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Finansal Durum
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        İşlemler
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredSuppliers.map((supplier) => (
                      <tr key={supplier.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="space-y-1">
                            <div className="text-lg font-bold text-gray-900 uppercase">{supplier.company_name}</div>
                            <div className="text-sm text-gray-600 capitalize">{supplier.name}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="space-y-1">
                            <div className="text-sm text-gray-900">{supplier.phone}</div>
                            <div className="text-sm text-gray-600 max-w-xs truncate">{supplier.address}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="space-y-1">
                            <div className={`text-sm font-medium ${
                              supplier.balance >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {supplier.balance}$
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => router.push(`/dashboard/satici-siparis-ver?supplierId=${supplier.id}`)}
                              className="group relative bg-blue-50 hover:bg-blue-100 text-blue-700 p-2 rounded-lg transition-all shadow-sm hover:shadow-md"
                              title="Sipariş Ver"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => router.push(`/dashboard/satin-alim-islemleri/satici-gecmis-islemler/${supplier.id}`)}
                              className="group relative bg-purple-50 hover:bg-purple-100 text-purple-700 p-2 rounded-lg transition-all shadow-sm hover:shadow-md"
                              title="Geçmiş İşlemler"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleEditSupplier(supplier)}
                              className="group relative bg-green-50 hover:bg-green-100 text-green-700 p-2 rounded-lg transition-all shadow-sm hover:shadow-md"
                              title="Düzenle"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDeleteSupplier(supplier)}
                              className="group relative bg-red-50 hover:bg-red-100 text-red-700 p-2 rounded-lg transition-all shadow-sm hover:shadow-md"
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
                    {filteredSuppliers.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center">
                          <div className="flex flex-col items-center">
                            <svg className="h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">
                              {searchTerm ? 'Arama sonucu bulunamadı' : 'Henüz satıcı eklenmemiş'}
                            </h3>
                            <p className="text-gray-500 text-center max-w-sm">
                              {searchTerm 
                                ? `"${searchTerm}" araması için sonuç bulunamadı. Farklı anahtar kelimeler deneyin.`
                                : 'Yeni satıcı ekleyerek başlayabilirsiniz.'
                              }
                            </p>
                            {searchTerm && (
                              <button
                                onClick={() => setSearchTerm('')}
                                className="mt-4 px-4 py-2 bg-[#00365a] text-white rounded-lg hover:bg-[#004170] transition-colors"
                              >
                                Aramayı Temizle
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modals */}
        <SupplierModal
          isOpen={isSupplierModalOpen}
          onClose={() => {
            setIsSupplierModalOpen(false);
            setSelectedSupplier(null);
          }}
          onSave={handleSaveSupplier}
          supplier={selectedSupplier}
          isLoading={isModalLoading}
        />

        <BalanceModal
          isOpen={isBalanceModalOpen}
          onClose={() => {
            setIsBalanceModalOpen(false);
            setSelectedSupplier(null);
          }}
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
                <div className="mb-6">
                  <p className="text-gray-700 text-base leading-relaxed">
                    <span className="font-semibold text-red-600">{supplierToDelete.company_name}</span> satıcısını silmek istediğinizden emin misiniz?
                  </p>
                  <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-start">
                      <svg className="w-5 h-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.664-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      <div>
                        <p className="text-sm font-medium text-red-800">Bu işlem geri alınamaz!</p>
                        <p className="text-sm text-red-700 mt-1">
                          Satıcı bilgileri ve tüm ilişkili veriler kalıcı olarak silinecektir.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => {
                      setIsDeleteModalOpen(false);
                      setSupplierToDelete(null);
                    }}
                    disabled={isModalLoading}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    İptal
                  </button>
                  <button
                    onClick={confirmDeleteSupplier}
                    disabled={isModalLoading}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    {isModalLoading && (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    )}
                    <span>Sil</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Payment Modal */}
        {showPaymentModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-md shadow-lg relative">
              <div className="bg-[#00365a] rounded-t-xl px-6 py-4 relative">
                <div className="flex items-center">
                  <h2 className="text-xl font-bold text-white">Ödeme Yap</h2>
                </div>
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 flex items-center justify-between"
                    >
                      <span className={selectedPaymentSupplier ? 'text-gray-900' : 'text-gray-500'}>
                        {selectedPaymentSupplier ? (
                          <div className="text-left">
                            <div className="font-bold uppercase">{selectedPaymentSupplier.company_name}</div>
                            <div className="text-sm capitalize">{selectedPaymentSupplier.name}</div>
                          </div>
                        ) : 'Satıcı seçin'}
                      </span>
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    
                    {isSupplierDropdownOpen && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg">
                        <div className="p-2">
                          <input
                            type="text"
                            placeholder="Satıcı ara..."
                            value={supplierSearchTerm}
                            onChange={(e) => setSupplierSearchTerm(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <div className="max-h-40 overflow-y-auto">
                          {suppliers.filter(supplier =>
                            supplier.name.toLowerCase().includes(supplierSearchTerm.toLowerCase()) ||
                            supplier.company_name.toLowerCase().includes(supplierSearchTerm.toLowerCase())
                          ).length > 0 ? (
                            suppliers.filter(supplier =>
                              supplier.name.toLowerCase().includes(supplierSearchTerm.toLowerCase()) ||
                              supplier.company_name.toLowerCase().includes(supplierSearchTerm.toLowerCase())
                            ).map((supplier) => (
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
                                <div className="font-bold text-gray-900 uppercase">{supplier.company_name}</div>
                                <div className="text-sm text-gray-600 capitalize">{supplier.name}</div>
                                <div className={`text-xs font-medium ${
                                  supplier.balance >= 0 ? 'text-green-600' : 'text-red-600'
                                }`}>
                                  Bakiye: {supplier.balance}$
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
                </div>

                {/* USD Karşılığı */}
                {tlAmount && exchangeRate && (
                  <div className="text-center text-sm text-gray-600 mb-2.5">
                    USD Karşılığı: <span className="font-semibold text-gray-900">${(parseFloat(tlAmount) / parseFloat(exchangeRate)).toFixed(2)}</span>
                  </div>
                )}

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
                    className="flex-1 px-4 py-2 bg-[#00365a] text-white rounded-lg hover:bg-[#004170] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 shadow-md hover:shadow-lg"
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