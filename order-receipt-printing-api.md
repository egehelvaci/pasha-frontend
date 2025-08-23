# Sipariş Fiş Yazdırma Sistemi API Dokümantasyonu

## Genel Bakış

Bu sistem, siparişlerde fiş yazdırma durumunu takip etmek için geliştirilmiştir. Kullanıcılar sadece onaylanan (CONFIRMED) ve teslim edilen (DELIVERED) siparişlerin fişlerini yazdırabilir ve bu durum veritabanında takip edilir.

## Veritabanı Değişiklikleri

### Order Tablosu Yeni Alanları

```sql
-- Fiş yazdırma durumu (varsayılan: false)
receipt_printed BOOLEAN DEFAULT false

-- Fiş yazdırma tarihi (opsiyonel)
receipt_printed_at TIMESTAMP
```

## API Endpoint'leri

### 1. Fiş Yazdırma Durumunu İşaretleme

**Endpoint:** `PUT /orders/:orderId/mark-printed`

**Açıklama:** Belirtilen siparişin fişinin yazdırıldığını işaretler.

**Yetkilendirme:** Bearer Token gerekli

**Parametreler:**
- `orderId` (path): Sipariş ID'si

**Koşullar:**
- Sipariş durumu `CONFIRMED` veya `DELIVERED` olmalı
- Fiş daha önce yazdırılmamış olmalı
- **Sadece admin kullanıcıları bu işlemi yapabilir**

**Başarılı Yanıt (200):**
```json
{
  "success": true,
  "message": "Fiş yazdırma durumu güncellendi",
  "data": {
    "id": "order-uuid",
    "status": "CONFIRMED",
    "receipt_printed": true,
    "receipt_printed_at": "2024-01-15T10:30:00.000Z",
    "total_price": "1500.00",
    "created_at": "2024-01-15T09:00:00.000Z"
  }
}
```

**Hata Yanıtları:**

```json
// Sipariş bulunamadı (404)
{
  "success": false,
  "message": "Sipariş bulunamadı"
}

// Yetki yok (403)
{
  "success": false,
  "message": "Fiş yazdırma işlemi sadece admin kullanıcıları tarafından yapılabilir"
}

// Geçersiz durum (400)
{
  "success": false,
  "message": "PENDING durumundaki siparişin fişi yazdırılamaz. Sadece onaylanmış (CONFIRMED) veya teslim edilmiş (DELIVERED) siparişlerin fişi yazdırılabilir."
}

// Zaten yazdırılmış (400)
{
  "success": false,
  "message": "Bu siparişin fişi zaten yazdırılmış"
}
```

### 2. Sipariş Listesi (Filtrelenmiş)

**Endpoint:** `GET /orders/my-orders`

**Açıklama:** Kullanıcının siparişlerini listeler, fiş yazdırma durumuna göre filtreleme yapılabilir.

**Yetkilendirme:** Bearer Token gerekli

**Query Parametreleri:**
- `page` (opsiyonel): Sayfa numarası (varsayılan: 1)
- `limit` (opsiyonel): Sayfa başına kayıt sayısı (varsayılan: 10)
- `status` (opsiyonel): Sipariş durumu filtresi
- `receiptPrinted` (opsiyonel): Fiş yazdırma durumu filtresi
  - `true`: Sadece fişi yazdırılan siparişler
  - `false`: Sadece fişi yazdırılmayan siparişler

**Örnek Kullanımlar:**

```bash
# Fiş yazdırılmayan siparişleri listele
GET /orders/my-orders?receiptPrinted=false

# Fiş yazdırılan siparişleri listele
GET /orders/my-orders?receiptPrinted=true

# Onaylanan ve fişi yazdırılmayan siparişleri listele
GET /orders/my-orders?status=CONFIRMED&receiptPrinted=false

# Sayfalama ile birlikte
GET /orders/my-orders?receiptPrinted=false&page=2&limit=20
```

**Başarılı Yanıt (200):**
```json
{
  "success": true,
  "data": {
    "orders": [
      {
        "id": "order-uuid-1",
        "user_id": "user-uuid",
        "total_price": "1500.00",
        "status": "CONFIRMED",
        "receipt_printed": false,
        "receipt_printed_at": null,
        "created_at": "2024-01-15T09:00:00.000Z",
        "updated_at": "2024-01-15T09:30:00.000Z",
        "items": [...],
        "user": {
          "name": "Ahmet",
          "surname": "Yılmaz",
          "email": "ahmet@example.com",
          "username": "ahmet123"
        },
        "address": {
          "title": "Ana Mağaza",
          "address": "İstanbul Cad. No:123",
          "city": "İstanbul",
          "district": "Kadıköy"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "totalPages": 3
    }
  }
}
```

## Kullanım Senaryoları

### 1. Admin Panel'de Fiş Yazdırma Butonu

```javascript
// Admin kullanıcısı için fiş yazdır butonuna tıklandığında
async function printReceipt(orderId) {
  try {
    // Önce fişi al ve yazdır
    const receiptResponse = await fetch(`/orders/${orderId}/receipt`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    
    if (receiptResponse.ok) {
      const receiptData = await receiptResponse.json();
      
      // Fiş yazdırma işlemi (browser print, PDF oluşturma vb.)
      printDocument(receiptData.data);
      
      // Yazdırma başarılıysa durumu işaretle (sadece admin yapabilir)
      const markResponse = await fetch(`/orders/${orderId}/mark-printed`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      
      if (markResponse.ok) {
        console.log('Fiş yazdırma durumu güncellendi');
        // UI'ı güncelle
        updateOrderStatus(orderId, true);
      } else {
        const errorData = await markResponse.json();
        if (markResponse.status === 403) {
          alert('Bu işlem sadece admin kullanıcıları tarafından yapılabilir');
        }
      }
    }
  } catch (error) {
    console.error('Fiş yazdırma hatası:', error);
  }
}

// Kullanıcı tipini kontrol et ve butonu göster/gizle
function showPrintButtonIfAdmin(userType, orderId) {
  if (userType === 'admin') {
    document.getElementById('printButton').style.display = 'block';
    document.getElementById('printButton').onclick = () => printReceipt(orderId);
  } else {
    document.getElementById('printButton').style.display = 'none';
  }
}
```

