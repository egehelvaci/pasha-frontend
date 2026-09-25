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
  const { isAdmin, isAdminOrEditor, isLoading: authLoading } = useAuth();
  const canSeePurchasePrices = isAdmin;
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
    if (isAdminOrEditor && supplierId) {
      loadSupplierPurchaseHistory();
    }
  }, [isAdminOrEditor, loadSupplierPurchaseHistory]);

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

  if (!isAdminOrEditor) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f8fa]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-[#00365a]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <div className="mx-auto max-w-[1600px] px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
        <div className="mb-6 sm:mb-8">
          <Link
            href="/dashboard/satin-alim-islemleri"
            className="mb-3 inline-block text-sm font-medium text-slate-500 transition hover:text-[#00365a]"
          >
            Satın alım işlemlerine dön
          </Link>
          <h1 className="text-2xl font-light tracking-[0.08em] text-neutral-900 sm:text-3xl sm:tracking-[0.12em]">
            Geçmiş İşlemler
          </h1>
          <div className="mt-3 h-px w-[min(100%,20rem)] bg-neutral-300 sm:mt-4" />
          <p className="mt-3 text-sm text-slate-500">
            {supplier ? (
              <>
                <span className="capitalize">{supplier.company_name}</span>
                {supplier.name ? <span className="capitalize"> · {supplier.name}</span> : null}
                {' · '}
              </>
            ) : null}
            {totalTransactions} işlem
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
          <div className="border-b border-slate-200/80 bg-slate-50/60 px-4 py-3 sm:px-5">
            <h3 className="text-sm font-semibold text-slate-900">Satın Alım Geçmişi</h3>
            <p className="mt-0.5 text-xs text-slate-500">{totalTransactions} işlem</p>
          </div>

          {transactions.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <p className="text-sm font-medium text-slate-900">Henüz işlem yok</p>
              <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
                Bu satıcıdan henüz ürün satın alınmamış.
              </p>
            </div>
          ) : (
            <div className="space-y-3 p-4 sm:p-5">
              {transactions.map((transaction) => (
                <div key={transaction.id} className="rounded-xl border border-slate-200/80 bg-white p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-2">
                      {transaction.transaction_type === 'PAYMENT' ? (
                        <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                          Ödeme
                        </span>
                      ) : transaction.transaction_type === 'CART_PURCHASE' ? (
                        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                          Satın Alım
                        </span>
                      ) : (
                        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                          İşlem
                        </span>
                      )}
                      <span className="text-sm text-slate-500">
                        {formatDate(transaction.created_at)}
                      </span>
                    </div>
                    {canSeePurchasePrices && (
                      <div className="text-right">
                        <p className={`text-lg font-medium tabular-nums ${
                          transaction.transaction_type === 'PAYMENT'
                            ? 'text-emerald-600'
                            : 'text-rose-600'
                        }`}>
                          {formatAmount(transaction.amount)}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">USD</p>
                      </div>
                    )}
                  </div>

                  {transaction.transaction_type === 'PAYMENT' && transaction.description && (
                    <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                      <h4 className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">
                        Ödeme detayı
                      </h4>
                      <p className="text-sm text-slate-700">{transaction.description}</p>
                    </div>
                  )}

                  {transaction.items && transaction.items.length > 0 && (
                    <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                      <h4 className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-500">
                        Satın alınan ürünler ({transaction.items_count})
                      </h4>
                      <div className="space-y-2">
                        {transaction.items.map((item: any, index: number) => (
                          <div key={index} className="text-sm text-slate-800">
                            <span className="font-medium text-slate-900">{item.urun_ismi}</span>
                            <span className="mx-2 text-slate-400">·</span>
                            <span className="tabular-nums">{item.en}×{item.boy} cm</span>
                            {canSeePurchasePrices ? (
                              <>
                                <span className="mx-2 text-slate-400">·</span>
                                <span className="tabular-nums">${item.m2_fiyati}/m²</span>
                                <span className="mx-2 text-slate-400">×</span>
                                <span className="tabular-nums">{item.adet} adet</span>
                                <span className="mx-2 text-slate-400">=</span>
                                <span className="font-medium tabular-nums text-slate-900">${item.toplam_tutar}</span>
                              </>
                            ) : (
                              <>
                                <span className="mx-2 text-slate-400">·</span>
                                <span className="tabular-nums">{item.adet} adet</span>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between rounded-xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm">
            <p className="text-sm text-slate-500">
              Sayfa {currentPage} / {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Önceki
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="rounded-lg bg-[#00365a] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#004170] disabled:cursor-not-allowed disabled:opacity-50"
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