'use client';

import React, { useState } from 'react';
import { cancelOrder, CancelOrderResponse } from '@/services/api';
import { useAuth } from '@/app/context/AuthContext';

interface AdminOrderRefundProps {
  orderId: string;
  orderStatus: string;
  onRefundSuccess?: (response: CancelOrderResponse) => void;
  onRefundError?: (error: string) => void;
}

export default function AdminOrderRefund({ 
  orderId, 
  orderStatus,
  onRefundSuccess,
  onRefundError 
}: AdminOrderRefundProps) {
  const { isAdmin } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [reason, setReason] = useState('');

  // Sadece admin kullanıcılar görebilir
  if (!isAdmin) {
    return null;
  }

  // Sadece teslim edilmiş siparişler için iade butonu göster
  if (orderStatus !== 'DELIVERED') {
    return null;
  }

  const handleRefundOrder = async () => {
    if (!reason.trim()) {
      alert('Lütfen iade nedeni belirtin');
      return;
    }

    setIsLoading(true);
    try {
      const response = await cancelOrder(orderId, reason.trim());
      
      // Başarılı iade
      setShowModal(false);
      setReason('');
      
      if (onRefundSuccess) {
        onRefundSuccess(response);
      } else {
        alert(`✅ ${response.message}`);
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Sipariş iade edilirken bir hata oluştu';
      
      if (onRefundError) {
        onRefundError(errorMessage);
      } else {
        alert(`❌ ${errorMessage}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setReason('');
  };

  return (
    <>
      {/* İade Butonu */}
      <button
        onClick={() => setShowModal(true)}
        className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center gap-1"
        title="Siparişi İade Et"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.293l-3-3a1 1 0 00-1.414 1.414L10.586 9H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z" clipRule="evenodd" />
        </svg>
        İade Et
      </button>

      {/* İade Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Sipariş İade Et
              </h3>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                Sipariş ID: <span className="font-mono">{orderId}</span>
              </p>
              <p className="text-sm text-orange-600 bg-orange-50 p-2 rounded">
                ⚠️ Bu işlem geri alınamaz. Sipariş iade edildiğinde müşteri bakiyesi geri yüklenir ve ürünler stoka iade edilir.
              </p>
            </div>

            <div className="mb-4">
              <label htmlFor="refundReason" className="block text-sm font-medium text-gray-700 mb-2">
                İade Nedeni <span className="text-red-500">*</span>
              </label>
              <textarea
                id="refundReason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Örn: Müşteri talep etti - Ürün hasarlı gönderilmiş"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none"
                rows={3}
                maxLength={500}
                disabled={isLoading}
              />
              <p className="text-xs text-gray-500 mt-1">
                {reason.length}/500 karakter
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleCloseModal}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                disabled={isLoading}
              >
                Vazgeç
              </button>
              <button
                onClick={handleRefundOrder}
                disabled={isLoading || !reason.trim()}
                className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    İade Ediliyor...
                  </>
                ) : (
                  'Siparişi İade Et'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
