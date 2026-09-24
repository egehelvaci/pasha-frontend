"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';
import { processPayment, PaymentRequest, getMyStoreInfo } from '../../../services/api';

// Currency sembollerini tanımla
const CURRENCY_SYMBOLS = {
  'TRY': '₺',
  'USD': '$',
  'EUR': '€'
};

// Available currencies for payment
const AVAILABLE_CURRENCIES = [
  { value: 'TRY', label: 'TRY (₺)', symbol: '₺' },
  { value: 'USD', label: 'USD ($)', symbol: '$' }
];

interface Payment {
  id: string;
  sellerReference: string;
  apiReferenceNumber: string;
  amount: number;
  description: string;
  status: 'COMPLETED' | 'FAILED';
  paymentDate: string;
  octetPaymentId: string;
  createdAt: string;
  updatedAt: string;
  store_currency?: string;        // 🆕 Mağaza para birimi
  payment_currency?: string;      // 🆕 Ödeme para birimi
  exchange_rate?: number;         // 🆕 Döviz kuru
  original_amount?: number;       // 🆕 Orijinal ödeme tutarı
  converted_amount?: number;      // 🆕 Dönüştürülmüş tutar (mağaza currency'sine)
  store: {
    store_id: string;
    kurum_adi: string;
    vergi_numarasi?: string;
    telefon?: string;
    eposta?: string;
  };
}

