# 🔧 Admin Ürün Kuralları ve Kesim Türleri Yönetimi API

Bu dokümantasyon, Pasha Backend projesindeki admin ürün kuralları ve kesim türleri yönetimi API'lerini kapsamlı bir şekilde açıklar.

## 📋 İçindekiler

1. [Genel Bilgiler](#genel-bilgiler)
2. [Kimlik Doğrulama](#kimlik-doğrulama)
3. [Ürün Kuralları Yönetimi](#ürün-kuralları-yönetimi)
4. [Kesim Türleri Yönetimi](#kesim-türleri-yönetimi)
5. [Hata Yönetimi](#hata-yönetimi)
6. [Test Örnekleri](#test-örnekleri)

---

## 🌐 Genel Bilgiler

**Base URL:** 
- Lokal: `http://localhost:3001/api/admin`
- Canlı: `https://your-domain.com/api/admin`

**Content-Type:** `application/json`

**Kimlik Doğrulama:** Bearer Token (JWT) + Admin Rolü

---

## 🔑 Kimlik Doğrulama

### Admin Girişi
```bash
POST /api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "gizli123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "userId": "admin-uuid",
      "username": "admin",
      "userType": "admin"
    }
  }
}
```

**Tüm isteklerde kullanılacak header:**
```
Authorization: Bearer <admin_token>
```

---

## 🎯 Ürün Kuralları Yönetimi

### 1. Tüm Ürün Kurallarını Listele

**GET** `/api/admin/product-rules`

**Query Parametreleri:**
- `isActive` (isteğe bağlı): `true` | `false` - Aktif/Pasif durum filtresi
- `search` (isteğe bağlı): `string` - Kural adı veya açıklamada arama

**Örnek İstek:**
```bash
curl -X GET "http://localhost:3001/api/admin/product-rules?isActive=true&search=halı" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**Response (200):**
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "id": 1,
      "name": "Standart Halı Kuralları",
      "description": "Genel halı ürünleri için temel kurallar",
      "canHaveFringe": true,
      "isActive": true,
      "createdAt": "2024-01-01T12:00:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z",
      "sizeOptions": [
        {
          "id": 1,
          "width": 100,
          "height": 150,
          "isOptionalHeight": false
        },
        {
          "id": 2,
          "width": 120,
          "height": 180,
          "isOptionalHeight": true
        }
      ],
      "cutTypes": [
        {
          "id": 1,
          "name": "Dikdörtgen"
        },
        {
          "id": 2,
          "name": "Oval"
        }
      ],
      "productCount": 5,
      "products": [
        {
          "productId": "product-uuid-1",
          "name": "Anadolu Halısı"
        }
      ]
    }
  ]
}
```

### 2. Belirli Bir Ürün Kuralını Getir

**GET** `/api/admin/product-rules/:ruleId`

**Örnek İstek:**
```bash
curl -X GET "http://localhost:3001/api/admin/product-rules/1" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**Response (200):** Tek kural objesi döner (yukarıdaki format ile aynı)

### 3. Yeni Ürün Kuralı Oluştur

**POST** `/api/admin/product-rules`

**Request Body:**
```json
{
  "name": "Premium Halı Kuralları",
  "description": "Premium halı ürünleri için özel kurallar",
  "canHaveFringe": true,
  "sizeOptions": [
    {
      "width": 150,
      "height": 200,
      "isOptionalHeight": false
    },
    {
      "width": 200,
      "height": 300,
      "isOptionalHeight": true
    }
  ],
  "cutTypeIds": [1, 2, 3]
}
```

**Örnek İstek:**
```bash
curl -X POST "http://localhost:3001/api/admin/product-rules" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Premium Halı Kuralları",
    "description": "Premium halı ürünleri için özel kurallar",
    "canHaveFringe": true,
    "sizeOptions": [
      {
        "width": 150,
        "height": 200,
        "isOptionalHeight": false
      }
    ],
    "cutTypeIds": [1, 2]
  }'
```

**Response (201):**
```json
{
  "success": true,
  "message": "Ürün kuralı başarıyla oluşturuldu",
  "data": {
    "id": 3,
    "name": "Premium Halı Kuralları",
    "description": "Premium halı ürünleri için özel kurallar",
    "can_have_fringe": true,
    "is_active": true,
    "created_at": "2024-01-16T14:30:00.000Z",
    "updated_at": "2024-01-16T14:30:00.000Z"
  }
}
```

### 4. Ürün Kuralını Güncelle

**PUT** `/api/admin/product-rules/:ruleId`

**Request Body:**
```json
{
  "name": "Güncellenmiş Kural Adı",
  "description": "Yeni açıklama",
  "canHaveFringe": false,
  "isActive": false
}
```

**Örnek İstek:**
```bash
curl -X PUT "http://localhost:3001/api/admin/product-rules/1" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Güncellenmiş Standart Halı Kuralları",
    "canHaveFringe": false
  }'
```

### 5. Ürün Kuralını Sil

**DELETE** `/api/admin/product-rules/:ruleId`

**Örnek İstek:**
```bash
curl -X DELETE "http://localhost:3001/api/admin/product-rules/1" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**Response (200):**
```json
{
  "success": true,
  "message": "Ürün kuralı başarıyla silindi"
}
```

**Response (400) - Kullanımda olan kural:**
```json
{
  "success": false,
  "message": "Bu kural 5 ürün tarafından kullanılıyor. Önce ürünlerden kural atamasını kaldırın.",
  "data": {
    "productCount": 5,
    "products": [
      {
        "productId": "product-uuid-1",
        "name": "Anadolu Halısı"
      }
    ]
  }
}
```

---

## 📏 Boyut Seçenekleri Yönetimi

### 1. Boyut Seçeneği Ekle

**POST** `/api/admin/product-rules/:ruleId/size-options`

**Request Body:**
```json
{
  "width": 180,
  "height": 250,
  "isOptionalHeight": true
}
```

**Örnek İstek:**
```bash
curl -X POST "http://localhost:3001/api/admin/product-rules/1/size-options" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "width": 180,
    "height": 250,
    "isOptionalHeight": true
  }'
```

### 2. Boyut Seçeneğini Güncelle

**PUT** `/api/admin/product-rules/:ruleId/size-options/:sizeId`

**Request Body:**
```json
{
  "width": 190,
  "height": 260,
  "isOptionalHeight": false
}
```

### 3. Boyut Seçeneğini Sil

**DELETE** `/api/admin/product-rules/:ruleId/size-options/:sizeId`

**Örnek İstek:**
```bash
curl -X DELETE "http://localhost:3001/api/admin/product-rules/1/size-options/5" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

---

## ✂️ Kesim Türleri Ataması

### 1. Kesim Türlerini Ata

**POST** `/api/admin/product-rules/:ruleId/cut-types`

**Request Body:**
```json
{
  "cutTypeIds": [1, 2, 3, 4]
}
```

**Örnek İstek:**
```bash
curl -X POST "http://localhost:3001/api/admin/product-rules/1/cut-types" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "cutTypeIds": [1, 2, 3]
  }'
```

**Response (200):**
```json
{
  "success": true,
  "message": "3 kesim türü başarıyla atandı",
  "data": [
    {
      "id": 1,
      "name": "Dikdörtgen"
    },
    {
      "id": 2,
      "name": "Oval"
    },
    {
      "id": 3,
      "name": "Daire"
    }
  ]
}
```

### 2. Kesim Türü Atamasını Kaldır

**DELETE** `/api/admin/product-rules/:ruleId/cut-types/:cutTypeId`

**Örnek İstek:**
```bash
curl -X DELETE "http://localhost:3001/api/admin/product-rules/1/cut-types/2" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

---

## ✂️ Kesim Türleri Yönetimi

### 1. Tüm Kesim Türlerini Listele

**GET** `/api/admin/cut-types`

**Query Parametreleri:**
- `search` (isteğe bağlı): `string` - Kesim türü adında arama

**Örnek İstek:**
```bash
curl -X GET "http://localhost:3001/api/admin/cut-types?search=oval" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**Response (200):**
```json
{
  "success": true,
  "count": 4,
  "data": [
    {
      "id": 1,
      "name": "Dikdörtgen",
      "createdAt": "2024-01-01T12:00:00.000Z",
      "updatedAt": "2024-01-01T12:00:00.000Z",
      "ruleCount": 3,
      "rules": [
        {
          "id": 1,
          "name": "Standart Halı Kuralları"
        }
      ],
      "variationCount": 15,
      "usedInProducts": [
        {
          "id": "product-uuid-1",
          "name": "Anadolu Halısı"
        }
      ]
    }
  ]
}
```

### 2. Belirli Bir Kesim Türünü Getir

**GET** `/api/admin/cut-types/:cutTypeId`

**Örnek İstek:**
```bash
curl -X GET "http://localhost:3001/api/admin/cut-types/1" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Dikdörtgen",
    "createdAt": "2024-01-01T12:00:00.000Z",
    "updatedAt": "2024-01-01T12:00:00.000Z",
    "ruleCount": 3,
    "rules": [
      {
        "id": 1,
        "name": "Standart Halı Kuralları",
        "description": "Genel halı ürünleri için temel kurallar"
      }
    ],
    "variationCount": 15,
    "variations": [
      {
        "id": 1,
        "width": 100,
        "height": 150,
        "hasFringe": true,
        "stockQuantity": 10,
        "product": {
          "id": "product-uuid-1",
          "name": "Anadolu Halısı"
        }
      }
    ]
  }
}
```

### 3. Yeni Kesim Türü Oluştur

**POST** `/api/admin/cut-types`

**Request Body:**
```json
{
  "name": "Özel Kesim"
}
```

**Örnek İstek:**
```bash
curl -X POST "http://localhost:3001/api/admin/cut-types" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Özel Kesim"
  }'
