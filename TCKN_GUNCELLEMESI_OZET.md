# TCKN Alanı Güncelleme Özeti

Bu dokümantasyon, belirtilen API endpoint'lerine TCKN alanının eklenmesi sürecini özetlemektedir.

## 🎯 Güncellenen API Endpoint'leri

### 1. POST /api/admin/stores - Mağaza Oluşturma
- ✅ TCKN alanı eklendi
- Zorunlu alan olarak ayarlandı
- 11 haneli sayısal validasyon eklendi

### 2. PUT /api/admin/stores/:storeId - Mağaza Güncelleme  
- ✅ TCKN alanı eklendi
- Opsiyonel alan olarak ayarlandı
- 11 haneli sayısal validasyon eklendi

### 3. GET /api/admin/stores - Mağaza Listeleme
- ✅ Response'da TCKN alanı görünecek
- Store interface'inde TCKN alanı mevcut

### 4. GET /api/admin/stores/:storeId - Mağaza Detayı
- ✅ Response'da TCKN alanı görünecek
- Store interface'inde TCKN alanı mevcut

### 5. GET /api/profile/me - Profil Getirme
- ✅ Store objesi içinde TCKN alanı eklendi
- UserProfileInfo ve StoreProfileInfo interface'leri güncellendi

### 6. PUT /api/profile/store - Mağaza Profili Güncelleme
- ✅ TCKN alanı eklendi
- StoreUpdateData interface'i güncellendi
- Opsiyonel alan olarak ayarlandı

### 7. GET /api/my-statistics/balance - Bakiye Bilgileri
- ✅ Store bilgilerinde TCKN alanı dahil edilecek
- Mevcut BalanceInfo interface'i değişmedi

### 8. POST /api/auth/login - Login (mağaza bilgileri ile)
- ✅ Response'daki store objesi TCKN alanını içeriyor
- AuthContext Store tipi güncellendi

## 🔧 Frontend Güncellemeleri

### Interface Güncellemeleri
- ✅ `Store` interface'ine TCKN alanı eklendi
- ✅ `CreateStoreData` interface'ine TCKN alanı eklendi  
- ✅ `UpdateStoreData` interface'ine TCKN alanı eklendi
- ✅ `UserProfileInfo` interface'ine TCKN alanı eklendi
- ✅ `StoreProfileInfo` interface'ine TCKN alanı eklendi
- ✅ `StoreUpdateData` interface'ine TCKN alanı eklendi
- ✅ AuthContext `Store` tipine TCKN alanı eklendi

### Form Güncellemeleri
- ✅ Mağaza oluşturma formu (`/dashboard/magazalar/ekle`)
  - TCKN input alanı eklendi
  - Zorunlu alan validasyonu
  - 11 haneli sayısal kontrol
  
- ✅ Mağaza düzenleme formu (`/dashboard/magazalar/[storeId]/duzenle`)
  - TCKN input alanı eklendi
  - Zorunlu alan validasyonu
  - 11 haneli sayısal kontrol

- ✅ Profil ayarları sayfası (`/dashboard/ayarlar`)
  - TCKN input alanı eklendi
  - Opsiyonel alan olarak ayarlandı
  - 11 haneli maksimum uzunluk kontrolü

## 📝 Validasyon Kuralları

### Frontend Validasyonu
```javascript
// TCKN Validasyon Kuralları
{
  required: true, // Sadece mağaza oluşturma ve düzenlemede
  len: 11,
  pattern: /^[0-9]+$/,
  message: 'TCKN 11 haneli olmalıdır ve sadece sayılardan oluşmalıdır'
}
```

### Backend Validasyonu (Önerilen)
```javascript
// API endpoint'lerinde uygulanması gereken kurallar
- TCKN: 11 haneli sayısal değer
- Zorunluluk: Oluşturmada zorunlu, güncellemede opsiyonel
- Benzersizlik: Farklı mağazalar aynı TCKN'ye sahip olmamalı
```

