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
  const [notice, setNotice] = useState({ isOpen: false, title: '', message: '', isError: false, nextPath: '' });
  const showNotice = (message: string, isError = false, nextPath = '') => {
    setNotice({
      isOpen: true,
      title: isError ? 'İşlem tamamlanamadı' : 'İşlem tamamlandı',
      message,
      isError,
      nextPath,
    });
  };
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

  const inputBaseClass =
    'w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition hover:border-slate-400 focus:border-[#00365a] focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15';

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

    // Financial validation (yalnızca admin)
    if (isAdmin && !formData.limitsiz_acik_hesap && (!formData.acik_hesap_tutari || formData.acik_hesap_tutari < 0)) {
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
        body: JSON.stringify(
          isAdmin
            ? formData
            : (() => {
                const {
                  bakiye,
                  currency,
                  acik_hesap_tutari,
                  limitsiz_acik_hesap,
                  maksimum_taksit,
                  ...rest
                } = formData;
                return {
                  ...rest,
                  // Backend zorunlu alanlar için güvenli varsayılanlar
                  bakiye: 0,
                  currency: 'TRY',
                  acik_hesap_tutari: 0,
                  limitsiz_acik_hesap: false,
                  maksimum_taksit: 1,
                };
              })()
        ),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Mağaza oluşturulamadı');
      }

      const result = await response.json();
      if (result.success) {
        const storeId = result.data?.store_id;
        showNotice(
          'Mağaza başarıyla oluşturuldu. Şimdi adres bilgilerini ekleyebilirsiniz.',
          false,
          storeId ? `/dashboard/magazalar/${storeId}/adresler` : '/dashboard/magazalar'
        );
      } else {
        throw new Error(result.message || 'Mağaza oluşturulamadı');
      }
    } catch (error: any) {
      showNotice(error.message || 'Mağaza oluşturulurken bir hata oluştu', true);
    } finally {
      setLoading(false);
    }
  };

  if (!isAdminOrEditor) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f8fa] px-4">
        <div className="w-full max-w-md rounded-xl border border-slate-200/80 bg-white p-8 text-center shadow-sm">
          <h3 className="text-base font-semibold text-slate-900">Erişim Reddedildi</h3>
          <p className="mt-2 text-sm text-slate-500">
            Bu sayfaya erişim yetkiniz bulunmamaktadır. Mağaza ekleme sadece admin ve editör kullanıcılar tarafından kullanılabilir.
          </p>
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="mt-6 inline-flex items-center justify-center rounded-lg bg-[#00365a] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#004170] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/25"
          >
            Dashboard&apos;a Dön
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <div className="mx-auto max-w-[1120px] px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-light tracking-[0.08em] text-neutral-900 sm:text-3xl sm:tracking-[0.12em]">
              Yeni Mağaza Ekle
            </h1>
            <div className="mt-3 h-px w-[min(100%,20rem)] bg-neutral-300 sm:mt-4" />
            <p className="mt-3 text-sm text-slate-500">Mağaza bilgilerini doldurun</p>
          </div>
          <button
            type="button"
            onClick={() => router.push('/dashboard/magazalar')}
            className="inline-flex shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15"
          >
            Mağazalar
          </button>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 rounded-t-xl border-b border-slate-200/80 bg-slate-50/60 px-4 py-3 sm:px-5">
            <h2 className="text-sm font-semibold text-slate-900">Mağaza Bilgileri</h2>
            <span className="text-xs text-slate-500">Zorunlu alanlar * ile işaretlidir</span>
          </div>

          <form onSubmit={onFinish} className="p-4 sm:p-5">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Temel Bilgiler</h3>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                    Kurum Adı <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.kurum_adi}
                    onChange={(e) => handleInputChange('kurum_adi', e.target.value)}
                    className={`${inputBaseClass} ${errors.kurum_adi ? 'border-rose-300' : ''}`}
                    placeholder="Örn: ABC Tekstil Ltd. Şti."
                  />
                  {errors.kurum_adi && <p className="mt-1.5 text-xs text-rose-600">{errors.kurum_adi}</p>}
                </div>

                <div>
                  <StoreTypeSelector
                    value={formData.store_type || ''}
                    onChange={(value) => handleInputChange('store_type', value)}
                    required
                  />
                  {errors.store_type && <p className="mt-1.5 text-xs text-rose-600">{errors.store_type}</p>}
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                    Vergi Numarası <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.vergi_numarasi}
                    onChange={(e) => handleInputChange('vergi_numarasi', e.target.value)}
                    className={`${inputBaseClass} ${errors.vergi_numarasi ? 'border-rose-300' : ''}`}
                    placeholder="1234567890"
                  />
                  {errors.vergi_numarasi && <p className="mt-1.5 text-xs text-rose-600">{errors.vergi_numarasi}</p>}
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                    Vergi Dairesi <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.vergi_dairesi}
                    onChange={(e) => handleInputChange('vergi_dairesi', e.target.value)}
                    className={`${inputBaseClass} ${errors.vergi_dairesi ? 'border-rose-300' : ''}`}
                    placeholder="Örn: Kadıköy Vergi Dairesi"
                  />
                  {errors.vergi_dairesi && <p className="mt-1.5 text-xs text-rose-600">{errors.vergi_dairesi}</p>}
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                    Açıklama
                  </label>
                  <textarea
                    value={formData.aciklama}
                    onChange={(e) => handleInputChange('aciklama', e.target.value)}
                    rows={3}
                    className={`${inputBaseClass} resize-none`}
                    placeholder="Mağaza hakkında ek bilgiler..."
                  />
                </div>
              </div>
            </div>

            <div className="mt-5 border-t border-slate-200/80 pt-5">
              <h3 className="text-sm font-semibold text-slate-900">Yetkili Bilgileri</h3>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                    Yetkili Adı <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.yetkili_adi}
                    onChange={(e) => handleInputChange('yetkili_adi', e.target.value)}
                    className={`${inputBaseClass} ${errors.yetkili_adi ? 'border-rose-300' : ''}`}
                    placeholder="İsim"
                  />
                  {errors.yetkili_adi && <p className="mt-1.5 text-xs text-rose-600">{errors.yetkili_adi}</p>}
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                    Yetkili Soyadı <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.yetkili_soyadi}
                    onChange={(e) => handleInputChange('yetkili_soyadi', e.target.value)}
                    className={`${inputBaseClass} ${errors.yetkili_soyadi ? 'border-rose-300' : ''}`}
                    placeholder="Soyisim"
                  />
                  {errors.yetkili_soyadi && <p className="mt-1.5 text-xs text-rose-600">{errors.yetkili_soyadi}</p>}
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                    TCKN <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    maxLength={11}
                    value={formData.tckn}
                    onChange={(e) => handleInputChange('tckn', e.target.value.replace(/[^0-9]/g, ''))}
                    className={`${inputBaseClass} ${errors.tckn ? 'border-rose-300' : ''}`}
                    placeholder="12345678901"
                  />
                  {errors.tckn && <p className="mt-1.5 text-xs text-rose-600">{errors.tckn}</p>}
                </div>
              </div>
            </div>

            <div className="mt-5 border-t border-slate-200/80 pt-5">
              <h3 className="text-sm font-semibold text-slate-900">İletişim Bilgileri</h3>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                    Telefon <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={formData.telefon}
                    onChange={(e) => handleInputChange('telefon', e.target.value)}
                    className={`${inputBaseClass} ${errors.telefon ? 'border-rose-300' : ''}`}
                    placeholder="05XX XXX XX XX"
                  />
                  {errors.telefon && <p className="mt-1.5 text-xs text-rose-600">{errors.telefon}</p>}
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                    E-posta <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={formData.eposta}
                    onChange={(e) => handleInputChange('eposta', e.target.value)}
                    className={`${inputBaseClass} ${errors.eposta ? 'border-rose-300' : ''}`}
                    placeholder="info@example.com"
                  />
                  {errors.eposta && <p className="mt-1.5 text-xs text-rose-600">{errors.eposta}</p>}
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                    Faks Numarası
                  </label>
                  <input
                    type="tel"
                    value={formData.faks_numarasi}
                    onChange={(e) => handleInputChange('faks_numarasi', e.target.value)}
                    className={inputBaseClass}
                    placeholder="05XX XXX XX XX"
                  />
                </div>
              </div>
            </div>

            {isAdmin && (
              <>
                <div className="mt-5 border-t border-slate-200/80 pt-5">
                  <h3 className="text-sm font-semibold text-slate-900">Finansal Bilgiler</h3>
                  <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                        Para Birimi <span className="text-rose-500">*</span>
                      </label>

                      <div className="relative dropdown-container currency-dropdown">
                        <button
                          type="button"
                          onClick={() => setCurrencyDropdownOpen(!currencyDropdownOpen)}
                          className={`${inputBaseClass} relative pr-9 text-left`}
                        >
                          {CURRENCIES.find(c => c.value === formData.currency)?.label || 'Para Birimi Seçin'}
                          <svg
                            className={`absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-transform ${currencyDropdownOpen ? 'rotate-180' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>

                        {currencyDropdownOpen && (
                          <div className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                            {CURRENCIES.map((currency) => (
                              <button
                                key={currency.value}
                                type="button"
                                onClick={() => {
                                  handleInputChange('currency', currency.value);
                                  setCurrencyDropdownOpen(false);
                                }}
                                className={`block w-full px-3 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-slate-50 ${
                                  formData.currency === currency.value
                                    ? 'bg-[#00365a]/[0.06] font-medium text-[#00365a]'
                                    : ''
                                }`}
                              >
                                {currency.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      <p className="mt-1.5 text-xs text-slate-500">Mağazanın kullanacağı para birimi</p>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                        Mağaza Bakiyesi ({CURRENCIES.find(c => c.value === formData.currency)?.symbol || '₺'}){' '}
                        <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.bakiye}
                        onChange={(e) => handleInputChange('bakiye', parseFloat(e.target.value) || 0)}
                        className={inputBaseClass}
                        placeholder="0.00"
                      />
                      <p className="mt-1.5 text-xs text-slate-500">Mağazanın kullanabileceği mevcut bakiye tutarı</p>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                        Maksimum Taksit Sayısı <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="48"
                        value={formData.maksimum_taksit}
                        onChange={(e) => handleInputChange('maksimum_taksit', parseInt(e.target.value) || 1)}
                        className={inputBaseClass}
                        placeholder="1"
                      />
                      <p className="mt-1.5 text-xs text-slate-500">Mağazanın kullanabileceği maksimum taksit sayısı</p>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-slate-50/60 p-3">
                        <input
                          type="checkbox"
                          id="limitsiz_acik_hesap"
                          checked={formData.limitsiz_acik_hesap}
                          onChange={(e) => handleInputChange('limitsiz_acik_hesap', e.target.checked)}
                          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#00365a] focus:ring-[#00365a]/20"
                        />
                        <div>
                          <span className="text-sm font-medium text-slate-900">Limitsiz Açık Hesap</span>
                          <p className="mt-0.5 text-xs text-slate-500">
                            Bu seçenek aktifse mağaza sınırsız açık hesap kullanabilir
                          </p>
                        </div>
                      </label>

                      {!formData.limitsiz_acik_hesap && (
                        <div className="mt-4">
                          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                            Açık Hesap Limiti ({CURRENCIES.find(c => c.value === formData.currency)?.symbol || '₺'}){' '}
                            <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={formData.acik_hesap_tutari}
                            onChange={(e) => handleInputChange('acik_hesap_tutari', parseFloat(e.target.value) || 0)}
                            className={`${inputBaseClass} ${errors.acik_hesap_tutari ? 'border-rose-300' : ''}`}
                            placeholder="0.00"
                          />
                          <p className="mt-1.5 text-xs text-slate-500">
                            Mağazanın bakiyesi bittiğinde kullanabileceği açık hesap limiti
                          </p>
                          {errors.acik_hesap_tutari && (
                            <p className="mt-1.5 text-xs text-rose-600">{errors.acik_hesap_tutari}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-5 rounded-lg border border-sky-200 bg-sky-50 px-3.5 py-3 text-sm text-sky-700">
                  <p className="font-medium">💡 Ödeme Sistemi Bilgileri</p>
                  <div className="mt-2 space-y-2 text-xs">
                    <div>
                      <span className="font-semibold">Bakiye:</span>{' '}
                      Mağazanın kullanabileceği para miktarı. Negatif değer borç anlamına gelir.
                    </div>
                    <div>
                      <span className="font-semibold">Sipariş:</span> Sipariş tutarları mağaza bakiyesinden düşülür.
                    </div>
                  </div>
                </div>
              </>
            )}

            <div className="mt-6 flex flex-col-reverse gap-2 border-t border-slate-200/80 pt-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => router.push('/dashboard/magazalar')}
                className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15"
              >
                İptal
              </button>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center justify-center rounded-lg bg-[#00365a] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#004170] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/25 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? 'Oluşturuluyor...' : 'Mağaza Oluştur'}
              </button>
            </div>
          </form>
        </div>
        {notice.isOpen && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-md rounded-xl border border-slate-200/80 bg-white p-6">
              <h3 className="mb-3 text-lg font-semibold tracking-tight text-slate-900">{notice.title}</h3>
              <p className={`mb-6 text-sm ${notice.isError ? 'text-rose-700' : 'text-slate-500'}`}>{notice.message}</p>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    const nextPath = notice.nextPath;
                    setNotice((prev) => ({ ...prev, isOpen: false, nextPath: '' }));
                    if (nextPath) router.push(nextPath);
                  }}
                  className="rounded-lg bg-[#00365a] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#004170]"
                >
                  Tamam
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 