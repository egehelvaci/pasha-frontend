'use client';

import { useEffect, useRef } from 'react';
import QRCode from 'qrcode';

// Tek ölçü kaynağı - mm → px dönüşümü (YAZICI DPI'ında)
const LABEL_W_MM = 80;   // 8 cm
const LABEL_H_MM = 100;  // 10 cm
const BARCODE_BAND_H_MM = 20; // 2 cm sabit barcode bandı
const PRINTER_DPI = 203; // Termal yazıcı DPI (203 yaygın, 300 ise değiştir)

const mmToPx = (mm: number, dpi = PRINTER_DPI) => Math.round((mm / 25.4) * dpi);
const LABEL_W_PX = mmToPx(LABEL_W_MM);    // 639px @ 203 DPI
const LABEL_H_PX = mmToPx(LABEL_H_MM);    // 799px @ 203 DPI
const BARCODE_BAND_H_PX = mmToPx(BARCODE_BAND_H_MM); // 158px @ 203 DPI
const CONTENT_BOTTOM_LIMIT = LABEL_H_PX - BARCODE_BAND_H_PX; // 641px

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
    store_type?: string;
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
      phone?: string;
      Store?: {
        store_type?: string;
      };
    };
    store_info?: {
      store_type?: string;
      store_type_display?: string;
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

// Store type çevirme fonksiyonu
const translateStoreType = (storeType: string): string => {
  const translations: { [key: string]: string } = {
    'kargo': 'Kargo',
    'servis': 'Servis',
    'kendi alan': 'Kendi Alan', 
    'ambar': 'Ambar'
  };
  
  return translations[storeType?.toLowerCase()] || storeType || 'Kargo';
};

// Kesim türüne göre işaret çizme fonksiyonu
const drawCutTypeIcon = (ctx: CanvasRenderingContext2D, cutType: string, x: number, y: number, size: number) => {
  const normalizedCutType = cutType?.toLowerCase() || 'standart';
  
  ctx.save();
  ctx.strokeStyle = '#000000';
  ctx.fillStyle = '#000000';
  ctx.lineWidth = 2;
  
  switch (normalizedCutType) {
    case 'oval':
      // Oval işaret
      ctx.beginPath();
      ctx.ellipse(x, y, size * 0.6, size * 0.3, 0, 0, 2 * Math.PI);
      ctx.stroke();
      break;
      
    case 'daire':
    case 'round':
      // Daire işaret
      ctx.beginPath();
      ctx.arc(x, y, size * 0.4, 0, 2 * Math.PI);
      ctx.stroke();
      break;
      
    case 'post kesim':
      // Post kesim işareti (dikdörtgen)
      ctx.beginPath();
      ctx.rect(x - size * 0.4, y - size * 0.3, size * 0.8, size * 0.6);
      ctx.stroke();
      break;
      
    case 'standart':
    case 'normal':
    case 'custom':
    case 'rectangle':
    default:
      // Standart kesim işareti (kare)
      ctx.beginPath();
      ctx.rect(x - size * 0.3, y - size * 0.3, size * 0.6, size * 0.6);
      ctx.stroke();
      break;
  }
  
  ctx.restore();
};

// Saçak durumuna göre işaret çizme fonksiyonu
const drawFringeIcon = (ctx: CanvasRenderingContext2D, hasFringe: boolean, x: number, y: number, size: number) => {
  ctx.save();
  ctx.strokeStyle = '#000000';
  ctx.fillStyle = '#000000';
  ctx.lineWidth = 2;
  
  if (hasFringe) {
    // Saçaklı - tırtıklı işaret (zigzag çizgi)
    ctx.beginPath();
    const zigzagWidth = size * 0.8;
    const zigzagHeight = size * 0.3;
    const startX = x - zigzagWidth / 2;
    const startY = y - zigzagHeight / 2;
    
    ctx.moveTo(startX, startY);
    for (let i = 0; i < 5; i++) {
      const xPos = startX + (zigzagWidth / 4) * i;
      const yPos = startY + (i % 2 === 0 ? zigzagHeight : 0);
      ctx.lineTo(xPos, yPos);
    }
    ctx.stroke();
  } else {
    // Saçaksız - düz çizgi
    ctx.beginPath();
    const lineWidth = size * 0.8;
    const lineHeight = size * 0.1;
    ctx.rect(x - lineWidth / 2, y - lineHeight / 2, lineWidth, lineHeight);
    ctx.fill();
  }
  
  ctx.restore();
};

// Store type'a göre işaret çizme fonksiyonu
const drawStoreTypeIcon = (ctx: CanvasRenderingContext2D, storeType: string, x: number, y: number, size: number) => {
  const normalizedStoreType = storeType?.toLowerCase() || 'kargo';
  
  ctx.save();
  ctx.strokeStyle = '#000000';
  ctx.fillStyle = '#000000';
  ctx.lineWidth = 2;
  
    switch (normalizedStoreType) {
      case 'kargo':
        // Kargo işareti (kamyon - FontAwesome benzeri)
        ctx.beginPath();
        // Kamyon kasası
        ctx.rect(x - size * 0.4, y - size * 0.2, size * 0.5, size * 0.4);
        ctx.stroke();
        // Kamyon kabini
        ctx.beginPath();
        ctx.rect(x + size * 0.1, y - size * 0.2, size * 0.3, size * 0.3);
        ctx.stroke();
        // Tekerlekler
        ctx.beginPath();
        ctx.arc(x - size * 0.2, y + size * 0.3, size * 0.1, 0, 2 * Math.PI);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(x + size * 0.25, y + size * 0.3, size * 0.1, 0, 2 * Math.PI);
        ctx.stroke();
        break;
        
      case 'servis':
        // Servis işareti (kamyon - FontAwesome benzeri)
        ctx.beginPath();
        // Kamyon kasası
        ctx.rect(x - size * 0.4, y - size * 0.2, size * 0.5, size * 0.4);
        ctx.stroke();
        // Kamyon kabini
        ctx.beginPath();
        ctx.rect(x + size * 0.1, y - size * 0.2, size * 0.3, size * 0.3);
        ctx.stroke();
        // Tekerlekler
        ctx.beginPath();
        ctx.arc(x - size * 0.2, y + size * 0.3, size * 0.1, 0, 2 * Math.PI);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(x + size * 0.25, y + size * 0.3, size * 0.1, 0, 2 * Math.PI);
        ctx.stroke();
        break;
      
      case 'kendi alan':
        // Kendi alan işareti (warehouse - FontAwesome benzeri)
        ctx.beginPath();
        // Ana bina gövdesi
        ctx.rect(x - size * 0.4, y - size * 0.2, size * 0.8, size * 0.4);
        ctx.stroke();
        // Üçgen çatı
        ctx.beginPath();
        ctx.moveTo(x - size * 0.4, y - size * 0.2);
        ctx.lineTo(x, y - size * 0.4);
        ctx.lineTo(x + size * 0.4, y - size * 0.2);
        ctx.closePath();
        ctx.stroke();
        // Kapı
        ctx.beginPath();
        ctx.rect(x - size * 0.1, y, size * 0.2, size * 0.2);
        ctx.stroke();
        // Pencereler
        ctx.beginPath();
        ctx.rect(x - size * 0.25, y - size * 0.1, size * 0.1, size * 0.1);
        ctx.stroke();
        ctx.beginPath();
        ctx.rect(x + size * 0.15, y - size * 0.1, size * 0.1, size * 0.1);
        ctx.stroke();
        break;
        
      case 'ambar':
        // Ambar işareti (warehouse - FontAwesome benzeri)
        ctx.beginPath();
        // Ana bina gövdesi
        ctx.rect(x - size * 0.4, y - size * 0.2, size * 0.8, size * 0.4);
        ctx.stroke();
        // Üçgen çatı
        ctx.beginPath();
        ctx.moveTo(x - size * 0.4, y - size * 0.2);
        ctx.lineTo(x, y - size * 0.4);
        ctx.lineTo(x + size * 0.4, y - size * 0.2);
        ctx.closePath();
        ctx.stroke();
        // Büyük yükleme kapısı
        ctx.beginPath();
        ctx.rect(x - size * 0.2, y - size * 0.05, size * 0.4, size * 0.25);
        ctx.stroke();
        // Küçük kapı
        ctx.beginPath();
        ctx.rect(x + size * 0.25, y, size * 0.1, size * 0.2);
        ctx.stroke();
        break;
      
    default:
      // Varsayılan işaret (kargo)
      ctx.beginPath();
      ctx.rect(x - size * 0.4, y - size * 0.3, size * 0.8, size * 0.6);
      ctx.stroke();
      break;
  }
  
  ctx.restore();
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
      // Canvas boyutlarını standart ölçülere ayarla
      canvas.width = LABEL_W_PX;   // 302
      canvas.height = LABEL_H_PX;  // 378

      // Arka planı beyaz yap
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Canvas tainted hatası önlemek için doğrudan QR kod oluştur
      try {
        // QR kod için barcode veya id kullan - YAZICI DPI'ında üret
        const qrData = firstCode.qr_code || firstCode.barcode || firstCode.id;
        const qrSize = Math.round(LABEL_W_PX * 0.7); // Yazıcı DPI'ında QR boyutu (0.5'ten 0.7'ye büyütüldü)
        const qrCodeDataURL = await QRCode.toDataURL(qrData, {
          width: qrSize,
          margin: 2,
          errorCorrectionLevel: 'M',
          type: 'image/png',
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        });

        const qrImage = new Image();
        qrImage.onload = () => {
          // Netlik için image smoothing'i kapat
          ctx.imageSmoothingEnabled = false;
          
          // YENİ LAYOUT: QR kodu büyütülmüş ve sağ köşede
          const qrDisplaySize = Math.round(LABEL_W_PX * 0.35);   // genişliğin %35'i (0.25'ten 0.35'e büyütüldü)
          const qrX = canvas.width - qrDisplaySize - mmToPx(3);   // sağdan 3mm boşluk
          const qrY = 10 + mmToPx(3);                             // üstten 10px + 3mm boşluk
          ctx.drawImage(qrImage, qrX, qrY, qrDisplaySize, qrDisplaySize);

          // Metin bilgilerini sol tarafta ekle
          ctx.fillStyle = '#000000';
          ctx.textAlign = 'left';  // Sola hizalı

          // Ürün adı - QR kodunun yanında (sol tarafta) - daha aşağı konumlandırıldı
          let textY = qrY + mmToPx(5); // QR kodunun hizasından başla
          const productFont = Math.round(LABEL_H_PX * 0.055);   // Orta boyut
          ctx.font = `bold ${productFont}px Arial`;
          const productName = firstItem.product.name.toUpperCase();
          const lineHeight = mmToPx(6); // Satır aralığı artırıldı
          
          // Sol taraf için alan hesaplama (QR kodunun yanı)
          const leftAreaWidth = qrX - mmToPx(6); // QR kodunun solundaki alan (3mm margin)
          const words = productName.split(' ');
          const lines: string[] = [];
          let currentLine = '';
          
          for (const word of words) {
            const testLine = currentLine ? `${currentLine} ${word}` : word;
            const testWidth = ctx.measureText(testLine).width;
            
            if (testWidth <= leftAreaWidth) {
              currentLine = testLine;
            } else {
              if (currentLine) {
                lines.push(currentLine);
                currentLine = word;
              } else {
                // Tek kelime çok uzunsa zorla böl
                lines.push(word);
              }
            }
          }
          
          if (currentLine) {
            lines.push(currentLine);
          }
          
          // Maksimum 2 satır göster (kompakt tasarım)
          const maxLines = 2;
          const displayLines = lines.slice(0, maxLines);
          
          // Eğer 2 satırdan fazla varsa son satırı "..." ile bitir
          if (lines.length > maxLines) {
            displayLines[maxLines - 1] = displayLines[maxLines - 1].slice(0, -3) + '...';
          }
          
          // Ürün adı satırlarını çiz
          for (const line of displayLines) {
            ctx.fillText(line, mmToPx(3), textY);
            textY += lineHeight;
          }
          
          textY += mmToPx(2); // Ekstra boşluk

          // Ürün bilgileri - Kompakt tasarım
          const infoFont = Math.round(LABEL_H_PX * 0.045);   // Küçük font
          ctx.font = `${infoFont}px Arial`;
          const infoLineHeight = mmToPx(5); // Ürün bilgileri için ayrı satır aralığı
          
          // Boyut bilgisi
          ctx.fillText(`${firstItem.width} x ${firstItem.height}`, mmToPx(3), textY);
          textY += infoLineHeight;
          
           // Kesim türü - kompakt + işaret çizimi
           drawCutTypeIcon(ctx, firstItem.cut_type, mmToPx(3), textY - mmToPx(1.5), mmToPx(3));
           const cutTypeText = `    ${translateCutType(firstItem.cut_type)}`;
           ctx.fillText(cutTypeText, mmToPx(3), textY);
           textY += infoLineHeight;
           
           // Saçak durumu - kompakt + işaret çizimi
           drawFringeIcon(ctx, firstItem.has_fringe, mmToPx(3), textY - mmToPx(1.5), mmToPx(3));
           const fringeText = `    ${firstItem.has_fringe ? 'Saçaklı' : 'Saçaksız'}`;
           ctx.fillText(fringeText, mmToPx(3), textY);
           textY += infoLineHeight;
           
          // Store type bilgisi - işaret ile
          const storeType = orderData.store_info?.store_type || orderData.user?.Store?.store_type || orderData.store_type || 'KARGO';
           
           drawStoreTypeIcon(ctx, storeType, mmToPx(3), textY - mmToPx(1.5), mmToPx(3));
           const storeTypeText = `    ${translateStoreType(storeType)}`;
           ctx.fillText(storeTypeText, mmToPx(3), textY);
           textY += mmToPx(6);

          // Ürün notu varsa ekle (kompakt) - satır bölme ile
          if (firstItem.notes && firstItem.notes.trim()) {
            // \n karakterlerini boşlukla değiştir ve fazla boşlukları temizle
            const cleanedNotes = firstItem.notes.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
            const noteText = `Not: ${cleanedNotes}`;
            const noteMaxWidth = leftAreaWidth; // QR kodunun yanındaki alanı kullan
            const noteWords = noteText.split(' ');
            const noteLines: string[] = [];
            let currentNoteLine = '';
            
            for (const word of noteWords) {
              const testLine = currentNoteLine ? `${currentNoteLine} ${word}` : word;
              const testWidth = ctx.measureText(testLine).width;
              
              if (testWidth <= noteMaxWidth) {
                currentNoteLine = testLine;
              } else {
                if (currentNoteLine) {
                  noteLines.push(currentNoteLine);
                  currentNoteLine = word;
                } else {
                  // Tek kelime çok uzunsa zorla böl
                  noteLines.push(word);
                }
              }
            }
            
            if (currentNoteLine) {
              noteLines.push(currentNoteLine);
            }
            
            // Maksimum 3 satır not göster (2'den 3'e çıkarıldı)
            const maxNoteLines = 3;
            const displayNoteLines = noteLines.slice(0, maxNoteLines);
            
            if (noteLines.length > maxNoteLines) {
              displayNoteLines[maxNoteLines - 1] = displayNoteLines[maxNoteLines - 1].slice(0, -3) + '...';
            }
            
            // Not satırlarını çiz
            for (const line of displayNoteLines) {
              ctx.fillText(line, mmToPx(3), textY);
              textY += mmToPx(4); // Not satır aralığı
            }
          }

          // FIRMA BİLGİLERİ VE ADRES - En alt kısımda, tam genişlik kullanılarak
          // Alt kısımda merkez hizalama ile firma bilgileri
          ctx.textAlign = 'center';
          
          // Firma adı - kalın ve belirgin
          const firmFont = Math.round(LABEL_H_PX * 0.05);   
          ctx.font = `bold ${firmFont}px Arial`;
          
          // Alt kısımdan barcode için yer ayırarak yukarı konumlandır - daha yukarıya alındı
          const CONTENT_BOTTOM_LIMIT = LABEL_H_PX - mmToPx(20); // 20mm barcode alanı
          let firmY = CONTENT_BOTTOM_LIMIT - mmToPx(25); // Barcode'dan 25mm yukarı
          
          // Firma adını satır satır böl eğer çok uzunsa
          const firmMaxWidth = canvas.width - mmToPx(6); // 3mm margin her yandan
          const firmWords = orderData.store_name.split(' ');
          const firmLines: string[] = [];
          let currentFirmLine = '';
          
          for (const word of firmWords) {
            const testLine = currentFirmLine ? `${currentFirmLine} ${word}` : word;
            const testWidth = ctx.measureText(testLine).width;
            
            if (testWidth <= firmMaxWidth) {
              currentFirmLine = testLine;
            } else {
              if (currentFirmLine) {
                firmLines.push(currentFirmLine);
                currentFirmLine = word;
              } else {
                // Tek kelime çok uzunsa zorla böl
                firmLines.push(word);
              }
            }
          }
          
          if (currentFirmLine) {
            firmLines.push(currentFirmLine);
          }
          
          // Maksimum 3 satır firma adı göster (2'den 3'e çıkarıldı)
          const maxFirmLines = 3;
          const displayFirmLines = firmLines.slice(0, maxFirmLines);
          
          if (firmLines.length > maxFirmLines) {
            displayFirmLines[maxFirmLines - 1] = displayFirmLines[maxFirmLines - 1].slice(0, -3) + '...';
          }
          
          // Firma adı satırlarını çiz
          for (const line of displayFirmLines) {
            ctx.fillText(line, canvas.width / 2, firmY);
            firmY += mmToPx(4); // Firma adı satır aralığı
          }
          
          // Firma adı ile title arası boşluk
          firmY += mmToPx(4);
          
          // Title alanını ekle (firma adının altında)
          if (orderData.address?.title) {
            const titleFont = Math.round(LABEL_H_PX * 0.038);
            ctx.font = `bold ${titleFont}px Arial`;
            ctx.fillText(orderData.address.title.toUpperCase(), canvas.width / 2, firmY);
            firmY += mmToPx(4); // Title ile adres arası boşluk
          }
          
          // Adres bilgisi - boyut artırıldı ve kalın yapıldı
          const addressFont = Math.round(LABEL_H_PX * 0.042);
          ctx.font = `bold ${addressFont}px Arial`;
          
          // Adres bilgisini şehir ve ilçe ile birlikte hazırla
          let addressText = orderData.address?.address || 'ANTARES AVM.AYVALI MAH.AFRA CAD.NO:1-238 ETLİK';
          
          // \n karakterlerini boşlukla değiştir ve fazla boşlukları temizle
          addressText = addressText.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
          
          if (orderData.address?.district || orderData.address?.city) {
            const locationParts = [];
            if (orderData.address?.district) locationParts.push(orderData.address.district);
            if (orderData.address?.city) locationParts.push(orderData.address.city);
            if (locationParts.length > 0) {
              addressText += ` - ${locationParts.join(' / ')}`;
            }
          } else {
            // Varsayılan adres için şehir/ilçe ekle
            addressText += ' - KEÇİÖREN / ANKARA';
          }
          const addressMaxWidth = canvas.width - mmToPx(6); // 3mm margin her yandan
          const addressWords = addressText.split(' ');
          const addressLines: string[] = [];
          let currentAddressLine = '';
          
          for (const word of addressWords) {
            const testLine = currentAddressLine ? `${currentAddressLine} ${word}` : word;
            const testWidth = ctx.measureText(testLine).width;
            
            if (testWidth <= addressMaxWidth) {
              currentAddressLine = testLine;
            } else {
              if (currentAddressLine) {
                addressLines.push(currentAddressLine);
                currentAddressLine = word;
              } else {
                addressLines.push(word);
              }
            }
          }
          
          if (currentAddressLine) {
            addressLines.push(currentAddressLine);
          }
          
          // Maksimum 4 satır adres göster (3'ten 4'e çıkarıldı)
          const maxAddressLines = 4;
          const displayAddressLines = addressLines.slice(0, maxAddressLines);
          
          if (addressLines.length > maxAddressLines) {
            displayAddressLines[maxAddressLines - 1] = displayAddressLines[maxAddressLines - 1].slice(0, -3) + '...';
          }
          
          // Adres satırlarını çiz - satır aralığı artırıldı
          for (const line of displayAddressLines) {
            ctx.fillText(line, canvas.width / 2, firmY);
            firmY += mmToPx(5); // Satır aralığı 3'ten 5'e çıkarıldı
          }
          
          // Telefon numarası adresin altına ekle - boşluk azaltıldı
          if (orderData.user?.phone || orderData.store_phone) {
            const phoneText = orderData.user?.phone || orderData.store_phone || '';
            if (phoneText) {
              firmY += mmToPx(3); // Boşluk azaltıldı (6'dan 3'e)
              
              // Telefon için daha küçük font
              const phoneFont = Math.round(LABEL_H_PX * 0.035);
              ctx.font = `bold ${phoneFont}px Arial`;
              
              ctx.fillText(`Tel: ${phoneText}`, canvas.width / 2, firmY);
              firmY += mmToPx(3); // Alt boşluk azaltıldı
            }
          }
          
          // PAŞA HOME yazısı kaldırıldı
          
              // QR kodunun üstündeki yazılar kaldırıldı

          // Barcode bandını sabit konumda çiz (alt 20mm)
          if (firstCode.barcode) {
            const barcodeImageUrl = firstCode.barcode_image_url;
            const bandStartY = CONTENT_BOTTOM_LIMIT;
            const bandCenterY = bandStartY + (BARCODE_BAND_H_PX / 2);
            
            if (barcodeImageUrl) {
              const barcodeImage = new Image();
              barcodeImage.crossOrigin = 'anonymous';
              barcodeImage.onload = () => {
                // Barcode görselini banda sığdır - daha da büyük boyut
                const maxBarcodeWidth = mmToPx(78); // 78mm max genişlik (daha da büyütüldü)
                const maxBarcodeHeight = mmToPx(18); // 18mm max boy (daha da büyütüldü)
                const barcodeX = (canvas.width - maxBarcodeWidth) / 2;
                const barcodeY = bandStartY + mmToPx(2); // Bandın üstünden 2mm boşluk
                
                ctx.drawImage(barcodeImage, barcodeX, barcodeY, maxBarcodeWidth, maxBarcodeHeight);
                
                // Barcode metnini banda sığdır
                ctx.font = 'bold 8px Arial';
                const textY = barcodeY + maxBarcodeHeight + mmToPx(2);
                ctx.fillText(firstCode.barcode, canvas.width / 2, textY);
              };
              barcodeImage.onerror = () => {
                // Görsel yüklenemezse sadece metni banda yerleştir
                ctx.font = '10px Arial';
                ctx.fillText(`Barcode: ${firstCode.barcode}`, canvas.width / 2, bandCenterY);
              };
              barcodeImage.src = barcodeImageUrl;
            } else {
              // Barcode görseli yoksa metni banda yerleştir
              ctx.font = '10px Arial';
              ctx.fillText(`Barcode: ${firstCode.barcode}`, canvas.width / 2, bandCenterY);
            }
          }
        };
        
        qrImage.src = qrCodeDataURL;
      } catch (qrError) {
        // QR kod oluşturma hatası
      }
    } catch (error) {
      // QR kod önizleme hatası
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
        canvas.width = LABEL_W_PX;   // 302
        canvas.height = LABEL_H_PX;  // 378
        const ctx = canvas.getContext('2d');
        if (!ctx) continue;

        // Arka planı beyaz yap
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Canvas tainted hatası önlemek için doğrudan QR kod oluştur
        await new Promise(async (resolve) => {
          try {
            // QR kod için qrCode data kullan - YAZICI DPI'ında üret
            const qrData = codeData.qrCode?.qr_code || codeData.qrCode?.id || 'NO-QR-DATA';
            const qrSize = Math.round(LABEL_W_PX * 0.7); // Yazıcı DPI'ında QR boyutu (0.5'ten 0.7'ye büyütüldü)
            const qrCodeDataURL = await QRCode.toDataURL(qrData, {
              width: qrSize,
              margin: 2,
              errorCorrectionLevel: 'M',
              type: 'image/png',
              color: {
                dark: '#000000',
                light: '#FFFFFF'
              }
            });

            const qrImage = new Image();
            qrImage.onload = () => {
              // Netlik için image smoothing'i kapat
              ctx.imageSmoothingEnabled = false;
              
              // YENİ LAYOUT: QR kodu büyütülmüş ve sağ köşede (yazdırma)
              const qrDisplaySize = Math.round(LABEL_W_PX * 0.35);   // genişliğin %35'i (0.25'ten 0.35'e büyütüldü)
              const qrX = canvas.width - qrDisplaySize - mmToPx(3);   // sağdan 3mm boşluk
              const qrY = 10 + mmToPx(3);                             // üstten 10px + 3mm boşluk
              ctx.drawImage(qrImage, qrX, qrY, qrDisplaySize, qrDisplaySize);

              // Metin bilgilerini sol tarafta ekle
              ctx.fillStyle = '#000000';
              ctx.textAlign = 'left';  // Sola hizalı

              // Ürün adı - QR kodunun yanında (sol tarafta) (yazdırma) - daha aşağı konumlandırıldı
              let textY = qrY + mmToPx(5); // QR kodunun hizasından başla
              const productFont = Math.round(LABEL_H_PX * 0.055);   // Orta boyut
              ctx.font = `bold ${productFont}px Arial`;
              const productName = item.product.name.toUpperCase();
              const lineHeight = mmToPx(6); // Satır aralığı artırıldı
              
              // Sol taraf için alan hesaplama (QR kodunun yanı)
              const leftAreaWidth = qrX - mmToPx(6); // QR kodunun solundaki alan (3mm margin)
              const words = productName.split(' ');
              const lines: string[] = [];
              let currentLine = '';
              
              for (const word of words) {
                const testLine = currentLine ? `${currentLine} ${word}` : word;
                const testWidth = ctx.measureText(testLine).width;
                
                if (testWidth <= leftAreaWidth) {
                  currentLine = testLine;
                } else {
                  if (currentLine) {
                    lines.push(currentLine);
                    currentLine = word;
                  } else {
                    // Tek kelime çok uzunsa zorla böl
                    lines.push(word);
                  }
                }
              }
              
              if (currentLine) {
                lines.push(currentLine);
              }
              
              // Maksimum 2 satır göster (kompakt tasarım)
              const maxLines = 2;
              const displayLines = lines.slice(0, maxLines);
              
              // Eğer 2 satırdan fazla varsa son satırı "..." ile bitir
              if (lines.length > maxLines) {
                displayLines[maxLines - 1] = displayLines[maxLines - 1].slice(0, -3) + '...';
              }
              
              // Ürün adı satırlarını çiz
              for (const line of displayLines) {
                ctx.fillText(line, mmToPx(3), textY);
                textY += lineHeight;
              }
              
              textY += mmToPx(2); // Ekstra boşluk

              // Ürün bilgileri - Kompakt tasarım (yazdırma)
              const infoFont = Math.round(LABEL_H_PX * 0.045);   // Küçük font
              ctx.font = `${infoFont}px Arial`;
              const infoLineHeight = mmToPx(5); // Ürün bilgileri için ayrı satır aralığı
              
              // Boyut bilgisi
              ctx.fillText(`${item.width} x ${item.height}`, mmToPx(3), textY);
              textY += infoLineHeight;
              
              // Kesim türü - kompakt + işaret çizimi
              drawCutTypeIcon(ctx, item.cut_type, mmToPx(3), textY - mmToPx(1.5), mmToPx(3));
              const cutTypeText = `    ${translateCutType(item.cut_type)}`;
              ctx.fillText(cutTypeText, mmToPx(3), textY);
              textY += infoLineHeight;
              
              // Saçak durumu - kompakt + işaret çizimi
              drawFringeIcon(ctx, item.has_fringe, mmToPx(3), textY - mmToPx(1.5), mmToPx(3));
              const fringeText = `    ${item.has_fringe ? 'Saçaklı' : 'Saçaksız'}`;
              ctx.fillText(fringeText, mmToPx(3), textY);
              textY += infoLineHeight;
              
              // Store type bilgisi - işaret ile (yazdırma)
              const storeType = orderData.store_info?.store_type || orderData.user?.Store?.store_type || orderData.store_type || 'KARGO';
              
              drawStoreTypeIcon(ctx, storeType, mmToPx(3), textY - mmToPx(1.5), mmToPx(3));
              const storeTypeText = `    ${translateStoreType(storeType)}`;
              ctx.fillText(storeTypeText, mmToPx(3), textY);
              textY += mmToPx(6);

              // Ürün notu varsa ekle (kompakt) - satır bölme ile (yazdırma)
              if (item.notes && item.notes.trim()) {
                // \n karakterlerini boşlukla değiştir ve fazla boşlukları temizle
                const cleanedNotes = item.notes.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
                const noteText = `Not: ${cleanedNotes}`;
                const noteMaxWidth = leftAreaWidth; // QR kodunun yanındaki alanı kullan
                const noteWords = noteText.split(' ');
                const noteLines: string[] = [];
                let currentNoteLine = '';
                
                for (const word of noteWords) {
                  const testLine = currentNoteLine ? `${currentNoteLine} ${word}` : word;
                  const testWidth = ctx.measureText(testLine).width;
                  
                  if (testWidth <= noteMaxWidth) {
                    currentNoteLine = testLine;
                  } else {
                    if (currentNoteLine) {
                      noteLines.push(currentNoteLine);
                      currentNoteLine = word;
                    } else {
                      // Tek kelime çok uzunsa zorla böl
                      noteLines.push(word);
                    }
                  }
                }
                
                if (currentNoteLine) {
                  noteLines.push(currentNoteLine);
                }
                
                // Maksimum 3 satır not göster (2'den 3'e çıkarıldı)
                const maxNoteLines = 3;
                const displayNoteLines = noteLines.slice(0, maxNoteLines);
                
                if (noteLines.length > maxNoteLines) {
                  displayNoteLines[maxNoteLines - 1] = displayNoteLines[maxNoteLines - 1].slice(0, -3) + '...';
                }
                
                // Not satırlarını çiz (yazdırma)
                for (const line of displayNoteLines) {
                  ctx.fillText(line, mmToPx(3), textY);
                  textY += mmToPx(4); // Not satır aralığı (yazdırma)
                }
              }

              // FIRMA BİLGİLERİ VE ADRES - En alt kısımda (yazdırma)
              ctx.textAlign = 'center';
              
              // Firma adı - kalın ve belirgin
              const firmFont = Math.round(LABEL_H_PX * 0.05);   
              ctx.font = `bold ${firmFont}px Arial`;
              
              // Alt kısımdan barcode için yer ayırarak yukarı konumlandır - daha yukarıya alındı
              const CONTENT_BOTTOM_LIMIT = LABEL_H_PX - mmToPx(20); // 20mm barcode alanı
              let firmY = CONTENT_BOTTOM_LIMIT - mmToPx(25); // Barcode'dan 25mm yukarı
              
              // Firma adını satır satır böl eğer çok uzunsa (yazdırma)
              const firmMaxWidth = canvas.width - mmToPx(6); // 3mm margin her yandan
              const firmWords = orderData.store_name.split(' ');
              const firmLines: string[] = [];
              let currentFirmLine = '';
              
              for (const word of firmWords) {
                const testLine = currentFirmLine ? `${currentFirmLine} ${word}` : word;
                const testWidth = ctx.measureText(testLine).width;
                
                if (testWidth <= firmMaxWidth) {
                  currentFirmLine = testLine;
                } else {
                  if (currentFirmLine) {
                    firmLines.push(currentFirmLine);
                    currentFirmLine = word;
                  } else {
                    // Tek kelime çok uzunsa zorla böl
                    firmLines.push(word);
                  }
                }
              }
              
              if (currentFirmLine) {
                firmLines.push(currentFirmLine);
              }
              
              // Maksimum 3 satır firma adı göster (2'den 3'e çıkarıldı)
              const maxFirmLines = 3;
              const displayFirmLines = firmLines.slice(0, maxFirmLines);
              
              if (firmLines.length > maxFirmLines) {
                displayFirmLines[maxFirmLines - 1] = displayFirmLines[maxFirmLines - 1].slice(0, -3) + '...';
              }
              
              // Firma adı satırlarını çiz (yazdırma)
              for (const line of displayFirmLines) {
                ctx.fillText(line, canvas.width / 2, firmY);
                firmY += mmToPx(4); // Firma adı satır aralığı (yazdırma)
              }
              
              // Firma adı ile title arası boşluk (yazdırma)
              firmY += mmToPx(4);
              
              // Title alanını ekle (firma adının altında) (yazdırma)
              if (orderData.address?.title) {
                const titleFont = Math.round(LABEL_H_PX * 0.038);
                ctx.font = `bold ${titleFont}px Arial`;
                ctx.fillText(orderData.address.title.toUpperCase(), canvas.width / 2, firmY);
                firmY += mmToPx(4); // Title ile adres arası boşluk
              }
              
              // Adres bilgisi - boyut artırıldı ve kalın yapıldı
              const addressFont = Math.round(LABEL_H_PX * 0.042);
              ctx.font = `bold ${addressFont}px Arial`;
              
              // Adres bilgisini şehir ve ilçe ile birlikte hazırla
              let addressText = orderData.address?.address || 'ANTARES AVM.AYVALI MAH.AFRA CAD.NO:1-238 ETLİK';
              
              // \n karakterlerini boşlukla değiştir ve fazla boşlukları temizle
              addressText = addressText.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
              
              if (orderData.address?.district || orderData.address?.city) {
                const locationParts = [];
                if (orderData.address?.district) locationParts.push(orderData.address.district);
                if (orderData.address?.city) locationParts.push(orderData.address.city);
                if (locationParts.length > 0) {
                  addressText += ` - ${locationParts.join(' / ')}`;
                }
              } else {
                // Varsayılan adres için şehir/ilçe ekle
                addressText += ' - KEÇİÖREN / ANKARA';
              }
              const addressMaxWidth = canvas.width - mmToPx(6); // 3mm margin her yandan
              const addressWords = addressText.split(' ');
              const addressLines: string[] = [];
              let currentAddressLine = '';
              
              for (const word of addressWords) {
                const testLine = currentAddressLine ? `${currentAddressLine} ${word}` : word;
                const testWidth = ctx.measureText(testLine).width;
                
                if (testWidth <= addressMaxWidth) {
                  currentAddressLine = testLine;
                } else {
                  if (currentAddressLine) {
                    addressLines.push(currentAddressLine);
                    currentAddressLine = word;
                  } else {
                    addressLines.push(word);
                  }
                }
              }
              
              if (currentAddressLine) {
                addressLines.push(currentAddressLine);
              }
              
              // Maksimum 4 satır adres göster (3'ten 4'e çıkarıldı)
              const maxAddressLines = 4;
              const displayAddressLines = addressLines.slice(0, maxAddressLines);
              
              if (addressLines.length > maxAddressLines) {
                displayAddressLines[maxAddressLines - 1] = displayAddressLines[maxAddressLines - 1].slice(0, -3) + '...';
              }
              
              // Adres satırlarını çiz - satır aralığı artırıldı
              for (const line of displayAddressLines) {
                ctx.fillText(line, canvas.width / 2, firmY);
                firmY += mmToPx(5); // Satır aralığı 3'ten 5'e çıkarıldı
              }
              
              // Telefon numarası adresin altına ekle - boşluk azaltıldı (yazdırma)
              if (orderData.user?.phone || orderData.store_phone) {
                const phoneText = orderData.user?.phone || orderData.store_phone || '';
                if (phoneText) {
                  firmY += mmToPx(3); // Boşluk azaltıldı (6'dan 3'e)
                  
                  // Telefon için daha küçük font (yazdırma)
                  const phoneFont = Math.round(LABEL_H_PX * 0.035);
                  ctx.font = `bold ${phoneFont}px Arial`;
                  
                  ctx.fillText(`Tel: ${phoneText}`, canvas.width / 2, firmY);
                  firmY += mmToPx(3); // Alt boşluk azaltıldı
                }
              }
              
              // PAŞA HOME yazısı kaldırıldı (yazdırma)
              
              // QR kodunun üstündeki yazılar kaldırıldı

              // Barcode görseli HTML'de gösterilecek, burada text eklemeye gerek yok
              
              labelImages.push(canvas.toDataURL('image/png'));
              resolve(true);
            };
            
            qrImage.onerror = () => {
              resolve(false);
            };
            
            qrImage.src = qrCodeDataURL;
          } catch (qrError) {
            resolve(false);
          }
        });
      } catch (error) {
        // QR kod etiketi oluşturma hatası
      }
    }

    // Tüm etiketleri yazdır
    if (labelImages.length > 0) {
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
            <div class="sheet">
              <div class="label-page">
                <div class="qr-section">
                  <img src="${labelDataURL}" alt="QR Kod Etiketi ${index + 1}" class="label-image">
                </div>
                <div class="barcode-section">
                  ${hasValidUrl ? `
                    <img src="${safeImageUrl}" alt="Barcode ${safeBarcodeText}" class="barcode-image">
                  ` : `
                    <div class="barcode-text">${safeBarcodeText || ''}</div>
                  `}
                </div>
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
                size: 80mm 100mm; 
                margin: 0; 
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              
              /* ŞABLONU SAYFA MERKEZİNE KİLİTLE */
              html, body { 
                width: 80mm;
                height: 100mm;
                margin: 0; 
                padding: 0; 
                font-family: Arial, sans-serif;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              
              .sheet {
                width: 80mm;
                height: 100mm;
                display: flex;
                align-items: center;     /* dikey merkez */
                justify-content: center; /* yatay merkez */
                page-break-after: always;
              }
              
              * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
              }
              
              /* Etiket kutusu - artık .sheet içinde ortalanmış */
              .label-page {
                width: 80mm; 
                height: 100mm;
                margin: 0;
                padding: 0;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: space-between;
                background: white;
                overflow: hidden;
                break-inside: avoid;
              }
              
              .qr-section { 
                height: 80mm; 
                display: flex; 
                align-items: center; 
                justify-content: center; 
                width: 100%;
                padding: 2mm;
                overflow: hidden;
              }
              
              /* Canvas'tan gelen PNG'nin tam oturması için - Barcode yazıcı optimizasyonu */
              .label-image { 
                width: 80mm; 
                height: 80mm; 
                object-fit: contain;
                image-rendering: -webkit-optimize-contrast;
                image-rendering: crisp-edges;
                image-rendering: pixelated;
                -ms-interpolation-mode: nearest-neighbor;
                page-break-inside: avoid !important;
                break-inside: avoid !important;
                max-width: 80mm !important;
                max-height: 80mm !important;
              }

              .barcode-section { 
                height: 20mm; 
                width: 100%;
                padding: 2mm;
                text-align: center;
                background: #f9f9f9;
                border-top: 1px solid #ddd;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                page-break-inside: avoid !important;
                break-inside: avoid !important;
                overflow: hidden;
              }

              .barcode-image { 
                max-width: 78mm; 
                max-height: 18mm;
                object-fit: contain;
                margin-bottom: 1mm;
                image-rendering: -webkit-optimize-contrast;
                image-rendering: crisp-edges;
                image-rendering: pixelated;
                -ms-interpolation-mode: nearest-neighbor;
              }
              
              .barcode-text {
                font-family: 'Courier New', monospace;
                font-size: 8px;
                font-weight: bold;
                color: #333;
                letter-spacing: 0.5px;
              }
              
              @media print {
                /* Barcode yazıcı optimizasyonları + Tek sayfa zorlaması */
                body {
                  -webkit-print-color-adjust: exact;
                  print-color-adjust: exact;
                  color-adjust: exact;
                  margin: 0 !important;
                  padding: 0 !important;
                }
                
                .label-page { 
                  border: none !important;
                  background: white !important;
                  page-break-inside: avoid !important;
                  page-break-before: always !important;
                  page-break-after: always !important;
                  break-inside: avoid !important;
                  break-before: always !important;
                  break-after: always !important;
                  position: relative !important;
                  overflow: hidden !important;
                  box-sizing: border-box !important;
                }
                
                .qr-section {
                  page-break-inside: avoid !important;
                  break-inside: avoid !important;
                  overflow: hidden !important;
                }
                
                .barcode-section {
                  background: white !important;
                  border-top: 1px solid #000 !important;
                  page-break-inside: avoid !important;
                  break-inside: avoid !important;
                  overflow: hidden !important;
                }
                
                .barcode-text {
                  color: #000 !important;
                }
                
                /* QR ve Barcode görsellerinin net çıkması için */
                .label-image, .barcode-image {
                  -webkit-filter: contrast(1.2) brightness(1.1);
                  filter: contrast(1.2) brightness(1.1);
                  page-break-inside: avoid !important;
                  break-inside: avoid !important;
                }
                
                /* Sayfa içeriğinin taşmasını engelle */
                * {
                  page-break-inside: avoid !important;
                  break-inside: avoid !important;
                }
              }
            </style>
          </head>
          <body>
            ${labelsHtml}
          </body>
          </html>
        `;

      // Popup blocker kontrolü
      const printWindow = window.open('', '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes');
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        
        printWindow.onload = () => {
          
          // Yazdırma ayarları uyarısı kaldırıldı
          
          // Yazdırma sayfasını başlat
          setTimeout(() => {
            try {
              printWindow.focus();
              printWindow.print();
            } catch (error) {
              alert('Yazdırma hatası: ' + (error instanceof Error ? error.message : 'Bilinmeyen hata'));
            }
            
            // Pencereyi 5 saniye sonra kapat (kullanıcı yazdırma dialog'unu görebilsin)
            setTimeout(() => {
              try {
                printWindow.close();
              } catch (error) {
              }
            }, 5000);
          }, 1000);
        };
      } else {
        // Popup bloklandı - kullanıcıya bilgi ver ve alternatif çözüm sun
        
        // Alternatif: Blob URL kullanarak dosya indirme
        const htmlBlob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(htmlBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `QR-Etiketleri-${orderData.id.slice(0, 8)}.html`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        alert('🚫 Popup bloklandı!\n\n✅ Alternatif: HTML dosyası indirildi.\n\n📖 Nasıl yazdırılır:\n1. İndirilen HTML dosyasını açın\n2. Ctrl+P ile yazdırın\n3. Boyut: 80mm × 100mm seçin');
      }
    } else {
      alert('❌ Yazdırılacak etiket bulunamadı. QR kod veya barcode oluşturulduktan sonra tekrar deneyin.');
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] shadow-2xl flex flex-col">
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
                  8x10 cm Barkod Yazıcı Formatı
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
        <div className="p-6 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Etiket Önizleme */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-lg font-semibold text-gray-900 mb-3">Etiket Önizleme</h4>
              <div className="flex justify-center mb-4">
                <canvas
                  ref={canvasRef}
                  className="border border-gray-300 rounded-lg shadow-sm"
                  style={{ maxWidth: '200px', maxHeight: '300px' }}
                />
              </div>
            </div>

            {/* Sipariş Detayları */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h4 className="text-lg font-semibold text-gray-900 mb-3">Sipariş Detayları</h4>
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
              <div className="space-y-1 max-h-48 overflow-y-auto">
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
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-blue-800 text-sm">
                Bu etiket 80mm × 100mm boyutunda barcode yazıcı için optimize edilmiştir.
              </p>
            </div>
          </div>


        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 rounded-b-2xl flex justify-end gap-3 flex-shrink-0">
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

