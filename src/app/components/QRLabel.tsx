'use client';

import { useEffect, useRef } from 'react';
import QRCode from 'qrcode';

interface OrderItem {
  id: string;
  product: {
    productId: string;
    name: string;
    description?: string;
    productImage?: string;
  };
  width: string;
  height: string;
  has_fringe: boolean;
  cut_type: string;
  quantity: number;
  notes?: string;
  unit_price: string;
  total_price: string;
}

interface QRCodeData {
  id: string;
  order_id: string;
  order_item_id: string;
  product_id: string;
  barcode: string;
  barcode_type: string;
  barcode_image_url: string;
  is_scanned: boolean;
  scanned_at?: string;
  scanned_by?: string;
  created_at: string;
  quantity: number;
  qr_code?: string;
  qrCodeImageUrl?: string;
  scan_count?: number;
  required_scans?: number;
  last_scan_at?: string;
  first_scan_employee_id?: string;
  first_scan_at?: string;
  second_scan_at?: string;
  order_item: {
    id: string;
    order_id: string;
    product_id: string;
    quantity: number;
    unit_price: string;
    total_price: string;
    has_fringe: boolean;
    width: string;
    height: string;
    cut_type: string;
    notes?: string;
    product: {
      productId: string;
      name: string;
      productImage: string;
      collectionId: string;
      createdAt: string;
      updatedAt: string;
      rule_id: number;
    };
  };
  product: {
    productId: string;
    name: string;
    productImage: string;
    collectionId: string;
    createdAt: string;
    updatedAt: string;
    rule_id: number;
  };
}

interface QRLabelProps {
  orderData: {
    id: string;
    store_name: string;
    store_tax_number?: string;
    store_tax_office?: string;
    store_phone?: string;
    store_email?: string;
    total_price: string;
    status: string;
    notes?: string;
    created_at: string;
    items: OrderItem[];
    qr_codes?: QRCodeData[];
    barcodes?: QRCodeData[];
    user?: {
      name: string;
      surname: string;
      email: string;
    };
    address?: {
      title: string;
      address: string;
      city?: string;
      district?: string;
    };
  };
  isVisible: boolean;
  onClose: () => void;
}

const translateCutType = (cutType: string): string => {
  const translations: { [key: string]: string } = {
    'custom': 'Normal Kesim',
    'rectangle': 'Normal Kesim',
    'standart': 'Normal Kesim',
    'oval': 'Oval Kesim',
    'round': 'Daire Kesim',
    'daire': 'Daire Kesim',
    'post kesim': 'Post Kesim'
  };
  
  return translations[cutType?.toLowerCase()] || cutType || 'Normal Kesim';
};

