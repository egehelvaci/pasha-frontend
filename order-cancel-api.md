# Sipariş İptal API Dokümantasyonu

## Endpoint
`PUT /api/orders/:orderId/cancel`

## Açıklama
Kullanıcıların henüz onaylanmamış (PENDING durumundaki) siparişlerini iptal etmelerini sağlar.

## Yetkilendirme
Bearer Token (JWT) gereklidir.
```
Authorization: Bearer {token}
```

## Parametreler

### Path Parameters
- `orderId` (string, zorunlu): İptal edilecek siparişin ID'si

### Request Body (Opsiyonel)
```json
{
  "reason": "Vazgeçtim / Yanlış ürün seçtim / vb."
}
```

## Kurallar
1. **Sadece PENDING durumundaki siparişler iptal edilebilir**
   - CONFIRMED, SHIPPED, DELIVERED durumundaki siparişler iptal edilemez
   - CANCELED durumundaki siparişler zaten iptal edilmiştir

2. **Kullanıcı sadece kendi siparişini iptal edebilir**
   - Başka bir kullanıcının siparişi iptal edilemez

## İptal İşlemi Sonuçları
1. **Sipariş durumu CANCELED olarak güncellenir**
2. **Stoklar geri yüklenir** - İptal edilen ürünlerin stok miktarları ve m² değerleri geri eklenir
3. **Bakiye iadesi yapılır** - Sipariş tutarı müşterinin bakiyesine iade edilir
4. **Fiyat listesi limiti güncellenir** - Varsa, müşterinin fiyat listesi limiti geri yüklenir
5. **Muhasebe kaydı oluşturulur** - "Sipariş İptali - İade" olarak kaydedilir
6. **Bildirim gönderilir** - Kullanıcıya iptal bildirimi gönderilir

## Başarılı Yanıt
```json
{
  "success": true,
  "message": "Sipariş başarıyla iptal edildi. 3500.00 TL bakiyenize iade edildi.",
  "data": {
    "id": "order-123",
    "status": "CANCELED",
    "total_price": 3500.00,
    "updated_at": "2025-01-23T10:30:00Z"
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
  "message": "Bu siparişi iptal etme yetkiniz yok"
}
```

### 404 - Sipariş Bulunamadı
```json
{
  "success": false,
  "message": "Sipariş bulunamadı"
}
```

### 400 - İptal Edilemez
```json
{
  "success": false,
  "message": "CONFIRMED durumundaki sipariş iptal edilemez. Sadece onay bekleyen (PENDING) siparişler iptal edilebilir."
}
```

## Örnek Kullanım

### cURL
```bash
curl -X PUT http://localhost:3002/api/orders/order-123/cancel \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"reason": "Yanlış ürün seçtim"}'
```

### JavaScript/Axios
```javascript
const cancelOrder = async (orderId, reason) => {
  try {
    const response = await axios.put(
      `/api/orders/${orderId}/cancel`,
      { reason },
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Sipariş iptal hatası:', error);
  }
};
```

## Notlar
- İptal işlemi geri alınamaz
- Tüm işlemler transaction içinde yapılır (atomik işlem)
- İptal edilen siparişler için yeni bir sipariş oluşturulması gerekir