'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CreateStoreData, createStore } from '@/services/api';
import { useAuth } from '@/app/context/AuthContext';
import StoreTypeSelector, { StoreType } from '@/components/StoreTypeSelector';

// Mevcut para birimleri
const CURRENCIES = [
  { value: 'TRY', label: 'TRY (₺)', symbol: '₺' },
  { value: 'USD', label: 'USD ($)', symbol: '$' }
];

export default function AddStorePage() {
  const router = useRouter();
  const { isAdmin, isAdminOrEditor, token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [currencyDropdownOpen, setCurrencyDropdownOpen] = useState(false);
  const [formData, setFormData] = useState<CreateStoreData>({
    kurum_adi: '',
    vergi_numarasi: '',
    vergi_dairesi: '',
    yetkili_adi: '',
    yetkili_soyadi: '',
    tckn: '',
    telefon: '',
    eposta: '',
    faks_numarasi: '',
    aciklama: '',
    bakiye: 0,
    currency: 'TRY', // Varsayılan para birimi
    maksimum_taksit: 1,
    limitsiz_acik_hesap: false,
    acik_hesap_tutari: 0,
    store_type: undefined,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isAdminOrEditor) {
      router.push('/dashboard');
    }
  }, [isAdminOrEditor, router]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.currency-dropdown')) {
        setCurrencyDropdownOpen(false);
      }
    };

    if (currencyDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [currencyDropdownOpen]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Required fields
    if (!formData.kurum_adi.trim()) newErrors.kurum_adi = 'Kurum adı gereklidir';
    if (!formData.vergi_numarasi.trim()) newErrors.vergi_numarasi = 'Vergi numarası gereklidir';
    if (!formData.vergi_dairesi.trim()) newErrors.vergi_dairesi = 'Vergi dairesi gereklidir';
    if (!formData.yetkili_adi.trim()) newErrors.yetkili_adi = 'Yetkili adı gereklidir';
    if (!formData.yetkili_soyadi.trim()) newErrors.yetkili_soyadi = 'Yetkili soyadı gereklidir';
    if (!formData.telefon.trim()) newErrors.telefon = 'Telefon numarası gereklidir';
    if (!formData.eposta.trim()) newErrors.eposta = 'E-posta adresi gereklidir';
    if (!formData.tckn.trim()) newErrors.tckn = 'TCKN gereklidir';
    if (!formData.store_type) newErrors.store_type = 'Mağaza türü seçimi gereklidir';

    // TCKN validation
    if (formData.tckn && formData.tckn.length !== 11) {
      newErrors.tckn = 'TCKN 11 haneli olmalıdır';
    }
    if (formData.tckn && !/^[0-9]+$/.test(formData.tckn)) {
      newErrors.tckn = 'TCKN sadece sayılardan oluşmalıdır';
    }

    // Email validation
    if (formData.eposta && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.eposta)) {
      newErrors.eposta = 'Geçerli bir e-posta adresi giriniz';
    }

    // Financial validation
    if (!formData.limitsiz_acik_hesap && (!formData.acik_hesap_tutari || formData.acik_hesap_tutari < 0)) {
      newErrors.acik_hesap_tutari = 'Açık hesap limiti gereklidir';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof CreateStoreData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const onFinish = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      // Admin API endpoint'ini kullan
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'https://pashahomeapps.up.railway.app'}/api/admin/stores`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Mağaza oluşturulamadı');
      }

      const result = await response.json();
      if (result.success) {
        const storeId = result.data?.store_id;
        alert('Mağaza başarıyla oluşturuldu. Şimdi adres bilgilerini ekleyebilirsiniz.');
        
        // Yeni oluşturulan mağazanın adres yönetimi sayfasına yönlendir
        if (storeId) {
          router.push(`/dashboard/magazalar/${storeId}/adresler`);
        } else {
          // Store ID bulunamazsa mağazalar listesine git
          router.push('/dashboard/magazalar');
        }
      } else {
        throw new Error(result.message || 'Mağaza oluşturulamadı');
      }
    } catch (error: any) {
      alert(error.message || 'Mağaza oluşturulurken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  if (!isAdminOrEditor) {
  return (
      <div className="p-6 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center max-w-md">
          <div className="w-20 h-20 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="h-10 w-10 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-3">Erişim Reddedildi</h3>
          <p className="text-gray-600 mb-8 leading-relaxed">Bu sayfaya erişim yetkiniz bulunmamaktadır. Mağaza ekleme sadece admin ve editör kullanıcılar tarafından kullanılabilir.</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#00365a] hover:bg-[#004170] text-white rounded-lg font-semibold transition-all shadow-md hover:shadow-lg"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
            </svg>
            Dashboard'a Dön
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => router.push('/dashboard/magazalar')}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
              </svg>
            </button>
            <div>
              <h1 className="text-3xl font-bold text-[#00365a] flex items-center">
                Yeni Mağaza Ekle
              </h1>
              <p className="text-gray-600 mt-2">Mağaza bilgilerini doldurun</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Form Header */}
          <div className="px-6 py-4 border-b border-gray-200 bg-[#00365a]">
            <div className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="text-lg font-semibold text-white">Mağaza Bilgileri</h3>
            </div>
          </div>

          <form onSubmit={onFinish} className="p-6">
            <div className="space-y-8">
              {/* Temel Bilgiler */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-[#00365a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  Temel Bilgiler
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      <span className="text-red-500">*</span> Kurum Adı
                    </label>
                    <input
                      type="text"
                      value={formData.kurum_adi}
                      onChange={(e) => handleInputChange('kurum_adi', e.target.value)}
                      className={`w-full px-4 py-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#00365a] focus:border-transparent transition-all ${errors.kurum_adi ? 'border-red-300' : 'border-gray-300'}`}
                      placeholder="Örn: ABC Tekstil Ltd. Şti."
                    />
                    {errors.kurum_adi && <p className="mt-1 text-sm text-red-600">{errors.kurum_adi}</p>}
                  </div>

                  <div>
                    <StoreTypeSelector
                      value={formData.store_type || ''}
                      onChange={(value) => handleInputChange('store_type', value)}
                      required
                    />
                    {errors.store_type && <p className="mt-1 text-sm text-red-600">{errors.store_type}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      <span className="text-red-500">*</span> Vergi Numarası
                    </label>
                    <input
                      type="text"
                      value={formData.vergi_numarasi}
                      onChange={(e) => handleInputChange('vergi_numarasi', e.target.value)}
                      className={`w-full px-4 py-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#00365a] focus:border-transparent transition-all ${errors.vergi_numarasi ? 'border-red-300' : 'border-gray-300'}`}
                      placeholder="1234567890"
                    />
                    {errors.vergi_numarasi && <p className="mt-1 text-sm text-red-600">{errors.vergi_numarasi}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      <span className="text-red-500">*</span> Vergi Dairesi
                    </label>
                    <input
                      type="text"
                      value={formData.vergi_dairesi}
                      onChange={(e) => handleInputChange('vergi_dairesi', e.target.value)}
                      className={`w-full px-4 py-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#00365a] focus:border-transparent transition-all ${errors.vergi_dairesi ? 'border-red-300' : 'border-gray-300'}`}
                      placeholder="Örn: Kadıköy Vergi Dairesi"
                    />
                    {errors.vergi_dairesi && <p className="mt-1 text-sm text-red-600">{errors.vergi_dairesi}</p>}
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      Açıklama
                    </label>
                    <textarea
                      value={formData.aciklama}
                      onChange={(e) => handleInputChange('aciklama', e.target.value)}
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#00365a] focus:border-transparent transition-all resize-none"
                      placeholder="Mağaza hakkında ek bilgiler..."
                    />
                  </div>
                </div>
              </div>

              {/* Yetkili Bilgileri */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-[#00365a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Yetkili Bilgileri
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      <span className="text-red-500">*</span> Yetkili Adı
                    </label>
                    <input
                      type="text"
                      value={formData.yetkili_adi}
                      onChange={(e) => handleInputChange('yetkili_adi', e.target.value)}
                      className={`w-full px-4 py-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#00365a] focus:border-transparent transition-all ${errors.yetkili_adi ? 'border-red-300' : 'border-gray-300'}`}
                      placeholder="İsim"
                    />
                    {errors.yetkili_adi && <p className="mt-1 text-sm text-red-600">{errors.yetkili_adi}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      <span className="text-red-500">*</span> Yetkili Soyadı
                    </label>
                    <input
                      type="text"
                      value={formData.yetkili_soyadi}
                      onChange={(e) => handleInputChange('yetkili_soyadi', e.target.value)}
                      className={`w-full px-4 py-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#00365a] focus:border-transparent transition-all ${errors.yetkili_soyadi ? 'border-red-300' : 'border-gray-300'}`}
                      placeholder="Soyisim"
                    />
                    {errors.yetkili_soyadi && <p className="mt-1 text-sm text-red-600">{errors.yetkili_soyadi}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      <span className="text-red-500">*</span> TCKN
                    </label>
                    <input
                      type="text"
                      maxLength={11}
                      value={formData.tckn}
                      onChange={(e) => handleInputChange('tckn', e.target.value.replace(/[^0-9]/g, ''))}
                      className={`w-full px-4 py-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#00365a] focus:border-transparent transition-all ${errors.tckn ? 'border-red-300' : 'border-gray-300'}`}
                      placeholder="12345678901"
                    />
                    {errors.tckn && <p className="mt-1 text-sm text-red-600">{errors.tckn}</p>}
                  </div>
                </div>
              </div>

              {/* İletişim Bilgileri */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-[#00365a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  İletişim Bilgileri
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      <span className="text-red-500">*</span> Telefon
                    </label>
                    <input
                      type="tel"
                      value={formData.telefon}
                      onChange={(e) => handleInputChange('telefon', e.target.value)}
                      className={`w-full px-4 py-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#00365a] focus:border-transparent transition-all ${errors.telefon ? 'border-red-300' : 'border-gray-300'}`}
                      placeholder="05XX XXX XX XX"
                    />
                    {errors.telefon && <p className="mt-1 text-sm text-red-600">{errors.telefon}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      <span className="text-red-500">*</span> E-posta
                    </label>
                    <input
                      type="email"
                      value={formData.eposta}
                      onChange={(e) => handleInputChange('eposta', e.target.value)}
                      className={`w-full px-4 py-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#00365a] focus:border-transparent transition-all ${errors.eposta ? 'border-red-300' : 'border-gray-300'}`}
                      placeholder="info@example.com"
                    />
                    {errors.eposta && <p className="mt-1 text-sm text-red-600">{errors.eposta}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      Faks Numarası
                    </label>
                    <input
                      type="tel"
                      value={formData.faks_numarasi}
                      onChange={(e) => handleInputChange('faks_numarasi', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#00365a] focus:border-transparent transition-all"
                      placeholder="05XX XXX XX XX"
                    />
                  </div>
                </div>
              </div>

              {/* Finansal Bilgiler */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-[#00365a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                  Finansal Bilgiler
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="relative">
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      <span className="text-red-500">*</span> Para Birimi
                    </label>
                    
                    {/* Custom Dropdown */}
                    <div className="relative currency-dropdown">
                      <button
                        type="button"
                        onClick={() => setCurrencyDropdownOpen(!currencyDropdownOpen)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#00365a] focus:border-transparent transition-all bg-white text-left flex items-center justify-between hover:border-gray-400"
                      >
                        <div className="flex items-center gap-3">
                          {/* Currency Flag/Icon */}
                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#00365a] to-[#004170] flex items-center justify-center text-white text-xs font-bold">
                            {formData.currency === 'TRY' ? '₺' : '$'}
                          </div>
                          
                          {/* Currency Info */}
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold text-gray-900">
                              {CURRENCIES.find(c => c.value === formData.currency)?.label || 'Para Birimi Seçin'}
                            </span>
                            <span className="text-xs text-gray-500">
                              {formData.currency || 'Seçim yapınız'}
                            </span>
                          </div>
                        </div>
                        
                        {/* Dropdown Arrow */}
                        <svg 
                          className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${currencyDropdownOpen ? 'rotate-180' : ''}`}
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      {/* Dropdown Menu */}
                      {currencyDropdownOpen && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden">
                          {CURRENCIES.map((currency) => (
                            <button
                              key={currency.value}
                              type="button"
                              onClick={() => {
                                handleInputChange('currency', currency.value);
                                setCurrencyDropdownOpen(false);
                              }}
                              className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center gap-3 ${
                                formData.currency === currency.value 
                                  ? 'bg-blue-50 border-l-4 border-[#00365a]' 
                                  : ''
                              }`}
                            >
                              {/* Currency Icon */}
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                                currency.value === 'TRY' 
                                  ? 'bg-gradient-to-br from-red-500 to-red-600' 
                                  : 'bg-gradient-to-br from-green-500 to-green-600'
                              }`}>
                                {currency.symbol}
                              </div>
                              
                              {/* Currency Details */}
                              <div className="flex-1">
                                <div className="text-sm font-semibold text-gray-900">
                                  {currency.label}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {currency.value} - {currency.symbol}
                                </div>
                              </div>
                              
                              {/* Selected Indicator */}
                              {formData.currency === currency.value && (
                                <div className="w-5 h-5 text-[#00365a]">
                                  <svg fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                </div>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <p className="mt-1 text-xs text-gray-500">Mağazanın kullanacağı para birimi</p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      <span className="text-red-500">*</span> Mağaza Bakiyesi ({CURRENCIES.find(c => c.value === formData.currency)?.symbol || '₺'})
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.bakiye}
                      onChange={(e) => handleInputChange('bakiye', parseFloat(e.target.value) || 0)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#00365a] focus:border-transparent transition-all"
                  placeholder="0.00"
                />
                    <p className="mt-1 text-xs text-gray-500">Mağazanın kullanabileceği mevcut bakiye tutarı</p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      <span className="text-red-500">*</span> Maksimum Taksit Sayısı
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="48"
                      value={formData.maksimum_taksit}
                      onChange={(e) => handleInputChange('maksimum_taksit', parseInt(e.target.value) || 1)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#00365a] focus:border-transparent transition-all"
                  placeholder="1"
                />
                    <p className="mt-1 text-xs text-gray-500">Mağazanın kullanabileceği maksimum taksit sayısı</p>
                  </div>

                  <div className="md:col-span-2">
                    <div className="flex items-center mb-4">
                      <input
                        type="checkbox"
                        id="limitsiz_acik_hesap"
                        checked={formData.limitsiz_acik_hesap}
                        onChange={(e) => handleInputChange('limitsiz_acik_hesap', e.target.checked)}
                        className="h-4 w-4 text-[#00365a] focus:ring-[#00365a] border-gray-300 rounded"
                      />
                      <label htmlFor="limitsiz_acik_hesap" className="ml-3 text-sm font-semibold text-gray-700">
                        Limitsiz Açık Hesap
                      </label>
                    </div>
                    <p className="text-xs text-gray-500 mb-4">Bu seçenek aktifse mağaza sınırsız açık hesap kullanabilir</p>
                    
                    {!formData.limitsiz_acik_hesap && (
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-3">
                          <span className="text-red-500">*</span> Açık Hesap Limiti ({CURRENCIES.find(c => c.value === formData.currency)?.symbol || '₺'})
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.acik_hesap_tutari}
                          onChange={(e) => handleInputChange('acik_hesap_tutari', parseFloat(e.target.value) || 0)}
                          className={`w-full px-4 py-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#00365a] focus:border-transparent transition-all ${errors.acik_hesap_tutari ? 'border-red-300' : 'border-gray-300'}`}
                          placeholder="0.00"
                        />
                        <p className="mt-1 text-xs text-gray-500">Mağazanın bakiyesi bittiğinde kullanabileceği açık hesap limiti</p>
                        {errors.acik_hesap_tutari && <p className="mt-1 text-sm text-red-600">{errors.acik_hesap_tutari}</p>}
                      </div>
                    )}
                  </div>
                </div>
            </div>

            {/* Bilgilendirme Kartı */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                <h4 className="text-sm font-semibold text-blue-800 mb-3 flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  💡 Ödeme Sistemi Bilgileri
                </h4>
                <div className="text-xs text-blue-700 space-y-2">
                  <div className="flex items-start">
                    <span className="font-semibold mr-2">Bakiye:</span>
                    <span>Mağazanın kullanabileceği para miktarı. Negatif değer borç anlamına gelir.</span>
                  </div>
                  <div className="flex items-start">
                    <span className="font-semibold mr-2">Sipariş:</span>
                    <span>Sipariş tutarları mağaza bakiyesinden düşülür.</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Form Footer */}
            <div className="flex justify-end gap-4 pt-8 border-t border-gray-200 mt-8">
              <button
                type="button"
                onClick={() => router.push('/dashboard/magazalar')}
                className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-semibold transition-all"
              >
                İptal
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-8 py-3 bg-[#00365a] hover:bg-[#004170] text-white rounded-lg font-semibold transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Oluşturuluyor...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Mağaza Oluştur
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 