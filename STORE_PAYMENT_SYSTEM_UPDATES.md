# Mağaza Ödeme Sistemi Güncellemeleri

Bu dokümantasyon, mağaza bazlı ödeme sistemi için yapılan değişiklikleri detaylandırmaktadır.

## 📋 Değişiklik Özeti

### Temel Değişiklikler
- ✅ **Mağaza Maksimum Taksit Sayısı**: Admin tarafından tanımlanabilir
- ✅ **Mağaza Bakiye Sistemi**: Bakiye + açık hesap limiti toplam kontrolü
- ✅ **User Model Temizliği**: Debit/Credit alanları kaldırıldı
- ✅ **Yeni Sipariş Kontrol Mantığı**: Bakiye öncelikli düşüm sistemi

---

## 🗄️ Database Schema Değişiklikleri

### Store Modeli Güncellemeleri

```sql
-- Yeni eklenen alanlar
ALTER TABLE "Store" ADD COLUMN "bakiye" DECIMAL(15,2) DEFAULT 0;
ALTER TABLE "Store" ADD COLUMN "maksimum_taksit" INTEGER DEFAULT 1;

-- Mevcut alanlar (değişmedi)
-- acik_hesap_tutari: Açık hesap limiti
-- limitsiz_acik_hesap: Sınırsız açık hesap flag'i
```

**Store Model Şeması:**
```prisma
model Store {
  store_id            String           @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  kurum_adi           String           @db.VarChar(255)
  // ... diğer alanlar ...
  limitsiz_acik_hesap Boolean?         @default(false)
  acik_hesap_tutari   Decimal?         @default(0) @db.Decimal(15, 2)  // Açık hesap limiti
  bakiye              Decimal?         @default(0) @db.Decimal(15, 2)  // 🆕 Mağaza bakiyesi
  maksimum_taksit     Int?             @default(1)                      // 🆕 Maksimum taksit sayısı
  is_active           Boolean?         @default(true)
  // ... relations ...
}
```

### User Modeli Güncellemeleri

```sql
-- Kaldırılan alanlar
ALTER TABLE "User" DROP COLUMN "credit";
ALTER TABLE "User" DROP COLUMN "debit";
```

**User Model Şeması:**
```prisma
model User {
  email       String   @unique
  name        String
  createdAt   DateTime @default(now()) @map("created_at")
  // ❌ credit      Decimal  @default(0) @db.Decimal(10, 2)  // KALDIRILDI
  // ❌ debit       Decimal  @default(0) @db.Decimal(10, 2)  // KALDIRILDI
  isActive    Boolean  @default(true) @map("is_active")
  // ... diğer alanlar ...
  store_id    String?  @db.Uuid
  Store       Store?   @relation(fields: [store_id], references: [store_id])
  // ... relations ...
}
```

---

## 💰 Yeni Ödeme Sistemi Mantığı

### 1. Sipariş Kontrolü

**Önceki Sistem:**
```
Kontrol: Sipariş Tutarı ≤ Açık Hesap Tutarı
```

**Yeni Sistem:**
```
Toplam Kullanılabilir = Bakiye + Açık Hesap Limiti
Kontrol: Sipariş Tutarı ≤ Toplam Kullanılabilir
```

### 2. Sipariş Sonrası Düşüm Mantığı

**Önceki Sistem:**
```
Açık Hesap Tutarı -= Sipariş Tutarı
```

**Yeni Sistem:**
```javascript
if (Bakiye >= Sipariş Tutarı) {
    // Sadece bakiyeden düş
    Bakiye -= Sipariş Tutarı
} else {
    // Bakiye yetersiz, ikisinden de düş
    Kalan Tutar = Sipariş Tutarı - Bakiye
    Bakiye = 0
    Açık Hesap Tutarı -= Kalan Tutar
}
```

### 3. Sipariş İptal İadesi

