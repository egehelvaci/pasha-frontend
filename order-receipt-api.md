# Sipariş Fişi API Dokümantasyonu

## Endpoint
`GET /api/orders/:orderId/receipt`

## Açıklama
Onaylanmış ve teslim edilmiş siparişler için detaylı fiş bilgileri sağlar. Fiş yazdırma ve kayıt tutma amacıyla kullanılır.

## Yetkilendirme
Bearer Token (JWT) gereklidir.
```
Authorization: Bearer {token}
```

## Parametreler

### Path Parameters
- `orderId` (string, zorunlu): Fişi alınacak siparişin ID'si

## Kurallar

### Kullanıcılar için:
1. **Sadece onaylanmış siparişlerin fişi alınabilir**
   - CONFIRMED (Onaylandı)
   - SHIPPED (Kargoya verildi) 
   - DELIVERED (Teslim edildi)
   - READY (Hazır)

2. **Sadece kendi siparişlerinin fişi alınabilir**
   - Başka kullanıcının sipariş fişi alınamaz

3. **PENDING ve CANCELED siparişlerin fişi alınamaz**

### Adminler için:
1. **Tüm siparişlerin fişini alabilir**
   - Herhangi bir kullanıcının siparişi
   - Herhangi bir durumda (PENDING, CANCELED dahil)

2. **Admin fiş numarası farklıdır**
   - Admin fişleri: `ADM-FIS-ORDER123`
   - Kullanıcı fişleri: `FIS-ORDER123`

## Fiş İçeriği

### Sipariş Bilgileri
- Sipariş ID ve numarası
- Sipariş durumu
- Oluşturma ve güncelleme tarihleri
- Toplam tutar

### Müşteri Bilgileri
- Ad, soyad
- E-posta ve telefon
- Adres bilgisi

### Mağaza Bilgileri
- Kurum adı
- Vergi numarası ve dairesi
- Yetkili kişi bilgileri
- İletişim bilgileri

### Ürün Detayları
Her ürün için:
- Ürün adı ve açıklaması
- Koleksiyon adı ve kodu
- Miktar, birim fiyat, toplam fiyat
- Ölçüler (en, boy, alan m²)
- Özellikler (sasak, kesim tipi)

### Bakiye Bilgileri
- **Sipariş öncesi bakiye**
- **Sipariş sonrası bakiye** 
- **Sipariş kesinti tutarı**
- Bakiye güncelleme tarihi

### Özet Bilgiler
- Toplam ürün sayısı
- Toplam miktar (adet)
- Toplam alan (m²)
- Toplam tutar

### Fiş Bilgileri
- Fiş numarası
- Oluşturma tarihi
- Geçerlilik tarihi (1 yıl)

## Başarılı Yanıt
```json
{
  "success": true,
  "data": {
    "siparis": {
      "id": "order-123",
      "siparisNumarasi": "ORDER123",
      "durum": "DELIVERED",
      "olusturmaTarihi": "2025-01-20T10:00:00Z",
      "guncellemeTarihi": "2025-01-22T14:30:00Z",
      "toplamTutar": 3500.00
    },
    "musteri": {
      "ad": "Ahmet",
      "soyad": "Yılmaz",
      "email": "ahmet@example.com",
      "telefon": "0532 123 45 67",
      "adres": "İstanbul, Türkiye"
    },
    "magaza": {
      "kurumAdi": "Yılmaz Halı",
      "vergiNumarasi": "1234567890",
      "vergiDairesi": "İstanbul",
      "yetkiliAdi": "Mehmet",
      "yetkiliSoyadi": "Yılmaz",
      "telefon": "0212 123 45 67",
      "eposta": "info@yilmazahali.com"
    },
    "urunler": [
      {
        "urunAdi": "Premium Halı Model A",
        "aciklama": "Kaliteli yün halı",
        "koleksiyon": {
          "adi": "Premium Koleksiyon",
          "kodu": "PRM"
        },
        "miktar": 1,
        "birimFiyat": 3500.00,
        "toplamFiyat": 3500.00,
        "olculer": {
          "en": 200,
          "boy": 300,
          "alanM2": 6.0
        },
        "ozellikler": {
          "sasakVar": true,
          "kesimTipi": "Düz"
        }
      }
    ],
    "bakiye": {
      "siparisOncesi": 18500.00,
      "siparisSonrasi": 15000.00,
      "siparisKesintisi": 3500.00,
      "tarih": "2025-01-23T10:30:00Z"
    },
    "ozet": {
      "toplamUrunSayisi": 1,
      "toplamMiktar": 1,
      "toplamAlanM2": 6.0,
      "toplamTutar": 3500.00
    },
    "fis": {
      "fisNumarasi": "FIS-ORDER123",
      "olusturmaTarihi": "2025-01-23T10:30:00Z",
      "gecerlilikTarihi": "2026-01-23T10:30:00Z"
    }
  }
}
```

## Hata Yanıtları

### 401 - Yetkilendirme Hatası
```json
{
  "success": false,
  "message": "Kullanıcı kimlik doğrulaması gerekli"
}
```

### 403 - Yetki Hatası
```json
{
  "success": false,
  "message": "Bu siparişin fişini alma yetkiniz yok"
}
```

### 404 - Sipariş Bulunamadı
```json
{
  "success": false,
  "message": "Sipariş bulunamadı"
}
```

### 400 - Fiş Alınamaz
```json
{
  "success": false,
  "message": "PENDING durumundaki siparişin fişi alınamaz. Sadece onaylanmış veya teslim edilmiş siparişlerin fişi alınabilir."
}
```

## Örnek Kullanım

### cURL
```bash
curl -X GET http://localhost:3002/api/orders/order-123/receipt \
  -H "Authorization: Bearer {token}"
```

### JavaScript/Axios
```javascript
const getOrderReceipt = async (orderId) => {
  try {
    const response = await axios.get(
      `/api/orders/${orderId}/receipt`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Fiş alma hatası:', error);
  }
};
```

## Notlar
- Fiş verileri 1 yıl süreyle geçerlidir
- Bakiye bilgileri sipariş anındaki durumu yansıtır
- Tüm tutarlar TL cinsindendir
- Alan hesaplamaları cm² -> m² dönüştürülür (/ 10000)
- Fiş numarası sipariş ID'sinin ilk 8 karakterinden oluşur