### 2. Fiş Yazdırılmayan Siparişleri Listeleme

```javascript
// Fiş yazdırılmayan siparişleri getir
async function getUnprintedOrders() {
  try {
    const response = await fetch('/orders/my-orders?receiptPrinted=false', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (response.ok) {
      const data = await response.json();
      displayOrders(data.data.orders);
    }
  } catch (error) {
    console.error('Sipariş listesi hatası:', error);
  }
}
```

### 3. Sipariş Durumu Kontrolü

```javascript
// Sipariş detayında fiş durumunu göster
function displayOrderStatus(order) {
  const canPrintReceipt = ['CONFIRMED', 'DELIVERED'].includes(order.status);
  const isReceiptPrinted = order.receipt_printed;
  
  if (canPrintReceipt && !isReceiptPrinted) {
    // "Fiş Yazdır" butonu göster
    showPrintButton(order.id);
  } else if (isReceiptPrinted) {
    // "Fiş Yazdırıldı" durumu göster
    showPrintedStatus(order.receipt_printed_at);
  } else {
    // Fiş yazdırma mevcut değil
    showNotAvailable();
  }
}
```

## Güvenlik ve Yetkilendirme

### Erişim Kontrolleri

1. **Kullanıcı Doğrulama**: Tüm endpoint'ler Bearer Token gerektirir
2. **Admin Yetkisi**: **Sadece admin kullanıcıları fiş yazdırma işlemini yapabilir**
3. **Durum Kontrolü**: Sadece uygun durumdaki siparişler işlenebilir
4. **Sipariş Listesi**: Normal kullanıcılar kendi siparişlerini, adminler tüm siparişleri görebilir

### Veri Doğrulama

1. **Sipariş Durumu**: Sadece `CONFIRMED` ve `DELIVERED` siparişler
2. **Tekrar İşaretleme**: Zaten yazdırılmış fiş tekrar işaretlenemez
3. **Geçerli UUID**: Sipariş ID'si geçerli UUID formatında olmalı

## Hata Yönetimi

### HTTP Durum Kodları

- `200`: Başarılı işlem
- `400`: Geçersiz istek (durum uygun değil, zaten yazdırılmış vb.)
- `401`: Yetkilendirme gerekli
- `403`: Erişim yetkisi yok
- `404`: Sipariş bulunamadı
- `500`: Sunucu hatası

### Hata Mesajları

Tüm hata mesajları Türkçe olarak döndürülür ve kullanıcı dostu açıklamalar içerir.

## Veritabanı Sorgulama Örnekleri

### Fiş Yazdırılmayan Siparişleri Bulma

```sql
SELECT * FROM "Order" 
WHERE status IN ('CONFIRMED', 'DELIVERED') 
  AND receipt_printed = false;
```

### Belirli Tarih Aralığında Yazdırılan Fişler

```sql
SELECT * FROM "Order" 
WHERE receipt_printed = true 
  AND receipt_printed_at BETWEEN '2024-01-01' AND '2024-01-31';
```

### Mağaza Bazında Fiş İstatistikleri

```sql
SELECT 
  s.kurum_adi,
  COUNT(*) as toplam_siparis,
  COUNT(CASE WHEN o.receipt_printed = true THEN 1 END) as yazdirilan_fis,
  COUNT(CASE WHEN o.receipt_printed = false AND o.status IN ('CONFIRMED', 'DELIVERED') THEN 1 END) as bekleyen_fis
FROM "Order" o
JOIN "User" u ON o.user_id = u.user_id
JOIN "Store" s ON u.store_id = s.store_id
WHERE o.status IN ('CONFIRMED', 'DELIVERED')
GROUP BY s.store_id, s.kurum_adi;
```

## Test Senaryoları

### 1. Pozitif Test Senaryoları

- ✅ CONFIRMED durumundaki sipariş için fiş yazdırma
- ✅ DELIVERED durumundaki sipariş için fiş yazdırma
- ✅ Fiş yazdırılmayan siparişleri filtreleme
- ✅ Fiş yazdırılan siparişleri filtreleme
- ✅ Admin kullanıcısının herhangi bir siparişi işaretlemesi

### 2. Negatif Test Senaryoları

- ❌ PENDING durumundaki sipariş için fiş yazdırma denemesi
- ❌ Zaten yazdırılmış fiş için tekrar işaretleme denemesi
- ❌ Normal kullanıcının fiş yazdırma işlemi yapma denemesi
- ❌ Geçersiz sipariş ID'si ile işlem denemesi
- ❌ Yetkilendirme olmadan API çağrısı

## Performans Notları

1. **İndeksleme**: `receipt_printed` ve `status` alanları için indeks oluşturulması önerilir
2. **Sayfalama**: Büyük veri setleri için sayfalama kullanılmalı
3. **Önbellekleme**: Sık kullanılan sorgular için Redis önbellekleme düşünülebilir

## Versiyon Geçmişi

- **v1.0.0** (2024-01-15): İlk sürüm
  - Fiş yazdırma durumu takibi
  - API endpoint'leri
  - Filtreleme özellikleri