```

**Response (201):**
```json
{
  "success": true,
  "message": "Kesim türü başarıyla oluşturuldu",
  "data": {
    "id": 5,
    "name": "Özel Kesim",
    "created_at": "2024-01-16T15:00:00.000Z",
    "updated_at": "2024-01-16T15:00:00.000Z"
  }
}
```

### 4. Kesim Türünü Güncelle

**PUT** `/api/admin/cut-types/:cutTypeId`

**Request Body:**
```json
{
  "name": "Güncellenmiş Kesim Adı"
}
```

**Örnek İstek:**
```bash
curl -X PUT "http://localhost:3001/api/admin/cut-types/5" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Custom Kesim"
  }'
```

### 5. Kesim Türünü Sil

**DELETE** `/api/admin/cut-types/:cutTypeId`

**Örnek İstek:**
```bash
curl -X DELETE "http://localhost:3001/api/admin/cut-types/5" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**Response (400) - Kullanımda olan kesim türü:**
```json
{
  "success": false,
  "message": "Bu kesim türü 3 kural tarafından kullanılıyor. Önce kurallardan kaldırın.",
  "data": {
    "ruleCount": 3,
    "rules": ["Standart Halı Kuralları", "Premium Kurallar"]
  }
}
```

---

## ❌ Hata Yönetimi

