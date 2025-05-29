# Şifre Sıfırlama API Endpoint'leri

## 1. Şifre Sıfırlama Talebi

**Endpoint:** `POST https://pasha-backend-production.up.railway.app/api/auth/forgot-password`

**Açıklama:** Kullanıcının email adresine şifre sıfırlama bağlantısı gönderir.

**Request Body:**
```json
{
  "email": "kullanici@example.com"
}
```

**Response (Başarılı):**
```json
{
  "success": true,
  "message": "Şifre sıfırlama bağlantısı email adresinize gönderildi."
}
```

**Response (Hata):**
```json
{
  "success": false,
  "message": "Email adresi gereklidir"
}
```

**Curl Örneği:**
```bash
curl -X POST https://pasha-backend-production.up.railway.app/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email": "kullanici@example.com"}'
```

---

## 2. Token Doğrulama

**Endpoint:** `GET https://pasha-backend-production.up.railway.app/api/auth/validate-reset-token/:token`

**Açıklama:** Şifre sıfırlama token'ının geçerliliğini kontrol eder.

**URL Parametresi:**
- `token`: Şifre sıfırlama token'ı

**Response (Geçerli Token):**
```json
{
  "success": true,
  "message": "Token geçerli",
  "email": "kullanici@example.com"
}
```

**Response (Geçersiz Token):**
```json
{
  "success": false,
  "message": "Geçersiz token"
}
```

**Curl Örneği:**
```bash
curl -X GET https://pasha-backend-production.up.railway.app/api/auth/validate-reset-token/abc123def456
```

---

## 3. Şifre Sıfırlama

**Endpoint:** `POST https://pasha-backend-production.up.railway.app/api/auth/reset-password`

**Açıklama:** Token ile yeni şifre belirler.

**Request Body:**
```json
{
  "token": "abc123def456",
  "newPassword": "yeniSifre123",
  "confirmPassword": "yeniSifre123"
}
```

**Response (Başarılı):**
```json
{
  "success": true,
  "message": "Şifreniz başarıyla güncellendi"
}
```

**Response (Hata):**
```json
{
  "success": false,
  "message": "Şifreler eşleşmiyor"
}
```

**Curl Örneği:**
```bash
curl -X POST https://pasha-backend-production.up.railway.app/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "token": "abc123def456",
    "newPassword": "yeniSifre123",
    "confirmPassword": "yeniSifre123"
  }'
```

---

## 4. Süresi Dolmuş Token'ları Temizle (Admin)

**Endpoint:** `DELETE /api/auth/cleanup-tokens`

**Açıklama:** Süresi dolmuş ve kullanılmış token'ları temizler. (Kimlik doğrulama gerekli)

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response:**
```json
{
  "success": true,
  "message": "5 adet süresi dolmuş token temizlendi",
  "count": 5
}
```

**Curl Örneği:**
```bash
curl -X DELETE https://pasha-backend-production.up.railway.app/api/auth/cleanup-tokens \
  -H "Authorization: Bearer <jwt-token>"
```

---

## Hata Kodları

| HTTP Kodu | Açıklama |
|-----------|----------|
| 200 | Başarılı |
| 400 | Geçersiz istek (validation hatası) |
| 401 | Kimlik doğrulama gerekli |
| 500 | Sunucu hatası |

---

## Email Yapılandırması

Şifre sıfırlama email'lerinin gönderilmesi için `.env` dosyasında aşağıdaki değişkenleri yapılandırın:

```env
# Email yapılandırması (SMTP)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
SMTP_FROM="your-email@gmail.com"

# Frontend URL (şifre sıfırlama linki için)
FRONTEND_URL="http://localhost:3000"
```

### Gmail için App Password Oluşturma:
1. Google hesabınızda 2-factor authentication'ı etkinleştirin
2. Google Account Settings > Security > App passwords
3. Yeni app password oluşturun
4. Bu password'ü `SMTP_PASS` olarak kullanın

---

## Güvenlik Özellikleri

- ✅ Token'lar 1 saat sonra otomatik olarak süresi doluyor
- ✅ Kullanılan token'lar tekrar kullanılamıyor
- ✅ Mevcut aktif token'lar yeni talep geldiğinde iptal ediliyor
- ✅ Email adresi bulunamasa bile güvenlik nedeniyle başarılı mesajı dönüyor
- ✅ Şifreler bcrypt ile hash'leniyor
- ✅ Email format validasyonu
- ✅ Şifre uzunluk kontrolü (minimum 6 karakter)

---

## Test Etme

Test dosyasını çalıştırmak için:

```bash
node test-password-reset.js
```

Bu test dosyası tüm endpoint'leri ve hata durumlarını test eder. 