# 📍 Adres Sistemi Değişimleri - PRD (Product Requirements Document)

## 🎯 Genel Bakış

Bu döküman, sistemde yapılan adres yönetimi değişikliklerini ve bu değişikliklerin frontend uygulamasına etkilerini detaylandırmaktadır. **Mağaza merkezli adres sistemi** yerine **kullanıcı merkezli adres sistemi**ne geçilmiştir.

## 🔄 Ana Değişiklik

**ÖNCE**: Adres bilgileri mağaza modelinde tutuluyordu
**ŞIMDI**: Adres bilgileri kullanıcı modelinde tutuluyor

---

## 📊 Veri Modeli Değişiklikleri

### User Model - YENİ ALAN
```typescript
interface User {
  userId: string;
  name: string;
  surname: string;
  username: string;
  email: string;
  phoneNumber?: string;
  adres?: string; // 🆕 YENİ ALAN
  isActive: boolean;
  createdAt: Date;
  userType: string;
}
```

---

## 🔌 API Endpoint Değişiklikleri

### 1. 👤 Kullanıcı Profil API'leri

#### ✅ **GÜNCELLENEN**: `GET /api/profile/me`
Kullanıcının profil bilgilerini döndürür.

**Response (Güncellenmiş)**:
```json
{
  "success": true,
  "data": {
    "user": {
      "userId": "uuid",
      "name": "Ali",
      "surname": "Veli", 
      "username": "aliveli",
      "email": "ali@example.com",
      "phoneNumber": "05551234567",
      "adres": "Cumhuriyet Mah. Atatürk Cad. No:123 Beşiktaş/İstanbul", // 🆕 YENİ ALAN
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "userType": "viewer"
    },
    "store": {
      "store_id": "store-uuid",
      "kurum_adi": "ABC Mağaza",
      "adres": "Mağaza Adresi (Gösterim Amaçlı)", // ⚠️ Artık kullanılmıyor
      // ... diğer mağaza bilgileri
    }
  }
}
```

#### 🆕 **YENİ**: `PUT /api/profile/me`
Kullanıcının kendi profil bilgilerini günceller.

**Request Body**:
```json
{
  "name": "Ali",
  "surname": "Veli",
  "phoneNumber": "05551234567",
  "adres": "Yeni Adres Bilgisi" // 🆕 Kullanıcı artık kendi adresini güncelleyebilir
}
```

**Response**:
```json
{
  "success": true,
  "message": "Profil bilgileri başarıyla güncellendi",
  "data": {
    "userId": "uuid",
    "name": "Ali",
    "surname": "Veli",
    "username": "aliveli", 
    "email": "ali@example.com",
    "phoneNumber": "05551234567",
    "adres": "Yeni Adres Bilgisi",
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "userType": "viewer"
  }
}
```

#### ⚠️ **DEĞİŞTİ**: `PUT /api/profile/store`
Mağaza bilgilerini günceller - **artık adres güncellemez**.

**Request Body (Güncellendi)**:
```json
{
  "kurum_adi": "ABC Mağaza",
  "vergi_numarasi": "1234567890",
  "vergi_dairesi": "Beşiktaş",
  "yetkili_adi": "Ali",
  "yetkili_soyadi": "Veli",
  "telefon": "02121234567",
  "eposta": "info@abc.com",
  // "adres": "KALDIRILDI" ❌ Artık mağaza adresi güncellenmiyor
  "faks_numarasi": "02121234568"
}
```

**Response (Güncellendi)**:
```json
{
  "success": true,
  "message": "Mağaza bilgileri başarıyla güncellendi",
  "data": {
    "store_id": "store-uuid",
    "kurum_adi": "ABC Mağaza",
    "vergi_numarasi": "1234567890",
    "vergi_dairesi": "Beşiktaş",
    "yetkili_adi": "Ali",
    "yetkili_soyadi": "Veli",
    "telefon": "02121234567",
    "eposta": "info@abc.com",
    "adres": "Kullanıcının Adresi", // 🔄 Artık kullanıcı adresini döndürüyor
    "faks_numarasi": "02121234568",
    "updated_at": "2024-01-01T00:00:00.000Z"
  }
}
```

### 2. 🔐 Auth API'leri

#### ⚠️ **DEĞİŞTİ**: `POST /api/auth/login`