## 🔄 API Dokümantasyon Güncellemeleri

### Güncellenen Dosyalar
- ✅ `STORE_PAYMENT_SYSTEM_UPDATES.md`
  - Store oluşturma örneğine TCKN eklendi
  - Login response'una TCKN eklendi

- ✅ `KULLANICI_PROFIL_API_DOKUMANTASYONU.md`
  - Store objesi örneklerine TCKN eklendi
  - Request body örneklerine TCKN eklendi
  - Validasyon kurallarına TCKN eklendi
  - Response örneklerine TCKN eklendi

## 🚀 Deployment Checklist

### Backend Kontrolü (API)
- [ ] Database schema'sında TCKN alanı var mı?
- [ ] API endpoint'leri TCKN alanını kabul ediyor mu?
- [ ] Validasyon kuralları uygulanıyor mu?
- [ ] Response'larda TCKN alanı dönüyor mu?

### Frontend Kontrolü
- ✅ Tüm interface'ler güncellendi
- ✅ Tüm formlar TCKN alanını içeriyor
- ✅ Validasyon kuralları uygulandı
- ✅ API çağrıları TCKN alanını gönderiyor

## 🎯 Test Senaryoları

### 1. Mağaza Oluşturma
```bash
# Test: TCKN ile mağaza oluşturma
curl -X POST "/api/admin/stores" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "kurum_adi": "Test Mağaza",
    "tckn": "12345678901",
    "yetkili_adi": "Test",
    "yetkili_soyadi": "User"
  }'
```

### 2. Mağaza Güncelleme
```bash
# Test: TCKN güncelleme
curl -X PUT "/api/admin/stores/:storeId" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "tckn": "98765432100"
  }'
```

### 3. Profil Güncelleme
```bash
# Test: Profil TCKN güncelleme
curl -X PUT "/api/profile/store" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "kurum_adi": "Updated Store",
    "tckn": "11111111111"
  }'
```

### 4. Login Kontrolü
```bash
# Test: Login response'unda TCKN kontrolü
curl -X POST "/api/auth/login" \
  -d '{
    "username": "store_user",
    "password": "password"
  }'
# Expected: response.data.user.store.tckn
```

## ⚠️ Dikkat Edilecek Noktalar

### 1. Geriye Uyumluluk
- Mevcut mağazalar TCKN alanı olmadan çalışabilir
- Frontend NULL/undefined TCKN değerlerini destekliyor

### 2. Güvenlik
- TCKN kişisel veri olduğu için dikkatli işlenmeli
- KVKK uyumluluğu göz önünde bulundurulmalı

### 3. Validasyon
- 11 haneli sayısal kontrol mutlaka yapılmalı
- Türkiye TCKN algoritması uygulanabilir

### 4. Database Migration
```sql
-- Örnek migration (backend tarafında)
ALTER TABLE stores ADD COLUMN tckn VARCHAR(11);
CREATE INDEX idx_stores_tckn ON stores(tckn);
```

## 📊 Etkilenen Dosyalar

### Interface/Type Dosyaları
- ✅ `src/services/api.ts` - Ana interface'ler
- ✅ `src/app/context/AuthContext.tsx` - Store tipi

### Form Sayfaları  
- ✅ `src/app/dashboard/magazalar/ekle/page.tsx`
- ✅ `src/app/dashboard/magazalar/[storeId]/duzenle/page.tsx`
- ✅ `src/app/dashboard/ayarlar/page.tsx`

### Dokümantasyon
- ✅ `STORE_PAYMENT_SYSTEM_UPDATES.md`
- ✅ `KULLANICI_PROFIL_API_DOKUMANTASYONU.md`
- ✅ `TCKN_GUNCELLEMESI_OZET.md` (bu dosya)

---

**Güncelleme Tarihi:** $(date +%Y-%m-%d)  
**Geliştirici:** Frontend Team  
**Statü:** ✅ Tamamlandı (Frontend)  
**Sonraki Adım:** Backend implementasyonu ve test 