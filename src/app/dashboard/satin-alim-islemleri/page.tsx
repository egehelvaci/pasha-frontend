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
      <div className="flex min-h-screen items-center justify-center bg-[#f7f8fa]">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-[#00365a]" />
          <p className="text-sm text-slate-600">Yükleniyor...</p>
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
            className="mt-5 inline-flex items-center justify-center rounded-lg bg-[#00365a] px-4 py-2.5 text-sm font-medium text-white transition-all duration-200 ease-out hover:bg-[#004170] focus-visible:ring-2 focus-visible:ring-[#00365a]/25 active:scale-[0.98]"
          >
            Tekrar Dene
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 sm:py-8">
        {/* Page Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-col items-center text-center sm:items-start sm:text-left">
              <h1 className="text-2xl font-light tracking-[0.08em] text-neutral-900 sm:text-3xl sm:tracking-[0.12em]">
                Satın Alım İşlemleri
              </h1>
              <div className="mt-3 h-px w-[min(100%,20rem)] bg-neutral-300 sm:mt-4" />
              <p className="mt-3 max-w-xl text-sm text-slate-500">
                Satıcı bilgilerini yönetin ve satın alım işlemlerini gerçekleştirin
              </p>
            </div>
            {canSeePurchasePrices && (
              <button
                onClick={() => setShowPaymentModal(true)}
                className="inline-flex items-center justify-center gap-1.5 self-center rounded-lg bg-[#00365a] px-4 py-2.5 text-sm font-medium text-white transition-all duration-200 ease-out hover:bg-[#004170] focus-visible:ring-2 focus-visible:ring-[#00365a]/25 active:scale-[0.98] sm:self-auto"
              >
                Ödeme Yap
              </button>
            )}
          </div>
        </div>

        {/* Summary Card */}
        {canSeePurchasePrices && balanceSummary && (
          <div className="mb-6 overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
              <h3 className="text-sm font-semibold text-slate-900">Finansal Özet</h3>
              <p className="mt-0.5 text-xs text-slate-500">Satıcı bakiyelerine genel bakış</p>
            </div>
            <div className="grid grid-cols-2 gap-3 p-4 lg:grid-cols-4 sm:gap-4 sm:p-5">
              <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 p-4 text-center transition-colors duration-200">
                <div className="text-2xl font-semibold tabular-nums text-slate-900">{balanceSummary.summary.totalSuppliers}</div>
                <div className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-500">Toplam Satıcı</div>
              </div>
              <div className="rounded-xl border border-red-100 bg-red-50/60 p-4 text-center transition-colors duration-200">
                <div className="text-2xl font-semibold tabular-nums text-red-600">${balanceSummary.summary.totalPayable.toFixed(2)}</div>
                <div className="mt-1 text-xs font-medium uppercase tracking-wide text-red-700/80">Borç</div>
              </div>
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4 text-center transition-colors duration-200">
                <div className="text-2xl font-semibold tabular-nums text-emerald-600">${balanceSummary.summary.totalReceivable.toFixed(2)}</div>
                <div className="mt-1 text-xs font-medium uppercase tracking-wide text-emerald-700/80">Alacak</div>
              </div>
              <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 p-4 text-center transition-colors duration-200">
                <div className={`text-2xl font-semibold tabular-nums ${balanceSummary.summary.netBalance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  ${Math.abs(balanceSummary.summary.netBalance).toFixed(2)}
                </div>
                <div className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-500">Net Durum</div>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
          <div className="border-b border-slate-200/80 px-4 py-4 sm:px-6">
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
                    <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    id="supplier-search"
                    type="text"
                    placeholder="Satıcı, firma, telefon veya adres ara..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full rounded-lg border border-slate-200/80 bg-white py-2.5 pl-10 pr-10 text-sm text-slate-900 placeholder:text-slate-400 transition-all duration-200 ease-out hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/20"
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => setSearchTerm('')}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 transition-colors duration-200 hover:text-slate-600"
                      aria-label="Aramayı temizle"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {canSeePurchasePrices && (
                <button
                  type="button"
                  onClick={() => router.push('/dashboard/alis-fiyat-listesi')}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200/80 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition-all duration-200 ease-out hover:border-slate-300 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-[#00365a]/20 active:scale-[0.98]"
                >
                  Alış Fiyat Listesi
                </button>
              )}
              <button
                type="button"
                onClick={handleCreateSupplier}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#00365a] px-3.5 py-2 text-sm font-medium text-white transition-all duration-200 ease-out hover:bg-[#004170] focus-visible:ring-2 focus-visible:ring-[#00365a]/25 active:scale-[0.98]"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Yeni Satıcı
              </button>
            </div>
          </div>

          {/* Suppliers Table */}
          {!isLoading && (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-slate-200/80 bg-slate-50/80">
                    <th className="px-4 py-3.5 text-left text-xs font-medium uppercase tracking-wide text-slate-500 sm:px-6">
                      Satıcı Bilgileri
                    </th>
                    <th className="px-4 py-3.5 text-left text-xs font-medium uppercase tracking-wide text-slate-500 sm:px-6">
                      İletişim
                    </th>
                    {canSeePurchasePrices && (
                      <th className="px-4 py-3.5 text-left text-xs font-medium uppercase tracking-wide text-slate-500 sm:px-6">
                        Finansal Durum
                      </th>
                    )}
                    <th className="px-4 py-3.5 text-left text-xs font-medium uppercase tracking-wide text-slate-500 sm:px-6">
                      İşlemler
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSuppliers.map((supplier) => (
                    <tr
                      key={supplier.id}
                      className="transition-colors duration-200 ease-out hover:bg-slate-50/80"
                    >
                      <td className="px-4 py-4 sm:px-6">
                        <div className="min-w-0 space-y-0.5">
                          <div className="truncate text-sm font-semibold uppercase tracking-wide text-slate-900">
                            {supplier.company_name}
                          </div>
                          <div className="truncate text-sm capitalize text-slate-500">{supplier.name}</div>
                        </div>
                      </td>
                      <td className="px-4 py-4 sm:px-6">
                        <div className="space-y-0.5">
                          <div className="text-sm text-slate-900">{supplier.phone}</div>
                          <div className="max-w-xs truncate text-sm text-slate-500">{supplier.address}</div>
                        </div>
                      </td>
                      {canSeePurchasePrices && (
                        <td className="px-4 py-4 sm:px-6">
                          <div
                            className={`text-sm font-semibold tabular-nums ${
                              supplier.balance >= 0 ? 'text-emerald-600' : 'text-red-600'
                            }`}
                          >
                            {supplier.balance}$
                          </div>
                        </td>
                      )}
                      <td className="px-4 py-4 sm:px-6">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => router.push(`/dashboard/satici-siparis-ver?supplierId=${supplier.id}`)}
                            className="rounded-lg border border-slate-200/80 bg-white p-2 text-slate-600 transition-all duration-200 ease-out hover:border-slate-300 hover:bg-slate-50 hover:text-[#00365a] focus-visible:ring-2 focus-visible:ring-[#00365a]/20 active:scale-[0.97]"
                            title="Sipariş Ver"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => router.push(`/dashboard/satin-alim-islemleri/satici-gecmis-islemler/${supplier.id}`)}
                            className="rounded-lg border border-slate-200/80 bg-white p-2 text-slate-600 transition-all duration-200 ease-out hover:border-slate-300 hover:bg-slate-50 hover:text-[#00365a] focus-visible:ring-2 focus-visible:ring-[#00365a]/20 active:scale-[0.97]"
                            title="Geçmiş İşlemler"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEditSupplier(supplier)}
                            className="rounded-lg border border-slate-200/80 bg-white p-2 text-slate-600 transition-all duration-200 ease-out hover:border-slate-300 hover:bg-slate-50 hover:text-[#00365a] focus-visible:ring-2 focus-visible:ring-[#00365a]/20 active:scale-[0.97]"
                            title="Düzenle"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteSupplier(supplier)}
                            className="rounded-lg border border-slate-200/80 bg-white p-2 text-slate-600 transition-all duration-200 ease-out hover:border-red-200 hover:bg-red-50 hover:text-red-600 focus-visible:ring-2 focus-visible:ring-red-200 active:scale-[0.97]"
                            title="Sil"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredSuppliers.length === 0 && (
                    <tr>
                        <td colSpan={canSeePurchasePrices ? 4 : 3} className="px-6 py-14 text-center">
                        <div className="mx-auto flex max-w-sm flex-col items-center">
                          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                          </div>
                          <h3 className="text-base font-semibold text-slate-900">
                            {searchTerm ? 'Arama sonucu bulunamadı' : 'Henüz satıcı eklenmemiş'}
                          </h3>
                          <p className="mt-1.5 text-sm text-slate-500">
                            {searchTerm
                              ? `"${searchTerm}" araması için sonuç bulunamadı. Farklı anahtar kelimeler deneyin.`
                              : 'Yeni satıcı ekleyerek başlayabilirsiniz.'}
                          </p>
                          {searchTerm && (
                            <button
                              type="button"
                              onClick={() => setSearchTerm('')}
                              className="mt-4 inline-flex items-center justify-center rounded-lg bg-[#00365a] px-4 py-2.5 text-sm font-medium text-white transition-all duration-200 ease-out hover:bg-[#004170] focus-visible:ring-2 focus-visible:ring-[#00365a]/25 active:scale-[0.98]"
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
          <div className="fixed inset-0 z-50 flex min-h-screen items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div
              className="relative flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.08)]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-slate-200/80 px-5 py-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Satıcı Sil</h3>
                  <p className="mt-0.5 text-xs text-slate-500">Bu işlem geri alınamaz</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsDeleteModalOpen(false);
                    setSupplierToDelete(null);
                  }}
                  className="rounded-lg p-2 text-slate-400 transition-all duration-200 ease-out hover:bg-slate-50 hover:text-slate-600 focus-visible:ring-2 focus-visible:ring-[#00365a]/20"
                  disabled={isModalLoading}
                  aria-label="Kapat"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="p-5">
                <p className="text-sm leading-relaxed text-slate-700">
                  <span className="font-semibold text-red-600">{supplierToDelete.company_name}</span> satıcısını silmek istediğinizden emin misiniz?
                </p>
                <div className="mt-4 rounded-xl border border-red-100 bg-red-50/80 p-4">
                  <div className="flex items-start gap-3">
                    <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.664-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-red-800">Bu işlem geri alınamaz!</p>
                      <p className="mt-1 text-sm text-red-700">
                        Satıcı bilgileri ve tüm ilişkili veriler kalıcı olarak silinecektir.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsDeleteModalOpen(false);
                      setSupplierToDelete(null);
                    }}
                    disabled={isModalLoading}
                    className="rounded-lg border border-slate-200/80 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-all duration-200 ease-out hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    İptal
                  </button>
                  <button
                    type="button"
                    onClick={confirmDeleteSupplier}
                    disabled={isModalLoading}
                    className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition-all duration-200 ease-out hover:bg-red-700 focus-visible:ring-2 focus-visible:ring-red-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isModalLoading && (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    )}
                    <span>Sil</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Payment Modal - yalnızca admin */}
        {canSeePurchasePrices && showPaymentModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="relative w-full max-w-md overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
              <div className="flex items-center justify-between border-b border-slate-200/80 px-5 py-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Ödeme Yap</h2>
                  <p className="mt-0.5 text-xs text-slate-500">Satıcı bakiyesine ödeme kaydı</p>
                </div>
                <button
                  type="button"
                  onClick={closePaymentModal}
                  className="rounded-lg p-2 text-slate-400 transition-all duration-200 ease-out hover:bg-slate-50 hover:text-slate-600 focus-visible:ring-2 focus-visible:ring-[#00365a]/20"
                  aria-label="Kapat"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="p-5">
                <div className="mb-4">
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                    Satıcı Seçin *
                  </label>
                  <div className="relative" ref={supplierDropdownRef}>
                    <button
                      type="button"
                      onClick={() => setIsSupplierDropdownOpen(!isSupplierDropdownOpen)}
                      className={`flex w-full items-center justify-between rounded-lg border bg-white px-3 py-2.5 text-left text-sm transition-all duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/20 ${
                        isSupplierDropdownOpen
                          ? 'border-[#00365a]/40 bg-slate-50'
                          : 'border-slate-200/80 hover:border-slate-300 hover:bg-slate-50'
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
                        className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${isSupplierDropdownOpen ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {isSupplierDropdownOpen && (
                      <div className="absolute z-10 mt-1.5 w-full overflow-hidden rounded-xl border border-slate-200/80 bg-white py-1 shadow-[0_8px_30px_rgb(0,0,0,0.06)]">
                        <div className="border-b border-slate-100 p-2">
                          <input
                            type="text"
                            placeholder="Satıcı ara..."
                            value={supplierSearchTerm}
                            onChange={(e) => setSupplierSearchTerm(e.target.value)}
                            className="w-full rounded-lg border border-slate-200/80 bg-white px-3 py-2 text-sm transition-all duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/20"
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
                                className="w-full border-b border-slate-50 px-3 py-2.5 text-left transition-colors duration-150 last:border-b-0 hover:bg-slate-50"
                              >
                                <div className="text-sm font-semibold uppercase text-slate-900">{supplier.company_name}</div>
                                <div className="text-xs capitalize text-slate-500">{supplier.name}</div>
                                <div className={`mt-0.5 text-xs font-medium tabular-nums ${
                                  supplier.balance >= 0 ? 'text-emerald-600' : 'text-red-600'
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
                    TL Değeri *
                  </label>
                  <input
                    id="tl-amount"
                    type="number"
                    step="0.01"
                    placeholder="Örn: 1000.00"
                    value={tlAmount}
                    onChange={(e) => setTlAmount(e.target.value)}
                    className="w-full rounded-lg border border-slate-200/80 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition-all duration-200 ease-out hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/20"
                  />
                </div>

                <div className="mb-5">
                  <label htmlFor="exchange-rate" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                    Dolar Kuru (TL/USD) *
                  </label>
                  <input
                    id="exchange-rate"
                    type="number"
                    step="0.01"
                    placeholder="Örn: 34.50"
                    value={exchangeRate}
                    onChange={(e) => setExchangeRate(e.target.value)}
                    className="w-full rounded-lg border border-slate-200/80 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition-all duration-200 ease-out hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/20"
                  />
                </div>

                {tlAmount && exchangeRate && (
                  <div className="mb-4 rounded-xl border border-slate-200/80 bg-slate-50 px-4 py-3 text-center text-sm text-slate-600">
                    USD Karşılığı:{' '}
                    <span className="font-semibold tabular-nums text-slate-900">
                      ${(parseFloat(tlAmount) / parseFloat(exchangeRate)).toFixed(2)}
                    </span>
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={closePaymentModal}
                    disabled={isPaymentLoading}
                    className="flex-1 rounded-lg border border-slate-200/80 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-all duration-200 ease-out hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Kapat
                  </button>
                  <button
                    type="button"
                    onClick={handlePaymentConfirm}
                    disabled={isPaymentLoading || !selectedPaymentSupplier || !tlAmount || !exchangeRate}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#00365a] px-4 py-2.5 text-sm font-medium text-white transition-all duration-200 ease-out hover:bg-[#004170] focus-visible:ring-2 focus-visible:ring-[#00365a]/25 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
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