**Yeni Sistem:**
```javascript
// İptal edilen sipariş tutarı tamamen bakiyeye iade edilir
Bakiye += İptal Edilen Sipariş Tutarı
// Açık hesap limiti değişmez
```

---

## 🔧 API Değişiklikleri

### Store Management API

#### Store Oluşturma (POST `/api/admin/stores`)

**Yeni Request Body:**
```json
{
  "kurum_adi": "ABC Mağaza",
  "vergi_numarasi": "1234567890",
  "yetkili_adi": "Ahmet",
  "yetkili_soyadi": "Yılmaz",
  "telefon": "0212 555 0123",
  "eposta": "info@abc.com",
  "adres": "İstanbul",
  "limitsiz_acik_hesap": false,
  "acik_hesap_tutari": 5000.00,     // Açık hesap limiti
  "bakiye": 10000.00,               // 🆕 Mağaza bakiyesi
  "maksimum_taksit": 12             // 🆕 Maksimum taksit sayısı
}
```

#### Store Güncelleme (PUT `/api/admin/stores/:storeId`)

**Güncellenen Alanlar:**
```json
{
  "bakiye": 15000.00,               // Bakiye güncelleme
  "maksimum_taksit": 6,             // Taksit sayısı güncelleme
  "acik_hesap_tutari": 8000.00      // Açık hesap limiti güncelleme
}
```

### User Management API

#### User Oluşturma (POST `/api/admin/users`)

**Kaldırılan Alanlar:**
```json
{
  "username": "testuser",
  "email": "test@example.com",
  "name": "Test",
  "surname": "User",
  "store_id": "store-uuid"
  // ❌ "credit": 1000.00,    // KALDIRILDI
  // ❌ "debit": 500.00       // KALDIRILDI
}
```

### Authentication API

#### Login Response (POST `/api/auth/login`)

**Yeni Response Format:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "userId": "user-uuid",
      "username": "magaza_user",
      "name": "Ahmet",
      "surname": "Yılmaz",
      "email": "ahmet@example.com",
      "userType": "store_user",
      "store": {                              // 🆕 Mağaza bilgileri
        "store_id": "store-uuid",
        "kurum_adi": "ABC Mağaza",
        "vergi_numarasi": "1234567890",
        "telefon": "0212 555 0123",
        "eposta": "info@abc.com",
        "adres": "İstanbul",
        "bakiye": 15000.00,                   // 🆕 Mağaza bakiyesi
        "acik_hesap_tutari": 10000.00,        // Açık hesap limiti
        "maksimum_taksit": 12,                // 🆕 Maksimum taksit sayısı
        "limitsiz_acik_hesap": false,
        "toplam_kullanilabilir": 25000.00     // 🆕 Bakiye + açık hesap toplamı
      }
      // ❌ "credit": 1000.00,               // KALDIRILDI
      // ❌ "debit": 500.00                  // KALDIRILDI
    }
  }
}
```

**Admin User Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "userId": "admin-uuid",
      "username": "admin",
      "name": "Admin",
      "surname": "User",
      "email": "admin@example.com",
      "userType": "admin",
      "store": null                           // Admin kullanıcılarının mağazası yok
    }
  }
}
```

### Sipariş API Değişiklikleri

#### Limit Kontrol Response

**Yeni Response:**
```json
{
  "success": true,
  "message": "Limit kontrolü tamamlandı",
  "data": {
    "canProceed": true,
    "message": "Sipariş verilebilir",
    "cartTotal": "2500.00",
    "availableBalance": "15000.00",     // 🆕 Toplam kullanılabilir (bakiye + açık hesap)
    "storeBalance": "10000.00",         // 🆕 Mağaza bakiyesi
    "openAccountLimit": "5000.00"       // 🆕 Açık hesap limiti
  }
}
```

