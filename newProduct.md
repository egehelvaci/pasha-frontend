# Frontend Entegrasyon Dokümanı: Ortak Ürün Stoğu

Bu doküman, ürün detayında hazır ebatların gösterilmesi, özel ölçü seçimi, ortak m² stok hesabı, sepete ekleme ve sipariş oluşturma akışlarının frontend entegrasyonunu açıklar.

Backend değişikliği `codex/common-product-stock` branch’inde uygulanmıştır. Mevcut ürünler geçiş tamamlanana kadar eski stok modelini kullanır. Yeni oluşturulan ürünler ortak ürün stoğu modeline otomatik olarak dahil olur.

## 1. Kullanıcıya gösterilecek ürün modeli

Frontend’de kullanıcıya tek bir ürün gösterilir. Hazır ebat, kesim türü ve saçak bilgileri ayrı ürün çeşidi olarak gösterilmez.

Ürün detay ekranının akışı:

1. Ürün bilgisi alınır.
2. `sizeOptions` içindeki hazır ebatlar listelenir.
3. Kullanıcı hazır ebatlardan birini seçer veya ürün kuralı izin veriyorsa özel yükseklik girer.
4. Kesim türü `cutTypes` alanından seçilir.
5. Ürün saçak destekliyorsa `hasFringe` seçimi gösterilir.
6. Seçilen ölçünün m² ihtiyacı hesaplanır.
7. Stok uyarısı gösterilir; stok yetersiz olsa bile sepet ve sipariş işlemi engellenmez.

Bu nedenle frontend, aynı ürün için `80x150`, `100x200`, `160x230` gibi ebatları ayrı ürün kartları olarak oluşturmamalıdır.

## 2. Kimlik doğrulama

Ürün, sepet ve sipariş endpoint’leri Bearer JWT ister.

```http
Authorization: Bearer <token>
Content-Type: application/json
```

Kullanıcıya özel fiyatın dönmesi için token içindeki kullanıcı bilgisi kullanılır. Frontend’in ayrıca `userId` göndermesi gerekmez.

## 3. Ürün endpoint’leri

### Ürün listesi

```http
GET /api/products?page=1&limit=50&collectionId=<collectionId>&search=<text>&hasStock=true
```

Başarılı cevap:

```json
{
  "success": true,
  "data": [
    {
      "productId": "product-uuid",
      "name": "PETRA-1 BEYAZ KAHVE",
      "description": "...",
      "productImage": "https://...",
      "collectionId": "collection-uuid",
      "pricing": {
        "price": 1000,
        "currency": "TRY"
      },
      "stock": {
        "enabled": true,
        "availableAreaM2": 12.5,
        "reservedAreaM2": 0,
        "consumableAreaM2": 12.5
      },
      "availableAreaM2": 12.5,
      "canHaveFringe": true,
      "cutTypes": [
        { "id": 1, "name": "Standart" },
        { "id": 2, "name": "Oval" }
      ],
      "sizeOptions": [
        {
          "id": 10,
          "width": 80,
          "height": 150,
          "is_optional_height": false,
          "pieceAreaM2": 1.2,
          "stockQuantity": 10,
          "stockAreaM2": 12.5
        },
        {
          "id": 11,
          "width": 80,
          "height": 300,
          "is_optional_height": true,
          "pieceAreaM2": 2.4,
          "stockQuantity": 5,
          "stockAreaM2": 12.5
        }
      ]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 1,
    "totalPages": 1,
    "hasMore": false
  }
}
```

`GET /api/products/all` aynı ürünleri pagination olmadan döndürür. Cevapta `pagination` yerine `total` bulunur.

### Ürün detayı

```http
GET /api/products/:productId
```

Ürün detayında `stock`, `availableAreaM2`, `sizeOptions`, `cutTypes` ve `canHaveFringe` alanları kullanılır. Ürüne tanımlanmış hazır ebat yoksa `sizeOptions` boş dizi olabilir.

### Ebat ve kesim seçenekleri

```http
GET /api/products/:productId/variations
```

Bu endpoint mevcut yetkilendirme kuralları nedeniyle admin/editor erişimine açıktır. Normal müşteri ürün detayında seçenekleri `GET /api/products/:productId` cevabından kullanmalıdır.

## 4. Stok alanlarının anlamı

