'use client';

import { useEffect, useRef } from 'react';
import QRCode from 'qrcode';

interface OrderItem {
  id: string;
  product: {
    name: string;
  };
  width: string;
  height: string;
  has_fringe: boolean;
  cut_type: string;
  quantity: number;
  notes?: string;
}

interface QRLabelProps {
  orderData: {
    id: string;
    store_name: string;
    notes?: string;
    items: OrderItem[];
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
    if (isVisible && canvasRef.current) {
      generatePreviewQRCode();
    }
  }, [isVisible, orderData]);

  // Önizleme için ilk ürünün QR kodunu oluştur
  const generatePreviewQRCode = async () => {
    if (!canvasRef.current || !orderData.items.length) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const firstItem = orderData.items[0];
    
    // QR kod verisi - ürün bilgilerini JSON formatında
    const qrData = JSON.stringify({
      urun: firstItem.product.name,
      ebat: `${firstItem.width} x ${firstItem.height}`,
      kesim: firstItem.has_fringe ? 'Saçaklı' : 'Saçaksız',
      miktar: 1, // Önizleme için 1 adet
      siparis: orderData.id,
      magaza: orderData.store_name,
      tarih: new Date().toLocaleDateString('tr-TR')
    });

    try {
      // QR kod oluştur
      const qrCodeDataURL = await QRCode.toDataURL(qrData, {
        width: 200,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      // Canvas boyutlarını 10x15 cm (378x567 piksel @ 96 DPI) olarak ayarla
      canvas.width = 378;
      canvas.height = 567;

      // Arka planı beyaz yap
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // QR kod görselini yükle
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

        // Ürün bilgileri
        ctx.font = '16px Arial';
        let textY = qrY + qrSize + 70;
        
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

        // Ürün adı (kalın)
        ctx.font = 'bold 18px Arial';
        ctx.fillText(firstItem.product.name.toUpperCase(), canvas.width / 2, textY);
        textY += 35;

        // Miktar ve sipariş bilgisi
        ctx.font = '14px Arial';
        ctx.fillText(`Toplam 1 Prç.`, canvas.width / 2, textY);
        textY += 20;
        ctx.fillText(`Sp. No: ${orderData.id.slice(0, 8)}`, canvas.width / 2, textY);


      };
      
      qrImage.src = qrCodeDataURL;
    } catch (error) {
      console.error('QR kod oluşturma hatası:', error);
    }
  };



  const handlePrint = async () => {
    if (!orderData.items.length) return;

    // Tüm QR etiketlerini oluştur
    const allLabels: string[] = [];
    
    for (const item of orderData.items) {
      for (let i = 0; i < item.quantity; i++) {
        const qrData = JSON.stringify({
          urun: item.product.name,
          ebat: `${item.width} x ${item.height}`,
          kesim: item.has_fringe ? 'Saçaklı' : 'Saçaksız',
          miktar: i + 1,
          toplam: item.quantity,
          siparis: orderData.id,
          magaza: orderData.store_name,
          tarih: new Date().toLocaleDateString('tr-TR')
        });

        try {
          const qrCodeDataURL = await QRCode.toDataURL(qrData, {
            width: 200,
            margin: 1,
            color: {
              dark: '#000000',
              light: '#FFFFFF'
            }
          });

          // Her etiket için canvas oluştur
          const canvas = document.createElement('canvas');
          canvas.width = 378;
          canvas.height = 567;
          const ctx = canvas.getContext('2d');
          if (!ctx) continue;

          // Arka planı beyaz yap
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          // QR kod görselini yükle
          await new Promise((resolve) => {
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

              // Ürün bilgileri
              ctx.font = '16px Arial';
              let textY = qrY + qrSize + 70;
              
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

              // Ürün adı (kalın)
              ctx.font = 'bold 18px Arial';
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

              // Miktar ve sipariş bilgisi
              ctx.font = '14px Arial';
              ctx.fillText(`Toplam ${item.quantity} Prç.`, canvas.width / 2, textY);
              textY += 20;
              ctx.fillText(`Sp. No: ${orderData.id.slice(0, 8)}`, canvas.width / 2, textY);



              allLabels.push(canvas.toDataURL('image/png'));
              resolve(true);
            };
            qrImage.src = qrCodeDataURL;
          });
        } catch (error) {
          console.error('QR kod oluşturma hatası:', error);
        }
      }
    }

    // Tüm etiketleri yazdır
    if (allLabels.length > 0) {
      const printWindow = window.open('', '_blank', 'width=800,height=600');
      if (printWindow) {
        const labelsHtml = allLabels.map((labelDataURL, index) => `
          <div class="label-page" ${index > 0 ? 'style="page-break-before: always;"' : ''}>
            <img src="${labelDataURL}" alt="QR Kod Etiketi ${index + 1}" class="label-image">
          </div>
        `).join('');

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
                align-items: center;
                justify-content: center;
                background: white;
                page-break-inside: avoid;
              }
              
              .label-image {
                width: 10cm;
                height: 15cm;
                object-fit: contain;
                image-rendering: -webkit-optimize-contrast;
                image-rendering: crisp-edges;
              }
              
              @media print {
                body {
                  -webkit-print-color-adjust: exact;
                  print-color-adjust: exact;
                }
                
                .label-page {
                  page-break-inside: avoid;
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
                <span className="text-gray-900">{orderData.store_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 font-medium">Toplam Ürün:</span>
                <span className="text-gray-900">{orderData.items.length} çeşit</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 font-medium">Toplam Etiket:</span>
                <span className="text-gray-900 font-bold text-purple-600">
                  {orderData.items.reduce((total, item) => total + item.quantity, 0)} adet
                </span>
              </div>
            </div>
            
            {/* Ürün Listesi */}
            <div className="mt-4 bg-gray-100 rounded-lg p-3">
              <div className="text-sm font-medium text-gray-700 mb-2">Yazdırılacak Etiketler:</div>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {orderData.items.map((item, index) => (
                  <div key={index} className="flex justify-between text-xs">
                    <span className="text-gray-600 truncate">
                      {item.product.name} ({item.width}x{item.height})
                    </span>
                    <span className="text-gray-900 font-medium ml-2">
                      {item.quantity} etiket
                    </span>
                  </div>
                ))}
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
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold transition-all shadow-md hover:shadow-lg flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            QR Etiket Yazdır
          </button>
        </div>
      </div>
    </div>
  );
}