**Yetersiz Bakiye Response:**
```json
{
  "success": false,
  "message": "BALANCE_INSUFFICIENT",    // 🆕 Yeni hata tipi
  "requiresPayment": true,
  "limitAmount": 15000.00,              // Toplam kullanılabilir tutar
  "minimumPayment": 500.00              // Minimum ödeme tutarı
}
```

---

## 📊 Örnek Senaryolar

### Senaryo 1: Bakiye Yeterli

**Mağaza Durumu:**
- Bakiye: 10,000 TL
- Açık Hesap Limiti: 5,000 TL
- Toplam Kullanılabilir: 15,000 TL

**Sipariş:** 3,000 TL

**Sonuç:**
```
✅ Sipariş verilebilir
Sipariş Sonrası:
- Bakiye: 7,000 TL (10,000 - 3,000)
- Açık Hesap Limiti: 5,000 TL (değişmez)
```

### Senaryo 2: Bakiye Yetersiz, Toplam Yeterli

**Mağaza Durumu:**
- Bakiye: 2,000 TL
- Açık Hesap Limiti: 5,000 TL
- Toplam Kullanılabilir: 7,000 TL

**Sipariş:** 4,000 TL

**Sonuç:**
```
✅ Sipariş verilebilir
Sipariş Sonrası:
- Bakiye: 0 TL (tamamı kullanıldı)
- Açık Hesap Limiti: 3,000 TL (5,000 - 2,000)
```

### Senaryo 3: Toplam Yetersiz

**Mağaza Durumu:**
- Bakiye: 2,000 TL
- Açık Hesap Limiti: 3,000 TL
- Toplam Kullanılabilir: 5,000 TL

**Sipariş:** 7,000 TL

**Sonuç:**
```
❌ Sipariş verilemez
Minimum Ödeme Gerekli: 2,000 TL
```

### Senaryo 4: Sınırsız Açık Hesap

**Mağaza Durumu:**
- `limitsiz_acik_hesap: true`
- Bakiye: Herhangi bir değer
- Açık Hesap Limiti: Göz ardı edilir

**Sonuç:**
```
✅ Her zaman sipariş verilebilir
Sadece fiyat listesi limiti kontrol edilir
```

---

## 🔄 Migrasyon Süreci

### 1. Database Push
```bash
npx prisma db push
```

**Uyarılar:**
```
⚠️ Data Loss Warning:
- User.credit column will be dropped (3 non-null values)
- User.debit column will be dropped (3 non-null values)
```

### 2. Mevcut Verilerin Güncellenmesi

**Store Tablosi:**
```sql
-- Tüm mağazalara varsayılan değerler atandı
UPDATE "Store" SET 
  "bakiye" = 0, 
  "maksimum_taksit" = 1 
WHERE "bakiye" IS NULL OR "maksimum_taksit" IS NULL;
```

**User Tablosu:**
```sql
-- Credit/Debit alanları otomatik silindi
-- Veri kaybı: Kullanıcı bakiye bilgileri
-- Yeni sistem: Bakiye mağaza bazlı olacak
```

---

## 🧪 Test Senaryoları

### Test 1: Store CRUD İşlemleri

```bash
# Yeni mağaza oluşturma
curl -X POST "/api/admin/stores" \
  -H "Authorization: Bearer <admin_token>" \
  -d '{
    "kurum_adi": "Test Mağaza",
    "bakiye": 20000,
    "maksimum_taksit": 24,
    "acik_hesap_tutari": 10000
  }'

# Mağaza güncelleme
curl -X PUT "/api/admin/stores/:storeId" \
  -H "Authorization: Bearer <admin_token>" \
  -d '{
    "bakiye": 25000,
    "maksimum_taksit": 12
  }'
```

### Test 2: Sipariş Kontrol

```bash
# Limit kontrolü
curl -X GET "/api/orders/check-limits" \
  -H "Authorization: Bearer <user_token>"

# Sipariş oluşturma
curl -X POST "/api/orders/create-from-cart" \
  -H "Authorization: Bearer <user_token>" \
  -d '{"notes": "Test siparişi"}'
```