| Alan | Anlamı | Frontend kullanımı |
|---|---|---|
| `stock.enabled` | Ürün ortak stok modeline dahil mi? | Ortak stok davranışını seçmek için kullanılır. |
| `stock.availableAreaM2` | Siparişlerden sonra kalan fiziksel/hesapsal m² | Ürün stok özetinde gösterilebilir. Negatif olabilir. |
| `stock.reservedAreaM2` | Rezervasyonlara ayrılmış m² | Şimdilik bilgi amaçlıdır; frontend’den doğrudan rezervasyon endpoint’i yoktur. |
| `stock.consumableAreaM2` | Kullanılabilir hesaplanan m² (`available - reserved`) | Stok uyarısı için kullanılır. Negatif olabilir. |
| `availableAreaM2` | `stock.availableAreaM2` için kısa uyumluluk alanı | Yeni frontend’de `stock.availableAreaM2` tercih edilir. |
| `sizeOptions[].pieceAreaM2` | Seçilen hazır ebatın tek parça m² değeri | Adet hesabında kullanılır. |
| `sizeOptions[].stockQuantity` | Ortak stoktan hesaplanan yaklaşık adet | Ortak ürünlerde bilgi amaçlıdır; kaynak stok değildir. |
| `sizeOptions[].stockAreaM2` | Ortak ürünün aynı toplam m² stoğu | Ortak ürünlerde her ebat için aynı değeri görebilirsiniz. |

### Negatif stok

Örnek:

```json
{
  "stock": {
    "enabled": true,
    "availableAreaM2": -2.8,
    "reservedAreaM2": 0,
    "consumableAreaM2": -2.8
  }
}
```

Bu durumda ürün tükenmiş anlamına gelir; ancak satış durdurulmaz. Frontend aşağıdaki gibi bir uyarı gösterebilir:

> Bu ürün stok açığıyla siparişe alınabilir. Siparişiniz tedarik sonrasında hazırlanacaktır.

`availableAreaM2 < 0` olduğunda “Sepete ekle” ve “Siparişi tamamla” butonları pasifleştirilmemelidir.

`hasStock=true` ürün filtresi negatif veya sıfır ortak stoğu stoklu kabul etmez. Bu filtre yalnızca katalog filtreleme içindir; sipariş oluşturma kuralı değildir.

## 5. Ölçü ve m² hesaplama

Backend ölçüleri santimetre kabul eder:

```text
tekParçaM2 = genişlik(cm) × yükseklik(cm) / 10000
toplamM2 = tekParçaM2 × adet
```

Örnek:

```text
80 × 390 cm = 3.12 m²
2 adet      = 6.24 m²
```

Backend alanı dört ondalık hassasiyetle saklar. Frontend ekranda genellikle iki ondalık göstermelidir:

```ts
const pieceAreaM2 = (width * height) / 10000;
const totalAreaM2 = pieceAreaM2 * quantity;
const displayArea = totalAreaM2.toFixed(2);
```

## 6. Hazır ebat ve özel ölçü davranışı

### Sabit hazır ebat

`is_optional_height: false` ise backend gönderilen genişlik ve yüksekliğin hazır ebatla tam eşleşmesini bekler.

Örnek:

```json
{
  "width": 80,
  "height": 150,
  "is_optional_height": false
}
```

Frontend sadece `80x150` seçeneğini göstermeli; bu seçenek için yüksekliği serbest metin olarak değiştirmemelidir.

### Opsiyonel yükseklik

`is_optional_height: true` ise `width` sabittir, `height` üst sınıra kadar kullanıcı tarafından girilebilir.

Örnek:

```json
{
  "width": 80,
  "height": 300,
  "is_optional_height": true
}
```

Bu seçenek için frontend `80x1` ile `80x300` arasındaki geçerli yüksekliği kabul edebilir. Backend maksimum yüksekliği tekrar doğrular.

## 7. Kesim ve saçak seçimi

Sepete gönderilecek `cutType` için canonical değerler:

```text
standart
round
oval
custom
```

Backend bazı Türkçe eş anlamlıları da eşleyebilir; frontend’in sabit ve tutarlı olarak yukarıdaki değerleri göndermesi önerilir.

`canHaveFringe: false` ise saçak seçimi gösterilmemeli veya `hasFringe: false` gönderilmelidir.

`canHaveFringe: true` ise:

```json
{
  "hasFringe": true
}
```

Kesim ve saçak stok çeşidi değildir. Aynı ürünün ortak m² stoğu kullanılır.

## 8. Sepet entegrasyonu

### Sepete ürün ekleme

```http
POST /api/cart/add
```

İstek gövdesi:

