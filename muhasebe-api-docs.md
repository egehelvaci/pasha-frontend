# MUHASEBE HAREKETLERİ API DOKÜMANTASYONU

Bu doküman Pasha Backend muhasebe hareketleri API endpoint'lerini içerir.
Tüm endpoint'ler JWT authentication ve admin rolü gerektirir.

## Authentication

Tüm isteklerde Authorization header'ı gereklidir:
```
Authorization: Bearer <ADMIN_JWT_TOKEN>
```

## Base URL

- **Local**: `http://localhost:3001/api/admin`
- **Production**: `https://your-domain.com/api/admin`

---

## MUHASEBE HAREKETLERİ

### 1. TÜM MUHASEBE HAREKETLERİNİ LİSTELE

**Method**: `GET`  
**URL**: `/api/admin/muhasebe-hareketleri`

Tüm muhasebe hareketlerini tarih sırasına göre (en yeni önce) listeler.

#### Request
```http
GET /api/admin/muhasebe-hareketleri
Authorization: Bearer <ADMIN_JWT_TOKEN>
```

#### Response (Success - 200)
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "storeId": "store-001",
      "islemTuru": "Parekende Satış",
      "tutar": "2500.00",
      "harcama": false,
      "tarih": "2025-07-17T10:00:00.000Z",
      "aciklama": "Mağaza satışı",
      "createdAt": "2025-07-17T10:05:00.000Z",
      "store": {
        "store_id": "store-001",
        "kurum_adi": "ABC Mağazası"
      }
    },
    {
      "id": 2,
      "storeId": "store-002",
      "islemTuru": "Kira / Aidat Giderleri",
      "tutar": "10000.00",
      "harcama": true,
      "tarih": "2025-07-17T11:30:00.000Z",
      "aciklama": "Depo kira ödemesi",
      "createdAt": "2025-07-17T11:35:00.000Z",
      "store": {
        "store_id": "store-002",
        "kurum_adi": "XYZ Depo"
      }
    }
  ]
}
```

### 2. YENİ MUHASEBE HAREKETİ OLUŞTUR

**Method**: `POST`  
**URL**: `/api/admin/muhasebe-hareketleri`

Yeni bir muhasebe hareketi oluşturur ve ilgili bakiyeleri otomatik olarak günceller.

#### Request Body
```json
{
  "storeId": "store-003",
  "islemTuru": "Personel Maaş Ödemesi",
  "tutar": 15000.00,
  "tarih": "2025-07-17T14:00:00Z",
  "aciklama": "Ağustos ayı avans ödemesi"
}
```

#### Alan Açıklamaları
- `storeId`: Zorunlu, string. Mağaza UUID'si
- `islemTuru`: Zorunlu, string. Gelir veya gider türü (liste için yardımcı endpoint'leri kullanın)
- `tutar`: Zorunlu, number. 0'dan büyük olmalıdır
- `tarih`: Zorunlu, string. ISO 8601 tarih formatı
- `aciklama`: Zorunlu, string. İşlem açıklaması

#### Response (Success - 201)
```json
{
  "success": true,
  "data": {
    "id": 3,
    "storeId": "store-003",
    "islemTuru": "Personel Maaş Ödemesi",
    "tutar": "15000.00",
    "harcama": true,
    "tarih": "2025-07-17T14:00:00.000Z",
    "aciklama": "Ağustos ayı avans ödemesi",
    "createdAt": "2025-07-17T14:05:00.000Z",
    "store": {
      "store_id": "store-003",
      "kurum_adi": "DEF Şirketi"
    }
  }
}
```

#### Hata Yanıtları
- **400 Bad Request**: Eksik veya geçersiz alan
- **404 Not Found**: Mağaza bulunamadı
- **422 Unprocessable Entity**: Geçersiz işlem türü

---

## YARDIMCI ENDPOINT'LER

### 3. GELİR TÜRLERİNİ LİSTELE

**Method**: `GET`  
**URL**: `/api/admin/muhasebe/income-types`

Sistemde tanımlı gelir türlerini listeler.

#### Response (Success - 200)
```json
{
  "success": true,
  "data": [
    "Parekende Satış",
    "Toptan Satış",
    "Hizmet Geliri",
    "Faiz Geliri",
    "Kira Geliri",
    "Diğer Gelirler",
    "Borç Tahsilatı"
  ]
}
```

### 4. GİDER TÜRLERİNİ LİSTELE

**Method**: `GET`  
**URL**: `/api/admin/muhasebe/expense-types`

Sistemde tanımlı gider türlerini listeler.

#### Response (Success - 200)
```json
{
  "success": true,
  "data": [
    "Kira / Aidat Giderleri",
    "Elektrik / Su / Doğalgaz",
    "Telefon / İnternet",
    "Personel Maaş Ödemesi",
    "SGK Primleri",
    "Vergi Ödemeleri",
    "Nakliye Giderleri",
    "Ofis Malzemeleri",
    "Temizlik Giderleri",
    "Bakım Onarım",
    "Reklamı Pazarlama",
    "Danışmanlık Giderleri",
    "Sigortalar",
    "Bankacılık Giderleri",
    "Diğer Giderler",
    "Borç Verme"
  ]
}
```

### 5. ADMİN TOPLAM BİLGİLERİ

**Method**: `GET`  
**URL**: `/api/admin/muhasebe/admin-toplam`

Admin'in kasa bakiyesi, toplam alacağı ve mağaza borç/alacak durumlarını listeler.

#### Response (Success - 200)
```json
{
  "success": true,
  "data": {
    "adminKasaBakiyesi": "125000.00",
    "toplamAlacak": 45000.00,
    "borcluMagazalar": [
      {
        "store_id": "store-001",
        "kurum_adi": "ABC Mağazası",
        "borc": 15000.00
      },
      {
        "store_id": "store-003",
        "kurum_adi": "DEF Şirketi",
        "borc": 30000.00
      }
    ],
    "alacakliMagazalar": [
      {
        "store_id": "store-002",
        "kurum_adi": "XYZ Depo",
        "alacak": 12000.00
      }
    ],
    "borcluMagazaSayisi": 2,
    "alacakliMagazaSayisi": 1
  }
}
```

---

## İŞ MANTIĞI

### Bakiye Güncelleme Kuralları

1. **Gelir İşlemi** (harcama: false):
   - Admin kasa bakiyesi artar
   - Mağaza cari bakiyesi artar (alacağı artar veya borcu azalır)

2. **Gider İşlemi** (harcama: true):
   - Admin kasa bakiyesi azalır
   - Mağaza cari bakiyesi azalır (borcu artar veya alacağı azalır)

### Cari Bakiye Yorumlama

- **Pozitif (+)**: Mağaza Admin'den alacaklıdır
- **Negatif (-)**: Mağaza Admin'e borçludur
- **Sıfır (0)**: Mağaza ile Admin arasında borç/alacak ilişkisi yoktur

### Örnek Senaryolar

#### Senaryo 1: Mağaza Satış Yapıyor
```json
{
  "storeId": "store-001",
  "islemTuru": "Parekende Satış",
  "tutar": 5000,
  "tarih": "2025-07-17T10:00:00Z",
  "aciklama": "Günlük satış"
}
```
**Sonuç**: Admin kasa +5000, Mağaza cari +5000

#### Senaryo 2: Mağaza İçin Gider Yapılıyor
```json
{
  "storeId": "store-001",
  "islemTuru": "Elektrik / Su / Doğalgaz",
  "tutar": 1500,
  "tarih": "2025-07-17T11:00:00Z",
  "aciklama": "Elektrik faturası"
}
```
**Sonuç**: Admin kasa -1500, Mağaza cari -1500

#### Senaryo 3: Mağazaya Borç Verme
```json
{
  "storeId": "store-002",
  "islemTuru": "Borç Verme",
  "tutar": 20000,
  "tarih": "2025-07-17T12:00:00Z",
  "aciklama": "Nakit avans"
}
```
**Sonuç**: Admin kasa -20000, Mağaza cari -20000

#### Senaryo 4: Mağazadan Borç Tahsilatı
```json
{
  "storeId": "store-002",
  "islemTuru": "Borç Tahsilatı",
  "tutar": 10000,
  "tarih": "2025-07-17T13:00:00Z",
  "aciklama": "Borç geri ödemesi"
}
```
**Sonuç**: Admin kasa +10000, Mağaza cari +10000 