**Response (store.adres değişti)**:
```json
{
  "success": true,
  "message": "Giriş başarılı",
  "data": {
    "user": {
      // ... kullanıcı bilgileri
    },
    "store": {
      "store_id": "store-uuid",
      "kurum_adi": "ABC Mağaza",
      "vergi_numarasi": "1234567890",
      "tckn": "12345678901",
      "telefon": "02121234567",
      "eposta": "info@abc.com",
      "adres": "Kullanıcının Adresi", // 🔄 Artık user.adres döndürüyor
      "bakiye": 1500.00,
      "acik_hesap_tutari": 5000.00,
      "maksimum_taksit": 3,
      "limitsiz_acik_hesap": false,
      "toplam_kullanilabilir": 6500.00
    },
    "token": "jwt-token"
  }
}
```

### 3. 📦 Sipariş API'leri

#### ⚠️ **DEĞİŞTİ**: `POST /api/orders/create-from-cart`

**Request Body (Değişiklik Yok)**:
```json
{
  "notes": "Sipariş notu"
}
```

**Response (delivery_address kaynağı değişti)**:
```json
{
  "success": true,
  "message": "Sipariş başarıyla oluşturuldu",
  "data": {
    "id": "order-uuid",
    "user_id": "user-uuid",
    "cart_id": 123,
    "total_price": 500.00,
    "status": "PENDING",
    "delivery_address": "Kullanıcının Adresi", // 🔄 Artık user.adres'ten geliyor
    "store_name": "ABC Mağaza",
    "store_tax_number": "1234567890",
    "store_tax_office": "Beşiktaş",
    "store_phone": "02121234567",
    "store_email": "info@abc.com",
    "store_fax": "02121234568",
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z",
    // ... diğer sipariş bilgileri
  }
}
```

### 4. 💳 Ödeme API'leri

#### ⚠️ **DEĞİŞTİ**: `POST /api/payments/process`

**Request Body (Güncellendi)**:
```json
{
  "storeId": "store-uuid",
  "amount": 150.75,
  "aciklama": "Ödeme açıklaması" // 🔄 Artık OPSIYONEL (zorunlu değil)
}
```

**Request Body (aciklama olmadan)**:
```json
{
  "storeId": "store-uuid", 
  "amount": 150.75
  // aciklama belirtilmezse "Ödeme" olarak ayarlanır
}
```

**Response (Değişiklik Yok)**:
```json
{
  "success": true,
  "data": {
    "paymentUrl": "https://qashell.octet.com.tr/ortak-odeme/...",
    "sellerReference": "PASHA-1703123456789-abc123",
    "apiReferenceNumber": "PASHA-ODEME-1703123456789-def456",
    "amount": 150.75
  }
}
```

**Not**: Ödeme işleminde artık kullanıcı bilgileri (ad, soyad, email, telefon) kullanıcıdan alınıyor, mağaza bilgileri sadece fallback olarak kullanılıyor.

### 5. 📊 İstatistik API'leri

#### ⚠️ **DEĞİŞTİ**: `GET /api/statistics/my-balance`

**Response (store_info.adres değişti)**:
```json
{
  "success": true,
  "data": {
    "store_info": {
      "store_id": "store-uuid",
      "kurum_adi": "ABC Mağaza",
      "vergi_numarasi": "1234567890",
      "tckn": "12345678901",
      "telefon": "02121234567",
      "eposta": "info@abc.com",
      "adres": "Kullanıcının Adresi" // 🔄 Artık user.adres döndürüyor
    },
    "balance_info": {
      "bakiye": 1500.00,
      "acik_hesap_tutari": 5000.00,
      "toplam_kullanilabilir": 6500.00,
      "maksimum_taksit": 3,
      "limitsiz_acik_hesap": false,
      "currency": "TRY"
    }
  }
}
```

### 6. 👨‍💼 Admin API'leri

#### ⚠️ **DEĞİŞTİ**: `POST /api/admin/users`

**Request Body (Güncellendi)**:
```json
{
  "username": "yenikullanici",
  "email": "yeni@example.com", 
  "password": "sifre123",
  "name": "Yeni",
  "surname": "Kullanıcı",
  "phoneNumber": "05551234567",
  "userTypeId": 3,
  "storeId": "store-uuid",
  "adres": "Kullanıcı Adresi" // 🆕 YENİ ALAN
}
```

#### ⚠️ **DEĞİŞTİ**: `PUT /api/admin/users/:userId`

