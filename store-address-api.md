# Mağaza Adres Yönetimi API Dokümantasyonu

## Genel Bakış
Bu API, mağazalar için birden fazla adres yönetimi sağlar. Her mağaza birden fazla adrese sahip olabilir ve bunlardan biri varsayılan adres olarak işaretlenebilir.

## Base URL
```
/api/store-addresses
```

## Yetkilendirme
Tüm endpoint'ler için Bearer Token (JWT) gereklidir.
```
Authorization: Bearer {token}
```

## Yetki Sistemi
- **Kullanıcılar**: Sadece kendi mağazalarının adreslerini yönetebilir
- **Adminler**: Tüm mağazaların adreslerini yönetebilir (`store_id` parametresi ile)

---

## Endpoint'ler

### 1. Mağaza Adreslerini Listele

**GET** `/api/store-addresses`

#### Query Parameters (Admin için)
```
?storeId=uuid-string
```

#### Başarılı Yanıt (200)
```json
{
  "success": true,
  "data": [
    {
      "id": "address-uuid-1",
      "store_id": "store-uuid",
      "title": "Ana Mağaza",
      "address": "Atatürk Cad. No:123 Merkez/İstanbul",
      "city": "İstanbul",
      "district": "Merkez",
      "postal_code": "34000",
      "is_default": true,
      "is_active": true,
      "created_at": "2025-01-23T10:00:00Z",
      "updated_at": "2025-01-23T10:00:00Z"
    },
    {
      "id": "address-uuid-2",
      "store_id": "store-uuid",
      "title": "Depo",
      "address": "Sanayi Sitesi Blok A No:45",
      "city": "İstanbul",
      "district": "Pendik",
      "postal_code": "34890",
      "is_default": false,
      "is_active": true,
      "created_at": "2025-01-23T11:00:00Z",
      "updated_at": "2025-01-23T11:00:00Z"
    }
  ]
}
```

---

### 2. Yeni Mağaza Adresi Oluştur

**POST** `/api/store-addresses`

#### Request Body
```json
{
  "title": "Şube 2",
  "address": "Cumhuriyet Cad. No:67 Kadıköy/İstanbul",
  "city": "İstanbul",
  "district": "Kadıköy",
  "postal_code": "34710",
  "is_default": false,
  "store_id": "store-uuid"  // Sadece admin için
}
```

#### Zorunlu Alanlar
- `title` (string): Adres başlığı
- `address` (string): Tam adres

#### Opsiyonel Alanlar
- `city` (string): Şehir
- `district` (string): İlçe
- `postal_code` (string): Posta kodu
- `is_default` (boolean): Varsayılan adres mi? (varsayılan: false)
- `store_id` (string): Mağaza ID'si (sadece admin kullanabilir)

#### Başarılı Yanıt (201)
```json
{
  "success": true,
  "message": "Yeni adres başarıyla oluşturuldu",
  "data": {
    "id": "new-address-uuid",
    "store_id": "store-uuid",
    "title": "Şube 2",
    "address": "Cumhuriyet Cad. No:67 Kadıköy/İstanbul",
    "city": "İstanbul",
    "district": "Kadıköy",
    "postal_code": "34710",
    "is_default": false,
    "is_active": true,
    "created_at": "2025-01-23T12:00:00Z",
    "updated_at": "2025-01-23T12:00:00Z"
  }
}
```

---

### 3. Mağaza Adresini Güncelle

**PUT** `/api/store-addresses/:addressId`

#### Request Body
```json
{
  "title": "Ana Mağaza - Güncellenmiş",
  "address": "Yeni Adres Bilgisi",
  "city": "Ankara",
  "district": "Çankaya",
  "postal_code": "06000",
  "is_default": true,
  "is_active": true
}
```

#### Başarılı Yanıt (200)
```json
{
  "success": true,
  "message": "Adres başarıyla güncellendi",
  "data": {
    "id": "address-uuid",
    "store_id": "store-uuid",
    "title": "Ana Mağaza - Güncellenmiş",
    "address": "Yeni Adres Bilgisi",
    "city": "Ankara",
    "district": "Çankaya",
    "postal_code": "06000",
    "is_default": true,
    "is_active": true,
    "created_at": "2025-01-23T10:00:00Z",
    "updated_at": "2025-01-23T13:00:00Z"
  }
}
```

---

### 4. Varsayılan Adresi Değiştir

