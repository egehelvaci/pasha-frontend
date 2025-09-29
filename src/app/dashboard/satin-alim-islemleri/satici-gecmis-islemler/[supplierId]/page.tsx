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
      console.error('Satıcı geçmiş işlemleri yüklenirken hata oluştu:', err);
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00365a] mx-auto mb-4"></div>
          <p className="text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="w-full">
              <div className="mb-4">
                <Link
                  href="/dashboard/satin-alim-islemleri"
                  className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 shadow-sm"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Satın Alım İşlemlerine Dön
                </Link>
              </div>
              <h1 className="text-3xl font-bold text-gray-900">
                {supplier ? `${supplier.company_name} - Geçmiş İşlemler` : 'Geçmiş İşlemler'}
              </h1>
              <p className="mt-2 text-gray-600">
                {supplier && `Satıcı: ${supplier.name}`}
              </p>
              <p className="text-gray-600">
                Toplam {totalTransactions} işlem bulundu
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {/* Transaction History List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {transactions.length === 0 ? (
            <div className="p-8 text-center">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Henüz satın alma işlemi yok</h3>
              <p className="text-gray-500">Bu satıcıdan henüz hiç ürün satın alınmamış.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {transactions.map((transaction) => (
                <div key={transaction.id} className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {transaction.description}
                      </h3>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-red-600">
                        {formatAmount(transaction.amount)}
                      </p>
                    </div>
                  </div>

                  {/* Satın Alınan Ürünler */}
                  {(() => {
                    const productDetails = getProductDetailsForTransaction(transaction.id);
                    if (productDetails && productDetails.products && productDetails.products.length > 0) {
                      return (
                        <div className="mt-4">
                          <h4 className="text-sm font-medium text-gray-700 mb-3">Satın Alınan Ürünler:</h4>
                          <div className="space-y-2">
                            {productDetails.products.map((item, index) => (
                              <div key={index} className="bg-gray-50 rounded-lg p-3">
                                <div className="flex justify-between items-start">
                                  <div className="flex-1">
                                    <h5 className="font-medium text-gray-900">{item.product.name}</h5>
                                    <p className="text-sm text-gray-600">{item.product.collection.name}</p>
                                    <div className="mt-1 flex flex-wrap gap-4 text-sm text-gray-600">
                                      <span>Miktar: {item.quantity} adet</span>
                                      <span>Boyut: {item.width}x{item.height} cm</span>
                                      <span>Alan: {item.area_m2} m²</span>
                                      <span>Birim Fiyat: ${item.unit_price}/m²</span>
                                    </div>
                                  </div>
                                  <div className="text-right ml-4">
                                    <p className="font-bold text-gray-900">${item.total_price}</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Sayfa {currentPage} / {totalPages}
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Önceki
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Sonraki
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SupplierPurchaseHistoryPage;
