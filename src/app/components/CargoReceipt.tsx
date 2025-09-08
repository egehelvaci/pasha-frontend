'use client';

import { Order } from '@/services/api';
import { useAuth } from '@/app/context/AuthContext';
import { useEffect } from 'react';

interface CargoReceiptProps {
  order: Order;
  isVisible: boolean;
  onClose: () => void;
}

export default function CargoReceipt({ order, isVisible, onClose }: CargoReceiptProps) {
  const { user, isAdmin, isAdminOrEditor } = useAuth();
  
  useEffect(() => {
    if (isVisible && !isAdminOrEditor) {
      onClose();
    }
  }, [isVisible, isAdminOrEditor, onClose]);
  
  if (!isVisible) return null;
  
  if (!isAdminOrEditor) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl p-8">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
              <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Erişim Engellendi</h3>
            <p className="text-gray-600 mb-6">Kargo fişlerini görüntüleme yetkiniz bulunmamaktadır.</p>
            <button
              onClick={onClose}
              className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-semibold transition-all"
            >
              Kapat
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (printWindow) {
      const htmlContent = `
        <!DOCTYPE html>
        <html lang="tr">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Kargo Fişi</title>
          <style>
            @page {
              size: A5 landscape;
              margin: 0;
            }
            
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            body {
              font-family: 'Arial', sans-serif;
              font-size: 11px;
              line-height: 1.3;
              color: #000;
              background: white;
              width: 210mm;
              height: 148mm;
              margin: 0;
              padding: 10mm;
              overflow: hidden;
            }
            
            .receipt-container {
              width: 100%;
              height: 100%;
              display: flex;
              flex-direction: column;
            }
            
            .header {
              text-align: center;
              border-bottom: 2px solid #000;
              padding-bottom: 5mm;
              margin-bottom: 5mm;
            }
            
            .header h1 {
              font-size: 18px;
              font-weight: bold;
              margin-bottom: 2mm;
              color: #000;
            }
            
            .header h2 {
              font-size: 14px;
              font-weight: bold;
              margin-bottom: 2mm;
              color: #000;
            }
            
            .header p {
              font-size: 11px;
              margin: 1mm 0;
              color: #000;
            }
            
            .content {
              flex: 1;
              display: flex;
              flex-direction: column;
              gap: 3mm;
            }
            
            .content-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 5mm;
              flex: 1;
            }
            
            .section {
              border: 1.5px solid #000;
              padding: 3mm;
              height: fit-content;
            }
            
            .section h3 {
              font-size: 12px;
              font-weight: bold;
              border-bottom: 1px solid #000;
              padding-bottom: 2mm;
              margin-bottom: 3mm;
              color: #000;
            }
            
            .info-item {
              display: flex;
              justify-content: space-between;
              margin-bottom: 2mm;
              font-size: 11px;
              align-items: flex-start;
            }
            
            .info-item strong {
              font-weight: bold;
              min-width: 25mm;
              color: #000;
            }
            
            .info-item span {
              text-align: left;
              flex: 1;
              margin-left: 3mm;
              word-wrap: break-word;
              color: #000;
            }
            
            .address-section {
              width: 100%;
              margin-bottom: 3mm;
            }
            
            .sender-info {
              grid-column: 1 / -1;
              margin-top: auto;
              border-top: 1px solid #000;
              padding-top: 3mm;
              text-align: center;
              font-size: 10px;
              color: #666;
            }
            
            @media print {
              body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              
              .receipt-container {
                page-break-inside: avoid;
              }
              
              .section {
                page-break-inside: avoid;
              }
            }
          </style>
        </head>
        <body>
          <div class="receipt-container">
            <div class="header">
              <h1>PAŞA HOME</h1>
              <h2>KARGO FİŞİ</h2>
              <p>Sipariş No: <strong>${order.id.slice(0, 8).toUpperCase()}</strong></p>
              <p>Tarih: <strong>${new Date(order.created_at).toLocaleDateString('tr-TR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}</strong></p>
            </div>

            <div class="content">
              <div class="section address-section">
                <h3>ALICI ADRESİ</h3>
                <div class="info-item">
                  <strong>Adres:</strong>
                  <span>${order.address ? 
                    `${(order.address as any).address}, ${(order.address as any).district} / ${(order.address as any).city}` : 
                    order.delivery_address || 'Belirtilmemiş'
                  }</span>
                </div>
                ${order.address && (order.address as any).postal_code ? 
                  `<div class="info-item">
                    <strong>Posta Kodu:</strong>
                    <span>${(order.address as any).postal_code}</span>
                  </div>` : ''
                }
              </div>

              <div class="content-grid">
                <div class="section">
                  <h3>ALICI BİLGİLERİ</h3>
                  <div class="info-item">
                    <strong>Firma:</strong>
                    <span>${order.store_name}</span>
                  </div>
                  <div class="info-item">
                    <strong>Yetkili:</strong>
                    <span>${order.user ? `${order.user.name} ${order.user.surname}` : 'Belirtilmemiş'}</span>
                  </div>
                  <div class="info-item">
                    <strong>Telefon:</strong>
                    <span>${order.store_phone || order.user?.phone || 'Belirtilmemiş'}</span>
                  </div>
                  <div class="info-item">
                    <strong>E-posta:</strong>
                      <span>${order.store_email || order.user?.email || 'Belirtilmemiş'}</span>
                    </div>
                  <div class="info-item">
                    <strong>Vergi No:</strong>
                    <span>${order.store_tax_number || 'Belirtilmemiş'}</span>
                  </div>
                  <div class="info-item">
                    <strong>Vergi Dairesi:</strong>
                    <span>${order.store_tax_office || 'Belirtilmemiş'}</span>
                  </div>
                </div>

                <div class="section">
                  <h3>GÖNDERİCİ BİLGİLERİ</h3>
                  <div class="info-item">
                    <strong>Firma:</strong>
                    <span>PAŞA HOME Tekstil San. ve Tic. Ltd. Şti.</span>
                  </div>
                  <div class="info-item">
                    <strong>Telefon:</strong>
                    <span>+90 555 234 58 91</span>
                  </div>
                  <div class="info-item">
                    <strong>Adres:</strong>
                    <span>Güneşli Mah. Mahmutbey Cad. 1296. Sok. No:3 Daire:1 Bağcılar/İstanbul</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="sender-info">
              <p><strong>PAŞA HOME</strong> - Halı ve Ev Tekstili Ürünleri</p>
              <p>www.pasahome.com.tr | info@pasahome.com.tr</p>
            </div>
          </div>
        </body>
        </html>
      `;

      printWindow.document.write(htmlContent);
      printWindow.document.close();
      
      printWindow.onload = () => {
        setTimeout(() => {
          try {
            printWindow.focus();
            printWindow.print();
          } catch (error) {
            console.error('Print error:', error);
          }
          setTimeout(() => {
            try {
              printWindow.close();
            } catch (error) {
              console.error('Close error:', error);
            }
          }, 3000);
        }, 1500);
      };
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl">
        {/* Header */}
        <div className="bg-indigo-600 text-white rounded-t-2xl p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="bg-white bg-opacity-20 rounded-xl p-2 mr-3">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold">Kargo Fişi</h3>
                <p className="text-indigo-100 text-sm mt-1">
                  Sipariş: {order.id.slice(0, 8).toUpperCase()} - {order.store_name}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-indigo-200 text-3xl font-bold transition-colors"
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-3">Kargo Fişi Önizleme</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600 font-medium">Gönderici:</span>
                <span className="ml-2 text-gray-900">PAŞA HOME</span>
              </div>
              <div>
                <span className="text-gray-600 font-medium">Alıcı:</span>
                <span className="ml-2 text-gray-900">{order.store_name}</span>
              </div>
              <div>
                <span className="text-gray-600 font-medium">Teslimat Adresi:</span>
                <span className="ml-2 text-gray-900">
                  {order.address ? 
                    `${(order.address as any).address}, ${(order.address as any).district} / ${(order.address as any).city}` : 
                    order.delivery_address || 'Belirtilmemiş'
                  }
                </span>
              </div>
              <div>
                <span className="text-gray-600 font-medium">Ürün Sayısı:</span>
                <span className="ml-2 text-gray-900">
                  {order.items.reduce((total, item) => total + item.quantity, 0)} adet
                </span>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-blue-800 text-sm">
                Bu kargo fişi A5 boyutunda yazdırılacak ve teslimat sırasında kullanılacaktır.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 rounded-b-2xl flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-semibold transition-all"
          >
            İptal
          </button>
          <button
            onClick={handlePrint}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold transition-all shadow-md hover:shadow-lg flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Kargo Fişi Yazdır
          </button>
        </div>
      </div>
    </div>
  );
}
