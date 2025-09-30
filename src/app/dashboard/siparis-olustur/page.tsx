'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { useToken } from '@/app/hooks/useToken';
import { getMyProfile, UserProfileInfo, getStoreAddresses, StoreAddress, createStoreAddress, CreateStoreAddressRequest } from '@/services/api';
import OptimizedImage from '@/app/components/OptimizedImage';

// Currency sembollerini tanımla
const CURRENCY_SYMBOLS = {
  'TRY': '₺',
  'USD': '$',
  'EUR': '€'
};

// Kesim türlerini Türkçe'ye çeviren fonksiyon
const translateCutType = (cutType: string): string => {
  const cutTypeMap: { [key: string]: string } = {
    'straight': 'Düz Kesim',
    'rounded': 'Yuvarlak Kesim',
    'custom': 'Özel Kesim'
  };
  return cutTypeMap[cutType] || cutType;
};

interface CartItem {
  id: number;
  productId: string;
  quantity: number;
  width: string;
  height: string;
  area_m2: string;
  unit_price: string;
  total_price: string;
  has_fringe: boolean;
  cut_type: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  product: {
    productId: string;
    name: string;
    description: string;
    productImage: string;
    collection: {
      collectionId: string;
      name: string;
      code: string;
    };
    pricing: {
      price: number;
      currency: string;
    };
  };
}

interface CartData {
  items: CartItem[];
  totalPrice: string;
}

interface LimitCheckResult {
  canProceed: boolean;
  message: string;
  requiresPayment: boolean;
  cartTotal: string;
}