```json
{
  "productId": "product-uuid",
  "quantity": 1,
  "width": 80,
  "height": 390,
  "hasFringe": true,
  "cutType": "standart",
  "notes": "Özel not"
}
```

Başarılı cevap:

```json
{
  "success": true,
  "message": "Ürün sepete eklendi",
  "data": {
    "id": 123,
    "product_id": "product-uuid",
    "quantity": 1,
    "width": 80,
    "height": 390,
    "area_m2": 3.12,
    "has_fringe": true,
    "cut_type": "rectangle",
    "unit_price": 1000,
    "total_price": 3120
  }
}
```

Backend sepete ekleme aşamasında ortak stok yetersizliğini hata olarak dönmez. Sepet ekranında frontend stok açığı uyarısı gösterebilir; kullanıcı yine de devam edebilir.

### Sepeti getir

```http
GET /api/cart
```

```json
{
  "success": true,
  "data": {
    "id": 10,
    "items": [
      {
        "id": 123,
        "productId": "product-uuid",
        "quantity": 1,
        "width": 80,
        "height": 390,
        "area_m2": 3.12,
        "has_fringe": true,
        "cut_type": "standart",
        "product": {
          "productId": "product-uuid",
          "name": "PETRA-1 BEYAZ KAHVE",
          "productImage": "https://...",
          "pricing": {
            "price": 1000,
            "currency": "TRY"
          }
        }
      }
    ],
    "totalItems": 1,
    "totalPrice": 3120
  }
}
```

### Sepet öğesini güncelle

```http
PUT /api/cart/items/:cartItemId
```

```json
{
  "quantity": 2,
  "width": 80,
  "height": 390,
  "hasFringe": true,
  "cutType": "standart",
  "notes": "Güncel not"
}
```

Diğer mevcut sepet endpoint’leri:

```http
DELETE /api/cart/items/:cartItemId
DELETE /api/cart/clear
```

## 9. Sipariş oluşturma

Siparişten önce mevcut finansal limit kontrolü yapılabilir:

```http
GET /api/orders/check-limits
```

Bu endpoint stok yeterliliği kontrolü değildir. Ortak stok negatif olsa bile finansal limit, açık hesap ve fiyat listesi kuralları geçerlidir.

Sipariş oluşturma:

```http
POST /api/orders/create-from-cart
```

```json
{
  "address_id": "address-uuid",
  "notes": "Teslimat notu"
}
```

Stok hareketi sipariş oluşturma sırasında gerçekleşir:

- Ortak stoklu üründe seçilen alan m²’si düşülür.
- Pozitif FIFO lotları sırayla tüketilir.
- Alan yetmezse kalan bölüm negatif stok hareketi olur.
- Sipariş oluşturma başarılıysa frontend stok bilgisini yeniden çekmelidir.
- Stok yetersizliği tek başına siparişi başarısız yapmaz.

Finansal limit veya ödeme kuralı nedeniyle sipariş reddedilebilir. Bu durumda frontend `requiresPayment`, `limitAmount` ve `minimumPayment` alanlarını dikkate almalıdır.

## 10. Sipariş listeleme ve statü filtresi

```http
GET /api/orders/my-orders?page=1&limit=10&status=DELIVERED&receiptPrinted=false
```

Geçerli statüler:

```text
PENDING
CONFIRMED
READY
SHIPPED
DELIVERED
CANCELED
```

`receiptPrinted` yalnızca `DELIVERED` siparişlerde anlamlıdır. Cevap yapısı:

```json
{
  "success": true,
  "data": {
    "orders": [],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 0,
      "totalPages": 0
    }
  }
}
```

Sipariş detayı:

```http
GET /api/orders/:orderId
```

İptal:

```http
PUT /api/orders/:orderId/cancel
```

Ortak stoklu ürün içeren sipariş iptal edilirse kullanılan m² idempotent biçimde stoğa geri eklenir. Frontend iptal sonrası ürün veya sepet stok bilgisini tekrar istemelidir.

Fiş endpoint’leri:

```http
GET /api/orders/:orderId/receipt
PUT /api/orders/:orderId/mark-printed
```

## 11. Admin stok ekranı

Admin/editor için mevcut endpoint’ler korunmuştur:

```http
PATCH /api/products/:productId/stock
PATCH /api/products/:productId/stock-area
```

### Adet üzerinden güncelleme

```json
{
  "width": 80,
  "height": 150,
  "quantity": 10
}
```

Ortak stok etkin yeni üründe hedef toplam alan şu şekilde hesaplanır:

```text
80 × 150 × 10 / 10000 = 12 m²
```

