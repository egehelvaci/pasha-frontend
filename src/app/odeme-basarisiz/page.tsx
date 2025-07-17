'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface PaymentError {
  errorCode?: string;
  errorMessage?: string;
  amount?: string;
  orderId?: string;
  paymentMethod?: string;
  date?: string;
  retryAttempts?: string;
}

function OdemeBasarisizContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [paymentData, setPaymentData] = useState<PaymentError>({});
  const [countdown, setCountdown] = useState(15);

  useEffect(() => {
    // URL parametrelerinden hata bilgilerini al
    const errorCode = searchParams.get('errorCode');
    const errorMessage = searchParams.get('errorMessage');
    const amount = searchParams.get('amount');
    const orderId = searchParams.get('orderId');
    const paymentMethod = searchParams.get('paymentMethod');
    const retryAttempts = searchParams.get('retryAttempts');
    
    setPaymentData({
      errorCode: errorCode || undefined,
      errorMessage: errorMessage || 'Ödeme işlemi sırasında bir hata oluştu',
      amount: amount || undefined,
      orderId: orderId || undefined,
      paymentMethod: paymentMethod || undefined,
      retryAttempts: retryAttempts || undefined,
      date: new Date().toLocaleDateString('tr-TR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    });

    // 15 saniye sonra dashboard'a yönlendir
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

  const handleRetryPayment = () => {
    // Sepete veya ödeme sayfasına yönlendir
    if (paymentData.orderId) {
      router.push(`/dashboard/siparis-olustur?orderId=${paymentData.orderId}`);
    } else {
      router.push('/dashboard/sepetim');
    }
  };

  const getErrorTitle = (errorCode?: string) => {
    switch (errorCode) {
      case 'INSUFFICIENT_FUNDS':
        return 'Yetersiz Bakiye';
      case 'CARD_DECLINED':
        return 'Kart Reddedildi';
      case 'EXPIRED_CARD':
        return 'Kartın Süresi Dolmuş';
      case 'INVALID_CARD':
        return 'Geçersiz Kart Bilgileri';
      case 'SECURITY_ERROR':
        return 'Güvenlik Hatası';
      case 'NETWORK_ERROR':
        return 'Bağlantı Hatası';
      case 'TIMEOUT':
        return 'Zaman Aşımı';
      default:
        return 'Ödeme Başarısız';
    }
  };

  const getErrorDescription = (errorCode?: string) => {
    switch (errorCode) {
      case 'INSUFFICIENT_FUNDS':
        return 'Kartınızda yeterli bakiye bulunmuyor. Lütfen başka bir kart deneyin veya kartınıza yükleme yapın.';
      case 'CARD_DECLINED':
        return 'Bankanız işlemi onaylamadı. Lütfen bankanızla iletişime geçin veya başka bir kart deneyin.';
      case 'EXPIRED_CARD':
        return 'Kullandığınız kartın süresi dolmuş. Lütfen geçerli bir kart ile tekrar deneyin.';
      case 'INVALID_CARD':
        return 'Girdiğiniz kart bilgileri hatalı. Lütfen kart numarası, son kullanma tarihi ve CVV kodunu kontrol edin.';
      case 'SECURITY_ERROR':
        return '3D Secure doğrulaması başarısız oldu. Lütfen SMS şifrenizi doğru girdiğinizden emin olun.';
      case 'NETWORK_ERROR':
        return 'İnternet bağlantısında sorun yaşandı. Lütfen bağlantınızı kontrol edip tekrar deneyin.';
      case 'TIMEOUT':
        return 'İşlem zaman aşımına uğradı. Lütfen tekrar deneyin.';
      default:
        return 'Ödeme işlemi sırasında beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Ana Kart */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Başlık Alanı */}
          <div className="bg-gradient-to-r from-red-500 to-red-600 p-8 text-center">
            <div className="w-20 h-20 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">{getErrorTitle(paymentData.errorCode)}</h1>
            <p className="text-red-100">İşleminiz tamamlanamadı</p>
          </div>

          {/* İçerik Alanı */}
          <div className="p-8">
            {/* Hata Açıklaması */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-red-400 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h3 className="text-red-800 font-semibold mb-1">Hata Açıklaması</h3>
                  <p className="text-red-700 text-sm">
                    {getErrorDescription(paymentData.errorCode)}
                  </p>
                </div>
              </div>
            </div>

            {/* İşlem Bilgileri */}
            <div className="space-y-4 mb-8">
              {paymentData.amount && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 font-medium">İşlem Tutarı:</span>
                    <span className="text-lg font-bold text-gray-900">
                      {parseFloat(paymentData.amount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                    </span>
                  </div>
                </div>
              )}

              {paymentData.errorCode && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 font-medium">Hata Kodu:</span>
                    <span className="text-gray-900 font-mono text-sm">{paymentData.errorCode}</span>
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

              {paymentData.retryAttempts && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 font-medium">Deneme Sayısı:</span>
                    <span className="text-gray-900 font-medium">{paymentData.retryAttempts}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Çözüm Önerileri */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-blue-400 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h3 className="text-blue-800 font-semibold mb-2">Ne Yapabilirsiniz?</h3>
                  <ul className="text-blue-700 text-sm space-y-1">
                    <li>• Kart bilgilerinizi kontrol edip tekrar deneyin</li>
                    <li>• Farklı bir ödeme yöntemi kullanın</li>
                    <li>• Kartınızın limitini kontrol edin</li>
                    <li>• Bankanızla iletişime geçin</li>
                    <li>• Daha sonra tekrar deneyin</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Butonlar */}
            <div className="space-y-3">
              <button
                onClick={handleRetryPayment}
                className="w-full bg-[#00365a] hover:bg-[#004170] text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Tekrar Dene</span>
              </button>

              <Link
                href="/dashboard/sepetim"
                className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m6-8h.01M7 21a2 2 0 100-4 2 2 0 000 4zm10 0a2 2 0 100-4 2 2 0 000 4z" />
                </svg>
                <span>Sepetime Git</span>
              </Link>

              <Link
                href="/dashboard/odemeler"
                className="w-full bg-purple-500 hover:bg-purple-600 text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                <span>Ödeme Geçmişi</span>
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
            Sorununuz devam ediyorsa{' '}
            <Link href="/dashboard/ayarlar" className="text-[#00365a] hover:underline font-medium">
              müşteri hizmetleri ile iletişime geçin
            </Link>
          </p>
          <p className="text-xs text-gray-500 mt-2">
            Destek Hattı: 0850 XXX XX XX (7/24)
          </p>
        </div>
      </div>
    </div>
  );
}

export default function OdemeBasarisizPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-screen">Yükleniyor...</div>}>
      <OdemeBasarisizContent />
    </Suspense>
  );
} 