**PUT** `/api/store-addresses/:addressId/set-default`

#### Request Body
Boş gönderilir.

#### Başarılı Yanıt (200)
```json
{
  "success": true,
  "message": "Varsayılan adres başarıyla değiştirildi",
  "data": {
    "id": "address-uuid",
    "store_id": "store-uuid",
    "title": "Şube 2",
    "address": "Cumhuriyet Cad. No:67",
    "city": "İstanbul",
    "district": "Kadıköy",
    "postal_code": "34710",
    "is_default": true,
    "is_active": true,
    "created_at": "2025-01-23T12:00:00Z",
    "updated_at": "2025-01-23T14:00:00Z"
  }
}
```

---

### 5. Mağaza Adresini Sil

**DELETE** `/api/store-addresses/:addressId`

#### Başarılı Yanıt (200)
```json
{
  "success": true,
  "message": "Adres başarıyla silindi"
}
```

#### Not
- Soft delete yapılır (is_active = false)
- Varsayılan adres silinirse, otomatik olarak başka bir adres varsayılan yapılır
- Son adres silinemez

---

## Hata Kodları

### 400 - Bad Request
```json
{
  "success": false,
  "message": "Başlık ve adres alanları zorunludur"
}
```

### 401 - Unauthorized
```json
{
  "success": false,
  "message": "Kullanıcı kimlik doğrulaması gerekli"
}
```

### 403 - Forbidden
```json
{
  "success": false,
  "message": "Bu adresi güncelleme yetkiniz yok"
}
```

### 404 - Not Found
```json
{
  "success": false,
  "message": "Adres bulunamadı"
}
```

### 500 - Internal Server Error
```json
{
  "success": false,
  "message": "Adres oluşturulamadı"
}
```

---

## Özel Kurallar

### Varsayılan Adres Kuralları
1. Her mağazanın en az bir varsayılan adresi olmalıdır
2. Yeni varsayılan adres seçildiğinde, eski varsayılan adres otomatik kaldırılır
3. Varsayılan adres silinirse, otomatik olarak başka bir adres varsayılan yapılır

### Admin Yetkileri
1. Admin tüm mağazaların adreslerini görüntüleyebilir
2. Admin herhangi bir mağaza için adres oluşturabilir/düzenleyebilir
3. Admin `store_id` parametresi ile farklı mağazaları yönetebilir

### Kullanıcı Sınırlamaları
1. Normal kullanıcılar sadece kendi mağazalarının adreslerini yönetebilir
2. Kullanıcının mağaza bilgisi yoksa işlem yapamaz

---

## Örnek Kullanım Senaryoları

### Senaryo 1: Yeni Mağaza Adresi Ekleme
```javascript
// Kullanıcı için
const response = await fetch('/api/store-addresses', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer user-token',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    title: 'Depo Adresi',
    address: 'Sanayi Sitesi A Blok No:12',
    city: 'İstanbul',
    district: 'Pendik'
  })
});
```

### Senaryo 2: Admin Farklı Mağaza Adresi Ekleme
```javascript
// Admin için
const response = await fetch('/api/store-addresses', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer admin-token',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    store_id: 'target-store-uuid',
    title: 'Müşteri Şubesi',
    address: 'Merkez Mahallesi No:45',
    is_default: true
  })
});
```

### Senaryo 3: Adres Listesi Alma
```javascript
// Kullanıcı kendi adreslerini alır
const userAddresses = await fetch('/api/store-addresses', {
  headers: { 'Authorization': 'Bearer user-token' }
});

// Admin belirli mağaza adreslerini alır
const storeAddresses = await fetch('/api/store-addresses?storeId=store-uuid', {
  headers: { 'Authorization': 'Bearer admin-token' }
});
```

---

## Veri Modeli

### StoreAddress Tablosu
```sql
CREATE TABLE store_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES Store(store_id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  address TEXT NOT NULL,
  city VARCHAR(100),
  district VARCHAR(100),
  postal_code VARCHAR(10),
  is_default BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### İlişkiler
- `StoreAddress` → `Store` (Many-to-One)
- `Order` → `StoreAddress` (Many-to-One, opsiyonel)

---

## Notlar
- Tüm tarih/saat bilgileri UTC formatındadır
- Adres başlıkları ve adres metinleri otomatik trim edilir
- Soft delete kullanılır, veriler fiziksel olarak silinmez
- Varsayılan adres seçimi otomatik olarak yönetilir