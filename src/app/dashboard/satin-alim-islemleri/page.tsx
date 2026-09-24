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
  const { user, isAdmin, isAdminOrEditor } = useAuth();
  const canSeePurchasePrices = isAdmin;
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

  // Admin / Editör kontrolü
  useEffect(() => {
    if (!isAdminOrEditor) {
      router.push('/dashboard');
      return;
    }
  }, [isAdminOrEditor, router]);

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

  if (!isAdminOrEditor) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f7f8fa]">
        <div className="flex flex-col items-center justify-center gap-3 py-16">
          <div className="h-9 w-9 animate-spin rounded-full border-2 border-slate-200 border-t-[#00365a]" />
          <p className="text-sm text-slate-500">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f8fa] px-4">
        <div className="w-full max-w-md rounded-xl border border-slate-200/80 bg-white p-6 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.664-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-slate-900">Hata Oluştu</h2>
          <p className="mt-2 text-sm text-slate-600">{error}</p>
          <button
            onClick={loadData}
            className="mt-5 inline-flex items-center justify-center rounded-lg bg-[#00365a] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#004170] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/25"
          >
            Tekrar Dene
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
              Satın Alım İşlemleri
            </h1>
            <div className="mt-3 h-px w-[min(100%,20rem)] bg-neutral-300 sm:mt-4" />
            <p className="mt-3 text-sm text-slate-500">
              Satıcı bilgilerini yönetin ve satın alım işlemlerini gerçekleştirin
            </p>
          </div>
          {canSeePurchasePrices && (
            <button
              type="button"
              onClick={() => setShowPaymentModal(true)}
              className="inline-flex shrink-0 items-center justify-center rounded-lg bg-[#00365a] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#004170] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/25"
            >
              Ödeme Yap
            </button>
          )}
        </div>

        {/* Summary Card */}
        {canSeePurchasePrices && balanceSummary && (
          <div className="mb-6 overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200/80 bg-slate-50/60 px-4 py-3 sm:px-5">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Finansal Özet</h3>
                <p className="mt-0.5 text-xs text-slate-500">Satıcı bakiyelerine genel bakış</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-8 gap-y-4 p-4 sm:p-5 lg:grid-cols-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Toplam Satıcı</p>
                <p className="mt-1.5 text-lg font-medium tabular-nums text-slate-900">
                  {balanceSummary.summary.totalSuppliers}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Borç</p>
                <p className="mt-1.5 text-lg font-medium tabular-nums text-rose-600">
                  ${balanceSummary.summary.totalPayable.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Alacak</p>
                <p className="mt-1.5 text-lg font-medium tabular-nums text-emerald-600">
                  ${balanceSummary.summary.totalReceivable.toFixed(2)}
                </p>
              </div>
              <div className="col-span-2 border-t border-slate-200 pt-4 lg:col-span-1 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Net Durum</p>
                <p
                  className={`mt-1.5 text-xl font-semibold tabular-nums ${
                    balanceSummary.summary.netBalance >= 0 ? 'text-emerald-600' : 'text-rose-600'
                  }`}
                >
                  ${Math.abs(balanceSummary.summary.netBalance).toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-200/80 bg-slate-50/60 px-4 py-3 sm:px-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Satıcı Yönetimi</h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  {filteredSuppliers.length}/{suppliers.length} satıcı
                </p>
              </div>

              <div className="relative w-full lg:max-w-md">
                <label htmlFor="supplier-search" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                  Ara
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                      <circle cx="11" cy="11" r="8" />
                      <path strokeLinecap="round" d="M21 21l-4.35-4.35" />
                    </svg>
                  </div>
                  <input
                    id="supplier-search"
                    type="text"
                    placeholder="Satıcı, firma, telefon veya adres ara..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-10 text-sm text-slate-900 placeholder:text-slate-400 transition hover:border-slate-400 focus:border-[#00365a] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15"
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => setSearchTerm('')}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 transition-colors hover:text-slate-600"
                      aria-label="Aramayı temizle"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                        <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {canSeePurchasePrices && (
                <button
                  type="button"
                  onClick={() => router.push('/dashboard/alis-fiyat-listesi')}
                  className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15"
                >
                  Alış Fiyat Listesi
                </button>
              )}
              <button
                type="button"
                onClick={handleCreateSupplier}
                className="inline-flex items-center justify-center rounded-lg bg-[#00365a] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#004170] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/25"
              >
                Yeni Satıcı
              </button>
            </div>
          </div>

          {/* Suppliers Table */}
          {!isLoading && (
            <div className="w-full overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50/60">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                      Satıcı Bilgileri
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                      İletişim
                    </th>
                    {canSeePurchasePrices && (
                      <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-500">
                        Finansal Durum
                      </th>
                    )}
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                      İşlemler
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSuppliers.map((supplier) => (
                    <tr
                      key={supplier.id}
                      className="transition-colors hover:bg-slate-50/70"
                    >
                      <td className="px-4 py-3">
                        <div className="min-w-0 space-y-0.5">
                          <div className="truncate text-sm font-semibold uppercase tracking-wide text-slate-900">
                            {supplier.company_name}
                          </div>
                          <div className="truncate text-sm capitalize text-slate-500">{supplier.name}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-0.5">
                          <div className="text-sm text-slate-900">{supplier.phone}</div>
                          <div className="max-w-xs truncate text-sm text-slate-500">{supplier.address}</div>
                        </div>
                      </td>
                      {canSeePurchasePrices && (
                        <td className="px-4 py-3 text-right">
                          <div
                            className={`text-sm font-medium tabular-nums ${
                              supplier.balance >= 0 ? 'text-emerald-600' : 'text-rose-600'
                            }`}
                          >
                            {supplier.balance}$
                          </div>
                        </td>
                      )}
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-1">
                          <button
                            type="button"
                            onClick={() => router.push(`/dashboard/satici-siparis-ver?supplierId=${supplier.id}`)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-[#00365a] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15"
                            title="Sipariş Ver"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                              <path strokeLinecap="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => router.push(`/dashboard/satin-alim-islemleri/satici-gecmis-islemler/${supplier.id}`)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-[#00365a] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15"
                            title="Geçmiş İşlemler"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                              <path strokeLinecap="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEditSupplier(supplier)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-[#00365a] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15"
                            title="Düzenle"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                              <path strokeLinecap="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteSupplier(supplier)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-rose-600 transition hover:bg-rose-50 hover:text-rose-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/25"
                            title="Sil"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                              <path strokeLinecap="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredSuppliers.length === 0 && (
                    <tr>
                        <td colSpan={canSeePurchasePrices ? 4 : 3} className="px-6 py-16 text-center">
                        <div className="mx-auto max-w-md">
                          <p className="text-sm font-medium text-slate-900">
                            {searchTerm ? 'Arama sonucu bulunamadı' : 'Henüz satıcı eklenmemiş'}
                          </p>
                          <p className="mx-auto mt-1.5 max-w-md text-sm text-slate-500">
                            {searchTerm
                              ? `"${searchTerm}" araması için sonuç bulunamadı. Farklı anahtar kelimeler deneyin.`
                              : 'Yeni satıcı ekleyerek başlayabilirsiniz.'}
                          </p>
                          {searchTerm && (
                            <button
                              type="button"
                              onClick={() => setSearchTerm('')}
                              className="mt-4 inline-flex items-center justify-center rounded-lg bg-[#00365a] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#004170] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/25"
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
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
            <div
              className="relative flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-slate-200/80 px-5 py-4">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Satıcı Sil</h3>
                  <p className="mt-0.5 text-xs text-slate-500">Bu işlem geri alınamaz</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsDeleteModalOpen(false);
                    setSupplierToDelete(null);
                  }}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15"
                  disabled={isModalLoading}
                  aria-label="Kapat"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="px-5 py-5">
                <p className="text-sm leading-relaxed text-slate-700">
                  <span className="font-semibold text-rose-600">{supplierToDelete.company_name}</span> satıcısını silmek istediğinizden emin misiniz?
                </p>
                <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-700">
                  <p className="font-medium">Bu işlem geri alınamaz!</p>
                  <p className="mt-1">
                    Satıcı bilgileri ve tüm ilişkili veriler kalıcı olarak silinecektir.
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-200/80 bg-slate-50/60 px-5 py-3.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsDeleteModalOpen(false);
                    setSupplierToDelete(null);
                  }}
                  disabled={isModalLoading}
                  className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  İptal
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteSupplier}
                  disabled={isModalLoading}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-rose-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/25 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isModalLoading && (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  )}
                  <span>Sil</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Payment Modal - yalnızca admin */}
        {canSeePurchasePrices && showPaymentModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
            <div className="relative w-full max-w-md rounded-xl border border-slate-200/80 bg-white shadow-lg">
              <div className="flex items-center justify-between border-b border-slate-200/80 px-5 py-4">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">Ödeme Yap</h2>
                  <p className="mt-0.5 text-xs text-slate-500">Satıcı bakiyesine ödeme kaydı</p>
                </div>
                <button
                  type="button"
                  onClick={closePaymentModal}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15"
                  aria-label="Kapat"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="px-5 py-5">
                <div className="mb-4">
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                    Satıcı Seçin <span className="text-rose-500">*</span>
                  </label>
                  <div className="dropdown-container relative" ref={supplierDropdownRef}>
                    <button
                      type="button"
                      onClick={() => setIsSupplierDropdownOpen(!isSupplierDropdownOpen)}
                      className={`relative flex w-full items-center justify-between rounded-lg border bg-slate-50 px-3 py-2.5 pr-9 text-left text-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15 ${
                        isSupplierDropdownOpen
                          ? 'border-[#00365a]'
                          : 'border-slate-300 hover:border-slate-400'
                      }`}
                    >
                      <span className={selectedPaymentSupplier ? 'text-slate-900' : 'text-slate-500'}>
                        {selectedPaymentSupplier ? (
                          <span className="block text-left">
                            <span className="block font-semibold uppercase">{selectedPaymentSupplier.company_name}</span>
                            <span className="block text-xs capitalize text-slate-500">{selectedPaymentSupplier.name}</span>
                          </span>
                        ) : (
                          'Satıcı seçin'
                        )}
                      </span>
                      <svg
                        className={`absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-transform ${isSupplierDropdownOpen ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={1.8}
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {isSupplierDropdownOpen && (
                      <div className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                        <div className="border-b border-slate-100 p-2">
                          <input
                            type="text"
                            placeholder="Satıcı ara..."
                            value={supplierSearchTerm}
                            onChange={(e) => setSupplierSearchTerm(e.target.value)}
                            className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 transition focus:border-[#00365a] focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15"
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
                                className={`block w-full px-3 py-2 text-left text-sm transition-colors hover:bg-slate-50 ${
                                  selectedPaymentSupplier?.id === supplier.id
                                    ? 'bg-[#00365a]/[0.06] font-medium text-[#00365a]'
                                    : 'text-slate-700'
                                }`}
                              >
                                <div className="text-sm font-semibold uppercase text-slate-900">{supplier.company_name}</div>
                                <div className="text-xs capitalize text-slate-500">{supplier.name}</div>
                                <div className={`mt-0.5 text-xs font-medium tabular-nums ${
                                  supplier.balance >= 0 ? 'text-emerald-600' : 'text-rose-600'
                                }`}>
                                  Bakiye: {supplier.balance}$
                                </div>
                              </button>
                            ))
                          ) : (
                            <div className="px-3 py-3 text-center text-sm text-slate-500">Satıcı bulunamadı</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mb-4">
                  <label htmlFor="tl-amount" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                    TL Değeri <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="tl-amount"
                    type="number"
                    step="0.01"
                    placeholder="Örn: 1000.00"
                    value={tlAmount}
                    onChange={(e) => setTlAmount(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition hover:border-slate-400 focus:border-[#00365a] focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15"
                  />
                </div>

                <div className="mb-5">
                  <label htmlFor="exchange-rate" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                    Dolar Kuru (TL/USD) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="exchange-rate"
                    type="number"
                    step="0.01"
                    placeholder="Örn: 34.50"
                    value={exchangeRate}
                    onChange={(e) => setExchangeRate(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition hover:border-slate-400 focus:border-[#00365a] focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15"
                  />
                </div>

                {tlAmount && exchangeRate && (
                  <div className="mb-4 flex items-baseline justify-between gap-4 rounded-lg border border-slate-200 bg-slate-50/60 px-4 py-3">
                    <span className="text-xs font-medium uppercase tracking-wide text-slate-500">USD Karşılığı</span>
                    <span className="text-right text-base font-semibold tabular-nums text-slate-900">
                      ${(parseFloat(tlAmount) / parseFloat(exchangeRate)).toFixed(2)}
                    </span>
                  </div>
                )}

                <div className="flex justify-end gap-2 rounded-b-xl border-t border-slate-200/80 bg-slate-50/60 -mx-5 mt-5 px-5 py-3.5">
                  <button
                    type="button"
                    onClick={closePaymentModal}
                    disabled={isPaymentLoading}
                    className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Kapat
                  </button>
                  <button
                    type="button"
                    onClick={handlePaymentConfirm}
                    disabled={isPaymentLoading || !selectedPaymentSupplier || !tlAmount || !exchangeRate}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#00365a] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#004170] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/25 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isPaymentLoading && (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
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