**Request Body (Güncellendi)**:
```json
{
  "username": "guncelkullanici",
  "email": "guncel@example.com",
  "name": "Güncel",
  "surname": "Kullanıcı", 
  "phoneNumber": "05559876543",
  "userTypeId": 2,
  "storeId": "store-uuid",
  "adres": "Güncel Kullanıcı Adresi" // 🆕 YENİ ALAN
}
```

---

## 🎨 Frontend Değişiklik Gereksinimleri

### 1. 📝 **Profil Sayfası**
- ✅ Kullanıcı artık kendi adresini düzenleyebilir
- ✅ Profil formu güncellenmeli: adres input alanı eklenmeli
- ✅ Mağaza bilgileri düzenleme formundan adres alanı kaldırılmalı
- ✅ `PUT /api/profile/me` endpoint'i kullanılmalı

### 2. 🛒 **Sipariş Sayfaları**
- ✅ Sipariş detaylarında gösterilen adres artık kullanıcının adresi
- ✅ Sipariş vermeden önce kullanıcıya adres kontrolü gösterilebilir
- ✅ Adres yoksa kullanıcıyı profil sayfasına yönlendirilebilir

### 3. 💳 **Ödeme Sayfaları**
- ✅ Ödeme formunda açıklama alanı artık opsiyonel
- ✅ Açıklama boş bırakılabilir
- ✅ Ödeme bilgilerinde kullanıcı adı/email'i kullanılacak

### 4. 📊 **Dashboard/İstatistikler**
- ✅ Store bilgilerinde gösterilen adres artık kullanıcı adresi
- ✅ Login response'unda store.adres artık kullanıcı adresi

### 5. 👨‍💼 **Admin Paneli**
- ✅ Kullanıcı ekleme/düzenleme formlarına adres alanı eklenmeli
- ✅ Kullanıcı listesinde adres bilgisi gösterilebilir

---

## ⚠️ Kritik Dikkat Edilmesi Gerekenler

### 1. **Geriye Uyumluluk**
- ✅ Eski kullanıcıların adres bilgisi `null` olabilir
- ✅ Frontend'de null check yapılmalı
- ✅ Adres yoksa kullanıcıya uyarı gösterilebilir

### 2. **Validasyon**
- ✅ Sipariş vermeden önce kullanıcı adres kontrolü yapılabilir
- ✅ Ödeme öncesi adres varlığı kontrol edilebilir

### 3. **UX İyileştirmeleri**
- ✅ İlk login'de adres bilgisi yoksa profil tamamlama akışı
- ✅ Sipariş/ödeme sayfalarında adres düzenleme linki
- ✅ Adres bilgisi eksikse hızlı adres ekleme modal'ı

---

## 🧪 Test Senaryoları

### 1. **Yeni Kullanıcı**
- ✅ Kayıt ol → Profilde adres ekle → Sipariş ver → Adresin sipariş detayında görünmesi

### 2. **Mevcut Kullanıcı (Adres Yok)**
- ✅ Login ol → Profilde adres ekle → Sipariş ver → Adresin kullanılması

### 3. **Mağaza Güncelleme**
- ✅ Mağaza profili güncelle → Adres alanının olmaması
- ✅ Kullanıcı profili güncelle → Adres alanının çalışması

### 4. **Ödeme İşlemi**
- ✅ Açıklama ile ödeme → Çalışması
- ✅ Açıklama olmadan ödeme → "Ödeme" olarak kaydedilmesi

---

## 📋 Checklist - Frontend Geliştirici

- [ ] User model'inde `adres` alanı eklendi
- [ ] Profil sayfasında adres input alanı eklendi
- [ ] `PUT /api/profile/me` endpoint entegrasyonu yapıldı
- [ ] Mağaza düzenleme formundan adres alanı kaldırıldı
- [ ] Ödeme formunda açıklama alanı opsiyonel yapıldı
- [ ] Sipariş detaylarında adres gösterimi güncellendi
- [ ] Admin panelinde kullanıcı formlarına adres alanı eklendi
- [ ] Null adres kontrolü ve uyarı mesajları eklendi
- [ ] Login response'unda yeni store.adres format'ı handle edildi
- [ ] Test senaryoları tamamlandı

---

## 🔗 İlgili Linkler

- API Dokümantasyonu: `/docs/api`
- Postman Collection: `Adres_Sistemi_Updates.json`
- Test Kullanıcıları: `test-users.md`

---

**Son Güncelleme**: 20 Ocak 2025
**Versiyon**: 1.0
**Hazırlayan**: Backend Team 