### HTTP Status Kodları

- **200**: Başarılı işlem
- **201**: Başarılı oluşturma
- **400**: Hatalı istek (validasyon hatası)
- **401**: Kimlik doğrulama gerekli
- **403**: Admin yetkisi gerekli
- **404**: Kaynak bulunamadı
- **500**: Sunucu hatası

### Hata Response Formatı

```json
{
  "success": false,
  "message": "Hata açıklaması",
  "data": {
    "additional": "information"
  }
}
```

### Yaygın Hatalar

1. **Yetkisiz Erişim:**
```json
{
  "success": false,
  "message": "Bu işlem için admin yetkisi gereklidir"
}
```

2. **Kaynak Bulunamadı:**
```json
{
  "success": false,
  "message": "Ürün kuralı bulunamadı"
}
```

3. **Validasyon Hatası:**
```json
{
  "success": false,
  "message": "Kural adı zorunludur ve boş olamaz"
}
```

4. **Çakışma Hatası:**
```json
{
  "success": false,
  "message": "Bu isimde bir kural zaten mevcut"
}
```

---

## 🧪 Test Senaryoları

### 1. Tam Workflow Test

```bash
# 1. Admin girişi yap
TOKEN=$(curl -s -X POST "http://localhost:3001/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "gizli123"}' | \
  jq -r '.data.token')

# 2. Kesim türü oluştur
curl -X POST "http://localhost:3001/api/admin/cut-types" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Kesim"}'

# 3. Ürün kuralı oluştur
curl -X POST "http://localhost:3001/api/admin/product-rules" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Kuralı",
    "description": "Test için oluşturulan kural",
    "canHaveFringe": true,
    "sizeOptions": [
      {
        "width": 100,
        "height": 150,
        "isOptionalHeight": false
      }
    ],
    "cutTypeIds": [1]
  }'

# 4. Kuralları listele
curl -X GET "http://localhost:3001/api/admin/product-rules" \
  -H "Authorization: Bearer $TOKEN"

# 5. Boyut seçeneği ekle
curl -X POST "http://localhost:3001/api/admin/product-rules/1/size-options" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "width": 120,
    "height": 180,
    "isOptionalHeight": true
  }'
```

