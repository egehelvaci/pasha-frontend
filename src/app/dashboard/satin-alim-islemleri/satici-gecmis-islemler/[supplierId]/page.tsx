'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { 
  getSupplierPurchaseSummary,
  SupplierPurchaseSummaryResponse,
  SupplierPurchaseSummaryItem,
  CartPurchaseWithProducts
} from '@/services/api';

const SupplierPurchaseHistoryPage = () => {
  const params = useParams();
  const { isAdmin, isLoading: authLoading } = useAuth();
  const [transactions, setTransactions] = useState<SupplierPurchaseSummaryItem[]>([]);
  const [cartPurchases, setCartPurchases] = useState<CartPurchaseWithProducts[]>([]);
  const [supplier, setSupplier] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const supplierId = params.supplierId as string;

  const loadSupplierPurchaseHistory = useCallback(async () => {
    if (!supplierId) return;
    
    setLoading(true);
    setError(null);
    try {
      const response = await getSupplierPurchaseSummary(supplierId);
      
      if (response.success && response.data) {
        // API response'da all_transactions ve cart_purchases_with_products var
        setTransactions(response.data.all_transactions || []);
        setCartPurchases(response.data.cart_purchases_with_products || []);
        setSupplier(response.data.supplier);
        // Pagination bilgisi yoksa default değerler kullan
        setTotalPages(1);
        setTotalTransactions(response.data.all_transactions?.length || 0);
      } else {
        throw new Error('API response formatı beklenmedik');
      }
    } catch (err) {
      setError('Satıcı geçmiş işlemleri yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  }, [supplierId, currentPage]);

  useEffect(() => {
    if (isAdmin && supplierId) {
      loadSupplierPurchaseHistory();
    }
  }, [isAdmin, loadSupplierPurchaseHistory]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatAmount = (amount: string) => {
    return `$${Math.abs(parseFloat(amount)).toFixed(2)}`;
  };

  // İşlem ID'sine göre ürün detaylarını bul
  const getProductDetailsForTransaction = (transactionId: string) => {
    return cartPurchases.find(cp => cp.transaction_id === transactionId);
  };

  if (!isAdmin) {
    return null;
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900">Geçmiş İşlemler Yükleniyor</h3>
              <p className="text-sm text-gray-500 mt-1">Lütfen bekleyiniz...</p>
            </div>
          </div>
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
              <div className="mb-4">
                <Link
                  href="/dashboard/satin-alim-islemleri"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-[#00365a] hover:bg-[#004170] text-white rounded-lg font-semibold transition-all shadow-md hover:shadow-lg"
                >
                  Satın Alım İşlemlerine Dön
                </Link>
              </div>
              <h1 className="text-3xl font-bold text-[#00365a] flex items-center">
                {supplier ? (
                  <span>
                    <span className="capitalize">{supplier.company_name}</span> - Geçmiş İşlemler
                  </span>
                ) : 'Geçmiş İşlemler'}
              </h1>
              <p className="text-gray-600 mt-2">
                {supplier && (
                  <>
                    Satıcı: <span className="capitalize">{supplier.name}</span> • 
                  </>
                )}
                Toplam {totalTransactions} işlem kayıtları
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-red-600 font-medium">{error}</p>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-[#00365a]">
            <div className="flex items-center">
              <svg className="h-5 w-5 mr-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="text-lg font-semibold text-white">Satın Alım Geçmişi</h3>
              <span className="ml-4 text-blue-100 text-sm">({totalTransactions} işlem)</span>
            </div>
          </div>

          {transactions.length === 0 ? (
            <div className="text-center py-16 p-6">
              <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center">
                <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Henüz İşlem Yok</h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto leading-relaxed">
                Bu satıcıdan henüz hiç ürün satın alınmamış. İlk satın alma işleminizi gerçekleştirin.
              </p>
            </div>
          ) : (
            <div className="p-6">
              <div className="space-y-6">
                {transactions.map((transaction) => (
                  <div key={transaction.id} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">{transaction.description}</h3>
                          {transaction.transaction_type === 'PAYMENT' ? (
                            <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                              </svg>
                              Ödeme
                            </span>
                          ) : transaction.transaction_type === 'CART_PURCHASE' ? (
                            <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                              </svg>
                              Satın Alım
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              İşlem
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a1 1 0 011-1h6a1 1 0 011 1v4m4 0V9a2 2 0 00-2-2H6a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V9a2 2 0 00-2-2m-4 0H8m0 0V9a2 2 0 012-2h4a2 2 0 012 2v4M8 7h8m-5 8h.01" />
                            </svg>
                            İşlem ID: {transaction.id.slice(-8)}
                          </span>
                          <span className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a1 1 0 011-1h6a1 1 0 011 1v4m4 0V9a2 2 0 00-2-2H6a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V9a2 2 0 00-2-2m-4 0H8m0 0V9a2 2 0 012-2h4a2 2 0 012 2v4M8 7h8m-5 8h.01" />
                            </svg>
                            {formatDate(transaction.created_at)}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-red-600">
                          {formatAmount(transaction.amount)}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">USD</p>
                      </div>
                    </div>

                    {/* Satın Alınan Ürünler */}
                    {(() => {
                      const productDetails = getProductDetailsForTransaction(transaction.id);
                      if (productDetails && productDetails.products && productDetails.products.length > 0) {
                        return (
                          <div className="mt-6">
                            <div className="bg-blue-50 rounded-lg p-4">
                              <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                                <svg className="w-4 h-4 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                </svg>
                                Satın Alınan Ürünler ({productDetails.products.length} ürün)
                              </h4>
                              <div className="space-y-3">
                                {productDetails.products.map((item, index) => (
                                  <div key={index} className="bg-white rounded-lg p-4 border border-blue-100">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <div className="space-y-2">
                                        <h5 className="font-semibold text-gray-900">{item.product.name}</h5>
                                        <p className="text-sm text-gray-600 flex items-center gap-1">
                                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 7a2 2 0 012-2h10a2 2 0 012 2v2M7 7h10" />
                                          </svg>
                                          {item.product.collection.name}
                                        </p>
                                        <div className="flex flex-wrap gap-3 text-sm">
                                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded-md">
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z" />
                                            </svg>
                                            {item.quantity} adet
                                          </span>
                                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded-md">
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4a1 1 0 011-1h4m0 0V1m0 2h4m0 0V1m0 2h4a1 1 0 011 1v4M4 8H2m2 0v4m0 0v4a1 1 0 001 1h4m0 0H7m2 0h4m0 0h2a1 1 0 001-1v-4m0 0V8" />
                                            </svg>
                                            {item.width}×{item.height} cm
                                          </span>
                                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-md">
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                                            </svg>
                                            {item.area_m2} m²
                                          </span>
                                        </div>
                                      </div>
                                      <div className="space-y-2">
                                        <div className="text-right">
                                          <p className="text-sm text-gray-500">Birim Fiyat</p>
                                          <p className="text-lg font-semibold text-[#00365a]">${item.unit_price}/m²</p>
                                        </div>
                                        <div className="text-right">
                                          <p className="text-sm text-gray-500">Toplam</p>
                                          <p className="text-xl font-bold text-green-600">${item.total_price}</p>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500 flex items-center gap-2">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707L16.414 6.5A1 1 0 0015.586 6H7a2 2 0 00-2 2v11a2 2 0 002 2z" />
                </svg>
                Sayfa {currentPage} / {totalPages}
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Önceki
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#00365a] hover:bg-[#004170] text-white rounded-lg font-medium transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Sonraki
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default SupplierPurchaseHistoryPage;