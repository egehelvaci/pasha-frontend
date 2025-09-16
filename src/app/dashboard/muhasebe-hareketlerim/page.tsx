'use client';

import React, { useEffect, useState } from 'react';
import { getMuhasebeHareketleri, MuhasebeHareketleriResponse } from '@/services/api';
import { useAuth } from '@/app/context/AuthContext';
import { useRouter } from 'next/navigation';
import { FaMoneyBillWave, FaWallet, FaChartLine, FaPrint } from 'react-icons/fa';

// Currency sembollerini tanımla
const CURRENCY_SYMBOLS = {
  'TRY': '₺',
  'USD': '$',
  'EUR': '€'
};

export default function MuhasebeHareketlerimPage() {
  const { user, isAdmin } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<MuhasebeHareketleriResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Currency state
  const [userCurrency, setUserCurrency] = useState<string>('TRY');

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

  useEffect(() => {
    // Admin kullanıcıları bu sayfaya erişemez
    if (isAdmin) {
      router.push('/dashboard');
      return;
    }

    // canSeePrice kontrolü
    if (user && !user.canSeePrice) {
      router.push('/dashboard');
      return;
    }

    fetchMuhasebeData();
  }, [isAdmin, user, router]);

  const fetchMuhasebeData = async () => {
    try {
      setLoading(true);
      const response = await getMuhasebeHareketleri();
      setData(response);
    } catch (err: any) {
      setError(err.message || 'Veriler yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ' + (CURRENCY_SYMBOLS[userCurrency as keyof typeof CURRENCY_SYMBOLS] || userCurrency);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handlePrint = () => {
    if (!data || !data.data || !data.data.muhasebeHareketleri) return;

    const hareketler = data.data.muhasebeHareketleri;
    
    // Yazdırma stilleri
    const printStyles = `
      <style id="print-styles">
        @page {
          margin: 0.2in 0.3in;
          size: A4;
          orphans: 1;
          widows: 1;
        }
        @page:last {
          margin-bottom: 0;
        }
        @media print {
          html, body {
            height: auto !important;
            overflow: hidden !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          * {
            box-sizing: border-box;
            margin: 0 !important;
            padding: 0 !important;
          }
          .printable-content * {
            margin: revert !important;
            padding: revert !important;
          }
          .print-table {
            page-break-after: avoid;
            margin-bottom: 0 !important;
          }
          .print-table tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          .print-table tr:last-child {
            page-break-after: avoid;
          }
          body {
            margin: 0;
            padding: 0;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          body * {
            visibility: hidden;
          }
          .printable-content, .printable-content * {
            visibility: visible;
          }
          .printable-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden;
            height: auto !important;
            max-height: none !important;
            page-break-after: avoid !important;
          }
          .printable-content::after {
            content: "";
            display: block;
            height: 0;
            clear: both;
            page-break-after: avoid;
          }
          .print-header {
            text-align: center;
            margin-bottom: 12px;
            padding-bottom: 8px;
            border-bottom: 2px solid #00365a;
            page-break-after: avoid;
          }
          .print-header h1 {
            color: #00365a;
            font-size: 20px;
            margin-bottom: 8px;
            font-weight: bold;
          }
          .print-header .date {
            color: #666;
            font-size: 14px;
          }
          .balance-box {
            margin-top: 8px;
            padding: 8px;
            border-radius: 4px;
            text-align: center;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .balance-positive {
            background-color: #dcfce7 !important;
            border: 1px solid #16a34a !important;
            color: #16a34a !important;
          }
          .balance-negative {
            background-color: #fee2e2 !important;
            border: 1px solid #dc2626 !important;
            color: #dc2626 !important;
          }
          .print-table {
            width: 100%;
            border-collapse: collapse;
            margin: 8px 0 0 0 !important;
            font-size: 11px;
            table-layout: fixed;
            page-break-inside: auto;
          }
          .print-table th {
            background-color: #00365a !important;
            color: white !important;
            padding: 8px 6px;
            text-align: left;
            font-weight: bold;
            font-size: 10px;
            text-transform: uppercase;
            -webkit-print-color-adjust: exact;
            line-height: 1.4;
            word-wrap: break-word;
            height: 32px;
          }
          .print-table td {
            padding: 6px 4px;
            border-bottom: 1px solid #e5e5e5;
            vertical-align: top;
            font-size: 10px;
            line-height: 1.4;
            word-wrap: break-word;
            overflow-wrap: break-word;
            hyphens: auto;
            min-height: 28px;
          }
          .print-table tr:nth-child(even) {
            background-color: #f9f9f9 !important;
            -webkit-print-color-adjust: exact;
          }
          .amount-income {
            color: #16a34a !important;
            font-weight: bold;
          }
          .amount-expense {
            color: #dc2626 !important;
            font-weight: bold;
          }
          .print-footer {
            margin-top: 8px;
            margin-bottom: 0 !important;
            padding-top: 4px;
            padding-bottom: 0 !important;
            border-top: 1px solid #ddd;
            text-align: center;
            font-size: 9px;
            color: #666;
            page-break-inside: avoid;
            page-break-before: avoid;
            page-break-after: avoid;
            height: auto;
          }
          .print-footer p {
            margin: 2px 0 !important;
            padding: 0 !important;
          }
          .text-truncate {
            word-wrap: break-word;
            overflow-wrap: break-word;
            hyphens: auto;
            white-space: normal;
          }
        }
      </style>
    `;
    
    // Yazdırılacak içerik
    const printContent = `
      <div class="printable-content">
        <div class="print-header">
          <h1>Muhasebe Hareketlerim</h1>
          <div class="date">${new Date().toLocaleDateString('tr-TR')} - ${new Date().toLocaleTimeString('tr-TR', {
            hour: '2-digit',
            minute: '2-digit'
          })}</div>
          <div class="balance-box ${(data.data.ozet?.guncelBakiye ?? 0) < 0 ? 'balance-negative' : 'balance-positive'}">
            <strong>
              Toplam Bakiye: ${formatCurrency(Math.abs(data.data.ozet?.guncelBakiye ?? 0))} ${(data.data.ozet?.guncelBakiye ?? 0) < 0 ? '(Borç)' : '(Alacak)'}
            </strong>
          </div>
        </div>

        <table class="print-table">
          <thead>
            <tr>
              <th style="width: 20%;">Tarih</th>
              <th style="width: 20%;">İşlem Türü</th>
              <th style="width: 45%;">Açıklama</th>
              <th style="width: 15%;">Tutar</th>
            </tr>
          </thead>
          <tbody>
            ${hareketler.map(hareket => `
              <tr>
                <td>
                  ${new Date(hareket.tarih).toLocaleDateString('tr-TR')}
                  <div style="font-size: 9px; color: #888;">
                    ${new Date(hareket.tarih).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </td>
                <td class="text-truncate" title="${hareket.islemTuru}">
                  ${hareket.islemTuru}
                </td>
                <td class="text-truncate" title="${hareket.aciklama}">
                  ${hareket.aciklama.replace(' - Onay Kodu: N/A', '').replace('Onay Kodu: N/A', '')}
                </td>
                <td class="${
                  hareket.islemTuru === 'Sanal POS Ödemesi' || hareket.islemTuru.includes('Sanal POS Ödemesi')
                    ? 'amount-income'
                    : hareket.harcamaMi 
                      ? 'amount-expense' 
                      : 'amount-income'
                }">
                  ${
                    hareket.islemTuru === 'Sanal POS Ödemesi' || hareket.islemTuru.includes('Sanal POS Ödemesi')
                      ? `+${formatCurrency(Math.abs(hareket.tutar))}`
                      : hareket.harcamaMi 
                        ? formatCurrency(hareket.tutar)
                        : `+${formatCurrency(hareket.tutar)}`
                  }
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="print-footer">
          <div class="balance-box ${(data.data.ozet?.guncelBakiye ?? 0) < 0 ? 'balance-negative' : 'balance-positive'}" style="margin-bottom: 8px;">
            <strong>
              Toplam Bakiye: ${formatCurrency(Math.abs(data.data.ozet?.guncelBakiye ?? 0))} ${(data.data.ozet?.guncelBakiye ?? 0) < 0 ? '(Borç)' : '(Alacak)'}
            </strong>
          </div>
          <p><strong>Toplam ${hareketler.length} hareket listelendi</strong></p>
          <p>Bu rapor Paşa Bayi Sipariş Sistemi tarafından ${new Date().toLocaleDateString('tr-TR')} tarihinde otomatik olarak oluşturulmuştur.</p>
        </div>
      </div>
    `;
    
    // Eski yazdırma stillerini temizle
    const oldStyles = document.getElementById('print-styles');
    if (oldStyles) {
      oldStyles.remove();
    }
    
    // Eski yazdırılacak içeriği temizle
    const oldContent = document.querySelector('.printable-content');
    if (oldContent) {
      oldContent.remove();
    }
    
    // Yeni stilleri head'e ekle
    document.head.insertAdjacentHTML('beforeend', printStyles);
    
    // Yazdırılacak içeriği body'ye ekle
    document.body.insertAdjacentHTML('beforeend', printContent);
    
    // Yazdırma dialogunu aç
    window.print();
    
    // Yazdırma işlemi bittiğinde temizlik yap
    setTimeout(() => {
      const stylesElement = document.getElementById('print-styles');
      const contentElement = document.querySelector('.printable-content');
      if (stylesElement) stylesElement.remove();
      if (contentElement) contentElement.remove();
    }, 1000);
  };

  if (loading) {
    return (
      <div className="container-responsive py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
          <div className="bg-white rounded-xl p-6">
            <div className="h-6 bg-gray-200 rounded mb-4"></div>
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-4 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-responsive py-8">
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
          <p className="font-medium">Hata:</p>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container-responsive py-8">
        <div className="text-center text-gray-500">
          Veri bulunamadı
        </div>
      </div>
    );
  }

  const { ozet, muhasebeHareketleri } = data.data || {};

  return (
    <div className="container-responsive py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Muhasebe Hareketlerim</h1>
        <p className="text-gray-600">Finansal özet ve hareket detaylarınız</p>
      </div>

      {/* Özet Kartı */}
      <div className="flex justify-center mb-8">
        <div className={`bg-gradient-to-r ${(ozet?.guncelBakiye ?? 0) < 0 ? 'from-red-500 to-red-600' : 'from-green-500 to-green-600'} rounded-xl p-8 text-white max-w-md w-full`}>
          <div className="flex items-center justify-between mb-4">
            <FaWallet className="text-4xl opacity-80" />
            <span className="text-sm bg-white/20 px-3 py-2 rounded-full">Güncel</span>
          </div>
          <p className="text-lg opacity-90 mb-2">
            {(ozet?.guncelBakiye ?? 0) < 0 ? 'Borç Durumu' : 'Alacak Durumu'}
          </p>
          <p className="text-3xl font-bold mb-2">{formatCurrency(Math.abs(ozet?.guncelBakiye ?? 0))}</p>
          <p className="text-sm opacity-90">
            {(ozet?.guncelBakiye ?? 0) < 0 ? 'Borçlusunuz' : 'Alacaklısınız'}
          </p>
        </div>
      </div>

      {/* Muhasebe Hareketleri */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-100">
              <FaChartLine className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Muhasebe Hareketleri</h2>
              <p className="text-sm text-gray-500">{muhasebeHareketleri?.length || 0} kayıt bulundu</p>
            </div>
          </div>
          
          {/* Yazdırma Butonu */}
          {(muhasebeHareketleri?.length || 0) > 0 && (
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <FaPrint className="w-4 h-4" />
              Yazdır
            </button>
          )}
        </div>

        <div className="p-6">
          {(muhasebeHareketleri?.length || 0) === 0 ? (
            <p className="text-gray-500 text-center py-8">Henüz muhasebe hareketi bulunmuyor.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-gray-200">
                  <tr>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Tarih</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">İşlem Türü</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Açıklama</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-700">Tutar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {muhasebeHareketleri?.map((hareket) => (
                    <tr key={hareket.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {formatDate(hareket.tarih)}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                          hareket.islemTuru === 'Sanal POS Ödemesi' || hareket.islemTuru.includes('Sanal POS Ödemesi')
                            ? 'bg-green-100 text-green-800'
                            : hareket.harcamaMi
                              ? 'bg-red-100 text-red-800'
                              : 'bg-green-100 text-green-800'
                        }`}>
                          {hareket.islemTuru === 'Sanal POS Ödemesi' || hareket.islemTuru.includes('Sanal POS Ödemesi') ? (
                            <FaWallet className="w-3 h-3" />
                          ) : hareket.harcamaMi ? (
                            <FaMoneyBillWave className="w-3 h-3" />
                          ) : (
                            <FaWallet className="w-3 h-3" />
                          )}
                          {hareket.islemTuru}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-900">
                        {hareket.aciklama.replace(' - Onay Kodu: N/A', '').replace('Onay Kodu: N/A', '')}
                      </td>
                      <td className={`py-3 px-4 text-right font-medium ${
                        hareket.islemTuru === 'Sanal POS Ödemesi' || hareket.islemTuru.includes('Sanal POS Ödemesi')
                          ? 'text-green-600'
                          : hareket.harcamaMi 
                            ? 'text-red-600' 
                            : 'text-green-600'
                      }`}>
                        {hareket.islemTuru === 'Sanal POS Ödemesi' || hareket.islemTuru.includes('Sanal POS Ödemesi')
                          ? `+${formatCurrency(Math.abs(hareket.tutar))}`
                          : hareket.harcamaMi 
                            ? formatCurrency(hareket.tutar)
                            : `+${formatCurrency(hareket.tutar)}`
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}