### 2. Hata Durumu Testleri

```bash
# Geçersiz token ile istek
curl -X GET "http://localhost:3001/api/admin/product-rules" \
  -H "Authorization: Bearer INVALID_TOKEN"

# Aynı isimde kural oluşturma
curl -X POST "http://localhost:3001/api/admin/product-rules" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Standart Halı Kuralları"}'

# Olmayan kural güncelleme
curl -X PUT "http://localhost:3001/api/admin/product-rules/999" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Yeni Ad"}'
```

---

## 📋 API Özeti

### Ürün Kuralları Endpoint'leri
- `GET /api/admin/product-rules` - Kuralları listele
- `GET /api/admin/product-rules/:id` - Kural detayı
- `POST /api/admin/product-rules` - Yeni kural oluştur
- `PUT /api/admin/product-rules/:id` - Kural güncelle
- `DELETE /api/admin/product-rules/:id` - Kural sil

### Boyut Yönetimi Endpoint'leri
- `POST /api/admin/product-rules/:id/size-options` - Boyut ekle
- `PUT /api/admin/product-rules/:id/size-options/:sizeId` - Boyut güncelle
- `DELETE /api/admin/product-rules/:id/size-options/:sizeId` - Boyut sil

### Kesim Türleri Ataması
- `POST /api/admin/product-rules/:id/cut-types` - Kesim türleri ata
- `DELETE /api/admin/product-rules/:id/cut-types/:cutTypeId` - Atama kaldır

### Kesim Türleri Yönetimi
- `GET /api/admin/cut-types` - Kesim türlerini listele
- `GET /api/admin/cut-types/:id` - Kesim türü detayı
- `POST /api/admin/cut-types` - Yeni kesim türü oluştur
- `PUT /api/admin/cut-types/:id` - Kesim türü güncelle
- `DELETE /api/admin/cut-types/:id` - Kesim türü sil

Bu API ile admin kullanıcıları ürün kurallarını tam olarak yönetebilir, ebatlar ekleyebilir, kesim türleri tanımlayabilir ve saçak durumu ayarlayabilir. 