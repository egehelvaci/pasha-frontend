"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';
import { processPayment, PaymentRequest } from '../../../services/api';

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
}

const statusLabels = {
  COMPLETED: 'Başarılı',
  FAILED: 'Başarısız'
};

const statusColors = {
  COMPLETED: 'bg-green-100 text-green-800',
  FAILED: 'bg-red-100 text-red-800'
};

export default function PaymentsPage() {
  const { user, token, isAdmin } = useAuth();
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

  // Ödeme formu state'leri
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    description: '',
    storeId: ''
  });

  useEffect(() => {
    if (!user) {
      router.push('/');
      return;
    }
    fetchPayments();
    initializeStores();
  }, [user, router, isAdmin, currentPage, statusFilter, selectedStoreFilter, startDate, endDate]);

  const initializeStores = async () => {
    if (isAdmin) {
      // Admin için API'den mağazaları çek
      await fetchStores();
    } else if (user?.store) {
      // Normal kullanıcı için localStorage'dan mağaza bilgisini al
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          const userData = JSON.parse(storedUser);
          if (userData.store) {
            // Mağaza bilgisini stores state'ine ekle
            setStores([userData.store]);
            // Form'da mağazayı otomatik seç
            setPaymentForm(prev => ({ ...prev, storeId: userData.store.store_id }));
          }
        } catch (error) {
          console.error('localStorage\'dan kullanıcı verisi alınırken hata:', error);
          // Fallback olarak AuthContext'ten al
          if (user.store) {
            setStores([user.store]);
            setPaymentForm(prev => ({ ...prev, storeId: user.store!.store_id }));
          }
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

      const response = await fetch('https://pasha-backend-production.up.railway.app/api/stores', {
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
        setStores(data.data);
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
      const baseUrl = 'https://pasha-backend-production.up.railway.app';
      let apiUrl = '';
      
      if (isAdmin) {
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

      if (selectedStoreFilter && isAdmin) {
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
      if (!paymentForm.storeId || !paymentForm.amount || !paymentForm.description.trim()) {
        alert('Lütfen tüm alanları doldurun!');
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
        aciklama: paymentForm.description
      };

      // API çağrısı yap
      const response = await processPayment(paymentRequest);
      
      if (response.success && response.data) {
        // Ödeme URL'ini yeni sekmede aç
        window.open(response.data.paymentUrl, '_blank');
        
        // Başarı mesajı göster
        alert(`Ödeme sayfası açıldı! 
Tutar: ${response.data.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺`);
        
        setPaymentModalOpen(false);
        
        // Formu temizle
        setPaymentForm({
          amount: '',
          description: '',
          storeId: isAdmin ? '' : (stores.length > 0 ? stores[0].store_id : '')
        });
        
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
                <span class="amount">${payment.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</span>
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
      <div className="p-6 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-[#00365a]"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <svg className="w-6 h-6 text-[#00365a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900">Ödeme Verileri Yükleniyor</h3>
              <p className="text-sm text-gray-500 mt-1">Lütfen bekleyiniz...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-[#00365a] flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mr-3" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
                  <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
                </svg>
                Ödeme Geçmişi
              </h1>
              <p className="text-gray-600 mt-1">Geçmiş ödeme işlemlerini görüntüleyin ve takip edin</p>
            </div>
            <button
              onClick={() => setPaymentModalOpen(true)}
              className="bg-[#00365a] hover:bg-[#004170] text-white px-6 py-3 rounded-lg font-semibold transition-all shadow-md hover:shadow-lg flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span>Yeni Ödeme</span>
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center">
                <div className="p-3 bg-green-100 rounded-xl">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Başarılı Ödemeler</p>
                  <p className="text-2xl font-bold text-gray-900">{summary.completedCount}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center">
                <div className="p-3 bg-red-100 rounded-xl">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Başarısız Ödemeler</p>
                  <p className="text-2xl font-bold text-gray-900">{summary.failedCount}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center">
                <div className="p-3 bg-blue-100 rounded-xl">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Toplam Tutar</p>
                  <p className="text-2xl font-bold text-gray-900">{summary.totalAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center">
                <div className="p-3 bg-purple-100 rounded-xl">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Başarı Oranı</p>
                  <p className="text-2xl font-bold text-gray-900">%{summary.successRate}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-[#00365a]" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.553.894l-2 1A1 1 0 018 16v-4.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
            </svg>
            <h3 className="text-lg font-semibold text-[#00365a]">Filtreler</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Arama</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Referans, mağaza..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#00365a] focus:border-transparent transition-all"
                />
                <svg className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle cx="11" cy="11" r="8"/>
                  <path d="M21 21l-4.35-4.35"/>
                </svg>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Durum</label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  handleFilterChange();
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#00365a] focus:border-transparent transition-all"
              >
                <option value="">Tüm Durumlar</option>
                <option value="COMPLETED">Başarılı</option>
                <option value="FAILED">Başarısız</option>
              </select>
            </div>
            {isAdmin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Mağaza</label>
                <select
                  value={selectedStoreFilter}
                  onChange={(e) => {
                    setSelectedStoreFilter(e.target.value);
                    handleFilterChange();
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#00365a] focus:border-transparent transition-all"
                >
                  <option value="">Tüm Mağazalar</option>
                  {stores.map((store) => (
                    <option key={store.store_id} value={store.store_id}>
                      {store.kurum_adi}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Başlangıç</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  handleFilterChange();
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#00365a] focus:border-transparent transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Bitiş</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  handleFilterChange();
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#00365a] focus:border-transparent transition-all"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("");
                  setSelectedStoreFilter("");
                  setStartDate("");
                  setEndDate("");
                  setCurrentPage(1);
                }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors w-full font-medium"
              >
                Temizle
              </button>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-6">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="bg-red-100 rounded-full p-2">
                  <svg className="h-5 w-5 text-red-600" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-base font-semibold text-red-800">
                  Hata Oluştu
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Payments Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-[#00365a]">
            <div className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="text-lg font-semibold text-white">Ödeme Listesi</h3>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Referans No
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Durum
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Tutar
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Mağaza
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Açıklama
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Tarih
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    İşlemler
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPayments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-gray-900">{payment.sellerReference}</div>
                      <div className="text-sm text-gray-500 font-mono">{payment.apiReferenceNumber}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${statusColors[payment.status]}`}>
                        {statusLabels[payment.status]}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-gray-900">
                        {payment.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{payment.store.kurum_adi}</div>
                      {isAdmin && payment.store.vergi_numarasi && (
                        <div className="text-sm text-gray-500">{payment.store.vergi_numarasi}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-xs truncate" title={payment.description}>
                        {payment.description}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {new Date(payment.paymentDate || payment.createdAt).toLocaleDateString('tr-TR', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleViewDetails(payment)}
                          className="text-[#00365a] hover:text-[#004170] flex items-center gap-1 px-3 py-1 rounded-lg hover:bg-blue-50 transition-all"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          Detay
                        </button>
                        <button
                          onClick={() => handlePrintPayment(payment)}
                          className="text-gray-600 hover:text-gray-900 flex items-center gap-1 px-3 py-1 rounded-lg hover:bg-gray-50 transition-all"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                          </svg>
                          Yazdır
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="text-sm text-gray-600">
                  Toplam <span className="font-semibold text-gray-900">{pagination.totalCount}</span> kayıt,{' '}
                  <span className="font-semibold text-gray-900">{((pagination.page - 1) * pagination.limit) + 1}</span> -{' '}
                  <span className="font-semibold text-gray-900">{Math.min(pagination.page * pagination.limit, pagination.totalCount)}</span> arası gösteriliyor
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePageChange(Math.max(1, pagination.page - 1))}
                    disabled={!pagination.hasPrev}
                    className="px-4 py-2 text-sm bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    Önceki
                  </button>
                  <span className="px-4 py-2 text-sm bg-[#00365a] text-white rounded-lg font-medium">
                    {pagination.page} / {pagination.totalPages}
                  </span>
                  <button
                    onClick={() => handlePageChange(Math.min(pagination.totalPages, pagination.page + 1))}
                    disabled={!pagination.hasNext}
                    className="px-4 py-2 text-sm bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    Sonraki
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Empty State */}
        {filteredPayments.length === 0 && !loading && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <div className="w-20 h-20 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
              <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Ödeme Bulunamadı</h3>
            <p className="text-gray-500 mb-4">Arama kriterlerinize uygun ödeme kaydı bulunmamaktadır.</p>
            <button
              onClick={() => setPaymentModalOpen(true)}
              className="bg-[#00365a] hover:bg-[#004170] text-white px-6 py-3 rounded-lg font-medium transition-all shadow-md hover:shadow-lg inline-flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              İlk Ödemeyi Yapın
            </button>
          </div>
        )}

        {/* Detail Modal */}
        {modalOpen && selectedPayment && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
              {/* Header */}
              <div className="bg-[#00365a] text-white rounded-t-2xl p-6">
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-3">
                    <div className="bg-white bg-opacity-20 rounded-xl p-3">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold">Ödeme Detayları</h3>
                      <p className="text-blue-100 text-sm">{selectedPayment.sellerReference}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setModalOpen(false)}
                    className="text-blue-100 hover:text-white transition-colors p-2 hover:bg-white hover:bg-opacity-20 rounded-xl"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                <div className="space-y-6">
                  {/* Status and Amount */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
                      <div className="flex items-center mb-4">
                        <div className="bg-blue-100 rounded-full p-2 mr-3">
                          <svg className="w-5 h-5 text-[#00365a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <h4 className="text-lg font-semibold text-gray-900">İşlem Bilgileri</h4>
                      </div>
                      <div className="space-y-4">
                        <div className="bg-white rounded-lg p-4 border border-gray-100">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600 font-medium">Durum:</span>
                            <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${statusColors[selectedPayment.status]}`}>
                              {statusLabels[selectedPayment.status]}
                            </span>
                          </div>
                        </div>
                        <div className="bg-white rounded-lg p-4 border border-gray-100">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600 font-medium">Tutar:</span>
                            <span className="text-2xl font-bold text-green-600">
                              {selectedPayment.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                            </span>
                          </div>
                        </div>
                        <div className="bg-white rounded-lg p-4 border border-gray-100">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600 font-medium">API Referansı:</span>
                            <span className="text-gray-900 font-mono text-sm bg-gray-50 px-2 py-1 rounded">{selectedPayment.apiReferenceNumber}</span>
                          </div>
                        </div>
                        <div className="bg-white rounded-lg p-4 border border-gray-100">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600 font-medium">Octet Ödeme ID:</span>
                            <span className="text-gray-900 font-mono text-sm bg-gray-50 px-2 py-1 rounded">{selectedPayment.octetPaymentId}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-100">
                      <div className="flex items-center mb-4">
                        <div className="bg-green-100 rounded-full p-2 mr-3">
                          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                        </div>
                        <h4 className="text-lg font-semibold text-gray-900">Mağaza Bilgileri</h4>
                      </div>
                      <div className="space-y-4">
                        <div className="bg-white rounded-lg p-4 border border-gray-100">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600 font-medium">Mağaza:</span>
                            <span className="text-gray-900 font-semibold">{selectedPayment.store.kurum_adi}</span>
                          </div>
                        </div>
                        {selectedPayment.store.vergi_numarasi && (
                          <div className="bg-white rounded-lg p-4 border border-gray-100">
                            <div className="flex justify-between items-center">
                              <span className="text-gray-600 font-medium">Vergi No:</span>
                              <span className="text-gray-900 font-semibold">{selectedPayment.store.vergi_numarasi}</span>
                            </div>
                          </div>
                        )}
                        {selectedPayment.store.telefon && (
                          <div className="bg-white rounded-lg p-4 border border-gray-100">
                            <div className="flex justify-between items-center">
                              <span className="text-gray-600 font-medium">Telefon:</span>
                              <span className="text-gray-900 font-semibold">{selectedPayment.store.telefon}</span>
                            </div>
                          </div>
                        )}
                        {selectedPayment.store.eposta && (
                          <div className="bg-white rounded-lg p-4 border border-gray-100">
                            <div className="flex justify-between items-center">
                              <span className="text-gray-600 font-medium">E-posta:</span>
                              <span className="text-gray-900 font-semibold">{selectedPayment.store.eposta}</span>
                            </div>
                          </div>
                        )}
                        <div className="bg-white rounded-lg p-4 border border-gray-100">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600 font-medium">Tarih:</span>
                            <span className="text-gray-900 font-semibold">
                              {new Date(selectedPayment.paymentDate || selectedPayment.createdAt).toLocaleDateString('tr-TR', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-6 border border-amber-100">
                    <div className="flex items-center mb-4">
                      <div className="bg-amber-100 rounded-full p-2 mr-3">
                        <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <h4 className="text-lg font-semibold text-gray-900">Açıklama</h4>
                    </div>
                    <div className="bg-white rounded-lg p-4 border border-gray-100">
                      <p className="text-gray-700 leading-relaxed">{selectedPayment.description}</p>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="bg-gray-50 px-6 py-4 rounded-b-2xl flex justify-between items-center mt-6">
                  <div className="text-sm text-gray-500">
                    Ödeme ID: <span className="font-mono">{selectedPayment.id}</span>
                  </div>
                  <div className="flex space-x-3">
                    <button
                      onClick={() => handlePrintPayment(selectedPayment)}
                      className="flex items-center px-4 py-2 bg-[#00365a] text-white rounded-lg hover:bg-[#004170] transition-colors shadow-md hover:shadow-lg"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                      </svg>
                      Yazdır
                    </button>
                    <button
                      onClick={() => setModalOpen(false)}
                      className="flex items-center px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Kapat
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Payment Modal */}
        {paymentModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl">
              {/* Header */}
              <div className="bg-[#00365a] text-white rounded-t-2xl p-6 relative">
                <button
                  onClick={() => setPaymentModalOpen(false)}
                  className="absolute top-4 right-4 text-blue-100 hover:text-white transition-colors p-2 hover:bg-white hover:bg-opacity-20 rounded-xl"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                
                <div className="text-center pr-12">
                  <div className="w-16 h-16 bg-white bg-opacity-20 rounded-xl mx-auto mb-4 flex items-center justify-center">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-3a2 2 0 00-2-2H9a2 2 0 00-2 2v3a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-bold">Yeni Ödeme</h2>
                  <p className="text-blue-100 text-sm mt-1">Ödeme bilgilerini girin</p>
                </div>
              </div>

              {/* Form Content */}
              <div className="p-6">
                <form onSubmit={handlePaymentSubmit} className="space-y-6">
                  {/* Mağaza Seçimi - Sadece admin için göster */}
                  {isAdmin && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center">
                        <svg className="w-4 h-4 mr-2 text-[#00365a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        <span className="text-red-500">*</span> Mağaza
                      </label>
                      <select
                        value={paymentForm.storeId}
                        onChange={(e) => setPaymentForm(prev => ({ ...prev, storeId: e.target.value }))}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#00365a] focus:border-transparent transition-all"
                      >
                        <option value="">Mağaza Seçiniz</option>
                        {stores.map((store) => (
                          <option key={store.store_id} value={store.store_id}>
                            {store.kurum_adi} - {store.vergi_numarasi}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Admin değilse mağaza bilgisini göster */}
                  {!isAdmin && stores.length > 0 && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center">
                        <svg className="w-4 h-4 mr-2 text-[#00365a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        Mağaza Bilgisi
                      </label>
                      <div className="w-full px-4 py-3 border border-gray-200 rounded-lg shadow-sm bg-gray-50 text-gray-700 font-medium">
                        {stores[0].kurum_adi}
                      </div>
                      <div className="mt-2 text-sm text-gray-500 bg-blue-50 rounded-lg p-3">
                        <span className="font-medium">Vergi No:</span> {stores[0].vergi_numarasi}<br/>
                        <span className="font-medium">Yetkili:</span> {stores[0].yetkili_adi} {stores[0].yetkili_soyadi}
                      </div>
                    </div>
                  )}

                  {/* Ödenecek tutar */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center">
                      <svg className="w-4 h-4 mr-2 text-[#00365a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                      </svg>
                      <span className="text-red-500">*</span> Ödenecek Tutar (₺)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={paymentForm.amount}
                        onChange={(e) => setPaymentForm(prev => ({ ...prev, amount: e.target.value }))}
                        required
                        className="w-full pl-4 pr-12 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#00365a] focus:border-transparent transition-all"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">₺</span>
                    </div>
                  </div>

                  {/* Ödeme Açıklaması */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center">
                      <svg className="w-4 h-4 mr-2 text-[#00365a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span className="text-red-500">*</span> Ödeme Açıklaması
                    </label>
                    <textarea
                      placeholder="Ödeme açıklamasını giriniz..."
                      value={paymentForm.description}
                      onChange={(e) => setPaymentForm(prev => ({ ...prev, description: e.target.value }))}
                      rows={4}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#00365a] focus:border-transparent transition-all resize-none"
                    />
                  </div>

                  {/* Buttons */}
                  <div className="flex gap-3 pt-4">
                    <button
                      type="submit"
                      className="flex-1 bg-[#00365a] hover:bg-[#004170] text-white py-3 px-6 rounded-lg font-semibold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                      Ödeme Yap
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentModalOpen(false)}
                      className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold transition-all"
                    >
                      İptal
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 