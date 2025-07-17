'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface PaymentSuccess {
  transactionId?: string;
  amount?: string;
  orderId?: string;
  paymentMethod?: string;
  date?: string;
}

function OdemeBasariliContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [paymentData, setPaymentData] = useState<PaymentSuccess>({});
  const [countdown, setCountdown] = useState(10);

  useEffect(() => {
    // URL parametrelerinden ödeme bilgilerini al
    const transactionId = searchParams.get('transactionId');
    const amount = searchParams.get('amount');
    const orderId = searchParams.get('orderId');
    const paymentMethod = searchParams.get('paymentMethod');
    
    setPaymentData({
      transactionId: transactionId || undefined,
      amount: amount || undefined,
      orderId: orderId || undefined,
      paymentMethod: paymentMethod || undefined,
      date: new Date().toLocaleDateString('tr-TR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    });

    // 10 saniye sonra dashboard'a yönlendir
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          router.push('/dashboard');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [searchParams, router]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Ana Kart */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Başlık Alanı */}
          <div className="bg-gradient-to-r from-green-500 to-green-600 p-8 text-center">
            <div className="w-20 h-20 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Ödeme Başarılı!</h1>
            <p className="text-green-100">İşleminiz başarıyla tamamlandı</p>
          </div>

          {/* İçerik Alanı */}
          <div className="p-8">
            {/* Ödeme Bilgileri */}
            <div className="space-y-4 mb-8">
              {paymentData.amount && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 font-medium">Ödenen Tutar:</span>
                    <span className="text-2xl font-bold text-green-600">
                      {parseFloat(paymentData.amount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                    </span>
                  </div>
                </div>
              )}

              {paymentData.transactionId && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 font-medium">İşlem No:</span>
                    <span className="text-gray-900 font-mono text-sm">{paymentData.transactionId}</span>
                  </div>
                </div>
              )}

              {paymentData.orderId && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 font-medium">Sipariş No:</span>
                    <span className="text-gray-900 font-semibold">{paymentData.orderId}</span>
                  </div>
                </div>
              )}

              {paymentData.paymentMethod && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 font-medium">Ödeme Yöntemi:</span>
                    <span className="text-gray-900 font-medium">{paymentData.paymentMethod}</span>
                  </div>
                </div>
              )}

              {paymentData.date && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 font-medium">İşlem Tarihi:</span>
                    <span className="text-gray-900 font-medium">{paymentData.date}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Başarı Mesajı */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-green-400 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h3 className="text-green-800 font-semibold mb-1">Ödemeniz Başarıyla Alındı</h3>
                  <p className="text-green-700 text-sm">
                    İşleminiz güvenli bir şekilde gerçekleştirildi. Sipariş durumunu takip edebilirsiniz.
                  </p>
                </div>
              </div>
            </div>

            {/* Butonlar */}
            <div className="space-y-3">
              <button
                onClick={handlePrint}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                <span>Makbuzu Yazdır</span>
              </button>

              <Link
                href="/dashboard/siparisler"
                className="w-full bg-[#00365a] hover:bg-[#004170] text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <span>Siparişlerime Git</span>
              </Link>

              <Link
                href="/dashboard"
                className="w-full bg-gray-600 hover:bg-gray-700 text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                <span>Ana Sayfaya Dön</span>
              </Link>
            </div>

            {/* Otomatik Yönlendirme Bilgisi */}
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-500">
                {countdown} saniye sonra otomatik olarak ana sayfaya yönlendirileceksiniz
              </p>
            </div>
          </div>
        </div>

        {/* Alt Bilgi */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Herhangi bir sorun yaşarsanız{' '}
            <Link href="/dashboard/ayarlar" className="text-[#00365a] hover:underline font-medium">
              destek ekibimizle iletişime geçin
            </Link>
          </p>
        </div>
      </div>

      {/* Print Stilleri */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-area, .print-area * {
            visibility: visible;
          }
          .print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}

export default function OdemeBasariliPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-screen">Yükleniyor...</div>}>
      <OdemeBasariliContent />
    </Suspense>
  );
} 