'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { useToken } from '@/app/hooks/useToken';
import { getMyProfile, UserProfileInfo } from '@/services/api';

interface CartItem {
  id: number;
  product: {
    productId: string;
    name: string;
    productImage: string;
    collection?: {
      name: string;
      code: string;
    };
  };
  quantity: number;
  unit_price: string;
  total_price: string;
  width: string;
  height: string;
  has_fringe: boolean;
  cut_type: string;
  notes?: string;
}

interface CartData {
  items: CartItem[];
  totalPrice: string;
  totalItems: number;
}

interface LimitCheckResult {
  canProceed: boolean;
  message: string;
  requiresPayment: boolean;
  cartTotal: string;
}

const SiparisOlustur = () => {
  const router = useRouter();
  const { user } = useAuth();
  const token = useToken();
  const [cartData, setCartData] = useState<CartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [limitInfo, setLimitInfo] = useState<LimitCheckResult | null>(null);
  const [checkingLimits, setCheckingLimits] = useState(false);
  const [orderNotes, setOrderNotes] = useState('');
  const [userProfile, setUserProfile] = useState<UserProfileInfo | null>(null);

  // Sepet verilerini getir
  useEffect(() => {
    const fetchCartData = async () => {
      try {
        setLoading(true);
        const authToken = token;
        if (!authToken) {
          router.push('/');
          return;
        }

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'https://pashahomeapps.up.railway.app'}/api/cart`, {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error('Sepet verisi alınamadı');
        }

        const data = await response.json();
        if (data.success) {
          setCartData(data.data);
          await performLimitCheck();
        } else {
          throw new Error(data.message || 'Sepet verisi alınamadı');
        }
      } catch (error) {
        router.push('/dashboard/sepetim');
      } finally {
        setLoading(false);
      }
    };

    fetchCartData();
  }, [router]);

  // Kullanıcı profil bilgilerini getir
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const profileData = await getMyProfile();
        setUserProfile(profileData.user);
      } catch (error) {
        console.error('Profil bilgileri alınamadı:', error);
      }
    };

    if (token) {
      fetchUserProfile();
    }
  }, [token]);

  // Sepet limitini kontrol et
  const performLimitCheck = async () => {
    try {
      setCheckingLimits(true);
      const authToken = token;
      if (!authToken) {
        router.push('/');
        return;
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'https://pashahomeapps.up.railway.app'}/api/orders/check-limits`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Limit kontrolü yapılamadı');
      }

      const data = await response.json();
      if (data.success) {
        setLimitInfo(data.data);
      } else {
        setLimitInfo({
          canProceed: false,
          message: data.message || 'Limit kontrolü başarısız',
          requiresPayment: false,
          cartTotal: '0'
        });
      }
    } catch (error) {
      console.error('Limit kontrolü hatası:', error);
      setLimitInfo({
        canProceed: false,
        message: 'Limit kontrolü yapılamadı',
        requiresPayment: false,
        cartTotal: '0'
      });
    } finally {
      setCheckingLimits(false);
    }
  };

  // Sipariş oluştur
  const handleSubmitOrder = async () => {
    if (!cartData || cartData.items.length === 0) {
      alert('Sepetiniz boş!');
      return;
    }

    // Adres kontrolü yap
    if (!userProfile?.adres || userProfile.adres.trim() === '') {
      if (confirm('Adres bilginiz eksik. Profil sayfasında adres bilginizi güncellemek ister misiniz?')) {
        router.push('/dashboard/ayarlar');
        return;
      }
      return;
    }

    // Limit kontrolü tekrar yap
    if (!limitInfo || !limitInfo.canProceed) {
      alert('Sipariş verilemez. Lütfen limit durumunuzu kontrol ediniz.');
      return;
    }

    setSubmitting(true);

    try {
      const authToken = token;
      if (!authToken) {
        router.push('/');
        return;
      }

      // API dokümantasyonuna göre sadece notes gönderiyoruz
      const orderPayload = {
        notes: orderNotes.trim() || ''
      };

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'https://pashahomeapps.up.railway.app'}/api/orders/create-from-cart`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(orderPayload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.requiresPayment) {
          alert('Ödeme yapmanız gerekmektedir.');
          return;
        }
        throw new Error(errorData.message || 'Sipariş oluşturulamadı');
      }

      const data = await response.json();
      if (data.success) {
        alert('Siparişiniz başarıyla oluşturuldu!');
        router.push('/dashboard/siparisler');
      } else {
        throw new Error(data.message || 'Sipariş oluşturulamadı');
      }
    } catch (error) {
      console.error('Sipariş oluşturulurken hata:', error);
      alert('Sipariş oluşturulurken bir hata oluştu. Lütfen tekrar deneyiniz.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!cartData || cartData.items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Sepetiniz Boş</h2>
          <p className="text-gray-600 mb-6">Sipariş oluşturmak için sepetinizde ürün bulunmalıdır.</p>
          <button
            onClick={() => router.push('/dashboard/sepetim')}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Sepete Dön
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Başlık */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Sipariş Oluştur</h1>
          <p className="text-gray-600">Sipariş bilgilerinizi kontrol edin ve siparişinizi oluşturun.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Sol taraf - Sipariş Bilgileri */}
          <div className="space-y-6">
            {/* Adres Uyarısı */}
            {userProfile && (!userProfile.adres || userProfile.adres.trim() === '') && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center">
                  <span className="text-2xl mr-2">⚠️</span>
                  <div>
                    <h3 className="text-yellow-800 font-semibold">Adres Bilgisi Eksik</h3>
                    <p className="text-yellow-700 text-sm">
                      Sipariş verebilmek için adres bilginizi güncellemeniz gerekmektedir.
                    </p>
                    <button
                      onClick={() => router.push('/dashboard/ayarlar')}
                      className="mt-2 text-yellow-800 hover:text-yellow-900 underline text-sm font-medium"
                    >
                      Profil ayarlarına git →
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Limit Kontrolü */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Sipariş Durumu</h2>
              
              {checkingLimits ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-2 text-gray-600">Limit kontrolü yapılıyor...</span>
                </div>
              ) : limitInfo ? (
                <div className={`border rounded-lg p-4 ${
                  limitInfo.canProceed 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-red-50 border-red-200'
                }`}>
                  <div className="flex items-center mb-2">
                    <span className="text-2xl mr-2">
                      {limitInfo.canProceed ? '✅' : '⚠️'}
                    </span>
                    <h3 className={`text-sm font-medium ${
                      limitInfo.canProceed 
                        ? 'text-green-900' 
                        : 'text-red-900'
                    }`}>
                      {limitInfo.canProceed ? 'Sipariş Verilebilir' : 'Sipariş Verilemez'}
                    </h3>
                  </div>
                  <p className={`text-sm ${
                    limitInfo.canProceed 
                      ? 'text-green-800' 
                      : 'text-red-800'
                  }`}>
                    {limitInfo.message}
                  </p>
                  {limitInfo.requiresPayment && (
                    <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                      <p className="text-xs text-yellow-800">
                        💳 Sipariş verebilmek için önce ödeme yapmanız gerekmektedir.
                      </p>
                    </div>
                  )}
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-xs text-gray-600">
                      Sepet Tutarı: <strong>{parseFloat(limitInfo.cartTotal).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</strong>
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <p className="text-sm text-gray-600">Limit bilgisi yükleniyor...</p>
                </div>
              )}
            </div>

            {/* Otomatik Bilgiler */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Otomatik Bilgiler</h2>
              
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-blue-900 mb-2">📍 Teslimat Adresi</h3>
                  <p className="text-sm text-blue-800">
                    Teslimat adresi mağaza bilgilerinizden otomatik olarak alınacaktır.
                  </p>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-green-900 mb-2">💳 Ödeme Bilgileri</h3>
                  <p className="text-sm text-green-800">
                    Ödeme mevcut açık hesap limitinizden otomatik olarak düşülecektir.
                  </p>
                </div>
              </div>
            </div>

            {/* Sipariş Notu */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Sipariş Notu</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Özel Talimatlar (Opsiyonel)
                </label>
                <textarea
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  rows={4}
                  placeholder="Sipariş ile ilgili özel talimatlarınızı, teslimat notlarınızı veya diğer önemli bilgileri giriniz..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  Bu alan opsiyoneldir. Boş bırakabilirsiniz.
                </p>
              </div>
            </div>
          </div>

          {/* Sağ taraf - Sipariş Özeti */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Sipariş Özeti</h2>
              
              <div className="space-y-4">
                {cartData.items.map((item) => (
                  <div key={item.id} className="flex items-center space-x-4 pb-4 border-b border-gray-200 last:border-b-0">
                    <img
                      src={item.product.productImage || '/placeholder-product.jpg'}
                      alt={item.product.name}
                      className="w-16 h-16 object-cover rounded-lg"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.onerror = null;
                        target.src = '/placeholder-product.jpg';
                      }}
                    />
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{item.product.name}</h3>
                      {item.product.collection && (
                        <p className="text-xs text-blue-600 mt-1">
                          {item.product.collection.name}
                        </p>
                      )}
                      <div className="mt-1 text-xs text-gray-500">
                        {item.width}×{item.height} cm
                        {item.has_fringe ? ', Saçaklı' : ', Saçaksız'}
                        {item.cut_type && `, ${item.cut_type.charAt(0).toUpperCase() + item.cut_type.slice(1)} Kesim`}
                      </div>
                      {item.notes && (
                        <div className="mt-1 text-xs text-gray-500 italic">
                          Not: {item.notes}
                        </div>
                      )}
                      <p className="text-sm text-gray-600 mt-1">
                        {item.quantity} adet × {parseFloat(item.unit_price).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">
                        {parseFloat(item.total_price).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600">Toplam Ürün:</span>
                  <span className="text-sm font-medium text-gray-900">{cartData.totalItems} adet</span>
                </div>
                <div className="flex justify-between items-center mb-4">
                  <span className="text-lg font-semibold text-gray-900">Toplam Tutar:</span>
                  <span className="text-xl font-bold text-blue-600">
                    {parseFloat(cartData.totalPrice).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                  </span>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={handleSubmitOrder}
                    disabled={submitting || !limitInfo || !limitInfo.canProceed}
                    className={`w-full py-3 px-6 rounded-lg font-medium transition-colors ${
                      !limitInfo || !limitInfo.canProceed
                        ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed'
                    }`}
                  >
                    {submitting ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Sipariş Oluşturuluyor...
                      </div>
                    ) : !limitInfo || !limitInfo.canProceed ? (
                      'Sipariş Verilemez'
                    ) : (
                      'Siparişi Onayla ve Oluştur'
                    )}
                  </button>

                  <button
                    onClick={() => router.push('/dashboard/sepetim')}
                    className="w-full bg-gray-100 text-gray-700 py-3 px-6 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                  >
                    Sepete Dön
                  </button>
                </div>
              </div>
            </div>

            {/* Sipariş Süreci Bilgileri */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Sipariş Süreci</h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">1</div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Sipariş Onayı</p>
                    <p className="text-xs text-gray-500">Siparişiniz sistem tarafından onaylanır</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">2</div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Hazırlık</p>
                    <p className="text-xs text-gray-500">Ürünleriniz hazırlanır ve paketlenir</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">3</div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Teslimat</p>
                    <p className="text-xs text-gray-500">Ürünleriniz adresinize teslim edilir</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SiparisOlustur; 