const SiparisOlustur: React.FC = () => {
  const router = useRouter();
  const { user, isEditor, isAdminOrEditor } = useAuth();
  const token = useToken();

  const [cartData, setCartData] = useState<CartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [limitInfo, setLimitInfo] = useState<LimitCheckResult | null>(null);
  const [checkingLimits, setCheckingLimits] = useState(false);
  const [orderNotes, setOrderNotes] = useState('');
  const [userProfile, setUserProfile] = useState<UserProfileInfo | null>(null);
  const [storeAddresses, setStoreAddresses] = useState<StoreAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [addressesLoading, setAddressesLoading] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [newAddress, setNewAddress] = useState<CreateStoreAddressRequest>({
    title: '',
    address: '',
    city: '',
    district: '',
    postal_code: '',
    is_default: false
  });
  const [addingAddress, setAddingAddress] = useState(false);
  
  // Editör için mağaza seçimi
  const [availableStores, setAvailableStores] = useState<any[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');
  const [selectedStoreProfile, setSelectedStoreProfile] = useState<UserProfileInfo | null>(null);
  const [loadingStores, setLoadingStores] = useState(false);
  
  // Currency state
  const [userCurrency, setUserCurrency] = useState<string>('TRY');
  
  // Custom dropdown states
  const [addressDropdownOpen, setAddressDropdownOpen] = useState(false);
  const addressDropdownRef = useRef<HTMLDivElement>(null);

  // Limit mesajını kullanıcı dostu hale getiren fonksiyon
  const formatLimitMessage = (message: string): string => {
    // Minimum ödeme tutarını çıkarmaya çalış
    const minPaymentMatch = message.match(/Minimum ödeme tutarı:\s*([\d.,]+)\s*TL/i);
    
    if (minPaymentMatch) {
      const minPaymentAmount = minPaymentMatch[1];
      const currencySymbol = CURRENCY_SYMBOLS[userCurrency as keyof typeof CURRENCY_SYMBOLS] || userCurrency;
      return `Sipariş verebilmek için minimum ${minPaymentAmount} ${currencySymbol} ödeme yapmanız gerekmektedir.`;
    }
    
    // Eğer minimum ödeme tutarı bulunamadıysa genel mesaj
    if (message.includes('yetersiz') || message.includes('ödeme')) {
      return 'Sipariş verebilmek için ödeme yapmanız gerekmektedir.';
    }
    
    return message;
  };

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

  // Currency bilgisini localStorage'dan al
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        // Currency bilgisini al
        const rememberMe = localStorage.getItem("rememberMe") === "true";
        let storedCurrency;
        
        if (rememberMe) {
          storedCurrency = localStorage.getItem("currency");
        } else {
          storedCurrency = sessionStorage.getItem("currency");
        }
        
        if (storedCurrency) {
          setUserCurrency(storedCurrency);
        } else {
          // User'ın store bilgisinden currency'yi al
          if (user?.store?.currency) {
            setUserCurrency(user.store.currency);
          }
        }
      } catch (error) {
        console.error('Currency okuma hatası:', error);
      }
    }
  }, [user]);

  // Click outside handler for address dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (addressDropdownRef.current && !addressDropdownRef.current.contains(event.target as Node)) {
        setAddressDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

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
      fetchStoreAddresses(); // Adres listesini de yükle
    }
  }, [token]);

  // Mağaza adreslerini getir
  const fetchStoreAddresses = async () => {
    try {
      setAddressesLoading(true);
      const response = await getStoreAddresses();
      if (response.success) {
        setStoreAddresses(response.data);
        // Varsayılan adresi otomatik seç
        const defaultAddress = response.data.find(addr => addr.is_default);
        if (defaultAddress) {
          setSelectedAddressId(defaultAddress.id);
        }
      }
    } catch (error) {
      console.error('Adres listesi getirme hatası:', error);
    } finally {
      setAddressesLoading(false);
    }
  };

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

  // Yeni adres ekleme
  const handleAddNewAddress = async () => {
    if (!newAddress.title || !newAddress.address) {
      alert('Lütfen adres başlığı ve tam adres bilgilerini giriniz.');
      return;
    }

    try {
      setAddingAddress(true);
      const response = await createStoreAddress(newAddress);
      if (response.success) {
        alert('Yeni adres başarıyla eklendi!');
        setShowAddressModal(false);
        setNewAddress({
          title: '',
          address: '',
          city: '',
          district: '',
          postal_code: '',
          is_default: false
        });
        // Adres listesini yenile
        await fetchStoreAddresses();
        // Yeni eklenen adresi seç
        if (response.data) {
          setSelectedAddressId(response.data.id);
        }
      }
    } catch (error: any) {
      alert(error.message || 'Adres eklenirken bir hata oluştu.');
    } finally {
      setAddingAddress(false);
    }
  };

  // Sipariş oluştur
  const handleSubmitOrder = async () => {
    if (!cartData || cartData.items.length === 0) {
      alert('Sepetiniz boş!');
      return;
    }

    // Adres seçim kontrolü
    if (!selectedAddressId) {
      alert('Lütfen bir teslimat adresi seçin!');
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

      // API dokümantasyonuna göre notes ve address_id gönderiyoruz
      const orderPayload = {
        notes: orderNotes.trim() || '',
        address_id: selectedAddressId
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
                    {formatLimitMessage(limitInfo.message)}
                  </p>
                  {limitInfo.requiresPayment && (
                    <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-yellow-800">
                          💳 Sipariş verebilmek için önce ödeme yapmanız gerekmektedir.
                        </p>
                        <button
                          onClick={() => router.push('/dashboard/odemeler')}
                          className="ml-3 px-4 py-2 bg-[#1e3a8a] text-white text-xs font-medium rounded-lg hover:bg-[#1e40af] transition-colors"
                        >
                          Ödeme Yap
                        </button>
                      </div>
                    </div>
                  )}
                  {user?.canSeePrice && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-xs text-gray-600">
                        Sepet Tutarı: <strong>{parseFloat(limitInfo.cartTotal).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {CURRENCY_SYMBOLS[userCurrency as keyof typeof CURRENCY_SYMBOLS] || userCurrency}</strong>
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <p className="text-sm text-gray-600">Limit bilgisi yükleniyor...</p>
                </div>
              )}
            </div>

            {/* Teslimat Adresi Seçimi */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Teslimat Adresi</h2>
              
              {addressesLoading ? (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-blue-600"></div>
                    <p className="text-sm text-gray-600">Adresler yükleniyor...</p>
                  </div>
                </div>
              ) : storeAddresses.length > 0 ? (
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Teslimat Adresi Seçin <span className="text-red-500">*</span>
                      </label>
                      <button
                        onClick={() => setShowAddressModal(true)}
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Yeni Adres Ekle
                      </button>
                    </div>
                    
                    {/* Custom Dropdown */}
                    <div className="relative" ref={addressDropdownRef}>
                      <button
                        type="button"
                        onClick={() => setAddressDropdownOpen(!addressDropdownOpen)}
                        className="w-full px-4 py-3 text-left bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-gray-400"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                            <span className={`${selectedAddressId ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
                              {selectedAddressId ? 
                                (() => {
                                  const selectedAddress = storeAddresses.find(addr => addr.id === selectedAddressId);
                                  return selectedAddress ? `${selectedAddress.title} - ${selectedAddress.address.substring(0, 50)}${selectedAddress.address.length > 50 ? '...' : ''}` : 'Teslimat adresi seçin';
                                })() 
                                : 'Teslimat adresi seçin'
                              }
                            </span>
                          </div>
                          <svg
                            className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${addressDropdownOpen ? 'rotate-180' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </button>

                      {/* Dropdown Options */}
                      {addressDropdownOpen && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                          {storeAddresses.filter(addr => addr.is_active).length > 0 ? (
                            <>
                              <div className="py-1">
                                <div className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide bg-gray-50">
                                  Kayıtlı Adresler
                                </div>
                              </div>
                              {storeAddresses
                                .filter(addr => addr.is_active)
                                .map((addr) => (
                                  <button
                                    key={addr.id}
                                    type="button"
                                    onClick={() => {
                                      setSelectedAddressId(addr.id);
                                      setAddressDropdownOpen(false);
                                    }}
                                    className={`w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-b-0 ${
                                      selectedAddressId === addr.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                                    }`}
                                  >
                                    <div className="flex items-start gap-3">
                                      <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                                        selectedAddressId === addr.id ? 'bg-blue-500' : 'bg-gray-300'
                                      }`}></div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                          <span className="text-sm font-medium text-gray-900">{addr.title}</span>
                                          {addr.is_default && (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                              Varsayılan
                                            </span>
                                          )}
                                        </div>
                                        <p className="text-sm text-gray-600 mt-1">{addr.address}</p>
                                        {(addr.city || addr.district) && (
                                          <p className="text-xs text-gray-500 mt-1">
                                            {addr.district && addr.district + ', '}
                                            {addr.city}
                                            {addr.postal_code && ' - ' + addr.postal_code}
                                          </p>
                                        )}
                                      </div>
                                      {selectedAddressId === addr.id && (
                                        <div className="flex-shrink-0">
                                          <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M9 16.17L5.53 12.7a.996.996 0 10-1.41 1.41L9 19l11-11a.996.996 0 10-1.41-1.41L9 16.17z"/>
                                          </svg>
                                        </div>
                                      )}
                                    </div>
                                  </button>
                                ))
                              }
                            </>
                          ) : (
                            <div className="px-4 py-6 text-center">
                              <div className="text-gray-400 mb-2">
                                <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                              </div>
                              <p className="text-sm text-gray-600 font-medium">Henüz adres bulunamadı</p>
                              <p className="text-xs text-gray-500 mt-1">Yeni adres ekleyebilirsiniz</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {selectedAddressId && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      {(() => {
                        const selectedAddress = storeAddresses.find(addr => addr.id === selectedAddressId);
                        return selectedAddress ? (
                          <div>
                            <h4 className="text-sm font-medium text-blue-900 mb-1">{selectedAddress.title}</h4>
                            <p className="text-sm text-blue-800">{selectedAddress.address}</p>
                            {(selectedAddress.city || selectedAddress.district) && (
                              <p className="text-sm text-blue-700 mt-1">
                                {selectedAddress.district && selectedAddress.district + ', '}
                                {selectedAddress.city}
                                {selectedAddress.postal_code && ' - ' + selectedAddress.postal_code}
                              </p>
                            )}
                          </div>
                        ) : null;
                      })()}
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-blue-800 font-medium">
                        Henüz adres bulunamadı
                      </p>
                      <p className="text-xs text-blue-600 mt-1">
                        Sipariş verebilmek için önce bir adres eklemeniz gerekiyor
                      </p>
                    </div>
                    <button
                      onClick={() => setShowAddressModal(true)}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm font-medium"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Adres Ekle
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Sipariş Notları */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Sipariş Notları</h2>
              <textarea
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                placeholder="Sipariş ile ilgili özel notlarınızı buraya yazabilirsiniz..."
                className="w-full h-24 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                maxLength={500}
              />
              <p className="text-xs text-gray-500 mt-2">
                {orderNotes.length}/500 karakter
              </p>
            </div>
          </div>

          {/* Sağ taraf - Sepet Özeti */}
          <div className="space-y-6">
            {/* Sepet Özeti */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Sepet Özeti</h2>
              
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {cartData.items.map((item) => {
                  const imageUrl = item.product.productImage && 
                                   item.product.productImage !== 'undefined' && 
                                   item.product.productImage.trim() !== '' 
                    ? item.product.productImage 
                    : null;
                  
                  return (
                    <div key={item.id} className="flex items-start space-x-4 pb-4 border-b border-gray-100 last:border-b-0">
                      {imageUrl ? (
                        <OptimizedImage
                          src={imageUrl}
                          alt={item.product.name}
                          className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                          placeholder={
                            <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center border border-gray-200">
                              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                          }
                          onError={() => {}}
                        />
                      ) : (
                        <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center border border-gray-200">
                          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-gray-900 truncate">{item.product.name}</h3>
                      <p className="text-xs text-gray-500">{item.product.collection.name}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-xs text-gray-600">
                          {item.width}x{item.height} cm
                        </span>
                        <span className="text-xs text-gray-400">•</span>
                        <span className="text-xs text-gray-600">
                          {translateCutType(item.cut_type)}
                        </span>
                      </div>
                      {item.notes && (
                        <p className="text-xs text-gray-500 mt-1 italic">{item.notes}</p>
                      )}
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-sm text-gray-600">Adet: {item.quantity}</span>
                        {user?.canSeePrice && (
                          <span className="text-sm font-medium text-gray-900">
                            {parseFloat(item.total_price).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {CURRENCY_SYMBOLS[userCurrency as keyof typeof CURRENCY_SYMBOLS] || userCurrency}
                          </span>
                        )}
                      </div>
                    </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 pt-4 border-t border-gray-200">
                {user?.canSeePrice ? (
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold text-gray-900">Toplam:</span>
                    <span className="text-xl font-bold text-blue-600">
                      {parseFloat(cartData.totalPrice).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {CURRENCY_SYMBOLS[userCurrency as keyof typeof CURRENCY_SYMBOLS] || userCurrency}
                    </span>
                  </div>
                ) : (
                  <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.664-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      <span className="text-yellow-800 font-medium">Fiyat Görme Yetkiniz Bulunmamaktadır</span>
                    </div>
                    <p className="text-yellow-700 text-sm mt-1">Sipariş tutarını görmeden de sipariş verebilirsiniz.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Sipariş Ver Butonu */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <button
                onClick={handleSubmitOrder}
                disabled={submitting || !limitInfo?.canProceed || !selectedAddressId}
                className={`w-full py-4 px-6 rounded-lg font-semibold text-lg transition-colors ${
                  submitting || !limitInfo?.canProceed || !selectedAddressId
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {submitting ? 'Sipariş Oluşturuluyor...' : 'Siparişi Onayla'}
              </button>
              
              {(!limitInfo?.canProceed || !selectedAddressId) && (
                <p className="text-sm text-red-600 mt-2 text-center">
                  {!selectedAddressId ? 'Lütfen teslimat adresi seçin' : 'Sipariş durumunu kontrol edin'}
                </p>
              )}
            </div>

            {/* Sipariş Süreci */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">📋 Sipariş Süreci</h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-sm font-medium">1</div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Onay</p>
                    <p className="text-xs text-gray-500">Siparişiniz alınır ve onaylanır</p>
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

      {/* Yeni Adres Ekleme Modal */}
      {showAddressModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full shadow-2xl">
            <div className="bg-[#00365a] text-white rounded-t-xl p-6">
              <h3 className="text-xl font-bold">Yeni Teslimat Adresi Ekle</h3>
              <p className="text-blue-100 text-sm mt-1">Bu adres sipariş teslimatı için kullanılacaktır</p>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Adres Başlığı <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newAddress.title}
                    onChange={(e) => setNewAddress(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Örn: Ana Mağaza, Depo, Şube 1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tam Adres <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={newAddress.address}
                    onChange={(e) => setNewAddress(prev => ({ ...prev, address: e.target.value }))}
                    placeholder="Sokak, cadde, mahalle, bina no vs."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">İlçe</label>
                  <input
                    type="text"
                    value={newAddress.district}
                    onChange={(e) => setNewAddress(prev => ({ ...prev, district: e.target.value }))}
                    placeholder="Örn: Kadıköy"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Şehir</label>
                  <input
                    type="text"
                    value={newAddress.city}
                    onChange={(e) => setNewAddress(prev => ({ ...prev, city: e.target.value }))}
                    placeholder="Örn: İstanbul"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Posta Kodu</label>
                  <input
                    type="text"
                    value={newAddress.postal_code}
                    onChange={(e) => setNewAddress(prev => ({ ...prev, postal_code: e.target.value }))}
                    placeholder="Örn: 34710"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div className="flex items-center">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={newAddress.is_default}
                      onChange={(e) => setNewAddress(prev => ({ ...prev, is_default: e.target.checked }))}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Varsayılan adres olarak ayarla</span>
                  </label>
                </div>
              </div>
              
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowAddressModal(false);
                    setNewAddress({
                      title: '',
                      address: '',
                      city: '',
                      district: '',
                      postal_code: '',
                      is_default: false
                    });
                  }}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  İptal
                </button>
                <button
                  onClick={handleAddNewAddress}
                  disabled={addingAddress || !newAddress.title || !newAddress.address}
                  className="px-6 py-2 bg-[#00365a] text-white rounded-lg hover:bg-[#004170] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {addingAddress ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      Ekleniyor...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Adres Ekle
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SiparisOlustur;