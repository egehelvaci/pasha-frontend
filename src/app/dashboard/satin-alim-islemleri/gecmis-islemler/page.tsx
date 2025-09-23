'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/app/context/AuthContext';
import { 
  getPurchaseHistory,
  PurchaseHistoryItem,
  PurchaseHistoryResponse
} from '@/services/api';

const PurchaseHistoryPage = () => {
  const { isAdmin, isLoading: authLoading } = useAuth();
  const [transactions, setTransactions] = useState<PurchaseHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAdmin) {
      loadPurchaseHistory();
    }
  }, [isAdmin, currentPage]);

  const loadPurchaseHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getPurchaseHistory(currentPage, 20);
      setTransactions(response.data.transactions);
      setTotalPages(response.data.pagination.totalPages);
      setTotalTransactions(response.data.pagination.total);
    } catch (err) {
      console.error('Satın alma geçmişi yüklenirken hata oluştu:', err);
      setError('Satın alma geçmişi yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

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
    // Remove the negative sign and format as positive
    const positiveAmount = amount.startsWith('-') ? amount.substring(1) : amount;
    return `$${parseFloat(positiveAmount).toFixed(2)}`;
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
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Geçmiş Satın Alım İşlemleri</h1>
              <p className="mt-2 text-gray-600">
                Toplam {totalTransactions} işlem bulundu
              </p>
            </div>
            <Link
              href="/dashboard/satici-siparis-ver"
              className="px-4 py-2 bg-[#00365a] text-white rounded-lg hover:bg-[#004170] transition-colors"
            >
              Yeni Sipariş
            </Link>
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
              <p className="text-gray-500">İlk satın alma işleminizi yapmak için yeni sipariş oluşturun.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {transactions.map((transaction) => (
                <div key={transaction.id} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {/* Firma Adı */}
                      <h3 className="text-lg font-semibold text-gray-900 mb-2 capitalize">
                        {transaction.supplier.company_name}
                      </h3>
                      
                      {/* Satıcı Adı Soyadı */}
                      <p className="text-sm text-gray-600 mb-3 capitalize">
                        {transaction.supplier.name}
                      </p>
                      
                      {/* İçerik: Description */}
                      <div className="mb-3">
                        <div className="text-gray-800 leading-relaxed whitespace-pre-line">
                          {transaction.description}
                        </div>
                      </div>
                      
                      {/* Tarih */}
                      <p className="text-xs text-gray-500">
                        {formatDate(transaction.created_at)}
                      </p>
                    </div>
                    
                    {/* Fiyat */}
                    <div className="text-right ml-6">
                      <p className="text-lg font-bold text-green-600">
                        {formatAmount(transaction.amount)}
                      </p>
                    </div>
                  </div>
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

export default PurchaseHistoryPage;