export default function QRLabel({ orderData, isVisible, onClose }: QRLabelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // Önizleme için backend'den gelen QR kodunu kullan
    const generatePreviewQRCode = async () => {
    if (!canvasRef.current || (!orderData.qr_codes?.length && !orderData.barcodes?.length)) {
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Hem QR codes hem de barcodes'ları birleştir
    const allCodes = [...(orderData.qr_codes || []), ...(orderData.barcodes || [])];
    const firstCode = allCodes[0];
    const firstItem = firstCode.order_item;
    
    try {
      // Canvas boyutlarını 10x15 cm (378x567 piksel @ 96 DPI) olarak ayarla
      canvas.width = 378;
      canvas.height = 567;

      // Arka planı beyaz yap
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Canvas tainted hatası önlemek için doğrudan QR kod oluştur
      try {
        // QR kod için barcode veya id kullan
        const qrData = firstCode.qr_code || firstCode.barcode || firstCode.id;
        const qrCodeDataURL = await QRCode.toDataURL(qrData, {
          width: 200,
          margin: 1,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        });

        const qrImage = new Image();
        qrImage.onload = () => {
          // QR kodu üst kısma yerleştir (ortala)
          const qrSize = 200;
          const qrX = (canvas.width - qrSize) / 2;
          const qrY = 30;
          ctx.drawImage(qrImage, qrX, qrY, qrSize, qrSize);

          // Metin bilgilerini alt kısma ekle
          ctx.fillStyle = '#000000';
          ctx.textAlign = 'center';

          // Başlık
          ctx.font = 'bold 24px Arial';
          ctx.fillText('PAŞA HOME', canvas.width / 2, qrY + qrSize + 40);

          // Ürün adı (kalın) - en üstte
          ctx.font = 'bold 18px Arial';
          let textY = qrY + qrSize + 70;
          const productName = firstItem.product.name.toUpperCase();
          if (productName.length > 25) {
            // Uzun ürün adlarını böl
            const words = productName.split(' ');
            const line1 = words.slice(0, Math.ceil(words.length / 2)).join(' ');
            const line2 = words.slice(Math.ceil(words.length / 2)).join(' ');
            ctx.fillText(line1, canvas.width / 2, textY);
            textY += 25;
            ctx.fillText(line2, canvas.width / 2, textY);
            textY += 35;
          } else {
            ctx.fillText(productName, canvas.width / 2, textY);
            textY += 35;
          }

          // Ürün bilgileri
          ctx.font = '16px Arial';
          
          ctx.fillText(`${firstItem.width} x ${firstItem.height}`, canvas.width / 2, textY);
          textY += 25;
          
          ctx.fillText(`Kesim: ${translateCutType(firstItem.cut_type)}`, canvas.width / 2, textY);
          textY += 25;
          
          ctx.fillText(`Saçak: ${firstItem.has_fringe ? 'Saçaklı' : 'Saçaksız'}`, canvas.width / 2, textY);
          textY += 25;

          // Ürün notu varsa ekle
          if (firstItem.notes && firstItem.notes.trim()) {
            ctx.font = '14px Arial';
            ctx.fillText(`Not: ${firstItem.notes}`, canvas.width / 2, textY);
            textY += 20;
          }
          textY += 15;

                        // Miktar ve sipariş bilgisi
              ctx.font = '14px Arial';
              ctx.fillText(`Gerekli Tarama: ${firstCode.required_scans || firstCode.quantity || 2}`, canvas.width / 2, textY);
          textY += 20;
          ctx.fillText(`Sp. No: ${orderData.id.slice(0, 8)}`, canvas.width / 2, textY);
          textY += 20;
          ctx.fillText(`Tarih: ${new Date(orderData.created_at).toLocaleDateString('tr-TR')}`, canvas.width / 2, textY);

          // Barcode bilgisini sadece text olarak göster (görsel yazdırma sayfasında olacak)
          if (firstCode.barcode) {
            textY += 25;
            ctx.font = '12px Arial';
            ctx.fillText(`Barcode: ${firstCode.barcode}`, canvas.width / 2, textY);
          }
        };
        
        qrImage.src = qrCodeDataURL;
      } catch (qrError) {
        console.error('QR kod oluşturma hatası:', qrError);
      }
    } catch (error) {
      console.error('QR kod önizleme hatası:', error);
    }
  };

    if (isVisible && canvasRef.current) {
      generatePreviewQRCode();
    }
  }, [isVisible, orderData]);



  const handlePrint = async () => {
    // QR codes ve barcodes'ları eşleştir ve yazdırılacak etiketleri oluştur
    const allLabels: any[] = [];
    
    // Her QR code için ilgili barcode'u bul ve eşleştir
    if (orderData.qr_codes) {
      orderData.qr_codes.forEach(qr => {
        // Bu QR'ın order_item_id'sine göre ilgili barcode'u bul
        const relatedBarcode = orderData.barcodes?.find(bc => bc.order_item_id === qr.order_item_id);
        
        // QR için required_scans kadar etiket oluştur
        const qrCount = qr.required_scans || 1;
        for (let i = 0; i < qrCount; i++) {
          allLabels.push({
            type: 'combined', // QR + Barcode
            qrCode: qr,
            barcode: relatedBarcode,
            _labelIndex: i + 1,
            _totalLabels: qrCount,
            _source: 'qr_required_scans'
          });
        }
      });
    }
    
    // Sadece QR codes temel alınır, barcode quantity fazlası dikkate alınmaz
    // Çünkü her QR için zaten ilgili barcode eşleştiriliyor
    
    // Debug: Toplam etiket sayısı ve detayları
    console.log(`QR Label: ${allLabels.length} toplam etiket yazdırılacak`);
    console.log('Etiket detayları:', allLabels.map((label, i) => ({
      index: i,
      source: label._source,
      labelIndex: label._labelIndex,
      totalLabels: label._totalLabels,
      qrId: label.qrCode?.id?.slice(0, 8),
      barcodeId: label.barcode?.id?.slice(0, 8)
    })));
    
    if (!allLabels.length) {
      alert('Bu sipariş için henüz QR kod veya barcode oluşturulmamış.');
      return;
    }
    
    const allCodes = allLabels;

    // Backend'den gelen tüm kodları için etiket oluştur
    const labelImages: string[] = [];
    
    for (const codeData of allCodes) {
      const item = codeData.qrCode?.order_item || codeData.barcode?.order_item;
      
      try {
        // Her etiket için canvas oluştur
        const canvas = document.createElement('canvas');
        canvas.width = 378;
        canvas.height = 567;
        const ctx = canvas.getContext('2d');
        if (!ctx) continue;

        // Arka planı beyaz yap
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Canvas tainted hatası önlemek için doğrudan QR kod oluştur
        await new Promise(async (resolve) => {
          try {
            // QR kod için qrCode data kullan
            const qrData = codeData.qrCode?.qr_code || codeData.qrCode?.id || 'NO-QR-DATA';
            const qrCodeDataURL = await QRCode.toDataURL(qrData, {
              width: 200,
              margin: 1,
              color: {
                dark: '#000000',
                light: '#FFFFFF'
              }
            });

            const qrImage = new Image();
            qrImage.onload = () => {
              // QR kodu üst kısma yerleştir
              const qrSize = 200;
              const qrX = (canvas.width - qrSize) / 2;
              const qrY = 30;
              ctx.drawImage(qrImage, qrX, qrY, qrSize, qrSize);

              // Metin bilgilerini alt kısma ekle
              ctx.fillStyle = '#000000';
              ctx.textAlign = 'center';

              // Başlık
              ctx.font = 'bold 24px Arial';
              ctx.fillText('PAŞA HOME', canvas.width / 2, qrY + qrSize + 40);

              // Ürün adı (kalın) - en üstte
              ctx.font = 'bold 18px Arial';
              let textY = qrY + qrSize + 70;
              const productName = item.product.name.toUpperCase();
              if (productName.length > 25) {
                // Uzun ürün adlarını böl
                const words = productName.split(' ');
                const line1 = words.slice(0, Math.ceil(words.length / 2)).join(' ');
                const line2 = words.slice(Math.ceil(words.length / 2)).join(' ');
                ctx.fillText(line1, canvas.width / 2, textY);
                textY += 25;
                ctx.fillText(line2, canvas.width / 2, textY);
                textY += 35;
              } else {
                ctx.fillText(productName, canvas.width / 2, textY);
                textY += 35;
              }

              // Ürün bilgileri
              ctx.font = '16px Arial';
              
              ctx.fillText(`${item.width} x ${item.height}`, canvas.width / 2, textY);
              textY += 25;
              
              ctx.fillText(`Kesim: ${translateCutType(item.cut_type)}`, canvas.width / 2, textY);
              textY += 25;
              
              ctx.fillText(`Saçak: ${item.has_fringe ? 'Saçaklı' : 'Saçaksız'}`, canvas.width / 2, textY);
              textY += 25;

              // Ürün notu varsa ekle
              if (item.notes && item.notes.trim()) {
                ctx.font = '14px Arial';
                ctx.fillText(`Not: ${item.notes}`, canvas.width / 2, textY);
                textY += 20;
              }
              textY += 15;

              // QR kod ve sipariş bilgisi
              ctx.font = '14px Arial';
              const requiredScans = codeData.qrCode?.required_scans || 2;
              const barcodeQuantity = codeData.barcode?.quantity || 1;
              ctx.fillText(`Gerekli Tarama: ${requiredScans}`, canvas.width / 2, textY);
              textY += 20;
              ctx.fillText(`Sp. No: ${orderData.id.slice(0, 8)}`, canvas.width / 2, textY);
              textY += 20;
              if (codeData.qrCode?.id) {
                ctx.fillText(`QR ID: ${codeData.qrCode.id.slice(0, 8)}`, canvas.width / 2, textY);
                textY += 20;
              }
              if (codeData._labelIndex && codeData._totalLabels) {
                ctx.fillText(`Etiket: ${codeData._labelIndex}/${codeData._totalLabels}`, canvas.width / 2, textY);
                textY += 20;
              }
              ctx.fillText(`Tarih: ${new Date(orderData.created_at).toLocaleDateString('tr-TR')}`, canvas.width / 2, textY);

              // Barcode görseli HTML'de gösterilecek, burada text eklemeye gerek yok
              
              labelImages.push(canvas.toDataURL('image/png'));
              resolve(true);
            };
            
            qrImage.onerror = () => {
              console.error('QR kod görsel yükleme hatası');
              resolve(false);
            };
            
            qrImage.src = qrCodeDataURL;
          } catch (qrError) {
            console.error('QR kod oluşturma hatası:', qrError);
            resolve(false);
          }
        });
      } catch (error) {
        console.error('QR kod etiketi oluşturma hatası:', error);
      }
    }

    // Tüm etiketleri yazdır
    if (labelImages.length > 0) {
      const printWindow = window.open('', '_blank', 'width=800,height=600');
      if (printWindow) {
        const labelsHtml = allCodes.map((codeData, index) => {
          const labelDataURL = labelImages[index];
          const barcodeImageUrl = codeData.barcode?.barcode_image_url;
          const barcodeText = codeData.barcode?.barcode;
          
          // Barcode bilgisi var mı kontrolü
          const hasBarcode = !!(codeData.barcode && barcodeImageUrl);
          
          // Template için değişkenleri hazırla
          const safeImageUrl = barcodeImageUrl || '';
          const safeBarcodeText = barcodeText || '';
          const hasValidUrl = hasBarcode;
          
          return `
            <div class="label-page" ${index > 0 ? 'style="page-break-before: always;"' : ''}>
              <div class="qr-section">
                <img src="${labelDataURL}" alt="QR Kod Etiketi ${index + 1}" class="label-image">
              </div>
              <div class="barcode-section">
                ${hasValidUrl ? `
                  <img src="${safeImageUrl}" alt="Barcode ${safeBarcodeText}" class="barcode-image">
                  <div class="barcode-text">${safeBarcodeText}</div>
                ` : `
                  <div class="barcode-text">${safeBarcodeText || 'Barcode yükleniyor...'}</div>
                `}
              </div>
            </div>
          `;
        }).join('');

        const htmlContent = `
          <!DOCTYPE html>
          <html lang="tr">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>QR Kod Etiketleri - ${orderData.id.slice(0, 8)}</title>
            <style>
              @page {
                size: 10cm 15cm;
                margin: 0;
              }
              
              * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
              }
              
              body {
                font-family: 'Arial', sans-serif;
                background: white;
                margin: 0;
                padding: 0;
              }
              
              .label-page {
                width: 10cm;
                height: 15cm;
                margin: 0;
                padding: 0;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: space-between;
                background: white;
                page-break-inside: avoid;
                border: 1px solid #ccc;
              }
              
              .qr-section {
                height: 12cm;
                display: flex;
                align-items: center;
                justify-content: center;
                width: 100%;
                padding: 0.5cm;
              }
              
              .label-image {
                max-width: 9cm;
                max-height: 11cm;
                object-fit: contain;
                image-rendering: -webkit-optimize-contrast;
                image-rendering: crisp-edges;
              }

              .barcode-section {
                height: 3cm;
                width: 100%;
                padding: 0.3cm;
                text-align: center;
                background: #f9f9f9;
                border-top: 1px solid #ddd;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
              }

              .barcode-image {
                max-width: 8cm;
                height: auto;
                max-height: 1.5cm;
                object-fit: contain;
                margin-bottom: 5px;
              }
              
              .barcode-text {
                font-family: 'Courier New', monospace;
                font-size: 10px;
                font-weight: bold;
                color: #333;
                letter-spacing: 1px;
              }
              
              @media print {
                body {
                  -webkit-print-color-adjust: exact;
                  print-color-adjust: exact;
                }
                
                .label-page {
                  page-break-inside: avoid;
                  border: none;
                }
                
                .barcode-section {
                  background: white !important;
                  border-top: 1px solid #000 !important;
                }
                
                .barcode-text {
                  color: #000 !important;
                }
              }
            </style>
          </head>
          <body>
            ${labelsHtml}
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
              console.error('Yazdırma hatası:', error);
            }
            setTimeout(() => {
              try {
                printWindow.close();
              } catch (error) {
                console.error('Pencere kapatma hatası:', error);
              }
            }, 3000);
          }, 1500);
        };
      }
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
        {/* Header */}
        <div className="bg-indigo-600 text-white rounded-t-2xl p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="bg-white bg-opacity-20 rounded-xl p-2 mr-3">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h4" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold">QR Kod Etiketi</h3>
                <p className="text-indigo-100 text-sm mt-1">
                  10x15 cm Barkod Yazıcı Formatı
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
            <h4 className="text-lg font-semibold text-gray-900 mb-3">Etiket Önizleme</h4>
            <div className="flex justify-center mb-4">
              <canvas
                ref={canvasRef}
                className="border border-gray-300 rounded-lg shadow-sm"
                style={{ maxWidth: '200px', maxHeight: '300px' }}
              />
            </div>
            <div className="grid grid-cols-1 gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 font-medium">Sipariş:</span>
                <span className="text-gray-900">{orderData.id.slice(0, 8)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 font-medium">Mağaza:</span>
                <span className="text-gray-900 truncate">{orderData.store_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 font-medium">Durum:</span>
                <span className={`text-sm font-medium ${
                  orderData.status === 'CONFIRMED' ? 'text-green-600' :
                  orderData.status === 'PENDING' ? 'text-yellow-600' :
                  orderData.status === 'DELIVERED' ? 'text-blue-600' :
                  orderData.status === 'CANCELED' ? 'text-red-600' :
                  'text-gray-600'
                }`}>
                  {orderData.status === 'CONFIRMED' ? 'Onaylandı' :
                   orderData.status === 'PENDING' ? 'Bekliyor' :
                   orderData.status === 'DELIVERED' ? 'Teslim Edildi' :
                   orderData.status === 'CANCELED' ? 'İptal Edildi' :
                   orderData.status}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 font-medium">Toplam Ürün:</span>
                <span className="text-gray-900">{orderData.items.length} çeşit</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 font-medium">QR Kod/Barcode:</span>
                <span className="font-bold text-purple-600">
                  {(orderData.qr_codes?.length || 0) + (orderData.barcodes?.length || 0)} adet
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 font-medium">Tutar:</span>
                <span className="text-gray-900 font-bold">
                  ₺{Number(orderData.total_price).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
            
            {/* QR Kod/Barcode Listesi */}
            <div className="mt-4 bg-gray-100 rounded-lg p-3">
              <div className="text-sm font-medium text-gray-700 mb-2">QR Kodları & Barkodlar:</div>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {[...(orderData.qr_codes || []), ...(orderData.barcodes || [])].length > 0 ? (
                  [...(orderData.qr_codes || []), ...(orderData.barcodes || [])].map((code, index) => (
                    <div key={code?.id || index} className="flex justify-between text-xs">
                      <span className="text-gray-600 truncate">
                        {code?.order_item?.product?.name || 'Ürün bilgisi yok'} 
                        {code?.order_item?.width && code?.order_item?.height && 
                          ` (${code.order_item.width}x${code.order_item.height})`
                        }
                        {code?.barcode && ` - ${code.barcode}`}
                      </span>
                      <span className={`font-medium ml-2 ${
                        code?.is_scanned ? 'text-green-600' : 'text-gray-900'
                      }`}>
                        {code?.is_scanned ? 'Tarandı' : `${code?.required_scans || 2} tarama`}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-gray-500 italic">
                    Bu sipariş için henüz QR kod veya barcode oluşturulmamış
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-blue-800 text-sm">
                Bu etiket 10x15 cm boyutunda barkod yazıcı için optimize edilmiştir.
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
            disabled={!((orderData.qr_codes?.length || 0) + (orderData.barcodes?.length || 0))}
            className={`px-6 py-3 rounded-lg font-semibold transition-all shadow-md hover:shadow-lg flex items-center gap-2 ${
              ((orderData.qr_codes?.length || 0) + (orderData.barcodes?.length || 0)) > 0
                ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            {((orderData.qr_codes?.length || 0) + (orderData.barcodes?.length || 0)) > 0 ? 'QR Etiket Yazdır' : 'Kod Yok'}
          </button>
        </div>
      </div>
    </div>
  );
}