Bu endpoint ortak üründe seçilen ebat için ayrı stok açmaz; ürünün toplam ortak alanını hedeflenen değere getirir.

### m² üzerinden güncelleme

```json
{
  "width": 80,
  "height": 150,
  "areaM2": 12
}
```

Ortak ürünlerde `areaM2`, ürünün toplam ortak stok alanıdır. Mevcut ürünler legacy stok mantığını koruduğu için admin ekranı backend cevabındaki `stock.enabled` alanını kontrol etmelidir.

## 12. Legacy ürünlerle uyumluluk

Mevcut ürünlerde:

- `stock.enabled` bulunmayabilir veya `false` olabilir.
- `productvariations` stok alanları eski davranışla çalışır.
- Hazır ebat ve opsiyonel yükseklik stokları eski kurallara göre döner.

Yeni ürünlerde:

- `stock.enabled: true` olur.
- Kaynak stok `stock.availableAreaM2` alanıdır.
- `sizeOptions[].stockQuantity` yalnızca ortak m²’den hesaplanan uyumluluk değeridir.

Frontend stok kararında şu sırayı kullanmalıdır:

```ts
const commonStockEnabled = product.stock?.enabled === true;
const availableAreaM2 = commonStockEnabled
  ? Number(product.stock.consumableAreaM2)
  : getLegacySizeStock(product, selectedSize);
```

Ortak ürünlerde yalnızca `sizeOptions[].stockQuantity` üzerinden “stok yok” kararı verilmemelidir.

## 13. Önerilen frontend yardımcı fonksiyonları

```ts
type ProductStock = {
  enabled: boolean;
  availableAreaM2: number;
  reservedAreaM2: number;
  consumableAreaM2: number;
};

function calculateAreaM2(width: number, height: number, quantity = 1) {
  return (width * height * quantity) / 10000;
}

function getStockWarning(product: any, width: number, height: number, quantity: number) {
  if (product.stock?.enabled !== true) return null;

  const requestedAreaM2 = calculateAreaM2(width, height, quantity);
  const consumableAreaM2 = Number(product.stock.consumableAreaM2 || 0);

  if (consumableAreaM2 < requestedAreaM2) {
    return {
      type: 'NEGATIVE_STOCK_ALLOWED',
      requestedAreaM2,
      currentAreaM2: consumableAreaM2,
      shortageAreaM2: requestedAreaM2 - consumableAreaM2,
      message: 'Stok açığı oluşacak; sipariş tedarik sonrasında hazırlanacaktır.'
    };
  }

  return null;
}
```

Bu uyarı kullanıcıya gösterilebilir ancak submit işlemi durdurulmamalıdır.

## 14. Frontend kabul listesi

- Ürün listesinde aynı ürün yalnızca bir kez gösteriliyor.
- Ürün detayında hazır ebatlar `sizeOptions` üzerinden listeleniyor.
- `is_optional_height` hazır ve özel ölçü akışını doğru ayırıyor.
- Seçilen ölçünün m² değeri doğru hesaplanıyor.
- Ortak stoklu ürünlerde tüm ebatlar aynı `stock.consumableAreaM2` değerini paylaşıyor.
- Negatif stokta butonlar kapanmıyor; kullanıcıya anlaşılır uyarı gösteriliyor.
- Sepete ekleme isteğinde `productId`, `quantity`, `width`, `height`, `hasFringe` ve `cutType` gönderiliyor.
- Sipariş sonrası ürün stok bilgisi yeniden alınıyor.
- Sipariş iptalinden sonra ürün stok bilgisi yeniden alınıyor.
- Legacy ürünlerde eski `stockQuantity` ve `stockAreaM2` davranışı korunuyor.
- Decimal alanları ekranda formatlanmadan önce güvenli biçimde sayıya dönüştürülüyor.
- `GET /api/orders/my-orders` pagination ve `status` filtresiyle kullanılıyor.

## 15. Önemli sınırlar

- Frontend’den migration çalıştırılmamalıdır.
- Frontend `productvariations` içindeki stok değerlerini ortak ürünler için kaynak kabul etmemelidir.
- Sepette stok rezervasyonu yapılmamaktadır; kesin stok hareketi sipariş oluşturulurken yapılır.
- Stok yetersizliği siparişi engellemez; finansal limit ve ödeme kuralları yine siparişi engelleyebilir.
- Mevcut ürünlerin ortak modele geçirilmesi ayrı ve denetimli bir geçiş çalışmasıdır.