interface Store {
  store_id: string;
  kurum_adi: string;
  vergi_numarasi: string;
  vergi_dairesi: string;
  yetkili_adi: string;
  yetkili_soyadi: string;
  telefon: string;
  eposta: string;
  adres: string;
  faks_numarasi: string;
  aciklama: string;
  tckn: string;
  limitsiz_acik_hesap: boolean;
  acik_hesap_tutari: number;
  bakiye: number;
  maksimum_taksit: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface PaginationInfo {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

interface PaymentSummary {
  completedCount: number;
  failedCount: number;
  totalAmount: number;
  successRate: number;
  tryPayments?: {
    count: number;
    totalAmount: number;
  };
  usdPayments?: {
    count: number;
    totalAmount: number;
  };
}

const statusLabels = {
  COMPLETED: 'Başarılı',
  FAILED: 'Başarısız'
};

const statusColors = {
  COMPLETED: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  FAILED: 'border-rose-200 bg-rose-50 text-rose-700'
};

export default function PaymentsPage() {
  const { user, token, isAdmin, isAdminOrEditor } = useAuth();
  const router = useRouter();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedStoreFilter, setSelectedStoreFilter] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [summary, setSummary] = useState<PaymentSummary | null>(null);
  const itemsPerPage = 20;
  
  // Currency state
  const [userCurrency, setUserCurrency] = useState<string>('TRY');

  // Custom dropdown state'leri
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [storeDropdownOpen, setStoreDropdownOpen] = useState(false);
  const [paymentStoreDropdownOpen, setPaymentStoreDropdownOpen] = useState(false);
  const [paymentCurrencyDropdownOpen, setPaymentCurrencyDropdownOpen] = useState(false);

  // Ödeme formu state'leri
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    description: '',
    storeId: '',
    currency: 'TRY'
  });


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
          setPaymentForm(prev => ({ ...prev, currency: storedCurrency }));
        } else {
          // User'ın store bilgisinden currency'yi al
          if (user?.store?.currency) {
            setUserCurrency(user.store.currency);
            setPaymentForm(prev => ({ ...prev, currency: user.store?.currency || 'TRY' }));
          }
        }
      } catch (error) {
        console.error('Currency okuma hatası:', error);
      }
    }
  }, [user]);

  // Modal açık/kapalı durumunda body scroll kontrolü
  useEffect(() => {
    if (paymentModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    // Cleanup function - component unmount olduğunda veya modal kapandığında
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [paymentModalOpen]);

  useEffect(() => {
    if (!user) {
      router.push('/');
      return;
    }
    fetchPayments();
    initializeStores();
  }, [user, router, isAdminOrEditor, currentPage, statusFilter, selectedStoreFilter, startDate, endDate]);

  // Dropdown'ların dışına tıklandığında kapanması
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.dropdown-container')) {
        setStatusDropdownOpen(false);
        setStoreDropdownOpen(false);
        setPaymentStoreDropdownOpen(false);
        setPaymentCurrencyDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);



  const initializeStores = async () => {
    if (isAdminOrEditor) {
      // Admin ve Editör için API'den mağazaları çek
      await fetchStores();
    } else {
      try {
        // Normal kullanıcı için my-store-payments endpoint'inden store_id'yi al
        const storeInfo = await getMyStoreInfo();
        if (storeInfo.store_id) {
          // Form'da mağaza ID'sini otomatik seç
          setPaymentForm(prev => ({ ...prev, storeId: storeInfo.store_id }));
        }
      } catch (error) {
        console.error('Mağaza bilgisi alınamadı:', error);
        // Fallback olarak localStorage'dan veya AuthContext'ten al
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          try {
            const userData = JSON.parse(storedUser);
            if (userData.store) {
              setStores([userData.store]);
              setPaymentForm(prev => ({ ...prev, storeId: userData.store.store_id }));
            }
          } catch (parseError) {
            console.error('localStorage parse hatası:', parseError);
            // Son fallback olarak AuthContext'ten al
            if (user?.store) {
              setStores([user.store]);
              setPaymentForm(prev => ({ ...prev, storeId: user.store!.store_id }));
            }
          }
        } else if (user?.store) {
          setStores([user.store]);
          setPaymentForm(prev => ({ ...prev, storeId: user.store!.store_id }));
        }
      }
    }
  };

  const fetchStores = async () => {
    try {
      if (!token) {
        console.error('Token bulunamadı');
        return;
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'https://pashahomeapps.up.railway.app'}/api/stores`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`API Hatası: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success && data.data) {
        // Mağazaları alfabetik sıraya göre sırala
        const sortedStores = [...data.data].sort((a, b) => 
          a.kurum_adi.localeCompare(b.kurum_adi, 'tr', { sensitivity: 'base' })
        );
        setStores(sortedStores);
      } else {
        console.error('API başarı durumu false:', data);
        throw new Error(data.message || 'Mağazalar getirilemedi');
      }
    } catch (error) {
      console.error('Mağazalar getirilemedi:', error);
      // Admin için hata durumunda boş liste göster
      setStores([]);
    }
  };

  const fetchPayments = async () => {
    try {
      setLoading(true);
      setError("");

      if (!token) {
        router.push('/');
        return;
      }

      // API URL'i belirleme
              const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://pashahomeapps.up.railway.app';
      let apiUrl = '';
      
      if (isAdminOrEditor) {
        apiUrl = `${baseUrl}/api/admin/payments`;
      } else {
        apiUrl = `${baseUrl}/api/payments/my-store-payments`;
      }

      // Query parametrelerini oluşturma
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
        sortBy: 'createdAt',
        sortOrder: 'desc'
      });

      if (statusFilter) {
        params.append('status', statusFilter);
      }

      if (selectedStoreFilter && isAdminOrEditor) {
        params.append('storeId', selectedStoreFilter);
      }

      if (startDate) {
        params.append('startDate', startDate);
      }

      if (endDate) {
        params.append('endDate', endDate);
      }

      const response = await fetch(`${apiUrl}?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/');
          return;
        }
        throw new Error(`API Hatası: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success && data.data) {
        setPayments(data.data.payments || []);
        setPagination(data.data.pagination);
        setSummary(data.data.summary);
      } else {
        throw new Error(data.message || 'Ödemeler getirilemedi');
      }
    } catch (error: any) {
      console.error('Ödeme verileri alınırken hata:', error);
      setError(error.message || 'Bir hata oluştu');
      
      // Hata durumunda boş liste ve örnek pagination/summary
      setPayments([]);
      setPagination({
        page: currentPage,
        limit: itemsPerPage,
        totalCount: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false
      });
      setSummary({
        completedCount: 0,
        failedCount: 0,
        totalAmount: 0,
        successRate: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Form validasyonu
      if (!paymentForm.storeId || !paymentForm.amount) {
        alert('Lütfen mağaza ve tutar alanlarını doldurun!');
        return;
      }

      const amount = parseFloat(paymentForm.amount);
      if (isNaN(amount) || amount <= 0) {
        alert('Lütfen geçerli bir tutar girin!');
        return;
      }

      const paymentRequest: PaymentRequest = {
        storeId: paymentForm.storeId,
        amount: amount,
        ...(paymentForm.description.trim() && { aciklama: paymentForm.description.trim() }),
        currencyCode: paymentForm.currency
      };

      // API çağrısı yap
      const response = await processPayment(paymentRequest);
      
      if (response.success && response.data) {
        // Ödeme URL'ini yeni sekmede aç
        window.open(response.data.paymentUrl, '_blank');
        
        // Başarı mesajı göster
        const displayCurrency = response.data.currencyCode || paymentForm.currency;
        const displayAmount = response.data.convertedAmount || response.data.amount;
        
        let message = `Ödeme sayfası açıldı! 
Tutar: ${displayAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ${CURRENCY_SYMBOLS[displayCurrency as keyof typeof CURRENCY_SYMBOLS] || displayCurrency}`;
        
        // Döviz çevrimi varsa bilgi göster
        if (response.data.convertedAmount && response.data.exchangeRate) {
          message += `
Orijinal Tutar: ${response.data.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ${paymentForm.currency}
Döviz Kuru: ${response.data.exchangeRate.toLocaleString('tr-TR', { minimumFractionDigits: 4 })}`;
        }
        
        alert(message);
        
        setPaymentModalOpen(false);
        
        // Formu temizle
        setPaymentForm(prev => ({
          amount: '',
          description: '',
          storeId: isAdminOrEditor ? '' : prev.storeId, // Admin veya Editor değilse store_id'yi koru
          currency: prev.currency // Currency'yi koru
        }));
        
        // Ödemeleri yeniden yükle
        fetchPayments();
      } else {
        throw new Error(response.message || 'Ödeme işlemi başlatılamadı');
      }
    } catch (error: any) {
      console.error('Ödeme işlenirken hata:', error);
      alert(`Ödeme işlenirken bir hata oluştu: ${error.message}`);
    }
  };

  const handleViewDetails = (payment: Payment) => {
    setSelectedPayment(payment);
    setModalOpen(true);
  };

  const handlePrintPayment = (payment: Payment) => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Ödeme Detayı - ${payment.sellerReference}</title>
            <meta charset="utf-8">
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body { 
                font-family: Arial, sans-serif; 
                line-height: 1.4; 
                color: #000; 
                max-width: 800px; 
                margin: 0 auto; 
                padding: 20px;
                background: white;
              }
              .header { 
                text-align: center; 
                border-bottom: 2px solid #000; 
                padding-bottom: 20px; 
                margin-bottom: 30px; 
              }
              .header h1 { 
                font-size: 24px; 
                margin-bottom: 10px; 
                color: #000; 
                font-weight: bold;
              }
              .section { 
                margin-bottom: 25px; 
                padding: 15px; 
                border: 1px solid #000; 
              }
              .section h3 { 
                font-size: 16px; 
                margin-bottom: 15px; 
                color: #000; 
                border-bottom: 1px solid #000; 
                padding-bottom: 8px; 
                font-weight: bold;
              }
              .info-item { 
                display: flex; 
                justify-content: space-between; 
                padding: 8px 0;
                border-bottom: 1px dotted #ccc;
              }
              .info-item:last-child {
                border-bottom: none;
              }
              .info-item strong { 
                color: #000; 
                font-weight: bold;
              }
              .status-COMPLETED { 
                background: #f0f0f0; 
                color: #000; 
                padding: 4px 8px; 
                border: 1px solid #000;
                font-weight: bold;
              }
              .status-FAILED { 
                background: #e5e5e5; 
                color: #000; 
                padding: 4px 8px; 
                border: 1px solid #000;
                font-weight: bold;
              }
              .amount {
                font-size: 18px;
                font-weight: bold;
                color: #000;
              }
              .footer { 
                margin-top: 30px; 
                text-align: center; 
                font-size: 12px; 
                color: #000; 
                border-top: 1px solid #000; 
                padding-top: 15px; 
              }
              @media print {
                body { font-size: 12px; }
                .section { break-inside: avoid; }
                .no-print { display: none; }
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>ÖDEME DETAYI</h1>
              <p>Satıcı Referansı: <strong>${payment.sellerReference}</strong></p>
              <p>API Referansı: <strong>${payment.apiReferenceNumber}</strong></p>
              <p>Tarih: <strong>${new Date(payment.paymentDate || payment.createdAt).toLocaleDateString('tr-TR', {
                year: 'numeric',
                month: 'long', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}</strong></p>
            </div>

            <div class="section">
              <h3>İşlem Bilgileri</h3>
              <div class="info-item">
                <span><strong>Durum:</strong></span>
                <span class="status-${payment.status}">${statusLabels[payment.status]}</span>
              </div>
              <div class="info-item">
                <span><strong>Tutar:</strong></span>
                <span class="amount">${payment.original_amount && payment.payment_currency 
                  ? `${payment.original_amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ${payment.payment_currency}` 
                  : `${payment.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ${CURRENCY_SYMBOLS[userCurrency as keyof typeof CURRENCY_SYMBOLS] || userCurrency}`
                }</span>
              </div>
              <div class="info-item">
                <span><strong>Octet Ödeme ID:</strong></span>
                <span style="font-family: monospace; font-size: 12px;">${payment.octetPaymentId}</span>
              </div>
            </div>

            <div class="section">
              <h3>Mağaza Bilgileri</h3>
              <div class="info-item">
                <span><strong>Mağaza:</strong></span>
                <span>${payment.store.kurum_adi}</span>
              </div>
              ${payment.store.vergi_numarasi ? `
                <div class="info-item">
                  <span><strong>Vergi Numarası:</strong></span>
                  <span>${payment.store.vergi_numarasi}</span>
                </div>
              ` : ''}
              ${payment.store.telefon ? `
                <div class="info-item">
                  <span><strong>Telefon:</strong></span>
                  <span>${payment.store.telefon}</span>
                </div>
              ` : ''}
              ${payment.store.eposta ? `
                <div class="info-item">
                  <span><strong>E-posta:</strong></span>
                  <span>${payment.store.eposta}</span>
                </div>
              ` : ''}
            </div>

            <div class="section">
              <h3>Açıklama</h3>
              <p style="padding: 10px 0; line-height: 1.6;">${payment.description}</p>
            </div>

            <div class="footer">
              <p>Bu belge ${new Date().toLocaleDateString('tr-TR')} tarihinde oluşturulmuştur.</p>
              <p>Ödeme takibi için lütfen referans numaranızı saklayınız.</p>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  // Filtreleme
  const filteredPayments = payments.filter(payment => {
    const matchesSearch = searchTerm === "" || 
      payment.sellerReference.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.apiReferenceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.store.kurum_adi.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Tarih filtresi
    let matchesDateRange = true;
    if (startDate || endDate) {
      const paymentDate = new Date(payment.paymentDate || payment.createdAt);
      if (startDate) {
        const start = new Date(startDate);
        matchesDateRange = matchesDateRange && paymentDate >= start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999); // Gün sonuna kadar dahil et
        matchesDateRange = matchesDateRange && paymentDate <= end;
      }
    }
    
    return matchesSearch && matchesDateRange;
  });

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const handleFilterChange = () => {
    setCurrentPage(1); // Filtre değiştiğinde ilk sayfaya dön
  };

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#f7f8fa]">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-slate-200 border-t-[#00365a]" />
        <p className="text-sm text-slate-500">Ödeme verileri yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <div className="mx-auto max-w-[1600px] px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-light tracking-[0.08em] text-neutral-900 sm:text-3xl sm:tracking-[0.12em]">
              Ödeme Geçmişi
            </h1>
            <div className="mt-3 h-px w-[min(100%,20rem)] bg-neutral-300 sm:mt-4" />
            <p className="mt-3 text-sm text-slate-500">Geçmiş ödeme işlemlerini görüntüleyin ve takip edin</p>
          </div>
          <button
            type="button"
            onClick={() => setPaymentModalOpen(true)}
            className="inline-flex shrink-0 items-center justify-center rounded-lg bg-[#00365a] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#004170] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/25 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Yeni Ödeme
          </button>
        </div>

        {summary && (
          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Başarılı Ödemeler</p>
              <p className="mt-2 text-2xl font-light text-slate-900 tabular-nums">{summary.completedCount}</p>
            </div>

            <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Başarısız Ödemeler</p>
              <p className="mt-2 text-2xl font-light text-slate-900 tabular-nums">{summary.failedCount}</p>
            </div>

            {userCurrency === 'USD' && (summary.tryPayments || summary.usdPayments) ? (
              <>
                <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">TRY Ödemeler</p>
                  <p className="mt-2 text-2xl font-light text-slate-900 tabular-nums">
                    {summary.tryPayments?.totalAmount?.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) || '0,00'} ₺
                  </p>
                  <p className="mt-1 text-xs text-slate-500">{summary.tryPayments?.count || 0} adet</p>
                </div>

                <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">USD Ödemeler</p>
                  <p className="mt-2 text-2xl font-light text-slate-900 tabular-nums">
                    ${summary.usdPayments?.totalAmount?.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) || '0.00'}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">{summary.usdPayments?.count || 0} adet</p>
                </div>
              </>
            ) : (
              <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Toplam Tutar</p>
                <p className="mt-2 text-2xl font-light text-slate-900 tabular-nums">
                  {summary.totalAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}{' '}
                  {CURRENCY_SYMBOLS[userCurrency as keyof typeof CURRENCY_SYMBOLS] || userCurrency}
                </p>
              </div>
            )}
          </div>
        )}

        <div className="mb-6 rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-6">
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">Arama</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Referans, mağaza..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-slate-50 py-2.5 pl-10 pr-3 text-sm text-slate-900 placeholder:text-slate-400 transition hover:border-slate-400 focus:border-[#00365a] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15"
                />
                <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                  <circle cx="11" cy="11" r="8"/>
                  <path d="M21 21l-4.35-4.35" strokeLinecap="round"/>
                </svg>
              </div>
            </div>
            <div className="dropdown-container">
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">Durum</label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
                  className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 pr-9 text-left text-sm text-slate-900 transition hover:border-slate-400 focus:border-[#00365a] focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15"
                >
                  <span className={statusFilter ? 'text-slate-900' : 'text-slate-500'}>
                    {statusFilter === "COMPLETED" && "Başarılı"}
                    {statusFilter === "FAILED" && "Başarısız"}
                    {!statusFilter && "Tüm Durumlar"}
                  </span>
                  <svg
                    className={`absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-transform ${statusDropdownOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.8}
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {statusDropdownOpen && (
                  <div className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                    <button
                      type="button"
                      className={`block w-full px-3 py-2 text-left text-sm transition-colors hover:bg-slate-50 ${
                        !statusFilter ? 'bg-[#00365a]/[0.06] font-medium text-[#00365a]' : 'text-slate-700'
                      }`}
                      onClick={() => {
                        setStatusFilter("");
                        setStatusDropdownOpen(false);
                        handleFilterChange();
                      }}
                    >
                      Tüm Durumlar
                    </button>
                    <button
                      type="button"
                      className={`block w-full px-3 py-2 text-left text-sm transition-colors hover:bg-slate-50 ${
                        statusFilter === "COMPLETED" ? 'bg-[#00365a]/[0.06] font-medium text-[#00365a]' : 'text-slate-700'
                      }`}
                      onClick={() => {
                        setStatusFilter("COMPLETED");
                        setStatusDropdownOpen(false);
                        handleFilterChange();
                      }}
                    >
                      Başarılı
                    </button>
                    <button
                      type="button"
                      className={`block w-full px-3 py-2 text-left text-sm transition-colors hover:bg-slate-50 ${
                        statusFilter === "FAILED" ? 'bg-[#00365a]/[0.06] font-medium text-[#00365a]' : 'text-slate-700'
                      }`}
                      onClick={() => {
                        setStatusFilter("FAILED");
                        setStatusDropdownOpen(false);
                        handleFilterChange();
                      }}
                    >
                      Başarısız
                    </button>
                  </div>
                )}
              </div>
            </div>
            {isAdminOrEditor && (
              <div className="dropdown-container">
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">Mağaza</label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setStoreDropdownOpen(!storeDropdownOpen)}
                    className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 pr-9 text-left text-sm text-slate-900 transition hover:border-slate-400 focus:border-[#00365a] focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15"
                  >
                    <span className={selectedStoreFilter ? 'text-slate-900' : 'text-slate-500'}>
                      {selectedStoreFilter 
                        ? stores.find(store => store.store_id === selectedStoreFilter)?.kurum_adi || "Mağaza Seçin"
                        : "Tüm Mağazalar"
                      }
                    </span>
                    <svg
                      className={`absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-transform ${storeDropdownOpen ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.8}
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  {storeDropdownOpen && (
                    <div className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                      <button
                        type="button"
                        className={`block w-full px-3 py-2 text-left text-sm transition-colors hover:bg-slate-50 ${
                          !selectedStoreFilter ? 'bg-[#00365a]/[0.06] font-medium text-[#00365a]' : 'text-slate-700'
                        }`}
                        onClick={() => {
                          setSelectedStoreFilter("");
                          setStoreDropdownOpen(false);
                          handleFilterChange();
                        }}
                      >
                        Tüm Mağazalar
                      </button>
                      {[...stores].sort((a, b) => a.kurum_adi.localeCompare(b.kurum_adi, 'tr', { sensitivity: 'base' })).map((store) => (
                        <button
                          key={store.store_id}
                          type="button"
                          className={`block w-full px-3 py-2 text-left text-sm transition-colors hover:bg-slate-50 ${
                            selectedStoreFilter === store.store_id ? 'bg-[#00365a]/[0.06] font-medium text-[#00365a]' : 'text-slate-700'
                          }`}
                          onClick={() => {
                            setSelectedStoreFilter(store.store_id);
                            setStoreDropdownOpen(false);
                            handleFilterChange();
                          }}
                        >
                          {store.kurum_adi}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">Başlangıç</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  handleFilterChange();
                }}
                className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 transition hover:border-slate-400 focus:border-[#00365a] focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">Bitiş</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  handleFilterChange();
                }}
                className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 transition hover:border-slate-400 focus:border-[#00365a] focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15"
              />
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("");
                  setSelectedStoreFilter("");
                  setStartDate("");
                  setEndDate("");
                  setCurrentPage(1);
                }}
                className="inline-flex w-full items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15 md:w-auto"
              >
                Temizle
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-700">
            <p className="font-medium text-rose-800">Hata Oluştu</p>
            <p className="mt-1">{error}</p>
          </div>
        )}

        <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200/80 bg-slate-50/60 px-4 py-3 sm:px-5">
            <h3 className="text-sm font-semibold text-slate-900">Ödeme Listesi</h3>
            {pagination ? (
              <span className="text-xs text-slate-500">{pagination.totalCount} kayıt</span>
            ) : null}
          </div>
          <div className="w-full overflow-x-auto">
            <table className="w-full">
                <thead className="bg-slate-50/60">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                      Referans No
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                      Durum
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-500">
                      Tutar
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                      Mağaza
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                      Açıklama
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                      Tarih
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-500">
                      İşlemler
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payments.map((payment) => (
                    <tr key={payment.id} className="transition-colors hover:bg-slate-50/70">
                      <td className="whitespace-nowrap px-4 py-3">
                        <div className="text-sm font-medium text-slate-900">{payment.sellerReference}</div>
                        <div className="mt-0.5 font-mono text-xs text-slate-500">{payment.apiReferenceNumber}</div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusColors[payment.status]}`}>
                          {statusLabels[payment.status]}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-medium tabular-nums text-slate-900">
                        {payment.original_amount && payment.payment_currency 
                          ? `${payment.original_amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ${payment.payment_currency}`
                          : `${payment.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ${CURRENCY_SYMBOLS[userCurrency as keyof typeof CURRENCY_SYMBOLS] || userCurrency}`
                        }
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <div className="text-sm font-medium text-slate-900">{payment.store.kurum_adi}</div>
                        {isAdminOrEditor && payment.store.vergi_numarasi && (
                          <div className="mt-0.5 text-xs text-slate-500">{payment.store.vergi_numarasi}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="truncate text-sm text-slate-700" style={{ maxWidth: '250px' }} title={payment.description}>
                          {payment.description}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">
                        {new Date(payment.paymentDate || payment.createdAt).toLocaleDateString('tr-TR', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleViewDetails(payment)}
                            className="inline-flex items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15"
                          >
                            <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            <span>Detay</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePrintPayment(payment)}
                            className="inline-flex items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15"
                          >
                            <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                            </svg>
                            <span>Yazdır</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
          </div>

          {pagination && pagination.totalPages > 1 && (
            <div className="flex flex-col gap-4 border-t border-slate-200/80 bg-slate-50/60 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <span className="text-sm text-slate-500">
                Toplam {pagination.totalCount} kayıt, {((pagination.page - 1) * pagination.limit) + 1} -{' '}
                {Math.min(pagination.page * pagination.limit, pagination.totalCount)} arası gösteriliyor
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handlePageChange(Math.max(1, pagination.page - 1))}
                  disabled={!pagination.hasPrev}
                  className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Önceki
                </button>
                <span className="text-sm text-slate-500">
                  {pagination.page} / {pagination.totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => handlePageChange(Math.min(pagination.totalPages, pagination.page + 1))}
                  disabled={!pagination.hasNext}
                  className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Sonraki
                </button>
              </div>
            </div>
          )}
        </div>

        {payments.length === 0 && !loading && (
          <div className="mt-6 overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm px-6 py-16 text-center">
            <h3 className="text-sm font-medium text-slate-900">Ödeme Bulunamadı</h3>
            <p className="mx-auto mt-1.5 max-w-md text-sm text-slate-500">Arama kriterlerinize uygun ödeme kaydı bulunmamaktadır.</p>
          </div>
        )}

        {modalOpen && selectedPayment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
            <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-lg">
              <div className="flex items-start justify-between gap-3 border-b border-slate-200/80 px-5 py-4">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Ödeme Detayları</h3>
                  <p className="mt-0.5 text-xs text-slate-500">{selectedPayment.sellerReference}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-[#00365a] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15"
                  aria-label="Kapat"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="overflow-y-auto px-5 py-5">
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900">İşlem Bilgileri</h4>
                    <dl className="mt-3 space-y-3 text-sm">
                      <div className="flex justify-between gap-4">
                        <dt className="text-slate-500">Durum</dt>
                        <dd>
                          <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusColors[selectedPayment.status]}`}>
                            {statusLabels[selectedPayment.status]}
                          </span>
                        </dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className="text-slate-500">Tutar</dt>
                        <dd className="font-medium tabular-nums text-slate-900">
                          {selectedPayment.original_amount && selectedPayment.payment_currency 
                            ? `${selectedPayment.original_amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ${selectedPayment.payment_currency}`
                            : `${selectedPayment.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ${CURRENCY_SYMBOLS[userCurrency as keyof typeof CURRENCY_SYMBOLS] || userCurrency}`
                          }
                        </dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className="text-slate-500">API Referansı</dt>
                        <dd className="font-mono text-xs text-slate-900">{selectedPayment.apiReferenceNumber}</dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className="text-slate-500">Octet Ödeme ID</dt>
                        <dd className="font-mono text-xs text-slate-900">{selectedPayment.octetPaymentId}</dd>
                      </div>
                    </dl>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-slate-900">Mağaza Bilgileri</h4>
                    <dl className="mt-3 space-y-3 text-sm">
                      <div className="flex justify-between gap-4">
                        <dt className="text-slate-500">Mağaza</dt>
                        <dd className="font-medium text-slate-900">{selectedPayment.store.kurum_adi}</dd>
                      </div>
                      {selectedPayment.store.vergi_numarasi && (
                        <div className="flex justify-between gap-4">
                          <dt className="text-slate-500">Vergi No</dt>
                          <dd className="text-slate-700">{selectedPayment.store.vergi_numarasi}</dd>
                        </div>
                      )}
                      {selectedPayment.store.telefon && (
                        <div className="flex justify-between gap-4">
                          <dt className="text-slate-500">Telefon</dt>
                          <dd className="text-slate-700">{selectedPayment.store.telefon}</dd>
                        </div>
                      )}
                      {selectedPayment.store.eposta && (
                        <div className="flex justify-between gap-4">
                          <dt className="text-slate-500">E-posta</dt>
                          <dd className="text-slate-700">{selectedPayment.store.eposta}</dd>
                        </div>
                      )}
                      <div className="flex justify-between gap-4">
                        <dt className="text-slate-500">Tarih</dt>
                        <dd className="text-slate-700">
                          {new Date(selectedPayment.paymentDate || selectedPayment.createdAt).toLocaleDateString('tr-TR', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </dd>
                      </div>
                    </dl>
                  </div>
                </div>

                <div className="mt-6">
                  <h4 className="text-sm font-semibold text-slate-900">Açıklama</h4>
                  <p className="mt-2 text-sm leading-relaxed text-slate-700">{selectedPayment.description}</p>
                </div>
              </div>

              <div className="flex flex-col gap-3 border-t border-slate-200/80 bg-slate-50/60 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-slate-500">
                  Ödeme ID: <span className="font-mono">{selectedPayment.id}</span>
                </p>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => handlePrintPayment(selectedPayment)}
                    className="inline-flex items-center justify-center rounded-lg bg-[#00365a] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#004170] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/25"
                  >
                    Yazdır
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15"
                  >
                    Kapat
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {paymentModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
            <div className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-lg">
              <div className="flex items-start justify-between gap-4 border-b border-slate-200/80 px-5 py-4">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Yeni Ödeme</h3>
                  <p className="mt-0.5 text-xs text-slate-500">Ödeme bilgilerini girin</p>
                </div>
                <button
                  type="button"
                  onClick={() => setPaymentModalOpen(false)}
                  aria-label="Kapat"
                  className="-mr-1 inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="overflow-y-auto px-5 py-5">
                <form id="payment-form" onSubmit={handlePaymentSubmit} className="space-y-5">
                  {isAdminOrEditor && (
                    <div className="dropdown-container">
                      <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                        <span className="text-rose-500">*</span> Mağaza
                      </label>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setPaymentStoreDropdownOpen(!paymentStoreDropdownOpen)}
                          className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 pr-9 text-left text-sm text-slate-900 transition hover:border-slate-400 focus:border-[#00365a] focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15"
                        >
                          <span className={paymentForm.storeId ? 'text-slate-900' : 'text-slate-500'}>
                            {paymentForm.storeId 
                              ? stores.find(store => store.store_id === paymentForm.storeId)?.kurum_adi + " - " + stores.find(store => store.store_id === paymentForm.storeId)?.vergi_numarasi
                              : "Mağaza Seçiniz"
                            }
                          </span>
                          <svg
                            className={`absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-transform ${paymentStoreDropdownOpen ? 'rotate-180' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={1.8}
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        
                        {paymentStoreDropdownOpen && (
                          <div className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                            <button
                              type="button"
                              className={`block w-full px-3 py-2 text-left text-sm transition-colors hover:bg-slate-50 ${
                                !paymentForm.storeId ? 'bg-[#00365a]/[0.06] font-medium text-[#00365a]' : 'text-slate-700'
                              }`}
                              onClick={() => {
                                setPaymentForm(prev => ({ ...prev, storeId: "" }));
                                setPaymentStoreDropdownOpen(false);
                              }}
                            >
                              Mağaza Seçiniz
                            </button>
                            {[...stores].sort((a, b) => a.kurum_adi.localeCompare(b.kurum_adi, 'tr', { sensitivity: 'base' })).map((store) => (
                              <button
                                key={store.store_id}
                                type="button"
                                className={`block w-full px-3 py-2 text-left text-sm transition-colors hover:bg-slate-50 ${
                                  paymentForm.storeId === store.store_id ? 'bg-[#00365a]/[0.06] font-medium text-[#00365a]' : 'text-slate-700'
                                }`}
                                onClick={() => {
                                  setPaymentForm(prev => ({ ...prev, storeId: store.store_id }));
                                  setPaymentStoreDropdownOpen(false);
                                }}
                              >
                                {store.kurum_adi} - {store.vergi_numarasi}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {!isAdminOrEditor && stores.length > 0 && (
                    <div>
                      <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                        Mağaza Bilgisi
                      </label>
                      <div className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-700">
                        {stores[0].kurum_adi}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                      <span className="text-rose-500">*</span> Ödenecek Tutar
                    </label>
                    <div className="flex gap-3">
                      <div className="relative flex-1">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={paymentForm.amount}
                          onChange={(e) => setPaymentForm(prev => ({ ...prev, amount: e.target.value }))}
                          onWheel={(e) => {
                            e.preventDefault();
                            e.currentTarget.blur();
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                              e.preventDefault();
                            }
                          }}
                          required
                          className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition hover:border-slate-400 focus:border-[#00365a] focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15"
                        />
                      </div>
                      
                      {userCurrency !== 'TRY' && (
                        <div className="dropdown-container relative" style={{minWidth: '120px'}}>
                          <button
                            type="button"
                            onClick={() => setPaymentCurrencyDropdownOpen(!paymentCurrencyDropdownOpen)}
                            className="flex w-full items-center justify-between rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-left text-sm text-slate-900 transition hover:border-slate-400 focus:border-[#00365a] focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15"
                          >
                            <span className="font-medium">{paymentForm.currency}</span>
                            <svg
                              className={`h-4 w-4 text-slate-400 transition-transform ${paymentCurrencyDropdownOpen ? 'rotate-180' : ''}`}
                              fill="none"
                              stroke="currentColor"
                              strokeWidth={1.8}
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                          
                          {paymentCurrencyDropdownOpen && (
                            <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                              {AVAILABLE_CURRENCIES.map((currency) => (
                                <button
                                  key={currency.value}
                                  type="button"
                                  className={`block w-full px-3 py-2 text-left text-sm transition-colors hover:bg-slate-50 ${
                                    paymentForm.currency === currency.value ? 'bg-[#00365a]/[0.06] font-medium text-[#00365a]' : 'text-slate-700'
                                  }`}
                                  onClick={() => {
                                    setPaymentForm(prev => ({ ...prev, currency: currency.value }));
                                    setPaymentCurrencyDropdownOpen(false);
                                  }}
                                >
                                  {currency.value}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                      
                      {userCurrency === 'TRY' && (
                        <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
                          <span className="text-sm font-medium text-slate-700">₺</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                      Ödeme Açıklaması <span className="normal-case tracking-normal text-slate-400">(Opsiyonel)</span>
                    </label>
                    <textarea
                      placeholder="Ödeme açıklamasını giriniz... (Boş bırakılabilir)"
                      value={paymentForm.description}
                      onChange={(e) => setPaymentForm(prev => ({ ...prev, description: e.target.value }))}
                      rows={4}
                      className="w-full resize-none rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition hover:border-slate-400 focus:border-[#00365a] focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15"
                    />
                  </div>
                </form>
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-200/80 bg-slate-50/60 px-5 py-3.5">
                <button
                  type="button"
                  onClick={() => setPaymentModalOpen(false)}
                  className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  form="payment-form"
                  className="inline-flex items-center justify-center rounded-lg bg-[#00365a] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#004170] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/25 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Ödeme Yap
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 