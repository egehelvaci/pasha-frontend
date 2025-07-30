# Çalışan İstatistikleri API Dökümanı

## Genel Bakış

Çalışan istatistikleri API'si (`GET /api/employee-stats/:employeeId`), belirli bir çalışanın performans verilerini detaylı olarak döndürür. Bu API, çalışanın tamamladığı siparişlerin sayısı, toplam tutar, m2 alanı, ürün sayısı gibi istatistikleri ve tamamladığı siparişlerin detaylarını içerir.

---

## API Endpoint

**Endpoint:** `GET /api/employee-stats/:employeeId`

**Path Parameters:**
- `employeeId` (zorunlu): Çalışanın user ID'si

**Authentication:** Admin veya Editor yetkisi gerekli

---

## Response Format

### Başarılı Response Örneği:

```json
{
  "success": true,
  "data": {
    "employee": {
      "userId": "user_123456789",
      "name": "Ahmet",
      "surname": "Yılmaz",
      "email": "ahmet@pasha.com",
      "phoneNumber": "+905551234567"
    },
    "overallStats": {
      "totalCompletedOrders": 15,
      "totalAmount": 25000.50,
      "totalAreaM2": 450.75,
      "totalItems": 45,
      "averageAmount": 1666.70,
      "averageAreaM2": 30.05,
      "averageItems": 3.0
    },
    "recentStats": {
      "period": "Son 30 gün",
      "completedOrders": 8,
      "totalAmount": 12000.25,
      "totalAreaM2": 220.50,
      "totalItems": 24
    },
    "completedOrders": [
      {
        "orderId": "order_123",
        "completedAt": "2024-01-15T14:30:00Z",
        "totalAmount": 1500.00,
        "totalAreaM2": 25.50,
        "totalItems": 3,
        "orderStatus": "DELIVERED",
        "orderCreatedAt": "2024-01-10T09:15:00Z",
        "orderTotalPrice": 1500.00
      },
      {
        "orderId": "order_124",
        "completedAt": "2024-01-14T16:45:00Z",
        "totalAmount": 2000.00,
        "totalAreaM2": 35.25,
        "totalItems": 4,
        "orderStatus": "DELIVERED",
        "orderCreatedAt": "2024-01-09T11:20:00Z",
        "orderTotalPrice": 2000.00
      }
    ]
  }
}
```

---

## Response Alanları

### `employee` objesi:
- **`userId`**: Çalışanın benzersiz ID'si
- **`name`**: Çalışanın adı
- **`surname`**: Çalışanın soyadı
- **`email`**: Çalışanın e-posta adresi
- **`phoneNumber`**: Çalışanın telefon numarası

### `overallStats` objesi (Genel İstatistikler):
- **`totalCompletedOrders`**: Toplam tamamlanan sipariş sayısı
- **`totalAmount`**: Toplam tutar (TL)
- **`totalAreaM2`**: Toplam m2 alanı
- **`totalItems`**: Toplam ürün sayısı
- **`averageAmount`**: Sipariş başına ortalama tutar (TL)
- **`averageAreaM2`**: Sipariş başına ortalama m2 alanı
- **`averageItems`**: Sipariş başına ortalama ürün sayısı

### `recentStats` objesi (Son 30 Gün):
- **`period`**: Dönem açıklaması
- **`completedOrders`**: Son 30 günde tamamlanan sipariş sayısı
- **`totalAmount`**: Son 30 günde toplam tutar (TL)
- **`totalAreaM2`**: Son 30 günde toplam m2 alanı
- **`totalItems`**: Son 30 günde toplam ürün sayısı

### `completedOrders` array (Tamamlanan Siparişler):
Her sipariş için:
- **`orderId`**: Sipariş ID'si
- **`completedAt`**: Siparişin tamamlanma tarihi
- **`totalAmount`**: Sipariş tutarı (TL)
- **`totalAreaM2`**: Sipariş m2 alanı
- **`totalItems`**: Sipariş ürün sayısı
- **`orderStatus`**: Sipariş durumu
- **`orderCreatedAt`**: Siparişin oluşturulma tarihi
- **`orderTotalPrice`**: Siparişin toplam fiyatı

---

## Hata Response'ları

### 400 Bad Request - Çalışan ID Eksik:
```json
{
  "success": false,
  "message": "Çalışan ID'si gerekli"
}
```

### 404 Not Found - Çalışan Bulunamadı:
```json
{
  "success": false,
  "message": "Çalışan bulunamadı"
}
```

### 500 Internal Server Error:
```json
{
  "success": false,
  "message": "Çalışan istatistikleri getirilemedi"
}
```

---

## Kullanım Örnekleri

### 1. Belirli Bir Çalışanın İstatistiklerini Getir
```bash
GET /api/employee-stats/user_123456789
```

### 2. Test Çalışanının İstatistiklerini Getir
```bash
GET /api/employee-stats/user_1703123456789_abc123def
```

---

## Önemli Notlar

- API sadece `employee` tipindeki aktif kullanıcılar için çalışır
- İstatistikler sadece tamamlanmış siparişler üzerinden hesaplanır
- Son 30 günlük istatistikler otomatik olarak hesaplanır
- Tüm tutarlar TL cinsinden döndürülür
- Tarihler ISO 8601 formatında döndürülür
- Admin veya Editor yetkisi gerekli

---

## Performans

- İstatistikler veritabanından paralel olarak çekilir
- Büyük veri setlerinde performans için index'ler kullanılır
- Sadece gerekli alanlar seçilir (select optimization)

---

## Test Çalışanları

Sistemde test amaçlı 4 çalışan bulunmaktadır:

1. **Ahmet Yılmaz** - calisan1@pasha.com
2. **Ayşe Demir** - calisan2@pasha.com  
3. **Mehmet Kaya** - calisan3@pasha.com
4. **Fatma Özkan** - calisan4@pasha.com

Bu çalışanların user ID'lerini kullanarak API'yi test edebilirsiniz.

---

Herhangi bir sorunda veya ek geliştirme ihtiyacında bu dökümanı referans alabilirsiniz. 