### Test 3: User Management

```bash
# Yeni kullanıcı oluşturma (credit/debit yok)
curl -X POST "/api/admin/users" \
  -H "Authorization: Bearer <admin_token>" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "name": "Test",
    "surname": "User",
    "store_id": "store-uuid"
  }'
```

### Test 4: Login API

```bash
# Mağaza kullanıcısı login (yeni response formatı)
curl -X POST "/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "magaza_user",
    "password": "password123"
  }'

# Expected Response:
# {
#   "success": true,
#   "data": {
#     "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
#     "user": {
#       "userId": "user-uuid",
#       "username": "magaza_user",
#       "userType": "store_user",
#       "store": {
#         "bakiye": 15000.00,
#         "acik_hesap_tutari": 10000.00,
#         "maksimum_taksit": 12,
#         "toplam_kullanilabilir": 25000.00
#       }
#     }
#   }
# }

# Admin kullanıcısı login
curl -X POST "/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }'

# Expected Response:
# {
#   "success": true,
#   "data": {
#     "user": {
#       "userType": "admin",
#       "store": null
#     }
#   }
# }
```

---

## 🚨 Dikkat Edilmesi Gerekenler

### 1. Veri Kaybı
- ❌ User tablosundaki `credit` ve `debit` alanları kalıcı olarak silindi
- ✅ Kullanıcı bakiye bilgileri artık mağaza bazlı olacak

### 2. API Breaking Changes
- ❌ User API'lerinde `credit`/`debit` parametreleri artık geçersiz
- ❌ **Login API response formatı değişti**: User objesi artık `store` objesi içeriyor
- ❌ Sipariş kontrol response formatı değişti
- ❌ **Frontend uygulamaları login response'unu güncellemeli**

### 3. Backward Compatibility
- ✅ Mevcut sipariş sistemi çalışmaya devam eder
- ✅ Fiyat listesi mantığı değişmedi
- ✅ QR kod sistemi etkilenmedi

### 4. Güvenlik
- ✅ Admin yetkisi gerektiren tüm endpoint'ler korunuyor
- ✅ Kullanıcılar sadece kendi mağazalarının bilgilerini görebilir

---

## 📈 Performans Etkileri

### Pozitif Etkiler
- ✅ User tablosu daha hafif (2 alan kaldırıldı)
- ✅ Bakiye hesaplaması daha hızlı (tek mağaza sorgusu)
- ✅ Daha basit veri modeli

### Dikkat Edilecekler
- ⚠️ Store tablosuna 2 yeni alan eklendi
- ⚠️ Sipariş kontrol mantığı biraz daha karmaşık

---

## 🔮 Gelecek Geliştirmeler

### Önerilen İyileştirmeler
1. **Taksit Sistemi**: Maksimum taksit sayısı kullanılarak taksitli ödeme sistemi
2. **Bakiye Geçmişi**: Store bakiye değişiklik logları
3. **Otomatik Bakiye Yüklemesi**: Belirli limitin altına düştüğünde uyarı
4. **Multi-Currency**: Farklı para birimleri için bakiye desteği

### API Geliştirmeleri
1. **Bakiye Geçmişi API**: `/api/admin/stores/:id/balance-history`
2. **Toplu Bakiye Güncelleme**: `/api/admin/stores/bulk-update-balance`
3. **Taksit Hesaplama**: `/api/orders/calculate-installments`

---

## 📚 Referanslar

- **Prisma Schema**: `prisma/schema.prisma`
- **Order Service**: `src/order-service.ts`
- **Store Controller**: `src/admin/store-controller.ts`
- **Admin Controller**: `src/admin/admin-controller.ts`
- **Database Migration**: `npx prisma db push`

---

**Güncelleme Tarihi:** $(date +%Y-%m-%d)  
**Versiyon:** v2.0.0  
**Hazırlayan:** Backend Development Team 