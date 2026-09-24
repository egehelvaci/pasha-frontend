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

  const inputClassName =
    'w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition hover:border-slate-400 focus:border-[#00365a] focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15';

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f7f8fa]">
        <div className="mx-auto max-w-[1600px] px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
          <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-light tracking-[0.08em] text-neutral-900 sm:text-3xl sm:tracking-[0.12em]">
                Sipariş Oluştur
              </h1>
              <div className="mt-3 h-px w-[min(100%,20rem)] bg-neutral-300 sm:mt-4" />
              <p className="mt-3 text-sm text-slate-500">
                Sipariş bilgilerinizi kontrol edin ve siparişinizi oluşturun.
              </p>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200/80 bg-white shadow-sm">
            <div className="flex flex-col items-center justify-center gap-3 py-16">
              <div className="h-9 w-9 animate-spin rounded-full border-2 border-slate-200 border-t-[#00365a]" />
              <p className="text-sm text-slate-500">Yükleniyor...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!cartData || cartData.items.length === 0) {
    return (
      <div className="min-h-screen bg-[#f7f8fa]">
        <div className="mx-auto max-w-[1600px] px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
          <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-light tracking-[0.08em] text-neutral-900 sm:text-3xl sm:tracking-[0.12em]">
                Sipariş Oluştur
              </h1>
              <div className="mt-3 h-px w-[min(100%,20rem)] bg-neutral-300 sm:mt-4" />
              <p className="mt-3 text-sm text-slate-500">
                Sipariş bilgilerinizi kontrol edin ve siparişinizi oluşturun.
              </p>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200/80 bg-white shadow-sm">
            <div className="px-6 py-16 text-center">
              <h2 className="text-sm font-medium text-slate-900">Sepetiniz Boş</h2>
              <p className="mx-auto mt-1.5 max-w-md text-sm text-slate-500">
                Sipariş oluşturmak için sepetinizde ürün bulunmalıdır.
              </p>
              <button
                type="button"
                onClick={() => router.push('/dashboard/sepetim')}
                className="mt-6 inline-flex items-center justify-center rounded-lg bg-[#00365a] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#004170] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/25 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Sepete Dön
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <div className="mx-auto max-w-[1600px] px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-light tracking-[0.08em] text-neutral-900 sm:text-3xl sm:tracking-[0.12em]">
              Sipariş Oluştur
            </h1>
            <div className="mt-3 h-px w-[min(100%,20rem)] bg-neutral-300 sm:mt-4" />
            <p className="mt-3 text-sm text-slate-500">
              Sipariş bilgilerinizi kontrol edin ve siparişinizi oluşturun.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8">
          {/* Sol taraf - Sipariş Bilgileri */}
          <div className="space-y-6">
            {/* Limit Kontrolü */}
            <div className="rounded-xl border border-slate-200/80 bg-white shadow-sm">
              <div className="flex items-center justify-between gap-3 border-b border-slate-200/80 bg-slate-50/60 px-4 py-3 sm:px-5">
                <h2 className="text-sm font-semibold text-slate-900">Sipariş Durumu</h2>
              </div>
              <div className="p-4 sm:p-5">
                {checkingLimits ? (
                  <div className="flex flex-col items-center justify-center gap-3 py-8">
                    <div className="h-9 w-9 animate-spin rounded-full border-2 border-slate-200 border-t-[#00365a]" />
                    <p className="text-sm text-slate-500">Limit kontrolü yapılıyor...</p>
                  </div>
                ) : limitInfo ? (
                  <div
                    className={
                      limitInfo.canProceed
                        ? 'rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-sm text-emerald-700'
                        : 'rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-700'
                    }
                  >
                    <h3 className="text-sm font-medium text-slate-900">
                      {limitInfo.canProceed ? 'Sipariş Verilebilir' : 'Sipariş Verilemez'}
                    </h3>
                    <p className="mt-1.5">{formatLimitMessage(limitInfo.message)}</p>
                    {limitInfo.requiresPayment && (
                      <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-3 text-sm text-amber-700">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <p className="text-xs">
                            Sipariş verebilmek için önce ödeme yapmanız gerekmektedir.
                          </p>
                          <button
                            type="button"
                            onClick={() => router.push('/dashboard/odemeler')}
                            className="inline-flex shrink-0 items-center justify-center rounded-lg bg-[#00365a] px-4 py-2.5 text-xs font-medium text-white transition hover:bg-[#004170] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/25 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Ödeme Yap
                          </button>
                        </div>
                      </div>
                    )}
                    {user?.canSeePrice && (
                      <div className="mt-3 border-t border-slate-200/80 pt-3">
                        <p className="text-xs text-slate-600">
                          Sepet Tutarı:{' '}
                          <span className="font-medium tabular-nums text-slate-900">
                            {parseFloat(limitInfo.cartTotal).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}{' '}
                            {CURRENCY_SYMBOLS[userCurrency as keyof typeof CURRENCY_SYMBOLS] || userCurrency}
                          </span>
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="rounded-lg border border-slate-200 bg-slate-50/60 px-3.5 py-3">
                    <p className="text-sm text-slate-500">Limit bilgisi yükleniyor...</p>
                  </div>
                )}
              </div>
            </div>

            {/* Teslimat Adresi Seçimi */}
            <div className="rounded-xl border border-slate-200/80 bg-white shadow-sm">
              <div className="flex items-center justify-between gap-3 border-b border-slate-200/80 bg-slate-50/60 px-4 py-3 sm:px-5">
                <h2 className="text-sm font-semibold text-slate-900">Teslimat Adresi</h2>
              </div>
              <div className="p-4 sm:p-5">
                {addressesLoading ? (
                  <div className="rounded-lg border border-slate-200 bg-slate-50/60 px-3.5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-[#00365a]" />
                      <p className="text-sm text-slate-500">Adresler yükleniyor...</p>
                    </div>
                  </div>
                ) : storeAddresses.length > 0 ? (
                  <div className="space-y-4">
                    <div>
                      <div className="mb-1.5 flex items-center justify-between gap-3">
                        <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
                          Teslimat Adresi Seçin <span className="text-rose-500">*</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => setShowAddressModal(true)}
                          className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                        >
                          Yeni Adres Ekle
                        </button>
                      </div>

                      {/* Custom Dropdown */}
                      <div className="relative" ref={addressDropdownRef}>
                        <button
                          type="button"
                          onClick={() => setAddressDropdownOpen(!addressDropdownOpen)}
                          className={`relative ${inputClassName} pr-9 text-left`}
                        >
                          <span className={selectedAddressId ? 'font-medium text-slate-900' : 'text-slate-500'}>
                            {selectedAddressId
                              ? (() => {
                                  const selectedAddress = storeAddresses.find(
                                    (addr) => addr.id === selectedAddressId
                                  );
                                  return selectedAddress
                                    ? `${selectedAddress.title} - ${selectedAddress.address.substring(0, 50)}${selectedAddress.address.length > 50 ? '...' : ''}`
                                    : 'Teslimat adresi seçin';
                                })()
                              : 'Teslimat adresi seçin'}
                          </span>
                          <svg
                            className={`absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-transform ${addressDropdownOpen ? 'rotate-180' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>

                        {addressDropdownOpen && (
                          <div className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                            {storeAddresses.filter((addr) => addr.is_active).length > 0 ? (
                              <>
                                <div className="px-3 py-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                                  Kayıtlı Adresler
                                </div>
                                {storeAddresses
                                  .filter((addr) => addr.is_active)
                                  .map((addr) => (
                                    <button
                                      key={addr.id}
                                      type="button"
                                      onClick={() => {
                                        setSelectedAddressId(addr.id);
                                        setAddressDropdownOpen(false);
                                      }}
                                      className={`block w-full px-3 py-2 text-left text-sm transition-colors hover:bg-slate-50 ${
                                        selectedAddressId === addr.id
                                          ? 'bg-[#00365a]/[0.06] font-medium text-[#00365a]'
                                          : 'text-slate-700'
                                      }`}
                                    >
                                      <div className="flex items-center gap-2">
                                        <span>{addr.title}</span>
                                        {addr.is_default && (
                                          <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                                            Varsayılan
                                          </span>
                                        )}
                                      </div>
                                      <p className="mt-0.5 text-sm text-slate-600">{addr.address}</p>
                                      {(addr.city || addr.district) && (
                                        <p className="mt-0.5 text-xs text-slate-500">
                                          {addr.district && addr.district + ', '}
                                          {addr.city}
                                          {addr.postal_code && ' - ' + addr.postal_code}
                                        </p>
                                      )}
                                    </button>
                                  ))}
                              </>
                            ) : (
                              <div className="px-3 py-6 text-center">
                                <p className="text-sm font-medium text-slate-700">Henüz adres bulunamadı</p>
                                <p className="mt-1 text-xs text-slate-500">Yeni adres ekleyebilirsiniz</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {selectedAddressId && (
                      <div className="rounded-lg border border-sky-200 bg-sky-50 px-3.5 py-3 text-sm text-sky-700">
                        {(() => {
                          const selectedAddress = storeAddresses.find(
                            (addr) => addr.id === selectedAddressId
                          );
                          return selectedAddress ? (
                            <div>
                              <h4 className="text-sm font-medium text-slate-900">{selectedAddress.title}</h4>
                              <p className="mt-1">{selectedAddress.address}</p>
                              {(selectedAddress.city || selectedAddress.district) && (
                                <p className="mt-1 text-sm">
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
                  <div className="rounded-lg border border-sky-200 bg-sky-50 px-3.5 py-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="text-sm text-sky-700">
                        <p className="font-medium text-slate-900">Henüz adres bulunamadı</p>
                        <p className="mt-1 text-xs text-slate-500">
                          Sipariş verebilmek için önce bir adres eklemeniz gerekiyor
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowAddressModal(true)}
                        className="inline-flex shrink-0 items-center justify-center rounded-lg bg-[#00365a] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#004170] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/25 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Adres Ekle
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Sipariş Notları */}
            <div className="rounded-xl border border-slate-200/80 bg-white shadow-sm">
              <div className="flex items-center justify-between gap-3 border-b border-slate-200/80 bg-slate-50/60 px-4 py-3 sm:px-5">
                <h2 className="text-sm font-semibold text-slate-900">Sipariş Notları</h2>
              </div>
              <div className="p-4 sm:p-5">
                <textarea
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  placeholder="Sipariş ile ilgili özel notlarınızı buraya yazabilirsiniz..."
                  className={`${inputClassName} h-24 resize-none`}
                  maxLength={500}
                />
                <p className="mt-1.5 text-xs text-slate-500">{orderNotes.length}/500 karakter</p>
              </div>
            </div>
          </div>

          {/* Sağ taraf - Sepet Özeti */}
          <div className="space-y-6">
            {/* Sepet Özeti */}
            <div className="rounded-xl border border-slate-200/80 bg-white shadow-sm">
              <div className="flex items-center justify-between gap-3 border-b border-slate-200/80 bg-slate-50/60 px-4 py-3 sm:px-5">
                <h2 className="text-sm font-semibold text-slate-900">Sepet Özeti</h2>
                <span className="text-xs text-slate-500">{cartData.items.length} ürün</span>
              </div>

              <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
                {cartData.items.map((item) => {
                  const imageUrl =
                    item.product.productImage &&
                    item.product.productImage !== 'undefined' &&
                    item.product.productImage.trim() !== ''
                      ? item.product.productImage
                      : null;

                  return (
                    <div key={item.id} className="flex items-start gap-4 p-4 sm:p-5">
                      {imageUrl ? (
                        <OptimizedImage
                          src={imageUrl}
                          alt={item.product.name}
                          className="h-16 w-16 shrink-0 rounded-lg border border-slate-200 object-cover"
                          placeholder={
                            <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-slate-200 bg-slate-50" />
                          }
                          onError={() => {}}
                        />
                      ) : (
                        <div className="h-16 w-16 shrink-0 rounded-lg border border-slate-200 bg-slate-50" />
                      )}
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-sm font-medium text-slate-900">{item.product.name}</h3>
                        <p className="text-xs text-slate-500">{item.product.collection.name}</p>
                        <div className="mt-1 flex items-center gap-2">
                          <span className="text-xs text-slate-600">
                            {item.width}x{item.height} cm
                          </span>
                          <span className="text-xs text-slate-300">•</span>
                          <span className="text-xs text-slate-600">{translateCutType(item.cut_type)}</span>
                        </div>
                        {item.notes && (
                          <p className="mt-1 text-xs italic text-slate-500">{item.notes}</p>
                        )}
                        <div className="mt-2 flex items-center justify-between">
                          <span className="text-sm text-slate-600">Adet: {item.quantity}</span>
                          {user?.canSeePrice && (
                            <span className="text-right text-sm font-medium tabular-nums text-slate-900">
                              {parseFloat(item.total_price).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}{' '}
                              {CURRENCY_SYMBOLS[userCurrency as keyof typeof CURRENCY_SYMBOLS] || userCurrency}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="border-t border-slate-200/80 p-4 sm:p-5">
                {user?.canSeePrice ? (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-900">Toplam:</span>
                    <span className="text-right text-lg font-semibold tabular-nums text-[#00365a]">
                      {parseFloat(cartData.totalPrice).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}{' '}
                      {CURRENCY_SYMBOLS[userCurrency as keyof typeof CURRENCY_SYMBOLS] || userCurrency}
                    </span>
                  </div>
                ) : (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-3 text-sm text-amber-700">
                    <p className="font-medium text-slate-900">Fiyat Görme Yetkiniz Bulunmamaktadır</p>
                    <p className="mt-1 text-sm">Sipariş tutarını görmeden de sipariş verebilirsiniz.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Sipariş Ver Butonu */}
            <div className="rounded-xl border border-slate-200/80 bg-white shadow-sm p-4 sm:p-5">
              <button
                type="button"
                onClick={handleSubmitOrder}
                disabled={submitting || !limitInfo?.canProceed || !selectedAddressId}
                className="inline-flex w-full items-center justify-center rounded-lg bg-[#00365a] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#004170] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/25 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? 'Sipariş Oluşturuluyor...' : 'Siparişi Onayla'}
              </button>

              {(!limitInfo?.canProceed || !selectedAddressId) && (
                <p className="mt-1.5 text-center text-xs text-rose-600">
                  {!selectedAddressId ? 'Lütfen teslimat adresi seçin' : 'Sipariş durumunu kontrol edin'}
                </p>
              )}
            </div>

            {/* Sipariş Süreci */}
            <div className="rounded-xl border border-slate-200/80 bg-white shadow-sm">
              <div className="flex items-center justify-between gap-3 border-b border-slate-200/80 bg-slate-50/60 px-4 py-3 sm:px-5">
                <h3 className="text-sm font-semibold text-slate-900">Sipariş Süreci</h3>
              </div>
              <div className="space-y-3 p-4 sm:p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-emerald-200/50 bg-emerald-50 text-sm font-medium text-emerald-700">
                    1
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">Onay</p>
                    <p className="text-xs text-slate-500">Siparişiniz alınır ve onaylanır</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-sm font-medium text-slate-600">
                    2
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">Hazırlık</p>
                    <p className="text-xs text-slate-500">Ürünleriniz hazırlanır ve paketlenir</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-sm font-medium text-slate-600">
                    3
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">Teslimat</p>
                    <p className="text-xs text-slate-500">Ürünleriniz adresinize teslim edilir</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Yeni Adres Ekleme Modal */}
      {showAddressModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="flex max-h-[92vh] w-full max-w-md flex-col rounded-xl border border-slate-200/80 bg-white shadow-lg">
            <div className="flex items-start justify-between gap-4 rounded-t-xl border-b border-slate-200/80 px-5 py-4">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Yeni Teslimat Adresi Ekle</h3>
                <p className="mt-0.5 text-xs text-slate-500">Bu adres sipariş teslimatı için kullanılacaktır</p>
              </div>
              <button
                type="button"
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
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-[#00365a] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15"
                aria-label="Kapat"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                    Adres Başlığı <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newAddress.title}
                    onChange={(e) => setNewAddress((prev) => ({ ...prev, title: e.target.value }))}
                    placeholder="Örn: Ana Mağaza, Depo, Şube 1"
                    className={inputClassName}
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                    Tam Adres <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    value={newAddress.address}
                    onChange={(e) => setNewAddress((prev) => ({ ...prev, address: e.target.value }))}
                    placeholder="Sokak, cadde, mahalle, bina no vs."
                    rows={3}
                    className={inputClassName}
                    required
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">İlçe</label>
                  <input
                    type="text"
                    value={newAddress.district}
                    onChange={(e) => setNewAddress((prev) => ({ ...prev, district: e.target.value }))}
                    placeholder="Örn: Kadıköy"
                    className={inputClassName}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">Şehir</label>
                  <input
                    type="text"
                    value={newAddress.city}
                    onChange={(e) => setNewAddress((prev) => ({ ...prev, city: e.target.value }))}
                    placeholder="Örn: İstanbul"
                    className={inputClassName}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">Posta Kodu</label>
                  <input
                    type="text"
                    value={newAddress.postal_code}
                    onChange={(e) => setNewAddress((prev) => ({ ...prev, postal_code: e.target.value }))}
                    placeholder="Örn: 34710"
                    className={inputClassName}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50/60 p-3">
                    <input
                      type="checkbox"
                      checked={newAddress.is_default}
                      onChange={(e) => setNewAddress((prev) => ({ ...prev, is_default: e.target.checked }))}
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#00365a] focus:ring-[#00365a]/20"
                    />
                    <span className="text-sm text-slate-700">Varsayılan adres olarak ayarla</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 rounded-b-xl border-t border-slate-200/80 bg-slate-50/60 px-5 py-3.5">
              <button
                type="button"
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
                className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={handleAddNewAddress}
                disabled={addingAddress || !newAddress.title || !newAddress.address}
                className="inline-flex items-center justify-center rounded-lg bg-[#00365a] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#004170] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/25 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {addingAddress ? 'Ekleniyor...' : 'Adres Ekle'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SiparisOlustur;